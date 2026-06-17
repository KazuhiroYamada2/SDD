"""
Unit tests for OpenAI Client
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from spec_ai_writer.llm.openai_client import OpenAIClient, GPT4_TURBO, GPT35_TURBO


@pytest.mark.unit
class TestOpenAIClient:
    """Test OpenAI client functionality."""

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    def test_initialization(self, mock_openai):
        """Test client initialization."""
        client = OpenAIClient(
            api_key="test-key",
            model=GPT4_TURBO,
            temperature=0.7
        )

        assert client.model == GPT4_TURBO
        assert client.temperature == 0.7
        assert client.max_tokens == 4096

    def test_initialization_without_api_key(self):
        """Test initialization without API key."""
        with pytest.raises(ValueError, match="API key is required"):
            OpenAIClient(api_key="")

    @patch('spec_ai_writer.llm.openai_client.OPENAI_AVAILABLE', False)
    def test_initialization_without_openai_package(self):
        """Test initialization when openai package is not installed."""
        with pytest.raises(ImportError, match="openai package is required"):
            OpenAIClient(api_key="test-key")

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_chat(self, mock_openai):
        """Test chat functionality."""
        # Setup mock
        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = "これはテスト応答です。"
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        # Create client and call chat
        client = OpenAIClient(api_key="test-key")
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "こんにちは"}
        ]

        response = await client.chat(messages)

        # Verify
        assert response == "これはテスト応答です。"
        mock_client_instance.chat.completions.create.assert_called_once()

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_chat_with_custom_temperature(self, mock_openai):
        """Test chat with custom temperature."""
        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = "Response"
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        messages = [{"role": "user", "content": "Test"}]

        await client.chat(messages, temperature=0.5)

        # Check that custom temperature was used
        call_args = mock_client_instance.chat.completions.create.call_args
        assert call_args.kwargs['temperature'] == 0.5

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_chat_empty_response(self, mock_openai):
        """Test chat with empty response."""
        mock_response = Mock()
        mock_response.choices = []

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        messages = [{"role": "user", "content": "Test"}]

        response = await client.chat(messages)
        assert response == ""

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_generate_question(self, mock_openai):
        """Test question generation."""
        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = "プロジェクトの目的は何ですか？"
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        question = await client.generate_question(
            system_prompt="You are an interviewer",
            context={"conversation_history": "", "missing_fields": [], "qa_count": 0}
        )

        assert "目的" in question

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_extract_structured_data(self, mock_openai):
        """Test structured data extraction."""
        json_response = '''
        {
            "project_name": "test-project",
            "background": "テスト背景",
            "purposes": ["目的1", "目的2"]
        }
        '''

        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = json_response
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        schema = {
            "project_name": "プロジェクト名",
            "background": "背景",
            "purposes": "目的"
        }

        data = await client.extract_structured_data(
            conversation="Q: 名前は? A: test-project",
            schema=schema
        )

        assert data["project_name"] == "test-project"
        assert data["background"] == "テスト背景"
        assert len(data["purposes"]) == 2

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_extract_structured_data_with_markdown(self, mock_openai):
        """Test structured data extraction with markdown code blocks."""
        json_response = '''```json
        {
            "project_name": "test-project"
        }
        ```'''

        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = json_response
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        schema = {"project_name": "Name"}

        data = await client.extract_structured_data("conversation", schema)
        assert data["project_name"] == "test-project"

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_extract_structured_data_invalid_json(self, mock_openai):
        """Test structured data extraction with invalid JSON."""
        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = "This is not JSON"
        mock_response.choices = [mock_choice]

        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        schema = {"field1": "Field 1", "field2": "Field 2"}

        data = await client.extract_structured_data("conversation", schema)
        # Should return empty dict as fallback
        assert data == {}

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    async def test_chat_api_error(self, mock_openai):
        """Test chat with API error."""
        mock_client_instance = Mock()
        mock_client_instance.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
        mock_openai.return_value = mock_client_instance

        client = OpenAIClient(api_key="test-key")
        messages = [{"role": "user", "content": "Test"}]

        from spec_ai_writer.llm.exceptions import LLMResponseError
        with pytest.raises(LLMResponseError, match="OpenAI API call failed"):
            await client.chat(messages)

    def test_model_constants(self):
        """Test that model constants are defined."""
        assert GPT4_TURBO == "gpt-4-turbo-preview"
        assert GPT35_TURBO == "gpt-3.5-turbo"

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    def test_base_url_passed_to_sdk(self, mock_openai):
        """Custom base_url should be forwarded to the OpenAI SDK constructor."""
        OpenAIClient(
            api_key="test-key",
            model="llama3.1:8b",
            base_url="http://localhost:11434/v1",
        )

        # The SDK should have been instantiated with base_url in kwargs.
        assert mock_openai.call_count == 1
        call_kwargs = mock_openai.call_args.kwargs
        assert call_kwargs["base_url"] == "http://localhost:11434/v1"
        assert call_kwargs["api_key"] == "test-key"

    @patch('spec_ai_writer.llm.openai_client.AsyncOpenAI')
    def test_no_base_url_omits_kwarg(self, mock_openai):
        """When base_url is not set the kwarg should not be passed at all.

        The official OpenAI endpoint is the SDK default, and passing
        ``base_url=None`` can surface as a subtle bug on older SDK versions.
        """
        OpenAIClient(api_key="test-key")

        call_kwargs = mock_openai.call_args.kwargs
        assert "base_url" not in call_kwargs
