"""
Projects API Router

Endpoints for project management (CRUD operations).
"""

import logging
from pathlib import Path
from typing import List
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from sdd_generator.core.context_manager import ContextManager
from sdd_generator.core.phase_manager import PhaseManager
from ..models import (
    ProjectCreate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStatusResponse,
    PhaseInfo,
    PhaseStatus,
    ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
phase_manager = PhaseManager()


def _get_interview_state_dir() -> Path:
    """Get interview state directory."""
    return Path.cwd() / ".interview_state"


def _get_project_state_file(project_name: str) -> Path:
    """Get project state file path."""
    return _get_interview_state_dir() / f"{project_name}.json"


def _project_exists(project_name: str) -> bool:
    """Check if project exists."""
    return _get_project_state_file(project_name).exists()


def _load_project_context(project_name: str) -> ContextManager:
    """Load project context."""
    context = ContextManager(project_name)
    state_file = _get_project_state_file(project_name)
    if state_file.exists():
        # ContextManager manages its own storage path; no explicit file path needed.
        context.load_from_disk()
    return context


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """
    Create a new project.

    Initializes a new SDD project with the given name.
    """
    try:
        if _project_exists(project.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Project '{project.name}' already exists"
            )

        # Create context manager
        context = ContextManager(project.name)

        # Save initial state
        state_dir = _get_interview_state_dir()
        state_dir.mkdir(exist_ok=True)
        # ContextManager manages its own storage path; no explicit file path needed.
        context.save_to_disk()

        logger.info(f"Created new project: {project.name}")

        return ProjectResponse(
            name=project.name,
            description=project.description,
            current_phase=1,
            phase_status={i: PhaseStatus.NOT_STARTED for i in range(1, 8)},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            total_qa_pairs=0
        )

    except HTTPException:
        raise
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
        state_dir = _get_interview_state_dir()

        if not state_dir.exists():
            return ProjectListResponse(projects=[], total=0)

        projects = []
        for state_file in state_dir.glob("*.json"):
            try:
                project_name = state_file.stem
                context = _load_project_context(project_name)

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

                projects.append(ProjectResponse(
                    name=project_name,
                    description=None,
                    current_phase=current_phase,
                    phase_status=phase_status,
                    created_at=datetime.fromtimestamp(state_file.stat().st_ctime),
                    updated_at=datetime.fromtimestamp(state_file.stat().st_mtime),
                    total_qa_pairs=total_qa
                ))

            except Exception as e:
                logger.warning(f"Failed to load project {state_file.name}: {e}")
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


@router.get("/{project_name}", response_model=ProjectResponse)
async def get_project(project_name: str):
    """
    Get project details.

    Returns detailed information about a specific project.
    """
    try:
        if not _project_exists(project_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_name}' not found"
            )

        context = _load_project_context(project_name)

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

        state_file = _get_project_state_file(project_name)

        return ProjectResponse(
            name=project_name,
            description=None,
            current_phase=current_phase,
            phase_status=phase_status,
            created_at=datetime.fromtimestamp(state_file.stat().st_ctime),
            updated_at=datetime.fromtimestamp(state_file.stat().st_mtime),
            total_qa_pairs=total_qa
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project: {str(e)}"
        )


@router.get("/{project_name}/status", response_model=ProjectStatusResponse)
async def get_project_status(project_name: str):
    """
    Get detailed project status including all phases.

    Returns comprehensive status information for all 7 phases.
    """
    try:
        if not _project_exists(project_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_name}' not found"
            )

        context = _load_project_context(project_name)

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
            project_name=project_name,
            current_phase=current_phase,
            phases=phases,
            overall_progress=completed_phases / 7.0
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project status: {str(e)}"
        )


@router.delete("/{project_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_name: str):
    """
    Delete a project.

    Removes the project and all its associated data.
    """
    try:
        if not _project_exists(project_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_name}' not found"
            )

        # Delete state file
        state_file = _get_project_state_file(project_name)
        state_file.unlink()

        logger.info(f"Deleted project: {project_name}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )
