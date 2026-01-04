"""
Pytest configuration and fixtures for SDD Generator tests
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Generator
from unittest.mock import Mock

from fastapi.testclient import TestClient

from spec_ai_writer.web.app import app
from spec_ai_writer.llm.base import BaseLLMClient
from spec_ai_writer.core.context_manager import ContextManager
from config.settings import Settings


@pytest.fixture
def test_settings() -> Settings:
    """Test settings with mock values."""
    return Settings(
        anthropic_api_key="test-key",
        openai_api_key="test-key",
        aws_access_key_id="test-key",
        aws_secret_access_key="test-key",
        aws_region="us-west-2",
        default_llm_provider="claude",
        output_dir="./test_output",
        auto_git_commit=False,
        temperature=0.7
    )


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for tests."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    # Cleanup
    if temp_path.exists():
        shutil.rmtree(temp_path)


@pytest.fixture
def mock_llm_client() -> Mock:
    """Mock LLM client for testing."""
    mock_client = Mock(spec=BaseLLMClient)

    # Mock chat responses
    mock_client.chat.return_value = "これはテスト用の質問です。プロジェクトの目的は何ですか？"

    # Mock question generation
    mock_client.generate_question.return_value = "次の質問です。予算はどれくらいですか？"

    # Mock data extraction
    mock_client.extract_structured_data.return_value = {
        "project_name": "test-project",
        "background": "テストプロジェクト",
        "purposes": ["目的1", "目的2"]
    }

    return mock_client


@pytest.fixture
def test_client() -> TestClient:
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_project_name() -> str:
    """Sample project name for testing."""
    return "test-project"


@pytest.fixture
def context_manager(sample_project_name: str, temp_dir: Path) -> ContextManager:
    """Context manager with temporary storage."""
    manager = ContextManager(sample_project_name)
    # Override state file path to use temp directory
    manager.state_file = temp_dir / f"{sample_project_name}.json"
    return manager


@pytest.fixture
def sample_qa_pairs() -> list:
    """Sample Q&A pairs for testing."""
    return [
        {
            "question": "プロジェクトの目的は何ですか？",
            "answer": "新しいWebアプリケーションを開発する"
        },
        {
            "question": "対象ユーザーは誰ですか？",
            "answer": "一般ユーザーと管理者"
        },
        {
            "question": "予算はどれくらいですか？",
            "answer": "約500万円"
        }
    ]


@pytest.fixture
def sample_project_data() -> dict:
    """Sample project data for API testing."""
    return {
        "name": "test-project",
        "description": "テストプロジェクトの説明"
    }
