"""
Interview API Router

Endpoints for conducting real-time interviews via WebSocket and REST.
"""

import logging
import json
from typing import Dict, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from spec_ai_writer.core.interview_engine import InterviewEngine
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.phase_manager import PhaseManager
from spec_ai_writer.llm.factory import LLMFactory
from ..models import (
    InterviewStartRequest,
    InterviewStartResponse,
    UserAnswerRequest,
    AssistantQuestionResponse,
    WebSocketMessage
)

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
phase_manager = PhaseManager()

# Active interview sessions (WebSocket connections)
active_sessions: Dict[str, InterviewEngine] = {}


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    """
    Start a new interview session.

    Initializes an interview for the specified project and phase.
    """
    try:
        # Create or load context
        context = ContextManager(request.project_name)

        # Determine which phase to start
        if request.phase_num:
            phase_num = request.phase_num
        else:
            # Find next incomplete phase using context's completed flag
            phase_num = 1
            for i in range(1, 8):
                if not context.is_phase_complete(i):
                    phase_num = i
                    break

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

        logger.info(f"Started interview for {request.project_name}, phase {phase_num}")

        return InterviewStartResponse(
            project_name=request.project_name,
            phase_num=phase_num,
            phase_name=phase_info.name,
            initial_message=initial_question
        )

    except Exception as e:
        logger.error(f"Failed to start interview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(e)}"
        )


@router.post("/answer", response_model=AssistantQuestionResponse)
async def submit_answer(request: UserAnswerRequest):
    """
    Submit a user answer and get the next question.

    Processes the user's answer and generates the next interview question.
    """
    try:
        # Load context
        context = ContextManager(request.project_name)

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

        # Process answer (this would normally happen in the interview loop)
        # For simplicity, we'll add the Q&A pair directly
        phase_context = context.get_phase_context(current_phase)
        qa_pairs = phase_context.get("qa_pairs", [])

        # Get the last question (should be stored in session state in real implementation)
        # For now, we'll generate a follow-up question

        # Check if phase is complete
        phase_complete = engine._is_phase_complete(current_phase, context)

        if phase_complete:
            # Generate spec and move to next phase
            try:
                engine._generate_and_save_spec(current_phase, request.project_name)
            except Exception as e:
                logger.warning(f"Failed to generate spec: {e}")

            if current_phase < 7:
                next_question = engine._generate_initial_question(current_phase + 1)
                return AssistantQuestionResponse(
                    question=next_question,
                    phase_complete=True,
                    phase_num=current_phase + 1,
                    qa_count=0
                )
            else:
                return AssistantQuestionResponse(
                    question="おめでとうございます！全7フェーズのインタビューが完了しました。",
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

    except Exception as e:
        logger.error(f"Failed to process answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer: {str(e)}"
        )


@router.websocket("/ws/{project_name}")
async def websocket_interview(websocket: WebSocket, project_name: str):
    """
    WebSocket endpoint for real-time interview.

    Provides bidirectional communication for a chat-like interview experience.
    """
    await websocket.accept()
    logger.info(f"WebSocket connection established for project: {project_name}")

    try:
        # Create or load context
        context = ContextManager(project_name)

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

        # Store in active sessions
        session_key = f"{project_name}_{current_phase}"
        active_sessions[session_key] = engine

        # Send initial question
        phase_info = phase_manager.get_phase_info(current_phase)
        initial_question = engine._generate_initial_question(current_phase)

        await websocket.send_json({
            "type": "question",
            "content": initial_question,
            "metadata": {
                "phase_num": current_phase,
                "phase_name": phase_info.name,
                "qa_count": 0
            }
        })

        # Message loop
        while True:
            # Receive user answer
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "answer":
                user_answer = message.get("content", "")

                # Get last question from context
                phase_context = context.get_phase_context(current_phase)
                qa_pairs = phase_context.get("qa_pairs", [])

                # Add Q&A pair
                context.add_qa_pair(
                    current_phase,
                    initial_question if not qa_pairs else qa_pairs[-1].get("question", ""),
                    user_answer
                )

                # Save context
                context.save_to_disk()

                # Check if phase is complete
                phase_complete = engine._is_phase_complete(current_phase, context)

                if phase_complete:
                    # Send phase completion message
                    await websocket.send_json({
                        "type": "phase_complete",
                        "content": f"フェーズ{current_phase}が完了しました。仕様書を生成しています...",
                        "metadata": {
                            "phase_num": current_phase,
                            "phase_name": phase_info.name
                        }
                    })

                    # Generate specification
                    try:
                        engine._generate_and_save_spec(current_phase, project_name)

                        await websocket.send_json({
                            "type": "spec_generated",
                            "content": f"仕様書 {phase_info.filename} を生成しました。",
                            "metadata": {
                                "phase_num": current_phase,
                                "filename": phase_info.filename
                            }
                        })
                    except Exception as e:
                        logger.error(f"Failed to generate spec: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "content": f"仕様書の生成中にエラーが発生しました: {str(e)}"
                        })

                    # Move to next phase
                    if current_phase < 7:
                        current_phase += 1
                        phase_info = phase_manager.get_phase_info(current_phase)
                        initial_question = engine._generate_initial_question(current_phase)

                        await websocket.send_json({
                            "type": "question",
                            "content": initial_question,
                            "metadata": {
                                "phase_num": current_phase,
                                "phase_name": phase_info.name,
                                "qa_count": 0
                            }
                        })
                    else:
                        # All phases complete
                        await websocket.send_json({
                            "type": "complete",
                            "content": "おめでとうございます！全7フェーズのインタビューが完了しました。",
                            "metadata": {
                                "project_name": project_name
                            }
                        })
                        break
                else:
                    # Generate next question
                    next_question = engine._generate_follow_up_question(current_phase, context)

                    await websocket.send_json({
                        "type": "question",
                        "content": next_question,
                        "metadata": {
                            "phase_num": current_phase,
                            "phase_name": phase_info.name,
                            "qa_count": len(qa_pairs) + 1
                        }
                    })

                    # Update initial_question for next iteration
                    initial_question = next_question

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project: {project_name}")
        # Clean up session
        session_key = f"{project_name}_{current_phase}"
        if session_key in active_sessions:
            del active_sessions[session_key]

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"エラーが発生しました: {str(e)}"
            })
        except:
            pass
        # Clean up session
        session_key = f"{project_name}_{current_phase}"
        if session_key in active_sessions:
            del active_sessions[session_key]
