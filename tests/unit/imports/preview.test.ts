import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { IMPORT_LIMITS } from '@/lib/imports/limits';
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

  it('parses the first worksheet from a valid xlsx file', () => {
    const buffer = createXlsxFixture({
      sharedStrings: ['日付', '借方科目', '金額', '2026/05/01', '普通預金', '1000'],
      sheetXml: [
        '<worksheet><sheetData>',
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>',
        '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2" t="s"><v>5</v></c></row>',
        '</sheetData></worksheet>',
      ].join(''),
    });

    const result = buildImportPreview({
      fileName: 'journal.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.file.kind).toBe('excel');
    expect(result.data.file.sheetName).toBe('仕訳帳');
    expect(result.data.headers).toEqual(['日付', '借方科目', '金額']);
    expect(result.data.rows[0].cells).toEqual(['2026/05/01', '普通預金', '1000']);
  });

  it('rejects invalid xlsx files as parse failures', () => {
    const buffer = bytes([0x01, 0x02, 0x03, 0x04]);

    const result = buildImportPreview({
      fileName: 'broken.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('IMPORT_PARSE_FAILED');
  });

  it('rejects xlsx entries above the uncompressed size limit', () => {
    const buffer = createZip([
      {
        name: 'xl/workbook.xml',
        content: '<workbook />',
        uncompressedSizeOverride: IMPORT_LIMITS.maxXlsxEntryUncompressedBytes + 1,
      },
    ]);

    const result = buildImportPreview({
      fileName: 'unsafe.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
      buffer,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('IMPORT_XLSX_UNSAFE');
  });
});

function createXlsxFixture(args: { sharedStrings: string[]; sheetXml: string }): ArrayBuffer {
  return createZip([
    {
      name: 'xl/workbook.xml',
      content:
        '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="仕訳帳" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      name: 'xl/sharedStrings.xml',
      content: `<sst>${args.sharedStrings.map((value) => `<si><t>${escapeXml(value)}</t></si>`).join('')}</sst>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: args.sheetXml,
    },
  ]);
}

function createZip(
  entries: Array<{ name: string; content: string; uncompressedSizeOverride?: number }>,
): ArrayBuffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const content = Buffer.from(entry.content, 'utf8');
    const compressed = deflateRawSync(content);
    const crc = crc32(content);
    const uncompressedSize = entry.uncompressedSizeOverride ?? content.length;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(centralDirectoryOffset, 16);

  const zip = Buffer.concat([...localParts, centralDirectory, eocd]);
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
