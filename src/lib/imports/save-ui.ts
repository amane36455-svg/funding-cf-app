import {
  IMPORT_SYSTEM_FIELDS,
  type ImportFieldKey,
  type ImportMapping,
  type ImportSystemField,
} from './types';

export type ImportSaveResult = {
  importedFileId: string;
  importBatchId: string;
  status: 'draft';
  totalRows: number;
  savedRows: number;
  skippedRows: number;
  needsReviewRows: number;
};

export type ImportSaveAvailability = {
  canSave: boolean;
  missingRequiredFields: ImportFieldKey[];
};

export const IMPORT_SAVE_CONFIRM_MESSAGE =
  'ready の行のみ下書き保存します。needs_review の行は保存されません。';
export const IMPORT_SAVE_DISABLED_MESSAGE = '必須項目のマッピングとready行が必要です。';

const ALLOWED_MAPPING_KEYS = new Set<ImportFieldKey>(IMPORT_SYSTEM_FIELDS.map((field) => field.key));

export function getMissingRequiredImportMappingFields(
  fields: ImportSystemField[],
  mapping: ImportMapping,
): ImportFieldKey[] {
  return fields
    .filter((field) => field.required)
    .filter((field) => !Number.isInteger(mapping[field.key]))
    .map((field) => field.key);
}

export function getImportSaveAvailability({
  file,
  fields,
  isSaving,
  mapping,
  readyRows,
}: {
  file: File | null;
  fields: ImportSystemField[];
  isSaving: boolean;
  mapping: ImportMapping;
  readyRows: number;
}): ImportSaveAvailability {
  const missingRequiredFields = getMissingRequiredImportMappingFields(fields, mapping);
  return {
    canSave: Boolean(file) && !isSaving && readyRows > 0 && missingRequiredFields.length === 0,
    missingRequiredFields,
  };
}

export function buildImportSaveFormData(file: File, mapping: ImportMapping): FormData {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapping', JSON.stringify(sanitizeImportSaveMapping(mapping)));
  return formData;
}

export function sanitizeImportSaveMapping(mapping: ImportMapping): ImportMapping {
  const sanitized: ImportMapping = {};
  for (const [key, value] of Object.entries(mapping)) {
    if (!ALLOWED_MAPPING_KEYS.has(key as ImportFieldKey)) continue;
    if (!Number.isInteger(value) || value < 0) continue;
    sanitized[key as ImportFieldKey] = value;
  }
  return sanitized;
}
