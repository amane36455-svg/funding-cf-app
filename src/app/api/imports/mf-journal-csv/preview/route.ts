import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { CsvImportError } from '@/lib/mf/csv/parser';
import { previewMfJournalCsvImport } from '@/lib/mf/csv/importer';
import { fail, ok } from '@/lib/http/apiResponse';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const file = await readCsvFile(request);
  if (!file) return fail('CSV_FILE_REQUIRED', 'CSVファイルを選択してください', 400);

  try {
    const preview = await previewMfJournalCsvImport({
      companyId: context.companyId,
      buffer: await file.arrayBuffer(),
    });
    return ok(preview);
  } catch (error) {
    return handleImportError(error);
  }
}

async function readCsvFile(request: Request): Promise<File | null> {
  const formData = await request.formData().catch(() => null);
  const upload = formData?.get('file');
  if (!upload || typeof upload === 'string' || typeof upload.arrayBuffer !== 'function') return null;
  return upload as File;
}

function handleImportError(error: unknown) {
  if (error instanceof CsvImportError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  return fail('CSV_PREVIEW_FAILED', 'CSVプレビューに失敗しました', 500);
}
