'use client';

import { useState } from 'react';

export function DocumentEditor({ id, initialBody }: { id: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(status: 'draft' | 'finalized') {
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyMarkdown: body, status }),
    });
    const result = await response.json();
    setSaving(false);
    setMessage(result.ok ? '保存しました' : result.message ?? '保存に失敗しました');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-md border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">編集</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              下書き保存
            </button>
            <button
              type="button"
              onClick={() => save('finalized')}
              disabled={saving}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              確定保存
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-4 min-h-[720px] w-full rounded border px-3 py-2 font-mono text-sm"
        />
      </section>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-semibold">プレビュー</h2>
        <pre className="mt-4 min-h-[720px] whitespace-pre-wrap rounded bg-slate-50 p-4 text-sm">
          {body}
        </pre>
      </section>
    </div>
  );
}
