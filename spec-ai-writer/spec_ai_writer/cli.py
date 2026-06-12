"""Command-line interface for Spec AIライター."""

import asyncio
import logging
import sys
import traceback
from importlib.metadata import version
from pathlib import Path

import click

from spec_ai_writer.config.settings import get_settings
from spec_ai_writer.core.context_manager import ContextManager
from spec_ai_writer.core.interview_engine import InterviewEngine
from spec_ai_writer.core.phase_manager import PhaseManager
from spec_ai_writer.generators.markdown_generator import MarkdownGenerator
from spec_ai_writer.git.git_manager import GitManager
from spec_ai_writer.llm.factory import create_default_client


@click.group()
@click.version_option(version=version("spec-ai-writer"))
@click.option(
    "--log-level",
    type=click.Choice(["debug", "info", "warning", "error"]),
    default="warning",
    show_default=True,
    help="ログ出力レベル",
)
@click.pass_context
def cli(ctx, log_level):
    """Spec AIライター - AI対話型仕様駆動開発支援ツール

    仕様駆動開発のためのインタビューを実施し、
    仕様書を自動生成するAI支援ツールです。
    """
    ctx.ensure_object(dict)
    ctx.obj["log_level"] = log_level
    logging.basicConfig(level=getattr(logging, log_level.upper()))


@cli.command()
@click.option("--provider", type=click.Choice(["claude", "openai", "bedrock"]), help="LLM provider")
@click.pass_context
def start(ctx, provider: str):
    """新しいプロジェクトのインタビューを開始"""
    log_level = ctx.obj["log_level"]
    try:
        settings = get_settings()

        # Override provider if specified
        if provider:
            settings.default_llm_provider = provider

        # Validate LLM configuration
        is_valid, errors = settings.validate_llm_config()
        if not is_valid:
            click.echo("LLM設定エラー:")
            for error in errors:
                click.echo(f"  - {error}")
            click.echo("\n.envファイルを確認してAPIキーを設定してください。")
            sys.exit(1)

        # Prompt for display name interactively
        display_name = click.prompt("プロジェクト名を入力してください")

        # Create project with auto-generated ID
        context_mgr = ContextManager.create_project(
            display_name=display_name,
            data_dir=settings.data_dir
        )

        click.echo(f"プロジェクトID: {context_mgr.project_id}")

        # Create LLM client
        click.echo(f"{settings.default_llm_provider.upper()} を使用します...")
        llm_client = create_default_client()

        # Create managers
        phase_mgr = PhaseManager()

        # Create interview engine
        engine = InterviewEngine(llm_client, phase_mgr, context_mgr)

        # Start interview
        asyncio.run(engine.start_interview())

        # Generate specs for completed phases
        _generate_specs(context_mgr, phase_mgr, settings, log_level)

    except KeyboardInterrupt:
        click.echo("\n\nインタビューを中断しました。")
        click.echo(f"'spec resume {context_mgr.project_id}' で再開できます。")
    except Exception as e:
        click.echo(f"\nエラーが発生しました: {e}", err=True)
        if log_level == "debug":
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument("project_id")
@click.pass_context
def resume(ctx, project_id: str):
    """中断したインタビューを再開"""
    log_level = ctx.obj["log_level"]
    try:
        settings = get_settings()

        # Validate LLM configuration
        is_valid, errors = settings.validate_llm_config()
        if not is_valid:
            click.echo("LLM設定エラー:")
            for error in errors:
                click.echo(f"  - {error}")
            sys.exit(1)

        # Create LLM client
        llm_client = create_default_client()

        # Load existing context
        try:
            context_mgr = ContextManager.load_project(project_id, data_dir=settings.data_dir)
        except FileNotFoundError:
            click.echo(f"プロジェクト '{project_id}' が見つかりません。")
            click.echo("'spec list' でプロジェクト一覧を確認してください。")
            sys.exit(1)

        phase_mgr = PhaseManager()

        # Check if context exists
        if not context_mgr.context.get("phases"):
            click.echo(f"プロジェクト '{project_id}' にはインタビューデータがありません。")
            sys.exit(1)

        # Create interview engine
        engine = InterviewEngine(llm_client, phase_mgr, context_mgr)

        # Resume interview
        asyncio.run(engine.resume_interview())

        # Generate specs for completed phases
        _generate_specs(context_mgr, phase_mgr, settings, log_level)

    except KeyboardInterrupt:
        click.echo("\n\nインタビューを中断しました。")
    except Exception as e:
        click.echo(f"\nエラーが発生しました: {e}", err=True)
        if log_level == "debug":
            traceback.print_exc()
        sys.exit(1)


@cli.command(name="list")
def list_projects():
    """保存されているプロジェクト一覧を表示"""
    settings = get_settings()
    project_list = ContextManager.list_projects(data_dir=settings.data_dir)

    if not project_list:
        click.echo("保存されているプロジェクトはありません。")
        return

    click.echo("保存されているプロジェクト:\n")
    for proj in project_list:
        project_id = proj["project_id"]
        display_name = proj.get("display_name", "")
        current_phase = proj.get("current_phase", 1)
        name_part = f" ({display_name})" if display_name else ""
        click.echo(f"  - {project_id}{name_part} (現在: フェーズ{current_phase})")


@cli.command()
@click.argument("project_id")
@click.pass_context
def status(ctx, project_id: str):
    """プロジェクトの進捗状況を表示"""
    log_level = ctx.obj["log_level"]
    try:
        settings = get_settings()

        try:
            context_mgr = ContextManager.load_project(project_id, data_dir=settings.data_dir)
        except FileNotFoundError:
            click.echo(f"プロジェクト '{project_id}' が見つかりません。")
            sys.exit(1)

        display_name = context_mgr.display_name
        name_part = f" ({display_name})" if display_name else ""
        click.echo(f"\nプロジェクト: {project_id}{name_part}")
        click.echo(f"現在のフェーズ: {context_mgr.get_current_phase()}")
        click.echo("\n進捗状況:")

        phase_mgr = PhaseManager()

        for phase_num in range(1, 8):
            phase_info = phase_mgr.get_phase_info(phase_num)
            is_complete = context_mgr.is_phase_complete(phase_num)
            status_icon = "+" if is_complete else "o"
            click.echo(f"  {status_icon} フェーズ{phase_num}: {phase_info.name}")

    except Exception as e:
        click.echo(f"\nエラーが発生しました: {e}", err=True)
        if log_level == "debug":
            traceback.print_exc()
        sys.exit(1)


def _generate_specs(context_mgr: ContextManager, phase_mgr: PhaseManager, settings, log_level: str = "warning"):
    """Generate Markdown specs for all completed phases."""
    specs_dir = context_mgr.get_specs_dir()
    generator = MarkdownGenerator(specs_dir)
    git_mgr = GitManager(str(specs_dir)) if settings.auto_git_commit else None

    click.echo("\n" + "="*60)
    click.echo("仕様書を生成しています...")
    click.echo("="*60 + "\n")

    for phase_num in range(1, 8):
        if not context_mgr.is_phase_complete(phase_num):
            continue

        phase_info = phase_mgr.get_phase_info(phase_num)
        structured_data = context_mgr.get_structured_data(phase_num)

        if not structured_data:
            click.echo(f"フェーズ{phase_num}のデータがありません。スキップします。")
            continue

        try:
            file_path = generator.generate_spec(
                phase_num,
                phase_info.name,
                phase_info.filename,
                structured_data,
                context_mgr.display_name
            )
            click.echo(f"+ 生成完了: {file_path}")

            # Auto-commit if enabled
            if git_mgr:
                git_mgr.commit_spec(
                    phase_info.filename,
                    phase_num,
                    phase_info.name
                )

        except Exception as e:
            click.echo(f"フェーズ{phase_num}の生成中にエラー: {e}", err=True)
            if log_level == "debug":
                traceback.print_exc()

    click.echo(f"\n出力ディレクトリ: {specs_dir}")


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
