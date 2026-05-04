import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { findCategoryOption } from '@/lib/cf/categories';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const body = (await request.json().catch(() => null)) as {
    cfCategory?: string;
    needsReview?: boolean;
  } | null;

  if (!body?.cfCategory) {
    return fail('INVALID_CLASSIFICATION', '分類を選択してください', 400);
  }

  const option = findCategoryOption(body.cfCategory);
  if (!option) {
    return fail('INVALID_CLASSIFICATION', '未対応の分類です', 400);
  }

  const detail = await prisma.mfJournalDetail.findFirst({
    where: {
      id: params.id,
      companyId: context.companyId,
    },
    select: { id: true },
  });

  if (!detail) return fail('DETAIL_NOT_FOUND', '明細が見つかりません', 404);

  const result = await prisma.cfClassificationResult.upsert({
    where: { journalDetailId: detail.id },
    create: {
      companyId: context.companyId,
      journalDetailId: detail.id,
      cfCategory: option.cfCategory,
      cfGroup: option.cfGroup,
      isPersonal: option.isPersonal,
      needsReview: body.needsReview ?? false,
      appliedRuleId: null,
      reason: 'manual override',
    },
    update: {
      cfCategory: option.cfCategory,
      cfGroup: option.cfGroup,
      isPersonal: option.isPersonal,
      needsReview: body.needsReview ?? false,
      appliedRuleId: null,
      reason: 'manual override',
    },
  });

  return ok({ result });
}
