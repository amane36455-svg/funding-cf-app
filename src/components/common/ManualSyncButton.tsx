'use client';

import { useState } from 'react';

export function ManualSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function runSync() {
    setLoading(true);
    setResult(null);
    const response = await fetch('/api/sync/manual', { method: 'POST' });
    const body = await response.json();
    setResult(body);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={runSync}
        disabled={loading}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? '同期中...' : '手動同期を実行'}
      </button>
      {result ? (
        <pre className="max-h-80 overflow-auto rounded bg-slate-100 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
