# LLMプロバイダー セットアップガイド

Spec AIライターは3つのLLMプロバイダーに対応しています。使用するプロバイダーのセクションを参照してセットアップしてください。

| プロバイダー | 特徴 | 推奨用途 |
|-------------|------|---------|
| Claude (Anthropic API) | 高品質な日本語対応、仕様書生成に最適 | 個人・チーム開発 |
| OpenAI | GPT-5系対応 | OpenAIを既に利用中の場合 |
| AWS Bedrock | 既存AWSインフラ統合、IAM管理 | エンタープライズ環境 |

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
| Claude Sonnet 4.6 | `claude-sonnet-4-6-20260217` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |

料金は [Anthropic API 料金ページ](https://platform.claude.com/docs/en/about-claude/pricing) を確認してください。

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

## AWS Bedrock

AWS Bedrockを使用すると、既存のAWSインフラ内でClaudeモデルを実行できます。

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
