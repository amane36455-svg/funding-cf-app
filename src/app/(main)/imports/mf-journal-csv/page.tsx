import { MfJournalCsvImportForm } from '@/components/journals/MfJournalCsvImportForm';
import { requireUserAndCompany } from '@/lib/auth/session';

export default async function MfJournalCsvImportPage() {
  const context = await requireUserAndCompany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MF仕訳帳CSV取込</h1>
        <p className="text-sm text-slate-500">
          {context.companyName} のcompanyIdスコープでCSVをプレビューし、確認後に取込します。
        </p>
      </div>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        CSV取込は仕訳候補の登録までです。自動仕訳確定、税務判断の断定、AIによる自動確定は行いません。
      </section>

      <MfJournalCsvImportForm />
    </div>
  );
}
