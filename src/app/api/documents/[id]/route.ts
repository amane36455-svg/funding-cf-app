import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const document = await prisma.generatedDocument.findFirst({
    where: {
      id: params.id,
      companyId: context.companyId,
    },
  });

  if (!document) {
    return fail('DOCUMENT_NOT_FOUND', '資料が見つかりません', 404);
  }

  return ok({ document });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const body = (await request.json().catch(() => null)) as {
    bodyMarkdown?: string;
    status?: string;
  } | null;

  if (!body?.bodyMarkdown) {
    return fail('INVALID_DOCUMENT', '本文を入力してください', 400);
  }

  const existing = await prisma.generatedDocument.findFirst({
    where: { id: params.id, companyId: context.companyId },
    select: { id: true },
  });
  if (!existing) {
    return fail('DOCUMENT_NOT_FOUND', '資料が見つかりません', 404);
  }

  const document = await prisma.generatedDocument.update({
    where: { id: params.id },
    data: {
      bodyMarkdown: body.bodyMarkdown,
      status: body.status === 'finalized' ? 'finalized' : 'draft',
    },
  });

  return ok({ document });
}
