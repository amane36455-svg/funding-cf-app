# import access boundary tests

## Purpose

Before import preview grows into DB persistence, the test suite must catch tenant and role boundary regressions.

The current scaffold uses mocked server-side auth context. It does not connect to a database and does not persist files or import rows.

## Current coverage

`tests/integration/imports/preview-access-boundary.test.ts` verifies:

- unauthenticated requests return `401`
- `VIEWER` and `REVIEWER` return `403`
- denied roles are rejected before upload body parsing
- `OWNER`, `ADMIN`, `STAFF`, and legacy `MEMBER` can run preview
- client-submitted `companyId` is ignored
- responses do not echo server-side company or user identifiers

## Mock scaffold vs real DB integration

The mocked scaffold is the fast contract layer for preview-only route behavior. It verifies
auth, role guards, spoofed client `companyId`, and response shape without touching a database.

Real DB integration tests are the persistence safety layer. They run against an isolated CI
PostgreSQL service container, apply committed Prisma migrations with `pnpm deploy:migrate`, and
verify tenant boundaries against the migrated schema. They must never use Preview, staging, or
Production databases.

`pnpm test` remains the existing unit and mocked integration suite. `pnpm test:integration:db`
runs only the real DB project and must be guarded by `scripts/assert-test-db.mjs`.

## Real DB coverage

`tests/integration-db/imports/access-boundary-db.test.ts` verifies:

- company membership queries stay scoped to the server-side user and company
- migrated `CompanyRole` enum values match the import preview role boundary
- `user_companies.company_id` foreign key constraints are enforced by the migrated schema

This is infrastructure only. It does not add import save APIs, DB persistence, or schema changes.

## Extension points for DB persistence

When a future import save API is added, extend this scaffold with:

- company A user cannot save rows into company B
- client-submitted `companyId` is ignored for persistence
- saved rows always use server-side current company context
- forbidden roles cannot create imported files, batches, rows, mappings, or journal drafts
- response bodies do not include another company's identifiers or data
- UPDATE and DELETE paths cannot cross tenant boundaries
- cascade deletes do not affect data belonging to another company

DB persistence PRs must not be treated as ready until real DB integration coverage exists for the
new write path.

## CI guardrails

- The CI database is a temporary PostgreSQL service container only.
- The PostgreSQL major version should stay aligned with the Supabase major version used for
  staging and Production.
- `scripts/assert-test-db.mjs` rejects production-like or staging-like targets before tests run.
- Workflow logs must not print DB URLs, passwords, tokens, customer records, or uploaded file
  contents.
- Fixture data must use placeholders only.

## Non-goals

- No DB persistence in the current MVP.
- No Prisma schema or migration changes.
- No rate limit implementation.
- No storageRef implementation.
- No AI suggestion or automatic journal finalization.
