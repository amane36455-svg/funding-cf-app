# Testing Plan

## Unit tests

対象:

- CF分類
- MFレスポンス正規化
- token暗号化
- 文書生成フォールバック
- 生成文の金額チェック
- 同期範囲計算
- MF client refresh retry
- accounts sync upsert
- journals sync upsert
- PDF template escaping
- production env validation

コマンド:

```bash
pnpm test
```

## Integration tests

次に追加する候補:

- signup -> company作成
- MF OAuth callback -> token保存
- accounts sync -> UPSERT
- journals sync -> UPSERT
- manual sync -> history success
- manual sync failure -> history failed

## E2E smoke

自動スモーク:

```bash
pnpm smoke:local
pnpm smoke https://your-vercel-app.vercel.app
```

確認内容:

- `/api/health`
- `/login`
- `/signup`
- `/api/sync/daily` が未認可リクエストを拒否する

手動で1本だけ通す:

1. `/signup`
2. `/onboarding`
3. `/settings`
4. MF連携
5. 手動同期
6. `/dashboard`
7. `/documents/new`
8. PDF出力

## Fixtures

- `tests/fixtures/mf.ts`

MF APIの実レスポンスが確認でき次第、このfixtureを実データ形状に寄せる。
