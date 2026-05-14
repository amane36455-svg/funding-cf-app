# Questionnaire and Document Collection Plan

## Scope

This document organizes future requirements for question sheets, document collection, missing document management, and the link from questions to journal candidates.

It is a planning document only. It does not add a database migration, Prisma schema change, API, UI implementation, notification implementation, or journal finalization.

## Purpose

The system should help staff collect monthly documents and questions from each company, keep history, and turn answers into reviewable accounting candidates.

Main goals:

- manage required documents by company and month
- generate missing document lists
- generate draft question sheets
- track unanswered questions
- search past questions and answers
- connect answers to journal candidates as evidence
- keep company-specific knowledge separate

## PR2 Relationship

PR2 does not implement question sheets or document collection.

PR2 only prepares the import foundation:

- upload
- header parse
- manual mapping
- preview
- validation
- JSON preview
- no DB insert in the first step
- no AI suggestion

Question sheets and document collection should start after the preview/validation model is stable, because they will consume validation errors, missing mappings, and unresolved rows.

## Epic: 資料整理・質問表・不足資料管理

Issue candidates:

1. 資料到着管理
   - monthly required document checklist
   - arrival status
   - missing / partial / needs review / not applicable / completed

2. 質問表ドラフト生成
   - draft questions from unresolved rows
   - draft questions from missing documents
   - draft questions from monthly journal checks
   - draft questions from reconciliation differences

3. 未回答リマインド下書き
   - unanswered question tracking
   - reminder draft generation
   - human confirmation before sending

4. 過去質問・回答履歴検索
   - search by company
   - search by period
   - search by account, vendor, amount, document type

5. 会社別ナレッジ化
   - turn confirmed answers into company rulebook candidates
   - explicit human confirmation before rulebook registration

6. 質問から仕訳候補へ
   - answer-derived journal draft suggestions
   - evidence link to answer
   - human confirmation before MF CSV export

## Question-to-Journal Policy

Question answers may create journal draft suggestions only.

Example:

- question: 5月10日の30,000円の入金は何ですか？
- answer: A社からの売上です。
- candidate: 普通預金 / 売掛金 or 普通預金 / 売上高

Rules:

- draft suggestion only
- no final posting without human review
- no tax category or tax treatment conclusion
- no direct posting to MF
- human review before export
- evidence link to the answer must be preserved

## Future DB Candidates

Candidates only. Do not add migrations until schema review.

| Table | Purpose |
| --- | --- |
| `questions` | Question thread or sheet header |
| `question_items` | Individual questions and status |
| `question_answers` | Answers, answer source, review state |
| `document_requests` | Document request set by company/month |
| `document_request_items` | Individual document arrival status |
| `company_rulebook_entries` | Confirmed company-specific rule candidates |
| `journal_evidence_links` | Links between journal candidates and question answers/documents |
| `monthly_review_items` | Review items that may generate questions |
| `receivable_payable_matches` | Reconciliation differences that may generate questions |

## Status Candidates

Document item statuses:

- not_requested
- requested
- received
- partial
- missing
- needs_review
- not_applicable
- completed

Question item statuses:

- draft
- sent
- answered
- needs_follow_up
- resolved
- cancelled

Review status candidates:

- unreviewed
- staff_reviewed
- tax_professional_review_required
- labor_professional_review_required
- approved
- rejected

## companyId Separation

- Every question, answer, document request, and evidence link must include `companyId`.
- API must derive `companyId` from server-side current company context.
- Do not accept trusted `companyId` from the client.
- Past answers must only be searchable within the same company unless explicit copy/export is approved.
- Company rulebook registration must not pull other companies' answers.
- Notifications must not include another company's document names, amounts, or answers.
- Logs must not include raw answers, document contents, secrets, tokens, or DB URLs.

## Out of Scope

- DB migration
- Prisma schema change
- API implementation
- UI implementation
- notification sending implementation
- PR2 implementation
- AI suggestion in PR2
- journal finalization without human review
- tax category or tax treatment conclusion
- labor judgment conclusion

## Claude Review Request

Please review whether:

- question generation is clearly post-PR2
- answer-to-journal flow is draft suggestion only
- company rulebook registration requires human confirmation
- companyId isolation rules are sufficient
- no notification or sending behavior leaks confidential data
