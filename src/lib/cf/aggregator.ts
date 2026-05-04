import { prisma } from '@/lib/db/prisma';

export type MonthlyCfSummary = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  reviewCount: number;
  groups: Array<{
    cfGroup: string;
    cfCategory: string;
    amount: number;
    count: number;
  }>;
};

export async function getMonthlyCfSummary(args: {
  companyId: string;
  year: number;
  month: number;
  scope?: 'corporate' | 'personal' | 'all';
}): Promise<MonthlyCfSummary> {
  const { companyId, year, month, scope = 'all' } = args;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const rows = await prisma.cfClassificationResult.findMany({
    where: {
      companyId,
      ...(scope === 'corporate' ? { isPersonal: false } : {}),
      ...(scope === 'personal' ? { isPersonal: true } : {}),
      journalDetail: {
        journal: {
          issueDate: {
            gte: start,
            lte: end,
          },
        },
      },
    },
    include: {
      journalDetail: {
        select: {
          amount: true,
          side: true,
        },
      },
    },
  });

  const bucket = new Map<string, { cfGroup: string; cfCategory: string; amount: number; count: number }>();
  let incomeTotal = 0;
  let expenseTotal = 0;
  let reviewCount = 0;

  for (const row of rows) {
    const amount = Number(row.journalDetail.amount);
    const signed = isIncomeCategory(row.cfCategory) ? amount : -amount;
    if (signed >= 0) incomeTotal += signed;
    else expenseTotal += Math.abs(signed);
    if (row.needsReview) reviewCount++;

    const key = `${row.cfGroup}::${row.cfCategory}`;
    const current = bucket.get(key) ?? {
      cfGroup: row.cfGroup,
      cfCategory: row.cfCategory,
      amount: 0,
      count: 0,
    };
    current.amount += signed;
    current.count += 1;
    bucket.set(key, current);
  }

  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    reviewCount,
    groups: [...bucket.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  };
}

function isIncomeCategory(category: string): boolean {
  return ['入金', '収入', '売上', '資金投入'].some((keyword) => category.includes(keyword));
}
