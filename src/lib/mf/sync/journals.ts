import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { MfClient, unwrapList } from '@/lib/mf/client';
import {
  MF_DEFAULT_PER_PAGE,
  MF_PATHS,
  journalRangeQuery,
  officeQuery,
  pagingQuery,
} from '@/lib/mf/endpoints';
import { MFApiError } from '@/lib/mf/errors';
import {
  JournalSchema,
  detailSide,
  journalDescription,
  journalIssueDate,
  journalSlipNumber,
  journalTagNames,
  journalUpdatedAt,
  pickJournalDetails,
  type JournalDetail,
  type JournalsSyncResult,
} from '@/lib/mf/types';

const MAX_PAGES = 200;

export async function syncJournals(args: {
  companyId: string;
  client: MfClient;
  from: string;
  to: string;
}): Promise<JournalsSyncResult> {
  const { companyId, client, from, to } = args;
  const officeId = client.officeId;

  const accountRows = await prisma.mfAccount.findMany({
    where: { companyId },
    select: { id: true, mfAccountId: true },
  });
  const localAccountIdByMfId = new Map(accountRows.map((row) => [row.mfAccountId, row.id]));

  let page = 1;
  let fetched = 0;
  let journalsUpserted = 0;
  let detailsUpserted = 0;
  let detailsSkipped = 0;

  while (page <= MAX_PAGES) {
    const response = await client.request({
      method: 'GET',
      path: MF_PATHS.journals,
      query: {
        ...(officeId ? officeQuery(officeId) : {}),
        ...journalRangeQuery(from, to),
        ...pagingQuery(page),
      },
    });
    const items = unwrapList(response);
    if (items.length === 0) break;

    fetched += items.length;

    for (const raw of items) {
      const parsed = JournalSchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn({ companyId, issues: parsed.error.flatten() }, 'mf journal parse skipped');
        continue;
      }

      const journal = parsed.data;
      const issueDate = parseDate(journalIssueDate(journal));
      if (!issueDate) {
        logger.warn({ companyId, mfJournalId: journal.id }, 'mf journal issue_date invalid');
        continue;
      }

      const details = pickJournalDetails(journal);
      const totalAmount = calculateTotalAmount(details);

      await prisma.$transaction(async (tx) => {
        const savedJournal = await tx.mfJournal.upsert({
          where: {
            companyId_mfJournalId: {
              companyId,
              mfJournalId: journal.id,
            },
          },
          create: {
            companyId,
            mfJournalId: journal.id,
            issueDate,
            slipNumber: journalSlipNumber(journal),
            description: journalDescription(journal),
            tagNames: journalTagNames(journal),
            totalAmount,
            rawJson: raw as object,
            updatedAtMf: parseDate(journalUpdatedAt(journal)),
          },
          update: {
            issueDate,
            slipNumber: journalSlipNumber(journal),
            description: journalDescription(journal),
            tagNames: journalTagNames(journal),
            totalAmount,
            rawJson: raw as object,
            updatedAtMf: parseDate(journalUpdatedAt(journal)),
          },
        });

        journalsUpserted++;

        for (const detail of details) {
          const side = detailSide(detail);
          if (!side) {
            detailsSkipped++;
            continue;
          }

          const localAccountId = detail.account_id
            ? localAccountIdByMfId.get(detail.account_id) ?? null
            : null;

          await tx.mfJournalDetail.upsert({
            where: {
              companyId_mfDetailId: {
                companyId,
                mfDetailId: detail.id,
              },
            },
            create: {
              companyId,
              journalId: savedJournal.id,
              mfDetailId: detail.id,
              side,
              accountId: localAccountId,
              subAccountName: detail.sub_account_name,
              amount: toBigInt(detail.amount),
              taxAmount: detail.tax_amount == null ? null : toBigInt(detail.tax_amount),
              description: detail.description,
              rawJson: detail as unknown as object,
            },
            update: {
              journalId: savedJournal.id,
              side,
              accountId: localAccountId,
              subAccountName: detail.sub_account_name,
              amount: toBigInt(detail.amount),
              taxAmount: detail.tax_amount == null ? null : toBigInt(detail.tax_amount),
              description: detail.description,
              rawJson: detail as unknown as object,
            },
          });

          detailsUpserted++;
        }
      });
    }

    if (items.length < MF_DEFAULT_PER_PAGE) break;
    page++;
  }

  logger.info(
    { companyId, from, to, fetched, journalsUpserted, detailsUpserted, detailsSkipped, page },
    'mf journals synced',
  );

  return {
    fetched,
    journalsUpserted,
    detailsUpserted,
    detailsSkipped,
    pages: page,
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function toBigInt(value: number): bigint {
  return BigInt(Math.trunc(value || 0));
}

function calculateTotalAmount(details: JournalDetail[]): bigint {
  const absSum = details.reduce((sum, detail) => sum + Math.abs(Number(detail.amount) || 0), 0);
  return BigInt(Math.trunc(absSum / 2));
}
