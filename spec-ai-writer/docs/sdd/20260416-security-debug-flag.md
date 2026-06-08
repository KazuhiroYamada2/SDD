# CLI --log-level オプションによるログ出力・スタックトレース制御 (Issue #48)

このファイルは、仕様駆動開発の「**7 つの工程**」のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
工程ごとにファイルを分けると発散するため、全工程を1ファイルで管理します。
原則決定工程はCONSTITUTION.mdを確認してください。

---

## ② 企画・要件定義工程

### 目的

`spec_ai_writer/cli.py` の `start` コマンド例外ハンドラで `traceback.print_exc()` が無条件に実行されており、エラー発生時にファイルパスや API キーの断片が端末に出力される可能性があります。
スタックトレース表示の有無とログレベルは本質的に同じ「出力詳細度」という関心事であるため、`--log-level` オプション（`debug` / `info` / `warning` / `error`）として一体で設計します。
`--log-level=debug` 指定時にのみ `traceback.print_exc()` を実行し、あわせて `logging` モジュールのレベルを設定することで、通常時の情報漏洩リスクを排除しつつ開発時の診断性も向上させます。

### 背景

- Issue #25 の評価で残存対応項目として特定された（セキュリティラベル付き、優先度: Low）
- `start` コマンドだけが `traceback.print_exc()` を呼んでおり、他コマンドとの不整合がある
  - `start`（L76–83）: `traceback.print_exc()` を**無条件実行**
  - `resume`（L128–132）: traceback 出力なし
  - `status`（L181–183）: traceback 出力なし
  - `_generate_specs`（L225–226）: traceback 出力なし
- 現時点で `cli.py` に `logging` の設定がなく、ログレベル制御の仕組みが存在しない
- traceback 表示のみを制御する `--debug` フラグ単体では責務が中途半端であり、ログレベル設定と不可分なため `--log-level` として統合する
- CHANGELOG.md / CHANGELOG_ja.md はリポジトリルートに既存のため、`[Unreleased]` セクションを追記する

---

## ③ 設計計画工程

### 方針

- `cli()` グループに `--log-level` オプションを追加する（`@click.pass_context` でサブコマンドへ伝搬）
  - 選択肢: `debug` / `info` / `warning` / `error`（Python `logging` モジュールの標準レベルに合わせる）
  - デフォルト: `warning`（通常時はエラーメッセージのみ表示し、traceback は非表示）
- グループ関数内で `logging.basicConfig(level=...)` を設定する
- traceback 出力は `log_level == "debug"` の場合のみ実行し、全コマンドで統一する:
  ```python
  except Exception as e:
      click.echo(f"\nエラーが発生しました: {e}", err=True)
      if log_level == "debug":
          traceback.print_exc()
      sys.exit(1)
  ```
- `_generate_specs` はサブコマンドではないため、引数 `log_level: str` を追加して呼び出し元から渡す
- tracebackはファイル先頭でimportする。（遅延importはしない）

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/spec_ai_writer/cli.py` | 修正 | `cli()` に `--log-level` オプション追加、`logging` 初期化、各コマンドの例外ハンドラ統一 |
| `spec-ai-writer/README.md` | 修正 | コマンド一覧テーブルにグローバルオプション節を追加、CLIの使い方に `--log-level` の例を追記 |
| `spec-ai-writer/docs/SPEC.md` | 修正 | §8 CLIインターフェースにグローバルオプション（`--log-level`）の仕様を追記 |
| `spec-ai-writer/CHANGELOG.md` | 追加 | `[Unreleased]` セクションを新規作成し `Added` に記載 |
| `spec-ai-writer/CHANGELOG_ja.md` | 追加 | 同上（日本語版） |

---

## ④ タスク分割工程

T1 完了後に T2〜T3 を並列で実施可能。T4 は T1〜T3 の完了後に実施。

### タスク一覧

- [x] T1: `cli()` グループに `--log-level` オプションを追加し、`logging` を初期化する
  - `import logging` をファイル先頭に追加
  - `@click.pass_context` を `cli()` に付与
  - `@click.option("--log-level", type=click.Choice(["debug","info","warning","error"]), default="warning", show_default=True, help="ログ出力レベル（debug 時はスタックトレースも表示）")` を追加
  - `ctx.ensure_object(dict)` / `ctx.obj["log_level"] = log_level` を追加
  - `logging.basicConfig(level=getattr(logging, log_level.upper()))` を `cli()` 内で呼び出す
- [x] T2: `start` コマンドの例外ハンドラを修正する
  - `@click.pass_context` を付与し、`log_level = ctx.obj["log_level"]` を取得
  - `traceback.print_exc()` を `if log_level == "debug":` ブロック内に移動
- [x] T3: `resume` / `status` / `_generate_specs` の例外ハンドラを統一パターンに修正する
  - `resume` / `status`: `@click.pass_context` を付与し、`log_level` 参照を追加
  - `_generate_specs`: 引数に `log_level: str` を追加し、呼び出し元から渡す
- [x] T4: README.md のコマンド一覧テーブルの直後にグローバルオプション節を追加し、`--log-level` の使い方例を追記する
- [x] T5: SPEC.md の §8 CLIインターフェースに `--log-level` グローバルオプションの仕様を追記する
- [x] T6: ルートの `CHANGELOG.md` / `CHANGELOG_ja.md` の `[Unreleased]` セクションに本変更を記載する

---

## ⑤ 実装工程

### 実装記録

**実装日**: 2026-04-17
**担当**: Claude Sonnet 4.6 / 高橋 篤剛

### 変更内容

| タスク | ファイル | 変更箇所 | 変更内容 |
|-------|---------|---------|---------|
| T1 | `spec-ai-writer/spec_ai_writer/cli.py` | L3–5, L22–38 | `import logging` / `import traceback` をファイル先頭に追加；`cli()` に `--log-level` オプション・`@click.pass_context` を追加し、`logging.basicConfig()` でレベル初期化 |
| T2 | `spec-ai-writer/spec_ai_writer/cli.py` | L43–97 | `start()` に `@click.pass_context` 追加；例外ハンドラを `if log_level == "debug": traceback.print_exc()` パターンに修正（L93–96） |
| T3 | `spec-ai-writer/spec_ai_writer/cli.py` | L102–150, L172–205, L208–250 | `resume()` / `status()` に同パターン適用；`_generate_specs()` に `log_level: str = "warning"` 引数を追加し、例外ハンドラを統一 |
| T4 | `spec-ai-writer/README.md` | L231–244 | コマンド一覧の後にグローバルオプション節（テーブル＋使用例）を追加 |
| T5 | `spec-ai-writer/docs/SPEC.md` | L122–124 | §8 CLIインターフェースに `--log-level` のサブ箇条書きを追記 |
| T6 | `CHANGELOG.md` / `CHANGELOG_ja.md` | L12–19 | `[1.0.3]` の前に `[Unreleased] > Added` セクションを追加し、`--log-level` オプション追加を記載 |

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | `spec --help` の説明 | `uv run spec --help`を実行し、--log-levelの説明文が出力に含まれる | OK |
| N-02 | `--log-level=debug` のエラー発生時の挙動 | `uv run --log-level=debug spec start`を実行して`Ctrl+C`すると、tracebackが表示される | OK |
| N-03 | `--log-level=debug` 指定で `logging.DEBUG` レベルのログが出力される | `uv run --log-level=debug spec start`を実行して進めるうちで、`DEBUG:...` のログが表示される | OK  |
| E-01 | デフォルトのエラー発生時の挙動 | `uv run spec start`を実行して`Ctrl+C`すると、エラーメッセージのみ表示される | OK |

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260416-issue48-feat-debug`
- **PR タイトル**: `feat: CLI に --log-level オプションを追加しログ出力・スタックトレースを制御する (issue #48)`
- **対象 issue**: #48

### CHANGELOG 更新

- リポジトリルートの既存 `CHANGELOG.md` / `CHANGELOG_ja.md` の `[Unreleased]` セクションに追記
- 変更種別: `### Added`（新機能追加のため）

### 運用への影響

- 既存機能（`start` / `resume` / `status` / `list`）のデフォルト動作は変更なし
- `--log-level` はグループオプションのため、`spec --log-level=debug start` のように指定する（`spec start --log-level=debug` は不可）
- デフォルトが `warning` のため、通常時のエラー出力がクリーンになる。サポート受付時には `--log-level=debug` 付きの出力を提示するよう README に補足することを推奨
