import { canSaveImportBatch } from '@/lib/auth/company-scope';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';
import { IMPORT_LIMITS, formatBytes } from '@/lib/imports/limits';
import { buildMappedPreviewRows, type ImportMappedRow } from '@/lib/imports/mapping-preview';
import { buildImportPreview } from '@/lib/imports/preview';
import { IMPORT_SYSTEM_FIELDS, type ImportFieldKey, type ImportMapping, type ImportPreviewResult } from '@/lib/imports/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MAPPING_KEYS = new Set<ImportFieldKey>(IMPORT_SYSTEM_FIELDS.map((field) => field.key));

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'Login and company selection are required.', 401);
  if (!canSaveImportBatch(context.role)) {
    return fail('FORBIDDEN', 'You do not have permission to save import drafts.', 403);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!isUploadedFile(file)) {
    return fail('IMPORT_FILE_REQUIRED', 'CSV or xlsx file is required.', 400);
  }

  if (file.size > IMPORT_LIMITS.maxFileSizeBytes) {
    return fail(
      'IMPORT_FILE_TOO_LARGE',
      `File size exceeds the limit. Use a file up to ${formatBytes(IMPORT_LIMITS.maxFileSizeBytes)}.`,
      413,
    );
  }

  const mappingResult = parseMapping(formData?.get('mapping'));
  if (!mappingResult.ok) {
    return fail(mappingResult.code, mappingResult.message, mappingResult.status);
  }

  const previewOutcome = buildImportPreview(
    {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      buffer: await file.arrayBuffer(),
    },
    { rowLimit: IMPORT_LIMITS.maxRows },
  );

  if (!previewOutcome.ok) {
    return fail(previewOutcome.code, previewOutcome.message, previewOutcome.status, {
      issues: previewOutcome.issues,
    });
  }

  const draft = buildSaveDraft(previewOutcome.data, mappingResult.mapping);
  if (draft.readyRows.length === 0) {
    return fail('IMPORT_SAVE_NO_READY_ROWS', 'No ready rows are available to save.', 422, {
      summary: draft.summary,
    });
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const importedFile = await tx.importedFile.create({
        data: {
          companyId: context.companyId,
          uploadedByUserId: context.userId,
          originalFilename: file.name,
          fileKind: previewOutcome.data.file.kind === 'csv' ? 'CSV' : 'EXCEL',
          encoding: previewOutcome.data.file.encoding,
          sheetName: previewOutcome.data.file.sheetName,
          fileSizeBytes: file.size,
          storageRef: null,
          previewSnapshot: draft.previewSnapshot,
        },
        select: { id: true },
      });

      const importBatch = await tx.importBatch.create({
        data: {
          companyId: context.companyId,
          importedFileId: importedFile.id,
          createdByUserId: context.userId,
          status: 'DRAFT',
          readyRowCount: draft.summary.readyRows,
          needsReviewRowCount: draft.summary.needsReviewRows,
          skippedRowCount: draft.summary.skippedRows,
          mappingSnapshot: draft.mappingSnapshot,
          validationSummary: {
            totalRows: draft.summary.totalRows,
            savedRows: draft.summary.readyRows,
            skippedRows: draft.summary.skippedRows,
            needsReviewRows: draft.summary.needsReviewRows,
          },
        },
        select: { id: true },
      });

      for (const row of draft.readyRows) {
        const journalEntry = await tx.journalEntry.create({
          data: {
            companyId: context.companyId,
            importBatchId: importBatch.id,
            sourceRowNumber: row.rowNumber,
            tradeDate: parseImportDate(row.values.tradeDate ?? ''),
            description: emptyToNull(row.values.description),
            status: 'DRAFT',
            rawRowSummary: buildRawRowSummary(row),
          },
          select: { id: true },
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              companyId: context.companyId,
              journalEntryId: journalEntry.id,
              lineNo: 1,
              side: 'DEBIT',
              accountName: row.values.debitAccount ?? '',
              subAccountName: emptyToNull(row.values.debitSubAccount),
              departmentName: emptyToNull(row.values.department),
              taxCategory: emptyToNull(row.values.taxCategory),
              amount: row.amount,
            },
            {
              companyId: context.companyId,
              journalEntryId: journalEntry.id,
              lineNo: 2,
              side: 'CREDIT',
              accountName: row.values.creditAccount ?? '',
              subAccountName: emptyToNull(row.values.creditSubAccount),
              departmentName: emptyToNull(row.values.department),
              taxCategory: emptyToNull(row.values.taxCategory),
              amount: row.amount,
            },
          ],
        });
      }

      return {
        importedFileId: importedFile.id,
        importBatchId: importBatch.id,
      };
    });

    return ok({
      importedFileId: saved.importedFileId,
      importBatchId: saved.importBatchId,
      status: 'draft',
      totalRows: draft.summary.totalRows,
      savedRows: draft.summary.readyRows,
      skippedRows: draft.summary.skippedRows,
      needsReviewRows: draft.summary.needsReviewRows,
    });
  } catch {
    return fail('IMPORT_SAVE_FAILED', 'Import draft could not be saved.', 500);
  }
}

type MappingParseResult =
  | { ok: true; mapping: ImportMapping }
  | { ok: false; code: string; message: string; status: number };

function parseMapping(value: FormDataEntryValue | null | undefined): MappingParseResult {
  if (typeof value !== 'string') {
    return { ok: false, code: 'IMPORT_MAPPING_REQUIRED', message: 'Mapping JSON is required.', status: 400 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, code: 'IMPORT_MAPPING_INVALID', message: 'Mapping JSON is invalid.', status: 400 };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'IMPORT_MAPPING_INVALID', message: 'Mapping JSON is invalid.', status: 400 };
  }

  const mapping: ImportMapping = {};
  for (const [key, rawIndex] of Object.entries(parsed)) {
    if (!ALLOWED_MAPPING_KEYS.has(key as ImportFieldKey)) continue;
    if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= IMPORT_LIMITS.maxColumns) {
      return { ok: false, code: 'IMPORT_MAPPING_INVALID', message: 'Mapping JSON is invalid.', status: 400 };
    }
    mapping[key as ImportFieldKey] = rawIndex;
  }

  return { ok: true, mapping };
}

type SavableMappedRow = ImportMappedRow & {
  amount: string;
};

function buildSaveDraft(preview: ImportPreviewResult, mapping: ImportMapping) {
  const mappedRows = buildMappedPreviewRows(preview.rows, preview.systemFields, mapping);
  const readyRows: SavableMappedRow[] = [];
  let needsReviewRows = 0;

  for (const row of mappedRows) {
    const amount = normalizePositiveAmount(row.values.amount ?? '');
    if (row.status !== 'ready' || !amount) {
      needsReviewRows += 1;
      continue;
    }

    readyRows.push({ ...row, amount });
  }

  const skippedRows = needsReviewRows;
  const summary = {
    totalRows: preview.totalRows,
    readyRows: readyRows.length,
    skippedRows,
    needsReviewRows,
  };

  return {
    readyRows,
    mappingSnapshot: sanitizeMappingSnapshot(mapping),
    previewSnapshot: {
      headers: preview.headers,
      first5Rows: preview.rows.slice(0, 5).map((row) => ({
        rowNumber: row.rowNumber,
        cells: row.cells,
      })),
      ...summary,
    },
    summary,
  };
}

function sanitizeMappingSnapshot(mapping: ImportMapping) {
  return Object.fromEntries(
    Object.entries(mapping).filter(([key, value]) => ALLOWED_MAPPING_KEYS.has(key as ImportFieldKey) && value !== undefined),
  );
}

function normalizePositiveAmount(value: string): string | null {
  const normalized = value.replace(/[,\s￥¥]/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [integerPart, decimalPart = ''] = normalized.split('.');
  if (integerPart.length > 16) return null;
  if (!/[1-9]/.test(integerPart + decimalPart)) return null;

  return decimalPart ? `${integerPart}.${decimalPart.padEnd(2, '0')}` : integerPart;
}

function parseImportDate(value: string): Date {
  const normalized = value.trim().replaceAll('.', '-').replaceAll('/', '-');
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildRawRowSummary(row: ImportMappedRow) {
  return {
    rowNumber: row.rowNumber,
    rawValues: row.rawValues,
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function isUploadedFile(value: FormDataEntryValue | null | undefined): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    'type' in value &&
    typeof value.arrayBuffer === 'function'
  );
}
