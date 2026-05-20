'use client';

import { useEffect, useMemo, useState } from 'react';

type ImportBatchStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'CANCELLED';
type StatusFilter = ImportBatchStatus | 'all';

type ImportBatchListItem = {
  id: string;
  createdAt: string;
  status: ImportBatchStatus;
  totalRows: number;
  readyRows: number;
  needsReviewRows: number;
  skippedRows: number;
  canConfirm: boolean;
};

type ImportBatchListResponse = {
  batches: ImportBatchListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'DRAFT', label: '下書き' },
  { value: 'NEEDS_REVIEW', label: '要確認' },
  { value: 'CANCELLED', label: 'キャンセル済み' },
];

const PAGE_SIZE = 20;

export function ImportHistoryClient() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ImportBatchListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    params.set('status', status);
    return `/api/imports/batches?${params.toString()}`;
  }, [page, status]);

  useEffect(() => {
    let isActive = true;

    async function loadBatches() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(requestPath, {
          method: 'GET',
          headers: { accept: 'application/json' },
        });
        const body = (await response.json()) as ApiResponse<ImportBatchListResponse>;

        if (!isActive) return;
        if (!body.ok) {
          setData(null);
          setError(body.message);
          return;
        }

        setData(body.data);
      } catch {
        if (!isActive) return;
        setData(null);
        setError('インポート履歴を読み込めませんでした。しばらくしてから再試行してください。');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadBatches();

    return () => {
      isActive = false;
    };
  }, [requestPath]);

  const batches = data?.batches ?? [];
  const pagination = data?.pagination ?? { page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 };
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  function updateStatus(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">ステータス</span>
            <select
              value={status}
              onChange={(event) => updateStatus(event.target.value as StatusFilter)}
              className="w-full rounded border px-3 py-2 md:w-56"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-slate-500">
            {pagination.totalItems.toLocaleString()} 件 / {pagination.page} ページ
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">インポート履歴を読み込んでいます...</div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-700">{error}</div>
        ) : batches.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">インポートバッチが見つかりませんでした。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-3">作成日時</th>
                  <th className="px-4 py-3">ステータス</th>
                  <th className="px-4 py-3 text-right">合計</th>
                  <th className="px-4 py-3 text-right">取込可</th>
                  <th className="px-4 py-3 text-right">要確認</th>
                  <th className="px-4 py-3 text-right">スキップ</th>
                  <th className="px-4 py-3">確定可否</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className={`border-t align-top ${batch.status === 'CANCELLED' ? 'bg-slate-50 text-slate-500' : ''}`}
                  >
                    <td className="px-4 py-3">{formatDateTime(batch.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{batch.totalRows.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{batch.readyRows.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{batch.needsReviewRows.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{batch.skippedRows.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {batch.canConfirm ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          確定可
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          対象外
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">操作は現在準備中です。</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={`rounded border px-4 py-2 text-sm ${
            canGoPrevious ? 'bg-white' : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
          disabled={!canGoPrevious}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          前へ
        </button>
        <div className="text-sm text-slate-500">
          {pagination.page} / {Math.max(1, pagination.totalPages)} ページ
        </div>
        <button
          type="button"
          className={`rounded border px-4 py-2 text-sm ${
            canGoNext ? 'bg-white' : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
          disabled={!canGoNext}
          onClick={() => setPage((current) => current + 1)}
        >
          次へ
        </button>
      </nav>

      <section className="rounded-md border bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          キャンセル済みバッチは履歴として表示されますが、確定対象にはなりません。キャンセルは物理削除ではなく、仕訳エントリおよび明細は下書きデータとして残ります。
        </p>
        <p className="mt-2">
          このページのスクリーンショットやコピーした値は、ダミーデータまたは完全に匿名化されていない限り共有しないでください。
        </p>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportBatchStatus }) {
  const styles: Record<ImportBatchStatus, string> = {
    DRAFT: 'bg-emerald-100 text-emerald-700',
    NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
    CANCELLED: 'bg-slate-200 text-slate-700',
  };

  const labels: Record<ImportBatchStatus, string> = {
    DRAFT: '下書き',
    NEEDS_REVIEW: '要確認',
    CANCELLED: 'キャンセル済み',
  };

  return <span className={`rounded px-2 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
