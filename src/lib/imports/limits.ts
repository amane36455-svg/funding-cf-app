export const IMPORT_LIMITS = {
  maxFileSizeBytes: 4 * 1024 * 1024,
  maxRows: 10_000,
  previewRows: 200,
  maxColumns: 100,
  maxCellLength: 5_000,
  maxXlsxEntryUncompressedBytes: 25 * 1024 * 1024,
  maxXlsxTotalUncompressedBytes: 50 * 1024 * 1024,
} as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}
