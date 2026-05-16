import { ImportPreviewClient } from '@/components/imports/ImportPreviewClient';
import { canRunImportPreview } from '@/lib/auth/company-scope';
import { requireUserAndCompany } from '@/lib/auth/session';

export default async function ImportsPage() {
  const context = await requireUserAndCompany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV / Excel取込</h1>
        <p className="text-sm text-slate-500">
          仕訳帳CSV/Excelを解析し、保存前のプレビューと手動マッピングを確認します。
        </p>
      </div>
      <ImportPreviewClient
        canUploadImportPreview={canRunImportPreview(context.role)}
        companyName={context.companyName}
      />
    </div>
  );
}
