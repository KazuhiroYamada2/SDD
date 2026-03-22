# 修正計画書：ローカル個人利用における実用上の問題修正

このドキュメントは、spec-ai-writer のコードレビューおよび既存 Issue（#16, #17）の分析に基づき、ローカル個人利用の前提で実際に使用上支障がある問題6件の修正計画を記載します。

## 修正方針

本ツールはローカル PC で個人利用する想定であるため、API 認証・レート制限・CORS 等のセキュリティ対策（Issue #23, #24, #25）は対象外とする。「仕様書が正しく生成されない」「インタビューの対話品質が低い」「プロジェクト管理が不便」という、日常的な利用に直結する問題を優先して修正する。

---

## 問題一覧

| # | 問題 | 重大度 | 関連 Issue |
|---|------|--------|-----------|
| 1 | LLM レスポンス検証不足で仕様書が空になる | 高 | - |
| 2 | Markdown ジェネレーターのバグ | 高 | - |
| 3 | インタビュー中にユーザーの質問に回答しない | 中 | #17 |
| 4 | 完了済みフェーズの仕様書を再編集できない | 中 | #17 |
| 5 | 例外ハンドリングが広すぎてエラー原因がわからない | 中 | - |
| 6 | プロジェクト説明が表示されない | 低 | #16 |

---

## 差分分析（期待動作 vs 現在の実装）

### 問題1: LLM レスポンス検証不足で仕様書が空になる（重大度：高）

**期待する動作**：
LLM がインタビュー結果から構造化データを抽出できなかった場合、ユーザーに通知し、リトライまたはフォールバック処理を行う。

**現在の実装**：

`spec_ai_writer/llm/base.py:142-161` の `extract_structured_data()` において、LLM が不正な JSON を返した場合、全フィールドが `None` の dict を無言で返す。

```python
# base.py:159-161（問題箇所）
except json.JSONDecodeError:
    # Return empty dict as fallback
    return {field: None for field in schema.keys()}
```

呼び出し元の `interview_engine.py:222-231` でも結果の検証を行わない。

```python
# interview_engine.py:222-231（問題箇所）
def _extract_and_save_structured_data(self, phase_num: int) -> None:
    try:
        schema = self.phase_mgr.get_schema_for_phase(phase_num)
        structured_data = self.context_mgr.extract_structured_data(
            phase_num, self.llm, schema
        )
        print(f"データを抽出しました（{len(structured_data)}項目）")
        # ← structured_data が全て None でも成功扱い
    except Exception as e:
        print(f"データ抽出中にエラーが発生しました: {e}")
```

さらに、`_check_phase_completion()` (`interview_engine.py:203-212`) で抽出失敗時に `except Exception: return False` としているため、フェーズ完了判定が永遠に `False` を返し続けるケースがある。

**影響**: インタビューに答えたにもかかわらず、空の仕様書が生成される。または 15 問上限に達するまで質問が続く。

---

### 問題2: Markdown ジェネレーターのバグ（重大度：高）

**期待する動作**：
全フェーズ（1〜7）の仕様書が Jinja2 テンプレートから一貫して生成される。

**現在の実装**：

`spec_ai_writer/generators/markdown_generator.py:64-70` において、テンプレート読み込み失敗時のフォールバック処理に問題がある。

```python
# markdown_generator.py:64-70（問題箇所）
try:
    template = self.jinja_env.get_template(template_filename)
except Exception as e:
    print(f"Warning: Could not load template {template_filename}: {e}")
    # Fallback to old method
    if phase_num == 1:
        content = self._generate_phase_01(data, display_name)    # ハードコード生成
    else:
        content = self._generate_generic_phase(phase_num, phase_name, data, display_name)
```

**問題点**:
1. **Phase 1 がハードコード**: `_generate_phase_01()` (89-187行) は Jinja2 テンプレート `01-principle-definition.md.jinja2` とは独立した手書き Markdown 生成であり、テンプレートと内容が乖離する可能性がある
2. **`except Exception` によるマスク**: テンプレートディレクトリのパス設定ミスや Jinja2 構文エラーなど、本来修正すべきエラーが `print` で出力されるだけで握り潰される
3. **テンプレートが存在する場合でも**: テンプレートは `templates/` ディレクトリに全7フェーズ分存在するが、`FileSystemLoader` のパス解決に問題があるとフォールバックに入る

---

### 問題3: インタビュー中にユーザーの質問に回答しない（重大度：中、Issue #17）

**期待する動作**：
ユーザーが「Phase 2 でどんな機能要件を定義しましたか？」のように質問した場合、AI が先に回答してから次の質問へ進む。

**現在の実装**：

システムプロンプト (`config/prompts/phase_01_prompts.py:3-36` 等) に「ユーザーからの質問に答える」指示がない。LLM は一方的に質問するよう指示されている。

CLI (`interview_engine.py:92-121`) でもすべてのユーザー入力を「回答」として扱い、質問かどうかの判定ロジックがない。

```python
# interview_engine.py:92-121（問題箇所）
answer = input().strip()
# ← すべて回答として保存される。質問の検出なし
self.context_mgr.add_qa_pair(phase_num, question, answer)
```

Web API (`interview.py:176-177`) も同様にすべてのユーザー入力を回答として保存する。

---

### 問題4: 完了済みフェーズの仕様書を再編集できない（重大度：中、Issue #17）

**期待する動作**：
仕様書画面から「再インタビュー」を実行し、対象フェーズの Q&A をリセットして仕様書を再生成できる。

**現在の実装**：

`context_manager.py:421-436` に `reset_phase()` メソッドは実装済み。

```python
# context_manager.py:421-436（実装済みだが未公開）
def reset_phase(self, phase: int) -> None:
    phase_key = str(phase)
    if phase_key in self.context["phases"]:
        self.context["phases"][phase_key] = {
            "qa_pairs": [],
            "structured_data": None,
            "completed": False
        }
        self.context["updated_at"] = datetime.now().isoformat()
        self.save_to_disk()
```

しかし以下が欠落しているため使えない:
1. **Web API エンドポイントなし**: `interview.py` に reset/re-start エンドポイントがない
2. **フロントエンド UI なし**: `Specifications.tsx` に「再インタビュー」ボタンがない
3. **CLI コマンドなし**: CLI にもフェーズリセットのコマンドがない

---

### 問題5: 例外ハンドリングが広すぎてエラー原因がわからない（重大度：中）

**期待する動作**：
API キーの設定ミス・ネットワークエラー・タイムアウト等がそれぞれ区別され、適切なエラーメッセージが表示される。

**現在の実装**：

プロジェクト全体で 43 箇所以上の `except Exception` が使用されている。特に問題が大きい箇所:

| ファイル | 行 | 影響 |
|---------|-----|------|
| `interview_engine.py:212` | `except Exception: return False` | フェーズ完了判定が常に False になり、原因不明のまま質問が続く |
| `interview_engine.py:154-156` | 質問生成エラーで空文字を返す | LLM の認証エラーも「質問生成失敗」としか表示されない |
| `interview_engine.py:481-482` | `except Exception: pass` | ファイル読み取りエラーが完全に無視される |
| `projects.py:62-69,141-146,203-208` | すべて HTTP 500 を返す | FileNotFoundError（404）や ValidationError（400）が区別されない |
| `interview.py:133-138,223-228` | すべて HTTP 500 を返す | LLM の API キーエラーが 500 として返される |
| `markdown_generator.py:64-66` | テンプレートエラーがフォールバックで握り潰される | 問題2と連動 |

---

### 問題6: プロジェクト説明が表示されない（重大度：低、Issue #16）

**期待する動作**：
ダッシュボードのプロジェクト一覧カードおよびインタビュー画面・仕様書画面にプロジェクトの説明が表示される。

**現在の実装**：

データの流れに断絶がある:

1. **モデル**: `ProjectResponse` に `description: Optional[str]` フィールドは存在する (`models.py:46`)
2. **永続化**: `ContextManager.create_project()` (`context_manager.py:80-116`) が `description` を受け取らず、`project.json` に保存しない
3. **API レスポンス**: `projects.py` のプロジェクト一覧 (L124) と詳細 (L188) で `description=None` をハードコードして返している
4. **フロントエンド**: `Dashboard.tsx:148-152` は description が存在すれば表示するが、バックエンドが常に `None` を返すため表示されない

```python
# projects.py:124（問題箇所 — 一覧取得）
projects.append(ProjectResponse(
    ...
    description=None,  # ← ハードコードで None
    ...
))
```

---

## 修正計画

### フェーズ1: LLM レスポンス検証の追加（問題1対応）

仕様書が空になる最も深刻な問題のため最優先で修正する。

#### 1-1. `extract_structured_data()` に検証ロジックを追加

**対象ファイル**: [spec_ai_writer/llm/base.py](../spec_ai_writer/llm/base.py)

変更内容:
- JSON パース失敗時に `None` dict ではなく空 dict `{}` を返すよう変更し、呼び出し元で成否を判定可能にする
- パース失敗時に `logging.warning` で警告を出力する
- 抽出結果のうち `None` でないフィールド数をカウントし、ゼロの場合は抽出失敗とみなす

```python
except json.JSONDecodeError as e:
    logger.warning(f"LLM応答のJSON解析に失敗しました: {e}")
    return {}  # 空 dict → 呼び出し元で len() == 0 で判定可能
```

#### 1-2. 抽出結果の検証とリトライ

**対象ファイル**: [spec_ai_writer/core/interview_engine.py](../spec_ai_writer/core/interview_engine.py)

変更内容:
- `_extract_and_save_structured_data()` で抽出結果が空または全フィールド `None` の場合、1回だけリトライする
- リトライ後も失敗した場合、ユーザーに警告メッセージを表示し、フェーズの再インタビューを提案する
- `_check_phase_completion()` の `except Exception: return False` を、個別の例外型に分けて処理する

```python
def _extract_and_save_structured_data(self, phase_num: int) -> bool:
    """構造化データを抽出して保存する。成功時 True、失敗時 False を返す。"""
    schema = self.phase_mgr.get_schema_for_phase(phase_num)
    structured_data = self.context_mgr.extract_structured_data(
        phase_num, self.llm, schema
    )

    non_null_count = sum(1 for v in structured_data.values() if v is not None)
    if non_null_count == 0:
        logger.warning("構造化データの抽出に失敗しました。リトライします...")
        # 1回リトライ
        structured_data = self.context_mgr.extract_structured_data(
            phase_num, self.llm, schema
        )
        non_null_count = sum(1 for v in structured_data.values() if v is not None)

    if non_null_count == 0:
        print("⚠ 構造化データの抽出に失敗しました。インタビュー内容を見直してください。")
        return False

    print(f"データを抽出しました（有効項目: {non_null_count}/{len(structured_data)}）")
    return True
```

---

### フェーズ2: Markdown ジェネレーターの修正（問題2対応）

#### 2-1. テンプレート読み込みエラーの適切な処理

**対象ファイル**: [spec_ai_writer/generators/markdown_generator.py](../spec_ai_writer/generators/markdown_generator.py)

変更内容:
- `except Exception` をテンプレート固有の例外（`jinja2.TemplateNotFound`, `jinja2.TemplateSyntaxError`）に分ける
- `TemplateNotFound` の場合はテンプレートディレクトリのパスを含むエラーメッセージを表示する
- `TemplateSyntaxError` の場合はテンプレートの修正を促すメッセージを表示する
- ハードコードのフォールバック（`_generate_phase_01()`）は削除せず維持するが、`logging.warning` で明示的に記録する

```python
try:
    template = self.jinja_env.get_template(template_filename)
except jinja2.TemplateNotFound:
    logger.warning(
        f"テンプレート {template_filename} が見つかりません "
        f"(検索パス: {self.template_dir})。フォールバック生成を使用します。"
    )
    # フォールバック生成
    ...
except jinja2.TemplateSyntaxError as e:
    logger.error(f"テンプレート {template_filename} に構文エラーがあります: {e}")
    raise  # テンプレートの構文エラーは修正が必要なため例外を伝播
```

#### 2-2. テンプレートディレクトリのパス解決を確認

**対象ファイル**: [spec_ai_writer/generators/markdown_generator.py](../spec_ai_writer/generators/markdown_generator.py)

変更内容:
- `__init__` でテンプレートディレクトリの存在を検証し、存在しない場合は明確なエラーを出す
- テンプレートディレクトリのパスが `pyproject.toml` のパッケージ構成に関係なく解決されることを確認する

---

### フェーズ3: インタビューの双方向対話対応（問題3対応、Issue #17）

#### 3-1. システムプロンプトにユーザー質問への対応指示を追加

**対象ファイル**: [config/prompts/phase_01_prompts.py](../config/prompts/phase_01_prompts.py) 〜 `phase_07_prompts.py`（全7ファイル）

変更内容:
- 各フェーズのシステムプロンプトに、ユーザーからの質問を検出して回答する指示を追加する
- 前フェーズの仕様書を参照して回答できるよう指示する

追加する指示例:
```
## ユーザーからの質問への対応
- ユーザーの発言が質問や確認である場合は、先にその質問に回答してから次の質問に進んでください
- 前の工程で決定した内容について聞かれた場合は、提供されたコンテキストを参照して回答してください
- 回答後は、現在の工程のインタビューを継続してください
```

#### 3-2. コンテキストに前フェーズの仕様書情報を含める

**対象ファイル**: [spec_ai_writer/core/interview_engine.py](../spec_ai_writer/core/interview_engine.py)

変更内容:
- `_build_context_for_question()` で前フェーズの完了済み仕様書（specs ディレクトリのファイル）をコンテキストに含める
- コンテキストサイズが大きくなりすぎないよう、直近2フェーズ分に限定する

---

### フェーズ4: フェーズ再インタビュー機能の公開（問題4対応、Issue #17）

#### 4-1. フェーズリセット API エンドポイントの追加

**対象ファイル**: [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容:
- `POST /api/interview/reset-phase` エンドポイントを追加
- リクエストモデル: `{ "project_id": str, "phase_num": int }`
- `context.reset_phase(phase_num)` を呼び出し、対象フェーズの Q&A と構造化データをリセット
- 対象フェーズの生成済み仕様書ファイルも削除する

#### 4-2. リクエスト/レスポンスモデルの追加

**対象ファイル**: [spec_ai_writer/web/models.py](../spec_ai_writer/web/models.py)

変更内容:
```python
class PhaseResetRequest(BaseModel):
    project_id: str
    phase_num: int = Field(..., ge=1, le=7)

class PhaseResetResponse(BaseModel):
    project_id: str
    phase_num: int
    message: str
```

#### 4-3. フロントエンドに「再インタビュー」ボタンを追加

**対象ファイル**: `frontend/src/pages/Specifications.tsx`

変更内容:
- 各フェーズの仕様書カードに「再インタビュー」ボタンを追加
- ボタン押下時に確認ダイアログを表示（「この工程の Q&A 履歴と仕様書がリセットされます。よろしいですか？」）
- 確認後に `POST /api/interview/reset-phase` を呼び出し、インタビュー画面に遷移する

#### 4-4. `/start` エンドポイントでリセット済みフェーズの再開に対応

**対象ファイル**: [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容:
- `/start` エンドポイントで、リセットされたフェーズ（`completed: false`, `qa_pairs: []`）を検出し、そのフェーズからインタビューを再開する
- 既存の「未完了の最初のフェーズから開始」ロジックでカバーされる可能性があるため、動作確認の上で追加実装を判断する

---

### フェーズ5: 例外ハンドリングの改善（問題5対応）

#### 5-1. LLM クライアントの例外を型別に分離

**対象ファイル**: [spec_ai_writer/llm/base.py](../spec_ai_writer/llm/base.py), [spec_ai_writer/core/interview_engine.py](../spec_ai_writer/core/interview_engine.py)

変更内容:
- LLM 固有の例外クラスを定義する

```python
class LLMAuthenticationError(Exception):
    """API キーが無効または未設定"""
    pass

class LLMConnectionError(Exception):
    """ネットワーク接続エラー"""
    pass

class LLMResponseError(Exception):
    """LLM からの応答が不正"""
    pass
```

- 各 LLM クライアント（Claude, OpenAI, Bedrock）でプロバイダー固有の例外をこれらの共通例外に変換する
- `interview_engine.py` で例外型ごとに適切なメッセージを表示する

```python
except LLMAuthenticationError:
    print("エラー: API キーが無効です。.env ファイルの設定を確認してください。")
except LLMConnectionError:
    print("エラー: LLM サービスに接続できません。ネットワーク接続を確認してください。")
except LLMResponseError as e:
    print(f"エラー: LLM からの応答が不正です: {e}")
```

#### 5-2. Web API ルーターの例外ハンドリング改善

**対象ファイル**: [spec_ai_writer/web/routers/projects.py](../spec_ai_writer/web/routers/projects.py), [spec_ai_writer/web/routers/interview.py](../spec_ai_writer/web/routers/interview.py)

変更内容:
- `FileNotFoundError` → HTTP 404
- `ValueError` / `ValidationError` → HTTP 400
- `LLMAuthenticationError` → HTTP 401 + 設定確認を促すメッセージ
- `LLMConnectionError` → HTTP 502
- `Exception`（予期しないエラー）→ HTTP 500（最後のフォールバックとして維持）

#### 5-3. `print()` から `logging` への移行（主要箇所のみ）

**対象ファイル**: [spec_ai_writer/core/interview_engine.py](../spec_ai_writer/core/interview_engine.py), [spec_ai_writer/generators/markdown_generator.py](../spec_ai_writer/generators/markdown_generator.py)

変更内容:
- エラー・警告系の `print()` を `logging.error()` / `logging.warning()` に置き換える
- ユーザー向けの対話出力（質問表示、進捗メッセージ等）は `print()` のまま維持する

---

### フェーズ6: プロジェクト説明の永続化と表示（問題6対応、Issue #16）

#### 6-1. `ContextManager` に `description` を追加

**対象ファイル**: [spec_ai_writer/core/context_manager.py](../spec_ai_writer/core/context_manager.py)

変更内容:
- `create_project()` に `description` 引数を追加し、`project.json` に保存する
- `__init__` に `description` 属性を追加
- `load_project()` で `project.json` から `description` を読み込む

```python
@classmethod
def create_project(cls, display_name: str, description: str = "", data_dir: str = "./data") -> "ContextManager":
    ...
    project_metadata = {
        "project_id": project_id,
        "display_name": display_name,
        "description": description,  # 追加
        "created_at": now,
        "updated_at": now
    }
```

#### 6-2. プロジェクトルーターで `description` を返す

**対象ファイル**: [spec_ai_writer/web/routers/projects.py](../spec_ai_writer/web/routers/projects.py)

変更内容:
- プロジェクト作成時に `description` を `ContextManager` に渡す
- 一覧取得（L124）と詳細取得（L188）で `project.json` から `description` を読み込んで返す
- `description=None` のハードコードを削除する

#### 6-3. プロジェクト編集 API の追加

**対象ファイル**: [spec_ai_writer/web/routers/projects.py](../spec_ai_writer/web/routers/projects.py), [spec_ai_writer/web/models.py](../spec_ai_writer/web/models.py)

変更内容:
- `PATCH /api/projects/{project_id}` エンドポイントを追加
- `display_name` と `description` を編集可能にする
- 変更内容を `project.json` に保存する

---

## 実装順序と依存関係

```
フェーズ1（LLM検証）     ── 最優先・独立
フェーズ2（ジェネレータ） ── 最優先・独立
  ↓
フェーズ5（例外ハンドリング）── フェーズ1のリトライ処理と連動
  ↓
フェーズ3（双方向対話）   ── 独立（プロンプト修正のみ）
フェーズ4（再インタビュー）── 独立
フェーズ6（説明表示）     ── 独立
```

- **フェーズ1, 2** は仕様書生成の正常動作に直結するため最優先で着手する
- **フェーズ5** はフェーズ1の例外処理改善と密接に関連するため、フェーズ1の直後に実施する
- **フェーズ3, 4, 6** は互いに独立しており並行して進められる

---

## 設計判断の記録（Decision Records）

### 判断1: LLM 抽出失敗時は空 dict を返し、呼び出し元で判定する

**決定**: `extract_structured_data()` の JSON パース失敗時は `None` 充填 dict ではなく空 dict `{}` を返す
**理由**: `None` 充填 dict は「抽出成功したが値が無い」と「抽出自体が失敗した」の区別がつかない。空 dict なら `len() == 0` で失敗を検出できる。既存のフィールドが `None` のケース（LLM が一部項目のみ回答した場合）も正しく区別できる
**日付**: 2026-03-22

### 判断2: テンプレートの構文エラーはフォールバックせず例外を伝播する

**決定**: `jinja2.TemplateSyntaxError` は `raise` で伝播し、`TemplateNotFound` のみフォールバック生成を許容する
**理由**: 構文エラーはテンプレートファイルの修正が必要な開発者のミスであり、黙ってフォールバックすると問題の発見が遅れる。一方、テンプレートが見つからない場合は初回セットアップ等の事情がありうるためフォールバックを許容する
**日付**: 2026-03-22

### 判断3: ユーザー質問の検出はシステムプロンプトで LLM に委ねる

**決定**: ユーザー入力が「質問」か「回答」かの判定は、コードによるルールベース分類ではなくシステムプロンプトで LLM に委ねる
**理由**: 「〜ですか？」で終わるが回答である場合、逆に疑問符なしの質問など、ルールベースでは誤判定が多い。LLM のシステムプロンプトに「ユーザーの発言が質問であれば先に回答する」と指示するほうが自然言語の曖昧さに対応できる
**日付**: 2026-03-22

### 判断4: フェーズリセットは既存の `reset_phase()` を API 経由で公開する

**決定**: 新規メソッドは追加せず、既存の `context_manager.reset_phase()` を API エンドポイントとして公開する
**理由**: リセットロジック自体は実装済みでテスト可能な状態にあり、API とフロントエンド UI の追加のみで機能が完成する。追加の永続化ロジックは不要
**日付**: 2026-03-22

### 判断5: 例外ハンドリングは LLM 固有の共通例外クラスを導入する

**決定**: プロバイダー固有の例外（`anthropic.AuthenticationError`, `openai.AuthenticationError` 等）を共通の `LLMAuthenticationError` 等に変換する
**理由**: 呼び出し元（interview_engine, Web API ルーター）がプロバイダーに依存せずに例外を処理できる。ファクトリーパターンで LLM クライアントを切り替える設計と整合する
**日付**: 2026-03-22

---

## 完了チェックリスト

### フェーズ1: LLM レスポンス検証の追加

- [x] `base.py`: `extract_structured_data()` の JSON パース失敗時に空 dict `{}` を返すよう変更
- [x] `base.py`: パース失敗時に `logging.warning` で警告を出力
- [x] `interview_engine.py`: `_extract_and_save_structured_data()` で抽出結果の空チェックを追加
- [x] `interview_engine.py`: 抽出失敗時に1回リトライする処理を追加
- [x] `interview_engine.py`: リトライ後も失敗した場合にユーザーへ警告メッセージを表示
- [x] `interview_engine.py`: `_check_phase_completion()` の `except Exception: return False` を個別例外に分離
- [ ] 動作確認: LLM が不正な JSON を返した場合にリトライ→警告が表示されること

### フェーズ2: Markdown ジェネレーターの修正

- [x] `markdown_generator.py`: `except Exception` を `jinja2.TemplateNotFound` と `jinja2.TemplateSyntaxError` に分離
- [x] `markdown_generator.py`: `TemplateSyntaxError` は例外を伝播（`raise`）するよう変更
- [x] `markdown_generator.py`: `TemplateNotFound` 時のフォールバックで `logging.warning` を出力
- [x] `markdown_generator.py`: `__init__` でテンプレートディレクトリの存在を検証
- [ ] 動作確認: テンプレートが正常に読み込まれ、全7フェーズの仕様書が Jinja2 から生成されること

### フェーズ3: インタビューの双方向対話対応

- [x] `phase_01_prompts.py` 〜 `phase_07_prompts.py`: システムプロンプトにユーザー質問への対応指示を追加（全7ファイル）
- [x] `interview_engine.py`: `_build_context_for_question()` で前フェーズの仕様書をコンテキストに含める（既存実装を確認）
- [x] コンテキストサイズが過大にならないよう、直近2フェーズ分に制限（`_load_previous_phase_specs(max_phases=2)`）
- [ ] 動作確認: インタビュー中にユーザーが質問すると AI が回答してからインタビューを継続すること

### フェーズ4: フェーズ再インタビュー機能の公開

- [x] `models.py`: `PhaseResetRequest` / `PhaseResetResponse` モデルを追加
- [x] `interview.py`: `POST /api/interview/reset-phase` エンドポイントを追加
- [x] `interview.py`: リセット時に対象フェーズの生成済み仕様書ファイルを削除
- [x] `interview.py`: `/start` でリセット済みフェーズからの再開が正しく動作することを確認（既存ロジックでカバー）
- [x] `Specifications.tsx`: 各フェーズカードに「再インタビュー」ボタンを追加
- [x] `Specifications.tsx`: ボタン押下時に確認ダイアログを表示
- [ ] 動作確認: 仕様書画面から再インタビューを実行し、Q&A リセット→再インタビュー→仕様書再生成が完了すること

### フェーズ5: 例外ハンドリングの改善

- [x] `base.py` または新規ファイル: `LLMAuthenticationError`, `LLMConnectionError`, `LLMResponseError` を定義（`exceptions.py` 新規作成）
- [x] `claude_client.py`: プロバイダー固有の例外を共通例外に変換
- [x] `openai_client.py`: プロバイダー固有の例外を共通例外に変換
- [x] `bedrock_client.py`: プロバイダー固有の例外を共通例外に変換
- [x] `interview_engine.py`: 例外型ごとに適切なエラーメッセージを表示
- [x] `projects.py`: `FileNotFoundError` → 404、`ValueError` → 400 等のマッピングを実装
- [x] `interview.py`: `LLMAuthenticationError` → 401、`LLMConnectionError` → 502 のマッピングを実装
- [x] `interview_engine.py`, `markdown_generator.py`: エラー・警告系の `print()` を `logging` に移行（CLI向けユーザー出力の `print` は維持）
- [ ] 動作確認: API キー未設定時に「API キーを確認してください」と表示されること
- [ ] 動作確認: ネットワーク切断時に「接続できません」と表示されること

### フェーズ6: プロジェクト説明の永続化と表示

- [x] `context_manager.py`: `create_project()` に `description` 引数を追加
- [x] `context_manager.py`: `project.json` に `description` を保存
- [x] `context_manager.py`: `load_project()` で `description` を読み込む
- [x] `projects.py`: プロジェクト作成時に `description` を `ContextManager` に渡す
- [x] `projects.py`: 一覧取得・詳細取得で `project.json` から `description` を返す（`None` ハードコード削除）
- [x] `models.py`: `ProjectUpdateRequest` モデルを追加
- [x] `projects.py`: `PATCH /api/projects/{project_id}` エンドポイントを追加
- [ ] 動作確認: ダッシュボードのプロジェクトカードに説明が表示されること
- [ ] 動作確認: プロジェクト名・説明の編集が `project.json` に反映されること

---

**注意**: この修正計画書はローカル個人利用の前提に基づいています。外部公開やマルチユーザー環境での運用を行う場合は、Issue #23, #24, #25 のセキュリティ対応が別途必要です。
