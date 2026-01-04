"""
Unit tests for ContextManager
"""

import pytest
import json
from pathlib import Path

from sdd_generator.core.context_manager import ContextManager


@pytest.mark.unit
class TestContextManager:
    """Test ContextManager functionality."""

    def test_initialization(self, sample_project_name):
        """Test context manager initialization."""
        manager = ContextManager(sample_project_name)
        assert manager.project_name == sample_project_name
        assert manager.context == {}

    def test_add_qa_pair(self, context_manager):
        """Test adding Q&A pairs."""
        phase_num = 1
        question = "プロジェクトの目的は？"
        answer = "Webアプリ開発"

        context_manager.add_qa_pair(phase_num, question, answer)

        phase_context = context_manager.get_phase_context(phase_num)
        assert "qa_pairs" in phase_context
        assert len(phase_context["qa_pairs"]) == 1
        assert phase_context["qa_pairs"][0]["question"] == question
        assert phase_context["qa_pairs"][0]["answer"] == answer

    def test_add_multiple_qa_pairs(self, context_manager, sample_qa_pairs):
        """Test adding multiple Q&A pairs."""
        phase_num = 1

        for qa in sample_qa_pairs:
            context_manager.add_qa_pair(phase_num, qa["question"], qa["answer"])

        phase_context = context_manager.get_phase_context(phase_num)
        assert len(phase_context["qa_pairs"]) == len(sample_qa_pairs)

    def test_get_phase_context_empty(self, context_manager):
        """Test getting context for phase with no data."""
        phase_context = context_manager.get_phase_context(1)
        assert phase_context == {}

    def test_get_phase_context_with_data(self, context_manager):
        """Test getting context after adding data."""
        phase_num = 1
        context_manager.add_qa_pair(phase_num, "Q1", "A1")
        context_manager.add_qa_pair(phase_num, "Q2", "A2")

        phase_context = context_manager.get_phase_context(phase_num)
        assert "qa_pairs" in phase_context
        assert len(phase_context["qa_pairs"]) == 2

    def test_get_context_for_phase(self, context_manager):
        """Test getting context including previous phases."""
        # Add data to phase 1
        context_manager.add_qa_pair(1, "Phase 1 Q", "Phase 1 A")
        # Add data to phase 2
        context_manager.add_qa_pair(2, "Phase 2 Q", "Phase 2 A")

        # Get context for phase 2 (should include phase 1)
        context = context_manager.get_context_for_phase(2)
        assert 1 in context
        assert 2 in context
        assert len(context[1]["qa_pairs"]) == 1
        assert len(context[2]["qa_pairs"]) == 1

    def test_save_and_load(self, context_manager, sample_qa_pairs, temp_dir):
        """Test saving and loading context."""
        # Add data
        for qa in sample_qa_pairs:
            context_manager.add_qa_pair(1, qa["question"], qa["answer"])

        # Save
        state_file = temp_dir / "test_state.json"
        context_manager.save_to_disk(str(state_file))

        # Verify file exists
        assert state_file.exists()

        # Load into new manager
        new_manager = ContextManager("test-project")
        new_manager.load_from_disk(str(state_file))

        # Verify data
        phase_context = new_manager.get_phase_context(1)
        assert len(phase_context["qa_pairs"]) == len(sample_qa_pairs)

    def test_extract_structured_data(self, context_manager, mock_llm_client):
        """Test extracting structured data from conversation."""
        # Add sample Q&A pairs
        context_manager.add_qa_pair(1, "目的は？", "Webアプリ開発")
        context_manager.add_qa_pair(1, "背景は？", "既存システムの老朽化")

        # Extract data
        schema = {
            "project_name": "プロジェクト名",
            "background": "背景",
            "purposes": "目的"
        }

        data = context_manager.extract_structured_data(
            1, schema, mock_llm_client
        )

        # Verify LLM was called
        assert mock_llm_client.extract_structured_data.called
        assert "project_name" in data
        assert "background" in data

    def test_json_serialization(self, context_manager, temp_dir):
        """Test JSON serialization/deserialization."""
        # Add complex data
        context_manager.add_qa_pair(1, "Question", "Answer")
        context_manager.context[1]["metadata"] = {
            "nested": {"key": "value"},
            "list": [1, 2, 3]
        }

        # Save and load
        state_file = temp_dir / "complex_state.json"
        context_manager.save_to_disk(str(state_file))

        # Verify JSON is valid
        with open(state_file, 'r', encoding='utf-8') as f:
            loaded_data = json.load(f)

        assert "1" in loaded_data
        assert loaded_data["1"]["metadata"]["nested"]["key"] == "value"
