"""
Unit tests for PhaseManager
"""

import pytest

from spec_ai_writer.core.phase_manager import PhaseManager


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
            assert info.number == phase_num  # Changed from phase_num to number
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
        # "scope" was split into "in_scope" and "out_scope"
        assert "in_scope" in info.required_fields
        assert "out_scope" in info.required_fields

    def test_phase_dependencies(self):
        """Test phase dependencies."""
        manager = PhaseManager()

        # Phase 1 has no dependencies
        deps_1 = manager.get_dependencies(1)
        assert deps_1 == []

        # Phase 2 depends on phase 1
        deps_2 = manager.get_dependencies(2)
        assert 1 in deps_2

        # Phase 7 depends only on phase 6 (not all previous phases)
        deps_7 = manager.get_dependencies(7)
        assert len(deps_7) == 1
        assert 6 in deps_7

    def test_validate_phase_completion_empty(self):
        """Test validation with empty context."""
        manager = PhaseManager()
        phase_context = {}

        # validate_phase_completion now returns (is_valid, missing_fields) tuple
        is_valid, missing_fields = manager.validate_phase_completion(1, phase_context)
        assert is_valid is False
        assert len(missing_fields) > 0

    def test_validate_phase_completion_insufficient_data(self):
        """Test validation with insufficient data."""
        manager = PhaseManager()
        # This context is missing required fields
        phase_context = {
            "background": "Test background"
        }

        is_valid, missing_fields = manager.validate_phase_completion(1, phase_context)
        assert is_valid is False
        assert len(missing_fields) > 0

    def test_validate_phase_completion_complete_data(self):
        """Test validation with all required fields."""
        manager = PhaseManager()
        # Provide all required fields for phase 1
        phase_context = {
            "background": "Test background",
            "purposes": ["Purpose 1"],
            "principles": ["Principle 1"],
            "in_scope": ["In scope item"],
            "out_scope": ["Out scope item"],
            "constraints": {"time": "2 weeks"},
            "stakeholders": ["User"],
            "success_criteria": "All tests pass"
        }

        is_valid, missing_fields = manager.validate_phase_completion(1, phase_context)
        assert is_valid is True
        assert missing_fields == []

    def test_get_schema_for_phase(self):
        """Test getting schema for each phase."""
        manager = PhaseManager()

        for phase_num in range(1, 8):
            schema = manager.get_schema_for_phase(phase_num)
            assert isinstance(schema, dict)
            assert len(schema) > 0

            # Schema now returns JSON schema format with type, properties, required
            assert "type" in schema
            assert schema["type"] == "object"
            assert "properties" in schema
            assert "required" in schema
            assert len(schema["properties"]) > 0

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
