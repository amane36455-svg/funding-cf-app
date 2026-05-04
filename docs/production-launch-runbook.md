# Production Launch Runbook

## Scope

This runbook prepares the app for production without printing or committing real secrets.

- Project root: `C:\Users\amane\OneDrive\デスクトップ\claude`
- App: Next.js / Prisma / PostgreSQL / NextAuth
- Target hosting: Vercel
- Target database: Supabase Postgres
- External integration: Money Forward Cloud Accounting

Do not paste real API keys, database passwords, tokens, or secrets into docs, commits, chat, screenshots, or issue comments.

## 1. Git Management

### Current State

- `.git` exists.
- Current branch after `git init`: `master`.
- The repository has no baseline commit yet, so `git status --short` reports the project files as untracked.

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

### Initial Commit Candidate

Recommended first commit scope:

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

Hold before adding:

- `.claude/`: local tool settings.
- `ai-company-organization/`: appears to be a separate project or automation pack under the same root. Decide whether it belongs in this repository before staging it.

Recommended commands:

```bash
git status --short
git add .gitignore .env.example .env.supabase.example .github README.md docker-compose.yml docs middleware.ts next-env.d.ts next.config.mjs package.json pnpm-lock.yaml postcss.config.cjs prisma scripts src tailwind.config.ts tests tsconfig.json vercel.json vitest.config.ts
git status --short
```

Do not run broad `git add .` until `.claude/` and `ai-company-organization/` are explicitly decided.

## 2. Production Environment Variables

Register these in Vercel Project Settings -> Environment Variables for Production. Use Preview only when a separate preview database and MF callback are prepared.

| Variable | Required | Who gets it | Where to get it | Example format |
| --- | --- | --- | --- | --- |
| `NEXTAUTH_URL` | Yes | App/Vercel owner | Vercel production domain after deployment or custom domain | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | App/Vercel owner | Same as production app URL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Yes | App operator | Generate with a password manager or random generator | `32+ random chars` |
| `TOKEN_ENCRYPTION_KEY` | Yes | App operator/developer | Run `pnpm gen:key` locally and copy only the value into Vercel | `base64 string that decodes to 32 bytes` |
| `DATABASE_URL` | Yes | Supabase owner | Supabase dashboard -> Connect -> pooler transaction connection | `postgresql://USER.PROJECT:PASSWORD@REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Yes | Supabase owner | Supabase dashboard -> Connect -> direct or session connection for migrations | `postgresql://USER:PASSWORD@db.PROJECT.supabase.co:5432/postgres` |
| `MF_CLIENT_ID` | Yes | MF developer app admin | Money Forward developer app | `client id string` |
| `MF_CLIENT_SECRET` | Yes | MF developer app admin | Money Forward developer app | `client secret string` |
| `MF_REDIRECT_URI` | Yes | App/Vercel owner + MF app admin | Vercel production URL, then register in MF app callback settings | `https://your-app.vercel.app/api/auth/mf/callback` |
| `MF_AUTHORIZE_URL` | Yes | Developer | Fixed provider endpoint | `https://api.biz.moneyforward.com/authorize` |
| `MF_TOKEN_URL` | Yes | Developer | Fixed provider endpoint | `https://api.biz.moneyforward.com/token` |
| `MF_API_BASE_URL` | Yes | Developer | Money Forward Accounting API base | `https://api-accounting.moneyforward.com` |
| `MF_SCOPES` | Yes | MF developer app admin | MF app scope settings | space-separated scope string approved for offices/accounts/journals |
| `CRON_SECRET` | Yes | App operator | Generate with a password manager or random generator | `32+ random chars` |
| `LOG_LEVEL` | Optional | App operator | App policy | `info` |
| `ANTHROPIC_API_KEY` | Optional | Anthropic account admin | Anthropic console | `api key string` |
| `ANTHROPIC_MODEL` | Optional | App operator | App policy | `claude-opus-4-7` |
| `PUPPETEER_EXECUTABLE_PATH` | Optional | Platform operator | Only when a fixed Chrome path is required | `/path/to/chrome` |
| `CHROMIUM_DOWNLOAD_URL` | Optional | Platform operator | Only when Vercel needs an explicit Chromium tarball URL | `https://.../chromium.tar` |
| `MF_PATH_OFFICES` | Optional | Developer | Keep default unless MF API version changes | `/api/v3/offices` |
| `MF_PATH_ACCOUNTS` | Optional | Developer | Keep default unless MF API version changes | `/api/v3/accounts` |
| `MF_PATH_JOURNALS` | Optional | Developer | Keep default unless MF API version changes | `/api/v3/journals` |
| `MF_QUERY_OFFICE_ID` | Optional | Developer | Keep blank unless MF requires office query | blank |
| `MF_QUERY_PAGE` | Optional | Developer | Keep default | `page` |
| `MF_QUERY_PER_PAGE` | Optional | Developer | Keep default | `per_page` |
| `MF_QUERY_JOURNALS_FROM` | Optional | Developer | Keep default | `start_date` |
| `MF_QUERY_JOURNALS_TO` | Optional | Developer | Keep default | `end_date` |
| `MF_ACCOUNTS_PAGINATED` | Optional | Developer | Keep default unless accounts endpoint requires paging | `false` |

Production validation:

```bash
pnpm check:env:prod
```

This must pass before deployment is treated as production-ready.

## 3. Supabase Setup

### Project

1. Create a Supabase project for production.
2. Keep production separate from local/demo databases.
3. Optional but recommended: create a dedicated Prisma database user for the app and migrations.

### Connection Strings

Get connection strings from Supabase dashboard -> project -> Connect.

- `DATABASE_URL`: use the Supavisor transaction pooler for Vercel/serverless runtime.
- `DIRECT_URL`: use direct database connection or a session-style connection for Prisma CLI migrations.

Do not put real passwords in committed files.

### Migration

Run from a trusted local machine or CI with production env loaded:

```bash
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm check:db
```

Rules:

- Use `pnpm db:deploy`, not `pnpm db:migrate`, for production.
- `pnpm db:seed` seeds baseline CF classification rules.
- Do not run `pnpm db:seed:demo` in production.

### Connection Verification

```bash
pnpm check:env:prod
pnpm check:db
```

If connection fails, confirm:

- Supabase project is active.
- The database password is correct.
- `DATABASE_URL` uses the pooler transaction endpoint for runtime.
- `DIRECT_URL` is suitable for migrations.
- Vercel env changes were followed by a redeploy.

## 4. Vercel Setup

### Project Creation

1. Create or import the Git repository into Vercel.
2. Framework preset: Next.js.
3. Install command: Vercel default or `pnpm install`.
4. Build command: `pnpm build`.
5. Production branch: prefer `main` once the branch is renamed from `master`.

### Environment Variables

1. Open Vercel Project Settings.
2. Go to Environment Variables.
3. Add all required Production variables from this runbook.
4. Add optional variables only when needed.
5. Redeploy after any env change.

### Production URL

After the first production deployment, decide the final URL:

- Vercel generated domain: `https://your-app.vercel.app`
- Custom domain: `https://app.example.com`

Set these to the same final HTTPS origin:

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
MF_REDIRECT_URI=https://your-app.vercel.app/api/auth/mf/callback
```

Then register the same `MF_REDIRECT_URI` in the Money Forward developer app.

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
- `/api/sync/daily` rejects requests without `Authorization: Bearer <CRON_SECRET>`.
- Company switching only succeeds for companies in `user_companies`.
- Records returned from journals/documents/dashboard belong to the current `companyId`.
- Demo user does not exist in production.
- Demo company does not exist in production.
- `db:seed:demo` is never run against production.

Suggested production demo scan, run only from a trusted machine with production env loaded:

```bash
node -e "require('dotenv').config(); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); const d=String.fromCharCode(36)+'disconnect'; Promise.all([p.user.count({where:{email:'demo@example.com'}}), p.company.count({where:{name:'デモ株式会社'}})]).then(([users,companies])=>{console.log(JSON.stringify({demoUsers:users,demoCompanies:companies},null,2));}).finally(()=>p[d]())"
```

Expected:

```json
{
  "demoUsers": 0,
  "demoCompanies": 0
}
```

## References

- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables
- Vercel Managing Environment Variables: https://vercel.com/docs/environment-variables/managing-environment-variables
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase database connection guide: https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers
- Prisma migrate deploy: https://docs.prisma.io/docs/cli/migrate/deploy
