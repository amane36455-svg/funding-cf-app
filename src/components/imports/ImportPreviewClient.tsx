'use client';

import { useMemo, useRef, useState } from 'react';
import type {
  ImportFieldKey,
  ImportIssue,
  ImportMapping,
  ImportPreviewResult,
  ImportPreviewRow,
  ImportSystemField,
} from '@/lib/imports/types';
import { formatBytes } from '@/lib/imports/limits';

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: { issues?: ImportIssue[] } };

type MappedRowIssue = {
  field?: ImportFieldKey;
  message: string;
};

type MappedRow = {
  rowNumber: number;
  status: 'ready' | 'needs_review';
  values: Partial<Record<ImportFieldKey, string>>;
  issues: MappedRowIssue[];
};

const CORE_FIELDS: ImportFieldKey[] = [
  'tradeDate',
  'debitAccount',
  'creditAccount',
  'amount',
  'description',
  'taxCategory',
];

export function ImportPreviewClient({ companyName }: { companyName: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mappedRows = useMemo(() => {
    if (!preview) return [];
    return validateRows(preview.rows, preview.systemFields, mapping);
  }, [mapping, preview]);
  const needsReviewCount = mappedRows.filter((row) => row.status === 'needs_review').length;
  const readyCount = mappedRows.length - needsReviewCount;

  async function upload(selectedFile: File | null) {
    setFile(selectedFile);
    setPreview(null);
    setMapping({});
    setError(null);

    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    setIsUploading(true);
    try {
      const response = await fetch('/api/imports/preview', {
        method: 'POST',
        body: formData,
      });
      const body = (await response.json()) as ApiResponse<ImportPreviewResult>;
      if (!body.ok) {
        setError(body.message);
        return;
      }
      setPreview(body.data);
    } catch {
      setError('ファイルをアップロードできませんでした。時間をおいて再度お試しください。');
    } finally {
      setIsUploading(false);
    }
  }

  function updateMapping(field: ImportFieldKey, value: string) {
    setMapping((current) => {
      const next = { ...current };
      if (value === '') {
        delete next[field];
      } else {
        next[field] = Number(value);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <div
          className={`rounded-md border border-dashed bg-white p-6 ${
            isDragging ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-300'
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void upload(event.dataTransfer.files.item(0));
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">CSV / Excel upload</h2>
              <p className="mt-1 text-sm text-slate-500">
                {file ? file.name : 'CSVまたはxlsxを選択してください。'}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => void upload(event.target.files?.item(0) ?? null)}
              />
              <button
                type="button"
                className="rounded border px-4 py-2 text-sm"
                onClick={() => inputRef.current?.click()}
              >
                ファイル選択
              </button>
            </div>
          </div>
          {isUploading ? <p className="mt-4 text-sm text-slate-500">解析中...</p> : null}
          {error ? <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="rounded-md border bg-white p-4 text-sm">
          <div className="font-semibold">現在会社</div>
          <div className="mt-1 truncate text-slate-600">{companyName}</div>
          <dl className="mt-4 space-y-2 text-xs text-slate-600">
            <Info label="File limit" value="10 MB" />
            <Info label="Rows" value="10,000" />
            <Info label="Preview" value="200 rows" />
            <Info label="Columns" value="100" />
          </dl>
        </div>
      </section>

      {preview ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Metric label="種別" value={preview.file.kind === 'csv' ? 'CSV' : 'Excel'} />
            <Metric label="文字コード" value={preview.file.encoding} />
            <Metric label="サイズ" value={formatBytes(preview.file.size)} />
            <Metric label="行数" value={`${preview.totalRows} rows`} />
          </section>

          {preview.issues.length > 0 ? (
            <section className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900">
              <h2 className="font-semibold">Warning</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-md border bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">Manual mapping</h2>
              <div className="text-sm text-slate-500">
                ready {readyCount} / needs_review {needsReviewCount}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {preview.systemFields.map((field) => (
                <label key={field.key} className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">
                    {field.label}
                    {field.required ? <span className="text-red-600"> *</span> : null}
                  </span>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(event) => updateMapping(field.key, event.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">未選択</option>
                    {preview.headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {index + 1}: {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-semibold">Preview</h2>
              {preview.truncated.previewRows ? (
                <span className="text-sm text-slate-500">先頭{preview.limits.previewRows}行のみ表示</span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    {CORE_FIELDS.map((field) => (
                      <th key={field} className="px-3 py-2">
                        {preview.systemFields.find((item) => item.key === field)?.label}
                      </th>
                    ))}
                    <th className="px-3 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t align-top">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            row.status === 'ready'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      {CORE_FIELDS.map((field) => (
                        <td key={field} className="max-w-56 truncate px-3 py-2">
                          {row.values[field] ?? '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-amber-800">
                        {row.issues.map((issue) => issue.message).join(' / ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-md border bg-slate-950 p-4 text-xs text-slate-100">
            <div className="mb-3 font-semibold">JSON preview</div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(
                {
                  file: preview.file,
                  mapping,
                  rows: mappedRows,
                  summary: {
                    totalRows: preview.totalRows,
                    previewRows: mappedRows.length,
                    ready: readyCount,
                    needsReview: needsReviewCount,
                  },
                },
                null,
                2,
              )}
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}

function validateRows(
  rows: ImportPreviewRow[],
  fields: ImportSystemField[],
  mapping: ImportMapping,
): MappedRow[] {
  const requiredFields = fields.filter((field) => field.required);
  const missingMappings = new Set(
    requiredFields.filter((field) => mapping[field.key] === undefined).map((field) => field.key),
  );

  return rows.map((row) => {
    const values: Partial<Record<ImportFieldKey, string>> = {};
    const issues: MappedRowIssue[] = [];

    for (const field of fields) {
      const columnIndex = mapping[field.key];
      if (columnIndex === undefined) continue;
      values[field.key] = row.cells[columnIndex]?.trim() ?? '';
    }

    for (const field of requiredFields) {
      if (missingMappings.has(field.key)) {
        issues.push({ field: field.key, message: `${field.label}の列が未選択です。` });
        continue;
      }

      const value = values[field.key]?.trim() ?? '';
      if (!value) {
        issues.push({ field: field.key, message: `${field.label}が空です。` });
        continue;
      }

      if (field.type === 'date' && !isValidDate(value)) {
        issues.push({ field: field.key, message: '日付形式を確認してください。' });
      }

      if (field.type === 'amount' && !isValidAmount(value)) {
        issues.push({ field: field.key, message: '金額形式を確認してください。' });
      }
    }

    return {
      rowNumber: row.rowNumber,
      status: issues.length > 0 ? 'needs_review' : 'ready',
      values,
      issues,
    };
  });
}

function isValidDate(value: string): boolean {
  const normalized = value.replaceAll('.', '/').replaceAll('-', '/');
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidAmount(value: string): boolean {
  const normalized = value.replaceAll(',', '').replaceAll('￥', '').replaceAll('¥', '').trim();
  return normalized !== '' && Number.isFinite(Number(normalized));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
