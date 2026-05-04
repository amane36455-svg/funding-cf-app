import { z } from 'zod';

const IdSchema = z.union([z.string(), z.number()]).transform(String);

const NullableStringSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value == null || value === '' ? null : value));

const AmountSchema = z.union([
  z.number(),
  z.string().transform((value) => Number(value.replace(/,/g, ''))),
]);

export const OfficeSchema = z
  .object({
    id: IdSchema.optional(),
    code: NullableStringSchema,
    name: z.string(),
  })
  .passthrough()
  .transform((office) => ({
    ...office,
    id: office.id ?? office.code ?? 'default',
  }));
export type Office = z.infer<typeof OfficeSchema>;

export const AccountSchema = z
  .object({
    id: IdSchema,
    name: z.string(),
    category: NullableStringSchema,
    sub_category: NullableStringSchema,
    excise: NullableStringSchema,
    updated_at: NullableStringSchema,
  })
  .passthrough();
export type Account = z.infer<typeof AccountSchema>;

const LegacyJournalDetailSchema = z
  .object({
    id: IdSchema.optional(),
    side: z.string().optional(),
    entry_side: z.string().optional(),
    debit_credit: z.string().optional(),
    account_id: IdSchema.optional(),
    sub_account_name: NullableStringSchema,
    amount: AmountSchema.optional(),
    tax_amount: AmountSchema.nullable().optional(),
    description: NullableStringSchema,
  })
  .passthrough();

const JournalSideSchema = z
  .object({
    value: AmountSchema,
    tax_value: AmountSchema.nullable().optional(),
    account_id: IdSchema.optional(),
    account_name: NullableStringSchema,
    sub_account_name: NullableStringSchema,
  })
  .passthrough();

const JournalBranchSchema = z
  .object({
    remark: NullableStringSchema,
    creditor: JournalSideSchema.optional(),
    debitor: JournalSideSchema.optional(),
  })
  .passthrough();

export type JournalDetail = {
  id: string;
  side: 'debit' | 'credit';
  account_id?: string;
  sub_account_name: string | null;
  amount: number;
  tax_amount?: number | null;
  description: string | null;
};

export const JournalSchema = z
  .object({
    id: IdSchema,
    issue_date: z.string().optional(),
    transaction_date: z.string().optional(),
    slip_number: NullableStringSchema,
    number: z.union([z.string(), z.number()]).optional(),
    description: NullableStringSchema,
    memo: NullableStringSchema,
    updated_at: NullableStringSchema,
    update_time: NullableStringSchema,
    items: z.array(LegacyJournalDetailSchema).optional(),
    details: z.array(LegacyJournalDetailSchema).optional(),
    journal_details: z.array(LegacyJournalDetailSchema).optional(),
    branches: z.array(JournalBranchSchema).optional(),
    tag_names: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough()
  .refine((journal) => journal.issue_date || journal.transaction_date, {
    message: 'journal must include issue_date or transaction_date',
  });
export type Journal = z.infer<typeof JournalSchema>;

export function pickJournalDetails(journal: Journal): JournalDetail[] {
  const legacyDetails = journal.items ?? journal.details ?? journal.journal_details;
  if (legacyDetails) {
    return legacyDetails.flatMap((detail, index) => {
      const side = normalizeSide(detail.side ?? detail.entry_side ?? detail.debit_credit ?? '');
      if (!side || detail.amount == null) return [];
      return [
        {
          id: detail.id ?? `${journal.id}:detail:${index}`,
          side,
          account_id: detail.account_id,
          sub_account_name: detail.sub_account_name,
          amount: detail.amount,
          tax_amount: detail.tax_amount,
          description: detail.description,
        },
      ];
    });
  }

  return (journal.branches ?? []).flatMap((branch, index) => {
    const details: JournalDetail[] = [];
    if (branch.debitor) {
      details.push({
        id: `${journal.id}:branch:${index}:debit`,
        side: 'debit',
        account_id: branch.debitor.account_id,
        sub_account_name: branch.debitor.sub_account_name,
        amount: branch.debitor.value,
        tax_amount: branch.debitor.tax_value,
        description: branch.remark,
      });
    }
    if (branch.creditor) {
      details.push({
        id: `${journal.id}:branch:${index}:credit`,
        side: 'credit',
        account_id: branch.creditor.account_id,
        sub_account_name: branch.creditor.sub_account_name,
        amount: branch.creditor.value,
        tax_amount: branch.creditor.tax_value,
        description: branch.remark,
      });
    }
    return details;
  });
}

export function detailSide(detail: JournalDetail): 'debit' | 'credit' | null {
  return normalizeSide(detail.side);
}

export function journalIssueDate(journal: Journal): string {
  return journal.issue_date ?? journal.transaction_date ?? '';
}

export function journalSlipNumber(journal: Journal): string | null {
  if (journal.slip_number) return journal.slip_number;
  return journal.number == null ? null : String(journal.number);
}

export function journalDescription(journal: Journal): string | null {
  return journal.description ?? journal.memo ?? null;
}

export function journalUpdatedAt(journal: Journal): string | null {
  return journal.updated_at ?? journal.update_time ?? null;
}

export function journalTagNames(journal: Journal): string[] {
  return journal.tag_names ?? journal.tags ?? [];
}

function normalizeSide(value: string): 'debit' | 'credit' | null {
  const normalized = value.toLowerCase();
  if (normalized === 'debit' || normalized === 'dr' || normalized === '借方') return 'debit';
  if (normalized === 'credit' || normalized === 'cr' || normalized === '貸方') return 'credit';
  return null;
}

export type AccountsSyncResult = {
  fetched: number;
  upserted: number;
  skipped: number;
};

export type JournalsSyncResult = {
  fetched: number;
  journalsUpserted: number;
  detailsUpserted: number;
  detailsSkipped: number;
  pages: number;
};

export type ManualSyncResult = {
  historyId: string;
  accounts: AccountsSyncResult;
  journals: JournalsSyncResult;
  classification: {
    classified: number;
    skipped: number;
    needsReview: number;
  };
  rangeFrom: string;
  rangeTo: string;
};
