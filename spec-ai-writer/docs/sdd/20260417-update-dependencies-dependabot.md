# 依存ライブラリのセキュリティアップデート (Issue #72)

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
工程ごとにファイルを分けると発散するため、全工程を1ファイルで管理します。
原則決定工程はCONSTITUTION.mdを確認してください。

---

## ② 企画・要件定義工程

### 目的

Dependabotから報告されたセキュリティアラート10件に対応するため、依存ライブラリを互換性のある範囲で最新バージョンへ更新する。
あわせて、ソースコードから実際には使用されていない `python-multipart` と `rich` を依存関係から削除し、不要な攻撃対象領域を排除する。

### 背景

- GitHub Dependabotより以下のアラートが報告されている（すべてopen）

  | # | パッケージ | 深刻度 | 修正バージョン |
  |---|-----------|--------|--------------|
  | #34 | vite | high | 7.3.2 |
  | #33 | vite | high | 7.3.2 |
  | #25 | black | high | 26.3.1 |
  | #42 | axios | medium | 1.15.0 |
  | #41 | axios | medium | 1.15.0 |
  | #40 | follow-redirects | medium | 1.16.0 |
  | #39 | python-multipart | medium | 0.0.26 |
  | #38 | pytest | medium | 9.0.3 |
  | #35 | vite | medium | 7.3.2 |
  | #32 | Pygments | low | 2.20.0 |
- viteの3件はすべて `--host` で開発サーバーをネットワーク公開している場合のみ影響する
- axiosとfollow-redirectsの3件は外部サイトへのHTTPリクエストがなければ実害はない
- `python-multipart` は `pyproject.toml` に明示されているが、ソースコードでFastAPIの `Form` / `UploadFile` を使用していないため不要
- `rich` も `pyproject.toml` に明示されているが、ソースコードで直接使用していないため不要

---

## ③ 設計計画工程

### 方針

- `uv lock --upgrade && uv sync` で全Pythonパッケージを互換性のある最新バージョンへ一括更新する
- `npm update` で全フロントエンドパッケージを互換性のある最新バージョンへ一括更新する
- `python-multipart` と `rich` は `pyproject.toml` の `dependencies` から削除してから上記コマンドを実行する
- Dependabot指摘パッケージの下限制約を `pyproject.toml` / `package.json` で引き上げ、将来の `install` でも確実に修正済みバージョンが選択されるようにする

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/pyproject.toml` | 修正 | `black>=26.3.1`・`pytest>=9.0.3` に下限更新、`python-multipart`・`rich` 削除 |
| `spec-ai-writer/uv.lock` | 修正 | `uv lock --upgrade && uv sync` で全パッケージを最新化 |
| `spec-ai-writer/frontend/package.json` | 修正 | `vite: ^7.3.2`・`axios: ^1.15.0` に下限更新、その後 `npm update` で全パッケージを最新化 |
| `CHANGELOG.md` | 修正 | `[1.0.4]` セクションに `### Changed` を追記 |
| `CHANGELOG_ja.md` | 修正 | `[1.0.4]` セクションに `### 変更` を追記 |

---

## ④ タスク分割工程

各タスクは独立しており、並列対応可能。

### タスク一覧

- T1: `pyproject.toml` の下限制約更新（`black`・`pytest`）と未使用パッケージ削除（`python-multipart`・`rich`）、その後 `uv lock --upgrade && uv sync` で全Python依存を最新化
- T2: `frontend/package.json` の下限制約更新（`vite`・`axios`）、その後 `npm update` で全フロントエンド依存を最新化
- T3: CHANGELOG更新

---

## ⑤ 実装工程

- **実装日**: 2026-04-17
- **担当**: 高橋 篤剛

③設計計画工程の通りに実装した。計画との乖離なし。

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | `uv sync` が正常終了する | エラーなく依存解決される | OK |
| N-02 | `uv pip list` でインストール済みバージョンを確認 | `black>=26.3.1`・`pytest>=9.0.3` を満たしている | OK |
| N-03 | `pytest` が全件パスする | テストがすべてグリーン | OK |
| N-04 | `npm run build` が正常終了する | フロントエンドビルドが成功する | OK |
| N-05 | `npm list vite axios` でインストール済みバージョンを確認 | `vite>=7.3.2`・`axios>=1.15.0` を満たしている | OK |
| E-01 | `rich` 削除後にCLIが正常起動する | `ImportError` が発生しない | OK |
| E-02 | `python-multipart` 削除後にFastAPI起動が正常に行われる | アプリ起動時にエラーが出ない | OK |

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260417-update-dependencies`
- **PR タイトル**: `fix: 依存ライブラリのセキュリティアップデート (issue #72)`

### 運用への影響

- `python-multipart` 削除: `FastAPI` の `Form` / `UploadFile` を今後使う場合は再追加が必要
