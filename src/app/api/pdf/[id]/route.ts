import { prisma } from '@/lib/db/prisma';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail } from '@/lib/http/apiResponse';
import { documentTitle } from '@/lib/documents/ideas';
import { renderPdfBuffer } from '@/lib/pdf/renderer';
import type { DocumentKind } from '@/lib/documents/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  const document = await prisma.generatedDocument.findFirst({
    where: {
      id: params.id,
      companyId: context.companyId,
    },
  });

  if (!document) {
    return fail('DOCUMENT_NOT_FOUND', '資料が見つかりません', 404);
  }

  try {
    const title = documentTitle(document.kind as DocumentKind);
    const pdf = await renderPdfBuffer({
      title,
      markdown: document.bodyMarkdown,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.id}.pdf"`,
      },
    });
  } catch (error) {
    return fail(
      'PDF_RENDER_FAILED',
      'PDF出力に失敗しました。PUPPETEER_EXECUTABLE_PATH を確認してください。',
      500,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
