# Migration Operations Guide

## Scope

This document defines the safe migration operation for Funding CF App.

It covers:

- build and migration separation
- Preview / staging / Production responsibilities
- PostgreSQL enum migration checks
- backup and rollback policy
- human approval gates

This document does not add or apply any database migration.

## Suggested ToC for Migration Docs

- Previewでmigrationしない運用
- stagingでの検証フロー
- Production migration実行フロー
- backup / rollback方針
- rollback困難な変更の注意点
- enum追加ルール
- Normalize Layer責務の整理

## Core Rules

- Build and migration must be separate steps.
- Preview builds must not run database migrations.
- Production migrations require human approval before execution.
- Staging verification should run before Production when schema changes affect customer, tenant, accounting, auth, or import data.
- Destructive migrations are prohibited unless a dedicated approval issue, backup plan, and rollback plan exist.
- Secrets, tokens, and database URLs must never be printed in logs, issues, PRs, screenshots, or docs.
- All tenant-owned tables must keep complete `companyId` separation.

## Vercel Env Presence Checklist

Check only whether each environment variable is configured. Do not print or paste values.

| Environment | APP_DATABASE_URL | APP_DIRECT_URL | NEXTAUTH_SECRET | NEXTAUTH_URL | NEXT_PUBLIC_APP_URL | TOKEN_ENCRYPTION_KEY |
| --- | --- | --- | --- | --- | --- | --- |
| Production | Confirm configured | Confirm configured | Confirm configured | Confirm configured | Confirm configured | Confirm configured |
| Preview | Confirm configured | Confirm configured | Confirm configured | Confirm configured | Confirm configured | Confirm configured |
| Development | Confirm configured when used | Confirm configured when used | Confirm configured | Confirm configured when used | Confirm configured when used | Confirm configured |

Rules:

- Values must live only in the approved secret store.
- Values must not be copied into GitHub issues, PR comments, docs, logs, screenshots, or chat.
- Preview should use a Preview/staging database, not Production, when write-capable database checks are required.

## Preview Redeploy Verification

After the user configures the required Vercel env names:

1. Trigger a Preview redeploy from Vercel or by pushing a no-op/docs commit.
2. Open the Preview deployment logs.
3. Confirm the previous missing env error for `APP_DIRECT_URL` no longer appears.
4. Confirm `pnpm build` starts and completes without invoking migration commands.
5. Confirm no secret, token, or database URL value is printed in logs.
6. Record only pass/fail and the deployment URL, not env values.

If the same env error remains, re-check whether the variable is set for the Preview environment specifically, not only Production.

## Build vs Migration

`pnpm build` should only perform application build work, such as Prisma Client generation and Next.js build.

Migration execution must be a separate command, for example:

```bash
pnpm deploy:migrate
```

Reason:

- Preview deployments should not write to shared databases.
- Migration timing must be reviewable by a human.
- Failed schema changes should not be mixed with static build failures.
- Accounting and finance data require conservative release control.

Build-time confirmation points:

- `package.json` build script does not include `migrate deploy`.
- `package.json` build script does not call `pnpm deploy:migrate`.
- Vercel build command is `pnpm build` or equivalent build-only command.
- CI/Preview logs do not show Prisma migration execution during build.
- `deploy:migrate` remains a separate human-approved release step.

## Preview Flow

Preview deployment is for code review and UI/API validation.

Preview must:

- run install/build/test checks only
- use Preview-specific environment variables when database access is required
- avoid migration execution
- avoid production data writes

Preview must not:

- apply Prisma migrations
- connect to Production for write tests
- seed demo data into Production
- expose secret or DB URL values in logs

## Staging Migration Flow

Use staging before Production when a migration changes schema, enum values, indexes, constraints, or tenant-owned tables.

Recommended flow:

1. Confirm migration SQL in the PR.
2. Confirm the target branch and commit SHA.
3. Confirm staging env variables are configured in the secret store.
4. Take a staging backup or confirm disposable staging policy.
5. Run Prisma Client generation.
6. Run migration against staging only.
7. Run smoke checks and relevant tests.
8. Confirm no cross-company data leakage.
9. Record the result in the PR or tracking issue.

Staging confirmation should include:

- migration command completed
- Prisma Client generation completed
- app booted
- basic auth flow works
- company selection still scopes data by `companyId`
- existing data remains readable
- newly added columns/defaults behave as expected

For the PR #10 multicompany migration line, staging must confirm:

- `pnpm deploy:migrate` runs against staging only
- `000002_company_role_add_values` is applied before `000003_user_companies_default_staff`
- `000003_user_companies_default_staff` is applied before `000004_customer_multicompany_foundation`
- new enum values exist after the enum migration
- legacy `MEMBER` values remain valid
- login, dashboard, company switch, and customers smoke checks pass

## Staging DB Allowlist Rules

The staging migration workflow must verify its target before running `pnpm deploy:migrate`.

`STAGING_DB_ALLOWED_HOSTS` is the allowlist used by `scripts/assert-staging-db.mjs`.

Rules:

- Register staging database hosts only.
- Do not register Production database hosts.
- Do not use `*` or any wildcard-style bypass.
- Store the value only in the GitHub `staging` Environment secret store.
- Do not paste the value into Issues, PRs, chat, screenshots, or logs.
- Changes to this allowlist require human review before the next staging migration run.
- If the staging database is recreated, update the allowlist through the same reviewed process.

The `production` / `prod` marker detection in `assert-staging-db.mjs` is only a secondary defense. The allowlist is the primary safety gate. A target that does not match the allowlist must fail before any migration command runs, even if it does not contain a production-like marker.

## Staging SQL Verification Points

Use a trusted database console or approved read-only verification script. Do not print connection strings or secrets.

Confirm migration order:

- `000002_company_role_add_values`
- `000003_user_companies_default_staff`
- `000004_customer_multicompany_foundation`

Confirm enum values:

- `ADMIN` exists
- `STAFF` exists
- `REVIEWER` exists
- `VIEWER` exists
- legacy `MEMBER` still exists

Confirm table/schema state:

- `user_companies.role` default is `STAFF`
- existing `user_companies` rows are still present
- existing `MEMBER` rows, if any, are still readable
- `user_preferences` exists
- `user_preferences.user_id` references `users.id`
- `user_preferences.current_company_id` references `companies.id`
- company metadata columns exist without destructive data rewrites

## Staging Smoke Test Points

After staging migration, verify:

- login succeeds
- dashboard loads for the selected company
- company switch works only for accessible companies
- customers page loads
- customer search/filter/favorite UI works
- recent customers reflect explicit company switch/open actions
- other-company data is not visible
- API scope audit remains green in CI

## Production Migration Flow

Production migration requires an explicit approval comment or release note.

Recommended flow:

1. Confirm staging migration result.
2. Confirm backup has completed and restore path is known.
3. Confirm migration SQL has been reviewed.
4. Confirm there is no destructive operation.
5. Confirm no secret or DB URL will be printed.
6. Pause risky user operations if needed.
7. Run the migration from a trusted terminal or approved CI job.
8. Run production smoke checks.
9. Record completion and any follow-up issue.

Production migration should be treated as a release operation, not a build side effect. This section describes the required procedure for a future approved release; it is not approval to run Production migration now.

## PostgreSQL Enum Migration Notes

Tracking issue: https://github.com/amane36455-svg/funding-cf-app/issues/11

PostgreSQL enum changes need special care because `ALTER TYPE ... ADD VALUE` has transaction block behavior that can differ by PostgreSQL version and migration tooling. Some combinations of PostgreSQL, migration wrappers, and transaction modes can reject or delay the usability of newly added enum values inside the same migration transaction.

Before applying enum changes:

- inspect the generated Prisma migration SQL
- confirm whether `ALTER TYPE ... ADD VALUE` appears
- confirm whether the target PostgreSQL version allows the generated SQL in the migration transaction mode
- run the exact migration against staging
- confirm Prisma `migrate deploy` behavior matches the migration SQL
- confirm existing enum values remain valid
- avoid replacing enum types or rewriting production rows unless separately approved

Enum migration design rules:

- Put enum value additions in an independent migration.
- Do not reference a newly added enum value as a column default in the same migration that adds it.
- Apply default changes in the next migration after the enum values exist.
- Keep legacy values such as `MEMBER` until a dedicated migration plan safely maps existing data.
- Treat enum cleanup or removal as a separate, human-approved issue.

For `CompanyRole`, keep legacy values such as `MEMBER` until a dedicated migration plan safely maps existing data.

## Backup Policy

Before Production migration:

- confirm an automated database backup exists
- take a manual backup for schema-changing releases when available
- verify the backup timestamp and target environment
- confirm who can restore the backup
- never paste backup URLs, credentials, or connection strings into GitHub or chat

For large or sensitive migrations, require a restore drill in staging before Production.

## Rollback Policy

Database rollback is not the same as code rollback.

Code rollback:

- revert or redeploy the previous application version when needed
- confirm the previous version is compatible with the migrated schema

Database rollback:

- prefer forward-fix migrations when data has already changed
- use backup restore only after human approval
- avoid destructive down migrations on Production
- document any manual repair query in a private runbook, not in public logs

Enum rollback caution:

- PostgreSQL enum values are not safely removed as a normal rollback path.
- If an added enum value is unused, leave it in place unless a dedicated cleanup issue is approved.
- If new enum values are already used by rows, rollback requires a data mapping plan first.

## Human Approval Checklist

Before Production migration, confirm:

- [ ] target branch and commit are correct
- [ ] migration SQL was reviewed
- [ ] staging result is recorded
- [ ] backup is available
- [ ] rollback or forward-fix policy is clear
- [ ] no destructive migration is included
- [ ] no secret, token, or DB URL will be logged
- [ ] `companyId` separation is unaffected
- [ ] smoke test owner is assigned

## Out of Scope

The following are not part of this document or PR:

- CSV/Excel import implementation
- PDF/OCR
- Tatsujin integration
- tax calculation implementation
- payroll
- audit log implementation
- RLS implementation
