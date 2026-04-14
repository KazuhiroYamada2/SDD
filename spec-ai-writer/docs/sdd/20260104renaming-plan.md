# Spec AIライターへの名称変更計画

## 1. 概要

### 変更の目的
- 現在の「SDD Generator（ジェネレーター）」という名称は機械的な印象を与える
- AIを活用していることを明確に伝えるため「Spec AIライター」に変更
- ユーザーにとってより親しみやすく、機能が理解しやすい名称へ

### 変更対象の名称

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| ディレクトリ名 | `sdd-generator` | `spec-ai-writer` |
| Pythonパッケージ名 | `sdd_generator` | `spec_ai_writer` |
| PyPIパッケージ名 | `sdd-generator` | `spec-ai-writer` |
| CLIコマンド名 | `sdd` | `spec` または `spec-ai` |
| フロントエンドパッケージ名 | `sdd-generator-frontend` | `spec-ai-writer-frontend` |
| 表示名（UI/ドキュメント） | SDD Generator | Spec AIライター |

### 影響範囲の規模
- **変更ファイル数**: 約30ファイル以上（Pythonファイル約44個、その他設定・ドキュメントファイル）
- **変更箇所**: 約100箇所以上（import文を含むPythonファイルは約11ファイル）
- **影響度**: 高（プロジェクト全体に影響）

---

## 2. 詳細変更箇所リスト

### 2.1 ディレクトリ構造の変更

#### 【必須】プロジェクトディレクトリ名

```bash
# 変更前
/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/sdd-generator/

# 変更後
/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/spec-ai-writer/
```

#### 【必須】Pythonパッケージディレクトリ名

```bash
# 変更前
/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/sdd-generator/sdd_generator/

# 変更後
/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/spec-ai-writer/spec_ai_writer/
```

---

### 2.2 Python設定ファイル

#### 【必須】pyproject.toml

**ファイル**: `pyproject.toml`

変更箇所（3箇所）：

```toml
# 1. パッケージ名（6行目）
[project]
-name = "sdd-generator"
+name = "spec-ai-writer"

# 2. エントリーポイント（51行目）
[project.scripts]
-sdd = "sdd_generator.cli:main"
+spec = "spec_ai_writer.cli:main"
# または
+spec-ai = "spec_ai_writer.cli:main"

# 3. パッケージリスト（54行目）
[tool.setuptools]
-packages = ["sdd_generator", "config"]
+packages = ["spec_ai_writer", "config"]
```

**影響**:
- pipインストール時のパッケージ名が変わる
- CLIコマンド名が `sdd` から `spec` (または `spec-ai`) に変わる
- パッケージビルド時の対象が変わる

#### 【必須】pytest.ini

**ファイル**: `pytest.ini`

変更箇所（1箇所）：

```ini
# 10行目（実際のファイルでは複数行に分かれている）
addopts =
-    --cov=sdd_generator
+    --cov=spec_ai_writer
     --cov-report=html
     --cov-report=term-missing
```

**影響**: テストカバレッジの計測対象が変わる

---

### 2.3 Pythonソースコード（import文）

#### 【必須】全Pythonファイルのimport文一括置換

**対象ファイル数**: 約11ファイル（実際のファイル数に基づく）

**置換パターン**:
```python
# パターン1: from import
-from sdd_generator.
+from spec_ai_writer.

# パターン2: import
-import sdd_generator.
+import spec_ai_writer.

# パターン3: 文字列内のパッケージ名
-"sdd_generator.
+"spec_ai_writer.

# パターン4: patch デコレータ
-@patch('sdd_generator.
+@patch('spec_ai_writer.
```

**対象ファイル一覧**（実際のファイル構造に基づく）:

1. `sdd_generator/cli.py` (6箇所)
2. `sdd_generator/main.py` (1箇所)
3. `sdd_generator/core/interview_engine.py` (3箇所)
4. `sdd_generator/web/app.py` (1箇所 - 文字列)
5. `sdd_generator/web/routers/interview.py` (4箇所)
6. `sdd_generator/web/routers/projects.py` (2箇所)
7. `sdd_generator/web/routers/specifications.py` (1箇所)
8. `tests/conftest.py` (3箇所)
9. `tests/unit/test_context_manager.py` (1箇所)
10. `tests/unit/test_openai_client.py` (1箇所)
11. `tests/unit/test_phase_manager.py` (1箇所)
12. その他、将来追加されるファイル

**注意**: 実際のファイル数は約44個のPythonファイルが存在するが、import文を含むのは上記のファイルのみ

**注意点**:
- ディレクトリ名変更後にimport文を変更する
- すべてのimport文を漏れなく変更しないとプログラムが動作しない

---

### 2.4 フロントエンド設定ファイル

#### 【推奨】package.json

**ファイル**: `frontend/package.json`

変更箇所（1箇所）：

```json
{
-  "name": "sdd-generator-frontend",
+  "name": "spec-ai-writer-frontend",
   ...
}
```

#### 【推奨】package-lock.json

**ファイル**: `frontend/package-lock.json`

変更箇所（2箇所）：

```json
{
-  "name": "sdd-generator-frontend",
+  "name": "spec-ai-writer-frontend",
   ...
   "packages": {
     "": {
-      "name": "sdd-generator-frontend",
+      "name": "spec-ai-writer-frontend",
       ...
     }
   }
}
```

**注意点**: `package-lock.json` は `npm install` で自動生成されるため、package.json変更後に再生成するのが確実

---

### 2.5 ドキュメントファイル

#### 【必須】README.md

**ファイル**: `README.md`

変更箇所（多数）：

1. **タイトル・概要**（1行目、3行目）
```markdown
-# SDD Generator - 仕様駆動開発 インタビュー & 生成システム
+# Spec AIライター - 仕様駆動開発 インタビュー & 生成システム

-LLM APIを使用してユーザーにインタビューを行い、仕様駆動開発（Specification Driven Development）の7つの仕様書を自動生成するPythonプログラムです。
+LLM APIを使用してユーザーにインタビューを行い、仕様駆動開発（Specification Driven Development）の7つの仕様書を自動生成するAI支援Pythonプログラムです。
```

2. **インストールコマンド**（37行目）
```bash
-cd sdd-generator
+cd spec-ai-writer
```

3. **実行コマンド**（115行目）
```bash
-# sdd-generator/ ディレクトリで
-python -m sdd_generator.web.app
+# spec-ai-writer/ ディレクトリで
+python -m spec_ai_writer.web.app
```

4. **ディレクトリ構造図**（240-244行目）
```
-sdd-generator/
-├── sdd_generator/
+spec-ai-writer/
+├── spec_ai_writer/
     ├── __init__.py
     ...
```

5. **コード品質チェックコマンド**（282-284行目、289行目）
```bash
-black sdd_generator/ config/
-flake8 sdd_generator/ config/
-mypy sdd_generator/
+black spec_ai_writer/ config/
+flake8 spec_ai_writer/ config/
+mypy spec_ai_writer/
```

**影響**: ユーザー向け主要ドキュメント。すべてのコマンド例、パス、説明文を更新

---

#### 【必須】QUICKSTART.md

**ファイル**: `QUICKSTART.md`

変更箇所（多数）：

1. **セットアップコマンド**（16行目）
```bash
-cd sdd-generator
+cd spec-ai-writer
```

2. **すべての実行コマンド例**（53, 79, 85, 91, 99行目など）
```bash
-python -m sdd_generator.main start my-project
-python -m sdd_generator.main resume my-project
-python -m sdd_generator.main list
-python -m sdd_generator.main status my-project
+python -m spec_ai_writer.main start my-project
+python -m spec_ai_writer.main resume my-project
+python -m spec_ai_writer.main list
+python -m spec_ai_writer.main status my-project
```

**影響**: クイックスタートガイドのすべてのコマンド例を更新

---

#### 【推奨】TESTING.md

**ファイル**: `TESTING.md`

変更箇所（4箇所）：

1. **テストコマンド**（21, 43, 163行目）
```bash
-pytest --cov=sdd_generator --cov-report=html
+pytest --cov=spec_ai_writer --cov-report=html
```

2. **エラーメッセージ例とパス**（180, 184行目）
```
-ImportError: No module named 'sdd_generator'
-cd /path/to/sdd-generator
+ImportError: No module named 'spec_ai_writer'
+cd /path/to/spec-ai-writer
```

---

#### 【推奨】BEDROCK_SETUP.md

**ファイル**: `BEDROCK_SETUP.md`

変更箇所（1箇所）：

```python
# 257行目 - AWS Secrets Manager のシークレット名例
-secret = client.get_secret_value(SecretId='sdd-generator-config')
+secret = client.get_secret_value(SecretId='spec-ai-writer-config')
```

---

#### 【推奨】spec.md

**ファイル**: `spec.md`

変更箇所（1箇所）：

```markdown
# 763行目 - ファイル構成図
-sdd-generator/
+spec-ai-writer/
```

---

### 2.6 親ディレクトリ・書籍ファイル

#### 【必須】親ディレクトリのREADME.md

**ファイル**: `/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/README.md`

変更箇所（1箇所）：

```markdown
# 130行目
-└── sdd-generator/              # 仕様駆動開発支援ツール(オプション)
+└── spec-ai-writer/             # 仕様駆動開発支援AIツール(オプション)
```

---

#### 【必須】書籍2章ファイル

**ファイル**: `/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/chapters/2章：30分で実感する仕様駆動開発.md`

変更箇所（1箇所）：

```markdown
# 429行目
-└── sdd-generator/              # 仕様駆動開発支援ツール(オプション)
+└── spec-ai-writer/             # 仕様駆動開発支援AIツール(オプション)
```

**注意**: 書籍の他の章でも `sdd-generator` や関連コマンドが登場する可能性があるため、全章を検索して確認が必要

---

### 2.7 コード内の文字列・コメント

#### 【推奨】CLI ヘルプテキスト

**ファイル**: `sdd_generator/cli.py`

変更箇所（複数）：

```python
# CLI のdocstring（cli.py 20行目付近）
-"""SDD Generator - 仕様駆動開発インタビュー & 生成システム"""
+"""Spec AIライター - AI対話型仕様駆動開発支援ツール"""
```

**影響**: ユーザーが `--help` オプションで見る説明文

---

### 2.8 アーカイブディレクトリ

#### 【任意】アーカイブ内の同一ファイル

**パス**: `/Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/アーカイブ/20251225ブラッシュアップ版/sdd/sdd-generator/`

**対応方針**:
- アーカイブは過去のバージョンなので、変更不要
- もし統一したい場合は、同じ変更を適用

**注意**: アーカイブディレクトリには「20251206修正開始版原稿」など他のバージョンも存在するが、それらは変更不要

---

## 3. 変更実施手順（推奨ステップ）

### Phase 1: 事前準備（5分）

```bash
# 1. 現在のブランチを確認
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd
git status

# 2. 新しいブランチを作成
git checkout -b rename-to-spec-ai-writer

# 3. バックアップ作成（念のため）
cd ..
cp -r sdd/sdd-generator sdd/sdd-generator.backup
```

---

### Phase 2: Pythonパッケージディレクトリ名変更（2分）

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/sdd-generator

# Pythonパッケージディレクトリをリネーム
git mv sdd_generator spec_ai_writer
```

---

### Phase 3: Pythonコード内のimport文一括置換（10分）

```bash
# すべての .py ファイル内の import 文を置換
# macOS の場合
find . -name "*.py" -type f -exec sed -i '' 's/from sdd_generator\./from spec_ai_writer\./g' {} +
find . -name "*.py" -type f -exec sed -i '' 's/import sdd_generator\./import spec_ai_writer\./g' {} +
find . -name "*.py" -type f -exec sed -i '' 's/"sdd_generator\./"spec_ai_writer\./g' {} +
find . -name "*.py" -type f -exec sed -i '' "s/'sdd_generator\./'spec_ai_writer\./g" {} +
find . -name "*.py" -type f -exec sed -i '' "s/@patch('sdd_generator\./@patch('spec_ai_writer\./g" {} +

# Linux の場合は sed -i '' を sed -i に変更
```

**注意**:
- 自動置換後、手動で主要ファイルを確認することを推奨
- 特に `cli.py`, `web/app.py`, テストファイルは要確認

---

### Phase 4: 設定ファイル更新（5分）

#### pyproject.toml の編集

手動またはsedで以下を置換：

```bash
# macOS の場合
sed -i '' 's/name = "sdd-generator"/name = "spec-ai-writer"/g' pyproject.toml
sed -i '' 's/sdd = "sdd_generator\.cli:main"/spec = "spec_ai_writer.cli:main"/g' pyproject.toml
sed -i '' 's/packages = \["sdd_generator", "config"\]/packages = ["spec_ai_writer", "config"]/g' pyproject.toml
```

#### pytest.ini の編集

```bash
# 複数行にわたるaddoptsの設定を置換
sed -i '' 's/--cov=sdd_generator/--cov=spec_ai_writer/g' pytest.ini
```

#### package.json の編集（フロントエンド）

```bash
cd frontend
sed -i '' 's/"name": "sdd-generator-frontend"/"name": "spec-ai-writer-frontend"/g' package.json

# package-lock.json を再生成
rm package-lock.json
npm install
cd ..
```

---

### Phase 5: プロジェクトルートディレクトリ名変更（2分）

```bash
# 親ディレクトリへ移動
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd

# ディレクトリをリネーム
git mv sdd-generator spec-ai-writer
```

---

### Phase 6: ドキュメント更新（15分）

#### README.md

手動編集またはsedで以下を置換（`spec-ai-writer` ディレクトリ内で実行）：

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/spec-ai-writer

# タイトル
sed -i '' 's/# SDD Generator/# Spec AIライター/g' README.md

# ディレクトリ名
sed -i '' 's/sdd-generator/spec-ai-writer/g' README.md

# Pythonモジュール名
sed -i '' 's/sdd_generator/spec_ai_writer/g' README.md

# 説明文の更新（手動推奨）
# "仕様駆動開発（Specification-Driven Development）を支援する対話型ツール"
# → "仕様駆動開発（Specification-Driven Development）を支援するAI対話型ツール"
```

#### QUICKSTART.md

```bash
sed -i '' 's/sdd-generator/spec-ai-writer/g' QUICKSTART.md
sed -i '' 's/sdd_generator/spec_ai_writer/g' QUICKSTART.md
```

#### TESTING.md

```bash
sed -i '' 's/sdd-generator/spec-ai-writer/g' TESTING.md
sed -i '' 's/sdd_generator/spec_ai_writer/g' TESTING.md
```

#### BEDROCK_SETUP.md

```bash
sed -i '' "s/SecretId='sdd-generator-config'/SecretId='spec-ai-writer-config'/g" BEDROCK_SETUP.md
```

#### spec.md

```bash
sed -i '' 's/sdd-generator/spec-ai-writer/g' spec.md
```

---

### Phase 7: 親ディレクトリ・書籍ファイル更新（5分）

#### 親ディレクトリのREADME.md

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd

sed -i '' 's/sdd-generator/spec-ai-writer/g' README.md
sed -i '' 's/仕様駆動開発支援ツール/仕様駆動開発支援AIツール/g' README.md
```

#### 書籍章ファイル

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/chapters

# 2章を更新
sed -i '' 's/sdd-generator/spec-ai-writer/g' "2章：30分で実感する仕様駆動開発.md"
sed -i '' 's/仕様駆動開発支援ツール/仕様駆動開発支援AIツール/g' "2章：30分で実感する仕様駆動開発.md"

# 他の章も検索して確認
grep -r "sdd-generator" *.md
grep -r "sdd_generator" *.md
```

---

### Phase 8: コード内文字列・コメント更新（5分）

#### CLI ヘルプテキスト

`spec_ai_writer/cli.py` を手動で編集：

```python
# 20行目付近のdocstring を更新
-"""SDD Generator - 仕様駆動開発インタビュー & 生成システム"""
+"""Spec AIライター - AI対話型仕様駆動開発支援ツール

仕様駆動開発のためのインタビューを実施し、
仕様書を自動生成するAI支援ツールです。
"""
```

その他、ユーザーに表示される文字列を確認して更新

---

### Phase 9: 動作確認（10分）

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd/spec-ai-writer

# 1. 依存パッケージの再インストール
pip install -e .

# 2. CLIコマンドが動作するか確認
spec --help
# または
spec-ai --help

# 3. Pythonモジュールとして起動できるか確認
python -m spec_ai_writer.main --help

# 4. Web UIが起動するか確認
python -m spec_ai_writer.web.app
# ブラウザで http://localhost:8000 にアクセス

# 5. テストを実行
pytest

# 6. テストカバレッジを確認
pytest --cov=spec_ai_writer --cov-report=html
```

---

### Phase 10: Git コミット（5分）

```bash
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide

# 変更をステージング
git add .

# コミット
git commit -m "Rename sdd-generator to spec-ai-writer

- ディレクトリ名: sdd-generator → spec-ai-writer
- Pythonパッケージ名: sdd_generator → spec_ai_writer
- CLIコマンド名: sdd → spec
- 全ドキュメント、コード、設定ファイルを更新
- AIツールであることを明確にするための名称変更"

# リモートにプッシュ（必要に応じて）
git push origin rename-to-spec-ai-writer
```

---

## 4. リスク管理

### 高リスク項目

1. **import文の置換漏れ**
   - **リスク**: プログラムが起動しない
   - **対策**: Phase 9の動作確認を必ず実施。エラーが出たら該当ファイルを修正

2. **ディレクトリ名変更のタイミング**
   - **リスク**: Pythonパッケージディレクトリを先に変更すると、import文変更前にエラー
   - **対策**: 推奨手順（Phase 2→3→5）を守る

3. **書籍ファイルの更新漏れ**
   - **リスク**: ユーザーが古い名称でコマンドを実行してエラー
   - **対策**: 全章を検索して漏れを確認

### 中リスク項目

1. **CLIコマンド名の変更**
   - **リスク**: 既存ユーザーが `sdd` コマンドを使えなくなる
   - **対策**:
     - ドキュメントで変更を明記
     - または、pyproject.tomlで両方のコマンドを登録（移行期間）

```toml
[project.scripts]
spec = "spec_ai_writer.cli:main"
sdd = "spec_ai_writer.cli:main"  # 後方互換性のため残す
```

2. **フロントエンドのpackage-lock.json**
   - **リスク**: 手動編集すると不整合が発生
   - **対策**: `npm install` で再生成

### 低リスク項目

1. **AWS Secrets Manager のシークレット名**
   - **リスク**: 実際に使っている場合、参照が切れる
   - **対策**: ドキュメントの更新のみ。実際の設定は各自の環境依存

---

## 5. ロールバック手順

万が一問題が発生した場合の対処法：

### パターンA: Git履歴から戻す

```bash
# ブランチを削除して元に戻す
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide
git checkout main
git branch -D rename-to-spec-ai-writer
```

### パターンB: バックアップから復元

```bash
# Phase 1で作成したバックアップから復元
cd /Users/hidekitanaka/ローカルリポジトリ/spec-driven-dev-guide/20251225最終版/sdd
rm -rf sdd-generator  # または spec-ai-writer
mv sdd-generator.backup sdd-generator
```

---

## 6. 作業時間見積もり

| Phase | 内容 | 見積時間 |
|-------|------|----------|
| Phase 1 | 事前準備 | 5分 |
| Phase 2 | Pythonパッケージディレクトリ名変更 | 2分 |
| Phase 3 | import文一括置換 | 10分 |
| Phase 4 | 設定ファイル更新 | 5分 |
| Phase 5 | プロジェクトルートディレクトリ名変更 | 2分 |
| Phase 6 | ドキュメント更新 | 15分 |
| Phase 7 | 親ディレクトリ・書籍ファイル更新 | 5分 |
| Phase 8 | コード内文字列・コメント更新 | 5分 |
| Phase 9 | 動作確認 | 10分 |
| Phase 10 | Git コミット | 5分 |
| **合計** | | **約60分（1時間）** |

**注意**:
- 手動確認や微調整を含めると、1.5〜2時間程度を見込むと安全
- sedコマンドに不慣れな場合は、手動編集で実施（+30分程度）

---

## 7. 実施後の確認チェックリスト

### 必須確認項目

- [ ] CLIコマンド `spec` (または `spec-ai`) が動作する
- [ ] `python -m spec_ai_writer.main --help` が動作する
- [ ] Web UI `python -m spec_ai_writer.web.app` が起動する
- [ ] ブラウザで http://localhost:8000 にアクセスできる
- [ ] `pytest` がすべてパスする
- [ ] `pytest --cov=spec_ai_writer` でカバレッジが計測される
- [ ] README.md の全コマンド例が正しい名称になっている
- [ ] QUICKSTART.md の全コマンド例が正しい名称になっている
- [ ] 書籍2章のディレクトリ構造図が更新されている
- [ ] 親ディレクトリのREADME.mdが更新されている

### 推奨確認項目

- [ ] TESTING.md のコマンド例が更新されている
- [ ] spec.md のファイル構成図が更新されている
- [ ] CLI のヘルプメッセージ（`--help`）が「Spec AIライター」になっている
- [ ] Web UIのタイトルが適切に表示される
- [ ] フロントエンドがビルドできる（`cd frontend && npm run build`）
- [ ] コード品質チェックが通る（`black`, `flake8`, `mypy`）

### 任意確認項目

- [ ] 書籍の他の章でも名称が更新されている
- [ ] アーカイブディレクトリの扱いを決定した

---

## 8. よくある質問（FAQ）

### Q1: CLIコマンド名は `spec` と `spec-ai` どちらがいいですか？

**推奨**: `spec`

**理由**:
- 短くてタイプしやすい
- 仕様書（Specification）を扱うツールであることが直感的
- `spec-ai` は冗長で、AIであることは他で伝えられる

**移行期間の対応**:
- 両方のコマンドを登録して、徐々に `spec` に誘導する方法もあり

### Q2: PyPIパッケージ名 `spec-ai-writer` は長すぎませんか？

**回答**:
- PyPIパッケージ名は `pip install` 時のみ使うので、多少長くても問題ない
- CLIコマンド名が短ければ、日常的な使用には影響しない
- 「spec」だけだと一般的すぎて、PyPIで既に使われている可能性が高い

### Q3: アーカイブディレクトリも変更すべきですか？

**推奨**: 変更不要

**理由**:
- アーカイブは過去のバージョンの記録
- 変更すると余計な作業が増える
- もし統一したい場合は、最新版の変更完了後に実施

### Q4: sedコマンドが不安です。手動で編集してもいいですか？

**回答**: もちろん可能です

**手動編集の場合**:
1. Phase 3のsedコマンドをスキップ
2. エディタの「一括置換」機能を使う
   - VSCode: Cmd+Shift+F（Mac）または Ctrl+Shift+H（Win/Linux）
   - 検索: `sdd_generator`
   - 置換: `spec_ai_writer`
   - 対象: `*.py` ファイル
3. 置換前にプレビューで確認できるので安全

### Q5: 変更後、既存のプロジェクトデータは使えますか？

**回答**: はい、使えます

**理由**:
- プロジェクトデータは `~/.sdd/` 配下に保存されている（ツール名に依存しない）
- データ構造は変わらないため、そのまま引き継げる

**注意**:
- もし将来的にデータディレクトリも変更する場合（`~/.sdd/` → `~/.spec-ai/`）は、マイグレーションスクリプトが必要

### Q6: リモートリポジトリへのプッシュはいつすべきですか？

**推奨**: Phase 9の動作確認が完了してから

**理由**:
- 動作確認前にプッシュすると、他の開発者に影響が出る
- テストがパスしてから共有するのが安全

---

## 9. 次のステップ

この計画書を確認後、以下のステップで進めてください：

1. **計画の承認**: この計画で問題ないか確認
2. **実施日時の決定**: 作業時間（1〜2時間）を確保
3. **実施**: Phase 1〜10を順番に実行
4. **動作確認**: チェックリストで確認
5. **Git プッシュ**: リモートリポジトリに反映
6. **ドキュメント更新**: 必要に応じて、追加のドキュメント（ブログ記事、リリースノートなど）を作成

---

## 10. 補足: 名称変更の影響を受けない箇所

以下は名称変更の影響を**受けない**ため、変更不要です：

- **config/** ディレクトリとその中身（パッケージ名に依存しない）
- **templates/** ディレクトリとその中身（テンプレートファイル）
- **requirements.txt**（外部依存ライブラリのみ）
- **frontend/src/** の大部分（APIエンドポイントは変わらない想定）
- **Git履歴**（過去のブランチ名など）
- **プロジェクトデータディレクトリ** (`~/.sdd/`)

---

## まとめ

この計画に従って実施すれば、「SDD Generator」から「Spec AIライター」への名称変更を安全に完了できます。

**重要なポイント**:
1. Phase 1でバックアップを取る
2. Phase 2→3→5の順序を守る（ディレクトリ名変更のタイミング）
3. Phase 9の動作確認を必ず実施
4. 問題があればロールバック手順で元に戻す

**作業時間**: 約1〜2時間

ご不明な点や懸念事項があれば、実施前にご相談ください。
