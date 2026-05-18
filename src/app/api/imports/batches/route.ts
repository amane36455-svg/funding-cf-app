import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const STATUS_FILTERS = new Set(['DRAFT', 'NEEDS_REVIEW', 'CANCELLED', 'all']);

type ImportBatchStatusFilter = 'DRAFT' | 'NEEDS_REVIEW' | 'CANCELLED' | 'all';

export async function GET(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'Login and company selection are required.', 401);

  const params = new URL(request.url).searchParams;
  const pageResult = parsePositiveInt(params.get('page'), DEFAULT_PAGE, 'page');
  if (!pageResult.ok) return fail(pageResult.code, pageResult.message, 400);

  const pageSizeResult = parsePositiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE, 'pageSize');
  if (!pageSizeResult.ok) return fail(pageSizeResult.code, pageSizeResult.message, 400);

  const page = pageResult.value;
  const pageSize = Math.min(pageSizeResult.value, MAX_PAGE_SIZE);
  const status = parseStatusFilter(params.get('status'));
  if (!status.ok) return fail(status.code, status.message, 400);

  const where = {
    companyId: context.companyId,
    ...(status.value === 'all' ? {} : { status: status.value }),
  };

  const [totalItems, batches] = await prisma.$transaction([
    prisma.importBatch.count({ where }),
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        readyRowCount: true,
        needsReviewRowCount: true,
        skippedRowCount: true,
        validationSummary: true,
        createdAt: true,
      },
    }),
  ]);

  return ok({
    batches: batches.map((batch) => ({
      id: batch.id,
      createdAt: batch.createdAt.toISOString(),
      status: batch.status,
      totalRows: readTotalRows(batch.validationSummary, batch.readyRowCount + batch.needsReviewRowCount),
      readyRows: batch.readyRowCount,
      needsReviewRows: batch.needsReviewRowCount,
      skippedRows: batch.skippedRowCount,
      canConfirm: batch.status === 'DRAFT',
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  });
}

type ParseIntResult =
  | { ok: true; value: number }
  | { ok: false; code: string; message: string };

function parsePositiveInt(value: string | null, defaultValue: number, name: string): ParseIntResult {
  if (value === null || value === '') return { ok: true, value: defaultValue };
  if (!/^\d+$/.test(value)) {
    return {
      ok: false,
      code: 'IMPORT_BATCHES_INVALID_QUERY',
      message: `${name} must be a positive integer.`,
    };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return {
      ok: false,
      code: 'IMPORT_BATCHES_INVALID_QUERY',
      message: `${name} must be a positive integer.`,
    };
  }

  return { ok: true, value: parsed };
}

type StatusFilterResult =
  | { ok: true; value: ImportBatchStatusFilter }
  | { ok: false; code: string; message: string };

function parseStatusFilter(value: string | null): StatusFilterResult {
  const normalized = value ?? 'all';
  if (!STATUS_FILTERS.has(normalized)) {
    return {
      ok: false,
      code: 'IMPORT_BATCHES_INVALID_STATUS',
      message: 'status must be DRAFT, NEEDS_REVIEW, CANCELLED, or all.',
    };
  }

  return { ok: true, value: normalized as ImportBatchStatusFilter };
}

function readTotalRows(value: unknown, fallback: number): number {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'totalRows' in value) {
    const totalRows = (value as { totalRows?: unknown }).totalRows;
    if (typeof totalRows === 'number' && Number.isSafeInteger(totalRows) && totalRows >= 0) return totalRows;
  }

  return fallback;
}
