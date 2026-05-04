'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DocumentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.ok) {
      setError(body.message ?? '資料生成に失敗しました');
      return;
    }

    setPreview(body.data.document.bodyMarkdown);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4 rounded-md border bg-white p-5">
        <div>
          <label className="text-sm font-medium">出力先種別</label>
          <select name="kind" className="mt-1 w-full rounded border px-3 py-2" defaultValue="bank">
            <option value="bank">銀行向け</option>
            <option value="jfc">日本政策金融公庫向け</option>
            <option value="internal">社内稟議向け</option>
          </select>
        </div>
        <Field name="companyOverview" label="会社概要" textarea />
        <Field name="loanPurpose" label="借入目的" textarea />
        <Field name="requestedAmount" label="希望借入金額" placeholder="例: 10,000,000円" />
        <Field name="repaymentPeriod" label="希望返済期間" placeholder="例: 5年" />
        <Field name="useOfFunds" label="資金使途" textarea />
        <Field name="notes" label="補足事項" textarea />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? '生成中...' : '下書きを生成'}
        </button>
      </form>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">生成プレビュー</h2>
        <pre className="mt-4 max-h-[680px] whitespace-pre-wrap overflow-auto rounded bg-slate-50 p-4 text-sm">
          {preview ?? '入力後、ここに下書きが表示されます。'}
        </pre>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  textarea,
}: {
  name: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea name={name} rows={4} className="mt-1 w-full rounded border px-3 py-2" />
      ) : (
        <input name={name} placeholder={placeholder} className="mt-1 w-full rounded border px-3 py-2" />
      )}
    </div>
  );
}
