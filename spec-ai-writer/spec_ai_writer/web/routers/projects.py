"""
Projects API Router

Endpoints for project management (CRUD operations).
"""

import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Body, HTTPException, Path, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.phase_manager import PhaseManager
from ..models import (
    ProjectCreate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStatusResponse,
    ProjectUpdateRequest,
    PhaseInfo,
    PhaseStatus,
    ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
phase_manager = PhaseManager()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """
    Create a new project.

    Initializes a new SDD project with the given display name.
    A unique project_id is auto-generated.
    """
    try:
        # Create project with auto-generated ID
        context = ContextManager.create_project(
            display_name=project.display_name,
            data_dir=settings.data_dir,
            description=project.description or ""
        )

        logger.info(f"Created new project: {context.project_id} ({project.display_name})")

        return ProjectResponse(
            project_id=context.project_id,
            display_name=project.display_name,
            description=project.description,
            current_phase=1,
            phase_status={i: PhaseStatus.NOT_STARTED for i in range(1, 8)},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            total_qa_pairs=0
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


@router.get("/", response_model=ProjectListResponse)
async def list_projects():
    """
    List all projects.

    Returns a list of all SDD projects with their current status.
    """
    try:
        project_list = ContextManager.list_projects(data_dir=settings.data_dir)

        if not project_list:
            return ProjectListResponse(projects=[], total=0)

        projects = []
        for proj_meta in project_list:
            try:
                project_id = proj_meta["project_id"]
                context = ContextManager.load_project(project_id, data_dir=settings.data_dir)

                # Determine phase status
                phase_status = {}
                for i in range(1, 8):
                    phase_context = context.get_phase_context(i)
                    if not phase_context.get("qa_pairs"):
                        phase_status[i] = PhaseStatus.NOT_STARTED
                    elif phase_manager.validate_phase_completion(i, phase_context):
                        phase_status[i] = PhaseStatus.COMPLETED
                    else:
                        phase_status[i] = PhaseStatus.IN_PROGRESS

                # Find current phase
                current_phase = 1
                for i in range(1, 8):
                    if phase_status[i] != PhaseStatus.COMPLETED:
                        current_phase = i
                        break
                else:
                    current_phase = 7  # All complete

                # Count total Q&A pairs
                total_qa = sum(
                    len(context.get_phase_context(i).get("qa_pairs", []))
                    for i in range(1, 8)
                )

                # Parse dates from metadata
                created_at = datetime.fromisoformat(proj_meta.get("created_at", datetime.now().isoformat()))
                updated_at = datetime.fromisoformat(proj_meta.get("updated_at", datetime.now().isoformat()))

                projects.append(ProjectResponse(
                    project_id=project_id,
                    display_name=proj_meta.get("display_name", ""),
                    description=proj_meta.get("description", ""),
                    current_phase=current_phase,
                    phase_status=phase_status,
                    created_at=created_at,
                    updated_at=updated_at,
                    total_qa_pairs=total_qa
                ))

            except Exception as e:
                logger.warning(f"Failed to load project {proj_meta.get('project_id', 'unknown')}: {e}")
                continue

        return ProjectListResponse(
            projects=sorted(projects, key=lambda p: p.updated_at, reverse=True),
            total=len(projects)
        )

    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list projects: {str(e)}"
        )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str = Path(pattern=r'^[a-f0-9]{8}$')):
    """
    Get project details.

    Returns detailed information about a specific project.
    """
    try:
        context = ContextManager.load_project(project_id, data_dir=settings.data_dir)

        # Determine phase status
        phase_status = {}
        for i in range(1, 8):
            phase_context = context.get_phase_context(i)
            if not phase_context.get("qa_pairs"):
                phase_status[i] = PhaseStatus.NOT_STARTED
            elif phase_manager.validate_phase_completion(i, phase_context):
                phase_status[i] = PhaseStatus.COMPLETED
            else:
                phase_status[i] = PhaseStatus.IN_PROGRESS

        # Find current phase
        current_phase = 1
        for i in range(1, 8):
            if phase_status[i] != PhaseStatus.COMPLETED:
                current_phase = i
                break
        else:
            current_phase = 7

        # Count total Q&A pairs
        total_qa = sum(
            len(context.get_phase_context(i).get("qa_pairs", []))
            for i in range(1, 8)
        )

        return ProjectResponse(
            project_id=project_id,
            display_name=context.display_name,
            description=context.description,
            current_phase=current_phase,
            phase_status=phase_status,
            created_at=datetime.fromisoformat(context.context.get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(context.context.get("updated_at", datetime.now().isoformat())),
            total_qa_pairs=total_qa
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project: {str(e)}"
        )


@router.get("/{project_id}/status", response_model=ProjectStatusResponse)
async def get_project_status(project_id: str = Path(pattern=r'^[a-f0-9]{8}$')):
    """
    Get detailed project status including all phases.

    Returns comprehensive status information for all 7 phases.
    """
    try:
        context = ContextManager.load_project(project_id, data_dir=settings.data_dir)

        phases = []
        completed_phases = 0

        for i in range(1, 8):
            phase_info = phase_manager.get_phase_info(i)
            phase_context = context.get_phase_context(i)
            qa_pairs = phase_context.get("qa_pairs", [])

            # Determine status
            if not qa_pairs:
                status_val = PhaseStatus.NOT_STARTED
            elif phase_manager.validate_phase_completion(i, phase_context):
                status_val = PhaseStatus.COMPLETED
                completed_phases += 1
            else:
                status_val = PhaseStatus.IN_PROGRESS

            phases.append(PhaseInfo(
                phase_num=i,
                phase_name=phase_info.name,
                description=phase_info.description,
                status=status_val,
                qa_count=len(qa_pairs),
                required_fields=phase_info.required_fields,
                filename=phase_info.filename
            ))

        # Find current phase
        current_phase = 1
        for phase in phases:
            if phase.status != PhaseStatus.COMPLETED:
                current_phase = phase.phase_num
                break
        else:
            current_phase = 7

        return ProjectStatusResponse(
            project_id=project_id,
            current_phase=current_phase,
            phases=phases,
            overall_progress=completed_phases / 7.0
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project status: {str(e)}"
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str = Path(pattern=r'^[a-f0-9]{8}$')):
    """
    Delete a project.

    Removes the project and all its associated data.
    """
    try:
        context = ContextManager.load_project(project_id, data_dir=settings.data_dir)
        context.delete_project()

        logger.info(f"Deleted project: {project_id}")

        return None

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str = Path(pattern=r'^[a-f0-9]{8}$'), update: ProjectUpdateRequest = Body(...)):
    """
    Update project metadata (display_name and/or description).
    """
    try:
        context = ContextManager.load_project(project_id, data_dir=settings.data_dir)

        # Read current project.json
        project_json_path = context.get_project_dir() / "project.json"
        with open(project_json_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        # Apply updates
        if update.display_name is not None:
            metadata["display_name"] = update.display_name
        if update.description is not None:
            metadata["description"] = update.description
        metadata["updated_at"] = datetime.now().isoformat()

        # Save updated project.json
        with open(project_json_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        # Reload context to reflect changes
        context = ContextManager.load_project(project_id, data_dir=settings.data_dir)

        # Determine phase status
        phase_status = {}
        for i in range(1, 8):
            phase_context = context.get_phase_context(i)
            if not phase_context.get("qa_pairs"):
                phase_status[i] = PhaseStatus.NOT_STARTED
            elif phase_manager.validate_phase_completion(i, phase_context):
                phase_status[i] = PhaseStatus.COMPLETED
            else:
                phase_status[i] = PhaseStatus.IN_PROGRESS

        # Find current phase
        current_phase = 1
        for i in range(1, 8):
            if phase_status[i] != PhaseStatus.COMPLETED:
                current_phase = i
                break
        else:
            current_phase = 7

        # Count total Q&A pairs
        total_qa = sum(
            len(context.get_phase_context(i).get("qa_pairs", []))
            for i in range(1, 8)
        )

        return ProjectResponse(
            project_id=project_id,
            display_name=context.display_name,
            description=context.description,
            current_phase=current_phase,
            phase_status=phase_status,
            created_at=datetime.fromisoformat(context.context.get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(context.context.get("updated_at", datetime.now().isoformat())),
            total_qa_pairs=total_qa
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )
