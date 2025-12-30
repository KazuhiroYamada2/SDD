"""
API tests for Specifications endpoints
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.api
class TestSpecificationsAPI:
    """Test Specifications API endpoints."""

    def test_list_specifications_project_not_found(self, test_client: TestClient):
        """Test listing specs for non-existent project."""
        response = test_client.get("/api/specs/nonexistent-project")
        assert response.status_code == 200

        data = response.json()
        assert data["project_name"] == "nonexistent-project"
        assert "specifications" in data
        # Should return template list even if project doesn't exist
        assert len(data["specifications"]) == 7

    def test_list_specifications_structure(self, test_client: TestClient, sample_project_data: dict):
        """Test specification list structure."""
        # Create project
        test_client.post("/api/projects/", json=sample_project_data)

        response = test_client.get(f"/api/specs/{sample_project_data['name']}")
        assert response.status_code == 200

        data = response.json()
        assert "specifications" in data
        assert len(data["specifications"]) == 7

        # Check first spec structure
        spec = data["specifications"][0]
        assert "phase_num" in spec
        assert "phase_name" in spec
        assert "filename" in spec
        assert "exists" in spec

    def test_get_specification_not_found(self, test_client: TestClient, sample_project_data: dict):
        """Test getting non-existent specification."""
        # Create project
        test_client.post("/api/projects/", json=sample_project_data)

        # Try to get spec for phase 1 (not generated yet)
        response = test_client.get(f"/api/specs/{sample_project_data['name']}/1")
        assert response.status_code == 404

    def test_get_specification_invalid_phase(self, test_client: TestClient, sample_project_data: dict):
        """Test getting spec with invalid phase number."""
        # Create project
        test_client.post("/api/projects/", json=sample_project_data)

        # Invalid phase numbers
        response = test_client.get(f"/api/specs/{sample_project_data['name']}/0")
        assert response.status_code == 400

        response = test_client.get(f"/api/specs/{sample_project_data['name']}/8")
        assert response.status_code == 400

    def test_download_specification_not_found(self, test_client: TestClient, sample_project_data: dict):
        """Test downloading non-existent specification."""
        test_client.post("/api/projects/", json=sample_project_data)

        response = test_client.get(f"/api/specs/{sample_project_data['name']}/1/download")
        assert response.status_code == 404

    def test_download_all_specifications_not_found(self, test_client: TestClient):
        """Test downloading all specs for non-existent project."""
        response = test_client.get("/api/specs/nonexistent-project/download-all")
        assert response.status_code == 404
