# 修正計画書：プロダクションビルド対応（Issue #33）

このドキュメントは、Issue #33「frontend: Web UIの提供をnpm run dev（開発サーバー）に依存している」の修正方針と実装計画を記載します。

## 修正方針

以下の3ステップで解決する。

1. TypeScriptエラーを修正して `npm run build` が通るようにする（6件）
2. `APP_ENV` 環境変数（`development` / `production`）でフロントエンドサーブを明示的に制御できるようにする
3. READMEの起動手順を更新する（本番ビルド推奨 + 開発モードの両方を記載）

---

## TypeScriptエラー一覧

| # | ファイル | 行 | エラー内容 | 原因 |
|---|---------|----|-----------|----|
| 1 | `src/api/client.ts` | 23, 24 | `Property 'env' does not exist on type 'ImportMeta'` | `vite/client` 型定義が tsconfig に含まれていない |
| 2 | `src/pages/Dashboard.tsx` | 72 | 同上 | 同上 |
| 3 | `src/api/mockClient.ts` | 167 | `Property 'display_name' is missing` | `InterviewStartResponse` の必須フィールドがモック戻り値に不足 |
| 4 | `src/components/Layout.tsx` | 2 | `'MessageSquare' is declared but its value is never read` | インポートしているが JSX 内で使っていない |
| 5 | `src/store/__tests__/useProjectStore.test.ts` | 24, 40 | `'name' does not exist in type 'Project'` | テストモックデータが旧フィールド名 `name` を使用。現 `Project` 型は `project_id` + `display_name` |
| 6 | `src/test/setup.ts` | 26 | `Cannot find name 'global'` | `@types/node` 未インストールのため Node.js の `global` が型未解決 |

---

## 差分分析（期待動作 vs 現在の実装）

### エラー1・2: `import.meta.env` 型未定義

**期待する動作**：`import.meta.env.VITE_*` が型安全に参照できる。

**現在の実装**：`tsconfig.json` の `lib` に Vite のクライアント型が含まれておらず `ImportMeta.env` が未定義。

**修正内容**：`src/vite-env.d.ts` を新規作成して Vite の型参照を追加する。

```typescript
// src/vite-env.d.ts（新規作成）
/// <reference types="vite/client" />
```

---

### エラー3: `mockClient.ts` の `display_name` 不足

**期待する動作**：`startInterview` がすべての必須フィールドを含む `InterviewStartResponse` を返す。

**現在の実装**：

```typescript
// mockClient.ts:167-173（問題箇所）
return {
  project_id: data.project_id,
  phase_num: phaseNum,
  phase_name: phaseNames[phaseNum - 1],
  initial_message: `...`,  // display_name が欠如
};
```

**修正内容**：

```typescript
return {
  project_id: data.project_id,
  display_name: data.project_id,  // ← 追加
  phase_num: phaseNum,
  phase_name: phaseNames[phaseNum - 1],
  initial_message: `...`,
};
```

---

### エラー4: `Layout.tsx` の未使用インポート

**修正内容**：`MessageSquare` を import 文から削除する。

```typescript
// 修正前
import { FileText, LayoutDashboard, MessageSquare } from 'lucide-react';

// 修正後
import { FileText, LayoutDashboard } from 'lucide-react';
```

---

### エラー5: `useProjectStore.test.ts` のモックデータ型不一致

**期待する動作**：テストモックデータが現在の `Project` 型（`project_id` + `display_name`）に合致している。

**現在の実装**：旧フィールド名 `name` を使用しており、`project_id` と `display_name` が欠如。

**修正内容**：

```typescript
// 修正前
{
  name: 'project-1',
  current_phase: 1,
  ...
}

// 修正後
{
  project_id: 'project-1',
  display_name: 'Project 1',
  current_phase: 1,
  ...
}
```

---

### エラー6: `setup.ts` の `global` 型未解決

**期待する動作**：`global.IntersectionObserver` をモックできる。

**現在の実装**：`@types/node` 未インストールのため `global` が型エラー。

**修正内容**：`global` を `(global as unknown as Window)` にキャストする（`@types/node` の追加は不要）。

```typescript
// 修正前
global.IntersectionObserver = class IntersectionObserver { ... } as any

// 修正後
(global as unknown as Window).IntersectionObserver = class IntersectionObserver { ... } as any
```

---

### バックエンド: `APP_ENV` 環境変数による制御

**期待する動作**：`APP_ENV=production` のとき `frontend/dist` をサーブし、`APP_ENV=development`（デフォルト）のときはサーブしない。`dist/` の有無で挙動が変わらない。

**現在の実装**：

```python
# app.py:76-78（コメントアウト）
# frontend_build_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
# if frontend_build_dir.exists():
#     app.mount("/", StaticFiles(directory=str(frontend_build_dir), html=True), name="frontend")
```

**修正内容（3ファイル）**：

**(a) `config/settings.py`** — `app_env` フィールドを追加する。

```python
app_env: str = Field(
    default="production",
    description="Application environment: 'production' or 'development'"
)
```

**(b) `spec_ai_writer/web/app.py`** — `settings.app_env` で条件分岐する。

```python
# Static files for production build
if settings.app_env == "production":
    frontend_build_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
    app.mount("/", StaticFiles(directory=str(frontend_build_dir), html=True), name="frontend")
```

**(c) `.env.example`** — `APP_ENV` を追加する。

```env
# Application environment
# production (default): Serve built frontend (frontend/dist) from Python server → http://localhost:8000
#                        Run `cd frontend && npm run build` before starting.
# development:           Use Vite dev server (npm run dev) for frontend → http://localhost:3000
APP_ENV=production
```

---

### README.md: 起動手順の更新

**期待する動作**：本番ビルドを推奨として記載し、開発モード（`npm run dev`）も引き続き利用可能であることが分かる。

**現在の実装**（`README.md:112-131`）：

```markdown
#### 通常モード（LLM API使用）

1. バックエンドサーバー起動
2. フロントエンド開発サーバー起動 (npm run dev, 別ターミナル)
→ http://localhost:3000
```

**修正内容**：

```markdown
#### 通常モード（LLM API使用）

**本番ビルド（推奨）**

1. フロントエンドをビルド（初回またはソース変更後のみ）:
   cd frontend && npm install && npm run build

2. .env に APP_ENV=production を設定

3. バックエンドサーバー起動:
   uv run python -m spec_ai_writer.web.app

→ http://localhost:8000 でアクセス

**開発モード（フロントエンドを変更する場合）**

1. .env に APP_ENV=development を設定（またはデフォルトのまま）

2. バックエンドサーバー起動:
   uv run python -m spec_ai_writer.web.app

3. フロントエンド開発サーバー起動（別ターミナル）:
   cd frontend && npm install && npm run dev

→ http://localhost:3000 でアクセス（Vite が /api を localhost:8000 にプロキシ）
```

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/vite-env.d.ts` | 新規作成。`/// <reference types="vite/client" />` を追加 |
| `frontend/src/api/mockClient.ts` | `startInterview` 戻り値に `display_name` を追加 |
| `frontend/src/components/Layout.tsx` | 未使用 `MessageSquare` のインポートを削除 |
| `frontend/src/store/__tests__/useProjectStore.test.ts` | モックデータのフィールドを `project_id` + `display_name` に修正 |
| `frontend/src/test/setup.ts` | `global` を `(global as unknown as Window)` にキャスト |
| `config/settings.py` | `app_env: str` フィールドを追加 |
| `spec_ai_writer/web/app.py` | `settings.app_env == "production"` で静的ファイルサーブを制御 |
| `.env.example` | `APP_ENV=development` を追記 |
| `README.md` | 本番ビルド（推奨）と開発モードの両手順を記載。アクセス先を明示 |

---

## 試験項目表

| # | 確認内容 | 確認方法 | 結果 | 備考 |
|---|---------|---------|------|------|
| 1 | `npm run build` がエラーなく完了する | `cd frontend && npm run build` | | |
| 2 | `frontend/dist/` が生成される | ビルド後のディレクトリ確認 | | |
| 3 | `APP_ENV=production` でサーバー起動後、`http://localhost:8000/` でWeb UIが表示される | ブラウザ目視確認 | | |
| 4 | `APP_ENV=development` でサーバー起動後、`dist/` があってもWeb UIはサーブされない | `curl http://localhost:8000/` でJSON応答を確認 | | |
| 5 | APIエンドポイント（`/api/health` 等）が両モードで引き続き動作する | `curl http://localhost:8000/api/health` | | |
| 6 | インタビュー開始・回答送信が正常に動作する（StrictMode二重呼び出し問題が解消） | ブラウザ目視確認（`APP_ENV=production`） | | |
| 7 | 開発モード（`npm run dev` + `APP_ENV=development`）でも引き続き動作する | `http://localhost:3000` でアクセス | | |
| 8 | README の起動手順が本番ビルド・開発モード両方記載されている | コードレビュー | | |
