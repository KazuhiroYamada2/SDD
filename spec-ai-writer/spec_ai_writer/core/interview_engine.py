"""Interview engine for conducting SDD interviews."""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.phase_manager import PhaseManager
from spec_ai_writer.llm.base import BaseLLMClient


class InterviewEngine:
    """Orchestrates the interview process for all 7 phases."""

    def __init__(
        self,
        llm_client: BaseLLMClient,
        phase_manager: PhaseManager,
        context_manager: ContextManager
    ):
        """
        Initialize the interview engine.

        Args:
            llm_client: LLM client for generating questions
            phase_manager: Phase manager for workflow control
            context_manager: Context manager for storing conversation
        """
        self.llm = llm_client
        self.phase_mgr = phase_manager
        self.context_mgr = context_manager

    def start_interview(self) -> None:
        """Start the interview from the current phase."""
        current_phase = self.context_mgr.get_current_phase()

        print(f"\n{'='*60}")
        print(f"仕様駆動開発（SDD）インタビューを開始します")
        print(f"プロジェクト: {self.context_mgr.project_name}")
        print(f"現在のフェーズ: {current_phase}")
        print(f"{'='*60}\n")

        # Conduct interviews for each phase from current to phase 7
        for phase_num in range(current_phase, 8):
            if not self._conduct_phase_interview(phase_num):
                # User requested to stop
                print("\nインタビューを中断しました。")
                print(f"次回は 'spec resume {self.context_mgr.project_name}' で再開できます。")
                return

        print("\n" + "="*60)
        print("すべてのフェーズが完了しました！おめでとうございます！")
        print("="*60 + "\n")

    def _conduct_phase_interview(self, phase_num: int) -> bool:
        """
        Conduct interview for a specific phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            True if phase completed, False if user wants to stop
        """
        phase_info = self.phase_mgr.get_phase_info(phase_num)

        print(f"\n{'─'*60}")
        print(f"フェーズ {phase_num}: {phase_info.name}")
        print(f"{phase_info.description}")
        print(f"{'─'*60}\n")

        # Show initial prompt
        initial_prompt = self.phase_mgr.get_initial_prompt(phase_num)
        print(initial_prompt)
        print()

        # Get system prompt for this phase
        system_prompt = self._get_system_prompt_for_phase(phase_num)

        # Question-answer loop
        qa_count = 0
        max_questions = 15  # Safety limit

        while qa_count < max_questions:
            # Generate next question
            context = self._build_context_for_question(phase_num)
            question = self._generate_next_question(system_prompt, context)

            if not question or question.strip() == "":
                break

            # Ask the question
            print(f"\n質問: {question}")
            print("回答: ", end="", flush=True)

            try:
                answer = input().strip()
            except (KeyboardInterrupt, EOFError):
                print("\n\nインタビューを中断しますか？ (y/n): ", end="", flush=True)
                try:
                    response = input().strip().lower()
                    if response in ['y', 'yes', 'はい']:
                        return False
                except (KeyboardInterrupt, EOFError):
                    return False

            if not answer:
                print("回答が空です。もう一度入力してください。")
                continue

            # Check for exit commands
            if answer.lower() in ['exit', 'quit', '終了', '中断']:
                print("\nインタビューを中断しますか？ (y/n): ", end="", flush=True)
                response = input().strip().lower()
                if response in ['y', 'yes', 'はい']:
                    return False
                continue

            # Save Q&A pair
            self.context_mgr.add_qa_pair(phase_num, question, answer)
            qa_count += 1

            # Check if we have enough information
            if qa_count >= 5:  # After at least 5 Q&A pairs
                if self._check_phase_completion(phase_num):
                    break

        # Extract structured data and generate spec
        print("\n情報を整理しています...")
        self._generate_and_save_spec(phase_num, self.context_mgr.project_name)

        print(f"\nフェーズ {phase_num} が完了しました！")

        return True

    def _generate_next_question(
        self,
        system_prompt: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate the next question using LLM.

        Args:
            system_prompt: System prompt for the phase
            context: Current context

        Returns:
            Generated question
        """
        try:
            question = self.llm.generate_question(system_prompt, context)
            return question.strip()
        except Exception as e:
            print(f"\n質問の生成中にエラーが発生しました: {e}")
            return ""

    def _build_context_for_question(self, phase_num: int) -> Dict[str, Any]:
        """
        Build context for question generation.

        Args:
            phase_num: Current phase number

        Returns:
            Context dictionary
        """
        conversation_history = self.context_mgr.get_conversation_history(phase_num)
        required_fields = self.phase_mgr.get_required_fields(phase_num)

        # Determine which fields still need information
        phase_data = self.context_mgr.get_phase_context(phase_num)
        structured_data = phase_data.get("structured_data", {}) or {}
        missing_fields = [f for f in required_fields if f not in structured_data or not structured_data[f]]

        # Load previous phase specifications
        previous_phases = self._load_previous_phase_specs(phase_num)

        return {
            "conversation_history": conversation_history,
            "missing_fields": missing_fields,
            "qa_count": len(phase_data.get("qa_pairs", [])),
            "previous_phases": previous_phases
        }

    def _check_phase_completion(self, phase_num: int) -> bool:
        """
        Check if phase has enough information to complete.

        Args:
            phase_num: Phase number

        Returns:
            True if phase can be completed
        """
        # Try to extract structured data
        conversation = self.context_mgr.get_conversation_history(phase_num)
        if not conversation:
            return False

        try:
            schema = self.phase_mgr.get_schema_for_phase(phase_num)
            structured_data = self.llm.extract_structured_data(conversation, schema)

            # Validate completeness
            is_valid, missing = self.phase_mgr.validate_phase_completion(
                phase_num,
                structured_data
            )

            return is_valid
        except Exception:
            return False

    def _extract_and_save_structured_data(self, phase_num: int) -> None:
        """
        Extract structured data from conversation and save it.

        Args:
            phase_num: Phase number
        """
        try:
            schema = self.phase_mgr.get_schema_for_phase(phase_num)
            structured_data = self.context_mgr.extract_structured_data(
                phase_num,
                self.llm,
                schema
            )
            print(f"✓ データを抽出しました（{len(structured_data)}項目）")
        except Exception as e:
            print(f"⚠ データ抽出中にエラーが発生しました: {e}")

    def _get_system_prompt_for_phase(self, phase_num: int) -> str:
        """
        Get system prompt for a specific phase.

        Args:
            phase_num: Phase number

        Returns:
            System prompt string
        """
        # Import the appropriate prompt for each phase
        if phase_num == 1:
            from config.prompts.phase_01_prompts import PHASE_01_SYSTEM_PROMPT
            return PHASE_01_SYSTEM_PROMPT
        elif phase_num == 2:
            from config.prompts.phase_02_prompts import PHASE_02_SYSTEM_PROMPT
            return PHASE_02_SYSTEM_PROMPT
        elif phase_num == 3:
            from config.prompts.phase_03_prompts import PHASE_03_SYSTEM_PROMPT
            return PHASE_03_SYSTEM_PROMPT
        elif phase_num == 4:
            from config.prompts.phase_04_prompts import PHASE_04_SYSTEM_PROMPT
            return PHASE_04_SYSTEM_PROMPT
        elif phase_num == 5:
            from config.prompts.phase_05_prompts import PHASE_05_SYSTEM_PROMPT
            return PHASE_05_SYSTEM_PROMPT
        elif phase_num == 6:
            from config.prompts.phase_06_prompts import PHASE_06_SYSTEM_PROMPT
            return PHASE_06_SYSTEM_PROMPT
        elif phase_num == 7:
            from config.prompts.phase_07_prompts import PHASE_07_SYSTEM_PROMPT
            return PHASE_07_SYSTEM_PROMPT
        else:
            # Fallback for invalid phase numbers
            phase_info = self.phase_mgr.get_phase_info(phase_num)
            return f"""あなたは仕様駆動開発の専門家です。
現在、フェーズ {phase_num}: {phase_info.name} を担当しています。

{phase_info.description}

ユーザーに質問をして、必要な情報を収集してください。
一度に1つの質問をし、ユーザーの回答に基づいて適切なフォローアップをしてください。"""

    def resume_interview(self) -> None:
        """Resume a previously interrupted interview."""
        current_phase = self.context_mgr.get_current_phase()

        print(f"\n{'='*60}")
        print(f"インタビューを再開します")
        print(f"プロジェクト: {self.context_mgr.project_name}")
        print(f"現在のフェーズ: {current_phase}")
        print(f"{'='*60}\n")

        # Show what was collected so far
        phase_data = self.context_mgr.get_phase_context(current_phase)
        qa_pairs = phase_data.get("qa_pairs", [])

        if qa_pairs:
            print(f"これまでに {len(qa_pairs)} 個の質問に答えています。\n")

        # Continue from current phase
        self.start_interview()

    def save_progress(self) -> None:
        """Save current progress to disk."""
        self.context_mgr.save_to_disk()
        print("進捗を保存しました。")

    # ========== Web API用メソッド ==========

    def _generate_initial_question(self, phase_num: int) -> str:
        """
        Generate the initial question for a phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            Initial question text
        """
        system_prompt = self._get_system_prompt_for_phase(phase_num)
        phase_info = self.phase_mgr.get_phase_info(phase_num)

        context = {
            "conversation_history": "",
            "missing_fields": self.phase_mgr.get_required_fields(phase_num),
            "qa_count": 0
        }

        try:
            question = self.llm.generate_question(system_prompt, context)
            return question.strip() if question else phase_info.description
        except Exception as e:
            # Fallback to phase description if LLM fails
            return f"フェーズ{phase_num}「{phase_info.name}」を開始します。\n\n{phase_info.description}\n\nまず、プロジェクトの概要を教えてください。"

    def _generate_follow_up_question(
        self,
        phase_num: int,
        context_manager: ContextManager
    ) -> str:
        """
        Generate a follow-up question based on conversation context.

        Args:
            phase_num: Current phase number
            context_manager: Context manager with conversation history

        Returns:
            Follow-up question text
        """
        system_prompt = self._get_system_prompt_for_phase(phase_num)
        context = self._build_context_for_question(phase_num)

        try:
            question = self.llm.generate_question(system_prompt, context)
            return question.strip() if question else ""
        except Exception as e:
            return "もう少し詳しく教えていただけますか？"

    def _is_phase_complete(
        self,
        phase_num: int,
        context_manager: ContextManager
    ) -> bool:
        """
        Check if a phase has enough information to be completed.

        Args:
            phase_num: Phase number
            context_manager: Context manager with conversation data

        Returns:
            True if phase can be completed
        """
        phase_context = context_manager.get_phase_context(phase_num)
        qa_pairs = phase_context.get("qa_pairs", [])

        # Require at least 3 Q&A pairs
        if len(qa_pairs) < 3:
            return False

        # Use the existing completion check logic
        return self._check_phase_completion(phase_num)

    def _generate_and_save_spec(
        self,
        phase_num: int,
        project_name: str
    ) -> None:
        """
        Generate and save the specification document for a phase.

        Args:
            phase_num: Phase number
            project_name: Project name for the spec file
        """
        # Extract structured data first
        self._extract_and_save_structured_data(phase_num)

        # Mark phase as complete
        self.context_mgr.mark_phase_complete(phase_num)

        # Generate Markdown spec file using templates
        from config.settings import get_settings
        from spec_ai_writer.generators.markdown_generator import MarkdownGenerator

        settings = get_settings()
        generator = MarkdownGenerator(settings.output_dir)
        phase_info = self.phase_mgr.get_phase_info(phase_num)
        structured_data = self.context_mgr.get_structured_data(phase_num)

        if structured_data:
            file_path = generator.generate_spec(
                phase_num,
                phase_info.name,
                phase_info.filename,
                structured_data,
                project_name
            )
            print(f"仕様書 {phase_info.filename} を生成しました。")

    def _get_phase_dependencies(self, phase_num: int) -> List[int]:
        """
        Get the list of phases that the current phase depends on.

        Based on SPEC.md section 3.2:
        - Phase 2: depends on Phase 1
        - Phase 3: depends on Phases 1, 2
        - Phase 4: depends on Phases 2, 3
        - Phase 5: depends on Phases 2, 3, 4
        - Phase 6: depends on Phases 2, 5
        - Phase 7: depends on Phase 6

        Args:
            phase_num: Current phase number

        Returns:
            List of phase numbers this phase depends on
        """
        dependencies = {
            1: [],
            2: [1],
            3: [1, 2],
            4: [2, 3],
            5: [2, 3, 4],
            6: [2, 5],
            7: [6],
        }
        return dependencies.get(phase_num, [])

    def _load_previous_phase_specs(self, phase_num: int) -> str:
        """
        Load specification documents from previous phases that this phase depends on.

        Args:
            phase_num: Current phase number

        Returns:
            Combined content of previous phase specifications
        """
        from config.settings import get_settings

        dependencies = self._get_phase_dependencies(phase_num)
        if not dependencies:
            return ""

        settings = get_settings()
        output_dir = Path(settings.output_dir)
        project_name = self.context_mgr.project_name
        project_dir = output_dir / project_name

        specs_content = []
        for dep_phase in dependencies:
            phase_info = self.phase_mgr.get_phase_info(dep_phase)
            spec_path = project_dir / phase_info.filename

            if spec_path.exists():
                try:
                    content = spec_path.read_text(encoding="utf-8")
                    specs_content.append(
                        f"### フェーズ{dep_phase}: {phase_info.name}\n\n{content}"
                    )
                except Exception:
                    pass  # Skip if file cannot be read

        return "\n\n---\n\n".join(specs_content)
