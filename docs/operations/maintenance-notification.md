# Maintenance notification runbook

## 配信方式と事前条件

Phase 1の利用者向けmaintenance通知はAmazon SESのplain text emailで配信する。対象は実行時点でactiveなstaff・manager・adminであり、Customerのemailは使用しない。ProductionではECS Task RoleからSESへアクセスし、`AWS_REGION=ap-northeast-1`とSES verified identityの`MAINTENANCE_FROM_EMAIL`をenvironmentへ設定する。AWS credentialや実送信元をrepositoryへ保存しない。

schema migrationはapplication起動時に実行しない。重要変更前snapshot、`003_create_maintenance_notifications.sql`適用、table・constraint検証、application rolloutの順に進める。

## 予定maintenance

1. 次のCLIでPLANNED eventを作成する。
2. 原則3営業日前までにINITIALを配信する。
3. target・sent・failed・skipped件数とDB delivery recordを確認する。
4. 開始1時間前にREMINDERを配信する。
5. delivery結果を再確認する。
6. failedがあれば同じsend commandを再実行し、未解消ならT-607のincident経路へescalationする。

```powershell
npm.cmd --prefix backend run maintenance -- create --type planned --starts-at <ISO8601> --expected-recovery-at <ISO8601> --impact <text> --contact <text>
npm.cmd --prefix backend run maintenance -- send --event-id <uuid> --phase initial
npm.cmd --prefix backend run maintenance -- send --event-id <uuid> --phase reminder
```

営業日calendarとschedulerはPhase 1では実装しない。運用者はT-007の期限を確認してCLIを実行する。

## 緊急maintenance

実施決定後、可能な限り速やかにEMERGENCY eventを作成して配信する。結果確認、retry、escalationは予定maintenanceと同じである。

```powershell
npm.cmd --prefix backend run maintenance -- create --type emergency --starts-at <ISO8601> --expected-recovery-at <ISO8601> --impact <text> --contact <text>
npm.cmd --prefix backend run maintenance -- send --event-id <uuid> --phase emergency
```

## Delivery recordとretry

`maintenance_events`がevent、`maintenance_notification_deliveries`がevent・phase・recipient単位の配信履歴である。同じevent・phase・recipientのSENTは再送せずskipする。FAILEDはCLI再実行時にPENDINGへ戻してretryする。新たにactiveになったuserは未記録であれば対象とし、inactive userは対象外とする。

PENDINGは送信処理中または異常終了の可能性があるため、自動再送しない。運用者はSES送信記録とDB recordを照合し、FAILEDへ整理してからretryする。外部送信はDB transactionで取り消せないため、SES送信中に長時間transactionを保持しない。

CLIはtarget・sent・failed・skipped件数だけを出力する。failedが1件以上なら他recipientの成功を維持したままnon-zeroで終了する。recipient email一覧、providerの生error、credentialを出力しない。

## 記録と情報保護

確認queryではevent ID、phase、status、件数、attempted_at、sent_at、safe failure codeだけを使用する。maintenance email本文をaudit_logsへ複製しない。DB failure record、CLI output、logへAWS credential、JWT secret、Customer encryption key、完全なDATABASE_URL、Customer PII、不要なrecipient一覧を出力しない。

