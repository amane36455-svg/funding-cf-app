import { describe, expect, it } from 'vitest';
import { AccountSchema, JournalSchema, detailSide, pickJournalDetails } from '@/lib/mf/types';

describe('MF tolerant schemas', () => {
  it('normalizes numeric account id to string', () => {
    const parsed = AccountSchema.parse({
      id: 123,
      name: '売上高',
    });

    expect(parsed.id).toBe('123');
  });

  it('picks journal details from supported fields', () => {
    const parsed = JournalSchema.parse({
      id: 'j1',
      issue_date: '2026-04-30',
      details: [{ id: 'd1', side: 'debit', amount: 1000 }],
    });

    expect(pickJournalDetails(parsed)).toHaveLength(1);
    expect(detailSide(pickJournalDetails(parsed)[0])).toBe('debit');
  });

  it('normalizes official v3 journal branches into debit and credit details', () => {
    const parsed = JournalSchema.parse({
      id: 'j-official-1',
      transaction_date: '2026-04-30',
      number: 42,
      memo: '売上入金',
      branches: [
        {
          remark: '4月売上',
          debitor: {
            value: 110000,
            tax_value: 0,
            account_id: 'account-cash',
            sub_account_name: '普通預金',
          },
          creditor: {
            value: 110000,
            tax_value: 10000,
            account_id: 'account-sales',
          },
        },
      ],
    });

    const details = pickJournalDetails(parsed);

    expect(details).toEqual([
      {
        id: 'j-official-1:branch:0:debit',
        side: 'debit',
        account_id: 'account-cash',
        sub_account_name: '普通預金',
        amount: 110000,
        tax_amount: 0,
        description: '4月売上',
      },
      {
        id: 'j-official-1:branch:0:credit',
        side: 'credit',
        account_id: 'account-sales',
        sub_account_name: null,
        amount: 110000,
        tax_amount: 10000,
        description: '4月売上',
      },
    ]);
  });
});
