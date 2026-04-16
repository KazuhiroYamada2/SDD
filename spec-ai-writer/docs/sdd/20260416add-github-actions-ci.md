# GitHub Actions CI の追加 (Issue #64)

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
今回の変更は新機能（CI ワークフロー追加）であるため、全工程を1ファイルで管理します。

---

## ② 企画・要件定義工程

### 目的

`spec-ai-writer` に GitHub Actions による CI を追加し、PR・マージ時の品質保証を自動化します。
現状は手動確認に依存しており、特に開発環境が macOS に限定されているため、Windows 固有の問題を早期に検知できない状態です。
CI 導入によって、パッケージインストール・起動・テストを複数 OS で自動検証し、品質と信頼性を向上させます。

### 背景

- `spec-ai-writer/` には `.github/workflows/` が存在せず、CI が未設定
- 開発環境が macOS のみのため、Windows や Linux での動作確認が抜け落ちるリスクがある
- `pyproject.toml` は Python 3.10 / 3.11 / 3.12 をサポートすると宣言しているが、複数バージョンでの自動検証がない
- `spec-ai-writer/frontend/` にフロントエンドコードが存在するが、CI での自動テストがない
- 参考リポジトリ `elvezjp/spec-code-ai-reviewer` の `.github/workflows/` 設定を参考に調整する

### 修正スコープ

| 優先度 | 問題 | 対象ファイル |
|-------|------|------------|
| 高 | CI が未設定のため PR 品質保証が手動依存 | `.github/workflows/ci.yml`（新規） |
| 高 | Windows 固有バグを早期検知できない | 同上（matrix: windows 追加） |
| 中 | 複数 Python バージョンでの動作未検証 | 同上（matrix: python-version 追加） |
| 中 | フロントエンドの CI が未設定 | 同上（frontend-test ジョブ追加） |

---

## ③ 設計計画工程

### 方針

- `.github/workflows/ci.yml` を新規作成する（既存ファイルへの変更なし）
- トリガーは `push: branches: [main]` と `pull_request: branches: [main]` に絞る（参考CIに合わせる）
- OS マトリクス: `ubuntu-latest` / `macos-latest` / `windows-latest`
- Python バージョンマトリクス: `3.10` / `3.12`（最小・最大のみ。中間バージョンは検知価値が低いためジョブ数を抑える）
- パッケージ管理には `uv` を使用し、`uv sync --all-extras` で依存関係をインストールする（将来 extras が増えても対応できるよう `--dev` でなく `--all-extras` を使う）
- 単体テスト: `uv run pytest` を実行する（`pytest.ini` の設定を引き継ぐ）
- API キー設定は不要: `config/settings.py` の全フィールドが `default=""` を持ち、`conftest.py` がモック値を直接 fixture に渡しているため、secrets なしで全テストが通る
- フロントエンドジョブを別ジョブ（`frontend-test`）として追加する: `npm ci` + `npx vitest run`
- Windows での改行コード・パス区切り問題を検知するため、OS マトリクスからは外さない

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `.github/workflows/ci.yml` | 追加 | `backend-test`（3 OS × Python 3.10/3.12）と `frontend-test`（3 OS × Node）の2ジョブ構成 |

---

## ④ タスク分割工程

各タスクは順番に実施する。T1 完了後に T2 で動作を確認する。

### タスク一覧

- [x] T1: `.github/workflows/ci.yml` を新規作成する
  - トリガー: `push` / `pull_request`（`main` ブランチのみ）
  - `backend-test` ジョブ: 3 OS × Python 3.10/3.12 のマトリクス、`working-directory: spec-ai-writer`
    - checkout → uv セットアップ → `uv sync --all-extras` → `uv run pytest`
  - `frontend-test` ジョブ: 3 OS × Node の構成、`working-directory: spec-ai-writer/frontend`
    - checkout → Node セットアップ → `npm ci` → `npx vitest run`
- [x] T2: ワークフローファイルの内容をレビューし、構文エラーがないことを確認する
- [ ] T3: PR を作成し、GitHub Actions 上でワークフローが起動・通過することを確認する

---

## ⑤ 実装工程

### 実装記録

**実装日**: 2026-04-16
**担当**: Claude Code (claude-sonnet-4-6) / 高橋 篤剛

### 変更内容

| タスク | 変更箇所 | 変更内容 |
|-------|---------|---------|
| T1 | `.github/workflows/ci.yml`（新規） | `backend-test`（3 OS × Python 3.10/3.12）・`frontend-test`（3 OS × Node 20）の2ジョブ構成を追加 |

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | GitHub Actions ジョブの起動 | PR 作成時に `backend-test` / `frontend-test` の全マトリクスジョブが起動する | - |
| N-02 | バックエンド CI の通過 | 3 OS × Python 3.10/3.12 の計6ジョブがすべて green になる | - |
| N-03 | フロントエンド CI の通過 | 3 OS の計3ジョブがすべて green になる | - |

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260416-issue64-ci`
- **PR タイトル**: `ci: GitHub Actions CI の追加 (issue #64)`
- **対象 issue**: #64

### 運用への影響

- 既存機能（Python コード・フロントエンド・ドキュメント）への影響なし
- 今後の PR では CI が自動実行されるため、マージ前に全 OS・全 Python バージョンでの動作確認が取れるようになる
- Windows 環境でのみ発生するパス・改行コード問題を早期検知できる

### フィードバックループ

- 今後 Python バージョンのサポート範囲を変更する際は `pyproject.toml` の `requires-python` / `classifiers` と `ci.yml` のマトリクスを同時更新する運用をルール化することを推奨
- テスト追加時に API キーが必要なテストは `@pytest.mark.integration` を付与し、CI では `-m "not integration"` で除外するパターンを `CONTRIBUTING.md` に明記することを推奨
