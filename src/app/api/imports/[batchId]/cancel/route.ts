import { canCancelImportBatch } from '@/lib/auth/company-scope';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';
import { checkImportApiRateLimit, rateLimitedResponse } from '@/lib/rate-limit/import-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    batchId: string;
  };
};

export async function POST(request: Request, routeContext: RouteContext) {
  const context = await getUserAndCompanyForApi();
  const rateLimit = await checkImportApiRateLimit({
    action: 'cancel',
    request,
    userId: context?.userId,
  });
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds);

  if (!context) return fail('UNAUTHORIZED', 'Login and company selection are required.', 401);
  if (!canCancelImportBatch(context.role)) {
    return fail('FORBIDDEN', 'You do not have permission to cancel import drafts.', 403);
  }

  const batchId = routeContext.params.batchId;
  if (!isUuid(batchId)) {
    return fail('IMPORT_BATCH_NOT_FOUND', 'Import batch was not found.', 404);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findFirst({
        where: {
          id: batchId,
          companyId: context.companyId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!batch) return { kind: 'not_found' as const };
      if (batch.status === 'CANCELLED') return { kind: 'cancelled' as const };
      if (batch.status !== 'DRAFT') return { kind: 'not_cancellable' as const };

      await tx.importBatch.update({
        where: { id: batch.id },
        data: { status: 'CANCELLED' },
        select: { id: true },
      });

      return { kind: 'cancelled' as const };
    });

    if (result.kind === 'not_found') {
      return fail('IMPORT_BATCH_NOT_FOUND', 'Import batch was not found.', 404);
    }

    if (result.kind === 'not_cancellable') {
      return fail('IMPORT_CANCEL_NOT_ALLOWED', 'Only draft import batches can be cancelled.', 409);
    }

    return ok({ status: 'cancelled' });
  } catch {
    return fail('IMPORT_CANCEL_FAILED', 'Import draft could not be cancelled.', 500);
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
