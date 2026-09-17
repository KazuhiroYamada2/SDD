# 顧客情報登録API

## エンドポイント

`POST /api/v1/customers`

顧客情報を1件登録する。リクエストとレスポンスはJSONで扱う。

## リクエスト本文

| 項目 | 型 | 必須 | 検証内容 |
| --- | --- | --- | --- |
| `name` | string | 必須 | 空白だけの値は不可 |
| `owner_user_id` | string | 必須 | UUID形式 |
| `name_kana` | string | 任意 | 指定時は文字列 |
| `email` | string | 任意 | 指定時はメールアドレス形式 |
| `phone` | string | 任意 | 指定時は文字列 |
| `address` | string | 任意 | 指定時は文字列 |
| `category` | string | 任意 | 指定時は文字列 |

文字列の前後にある空白は取り除く。任意項目に空文字を指定した場合は、`null`として保存する。

## レスポンス

| ステータス | 内容 |
| --- | --- |
| `201 Created` | 登録した顧客情報を返す |
| `400 Bad Request` | `{ "code": "VALIDATION_ERROR", "message": "説明" }` を返す |
| `500 Internal Server Error` | `{ "code": "INTERNAL_SERVER_ERROR", "message": "Failed to create customer." }` を返す |
| `503 Service Unavailable` | DB接続が設定されていない場合に `{ "code": "SERVICE_UNAVAILABLE", "message": "Database is not configured." }` を返す |
