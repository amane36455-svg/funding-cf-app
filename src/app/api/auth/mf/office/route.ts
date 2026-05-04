import { prisma } from '@/lib/db/prisma';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/apiResponse';
import { decryptToken } from '@/lib/crypto/token';
import { fetchOfficesWithAccessToken } from '@/lib/mf/oauth';

export async function GET() {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const connection = await prisma.mfConnection.findUnique({
    where: { companyId: context.companyId },
  });
  if (!connection) return fail('MF_NOT_CONNECTED', 'MF連携が必要です', 400);

  const offices = await fetchOfficesWithAccessToken(decryptToken(Buffer.from(connection.accessTokenEnc)));
  return ok({ offices, selectedOfficeId: connection.mfOfficeId });
}

export async function POST(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);

  const body = (await request.json().catch(() => null)) as { officeId?: string } | null;
  if (!body?.officeId) return fail('INVALID_OFFICE', 'officeId を選択してください', 400);

  await prisma.mfConnection.update({
    where: { companyId: context.companyId },
    data: { mfOfficeId: body.officeId },
  });

  return ok({ officeId: body.officeId });
}
