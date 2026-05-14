# Accounting Data Platform Future Roadmap

## Scope

This document records future requirements for the Funding CF App as an accounting data integration platform.

It is a planning document only. It does not implement application features, database migrations, tax judgments, labor judgments, AI automatic finalization, or production operations.

## Non-Negotiable Rules

- Every tenant-owned record must be scoped by `companyId`.
- Data from one company must never be visible to another company.
- Company-specific rules must not be auto-applied across companies.
- AI may assist with candidates, summaries, and checklists only after human review flows are defined.
- AI must not automatically finalize journal entries, tax positions, labor procedures, filings, or expert judgments.
- Tax judgments require human confirmation by the responsible tax professional.
- Labor and payroll judgments require human confirmation by the responsible professional.
- Tatsujin, JDL, Miroku, and other vendor-specific formats must not be fixed by speculation. Use official specs or user-provided samples before implementation.
- Secrets, tokens, API keys, DB URLs, and raw confidential customer data must not be logged or committed.

## Menu Structure Proposal

| Menu | Main Future Capabilities |
| --- | --- |
| 財務会計 | MF import/export, journal review, accounting software conversion hub, receivable/payable reconciliation, monthly journal checks |
| 管理会計 | Monthly cockpit, management accounting dashboard, risk score, monthly review generation |
| 申告書作成 | Corporate/consumption tax draft support, individual tax/blue return support, Tatsujin export support |
| 労務・給与 | Payroll/labor form preparation support, payroll journal candidates, social insurance and withholding support |
| 資料整理 | Material arrival management, question sheets, missing document tracking, evidence links |
| 資料作成 | Monthly reports, bank submission materials, customer explanation memo, internal review sheets |
| 金融 | Funding materials, bank report reflection, cash flow and receivable risk view |
| 業種別パック | Real estate, construction/sole proprietor, beauty salon packs |
| 専門家相談 | Consultation package for lawyers, tax accountants, labor consultants, banks, financial institutions |
| その他 | Design improvement, template management, audit readiness, admin settings |

## Feature Concepts

### 1. 月次決算コックピット

Manage monthly close progress per company in one screen.

Display candidates:

- 資料回収率
- 不足資料
- 質問未回答
- 仕訳取込状況
- 補助元帳差異
- 月次仕訳チェック
- 固定資産確認
- 月次資料作成状況
- 銀行資料作成状況

Purpose:

- Enable accounting firms and outsourced accounting teams to manage monthly progress for tens to hundreds of companies.

### 2. 会社別ルールブック

Store company-specific accounting, question, sub-account, department, and document submission rules.

Examples:

- この入金名義はこの売上先
- この差額は支払手数料
- この取引先は外注費
- この資料は毎月15日頃に届く
- この質問は過去にこう回答
- この家賃は毎月必ず計上

Rules:

- Fully separated by `companyId`.
- Do not auto-reference other companies' rules.
- Cross-company reuse is allowed only through explicit copy operations with human confirmation.

### 3. 根拠リンク付き仕訳

Attach evidence to journal candidates and adjustment candidates.

Evidence targets:

- 元資料
- Google Drive / Box / STREAMED資料
- 質問回答
- 過去ルール
- 担当者確認
- 税理士確認
- 社労士確認

Purpose:

- Make it traceable why a transaction was processed in a certain way during handover, tax audit, and monthly review.

### 4. 質問から仕訳へ

Generate journal candidates from question sheet answers.

Example:

- Question: 5月10日の30,000円の入金は何ですか？
- Answer: A社からの売上です。
- Candidate: 普通預金 / 売掛金 or 普通預金 / 売上高

Rules:

- The generated journal is a candidate only.
- Human confirmation is required before MF import CSV export.

### 5. 月次レビュー自動生成

Generate monthly review sheets from monthly check results.

Targets:

- 未計上の可能性
- 前月比で大きく増えた費用
- 売上回収遅延
- 補助元帳差異
- 固定資産候補
- 税区分要確認
- 質問未回答
- 資料不足

Outputs:

- 月次レビュー表
- 顧客向け説明メモ
- 社内確認事項
- 銀行提出資料への反映

### 6. 顧客別リスクスコア

Visualize monthly accounting risk per company.

Score examples:

- 資料遅延リスク
- 質問未回答リスク
- 資金繰りリスク
- 売掛回収リスク
- 税務確認リスク
- 月次遅延リスク

Purpose:

- Help staff choose which companies need priority attention.

### 7. 会計ソフト変換ハブ

Convert journals, trial balances, and chart of accounts exported from accounting software into another accounting software format.

Policy:

- Use an intermediate normalized format, not direct one-to-one converter logic.

Inputs:

- JDL
- 弥生
- freee
- ミロク
- MF
- その他CSV/Excel

Outputs:

- MFインポート用CSV
- 弥生形式CSV
- freee形式CSV
- JDL取込用データ
- ミロク取込用データ

Rules:

- Do not hard-code JDL/Miroku specs without confirmed samples/specs.
- Tax category conversion must require review.
- Never overwrite source data.

### 8. 資料整理・質問表・不足資料管理

Manage document arrival status by company and month.

Targets:

- 現金領収書
- 通帳
- 売上請求書
- 仕入請求書
- 経費資料
- 給与資料
- カード明細
- 借入金明細
- 固定資産資料
- 医療費資料
- 控除証明書
- PDF
- 写真

Functions:

- 到着済 / 未着 / 一部不足 / 要確認 / 対象外 / 完了
- 不足資料メール自動生成
- 質問表自動生成
- 未回答リマインド
- 過去質問・回答履歴検索
- 会社別ナレッジ化

### 9. 債権債務管理・補助元帳照合

Import sub-ledgers and extract unmatched transactions by sub-account.

Targets:

- 売掛金
- 買掛金
- 未払金
- 前払金
- 仮払金
- 仮受金
- 借入金
- 立替金

Functions:

- 未入金抽出
- 未払抽出
- 相殺候補
- 金額差異
- 支払手数料
- 為替差損益
- 会費控除
- 修正仕訳候補
- 質問表連携
- MFインポート用CSV出力

### 10. 月次仕訳チェック

Check whether recurring monthly journal entries are posted.

Targets:

- 家賃
- リース
- 給料
- 社会保険料
- 借入返済
- 減価償却
- 顧問料
- 通信費
- 保険料
- サブスク

If missing:

- Reflect in monthly review sheet.
- Add to confirmation items.
- Reflect in question sheet.

### 11. 管理会計・月次資料

Functions:

- 部門別売上
- 部門別費用
- 部門別利益
- 赤字部門一覧
- 費用別集計
- 費用増減分析
- 売上回収状況
- 得意先別売掛残高
- 回収率
- 滞留債権
- 月次資料自動生成
- 銀行提出資料への反映

### 12. 固定資産管理

Functions:

- 新規資産登録
- 除却
- 売却
- 減価償却
- 固定資産管理表
- 修繕費 / 資本的支出の判断補助
- 仕訳候補生成
- 達人インポート用資料作成

Rules:

- This is draft and transfer support, not final tax return completion.
- Human confirmation is required.

### 13. 労務・給与・所定様式記入補助

Targets:

- 給与計算
- 社会保険料
- 労働保険料
- 源泉所得税
- 給与仕訳生成
- 算定基礎届
- 月額変更届
- 住所変更届
- 労働保険申告書
- 離職票
- 法定調書
- 給与支払報告書
- 源泉税納付書

Policy:

- Start with form filling support, not electronic filing.

Functions:

- 自動計算
- 記入欄ガイド
- 記入補助シート
- 社労士確認ステータス
- 税理士確認ステータス
- 人間確認必須

### 14. 個人確定申告・青色申告・達人連携

Purpose:

- Classify Google Drive documents and support individual tax return, blue return statement, and Tatsujin import data preparation.

Targets:

- 不動産所得
- 医療費
- 寄附金
- 保険料控除
- 住宅ローン
- 支払調書
- 源泉徴収票
- 経費資料
- 固定資産資料
- PDF
- 写真

Functions:

- Google Drive資料分類
- 不足資料チェック
- 医療費Excel取込
- 物件別収入Excel取込
- 物件別費用Excel取込
- 青色申告決算書下書き
- 達人インポート用Excel/CSV
- 達人インポート前チェック

Rules:

- OCR is candidate extraction only.
- Tatsujin specs must be confirmed from official docs or user-provided samples.
- Do not make definitive tax judgments.

### 15. 業種別パック

#### 不動産所得パック

- 物件マスタ
- 家賃収入
- 物件別費用
- 借入金
- 固定資産
- 医療費
- 青色申告決算書
- 達人インポート

#### 建築業・一人親方パック

- 現場マスタ
- 売上請求書
- 材料費
- 外注費
- 車両費
- 工具
- 現場別損益
- 質問表
- 達人インポート

#### 美容室パック

- 売上
- 現金 / カード / 予約サイト
- 材料費
- 人件費
- 広告費
- 客単価
- 材料費率
- 店舗別損益
- 月次資料

### 16. 専門家相談パック

Purpose:

- Organize consultation topics, required materials, and questions before consulting lawyers, tax accountants, labor consultants, banks, and financial institutions.

Policy:

- Customers pay professional fees directly to professionals.
- The app charges customers for consultation sheet creation, material organization, and history management.
- Do not assume referral fees or brokerage fees from professionals.
- Legal, tax, labor, and financial judgments are made by each professional.
- The app must not make definitive judgments.

Functions:

- 相談内容入力
- 専門家分類
- 相談依頼書自動作成
- 必要資料リスト生成
- 相談履歴管理
- 次回アクション管理

### 17. デザイン改善

Purpose:

- Improve UI and the appearance of monthly materials and bank submission materials.

Candidate tools:

- Figma
- v0
- Gamma
- Canva

Targets:

- 月次決算コックピット
- 顧客一覧
- 資料到着管理
- 質問表
- 月次レビュー
- 銀行提出資料
- 管理会計ダッシュボード

## Phase Plan

### Phase 0: Migration and Safety Foundation

- Staging migration workflow
- Staging migration verification for PR #10 migrations
- GitHub environment secrets presence check
- No production migration before human approval

### Phase 1: Import MVP and Normalization Foundation

- PR2 CSV/Excel upload preview
- Encoding and parser policy
- Manual mapping UI
- Normalize layer design
- MF import CSV export scope decision
- Formula injection protection
- Company isolation tests

### Phase 2: Monthly Close Operations

- 月次決算コックピット
- 資料整理・質問表・不足資料管理
- 会社別ルールブック
- 根拠リンク付き仕訳
- 月次仕訳チェック
- 顧客別リスクスコア

### Phase 3: Review, Reconciliation, and Reporting

- 月次レビュー自動生成
- 債権債務管理・補助元帳照合
- 管理会計・月次資料
- 銀行提出資料への反映
- 固定資産管理 draft support

### Phase 4: Conversion and Domain Expansion

- 会計ソフト変換ハブ
- 業種別パック
- 個人確定申告・青色申告・達人連携 draft support
- 労務・給与・所定様式記入補助

### Phase 5: Assisted Automation With Approval Gates

- 質問から仕訳へ
- Evidence-backed journal candidate generation
- High-confidence suggestion workflows only after review controls exist
- No complete auto-finalization without explicit future approval and audit design

## Relationship With PR2

PR2 should stay narrow.

PR2 should focus on:

- file upload or paste input
- CSV/Excel parsing
- header detection
- manual mapping
- JSON preview
- row-level validation
- no DB insert if enum/staging migration remains unresolved
- no AI suggestion
- no automatic mapping
- no automatic journal finalization

Future features in this roadmap depend on PR2 because they need:

- stable imported file metadata
- normalized row representation
- mapping rule design
- source-to-output traceability
- row validation model
- company isolation tests

Do not mix future roadmap features into PR2 MVP.

## companyId Separation Notes

Minimum expectations:

- All company-owned tables include `companyId`.
- Every query uses server-side company context, not client-supplied `companyId`.
- Cross-company copy is explicit, logged, and requires human action.
- Shared templates must not expose company data.
- Rulebooks, evidence links, questions, monthly close status, and risk scores are company-specific by default.
- AI prompts, summaries, and generated candidates must not include data from another `companyId`.
- Export jobs must verify membership before reading source data.
- Logs must not include raw source rows, customer data, secret values, or DB URLs.

## Future DB Table Candidates

These are candidates only. Do not add migrations until each feature has a reviewed Issue and schema plan.

| Candidate Table | Purpose |
| --- | --- |
| `monthly_close_periods` | Company/month close period state |
| `monthly_close_tasks` | Per-company monthly checklist items |
| `material_requests` | Required materials and arrival status |
| `material_request_items` | Individual required documents |
| `client_rulebooks` | Company-specific accounting and operation rules |
| `client_rulebook_entries` | Individual rule entries with scope and priority |
| `evidence_links` | Links between candidates and source evidence |
| `question_threads` | Question sheets and conversation groups |
| `question_answers` | User answers and review state |
| `journal_candidate_evidence` | Evidence attached to journal candidates |
| `monthly_review_findings` | Monthly review observations and issues |
| `client_risk_scores` | Per-company risk score snapshots |
| `conversion_jobs` | Accounting software conversion attempts |
| `conversion_rows` | Normalized conversion row details |
| `auxiliary_reconciliation_jobs` | Sub-ledger reconciliation runs |
| `auxiliary_reconciliation_items` | Unmatched or matched sub-ledger items |
| `recurring_journal_rules` | Monthly recurring journal expectations |
| `recurring_journal_checks` | Monthly rule check results |
| `management_report_runs` | Monthly report generation runs |
| `fixed_assets` | Asset master candidates |
| `fixed_asset_events` | Acquisition, disposal, sale, depreciation events |
| `payroll_assist_cases` | Payroll/labor form support cases |
| `tax_return_assist_cases` | Individual/corporate tax support cases |
| `industry_pack_settings` | Company-specific industry pack settings |
| `consultation_cases` | Professional consultation organization cases |
| `document_templates` | Templates for emails, reports, bank materials, consultation sheets |

## Issue Split Proposal

Recommended GitHub Issues:

1. Phase 0: staging migration workflow and verification
2. Phase 1: PR2 upload/parser/preview API contract
3. Phase 1: manual mapping UI and validation model
4. Phase 1: MF export scope and formula injection protection
5. Phase 1: company leakage integration tests for imports
6. Phase 2: monthly close cockpit requirements
7. Phase 2: material arrival and missing document management
8. Phase 2: company rulebook requirements
9. Phase 2: evidence links for journal candidates
10. Phase 2: monthly recurring journal check requirements
11. Phase 2: client risk score requirements
12. Phase 3: monthly review auto-generation requirements
13. Phase 3: receivable/payable and sub-ledger reconciliation requirements
14. Phase 3: management accounting monthly report requirements
15. Phase 3: fixed asset management draft support requirements
16. Phase 4: accounting software conversion hub requirements
17. Phase 4: individual tax/blue return/Tatsujin support requirements
18. Phase 4: payroll/labor form support requirements
19. Phase 4: industry pack requirements
20. Phase 5: question-to-journal candidate workflow
21. Phase 5: approval gates and audit log design for assisted automation
22. Design: UI and report design improvement plan
23. Expert consultation pack requirements

## Notion Task Drafts

Use these as Notion task candidates.

| Task | Phase | Owner AI | Approval Gate | Done When |
| --- | --- | --- | --- | --- |
| staging migration workflow確認 | Phase 0 | Codex | YES before run | staging workflow exists and Issue #11 has runbook |
| staging migration実行結果記録 | Phase 0 | Codex | Human approval before production | 000002-000004 verified in staging |
| PR2 parser/input contract | Phase 1 | ChatGPT + Codex | YES before implementation | size, encoding, parser, preview shape defined |
| PR2 manual mapping UI design | Phase 1 | ChatGPT + Codex | YES | mapping state and errors defined |
| PR2 leakage test plan | Phase 1 | Codex + Claude | YES | company A/B isolation tests defined |
| 月次決算コックピット要件整理 | Phase 2 | ChatGPT | YES | statuses and first screen defined |
| 会社別ルールブック要件整理 | Phase 2 | ChatGPT + Claude | YES | copy rules and company separation defined |
| 根拠リンク付き仕訳要件整理 | Phase 2 | ChatGPT + Claude | YES | evidence target model defined |
| 資料整理・質問表要件整理 | Phase 2 | ChatGPT | YES | document statuses and reminders defined |
| 顧客別リスクスコア要件整理 | Phase 2 | ChatGPT | YES | score inputs and labels defined |
| 補助元帳照合要件整理 | Phase 3 | ChatGPT + Claude | YES | reconciliation flow defined |
| 管理会計・月次資料要件整理 | Phase 3 | ChatGPT | YES | report sections defined |
| 固定資産管理下書き支援要件整理 | Phase 3 | ChatGPT + Claude | YES | human confirmation gates defined |
| 会計ソフト変換ハブ要件整理 | Phase 4 | ChatGPT + Gemini | YES | source/target format strategy defined |
| 労務・給与様式補助要件整理 | Phase 4 | ChatGPT | YES | professional confirmation gates defined |
| 個人確定申告・達人連携要件整理 | Phase 4 | ChatGPT + Gemini | YES | official/sample spec dependency defined |
| 業種別パック要件整理 | Phase 4 | ChatGPT | YES | first industry pack selected |
| 専門家相談パック要件整理 | Phase 4 | ChatGPT | YES | no referral-fee premise documented |
| 質問から仕訳へ要件整理 | Phase 5 | ChatGPT + Claude | YES | candidate-only flow defined |
| AI補助自動化承認ゲート設計 | Phase 5 | Claude + Codex | YES | no auto-finalization without future approval |
| デザイン改善計画 | Cross-phase | ChatGPT | YES | target screens and docs selected |

## Out of Scope For This PR

- Application feature implementation
- Database migration
- Production DB operation
- PR2 implementation
- Tatsujin spec finalization without official/user sample confirmation
- Electronic filing
- Automatic tax return filing
- Definitive tax judgment
- Definitive labor judgment
- AI automatic finalization
