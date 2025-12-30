"""
Specifications API Router

Endpoints for viewing and managing generated specifications.
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, PlainTextResponse

from config.settings import get_settings
from sdd_generator.core.phase_manager import PhaseManager
from ..models import (
    SpecificationResponse,
    SpecificationListResponse,
    SpecificationGenerateRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
phase_manager = PhaseManager()


def _get_output_dir(project_name: str) -> Path:
    """Get output directory for project."""
    return Path(settings.output_dir) / project_name


def _get_spec_file(project_name: str, filename: str) -> Path:
    """Get specification file path."""
    return _get_output_dir(project_name) / filename


@router.get("/{project_name}", response_model=SpecificationListResponse)
async def list_specifications(project_name: str):
    """
    List all generated specifications for a project.

    Returns a list of all specification files with their metadata.
    """
    try:
        output_dir = _get_output_dir(project_name)

        if not output_dir.exists():
            return SpecificationListResponse(
                project_name=project_name,
                specifications=[]
            )

        specifications = []

        for i in range(1, 8):
            phase_info = phase_manager.get_phase_info(i)
            spec_file = output_dir / phase_info.filename

            if spec_file.exists():
                specifications.append({
                    "phase_num": i,
                    "phase_name": phase_info.name,
                    "filename": phase_info.filename,
                    "file_size": spec_file.stat().st_size,
                    "generated_at": datetime.fromtimestamp(spec_file.stat().st_mtime).isoformat(),
                    "exists": True
                })
            else:
                specifications.append({
                    "phase_num": i,
                    "phase_name": phase_info.name,
                    "filename": phase_info.filename,
                    "exists": False
                })

        return SpecificationListResponse(
            project_name=project_name,
            specifications=specifications
        )

    except Exception as e:
        logger.error(f"Failed to list specifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list specifications: {str(e)}"
        )


@router.get("/{project_name}/{phase_num}", response_model=SpecificationResponse)
async def get_specification(project_name: str, phase_num: int):
    """
    Get a specific specification by phase number.

    Returns the content of the specification file.
    """
    try:
        if phase_num < 1 or phase_num > 7:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid phase number: {phase_num}. Must be between 1 and 7."
            )

        phase_info = phase_manager.get_phase_info(phase_num)
        spec_file = _get_spec_file(project_name, phase_info.filename)

        if not spec_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Specification for phase {phase_num} not found"
            )

        # Read file content
        content = spec_file.read_text(encoding="utf-8")

        return SpecificationResponse(
            project_name=project_name,
            phase_num=phase_num,
            phase_name=phase_info.name,
            filename=phase_info.filename,
            content=content,
            generated_at=datetime.fromtimestamp(spec_file.stat().st_mtime)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get specification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get specification: {str(e)}"
        )


@router.get("/{project_name}/{phase_num}/download")
async def download_specification(project_name: str, phase_num: int):
    """
    Download a specification file.

    Returns the specification as a downloadable Markdown file.
    """
    try:
        if phase_num < 1 or phase_num > 7:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid phase number: {phase_num}. Must be between 1 and 7."
            )

        phase_info = phase_manager.get_phase_info(phase_num)
        spec_file = _get_spec_file(project_name, phase_info.filename)

        if not spec_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Specification for phase {phase_num} not found"
            )

        return FileResponse(
            path=str(spec_file),
            media_type="text/markdown",
            filename=phase_info.filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download specification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download specification: {str(e)}"
        )


@router.get("/{project_name}/download-all")
async def download_all_specifications(project_name: str):
    """
    Download all specifications as a ZIP file.

    Returns a ZIP archive containing all generated specification files.
    """
    import io
    import zipfile
    from fastapi.responses import StreamingResponse

    try:
        output_dir = _get_output_dir(project_name)

        if not output_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No specifications found for project '{project_name}'"
            )

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            spec_count = 0

            for i in range(1, 8):
                phase_info = phase_manager.get_phase_info(i)
                spec_file = output_dir / phase_info.filename

                if spec_file.exists():
                    zip_file.write(spec_file, arcname=phase_info.filename)
                    spec_count += 1

            if spec_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No specifications found for project '{project_name}'"
                )

        zip_buffer.seek(0)

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={project_name}_specifications.zip"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download all specifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download all specifications: {str(e)}"
        )
