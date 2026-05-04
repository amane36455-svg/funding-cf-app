import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const memberships = await prisma.userCompany.findMany({
    where: { userId: session.user.id },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return ok({
    companies: memberships.map((membership) => ({
      id: membership.companyId,
      name: membership.company.name,
      role: membership.role,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return fail('INVALID_COMPANY', '会社名を入力してください', 400);

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name: body.name!,
        ownerUserId: session.user.id,
      },
    });
    await tx.userCompany.create({
      data: {
        userId: session.user.id,
        companyId: created.id,
        role: 'OWNER',
      },
    });
    return created;
  });

  return ok({ company }, 201);
}
