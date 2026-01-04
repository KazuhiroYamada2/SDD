"""Markdown generator for creating specification files."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, Template


class MarkdownGenerator:
    """Generates Markdown specification files from interview data."""

    def __init__(self, output_dir: str, templates_dir: Optional[str] = None):
        """
        Initialize the Markdown generator.

        Args:
            output_dir: Directory to save generated files
            templates_dir: Directory containing Jinja2 templates
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Setup Jinja2 environment
        if templates_dir is None:
            # Default to templates directory in project root
            project_root = Path(__file__).parent.parent.parent
            templates_dir = project_root / "templates"

        self.templates_dir = Path(templates_dir)
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True
        )

    def generate_spec(
        self,
        phase_num: int,
        phase_name: str,
        filename: str,
        data: Dict[str, Any],
        project_name: str
    ) -> Path:
        """
        Generate a Markdown specification file using Jinja2 templates.

        Args:
            phase_num: Phase number (1-7)
            phase_name: Phase name
            filename: Output filename
            data: Structured data from interview
            project_name: Project name

        Returns:
            Path to the generated file
        """
        # Load the appropriate template
        template_filename = filename.replace('.md', '.md.jinja2')

        try:
            template = self.jinja_env.get_template(template_filename)
        except Exception as e:
            print(f"Warning: Could not load template {template_filename}: {e}")
            # Fallback to old method
            if phase_num == 1:
                content = self._generate_phase_01(data, project_name)
            else:
                content = self._generate_generic_phase(phase_num, phase_name, data, project_name)
        else:
            # Prepare template context
            context = {
                'project_name': project_name,
                'generation_date': datetime.now().strftime('%Y-%m-%d'),
                **data  # Unpack all data fields
            }

            # Render template
            content = template.render(context)

        # Save to file (project-specific directory)
        project_dir = self.output_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)
        file_path = project_dir / filename
        file_path.write_text(content, encoding="utf-8")

        return file_path

    def _generate_phase_01(self, data: Dict[str, Any], project_name: str) -> str:
        """Generate Phase 1: Principle Definition markdown."""
        content = f"""# {project_name} - プロジェクト憲章

<!--
IMPORTANT:
This file is a project constitution.
Do NOT modify this file unless you are explicitly instructed.
-->

## プロジェクトの存在意義（Why）

### 背景

{data.get('background', '（未記入）')}

### 目的

"""
        purposes = data.get('purposes', [])
        if isinstance(purposes, list):
            for purpose in purposes:
                content += f"- {purpose}\n"
        else:
            content += f"{purposes}\n"

        content += """
## 基本原則（Principles）

このプロジェクトでは、以下の原則を優先します：

"""
        principles = data.get('principles', [])
        if isinstance(principles, list):
            for i, principle in enumerate(principles, 1):
                content += f"{i}. **{principle}**\n"
        else:
            content += f"{principles}\n"

        content += """
## スコープと責任範囲（Scope）

### 含まれるもの（In Scope）

"""
        in_scope = data.get('in_scope', [])
        if isinstance(in_scope, list):
            for item in in_scope:
                content += f"- {item}\n"
        else:
            content += f"{in_scope}\n"

        content += """
### 含まれないもの（Out of Scope）

"""
        out_scope = data.get('out_scope', [])
        if isinstance(out_scope, list):
            for item in out_scope:
                content += f"- {item}\n"
        else:
            content += f"{out_scope}\n"

        content += """
## 制約条件（Constraints）

"""
        constraints = data.get('constraints', {})
        if isinstance(constraints, dict):
            for key, value in constraints.items():
                content += f"### {key}\n\n{value}\n\n"
        else:
            content += f"{constraints}\n"

        content += """
## ステークホルダー（Stakeholders）

"""
        stakeholders = data.get('stakeholders', [])
        if isinstance(stakeholders, list):
            for stakeholder in stakeholders:
                content += f"- {stakeholder}\n"
        else:
            content += f"{stakeholders}\n"

        content += """
## 成功基準（Success Criteria）

"""
        success_criteria = data.get('success_criteria', '（未記入）')
        content += f"{success_criteria}\n"

        content += """
---

*このドキュメントは Spec AIライター によって生成されました*
"""

        return content

    def _generate_generic_phase(
        self,
        phase_num: int,
        phase_name: str,
        data: Dict[str, Any],
        project_name: str
    ) -> str:
        """Generate a generic phase markdown file."""
        content = f"""# {project_name} - フェーズ{phase_num}: {phase_name}

## 収集された情報

"""
        # Output data as JSON for now (will be replaced with proper templates later)
        for key, value in data.items():
            content += f"### {key}\n\n"
            if isinstance(value, (list, dict)):
                content += "```json\n"
                content += json.dumps(value, ensure_ascii=False, indent=2)
                content += "\n```\n\n"
            else:
                content += f"{value}\n\n"

        content += """
---

*このドキュメントは Spec AIライター によって生成されました*
"""

        return content

    def create_cross_reference(
        self,
        current_phase: int,
        previous_files: Dict[int, str]
    ) -> str:
        """
        Create cross-reference links to previous phase files.

        Args:
            current_phase: Current phase number
            previous_files: Dict mapping phase numbers to filenames

        Returns:
            Markdown text with cross-references
        """
        if not previous_files:
            return ""

        refs = "\n## 関連ドキュメント\n\n"
        for phase_num in sorted(previous_files.keys()):
            if phase_num < current_phase:
                filename = previous_files[phase_num]
                refs += f"- [フェーズ{phase_num}](./{filename})\n"

        return refs
