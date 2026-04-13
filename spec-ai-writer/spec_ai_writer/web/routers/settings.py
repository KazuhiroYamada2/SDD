"""
LLM Settings API Router

Endpoints for reading and updating the LLM provider configuration from the
Web UI. Values written via ``PUT /api/settings/llm`` are persisted to
``data/llm_settings.json`` and overlaid on top of environment variables.
``reload_settings()`` is called after each successful write so subsequent
interview / specification requests pick up the new configuration without a
server restart.

Security
--------
API keys are returned in **masked** form from ``GET``. ``PUT`` accepts an
``api_key`` field that is treated as follows:

- Omitted / ``None`` / empty string → keep the existing value unchanged.
- Any other value → store as the new key.

This avoids the common bug where re-submitting the masked value from the UI
silently overwrites the real key.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from config.llm_settings_store import (
    load_llm_settings_overlay,
    save_llm_settings_overlay,
)
from config.settings import get_settings, reload_settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


Provider = Literal["claude", "openai", "bedrock"]


class LLMSettingsResponse(BaseModel):
    """Current LLM settings returned to the UI. API keys are masked."""

    provider: Provider
    openai_base_url: str = ""
    openai_model: str = ""
    openai_api_key_masked: str = ""
    anthropic_api_key_masked: str = ""
    bedrock_model_id: str = ""
    aws_region: str = ""
    aws_access_key_id_masked: str = ""
    aws_secret_access_key_masked: str = ""
    temperature: float = 0.7


class LLMSettingsUpdateRequest(BaseModel):
    """Request payload for PUT /api/settings/llm.

    All fields are optional so the UI can send partial updates. API key
    fields are ignored when empty (see module docstring).
    """

    provider: Optional[Provider] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    openai_api_key: Optional[str] = Field(default=None, repr=False)
    anthropic_api_key: Optional[str] = Field(default=None, repr=False)
    bedrock_model_id: Optional[str] = None
    aws_region: Optional[str] = None
    aws_access_key_id: Optional[str] = Field(default=None, repr=False)
    aws_secret_access_key: Optional[str] = Field(default=None, repr=False)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mask_secret(value: str) -> str:
    """Return a masked representation of a secret for display.

    Examples:
        ""                → ""
        "short"           → "****"
        "sk-ant-xxxxxxxx" → "sk-a****xxxx"
    """
    if not value:
        return ""
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}****{value[-4:]}"


def _build_response(settings) -> LLMSettingsResponse:
    provider = settings.default_llm_provider
    if provider not in ("claude", "openai", "bedrock"):
        # Keep the response shape stable even if an invalid value is on disk.
        provider = "claude"

    return LLMSettingsResponse(
        provider=provider,  # type: ignore[arg-type]
        openai_base_url=settings.openai_base_url or "",
        openai_model=settings.openai_model or "",
        openai_api_key_masked=_mask_secret(settings.openai_api_key or ""),
        anthropic_api_key_masked=_mask_secret(settings.anthropic_api_key or ""),
        bedrock_model_id=settings.bedrock_model_id or "",
        aws_region=settings.aws_region or "",
        aws_access_key_id_masked=_mask_secret(settings.aws_access_key_id or ""),
        aws_secret_access_key_masked=_mask_secret(settings.aws_secret_access_key or ""),
        temperature=settings.temperature,
    )


# Fields that map 1:1 from the update request to the overlay dict, excluding
# secret fields which need the keep-existing semantics.
_NON_SECRET_UPDATE_FIELDS: tuple[str, ...] = (
    "openai_base_url",
    "openai_model",
    "bedrock_model_id",
    "aws_region",
    "temperature",
)

_SECRET_UPDATE_FIELDS: tuple[tuple[str, str], ...] = (
    # (request field, overlay field)
    ("openai_api_key", "openai_api_key"),
    ("anthropic_api_key", "anthropic_api_key"),
    ("aws_access_key_id", "aws_access_key_id"),
    ("aws_secret_access_key", "aws_secret_access_key"),
)


def _merge_overlay(
    existing: Dict[str, Any], payload: LLMSettingsUpdateRequest
) -> Dict[str, Any]:
    """Merge the update request into the existing overlay dict.

    - ``provider`` is mapped to ``default_llm_provider`` in the overlay.
    - Non-secret fields overwrite when provided (even empty strings, so the
      user can clear a base_url).
    - Secret fields are ignored when omitted or empty, otherwise stored.
    """
    merged = dict(existing)

    if payload.provider is not None:
        merged["default_llm_provider"] = payload.provider

    for field in _NON_SECRET_UPDATE_FIELDS:
        value = getattr(payload, field)
        if value is not None:
            merged[field] = value

    for req_field, overlay_field in _SECRET_UPDATE_FIELDS:
        value = getattr(payload, req_field)
        if value:  # ignore None and empty string
            merged[overlay_field] = value

    return merged


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings() -> LLMSettingsResponse:
    """Return the currently active LLM settings with secrets masked."""
    settings = get_settings()
    return _build_response(settings)


@router.put("/llm", response_model=LLMSettingsResponse)
async def update_llm_settings(
    payload: LLMSettingsUpdateRequest,
) -> LLMSettingsResponse:
    """Update LLM settings, persist to the JSON store, and hot-reload."""
    try:
        existing = load_llm_settings_overlay()
        merged = _merge_overlay(existing, payload)
        save_llm_settings_overlay(merged)
    except Exception as e:
        logger.exception("Failed to save LLM settings overlay")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save LLM settings: {e}",
        ) from e

    # Re-apply overlay on top of env and mutate the shared settings instance
    # in place so module-level references in other routers see the change.
    settings = reload_settings()

    # Validate the resulting configuration; surface errors but keep the new
    # values on disk so the user can fix them from the same screen.
    is_valid, errors = settings.validate_llm_config()
    if not is_valid:
        logger.warning("LLM settings saved but failed validation: %s", errors)

    return _build_response(settings)
