# Spec AIライター クイックスタートガイド

このガイドでは、Spec AIライターを使って最初の仕様書を生成するまでの手順を説明します。

## 前提条件

- Python 3.9以上がインストールされている
- [uv](https://docs.astral.sh/uv/) がインストールされている
- LLM API キー、または OpenAI 互換エンドポイント（Claude / OpenAI 公式 / OpenRouter / AWS Bedrock のいずれか）を持っている。ローカル LLM（Ollama / LM Studio / llama.cpp）を使う場合は API キー不要

## セットアップ（5分）

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd spec-ai-writer
```

### 2. 依存パッケージをインストール

```bash
uv sync
```

### 3. 環境変数を設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、使用するLLMプロバイダーのAPIキーを設定:

```env
# 使用するプロバイダーのキーのみ設定すればOK
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# claude / openai / bedrock から選択。OpenRouter・ローカル LLM は openai に
# OPENAI_BASE_URL を組み合わせて使います（下記参照）。
DEFAULT_LLM_PROVIDER=claude
```

OpenRouter やローカル LLM (Ollama / LM Studio / llama.cpp) を使う場合は、`DEFAULT_LLM_PROVIDER=openai` にした上で `OPENAI_BASE_URL` と `OPENAI_MODEL` を設定します（ローカル LLM では `OPENAI_API_KEY` は空欄で可）。

```env
# 例: OpenRouter
DEFAULT_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-or-v1-xxxxxxxx
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=anthropic/claude-3.5-sonnet

# 例: Ollama（ローカル）
DEFAULT_LLM_PROVIDER=openai
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1:8b
```

各プロバイダーの詳細な設定手順は [LLM_SETUP.md](./docs/LLM_SETUP.md) を参照してください。Web UI を起動したあとはダッシュボードの **「設定」** ページからも編集できます。

## 使い方

### 新しいプロジェクトのインタビューを開始

```bash
uv run python -m spec_ai_writer.main start
```

または、パッケージとしてインストール済みの場合:

```bash
spec start
```

### インタビューの流れ

1. システムが「フェーズ1: 原則決定工程」を開始
2. LLMが質問を生成
3. あなたが回答を入力
4. 5〜10個の質問に答えます
5. システムが情報を整理し、仕様書を生成
6. 自動的にGitコミット（設定している場合）

### 実行例

```
% uv run python -m spec_ai_writer.main start
プロジェクト名を入力してください: my-project
プロジェクトID: 543501a0
CLAUDE を使用します...

============================================================
仕様駆動開発（SDD）インタビューを開始します
プロジェクト: 543501a0
現在のフェーズ: 1
============================================================


────────────────────────────────────────────────────────────
フェーズ 1: 原則決定工程
プロジェクトの存在意義・原則・制約条件を明文化し、合意形成する
────────────────────────────────────────────────────────────

# フェーズ1: 原則決定工程

プロジェクトの存在意義・原則・制約条件を明文化し、合意形成する

このフェーズでは、以下の情報を収集します：
- 背景
- 目的
- 基本原則
- 含まれるもの（スコープ内）
- 含まれないもの（スコープ外）
- 制約条件
- ステークホルダー
- 成功基準

これから質問をしていきますので、できるだけ詳しく答えてください。


質問: このプロジェクトが立ち上がった背景を教えていただけますか？
つまり、現在どのような問題や課題があって、なぜこのプロジェクトが
必要になったのかを聞かせてください。
回答:
```

LLMからの質問に答えていくと、各フェーズの仕様書が自動的に生成されます。

### 中断と再開

#### 中断方法
- `Ctrl+C` を押す
- または `exit` と入力

#### 再開方法
```bash
uv run python -m spec_ai_writer.main resume <project_id>
```

プロジェクトIDは `spec list` で確認できます。

### プロジェクト一覧を確認

```bash
uv run python -m spec_ai_writer.main list
```

### 進捗状況を確認

```bash
uv run python -m spec_ai_writer.main status <project_id>
```

## Tips

1. **具体的に答える**: LLMは詳細な情報から正確な仕様書を生成できます
2. **箇条書きを活用**: 複数の項目がある場合は箇条書きで答えると整理されます
3. **こまめに保存**: `Ctrl+C`で中断しても、進捗は自動保存されます
4. **Git管理**: 生成された仕様書はGit管理されるので、変更履歴を追跡できます

## 次のステップ

1. フェーズ1が完了したら、システムが自動的にフェーズ2（企画・要件定義）に進みます
2. すべてのフェーズ（1-7）を完了すると、プロジェクトの完全な仕様書セットが生成されます
3. 生成された仕様書は `data/{project_id}/specs/` ディレクトリで確認できます

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
