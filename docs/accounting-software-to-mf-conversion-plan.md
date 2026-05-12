# 他社会計ソフト → MFインポート用仕訳帳変換計画

## 追加要件定義

JDL、freee、弥生、ミロクなど、他社会計ソフトからエクスポートされたCSV/Excelデータを、Money Forward会計へインポート可能な仕訳帳形式へ加工・変換する。

この機能はAI仕訳学習とは別機能として扱う。AI仕訳学習は会社別の過去仕訳から候補を生成する機能であり、本機能は他社会計ソフトからMFへ移行するためのデータ変換支援である。

## 目的

- 会計事務所や法人経理におけるMF会計への移行作業を効率化する
- 列構成や税区分が異なる仕訳データを、確認可能な形でMFインポート用CSVへ変換する
- 未判定、変換不能、税区分不明の項目を人間が確認できるようにする
- 変換前データと変換後データを追跡可能にする

## 対象データ

- JDL仕訳帳エクスポート
- freee仕訳帳エクスポート
- 弥生会計仕訳帳エクスポート
- ミロク仕訳帳エクスポート
- その他CSV/Excel形式の仕訳帳

## 想定フロー

1. ユーザーが会計ソフトから仕訳帳をエクスポートする
2. アプリにCSV/Excelを貼り付け、またはアップロードする
3. 変換テンプレートを選択する
4. アプリが列名、日付、勘定科目、補助科目、摘要、金額、税区分を読み取る
5. Money Forward会計のインポート用仕訳帳形式へ変換する
6. 変換結果を画面で確認する
7. エラーや未変換項目を一覧表示する
8. ユーザーが必要に応じて修正する
9. MFインポート用CSVとして出力する

## 画面メニュー案

### 案A: データ変換

- データ変換
- MF仕訳帳CSV取込
- MFインポート用CSV変換
- 変換履歴
- 変換ルール

### 案B: MF移行支援

- MF移行支援
- 他社会計ソフト取込
- MFインポートCSV作成
- 未変換項目レビュー
- 変換ルール管理

### 推奨

MVPでは「データ変換」を上位メニューとし、現在のMF仕訳帳取込と将来のMFインポートCSV変換を同じカテゴリへ置く。

## DBテーブル案

実装はMVP安定後とする。現時点では将来拡張余地として、以下のようなテーブル構成を想定する。

### import_jobs

変換または取込の1ジョブを管理する。

- id
- companyId
- importType: mf_journal_import / accounting_software_conversion など
- sourceSystem: mf / jdl / freee / yayoi / miroku / custom など
- sourceFileName
- sourceEncoding
- status: uploaded / parsed / previewed / converted / exported / failed / canceled
- rowCount
- errorCount
- warningCount
- createdBy
- createdAt
- updatedAt
- completedAt
- auditLogId

### import_rows

変換前データ、正規化データ、変換後データ、行単位エラーを保持する。

- id
- companyId
- importJobId
- rowNumber
- rawRowJson
- normalizedRowJson
- convertedRowJson
- status: pending / converted / needs_review / error / ignored
- errorCode
- errorMessage
- warningMessages
- reviewedBy
- reviewedAt
- createdAt
- updatedAt

### mapping_rules

会社別の変換ルールを保存する。

- id
- companyId
- sourceSystem
- ruleType: account / subAccount / department / taxCategory / partner / description など
- sourceValue
- targetValue
- confidence
- isActive
- requiresHumanReview
- createdBy
- updatedBy
- createdAt
- updatedAt

### import_exports

MFインポート用CSVなど、変換後の出力を管理する。

- id
- companyId
- importJobId
- exportType: mf_journal_csv など
- fileName
- rowCount
- generatedBy
- generatedAt
- checksum

### audit_logs

監査ログを横断管理する。既存の監査ログ方針がある場合はそれに統合する。

- id
- companyId
- actorId
- action
- resourceType
- resourceId
- beforeJson
- afterJson
- createdAt

## Issue分割案

### Issue A: 他社会計ソフト変換機能の要件定義

- 背景: MF移行作業を効率化したい
- 目的: 対象ソフト、対象列、変換単位、未判定時の扱いを定義する
- 完了条件: JDL/freee/弥生/ミロク/customの初期スコープが決まっている

### Issue B: 変換メニューとプレビュー画面設計

- 背景: 変換前に人間が確認できるUIが必要
- 目的: データ変換メニュー、アップロード、貼り付け、プレビュー、未変換項目一覧を設計する
- 完了条件: 画面遷移と主要コンポーネントが決まっている

### Issue C: import_jobs / import_rows / mapping_rules DB設計

- 背景: 変換前後の追跡とcompanyId分離が必要
- 目的: 将来の取込・変換共通基盤としてDB設計を行う
- 完了条件: companyId、監査ログ、変換前後データ、レビュー状態が保持できる

### Issue D: テンプレート選択式パーサー基盤

- 背景: 会計ソフトごとに列構成が違う
- 目的: 最初から完全自動判定せず、テンプレート選択式で読み取る
- 完了条件: JDL/freee/弥生/ミロク/customのテンプレート枠がある

### Issue E: MFインポート用CSV出力

- 背景: MFへ直接登録せず、まずCSV出力で安全に移行する
- 目的: 変換結果をMFインポート用CSVとして出力する
- 完了条件: 未判定項目が残る場合は出力前に警告される

### Issue F: 変換ルール管理

- 背景: 会社ごとに科目、補助科目、部門、税区分の変換ルールが異なる
- 目的: companyId単位で変換ルールを保存・更新する
- 完了条件: 他社のルールと混在せず、履歴が追跡できる

## 実装しない範囲

- 明日はJDL個別変換の詳細実装をしない
- 明日はfreee、弥生、ミロクの個別パーサーを実装しない
- 明日はExcel解析の詳細実装をしない
- 明日はMFへの直接登録をしない
- 明日は税区分の自動確定をしない
- 明日は完全自動仕訳をしない
- 明日は達人申告書インポートをしない
- 明日はGoogle Drive証憑自動読取をしない
- 元データは上書きしない
- 変換不能項目を勝手に補完しない

## 将来実装ロードマップ

### Step 1: 要件定義と画面設計

- 対象ソフトと対象ファイル形式を整理する
- データ変換メニューを設計する
- 変換前後データ、未変換項目、エラー表示を設計する

### Step 2: 共通import基盤

- import_jobs / import_rows / mapping_rules を設計する
- companyId分離、監査ログ、行単位エラーを組み込む
- CSV/Excel入力を安全に扱う制限を設ける

### Step 3: テンプレート選択式変換

- 最初はテンプレート選択式にする
- 列名、日付、金額、借方/貸方、税区分を正規化する
- 未判定項目を必ずレビュー対象にする

### Step 4: MFインポート用CSV出力

- 変換結果を画面で確認する
- エラーや未変換項目を修正できるようにする
- MFインポート用CSVとして出力する

### Step 5: 会社別ルール学習との連携

- 人間が修正した変換結果をmapping_rulesへ反映する
- 高頻度の変換パターンを候補として提示する
- 自動確定ではなく候補提示から始める

## 安全性と確認事項

- companyId単位で完全に分離する
- 変換前データと変換後データを保存し、追跡可能にする
- 税区分の変換は最終確認必須とする
- 変換エラー、未変換項目、推定項目を一覧表示する
- 監査ログを必ず残す
- secret、token、API keyは出力しない
