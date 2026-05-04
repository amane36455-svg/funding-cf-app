import { prisma } from '@/lib/db/prisma';
import { serializeError } from '@/lib/mf/errors';

export type SyncKind = 'initial' | 'daily' | 'manual';

export async function startHistory(companyId: string, kind: SyncKind) {
  return prisma.mfSyncHistory.create({
    data: {
      companyId,
      kind,
      status: 'running',
    },
  });
}

export async function finishHistorySuccess(
  id: string,
  data: {
    journalsUpserted: number;
    detailsUpserted: number;
    targetRangeFrom?: Date | null;
    targetRangeTo?: Date | null;
  },
) {
  return prisma.mfSyncHistory.update({
    where: { id },
    data: {
      status: 'success',
      finishedAt: new Date(),
      journalsUpserted: data.journalsUpserted,
      detailsUpserted: data.detailsUpserted,
      targetRangeFrom: data.targetRangeFrom ?? null,
      targetRangeTo: data.targetRangeTo ?? null,
    },
  });
}

export async function finishHistoryFailed(id: string, error: unknown) {
  return prisma.mfSyncHistory.update({
    where: { id },
    data: {
      status: 'failed',
      finishedAt: new Date(),
      errorJson: serializeError(error),
    },
  });
}
