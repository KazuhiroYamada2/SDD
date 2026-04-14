# 修正計画書：UserAnswerRequest 入力サイズ上限の設定（Issue #44）

このドキュメントは、Issue #44「UserAnswerRequest の question/answer に max_length を追加」の修正方針を記載します。

## 修正方針

`UserAnswerRequest` の `question` / `answer` フィールドに `max_length` が未設定だった。
悪意あるユーザーが巨大な入力を送信することで、LLM トークン費用の増大やリソース枯渇（コスト攻撃）が発生しうる。

バリデーション違反は FastAPI / Pydantic の標準動作として HTTP 422 で返す。
フロントエンド側でエラーの `type` を使って日本語メッセージに変換し、ユーザーに通知する。

---

## 修正一覧

| # | 問題 | 重大度 | 対象ファイル |
|---|------|--------|-------------|
| 1 | `question` / `answer` に入力長上限がなく、コスト攻撃が可能 | MEDIUM | `web/models.py` |
| 2 | 422 エラー時にフロントエンドが汎用メッセージを表示し、原因がユーザーに伝わらない | LOW | `frontend/src/pages/Interview.tsx` |

---

## 差分分析（期待動作 vs 現在の実装）

### 問題1: 入力長上限なし（重大度：MEDIUM）

**期待する動作**：
`question` は 2,000 文字以内、`answer` は 3,000 文字以内に制限し、超過時は 422 を返す。

**現在の実装**：

`web/models.py:104-108` の `UserAnswerRequest` で `question` / `answer` に `max_length` が設定されていない。

```python
# models.py（問題箇所）
class UserAnswerRequest(BaseModel):
    project_id: str
    question: str  # ← max_length なし
    answer: str    # ← max_length なし
```

**影響**: 任意サイズの入力を受け付けるため、LLM への過大なトークン送信によるコスト攻撃が可能。

**修正内容**：

```python
class UserAnswerRequest(BaseModel):
    project_id: str
    question: str = Field(..., max_length=2000)
    answer: str = Field(..., max_length=3000)
```

#### 設定値の根拠

日本語テキストのトークン換算（Claude / GPT 系モデル共通）:
- 日本語 1 文字 ≈ **2 トークン**（安全側の推定）

フェーズ内で Q&A ペアが蓄積されていく設計のため、会話履歴全体のトークン消費量を考慮する。

| モデル | コンテキスト上限 | システム+仕様書 予約 | 回答生成 予約 | 会話履歴利用可能 | 10ペア蓄積時の1回答あたりトークン | 日本語換算 |
|---|---|---|---|---|---|---|
| GPT-4 Turbo | 128k | 6,000 | 4,096 | ~118,000 | ~5,900 | **~2,950文字** |
| claude-sonnet-4-6 | 200k | 6,000 | 4,096 | ~190,000 | ~9,500 | **~4,750文字** |
| Claude Haiku 4.5 | 200k | 6,000 | 4,096 | ~190,000 | ~9,500 | **~4,750文字** |

最も制約の大きい GPT-4 Turbo（128k コンテキスト）を基準に、余裕を持たせた値として `answer=3,000文字` を採用。

なお、Issue #24 の提案値（`max_length=10000`）は根拠の記載がなく、日本語 10,000 文字 ≈ 20,000 トークンとなり、10 ペア蓄積時に GPT-4 Turbo のコンテキスト上限を超過するリスクがある。

---

### 問題2: 422 エラー時のフロントエンド通知（重大度：LOW）

**期待する動作**：
バリデーション違反（422）の場合、ユーザーに入力の何が問題かを日本語で伝える。

**現在の実装**：

`frontend/src/pages/Interview.tsx` の catch ブロックがすべてのエラーを同一のメッセージで処理している。

```typescript
// Interview.tsx（問題箇所）
} catch (err) {
  addMessage({
    role: 'system',
    content: '回答の送信中にエラーが発生しました。再度お試しください。',
  });
}
```

**影響**: 422（入力長超過）時にも「再度お試しください」と表示され、ユーザーが同じ長さで再送信し続ける。

**修正内容**：

FastAPI の 422 レスポンスの `detail` 配列から `type` フィールドを使って日本語メッセージに変換する。
`msg` フィールド（Pydantic 自動生成の英語文）は使用しない。

```typescript
function format422Error(detail: Array<{ type: string; ctx?: Record<string, unknown> }>): string {
  return detail
    .map(({ type, ctx }) => {
      switch (type) {
        case 'string_too_long':
          return `入力が長すぎます（上限: ${ctx?.max_length}文字）`;
        case 'string_too_short':
          return `入力が短すぎます（最低: ${ctx?.min_length}文字）`;
        case 'greater_than_equal':
        case 'less_than_equal':
          return 'フェーズ番号が無効です';
        default:
          return 'リクエストの形式が無効です';
      }
    })
    .join('、');
}
```

| type | 日本語メッセージ |
|---|---|
| `string_too_long` | `入力が長すぎます（上限: {max_length}文字）` |
| `string_too_short` | `入力が短すぎます（最低: {min_length}文字）` |
| `greater_than_equal` / `less_than_equal` | `フェーズ番号が無効です` |
| その他 | `リクエストの形式が無効です` |

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `spec_ai_writer/web/models.py` | `question` / `answer` に `Field(..., max_length=N)` を追加 |
| `frontend/src/pages/Interview.tsx` | `format422Error()` を追加、catch ブロックで 422 を判定して日本語メッセージを表示 |

---

## 試験項目表（2026-04-06）

| # | 問題 | 確認方法 | 結果 | 備考 |
|---|------|---------|------|------|
| 1 | `answer` に 3,001 文字を送信 | ブラウザ手動確認 | ✅ | サーバー 422、フロント「入力が長すぎます（上限: 3000文字）」を確認 |
| 2 | `question` に 2,001 文字を送信 | Swagger UI 手動確認 | ✅ | サーバー 422、フロント「入力が長すぎます（上限: 2000文字）」を確認 |

---

## 参照

- [Issue #44](https://github.com/elvezjp/SDD/issues/44)
- [Issue #24](https://github.com/elvezjp/SDD/issues/24) (項目 #4)
