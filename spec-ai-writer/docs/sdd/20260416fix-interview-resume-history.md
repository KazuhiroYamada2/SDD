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

- `_reconstruct_chat_history()` は引数を追加せず、`ContextManager` が持つ `is_phase_complete()` / `get_phase_context()` から完了状態を自己判断する設計に変更。完了工程は Q&A + 完了メッセージ、最初の未完了工程は Q&A のみ追加して打ち切る
- `ContextManager` に `pending_question` フィールドを追加し、LLM が質問を生成した直後に永続化する。`qa_pairs` は回答済みペアしか記録しないため、「待機中の質問」が離脱で失われる問題を根本解決する
- `start_interview()` は `pending_question` があればそれを使い、なければ `_generate_follow_up_question()` で再生成して保存する
- `submit_answer()` は次の質問を生成した直後に `set_pending_question()` で保存する（`add_qa_pair()` が呼ばれると自動クリア）
- 既存モデル（`InterviewStartResponse`）の `chat_history` フィールドを再利用し、API 仕様変更なしで対応する
- フロントエンドは `chat_history` が非空のとき（`all_complete` の値に依らず）ストアへ反映してから `initial_message` を追加する
- 「途中 Q&A が 0 件（工程開始直後の離脱）」「全工程完了後の再訪」の既存動作は変えない

### ファイル別変更計画

| ファイル | 変更種別 | 変更内容の概要 |
|---------|---------|--------------|
| `spec-ai-writer/spec_ai_writer/core/context_manager.py` | 修正 | `set_pending_question()` / `get_pending_question()` / `clear_pending_question()` を追加。`add_qa_pair()` で回答時に `pending_question` を自動クリア |
| `spec-ai-writer/spec_ai_writer/web/routers/interview.py` | 修正 | `_reconstruct_chat_history()` を `ContextManager` の状態から自己判断する設計に変更。`start_interview()` で `pending_question` を使った再開ロジックを追加。`submit_answer()` で次の質問を `set_pending_question()` で保存 |
| `spec-ai-writer/frontend/src/pages/Interview.tsx` | 修正 | `startInterview()` 内で `response.chat_history` が非空なら `all_complete` に関わらずストアへ反映し、その後 `initial_message` を追加する処理に変更 |
| `CHANGELOG.md` / `CHANGELOG_ja.md` | 修正 | `[Unreleased]` セクションを追加し `### Fixed` に本バグ修正を記載 |

---

## ④ タスク分割工程

T5 完了後に T1〜T3 が実施可能。T1・T2 は依存あり（T1 → T2）。T3 は T1・T2 と並列可能。T4 は独立。

### タスク一覧

- [x] T1: `_reconstruct_chat_history()` を再設計 — 引数は追加せず `ContextManager` の状態から完了工程と途中 Q&A を自己判断する設計に変更
- [x] T2: `start_interview()` を修正 — `pending_question` があれば再利用、なければ `_generate_follow_up_question()` で再生成して保存。履歴を `chat_history` に含めて返す
- [x] T3: `Interview.tsx` の `startInterview()` を修正 — `response.chat_history` が非空なら `all_complete` 問わず先に履歴メッセージをストアへ反映し、続けて `initial_message` を追加する
- [x] T4: `CHANGELOG.md` / `CHANGELOG_ja.md` に `[Unreleased]` セクションを追加し `### Fixed` に本バグ修正を記載する
- [x] T5: `ContextManager` に `pending_question` を追加 — `set/get/clear_pending_question()` メソッド追加。`add_qa_pair()` で回答時に自動クリア。`submit_answer()` で次の質問生成直後に保存

---

## ⑤ 実装工程

- **実装日**: 2026-04-16
- **担当**: 高橋 篤剛

| タスク | ファイルパス | 変更内容 |
|--------|-------------|---------|
| T5 | `spec_ai_writer/core/context_manager.py` | `set_pending_question()` / `get_pending_question()` / `clear_pending_question()` を追加。`add_qa_pair()` のフェーズ初期化に `pending_question: None` を追加し、回答時に自動クリア |
| T1 | `spec_ai_writer/web/routers/interview.py` L36-83 | `_reconstruct_chat_history()` を再設計。`ContextManager` の `is_phase_complete()` で完了判定し、未完了工程は Q&A のみ追加して `break`。全完了時のみ「全フェーズ完了」メッセージを末尾に追加 |
| T2 | `spec_ai_writer/web/routers/interview.py` L134-165 | `start_interview()` に `pending_question` 参照を追加。`existing_qa` または `pending_question` があれば履歴付き再開レスポンスを返す。`pending_question` がなければ `_generate_follow_up_question()` で再生成して保存。初回開始時も `set_pending_question()` で保存 |
| T2 | `spec_ai_writer/web/routers/interview.py` L249-270 | `submit_answer()` で `_generate_follow_up_question()` / `_generate_initial_question()` 直後に `set_pending_question()` を呼び出し |
| T3 | `frontend/src/pages/Interview.tsx` L70-87 | `startInterview()` 内の else ブロックで `response.chat_history` が非空なら `addMessage` でストアへ反映してから `initial_message` を追加 |
| T4 | `CHANGELOG.md` / `CHANGELOG_ja.md` | `[Unreleased]` セクションを追加し `### Fixed` / `### 修正` にバグ修正を記載 |

---

## ⑥ 検証・受入工程

### 試験項目表

| 項番 | 項目 | 期待する動作 | 結果 |
|-----|------|------------|------|
| N-01 | 途中離脱後の再訪（途中 Q&A あり） | 離脱前の最後の LLM 質問に対する回答入力を継続できる | OK |
| N-02 | 途中 Q&A 0 件（工程開始直後の離脱） | 従来どおり工程の最初の質問から始まり、履歴は完了済み工程分のみ表示される | OK |
| N-03 | 全工程完了後の再訪 | 従来どおり全 Q&A が表示され、入力欄が無効になる | OK |
| E-01 | `interview.json` の `qa_pairs` が空配列の工程を含む場合 | エラーなく通常の初期質問が返る | OK |

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
