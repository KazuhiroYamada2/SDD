# Production monitoring runbook

## 監視の目的と通知経路

Phase 1のproduction監視は、AWS `ap-northeast-1`のCloudWatchを使用する。重大な異常はCloudWatch AlarmまたはRDS EventからSNS Topicへ送り、確認済みの運用担当メールへ通知する。実メールアドレスはCloudFormationの`NotificationEmail` parameterとしてdeployment時に指定し、repositoryには保存しない。

CloudFormation stack作成後、受信者はSNSのsubscription confirmationを完了する。未確認のsubscriptionは通知経路として扱わない。Alarmのtest notificationを送り、受信を運用記録へ残してからproduction monitoringを有効と判定する。

## Deployment前の確認

1. `infra/monitoring.yaml`をAWS `ap-northeast-1`へdeployする。
2. ECS cluster/service、ALB、Target Group、RDS DB instance identifier、通知先をparameterで指定する。
3. ALB Target Groupのhealth check pathを`/health/ready`、success codeを`200`に設定する。
4. `GET /health/live`がDBへ接続せず200を返し、`GET /health/ready`がDB正常時200、異常時503を返すことを確認する。
5. SNS email subscriptionをconfirmし、AlarmのALARM/OK通知を受信できることを確認する。

CloudFormation stackは監視resourceだけを管理する。既存のALB Target Groupを作り直さないため、health check設定はECS/ALB deployment側で上記契約に合わせる。

## Alarm一覧

| 対象 | 検知内容 | 初期値 | 一次対応 |
| --- | --- | --- | --- |
| ECS | CPUUtilization | 80%以上が5分継続 | task別CPU、直近deploy、trafficを確認 |
| ECS | MemoryUtilization | 80%以上が5分継続 | task別memory、再起動履歴、memory leak兆候を確認 |
| ALB | HealthyHostCount | 2分続けて1未満。欠測も異常扱い | `/health/ready`、ECS task、DB接続を確認 |
| ALB | UnHealthyHostCount | 2分続けて0超 | Target Group reason codeとreadinessを確認 |
| ALB | HTTPCode_Target_5XX_Count | 5分間に10件以上 | application logをrequest IDで確認 |
| ALB | TargetResponseTime | 平均2秒以上が5分継続 | ECS resource、DB latency、pool待ちを確認 |
| RDS | CPUUtilization | 80%以上が5分継続 | query負荷とconnection数を確認 |
| RDS | DatabaseConnections | 80以上が5分継続 | pool、異常接続、長時間transactionを確認 |
| RDS | FreeableMemory | 256 MiB以下が5分継続 | DB負荷とinstance resourceを確認 |
| RDS | FreeStorageSpace | 10 GiB以下が10分継続 | 増加傾向、log、storage autoscaling設定を確認 |
| RDS | ReadLatency / WriteLatency | 平均100 ms以上が5分継続 | query、I/O、backup・maintenance状況を確認 |

初期値はPhase 1の開始値であり、CloudFormation parameterから変更できる。実績を確認せず閾値を緩和しない。AlarmはALARMとOKへの遷移をSNSへ通知する。INSUFFICIENT_DATA専用通知は設定せず、available target 0を検知する`HealthyHostCount`だけは欠測を異常として扱う。

## RDS eventとbackup監視

Production RDS instanceの`availability`、`failure`、`backup` eventを`AWS::RDS::EventSubscription`でSNSへ送る。backup categoryには開始・完了を含むため、通知内容とRDS Consoleのbackup状態を照合する。backup失敗またはDB availability問題は重大incidentとして扱う。

automated backupは毎日、retention 7日、PITR有効、Multi-AZ、KMS encryption済みであることを既存の[Production backup・restore runbook](production-backup-restore.md)に従って確認する。

## Alarm受信後の一次対応

重大alarmを受信したら15分以内に一次切り分けを開始する。

1. Alarm名、状態遷移時刻、対象resource、直近の変更を確認する。
2. ALB、ECS、RDSの順に影響範囲を確認する。
3. `/health/live`と`/health/ready`を比較し、process障害とDB依存障害を分ける。
4. rollback、task再deploy、PITR・snapshot restoreの要否を判断する。
5. 復旧後にAlarmのOK通知、data reconciliation、利用者・関係者への報告を確認する。
6. incident記録へ時刻、影響、判断、対応、復旧、再発防止を残す。

ALB unhealthyではTarget Group reason code、ECS running task、readiness、DB接続を確認する。HTTP 5xx増加時はrequest IDからgeneric errorの発生箇所を追う。RDS storage alarmでは増加傾向とstorage autoscalingを確認し、alarmだけを無効化しない。

## Restore drillとの接続

四半期に1回、productionとは分離したtemporary RDSへrestoreする。schema、主要table、FK、代表row count、Customerのvalidな`enc:v1`、authorized decrypt、cleanupを確認する。詳細は既存backup・restore runbookに従う。

手動drillの失敗はCloudWatchが自動判定できないため、未解消incidentとして運用担当へ連絡し、同じSNS Topicまたは承認済みincident通知経路でescalationする。原因を解消し、次のrestore成功を確認するまでrecoverableとは判定しない。

## Maintenanceと情報保護

利用者影響を伴う予定maintenanceは原則3営業日前と開始1時間前に通知する。緊急maintenanceは決定後速やかに通知する。このrunbookは新しい通知UIを追加しない。

Health response、CloudWatch Logs、Alarm description、SNS message、incident記録には、DB credential、JWT secret、Customer encryption key、完全な`DATABASE_URL`、plaintext PII、完全なciphertext envelopeを記録しない。
