import { inflateRawSync } from 'node:zlib';
import { IMPORT_LIMITS } from './limits';
import type { ImportIssue } from './types';

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

export type XlsxParseResult = {
  rows: string[][];
  sheetName: string;
  issues: ImportIssue[];
};

export function parseXlsxBuffer(buffer: ArrayBuffer): XlsxParseResult {
  const zip = Buffer.from(buffer);
  const entries = readZipEntries(zip);
  const workbookXml = readZipText(zip, entries, 'xl/workbook.xml');
  const relationshipsXml = readZipText(zip, entries, 'xl/_rels/workbook.xml.rels');
  const sharedStringsXml = readOptionalZipText(zip, entries, 'xl/sharedStrings.xml');
  const firstSheet = readFirstSheet(workbookXml);
  const sheetPath = resolveSheetPath(relationshipsXml, firstSheet.relationshipId);
  const sheetXml = readZipText(zip, entries, sheetPath);
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];

  return {
    rows: parseWorksheetRows(sheetXml, sharedStrings),
    sheetName: firstSheet.name,
    issues: [],
  };
}

function readZipEntries(zip: Buffer): Map<string, ZipEntry> {
  const eocdOffset = findEndOfCentralDirectory(zip);
  const centralDirectorySize = zip.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = zip.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, ZipEntry>();
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid XLSX central directory');
    }

    const compression = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const fileNameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = zip
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8')
      .replaceAll('\\', '/');

    entries.set(name, {
      name,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(zip: Buffer): number {
  const minOffset = Math.max(0, zip.length - 65_557);
  for (let offset = zip.length - 22; offset >= minOffset; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error('Invalid XLSX file');
}

function readZipText(zip: Buffer, entries: Map<string, ZipEntry>, name: string): string {
  const text = readOptionalZipText(zip, entries, name);
  if (text === null) throw new Error(`XLSX part was not found: ${name}`);
  return text;
}

function readOptionalZipText(zip: Buffer, entries: Map<string, ZipEntry>, name: string): string | null {
  const entry = entries.get(name);
  if (!entry) return null;
  return readZipEntry(zip, entry).toString('utf8');
}

function readZipEntry(zip: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (zip.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error('Invalid XLSX local header');
  }

  const fileNameLength = zip.readUInt16LE(offset + 26);
  const extraLength = zip.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = zip.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) return compressed;
  if (entry.compression === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported XLSX compression method: ${entry.compression}`);
}

function readFirstSheet(workbookXml: string): { name: string; relationshipId: string } {
  const match = workbookXml.match(/<sheet\b[^>]*>/);
  if (!match) throw new Error('XLSX workbook does not include a sheet');
  const attrs = parseAttributes(match[0]);
  const relationshipId = attrs['r:id'];
  if (!relationshipId) throw new Error('XLSX first sheet relationship was not found');
  return {
    name: attrs.name ?? 'Sheet1',
    relationshipId,
  };
}

function resolveSheetPath(relationshipsXml: string, relationshipId: string): string {
  const relationshipPattern = /<Relationship\b[^>]*>/g;
  const relationships = relationshipsXml.match(relationshipPattern) ?? [];
  for (const relationship of relationships) {
    const attrs = parseAttributes(relationship);
    if (attrs.Id !== relationshipId) continue;
    const target = attrs.Target;
    if (!target) break;
    return normalizeZipPath(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  throw new Error('XLSX first sheet target was not found');
}

function parseSharedStrings(xml: string): string[] {
  const items = xml.match(/<si\b[\s\S]*?<\/si>/g) ?? [];
  return items.map((item) => {
    const textParts = item.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) ?? [];
    return textParts.map((part) => decodeXml(part.replace(/<[^>]+>/g, ''))).join('');
  });
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) ?? [];

  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowXml.match(/<c\b[\s\S]*?<\/c>/g) ?? [];

    for (const cellXml of cellMatches) {
      const openTag = cellXml.match(/<c\b[^>]*>/)?.[0] ?? '';
      const attrs = parseAttributes(openTag);
      const columnIndex = columnIndexFromReference(attrs.r);
      if (columnIndex >= IMPORT_LIMITS.maxColumns) continue;

      cells[columnIndex] = readCellValue(cellXml, attrs.t, sharedStrings);
    }

    rows.push(fillSparseCells(cells));
  }

  return trimTrailingEmptyRows(rows);
}

function readCellValue(cellXml: string, type: string | undefined, sharedStrings: string[]): string {
  if (type === 'inlineStr') {
    const inlineText = cellXml.match(/<is\b[\s\S]*?<\/is>/)?.[0] ?? '';
    return decodeXml(inlineText.replace(/<[^>]+>/g, ''));
  }

  const raw = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? '';
  if (type === 's') {
    const index = Number(raw);
    return Number.isInteger(index) ? sharedStrings[index] ?? '' : '';
  }
  return decodeXml(raw);
}

function columnIndexFromReference(reference: string | undefined): number {
  const letters = reference?.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return 0;
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function fillSparseCells(cells: string[]): string[] {
  const length = Math.min(cells.length, IMPORT_LIMITS.maxColumns);
  return Array.from({ length }, (_, index) => cells[index] ?? '');
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  let end = rows.length;
  while (end > 0 && rows[end - 1].every((cell) => cell.trim() === '')) {
    end -= 1;
  }
  return rows.slice(0, end);
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([\w:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag))) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

function normalizeZipPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
