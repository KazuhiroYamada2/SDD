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
| `GET /api/v1/users`、`PATCH /api/v1/users/:id/role` | ユーザー・権限管理 | F-12〜F-14 |

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

## 顧客edit API設計

`PATCH /api/v1/customers/:id`は部分更新を行い、HTTP 200で更新後のCustomer read共通DTOを返す。pathの`id`は既存UUID validationを使い、形式不正はHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "id must be a UUID." }`とする。

request bodyで許可するfieldは次のとおりとする。

| field | JSON型 | validation・更新規則 |
| --- | --- | --- |
| `name` | string | trim後に空でないこと。`null`不可。顧客登録と同じvalidationを使う |
| `name_kana` | string \| null | stringはtrimする。空文字または`null`はDBの`null`へ更新する |
| `email` | string \| null | stringはtrimし、非空なら顧客登録と同じemail形式を検証する。空文字または`null`はDBの`null`へ更新する |
| `phone` | string \| null | stringはtrimする。空文字または`null`はDBの`null`へ更新する |
| `address` | string \| null | stringはtrimする。空文字または`null`はDBの`null`へ更新する |
| `category` | string \| null | stringはtrimする。空文字または`null`はDBの`null`へ更新する |

- `id`、`owner_user_id`、`created_at`、`updated_at`、`deleted_at`およびその他の未知fieldは許可しない。これらを含む場合はHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "Request body contains an unknown or non-editable field." }`を返す。
- request bodyがJSON objectでない場合は既存契約の`Request body must be a JSON object.`、空objectの場合は`At least one editable customer field is required.`を使用する。各fieldの型・形式errorは既存のHTTP 400 `VALIDATION_ERROR`形式と顧客登録messageを再利用する。
- 省略fieldはUPDATE対象に含めず現在値を維持する。Repositoryは許可済みfieldだけからparameterized UPDATEを構築し、`owner_user_id`をUPDATE列へ含めない。`created_at`は変更せず、`updated_at = NOW()`とし、`deleted_at IS NULL`を更新条件へ含める。更新後の全Customer read DTO列を`RETURNING`で返す。
- middleware/service順序はAuthentication → `authorizeOperation('customer.edit')` → path/body validation → active customer取得 → `isCustomerInScope(authenticatedUser, owner_user_id)` → updateとする。managerはcustomer lookup前に403、staff scope外・customer不存在・logical deletedは同じHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`とする。Repositoryはroleを知らない。
- FrontendはAppのscreen stateへcustomer editを追加する。Customer detailで取得済みのCustomer read DTOをform初期値に使い、保存時は許可fieldだけをPATCHする。成功後はdetail screenへ戻りproduction `GET /api/v1/customers/:id`を再実行する。キャンセルはPATCHせずdetailへ戻る。staff/adminには編集導線を表示しmanagerには表示しないが、owner一致をFrontendでsecurity判定しない。403を401へ変換せずauth stateを維持する。

## 顧客logical delete API設計

- `DELETE /api/v1/customers/:id`はbodyを受け取らず、成功時はHTTP 204 No Contentを返す。response bodyは返さない。
- middleware/service順序はAuthentication → `authorizeOperation('customer.delete')` → path UUID validation → active customer取得 → logical deleteとする。staff・managerはpath validationやcustomer lookup前に403、adminだけを許可する。
- Repositoryはroleを知らず、active customer取得後にparameterized SQLで`deleted_at = NOW(), updated_at = NOW()`を設定する。物理`DELETE`文は使用しない。更新条件へ`id = $1 AND deleted_at IS NULL`を含める。
- customer不存在と既にlogical deletedのcustomerは、どちらもHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`とする。logical delete queryが対象0件となった場合も同じ404とする。
- 削除後は既存の通常read/update条件によりlist/searchから除外し、detail・edit・再DELETEを404とする。
- FrontendはAppのscreen stateへ削除確認画面を追加する。adminのCustomer detailだけに削除導線を表示し、staff・managerには表示しない。確認画面の削除実行はproduction DELETEを呼び、204後は選択customer IDをclearしてCustomer listへ戻る。キャンセルはDELETEせずdetailへ戻る。API errorを既存方式で表示し、403でauth stateを破棄しない。

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

### Users API設計

- `GET /api/v1/users`は`users.read`を適用し、adminだけを許可する。HTTP 200で`[{ "id": "<uuid>", "email": "...", "role": "staff|manager|admin", "active": true }]`を返す。`password_hash`、timestamp等は公開しない。`users.is_active`を`active`へ写し、active・inactiveの両方を`ORDER BY email ASC, id ASC`で取得する。pagination、検索、filterは追加しない。
- `PATCH /api/v1/users/:id/role`は`users.changeRole`を適用し、adminだけを許可する。Authentication → operation Authorization → UUID/body validation → resource処理の順とし、staff・managerの拒否時はuser lookupとupdateを行わない。bodyはroleだけを持つJSON objectとし、roleは`staff`、`manager`、`admin`のいずれかに限定する。不正時は既存のHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "<入力項目に対応する説明>" }`形式を使う。
- role変更成功時はHTTP 200で更新後のUser DTOを返す。user不存在はHTTP 404 `{ "code": "USER_NOT_FOUND", "message": "User was not found." }`とする。inactive userもrole変更対象にできる。
- 認証済みadminが自分自身へ現在と異なるroleを指定した場合はHTTP 409 `{ "code": "SELF_ROLE_CHANGE_NOT_ALLOWED", "message": "An administrator cannot change their own role." }`とする。同じroleの指定はDB updateを行わないno-opとしてHTTP 200を返す。
- role変更Repositoryはtransactionを開始し、`role = 'admin' AND is_active = TRUE`の行を`id ASC FOR UPDATE`で決定的な順序にlockしてから対象userを`FOR UPDATE`で取得する。active adminを非adminへ変更した結果active adminが0人になる場合はrollbackし、HTTP 409 `{ "code": "LAST_ACTIVE_ADMIN_REQUIRED", "message": "At least one active admin must remain." }`へ変換する。このlock順序により同時降格を直列化する。Repositoryはrequest userのroleを知らず、operation AuthorizationはRouter/Serviceで行う。
- role変更後もJWTへrole claimを追加しない。次requestのAuthenticationが`users`から現在roleを再取得する既存方式を維持する。
- Frontendはmemory上の`authentication.user.role`がadminの場合だけユーザー管理入口と画面を描画する。画面はemail、active/inactive、現在role、role select、変更操作を表示し、自分自身のselect・変更操作は無効化できる。成功後は`GET /api/v1/users`を再実行する。409の最後のadmin判定をFrontendへ実装せずBackend messageを表示し、403・409でAuthenticationを破棄しない。React Routerは追加しない。

## セキュリティ・監査

### Customer field encryption

| 区分 | Field | 保存・利用方針 |
| --- | --- | --- |
| 暗号化 | `name_kana`、`email`、`phone`、`address` | applicationでAES-256-GCM暗号化後にDBへ保存し、認可されたreadで復号する |
| 平文 | `name` | `ILIKE '%query%'`と`name_asc`・`name_desc`を維持するため、Phase 1では暗号化しない |
| 平文 | `category`、`owner_user_id` | 既存のfilterとsecurity scopeをDBで適用する |
| 平文 | `id`、`created_at`、`updated_at`、`deleted_at` | 識別、sort、logical deleteの既存契約を維持する |

- Node.js標準`crypto`によるapplication-level encryptionを使用し、不要なcrypto dependencyや独自暗号方式を追加しない。algorithmはAES-256-GCM、鍵は32 bytes、IVは値ごとに`randomBytes`等で生成するcryptographically secure random 12 bytes、authentication tagは16 bytesとする。
- AADはUTF-8文字列`customer:v1:<field-name>`とし、format versionとCustomer field nameを認証対象へ含める。これにより、たとえばemailのciphertextをphoneとして復号しようとした場合に失敗させる。Phase 1ではCustomer IDをAADへ含めない。
- non-null値は`enc:v1:<key-id>:<iv-base64>:<tag-base64>:<ciphertext-base64>`のenvelopeで既存Customer columnへ保存する。delimiter、要素数、prefix、version、key ID、Base64各要素を厳密に検証してから復号する。T-107では既存columnがvalidation上限のplaintextを格納したenvelopeに十分な長さか確認し、不足する場合だけmigrationで拡張する。`null`はDBの`NULL`を維持する。
- application設定はcurrent key IDと、key IDから32-byte keyへのmappingを持つkey ringで構成する。productionの値はdeployment環境のsecret管理機構から環境変数等でinjectし、DB、source code、Git repositoryへ保存しない。特定のcloud secret productはPhase 1で固定しない。testはtest専用keyを使い、production keyを共有しない。
- config読込時に、暗号設定の存在、current key ID、current keyのkey ring内存在、全keyの32-byte長、設定形式を検証する。不正時はHTTP serverの起動前にfailさせ、暗号化なしのfallbackを禁止する。鍵値をlog、error、test outputへ出力しない。
- encryptは常にcurrent key IDを使用し、decryptはenvelopeのkey IDでkey ringを選択する。read時の自動再暗号化は行わない。key rotationは明示的なone-shot re-encryption migrationで実施し、そのkey IDを持つciphertextが残る間は旧keyをkey ringから削除しない。
- 既存plaintextはactive・logical deletedを問わずone-shot offline migrationの対象とする。application停止、migration、対象4 fieldのplaintext残存確認、新application起動の順を基本とする。steady stateのRepositoryはplaintextとciphertextの混在を許容せず、read時にplaintextを検出した場合も自動暗号化やplaintext返却を行わずfail closedとする。migrationは正しい`enc:v1` envelopeを識別し、二重暗号化しない。
- POSTはvalidation・正規化後、Repositoryへの保存前に4 fieldのnon-null値を暗号化する。PATCHはrequestに含まれる暗号化対象fieldだけを暗号化し、省略fieldをdecrypt・re-encryptしない。明示的な`null`はDBの`NULL`として保存する。create・edit responseは保存後のauthorized DTOとしてplaintextを返す。
- detailではAuthentication、operation Authorization、DB scope/resource判定、scope Authorization、decrypt、DTO生成の順とする。staff scopeは暗号化対象を取得・復号する前に`owner_user_id`を使ってSQLで限定し、scope外を404 `CUSTOMER_NOT_FOUND`とする。manager・adminは既存どおり全active Customerをreadできる。一覧・検索も`deleted_at IS NULL`、staff owner scope、query/filterをSQLで適用してから返却対象行だけを復号する。
- 公開Customer DTOは既存契約を維持し、暗号化対象fieldをplaintextで返す。envelope、IV、tag、key IDはDTOへ追加しない。暗号化対象fieldをPhase 1の検索・filter・sortへ追加せず、平文の`name`、`category`、`owner_user_id`を使う既存Customer SQLは変更しない。deterministic encryption、blind index、order-preserving encryption、plaintext shadow columnは採用しない。
- unknown key ID、malformed envelope、不正なIV・tag・ciphertext、authentication tag mismatch、decrypt failureはfail closedとする。APIは既存のgeneric internal server errorへ変換し、crypto内部情報を公開しない。logには鍵、Customer plaintext、完全なciphertext envelopeを含めない。

### その他のセキュリティ・監査

- SQLインジェクション対策としてパラメータ化クエリを使用する。
- 認証・認可、個人情報の参照・変更・削除、権限変更をaudit_logsへ記録する。
- アクセスログは最低1年間保存し、一般ユーザーは閲覧できない。
- 個人情報保護法への適合確認を受入工程で実施する。

## 性能・可用性設計

- 顧客検索はPhase 1の性能受入用データで測定する。このdatasetはCustomer 100,000件（active 95,000件、logical deleted 5,000件）とし、100 usersへ決定的に均等分布させる。categoryは20種類と`NULL`で構成し、全体の約10%を`NULL`、残りを20種類へおおむね均等に分布させる。nameには実個人情報を含まない決定的なsynthetic dataを使用する。この件数と分布はT-602/T-603用の再現可能なAcceptance modelであり、production実績件数を表すものではない。
- nameの`ILIKE '%query%'`には、active customerに対してno-hit 0件、low-hit約100件（約0.1%）、high-hit約10,000件（約10%）となる決定的な検索語を用意する。dataset生成後にSQLで実ヒット件数を確認し、測定結果とともに記録する。
- T-602はconcurrency 1で逐次実行する。scenarioごとに10 requestsをwarm-upとして除外し、その後の100 requestsについて、HTTP request開始からresponse body受信完了までのwall-clock時間をmsで記録する。fixture生成、DB reset、login、token取得は測定に含めない。
- 測定値を昇順に並べ、p95はnearest-rank方式の95番目、medianは中央2値の平均として算出する。default list、name no-hit・low-hit・high-hit、category filter、owner filter、queryとcategoryのAND、name降順、created_at降順、deep pagination、staff owner scopeを個別に測定し、各scenarioのp95が3,000ms以下であることを受入条件とする。全scenarioを混ぜたp95では判定しない。
- deep paginationは現行のOFFSET方式を維持し、active 95,000件に対して`page_size=100`、最終有効ページの`page=950`を測定する。T-602ではpagination方式を変更しない。
- T-602ではdefault list、staff scope、name high-hit、deep paginationについて`EXPLAIN (ANALYZE, BUFFERS)`を取得し、HTTP応答時間とは分けて記録する。通常のB-tree name indexが前後wildcardの部分一致へ直接利用されないことも確認するが、測定結果を理由にindexやproduction SQLを変更しない。
- T-603はT-602と同じ100,000 Customerを使用し、1 waveにつき50 HTTP requestsをbarrierから同時に解放する。2 wavesをwarm-upとして除外し、その後の20 waves、scenarioごとに1,000 requestsを測定する。login処理は測定に含めず、事前取得したadminまたはstaff tokenを再利用する。
- T-603の必須scenarioはdefault list、name low-hit・high-hit、category filter、queryとcategoryのAND、created_at降順、`page=950`・`page_size=100`のdeep pagination、staff owner scopeとする。各requestの開始からresponse body受信完了までを個別に測り、scenarioごとにmedian、nearest-rank方式のp95・p99、maxを算出する。
- T-603は各scenarioでHTTP 200とpagination response schemaの成功率100%、期待外status 0件、p95が3,000ms以下の場合に合格とする。この基準はN-02のエラー率1%未満をより厳しく満たす。全scenarioを混ぜたp95では判定しない。
- HTTP concurrency 50に対して`pg.Pool` max 10を維持し、benchmark processから`totalCount`、`idleCount`、`waitingCount`を観測する。pool待ちを含むAPI wall-clock時間、T-602で取得したSQL execution time、request errorを区別する。測定終了後にwaiting 0かつ全connectionがidleへ戻ることを確認し、T-603の結果だけを理由にpool値を変更しない。
- DB接続プール、ページング、検索インデックスを使用する。
- 平日9:00〜18:00の稼働率99%以上を、監視サービスの稼働記録で測定する。
- メンテナンス通知、監視、backup、restore、incident responseは、次節のPhase 1 production運用設計に従う。

## Phase 1 production運用設計

### AWS architecture・network

- primary regionはAWS `ap-northeast-1`とする。FrontendはAmazon S3とAmazon CloudFront、BackendはApplication Load Balancer配下のAmazon ECS on Fargate、DatabaseはMulti-AZのAmazon RDS for PostgreSQL 16で構成する。productionにself-hosted PostgreSQLを採用しない。
- CloudFrontとALBでTLSを終端し、HTTPはHTTPSへredirectする。BackendとRDS間もTLSを必須とし、AWS RDS CA certificateによるserver certificate検証を行う。productionでTLS validationを無効化する設定は禁止する。
- ECS Taskは`NODE_ENV=production`で起動する。`DATABASE_URL`、`JWT_SECRET`、`CUSTOMER_ENCRYPTION_CURRENT_KEY_ID`、`CUSTOMER_ENCRYPTION_KEYS_JSON`を必須とし、欠落または不正時はHTTP server起動前にfailさせる。development用fallbackでproduction serverを起動しない。
- PostgreSQL connection poolはT-601の`pg.Pool` max 10を維持する。connection timeout等はT-007で推測せず、T-702のproduction configuration実装時にTLSとともに確認する。schema migrationをapplication起動時に自動実行しない。

### Secret management・rotation

- production secretはAWS Secrets Managerで管理し、ECS Task definitionのsecret injectionを使って環境変数interfaceへ渡す。`.env`はlocal development専用であり、productionのdeployment sourceにしない。secret値をGit、source code、Docker image、DB、CloudWatch Logs、examples文書へ保存・出力しない。
- DB credentialとJWT secretの定期rotationは90日、Customer encryption current keyは180日とする。security incidentまたは漏えい疑い時は即時rotationする。JWT secret rotation時は既存の30分tokenが無効になることを許容し、maintenanceとして利用者へ案内する。
- Customer encryption keyは、新keyをkey ringへ追加し、current keyを切り替え、one-shot re-encryption migrationを実行する。旧key IDを使用するciphertextが0件であることを確認してから旧keyを削除する。RDS backupにCustomer encryption keyを格納せず、Secrets ManagerとRDS backupを別管理にする。

### Backup・restore

- RDS automated backupとPoint-in-Time Recoveryを有効にし、retentionを7日とする。重要release、schema migration、Customer migrationの直前にはmanual RDS snapshotを取得し、14日間保持する。運用procedureに従い、保持期間経過後に削除できる。
- Production RDSはAWS KMSによるat-rest encryptionを必須とし、automated backupとsnapshotも暗号化状態を維持する。accessはproduction運用管理者の最小権限に限定する。cross-region backupはPhase 1の必須要件にしない。
- restore drillは四半期に1回行う。productionと分離したtemporary RDS instanceまたはdatabaseへ復元し、restore成功、schema、主要table、FK、代表row count、Customer暗号化fieldの`enc:v1` envelope、Customer keyを使ったauthorized decryptを確認する。検証後はtemporary restore環境を削除する。production DBへrestore testを直接実行しない。
- RPOは5分以内、RTOは60分以内をPhase 1の目標とする。T-702ではbackup/restore procedureを再現可能に検証するが、local PostgreSQLのrestore時間だけでAWS productionのRTO達成を保証したとは扱わない。
- deploymentはsnapshotまたはbackupの確認、schema migration、migration結果検証、application deploymentの順とする。migration失敗時はapplication rolloutを続行しない。

### Monitoring・alert

- Amazon CloudWatchで、ECS task desired/running count、task restart、CPU、memory、ALB target health、ALB 4xx/5xx、response latencyを監視する。RDSはCPU、`DatabaseConnections`、`FreeableMemory`、`FreeStorageSpace`、read/write latency、RDS eventsを監視する。
- applicationはHTTP 5xx、authentication/authorization errorの増加傾向、unexpected process termination、migration failure、backup failureを監視対象にする。logへDB password、JWT secret、Customer encryption key、credentialを含む完全な`DATABASE_URL`、plaintext PII、完全なciphertext envelopeを出力しない。
- 重大alarmはCloudWatch AlarmからAmazon SNSを経由して運用担当メールへ送る。Backend available task 0、ALB unhealthy、継続的なHTTP 5xx、DB unavailable、DB storage critical、automated backup failure、restore verification failureを含める。個別thresholdはCloudWatch設定Taskで確定し、PagerDuty等はPhase 1の必須要件にしない。

### Maintenance・incident response

- 利用者影響を伴う予定maintenanceは原則3営業日前までに通知し、開始1時間前に再通知する。通知には日時、expected impact、expected recovery time、問い合わせ先を含め、運用メールまたは既存案内channelを使う。緊急maintenanceは3営業日前の規則を適用せず、決定後できるだけ早く通知する。新しい通知UIはT-007で作らない。
- 重大incidentの検知後15分以内に一次切り分けを開始する。alarm、incident認定、影響確認、application・DB・networkの切り分け、rollbackまたはrestore判断、service recovery、data reconciliation、利用者・関係者報告、事後分析を基本flowとする。
- DB破損・誤更新ではPITRまたはsnapshot restoreを候補とする。production DBへ即時上書きせず、temporary restore、data確認、recovery判断の順に進める。automated backup failureはalert対象、restore drill failureは未解消incidentとし、原因解消後に次の成功を確認する。

## 既存システムとの互換性

Phase 1では外部システムとのリアルタイム連携は実装しない。既存の顧客データは、T-005で承認した演習用Excelから項目mappingと検証を行い、T-701のoffline migrationでPostgreSQLへ移行する。外部システム連携の方式はPhase 2で別途決定する。

### Excel source schema

ExcelはOffice Open XML形式で、文字列はUnicodeとして扱う。T-701は、承認したfileの「概要」「既存顧客データ」「担当者マスタ」「カテゴリマスタ」「データ辞書」「演習ケース一覧」の6 sheetが存在し、必須headerが一致することを処理前に確認する。sheet・headerの欠落や重複はrecord rejectではなくdataset errorとして処理を開始しない。

「既存顧客データ」のsource schemaは次のとおりとする。

| Source field | 型 | null | 意味・検証 |
| --- | --- | --- | --- |
| 顧客番号 | 文字列 | 不可 | trim後のsource識別子。全件pre-scanで一意性を確認 |
| 顧客名 | 文字列 | 不可 | trim後に非空 |
| 顧客名カナ | 文字列 | 可 | 空欄は`null` |
| メールアドレス | 文字列 | 可 | 空欄は`null`、non-nullは既存email validation |
| 電話番号 | 文字列 | 可 | 空欄は`null` |
| 住所 | 文字列 | 可 | 空欄は`null` |
| 顧客区分コード | 文字列 | 可 | 空欄またはA/B/C/D |
| 担当者メール | 文字列 | 不可 | 担当者マスタとcurrent usersへの完全一致key |
| 登録日時 | Excel日時 | 不可 | `Asia/Tokyo`のwall-clock日時として解釈可能 |
| 更新日時 | Excel日時 | 不可 | 登録日時以上 |
| 削除フラグ | 数値 | 不可 | 0または1 |
| 削除日時 | Excel日時 | 条件付 | flag 1では必須、flag 0では空欄、登録日時以上 |
| 備考 | 文字列 | 可 | 移行対象外。validationやreject logへ転記しない |

担当者マスタは担当者メール、表示名、role、active、備考を持つ。mappingには担当者メールとactiveだけを使い、表示名の曖昧一致を行わない。カテゴリマスタは顧客区分コードとTarget categoryを持つ。「演習ケース一覧」はacceptance用の期待値であり、migration入力としてCustomerへ保存しない。

### SourceからCustomerへのmapping

| Source | Target | 変換・既定値 | null / validation | 暗号化 | reject条件 |
| --- | --- | --- | --- | --- | --- |
| 顧客番号 | `id` | source値は照合だけに使い、UUID v4を新規採番 | Sourceは必須・trim後一意 | なし | 欠落、同一IDの複数行。重複IDを持つ全行をreject |
| 顧客名 | `name` | trim後の値 | 必須、空欄不可 | なし | 欠落または既存Customer validation違反 |
| 顧客名カナ | `name_kana` | trim、空欄は`null` | 任意 | AES-256-GCM | 型・既存validation違反 |
| メールアドレス | `email` | trim、空欄は`null` | 任意、non-nullはemail形式検証 | AES-256-GCM | email形式不正または既存validation違反 |
| 電話番号 | `phone` | trim、空欄は`null` | 任意 | AES-256-GCM | 型・既存validation違反 |
| 住所 | `address` | trim、空欄は`null` | 任意 | AES-256-GCM | 型・既存validation違反 |
| 顧客区分コード | `category` | 空欄は`null`。A→法人、B→個人、C→重点、D→休眠 | 任意、カテゴリマスタ完全一致 | なし | 未知のnon-nullコード、マスタの重複対応 |
| 担当者メール | `owner_user_id` | trim後、担当者マスタ→`users.email`→`users.id` | 必須、一意なactive user | なし | 欠落、inactive、マスタ・users不存在、複数対応 |
| 登録日時 | `created_at` | `Asia/Tokyo`からUTCへ変換 | 必須、日時として解釈可能 | なし | 欠落、invalid date |
| 更新日時 | `updated_at` | `Asia/Tokyo`からUTCへ変換 | 必須、`created_at`以上 | なし | 欠落、invalid date、時系列矛盾 |
| 削除フラグ・削除日時 | `deleted_at` | flag 0→`null`、flag 1→日時を`Asia/Tokyo`からUTCへ変換 | flag 0/1、flag 1の日時は`created_at`以上 | なし | flag/date不整合、invalid date、時系列矛盾 |
| 備考 | 対象外 | 保存しない | なし | なし | なし |

Customerにmigration実行日時を保存しない。sourceの登録・更新日時を維持する。Source顧客番号もCustomer列には保持せず、移行台帳とreject結果だけに保持する。

### Validation・reject

最初に全40行を読み、trim後のSource顧客番号で重複を検出する。重複groupの全行を`DUPLICATE_SOURCE_ID`としてrejectし、merge、後勝ち、上書きを行わない。その後、各recordを正規化し、required、型、email、日時、delete state、owner、category、既存Customer validationの順で検証する。複数違反を検出できる場合もreject結果には全reason codeを保持し、集計用primary reasonはこの順序で決める。source IDの重複は他のrecord validationより先にprimary reasonとする。

| Reason code | 条件 |
| --- | --- |
| `DUPLICATE_SOURCE_ID` | trim後の顧客番号がsource内で複数行 |
| `SOURCE_ID_REQUIRED` | 顧客番号が欠落 |
| `NAME_REQUIRED` | 顧客名が欠落 |
| `OWNER_EMAIL_REQUIRED` | 担当者メールが欠落 |
| `OWNER_MAPPING_FAILED` | 担当者がinactive、マスタ・usersに存在しない、一意に解決できない |
| `UNKNOWN_CATEGORY` | 未知または一意に解決できないnon-nullカテゴリコード |
| `INVALID_EMAIL` | non-null emailが既存形式検証に不合格 |
| `INVALID_DATE` | 日時として解釈できない、または日時の順序が不正 |
| `DELETE_STATE_INCONSISTENT` | flagが0/1以外、flag 1で削除日時なし、flag 0で削除日時あり |
| `CUSTOMER_VALIDATION_FAILED` | その他の既存Customer validation違反 |
| `SOURCE_CHANGED_AFTER_MIGRATION` | 同じdataset/source IDが移行済みで、正規化済みsource内容のfingerprintが異なる |

reject recordの論理形式は`dataset_id`、Source顧客番号、Excel sheet名、row番号、primary reason code、全reason code、PIIを含まないreason summaryとする。Source顧客番号以外のplaintext PII、暗号鍵、完全なciphertext envelopeは含めない。

### Batch transaction・retry

T-701は処理前に全recordの構造・重複・data validationとmaster mappingを行い、valid recordだけを設定可能なbatchへ分割する。batch sizeの既定値は100件とし、CLIの`--batch-size`で1～10,000件の範囲を指定できる。各batchは次の順序で1 transactionにする。

1. 未移行であることを移行台帳で確認し、target UUID v4を採番する。
2. `name_kana`、`email`、`phone`、`address`のnon-null値をT-107のcurrent keyで暗号化する。
3. Customer rowと、dataset/source IDからtarget UUIDへの移行台帳recordを同じtransactionでinsertする。
4. batch内の全insertと検証が成功した場合だけcommitする。

DB、暗号化、その他のsystem errorではbatch全体をrollbackし、data rejectとして処理を続行しない。修正後は失敗batchを再実行でき、commit済みbatchは維持する。Customer tableへplaintextをcommitする中間状態は禁止する。

T-701は、運用者が指定する安定した`dataset_id`とSource顧客番号を一意keyにした移行台帳を実装する。台帳はtarget UUID、Source row fingerprint、source row番号、commit日時を保持するが、plaintext PIIは保持しない。Customer insertと台帳insertを同じtransactionに含める。同一dataset・source ID・fingerprintのretryは既存target UUIDを確認して`already_migrated`とし、新規UUIDやCustomerを追加しない。移行済みsourceのfingerprintが変わっている場合は`SOURCE_CHANGED_AFTER_MIGRATION`として自動更新せず、運用判断を要求する。reject recordは台帳へ成功として登録しないため、sourceを修正した後に同じdataset IDで再検証できる。

物理schemaは`customer_migration_ledger`とし、`dataset_id`、`source_customer_id`、`customer_id`、`source_fingerprint`、`source_row_number`、`migrated_at`を保持する。primary keyは`(dataset_id, source_customer_id)`、`customer_id`はuniqueかつ`customers.id`への外部key、fingerprintは正規化済みsource内容のSHA-256 hexとする。

### Reconciliation・security

初回の承認済みsampleでは、`source_total = 40`、`valid = 31`、`rejected_records = 9`、`target_insert = 31`を期待値とする。rejectは8ケースだが、Source顧客番号の重複1 groupに属する2行をともにrejectするため、reject recordは9件になる。valid 31件の内訳はactive 28件、logical deleted 3件である。

実行ごとに次を機械的に照合する。

- `source_total = inserted + already_migrated + rejected_records`
- 初回は`inserted = 31`、`already_migrated = 0`、`rejected_records = 9`
- 移行台帳の成功件数とtarget UUIDの存在、実行前後のCustomer件数差分
- primary reason別reject件数、duplicate group数・record数、owner/category mapping failure件数
- 挿入した暗号化対象fieldのnon-null値がすべてfieldに対応するvalidな`enc:v1` envelopeであり、plaintext残存が0件であること
- `NULL`がDB `NULL`のままで、active 28件・logical deleted 3件の状態が維持されること

logと集計には件数、dataset ID、row番号、Source顧客番号、reason code、target UUIDだけを使用する。Customerのplaintext PII、暗号鍵、完全なciphertext envelopeは出力しない。source Excel自体もsecretと同等にアクセス制御し、migration終了後の保管・削除は運用手順に従う。

## T-609 Maintenance notification physical design

Phase 1の利用者通知はAWS SDK for JavaScript v3のSES v2 clientを使うplain text emailとする。ProductionはECS Task Roleを使用し、`AWS_REGION=ap-northeast-1`とSES verified senderの`MAINTENANCE_FROM_EMAIL`を必須にする。Frontend UIとbusiness APIは追加せず、offline運用CLIでevent作成・phase配信を行う。

`maintenance_events`はUUID、PLANNED/EMERGENCY、開始・復旧予定のtimestamptz、impact、contact、created_atを保持する。`maintenance_notification_deliveries`はevent、INITIAL/REMINDER/EMERGENCY、recipient user、PENDING/SENT/FAILED、provider message ID、attempted/sent時刻、安全なfailure codeを保持し、event・phase・recipientを主キーとする。recipient emailと本文はdelivery tableへ複製しない。

PLANNEDはINITIALとREMINDER、EMERGENCYはEMERGENCYだけを許可する。送信時点のactive users全員を対象にし、inactive userとcustomers.emailを除外する。本文はeventから決定的に生成し、日時をAsia/Tokyoで表示する。3営業日前と1時間前の自動schedulerは作らず、運用者がrunbookどおりCLIを実行し、実際のattempted_at・sent_atを証跡とする。

Serviceはdeliveryを短いDB操作でPENDINGへclaimしてからtransaction外でSES送信し、成功時SENT、失敗時FAILEDと`SES_SEND_FAILED`だけを保存する。recipientごとの失敗は後続送信を止めない。SENTは再実行時にskipし、FAILEDだけをretryする。PENDINGは送信結果が不明なため自動再送せず、SES記録との照合後に運用判断する。CLIは集計だけを出し、failedがあればnon-zero終了する。

schema migrationは`003_create_maintenance_notifications.sql`としてoffline適用し、Production起動時に自動実行しない。snapshot、migration、validation、rolloutの順序を維持する。運用手順は`docs/operations/maintenance-notification.md`とし、failure未解消時はT-607のincident経路へescalationする。

## T-607 Health・monitoring physical design

Backendは認証不要の`GET /health/live`と`GET /health/ready`を提供する。livenessはDBへqueryせずHTTP 200 `{ "status": "ok" }`を返す。readinessは`SELECT 1`だけを実行し、成功時はHTTP 200 `{ "status": "ready" }`、DB未設定・接続失敗時は詳細を隠してHTTP 503 `{ "status": "unavailable" }`を返す。既存`GET /health`は互換性のため維持する。ALB Target Groupは`/health/ready`を使用し、success codeは200とする。

Production monitoring resourceは`infra/monitoring.yaml`のCloudFormation stackで管理する。stack deployment regionを`ap-northeast-1`とし、環境名、ECS cluster/service、ALB/Target Group full name、RDS instance identifier、通知先emailをparameterで受け取る。secretはparameterに含めない。既存Target Groupはこのstackで再作成せず、health check pathとcodeはapplication deployment側で設定する。

CloudWatch AlarmのPhase 1初期値は、ECS CPU・memory 80%が5分、ALB healthy target 0が2分、unhealthy target 1以上が2分、target 5xxが5分間に10件、平均response 2秒が5分、RDS CPU 80%・connections 80・freeable memory 256 MiB・read/write latency 100 msが各5分、free storage 10 GiB以下が10分とする。全thresholdはCloudFormation parameterで変更可能にする。ALARMとOKへの遷移をSNSへ通知し、INSUFFICIENT_DATA actionは設定しない。ただし`HealthyHostCount`の欠測はavailable target 0の見落としを防ぐためbreachingとして扱う。

SNS Topicにはdeployment時に指定した運用担当emailをsubscriptionし、confirmationとtest notificationを必須とする。Production RDS instanceの有効なevent categoryである`availability`、`failure`、`backup`を`AWS::RDS::EventSubscription`から同じSNS Topicへ送る。restore drillの手動失敗は自動alarmの対象にできないため、運用者が同じSNS Topicまたは承認済みincident通知経路へescalationする。

監視・incident対応は`docs/operations/production-monitoring.md`、backup・四半期restore drillは`docs/operations/production-backup-restore.md`を正本手順とする。Health、CloudWatch Logs、Alarm、SNS、incident記録へsecret、credential、plaintext PII、完全なciphertext envelopeを出力しない。AWS resource deploymentはlocal Acceptanceに含めず、CloudFormationのYAML parse、required parameter、SNS/Alarm wiring、RDS EventSubscriptionをstatic testで検証する。

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
- T-007で承認したAWS本番構成、監視、backup、restore、通知、incident response

---

**注意**: この設計計画書は、02-planning-requirement.mdの要求を変更せず、実装と検証の判断基準を定義するものです。
