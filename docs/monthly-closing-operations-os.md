# Monthly Closing Operations OS

## Scope

This document organizes future requirements for a monthly closing operations OS.

It is a planning document only. It does not add a database migration, Prisma schema change, API, UI implementation, staging migration execution, production operation, tax or labor conclusion, or journal finalization.

## Purpose

The monthly closing operations OS should help accounting firms and outsourced accounting teams manage monthly close progress across many companies.

It should make these states visible per `companyId` and period:

- document arrival
- missing documents
- unanswered questions
- import progress
- sub-ledger differences
- recurring monthly journal checks
- fixed asset review items
- monthly report draft status
- bank material draft status
- review findings
- monthly review priority alerts

## PR2 Relationship

PR2 remains limited to:

- CSV/Excel upload
- header parse
- manual mapping
- preview
- validation
- JSON preview
- no DB insert in the first step
- no AI suggestion

Monthly questions, document collection, monthly review drafts, and review priority alerts are post-PR2 features.

PR2 only provides the future foundation through parsing, preview, validation, source traceability, and company isolation.

## Epic: 月次決算オペレーションOS

Issue candidates:

1. 月次決算コックピット
   - status summary by company and month
   - progress percentage
   - blocked reasons
   - staff assignment and due dates

2. 資料到着管理
   - required document templates
   - arrival status by item
   - missing / partial / needs review / not applicable / completed

3. 未完了理由分類
   - waiting for customer
   - waiting for internal review
   - waiting for tax professional
   - waiting for labor professional
   - data import error
   - reconciliation difference

4. 質問表ドラフト生成
   - draft questions from unresolved rows
   - draft questions from missing documents
   - draft questions from monthly journal checks
   - draft questions from reconciliation differences
   - output as draft only

5. 未回答リマインド下書き
   - reminder candidates based on unanswered questions
   - human confirmation before sending
   - no confidential data in logs

6. 会社別ルールブック
   - company-specific rules for accounting, documents, questions, departments, sub-accounts
   - explicit copy only for cross-company reuse

7. 月次レビュー下書き生成
   - review findings from checks
   - customer explanation memo draft
   - internal confirmation items
   - bank material reflection candidates

## Phase Plan

### Phase 0: Safety Foundation

- staging migration workflow
- staging migration verification
- Vercel Preview env confirmation
- no production migration before approval

### Phase 1: PR2 Import MVP

- deterministic CSV/Excel preview
- manual mapping
- validation
- JSON preview
- company leakage tests

### Phase 2: Monthly Close Visibility

- monthly close status model
- document status dashboard
- question status dashboard
- company/customer list integration

### Phase 3: Operational Drafts

- question draft generation
- reminder draft generation
- monthly review draft generation
- recurring journal check draft

### Phase 4: Review and Reporting

- management report draft integration
- bank material draft integration
- monthly review priority alerts

## Future DB Candidates

Candidates only. Do not add migrations until each schema is reviewed.

| Table | Purpose |
| --- | --- |
| `monthly_closing_statuses` | Company/month close status summary |
| `monthly_close_tasks` | Monthly close tasks and responsibilities |
| `document_requests` | Required materials and arrival status by company/month |
| `document_request_items` | Individual document arrival status |
| `questions` | Question sheet header/thread |
| `question_items` | Individual questions and status |
| `question_answers` | Customer or staff answers and review state |
| `company_rulebook_entries` | Company-specific accounting/document/question rule candidates |
| `monthly_review_items` | Monthly review findings and status |
| `monthly_review_priority_alerts` | Review priority indicators and confirmation alerts |
| `recurring_journal_rules` | Expected recurring journal rules |
| `recurring_journal_checks` | Monthly check results for recurring journals |

## companyId Separation

- Every table must include `companyId` unless it is a global static template table with no customer data.
- API handlers must derive `companyId` from server-side session/current company context.
- Do not trust `companyId` supplied by the client.
- Question drafts and review drafts must never include another company's source rows.
- Company rulebook entries must not be applied across companies.
- Cross-company copy must be explicit, audited, and human-triggered.
- Logs must not include raw customer answers, document contents, source rows, secrets, tokens, or DB URLs.

## Out of Scope

- DB migration
- Prisma schema change
- API implementation
- UI implementation
- PR2 implementation
- staging migration execution
- production DB operation
- definitive tax conclusion
- definitive labor conclusion
- journal finalization without human review

## Claude Review Request

Please review whether:

- PR2 scope remains narrow and unchanged
- monthly OS requirements are correctly placed after PR2
- companyId isolation rules are sufficient
- question/review flows are clearly draft-only
- no tax, labor, finance, or journal finalization is implied
