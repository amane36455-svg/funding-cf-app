import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mfJournalsResponse } from '../../fixtures/mf';

const txMock = vi.hoisted(() => ({
  mfJournal: {
    upsert: vi.fn(),
  },
  mfJournalDetail: {
    upsert: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  mfAccount: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('syncJournals', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.mfAccount.findMany.mockResolvedValue([
      { id: 'account-local-1', mfAccountId: '1' },
      { id: 'account-local-2', mfAccountId: '2' },
    ]);
    txMock.mfJournal.upsert.mockResolvedValue({ id: 'journal-local-1' });
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
  });

  it('upserts journals and details in a transaction', async () => {
    const { syncJournals } = await import('@/lib/mf/sync/journals');
    const client = {
      officeId: 'office-1',
      request: vi.fn().mockResolvedValueOnce(mfJournalsResponse),
    };

    const result = await syncJournals({
      companyId: 'company-1',
      client: client as never,
      from: '2026-03-01',
      to: '2026-04-30',
    });

    expect(result.fetched).toBe(1);
    expect(result.journalsUpserted).toBe(1);
    expect(result.detailsUpserted).toBe(2);
    expect(txMock.mfJournal.upsert).toHaveBeenCalledOnce();
    expect(txMock.mfJournalDetail.upsert).toHaveBeenCalledTimes(2);
  });
});
