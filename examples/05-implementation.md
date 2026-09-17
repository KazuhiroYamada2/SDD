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
