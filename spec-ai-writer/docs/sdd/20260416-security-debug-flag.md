# CLI --log-level オプションによるログ出力・スタックトレース制御 (Issue #48)

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
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
- CHANGELOG.md / CHANGELOG_ja.md が未作成のため、本対応で新規作成する

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
          import traceback
          traceback.print_exc()
      sys.exit(1)
  ```
- `_generate_specs` はサブコマンドではないため、引数 `log_level: str` を追加して呼び出し元から渡す
- `import traceback` は `debug` 時のみ必要なため、条件ブロック内のローカルインポートとして残す（既存スタイルを踏襲）

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

- [ ] T1: `cli()` グループに `--log-level` オプションを追加し、`logging` を初期化する
  - `import logging` をファイル先頭に追加
  - `@click.pass_context` を `cli()` に付与
  - `@click.option("--log-level", type=click.Choice(["debug","info","warning","error"]), default="warning", show_default=True, help="ログ出力レベル（debug 時はスタックトレースも表示）")` を追加
  - `ctx.ensure_object(dict)` / `ctx.obj["log_level"] = log_level` を追加
  - `logging.basicConfig(level=getattr(logging, log_level.upper()))` を `cli()` 内で呼び出す
- [ ] T2: `start` コマンドの例外ハンドラを修正する
  - `@click.pass_context` を付与し、`log_level = ctx.obj["log_level"]` を取得
  - `traceback.print_exc()` を `if log_level == "debug":` ブロック内に移動
- [ ] T3: `resume` / `status` / `_generate_specs` の例外ハンドラを統一パターンに修正する
  - `resume` / `status`: `@click.pass_context` を付与し、`log_level` 参照を追加
  - `_generate_specs`: 引数に `log_level: str` を追加し、呼び出し元から渡す
- [ ] T4: README.md のコマンド一覧テーブルの直後にグローバルオプション節を追加し、`--log-level` の使い方例を追記する
- [ ] T5: SPEC.md の §8 CLIインターフェースに `--log-level` グローバルオプションの仕様を追記する
- [ ] T6: CHANGELOG.md / CHANGELOG_ja.md を新規作成し、`[Unreleased] > Added` に本変更を記載する

---

## ⑤ 実装工程

※ 実装後に記録する（実装日・担当・変更内容表）

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | `spec --help` に `--log-level` オプションが表示される | `--log-level [debug\|info\|warning\|error]` と説明文が出力に含まれる | - |
| N-02 | デフォルト（`--log-level` 未指定）でエラー発生時、traceback が出力されない | エラーメッセージのみ表示される | - |
| N-03 | `--log-level=debug` 指定でエラー発生時、traceback が出力される | スタックトレースが端末に出力される | - |
| N-04 | `--log-level=debug` 指定で `logging.DEBUG` レベルのログが出力される | `logging.debug(...)` の出力が端末に表示される | - |
| N-05 | 既存の正常系（`start` / `resume` / `status`）が壊れていない | `--log-level` を付けない通常操作で動作が変わらない | - |
| N-06 | README.md にグローバルオプション節と使用例が記載されている | `--log-level` の選択肢・デフォルト・使い方例が読める | - |
| N-07 | SPEC.md §8 に `--log-level` の仕様が記載されている | グローバルオプションとして選択肢とデフォルトが明記されている | - |
| E-01 | `--log-level` 未指定で `KeyboardInterrupt` が発生しても traceback が出力されない | 中断メッセージのみ表示される | - |

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260416-issue48-feat-debug`
- **PR タイトル**: `feat: CLI に --log-level オプションを追加しログ出力・スタックトレースを制御する (issue #48)`
- **対象 issue**: #48

### CHANGELOG 更新

- `CHANGELOG.md` / `CHANGELOG_ja.md` を**新規作成**し、`[Unreleased]` セクションに追記
- 変更種別: `### Added`（新機能追加のため）

### 運用への影響

- 既存機能（`start` / `resume` / `status` / `list`）のデフォルト動作は変更なし
- `--log-level` はグループオプションのため、`spec --log-level=debug start` のように指定する（`spec start --log-level=debug` は不可）
- デフォルトが `warning` のため、通常時のエラー出力がクリーンになる。サポート受付時には `--log-level=debug` 付きの出力を提示するよう README に補足することを推奨

### フィードバックループ

- 今後 CLI コマンドを追加する際は、例外ハンドラに `log_level == "debug"` による traceback 制御を含めるよう `CONTRIBUTING.md` にパターンとして明記することを推奨
