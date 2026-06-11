"""
Unit tests for the LLM settings JSON store.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

from spec_ai_writer.config.llm_settings_store import (
    get_llm_settings_path,
    load_llm_settings_overlay,
    save_llm_settings_overlay,
)


@pytest.mark.unit
class TestLLMSettingsStore:
    """Round-trip, error handling and permission tests."""

    def test_load_returns_empty_when_file_missing(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        assert load_llm_settings_overlay() == {}

    def test_save_and_load_roundtrip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))

        payload = {
            "default_llm_provider": "openai",
            "openai_base_url": "https://openrouter.ai/api/v1",
            "openai_model": "anthropic/claude-3.5-sonnet",
            "openai_api_key": "sk-or-v1-test",
            "temperature": 0.4,
        }
        save_llm_settings_overlay(payload)

        loaded = load_llm_settings_overlay()
        assert loaded == payload

    def test_save_creates_missing_data_dir(self, tmp_path, monkeypatch):
        """The data directory should be created on first write."""
        nested = tmp_path / "does" / "not" / "exist"
        monkeypatch.setenv("DATA_DIR", str(nested))
        assert not nested.exists()

        save_llm_settings_overlay({"default_llm_provider": "claude"})
        assert nested.exists()
        assert (nested / "llm_settings.json").is_file()

    @pytest.mark.skipif(sys.platform == "win32", reason="POSIX permissions only")
    def test_save_sets_0600_permissions(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_llm_settings_overlay({"openai_api_key": "secret"})

        path = get_llm_settings_path()
        mode = path.stat().st_mode & 0o777
        assert mode == 0o600

    def test_malformed_json_returns_empty(self, tmp_path, monkeypatch):
        """Corrupted overlay files must not crash startup."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "llm_settings.json").write_text("{not valid json")
        monkeypatch.setenv("DATA_DIR", str(data_dir))

        assert load_llm_settings_overlay() == {}

    def test_non_object_json_returns_empty(self, tmp_path, monkeypatch):
        """A top-level array/string is ignored rather than applied blindly."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "llm_settings.json").write_text('["not", "an", "object"]')
        monkeypatch.setenv("DATA_DIR", str(data_dir))

        assert load_llm_settings_overlay() == {}

    def test_save_rejects_non_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        with pytest.raises(TypeError):
            save_llm_settings_overlay([1, 2, 3])  # type: ignore[arg-type]

    def test_save_is_atomic_no_tmp_leftover(self, tmp_path, monkeypatch):
        """After a successful save no .tmp file should remain."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_llm_settings_overlay({"openai_model": "gpt-4o"})

        data_dir = tmp_path / "data"
        leftovers = [p for p in data_dir.iterdir() if p.suffix == ".tmp"]
        assert leftovers == []
