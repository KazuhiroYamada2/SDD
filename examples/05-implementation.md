# 実装記録

## 2026-09-12 初期構成

- 実施範囲: React + TypeScript + Vite のFrontend雛形、Node.js + TypeScript + Express のBackend雛形、PostgreSQL接続設定、環境変数例、テスト環境。
- 対応タスク: ユーザー指定に基づく T-101、T-102 と、T-103のうちPostgreSQL接続設定のみ。
- 未実施: DBスキーマ、マイグレーション、トランザクション、認証・認可、顧客管理機能、外部連携、高度分析。
- Backendには `GET /health` のみを実装し、DB接続なしでもプロセス起動とヘルスチェックが可能な構成とした。
- 確認結果: Frontend/BackendのTypeScriptビルド、Vitestテスト（各1件）、開発サーバー起動、`GET /health` のHTTP 200を確認した。

## 2026-09-13 顧客情報データベーススキーマ

- 実施範囲: ユーザー指定のTask 1.1として、`users`、`customers`、`activities`、`sales_records`、`audit_logs` のスキーマを作成した。
- 実装内容: UUID主キー、必要な外部キー、作成・更新日時、論理削除日時、ロールと活動種別の制約、`customers` の検索用インデックスを `backend/migrations/001_create_core_schema.sql` に定義した。
- テスト: マイグレーションに必要なテーブル、列、外部キー、制約、検索インデックスが定義されていることをVitestで確認するテストを追加した。
- 未実施: マイグレーション実行基盤、API、認証・認可、暗号化、監査ログ記録処理は今回の対象外とした。

## 2026-09-13 顧客情報登録API

- 実施範囲: ユーザー指定のTask 1.2として、`POST /api/v1/customers` を実装した。
- 実装内容: JSON入力を検証し、パラメータ化クエリで顧客情報を登録する。正常時はHTTP 201、入力不正時はHTTP 400、DB登録失敗時はHTTP 500を返す。
- API仕様: `backend/docs/customer-registration-api.md` にリクエスト項目、検証内容、レスポンスを記載した。
- 未実施: 認証・認可、暗号化、監査ログ、顧客詳細・一覧・編集・削除・検索、画面実装は今回の対象外とした。

## 2026-09-13 顧客情報登録画面

- 実施範囲: `examples/02-planning-requirement.md` の「顧客情報の登録」を満たすReact画面を実装した。
- 実装内容: 既存の `POST /api/v1/customers` を呼び出し、入力検証、成功メッセージ、APIエラー表示を追加した。開発時はViteプロキシを経由してAPIを呼び出す。各入力にはlabel、送信フォームと主要な操作要素には安定したテストIDを設定した。
- 未実施: 顧客詳細・一覧・編集・削除・検索、活動履歴、レポート、権限管理は今回の対象外とした。

## 2026-09-17 営業活動履歴のデータモデル

- 実施範囲: 訪問記録、商談内容、次回訪問予定に必要な活動履歴のEntity/Model、Repository、DBスキーマテスト。
- 実装内容: 既存の`backend/migrations/001_create_core_schema.sql`に定義済みの`activities`テーブルを利用し、`customer_id`、`user_id`、`activity_type`、`visited_at`、`meeting_note`、`next_visit_at`、作成・更新日時をEntity/ModelとRepositoryに対応付けた。`customer_id`は`customers`への外部キーである。
- マイグレーション: `activities`テーブルは既存マイグレーションに仕様どおり存在するため、テーブルを重複作成する新規マイグレーションは追加していない。
- テスト: 活動種別の制約、顧客・ユーザー外部キー、必要な列をDBスキーマテストで確認し、Repositoryがパラメータ化クエリで保存することを確認した。
- 未実施: API、入力検証、React画面、認証・認可、レポート、活動履歴の更新・削除は今回の対象外とした。

## 2026-09-17 営業活動登録API

- 実施範囲: `POST /api/v1/customers/:customerId/activities`による訪問記録、商談内容、次回訪問予定の登録。
- 実装内容: Request DTOと入力検証、Service、既存の活動履歴Repository、顧客・ユーザー存在確認Repository、REST APIを追加した。顧客IDはURLパラメータから取得し、活動履歴の`customer_id`として保存する。
- 異常系: 不正なUUID、活動種別、日時、商談内容は400、存在しない顧客またはユーザーは404、DB未設定は503、保存失敗は500を返す。
- 未実施: React画面、活動履歴一覧・更新・削除、認証・認可、監査ログ、レポート、権限管理は今回の対象外とした。

## 2026-09-17 営業活動履歴参照API

- 実施範囲: `GET /api/v1/customers/:customerId/activities`による指定顧客の活動履歴取得。
- 実装内容: Serviceで顧客の存在を確認した後、Repositoryが訪問記録、商談内容、次回訪問予定を含む活動履歴を`created_at`の降順で取得する。
- ページング: 活動履歴APIのページング仕様は定義されていないため、追加していない。
- 未実施: React画面、活動履歴の更新・削除、認証・認可、監査ログ、レポート、権限管理は今回の対象外とした。

## 2026-09-17 顧客詳細と営業活動履歴UI

- 実施範囲: 顧客登録後に表示する顧客詳細画面、および営業活動履歴の表示・登録UI。
- 実装内容: 顧客登録APIの応答から顧客IDと担当ユーザーIDを詳細画面へ引き継ぎ、活動履歴の取得と訪問記録、商談内容、次回訪問予定の登録を実装した。各入力はlabelで関連付け、登録操作は意味のあるボタン名で提供した。
- エラー表示: 活動履歴取得と活動登録のAPIエラーを、それぞれ画面上に表示する。
- 未実施: 顧客一覧・既存顧客の詳細取得、活動履歴の更新・削除、認証・認可、レポート、権限管理、Playwrightテストは今回の対象外とした。

## 2026-09-17 営業活動履歴Playwright受入テスト

- 実施範囲: 顧客登録後の詳細画面で、訪問記録、商談内容、次回訪問予定を登録して履歴表示を確認するPlaywrightテスト。
- 実装内容: `e2e/sales-activity.spec.ts`を追加し、label、role、textによるLocatorで画面を操作した。登録後の履歴表示、再読み込み後のAPI応答、履歴取得APIエラー表示を検証する。
- テスト環境: PlaywrightがViteを起動する設定を追加した。E2E用PostgreSQLが未構成のため、API応答はテスト内の固定データでモックしている。
- 未実施: 実DBを使用した永続化確認、再読み込み後に顧客詳細画面へ復帰する導線、認証・認可のE2E確認は今回の対象外とした。

## 2026-09-17 営業活動履歴機能の差分確認

### 実装した内容

- `activities` テーブルを含むデータモデル、Activity Entity/Model、登録用リポジトリを追加した。
- 訪問記録、商談内容、次回訪問予定を登録するAPIと、指定顧客の営業活動を新しい作成日時順で取得するAPIを追加した。ページングは仕様にないため追加していない。
- 顧客登録後の詳細表示に、営業活動履歴と登録フォームを追加した。入力項目には label を、登録ボタンには意味のある名前を設定し、取得・登録のAPIエラーを画面に表示する。
- Playwrightテストで、顧客登録、営業活動登録、履歴表示、再読み込み後のモックAPI応答、および取得APIエラー表示を検証する。

### 関連する04のタスク

| タスク | 確認できた対応 |
| --- | --- |
| T-301 | 営業活動の登録・一覧APIと画面を追加した。 |
| T-302 | 訪問記録の入力・保存・表示を追加した。 |
| T-303 | 商談内容と次回訪問予定の入力・保存・表示を追加した。 |
| T-304 | customerId、日時形式、ユーザーIDの検証と顧客・ユーザー存在確認を追加した。権限による制限は未実装である。 |
| T-305 | Playwrightによる登録・表示のテストを追加した。APIはテスト内でモックしている。 |

### 主要な実装ファイル

- `backend/migrations/001_create_core_schema.sql`
- `backend/src/activities/activity-repository.ts`
- `backend/src/activities/activity-reference-repository.ts`
- `backend/src/activities/activity-validation.ts`
- `backend/src/activities/activity-service.ts`
- `backend/src/activities/activities-router.ts`
- `backend/src/app.ts`
- `frontend/src/api/activities.ts`
- `frontend/src/activities/ActivityHistory.tsx`
- `frontend/src/customers/CustomerDetail.tsx`
- `frontend/src/App.tsx`
- `e2e/sales-activity.spec.ts`
- `playwright.config.ts`

### 作成・更新したテスト

- `backend/src/migrations/activities-schema.test.ts`
- `backend/src/activities/activity-repository.test.ts`
- `backend/src/activities/activity-service.test.ts`
- `backend/src/activities/activities-api.test.ts`
- `backend/src/activities/activities-read-api.test.ts`
- `frontend/src/activities/ActivityHistory.test.tsx`
- `frontend/src/App.test.tsx`
- `e2e/sales-activity.spec.ts`

### 実行結果

- `backend` で `npm.cmd run build` を実行し、成功した。
- `backend` で `npm.cmd test` を実行し、9ファイル・32テストが成功した。
- `frontend` で `npm.cmd run build` を実行し、成功した。
- `frontend` で `npm.cmd test` を実行し、2ファイル・8テストが成功した。
- `npx.cmd playwright test e2e/sales-activity.spec.ts --project=chromium` を実行し、2テストが成功した。

## 2026-09-17 売上推移API

- 実施範囲: `GET /api/v1/reports/sales-trend?from=YYYY-MM-DD&to=YYYY-MM-DD`。
- 実装内容: Repositoryがsales_recordsから指定期間内の月別売上合計を取得し、Serviceがfrom/toの月を昇順で生成して売上0件月を`"0.00"`で補完する。金額は小数点以下2桁の文字列としてResponse DTOへ設定する。
- 入力検証: from/toの必須、YYYY-MM-DD形式、存在しない日付、from > toを既存APIと同じ`VALIDATION_ERROR`形式の400として返す。
- テスト: Repositoryのパラメータ化集計クエリ、Serviceの単月・複数レコード・月途中境界・範囲外除外・0件月、APIのResponse DTO・400・500・503を追加した。
- 実行結果: `backend`で`npm.cmd run build`を実行し成功。`npm.cmd test`を実行し、12ファイル・45テストが成功した。
- 未実施: 顧客分類API、営業担当者別実績API、React画面、Playwright、認可、DBスキーマ変更は今回の対象外とした。

## 2026-09-17 顧客分類API

- 実施範囲: `GET /api/v1/reports/customer-categories`。
- 実装内容: Repositoryが`customers.deleted_at IS NULL`の有効顧客だけを対象に、`category`がnullの顧客を「未分類」として集計する。件数降順、同数時はResponse上のcategory昇順で取得する。
- Response: Serviceが`{ "items": [{ "category": "A", "customerCount": 25 }] }`形式へ変換し、対象顧客がない場合は`{ "items": [] }`を返す。
- テスト: Repositoryの有効顧客・未分類・並び順クエリ、Serviceの単一・複数・null集約・論理削除除外・同数順序・0件、APIのResponse DTO・JSON number・期間指定不要・500・503を追加した。
- 実行結果: `backend`で`npm.cmd run build`を実行し成功。`npm.cmd test`を実行し、15ファイル・54テストが成功した。
- 未実施: 営業担当者別実績API、React画面、Playwright、認可、DBスキーマ変更は今回の対象外とした。

## 2026-09-17 営業担当者別実績API

- 実施範囲: `GET /api/v1/reports/staff-performance?from=YYYY-MM-DD&to=YYYY-MM-DD`。
- 実装内容: Repositoryが`sales_records`を`users.id = sales_records.user_id`で結合し、担当者ID単位で売上金額合計と売上件数を集計する。対象日は`recorded_on`のfrom/to両端を含む範囲とし、売上金額降順、同額時は`users.email`昇順で取得する。
- Response: Serviceが`staffId`、`staffEmail`、`salesAmount`、`salesCount`を含むResponse DTOへ変換する。`salesAmount`は小数点以下2桁の文字列、`salesCount`はnumberで返す。対象期間の売上がない場合は`items: []`を返す。
- 入力検証: 既存の売上推移APIと同じfrom/to必須、厳密な日付形式・実在日付、from/toの前後関係を検証し、異常時は`VALIDATION_ERROR`の400を返す。
- テスト: Repositoryの結合・パラメータバインド・集計・順序、Serviceの単一・複数・集計額・件数・担当者IDとメール・期間境界・0件、APIのResponse DTO・型・400・500・503を追加した。
- 実行結果: `backend`で`npm.cmd run build`を実行し成功。`npm.cmd test`を実行し、18ファイル・67テストが成功した。
- 未実施: React画面、Playwright、認可、DBスキーマ変更、staffName追加は今回の対象外とした。

## 2026-09-17 React顧客分類画面

- 実施範囲: 既存のレポート画面に、売上推移と顧客分類を切り替える導線を追加した。URLルーティング、外部ライブラリ、バックエンド、DBは変更していない。
- API: `frontend/src/api/reports.ts` に `CustomerCategoryItem`、`CustomerCategoriesResponse`、`getCustomerCategories` を追加し、期間パラメータなしで `GET /api/v1/reports/customer-categories` を呼び出す。
- UI: 顧客分類を選択した時だけ取得し、取得結果は画面stateに保持する。APIから返された並び順のまま表に表示し、フロントエンドでの未分類変換・並び替え・件数の文字列化は行わない。0件、読み込み中、APIエラー、通信エラーは既存の表示方式で扱う。
- テスト: 画面切替、期間パラメータなしのAPI呼び出し、読み込み中、複数分類と未分類の表示順、0件、401・403・500・通信エラー、売上推移への復帰を追加した。
- 実行結果: `frontend` で `npx.cmd tsc -b --pretty false`、`npm.cmd test`、`npm.cmd run build` を実行した。型チェックは成功し、テストは3ファイル・27件すべて成功し、ビルドも成功した。
- 未実施: 営業担当者別実績画面、グラフ、Playwright、認可、バックエンド・DB・仕様書の変更は対象外とした。

## 2026-09-17 React売上推移画面

- 実施範囲: 既存の`App.tsx`にあるReact stateの画面切替へ`reports`を追加し、売上推移を表示するレポート画面を実装した。URLルーティングとルーティングライブラリは追加していない。
- API: `src/api/reports.ts`に`getSalesTrend(from, to)`、`SalesTrendItem`、`SalesTrendResponse`を追加し、`GET /api/v1/reports/sales-trend`を呼び出す。
- UI: 開始日・終了日・表示ボタンを備え、入力後だけAPIを呼び出す。入力不足・期間逆転は画面で検証し、処理中はstatus、APIエラーはalertで表示する。結果は月順を保持した表で表示し、金額文字列の小数点以下2桁を維持して3桁区切りを付ける。
- テスト: 画面切替、アクセシブルなフォーム、入力検証、API呼び出し、loading、表、0円、0件、400・500・network errorの表示を追加した。
- 実行結果: `frontend`で`npx.cmd tsc -b --pretty false`、`npm.cmd test`、`npm.cmd run build`を実行し、TypeScriptコンパイル、3ファイル・19テスト、ビルドがすべて成功した。
- 未実施: 顧客分類・営業担当者別実績のデータ表示、グラフ、Playwright、認可、バックエンド・DB・仕様書の変更は今回の対象外とした。

## 2026-09-20 E2E実DB基盤

- 範囲: Playwright受入テスト用の実DB基盤。レポート業務ロジック、Repository集計、DB schema、React、Playwright設定・specは変更していない。
- `compose.e2e.yml`: 専用project `customer-management-e2e`、service `postgres-e2e`、専用volume、DB `customer_management_e2e`、ホスト公開 `127.0.0.1:55432`、healthcheckを追加した。公式 `postgres:16` を採用。READMEの要件「PostgreSQL 16 or later」に合致し、メジャーバージョンを固定できるため。
- `.env.e2e.example`: E2E専用環境変数の例を追加。実際の秘密情報はGit管理外の `.env.e2e` に置き、`.gitignore`に追加した。
- `backend/scripts/e2e-db.mjs`: Node.js + pgで既存の `001_create_core_schema.sql` を適用。`migrate`、`seed`、`reset`を追加した。resetは専用DBへの接続確認後、トランザクション内でE2E用テーブルだけを削除してmigration、固定fixture投入、件数・値検証を実施する。seedは同じ検証を伴う再投入。すべてのIDと日時は固定値。
- 安全確認: `NODE_ENV=e2e`、DATABASE_URLのDB名・ユーザー・ホスト・ポート、接続後のDB名・ユーザー・サーバーポートを検証する。満たさない場合、DROP/TRUNCATE前に停止する。エラー表示でURL内パスワードを伏せる。
- `backend/scripts/verify-e2e-api.mjs`: 実Backendを起動し、HTTPで3レポートAPIと4月同額順を検証する。
- `backend/src/migrations/e2e-db-safety.test.ts`: 別DB名・別NODE_ENVを拒否するテストを追加した。

### 実行方法

1. `.env.e2e.example`を `.env.e2e` にコピーし、同じローカル専用パスワードを `E2E_DB_PASSWORD` と `DATABASE_URL` に設定する。`.env.e2e` はコミットしない。
2. `docker compose --env-file .env.e2e -f compose.e2e.yml up -d --wait`
3. `cd backend` 後、`npm run e2e:db:reset`。既存DBが空でmigrationだけ必要なら `npm run e2e:db:migrate`、migration済みなら `npm run e2e:db:seed`。
4. `npm run build`、`npm run e2e:api:verify`。

Backendを単独起動する場合は、`backend`から `node --env-file=../.env.e2e dist/server.js` を実行する。

## 2026-09-20 レポート実DB Playwright起動基盤

- `playwright.reports.config.ts`を追加。探索先を`e2e/reports`に限定し、Chromiumだけを使用する。baseURLは`http://127.0.0.1:5173`、retryは0、失敗時のtraceとscreenshotを保存し、videoは無効にした。
- PlaywrightのwebServerでBackendとFrontendを起動する。Backendは既存の`npm --prefix backend run dev`を使い、`.env.e2e`の`DATABASE_URL`と`NODE_ENV=e2e`、`PORT=3000`を`env`で渡す。Frontendは既存のViteを`127.0.0.1:5173`で起動し、既存の`/api` proxyを使用する。両serverとも既存プロセスを再利用しない。
- ルート`package.json`に`e2e:reports:prepare`と`e2e:reports`を追加。前者が専用PostgreSQLを起動して既存のE2E DB安全チェック付きresetを1回実行し、後者が準備後に専用Playwright configを実行する。
- `e2e/reports/report-smoke.spec.ts`を1件追加。レポート画面から顧客分類を選択し、確定URIへのHTTP 200応答と、固定fixtureのA=2、B=2、未分類=1の表表示を確認する。API mockは使用しない。
- 既存の`playwright.config.ts`、`e2e/sales-activity.spec.ts`、Backend・Frontend・DB schemaは変更していない。ST/CC/SP/RP/VLの本格シナリオは未実装。

## 2026-09-20 売上推移Playwright受入テスト ST-01～ST-05

- `e2e/reports/sales-trend.spec.ts`を追加。既存の`playwright.reports.config.ts`と`npm run e2e:reports`を使用し、各テストが独立してトップ画面から売上推移へ移動する。
- 実DBの固定fixtureを使用し、BrowserからVite `/api` proxy、BackendのRouter・Service・Repositoryを経て`customer_management_e2e`に接続する。`page.route`等のAPI mockと固定待機は使用しない。
- すべての検索で`GET /api/v1/reports/sales-trend`のfrom/to、HTTP 200、Vite originを確認し、`table`・`row`・`cell`のroleで月と金額を同一行として検証する。
- ST-01は基本集計と月昇順、ST-02は0件月、ST-03は期間境界、ST-04は月途中の両端月、ST-05は再検索時の結果置換を検証する。
- 既存のSmoke Testと専用config、Backend・Frontend、DB schema、fixtureは変更していない。CC/SP/RP/VLは未実装。

## 2026-09-20 顧客分類Playwright受入テスト CC-01～CC-05

- `e2e/reports/customer-categories.spec.ts`を追加。既存の`playwright.reports.config.ts`と`npm run e2e:reports`を使用する。各テストはトップ画面から独立してレポート画面へ移動する。
- BrowserからVite `/api` proxy、BackendのRouter・Service・Repositoryを経由して`customer_management_e2e`の固定fixtureを参照する。顧客分類APIのmock、固定待機、test単位のDB resetは使用しない。
- 各表示で`GET /api/v1/reports/customer-categories`のHTTP 200とquery parameterなしを確認し、表の`row`・`cell`で分類と件数の対応を検証する。
- CC-01はA/B/未分類の基本集計、CC-02は論理削除D1の除外、CC-03はNULLの未分類表示、CC-04は件数降順と同数時の分類昇順、CC-05は再訪時の2回目の実GETと同じ画面値を検証する。
- 既存のSmoke Test、ST-01～ST-05、専用config、Backend・Frontend、DB schema、fixtureは変更していない。SP/RP/VLは未実装。

## 2026-09-20 営業担当者別実績Playwright受入テスト SP-01～SP-06

- `e2e/reports/staff-performance.spec.ts`を追加。既存の`playwright.reports.config.ts`と`npm run e2e:reports`を使用し、各テストが独立してトップ画面から営業担当者別実績へ移動する。
- BrowserからVite `/api` proxy、実BackendのRouter・Service・Repositoryを経由して`customer_management_e2e`の固定fixtureを参照する。staff-performance APIのmock、固定待機、test単位のDB resetは使用しない。
- 各検索で`GET /api/v1/reports/staff-performance`のfrom/to、HTTP 200、Vite originを確認し、表の`row`・`cell`でstaffEmail、表示金額、件数の対応を検証する。staffIdはUIに表示しない。
- SP-01は基本集計、SP-02は売上合計、SP-03は売上件数、SP-04は金額降順・同額時email昇順と再検索後の旧結果消去、SP-05は期間境界、SP-06は0件メッセージと表非表示を検証する。
- 既存のSmoke Test、ST-01～ST-05、CC-01～CC-05、専用config、Backend・Frontend、DB schema、fixtureは変更していない。RP/VLは未実装。

## 2026-09-20 レポート横断・入力検証Playwright受入テスト RP-01、RP-02、VL-01

- `e2e/reports/report-navigation.spec.ts`を追加。既存の`playwright.reports.config.ts`と`npm run e2e:reports`を使用し、RP-01・RP-02と、売上推移・営業担当者別実績に分けたVL-01の計4テストを独立して実行する。
- RP-01は売上推移→顧客分類→営業担当者別実績→売上推移の連続切替、実APIのHTTP 200、現在画面以外の表やerror/loadingの非表示、再操作可能な状態を確認する。
- RP-02は顧客分類のGETを`page.route`内のPromiseで一時保留し、取得中の画面切替と再訪で重複GETが発生しないことを確認する。保留解除後は`route.continue()`で実Backendへ転送し、実PostgreSQL由来のA=2、B=2、未分類=1を画面で確認する。固定JSONやResponse mockは使用しない。
- VL-01は売上推移と営業担当者別実績の開始日未入力、終了日未入力、開始日>終了日をBrowserで操作し、画面上のvalidation errorと各APIへのGETが0件であることを確認する。API mockや固定待機は使用しない。
- 既存のSmoke/ST/CC/SP、Backend・Frontend、fixture、DB schema、Playwright configは変更していない。Firefox・WebKit・CIは未実施。

## 2026-09-20 レポートPlaywrightクロスブラウザ設定

- `playwright.reports.config.ts`の`projects`を、Playwright標準の`Desktop Chrome`、`Desktop Firefox`、`Desktop Safari`を使うChromium・Firefox・WebKitの3件に拡張した。
- `testDir`、baseURL、Backend・Frontendの`webServer`、E2E DB接続安全確認、retries、trace、screenshot、videoなど既存設定は変更していない。Playwrightのversion変更とブラウザの追加インストールは行っていない。
- Backend・Frontend・DB schema・fixture・migration・既存Playwrightテストは変更していない。

## 2026-09-20 CC-05の条件付きGET受入判定

- `e2e/reports/customer-categories.spec.ts`のCC-05だけを修正した。初回GETのHTTP 200確認を維持し、再訪時の2回目のGETではHTTP 200または304を許容する。
- 再訪時に新たなGETが発生して計2件になること、A=2・B=2・未分類=1の表を表示することを引き続き確認する。304時は取得可能なETagと`If-None-Match`を確認し、両方取得できた場合は一致を検証する。
- 他のCCシナリオ、Smoke/ST/SP/RP/VLのHTTP 200確認は変更していない。Backend・Frontend・キャッシュ設定・Playwright configは変更していない。

## 2026-09-20 既存の営業担当者別実績画面の記録補完

- 既存の`frontend/src/reports/StaffPerformanceReport.tsx`は、開始日・終了日の入力検証後に`frontend/src/api/reports.ts`から実APIを呼び出し、loading、error、0件メッセージ、担当者のメール・金額・件数を表に表示する。再検索時は旧結果を消去する。
- 金額は`frontend/src/reports/report-format.ts`でAPIの小数2桁文字列を保持しながら3桁区切り表示に変換する。`ReportsPage.tsx`のstate切替から画面を表示する。
- `frontend/src/reports/StaffPerformanceReport.test.tsx`に対応するコンポーネントテストがある。この節は既存実装の記録漏れを補うもので、今回アプリコードは変更していない。

## 2026-09-20 レポートコア機能の仕様整合

- F-09/F-11は既存の`sales_records`を参照・集計する範囲とし、examples/02・03とT-401の記述を明確化した。T-401は集計元データ基盤の準備を指す。`backend/migrations/001_create_core_schema.sql`に必要なschemaと項目があり、売上推移・営業担当者別実績のRepositoryが参照する。業務用登録・更新のRequirementはなく、CRUD API・画面は追加していない。
- F-10の顧客分類APIで、`from`または`to` query parameterが存在する場合は空文字も含めHTTP 400とし、既存の`VALIDATION_ERROR`形式を返す。Backend APIテストを期間指定5ケースへ変更し、期間指定なしの200と`foo`だけの200も確認する。未知query全般の共通規約は追加していない。
- Frontend、DB schema、migration、fixture、Playwright configは変更していない。CC-05の調査用`console.log`のみ削除し、200/304の受入assertionは維持した。
- 今回の受入範囲はF-09～F-11の集計・表示。JWT認証、roleによるレポート認可、staff/manager/admin別アクセス制御、T-501・T-504は後続タスクとして継続する。

## 2026-09-20 T-003 権限マトリクスの仕様確定

- 仕様担当者の決定に基づき、examples/02の権限概要、examples/03のRole × Operation × Scope表、examples/04のT-003成果物・完了条件を確定した。Phase 1のmanagerの担当者範囲は全staffとする。
- これは仕様確定の記録であり、JWTログイン、Backend認可、Frontend表示制御は実装していない。Backend・Frontend・DB・fixture・Playwrightは変更していない。

## 2026-09-20 T-104実装前の認証仕様確定

- 仕様担当者の決定をexamples/02のN-03、examples/03のLogin API・Argon2id・JWT・401契約・Authentication責務、examples/04のT-104とT-605へ反映した。T-105の認可とT-108の監査ログ永続記録は別Taskとして維持する。
- 本番ユーザーのInitial Password Provisioningは未決定の後続課題とした。T-104のBackendコード、Frontend Login画面、DB、fixture、Playwright、packageは今回変更していない。T-104の実装と認証テストは未実施。

## 2026-09-20 T-104 Backend認証共通部品

- `backend/src/auth/`に認証用User型とRepositoryを追加した。email検索では`password_hash`を取得し、id検索では取得しない。Repositoryは既存のdatabase注入方式を使用し、emailの大文字小文字・空白を変更しない。
- `argon2`でArgon2idのhash/verifyを実装した。設定はmemory 19456 KiB、time cost 2、parallelism 1。後続Login Serviceがemail不存在時に使うdummy hash生成helperも追加した。
- `jose`でHS256のJWT access token発行・検証を実装した。claimは`sub`・`iat`・`exp`のみ、期限は1800秒。検証はHS256へ固定し、`sub`のUUID形式を確認する。`JWT_SECRET`は環境変数から取得し、32 byte未満なら秘密値を表示せず拒否する。単体テストではtest専用secretを注入する。
- AuthenticatedUser型は`{ id, role }`とした。Repository、password helper、JWT serviceのunit testを追加した。Login API、Login Service、Authentication/Authorization middleware、HTTP 401変換、request時のusers・is_active・現在role確認は未実装であり、T-104全体は未完了。`app.ts`、既存API、Frontend、DB schema、migration、E2E fixture、Playwrightは変更していない。

## 2026-09-20 T-104 Login Service・Login API

- `backend/src/auth/login-validation.ts`でemailの前後空白除去、必須・型・長さを確認する。passwordは空文字と1024文字超を拒否するが、前後空白を除去しない。独自email形式検証や大文字小文字変換は追加していない。
- `login-service.ts`は既存のAuth User Repository、Argon2id verify、dummy hash helper、JWT Serviceを再利用する。dummy hashは初回利用時に一度生成して共有し、email不存在時にもverifyを行う。inactive userもpassword照合後に拒否する。成功時はJWTと公開可能なuser情報だけを返し、認証失敗は同一結果にする。内部障害は認証失敗へ変換しない。
- `auth-router.ts`に`POST /api/v1/auth/login`を追加し、200のLogin DTO、400 `VALIDATION_ERROR`、401 `AUTHENTICATION_FAILED`、既存形式の503/500を返す。auth Router内でJSONを解析し、壊れたJSONも400の共通形式にする。`app.ts`にはauth Routerだけを登録した。既存customers・activities・reports APIへ認証は適用していない。
- `login-service.test.ts`と`auth-api.test.ts`を追加した。APIテストでは実Argon2id helperとテスト専用secretによる実JWT発行を使い、DB Repositoryはテスト内で置き換えた。Frontend、DB schema、migration、E2E fixture、Playwrightは変更していない。
- T-104全体は未完了。Authentication middleware、Bearer検証のAPI適用、requestごとのuser・is_active・現在role取得、protected APIの401、T-605は後続作業とする。

## 2026-09-20 T-104 Authentication middleware

- `backend/src/auth/authentication-middleware.ts`を追加した。`Authorization: Bearer <JWT>`からtokenを取り出し、既存JWT ServiceでHS256署名・期限・subを検証する。JWT Serviceではtoken起因の検証失敗を`InvalidAccessTokenError`に統一し、設定不備や想定外の内部障害と区別する。
- 検証後は既存Auth User Repositoryの`findById`で毎requestユーザーを取得し、不存在・`is_active = false`を401にする。成功時は現在のDB上のroleを使い、`request.authenticatedUser = { id, role }`を設定して`next()`する。Express Request型をdeclaration mergingで拡張した。role別の可否判定と403は実装していない。
- token・user起因の失敗は`AUTHENTICATION_REQUIRED`の401へ統一し、Repository障害などは`next(error)`へ渡す。secret不足はmiddleware生成時の設定エラーとして扱う。middlewareテスト用routeのみで検証し、productionの`app.ts`やcustomers・activities・reports・Login APIには適用していない。Frontend、E2E、schema、migration、fixture、依存ライブラリは変更していない。
- T-104全体は未完了。production APIへの認証適用範囲とFrontend認証導入順序の整理が残る。T-105の認可、T-108の監査ログ永続化も対象外。

## 2026-09-20 認証移行仕様・Task分解の確定

- 仕様担当者の決定をexamples/02～04に反映し、Public route、Frontend認証動作、E2E manager方針、T-109～T-111の移行Taskと依存順を確定した。既存のT-104 Backend Authentication部品は実装済みだが、N-03のproduction統合はT-111まで未完了と区別した。今回は新規TaskやFrontend・Backend・E2Eのコードを実装していない。

## 2026-09-20 T-109 E2E認証基盤準備

- `e2e/fixtures/auth-manager.mjs`にE2E専用managerの固定ID・email・role・テスト用passwordを一元化した。`backend/scripts/e2e-db.mjs`は既存staff 2名と顧客6件・売上8件を維持し、manager 1名だけを追加する。managerは顧客ownerでも売上担当者でもない。
- seed時に既存`argon2`でArgon2id hashを毎回生成し、memory 19456 KiB、time cost 2、parallelism 1で`users.password_hash`へ投入する。固定hashは保存しない。E2E専用passwordは本番Initial Password Provisioningとは別である。既存の`NODE_ENV=e2e`、専用DB名・接続先・DB接続後の識別確認を維持した。
- `e2e/auth/login-helper.ts`の`loginAsE2EManager(request)`はPlaywrightのHTTP requestから実Login APIを呼び、200・Bearer・1800秒・manager情報を確認してtokenを返す。`login-smoke.spec.ts`で成功と誤passwordの401を実Backend・実PostgreSQL経由で確認する。専用`playwright.auth.config.ts`と`npm run e2e:auth`によりAPI smokeを1 projectで実行する。E2E専用JWT secretはGit管理外の`.env.e2e`からBackend webServerへ渡し、`.env.e2e.example`にはplaceholderだけを記載した。
- Frontend、production業務APIのAuthentication適用、role認可、既存Reportsシナリオは変更していない。T-110・T-111・T-605は引き続き後続Taskである。

## 2026-09-20 T-110 Frontend認証部品の準備（部分実装）

- `frontend/src/auth/auth-types.ts`にrole、認証済みユーザー、memory認証状態、Login request/responseの型を追加した。`frontend/src/api/auth.ts`に`POST /api/v1/auth/login`用のfetch clientを追加し、200のDTO、400 validation、401認証失敗、500/503・network障害を区別する。内部エラー詳細やpassword・tokenを表示・記録しない。
- `AuthContext.tsx`でaccessTokenとuserをReact stateに保持し、設定・解除できるようにした。永続storageやmodule globalは使用しない。`Login.tsx`にはlabel付きemail/password入力、Login操作、loading・二重送信防止、400/401/障害の区別した表示を追加した。emailの前後空白だけを除去し、passwordは変更しない。成功時はContextに認証情報を設定する。
- Login API client、認証状態、Login componentのunit/component testを追加した。`App.tsx`、既存customers・activities・reports API、Backend、E2E、Playwrightは変更していない。T-110全体は未完了で、App統合、authenticated fetch・Bearer付与、業務API 401、Logout UI、Browser認証移行は後続段階で行う。

## 2026-09-20 T-110 authenticated fetch基盤（部分実装）

- `frontend/src/api/authenticated-fetch.ts`にReact非依存の`authenticatedFetch(input, accessToken, init?)`を追加した。`Request`と`RequestInit`の既存headerを`Headers`で統合し、Authorizationだけを渡されたtoken由来の`Bearer`値で上書きする。空・未設定tokenは送信前に`MissingAccessTokenError`とする。
- HTTP 401かつbodyの`code`が`AUTHENTICATION_REQUIRED`の場合だけ、token情報を保持しない`AuthenticationRequiredError`を投げる。Responseをcloneして判定し、その他の401、400、403、500、503は元のResponseを呼び出し側に返す。network障害も認証失敗に変換しない。
- helperのunit testを追加した。`AuthContext`・Login API client・`App.tsx`・既存customers/activities/reports API・Backend・Playwrightは変更していない。401時の認証状態破棄とLogin画面復帰は後続のApp統合で行い、T-110全体は未完了とする。
## 2026-09-20 T-110 Frontend本体への認証統合（部分実装）

- `App.tsx` に `AuthProvider` と認証境界を組み込み、未認証時はLogin画面、Login成功後は従来の初期画面である顧客登録画面を表示する。認証済み画面共通のLogout操作はmemory上のtokenとuserを破棄し、Login画面へ戻す。Provider再生成時も未認証となる。
- customers・activities・reportsの既存API呼出しへ必須のaccessTokenを引数で渡し、`authenticatedFetch`によるBearer付与へ接続した。API層はReact Contextへ依存しない。UI層の共通hookが`AuthenticationRequiredError`を受けて認証状態を破棄し、共通の再ログイン案内を表示する。400・403・404・500・503・通信障害では認証状態を破棄しない。
- T-105/T-501のrole別認可は未実装。Backend・DB・Playwrightは変更していない。既存Reports Playwright 63件のmanager Login移行は次段階で行うため、この中間段階ではT-110全体を完了扱いしない。
## 2026-09-21 T-110 Reports E2EのUI Login移行（完了）

- `e2e/auth/login-helper.ts` に `loginAsE2EManagerViaUi(page)` を追加した。既存のmanager fixtureから認証情報を読み、実Login画面で入力・送信し、Login APIの200と顧客登録画面への遷移を確認する。
- Reports E2Eの5ファイル・21シナリオで、開始時のAppアクセスを共通UI Login helperに置き換えた。業務assertionは変更していない。
- Reports smokeで、business APIへのAuthorizationが非空のBearer形式であることを追加確認する。token全文は出力しない。
- storageStateや永続storageは使用していない。Frontend・Backend production code、DB schema/migrationは変更していない。
- 起動済みの専用PostgreSQLへ `127.0.0.1:55432` で直接接続してreset・seedし、T-109 Login smoke 2件とReports E2E 3ブラウザー63件のPASSを確認した。UI manager Login、Login API 200、business APIのBearer形式も確認済み。T-110は完了。production業務APIのAuthentication適用はT-111、role認可は後続Taskとする。
## 2026-09-21 T-111 production Authentication第1段階（部分実装）

- `backend/src/app.ts` で既存DB poolからAuth User Repositoryを作成し、Login ServiceとAuthentication middlewareへ共有する。JWT Serviceもapp生成時に作成し、同じServiceをLoginのtoken発行とmiddlewareの検証へ渡す。JWT secretの不足・空白・32 UTF-8 bytes未満を拒否する既存仕様は維持した。
- PublicのLogin routerと`GET /health`の後、業務routerより前に`/api/v1`共通Authentication middlewareを登録した。現在のcustomers、activities、reports APIと今後同じ境界へ登録する業務APIはAuthentication必須。roleによるAuthorization・403は追加していない。
- 既存Backend業務API testはtest専用secret・有効JWT・active staff userを使う小さなhelperでBearerを付与し、productionと同じ認証境界を通すよう移行した。Public/Protectedのproduction経路テストを追加した。Frontend、Playwright、E2E fixture、DB migrationは変更していない。
- 今回はBackend wiringとBackend testまで。実DB protected API確認とPlaywright 3ブラウザー63件はT-111第2段階に残るため、T-111全体は未完了。
## 2026-09-21 T-111第2段階A 実DB・Chromium検証

- 既存E2E専用DB scriptで `customer_management_e2e` をreset・seedし、実BackendのPublic Login・health、実Loginで取得したmanager JWTを使うprotected Reports API、Bearerなし401を確認した。malformed Bearerも401。Docker CLIは使用せず、起動済みPostgreSQLの `127.0.0.1:55432` に直接接続した。
- 既存Chromium Reports E2E 21件をproduction Authentication middlewareが有効な経路で再実行し、全件PASS。Frontend・Backend production code、E2E helper/spec、DB fixture等の実装変更はない。
- Firefox・WebKitと最終3ブラウザー63件は第2段階Bに残る。T-111全体は未完了。
## 2026-09-21 T-111 production業務APIへのAuthentication適用（完了）

- 第1段階で、Publicの`POST /api/v1/auth/login`と`GET /health`の後、Phase 1業務APIの前へ共通Authentication middlewareを登録した。既存DB poolのAuth User RepositoryとJWT Serviceをproductionへ接続し、Backend API testを有効Bearer前提へ移行した。
- 第2段階Aで、実DB Login、protected Reports APIのBearerあり200・Bearerなし401 `AUTHENTICATION_REQUIRED`、Public Login・health、Chromium Reports 21/21を確認した。
- 最終段階で、既存の同じ実装・専用fixtureのままFirefox 21/21とWebKit 21/21を確認した。前回Chromium 21/21と合わせて既存Reports E2Eは3ブラウザー63/63 PASS。今回はproduction code、E2E、Playwright設定を変更していない。T-111完了。role別Authorization・403とT-605の最終受入確認は後続Taskとする。

## 2026-09-21 T-105A 共通Authorization core（部分実装）

- `backend/src/authorization/authorization-policy.ts`に、既存`AuthenticatedUser`と`UserRole`を使う9操作のRole × Operation判定・拒否時の`ForbiddenError`送出と、取得済みcustomerの`owner_user_id`を受け取るscope判定を追加した。未知role・operationは許可しない。staffは自担当顧客のみ、manager・adminは全顧客をscope内とする。活動履歴も親customerのownerで同じpolicyを再利用できる。
- `backend/src/authorization/forbidden-error.ts`にHTTP 403、`FORBIDDEN`、`Forbidden.`の共通coreを追加した。公開応答へrole・owner・operation等の内部理由を含めない。
- policyと403 coreのunit testを追加した。DB・Express・Repositoryへの依存、404生成、production routerへの適用、staff顧客登録時のowner強制は追加していない。T-105全体は未完了で、Authentication→Authorization共通integrationはT-105B、業務APIへの適用はT-501/T-502/T-503に残る。

## 2026-09-21 T-105B Authentication→Authorization共通integration（完了）

- `backend/src/authorization/authorization-middleware.ts`に、呼出側から`AuthorizationOperation`を受け取り、Authenticationが設定した`request.authenticatedUser`をT-105Aの`assertOperationAllowed`へ渡す`authorizeOperation`を追加した。JWT・Bearerの解析、users再検索、scope lookupは行わない。
- `backend/src/authorization/forbidden-error-handler.ts`に、`ForbiddenError`だけをHTTP 403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`へ変換し、その他のerrorを次へ渡す共通handlerを追加した。`app.ts`では既存業務routerの後へこのhandlerを登録したが、customers・activities・reports routerにAuthorization middlewareは登録していない。
- テスト専用Express routeで実Authentication middleware→`authorizeOperation`→handlerの順序、tokenなし401、staffのReports operation拒否403、manager・adminの許可、現在roleの反映とrequestごとのuser lookupを確認した。T-105AとT-105BによりT-105共通機構は完了。production業務APIへの閲覧・登録等の具体適用とscope外404・staff顧客登録owner強制はT-501/T-502/T-503に残る。

## 2026-09-21 T-501A第1段階 Reports Backend Authorization（部分実装）

- Reports Routerの3 GETより前に共通`authorizeOperation('reports.read')`を1回登録した。Authentication成功後、staffはvalidation・Serviceより前に403 `FORBIDDEN`、manager・adminは既存handlerへ到達する。Reports Service・Repository、`app.ts`は変更していない。
- 共通Backend API test helperは既定のstaffを維持したままrole指定を可能にし、Reportsの既存business API testsだけを明示的なmanager認証へ移行した。集計・validation・ordering・zero response等の既存assertionは変更していない。
- Reports Authorization testでstaffの3経路拒否、共通403応答、Service未到達、admin代表経路の200、tokenなし401を確認した。production Authentication testは、current roleと`authenticatedUser`の証跡を維持しつつReports handler到達時のRepository roleをmanagerへ変更した。
- Frontend Reports表示制御は未実施のためT-501Aは未完了。Activity GET scope、未実装の顧客read APIへの適用、最終回帰も残るためT-501全体も未完了。

## 2026-09-21 T-501A第2段階 Frontend Reports表示制御（完了）

- `App.tsx`でLogin responseからReact memoryに保持している`authentication.user.role`を使用し、manager・adminだけに既存Reports入口を表示する。staffでは入口をDOMへ描画しない。JWT decode、role専用state、Reports API clientのrole判定は追加していない。
- Reports screenの描画にも同じrole guardを適用した。staffで内部screen stateがReportsを示してもReports componentを描画せず、既存初期business screenである顧客登録画面を表示する。render中のstate更新や新しいUnauthorized画面は追加していない。
- App component testでstaffの入口・画面非表示と通常表示時Reports API呼出0件、manager・adminの入口表示とReports画面遷移を確認した。401、403、Logout、reloadの既存処理は変更していない。
- 第1段階のReports Backend Authorizationと合わせてT-501Aは完了。Activity GET scope Authorization、未実装の顧客一覧・検索・詳細への適用と最終回帰が残るため、T-501全体は未完了。

## 2026-09-21 T-501B Activity GET scope Authorization（完了）

- `GET /api/v1/customers/:customerId/activities`へ共通`authorizeOperation('activity.read')`を適用し、Authentication→operation Authorization→既存customerId validation→Serviceの順とした。POST routeにはwrite Authorizationを適用していない。
- Activity Reference Repositoryへ、customerの`id`と`owner_user_id`を1 queryで取得する`findCustomerReference`を追加した。既存`customerExists`はPOST用に維持し、Repositoryにはrole・Authorization判定を入れていない。
- GET Serviceは既存`AuthenticatedUser`を受け取り、取得済みownerをT-105の`isCustomerInScope`へ渡す。customer不存在とstaff scope外のどちらも同じ`CustomerNotFoundError`へ変換し、activity queryを実行しない。manager・adminはownerを問わず許可する。
- 正常GETはcustomer reference 1 queryとactivities 1 query。認可用の追加customer lookupはない。活動の`user_id`契約、Frontend、Reports、Customers、Authentication、E2E、Playwrightは変更していない。T-501Bは完了。未実装の顧客一覧・検索・詳細への適用と最終回帰が残るためT-501全体は未完了。

## 2026-09-21 T-202A Customer list/detail Backend core（完了）

- 既存Customer永続化型とは別に、登録成功応答と同じ11 fieldを持つCustomer read DTOとlist pagination envelope型を追加した。Repositoryの`Date`はService境界でISO 8601文字列へ変換し、HTTP公開型がRepository entityへ直接依存しない構成とした。
- Customer Read Repositoryへ、通常read用のlistとdetail取得を追加した。listは`deleted_at IS NULL`、既定の`name ASC, id ASC`、20件をSQLで適用し、staff用owner scopeを任意の検索条件として受け取る。scope適用後のcountも同じ条件で取得する。detailは`id`と`deleted_at IS NULL`を1 queryで確認する。Repositoryはrole・AuthenticatedUser・Authorization policyを参照しない。
- Customer Read Serviceは既存`AuthenticatedUser`とT-105の`customer.read`・`isCustomerInScope`を使用する。staff listだけowner scopeをRepositoryへ渡し、manager・adminはowner scopeなしとする。detailの不存在、logical deleted、staff scope外は同じ`CustomerNotFoundError`と`CUSTOMER_NOT_FOUND / Customer was not found.`へ統一した。
- Detail path用UUID validationを追加した。T-205固有のquery・category・owner filter・sort・pagination query validationは先取りしていない。Production router、`app.ts`、Frontend、DB schema、migrationは変更しておらず、unrestrictedなCustomer GET APIは存在しない。
- Customer Repository・Service・validationのunit testを追加し、関連3 files 25 tests、Backend全33 files 190 tests、TypeScript buildのPASSを確認した。T-202Aは完了。Production router/API testとFrontendはT-202の後続段階に残る。

## 2026-09-21 T-202B Customer list/detail Production API integration（完了）

- `GET /api/v1/customers`と`GET /api/v1/customers/:id`をproduction Customer Routerへ追加し、両GETへ個別に`authorizeOperation('customer.read')`を適用した。app-level Authenticationが先に実行され、既存POSTにはread Authorizationを適用していない。
- production appは既存DB poolから作る同じCustomer Repositoryをcreateとreadで共有し、T-202AのCustomerReadServiceへ接続する。別pool、JWT再検証、users再lookupは追加していない。staff listはServiceからowner scopeをRepositoryへ渡し、manager・adminは全active customer、detailは既存scope policyを使う。
- detailのUUID validationをHTTP 400 `VALIDATION_ERROR`へ接続した。customer不存在、logical deleted、staff scope外はT-202AのCustomerNotFoundErrorから同じHTTP 404 `CUSTOMER_NOT_FOUND / Customer was not found.`へ変換する。
- Customer read production API testを追加し、list envelope、staff own scope、manager/admin、0件、detailのstaff own/other、manager/admin、deleted、不存在との404同一性、malformed UUID、tokenなし401を確認した。Production Authenticationの保護対象一覧にもCustomer GET 2経路を追加した。既存Customer POSTとActivity nested routeの回帰も確認した。
- T-205のquery・category・owner filter・sort・pagination request parsingは実装していない。Frontend、Reports、Activities production code、DB、E2E、Playwrightは変更していない。T-202Bは完了。Frontend list/detailのT-202Cが残るためT-202全体は未完了。T-501もCustomer search scopeとFrontend・最終Acceptanceが残り未完了。

## 2026-09-21 T-202C第1段階 Customer list Frontend（部分実装）

- 既存Customer API clientへ`GET /api/v1/customers`を追加し、共通`authenticatedFetch`でBearerを付与する。T-205のquery parameterは送信しない。Customer型をBackendの共通read DTO 11 fieldへ合わせ、list pagination envelope型を追加した。
- `CustomerList` componentを追加し、取得中、顧客名・分類の一覧、0件、API errorを表示する。staffを含めFrontendでownerやlogical deleteによる後filterは行わず、Backend Authorization済みのitemsを表示する。詳細のダミー操作は置かず、詳細取得と導線はT-202C第2段階へ残した。
- `App.tsx`の既存state-based navigationへ全role共通の顧客一覧入口と登録画面へ戻る遷移を追加した。Login後の初期画面、顧客登録、staffのReports非表示、manager・adminのReports表示は維持する。React Router、検索・filter・sort・pagination、Frontend独自の401/403処理は追加していない。
- API client、一覧component、Appのテストを追加・更新した。Backend、E2E、Playwrightは変更していない。T-202Cは部分実装、T-202全体は未完了。

## 2026-09-21 T-202C第2段階 Customer detail Frontend（完了）

- Customer API clientへ`GET /api/v1/customers/:id`を追加し、customer IDをURL encodeして共通`authenticatedFetch`でBearerを付与する。404はBackendの公開messageをそのまま通常errorとして扱い、401は既存の共通再認証処理へ渡す。
- Customer listの各行へ実動作を持つ詳細操作を追加した。Appのstate-based navigationで選択customer IDだけを保持し、一覧objectを代用せずproduction detail APIから再取得する。詳細から一覧へ戻る際はIDをclearし、現在のT-202構成では一覧を再取得する。
- read detail専用の`CustomerDetailScreen`を追加し、loading、顧客名・カナ・メール・電話・住所・分類、404を含むAPI errorを表示する。Frontend独自のscope判定、owner ID・deleted日時の表示、Activity取得は追加していない。登録成功後の既存`CustomerDetail`とActivity履歴は変更せず維持した。
- staff・manager・admin共通のdetail導線を追加した。既存の顧客登録初期画面、登録成功後detail、Customer list、Reports role guard、Logout・reloadを維持する。検索・filter・sort・paginationは実装していない。Backend、E2E、Playwrightは変更していない。
- T-202A、T-202B、T-202C第1・第2段階が揃ったためT-202は完了。顧客CRUD・一覧・検索のPlaywrightは正式な後続T-207、検索・filter・sort・paginationはT-205に残る。T-501はT-205のsearch scopeと最終Acceptanceが残るため未完了。

## 2026-09-21 T-205 Customer検索・filter・sort・pagination Backend部分（部分実装）

- `GET /api/v1/customers`へ`page`、`page_size`、`query`、`category`、`owner_user_id`、`sort`のquery validationを接続した。pageは既定1・1以上、page_sizeは既定20・1～100、sortは4許可値と既定`name_asc`、ownerはUUID形式とし、正本の`VALIDATION_ERROR` messageを使用する。query/categoryはtrimし、空文字をfilterなしとする。
- Customer Read Serviceはpage・page sizeからlimit/offsetを作り、client filter・sortと、staffだけの`ownerScopeUserId = authenticatedUser.id`を別criteriaとしてRepositoryへ渡す。manager・adminにsecurity owner scopeは付けず、client owner filterは通常filterとして渡す。
- Customer Repositoryはlogical delete除外、case-insensitive name部分一致、category完全一致、client owner filter、security owner scopeをparameterized SQLの同一WHEREへANDし、items queryとcount queryで共有する。全件取得後filterは行わない。4 sortはallowlistからSQLへ対応させ、常に`id ASC`をtie-breakerとする。
- query parameterなしではpage 1、page_size 20、name ASC・id ASCを維持する。Customer detail、POST、Activity、Reports、Authentication、Frontend、DB schema/migration、E2E、Playwrightは変更していない。
- T-205 Backend部分は完了。Frontendの検索・filter・sort・pagination UIが残るためT-205全体は部分実装。T-501もCustomer search Frontendと最終Acceptanceが残るため未完了。

## 2026-09-21 T-205 Customer検索・filter・sort・pagination Frontend（完了）

- Customer list API clientを検索条件対応へ拡張し、`URLSearchParams`で`page`、`page_size`、trim後に非空の`query`・`category`、`sort`を安全に送信する。既存`authenticatedFetch`を維持する。`owner_user_id`はBackend API capabilityとして型に保持するが、Frontend UIからは渡さない。
- Customer listへ顧客名入力、category入力、「検索」操作、4種類のsort、20・50・100件のpage size、前へ・次へ、現在page・total count表示を追加した。query/category入力だけではrequestせず、検索時、sort変更時、page size変更時はpage 1へ戻す。page移動では適用済み条件を維持する。
- 入力中と適用済みのquery/category、sort、page、page sizeをApp stateで保持する。Customer list→detail→listでselected customer IDだけをclearし、一覧条件とpageを維持して同じ条件で再取得する。React Router、自動検索、Frontend owner filter UIは追加していない。
- Frontendでrole・ownerによる後filterは行わず、既存Backend Authorizationを使用する。Customer登録初期画面、listのloading・success・zero・error、detail、401/404、Reports role guard、Logout・reloadを維持した。Backend、DB、E2E、Playwrightは変更していない。
- Backend部分とFrontend部分が揃ったためT-205は完了。T-501はCustomer list/detail/searchの実装が揃い、最終Acceptance待ちとする。

## 2026-09-21 T-501 閲覧系Authorization（完了）

- 正式Task T-501の対象であるCustomer一覧・検索・詳細、Activity履歴GET、Reports 3種、Frontend閲覧表示制御がすべて実装済みであることを最終確認した。users参照は正本どおりT-503に残し、write Authorization、網羅的Role Matrix検証、新規Browser role denial E2Eは追加していない。
- Customer一覧・検索はstaffのowner scopeをSQL条件へ含め、manager・adminは全active customerを対象とする。Customer詳細は既存scope policyを使い、staffの他担当、customer不存在、logical deletedを同じ404 `CUSTOMER_NOT_FOUND`として扱う。Frontendにはrole・ownerによる後filterを追加していない。
- Activity GETはstaff ownを許可し、staff scope外とcustomer不存在を同じ404としてactivity query前に停止する。manager・adminはowner不問で許可する。POST ActivityはT-502の責務として変更していない。
- Reports 3 GETはstaffを403 `FORBIDDEN`でhandler前に拒否し、manager・adminにはcompany-wide集計を許可する。FrontendはstaffのReports入口・画面を非表示、manager・adminは表示する。
- Authentication失敗の401、認証済みoperation拒否の403、staff scope外resourceの404という境界を維持する。AuthorizationはAuthenticationが設定したcurrent DB roleの`request.authenticatedUser`を利用し、JWT role claimやAuthorization側のusers再lookupは追加していない。
- 最終Acceptanceではコード修正および新規E2E追加は不要だった。Backend・Frontend・既存Reports Playwrightの全回帰とbuildが成功したため、T-501を完了とする。正式依存関係上、T-502とT-503は着手可能で、次はT-502とする。

## 2026-09-21 T-502 登録・編集・削除Authorization（部分実装）

- 現存するwrite APIである`POST /api/v1/customers`へ`customer.create`、`POST /api/v1/customers/:customerId/activities`へ`activity.create`を適用した。いずれもapp-level Authentication後、入力validation・resource lookupより前にoperation Authorizationを行う。managerは共通403 `FORBIDDEN / Forbidden.`で拒否し、Repository・Serviceへ到達しない。
- Customer createはstaffとadminを許可する。staffではrequestの`owner_user_id`より`request.authenticatedUser.id`を優先してBackendで保存値を強制し、adminでは既存requestのowner指定を維持する。既存request validation、201 response、Repository SQLは変更していない。
- Activity createは既存customer reference取得を再利用し、取得済み`owner_user_id`をT-105の`isCustomerInScope`へ渡す。staff ownとadminを許可し、staff otherとcustomer不存在は同じ404 `CUSTOMER_NOT_FOUND`とする。正常時・scope外・不存在ともcustomer lookupは1回で、scope外・不存在ではuser lookupとactivity createを行わない。活動の`user_id`契約は変更していない。
- FrontendはmanagerのCustomer登録画面とActivity登録formを非表示にし、顧客一覧・Activity履歴・Reportsのread導線は維持した。staff・adminには既存登録UIを維持する。Backend enforcementをsecurity boundaryとし、JWT decodeやFrontend独自scope判定は追加していない。
- Customer editと論理削除のproduction API・画面は未実装で、それぞれ正式Task T-203・T-204の対象であるため今回新設していない。既存production write APIへのT-502適用は完了したが、将来のedit/delete適用が残るためT-502は部分完了とする。次の正式TaskはT-203とする。

## 2026-09-21 T-203 顧客編集API・編集画面（完了）

- `PATCH /api/v1/customers/:id`をproductionへ追加した。`name`、`name_kana`、`email`、`phone`、`address`、`category`だけを部分更新し、省略fieldは維持する。任意fieldは`null`またはtrim後空文字でclearできる。`owner_user_id`を含む編集不可・未知field、空body、requiredの`name`への`null`は既存形式の400 `VALIDATION_ERROR`とする。
- Repositoryは許可済みfieldだけからparameterized UPDATEを構築し、`owner_user_id`・`created_at`・`deleted_at`を更新対象に含めない。active customerだけを更新して`updated_at`を更新し、更新後のCustomer read DTOを200で返す。Repositoryにrole判定は追加していない。
- PATCHへ`authorizeOperation('customer.edit')`を適用した。managerはvalidation・customer lookup前に403、staffはactive customer取得後に既存`isCustomerInScope`でownerを判定し、他担当は不存在・logical deletedと同じ404 `CUSTOMER_NOT_FOUND`、adminは全active customerを編集可能とした。staff scope外ではUPDATEを実行しない。
- FrontendへCustomer edit API clientとstate-based編集画面を追加した。詳細で取得済みのbusiness fieldを初期値にし、staff・adminには編集導線を表示、managerには表示しない。owner変更UIやFrontend owner scope判定は追加していない。保存成功後はdetailへ戻ってproduction GETで再取得し、キャンセルはPATCHせずdetailへ戻る。403は通常API errorとして表示し、auth stateを破棄しない。
- T-203は完了。T-502はCustomer create、Activity create、Customer editまで完了し、Customer delete AuthorizationがT-204待ちのため部分完了を維持する。DELETE、owner reassignment、T-503～T-505、E2E/Playwrightは実装していない。

## 2026-09-21 T-204 Customer論理削除・T-502完了

- `DELETE /api/v1/customers/:id`をproductionへ追加した。Customer Delete Serviceはactive customerを確認し、Repositoryのparameterized UPDATEで`deleted_at = NOW(), updated_at = NOW()`を設定する。物理DELETEは使用しない。成功時はbodyなしのHTTP 204とし、Customer不存在・既にlogical deleted・更新競合による対象0件は同じ404 `CUSTOMER_NOT_FOUND`とする。
- DELETEへ`authorizeOperation('customer.delete')`を適用した。staff・managerはUUID validation・customer lookup・delete queryより前に共通403で拒否し、adminだけがactive customerを削除できる。Repositoryにrole判定、Authorization側のJWT再検証・users再lookupは追加していない。
- FrontendへDELETE API clientと最小の削除確認画面を追加した。adminのCustomer detailだけに削除導線を表示し、staff・managerには表示しない。削除成功後は選択customer IDをclearして既存list stateを保ったCustomer listへ戻る。キャンセルはDELETEを行わずdetailへ戻り、API errorは既存方式で表示する。403でauth stateを破棄しない。
- 削除後のlist/search除外、detail・edit・re-deleteの404を確認した。既存create/edit/list/search/detail、Activity、Reports、Authentication、Logout/reloadを維持した。E2E/PlaywrightはT-204完了条件外のため実施していない。
- T-204は完了。Customer create、Activity create、Customer edit、Customer deleteへのAuthorizationがすべて揃ったため、正式Task T-502も完了とする。次の正式TaskはT-503とする。

## 2026-09-21 T-503 users / role Authorization（完了）

- `GET /api/v1/users`と`PATCH /api/v1/users/:id/role`をproductionへ追加し、共通Authentication後にそれぞれ`users.read`、`users.changeRole`を適用した。staff・managerはvalidation・User Service・Repositoryより前に403、adminだけを許可する。JWT role claimやAuthorization側のuser再lookupは追加していない。
- Users一覧は`id`、`email`、`role`、`active`だけを公開し、active・inactiveの両方を`email ASC, id ASC`で返す。pagination、検索、filter、password・email・activeの変更、ユーザー新規登録は追加していない。
- role変更はroleだけのrequestを受け付け、更新後User DTOを200で返す。inactive userも変更でき、user不存在は404 `USER_NOT_FOUND`とする。admin自身の異なるroleへの変更は409 `SELF_ROLE_CHANGE_NOT_ALLOWED`、同一roleはUPDATEなしの200 no-opとした。
- 最後のactive admin保護はPostgreSQL transaction内でactive admin行を`id ASC FOR UPDATE`により先にlockし、その後に対象userをlock・更新する。並行するrole変更を同じlock順で直列化し、active adminが0人になる降格を409 `LAST_ACTIVE_ADMIN_REQUIRED`としてrollbackする。Repositoryにrequest userのrole判定は置いていない。
- FrontendへUsers API clientとstate-basedユーザー管理画面を追加した。staff・managerには入口を描画せずadminだけに表示し、email、active/inactive、現在role、role選択、変更操作を提供する。自己role変更UIは無効化し、成功後は一覧を再取得する。409判定はFrontendへ複製せずBackend messageを表示し、403・409ではauth stateを維持する。
- T-503は完了。T-504/T-505とE2E/Playwrightは先取りしていない。次の正式TaskはT-504とする。

## 2026-09-21 T-504 Backend/API Role Matrix検証（完了）

- T-501/T-502で実装済みのCustomer read/create/edit/delete、Activity GET/POST、Reports 3 APIを、staff・manager・adminのRole Matrixとして既存API testとAuthorization testで横断検証した。Users APIはT-504原文の対象外とし、Backend全testによる回帰だけを維持した。
- Customerはstaffのlist/search own scope、detail/edit own許可・other 404、create許可、delete 403、managerのread許可・create/edit/delete 403、adminの全操作許可を確認した。Activityはstaff ownのGET/POST許可・other 404、managerのGET許可・POST 403、adminのGET/POST許可を確認した。
- Reports Authorization testをmanager・adminそれぞれが3 APIすべてのhandlerへ到達するmatrixへ拡張した。staffは3 APIすべてvalidation・Service前に403となる既存証跡を維持する。productionコードの不具合はなく、変更していない。
- 未認証401、operation-level拒否403、staff scope外と不存在の同一404、operation拒否時のresource lookup・update・Service未到達を確認した。FrontendとPlaywrightはT-505を先取りしないため変更・実行していない。T-504は完了し、T-505が着手可能となった。

## 2026-09-22 T-505 Browser/E2E Authorization（完了）

- 既存Reports suiteと分離して、`e2e/authorization/role-authorization.spec.ts`と`playwright.authorization.config.ts`を追加した。1 browserあたり4 scenariosで、未認証401、staff、manager、adminのBrowser表示制御と代表的なBackend拒否を検証する。既存Reports 21 scenarios/browserは変更していない。
- 既存login helperをstaff・manager・adminで共用できる形へ拡張した。E2E fixtureにはstaffとadminのテスト専用Login情報を追加し、既存manager fixtureは互換exportとした。DB reset/seedはstaff・manager・adminのArgon2id hash、role、active状態を検証する。production DBとschemaは変更していない。
- Customer一覧から開く詳細画面に既存`ActivityHistory`を接続した。これによりstaff・manager・adminがCustomer詳細から活動履歴を参照でき、既存componentのrole制御によりstaff・adminだけに登録formを表示する。新しい業務機能は追加していない。
- T-505専用npm scriptはDocker CLIを呼ばず、起動済みの専用PostgreSQL `127.0.0.1:55432`へ既存の安全guard付きresetで直接接続する。PlaywrightのBackend・Frontend起動設定と3 browser設定は既存Reports configを再利用する。
- production修正後の関連Frontend testは3 files・58/58 PASS。全回帰はBackend 43 files・321/321、Frontend 15 files・166/166、Backend/Frontend buildがPASSした。
- T-505はChromium先行4/4、最終3 browser各4/4、計12/12 PASS。既存Reports回帰は3 workersでChromium・Firefox・WebKit各21/21、計63/63 PASSした。

## 2026-09-22 T-207 顧客CRUD・一覧・検索Playwright検証（完了）

- 既存Reports・Authorization suiteと分離して、`e2e/customers/customer-crud-list-search.spec.ts`と`playwright.customers.config.ts`を追加した。adminでCustomerのlist、search、category filter、4 sort、pagination、detail、create、edit、logical deleteを実Backend・実PostgreSQLへ接続して検証する。
- 1 browserあたり3 scenariosとした。1件目は固定fixtureによる一覧・検索・filter・sort、2件目はpaginationと一覧state保持、3件目はcreateからlogical deleteまでの連続業務flowを扱う。T-505で検証済みのrole別403は重複させていない。
- pagination用Customer 21件はPlaywright request contextから各scenarioの開始時に決定的な名前で作成し、`finally`で論理削除する。共通E2E fixture、production DB、schemaは変更していない。3 browserはworkers 1で順次実行し、テスト間のmutation競合を避けた。
- Customer一覧GETはBrowser cacheの再検証によりFirefoxで304となる場合があるため、既存Reports E2Eと同じく200または304を許容し、画面の件数・行・stateを引き続き検証する。
- Chromium先行は3/3 PASS。最終3 browserはChromium・Firefox・WebKit各3/3、計9/9 PASSした。productionコードの不具合は見つからず、修正していない。
- 既存E2E回帰はAuthorization 12/12 PASS。ReportsはChromium・WebKit各21/21 PASSし、環境負荷でtimeoutしたFirefoxをworkers 1で再実行して21/21 PASSを確認した。

## 2026-09-22 T-601 顧客検索performance/configuration（完了）

- Customer list Repositoryは`deleted_at IS NULL`を共通条件とし、staff owner scope、nameの`ILIKE '%query%'`、category、client指定ownerをANDで追加する。itemsとcountは同じWHERE句・parameterを使い、itemsだけに許可済みsort、`LIMIT`、`OFFSET`を付ける。offsetはServiceで`(page - 1) * page_size`、page size上限は100、total pagesはscope・filter後countから算出する。
- migrationと実DBにはcustomersのB-tree indexとしてprimary keyのid、name、category、owner_user_id、deleted_atが存在する。03が検索条件用として明記した4列とprimary keyが揃っており、composite indexとpartial indexはない。created_atは03のindex指定対象ではないため追加していない。
- E2E固定fixture 6件で`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`を実行した。default listはdeleted_at、staff scopeとowner filterはowner_user_id、category filterはcategoryのindex scanを選択した。name部分一致はname indexを使わずdeleted_at index scan後のfilter、created_at sortはdeleted_at index scan後のSortだった。実行時間は0.021～0.108msだが、小規模fixtureの値を本番性能の根拠には使用しない。
- 前方・後方にwildcardを持つ`ILIKE '%query%'`は通常のB-tree name indexでは効率化できない。データ増加時は`pg_trgm`とGIN/GiSTが候補になるが、正本はextension・index方式を確定しておらず、性能測定はT-602で行うため今回は追加していない。
- Backendは`pg.Pool`を1つ生成して共有する。現行library既定値はmax 10、min 0、idle timeout 10秒、connection timeout・statement timeout・query timeoutは未設定、max lifetime 0、allowExitOnIdle false。設定値は正本で未定義のため変更していない。
- application終了時にpoolを閉じる処理がなかったため、`closeDatabase()`を追加した。SIGINT/SIGTERMでは新規HTTP受付を停止した後に`pool.end()`を実行する。transaction clientは既存どおり`finally`でreleaseする。
- production schema・index・Customer SQLは変更していない。T-601関連は5 files・55/55 PASS、Backend全testは44 files・322/322 PASS、Backend buildはPASSした。FrontendとPlaywrightは変更・実行していない。

## 2026-09-22 T-602 Customer検索性能測定（完了）

- Phase 1の性能受入用データ条件を02/03/04へ反映した。これはproduction実績件数ではなく、T-602/T-603で再現可能な測定を行うためのAcceptance modelである。
- `backend/scripts/customer-search-benchmark.mjs`を追加した。既存の安全guard付きE2E DB reset後、`generate_series`を使う1回の`INSERT ... SELECT`で100,000 Customerを生成する。Customerはactive 95,000件、logical deleted 5,000件、owner 100 usersへ各1,000件、category `NULL` 10,000件と20種類へ各4,500件を決定的に分布させる。実個人情報は使用しない。
- name検索用markerはactive customerに対してno-hit 0件、low-hit 100件、high-hit 10,000件となるよう生成し、測定前にSQLで実件数を検証する。再実行時は既存E2E resetから開始するためdatasetを二重化しない。
- benchmarkはproduction `createApp()`をloopback HTTP listenerで起動し、Login APIから取得したadmin・staff tokenを再利用して`GET /api/v1/customers`を呼び出す。fixture生成、DB reset、login、token取得は測定外とし、response body受信完了までを`performance.now()`で測った。
- 11 scenariosをconcurrency 1で逐次実行し、各10回のwarm-upを除外した後に100回測定した。medianは中央2値の平均、p95は昇順95番目のnearest-rank方式で算出し、scenarioごとに3,000ms以下か判定した。deep paginationは`page=950`、`page_size=100`、`OFFSET 94900`とした。
- default list、staff scope、name high-hit、deep paginationでは、items queryとcount queryを分けて`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`で記録した。HTTP p95とSQL execution timeは別の値として扱う。
- 実行環境はNode.js v24.19.0、PostgreSQL 16.15、`pg.Pool` max 10。全11 scenariosのp95は18.128～78.616msで、すべて3,000ms以下だった。最遅はname low-hitの78.616ms。name high-hitのcountはSeq Scanで、通常のB-tree name indexが前後wildcard検索へ直接利用されないことを確認した。
- package scriptとしてrepository rootとBackendへ`benchmark:customers`を追加した。Production business code、Customer SQL、schema、index、pool値、pagination方式は変更していない。Backend全testは44 files・322/322 PASS、Backend buildはPASS。FrontendとPlaywrightは変更・実行していない。

## 2026-09-22 T-603 50同時ユーザー性能試験（完了）

- T-603の50 concurrent契約を02/03/04へ反映し、既存`customer-search-benchmark.mjs`へ`--load` modeを追加した。T-602と同じ100,000 Customerを生成し、8 scenariosを個別に測定する。repository rootとBackend packageへ`benchmark:customers:load`を実行入口として追加した。
- 1 wave分の50 requestsは、先に50個のPromiseを共通barrierで待機させ、barrier解放後に一斉開始する。各scenarioは2 warm-up wavesを除外し、20 measured waves、計1,000 requestsを測定した。最大request開始時刻差は2.963msだった。
- 各requestについてHTTP開始からresponse body受信完了までを測り、HTTP 200とpagination envelopeも検証した。admin/staff tokenは測定前に取得して再利用し、login負荷は含めていない。medianは中央2値の平均、p95・p99はnearest-rank方式で算出した。
- 測定中は1ms間隔でproduction appと同じ`pg.Pool`の`totalCount`、`idleCount`、`waitingCount`をbenchmark processから観測した。全scenarioでpoolは最大10接続、idle最小0、waiting最大90となった。各scenario後はtotal 10、idle 10、waiting 0へ戻り、connection leakはなかった。
- 8 scenarios、計8,000 measured requestsはすべてHTTP 200かつschema正常で、期待外status、request error、invalid responseは0件だった。scenario別p95は49.278～842.520ms。最遅はname high-hitでmedian 483.276ms、p95 842.520ms、p99 869.427ms、max 915.130msだった。
- SQL planはconcurrencyで変化しないためT-602のEXPLAIN証跡を再利用した。name high-hitのitems/countは約47msで、countはSeq Scanだった。50 concurrentではpool max 10に対して最大90 queriesが待機したが、その待ちを含むHTTP p95も3,000ms以内だったため追加EXPLAINは取得していない。
- Production business code、Customer SQL、schema、index、pool max・timeout、pagination方式は変更していない。Backend全testは44 files・322/322 PASS、Backend buildはPASS。FrontendとPlaywrightは変更・実行していない。

## 2026-09-22 T-004 個人情報暗号化・鍵管理仕様（完了）

- Phase 1のCustomer暗号化対象を`name_kana`、`email`、`phone`、`address`に確定した。既存の部分一致検索、filter、sort、scopeを維持するため、`name`、`category`、`owner_user_id`と識別・日時fieldは平文のままとする。
- application-levelのAES-256-GCM、32-byte key、値ごとのrandom 12-byte IV、16-byte authentication tag、field名を含むAAD、`enc:v1` envelopeを02/03へ正本化した。
- 環境設定からcurrent key IDとkey ringを取得し、不正設定では起動を失敗させる。read時再暗号化は行わず、rotationと既存plaintextはone-shot offline migrationで扱う。steady stateのplaintext混在とplaintext fallbackは禁止した。
- 復号は既存Customer read Role Matrixに従い、DB scope/resource判定とscope Authorizationの後に行う。T-107の実装・検証内容とT-604の最終Acceptanceを04へ具体化した。
- 今回は仕様確定のみで、Production code、schema、testは変更・実行していない。

## 2026-09-22 T-107 Customer暗号化・復号処理（完了）

- Node.js標準`crypto`でAES-256-GCM componentを実装した。`name_kana`、`email`、`phone`、`address`は値ごとにrandom 12-byte IVを生成し、16-byte authentication tag、`customer:v1:<field-name>`のAAD、current key IDを使って`enc:v1` envelopeへ変換する。
- `CUSTOMER_ENCRYPTION_CURRENT_KEY_ID`と`CUSTOMER_ENCRYPTION_KEYS_JSON`からcurrent keyとkey ringを構成する。設定欠落、JSON・Base64不正、current key不存在、32 bytes以外の鍵はserver起動前に拒否する。`.env.example`と`.env.e2e.example`には変数名と形式だけを追加し、鍵値は保存していない。
- Repositoryはroleを判定せず、暗号化済み値を保存・取得する。createはvalidation・Authorization後、DB保存前に暗号化し、editはscope確認後にrequestで変更された暗号化対象fieldだけを暗号化する。readはlistのSQL scope/filter/pagination後、detailのowner scope確認後に返却行だけを復号する。
- `encrypt-customer-data.mjs`と`migrate:customer-encryption`を追加した。migrationはactive・logical deletedを区別せず全Customerをtransaction内で処理する。`NULL`と正しい`enc:v1`は維持し、plaintextだけを暗号化する。不正な`enc:v1`はrollbackし、更新後に全non-null値を再検証するため、再実行しても二重暗号化しない。
- 実PostgreSQL Acceptance用の`verify-customer-encryption.mjs`を追加した。実Backend HTTPでcreate・edit・list・detailを実行し、DB直接参照によるenvelope確認、staff・manager・adminの復号、staff scope外404、active/deleted migration、冪等性、malformed時rollbackを検証する。鍵、plaintext PII、完全なciphertextは出力しない。
- Customer columnは既存の`TEXT`でenvelopeを保存できるためschemaを変更していない。`name`、`category`、`owner_user_id`と検索SQL・index・paginationも変更していない。
- Backend関連テストは8 files・91/91 PASS、Backend全テストは47 files・345/345 PASS、Backend buildはPASSした。FrontendとPlaywrightは変更・実行していない。

## 2026-09-22 T-005 既存Customer mapping・移行手順（完了）

- 正式な演習用Excelの6 sheetを確認し、「既存顧客データ」40件、「担当者マスタ」「カテゴリマスタ」「データ辞書」「演習ケース一覧」を根拠にSource schemaとCustomer全fieldへのmappingを02/03へ確定した。Excel内の説明はsource仕様の証拠として扱い、外部の実行指示としては扱っていない。
- Customer IDはUUID v4を新規採番する。ownerはSource担当者メールを担当者マスタでactive確認後、`users.email`へ完全一致させて`users.id`へ変換する。categoryはA/B/C/Dを法人/個人/重点/休眠へ変換し、空欄は`null`、未知値はrejectとした。
- 全件pre-scanで重複を検出し、同じSource顧客番号を持つ全行をrejectする。個別recordのrequired、email、日時、削除状態、owner/category mapping、Customer validationを行い、validだけを設定可能なbatch transactionでcommitする設計とした。
- T-701ではdataset IDとSource顧客番号を一意keyにする移行台帳をCustomer insertと同じtransactionで記録し、同一入力のretryでUUIDとCustomerを二重生成しない。失敗batchだけをrollback・再実行し、commit済みbatchは維持する。
- mapping・validation後、DB write前に`name_kana`、`email`、`phone`、`address`をT-107のAES-256-GCMで暗号化する。件数、理由別reject、target差分、移行台帳、valid envelope、plaintext残存0をreconciliationする。PII全文、鍵、完全なenvelopeはlog・reject結果へ出さない。
- 今回は仕様と実績記録だけを更新した。T-701 migration program、Production code、DB schema、Frontend、test、Playwright、実データmigrationは変更・実行していない。

## 2026-09-22 T-701 既存Customer data migration（完了）

- 正式なsynthetic Excelを`examples/fixtures/sdd_customer_migration_source.xlsx`へ配置した。6 sheetと必須headerをpreflightし、「既存顧客データ」40件、担当者・カテゴリmaster、データ辞書を`read-excel-file`で読み込む。`exceljs`は正式fixtureのnamespace付きworkbook XMLを読めなかったため採用せず、Excel dependencyは1種類に限定した。
- mapping・normalization・validationを`backend/src/customer-migration`へ実装した。全件pre-scanでSource顧客番号の重複groupを検出し、ownerは担当者メールとactive担当者masterを確認して`users.email`へ完全一致させる。categoryはA/B/C/Dを法人/個人/重点/休眠へ変換し、Excel日時は`Asia/Tokyo`からUTCへ変換する。
- migration ledger用に`002_create_customer_migration_ledger.sql`を追加した。`dataset_id`と`source_customer_id`をprimary key、Customer UUIDをuniqueな外部keyとし、正規化済みsourceのSHA-256 fingerprint、source row番号、移行日時を保存する。plaintext source recordは保存しない。
- valid recordを既定100件、指定可能範囲1～10,000件のbatchへ分割する。各batchでCustomerとledgerを同一transactionにinsertし、system error時はそのbatchだけをrollbackする。commit済みbatchは維持する。
- 初回はUUID v4を採番する。同じdataset/source ID・fingerprintの再実行は`already_migrated`、fingerprint相違は`SOURCE_CHANGED_AFTER_MIGRATION`としてCustomerを更新しない。Customerを二重登録せず、失敗batchを再実行できる。
- T-107 crypto componentを再利用し、`name_kana`、`email`、`phone`、`address`をDB write前にAES-256-GCMで暗号化する。Customer tableへplaintextを一時commitしない。
- `migrate:customers` CLIに`--input`、`--dataset-id`、任意の`--batch-size`・`--reject-output`を追加した。summaryとrejectをJSONで出力し、rejectにはSource顧客番号、row番号、reason code、PIIを含まないsummaryだけを含める。
- 実Excelと専用E2E PostgreSQLを使う`verify:customer-migration`を追加した。初回・再実行、31 Customer、active 28件・logical deleted 3件、暗号化対象のplaintext残存0、代表recordのauthorized readを検証し、検証後は追加dataを削除する。
- schema変更はmigration ledgerの追加だけである。既存Customers schema・index、Customer API、Frontendは変更していない。

## 2026-09-22 T-007 Production運用仕様（完了）

- Phase 1のproductionをAWS `ap-northeast-1`とし、FrontendはS3・CloudFront、BackendはECS on Fargate・ALB、DatabaseはMulti-AZ RDS for PostgreSQL 16と確定した。Public HTTPSとBackend・RDS間TLSを必須とし、RDS CAによるserver certificate検証を行う。
- production secretはAWS Secrets ManagerからECS Taskへinjectする。DB credential・JWT secretは90日、Customer encryption current keyは180日でrotationし、incident時は即時rotationする。Customer keyはT-004/T-107のone-shot re-encryption手順に従う。
- RDS automated backup・PITRのretentionを7日、重要変更前のmanual snapshotを14日とした。RDSとbackupはKMS暗号化を必須とし、RPO 5分以内、RTO 60分以内を目標にする。四半期ごとに分離したtemporary RDSでrestore drillを実施する。
- CloudWatchでECS・ALB・RDS・applicationを監視し、重大alarmはCloudWatch AlarmからSNS経由で運用担当メールへ通知する。予定maintenanceは原則3営業日前と開始1時間前に通知し、重大incidentは検知後15分以内に一次切り分けを始める。
- T-702へproduction config validation、RDS TLS、Secrets Manager用env interface、backup/restore procedure、restore verification、Backend regressionを引き継いだ。今回は仕様書だけを更新し、Production code、DB schema、AWS resource、testは変更・実行していない。

## 2026-09-22 T-702 Production設定・backup/restore基盤（実装済み、実restore未完了）

- Production起動入口は`NODE_ENV=production`を必須とし、`DATABASE_URL`、32 bytes以上の`JWT_SECRET`、Customer暗号設定、`DATABASE_SSL_CA_PATH`をserver import前に検証する。DB URLはPostgreSQL protocolだけを許可し、RDS CAはfileから読み込む。設定errorへsecret値、CA内容、credentialを出力しない。
- `pg.Pool`へmax 10、min 0、idle timeout 10秒を明示し、Productionでは`rejectUnauthorized: true`とRDS CAを設定する。connection・statement・query timeoutは追加していない。既存のSIGINT/SIGTERM、HTTP server停止、`pool.end()`の順序も維持した。
- AWS SDKは追加せず、Secrets ManagerからECS Task environmentへinjectされた既存変数を読むinterfaceとした。`.env.example`には変数名、必須条件、形式だけを記載した。
- PostgreSQL標準の`pg_dump`・`pg_restore`を呼び出す共通部品とCLIを追加した。passwordはcommand argumentへ渡さずchild processの`PGPASSWORD`だけへ設定し、child environmentからapplication secretを除外する。dumpはcustom format、no-owner、no-privilegesとする。
- 分離DB `customer_management_restore_t702`へrestoreし、主要6 table、row count、FK、Customer `enc:v1`、plaintext残存0、authorized decrypt、dump内のapplication secret非同梱を確認するscriptを追加した。source・restore DBと一時dumpのcleanupを組み込んだ。
- `docs/operations/production-backup-restore.md`へRDS automated backup・PITR、manual snapshot、KMS、temporary restore、四半期drill、RPO 5分・RTO 60分、CloudWatch・SNS alertを記録した。`.gitignore`へenvironment fileとbackup artifactの除外を追加した。
- local環境に`pg_dump`・`pg_restore`が存在せず、実backup/restoreはclient tool起動時に停止した。fake restoreへ置き換えていない。関連testは6 files・50/50、Backend全testは52 files・370/370、Backend buildはPASSしたが、実restore Acceptance未達のためT-702は未完了である。
## 2026-09-22 T-607 Monitoring・Health Check

- Backendへ認証不要の`GET /health/live`と`GET /health/ready`を追加した。livenessはDBへqueryせず200、readinessは`SELECT 1`成功時200、DB未設定・失敗時は内部情報を含めず503を返す。既存`GET /health`は互換性のため維持した。
- `infra/monitoring.yaml`へCloudFormation templateを追加した。環境依存値と初期thresholdをparameter化し、SNS Topic・email subscription、ECS 2 alarms、ALB 4 alarms、RDS 6 alarms、RDSの`availability`・`failure`・`backup` EventSubscriptionを定義した。AlarmはALARM/OKをSNSへ送り、INSUFFICIENT_DATA actionは設定していない。
- `docs/operations/production-monitoring.md`へsubscription confirmation、Alarm一覧、ALB・5xx・RDS異常時の一次対応、15分以内の切り分け、情報保護を記録した。既存`production-backup-restore.md`へrestore drill失敗時のSNS相当経路へのescalationを接続した。
- CloudFormation YAMLのparseとresource wiringを検証するため、Backendのdev dependencyへ`yaml`だけを追加した。AWS CLI・AWS credentialは追加せず、AWS resourceはdeployしていない。Customer、Activity、Reports、Usersの業務contract、Frontend、DB schemaは変更していない。
## 2026-09-22 T-609 Maintenance notification

- `003_create_maintenance_notifications.sql`でmaintenance eventとrecipient単位deliveryを追加した。event type、phase、status、日時・必須文字列、FK、event・phase・recipientの一意性、status別field整合をDB constraintで固定した。
- active usersだけを取得するRepository、event/phase validation、JST plain text生成、recipient単位の継続送信、SENT skip、FAILED retryを行うServiceを実装した。providerの生errorは保存せず、safeな`SES_SEND_FAILED`だけを記録する。
- AWS SDK v3のSES v2 clientを使うtransport adapterと運用CLIを追加した。ProductionではECS Task Role、`AWS_REGION=ap-northeast-1`、SES verified senderの`MAINTENANCE_FROM_EMAIL`を使う。CLIは集計だけを出力し、partial failure時は成功を維持してnon-zero終了する。
- `docs/operations/maintenance-notification.md`へ予定・緊急maintenance、INITIAL・REMINDER・EMERGENCY、delivery確認、retry、PENDING照合、incident escalationを記録した。Frontend UI、business API、scheduler、実AWS SES送信は追加していない。

## 2026-09-22 T-703 Integrated operations manual

- `docs/operations/operations-manual.md`をPhase 1運用の入口として追加した。Production構成、daily operation、health判断、Alarm初動、SEV1〜3、incident response、backup・restore、maintenance通知、secret rotation、release・migration、四半期restore drill、証跡・情報保護を整理し、既存3 runbookへ接続した。
- `docs/operations/incident-contacts.md`へOperations Primary/Secondary、Application Owner、Database Owner、Security Contact、Business / Service Owner、AWS Supportのrole-based matrixとseverity別escalationを記録した。実連絡先はGit外のアクセス制御されたProduction operations contact rosterで管理する。
- 10の運用scenarioについて、検知、初動、runbook、escalation、利用者通知、復旧確認、証跡をwalkthroughした。Production code、DB schema、Frontend、AWS resourceは変更していない。

## 2026-09-22 T-608 Business-hours availability

- `infra/monitoring.yaml`へCloudWatch Synthetics Canary、最小権限IAM Role、暗号化・public access遮断・31日retention付きartifact bucketを追加した。CanaryはUTC平日00:00～08:55に5分間隔で、Frontend HTTPS 2xxとBackend `/health/ready`の200・`status = ready`を確認する。
- `backend/src/availability`へJST expected slot生成、月境界・当月cutoff、failure・missing・duplicate、raw 99%判定を行うpure calculator、probe、CloudWatch `SuccessPercent` adapterを追加した。missingはfailure側へ計上し、予定maintenanceを自動除外しない。
- `availability:report` CLIを追加した。過去月またはmonth-to-dateのexpected、success、failed、missing、availability、PASS/FAILをJSONで出力し、測定FAILはexit code 2、system errorは1とする。
- `docs/operations/availability-measurement.md`へ測定契約、Canary、月次report、99%未達時のT-703 escalationを記録し、統合operations manualから参照した。AWS resource、Frontend、DB schema、business APIは変更していない。

## 2026-09-22 T-610 Maintenance notification timing

- DB・SESから分離したtiming evaluatorを追加した。JST月～金だけを数えるINITIALの3営業日前deadline、REMINDERの開始60分前±5分、EMERGENCYのevent作成後15分以内をrecipient単位で判定し、安全なreason codeと集計を返す。
- `004_add_maintenance_first_attempted_at.sql`を追加し、既存`attempted_at`を初回値としてbackfillした。新規deliveryでは初回claim時だけ`first_attempted_at`を設定し、retryでは維持する。`attempted_at`は直近attemptを示す既存の意味を保つ。
- `maintenance:verify-timing` CLIを追加した。event・phase・target・pass・fail・delivery status・reason・expected timing・検証時刻を出力し、timing PASSはexit 0、FAILは2、system errorは1とする。recipient emailは出力しない。
- 実E2E PostgreSQLでA～Hの境界値、CLI exit code、retry後の初回attempt保持、cleanupを検証した。`maintenance-notification.md`へ配信後のverificationとT-703 escalationを追加し、scheduler・実SES送信・timing result tableは追加していない。

## 2026-09-22 T-704 Production migration rehearsal

- `migration:rehearse` CLIとoffline rehearsal helperを追加した。接続先を専用local E2E環境へ限定し、release直前baselineの001～003、pending migrationの004、T-701 Customer migrationをmanifest順に実行する。
- schema・data変更前に既存T-702の`pg_dump` helperでcustom-format backupを取得した。Forward後はschema、FK、Customer 31件、ledger、暗号化、`live`・`ready`、authorized Customer readを検証した。004の適用済みskipとT-701の31件`already_migrated`も確認した。
- pre-change dumpをforward DBとは別のrollback DBへrestoreし、baseline schema、row count、FK、Customer暗号化・復号を比較した。別のfailure DBでは意図したmigration failure後にapplication rolloutが開始されないことを確認した。
- `docs/operations/production-migration-rehearsal.md`へmanifest、本番順序、rollback trigger、snapshot/PITRによる復旧、証跡、RPO・RTOとの関係を記録し、統合operations manualから接続した。Customer business API、Production startup、Production schema、Frontend、AWS resourceは変更していない。

## 2026-09-22 T-801 Backend単体・統合テスト

- Backend全64 test files・431 testsを今回あらためて実行し、初回・最終回帰とも全件PASSした。既知の失敗と予期しないskipは0件だった。
- Authentication、Authorization、Customer CRUD・検索、Activity、Reports、Users・role、暗号化、Customer migration、Production設定、backup・restore、Health・monitoring、maintenance通知・timing、availability、migration rehearsalの既存testを確認した。
- 新規不具合は見つからなかった。Production code、test code、DB fixture・setupは変更していない。
- 専用E2E PostgreSQLを既存の安全ガード付きresetで初期化し、maintenance event・delivery、migration ledger、audit log、activityの残存0件と基準fixture件数を確認した。Backend buildもPASSした。

## 2026-09-22 T-802 Frontend主要画面・入力エラー検証

- Frontend全15 test files・166 testsを今回あらためて実行し、全件PASSした。既知の失敗と予期しないskipは0件だった。
- Login、Customer一覧・検索・sort・pagination・詳細・登録・編集・削除、Activity履歴・登録、Reports 3種、Users・role管理の既存testを確認した。
- required・empty・invalid input、cancel、submit success・failure、loading・empty state、API error表示、staff・manager・adminのRole別表示制御を確認した。
- 新規不具合は見つからなかった。Frontend Production codeとtest codeは変更していない。Frontend production buildはPASSし、Backend testとPlaywrightはT-802対象外のため実行していない。

## 2026-09-22 T-803 Playwright主要シナリオ

- Login smoke、Authorization、Customer CRUD・一覧・検索、Activity、Reportsの既存Playwright 32 scenariosを対象とした。最終実行はLogin API 2件に加え、Chromium・Firefox・WebKitで各30件、合計92 test executionsがPASSした。
- E2E setup defectを2件修正した。PlaywrightからBackendへE2E用Customer暗号化設定が渡らず起動できなかったため、configの必須確認とWebServer environmentへの引き渡しを追加した。Reports全browserを6 workersで実行するとFirefox・WebKitのcontext teardownが競合したため、timeoutを変えず3 workersへ制限した。
- Activityの旧Playwright 2件がLogin導入前の画面遷移に依存していたE2E test defectを修正し、staff Login後に既存scenarioを実行するよう変更した。Production codeとAPI contractは変更していない。
- 最終実行後に安全ガード付きE2E DB resetを行い、maintenance event・delivery、migration ledger、audit log、activityの残存0件と基準fixture件数を確認した。Backend・Frontendのunit/component testとbuildはProduction code変更がないため再実行していない。
