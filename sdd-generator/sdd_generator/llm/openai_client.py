"""
OpenAI LLM Client Implementation

Provides integration with OpenAI API (GPT-4, GPT-3.5-turbo).
"""

import json
import logging
from typing import List, Dict, Any, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from .base import BaseLLMClient, Message

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
        max_tokens: int = 4096
    ):
        """
        Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            model: Model name (gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo, etc.)
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate

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

        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        try:
            self.client = OpenAI(api_key=api_key)
            logger.info(f"OpenAI client initialized with model: {model}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise ValueError(f"Failed to initialize OpenAI client: {e}")

    def _convert_messages(self, messages: List[Message]) -> List[Dict[str, str]]:
        """
        Convert internal Message format to OpenAI API format.

        Args:
            messages: List of Message objects

        Returns:
            List of message dicts for OpenAI API
        """
        return [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in messages
        ]

    def chat(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send chat messages to OpenAI and get response.

        Args:
            messages: List of Message objects (system, user, assistant)
            temperature: Override default temperature
            max_tokens: Override default max_tokens

        Returns:
            Assistant's response text

        Raises:
            RuntimeError: If API call fails
        """
        try:
            # Convert messages to OpenAI format
            openai_messages = self._convert_messages(messages)

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )

            # Extract response text
            if not response.choices:
                logger.warning("Empty response from OpenAI API")
                return ""

            result = response.choices[0].message.content or ""
            logger.debug(f"OpenAI response received: {len(result)} characters")

            return result

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise RuntimeError(f"OpenAI API call failed: {e}")

    def generate_question(
        self,
        system_prompt: str,
        context: str,
        temperature: Optional[float] = None
    ) -> str:
        """
        Generate next interview question based on context.

        Args:
            system_prompt: System instructions for question generation
            context: Current conversation context
            temperature: Override default temperature

        Returns:
            Generated question text
        """
        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=context)
        ]

        return self.chat(messages, temperature=temperature)

    def extract_structured_data(
        self,
        conversation: str,
        schema: Dict[str, Any],
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Extract structured data from conversation using LLM.

        Args:
            conversation: Full conversation text
            schema: Expected data schema (field names and descriptions)
            temperature: Override default temperature (lower for more deterministic)

        Returns:
            Extracted structured data as dictionary
        """
        # Build extraction prompt
        schema_description = "\n".join([
            f"- {field}: {desc}"
            for field, desc in schema.items()
        ])

        system_prompt = """あなたは会話から構造化データを抽出する専門家です。
与えられた会話から、指定されたスキーマに従ってデータを抽出し、JSON形式で返してください。

重要な指示:
1. 会話に明示的に含まれていない情報は推測しないでください
2. リストや配列が適切な場合は配列として返してください
3. 情報が欠けている場合は null を使用してください
4. JSON形式で返してください（マークダウンのコードブロックは不要）
"""

        user_prompt = f"""以下の会話から、次のスキーマに従ってデータを抽出してください:

{schema_description}

会話:
{conversation}

JSON形式で抽出したデータを返してください:"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]

        # Use lower temperature for more consistent extraction
        response = self.chat(messages, temperature=temperature or 0.3)

        # Parse JSON response
        try:
            # Remove potential markdown code blocks
            cleaned_response = response.strip()
            if cleaned_response.startswith("```"):
                # Extract content between code fences
                lines = cleaned_response.split("\n")
                # Skip first line (```json) and last line (```)
                if len(lines) > 2:
                    cleaned_response = "\n".join(lines[1:-1])

            data = json.loads(cleaned_response)
            logger.debug(f"Successfully extracted structured data: {list(data.keys())}")
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from LLM response: {e}")
            logger.debug(f"Raw response: {response}")
            # Return empty dict as fallback
            return {field: None for field in schema.keys()}


# Commonly used models
GPT4_TURBO = "gpt-4-turbo-preview"
GPT4 = "gpt-4"
GPT4_32K = "gpt-4-32k"
GPT35_TURBO = "gpt-3.5-turbo"
GPT35_TURBO_16K = "gpt-3.5-turbo-16k"
