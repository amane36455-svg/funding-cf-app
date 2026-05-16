import { describe, expect, it } from 'vitest';
import { buildImportPreview } from '@/lib/imports/preview';

function bytes(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer as ArrayBuffer;
}

describe('buildImportPreview', () => {
  it('parses UTF-8 CSV headers and preview rows', () => {
    const text = '日付,借方科目,貸方科目,金額,摘要\n2026/05/01,普通預金,売上高,1000,A社売上\n';
    const buffer = new TextEncoder().encode(text).buffer as ArrayBuffer;

    const result = buildImportPreview({
      fileName: 'journal.csv',
      contentType: 'text/csv',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.file.kind).toBe('csv');
    expect(result.data.file.encoding).toBe('utf-8');
    expect(result.data.headers).toEqual(['日付', '借方科目', '貸方科目', '金額', '摘要']);
    expect(result.data.rows[0]).toEqual({
      rowNumber: 2,
      cells: ['2026/05/01', '普通預金', '売上高', '1000', 'A社売上'],
    });
  });

  it('handles quoted CSV cells', () => {
    const text = 'date,description,amount\n2026-05-01,"A社, 5月売上",1,000\n';
    const buffer = new TextEncoder().encode(text).buffer as ArrayBuffer;

    const result = buildImportPreview({
      fileName: 'journal.csv',
      contentType: 'text/csv',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows[0].cells[1]).toBe('A社, 5月売上');
  });

  it('detects Shift_JIS CSV when UTF-8 decoding fails', () => {
    const buffer = bytes([
      0x93, 0xfa, 0x95, 0x74, 0x2c, 0x61, 0x6d, 0x6f, 0x75, 0x6e, 0x74, 0x0a, 0x32, 0x30, 0x32,
      0x36, 0x2f, 0x30, 0x35, 0x2f, 0x30, 0x31, 0x2c, 0x31, 0x30, 0x30, 0x30, 0x0a,
    ]);

    const result = buildImportPreview({
      fileName: 'journal.csv',
      contentType: 'text/csv',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.file.encoding).toBe('shift_jis');
    expect(result.data.headers[0]).toBe('日付');
  });

  it('rejects files above the size limit', () => {
    const result = buildImportPreview({
      fileName: 'large.csv',
      contentType: 'text/csv',
      size: 10 * 1024 * 1024 + 1,
      buffer: new ArrayBuffer(0),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('IMPORT_FILE_TOO_LARGE');
    expect(result.status).toBe(413);
  });

  it('rejects rows above the row limit', () => {
    const rows = ['date,amount'];
    for (let index = 0; index < 10_001; index += 1) {
      rows.push(`2026/05/01,${index}`);
    }
    const buffer = new TextEncoder().encode(rows.join('\n')).buffer as ArrayBuffer;

    const result = buildImportPreview({
      fileName: 'too-many-rows.csv',
      contentType: 'text/csv',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('IMPORT_TOO_MANY_ROWS');
  });
});
