"""Unit tests for config/settings_file.py (new JSON store)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from spec_ai_writer.config.settings_file import (
    get_settings_path,
    load_settings,
    migrate_legacy_settings,
    save_settings,
    _flat_to_nested,
)


@pytest.mark.unit
class TestSettingsFile:
    def test_load_returns_empty_when_file_missing(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        assert load_settings() == {}

    def test_save_and_load_roundtrip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))

        payload = {
            "active_provider": "kimi",
            "temperature": 0.6,
            "providers": {
                "kimi": {"model": "kimi-k2.6", "api_key": "sk-kimi-test"},
            },
        }
        save_settings(payload)
        assert load_settings() == payload

    def test_save_creates_missing_data_dir(self, tmp_path, monkeypatch):
        nested = tmp_path / "does" / "not" / "exist"
        monkeypatch.setenv("DATA_DIR", str(nested))
        assert not nested.exists()

        save_settings({"active_provider": "claude"})
        assert nested.exists()
        assert (nested / "settings.json").is_file()

    @pytest.mark.skipif(sys.platform == "win32", reason="POSIX permissions only")
    def test_save_sets_0600_permissions(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_settings({"active_provider": "kimi"})

        path = get_settings_path()
        assert (path.stat().st_mode & 0o777) == 0o600

    def test_malformed_json_returns_empty(self, tmp_path, monkeypatch):
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "settings.json").write_text("{not valid json")
        monkeypatch.setenv("DATA_DIR", str(data_dir))

        assert load_settings() == {}

    def test_non_object_json_returns_empty(self, tmp_path, monkeypatch):
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "settings.json").write_text('["not", "an", "object"]')
        monkeypatch.setenv("DATA_DIR", str(data_dir))

        assert load_settings() == {}

    def test_save_rejects_non_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        with pytest.raises(TypeError):
            save_settings([1, 2, 3])  # type: ignore[arg-type]

    def test_save_is_atomic_no_tmp_leftover(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        save_settings({"active_provider": "openai"})

        data_dir = tmp_path / "data"
        leftovers = [p for p in data_dir.iterdir() if p.suffix == ".tmp"]
        assert leftovers == []


@pytest.mark.unit
class TestMigration:
    def test_migration_converts_flat_openai(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "llm_settings.json").write_text(json.dumps({
            "default_llm_provider": "openai",
            "openai_api_key": "sk-test",
            "openai_model": "gpt-4o",
            "temperature": 0.5,
        }))

        migrate_legacy_settings()

        new = load_settings()
        assert new["active_provider"] == "openai"
        assert new["temperature"] == 0.5
        assert new["providers"]["openai"]["api_key"] == "sk-test"
        assert new["providers"]["openai"]["model"] == "gpt-4o"

    def test_migration_detects_openrouter(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "llm_settings.json").write_text(json.dumps({
            "default_llm_provider": "openai",
            "openai_api_key": "sk-or-key",
            "openai_model": "anthropic/claude-3.5-sonnet",
            "openai_base_url": "https://openrouter.ai/api/v1",
        }))

        migrate_legacy_settings()

        new = load_settings()
        assert "openrouter" in new["providers"]
        assert new["providers"]["openrouter"]["api_key"] == "sk-or-key"

    def test_migration_skipped_when_new_file_exists(self, tmp_path, monkeypatch):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "llm_settings.json").write_text(json.dumps({"default_llm_provider": "openai"}))
        (data_dir / "settings.json").write_text(json.dumps({"active_provider": "kimi"}))

        migrate_legacy_settings()

        # New file should be untouched
        assert load_settings()["active_provider"] == "kimi"

    def test_flat_to_nested_bedrock(self):
        flat = {
            "default_llm_provider": "bedrock",
            "bedrock_model_id": "some-model",
            "aws_access_key_id": "AKIA...",
            "aws_secret_access_key": "secret",
            "aws_region": "us-east-1",
        }
        nested = _flat_to_nested(flat)
        assert nested["active_provider"] == "bedrock"
        assert nested["providers"]["bedrock"]["model"] == "some-model"
        assert nested["providers"]["bedrock"]["aws_region"] == "us-east-1"
