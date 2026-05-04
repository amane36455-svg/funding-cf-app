# Local Verification Report

## Completed

Date: 2026-05-02

The local Node.js toolchain and PostgreSQL-backed app flow were verified through migration status, seed data, tests, and production build.

## Toolchain

- Node.js: installed
- npm: installed
- pnpm: installed
- Prisma Client: generated

## Commands Verified

```bash
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm db:seed:demo
pnpm check:env
pnpm check:db
pnpm audit:api-scope
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:local
```

## Results

| Command | Result |
| --- | --- |
| `pnpm install` | Passed |
| `pnpm db:generate` | Passed |
| `pnpm db:deploy` | Passed: no pending migrations |
| `pnpm db:seed` | Passed |
| `pnpm db:seed:demo` | Passed |
| `pnpm check:env` | Passed |
| `pnpm check:db` | Passed |
| `pnpm audit:api-scope` | Passed: 16 routes |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed: 11 files / 16 tests |
| `pnpm build` | Passed |
| `pnpm smoke:local` | Passed |
| `pnpm typecheck` after demo seed | Passed |
| `pnpm build` after Next/PDF updates | Passed |

## Current Local Database

Local PostgreSQL is reachable through `.env.local`:

- Host: `localhost`
- Port: `55432`
- Database: `funding_cf`
- Demo login: `demo@example.com` / `password123`

The existing migration is applied. For non-interactive verification, use:

```bash
pnpm db:deploy
pnpm db:seed
pnpm db:seed:demo
pnpm check:db
```

`pnpm db:migrate --name init` still maps to Prisma `migrate dev`, which is intended for interactive local schema development. Use `pnpm db:deploy` for CI/headless checks.

## Remaining

Environment-bound checks remain:

- Set production `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`.
- Replace local dummy secrets for NextAuth, MF OAuth, and Cron before deployment.
- Replace local PostgreSQL URLs with Supabase `DATABASE_URL` and `DIRECT_URL`.
- Set `MF_REDIRECT_URI` to the production HTTPS callback URL.
- Confirm MF Cloud Accounting OAuth scopes and real data access with real credentials.
- Confirm PDF export on the deployed Vercel runtime.
- Run a deployed smoke test against Supabase/Vercel.

## Notes

- `.env.local` was created with local dummy values.
- Replace all MF and Anthropic values before real integration.
- Do not commit `.env.local`.
