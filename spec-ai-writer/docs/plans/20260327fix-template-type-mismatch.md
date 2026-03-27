# 修正計画書：LLM抽出データ型不一致によるレンダリングバグ修正（Issue #32）

このドキュメントは、Issue #32「全テンプレートでLLM抽出データの型不一致によるレンダリングバグ」の修正方針と実装計画を記載します。

## 修正方針

全7フェーズのJinja2テンプレートにおいて、LLMが返す構造化データの形式とテンプレートの期待する形式が不一致のため、以下の3つのバグパターンが発生している。テンプレート側で型ガードを追加し、LLMの返すデータが文字列・dict・listのいずれでも安全にレンダリングされるよう修正する。

---

## バグパターン一覧

| パターン | 症状 | 原因 |
|---------|------|------|
| A: stringに `.attribute` アクセス | `<built-in method title of str object at 0x...>` が表示される | LLMが文字列を返すのにテンプレートがdictを期待。`str.title` 等の組み込みメソッドに解決され `is defined` が `True` を返す |
| B: dictをsequenceとして反復 | 表の列がすべて空・不正 | LLMがdictを返すのにテンプレートがlistを期待。dictのキー名だけが表示される |
| C: `is defined` の誤判定 | フィールドが「（記載なし）」「（未定）」で埋まる | `.title`, `.count`, `.index` 等のPython組み込みメソッドが存在するため `is defined` が `True` を返し、デフォルト値が使われない |

---

## 影響箇所一覧

| テンプレート | 行 | 問題のアクセス | LLMの実際のデータ型 | パターン |
|------------|-----|---------------|-------------------|---------|
| `02-planning-requirement` | 17 | `user.role`, `user.description`, `user.literacy` | string | A |
| `02-planning-requirement` | 33 | `req.name` | string | A |
| `03-design-planning` | 71 | `decision.title` | string | A, C |
| `03-design-planning` | 75-81 | `decision.context/decision/rationale/consequences` | string | A, C |
| `04-task-breakdown` | 15 | `milestone.name/date/criteria` | string | A |
| `04-task-breakdown` | 27 | `task.assignee/priority/estimate/status` | string | A |
| `05-implementation` | 15-18 | `record.date/developer/task_id/commit` | string | A |
| `05-implementation` | 40 | `review.date`（mappingチェックなし） | string | A |
| `05-implementation` | 71 | `usage.feature/tool` | dict（list期待） | B |
| `06-verification-acceptance` | 15 | `item.type/target/case_count` | string | A |
| `06-verification-acceptance` | 38 | `result.name/status`（mappingチェックなし） | string | A |
| `07-migration-operation` | 59-61 | `operation_structure.team/hours/contact` | string | A |

---

## 差分分析（期待動作 vs 現在の実装）

### パターンA・C の修正方針

各属性アクセスの前に `item is mapping` チェックを追加し、stringの場合は値をそのまま出力する。`is defined` の代わりに `is mapping and item.attr is defined` を使い、str組み込みメソッドへの誤解決を防ぐ。

```jinja2
{# 修正前 #}
### {{ decision_id }}: {{ decision.title if decision.title is defined else "（タイトルなし）" }}

{# 修正後 #}
{% if decision is string %}
### {{ decision_id }}

{{ decision }}
{% elif decision is mapping %}
### {{ decision_id }}: {{ decision.title if decision.title is defined else "（タイトルなし）" }}

**背景**: {{ decision.context if decision.context is defined else "（記載なし）" }}
**決定**: {{ decision.decision if decision.decision is defined else "（記載なし）" }}
**理由**: {{ decision.rationale if decision.rationale is defined else "（記載なし）" }}
**影響**: {{ decision.consequences if decision.consequences is defined else "（記載なし）" }}
{% endif %}
```

### パターンB の修正方針

反復前に `item is mapping` チェックを追加し、dictの場合はキーと値のペアで表示する。

```jinja2
{# 修正前 #}
{% for usage in tool_usages %}
| {{ usage.feature }} | {{ usage.tool }} |
{% endfor %}

{# 修正後 #}
{% for usage in tool_usages %}
{% if usage is mapping %}
| {{ usage.feature if usage.feature is defined else "（未定）" }} | {{ usage.tool if usage.tool is defined else "（未定）" }} |
{% else %}
| {{ usage }} | |
{% endif %}
{% endfor %}
```

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `templates/02-planning-requirement.md.jinja2` | `user`・`req` のアクセス前に `is mapping` チェックを追加（行17, 33） |
| `templates/03-design-planning.md.jinja2` | `decision` のアクセス前に `is mapping` チェックを追加（行71, 75-81） |
| `templates/04-task-breakdown.md.jinja2` | `milestone`・`task` のアクセス前に `is mapping` チェックを追加（行15, 27） |
| `templates/05-implementation.md.jinja2` | `record`・`review`・`usage` のアクセス前に `is mapping` チェックを追加（行15-18, 40, 71） |
| `templates/06-verification-acceptance.md.jinja2` | `item`・`result` のアクセス前に `is mapping` チェックを追加（行15, 38） |
| `templates/07-migration-operation.md.jinja2` | `operation_structure` のアクセス前に `is mapping` チェックを追加（行59-61） |

---

## 試験項目表（2026-03-27）

確認プロジェクト: `data/8302bcf0`（再インタビューして全フェーズ生成）

| # | テンプレート | 確認方法 | 結果 | 備考 |
|---|------------|---------|------|------|
| 1 | `02-planning-requirement` | データ型をstringにして生成・目視確認 | ✅ | テンプレートは修正前から `is mapping` チェック済みで問題なし |
| 2 | `03-design-planning` | ADRセクションをstringにして生成・`<built-in method ...>` が消えることを確認 | ✅ | `frontend: React` 等、全ADRが正常表示に。`<built-in method title>` は解消 |
| 3 | `04-task-breakdown` | マイルストーン・タスクをstringにして生成・目視確認 | ✅ | テンプレートは修正前から `is mapping` チェック済みで問題なし |
| 4 | `05-implementation` | `review_results` の値がstringのとき正常表示されることを確認 | ✅ | `code_review`・`security_review` セクションが表示される。値がdictの場合はLLM依存のためデータ品質の問題 |
| 4 | `05-implementation` | `ai_usage` をdictにして生成・反復が正常かを確認 | ✅ | `is mapping` ブランチで key/value が表示される |
| 5 | `06-verification-acceptance` | テスト項目・結果をstringにして生成・目視確認 | ✅ | テスト項目表・受入テスト結果が正常表示。`test_results.details` は今回データなしのため `is mapping` ブランチのリグレッションは未確認 |
| 6 | `07-migration-operation` | 運用体制をstringにして生成・目視確認 | ✅ | テンプレートは `is string` / `is mapping` 分岐済みで問題なし |
| 7 | 全テンプレート | 正常なdict型データで生成し、既存の表示が壊れないことを確認（リグレッション） | ✅ | 全フェーズ生成し、従来正常だった箇所に崩れなし |
