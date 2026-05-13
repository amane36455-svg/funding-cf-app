# Production Launch Runbook

## Scope

This runbook prepares the app for production without printing or committing real secrets.

- App: Next.js / Prisma / PostgreSQL / NextAuth
- Target hosting: Vercel
- Target database: Supabase Postgres
- External integration: Money Forward Cloud Accounting

Do not paste real API keys, database passwords, tokens, or secrets into docs, commits, chat, screenshots, or issue comments.

## 1. Git Management

### Secret Ignore Check

The following must stay ignored:

- `.env`
- `.env.local`
- `.env.production`
- `.env.*.local`
- `.vercel`
- `.claude/*.local.json`
- `*.key`
- `*.pem`
- `*.p12`
- `*.secret`
- `.pgpass`
- `node_modules`
- `.next`
- `*.log`
- `tsconfig.tsbuildinfo`

### Commit Candidate

Recommended commit scope:

- `.env.example`
- `.env.supabase.example`
- `.github/`
- `.gitignore`
- `README.md`
- `docker-compose.yml`
- `docs/`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `postcss.config.cjs`
- `prisma/`
- `scripts/`
- `src/`
- `tailwind.config.ts`
- `tests/`
- `tsconfig.json`
- `vercel.json`
- `vitest.config.ts`

Do not run broad `git add .` until unrelated local folders are explicitly reviewed.

## 2. Production Environment Variables

Register these in Vercel Project Settings -> Environment Variables for Production. Use Preview only when a separate preview database and MF callback are prepared.

| Variable | Required | Owner | Notes |
| --- | --- | --- | --- |
| `NEXTAUTH_URL` | Yes | App/Vercel owner | Final production HTTPS origin. |
| `NEXT_PUBLIC_APP_URL` | Yes | App/Vercel owner | Same origin as the production app. |
| `NEXTAUTH_SECRET` | Yes | App operator | Generate with a password manager or random generator. |
| `TOKEN_ENCRYPTION_KEY` | Yes | App operator/developer | Generate with `pnpm gen:key`; use only a value that decodes to exactly 32 bytes. |
| `APP_DATABASE_URL` | Yes | Supabase owner | Runtime database connection for the app. |
| `APP_DIRECT_URL` | Yes | Supabase owner | Direct/session connection for Prisma migration operations. |
| `MF_CLIENT_ID` | Yes | MF developer app admin | Money Forward developer app value. |
| `MF_CLIENT_SECRET` | Yes | MF developer app admin | Money Forward developer app value. |
| `MF_REDIRECT_URI` | Yes | App/Vercel owner + MF app admin | Must match the MF developer console callback. |
| `MF_AUTHORIZE_URL` | Yes | Developer | Fixed provider endpoint. |
| `MF_TOKEN_URL` | Yes | Developer | Fixed provider endpoint. |
| `MF_API_BASE_URL` | Yes | Developer | Money Forward Accounting API base. |
| `MF_SCOPES` | Yes | MF developer app admin | Space-separated scopes approved for offices/accounts/journals. |
| `CRON_SECRET` | Yes | App operator | Generate with a password manager or random generator. |
| `LOG_LEVEL` | Optional | App operator | Usually `info`. |
| `ANTHROPIC_API_KEY` | Optional | Anthropic account admin | Required only if Claude generation is enabled. |
| `ANTHROPIC_MODEL` | Optional | App operator | Model policy value. |
| `PUPPETEER_EXECUTABLE_PATH` | Optional | Platform operator | Only when a fixed Chrome path is required. |
| `CHROMIUM_DOWNLOAD_URL` | Optional | Platform operator | Only when Vercel needs an explicit Chromium tarball URL. |
| `MF_PATH_OFFICES` | Optional | Developer | Keep default unless MF API version changes. |
| `MF_PATH_ACCOUNTS` | Optional | Developer | Keep default unless MF API version changes. |
| `MF_PATH_JOURNALS` | Optional | Developer | Keep default unless MF API version changes. |
| `MF_QUERY_OFFICE_ID` | Optional | Developer | Keep blank unless MF requires office query. |
| `MF_QUERY_PAGE` | Optional | Developer | Keep default. |
| `MF_QUERY_PER_PAGE` | Optional | Developer | Keep default. |
| `MF_QUERY_JOURNALS_FROM` | Optional | Developer | Keep default. |
| `MF_QUERY_JOURNALS_TO` | Optional | Developer | Keep default. |
| `MF_ACCOUNTS_PAGINATED` | Optional | Developer | Keep default unless accounts endpoint requires paging. |

Production validation:

```bash
pnpm check:env:prod
```

This must pass before deployment is treated as production-ready. The command must not print secret values.

## 3. Supabase Setup

### Project

1. Create a Supabase project for production.
2. Keep production separate from local/demo databases.
3. Optional but recommended: create a dedicated Prisma database user for the app and migrations.

### Connection Strings

Get connection strings from Supabase dashboard -> project -> Connect.

- `APP_DATABASE_URL`: use the Supabase serverless/runtime connection recommended for Vercel.
- `APP_DIRECT_URL`: use a direct database connection or a session-style connection for Prisma CLI migrations.

Do not put real passwords in committed files.

### Migration

Run from a trusted local machine or approved CI with production env loaded:

```bash
pnpm db:generate
pnpm deploy:migrate
pnpm db:seed
pnpm check:db
```

Rules:

- Use `pnpm deploy:migrate`, not interactive development migration commands, for production.
- Review migration SQL before applying it to production.
- Verify staging first when schema changes touch customer, accounting, tenant, or auth data.
- `pnpm db:seed` seeds baseline CF classification rules only when intended for the target environment.
- Do not run demo seed commands in production.

### Connection Verification

```bash
pnpm check:env:prod
pnpm check:db
```

If connection fails, confirm:

- Supabase project is active.
- The database password is correct in the secret store.
- `APP_DATABASE_URL` is suitable for the Vercel runtime.
- `APP_DIRECT_URL` is suitable for migrations.
- Vercel env changes were followed by a redeploy.

## 4. Vercel Setup

### Project Creation

1. Create or import the Git repository into Vercel.
2. Framework preset: Next.js.
3. Install command: Vercel default or `pnpm install`.
4. Build command: `pnpm build`.
5. Production branch: `main`.

### Build Policy

`pnpm build` runs Prisma Client generation and Next.js build only. It must not apply database migrations.

Preview builds must not run migrations. Migration execution is a separate, human-approved release step through `pnpm deploy:migrate`.

### Environment Variables

1. Open Vercel Project Settings.
2. Go to Environment Variables.
3. Add all required Production variables from this runbook.
4. Add Preview variables only when a separate preview database is available.
5. Add optional variables only when needed.
6. Redeploy after any env change.

### Production URL

After the first production deployment, decide the final URL:

- Vercel generated domain: `https://your-app.vercel.app`
- Custom domain: `https://app.example.com`

Set `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `MF_REDIRECT_URI` to the final HTTPS origin/callback, then register the same callback in the Money Forward developer app.

### Cron

`vercel.json` schedules:

```json
{
  "path": "/api/sync/daily",
  "schedule": "0 18 * * *"
}
```

This is 18:00 UTC / 03:00 JST. Vercel calls the path with `GET`. The app requires:

```text
Authorization: Bearer <CRON_SECRET>
```

### Smoke Test

After deployment:

```bash
pnpm smoke https://your-app.vercel.app
```

Then manually verify:

1. `/api/health` returns ok.
2. Sign up or log in with a real internal user.
3. Create/select a company.
4. Connect MF.
5. Select office.
6. Run manual sync.
7. Open dashboard.
8. Review journals.
9. Generate document.
10. Export PDF.

## 5. Access Control Checklist

### Current Guards

- `middleware.ts` protects `/dashboard`, `/settings`, `/documents`, and `/onboarding`.
- API routes, except public auth/signup/health and cron, are audited by `pnpm audit:api-scope`.
- `getUserAndCompanyForApi()` verifies session and membership before returning `companyId`.
- Cron route checks `CRON_SECRET` authorization.

### Required Production Checks

Run before accepting production:

```bash
pnpm audit:api-scope
pnpm smoke https://your-app.vercel.app
```

Manual checks:

- Unauthenticated `/dashboard` redirects to `/login`.
- Unauthenticated protected APIs return unauthorized responses.
- `/api/sync/daily` rejects requests without the expected authorization header.
- Company switching only succeeds for companies in `user_companies`.
- Records returned from journals/documents/dashboard belong to the current `companyId`.
- Demo user does not exist in production.
- Demo company does not exist in production.
- Demo seed commands are never run against production.

## References

- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables
- Vercel Managing Environment Variables: https://vercel.com/docs/environment-variables/managing-environment-variables
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase database connection guide: https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers
- Prisma migrate deploy: https://docs.prisma.io/docs/cli/migrate/deploy
