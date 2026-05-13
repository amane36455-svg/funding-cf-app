# Vercel + Supabase Deployment Guide

For the complete production readiness checklist, environment variable ownership table, Git staging notes, and access-control checks, see `docs/production-launch-runbook.md`.

## 1. Supabase

1. Create a Supabase project.
2. Create a Prisma-specific DB user if possible.
3. Set connection strings:
   - `APP_DATABASE_URL`: Supavisor transaction pooler for serverless runtime.
   - `APP_DIRECT_URL`: direct/session connection for Prisma migrations.
4. Store the values only in approved secret stores. Do not commit or print the values.
5. Run migrations from a trusted local machine or approved CI job only after human review.

```bash
pnpm db:generate
pnpm deploy:migrate
pnpm db:seed
pnpm check:env:prod
pnpm check:db
pnpm audit:api-scope
pnpm test
pnpm build
```

## 2. Vercel

1. Import the repository.
2. Set framework preset to Next.js.
3. Add environment variables from `.env.example`.
   - For Supabase/Vercel, use `.env.supabase.example` as the safer starting point.
   - Preview and Production must both define `APP_DATABASE_URL` and `APP_DIRECT_URL` when Prisma Client generation or build-time validation requires them.
4. Set `TOKEN_ENCRYPTION_KEY` to standard base64 that decodes to exactly 32 random bytes.
   - Generate it locally with `pnpm gen:key`.
   - Paste only the value after `TOKEN_ENCRYPTION_KEY=` into Vercel.
   - Do not use hex, a raw 32-character string, or a committed `.env` value.
5. Set `CRON_SECRET` to a random value of at least 16 characters.
6. Keep the Vercel build command as `pnpm build`.
7. Deploy.

## 3. Build / Migration Policy

`pnpm build` runs Prisma Client generation and Next.js build only. It does not run DB migrations.

Preview builds must not apply migrations. This keeps schema changes reviewable and prevents accidental DB writes from feature branches.

Run `pnpm deploy:migrate` only for Production deploys or manually approved staging checks. For accounting and tax-adjacent data, verify the migration SQL in staging before applying it to Production.

## 4. Cron

`vercel.json` schedules `/api/sync/daily` at `0 18 * * *`.

This is 18:00 UTC, equal to 03:00 JST.

Vercel Cron calls the endpoint with `GET` and sends:

```text
Authorization: Bearer <CRON_SECRET>
```

The route also accepts `POST` for local verification.

## 5. PDF

Local:

```env
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

Vercel:

- The app falls back to `@sparticuz/chromium-min` if `PUPPETEER_EXECUTABLE_PATH` is not set.
- If Vercel cannot bundle/download Chromium, set `CHROMIUM_DOWNLOAD_URL` to a compatible tarball URL.

## 6. Smoke Test After Deploy

Run the automated smoke check first:

```bash
pnpm smoke https://your-vercel-app.vercel.app
```

Then verify the authenticated business flow:

1. Open `/api/health`.
2. Sign up.
3. Create company.
4. Connect MF.
5. Select office.
6. Run manual sync.
7. Open dashboard.
8. Review journals.
9. Generate document.
10. Export PDF.

## References

- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Managing Cron Jobs: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Prisma Supabase guide: https://www.prisma.io/docs/v6/orm/overview/databases/supabase
