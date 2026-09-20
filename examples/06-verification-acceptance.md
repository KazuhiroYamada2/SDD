# 受入確認記録

## 2026-09-12 初期構成

| 確認項目 | 結果 |
| --- | --- |
| Frontend単体テスト | 合格: 1件成功 |
| Backend単体・統合テスト | 合格: 1件成功 |
| Frontend起動 | 合格: Viteが `http://127.0.0.1:5173/` でHTTP 200を返却 |
| Backend起動 | 合格: Node.jsプロセスがポート3000で待受 |
| `GET /health` がHTTP 200 | 合格: `{"status":"ok"}` を返却 |

顧客管理機能の受入確認は、当該機能を実装するタスクで実施する。

## 2026-09-13 顧客情報データベーススキーマ

| 確認項目 | 結果 |
| --- | --- |
| Backendスキーマテスト | 合格: Vitest 2ファイル、3件成功 |
| Backend TypeScriptビルド | 合格 |

## 2026-09-13 顧客情報登録画面

| 確認項目 | 結果 |
| --- | --- |
| 入力validation | 合格: 必須項目とUUID形式のエラーを表示し、APIを呼び出さないことを確認 |
| 正常登録と成功メッセージ | 合格: 既存APIへのPOSTと成功メッセージの表示を確認 |
| APIエラー表示 | 合格: APIが返すエラーメッセージを表示することを確認 |
| アクセシブルなlabelとテストID | 合格: labelによる入力取得と主要要素のテストIDを確認 |
| Frontend単体テスト | 合格: Vitest 1ファイル、4件成功 |
| Frontendビルド | 合格 |
| Frontend単体テスト | 合格: Vitest 1ファイル、1件成功（変更なしの回帰確認） |
| Frontendビルド | 合格 |

PostgreSQLの接続先はこの環境に設定されていないため、実DBへマイグレーションを適用する受入確認は未実施とする。接続先を用意した後に実施する。

## 2026-09-13 顧客情報登録API

| 確認項目 | 結果 |
| --- | --- |
| 正常系 | 合格: HTTP 201と登録した顧客情報を確認 |
| 入力検証エラー | 合格: 必須項目不足、UUID形式不正、メールアドレス形式不正、型不正でHTTP 400を確認 |
| DB登録失敗時のエラー | 合格: HTTP 500を確認 |
| DB未設定時のエラー | 合格: HTTP 503を確認 |
| SQLのパラメータ化 | 合格: プレースホルダーと値を分離していることを確認 |
| Backend TypeScriptビルド | 合格 |

## 2026-09-17 営業活動履歴のデータモデル

| 確認項目 | 結果 |
| --- | --- |
| 活動履歴スキーマ | 合格: `activities`に顧客・ユーザー外部キー、活動種別制約、訪問日時、商談内容、次回訪問予定、作成・更新日時が定義されていることを確認 |
| Repository | 合格: 顧客・ユーザーとの関連および活動履歴の項目を、パラメータ化クエリで保存することを確認 |
| Backend単体・DBスキーマテスト | 合格: Vitest 6ファイル、13件成功 |
| Backend TypeScriptビルド | 合格 |

PostgreSQLの接続先はこの環境に設定されていないため、実DBへ既存マイグレーションを適用する確認は未実施とする。

## 2026-09-17 営業活動登録API

| 確認項目 | 結果 |
| --- | --- |
| 正常登録 | 合格: 訪問記録、商談内容、次回訪問予定を登録し、HTTP 201を返すことを確認 |
| 入力検証 | 合格: 顧客ID・担当者ID・活動種別・日時・商談内容が不正な場合にHTTP 400を返すことを確認 |
| 顧客・ユーザー存在確認 | 合格: 存在しない顧客またはユーザーにHTTP 404を返し、保存しないことを確認 |
| 保存・DB未設定エラー | 合格: 保存失敗時はHTTP 500、DB未設定時はHTTP 503を返すことを確認 |
| Backend単体・統合テスト | 合格: Vitest 8ファイル、25件成功 |
| Backend TypeScriptビルド | 合格 |

## 2026-09-17 営業活動履歴参照API

| 確認項目 | 結果 |
| --- | --- |
| 指定顧客の活動履歴取得 | 合格: 訪問記録、商談内容、次回訪問予定を含む活動履歴をHTTP 200で返すことを確認 |
| 並び順 | 合格: 新しい登録順として`created_at`の降順で取得するRepositoryクエリを確認 |
| 異常系 | 合格: 不正な顧客IDは400、存在しない顧客は404、取得失敗は500、DB未設定は503を返すことを確認 |
| Backend単体・統合テスト | 合格: Vitest 9ファイル、32件成功 |
| Backend TypeScriptビルド | 合格 |

## 2026-09-17 顧客詳細と営業活動履歴UI

| 確認項目 | 結果 |
| --- | --- |
| 営業活動履歴表示 | 合格: 訪問記録、商談内容、次回訪問予定を画面へ表示することを確認 |
| 営業活動登録 | 合格: 顧客詳細画面から活動登録APIを呼び出し、成功後に履歴を再取得することを確認 |
| アクセシビリティ | 合格: 入力のlabelと意味のある登録ボタン名を確認 |
| APIエラー表示 | 合格: 履歴取得時・活動登録時のAPIエラーを表示することを確認 |
| Frontend単体テスト | 合格: Vitest 2ファイル、8件成功 |
| Frontendビルド | 合格 |

Playwrightテストはユーザー指示により未実施とする。

## 2026-09-17 営業活動履歴Playwright受入テスト

| 確認項目 | 結果 |
| --- | --- |
| 顧客詳細からの活動登録 | 合格: 訪問記録、商談内容、次回訪問予定を入力して登録できることを確認 |
| 登録内容の履歴表示 | 合格: 登録成功後に商談内容と活動種別を履歴へ表示することを確認 |
| 再読み込み後のAPI応答 | 合格: 再読み込み後も同一活動を返すAPI応答を確認 |
| 履歴取得APIエラー | 合格: APIエラーを画面上のalertとして表示することを確認 |
| Playwright | 合格: Chromiumで2件成功 |

E2E用PostgreSQLが未構成のため、上記のAPI応答はテスト内でモックした。実DBに対する受入確認は未実施とする。

## 2026-09-20 E2E実DB基盤

| 項目 | 結果 |
| --- | --- |
| Docker PostgreSQL | `postgres:16`、実サーバー `16.15`。専用project/volume/DBで起動、`Up (healthy)`。公開先 `127.0.0.1:55432`。 |
| reset 1回目 | 成功。users 2、customers 6、sales_records 8、activities 0、audit_logs 0。固定fixtureの値も一致。 |
| reset 2回目 | 成功。1回目と同じ件数・値。migration再適用も成功。 |
| seed単独再実行 | 成功。同じ件数・値。 |
| 誤DB防止 | DATABASE_URLのDB名を `wrong_database` としたresetを実行し、接続・変更処理前に拒否。別NODE_ENV拒否も単体テストで確認。パスワードは表示されない。 |
| Backend→実PostgreSQL | `NODE_ENV=e2e` と専用DATABASE_URLで実Backendを起動。HTTP 200で各レポートを取得。 |
| 売上推移API | 2026-01-15〜2026-03-10: 1月 `3000.00`、2月 `0.00`、3月 `2000.00`。 |
| 顧客分類API | A 2、B 2、未分類 1。論理削除D1は集計外。 |
| 担当者別API | 同期間: sales-a@example.com `3500.00` / 3件、sales-b@example.com `1500.00` / 1件。 |
| 4月同額順 | 2026-04-01〜2026-04-30: 両者 `100.00` / 1件。sales-a、sales-bのemail昇順。 |
| Backendテスト・build | 19ファイル、69件成功。`npm run build`成功。 |
| Frontendテスト・型チェック・build | 4ファイル、48件成功。`npx tsc -b --pretty false`、`npm run build`成功。 |

残課題: Playwrightの実DB受入テストは次タスク。

## 2026-09-20 レポート実DB Playwright Smoke Test

| 項目 | 結果 |
| --- | --- |
| 専用DB準備 | `npm run e2e:reports`から`postgres-e2e`のhealthyを確認し、E2E安全チェック付きresetを1回実行。users 2、customers 6、sales_records 8件。 |
| Playwright探索範囲 | `--list`で`e2e/reports/report-smoke.spec.ts`のChromium 1件のみ検出。`tests/`と既存の営業活動テストは実行対象外。 |
| 実接続 | BackendにE2E専用`DATABASE_URL`を渡して起動。BrowserがVite originの`/api/v1/reports/customer-categories`でHTTP 200を受け、固定fixtureの値を表示。Vite `/api` proxyと実Backend・Repository・専用PostgreSQLを通ることを確認。 |
| 画面表示 | 顧客分類の表にA 2、B 2、未分類 1を表示。API mockなし。 |
| Smoke Test | Chromium 1件成功。 |
| Backend回帰 | 全19ファイル・69件成功。build成功。 |
| Frontend回帰 | 全4ファイル・48件成功。TypeScript型チェック、build成功。 |

未実施: ST-01～ST-05、CC-01～CC-05、SP-01～SP-06、RP-01～02、VL-01、Firefox、WebKit。既存の営業活動Playwrightテストは変更・再実行していない。

## 2026-09-20 売上推移Playwright受入テスト ST-01～ST-05

| Scenario / Requirement | 実行内容 | 期待結果 | 実結果 | 判定 |
| --- | --- | --- | --- | --- |
| ST-01 / F-09 基本集計・月昇順 | 2026-01-15～03-10を画面から検索 | 1月3,000.00、2月0.00、3月2,000.00を月昇順で表示 | 表の各rowに期待金額を表示し、月順も一致 | PASS |
| ST-02 / F-09 0件月 | 同期間を独立した画面で検索 | 2月のrowを0.00で表示 | 2月0.00のrowが存在し、表は見出し行を含め4行 | PASS |
| ST-03 / F-09 期間境界 | 同期間を独立した画面で検索 | 1/14を除外し1/15を含む1月3,000.00、3/10を含み3/11を除外した3月2,000.00 | 表の1月・3月rowが期待額と一致 | PASS |
| ST-04 / F-09 月途中指定 | 2026-01-31～03-01を画面から検索 | 1月2,000.00、2月0.00、3月500.00の3か月を表示 | 表の各rowと月順が一致 | PASS |
| ST-05 / F-09 再検索 | 1月～3月を検索後、同じ画面で2026-04-01～04-30を検索 | 4月200.00のみ表示し、1月～3月を残さない | 4月のrowのみ表示。旧月のcellは0件 | PASS |

各検索で実Backendへの`GET /api/v1/reports/sales-trend`のfrom/toとHTTP 200を確認し、画面の表を検証した。API mockは使用していない。`npm run e2e:reports`は2回連続で各6件成功（Smoke Test 1件＋ST 5件）。両実行前に`customer_management_e2e`を安全チェック付きでresetし、users 2件、customers 6件、sales_records 8件の固定fixtureを確認した。Backend既存テストは19ファイル・69件、Frontend既存テストは4ファイル・48件成功。アプリ本体を変更していないため、buildと型チェックは今回再実行していない。

未実施: CC-01～CC-05、SP-01～SP-06、RP-01～RP-02、VL-01、Firefox、WebKit。

## 2026-09-20 顧客分類Playwright受入テスト CC-01～CC-05

| Scenario / Requirement | 操作 | 期待結果 | 実結果 | 判定 |
| --- | --- | --- | --- | --- |
| CC-01 / F-10 基本集計 | 顧客分類画面を開き実API応答後の表を確認 | A=2、B=2、未分類=1 | 3分類の各row内で分類と件数が一致 | PASS |
| CC-02 / F-10 論理削除除外 | 独立した画面で顧客分類を取得 | D1を除外してA=2、A=3は表示しない | A=2のrowが表示され、A=3のrowは0件 | PASS |
| CC-03 / F-10 NULL分類 | 独立した画面で顧客分類を取得 | N1を未分類=1と表示し、nullを表示しない | 未分類=1のrowが表示され、nullのcellは0件 | PASS |
| CC-04 / F-10 並び順 | 独立した画面で表のデータrow順を取得 | 件数降順、同数時は分類昇順でA→B→未分類 | 表のデータrow順はA→B→未分類、各件数も一致 | PASS |
| CC-05 / F-10 再表示・再取得 | 顧客分類を表示後、売上推移へ切替えて再訪 | 再訪時に顧客分類GETが再度発生し、HTTP 200または条件付きGETによる304で最新性が確認され、A=2、B=2、未分類=1を表示 | 当時のChromium実行ではGETを2回観測し双方HTTP 200。再訪後の各rowも一致 | PASS |

各CCテストで`GET /api/v1/reports/customer-categories`の確定URI、from/to等のquery parameterなし、Vite originを確認した。初回GETおよびCC-01～CC-04はHTTP 200、CC-05の再訪時だけHTTP 200または304を許容する。`page.route`等のAPI mockは使用していない。`npm run e2e:reports`は2回連続で各11件成功（Smoke 1件＋ST 5件＋CC 5件）。各実行前にE2E安全チェック付きresetを行い、`customer_management_e2e`の固定fixtureを使用した。Backend既存テストは19ファイル・69件、Frontend既存テストは4ファイル・48件成功。アプリ本体を変更していないため、buildと型チェックは今回再実行していない。

未実施: SP-01～SP-06、RP-01～RP-02、VL-01、Firefox、WebKit。

## 2026-09-20 営業担当者別実績Playwright受入テスト SP-01～SP-06

| Scenario / Requirement | 操作 | 期待結果 | 実結果 | 判定 |
| --- | --- | --- | --- | --- |
| SP-01 / F-11 基本集計 | 2026-01-15～03-10を画面から検索 | sales-a 3,500.00 / 3件、sales-b 1,500.00 / 1件 | 両担当者のemail・金額・件数が各row内で一致 | PASS |
| SP-02 / F-11 SUM | 同期間を独立した画面で検索 | sales-aの売上合計3,500.00 | sales-aのrow内に3,500.00を表示 | PASS |
| SP-03 / F-11 COUNT | 同期間を独立した画面で検索 | sales-a 3件、sales-b 1件 | 両担当者のrow内に各件数を表示 | PASS |
| SP-04 / F-11 並び順 | 基本期間を検索後、同じ画面で2026-04-01～04-30を再検索 | 基本期間は金額降順、4月は両者100.00 / 1件でemail昇順。旧金額は残さない | 両期間ともsales-a→sales-bのrow順。4月の両rowは100.00 / 1件で、旧3,500.00・1,500.00のcellは0件 | PASS |
| SP-05 / F-11 期間境界 | 2026-01-15～03-10を独立した画面で検索 | 1/14・3/11を除外し、1/15・3/10を含めてsales-a 3,500.00 / 3件、sales-b 1,500.00 / 1件 | 両担当者のrow内で金額・件数が一致 | PASS |
| SP-06 / F-11 0件 | 2026-02-01～02-28を画面から検索 | 0件メッセージを表示し担当者行を作らない | 「対象期間の営業実績データはありません。」を表示し、表は0件 | PASS |

各SPテストで`GET /api/v1/reports/staff-performance`のfrom/to、HTTP 200、Vite originを確認した。API mockは使用していない。`npm run e2e:reports`は2回連続で各17件成功（Smoke 1件＋ST 5件＋CC 5件＋SP 6件）。各実行前にE2E安全チェック付きresetを行い、`customer_management_e2e`の固定fixtureを使用した。Backend既存テストは19ファイル・69件、Frontend既存テストは4ファイル・48件成功。アプリ本体を変更していないため、buildと型チェックは今回再実行していない。

未実施: RP-01～RP-02、VL-01、Firefox、WebKit。

## 2026-09-20 レポート横断・入力検証Playwright受入テスト

| Scenario / Requirement | 操作 | 期待結果 | 実結果 | 判定 |
| --- | --- | --- | --- | --- |
| RP-01 / F-09～F-11 連続切替 | 売上推移を検索し、顧客分類を取得、担当者別実績を検索して売上推移へ戻る | 各実APIがHTTP 200。選択中の画面だけ表示し、他画面の表・error・loadingが混在せず、再操作可能 | 売上推移1月3,000.00、顧客分類A=2/B=2/未分類=1、sales-a 3,500.00/3件を順に表示。他レポート表は非表示で、最後に表示ボタンが使用可能 | PASS |
| RP-02 / F-10 取得中切替 | 顧客分類GETをPromiseで保留し、売上推移・担当者別実績へ切替後、顧客分類に再訪して保留を解除 | loading中も切替可能。pending中の再訪で重複GETなし。実Backend応答後に固定fixture値を表示 | statusでloadingを確認。再訪前後・完了後のGETは計1件。`route.continue()`後にHTTP 200、A=2/B=2/未分類=1を表示 | PASS |
| VL-01 / F-09 売上推移入力検証 | 開始日未入力、終了日未入力、開始日>終了日を画面で送信 | 各validation errorを表示し、売上推移GETを送信しない | 3ケースで該当errorを表示し、監視した売上推移GETは0件 | PASS |
| VL-01 / F-11 担当者別入力検証 | 同じ3ケースを担当者別実績画面で送信 | 各validation errorを表示し、担当者別GETを送信しない | 3ケースで該当errorを表示し、監視した担当者別GETは0件 | PASS |

RP-02の`page.route`は通信を一時保留するためだけに使用した。API Responseやfixture JSONをmockせず、`route.continue()`で実Backendへ転送して実PostgreSQLの値を確認した。VL-01では`page.on('request')`で対象URIのGET件数を監視した。`npm run e2e:reports`は2回連続で各21件成功（既存17件＋今回4件）。両実行前にE2E安全チェック付きresetを行った。Backend既存テストは19ファイル・69件、Frontend既存テストは4ファイル・48件成功。アプリ本体を変更していないため、buildと型チェックは今回再実行していない。

未実施: Firefox、WebKit、CI、認証、権限制御。

## 2026-09-20 レポートPlaywrightクロスブラウザ確認

- Playwrightは`1.63.0`。`npx playwright install --list`でChromium・Firefox・WebKitが導入済みと確認し、追加インストールは行わなかった。
- 各全件実行前に`npm run e2e:reports`が専用PostgreSQLをhealthyまで起動し、`customer_management_e2e`を安全チェック付きでresetした。毎回users 2、customers 6、sales_records 8件。PlaywrightのBackend `webServer`へ`NODE_ENV=e2e`と専用`DATABASE_URL`を渡し、Vite `/api` proxyから実Backend・Repository・実PostgreSQLへ接続した。API response mockは追加していない。

| Browser | Smoke単独 | 全21件 PASS | 全21件 FAIL | RP-02 | 判定 |
| --- | ---: | ---: | ---: | --- | --- |
| Chromium | 単独実行なし | 21 | 0 | PASS | PASS |
| Firefox | 1 PASS | 20 | 1（CC-05） | PASS | FAIL |
| WebKit | 1 PASS | 21 | 0 | PASS | PASS |

- FirefoxのCC-05は再訪時の2回目の`GET /api/v1/reports/customer-categories`でHTTP 200を期待したが、304を受信して失敗。単独再実行でも同じ結果。traceでは同じURIへの1回目が200、2回目が304で、双方に同じETagがある。Firefoxのキャッシュ再検証が原因候補。失敗時のscreenshotにはA=2、B=2、未分類=1の表が表示されている。ただし2回目HTTP 200という現行受入条件は満たしていないため、CC-05をPASSとしていない。
- FirefoxとWebKitのRP-02はいずれもPASS。保留中の画面切替・重複GETなし・`route.continue()`後の実DB値表示を確認した。日付inputを使うST/SP/VLも両BrowserでPASSした。
- Firefox CC-05の失敗時にtraceとscreenshotを生成・確認した。WebKitとChromiumでは失敗時のtrace・screenshotは発生していない。
- 3Browserの個別確認がすべて成功していないため、一括63件実行は未実施。クロスブラウザ受入確認は未完了。既存テスト・Backend・Frontendは変更していない。

## 2026-09-20 CC-05条件付きGET対応後のクロスブラウザ再確認

- examples/02～04にCC-05の2回目GETをHTTP 200に限定する明示要件はない。受入条件は、再訪時の新たなHTTP確認（200または条件付きGETの304）と正しい画面表示とした。初回GETと他シナリオのHTTP 200確認は維持した。
- Firefox CC-05単独は1 PASS / 0 FAIL。初回200、再訪時304、GET計2件、A=2・B=2・未分類=1を確認。304応答のETagは取得できた。Playwrightの`request.allHeaders()`ではFirefoxの2回目`If-None-Match`は取得できなかったため、そのheaderの有無はテストの必須条件にしていない。前回のtraceでは1回目200と2回目304に同じETagが記録されている。キャッシュ再検証が304の原因と判断した。

| 実行 | PASS | FAIL | CC-05の再訪時status |
| --- | ---: | ---: | --- |
| Firefox全件 | 21 | 0 | 304 |
| Chromium全件 | 21 | 0 | 200 |
| WebKit全件 | 21 | 0 | 200 |
| 3Browser一括 | 63 | 0 | Chromium 200、Firefox 304、WebKit 200 |

- 各実行前に`npm run e2e:reports`で専用PostgreSQLのhealthy確認と`customer_management_e2e`の安全チェック付きresetを実施し、実Backend・Repository・実PostgreSQLを使用した。固定fixtureはusers 2、customers 6、sales_records 8件。RP-02を含む既存シナリオを変更せず、3BrowserでPASSした。
- Backend・Frontend・DB・fixture・migration・API仕様・キャッシュ設定は変更していない。今回のクロスブラウザ受入確認に残るFAILはない。

## 2026-09-20 レポート機能の最終受入レビュー

- Backend既存テストは19ファイル・69件PASS、build PASS。Frontend既存テストは4ファイル・48件PASS、TypeScript型チェックPASS、build PASS。3ブラウザ一括PlaywrightはChromium 21、Firefox 21、WebKit 21の計63件PASS・0件FAIL。
- E2E実行前に`postgres-e2e`がhealthyとなり、`NODE_ENV=e2e`と`customer_management_e2e`を安全確認してresetした。users 2、customers 6、sales_records 8件の固定fixtureを使い、BrowserからVite proxy・実Backend・Repository・実PostgreSQLへ接続した。今回のCC-05再訪時statusはChromium 200、Firefox 304、WebKit 200。RP-02も3ブラウザでPASS。
- レビューGap: `examples/04-task-breakdown.md`のT-401にある`sales_records`登録・更新の業務用経路は確認できず、E2E fixture投入だけが存在する。`examples/03-design-planning.md`の顧客分類APIは期間を「受け付けない」と記す一方、現行Routerは期間付きqueryを無視して200を返し、Backendテストもこれを期待する。挙動の契約を確認する必要がある。03がレポートAPIへ割り当てたF-12の閲覧権限も未実装で、02では後続の権限管理タスクに送っているため、本レビューでPASS扱いしない。E2EのCC-05にはstatusとETagを出力する`console.log`が残るが、本番コードには該当するデバッグ出力は見つからなかった。これらは今回修正せず、受入完了判定を保留した。

## 2026-09-20 レポートコア機能のGap解消・最終確認

- 受入範囲はF-09・F-10・F-11の集計・表示。F-12の閲覧権限、JWT認証、roleによる認可、staff/manager/admin別アクセス制御、T-501・T-504は今回対象外の後続タスクとする。Phase 1全体の受入判定ではない。
- 修正後のT-401はPASS。`001_create_core_schema.sql`の`sales_records`に`id`、`customer_id`、`user_id`、`amount`、`recorded_on`、作成・更新日時が存在する。F-09/F-11のRepositoryが`amount`、`recorded_on`、`user_id`を参照し、実DB E2Eで固定売上8件から月別・担当者別の集計結果を確認した。業務用CRUDはT-401の完了条件に含めない。
- 顧客分類API契約は、期間queryなしでHTTP 200、`from`のみ・`to`のみ・両方・空の`from`・空の`to`でHTTP 400。Backend APIテストでは400応答の`VALIDATION_ERROR`形式とService未呼出しを確認した。`foo`のみは現行のHTTP 200を確認したが、未知query全般の共通規約は定めていない。Frontendの顧客分類GETにはfrom/toがない。
- Backendテスト19ファイル・74件PASS、Backend build PASS。Frontendテスト4ファイル・48件PASS、TypeScript型チェックPASS、Frontend build PASS。
- `npm run e2e:reports`で`postgres-e2e`のhealthy確認後、`NODE_ENV=e2e`かつDB名`customer_management_e2e`の安全確認を通してresetした。固定fixtureはusers 2件、customers 6件、sales_records 8件。BrowserからReact、Vite proxy、実Backend、Repository、専用PostgreSQLへ接続し、Chromium 21件、Firefox 21件、WebKit 21件の計63件PASS・0件FAIL。CC-05の再訪GETは200または304を許容し、RP-02は応答遅延後に実Backend応答を確認した。

### Acceptance Traceability Matrix（今回の受入範囲）

| Requirement | Design | Task | Implementation | Backend Test | Frontend Test | E2E Scenario | Browser | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-09 売上推移 | 03 売上推移API・sales_records参照 | T-401・T-402・T-405・T-407 | migration、売上推移Router/Service/Repository、React画面 | 売上推移API・集計・validation | 売上推移component | ST-01～ST-05、RP-01、VL-01 | Chromium/Firefox/WebKit | PASS：集計・表示 |
| F-10 顧客分類 | 03 現在スナップショット、from/toは400 | T-403・T-405 | 顧客分類Router/Service/Repository、React画面 | 顧客分類API、期間query 5ケース | 顧客分類component | Smoke、CC-01～CC-05、RP-01・RP-02 | Chromium/Firefox/WebKit | PASS：集計・表示・query契約 |
| F-11 営業担当者別実績 | 03 担当者別API・sales_records参照 | T-401・T-404・T-405・T-407 | migration、担当者別Router/Service/Repository、React画面 | 担当者別API・集計・validation | 担当者別component | SP-01～SP-06、RP-01、VL-01 | Chromium/Firefox/WebKit | PASS：集計・表示 |
| F-12 レポート閲覧権限 | 03 認証・認可設計 | T-501・T-504等 | 今回対象外 | 今回対象外 | 今回対象外 | 今回対象外 | 今回対象外 | 後続タスク・未受入 |

- 前回Gap 1（T-401の過剰な登録・更新定義）とGap 3（顧客分類の期間query契約）は仕様・実装・テストの整合を確認して解消した。Gap 2（閲覧権限）はF-09～F-11の今回の受入範囲から明示的に分離し、未実装・未受入の後続タスクとして残した。今回のレポートコア範囲に新しいGapは確認されなかった。

## 2026-09-20 T-003 権限マトリクス仕様レビュー

- T-003の検討に必要な画面・API・操作種別・共通エラー形式・users.id/roleが正本にあることを確認した。T-001全体の完了承認は判定していない。
- examples/02・03・04を照合し、staff・manager・adminの顧客、活動履歴、3レポート、ユーザー参照・role変更について操作可否とデータ範囲が一致し、03の対象セルに未定義がないことを文書レビューで確認した。T-003の仕様成果物は完了。ユーザー新規登録、role以外のユーザー情報変更、将来の複数managerの関係モデル、JWT詳細は対象外。
- 文書レビューのみ実施した。認証・認可コードの実装と関連テストは実施しておらず、T-104・T-105・T-501以降は未実装・未検証。

## 2026-09-20 T-104実装前の認証仕様レビュー

- examples/02・03・04を文書レビューし、Login API、Argon2id（19 MiB・time cost 2・parallelism 1）、JWT HS256（`sub`・`iat`・`exp`のみ、30分）、Login失敗と認証対象APIの各401契約、各requestでのusers・`is_active`・現在role確認が一致することを確認した。
- T-104のAuthentication、T-105のAuthorization、T-108のaudit_logs永続記録を別責務として確認した。Initial Password Provisioningは後続で仕様決定する。T-104実装と認証テストは未実施のため、実装・検証PASSとは判定していない。

## 2026-09-20 T-104 Backend認証共通部品の検証

- 認証用User Repositoryはemail検索、id検索、不存在、role・is_active・password_hashの取得範囲をunit test 3件で確認しPASS。id検索はpassword_hashをSELECTしない。
- Argon2id helperは正しいpassword・異なるpasswordの照合、Argon2id形式とmemory 19456 KiB・time cost 2・parallelism 1、同一passwordで異なるsalt、dummy hashをunit test 3件で確認しPASS。
- JWT serviceはHS256発行・検証、`sub`・`iat`・`exp`だけのclaim、1800秒の期限、別secret・改ざん・期限切れ・HS256以外・`sub`欠落/不正・JWT形式不正・`exp`欠落、短いsecret拒否をunit test 7件で確認しPASS。期限は時刻注入で検証し、固定waitは使用していない。
- Backend全テスト22ファイル・87件PASS、`npm run build` PASS。FrontendとPlaywrightは今回実行していない。Login API、Authentication middleware、HTTP 401変換、request時のusers・is_active・現在role確認、T-605は未実装・未検証で、T-104全体は未完了。

## 2026-09-20 T-104 Login Service・Login APIの検証

- Login Service unit test 5件PASS。active userの成功と公開user項目、email不存在時のdummy hash verifyと一度だけの生成、password不一致、inactive userでもpassword照合、Repository/JWT障害の伝播を確認した。
- Login API test 17件PASS。実Argon2id hash/verifyと実HS256 JWTを使い、200のaccessToken・Bearer・1800秒・user情報、email trimと大文字小文字保持、password空白保持、3種類の失敗が同一401、入力不正と壊れたJSONの400、内部障害の500、DB未設定時の503を確認した。password_hashはResponseに含まれない。
- Backend全テスト24ファイル・109件PASS、`npm run build` PASS。既存APIテストも全件PASS。FrontendとPlaywrightは変更・実行していない。既存APIは引き続き認証不要である。
- Authentication middleware、protected APIのBearer検証・401、requestごとのusers・is_active・現在role確認、T-605は未実装・未検証。T-104全体は未完了。

## 2026-09-20 T-104 Authentication middlewareの検証

- `authentication-middleware.test.ts`の11件PASS。テスト内だけの`GET /protected`で、有効JWTからDB上のid・現在roleだけを`authenticatedUser`へ設定して後続handlerへ進むこと、同じtokenでもDB上のrole変更を次requestに反映することを確認した。
- header欠落、不正scheme、Bearer token欠落・複数token、query/Cookieのみ、malformed JWT、別secretによる署名不正、期限切れ、`sub`欠落・形式不正、user不存在、token発行後のinactive化はいずれも同じHTTP 401 `AUTHENTICATION_REQUIRED`応答となることを確認した。固定waitは使用していない。
- Repository障害と想定外のJWT検証障害は401へ変換せずテストappの共通エラーhandlerで500となること、短い`JWT_SECRET`はmiddleware生成時に設定エラーとなることを確認した。secret値やtoken全文は応答へ出していない。
- Backend全テスト25ファイル・120件PASS、`npm run build` PASS。既存Login APIテストもPASS。production APIへのmiddleware適用、Frontend・Browser経由の認証は未実施のため、T-104・T-605全体はPASS扱いしない。FrontendとPlaywrightは変更・実行していない。

## 2026-09-20 認証移行仕様・Task分解の文書確認

- examples/02～04を照合し、Login・healthのPublic扱い、その他Phase 1業務APIの認証必須、Login後の顧客登録画面、Login/業務APIの401動作、memory token・Logout、T-109→T-110→T-111→T-605→T-105→T-501の順序が一致することを確認した。T-109～T-111は未実装・未検証であり、T-605も最終PASSとしていない。今回はコード変更とテスト実行を行っていない。

## 2026-09-20 T-109 E2E認証基盤の受入確認

- `npm run e2e:auth`で既存の安全guardを通した。`NODE_ENV=e2e`、接続先`customer_management_e2e`、接続後のDB識別確認を維持し、専用PostgreSQLをreset/seedした結果はusers 3件、customers 6件、sales_records 8件だった。managerはactive、Argon2id形式であり、顧客owner・売上担当者に含まれないことをseed後に確認した。
- 実Backend・実PostgreSQL・HTTP Login APIによるsmoke 2件PASS。managerのLoginはHTTP 200で非空のJWT、Bearer、1800秒、managerのID・email・roleを返した。誤passwordはHTTP 401 `AUTHENTICATION_FAILED`だった。API mockは使用していない。
- Backend全テスト25ファイル・120件PASS、build PASS。`npm run e2e:reports`の既存21シナリオ×3 BrowserはChromium 21、Firefox 21、WebKit 21、合計63件PASS。顧客分類A=2/B=2/未分類=1、売上推移、担当者別実績の期待値は維持された。
- T-109は完了。Frontend認証（T-110）、production業務APIへのAuthentication適用（T-111）、role認可（T-105・T-501）、T-605の最終確認は未実施。本番Initial Password Provisioningは別途残る。

## 2026-09-20 T-110 Frontend認証部品の検証（部分実装）

- Login API client test 7件PASS。200 DTO、400 `VALIDATION_ERROR`、401 `AUTHENTICATION_FAILED`、500/503、network障害、およびpasswordを変えずにJSON送信することを確認した。
- 認証状態test 2件PASS。初期未認証、token・userの設定と解除、Provider再生成時の未認証、localStorage/sessionStorageを読み書きしないことを確認した。Login component test 7件PASS。accessible label、email trimとpassword空白維持、成功時の状態設定、400/401とその他障害の表示、loadingと二重送信防止を確認した。
- Frontend全テスト7ファイル・64件PASS、`tsc -b` PASS、`npm run build` PASS。`App.tsx`と既存業務APIに認証を適用していない。BackendとPlaywrightは変更・実行していない。T-110全体および既存Reports 63件の認証移行は未完了。
