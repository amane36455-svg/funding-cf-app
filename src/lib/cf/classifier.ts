import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { DEFAULT_CF_RULES, isCashAccountName } from '@/lib/cf/rules';
import type {
  CfClassification,
  CfDirection,
  CfRuleLike,
  ClassificationRunResult,
} from '@/lib/cf/types';

type DetailForClassification = {
  id: string;
  companyId: string;
  side: string;
  amount: bigint;
  subAccountName: string | null;
  description: string | null;
  account: { name: string; category: string | null } | null;
  journal: { description: string | null; issueDate: Date };
};

export async function classifyCompanyDetails(args: {
  companyId: string;
  from?: string;
  to?: string;
}): Promise<ClassificationRunResult> {
  const { companyId, from, to } = args;
  const rules = await loadRules(companyId);
  const details = await prisma.mfJournalDetail.findMany({
    where: {
      companyId,
      ...(from || to
        ? {
            journal: {
              issueDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
              },
            },
          }
        : {}),
    },
    include: {
      account: { select: { name: true, category: true } },
      journal: { select: { description: true, issueDate: true } },
    },
  });

  let classified = 0;
  let skipped = 0;
  let needsReview = 0;

  for (const detail of details) {
    const result = classifyDetail(detail, rules);
    if (result.direction === 'none') {
      skipped++;
      continue;
    }

    await prisma.cfClassificationResult.upsert({
      where: { journalDetailId: detail.id },
      create: {
        companyId,
        journalDetailId: detail.id,
        cfCategory: result.cfCategory,
        cfGroup: result.cfGroup,
        isPersonal: result.isPersonal,
        needsReview: result.needsReview,
        appliedRuleId: result.appliedRuleId,
        reason: result.reason,
      },
      update: {
        cfCategory: result.cfCategory,
        cfGroup: result.cfGroup,
        isPersonal: result.isPersonal,
        needsReview: result.needsReview,
        appliedRuleId: result.appliedRuleId,
        reason: result.reason,
      },
    });

    classified++;
    if (result.needsReview) needsReview++;
  }

  logger.info({ companyId, classified, skipped, needsReview }, 'cf classification completed');
  return { classified, skipped, needsReview };
}

export function classifyDetail(
  detail: DetailForClassification,
  rules: CfRuleLike[],
): CfClassification {
  const accountName = detail.account?.name ?? '';

  if (isCashAccountName(accountName)) {
    return {
      cfCategory: '対象外',
      cfGroup: '対象外',
      isPersonal: false,
      needsReview: false,
      appliedRuleId: null,
      reason: '現預金勘定のため、相手科目側で分類します',
      direction: 'none',
    };
  }

  const matched = rules.find((rule) => matchesRule(rule, detail));
  const direction = inferDirection(detail, matched);

  if (!matched) {
    return {
      cfCategory: direction === 'income' ? 'その他入金' : 'その他支出',
      cfGroup: '要確認',
      isPersonal: false,
      needsReview: true,
      appliedRuleId: null,
      reason: '分類ルールに一致しませんでした',
      direction,
    };
  }

  return {
    cfCategory: normalizeBorrowingCategory(matched.cfCategory, direction),
    cfGroup: matched.cfGroup,
    isPersonal: matched.isPersonal,
    needsReview: shouldReview(detail, matched),
    appliedRuleId: matched.id ?? null,
    reason: `rule:${matched.matchType}:${matched.matchValue}`,
    direction,
  };
}

async function loadRules(companyId: string): Promise<CfRuleLike[]> {
  const dbRules = await prisma.cfClassificationRule.findMany({
    where: {
      enabled: true,
      OR: [{ companyId: null }, { companyId }],
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  if (dbRules.length > 0) return dbRules;
  return DEFAULT_CF_RULES;
}

function matchesRule(rule: CfRuleLike, detail: DetailForClassification): boolean {
  const accountName = detail.account?.name ?? '';
  const subAccountName = detail.subAccountName ?? '';
  const description = [detail.description, detail.journal.description].filter(Boolean).join(' ');

  if (rule.matchType === 'account') {
    return accountName.includes(rule.matchValue);
  }
  if (rule.matchType === 'sub_account') {
    return subAccountName.includes(rule.matchValue);
  }
  if (rule.matchType === 'description_regex') {
    try {
      return new RegExp(rule.matchValue).test(description);
    } catch {
      return false;
    }
  }
  return false;
}

function inferDirection(detail: DetailForClassification, rule?: CfRuleLike): CfDirection {
  const accountCategory = detail.account?.category ?? '';
  if (accountCategory.includes('収益') || accountCategory.includes('売上')) return 'income';
  if (accountCategory.includes('費用') || accountCategory.includes('損失')) return 'expense';

  if (rule?.cfCategory.includes('入金') || rule?.cfCategory.includes('収入')) return 'income';
  if (rule?.cfCategory.includes('返済') || rule?.cfCategory.includes('支払')) return 'expense';

  if (detail.side === 'credit') return 'income';
  if (detail.side === 'debit') return 'expense';
  return 'expense';
}

function normalizeBorrowingCategory(category: string, direction: CfDirection): string {
  if (category !== '借入入金/返済') return category;
  return direction === 'income' ? '借入入金' : '借入返済';
}

function shouldReview(detail: DetailForClassification, rule: CfRuleLike): boolean {
  const accountName = detail.account?.name ?? '';
  if (['雑費', '仮払金', '仮受金', '未確定勘定'].some((keyword) => accountName.includes(keyword))) {
    return true;
  }
  if (rule.cfGroup === '要確認') return true;
  return false;
}
