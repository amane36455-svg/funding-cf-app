# Future Roadmap Business Packages

## Scope

This document organizes future business packages after the import and monthly operations foundation is stable.

It is a planning document only. It does not add a database migration, Prisma schema change, API, UI implementation, tax filing implementation, labor filing implementation, electronic filing, or AI automatic finalization.

## Relationship With Current Priorities

Current priorities remain:

1. staging migration workflow
2. staging `pnpm deploy:migrate` verification
3. staging smoke test
4. Vercel Preview env confirmation
5. PR2 CSV/Excel import MVP preparation

Business packages are future roadmap items and must not block the safety foundation or PR2 preparation.

## Epic: 債権債務・補助元帳照合

Issue candidates:

1. 補助元帳取込
   - source file import
   - account/sub-account normalization
   - source row traceability

2. 不一致抽出
   - unmatched receivables/payables
   - amount differences
   - date differences
   - vendor/customer name differences

3. 未回収管理
   - unpaid sales
   - delayed collection
   - customer explanation candidates

4. 未払管理
   - unpaid purchases/expenses
   - payment due candidates

5. 差額理由選択
   - bank fee
   - foreign exchange difference
   - offset
   - discount
   - membership fee deduction
   - unknown / needs review

6. 修正仕訳候補
   - candidate only
   - evidence link required
   - human confirmation before export

7. 質問表連携
   - generate question drafts from unresolved differences
   - unanswered questions feed monthly review

## Epic: 月次資料・銀行資料

Issue candidates:

1. 部門別損益
2. 費用別集計
3. 売上回収状況
4. 資金繰り資料
5. 銀行提出資料
6. デザインテンプレート

Outputs are drafts until reviewed by a human. Bank submission materials must not imply financial advice or financing approval.

## Epic: 業種別パック

### 不動産所得パック

Issue candidates:

- property master
- rent income
- property-level expenses
- loans
- fixed assets
- medical expenses where relevant
- blue return draft support
- Tatsujin import draft support

### 建築業・一人親方パック

Issue candidates:

- site/project master
- sales invoices
- material costs
- outsourcing costs
- vehicle expenses
- tools
- site-level profit/loss
- question sheets
- Tatsujin import draft support

### 美容室パック

Issue candidates:

- sales by channel
- cash/card/reservation site reconciliation
- material costs
- payroll costs
- advertising costs
- average customer spend
- material cost ratio
- store-level profit/loss
- monthly reports

## Epic: 専門家相談パック

Issue candidates:

1. 相談内容入力
   - customer enters background and goal
   - app separates facts from assumptions

2. 専門家別相談書
   - lawyer
   - tax accountant
   - labor consultant
   - bank/financial institution

3. 必要資料リスト
   - documents required before consultation
   - missing document tracking

4. 相談履歴
   - consultation date
   - responsible professional
   - answer summary
   - next actions

5. 顧客課金型パック設計
   - app charges customers for preparation, organization, and history management
   - professional fees are paid directly by customers to professionals
   - no referral-fee or brokerage-fee premise

## Future DB Candidates

Candidates only. Do not add migrations until schema review.

| Table | Purpose |
| --- | --- |
| `receivable_payable_matches` | Matching and difference tracking for receivables/payables |
| `auxiliary_reconciliation_jobs` | Sub-ledger reconciliation runs |
| `auxiliary_reconciliation_items` | Individual matched/unmatched items |
| `monthly_review_items` | Monthly review findings and status |
| `management_report_runs` | Monthly report generation runs |
| `document_templates` | Report, email, consultation, and bank material templates |
| `industry_pack_settings` | Company-specific settings for industry packs |
| `fixed_assets` | Asset candidates and master data |
| `fixed_asset_events` | Acquisition, disposal, sale, depreciation events |
| `tax_return_assist_cases` | Draft support cases for tax return workflows |
| `payroll_assist_cases` | Draft support cases for payroll/labor forms |
| `consultation_cases` | Expert consultation organization cases |

## companyId Separation

- All business package data must include `companyId`.
- API must derive `companyId` from server-side current company context.
- Client-supplied `companyId` must not be trusted.
- Industry pack templates can be global only if they contain no customer data.
- Consultation cases, documents, answers, and professional notes are company-specific.
- Cross-company reuse must be explicit copy only.
- Logs must not include confidential customer facts, professional consultation details, secrets, tokens, or DB URLs.

## Professional Judgment Rules

- Tax return support is draft/transfer support only.
- Labor form support is draft/form filling support only.
- Electronic filing is out of scope.
- Tatsujin specs must be confirmed from official docs or user-provided samples.
- The app must not make definitive tax, labor, legal, or financial judgments.
- Expert consultation package must not assume referral fees or brokerage fees.

## Out of Scope

- DB migration
- Prisma schema change
- API implementation
- UI implementation
- PR2 implementation
- production DB operation
- staging migration execution
- electronic filing
- automatic tax return filing
- definitive tax judgment
- definitive labor judgment
- legal or financial judgment
- AI automatic finalization

## Claude Review Request

Please review whether:

- business packages remain future roadmap items
- professional judgment boundaries are clear
- expert consultation package avoids referral-fee assumptions
- industry packs do not imply tax/labor finalization
- companyId isolation rules are sufficient
