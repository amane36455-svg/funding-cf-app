# Notion Development Workflow

このドキュメントは、Notionページ「AI開発管理」をFunding CF AppのAI開発管理DBおよび承認ゲートとして使うための運用ルールです。

Notionは要件整理、承認、実装状況、レビュー、ユーザーテスト結果を一元管理する場所として扱います。GitHub Issues / Pull Requests は実装単位の作業履歴、差分レビュー、CI確認、マージ判断に使います。

## 役割

- ChatGPT: PM・会計要件整理担当。要件、背景、完了条件、人間確認事項を整理する。
- Codex: 実装担当。承認済みIssueからブランチ作成、実装、テスト、修正を行う。
- Claude Code: 設計レビュー・PRレビュー担当。設計整合性、リスク、差戻し条件を確認する。
- ユーザー: Notion上で YES / NO / 保留 / 差戻し を判断し、実機テスト結果を記録する。

## 推奨プロパティ

| プロパティ | 種類 | 用途 |
| --- | --- | --- |
| タスク名 | Title | 実装・確認するタスク名 |
| 状態 | Select | 現在の進行状態 |
| 優先度 | Select | High / Medium / Low など |
| 担当AI | Select | ChatGPT / Codex / Claude Code |
| 承認 | Select | ユーザーの承認判断 |
| GitHub Issue | URL | 対応するGitHub Issue |
| PR URL | URL | 対応するPull Request |
| テスト依頼 | Checkbox または Select | ユーザー実機テストが必要か |
| アイさん確認結果 | Select または Text | YES / NO / 保留 / 差戻し と理由 |
| 完了条件 | Text | 検証可能な完了条件 |
| メモ | Text | 補足、未確認事項、リンク |

## 状態の選択肢

- 未着手
- 要件整理中
- 承認待ち
- 実装中
- レビュー中
- テスト待ち
- 差戻し
- 完了

## 承認の選択肢

- 未確認
- YES
- NO
- 保留
- 差戻し

## 運用フロー

1. ChatGPTが要件整理する。
2. Notionにタスクを登録する。
3. ユーザーがNotion上で YES / NO / 保留 / 差戻し を判断する。
4. YESの場合のみGitHub Issueを作成する。
5. CodexがIssueに紐づくブランチを作成し、実装する。
6. Claude Codeが設計レビュー・PRレビューを行う。
7. Codexがレビュー指摘を修正する。
8. ユーザーが実機テストを行い、Notionに確認結果を記録する。
9. OKならマージする。

## GitHub Issue作成ルール

Notionで承認が YES になったタスクだけをIssue化します。IssueにはNotionタスクURL、目的、背景、必要機能、完了条件、注意点を含めます。

会計・税務ロジックを含む場合は、`accounting_logic_review.yml` を使い、事実、仮定、未確認事項を分けます。税務判断は断定せず、シニア税理士S 鈴木 弘の承認が必要な事項を明記します。

## PR作成ルール

PRにはNotionタスクURLとGitHub Issue URLを必ず記載します。変更内容、影響範囲、テスト結果、セキュリティ確認、multi-company/companyId確認、税務・会計ロジックの注意点、人間確認が必要な事項を明記します。

Claude Codeへのレビュー依頼では、設計意図、セキュリティ、companyId分離、税務・会計ロジックの表現、差戻し条件の確認を依頼します。

## Notion同期の注意点

NotionのGitHub同期DBは、GitHub側のIssue/PR情報をNotionへ表示する用途が中心です。GitHub上のIssueタイトル、状態、担当、PRリンクなどをNotionで参照し、開発管理DBの判断材料にします。

Notion上の承認ステータスを見てGitHub Issueを自動作成する処理は、現時点の前提では手動運用とします。将来対応として設計する場合は、次のどちらかで実装します。

- Notion API + GitHub API
- GitHub Actions + Notion API

自動化を導入する場合も、Notionの承認が YES であること、secret/token/API key をログ出力しないこと、Issue本文に機密情報を含めないことを必須条件にします。

## 差戻し・保留の扱い

承認が NO または差戻しの場合、Codexは実装を開始しません。保留の場合はIssue化せず、未確認事項をNotionのメモに追記します。

レビュー中またはテスト待ちで差戻しになった場合は、PRコメントとNotionメモの両方に理由を残し、修正後に再レビューへ戻します。

## 完了条件

タスクを完了にできるのは、次の条件を満たした場合です。

- GitHub IssueとPRがNotionに紐づいている
- 必要なレビューが完了している
- 実行可能なテストが通っている
- ユーザー実機テストがOKになっている
- 税務・会計ロジックの人間確認事項が解消または明記されている
- secret/token/API key がコード、ログ、Issue、PRに出ていない
