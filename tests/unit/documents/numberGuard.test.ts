import { describe, expect, it } from 'vitest';
import { findSuspiciousYenAmounts } from '@/lib/documents/numberGuard';

describe('findSuspiciousYenAmounts', () => {
  it('detects yen amounts not present in the snapshot', () => {
    const suspicious = findSuspiciousYenAmounts('売上は1,200,000円、謎の金額は9,999,999円です。', {
      generatedAt: '2026-04-30T00:00:00.000Z',
      monthlyCf: {
        incomeTotal: 1200000,
        expenseTotal: 800000,
        netTotal: 400000,
        reviewCount: 0,
        groups: [],
      },
      ideas: [],
    });

    expect(suspicious).toContain('9,999,999円');
    expect(suspicious).not.toContain('1,200,000円');
  });
});
