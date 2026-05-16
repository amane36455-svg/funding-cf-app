# Notion GitHub Actions Automation

## 目的

Notionの「AI開発管理」データベースを司令塔として使い、条件を満たすAIタスクだけをGitHub Issue化し、作成結果をNotionへ戻す。

この自動化はGitHub Actionsの手動実行を前提にする。本番反映、DB migration、secret変更は行わない。

## 実行方法

GitHub Actionsの `Notion to GitHub Issue` workflowを `workflow_dispatch` で手動実行する。

将来、定期実行へ変更する場合は `.github/workflows/notion-to-github-issue.yml` の `schedule` コメントを外す。定期実行の有効化はアイさん確認後に行う。

## 必要なGitHub Secrets

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID` または `NOTION_DATA_SOURCE_ID`
- `GH_TOKEN` は任意。通常はActions標準の `GITHUB_TOKEN` を使う。

secret、APIキー、DB URL、トークンの値はコード、Issue、PR、ログへ出力しない。

## Issue作成対象

以下をすべて満たすNotionタスクだけGitHub Issueを作成する。

- `自動化対象` が true
- `外部連携ステータス` が `Issue作成待ち`
- `GitHub Repo` が `funding-cf-app`
- `Issue作成済み` が false
- `GitHub Issue URL` が空
- `DB影響` が false
- `secret影響` が false
- `本番影響` が false
- `アイさん確認` が false
- `人間確認種別` に停止対象が含まれない

二重作成防止として、Notion側の `Issue作成済み` と `GitHub Issue URL` を確認し、さらにIssue本文へNotion page idのHTMLコメントを埋め込んで既存Issueを検索する。

## アイさん確認で停止する条件

以下に該当する場合はGitHub Issueを作らず、Notion側を承認待ち扱いにする。

- `DB影響` が true
- `secret影響` が true
- `本番影響` が true
- `アイさん確認` が true
- `人間確認種別` に `本番反映`, `DB変更`, `secret`, `課金`, `外注`, `投稿`, `仕様判断` のいずれかが含まれる
- 指示本文などにsecretらしい文字列が含まれる
- 安全判定または書き戻しに必要なNotionプロパティが不足している
- 書き戻し対象のNotionプロパティ型が自動更新に対応していない

停止時の `自動化ログ` は次の文言にする。

```text
アイさん確認が必要なため、GitHub Issue自動作成を停止しました。
```

## Notion書き戻し

Issue作成後、Notionには次を書き戻す。

- `GitHub Issue URL`: 作成または検出したIssue URL
- `Issue作成済み`: true
- `外部連携ステータス`: `Issue作成済み`
- `状態`: `作業中`
- `自動化対象`: false
- `自動化ログ`: `GitHub ActionsでIssue作成完了`

停止時は可能な範囲で次を書き戻す。

- `外部連携ステータス`: `承認待ち`
- `状態`: `承認待ち`
- `アイさん確認`: true
- `自動化対象`: false
- `自動化ログ`: 停止文言

Notionのstatus/selectプロパティでは、上記の選択肢がNotion側に存在している必要がある。

## 運用上の注意

- workflowログにはNotion本文やsecret値を出さない。
- Notion APIレスポンス全体をログに出さない。
- GitHub Step Summaryには `scanned`, `created`, `gated`, `linkedExisting`, `skipped`, `failed` の件数だけを出す。
- DB migrationは実行しない。
- 本番反映はこのworkflowの責務外。
- Notion Integrationは対象DBに招待しておく。
- `NOTION_DATABASE_ID` を使う場合、現在のNotion APIではdatabase配下のdata sourceを解決してからqueryする。直接data sourceを指定できる場合は `NOTION_DATA_SOURCE_ID` を優先する。
