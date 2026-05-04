import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { MfClient, unwrapList } from '@/lib/mf/client';
import { MF_PATHS, accountsQuery, officeQuery, shouldPaginateAccounts } from '@/lib/mf/endpoints';
import { AccountSchema, type AccountsSyncResult } from '@/lib/mf/types';

const MAX_PAGES = 50;

export async function syncAccounts(args: {
  companyId: string;
  client: MfClient;
}): Promise<AccountsSyncResult> {
  const { companyId, client } = args;
  const officeId = client.officeId;

  let page = 1;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;

  while (page <= MAX_PAGES) {
    const response = await client.request({
      method: 'GET',
      path: MF_PATHS.accounts,
      query: {
        ...(officeId ? officeQuery(officeId) : {}),
        ...accountsQuery(page),
      },
    });
    const items = unwrapList(response);
    if (items.length === 0) break;

    fetched += items.length;

    for (const item of items) {
      const parsed = AccountSchema.safeParse(item);
      if (!parsed.success) {
        skipped++;
        logger.warn({ companyId, issues: parsed.error.flatten() }, 'mf account parse skipped');
        continue;
      }

      const account = parsed.data;
      await prisma.mfAccount.upsert({
        where: {
          companyId_mfAccountId: {
            companyId,
            mfAccountId: account.id,
          },
        },
        create: {
          companyId,
          mfAccountId: account.id,
          name: account.name,
          category: account.category,
          subCategory: account.sub_category,
          excise: account.excise,
          rawJson: item as object,
          updatedAtMf: parseDate(account.updated_at),
        },
        update: {
          name: account.name,
          category: account.category,
          subCategory: account.sub_category,
          excise: account.excise,
          rawJson: item as object,
          updatedAtMf: parseDate(account.updated_at),
        },
      });

      upserted++;
    }

    if (!shouldPaginateAccounts()) break;
    page++;
  }

  logger.info({ companyId, fetched, upserted, skipped }, 'mf accounts synced');
  return { fetched, upserted, skipped };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}
