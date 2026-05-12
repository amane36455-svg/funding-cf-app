import { describe, expect, it } from 'vitest';
import { parseMfJournalCsvBuffer, parseMfJournalCsvText } from '@/lib/mf/csv/parser';

describe('MF journal CSV parser', () => {
  it('parses MoneyForward-style journal CSV rows and preserves mappings', () => {
    const csv = [
      '日付,伝票番号,借方勘定科目,借方補助科目,借方部門,借方金額,借方税額,貸方勘定科目,貸方補助科目,貸方部門,貸方金額,貸方税額,摘要',
      '2026/05/01,1001,普通預金,メイン口座,管理部,"110,000",0,売上高,商品売上,営業部,"110,000",10000,"4月売上,入金"',
    ].join('\n');

    const parsed = parseMfJournalCsvText(csv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.journals).toHaveLength(1);
    expect(parsed.accountNames).toEqual(['売上高', '普通預金']);
    expect(parsed.subAccountNames).toEqual(['メイン口座', '商品売上']);
    expect(parsed.departmentNames).toEqual(['営業部', '管理部']);
    expect(parsed.journals[0]).toMatchObject({
      issueDate: '2026-05-01',
      slipNumber: '1001',
      description: '4月売上,入金',
      debit: {
        accountName: '普通預金',
        subAccountName: 'メイン口座',
        departmentName: '管理部',
        amount: 110000,
      },
      credit: {
        accountName: '売上高',
        subAccountName: '商品売上',
        departmentName: '営業部',
        amount: 110000,
        taxAmount: 10000,
      },
    });
  });

  it('detects missing required columns', () => {
    const parsed = parseMfJournalCsvText('日付,摘要\n2026/05/01,不足CSV');

    expect(parsed.journals).toHaveLength(0);
    expect(parsed.errors[0]).toMatchObject({ code: 'CSV_REQUIRED_COLUMNS_MISSING' });
  });

  it('decodes UTF-8 buffers', () => {
    const csv = '日付,借方勘定科目,借方金額,貸方勘定科目,貸方金額\n2026-05-02,現金,1000,売上高,1000';
    const bytes = Buffer.from(csv, 'utf8');
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const parsed = parseMfJournalCsvBuffer(arrayBuffer);

    expect(parsed.encoding).toBe('utf-8');
    expect(parsed.errors).toEqual([]);
    expect(parsed.journals[0].debit.accountName).toBe('現金');
  });
});
