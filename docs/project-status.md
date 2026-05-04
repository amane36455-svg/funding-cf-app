# Project Status

## MVP実装状況

| 領域 | 状態 | 備考 |
| --- | --- | --- |
| 認証 | 実装済み | email/password, NextAuth |
| 会社作成 | 実装済み | user_companies で複数会社対応 |
| 会社切替 | 実装済み | 最小UIのみ |
| MF OAuth | 実装済み | state検証, token交換, 暗号化保存 |
| office選択 | 実装済み | 複数office対応 |
| 手動同期 | 実装済み | accounts, journals, details |
| 日次同期 | 実装済み | Cron secret付きAPI |
| 同期履歴 | 実装済み | success/failed/running |
| CF分類 | 実装済み | ルールベース + 要確認 |
| 仕訳確認 | 実装済み | 要確認一覧 + 手動上書き |
| ダッシュボード | 実装済み | KPI + カテゴリ別集計 |
| 資料生成 | 実装済み | Claude API + ローカルフォールバック |
| 資料編集 | 実装済み | 下書き/確定保存 |
| PDF出力 | 実装済み | Puppeteer-core |
| Vercel PDF | 実装済み | @sparticuz/chromium-min fallback |
| 最終資料 | 実装済み | docs配下 |

## 100%に向けた実環境確認

このリポジトリ上の実装はMVP機能を満たしています。残りは実環境依存の確認です。

1. Node.js / pnpm を入れる
2. `pnpm install`
3. `.env.local` を設定
4. `pnpm db:generate`
5. `pnpm db:deploy`
6. `pnpm check:env`
7. `pnpm audit:api-scope`
8. `pnpm typecheck`
9. `pnpm test`
10. `pnpm dev`
11. `pnpm smoke:local`
12. MF実アカウントで OAuth
13. 実スコープで accounts/journals/offices が取得できることを確認

## Verified Locally

- `pnpm typecheck`: passed
- `pnpm test`: passed
- `pnpm build`: passed
- `pnpm db:deploy`: passed, no pending migrations
- `pnpm db:seed`: passed
- `pnpm db:seed:demo`: passed
- `pnpm check:env`: passed
- `pnpm check:db`: passed
- `pnpm audit:api-scope`: passed
- `pnpm smoke:local`: passed

## 既知の要確認事項

- MF OAuth の実スコープ
- MF 実アカウントでの同期結果
- Vercel上での Puppeteer 実行方式

## 第4週で優先して潰すもの

- APIレスポンス形状のズレ
- 同期タイムアウト
- token refresh 失敗時の再連携導線
- PDF日本語フォント
- company_id 混在の実ブラウザE2E
- 生成文の数字創作チェック
