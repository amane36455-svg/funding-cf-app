import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportBatchStatus } from '@prisma/client';
import type { AppRole } from '@/lib/auth/company-scope';
import { prisma, seedTwoCompanyFixture } from '../helpers/fixtures';

const authMock = vi.hoisted(() => ({
  getUserAndCompanyForApi: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => authMock);

describe('GET /api/imports/batches real DB boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 without a server-side user/company context', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(null);
    const { GET } = await import('@/app/api/imports/batches/route');

    const response = await GET(createBatchesRequest());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(serialized).not.toContain('companyId');
  });

  it.each(['OWNER', 'ADMIN', 'STAFF', 'MEMBER', 'REVIEWER', 'VIEWER'] as const)(
    'allows %s to view import history',
    async (role) => {
      const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
      await prisma.userCompany.update({
        where: { userId_companyId: { userId: userA.id, companyId: companyA.id } },
        data: { role },
      });
      await seedImportBatch({
        companyId: companyA.id,
        userId: userA.id,
        status: 'DRAFT',
        createdAt: new Date(Date.UTC(2026, 4, 1)),
      });
      authMock.getUserAndCompanyForApi.mockResolvedValue(
        createContext({ companyId: companyA.id, role, userId: userA.id }),
      );
      const { GET } = await import('@/app/api/imports/batches/route');

      const response = await GET(createBatchesRequest());
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(200);
      expect(body.data.batches).toHaveLength(1);
      expect(serialized).not.toContain(companyA.id);
      expect(serialized).not.toContain(userA.id);
      expect(serialized).not.toContain(role);
      expect(serialized).not.toContain('journal.csv');
      expect(serialized).not.toContain('ready row');
    },
  );

  it('returns only the current company batches and ignores client-submitted companyId', async () => {
    const { companyA, companyB, userA, userB } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const companyABatch = await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 1)),
    });
    await seedImportBatch({
      companyId: companyB.id,
      userId: userB.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 2)),
    });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { GET } = await import('@/app/api/imports/batches/route');

    const response = await GET(createBatchesRequest({ companyId: companyB.id }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.batches).toHaveLength(1);
    expect(body.data.batches[0].id).toBe(companyABatch.id);
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(companyB.id);
    expect(serialized).not.toContain(userA.id);
    expect(serialized).not.toContain(userB.id);
  });

  it('includes cancelled batches in the list but marks them as not confirmable', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const cancelledBatch = await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'CANCELLED',
      createdAt: new Date(Date.UTC(2026, 4, 1)),
    });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { GET } = await import('@/app/api/imports/batches/route');

    const response = await GET(createBatchesRequest({ status: 'CANCELLED' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.batches).toEqual([
      expect.objectContaining({
        id: cancelledBatch.id,
        status: 'CANCELLED',
        canConfirm: false,
      }),
    ]);
  });

  it('filters by status', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const draftBatch = await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 2)),
    });
    await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'CANCELLED',
      createdAt: new Date(Date.UTC(2026, 4, 1)),
    });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { GET } = await import('@/app/api/imports/batches/route');

    const response = await GET(createBatchesRequest({ status: 'DRAFT' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.batches).toHaveLength(1);
    expect(body.data.batches[0]).toEqual(
      expect.objectContaining({
        id: draftBatch.id,
        status: 'DRAFT',
        canConfirm: true,
      }),
    );
  });

  it('paginates results with a capped page size', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const firstBatch = await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 3)),
    });
    const secondBatch = await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 2)),
    });
    await seedImportBatch({
      companyId: companyA.id,
      userId: userA.id,
      status: 'DRAFT',
      createdAt: new Date(Date.UTC(2026, 4, 1)),
    });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { GET } = await import('@/app/api/imports/batches/route');

    const firstResponse = await GET(createBatchesRequest({ page: '1', pageSize: '2' }));
    const firstBody = await firstResponse.json();
    const secondResponse = await GET(createBatchesRequest({ page: '2', pageSize: '2' }));
    const secondBody = await secondResponse.json();
    const cappedResponse = await GET(createBatchesRequest({ page: '1', pageSize: '101' }));
    const cappedBody = await cappedResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.data.batches.map((batch: { id: string }) => batch.id)).toEqual([firstBatch.id, secondBatch.id]);
    expect(firstBody.data.pagination).toEqual({
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(secondResponse.status).toBe(200);
    expect(secondBody.data.batches).toHaveLength(1);
    expect(cappedResponse.status).toBe(200);
    expect(cappedBody.data.pagination.pageSize).toBe(100);
  });

  it('rejects invalid pagination and status query values', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { GET } = await import('@/app/api/imports/batches/route');

    const invalidPage = await GET(createBatchesRequest({ page: '0' }));
    const invalidStatus = await GET(createBatchesRequest({ status: 'CONFIRMED' }));

    expect(invalidPage.status).toBe(400);
    expect((await invalidPage.json()).code).toBe('IMPORT_BATCHES_INVALID_QUERY');
    expect(invalidStatus.status).toBe(400);
    expect((await invalidStatus.json()).code).toBe('IMPORT_BATCHES_INVALID_STATUS');
  });
});

function createBatchesRequest(args: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/imports/batches');
  for (const [key, value] of Object.entries(args)) {
    url.searchParams.set(key, value);
  }

  return new Request(url, { method: 'GET' });
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

async function seedImportBatch(args: {
  companyId: string;
  userId: string;
  status: ImportBatchStatus;
  createdAt: Date;
}) {
  const importedFile = await prisma.importedFile.create({
    data: {
      companyId: args.companyId,
      uploadedByUserId: args.userId,
      originalFilename: 'journal.csv',
      fileKind: 'CSV',
      fileSizeBytes: 128,
      storageRef: null,
      previewSnapshot: {
        headers: ['date', 'debit', 'credit', 'amount', 'description'],
        first5Rows: [['2026/05/01', 'cash', 'sales', '1000', 'ready row']],
        totalRows: 3,
        readyRows: 1,
        skippedRows: 2,
        needsReviewRows: 2,
      },
      createdAt: args.createdAt,
    },
  });

  return prisma.importBatch.create({
    data: {
      companyId: args.companyId,
      importedFileId: importedFile.id,
      createdByUserId: args.userId,
      status: args.status,
      readyRowCount: 1,
      needsReviewRowCount: 2,
      skippedRowCount: 2,
      mappingSnapshot: {
        tradeDate: 0,
        debitAccount: 1,
        creditAccount: 2,
        amount: 3,
        description: 4,
      },
      validationSummary: {
        totalRows: 3,
        savedRows: 1,
        skippedRows: 2,
        needsReviewRows: 2,
      },
      createdAt: args.createdAt,
    },
  });
}
