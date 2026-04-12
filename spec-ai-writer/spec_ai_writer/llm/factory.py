"""Factory for creating LLM clients."""

from typing import Optional

from config.settings import Settings

from .base import BaseLLMClient
from .claude_client import ClaudeClient


class LLMFactory:
    """Factory for creating LLM client instances."""

    @staticmethod
    def create_client(
        provider: Optional[str] = None,
        settings: Optional[Settings] = None
    ) -> BaseLLMClient:
        """
        Create an LLM client based on provider name.

        Args:
            provider: LLM provider name ('claude', 'openai', 'bedrock')
                     If None, uses settings.default_llm_provider
            settings: Settings instance. If None, creates a new one.

        Returns:
            Initialized LLM client instance

        Raises:
            ValueError: If provider is invalid or credentials are missing
            ImportError: If required provider library is not installed
        """
        if settings is None:
            from config.settings import get_settings
            settings = get_settings()

        if provider is None:
            provider = settings.default_llm_provider

        provider = provider.lower()

        if provider == "claude":
            return LLMFactory._create_claude_client(settings)
        elif provider == "openai":
            return LLMFactory._create_openai_client(settings)
        elif provider == "bedrock":
            return LLMFactory._create_bedrock_client(settings)
        else:
            raise ValueError(
                f"Unknown LLM provider: {provider}. "
                "Supported providers: claude, openai, bedrock"
            )

    @staticmethod
    def _create_claude_client(settings: Settings) -> ClaudeClient:
        """Create Claude client."""
        if not settings.anthropic_api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is required for Claude provider. "
                "Set it in .env file or environment variable."
            )

        return ClaudeClient(
            api_key=settings.anthropic_api_key,
            temperature=settings.temperature
        )

    @staticmethod
    def _create_openai_client(settings: Settings) -> BaseLLMClient:
        """Create OpenAI (or OpenAI-compatible) client.

        The same client class backs three use cases:

        - **Official OpenAI**: ``openai_base_url`` empty, real API key required.
        - **OpenRouter**: ``openai_base_url=https://openrouter.ai/api/v1`` and a
          real OpenRouter API key.
        - **Local LLM** (Ollama / LM Studio / llama.cpp): ``openai_base_url``
          pointing at ``http://localhost:<port>/v1``. Many local servers ignore
          the API key entirely, so an empty key is replaced with a dummy so
          the OpenAI SDK initializer (which requires a non-empty string) is
          satisfied.
        """
        base_url = settings.openai_base_url or None

        if not settings.openai_api_key:
            if not base_url:
                raise ValueError(
                    "OPENAI_API_KEY is required for the official OpenAI endpoint. "
                    "Set it in .env file or environment variable, or configure a "
                    "custom OPENAI_BASE_URL (OpenRouter / local server)."
                )
            api_key = "dummy"
        else:
            api_key = settings.openai_api_key

        try:
            from .openai_client import OpenAIClient
        except ImportError:
            raise ImportError(
                "openai package is required for OpenAI integration. "
                "Install it with: pip install openai"
            )

        return OpenAIClient(
            api_key=api_key,
            model=settings.openai_model,
            temperature=settings.temperature,
            base_url=base_url,
        )

    @staticmethod
    def _create_bedrock_client(settings: Settings) -> BaseLLMClient:
        """Create AWS Bedrock client."""
        if not settings.aws_access_key_id or not settings.aws_secret_access_key:
            raise ValueError(
                "AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) "
                "are required for Bedrock provider. "
                "Set them in .env file or environment variables."
            )

        try:
            from .bedrock_client import BedrockClient
        except ImportError:
            raise ImportError(
                "boto3 is required for Bedrock integration. "
                "Install it with: pip install boto3"
            )

        return BedrockClient(
            model=settings.bedrock_model_id,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region=settings.aws_region,
            temperature=settings.temperature
        )


def create_default_client() -> BaseLLMClient:
    """
    Create an LLM client using default settings.

    Returns:
        Initialized LLM client

    Raises:
        ValueError: If configuration is invalid
    """
    from config.settings import get_settings

    settings = get_settings()
    is_valid, errors = settings.validate_llm_config()

    if not is_valid:
        error_msg = "Invalid LLM configuration:\n" + "\n".join(f"  - {e}" for e in errors)
        raise ValueError(error_msg)

    return LLMFactory.create_client(settings=settings)
