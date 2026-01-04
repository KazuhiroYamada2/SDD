"""Context manager for storing and retrieving interview data."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class ContextManager:
    """Manages interview context and conversation history across phases."""

    def __init__(self, project_name: str, storage_path: Optional[str] = None):
        """
        Initialize the context manager.

        Args:
            project_name: Name of the project being interviewed
            storage_path: Directory to store context files (default: .interview_state/)
        """
        self.project_name = project_name
        self.storage_path = Path(storage_path or ".interview_state")
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # Context structure:
        # {
        #     "project_name": str,
        #     "created_at": str,
        #     "updated_at": str,
        #     "current_phase": int,
        #     "phases": {
        #         "1": {
        #             "qa_pairs": [{"question": str, "answer": str, "timestamp": str}],
        #             "structured_data": dict,
        #             "completed": bool
        #         },
        #         ...
        #     }
        # }
        self.context: Dict[str, Any] = {
            "project_name": project_name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "current_phase": 1,
            "phases": {}
        }

        # Try to load existing context
        self.load_from_disk()

    def add_qa_pair(self, phase: int, question: str, answer: str) -> None:
        """
        Add a question-answer pair to the specified phase.

        Args:
            phase: Phase number (1-7)
            question: The question asked
            answer: User's answer
        """
        phase_key = str(phase)

        if phase_key not in self.context["phases"]:
            self.context["phases"][phase_key] = {
                "qa_pairs": [],
                "structured_data": None,
                "completed": False
            }

        self.context["phases"][phase_key]["qa_pairs"].append({
            "question": question,
            "answer": answer,
            "timestamp": datetime.now().isoformat()
        })

        self.context["updated_at"] = datetime.now().isoformat()
        self.save_to_disk()

    def get_phase_context(self, phase_num: int) -> Dict[str, Any]:
        """
        Get the context for a specific phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            Phase context dictionary
        """
        phase_key = str(phase_num)
        return self.context["phases"].get(phase_key, {
            "qa_pairs": [],
            "structured_data": None,
            "completed": False
        })

    def get_all_context(self) -> Dict[str, Any]:
        """
        Get the complete context.

        Returns:
            Full context dictionary
        """
        return self.context.copy()

    def get_context_for_phase(self, phase_num: int) -> Dict[str, Any]:
        """
        Get context including all previous phases for the current phase.

        Args:
            phase_num: Current phase number

        Returns:
            Dictionary with current and previous phases' data
        """
        result = {
            "current_phase": phase_num,
            "current_qa": self.get_phase_context(phase_num).get("qa_pairs", []),
            "previous_phases": {}
        }

        # Include data from previous phases
        for prev_phase in range(1, phase_num):
            prev_key = str(prev_phase)
            if prev_key in self.context["phases"]:
                result["previous_phases"][prev_phase] = self.context["phases"][prev_key]

        return result

    def set_structured_data(self, phase: int, data: Dict[str, Any]) -> None:
        """
        Set structured data extracted from the phase conversation.

        Args:
            phase: Phase number
            data: Structured data dictionary
        """
        phase_key = str(phase)

        if phase_key not in self.context["phases"]:
            self.context["phases"][phase_key] = {
                "qa_pairs": [],
                "structured_data": None,
                "completed": False
            }

        self.context["phases"][phase_key]["structured_data"] = data
        self.context["updated_at"] = datetime.now().isoformat()
        self.save_to_disk()

    def get_structured_data(self, phase: int) -> Optional[Dict[str, Any]]:
        """
        Get structured data for a phase.

        Args:
            phase: Phase number

        Returns:
            Structured data dictionary or None
        """
        phase_key = str(phase)
        phase_data = self.context["phases"].get(phase_key, {})
        return phase_data.get("structured_data")

    def mark_phase_complete(self, phase: int) -> None:
        """
        Mark a phase as completed.

        Args:
            phase: Phase number to mark complete
        """
        phase_key = str(phase)

        if phase_key not in self.context["phases"]:
            self.context["phases"][phase_key] = {
                "qa_pairs": [],
                "structured_data": None,
                "completed": False
            }

        self.context["phases"][phase_key]["completed"] = True
        self.context["current_phase"] = phase + 1
        self.context["updated_at"] = datetime.now().isoformat()
        self.save_to_disk()

    def is_phase_complete(self, phase: int) -> bool:
        """
        Check if a phase is completed.

        Args:
            phase: Phase number

        Returns:
            True if phase is complete
        """
        phase_key = str(phase)
        phase_data = self.context["phases"].get(phase_key, {})
        return phase_data.get("completed", False)

    def get_conversation_history(self, phase: int) -> str:
        """
        Get formatted conversation history for a phase.

        Args:
            phase: Phase number

        Returns:
            Formatted conversation history string
        """
        phase_data = self.get_phase_context(phase)
        qa_pairs = phase_data.get("qa_pairs", [])

        if not qa_pairs:
            return ""

        lines = []
        for i, qa in enumerate(qa_pairs, 1):
            lines.append(f"Q{i}: {qa['question']}")
            lines.append(f"A{i}: {qa['answer']}")
            lines.append("")

        return "\n".join(lines)

    def get_current_phase(self) -> int:
        """
        Get the current phase number.

        Returns:
            Current phase number
        """
        return self.context.get("current_phase", 1)

    def save_to_disk(self) -> None:
        """Save context to disk."""
        file_path = self.storage_path / f"{self.project_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(self.context, f, ensure_ascii=False, indent=2)

    def load_from_disk(self) -> None:
        """Load context from disk if it exists."""
        file_path = self.storage_path / f"{self.project_name}.json"

        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    loaded_context = json.load(f)
                    self.context.update(loaded_context)
            except Exception as e:
                # If loading fails, keep the default context
                print(f"Warning: Could not load context from {file_path}: {e}")

    def reset_phase(self, phase: int) -> None:
        """
        Reset a specific phase (useful for retrying).

        Args:
            phase: Phase number to reset
        """
        phase_key = str(phase)
        if phase_key in self.context["phases"]:
            self.context["phases"][phase_key] = {
                "qa_pairs": [],
                "structured_data": None,
                "completed": False
            }
            self.context["updated_at"] = datetime.now().isoformat()
            self.save_to_disk()

    def extract_structured_data(
        self,
        phase_num: int,
        llm_client: Any,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structured data from conversation using LLM.

        Args:
            phase_num: Phase number
            llm_client: LLM client instance
            schema: Expected data schema

        Returns:
            Extracted structured data
        """
        conversation = self.get_conversation_history(phase_num)

        if not conversation:
            return {}

        structured_data = llm_client.extract_structured_data(conversation, schema)
        self.set_structured_data(phase_num, structured_data)

        return structured_data
