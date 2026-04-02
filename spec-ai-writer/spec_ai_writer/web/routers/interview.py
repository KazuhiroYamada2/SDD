"""
Interview API Router

Endpoints for conducting interviews via REST.
"""

import logging
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from spec_ai_writer.core.interview_engine import InterviewEngine
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.phase_manager import PhaseManager
from spec_ai_writer.llm.factory import LLMFactory
from spec_ai_writer.llm.exceptions import (
    LLMAuthenticationError,
    LLMConnectionError,
)
from ..models import (
    InterviewStartRequest,
    InterviewStartResponse,
    HistoryMessage,
    UserAnswerRequest,
    AssistantQuestionResponse,
    PhaseResetRequest,
    PhaseResetResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _reconstruct_chat_history(context: ContextManager) -> list:
    """Reconstruct full chat history from completed interview data in interview.json."""
    messages = []
    for phase_num in range(1, 8):
        phase_data = context.get_phase_context(phase_num)
        qa_pairs = phase_data.get("qa_pairs", [])
        if not qa_pairs:
            continue

        for qa in qa_pairs:
            messages.append(HistoryMessage(
                role="assistant",
                content=qa["question"],
                timestamp=qa.get("timestamp", ""),
            ))
            messages.append(HistoryMessage(
                role="user",
                content=qa["answer"],
                timestamp=qa.get("timestamp", ""),
            ))

        last_ts = qa_pairs[-1].get("timestamp", "")
        messages.append(HistoryMessage(
            role="system",
            content=f"フェーズ {phase_num} が完了しました。",
            timestamp=last_ts,
        ))

    messages.append(HistoryMessage(
        role="system",
        content="全てのフェーズが完了しました。仕様書が生成されました。",
        timestamp="",
    ))
    return messages

settings = get_settings()
phase_manager = PhaseManager()


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    """
    Start a new interview session.

    Initializes an interview for the specified project and phase.
    """
    try:
        # Load existing project context
        context = ContextManager.load_project(request.project_id, data_dir=settings.data_dir)

        # Determine which phase to start
        if request.phase_num:
            phase_num = request.phase_num
        else:
            # Find next incomplete phase using context's completed flag
            phase_num = None
            for i in range(1, 8):
                if not context.is_phase_complete(i):
                    phase_num = i
                    break

        # All phases complete - return reconstructed chat history
        if phase_num is None:
            chat_history = _reconstruct_chat_history(context)
            phase_info = phase_manager.get_phase_info(7)
            logger.info(f"All phases complete for {request.project_id}, returning chat history")
            return InterviewStartResponse(
                project_id=request.project_id,
                display_name=context.display_name,
                phase_num=7,
                phase_name=phase_info.name,
                initial_message="",
                all_complete=True,
                chat_history=chat_history,
            )

        # Create interview engine
        llm_client = LLMFactory.create_client(settings=settings)
        engine = InterviewEngine(
            llm_client=llm_client,
            phase_manager=phase_manager,
            context_manager=context
        )

        # Get initial question
        phase_info = phase_manager.get_phase_info(phase_num)
        initial_question = engine._generate_initial_question(phase_num)

        logger.info(f"Started interview for {request.project_id}, phase {phase_num}")

        return InterviewStartResponse(
            project_id=request.project_id,
            display_name=context.display_name,
            phase_num=phase_num,
            phase_name=phase_info.name,
            initial_message=initial_question
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{request.project_id}' not found"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except LLMAuthenticationError as e:
        logger.error(f"LLM authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"LLM APIキーが無効です。サーバーの .env 設定を確認してください。"
        )
    except LLMConnectionError as e:
        logger.error(f"LLM connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLMサービスに接続できません。ネットワーク接続を確認してください。"
        )
    except Exception as e:
        logger.error(f"Failed to start interview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start interview"
        )


@router.post("/answer", response_model=AssistantQuestionResponse)
async def submit_answer(request: UserAnswerRequest):
    """
    Submit a user answer and get the next question.

    Processes the user's answer and generates the next interview question.
    """
    try:
        # Load context
        context = ContextManager.load_project(request.project_id, data_dir=settings.data_dir)

        # Guard: if all phases complete, do not process further answers
        if all(context.is_phase_complete(i) for i in range(1, 8)):
            return AssistantQuestionResponse(
                question="全てのフェーズが完了しています。仕様書をご確認ください。",
                phase_complete=True,
                phase_num=7,
                qa_count=0,
            )

        # Determine current phase using context's completed flag
        current_phase = 1
        for i in range(1, 8):
            if not context.is_phase_complete(i):
                current_phase = i
                break

        # Create interview engine
        llm_client = LLMFactory.create_client(settings=settings)
        engine = InterviewEngine(
            llm_client=llm_client,
            phase_manager=phase_manager,
            context_manager=context
        )

        # Save the Q&A pair to persistent storage
        context.add_qa_pair(current_phase, request.question, request.answer)

        phase_context = context.get_phase_context(current_phase)
        qa_pairs = phase_context.get("qa_pairs", [])

        # Check if phase is complete
        phase_complete = engine._is_phase_complete(current_phase, context)

        if phase_complete:
            # Generate spec and move to next phase
            try:
                engine._generate_and_save_spec(current_phase)
            except Exception as e:
                logger.warning(f"Failed to generate spec: {e}")

            if current_phase < 7:
                next_question = engine._generate_initial_question(current_phase + 1)
                return AssistantQuestionResponse(
                    question=next_question,
                    phase_complete=True,
                    phase_num=current_phase,
                    qa_count=len(qa_pairs)
                )
            else:
                return AssistantQuestionResponse(
                    question="おめでとうございます！全7つの工程のインタビューが完了しました。",
                    phase_complete=True,
                    phase_num=7,
                    qa_count=len(qa_pairs)
                )
        else:
            # Generate next question
            next_question = engine._generate_follow_up_question(current_phase, context)

            return AssistantQuestionResponse(
                question=next_question,
                phase_complete=False,
                phase_num=current_phase,
                qa_count=len(qa_pairs)
            )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{request.project_id}' not found"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except LLMAuthenticationError as e:
        logger.error(f"LLM authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"LLM APIキーが無効です。サーバーの .env 設定を確認してください。"
        )
    except LLMConnectionError as e:
        logger.error(f"LLM connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLMサービスに接続できません。ネットワーク接続を確認してください。"
        )
    except Exception as e:
        logger.error(f"Failed to process answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process answer"
        )


@router.post("/reset-phase", response_model=PhaseResetResponse)
async def reset_phase(request: PhaseResetRequest):
    """
    Reset a specific phase to allow re-interviewing.

    Clears the Q&A data for the specified phase and deletes the generated spec file.
    """
    try:
        context = ContextManager.load_project(request.project_id, data_dir=settings.data_dir)

        # Reset the phase data (Q&A pairs, structured data, completed flag)
        context.reset_phase(request.phase_num)

        # Delete the generated spec file if it exists
        phase_info = phase_manager.get_phase_info(request.phase_num)
        spec_file = context.get_specs_dir() / phase_info.filename
        if spec_file.exists():
            spec_file.unlink()
            logger.info(f"Deleted spec file: {spec_file}")

        logger.info(f"Reset phase {request.phase_num} for project {request.project_id}")

        return PhaseResetResponse(
            project_id=request.project_id,
            phase_num=request.phase_num,
            message=f"フェーズ {request.phase_num} をリセットしました。再インタビューを開始できます。"
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{request.project_id}' not found"
        )
    except Exception as e:
        logger.error(f"Failed to reset phase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset phase"
        )
