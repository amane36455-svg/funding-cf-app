'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirect: false,
    });
    setLoading(false);

    if (!result || result.error) {
      setError('メールアドレスまたはパスワードが正しくありません');
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6">
        <h1 className="text-xl font-bold">ログイン</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <input name="email" type="email" required placeholder="メールアドレス" className="w-full rounded border px-3 py-2" />
        <input name="password" type="password" required placeholder="パスワード" className="w-full rounded border px-3 py-2" />
        <button disabled={loading} className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50">
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
        <p className="text-center text-sm">
          未登録の場合は <Link href="/signup" className="underline">サインアップ</Link>
        </p>
      </form>
    </div>
  );
}
