# Production Readiness Checklist

## Environment

- `DATABASE_URL` is Supabase transaction pooler URL.
- `DIRECT_URL` is direct/session URL for migrations.
- `NEXTAUTH_SECRET` is set.
- `TOKEN_ENCRYPTION_KEY` is standard base64 that decodes to exactly 32 random bytes, generated with `pnpm gen:key`, and backed up securely.
- `MF_CLIENT_ID` and `MF_CLIENT_SECRET` are set.
- `MF_REDIRECT_URI` exactly matches MF developer console.
- `CRON_SECRET` is at least 16 characters.
- `ANTHROPIC_API_KEY` is set if Claude generation is enabled.

## Database

- `pnpm db:generate` passes.
- `pnpm db:deploy` passes.
- `pnpm db:seed` passes.
- `pnpm check:env:prod` passes.
- `pnpm check:db` passes.
- `pnpm audit:api-scope` passes.
- `pnpm test` passes.
- `pnpm build` passes.

## Application

- `/api/health` returns ok.
- `pnpm smoke <deployed URL>` passes.
- `/signup` works.
- `/onboarding` works.
- `/settings` loads.
- MF OAuth callback succeeds.
- office selection works.
- manual sync succeeds.
- dashboard shows CF.
- journal review allows manual override.
- document generation works.
- document edit/save works.
- PDF export works.

## Security

- Tokens are encrypted in `mf_connections`.
- Logs do not contain token values.
- All tenant data queries include `companyId`.
- Cron endpoint rejects invalid Authorization header.
- PDF output does not include unnecessary secrets.

## Operational

- Daily sync is visible in Vercel Cron Jobs.
- Failed sync creates `mf_sync_history.status = failed`.
- Operators know how to reconnect MF.
- Operators know how to resolve `要確認` journals.
- Runbook is available.
