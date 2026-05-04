# MVP受入基準

## 認証・会社

- ユーザーがサインアップできる
- ログインできる
- 初回会社作成ができる
- company_id 単位でデータが分かれる

## MF連携

- `/settings` からMF OAuthを開始できる
- callbackで token を暗号化保存できる
- office が複数ある場合に選択できる
- token refresh が動く

## 同期

- 手動同期で accounts を取得し保存できる
- 手動同期で journals / details を取得し保存できる
- rawJson が保存される
- `mf_sync_history` に success / failed が残る
- 当月+前月の取得範囲が履歴に残る

## CF

- 同期後に `cf_classification_results` が作られる
- 不明な明細は要確認になる
- `/dashboard` に収入・支出・純収支・要確認件数が表示される

## 資料生成

- 銀行向け下書きが生成できる
- 公庫向け下書きが生成できる
- 社内稟議向け下書きが生成できる
- 不足情報は要確認として残る
- 生成文を編集保存できる
- PDF出力できる

## セキュリティ

- MF token は平文保存されない
- client secret はログに出ない
- company_id を必ず where 条件に含める

## テスト

- `tests/unit/cf/classifier.test.ts`
- `tests/unit/crypto/token.test.ts`
- `tests/unit/documents/generator.test.ts`
- `tests/unit/mf/types.test.ts`
- `tests/unit/mf/runner.test.ts`
