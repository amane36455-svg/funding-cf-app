import { describe, expect, it } from 'vitest';
import { excelSerialToIsoDate, isValidImportDate, normalizeMappedDateValue } from '@/lib/imports/date-serial';

describe('date serial normalization', () => {
  it('normalizes an Excel date serial candidate', () => {
    expect(normalizeMappedDateValue('46143')).toEqual({
      value: '2026-05-01',
      normalized: true,
    });
  });

  it('keeps existing date strings unchanged', () => {
    expect(normalizeMappedDateValue('2026/05/01')).toEqual({
      value: '2026/05/01',
      normalized: false,
    });
    expect(normalizeMappedDateValue('2026-05-01')).toEqual({
      value: '2026-05-01',
      normalized: false,
    });
    expect(isValidImportDate('2026.05.01')).toBe(true);
  });

  it('does not treat invalid numeric values as dates', () => {
    for (const value of ['0', '-1', '123.45', '1000', '999999']) {
      expect(normalizeMappedDateValue(value)).toEqual({
        value,
        normalized: false,
      });
    }
  });

  it('uses the Excel 1900 date system offset and rejects the fake leap day', () => {
    expect(excelSerialToIsoDate(61)).toBe('1900-03-01');
    expect(excelSerialToIsoDate(60)).toBeNull();
  });
});
