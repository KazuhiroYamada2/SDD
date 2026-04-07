[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

# 変更履歴

このプロジェクトのすべての重要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
バージョン管理は [セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

---

## [1.0.2] - 2026-04-07

### 修正

- **spec-ai-writer / CSP（Content Security Policy）**: 本番モードで127.0.0.1経由アクセス時のCSPエラーを修正（Issue #56）
- **spec-ai-writer / `.env.example`**: APIベースURLの説明を修正（Issue #56）

---

## [1.0.1] - 2026-03-24

### 変更

- **README.md / README_ja.md**: spec-ai-writer セクションを追加し `spec-ai-writer/README.md` へのリンクを記載、日英間でセクション順序を統一
- **spec-ai-writer/README.md**: Python・TypeScript の言語/フレームワークバッジを追加
- **CHANGELOG.md / CONTRIBUTING.md / SECURITY.md**: 英語版デフォルト + `_ja.md` 日本語版に分離し、言語切り替えリンクを追加

---

## [1.0.0] - 2026-02-26

初回リリース。『仕様駆動開発 実践入門』の練習用リポジトリとして公開。

### 追加

- **サンプルファイル（7工程）**: 仕様駆動開発の7つの工程に対応したサンプルファイル群（顧客管理システムを題材として）
- **実践ガイド群**: 規模別実践ガイド、90日間導入プラン、セキュリティとプライバシーガイド、トラブルシューティングなど
- **ツール関連ドキュメント**: Cursor関連動画一覧、Gitコマンド一覧、プロンプト集、スクリプト集
- **変換ガイド**: Word/Excel・OASYS/一太郎からMarkdownへの変換ガイド
- **spec-ai-writer**: 仕様駆動開発支援AIツール
- **公開用ドキュメント**: README.md（英語）、README_ja.md（日本語）、CONTRIBUTING.md、SECURITY.md、CHANGELOG.md、LICENSE

### 技術詳細

- 本リポジトリは Markdown ファイルのみで構成（実行可能なコードなし）
- ライセンス: MIT（Copyright (c) 2025 Hideki Tanaka）

---

## リンク

- [リポジトリ](https://github.com/elvezjp/SDD)
- [Issueトラッカー](https://github.com/elvezjp/SDD/issues)

---

## バージョン比較

| バージョン | 主な機能 |
|------------|----------|
| 1.0.2      | CSP修正、.env.example修正（Issue #56） |
| 1.0.1      | GitHub公開ルール対応：README改善、ドキュメントの日英2ファイル化 |
| 1.0.0      | 初回リリース。7工程サンプル、ガイド群、spec-ai-writer、公開用ドキュメント |
