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

`id`、`customer_id`、`user_id`、`amount`、`recorded_on`、`created_at`、`updated_at`を持つ。売上推移と営業担当者別実績の集計元とする。

### audit_logs

`id`、`user_id`、`action`、`resource_type`、`resource_id`、`request_id`、`ip_address`、`created_at`を持つ。ログイン、顧客情報の参照・変更・削除、権限変更を記録する。

顧客、活動履歴、売上記録には外部キーと作成・更新日時を設定する。検索条件に使用する`customers.name`、`customers.category`、`customers.owner_user_id`、`customers.deleted_at`にはインデックスを設定する。

## REST API設計

すべてのAPIは`/api/v1`配下に置き、JSONを使用する。認証が必要なAPIでは`Authorization: Bearer <JWT>`を必須とする。エラーは`{ "code": "エラーコード", "message": "説明" }`形式で返す。

| エンドポイント | 用途 | 要件 |
| --- | --- | --- |
| `POST /auth/login` | ログインしてJWTを発行 | N-03 |
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

一覧APIは`page`、`page_size`、`query`、`category`、`owner_user_id`、`sort`を受け付ける。`page_size`の上限は100とする。売上推移および営業担当者別実績APIは`from`、`to`を`YYYY-MM-DD`形式で必須とし、期間外のデータを集計しない。顧客分類集計APIは期間を受け付けない。

## レポートResponse DTO

- 売上推移は`{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "items": [{ "month": "YYYY-MM", "salesAmount": "1200000.00" }] }`を返す。売上がない月もitemsに含め、`salesAmount`は`"0.00"`とする。
- 顧客分類は`{ "items": [{ "category": "A", "customerCount": 25 }] }`を返す。`customers.deleted_at`が`null`ではない顧客は除外し、`category`が`null`の場合は`"未分類"`として集計する。
- 営業担当者別実績は`{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "items": [{ "staffId": "UUID", "staffEmail": "user@example.com", "salesAmount": "3500000.00", "salesCount": 12 }] }`を返す。`salesAmount`は小数点以下2桁の文字列とする。

## 認証・認可

- パスワードは平文保存せず、ソルト付きの一方向ハッシュで保存する。
- ログイン成功時に有効期限付きJWTを発行し、署名鍵は環境変数または秘密情報管理サービスから取得する。
- JWTの署名不正、期限切れ、無効ユーザーは401を返す。
- `staff`は許可された顧客の閲覧・編集、`manager`は担当者範囲の閲覧とレポート参照、`admin`は全顧客・ユーザー権限の管理を行う。
- 権限のないリソースへのアクセスは403を返す。認可判定はAPIごとに行い、Frontendの表示制御だけに依存しない。

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
