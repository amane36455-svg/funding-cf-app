import { prisma } from '@/lib/db/prisma';
import {
  CsvImportError,
  MF_JOURNAL_CSV_LIMITS,
  parseMfJournalCsvBuffer,
  shortHash,
  type ParsedCsvJournal,
} from '@/lib/mf/csv/parser';

export type MfJournalCsvPreviewRow = {
  rowNumber: number;
  issueDate: string;
  slipNumber: string | null;
  debitAccountName: string;
  debitSubAccountName: string | null;
  creditAccountName: string;
  creditSubAccountName: string | null;
  amount: number;
  departments: string[];
  description: string | null;
};

export type MfJournalCsvImportPreview = {
  encoding: 'utf-8' | 'shift_jis';
  totalRows: number;
  validRows: number;
  previewLimit: number;
  errors: Array<{ rowNumber?: number; code: string; message: string }>;
  warnings: Array<{ rowNumber?: number; code: string; message: string }>;
  accounts: {
    total: number;
    matched: string[];
    missing: string[];
  };
  subAccountNames: string[];
  departmentNames: string[];
  previewRows: MfJournalCsvPreviewRow[];
  policy: {
    autoConfirm: false;
    humanReviewRequired: true;
  };
};

export type MfJournalCsvImportResult = MfJournalCsvImportPreview & {
  imported: true;
  journalsUpserted: number;
  detailsUpserted: number;
  accountsCreated: number;
  accountsMatched: number;
};

export async function previewMfJournalCsvImport(args: {
  companyId: string;
  buffer: ArrayBuffer;
}): Promise<MfJournalCsvImportPreview> {
  const parsed = parseMfJournalCsvBuffer(args.buffer);
  const accountMapping = await loadAccountMapping(args.companyId, parsed.accountNames);

  return {
    encoding: parsed.encoding,
    totalRows: parsed.totalRows,
    validRows: parsed.journals.length,
    previewLimit: MF_JOURNAL_CSV_LIMITS.previewRows,
    errors: parsed.errors,
    warnings: parsed.warnings,
    accounts: {
      total: parsed.accountNames.length,
      matched: accountMapping.matched,
      missing: accountMapping.missing,
    },
    subAccountNames: parsed.subAccountNames,
    departmentNames: parsed.departmentNames,
    previewRows: parsed.journals.slice(0, MF_JOURNAL_CSV_LIMITS.previewRows).map(toPreviewRow),
    policy: {
      autoConfirm: false,
      humanReviewRequired: true,
    },
  };
}

export async function importMfJournalCsv(args: {
  companyId: string;
  buffer: ArrayBuffer;
}): Promise<MfJournalCsvImportResult> {
  const parsed = parseMfJournalCsvBuffer(args.buffer);
  const accountMapping = await loadAccountMapping(args.companyId, parsed.accountNames);

  if (parsed.errors.length > 0) {
    throw new CsvImportError('CSV_IMPORT_BLOCKED', 'CSVにエラーがあるため取込できません', 400, {
      errors: parsed.errors,
      warnings: parsed.warnings,
    });
  }
  if (parsed.journals.length === 0) {
    throw new CsvImportError('CSV_NO_VALID_ROWS', '取込可能な仕訳行がありません');
  }

  const ensuredAccounts = await ensureCsvAccounts(args.companyId, parsed.accountNames, accountMapping.byName);
  let journalsUpserted = 0;
  let detailsUpserted = 0;

  for (const journal of parsed.journals) {
    await prisma.$transaction(async (tx) => {
      const savedJournal = await tx.mfJournal.upsert({
        where: {
          companyId_mfJournalId: {
            companyId: args.companyId,
            mfJournalId: journal.mfJournalId,
          },
        },
        create: {
          companyId: args.companyId,
          mfJournalId: journal.mfJournalId,
          issueDate: new Date(`${journal.issueDate}T00:00:00.000Z`),
          slipNumber: journal.slipNumber,
          description: journal.description,
          tagNames: journal.departments,
          totalAmount: BigInt(Math.trunc(Math.max(journal.debit.amount, journal.credit.amount))),
          rawJson: journalRawJson(journal),
          updatedAtMf: null,
        },
        update: {
          issueDate: new Date(`${journal.issueDate}T00:00:00.000Z`),
          slipNumber: journal.slipNumber,
          description: journal.description,
          tagNames: journal.departments,
          totalAmount: BigInt(Math.trunc(Math.max(journal.debit.amount, journal.credit.amount))),
          rawJson: journalRawJson(journal),
          updatedAtMf: null,
        },
      });

      journalsUpserted++;

      const sides = [
        { side: 'debit' as const, detail: journal.debit },
        { side: 'credit' as const, detail: journal.credit },
      ];

      for (const item of sides) {
        const account = ensuredAccounts.byName.get(item.detail.accountName);
        await tx.mfJournalDetail.upsert({
          where: {
            companyId_mfDetailId: {
              companyId: args.companyId,
              mfDetailId: `${journal.mfJournalId}:${item.side}`,
            },
          },
          create: {
            companyId: args.companyId,
            journalId: savedJournal.id,
            mfDetailId: `${journal.mfJournalId}:${item.side}`,
            side: item.side,
            accountId: account?.id ?? null,
            subAccountName: item.detail.subAccountName,
            amount: BigInt(Math.trunc(item.detail.amount)),
            taxAmount: item.detail.taxAmount == null ? null : BigInt(Math.trunc(item.detail.taxAmount)),
            description: journal.description,
            rawJson: detailRawJson(journal, item.side),
          },
          update: {
            journalId: savedJournal.id,
            side: item.side,
            accountId: account?.id ?? null,
            subAccountName: item.detail.subAccountName,
            amount: BigInt(Math.trunc(item.detail.amount)),
            taxAmount: item.detail.taxAmount == null ? null : BigInt(Math.trunc(item.detail.taxAmount)),
            description: journal.description,
            rawJson: detailRawJson(journal, item.side),
          },
        });

        detailsUpserted++;
      }
    });
  }

  return {
    ...(await previewMfJournalCsvImport(args)),
    imported: true,
    journalsUpserted,
    detailsUpserted,
    accountsCreated: ensuredAccounts.created,
    accountsMatched: ensuredAccounts.matched,
  };
}

async function loadAccountMapping(companyId: string, accountNames: string[]) {
  const existing = await prisma.mfAccount.findMany({
    where: {
      companyId,
      name: { in: accountNames },
    },
    select: { id: true, name: true, mfAccountId: true },
  });

  const byName = new Map(existing.map((account) => [account.name, account]));
  const matched = accountNames.filter((name) => byName.has(name));
  const missing = accountNames.filter((name) => !byName.has(name));

  return { byName, matched, missing };
}

async function ensureCsvAccounts(
  companyId: string,
  accountNames: string[],
  existingByName: Map<string, { id: string; name: string; mfAccountId: string }>,
) {
  const byName = new Map(existingByName);
  let created = 0;
  let matched = existingByName.size;

  for (const accountName of accountNames) {
    if (byName.has(accountName)) continue;

    const account = await prisma.mfAccount.upsert({
      where: {
        companyId_mfAccountId: {
          companyId,
          mfAccountId: csvAccountId(accountName),
        },
      },
      create: {
        companyId,
        mfAccountId: csvAccountId(accountName),
        name: accountName,
        category: null,
        subCategory: null,
        excise: null,
        rawJson: { source: 'mf_journal_csv', accountName },
        updatedAtMf: null,
      },
      update: {
        name: accountName,
        rawJson: { source: 'mf_journal_csv', accountName },
      },
      select: { id: true, name: true, mfAccountId: true },
    });

    byName.set(accountName, account);
    created++;
  }

  return { byName, created, matched };
}

function csvAccountId(accountName: string): string {
  return `csv:account:${shortHash(accountName)}`;
}

function toPreviewRow(journal: ParsedCsvJournal): MfJournalCsvPreviewRow {
  return {
    rowNumber: journal.rowNumber,
    issueDate: journal.issueDate,
    slipNumber: journal.slipNumber,
    debitAccountName: journal.debit.accountName,
    debitSubAccountName: journal.debit.subAccountName,
    creditAccountName: journal.credit.accountName,
    creditSubAccountName: journal.credit.subAccountName,
    amount: Math.max(journal.debit.amount, journal.credit.amount),
    departments: journal.departments,
    description: journal.description,
  };
}

function journalRawJson(journal: ParsedCsvJournal) {
  return {
    source: 'mf_journal_csv',
    rowNumber: journal.rowNumber,
    rawRecord: journal.rawRecord,
    departments: journal.departments,
    policy: {
      autoConfirm: false,
      humanReviewRequired: true,
    },
  };
}

function detailRawJson(journal: ParsedCsvJournal, side: 'debit' | 'credit') {
  const detail = side === 'debit' ? journal.debit : journal.credit;
  return {
    source: 'mf_journal_csv',
    rowNumber: journal.rowNumber,
    side,
    accountName: detail.accountName,
    subAccountName: detail.subAccountName,
    departmentName: detail.departmentName,
    rawRecord: journal.rawRecord,
    policy: {
      autoConfirm: false,
      humanReviewRequired: true,
    },
  };
}
