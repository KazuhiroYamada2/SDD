"""
Unit tests for PhaseManager
"""

import pytest

from sdd_generator.core.phase_manager import PhaseManager


@pytest.mark.unit
class TestPhaseManager:
    """Test PhaseManager functionality."""

    def test_initialization(self):
        """Test phase manager initialization."""
        manager = PhaseManager()
        assert manager is not None
        assert len(manager.phases) == 7

    def test_get_phase_info_valid(self):
        """Test getting valid phase info."""
        manager = PhaseManager()

        for phase_num in range(1, 8):
            info = manager.get_phase_info(phase_num)
            assert info is not None
            assert info.phase_num == phase_num
            assert info.name
            assert info.description
            assert info.filename
            assert len(info.required_fields) > 0

    def test_get_phase_info_invalid(self):
        """Test getting invalid phase info."""
        manager = PhaseManager()

        with pytest.raises(ValueError, match="Invalid phase number"):
            manager.get_phase_info(0)

        with pytest.raises(ValueError, match="Invalid phase number"):
            manager.get_phase_info(8)

    def test_phase_1_info(self):
        """Test phase 1 specific info."""
        manager = PhaseManager()
        info = manager.get_phase_info(1)

        assert info.name == "原則定義"
        assert info.filename == "01-principle-definition.md"
        assert "background" in info.required_fields
        assert "principles" in info.required_fields
        assert "scope" in info.required_fields

    def test_phase_dependencies(self):
        """Test phase dependencies."""
        manager = PhaseManager()

        # Phase 1 has no dependencies
        deps_1 = manager.get_dependencies(1)
        assert deps_1 == []

        # Phase 2 depends on phase 1
        deps_2 = manager.get_dependencies(2)
        assert 1 in deps_2

        # Phase 7 depends on all previous phases
        deps_7 = manager.get_dependencies(7)
        assert len(deps_7) == 6
        assert all(i in deps_7 for i in range(1, 7))

    def test_validate_phase_completion_empty(self):
        """Test validation with empty context."""
        manager = PhaseManager()
        phase_context = {}

        is_valid = manager.validate_phase_completion(1, phase_context)
        assert is_valid is False

    def test_validate_phase_completion_insufficient_qa(self):
        """Test validation with insufficient Q&A pairs."""
        manager = PhaseManager()
        phase_context = {
            "qa_pairs": [
                {"question": "Q1", "answer": "A1"},
                {"question": "Q2", "answer": "A2"}
            ]
        }

        # Need at least 5 Q&A pairs
        is_valid = manager.validate_phase_completion(1, phase_context)
        assert is_valid is False

    def test_validate_phase_completion_sufficient_qa(self):
        """Test validation with sufficient Q&A pairs."""
        manager = PhaseManager()
        phase_context = {
            "qa_pairs": [
                {"question": f"Q{i}", "answer": f"A{i}"}
                for i in range(1, 6)
            ]
        }

        # 5 Q&A pairs should be valid
        is_valid = manager.validate_phase_completion(1, phase_context)
        assert is_valid is True

    def test_get_schema_for_phase(self):
        """Test getting schema for each phase."""
        manager = PhaseManager()

        for phase_num in range(1, 8):
            schema = manager.get_schema_for_phase(phase_num)
            assert isinstance(schema, dict)
            assert len(schema) > 0

            # Verify schema has descriptions
            for field, description in schema.items():
                assert isinstance(field, str)
                assert isinstance(description, str)
                assert len(description) > 0

    def test_all_phases_have_unique_filenames(self):
        """Test that all phases have unique filenames."""
        manager = PhaseManager()
        filenames = set()

        for phase_num in range(1, 8):
            info = manager.get_phase_info(phase_num)
            assert info.filename not in filenames
            filenames.add(info.filename)

        assert len(filenames) == 7

    def test_required_fields_not_empty(self):
        """Test that all phases have required fields."""
        manager = PhaseManager()

        for phase_num in range(1, 8):
            info = manager.get_phase_info(phase_num)
            assert len(info.required_fields) > 0
            # All required fields should be non-empty strings
            for field in info.required_fields:
                assert isinstance(field, str)
                assert len(field) > 0
