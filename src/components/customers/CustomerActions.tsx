'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function CustomerActions({
  companyId,
  isFavorite,
  isCurrent,
}: {
  companyId: string;
  isFavorite: boolean;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [favorite, setFavorite] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  async function openCompany() {
    if (isCurrent) {
      router.push('/dashboard');
      return;
    }

    setLoading(true);
    const response = await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    const body = await response.json();
    setLoading(false);

    if (body.ok) {
      await update({ currentCompanyId: companyId });
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    const response = await fetch(`/api/companies/${companyId}/favorite`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: next }),
    });

    if (!response.ok) {
      setFavorite(!next);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
        aria-pressed={favorite}
      >
        {favorite ? 'お気に入り解除' : 'お気に入り'}
      </button>
      <button
        type="button"
        onClick={openCompany}
        disabled={loading}
        className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {isCurrent ? '表示中' : loading ? '切替中...' : '開く'}
      </button>
    </div>
  );
}
