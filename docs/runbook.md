# Operations Runbook

## Daily Checks

- `/api/health` returns `ok`.
- Latest `mf_sync_history` is `success`.
- `failed` sync count is zero or explained.
- Dashboard loads for the main company.

## Manual Sync Failure

1. Open `/settings`.
2. Check latest sync history.
3. If `MF_AUTH_EXPIRED`, reconnect MF.
4. If `MF_RATE_LIMIT`, wait and retry.
5. If `MF_API_ERROR`, verify `src/lib/mf/endpoints.ts` against official docs.
6. If `MF_NO_OFFICE`, select office again.

## Document Generation Failure

1. If Claude API fails, local template fallback should still generate a draft.
2. Check `ANTHROPIC_API_KEY`.
3. Check generated document for `生成後チェック`.
4. Review suspicious amounts before PDF export.

## PDF Failure

1. Check `PUPPETEER_EXECUTABLE_PATH`.
2. On Vercel, verify Chromium runtime strategy.
3. Try exporting a short finalized document.

## Security Checks

- Never log access tokens.
- Never paste `.env.local` into issues or chat.
- Rotate `TOKEN_ENCRYPTION_KEY` only with a migration plan.
- Confirm every query includes `companyId` for tenant data.

## Before Financial Institution Submission

- Resolve all critical `要確認` journal rows.
- Confirm requested loan amount and repayment period.
- Confirm existing borrowings manually.
- Export PDF.
- Human review is required before submission.
