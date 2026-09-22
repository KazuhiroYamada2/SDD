# Production backup・restore runbook

## この手順はRDS backupからの復旧判断を統一する

Phase 1のproduction databaseは、AWS `ap-northeast-1`のMulti-AZ Amazon RDS for PostgreSQL 16である。正式なbackupはRDS automated backupとPoint-in-Time Recovery（PITR）を使う。localの`pg_dump`・`pg_restore`検証はdata recoverabilityと手順の技術的妥当性を確認するものであり、AWS productionのRTO実績には使用しない。

運用目標はRPO 5分以内、RTO 60分以内である。RTOは四半期ごとのAWS restore drillで継続測定する。

## Automated backupを毎日確認する

RDS設定と直近のbackup eventをAWS Consoleまたは承認済みの運用toolで確認する。

- automated backupが有効
- retentionが7日
- PITR可能時刻が表示される
- Multi-AZが有効
- RDS instanceとbackupがAWS KMSで暗号化済み
- backup failure alarmがCloudWatch AlarmからSNSを経由して運用担当メールへ届く

確認時にDB credential、Customer encryption key、完全な`DATABASE_URL`を記録しない。

## 重要変更前にmanual snapshotを取得する

重要release、schema migration、Customer migrationの直前にmanual RDS snapshotを作成する。snapshot名には環境、変更識別子、UTC timestampを使い、PIIやsecretを含めない。

1. snapshotを作成する。
2. statusが`available`になるまで待つ。
3. production RDSと同じKMS encryptionが有効であることを確認する。
4. 取得日時と削除予定日を運用記録へ残す。
5. snapshot確認後に変更を開始する。

pre-change snapshotは14日保持し、期間経過後は承認済みprocedureに従って削除できる。Customer encryption keyはsnapshotへ追加保存せず、AWS Secrets Managerで別管理する。

## PITRはtemporary RDSへ実行する

1. incident timelineとRPOを基にrecovery timestampを決める。
2. productionとは別名・別endpointのtemporary RDSへPITRする。
3. security groupとIAM accessを運用担当者の最小権限に限定する。
4. 次節のrestore verificationを実行する。
5. 検証結果を基にrollback、data抽出、endpoint切替等のrecovery方法を決める。

production DBへrestore結果を直接上書きしない。

## Snapshotもtemporary RDSへrestoreする

PITRと同様にproductionから分離したtemporary RDSへrestoreする。snapshotのKMS encryption、PostgreSQL major version、parameter group、network accessを確認してから検証する。

## Restore後にdata integrityと復号を確認する

最低限、次を確認する。

- schemaと主要table（`users`、`customers`、`activities`、`sales_records`、`audit_logs`、`customer_migration_ledger`）
- foreign key constraint
- sourceまたは承認済み基準との代表row count一致
- Customerのnon-null暗号化対象fieldがvalidな`enc:v1` envelope
- Customer暗号化対象fieldのplaintext残存0
- AWS Secrets Managerから許可されたkey ringを一時的にinjectしたapplicationによるrepresentative authorized decrypt
- DB backupとSecrets Manager値が同一artifactへ保存されていないこと

secret、credential、plaintext PII、完全なciphertext envelopeを作業logへ出力しない。

## Restore drillの失敗はincidentとして解消する

四半期に1回restore drillを行う。restore failure、data integrity不一致、decrypt failureは未解消incidentとしてCloudWatch Alarm・SNSの運用経路で扱い、原因を修正して成功を再確認する。backupが存在するだけでrecoverableとは判定しない。

検証後はtemporary RDS、temporary security rule、local dumpを削除する。必要な結果は件数、status、所要時間、実施者、incident IDだけを残す。

## Local verificationは標準PostgreSQL toolで再現する

PostgreSQL 16互換の`pg_dump`と`pg_restore`をPATHへ配置するか、`PG_DUMP_PATH`と`PG_RESTORE_PATH`で実行fileを指定する。credentialは`DATABASE_URL`からprocess内で分離し、passwordをcommand argumentへ渡さない。

```powershell
npm.cmd --prefix backend run verify:backup-restore
```

このcommandは専用E2E PostgreSQLをsourceとし、custom-format dumpを一時生成して`customer_management_restore_t702`へrestoreする。schema、主要table、FK、row count、envelope、plaintext残存0、authorized decryptを検証後、temporary databaseとdumpを削除する。Docker CLIは使用しない。
