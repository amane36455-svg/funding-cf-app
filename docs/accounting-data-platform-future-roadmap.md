# Accounting Data Platform Future Roadmap

## Scope

This document records future requirements for the Funding CF App as an accounting data integration platform.

It is a planning document only. It does not implement application features, database migrations, tax or labor conclusions, journal final posting, or production operations.

## Non-Negotiable Rules

- Every tenant-owned record must be scoped by `companyId`.
- Data from one company must never be visible to another company.
- Company-specific rules must not be applied across companies.
- AI may assist with draft suggestions, summaries, and checklists only after human review flows are defined.
- Journal draft suggestions, tax category mapping candidates, labor form drafts, filing drafts, and expert consultation drafts require human review.
- The app must not make definitive tax, labor, legal, financial, or accounting treatment conclusions.
- Tatsujin, JDL, Miroku, and other vendor-specific formats must not be fixed by speculation. Use official specs or user-provided samples before implementation.
- Secrets, tokens, API keys, DB URLs, and raw confidential customer data must not be logged or committed.

## Menu Structure Proposal

| Menu | Main Future Capabilities |
| --- | --- |
| 財務会計 | MF import/export drafts, journal review, accounting software conversion hub, receivable/payable reconciliation, monthly journal checks |
| 管理会計 | Monthly cockpit, management accounting dashboard, monthly review priority alerts, monthly review draft generation |
| 申告書作成 | Corporate/consumption tax draft support, individual tax/blue return support, Tatsujin input/import pre-check data support |
| 労務・給与 | Payroll/labor form preparation support, payroll journal draft suggestions, social insurance and withholding support drafts |
| 資料整理 | Material arrival management, question sheets, missing document tracking, evidence links |
| 資料作成 | Monthly report drafts, bank submission drafts, customer explanation memo drafts, internal review sheets |
| 金融 | Funding material drafts, bank report reflection drafts, cash flow simulation, financial indicator simulation |
| 業種別パック | Real estate, construction/sole proprietor, beauty salon packs |
| 専門家相談 | Consultation preparation package for lawyers, tax accountants, labor consultants, banks, financial institutions |
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

Store company-specific accounting, question, sub-account, department, and document submission rule candidates.

Examples:

- この入金名義はこの売上先として扱う候補
- この差額は支払手数料として扱う候補
- この取引先は外注費として扱う候補
- この資料は毎月15日頃に届く傾向
- この質問は過去にこう回答
- この家賃は毎月確認する候補

Rules:

- Fully separated by `companyId`.
- Do not auto-reference other companies' rules.
- Cross-company reuse is allowed only through explicit copy operations with human confirmation.

### 3. 根拠リンク付き仕訳

Attach evidence to journal draft suggestions and adjustment candidates.

Evidence targets:

- 元資料
- Google Drive / Box / STREAMED資料
- 質問回答
- 過去ルール
- 担当者確認
- 税理士確認
- 社労士確認

Purpose:

- Make it traceable why a transaction was suggested in a certain way during handover, audit preparation, and monthly review.

### 4. 質問から仕訳候補へ

Generate journal draft suggestions from question sheet answers.

Example:

- Question: 5月10日の30,000円の入金は何ですか？
- Answer: A社からの売上です。
- Candidate: 普通預金 / 売掛金 or 普通預金 / 売上高

Rules:

- The generated journal is a draft suggestion only.
- Human confirmation is required before MF import CSV export.
- No direct posting to MF.

### 5. 月次レビュー下書き生成

Generate monthly review drafts from monthly check results.

Targets:

- 未計上の可能性
- 前月比で大きく増えた費用
- 売上回収遅延
- 補助元帳差異
- 固定資産候補
- 税区分マッピング候補の要確認
- 質問未回答
- 資料不足

Outputs:

- 月次レビュー表の下書き
- 顧客向け説明メモの下書き
- 社内確認事項
- 銀行提出資料への反映候補

### 6. 月次レビュー優先度 / 確認推奨アラート

Visualize which companies need review attention during monthly closing.

Alert examples:

- 資料遅延アラート
- 質問未回答アラート
- 資金繰り確認推奨
- 売掛回収確認推奨
- 税区分マッピング候補の確認推奨
- 月次遅延アラート

Purpose:

- Help staff decide which companies need priority review without presenting a credit score or definitive risk judgment.

### 7. 会計ソフト変換ハブ

Support conversion of journals, trial balances, and chart of accounts exported from accounting software into reviewed export formats.

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

- MFインポート用CSVの下書き
- 弥生形式CSVの下書き
- freee形式CSVの下書き
- JDL向け汎用エクスポート補助（公式仕様またはユーザー提供サンプル確認後）
- ミロク向け汎用エクスポート補助（公式仕様またはユーザー提供サンプル確認後）

Rules:

- Do not hard-code JDL/Miroku specs without confirmed samples/specs.
- Tax category mapping candidates must require review.
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
- 不足資料メール下書き生成
- 質問表下書き生成
- 未回答リマインド下書き
- 過去質問・回答履歴検索
- 会社別ナレッジ化候補

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
- 支払手数料候補
- 為替差損益候補
- 会費控除候補
- 修正仕訳候補
- 質問表連携
- MFインポート用CSV下書き出力

### 10. 月次仕訳チェック

Check whether recurring monthly journal entries appear to be posted.

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

- Reflect in monthly review draft.
- Add to confirmation items.
- Reflect in question sheet draft.

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
- 月次資料下書き生成
- 銀行提出資料の下書きへの反映

### 12. 固定資産管理

Functions:

- 新規資産登録候補
- 除却候補
- 売却候補
- 減価償却候補
- 固定資産管理表
- 修繕費 / 資本的支出の確認補助
- 仕訳候補のサジェスト（要人間レビュー）
- 達人入力・インポート前の確認用データ作成を支援

Rules:

- This is draft and transfer support, not final tax return completion.
- Human confirmation is required.

### 13. 労務・給与・所定様式記入補助

Targets:

- 給与計算
- 社会保険料
- 労働保険料
- 源泉所得税
- 給与仕訳候補のサジェスト（要人間レビュー）
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

- 計算補助
- 記入欄ガイド
- 記入補助シート
- 社労士確認ステータス
- 税理士確認ステータス
- 人間確認必須

### 14. 個人確定申告・青色申告・達人連携

Purpose:

- Classify Google Drive documents and support individual tax return, blue return statement, and pre-check data for Tatsujin input/import.

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

- Google Drive資料分類候補
- 不足資料チェック
- 医療費Excel取込
- 物件別収入Excel取込
- 物件別費用Excel取込
- 青色申告決算書下書き
- 達人入力・インポート前の確認用Excel/CSV作成を支援
- 達人入力・インポート前チェック

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
- 青色申告決算書下書き
- 達人入力・インポート前の確認用データ作成を支援

#### 建築業・一人親方パック

- 現場マスタ
- 売上請求書
- 材料費
- 外注費
- 車両費
- 工具
- 現場ごとの売上・材料費・外注費・車両費を整理し、現場別の採算を見える化する
- 質問表
- 達人入力・インポート前の確認用データ作成を支援

#### 美容室パック

- 売上
- 現金 / カード / 予約サイト
- 材料費
- 人件費
- 広告費
- 客単価
- 材料費率
- 店舗別損益
- 月次資料下書き

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
- 相談依頼書下書き生成
- 必要資料リスト生成
- 相談履歴管理
- 次回アクション管理

### 17. デザイン改善

Purpose:

- Improve UI and the appearance of monthly materials and bank submission material drafts.

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
- 銀行提出資料の下書き
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
- MF import CSV draft export scope decision
- Formula injection protection
- Company isolation tests

### Phase 2: Monthly Close Operations

- 月次決算コックピット
- 資料整理・質問表・不足資料管理
- 会社別ルールブック
- 根拠リンク付き仕訳候補
- 月次仕訳チェック

### Phase 3: Review, Reconciliation, and Reporting

- 月次レビュー下書き生成
- 債権債務管理・補助元帳照合
- 管理会計・月次資料
- 銀行提出資料の下書きへの反映
- 固定資産管理 draft support

### Phase 4: Conversion and Domain Expansion

- 会計ソフト変換ハブ
- 月次レビュー優先度 / 確認推奨アラート
- 業種別パック
- 個人確定申告・青色申告・達人連携 draft support
- 労務・給与・所定様式記入補助

### Phase 5: Assisted Draft Suggestions With Approval Gates

- 質問から仕訳候補へ
- Evidence-backed journal draft suggestions
- High-confidence suggestion workflows only after review controls exist
- No final posting without explicit future approval and audit design

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
- no final journal posting

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
- Rulebooks, evidence links, questions, monthly close status, and monthly review priority alerts are company-specific by default.
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
| `monthly_review_priority_alerts` | Review priority indicators and confirmation alerts |
| `conversion_jobs` | Accounting software conversion attempts |
| `conversion_rows` | Normalized conversion row details |
| `auxiliary_reconciliation_jobs` | Sub-ledger reconciliation runs |
| `auxiliary_reconciliation_items` | Unmatched or matched sub-ledger items |
| `recurring_journal_rules` | Monthly recurring journal expectations |
| `recurring_journal_checks` | Monthly rule check results |
| `management_report_runs` | Monthly report draft generation runs |
| `fixed_assets` | Asset master candidates |
| `fixed_asset_events` | Acquisition, disposal, sale, depreciation candidate events |
| `payroll_assist_cases` | Payroll/labor form support cases |
| `tax_return_assist_cases` | Individual/corporate tax support cases |
| `industry_pack_settings` | Company-specific industry pack settings |
| `consultation_cases` | Professional consultation organization cases |
| `document_templates` | Templates for emails, reports, bank material drafts, consultation sheets |

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
11. Phase 4: monthly review priority alerts
12. Phase 3: monthly review draft generation requirements
13. Phase 3: receivable/payable and sub-ledger reconciliation requirements
14. Phase 3: management accounting monthly report draft requirements
15. Phase 3: fixed asset management draft support requirements
16. Phase 4: accounting software conversion hub requirements
17. Phase 4: individual tax/blue return/Tatsujin pre-check support requirements
18. Phase 4: payroll/labor form support requirements
19. Phase 4: industry pack requirements
20. Phase 5: question-to-journal draft suggestion workflow
21. Phase 5: approval gates and audit log design for assisted draft suggestions
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
| 根拠リンク付き仕訳候補要件整理 | Phase 2 | ChatGPT + Claude | YES | evidence target model defined |
| 資料整理・質問表要件整理 | Phase 2 | ChatGPT | YES | document statuses and reminders defined |
| 月次レビュー優先度要件整理 | Phase 4 | ChatGPT | YES | alert inputs and labels defined |
| 補助元帳照合要件整理 | Phase 3 | ChatGPT + Claude | YES | reconciliation flow defined |
| 管理会計・月次資料要件整理 | Phase 3 | ChatGPT | YES | report draft sections defined |
| 固定資産管理下書き支援要件整理 | Phase 3 | ChatGPT + Claude | YES | human confirmation gates defined |
| 会計ソフト変換ハブ要件整理 | Phase 4 | ChatGPT + Gemini | YES | source/target format strategy defined |
| 労務・給与様式補助要件整理 | Phase 4 | ChatGPT | YES | professional confirmation gates defined |
| 個人確定申告・達人連携要件整理 | Phase 4 | ChatGPT + Gemini | YES | official/sample spec dependency defined |
| 業種別パック要件整理 | Phase 4 | ChatGPT | YES | first industry pack selected |
| 専門家相談パック要件整理 | Phase 4 | ChatGPT | YES | no referral-fee premise documented |
| 質問から仕訳候補へ要件整理 | Phase 5 | ChatGPT + Claude | YES | draft suggestion flow defined |
| AI補助ドラフト承認ゲート設計 | Phase 5 | Claude + Codex | YES | no final posting without future approval |
| デザイン改善計画 | Cross-phase | ChatGPT | YES | target screens and docs selected |

## Out of Scope For This PR

- Application feature implementation
- Database migration
- Production DB operation
- PR2 implementation
- Tatsujin/JDL/Miroku spec finalization without official/user sample confirmation
- Electronic filing
- Automatic tax return filing
- Definitive tax judgment
- Definitive labor judgment
- Journal final posting without human review
