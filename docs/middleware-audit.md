# middleware and API guard audit

## Scope

This memo records the guard decision for `middleware.ts` and `/api/imports/preview`.

## Current middleware matcher

`middleware.ts` currently protects browser page routes only:

- `/dashboard/:path*`
- `/settings/:path*`
- `/documents/:path*`
- `/onboarding`

`/api/imports/preview` is not matched by middleware.

## Import preview API guard

`/api/imports/preview` is protected inside the route handler:

- `getUserAndCompanyForApi()` requires an authenticated session and a selected company.
- Missing session or company context returns `401`.
- `canRunImportPreview(context.role)` denies `REVIEWER` and `VIEWER`.
- Denied roles return `403` before reading `request.formData()` or parsing the uploaded file.
- Allowed roles are `OWNER`, `ADMIN`, `STAFF`, and legacy `MEMBER`.
- The route does not accept `companyId` from the client.
- The response must not include role names, `companyId`, user identifiers, secrets, DB URLs, tokens, passwords, or uploaded file contents.

## Middleware decision

No middleware matcher change is required for `/api/imports/preview` at this stage.

Reasons:

- Existing API routes use route-level authentication and company context guards.
- `pnpm audit:api-scope` verifies that non-public API routes require session or API company context.
- Adding API routes to middleware broadly could change behavior for auth callbacks, health checks, cron routes, and other API endpoints.
- The import preview route needs a role check, which belongs in server-side route logic rather than path-only middleware.

## Required tests

The import preview route should keep tests for:

- unauthenticated request returns `401`
- `VIEWER` returns `403`
- `REVIEWER` returns `403`
- `OWNER`, `ADMIN`, `STAFF`, and `MEMBER` can preview
- denied roles are rejected before request body parsing
- forbidden responses do not expose role names, `companyId`, or user information
- existing parser and date serial tests continue to pass

## Future review points

- If API-wide middleware is introduced later, public auth/signup/health and cron routes need explicit exclusions.
- If rate limiting is added, it should be designed separately from this middleware guard.
- If DB persistence is added for imports, the save route must add its own role and companyId guard before storage or database writes.
