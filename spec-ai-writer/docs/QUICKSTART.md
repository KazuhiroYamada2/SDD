# Spec AIライター クイックスタートガイド

このガイドでは、Spec AIライターを使って最初の仕様書を生成するまでの手順を説明します。

## 前提条件

- Python 3.9以上がインストールされている
- Claude APIキー（Anthropic）を持っている

## セットアップ（5分）

### 1. リポジトリをクローン

```bash
cd /Users/hdkworks/Projects/SDD
cd spec-ai-writer
```

### 2. 仮想環境を作成・有効化

```bash
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
```

### 3. 依存パッケージをインストール

```bash
pip install -r requirements.txt
```

### 4. 環境変数を設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、Claude APIキーを設定:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEFAULT_LLM_PROVIDER=claude
OUTPUT_DIR=./spec_output
AUTO_GIT_COMMIT=true
TEMPERATURE=0.7
```

## 使い方

### 新しいプロジェクトのインタビューを開始

```bash
python -m spec_ai_writer.main start my-project
```

または、モジュールとしてインストール済みの場合:

```bash
specstart my-project
```

### インタビューの流れ

1. システムが「フェーズ1: 原則定義」を開始
2. LLMが質問を生成
3. あなたが回答を入力
4. 5〜10個の質問に答えます
5. システムが情報を整理し、仕様書を生成
6. 自動的にGitコミット（設定している場合）

### 中断と再開

#### 中断方法
- `Ctrl+C` を押す
- または `exit` と入力

#### 再開方法
```bash
python -m spec_ai_writer.main resume my-project
```

### プロジェクト一覧を確認

```bash
python -m spec_ai_writer.main list
```

### 進捗状況を確認

```bash
python -m spec_ai_writer.main status my-project
```

## 実際の例

### ステップ1: インタビュー開始

```bash
$ python -m spec_ai_writer.main start customer-management

============================================================
仕様駆動開発（SDD）インタビューを開始します
プロジェクト: customer-management
現在のフェーズ: 1
============================================================

────────────────────────────────────────────────────────────
フェーズ 1: 原則定義
プロジェクトの存在意義・原則・制約条件を明文化
────────────────────────────────────────────────────────────

# フェーズ1: 原則定義

プロジェクト憲章（Project Constitution）を作成するための情報を収集します...

質問: まず、このプロジェクトの背景について教えてください。
どのような問題を解決したいのか、あるいはどのような機会を追求したいのでしょうか？

回答: Excelで顧客管理をしていますが、営業担当者が増えて限界を感じています...
```

### ステップ2: 質問に回答

LLMが生成する質問に、できるだけ詳しく答えてください。例:

```
質問: このプロジェクトで達成したい目的を教えてください。

回答:
- リアルタイムで顧客情報を共有できるようにする
- 営業活動の履歴を一元管理する
- 売上予測を自動化する
```

### ステップ3: 仕様書の生成

5〜10個の質問に答えると、システムが自動的に:

1. 情報を整理
2. Markdown仕様書を生成 (`spec_output/01-principle-definition.md`)
3. Gitコミット（`AUTO_GIT_COMMIT=true`の場合）

### ステップ4: 生成された仕様書を確認

```bash
cat spec_output/01-principle-definition.md
```

生成されたファイルの例:

```markdown
# customer-management - プロジェクト憲章

## プロジェクトの存在意義（Why）

### 背景

Excelで顧客管理をしていますが、営業担当者が増えて
情報の共有や更新が困難になってきました...

### 目的

- リアルタイムで顧客情報を共有できるようにする
- 営業活動の履歴を一元管理する
- 売上予測を自動化する
...
```

## トラブルシューティング

### API キーエラー

```
❌ LLM設定エラー:
  - ANTHROPIC_API_KEY is required for Claude provider
```

**解決方法**: `.env`ファイルで`ANTHROPIC_API_KEY`を設定してください。

### プロジェクトが見つからない

```
❌ プロジェクト 'my-project' が見つかりません。
```

**解決方法**: `specstart my-project`で新規作成するか、`speclist`で既存プロジェクトを確認してください。

### インタビューが長すぎる

**解決方法**:
- 質問には簡潔に答えてください
- 箇条書きを活用してください
- 不要な詳細は省略してください

## Tips

1. **具体的に答える**: LLMは詳細な情報から正確な仕様書を生成できます
2. **箇条書きを活用**: 複数の項目がある場合は箇条書きで答えると整理されます
3. **こまめに保存**: `Ctrl+C`で中断しても、進捗は自動保存されます
4. **Git管理**: 生成された仕様書はGit管理されるので、変更履歴を追跡できます

## 次のステップ

1. フェーズ1が完了したら、システムが自動的にフェーズ2（企画・要件定義）に進みます
2. すべてのフェーズ（1-7）を完了すると、プロジェクトの完全な仕様書セットが生成されます
3. 生成された仕様書は`spec_output/`ディレクトリで確認できます

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

Happy specification writing! 📝
