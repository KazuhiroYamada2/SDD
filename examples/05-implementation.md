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
