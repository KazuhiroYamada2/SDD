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

## 2026-09-20 T-110 authenticated fetch基盤の検証（部分実装）

- `authenticated-fetch.test.ts`の18件PASS。Bearer付与、plain object・`Headers`・配列の既存header保持、`Request` headerとの統合、呼び出し側Authorizationの上書き、空・未設定tokenの送信前拒否を確認した。
- 401 `AUTHENTICATION_REQUIRED`だけが専用errorになること、errorへtoken/headerを保持しないこと、別codeまたは不正JSONの401はbodyを読める元のResponseとして返ること、400・403・500・503とnetwork障害を認証失敗へ変換しないことを確認した。
- Frontend全テスト8ファイル・82件PASS、`tsc -b` PASS、`npm run build` PASS。Backend・Playwrightは変更・実行していない。Appおよび既存業務APIへのBearer接続、401時の認証状態破棄・Login復帰、既存Reports E2Eの認証移行は未実施であり、T-110全体は未完了。
## 2026-09-20 T-110 Frontend本体への認証統合の検証（部分実装）

- Frontend全テスト8ファイル・98件PASS。AppのLogin境界・Login成功・Logout・Provider再生成、業務APIのBearer付与、customers・activities・reportsからの401時Login復帰、403時に認証状態を保持する動作を確認した。
- `tsc -b` PASS、`npm run build` PASS。Backendは変更・実行していない。
- Playwrightは変更・実行していない。以前のReports E2E 63件PASS記録は当時の結果であり、現行AppではLoginが初期表示されるため、既存63件は次段階でmanager Loginへ移行して再検証する。T-110全体の受入は未完了。
## 2026-09-21 T-110 Reports E2E UI Login移行の検証（PASS）

- `.env.e2e` は `NODE_ENV=e2e`、専用DB `customer_management_e2e`、JWT secretの設定を値を出力せず確認した。`backend/scripts/e2e-db.mjs` の既存safety guardは変更していない。
- `playwright test --config=playwright.reports.config.ts --list` はPASS。Chromium、Firefox、WebKitそれぞれ21件、計63件を検出した。
- Docker Named Pipeを使わず、起動済み専用PostgreSQLの `127.0.0.1:55432` へTCP接続成功。既存scriptの `NODE_ENV=e2e`・接続URL・接続後DB識別guardを通して `reset` と `seed` を実行し、それぞれusers 3、customers 6、sales_records 8件を確認した。managerのrole、active状態、既存fixture・集計値もscriptの検証を通過した。JWT secretは設定と長さを値を出力せず確認した。
- T-109 Login smoke: 2 / 2 PASS。実Login APIのsuccess 200、Bearer、1800秒、manager、非空tokenと、wrong password 401 `AUTHENTICATION_FAILED` を確認した。
- Reports E2E: Chromium先行 21 / 21 PASS。続く3ブラウザー実行はChromium 21 / 21、Firefox 21 / 21、WebKit 21 / 21、Total 63 / 63 PASS。各scenarioで実UI manager LoginのPOST 200と顧客登録画面への遷移を確認し、代表smokeでbusiness API requestの非空Bearer形式を確認した。token全文は出力していない。
- ST 5件、CC 5件、SP 6件、RP 2件、VL 2件、Reports smoke 1件の既存業務assertionが各ブラウザーでPASS。CC-05の再訪GET 200/304、RP-02のpending後に実Backendへcontinue、VL-01の不正入力時Reports API GET 0件を維持した。Frontend・Backend production codeは変更せず、production業務APIはPublic、Authorizationは未実装。T-110 PASS。
## 2026-09-21 T-111 production Authentication第1段階の検証（部分完了）

- Backend全テスト26ファイル・130件PASS、`npm run build` PASS。
- production app経路でBearerなしのcustomers POST、activities POST/GET、reports 3 GETが401 `AUTHENTICATION_REQUIRED`、不正Bearerも同じ401となることを確認した。BearerなしのLoginはwrong credentialsで401 `AUTHENTICATION_FAILED`、healthは200。短いJWT secretではapp生成失敗を確認した。
- 有効JWTとactive staff userでbusiness handlerへ到達し、`request.authenticatedUser`がidと現在Repository roleのみを持つこと、role変更が次requestに反映されることを確認した。staff tokenもReportsへAuthentication上は到達し、403は実装していない。既存業務APIのresponse契約テストもBearer付きでPASS。
- 実DB Login→protected production APIとPlaywright 3ブラウザー63件は今回未実施。T-111全体は未完了。
## 2026-09-21 T-111第2段階A 実DB・Chromium受入確認（部分完了）

- `.env.e2e` の `NODE_ENV=e2e`、`customer_management_e2e`、`127.0.0.1:55432`、JWT secret設定を値を出力せず確認した。既存scriptのURL guardと接続後DB識別guardを通してreset・seed成功。各結果はusers 3、customers 6、sales_records 8。managerのDB上のroleはmanager、`is_active=true`。
- T-109 Login smoke 2 / 2 PASS。実DB manager LoginはBearer、1800秒、非空tokenを返し、wrong passwordは401 `AUTHENTICATION_FAILED`。実production appでもBearerなしLogin 200とwrong password 401、Bearerなしhealth 200を確認した。
- 実production appのsales-trendとcustomer-categoriesは、実Login JWTのBearerありで200と固定fixtureどおりの応答、Bearerなしで401 `AUTHENTICATION_REQUIRED`。customer-categoriesのmalformed Bearerも同じ401。JWTにrole claimがないことを確認した。managerはDB上のactive userとしてrequest時にlookupされる既存middleware経路を通った。JWT全文は出力していない。
- Chromium Reports E2E 21 / 21 PASS。ST 5 / 5、CC 5 / 5、SP 6 / 6、RP 2 / 2、VL 2 / 2、smoke 1 / 1。CC-05の再訪200/304、RP-02のpending後に実Backendへcontinue、VL-01の不正入力時対象Reports GET 0件のassertionを維持した。Firefox・WebKit・最終63件は未実施。T-111全体は未完了。
## 2026-09-21 T-111 production Authentication最終受入確認（PASS）

- 第1段階のBackend全テスト26ファイル・130/130 PASS、Backend build PASSを確認済み。第2段階Aの実DB Login smoke 2/2 PASS、Public Login・health PASS、protected Reports APIは有効Bearerで200、Bearerなし・不正Bearerで401 `AUTHENTICATION_REQUIRED` を確認済み。
- 最終段階ではDocker CLIを使わず、各ブラウザー実行前に既存のguard付きE2E DB resetを実施した。各回とも`customer_management_e2e`でusers 3、customers 6、sales_records 8を確認。Firefox: ST 5/5、CC 5/5、SP 6/6、RP 2/2、VL 2/2、Reports smoke 1/1、計21/21 PASS。WebKitも同じ内訳で21/21 PASS。
- 前回のChromium 21/21は同じrevisionのBackend・Frontend・E2E・Playwright設定と同じ専用fixtureによる結果で、今回はコード変更がないため再実行しなかった。最終結果はChromium 21/21、Firefox 21/21、WebKit 21/21、合計63/63 PASS。UI manager Login、business API Bearer形式、CC-05の再訪200/304、RP-02のpending後に実Backendへcontinue、VL-01の不正入力時対象Reports GET 0件を維持した。
- T-111 PASS。Authorization・403は未実装。T-605は今回PASS判定せず、次TaskでAuthentication全体の受入観点を最終確認する。
## 2026-09-21 T-605 Authentication最終検証（PASS）

- T-605原文と02・03の仕様に対するFit/Gapを既存Backend・実DB・Browser証跡で照合し、GAP 0件と判定した。今回は新規実装・新規テストを追加していない。
- 認証関連Backend testは`npm --prefix backend test -- src/auth`で7ファイル・56/56 PASS。Login成功、入力不正400、email不存在・password不一致・無効ユーザーの共通401、dummy Argon2id verify、JWTの`sub`・`iat`・`exp`のみ・HS256・1800秒、Bearer欠落・形式不正、JWT形式不正・署名不正・期限切れ、`sub`のuser不存在、発行後のinactive化による次requestの401、同じtokenでのrole変更反映とrequestごとのuser lookup、production保護経路の401を既存テストで再確認した。Backend全テストは26ファイル・130/130 PASS、Backend build PASS。
- Docker CLIを使わず、`.env.e2e`の`NODE_ENV=e2e`・専用DB`customer_management_e2e`・接続先`127.0.0.1:55432`を確認した。既存scriptのURL・接続後DB識別guardを通してreset・seedを実行し、それぞれusers 3、customers 6、sales_records 8を確認した。managerのDB上のroleはmanager、`is_active=true`。
- T-109実DB Login smokeはsuccess 200とwrong password 401 `AUTHENTICATION_FAILED`の2/2 PASS。実production appでBearerなしLogin 200、Login JWTのBearer・1800秒・manager情報を確認した。同じJWTで`GET /api/v1/reports/sales-trend`と`GET /api/v1/reports/customer-categories`へ送信し、Bearerあり200と固定fixtureどおりの応答、Bearerなし401 `{ "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required." }`を両経路で確認した。JWT全文は出力していない。
- Browser LoginはT-110/T-111の既存Reports E2E証跡（Chromium 21/21、Firefox 21/21、WebKit 21/21、合計63/63 PASS）を参照し、今回は再実行していない。Public healthもT-111の既存証跡を参照した。Authorization・403は未実装であり、T-105以降の責務。以上によりT-605 PASS。

## 2026-09-21 T-105A 共通Authorization core検証（PASS）

- 新規unit testは2ファイル・16/16 PASS。9操作×staff/manager/adminの全matrix、staff own/other、manager/adminのcustomer scope、未知role・operationの拒否、operation拒否時の`ForbiddenError`、403のstatus・code・messageと公開応答に内部理由がないことを確認した。
- Backend全testは28ファイル・146/146 PASS。Backend buildはPASS。
- policyはDB・Express非依存。production business APIへのAuthorization適用、scope外404の生成、staff顧客登録時のowner強制、Authentication→Authorization共通integration、Frontend・Playwrightは今回未実施。T-105AはPASS、T-105全体は未完了。

## 2026-09-21 T-105B Authentication→Authorization共通integration検証（PASS）

- T-105A unit testを再実行し、2ファイル・16/16 PASS。T-105Bの新規integration testは1ファイル・6/6 PASS。テスト専用経路でAuthenticationをAuthorizationより先に実行し、tokenなしは401 `{ "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required." }`、有効staff tokenのReports read拒否は共通error handler経由で403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`、有効manager・admin tokenはhandler到達を確認した。managerのcustomer create拒否も403。同じJWTでDB側roleをstaffからmanagerへ変更すると次requestの判定が変わり、user lookupはAuthenticationによる各request1回だけだった。
- Backend全testは29ファイル・152/152 PASS。Backend buildはPASS。T-105共通Authorization機構はPASS。production業務APIへのAuthorization適用、customer scope外404、staff顧客登録時のowner強制、Frontend・Playwrightは未実施で、T-501/T-502/T-503以降の対象とする。

## 2026-09-21 T-501A第1段階 Reports Backend Authorization検証（PASS）

- Reports関連とproduction Authenticationの対象テストは5ファイル・40/40 PASS。staffのsales-trend、customer-categories、staff-performanceは3/3でHTTP 403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`となり、validation・Serviceへ到達しないことを確認した。
- Reportsの既存business API testsはmanager認証で全件PASSし、既存response・validation契約を維持した。adminはcustomer-categories代表経路で200とhandler到達を確認した。tokenなしのproduction Reports代表経路は401 `{ "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required." }`を維持した。
- production Authentication testはPASS。JWTにroleを追加せず、AuthenticationがRepositoryから取得したcurrent roleでReports Authorizationを通過し、`request.authenticatedUser`とrequestごとのuser lookupの既存証跡を維持した。
- Backend全testは30ファイル・157/157 PASS。Backend buildはPASS。Frontend Reports表示制御は未実施のためT-501Aは未完了。T-501全体も未完了。

## 2026-09-21 T-501A第2段階 Frontend Reports表示制御検証（PASS）

- App component testは1ファイル・22/22 PASS。staffではReports入口とReports画面がDOMに存在せず、既存顧客登録画面を表示し、通常表示だけではReports APIを呼ばないことを確認した。manager・adminではReports入口を表示し、操作後にReports画面へ遷移することを確認した。
- Frontend全testは8ファイル・100/100 PASS。Frontend buildの`tsc -b`とVite production buildはPASS。最初のsandbox内buildはVite子processの`spawn EPERM`で停止したため権限付きで同じcommandを再実行し、正常完了した。
- AuthContext、Reports API client、401/403処理、Login後初期画面、Logout、reloadは変更していない。403でauth stateを破棄しない既存仕様を維持した。Backend、E2E、Playwright、DBは今回変更・実行していない。
- 第1段階と第2段階によりT-501AはPASS。Activity GET scope Authorizationと未実装customer read APIへの適用・最終回帰が残るため、T-501全体は未完了。

## 2026-09-21 T-501B Activity GET scope Authorization検証（PASS）

- 関連テストは5ファイル・29/29 PASS。staff ownは200と既存business response、staff other ownerとcustomer不存在は同じ404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`、manager・adminはother ownerでも200を確認した。
- Service testでstaff scope外とcustomer不存在のactivity queryが各0件、staff own・manager・adminの許可時はactivity queryへ到達することを確認した。Reference Repository testでは存在時の`id`・`owner_user_id`取得と不存在時のnullを確認し、各呼出しが1 queryであることを確認した。
- POST Activityの既存API testを含む関連回帰がPASSし、GETへの`activity.read`適用がPOSTのAuthorization behaviorや`activity.user_id`契約を変更していないことを確認した。Backend全testは31ファイル・166/166 PASS、Backend buildはPASS。
- Frontend、Reports、Customers、Authentication、E2E、Playwright、DB schema/fixtureは変更・実行していない。T-501BはPASS。未実装customer read APIへの適用・最終回帰が残るためT-501全体は未完了。

## 2026-09-21 T-202B Customer list/detail Production API integration検証（PASS）

- T-202A unitを含む影響範囲テストは7 files・64/64 PASS。T-202AのCustomer Repository・Service・validation 3 files・25/25、Customer read API 12/12、既存Customer POST、Production Authentication、Activity GET nested routeがPASSした。
- `GET /api/v1/customers`はstaffで自担当active customerだけ、manager・adminで全active customerを返し、0件では`items: []`、page 1、page_size 20、total_count 0、total_pages 0を返すことを確認した。
- `GET /api/v1/customers/:id`はstaff own、manager other、admin otherで200と共通DTOを返した。staff other、customer不存在、logical deletedはHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`で、staff otherと不存在の公開応答が同一であることを確認した。malformed UUIDは400 `{ "code": "VALIDATION_ERROR", "message": "id must be a UUID." }`でService未到達だった。
- Customer GETはapp-level Authentication後に`customer.read`を通る。tokenなしのlistとdetailは401 `AUTHENTICATION_REQUIRED`で、Production Authenticationのprotected route一覧にも2経路を追加した。既存POST CustomerとActivity GET routeの回帰はPASS。
- Backend全testは34 files・204/204 PASS。Backend build・TypeScript typecheckはPASS。T-205 query機能、Frontend、E2E、Playwrightは未実施。T-202BはPASS、T-202全体はT-202Cを残して未完了。T-501もCustomer search scope、Frontend、最終Acceptanceを残して未完了。

## 2026-09-21 T-202C第1段階 Customer list Frontend検証（PASS）

- 関連テストはAPI client、Customer list component、Appの3 files・33/33 PASS。`GET /api/v1/customers`へのBearer付与、query parameterなし、pagination envelopeのparse、共通Authentication 401 errorへの接続を確認した。
- staff・manager・adminの顧客一覧入口表示、state-based navigation、顧客名・分類のsuccess表示、loading、0件、API errorを確認した。staff向けmock responseに別ownerのitemを含めても表示されることから、Frontendでowner後filterを行っていないことを確認した。403では認証状態とLogoutを維持する。
- App回帰でLogin後の顧客登録初期画面と登録処理、staffのReports非表示、manager・adminのReports表示を維持した。Frontend全テストは10 files・111/111 PASS。`tsc -b`を含むFrontend buildはPASS。sandbox内buildはVite子processの`spawn EPERM`で停止したため、同じcommandを制限外で再実行して正常完了した。
- Backend、E2E、Playwrightは変更・実行していない。T-205の検索・filter・sort・paginationとCustomer detail導線は未実装。T-202Cは未完了、T-202全体も未完了。

## 2026-09-21 T-202C第2段階 Customer detail Frontend検証（PASS）

- 関連テストはCustomer API client、Customer list、read detail、App、既存Activity履歴の5 files・52/52 PASS。detail clientのBearer、queryなし、customer IDのURL encode、200 DTO、404 message、共通Authentication 401への接続を確認した。
- 一覧→選択ID→production detail再取得→一覧のstate-based導線、detail loading・success・404・500・network errorを確認した。404 `CUSTOMER_NOT_FOUND / Customer was not found.`では認証状態とLogoutを維持し、Loginへ遷移しない。401だけは既存共通処理でLoginへ戻る。
- staff・manager・adminでdetail導線を確認した。Frontendにowner一致判定を追加せず、owner ID・deleted日時・Activity履歴をread detailへ表示・取得しない。登録成功後の既存Customer detailとActivity履歴、Customer listのloading・success・zero・error、Reports role guard、Login後初期画面、Logout・reloadの回帰を維持した。
- Frontend全テストは11 files・126/126 PASS。`tsc -b`を含むFrontend buildはPASS。Backend、E2E、Playwrightは変更・実行していない。T-205機能は未実装。
- T-202CはPASS。T-202A/B/Cが揃い、T-202はPASS。Browser E2Eは正式な後続T-207で行う。T-501はT-205 search scopeと最終Acceptanceを残して未完了。

## 2026-09-21 T-205 Customer検索・filter・sort・pagination Backend部分検証（PASS）

- Customer validation・Repository・Read Service・production APIの関連テストは4 files・76/76 PASS。page/page_sizeの指定不正9ケース、invalid sort、invalid owner UUIDが正本どおり400 `VALIDATION_ERROR`となり、Repositoryへ到達しないことを確認した。
- queryの部分一致・大文字小文字非区別・trim・空文字、categoryの完全一致・trim・空文字、owner完全一致、複数filter AND、logical delete除外を確認した。staff security owner scopeとclient owner filterは別SQL条件でANDされ、他owner指定は200の0件。manager・adminはsecurity owner scopeなしでclient filterを適用する。
- `name_asc`、`name_desc`、`created_at_asc`、`created_at_desc`の4 sortと各`id ASC` tie-breaker、既定`name_asc`を確認した。page/page_size、offset、scope・filter適用後のtotal_count・total_pages、最終page超過の200空items、0件metadataを確認した。items/countは同じparameterized WHEREを使用する。
- queryなしのT-202互換動作と、Customer detail・POST、Activity、Reports、Authenticationを含むBackend全テストは34 files・243/243 PASS。Backend TypeScript buildはPASS。
- Frontend、DB schema/migration、E2E、Playwrightは変更・実行していない。T-205 Backend部分はPASS、Frontend残のためT-205全体は未完了。T-501も最終Acceptanceを残して未完了。

## 2026-09-21 T-205 Customer検索・filter・sort・pagination Frontend検証（PASS）

- Customer API client、Customer list、Customer detail、Appの関連テストは4 files・55/55 PASS。query stringの安全な生成、Bearer維持、page/page_size/query/category/sort、空filter省略、Frontendから`owner_user_id`を送信しないことを確認した。
- query/category入力だけではrequestせず「検索」で適用してpage 1へ戻ること、sort・page size変更でもpage 1へ戻ることを確認した。前へ・次へでは検索条件・category・sort・page sizeを維持し、先頭pageの前へと最終pageの次へが無効になることを確認した。
- loading、success、0件、API error、現在page表示、staff・manager・adminの一覧・detail導線を維持した。一覧→detail→一覧でquery、category、sort、page、page sizeが保持されることを確認した。Frontend scope後filterはなく、既存Backend Authorizationを使用する。
- Reports role guard、顧客登録初期画面・登録処理、detail 404時のauth維持、401共通処理、Logout・reloadを含むFrontend全テストは11 files・133/133 PASS。`tsc -b`を含むFrontend buildはPASS。
- Backend、DB、E2E、Playwrightは変更・実行していない。T-205はPASS。T-501は最終Acceptance待ち。

## 2026-09-21 T-501 閲覧系Authorization 最終Acceptance（PASS）

- T-501原文と実装・既存テストを照合し、Customer一覧・検索・詳細、Activity履歴GET、Reports 3種、Frontend閲覧表示制御が対象どおり揃っていることを確認した。users参照はT-503、write AuthorizationはT-502、網羅的Role Matrix検証はT-504、新規401/403 Browser E2EはT-505、Customer業務E2EはT-207に残している。
- Customer readはstaffの一覧・検索が自担当のみ、detail ownが200、detail otherが不存在・logical deletedと同じ404 `CUSTOMER_NOT_FOUND`、manager・adminが全active customerを閲覧可能であることを確認した。query・category・owner filter、sort、paginationはstaff security scopeと同じSQL条件へ適用され、Frontend scope後filterはない。
- Activity GETはstaff ownを許可し、staff otherとcustomer不存在を同じ404としてactivity query 0件で停止し、manager・adminはowner不問で許可することを確認した。Reportsはstaffの3 APIを403 `FORBIDDEN`、manager・adminを許可し、Frontendのstaff非表示・manager/admin表示を確認した。
- 未認証401 `AUTHENTICATION_REQUIRED`、認証済みoperation拒否403 `FORBIDDEN`、staff scope外404の境界を確認した。JWT role claimとAuthorization側のusers再lookupはなく、AuthenticationがDBから取得したcurrent roleを使用する。
- Backend全テストは34 files・243/243 PASS、Backend buildはPASS。Frontend全テストは11 files・133/133 PASS、`tsc -b`を含むFrontend buildはPASS。
- Reports PlaywrightはChromium先行実行が21/21 PASS。専用E2E DBを再初期化した最終3 browser回帰はChromium・Firefox・WebKit各21件、計63/63 PASS。既存manager loginとReports business contractを維持し、新規E2Eは追加していない。
- 最終Acceptanceでコード修正は不要だった。以上によりT-501はPASS・完了。T-502とT-503は着手可能で、次の正式TaskはT-502とする。

## 2026-09-21 T-502 既存production write API Authorization検証（部分PASS）

- Backend関連テストは6 files・65/65 PASS。Customer createはstaffの201と保存ownerの`authenticatedUser.id`強制、adminのrequest owner維持、managerのvalidation・Repository前403を確認した。tokenなし401はProduction Authentication testで維持した。
- Activity createはstaff own成功、staff otherとcustomer不存在の同一404 `CUSTOMER_NOT_FOUND / Customer was not found.`、managerのvalidation・Service前403、admin other owner成功を確認した。Service testでcustomer reference lookupは各処理1回、staff scope外と不存在ではuser lookup・activity createが0回であることを確認した。`activity.user_id`契約は変更していない。
- Frontend関連テストは2 files・41/41 PASS。managerではCustomer登録画面とActivity登録formを表示せず、staff・adminでは登録UIを維持する。managerの顧客一覧・Activity履歴・Reports表示、既存Customer登録・401処理も維持した。
- Backend全テストは34 files・251/251 PASS、Backend buildはPASS。Frontend全テストは11 files・137/137 PASS、`tsc -b`を含むFrontend buildはPASS。PlaywrightはT-502の今回の完了条件ではなく、T-504/T-505を先取りしないため未実施。
- 既存production write APIへの適用はPASS。Customer edit API・画面はT-203、論理削除API・画面はT-204が未実装であり、それらへのT-502適用が残るためT-502全体は部分完了。次の正式TaskはT-203とする。

## 2026-09-21 T-203 顧客編集API・編集画面検証（PASS）

- Backend関連テストは5 files・47/47 PASS。staff own 200、staff other 404、manager 403、admin other owner 200、customer不存在・logical deleted 404、malformed UUID 400、tokenなし401を確認した。manager拒否時はcustomer lookup・UPDATEとも0回、staff scope外はUPDATE 0回。scope外と不存在は同じ`CUSTOMER_NOT_FOUND / Customer was not found.`を返す。
- 部分更新で未指定fieldをUPDATE対象へ含めず、nullable fieldの`null` clear、`name`の`null`拒否、空body・未知field・`owner_user_id`の400拒否、parameterized SQL、`updated_at = NOW()`、active customer条件を確認した。既存create/read/search、Activity、Reports、Authenticationを含むBackend全テストは37 files・275/275 PASS。Backend buildはPASS。
- Frontend関連テストは5 files・68/68 PASS。staff・adminの編集導線と保存、managerの編集導線非表示、detail値の初期表示、owner UIなし、PATCH、保存中表示、成功後のdetail GET再取得、キャンセル時PATCH 0回、error表示、403時のauth state維持を確認した。
- Customer list/search/detail、Customer create、Reports role guard、Login初期画面、Logout/reloadを含むFrontend全テストは12 files・147/147 PASS。`tsc -b`を含むFrontend buildはPASS。E2E/PlaywrightはT-203の完了条件ではなく、T-207/T-505を先取りしないため未実施。
- T-203はPASS。T-502はCustomer deleteがT-204待ちのため部分完了。次の正式TaskはT-204とする。

## 2026-09-21 T-204 Customer論理削除・T-502最終検証（PASS）

- Backend関連テストは4 files・39/39 PASS。admin active customerはbodyなし204、staff・managerはlookup/delete query各0回で403、adminの不存在・already deletedは同じ404 `CUSTOMER_NOT_FOUND`、malformed UUIDは400、tokenなしは401を確認した。
- Repository testで`UPDATE customers SET deleted_at = NOW(), updated_at = NOW()`、`id = $1 AND deleted_at IS NULL`、parameterized SQL、物理DELETE文なしを確認した。stateful API testで削除後のlist/search除外、detail・edit・re-deleteの404を確認した。
- Customer create/edit/read/search、Activity、Reports、Authorization、Authenticationを含むBackend全テストは39 files・289/289 PASS。Backend buildはPASS。
- Frontend関連テストは6 files・77/77 PASS。staff・managerの削除導線非表示、adminの削除導線・確認画面・DELETE・204後の一覧遷移、キャンセル時DELETE 0回、API error表示と403時のauth state維持を確認した。
- 既存Customer create/edit/list/search/detail、Reports role guard、Login初期画面、Logout/reloadを含むFrontend全テストは13 files・156/156 PASS。`tsc -b`を含むFrontend buildはPASS。E2E/Playwrightは未実施。
- T-204はPASS。Customer create、Activity create、Customer edit、Customer deleteがすべてPASSしたためT-502もPASS・完了。次の正式TaskはT-503とする。

## 2026-09-21 T-503 users / role Authorization検証（PASS）

- Backend関連テストは5 files・45/45 PASS。tokenなし401、staff・managerのUsers一覧・role変更403とService未到達、adminの一覧200・role変更200、公開4 field、active/inactive、email ASC・id ASC、malformed UUID・missing/invalid role・unknown fieldの400、user不存在404を確認した。
- admin自身の異なるrole変更は409 `SELF_ROLE_CHANGE_NOT_ALLOWED`、同一roleは200かつUPDATE 0件、最後のactive admin降格は409 `LAST_ACTIVE_ADMIN_REQUIRED`、active adminが複数なら他adminを降格可能、inactive userのrole変更可能を確認した。Repository testでBEGIN、active adminの`ORDER BY id ASC FOR UPDATE`、対象userの`FOR UPDATE`、UPDATE、COMMIT/ROLLBACKの順序と、保護時のUPDATE 0件を確認した。
- Frontend関連テストは3 files・52/52 PASS。staff・managerのUsers入口非表示、adminの入口・画面、active/inactive表示、self control無効、role変更PATCH、成功後GET再取得、409・403 message表示とauth state維持を確認した。Reports・Customerの既存role表示もApp回帰で維持した。
- AuthenticationはJWT role claimを追加せず、既存どおり各requestでDB current roleを取得する。role変更対象userの次回requestから現在roleが反映される構成を維持した。
- Backend全テストは43 files・320/320 PASS、Backend TypeScript buildはPASS。Frontend全テストは15 files・166/166 PASS、`tsc -b`を含むFrontend buildはPASS。最初のsandbox内関連testは子processの`spawn EPERM`で開始できなかったため、同じcommandを制限外で実行して実結果を確認した。
- T-504/T-505とE2E/Playwrightは未実施。T-503はPASS・完了。次の正式TaskはT-504とする。

## 2026-09-21 T-504 Backend/API Role Matrix検証（PASS）

- Customer readはstaffのlist/searchが自担当のみ、detail ownが200・otherが不存在と同じ404、manager・adminがlist/search/detail 200。createはstaff/adminが201・managerが403、editはstaff own/adminが200・staff otherが404・managerが403、deleteはstaff/managerが403・adminが204でPASSした。
- Activity GETはstaff ownが200・otherが不存在と同じ404、manager・adminが200。Activity POSTはstaff own/adminが201・staff otherが不存在と同じ404・managerが403でPASSした。scope外と不存在ではbusiness query/createへ進まない既存Service証跡も確認した。
- Reports 3 APIはstaffが3/3で403かつvalidation・Service未到達、managerが3/3で200、adminが3/3で200となりPASSした。admin全3経路の明示的証跡を補うためReports Authorization testだけを拡張し、productionコードは変更していない。
- 未認証は401 `AUTHENTICATION_REQUIRED`、operation-level拒否は403 `FORBIDDEN`、staff scope外customerは不存在と同じ404 `CUSTOMER_NOT_FOUND`でPASSした。Authentication → operation Authorization → validation/resource lookup → scope Authorization → business processingの順序を維持し、operation拒否では不要なlookup・updateを実行しない。
- T-504関連Backend testは14 files・150/150 PASS。Backend全testは43 files・321/321 PASS。Backend TypeScript buildはPASS。Frontend変更・test/buildとPlaywrightはT-504範囲外のため未実施。T-504はPASS・完了、T-505は着手可能。

## 2026-09-22 T-505 Browser/E2E Authorization検証（PASS）

| 対象 | Browser表示・操作 | Backend Authorization証跡 | 結果 |
| --- | --- | --- | --- |
| staff | Customer一覧、自担当A1詳細、登録・編集、Activity履歴・登録を表示。Customer削除、Reports、Users入口は非表示 | Reports GETとCustomer DELETEは403。Users GETは403。他担当B1のCustomer GETとActivity GET/POSTは同じ404 `CUSTOMER_NOT_FOUND` | PASS |
| manager | Customer一覧・B1詳細とActivity履歴を表示。Customer登録・編集・削除、Activity登録、Users入口は非表示。Reports入口から画面へ遷移可能 | Customer POST、Activity POST、Users GETは403 | PASS |
| admin | Customer一覧・B1詳細、登録・編集・削除、Activity履歴・登録、Reports入口を表示。Users一覧とrole変更controlを表示 | 許可操作の画面と実API取得を確認。role変更business詳細はT-503の責務として重複検証なし | PASS |
| 未認証 | ― | protected Customer APIが401 `AUTHENTICATION_REQUIRED` | PASS |

- T-505専用suiteは1 file・4 scenarios/browser。Chromium先行実行は4/4 PASS。最終実行はChromium 4/4、Firefox 4/4、WebKit 4/4、計12/12 PASSした。
- Browserから実Frontend、Vite proxy、実Backend、Repository、専用PostgreSQLへ接続した。拒否APIはPlaywright request contextでLogin APIから取得したrole別Bearer tokenを使用し、Frontendの非表示だけを認可証跡にしていない。
- staff scope外のCustomer詳細とActivity GET/POSTは、存在有無を公開しない同一404 contractを確認した。operation-level拒否は403、未認証は401となり、T-505原文の境界に適合した。
- 既存Reports回帰はChromium 21/21、Firefox 21/21、WebKit 21/21、計63/63 PASSした。初回の6 workers実行では環境負荷によりFirefox 2件が30秒timeoutとなったが、assertion差分やHTTPエラーはなかった。DB reset後、既存specを変更せず3 workersで再実行し63/63 PASSを確認した。
- E2E fixtureはusers 4、customers 6、sales_records 8、activities 0を安全guard付きreset後に確認した。Docker CLIは使用せず、`127.0.0.1:55432`へ直接接続した。production DBとschemaは変更していない。
- production修正はCustomer詳細への既存Activity履歴component接続のみ。関連Frontend test 3 files・58/58、Frontend全test 15 files・166/166、Frontend buildがPASSした。Backend fixture変更の回帰としてBackend全test 43 files・321/321、Backend buildもPASSした。
- staff・manager・adminのBrowser表示制御、401・403・scope外404、Reports・Users role制御、既存Reports回帰がすべてPASSしたため、T-505はPASS・完了。T-501～T-505のAuthorization一連もPASS・完了と判定する。

## 2026-09-22 T-207 顧客CRUD・一覧・検索Playwright検証（PASS）

| Scenario | 確認内容 | 結果 |
| --- | --- | --- |
| 一覧・検索・filter・sort | active Customer 5件の一覧、logical deleted除外、顧客名部分一致、category完全一致、AND条件、`name_asc`・`name_desc`・`created_at_asc`・`created_at_desc`を確認 | PASS |
| pagination・state保持 | 21件の一時データで20件表示、次へ・前へ、current pageを確認。検索・sort・page size変更時のpage 1 reset、50・100件表示、page移動とDetail往復後の条件維持を確認 | PASS |
| CRUD連続flow | adminでlistから登録画面へ移動し、create、一覧検索、detail、edit、更新後detail再取得、更新後条件でのsearch、logical delete、一覧・検索からの消失を確認 | PASS |

- 使用roleはadmin。CRUD全操作を一連で検証し、T-505で確認済みのmanager・staff拒否は重複させていない。
- Chromium先行実行は3/3 PASS。最終実行はChromium 3/3、Firefox 3/3、WebKit 3/3、計9/9 PASSした。実Frontend、Vite proxy、実Backend、Repository、専用PostgreSQLを使用し、Customer APIのmockは使用していない。
- pagination用Customer 21件はscenario内でAPI作成し、終了時に論理削除した。共通fixture、production DB、schemaは変更していない。Docker CLIは使用せず、`127.0.0.1:55432`へ直接接続した。
- 既存E2E回帰はAuthorization 12/12 PASS。ReportsはChromium 21/21、WebKit 21/21、Firefox再実行21/21で、browser別の全scenarioがPASSした。Firefox初回の既存smoke 1件は環境負荷による30秒timeoutであり、workers 1の再実行ではPASSした。
- productionコードは変更していない。Backend/Frontendのunit・component testとbuildはT-505時点の321/321、166/166、両build PASSを維持し、今回は再実行していない。
- T-207原文の顧客CRUD・一覧・検索を3 browserで証明したため、T-207はPASS・完了と判定する。

## 2026-09-22 T-601 顧客検索performance/configuration確認（PASS）

| 確認対象 | 実測・確認結果 | 判定 |
| --- | --- | --- |
| Customer SQL | active条件、staff scope、name部分一致、category、owner filterをANDで構築。items/countのWHERE一致 | PASS |
| Pagination | `offset = (page - 1) * page_size`、上限100、itemsだけLIMIT/OFFSET、scope・filter後count、4 sortすべて`id ASC` tie-breaker | PASS |
| Index | idのunique primary keyと、name・category・owner_user_id・deleted_atの各B-treeをmigrationと実DBで確認 | PASS |
| Connection pool | `pg.Pool`を共有。max 10、min 0、idle 10秒。connection・statement・query timeoutは未設定 | PASS |
| Pool終了処理 | SIGINT/SIGTERMでHTTP server停止後に`pool.end()`。transaction clientは`finally`でrelease | PASS |

| Query | E2E fixtureでのplan | Execution Time |
| --- | --- | ---: |
| default list | `customers_deleted_at_idx` Index Scan → Sort → Limit | 0.045ms |
| staff owner scope | `customers_owner_user_id_idx` Index Scan → Sort → Limit | 0.027ms |
| category filter | `customers_category_idx` Index Scan → Sort → Limit | 0.021ms |
| owner filter | `customers_owner_user_id_idx` Index Scan → Sort → Limit | 0.022ms |
| name部分一致 | `customers_deleted_at_idx` Index Scan後にILIKE filter → Sort → Limit | 0.108ms |
| created_at sort | `customers_deleted_at_idx` Index Scan → Sort → Limit | 0.025ms |

- 上表はcustomers 6件のE2E DBで得たplanner上の事実であり、本番件数での性能を示さない。N-01の本番相当データ・通常負荷時p95 3秒以内はT-602で測定する。
- `ILIKE '%query%'`に通常のB-tree name indexは利用されなかった。将来のデータ増加時は`pg_trgm`とGIN/GiSTが候補だが、正本に採用条件がなくT-602の測定前であるため今回は追加していない。
- pool maxやtimeoutの目標値は正本にないため、library既定値を推測で変更していない。接続数はmax 10で有界。transaction release漏れはなく、test/prodで別のpool実装も使用していない。
- production変更はapplication終了時のpool close追加のみ。schema・index・Customer SQL・paginationは変更していない。関連test 5 files・55/55、Backend全test 44 files・322/322、Backend buildがPASSした。Frontend変更とPlaywright実行はない。
- index、pagination、connection poolが正本どおり設定され、明確だったpool終了処理のGapも解消したため、T-601はPASS・完了と判定する。

## 2026-09-22 T-602 Customer検索性能測定（PASS）

### 性能受入用データと実行環境

| 項目 | 実測値 |
| --- | --- |
| Customer | 100,000件 |
| active / logical deleted | 95,000件 / 5,000件 |
| owner | 100 users、各1,000件 |
| category | 20種類、各4,500件 |
| category `NULL` | 10,000件 |
| name no-hit / low-hit / high-hit | 0件 / 100件 / 10,000件（active customer対象） |
| Node.js / PostgreSQL | v24.19.0 / 16.15 |
| concurrency / pool max | 1 / 10 |
| warm-up / measured requests | scenarioごとに10回 / 100回 |
| p95 | 測定値を昇順に並べたnearest-rank方式の95番目 |
| deep pagination | `page=950`、`page_size=100`、`OFFSET 94900` |

このdatasetはT-602/T-603用の再現可能なPhase 1 Acceptance modelであり、production実績件数やproduction環境の性能保証値ではない。

### HTTP benchmark

| Scenario | Measured | Median | p95 | Max | 判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| default list | 100 | 16.315ms | 21.399ms | 22.648ms | PASS |
| name no-hit | 100 | 65.683ms | 69.256ms | 104.250ms | PASS |
| name low-hit | 100 | 65.937ms | 78.616ms | 106.329ms | PASS |
| name high-hit | 100 | 65.574ms | 68.004ms | 77.385ms | PASS |
| category filter | 100 | 16.271ms | 18.569ms | 20.467ms | PASS |
| owner_user_id filter | 100 | 16.534ms | 18.606ms | 18.887ms | PASS |
| query + category AND | 100 | 66.042ms | 69.034ms | 74.467ms | PASS |
| name_desc sort | 100 | 16.053ms | 19.028ms | 20.466ms | PASS |
| created_at_desc sort | 100 | 16.519ms | 19.690ms | 31.054ms | PASS |
| deep pagination | 100 | 50.058ms | 56.912ms | 62.882ms | PASS |
| staff scope | 100 | 16.657ms | 18.128ms | 19.508ms | PASS |

全scenarioを混ぜず、11 scenariosを個別に判定した。全p95が3,000ms以下であり、最遅はname low-hitの78.616msだった。

### EXPLAIN (ANALYZE, BUFFERS)

| Query | Items plan / execution | Count plan / execution | 評価 |
| --- | --- | --- | --- |
| default list | Index Scan → Incremental Sort → Limit / 0.086ms | Index Only Scan → Aggregate / 7.978ms | active 95,000件のcountを含めてHTTP p95 21.399ms |
| staff scope + high-hit | owner indexのBitmap Scan → Sort → Limit / 1.280ms | owner indexのBitmap Scan → Aggregate / 0.940ms | owner security scopeがSQLへ適用された |
| name high-hit | name順Index Scan → Incremental Sort → Limit / 47.403ms | Seq Scan → Aggregate / 47.749ms | 前後wildcardのcountではname B-treeを使用しない |
| deep pagination | Index Scan → Incremental Sort → Limit / 48.701ms | Index Only Scan → Aggregate / 8.098ms | OFFSET 94,900の走査コストはあるがp95 56.912ms |

- HTTP statusは全測定requestで200、responseは`items`、`page`、`page_size`、`total_count`、`total_pages`を持つpagination envelopeだった。
- `ILIKE '%query%'`は通常のB-tree name indexで直接効率化されず、name high-hitのcountはSeq Scanとなった。ただし今回の全name scenariosはp95 3,000ms以下のため、`pg_trgm`とGIN/GiSTは将来のデータ量増加時や性能未達時の改善候補に留める。
- deep paginationは現行OFFSET方式の最終有効pageでPASSした。keyset paginationへの変更は行っていない。
- Production business code、schema、index、Customer SQL、connection pool値、pagination方式は変更していない。Backend全testは44 files・322/322 PASS、Backend buildはPASS。Frontend変更・test/buildとPlaywrightはT-602対象外のため未実施。
- 全必須scenarioがp95 3,000ms以下だったため、T-602はPASS・完了。依存条件を満たしたため、T-603 50同時ユーザー負荷試験へ着手可能と判定する。

## 2026-09-22 T-603 50同時ユーザー性能試験（PASS）

### 測定条件

| 項目 | 実測条件 |
| --- | --- |
| Dataset | Customer 100,000件、active 95,000件、logical deleted 5,000件 |
| Node.js / PostgreSQL | v24.19.0 / 16.15 |
| HTTP concurrency | 50 |
| Warm-up | scenarioごとに2 waves、100 requests |
| Measurement | scenarioごとに20 waves、1,000 requests |
| Scenario数 | 8 |
| Connection pool | `pg.Pool` max 10 |
| Acceptance | HTTP・schema成功率100%、期待外status 0件、scenario別p95 3,000ms以下 |

### Scenario別結果

| Scenario | Success | Error / unexpected | Median | p95 | p99 | Max | 判定 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| default list | 1,000/1,000 | 0 / 0 | 63.794ms | 97.440ms | 106.528ms | 116.436ms | PASS |
| name low-hit | 1,000/1,000 | 0 / 0 | 470.333ms | 830.747ms | 855.023ms | 883.549ms | PASS |
| name high-hit | 1,000/1,000 | 0 / 0 | 483.276ms | 842.520ms | 869.427ms | 915.130ms | PASS |
| category filter | 1,000/1,000 | 0 / 0 | 34.933ms | 49.278ms | 52.235ms | 53.577ms | PASS |
| query + category AND | 1,000/1,000 | 0 / 0 | 277.286ms | 469.662ms | 493.446ms | 510.053ms | PASS |
| created_at_desc sort | 1,000/1,000 | 0 / 0 | 119.775ms | 197.627ms | 206.273ms | 214.626ms | PASS |
| deep pagination | 1,000/1,000 | 0 / 0 | 249.800ms | 417.816ms | 432.230ms | 444.072ms | PASS |
| staff scope | 1,000/1,000 | 0 / 0 | 35.685ms | 51.736ms | 64.555ms | 68.755ms | PASS |

Error欄はrequest errorとinvalid responseの合計、unexpected欄はHTTP 200以外の件数である。全8,000 measured requestsでrequest error、invalid response、期待外statusはいずれも0件だった。最大wave開始時刻差は2.963msで、50 requestsが同一barrierから並行開始された。

### Connection poolとbottleneck評価

| 観測項目 | 全scenarioの結果 | 判定 |
| --- | ---: | --- |
| pool max / 最大total | 10 / 10 | 設定どおり |
| 最小idle | 0 | 50 concurrent時に全接続を使用 |
| 最大waiting | 90 | items/countの並行queryを含むpool待ちを観測 |
| scenario終了後 | total 10、idle 10、waiting 0 | leakなし |

- T-602のEXPLAINではname high-hitのitemsが47.403ms、countが47.749msで、countはSeq Scanだった。T-603ではpool max 10に対して最大90 queriesが待機し、これらのDB実行とpool待ちを含むAPI wall-clockのp95が842.520msとなった。
- concurrencyによってSQL plan自体は変わらないため、T-602のdefault list、staff scope、name high-hit、deep paginationのEXPLAINを証跡として再利用した。3秒閾値へ十分な余裕があり、追加EXPLAINは実施していない。
- Production business code、schema、index、Customer SQL、pool max・timeout、pagination方式は変更していない。改善実装は不要と判断した。将来のデータ増加や性能未達時には、pool max、`pg_trgm` + GIN、count query、deep OFFSETの見直しを個別に評価する。
- Backend全testは44 files・322/322 PASS、Backend buildはPASS。Frontend変更・test/buildとPlaywrightはT-603対象外のため未実施。
- 全必須scenarioで成功率100%、期待外status 0件、p95 3,000ms以下となったため、T-603はPASS・完了と判定する。

## 2026-09-22 T-004 個人情報暗号化・鍵管理仕様レビュー（PASS）

| 確認対象 | 確定内容 | 判定 |
| --- | --- | --- |
| 暗号化対象 | `name_kana`、`email`、`phone`、`address` | PASS |
| 平文field | `name`、`category`、`owner_user_id`、識別・日時field。既存検索・sort・scopeを維持 | PASS |
| 暗号方式 | application-level AES-256-GCM、32-byte key、値ごとのrandom 12-byte IV、16-byte tag、field名を含むAAD | PASS |
| 保存形式 | `enc:v1:<key-id>:<iv-base64>:<tag-base64>:<ciphertext-base64>`、`null`はDB `NULL` | PASS |
| 鍵管理 | 環境設定のcurrent key IDとkey ring。DB・source・repositoryへ保存せず、不正設定は起動失敗 | PASS |
| Rotation・移行 | read時再暗号化なし。明示的なone-shot migrationを使用し、active・logical deletedを対象化。steady stateのplaintext混在禁止 | PASS |
| 復号Authorization | 既存Role Matrixを使用し、DB scope/resource判定とscope Authorizationの後に返却対象だけ復号 | PASS |
| Error・秘密情報 | crypto failureはfail closed。鍵、plaintext、完全なenvelopeを公開response・log・test outputへ出さない | PASS |

- 01～06と既存のCustomer検索・Role Matrixを照合し、重大な仕様矛盾がないことを確認した。`name`を平文で維持するため、既存の`ILIKE '%query%'`と`name_asc`・`name_desc`を変更しない。
- 02/03/04へ要件、技術方式、T-107実装条件、T-604 Acceptanceを反映した。Production code、schema、testは変更・実行していない。
- T-004はPASS・完了。T-107は着手可能であり、T-604はT-107完了後に再開する。

## 2026-09-22 T-107 Customer暗号化・復号処理検証（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| AES-256-GCM | random 12-byte IV、16-byte tag、field別AADでencrypt/decrypt | PASS |
| 非決定性 | 同一plaintextの複数回暗号化でIVとenvelopeが不一致 | PASS |
| Key configuration | current key ID、key ring、JSON・Base64・32-byte validation | PASS |
| Startup validation | 欠落・不正設定、current key不存在をserver起動前に拒否 | PASS |
| Create / edit / null | 保存前暗号化、変更fieldのみ再暗号化、省略field維持、DB `NULL`維持 | PASS |
| Read | list/detail/create/edit responseで既存plaintext DTOを維持 | PASS |
| Fail closed | field AAD違い、tampered ciphertext/tag、unknown・wrong key、malformed envelopeを拒否 | PASS |
| Migration | active・logical deletedを暗号化し、`NULL`・既存envelopeを維持。再実行0更新 | PASS |
| Rollback | malformed `enc:v1`でtransaction rollback | PASS |
| Regression | 関連8 files・91/91、全47 files・345/345、Backend build | PASS |

- 暗号設定のerrorは固定messageを使用し、crypto errorはCustomer APIの既存generic 500へ変換する。鍵値、Customer plaintext、完全なciphertext envelopeをerrorやlogへ追加していない。
- Production codeはcrypto component、設定validation、Customer Service/Router統合、offline migrationを変更した。Customer schema、検索SQL、index、pagination、Frontend contractは変更していない。
- T-107はPASS・完了と判定する。

## 2026-09-22 T-604 Customer情報暗号化・復号権限 最終Acceptance（PASS）

| Acceptance | 実PostgreSQL・HTTP結果 | 判定 |
| --- | --- | --- |
| DB暗号化 | 4 fieldのnon-null保存値が入力plaintextと不一致で、validな`enc:v1` envelope | PASS |
| Authorized decrypt | staff own、manager、adminのdetailとstaff listが元のplaintext DTOを返却 | PASS |
| Scope前decrypt禁止 | staff otherはService unit testでdecrypt 0回、実HTTPで404 `CUSTOMER_NOT_FOUND` | PASS |
| Create | plaintext request、DB ciphertext、201 plaintext response | PASS |
| Edit | 変更fieldは新envelope、省略fieldのenvelopeは不変、`null`はDB `NULL` | PASS |
| Migration | active・logical deletedを暗号化し、完了後のplaintext残存なし | PASS |
| Idempotency | 再実行で更新Customer 0、暗号化値0 | PASS |
| Tamper・key error | tamper、wrong key、unknown key、malformed envelopeをfail closed | PASS |
| Search contract | `name`・`category`・`owner_user_id`は平文、既存SQL・index・pagination変更なし | PASS |
| Secret・PII非開示 | 鍵値と完全なciphertextをrepository、report、test outputへ出力せず、公開DTOにcrypto metadataなし | PASS |

- Docker CLIは使用せず、専用E2E PostgreSQL `127.0.0.1:55432`へ接続した。検証用Customerは終了時に削除し、production DBは使用していない。
- Backend全テストは47 files・345/345 PASS、Backend buildはPASS。Frontend変更はなく、Frontend test/buildとPlaywrightはT-604対象外のため未実施。暗号化対象は検索fieldではないためT-601～T-603の性能benchmarkも再実行していない。
- DB実値、復号Authorization、migration、fail-closed error、全回帰が受入条件を満たしたため、T-604はPASS・完了と判定する。

## 2026-09-22 T-005 既存Customer mapping・移行仕様レビュー（PASS）

| 確認対象 | 添付Excel・仕様の確認結果 | 判定 |
| --- | --- | --- |
| Source | Office Open XMLの演習用synthetic data。指定された6 sheetと必須headerを確認 | PASS |
| Source件数 | Customer 40件。削除フラグ0が36件、1が4件 | PASS |
| Mapping | Customer全11 field、移行対象外の備考、新UUID、日時・null・暗号化規則を確定 | PASS |
| Owner | 担当者メール→active担当者マスタ→`users.email`完全一致→`users.id`。氏名照合なし | PASS |
| Category | A→法人、B→個人、C→重点、D→休眠、空欄→`null`、未知値→reject | PASS |
| Duplicate | Source顧客番号の重複1 group・2 recordを両方reject。email/nameは判定keyにしない | PASS |
| Valid / reject | valid 31件、reject 9件。validはactive 28件、logical deleted 3件 | PASS |
| Transaction | valid recordだけを設定可能なbatch単位でtransaction commit。system errorは該当batchをrollback | PASS |
| Retry | 移行台帳をCustomerと同一transactionで記録し、同じdataset/source IDの二重insertを防止 | PASS |
| Encryption | 4 fieldをmapping・validation後、DB write前にT-107 AES-256-GCMで暗号化 | PASS |
| Reconciliation | source = inserted + already migrated + reject、target差分、理由別件数、envelope、plaintext残存0を照合 | PASS |
| Security | reject/logへplaintext PII全文、鍵、完全なciphertext envelopeを出さない | PASS |

| Primary reject reason | Record数 | 確認内容 |
| --- | ---: | --- |
| `DUPLICATE_SOURCE_ID` | 2 | 同一Source顧客番号を持つ2行をともにreject |
| `NAME_REQUIRED` | 1 | 必須の顧客名が空欄 |
| `OWNER_EMAIL_REQUIRED` | 1 | 必須の担当者メールが空欄 |
| `INVALID_EMAIL` | 1 | email形式不正 |
| `OWNER_MAPPING_FAILED` | 1 | 担当者マスタ・usersへ解決不能 |
| `UNKNOWN_CATEGORY` | 1 | 未知カテゴリコード |
| `DELETE_STATE_INCONSISTENT` | 2 | flag 1/dateなし、flag 0/dateありを各1件 |
| **合計** | **9** | 演習ケース8種類。duplicate 1ケースが2 recordのため9 record |

- Excelの実データ40件と「演習ケース一覧」を突合し、初回migrationの期待値を31 insert、9 rejectと確定した。Source顧客番号、担当者、カテゴリ、日時、logical deleteの意味はデータ辞書と各masterで確認でき、仕様化を妨げる矛盾はなかった。
- 02/03/04へ要件、詳細設計、T-005完了条件とT-701実装責務を反映した。01、Production code、DB schema、Frontendは変更していない。仕様確定TaskのためBackend/Frontend test・build、Playwright、実migrationは未実施。
- Source schema、mapping、UUID、master mapping、duplicate、validation/reject、batch、retry/idempotency、暗号化順序、reconciliation、security/loggingが確定したため、T-005はPASS・完了と判定する。T-701は着手可能である。

## 2026-09-22 T-701 既存Customer data migration Acceptance（PASS）

| 実行 | Source | Inserted | Already migrated | Rejected | Reconciliation | 判定 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| First run | 40 | 31 | 0 | 9 | 40 = 31 + 0 + 9 | PASS |
| Second run | 40 | 0 | 31 | 9 | 40 = 0 + 31 + 9 | PASS |

| Reject reason | Record数 | 判定 |
| --- | ---: | --- |
| `DUPLICATE_SOURCE_ID` | 2 | PASS |
| `NAME_REQUIRED` | 1 | PASS |
| `OWNER_EMAIL_REQUIRED` | 1 | PASS |
| `OWNER_MAPPING_FAILED` | 1 | PASS |
| `UNKNOWN_CATEGORY` | 1 | PASS |
| `INVALID_EMAIL` | 1 | PASS |
| `DELETE_STATE_INCONSISTENT` | 2 | PASS |
| **合計** | **9** | **PASS** |

| Acceptance | 実測結果 | 判定 |
| --- | --- | --- |
| Excel fixture | 正式fixtureの6 sheet・必須header、「既存顧客データ」40件を解析 | PASS |
| UUID | 31件すべてに新しいUUID v4を採番 | PASS |
| Owner / category | active担当者masterと`users.email`の完全一致、A/B/C/D・空欄のmapping | PASS |
| Active / deleted | active 28件、logical deleted 3件 | PASS |
| Duplicate | 重複groupの2 recordをrejectし、Customer・ledgerへ未登録 | PASS |
| Batch transaction | Customerとledgerを同一transactionでcommit。失敗batchはrollbackし、以前のcommit済みbatchを維持 | PASS |
| Retry / idempotency | Second runで31件を`already_migrated`とし、Customer二重登録なし | PASS |
| Source変更 | fingerprint相違を`SOURCE_CHANGED_AFTER_MIGRATION`としてrejectし、既存Customerを未更新 | PASS |
| Encryption | 4 fieldのnon-null DB値はplaintextと不一致で、validな`enc:v1` envelope | PASS |
| Plaintext残存 | migration対象31件で0 | PASS |
| Authorized read | 代表active Customerを既存read serviceで復号し、source内容・owner/category mappingと一致 | PASS |
| Reject security | reject JSONにplaintext PII全文、鍵、完全なciphertext envelopeなし | PASS |

- Docker CLIは使用せず、専用E2E PostgreSQL `127.0.0.1:55432`で実Excelを2回処理した。Acceptance終了時にmigration対象Customer、ledger、検証用owner usersを削除し、既存fixtureを維持した。
- 関連テストは4 files・10/10 PASS、Backend全テストは50 files・353/353 PASS、Backend buildはPASSした。Frontendは変更しておらず、Frontend test/buildとPlaywrightはT-701対象外のため未実施。
- schema変更はmigration ledgerの追加だけで、既存Customers schema・indexとCustomer API behaviorは変更していない。全Acceptanceを満たしたため、T-701はPASS・完了と判定する。

## 2026-09-22 T-007 運用・監視・backup・障害対応仕様レビュー（PASS）

| 確認対象 | 確定内容 | 判定 |
| --- | --- | --- |
| Production | AWS `ap-northeast-1`。S3・CloudFront、ECS Fargate・ALB、Multi-AZ RDS PostgreSQL 16 | PASS |
| TLS | Public HTTPS、HTTP redirect、Backend・RDS間TLS、AWS RDS CAによるserver certificate検証 | PASS |
| Secrets | AWS Secrets ManagerからECS Taskへinject。Git・image・DB・log・文書へ値を保存しない | PASS |
| Rotation | DB credential・JWT 90日、Customer key 180日、incident時は即時 | PASS |
| Backup | RDS automated backup・PITR、7日retention、重要変更前snapshot 14日 | PASS |
| Backup security | RDS・backupのKMS encryption、最小権限、Customer key非同梱 | PASS |
| Restore | 四半期に分離temporary RDSへrestoreし、schema・table・FK・件数・envelope・decryptを確認 | PASS |
| RPO / RTO | 5分以内 / 60分以内。local実測だけではAWS本番保証としない | PASS |
| Monitoring | CloudWatchでECS・ALB・RDS・applicationを監視 | PASS |
| Alert | CloudWatch Alarm → SNS → 運用担当メール | PASS |
| Maintenance | 原則3営業日前と開始1時間前。緊急時は決定後速やかに通知 | PASS |
| Incident | 検知後15分以内に一次切り分け。temporary restore後に復旧判断 | PASS |
| T-702引継ぎ | production validation、RDS TLS、env interface、backup/restore・restore検証を具体化 | PASS |

- 02/03/04へPhase 1 production運用モデルとT-702以降の責務を反映した。01、Production code、DB schema、Frontend、AWS resourceは変更していない。
- 仕様確定TaskのためBackend/Frontend test・build、Playwright、backup/restore、AWS上の検証は未実施である。必要な運用契約が揃ったため、T-007はPASS・完了、T-702は再開可能と判定する。

## 2026-09-22 T-702 Production設定・backup/restore検証（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Production entry point | `NODE_ENV=production`以外をserver import前に拒否 | PASS |
| Required environment | DB、JWT、Customer暗号設定、RDS CAの欠落・不正を拒否 | PASS |
| Database URL | URL parseとPostgreSQL protocolを検証。errorへcredentialなし | PASS |
| RDS TLS | CA file読込、`rejectUnauthorized: true`。Productionで無効化不可 | PASS |
| Secrets Manager interface | AWS SDKなし。ECS environment injection前提 | PASS |
| Pool | max 10、min 0、idle 10秒。追加timeoutなし | PASS |
| Backup command | custom-format `pg_dump`、passwordはargumentへ渡さない | PASS（unit） |
| Restore command | 分離DBを指定した`pg_restore --exit-on-error` | PASS（unit） |
| Runbook | RDS backup・PITR・snapshot・KMS・restore drill・alertを記録 | PASS |
| Artifact protection | `.env.*`とbackup artifactをGit対象外に設定 | PASS |
| Client tool availability | `pg_dump`・`pg_restore` 16.15を確認 | PASS |
| Local backup artifact | custom-format artifactの生成とnon-emptyを確認 | PASS |
| Separated restore | sourceとは別のtemporary databaseへrestoreし、接続を確認 | PASS |
| Restored schema・table | users、customers、activities、sales_records、audit_logs、customer_migration_ledgerを確認 | PASS |
| Restored row count・FK | sourceとrestoreの代表row countおよびFK数の一致を確認 | PASS |
| Restored Customer envelope | 4暗号化fieldのnon-null値がvalidな`enc:v1`で、plaintext残存0を確認 | PASS |
| Authorized decrypt | restore後の代表CustomerをT-107 test keyで復号 | PASS |
| Secret protection | application secretをdumpへ追加せず、credentialをcommand argumentへ渡していない | PASS |
| Cleanup | temporary restore databaseとbackup artifactを削除し、source E2E DBを維持 | PASS |

- `verify:backup-restore`は専用E2E PostgreSQLを安全にresetし、実backupから分離databaseへrestoreした。6主要table、代表row count、FK、移行台帳、Customer暗号化状態、authorized decryptを検証し、924msで完了した。これはlocalでの技術的な復元確認であり、AWS本番RTOの実績ではない。
- 関連テストは6 files・50/50 PASS、Backend全テストは52 files・370/370 PASS、Backend buildはPASSした。Frontendは変更しておらず、Frontend test/buildとPlaywrightは対象外のため未実施である。AWS resourceも作成していない。
- secret、credential、PII、完全なciphertextは出力していない。temporary restore databaseとbackup artifactは検証後に削除した。
- RPO 5分・RTO 60分はRDS PITRと四半期restore drillで継続検証する運用目標である。local実測値だけでAWS本番RTOを保証しない。
- Production config、TLS、secret interface、runbook、実backup・分離restore、データ整合性、暗号化状態、回帰検証がすべて揃ったため、T-702はPASS・完了と判定する。
## 2026-09-22 T-607 Monitoring・Health Check受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| `GET /health/live` | 認証不要で200 `{ "status": "ok" }`。DB query 0回 | PASS |
| `GET /health/ready` DB正常 | `SELECT 1`後に200 `{ "status": "ready" }` | PASS |
| `GET /health/ready` DB異常 | 内部errorを出さず503 `{ "status": "unavailable" }` | PASS |
| ALB health contract | path `/health/ready`、success code 200 | PASS |
| CloudFormation parse | `infra/monitoring.yaml`を実際にYAML parse | PASS |
| Required parameters | 環境、ECS、ALB、Target Group、RDS、通知先を確認。secret parameterなし | PASS |
| SNS wiring | Topic・email subscription、全12 AlarmのAlarmActions/OKActionsを確認 | PASS |
| ECS Alarm | CPUUtilization、MemoryUtilization | PASS |
| ALB Alarm | healthy target 0、unhealthy target、target 5xx、response time | PASS |
| RDS Alarm | CPU、connections、free memory/storage、read/write latency | PASS |
| RDS EventSubscription | `availability`・`failure`・`backup`をSNSへ接続 | PASS |
| Restore drill | 既存T-702 runbookへ手動失敗時のincident escalationを接続 | PASS |
| Secret・PII保護 | Health、template、Alarm description、runbookに値・PII・完全envelopeなし | PASS |
| AWS resource deployment | local環境では実施しない | 未実施（完了条件外） |

- T-607関連テストは2 files・9/9 PASS。Backend全テストは53 files・378/378 PASS、Backend buildはPASSした。
- AWS CLIはlocal環境にないため`validate-template`とstack deployは未実施。YAML parse、required parameter、SNS/Alarm wiring、RDS EventSubscriptionをstatic testで検証した。AWS resource未deployはT-607の完了条件外である。
- Frontendは変更しておらず、Frontend test/buildとPlaywrightは対象外のため未実施。T-702 backup/restore Acceptanceも再実行していない。
- Health、ALB readiness、CloudWatch Alarm、SNS通知、RDS event・backup監視、restore drill手順、runbook、static validation、Backend回帰が揃ったため、T-607はPASS・完了と判定する。
## 2026-09-22 T-609 Maintenance notification受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Event validation | 必須値、absolute instant、復旧予定の時系列を確認 | PASS |
| Phase validation | PLANNED + INITIAL/REMINDER、EMERGENCY + EMERGENCY | PASS |
| 不正phase | PLANNED + EMERGENCY、EMERGENCY + INITIAL/REMINDERを拒否 | PASS |
| Recipient | active users 4件だけ。inactive user delivery 0件 | PASS |
| INITIAL | 4 target / 4 SENT | PASS |
| INITIAL再実行 | 0 sent / 4 skipped。二重送信なし | PASS |
| REMINDER | INITIALと別phaseで4 SENT | PASS |
| EMERGENCY partial failure | 初回3 SENT / 1 FAILED。後続送信継続 | PASS |
| FAILED retry | 1 SENT / 3 skipped。失敗recipientだけ再送 | PASS |
| Delivery record | 実PostgreSQLへ12件、最終statusはすべてSENT | PASS |
| SES adapter | UTF-8 plain text request、sender・recipient・subject/body、message IDを確認 | PASS |
| Failure protection | provider生errorを保存せず`SES_SEND_FAILED`だけを記録 | PASS |
| Secret・PII保護 | CLI summaryに件数だけを出し、credential・Customer PII・recipient一覧なし | PASS |
| AWS SES実送信 | local環境では実施しない | 未実施（完了条件外） |

- T-609関連テストは6 files・39/39 PASS。実E2E PostgreSQLとfake transportによるAcceptanceもPASSした。
- Backend全テストは57 files・395/395 PASS、Backend buildはPASSした。Frontendは変更しておらず、Frontend test/buildとPlaywrightは対象外のため未実施である。
- event作成、active recipient、全3 phase、SES production adapter、DB record、重複抑止、partial failure、retry、runbook、schema migration、Backend回帰が揃ったため、T-609はPASS・完了と判定する。

## 2026-09-22 T-703 運用manual・監視・障害連絡受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Document existence | 統合manual、incident contacts、既存3 runbookを確認 | PASS |
| Cross-reference | manualからmonitoring、backup/restore、maintenance、contactsへのlinkを確認 | PASS |
| Incident severity | SEV1〜3の判断基準とSEV1の15分以内初動を確認 | PASS |
| Contact matrix | 7 roleの責務、条件、順序、Git外rosterを確認 | PASS |
| Scenario walkthrough | ALB、health、5xx、RDS 3種、restore、maintenance 3種の10件 | PASS |
| Evidence policy | incident、maintenance、restore drillの記録項目を確認 | PASS |
| Secret・PII | credential、実連絡先、plaintext PII、完全ciphertextの実値なし | PASS |
| Natural Japanese lint | 新規2文書はfindings 0。03/05/06も検査し、既存大文書全体の統計的指摘だけでT-703追加箇所に個別指摘なし | PASS |
| Production code / DB schema | 変更なし | 未実施（変更不要） |
| Backend test / build | Production code変更なしのため再実行なし | 未実施（完了条件外） |

- 既存runbookを重複コピーせず、統合manualを状況判断の入口として接続した。全10 scenarioでdetection、first action、runbook、escalation、通知要否、recovery、evidenceを追跡できる。
- 実在人物の連絡先はrepositoryへ置かず、Git外のアクセス制御されたProduction operations contact rosterを正式な管理先とした。
- 統合operations manual、monitoring procedure、incident response、severity、contact matrix、backup・restore、maintenance、secret rotation、release・migration、scenario walkthroughが揃ったため、T-703はPASS・完了と判定する。

## 2026-09-22 T-608 Business-hours availability受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Expected slot | JST月～金、09:00・17:55を含む5分interval。18:00と週末を除外 | PASS |
| JST / UTC boundary | 2026-09のJST月境界とUTC変換、CanaryのUTC 00:00～08:55を確認 | PASS |
| Month handling | 過去月全体、当月は現在時刻以前、未来月error | PASS |
| 100% fixture | success 100 / expected 100、100%、PASS | PASS |
| Exact 99% fixture | success 99 / expected 100、99%、PASS | PASS |
| Below 99% fixture | success 98 / expected 100、98%、FAIL | PASS |
| Missing | 分母を維持し、missingをfailure側へ計上 | PASS |
| Failure / duplicate | 明示failureを分離し、duplicateを二重countせずfailure優先 | PASS |
| Synthetic probe | Frontend 2xx + ready 200/status readyだけ成功 | PASS |
| Probe failure | Frontend failure、ready 503、malformed JSON、非readyを拒否 | PASS |
| CloudWatch adapter | `SuccessPercent`、CanaryName、300秒periodを確認 | PASS |
| CloudFormation | YAML parse、Canary、IAM、S3 artifact、URL parameter、cron、secret非混入 | PASS |
| AWS CLI validation | local環境にAWS CLIなし | 未実施（static validationで代替） |
| AWS deploy / Production実測 | localでは実施しない | 未実施（完了条件外） |

- T-608関連テストは4 files・20/20 PASS。Backend全テストは60 files・411/411 PASS、Backend buildはPASSした。
- Frontendは変更しておらず、Frontend test/buildとPlaywrightは対象外のため未実施である。DB schemaと既存T-607 Health・Alarm契約も変更していない。
- 平日・時間帯、5分interval、formula、missing、Synthetics probe、月次calculator、CLI、runbook、static validation、Backend回帰が揃ったため、T-608はPASS・完了と判定する。実Production availabilityはAWS deploy後の月次運用で継続測定する。

## 2026-09-22 T-610 Maintenance notification timing受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Business day | JST月～金。Monday～Friday開始の3営業日前を固定時刻で確認 | PASS |
| INITIAL boundary | deadline exactly・1秒前はPASS、1秒後は`INITIAL_LATE` | PASS |
| REMINDER boundary | -65分・-60分・-55分はPASS。window外はtoo early / late | PASS |
| EMERGENCY boundary | created時刻、+5分、+15分はPASS、+15分1秒はlate | PASS |
| Invalid timestamp | first attemptがcreatedより前の場合はFAIL | PASS |
| Timing / delivery分離 | 15分以内attempt + FAILEDはtiming PASS、delivery FAIL | PASS |
| First attempt evidence | retry後も`first_attempted_at`を維持し、`attempted_at`だけ更新 | PASS |
| Verification CLI | PASS exit 0、timing FAIL exit 2、safe system error exit 1 | PASS |
| A: INITIAL on-time | `INITIAL_ON_TIME` | PASS |
| B: INITIAL late | `INITIAL_LATE` | 期待どおりFAIL |
| C: REMINDER window内 | `REMINDER_ON_TIME` | PASS |
| D: REMINDER too early | `REMINDER_TOO_EARLY` | 期待どおりFAIL |
| E: REMINDER late | `REMINDER_LATE` | 期待どおりFAIL |
| F: EMERGENCY 15分以内 | `EMERGENCY_ON_TIME` | PASS |
| G: EMERGENCY 15分超 | `EMERGENCY_LATE` | 期待どおりFAIL |
| H: FAILED後retry SENT | 初回attempt基準で`EMERGENCY_ON_TIME` | PASS |
| Cleanup | Acceptance event・delivery残存0 | PASS |

- T-610関連テストは4 files・12/12 PASS。実E2E PostgreSQL AcceptanceもPASSした。Backend全テストは63 files・422/422 PASS、Backend buildはPASSした。
- Phase 1にはrecipient snapshotがないため、delivery recordが存在するrecipient集合を対象証跡とする。当時activeでもdelivery未作成のuserは事後に完全再構成できず、T-610は対象者網羅性を証明しない。
- Frontendは変更しておらず、Frontend test/buildとPlaywrightは未実施。schedulerと実AWS SES送信も完了条件外のため未実施である。
- INITIAL、REMINDER、EMERGENCY、recipient集計、初回attempt、CLI、実DB Acceptance、runbook、Backend回帰が揃ったため、T-610はPASS・完了と判定する。

## 2026-09-22 T-704 Production migration rehearsal受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| PostgreSQL client | `pg_dump` / `pg_restore` 16.15 | PASS |
| Safety guard | E2E環境、localhost、port、source DB、許可DB名、接続identityを確認。wrong DBを拒否 | PASS |
| Precheck | PostgreSQL 16、001～003 baseline、暗号設定、plaintext残存0、tool、artifact作成条件 | PASS |
| Pre-migration backup | custom-format artifact生成、non-empty、application secret非同梱 | PASS |
| Forward schema | 001～003適用済みbaselineから004を適用し、column・constraintを確認 | PASS |
| Customer migration初回 | source 40 / inserted 31 / rejected 9、active 28 / deleted 3 | PASS |
| Reject内訳 | duplicate 2、name 1、owner email 1、owner mapping 1、category 1、email 1、delete state 2 | PASS |
| Forward integrity | schema、FK、ledger 31、Customer二重登録0、`enc:v1`、plaintext残存0 | PASS |
| Application smoke | `live` 200、`ready` 200、authorized Customer read | PASS |
| Failure injection | 意図したmigration failure後にapplication rolloutは`NOT_RUN` | PASS |
| Rollback restore | pre-change backupをforward DBとは別のrollback DBへ`pg_restore` | PASS |
| Rollback integrity | baseline schema、全table row count、FK、migration data 0、Customer暗号化・復号がpre-stateと一致 | PASS |
| Rerun / idempotency | 004は適用済みskip。T-701は0 inserted / 31 already migrated / 9 rejected | PASS |
| Cleanup | rehearsal・failure・rollback DB、backup artifact、temporary fileを削除 | PASS |
| Local所要時間 | 2,176ms。AWS本番RTOの保証値には使用しない | PASS |
| 実AWS / RDS migration | Production・RDS snapshot restoreは実施しない | 未実施（完了条件外） |
| 旧application binary rollback | repositoryに旧binaryがないため手順確認のみ | 未実施（DB rollback Acceptanceと分離） |

- T-704関連テストは5 files・24/24 PASS。実PostgreSQL rehearsalもPASSした。Backend全テストは64 files・431/431 PASS、Backend buildはPASSした。
- Production business API、Production startup、Production schema、Frontend、AWS resourceは変更していない。Frontend test/buildとPlaywrightは対象外のため未実施である。
- Safety、backup、forward、31/9 reconciliation、health smoke、failure stop、rollback、pre-state整合、idempotency、cleanup、runbookが揃ったため、T-704はPASS・完了と判定する。

## 2026-09-22 T-801 Backend単体・統合テスト受入（PASS）

| 検証対象 | 結果 | 判定 |
| --- | --- | --- |
| Initial Backend全test | 64 files・431 tests。FAIL 0、SKIP 0 | PASS |
| Unit test | service、validation、policy、crypto、timing、availability等を含む既存suite | PASS |
| Integration test | API、middleware、repository、configuration、migration・operation helper等を含む既存suite | PASS |
| Security regression | 401、403、staff scope外404、secret非公開、crypto fail closed、plaintext PII非保存、Production config fail closed | PASS |
| DB cleanup | 安全ガード付きE2E DB reset後、maintenance event・delivery、migration ledger、audit log、activityは0件。基準fixture件数も一致 | PASS |
| Time dependency | maintenance timing、availability、JWT expiryの既存testがPASS | PASS |
| External dependency | 実AWS credential・実AWS接続なしで全suiteが完結 | PASS |
| Defect | 新規不具合0件。修正なし | PASS |
| Final Backend全test | 64 files・431 tests。FAIL 0、SKIP 0 | PASS |
| Backend build | TypeScript compile成功 | PASS |
| Frontend / Playwright | T-801対象外 | 未実施 |

- Production code、test code、DB fixture・setupは変更していない。Production API contractと業務仕様の回帰はなかった。
- 既知の失敗0件、予期しないskip 0件、DB cleanup PASS、Backend build PASSのため、T-801はPASS・完了と判定する。
