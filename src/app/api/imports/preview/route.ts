import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/apiResponse';
import { buildImportPreview } from '@/lib/imports/preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です。', 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!isUploadedFile(file)) {
    return fail('IMPORT_FILE_REQUIRED', 'CSVまたはxlsxファイルを選択してください。', 400);
  }

  const outcome = buildImportPreview({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    buffer: await file.arrayBuffer(),
  });

  if (!outcome.ok) {
    return fail(outcome.code, outcome.message, outcome.status, { issues: outcome.issues });
  }

  return ok(outcome.data);
}

function isUploadedFile(value: FormDataEntryValue | null | undefined): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    'type' in value &&
    typeof value.arrayBuffer === 'function'
  );
}
