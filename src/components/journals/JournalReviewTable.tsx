'use client';

import { useState } from 'react';
import { CF_CATEGORY_OPTIONS } from '@/lib/cf/categories';

type Row = {
  id: string;
  issueDate: string | Date;
  accountName: string;
  side: string;
  amount: number;
  description: string;
  cfCategory: string;
  cfGroup: string;
  needsReview: boolean;
};

export function JournalReviewTable({ rows }: { rows: Row[] }) {
  const [items, setItems] = useState(rows);

  async function updateCategory(id: string, cfCategory: string) {
    const response = await fetch(`/api/journals/${id}/classify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cfCategory, needsReview: false }),
    });
    const body = await response.json();
    if (!body.ok) return;

    const option = CF_CATEGORY_OPTIONS.find((item) => item.cfCategory === cfCategory);
    setItems((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              cfCategory,
              cfGroup: option?.cfGroup ?? row.cfGroup,
              needsReview: false,
            }
          : row,
      ),
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-3 py-2">日付</th>
            <th className="px-3 py-2">科目</th>
            <th className="px-3 py-2">摘要</th>
            <th className="px-3 py-2 text-right">金額</th>
            <th className="px-3 py-2">分類</th>
            <th className="px-3 py-2">状態</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                対象の仕訳明細はありません。
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id} className="border-t align-top">
                <td className="whitespace-nowrap px-3 py-2">{formatDate(row.issueDate)}</td>
                <td className="px-3 py-2">{row.accountName}</td>
                <td className="max-w-md px-3 py-2">{row.description}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatYen(row.amount)}</td>
                <td className="px-3 py-2">
                  <select
                    value={row.cfCategory}
                    onChange={(event) => updateCategory(row.id, event.target.value)}
                    className="w-full rounded border px-2 py-1"
                  >
                    {row.cfCategory === '未分類' ? <option value="未分類">未分類</option> : null}
                    {CF_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.cfCategory} value={option.cfCategory}>
                        {option.cfCategory}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-slate-500">{row.cfGroup}</div>
                </td>
                <td className="px-3 py-2">
                  {row.needsReview ? (
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">要確認</span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">確認済</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('ja-JP');
}

function formatYen(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}
