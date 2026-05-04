import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { classifyCompanyDetails } from '@/lib/cf/classifier';
import { MfClient } from '@/lib/mf/client';
import type { ManualSyncResult } from '@/lib/mf/types';
import { syncAccounts } from '@/lib/mf/sync/accounts';
import { syncJournals } from '@/lib/mf/sync/journals';
import {
  finishHistoryFailed,
  finishHistorySuccess,
  startHistory,
  type SyncKind,
} from '@/lib/mf/sync/history';
import { getCurrentAndPreviousMonthRange } from '@/lib/mf/sync/range';

export async function runCompanySync(
  companyId: string,
  kind: SyncKind = 'manual',
): Promise<ManualSyncResult> {
  const history = await startHistory(companyId, kind);
  logger.info({ companyId, historyId: history.id, kind }, 'mf sync started');

  try {
    const client = await MfClient.fromCompany(companyId);
    const range = getCurrentAndPreviousMonthRange();

    const accounts = await syncAccounts({ companyId, client });
    const journals = await syncJournals({
      companyId,
      client,
      from: range.from,
      to: range.to,
    });
    const classification = await classifyCompanyDetails({
      companyId,
      from: range.from,
      to: range.to,
    });

    await finishHistorySuccess(history.id, {
      journalsUpserted: journals.journalsUpserted,
      detailsUpserted: journals.detailsUpserted,
      targetRangeFrom: new Date(`${range.from}T00:00:00.000Z`),
      targetRangeTo: new Date(`${range.to}T00:00:00.000Z`),
    });

    await prisma.mfConnection.update({
      where: { companyId },
      data: { lastSyncedAt: new Date() },
    });

    return {
      historyId: history.id,
      accounts,
      journals,
      classification,
      rangeFrom: range.from,
      rangeTo: range.to,
    };
  } catch (error) {
    logger.error({ companyId, historyId: history.id, kind, error }, 'mf sync failed');
    await finishHistoryFailed(history.id, error);
    throw error;
  }
}

export async function runManualSync(companyId: string): Promise<ManualSyncResult> {
  return runCompanySync(companyId, 'manual');
}

export { getCurrentAndPreviousMonthRange };
