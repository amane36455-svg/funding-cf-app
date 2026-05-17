import { describe, expect, it } from 'vitest';
import {
  buildImportSaveFormData,
  getImportSaveAvailability,
  sanitizeImportSaveMapping,
} from '@/lib/imports/save-ui';
import { IMPORT_SYSTEM_FIELDS, type ImportMapping } from '@/lib/imports/types';

describe('import save UI helpers', () => {
  const completeMapping: ImportMapping = {
    tradeDate: 0,
    debitAccount: 1,
    creditAccount: 2,
    amount: 3,
  };

  it('allows saving only when file, required mappings, and ready rows exist', () => {
    const file = new File(['date,debit,credit,amount\n2026/05/01,cash,sales,1000\n'], 'journal.csv', {
      type: 'text/csv',
    });

    expect(
      getImportSaveAvailability({
        file,
        fields: IMPORT_SYSTEM_FIELDS,
        isSaving: false,
        mapping: completeMapping,
        readyRows: 1,
      }),
    ).toEqual({ canSave: true, missingRequiredFields: [] });
  });

  it('disables saving when required mappings are missing', () => {
    const availability = getImportSaveAvailability({
      file: new File([''], 'journal.csv', { type: 'text/csv' }),
      fields: IMPORT_SYSTEM_FIELDS,
      isSaving: false,
      mapping: { tradeDate: 0, debitAccount: 1, amount: 3 },
      readyRows: 1,
    });

    expect(availability.canSave).toBe(false);
    expect(availability.missingRequiredFields).toEqual(['creditAccount']);
  });

  it('disables saving when there are no ready rows', () => {
    const availability = getImportSaveAvailability({
      file: new File([''], 'journal.csv', { type: 'text/csv' }),
      fields: IMPORT_SYSTEM_FIELDS,
      isSaving: false,
      mapping: completeMapping,
      readyRows: 0,
    });

    expect(availability.canSave).toBe(false);
  });

  it('disables saving while a save request is in progress', () => {
    const availability = getImportSaveAvailability({
      file: new File([''], 'journal.csv', { type: 'text/csv' }),
      fields: IMPORT_SYSTEM_FIELDS,
      isSaving: true,
      mapping: completeMapping,
      readyRows: 1,
    });

    expect(availability.canSave).toBe(false);
  });

  it('builds save form data with file and sanitized mapping only', () => {
    const file = new File(['date,debit,credit,amount\n2026/05/01,cash,sales,1000\n'], 'journal.csv', {
      type: 'text/csv',
    });
    const unsafeMapping = {
      ...completeMapping,
      companyId: 4,
      negative: -1,
      fractional: 1.5,
    } as ImportMapping;

    const formData = buildImportSaveFormData(file, unsafeMapping);

    expect(formData.get('file')).toBe(file);
    expect(formData.get('companyId')).toBeNull();
    expect(JSON.parse(String(formData.get('mapping')))).toEqual(completeMapping);
  });

  it('drops unsupported mapping keys before save', () => {
    const unsafeMapping = {
      tradeDate: 0,
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
      companyId: 4,
    } as ImportMapping;

    expect(sanitizeImportSaveMapping(unsafeMapping)).toEqual(completeMapping);
  });
});
