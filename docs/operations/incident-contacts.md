# Incident contacts

## 連絡先の管理方針

この文書はPhase 1のrole-based contact matrixを定義する。連絡先の実値は記載しない。実在人物の氏名、email、電話番号、AWS account情報は、Git repository外のアクセス制御された「Production operations contact roster」で管理する。運用者はincident対応前にrosterを参照し、定期的な連絡訓練では閲覧権限、当番情報、連絡経路が最新であることを確認する。

## Contact matrix

| Role | 責務 | 連絡する条件 | Escalation順 | Official contact information |
| --- | --- | --- | --- | --- |
| Operations Primary | Alarm確認、severity判定、一次切り分け、記録開始 | すべてのSEV1・SEV2、対応が必要なAlarm | 最初 | Git外のcontrolled operations roster |
| Operations Secondary | Primaryの支援・代行、証跡記録 | Primaryが応答しない、並行対応が必要 | Primaryの次 | Git外のcontrolled operations roster |
| Application Owner | Backend、ECS、ALB、application errorの判断 | process異常、5xx、deploy起因、機能停止 | Primaryから対象ownerへ | Git外のcontrolled operations roster |
| Database Owner | RDS、data integrity、backup・restoreの判断 | DB unavailable、storage、latency、破損、backup・restore失敗 | Primaryから対象ownerへ | Git外のcontrolled operations roster |
| Security Contact | security incidentの判断と封じ込め | credential・key漏えい疑い、不正アクセス、PII incident | severity判定直後に早期追加 | Git外のcontrolled operations roster |
| Business / Service Owner | 利用者影響、maintenance・復旧方針、対外報告の判断 | SEV1、長期化するSEV2、業務判断が必要 | 技術ownerの後、必要時は直ちに | Git外のcontrolled operations roster |
| AWS Support | AWS managed serviceの調査支援 | RDS・ECS・ALB等のAWS infrastructure issueで内部切り分けだけでは解消できない | Database/Application Ownerの判断後 | AWS Support Centerの正式手段 |

AWS Support planの契約levelはこのrepositoryでは規定しない。認証情報は転記しない。AWS account ID、support PIN、credentialは、incident ticket、作業メモ、repositoryのいずれにも残さない。

## Severity別escalation

| Severity | Escalation |
| --- | --- |
| SEV1 | Operations Primary → Application Owner / Database Owner → Business / Service Owner。Security incidentはSecurity Contactを早期に含め、AWS infrastructure issueは必要に応じAWS Supportへ連絡する |
| SEV2 | Operations Primary → 対象system owner → 未解消または利用者影響継続時にBusiness / Service Owner |
| SEV3 | 通常運用ticketまたはbacklog。重大化した場合は再判定してSEV2以上へ移行する |

Primaryが所定時間内に応答しない場合はSecondaryが引き継ぐ。SEV1は検知後15分以内に一次切り分けを開始する。連絡時はincident ID、severity、発生時刻、影響、安全なerror分類、依頼事項だけを共有し、secret・credential・plaintext PII・完全なciphertext・不要なrecipient一覧を含めない。
