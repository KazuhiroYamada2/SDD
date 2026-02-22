# 修正計画書：02-planning-requirement.md 準拠

このドキュメントは、`02-planning-requirement.md`（企画・要件定義工程）の仕様と現在の実装の差分を整理し、修正計画を記載します。

## 修正方針

仕様駆動開発の原則に基づき、`02-planning-requirement.md` に定義された仕様を正とし、現在の実装との差分を体系的に解消します。修正は重大度の高い項目（データ構造・プロジェクト管理）から着手し、非機能要件・通信方式・パッケージ管理の順に対応します。

## 差分分析（仕様 vs 現在の実装）

### 差分1: データディレクトリ構造（重大度：高）

**仕様**（機能要件1）：

```
{DATA_DIR}/                              # デフォルト: ./data
└── {project_id}/
    ├── project.json                     # メタ情報（ID、表示名、作成日時、更新日時）
    ├── interview.json                   # インタビュー状態（Q&A履歴、工程進捗、構造化データ）
    └── specs/                           # 生成された仕様書
```

**現在の実装**：

```
.interview_state/                        # インタビュー状態（ハードコード）
└── {project_name}.json

spec_output/                             # 生成仕様書（settings.output_dir）
└── {project_name}/
    ├── 01-principle-definition.md
    └── ...
```

**差分**：
- `DATA_DIR`（デフォルト `./data`）の概念がない
- プロジェクトデータが2箇所に分散している（`.interview_state/` と `spec_output/`）
- `project.json`（メタ情報ファイル）が存在しない
- インタビュー状態のファイル名が `{project_name}.json`（仕様では `interview.json`）
- 仕様書が `specs/` サブディレクトリではなくプロジェクトディレクトリ直下

---

### 差分2: プロジェクトID自動採番（重大度：高）

**仕様**（機能要件1）：
> プロジェクト作成時にシステムがユニークなプロジェクトID（英数字）を自動採番する

**現在の実装**：
- ユーザーが指定した `project_name` をそのまま識別子として使用
- 自動採番の仕組みがない

---

### 差分3: プロジェクト表示名（重大度：高）

**仕様**（機能要件1）：
> プロジェクト作成時にユーザーが表示名を設定する

**現在の実装**：
- `project_name` のみ存在し、表示名（display_name）の概念がない
- `ProjectCreate` モデルに `name` フィールドのみ

---

### 差分4: CLIコマンド仕様の相違（重大度：中）

**仕様**（機能要件8）：

| コマンド | 仕様 | 現在の実装 |
|---------|------|-----------|
| `spec start` | 引数なし、プロジェクト名を対話で入力 | `spec start <project_name>` 引数必須 |
| `spec resume` | `spec resume <project_id>` | `spec resume <project_name>` |
| `spec list` | ID・表示名・進捗を表示 | プロジェクト名・フェーズのみ |
| `spec status` | `spec status <project_id>` | `spec status <project_name>` |

---

### 差分5: Git自動コミットのスコープ（重大度：中）

**仕様**（機能要件7）：
> - プロジェクトごとに `specs/` ディレクトリをgitリポジトリとして管理する
> - プロジェクト作成時に `specs/` ディレクトリで `git init` を実行する

**現在の実装**：
- `GitManager` は `spec_output/` ディレクトリ全体を1つのリポジトリとして管理
- プロジェクト作成時に自動的な `git init` は実行されない

---

### 差分6: LLMタイムアウト未実装（重大度：中）

**仕様**（非機能要件・パフォーマンス）：
> LLMの質問生成は30秒以内にタイムアウトする

**現在の実装**：
- `BaseLLMClient` および各プロバイダークライアントにタイムアウト設定がない
- LLM API呼び出しがタイムアウトなしで実行される

---

### 差分7: Claude クライアントの max_tokens 未指定（重大度：低）

**仕様**（非機能要件・パフォーマンス）：
> LLMの最大トークン数は4,096（1回の生成あたり）

**現在の実装**：
- `BedrockClient`: `max_tokens=4096` ✅
- `OpenAIClient`: `max_tokens=4096` ✅
- `ClaudeClient`: `max_tokens` のデフォルト値が未設定（Anthropic APIのデフォルトに依存）

---

### 差分8: Bedrock デフォルトモデルの不一致（重大度：低）

**仕様**（機能要件6）：
> AWS Bedrock：推奨（Claude Haiku 4.5）

**現在の実装**：
- `config/settings.py`: `global.anthropic.claude-haiku-4-5-20251001-v1:0` ✅
- `bedrock_client.py` の `__init__` デフォルト引数: `anthropic.claude-3-5-sonnet-20241022-v2:0` ❌

`settings.py` の値が実際に使用されるため実運用上の問題はないが、`bedrock_client.py` のデフォルト値が古いモデルになっている。

---

### 差分9: インタビューの通信方式がWebSocket（重大度：中）

**仕様**（機能要件9）：
> フロントエンドからバックエンドへの通信はREST API（Fetch API）で行う

**現在の実装**：
- インタビュー画面（`Interview.tsx`）はWebSocketで通信している
- `WebSocketManager` クラス（`frontend/src/api/websocket.ts`）がWebSocket接続を管理
- バックエンド側にもWebSocketエンドポイント（`/api/interview/ws/{project_name}`）が存在
- REST APIのインタビューエンドポイント（`POST /api/interview/start`, `POST /api/interview/answer`）は定義済みだが**フロントエンドから未使用**
- `React.StrictMode` がWebSocketの二重マウント問題のため無効化されている（`main.tsx`）

**差分**：
- 仕様はREST API（Fetch API）のみを通信手段として規定している
- インタビュー画面がWebSocketに依存しており、仕様の通信方式に準拠していない
- WebSocket固有の問題（再接続ロジック、StrictMode無効化）が存在する

---

### 差分10: パッケージ管理がuv非対応（重大度：中）

**仕様**（非機能要件・技術スタック）：
> バックエンド：Python 3.9以上 / FastAPI / uv（パッケージ管理）

**現在の実装**：
- `requirements.txt` で依存関係を管理（`pip install -r requirements.txt`）
- `pyproject.toml` のビルドシステムが `setuptools`（`uv sync` 非対応）
- `uv.lock` が存在しない
- `pyproject.toml` の `dependencies` にWeb関連パッケージが欠落：
  - `fastapi`、`uvicorn`、`python-multipart` が `requirements.txt` にのみ記載
  - `websockets` が `requirements.txt` にのみ記載（差分9の修正で削除予定）
- `pyproject.toml` の `[project.optional-dependencies].dev` にテスト関連パッケージが不足：
  - `pytest-asyncio`、`pytest-cov`、`httpx` が `requirements.txt` にのみ記載

---

## 修正計画

### フェーズ1: データディレクトリ構造の再設計（差分1, 2, 3）

プロジェクト管理の根幹に関わる変更のため、最優先で対応する。

#### 1-1. `DATA_DIR` 設定の追加

**対象ファイル**: [config/settings.py](../config/settings.py)

- `Settings` クラスに `data_dir` フィールドを追加（デフォルト: `./data`）
- 既存の `output_dir` は削除し、`data_dir` に統合
- 環境変数 `DATA_DIR` で設定可能にする

#### 1-2. プロジェクトID自動採番の実装

**対象ファイル**: [spec_ai_writer/core/context_manager.py](../spec_ai_writer/core/context_manager.py)

- プロジェクトID生成ロジックを追加（英数字、例: `proj_a1b2c3d4`）
- `ContextManager` のコンストラクタを `project_id` と `display_name` を受け取る形に変更

#### 1-3. プロジェクトディレクトリ構造の統合

**対象ファイル**:
- [spec_ai_writer/core/context_manager.py](../spec_ai_writer/core/context_manager.py)
- [spec_ai_writer/generators/markdown_generator.py](../spec_ai_writer/generators/markdown_generator.py)

変更内容:
- プロジェクトデータを `{DATA_DIR}/{project_id}/` 配下に集約
- `project.json` を作成してメタ情報を保存（ID、表示名、作成日時、更新日時）
- インタビュー状態を `{DATA_DIR}/{project_id}/interview.json` に保存
- 仕様書を `{DATA_DIR}/{project_id}/specs/` に出力

#### 1-4. Web API モデルの更新

**対象ファイル**:
- [spec_ai_writer/web/models.py](../spec_ai_writer/web/models.py)
- [spec_ai_writer/web/routers/projects.py](../spec_ai_writer/web/routers/projects.py)

変更内容:
- `ProjectCreate` モデルに `display_name` フィールドを追加（`name` を `display_name` に変更）
- `ProjectResponse` モデルに `project_id` と `display_name` を追加
- プロジェクト作成API で自動採番を実行
- プロジェクト一覧・詳細・削除API を新しいディレクトリ構造に対応

#### 1-5. 仕様書ルーターの更新

**対象ファイル**: [spec_ai_writer/web/routers/specifications.py](../spec_ai_writer/web/routers/specifications.py)

変更内容:
- 仕様書の参照先を `{DATA_DIR}/{project_id}/specs/` に変更

---

### フェーズ2: CLIコマンドの修正（差分4）

#### 2-1. `spec start` コマンドの修正

**対象ファイル**: [spec_ai_writer/cli.py](../spec_ai_writer/cli.py)

変更内容:
- `project_name` 引数を削除し、対話形式でプロジェクト表示名を入力させる
- プロジェクトIDの自動採番結果を表示する
- 作成されたプロジェクトのIDを画面に表示

#### 2-2. `spec resume` / `spec status` コマンドの修正

**対象ファイル**: [spec_ai_writer/cli.py](../spec_ai_writer/cli.py)

変更内容:
- 引数を `<project_name>` から `<project_id>` に変更
- プロジェクトIDでデータディレクトリを検索

#### 2-3. `spec list` コマンドの修正

**対象ファイル**: [spec_ai_writer/cli.py](../spec_ai_writer/cli.py)

変更内容:
- プロジェクトID・表示名・進捗を一覧表示
- `project.json` から表示名を読み込む

---

### フェーズ3: Git自動コミットの修正（差分5）

#### 3-1. プロジェクト単位のgitリポジトリ管理

**対象ファイル**:
- [spec_ai_writer/git/git_manager.py](../spec_ai_writer/git/git_manager.py)
- [spec_ai_writer/core/context_manager.py](../spec_ai_writer/core/context_manager.py)

変更内容:
- `GitManager` の初期化先を `{DATA_DIR}/{project_id}/specs/` に変更
- プロジェクト作成時に `specs/` ディレクトリで `git init` を自動実行
- 仕様書生成後のコミット対象を `specs/` ディレクトリに限定

---

### フェーズ4: 非機能要件対応（差分6, 7, 8）

#### 4-1. LLMタイムアウトの実装

**対象ファイル**:
- [spec_ai_writer/llm/base.py](../spec_ai_writer/llm/base.py)
- [spec_ai_writer/llm/claude_client.py](../spec_ai_writer/llm/claude_client.py)
- [spec_ai_writer/llm/openai_client.py](../spec_ai_writer/llm/openai_client.py)
- [spec_ai_writer/llm/bedrock_client.py](../spec_ai_writer/llm/bedrock_client.py)

変更内容:
- `BaseLLMClient` に `timeout` パラメータを追加（デフォルト: 30秒）
- 各プロバイダークライアントで API 呼び出し時にタイムアウトを設定
  - Claude: `anthropic.Anthropic(timeout=30.0)`
  - OpenAI: `openai.OpenAI(timeout=30.0)`
  - Bedrock: `boto3` の `read_timeout` / `connect_timeout` 設定

#### 4-2. Claude クライアントの max_tokens 設定

**対象ファイル**: [spec_ai_writer/llm/claude_client.py](../spec_ai_writer/llm/claude_client.py)

変更内容:
- `__init__` に `max_tokens=4096` のデフォルト値を追加
- `chat` メソッドで `max_tokens` をAPI呼び出しに渡す

#### 4-3. Bedrock デフォルトモデルの統一

**対象ファイル**: [spec_ai_writer/llm/bedrock_client.py](../spec_ai_writer/llm/bedrock_client.py)

変更内容:
- `__init__` のデフォルト引数を `global.anthropic.claude-haiku-4-5-20251001-v1:0` に変更
- `settings.py` の値と一致させる

---

### フェーズ5: インタビュー通信方式をREST APIに変更（差分9）

WebSocket通信をREST API（Fetch API）に置き換える。バックエンド側のREST APIエンドポイントは既に存在するため、主にフロントエンド側の修正が中心となる。

#### 5-1. フロントエンド：Interview.tsx をREST API化

**対象ファイル**: `frontend/src/pages/Interview.tsx`

変更内容:
- WebSocket接続を削除し、REST APIクライアント（`client.ts`）の既存エンドポイントを使用
  - `POST /api/interview/start` でインタビュー開始・初回質問を取得
  - `POST /api/interview/answer` で回答送信・次の質問を取得
- WebSocketのイベント駆動型フローを、ユーザー操作起点のリクエスト/レスポンス型に変更
- 工程完了・仕様書生成の通知はレスポンスの `phase_complete` フラグで判定

#### 5-2. WebSocketManager の削除

**対象ファイル**: `frontend/src/api/websocket.ts`

変更内容:
- `WebSocketManager` クラスを削除
- 関連するimportを各ファイルから削除

#### 5-3. React.StrictMode の復元

**対象ファイル**: `frontend/src/main.tsx`

変更内容:
- WebSocketの二重マウント問題で無効化されていた `React.StrictMode` を復元

#### 5-4. バックエンドWebSocketエンドポイントの削除

**対象ファイル**: `spec_ai_writer/web/routers/interview.py`

変更内容:
- `websocket_interview` エンドポイント（`/api/interview/ws/{project_name}`）を削除
- `active_sessions` 辞書と関連する管理ロジックを削除
- `WebSocketMessage` モデルが不要になった場合は `models.py` からも削除

---

### フェーズ6: パッケージ管理をuv対応に移行（差分10）

`requirements.txt` + `setuptools` 構成から `uv sync` で依存解決できる構成に移行する。

#### 6-1. pyproject.toml の依存関係を完全化

**対象ファイル**: [pyproject.toml](../pyproject.toml)

変更内容:
- `[project].dependencies` に不足しているパッケージを追加：
  - `fastapi>=0.109.0`
  - `uvicorn[standard]>=0.27.0`
  - `python-multipart>=0.0.6`
- `[project.optional-dependencies].dev` にテスト関連パッケージを追加：
  - `pytest-asyncio>=0.23.0`
  - `pytest-cov>=4.1.0`
  - `httpx>=0.26.0`
- `websockets` を追加しない（差分9の修正でWebSocketを削除するため）

#### 6-2. ビルドシステムをuv互換に変更

**対象ファイル**: [pyproject.toml](../pyproject.toml)

変更内容:
- `[build-system]` を `hatchling` に変更（uvとの互換性が高い）：
  ```toml
  [build-system]
  requires = ["hatchling"]
  build-backend = "hatchling.build"
  ```
- `[tool.setuptools]` セクションを削除
- `[tool.hatch.build.targets.wheel]` でパッケージ対象を指定

#### 6-3. uv.lock の生成

`uv lock` を実行してロックファイルを生成する。

#### 6-4. requirements.txt の削除

**対象ファイル**: [requirements.txt](../requirements.txt)

変更内容:
- `requirements.txt` を削除
- README やドキュメント内の `pip install -r requirements.txt` の記述を `uv sync` に置き換え

---

### フェーズ7: テストの更新

#### 7-1. 既存テストの修正

**対象ファイル**:
- [tests/unit/test_context_manager.py](../tests/unit/test_context_manager.py)
- [tests/api/test_projects_api.py](../tests/api/test_projects_api.py)
- [tests/api/test_specifications_api.py](../tests/api/test_specifications_api.py)
- [tests/conftest.py](../tests/conftest.py)

変更内容:
- 新しいディレクトリ構造に合わせたテストの修正
- プロジェクトID自動採番のテスト追加
- `project.json` の作成・読み込みテスト追加
- `interview.json` の保存先変更に対応したテスト修正

---

## 実装順序と依存関係

```
フェーズ6（uv移行）  ─────────────────────┐
                                          ↓
フェーズ1（データ構造） → フェーズ2（CLI）  │
                       → フェーズ3（Git）  │
                       → フェーズ4（非機能）│
                       → フェーズ5（REST API化）
                                ↓
                         フェーズ7（テスト）
```

- フェーズ6（uv移行）はフェーズ1と独立しており、最初に着手可能
- フェーズ1はデータ構造の基盤となるため、フェーズ2, 3の前提
- フェーズ2, 3, 4, 5はフェーズ1完了後に並行して進められる
- フェーズ5（REST API化）はフェーズ1と独立した部分は先行して着手可能
- フェーズ7は各フェーズの修正に合わせて随時更新する

## 設計判断の記録（Decision Records）

### 判断1: データディレクトリを単一の `DATA_DIR` に統合

**決定**: `.interview_state/` と `spec_output/` を廃止し、`{DATA_DIR}/{project_id}/` 配下に統合する
**理由**: 仕様のディレクトリ構造に準拠するとともに、プロジェクト単位でのデータ管理・削除・バックアップを容易にする
**日付**: 2026-02-15

### 判断2: プロジェクトIDをシステム自動採番に変更

**決定**: ユーザー指定の `project_name` に代わり、システムが英数字のIDを自動生成する（例: `proj_a1b2c3d4`）
**理由**: 表示名の変更に影響されない安定した識別子を確保し、仕様の「ユニークID自動採番」要件を満たす
**日付**: 2026-02-15

### 判断3: インタビュー通信方式をWebSocketからREST APIに変更

**決定**: `WebSocketManager` を削除し、既存の REST API エンドポイント（`POST /api/interview/start`, `POST /api/interview/answer`）をフロントエンドから使用する
**理由**: 仕様がFetch API（REST）を規定しており、WebSocket固有の問題（`React.StrictMode` 無効化、再接続ロジック）を排除できる。REST APIエンドポイントは既にバックエンドに実装済みのため移行コストが低い
**日付**: 2026-02-15

### 判断4: パッケージ管理をuvに移行し、ビルドシステムをhatchlingに変更

**決定**: `setuptools` + `requirements.txt` から `hatchling` + `uv` に移行する
**理由**: 仕様の技術スタック（uv）に準拠する。hatchlingはuvとの互換性が高く、`uv sync` による依存解決が可能になる
**日付**: 2026-02-15

---

## 仕様適合済み項目（修正不要）

以下の機能は仕様に準拠しており、修正不要です：

- 7工程インタビュー機能（工程ごとのプロンプト、Q&Aループ、フォローアップ質問）
- 工程完了判定機能（最低3回Q&A、最大15回、構造化データ抽出、スキーマ検証）
- 仕様書自動生成機能（Jinja2テンプレート、Markdown出力、プロジェクト名・生成日時挿入）
- マルチLLMプロバイダー対応（Claude/OpenAI/Bedrock、BaseLLMClient共通インターフェース）
- 中断・再開機能（Q&Aごとの永続化、異常終了時の復元）
- Web UI機能（ダッシュボード、工程進捗、仕様書プレビュー・ダウンロード、モックモード）

---

**注意**: この修正計画書は `02-planning-requirement.md`（企画・要件定義工程）の仕様を正とした差分分析に基づいています。修正実施前に各フェーズの対象ファイルを確認し、テスト（フェーズ7）を随時実施してください。
