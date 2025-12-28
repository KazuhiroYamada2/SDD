---
title: "Word/ExcelからMarkdownへの変換ガイド"
description: "仕様駆動開発のための文書変換（Word/Excel → Markdown）を、現場で回る形でまとめた実践リファレンス。"
version: "1.0"
last_updated: "2025-12-29"
---

# Word/ExcelからMarkdownへの変換ガイド

本ガイドは、書籍の補足として「手を動かす人」向けに具体化した **実践リファレンス** です。  
ここでのゴールは、**Word/Excelの資産を“仕様として育てられる形”に再生**することです。

> **重要**：変換の目的は「見た目の再現」ではなく、**構造（見出し・段落・表・関係性）の回復**です。  
> まず“使える状態”を作り、品質は運用の中で磨きます。

---

## 目次

- [1. まず最初に：このガイドの使い方](#1-まず最初にこのガイドの使い方)
- [2. 変換の基本原則（失敗しない判断軸）](#2-変換の基本原則失敗しない判断軸)
- [3. ツール選定（運用から逆算する）](#3-ツール選定運用から逆算する)
- [4. Word → Markdown（実践）](#4-word--markdown実践)
- [5. Excel → Markdown（実践）](#5-excel--markdown実践)
- [6. 変換後チェック（最低限ここだけ）](#6-変換後チェック最低限ここだけ)
- [7. よくある問題と解決策（トラブルシューティング）](#7-よくある問題と解決策トラブルシューティング)
- [8. 自動化（大量変換・CI・運用）](#8-自動化大量変換ci運用)
- [9. 品質レベル（どこまで直すか）](#9-品質レベルどこまで直すか)
- [10. 付録：テンプレ・スニペット集](#10-付録テンプレスニペット集)

---

## 1. まず最初に：このガイドの使い方

### 3つの読み方
1. **1回だけ変換したい**：B.3 → B.4/B.5 → B.6 だけ読む  
2. **継続運用したい**：B.2 → B.3 → B.8 を重点的に読む  
3. **詰まった**：B.7 を辞書的に引く  

### 先に決めること（迷いを減らす）
- 変換対象は「今も更新される文書」か？（更新されないならPDF保管＋索引でもよい）
- 目的は「チーム参照」か？「外部公開」か？（必要品質が変わる）
- 機密情報を含むか？（オンラインツールの可否が変わる）

---

## B.2 変換の基本原則（失敗しない判断軸）

### 原則1：変換は“再現”ではなく“回復”
- 見出し（階層）
- 箇条書き（意図）
- 表（列の意味）
- 参照（リンク・画像）

この **構造が残っていれば合格** です。装飾は後から直せます。

### 原則2：最初から完璧を目指さない
最低限、次の3点を満たせば「仕様として再生可能」です。
- 見出し構造が把握できる
- 表や項目が意味を失っていない
- 重要情報が欠落していない

### 原則3：ツールより運用が大事
「誰が」「いつ」「どうやって更新し」「差分をどう確認するか」。  
これが決まっていないと、変換だけして終わります。

---

## B.3 ツール選定（運用から逆算する）

### まずはこの表で決める
| 状況 | 推奨 |
|---|---|
| 少量・単発 | GUI／エディタ拡張／Google Docs |
| 定期変換（更新がある） | CLI（コマンド）対応ツール |
| 大量・一括変換 | スクリプト＋一括処理 |
| 機密が強い | ローカル完結（オンライン不可） |
| 非エンジニア主体 | 既存業務ツールを経由（Docs/Office） |

### よく使う選択肢（代表例）
- **Pandoc**：構造保持が安定／CLIで自動化しやすい  
- **MarkItDown**：複数形式を一括で扱いやすい（Python環境が前提）  
- **VS Code拡張（Office→Markdown）**：手軽・速い（個人〜小チーム向き）  
- **Google Docs**：Google Workspace中心の組織で便利（ただし取り扱い規程に注意）  
- **TableConvert系（オンライン）**：最速だが **機密データは投入しない**

> **注意（オンラインツール）**  
> 組織のセキュリティ規程に反する可能性があるため、機密文書の貼り付けは避けてください。

---

## B.4 Word → Markdown（実践）

### B.4.1 変換前にWord側でやるべきこと（ここが最重要）
変換精度の9割は、Wordの作り方で決まります。
- 見出しは **スタイル（見出し1/2/3）** を使う（フォントサイズで作らない）
- 箇条書きは **箇条書き機能** を使う（手入力の「・」「1)」に寄せない）
- レイアウト目的のスペース／タブをやめ、表や段落で構造を作る

> **Tip**：Wordの「表示」タブ → 「ナビゲーションウィンドウ」をONにして、見出し構造が正しくツリー表示されているか事前に確認すると手戻りが減ります。

### B.4.2 Pandoc（基本）
```bash
pandoc input.docx -o output.md
```

**GitHub Flavored Markdown（推奨）**
```bash
pandoc input.docx -f docx -t gfm -o output.md
```

**画像を抽出する**
```bash
pandoc input.docx -f docx -t gfm --extract-media=./images -o output.md
```

**差分が見やすい（自動折り返しを無効）**
```bash
pandoc input.docx -f docx -t gfm --wrap=none --markdown-headings=atx -o output.md
```

### B.4.3 大量変換（例）

**Windows（PowerShell）**
```powershell
Get-ChildItem *.docx | ForEach-Object {
    $inputFile = $_.FullName
    $baseName = $_.BaseName
    $outputFile = $baseName + ".md"
    $imageDir = "./images/" + $baseName
    
    # 画像の上書きを防ぐため、ファイルごとのフォルダに出力
    pandoc $inputFile -f docx -t gfm --extract-media=$imageDir -o $outputFile
    Write-Host "変換完了: $outputFile (画像: $imageDir)"
}
```

**macOS/Linux（Bash）**
```bash
#!/bin/bash
for file in *.docx; do
  filename="${file%.docx}"
  # 画像の上書きを防ぐため、ファイルごとのフォルダに出力
  pandoc "$file" -f docx -t gfm --extract-media="./images/${filename}" -o "${filename}.md"
  echo "変換完了: ${filename}.md"
done
```

### B.4.4 MarkItDown（Python環境がある場合）
```bash
pip install markitdown
markitdown document.docx -o output.md
```

Pythonから使う例：
```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("document.docx")

with open("output.md", "w", encoding="utf-8") as f:
    f.write(result.text_content)
```

---

## B.5 Excel → Markdown（実践）

Excelは「文書」と「データ」が混在しやすく、Wordより難易度が高いです。  
まずは **Excelを“表データ”として扱える状態に整形する** ことが肝です。

### B.5.1 変換前の準備（Excel側）
- ファイルをバックアップする
- 不要な空行・空列を削除する
- **結合セルを解除**し、表を単純化する（Markdownは結合セルを表現できない）
- シート名を意味のある名前にする
- グラフは別扱い（画像として保存／元ファイルにリンク）

### B.5.2 変換方法の選択
- 単発・少数：TableConvert系（機密NG）
- 定期変換：スクリプト／CLI
- Excel 365中心：Office Scripts などの自動化も検討

### B.5.3 MarkItDown（Excel）
```bash
pip install markitdown
markitdown document.xlsx -o output.md
```

### B.5.4 CSV経由（“データ”として扱う）
1) ExcelからCSVを書き出し  
2) CSVをMarkdown表に変換（ツールやスクリプト）

例（Python：pandas）
```python
import pandas as pd

# CSV読み込み（Excel由来なら cp932 が多いが、ファイルによる）
df = pd.read_csv("input.csv", encoding="utf-8") # または encoding="cp932"

# データ前処理：改行コードを <br> タグに置換して、Markdown表崩れを防ぐ
df = df.replace(r'\n', '<br>', regex=True)

# Markdown形式に変換
md = df.to_markdown(index=False)

with open("output.md", "w", encoding="utf-8") as f:
    f.write(md)
```

### B.5.5 よくあるExcelの罠と対処
- **数式**：結果の値しか残らないことがある → 重要な計算ロジックは別途説明を残す
- **グラフ**：Markdown表にはならない → 画像化＋参照、または元Excelへのリンク
- **条件付き書式**：失われる → 太字や注釈で意味を残す／必要ならHTML表

---

## B.6 変換後チェック（最低限ここだけ）

### B.6.1 目視チェック（5分でやる）
- 見出し階層は自然か（# → ## → ###）
- 表の列の意味が崩れていないか
- 箇条書きのネストが壊れていないか
- 画像パスが正しいか（`images/...`）
- リンクが生きているか

### B.6.2 VS Code / Cursorで確認する
- プレビュー：Windows `Ctrl+Shift+V` / macOS `Cmd+Shift+V`
- サイドバイサイドで「編集＋プレビュー」

---

## B.7 よくある問題と解決策（トラブルシューティング）

### B.7.1 文字化け（Shift-JISなど）
**症状**：Markdownを開くと日本語が崩れる  
**対処**：UTF-8に統一する

- VS Code：右下のエンコーディング → 「エンコーディング付きで再度開く」→ 正常表示 → 「UTF-8で保存」

### B.7.2 Pandocが見つからない
```bash
pandoc --version
```
- macOS：`brew install pandoc`
- Windows：`winget install pandoc` （または公式サイトからインストーラー）
インストール後、ターミナル再起動でPATHが通っているか確認してください。

### B.7.3 見出し階層が崩れる／見出し番号が消える
**原因**：Wordの見出しスタイルを使っていない／自動採番が文書中に存在しない  
**対処**：
- 変換前にWord側で見出しスタイルを適用
- 変換後に正規表現で補正（例：VS Codeの置換）

例：`1.1 概要` の行を見出しにする（レベル2）
- 検索（正規表現）：`^([0-9]+\.[0-9]+.*)`
- 置換：`## $1`

### B.7.4 表が崩れる（結合セル／ネスト表）
**原因**：Markdown表の限界  
**対処**：
- 結合セルを解除して平坦化
- ネスト表は分割
- どうしても必要なら **HTMLテーブル** を使う

---

## B.8 自動化（大量変換・CI・運用）

### B.8.1 「変換したら終わり」を防ぐ
- 変換後のMarkdownをGit管理する
- 変更はPR（レビュー）を通す
- 変換結果の品質チェックを自動化する

### B.8.2 例：Markdownリンク切れチェック（GitHub Actions）
```yaml
name: markdown-check

on:
  pull_request:
  push:

jobs:
  link-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for broken links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
```

### B.8.3 パス問題（Windows/macOS）
スクリプトでは `pathlib` を使うと安全です。
```python
from pathlib import Path

image_dir = Path("images")
image_path_for_md = (image_dir / "figure1.png").as_posix()  # images/figure1.png
```

---

## B.9 品質レベル（どこまで直すか）

チームで「どこまでの品質を求めるか」を先に合意してください。

- **レベル1**：最低限読める／構造が保たれている（社内メモ、個人用）
- **レベル2**：リンクが機能／画像表示／表記が概ね統一（チーム共有、技術文書）
- **レベル3**：公開可能（Lintエラーゼロ、スタイルガイド準拠、読みやすい）

> 最初からレベル3は危険です。  
> **まずレベル1〜2で回し、使われる文書だけを磨く**のが現実的です。

---

## B.10 付録：テンプレ・スニペット集

### B.10.1 画像（図）テンプレ
```markdown
---

![説明文](images/figure1.png)

*図：説明文*

---
```

### B.10.2 セル内改行（Excel→Markdown）
Markdown表ではセル内改行に `<br />` を使うと安定します。
```markdown
| 手順 |
|---|
| 1) 開く<br />2) 実行する<br />3) 確認する |
```

### B.10.3 変換ワークフロー（短縮版）
1) 変換対象を選ぶ（更新される文書から）  
2) Word/Excel側で構造を整える（見出し・表・結合セル）  
3) 変換（Pandoc/MarkItDown 等）  
4) 5分チェック（B.6）  
5) Git管理＋PRレビュー  
6) 品質は運用で磨く（B.9）  

---

## ライセンスと利用
- 本文の再利用・転載条件は、書籍の方針に合わせて設定してください（例：CC BY、社内限定など）。
- 本Web付録は「実務の参考」を目的とし、組織のセキュリティ・コンプライアンス規程を優先してください。

