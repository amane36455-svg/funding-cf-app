import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { AppRole } from '@/lib/auth/company-scope';
import { prisma, seedTwoCompanyFixture } from '../helpers/fixtures';

const authMock = vi.hoisted(() => ({
  getUserAndCompanyForApi: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => authMock);

describe('POST /api/imports/:batchId/cancel real DB boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 without a server-side user/company context', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(null);
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(randomUUID()));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(serialized).not.toContain('companyId');
  });

  it.each(['VIEWER', 'REVIEWER'] as const)('returns 403 for %s before querying batch data', async (role) => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(createContext({ role }));
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(randomUUID()));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(serialized).not.toContain(role);
    expect(serialized).not.toContain('company-a');
    expect(serialized).not.toContain('user-a');
  });

  it.each(['OWNER', 'ADMIN', 'STAFF', 'MEMBER'] as const)('allows %s to cancel a draft batch', async (role) => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role, userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(batch.id));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    const updatedBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { status: 'cancelled' } });
    expect(updatedBatch.status).toBe('CANCELLED');
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(userA.id);
    expect(serialized).not.toContain(role);
    expect(serialized).not.toContain('journal.csv');
    expect(serialized).not.toContain('ready row');
  });

  it('treats an already cancelled batch as an idempotent success', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id, status: 'CANCELLED' });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(batch.id));
    const body = await response.json();

    const updatedBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { status: 'cancelled' } });
    expect(updatedBatch.status).toBe('CANCELLED');
  });

  it('does not cancel non-draft batches', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id, status: 'NEEDS_REVIEW' });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(batch.id));
    const body = await response.json();

    const updatedBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });

    expect(response.status).toBe(409);
    expect(body.code).toBe('IMPORT_CANCEL_NOT_ALLOWED');
    expect(updatedBatch.status).toBe('NEEDS_REVIEW');
  });

  it('returns 404 for another company batch without changing it', async () => {
    const { companyA, companyB, userA, userB } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const companyBBatch = await seedImportDraft({ companyId: companyB.id, userId: userB.id });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(companyBBatch.id));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    const updatedCompanyBBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: companyBBatch.id } });

    expect(response.status).toBe(404);
    expect(body.code).toBe('IMPORT_BATCH_NOT_FOUND');
    expect(updatedCompanyBBatch.status).toBe('DRAFT');
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(companyB.id);
    expect(serialized).not.toContain(userA.id);
    expect(serialized).not.toContain(userB.id);
  });

  it('ignores client-submitted companyId and uses only server-side current company', async () => {
    const { companyA, companyB, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(
      createCancelRequest({ spoofedCompanyId: companyB.id }),
      createRouteContext(batch.id),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    const updatedBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });

    expect(response.status).toBe(200);
    expect(updatedBatch.status).toBe('CANCELLED');
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(companyB.id);
    expect(serialized).not.toContain(userA.id);
  });

  it('keeps entries and lines while leaving journal entries as draft', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    const response = await POST(createCancelRequest(), createRouteContext(batch.id));

    const entries = await prisma.journalEntry.findMany({ where: { importBatchId: batch.id } });
    const lines = await prisma.journalEntryLine.findMany({ where: { journalEntryId: entries[0].id } });

    expect(response.status).toBe(200);
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('DRAFT');
    expect(lines).toHaveLength(2);
  });

  it('rate limits cancel before updating the database', async () => {
    const { companyA, userA } = await prisma.$transaction((tx) => seedTwoCompanyFixture(tx));
    const batch = await seedImportDraft({ companyId: companyA.id, userId: userA.id, status: 'NEEDS_REVIEW' });
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({ companyId: companyA.id, role: 'OWNER', userId: userA.id }),
    );
    const { POST } = await import('@/app/api/imports/[batchId]/cancel/route');

    for (let index = 0; index < 10; index += 1) {
      const response = await POST(createCancelRequest(), createRouteContext(batch.id));
      expect(response.status).toBe(409);
    }

    const response = await POST(createCancelRequest(), createRouteContext(batch.id));
    const body = await response.json();
    const serialized = JSON.stringify(body);
    const unchangedBatch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(body.code).toBe('RATE_LIMITED');
    expect(unchangedBatch.status).toBe('NEEDS_REVIEW');
    expect(serialized).not.toContain(companyA.id);
    expect(serialized).not.toContain(userA.id);
    expect(serialized).not.toContain('OWNER');
    expect(serialized).not.toContain('journal.csv');
    expect(serialized).not.toContain('ready row');
  });
});

function createCancelRequest(args: { spoofedCompanyId?: string } = {}): Request {
  return new Request('http://localhost/api/imports/batch-id/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args.spoofedCompanyId ? { companyId: args.spoofedCompanyId } : {}),
  });
}

function createRouteContext(batchId: string) {
  return { params: { batchId } };
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

async function seedImportDraft(args: {
  companyId: string;
  userId: string;
  status?: 'DRAFT' | 'NEEDS_REVIEW' | 'CANCELLED';
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
        first5Rows: [],
        totalRows: 1,
        readyRows: 1,
        skippedRows: 0,
        needsReviewRows: 0,
      },
    },
  });

  const batch = await prisma.importBatch.create({
    data: {
      companyId: args.companyId,
      importedFileId: importedFile.id,
      createdByUserId: args.userId,
      status: args.status ?? 'DRAFT',
      readyRowCount: 1,
      needsReviewRowCount: 0,
      skippedRowCount: 0,
      mappingSnapshot: {
        tradeDate: 0,
        debitAccount: 1,
        creditAccount: 2,
        amount: 3,
        description: 4,
      },
      validationSummary: {
        totalRows: 1,
        savedRows: 1,
        skippedRows: 0,
        needsReviewRows: 0,
      },
    },
  });

  const entry = await prisma.journalEntry.create({
    data: {
      companyId: args.companyId,
      importBatchId: batch.id,
      sourceRowNumber: 2,
      tradeDate: new Date(Date.UTC(2026, 4, 1)),
      description: 'ready row',
      status: 'DRAFT',
      rawRowSummary: {
        rowNumber: 2,
        rawValues: ['2026/05/01', 'cash', 'sales', '1000', 'ready row'],
      },
    },
  });

  await prisma.journalEntryLine.createMany({
    data: [
      {
        companyId: args.companyId,
        journalEntryId: entry.id,
        lineNo: 1,
        side: 'DEBIT',
        accountName: 'cash',
        amount: '1000',
      },
      {
        companyId: args.companyId,
        journalEntryId: entry.id,
        lineNo: 2,
        side: 'CREDIT',
        accountName: 'sales',
        amount: '1000',
      },
    ],
  });

  return batch;
}
