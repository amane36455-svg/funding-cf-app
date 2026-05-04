import Link from 'next/link';
import { requireUserAndCompany } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export default async function DocumentsPage() {
  const context = await requireUserAndCompany();
  const documents = await prisma.generatedDocument.findMany({
    where: { companyId: context.companyId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">生成済み資料</h1>
          <p className="text-sm text-slate-500">借入資料・稟議書の下書き一覧です。</p>
        </div>
        <Link href="/documents/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          新規作成
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">種別</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2">作成日時</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  まだ資料がありません。
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id} className="border-t">
                  <td className="px-3 py-2">{document.kind}</td>
                  <td className="px-3 py-2">{document.status}</td>
                  <td className="px-3 py-2">{document.createdAt.toLocaleString('ja-JP')}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/documents/${document.id}`} className="underline">
                      開く
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
