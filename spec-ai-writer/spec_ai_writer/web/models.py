"""
Pydantic models for FastAPI Web UI

Request/response schemas for API endpoints.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class PhaseStatus(str, Enum):
    """Phase completion status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MessageRole(str, Enum):
    """Chat message role."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    """Chat message model."""
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ProjectCreate(BaseModel):
    """Request model for creating a new project."""
    display_name: str = Field(..., min_length=1, max_length=100, description="Project display name")
    description: Optional[str] = Field(None, max_length=500, description="Project description")
    llm_provider: Optional[str] = Field(None, description="LLM provider (claude, openai, bedrock)")


class ProjectResponse(BaseModel):
    """Response model for project information."""
    project_id: str
    display_name: str
    description: Optional[str]
    current_phase: int
    phase_status: Dict[int, PhaseStatus]
    created_at: datetime
    updated_at: datetime
    total_qa_pairs: int


class ProjectListResponse(BaseModel):
    """Response model for project list."""
    projects: List[ProjectResponse]
    total: int


class PhaseInfo(BaseModel):
    """Phase information model."""
    phase_num: int
    phase_name: str
    description: str
    status: PhaseStatus
    qa_count: int
    required_fields: List[str]
    filename: str


class InterviewStartRequest(BaseModel):
    """Request model for starting an interview."""
    project_id: str
    phase_num: Optional[int] = Field(None, description="Specific phase to start (default: next incomplete phase)")


class HistoryMessage(BaseModel):
    """A single message in reconstructed chat history."""
    role: str  # "assistant", "user", or "system"
    content: str
    timestamp: str


class InterviewStartResponse(BaseModel):
    """Response model for interview start."""
    project_id: str
    display_name: str
    phase_num: int
    phase_name: str
    initial_message: str
    all_complete: bool = False
    chat_history: List[HistoryMessage] = []


class UserAnswerRequest(BaseModel):
    """Request model for user answer."""
    project_id: str
    question: str
    answer: str


class AssistantQuestionResponse(BaseModel):
    """Response model for assistant question."""
    question: str
    phase_complete: bool = False
    phase_num: int
    qa_count: int


class SpecificationGenerateRequest(BaseModel):
    """Request model for generating specification."""
    project_id: str
    phase_num: int


class SpecificationResponse(BaseModel):
    """Response model for specification content."""
    project_id: str
    phase_num: int
    phase_name: str
    filename: str
    content: str
    generated_at: datetime


class SpecificationListResponse(BaseModel):
    """Response model for specification list."""
    project_id: str
    specifications: List[Dict[str, Any]]


class ProjectStatusResponse(BaseModel):
    """Response model for project status."""
    project_id: str
    current_phase: int
    phases: List[PhaseInfo]
    overall_progress: float  # 0.0 to 1.0


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None
    status_code: int
