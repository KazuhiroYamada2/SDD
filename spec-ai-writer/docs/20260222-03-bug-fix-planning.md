# バグ修正計画書：インタビュー機能の不具合

このドキュメントは、インタビュー機能で発生している3つのバグの根本原因と修正計画を記載します。

## 修正方針

`02-planning-requirement.md` の機能要件5（中断・再開機能）・機能要件9（Web UIインターフェース）に基づき、インタビューの状態が正しく永続化され、プロジェクトの表示名が正しく表示されるよう修正する。バグ2（Q&A未保存）が最も根本的な問題であり、バグ3（繰り返し質問）を引き起こしているため、修正優先度が最も高い。

## 差分分析（仕様 vs 現在の実装）

### 差分1: インタビュー画面にプロジェクトIDが表示される（重大度：中）

**仕様**（機能要件1）：
> プロジェクト作成時にユーザーが表示名を設定する

**現在の実装**：

`frontend/src/pages/Interview.tsx:164` で、表示名ではなく URL パラメータのプロジェクトIDをそのまま表示している。

```tsx
// Interview.tsx:164 — 誤り
<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
  インタビュー: {projectId}   {/* "ebbab6c1" のようなIDが表示される */}
</h2>
```

加えて、`InterviewStartResponse` モデル（`spec_ai_writer/web/models.py:77-82`）に `display_name` フィールドが存在しない。

```python
class InterviewStartResponse(BaseModel):
    project_id: str
    phase_num: int
    phase_name: str
    initial_message: str
    # display_name が欠落
```

`/start` エンドポイント（`spec_ai_writer/web/routers/interview.py:68-73`）は `context.display_name` を持っているにもかかわらず、レスポンスに含めていない。

---

### 差分2: Q&A履歴が `interview.json` に保存されない（重大度：高）

**仕様**（機能要件5）：
> インタビューの状態をプロジェクトディレクトリ内の `interview.json` に永続化する
> Q&A履歴、工程進捗、構造化データを保存する

**現在の実装**：

`/answer` エンドポイント（`spec_ai_writer/web/routers/interview.py:88-165`）は、ユーザーの回答を受け取った後、`context.add_qa_pair()` を呼び出していない。コメントだけが残っており、実装が行われていない。

```python
# interview.py:114-117（問題箇所）
# Process answer (this would normally happen in the interview loop)
# For simplicity, we'll add the Q&A pair directly
phase_context = context.get_phase_context(current_phase)
qa_pairs = phase_context.get("qa_pairs", [])
# ← ここで context.add_qa_pair() を呼ぶ実装が欠落
```

この結果、実際の `data/ebbab6c1/interview.json` の内容は以下の通り Q&A が空のまま：

```json
{
  "project_id": "ebbab6c1",
  "display_name": "TODOアプリ",
  "current_phase": 1,
  "phases": {}
}
```

また、`UserAnswerRequest` モデルには `answer` のみがあり、「どの質問への回答か」を示す `question` フィールドが存在しない。このため、エンドポイントはQ&Aペアを保存しようにも質問文を取得できない。

```python
class UserAnswerRequest(BaseModel):
    project_id: str
    answer: str
    # question フィールドが欠落 → Q&Aペアの保存ができない
```

---

### 差分3: 同じ質問が繰り返される・Phase1を完了できない（重大度：高）

**仕様**（機能要件3）：
> 最低3回以上のQ&Aが完了していることを確認する

**現在の実装**：

差分2の直接的な副作用。`_is_phase_complete()` は `qa_pairs` の件数で完了判定を行うが、Q&Aが保存されないため常に `len(qa_pairs) == 0 < 3` となり、永遠に `False` を返す。

```python
# interview_engine.py:354-377
def _is_phase_complete(self, phase_num, context_manager):
    phase_context = context_manager.get_phase_context(phase_num)
    qa_pairs = phase_context.get("qa_pairs", [])

    if len(qa_pairs) < 3:   # qa_pairs は常に [] → 常に True → 常に False を返す
        return False

    return self._check_phase_completion(phase_num)
```

また、`_generate_follow_up_question()` が `_build_context_for_question()` 経由でコンテキストを読み込む際、`qa_pairs` が空なので会話履歴がない状態で質問を生成し続ける。これにより、LLMが毎回ほぼ同じ初回質問を生成する。

---

## 修正計画

### フェーズ1: Q&A保存の実装（差分2対応）

バグの根本原因のため最優先で修正する。

#### 1-1. `UserAnswerRequest` に `question` フィールドを追加

**対象ファイル**: [spec_ai_writer/web/models.py](../spec_ai_writer/web/models.py)

変更内容：
- `UserAnswerRequest` に `question: str` フィールドを追加
- フロントエンドがユーザーへの質問（直前のアシスタントメッセージ）を送信できるようにする

```python
class UserAnswerRequest(BaseModel):
    project_id: str
    question: str   # 追加：ユーザーが回答した質問文
    answer: str
```

#### 1-2. `/answer` エンドポイントに `add_qa_pair()` を追加

**対象ファイル**: [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容：
- `context.add_qa_pair(current_phase, request.question, request.answer)` を呼び出す（自動的に `save_to_disk()` が実行される）
- `phase_complete` 判定の前にQ&Aを保存する順序を確保する

修正後の処理フロー（`/answer` エンドポイント内）：

```
1. context をロード
2. current_phase を決定
3. context.add_qa_pair(current_phase, request.question, request.answer) で保存 ← 追加
4. _is_phase_complete() で完了判定
5. 完了 → 仕様書生成 + 次フェーズへ
   未完了 → フォローアップ質問を生成して返す
```

#### 1-3. フロントエンドの送信データに `question` を追加

**対象ファイル**: `frontend/src/pages/Interview.tsx`

変更内容：
- `handleSubmit()` 内で `apiClient.submitAnswer()` を呼ぶ際、直前のアシスタントメッセージ（`question`）を一緒に送信する
- `messages` ストアから最後の `role: 'assistant'` メッセージを取得して渡す

---

### フェーズ2: 表示名の表示修正（差分1対応）

フェーズ1と独立しているため並行して対応可能。

#### 2-1. `InterviewStartResponse` に `display_name` を追加

**対象ファイル**: [spec_ai_writer/web/models.py](../spec_ai_writer/web/models.py)

変更内容：
```python
class InterviewStartResponse(BaseModel):
    project_id: str
    display_name: str   # 追加
    phase_num: int
    phase_name: str
    initial_message: str
```

#### 2-2. `/start` エンドポイントで `display_name` をレスポンスに設定

**対象ファイル**: [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容：
- `context.display_name` を `InterviewStartResponse` に含める（`context` は既にロード済みのため追加のI/Oなし）

```python
return InterviewStartResponse(
    project_id=request.project_id,
    display_name=context.display_name,   # 追加
    phase_num=phase_num,
    phase_name=phase_info.name,
    initial_message=initial_question
)
```

#### 2-3. フロントエンドで `display_name` を表示

**対象ファイル**: `frontend/src/pages/Interview.tsx`

変更内容：
- `startInterview()` のレスポンスから `display_name` を取得して state に保存
- ヘッダーで `{projectId}` の代わりに `display_name` を表示

```tsx
// 修正前
インタビュー: {projectId}

// 修正後
インタビュー: {displayName}
```

`useInterviewStore` に `displayName` / `setDisplayName` を追加する必要があるか、または `Interview.tsx` のローカル state に保持する。

---

### フェーズ3: 繰り返し質問の解消確認（差分3対応）

フェーズ1の修正で Q&A が保存されるようになれば、`_is_phase_complete()` の判定が正常に動作し、バグ3は自動的に解消される見込み。フェーズ1の修正後に動作確認を行い、解消されない場合は追加対応する。

#### 確認事項

フェーズ1の修正後に以下を確認する：
1. Q&A を3回以上行った後、`interview.json` の `phases.1.qa_pairs` に3件以上の記録があること
2. `_is_phase_complete()` が `True` を返し、Phase1完了フラグが立つこと
3. フロントエンドが `phase_complete: true` を受け取り、次フェーズへ進むメッセージが表示されること

---

### 差分4: フェーズ完了時に「次のフェーズが完了」と表示される（重大度：中）

**仕様**（機能要件9）：
> チャット形式のインタビュー画面でLLMと対話する

**現在の実装**：

バックエンドの `/answer` エンドポイント（`interview.py`）は、フェーズ完了時に `phase_num=current_phase + 1`（**次**のフェーズ番号）を返す。

```python
# interview.py — フェーズ完了時
return AssistantQuestionResponse(
    question=next_question,
    phase_complete=True,
    phase_num=current_phase + 1,  # 次フェーズ番号を返している
    qa_count=0
)
```

フロントエンドはこの `phase_num` を「完了したフェーズ番号」として表示する。

```tsx
// Interview.tsx — phase_complete=true 時
content: `フェーズ ${response.phase_num} が完了しました。`
// → Phase1完了時に response.phase_num=2 が返るため「フェーズ 2 が完了」と表示される
```

さらに `setCurrentPhase(response.phase_num + 1, '')` で現在フェーズを `2+1=3` にセットしてしまう（Phase2がスキップされる）。

---

### 差分5: 仕様書一覧画面にプロジェクトIDが表示される（重大度：中）

**仕様**（機能要件1）：
> プロジェクト作成時にユーザーが表示名を設定する

**現在の実装**：

`frontend/src/pages/Specifications.tsx:79` で、表示名ではなく URL パラメータの `projectId` をそのまま表示している。

```tsx
// Specifications.tsx:79 — 誤り
<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
  仕様書: {projectId}
</h2>
```

プロジェクトの `display_name` を取得する API 呼び出しが行われていない。

---

### 差分6: チャット画面でMarkdownが描画されない（重大度：中）

**仕様**（機能要件9）：
> チャット形式のインタビュー画面でLLMと対話する

**現在の実装**：

`frontend/src/pages/Interview.tsx` のメッセージ描画部分が `<p>` タグのプレーンテキストのみで実装されており、LLMが返すMarkdown記法（`**太字**`、箇条書きなど）がそのまま文字列として表示される。

```tsx
// Interview.tsx — 現状（Markdownが描画されない）
<p className="whitespace-pre-wrap">{message.content}</p>
```

`react-markdown`（v9.0.1）と `remark-gfm`（v4.0.0）、`@tailwindcss/typography` は `package.json` に既にインストール済みであるが、使用されていない。

---

## 修正計画（追加）

### フェーズ4: フェーズ完了番号の修正（差分4対応）

#### 4-1. バックエンドのフェーズ番号を「完了したフェーズ」に統一

**対象ファイル**: [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容:
- `phase_complete=True` 時の `phase_num` を `current_phase + 1`（次フェーズ）から `current_phase`（完了フェーズ）に変更
- `AssistantQuestionResponse` の `phase_num` は常に「現在処理中のフェーズ」を表す意味に統一する

#### 4-2. フロントエンドの次フェーズ遷移ロジックを修正

**対象ファイル**: `frontend/src/pages/Interview.tsx`

変更内容:
- `phase_complete=true` 時に `setCurrentPhase(response.phase_num + 1, '')` で次フェーズへ遷移する（バックエンド修正後は `response.phase_num + 1` が正しい次フェーズ番号になる）
- 完了メッセージを `フェーズ ${response.phase_num} が完了しました。` と表示する（修正後は正しいフェーズ番号が表示される）

---

### フェーズ5: 仕様書画面の表示名修正（差分5対応）

#### 5-1. プロジェクト情報を取得して `display_name` を表示

**対象ファイル**: `frontend/src/pages/Specifications.tsx`

変更内容:
- `apiClient.getProject(projectId)` を `useQuery` で呼び出し、`display_name` を取得する
- ヘッダーの `{projectId}` を `{projectData?.display_name || projectId}` に変更する

---

### フェーズ6: チャット画面のMarkdownレンダリング（差分6対応）

#### 6-1. アシスタントメッセージを `ReactMarkdown` で描画

**対象ファイル**: `frontend/src/pages/Interview.tsx`

変更内容:
- `react-markdown` と `remark-gfm` を import する
- アシスタントメッセージ（`role === 'assistant'`）のみ `<ReactMarkdown>` で描画する
- Tailwind の `prose` クラスを適用してタイポグラフィスタイルを有効にする
- ユーザーメッセージ・システムメッセージはプレーンテキストのまま維持する

---

## 実装順序と依存関係

```
フェーズ1（Q&A保存）  ─────────────────────────────────────────┐
  1-1. UserAnswerRequest に question 追加（models.py）          │
  1-2. /answer エンドポイントに add_qa_pair() 追加（interview.py）│
  1-3. フロントエンドの送信データに question 追加（Interview.tsx） │
                                                                ↓
フェーズ2（表示名）   フェーズ3（確認）────────────────── 動作確認
  2-1. InterviewStartResponse に display_name 追加（models.py）
  2-2. /start エンドポイントで display_name 設定（interview.py）
  2-3. フロントエンドで display_name 表示（Interview.tsx）

フェーズ4（フェーズ番号）─ 独立して実施可能
  4-1. /answer の phase_num を完了フェーズに修正（interview.py）
  4-2. フロントエンドの次フェーズ遷移ロジック修正（Interview.tsx）

フェーズ5（仕様書画面）─ 独立して実施可能
  5-1. Specifications.tsx で display_name を取得・表示

フェーズ6（Markdown）─ 独立して実施可能
  6-1. Interview.tsx で ReactMarkdown を使用
```

- フェーズ1とフェーズ2は並行して着手可能
- フェーズ3（差分3の確認）はフェーズ1完了後に実施
- フェーズ4・5・6は他フェーズと独立して実施可能

## 設計判断の記録（Decision Records）

### 判断1: 質問文はフロントエンドから送信する

**決定**: `UserAnswerRequest` に `question` フィールドを追加し、フロントエンドが直前の質問文を送信する
**理由**: バックエンドはステートレスな REST API であり、「直前に送った質問」をサーバー側で保持していない。`interview.json` に「最後に送った質問」フィールドを別途追加する案もあるが、フロントエンドが既に `messages` 配列として会話履歴を保持しているため、クライアント側から送信するほうが実装が単純になる
**日付**: 2026-02-22

### 判断2: `display_name` を `InterviewStartResponse` に含める

**決定**: `/start` レスポンスに `display_name` を追加し、フロントエンドが受け取る
**理由**: フロントエンドが URL パラメータの `project_id` しか知らない状態を解消するため、インタビュー開始時に一度取得すれば以降は再取得不要。プロジェクト詳細APIへの追加リクエストを避けられる
**日付**: 2026-02-22

### 判断3: `/answer` の `phase_num` は「完了したフェーズ」を表す

**決定**: `phase_complete=True` 時も `phase_num=current_phase`（完了フェーズ）を返し、次フェーズ番号はフロントエンドが `phase_num + 1` で計算する
**理由**: `phase_complete=False` 時と `True` 時で `phase_num` の意味が異なる（前者は現在フェーズ、後者は次フェーズ）という実装の非一貫性を解消する。`phase_num` は常に「今処理したフェーズ」を表すよう統一することで、フロントエンド側のロジックが明確になる
**日付**: 2026-02-22

### 判断4: 仕様書画面は `getProject` API で `display_name` を取得する

**決定**: `Specifications.tsx` で `apiClient.getProject(projectId)` を呼び出し、`display_name` を取得する
**理由**: Interview.tsx と異なり、仕様書画面はインタビュー開始 API を呼ばないため、別途プロジェクト情報を取得する必要がある。既存の `getProject` エンドポイントが利用可能なため追加 API 実装は不要
**日付**: 2026-02-22

---

**注意**: この修正計画書はインタビュー機能の動作不具合に対するバグ修正を対象としています。`02-planning-requirement.md` の仕様に基づき、Q&Aの永続化と中断・再開が正しく機能することを修正完了の基準とします。
