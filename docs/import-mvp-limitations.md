# CSV / Excel Import MVP Limitations

## Purpose

This document records the current behavior, limitations, and operating rules for the CSV / Excel import MVP.

The MVP covers import preview through draft save. It does not confirm journal entries, export data, or automate accounting decisions. All saved rows are draft / candidate data for human review.

## Current Capabilities

- CSV upload.
- Excel `.xlsx` upload.
- Header parsing.
- Manual column mapping.
- JSON preview.
- Excel date serial normalization for columns mapped as date fields.
- Draft save from the `/imports` screen.
- Ready rows only are saved as draft / candidate data.
- `needs_review` rows are not saved.
- Save button UI is available after preview and mapping.
- `companyId` is resolved only from server-side `currentCompanyId`.
- The client does not send `companyId`.
- VIEWER and REVIEWER cannot run import preview or save import drafts.
- OWNER, ADMIN, STAFF, and legacy MEMBER can run preview and save drafts.

## Current Limits

- File size is limited by `IMPORT_LIMITS.maxFileSizeBytes` and is currently aligned to Vercel payload constraints.
- CSV supports UTF-8, UTF-8 BOM, and Shift_JIS.
- Excel support is limited to `.xlsx`.
- Excel MVP reads the first sheet only.
- Preview displays a limited number of rows.
- Maximum row and column limits are enforced before processing.
- Excel date serial values are normalized only when the column is manually mapped to a date field.
- Numeric values in amount or unmapped columns are not treated as dates.
- The saved data is a draft and is not a confirmed journal.

## Not Supported Yet

- confirm API.
- cancel API.
- update/delete API.
- export.
- storageRef implementation.
- raw file storage.
- AI suggestion.
- mapping_rules CRUD.
- rate limit.
- `needs_review` correction UI.
- automatic journal finalization.
- direct registration to Money Forward.

## Saved Data

The draft save flow can create records in the following tables:

- `imported_files`
- `import_batches`
- `journal_entries`
- `journal_entry_lines`

Saved data policy:

- `preview_snapshot` stores summary data only.
- `preview_snapshot` does not store the full uploaded file.
- `preview_snapshot.first5Rows` may contain actual row values from the imported file.
- `mapping_snapshot` stores only the mapping used for the save.
- `storage_ref` is currently `NULL` in the MVP.
- `journal_entries` and `journal_entry_lines` are draft / candidate records.
- `needs_review` rows are filtered out server-side and are not saved.

## Security And Logging Rules

- Do not paste real customer data into Issues, PRs, chat, Notion, or logs.
- Do not paste uploaded file contents into Issues, PRs, chat, Notion, or logs.
- Do not output secrets, DB URLs, tokens, passwords, cookies, or API keys.
- API responses should not include `companyId`, user IDs, role names, or file contents.
- Runtime logs should not include file contents, customer data, secrets, DB URLs, tokens, passwords, or cookies.
- Staging smoke tests must use dummy data only.
- Production DB operations require explicit human approval.
- Manual SQL cleanup should not be used as part of normal import testing.
- Treat `/imports` screenshots and screen shares as sensitive because the screen can show file names, mapped row values, JSON preview values, and import IDs.
- Do not paste JSON preview text, screenshots, or `importBatchId` values into Issues, PRs, chat, Notion, or logs unless the content is dummy data or fully redacted.

## Remaining Draft Data

- The MVP has no cancel/delete UI yet.
- Smoke test draft data may remain in the staging database.
- Do not run manual `DELETE`, `ALTER`, or other ad hoc DB changes for cleanup.
- Test draft cleanup should be handled after cancel/delete APIs are designed and implemented.
- Until cancel/delete exists, staging smoke test records should be treated as known test residue.

## Operational Notes

- Save API reparses and remaps the uploaded file server-side.
- Preview results are not trusted as the source of truth for DB save.
- If there are no ready rows, save is rejected.
- If required mappings are missing, the UI disables save.
- If a row needs review, it should remain outside the saved draft until a future correction flow exists.
- Import MVP does not make tax, accounting, financing, legal, or labor judgments.
- Human review is required before any downstream confirmation or export workflow.

## Next Phase Candidates

- cancel API.
- confirm API.
- ImportPreviewClient client-side leakage audit.
- import preview / save API rate limit.
- `needs_review` actionable UI.
- raw value and normalized value side-by-side UI.
- export flow.
- Formula Injection protection for CSV export.
- storageRef and raw file storage design.
- mapping_rules CRUD and permission model.

## Explicit Non-Goals For This Document

- No implementation changes.
- No DB changes.
- No Prisma schema changes.
- No migration additions.
- No production DB operations.
- No staging migration reruns.
