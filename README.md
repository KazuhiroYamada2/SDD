> [!NOTE]
> **日本語版をお探しの方へ**
> このリポジトリは書籍『仕様駆動開発 実践入門』の練習用リポジトリです。
> 日本語の README は [README_ja.md](./README_ja.md) をご覧ください。
> **書籍の正誤表は[こちら](./docs/guides/errata.md)です。**

# SDD (Spec-Driven Development) Practice Repository

[English](./README.md) | [日本語](./README_ja.md)

[![Elvez](https://img.shields.io/badge/Elvez-Product-3F61A7?style=flat-square)](https://elvez.co.jp/)
[![IXV Ecosystem](https://img.shields.io/badge/IXV-Ecosystem-3F61A7?style=flat-square)](https://elvez.co.jp/ixv/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/elvezjp/SDD?style=social)](https://github.com/elvezjp/SDD/stargazers)

This repository is the **practice repository** used in *Spec-Driven Development: A Practical Introduction*.
In the book, it is referred to as the "practice repository" or "SDD repository."

The name "SDD" stands for **Spec-Driven Development**. This remote repository contains sample files organized around the "4 Principles and 7 Processes of Spec-Driven Development" described in the book, and serves as **a reference for how to structure a repository in real projects**.

> For readers of the book: Please check the [Errata](./docs/guides/errata.md) for any known corrections.

## Purpose of This Repository

By referencing this remote repository, you can better understand the overall picture of Spec-Driven Development.
This repository lets you practice writing specifications with Cursor while reading the book:

- Cloning or forking a remote repository with Cursor
- Editing README.md in your local clone of the forked repository
- Improving specifications through dialogue with AI
- Basic Git operations (commit, push)

For the editing exercise, fork this repository and clone your fork locally. See [Fork vs Clone](#fork-vs-clone-important) for the distinction.

## Use Cases

- **Book Practice**: Follow along with *Spec-Driven Development: A Practical Introduction* and explore the 7-process sample files hands-on
- **Spec-Driven Development Adoption Reference**: Use this repository as a structural template when introducing Spec-Driven Development to your team or organization
- **Learning How to Write Specifications**: Refer to concrete examples of each process deliverable (project charters, specifications, design plans, etc.)

---

## Fork vs Clone (Important)

GitHub has two similar but distinct operations: **Fork** and **Clone**. It is important to use each one for the right purpose.

### What is a Fork?
- Copies this repository **under your own GitHub account**
- Since it becomes your own repository, you can:
  - Edit it freely
  - Commit and push changes
  - Work without affecting the original repository

### What is a Clone?
- Copies a GitHub repository **to your local machine (PC)**
- Cloning alone does not create your own repository on GitHub

### Fork vs Clone Comparison

| Item | Fork (operation on GitHub) | Direct Clone (saves to local repository) |
|------|---------------------------|------------------------------------------|
| Creates your own repository on GitHub | ✅ | ❌ |
| Allows local editing after cloning | ✅ | ✅ |
| Allows pushing to your own GitHub repository | Yes, to your fork | Requires a repository you can write to |
| Failures don't affect the original repository | ✅ | ✅ |
| Can submit Pull Requests | From a branch pushed to your fork | Requires pushing a branch to a repository you can write to |
| For reference/viewing only | △ | ✅ |
| Recommended use in this repository | **Editing & Practice** | **Viewing Only** |

## Usage

### Prerequisites

- A GitHub account for creating a fork and sharing your changes
- Git installed locally for cloning, committing, and pushing
- Cursor for the book's AI-assisted exercises; another Markdown editor can be used for document editing
- Access to an AI chat feature if you want to practice AI-assisted review

The document exercise does not require Python, Node.js, or the optional `spec-ai-writer` tool. That tool has its own [setup requirements](spec-ai-writer/README.md).

In the instructions below, **upstream** means `elvezjp/SDD`, **your fork** means the copy under your GitHub account, and **local clone** means the working folder on your PC. Push exercise changes to your fork. Pushing to upstream requires write permission.

### 1. Fork and Clone for Practice

**Recommended: Fork**

1. Open this remote repository on GitHub (https://github.com/elvezjp/SDD)
2. Click the "Fork" button in the upper right to fork it to your account
3. In a terminal, replace `YOUR-USERNAME` with your GitHub username and run:

   ```sh
   git clone https://github.com/YOUR-USERNAME/SDD.git
   cd SDD
   ```

4. Open the cloned `SDD` folder in Cursor.

**For Reference Only (Direct Clone)**

You can read the files on GitHub without installing anything, or clone upstream for local reference:

```sh
git clone https://github.com/elvezjp/SDD.git
```

For the editing and sharing exercise below, use a clone of your fork.

### 2. Open and Review README.md

Open `README.md` in your local clone, then read [the sample guide](examples/README.md). The files in `examples/` illustrate deliverables for a Customer Management System; use them as references when writing your own specifications.

### 3. Complete a First Exercise

For this introductory exercise, use the following layout in your fork:

| Location | What to write |
|----------|---------------|
| `README.md` | Your project's purpose, intended users, scope, and links to detailed specifications |
| `specs/` (create this folder) | Your project's specifications, based on copies of the relevant sample files |
| `examples/` | The original reference samples |

1. Read `examples/02-planning-requirement.md` and copy it to `specs/02-planning-requirement.md`.
2. Change one requirement for your chosen project. State who needs it, the expected behavior, and how you will check that it works.
3. Ask the AI: "Read specs/02-planning-requirement.md. Identify ambiguous requirements and suggest acceptance criteria. List questions instead of inventing missing requirements."
4. Review the suggestions and revise the specification. Record unresolved questions explicitly. For individual practice, you make the decisions; in team work, have the relevant stakeholders review them.
5. Add a short project overview and a link to your specification in your fork's README.

**Completion criteria**: You have one revised requirement with a checkable acceptance criterion, have reviewed the AI's suggestions, and can explain the changes in the saved diff. After step 4 below, the changes are committed and visible in your fork. Completing all seven processes is a later exercise.

### 4. Review, Commit, and Share Your Changes

1. Save your files and inspect the changes in Cursor's Source Control panel, including newly created files.
2. Run `git remote -v` in the local clone and check that the push URL for `origin` points to your fork (`YOUR-USERNAME/SDD`). If it points to upstream, return to step 1 and use your fork's clone before pushing.
3. Stage the intended files and commit with a message describing the change.
4. Push the commit to your fork and open it on GitHub to confirm that the changes appear.

See the [Git command reference](docs/tools/git-commands.md) and [troubleshooting guide](docs/guides/troubleshooting.md) for more help.

## Directory Structure

```
SDD/
├── README.md                    # This file (English)
├── README_ja.md                 # Japanese version
├── LICENSE                      # MIT License
├── CONTRIBUTING.md              # Contribution guidelines
├── SECURITY.md                  # Security policy
├── CHANGELOG.md                 # Version history
├── docs/                        # Supplementary materials
│   ├── README.md               # Guide index
│   ├── conversion/             # Conversion guides
│   │   ├── markdown-basics.md  # Markdown basics
│   │   ├── word-excel-conversion-guide.md # Word/Excel to Markdown guide
│   │   └── oasys-ichitaro-conversion-guide.md # OASYS/Ichitaro to Markdown guide
│   ├── tools/                  # Tool-related
│   │   ├── cursor-videos.md    # Cursor video list
│   │   ├── git-commands.md     # Git command reference
│   │   ├── prompts.md          # Prompt collection (for Cursor, GitHub Copilot)
│   │   └── scripts.md          # Script collection (CI/CD settings, Git hooks, etc.)
│   └── guides/                 # Practical guides
│       ├── scale-based-practice-guide.md  # Scale-based practice guide
│       ├── 90-day-introduction-plan.md    # 90-day introduction plan
│       ├── security-privacy-guide.md      # Security and privacy guide (regulated industries/public agencies)
│       ├── troubleshooting.md  # Troubleshooting
│       ├── markdown-friendly-document-creation.md # How to create Markdown-friendly documents
│       └── errata.md           # Book errata
├── examples/                    # Sample files (one file per process)
│   ├── 01-principle-definition.md      # Principle definition process
│   ├── 02-planning-requirement.md      # Planning & requirements process
│   ├── 03-design-planning.md            # Design planning process
│   ├── 04-task-breakdown.md              # Task breakdown process
│   ├── 05-implementation.md             # Implementation process
│   ├── 06-verification-acceptance.md    # Verification & acceptance process
│   ├── 07-migration-operation.md        # Migration & operations process
│   └── README.md                        # Sample file descriptions
└── spec-ai-writer/              # Spec-Driven Development support AI tool (optional)
    ├── README.md               # Tool description
    └── ...                     # Tool implementation files
```

## The 4 Principles and 7 Processes of Spec-Driven Development

This remote repository is structured around the following principles and processes:

### 4 Principles

1. **Specifications are "living documents"**: They evolve alongside the project
2. **Specifications are the "single source of truth"**: Referenced by all team members
3. **Specifications assume "change and iteration"**: Updated while recording change history
4. **Reduce costs with AI**: Leverage AI for specification refinement and review

### 7 Processes

Each process is managed in a single Markdown file:

1. **Principle Definition**: [`examples/01-principle-definition.md`](examples/01-principle-definition.md) (Project Charter)
2. **Planning & Requirements**: [`examples/02-planning-requirement.md`](examples/02-planning-requirement.md) (Specification)
3. **Design Planning**: [`examples/03-design-planning.md`](examples/03-design-planning.md) (Design Plan)
4. **Task Breakdown**: [`examples/04-task-breakdown.md`](examples/04-task-breakdown.md) (Task Breakdown)
5. **Implementation**: [`examples/05-implementation.md`](examples/05-implementation.md) (Implementation Log)
6. **Verification & Acceptance**: [`examples/06-verification-acceptance.md`](examples/06-verification-acceptance.md) (Verification Log)
7. **Migration & Operations**: [`examples/07-migration-operation.md`](examples/07-migration-operation.md) (Operations Log)

For a full practice project, start with processes 1–4 to establish purpose, requirements, design, and tasks. Use processes 5–7 to record implementation, verification, and operation as those activities take place. If you are only practicing specification writing, record that scope and leave later activities pending.

The process numbers provide a reading order, and the documents evolve through iteration. For example, when a requirement changes in process 2, review the affected design, tasks, and acceptance criteria in processes 3, 4, and 6. Record the reason for the change in the commit and identify any follow-up work.

## Sample Project: Customer Management System

The `examples/` directory contains a sample "Customer Management System" specification covering all 7 processes:

- **Principle Definition**: How to write a project charter
- **Planning & Requirements**: How to write a specification and operate by the 4 principles
- **Design Planning**: Technology stack selection and AI utilization examples
- **Task Breakdown**: Task decomposition granularity and progress management
- **Implementation**: AI-assisted implementation and review records
- **Verification & Acceptance**: Specification diff reports and acceptance testing
- **Migration & Operations**: Operations improvement cycles and feedback integration

Each sample file clearly indicates which process it belongs to.

## spec-ai-writer (Specification Generation Tool)

The `spec-ai-writer/` directory contains an optional AI tool that supports Spec-Driven Development. It conducts interviews via LLM API and automatically generates specification documents for all 7 processes. Review generated documents before adopting them. The tool's README lists environment requirements for its CLI and web interface.

For setup instructions and usage details, see [spec-ai-writer/README.md](spec-ai-writer/README.md).

## FAQ

### Q: Can I edit this remote repository?

A: You can edit files in a local clone. To save your exercise changes on GitHub, follow [the fork and clone instructions](#1-fork-and-clone-for-practice). To propose changes to upstream, follow [CONTRIBUTING.md](CONTRIBUTING.md).

### Q: What should I do if I encounter an error?

A: The [troubleshooting guide](docs/guides/troubleshooting.md) contains common errors and their solutions. Please check there first. If the issue remains unresolved, ask a question in [GitHub Issues](https://github.com/elvezjp/SDD/issues).

### Q: Which should I use—the repository I created in Chapter 1, or this one?

A: Either is fine. If you already created a repository in Chapter 1, you can continue using that. This remote repository is for those who skipped Chapter 1 or want to practice with a fresh repository.

## About the Book

This remote repository is used in the following book:

**"Spec-Driven Development: A Practical Introduction"**

This repository is the practice repository referenced throughout the entire book. Main usage locations:

- **Introduction**: Introduced as a source of practical resources (script collection, prompt collection, etc.)
- **Chapter 2**: Introduced in detail as the practice repository (Section 2.5 "Utilizing the Practice Repository (SDD Repository)")
- **Chapter 3**: Reference to Cursor video list (`docs/tools/cursor-videos.md`)
- **Chapter 4**: Reference to Git command reference (`docs/tools/git-commands.md`)
- **Chapter 5**: Reference to prompt collection (`docs/tools/prompts.md`) and 90-day introduction plan (`docs/guides/90-day-introduction-plan.md`)
- **Chapter 10**: References to various guides (Markdown basics, Word/Excel conversion, OASYS/Ichitaro conversion, etc.)
- **Chapter 11**: Reference to 90-day introduction plan (`docs/guides/90-day-introduction-plan.md`)
- **Chapter 12**: Reference to script collection (`docs/tools/scripts.md`) and security & privacy guide (`docs/guides/security-privacy-guide.md`)
- **Chapter 13**: References to 90-day introduction plan and prompt collection

You can use the resources in this repository to practice Spec-Driven Development while reading the book.

## YouTube Channel

We operate the YouTube channel **"ソフトウェアの作り方チャンネル Tech千一夜"**.

This channel shares information about Cursor and Spec-Driven Development. We explain practical usage and the latest information in video format, so please take a look.

We have also published a video summarizing responses and supplements to feedback received in reviews. Please check it out as well.  
https://youtu.be/DilSKvi4aQw

**Channel URL**: https://www.youtube.com/@tech1018/

**Cursor Video List**: [docs/tools/cursor-videos.md](docs/tools/cursor-videos.md) provides a list of Cursor-related videos.

## Next Steps

1. Complete [the first exercise](#3-complete-a-first-exercise).
2. Expand your project's `specs/` folder using the other process samples.
3. Review related documents together when requirements change, and commit the updates to your fork.

---

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [SECURITY.md](SECURITY.md) - Security policy

## Security

For security details, see [SECURITY.md](SECURITY.md).

- This repository includes documentation, sample files, and executable code in the optional `spec-ai-writer/` tool. See the tool's [README](spec-ai-writer/README.md) before running it.
- If you discover a vulnerability, please report it by email rather than opening a public Issue (info@elvez.co.jp)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

- Bug reports / typo fixes: [GitHub Issues](https://github.com/elvezjp/SDD/issues)
- Feature proposals (new samples/guides, etc.): [GitHub Issues](https://github.com/elvezjp/SDD/issues)
- Pull requests: [GitHub Pull Requests](https://github.com/elvezjp/SDD/pulls)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for details.

## Background

This tool was created as a small utility during the development of **IXV (Ixiv)**, a development support AI for Japanese development documents and specifications.

IXV addresses the challenges of understanding, structuring, and utilizing Japanese documents in system development. This repository publishes a portion of that work.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contact

- **Email**: info@elvez.co.jp
- **Recipient**: Elvez Inc. (株式会社エルブズ)
