import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { roleLabel, userCompanyAccessWhere } from '@/lib/auth/company-scope';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const body = (await request.json().catch(() => null)) as { companyId?: string } | null;
  if (!body?.companyId) return fail('INVALID_COMPANY', 'companyId が必要です', 400);

  const membership = await prisma.userCompany.findUnique({
    where: userCompanyAccessWhere(session.user.id, body.companyId),
    include: { company: { select: { id: true, name: true } } },
  });
  if (!membership) return fail('FORBIDDEN', 'この会社にアクセスできません', 403);

  const now = new Date();
  await prisma.$transaction([
    prisma.userCompany.update({
      where: userCompanyAccessWhere(session.user.id, body.companyId),
      data: { lastAccessedAt: now },
    }),
    prisma.userPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, currentCompanyId: body.companyId },
      update: { currentCompanyId: body.companyId },
    }),
  ]);

  return ok({
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    roleLabel: roleLabel(membership.role),
    lastAccessedAt: now,
  });
}
