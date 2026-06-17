"""Unit tests for the Settings JSON overlay and in-place reload behavior."""

from __future__ import annotations

import pytest
from spec_ai_writer.config.settings import (
    get_settings,
    get_settings_sources,
    reload_settings,
)
from spec_ai_writer.config.settings_file import save_settings


@pytest.mark.unit
class TestSettingsOverlay:
    def test_overlay_wins_over_env(self, tmp_path, monkeypatch):
        """JSON overlay values must override .env / environment values."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("OPENAI_API_KEY", "from-env")
        monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "claude")

        save_settings(
            {
                "active_provider": "openai",
                "providers": {
                    "openai": {
                        "api_key": "from-overlay",
                        "model": "gpt-4o",
                    },
                },
            }
        )

        settings = reload_settings()
        assert settings.default_llm_provider == "openai"
        assert settings.openai_api_key == "from-overlay"
        assert settings.openai_model == "gpt-4o"

    def test_reload_mutates_in_place(self, tmp_path, monkeypatch):
        """Module-level captured references must see reloaded values."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "claude")
        monkeypatch.setenv("OPENAI_API_KEY", "")

        captured = reload_settings()
        assert captured.default_llm_provider == "claude"

        save_settings(
            {
                "active_provider": "openai",
                "providers": {"openai": {"api_key": "k", "model": "gpt-4o"}},
            }
        )
        returned = reload_settings()

        assert returned is captured
        assert captured.default_llm_provider == "openai"
        assert captured.openai_api_key == "k"

    def test_kimi_overlay(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("KIMI_API_KEY", "")

        save_settings(
            {
                "active_provider": "kimi",
                "providers": {
                    "kimi": {"api_key": "sk-kimi-123", "model": "kimi-k2.6"},
                },
            }
        )

        settings = reload_settings()
        assert settings.default_llm_provider == "kimi"
        assert settings.kimi_api_key == "sk-kimi-123"
        assert settings.kimi_model == "kimi-k2.6"

    def test_source_tracking_json(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("KIMI_API_KEY", "")

        save_settings(
            {
                "active_provider": "kimi",
                "providers": {"kimi": {"api_key": "sk-kimi", "model": "kimi-k2.6"}},
            }
        )
        reload_settings()
        sources = get_settings_sources()

        assert sources["default_llm_provider"] == "json"
        assert sources["kimi_api_key"] == "json"
        assert sources["kimi_model"] == "json"

    def test_source_tracking_env(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("OPENAI_API_KEY", "env-key")

        reload_settings()
        sources = get_settings_sources()

        assert sources["openai_api_key"] == "env"

    def test_validate_kimi_requires_key(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("KIMI_API_KEY", "")
        save_settings({"active_provider": "kimi"})

        settings = reload_settings()
        is_valid, errors = settings.validate_llm_config()
        assert not is_valid
        assert any("KIMI_API_KEY" in e for e in errors)

    def test_validate_ollama_no_key_required(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_settings(
            {
                "active_provider": "ollama",
                "providers": {"ollama": {"model": "gemma3:4b"}},
            }
        )

        settings = reload_settings()
        is_valid, errors = settings.validate_llm_config()
        assert is_valid, errors
