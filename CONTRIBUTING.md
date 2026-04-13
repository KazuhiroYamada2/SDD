[English](./CONTRIBUTING.md) | [日本語](./CONTRIBUTING_ja.md)

# Contributing

Thank you for your interest in contributing to the SDD repository.

## How to Contribute

### Bug Reports

If you find errors in sample files, typos in documentation, or broken links, please create a GitHub Issue.

**Required information for Issue creation:**
- A clear and descriptive title
- Steps to reproduce the problem
- Expected behavior
- Actual behavior (for typos, include the specific location and content)
- Sample file or relevant excerpt where the issue was found (if possible)
- Version or commit hash of the file where the issue was found

### Feature Requests

Proposals to add new sample files or guides, or to improve existing content, are accepted via GitHub Issues.

**Required information for Issue creation:**
- A clear and descriptive title
- Detailed description of the proposed feature or addition
- Use cases and benefits
- Related examples or references (if available)

### Pull Requests

1. Fork this repository
2. Create a branch using the following naming convention:
   ```
   {GitHubUsername}/{YYYYMMDD}-{brief-description}
   ```
   Example: `yamada/20260226-examples-typo-fix`
3. Make changes following the [Coding Guidelines](#coding-guidelines)
4. Update related documentation as needed
5. Verify your changes using an AI agent (see [Running Tests](#running-tests))
6. Commit following the commit message rules (see [Commit Message Rules](#commit-message-rules))
7. Push your branch and submit a Pull Request
8. Respond to review feedback

## Development Environment Setup

**Prerequisites:**
- Git (recent version)
- Text editor (Cursor recommended)
- GitHub account

**Setup steps:**
```bash
# Clone your forked repository
git clone https://github.com/your-username/SDD.git
cd SDD
```

No additional dependencies are required. This repository consists solely of Markdown files.

## Running Tests

Since this repository consists solely of Markdown files, there is no source code test policy. Please verify changed documents using an **AI agent** as a substitute for testing.

**Verification steps:**

1. Open the changed file in Claude Code or Cursor
2. Ask the AI agent to verify the changes against the relevant rule file:

   ```
   @changed-file Does this file comply with @rule-file? Please check.
   ```

3. Fix all mandatory item deficiencies identified
4. Review recommended item suggestions and decide whether to address them

**Verification targets:**
- Document additions/changes → Cross-check with the corresponding rule file (e.g., `contributing-requirements.md`)
- Sample file changes → Cross-check with the Spec-Driven Development process guidelines

Submit your PR once the AI agent confirms no mandatory item deficiencies remain.

## Commit Message Rules

Use the following format:

```
<type>: <brief description>

<optional detailed description>
```

**Types:**
- `fix`: Bug fix or typo correction
- `docs`: Documentation update
- `feat`: Adding new sample files or guides
- `refactor`: Reorganizing or restructuring content without changing meaning
- `chore`: Repository configuration or maintenance

**Good examples:**
```
fix: Fix typo in examples/02-planning-requirement.md
docs: Add Git push error troubleshooting
feat: Add sample for multi-team projects
```

**Bad examples:**
```
Update file
Bug fix
```

When referencing an Issue or PR, add `Fixes #123` or `Refs #123` at the end of the commit message body.

## Coding Guidelines

Since this repository consists of Markdown files, please follow these guidelines:

- Use a hierarchical heading structure without skipping levels
- Specify language identifiers in code blocks (e.g., ` ```bash `, ` ```markdown `)
- Use relative paths for links within the repository (e.g., `[CHANGELOG.md](CHANGELOG.md)`)
- Use ISO 8601 format for dates (`YYYY-MM-DD`)

## Releasing `spec-ai-writer`

The `spec-ai-writer` sub-project ships as both a Python package and a React frontend bundled together. The version number **must be identical** in every location below; a mismatch between the Python package and the frontend makes release notes and support requests ambiguous.

When bumping the version (e.g. `1.0.3` → `1.0.4`), update **all** of the following in the same commit:

| File | Field |
|------|-------|
| `spec-ai-writer/pyproject.toml` | `[project] version` |
| `spec-ai-writer/frontend/package.json` | top-level `version` |
| `CHANGELOG.md` / `CHANGELOG_ja.md` | new `## [X.Y.Z] - YYYY-MM-DD` section |

After editing, run `uv sync --extra dev` inside `spec-ai-writer/` and `npm install` inside `spec-ai-writer/frontend/` to regenerate the lockfiles. The Python source and React component read the version at runtime, so no further edits are needed. A quick sanity check:

```bash
grep -E "^version" spec-ai-writer/pyproject.toml
grep '"version"' spec-ai-writer/frontend/package.json | head -1
```

Both lines should show the same version. If any drift is found, fix it in the same commit rather than deferring — out-of-band fixes make `git blame` harder to read.

## Contact

- **GitHub Issues**: [https://github.com/elvezjp/SDD/issues](https://github.com/elvezjp/SDD/issues)
- **Email**: info@elvez.co.jp
- **Recipient**: Elvez Inc. (株式会社エルブズ)
