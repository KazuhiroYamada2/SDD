# 修正計画書：セキュリティ脆弱性修正（Issue #37 上位3件）

このドキュメントは、Issue #37「セキュリティ: spec-ai-writer 脆弱性チェック結果」の修正方針に基づき、優先度上位3件の修正計画を記載します。

## 修正方針

本ツールはローカル PC で個人利用する想定であるが、パストラバーサルは任意ディレクトリの削除（`shutil.rmtree()`）につながる可能性があり影響が大きいため修正する。バインドアドレスおよび Content-Disposition の修正は変更コストが低いため合わせて対応する。

---

## 修正一覧

| # | 問題 | 重大度 | 対象ファイル |
|---|------|--------|-------------|
| 1 | パストラバーサル (CWE-22) | HIGH | `web/models.py`, `web/routers/projects.py`, `web/routers/specifications.py` |
| 2 | サーバーが `0.0.0.0` でリッスン | MEDIUM | `web/app.py` |
| 3 | Content-Disposition ヘッダインジェクション | MEDIUM | `web/routers/specifications.py` |

---

## 差分分析（期待動作 vs 現在の実装）

### 問題1: パストラバーサル (CWE-22)（重大度：HIGH）

**期待する動作**：
`project_id` に英数字8文字のみを許可し、それ以外の値は 422 エラーで拒否する。

**現在の実装**：

`web/models.py:71-74` の `InterviewStartRequest` および `web/models.py:95-99` の `UserAnswerRequest` で `project_id: str` にバリデーションがなく、ファイルパスへそのまま連結される。

```python
# models.py:71-74（問題箇所）
class InterviewStartRequest(BaseModel):
    project_id: str  # ← バリデーションなし
    phase_num: Optional[int] = ...
```

`context_manager.py:23` でそのまま `Path(data_dir) / project_id` に使用されるため、`../../etc` のような値でディレクトリトラバーサルが可能。

また `web/routers/projects.py:288` の `DELETE /{project_id}` エンドポイントはパスパラメータが未検証のまま `context.delete_project()` → `shutil.rmtree()` につながる。

```python
# projects.py:287-296（問題箇所）
@router.delete("/{project_id}", ...)
async def delete_project(project_id: str):  # ← バリデーションなし
    context = ContextManager.load_project(project_id, ...)
    context.delete_project()  # → shutil.rmtree() へ
```

**影響**: 攻撃例 `{"project_id": "../../etc"}` で任意ディレクトリへのアクセスが可能。`DELETE` エンドポイントでは任意ディレクトリ削除につながる。

**修正内容**：

(a) `models.py` — `project_id` を持つ全リクエストモデルに `field_validator` を追加する。

```python
# 対象: InterviewStartRequest, UserAnswerRequest, SpecificationGenerateRequest, PhaseResetRequest
from pydantic import field_validator
import re

@field_validator('project_id')
@classmethod
def validate_project_id(cls, v):
    if not re.match(r'^[a-f0-9]{8}$', v):
        raise ValueError('Invalid project_id format')
    return v
```

(b) `web/routers/projects.py` および `web/routers/specifications.py` — パスパラメータの `project_id: str` を `Path(pattern=...)` に変更する。

```python
from fastapi import Path

async def delete_project(
    project_id: str = Path(pattern=r'^[a-f0-9]{8}$')
):
```

---

### 問題2: サーバーが `0.0.0.0` でリッスン（重大度：MEDIUM）

**期待する動作**：
`127.0.0.1`（localhost のみ）でリッスンし、同一 LAN 上の他ホストからのアクセスを遮断する。

**現在の実装**：

`web/app.py:85` で `host="0.0.0.0"` が指定されており、全ネットワークインターフェースでリッスンする。

```python
# app.py:83-89（問題箇所）
uvicorn.run(
    "spec_ai_writer.web.app:app",
    host="0.0.0.0",  # ← 全インターフェース
    port=8000,
    ...
)
```

**修正内容**：

```python
uvicorn.run(
    "spec_ai_writer.web.app:app",
    host="127.0.0.1",  # ← localhost のみ
    port=8000,
    ...
)
```

---

### 問題3: Content-Disposition ヘッダインジェクション（重大度：MEDIUM）

**期待する動作**：
`filename` パラメータをダブルクォートで囲み、特殊文字によるヘッダインジェクションを防ぐ。

**現在の実装**：

`web/routers/specifications.py:86` で `filename` がクォートなしで埋め込まれている。

```python
# specifications.py:82-88（問題箇所）
headers={
    "Content-Disposition": f"attachment; filename={project_id}_specifications.zip"
    #                                        ↑ クォートなし
}
```

`project_id` に改行文字等を含めることで任意のレスポンスヘッダを注入できる。

**修正内容**：

```python
headers={
    "Content-Disposition": f'attachment; filename="{project_id}_specifications.zip"'
    #                                        ↑ ダブルクォートで囲む
}
```

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `spec_ai_writer/web/models.py` | `field_validator` を追加（`import re`, `field_validator` も追加） |
| `spec_ai_writer/web/routers/projects.py` | パスパラメータに `Path(pattern=...)` を追加 |
| `spec_ai_writer/web/routers/specifications.py` | パスパラメータに `Path(pattern=...)` を追加、`filename` をクォートで囲む |
| `spec_ai_writer/web/app.py` | `host` を `127.0.0.1` に変更 |

---

## 修正しない項目

| # | 問題 | 理由 |
|---|------|------|
| 4 | エラーメッセージに内部パスが露出 | 修正箇所が多く、ローカル運用では実害なし |
| 5 | npm 依存パッケージ `flatted` の脆弱性 | バージョン変更により動作不安定になる可能性あり |

---

## 試験項目表（2026-03-27）

| # | 問題 | 確認方法 | 結果 | 備考 |
|---|------|---------|------|------|
| 1 | パストラバーサル | pytest（`tests/api/` 全 17 件パス） | ✅ | 無効な `project_id` → 422 を確認 |
| 2 | サーバーが `0.0.0.0` でリッスン | サーバー起動ログ目視 | ✅ | `Uvicorn running on http://127.0.0.1:8000` を確認 |
| 3 | Content-Disposition ヘッダインジェクション | コードレビュー・スクリプト実行 | ✅ | `filename="..."` のクォートを確認。問題1のバリデーションで特殊文字混入リクエスト自体が遮断される |
