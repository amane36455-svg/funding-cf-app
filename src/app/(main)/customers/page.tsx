import type { Prisma } from '@prisma/client';
import { CustomerActions } from '@/components/customers/CustomerActions';
import { requireUserAndCompany } from '@/lib/auth/session';
import { roleLabel, type AppRole } from '@/lib/auth/company-scope';
import { prisma } from '@/lib/db/prisma';

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '稼働中' },
  { value: 'prospect', label: '見込み' },
  { value: 'inactive', label: '停止中' },
  { value: 'archived', label: 'アーカイブ' },
];

const STATUS_LABELS: Record<string, string> = {
  active: '稼働中',
  prospect: '見込み',
  inactive: '停止中',
  archived: 'アーカイブ',
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CustomersPage({ searchParams }: PageProps) {
  const context = await requireUserAndCompany();
  const q = firstParam(searchParams?.q).trim();
  const status = normalizeStatus(firstParam(searchParams?.status));
  const favoriteOnly = firstParam(searchParams?.favorite) === 'true';

  const companyWhere: Prisma.CompanyWhereInput = {};
  if (q) {
    companyWhere.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { industry: { contains: q, mode: 'insensitive' } },
      { companyType: { contains: q, mode: 'insensitive' } },
      { memo: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status !== 'all') {
    companyWhere.status = status;
  }

  const hasCompanyFilter = Object.keys(companyWhere).length > 0;
  const where: Prisma.UserCompanyWhereInput = {
    userId: context.userId,
    ...(favoriteOnly ? { isFavorite: true } : {}),
    ...(hasCompanyFilter ? { company: companyWhere } : {}),
  };

  const [memberships, recentMemberships] = await Promise.all([
    prisma.userCompany.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyType: true,
            status: true,
            fiscalMonth: true,
            industry: true,
            memo: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { lastAccessedAt: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.userCompany.findMany({
      where: {
        userId: context.userId,
        lastAccessedAt: { not: null },
      },
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 5,
    }),
  ]);

  const favoriteCount = memberships.filter((membership) => membership.isFavorite).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">顧客一覧</h1>
          <p className="text-sm text-slate-500">
            会社ごとのデータ分離を前提に、担当顧客を検索・選択します。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm md:min-w-80">
          <Metric label="表示件数" value={`${memberships.length}件`} />
          <Metric label="お気に入り" value={`${favoriteCount}件`} />
          <Metric label="選択中" value={context.companyName} />
        </div>
      </div>

      <form className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-[1fr_180px_160px_auto]">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">検索</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="会社名・業種・メモ"
            className="w-full rounded border px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">状態</span>
          <select name="status" defaultValue={status} className="w-full rounded border px-3 py-2">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 rounded border px-3 py-2 text-sm">
          <input name="favorite" value="true" type="checkbox" defaultChecked={favoriteOnly} />
          お気に入りのみ
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-sm text-white">
            絞り込み
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">最近使った顧客</h2>
        {recentMemberships.length === 0 ? (
          <p className="rounded-md border bg-white p-4 text-sm text-slate-500">まだ利用履歴がありません。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-5">
            {recentMemberships.map((membership) => (
              <div key={membership.companyId} className="rounded-md border bg-white p-3 text-sm">
                <div className="font-medium">{membership.company.name}</div>
                <div className="mt-1 text-xs text-slate-500">{statusLabel(membership.company.status)}</div>
                <div className="mt-2 text-xs text-slate-500">{formatDate(membership.lastAccessedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-4 py-3">顧客</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">役割</th>
              <th className="px-4 py-3">最近の利用</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {memberships.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  条件に一致する顧客がありません。
                </td>
              </tr>
            ) : (
              memberships.map((membership) => (
                <tr key={membership.companyId} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{membership.company.name}</span>
                      {membership.isFavorite ? <span className="text-xs text-amber-600">お気に入り</span> : null}
                      {membership.companyId === context.companyId ? (
                        <span className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">選択中</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      {membership.company.companyType ? <span>{membership.company.companyType}</span> : null}
                      {membership.company.industry ? <span>{membership.company.industry}</span> : null}
                      {membership.company.fiscalMonth ? <span>{formatFiscalMonth(membership.company.fiscalMonth)}</span> : null}
                    </div>
                    {membership.company.memo ? (
                      <p className="mt-2 max-w-xl text-xs text-slate-500">{membership.company.memo}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{statusLabel(membership.company.status)}</td>
                  <td className="px-4 py-3">{roleLabel(membership.role as AppRole)}</td>
                  <td className="px-4 py-3">{formatDate(membership.lastAccessedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <CustomerActions
                      companyId={membership.companyId}
                      isFavorite={membership.isFavorite}
                      isCurrent={membership.companyId === context.companyId}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeStatus(value: string): string {
  return STATUS_OPTIONS.some((option) => option.value === value) ? value : 'all';
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatFiscalMonth(month: number): string {
  return `${month}月決算`;
}

function formatDate(value: Date | string | null): string {
  if (!value) return '未利用';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));
}
