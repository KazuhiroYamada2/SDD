"""
Pytest configuration and fixtures for spec-ai-writer tests
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Generator
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient

from spec_ai_writer.web.app import app
from spec_ai_writer.llm.base import BaseLLMClient
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.config.settings import Settings


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
        data_dir="./test_data",
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
def mock_llm_client() -> AsyncMock:
    """Mock LLM client for testing."""
    mock_client = AsyncMock(spec=BaseLLMClient)

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
def test_client(tmp_path, monkeypatch) -> TestClient:
    """FastAPI test client with isolated data directory."""
    from spec_ai_writer.config.settings import get_settings, reload_settings
    # Use a temp directory for data_dir during API tests
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    reload_settings()
    client = TestClient(app)
    yield client
    reload_settings()


@pytest.fixture
def sample_project_id() -> str:
    """Sample project ID for testing."""
    return "testproj"


@pytest.fixture
def context_manager(sample_project_id: str, temp_dir: Path) -> ContextManager:
    """Context manager with temporary storage."""
    data_dir = str(temp_dir / "data")
    manager = ContextManager(sample_project_id, display_name="test-project", data_dir=data_dir)
    # Create project directory structure
    manager.get_project_dir().mkdir(parents=True, exist_ok=True)
    manager.get_specs_dir().mkdir(parents=True, exist_ok=True)
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
        "display_name": "test-project",
    }
