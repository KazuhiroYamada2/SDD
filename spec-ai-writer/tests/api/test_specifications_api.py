"""
API tests for Specifications endpoints
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.api
class TestSpecificationsAPI:
    """Test Specifications API endpoints."""

    def test_list_specifications_project_not_found(self, test_client: TestClient):
        """Test listing specs for non-existent project (valid ID format, no data)."""
        response = test_client.get("/api/specs/00000000")
        assert response.status_code == 200

        data = response.json()
        assert data["project_id"] == "00000000"
        assert "specifications" in data
        # When specs directory doesn't exist, returns empty list
        assert len(data["specifications"]) == 0

    def test_list_specifications_structure(self, test_client: TestClient, sample_project_data: dict):
        """Test specification list structure."""
        # Create project
        create_response = test_client.post("/api/projects/", json=sample_project_data)
        project_id = create_response.json()["project_id"]

        response = test_client.get(f"/api/specs/{project_id}")
        assert response.status_code == 200

        data = response.json()
        assert "specifications" in data
        assert isinstance(data["specifications"], list)

    def test_get_specification_not_found(self, test_client: TestClient, sample_project_data: dict):
        """Test getting non-existent specification."""
        # Create project
        create_response = test_client.post("/api/projects/", json=sample_project_data)
        project_id = create_response.json()["project_id"]

        # Try to get spec for phase 1 (not generated yet)
        response = test_client.get(f"/api/specs/{project_id}/1")
        assert response.status_code == 404

    def test_get_specification_invalid_phase(self, test_client: TestClient, sample_project_data: dict):
        """Test getting spec with invalid phase number."""
        # Create project
        create_response = test_client.post("/api/projects/", json=sample_project_data)
        project_id = create_response.json()["project_id"]

        # Invalid phase numbers - now rejected by Path(ge=1, le=7) with 422
        response = test_client.get(f"/api/specs/{project_id}/0")
        assert response.status_code == 422

        response = test_client.get(f"/api/specs/{project_id}/8")
        assert response.status_code == 422

    def test_download_specification_not_found(self, test_client: TestClient, sample_project_data: dict):
        """Test downloading non-existent specification."""
        create_response = test_client.post("/api/projects/", json=sample_project_data)
        project_id = create_response.json()["project_id"]

        response = test_client.get(f"/api/specs/{project_id}/1/download")
        assert response.status_code == 404

    def test_download_all_specifications_not_found(self, test_client: TestClient):
        """Test downloading all specs for non-existent project (valid ID format, no data)."""
        response = test_client.get("/api/specs/00000000/download-all")
        # Should return 404 when no specs directory exists
        assert response.status_code == 404
