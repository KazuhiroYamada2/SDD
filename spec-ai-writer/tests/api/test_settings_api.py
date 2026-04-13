"""
API tests for /api/settings/llm router.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from config.llm_settings_store import get_llm_settings_path
from config.settings import reload_settings
from spec_ai_writer.web.app import app


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    """TestClient backed by an isolated data directory."""
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    # Start from a clean slate so prior env-loaded keys do not leak into
    # assertions on masking output.
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "")
    monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "claude")
    reload_settings()
    yield TestClient(app)
    reload_settings()


@pytest.mark.api
class TestSettingsAPI:
    def test_get_returns_masked_keys(self, client, tmp_path):
        # Seed an overlay with a real-looking key.
        overlay_path = tmp_path / "data" / "llm_settings.json"
        overlay_path.parent.mkdir(parents=True, exist_ok=True)
        overlay_path.write_text(
            json.dumps(
                {
                    "default_llm_provider": "openai",
                    "openai_api_key": "sk-openrouter-supersecretvalue",
                    "openai_base_url": "https://openrouter.ai/api/v1",
                    "openai_model": "anthropic/claude-3.5-sonnet",
                }
            )
        )
        reload_settings()

        resp = client.get("/api/settings/llm")
        assert resp.status_code == 200
        body = resp.json()

        assert body["provider"] == "openai"
        assert body["openai_base_url"] == "https://openrouter.ai/api/v1"
        assert body["openai_model"] == "anthropic/claude-3.5-sonnet"

        masked = body["openai_api_key_masked"]
        assert masked != "sk-openrouter-supersecretvalue"
        assert masked.startswith("sk-o")
        assert masked.endswith("alue")
        assert "****" in masked

    def test_put_persists_and_hot_reloads(self, client, tmp_path):
        resp = client.put(
            "/api/settings/llm",
            json={
                "provider": "openai",
                "openai_base_url": "http://localhost:11434/v1",
                "openai_model": "llama3.1:8b",
                "openai_api_key": "sk-local-dummy-key-value",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        # Response reflects the new values with the key masked.
        assert body["provider"] == "openai"
        assert body["openai_base_url"] == "http://localhost:11434/v1"
        assert body["openai_model"] == "llama3.1:8b"
        assert body["openai_api_key_masked"] != "sk-local-dummy-key-value"
        assert "****" in body["openai_api_key_masked"]

        # File on disk contains the unmasked key (this is the explicit
        # threat model — plaintext + 0600).
        stored = json.loads(get_llm_settings_path().read_text())
        assert stored["openai_api_key"] == "sk-local-dummy-key-value"
        assert stored["openai_base_url"] == "http://localhost:11434/v1"

        # A subsequent GET should show the same (freshly reloaded) state.
        get_resp = client.get("/api/settings/llm")
        assert get_resp.status_code == 200
        assert get_resp.json()["openai_model"] == "llama3.1:8b"

    def test_put_empty_api_key_preserves_existing(self, client, tmp_path):
        """Sending an empty api_key must NOT overwrite the stored value."""
        # Seed a key.
        client.put(
            "/api/settings/llm",
            json={
                "provider": "openai",
                "openai_api_key": "sk-original-key-12345",
            },
        )

        # Update an unrelated field; leave api_key omitted.
        resp = client.put(
            "/api/settings/llm",
            json={
                "openai_model": "gpt-4o-mini",
                # No api_key field at all.
            },
        )
        assert resp.status_code == 200

        stored = json.loads(get_llm_settings_path().read_text())
        assert stored["openai_api_key"] == "sk-original-key-12345"
        assert stored["openai_model"] == "gpt-4o-mini"

    def test_put_explicit_empty_string_also_preserves(self, client, tmp_path):
        """Empty string (from a blank form field) is treated as 'no change'."""
        client.put(
            "/api/settings/llm",
            json={
                "provider": "openai",
                "openai_api_key": "sk-original",
            },
        )

        resp = client.put(
            "/api/settings/llm",
            json={
                "openai_api_key": "",  # explicit blank
                "openai_model": "gpt-4",
            },
        )
        assert resp.status_code == 200

        stored = json.loads(get_llm_settings_path().read_text())
        assert stored["openai_api_key"] == "sk-original"

    def test_put_rejects_invalid_temperature(self, client):
        resp = client.put(
            "/api/settings/llm",
            json={"temperature": 5.0},
        )
        assert resp.status_code == 422  # pydantic validation error

    def test_put_rejects_invalid_provider(self, client):
        resp = client.put(
            "/api/settings/llm",
            json={"provider": "gemini"},
        )
        assert resp.status_code == 422
