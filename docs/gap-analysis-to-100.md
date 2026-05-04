# Gap Analysis: 60% -> 100%

## Summary

The MVP is now code-complete for local/business-flow verification.

The remaining 100% blockers are external integration items:

- Real MF OAuth credentials
- Production Supabase/Vercel environment values

## Gap Matrix

| Area | 60% Gap | Action Taken | Status |
| --- | --- | --- | --- |
| Node/pnpm runtime | Toolchain was missing | Installed Node.js and pnpm | Resolved |
| Type safety | Not executed | Ran `pnpm typecheck` | Resolved |
| Unit tests | Not executed | Ran `pnpm test` | Resolved |
| Production build | Not executed | Ran `pnpm build` | Resolved |
| Next.js security warning | Old 14.2.15 version | Updated to 14.2.35 | Resolved |
| MF API query/path uncertainty | Hardcoded paths/query names | Updated defaults to official v3 API and kept env overrides | Resolved, pending real-account smoke |
| 429/5xx retry | Only simple errors | Added retry with backoff and jitter | Resolved |
| Vercel Cron | POST-only route | Added GET support | Resolved |
| Vercel PDF | Local Chrome only | Added `@sparticuz/chromium-min` fallback | Mitigated |
| DB migration | Local DB was unavailable | Local PostgreSQL verified and migration state checked | Resolved locally |
| Demo without MF | No sample data | Added `db:seed:demo` | Resolved after DB setup |
| Production operations | No runbook | Added runbook/checklists/risk register | Resolved |

## Remaining External Dependencies

### 1. Production Database

Local PostgreSQL is now reachable on `localhost:55432`, the demo dataset loads, and Prisma reports no pending migrations. Production still needs Supabase/Vercel connection strings and a deployment smoke test.

Run:

```bash
pnpm db:deploy
pnpm db:seed
pnpm db:seed:demo
pnpm check:db
```

### 2. MF Cloud Accounting API

Confirmed:

- OAuth authorize/token endpoint.
- API Base URL: `https://api-accounting.moneyforward.com`
- offices/accounts/journals paths: `/api/v3/offices`, `/api/v3/accounts`, `/api/v3/journals`
- journals period query: `start_date`, `end_date`
- journals paging query: `page`, `per_page`
- journal details shape: `branches[].debitor` / `branches[].creditor`

Prepared mitigation:

- `MF_PATH_*`
- `MF_QUERY_*`
- tolerant schemas in `src/lib/mf/types.ts`
- `.env.supabase.example` for production-style configuration

Still requires real credentials to verify scopes and actual tenant data access.

### 3. Production PDF

Implemented:

- local Chrome path via `PUPPETEER_EXECUTABLE_PATH`
- Vercel fallback via `@sparticuz/chromium-min`
- optional `CHROMIUM_DOWNLOAD_URL`

Production confirmation still needed on Vercel.

## Verified Commands

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

Results:

- Environment check: passed locally
- DB check: passed
- API scope audit: passed for 16 routes
- Typecheck: passed
- Tests: 11 files, 16 tests passed
- Build: passed
- Local smoke: passed

## Definition of 100%

The project reaches practical MVP 100% when:

1. Production Supabase or PostgreSQL is connected.
2. Production migration succeeds.
3. Production seed succeeds if baseline rules are needed.
4. `/api/health` returns ok in the deployed environment.
5. Login -> dashboard works with demo data.
6. MF real OAuth succeeds with production scopes.
7. Manual sync succeeds against real MF data.
8. PDF export works on deployment.

The codebase is ready for these final environment-bound checks.
