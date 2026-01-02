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

from .base import BaseLLMClient

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

        # Note: Bedrock doesn't use api_key, so we pass empty string
        super().__init__("", model, temperature)
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

    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Convert standard message format to Bedrock API format.

        Bedrock API requires content to be a list of content blocks.

        Args:
            messages: List of message dicts with 'role' and 'content' keys

        Returns:
            List of message dicts for Bedrock API
        """
        return [
            {
                "role": msg["role"],
                "content": [{"type": "text", "text": msg["content"]}]
            }
            for msg in messages
        ]

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send chat messages to Claude via Bedrock and get response.

        Bedrock API requires system message to be passed in a separate field,
        and content must be a list of content blocks.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
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
            if msg["role"] == "system":
                system_message = msg["content"]
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
