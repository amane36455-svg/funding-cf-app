import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const body = (await request.json().catch(() => null)) as { companyId?: string } | null;
  if (!body?.companyId) return fail('INVALID_COMPANY', 'companyId が必要です', 400);

  const membership = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: body.companyId,
      },
    },
  });
  if (!membership) return fail('FORBIDDEN', 'この会社にアクセスできません', 403);

  return ok({ companyId: membership.companyId, role: membership.role });
}
