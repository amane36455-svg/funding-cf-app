# Import Client-Side Leakage Audit

## Scope

This audit covers the current `/imports` client-side surface after the CSV / Excel import MVP and draft save flow.

Reviewed files:

- `src/components/imports/ImportPreviewClient.tsx`
- `src/lib/imports/save-ui.ts`
- `src/app/api/imports/preview/route.ts`
- `src/app/api/imports/save/route.ts`
- `tests/unit/imports/save-ui.test.ts`
- `tests/integration/imports/preview-access-boundary.test.ts`
- `tests/integration-db/imports/save-route-db.test.ts`
- `docs/import-mvp-limitations.md`

## Summary

No client-side console logging, browser storage persistence, URL query persistence, or client-submitted `companyId` was found in the import preview / save UI.

The `/imports` screen intentionally displays imported row values for preview and review. That means screenshots, screen shares, copied JSON preview text, and save-result screenshots must be treated as sensitive, even though the code is not logging those values.

## Findings

### Console Output

Result: No issue found.

- No `console.log`, `console.error`, or `console.warn` usage was found in the import UI or save UI helper.
- Uploaded file content is not written to console.
- API responses are not written to console.
- Save results are displayed in the UI but are not logged.

### Browser Storage

Result: No issue found.

- No `localStorage` usage was found in the import UI.
- No `sessionStorage` usage was found in the import UI.
- Uploaded files, mapping JSON, preview rows, and save results are kept in React component state only.

### URL / Navigation Leakage

Result: No issue found.

- No URL query, hash, path, `URLSearchParams`, or browser history usage was found for import data.
- Mapping JSON and file contents are not placed in the URL.

### Client Payloads

Result: No issue found.

- Preview request sends only the selected file.
- Save request sends only:
  - `file`
  - `mapping`
- `buildImportSaveFormData()` does not append `companyId`.
- Unit tests assert that `companyId` is not present in the save FormData.
- Server-side routes continue to resolve company context from authenticated session / current company selection.

### Response And UI Display

Result: Expected sensitive display surface; operational caution required.

The UI intentionally displays source-derived values:

- selected file name
- parsed preview rows
- mapped account names, descriptions, tax categories, and amounts
- JSON preview rows
- save result counts
- `importBatchId`

The save API response display does not include `companyId`, user ID, role name, or file contents. However, the preview table and JSON preview intentionally include imported row values, and file names may contain customer-identifying text.

Operational rule:

- Do not paste `/imports` screenshots, JSON preview text, file names, row values, or `importBatchId` into Issues, PRs, chat, Notion, or logs unless the content is dummy data or fully redacted.

### `importBatchId` Display

Result: Acceptable with handling rules.

- `importBatchId` is displayed after a successful draft save so the user can identify the saved draft on-screen.
- It is not logged by the client.
- It should not be pasted into public Issue / PR / chat / log records.
- If support needs the ID later, use a controlled internal workflow rather than broad chat or Issue comments.

### `preview_snapshot.first5Rows`

Result: Documented risk.

- `docs/import-mvp-limitations.md` already states that `preview_snapshot.first5Rows` may contain actual row values from the imported file.
- This audit adds an explicit screenshot / screen-sharing caution to the MVP limitations document.

## Non-Issues Confirmed

- No client-side `companyId` submission.
- No client-side user ID submission.
- No role name submission.
- No secret, DB URL, token, password, or cookie output.
- No raw file content logging.
- No browser storage persistence.
- No URL persistence.
- No implementation of confirm, cancel, update/delete, export, storageRef, raw file storage, AI suggestion, or rate limit.

## Remaining Risks

- The preview table and JSON preview are inherently sensitive because they show imported row values.
- File names can contain customer names or transaction context.
- Save success displays `importBatchId`.
- Browser screenshots and screen recordings can capture sensitive values.
- Browser extensions or user-installed tooling are outside this application audit.

## Required Operating Rules

- Use dummy data for smoke tests and screenshots whenever possible.
- Redact file names, preview rows, JSON preview, and import IDs before sharing.
- Do not paste real imported row values into Issues, PRs, chat, Notion, or logs.
- Do not paste secret values, DB URLs, tokens, passwords, cookies, or API keys anywhere.
- Treat `/imports` screen shares as sensitive operational material.
- Production DB operations still require explicit human approval.

## Follow-Up Candidates

- Add a dedicated `show JSON preview` toggle if the JSON preview becomes too easy to expose in screenshots.
- Add a masked support-copy mode for save result metadata.
- Add rate limiting for preview / save APIs.
- Add cancel/delete APIs so staging smoke test drafts can be cleaned up through application flows.
- Add a needs_review correction UI with the same no-log / no-storage / no-URL rules.
