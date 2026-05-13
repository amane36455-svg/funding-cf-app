# companyIdガード監査メモ

## 目的

マルチカンパニー前提で、API、画面、DBアクセスがユーザーの所属会社に閉じていることを確認する。

## 今回の対応

- `/api/debug/database-env` を削除
- `UserPreference.currentCompanyId` を追加し、JWTだけに依存しない会社選択へ変更
- `userCompanyAccessWhere(userId, companyId)` を追加し、ユーザー所属会社の複合キー確認を共通化
- 会社切替時に `user_preferences.current_company_id` と `user_companies.last_accessed_at` を更新
- 顧客一覧は `user_companies.user_id` を起点に取得し、他ユーザー・他社の会社を直接検索しない
- お気に入り更新APIは `user_id + company_id` の両方で `updateMany` し、未所属会社は更新しない
- CIで `pnpm audit:api-scope` を実行する

## 追加テスト

`tests/unit/auth/company-scope.test.ts` で以下を確認する。

- requestedCompanyId がユーザー所属外なら採用しない
- 永続化済み currentCompanyId が所属外なら採用しない
- `userId + companyId` の複合条件を組み立てる

## 監査観点

- APIで会社データへアクセスする場合は `getUserAndCompanyForApi()` または `getServerSession()` のユーザーIDを必ず使う
- companyId付きモデルの取得・更新では、可能な限り `companyId: context.companyId` を含める
- 会社切替や顧客一覧のように「現在の会社」以外を扱うAPIでは、必ず `user_companies.user_id + company_id` で所属確認する
- 税務・会計・給与・外部連携の自動処理は今回の範囲外

## 未確認事項

- 本番DBの既存 `MEMBER` ロール移行方針
- row level security をDB側で併用するか
- 将来の招待機能で `ADMIN / STAFF / REVIEWER / VIEWER` の権限差をどこまで厳密化するか
