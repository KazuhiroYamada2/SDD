"""Configuration management for spec-ai-writer."""

import logging
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # LLM API Keys
    openai_api_key: str = Field(default="", description="OpenAI API key")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")

    # OpenAI-compatible endpoint overrides
    # Setting openai_base_url routes the 'openai' provider to an alternative
    # endpoint such as OpenRouter or a local LLM server (Ollama, LM Studio,
    # llama.cpp OpenAI-compatible mode).
    openai_base_url: str = Field(
        default="",
        description=(
            "Base URL for OpenAI-compatible endpoint. Leave empty for official "
            "OpenAI API. Examples: https://openrouter.ai/api/v1, "
            "http://localhost:11434/v1 (Ollama), http://localhost:1234/v1 (LM Studio)"
        ),
    )
    openai_model: str = Field(
        default="gpt-5-mini",
        description=(
            "Model name for the OpenAI provider. When using OpenRouter or a "
            "local server, set this to that provider's model ID."
        ),
    )

    # AWS Credentials (for Bedrock)
    aws_access_key_id: str = Field(default="", description="AWS access key ID")
    aws_secret_access_key: str = Field(default="", description="AWS secret access key")
    aws_region: str = Field(default="ap-northeast-1", description="AWS region")
    bedrock_model_id: str = Field(
        default="global.anthropic.claude-haiku-4-5-20251001-v1:0",
        description="Bedrock model ID (e.g., global.anthropic.claude-haiku-4-5-20251001-v1:0)"
    )

    # spec-ai-writer Settings
    default_llm_provider: str = Field(
        default="claude",
        description="Default LLM provider (claude, openai, bedrock)"
    )
    data_dir: str = Field(
        default="./data",
        description="Data directory for project files"
    )
    auto_git_commit: bool = Field(
        default=True,
        description="Automatically commit generated files to Git"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="LLM temperature for generation"
    )

    # Application environment
    app_env: Literal["development", "production"] = Field(
        default="development",
        description="Application environment: 'production' or 'development'"
    )

    # Model configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    def get_data_path(self) -> Path:
        """Get the data directory as a Path object."""
        return Path(self.data_dir).expanduser().resolve()

    def validate_llm_config(self) -> tuple[bool, list[str]]:
        """
        Validate that the necessary API keys are configured for the selected provider.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        if self.default_llm_provider == "claude":
            if not self.anthropic_api_key:
                errors.append("ANTHROPIC_API_KEY is required for Claude provider")
        elif self.default_llm_provider == "openai":
            # When routing to a custom OpenAI-compatible endpoint (OpenRouter,
            # Ollama, LM Studio, ...) the API key may be optional, so we only
            # enforce it for the official OpenAI endpoint.
            if not self.openai_base_url and not self.openai_api_key:
                errors.append("OPENAI_API_KEY is required for OpenAI provider")
        elif self.default_llm_provider == "bedrock":
            if not self.aws_access_key_id or not self.aws_secret_access_key:
                errors.append("AWS credentials are required for Bedrock provider")
        else:
            errors.append(
                f"Invalid LLM provider: {self.default_llm_provider}. "
                "Must be one of: claude, openai, bedrock"
            )

        return len(errors) == 0, errors


# Fields that may be overridden by the JSON settings store (written from the
# Web UI). Listing them explicitly keeps the overlay narrow and predictable.
LLM_SETTINGS_OVERLAY_FIELDS: tuple[str, ...] = (
    "default_llm_provider",
    "anthropic_api_key",
    "openai_api_key",
    "openai_base_url",
    "openai_model",
    "aws_access_key_id",
    "aws_secret_access_key",
    "aws_region",
    "bedrock_model_id",
    "temperature",
)


def _apply_llm_overlay(settings: "Settings") -> None:
    """Apply JSON overlay from the LLM settings store onto a Settings instance.

    The overlay takes precedence over environment variables so that changes
    saved via the Web UI are authoritative. Unknown or unlisted fields are
    ignored. This mutates the given instance in place so existing references
    (e.g. module-level ``settings`` captured by routers) pick up the change.
    """
    # Imported lazily to avoid a circular import: llm_settings_store depends
    # on the settings module for its data_dir lookup.
    from spec_ai_writer.config.llm_settings_store import load_llm_settings_overlay

    overlay = load_llm_settings_overlay()
    if not overlay:
        return

    for key, value in overlay.items():
        if key not in LLM_SETTINGS_OVERLAY_FIELDS:
            logger.debug("Ignoring unknown overlay field: %s", key)
            continue
        try:
            setattr(settings, key, value)
        except Exception as e:  # pragma: no cover - defensive
            logger.warning("Failed to apply overlay field %s: %s", key, e)


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get the global settings instance, creating it if necessary.

    On first creation the JSON overlay from ``data/llm_settings.json`` is
    applied on top of values loaded from the environment / ``.env``.
    """
    global _settings
    if _settings is None:
        _settings = Settings()
        _apply_llm_overlay(_settings)
    return _settings


def reload_settings() -> Settings:
    """Reload settings from environment/config file and re-apply JSON overlay.

    Mutates the existing global instance in place so that module-level
    references captured by routers (e.g. ``settings = get_settings()`` at
    import time) observe the updated values without needing to re-import.
    """
    global _settings
    fresh = Settings()
    _apply_llm_overlay(fresh)

    if _settings is None:
        _settings = fresh
        return _settings

    # Mutate in place so existing references stay valid.
    for field_name in type(fresh).model_fields.keys():
        setattr(_settings, field_name, getattr(fresh, field_name))
    return _settings
