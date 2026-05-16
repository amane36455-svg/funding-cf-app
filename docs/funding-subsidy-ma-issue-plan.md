# 融資支援・補助金支援・実務運用・M&A構想 Issue分解

## Scope

このDocは、資金調達・CF可視化アプリへ追加する将来機能群をIssue候補とPR分割案へ整理するための計画資料です。

今回は実装しません。DB migration追加、Prisma schema変更、API実装、PR2 CSV/Excel取込MVP実装、staging migration再実行、本番DB操作は行いません。

## Current Repository Status

確認日: 2026-05-16

- PR #10 / #12 / #21 / #29 / #30 は main 反映済み
- staging migration workflow はReady
- ユーザー報告ベースで staging workflow / staging DB migration / SQL主要確認は成功
- smoke test は未完了
- Issue #11 への最終結果記録は未完了
- PR2 CSV/Excel取込MVPは未着手
- open PRとして Notion to GitHub Issue automation PR #40 が存在
- PR2準備Issue #13〜#20 が未完了
- 将来構想Epic #22〜#28 が未完了

## Current Top Priority

以下を、融資支援・補助金支援・M&Aより先に完了する。

1. staging smoke test
2. Issue #11 へのstaging migration最終結果記録
3. PR2 CSV/Excel取込MVP

PR2前に、融資支援・補助金支援・M&Aの本実装、DB schema変更、AI統合、API実装へ進まない。

## Revised Phase Order

### Phase A: 安全な収集・可視化系

PR2の基礎が固まった後、判断や申請代行に踏み込まない収集・可視化から着手する。

- 融資ヒアリングフォーム
- 月次資金繰りレポート
- 代表者説明メモ
- 補助金案件登録
- 顧客・会社別案件管理

### Phase B: AI下書き系

schema/UI/権限が安定した後、下書き生成のみを別PRで追加する。

- 金融機関提出資料下書き
- 公庫向け説明文下書き
- 公庫提出資料の社内レビューコメント
- 補助金事業計画書下書き
- 補助金経費計画・資金計画下書き
- 不足資料依頼文生成
- 社内レビューコメント

### Phase C: 実務運用拡張

- 会計データ分類ルール管理
- 財務確認サポート
- 融資相談準備チェック
- 補助金申請前チェックリスト
- 専門家確認事項整理

### Phase D: M&A

M&Aは規制・機密・権限の露出が大きいため、法務確認ゲート通過後に着手する。

- D0: 法務確認ゲート
- D1: M&A案件レベルACLモデル
- D2: M&A案件登録
- D3: 企業概要書下書き
- D4: 買い手向け説明資料下書き
- D5: 譲渡価格の算定アプローチ整理

D5は数値自動計算ではなく、前提条件と算定方法の整理に留める。

## Terminology Rules

| Use | Avoid |
| --- | --- |
| 社内レビュー用確認事項 | 金融機関向け確認コメント |
| 公庫提出資料の社内レビューコメント | 公庫向けコメント |
| 財務確認サポート | AI財務診断 |
| 融資相談準備チェック | 融資可能性チェック |
| 譲渡価格の算定アプローチ整理 | 譲渡価格の参考試算 |
| 対象経費候補 / 確認事項 / 下書き | 対象経費判定 |

## Common Non-Negotiable Rules

- 1PR 1目的を守る
- clientから `companyId` を受け取らない
- server-side currentCompanyId を使う
- 他社データを参照しない
- AI promptに複数 `companyId` のデータを混ぜない
- AI出力は下書き、参考、確認事項に留める
- 融資可否を断定しない
- 補助金の採択可否を断定しない
- 対象経費や申請要件を断定しない
- M&A成否や企業価値を断定しない
- 税務・労務・法務・金融判断を断定しない
- 補助金の公募要領、申請様式、締切、要件は最新公式情報の確認前提とする
- secret / DB URL / token / password / 個人情報を出力しない

## companyId / customerId Definition

- `companyId` は既存のテナント境界として維持する。
- 案件、補助金、M&A、分類ルール、DD資料はすべて `companyId` 必須とする。
- clientから `companyId` を受け取らない。
- server-side currentCompanyId から対象会社を決定する。
- `customerId` を導入する場合は、会社エンティティではなくCRM上の顧客レコード、担当先、外部連絡先など、意味を明文化してから使う。
- `companyId` と `customerId` を混同しない。
- AI prompt、要約、下書き生成に複数 `companyId` のデータを混ぜない。
- M&A DD資料は `companyId + maCaseId + file-level permission` を必須検討する。

## 1PR 1目的 Rules

- DB schema変更Issueは単独PRにする。
- AI統合Issueはschema/UI安定後の別PRにする。
- 権限・ACL変更は単独PRにする。
- disclaimer / 危険表現修正は別PRにする。
- 1 Phaseを1 PRにしない。
- Docs、schema、UI、API、AI、権限、テストは必要に応じて分ける。
- DB変更を含むPRでは、migration内容、rollback困難性、staging検証、companyId漏洩防止テストを必須確認にする。

## Subsidy Support Policy

補助金・助成金支援は規制と最新公式情報依存が大きいため、以下を前提にする。

- アプリは申請代行をしない。
- 事業者本人が自身の申請準備を行うための支援ツールとする。
- 補助金マスタをアプリ内で固定管理しない。
- 事業者本人が補助金名、公募要領URL、締切を入力する。
- 公募要領・申請要件は最新公式情報確認前提とする。
- 対象経費判定はしない。
- 「対象経費候補」「確認事項」「下書き」に留める。
- 申請代行、採択見込み、採択率、要件を満たす、という表現は禁止する。

## M&A Support Policy

M&Aは法務・金融・税務・労務・機密管理の規制エクスポージャが高いため、初期から制限を強くする。

- M&Aは法務レビューゲート通過後に着手する。
- 仲介、買い手紹介、マッチング、成約見込み表示は行わない。
- M&A案件には案件単位ACLを必須検討する。
- STAFF全員に自動公開しない。
- DD資料は `companyId + maCaseId + file-level permission` で管理する。
- 譲渡価格は単独数値表示しない。
- 企業価値、適正譲渡価格、成約見込み、売却成功率は禁止する。
- 初期MVPでは「算定アプローチ整理」に留め、数値自動計算をしない。

## Unfinished Issues

| Issue | Status | Next Action |
| --- | --- | --- |
| #11 PostgreSQL enum migrationの安全化 | staging migration後の最終記録とsmoke testが未完了 | smoke test完了後にIssue #11へ結果記録 |
| #13 storageRef実体ストレージ選定 | PR2前設計 | PR2の前提として保管先/保持期間/権限を決める |
| #14 CSV/Excelファイルサイズ上限 | PR2前設計 | size/row/column/cell上限を決める |
| #15 対応エンコーディング方針 | PR2前設計 | UTF-8 / Shift_JIS / BOM / 文字化け警告方針を決める |
| #16 formula injection対策 | PR2前設計 | export sanitize方針を決める |
| #17 mapping_rules CRUD権限モデル | PR2前設計 | role別権限とcompanyId境界を決める |
| #18 needs_review行UIフロー | PR2前設計 | 未確認行を止めるUIを決める |
| #19 漏洩防止integration test雛形 | PR2前設計 | company A/B分離テストを作る |
| #20 audit-api-scope AST化 | PR2前設計 | import API増加前に検査方針を決める |
| #22〜#28 将来構想Epic | 未完了 | 今回の追加構想と依存関係を整理 |
| PR #40 Notion to GitHub Issue automation | open | Claudeレビューと外部設定確認 |

## PR Split Proposal

推奨順序:

1. PR-A: staging smoke test結果のIssue #11記録
2. PR-B: PR2前提Issue #13〜#20の完了条件再確認
3. PR-C: PR2 CSV/Excel取込MVP
4. PR-D: 融資支援MVPの安全な収集・可視化Doc
5. PR-E: 融資支援MVPのUI設計
6. PR-F: 融資支援MVPのDB schema設計。単独PR
7. PR-G: 融資支援MVPのAPI実装
8. PR-H: 融資支援MVPのAI下書き生成。schema/UI/API安定後
9. PR-I: 補助金・助成金支援の要件Doc
10. PR-J: 案件管理/実務運用強化の要件Doc
11. PR-K: M&A法務確認ゲートとACL設計Doc
12. PR-L以降: 各機能を1目的ずつ実装

## DB Change Separation

| Group | DB Change | Notes |
| --- | --- | --- |
| Docs/Issue候補整理 | 不要 | 今回の範囲 |
| ヒアリングフォーム画面のみ | 不要または将来必要 | MVPで一時JSONなら不要。保存するなら必要 |
| 融資案件管理 | 必要 | `funding_cases` など。別PRで設計 |
| 金融機関提出資料ドラフト保存 | 必要 | `funding_document_drafts` など。監査ログ前提 |
| 補助金案件管理 | 必要 | `subsidy_cases`, `subsidy_tasks` など。申請代行ではない |
| 実務案件管理 | 必要 | `client_cases`, `case_tasks` など |
| 会計データ分類ルール管理 | 必要 | `classification_rules` など。companyId必須 |
| M&A法務ゲート/ACL | 必要 | `ma_case_acl` など。実装前に法務確認 |
| M&A案件管理 | 必要 | `ma_cases`, `ma_parties`, `ma_tasks` など |
| DD資料管理 | 必要 | `companyId + maCaseId + file-level permission` 前提 |
| 下書き生成のみ | 不要または将来必要 | 保存しないなら不要、履歴化するなら必要 |

## Common File Candidates

- `docs/funding-support-roadmap.md`
- `docs/subsidy-application-support-plan.md`
- `docs/client-case-operations-plan.md`
- `docs/ma-case-management-plan.md`
- `src/app/(main)/funding-support/...`
- `src/app/(main)/subsidies/...`
- `src/app/(main)/cases/...`
- `src/app/(main)/ma/...`
- `src/app/api/...`
- `src/lib/auth/...`
- `src/lib/company/...`
- `src/lib/ai/draft-guard...`
- `tests/unit/...`
- `tests/integration/...`

## Issue Candidates

### A1: 融資ヒアリングフォーム

- Issueタイトル: 融資支援MVP: ヒアリングフォーム
- 目的: 融資相談前に必要な会社情報、資金使途、希望額、返済原資、直近業績、既存借入を整理する。
- 実装範囲: 入力項目設計、画面設計、バリデーション、下書きJSON構造。
- MVP必須 / 後回し / 将来拡張: Phase A必須。保存履歴、添付、AI質問補完は後回し。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/funding-support/hearing/page.tsx`, `src/components/funding/...`
- DB変更の有無: MVP保存なしなら不要。案件保存する場合は単独PRで必要。
- companyIdスコープ確認ポイント: server-side currentCompanyIdで対象会社を固定。他社の過去相談を参照しない。
- 認証・権限確認ポイント: login必須。OWNER/ADMIN/STAFFは作成可、VIEWERは閲覧のみ案。
- テスト方針: 必須項目、入力制限、company switch後の表示分離。
- 想定リスク: 個人情報や借入情報のログ混入。
- Evaluator確認ポイント: 入力項目が融資判断ではなく相談準備になっている。
- 禁止表現: 融資可能、審査通過、確実に借りられる。
- 人間確認が必要な箇所: 入力項目、金融機関へ提出する前の内容確認。

### A2: 月次資金繰りレポート

- Issueタイトル: 融資支援MVP: 月次資金繰りレポート
- 目的: 月次の入出金、資金残高推移、確認推奨事項を整理する。
- 実装範囲: レポート項目、画面設計、確認コメント、下書き出力。
- MVP必須 / 後回し / 将来拡張: Phase A必須。自動予測や銀行提出PDFは後回し。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/cashflow/reports/...`
- DB変更の有無: 既存CFデータ利用なら不要。保存履歴は単独PRで必要。
- companyIdスコープ確認ポイント: 資金繰り集計はcompanyId必須。
- 認証・権限確認ポイント: 閲覧権限と出力権限を分離。
- テスト方針: 集計期間、会社切替、空データ、負値表示。
- 想定リスク: 資金ショートや倒産可能性を断定すること。
- Evaluator確認ポイント: 確認推奨アラートとして表現されている。
- 禁止表現: 倒産する、融資が必要と断定、返済不能と断定。
- 人間確認が必要な箇所: 資金繰り予測、社内レビュー用確認事項。

### A3: 代表者説明メモ

- Issueタイトル: 融資支援MVP: 代表者説明メモ
- 目的: 代表者が金融機関等へ説明する前の論点整理メモを作る。
- 実装範囲: 説明メモテンプレート、未確認事項、社内レビュー用確認事項。
- MVP必須 / 後回し / 将来拡張: Phase A必須。AI文章生成はPhase B。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/lib/funding/review-notes...`
- DB変更の有無: 保存するなら単独PRで必要。初期は不要可。
- companyIdスコープ確認ポイント: 会社別メモを他社へ表示しない。
- 認証・権限確認ポイント: REVIEWERコメントとSTAFF編集の境界整理。
- テスト方針: 未確認事項表示、権限別表示、company switch。
- 想定リスク: 金融機関への説明をアプリが確定すること。
- Evaluator確認ポイント: 人間が確認して使うメモである。
- 禁止表現: 金融機関が納得する、融資承認される。
- 人間確認が必要な箇所: 最終コメント、代表者説明内容。

### A0: 補助金支援 法務確認ゲート

- Issueタイトル: 補助金・助成金支援: 法務確認ゲート
- 目的: 補助金支援機能に入る前に、行政書士法21条の業務範囲、申請代行と本人準備支援の境界、最新公募要領依存性、規制・機密管理の前提を確認する。
- 実装範囲: 法務確認チェックリスト、禁止事項、着手可否メモ。
- MVP必須 / 後回し / 将来拡張: Phase Aの補助金関連Issue、A4以降の前提として必須。
- 変更予定ファイル: docs/subsidy-application-support-plan.md
- DB変更の有無: Docs段階は不要。
- companyIdスコープ確認ポイント: 補助金関連データはcompanyId必須。
- 認証・権限確認ポイント: 補助金機能を有効化できる権限を限定。
- テスト方針: 法務確認未完了時は補助金実装Issueへ進まない運用確認。
- 想定リスク: 申請代行や採択保証に見える機能設計。
- Evaluator確認ポイント: 法務ゲートなしに補助金機能の本実装へ進まない。
- 禁止表現: 申請代行、採択見込み、採択率、要件を満たす。
- 人間確認が必要な箇所: 法務レビュー、利用規約、業務範囲、運用範囲。

### A4: 補助金案件登録

- Issueタイトル: 補助金・助成金支援: 事業者本人向け案件登録
- 目的: 事業者本人が申請準備対象の補助金・助成金案件を登録する。
- 実装範囲: 補助金名、公募要領URL、締切、ステータス、担当者、公式情報確認欄。
- MVP必須 / 後回し / 将来拡張: Phase A必須。制度自動推薦や固定マスタは後回しではなく初期対象外。
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/app/(main)/subsidies/...`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: `subsidy_cases` はcompanyId必須。
- 認証・権限確認ポイント: 作成/編集/閲覧/レビュー権限を定義。
- テスト方針: 会社別案件表示、権限、ステータス更新。
- 想定リスク: 採択可能性や対象制度を断定すること。
- Evaluator確認ポイント: アプリが申請代行せず、本人準備支援である。
- 禁止表現: 申請代行、採択見込み、採択率、要件を満たす。
- 人間確認が必要な箇所: 補助金名、公募要領URL、締切、最新公式情報。

### A5: 顧客・会社別案件管理

- Issueタイトル: 実務運用強化: 顧客・会社別案件管理
- 目的: 融資、補助金、M&A、会計実務の案件を会社単位で管理する。
- 実装範囲: 案件一覧、種別、ステータス、担当者、期限、メモ。
- MVP必須 / 後回し / 将来拡張: Phase A。ただしPR2完了後。
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/app/(main)/cases/...`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: `client_cases` はcompanyId必須。customerIdを導入する場合は意味を明文化。
- 認証・権限確認ポイント: 役割別CRUD権限。
- テスト方針: 会社A/B案件分離、権限、ステータス更新。
- 想定リスク: 他社案件の表示、担当者メモの漏洩。
- Evaluator確認ポイント: 1会社内の案件だけが見える。
- 禁止表現: 自動完了、自動承認。
- 人間確認が必要な箇所: 権限表、案件種別、ステータス定義。

### B1: 金融機関提出資料下書き

- Issueタイトル: 融資支援MVP: 金融機関提出資料下書き
- 目的: 会社概要、資金使途、返済計画、業績推移、資金繰り説明の下書きを作る。
- 実装範囲: 下書きテンプレート、生成UI、出力プレビュー、注意文言。
- MVP必須 / 後回し / 将来拡張: Phase B。schema/UI/権限安定後。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/funding-support/documents/...`, `src/lib/funding/draft...`
- DB変更の有無: 下書き保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: 会社別財務データのみ利用。他社データを参照しない。
- 認証・権限確認ポイント: REVIEWER/VIEWERの編集権限を制限。
- テスト方針: draft生成の文言テスト、会社切替時のデータ混入防止。
- 想定リスク: 金融判断の断定、誤った財務数値の流用。
- Evaluator確認ポイント: 下書きであり、提出前人間確認が明記されている。
- 禁止表現: 融資可否の断定、審査結果の予測断定。
- 人間確認が必要な箇所: 提出前資料、財務数値、資金使途、返済計画。

### B2: 公庫向け説明文下書き / 公庫提出資料の社内レビューコメント

- Issueタイトル: 融資支援MVP: 公庫向け説明文下書きと社内レビューコメント
- 目的: 日本政策金融公庫向け資料を作る前の説明文下書きと社内確認事項を整理する。
- 実装範囲: 説明テンプレート、社内レビューコメント、代表者補足メモ下書き。
- MVP必須 / 後回し / 将来拡張: Phase B。制度別自動判定は対象外。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/lib/funding/jfc-draft...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: 会社別の資金繰り/業績のみ参照。
- 認証・権限確認ポイント: 編集権限とレビュー権限を分離。
- テスト方針: 禁止表現チェック、下書き生成時の会社分離。
- 想定リスク: 公庫制度の要件を断定すること。
- Evaluator確認ポイント: 最新制度/申込要件は公式確認前提になっている。
- 禁止表現: 公庫審査に通る、公庫対象になる、制度要件を満たすと断定。
- 人間確認が必要な箇所: 公庫制度、申込条件、提出文面。

### B3: 補助金事業計画書下書き

- Issueタイトル: 補助金・助成金支援: 事業計画書下書き
- 目的: 事業者本人が申請準備を行うための事業計画書下書きを作る。
- 実装範囲: 下書きテンプレート、公式情報確認欄、専門家確認欄。
- MVP必須 / 後回し / 将来拡張: Phase B。電子申請連携は対象外。
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/lib/subsidies/drafts...`
- DB変更の有無: 保存履歴を持つなら単独PRで必要。
- companyIdスコープ確認ポイント: 財務/資料/下書きはcompanyIdで完全分離。
- 認証・権限確認ポイント: 下書き生成/レビュー/確定扱い禁止の権限設計。
- テスト方針: 禁止表現検査、空データ、専門家確認フラグ。
- 想定リスク: 採択可能性や申請要件の断定。
- Evaluator確認ポイント: 下書きであり、最新公式情報と専門家確認が前提。
- 禁止表現: 採択される、要件を満たす、申請代行。
- 人間確認が必要な箇所: 申請書、公式情報、専門家確認。

### B4: 補助金経費計画・資金計画下書き

- Issueタイトル: 補助金・助成金支援: 経費計画・資金計画下書き
- 目的: 経費計画と資金計画を、対象経費候補と確認事項として整理する。
- 実装範囲: 下書きテンプレート、対象経費候補、確認事項、差戻しメモ。
- MVP必須 / 後回し / 将来拡張: Phase B。
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/lib/subsidies/budget-drafts...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: caseId/companyIdで分離。
- 認証・権限確認ポイント: REVIEWER確認欄を必須検討。
- テスト方針: 対象経費候補の表現、未確認ゲート、会社分離。
- 想定リスク: 対象経費判定に見える表現。
- Evaluator確認ポイント: 対象経費候補に留まっている。
- 禁止表現: 対象経費である、経費として認められる、採択される。
- 人間確認が必要な箇所: 経費計画、資金計画、公募要領。

### B5: 不足資料依頼文生成

- Issueタイトル: 補助金・助成金支援: 不足資料依頼文生成
- 目的: 不足資料を依頼する文面の下書きを作る。
- 実装範囲: 不足資料一覧、依頼文下書き、送付前確認欄。
- MVP必須 / 後回し / 将来拡張: Phase B。自動送信は後回し。
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/components/subsidies/document-requests...`
- DB変更の有無: 資料状態を保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: document itemsはcompanyIdとcaseIdで絞る。
- 認証・権限確認ポイント: 顧客閲覧/社内編集の境界を定義。
- テスト方針: 不足資料の表示、依頼文生成、権限別操作。
- 想定リスク: 公式様式や添付資料を断定すること。
- Evaluator確認ポイント: 送付前人間確認がある。
- 禁止表現: この資料だけで足りる、必ず申請できる。
- 人間確認が必要な箇所: 必要資料、依頼文送付前。

### B6: 社内レビューコメント

- Issueタイトル: 融資/補助金支援: 社内レビューコメント
- 目的: 下書き資料に対する社内確認事項と差戻し理由を管理する。
- 実装範囲: コメント欄、確認ステータス、差戻し理由。
- MVP必須 / 後回し / 将来拡張: Phase B。
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `docs/subsidy-application-support-plan.md`, `src/components/review-comments/...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: review commentsはcompanyId/caseId必須。
- 認証・権限確認ポイント: REVIEWER/ADMINの確認権限を定義。
- テスト方針: 権限、差戻し、他社コメント非表示。
- 想定リスク: コメント内の個人情報や機密情報ログ混入。
- Evaluator確認ポイント: コメントは判断確定ではなく確認事項。
- 禁止表現: 承認確定、申請可能、融資可能。
- 人間確認が必要な箇所: コメント内容、差戻し理由。

### C1: 会計データ分類ルール管理

- Issueタイトル: 実務運用強化: 会計データ分類ルール管理
- 目的: 会社別のCF分類、会計分類、確認ルールを管理する。
- 実装範囲: ルール一覧、優先度、衝突時needs_review、変更履歴案。
- MVP必須 / 後回し / 将来拡張: Phase C。AIサジェストは後回し。
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/app/(main)/settings/classification-rules/...`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: `classification_rules` はcompanyId必須、他社ルール自動参照禁止。
- 認証・権限確認ポイント: OWNER/ADMINのみ変更可、STAFFは提案まで案。
- テスト方針: 他社ルール非参照、優先度、無効化、衝突。
- 想定リスク: ルール誤適用による他社データ混入。
- Evaluator確認ポイント: 衝突時に自動確定せずneeds_reviewになる。
- 禁止表現: 自動確定、税務分類確定。
- 人間確認が必要な箇所: ルール作成/更新/無効化。

### C2: 財務確認サポート / 融資相談準備チェック

- Issueタイトル: 実務運用強化: 財務確認サポートと融資相談準備チェック
- 目的: 融資相談前の財務確認項目、未確認事項、説明準備を整理する。
- 実装範囲: 確認チェック、コメント下書き、未確認アラート。
- MVP必須 / 後回し / 将来拡張: Phase C。スコアリングは対象外。
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/lib/funding/readiness...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: 財務データ/確認結果はcompanyId分離。
- 認証・権限確認ポイント: REVIEWER確認欄を設計。
- テスト方針: 不足項目、未確認状態、company switch。
- 想定リスク: 融資可否や財務健全性を断定すること。
- Evaluator確認ポイント: 確認推奨であり判断ではない。
- 禁止表現: 融資可能、問題なし、財務健全と断定。
- 人間確認が必要な箇所: 財務確認、銀行相談前コメント。

### C3: 補助金申請前チェックリスト

- Issueタイトル: 補助金・助成金支援: 申請前チェックリスト
- 目的: 事業者本人が申請前に未確認事項を確認できるようにする。
- 実装範囲: チェックリスト、公式情報確認欄、未完了理由。
- MVP必須 / 後回し / 将来拡張: Phase C。提出自動化は対象外。
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/components/subsidies/review...`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: caseId/companyIdで確認履歴を分離。
- 認証・権限確認ポイント: REVIEWER/ADMIN確認欄を検討。
- テスト方針: 未確認がある場合に準備完了扱いにしない。
- 想定リスク: AIが申請可能と断定すること。
- Evaluator確認ポイント: 人間確認ゲートが明記されている。
- 禁止表現: 申請可能、採択見込み、要件充足の断定。
- 人間確認が必要な箇所: 申請前チェック、専門家確認、提出判断。

### C4: 専門家確認事項整理

- Issueタイトル: 補助金・融資・M&A共通: 専門家確認事項整理
- 目的: 税理士、弁護士、社労士、金融機関などへ確認すべき事項を整理する。
- 実装範囲: 確認事項、担当専門家種別、確認状況、回答メモ。
- MVP必須 / 後回し / 将来拡張: Phase C。
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/components/expert-review/...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: expert review itemsはcompanyId/caseId必須。
- 認証・権限確認ポイント: REVIEWER以上の確認権限を検討。
- テスト方針: 権限、他社分離、未確認状態。
- 想定リスク: 専門家回答をAIが判断確定に変えること。
- Evaluator確認ポイント: 確認事項整理であり判断ではない。
- 禁止表現: 法的に問題なし、税務上認められる、労務上安全。
- 人間確認が必要な箇所: 専門家回答、最終判断。

### D0: M&A法務確認ゲート

- Issueタイトル: M&A案件管理: 法務確認ゲート
- 目的: M&A機能に入る前に、法務・規制・機密管理の前提を確認する。
- 実装範囲: 法務確認チェックリスト、禁止事項、着手可否メモ。
- MVP必須 / 後回し / 将来拡張: Phase Dの最初に必須。
- 変更予定ファイル: `docs/ma-case-management-plan.md`
- DB変更の有無: Docs段階は不要。保存するなら単独PR。
- companyIdスコープ確認ポイント: M&AデータはcompanyId必須。
- 認証・権限確認ポイント: M&A機能を有効化できる権限を限定。
- テスト方針: 法務確認未完了時はM&A実装Issueへ進まない運用確認。
- 想定リスク: 仲介、紹介、マッチング、成約支援に見えること。
- Evaluator確認ポイント: 法務ゲートなしにM&A機能へ進まない。
- 禁止表現: 仲介、買い手紹介、マッチング、成約見込み表示。
- 人間確認が必要な箇所: 法務レビュー、利用規約、運用範囲。

### D1: M&A案件レベルACLモデル

- Issueタイトル: M&A案件管理: 案件レベルACLモデル
- 目的: M&A案件をSTAFF全員に自動公開しない権限モデルを定義する。
- 実装範囲: ACLモデル、case member、role、file-level permission設計。
- MVP必須 / 後回し / 将来拡張: D0後に必須。
- 変更予定ファイル: `docs/ma-case-management-plan.md`, future `prisma/schema.prisma`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: `companyId + maCaseId + file-level permission`。
- 認証・権限確認ポイント: OWNER/ADMINでも案件参加者制限を検討。
- テスト方針: 非参加STAFFが案件/DD資料を読めないこと。
- 想定リスク: M&A機密情報の社内過剰共有。
- Evaluator確認ポイント: STAFF全員公開になっていない。
- 禁止表現: 社内全員閲覧、共有前提。
- 人間確認が必要な箇所: ACL設計、例外権限、監査ログ要否。

### D2: M&A案件登録

- Issueタイトル: M&A案件管理: 案件登録
- 目的: 会社ごとにM&A案件の基本情報と進行状況を管理する。
- 実装範囲: 案件登録、ステータス、担当者、次アクション、メモ。
- MVP必須 / 後回し / 将来拡張: D1後。
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/app/(main)/ma/cases/...`
- DB変更の有無: 必要。単独PR。
- companyIdスコープ確認ポイント: `ma_cases` はcompanyId必須。
- 認証・権限確認ポイント: M&A案件ACLを必ず通す。
- テスト方針: 会社別案件分離、ACL、ステータス遷移。
- 想定リスク: 機密性の高いM&A情報漏洩。
- Evaluator確認ポイント: 他社案件が見えない、ログに機密情報を出さない。
- 禁止表現: 成約する、買い手が見つかる。
- 人間確認が必要な箇所: 案件登録、公開範囲、ステータス定義。

### D3: 企業概要書下書き

- Issueタイトル: M&A案件管理: 企業概要書下書き
- 目的: 売り手企業の概要、強み、財務概況、譲渡理由の下書きを作る。
- 実装範囲: 企業概要書テンプレート、事実/推測区分、確認事項。
- MVP必須 / 後回し / 将来拡張: D2後。AI生成はさらに別PR。
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/lib/ma/drafts...`
- DB変更の有無: 保存履歴を持つなら単独PRで必要。
- companyIdスコープ確認ポイント: 下書き生成元はcompanyId/maCaseIdで限定。
- 認証・権限確認ポイント: REVIEWER承認前の外部共有禁止。
- テスト方針: 禁止表現、空データ、権限、会社分離。
- 想定リスク: 事実と推測の混同、機密情報漏洩。
- Evaluator確認ポイント: 下書きであり人間確認前提。
- 禁止表現: 売却すべき、成約見込み確定。
- 人間確認が必要な箇所: 企業概要、外部共有、事実確認。

### D4: 買い手向け説明資料下書き

- Issueタイトル: M&A案件管理: 買い手向け説明資料下書き
- 目的: 買い手候補へ提示する前の説明資料下書きを作る。
- 実装範囲: 資料下書き、共有前チェック、NDA確認欄。
- MVP必須 / 後回し / 将来拡張: D3後。
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/components/ma/buyer-materials...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: buyer candidatesもcompanyId/maCaseIdで分離。
- 認証・権限確認ポイント: 外部共有はREVIEWER承認後の別操作。
- テスト方針: 買い手候補の閲覧制御、会社切替、NDA未確認ゲート。
- 想定リスク: 買い手/売り手情報の漏洩。
- Evaluator確認ポイント: 機密情報保護の文言と権限境界。
- 禁止表現: 最適な買い手、成約確実、買い手紹介。
- 人間確認が必要な箇所: 候補登録、NDA状況、共有範囲。

### D5: 譲渡価格の算定アプローチ整理

- Issueタイトル: M&A案件管理: 譲渡価格の算定アプローチ整理
- 目的: 譲渡価格を単独数値表示せず、前提条件と算定方法を整理する。
- 実装範囲: 算定アプローチの説明、必要資料、前提条件、専門家確認欄。
- MVP必須 / 後回し / 将来拡張: 後回し。D0〜D4後。
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/lib/ma/valuation-approach...`
- DB変更の有無: 保存するなら単独PRで必要。
- companyIdスコープ確認ポイント: 財務データはcompanyId/maCaseIdで限定。
- 認証・権限確認ポイント: OWNER/ADMIN/REVIEWER限定案。案件ACLも必須。
- テスト方針: 単独数値表示なし、注意文言、会社分離、ACL。
- 想定リスク: 企業価値や譲渡価格を断定すること。
- Evaluator確認ポイント: 算定方法の整理であり、価格算定や評価ではない。
- 禁止表現: 企業価値、適正譲渡価格、成約見込み、売却成功率。
- 人間確認が必要な箇所: 算定方法、前提条件、専門家確認。

## Cross-Cutting Test Policy

- unit: 入力バリデーション、禁止表現ガード、テンプレート出力。
- integration: company A/Bのデータ分離、権限別CRUD、server-side company context。
- e2e/smoke: 画面導線、会社切替、下書き表示、未確認ゲート。
- security: secret/DB URL/token/password/個人情報のログ出力なし。
- evaluator: 断定表現、専門家確認、公式情報確認前提、下書き表示を確認。
- M&A: 案件ACL、file-level permission、非参加STAFFの閲覧不可を確認。
- 補助金: 公式情報確認、本人準備支援、対象経費候補表現を確認。

## Auth And Permission Checkpoints

- login必須。
- currentCompanyId必須。
- OWNER/ADMIN: 管理・編集。
- STAFF: 入力・下書き作成。ただしM&Aは案件ACLに従う。
- REVIEWER: 確認・差戻し・レビュー。
- VIEWER: 閲覧のみ。
- 外部共有、提出、申請、金融機関送付は人間確認後の別操作。
- M&AはSTAFF全員に自動公開しない。

## Docs Plan

追加候補:

- `docs/funding-support-roadmap.md`
- `docs/subsidy-application-support-plan.md`
- `docs/client-case-operations-plan.md`
- `docs/ma-case-management-plan.md`

今回のDocは、上記を個別PRに分ける前のIssue候補整理として扱う。

## Next Work

1. Issue #11へstaging smoke test結果を記録
2. PR2準備Issue #13〜#20の優先度を確定
3. PR2 CSV/Excel取込MVPの範囲を再確認
4. Phase Aの安全な収集・可視化系から融資支援MVPを設計
5. 補助金は申請代行ではなく本人準備支援として設計
6. M&Aは法務確認ゲートと案件ACL設計まで進むまで本実装しない
