# 企画・要件定義工程

このファイルは、仕様駆動開発の**企画・要件定義工程**で作成される仕様書です。

## 仕様駆動開発の「4 つの原則」に基づく運用

この仕様書は、以下の「4 つの原則」に基づいて管理されます：

1. **仕様は"生きたドキュメント"**：プロジェクトとともに進化します
2. **仕様は"信頼できる唯一の情報源"**：すべてのメンバーがこの仕様を参照します
3. **仕様は"変更と反復が前提"**：変更履歴を記録しながら更新します
4. **AIでコストを抑える**：AIを活用して仕様の詳細化やレビューを行います

## プロジェクト概要

### 目的

営業担当者が増えたため、Excelでの顧客管理が限界に達しています。
リアルタイムで情報を共有できるシステムが必要です。

詳細は、[01-principle-definition.md](./01-principle-definition.md)（プロジェクト憲章）を参照してください。

### 背景

- 現在、顧客情報はExcelファイルで管理されている
- 複数の営業担当者が同じファイルを編集するため、情報の競合が発生している
- 最新の情報を確認するために、毎回ファイルを開き直す必要がある
- モバイルからアクセスできないため、外出先での情報確認ができない

## 想定ユーザー

- **営業担当者**: 顧客情報の登録・編集・閲覧を行う
- **営業マネージャー**: 営業担当者の活動を確認し、レポートを作成する
- **経営層**: 営業実績を確認し、意思決定に活用する

## 機能要件

### 1. 顧客情報の管理

- 顧客情報の登録・編集・削除
- 顧客情報の検索・フィルタリング
- 顧客情報の一覧表示

#### 顧客一覧・検索・詳細

- 顧客一覧は`GET /api/v1/customers`、顧客詳細は`GET /api/v1/customers/:id`で提供する。一覧と検索は別APIに分けず、一覧APIのquery parameterで検索・フィルタリング・ソート・ページングを行う。
- 一覧・詳細で返すCustomer read共通DTOは、既存の顧客登録成功応答と同じ`id`、`name`、`name_kana`、`email`、`phone`、`address`、`category`、`owner_user_id`、`created_at`、`updated_at`、`deleted_at`とする。`name`を顧客の主表示名とする。日時は既存JSON応答と同じISO 8601文字列、任意項目と`deleted_at`は値がない場合`null`とする。DBの内部列を追加公開せず、一覧と詳細でfield setを分けない。
- 顧客詳細の成功時はHTTP 200でCustomer read共通DTO 1件を返す。
- 顧客一覧はHTTP 200で`items`、`page`、`page_size`、`total_count`、`total_pages`を持つenvelopeを返す。`items`は現在pageのCustomer read共通DTO、`total_count`は権限scope・検索・filter適用後の全件数、`total_pages`は`ceil(total_count / page_size)`とする。0件時は`items: []`、`total_pages: 0`とする。
- `page`は既定値1、1以上の整数とする。`page_size`は既定値20、1以上100以下の整数とする。最終pageを超えた場合もHTTP 200とし、`items: []`および要求された`page`と適用済みmetadataを返す。
- `sort`は`name_asc`、`name_desc`、`created_at_asc`、`created_at_desc`だけを許可し、既定値は`name_asc`とする。いずれも同値時は`id`昇順を第2 sort条件として安定した順序を保証する。
- `query`は顧客の主表示名である`name`だけを対象に、大文字小文字を区別しない部分一致検索を行う。前後空白を除去し、空文字になった場合はquery filterなしとして扱う。email、電話番号、住所、ID等を横断検索しない。
- `category`は前後空白を除去した完全一致filterとし、空文字はfilterなしとして扱う。categoryは自由入力値であり、該当値が存在しない場合はHTTP 200で0件を返す。
- `owner_user_id`はUUID形式の完全一致filterとする。形式が正しく該当userまたは顧客が存在しない場合はHTTP 200で0件を返す。形式不正はHTTP 400とする。
- `query`、`category`、`owner_user_id`はANDで組み合わせる。staffではさらに`customers.owner_user_id = authenticatedUser.id`をsecurity scopeとしてANDするため、他者の`owner_user_id`を指定しても他者の顧客を返さず、0件になり得る。これは403ではない。managerとadminにはownerによるsecurity filterを設けない。
- `page`または`page_size`が0、負数、非整数、数値として解釈不能の場合、`page_size`が101以上の場合、`sort`が許可値以外の場合、`owner_user_id`がUUID形式でない場合は、既存のHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "<入力項目に対応する説明>" }`形式を返す。
- 論理削除済み顧客はroleを問わず通常の一覧・検索から除外し、詳細では存在しないものとして扱う。顧客自体が存在しない場合、staffが他staff担当顧客を指定した場合、論理削除済み顧客を指定した場合は、すべてHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`を返す。
- T-202のFrontendは既存のstate-based screen switchingを維持して顧客一覧と詳細を提供する。一覧の最小表示は顧客名、category、詳細へ進む操作とし、選択したcustomer idで詳細APIを呼ぶ。詳細から一覧へ戻る操作を提供し、後続のT-205で検索・ページ状態を追加した後も戻る際に一覧状態を保持できる構成とする。ownerの氏名・emailを取得するAPIや`owner_user_id`の技術値を一覧へ追加表示しない。
- T-205のFrontendは顧客名検索、category filter、4種類のsort、page size 20・50・100、前へ・次へ、現在page表示を一覧画面へ追加する。「検索」操作でqueryとcategoryを適用し、検索実行、sort変更、page size変更時はpageを1へ戻す。ページ移動では現在の条件を維持する。0件はエラーにせず「該当する顧客がありません」等の通常状態として表示する。
- `owner_user_id` filterはBackend API capabilityとして実装するが、T-503のusers参照APIがない段階ではFrontendへUUID手入力欄やowner選択UIを設けない。usersを安全に一覧取得できるようになった後にowner filter UIの必要性を再評価する。

#### 顧客編集

- 顧客編集は`PATCH /api/v1/customers/:id`で提供し、HTTP 200で更新後のCustomer read共通DTOを返す。
- 編集可能fieldは`name`、`name_kana`、`email`、`phone`、`address`、`category`とする。`id`、`owner_user_id`、`created_at`、`updated_at`、`deleted_at`は編集できない。担当者変更機能とowner変更UIは、別途仕様が確定するまで追加しない。
- PATCHは部分更新とし、省略したfieldは現在値を維持する。`name_kana`、`email`、`phone`、`address`、`category`は`null`で値を消去できる。DB上NOT NULLの`name`へ`null`は指定できない。文字列の型・長さ・email形式等は同じfieldの顧客登録validationを再利用し、PATCHを理由に緩和しない。任意fieldの空文字は既存登録契約と同様、trim後に`null`として扱う。
- 空のJSON objectはHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "At least one editable customer field is required." }`とする。未知fieldまたは編集不可fieldを含むrequestはHTTP 400 `{ "code": "VALIDATION_ERROR", "message": "Request body contains an unknown or non-editable field." }`とする。新しいerror形式は作らない。
- 更新時に`created_at`を変更せず、`updated_at`を更新する。論理削除済み顧客は通常resourceとして扱わない。
- `staff`は自担当顧客だけ編集でき、他担当顧客は不存在と同じHTTP 404 `CUSTOMER_NOT_FOUND`とする。`manager`はoperation-levelでHTTP 403 `FORBIDDEN`、`admin`は全active customerを編集できる。未認証はHTTP 401 `AUTHENTICATION_REQUIRED`とする。
- Frontendは既存のstate-based navigationを使い、顧客詳細から編集画面へ進む。staffとadminに編集導線を表示し、managerには表示しない。編集画面にowner変更UIを設けず、保存成功後は詳細へ戻って`GET /api/v1/customers/:id`から更新後データを再取得する。キャンセル時は更新せず詳細へ戻る。Frontendの表示制御をBackend Authorizationの代わりにしない。

#### 顧客論理削除

- 顧客削除は`DELETE /api/v1/customers/:id`で提供し、物理削除せず`deleted_at`を設定する。成功時はHTTP 204 No Contentとし、response bodyを返さない。
- `staff`と`manager`はCustomerの存在確認より前にHTTP 403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`で拒否する。`admin`だけがactive customerを論理削除できる。未認証はHTTP 401 `AUTHENTICATION_REQUIRED`とする。
- Customer不存在と既に論理削除済みのCustomerは、どちらもHTTP 404 `{ "code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found." }`とし、公開responseから区別できない。
- 削除後は通常の一覧・検索から除外し、詳細・編集・再DELETEは同じ404とする。
- Frontendは既存のstate-based navigationを使い、adminのCustomer detailだけに削除導線を表示する。削除確認画面で削除実行またはキャンセルを選択でき、204成功後はCustomer listへ戻る。staff・managerには削除導線を表示しない。Frontend表示制御をBackend Authorizationの代わりにしない。

### 2. 営業活動履歴の記録

- 訪問記録の登録
- 商談内容の記録
- 次回訪問予定の設定

### 3. レポート・分析機能

#### 売上推移

- 集計元は`sales_records`とする。
- `recorded_on`を売上日、`amount`を売上金額として使用する。
- `from`と`to`を必須パラメータとし、対象期間は両端を含む。
- 売上金額を月単位で合計する。第1フェーズでは日単位および週単位の集計は実装しない。
- 売上金額はDBの`NUMERIC(15,2)`の精度を保持するため、小数点以下2桁の文字列として返す。0円は`"0.00"`とする。
- Response DTOは`from`、`to`、`items`を持つ。itemsの項目は`month`、`salesAmount`とする。
- itemsは`month`の昇順で返す。SQLまたはService層で順序を保証し、DBの自然順には依存しない。
- 出力月はmonth(from)からmonth(to)までを両端を含めて生成する。from/toが月途中でも、両端月をitemsに含める。
- 売上金額の集計対象は`recorded_on >= from AND recorded_on <= to`とする。from以前およびto以後の売上を含めない。
- 売上がない月もitemsに含め、`{ "month": "YYYY-MM", "salesAmount": "0.00" }`として返す。

#### 顧客分類

- `customers.category`ごとの現在の有効顧客数を集計する。
- 論理削除済み顧客は、`customers.deleted_at`が`null`ではない顧客として集計対象から除外する。
- 期間指定は行わず、現在時点のスナップショットを返す。
- `from`または`to`がquery parameterとして指定された場合は、不正な期間指定としてHTTP 400を返す。
- `category`が`null`の顧客は「未分類」として集計する。
- Response DTOは`items`を持つ。itemsの項目は`category`、`customerCount`とする。
- itemsは`customerCount`の降順、同数の場合はResponse上の`category`の昇順で返す。SQLまたはService層で順序を保証し、DBの自然順には依存しない。
- 対象データが存在しない場合は`{ "items": [] }`を返す。
- categoryの履歴分析は第1フェーズでは実装しない。

#### 営業担当者別実績

- 集計元は`sales_records`とする。
- 営業担当者IDは`sales_records.user_id`を使用し、営業担当者表示は`users.email`を使用する。
- 担当者ごとに売上金額合計と売上件数を集計する。
- `from`と`to`を必須パラメータとし、対象期間は両端を含む。
- Response DTOの項目は`staffId`、`staffEmail`、`salesAmount`、`salesCount`とする。`staffName`は使用しない。
- 売上金額合計の降順、同額の場合は`staffEmail`の昇順で返す。
- 売上金額合計は小数点以下2桁の文字列として返す。0円は`"0.00"`とする。
- Response DTOは`from`、`to`、`items`を持つ。itemsの項目は`staffId`、`staffEmail`、`salesAmount`、`salesCount`とする。
- 対象データが存在しない場合は`items`が空配列のResponse DTOを返す。

売上推移と営業担当者別実績は、既存の`sales_records`を参照・集計する。`sales_records`の業務用登録・更新機能はF-09/F-11の対象に含めない。

#### レポートAPIと認可

- 作成対象のAPIは以下とする。
  - `GET /api/v1/reports/sales-trend?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /api/v1/reports/customer-categories`
  - `GET /api/v1/reports/staff-performance?from=YYYY-MM-DD&to=YYYY-MM-DD`
- 売上推移および営業担当者別実績では、`from`なし、`to`なし、日付形式不正、`from > to`を不正な期間指定とし、400を返す。
- F-09～F-11のレポート集計・API実装時点ではロールによるアクセス制御を実装しない。認証済みユーザーを前提とし、下記の権限は後続の権限管理タスクで適用する。経営層のroleは追加しない。

### 4. 権限管理

- 閲覧権限の設定
- 編集権限の設定
- 管理者権限の設定
- Phase 1の`staff`は、`customers.owner_user_id = 認証済みusers.id`である自担当顧客だけを一覧・検索・詳細で閲覧し、編集できる。顧客登録は可能で、登録した顧客の`owner_user_id`は本人とする。顧客の論理削除はできない。自担当顧客の活動履歴だけを閲覧・登録できる。3種類のレポート閲覧、ユーザー参照、role変更はできない。`owner_user_id`は登録者ではなく顧客担当者を表す。
- Phase 1の`manager`は、全staffを担当者範囲とし、全顧客の一覧・検索・詳細と全顧客の活動履歴を閲覧できる。顧客の登録・編集・論理削除と活動履歴の登録はできない。売上推移・顧客分類は全社、営業担当者別実績は全担当者の結果を閲覧できる。ユーザー参照とrole変更はできない。
- `admin`は全顧客の一覧・検索・詳細を閲覧し、顧客の登録・全件の編集・論理削除ができる。全顧客の活動履歴を閲覧・登録できる。売上推移・顧客分類は全社、営業担当者別実績は全担当者の結果を閲覧できる。ユーザー参照とrole変更ができる。
- Authenticationに失敗した場合は従来の401 `AUTHENTICATION_REQUIRED`とする。認証済みでもroleとして操作自体が禁止される場合はHTTP 403 `{ "code": "FORBIDDEN", "message": "Forbidden." }`を返す。required role、実際のrole、ownerなどの拒否理由は公開応答に含めない。
- IDで指定した顧客が存在しない場合は、そのAPIの既存または設計済みのresource not found応答を返す。staffが閲覧・編集・活動履歴の閲覧・登録など許可された操作で他staff担当の顧客を指定した場合も、顧客が存在しない場合と同じ404応答を返し、存在有無を区別させない。顧客の論理削除など操作自体を禁止される場合は、顧客の存在確認より先に403を返す。manager・adminには顧客担当者による閲覧範囲の制限を設けない。
- staffによる顧客登録では、requestの`owner_user_id`が別のユーザーを指定していても、保存する`owner_user_id`を認証済み本人のIDにする。互換性のためrequestの`owner_user_id`項目は維持するが、その値をstaffの担当者決定に使用しない。adminは既存request契約に従って担当者を指定でき、既存の担当ユーザー検証を維持する。managerの顧客登録は403とする。活動履歴の登録範囲は活動の`user_id`ではなく親顧客の`owner_user_id`で判定し、活動の`user_id`の意味は変更しない。
- ユーザーの新規登録とrole以外のユーザー情報変更は、現行の要件・APIに含めず、今回の権限設定の対象外とする。

#### ユーザー参照・role変更

- `GET /api/v1/users`はAuthenticationを必須とし、adminだけが利用できる。staff・managerはHTTP 403 `FORBIDDEN`とする。HTTP 200のresponseは配列とし、各要素は`id`、`email`、`role`、`active`だけを公開する。active・inactiveの両方を含め、`email ASC, id ASC`で安定して並べる。Phase 1ではpagination、検索、filterを設けない。
- `PATCH /api/v1/users/:id/role`はAuthenticationを必須とし、adminだけが利用できる。staff・managerはvalidationやuser lookupより前にHTTP 403 `FORBIDDEN`とする。requestは`{ "role": "staff|manager|admin" }`だけを受け付け、role以外のfield、role欠落、許可値以外はHTTP 400 `VALIDATION_ERROR`とする。成功時はHTTP 200で更新後の同じUser DTOを返す。inactive userのroleも変更できる。
- 対象userが存在しない場合はHTTP 404 `{ "code": "USER_NOT_FOUND", "message": "User was not found." }`を返す。
- adminが自分自身を現在と異なるroleへ変更することは禁止し、HTTP 409 `{ "code": "SELF_ROLE_CHANGE_NOT_ALLOWED", "message": "An administrator cannot change their own role." }`を返す。現在と同じroleの指定はHTTP 200のno-opとし、DB updateを行わない。
- activeなadminを非adminへ変更する場合、変更後もactive adminが最低1人残ることを必須とする。残らない場合はHTTP 409 `{ "code": "LAST_ACTIVE_ADMIN_REQUIRED", "message": "At least one active admin must remain." }`を返す。inactive adminはactive admin数へ含めない。同時実行でも0人にならないようtransactionとrow lockで保護する。
- Frontendは既存のstate-based navigationへユーザー管理入口を追加し、staff・managerには非表示、adminには表示する。画面にはemail、active/inactive、現在role、role選択、変更操作を表示し、ユーザー登録やemail・active・passwordの変更は設けない。自分自身のrole変更UIは無効化してよい。変更成功後はUsers一覧を再取得する。最後のactive admin判定はFrontendへ複製せず、409のBackend messageを表示する。401は既存共通処理を使い、403・409でauth stateを破棄しない。

## 非機能要件

### パフォーマンス

- 顧客情報の検索は、Phase 1の性能受入用データ100,000件を使った単一request（concurrency 1）の測定で、必須scenarioごとの95パーセンタイルが3秒以内に結果を表示する。これは実際のproduction実績件数ではなく、T-602とT-603で使用する再現可能なAcceptance datasetとする。
- 性能受入用データはactive 95,000件、logical deleted 5,000件とし、100 usersへ決定的に均等分布させる。categoryは20種類と`NULL`で構成し、全体の約10%を`NULL`、残りを20種類へおおむね均等に分布させる。nameには実個人情報を含まない決定的なsynthetic dataを使用する。
- name部分一致検索には、active customerに対して0件、約100件（約0.1%）、約10,000件（約10%）がヒットする3種類の検索語を用意する。実ヒット件数はdataset生成後にSQLで確認する。
- T-602は各scenarioを逐次実行し、10 requestsのwarm-up後に100 requestsを測定する。HTTP request開始からresponse受信完了までのwall-clock時間を記録し、nearest-rank方式でscenarioごとのp95を算出する。fixture生成、DB reset、login、token取得は測定時間に含めない。全必須scenarioのp95が3,000ms以下の場合に合格とする。
- 同時アクセス数は最大50ユーザーとする。T-603ではT-602と同じ性能受入用データを使い、1 waveにつき50 requestsを同時に開始する。2 waves（100 requests）のwarm-up後、20 waves（scenarioごとに1,000 requests）を測定する。
- T-603はdefault list、name low-hit・high-hit、category filter、queryとcategoryのAND、created_at降順、deep pagination、staff owner scopeを個別に測定する。loginとtoken取得は測定外とし、既存tokenを再利用する。各requestのHTTP開始からresponse body受信完了までのwall-clock時間を記録する。
- T-603ではscenarioごとにHTTP成功率100%、期待外status 0件、nearest-rank方式のp95が3,000ms以下であることを受入条件とする。p99もnearest-rank方式で観測するが、合否閾値には使用しない。`pg.Pool`のmax 10は変更せず、50 concurrent requestsによるpool待ちを含むAPI応答時間を評価する。

### セキュリティ

- ログイン認証が必要。既存ユーザーはemailとpasswordでログインし、成功時に30分有効なJWT access tokenを受け取る。Phase 1ではrefresh tokenを発行せず、期限切れ後は再ログインする。
- email不存在、password不一致、無効ユーザーは同じHTTP 401の認証失敗として扱う。認証対象APIでは無効ユーザーを各requestで拒否する。
- ログイン入力のpasswordは必須の文字列とし、空文字と1024文字超を受け付けない。passwordの作成・変更機能と、そのための作成ポリシーは今回のログイン要件に含めない。
- Phase 1の業務機能は認証済みユーザーが利用する。`POST /api/v1/auth/login`と`GET /health`は認証不要とし、それ以外のPhase 1業務APIは認証を必須とする。将来Public APIを追加する場合は仕様で明示する。
- ログイン成功後は、認証導入前と同じ初期業務画面である「顧客登録画面」を表示する。ログインが401の場合は原因を区別せず共通メッセージを表示し、400の場合は入力エラーを表示して、いずれもLogin画面に留まり認証状態を保持しない。
- 認証後の業務APIから401を受けた場合は認証状態を破棄してLogin画面へ戻し、再ログインが必要であることを共通メッセージで伝える。Browser再読込後も再ログインが必要とする。Logoutは保持中の認証状態を破棄してLogin画面へ戻す。Backend Logout APIは設けない。
- E2E専用ユーザーのテスト用passwordとArgon2id hashはE2E fixtureで準備する。本番ユーザーのInitial Password Provisioningを解決したものとは扱わない。
- Phase 1ではCustomerの`name_kana`、`email`、`phone`、`address`をapplication-level encryptionで暗号化して保存する。`null`はDBの`NULL`のままとし、暗号文字列へ変換しない。
- `name`、`category`、`owner_user_id`、`id`、`created_at`、`updated_at`、`deleted_at`は平文で保存する。`name`は既存の`ILIKE '%query%'`による部分一致検索と`name_asc`・`name_desc`のDB sortを維持するため、Phase 1では暗号化しない。deterministic encryption、blind index、order-preserving encryption、plaintext shadow columnは追加しない。
- 暗号方式はAES-256-GCMとし、32 bytesの鍵、暗号化する値ごとに生成するcryptographically secure random 12 bytesのIV、16 bytesのauthentication tagを使用する。AADにはformat versionとCustomer field nameを含め、field間のciphertext取り違えを検出する。Phase 1ではCustomer IDをAADの必須要素としない。
- 暗号化したnon-null値は`enc:v1:<key-id>:<iv-base64>:<tag-base64>:<ciphertext-base64>`形式でDBへ保存する。公開DTOは現在のfield setを維持し、認可されたreadでは暗号化対象fieldを復号したplaintextを返す。ciphertext envelope、IV、tag、key IDは公開しない。
- Customer暗号鍵はDB、source code、Git repositoryへ保存しない。applicationは環境設定からcurrent key IDとkey IDから32-byte keyへのmappingを持つkey ringを取得する。productionではdeployment環境のsecret管理機構から環境変数等としてinjectし、特定のcloud secret productはPhase 1で固定しない。testではproduction keyとは異なるtest専用keyを使用する。
- 暗号設定なし、current key IDなし、current keyのkey ring内不存在、key長不正、設定形式不正の場合はapplicationの起動を失敗させる。暗号化なしで起動するfallbackは設けない。鍵値はlog、error、仕様書、test outputへ出力しない。
- 新規暗号化は常にcurrent key IDを使用し、復号はciphertext envelopeのkey IDに対応するkey ringの鍵を使用する。read時の自動再暗号化は行わない。rotation時は明示的なone-shot re-encryption migrationを実行し、対象ciphertextが残る旧keyをkey ringから削除しない。
- 既存Customerのplaintextは、logical deletedを含む全件を対象とするone-shot offline migrationで暗号化する。原則としてapplication停止、migration、plaintext残存確認、新application起動の順でdeployする。steady stateではplaintextとciphertextの混在を許可せず、production read時の自動暗号化も行わない。migrationは正しい`enc:v1` envelopeを二重暗号化しない。
- 復号可能範囲は既存Customer read Role Matrixと同じとする。staffは自担当Customerのみ、managerとadminは全active Customerを復号済みDTOとして取得できる。staffが他担当Customerを指定した場合は、復号せず404 `CUSTOMER_NOT_FOUND`を返す。処理順はAuthentication、operation Authorization、DB scope/resource判定、scope Authorization、decrypt、DTO生成とする。一覧・検索も既存SQLでscopeとfilterを適用し、返却対象行だけを復号する。
- Customer登録では暗号化対象fieldをDB保存前に暗号化する。部分更新では変更された暗号化対象fieldだけを暗号化し、変更されていないfieldを不要に復号・再暗号化しない。`null`更新はDBの`NULL`を保存する。
- `name_kana`、`email`、`phone`、`address`はPhase 1のCustomer検索・filter・sort対象に追加しない。平文を維持する`name`、`category`、`owner_user_id`の既存検索SQL契約は変更しない。
- unknown key ID、malformed envelope、不正なIV・tag・ciphertext、authentication tag mismatch、その他のdecrypt failureはfail closedとし、plaintext fallbackを禁止する。公開APIは既存のgeneric internal server error契約を使用し、crypto固有情報をresponseへ出さない。logにも暗号鍵、Customerのplaintext、完全なciphertext envelopeを出力しない。
- アクセスログを記録

### 既存顧客データ移行

- Phase 1の移行元は、T-005で承認した演習用Excel `sdd_customer_migration_source.xlsx` とする。対象は「既存顧客データ」40件であり、「担当者マスタ」「カテゴリマスタ」「データ辞書」「演習ケース一覧」をmappingと検証の根拠にする。
- 移行元の顧客番号はsource内の識別子、重複検出、移行結果の照合に使用する。Customerの`id`には流用せず、新しいUUIDを採番する。顧客番号をCustomerの列へ保存しない。
- 担当者は、前後空白を除いたSource担当者メールを担当者マスタで確認し、`users.email`との完全一致から一意なactive userの`users.id`を取得して`owner_user_id`へ設定する。氏名による曖昧一致は禁止する。担当者メールの欠落、マスタ不存在、inactive、usersとの対応なし、複数対応はrejectとする。
- 顧客区分コードはカテゴリマスタで名称へ変換する。空欄は`category = null`、A/B/C/Dはそれぞれ法人/個人/重点/休眠とし、未知のnon-nullコードは推測で補正せずrejectとする。
- 顧客番号はtrim後の完全一致でsource内の一意性を判定する。同じ顧客番号が複数行に存在する場合は、そのIDを持つ全行をrejectする。emailやnameを重複判定keyにせず、merge、後勝ち、自動上書きを行わない。
- 文字列は前後空白を除き、任意項目の空欄は`null`とする。顧客番号、顧客名、担当者メール、登録日時、更新日時、削除フラグの欠落、email形式不正、日時解釈不能、`updated_at < created_at`、削除状態の矛盾、既存Customer validation違反はrecord単位でrejectする。正常record全体をdata-quality errorでrollbackしない。
- 削除フラグは0または1だけを許可する。0では`deleted_at = null`かつSource削除日時は空欄、1では削除日時を必須とし、その値を`deleted_at`へ設定する。削除日時は`created_at`以降でなければならない。logical deleted Customerも移行対象とする。
- Source日時はExcelのtimezoneなしwall-clock値を`Asia/Tokyo`として解釈し、UTCへ変換してPostgreSQLの`TIMESTAMPTZ`へ保存する。登録日時と更新日時にmigration実行日時を補完しない。
- valid recordは設定可能なbatchに分け、batch単位のtransactionでcommitする。data-quality errorは事前にrejectへ分離する。system errorが起きたbatchだけをrollbackし、修正後に再実行できるようにする。commit済みbatchは巻き戻さない。
- T-701はsource dataset IDとSource顧客番号を一意keyとする移行台帳を使用し、Customer挿入とsource-to-target UUID対応の記録を同じtransactionでcommitする。同じ入力のretryは既存target UUIDを再利用して二重insertしない。移行済みsourceの内容が変わっていた場合は自動更新せず、運用確認が必要な不整合として扱う。
- `name_kana`、`email`、`phone`、`address`はmapping、正規化、validation、owner/category解決の後、Customer tableへのwrite前にT-107のAES-256-GCMで暗号化する。plaintextをCustomer tableへ一時commitしない。`null`はDB `NULL`のままとする。
- reject情報はSource顧客番号、Excel row番号、reason code、PIIを含まないreason summaryを持つ。plaintext PII全文、暗号鍵、完全なciphertext envelopeを移行log・reject情報へ出力しない。
- 完了時はsource総数、valid数、reject数、insert数、既に移行済みとして確認した数、reject理由別件数、重複件数、owner/category mapping失敗件数、target件数差分を照合する。さらに、暗号化対象のnon-null値がすべてvalidな`enc:v1` envelopeであり、plaintext残存が0件であることを確認する。

### Request ID・共通エラー

- Backend applicationが生成するすべてのHTTP responseへ`X-Request-ID` headerを付与する。canonical request IDはrequestごとにBackendがNode.js標準`crypto.randomUUID()`で生成するUUID v4とし、PII、secret、credentialを含めない。
- Clientが`X-Request-ID`を送信してもcanonical request IDには採用しない。Client値はvalidationせず、入力不正として400を返さず、responseへechoせず、log correlation keyにも使わない。BackendはClient値の有無や内容にかかわらず新しいrequest IDを生成する。
- Successとerrorの両方で同じrequestの`X-Request-ID`をresponse headerへ返す。既存のerror bodyは`{ "code": "...", "message": "..." }`のままとし、`requestId` fieldを追加しない。既存APIのstatus、code、message、business validationも変更しない。
- Login以外の共通JSON parserがmalformed JSONを検出した場合は、HTTP 400 `{ "code": "INVALID_REQUEST", "message": "Request body is invalid." }`を返す。Loginの既存HTTP 400 `VALIDATION_ERROR`契約は維持する。parser内部messageやstack traceを公開しない。
- 予期しないerrorは既存のgeneric HTTP 500契約へ変換し、stack trace、DB error、secret、credential、PII、完全なciphertextをresponseへ含めない。

### 可用性

- Phase 1の稼働率はAsia/Tokyoのcalendar month単位で測定する。対象は月曜日から金曜日の`09:00 <= time < 18:00`で、5分ごとのexpected sampleに対する成功sampleの割合を99.0%以上とする。祝日・会社休日は自動除外しない。
- expected sampleに対応するCloudWatch Synthetics datapointがない場合はmissingとしてfailure側へ数え、分母から除外しない。予定maintenance中のfailureも自動除外しない。判定には丸め前のratioを使用する。
- Synthetics Canaryは1 runでCloudFront経由のFrontend HTTPSが2xxであることと、Backendの`GET /health/ready`が200かつ`status = ready`であることを確認する。認証やproduction data更新を伴う業務操作は実行しない。
- 過去月は月全体、当月は実行時点以前のslotをmonth-to-dateとして算出し、未来月は拒否する。月次reportにはexpected、success、failed、missing、availability、PASS/FAILを記録する。
- Phase 1のproductionはAWS `ap-northeast-1`に配置する。FrontendはAmazon S3とAmazon CloudFront、BackendはApplication Load Balancer配下のAmazon ECS on Fargate、DatabaseはMulti-AZのAmazon RDS for PostgreSQL 16とし、self-hosted PostgreSQLは採用しない。
- Public通信はHTTPSとし、CloudFrontまたはALBでTLSを終端する。HTTPはHTTPSへredirectする。BackendからRDSへの接続もTLSを必須とし、AWS RDS CA certificateでserver certificateを検証する。productionでTLS検証を無効化してはならない。
- `DATABASE_URL`またはDB credential、`JWT_SECRET`、`CUSTOMER_ENCRYPTION_CURRENT_KEY_ID`、`CUSTOMER_ENCRYPTION_KEYS_JSON`はAWS Secrets Managerで管理し、ECS Taskへinjectする。secret値をGit、source code、Docker image、DB、CloudWatch Logs、examples文書へ保存しない。`.env`はlocal development専用とし、production deployment sourceには使用しない。
- DB credentialとJWT secretは90日、Customer encryption current keyは180日を定期rotation周期とする。漏えいまたはその疑いがある場合は周期を待たずにrotationする。JWT secret rotationで既存の30分tokenが無効になることはmaintenance運用上許容する。
- Customer encryption key rotationは、新key追加、current key変更、one-shot re-encryption、旧key IDのciphertext 0件確認、旧key削除の順に行う。旧keyを使用するciphertextが残る間は削除しない。
- RDS automated backupとPoint-in-Time Recoveryを有効にし、retentionは7日とする。重要release、schema migration、Customer migrationの前にはmanual RDS snapshotを取得し、pre-change snapshotは14日保持する。Phase 1のRPOは5分以内、RTOは60分以内とする。
- Production RDS、automated backup、snapshotはAWS KMSで暗号化する。backup accessはproduction運用管理者へ最小権限で付与する。Customer encryption keyをDB backupへ含めず、Secrets ManagerとRDS backupを同一artifactとして扱わない。cross-region backupはPhase 1の必須要件にしない。
- 四半期に1回、productionから分離したtemporary RDS instanceまたはdatabaseへrestore drillを行う。restore、schema・主要table、FK、代表row count、Customerの`enc:v1` envelope、authorized decryptを検証し、完了後にtemporary環境を削除する。production DBへrestore testを直接実行しない。
- Amazon CloudWatchでECS task数・restart・CPU・memory、ALB target health・4xx/5xx・latency、RDS CPU・connection・memory・storage・read/write latency・event、applicationの5xx・認証認可error増加・異常終了・migration/backup failureを監視する。monitoring logへsecretやplaintext PIIを出力しない。
- 重大alarmはCloudWatch AlarmからAmazon SNSを経由して運用担当メールへ通知する。Backend available task 0、ALB unhealthy、継続的なHTTP 5xx、DB unavailable、DB storage critical、automated backup failure、restore verification failureを対象とする。PagerDuty等のthird-party paging serviceはPhase 1の必須要件にしない。
- 利用者影響を伴う予定maintenanceは原則3営業日前までに通知し、開始1時間前に再通知する。日時、影響、復旧予定、問い合わせ先を運用メールまたは既存案内channelで伝える。緊急maintenanceは実施決定後、可能な限り速やかに通知する。Phase 1で新しい通知UIは作らない。
- Maintenance通知timingはAsia/Tokyoで検証する。営業日は月曜日～金曜日とし、祝日・会社休日を自動除外しない。PLANNED INITIALは開始JST local timeを保って3営業日戻したdeadline以前を合格とする。
- PLANNED REMINDERは開始60分前を基準とし、開始65分前から55分前までを許容windowとする。EMERGENCYはevent作成を実施決定の記録とし、`created_at`から15分以内に最初の送信attemptを開始する。
- Timingはrecipient単位で判定する。INITIAL・REMINDERはSENTの`sent_at`、EMERGENCYはdelivery結果とは分離して`first_attempted_at`を使用する。1 recipientでもtiming未達ならphase全体をFAILとする。
- 重大incidentの検知後15分以内に一次切り分けを開始する。alarm、incident認定、影響確認、application・DB・network切り分け、rollbackまたはrestore判断、service recovery、data reconciliation、関係者報告、事後分析の順を基本とする。DB破損・誤更新ではproductionへ直接上書きせず、temporary restoreでdataを確認してから復旧方法を決める。
- automated backup failureはalert対象とする。restore drill failureは未解消incidentとして扱い、原因解消後に成功を再確認する。backupの存在だけでrecoverableとは判定しない。

## 未決定事項

仕様駆動開発の原則③「変更と反復が前提」に基づき、未決定事項も明記します：

- **モバイルアプリの開発時期**：Web版のリリース後に検討（[01-principle-definition.md](./01-principle-definition.md)のOut of Scopeに記載）
- **外部システムとの連携方法**：○○システムとつなぐ必要がありますが、方法は検討中（第2フェーズで検討）
- **Initial Password Provisioning**：本番ユーザーの初期password_hashを登録する運用方法は後続で決定する。今回のログインは有効なpassword_hashを持つ既存ユーザーを前提とし、ユーザー登録・password設定・変更・再設定は含めない。

## 仕様の変更履歴

この仕様書は、仕様駆動開発の原則①「生きたドキュメント」に基づき、継続的に更新されます。

変更履歴は、Gitのコミット履歴で管理されます。主要な変更は以下のように記録します：

- **2025-11-26**: 初版作成
- （今後の変更は、Gitのコミットメッセージで記録）

---

**注意**: この仕様書は、仕様駆動開発の「7 つの工程」のうち、**企画・要件定義工程**の成果物です。次の工程（設計計画工程）では、この仕様を基に技術スタックやアーキテクチャを決定します。

