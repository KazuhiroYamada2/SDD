"""
AWS Bedrock LLM Client Implementation

Provides integration with AWS Bedrock Runtime API to access Claude models.
Suitable for enterprise users already using AWS infrastructure.
"""

import json
import logging
from typing import List, Dict, Any, Optional

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

from .base import BaseLLMClient, Message

logger = logging.getLogger(__name__)


class BedrockClient(BaseLLMClient):
    """
    AWS Bedrock client for Claude models.

    Supports Claude 3 models via AWS Bedrock Runtime API.
    Requires AWS credentials configured via environment variables or IAM role.
    """

    def __init__(
        self,
        model: str = "anthropic.claude-3-5-sonnet-20241022-v2:0",
        region: str = "us-west-2",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        """
        Initialize Bedrock client.

        Args:
            model: Bedrock model ID (e.g., "anthropic.claude-3-5-sonnet-20241022-v2:0")
            region: AWS region (e.g., "us-west-2", "us-east-1")
            aws_access_key_id: AWS access key (optional, can use IAM role)
            aws_secret_access_key: AWS secret key (optional, can use IAM role)
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate

        Raises:
            ImportError: If boto3 is not installed
            ValueError: If credentials are invalid
        """
        if not BOTO3_AVAILABLE:
            raise ImportError(
                "boto3 is required for Bedrock integration. "
                "Install it with: pip install boto3"
            )

        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        # Create Bedrock Runtime client
        session_kwargs = {"region_name": region}
        if aws_access_key_id and aws_secret_access_key:
            session_kwargs["aws_access_key_id"] = aws_access_key_id
            session_kwargs["aws_secret_access_key"] = aws_secret_access_key

        try:
            session = boto3.Session(**session_kwargs)
            self.client = session.client("bedrock-runtime")
            logger.info(f"Bedrock client initialized with model: {model}, region: {region}")
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            raise ValueError(f"Failed to initialize Bedrock client: {e}")

    def _convert_messages(self, messages: List[Message]) -> List[Dict[str, str]]:
        """
        Convert internal Message format to Bedrock API format.

        Args:
            messages: List of Message objects

        Returns:
            List of message dicts for Bedrock API
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
        Send chat messages to Claude via Bedrock and get response.

        Args:
            messages: List of Message objects (system, user, assistant)
            temperature: Override default temperature
            max_tokens: Override default max_tokens

        Returns:
            Assistant's response text

        Raises:
            RuntimeError: If API call fails
        """
        # Separate system message from conversation messages
        system_message = ""
        conversation_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                conversation_messages.append(msg)

        # Build request body for Bedrock Claude API
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
            "messages": self._convert_messages(conversation_messages)
        }

        # Add system message if present
        if system_message:
            request_body["system"] = system_message

        try:
            # Invoke model via Bedrock Runtime API
            response = self.client.invoke_model(
                modelId=self.model,
                body=json.dumps(request_body),
                contentType="application/json",
                accept="application/json"
            )

            # Parse response
            response_body = json.loads(response["body"].read())

            # Extract text from response
            # Bedrock Claude API returns content as a list of content blocks
            content_blocks = response_body.get("content", [])
            if not content_blocks:
                logger.warning("Empty response from Bedrock API")
                return ""

            # Concatenate all text blocks
            text_content = []
            for block in content_blocks:
                if block.get("type") == "text":
                    text_content.append(block.get("text", ""))

            result = "".join(text_content)
            logger.debug(f"Bedrock response received: {len(result)} characters")
            return result

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            logger.error(f"Bedrock ClientError [{error_code}]: {error_message}")
            raise RuntimeError(f"Bedrock API error [{error_code}]: {error_message}")

        except BotoCoreError as e:
            logger.error(f"Bedrock BotoCoreError: {e}")
            raise RuntimeError(f"Bedrock connection error: {e}")

        except Exception as e:
            logger.error(f"Unexpected error during Bedrock API call: {e}")
            raise RuntimeError(f"Bedrock API call failed: {e}")

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
                cleaned_response = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned_response

            data = json.loads(cleaned_response)
            logger.debug(f"Successfully extracted structured data: {list(data.keys())}")
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from LLM response: {e}")
            logger.debug(f"Raw response: {response}")
            # Return empty dict as fallback
            return {field: None for field in schema.keys()}
