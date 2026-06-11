"""Persistent JSON store for LLM settings editable from the Web UI.

This module provides a thin read/write helper for ``data/llm_settings.json``.
The file holds overrides that the Web UI writes on top of values loaded from
the environment / ``.env``. Precedence at runtime:

    JSON store  >  environment variables / .env  >  pydantic defaults

Security notes
--------------
API keys are stored in **plaintext** in the JSON file. This matches the
existing ``.env`` threat model (plaintext secrets on disk) and keeps the
implementation simple. To mitigate accidental exposure:

- The file is written with ``0o600`` permissions on POSIX (user read/write
  only). On Windows this is a no-op.
- The ``data/`` directory is in ``.gitignore``.
- The Web UI API always returns masked keys.

If stronger protection is needed in the future (OS keychain via ``keyring``
or at-rest encryption) this module is the single seam to replace.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Filename is relative to the configured data_dir. We look up data_dir via
# environment variable directly (rather than calling get_settings()) to avoid
# a circular import between this module and config.settings during overlay
# application.
_LLM_SETTINGS_FILENAME = "llm_settings.json"


def _resolve_data_dir() -> Path:
    """Resolve the data directory.

    Mirrors the precedence used by Settings: ``DATA_DIR`` env var first,
    then the default ``./data`` relative to the current working directory.
    This is intentionally not using ``get_settings()`` to keep the overlay
    loader free of circular dependencies.
    """
    data_dir = os.environ.get("DATA_DIR", "./data")
    return Path(data_dir).expanduser().resolve()


def get_llm_settings_path() -> Path:
    """Return the absolute path to the LLM settings JSON file."""
    return _resolve_data_dir() / _LLM_SETTINGS_FILENAME


def load_llm_settings_overlay() -> Dict[str, Any]:
    """Load the LLM settings overlay from disk.

    Returns an empty dict if the file does not exist or cannot be parsed.
    Malformed JSON is logged and ignored rather than raised so that a
    corrupted overlay cannot brick application startup.
    """
    path = get_llm_settings_path()
    if not path.exists():
        return {}

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("Failed to read LLM settings overlay at %s: %s", path, e)
        return {}

    if not isinstance(data, dict):
        logger.warning(
            "LLM settings overlay at %s is not a JSON object; ignoring.", path
        )
        return {}

    return data


def save_llm_settings_overlay(data: Dict[str, Any]) -> Path:
    """Write the LLM settings overlay to disk atomically.

    Creates the data directory if missing, writes to a temporary file, then
    renames into place so readers never see a partial file. On POSIX the
    final file is chmod'd to ``0o600``.
    """
    if not isinstance(data, dict):
        raise TypeError(
            f"LLM settings overlay must be a dict, got {type(data).__name__}"
        )

    path = get_llm_settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.flush()
        try:
            os.fsync(f.fileno())
        except (AttributeError, OSError):  # pragma: no cover - best-effort
            pass

    os.replace(tmp_path, path)

    # Restrict to owner on POSIX. chmod is a no-op for permission bits on
    # Windows, so we guard to keep intent explicit.
    if sys.platform != "win32":
        try:
            os.chmod(path, 0o600)
        except OSError as e:  # pragma: no cover - defensive
            logger.warning("Failed to chmod %s to 0600: %s", path, e)

    logger.info("Wrote LLM settings overlay to %s", path)
    return path
