# Notion連携確認メモ

## 現在の確認結果

mainブランチのファイル構成、環境変数サンプル、依存関係を見る限り、Notion API連携やGitHub IssueとNotionタスクの同期処理はまだ実装されていない。

PR #3 にはNotion運用Docs/テンプレート追加があるが、2026-05-13時点のmainには未マージである。

## 切り分け

- Notion Integration が有効か: 外部Notion側の設定のため、このリポジトリからは確認不可
- Notion APIキーが存在するか: Secrets領域のため値は確認・出力しない
- Notion DB ID が正しいか: Secrets/Notion側設定のため値は確認・出力しない
- 対象DBにIntegrationが招待されているか: Notion側設定のため、このリポジトリからは確認不可
- GitHub IssueとNotionタスクの同期機能: main上では未実装
- 実装済みの場合のエラー原因: main上に実装がないため、アプリログで確認できる対象なし

## 必要な次アクション

- Notion Integrationの有効化状態をNotion側で確認する
- 対象DBにIntegrationが招待されているか確認する
- Secretsには値を保存し、Issue/PR/ログには出力しない
- 自動同期を実装する場合は、Notion API + GitHub API または GitHub Actions + Notion API のどちらで行うかをIssue化して設計する

## 注意事項

- secret/token/API keyは出力しない
- Notion DBの機密データをログへ出力しない
- Notion承認ステータスを見てGitHub Issueを自動作成する処理は、承認ゲートと監査ログの設計後に実装する
