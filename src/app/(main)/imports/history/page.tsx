import Link from 'next/link';

import { ImportHistoryClient } from '@/components/imports/ImportHistoryClient';
import { requireUserAndCompany } from '@/lib/auth/session';

export default async function ImportHistoryPage() {
  await requireUserAndCompany();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import history</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review saved import draft batches. Cancel and confirm actions are planned for separate PRs.
          </p>
        </div>
        <Link href="/imports" className="rounded border bg-white px-4 py-2 text-sm font-medium">
          Back to upload
        </Link>
      </div>

      <ImportHistoryClient />
    </div>
  );
}
