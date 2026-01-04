# SDD Generator - Frontend

React + TypeScript フロントエンドアプリケーション

## 技術スタック

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速ビルドツール
- **TailwindCSS** - ユーティリティファーストCSS
- **React Router** - ルーティング
- **TanStack Query** - サーバー状態管理
- **Zustand** - クライアント状態管理
- **Axios** - HTTP クライアント
- **react-markdown** - Markdownプレビュー
- **lucide-react** - アイコン

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを必要に応じて編集してください。

### 3. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## ビルド

本番用ビルド:

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに生成されます。

ビルドのプレビュー:

```bash
npm run preview
```

## プロジェクト構造

```
src/
├── api/              # APIクライアント
│   ├── client.ts     # REST API
│   └── websocket.ts  # WebSocket
├── components/       # 再利用可能なコンポーネント
│   └── Layout.tsx    # レイアウト
├── pages/            # ページコンポーネント
│   ├── Dashboard.tsx       # ダッシュボード
│   ├── Interview.tsx       # インタビュー
│   ├── Specifications.tsx  # 仕様書プレビュー
│   └── ProjectDetail.tsx   # プロジェクト詳細
├── store/            # Zustand状態管理
│   ├── useProjectStore.ts
│   └── useInterviewStore.ts
├── types/            # TypeScript型定義
│   └── index.ts
├── App.tsx           # アプリケーションルート
├── main.tsx          # エントリーポイント
└── index.css         # グローバルCSS

## 主な機能

### ダッシュボード

- プロジェクト一覧表示
- 新規プロジェクト作成
- プロジェクト削除
- 進捗状況の可視化

### インタビュー

- WebSocketによるリアルタイムチャット
- LLMとの対話形式インタビュー
- フェーズ進行管理
- 自動仕様書生成通知

### 仕様書プレビュー

- 生成された仕様書の閲覧
- Markdownレンダリング
- 個別ダウンロード
- ZIP一括ダウンロード

## 開発

### Linting

```bash
npm run lint
```

### 型チェック

```bash
tsc --noEmit
```

## APIエンドポイント

バックエンドAPIの詳細は、開発サーバー起動後に以下で確認できます:

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
