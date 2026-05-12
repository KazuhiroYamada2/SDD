# 依存ライブラリのセキュリティアップデート（GitPython 3.1.50 / urllib3 削除）

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
工程ごとにファイルを分けると発散するため、全工程を1ファイルで管理します。
原則決定工程はCONSTITUTION.mdを確認してください。

---

## ② 企画・要件定義工程

### 目的

GitHub Dependabot からのアラートを機に、依存ライブラリを互換性のある範囲で最新版にアップデートする。

### 背景

- GitHub Dependabotより以下のアラートが報告されている（open のもの）

  | # | パッケージ | 深刻度 | 脆弱性概要 | 修正バージョン |
  |---|-----------|--------|-----------|--------------|
  | #49 | urllib3 | high | プロキシ経由の低レベルリダイレクト時に機密ヘッダーが別オリジンへ転送される（CVE-2026-44431） | 2.7.0 |
  | #48 | urllib3 | high | ストリーミングAPIの一部で解凍爆弾防護がバイパス可能（CVE-2026-44432） | 2.7.0 |
  | #47 | GitPython | high | `config_writer()` のセクションパラメータへの改行インジェクションで CVE-2026-42215 のパッチを回避し RCE が可能 | 3.1.50 |
  | #46 | GitPython | high | `config_writer().set_value()` への改行インジェクションで `core.hooksPath` 経由の RCE が可能（CVE-2026-44244） | 3.1.49 |
  | #45 | GitPython | high | reference API のパストラバーサル脆弱性によりリポジトリ外への任意ファイル書き込み・削除が可能（CVE-2026-44243） | 3.1.48 |

- `urllib3` はコード内で直接 import しておらず、`boto3 → botocore` の間接依存として引き込まれている
- `pyproject.toml` には以前のセキュリティアップデート対応で明示的に記載されたが、全パッケージ更新を行えば不要となる

### 要件

- GitPython を 3.1.50 以上に更新する
- urllib3 の直接依存宣言を `pyproject.toml` から削除する（boto3 を含む全パッケージ更新により間接的に最新版が導入される）
- 全パッケージを互換性のある最新バージョンへ一括更新する

---

## ③ 設計計画工程

### 方針

- `pyproject.toml` の `GitPython` 下限制約を `>=3.1.50` に引き上げる
- `urllib3` の直接依存宣言を `pyproject.toml` から削除する
  - 削除理由：コード内で直接使用しておらず、boto3/botocore の間接依存として自動解決される。全パッケージ更新により最新版が導入されるため、明示的なバージョン固定は不要
- アラートの指摘の有無に関わらず、全パッケージを互換性のある最新バージョンへ一括更新する
  - バックエンド：`uv lock --upgrade && uv sync`
  - フロントエンド：`npm update`
- CHANGELOG に Unreleased 扱いで変更を記録する

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/pyproject.toml` | 修正 | `GitPython>=3.1.50` に下限更新、`urllib3` の行を削除 |
| `spec-ai-writer/uv.lock` | 修正 | `uv lock --upgrade && uv sync` で全 Python パッケージを最新化 |
| `spec-ai-writer/frontend/package-lock.json` | 修正 | `npm update` で全フロントエンドパッケージを最新化（package.json のバージョン制約に変更なし） |
| `CHANGELOG.md` | 修正 | `[Unreleased]` の既存 Dependency security updates エントリを今回の内容に更新 |
| `CHANGELOG_ja.md` | 修正 | `[Unreleased]` の既存エントリを今回の内容に更新 |

---

## ④ タスク分割工程

各タスクは依存関係の順序で実施する。

### タスク一覧

- T1: `pyproject.toml` の `GitPython` 下限制約を `>=3.1.50` に更新し、`urllib3` の行を削除
- T2: `uv lock --upgrade && uv sync` で全 Python パッケージを最新化（T1 完了後）
- T3: `npm update` で全フロントエンドパッケージを最新化
- T4: CHANGELOG 更新（既存のDependency security updatesエントリを簡潔に書き換え）

---

## ⑤ 実装工程

- **実装日**: 2026-05-12
- **担当**: 高橋 篤剛

計画との乖離なし。

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 操作 | 期待値 | 結果 |
|-----|------|--------|------|
| N-01 | `uv sync` を実行する | 正常終了する | OK |
| N-02 | `uv run pytest` を実行する | 全件パスする | OK |
| N-03 | `npm install` を実行する | 正常終了する | OK |
| N-04 | `npm run test` を実行する | 全件パスする | OK |
| E-01 | GitPython を使用するコードを実行する | `ImportError` や `GitError` が発生しない | OK |

モバイル表示：なし（CLIおよびバックエンドのみの変更のため）

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260512-update-dependencies`
- **PR タイトル**: `fix: 依存ライブラリのセキュリティアップデート（GitPython 3.1.50 / urllib3 削除）`

### 運用への影響

- 既存の `Repo.clone_from()` / `Remote.fetch()` 等の GitPython API 利用に動作変更なし（修正はバリデーション強化のみ）
- `urllib3` の削除により `pyproject.toml` の直接依存は減るが、boto3 経由で引き続き利用可能なため既存機能への影響なし
