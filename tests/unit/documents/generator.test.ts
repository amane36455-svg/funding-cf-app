import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_API_KEY: undefined,
    ANTHROPIC_MODEL: 'claude-opus-4-7',
  },
}));

describe('generateDraftMarkdown', () => {
  it('uses provided numbers and marks the draft as editable', async () => {
    const { generateDraftMarkdown } = await import('@/lib/documents/generator');
    const markdown = await generateDraftMarkdown({
      inputs: {
        kind: 'bank',
        companyOverview: 'テスト会社',
        loanPurpose: '運転資金',
        requestedAmount: '10,000,000円',
        repaymentPeriod: '5年',
        useOfFunds: '仕入資金',
        notes: '',
      },
      snapshot: {
        generatedAt: '2026-04-30T00:00:00.000Z',
        monthlyCf: {
          incomeTotal: 1200000,
          expenseTotal: 800000,
          netTotal: 400000,
          reviewCount: 2,
          groups: [],
        },
        ideas: [],
      },
    });

    expect(markdown).toContain('銀行向け借入資料');
    expect(markdown).toContain('1,200,000');
    expect(markdown).toContain('要確認');
  });
});
