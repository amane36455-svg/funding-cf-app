import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUserAndCompany } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { DocumentEditor } from '@/components/documents/DocumentEditor';

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const context = await requireUserAndCompany();
  const document = await prisma.generatedDocument.findFirst({
    where: {
      id: params.id,
      companyId: context.companyId,
    },
  });

  if (!document) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">生成結果の確認・編集</h1>
          <p className="text-sm text-slate-500">
            {document.kind} / {document.status} / {document.updatedAt.toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/pdf/${document.id}`} target="_blank" className="rounded border px-3 py-2 text-sm">
            PDF出力
          </Link>
          <Link href="/documents/new" className="rounded border px-3 py-2 text-sm">
            新規作成
          </Link>
        </div>
      </div>
      <DocumentEditor id={document.id} initialBody={document.bodyMarkdown} />
    </div>
  );
}
