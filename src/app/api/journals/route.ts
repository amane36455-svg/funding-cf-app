import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function GET(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const url = new URL(request.url);
  const needsReview = url.searchParams.get('needsReview');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);

  const details = await prisma.mfJournalDetail.findMany({
    where: {
      companyId: context.companyId,
      ...(needsReview === 'true'
        ? {
            cfResult: {
              needsReview: true,
            },
          }
        : {}),
    },
    include: {
      account: { select: { name: true } },
      journal: { select: { issueDate: true, description: true, slipNumber: true } },
      cfResult: true,
    },
    orderBy: [{ journal: { issueDate: 'desc' } }, { updatedAt: 'desc' }],
    take: limit,
  });

  return ok({
    details: details.map((detail) => ({
      id: detail.id,
      issueDate: detail.journal.issueDate,
      slipNumber: detail.journal.slipNumber,
      accountName: detail.account?.name ?? '',
      side: detail.side,
      amount: Number(detail.amount),
      description: detail.description ?? detail.journal.description ?? '',
      cfCategory: detail.cfResult?.cfCategory ?? '未分類',
      cfGroup: detail.cfResult?.cfGroup ?? '要確認',
      needsReview: detail.cfResult?.needsReview ?? true,
      isPersonal: detail.cfResult?.isPersonal ?? false,
    })),
  });
}
