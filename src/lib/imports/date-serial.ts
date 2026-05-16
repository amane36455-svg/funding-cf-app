const EXCEL_UNIX_EPOCH_SERIAL = 25_569;
const MS_PER_DAY = 86_400_000;
const MIN_IMPORT_DATE_SERIAL = 20_000;
const MAX_IMPORT_DATE_SERIAL = 80_000;

export type DateNormalizationResult = {
  value: string;
  normalized: boolean;
};

export function normalizeMappedDateValue(value: string): DateNormalizationResult {
  const trimmed = value.trim();
  if (isValidImportDate(trimmed)) {
    return { value: trimmed, normalized: false };
  }

  const serial = parseExcelDateSerial(trimmed);
  if (serial === null || serial < MIN_IMPORT_DATE_SERIAL || serial > MAX_IMPORT_DATE_SERIAL) {
    return { value: trimmed, normalized: false };
  }

  const isoDate = excelSerialToIsoDate(serial);
  if (!isoDate) {
    return { value: trimmed, normalized: false };
  }

  return { value: isoDate, normalized: true };
}

export function isValidImportDate(value: string): boolean {
  const normalized = value.trim().replaceAll('.', '/').replaceAll('-', '/');
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isInteger(serial) || serial <= 60) return null;
  const timestamp = (serial - EXCEL_UNIX_EPOCH_SERIAL) * MS_PER_DAY;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseExcelDateSerial(value: string): number | null {
  if (!/^-?\d+(?:\.0+)?$/.test(value)) return null;
  const serial = Number(value);
  return Number.isInteger(serial) ? serial : null;
}
