'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OfficeSelectForm({
  offices,
  selectedOfficeId,
}: {
  offices: Array<{ id: string; name: string }>;
  selectedOfficeId: string | null;
}) {
  const router = useRouter();
  const [officeId, setOfficeId] = useState(selectedOfficeId ?? offices[0]?.id ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/auth/mf/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeId }),
    });
    const body = await response.json();
    setSaving(false);
    if (!body.ok) {
      setMessage(body.message ?? '保存に失敗しました');
      return;
    }
    router.replace('/settings');
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-md border bg-white p-5">
      <select value={officeId} onChange={(event) => setOfficeId(event.target.value)} className="w-full rounded border px-3 py-2">
        {offices.map((office) => (
          <option key={office.id} value={office.id}>
            {office.name} ({office.id})
          </option>
        ))}
      </select>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={saving || !officeId}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? '保存中...' : 'このofficeを使う'}
      </button>
    </div>
  );
}
