"""Claude API client implementation."""

import logging
from typing import Dict, List, Optional

import httpx
from anthropic import AsyncAnthropic, AuthenticationError, APIConnectionError, APITimeoutError

from .base import BaseLLMClient
from .exceptions import LLMAuthenticationError, LLMConnectionError, LLMResponseError

logger = logging.getLogger(__name__)


class ClaudeClient(BaseLLMClient):
    """Client for Anthropic's Claude API."""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-haiku-4-5-20251001",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 30.0
    ):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key
            model: Claude model name
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            timeout: Timeout in seconds for API calls
        """
        super().__init__(api_key, model, temperature, timeout=timeout)
        self.max_tokens = max_tokens
        self.client = AsyncAnthropic(api_key=api_key, timeout=httpx.Timeout(self.timeout))

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send a chat request to Claude.

        Anthropic API requires system message to be passed separately.
        This method extracts the system message and passes it as a parameter.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Claude's response text

        Raises:
            Exception: If API call fails
        """
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens

        # Separate system message from conversation messages
        system_message = None
        conversation_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                conversation_messages.append(msg)

        try:
            # Build API call kwargs
            api_kwargs = {
                "model": self.model,
                "max_tokens": tokens,
                "temperature": temp,
                "messages": conversation_messages
            }

            # Add system message if present
            if system_message:
                api_kwargs["system"] = system_message

            response = await self.client.messages.create(**api_kwargs)
            return response.content[0].text
        except AuthenticationError as e:
            logger.error(f"Claude authentication failed: {e}")
            raise LLMAuthenticationError(
                "Anthropic APIキーが無効です。.env ファイルの ANTHROPIC_API_KEY を確認してください。"
            ) from e
        except (APIConnectionError, APITimeoutError) as e:
            logger.error(f"Claude connection error: {e}")
            raise LLMConnectionError(
                f"Claude APIに接続できません。ネットワーク接続を確認してください: {e}"
            ) from e
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise LLMResponseError(f"Claude API error: {str(e)}") from e
