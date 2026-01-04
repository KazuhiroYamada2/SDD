"""Phase manager for orchestrating the 7 phases of SDD."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class PhaseInfo:
    """Information about a specific phase."""
    number: int
    name: str
    name_en: str
    filename: str
    description: str
    required_fields: List[str]
    dependencies: List[int]  # Which previous phases this depends on


class PhaseManager:
    """Manages the 7-phase workflow of Specification Driven Development."""

    def __init__(self):
        """Initialize the phase manager with phase definitions."""
        self.phases = {
            1: PhaseInfo(
                number=1,
                name="原則定義",
                name_en="Principle Definition",
                filename="01-principle-definition.md",
                description="プロジェクトの存在意義・原則・制約条件を明文化",
                required_fields=[
                    "background",
                    "purposes",
                    "principles",
                    "in_scope",
                    "out_scope",
                    "constraints",
                    "stakeholders",
                    "success_criteria"
                ],
                dependencies=[]
            ),
            2: PhaseInfo(
                number=2,
                name="企画・要件定義",
                name_en="Planning & Requirements",
                filename="02-planning-requirement.md",
                description="「何を」「なぜ」作るのかを定義",
                required_fields=[
                    "project_overview",
                    "target_users",
                    "functional_requirements",
                    "non_functional_requirements"
                ],
                dependencies=[1]
            ),
            3: PhaseInfo(
                number=3,
                name="設計計画",
                name_en="Design Planning",
                filename="03-design-planning.md",
                description="技術スタック、アーキテクチャ、制約条件を整理",
                required_fields=[
                    "technology_options",
                    "architecture",
                    "design_decisions"
                ],
                dependencies=[1, 2]
            ),
            4: PhaseInfo(
                number=4,
                name="タスク分割",
                name_en="Task Breakdown",
                filename="04-task-breakdown.md",
                description="レビュー・テスト可能な粒度でタスクを分割",
                required_fields=[
                    "milestones",
                    "tasks",
                    "dependencies",
                    "priorities"
                ],
                dependencies=[2, 3]
            ),
            5: PhaseInfo(
                number=5,
                name="実装",
                name_en="Implementation",
                filename="05-implementation.md",
                description="AIにコードを書かせ、人間がレビュー・検証",
                required_fields=[
                    "implementation_records",
                    "review_results",
                    "ai_usage"
                ],
                dependencies=[2, 3, 4]
            ),
            6: PhaseInfo(
                number=6,
                name="検証・受入",
                name_en="Verification & Acceptance",
                filename="06-verification-acceptance.md",
                description="仕様が満たされているかを顧客と共に確認",
                required_fields=[
                    "test_items",
                    "test_results",
                    "spec_differences",
                    "acceptance_results"
                ],
                dependencies=[2, 5]
            ),
            7: PhaseInfo(
                number=7,
                name="移行・運用",
                name_en="Migration & Operation",
                filename="07-migration-operation.md",
                description="本番へ移行し、運用フェーズで継続的に改善",
                required_fields=[
                    "migration_plan",
                    "operation_structure",
                    "feedback_loop",
                    "metrics"
                ],
                dependencies=[6]
            )
        }

    def get_phase_info(self, phase_num: int) -> PhaseInfo:
        """
        Get information about a specific phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            PhaseInfo object

        Raises:
            ValueError: If phase number is invalid
        """
        if phase_num not in self.phases:
            raise ValueError(f"Invalid phase number: {phase_num}. Must be 1-7.")
        return self.phases[phase_num]

    def get_initial_prompt(self, phase_num: int) -> str:
        """
        Get the initial prompt/instruction for a phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            Initial prompt text
        """
        phase = self.get_phase_info(phase_num)

        prompt = f"""# フェーズ{phase_num}: {phase.name}

{phase.description}

このフェーズでは、以下の情報を収集します：
"""
        for field in phase.required_fields:
            prompt += f"- {self._format_field_name(field)}\n"

        prompt += "\nこれから質問をしていきますので、できるだけ詳しく答えてください。"

        return prompt

    def get_required_fields(self, phase_num: int) -> List[str]:
        """
        Get the list of required fields for a phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            List of required field names
        """
        phase = self.get_phase_info(phase_num)
        return phase.required_fields.copy()

    def get_dependencies(self, phase_num: int) -> List[int]:
        """
        Get the list of phases that this phase depends on.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            List of phase numbers this phase depends on
        """
        phase = self.get_phase_info(phase_num)
        return phase.dependencies.copy()

    def validate_phase_completion(
        self,
        phase_num: int,
        data: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """
        Validate that all required fields are present for a phase.

        Args:
            phase_num: Phase number (1-7)
            data: Dictionary of collected data

        Returns:
            Tuple of (is_valid, missing_fields)
        """
        required = self.get_required_fields(phase_num)
        missing = []

        for field in required:
            if field not in data or not data[field]:
                missing.append(field)

        return len(missing) == 0, missing

    def get_next_phase(self, current_phase: int) -> Optional[int]:
        """
        Get the next phase number.

        Args:
            current_phase: Current phase number

        Returns:
            Next phase number, or None if this is the last phase
        """
        if current_phase < 7:
            return current_phase + 1
        return None

    def is_last_phase(self, phase_num: int) -> bool:
        """
        Check if this is the last phase.

        Args:
            phase_num: Phase number

        Returns:
            True if this is phase 7
        """
        return phase_num == 7

    def get_all_phases(self) -> List[PhaseInfo]:
        """
        Get information about all phases.

        Returns:
            List of all PhaseInfo objects
        """
        return [self.phases[i] for i in range(1, 8)]

    def get_phase_filename(self, phase_num: int) -> str:
        """
        Get the output filename for a phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            Filename for the phase spec
        """
        phase = self.get_phase_info(phase_num)
        return phase.filename

    def _format_field_name(self, field: str) -> str:
        """
        Format a field name for display.

        Args:
            field: Field name in snake_case

        Returns:
            Formatted field name
        """
        # Map field names to Japanese display names
        field_names = {
            "background": "背景",
            "purposes": "目的",
            "principles": "基本原則",
            "in_scope": "含まれるもの（スコープ内）",
            "out_scope": "含まれないもの（スコープ外）",
            "constraints": "制約条件",
            "stakeholders": "ステークホルダー",
            "success_criteria": "成功基準",
            "project_overview": "プロジェクト概要",
            "target_users": "対象ユーザー",
            "functional_requirements": "機能要件",
            "non_functional_requirements": "非機能要件",
            "technology_options": "技術スタック選択肢",
            "architecture": "アーキテクチャ",
            "design_decisions": "設計決定",
            "milestones": "マイルストーン",
            "tasks": "タスク",
            "dependencies": "依存関係",
            "priorities": "優先度",
            "implementation_records": "実装記録",
            "review_results": "レビュー結果",
            "ai_usage": "AI利用記録",
            "test_items": "テスト項目",
            "test_results": "テスト結果",
            "spec_differences": "仕様差分",
            "acceptance_results": "受入結果",
            "migration_plan": "移行計画",
            "operation_structure": "運用体制",
            "feedback_loop": "フィードバックループ",
            "metrics": "運用メトリクス"
        }
        return field_names.get(field, field.replace("_", " ").title())

    def get_schema_for_phase(self, phase_num: int) -> Dict[str, Any]:
        """
        Get the JSON schema for extracting structured data from a phase.

        Args:
            phase_num: Phase number (1-7)

        Returns:
            JSON schema dictionary
        """
        phase = self.get_phase_info(phase_num)

        # Build a schema based on required fields
        schema = {
            "type": "object",
            "properties": {},
            "required": phase.required_fields
        }

        # Define types for each field
        for field in phase.required_fields:
            if field in ["purposes", "principles", "in_scope", "out_scope",
                        "stakeholders", "functional_requirements", "non_functional_requirements",
                        "technology_options", "milestones", "tasks"]:
                schema["properties"][field] = {"type": "array", "items": {"type": "string"}}
            elif field in ["constraints", "design_decisions", "implementation_records",
                          "review_results", "ai_usage", "test_items", "test_results"]:
                schema["properties"][field] = {"type": "object"}
            else:
                schema["properties"][field] = {"type": "string"}

        return schema
