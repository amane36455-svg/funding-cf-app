# Accounting Software Conversion Hub

## Scope

This document organizes future requirements for an accounting software conversion hub.

It is a planning document only. It does not add a database migration, Prisma schema change, API, parser implementation, export implementation, or vendor-specific format finalization.

## Purpose

The conversion hub should support transforming accounting exports through an intermediate normalized format, then producing reviewed export files for another accounting software.

Target source examples:

- JDL
- Yayoi
- freee
- Miroku
- Money Forward
- other CSV/Excel formats

Target output examples:

- Money Forward import CSV draft
- Yayoi CSV draft
- freee CSV draft
- JDL-oriented export assistance after official specs or user-provided samples are confirmed
- Miroku-oriented export assistance after official specs or user-provided samples are confirmed

## Core Policy

Use an intermediate format instead of direct source-to-target conversion.

Reason:

- each accounting software has different columns and semantics
- vendor formats can change
- tax category mapping candidates require human review
- original data must stay immutable
- source rows need traceability to output rows
- future exporters should reuse the same normalized layer

## PR2 Relationship

PR2 is not the conversion hub.

PR2 is limited to:

- CSV/Excel upload
- header parse
- manual mapping
- preview
- validation
- JSON preview
- no DB insert in the first step
- no AI suggestion

The conversion hub is a post-PR2 expansion that depends on:

- parser selection
- preview API shape
- manual mapping UI
- validation model
- normalized row shape
- company leakage tests
- formula injection protection

## Epic: 会計ソフト変換ハブ

Issue candidates:

1. 中間フォーマット設計
   - journal header draft
   - journal lines draft
   - trial balance lines
   - account master rows
   - tax category mapping candidates
   - source row reference

2. 汎用インポーター
   - file upload/paste input reuse
   - header detection
   - manual mapping
   - per-row validation
   - source template selection

3. `mapping_rules`拡張
   - source system
   - source template
   - field name
   - source value
   - target value
   - priority
   - collision behavior
   - company-only application

4. `export_format_definitions`設計
   - target system
   - output columns
   - required fields
   - formatting rules
   - versioning
   - official specs or user-provided sample dependency

5. MF出力
   - MF import CSV draft output
   - formula injection protection
   - human preview before download

6. 弥生出力
   - official/user sample required before fixing format
   - no speculative fixed mapping

7. freee出力
   - official/user sample required before fixing format
   - no direct posting in MVP

8. JDL / ミロク
   - do not hard-code fixed specs without official docs or user-provided samples
   - provide generic export assistance after format confirmation
   - design as templates, not irreversible assumptions

## Future DB Candidates

Candidates only. Do not add migrations until schema review.

| Table | Purpose |
| --- | --- |
| `export_format_definitions` | Target export format definitions and versions |
| `conversion_jobs` | Source-to-target conversion attempts |
| `conversion_rows` | Per-row normalized conversion results |
| `mapping_rules` | Company-specific and template-specific mapping rules |
| `imported_files` | Source file metadata and storage reference |
| `import_batches` | Import/preview/validation lifecycle |
| `journal_entries` | Normalized journal header candidates |
| `journal_entry_lines` | Normalized journal line candidates |

## Validation and Safety

- Never overwrite source files.
- Keep source row number and source hash where possible.
- Tax category mapping candidates must be `needs_review` unless explicitly confirmed.
- Unknown columns must be visible to the user.
- Unmapped required fields must block export.
- Formula injection protection is required for CSV export.
- Direct posting to accounting software is out of scope until a separate approval gate exists.

## companyId Separation

- All conversion jobs, rows, mapping rules, and exported files must include `companyId`.
- API must derive `companyId` from server-side session/current company context.
- Client-supplied `companyId` must not be trusted.
- Mapping rules from one company must not apply to another company.
- Shared templates must not contain customer data.
- Cross-company copy must be explicit, audited, and human-triggered.

## Out of Scope

- DB migration
- Prisma schema change
- API implementation
- PR2 implementation
- vendor-specific format finalization by speculation
- JDL/Miroku fixed implementation without official specs or user-provided samples
- direct accounting software posting
- AI mapping suggestion in PR2
- journal finalization without human review

## Claude Review Request

Please review whether:

- the intermediate format approach is appropriate
- PR2 remains limited to preview/manual mapping
- vendor-specific formats are not fixed prematurely
- `mapping_rules` and `export_format_definitions` are separated clearly
- tax category mapping is candidate-only and review-gated
- companyId separation rules are sufficient
