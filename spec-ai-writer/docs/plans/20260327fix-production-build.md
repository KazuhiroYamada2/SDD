# 修正計画書：プロダクションビルド対応（Issue #33）

このドキュメントは、Issue #33「frontend: Web UIの提供をnpm run dev（開発サーバー）に依存している」の修正方針と実装計画を記載します。

## 修正方針

以下の3ステップで解決する。

1. TypeScriptエラーを修正して `npm run build` が通るようにする（6件）
2. `app.py` のコメントアウトを解除し、バックエンドが `frontend/dist` をサーブできるようにする
3. READMEの起動手順を更新する

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

### バックエンド: `app.py` コメントアウト解除

**期待する動作**：`npm run build` で生成した `frontend/dist` を Python サーバーが直接サーブする。

**現在の実装**：

```python
# app.py:76-78（コメントアウト）
# frontend_build_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
# if frontend_build_dir.exists():
#     app.mount("/", StaticFiles(directory=str(frontend_build_dir), html=True), name="frontend")
```

**修正内容**：コメントアウトを解除し、`/api/*` ルートより後に配置する。

```python
# Static files for production build
frontend_build_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_build_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_build_dir), html=True), name="frontend")
```

また、`root()` エンドポイントは `StaticFiles` が `GET /` をハンドルするため不要になる。ただしビルドが存在しない場合のフォールバックとして残す。

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/vite-env.d.ts` | 新規作成。`/// <reference types="vite/client" />` を追加 |
| `frontend/src/api/mockClient.ts` | `startInterview` 戻り値に `display_name` を追加 |
| `frontend/src/components/Layout.tsx` | 未使用 `MessageSquare` のインポートを削除 |
| `frontend/src/store/__tests__/useProjectStore.test.ts` | モックデータのフィールドを `project_id` + `display_name` に修正 |
| `frontend/src/test/setup.ts` | `global` を `(global as unknown as Window)` にキャスト |
| `spec_ai_writer/web/app.py` | 静的ファイルサーブのコメントアウトを解除 |

---

## 試験項目表

| # | 確認内容 | 確認方法 | 結果 | 備考 |
|---|---------|---------|------|------|
| 1 | `npm run build` がエラーなく完了する | `cd frontend && npm run build` | | |
| 2 | `frontend/dist/` が生成される | ビルド後のディレクトリ確認 | | |
| 3 | `python -m spec_ai_writer.web.app` 起動後、`http://localhost:8000/` でWeb UIが表示される | ブラウザ目視確認 | | |
| 4 | APIエンドポイント（`/api/health` 等）が引き続き動作する | `curl http://localhost:8000/api/health` | | |
| 5 | インタビュー開始・回答送信が正常に動作する（StrictMode二重呼び出し問題が解消） | ブラウザ目視確認 | | |
