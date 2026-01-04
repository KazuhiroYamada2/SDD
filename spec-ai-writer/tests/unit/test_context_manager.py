"""
Unit tests for ContextManager
"""

import pytest
import json
from pathlib import Path

from spec_ai_writer.core.context_manager import ContextManager


@pytest.mark.unit
class TestContextManager:
    """Test ContextManager functionality."""

    def test_initialization(self, sample_project_name, temp_dir):
        """Test context manager initialization."""
        manager = ContextManager(sample_project_name, storage_path=str(temp_dir))
        assert manager.project_name == sample_project_name
        # Context now includes metadata fields
        assert "project_name" in manager.context
        assert "created_at" in manager.context
        assert "updated_at" in manager.context
        assert "current_phase" in manager.context
        assert "phases" in manager.context
        assert manager.context["project_name"] == sample_project_name
        assert manager.context["current_phase"] == 1
        assert manager.context["phases"] == {}

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

    def test_get_phase_context_empty(self, sample_project_name, temp_dir):
        """Test getting context for phase with no data."""
        # Create a fresh manager without any prior data
        manager = ContextManager(sample_project_name, storage_path=str(temp_dir / "empty"))
        phase_context = manager.get_phase_context(1)
        # get_phase_context now returns default structure if phase doesn't exist
        assert "qa_pairs" in phase_context
        assert phase_context["qa_pairs"] == []
        assert phase_context["structured_data"] is None
        assert phase_context["completed"] is False

    def test_get_phase_context_with_data(self, context_manager):
        """Test getting context after adding data."""
        phase_num = 1
        context_manager.add_qa_pair(phase_num, "Q1", "A1")
        context_manager.add_qa_pair(phase_num, "Q2", "A2")

        phase_context = context_manager.get_phase_context(phase_num)
        assert "qa_pairs" in phase_context
        assert len(phase_context["qa_pairs"]) == 2

    def test_get_context_for_phase(self, sample_project_name, temp_dir):
        """Test getting context including previous phases."""
        # Create a fresh manager for this test
        manager = ContextManager(sample_project_name, storage_path=str(temp_dir / "context_for_phase"))

        # Add data to phase 1
        manager.add_qa_pair(1, "Phase 1 Q", "Phase 1 A")
        # Add data to phase 2
        manager.add_qa_pair(2, "Phase 2 Q", "Phase 2 A")

        # Get context for phase 2 (should include phase 1 in previous_phases)
        context = manager.get_context_for_phase(2)
        assert "current_phase" in context
        assert context["current_phase"] == 2
        assert "current_qa" in context
        assert "previous_phases" in context
        assert 1 in context["previous_phases"]
        assert len(context["previous_phases"][1]["qa_pairs"]) == 1
        assert len(context["current_qa"]) == 1

    def test_save_and_load(self, sample_qa_pairs, temp_dir):
        """Test saving and loading context."""
        # Create a manager with temp storage
        manager = ContextManager("test-project", storage_path=str(temp_dir))

        # Add data
        for qa in sample_qa_pairs:
            manager.add_qa_pair(1, qa["question"], qa["answer"])

        # save_to_disk is called automatically in add_qa_pair
        # Verify file exists
        state_file = temp_dir / "test-project.json"
        assert state_file.exists()

        # Load into new manager (uses same project name and storage path)
        new_manager = ContextManager("test-project", storage_path=str(temp_dir))

        # Verify data
        phase_context = new_manager.get_phase_context(1)
        assert len(phase_context["qa_pairs"]) == len(sample_qa_pairs)

    def test_extract_structured_data(self, sample_project_name, temp_dir, mock_llm_client):
        """Test extracting structured data from conversation."""
        # Create a fresh manager for this test
        manager = ContextManager(sample_project_name, storage_path=str(temp_dir / "extract"))

        # Add sample Q&A pairs
        manager.add_qa_pair(1, "目的は？", "Webアプリ開発")
        manager.add_qa_pair(1, "背景は？", "既存システムの老朽化")

        # Extract data - note: signature is (phase_num, llm_client, schema)
        schema = {
            "project_name": "プロジェクト名",
            "background": "背景",
            "purposes": "目的"
        }

        data = manager.extract_structured_data(1, mock_llm_client, schema)

        # Verify LLM was called
        assert mock_llm_client.extract_structured_data.called
        assert "project_name" in data
        assert "background" in data

    def test_json_serialization(self, sample_project_name, temp_dir):
        """Test JSON serialization/deserialization."""
        # Create a fresh manager for this test
        manager = ContextManager(sample_project_name, storage_path=str(temp_dir / "serial"))

        # Add complex data
        manager.add_qa_pair(1, "Question", "Answer")
        # Access phases with string key (as that's how they're stored)
        manager.context["phases"]["1"]["metadata"] = {
            "nested": {"key": "value"},
            "list": [1, 2, 3]
        }
        manager.save_to_disk()

        # Verify JSON is valid
        state_file = temp_dir / "serial" / f"{sample_project_name}.json"
        with open(state_file, 'r', encoding='utf-8') as f:
            loaded_data = json.load(f)

        assert "phases" in loaded_data
        assert "1" in loaded_data["phases"]
        assert loaded_data["phases"]["1"]["metadata"]["nested"]["key"] == "value"
