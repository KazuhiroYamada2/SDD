# Business-hours availability measurement

## 月次稼働率はJSTの業務時間を5分ごとに測る

Phase 1の正式な稼働率はcalendar month単位で算出する。対象はAsia/Tokyoの月曜日から金曜日、`09:00 <= time < 18:00`で、5分ごとに1 sampleを期待する。09:00と17:55は含み、18:00は含まない。日本の祝日・会社休日と予定maintenanceは自動除外しない。

稼働率は`successful expected samples / total expected samples * 100`で求める。CloudWatch datapointがないslotはmissingとしてfailure側へ数え、分母から除外しない。raw ratioが99.0%以上ならPASS、未満ならFAILとする。表示上の丸め値で判定しない。

## CanaryはFrontendとBackend・DB readinessを確認する

`infra/monitoring.yaml`のCloudWatch Synthetics Canaryは、JSTの平日09:00～17:55に相当するUTCの月曜日～金曜日00:00～08:55に5分間隔で動く。1 runでpublicなFrontend HTTPS URLが2xxであることと、Backendの`GET /health/ready`が200かつ`{"status":"ready"}`であることを確認する。どちらかが失敗すればrun全体をfailureとする。

CanaryはloginやCustomer CRUDを行わず、認証credentialやproduction dataを扱わない。artifactは暗号化した専用S3 bucketへ保存し、31日で削除する。T-607 Alarmはリアルタイム検知、T-608は月次の業務時間稼働率測定として併用する。

## 月次reportを実行する

AWS認証contextと`AWS_REGION`を準備し、CloudFormation outputのCanary名を指定する。

```powershell
npm.cmd --prefix backend run availability:report -- --month 2026-09 --canary-name <canary-name>
```

CLIはmonth、timezone、target、expected、success、failed、missing、availabilityPercent、resultをJSONで出力する。FAILはexit code 2、入力・AWS access等のsystem errorはexit code 1とする。過去月は月全体、当月は実行時点以前のslotだけを対象とし、未来月は拒否する。

## FAILは測定結果としてescalationする

99%未満の場合は自動停止を行わない。Frontend・CloudFront、ALB・Backend、RDS、missing datapoint、Canary設定の順に切り分け、[統合運用マニュアル](operations-manual.md)のincident・escalation手順へ接続する。report、CloudWatch metric、関連Alarm、調査結果を証跡として残し、credential、PII、完全なciphertextを含めない。

実AWS Canaryのdeploy後は月次reportを継続実行する。local fixtureによる計算器Acceptanceは実Production稼働率の測定値ではない。
