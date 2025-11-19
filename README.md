# 仕様駆動開発 Specification Driven Development (SDD) Web Project

「仕様駆動開発 (Specification Driven Development)」書籍のためのWebサイトおよびデモアプリケーションのリポジトリです。
Cloudflareのエコシステムを活用し、サーバーレスかつハイパフォーマンスな構成で構築されています。

## 🏗 アーキテクチャ

このプロジェクトは以下の「JAMstack / Serverless」構成を採用しています。

* **Frontend:** Cloudflare Pages (GitHub連携)
    * 静的サイトホスティング。`index.html`, CSS, JS等を配信。
* **API Server:** Cloudflare Workers
    * バックエンドロジック。フロントエンドからのリクエストを処理し、生成AI (Gemini) と連携。
* **AI Integration:** Google Gemini API
    * ユーザーからの入力に対する応答生成。
* **Database:** Cloudflare KV (Key-Value Storage)
    * 軽量なデータ永続化（ログ保存など）。

## 📂 ディレクトリ構成（推奨）

```text
.
├── public/              # フロントエンド用ファイル
│   └── index.html
├── src/                 # バックエンド(Workers)用コード
│   └── worker.js
├── wrangler.toml        # Cloudflare設定ファイル
└── README.md
````

## 🚀 セットアップ手順

### 1\. 前提条件

  * Cloudflare アカウント
  * GitHub アカウント
  * Google AI Studio (Gemini API Key) の取得

### 2\. フロントエンド (Cloudflare Pages)

1.  このリポジトリをGitHubにPushします。
2.  Cloudflare Dashboard \> **Workers & Pages** \> **Create Application** \> **Pages** \> **Connect to Git** を選択。
3.  `elvezjp/SDD` リポジトリを選択して連携します。
4.  Build settings等は、静的HTMLの場合はデフォルト（空白）で構いません。

### 3\. API & DB (Cloudflare Workers & KV)

#### KV (データベース) の作成

Cloudflare Dashboardにて：

1.  **Workers & Pages** \> **KV** へ移動。
2.  `Create Namespace` をクリックし、名前（例: `sdd-kv`）を入力して作成。

#### Workers (API) の作成

1.  **Workers & Pages** \> **Create Application** \> **Worker** で新規作成。
2.  以下の設定を行います。

**環境変数 (Settings \> Variables):**

  * `GEMINI_API_KEY`: Google AI Studioで取得したキー（Encrypt推奨）。

**KV バインディング (Settings \> Variables \> KV Namespace Bindings):**

  * Variable name: `MY_KV_DB`
  * KV Namespace: 先ほど作成した `sdd-kv` を選択。

## 💻 サンプルコード

### API Server (`src/worker.js`)

```javascript
export default {
  async fetch(request, env, ctx) {
    // CORS設定 (適宜ドメイン制限を行ってください)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    try {
      const reqBody = await request.json();
      const userPrompt = reqBody.prompt || "Hello";

      // Gemini API 呼び出し
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] })
      });

      if (!geminiResponse.ok) throw new Error("Gemini API Error");
      
      const geminiData = await geminiResponse.json();
      const aiText = geminiData.candidates[0].content.parts[0].text;

      // Cloudflare KV へログ保存
      await env.MY_KV_DB.put("last_log", JSON.stringify({ prompt: userPrompt, response: aiText, time: new Date().toISOString() }));

      return new Response(JSON.stringify({ reply: aiText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  },
};
```

### Frontend (`public/index.html`)

※ `WORKER_URL` はデプロイしたWorkersのURLに書き換えてください。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>SDD Book Demo</title>
</head>
<body>
    <h1>仕様駆動開発 (SDD) AI Chat</h1>
    <textarea id="promptInput" placeholder="質問を入力..."></textarea>
    <button onclick="sendToWorker()">送信</button>
    <div id="result"></div>

    <script>
        // WorkersのURLを設定
        const WORKER_URL = "https://<YOUR-WORKER-ID>.workers.dev";

        async function sendToWorker() {
            const prompt = document.getElementById('promptInput').value;
            document.getElementById('result').innerText = "生成中...";
            
            const res = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();
            document.getElementById('result').innerText = data.reply || data.error;
        }
    </script>
</body>
</html>
```
