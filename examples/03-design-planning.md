# 設計計画工程

このファイルは、02-planning-requirement.mdの要件を実装・検証可能な設計へ具体化した設計計画書です。

## 採用技術

| 領域 | 採用技術 | 適用範囲 |
| --- | --- | --- |
| Frontend | React、TypeScript、Vite | 顧客、活動履歴、レポート、権限管理のWeb画面 |
| Backend | Node.js、TypeScript、Express | REST API、認証、認可、業務ロジック |
| Database | PostgreSQL | 業務データ、ユーザー、監査ログ |
| Authentication | JWT | APIアクセスの認証 |
| E2E | Playwright | 主要ユーザーフローと受入確認 |

採用技術は決定済みとし、代替案の比較検討は行わない。クラウド事業者は別途決定するが、アプリケーションはPostgreSQLと標準的なNode.js実行環境で動作する構成にする。

## 要件ID

02-planning-requirement.mdの要件を次のIDで参照する。

### 機能要件

- **F-01〜F-05**: 顧客情報の登録、編集、削除、検索・フィルタリング、一覧表示
- **F-06〜F-08**: 訪問記録、商談内容、次回訪問予定
- **F-09〜F-11**: 売上推移、顧客分類、営業担当者別実績
- **F-12〜F-14**: 閲覧権限、編集権限、管理者権限

### 非機能要件

- **N-01**: 顧客情報検索を3秒以内に表示
- **N-02**: 最大50ユーザーの同時アクセス
- **N-03**: ログイン認証
- **N-04**: 顧客情報の暗号化保存
- **N-05**: アクセスログの記録
- **N-06**: 平日9:00〜18:00の稼働率99%以上
- **N-07**: メンテナンスの事前通知

## システム構成

3層構成を採用する。

1. **プレゼンテーション層**: React画面、入力検証、API呼び出し、認証状態管理
2. **アプリケーション層**: Expressのルーティング、JWT検証、権限判定、業務ルール、集計処理
3. **データ層**: PostgreSQLへのアクセス、トランザクション、暗号化・監査ログ処理

FrontendとBackendはREST APIで通信する。FrontendからDatabaseへ直接接続してはならない。

## データ設計

### users

`id`、`email`、`password_hash`、`role`、`is_active`、`created_at`、`updated_at`を持つ。`role`は`staff`、`manager`、`admin`のいずれかとする。

### customers

`id`、`name`、`name_kana`、`email`、`phone`、`address`、`category`、`owner_user_id`、`created_at`、`updated_at`、`deleted_at`を持つ。個人情報に該当する項目はアプリケーション層で暗号化して保存する。削除は論理削除とし、通常の検索結果および顧客分類集計には含めない。

### activities

`id`、`customer_id`、`user_id`、`activity_type`、`visited_at`、`meeting_note`、`next_visit_at`、`created_at`、`updated_at`を持つ。`activity_type`は訪問または商談を表す。

### sales_records

`id`、`customer_id`、`user_id`、`amount`、`recorded_on`、`created_at`、`updated_at`を持つ。売上推移と営業担当者別実績の集計元とし、今回のレポート設計では既存データの参照対象とする。業務用登録・更新APIや画面は対象に含めない。

### audit_logs

`id`、`user_id`、`action`、`resource_type`、`resource_id`、`request_id`、`ip_address`、`created_at`を持つ。ログイン、顧客情報の参照・変更・削除、権限変更を記録する。

顧客、活動履歴、売上記録には外部キーと作成・更新日時を設定する。検索条件に使用する`customers.name`、`customers.category`、`customers.owner_user_id`、`customers.deleted_at`にはインデックスを設定する。

## REST API設計

業務APIとLogin APIは`/api/v1`配下に置き、JSONを使用する。health checkは`GET /health`とする。認証が必要なAPIでは`Authorization: Bearer <JWT>`を必須とする。エラーは`{ "code": "エラーコード", "message": "説明" }`形式で返す。

Phase 1では`POST /api/v1/auth/login`と`GET /health`をPublicとし、その他の業務APIは現在実装済みか今後実装するかを問わずAuthenticationを必須とする。新しいPublic APIは仕様へ明示してから追加する。ExpressではPublic routeを先に登録し、その後の`/api/v1`業務APIに共通Authentication middlewareを適用する。認証成功は操作権限を意味しない。roleとデータ範囲の認可・403はT-105と対象機能Taskで扱う。

| エンドポイント | 用途 | 要件 |
| --- | --- | --- |
| `POST /api/v1/auth/login` | ログインしてJWTを発行 | N-03 |
| `GET /customers` | 一覧、検索、フィルタリング | F-04、F-05、N-01 |
| `POST /customers` | 顧客登録 | F-01 |
| `GET /customers/:id` | 顧客詳細表示 | F-05、F-12 |
| `PATCH /customers/:id` | 顧客編集 | F-02、F-13 |
| `DELETE /customers/:id` | 顧客論理削除 | F-03、F-13 |
| `POST /customers/:id/activities` | 訪問・商談・次回予定の登録 | F-06〜F-08 |
| `GET /customers/:id/activities` | 活動履歴の表示 | F-06〜F-08、F-12 |
| `GET /api/v1/reports/sales-trend?from=YYYY-MM-DD&to=YYYY-MM-DD` | 月単位の売上推移 | F-09、F-12 |
| `GET /api/v1/reports/customer-categories` | 現在の有効顧客の分類集計 | F-10、F-12 |
| `GET /api/v1/reports/staff-performance?from=YYYY-MM-DD&to=YYYY-MM-DD` | 営業担当者別実績 | F-11、F-12 |
| `GET /users`、`PATCH /users/:id/role` | ユーザー・権限管理 | F-12〜F-14 |

一覧APIは`page`、`page_size`、`query`、`category`、`owner_user_id`、`sort`を受け付ける。顧客一覧・検索・詳細の確定契約は後述の「顧客read API設計」に従う。売上推移および営業担当者別実績APIは`from`、`to`を`YYYY-MM-DD`形式で必須とし、期間外のデータを集計しない。顧客分類集計APIは期間を受け付けず、`from`または`to`がquery parameterに存在する場合は値が空でもHTTP 400を返す。期間queryがない場合は現在の有効顧客のスナップショットをHTTP 200で返す。

## 顧客read API設計

### Customer read共通DTO

既存の`POST /api/v1/customers`成功応答で公開済みのfield setを一覧・詳細で共用する。新しいbusiness fieldやDB内部fieldを追加せず、一覧用summaryと詳細用DTOへ分けない。

| field | JSON型 | 内容 |
| --- | --- | --- |
| `id` | string（UUID） | customer ID |
| `name` | string | 顧客の主表示名 |
| `name_kana` | string \| null | 顧客名カナ |
| `email` | string \| null | メールアドレス |
| `phone` | string \| null | 電話番号 |
| `address` | string \| null | 住所 |
| `category` | string \| null | 顧客分類 |
| `owner_user_id` | string（UUID） | 担当user ID |
| `created_at` | string（ISO 8601） | 登録日時 |
| `updated_at` | string（ISO 8601） | 更新日時 |
| `deleted_at` | string（ISO 8601）\| null | 論理削除日時。通常readでは有効顧客だけを返すため`null` |

`GET /api/v1/customers/:id`はHTTP 200でCustomer read共通DTO 1件を返す。`GET /api/v1/customers`は次のenvelopeを返す。

```json
{
  "items": [
    {
      "id": "8a1f2d44-1234-4abc-8def-123456789abc",
      "name": "株式会社サンプル",
      "name_kana": "カブシキガイシャサンプル",
      "email": "sales@example.com",
      "phone": "03-1234-5678",
      "address": "東京都千代田区",
      "category": "既存顧客",
      "owner_user_id": "c0a80101-1234-4abc-8def-123456789abc",
      "created_at": "2026-09-13T00:00:00.000Z",
      "updated_at": "2026-09-13T00:00:00.000Z",
      "deleted_at": null
    }
  ],
  "page": 1,
  "page_size": 20,
  "total_count": 123,
  "total_pages": 7
}
```

`total_count`はAuthorization scope、query、filter適用後の全件数とし、`total_pages = ceil(total_count / page_size)`とする。0件は`items: []`、`total_count: 0`、`total_pages: 0`を返す。要求pageが最終pageを超えても404にせずHTTP 200とし、空の`items`、要求された`page`、適用された`page_size`、実際の`total_count`と`total_pages`を返す。

### Query validation・検索・sort

| parameter | default | validation・挙動 |
| --- | --- | --- |
| `page` | `1` | 1以上の整数 |
| `page_size` | `20` | 1以上100以下の整数。APIは範囲内の任意整数を許可する |
| `query` | filterなし | trim後、`customers.name`へのcase-insensitive partial match。trim後空文字はfilterなし |
| `category` | filterなし | trim後、`customers.category`への完全一致。trim後空文字はfilterなし |
| `owner_user_id` | filterなし | UUID形式の完全一致。UUIDとして正しく対象がない場合は0件 |
| `sort` | `name_asc` | `name_asc`、`name_desc`、`created_at_asc`、`created_at_desc`だけを許可 |

`name`はschemaと既存Customer APIに存在する顧客の主表示名であり、`query`の対象をemail、phone、address、ID等へ広げない。categoryにはmaster制約がないため、存在しない値はHTTP 200の0件とする。`query`、`category`、`owner_user_id`はANDで結合し、staffのowner security scopeもANDする。

sortは指定field・方向を第1条件、`customers.id ASC`を常に第2条件として安定させ、DBの自然順に依存しない。Frontendのpage size選択肢は20、50、100とする。

不正queryは既存validation error形式を再利用し、HTTP 400 `{ "code": "VALIDATION_ERROR", "message": "<入力項目に対応する説明>" }`を返す。実装時のmessageは次を使用する。

| 条件 | message |
| --- | --- |
| `page`が0、負数、非整数、数値として解釈不能 | `page must be a positive integer.` |
| `page_size`が0、負数、非整数、101以上、数値として解釈不能 | `page_size must be an integer between 1 and 100.` |
| `sort`が許可値以外 | `sort must be one of name_asc, name_desc, created_at_asc, created_at_desc.` |
| `owner_user_id`がUUID形式でない | `owner_user_id must be a UUID.` |

### logical delete・Authorization・Repository責務

- list/search queryは常に`customers.deleted_at IS NULL`を適用する。detailも`deleted_at IS NULL`のcustomerだけを取得対象とする。削除済みcustomerはadminを含む全roleで通常readから取得できない。
- list/searchではstaffの`owner_user_id = authenticatedUser.id`をServiceがsecurity検索条件へ変換し、Repositoryへ渡す。Repositoryはroleや`AuthenticatedUser`を知らず、受け取ったowner scope・query・filter・sort・paginationだけでparameterized SQLとscope適用後のcount queryを構築する。manager/adminにはowner security scopeを渡さない。全件取得後のFrontendまたはService filteringは禁止する。
- clientの`owner_user_id` filterとsecurity scopeは別に保持してANDする。staffが他者のIDを指定した場合もscopeを緩めず0件を返し、403にはしない。
- detailはcustomerを1回取得し、存在と`deleted_at IS NULL`を確認した後、取得済み`owner_user_id`と`request.authenticatedUser`をT-105の`isCustomerInScope`へ渡す。Repositoryへrole判定を入れない。
- customer不存在、logical deleted customer、staff scope外は、すべてHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`を返す。理由やowner情報を公開応答へ含めない。
- T-202でlist/detail APIを作る同じ実装単位にT-501のscopeを適用し、unrestrictedなproduction GET APIを作らない。T-205の検索・filter・sort・paginationもstaff scope込みで実装する。05・06では機能実装とT-501の証跡を分けて記録する。

### Frontend state設計

- React Routerを追加せず、既存のApp stateによるscreen切替を維持する。T-202はCustomer list screenを追加し、一覧には最低限`name`、`category`、詳細操作を表示する。ownerの氏名・emailを取得するAPIや、技術値である`owner_user_id`の一覧表示を追加しない。
- 詳細操作ではcustomer idをApp stateへ保持して`GET /api/v1/customers/:id`を呼び、Customer read共通DTOを表示する。既存CustomerDetailを安全に再利用できる場合は利用し、登録直後専用の前提と衝突する場合は責務を分ける。詳細から一覧へ戻る操作を設け、T-205で検索条件等が加わった後も一覧stateを保持する。
- T-205は`query`入力、category filter、sort select、page size 20・50・100、前へ・次へ、現在pageを一覧へ追加する。query/categoryは「検索」操作で適用する。検索、sort変更、page size変更はpageを1へ戻し、ページ移動は現在条件を維持する。
- sort表示は「顧客名 昇順」「顧客名 降順」「登録日時 昇順」「登録日時 降順」とし、それぞれAPI値`name_asc`、`name_desc`、`created_at_asc`、`created_at_desc`へ対応させる。
- `items: []`はエラーにせず「該当する顧客がありません」等、既存UI文言規約に合わせた通常の0件状態を表示する。400・404・500・network errorと既存401処理は既存Frontend error handlingを再利用し、新しいglobal error frameworkを作らない。
- `owner_user_id` filterはBackend capabilityとしてT-205で実装するが、T-503のusers参照APIがない段階ではFrontendにUUID手入力欄またはowner選択UIを作らない。users一覧を安全に取得できる段階で必要性を再評価する。

## レポートResponse DTO

- 売上推移は`{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "items": [{ "month": "YYYY-MM", "salesAmount": "1200000.00" }] }`を返す。売上がない月もitemsに含め、`salesAmount`は`"0.00"`とする。
- 顧客分類は`{ "items": [{ "category": "A", "customerCount": 25 }] }`を返す。`customers.deleted_at`が`null`ではない顧客は除外し、`category`が`null`の場合は`"未分類"`として集計する。
- 営業担当者別実績は`{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "items": [{ "staffId": "UUID", "staffEmail": "user@example.com", "salesAmount": "3500000.00", "salesCount": 12 }] }`を返す。`salesAmount`は小数点以下2桁の文字列とする。

## 認証・認可

- `POST /api/v1/auth/login`は`Content-Type: application/json`で`{ "email": "user@example.com", "password": "password" }`を受け取る。emailは必須の文字列で、前後の空白を除去した後に空文字を認めず、最大254文字とする。大文字小文字を変換せず、既存の`users.email`検索規約を維持する。passwordは必須の文字列で、trimせず、空文字を認めず、最大1024文字とする。request構造・型・必須項目・空文字・最大文字数が不正な場合はHTTP 400と既存の`{ "code": "VALIDATION_ERROR", "message": "..." }`形式を返す。
- ログイン成功時はHTTP 200で`{ "accessToken": "<JWT>", "tokenType": "Bearer", "expiresIn": 1800, "user": { "id": "<users.id>", "email": "<users.email>", "role": "<staff|manager|admin>" } }`を返す。`password_hash`は返さない。
- passwordはArgon2idで照合する。基準値はmemory 19 MiB、time cost 2、parallelism 1とし、passwordごとのsaltはライブラリが生成する。saltを別列へ追加せず、エンコード済みハッシュを`users.password_hash`へ保存する。T-104は有効なハッシュを持つ既存ユーザーのログインを対象とし、作成・変更・再設定APIやpassword作成ポリシーは含めない。テスト用には固定passwordから正規のArgon2id hashを生成してよいが、本番の初期password_hash登録方法（Initial Password Provisioning）は後続で決定する。
- JWTはHS256で署名し、検証時も許可アルゴリズムをHS256に固定する。token headerの`alg`で任意の方式へ切り替えない。署名鍵は推測困難な最低256 bit相当のランダムsecretとし、人間用passwordを流用しない。local・test・E2EではGit管理外の環境変数、productionでは秘密情報管理サービスから取得する。秘密値は仕様書へ記載しない。
- JWTの基本claimは`sub = users.id`、`iat`、`exp`のみとする。独自`userId`、`role`、`email` claimは含めない。`exp`は発行から30分後とし、Responseの`expiresIn`は1800秒とする。Phase 1では単一Backendが発行・検証し、他サービスとtokenを共有しないため`iss`・`aud`を必須にしない。複数issuer・API・サービスへ拡張する場合は導入して検証する。
- 認証対象APIは`Authorization: Bearer <JWT>`を要求する。header欠落、Bearer形式不正、JWT形式不正、署名不正、期限切れ、`sub`のユーザー不存在、`users.is_active = false`はHTTP 401で`{ "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required." }`を返す。ログイン時も`is_active`を確認し、email不存在、password不一致、無効ユーザーは、区別せずHTTP 401で`{ "code": "AUTHENTICATION_FAILED", "message": "Authentication failed." }`を返す。
- T-104のAuthentication middlewareはBearer形式・HS256署名・期限を検証し、`sub`でusersを検索して存在と`is_active`を各requestで確認する。現在のDB上のroleを取得し、requestへ`authenticatedUser: { id: users.id, role: users.role }`を設定する。emailは共通認可情報へ含めない。ログイン後の無効化は次requestから401、role変更は次requestから現在のroleを使用する。
- Loginでemailが存在しない場合も有効なArgon2id dummy hashを使ってverify処理を行い、password不一致と同じ外部応答にする。固定sleepは使用しない。T-104は認証結果・内部向け失敗理由・判明したuser id・時刻とrequest contextを判定可能にする。`audit_logs`への永続記録はT-108の責務とする。raw password、password_hash、JWT全文、署名secretをログに出さない。
- Phase 1ではrefresh tokenとBackend Logout APIを設けない。Frontendはaccess tokenをJavaScript memoryに保持し、logout時に破棄する。localStorage・sessionStorage・HttpOnly Cookieは使用せず、Browser再読込後とtoken期限切れ後は再ログインする。個別tokenの期限前失効は設けないが、`is_active`によるユーザー単位の無効化は各requestで反映する。Frontend Login画面やtoken保持処理はT-110で実装し、T-104には含めない。
- FrontendはLogin成功時の`user: { id, email, role }`とaccess tokenをReactのmemory上で保持し、従来の初期業務画面である顧客登録画面を表示する。Appのstateまたは認証専用Context/stateのうち、子画面とAPI clientへ共有できる最小構成を使い、UI stateと切り離されたmodule globalだけでは管理しない。roleはメニュー・画面・ボタンの表示制御に使い、Backendの認可判定の代わりにはしない。
- Loginの401 `AUTHENTICATION_FAILED`では原因を区別しない「ログインに失敗しました。」等の共通メッセージを表示し、token・userを保持せずLogin画面に留まる。400 `VALIDATION_ERROR`でもLogin画面に留まり、利用者向けの入力エラーを表示する。Backendの内部情報は表示しない。
- customers・activities・reports・users等の認証対象APIは、小さな共通fetch helperから`Authorization: Bearer <accessToken>`を付けて呼ぶ。helperはfetch実行と401 `AUTHENTICATION_REQUIRED`の検知を担い、role判定と403画面制御は含めない。業務APIの401ではmemory上のtoken・userを破棄し、認証失効・無効化の原因を区別しない再ログイン案内を表示してLogin画面へ戻る。Browser再読込時はtokenを復元せずLogin画面を表示する。Logout操作もtoken・userを破棄してLogin画面へ戻るだけとし、Backend APIを呼ばない。Axios等の新しいHTTP clientは導入しない。
- 認証移行は、E2E専用managerと実Argon2id hashによるLogin API実DB確認 → Frontend認証と既存Reports Playwrightのログイン移行 → production業務APIへのAuthentication適用 → T-605最終検証 → T-105 → T-501等の順とする。各実装Task終了時点で既存21シナリオ×3 Browserの63件がPASSする状態を維持する。E2E managerにはテスト専用passwordを使い、既存staffとsales_records等の集計値を変更しない。本番Initial Password Provisioningは別課題であり、本番展開前に決定する。
- Phase 1の`staff`に許可された顧客は、`customers.owner_user_id = 認証済みusers.id`の顧客とする。`owner_user_id`は登録者ではなく顧客担当者を表す。`manager`の担当者範囲はPhase 1の全staffとする。
- 認証済みユーザーの操作可否とデータ範囲はBackend APIで判定し、Frontendの表示制御だけに依存しない。T-105は共通Authorization機構と403処理を作り、各production業務APIへの適用は閲覧系のT-501、登録・編集・削除系のT-502、ユーザー参照・role変更のT-503で行う。
- 401はAuthentication失敗に限り、T-104/T-111の既存`AUTHENTICATION_REQUIRED`契約を使用する。Authenticationに成功してもroleとしてoperationが禁止される場合はHTTP 403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`を返す。required role、actual role、owner情報などの内部理由は公開しない。T-105は401やJWT検証を再実装せず、Authentication middlewareが設定した`request.authenticatedUser: { id, role }`を使用する。AuthorizationのためにAuthorization headerを再解析したりusersを再lookupしたりしない。
- 判定順序は原則としてAuthentication → roleによるoperation-level Authorization → 入力validation・resource lookup → 取得したresourceによるscope Authorization → business processingとする。operation自体が禁止ならresource lookup前に403を返す。例えばstaffのReports・顧客論理削除、managerの顧客登録・編集・論理削除・活動登録、staff/managerのユーザー参照・role変更が該当する。既存validation/error契約と重大な矛盾が見つかれば適用前に報告する。
- staffに許されたresource-specific operationでは、対象customerが存在しない場合と`customers.owner_user_id !== authenticatedUser.id`の場合を同じ404応答とし、scope外の顧客の存在を公開しない。顧客詳細・編集、親顧客を指定する活動履歴の一覧・登録、および将来の同種操作へ適用する。現在の活動履歴APIでは両者ともHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`を使用する。将来の顧客APIはそのAPIで確定するresource not found契約を両者に等しく使用する。manager・adminにowner一致の制限は設けない。
- staffの顧客登録では、requestに`owner_user_id`があっても保存値は`authenticatedUser.id`へ強制し、client値を認可上の根拠にしない。request項目はPhase 1の互換性のため維持する。adminは既存requestの`owner_user_id`を指定でき、既存のowner user validationを維持する。managerは入力validationや登録処理の前に403とする。活動登録のscopeは活動の`user_id`ではなく親customerの`owner_user_id`で判定し、活動のclient入力`user_id`の意味は変更しない。
- T-105の共通policyはrole × operation判定と、取得済みcustomerの`owner_user_id`・`authenticatedUser`・operationからscopeのallow/denyを判定する小さな関数を基本とし、DB accessをpolicyへ埋め込まない。scope外の404への変換は対象APIの既存resource not found契約に合わせる。T-105で将来のCustomer Repository methodを先行追加せず、T-501/T-502で各domainの取得処理とowner取得を統合する。認可用lookupとbusiness serviceの同一customer lookupを安易に二重実行しない。
- 現行APIのうち`GET /api/v1/customers/:customerId/activities`と3種の`GET /api/v1/reports/*`はT-501で閲覧権限を適用する。`POST /api/v1/customers`と`POST /api/v1/customers/:customerId/activities`はT-502で登録権限を適用する。未実装の顧客一覧・検索・詳細もT-501、顧客編集・論理削除もT-502で対象API実装と合わせて適用する。ユーザー参照・role変更はT-503に留める。T-504はrole別のBackend/API検証、T-505は401/403と画面表示のPlaywright検証とし、Frontendのmenu・screen・button制御をBackend security enforcementの代わりにしない。
- 次の表をPhase 1のRole × Operation × Scopeとする。Backend APIが表の操作可否とデータ範囲を最終判定する。Frontendは同じrole条件でメニュー・画面アクセス・操作ボタンを表示制御する。

| 機能 | 操作 | staff | manager | admin | データ範囲 |
| --- | --- | --- | --- | --- | --- |
| 顧客 | 一覧・検索 | 可 | 可 | 可 | staff: 自担当顧客のみ。manager・admin: 全顧客 |
| 顧客 | 詳細閲覧 | 可 | 可 | 可 | staff: 自担当顧客のみ。manager・admin: 全顧客 |
| 顧客 | 登録 | 可 | 不可 | 可 | staff: 登録顧客の`owner_user_id`を認証済み本人にする。admin: 顧客登録可 |
| 顧客 | 編集 | 可 | 不可 | 可 | staff: 自担当顧客のみ。admin: 全顧客 |
| 顧客 | 論理削除 | 不可 | 不可 | 可 | admin: 全顧客 |
| 活動履歴 | 一覧閲覧 | 可 | 可 | 可 | staff: 自担当顧客のみ。manager・admin: 全顧客 |
| 活動履歴 | 登録 | 可 | 不可 | 可 | staff: 自担当顧客のみ。admin: 全顧客 |
| レポート | 売上推移閲覧 | 不可 | 可 | 可 | manager・admin: 全社売上 |
| レポート | 顧客分類閲覧 | 不可 | 可 | 可 | manager・admin: 全社の有効顧客 |
| レポート | 営業担当者別実績閲覧 | 不可 | 可 | 可 | manager・admin: 全担当者 |
| ユーザー管理 | ユーザー参照 | 不可 | 不可 | 可 | admin: 全ユーザー |
| ユーザー管理 | role変更 | 不可 | 不可 | 可 | admin: ユーザーのrole変更 |

ユーザー新規登録とrole以外のユーザー情報変更は現行要件・APIにないため、この表の対象外とする。将来、複数managerごとに担当staffを分ける場合はmanagerとstaffの関係を表すデータモデルを別途設計する。Phase 1ではその関係をschemaに追加しない。

## セキュリティ・監査

- 顧客情報の保存時は暗号化対象項目を暗号化し、暗号鍵をDBに保存しない。
- SQLインジェクション対策としてパラメータ化クエリを使用する。
- 認証・認可、個人情報の参照・変更・削除、権限変更をaudit_logsへ記録する。
- アクセスログは最低1年間保存し、一般ユーザーは閲覧できない。
- 個人情報保護法への適合確認を受入工程で実施する。

## 性能・可用性設計

- 顧客検索は本番相当データで、通常負荷時の95パーセンタイルが3秒以内であることを受入条件とする。
- 50同時ユーザーで主要操作がエラー率1%未満となることを負荷試験で確認する。
- DB接続プール、ページング、検索インデックスを使用する。
- 平日9:00〜18:00の稼働率99%以上を、監視サービスの稼働記録で測定する。
- メンテナンスは実施日時、影響範囲、終了予定を少なくとも24時間前に利用者へ通知する。
- バックアップ、ヘルスチェック、アプリケーションログ、DBログを運用環境に設定する。

## 既存システムとの互換性

Phase 1では外部システムとのリアルタイム連携は実装しない。既存の顧客データは、項目マッピングと検証を行ったうえでPostgreSQLへ移行できる形式を定義する。外部システム連携の方式はPhase 2で別途決定する。

## テスト方針

- Backend: バリデーション、業務ロジック、認証・認可、暗号化、監査ログ、APIの単体・統合テスト
- Frontend: 主要画面、入力エラー、権限別表示のコンポーネントテスト
- E2E: Playwrightでログイン、顧客CRUD、検索、活動履歴、レポート、権限拒否を確認
- 非機能: 検索性能、50同時アクセス、稼働監視、メンテナンス通知を検証

## 設計上の決定事項

| 項目 | 決定 |
| --- | --- |
| アーキテクチャ | React / Express / PostgreSQLの3層構成 |
| API | REST、`/api/v1`、JSON |
| 認証 | JWT、期限付きトークン |
| 顧客削除 | 論理削除 |
| Phase 1の外部連携 | 実装しない。既存データは移行対象として扱う |
| 権限 | staff、manager、adminの3ロール |
| E2E | Playwright |

## 実装開始条件

以下がレビューで承認されるまで実装を開始しない。

- この文書のAPI、データ項目、権限マトリクス
- 暗号化対象、鍵管理、監査ログ保存期間
- 性能・可用性の測定方法と合格基準
- 既存データの移行元項目と移行手順
- 本番クラウド、監視、バックアップ、通知手段

---

**注意**: この設計計画書は、02-planning-requirement.mdの要求を変更せず、実装と検証の判断基準を定義するものです。
