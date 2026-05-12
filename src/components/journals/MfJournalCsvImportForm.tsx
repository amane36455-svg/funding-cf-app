'use client';

import { useState } from 'react';

type ImportIssue = {
  rowNumber?: number;
  code: string;
  message: string;
};

type PreviewRow = {
  rowNumber: number;
  issueDate: string;
  slipNumber: string | null;
  debitAccountName: string;
  debitSubAccountName: string | null;
  creditAccountName: string;
  creditSubAccountName: string | null;
  amount: number;
  departments: string[];
  description: string | null;
};

type Preview = {
  encoding: 'utf-8' | 'shift_jis';
  totalRows: number;
  validRows: number;
  previewLimit: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  accounts: {
    total: number;
    matched: string[];
    missing: string[];
  };
  subAccountNames: string[];
  departmentNames: string[];
  previewRows: PreviewRow[];
  policy: {
    autoConfirm: false;
    humanReviewRequired: true;
  };
};

type ImportResult = Preview & {
  imported: true;
  journalsUpserted: number;
  detailsUpserted: number;
  accountsCreated: number;
  accountsMatched: number;
};

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };

export function MfJournalCsvImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    setError(null);
  }

  async function runPreview() {
    if (!file) {
      setError('CSVファイルを選択してください');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const body = await postCsv<Preview>('/api/imports/mf-journal-csv/preview', file);
    if (body.ok) {
      setPreview(body.data);
    } else {
      setError(body.message);
    }
    setLoading(false);
  }

  async function runImport() {
    if (!file) {
      setError('CSVファイルを選択してください');
      return;
    }
    if (!confirmed) {
      setError('取込前確認に同意してください');
      return;
    }

    setLoading(true);
    setError(null);

    const body = await postCsv<ImportResult>('/api/imports/mf-journal-csv/commit', file, true);
    if (body.ok) {
      setResult(body.data);
      setPreview(body.data);
    } else {
      setError(body.message);
    }
    setLoading(false);
  }

  const canImport = Boolean(preview && preview.errors.length === 0 && confirmed && !loading);

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">CSVアップロード</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-slate-600">MoneyForward 仕訳帳CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="block w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={runPreview}
            disabled={!file || loading}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? '処理中...' : 'プレビュー'}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          UTF-8 / Shift_JISのCSVに対応します。取込後も自動仕訳確定は行わず、人間確認前提の未分類データとして扱います。
        </p>
      </section>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {preview ? (
        <>
          <section className="rounded-md border bg-white p-5">
            <h2 className="font-semibold">取込プレビュー</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <Metric label="文字コード" value={preview.encoding === 'shift_jis' ? 'Shift_JIS' : 'UTF-8'} />
              <Metric label="CSV行数" value={`${preview.totalRows.toLocaleString('ja-JP')}行`} />
              <Metric label="有効行" value={`${preview.validRows.toLocaleString('ja-JP')}行`} />
              <Metric label="勘定科目" value={`${preview.accounts.total.toLocaleString('ja-JP')}件`} />
            </div>

            <IssueList title="エラー" tone="red" items={preview.errors} />
            <IssueList title="警告" tone="amber" items={preview.warnings} />

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <NameList title="既存勘定科目に一致" items={preview.accounts.matched} empty="一致した科目はありません" />
              <NameList title="CSVから作成予定の科目" items={preview.accounts.missing} empty="作成予定の科目はありません" />
              <NameList title="部門" items={preview.departmentNames} empty="部門はありません" />
            </div>
          </section>

          <section className="rounded-md border bg-white p-5">
            <h2 className="font-semibold">先頭{preview.previewRows.length}行</h2>
            <div className="mt-4 overflow-x-auto rounded border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-3 py-2">行</th>
                    <th className="px-3 py-2">日付</th>
                    <th className="px-3 py-2">借方</th>
                    <th className="px-3 py-2">貸方</th>
                    <th className="px-3 py-2 text-right">金額</th>
                    <th className="px-3 py-2">部門</th>
                    <th className="px-3 py-2">摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t align-top">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.issueDate}</td>
                      <td className="px-3 py-2">
                        {row.debitAccountName}
                        {row.debitSubAccountName ? <div className="text-xs text-slate-500">{row.debitSubAccountName}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        {row.creditAccountName}
                        {row.creditSubAccountName ? <div className="text-xs text-slate-500">{row.creditSubAccountName}</div> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatYen(row.amount)}</td>
                      <td className="px-3 py-2">{row.departments.join(', ') || '-'}</td>
                      <td className="max-w-sm px-3 py-2">{row.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-md border bg-white p-5">
            <h2 className="font-semibold">取込前確認</h2>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                CSV内容、エラー、警告、勘定科目マッピングを確認しました。取込後も自動確定せず、人間確認を行います。
              </span>
            </label>
            <button
              type="button"
              onClick={runImport}
              disabled={!canImport}
              className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              取込を実行
            </button>
            {result ? (
              <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                取込完了: 仕訳 {result.journalsUpserted.toLocaleString('ja-JP')}件 / 明細{' '}
                {result.detailsUpserted.toLocaleString('ja-JP')}件 / 新規科目{' '}
                {result.accountsCreated.toLocaleString('ja-JP')}件
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

async function postCsv<T>(url: string, file: File, confirmed = false): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append('file', file);
  if (confirmed) formData.append('confirmed', 'true');

  const response = await fetch(url, { method: 'POST', body: formData });
  return (await response.json()) as ApiResponse<T>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function IssueList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'red' | 'amber';
  items: ImportIssue[];
}) {
  if (items.length === 0) return null;

  const classes = tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <div className={`mt-5 rounded border p-3 text-sm ${classes}`}>
      <div className="font-medium">{title}</div>
      <ul className="mt-2 space-y-1">
        {items.slice(0, 20).map((item, index) => (
          <li key={`${item.code}-${item.rowNumber ?? 'file'}-${index}`}>
            {item.rowNumber ? `${item.rowNumber}行目: ` : ''}
            {item.message}
          </li>
        ))}
      </ul>
      {items.length > 20 ? <div className="mt-2">ほか {items.length - 20}件</div> : null}
    </div>
  );
}

function NameList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded border p-3 text-sm">
      <div className="font-medium">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2 text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-slate-700">
          {items.slice(0, 12).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {items.length > 12 ? <div className="mt-2 text-slate-500">ほか {items.length - 12}件</div> : null}
    </div>
  );
}

function formatYen(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}
