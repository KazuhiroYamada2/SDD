"""
Unit tests for the Settings JSON overlay and in-place reload behavior.
"""

from __future__ import annotations

import pytest

from spec_ai_writer.config.llm_settings_store import save_llm_settings_overlay
from spec_ai_writer.config.settings import get_settings, reload_settings


@pytest.mark.unit
class TestSettingsOverlay:
    def test_overlay_wins_over_env(self, tmp_path, monkeypatch):
        """JSON overlay values must override .env / environment values."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("OPENAI_API_KEY", "from-env")
        monkeypatch.setenv("OPENAI_BASE_URL", "")
        monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "claude")

        save_llm_settings_overlay(
            {
                "default_llm_provider": "openai",
                "openai_api_key": "from-overlay",
                "openai_base_url": "https://openrouter.ai/api/v1",
                "openai_model": "anthropic/claude-3.5-sonnet",
            }
        )

        settings = reload_settings()
        assert settings.default_llm_provider == "openai"
        assert settings.openai_api_key == "from-overlay"
        assert settings.openai_base_url == "https://openrouter.ai/api/v1"
        assert settings.openai_model == "anthropic/claude-3.5-sonnet"

    def test_reload_mutates_in_place(self, tmp_path, monkeypatch):
        """Module-level captured references must see reloaded values.

        Routers bind ``settings = get_settings()`` at import time, so
        ``reload_settings()`` has to mutate the existing instance rather than
        swap it out.
        """
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "claude")
        monkeypatch.setenv("OPENAI_API_KEY", "")

        # Force a reload against the fresh tmp DATA_DIR so prior tests cannot
        # leak state into the captured reference via the module-level global.
        captured = reload_settings()
        assert captured.default_llm_provider == "claude"

        save_llm_settings_overlay({"default_llm_provider": "openai", "openai_api_key": "k"})
        returned = reload_settings()

        # Same object identity — reload must mutate in place.
        assert returned is captured
        # The same object should now reflect the new value.
        assert captured.default_llm_provider == "openai"
        assert captured.openai_api_key == "k"

    def test_unknown_overlay_fields_ignored(self, tmp_path, monkeypatch):
        """Fields outside the allowlist must not mutate settings."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_llm_settings_overlay(
            {
                "default_llm_provider": "claude",
                "not_a_real_field": "danger",
                "__class__": "hacked",
            }
        )

        settings = reload_settings()
        assert settings.default_llm_provider == "claude"
        assert not hasattr(settings, "not_a_real_field")

    def test_validate_openai_without_key_when_base_url_set(self, tmp_path, monkeypatch):
        """Local/OpenRouter setups should validate even without an API key."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("OPENAI_API_KEY", "")
        save_llm_settings_overlay(
            {
                "default_llm_provider": "openai",
                "openai_base_url": "http://localhost:11434/v1",
                "openai_model": "llama3.1:8b",
            }
        )

        settings = reload_settings()
        is_valid, errors = settings.validate_llm_config()
        assert is_valid, errors

    def test_validate_openai_requires_key_for_official_endpoint(
        self, tmp_path, monkeypatch
    ):
        """Without base_url the OpenAI key is still required."""
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        monkeypatch.setenv("OPENAI_API_KEY", "")
        save_llm_settings_overlay(
            {
                "default_llm_provider": "openai",
                "openai_base_url": "",
                "openai_api_key": "",
            }
        )

        settings = reload_settings()
        is_valid, errors = settings.validate_llm_config()
        assert not is_valid
        assert any("OPENAI_API_KEY" in e for e in errors)
