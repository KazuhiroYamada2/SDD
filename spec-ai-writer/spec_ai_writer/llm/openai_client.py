"""
OpenAI LLM Client Implementation

Provides integration with OpenAI API (GPT-4, GPT-3.5-turbo).
"""

import logging
from typing import List, Dict, Optional

import httpx

try:
    from openai import OpenAI, AuthenticationError, APIConnectionError, APITimeoutError
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from .base import BaseLLMClient
from .exceptions import LLMAuthenticationError, LLMConnectionError, LLMResponseError

logger = logging.getLogger(__name__)


class OpenAIClient(BaseLLMClient):
    """
    OpenAI client for GPT models.

    Supports GPT-4, GPT-4-turbo, and GPT-3.5-turbo models.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4-turbo-preview",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 30.0
    ):
        """
        Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            model: Model name (gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo, etc.)
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            timeout: Timeout in seconds for API calls

        Raises:
            ImportError: If openai package is not installed
            ValueError: If API key is invalid
        """
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package is required for OpenAI integration. "
                "Install it with: pip install openai"
            )

        if not api_key:
            raise ValueError("OpenAI API key is required")

        super().__init__(api_key, model, temperature, timeout=timeout)
        self.max_tokens = max_tokens

        try:
            self.client = OpenAI(api_key=api_key, timeout=httpx.Timeout(self.timeout))
            logger.info(f"OpenAI client initialized with model: {model}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise ValueError(f"Failed to initialize OpenAI client: {e}")

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send chat messages to OpenAI and get response.

        OpenAI API supports system messages natively, so messages are passed as-is.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            temperature: Override default temperature
            max_tokens: Override default max_tokens

        Returns:
            Assistant's response text

        Raises:
            RuntimeError: If API call fails
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )

            if not response.choices:
                logger.warning("Empty response from OpenAI API")
                return ""

            result = response.choices[0].message.content or ""
            logger.debug(f"OpenAI response received: {len(result)} characters")

            return result

        except AuthenticationError as e:
            logger.error(f"OpenAI authentication failed: {e}")
            raise LLMAuthenticationError(
                "OpenAI APIキーが無効です。.env ファイルの OPENAI_API_KEY を確認してください。"
            ) from e
        except (APIConnectionError, APITimeoutError) as e:
            logger.error(f"OpenAI connection error: {e}")
            raise LLMConnectionError(
                f"OpenAI APIに接続できません。ネットワーク接続を確認してください: {e}"
            ) from e
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise LLMResponseError(f"OpenAI API call failed: {e}") from e


# Commonly used models
GPT4_TURBO = "gpt-4-turbo-preview"
GPT4 = "gpt-4"
GPT4_32K = "gpt-4-32k"
GPT35_TURBO = "gpt-3.5-turbo"
GPT35_TURBO_16K = "gpt-3.5-turbo-16k"
