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
