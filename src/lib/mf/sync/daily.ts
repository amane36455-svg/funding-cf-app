import { prisma } from '@/lib/db/prisma';
import { runCompanySync } from '@/lib/mf/sync/runner';

export type DailySyncSummary = {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    companyId: string;
    ok: boolean;
    historyId?: string;
    error?: string;
  }>;
};

export async function runDailySyncForConnectedCompanies(): Promise<DailySyncSummary> {
  const connections = await prisma.mfConnection.findMany({
    where: {
      mfOfficeId: { not: null },
    },
    select: {
      companyId: true,
    },
  });

  const results: DailySyncSummary['results'] = [];

  for (const connection of connections) {
    try {
      const result = await runCompanySync(connection.companyId, 'daily');
      results.push({
        companyId: connection.companyId,
        ok: true,
        historyId: result.historyId,
      });
    } catch (error) {
      results.push({
        companyId: connection.companyId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: connections.length,
    success: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}
