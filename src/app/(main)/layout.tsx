import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireUserAndCompany } from '@/lib/auth/session';
import { CompanySwitcher } from '@/components/common/CompanySwitcher';

export default async function MainLayout({ children }: { children: ReactNode }) {
  const context = await requireUserAndCompany();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              資金調達・CF
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard">ダッシュボード</Link>
              <Link href="/journals">仕訳確認</Link>
              <Link href="/imports/mf-journal-csv">CSV取込</Link>
              <Link href="/settings">設定</Link>
              <Link href="/documents/new">資料作成</Link>
            </nav>
          </div>
          <CompanySwitcher currentCompanyId={context.companyId} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
