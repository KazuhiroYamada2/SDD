# SDDリポジトリ ガイド索引

このディレクトリには、仕様駆動開発の実践に役立つガイドとツールが含まれています。

## カテゴリ別ガイド一覧

### 📄 変換ガイド（conversion/）

既存文書からMarkdown形式への変換方法を説明します。

- [Word/Excel変換ガイド](conversion/word-excel-conversion-guide.md) - Word/ExcelからMarkdownへの変換手順
- [OASYS/一太郎変換ガイド](conversion/oasys-ichitaro-conversion-guide.md) - OASYS/一太郎からMarkdownへの変換手順
- [Markdown記法の基本](conversion/markdown-basics.md) - Markdownの基本的な記法

### 🛠️ ツール関連（tools/）

仕様駆動開発で使用するツールの詳細な操作方法とリソースです。

- [Cursor関連動画一覧](tools/cursor-videos.md) - Cursor操作の動画リソース
- [Gitコマンド一覧](tools/git-commands.md) - よく使うGitコマンドのリファレンス
- [プロンプト集](tools/prompts.md) - AIエディタで使える実践的なプロンプト
- [スクリプト集](tools/scripts.md) - CI/CD設定、Git hooksなど、自動化・チェック機能を実現するスクリプト

### 📖 実践ガイド（guides/）

仕様駆動開発の実践方法と運用に関するガイドです。

- [規模別実践ガイド](guides/scale-based-practice-guide.md) - 組織規模に応じた実践方法
- [90日間導入プラン](guides/90-day-introduction-plan.md) - 段階的な導入計画
- [セキュリティとプライバシーガイド](guides/security-privacy-guide.md) - 規制産業・公的機関向けのセキュリティ対応
- [トラブルシューティング](guides/troubleshooting.md) - よくある問題と対処法
- [Markdownにしやすい文書の作り方](guides/markdown-friendly-document-creation.md) - 将来の移行を見据えた文書作成
- [書籍の正誤表](guides/errata.md) - 書籍発売後に判明した誤植や修正事項

## 書籍との対応

各ガイドが書籍のどの章と対応しているかを示します。

| ガイド | 対応する書籍の章 |
|--------|----------------|
| 規模別実践ガイド | 第3章、第5章、第6章、第11章、第12章、第13章 |
| プロンプト集 | 第1章〜第6章、第9章〜第13章 |
| 90日間導入プラン | 第5章、第6章 |
| セキュリティガイド | 第12章 |
| スクリプト集 | 第12章 |
| Word/Excel変換 | 第10章 |
| OASYS/一太郎変換 | 第10章 |
| 書籍の正誤表 | 全章（補足情報） |

## 推奨する読み方

### 初めて仕様駆動開発に取り組む方

1. [規模別実践ガイド](guides/scale-based-practice-guide.md)で自分の組織規模を確認
2. [90日間導入プラン](guides/90-day-introduction-plan.md)で全体の流れを把握
3. [プロンプト集](tools/prompts.md)を参照しながら実践

### レガシー文書の移行が必要な方

1. [Word/Excel変換ガイド](conversion/word-excel-conversion-guide.md)または[OASYS/一太郎変換ガイド](conversion/oasys-ichitaro-conversion-guide.md)を参照
2. [Markdown記法の基本](conversion/markdown-basics.md)で基礎を学習
3. [Markdownにしやすい文書の作り方](guides/markdown-friendly-document-creation.md)で将来の移行を準備

### 規制産業・公的機関の方

1. [セキュリティとプライバシーガイド](guides/security-privacy-guide.md)でコンプライアンス要件を確認
2. [スクリプト集](tools/scripts.md)で監査証跡の取得方法を確認
3. [規模別実践ガイド](guides/scale-based-practice-guide.md)の大規模組織向けを参照

## 困ったときは

- [トラブルシューティング](guides/troubleshooting.md) - よくあるエラーと対処法
- [Cursor関連動画一覧](tools/cursor-videos.md) - 動画で操作を確認
- [Gitコマンド一覧](tools/git-commands.md) - Git操作のリファレンス
