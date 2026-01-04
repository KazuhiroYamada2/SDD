# Spec AIライター - 仕様駆動開発 インタビュー & 生成システム

LLM APIを使用してユーザーにインタビューを行い、仕様駆動開発（Specification Driven Development）の7つの仕様書を自動生成するAI支援Pythonプログラムです。

## 特徴

- 🤖 **LLMによる対話形式のインタビュー**: Claude、OpenAI、AWS Bedrockに対応
- 📝 **7つのフェーズを段階的に実施**: 原則定義から移行・運用まで
- 📄 **Markdown仕様書を自動生成**: 各フェーズ終了時に生成
- 🔄 **Git自動コミット**: 生成された仕様書を自動的にコミット
- 💾 **中断・再開機能**: インタビューを途中で保存して後で再開可能
- 🌐 **モダンWeb UI**: React + TypeScriptによるリアルタイムチャットUI
- 🚀 **CLI & Web両対応**: コマンドラインとブラウザから利用可能

## 7つのフェーズ

1. **原則定義** (`01-principle-definition.md`) - プロジェクト憲章
2. **企画・要件定義** (`02-planning-requirement.md`) - 要件仕様書
3. **設計計画** (`03-design-planning.md`) - 設計計画書
4. **タスク分割** (`04-task-breakdown.md`) - タスク分割書
5. **実装** (`05-implementation.md`) - 実装記録
6. **検証・受入** (`06-verification-acceptance.md`) - 検証記録
7. **移行・運用** (`07-migration-operation.md`) - 運用記録

## インストール

### 前提条件

- Python 3.9以上
- LLM APIキー（Claude、OpenAI、またはAWS Bedrockのいずれか）

### セットアップ

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd spec-ai-writer
```

2. 仮想環境を作成・有効化:
```bash
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
```

3. 依存パッケージをインストール:
```bash
pip install -r requirements.txt
```

または開発版として:
```bash
pip install -e ".[dev]"
```

4. 環境変数を設定:
```bash
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

### 環境変数の設定

`.env`ファイルで以下を設定してください:

```env
# LLM APIキー（使用するプロバイダーのキーのみ設定すればOK）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# AWS Bedrock用（Bedrockを使用する場合）
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-west-2

# 設定
DEFAULT_LLM_PROVIDER=claude  # claude, openai, bedrockから選択
OUTPUT_DIR=./spec_output
AUTO_GIT_COMMIT=true
TEMPERATURE=0.7
```

## 使用方法

### Web UI (推奨)

モダンなブラウザUIでインタビューを実施できます。

#### モックモード（APIキー不要）

APIキーを設定せずにUIを確認したい場合は、モックモードを使用できます。

1. **フロントエンド開発サーバー起動**:
```bash
cd frontend
npm install  # 初回のみ
VITE_USE_MOCK_API=true npm run dev
```

または、`.env`ファイルを作成:
```env
VITE_USE_MOCK_API=true
```

2. ブラウザで http://localhost:3000 を開きます。

モックモードでは、実際のLLM APIを呼び出さずに、サンプルデータでUIを確認できます。ダッシュボードにはモックモードであることが表示されます。

#### 通常モード（LLM API使用）

実際のLLM APIを使用する場合:

1. **バックエンドサーバー起動**:
```bash
# spec-ai-writer/ ディレクトリで
python -m spec_ai_writer.web.app
```

サーバーが http://localhost:8000 で起動します。

2. **フロントエンド開発サーバー起動** (別ターミナル):
```bash
cd frontend
npm install  # 初回のみ
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

3. **使い方**:
   - ダッシュボードで新規プロジェクト作成
   - 「インタビュー開始」ボタンをクリック
   - チャット形式でLLMと対話
   - 各フェーズ完了時に仕様書が自動生成
   - 生成された仕様書をプレビュー・ダウンロード

### CLI (コマンドライン)

ターミナルから直接インタビューを実施できます。

1. **初期設定** (初回のみ):
```bash
spec init
```

対話形式で設定を行います。

2. **インタビュー開始**:
```bash
spec start my-project
```

`my-project`はプロジェクト名です。LLMが7つのフェーズについて順番に質問を行います。

3. **インタビュー再開**:
```bash
spec resume my-project
```

中断したインタビューを再開できます。

### LLMプロバイダーの選択

#### Claude (Anthropic API)

`.env`ファイル:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
DEFAULT_LLM_PROVIDER=claude
```

#### OpenAI (GPT-4 / GPT-3.5-turbo)

OpenAI APIを使用してGPT-4やGPT-3.5-turboでインタビューを実施できます。

**セットアップ:**

1. OpenAI APIキーを取得: https://platform.openai.com/api-keys

2. `.env`ファイルを設定:
```env
OPENAI_API_KEY=sk-...
DEFAULT_LLM_PROVIDER=openai
```

3. openaiパッケージをインストール:
```bash
pip install openai
```

**利用可能なモデル:**
- `gpt-4-turbo-preview` (デフォルト) - 最新のGPT-4 Turbo
- `gpt-4` - GPT-4 (8K context)
- `gpt-4-32k` - GPT-4 (32K context)
- `gpt-3.5-turbo` - GPT-3.5 Turbo (コスト効率が良い)
- `gpt-3.5-turbo-16k` - GPT-3.5 Turbo (16K context)

**料金 (2024年12月時点):**
- GPT-4 Turbo: 入力 $10/MTok、出力 $30/MTok
- GPT-4: 入力 $30/MTok、出力 $60/MTok
- GPT-3.5 Turbo: 入力 $0.50/MTok、出力 $1.50/MTok

#### AWS Bedrock (エンタープライズ向け)

AWS Bedrockを使用すると、既存のAWSインフラ内でClaudeモデルを実行できます。

**クイックスタート:**

1. boto3をインストール:
```bash
pip install boto3
```

2. `.env`ファイルを設定:
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
DEFAULT_LLM_PROVIDER=bedrock
```

3. AWS Consoleでモデルアクセスを有効化:
   - AWS Bedrock → Model access → Claude 3.5 Sonnetを有効化

**詳細な設定手順:**

Bedrock固有の設定、IAMポリシー、VPC Endpoint、コスト最適化などの詳細は、[BEDROCK_SETUP.md](./docs/BEDROCK_SETUP.md)を参照してください。

### コマンド一覧

- `spec init` - 初期設定ウィザード
- `spec start <project-name>` - 新規インタビュー開始
- `spec resume <project-name>` - インタビュー再開
- `spec list` - 保存されているプロジェクト一覧
- `spec status <project-name>` - プロジェクトの進捗状況表示

## プロジェクト構造

```
spec-ai-writer/
├── config/
│   ├── settings.py              # 設定管理
│   └── prompts/                 # 各フェーズのシステムプロンプト
├── spec_ai_writer/
│   ├── core/
│   │   ├── interview_engine.py  # インタビュー制御の中核
│   │   ├── phase_manager.py     # 7フェーズの進行管理
│   │   └── context_manager.py   # コンテキスト管理
│   ├── llm/
│   │   ├── base.py              # LLM抽象インターフェース
│   │   ├── claude_client.py     # Claude API実装
│   │   ├── openai_client.py     # OpenAI API実装 (予定)
│   │   ├── bedrock_client.py    # AWS Bedrock実装
│   │   └── factory.py           # LLMクライアントファクトリ
│   ├── generators/
│   │   └── markdown_generator.py # Markdown生成
│   └── git/
│       └── git_manager.py       # Git操作
└── templates/                   # Jinja2テンプレート
    ├── 01-principle-definition.md.jinja2
    ├── 02-planning-requirement.md.jinja2
    └── ...
```

## 開発

### 開発環境のセットアップ

```bash
pip install -e ".[dev]"
```

### テストの実行

```bash
pytest
```

### コードフォーマット

```bash
black spec_ai_writer/ config/
flake8 spec_ai_writer/ config/
```

### 型チェック

```bash
mypy spec_ai_writer/
```

## アーキテクチャ

### コアコンポーネント

1. **InterviewEngine**: インタビュー全体のオーケストレーション
2. **PhaseManager**: 7フェーズのワークフロー管理
3. **ContextManager**: 質問・回答履歴の管理と永続化
4. **LLMClients**: 複数のLLM API統合
5. **MarkdownGenerator**: テンプレートからMarkdown生成
6. **GitManager**: Git自動コミット

### データフロー

```
User Input → Interview Engine → LLM Client → Question
                ↓
User Answer → Context Manager → Save to .interview_state/
                ↓
Phase Complete → Markdown Generator → Generate Spec File
                ↓
            Git Manager → Auto Commit
```

## ドキュメント

詳細な内部仕様については、[docs/SPEC.md](./docs/SPEC.md) を参照してください。

SPEC.mdには以下の内容が記載されています：
- システム構成とアーキテクチャ
- 機能要件の詳細
- 画面仕様とUI設計
- API仕様とWebSocketメッセージ形式
- データモデルとスキーマ定義
- 処理フローの詳細
- CLI仕様
- 設定仕様と環境変数

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueで議論してください。

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

## 関連プロジェクト

- [SDD](https://github.com/elvezjp/SDD) - 仕様駆動開発のサンプルリポジトリ

## クレジット

このプロジェクトは『仕様駆動開発 実践入門』の内容に基づいて開発されました。
