# Phase 1 統合運用マニュアル

## 1. 目的・対象

この文書は、Phase 1 productionの定常運用、監視、障害対応、maintenance、backup・restore、release作業の判断入口である。個別の実行手順は既存runbookを正本とし、この文書へ重複させない。

- 監視とAlarm対応: [Production monitoring runbook](production-monitoring.md)
- DB backup・restore: [Production backup・restore runbook](production-backup-restore.md)
- Maintenance通知: [Maintenance notification runbook](maintenance-notification.md)
- 業務時間稼働率: [Availability measurement](availability-measurement.md)
- 障害時連絡体系: [Incident contacts](incident-contacts.md)

## 2. Production構成概要

| 領域 | Phase 1構成 |
| --- | --- |
| Region | AWS `ap-northeast-1` |
| Frontend | Amazon S3 + Amazon CloudFront |
| Backend | Amazon ECS on Fargate + Application Load Balancer |
| Database | Amazon RDS for PostgreSQL 16 Multi-AZ |
| Monitoring | Amazon CloudWatch |
| Alert | CloudWatch Alarm / RDS Event → Amazon SNS → 運用担当メール |
| Secrets | AWS Secrets ManagerからECS Taskへenvironment injection |

## 3. Daily operation

日次確認では、ECSのdesired/running task、ALBのhealthy target、主要Alarm、RDS event、automated backup、FreeStorageSpaceを確認する。異常があれば、Alarm名、検知時刻、対象resource、直近の変更だけを運用記録へ残し、次節以降の手順へ進む。secretやPIIは転記しない。

## 4. Health確認

| `live` | `ready` | 判断 | 一次確認 |
| --- | --- | --- | --- |
| 200 | 200 | processとDB接続が利用可能 | ALB targetと主要Alarmを確認 |
| 200 | 503 | processは生存、DB依存が利用不可 | RDS、network、TLS、DB connection、poolを確認 |
| 到達不可 | 503または到達不可 | process、ECS task、ALB経路の異常候補 | ECS task、ALB target、application終了・再起動履歴を確認 |

`GET /health/live`はDB queryを行わない。`GET /health/ready`はDBへ`SELECT 1`を実行し、ALB health checkも`/health/ready`を使用する。詳細はmonitoring runbookを参照する。

## 5. Monitoring / Alarm

Alarm thresholdの正本は`infra/monitoring.yaml`である。数値を変更する場合は、実績と変更理由を記録する。

| Alarm・event | 確認対象 | 初動 | Escalation条件 |
| --- | --- | --- | --- |
| ECS CPU / Memory | task別resource、再起動、直近deploy、traffic | 影響範囲と継続時間を確認 | service影響、再起動継続、resource枯渇 |
| ALB Healthy / UnHealthy Host | Target Group reason、ECS task、readiness | `live`・`ready`を比較 | available target 0、複数target異常 |
| Target 5xx | request ID、application log、直近変更 | 発生APIと件数傾向を確認 | 継続増加、主要機能停止 |
| Target response time | ECS resource、DB latency、pool待ち | applicationとDBを分離して確認 | 利用者影響が継続 |
| RDS CPU / Connections / Memory | query負荷、接続、長時間transaction | 異常queryと接続増加を確認 | DB unavailableまたは枯渇傾向 |
| RDS FreeStorageSpace | 増加傾向、log、storage autoscaling | 容量消費源を特定 | critical継続、書込停止のおそれ |
| RDS Read / Write latency | query、I/O、backup、maintenance | 発生時間帯と負荷を確認 | service性能への継続影響 |
| RDS availability / failure event | DB状態、Multi-AZ event、接続 | DB Ownerを含めて切り分け | unavailable、failover失敗 |
| RDS backup event | automated backupとPITR状態 | RDS Consoleとeventを照合 | backup failure、PITR要件未達 |

## 6. Incident対応

### Severity

| Severity | 判断基準 | 初動 |
| --- | --- | --- |
| SEV1 | service利用不能、DB unavailable、重大data corruption、security incident | 検知後15分以内に一次切り分けを開始し、直ちにescalation |
| SEV2 | 一部機能停止、継続的5xx、性能劣化、backup failure | Operations Primaryが対象ownerと調査し、未解消ならService Ownerへescalation |
| SEV3 | 利用継続可能な軽微な異常、単発Alarm、非緊急の運用問題 | 通常運用ticketまたはbacklogで追跡 |

### Response flow

Alarm受信後、incident認定、severity判定、影響確認、application・DB・networkの切り分け、rollback・restore判断、service recovery、data reconciliation、関係者報告、post-incident reviewの順に進める。

DB破損や誤更新ではproduction DBへ直接restoreしない。temporary RDSへrestoreしてdataを確認した後、recovery方法を判断する。SEV1と重大SEV2は復旧後にtimeline、影響、root cause、検知、復旧、再発防止、監視・runbook改善を確認する。個人への責任追及を目的にしない。

## 7. DB backup / restore

正式方式はRDS automated backupとPITRで、retentionは7日である。重要変更前にはmanual snapshotを取得し、14日保持する。運用目標はRPO 5分以内、RTO 60分以内である。local restore時間はAWS productionのRTO保証に使用しない。復旧・検証手順はbackup・restore runbookに従う。

## 8. Maintenance notification

予定maintenanceは原則3営業日前までにINITIALを配信し、開始1時間前にREMINDERを配信する。緊急maintenanceは決定後、速やかにEMERGENCYを配信する。CLIはevent作成と配信を担い、自動schedulerはない。FAILEDはretryし、未解消ならincidentとしてescalationする。コマンドとdelivery確認はmaintenance notification runbookに従う。

## 9. Secret rotation

| Secret | 定期rotation | 緊急時 |
| --- | --- | --- |
| DB credential | 90日 | 漏えいまたは疑いを検知した時点で即時 |
| JWT secret | 90日 | 即時。既存30分tokenの無効化を許容 |
| Customer encryption key | 180日 | 即時に新keyへ切替手順を開始 |

Customer encryption keyは、新keyをkey ringへ追加し、current keyを切り替え、one-shot re-encryption migrationを実施する。旧key IDを使うciphertextが0件であることを確認してから旧keyを削除する。secret実値は運用文書やincident記録へ記載しない。

## 10. Migration / release前後確認

重要変更では、manual snapshotの完了と暗号化を確認し、schema・data migration、migration verification、application rolloutの順に進める。migrationが失敗した場合はrolloutを続行しない。Production起動時のautomatic migrationは禁止する。Customer migrationはrepositoryのT-701 CLIと記録済みAcceptanceに従い、件数、reject、reconciliationだけを証跡に残す。

## 11. Escalation / contact

連絡順、責務、Git外contact rosterの参照方法はincident contactsを正本とする。Security incidentではSecurity Contactを早期に含める。Database infrastructure issueではDatabase Ownerと、必要に応じてAWS Supportを含める。AWS account ID、support credential、実在人物の連絡先はrepositoryへ保存しない。

## 12. Quarterly restore drill

四半期ごとにtemporary RDSへrestoreし、schema、主要table、FK、代表row count、Customerの`enc:v1`、authorized decrypt、cleanupを確認する。失敗はincidentとしてescalationし、原因解消後に成功を再確認するまでrecoverableと判定しない。

## 13. 記録・証跡

incidentでは発生時刻、検知元、severity、影響、一次対応開始時刻、実施内容、復旧時刻、reconciliation結果を記録する。maintenanceではevent ID、phase、target・sent・failed・skipped件数とdelivery statusを記録する。restore drillでは実施日時、結果、代表件数、所要時間、cleanupを記録する。

## 14. Security / PII注意事項

運用記録、CloudWatch Logs、Alarm、SNS、作業メモには、AWS・DB credential、JWT secret、Customer encryption key、完全な`DATABASE_URL`、private contact、plaintext Customer PII、recipient一覧、完全なciphertext envelopeを記載しない。調査にはresource ID、request ID、event ID、件数、安全なerror分類を使用する。

## Operational scenario walkthrough

| Scenario | Detection | First action | Runbook / Escalation | 通知・復旧確認・証跡 |
| --- | --- | --- | --- | --- |
| A. ALB unhealthy / Backend unavailable | HealthyHostCount、UnHealthyHostCount、到達不可 | ECS task、Target Group、`live`・`ready`を確認 | Monitoring。SEV1ならPrimary→Application/DB Owner | 影響時は関係者通知。healthy復帰、200、Alarm OK、timeline |
| B. live 200 / ready 503 | ALB unhealthy、health比較 | RDS、network、TLS、DB poolを確認 | Monitoring。Database Ownerへescalation | DB復旧後ready 200、Alarm OK、DB確認記録 |
| C. sustained target 5xx | Target 5xx Alarm | request ID、対象API、直近deployを確認 | Monitoring。SEV2、利用不能ならSEV1 | 継続影響時に通知。5xx収束、主要API、reconciliation |
| D. RDS unavailable | RDS event、ready 503、connection error | DB状態とMulti-AZ eventを確認 | Monitoring / Backup。DB Owner、必要ならAWS Support | SEV1通知。ready 200、data reconciliation、event記録 |
| E. RDS storage critical | FreeStorageSpace Alarm | 消費傾向、log、autoscaling設定を確認 | Monitoring。Database Ownerへescalation | 影響予測時に通知。容量安定、Alarm OK、対応記録 |
| F. automated backup failure | RDS backup event | automated backup、retention、PITRを確認 | Monitoring / Backup。SEV2 | 利用者通知は影響時のみ。次回成功、PITR状態、event記録 |
| G. quarterly restore drill failure | drill検証結果 | 作業を停止し失敗項目を保全 | Backup。SEV2としてPrimary→DB Owner→Service Owner | 利用者通知は通常不要。再drill成功、cleanup、drill記録 |
| H. planned maintenance | 運用計画 | event作成、INITIAL、結果確認 | Maintenance。未解消FAILEDはescalation | 3営業日前・1時間前通知、delivery record、復旧確認 |
| I. emergency maintenance | incident・緊急変更判断 | event作成、EMERGENCYを速やかに配信 | Maintenance / Incident。severityに応じる | 緊急通知、delivery record、service recovery、報告 |
| J. notification partial failure | CLI non-zero、FAILED record | 同じphaseをretry | Maintenance。未解消ならOperations Primaryへescalation | 成功recipientは維持。FAILED解消、件数・statusを記録 |
