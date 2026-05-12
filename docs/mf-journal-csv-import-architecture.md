# MF仕訳帳CSV取込アーキテクチャ

## 目的

MoneyForwardの仕訳帳CSVをアップロードし、内部DBの `MfJournal` / `MfJournalDetail` へcompanyIdスコープで取り込みます。

この機能は自動仕訳確定を行いません。CSVは仕訳候補として登録し、分類や確定は人間確認前提で扱います。

## 構成

| 領域 | ファイル | 役割 |
| --- | --- | --- |
| UI | `src/app/(main)/imports/mf-journal-csv/page.tsx` | CSV取込画面 |
| UI | `src/components/journals/MfJournalCsvImportForm.tsx` | アップロード、プレビュー、確認、取込実行 |
| API | `src/app/api/imports/mf-journal-csv/preview/route.ts` | CSV検証とプレビュー |
| API | `src/app/api/imports/mf-journal-csv/commit/route.ts` | 確認後のDB取込 |
| Parser | `src/lib/mf/csv/parser.ts` | 文字コード判定、CSVパース、不正CSV検知 |
| Importer | `src/lib/mf/csv/importer.ts` | companyIdスコープでの科目マッピングとupsert |

## データ保存方針

- `MfJournal.companyId` にログイン中の会社IDを必ず保存する。
- `MfJournalDetail.companyId` にログイン中の会社IDを必ず保存する。
- 既存の `MfAccount` は同じ `companyId` と科目名で照合する。
- CSVにしか存在しない勘定科目は、`csv:account:<hash>` 形式の `mfAccountId` で同一companyId内に作成する。
- 補助科目は `MfJournalDetail.subAccountName` に保存する。
- 部門は `MfJournal.tagNames` と `rawJson` に保持する。
- 摘要は `MfJournal.description` と `MfJournalDetail.description` に保持する。

## 安全性

- preview APIではDBを書き換えない。
- commit APIは `confirmed=true` がない場合は実行しない。
- 取込前にCSVエラーがある場合はDBへ保存しない。
- CSVは最大5MB、最大5000行に制限する。
- 先頭50行だけをプレビュー表示し、画面負荷を抑える。
- APIレスポンスやログにtoken/secret/API keyを出力しない。
- 本番Secretsや環境変数は変更しない。

## 不正CSV検知

次の状態をエラーとして扱います。

- 空ファイル
- UTF-8 / Shift_JIS 以外でデコードできないファイル
- 必須列不足
- ヘッダー列数と明細列数の不一致
- 日付不正
- 借方・貸方勘定科目不足
- 金額不正
- 金額ゼロ行
- 最大行数超過

借方金額と貸方金額の不一致は警告として扱います。警告がある場合も取込は可能ですが、人間確認を前提にします。

## 自動確定禁止

CSV取込は、MoneyForwardから出力された仕訳帳CSVを内部DBへ登録するだけです。

- AIによる自動仕訳確定はしない。
- 税務判断を断定しない。
- CF分類の自動確定はしない。
- 取込後は仕訳確認画面で人間が確認する。

## 大容量CSV耐性

現時点ではNext.js API Routeでアップロードされたファイルを一度メモリに載せます。そのため、5MB/5000行の上限を設けています。

将来、大容量CSVに対応する場合は次を検討します。

- ストリーミングCSVパーサー
- 一時ファイルまたはオブジェクトストレージへの退避
- import job テーブルによる非同期処理
- 行単位のバッチupsert
- 取込履歴とロールバック単位の記録
