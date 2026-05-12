# Notion GitHub Automation Plan

- 現状は Notion → GitHub Issue 作成は手動運用
- 将来的に Design A / B による自動化を検討中

このドキュメントは、将来Notion「AI開発管理」の承認 YES をトリガーにGitHub Issueを自動作成するための設計メモです。現時点では手動運用を前提とし、自動化は追加実装として扱います。

## 目的

Notionの開発管理DBでユーザーが承認 YES を選択したタスクについて、GitHub Issueを自動作成し、Notion側へIssue URLを反映します。

NO、保留、差戻し、未確認のタスクはIssue化しません。

## 設計案 A: Notion API + GitHub API

外部の小さなスクリプトまたは社内運用ツールからNotion APIを定期実行し、承認 YES かつGitHub Issue未作成のタスクを取得します。対象タスクごとにGitHub APIでIssueを作成し、作成後にNotionのGitHub Issueプロパティを更新します。

処理の流れ:

1. Notion DBから `承認 = YES` かつ `GitHub Issue` が空のタスクを検索する。
2. タスク名、目的、背景、完了条件、メモを取得する。
3. GitHub Issueのタイトル、本文、ラベルを生成する。
4. GitHub APIでIssueを作成する。
5. 作成されたIssue URLをNotionの `GitHub Issue` に保存する。
6. 状態を `実装中` または `承認待ち` から次の運用状態へ更新する。

## 設計案 B: GitHub Actions + Notion API

GitHub Actionsをスケジュール実行または手動実行し、Notion APIで承認済みタスクを取得してIssueを作成します。GitHub Issue作成にはActionsの権限またはGitHub Appのトークンを使います。

処理の流れ:

1. `workflow_dispatch` または `schedule` でActionを起動する。
2. Notion APIで対象タスクを検索する。
3. GitHub Issueを作成する。
4. NotionへIssue URLを書き戻す。
5. 実行結果には件数や対象タスクIDのみを出し、secret/token/API key は出力しない。

## 必要な環境変数

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `GITHUB_TOKEN`

これらはGitHub Actions Secretsまたは運用環境のSecretsに保存します。絶対にコード、Issue、PR、ログ、スクリーンショットへ出力しません。

`token`、`secret`、`API key` は絶対にコミットしません。`.env.local` も作成・コミットしません。

## Secrets運用ルール

- GitHub Actionsで使う値はRepository SecretsまたはEnvironment Secretsに保存する。
- ローカル検証時も実値をチャット、Issue、PR、ドキュメントに貼らない。
- エラー時はステータスコード、対象タスクID、処理件数のみをログに出す。
- APIレスポンス全体をログ出力しない。
- トークンを含む可能性があるヘッダー、環境変数、リクエスト本文をログに出さない。

## Notion APIの最小権限

Notion Integrationは「AI開発管理」DBだけに接続します。ワークスペース全体へのアクセスは付与しません。

必要権限:

- 対象DBの読み取り
- 対象DBページの更新

必要な場合のみ:

- タスクページ本文を読み取る権限

不要な権限:

- 関係のないページへのアクセス
- ファイルアップロード
- ユーザー管理
- ワークスペース全体の管理権限

## GitHub Issue作成時の設計

### タイトル

基本形:

```text
{Notionのタスク名}
```

必要に応じて種別プレフィックスを付けます。

```text
[Feature] 消費税比較機能の実装
[Bug] MF同期失敗時のエラー表示修正
[Accounting Review] 消費税比較ロジック確認
[User Test] 月次CF画面の実機確認
```

### 本文

Issue本文には次を含めます。

- NotionタスクURL
- 目的
- 背景
- 必要機能
- 完了条件
- 注意点
- 人間確認が必要な事項

税務・会計ロジックを含む場合は、次を追加します。

- 事実
- 仮定
- 未確認事項
- 税務判断を断定しない注意書き
- シニア税理士S 鈴木 弘の承認が必要な事項

### ラベル

Notionの種別や担当AIからラベルを付与します。

- `feature`
- `bug`
- `accounting`
- `review`
- `user-test`
- `security`
- `multi-company`

会計・税務ロジックを含むIssueには `accounting` と `review` を付けます。companyId分離に関係するIssueには `multi-company` を付けます。

## 重複作成防止

Notionの `GitHub Issue` が空でないタスクはスキップします。GitHub Issue作成後にNotion更新が失敗した場合に備えて、NotionページIDをIssue本文に含めるか、GitHub側に一意のHTMLコメントを埋め込みます。

例:

```text
<!-- notion-page-id: xxxxx -->
```

このIDにsecretは含めません。

## 失敗時の扱い

Issue作成に失敗した場合は、対象タスクをNotion上で差戻しにせず、メモに「Issue自動作成失敗」と理由の要約を残します。原因が権限不足、レート制限、入力不足のどれかを判定し、人間が再実行できる状態にします。

税務・会計ロジックで必要情報が不足している場合はIssue化せず、Notionの状態を `要件整理中` または `承認待ち` に戻します。
