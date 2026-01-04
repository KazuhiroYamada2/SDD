"""Command-line interface for Spec AIライター."""

import sys
from pathlib import Path

import click

from config.settings import get_settings
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.interview_engine import InterviewEngine
from spec_ai_writer.core.phase_manager import PhaseManager
from spec_ai_writer.generators.markdown_generator import MarkdownGenerator
from spec_ai_writer.git.git_manager import GitManager
from spec_ai_writer.llm.factory import create_default_client


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Spec AIライター - AI対話型仕様駆動開発支援ツール

    仕様駆動開発のためのインタビューを実施し、
    仕様書を自動生成するAI支援ツールです。
    """
    pass


@cli.command()
@click.argument("project_name")
@click.option("--provider", type=click.Choice(["claude", "openai", "bedrock"]), help="LLM provider")
def start(project_name: str, provider: str):
    """新しいプロジェクトのインタビューを開始"""
    try:
        settings = get_settings()

        # Override provider if specified
        if provider:
            settings.default_llm_provider = provider

        # Validate LLM configuration
        is_valid, errors = settings.validate_llm_config()
        if not is_valid:
            click.echo("❌ LLM設定エラー:")
            for error in errors:
                click.echo(f"  - {error}")
            click.echo("\n.envファイルを確認してAPIキーを設定してください。")
            sys.exit(1)

        # Create LLM client
        click.echo(f"🤖 {settings.default_llm_provider.upper()} を使用します...")
        llm_client = create_default_client()

        # Create managers
        context_mgr = ContextManager(project_name)
        phase_mgr = PhaseManager()

        # Create interview engine
        engine = InterviewEngine(llm_client, phase_mgr, context_mgr)

        # Start interview
        engine.start_interview()

        # Generate specs for completed phases
        _generate_specs(context_mgr, phase_mgr, settings)

    except KeyboardInterrupt:
        click.echo("\n\nインタビューを中断しました。")
        click.echo(f"'sdd resume {project_name}' で再開できます。")
    except Exception as e:
        click.echo(f"\n❌ エラーが発生しました: {e}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument("project_name")
def resume(project_name: str):
    """中断したインタビューを再開"""
    try:
        settings = get_settings()

        # Validate LLM configuration
        is_valid, errors = settings.validate_llm_config()
        if not is_valid:
            click.echo("❌ LLM設定エラー:")
            for error in errors:
                click.echo(f"  - {error}")
            sys.exit(1)

        # Create LLM client
        llm_client = create_default_client()

        # Load existing context
        context_mgr = ContextManager(project_name)
        phase_mgr = PhaseManager()

        # Check if context exists
        if not context_mgr.context.get("phases"):
            click.echo(f"❌ プロジェクト '{project_name}' が見つかりません。")
            click.echo(f"'sdd start {project_name}' で新規開始してください。")
            sys.exit(1)

        # Create interview engine
        engine = InterviewEngine(llm_client, phase_mgr, context_mgr)

        # Resume interview
        engine.resume_interview()

        # Generate specs for completed phases
        _generate_specs(context_mgr, phase_mgr, settings)

    except KeyboardInterrupt:
        click.echo("\n\nインタビューを中断しました。")
    except Exception as e:
        click.echo(f"\n❌ エラーが発生しました: {e}", err=True)
        sys.exit(1)


@cli.command(name="list")
def list_projects():
    """保存されているプロジェクト一覧を表示"""
    state_dir = Path(".interview_state")

    if not state_dir.exists():
        click.echo("保存されているプロジェクトはありません。")
        return

    projects = list(state_dir.glob("*.json"))

    if not projects:
        click.echo("保存されているプロジェクトはありません。")
        return

    click.echo("保存されているプロジェクト:\n")
    for project_file in projects:
        project_name = project_file.stem
        context_mgr = ContextManager(project_name)
        current_phase = context_mgr.get_current_phase()
        click.echo(f"  - {project_name} (現在: フェーズ{current_phase})")


@cli.command()
@click.argument("project_name")
def status(project_name: str):
    """プロジェクトの進捗状況を表示"""
    try:
        context_mgr = ContextManager(project_name)

        if not context_mgr.context.get("phases"):
            click.echo(f"❌ プロジェクト '{project_name}' が見つかりません。")
            sys.exit(1)

        click.echo(f"\nプロジェクト: {project_name}")
        click.echo(f"現在のフェーズ: {context_mgr.get_current_phase()}")
        click.echo("\n進捗状況:")

        phase_mgr = PhaseManager()

        for phase_num in range(1, 8):
            phase_info = phase_mgr.get_phase_info(phase_num)
            is_complete = context_mgr.is_phase_complete(phase_num)
            status_icon = "✓" if is_complete else "○"
            click.echo(f"  {status_icon} フェーズ{phase_num}: {phase_info.name}")

    except Exception as e:
        click.echo(f"\n❌ エラーが発生しました: {e}", err=True)
        sys.exit(1)


def _generate_specs(context_mgr: ContextManager, phase_mgr: PhaseManager, settings):
    """Generate Markdown specs for all completed phases."""
    generator = MarkdownGenerator(settings.output_dir)
    git_mgr = GitManager(settings.output_dir) if settings.auto_git_commit else None

    click.echo("\n" + "="*60)
    click.echo("仕様書を生成しています...")
    click.echo("="*60 + "\n")

    for phase_num in range(1, 8):
        if not context_mgr.is_phase_complete(phase_num):
            continue

        phase_info = phase_mgr.get_phase_info(phase_num)
        structured_data = context_mgr.get_structured_data(phase_num)

        if not structured_data:
            click.echo(f"⚠ フェーズ{phase_num}のデータがありません。スキップします。")
            continue

        try:
            file_path = generator.generate_spec(
                phase_num,
                phase_info.name,
                phase_info.filename,
                structured_data,
                context_mgr.project_name
            )
            click.echo(f"✓ 生成完了: {file_path}")

            # Auto-commit if enabled
            if git_mgr:
                git_mgr.commit_spec(
                    phase_info.filename,
                    phase_num,
                    phase_info.name
                )

        except Exception as e:
            click.echo(f"⚠ フェーズ{phase_num}の生成中にエラー: {e}")

    click.echo(f"\n出力ディレクトリ: {settings.output_dir}")


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
