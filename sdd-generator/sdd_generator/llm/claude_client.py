"""Claude API client implementation."""

import json
from typing import Any, Dict, List, Optional

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

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=tokens,
                temperature=temp,
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")

    def generate_question(
        self,
        system_prompt: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate the next interview question.

        Args:
            system_prompt: System prompt for the interviewer role
            context: Context including conversation history

        Returns:
            The generated question
        """
        prompt = self._build_context_prompt(system_prompt, context)

        messages = [
            {
                "role": "user",
                "content": prompt + "\n\n次の質問を1つだけ生成してください。質問のみを出力し、説明や前置きは不要です。"
            }
        ]

        return self.chat(messages)

    def extract_structured_data(
        self,
        conversation: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structured data from conversation using Claude.

        Args:
            conversation: Full conversation text
            schema: Expected data structure

        Returns:
            Extracted structured data
        """
        schema_str = json.dumps(schema, ensure_ascii=False, indent=2)

        prompt = f"""以下の会話から、指定されたスキーマに従って情報を抽出してJSON形式で出力してください。

会話:
{conversation}

期待されるスキーマ:
{schema_str}

注意:
- JSON形式のみを出力してください（説明や前置きは不要）
- スキーマに従って正確に抽出してください
- 情報が不足している場合は、該当フィールドをnullにしてください
"""

        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, temperature=0.3)

        try:
            # Extract JSON from response (in case there's extra text)
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                return json.loads(response)
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse extracted data as JSON: {str(e)}\nResponse: {response}")

    def _format_messages(
        self,
        system_prompt: str,
        user_message: str
    ) -> List[Dict[str, str]]:
        """
        Format messages for Claude API.

        Claude handles system prompts differently - we combine them with user message.

        Args:
            system_prompt: System instructions
            user_message: User's message

        Returns:
            Formatted messages list
        """
        combined = f"{system_prompt}\n\n{user_message}"
        return [{"role": "user", "content": combined}]
