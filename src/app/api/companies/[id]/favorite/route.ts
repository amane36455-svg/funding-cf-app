import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const body = (await request.json().catch(() => null)) as { isFavorite?: boolean } | null;
  if (typeof body?.isFavorite !== 'boolean') {
    return fail('INVALID_FAVORITE', 'isFavorite を true / false で指定してください', 400);
  }

  const result = await prisma.userCompany.updateMany({
    where: {
      userId: session.user.id,
      companyId: params.id,
    },
    data: { isFavorite: body.isFavorite },
  });

  if (result.count === 0) {
    return fail('COMPANY_NOT_FOUND', 'この会社にアクセスできません', 404);
  }

  return ok({ companyId: params.id, isFavorite: body.isFavorite });
}
