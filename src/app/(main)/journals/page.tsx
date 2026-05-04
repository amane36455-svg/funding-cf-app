import { requireUserAndCompany } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { JournalReviewTable } from '@/components/journals/JournalReviewTable';

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: { needsReview?: string };
}) {
  const context = await requireUserAndCompany();
  const onlyReview = searchParams.needsReview !== 'false';

  const details = await prisma.mfJournalDetail.findMany({
    where: {
      companyId: context.companyId,
      ...(onlyReview ? { cfResult: { needsReview: true } } : {}),
    },
    include: {
      account: { select: { name: true } },
      journal: { select: { issueDate: true, description: true } },
      cfResult: true,
    },
    orderBy: [{ journal: { issueDate: 'desc' } }, { updatedAt: 'desc' }],
    take: 200,
  });

  const rows = details.map((detail) => ({
    id: detail.id,
    issueDate: detail.journal.issueDate,
    accountName: detail.account?.name ?? '',
    side: detail.side,
    amount: Number(detail.amount),
    description: detail.description ?? detail.journal.description ?? '',
    cfCategory: detail.cfResult?.cfCategory ?? '未分類',
    cfGroup: detail.cfResult?.cfGroup ?? '要確認',
    needsReview: detail.cfResult?.needsReview ?? true,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仕訳確認</h1>
        <p className="text-sm text-slate-500">
          要確認の明細を確認し、分類を手動で上書きできます。
        </p>
      </div>
      <JournalReviewTable rows={rows} />
    </div>
  );
}
