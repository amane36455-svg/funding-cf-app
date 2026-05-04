'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: String(formData.get('name') ?? '') }),
    });
    const body = await response.json();
    setLoading(false);
    if (!body.ok) {
      setError(body.message ?? '会社作成に失敗しました');
      return;
    }

    await update({ currentCompanyId: body.data.company.id });
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6">
        <h1 className="text-xl font-bold">会社を作成</h1>
        <p className="text-sm text-slate-600">最初の会社を登録して利用を開始します。</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <input name="name" required placeholder="会社名" className="w-full rounded border px-3 py-2" />
        <button disabled={loading} className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50">
          {loading ? '作成中...' : '会社を作成'}
        </button>
      </form>
    </div>
  );
}
