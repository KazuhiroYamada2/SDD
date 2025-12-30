"""Base abstract interface for LLM clients."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseLLMClient(ABC):
    """Abstract base class for LLM API clients."""

    def __init__(self, api_key: str, model: Optional[str] = None, temperature: float = 0.7):
        """
        Initialize the LLM client.

        Args:
            api_key: API key for the LLM provider
            model: Model name to use (provider-specific)
            temperature: Temperature for generation (0.0-2.0)
        """
        self.api_key = api_key
        self.model = model
        self.temperature = temperature

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send a chat request to the LLM and return the response.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate

        Returns:
            The LLM's response text

        Raises:
            Exception: If the API call fails
        """
        pass

    @abstractmethod
    def generate_question(
        self,
        system_prompt: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate the next interview question based on system prompt and context.

        Args:
            system_prompt: System prompt defining the LLM's role and task
            context: Dictionary containing conversation history and metadata

        Returns:
            The generated question text

        Raises:
            Exception: If question generation fails
        """
        pass

    @abstractmethod
    def extract_structured_data(
        self,
        conversation: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structured data from a conversation according to a schema.

        Args:
            conversation: The full conversation text
            schema: JSON schema describing the expected structure

        Returns:
            Dictionary containing the extracted structured data

        Raises:
            Exception: If extraction fails
        """
        pass

    def _build_context_prompt(
        self,
        system_prompt: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Build a prompt that includes system instructions and context.

        Args:
            system_prompt: The base system prompt
            context: Context dictionary with conversation history, etc.

        Returns:
            Complete prompt string
        """
        prompt_parts = [system_prompt]

        if "conversation_history" in context and context["conversation_history"]:
            prompt_parts.append("\n## 会話履歴:\n")
            prompt_parts.append(context["conversation_history"])

        if "missing_fields" in context and context["missing_fields"]:
            prompt_parts.append("\n## まだ収集が必要な情報:\n")
            for field in context["missing_fields"]:
                prompt_parts.append(f"- {field}\n")

        if "previous_phases" in context and context["previous_phases"]:
            prompt_parts.append("\n## 前フェーズの情報:\n")
            prompt_parts.append(str(context["previous_phases"]))

        return "".join(prompt_parts)

    def _format_messages(
        self,
        system_prompt: str,
        user_message: str
    ) -> List[Dict[str, str]]:
        """
        Format system prompt and user message into a messages list.

        Different LLM providers handle system messages differently.
        This method provides a default implementation.

        Args:
            system_prompt: System-level instructions
            user_message: User's message

        Returns:
            List of message dictionaries
        """
        # Default: combine system and user into a single user message
        combined_message = f"{system_prompt}\n\n{user_message}"
        return [{"role": "user", "content": combined_message}]
