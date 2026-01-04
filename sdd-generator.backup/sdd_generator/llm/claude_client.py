"""Claude API client implementation."""

from typing import Dict, List, Optional

from anthropic import Anthropic

from .base import BaseLLMClient


class ClaudeClient(BaseLLMClient):
    """Client for Anthropic's Claude API."""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7
    ):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key
            model: Claude model name
            temperature: Generation temperature
        """
        super().__init__(api_key, model, temperature)
        self.client = Anthropic(api_key=api_key)

    def chat(
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
        tokens = max_tokens if max_tokens is not None else 4096

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

            response = self.client.messages.create(**api_kwargs)
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")
