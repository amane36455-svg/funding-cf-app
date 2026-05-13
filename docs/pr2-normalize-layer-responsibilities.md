# PR2 Normalize Layer Responsibilities

## Scope

This document prepares PR2 for CSV/Excel import MVP without implementing it.

It defines the responsibilities of the future normalize layer tables:

- `imported_files`
- `import_batches`
- `journal_entries`
- `journal_entry_lines`
- `financial_statement_lines`
- `tax_summary_lines`
- `mapping_rules`

No migration is added in this PR.

## Suggested ToC for Normalize Layer Docs

- Normalize Layer責務の整理
- file storage policy
- import lifecycle and cancellation
- mapping rules and priority
- validation responsibilities
- companyId isolation
- PR2 design tasks and dependencies
- MVP out-of-scope items, including AI suggestion

## Non-Negotiable Rules

- Every tenant-owned row must be scoped by `companyId`.
- Data from one company must never be visible to another company.
- Raw source data must not be overwritten by normalized output.
- Import preview must happen before execution.
- Automatic journal finalization is prohibited in the MVP.
- PR2 MVP must not include AI suggestion, AI inference, or automatic mapping decisions.
- Tax category conversion is advisory and requires human review.
- Secrets, tokens, API keys, and DB URLs must never be logged or committed.

## Layer Overview

The normalize layer should separate these concerns:

- file receipt and immutable source metadata
- import attempt lifecycle
- normalized journal header rows
- normalized journal line rows
- financial statement rows for analysis
- tax summary rows for review
- company-specific mapping rules

The first MVP should favor traceability and reviewability over full automation.

## Table Responsibilities

| Table | Responsibility | Key Points |
| --- | --- | --- |
| `imported_files` | Stores metadata for uploaded or pasted source files. | Keep original file metadata, source system, encoding, checksum, `storageRef`, uploader, and `companyId`. Do not store raw file bodies in DB by default. Do not mutate raw source data. |
| `import_batches` | Represents one import/preview/execute attempt. | Links to `imported_files`, tracks source template, status, row counts, warnings, errors, preview confirmation, cancellation, and execution result. |
| `journal_entries` | Normalized journal header candidates. | One voucher or journal unit. Holds date, description, source row reference, total debit/credit, validation status, and `companyId`. Not an automatically confirmed journal. |
| `journal_entry_lines` | Normalized journal debit/credit line candidates. | Holds side, amount, account, sub-account, department, tax category, description, mapping confidence, and review flags. |
| `financial_statement_lines` | Normalized financial statement rows for dashboard and analysis. | Holds period, statement type, account/category, amount, source reference, and `companyId`. Must remain separated from journal import confirmation. |
| `tax_summary_lines` | Normalized tax summary rows for review. | Holds source tax category, normalized tax category candidate, taxable amount, tax amount, confidence, and human review status. No tax judgment is final. |
| `mapping_rules` | Company-specific mapping rules from source values to normalized values. | Stores source system/template, field name, source value, target value, confidence, priority, active flag, and `companyId`. Rules must not cross companies. |

## Storage Policy for Imported Files

`imported_files` should store metadata and a storage pointer, not the raw file body, unless a separate security review approves DB storage.

Recommended fields for future design:

- `companyId`
- `uploadedById`
- `sourceSystem`
- `originalFileName`
- `mimeType`
- `encoding`
- `fileSizeBytes`
- `checksumSha256`
- `storageRef`
- `createdAt`

Raw files should live in an approved object storage layer. The DB row should reference them through `storageRef`. Logs must not print raw file contents, customer names, amounts, or storage credentials.

## Suggested Common Columns

These are design candidates for a future migration, not an implementation in this PR.

- `id`
- `companyId`
- `createdById`
- `createdAt`
- `updatedAt`
- `sourceSystem`
- `status`
- `rawJson` or source snapshot reference where appropriate

For tables derived from a file or batch:

- `importedFileId`
- `importBatchId`
- `sourceRowNumber`
- `sourceHash`
- `validationErrors`
- `reviewStatus`

## Import Lifecycle Candidate

Suggested lifecycle:

1. `uploaded`: source file or pasted data received
2. `parsed`: rows parsed with encoding and format detection
3. `normalized`: candidate rows generated
4. `previewed`: user can inspect results
5. `needs_review`: unresolved mappings or validation errors exist
6. `confirmed`: user confirmed preview
7. `exported`: MF import CSV or other target file generated
8. `failed`: parsing or validation failed
9. `cancelled`: user cancelled the batch

The MVP should stop at preview and export. It should not post directly to MF as final journal data.

## Cancellation Policy

When an `import_batches` row is cancelled:

- mark the batch status as `cancelled`
- keep `imported_files` metadata for traceability unless retention policy says otherwise
- mark derived `journal_entries`, `journal_entry_lines`, `financial_statement_lines`, and `tax_summary_lines` as cancelled, ignored, or not exportable
- do not hard-delete normalized rows by default
- prevent cancelled rows from export and downstream journal creation
- keep cancellation scoped to the same `companyId`

If a future retention policy deletes data, it must preserve auditability without leaking other company data.

## Mapping Rule Policy

`mapping_rules` should support template-based conversion first.

Recommended first targets:

- MF journal import template
- Money Forward journal CSV import source
- JDL/freee/Yayoi/Miroku source templates as future expansion

Rules should be:

- company-specific by default
- versionable or auditable later
- reviewable before reuse
- able to mark uncertain values as unresolved

Priority policy:

- lower numeric `priority` wins
- exact source-system/template matches beat generic rules when priority is equal
- company-specific rules beat shared defaults when priority is equal
- if two active rules still collide, do not choose silently; mark the row as `needs_review`
- never let a mapping rule from one `companyId` apply to another `companyId`

Never silently map uncertain tax categories. Display unresolved values and require human confirmation.

## AI Suggestion Policy

PR2 MVP must not include AI suggestion.

Specifically out of scope for PR2 MVP:

- AI mapping suggestions
- AI journal candidate generation
- automatic account inference
- automatic tax category inference
- automatic approval or finalization

AI assistance can be reconsidered after deterministic parsing, manual mapping, preview, validation, and company isolation are stable.

## Validation Responsibilities

The normalize layer should detect and report:

- missing required columns
- invalid dates
- invalid amounts
- debit/credit imbalance
- unsupported encoding
- unsupported source template
- unknown account names
- unknown sub-account names
- unknown department names
- unknown or risky tax categories
- rows that cannot be tied back to source data

Errors should be stored per batch and per row so the user can correct them without losing source traceability.

## Company Isolation

Every query for imported or normalized data must include `companyId` or verify company membership before access.

Minimum test expectations for PR2 implementation:

- user A cannot list company B imported files
- user A cannot preview company B import batches
- user A cannot export company B normalized rows
- mapping rules from company A are not applied to company B
- row-level validation cannot leak names, amounts, or source snippets across companies

## PR2 Design Task Dependencies

Do these design tasks before PR2 implementation, in this order:

1. Upload storage policy
   - Decide object storage provider or local-only fallback.
   - Decide file size limit, retention, virus/malware handling if applicable, and allowed extensions.
   - Output: storage policy and `storageRef` format.

2. File size, MIME, and character encoding policy
   - Depends on upload storage policy.
   - Decide max upload size, CSV/Excel MIME handling, UTF-8 and Shift_JIS detection, and mojibake warning policy.
   - Output: parser input contract.

3. Parser selection
   - Depends on size and encoding policy.
   - Choose CSV parser and Excel parser libraries.
   - Confirm streaming or bounded-memory behavior for large files.
   - Output: parser decision and fixture plan.

4. Preview API shape
   - Depends on parser output contract.
   - Define request/response JSON, max preview rows, error format, warning format, and no client-supplied `companyId` rule.
   - Output: `/api/imports/preview` contract.

5. Manual mapping UI model
   - Depends on preview API shape.
   - Define system fields, source column indexes, required fields, and mapping state format.
   - Output: mapping JSON shape.

6. `mapping_rules` design
   - Depends on manual mapping model.
   - Define priority, collision behavior, source-system/template scope, and company-only reuse.
   - Output: non-destructive schema proposal for a later migration PR.

7. Leakage test policy
   - Depends on preview API and mapping rule design.
   - Define tests proving company A cannot read, preview, map, export, or infer company B data.
   - Output: unit/integration test plan.

8. MF export scope decision
   - Depends on normalized fields and validation rules.
   - Decide whether PR2 exports only preview JSON, MF import CSV, or both.
   - Keep direct MF posting out of scope.
   - Output: export scope issue.

9. AI suggestion exclusion confirmation
   - Applies to all previous tasks.
   - Confirm PR2 MVP excludes AI suggestion/inference/auto mapping/auto approval.
   - Output: explicit PR checklist item.

## Out of Scope for PR2 Preparation

The following are not implemented in this preparation document:

- CSV/Excel parser
- upload UI
- database migration
- file storage implementation
- MF direct posting
- automatic journal finalization
- AI suggestion or inference
- PDF/OCR
- Tatsujin output
- tax calculation implementation
- payroll
- audit log implementation
- RLS implementation

## Next PR Candidates

1. Decide upload storage, size limit, encoding policy, and parser libraries.
2. Define preview API request/response shape and error format.
3. Define manual mapping UI state and required system fields.
4. Add leakage test plan for import preview and mapping rules.
5. Decide MF export scope after preview and validation design are stable.
