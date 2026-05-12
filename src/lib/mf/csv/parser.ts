import { createHash } from 'node:crypto';

export const MF_JOURNAL_CSV_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 5000,
  previewRows: 50,
} as const;

export type CsvEncoding = 'utf-8' | 'shift_jis';

export type CsvImportIssue = {
  rowNumber?: number;
  code: string;
  message: string;
};

export type CsvJournalSide = {
  accountName: string;
  subAccountName: string | null;
  departmentName: string | null;
  amount: number;
  taxAmount: number | null;
};

export type ParsedCsvJournal = {
  rowNumber: number;
  mfJournalId: string;
  issueDate: string;
  slipNumber: string | null;
  description: string | null;
  departments: string[];
  debit: CsvJournalSide;
  credit: CsvJournalSide;
  rawRecord: Record<string, string>;
};

export type ParsedMfJournalCsv = {
  encoding: CsvEncoding;
  headers: string[];
  totalRows: number;
  journals: ParsedCsvJournal[];
  errors: CsvImportIssue[];
  warnings: CsvImportIssue[];
  accountNames: string[];
  subAccountNames: string[];
  departmentNames: string[];
};

export class CsvImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CsvImportError';
  }
}

export function decodeMfJournalCsv(buffer: ArrayBuffer): { text: string; encoding: CsvEncoding } {
  if (buffer.byteLength === 0) {
    throw new CsvImportError('EMPTY_CSV', 'CSVファイルが空です');
  }
  if (buffer.byteLength > MF_JOURNAL_CSV_LIMITS.maxBytes) {
    throw new CsvImportError(
      'CSV_TOO_LARGE',
      `CSVファイルは${MF_JOURNAL_CSV_LIMITS.maxBytes / 1024 / 1024}MB以下にしてください`,
      413,
    );
  }

  const bytes = new Uint8Array(buffer);
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    try {
      return { text: new TextDecoder('shift_jis', { fatal: true }).decode(bytes), encoding: 'shift_jis' };
    } catch {
      throw new CsvImportError('CSV_ENCODING_UNSUPPORTED', 'UTF-8またはShift_JISのCSVをアップロードしてください');
    }
  }
}

export function parseMfJournalCsvText(text: string, encoding: CsvEncoding = 'utf-8'): ParsedMfJournalCsv {
  const normalizedText = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(normalizedText);
  const table = parseDelimitedText(normalizedText, delimiter).filter((row) => row.some((cell) => cell.trim() !== ''));
  const errors: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];

  if (table.length < 2) {
    errors.push({ code: 'CSV_NO_ROWS', message: 'ヘッダー行と明細行を含むCSVを指定してください' });
    return emptyResult(encoding, table[0] ?? [], errors, warnings);
  }

  const headers = table[0].map((header) => header.trim());
  const columns = detectColumns(headers);
  const missing = requiredColumns(columns);
  if (missing.length > 0) {
    errors.push({
      code: 'CSV_REQUIRED_COLUMNS_MISSING',
      message: `必須列が不足しています: ${missing.join(', ')}`,
    });
    return emptyResult(encoding, headers, errors, warnings, table.length - 1);
  }

  const journals: ParsedCsvJournal[] = [];
  const accountNames = new Set<string>();
  const subAccountNames = new Set<string>();
  const departmentNames = new Set<string>();

  const dataRows = table.slice(1);
  if (dataRows.length > MF_JOURNAL_CSV_LIMITS.maxRows) {
    errors.push({
      code: 'CSV_TOO_MANY_ROWS',
      message: `一度に取り込めるCSVは${MF_JOURNAL_CSV_LIMITS.maxRows}行までです`,
    });
  }

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = index + 2;
    if (index >= MF_JOURNAL_CSV_LIMITS.maxRows) break;

    if (row.length !== headers.length) {
      errors.push({ rowNumber, code: 'CSV_COLUMN_COUNT_MISMATCH', message: 'ヘッダー列数と明細列数が一致しません' });
      continue;
    }

    const record = toRecord(headers, row);
    const issueDate = parseDate(read(row, columns.date));
    const debitAccountName = read(row, columns.debitAccount);
    const creditAccountName = read(row, columns.creditAccount);
    const debitAmount = parseAmount(readOptional(row, columns.debitAmount) || readOptional(row, columns.amount));
    const creditAmount = parseAmount(readOptional(row, columns.creditAmount) || readOptional(row, columns.amount));
    const debitTaxAmount = parseNullableAmount(readOptional(row, columns.debitTax));
    const creditTaxAmount = parseNullableAmount(readOptional(row, columns.creditTax));

    if (!issueDate) {
      errors.push({ rowNumber, code: 'CSV_INVALID_DATE', message: '日付をYYYY/MM/DD形式などで入力してください' });
      continue;
    }
    if (!debitAccountName || !creditAccountName) {
      errors.push({ rowNumber, code: 'CSV_ACCOUNT_MISSING', message: '借方・貸方の勘定科目が必要です' });
      continue;
    }
    if (debitAmount == null || creditAmount == null) {
      errors.push({ rowNumber, code: 'CSV_AMOUNT_INVALID', message: '金額は数値で入力してください' });
      continue;
    }
    if (debitAmount === 0 && creditAmount === 0) {
      errors.push({ rowNumber, code: 'CSV_AMOUNT_ZERO', message: '借方・貸方のどちらかに金額が必要です' });
      continue;
    }
    if (Math.abs(debitAmount - creditAmount) > 0) {
      warnings.push({ rowNumber, code: 'CSV_DEBIT_CREDIT_UNBALANCED', message: '借方金額と貸方金額が一致していません' });
    }

    const debitSubAccount = nullable(readOptional(row, columns.debitSubAccount));
    const creditSubAccount = nullable(readOptional(row, columns.creditSubAccount));
    const sharedDepartment = nullable(readOptional(row, columns.department));
    const debitDepartment = nullable(readOptional(row, columns.debitDepartment)) ?? sharedDepartment;
    const creditDepartment = nullable(readOptional(row, columns.creditDepartment)) ?? sharedDepartment;
    const departments = unique([debitDepartment, creditDepartment].filter(Boolean) as string[]);
    const description = nullable(readOptional(row, columns.description));
    const slipNumber = nullable(readOptional(row, columns.slipNumber));

    accountNames.add(debitAccountName);
    accountNames.add(creditAccountName);
    if (debitSubAccount) subAccountNames.add(debitSubAccount);
    if (creditSubAccount) subAccountNames.add(creditSubAccount);
    for (const department of departments) departmentNames.add(department);

    const journalSeed = [
      issueDate,
      slipNumber ?? '',
      rowNumber,
      debitAccountName,
      creditAccountName,
      debitAmount,
      creditAmount,
      description ?? '',
    ].join('|');

    journals.push({
      rowNumber,
      mfJournalId: `csv:${shortHash(journalSeed)}`,
      issueDate,
      slipNumber,
      description,
      departments,
      debit: {
        accountName: debitAccountName,
        subAccountName: debitSubAccount,
        departmentName: debitDepartment,
        amount: Math.abs(debitAmount),
        taxAmount: debitTaxAmount == null ? null : Math.abs(debitTaxAmount),
      },
      credit: {
        accountName: creditAccountName,
        subAccountName: creditSubAccount,
        departmentName: creditDepartment,
        amount: Math.abs(creditAmount),
        taxAmount: creditTaxAmount == null ? null : Math.abs(creditTaxAmount),
      },
      rawRecord: record,
    });
  }

  return {
    encoding,
    headers,
    totalRows: dataRows.length,
    journals,
    errors,
    warnings,
    accountNames: [...accountNames].sort(),
    subAccountNames: [...subAccountNames].sort(),
    departmentNames: [...departmentNames].sort(),
  };
}

export function parseMfJournalCsvBuffer(buffer: ArrayBuffer): ParsedMfJournalCsv {
  const decoded = decodeMfJournalCsv(buffer);
  return parseMfJournalCsvText(decoded.text, decoded.encoding);
}

export function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

type ColumnMap = {
  date: number;
  slipNumber: number | null;
  description: number | null;
  debitAccount: number;
  debitSubAccount: number | null;
  debitDepartment: number | null;
  debitAmount: number | null;
  debitTax: number | null;
  creditAccount: number;
  creditSubAccount: number | null;
  creditDepartment: number | null;
  creditAmount: number | null;
  creditTax: number | null;
  department: number | null;
  amount: number | null;
};

function emptyResult(
  encoding: CsvEncoding,
  headers: string[],
  errors: CsvImportIssue[],
  warnings: CsvImportIssue[],
  totalRows = 0,
): ParsedMfJournalCsv {
  return {
    encoding,
    headers,
    totalRows,
    journals: [],
    errors,
    warnings,
    accountNames: [],
    subAccountNames: [],
    departmentNames: [],
  };
}

function detectColumns(headers: string[]): ColumnMap {
  return {
    date: findColumn(headers, ['日付', '取引日', '発生日', '仕訳日']),
    slipNumber: findOptionalColumn(headers, ['伝票番号', '仕訳番号', 'No', '番号']),
    description: findOptionalColumn(headers, ['摘要', '備考', 'メモ']),
    debitAccount: findColumn(headers, ['借方勘定科目', '借方科目', '借方 勘定科目']),
    debitSubAccount: findOptionalColumn(headers, ['借方補助科目', '借方補助', '借方 補助科目']),
    debitDepartment: findOptionalColumn(headers, ['借方部門', '借方 部門']),
    debitAmount: findOptionalColumn(headers, ['借方金額', '借方 金額', '借方金額(円)']),
    debitTax: findOptionalColumn(headers, ['借方税額', '借方消費税額', '借方 税額']),
    creditAccount: findColumn(headers, ['貸方勘定科目', '貸方科目', '貸方 勘定科目']),
    creditSubAccount: findOptionalColumn(headers, ['貸方補助科目', '貸方補助', '貸方 補助科目']),
    creditDepartment: findOptionalColumn(headers, ['貸方部門', '貸方 部門']),
    creditAmount: findOptionalColumn(headers, ['貸方金額', '貸方 金額', '貸方金額(円)']),
    creditTax: findOptionalColumn(headers, ['貸方税額', '貸方消費税額', '貸方 税額']),
    department: findOptionalColumn(headers, ['部門', '部門名']),
    amount: findOptionalColumn(headers, ['金額', '取引金額']),
  };
}

function requiredColumns(columns: ColumnMap): string[] {
  const missing: string[] = [];
  if (columns.date < 0) missing.push('日付');
  if (columns.debitAccount < 0) missing.push('借方勘定科目');
  if (columns.creditAccount < 0) missing.push('貸方勘定科目');
  if (columns.debitAmount == null && columns.creditAmount == null && columns.amount == null) missing.push('金額');
  return missing;
}

function findColumn(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const alias of normalizedAliases) {
    const exact = normalizedHeaders.indexOf(alias);
    if (exact >= 0) return exact;
  }
  for (const alias of normalizedAliases) {
    const partial = normalizedHeaders.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

function findOptionalColumn(headers: string[], aliases: string[]): number | null {
  const index = findColumn(headers, aliases);
  return index >= 0 ? index : null;
}

function normalizeHeader(value: string): string {
  return value.replace(/[\s　]/g, '').replace(/[()（）]/g, '').toLowerCase();
}

function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const commaCount = countChar(firstLine, ',');
  const tabCount = countChar(firstLine, '\t');
  return tabCount > commaCount ? '\t' : ',';
}

function countChar(value: string, char: string): number {
  return [...value].filter((item) => item === char).length;
}

function parseDelimitedText(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (char === '\r' && next === '\n') index++;
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function toRecord(headers: string[], row: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((header, index) => [header, read(row, index)]));
}

function read(row: string[], index: number): string {
  return (row[index] ?? '').trim();
}

function readOptional(row: string[], index: number | null): string {
  return index == null ? '' : read(row, index);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

function parseDate(value: string): string | null {
  const normalized = value.trim().replace(/[年月.]/g, '/').replace(/日/g, '').replace(/-/g, '/');
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseNullableAmount(value: string): number | null {
  if (!nullable(value)) return null;
  return parseAmount(value);
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const negative = trimmed.includes('△') || /^-/.test(trimmed);
  const normalized = trimmed.replace(/[￥¥円,\s]/g, '').replace(/△/g, '').replace(/^\+/, '').replace(/^-/, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return negative ? -amount : amount;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
