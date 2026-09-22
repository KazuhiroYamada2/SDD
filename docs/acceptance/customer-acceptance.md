# Customer Management Practice Phase 1 顧客受入テスト・承認記録

## 判定サマリー

Phase 1のTechnical AcceptanceとUAT scenarioはすべてPASSした。顧客受入責任者から2026-09-23付で明示承認を取得したため、Customer decisionを`APPROVED`、T-806をPASS・完了、SDD演習を全Task完了とする。

| 項目 | 結果 |
| --- | --- |
| Project / Phase | Customer Management Practice / Phase 1 |
| Acceptance package作成日 | 2026-09-23 |
| Acceptance date | 2026-09-23 |
| Acceptance scope | F-01～F-14、N-01～N-07 |
| Functional requirements | 14 / 14 PASS |
| Non-functional requirements | 7 / 7 PASS |
| Total requirements | 21 / 21 PASS |
| UAT execution | PASS（既存の自動化済み技術証跡を再利用） |
| Customer validation | Functional 14/14、Non-functional 7/7、UAT 14/14を確認済み |
| Customer decision | **APPROVED** |
| Customer approver | 演習上の顧客受入責任者 |
| Approval date | 2026-09-23 |
| Comment | Phase 1の受入条件を満たしていることを確認した。 |

## 目的と範囲

本書は、Phase 1のRequirement、実装、Verification、UAT scenario、Acceptance evidenceを顧客が業務観点で確認し、承認または否認を明示するための記録である。Technical Acceptance、Customer Acceptance、Customer Approvalを分離し、技術testのPASSを顧客承認として扱わない。

UAT対象は、Authentication、Customer list・search・detail・create・edit・delete、Activity history・create、3 Reports、Users role management、staff・manager・adminのAuthorization、validation・error、およびN-01～N-07である。

## 前提と実施方法

- Technical Acceptanceの母集団はF-01～F-14とN-01～N-07の21 Requirementである。
- 自動化済みUATはBackend 68 files・476 tests、Frontend 15 files・166 tests、Playwright 32 scenarios・92 executions、NFR 7/7、traceability 21/21の既存PASS証跡を再利用した。
- Business flowのActual resultとPASS/FAILは、[06-verification-acceptance.md](../../examples/06-verification-acceptance.md)の記録および既存E2E scenarioへ追跡した。T-806のための再実行は行っていない。
- Customer PII、password、JWT、Authorization header、Cookie、暗号鍵、credential、完全なciphertextは本書へ記載しない。
- Customer commentとApprovalは、2026-09-23に顧客受入責任者から明示された承認内容を記録した。

## UAT checklist

| Scenario ID | Requirement ID | Role | Preconditions | 操作 | Expected result | Actual result | Status | Evidence | Customer comment | Approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-01 | N-03 | staff / manager / admin | active userとLogin画面が利用可能 | 正しい認証情報でLoginし、誤った認証情報、Logout、Browser再読込も確認する | 成功時はroleに応じた業務画面へ進む。失敗時は共通errorとなり、Logout・再読込後は再Loginを求める | Login成功・失敗、protected API 401、Frontendの400・401・server・network error、Logout・再読込を既存testで確認 | PASS | 06「T-605」「T-802」「T-803」、`e2e/auth/login-smoke.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-02 | F-04、F-05、F-12 | staff / manager / admin | role別userとactive Customer fixtureがある | 一覧表示、名前検索、category filter、4 sort、page移動、詳細表示、一覧復帰を行う | 条件どおりのCustomerを表示し、検索状態を維持する。staffは自担当だけを表示し、scope外詳細は404となる | list・search・filter・sort・pagination・detail・状態保持・scope外404を3 Browserで確認 | PASS | 06「T-207」「T-803」、`e2e/customers/customer-crud-list-search.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-03 | F-01、F-13 | staff / manager / admin | 登録可能な入力値とrole別userがある | Customerを登録し、managerの登録拒否も確認する | staffは本人owner、adminは指定ownerで登録でき、managerは403となる。入力不正は保存されない | adminの登録flow、role別UI・Backend Authorization、入力errorを既存testで確認 | PASS | 06「顧客情報登録API/画面」「T-502」「T-802」「T-803」 | 全体承認コメント参照 | APPROVED |
| UAT-04 | F-02、F-13 | staff / manager / admin | active Customerとrole別userがある | 許可fieldを編集し、cancel、scope外、manager拒否を確認する | staffは自担当、adminは全active Customerを編集できる。managerは403、staff scope外は404。保存後は詳細へ反映する | edit・cancel・詳細再取得・403・404・API errorを既存testで確認 | PASS | 06「T-203」「T-502」「T-802」「T-803」 | 全体承認コメント参照 | APPROVED |
| UAT-05 | F-03、F-13 | staff / manager / admin | 削除対象のactive Customerがある | adminで削除し、staff・managerの拒否、削除後の一覧・詳細を確認する | adminだけが論理削除でき、成功後は一覧から除外され、詳細・再削除は404となる。staff・managerは403 | logical delete、role別導線、204後の一覧復帰、削除後404を既存testで確認 | PASS | 06「T-204」「T-207」「T-802」「T-803」 | 全体承認コメント参照 | APPROVED |
| UAT-06 | F-06～F-08、F-12、F-13 | staff / manager / admin | active Customerとrole別userがある | Activity historyを表示し、訪問・商談・次回訪問予定を登録して再表示する | 許可role・scopeで履歴を表示・登録でき、再取得後も保存内容が表示される。managerの登録は拒否される | history、create・再取得、API error、role別登録制御を3 Browserで確認 | PASS | 06「営業活動履歴Playwright」「T-802」「T-803」、`e2e/sales-activity.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-07 | F-09～F-12 | staff / manager / admin | sales_records fixtureと期間条件がある | 売上推移、顧客分類、営業担当者別実績を表示し、期間・0件・画面切替を確認する | manager・adminは3 Reportsを正しい集計・順序で閲覧でき、staffは拒否される。不正期間は送信または表示されない | ST 5件、CC 5件、SP 6件、navigation・validation 4件、smoke 1件を3 Browserで確認 | PASS | 06「レポート最終受入」「T-803」、`e2e/reports/*.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-08 | F-14 | admin | 複数のactive userとadminが存在する | Users一覧を表示し、対象userのroleを変更する。自己変更・最後のactive admin降格も確認する | adminだけが利用でき、role変更後に一覧が更新される。既存business guardは409で維持される | Users表示・role操作・再取得・403・409・自己変更UI無効化を既存testで確認 | PASS | 06「T-503」「T-802」「T-803」、`e2e/authorization/role-authorization.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-09 | F-12～F-14、N-03 | staff / manager / admin | 3 roleの認証済みuserがある | 各roleでCustomer、Activity、Reports、Usersの表示と操作を横断確認する | 03のRole × Operation × Scope表どおりにUIとBackendが許可・403・scope-hidden 404を返す | 4 Authorization scenariosを3 Browserで実行し、role別UIとBackend契約の一致を確認 | PASS | 06「T-501～T-505」「T-803」、`e2e/authorization/role-authorization.spec.ts` | 全体承認コメント参照 | APPROVED |
| UAT-10 | F-01～F-05、N-05 | staff / manager / admin | 正常・不正入力とAPI errorを確認できる | required・invalid入力、400・401・403・404・409・500・503・network error、Request IDを確認する | 入力errorを利用者向けに表示し、内部情報を公開しない。Response、access、auditのrequest IDが一致する | Frontend error state、共通error contract、X-Request-ID、audit correlationを既存Acceptanceで確認 | PASS | 06「T-106」「T-108」「T-606」「T-802」 | 全体承認コメント参照 | APPROVED |
| UAT-11 | N-01、N-02 | 顧客承認者 / 運用担当 | Phase 1性能datasetと測定結果がある | 検索性能と50同時requestの結果を確認する | 100,000 Customerの各検索scenarioがp95 3秒以内。50同時requestは成功率100%、p95 3秒以内 | N-01最遅p95 78.616ms。N-02は8,000/8,000成功、最遅p95 842.520ms | PASS | 06「T-602」「T-603」「T-804」 | 全体承認コメント参照 | APPROVED |
| UAT-12 | N-04、N-05 | 顧客承認者 / セキュリティ担当 | 暗号化・migration・audit Acceptance結果がある | 暗号化保存、認可後復号、migration、access/audit log、PII・secret非記録を確認する | Customer PIIは暗号化保存され、認可範囲だけで復号される。正式auditとrequest correlationが成立し、禁止情報を保存しない | 暗号化・migration・audit action・atomicity・cleanup・secret非記録を実DBで確認 | PASS | 06「T-604」「T-701」「T-702」「T-606」「T-804」 | 全体承認コメント参照 | APPROVED |
| UAT-13 | N-06 | 顧客承認者 / 運用担当 | Health・monitoring・backup/restore・migration rehearsal証跡がある | Health、監視、稼働率判定、backup/restore、移行rehearsalの結果とrunbookを確認する | implementation acceptanceがPASSし、Productionで継続測定する項目が明示される | Health・CloudFormation static validation・availability calculator・local restore・migration rehearsalがPASS | PASS | 06「T-607」「T-608」「T-702」「T-704」「T-804」 | 全体承認コメント参照 | APPROVED |
| UAT-14 | N-07 | 顧客承認者 / 運用担当 | maintenance通知・timing証跡とrunbookがある | 予定・緊急通知、重複抑止、retry、partial failure、timing判定を確認する | INITIAL、REMINDER、EMERGENCYが契約時刻を満たし、失敗時のretryとescalationが可能 | Fake SESと専用E2E PostgreSQLでdelivery 12件、境界A～H、exit 0/2/1を確認 | PASS | 06「T-609」「T-610」「T-703」「T-804」 | 全体承認コメント参照 | APPROVED |

## Acceptance evidence summary

| Evidence | Result | Customer approvalとの関係 |
| --- | --- | --- |
| Backend | 68 files・476 tests PASS、build PASS | Technical Acceptance。顧客承認の代替ではない |
| Frontend | 15 files・166 tests PASS、build PASS | Technical Acceptance。顧客承認の代替ではない |
| Playwright | 32 scenarios・92 executions PASS | 自動化済みUAT evidence。顧客承認の代替ではない |
| NFR | N-01～N-07、7/7 PASS | Implementation Acceptance。Production継続項目を含む |
| Traceability | 21/21、全trace 100% | Requirement coverage evidence |
| Open defects | 0 | 新規問題が見つかった場合は承認前に更新する |
| Open specification gaps | 0 | 同上 |
| Unimplemented requirements | 0 | Phase 1対象外は含めない |
| Unverified requirements | 0 | 顧客承認待ちとは区別する |

## Known limitations・Production operational follow-up

次の項目は正本でLocal/E2Eのimplementation AcceptanceとProduction運用を分離している。Phase 1の実装受入上はFAILではないが、Production運用開始後に継続確認する。

| 項目 | 現在の証跡 | Production follow-up |
| --- | --- | --- |
| AWS resource | CloudFormation static validationまでPASS。未deploy | `ap-northeast-1`へdeploy後、resourceとalarm・SNSを確認 |
| Availability | calculatorとfixtureで99.0%基準を検証 | Production月次・month-to-dateを継続測定 |
| RPO / RTO | local backup/restoreとrehearsalを確認。Local所要時間はProduction実績ではない | RPO 5分・RTO 60分をProduction drillで継続検証 |
| Restore drill | local分離DBへのrestoreを確認 | Productionから分離した環境で四半期ごとに実施 |
| Maintenance email | Fake SES transportで送信契約を確認 | Production SESのverified senderと実送信を確認 |
| Maintenance timing | E2E時刻証跡と境界を確認 | Production maintenance eventごとに継続確認 |
| Initial Password Provisioning | Phase 1対象外。既存の有効なpassword hashを持つuserを前提 | Production展開前に運用方法を決定 |

## Open issue確認

| 項目 | 件数 | 判定 |
| --- | ---: | --- |
| Open defects | 0 | PASS |
| Open specification gaps | 0 | PASS |
| Unimplemented requirements | 0 | PASS |
| Unverified requirements | 0 | PASS |

## Customer decision

顧客承認は、顧客本人または正式な権限を持つ承認者が次の欄を更新した時点で成立する。`APPROVED`、`REJECTED`、`PENDING`以外を使用しない。

| 項目 | 記録 |
| --- | --- |
| Customer decision | **APPROVED** |
| Customer approver | 演習上の顧客受入責任者 |
| Approval date | 2026-09-23 |
| Customer comment | Phase 1の受入条件を満たしていることを確認した。 |
| Approval evidence reference | 2026-09-23の顧客受入責任者による明示入力。本書、examples/05、examples/06へ記録 |

Customer decision、承認者、承認日、承認コメントを確認できた。Technical Acceptance、UAT 14/14、顧客承認の全条件が成立したため、T-806をPASS・完了、SDD演習を完了と判定する。

## 次の対応

Phase 1の受入は完了した。Known limitationsに記載したProduction operational follow-upは、Phase 1受入後の運用事項として継続する。
