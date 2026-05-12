import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/apiResponse';
import { importMfJournalCsv } from '@/lib/mf/csv/importer';
import { CsvImportError } from '@/lib/mf/csv/parser';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const formData = await request.formData().catch(() => null);
  const upload = formData?.get('file');
  const confirmed = formData?.get('confirmed') === 'true';

  if (!confirmed) {
    return fail('IMPORT_CONFIRMATION_REQUIRED', '取込前確認に同意してください', 400);
  }
  if (!upload || typeof upload === 'string' || typeof upload.arrayBuffer !== 'function') {
    return fail('CSV_FILE_REQUIRED', 'CSVファイルを選択してください', 400);
  }

  try {
    const result = await importMfJournalCsv({
      companyId: context.companyId,
      buffer: await (upload as File).arrayBuffer(),
    });
    return ok(result);
  } catch (error) {
    if (error instanceof CsvImportError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return fail('CSV_IMPORT_FAILED', 'CSV取込に失敗しました', 500);
  }
}
