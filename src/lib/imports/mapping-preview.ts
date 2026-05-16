import { isValidImportDate, normalizeMappedDateValue } from './date-serial';
import type {
  ImportFieldKey,
  ImportIssue,
  ImportMapping,
  ImportPreviewRow,
  ImportSystemField,
} from './types';

export type ImportMappedRow = {
  rowNumber: number;
  status: 'ready' | 'needs_review';
  rawValues: Partial<Record<ImportFieldKey, string>>;
  values: Partial<Record<ImportFieldKey, string>>;
  issues: ImportIssue[];
};

export function buildMappedPreviewRows(
  rows: ImportPreviewRow[],
  fields: ImportSystemField[],
  mapping: ImportMapping,
): ImportMappedRow[] {
  const requiredFields = fields.filter((field) => field.required);
  const missingMappings = new Set(
    requiredFields.filter((field) => mapping[field.key] === undefined).map((field) => field.key),
  );

  return rows.map((row) => {
    const rawValues: Partial<Record<ImportFieldKey, string>> = {};
    const values: Partial<Record<ImportFieldKey, string>> = {};
    const issues: ImportIssue[] = [];

    for (const field of fields) {
      const columnIndex = mapping[field.key];
      if (columnIndex === undefined) continue;

      const rawValue = row.cells[columnIndex]?.trim() ?? '';
      rawValues[field.key] = rawValue;

      if (field.type === 'date') {
        const normalized = normalizeMappedDateValue(rawValue);
        values[field.key] = normalized.value;
        if (normalized.normalized) {
          issues.push({
            code: 'IMPORT_DATE_SERIAL_NORMALIZED',
            message: 'Excel date serial was converted to a date candidate.',
            severity: 'warning',
            rowNumber: row.rowNumber,
            columnIndex,
          });
        }
      } else {
        values[field.key] = rawValue;
      }
    }

    for (const field of requiredFields) {
      if (missingMappings.has(field.key)) {
        issues.push({
          code: 'IMPORT_REQUIRED_MAPPING_MISSING',
          message: `${field.label}の列が未選択です。`,
          severity: 'error',
          rowNumber: row.rowNumber,
        });
        continue;
      }

      const columnIndex = mapping[field.key];
      const value = values[field.key]?.trim() ?? '';
      if (!value) {
        issues.push({
          code: 'IMPORT_REQUIRED_VALUE_EMPTY',
          message: `${field.label}が空です。`,
          severity: 'error',
          rowNumber: row.rowNumber,
          columnIndex,
        });
        continue;
      }

      if (field.type === 'date' && !isValidImportDate(value)) {
        issues.push({
          code: 'IMPORT_DATE_INVALID',
          message: '日付形式を確認してください。',
          severity: 'error',
          rowNumber: row.rowNumber,
          columnIndex,
        });
      }

      if (field.type === 'amount' && !isValidAmount(value)) {
        issues.push({
          code: 'IMPORT_AMOUNT_INVALID',
          message: '金額形式を確認してください。',
          severity: 'error',
          rowNumber: row.rowNumber,
          columnIndex,
        });
      }
    }

    return {
      rowNumber: row.rowNumber,
      status: issues.some((issue) => issue.severity === 'error') ? 'needs_review' : 'ready',
      rawValues,
      values,
      issues,
    };
  });
}

function isValidAmount(value: string): boolean {
  const normalized = value.replaceAll(',', '').replaceAll('￥', '').replaceAll('¥', '').trim();
  return normalized !== '' && Number.isFinite(Number(normalized));
}
