import { requireUserAndCompany } from '@/lib/auth/session';
import { getMonthlyCfSummary } from '@/lib/cf/aggregator';

export default async function DashboardPage() {
  const context = await requireUserAndCompany();
  const now = new Date();
  const summary = await getMonthlyCfSummary({
    companyId: context.companyId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    scope: 'all',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CFダッシュボード</h1>
        <p className="text-sm text-slate-500">
          {now.getFullYear()}年{now.getMonth() + 1}月 / {context.companyName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi title="収入合計" value={summary.incomeTotal} />
        <Kpi title="支出合計" value={summary.expenseTotal} />
        <Kpi title="純収支" value={summary.netTotal} />
        <Kpi title="要確認" value={summary.reviewCount} suffix="件" />
      </div>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">カテゴリ別集計</h2>
        <div className="mt-4 overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">CFグループ</th>
                <th className="px-3 py-2">分類</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-right">件数</th>
              </tr>
            </thead>
            <tbody>
              {summary.groups.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                    まだ同期・分類されたデータがありません。設定画面から手動同期してください。
                  </td>
                </tr>
              ) : (
                summary.groups.map((group) => (
                  <tr key={`${group.cfGroup}-${group.cfCategory}`} className="border-t">
                    <td className="px-3 py-2">{group.cfGroup}</td>
                    <td className="px-3 py-2">{group.cfCategory}</td>
                    <td className="px-3 py-2 text-right">{formatYen(group.amount)}</td>
                    <td className="px-3 py-2 text-right">{group.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ title, value, suffix }: { title: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">
        {suffix ? `${value.toLocaleString('ja-JP')}${suffix}` : formatYen(value)}
      </div>
    </div>
  );
}

function formatYen(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}
