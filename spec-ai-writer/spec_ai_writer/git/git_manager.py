"""Git manager for auto-committing generated specifications."""

from pathlib import Path
from typing import Optional

import git


class GitManager:
    """Manages Git operations for the SDD project."""

    def __init__(self, repo_path: str):
        """
        Initialize Git manager.

        Args:
            repo_path: Path to the Git repository
        """
        self.repo_path = Path(repo_path).resolve()
        self.repo: Optional[git.Repo] = None

        if self.is_git_repo():
            self.repo = git.Repo(self.repo_path)

    def is_git_repo(self) -> bool:
        """
        Check if the path is a Git repository.

        Returns:
            True if it's a Git repo
        """
        try:
            git.Repo(self.repo_path)
            return True
        except (git.InvalidGitRepositoryError, git.NoSuchPathError):
            return False

    def init_repo(self) -> None:
        """Initialize a new Git repository."""
        if not self.repo_path.exists():
            self.repo_path.mkdir(parents=True)

        self.repo = git.Repo.init(self.repo_path)

        # Create .gitignore if it doesn't exist
        gitignore_path = self.repo_path / ".gitignore"
        if not gitignore_path.exists():
            gitignore_content = """# Spec AIライター
.interview_state/
*.pyc
__pycache__/
.DS_Store
"""
            gitignore_path.write_text(gitignore_content)
            self.repo.index.add([".gitignore"])
            self.repo.index.commit("Initial commit: Add .gitignore")

    def commit_spec(
        self,
        file_path: str,
        phase_num: int,
        phase_name: str,
        message: Optional[str] = None
    ) -> None:
        """
        Commit a specification file.

        Args:
            file_path: Path to the spec file (relative to repo)
            phase_num: Phase number
            phase_name: Phase name
            message: Custom commit message (optional)
        """
        if not self.repo:
            if not self.is_git_repo():
                self.init_repo()
            else:
                self.repo = git.Repo(self.repo_path)

        # Stage the file
        try:
            self.repo.index.add([file_path])
        except Exception as e:
            print(f"Warning: Could not stage file {file_path}: {e}")
            return

        # Create commit message
        if message is None:
            message = self._generate_commit_message(phase_num, phase_name)

        # Commit
        try:
            self.repo.index.commit(message)
            print(f"✓ Gitにコミットしました: {file_path}")
        except Exception as e:
            print(f"Warning: Could not commit {file_path}: {e}")

    def _generate_commit_message(self, phase_num: int, phase_name: str) -> str:
        """
        Generate a commit message for a spec file.

        Args:
            phase_num: Phase number
            phase_name: Phase name

        Returns:
            Commit message
        """
        return f"""Add SDD Phase {phase_num:02d}: {phase_name}

仕様駆動開発 フェーズ{phase_num} の仕様書を生成しました。

🤖 Generated with Spec AIライター
"""

    def get_status(self) -> str:
        """
        Get Git status.

        Returns:
            Status string
        """
        if not self.repo:
            return "Not a Git repository"

        try:
            return self.repo.git.status()
        except Exception as e:
            return f"Error getting status: {e}"

    def is_clean(self) -> bool:
        """
        Check if working directory is clean.

        Returns:
            True if no uncommitted changes
        """
        if not self.repo:
            return True

        try:
            return not self.repo.is_dirty()
        except Exception:
            return True
