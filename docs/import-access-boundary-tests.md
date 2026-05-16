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

## Extension points for DB persistence

When a future import save API is added, extend this scaffold with:

- company A user cannot save rows into company B
- client-submitted `companyId` is ignored for persistence
- saved rows always use server-side current company context
- forbidden roles cannot create imported files, batches, rows, mappings, or journal drafts
- response bodies do not include another company's identifiers or data

## Non-goals

- No DB persistence in the current MVP.
- No Prisma schema or migration changes.
- No rate limit implementation.
- No storageRef implementation.
- No AI suggestion or automatic journal finalization.
