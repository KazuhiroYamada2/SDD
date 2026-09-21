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

## 非機能要件

### パフォーマンス

- 顧客情報の検索は3秒以内に結果を表示
- 同時アクセス数：最大50ユーザー

### セキュリティ

- ログイン認証が必要。既存ユーザーはemailとpasswordでログインし、成功時に30分有効なJWT access tokenを受け取る。Phase 1ではrefresh tokenを発行せず、期限切れ後は再ログインする。
- email不存在、password不一致、無効ユーザーは同じHTTP 401の認証失敗として扱う。認証対象APIでは無効ユーザーを各requestで拒否する。
- ログイン入力のpasswordは必須の文字列とし、空文字と1024文字超を受け付けない。passwordの作成・変更機能と、そのための作成ポリシーは今回のログイン要件に含めない。
- Phase 1の業務機能は認証済みユーザーが利用する。`POST /api/v1/auth/login`と`GET /health`は認証不要とし、それ以外のPhase 1業務APIは認証を必須とする。将来Public APIを追加する場合は仕様で明示する。
- ログイン成功後は、認証導入前と同じ初期業務画面である「顧客登録画面」を表示する。ログインが401の場合は原因を区別せず共通メッセージを表示し、400の場合は入力エラーを表示して、いずれもLogin画面に留まり認証状態を保持しない。
- 認証後の業務APIから401を受けた場合は認証状態を破棄してLogin画面へ戻し、再ログインが必要であることを共通メッセージで伝える。Browser再読込後も再ログインが必要とする。Logoutは保持中の認証状態を破棄してLogin画面へ戻す。Backend Logout APIは設けない。
- E2E専用ユーザーのテスト用passwordとArgon2id hashはE2E fixtureで準備する。本番ユーザーのInitial Password Provisioningを解決したものとは扱わない。
- 顧客情報は暗号化して保存
- アクセスログを記録

### 可用性

- 平日9:00-18:00の稼働率99%以上
- メンテナンスは事前に通知

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

