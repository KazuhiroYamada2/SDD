# AWS Bedrock セットアップガイド

このガイドでは、Spec AIライターをAWS Bedrockで使用するための詳細な手順を説明します。

## なぜAWS Bedrockを使うのか？

AWS Bedrockを使用すると、以下のメリットがあります:

- ✅ **既存のAWSインフラ統合**: 他のAWSサービスと同じVPC・IAMで管理
- ✅ **コンプライアンス対応**: 企業のセキュリティポリシーに準拠
- ✅ **コスト管理**: AWS請求書で一元管理、Savings Plans適用可能
- ✅ **プライベートネットワーク**: VPC Endpointでインターネット経由のアクセス不要
- ✅ **監査ログ**: CloudTrailで全API呼び出しを記録

## 前提条件

- AWSアカウント
- AWS CLI設定済み、またはAWS認証情報
- Python 3.9以上
- boto3ライブラリ

## セットアップ手順

### ステップ1: boto3のインストール

```bash
pip install boto3
```

または、requirements.txtに含まれているので:

```bash
pip install -r requirements.txt
```

### ステップ2: AWS Bedrockでモデルアクセスを有効化

1. AWS Consoleにログイン
2. リージョンを選択 (推奨: us-west-2)
3. AWS Bedrock → Model access
4. 「Manage model access」をクリック
5. 「Anthropic」セクションで以下を有効化:
   - Claude 3.5 Sonnet
   - (オプション) Claude 3 Sonnet
   - (オプション) Claude 3 Haiku

### ステップ3: IAMポリシーの設定

#### 最小権限ポリシー (推奨)

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
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
      ]
    }
  ]
}
```

#### 開発環境用ポリシー (より緩い)

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

### ステップ4: 認証情報の設定

#### オプション A: 環境変数 (ローカル開発)

`.env`ファイル:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
DEFAULT_LLM_PROVIDER=bedrock
```

#### オプション B: AWS CLI認証情報 (推奨)

AWS CLIで設定済みの場合、APIキーは不要:

```bash
aws configure
```

`.env`ファイル:

```env
# AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY は不要
AWS_REGION=us-west-2
DEFAULT_LLM_PROVIDER=bedrock
```

#### オプション C: IAMロール (EC2/ECS/Lambda)

EC2インスタンス、ECS、Lambdaで実行する場合、IAMロールを使用:

1. EC2インスタンスロールにBedrockポリシーをアタッチ
2. `.env`ファイル:

```env
# 認証情報は不要 (IAMロールから自動取得)
AWS_REGION=us-west-2
DEFAULT_LLM_PROVIDER=bedrock
```

### ステップ5: 動作確認

```bash
# プロジェクト開始
sdd start my-bedrock-project

# Bedrockが正しく設定されているか確認
# 最初の質問が表示されればOK
```

## 利用可能なモデル

### Claude 3.5 Sonnet (推奨)

- **モデルID**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **用途**: 高品質な仕様書生成、複雑な質問理解
- **料金**: 入力 $3/MTok、出力 $15/MTok (2024年12月時点)

### Claude 3 Sonnet

- **モデルID**: `anthropic.claude-3-sonnet-20240229-v1:0`
- **用途**: バランスの取れた性能とコスト
- **料金**: 入力 $3/MTok、出力 $15/MTok

### Claude 3 Haiku

- **モデルID**: `anthropic.claude-3-haiku-20240307-v1:0`
- **用途**: 高速・低コスト
- **料金**: 入力 $0.25/MTok、出力 $1.25/MTok

モデルを変更するには、`config/settings.py`を編集してください。

## 対応リージョン

Bedrockは以下のリージョンでClaudeモデルを提供しています:

| リージョン | リージョンコード | レイテンシー (日本から) |
|-----------|----------------|---------------------|
| US West (Oregon) | us-west-2 | 約150ms (推奨) |
| US East (N. Virginia) | us-east-1 | 約180ms |
| Asia Pacific (Tokyo) | ap-northeast-1 | 約10ms (最速) |
| Europe (Frankfurt) | eu-central-1 | 約250ms |

**推奨**: 日本からの利用なら`ap-northeast-1`が最速ですが、モデルの利用可否はリージョンにより異なるため、事前に確認してください。

## トラブルシューティング

### エラー: "Could not connect to the endpoint URL"

**原因**: リージョンが正しくない、またはBedrockが利用できないリージョン

**解決策**:
```env
AWS_REGION=us-west-2  # 正しいリージョンに変更
```

### エラー: "AccessDeniedException"

**原因**: IAMポリシーが不足、またはモデルアクセスが有効化されていない

**解決策**:
1. AWS Console → Bedrock → Model accessでモデルを有効化
2. IAMポリシーで`bedrock:InvokeModel`権限を付与

### エラー: "ValidationException: The provided model identifier is invalid"

**原因**: モデルIDが間違っている、またはリージョンで利用不可

**解決策**:
```bash
# 利用可能なモデルを確認
aws bedrock list-foundation-models --region us-west-2 \
  --query 'modelSummaries[?contains(modelId, `claude`)].modelId'
```

### エラー: "ThrottlingException"

**原因**: レート制限に達した

**解決策**:
- リクエスト頻度を下げる
- AWS Supportにクォータ引き上げを依頼

## セキュリティのベストプラクティス

### 1. 最小権限の原則

必要なモデルのみに権限を付与:

```json
{
  "Resource": [
    "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
  ]
}
```

### 2. VPC Endpointの使用

インターネット経由のアクセスを回避:

```bash
# VPC Endpointを作成
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.us-west-2.bedrock-runtime \
  --route-table-ids rtb-xxx
```

### 3. CloudTrailで監査

全API呼び出しをログ記録:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=InvokeModel
```

### 4. 環境変数の保護

本番環境では、`.env`ファイルではなくAWS Secrets Managerを使用:

```python
import boto3
import json

def get_secret():
    client = boto3.client('secretsmanager')
    secret = client.get_secret_value(SecretId='spec-ai-writer-config')
    return json.loads(secret['SecretString'])
```

### 5. コスト管理

AWS Budgetsでコストアラートを設定:

```bash
# 月$100を超えたらアラート
aws budgets create-budget \
  --account-id xxx \
  --budget file://budget.json
```

## コスト最適化

### 見積もり例

7つのフェーズで平均40回の質疑応答 (入力: 100K tokens、出力: 50K tokens):

```
Claude 3.5 Sonnet:
- 入力: 100K × $3/MTok = $0.30
- 出力: 50K × $15/MTok = $0.75
- 合計: $1.05 / プロジェクト
```

### コスト削減のヒント

1. **適切なモデル選択**: 簡単なフェーズはHaikuを使用
2. **プロンプト最適化**: 不要な履歴を削除
3. **Savings Plans**: 継続利用ならSavings Plansで最大72%割引

## まとめ

AWS Bedrockを使用することで、エンタープライズグレードのセキュリティとコンプライアンスを維持しながら、Spec AIライターを利用できます。

セットアップでお困りの場合は、GitHubのIssuesでお気軽にご質問ください。

---

**関連リンク**:
- [AWS Bedrock公式ドキュメント](https://docs.aws.amazon.com/bedrock/)
- [Claude on Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html)
- [Bedrock料金](https://aws.amazon.com/bedrock/pricing/)
