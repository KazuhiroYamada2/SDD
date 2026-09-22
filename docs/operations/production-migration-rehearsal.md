# Production migration rehearsal runbook

## 目的と適用範囲

本番移行のforward手順とrollback判断を、ProductionやAWS resourceに触れず、専用のlocal PostgreSQLで事前検証する。localの`pg_dump`・`pg_restore`は手順とdata recoverabilityの検証に使う。本番backupの正式手段は、[Production backup・restore runbook](production-backup-restore.md)で定めるRDS manual snapshot、automated backup、PITRである。

本番作業の全体判断、連絡、監視は[Phase 1統合運用マニュアル](operations-manual.md)を参照する。予定作業では[Maintenance notification runbook](maintenance-notification.md)に従い、INITIAL通知、開始前のREMINDER、maintenance開始確認を終えてから移行を始める。

## Migration manifest

| 順序 | Migration | 前提 | 検証 | Rollback treatment |
| --- | --- | --- | --- | --- |
| 1 | `001_create_core_schema.sql` | release前baselineで適用済み | core table、index、FK | pre-change snapshot/PITRから分離環境へrestore |
| 2 | `002_create_customer_migration_ledger.sql` | 001適用済み | ledger schema、FK、一意制約 | 同上 |
| 3 | `003_create_maintenance_notifications.sql` | 001適用済み | event・delivery table、FK、制約 | 同上 |
| 4 | `004_add_maintenance_first_attempted_at.sql` | 003適用済み | column、backfill、attempt順序制約 | reverse SQLを基本方式にせず、pre-change snapshot/PITRを検証後に復旧判断 |
| 5 | T-701 Customer data migration | 001・002、owner users、暗号設定 | 40 = 31 inserted + 9 rejected、active 28 / deleted 3、ledger、暗号化 | pre-change snapshot/PITRを分離環境へrestoreし、dataを確認して復旧判断 |

同じreleaseで適用するmigrationはmanifest順を変えない。Schema migrationは検証済みschema stateを確認して適用済みならskipし、SQLを重ねて実行しない。Production server起動時の自動migrationは禁止する。

## Rehearsalの実行

PostgreSQL 16 client toolsと既存E2E PostgreSQLを準備し、repository rootから次を実行する。

```powershell
$env:PG_DUMP_PATH = 'PostgreSQL 16 pg_dump executable path'
$env:PG_RESTORE_PATH = 'PostgreSQL 16 pg_restore executable path'
npm.cmd run migration:rehearse
```

scriptは`NODE_ENV=e2e`、`127.0.0.1:55432`、専用E2E接続元、許可されたDB名、接続先identityを検証する。条件外では開始しない。本番credentialやProduction encryption keyは使用しない。

実行順は次のとおりである。

1. PostgreSQL version、client tool、接続先、baseline schema、暗号化状態、artifact作成条件を確認する。
2. release直前baselineとして001～003を専用rehearsal DBへ適用する。
3. schema・data変更前にcustom-format dumpを作成し、non-emptyとsecret非同梱を確認する。
4. 004を適用し、T-701 fixtureをmigrationする。
5. schema、FK、row count、ledger、`enc:v1`、plaintext残存0を確認する。
6. `/health/live`、`/health/ready`、authorized Customer readをsmoke確認する。
7. T-701を再実行し、31件が`already_migrated`となり二重登録されないことを確認する。
8. pre-change dumpを別のrollback DBへrestoreし、baseline schema、row count、FK、Customer暗号化状態を比較する。
9. temporary DB、dump、temporary fileを削除する。

machine-readable summaryにstepごとのPASS/FAIL、件数、所要時間を出力する。credential、鍵、PII、完全なciphertextは出力しない。

## 本番移行手順

1. maintenance開始とapplication write停止、または利用者影響開始を確認する。
2. DB接続、version、schema prerequisite、暗号設定、plaintext残存、容量をpre-checkする。
3. manual RDS snapshotの完了、KMS encryption、14日retentionを確認する。
4. manifest順にschema migrationを実行する。
5. data migrationを実行する。
6. schema、FK、件数、ledger、reject、暗号化、reconciliationを検証する。
7. 検証がすべてPASSしてからapplicationをrolloutする。
8. `live`、`ready`、代表read、CloudWatch Alarmを確認する。
9. serviceを再開し、件数・data整合と運用証跡を記録する。

## Rollback判断と復旧

次のいずれかがあればapplication rolloutを止め、rollbackを検討する。

- schema migration failure
- data migrationのsystem error
- reconciliation不一致
- plaintext残存またはdecrypt不能
- criticalなFK・data integrity failure
- application startup failure
- readinessの継続FAIL

T-701仕様どおりの9件のdata-quality rejectだけをrollback triggerにはしない。

rollbackはDBをその場で逆SQLにより戻す方式を基本としない。RDS snapshotまたはPITRをtemporary RDSへrestoreし、schema、table、FK、row count、暗号化、authorized decryptを確認してから復旧方法を決定する。Production DBをrestore testで直接上書きしない。DB recoveryと同時にapplication revisionのrollback要否も判断する。repositoryに旧binaryがないlocal rehearsalでは、DB rollbackだけを実測し、旧application binaryの起動は未実施として扱う。

## 証跡とRPO・RTO

作業時刻、manifest、backup/snapshot ID、migration結果、reject・reconciliation、health、rollback判断、restore検証、cleanupを記録する。RPO 5分以内、RTO 60分以内は運用目標であり、local rehearsal時間だけでAWS本番RTOを保証しない。本番restore能力とRTOは四半期restore drillで継続検証する。
