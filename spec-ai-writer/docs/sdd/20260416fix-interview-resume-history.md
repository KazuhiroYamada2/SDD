# インタビュー中断・再訪時の途中再開と履歴復元 (Issue #67)

このファイルは、仕様駆動開発の**7つの工程**のうち原則決定工程を除く6工程を一つのドキュメントにまとめた記録です。
工程ごとにファイルを分けるとファイル数が発散するため、全工程を1ファイルで管理します。

---

## ② 企画・要件定義工程

### 目的

Web UI でインタビューを途中まで進めた状態で別画面に遷移し、再度インタビュー画面に戻ったとき、**離脱前の続きから再開でき、これまでのチャット履歴が画面上に復元される**よう修正する。

### 背景

`interview.json` への Q&A 永続化は正常に機能しているにもかかわらず、`POST /api/interview/start` が未完了工程を検出した際に保存済みの途中 Q&A を無視して `_generate_initial_question()` を呼ぶ実装になっている。そのため「同じ地点から再開」という [SPEC.md「5. 中断・再開機能」](../SPEC.md#L92-L99) の仕様と乖離が生じている。

また `_reconstruct_chat_history()` は全工程完了時にのみ呼ばれており、途中再開では過去工程の Q&A も含め画面上のチャット履歴がすべて消える。フロントエンドでは `startInterview()` マウント時に `reset()` でストアを初期化したうえで `initial_message` だけを描画するため、`all_complete=False` の場合は `chat_history` が返却されても反映されない。

### 仕様書・ドキュメントの整合確認

| ドキュメント | 現状 | 対応 |
|------------|------|------|
| `spec-ai-writer/docs/SPEC.md` L92-L99「5. 中断・再開機能」 | 「同じ地点から再開できる」と正しく記述済み。**実装が仕様に追いついていないバグ** | 更新不要 |
| `spec-ai-writer/README.md` L15 | 「中断・再開機能: インタビューを途中で保存して後で再開可能」と正しく記述済み | 更新不要 |
| `CHANGELOG.md` / `CHANGELOG_ja.md` | `[1.0.3]` 以降に本バグ修正の記録なし | `[Unreleased]` セクションを追加して `### Fixed` に記載が必要 |

---

## ③ 設計計画工程

### 方針

- バックエンドの `_reconstruct_chat_history()` を「完了済み工程 + 現工程の途中 Q&A」まで対応できるよう引数を追加して拡張する
- `start_interview()` で未完了工程に途中 Q&A が存在する場合、最後の質問を `initial_message`、過去履歴を `chat_history` として返す
- 既存モデル（`InterviewStartResponse`）の `chat_history` フィールドを再利用し、API 仕様変更なしで対応する
- フロントエンドは `chat_history` が非空のとき（`all_complete` の値に依らず）ストアへ反映してから `initial_message` を追加する
- 「途中 Q&A が 0 件（工程開始直後の離脱）」「全工程完了後の再訪」の既存動作は変えない

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/spec_ai_writer/web/routers/interview.py` | 修正 | `_reconstruct_chat_history()` に `up_to_phase` / `partial_qa_pairs` 引数を追加。`start_interview()` で途中 Q&A 有りの場合に履歴付きレスポンスを返す分岐を追加 |
| `spec-ai-writer/frontend/src/pages/Interview.tsx` | 修正 | `startInterview()` 内で `response.chat_history` が非空なら `all_complete` に関わらずストアへ反映し、その後 `initial_message` を追加する処理に変更 |

---

## ④ タスク分割工程

T1 完了後に T2・T3 が実施可能。T2 と T3 は並列対応可能。

### タスク一覧

- [ ] T1: `_reconstruct_chat_history()` を拡張 — `up_to_phase: int`（デフォルト 7）と `partial_qa_pairs: list`（デフォルト空）引数を追加し、現工程の途中 Q&A も含めて履歴を構築できるようにする
- [ ] T2: `start_interview()` を修正 — 未完了工程に途中 Q&A が存在する場合、`chat_history` に T1 の拡張関数の結果を、`initial_message` に最後の質問をセットして返す
- [ ] T3: `Interview.tsx` の `startInterview()` を修正 — `response.chat_history` が非空なら `all_complete` 問わず先に履歴メッセージをストアへ反映し、続けて `initial_message` を追加する
- [ ] T4: `CHANGELOG.md` / `CHANGELOG_ja.md` に `[Unreleased]` セクションを追加し `### Fixed` に本バグ修正を記載する

---

## ⑤ 実装工程

※ 実装後に記録する（実装日・担当・変更内容表）

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | 途中離脱後の再訪（途中 Q&A あり） | 離脱前の最後の LLM 質問に対する回答入力を継続できる | - |
| N-02 | チャット履歴の復元 | 1・2 工程目および 3 工程目途中までの Q&A がすべて吹き出し表示される | - |
| N-03 | 途中 Q&A 0 件（工程開始直後の離脱） | 従来どおり工程の最初の質問から始まり、履歴は完了済み工程分のみ表示される | - |
| N-04 | 全工程完了後の再訪 | 従来どおり全 Q&A が表示され、入力欄が無効になる | - |
| E-01 | `interview.json` の `qa_pairs` が空配列の工程を含む場合 | エラーなく通常の初期質問が返る | - |
| E-02 | フロントエンドで `chat_history` が空配列のレスポンスを受け取った場合 | ストアへの反映処理がスキップされ、`initial_message` のみ表示される | - |

---

## ⑦ 移行・運用工程

### PR 作成

- **ブランチ名**: `takahashi/20260416-issue67-fix-interview`
- **PR タイトル**: `fix: インタビュー中断・再訪時の途中再開と履歴復元 (issue #67)`
- **対象 issue**: #67

### CHANGELOG 更新

- `CHANGELOG.md` / `CHANGELOG_ja.md` の `[Unreleased]` セクション `### Fixed` に記載する（T4）

### 運用への影響

- API レスポンスの `chat_history` フィールドは既存モデルに存在するため、後方互換性あり
- フロントエンドの変更は描画ロジックのみで、ストアの構造変更なし

### フィードバックループ

- `_reconstruct_chat_history()` のような「全完了時のみ」前提の関数は、途中再開ユースケースを見落としやすい。今後同種の履歴系関数を追加する際は、部分完了状態を引数で受け取れる設計にする
