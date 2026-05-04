import { requireUserAndCompany } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ManualSyncButton } from '@/components/common/ManualSyncButton';

export default async function SettingsPage() {
  const context = await requireUserAndCompany();
  const connection = await prisma.mfConnection.findUnique({
    where: { companyId: context.companyId },
    select: {
      mfOfficeId: true,
      lastSyncedAt: true,
      tokenExpiresAt: true,
    },
  });
  const latestHistory = await prisma.mfSyncHistory.findFirst({
    where: { companyId: context.companyId },
    orderBy: { startedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-slate-500">MF連携と同期状態を確認します。</p>
      </div>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">マネーフォワード連携</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Info label="連携状態" value={connection ? '連携済み' : '未連携'} />
          <Info label="office_id" value={connection?.mfOfficeId ?? '未選択'} />
          <Info label="トークン期限" value={connection?.tokenExpiresAt?.toLocaleString('ja-JP') ?? '-'} />
          <Info label="最終同期" value={connection?.lastSyncedAt?.toLocaleString('ja-JP') ?? '-'} />
        </dl>
        <div className="mt-4 flex gap-2">
          <a href="/api/auth/mf/start" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            MFと連携する
          </a>
          {connection ? (
            <a href="/settings/mf/select-office" className="rounded border px-4 py-2 text-sm">
              officeを選択
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">手動同期</h2>
        <p className="mt-2 text-sm text-slate-600">
          まずは当月+前月の仕訳を取得し、CF分類まで実行します。
        </p>
        <div className="mt-4">
          <ManualSyncButton />
        </div>
      </section>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">直近の同期履歴</h2>
        {latestHistory ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Info label="状態" value={latestHistory.status} />
            <Info label="種類" value={latestHistory.kind} />
            <Info label="開始" value={latestHistory.startedAt.toLocaleString('ja-JP')} />
            <Info label="終了" value={latestHistory.finishedAt?.toLocaleString('ja-JP') ?? '-'} />
            <Info label="仕訳" value={`${latestHistory.journalsUpserted}件`} />
            <Info label="明細" value={`${latestHistory.detailsUpserted}件`} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">同期履歴はまだありません。</p>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
