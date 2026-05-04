import { describe, expect, it } from 'vitest';
import { classifyDetail } from '@/lib/cf/classifier';
import { DEFAULT_CF_RULES } from '@/lib/cf/rules';

describe('classifyDetail', () => {
  it('classifies salary expense as personnel cost', () => {
    const result = classifyDetail(
      {
        id: 'detail-1',
        companyId: 'company-1',
        side: 'debit',
        amount: 100000n,
        subAccountName: null,
        description: null,
        account: { name: '給料手当', category: '費用' },
        journal: { description: null, issueDate: new Date('2026-04-01') },
      },
      DEFAULT_CF_RULES,
    );

    expect(result.cfCategory).toBe('人件費');
    expect(result.cfGroup).toBe('人件費');
    expect(result.needsReview).toBe(false);
  });

  it('marks unknown accounts as review required', () => {
    const result = classifyDetail(
      {
        id: 'detail-2',
        companyId: 'company-1',
        side: 'debit',
        amount: 5000n,
        subAccountName: null,
        description: null,
        account: { name: '不明科目', category: null },
        journal: { description: null, issueDate: new Date('2026-04-01') },
      },
      DEFAULT_CF_RULES,
    );

    expect(result.cfGroup).toBe('要確認');
    expect(result.needsReview).toBe(true);
  });
});
