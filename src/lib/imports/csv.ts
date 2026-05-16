import { IMPORT_LIMITS } from './limits';
import type { ImportEncoding, ImportIssue } from './types';

export type CsvParseResult = {
  rows: string[][];
  encoding: ImportEncoding;
  issues: ImportIssue[];
};

const REPLACEMENT_CHAR = '\uFFFD';

export function parseCsvBuffer(buffer: ArrayBuffer): CsvParseResult {
  const decoded = decodeCsv(buffer);
  const rows = parseCsvText(decoded.text);
  const issues = [...decoded.issues];

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell.length > IMPORT_LIMITS.maxCellLength) {
        issues.push({
          code: 'CELL_TOO_LONG',
          message: `セルの文字数が上限を超えています。${IMPORT_LIMITS.maxCellLength}文字以内にしてください。`,
          severity: 'warning',
          rowNumber: rowIndex + 1,
          columnIndex,
        });
      }
    });
  });

  return {
    rows,
    encoding: decoded.encoding,
    issues,
  };
}

function decodeCsv(buffer: ArrayBuffer): {
  text: string;
  encoding: ImportEncoding;
  issues: ImportIssue[];
} {
  const bytes = new Uint8Array(buffer);
  const issues: ImportIssue[] = [];

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(3));
    return {
      text,
      encoding: 'utf-8-bom',
      issues: detectReplacementCharacters(text, issues),
    };
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return {
      text,
      encoding: 'utf-8',
      issues: detectReplacementCharacters(text, issues),
    };
  } catch {
    const text = new TextDecoder('shift_jis', { fatal: false }).decode(bytes);
    return {
      text,
      encoding: 'shift_jis',
      issues: detectReplacementCharacters(text, issues),
    };
  }
}

function detectReplacementCharacters(text: string, issues: ImportIssue[]): ImportIssue[] {
  if (text.includes(REPLACEMENT_CHAR)) {
    issues.push({
      code: 'MOJIBAKE_SUSPECTED',
      message: '文字化けの可能性があります。文字コードと摘要・科目名を確認してください。',
      severity: 'warning',
    });
  }
  return issues;
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return trimTrailingEmptyRows(rows).map((cells) => cells.map((value) => value.trim()));
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  let end = rows.length;
  while (end > 0 && rows[end - 1].every((cell) => cell.trim() === '')) {
    end -= 1;
  }
  return rows.slice(0, end);
}
