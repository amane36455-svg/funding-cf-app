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

## Common Non-Negotiable Rules

- 1PR 1目的を守る
- clientから `companyId` を受け取らない
- server-side currentCompanyId を使う
- 他社データを参照しない
- AI出力は下書き、参考、確認事項に留める
- 融資可否を断定しない
- 補助金の採択可否を断定しない
- 対象経費や申請要件を断定しない
- M&A成否や企業価値を断定しない
- 税務・労務・法務・金融判断を断定しない
- 補助金の公募要領、申請様式、締切、要件は最新公式情報の確認前提とする
- secret / DB URL / token / password / 個人情報を出力しない

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

1. PR-A: staging smoke test結果のIssue #11記録Doc/コメント整理
2. PR-B: PR2前提Issue #13〜#20の完了条件再確認
3. PR-C: 融資支援MVPの要件Doc追加
4. PR-D: 融資支援MVPの画面/API/DB設計Issue作成
5. PR-E: 補助金・助成金支援の要件Doc追加
6. PR-F: 案件管理/実務運用強化の要件Doc追加
7. PR-G: M&A案件管理モードの要件Doc追加
8. PR-H以降: 各機能を1目的ずつ実装。DB変更は必ず専用PRに分離

## DB Change Separation

| Group | DB Change | Notes |
| --- | --- | --- |
| Docs/Issue候補整理 | 不要 | 今回の範囲 |
| ヒアリングフォーム画面のみ | 不要または将来必要 | MVPでローカル/一時JSONなら不要。保存するなら必要 |
| 融資案件管理 | 必要 | `funding_cases` など。別PRで設計 |
| 金融機関提出資料ドラフト保存 | 必要 | `funding_document_drafts` など。監査ログ前提 |
| 補助金案件管理 | 必要 | `subsidy_cases`, `subsidy_tasks` など |
| 実務案件管理 | 必要 | `client_cases`, `case_tasks` など |
| 会計データ分類ルール管理 | 必要 | `classification_rules` など。companyId必須 |
| M&A案件管理 | 必要 | `ma_cases`, `ma_parties`, `ma_tasks` など |
| DDタスク管理 | 必要 | M&Aまたは案件管理テーブルに従属 |
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

### Phase 1-1: 融資ヒアリングフォーム

- Issueタイトル: 融資支援MVP: ヒアリングフォーム
- 目的: 融資相談前に必要な会社情報、資金使途、希望額、返済原資、直近業績、既存借入を整理する
- 実装範囲: 入力項目設計、画面設計、バリデーション、下書きJSON構造
- MVP必須 / 後回し / 将来拡張: MVP必須。保存履歴、添付、AI質問補完は後回し
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/funding-support/hearing/page.tsx`, `src/components/funding/...`
- DB変更の有無: MVP保存なしなら不要。案件保存する場合は必要
- companyIdスコープ確認ポイント: server-side currentCompanyIdで対象会社を固定。他社の過去相談を参照しない
- 認証・権限確認ポイント: login必須。OWNER/ADMIN/STAFFは作成可、VIEWERは閲覧のみ案
- テスト方針: 必須項目、入力制限、company switch後の表示分離
- 想定リスク: 個人情報や借入情報のログ混入
- Evaluator確認ポイント: 入力項目が融資可否判断ではなく相談準備になっている
- 禁止表現: 融資可能、審査通過、確実に借りられる
- 人間確認が必要な箇所: 入力項目、金融機関へ提出する前の内容確認

### Phase 1-2: 金融機関提出資料の下書き生成

- Issueタイトル: 融資支援MVP: 金融機関提出資料下書き生成
- 目的: 会社概要、資金使途、返済計画、業績推移、資金繰り説明の下書きを作る
- 実装範囲: 下書きテンプレート、生成UI、出力プレビュー、注意文言
- MVP必須 / 後回し / 将来拡張: MVP必須。PDF/PowerPoint出力は後回し
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/funding-support/documents/...`, `src/lib/funding/draft...`
- DB変更の有無: 下書き保存するなら必要。初期は不要も可
- companyIdスコープ確認ポイント: 会社別財務データのみ利用。他社データを参照しない
- 認証・権限確認ポイント: REVIEWER/VIEWERの編集権限を制限
- テスト方針: draft生成の文言テスト、会社切替時のデータ混入防止
- 想定リスク: 金融判断の断定、誤った財務数値の流用
- Evaluator確認ポイント: 下書きであり、提出前人間確認が明記されている
- 禁止表現: 融資可否の断定、審査結果の予測断定
- 人間確認が必要な箇所: 提出前資料、財務数値、資金使途、返済計画

### Phase 1-3: 日本政策金融公庫向け説明文・確認コメント

- Issueタイトル: 融資支援MVP: 公庫向け説明文と確認コメント
- 目的: 日本政策金融公庫向けの説明文、確認コメント、代表者補足メモを下書きする
- 実装範囲: 公庫向け説明テンプレート、確認事項リスト、代表者メモ下書き
- MVP必須 / 後回し / 将来拡張: MVP必須。制度別自動判定は後回し
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/lib/funding/jfc-draft...`
- DB変更の有無: 初期は不要。案件保存なら必要
- companyIdスコープ確認ポイント: 会社別の資金繰り/業績のみ参照
- 認証・権限確認ポイント: 編集権限とレビュー権限を分離
- テスト方針: 禁止表現チェック、下書き生成時の会社分離
- 想定リスク: 公庫制度の要件を断定すること
- Evaluator確認ポイント: 最新制度/申込要件は公式確認前提になっている
- 禁止表現: 公庫審査に通る、公庫対象になる、制度要件を満たすと断定
- 人間確認が必要な箇所: 公庫制度、申込条件、提出文面

### Phase 1-4: 月次資金繰りレポート

- Issueタイトル: 融資支援MVP: 月次資金繰りレポート
- 目的: 月次の入出金、資金残高推移、資金ショート懸念、確認事項を整理する
- 実装範囲: レポート項目、画面設計、下書き出力、確認コメント
- MVP必須 / 後回し / 将来拡張: MVP必須。自動予測や銀行提出PDFは後回し
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/app/(main)/cashflow/reports/...`
- DB変更の有無: 既存CFデータ利用なら不要。保存履歴は必要
- companyIdスコープ確認ポイント: 資金繰り集計はcompanyId必須
- 認証・権限確認ポイント: 閲覧権限と出力権限を分離
- テスト方針: 集計期間、会社切替、空データ、負値表示
- 想定リスク: 資金ショートや倒産可能性を断定すること
- Evaluator確認ポイント: 確認推奨アラートとして表現されている
- 禁止表現: 倒産する、融資が必要と断定、返済不能と断定
- 人間確認が必要な箇所: 資金繰り予測、銀行説明文

### Phase 1-5: 金融機関向け確認コメント・代表者説明メモ

- Issueタイトル: 融資支援MVP: 金融機関向け確認コメントと代表者説明メモ
- 目的: 担当者が金融機関・代表者と会話する前の確認事項を整理する
- 実装範囲: 確認コメント、代表者説明メモ、未確認事項一覧
- MVP必須 / 後回し / 将来拡張: MVP必須。メール送信自動化は後回し
- 変更予定ファイル: `docs/funding-support-roadmap.md`, `src/lib/funding/review-notes...`
- DB変更の有無: 保存するなら必要。初期は不要可
- companyIdスコープ確認ポイント: 会社別メモを他社へ表示しない
- 認証・権限確認ポイント: REVIEWERコメントとSTAFF編集の境界整理
- テスト方針: 未確認事項表示、権限別表示、company switch
- 想定リスク: 金融機関への説明をAIが確定すること
- Evaluator確認ポイント: 人間が確認して使うメモである
- 禁止表現: 金融機関が納得する、融資承認される
- 人間確認が必要な箇所: 最終コメント、代表者説明内容

### Phase 1.5-1: 補助金・助成金案件登録と種別選択

- Issueタイトル: 補助金・助成金支援: 案件登録と種別選択
- 目的: 会社ごとに補助金・助成金の申請候補案件を管理する
- 実装範囲: 案件登録、種別選択、ステータス、担当者、期限の設計
- MVP必須 / 後回し / 将来拡張: MVP必須。制度自動推薦は後回し
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/app/(main)/subsidies/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: subsidy_casesはcompanyId必須
- 認証・権限確認ポイント: 作成/編集/閲覧/レビュー権限を定義
- テスト方針: 会社別案件表示、権限、ステータス更新
- 想定リスク: 採択可能性や対象制度を断定すること
- Evaluator確認ポイント: 公式情報確認前提になっている
- 禁止表現: 採択される、対象になる、要件を満たすと断定
- 人間確認が必要な箇所: 制度選択、申請可否、締切、要件

### Phase 1.5-2: 必要資料チェックリストと不足資料依頼文

- Issueタイトル: 補助金・助成金支援: 必要資料チェックと不足資料依頼文
- 目的: 申請前に必要資料と不足資料を整理し、依頼文の下書きを作る
- 実装範囲: チェックリスト、資料ステータス、依頼文下書き
- MVP必須 / 後回し / 将来拡張: MVP必須。ファイルアップロード連携は後回し
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/components/subsidies/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: document itemsはcompanyIdとcaseIdで絞る
- 認証・権限確認ポイント: 顧客閲覧/社内編集の境界を定義
- テスト方針: 不足資料の表示、依頼文生成、権限別操作
- 想定リスク: 公式様式や添付資料を断定すること
- Evaluator確認ポイント: 公募要領確認前提の文言になっている
- 禁止表現: この資料だけで足りる、必ず申請できる
- 人間確認が必要な箇所: 必要資料、依頼文送付前

### Phase 1.5-3: 公募要領・申請要件の確認項目整理

- Issueタイトル: 補助金・助成金支援: 公募要領と申請要件チェック
- 目的: 公式情報を確認するためのチェック項目を整理する
- 実装範囲: 確認項目テンプレート、公式URLメモ、未確認フラグ
- MVP必須 / 後回し / 将来拡張: MVP必須。自動スクレイピングは後回し
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/lib/subsidies/requirements...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: companyIdとcaseIdで確認結果を分離
- 認証・権限確認ポイント: REVIEWER承認必須項目を設計
- テスト方針: 未確認項目が残る場合に申請前チェックで止める
- 想定リスク: 要件をAIが断定すること、古い公募情報を使うこと
- Evaluator確認ポイント: 最新公式情報確認前提の導線
- 禁止表現: 要件を満たす、対象経費である、締切確定と断定
- 人間確認が必要な箇所: 公募要領、締切、対象経費、申請様式

### Phase 1.5-4: 事業計画書・経費計画・資金計画の下書き生成

- Issueタイトル: 補助金・助成金支援: 申請書類下書き生成
- 目的: 事業計画、経費計画、資金計画の下書きを作る
- 実装範囲: 下書きテンプレート、生成UI、差し戻しメモ、専門家確認欄
- MVP必須 / 後回し / 将来拡張: MVP必須。電子申請連携は後回し
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/lib/subsidies/drafts...`
- DB変更の有無: 保存履歴を持つなら必要
- companyIdスコープ確認ポイント: 財務/資料/下書きはcompanyIdで完全分離
- 認証・権限確認ポイント: 下書き生成/レビュー/確定扱い禁止の権限設計
- テスト方針: 禁止表現検査、空データ、専門家確認フラグ
- 想定リスク: 採択可能性や対象経費の断定
- Evaluator確認ポイント: 下書きであり専門家確認前提
- 禁止表現: 採択される、対象経費として認められる、申請要件を満たす
- 人間確認が必要な箇所: 申請書、経費計画、資金計画、専門家確認

### Phase 1.5-5: 専門家確認事項と申請前チェックリスト

- Issueタイトル: 補助金・助成金支援: 専門家確認と申請前チェック
- 目的: 申請前の未確認事項、専門家確認、提出前チェックを管理する
- 実装範囲: チェックリスト、確認者、確認日、未完了理由
- MVP必須 / 後回し / 将来拡張: MVP必須。提出自動化は後回し
- 変更予定ファイル: `docs/subsidy-application-support-plan.md`, `src/components/subsidies/review...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: caseId/companyIdで確認履歴を分離
- 認証・権限確認ポイント: REVIEWER/ADMIN承認を必須化する案
- テスト方針: 未確認がある場合に提出準備完了扱いにしない
- 想定リスク: AIが申請可能と断定すること
- Evaluator確認ポイント: 人間承認ゲートが明記されている
- 禁止表現: 申請可能、採択見込み、要件充足の断定
- 人間確認が必要な箇所: 申請前チェック、専門家確認、提出判断

### Phase 2-1: 顧客・会社別案件管理

- Issueタイトル: 実務運用強化: 顧客・会社別案件管理
- 目的: 融資、補助金、M&A、会計実務の案件を会社単位で管理する
- 実装範囲: 案件一覧、種別、ステータス、担当者、期限、メモ
- MVP必須 / 後回し / 将来拡張: MVP必須。カンバン/通知は後回し
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/app/(main)/cases/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: client_casesはcompanyId必須
- 認証・権限確認ポイント: 役割別CRUD権限
- テスト方針: 会社A/B案件分離、権限、ステータス更新
- 想定リスク: 他社案件の表示、担当者メモの漏洩
- Evaluator確認ポイント: 1会社内の案件だけが見える
- 禁止表現: 自動完了、自動承認
- 人間確認が必要な箇所: 権限表、案件種別、ステータス定義

### Phase 2-2: 会計データ分類ルール管理

- Issueタイトル: 実務運用強化: 会計データ分類ルール管理
- 目的: 会社別のCF分類、会計分類、確認ルールを管理する
- 実装範囲: ルール一覧、優先度、衝突時needs_review、変更履歴案
- MVP必須 / 後回し / 将来拡張: MVP必須。AIサジェストは後回し
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/app/(main)/settings/classification-rules/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: classification_rulesはcompanyId必須、他社ルール自動参照禁止
- 認証・権限確認ポイント: OWNER/ADMINのみ変更可、STAFFは提案まで案
- テスト方針: 他社ルール非参照、優先度、無効化、衝突
- 想定リスク: ルール誤適用による他社データ混入
- Evaluator確認ポイント: 衝突時に自動確定せずneeds_reviewになる
- 禁止表現: 自動確定、税務分類確定
- 人間確認が必要な箇所: ルール作成/更新/無効化

### Phase 2-3: 財務確認サポート / 融資相談準備チェック

- Issueタイトル: 実務運用強化: 財務確認サポートと融資相談準備チェック
- 目的: 融資相談前の財務確認項目、未確認事項、説明準備を整理する
- 実装範囲: 確認チェック、コメント下書き、未確認アラート
- MVP必須 / 後回し / 将来拡張: MVP必須。スコアリングは後回し
- 変更予定ファイル: `docs/client-case-operations-plan.md`, `src/lib/funding/readiness...`
- DB変更の有無: 保存するなら必要
- companyIdスコープ確認ポイント: 財務データ/確認結果はcompanyId分離
- 認証・権限確認ポイント: REVIEWER確認欄を設計
- テスト方針: 不足項目、未確認状態、company switch
- 想定リスク: 融資可否や財務健全性を断定すること
- Evaluator確認ポイント: 確認推奨であり判断ではない
- 禁止表現: 融資可能、問題なし、財務健全と断定
- 人間確認が必要な箇所: 財務確認、銀行相談前コメント

### Phase 3-1: M&A案件登録と進行ステータス管理

- Issueタイトル: M&A案件管理: 案件登録と進行ステータス
- 目的: 会社ごとにM&A案件の基本情報と進行状況を管理する
- 実装範囲: 案件登録、ステータス、担当者、次アクション、メモ
- MVP必須 / 後回し / 将来拡張: MVP必須。外部連携は後回し
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/app/(main)/ma/cases/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: ma_casesはcompanyId必須
- 認証・権限確認ポイント: M&A情報の閲覧権限を厳格化
- テスト方針: 会社別案件分離、権限、ステータス遷移
- 想定リスク: 機密性の高いM&A情報漏洩
- Evaluator確認ポイント: 他社案件が見えない、ログに機密情報を出さない
- 禁止表現: 成約する、買い手が見つかる
- 人間確認が必要な箇所: 案件登録、公開範囲、ステータス定義

### Phase 3-2: 売り手企業情報・買い手候補管理

- Issueタイトル: M&A案件管理: 売り手企業情報と買い手候補管理
- 目的: 売り手企業情報と買い手候補を案件単位で整理する
- 実装範囲: 売り手情報、買い手候補、接触状況、秘密保持確認欄
- MVP必須 / 後回し / 将来拡張: MVP必須。マッチング自動化は後回し
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/components/ma/...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: buyer candidatesもcompanyId/caseIdで分離
- 認証・権限確認ポイント: VIEWER制限、外部共有不可を前提
- テスト方針: 買い手候補の閲覧制御、会社切替
- 想定リスク: 買い手/売り手情報の漏洩
- Evaluator確認ポイント: 機密情報保護の文言と権限境界
- 禁止表現: 最適な買い手、成約確実
- 人間確認が必要な箇所: 候補登録、NDA状況、共有範囲

### Phase 3-3: 必要資料チェックリストとDD確認タスク

- Issueタイトル: M&A案件管理: 必要資料チェックとDDタスク
- 目的: 財務DD、税務DD、労務DD、法務確認タスクを管理する
- 実装範囲: 資料チェック、DDタスク、専門家確認、未完了理由
- MVP必須 / 後回し / 将来拡張: MVP必須。DD自動判定は後回し
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/components/ma/dd-tasks...`
- DB変更の有無: 必要
- companyIdスコープ確認ポイント: ma_due_diligence_tasksはcompanyId/caseId必須
- 認証・権限確認ポイント: 専門家確認欄と編集権限
- テスト方針: タスク表示、権限、未完了状態、他社分離
- 想定リスク: 法務/税務/労務リスクをAIが断定すること
- Evaluator確認ポイント: 専門家確認前提である
- 禁止表現: 問題なし、リスクなし、法務上安全と断定
- 人間確認が必要な箇所: DDタスク、専門家確認、資料不足

### Phase 3-4: 企業概要書・買い手向け説明資料の下書き生成

- Issueタイトル: M&A案件管理: 企業概要書と買い手向け資料下書き
- 目的: 売り手企業の概要、強み、財務概況、譲渡理由の下書きを作る
- 実装範囲: 企業概要書テンプレート、買い手向け資料下書き、確認事項
- MVP必須 / 後回し / 将来拡張: MVP必須。自動外部共有は後回し
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/lib/ma/drafts...`
- DB変更の有無: 保存履歴を持つなら必要
- companyIdスコープ確認ポイント: 下書き生成元はcompanyId/caseIdで限定
- 認証・権限確認ポイント: REVIEWER承認前の外部共有禁止
- テスト方針: 禁止表現、空データ、権限、会社分離
- 想定リスク: 事実と推測の混同、機密情報漏洩
- Evaluator確認ポイント: 下書きであり人間確認前提
- 禁止表現: 買収すべき、売却すべき、成約見込み確定
- 人間確認が必要な箇所: 企業概要、買い手向け資料、外部共有

### Phase 3-5: 譲渡価格の参考試算

- Issueタイトル: M&A案件管理: 譲渡価格の参考試算
- 目的: 財務情報をもとに参考レンジや確認材料を整理する
- 実装範囲: 試算入力、計算根拠メモ、注意文言、専門家確認欄
- MVP必須 / 後回し / 将来拡張: 後回し。M&A案件管理の後
- 変更予定ファイル: `docs/ma-case-management-plan.md`, `src/lib/ma/valuation-reference...`
- DB変更の有無: 保存するなら必要
- companyIdスコープ確認ポイント: 財務データはcompanyId/caseIdで限定
- 認証・権限確認ポイント: OWNER/ADMIN/REVIEWER限定案
- テスト方針: 入力検証、計算表示、注意文言、会社分離
- 想定リスク: 企業価値や譲渡価格を断定すること
- Evaluator確認ポイント: 参考試算であり専門家確認前提
- 禁止表現: 企業価値はこの金額、適正価格、成約価格と断定
- 人間確認が必要な箇所: 試算ロジック、前提条件、専門家確認

## Cross-Cutting Test Policy

- unit: 入力バリデーション、禁止表現ガード、テンプレート出力
- integration: company A/Bのデータ分離、権限別CRUD、server-side company context
- e2e/smoke: 画面導線、会社切替、下書き表示、未確認ゲート
- security: secret/DB URL/token/password/個人情報のログ出力なし
- evaluator: 断定表現、専門家確認、公式情報確認前提、下書き表示を確認

## Auth And Permission Checkpoints

- login必須
- currentCompanyId必須
- OWNER/ADMIN: 管理・編集
- STAFF: 入力・下書き作成
- REVIEWER: 確認・差戻し・レビュー
- VIEWER: 閲覧のみ
- 外部共有、提出、申請、金融機関送付は人間確認後の別操作

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
4. 融資支援MVPの最小画面/DB有無を人間確認
5. 補助金・M&Aは公式情報/専門家確認前提のまま後続Issueへ分割
