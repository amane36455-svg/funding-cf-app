import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mfAccountsResponse } from '../../fixtures/mf';

const prismaMock = vi.hoisted(() => ({
  mfAccount: {
    upsert: vi.fn(),
  },
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

describe('syncAccounts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches accounts and upserts normalized records', async () => {
    const { syncAccounts } = await import('@/lib/mf/sync/accounts');
    const client = {
      officeId: 'office-1',
      request: vi.fn().mockResolvedValueOnce(mfAccountsResponse),
    };

    const result = await syncAccounts({
      companyId: 'company-1',
      client: client as never,
    });

    expect(result).toEqual({ fetched: 3, upserted: 3, skipped: 0 });
    expect(prismaMock.mfAccount.upsert).toHaveBeenCalledTimes(3);
    expect(prismaMock.mfAccount.upsert.mock.calls[0][0]).toMatchObject({
      where: {
        companyId_mfAccountId: {
          companyId: 'company-1',
          mfAccountId: '1',
        },
      },
      create: {
        companyId: 'company-1',
        mfAccountId: '1',
        name: '普通預金',
      },
    });
  });
});
