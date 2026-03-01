# スクリプト集

本書「仕様駆動開発ガイド」で紹介されている自動化・チェック機能を実現するスクリプト集です。コピー&ペーストで使える実行可能なスクリプトを提供します。

## **重要 ⚠️ 免責事項 必ずご同意ください** 

**本書に掲載されているスクリプトは、あくまでサンプルとして提供されています。**

- これらのスクリプトの使用は**自己責任**でお願いします
- 本書の著者および出版社は、これらのスクリプトの使用によって生じた損害について一切の責任を負いません
- スクリプトは動作保証されていません。使用前に必ず内容を確認し、必要に応じてカスタマイズしてください
- 本番環境で使用する前に、十分なテストを実施してください
- セキュリティやパフォーマンスに関する問題が発生する可能性があります。使用前に適切な検証を行ってください

本スクリプトはMITライセンスで提供されています。詳細は[LICENSE](../../LICENSE)ファイルを参照してください。  
ご利用にあたってはスクリプト内容を十分にご確認いただき、自己責任でご活用ください。  
本プログラムの利用により生じた損害等について、著者および提供元は一切責任を負いません。

**使い方**:
- 各章で紹介されている自動化シーンに対応したスクリプトを収録
- スクリプトをコピーして、自分のプロジェクトに配置
- **実行環境の要件を確認してから使用してください**（各スクリプトの「実行環境」セクションを参照）
- **依存関係をインストールしてください**（各スクリプトの「依存関係のインストール」セクションを参照）
- 必要に応じてプロジェクトに合わせてカスタマイズ
- 問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください

**スクリプト言語の選択基準**:

| 用途 | 推奨言語 | 理由 |
|------|---------|------|
| Git操作、簡単なチェック | Bash | 依存関係なし、即座に実行可能 |
| データ処理、レポート生成 | Python | 可読性、保守性が高い |
| GitHub API連携 | Python | requestsライブラリが強力 |
| Windows環境が必要な場合 | Bash + Python両方 | クロスプラットフォーム対応 |

---

## 目次

- [第4章：GitHubとCursorで仕様を管理・活用する](#第4章githubとcursorで仕様を管理活用する)
  - [4.1 GitHub Actionsの基本設定例](#41-github-actionsの基本設定例)
- [第5章：最初の1週間で仕様駆動開発を始める方法](#第5章最初の1週間で仕様駆動開発を始める方法)
  - [5.1 ディレクトリ構造の初期化スクリプト](#51-ディレクトリ構造の初期化スクリプト)
- [第6章：規模別に合意形成と承認を実現する方法](#第6章規模別に合意形成と承認を実現する方法)
  - [6.1 Issueテンプレートの実装例](#61-issueテンプレートの実装例)
  - [6.2 Pull Requestテンプレートの実装例](#62-pull-requestテンプレートの実装例)
- [第10章：レガシー文書を仕様駆動開発に取り込む方法](#第10章レガシー文書を仕様駆動開発に取り込む方法)
  - [10.1 バッチ変換スクリプト](#101-バッチ変換スクリプト)
  - [10.2 変換後の検証スクリプト](#102-変換後の検証スクリプト)
- [第12章：組織全体導入のガバナンス設計](#第12章組織全体導入のガバナンス設計)
  - [12.1 CODEOWNERSファイルの詳細な設定例](#121-codeownersファイルの詳細な設定例)
  - [12.2 Git hooksの実装例](#122-git-hooksの実装例)
  - [12.3 仕様とコードの整合性チェックスクリプト](#123-仕様とコードの整合性チェックスクリプト)
  - [12.4 CI/CDパイプラインの設定例](#124-cicdパイプラインの設定例)
  - [12.5 稟議レポート生成スクリプト](#125-稟議レポート生成スクリプト)
  - [12.6 組織での進捗確認スクリプト](#126-組織での進捗確認スクリプト)
- [スクリプトのカスタマイズ方法](#スクリプトのカスタマイズ方法)

---

## 第4章：GitHubとCursorで仕様を管理・活用する

### 4.1 GitHub Actionsの基本設定例

**追加箇所**: 4.9節「まとめ：掲示板の運用と仕様駆動開発の4つの原則」の前

**目的**: Markdownファイルの自動チェック、リンク切れチェックを実装する

**このスクリプトの概要**: 
GitHub Actionsを使用して、仕様ファイル（Markdown）の品質を自動的にチェックするワークフローを設定します。Markdownの文法チェックとリンク切れチェックを自動化し、Pull Request時に自動実行されます。

**実行環境**:
- GitHub Actions環境
- 必要なツール: markdownlint-cli, markdown-link-check

**依存関係のインストール**:
```bash
# Node.jsが必要です（GitHub Actionsでは自動インストールされます）
npm install -g markdownlint-cli markdown-link-check
```

#### 4.1.1 Markdownファイルの自動チェック

**ファイルパス**: `.github/workflows/markdown-check.yml`

**説明**: markdownlint-cliを使用してMarkdownファイルの文法チェックを行います。仕様ファイルの品質を自動的に保証します。

**主な機能**:
- Markdownの文法チェック
- 見出しレベルの一貫性チェック
- リストのインデントチェック
- コードブロックの正しい記法チェック

**設定ファイル**:
```yaml
name: Markdown Check

on:
  push:
    paths:
      - '**.md'
      - '.markdownlint.json'
      - '.github/workflows/markdown-check.yml'
  pull_request:
    paths:
      - '**.md'
      - '.markdownlint.json'

jobs:
  markdown-lint:
    name: Markdownリント
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install markdownlint-cli
        run: npm install -g markdownlint-cli

      - name: Create default config if not exists
        run: |
          if [ ! -f .markdownlint.json ]; then
            cat > .markdownlint.json << 'EOF'
          {
            "default": true,
            "MD003": { "style": "atx" },
            "MD007": { "indent": 2 },
            "MD013": false,
            "MD024": { "siblings_only": true },
            "MD033": false,
            "MD041": false
          }
          EOF
          fi

      - name: Run markdownlint on spec files
        run: |
          if [ -d "docs/spec" ]; then
            echo "仕様ファイルをチェック中..."
            markdownlint 'docs/spec/**/*.md' --config .markdownlint.json
          else
            echo "docs/spec ディレクトリが存在しません。スキップします。"
          fi

      - name: Run markdownlint on all markdown files
        run: |
          echo "すべてのMarkdownファイルをチェック中..."
          markdownlint '**/*.md' \
            --ignore node_modules \
            --ignore .github \
            --ignore vendor \
            --ignore dist \
            --config .markdownlint.json

      - name: Comment on PR with results
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ **Markdownリントエラー**\n\nMarkdownファイルに文法エラーが見つかりました。\n\n詳細は Actions タブで確認できます。\n\n**修正方法:**\n```bash\n# ローカルでチェック\nnpm install -g markdownlint-cli\nmarkdownlint "**/*.md" --config .markdownlint.json\n\n# 自動修正（一部のエラー）\nmarkdownlint "**/*.md" --config .markdownlint.json --fix\n```'
            })
```

**markdownlint設定ファイル** (`.markdownlint.json`):
```json
{
  "default": true,
  "MD003": { "style": "atx" },
  "MD007": { "indent": 2 },
  "MD013": false,
  "MD024": { "siblings_only": true },
  "MD033": false,
  "MD041": false,
  "line-length": false,
  "no-duplicate-header": { "siblings_only": true }
}
```

**設定の説明**:
- `MD003`: 見出しスタイルをATX形式（`#`）に統一
- `MD007`: リストのインデントを2スペースに設定
- `MD013`: 行の長さ制限を無効化（日本語対応）
- `MD024`: 兄弟要素内でのみ重複見出しを禁止
- `MD033`: HTMLタグの使用を許可
- `MD041`: ファイルの最初の行が見出しでなくてもOK

**使用方法**:
```bash
# 1. ワークフローファイルを配置
mkdir -p .github/workflows
cat > .github/workflows/markdown-check.yml << 'EOF'
# 上記のYAML設定をペースト
EOF

# 2. markdownlint設定ファイルを配置
cat > .markdownlint.json << 'EOF'
# 上記のJSON設定をペースト
EOF

# 3. ローカルでテスト
npm install -g markdownlint-cli
markdownlint '**/*.md' --config .markdownlint.json

# 4. 自動修正（一部のエラー）
markdownlint '**/*.md' --config .markdownlint.json --fix

# 5. GitHubにpush
git add .github/workflows/markdown-check.yml .markdownlint.json
git commit -m "ci: Add markdown linting workflow"
git push
```

#### 4.1.2 リンク切れチェック

**ファイルパス**: `.github/workflows/link-check.yml`

**説明**: markdown-link-checkを使用して、Markdownファイル内のリンク切れを検出します。仕様ファイル間の参照の健全性を保証します。

**主な機能**:
- Markdown内のリンクの存在確認
- 外部URLの有効性チェック
- 相対パスリンクの検証
- カスタムパターンの除外設定

**設定ファイル**:
```yaml
name: Link Check

on:
  push:
    paths:
      - '**.md'
      - '.markdown-link-check.json'
      - '.github/workflows/link-check.yml'
  pull_request:
    paths:
      - '**.md'
  schedule:
    # 毎週月曜日の午前9時（JST）に実行
    - cron: '0 0 * * 1'

jobs:
  link-check:
    name: リンク切れチェック
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install markdown-link-check
        run: npm install -g markdown-link-check

      - name: Create default config if not exists
        run: |
          if [ ! -f .markdown-link-check.json ]; then
            cat > .markdown-link-check.json << 'EOF'
          {
            "ignorePatterns": [
              {
                "pattern": "^http://localhost"
              },
              {
                "pattern": "^https://localhost"
              },
              {
                "pattern": "^#"
              }
            ],
            "replacementPatterns": [],
            "httpHeaders": [
              {
                "urls": ["https://github.com"],
                "headers": {
                  "Accept-Encoding": "zstd, br, gzip, deflate"
                }
              }
            ],
            "timeout": "20s",
            "retryOn429": true,
            "retryCount": 5,
            "fallbackRetryDelay": "30s",
            "aliveStatusCodes": [200, 206, 999]
          }
          EOF
          fi

      - name: Check links in spec files
        run: |
          if [ -d "docs/spec" ]; then
            echo "仕様ファイルのリンクをチェック中..."
            find docs/spec -name "*.md" -print0 | while IFS= read -r -d '' file; do
              echo "チェック中: $file"
              markdown-link-check "$file" --config .markdown-link-check.json --quiet || exit 1
            done
          else
            echo "docs/spec ディレクトリが存在しません。スキップします。"
          fi

      - name: Check links in README
        run: |
          if [ -f "README.md" ]; then
            echo "README.md のリンクをチェック中..."
            markdown-link-check README.md --config .markdown-link-check.json --quiet
          fi

      - name: Check links in all markdown files
        run: |
          echo "すべてのMarkdownファイルのリンクをチェック中..."
          find . -name "*.md" \
            -not -path "*/node_modules/*" \
            -not -path "*/.git/*" \
            -not -path "*/vendor/*" \
            -print0 | while IFS= read -r -d '' file; do
            echo "チェック中: $file"
            markdown-link-check "$file" --config .markdown-link-check.json --quiet || exit 1
          done

      - name: Comment on PR with results
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ **リンク切れ検出**\n\nMarkdownファイルにリンク切れが見つかりました。\n\n詳細は Actions タブで確認できます。\n\n**修正方法:**\n```bash\n# ローカルでチェック\nnpm install -g markdown-link-check\nmarkdown-link-check README.md --config .markdown-link-check.json\n\n# 仕様ファイル全体をチェック\nfind docs/spec -name "*.md" -exec markdown-link-check {} --config .markdown-link-check.json \\;\n```'
            })

      - name: Upload link check results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: link-check-results
          path: |
            *.log
```

**markdown-link-check設定ファイル** (`.markdown-link-check.json`):
```json
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://localhost"
    },
    {
      "pattern": "^http://127.0.0.1"
    },
    {
      "pattern": "^#"
    }
  ],
  "replacementPatterns": [
    {
      "pattern": "^/",
      "replacement": "{{BASEURL}}/"
    }
  ],
  "httpHeaders": [
    {
      "urls": ["https://github.com", "https://api.github.com"],
      "headers": {
        "Accept-Encoding": "zstd, br, gzip, deflate",
        "User-Agent": "Mozilla/5.0 (compatible; markdown-link-check)"
      }
    }
  ],
  "timeout": "20s",
  "retryOn429": true,
  "retryCount": 5,
  "fallbackRetryDelay": "30s",
  "aliveStatusCodes": [200, 206, 999]
}
```

**設定の説明**:
- `ignorePatterns`: チェックから除外するURLパターン（localhost、アンカーリンクなど）
- `replacementPatterns`: URLの置換ルール
- `httpHeaders`: 特定ドメインへのリクエスト時のヘッダー設定
- `timeout`: リンクチェックのタイムアウト時間
- `retryOn429`: レート制限時のリトライ設定
- `retryCount`: リトライ回数
- `aliveStatusCodes`: 有効と判断するHTTPステータスコード

**使用方法**:
```bash
# 1. ワークフローファイルを配置
mkdir -p .github/workflows
cat > .github/workflows/link-check.yml << 'EOF'
# 上記のYAML設定をペースト
EOF

# 2. markdown-link-check設定ファイルを配置
cat > .markdown-link-check.json << 'EOF'
# 上記のJSON設定をペースト
EOF

# 3. ローカルでテスト
npm install -g markdown-link-check

# 単一ファイルをチェック
markdown-link-check README.md --config .markdown-link-check.json

# 複数ファイルをチェック
find docs/spec -name "*.md" -exec markdown-link-check {} --config .markdown-link-check.json \;

# 4. GitHubにpush
git add .github/workflows/link-check.yml .markdown-link-check.json
git commit -m "ci: Add link check workflow"
git push
```

**トラブルシューティング**:
```bash
# GitHub APIのレート制限エラーが発生した場合
# .markdown-link-check.json に GitHub Personal Access Token を設定

# GitHub Secretsに GITHUB_TOKEN を追加して、ワークフローで使用
# .github/workflows/link-check.yml の httpHeaders セクションを以下のように変更:
#
# "headers": {
#   "Authorization": "token ${{ secrets.GITHUB_TOKEN }}"
# }
```

---

## 第5章：最初の1週間で仕様駆動開発を始める方法

### 5.1 ディレクトリ構造の初期化スクリプト

**追加箇所**: 5.3節「なぜ「最初の1週間」が勝負なのか」の後

**目的**: 推奨ディレクトリ構造を自動生成し、基本的なREADME.mdテンプレートを作成する

**このスクリプトの概要**: 
仕様駆動開発を始めるための推奨ディレクトリ構造を自動生成します。README.mdテンプレート、.gitignore、基本的な仕様ファイル（docs/spec/）も作成します。規模別（small/medium/large）のテンプレートに対応しています。

**実行環境**:
- Bash: macOS / Linux / Windows WSL
- Python: Python 3.7以上

**依存関係**: 
- Bash版: 依存関係なし（標準コマンドのみ）
- Python版: 標準ライブラリのみ（追加インストール不要）

#### 5.1.1 Bash版（推奨）

**ファイル名**: `init-spec-driven-dev.sh`

**説明**: 仕様駆動開発を始めるための推奨ディレクトリ構造を自動生成します。README.mdテンプレート、.gitignore、基本的な仕様ファイルも作成します。

**使用方法**:
```bash
# 基本的な使い方（カレントディレクトリに作成）
./init-spec-driven-dev.sh

# プロジェクト名を指定
./init-spec-driven-dev.sh --project-name my-project

# 規模を指定（small/medium/large）
./init-spec-driven-dev.sh --scale medium

# ドライランモード
./init-spec-driven-dev.sh --dry-run
```

**スクリプト本体**:
```bash
#!/bin/bash
#
# 仕様駆動開発のディレクトリ構造初期化スクリプト
#
# 機能:
# 1. 推奨ディレクトリ構造の作成
# 2. README.mdテンプレートの生成
# 3. .gitignoreの生成
# 4. 基本的な仕様ファイルの作成
#
# 使用例:
#   ./init-spec-driven-dev.sh
#   ./init-spec-driven-dev.sh --project-name my-project --scale medium
#

set -e

# デフォルト設定
PROJECT_NAME="my-spec-driven-project"
SCALE="small"  # small, medium, large
DRY_RUN=0

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    --project-name NAME  プロジェクト名 (デフォルト: my-spec-driven-project)
    --scale SIZE         規模 (small/medium/large, デフォルト: small)
    --dry-run            ドライランモード（実際には作成しない）
    --help, -h           このヘルプを表示

規模別の違い:
    small:  小規模チーム向け（README.md中心、シンプルな構造）
    medium: 中規模プロジェクト向け（docs/spec/あり）
    large:  大規模組織向け（詳細な構造、稟議対応）

例:
    $0
    $0 --project-name my-project --scale medium
    $0 --dry-run
EOF
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --scale)
            SCALE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "エラー: 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 規模の検証
if [[ ! "$SCALE" =~ ^(small|medium|large)$ ]]; then
    echo -e "${RED}❌ エラー: 規模は small, medium, large のいずれかを指定してください${NC}"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}仕様駆動開発 ディレクトリ構造初期化${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "プロジェクト名: $PROJECT_NAME"
echo "規模: $SCALE"
if [ "$DRY_RUN" -eq 1 ]; then
    echo -e "${YELLOW}モード: ドライラン${NC}"
fi
echo ""

# ディレクトリ作成関数
create_dir() {
    local dir=$1
    if [ "$DRY_RUN" -eq 1 ]; then
        echo -e "${GREEN}[作成予定]${NC} ディレクトリ: $dir"
    else
        mkdir -p "$dir"
        echo -e "${GREEN}✓${NC} 作成: $dir"
    fi
}

# ファイル作成関数
create_file() {
    local file=$1
    local content=$2
    if [ "$DRY_RUN" -eq 1 ]; then
        echo -e "${GREEN}[作成予定]${NC} ファイル: $file"
    else
        echo "$content" > "$file"
        echo -e "${GREEN}✓${NC} 作成: $file"
    fi
}

# 1. ディレクトリ構造の作成
echo -e "${BLUE}[1/4]${NC} ディレクトリ構造を作成中..."

if [ "$SCALE" = "small" ]; then
    # 小規模：シンプルな構造
    create_dir "."
elif [ "$SCALE" = "medium" ]; then
    # 中規模：docs/spec/あり
    create_dir "docs/spec"
    create_dir "src"
    create_dir "tests"
elif [ "$SCALE" = "large" ]; then
    # 大規模：詳細な構造
    create_dir "docs/spec/features"
    create_dir "docs/spec/architecture"
    create_dir "docs/spec/api"
    create_dir "docs/reports"
    create_dir "src"
    create_dir "tests"
    create_dir ".github/ISSUE_TEMPLATE"
    create_dir ".github/workflows"
fi

echo ""

# 2. README.mdテンプレートの生成
echo -e "${BLUE}[2/4]${NC} README.mdテンプレートを生成中..."

README_CONTENT="# $PROJECT_NAME

## What（何を作るか）

[このプロジェクトで実現したいことを1-2文で記述]

## Why（なぜ作るか）

[なぜこのプロジェクトが必要か、背景と目的を記述]

## 主要機能

- [ ] [機能1]
- [ ] [機能2]
- [ ] [機能3]

## 受入基準

- [ ] [完了条件1]
- [ ] [完了条件2]
- [ ] [完了条件3]

## 次のステップ

1. [ ] この README.md を具体的な内容で埋める
2. [ ] 仕様ファイルを作成する
3. [ ] 開発環境をセットアップする"

if [ "$SCALE" = "medium" ] || [ "$SCALE" = "large" ]; then
    README_CONTENT="$README_CONTENT

## 仕様ファイル

仕様は \`docs/spec/\` ディレクトリに Markdown 形式で記述します。

- 仕様の変更は必ずコードの変更と一緒にコミットする
- Why（なぜ）と What（何を）を明確にする
- How（どう実装するか）は仕様に書かない"
fi

create_file "README.md" "$README_CONTENT"
echo ""

# 3. .gitignoreの生成
echo -e "${BLUE}[3/4]${NC} .gitignoreを生成中..."

GITIGNORE_CONTENT="# macOS
.DS_Store

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Node
node_modules/
npm-debug.log

# Python
__pycache__/
*.py[cod]
*.so
.Python
env/
venv/

# Environment variables
.env
.env.local

# Logs
*.log

# Build outputs
dist/
build/
*.egg-info/"

create_file ".gitignore" "$GITIGNORE_CONTENT"
echo ""

# 4. 基本的な仕様ファイルの作成（medium/large のみ）
if [ "$SCALE" = "medium" ] || [ "$SCALE" = "large" ]; then
    echo -e "${BLUE}[4/4]${NC} 基本的な仕様ファイルを作成中..."

    SPEC_TEMPLATE="# 機能名

**作成日**: $(date +%Y-%m-%d)
**最終更新**: $(date +%Y-%m-%d)

## Why（なぜこの機能が必要か）

[背景と目的を記述]

## What（何を実現するか）

[具体的に実現したいことを記述]

## 受入基準

- [ ] [受入基準1]
- [ ] [受入基準2]
- [ ] [受入基準3]

## 制約条件

[技術的・ビジネス的な制約があれば記述]

## 参考情報

- [関連するドキュメントやリンク]"

    create_file "docs/spec/example-feature.md" "$SPEC_TEMPLATE"
    echo ""
else
    echo -e "${BLUE}[4/4]${NC} 仕様ファイルはスキップ（small規模）"
    echo ""
fi

# サマリー
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}初期化完了${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" -eq 0 ]; then
    echo -e "${GREEN}✅ ディレクトリ構造の初期化が完了しました！${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. README.md を編集してプロジェクトの詳細を記述"
    echo "2. Git リポジトリを初期化: git init"
    echo "3. 初回コミット: git add . && git commit -m 'feat: Initialize spec-driven project'"

    if [ "$SCALE" = "medium" ] || [ "$SCALE" = "large" ]; then
        echo "4. docs/spec/example-feature.md を参考に仕様を記述"
    fi
else
    echo -e "${YELLOW}ドライランモードで実行しました${NC}"
    echo "実際に作成するには --dry-run オプションを外して実行してください"
fi
```

**インストール方法**:
```bash
# 1. スクリプトを保存
cat > init-spec-driven-dev.sh << 'EOF'
# 上記のスクリプト本体をペースト
EOF

# 2. 実行権限を付与
chmod +x init-spec-driven-dev.sh

# 3. 実行
./init-spec-driven-dev.sh --project-name my-project --scale medium

# 4. Gitリポジトリを初期化
cd my-project
git init
git add .
git commit -m "feat: Initialize spec-driven project"
```

#### 5.1.2 Python版（Windows対応）

**ファイル名**: `init_spec_driven_dev.py`

**説明**: Windows環境でも動作するPython版のディレクトリ構造初期化スクリプト。Bash版と同等の機能を提供し、クロスプラットフォームで使用できます。

**主な機能**:
- 推奨ディレクトリ構造の自動生成
- README.mdテンプレートの作成
- .gitignoreの自動生成
- 基本的な仕様ファイルの作成
- 規模別対応（small/medium/large）
- カラー出力（Windows対応）

**使用方法**:
```bash
# 基本的な使い方
python init_spec_driven_dev.py

# プロジェクト名を指定
python init_spec_driven_dev.py --project-name my-project

# 規模を指定（small/medium/large）
python init_spec_driven_dev.py --scale medium

# ドライランモード
python init_spec_driven_dev.py --dry-run
```

**スクリプト本体**:
```python
#!/usr/bin/env python3
"""
仕様駆動開発のディレクトリ構造初期化スクリプト

機能:
1. 推奨ディレクトリ構造の作成
2. README.mdテンプレートの生成
3. .gitignoreの生成
4. 基本的な仕様ファイルの作成

使用例:
    python init_spec_driven_dev.py
    python init_spec_driven_dev.py --project-name my-project --scale medium
    python init_spec_driven_dev.py --dry-run
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime


class Colors:
    """ANSIカラーコード"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

    @classmethod
    def disable_on_windows(cls):
        """Windowsで色を無効化（ANSICON未使用時）"""
        if os.name == 'nt' and not os.environ.get('ANSICON'):
            cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ''


class SpecDrivenInitializer:
    """仕様駆動開発の初期化クラス"""

    def __init__(self, project_name: str, scale: str, dry_run: bool = False):
        self.project_name = project_name
        self.scale = scale
        self.dry_run = dry_run
        self.base_dir = Path.cwd()

    def create_dir(self, dir_path: Path):
        """ディレクトリを作成"""
        if self.dry_run:
            print(f"{Colors.GREEN}[作成予定]{Colors.NC} ディレクトリ: {dir_path}")
        else:
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"{Colors.GREEN}✓{Colors.NC} 作成: {dir_path}")

    def create_file(self, file_path: Path, content: str):
        """ファイルを作成"""
        if self.dry_run:
            print(f"{Colors.GREEN}[作成予定]{Colors.NC} ファイル: {file_path}")
        else:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"{Colors.GREEN}✓{Colors.NC} 作成: {file_path}")

    def create_directory_structure(self):
        """ディレクトリ構造を作成"""
        print(f"{Colors.BLUE}[1/4]{Colors.NC} ディレクトリ構造を作成中...")
        print()

        if self.scale == 'small':
            # 小規模：シンプルな構造
            pass  # カレントディレクトリのみ使用
        elif self.scale == 'medium':
            # 中規模：docs/spec/あり
            self.create_dir(self.base_dir / 'docs' / 'spec')
            self.create_dir(self.base_dir / 'src')
            self.create_dir(self.base_dir / 'tests')
        elif self.scale == 'large':
            # 大規模：詳細な構造
            self.create_dir(self.base_dir / 'docs' / 'spec' / 'features')
            self.create_dir(self.base_dir / 'docs' / 'spec' / 'architecture')
            self.create_dir(self.base_dir / 'docs' / 'spec' / 'api')
            self.create_dir(self.base_dir / 'docs' / 'reports')
            self.create_dir(self.base_dir / 'src')
            self.create_dir(self.base_dir / 'tests')
            self.create_dir(self.base_dir / '.github' / 'ISSUE_TEMPLATE')
            self.create_dir(self.base_dir / '.github' / 'workflows')

        print()

    def create_readme(self):
        """README.mdテンプレートを生成"""
        print(f"{Colors.BLUE}[2/4]{Colors.NC} README.mdテンプレートを生成中...")
        print()

        readme_content = f"""# {self.project_name}

## What（何を作るか）

[このプロジェクトで実現したいことを1-2文で記述]

## Why（なぜ作るか）

[なぜこのプロジェクトが必要か、背景と目的を記述]

## 主要機能

- [ ] [機能1]
- [ ] [機能2]
- [ ] [機能3]

## 受入基準

- [ ] [完了条件1]
- [ ] [完了条件2]
- [ ] [完了条件3]

## 次のステップ

1. [ ] この README.md を具体的な内容で埋める
2. [ ] 仕様ファイルを作成する
3. [ ] 開発環境をセットアップする
"""

        if self.scale in ['medium', 'large']:
            readme_content += """
## 仕様ファイル

仕様は `docs/spec/` ディレクトリに Markdown 形式で記述します。

- 仕様の変更は必ずコードの変更と一緒にコミットする
- Why（なぜ）と What（何を）を明確にする
- How（どう実装するか）は仕様に書かない
"""

        self.create_file(self.base_dir / 'README.md', readme_content)
        print()

    def create_gitignore(self):
        """gitignoreを生成"""
        print(f"{Colors.BLUE}[3/4]{Colors.NC} .gitignoreを生成中...")
        print()

        gitignore_content = """# macOS
.DS_Store

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Node
node_modules/
npm-debug.log

# Python
__pycache__/
*.py[cod]
*.so
.Python
env/
venv/

# Environment variables
.env
.env.local

# Logs
*.log

# Build outputs
dist/
build/
*.egg-info/
"""

        self.create_file(self.base_dir / '.gitignore', gitignore_content)
        print()

    def create_spec_files(self):
        """基本的な仕様ファイルを作成（medium/largeのみ）"""
        if self.scale in ['medium', 'large']:
            print(f"{Colors.BLUE}[4/4]{Colors.NC} 基本的な仕様ファイルを作成中...")
            print()

            spec_template = f"""# 機能名

**作成日**: {datetime.now().strftime('%Y-%m-%d')}
**最終更新**: {datetime.now().strftime('%Y-%m-%d')}

## Why（なぜこの機能が必要か）

[背景と目的を記述]

## What（何を実現するか）

[具体的に実現したいことを記述]

## 受入基準

- [ ] [受入基準1]
- [ ] [受入基準2]
- [ ] [受入基準3]

## 制約条件

[技術的・ビジネス的な制約があれば記述]

## 参考情報

- [関連するドキュメントやリンク]
"""

            self.create_file(
                self.base_dir / 'docs' / 'spec' / 'example-feature.md',
                spec_template
            )
            print()
        else:
            print(f"{Colors.BLUE}[4/4]{Colors.NC} 仕様ファイルはスキップ（small規模）")
            print()

    def show_summary(self):
        """サマリーを表示"""
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}初期化完了{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print()

        if not self.dry_run:
            print(f"{Colors.GREEN}✅ ディレクトリ構造の初期化が完了しました！{Colors.NC}")
            print()
            print("次のステップ:")
            print("1. README.md を編集してプロジェクトの詳細を記述")
            print("2. Git リポジトリを初期化: git init")
            print("3. 初回コミット: git add . && git commit -m 'feat: Initialize spec-driven project'")

            if self.scale in ['medium', 'large']:
                print("4. docs/spec/example-feature.md を参考に仕様を記述")
        else:
            print(f"{Colors.YELLOW}ドライランモードで実行しました{Colors.NC}")
            print("実際に作成するには --dry-run オプションを外して実行してください")

    def run(self):
        """初期化を実行"""
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}仕様駆動開発 ディレクトリ構造初期化{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print()
        print(f"プロジェクト名: {self.project_name}")
        print(f"規模: {self.scale}")
        if self.dry_run:
            print(f"{Colors.YELLOW}モード: ドライラン{Colors.NC}")
        print()

        # 初期化処理を実行
        self.create_directory_structure()
        self.create_readme()
        self.create_gitignore()
        self.create_spec_files()
        self.show_summary()


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='仕様駆動開発のディレクトリ構造を初期化します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
規模別の違い:
    small:  小規模チーム向け（README.md中心、シンプルな構造）
    medium: 中規模プロジェクト向け（docs/spec/あり）
    large:  大規模組織向け（詳細な構造、稟議対応）

使用例:
  %(prog)s
  %(prog)s --project-name my-project --scale medium
  %(prog)s --dry-run
        """
    )

    parser.add_argument(
        '--project-name',
        default='my-spec-driven-project',
        help='プロジェクト名 (デフォルト: my-spec-driven-project)'
    )

    parser.add_argument(
        '--scale',
        default='small',
        choices=['small', 'medium', 'large'],
        help='規模 (small/medium/large, デフォルト: small)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='ドライランモード（実際には作成しない）'
    )

    args = parser.parse_args()

    # Windows環境では色を無効化
    if os.name == 'nt':
        Colors.disable_on_windows()

    # 初期化を実行
    initializer = SpecDrivenInitializer(
        project_name=args.project_name,
        scale=args.scale,
        dry_run=args.dry_run
    )

    initializer.run()


if __name__ == '__main__':
    main()
```

**インストール方法**:
```bash
# 1. スクリプトを保存
# 上記のスクリプト本体を init_spec_driven_dev.py として保存

# 2. 実行
python init_spec_driven_dev.py --project-name my-project --scale medium

# 3. Gitリポジトリを初期化
git init
git add .
git commit -m "feat: Initialize spec-driven project"
```

**Windows PowerShell での使用例**:
```powershell
# 実行
python init_spec_driven_dev.py --project-name my-project --scale medium

# Gitリポジトリを初期化
git init
git add .
git commit -m "feat: Initialize spec-driven project"
```

**Bash版との違い**:
- Pythonの`pathlib`を使用してクロスプラットフォーム対応
- Windows環境での色表示を自動検出
- より詳細なエラーハンドリング
- オブジェクト指向設計で保守性が向上

---

## 第6章：規模別に合意形成と承認を実現する方法

### 6.1 Issueテンプレートの実装例

**追加箇所**: 6.4節「規模の定義と3つの実践方法」の後

**このスクリプトの概要**:
GitHubのIssueテンプレート機能を使用して、規模別（小規模・中規模・大規模）のIssueテンプレートを提供します。機能追加、バグ報告、仕様変更提案の3種類のテンプレートを用意しています。`.github/ISSUE_TEMPLATE/`ディレクトリに配置するだけで使用できます。

**実行環境**:
- GitHubリポジトリ
- ファイルを配置するだけ（スクリプト実行不要）

**依存関係**: なし（GitHub標準機能）

**追加箇所**: 6.4節「規模の定義と3つの実践方法」の後

**目的**: 機能追加、バグ報告、仕様変更提案用のIssueテンプレートを提供する

**ファイルパス**: `.github/ISSUE_TEMPLATE/`

#### 6.1.1 機能追加用のIssueテンプレート（小規模チーム向け）

**ファイル名**: `.github/ISSUE_TEMPLATE/feature_request_small.md`

**説明**: シンプルで実践的な機能追加リクエスト用テンプレート。小規模チームが即座に使える形式です。

```markdown
---
name: 機能追加リクエスト（小規模チーム向け）
about: 新しい機能の追加を提案する
title: '[機能] '
labels: 'enhancement'
assignees: ''
---

## 背景
なぜこの変更が必要か（1-2文で記載）

## やりたいこと
何を実現したいか（箇条書き3つ程度）

-
-
-

## 完了の定義
- [ ] 完了条件1
- [ ] 完了条件2
- [ ] 完了条件3

## 補足情報
その他の参考情報があれば記載
```

#### 6.1.2 機能追加用のIssueテンプレート（中規模プロジェクト向け）

**ファイル名**: `.github/ISSUE_TEMPLATE/feature_request_medium.md`

**説明**: 関連情報を含む構造化されたIssueテンプレート。影響範囲や期限も管理します。

```markdown
---
name: 機能追加リクエスト（中規模プロジェクト向け）
about: 新しい機能の追加を提案する（構造化された形式）
title: '[機能] '
labels: 'enhancement'
assignees: ''
---

## 背景と目的
なぜこの変更が必要か、ビジネス的な背景を含めて記載

## 提案内容
何を実現するか、具体的に記載

## 受入基準
- [ ] 受入基準1
- [ ] 受入基準2
- [ ] 受入基準3

## 関連情報
- 関連仕様: `docs/spec/[ファイル名].md`
- 関連Issue: #[番号]
- 担当チーム: @[チーム名]

## 影響範囲
この変更が影響する範囲を記載

## 期限
いつまでに完了すべきか記載
```

#### 6.1.3 機能追加用のIssueテンプレート（大規模組織向け）

**ファイル名**: `.github/ISSUE_TEMPLATE/feature_request_large.md`

**説明**: 監査証跡を含む詳細なIssueテンプレート。稟議情報、セキュリティ、コンプライアンスチェックを含みます。

```markdown
---
name: 機能追加リクエスト（大規模組織向け）
about: 新しい機能の追加を提案する（監査証跡付き）
title: '[機能] '
labels: 'enhancement'
assignees: ''
---

## 稟議情報
- 稟議番号: [番号]
- 申請者: [名前]
- 承認者: [名前のリスト]
- 期限: [日付]

## 背景と目的
なぜこの変更が必要か、ビジネス的な背景を含めて記載

## 提案内容
何を実現するか、具体的に記載

## 受入基準
- [ ] 受入基準1
- [ ] 受入基準2
- [ ] 受入基準3

## セキュリティ・コンプライアンス
- [ ] セキュリティレビュー完了
- [ ] コンプライアンスチェック完了
- [ ] 個人情報保護法への対応確認

## 関連情報
- 関連仕様: `docs/spec/[ファイル名].md`
- 関連Issue: #[番号]
- 担当部署: [部署名]
- CODEOWNERSによる承認者: @[チーム名]

## 影響範囲
この変更が影響する範囲を記載

## リスク評価
- リスクレベル: [高/中/低]
- 想定されるリスク: [リスクの説明]
- 対策: [リスクへの対策]

## 監査証跡
- 作成日: [日付]
- 最終更新日: [日付]
- 変更履歴: [変更の記録]
```

#### 6.1.4 バグ報告用のIssueテンプレート

**ファイル名**: `.github/ISSUE_TEMPLATE/bug_report.md`

**説明**: バグの報告と再現手順を記録するテンプレート。全規模のチームで使えます。

```markdown
---
name: バグ報告
about: バグや不具合を報告する
title: '[バグ] '
labels: 'bug'
assignees: ''
---

## バグの概要
どのような問題が発生しているか、簡潔に記載

## 再現手順
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

## 期待される動作
本来どうあるべきかを記載

## 実際の動作
実際にどうなっているかを記載

## スクリーンショット
可能であればスクリーンショットを添付

## 環境情報
- OS: [例: macOS 14.0]
- ブラウザ: [例: Chrome 120]
- バージョン: [例: v1.2.3]

## 関連情報
- 関連仕様: `docs/spec/[ファイル名].md`
- 関連Issue: #[番号]
- エラーログ: [あれば貼り付け]

## 緊急度
- [ ] 緊急（システムが停止している）
- [ ] 高（主要機能が使えない）
- [ ] 中（一部機能に影響）
- [ ] 低（軽微な問題）
```

#### 6.1.5 仕様変更提案用のIssueテンプレート

**ファイル名**: `.github/ISSUE_TEMPLATE/spec_change.md`

**説明**: 既存仕様の変更を提案するテンプレート。変更前後の比較と影響範囲を明確にします。

```markdown
---
name: 仕様変更提案
about: 既存の仕様の変更を提案する
title: '[仕様変更] '
labels: 'spec-change'
assignees: ''
---

## 変更対象の仕様
- 対象ファイル: `docs/spec/[ファイル名].md`
- 対象セクション: [セクション名]

## 変更が必要な理由
なぜ現在の仕様を変更する必要があるのか記載

## 現在の仕様（変更前）
```
現在の仕様の該当部分を記載
```

## 提案する仕様（変更後）
```
変更後の仕様を記載
```

## 影響範囲
### コードへの影響
- [ ] 既存コードの修正が必要
- [ ] 新規コードの追加が必要
- [ ] 影響なし

### テストへの影響
- [ ] 既存テストの修正が必要
- [ ] 新規テストの追加が必要
- [ ] 影響なし

### ドキュメントへの影響
- [ ] ドキュメントの更新が必要
- [ ] 影響なし

### 互換性への影響
- [ ] 後方互換性が保たれる
- [ ] 破壊的変更（Breaking Change）

## 関連情報
- 関連Issue: #[番号]
- 関連PR: #[番号]
- 参考資料: [URL]

## 移行計画（Breaking Changeの場合）
1. [移行ステップ1]
2. [移行ステップ2]
3. [移行ステップ3]
```

### 6.2 Pull Requestテンプレートの実装例

**追加箇所**: 6.4節「規模の定義と3つの実践方法」の後

**このスクリプトの概要**:
Pull Request作成時に自動的に表示されるテンプレートを提供します。規模別（小規模・中規模・大規模）の3種類のテンプレートを用意しています。大規模組織向けには監査用チェックリストも含まれています。`.github/pull_request_template.md`に配置するだけで使用できます。

**実行環境**:
- GitHubリポジトリ
- ファイルを配置するだけ（スクリプト実行不要）

**依存関係**: なし（GitHub標準機能）

**追加箇所**: 6.4節「規模の定義と3つの実践方法」の後

**目的**: 規模別のPull Requestテンプレートを提供する

**ファイルパス**: `.github/`

#### 6.2.1 小規模チーム向けPull Requestテンプレート

**ファイル名**: `.github/pull_request_template.md`

**説明**: シンプルで実践的なPRテンプレート。レビュアーが素早く理解できる簡潔な形式です。

**使い方**: このファイルを`.github/pull_request_template.md`として配置すると、全てのPRでこのテンプレートが使用されます。

```markdown
## 変更内容
何を変更したか（1-2文で記載）

## 関連Issue
Closes #[番号]

## チェックリスト
- [ ] テストが通る
- [ ] READMEを更新した（必要な場合）
- [ ] 動作確認をした
```

#### 6.2.2 中規模プロジェクト向けPull Requestテンプレート

**ファイル名**: `.github/pull_request_template.md`

**説明**: レビューを促進する構造化されたPRテンプレート。仕様との紐付けと影響範囲を明確にします。

**使い方**: このファイルを`.github/pull_request_template.md`として配置します。複数のテンプレートを使い分ける場合は、`.github/PULL_REQUEST_TEMPLATE/`ディレクトリに配置することもできます。

```markdown
## 変更の概要
何を変更したか記載

## 変更の理由
なぜ変更が必要か記載

## 関連する仕様
- 仕様ファイル: `docs/spec/[ファイル名].md`
- 関連Issue: Closes #[番号]

## 変更の影響範囲
この変更が影響する範囲を記載

## スクリーンショット（UI変更の場合）
### Before
<!-- 変更前のスクリーンショット -->

### After
<!-- 変更後のスクリーンショット -->

## テスト方法
レビュアーがどうやって動作確認できるか記載

1. [テスト手順1]
2. [テスト手順2]
3. [テスト手順3]

## チェックリスト
- [ ] コードの変更内容を確認した
- [ ] テストを追加/更新した
- [ ] 関連する仕様ファイルを更新した
- [ ] 仕様の変更理由をコミットメッセージに記載した
- [ ] CODEOWNERSによる承認を受けた
```

#### 6.2.3 大規模組織向けPull Requestテンプレート

**ファイル名**: `.github/pull_request_template.md`

**説明**: 監査証跡を含む詳細なPRテンプレート。稟議情報、セキュリティチェック、承認フローを含みます。

**使い方**: 大規模組織では、このテンプレートをベースに組織固有のチェック項目を追加してください。

```markdown
## 稟議情報
- 稟議番号: 2025-[PR番号]
- 申請者: [名前]
- 承認者: [名前のリスト]

## 変更の概要
何を変更したか記載

## 変更の理由
なぜ変更が必要か、ビジネス的な背景を含めて記載

## 関連する仕様
- 仕様ファイル: `docs/spec/[ファイル名].md`
- 関連Issue: Closes #[番号]
- 稟議書: `reports/ringi-2025-[番号].md`

## 変更の影響範囲
### 影響を受けるシステム
- [システム1]
- [システム2]

### 影響を受けるユーザー
- [ユーザーグループ1]
- [ユーザーグループ2]

### ダウンタイムの有無
- [ ] ダウンタイムなし
- [ ] ダウンタイムあり（予定日時: [日時]、想定時間: [時間]）

## セキュリティ・コンプライアンス
- [ ] セキュリティレビュー完了
- [ ] コンプライアンスチェック完了
- [ ] 個人情報保護法への対応確認
- [ ] シークレットスキャン完了（機密情報が含まれていない）

## テスト結果
### ユニットテスト
- [ ] すべてのユニットテストが通過

### 統合テスト
- [ ] すべての統合テストが通過

### 手動テスト
- [ ] 手動テストを実施し、動作を確認

## スクリーンショット（UI変更の場合）
### Before
<!-- 変更前のスクリーンショット -->

### After
<!-- 変更後のスクリーンショット -->

## デプロイメント手順
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

## ロールバック手順
問題が発生した場合のロールバック手順を記載

1. [ロールバックステップ1]
2. [ロールバックステップ2]

## チェックリスト
- [ ] コードの変更内容を確認した
- [ ] テストを追加/更新した
- [ ] 関連する仕様ファイルを更新した
- [ ] 仕様の変更理由をコミットメッセージに記載した
- [ ] CODEOWNERSによる承認を受けた
- [ ] セキュリティレビューを受けた
- [ ] コンプライアンスチェックを受けた
- [ ] ドキュメントを更新した
- [ ] デプロイメント手順を確認した
- [ ] ロールバック手順を確認した

## 承認フロー
1. コードレビュー（エンジニア）: @[レビュアー名]
2. 仕様レビュー（PM）: @[PM名]
3. セキュリティレビュー: @[セキュリティチーム名]
4. 最終承認（マネージャー）: @[マネージャー名]

## 監査証跡
- 作成日: [日付]
- 最終更新日: [日付]
- 承認日: [日付]
- マージ日: [日付]
```

**補足**: 大規模組織では、組織の要件に応じて以下のカスタマイズを検討してください：
- 稟議番号の命名規則を組織のルールに合わせる
- セキュリティチェック項目を追加（SOC2、ISO27001など）
- 承認フローを組織構造に合わせる
- デプロイメントウィンドウ（変更可能時間帯）の確認を追加

---

## 第10章：レガシー文書を仕様駆動開発に取り込む方法

### 10.1 バッチ変換スクリプト

**追加箇所**: 10.7節「Word/ExcelからMarkdownへの変換方法」の後

**目的**: Word/Excelファイルの一括変換とログ出力

**このスクリプトの概要**: 
Word文書（.docx）とExcelシート（.xlsx）を一括でMarkdown形式に変換します。Pandocを使用してWordを変換し、pandas/openpyxlを使用してExcelの表をMarkdown形式に変換します。変換ログを詳細に出力し、ドライランモードにも対応しています。

**実行環境**:
- Bash: macOS / Linux / Windows WSL
- 必要なツール: pandoc
- Python: Python 3.7以上

**依存関係のインストール**:
```bash
# Pandocのインストール（Word変換用）
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Python版の場合、追加で以下をインストール
pip install pandas openpyxl
```

#### 10.1.1 Bash版（推奨）

**ファイル名**: `batch-convert-legacy.sh`

**説明**: Pandocを使用してWord/ExcelファイルをMarkdownに一括変換するBashスクリプト。変換ログを出力し、エラーハンドリングも実装しています。

**主な機能**:
- Word (.docx) / Excel (.xlsx) の一括変換
- 変換ログの詳細な記録
- エラー時の継続処理
- 変換前後のファイル数カウント
- タイムスタンプ付きログファイル

**使用方法**:
```bash
# 基本的な使い方（カレントディレクトリ内のすべてのファイルを変換）
./batch-convert-legacy.sh

# 入力ディレクトリと出力ディレクトリを指定
./batch-convert-legacy.sh --input legacy-docs --output docs/spec

# ログファイルを指定
./batch-convert-legacy.sh --log-file conversion.log

# ドライランモード（実際には変換せず、何が実行されるかを表示）
./batch-convert-legacy.sh --dry-run
```

**スクリプト本体**:
```bash
#!/bin/bash
#
# Word/Excelファイルの一括変換スクリプト
#
# 機能:
# 1. .docx / .xlsx ファイルを Markdown に変換
# 2. 変換ログの記録
# 3. エラーハンドリング
# 4. ディレクトリ構造の維持
#
# 必要なツール:
# - pandoc: https://pandoc.org/installing.html
#
# 使用例:
#   ./batch-convert-legacy.sh
#   ./batch-convert-legacy.sh --input legacy-docs --output docs/spec
#   ./batch-convert-legacy.sh --dry-run
#

set -e

# デフォルト設定
INPUT_DIR="."
OUTPUT_DIR="converted"
LOG_FILE="conversion-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=0
VERBOSE=0

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    --input DIR         入力ディレクトリ (デフォルト: .)
    --output DIR        出力ディレクトリ (デフォルト: converted)
    --log-file FILE     ログファイル名 (デフォルト: conversion-YYYYMMDD-HHMMSS.log)
    --dry-run           ドライランモード（変換せず確認のみ）
    --verbose, -v       詳細な出力
    --help, -h          このヘルプを表示

例:
    $0
    $0 --input legacy-docs --output docs/spec
    $0 --dry-run --verbose
EOF
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --input)
            INPUT_DIR="$2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "エラー: 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# pandocのインストール確認
if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}❌ エラー: pandoc が見つかりません${NC}"
    echo "インストール方法:"
    echo "  macOS:   brew install pandoc"
    echo "  Ubuntu:  sudo apt install pandoc"
    echo "  Windows: https://pandoc.org/installing.html"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Word/Excel一括変換スクリプト${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "入力ディレクトリ: $INPUT_DIR"
echo "出力ディレクトリ: $OUTPUT_DIR"
echo "ログファイル: $LOG_FILE"
if [ "$DRY_RUN" -eq 1 ]; then
    echo -e "${YELLOW}モード: ドライラン（実際には変換しません）${NC}"
fi
echo ""

# ディレクトリの存在確認
if [ ! -d "$INPUT_DIR" ]; then
    echo -e "${RED}❌ エラー: 入力ディレクトリが見つかりません: $INPUT_DIR${NC}"
    exit 1
fi

# 出力ディレクトリの作成
if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p "$OUTPUT_DIR"
fi

# ログファイルの初期化
if [ "$DRY_RUN" -eq 0 ]; then
    cat > "$LOG_FILE" << EOF
Word/Excel一括変換ログ
実行日時: $(date)
入力ディレクトリ: $INPUT_DIR
出力ディレクトリ: $OUTPUT_DIR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
fi

# カウンター
TOTAL_FILES=0
CONVERTED_FILES=0
FAILED_FILES=0

# Word (.docx) ファイルの変換
echo -e "${BLUE}[1/2]${NC} Wordファイルを検索中..."

while IFS= read -r -d '' docx_file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))

    # 相対パスを取得
    rel_path="${docx_file#$INPUT_DIR/}"

    # 出力ファイル名を生成
    output_file="$OUTPUT_DIR/${rel_path%.docx}.md"
    output_dir=$(dirname "$output_file")

    if [ "$DRY_RUN" -eq 1 ]; then
        echo -e "${GREEN}[変換予定]${NC} $docx_file → $output_file"
        continue
    fi

    # 出力ディレクトリを作成
    mkdir -p "$output_dir"

    # 変換実行
    echo "変換中: $docx_file"

    if pandoc "$docx_file" -f docx -t markdown -o "$output_file" --extract-media="$output_dir/media" 2>> "$LOG_FILE"; then
        echo -e "${GREEN}✓${NC} 変換成功: $output_file"
        echo "✓ 成功: $docx_file → $output_file" >> "$LOG_FILE"
        CONVERTED_FILES=$((CONVERTED_FILES + 1))
    else
        echo -e "${RED}❌${NC} 変換失敗: $docx_file"
        echo "❌ 失敗: $docx_file" >> "$LOG_FILE"
        FAILED_FILES=$((FAILED_FILES + 1))
    fi

done < <(find "$INPUT_DIR" -type f -name "*.docx" -print0)

# Excel (.xlsx) ファイルの処理（情報抽出）
echo ""
echo -e "${BLUE}[2/2]${NC} Excelファイルを検索中..."

while IFS= read -r -d '' xlsx_file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))

    # 相対パスを取得
    rel_path="${xlsx_file#$INPUT_DIR/}"

    # 出力ファイル名を生成
    output_file="$OUTPUT_DIR/${rel_path%.xlsx}.md"
    output_dir=$(dirname "$output_file")

    if [ "$DRY_RUN" -eq 1 ]; then
        echo -e "${YELLOW}[情報抽出予定]${NC} $xlsx_file → $output_file"
        continue
    fi

    # 出力ディレクトリを作成
    mkdir -p "$output_dir"

    # Excelファイルの情報を抽出（簡易版）
    echo "情報抽出中: $xlsx_file"

    cat > "$output_file" << EOF
# $(basename "$xlsx_file" .xlsx)

**元ファイル**: \`$xlsx_file\`
**変換日時**: $(date)

## 注意

このファイルはExcelファイル (\`$xlsx_file\`) から自動生成されました。

Excelの表データを正確にMarkdownに変換するには、以下の方法を推奨します:

1. **手動での変換**:
   - Excelファイルを開く
   - 表をコピーして [Tables Generator](https://www.tablesgenerator.com/markdown_tables) などのツールでMarkdown形式に変換

2. **Pythonスクリプトでの変換**:
   - \`openpyxl\` や \`pandas\` ライブラリを使用
   - \`batch_convert_legacy.py --excel\` を使用（Python版スクリプト）

## TODO

- [ ] 手動でExcelの内容をMarkdown形式の表に変換
- [ ] 仕様内容を確認・整理
- [ ] 不要な情報を削除

EOF

    echo -e "${YELLOW}⚠️${NC}  情報抽出完了（手動での変換が必要）: $output_file"
    echo "⚠️  要確認: $xlsx_file → $output_file（手動変換が必要）" >> "$LOG_FILE"
    CONVERTED_FILES=$((CONVERTED_FILES + 1))

done < <(find "$INPUT_DIR" -type f -name "*.xlsx" -print0)

# サマリー
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}変換結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "合計ファイル数: $TOTAL_FILES"
echo "変換成功: $CONVERTED_FILES"
echo "変換失敗: $FAILED_FILES"

if [ "$DRY_RUN" -eq 0 ]; then
    echo ""
    echo "ログファイル: $LOG_FILE"
fi

if [ "$DRY_RUN" -eq 0 ]; then
    cat >> "$LOG_FILE" << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

変換結果サマリー:
- 合計ファイル数: $TOTAL_FILES
- 変換成功: $CONVERTED_FILES
- 変換失敗: $FAILED_FILES

完了日時: $(date)
EOF
fi

if [ "$FAILED_FILES" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️${NC}  一部のファイルの変換に失敗しました"
    echo "詳細はログファイルを確認してください: $LOG_FILE"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ すべてのファイルの変換が完了しました！${NC}"
fi
```

**インストール方法**:
```bash
# 1. Pandocのインストール
# macOS:
brew install pandoc

# Ubuntu/Debian:
sudo apt update
sudo apt install pandoc

# Windows:
# https://pandoc.org/installing.html からインストーラーをダウンロード

# 2. スクリプトを保存
cat > batch-convert-legacy.sh << 'EOF'
# 上記のスクリプト本体をペースト
EOF

# 3. 実行権限を付与
chmod +x batch-convert-legacy.sh

# 4. 実行
./batch-convert-legacy.sh
```

#### 10.1.2 Python版（Windows対応）

**ファイル名**: `batch_convert_legacy.py`

**説明**: Windows環境でも動作するPython版。pandasとopenpyxlを使用してExcelファイルの表も正確にMarkdown形式に変換できます。

**主な機能**:
- Word (.docx) / Excel (.xlsx) の一括変換
- Excelの表をMarkdown形式の表に自動変換
- 変換ログの詳細な記録
- プログレスバー表示（オプション）
- クロスプラットフォーム対応

**使用方法**:
```bash
# 基本的な使い方
python batch_convert_legacy.py

# 入力ディレクトリと出力ディレクトリを指定
python batch_convert_legacy.py --input legacy-docs --output docs/spec

# Excelファイルも変換
python batch_convert_legacy.py --excel

# ドライランモード
python batch_convert_legacy.py --dry-run
```

**スクリプト本体**:
```python
#!/usr/bin/env python3
"""
Word/Excelファイルの一括変換スクリプト

機能:
1. .docx / .xlsx ファイルを Markdown に変換
2. Excelの表をMarkdown形式の表に変換（openpyxl使用）
3. 変換ログの記録
4. エラーハンドリング

必要なライブラリ:
- pypandoc: pip install pypandoc
- openpyxl: pip install openpyxl (Excel変換用)
- pandas: pip install pandas (Excel変換用)

使用例:
    python batch_convert_legacy.py
    python batch_convert_legacy.py --input legacy-docs --output docs/spec
    python batch_convert_legacy.py --excel --dry-run
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Tuple

# オプショナルライブラリのインポート
try:
    import pypandoc
except ImportError:
    print("エラー: pypandoc が見つかりません")
    print("インストール: pip install pypandoc")
    sys.exit(1)

# Excel変換用ライブラリ（オプション）
EXCEL_SUPPORT = False
try:
    import pandas as pd
    import openpyxl
    EXCEL_SUPPORT = True
except ImportError:
    pass


class Colors:
    """ANSIカラーコード"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

    @classmethod
    def disable_on_windows(cls):
        """Windowsで色を無効化"""
        if os.name == 'nt' and not os.environ.get('ANSICON'):
            cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ''


class BatchConverter:
    """一括変換クラス"""

    def __init__(self, input_dir: str, output_dir: str, log_file: str,
                 dry_run: bool = False, convert_excel: bool = False):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.log_file = Path(log_file)
        self.dry_run = dry_run
        self.convert_excel = convert_excel

        self.total_files = 0
        self.converted_files = 0
        self.failed_files = 0

    def initialize_log(self):
        """ログファイルの初期化"""
        if self.dry_run:
            return

        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write(f"""Word/Excel一括変換ログ
実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
入力ディレクトリ: {self.input_dir}
出力ディレクトリ: {self.output_dir}

{'='*60}

""")

    def log(self, message: str):
        """ログに記録"""
        if not self.dry_run:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(message + '\n')

    def convert_docx_to_md(self, docx_file: Path) -> bool:
        """WordファイルをMarkdownに変換"""
        # 出力ファイルパスを生成
        rel_path = docx_file.relative_to(self.input_dir)
        output_file = self.output_dir / rel_path.with_suffix('.md')

        if self.dry_run:
            print(f"{Colors.GREEN}[変換予定]{Colors.NC} {docx_file} → {output_file}")
            return True

        # 出力ディレクトリを作成
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            print(f"変換中: {docx_file}")

            # pandocで変換
            pypandoc.convert_file(
                str(docx_file),
                'md',
                outputfile=str(output_file),
                extra_args=['--extract-media', str(output_file.parent / 'media')]
            )

            print(f"{Colors.GREEN}✓{Colors.NC} 変換成功: {output_file}")
            self.log(f"✓ 成功: {docx_file} → {output_file}")
            return True

        except Exception as e:
            print(f"{Colors.RED}❌{Colors.NC} 変換失敗: {docx_file}")
            print(f"   エラー: {e}")
            self.log(f"❌ 失敗: {docx_file} - {e}")
            return False

    def convert_xlsx_to_md(self, xlsx_file: Path) -> bool:
        """ExcelファイルをMarkdownに変換"""
        # 出力ファイルパスを生成
        rel_path = xlsx_file.relative_to(self.input_dir)
        output_file = self.output_dir / rel_path.with_suffix('.md')

        if self.dry_run:
            if self.convert_excel and EXCEL_SUPPORT:
                print(f"{Colors.GREEN}[変換予定]{Colors.NC} {xlsx_file} → {output_file}")
            else:
                print(f"{Colors.YELLOW}[情報抽出予定]{Colors.NC} {xlsx_file} → {output_file}")
            return True

        # 出力ディレクトリを作成
        output_file.parent.mkdir(parents=True, exist_ok=True)

        if not self.convert_excel or not EXCEL_SUPPORT:
            # 簡易版（プレースホルダーのみ）
            return self._create_excel_placeholder(xlsx_file, output_file)

        # pandas/openpyxlを使用した変換
        return self._convert_excel_with_pandas(xlsx_file, output_file)

    def _create_excel_placeholder(self, xlsx_file: Path, output_file: Path) -> bool:
        """Excelファイルのプレースホルダーを作成"""
        try:
            print(f"情報抽出中: {xlsx_file}")

            content = f"""# {xlsx_file.stem}

**元ファイル**: `{xlsx_file}`
**変換日時**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 注意

このファイルはExcelファイル (`{xlsx_file}`) から自動生成されました。

Excelの表データを正確にMarkdownに変換するには、以下の方法を推奨します:

1. **Pythonスクリプトでの変換**:
   ```bash
   # pandas と openpyxl をインストール
   pip install pandas openpyxl

   # --excel オプションで実行
   python batch_convert_legacy.py --excel
   ```

2. **手動での変換**:
   - Excelファイルを開く
   - 表をコピーして [Tables Generator](https://www.tablesgenerator.com/markdown_tables) などのツールでMarkdown形式に変換

## TODO

- [ ] 手動でExcelの内容をMarkdown形式の表に変換
- [ ] 仕様内容を確認・整理
- [ ] 不要な情報を削除

"""

            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"{Colors.YELLOW}⚠️{Colors.NC}  情報抽出完了（手動での変換が必要）: {output_file}")
            self.log(f"⚠️  要確認: {xlsx_file} → {output_file}（手動変換が必要）")
            return True

        except Exception as e:
            print(f"{Colors.RED}❌{Colors.NC} 情報抽出失敗: {xlsx_file}")
            print(f"   エラー: {e}")
            self.log(f"❌ 失敗: {xlsx_file} - {e}")
            return False

    def _convert_excel_with_pandas(self, xlsx_file: Path, output_file: Path) -> bool:
        """pandasを使用してExcelをMarkdownに変換"""
        try:
            print(f"変換中: {xlsx_file}")

            # Excelファイルを読み込む
            excel_file = pd.ExcelFile(xlsx_file, engine='openpyxl')

            content = f"""# {xlsx_file.stem}

**元ファイル**: `{xlsx_file}`
**変換日時**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**シート数**: {len(excel_file.sheet_names)}

---

"""

            # 各シートを変換
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)

                content += f"""## {sheet_name}

{df.to_markdown(index=False)}

---

"""

            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"{Colors.GREEN}✓{Colors.NC} 変換成功: {output_file}")
            self.log(f"✓ 成功: {xlsx_file} → {output_file}")
            return True

        except Exception as e:
            print(f"{Colors.RED}❌{Colors.NC} 変換失敗: {xlsx_file}")
            print(f"   エラー: {e}")
            self.log(f"❌ 失敗: {xlsx_file} - {e}")
            return False

    def run(self):
        """変換を実行"""
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}Word/Excel一括変換スクリプト{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print()
        print(f"入力ディレクトリ: {self.input_dir}")
        print(f"出力ディレクトリ: {self.output_dir}")
        print(f"ログファイル: {self.log_file}")
        if self.dry_run:
            print(f"{Colors.YELLOW}モード: ドライラン（実際には変換しません）{Colors.NC}")
        if self.convert_excel:
            if EXCEL_SUPPORT:
                print(f"{Colors.GREEN}Excel変換: 有効（pandas/openpyxl使用）{Colors.NC}")
            else:
                print(f"{Colors.YELLOW}Excel変換: プレースホルダーのみ（pandas/openpyxl未インストール）{Colors.NC}")
        print()

        # ログファイルの初期化
        self.initialize_log()

        # Wordファイルの変換
        print(f"{Colors.BLUE}[1/2]{Colors.NC} Wordファイルを検索中...")
        docx_files = list(self.input_dir.rglob('*.docx'))

        for docx_file in docx_files:
            self.total_files += 1
            if self.convert_docx_to_md(docx_file):
                self.converted_files += 1
            else:
                self.failed_files += 1

        # Excelファイルの変換
        print()
        print(f"{Colors.BLUE}[2/2]{Colors.NC} Excelファイルを検索中...")
        xlsx_files = list(self.input_dir.rglob('*.xlsx'))

        for xlsx_file in xlsx_files:
            # 一時ファイル（~$で始まる）はスキップ
            if xlsx_file.name.startswith('~$'):
                continue

            self.total_files += 1
            if self.convert_xlsx_to_md(xlsx_file):
                self.converted_files += 1
            else:
                self.failed_files += 1

        # サマリー
        print()
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}変換結果サマリー{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"合計ファイル数: {self.total_files}")
        print(f"変換成功: {self.converted_files}")
        print(f"変換失敗: {self.failed_files}")

        if not self.dry_run:
            print()
            print(f"ログファイル: {self.log_file}")

            # ログにサマリーを追加
            self.log(f"""
{'='*60}

変換結果サマリー:
- 合計ファイル数: {self.total_files}
- 変換成功: {self.converted_files}
- 変換失敗: {self.failed_files}

完了日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

        if self.failed_files > 0:
            print()
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  一部のファイルの変換に失敗しました")
            print(f"詳細はログファイルを確認してください: {self.log_file}")
            return 1
        else:
            print()
            print(f"{Colors.GREEN}✅ すべてのファイルの変換が完了しました！{Colors.NC}")
            return 0


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='Word/Excelファイルを一括でMarkdownに変換します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s
  %(prog)s --input legacy-docs --output docs/spec
  %(prog)s --excel --dry-run
        """
    )

    parser.add_argument(
        '--input',
        default='.',
        help='入力ディレクトリ (デフォルト: .)'
    )

    parser.add_argument(
        '--output',
        default='converted',
        help='出力ディレクトリ (デフォルト: converted)'
    )

    parser.add_argument(
        '--log-file',
        default=f"conversion-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log",
        help='ログファイル名'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='ドライランモード（変換せず確認のみ）'
    )

    parser.add_argument(
        '--excel',
        action='store_true',
        help='Excelファイルも完全に変換（pandas/openpyxl必要）'
    )

    args = parser.parse_args()

    # Windows環境では色を無効化
    if os.name == 'nt':
        Colors.disable_on_windows()

    # 変換を実行
    converter = BatchConverter(
        input_dir=args.input,
        output_dir=args.output,
        log_file=args.log_file,
        dry_run=args.dry_run,
        convert_excel=args.excel
    )

    exit_code = converter.run()
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
```

**インストール方法**:
```bash
# 1. 必要なライブラリをインストール
pip install pypandoc

# Excel変換を使用する場合（オプション）
pip install pandas openpyxl tabulate

# 2. スクリプトを保存
# 上記のスクリプト本体を batch_convert_legacy.py として保存

# 3. 実行
python batch_convert_legacy.py

# Excel変換も実行する場合
python batch_convert_legacy.py --excel
```

**Windows PowerShell での使用例**:
```powershell
# 仮想環境を作成（推奨）
python -m venv venv
.\venv\Scripts\Activate.ps1

# ライブラリをインストール
pip install pypandoc pandas openpyxl tabulate

# 変換実行
python batch_convert_legacy.py --input "C:\Documents\Legacy" --output "C:\Documents\Spec" --excel
```

### 10.2 変換後の検証スクリプト

**追加箇所**: 10.7.4節「変換後の確認と調整「構造の回復」」の後

**目的**: Markdownファイルの構造検証

**このスクリプトの概要**: 
変換後のMarkdownファイルの構造を検証します。見出し階層の一貫性、表の構造、コードブロックの閉じ忘れ、リンクの形式などをチェックします。変換ミスを早期に発見できます。

**依存関係**: 
- Python 3.7以上
- 標準ライブラリのみ（追加インストール不要）

**実行環境**:
- Python: Python 3.7以上

#### 10.2.1 Markdown構造検証スクリプト

**ファイル名**: `validate_markdown.py`

**説明**: 変換後のMarkdownファイルの品質を検証するPythonスクリプト。見出し階層、表の構造、リンク、コードブロックなどをチェックします。

**主な機能**:
- Markdown構文の検証
- 見出し階層（H1-H6）の一貫性チェック
- 表の構造確認（列数の一貫性など）
- リンクの形式チェック
- コードブロックの閉じ忘れ検出
- 空行の適切な使用チェック
- 詳細なレポート出力

**使用方法**:
```bash
# 基本的な使い方（カレントディレクトリのすべてのMarkdownファイルを検証）
python validate_markdown.py

# ディレクトリを指定
python validate_markdown.py --dir converted

# 特定のファイルのみ検証
python validate_markdown.py --file docs/spec/example.md

# 詳細モード
python validate_markdown.py --verbose

# レポートファイルを出力
python validate_markdown.py --output validation-report.txt
```

**スクリプト本体**:
```python
#!/usr/bin/env python3
"""
Markdown構造検証スクリプト

機能:
1. Markdown構文の検証
2. 見出し階層の一貫性チェック
3. 表の構造確認
4. リンクの形式チェック
5. コードブロックの閉じ忘れ検出

使用例:
    python validate_markdown.py
    python validate_markdown.py --dir converted
    python validate_markdown.py --file example.md --verbose
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from collections import defaultdict


class Colors:
    """ANSIカラーコード"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

    @classmethod
    def disable_on_windows(cls):
        """Windowsで色を無効化"""
        if os.name == 'nt' and not os.environ.get('ANSICON'):
            cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ''


class MarkdownValidator:
    """Markdown検証クラス"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.total_files = 0
        self.valid_files = 0
        self.warning_files = 0
        self.error_files = 0
        self.issues = []

    def validate_file(self, file_path: Path) -> Tuple[bool, List[Dict]]:
        """Markdownファイルを検証"""
        issues = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

            # 各種チェックを実行
            issues.extend(self._check_heading_hierarchy(lines, file_path))
            issues.extend(self._check_table_structure(lines, file_path))
            issues.extend(self._check_code_blocks(lines, file_path))
            issues.extend(self._check_links(lines, file_path))
            issues.extend(self._check_empty_lines(lines, file_path))

            # 重大度の判定
            has_error = any(issue['severity'] == 'error' for issue in issues)
            has_warning = any(issue['severity'] == 'warning' for issue in issues)

            return (not has_error, issues)

        except Exception as e:
            issues.append({
                'severity': 'error',
                'message': f'ファイルの読み込みエラー: {e}',
                'line': 0
            })
            return (False, issues)

    def _check_heading_hierarchy(self, lines: List[str], file_path: Path) -> List[Dict]:
        """見出し階層をチェック"""
        issues = []
        prev_level = 0

        for i, line in enumerate(lines, 1):
            # 見出しのマッチング
            heading_match = re.match(r'^(#{1,6})\s+(.+)', line)
            if heading_match:
                level = len(heading_match.group(1))

                # 見出しレベルの飛ばしをチェック（H1→H3など）
                if prev_level > 0 and level > prev_level + 1:
                    issues.append({
                        'severity': 'warning',
                        'message': f'見出しレベルが飛んでいます (H{prev_level} → H{level}): {line.strip()}',
                        'line': i,
                        'file': file_path
                    })

                prev_level = level

        return issues

    def _check_table_structure(self, lines: List[str], file_path: Path) -> List[Dict]:
        """表の構造をチェック"""
        issues = []
        in_table = False
        table_start = 0
        column_count = 0

        for i, line in enumerate(lines, 1):
            # 表の区切り行を検出
            if re.match(r'^\|[\s\-:|]+\|$', line):
                in_table = True
                table_start = i
                # 列数をカウント
                column_count = line.count('|') - 1
                continue

            # 表の行をチェック
            if in_table and line.startswith('|'):
                current_columns = line.count('|') - 1
                if current_columns != column_count:
                    issues.append({
                        'severity': 'error',
                        'message': f'表の列数が一致しません（期待: {column_count}列、実際: {current_columns}列）',
                        'line': i,
                        'file': file_path
                    })

            # 表の終了を検出
            if in_table and not line.startswith('|') and line.strip():
                in_table = False

        return issues

    def _check_code_blocks(self, lines: List[str], file_path: Path) -> List[Dict]:
        """コードブロックの閉じ忘れをチェック"""
        issues = []
        in_code_block = False
        code_block_start = 0

        for i, line in enumerate(lines, 1):
            if line.strip().startswith('```'):
                if in_code_block:
                    # コードブロック終了
                    in_code_block = False
                else:
                    # コードブロック開始
                    in_code_block = True
                    code_block_start = i

        # ファイル末尾でコードブロックが閉じられていない
        if in_code_block:
            issues.append({
                'severity': 'error',
                'message': f'コードブロックが閉じられていません（開始: {code_block_start}行目）',
                'line': code_block_start,
                'file': file_path
            })

        return issues

    def _check_links(self, lines: List[str], file_path: Path) -> List[Dict]:
        """リンクの形式をチェック"""
        issues = []

        for i, line in enumerate(lines, 1):
            # Markdownリンクのパターン
            link_pattern = r'\[([^\]]+)\]\(([^\)]+)\)'
            matches = re.finditer(link_pattern, line)

            for match in matches:
                link_text = match.group(1)
                link_url = match.group(2)

                # 空のリンクテキスト
                if not link_text.strip():
                    issues.append({
                        'severity': 'warning',
                        'message': f'空のリンクテキストが見つかりました: [{link_text}]({link_url})',
                        'line': i,
                        'file': file_path
                    })

                # 空のURL
                if not link_url.strip():
                    issues.append({
                        'severity': 'error',
                        'message': f'空のURLが見つかりました: [{link_text}]({link_url})',
                        'line': i,
                        'file': file_path
                    })

        return issues

    def _check_empty_lines(self, lines: List[str], file_path: Path) -> List[Dict]:
        """空行の適切な使用をチェック"""
        issues = []
        consecutive_empty = 0

        for i, line in enumerate(lines, 1):
            if not line.strip():
                consecutive_empty += 1

                # 3行以上連続した空行
                if consecutive_empty >= 3:
                    issues.append({
                        'severity': 'info',
                        'message': f'{consecutive_empty}行連続した空行があります',
                        'line': i,
                        'file': file_path
                    })
            else:
                consecutive_empty = 0

        return issues

    def validate_directory(self, dir_path: Path) -> Dict:
        """ディレクトリ内のすべてのMarkdownファイルを検証"""
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}Markdown構造検証{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print()
        print(f"検証ディレクトリ: {dir_path}")
        print()

        markdown_files = list(dir_path.rglob('*.md'))

        if not markdown_files:
            print(f"{Colors.YELLOW}⚠️  Markdownファイルが見つかりませんでした{Colors.NC}")
            return {}

        print(f"検証対象ファイル数: {len(markdown_files)}")
        print()

        results = {}

        for md_file in markdown_files:
            self.total_files += 1
            is_valid, issues = self.validate_file(md_file)

            results[md_file] = {
                'is_valid': is_valid,
                'issues': issues
            }

            # 結果の集計
            if not issues:
                self.valid_files += 1
                if self.verbose:
                    print(f"{Colors.GREEN}✓{Colors.NC} {md_file}")
            elif is_valid:
                self.warning_files += 1
                print(f"{Colors.YELLOW}⚠️{Colors.NC}  {md_file}")
                self._print_issues(issues)
            else:
                self.error_files += 1
                print(f"{Colors.RED}❌{Colors.NC} {md_file}")
                self._print_issues(issues)

        return results

    def _print_issues(self, issues: List[Dict]):
        """問題を出力"""
        for issue in issues:
            severity_color = {
                'error': Colors.RED,
                'warning': Colors.YELLOW,
                'info': Colors.BLUE
            }.get(issue['severity'], Colors.NC)

            severity_label = {
                'error': 'エラー',
                'warning': '警告',
                'info': '情報'
            }.get(issue['severity'], '不明')

            print(f"   {severity_color}[{severity_label}]{Colors.NC} "
                  f"行{issue['line']}: {issue['message']}")

    def print_summary(self):
        """サマリーを出力"""
        print()
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}検証結果サマリー{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"合計ファイル数: {self.total_files}")
        print(f"{Colors.GREEN}問題なし: {self.valid_files}{Colors.NC}")
        print(f"{Colors.YELLOW}警告あり: {self.warning_files}{Colors.NC}")
        print(f"{Colors.RED}エラーあり: {self.error_files}{Colors.NC}")
        print()

        if self.error_files > 0:
            print(f"{Colors.RED}❌ エラーがあるファイルが見つかりました{Colors.NC}")
            return 1
        elif self.warning_files > 0:
            print(f"{Colors.YELLOW}⚠️  警告があるファイルが見つかりました{Colors.NC}")
            return 0
        else:
            print(f"{Colors.GREEN}✅ すべてのファイルが検証に合格しました{Colors.NC}")
            return 0


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='Markdownファイルの構造を検証します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s
  %(prog)s --dir converted
  %(prog)s --file example.md --verbose
        """
    )

    parser.add_argument(
        '--dir',
        default='.',
        help='検証するディレクトリ (デフォルト: .)'
    )

    parser.add_argument(
        '--file',
        help='検証する特定のファイル'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='詳細な出力'
    )

    parser.add_argument(
        '--output', '-o',
        help='レポートファイルの出力先'
    )

    args = parser.parse_args()

    # Windows環境では色を無効化
    if os.name == 'nt':
        Colors.disable_on_windows()

    # 検証を実行
    validator = MarkdownValidator(verbose=args.verbose)

    if args.file:
        # 単一ファイルの検証
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"{Colors.RED}❌ ファイルが見つかりません: {file_path}{Colors.NC}")
            sys.exit(1)

        validator.total_files = 1
        is_valid, issues = validator.validate_file(file_path)

        if not issues:
            validator.valid_files = 1
            print(f"{Colors.GREEN}✓{Colors.NC} {file_path}")
        elif is_valid:
            validator.warning_files = 1
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  {file_path}")
            validator._print_issues(issues)
        else:
            validator.error_files = 1
            print(f"{Colors.RED}❌{Colors.NC} {file_path}")
            validator._print_issues(issues)

        validator.print_summary()
        exit_code = validator.print_summary()
    else:
        # ディレクトリの検証
        dir_path = Path(args.dir)
        if not dir_path.exists():
            print(f"{Colors.RED}❌ ディレクトリが見つかりません: {dir_path}{Colors.NC}")
            sys.exit(1)

        validator.validate_directory(dir_path)
        exit_code = validator.print_summary()

    sys.exit(exit_code)


if __name__ == '__main__':
    main()
```

**インストール方法**:
```bash
# 1. スクリプトを保存
# 上記のスクリプト本体を validate_markdown.py として保存

# 2. 実行
python validate_markdown.py --dir converted

# 3. 特定のファイルを検証
python validate_markdown.py --file docs/spec/example.md --verbose
```

**チェック項目**:

1. **見出し階層の一貫性**
   - H1 → H3 のような飛ばしを検出
   - 適切な階層構造を推奨

2. **表の構造**
   - 各行の列数が一致しているかチェック
   - 表の区切り行の形式を検証

3. **コードブロック**
   - 開始した ``` が正しく閉じられているかチェック
   - 未閉じのコードブロックを検出

4. **リンク**
   - 空のリンクテキストやURLを検出
   - リンク形式の妥当性を確認

5. **空行**
   - 3行以上連続した空行を検出（情報レベル）

**出力例**:
```
============================================================
Markdown構造検証
============================================================

検証ディレクトリ: converted
検証対象ファイル数: 15

✓ converted/spec1.md
⚠️  converted/spec2.md
   [警告] 行42: 見出しレベルが飛んでいます (H1 → H3): ### セクション
❌ converted/spec3.md
   [エラー] 行105: 表の列数が一致しません（期待: 3列、実際: 2列）
   [エラー] 行150: コードブロックが閉じられていません（開始: 150行目）

============================================================
検証結果サマリー
============================================================
合計ファイル数: 15
問題なし: 10
警告あり: 3
エラーあり: 2

❌ エラーがあるファイルが見つかりました
```

**トラブルシューティング**:
- エラーが多数検出される場合、元のWord/Excelファイルの構造を見直す
- 表の列数エラーは、結合セルが原因の可能性があります
- コードブロックの閉じ忘れは、手動で ``` を追加して修正

---

## 第12章：組織全体導入のガバナンス設計

### 12.1 CODEOWNERSファイルの詳細な設定例

**追加箇所**: 12.7節「権限設計・変更履歴・承認フローの最適化」の後

**目的**: 規模別のCODEOWNERS設定例と階層的な承認フローの実装

**このスクリプトの概要**: 
GitHubのCODEOWNERS機能を使用して、ファイルやディレクトリごとに責任者（レビュアー）を自動的に割り当てます。規模別（小規模・中規模・大規模）の3種類の設定例を提供します。Pull Request作成時に、変更されたファイルに応じて適切なレビュアーが自動的に割り当てられます。

**実行環境**:
- GitHubリポジトリ
- ファイルを配置するだけ（スクリプト実行不要）

**依存関係**: なし（GitHub標準機能）

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

**ファイルパス**: `.github/CODEOWNERS`

#### 12.1.1 小規模チーム向けCODEOWNERS

**説明**: シンプルな構成で、仕様ファイルとコードのレビュー責任を明確にします。

**ファイルパス**: `.github/CODEOWNERS`

```
# CODEOWNERS - 小規模チーム向け設定例
#
# このファイルは、Pull Requestの自動レビュアー割り当てと
# 承認フローを定義します。

# デフォルト: すべてのファイルはチームメンバー全員がレビュー
*       @team-members

# 仕様ファイル: 全員でレビュー（重要）
docs/spec/      @team-members

# README: 全員でレビュー
README.md       @team-members

# CI/CD設定: リードエンジニアが承認
.github/        @lead-engineer

# 環境設定ファイル: リードエンジニアが承認
.env.example    @lead-engineer
docker-compose.yml  @lead-engineer
```

**使い方**:
1. `@team-members`を実際のGitHub teamまたはユーザー名に置き換える
2. `@lead-engineer`をリードエンジニアのGitHub usernameに置き換える
3. プロジェクトの構成に合わせてパスを調整

#### 12.1.2 中規模プロジェクト向けCODEOWNERS

**説明**: 機能領域ごとにオーナーを分け、仕様には必ず複数人のレビューを要求します。

**ファイルパス**: `.github/CODEOWNERS`

```
# CODEOWNERS - 中規模プロジェクト向け設定例
#
# 機能領域ごとにオーナーを分け、仕様には複数人のレビューを要求

# デフォルト: エンジニアチーム
*       @engineering-team

# 仕様ファイル: PM + エンジニアリードの両方が必須
docs/spec/      @product-manager @engineering-lead

# README & ドキュメント: PMが承認
README.md       @product-manager
docs/           @product-manager

# フロントエンド: フロントエンドチーム
src/components/ @frontend-team
src/pages/      @frontend-team
src/styles/     @frontend-team

# バックエンド: バックエンドチーム
src/api/        @backend-team
src/models/     @backend-team
src/services/   @backend-team

# データベース: バックエンドリード + DBA
src/migrations/ @backend-lead @dba-team
schema/         @backend-lead @dba-team

# テスト: 各担当チーム
tests/frontend/ @frontend-team
tests/backend/  @backend-team
tests/e2e/      @qa-team

# CI/CD & インフラ: DevOpsチーム
.github/workflows/  @devops-team
docker/             @devops-team
kubernetes/         @devops-team

# セキュリティ関連: セキュリティチームが必須
.github/workflows/security.yml  @security-team
docs/spec/security/ @security-team @engineering-lead

# 環境設定: DevOpsリード
.env.example    @devops-lead
config/         @devops-lead
```

**使い方**:
1. `@{team-name}`を実際のGitHub Organizationのteam名に置き換える
2. プロジェクトのディレクトリ構造に合わせてパスを調整
3. GitHub Organizationの設定で各チームを作成
4. Branch protection rulesで「Required approvals」を設定（推奨: 2人以上）

#### 12.1.3 大規模組織向けCODEOWNERS

**説明**: 階層的な承認フローと監査証跡を実現。仕様変更は複数段階の承認が必要です。

**ファイルパス**: `.github/CODEOWNERS`

```
# CODEOWNERS - 大規模組織向け設定例
#
# 階層的な承認フローと監査証跡を実現
# 仕様変更は: PM → テックリード → セキュリティ → 部門長の順で承認

# デフォルト: エンジニアリング部門
*       @engineering-department

# === 仕様ファイル（最重要：複数段階の承認） ===
# すべての仕様変更は以下の全員の承認が必要
docs/spec/      @product-managers @tech-leads @security-team

# セキュリティ・コンプライアンス仕様: 追加で法務部門も必須
docs/spec/security/     @product-managers @tech-leads @security-team @legal-team
docs/spec/compliance/   @product-managers @tech-leads @security-team @legal-team

# 個人情報関連の仕様: 個人情報保護担当者も必須
docs/spec/privacy/      @product-managers @tech-leads @security-team @legal-team @privacy-officer

# === ドキュメント ===
README.md               @product-managers
docs/architecture/      @tech-leads
docs/api/              @api-team @tech-leads

# === コード（機能領域別） ===
# 認証・認可: セキュリティチームの承認が必須
src/auth/               @auth-team @security-team
src/middleware/auth/    @auth-team @security-team

# 決済処理: バックエンドチーム + セキュリティ + 法務
src/payment/            @payment-team @security-team @legal-team
src/billing/            @payment-team @security-team @legal-team

# ユーザーデータ: バックエンドチーム + セキュリティ + プライバシー担当
src/user/               @user-team @security-team @privacy-officer
src/profile/            @user-team @security-team @privacy-officer

# フロントエンド
src/components/         @frontend-team
src/pages/              @frontend-team
src/styles/             @design-team @frontend-team

# API
src/api/v1/             @api-team-v1
src/api/v2/             @api-team-v2

# バックエンドサービス
src/services/           @backend-team
src/models/             @backend-team

# === データベース（厳格な管理） ===
# すべてのマイグレーションはDBA + セキュリティチームの承認が必須
src/migrations/         @dba-team @security-team
schema/                 @dba-team @security-team

# === テスト ===
tests/unit/             @engineering-department
tests/integration/      @qa-team
tests/e2e/              @qa-team
tests/security/         @security-team
tests/performance/      @performance-team

# === CI/CD & インフラ ===
.github/workflows/      @devops-team @security-team
.github/CODEOWNERS      @tech-leads @security-team

# Kubernetes設定: DevOps + セキュリティ
kubernetes/             @devops-team @security-team
helm/                   @devops-team @security-team

# Terraform: インフラチーム + セキュリティ
terraform/              @infrastructure-team @security-team

# === セキュリティ関連（最重要） ===
# セキュリティ設定は複数の承認が必須
.github/workflows/security.yml      @security-team @tech-leads @ciso
security/                          @security-team @tech-leads
.github/dependabot.yml             @security-team @devops-team

# === 設定ファイル ===
.env.example            @devops-lead @security-team
config/production/      @devops-lead @security-team @tech-leads
config/staging/         @devops-lead @security-team

# === 稟議書・レポート ===
reports/ringi-*.md      @product-managers @tech-leads @department-head
reports/audit/          @audit-team @legal-team

# === パッケージ依存関係 ===
# セキュリティ脆弱性の観点からセキュリティチームも確認
package.json            @frontend-team @security-team
requirements.txt        @backend-team @security-team
go.mod                  @backend-team @security-team
Gemfile                 @backend-team @security-team
```

**使い方**:
1. GitHub Organizationで各チームを作成
2. Branch protection rulesで以下を設定:
   - Required approvals: 最低3人（仕様ファイルは5人推奨）
   - Require review from Code Owners: ON
   - Dismiss stale reviews: ON
   - Require approval of the most recent push: ON
3. 監査証跡として、GitHub Auditログを有効化
4. 定期的にCODEOWNERSファイル自体をレビュー（四半期ごと推奨）

**階層的承認フローの実現**:
```
1. コード変更のPRを作成
   ↓
2. 該当チームのレビュー（@backend-team など）
   ↓
3. セキュリティチームのレビュー（該当する場合）
   ↓
4. テックリードの承認
   ↓
5. PM/法務の承認（仕様変更の場合）
   ↓
6. マージ可能
```

**補足**:
- `@ciso`: Chief Information Security Officer（情報セキュリティ責任者）
- `@privacy-officer`: 個人情報保護担当者
- `@department-head`: 部門長
- 組織の構造に合わせてカスタマイズしてください

### 12.2 Git hooksの実装例

**追加箇所**: 12.6.1節「変更の追跡と分類」の後

**目的**: Conventional Commitsの強制、仕様ファイル変更の検出、自動チェック

**このスクリプトの概要**: 
Git hooksを使用して、コミット前・コミット時に自動チェックを実行します。Conventional Commits形式の強制、仕様ファイル変更の検出、シークレット情報の検出などを行います。Bash版とPython版の両方を提供し、Windows環境でも動作します。

**実行環境**:
- Bash: macOS / Linux / Windows WSL
- Python: Python 3.7以上

**依存関係**: 
- Bash版: 標準コマンドのみ（追加インストール不要）
- Python版: 標準ライブラリのみ（追加インストール不要）

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

#### 12.2.1 commit-msgフック（Conventional Commits強制）- Bash版

**ファイルパス**: `.git/hooks/commit-msg`

**説明**: コミットメッセージがConventional Commitsの形式に従っているかをチェックします。

**インストール方法**:
```bash
# 1. このスクリプトを .git/hooks/commit-msg として保存
# 2. 実行権限を付与
chmod +x .git/hooks/commit-msg
```

```bash
#!/bin/bash
#
# commit-msg hook - Conventional Commits形式を強制
#
# 許可される形式:
# - feat: 新機能
# - fix: バグ修正
# - docs: ドキュメントのみの変更
# - style: コードの動作に影響しない変更（フォーマット等）
# - refactor: リファクタリング
# - test: テストの追加・修正
# - chore: ビルドプロセスやツールの変更
#
# 例:
# - feat: ユーザー認証機能を追加
# - fix: ログイン時のエラーハンドリングを修正
# - docs: READMEにインストール手順を追加

# コミットメッセージファイルのパス
COMMIT_MSG_FILE=$1

# コミットメッセージを読み込む
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# マージコミットやrevertコミットは許可
if echo "$COMMIT_MSG" | grep -qE "^(Merge|Revert)"; then
    exit 0
fi

# Conventional Commitsの正規表現パターン
# 形式: type(scope): subject
# scope は省略可能
PATTERN="^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+\))?: .{1,}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo "❌ エラー: コミットメッセージがConventional Commits形式に従っていません"
    echo ""
    echo "正しい形式:"
    echo "  type(scope): subject"
    echo ""
    echo "許可されるtype:"
    echo "  - feat:     新機能"
    echo "  - fix:      バグ修正"
    echo "  - docs:     ドキュメント"
    echo "  - style:    コードスタイル"
    echo "  - refactor: リファクタリング"
    echo "  - perf:     パフォーマンス改善"
    echo "  - test:     テスト"
    echo "  - chore:    その他の変更"
    echo "  - build:    ビルドシステム"
    echo "  - ci:       CI/CD"
    echo ""
    echo "例:"
    echo "  feat: ユーザー認証機能を追加"
    echo "  fix(login): パスワード検証のバグを修正"
    echo "  docs: READMEを更新"
    echo ""
    echo "現在のコミットメッセージ:"
    echo "  $COMMIT_MSG"
    echo ""
    exit 1
fi

echo "✅ コミットメッセージのフォーマットが正しいです"
exit 0
```

#### 12.2.2 commit-msgフック（Conventional Commits強制）- Python版

**ファイルパス**: `.git/hooks/commit-msg`

**説明**: Windows環境でも動作するPython版。Bash版と同じ機能を提供します。

**インストール方法**:
```bash
# 1. このスクリプトを .git/hooks/commit-msg として保存
# 2. 実行権限を付与（Linux/macOS）
chmod +x .git/hooks/commit-msg

# Windows (Git Bash):
# 特に権限設定は不要
```

```python
#!/usr/bin/env python3
"""
commit-msg hook - Conventional Commits形式を強制

許可される形式:
- feat: 新機能
- fix: バグ修正
- docs: ドキュメントのみの変更
- style: コードの動作に影響しない変更
- refactor: リファクタリング
- test: テストの追加・修正
- chore: ビルドプロセスやツールの変更
"""

import sys
import re

def check_commit_message(commit_msg_file):
    """コミットメッセージをチェック"""

    # コミットメッセージを読み込む
    with open(commit_msg_file, 'r', encoding='utf-8') as f:
        commit_msg = f.read().strip()

    # マージコミットやrevertコミットは許可
    if commit_msg.startswith('Merge') or commit_msg.startswith('Revert'):
        print("✅ マージ/リバートコミットです")
        return 0

    # Conventional Commitsの正規表現パターン
    # 形式: type(scope): subject
    # scope は省略可能
    pattern = r'^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+\))?: .{1,}'

    if not re.match(pattern, commit_msg):
        print("❌ エラー: コミットメッセージがConventional Commits形式に従っていません")
        print()
        print("正しい形式:")
        print("  type(scope): subject")
        print()
        print("許可されるtype:")
        print("  - feat:     新機能")
        print("  - fix:      バグ修正")
        print("  - docs:     ドキュメント")
        print("  - style:    コードスタイル")
        print("  - refactor: リファクタリング")
        print("  - perf:     パフォーマンス改善")
        print("  - test:     テスト")
        print("  - chore:    その他の変更")
        print("  - build:    ビルドシステム")
        print("  - ci:       CI/CD")
        print()
        print("例:")
        print("  feat: ユーザー認証機能を追加")
        print("  fix(login): パスワード検証のバグを修正")
        print("  docs: READMEを更新")
        print()
        print("現在のコミットメッセージ:")
        print(f"  {commit_msg}")
        print()
        return 1

    print("✅ コミットメッセージのフォーマットが正しいです")
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Error: commit message file not provided")
        sys.exit(1)

    commit_msg_file = sys.argv[1]
    sys.exit(check_commit_message(commit_msg_file))
```

#### 12.2.3 pre-commitフック（仕様ファイル変更検出）- Bash版

**ファイルパス**: `.git/hooks/pre-commit`

**説明**: コミットに仕様ファイル（`docs/spec/`）の変更が含まれる場合、警告を表示します。

**インストール方法**:
```bash
# 1. このスクリプトを .git/hooks/pre-commit として保存
# 2. 実行権限を付与
chmod +x .git/hooks/pre-commit
```

```bash
#!/bin/bash
#
# pre-commit hook - 仕様ファイル変更検出
#
# 仕様ファイル（docs/spec/）の変更が含まれる場合、
# レビューの重要性を通知します。

# 仕様ファイルのディレクトリパス
SPEC_DIR="docs/spec"

# ステージされた仕様ファイルの変更を検出
SPEC_CHANGES=$(git diff --cached --name-only | grep "^${SPEC_DIR}/")

if [ -n "$SPEC_CHANGES" ]; then
    echo ""
    echo "⚠️  仕様ファイルの変更が検出されました:"
    echo ""
    echo "$SPEC_CHANGES" | while read file; do
        echo "  - $file"
    done
    echo ""
    echo "📋 重要な確認事項:"
    echo "  1. 仕様の変更理由（Why）を明確にコミットメッセージに記載してください"
    echo "  2. 関連するコードの変更も含まれていることを確認してください"
    echo "  3. Pull Requestでは仕様レビューが必須です"
    echo "  4. CODEOWNERSによる承認を忘れずに"
    echo ""

    # ユーザーに確認を求める
    read -p "このまま続行しますか? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ コミットを中止しました"
        exit 1
    fi
    echo "✅ コミットを続行します"
fi

# シークレット検出（簡易版）
echo "🔍 シークレット検出チェック中..."

# 検出するパターン
PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "private[_-]?key"
    "BEGIN RSA PRIVATE KEY"
    "BEGIN PRIVATE KEY"
)

FOUND_SECRET=false

for pattern in "${PATTERNS[@]}"; do
    if git diff --cached | grep -iE "$pattern" > /dev/null; then
        if [ "$FOUND_SECRET" = false ]; then
            echo ""
            echo "🚨 警告: 機密情報の可能性がある文字列が検出されました"
            echo ""
            FOUND_SECRET=true
        fi
        echo "  パターン: $pattern"
    fi
done

if [ "$FOUND_SECRET" = true ]; then
    echo ""
    echo "⚠️  以下を確認してください:"
    echo "  1. パスワード、APIキー、トークンなどが含まれていないか"
    echo "  2. 環境変数や.envファイルで管理すべきではないか"
    echo "  3. .gitignoreに追加すべきファイルがないか"
    echo ""

    read -p "機密情報が含まれていないことを確認しました。続行しますか? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ コミットを中止しました"
        exit 1
    fi
fi

echo "✅ pre-commitチェックが完了しました"
exit 0
```

#### 12.2.4 pre-commitフック（仕様ファイル変更検出）- Python版

**ファイルパス**: `.git/hooks/pre-commit`

**説明**: Windows環境でも動作するPython版。Bash版と同じ機能を提供します。

**インストール方法**:
```bash
# 1. このスクリプトを .git/hooks/pre-commit として保存
# 2. 実行権限を付与（Linux/macOS）
chmod +x .git/hooks/pre-commit

# Windows (Git Bash):
# 特に権限設定は不要
```

```python
#!/usr/bin/env python3
"""
pre-commit hook - 仕様ファイル変更検出

仕様ファイル（docs/spec/）の変更が含まれる場合、
レビューの重要性を通知します。
"""

import sys
import subprocess
import re

SPEC_DIR = "docs/spec"

def get_staged_files():
    """ステージされたファイルのリストを取得"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n') if result.stdout.strip() else []
    except subprocess.CalledProcessError:
        return []

def get_staged_diff():
    """ステージされた変更のdiffを取得"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError:
        return ""

def check_spec_changes():
    """仕様ファイルの変更をチェック"""
    staged_files = get_staged_files()
    spec_changes = [f for f in staged_files if f.startswith(SPEC_DIR + '/')]

    if spec_changes:
        print()
        print("⚠️  仕様ファイルの変更が検出されました:")
        print()
        for file in spec_changes:
            print(f"  - {file}")
        print()
        print("📋 重要な確認事項:")
        print("  1. 仕様の変更理由（Why）を明確にコミットメッセージに記載してください")
        print("  2. 関連するコードの変更も含まれていることを確認してください")
        print("  3. Pull Requestでは仕様レビューが必須です")
        print("  4. CODEOWNERSによる承認を忘れずに")
        print()

        # ユーザーに確認を求める
        response = input("このまま続行しますか? (y/n): ").strip().lower()
        if response not in ['y', 'yes']:
            print("❌ コミットを中止しました")
            return 1
        print("✅ コミットを続行します")

    return 0

def check_secrets():
    """シークレット検出チェック"""
    print("🔍 シークレット検出チェック中...")

    # 検出するパターン
    patterns = [
        r"password\s*=\s*['\"][^'\"]+['\"]",
        r"api[_-]?key\s*=\s*['\"][^'\"]+['\"]",
        r"secret\s*=\s*['\"][^'\"]+['\"]",
        r"token\s*=\s*['\"][^'\"]+['\"]",
        r"private[_-]?key",
        r"BEGIN RSA PRIVATE KEY",
        r"BEGIN PRIVATE KEY",
    ]

    diff = get_staged_diff()
    found_secret = False
    detected_patterns = []

    for pattern in patterns:
        if re.search(pattern, diff, re.IGNORECASE):
            if not found_secret:
                print()
                print("🚨 警告: 機密情報の可能性がある文字列が検出されました")
                print()
                found_secret = True
            print(f"  パターン: {pattern}")
            detected_patterns.append(pattern)

    if found_secret:
        print()
        print("⚠️  以下を確認してください:")
        print("  1. パスワード、APIキー、トークンなどが含まれていないか")
        print("  2. 環境変数や.envファイルで管理すべきではないか")
        print("  3. .gitignoreに追加すべきファイルがないか")
        print()

        response = input("機密情報が含まれていないことを確認しました。続行しますか? (y/n): ").strip().lower()
        if response not in ['y', 'yes']:
            print("❌ コミットを中止しました")
            return 1

    return 0

def main():
    """メイン処理"""
    # 仕様ファイル変更チェック
    if check_spec_changes() != 0:
        return 1

    # シークレット検出チェック
    if check_secrets() != 0:
        return 1

    print("✅ pre-commitチェックが完了しました")
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

**補足**:

1. **複数のhooksを組み合わせる場合**:
   - `commit-msg`と`pre-commit`の両方を使用できます
   - それぞれ独立して動作します

2. **チーム全体での導入**:
   - Git hooksは`.git/hooks/`に配置するため、リポジトリに含まれません
   - チーム全体で統一するには以下の方法があります:
     ```bash
     # 1. scriptsディレクトリにhooksを配置
     mkdir -p scripts/git-hooks
     cp .git/hooks/commit-msg scripts/git-hooks/
     cp .git/hooks/pre-commit scripts/git-hooks/

     # 2. セットアップスクリプトを作成
     cat > scripts/setup-hooks.sh << 'EOF'
     #!/bin/bash
     cp scripts/git-hooks/* .git/hooks/
     chmod +x .git/hooks/*
     echo "✅ Git hooksをインストールしました"
     EOF

     chmod +x scripts/setup-hooks.sh

     # 3. READMEに記載
     echo "新規参加者は scripts/setup-hooks.sh を実行してください"
     ```

3. **CI/CDとの統合**:
   - Git hooksはローカルでのチェックのみ
   - CI/CDでも同様のチェックを実施することを推奨
   - GitHub Actionsの例は次のセクション（12.4）を参照

### 12.3 仕様とコードの整合性チェックスクリプト

**追加箇所**: 12.6節「セキュリティ設計」の後

**目的**: コード内の仕様リンクの存在確認、仕様ファイルの存在確認、リンク切れの検出

**このスクリプトの概要**: 
コード内に記載された仕様ファイルへのリンクが正しく機能しているかをチェックします。仕様ファイルの存在確認、リンク切れの検出、未使用仕様ファイルの検出（オプション）を行います。CI/CDから独立して実行可能で、開発者のローカル環境でも使用できます。

**実行環境**:
- Bash: macOS / Linux / Windows WSL
- Python: Python 3.7以上
- CI/CDから独立して実行可能

**依存関係**: 
- Bash版: 標準コマンドのみ（追加インストール不要）
- Python版: 標準ライブラリのみ（追加インストール不要）

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

#### 12.3.1 Bash版（推奨）

**ファイル名**: `check-spec-code-consistency.sh`

**説明**: コード内の仕様リンクとファイルの整合性をチェックするBashスクリプト。CI/CD環境や開発者のローカル環境で実行できます。

**使用方法**:
```bash
# 基本的な使い方
./check-spec-code-consistency.sh

# 仕様ディレクトリを指定
./check-spec-code-consistency.sh --spec-dir docs/specifications

# ソースコードディレクトリを指定
./check-spec-code-consistency.sh --src-dir src --spec-dir docs/spec

# 詳細モード
./check-spec-code-consistency.sh --verbose

# CI/CDモード（エラー時に非ゼロのexit codeを返す）
./check-spec-code-consistency.sh --ci
```

**スクリプト本体**:
```bash
#!/bin/bash
#
# 仕様とコードの整合性チェックスクリプト
#
# 機能:
# 1. コード内の仕様ファイル参照を検出
# 2. 参照されている仕様ファイルの存在確認
# 3. リンク切れの検出
# 4. 参照されていない仕様ファイルの検出（オプション）
#
# 使用例:
#   ./check-spec-code-consistency.sh
#   ./check-spec-code-consistency.sh --spec-dir docs/spec --src-dir src
#   ./check-spec-code-consistency.sh --ci --verbose
#

set -e

# デフォルト設定
SPEC_DIR="docs/spec"
SRC_DIR="."
VERBOSE=0
CI_MODE=0
CHECK_UNUSED=0
EXIT_CODE=0

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    --spec-dir DIR      仕様ファイルのディレクトリ (デフォルト: docs/spec)
    --src-dir DIR       ソースコードのディレクトリ (デフォルト: .)
    --verbose, -v       詳細な出力
    --ci                CI/CDモード（エラー時に非ゼロで終了）
    --check-unused      使用されていない仕様ファイルもチェック
    --help, -h          このヘルプを表示

例:
    $0
    $0 --spec-dir docs/specifications --src-dir src
    $0 --ci --verbose
EOF
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --spec-dir)
            SPEC_DIR="$2"
            shift 2
            ;;
        --src-dir)
            SRC_DIR="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --ci)
            CI_MODE=1
            shift
            ;;
        --check-unused)
            CHECK_UNUSED=1
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "エラー: 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# ディレクトリの存在確認
if [ ! -d "$SPEC_DIR" ]; then
    echo -e "${RED}❌ エラー: 仕様ディレクトリが見つかりません: $SPEC_DIR${NC}"
    exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
    echo -e "${RED}❌ エラー: ソースディレクトリが見つかりません: $SRC_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}仕様とコードの整合性チェック${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "仕様ディレクトリ: $SPEC_DIR"
echo "ソースディレクトリ: $SRC_DIR"
echo ""

# 一時ファイル
TEMP_REFS=$(mktemp)
TEMP_MISSING=$(mktemp)
TEMP_ALL_SPECS=$(mktemp)

# クリーンアップ
cleanup() {
    rm -f "$TEMP_REFS" "$TEMP_MISSING" "$TEMP_ALL_SPECS"
}
trap cleanup EXIT

# 1. コード内の仕様ファイル参照を抽出
echo -e "${BLUE}[1/4]${NC} コード内の仕様参照を検索中..."

# 検索対象の拡張子
FILE_PATTERNS=(
    "*.ts"
    "*.tsx"
    "*.js"
    "*.jsx"
    "*.py"
    "*.java"
    "*.go"
    "*.rb"
    "*.php"
    "*.cs"
    "*.cpp"
    "*.c"
    "*.h"
)

# 仕様ファイル参照のパターン
# 例: # 仕様: docs/spec/feature.md
#     // 仕様: docs/spec/api.md
#     <!-- 仕様: docs/spec/ui.md -->
SPEC_PATTERNS=(
    "仕様:\s*([^\s]+\.md)"
    "spec:\s*([^\s]+\.md)"
    "specification:\s*([^\s]+\.md)"
    "see:\s*([^\s]+\.md)"
    "参照:\s*([^\s]+\.md)"
)

# ソースコード内から仕様参照を抽出
for pattern in "${FILE_PATTERNS[@]}"; do
    if [ "$VERBOSE" -eq 1 ]; then
        echo "  検索中: $pattern"
    fi

    find "$SRC_DIR" -type f -name "$pattern" 2>/dev/null | while read -r file; do
        for spec_pattern in "${SPEC_PATTERNS[@]}"; do
            grep -oP "$spec_pattern" "$file" 2>/dev/null | \
                sed -E "s/.*(docs\/spec\/[^\s]+\.md).*/\1/" >> "$TEMP_REFS" || true
        done
    done
done

# 重複を削除
sort -u "$TEMP_REFS" -o "$TEMP_REFS"

TOTAL_REFS=$(wc -l < "$TEMP_REFS")
echo -e "${GREEN}✓${NC} ${TOTAL_REFS}個の仕様参照を検出"
echo ""

# 2. 参照されている仕様ファイルの存在確認
echo -e "${BLUE}[2/4]${NC} 仕様ファイルの存在確認中..."

MISSING_COUNT=0
while IFS= read -r spec_file; do
    if [ -z "$spec_file" ]; then
        continue
    fi

    if [ ! -f "$spec_file" ]; then
        echo -e "${RED}❌${NC} 見つかりません: $spec_file"
        echo "$spec_file" >> "$TEMP_MISSING"
        MISSING_COUNT=$((MISSING_COUNT + 1))
        EXIT_CODE=1
    elif [ "$VERBOSE" -eq 1 ]; then
        echo -e "${GREEN}✓${NC} OK: $spec_file"
    fi
done < "$TEMP_REFS"

if [ "$MISSING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} すべての仕様ファイルが存在します"
else
    echo -e "${YELLOW}⚠️${NC}  ${MISSING_COUNT}個の仕様ファイルが見つかりません"
fi
echo ""

# 3. 仕様ファイル内のリンク切れチェック
echo -e "${BLUE}[3/4]${NC} 仕様ファイル内のリンク切れをチェック中..."

BROKEN_LINKS=0
find "$SPEC_DIR" -type f -name "*.md" 2>/dev/null | while read -r spec_file; do
    # Markdownリンクを抽出: [テキスト](相対パス)
    grep -oP '\[([^\]]+)\]\(([^)]+)\)' "$spec_file" 2>/dev/null | \
        sed -E 's/\[([^\]]+)\]\(([^)]+)\)/\2/' | while read -r link; do

        # URLは除外（http:// または https:// で始まるもの）
        if [[ "$link" =~ ^https?:// ]]; then
            continue
        fi

        # アンカーリンク（#で始まる）は除外
        if [[ "$link" =~ ^# ]]; then
            continue
        fi

        # 相対パスを解決
        spec_dir=$(dirname "$spec_file")
        linked_file="$spec_dir/$link"

        # ファイルの存在確認
        if [ ! -f "$linked_file" ]; then
            echo -e "${RED}❌${NC} リンク切れ: $spec_file"
            echo "   → 存在しないファイル: $link"
            BROKEN_LINKS=$((BROKEN_LINKS + 1))
            EXIT_CODE=1
        elif [ "$VERBOSE" -eq 1 ]; then
            echo -e "${GREEN}✓${NC} OK: $spec_file → $link"
        fi
    done
done

if [ "$BROKEN_LINKS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} リンク切れはありません"
else
    echo -e "${YELLOW}⚠️${NC}  ${BROKEN_LINKS}個のリンク切れを検出"
fi
echo ""

# 4. 使用されていない仕様ファイルの検出（オプション）
if [ "$CHECK_UNUSED" -eq 1 ]; then
    echo -e "${BLUE}[4/4]${NC} 未使用の仕様ファイルをチェック中..."

    # すべての仕様ファイルをリストアップ
    find "$SPEC_DIR" -type f -name "*.md" > "$TEMP_ALL_SPECS"

    UNUSED_COUNT=0
    while IFS= read -r spec_file; do
        # TEMP_REFSに含まれているかチェック
        if ! grep -q "$spec_file" "$TEMP_REFS" 2>/dev/null; then
            echo -e "${YELLOW}⚠️${NC}  未使用: $spec_file"
            UNUSED_COUNT=$((UNUSED_COUNT + 1))
        fi
    done < "$TEMP_ALL_SPECS"

    if [ "$UNUSED_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} すべての仕様ファイルが参照されています"
    else
        echo -e "${YELLOW}⚠️${NC}  ${UNUSED_COUNT}個の未使用仕様ファイルを検出"
        echo "   （これは警告であり、エラーではありません）"
    fi
    echo ""
else
    echo -e "${BLUE}[4/4]${NC} 未使用ファイルチェックはスキップ（--check-unused で有効化）"
    echo ""
fi

# サマリー
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}チェック結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "検出した仕様参照: ${TOTAL_REFS}個"
echo "見つからない仕様ファイル: ${MISSING_COUNT}個"
echo "リンク切れ: ${BROKEN_LINKS}個"

if [ "$EXIT_CODE" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ すべてのチェックに合格しました！${NC}"
else
    echo ""
    echo -e "${RED}❌ エラーが見つかりました${NC}"

    if [ "$CI_MODE" -eq 1 ]; then
        echo ""
        echo "CI/CDモードで実行しているため、非ゼロのexit codeで終了します"
    fi
fi

exit $EXIT_CODE
```

**インストール方法**:
```bash
# 1. スクリプトを保存
curl -o check-spec-code-consistency.sh [URL]

# または直接作成
cat > check-spec-code-consistency.sh << 'EOF'
# 上記のスクリプト本体をペースト
EOF

# 2. 実行権限を付与
chmod +x check-spec-code-consistency.sh

# 3. プロジェクトルートで実行
./check-spec-code-consistency.sh
```

**CI/CDへの統合**:
```yaml
# .github/workflows/spec-check.yml
name: Spec-Code Consistency Check

on: [push, pull_request]

jobs:
  check-consistency:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run spec-code consistency check
        run: |
          chmod +x check-spec-code-consistency.sh
          ./check-spec-code-consistency.sh --ci --verbose
```

#### 12.3.2 Python版（Windows対応）

**ファイル名**: `check_spec_code_consistency.py`

**説明**: Windows環境でも動作するPython版。Bash版と同じ機能を提供します。

**使用方法**:
```bash
# 基本的な使い方
python check_spec_code_consistency.py

# 仕様ディレクトリを指定
python check_spec_code_consistency.py --spec-dir docs/specifications

# ソースコードディレクトリを指定
python check_spec_code_consistency.py --src-dir src --spec-dir docs/spec

# 詳細モード
python check_spec_code_consistency.py --verbose

# CI/CDモード（エラー時に非ゼロのexit codeを返す）
python check_spec_code_consistency.py --ci

# 未使用ファイルもチェック
python check_spec_code_consistency.py --check-unused
```

**スクリプト本体**:
```python
#!/usr/bin/env python3
"""
仕様とコードの整合性チェックスクリプト

機能:
1. コード内の仕様ファイル参照を検出
2. 参照されている仕様ファイルの存在確認
3. リンク切れの検出
4. 参照されていない仕様ファイルの検出（オプション）

使用例:
    python check_spec_code_consistency.py
    python check_spec_code_consistency.py --spec-dir docs/spec --src-dir src
    python check_spec_code_consistency.py --ci --verbose
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Set, List, Tuple


class Colors:
    """ANSIカラーコード（Windows対応）"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

    @classmethod
    def disable_on_windows(cls):
        """Windowsで色を無効化（コマンドプロンプト対応）"""
        if os.name == 'nt' and not os.environ.get('ANSICON'):
            cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ''


class SpecCodeChecker:
    """仕様とコードの整合性をチェックするクラス"""

    # 検索対象のファイル拡張子
    FILE_EXTENSIONS = [
        '.ts', '.tsx', '.js', '.jsx',
        '.py', '.java', '.go', '.rb',
        '.php', '.cs', '.cpp', '.c', '.h'
    ]

    # 仕様ファイル参照のパターン
    # 例: # 仕様: docs/spec/feature.md
    #     // 仕様: docs/spec/api.md
    #     <!-- 仕様: docs/spec/ui.md -->
    SPEC_PATTERNS = [
        r'仕様:\s*([^\s]+\.md)',
        r'spec:\s*([^\s]+\.md)',
        r'specification:\s*([^\s]+\.md)',
        r'see:\s*([^\s]+\.md)',
        r'参照:\s*([^\s]+\.md)',
    ]

    def __init__(self, spec_dir: str, src_dir: str, verbose: bool = False,
                 ci_mode: bool = False, check_unused: bool = False):
        self.spec_dir = Path(spec_dir)
        self.src_dir = Path(src_dir)
        self.verbose = verbose
        self.ci_mode = ci_mode
        self.check_unused = check_unused
        self.exit_code = 0

    def find_spec_references(self) -> Set[str]:
        """コード内の仕様ファイル参照を検出"""
        print(f"{Colors.BLUE}[1/4]{Colors.NC} コード内の仕様参照を検索中...")

        spec_refs = set()

        # ソースコードファイルを検索
        for ext in self.FILE_EXTENSIONS:
            if self.verbose:
                print(f"  検索中: *{ext}")

            for file_path in self.src_dir.rglob(f'*{ext}'):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()

                        # 各パターンで仕様参照を抽出
                        for pattern in self.SPEC_PATTERNS:
                            matches = re.finditer(pattern, content)
                            for match in matches:
                                spec_file = match.group(1)
                                spec_refs.add(spec_file)

                except Exception as e:
                    if self.verbose:
                        print(f"{Colors.YELLOW}⚠️{Colors.NC}  読み込みエラー: {file_path}: {e}")

        print(f"{Colors.GREEN}✓{Colors.NC} {len(spec_refs)}個の仕様参照を検出")
        print()

        return spec_refs

    def check_spec_files_exist(self, spec_refs: Set[str]) -> List[str]:
        """参照されている仕様ファイルの存在確認"""
        print(f"{Colors.BLUE}[2/4]{Colors.NC} 仕様ファイルの存在確認中...")

        missing_files = []

        for spec_file in sorted(spec_refs):
            # 絶対パスと相対パスの両方をチェック
            spec_path = Path(spec_file)

            if not spec_path.exists():
                print(f"{Colors.RED}❌{Colors.NC} 見つかりません: {spec_file}")
                missing_files.append(spec_file)
                self.exit_code = 1
            elif self.verbose:
                print(f"{Colors.GREEN}✓{Colors.NC} OK: {spec_file}")

        if not missing_files:
            print(f"{Colors.GREEN}✓{Colors.NC} すべての仕様ファイルが存在します")
        else:
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  {len(missing_files)}個の仕様ファイルが見つかりません")

        print()
        return missing_files

    def check_broken_links(self) -> int:
        """仕様ファイル内のリンク切れをチェック"""
        print(f"{Colors.BLUE}[3/4]{Colors.NC} 仕様ファイル内のリンク切れをチェック中...")

        broken_links = 0

        # Markdownリンクのパターン: [テキスト](リンク)
        link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'

        for spec_file in self.spec_dir.rglob('*.md'):
            try:
                with open(spec_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # リンクを抽出
                matches = re.finditer(link_pattern, content)
                for match in matches:
                    link = match.group(2)

                    # URLは除外
                    if link.startswith(('http://', 'https://')):
                        continue

                    # アンカーリンク（#で始まる）は除外
                    if link.startswith('#'):
                        continue

                    # 相対パスを解決
                    spec_dir = spec_file.parent
                    linked_file = spec_dir / link

                    # ファイルの存在確認
                    if not linked_file.exists():
                        print(f"{Colors.RED}❌{Colors.NC} リンク切れ: {spec_file}")
                        print(f"   → 存在しないファイル: {link}")
                        broken_links += 1
                        self.exit_code = 1
                    elif self.verbose:
                        print(f"{Colors.GREEN}✓{Colors.NC} OK: {spec_file} → {link}")

            except Exception as e:
                if self.verbose:
                    print(f"{Colors.YELLOW}⚠️{Colors.NC}  読み込みエラー: {spec_file}: {e}")

        if broken_links == 0:
            print(f"{Colors.GREEN}✓{Colors.NC} リンク切れはありません")
        else:
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  {broken_links}個のリンク切れを検出")

        print()
        return broken_links

    def check_unused_specs(self, spec_refs: Set[str]) -> int:
        """使用されていない仕様ファイルの検出"""
        if not self.check_unused:
            print(f"{Colors.BLUE}[4/4]{Colors.NC} 未使用ファイルチェックはスキップ（--check-unused で有効化）")
            print()
            return 0

        print(f"{Colors.BLUE}[4/4]{Colors.NC} 未使用の仕様ファイルをチェック中...")

        # すべての仕様ファイルを取得
        all_spec_files = {str(f.relative_to(Path.cwd())) for f in self.spec_dir.rglob('*.md')}

        # 未使用のファイルを検出
        unused_files = all_spec_files - spec_refs

        for unused_file in sorted(unused_files):
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  未使用: {unused_file}")

        if not unused_files:
            print(f"{Colors.GREEN}✓{Colors.NC} すべての仕様ファイルが参照されています")
        else:
            print(f"{Colors.YELLOW}⚠️{Colors.NC}  {len(unused_files)}個の未使用仕様ファイルを検出")
            print("   （これは警告であり、エラーではありません）")

        print()
        return len(unused_files)

    def run(self) -> int:
        """チェックを実行"""
        print(f"{Colors.BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
        print(f"{Colors.BLUE}仕様とコードの整合性チェック{Colors.NC}")
        print(f"{Colors.BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
        print()
        print(f"仕様ディレクトリ: {self.spec_dir}")
        print(f"ソースディレクトリ: {self.src_dir}")
        print()

        # ディレクトリの存在確認
        if not self.spec_dir.exists():
            print(f"{Colors.RED}❌ エラー: 仕様ディレクトリが見つかりません: {self.spec_dir}{Colors.NC}")
            return 1

        if not self.src_dir.exists():
            print(f"{Colors.RED}❌ エラー: ソースディレクトリが見つかりません: {self.src_dir}{Colors.NC}")
            return 1

        # チェックを実行
        spec_refs = self.find_spec_references()
        missing_files = self.check_spec_files_exist(spec_refs)
        broken_links = self.check_broken_links()
        unused_count = self.check_unused_specs(spec_refs)

        # サマリー
        print(f"{Colors.BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
        print(f"{Colors.BLUE}チェック結果サマリー{Colors.NC}")
        print(f"{Colors.BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.NC}")
        print(f"検出した仕様参照: {len(spec_refs)}個")
        print(f"見つからない仕様ファイル: {len(missing_files)}個")
        print(f"リンク切れ: {broken_links}個")

        if self.exit_code == 0:
            print()
            print(f"{Colors.GREEN}✅ すべてのチェックに合格しました！{Colors.NC}")
        else:
            print()
            print(f"{Colors.RED}❌ エラーが見つかりました{Colors.NC}")

            if self.ci_mode:
                print()
                print("CI/CDモードで実行しているため、非ゼロのexit codeで終了します")

        return self.exit_code


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='仕様とコードの整合性をチェックします',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s
  %(prog)s --spec-dir docs/specifications --src-dir src
  %(prog)s --ci --verbose
        """
    )

    parser.add_argument(
        '--spec-dir',
        default='docs/spec',
        help='仕様ファイルのディレクトリ (デフォルト: docs/spec)'
    )

    parser.add_argument(
        '--src-dir',
        default='.',
        help='ソースコードのディレクトリ (デフォルト: .)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='詳細な出力'
    )

    parser.add_argument(
        '--ci',
        action='store_true',
        help='CI/CDモード（エラー時に非ゼロで終了）'
    )

    parser.add_argument(
        '--check-unused',
        action='store_true',
        help='使用されていない仕様ファイルもチェック'
    )

    args = parser.parse_args()

    # Windows環境では色を無効化
    if os.name == 'nt':
        Colors.disable_on_windows()

    # チェッカーを実行
    checker = SpecCodeChecker(
        spec_dir=args.spec_dir,
        src_dir=args.src_dir,
        verbose=args.verbose,
        ci_mode=args.ci,
        check_unused=args.check_unused
    )

    exit_code = checker.run()
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
```

**インストール方法**:
```bash
# 1. スクリプトを保存
curl -o check_spec_code_consistency.py [URL]

# または直接作成
# 上記のスクリプト本体を check_spec_code_consistency.py として保存

# 2. 実行（権限設定は不要）
python check_spec_code_consistency.py

# Windows (PowerShell):
python check_spec_code_consistency.py

# Windows (コマンドプロンプト):
python check_spec_code_consistency.py
```

**CI/CDへの統合**:
```yaml
# .github/workflows/spec-check.yml
name: Spec-Code Consistency Check

on: [push, pull_request]

jobs:
  check-consistency:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.8', '3.9', '3.10', '3.11']

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Run spec-code consistency check
        run: |
          python check_spec_code_consistency.py --ci --verbose
```

### 12.4 CI/CDパイプラインの設定例

**追加箇所**: 12.6節「セキュリティ設計」または第13章「組織全体導入の文化変革」の後

**目的**: シークレット検出、リンク切れチェック、Markdown文法チェック、仕様とコードの整合性チェックの統合

**このスクリプトの概要**: 
GitHub Actionsを使用して、仕様駆動開発のためのCI/CDパイプラインを統合します。仕様とコードの整合性チェック、Markdownリンター、リンク切れチェック、シークレット検出（Gitleaks + TruffleHog）を自動実行します。仕様ファイル変更の自動検出と通知機能も含まれています。

**実行環境**:
- GitHub Actions環境

**依存関係のインストール**:
```bash
# ローカルでテストする場合
npm install -g markdownlint-cli markdown-link-check
pip install gitleaks trufflehog
```

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

#### 12.4.1 統合CI/CDパイプライン

**ファイルパス**: `.github/workflows/spec-driven-ci.yml`

**説明**: 仕様駆動開発のためのCI/CDパイプライン統合設定。仕様とコードの整合性チェック、Markdownリンター、シークレット検出などを自動実行します。

**主な機能**:
- 仕様とコードの整合性チェック
- Markdownリンター（markdownlint）
- リンク切れチェック（markdown-link-check）
- Conventional Commitsのチェック
- シークレット検出（gitleaks）

**設定ファイル**:
```yaml
name: Spec-Driven CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  # 仕様とコードの整合性チェック
  spec-consistency-check:
    name: 仕様とコードの整合性チェック
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 全履歴を取得（コミットメッセージチェック用）

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Run spec-code consistency check
        run: |
          python check_spec_code_consistency.py --ci --verbose

      - name: Upload check results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: spec-consistency-results
          path: |
            *.log
            *.txt

  # Markdownリンター
  markdown-lint:
    name: Markdownリンター
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install markdownlint-cli
        run: npm install -g markdownlint-cli

      - name: Run markdownlint on spec files
        run: |
          markdownlint 'docs/spec/**/*.md' --config .markdownlint.json || true

      - name: Run markdownlint on all markdown files
        run: |
          markdownlint '**/*.md' \
            --ignore node_modules \
            --ignore .github \
            --config .markdownlint.json

  # リンク切れチェック
  link-check:
    name: リンク切れチェック
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install markdown-link-check
        run: npm install -g markdown-link-check

      - name: Check links in spec files
        run: |
          find docs/spec -name "*.md" -exec markdown-link-check {} \;

      - name: Check links in README
        run: |
          markdown-link-check README.md

  # Conventional Commitsチェック
  commit-message-check:
    name: コミットメッセージチェック
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install commitlint
        run: |
          npm install -g @commitlint/cli @commitlint/config-conventional

      - name: Create commitlint config
        run: |
          cat > .commitlintrc.json << 'EOF'
          {
            "extends": ["@commitlint/config-conventional"],
            "rules": {
              "type-enum": [
                2,
                "always",
                [
                  "feat",
                  "fix",
                  "docs",
                  "style",
                  "refactor",
                  "perf",
                  "test",
                  "chore",
                  "build",
                  "ci"
                ]
              ],
              "subject-case": [0]
            }
          }
          EOF

      - name: Validate commit messages
        run: |
          npx commitlint --from ${{ github.event.pull_request.base.sha }} --to HEAD --verbose

  # シークレット検出
  secret-detection:
    name: シークレット検出
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  # 仕様ファイル変更の検出と通知
  spec-change-notification:
    name: 仕様ファイル変更の検出
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Check for spec file changes
        id: check_spec_changes
        run: |
          SPEC_CHANGES=$(git diff --name-only origin/${{ github.event.pull_request.base.ref }}...HEAD | grep '^docs/spec/' || true)

          if [ -n "$SPEC_CHANGES" ]; then
            echo "spec_changed=true" >> $GITHUB_OUTPUT
            echo "仕様ファイルの変更が検出されました:"
            echo "$SPEC_CHANGES"
          else
            echo "spec_changed=false" >> $GITHUB_OUTPUT
          fi

      - name: Add spec change label
        if: steps.check_spec_changes.outputs.spec_changed == 'true'
        uses: actions-ecosystem/action-add-labels@v1
        with:
          labels: 'spec-change'

      - name: Comment on PR
        if: steps.check_spec_changes.outputs.spec_changed == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ **仕様ファイルの変更が検出されました**\n\nこのPRには仕様ファイル（`docs/spec/`）の変更が含まれています。\n\n- [ ] 仕様変更の影響範囲を確認してください\n- [ ] 関連するコードが更新されているか確認してください\n- [ ] テックリード/プロダクトマネージャーのレビューを受けてください'
            })

  # すべてのチェックが完了したことを確認
  all-checks-passed:
    name: すべてのチェック完了
    runs-on: ubuntu-latest
    needs:
      - spec-consistency-check
      - markdown-lint
      - link-check
      - commit-message-check
      - secret-detection
    if: always()

    steps:
      - name: Check all jobs status
        run: |
          if [ "${{ needs.spec-consistency-check.result }}" != "success" ] || \
             [ "${{ needs.markdown-lint.result }}" != "success" ] || \
             [ "${{ needs.link-check.result }}" != "success" ] || \
             [ "${{ needs.commit-message-check.result }}" != "success" ] || \
             [ "${{ needs.secret-detection.result }}" != "success" ]; then
            echo "❌ 一部のチェックが失敗しました"
            exit 1
          else
            echo "✅ すべてのチェックに合格しました"
          fi
```

**必要な設定ファイル**:

`.markdownlint.json`:
```json
{
  "default": true,
  "MD003": { "style": "atx" },
  "MD007": { "indent": 2 },
  "MD013": false,
  "MD024": { "siblings_only": true },
  "MD033": false,
  "MD041": false
}
```

**使用方法**:
```bash
# 1. 上記のファイルを .github/workflows/spec-driven-ci.yml として保存

# 2. .markdownlint.json をプロジェクトルートに配置

# 3. GitHubリポジトリにpush
git add .github/workflows/spec-driven-ci.yml .markdownlint.json
git commit -m "ci: Add spec-driven CI/CD pipeline"
git push

# 4. Pull Requestを作成すると自動的にチェックが実行されます
```

#### 12.4.2 シークレット検出の設定

**ファイルパス**: `.github/workflows/secret-detection.yml`

**説明**: Gitleaksを使用したシークレット検出の専用ワークフロー。より詳細な設定とレポート機能を提供します。

**主な機能**:
- コミット履歴全体のシークレットスキャン
- カスタムルールの適用
- 検出結果のアーティファクト保存
- プルリクエストへのコメント通知

**設定ファイル**:
```yaml
name: Secret Detection

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # 毎週月曜日の午前9時（JST）に実行
    - cron: '0 0 * * 1'

jobs:
  gitleaks:
    name: Gitleaks Secret Scanning
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 全履歴をスキャン

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Gitleaks report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: gitleaks-report
          path: gitleaks-report.json

  trufflehog:
    name: TruffleHog Secret Scanning
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified

  custom-secret-scan:
    name: カスタムシークレットスキャン
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Custom secret patterns scan
        run: |
          echo "カスタムパターンでシークレットをスキャン中..."

          # 検出パターン
          PATTERNS=(
            "password\s*=\s*['\"][^'\"]{8,}['\"]"
            "api[_-]?key\s*=\s*['\"][^'\"]{20,}['\"]"
            "secret\s*=\s*['\"][^'\"]{20,}['\"]"
            "token\s*=\s*['\"][^'\"]{20,}['\"]"
            "aws[_-]?access[_-]?key[_-]?id\s*=\s*['\"]AKIA[A-Z0-9]{16}['\"]"
            "private[_-]?key"
            "BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY"
          )

          # 除外パターン
          EXCLUDE_DIRS="node_modules|.git|vendor|dist|build"

          FOUND_SECRETS=0

          for pattern in "${PATTERNS[@]}"; do
            echo "検索中: $pattern"

            # grepでパターンを検索
            if grep -rn -E "$pattern" . \
                --exclude-dir={$EXCLUDE_DIRS} \
                --exclude="*.{lock,min.js,bundle.js}" \
                > /tmp/secret_findings.txt 2>/dev/null; then

              echo "⚠️ 検出されたシークレット:"
              cat /tmp/secret_findings.txt
              FOUND_SECRETS=1
            fi
          done

          if [ "$FOUND_SECRETS" -eq 1 ]; then
            echo "❌ シークレットが検出されました"
            exit 1
          else
            echo "✅ シークレットは検出されませんでした"
          fi

      - name: Check for common secret files
        run: |
          echo "一般的なシークレットファイルをチェック中..."

          SECRET_FILES=(
            ".env"
            ".env.local"
            ".env.production"
            "credentials.json"
            "serviceAccount.json"
            "firebase-adminsdk.json"
            "*.pem"
            "*.key"
            "*.p12"
            "*.pfx"
            "id_rsa"
            "id_dsa"
            "*.ppk"
          )

          FOUND_FILES=0

          for file_pattern in "${SECRET_FILES[@]}"; do
            if find . -name "$file_pattern" \
                -not -path "*/node_modules/*" \
                -not -path "*/.git/*" \
                -not -path "*/vendor/*" | grep -q .; then

              echo "⚠️ 検出されたファイル:"
              find . -name "$file_pattern" \
                  -not -path "*/node_modules/*" \
                  -not -path "*/.git/*" \
                  -not -path "*/vendor/*"

              FOUND_FILES=1
            fi
          done

          if [ "$FOUND_FILES" -eq 1 ]; then
            echo "⚠️ 注意: シークレットファイルが検出されました"
            echo "これらのファイルが .gitignore に含まれているか確認してください"
          else
            echo "✅ シークレットファイルは検出されませんでした"
          fi

  notify-on-secret-found:
    name: シークレット検出時の通知
    runs-on: ubuntu-latest
    needs: [gitleaks, trufflehog, custom-secret-scan]
    if: failure() && github.event_name == 'pull_request'

    steps:
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚨 **シークレット検出アラート** 🚨\n\nこのPRにシークレット（APIキー、パスワード、トークンなど）が含まれている可能性があります。\n\n**対応が必要です:**\n1. シークレットを含むコミットを削除してください\n2. 該当のシークレットをローテーション（無効化して再発行）してください\n3. `.gitignore` にシークレットファイルを追加してください\n4. 環境変数や秘密管理サービス（AWS Secrets Manager、GitHub Secretsなど）を使用してください\n\n詳細は Actions タブで確認できます。'
            })
```

**Gitleaks設定ファイル** (`.gitleaks.toml`):
```toml
title = "Gitleaks Configuration for Spec-Driven Development"

[extend]
# useDefaultがtrueの場合、デフォルトルールを使用
useDefault = true

# カスタムルールの定義
[[rules]]
id = "japanese-password"
description = "日本語のパスワード変数"
regex = '''パスワード\s*=\s*['\"][^'\"]{6,}['\"]'''
tags = ["password", "japanese"]

[[rules]]
id = "japanese-api-key"
description = "日本語のAPIキー変数"
regex = '''(API|api)キー\s*=\s*['\"][^'\"]{20,}['\"]'''
tags = ["api-key", "japanese"]

[[rules]]
id = "japanese-secret"
description = "日本語のシークレット変数"
regex = '''秘密鍵\s*=\s*['\"][^'\"]{20,}['\"]'''
tags = ["secret", "japanese"]

# 除外設定
[allowlist]
description = "Global allowlist"
regexes = [
  '''(example|sample|test|dummy|fake|mock)''',  # テスト用の文字列
]

paths = [
  '''.*/test/.*''',
  '''.*/tests/.*''',
  '''.*/spec/.*''',
  '''.*_test\.go''',
  '''.*\.test\.ts''',
  '''.*\.spec\.ts''',
  '''.*\.test\.js''',
  '''.*\.spec\.js''',
]
```

**使用方法**:
```bash
# 1. ワークフローファイルを配置
mkdir -p .github/workflows
cat > .github/workflows/secret-detection.yml << 'EOF'
# 上記のYAML設定をペースト
EOF

# 2. Gitleaks設定ファイルを配置
cat > .gitleaks.toml << 'EOF'
# 上記のTOML設定をペースト
EOF

# 3. ローカルでテスト実行
# Gitleaksをインストール
brew install gitleaks  # macOS
# または
# Linux: https://github.com/gitleaks/gitleaks/releases からダウンロード

# スキャン実行
gitleaks detect --source . --config .gitleaks.toml --verbose

# 4. GitHubにpush
git add .github/workflows/secret-detection.yml .gitleaks.toml
git commit -m "ci: Add secret detection workflow"
git push
```

**定期スキャンの設定**:
上記の設定では、毎週月曜日の午前0時（UTC）= 午前9時（JST）に自動スキャンが実行されます。頻度を変更する場合は `cron` の値を編集してください。

```yaml
# 毎日午前2時（UTC）に実行
- cron: '0 2 * * *'

# 毎月1日の午前0時（UTC）に実行
- cron: '0 0 1 * *'
```

### 12.5 稟議レポート生成スクリプト

**追加箇所**: 12.8節「公的機関対応：監査と稟議に必要な仕様トレーサビリティ」

**目的**: 公的機関・大規模組織向けの稟議レポートを自動生成する

**このスクリプトの概要**: 
Pull Requestから稟議レポートを自動生成します。GitHub APIを使用してPull Request情報を取得し、変更内容、承認者、影響範囲などを含むMarkdown形式の稟議レポートを生成します。小規模・中規模・大規模向けの3種類のテンプレートに対応しています。

**実行環境**:
- Python: Python 3.7以上
- 必要なライブラリ: GitPython, requests

**依存関係のインストール**:
```bash
pip install GitPython requests
```

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

#### 12.5.1 稟議レポート生成スクリプト（完全版）

**ファイル名**: `generate-ringi-report.py`

**説明**: Pull Requestから稟議レポートを自動生成するPythonスクリプト

**機能**:
- GitHubのPull Request情報を取得
- 変更されたファイル一覧を収集
- コミット履歴と変更理由を抽出
- Markdown形式の稟議レポートを生成
- 稟議番号、申請者、承認者、影響範囲などを含む

**使用方法**:
```bash
# インストール
pip install GitPython requests

# 実行
python generate-ringi-report.py --pr 123 --output reports/ringi-2025-123.md

# ヘルプ
python generate-ringi-report.py --help
```

**スクリプト**:

```python
#!/usr/bin/env python3
"""
稟議レポート生成スクリプト

Pull Requestから稟議レポートを自動生成します。
公的機関・大規模組織向けの監査証跡を含むレポートを作成します。

使用例:
    python generate-ringi-report.py --pr 123 --output reports/ringi-2025-123.md
    python generate-ringi-report.py --pr 123 --repo owner/repo --output ringi.md
"""

import argparse
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
import subprocess
import re

try:
    import git
    from git import Repo
except ImportError:
    print("Error: GitPython is required. Install with: pip install GitPython")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Error: requests is required. Install with: pip install requests")
    sys.exit(1)


class RingiReportGenerator:
    """稟議レポート生成クラス"""

    def __init__(self, pr_number: int, repo_path: str = ".", github_token: Optional[str] = None):
        """
        初期化

        Args:
            pr_number: Pull Request番号
            repo_path: Gitリポジトリのパス
            github_token: GitHub Personal Access Token（オプション）
        """
        self.pr_number = pr_number
        self.repo_path = repo_path
        self.github_token = github_token or os.environ.get("GITHUB_TOKEN")
        self.repo = None
        self.pr_data = None

        try:
            self.repo = Repo(repo_path)
        except git.InvalidGitRepositoryError:
            print(f"Error: {repo_path} is not a valid Git repository")
            sys.exit(1)

    def get_remote_info(self) -> tuple:
        """
        リモートリポジトリ情報を取得

        Returns:
            (owner, repo_name)のタプル
        """
        try:
            remote_url = self.repo.remotes.origin.url
            # git@github.com:owner/repo.git or https://github.com/owner/repo.git
            match = re.search(r'github\.com[:/]([^/]+)/(.+?)(\.git)?$', remote_url)
            if match:
                return match.group(1), match.group(2)
        except:
            pass
        return None, None

    def fetch_pr_data(self, owner: str, repo_name: str) -> Dict:
        """
        GitHub APIからPR情報を取得

        Args:
            owner: リポジトリのオーナー
            repo_name: リポジトリ名

        Returns:
            PR情報の辞書
        """
        url = f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{self.pr_number}"
        headers = {}
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching PR data: {e}")
            return {}

    def get_changed_files(self, owner: str, repo_name: str) -> List[str]:
        """
        変更されたファイル一覧を取得

        Args:
            owner: リポジトリのオーナー
            repo_name: リポジトリ名

        Returns:
            変更されたファイルのリスト
        """
        url = f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{self.pr_number}/files"
        headers = {}
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            files_data = response.json()
            return [f["filename"] for f in files_data]
        except requests.exceptions.RequestException:
            return []

    def get_commits(self) -> List[Dict]:
        """
        コミット履歴を取得

        Returns:
            コミット情報のリスト
        """
        commits = []
        try:
            # 最新20コミットを取得
            for commit in list(self.repo.iter_commits(max_count=20)):
                commits.append({
                    "hash": commit.hexsha[:7],
                    "message": commit.message.strip(),
                    "author": commit.author.name,
                    "date": datetime.fromtimestamp(commit.committed_date).strftime("%Y-%m-%d %H:%M:%S")
                })
        except:
            pass
        return commits

    def generate_report(self, output_path: str, template: str = "large"):
        """
        稟議レポートを生成

        Args:
            output_path: 出力ファイルパス
            template: レポートテンプレート（small/medium/large）
        """
        owner, repo_name = self.get_remote_info()

        if owner and repo_name:
            self.pr_data = self.fetch_pr_data(owner, repo_name)
            changed_files = self.get_changed_files(owner, repo_name)
        else:
            self.pr_data = {}
            changed_files = []

        commits = self.get_commits()

        # レポート生成
        report = self._build_report(template, changed_files, commits)

        # ファイル出力
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report)

        print(f"稟議レポートを生成しました: {output_path}")

    def _build_report(self, template: str, changed_files: List[str], commits: List[Dict]) -> str:
        """
        レポート本文を構築

        Args:
            template: テンプレートタイプ
            changed_files: 変更されたファイルのリスト
            commits: コミット情報のリスト

        Returns:
            Markdown形式のレポート
        """
        today = datetime.now().strftime("%Y年%m月%d日")

        pr_title = self.pr_data.get("title", f"PR #{self.pr_number}")
        pr_body = self.pr_data.get("body", "")
        pr_author = self.pr_data.get("user", {}).get("login", "未設定")
        pr_url = self.pr_data.get("html_url", "")

        if template == "large":
            return self._build_large_report(today, pr_title, pr_body, pr_author, pr_url, changed_files, commits)
        elif template == "medium":
            return self._build_medium_report(today, pr_title, pr_body, pr_author, changed_files, commits)
        else:
            return self._build_small_report(today, pr_title, pr_body, changed_files)

    def _build_large_report(self, today: str, pr_title: str, pr_body: str, pr_author: str,
                           pr_url: str, changed_files: List[str], commits: List[Dict]) -> str:
        """大規模組織向けレポート"""
        report = f"""# 稟議書

## 稟議情報

- **稟議番号**: 2025-{self.pr_number}
- **申請日**: {today}
- **申請者**: {pr_author}
- **承認者**: [承認者名を記入]
- **期限**: [期限を記入]
- **関連PR**: {pr_url if pr_url else f"#{self.pr_number}"}

## 変更の概要

{pr_title}

## 変更の理由

{pr_body if pr_body else "[PRの説明から抽出または手動で記入]"}

## 変更内容の詳細

### 変更されたファイル

"""
        if changed_files:
            for file in changed_files:
                report += f"- `{file}`\n"
        else:
            report += "- [変更されたファイルを記入]\n"

        report += f"""
### コミット履歴

"""
        if commits:
            for commit in commits[:10]:  # 最新10件
                report += f"- `{commit['hash']}` {commit['message']} ({commit['author']}, {commit['date']})\n"
        else:
            report += "- [コミット履歴を記入]\n"

        report += f"""
## 影響範囲

### 影響を受けるシステム

- [システム名1]
- [システム名2]

### 影響を受けるユーザー

- [ユーザーグループ1]
- [ユーザーグループ2]

### ダウンタイムの有無

- ダウンタイム: [あり/なし]
- 予定時刻: [日時を記入]
- 所要時間: [時間を記入]

## セキュリティ・コンプライアンス

- [ ] セキュリティレビュー完了
- [ ] コンプライアンスチェック完了
- [ ] 個人情報保護法への対応確認
- [ ] シークレットスキャン完了（機密情報が含まれていない）

## テスト結果

### ユニットテスト

- [ ] すべてのユニットテストが通過

### 統合テスト

- [ ] すべての統合テストが通過

### 手動テスト

- [ ] 手動テストを実施し、動作を確認

## リスク評価

- **リスクレベル**: [高/中/低]
- **想定されるリスク**: [リスクの説明]
- **対策**: [リスクへの対策]

## デプロイメント手順

1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

## ロールバック手順

[問題が発生した場合のロールバック手順]

## 承認フロー

1. **コードレビュー（エンジニア）**: [レビュアー名] - [ ] 承認済み
2. **仕様レビュー（PM）**: [PM名] - [ ] 承認済み
3. **セキュリティレビュー**: [セキュリティチーム名] - [ ] 承認済み
4. **最終承認（マネージャー）**: [マネージャー名] - [ ] 承認済み

## 監査証跡

- **作成日**: {today}
- **最終更新日**: {today}
- **承認日**: [日付]
- **マージ日**: [日付]
- **デプロイ日**: [日付]

---

**備考**: 本稟議書はPR #{self.pr_number}から自動生成されました。必要に応じて内容を編集してください。
"""
        return report

    def _build_medium_report(self, today: str, pr_title: str, pr_body: str, pr_author: str,
                            changed_files: List[str], commits: List[Dict]) -> str:
        """中規模組織向けレポート"""
        report = f"""# 変更申請書

## 基本情報

- **申請番号**: 2025-{self.pr_number}
- **申請日**: {today}
- **申請者**: {pr_author}
- **承認者**: [承認者名を記入]

## 変更内容

### 概要

{pr_title}

### 詳細

{pr_body if pr_body else "[変更の詳細を記入]"}

## 変更されたファイル

"""
        if changed_files:
            for file in changed_files:
                report += f"- `{file}`\n"
        else:
            report += "- [ファイルリストを記入]\n"

        report += f"""
## 影響範囲

[この変更が影響する範囲を記載]

## テスト状況

- [ ] ユニットテスト完了
- [ ] 統合テスト完了
- [ ] 動作確認完了

## 承認

- **エンジニアレビュー**: [担当者名] - [ ] 承認
- **PM承認**: [PM名] - [ ] 承認

---

**作成日**: {today}
"""
        return report

    def _build_small_report(self, today: str, pr_title: str, pr_body: str, changed_files: List[str]) -> str:
        """小規模チーム向けレポート"""
        report = f"""# 変更記録

**日付**: {today}
**PR番号**: #{self.pr_number}

## 変更内容

{pr_title}

## 詳細

{pr_body if pr_body else "[詳細を記入]"}

## ファイル

"""
        if changed_files:
            for file in changed_files:
                report += f"- `{file}`\n"
        else:
            report += "- [ファイルリストを記入]\n"

        report += f"""
## チェックリスト

- [ ] テスト完了
- [ ] レビュー完了
- [ ] ドキュメント更新

---

**作成者**: [名前]
"""
        return report


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="Pull Requestから稟議レポートを自動生成します",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # 基本的な使用方法
  python generate-ringi-report.py --pr 123 --output reports/ringi-2025-123.md

  # テンプレートを指定
  python generate-ringi-report.py --pr 123 --template medium --output ringi.md

  # リポジトリパスを指定
  python generate-ringi-report.py --pr 123 --repo /path/to/repo --output ringi.md

環境変数:
  GITHUB_TOKEN: GitHub Personal Access Token（API制限を回避するため推奨）
        """
    )

    parser.add_argument("--pr", type=int, required=True, help="Pull Request番号")
    parser.add_argument("--output", "-o", required=True, help="出力ファイルパス")
    parser.add_argument("--repo", default=".", help="Gitリポジトリのパス（デフォルト: カレントディレクトリ）")
    parser.add_argument("--template", "-t", choices=["small", "medium", "large"], default="large",
                       help="レポートテンプレート（デフォルト: large）")
    parser.add_argument("--token", help="GitHub Personal Access Token（環境変数GITHUB_TOKENでも設定可能）")

    args = parser.parse_args()

    # レポート生成
    generator = RingiReportGenerator(
        pr_number=args.pr,
        repo_path=args.repo,
        github_token=args.token
    )

    generator.generate_report(output_path=args.output, template=args.template)


if __name__ == "__main__":
    main()
```

**実行例**:

```bash
# 大規模組織向けレポートを生成
python generate-ringi-report.py --pr 123 --output reports/ringi-2025-123.md

# 中規模組織向けレポートを生成
python generate-ringi-report.py --pr 456 --template medium --output reports/ringi-2025-456.md

# GitHub Tokenを指定して実行（API制限を回避）
export GITHUB_TOKEN=your_token_here
python generate-ringi-report.py --pr 123 --output reports/ringi-2025-123.md

# 別のリポジトリで実行
python generate-ringi-report.py --pr 123 --repo /path/to/other/repo --output ringi.md
```

**注意事項**:
- GitHub APIを使用するため、`GITHUB_TOKEN`環境変数の設定を推奨
- トークンなしでも動作しますが、API制限（60リクエスト/時間）があります
- トークンを使用すると5000リクエスト/時間まで可能
- 生成されたレポートは必要に応じて手動で編集してください

### 12.6 組織での進捗確認スクリプト

**追加箇所**: 第13章「組織全体導入の文化変革」の後

**目的**: README.mdの更新頻度確認、コミット履歴の分析、組織全体の進捗レポート生成

**このスクリプトの概要**: 
組織全体の仕様駆動開発の進捗を確認します。README.mdの更新頻度、コミット履歴の分析、仕様ファイルの活用状況を可視化し、仕様駆動開発の実践度をスコアリングします。Bash版とPython版（JSON出力対応）の両方を提供します。

**実行環境**:
- Bash: macOS / Linux / Windows WSL
- Python: Python 3.7以上

**依存関係**: 
- Bash版: 標準コマンドのみ（追加インストール不要）
- Python版: 標準ライブラリのみ（追加インストール不要、JSON出力対応）

**トラブルシューティング**: 
問題が発生した場合は、[トラブルシューティングガイド](../guides/troubleshooting.md)を参照してください。

#### 12.6.1 進捗確認スクリプト（Bash版）

**ファイル名**: `check_org_progress.sh`

**説明**: 組織全体の仕様駆動開発の進捗を確認するBashスクリプト。README.mdの更新頻度、コミット履歴の分析、仕様ファイルの活用状況を可視化します。

**主な機能**:
- README.mdの最終更新日時確認
- 直近の仕様ファイル変更履歴
- コミットメッセージの分類（feat/fix/docs/spec）
- 仕様駆動開発の実践度スコアリング
- チーム全体の進捗レポート生成

**使用方法**:
```bash
# 基本的な使い方
./check_org_progress.sh

# 特定のディレクトリを指定
./check_org_progress.sh --dir /path/to/project

# 詳細モード
./check_org_progress.sh --verbose

# レポートをファイルに出力
./check_org_progress.sh --output progress-report.txt

# 複数プロジェクトを一括チェック
./check_org_progress.sh --projects "project1 project2 project3"
```

**スクリプト本体**:
```bash
#!/bin/bash
#
# 組織での進捗確認スクリプト
#
# 機能:
# 1. README.mdの更新頻度確認
# 2. コミット履歴の分析
# 3. 仕様ファイルの活用状況確認
# 4. 仕様駆動開発の実践度スコアリング
#
# 使用例:
#   ./check_org_progress.sh
#   ./check_org_progress.sh --dir /path/to/project --verbose
#

set -e

# デフォルト設定
PROJECT_DIR="."
VERBOSE=0
OUTPUT_FILE=""
DAYS=30  # 過去30日分を分析

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    --dir DIR           プロジェクトディレクトリ (デフォルト: .)
    --days DAYS         分析する過去の日数 (デフォルト: 30)
    --output FILE       レポートファイルの出力先
    --verbose, -v       詳細な出力
    --help, -h          このヘルプを表示

例:
    $0
    $0 --dir /path/to/project --days 60
    $0 --output progress-report.txt --verbose
EOF
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --dir)
            PROJECT_DIR="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "エラー: 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 出力関数
output() {
    local message="$1"
    echo -e "$message"
    if [ -n "$OUTPUT_FILE" ]; then
        echo -e "$message" | sed 's/\x1b\[[0-9;]*m//g' >> "$OUTPUT_FILE"
    fi
}

# プロジェクトディレクトリの確認
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ エラー: プロジェクトディレクトリが見つかりません: $PROJECT_DIR${NC}"
    exit 1
fi

# Gitリポジトリの確認
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo -e "${RED}❌ エラー: Gitリポジトリではありません: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# 出力ファイルの初期化
if [ -n "$OUTPUT_FILE" ]; then
    echo "組織での進捗確認レポート" > "$OUTPUT_FILE"
    echo "生成日時: $(date)" >> "$OUTPUT_FILE"
    echo "プロジェクト: $(pwd)" >> "$OUTPUT_FILE"
    echo "分析期間: 過去${DAYS}日" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

output "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
output "${BLUE}組織での進捗確認${NC}"
output "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
output ""
output "プロジェクト: $(pwd)"
output "分析期間: 過去${DAYS}日"
output ""

# 1. README.mdの更新確認
output "${BLUE}[1/5]${NC} README.mdの更新状況"
output ""

if [ -f "README.md" ]; then
    README_LAST_COMMIT=$(git log -1 --format="%ai" -- README.md 2>/dev/null || echo "不明")
    README_LAST_AUTHOR=$(git log -1 --format="%an" -- README.md 2>/dev/null || echo "不明")
    README_DAYS_AGO=$(git log -1 --format="%ar" -- README.md 2>/dev/null || echo "不明")

    output "  最終更新: $README_LAST_COMMIT"
    output "  更新者: $README_LAST_AUTHOR"
    output "  経過時間: $README_DAYS_AGO"

    # 30日以上更新がない場合は警告
    LAST_UPDATE_DAYS=$(( ($(date +%s) - $(git log -1 --format="%ct" -- README.md 2>/dev/null || echo "0")) / 86400 ))
    if [ "$LAST_UPDATE_DAYS" -gt 30 ]; then
        output "  ${YELLOW}⚠️  警告: 30日以上更新されていません${NC}"
    else
        output "  ${GREEN}✓ 定期的に更新されています${NC}"
    fi
else
    output "  ${RED}❌ README.md が見つかりません${NC}"
fi

output ""

# 2. 仕様ファイルの活用状況
output "${BLUE}[2/5]${NC} 仕様ファイルの活用状況"
output ""

if [ -d "docs/spec" ]; then
    SPEC_FILE_COUNT=$(find docs/spec -name "*.md" -type f | wc -l | tr -d ' ')
    SPEC_CHANGES=$(git log --since="${DAYS} days ago" --oneline -- docs/spec 2>/dev/null | wc -l | tr -d ' ')

    output "  仕様ファイル数: $SPEC_FILE_COUNT"
    output "  過去${DAYS}日の変更回数: $SPEC_CHANGES"

    if [ "$SPEC_CHANGES" -gt 0 ]; then
        output "  ${GREEN}✓ 仕様ファイルが活用されています${NC}"

        if [ "$VERBOSE" -eq 1 ]; then
            output ""
            output "  最近の変更:"
            git log --since="${DAYS} days ago" --oneline --pretty=format:"    %ai - %s (%an)" -- docs/spec 2>/dev/null | head -n 5
        fi
    else
        output "  ${YELLOW}⚠️  警告: 過去${DAYS}日で仕様ファイルの変更がありません${NC}"
    fi
else
    output "  ${YELLOW}⚠️  docs/spec ディレクトリが見つかりません${NC}"
    output "  ${YELLOW}   小規模チームの場合はREADME.mdのみでも問題ありません${NC}"
fi

output ""

# 3. コミット履歴の分析
output "${BLUE}[3/5]${NC} コミット履歴の分析（過去${DAYS}日）"
output ""

TOTAL_COMMITS=$(git log --since="${DAYS} days ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
FEAT_COMMITS=$(git log --since="${DAYS} days ago" --oneline --grep="^feat" 2>/dev/null | wc -l | tr -d ' ')
FIX_COMMITS=$(git log --since="${DAYS} days ago" --oneline --grep="^fix" 2>/dev/null | wc -l | tr -d ' ')
DOCS_COMMITS=$(git log --since="${DAYS} days ago" --oneline --grep="^docs" 2>/dev/null | wc -l | tr -d ' ')
SPEC_COMMITS=$(git log --since="${DAYS} days ago" --oneline --grep="^spec" 2>/dev/null | wc -l | tr -d ' ')

output "  合計コミット数: $TOTAL_COMMITS"
output "  feat: $FEAT_COMMITS (新機能)"
output "  fix: $FIX_COMMITS (バグ修正)"
output "  docs: $DOCS_COMMITS (ドキュメント)"
output "  spec: $SPEC_COMMITS (仕様変更)"

if [ "$TOTAL_COMMITS" -gt 0 ]; then
    SPEC_RATIO=$(( (SPEC_COMMITS * 100) / TOTAL_COMMITS ))
    output ""
    output "  仕様変更の割合: ${SPEC_RATIO}%"

    if [ "$SPEC_RATIO" -gt 20 ]; then
        output "  ${GREEN}✓ 仕様駆動開発が実践されています${NC}"
    elif [ "$SPEC_RATIO" -gt 10 ]; then
        output "  ${YELLOW}⚠️  仕様変更のコミット割合が低めです${NC}"
    else
        output "  ${RED}❌ 仕様駆動開発がほとんど実践されていません${NC}"
    fi
fi

output ""

# 4. 仕様とコードの同期状況
output "${BLUE}[4/5]${NC} 仕様とコードの同期状況"
output ""

# 仕様のみ変更されたコミット
SPEC_ONLY=$(git log --since="${DAYS} days ago" --oneline --name-only 2>/dev/null | awk 'BEGIN{spec=0} /^[0-9a-f]{7}/ {if(spec && !code) count++; spec=0; code=0} /docs\/spec/ {spec=1} /\.(py|js|ts|java|go|rb)$/ {code=1} END{print count}')

# コードと仕様が同時に変更されたコミット
SPEC_AND_CODE=$(git log --since="${DAYS} days ago" --oneline --name-only 2>/dev/null | awk 'BEGIN{spec=0; code=0} /^[0-9a-f]{7}/ {if(spec && code) count++; spec=0; code=0} /docs\/spec/ {spec=1} /\.(py|js|ts|java|go|rb)$/ {code=1} END{print count}')

output "  仕様のみ変更: $SPEC_ONLY コミット"
output "  仕様+コード同時変更: $SPEC_AND_CODE コミット"

if [ "$SPEC_AND_CODE" -gt "$SPEC_ONLY" ]; then
    output "  ${GREEN}✓ 仕様とコードが適切に同期されています${NC}"
else
    output "  ${YELLOW}⚠️  仕様とコードの同期を改善できます${NC}"
fi

output ""

# 5. 実践度スコアリング
output "${BLUE}[5/5]${NC} 仕様駆動開発の実践度スコア"
output ""

SCORE=0

# README.md更新 (20点)
if [ -f "README.md" ] && [ "$LAST_UPDATE_DAYS" -le 30 ]; then
    SCORE=$((SCORE + 20))
fi

# 仕様ファイル活用 (30点)
if [ "$SPEC_CHANGES" -gt 0 ]; then
    SCORE=$((SCORE + 30))
fi

# 仕様変更コミット割合 (30点)
if [ "$TOTAL_COMMITS" -gt 0 ]; then
    if [ "$SPEC_RATIO" -gt 20 ]; then
        SCORE=$((SCORE + 30))
    elif [ "$SPEC_RATIO" -gt 10 ]; then
        SCORE=$((SCORE + 15))
    fi
fi

# 仕様とコードの同期 (20点)
if [ "$SPEC_AND_CODE" -gt "$SPEC_ONLY" ]; then
    SCORE=$((SCORE + 20))
fi

output "  総合スコア: ${SCORE}/100"
output ""

if [ "$SCORE" -ge 80 ]; then
    output "  ${GREEN}✅ 優秀！仕様駆動開発が十分に実践されています${NC}"
elif [ "$SCORE" -ge 60 ]; then
    output "  ${GREEN}✓ 良好。仕様駆動開発が実践されています${NC}"
elif [ "$SCORE" -ge 40 ]; then
    output "  ${YELLOW}⚠️  改善の余地あり。仕様駆動開発をより意識しましょう${NC}"
else
    output "  ${RED}❌ 要改善。仕様駆動開発の導入を検討してください${NC}"
fi

output ""

# サマリー
output "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
output "${BLUE}進捗確認完了${NC}"
output "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -n "$OUTPUT_FILE" ]; then
    echo ""
    echo "レポートを出力しました: $OUTPUT_FILE"
fi
```

**インストール方法**:
```bash
# 1. スクリプトを保存
cat > check_org_progress.sh << 'EOF'
# 上記のスクリプト本体をペースト
EOF

# 2. 実行権限を付与
chmod +x check_org_progress.sh

# 3. 実行
./check_org_progress.sh

# 4. レポートをファイルに出力
./check_org_progress.sh --output progress-report.txt
```

#### 12.6.2 進捗確認スクリプト（Python版）

**ファイル名**: `check_org_progress.py`

**説明**: Windows環境でも動作するPython版の進捗確認スクリプト。Bash版と同等の機能に加え、グラフ生成やJSON形式でのレポート出力にも対応します。

**主な機能**:
- README.mdの最終更新日時確認
- 仕様ファイル変更履歴の分析
- コミットメッセージの分類と可視化
- 実践度スコアリング
- JSON形式でのレポート出力（オプション）
- 進捗グラフの生成（matplotlib使用時）

**使用方法**:
```bash
# 基本的な使い方
python check_org_progress.py

# 特定のディレクトリを指定
python check_org_progress.py --dir /path/to/project

# 詳細モード
python check_org_progress.py --verbose

# JSON形式で出力
python check_org_progress.py --json progress.json

# レポートをファイルに出力
python check_org_progress.py --output progress-report.txt
```

**スクリプト本体**:
```python
#!/usr/bin/env python3
"""
組織での進捗確認スクリプト

機能:
1. README.mdの更新頻度確認
2. コミット履歴の分析
3. 仕様ファイルの活用状況確認
4. 仕様駆動開発の実践度スコアリング

使用例:
    python check_org_progress.py
    python check_org_progress.py --dir /path/to/project --verbose
    python check_org_progress.py --json progress.json
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import git
except ImportError:
    print("エラー: GitPython が見つかりません")
    print("インストール: pip install gitpython")
    sys.exit(1)


class Colors:
    """ANSIカラーコード"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

    @classmethod
    def disable_on_windows(cls):
        """Windowsで色を無効化"""
        if os.name == 'nt' and not os.environ.get('ANSICON'):
            cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ''


class ProgressChecker:
    """進捗確認クラス"""

    def __init__(self, project_dir: str, days: int = 30, verbose: bool = False):
        self.project_dir = Path(project_dir)
        self.days = days
        self.verbose = verbose
        self.repo = None
        self.report_data = {}

        # Gitリポジトリを開く
        try:
            self.repo = git.Repo(self.project_dir)
        except git.exc.InvalidGitRepositoryError:
            print(f"{Colors.RED}❌ エラー: Gitリポジトリではありません: {self.project_dir}{Colors.NC}")
            sys.exit(1)

    def check_readme_status(self) -> Dict:
        """README.mdの更新状況を確認"""
        readme_path = self.project_dir / 'README.md'

        if not readme_path.exists():
            return {
                'exists': False,
                'status': 'not_found'
            }

        # 最終コミット情報を取得
        try:
            commits = list(self.repo.iter_commits(paths='README.md', max_count=1))
            if commits:
                last_commit = commits[0]
                last_update = datetime.fromtimestamp(last_commit.committed_date)
                days_ago = (datetime.now() - last_update).days

                return {
                    'exists': True,
                    'last_update': last_update.strftime('%Y-%m-%d %H:%M:%S'),
                    'last_author': last_commit.author.name,
                    'days_ago': days_ago,
                    'status': 'recent' if days_ago <= 30 else 'outdated'
                }
        except:
            pass

        return {
            'exists': True,
            'status': 'unknown'
        }

    def check_spec_files(self) -> Dict:
        """仕様ファイルの活用状況を確認"""
        spec_dir = self.project_dir / 'docs' / 'spec'

        if not spec_dir.exists():
            return {
                'exists': False,
                'count': 0,
                'recent_changes': 0
            }

        # 仕様ファイル数をカウント
        spec_files = list(spec_dir.rglob('*.md'))
        spec_count = len(spec_files)

        # 過去N日の変更回数
        since_date = datetime.now() - timedelta(days=self.days)
        recent_commits = list(self.repo.iter_commits(
            paths='docs/spec',
            since=since_date
        ))

        recent_changes = []
        for commit in recent_commits[:5]:
            recent_changes.append({
                'date': datetime.fromtimestamp(commit.committed_date).strftime('%Y-%m-%d %H:%M:%S'),
                'message': commit.message.strip().split('\n')[0],
                'author': commit.author.name
            })

        return {
            'exists': True,
            'count': spec_count,
            'recent_changes': len(recent_commits),
            'recent_commits': recent_changes if self.verbose else []
        }

    def analyze_commits(self) -> Dict:
        """コミット履歴を分析"""
        since_date = datetime.now() - timedelta(days=self.days)
        commits = list(self.repo.iter_commits(since=since_date))

        total = len(commits)
        feat = sum(1 for c in commits if c.message.startswith('feat'))
        fix = sum(1 for c in commits if c.message.startswith('fix'))
        docs = sum(1 for c in commits if c.message.startswith('docs'))
        spec = sum(1 for c in commits if c.message.startswith('spec'))

        spec_ratio = (spec * 100 / total) if total > 0 else 0

        return {
            'total': total,
            'feat': feat,
            'fix': fix,
            'docs': docs,
            'spec': spec,
            'spec_ratio': spec_ratio
        }

    def check_sync_status(self) -> Dict:
        """仕様とコードの同期状況を確認"""
        since_date = datetime.now() - timedelta(days=self.days)
        commits = list(self.repo.iter_commits(since=since_date))

        spec_only = 0
        spec_and_code = 0

        for commit in commits:
            files = list(commit.stats.files.keys())

            has_spec = any('docs/spec' in f for f in files)
            has_code = any(f.endswith(('.py', '.js', '.ts', '.java', '.go', '.rb')) for f in files)

            if has_spec and not has_code:
                spec_only += 1
            elif has_spec and has_code:
                spec_and_code += 1

        return {
            'spec_only': spec_only,
            'spec_and_code': spec_and_code,
            'sync_ratio': (spec_and_code * 100 / (spec_only + spec_and_code))
                if (spec_only + spec_and_code) > 0 else 0
        }

    def calculate_score(self, readme: Dict, spec: Dict, commits: Dict, sync: Dict) -> int:
        """実践度スコアを計算"""
        score = 0

        # README.md更新 (20点)
        if readme.get('status') == 'recent':
            score += 20

        # 仕様ファイル活用 (30点)
        if spec.get('recent_changes', 0) > 0:
            score += 30

        # 仕様変更コミット割合 (30点)
        spec_ratio = commits.get('spec_ratio', 0)
        if spec_ratio > 20:
            score += 30
        elif spec_ratio > 10:
            score += 15

        # 仕様とコードの同期 (20点)
        if sync.get('spec_and_code', 0) > sync.get('spec_only', 0):
            score += 20

        return score

    def print_report(self, readme: Dict, spec: Dict, commits: Dict, sync: Dict, score: int):
        """レポートを出力"""
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}組織での進捗確認{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print()
        print(f"プロジェクト: {self.project_dir}")
        print(f"分析期間: 過去{self.days}日")
        print()

        # 1. README.md
        print(f"{Colors.BLUE}[1/5]{Colors.NC} README.mdの更新状況")
        print()

        if readme['exists']:
            if 'last_update' in readme:
                print(f"  最終更新: {readme['last_update']}")
                print(f"  更新者: {readme['last_author']}")
                print(f"  経過日数: {readme['days_ago']}日")

                if readme['status'] == 'recent':
                    print(f"  {Colors.GREEN}✓ 定期的に更新されています{Colors.NC}")
                else:
                    print(f"  {Colors.YELLOW}⚠️  警告: 30日以上更新されていません{Colors.NC}")
        else:
            print(f"  {Colors.RED}❌ README.md が見つかりません{Colors.NC}")

        print()

        # 2. 仕様ファイル
        print(f"{Colors.BLUE}[2/5]{Colors.NC} 仕様ファイルの活用状況")
        print()

        if spec['exists']:
            print(f"  仕様ファイル数: {spec['count']}")
            print(f"  過去{self.days}日の変更回数: {spec['recent_changes']}")

            if spec['recent_changes'] > 0:
                print(f"  {Colors.GREEN}✓ 仕様ファイルが活用されています{Colors.NC}")

                if self.verbose and spec.get('recent_commits'):
                    print()
                    print("  最近の変更:")
                    for commit in spec['recent_commits']:
                        print(f"    {commit['date']} - {commit['message']} ({commit['author']})")
            else:
                print(f"  {Colors.YELLOW}⚠️  警告: 過去{self.days}日で仕様ファイルの変更がありません{Colors.NC}")
        else:
            print(f"  {Colors.YELLOW}⚠️  docs/spec ディレクトリが見つかりません{Colors.NC}")

        print()

        # 3. コミット履歴
        print(f"{Colors.BLUE}[3/5]{Colors.NC} コミット履歴の分析（過去{self.days}日）")
        print()

        print(f"  合計コミット数: {commits['total']}")
        print(f"  feat: {commits['feat']} (新機能)")
        print(f"  fix: {commits['fix']} (バグ修正)")
        print(f"  docs: {commits['docs']} (ドキュメント)")
        print(f"  spec: {commits['spec']} (仕様変更)")

        if commits['total'] > 0:
            print()
            print(f"  仕様変更の割合: {commits['spec_ratio']:.1f}%")

            if commits['spec_ratio'] > 20:
                print(f"  {Colors.GREEN}✓ 仕様駆動開発が実践されています{Colors.NC}")
            elif commits['spec_ratio'] > 10:
                print(f"  {Colors.YELLOW}⚠️  仕様変更のコミット割合が低めです{Colors.NC}")
            else:
                print(f"  {Colors.RED}❌ 仕様駆動開発がほとんど実践されていません{Colors.NC}")

        print()

        # 4. 同期状況
        print(f"{Colors.BLUE}[4/5]{Colors.NC} 仕様とコードの同期状況")
        print()

        print(f"  仕様のみ変更: {sync['spec_only']} コミット")
        print(f"  仕様+コード同時変更: {sync['spec_and_code']} コミット")

        if sync['spec_and_code'] > sync['spec_only']:
            print(f"  {Colors.GREEN}✓ 仕様とコードが適切に同期されています{Colors.NC}")
        else:
            print(f"  {Colors.YELLOW}⚠️  仕様とコードの同期を改善できます{Colors.NC}")

        print()

        # 5. スコア
        print(f"{Colors.BLUE}[5/5]{Colors.NC} 仕様駆動開発の実践度スコア")
        print()

        print(f"  総合スコア: {score}/100")
        print()

        if score >= 80:
            print(f"  {Colors.GREEN}✅ 優秀！仕様駆動開発が十分に実践されています{Colors.NC}")
        elif score >= 60:
            print(f"  {Colors.GREEN}✓ 良好。仕様駆動開発が実践されています{Colors.NC}")
        elif score >= 40:
            print(f"  {Colors.YELLOW}⚠️  改善の余地あり。仕様駆動開発をより意識しましょう{Colors.NC}")
        else:
            print(f"  {Colors.RED}❌ 要改善。仕様駆動開発の導入を検討してください{Colors.NC}")

        print()

        # サマリー
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")
        print(f"{Colors.BLUE}進捗確認完了{Colors.NC}")
        print(f"{Colors.BLUE}{'='*60}{Colors.NC}")

    def run(self) -> Dict:
        """進捗確認を実行"""
        readme = self.check_readme_status()
        spec = self.check_spec_files()
        commits = self.analyze_commits()
        sync = self.check_sync_status()
        score = self.calculate_score(readme, spec, commits, sync)

        self.report_data = {
            'project': str(self.project_dir),
            'analysis_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'days': self.days,
            'readme': readme,
            'spec_files': spec,
            'commits': commits,
            'sync': sync,
            'score': score
        }

        self.print_report(readme, spec, commits, sync, score)

        return self.report_data


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='組織での仕様駆動開発の進捗を確認します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s
  %(prog)s --dir /path/to/project --days 60
  %(prog)s --json progress.json --verbose
        """
    )

    parser.add_argument(
        '--dir',
        default='.',
        help='プロジェクトディレクトリ (デフォルト: .)'
    )

    parser.add_argument(
        '--days',
        type=int,
        default=30,
        help='分析する過去の日数 (デフォルト: 30)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='詳細な出力'
    )

    parser.add_argument(
        '--json',
        help='JSON形式でレポートを出力'
    )

    parser.add_argument(
        '--output',
        help='テキスト形式のレポートファイル出力先'
    )

    args = parser.parse_args()

    # Windows環境では色を無効化
    if os.name == 'nt':
        Colors.disable_on_windows()

    # 進捗確認を実行
    checker = ProgressChecker(
        project_dir=args.dir,
        days=args.days,
        verbose=args.verbose
    )

    report_data = checker.run()

    # JSON出力
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        print()
        print(f"JSONレポートを出力しました: {args.json}")


if __name__ == '__main__':
    main()
```

**インストール方法**:
```bash
# 1. 必要なライブラリをインストール
pip install gitpython

# 2. スクリプトを保存
# 上記のスクリプト本体を check_org_progress.py として保存

# 3. 実行
python check_org_progress.py

# 4. JSON形式で出力
python check_org_progress.py --json progress.json --verbose
```

**出力例**:
```
============================================================
組織での進捗確認
============================================================

プロジェクト: /path/to/project
分析期間: 過去30日

[1/5] README.mdの更新状況

  最終更新: 2025-12-25 10:30:00
  更新者: Tanaka Hideki
  経過日数: 5日
  ✓ 定期的に更新されています

[2/5] 仕様ファイルの活用状況

  仕様ファイル数: 15
  過去30日の変更回数: 8
  ✓ 仕様ファイルが活用されています

[3/5] コミット履歴の分析（過去30日）

  合計コミット数: 45
  feat: 12 (新機能)
  fix: 8 (バグ修正)
  docs: 5 (ドキュメント)
  spec: 10 (仕様変更)

  仕様変更の割合: 22.2%
  ✓ 仕様駆動開発が実践されています

[4/5] 仕様とコードの同期状況

  仕様のみ変更: 3 コミット
  仕様+コード同時変更: 7 コミット
  ✓ 仕様とコードが適切に同期されています

[5/5] 仕様駆動開発の実践度スコア

  総合スコア: 100/100

  ✅ 優秀！仕様駆動開発が十分に実践されています

============================================================
進捗確認完了
============================================================
```

**活用方法**:
- 週次/月次レビューで組織全体の進捗を確認
- CI/CDに組み込んで定期的に実行
- JSON出力を使ってダッシュボード化
- 複数プロジェクトの進捗を一括比較

---

## スクリプトのカスタマイズ方法

### 1. チーム規模に合わせたカスタマイズ

**小規模チーム（3-5人）向け**
- スクリプトをシンプルにする
- エラーチェックを最小限にして、実行速度を優先
- 承認プロセスを簡略化（1段階の承認）

**中規模プロジェクト（10-30人）向け**
- 詳細なログ出力を追加
- 2段階の承認プロセス（コードレビュー + PM承認）
- チーム別のCODEOWNERS設定

**大規模組織（50人以上）向け**
- 監査証跡を含む詳細なログ
- 多段階の承認フロー（エンジニア → PM → セキュリティ → マネージャー）
- 部署別・プロジェクト別のCODEOWNERS設定

### 2. プロジェクトに合わせたカスタマイズ

**ディレクトリ構造の変更**
- `docs/spec/` を `specifications/` に変更する場合
- スクリプト内の `SPEC_DIR` 変数を修正

**使用言語の追加**
- Python以外の言語（JavaScript、Go、Rustなど）を使う場合
- ファイル拡張子のパターンを追加

**Git hooksのカスタマイズ**
- コミットメッセージの形式を変更する場合
- commit-msgフックの正規表現を修正

### 3. 実行環境の要件

**すべてのスクリプトに必要な環境**
- Git 2.0以上
- Bash 4.0以上（Bashスクリプトの場合）
- Python 3.7以上（Pythonスクリプトの場合）

**GitHub Actions関連**
- GitHubリポジトリの管理者権限
- GitHub Actions有効化

**変換スクリプト関連**
- pandoc 2.0以上（Word/Excel変換）

**Python依存ライブラリ**
```bash
pip install GitPython requests markdown
```

### 4. エラーハンドリングとデバッグ

**エラーメッセージの確認**
- すべてのスクリプトに `--help` オプションを提供
- エラー発生時は詳細なメッセージを表示

**デバッグモード**
- Bashスクリプト: `bash -x スクリプト名.sh` で実行
- Pythonスクリプト: `python -u スクリプト名.py` で実行

**ログファイルの確認**
- スクリプトは実行ログを出力
- ログファイルの場所: `logs/` ディレクトリ

### 5. テスト環境での確認

**本番環境に導入する前に**
1. テストブランチで動作確認
2. 小規模なリポジトリでテスト
3. エラーハンドリングの確認
4. チームメンバーにフィードバックを求める

**継続的な改善**
- 定期的にスクリプトをレビュー
- 新しい要件に合わせてカスタマイズ
- チーム全体で改善案を共有

---

**関連ファイル**:
- [プロンプト集](prompts.md) - AI活用のためのプロンプト
- [トラブルシューティングガイド](../guides/troubleshooting.md) - 困ったときの対処法
