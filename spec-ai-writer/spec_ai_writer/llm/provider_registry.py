"""Registry of LLM provider and model-specific configurations.

Adding a new provider: add an entry to PROVIDERS.
Adding a new model with non-standard params: add an entry to MODELS.
No other files need to change.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ProviderConfig:
    client_type: str  # "openai_compatible" | "claude" | "bedrock"
    display_name: str = ""
    base_url: Optional[str] = None
    api_key_required: bool = True
    extra_body: dict = field(default_factory=dict)


@dataclass
class ModelConfig:
    max_tokens_param: str = "max_tokens"
    temperature_supported: bool = True
    fixed_temperature: Optional[float] = None  # overrides user setting when set


PROVIDERS: dict[str, ProviderConfig] = {
    "claude": ProviderConfig(
        client_type="claude",
        display_name="Claude (Anthropic API)",
    ),
    "openai": ProviderConfig(
        client_type="openai_compatible",
        display_name="OpenAI",
    ),
    "openrouter": ProviderConfig(
        client_type="openai_compatible",
        display_name="OpenRouter",
        base_url="https://openrouter.ai/api/v1",
    ),
    "ollama": ProviderConfig(
        client_type="openai_compatible",
        display_name="Ollama (ローカル)",
        base_url="http://localhost:11434/v1",
        api_key_required=False,
    ),
    "lmstudio": ProviderConfig(
        client_type="openai_compatible",
        display_name="LM Studio (ローカル)",
        base_url="http://localhost:1234/v1",
        api_key_required=False,
    ),
    "kimi": ProviderConfig(
        client_type="openai_compatible",
        display_name="Moonshot Kimi",
        base_url="https://api.moonshot.ai/v1",
        extra_body={"thinking": {"type": "disabled"}},
    ),
    "bedrock": ProviderConfig(
        client_type="bedrock",
        display_name="AWS Bedrock",
    ),
}

# Model-specific parameter overrides.
# Keys are exact model IDs; use prefix matching for families (e.g. "o1-").
MODELS: dict[str, ModelConfig] = {
    "gpt-5.5": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "gpt-5.5-pro": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "gpt-5.4": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "gpt-5.4-pro": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "gpt-5-mini": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "gpt-5-nano": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "o1": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "o1-mini": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "o3": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "o3-mini": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "o4-mini": ModelConfig(
        max_tokens_param="max_completion_tokens", temperature_supported=False
    ),
    "kimi-k2.6": ModelConfig(fixed_temperature=0.6),
}


def get_model_config(model: str) -> ModelConfig:
    """Return ModelConfig for a given model ID, falling back to defaults."""
    return MODELS.get(model, ModelConfig())
