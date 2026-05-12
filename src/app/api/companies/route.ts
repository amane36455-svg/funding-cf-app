import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { roleLabel } from '@/lib/auth/company-scope';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

const COMPANY_STATUSES = new Set(['active', 'inactive', 'prospect', 'archived']);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const [memberships, preference] = await Promise.all([
    prisma.userCompany.findMany({
      where: { userId: session.user.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyType: true,
            status: true,
            fiscalMonth: true,
            industry: true,
            memo: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { lastAccessedAt: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.userPreference.findUnique({ where: { userId: session.user.id } }),
  ]);

  return ok({
    currentCompanyId: preference?.currentCompanyId ?? session.currentCompanyId ?? null,
    companies: memberships.map((membership) => ({
      id: membership.companyId,
      name: membership.company.name,
      role: membership.role,
      roleLabel: roleLabel(membership.role),
      isFavorite: membership.isFavorite,
      lastAccessedAt: membership.lastAccessedAt,
      companyType: membership.company.companyType,
      status: membership.company.status,
      fiscalMonth: membership.company.fiscalMonth,
      industry: membership.company.industry,
      memo: membership.company.memo,
      updatedAt: membership.company.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'ログインが必要です', 401);

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    companyType?: string | null;
    status?: string | null;
    fiscalMonth?: number | string | null;
    industry?: string | null;
    memo?: string | null;
  } | null;
  const name = body?.name?.trim();
  if (!name) return fail('INVALID_COMPANY', '会社名を入力してください', 400);

  const fiscalMonth = normalizeFiscalMonth(body.fiscalMonth);
  if (fiscalMonth === 'invalid') {
    return fail('INVALID_FISCAL_MONTH', '決算月は1から12で入力してください', 400);
  }

  const status = body.status && COMPANY_STATUSES.has(body.status) ? body.status : 'active';
  const now = new Date();
  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name,
        ownerUserId: session.user.id,
        companyType: normalizeText(body.companyType),
        status,
        fiscalMonth,
        industry: normalizeText(body.industry),
        memo: normalizeText(body.memo),
      },
    });
    await tx.userCompany.create({
      data: {
        userId: session.user.id,
        companyId: created.id,
        role: 'OWNER',
        lastAccessedAt: now,
      },
    });
    await tx.userPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, currentCompanyId: created.id },
      update: { currentCompanyId: created.id },
    });
    return created;
  });

  return ok({ company }, 201);
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeFiscalMonth(value: number | string | null | undefined): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  const month = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) return 'invalid';
  return month;
}
