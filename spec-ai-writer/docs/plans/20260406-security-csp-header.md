# 修正計画書：Content Security Policy ヘッダーの設定（Issue #45）

このドキュメントは、Issue #45「[Security] Medium: Content Security Policy ヘッダーの設定」の修正方針を記載します。

## 修正方針

本番ビルドを FastAPI が配信する構成（Issue #33 対応済み）において、CSP ヘッダーが未設定のため XSS 発生時のブラウザレベル防御がない。

Starlette の `BaseHTTPMiddleware` を使って `SecurityHeadersMiddleware` を実装し、全レスポンスに `Content-Security-Policy` ヘッダーを付与する。追加ライブラリは不要。

dev モード（Vite 開発サーバー）は FastAPI を経由しないため影響なし。

---

## 修正一覧

| # | 問題 | 重大度 | 対象ファイル |
|---|------|--------|-------------|
| 1 | CSP ヘッダーが未設定で、XSS 発生時のブラウザレベル防御がない | MEDIUM | `spec_ai_writer/web/app.py` |

---

## 差分分析（期待動作 vs 現在の実装）

### 問題1: CSP ヘッダー未設定（重大度：MEDIUM）

**期待する動作**：
全レスポンスに `Content-Security-Policy` ヘッダーが付与され、XSS 時のブラウザによるスクリプト実行を制限する。

**現在の実装**：

`spec_ai_writer/web/app.py` には `CORSMiddleware` のみが設定されており、CSP ヘッダーは存在しない。

```python
# app.py（現状）
app.add_middleware(
    CORSMiddleware,
    ...
)
# ← SecurityHeadersMiddleware なし
```

**影響**: XSS 脆弱性が存在した場合、ブラウザレベルでの防御がなく悪意あるスクリプトが実行される可能性がある。

**修正内容**：

```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' ws: wss:; "
            "img-src 'self' data:; "
            "font-src 'self';"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

#### CSP 指令の根拠

| 指令 | 値 | 理由 |
|------|-----|------|
| `default-src` | `'self'` | 未指定リソースをすべて同一オリジンに制限 |
| `script-src` | `'self'` | 本番ビルドはバンドル済みのため外部スクリプト不要 |
| `style-src` | `'self' 'unsafe-inline'` | 一部 UI ライブラリが inline style を使用するため許容 |
| `connect-src` | `'self' ws: wss:` | WebSocket 接続に必要。`wss:` は HTTPS 化時のために追加 |
| `img-src` | `'self' data:` | data URI（Base64 画像等）を許容 |
| `font-src` | `'self'` | 外部フォント未使用のため同一オリジンに制限 |

`style-src 'unsafe-inline'` は理想的ではないが、現状の UI ライブラリとの互換性を維持するため暫定的に許容する。将来的に nonce ベースへ移行することが望ましい。

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `spec_ai_writer/web/app.py` | `SecurityHeadersMiddleware` を追加し `app.add_middleware()` で登録 |

---

## 試験項目表（2026-04-06）

| # | 確認内容 | 確認方法 | 結果 | 備考 |
|---|---------|---------|------|------|
| 1 | `/api/health` レスポンスに CSP ヘッダーが付与される | `curl -s -D - http://127.0.0.1:8000/api/health` | ✅ | `content-security-policy` ヘッダーが正しい値で返ることを確認 |
| 2 | フロントエンド（`/`）のレスポンスに CSP ヘッダーが付与される | ブラウザ開発者ツール → Network タブ | ✅ | `content-security-policy` ヘッダーが正しい値で返ることを確認 |
| 3 | 既存の API エンドポイントが正常に動作する | ブラウザ手動確認（インタビュー一連操作） | ✅ | CSP による意図しないブロックがないことを確認 |

---

## 参照

- [Issue #45](https://github.com/elvezjp/SDD/issues/45)
- [Issue #24](https://github.com/elvezjp/SDD/issues/24) (残存対応項目)
- [Issue #33](https://github.com/elvezjp/SDD/issues/33) (本番ビルド配信の実装)
