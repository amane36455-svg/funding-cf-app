import { describe, expect, it } from 'vitest';
import { buildMappedPreviewRows } from '@/lib/imports/mapping-preview';
import { IMPORT_SYSTEM_FIELDS } from '@/lib/imports/types';

describe('buildMappedPreviewRows', () => {
  it('normalizes a serial only when the mapped system field is a date', () => {
    const rows = [
      {
        rowNumber: 2,
        cells: ['46143', 'cash', 'sales', '46143'],
      },
    ];

    const [mapped] = buildMappedPreviewRows(rows, IMPORT_SYSTEM_FIELDS, {
      tradeDate: 0,
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
    });

    expect(mapped.status).toBe('ready');
    expect(mapped.rawValues.tradeDate).toBe('46143');
    expect(mapped.values.tradeDate).toBe('2026-05-01');
    expect(mapped.values.amount).toBe('46143');
    expect(mapped.issues).toEqual([
      expect.objectContaining({
        code: 'IMPORT_DATE_SERIAL_NORMALIZED',
        severity: 'warning',
        rowNumber: 2,
        columnIndex: 0,
      }),
    ]);
  });

  it('does not normalize an unmapped serial value', () => {
    const rows = [
      {
        rowNumber: 2,
        cells: ['46143', 'cash', 'sales', '1000'],
      },
    ];

    const [mapped] = buildMappedPreviewRows(rows, IMPORT_SYSTEM_FIELDS, {
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
    });

    expect(mapped.values.tradeDate).toBeUndefined();
    expect(JSON.stringify(mapped)).not.toContain('2026-05-01');
    expect(mapped.issues).toEqual([
      expect.objectContaining({
        code: 'IMPORT_REQUIRED_MAPPING_MISSING',
        severity: 'error',
      }),
    ]);
  });

  it('keeps normal date strings valid and unchanged', () => {
    const rows = [
      {
        rowNumber: 2,
        cells: ['2026/05/01', 'cash', 'sales', '1000'],
      },
      {
        rowNumber: 3,
        cells: ['2026-05-01', 'cash', 'sales', '1000'],
      },
    ];

    const mapped = buildMappedPreviewRows(rows, IMPORT_SYSTEM_FIELDS, {
      tradeDate: 0,
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
    });

    expect(mapped.map((row) => row.status)).toEqual(['ready', 'ready']);
    expect(mapped[0].values.tradeDate).toBe('2026/05/01');
    expect(mapped[1].values.tradeDate).toBe('2026-05-01');
    expect(mapped.flatMap((row) => row.issues)).toEqual([]);
  });

  it('keeps invalid date numbers in needs_review', () => {
    const rows = [
      {
        rowNumber: 2,
        cells: ['0', 'cash', 'sales', '1000'],
      },
      {
        rowNumber: 3,
        cells: ['123.45', 'cash', 'sales', '1000'],
      },
    ];

    const mapped = buildMappedPreviewRows(rows, IMPORT_SYSTEM_FIELDS, {
      tradeDate: 0,
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
    });

    expect(mapped.map((row) => row.status)).toEqual(['needs_review', 'needs_review']);
    expect(mapped.map((row) => row.values.tradeDate)).toEqual(['0', '123.45']);
    expect(mapped.every((row) => row.issues.some((issue) => issue.code === 'IMPORT_DATE_INVALID'))).toBe(true);
  });
});
