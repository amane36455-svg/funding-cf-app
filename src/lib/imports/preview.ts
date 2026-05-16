import { IMPORT_LIMITS, formatBytes } from './limits';
import { parseCsvBuffer } from './csv';
import { UnsafeXlsxError, parseXlsxBuffer } from './xlsx';
import {
  IMPORT_SYSTEM_FIELDS,
  type ImportEncoding,
  type ImportFileKind,
  type ImportIssue,
  type ImportPreviewResult,
} from './types';

export type ImportPreviewInput = {
  fileName: string;
  contentType: string;
  size: number;
  buffer: ArrayBuffer;
};

export type ImportPreviewOutcome =
  | { ok: true; data: ImportPreviewResult }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
      issues: ImportIssue[];
    };

export function buildImportPreview(input: ImportPreviewInput): ImportPreviewOutcome {
  if (input.size <= 0) {
    return failure('IMPORT_FILE_EMPTY', 'ファイルが空です。CSVまたはxlsxファイルを選択してください。');
  }

  if (input.size > IMPORT_LIMITS.maxFileSizeBytes) {
    return failure(
      'IMPORT_FILE_TOO_LARGE',
      `ファイルサイズが上限を超えています。${formatBytes(IMPORT_LIMITS.maxFileSizeBytes)}以内にしてください。`,
      413,
    );
  }

  const kind = detectFileKind(input.fileName, input.contentType);
  if (!kind) {
    return failure('IMPORT_UNSUPPORTED_FILE', 'CSVまたはxlsxファイルを選択してください。');
  }

  try {
    if (kind === 'csv') {
      const parsed = parseCsvBuffer(input.buffer);
      return normalizeRows({
        fileName: input.fileName,
        contentType: input.contentType,
        size: input.size,
        kind,
        encoding: parsed.encoding,
        rows: parsed.rows,
        issues: parsed.issues,
      });
    }

    const parsed = parseXlsxBuffer(input.buffer);
    return normalizeRows({
      fileName: input.fileName,
      contentType: input.contentType,
      size: input.size,
      kind,
      encoding: 'xlsx' as ImportEncoding,
      sheetName: parsed.sheetName,
      rows: parsed.rows,
      issues: parsed.issues,
    });
  } catch (error) {
    if (error instanceof UnsafeXlsxError) {
      return failure('IMPORT_XLSX_UNSAFE', 'XLSX file is too large or unsafe.');
    }

    return failure(
      'IMPORT_PARSE_FAILED',
      'ファイルを解析できませんでした。形式、文字コード、先頭シートの内容を確認してください。',
    );
  }
}

function normalizeRows(args: {
  fileName: string;
  contentType: string;
  size: number;
  kind: ImportFileKind;
  encoding: ImportEncoding;
  sheetName?: string;
  rows: string[][];
  issues: ImportIssue[];
}): ImportPreviewOutcome {
  const [headerRow, ...dataRows] = args.rows;
  const issues = [...args.issues];

  if (!headerRow || headerRow.every((cell) => cell.trim() === '')) {
    return failure('IMPORT_HEADER_MISSING', 'ヘッダー行を検出できませんでした。');
  }

  const totalColumns = Math.max(...args.rows.map((row) => row.length), 0);
  if (totalColumns > IMPORT_LIMITS.maxColumns) {
    return failure(
      'IMPORT_TOO_MANY_COLUMNS',
      `列数が上限を超えています。${IMPORT_LIMITS.maxColumns}列以内にしてください。`,
    );
  }

  if (dataRows.length > IMPORT_LIMITS.maxRows) {
    return failure(
      'IMPORT_TOO_MANY_ROWS',
      `行数が上限を超えています。${IMPORT_LIMITS.maxRows}行以内にしてください。`,
      413,
    );
  }

  const headers = normalizeWidth(headerRow, totalColumns).map((header, index) =>
    header.trim() || `未命名列${index + 1}`,
  );
  const previewRows = dataRows.slice(0, IMPORT_LIMITS.previewRows).map((row, index) => ({
    rowNumber: index + 2,
    cells: normalizeWidth(row, headers.length),
  }));

  return {
    ok: true,
    data: {
      file: {
        name: args.fileName,
        size: args.size,
        type: args.contentType,
        kind: args.kind,
        encoding: args.encoding,
        sheetName: args.sheetName,
      },
      limits: IMPORT_LIMITS,
      headers,
      rows: previewRows,
      totalRows: dataRows.length,
      totalColumns: headers.length,
      truncated: {
        rows: dataRows.length > IMPORT_LIMITS.maxRows,
        columns: totalColumns > IMPORT_LIMITS.maxColumns,
        previewRows: dataRows.length > IMPORT_LIMITS.previewRows,
      },
      issues,
      systemFields: IMPORT_SYSTEM_FIELDS,
    },
  };
}

function detectFileKind(fileName: string, contentType: string): ImportFileKind | null {
  const lowerName = fileName.toLowerCase();
  const lowerType = contentType.toLowerCase();

  if (lowerName.endsWith('.csv') || lowerType.includes('csv')) return 'csv';
  if (
    lowerName.endsWith('.xlsx') ||
    lowerType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'excel';
  }

  return null;
}

function normalizeWidth(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => row[index] ?? '');
}

function failure(code: string, message: string, status = 400): ImportPreviewOutcome {
  return {
    ok: false,
    code,
    message,
    status,
    issues: [{ code, message, severity: 'error' }],
  };
}
