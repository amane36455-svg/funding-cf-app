# MF API Verification Checklist

MF会計APIの実装で、公式仕様と実アカウント接続時に確認する項目です。

## 1. 確認済み

- OAuth authorize endpoint: `https://api.biz.moneyforward.com/authorize`
- OAuth token endpoint: `https://api.biz.moneyforward.com/token`
- API Base URL: `https://api-accounting.moneyforward.com`
- offices path: `/api/v3/offices`
- accounts path: `/api/v3/accounts`
- journals path: `/api/v3/journals`
- journals from/to query: `start_date`, `end_date`
- journals paging query: `page`, `per_page`
- journal details shape: `branches[].debitor` / `branches[].creditor`

## 2. 実アカウントで確認する項目

| 項目 | 現在の対応 | 確認観点 |
| --- | --- | --- |
| scope | `MF_SCOPES` を環境値で指定 | accounts/journals/offices が 403 にならないこと |
| office | `/api/v3/offices` の単一事業者レスポンスを1件選択として扱う | 連携先事業者名が表示されること |
| accounts | `/api/v3/accounts`、既定でページングなし | 全勘定科目が取得できること |
| journals | `/api/v3/journals?start_date=...&end_date=...&page=...&per_page=...` | 期間指定とページングが動くこと |
| journal details | `branches[].debitor` / `branches[].creditor` を明細へ正規化 | 借方/貸方が2明細として保存されること |

## 3. 実レスポンス確認手順

1. MF OAuthで接続
2. `/api/auth/mf/office` で offices の生レスポンスを確認
3. accounts APIを取得
4. journals APIを1ページだけ取得
5. `pnpm test`
6. 手動同期

## 4. 失敗時の見方

- 401: token refresh または scope不足
- 403: API利用権限不足
- 404: path不一致
- 422/400: query名不一致
- 429: Rate Limit
