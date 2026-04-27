# 依存ライブラリのセキュリティアップデート（GitPython 3.1.47）

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
工程ごとにファイルを分けると発散するため、全工程を1ファイルで管理します。
原則決定工程はCONSTITUTION.mdを確認してください。

---

## ② 企画・要件定義工程

### 目的

GitHub Dependabot からのアラートを機に、依存ライブラリを互換性のある範囲で最新版にアップデートする。

### 背景

- GitHub Dependabotより以下のアラートが報告されている

  | # | パッケージ | 深刻度 | 脆弱性概要 | 修正バージョン |
  |---|-----------|--------|-----------|--------------|
  | #43 | GitPython | high | Git オプションのバイパスによるコマンドインジェクション（GHSA-rpm5-65cw-6hj4） | 3.1.47 |
  | #44 | GitPython | high | `multi_options` の `shlex.split` 変換前バリデーションによる引数インジェクション（GHSA-x2qx-6953-8485） | 3.1.47 |

---

## ③ 設計計画工程

### 方針

- `pyproject.toml` の `GitPython` 下限制約を `>=3.1.47` に明示的に引き上げる
- アラートの指摘の有無に関わらず、全パッケージを互換性のある最新バージョンへ一括更新する
  - バックエンド：`uv lock --upgrade && uv sync`
  - フロントエンド：`npm update`
- CHANGELOG に Unreleased 扱いで変更を記録する

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/pyproject.toml` | 修正 | `GitPython>=3.1.47` に下限更新 |
| `spec-ai-writer/uv.lock` | 修正 | `uv lock --upgrade && uv sync` で全 Python パッケージを最新化 |
| `spec-ai-writer/frontend/package.json` | 修正 | `npm update` で全フロントエンドパッケージを最新化 |
| `spec-ai-writer/frontend/package-lock.json` | 修正 | `npm update` により自動更新 |
| `CHANGELOG.md` | 修正 | `[Unreleased]` セクションに `### Changed` を追記 |
| `CHANGELOG_ja.md` | 修正 | `[Unreleased]` セクションに `### 変更` を追記 |

---

## ④ タスク分割工程

各タスクは依存関係の順序で実施する。

### タスク一覧

- T1: `pyproject.toml` の `GitPython` 下限制約を `>=3.1.47` に更新
- T2: `uv lock --upgrade && uv sync` で全 Python パッケージを最新化（T1 完了後）
- T3: `npm update` で全フロントエンドパッケージを最新化
- T4: CHANGELOG 更新

---

## ⑤ 実装工程

- **実装日**: 2026-04-27
- **担当**: 高橋 篤剛

計画との乖離なし。

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 操作 | 期待値 | 結果 |
|-----|------|------------|------|
| N-01 | `uv sync` を実行する | 正常終了する | OK |
| N-02 | `uv run pytest` を実行する | 全件パスする | OK |
| N-03 | `npm install` を実行する | 正常終了する | OK |
| N-04 | `npm run test` を実行する | 全件パスする | OK |
| E-01 | GitPython を使用する既存機能が正常に動作する | `ImportError` や `GitError` が発生しない | OK |

モバイル表示：なし（CLIおよびバックエンドのみの変更のため）

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260427update-dependencies`
- **PR タイトル**: `fix: 依存ライブラリのセキュリティアップデート（GitPython 3.1.47）`

### 運用への影響

- 既存の `Repo.clone_from()` / `Remote.fetch()` 等の GitPython API 利用に動作変更なし（修正はバリデーション強化のみ）
