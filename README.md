# Funding CF App

MF会計データを取り込み、月次CFの確認、借入資料・稟議書の下書き生成、PDF出力まで行うMVPです。

## 現在できること

- email/password 認証
- company 作成と company_id 単位のデータ分離
- MF OAuth 連携
- office 選択
- 手動同期
- accounts / journals / journal details の保存
- CF分類
- 月次CFダッシュボード
- 銀行 / 公庫 / 社内稟議向け下書き生成
- 編集保存
- PDF出力

## セットアップ

```bash
cp .env.example .env.local
pnpm install
pnpm gen:key >> .env.local
pnpm db:local:setup
pnpm db:generate
pnpm deploy:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm check:env
pnpm check:db
pnpm audit:api-scope
pnpm dev
pnpm smoke:local
```

`db:local:setup` / `db:local:start` は既定で `localhost:55432` を使い、`.env.local` の `APP_DATABASE_URL` / `APP_DIRECT_URL` を更新します。別ポートを使う場合は `LOCAL_POSTGRES_PORT` を指定してください。

Docker を使う場合は `pnpm db:local:setup` の代わりに `docker compose up -d db` を実行し、`.env.local` の `APP_DATABASE_URL` / `APP_DIRECT_URL` を `localhost:5432` 向けにしてください。

Supabase/Vercel 向けの本番値を確認する場合は、`pnpm check:env:prod` を使います。secret や接続文字列の値はログに出さないでください。

## Build / Migration 運用

`pnpm build` は Prisma Client 生成と Next.js build のみを実行します。Preview build では migration を自動実行しません。

DB migration は、Production deploy 時または手動承認後に `pnpm deploy:migrate` で実行します。会計・税務系データを扱うため、Preview環境では自動migrationを避け、stagingで内容確認してからProductionへ適用してください。

## 検証コマンド

```bash
pnpm check:env
pnpm check:db
pnpm audit:api-scope
pnpm test
pnpm build
pnpm smoke:local
```

`pnpm smoke:local` は `pnpm dev` が起動している状態で実行します。デプロイ後は `pnpm smoke https://your-vercel-app.vercel.app` で `/api/health`、ログイン/サインアップ画面、Cron API の未認可拒否を確認できます。

## 必須環境変数

- `APP_DATABASE_URL`
- `APP_DIRECT_URL`
- `NEXTAUTH_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `MF_CLIENT_ID`
- `MF_CLIENT_SECRET`
- `MF_REDIRECT_URI`
- `MF_AUTHORIZE_URL`
- `MF_TOKEN_URL`
- `MF_API_BASE_URL`
- `MF_SCOPES`
- `CRON_SECRET`

PDF出力にはローカルChrome/Chromiumのパスを `PUPPETEER_EXECUTABLE_PATH` に設定してください。

## MF API 仕様

公式仕様に基づき、会計APIの既定値は以下に合わせています。

- API Base URL: `https://api-accounting.moneyforward.com`
- offices: `/api/v3/offices`
- accounts: `/api/v3/accounts`
- journals: `/api/v3/journals`
- journals period query: `start_date` / `end_date`
- journals paging: `page` / `per_page`

差し替え箇所:

- `src/lib/mf/endpoints.ts`
- `src/lib/mf/types.ts`
- `src/lib/mf/sync/accounts.ts`
- `src/lib/mf/sync/journals.ts`

## MVP操作フロー

1. `/signup` でユーザー作成
2. `/onboarding` で会社作成
3. `/settings` でMF連携
4. 必要なら `/settings/mf/select-office` でoffice選択
5. `/settings` で手動同期
6. `/dashboard` でCF確認
7. `/documents/new` で下書き生成
8. `/documents/[id]` で編集・PDF出力

## 第4週チェック

- MF連携切れ時に再連携できる
- 同期失敗時に `mf_sync_history` に failed が残る
- company_id を跨いでデータが混ざらない
- 要確認分類が表示される
- 生成文が数字を創作しない
- PDFの日本語が崩れない
- ログにトークンが出ない

## トラブルシュート

- Windowsで `pnpm build` が Prisma Client 生成中に `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` で失敗する場合は、起動中の `pnpm dev` を止めてから再実行してください。Next.js dev server が Prisma engine を読み込んでいると、DLL の置き換えに失敗することがあります。
- `pnpm dev` 起動時に `.next` 配下の `readlink` エラーが出る場合は、生成済みの `.next` を削除してから再起動してください。`next build` 後の生成物と dev server のクリーンアップが衝突した場合に発生することがあります。

## 関連資料

- `docs/acceptance-criteria.md`
- `docs/deployment-vercel-supabase.md`
- `docs/gap-analysis-to-100.md`
- `docs/local-verification-report.md`
- `docs/mvp-final-materials.md`
- `docs/mf-api-verification.md`
- `docs/project-status.md`
- `docs/production-readiness-checklist.md`
- `docs/risk-register.md`
- `docs/runbook.md`
- `docs/testing-plan.md`
