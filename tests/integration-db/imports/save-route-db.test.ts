import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { AppRole } from '@/lib/auth/company-scope';
import { prisma, seedTwoCompanyFixture } from '../helpers/fixtures';

const authMock = vi.hoisted(() => ({
  getUserAndCompanyForApi: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => authMock);

describe('POST /api/imports/save real DB boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 without a server-side user/company context', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(null);
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(createCsvSaveRequest({ spoofedCompanyId: randomUUID() }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(serialized).not.toContain('companyId');
  });

  it.each(['VIEWER', 'REVIEWER'] as const)('returns 403 for %s before reading upload data', async (role) => {
    const formData = vi.fn();
    authMock.getUserAndCompanyForApi.mockResolvedValue(createContext({ role }));
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST({ formData } as unknown as Request);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(formData).not.toHaveBeenCalled();
    expect(serialized).not.toContain(role);
    expect(serialized).not.toContain('company-a');
    expect(serialized).not.toContain('user-a');
  });

  it.each(['OWNER', 'ADMIN', 'STAFF', 'MEMBER'] as const)('allows %s to save ready rows', async (role) => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    await prisma.userCompany.update({
      where: { userId_companyId: { userId: userA.id, companyId: companyA.id } },
      data: { role },
    });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role, userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(createCsvSaveRequest());
    const body = await response.json();

    const savedEntries = await prisma.journalEntry.count({ where: { companyId: companyA.id } });
    const savedLines = await prisma.journalEntryLine.count({ where: { companyId: companyA.id } });

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.savedRows).toBe(1);
    expect(savedEntries).toBe(1);
    expect(savedLines).toBe(2);
  });

  it('ignores client-submitted companyId and saves only to the server-side current company', async () => {
    const { companyA, companyB, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(createCsvSaveRequest({ spoofedCompanyId: companyB.id }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    const companyABatches = await prisma.importBatch.count({ where: { companyId: companyA.id } });
    const companyBBatches = await prisma.importBatch.count({ where: { companyId: companyB.id } });
    const companyBEntries = await prisma.journalEntry.count({ where: { companyId: companyB.id } });

    expect(response.status).toBe(200);
    expect(companyABatches).toBe(1);
    expect(companyBBatches).toBe(0);
    expect(companyBEntries).toBe(0);
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(companyB.id);
    expect(serialized).not.toContain(userA.id);
    expect(serialized).not.toContain('OWNER');
    expect(serialized).not.toContain('cash');
    expect(serialized).not.toContain('sales');
  });

  it('does not save needs_review rows', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(
      createCsvSaveRequest({
        csv: [
          'date,debit,credit,amount,description',
          '2026/05/01,cash,sales,1000,ready row',
          'invalid,cash,sales,2000,invalid date',
          '2026/05/03,cash,sales,-1,negative amount',
        ].join('\n'),
      }),
    );
    const body = await response.json();

    const batch = await prisma.importBatch.findFirstOrThrow({ where: { companyId: companyA.id } });
    const entries = await prisma.journalEntry.findMany({ where: { companyId: companyA.id } });

    expect(response.status).toBe(200);
    expect(body.data.savedRows).toBe(1);
    expect(body.data.needsReviewRows).toBe(2);
    expect(batch.readyRowCount).toBe(1);
    expect(batch.needsReviewRowCount).toBe(2);
    expect(batch.skippedRowCount).toBe(2);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceRowNumber).toBe(2);
  });

  it('returns 422 and creates no rows when there are no ready rows', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(
      createCsvSaveRequest({
        csv: ['date,debit,credit,amount', 'invalid,cash,sales,1000'].join('\n'),
      }),
    );
    const body = await response.json();

    const files = await prisma.importedFile.count({ where: { companyId: companyA.id } });
    const batches = await prisma.importBatch.count({ where: { companyId: companyA.id } });
    const entries = await prisma.journalEntry.count({ where: { companyId: companyA.id } });

    expect(response.status).toBe(422);
    expect(body.code).toBe('IMPORT_SAVE_NO_READY_ROWS');
    expect(files).toBe(0);
    expect(batches).toBe(0);
    expect(entries).toBe(0);
  });

  it('rolls back the transaction when persistence fails', async () => {
    const { companyA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: randomUUID() }),
    );
    const { POST } = await import('@/app/api/imports/save/route');

    const response = await POST(createCsvSaveRequest());
    const body = await response.json();

    const files = await prisma.importedFile.count({ where: { companyId: companyA.id } });
    const batches = await prisma.importBatch.count({ where: { companyId: companyA.id } });
    const entries = await prisma.journalEntry.count({ where: { companyId: companyA.id } });

    expect(response.status).toBe(500);
    expect(body.code).toBe('IMPORT_SAVE_FAILED');
    expect(files).toBe(0);
    expect(batches).toBe(0);
    expect(entries).toBe(0);
  });
});

function createCsvSaveRequest(args: { csv?: string; spoofedCompanyId?: string } = {}): Request {
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([args.csv ?? 'date,debit,credit,amount,description\n2026/05/01,cash,sales,1000,ready row\n'], {
      type: 'text/csv',
    }),
    'journal.csv',
  );
  formData.append(
    'mapping',
    JSON.stringify({
      tradeDate: 0,
      debitAccount: 1,
      creditAccount: 2,
      amount: 3,
      description: 4,
    }),
  );
  if (args.spoofedCompanyId) {
    formData.append('companyId', args.spoofedCompanyId);
  }

  return new Request('http://localhost/api/imports/save', {
    method: 'POST',
    body: formData,
  });
}

function createContext(args: { companyId?: string; role: AppRole; userId?: string }) {
  return {
    userId: args.userId ?? 'user-a',
    email: 'user-a@example.test',
    companyId: args.companyId ?? 'company-a',
    companyName: 'Company A',
    role: args.role,
  };
}
