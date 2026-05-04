'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: String(formData.get('name') ?? ''),
      }),
    });
    const body = await response.json();
    if (!body.ok) {
      setError(body.message ?? 'サインアップに失敗しました');
      setLoading(false);
      return;
    }

    await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    router.replace('/onboarding');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6">
        <h1 className="text-xl font-bold">アカウント作成</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <input name="name" placeholder="名前" className="w-full rounded border px-3 py-2" />
        <input name="email" type="email" required placeholder="メールアドレス" className="w-full rounded border px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="パスワード(8文字以上)" className="w-full rounded border px-3 py-2" />
        <button disabled={loading} className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50">
          {loading ? '作成中...' : '作成'}
        </button>
        <p className="text-center text-sm">
          登録済みの場合は <Link href="/login" className="underline">ログイン</Link>
        </p>
      </form>
    </div>
  );
}
