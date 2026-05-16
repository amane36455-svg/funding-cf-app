import { IMPORT_LIMITS } from './limits';

export type ImportFileKind = 'csv' | 'excel';
export type ImportEncoding = 'utf-8' | 'utf-8-bom' | 'shift_jis' | 'xlsx';
export type ImportSeverity = 'error' | 'warning';

export type ImportIssue = {
  code: string;
  message: string;
  severity: ImportSeverity;
  rowNumber?: number;
  columnIndex?: number;
};

export type ImportPreviewRow = {
  rowNumber: number;
  cells: string[];
};

export type ImportPreviewResult = {
  file: {
    name: string;
    size: number;
    type: string;
    kind: ImportFileKind;
    encoding: ImportEncoding;
    sheetName?: string;
  };
  limits: typeof IMPORT_LIMITS;
  headers: string[];
  rows: ImportPreviewRow[];
  totalRows: number;
  totalColumns: number;
  truncated: {
    rows: boolean;
    columns: boolean;
    previewRows: boolean;
  };
  issues: ImportIssue[];
  systemFields: ImportSystemField[];
};

export type ImportFieldKey =
  | 'tradeDate'
  | 'debitAccount'
  | 'debitSubAccount'
  | 'creditAccount'
  | 'creditSubAccount'
  | 'department'
  | 'amount'
  | 'description'
  | 'taxCategory';

export type ImportFieldType = 'date' | 'text' | 'amount';

export type ImportSystemField = {
  key: ImportFieldKey;
  label: string;
  required: boolean;
  type: ImportFieldType;
};

export type ImportMapping = Partial<Record<ImportFieldKey, number>>;

export const IMPORT_SYSTEM_FIELDS: ImportSystemField[] = [
  { key: 'tradeDate', label: '日付', required: true, type: 'date' },
  { key: 'debitAccount', label: '借方科目', required: true, type: 'text' },
  { key: 'debitSubAccount', label: '借方補助科目', required: false, type: 'text' },
  { key: 'creditAccount', label: '貸方科目', required: true, type: 'text' },
  { key: 'creditSubAccount', label: '貸方補助科目', required: false, type: 'text' },
  { key: 'department', label: '部門', required: false, type: 'text' },
  { key: 'amount', label: '金額', required: true, type: 'amount' },
  { key: 'description', label: '摘要', required: false, type: 'text' },
  { key: 'taxCategory', label: '税区分', required: false, type: 'text' },
];
