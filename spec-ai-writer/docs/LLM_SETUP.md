# LLMプロバイダー セットアップガイド

Spec AIライターは以下のLLMプロバイダーに対応しています。使用するプロバイダーのセクションを参照してセットアップしてください。

| プロバイダー | 特徴 | 推奨用途 |
|-------------|------|---------|
| Claude (Anthropic API) | 高品質な日本語対応、仕様書生成に最適 | 個人・チーム開発 |
| OpenAI (公式) | GPT-5系対応 | OpenAIを既に利用中の場合 |
| OpenRouter | 100以上のモデルを単一APIで切替可能 | 複数モデルを試したい場合 |
| ローカルLLM (Ollama / LM Studio / llama.cpp) | API料金不要、オフライン動作、データ外部送信なし | プライバシー重視・検証用途 |
| AWS Bedrock | 既存AWSインフラ統合、IAM管理 | エンタープライズ環境 |

> **Web UI からの設定**: 上記プロバイダーのほとんどは、Web ダッシュボードの「設定」ページから編集・即時反映できます。`.env` を編集してサーバーを再起動する必要はありません。変更は `data/llm_settings.json` に保存され、環境変数よりも優先されます。
>
> **注意**: `data/llm_settings.json` は API キーを**平文**で保存します（`.env` と同じリスクモデル）。共有マシンでの使用は避け、ファイルパーミッションは自動的に `0600` に設定されます。

---

## Claude (Anthropic API)

### セットアップ

1. Anthropic APIキーを取得: https://console.anthropic.com/

2. `.env`ファイルを設定:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEFAULT_LLM_PROVIDER=claude
```

### モデルの例

| モデル | モデルID |
|--------|---------|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |

モデルIDは[Anthropic API モデルページ](https://platform.claude.com/docs/en/about-claude/models/overview)を、料金は [Anthropic API 料金ページ](https://platform.claude.com/docs/en/about-claude/pricing) を確認してください。

### トラブルシューティング

#### エラー: "Authentication error"

**原因**: APIキーが無効または未設定

**解決策**:
- `.env`ファイルの`ANTHROPIC_API_KEY`を確認
- キーが`sk-ant-`で始まることを確認

#### エラー: "Rate limit exceeded"

**原因**: レート制限に達した

**解決策**:
- しばらく待ってから再試行
- Anthropic ConsoleでUsage Tierを確認

---

## OpenAI

### セットアップ

1. OpenAI APIキーを取得: https://platform.openai.com/api-keys

2. `.env`ファイルを設定:
```env
OPENAI_API_KEY=your_openai_api_key_here
DEFAULT_LLM_PROVIDER=openai
```

### モデルの例

| モデル | モデルID |
|--------|---------|
| GPT-5.2 | `gpt-5.2` |
| GPT-5.2 Pro | `gpt-5.2-pro` |

料金は [OpenAI API 料金ページ](https://openai.com/api/pricing/) を確認してください。

### トラブルシューティング

#### エラー: "Incorrect API key provided"

**原因**: APIキーが無効

**解決策**:
- `.env`ファイルの`OPENAI_API_KEY`を確認
- OpenAI Dashboardでキーが有効か確認

#### エラー: "Rate limit reached"

**原因**: レート制限またはクォータ超過

**解決策**:
- OpenAI DashboardでUsageを確認
- 必要に応じてUsage Limitを引き上げ

---

## OpenRouter

[OpenRouter](https://openrouter.ai/) は 100 以上の LLM を単一 API で切り替えられるサービスです。Spec AI ライターは OpenAI 互換エンドポイントとして接続します。

### セットアップ

1. OpenRouter API キーを取得: https://openrouter.ai/keys
2. 使用したいモデル ID を確認: https://openrouter.ai/models
3. `.env` ファイルを設定:

```env
DEFAULT_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=anthropic/claude-3.5-sonnet
```

または Web UI の「設定」ページでプリセット **「OpenRouter」** を選び、API キーとモデル ID を入力して保存します。

### モデル ID の例

| モデル | モデル ID |
|--------|----------|
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` |
| GPT-4o | `openai/gpt-4o` |
| Llama 3.1 70B | `meta-llama/llama-3.1-70b-instruct` |
| Gemini Pro 1.5 | `google/gemini-pro-1.5` |

料金は [OpenRouter Models](https://openrouter.ai/models) を確認してください。

### トラブルシューティング

#### エラー: "No auth credentials found"

**原因**: `OPENAI_API_KEY` が設定されていない、または OpenRouter のキーではない

**解決策**:
- [OpenRouter の API キー管理画面](https://openrouter.ai/keys) で発行したキー (`sk-or-v1-...`) を設定
- `.env` または Web UI の設定画面から更新

#### エラー: "Model not found"

**原因**: `OPENAI_MODEL` が OpenRouter の命名規則と異なる

**解決策**:
- `anthropic/claude-3.5-sonnet` のように `provider/model` 形式で指定
- [モデル一覧](https://openrouter.ai/models) から正確な ID をコピー

---

## ローカル LLM (Ollama / LM Studio / llama.cpp)

OpenAI 互換 HTTP API を提供するローカル LLM ランタイムに接続できます。API 料金なし、データが外部に送信されない、オフラインで動作するなどのメリットがあります。

> ⚠️ **品質について**: 小規模モデル (7B 以下) ではインタビュー質問の生成や構造化データ抽出 (JSON) が不安定になる場合があります。**13B 以上** のモデルを推奨します。

### Ollama

1. [Ollama](https://ollama.com/) をインストール
2. モデルをダウンロード:
   ```bash
   ollama pull llama3.1:8b
   # または
   ollama pull qwen2.5:14b  # 推奨: より高品質
   ```
3. `.env` ファイルを設定:
   ```env
   DEFAULT_LLM_PROVIDER=openai
   OPENAI_BASE_URL=http://localhost:11434/v1
   OPENAI_MODEL=llama3.1:8b
   # OPENAI_API_KEY は不要 (空欄で OK)
   ```
4. Ollama サーバーが起動していることを確認:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### LM Studio

1. [LM Studio](https://lmstudio.ai/) をインストール
2. モデルをダウンロード (GGUF 形式)
3. LM Studio の「Local Server」タブから OpenAI 互換サーバーを起動 (デフォルト: `http://localhost:1234`)
4. `.env` ファイルを設定:
   ```env
   DEFAULT_LLM_PROVIDER=openai
   OPENAI_BASE_URL=http://localhost:1234/v1
   OPENAI_MODEL=local-model  # LM Studio は任意の値でOK
   ```

### llama.cpp (OpenAI 互換モード)

```bash
./llama-server -m models/your-model.gguf --port 8080
```

```env
DEFAULT_LLM_PROVIDER=openai
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_MODEL=local-model
```

### Web UI からの設定

Web ダッシュボードの「設定」ページで、プロバイダに **「OpenAI / OpenRouter / ローカル LLM」** を選び、プリセットから **「Ollama (ローカル)」** または **「LM Studio (ローカル)」** を選択すると Base URL が自動入力されます。

### トラブルシューティング

#### エラー: "Connection refused"

**原因**: ローカル LLM サーバーが起動していない

**解決策**:
- Ollama: `ollama serve` で起動確認、または `ollama run <モデル名>` で自動起動
- LM Studio: アプリケーションの「Local Server」タブで Start をクリック
- ポートが `.env` の設定と一致しているか確認

#### エラー: インタビュー質問が壊れる / JSON 抽出に失敗する

**原因**: モデルの能力不足。小規模モデルでは日本語の指示追従や JSON 出力の整合性が不足する

**解決策**:
- より大きいモデルに切替 (13B 以上を推奨)
- 量子化レベルを上げる (Q5_K_M 以上を推奨)
- インタビュー途中で生成に失敗した場合は、Claude または OpenRouter に一時的に切り替えて先に進めることを検討

---

## AWS Bedrock

AWS Bedrockを使用すると、既存のAWSインフラ内でClaudeモデルを実行できます。

> **依存ライブラリ**: Bedrock クライアントは `aiobotocore` を使用します。（`boto3` ではありません）

### メリット

- 既存のAWSインフラ統合: 他のAWSサービスと同じVPC・IAMで管理
- コンプライアンス対応: 企業のセキュリティポリシーに準拠
- プライベートネットワーク: VPC Endpointでインターネット経由のアクセス不要
- 監査ログ: CloudTrailで全API呼び出しを記録

### 前提条件

- AWSアカウント
- AWS CLI設定済み、またはAWS認証情報

### セットアップ

#### ステップ1: AWS Bedrockでモデルアクセスを有効化

1. AWS Consoleにログイン
2. リージョンを選択 (推奨: `ap-northeast-1`)
3. AWS Bedrock → Model access
4. 「Manage model access」をクリック
5. 「Anthropic」セクションで使用するモデルを有効化 (例: Claude Sonnet 4.6)

#### ステップ2: IAMポリシーの設定

**最小権限ポリシー (推奨)**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6*"
      ]
    }
  ]
}
```

**開発環境用ポリシー (より緩い)**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
```

#### ステップ3: 認証情報の設定

**オプション A: 環境変数 (ローカル開発)**

`.env`ファイル:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=ap-northeast-1
DEFAULT_LLM_PROVIDER=bedrock
```

**オプション B: AWS CLI認証情報 (推奨)**

AWS CLIで設定済みの場合、APIキーは不要:

```bash
aws configure
```

`.env`ファイル:

```env
# AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY は不要
AWS_REGION=ap-northeast-1
DEFAULT_LLM_PROVIDER=bedrock
```

**オプション C: IAMロール (EC2/ECS/Lambda)**

EC2インスタンス、ECS、Lambdaで実行する場合、IAMロールを使用:

1. EC2インスタンスロールにBedrockポリシーをアタッチ
2. `.env`ファイル:

```env
# 認証情報は不要 (IAMロールから自動取得)
AWS_REGION=ap-northeast-1
DEFAULT_LLM_PROVIDER=bedrock
```

### モデルの例

Bedrockでは Cross-Region Inference Profile を使用してモデルにアクセスします。リージョンによって利用可能なモデルやInference Profile IDが異なるため、使用するリージョンのドキュメントを事前に確認してください。

| モデル | Inference Profile ID (東京リージョンの例) |
|--------|----------------------------------------|
| Claude Sonnet 4.6 | `jp.anthropic.claude-sonnet-4-6` |
| Claude Haiku 4.5 | `jp.anthropic.claude-haiku-4-5` |

料金は [AWS Bedrock 料金ページ](https://aws.amazon.com/bedrock/pricing/) を確認してください。

モデルを変更するには、`config/settings.py`を編集してください。

### トラブルシューティング

#### エラー: "Could not connect to the endpoint URL"

**原因**: リージョンが正しくない、またはBedrockが利用できないリージョン

**解決策**:
```env
AWS_REGION=ap-northeast-1  # 正しいリージョンに変更
```

#### エラー: "AccessDeniedException"

**原因**: IAMポリシーが不足、またはモデルアクセスが有効化されていない

**解決策**:
1. AWS Console → Bedrock → Model accessでモデルを有効化
2. IAMポリシーで`bedrock:InvokeModel`権限を付与

#### エラー: "ValidationException: The provided model identifier is invalid"

**原因**: モデルIDが間違っている、またはリージョンで利用不可

**解決策**:
```bash
# 利用可能なモデルを確認
aws bedrock list-foundation-models --region ap-northeast-1 \
  --query 'modelSummaries[?contains(modelId, `claude`)].modelId'
```

#### エラー: "ThrottlingException"

**原因**: レート制限に達した

**解決策**:
- リクエスト頻度を下げる
- AWS Supportにクォータ引き上げを依頼

### 参考: セキュリティのベストプラクティス

#### 1. 最小権限の原則

必要なモデルのみに権限を付与:

```json
{
  "Resource": [
    "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6*"
  ]
}
```

#### 2. VPC Endpointの使用

インターネット経由のアクセスを回避:

```bash
# VPC Endpointを作成
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.ap-northeast-1.bedrock-runtime \
  --route-table-ids rtb-xxx
```

#### 3. CloudTrailで監査

全API呼び出しをログ記録:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=InvokeModel
```

#### 4. 環境変数の保護

本番環境では、`.env`ファイルではなくAWS Secrets Managerを使用:

```python
import boto3
import json

def get_secret():
    client = boto3.client('secretsmanager')
    secret = client.get_secret_value(SecretId='spec-ai-writer-config')
    return json.loads(secret['SecretString'])
```

---

**関連リンク**:
- [Anthropic API ドキュメント](https://docs.anthropic.com/)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [AWS Bedrock 公式ドキュメント](https://docs.aws.amazon.com/bedrock/)
