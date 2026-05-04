import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/apiResponse';
import { generateDraftMarkdown } from '@/lib/documents/generator';
import { appendNumberGuardWarning } from '@/lib/documents/numberGuard';
import { createDocumentSnapshot } from '@/lib/documents/snapshot';
import type { DocumentInputs } from '@/lib/documents/types';

export async function GET() {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  const documents = await prisma.generatedDocument.findMany({
    where: { companyId: context.companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok({ documents });
}

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  const body = (await request.json().catch(() => null)) as Partial<DocumentInputs> | null;

  if (!body?.kind || !['bank', 'jfc', 'internal'].includes(body.kind)) {
    return fail('INVALID_DOCUMENT_KIND', '出力先種別を選択してください', 400);
  }

  const inputs: DocumentInputs = {
    kind: body.kind,
    companyOverview: body.companyOverview ?? '',
    loanPurpose: body.loanPurpose ?? '',
    requestedAmount: body.requestedAmount ?? '',
    repaymentPeriod: body.repaymentPeriod ?? '',
    useOfFunds: body.useOfFunds ?? '',
    notes: body.notes ?? '',
  };

  const snapshot = await createDocumentSnapshot({ companyId: context.companyId, inputs });
  const generatedMarkdown = await generateDraftMarkdown({ inputs, snapshot });
  const bodyMarkdown = appendNumberGuardWarning(generatedMarkdown, snapshot, [
    inputs.requestedAmount,
    inputs.repaymentPeriod,
  ]);

  const document = await prisma.generatedDocument.create({
    data: {
      companyId: context.companyId,
      kind: inputs.kind,
      status: 'draft',
      inputsJson: inputs as Prisma.InputJsonValue,
      snapshotJson: snapshot as Prisma.InputJsonValue,
      bodyMarkdown,
      model: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_MODEL ?? 'claude' : 'local-template-v1',
      createdById: context.userId,
    },
    select: {
      id: true,
      kind: true,
      status: true,
      bodyMarkdown: true,
      createdAt: true,
    },
  });

  return ok({ document }, 201);
}
