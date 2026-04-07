# 修正計画書：本番モードで127.0.0.1経由アクセス時のCSPエラー（Issue #56）

このドキュメントは、Issue #56「本番モードで127.0.0.1経由アクセス時にCSPエラーでAPIリクエストがブロックされる」の修正方針を記載します。

- **ブランチ**: `takahashi/20260407-issue56-csp`
- **PR**: [#57](https://github.com/elvezjp/SDD/pull/57)

## 修正方針

`frontend/src/api/client.ts` がAPIベースURLのデフォルト値に絶対URL `http://localhost:8000` を使用しているため、アクセスするホスト名（`localhost` vs `127.0.0.1`）によってCSPの `'self'` 判定がずれ、APIリクエストがブロックされる。

本番モードではFastAPIがフロントエンドとAPIの両方を同一サーバーから配信するため、絶対URLは不要。デフォルトを空文字列（相対URL）に変更することで、アクセスするホスト名に依存しない実装にする。

---

## 修正一覧

| # | 問題 | 重大度 | 対象ファイル |
|---|------|--------|-------------|
| 1 | APIベースURLの絶対URL指定により、`127.0.0.1` 経由アクセス時にCSP違反でAPIリクエストがブロックされる | MEDIUM | `frontend/src/api/client.ts` |

---

## 差分分析（期待動作 vs 現在の実装）

### 問題1: APIベースURLに絶対URLを使用（重大度：MEDIUM）

**期待する動作**：
本番モードでは `localhost`・`127.0.0.1` どちら経由でアクセスしても、APIリクエストがCSPエラーなく動作する。

**現在の実装**：

```ts
// frontend/src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

`VITE_API_BASE_URL` が未設定の場合、`http://localhost:8000` にフォールバックする。`http://127.0.0.1:8000` でアクセスした場合、ブラウザは `'self'` = `127.0.0.1:8000` と判定し、`localhost:8000` への接続を別オリジンとして CSP でブロックする。

**影響**: 本番モードで `http://127.0.0.1:8000` からアクセスするとAPIリクエストが全てブロックされ、アプリが動作しない。

**修正内容**：

```ts
// frontend/src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
```

`??` を使うことで `VITE_API_BASE_URL=`（空文字列）も有効な設定として扱える。空文字列をデフォルトにすることで、APIリクエストは `/api/projects/` のような相対URLになり、アクセスするホスト名に関わらず常に同一オリジンとして動作する。

#### 環境別の動作

| 環境 | `VITE_API_BASE_URL` | baseURL | APIリクエスト例 |
|---|---|---|---|
| 本番（未設定） | 未設定 | `''` | `/api/projects/`（相対URL） |
| 開発（Viteプロキシ） | 未設定 | `''` | `/api/projects/` → Viteプロキシ経由 |
| 開発（直接接続） | `http://localhost:8000` | `http://localhost:8000` | `http://localhost:8000/api/projects/` |

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/api/client.ts` | `API_BASE_URL` のデフォルト値を `'http://localhost:8000'` から `''` に変更 |

---

## 試験項目表（2026-04-07）

| # | 確認内容 | 確認方法 | 結果 | 備考 |
|---|---------|---------|------|------|
| 1 | `http://localhost:8000` 経由でアクセスしてAPIが正常に動作する | ブラウザ手動確認（プロジェクト一覧表示） | ✅ | CSPエラーがブラウザコンソールに出ないことも確認 |
| 2 | `http://127.0.0.1:8000` 経由でアクセスしてAPIが正常に動作する | ブラウザ手動確認（プロジェクト一覧表示） | ✅ | CSPエラーがブラウザコンソールに出ないことも確認 |
| 3 | 既存の API エンドポイントが正常に動作する | ブラウザ手動確認（インタビュー一連操作） | ✅ | 修正による意図しない動作変化がないことを確認 |

---

## 参照

- [Issue #56](https://github.com/elvezjp/SDD/issues/56)
- [Issue #45](https://github.com/elvezjp/SDD/issues/45) (CSPヘッダー設定の実装)
