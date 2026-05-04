import './load-env';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateDraftMarkdown } from '../src/lib/documents/generator';
import { createDocumentSnapshot } from '../src/lib/documents/snapshot';
import type { DocumentInputs } from '../src/lib/documents/types';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@example.com';
  const password = 'password123';

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Demo User',
      passwordHash: await bcrypt.hash(password, 10),
    },
    update: {},
  });

  const company = await prisma.company.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'デモ株式会社',
      ownerUserId: user.id,
    },
    update: {
      name: 'デモ株式会社',
      ownerUserId: user.id,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    create: {
      userId: user.id,
      companyId: company.id,
      role: 'OWNER',
    },
    update: {
      role: 'OWNER',
    },
  });

  const bank = await upsertAccount(company.id, 'demo-bank', '普通預金', '資産');
  const sales = await upsertAccount(company.id, 'demo-sales', '売上高', '収益');
  const salary = await upsertAccount(company.id, 'demo-salary', '給料手当', '費用');
  const rent = await upsertAccount(company.id, 'demo-rent', '地代家賃', '費用');
  const unknown = await upsertAccount(company.id, 'demo-unknown', '雑費', '費用');

  await createJournalWithDetails({
    companyId: company.id,
    mfJournalId: 'demo-journal-sales',
    issueDate: new Date('2026-04-15'),
    description: '売上入金',
    details: [
      { mfDetailId: 'demo-detail-sales-bank', side: 'debit', accountId: bank.id, amount: 1_200_000 },
      { mfDetailId: 'demo-detail-sales-sales', side: 'credit', accountId: sales.id, amount: 1_200_000 },
    ],
  });

  await createJournalWithDetails({
    companyId: company.id,
    mfJournalId: 'demo-journal-salary',
    issueDate: new Date('2026-04-25'),
    description: '給与支払',
    details: [
      { mfDetailId: 'demo-detail-salary-salary', side: 'debit', accountId: salary.id, amount: 450_000 },
      { mfDetailId: 'demo-detail-salary-bank', side: 'credit', accountId: bank.id, amount: 450_000 },
    ],
  });

  await createJournalWithDetails({
    companyId: company.id,
    mfJournalId: 'demo-journal-rent',
    issueDate: new Date('2026-04-30'),
    description: '家賃支払',
    details: [
      { mfDetailId: 'demo-detail-rent-rent', side: 'debit', accountId: rent.id, amount: 180_000 },
      { mfDetailId: 'demo-detail-rent-bank', side: 'credit', accountId: bank.id, amount: 180_000 },
    ],
  });

  await createJournalWithDetails({
    companyId: company.id,
    mfJournalId: 'demo-journal-unknown',
    issueDate: new Date('2026-04-30'),
    description: '内容確認が必要な支出',
    details: [
      { mfDetailId: 'demo-detail-unknown-expense', side: 'debit', accountId: unknown.id, amount: 75_000 },
      { mfDetailId: 'demo-detail-unknown-bank', side: 'credit', accountId: bank.id, amount: 75_000 },
    ],
  });

  await prisma.cfClassificationResult.deleteMany({ where: { companyId: company.id } });
  const { classifyCompanyDetails } = await import('../src/lib/cf/classifier');
  await classifyCompanyDetails({
    companyId: company.id,
    from: '2026-04-01',
    to: '2026-04-30',
  });

  const inputs: DocumentInputs = {
    kind: 'bank',
    companyOverview: 'デモ株式会社は、法人向けサービスを提供する中小企業です。',
    loanPurpose: '運転資金の確保と仕入資金の平準化を目的とします。',
    requestedAmount: '5,000,000円',
    repaymentPeriod: '5年',
    useOfFunds: '仕入資金、外注費、人件費の一部',
    notes: '受注見込みはあるものの、入金までの期間を踏まえて資金余力を確保します。',
  };
  const snapshot = await createDocumentSnapshot({ companyId: company.id, inputs, now: new Date('2026-04-30') });
  const bodyMarkdown = await generateDraftMarkdown({ inputs, snapshot });

  await prisma.generatedDocument.create({
    data: {
      companyId: company.id,
      kind: inputs.kind,
      status: 'draft',
      inputsJson: inputs,
      snapshotJson: snapshot,
      bodyMarkdown,
      model: 'demo-seed',
      createdById: user.id,
    },
  });

  console.log(`Demo login: ${email} / ${password}`);
}

async function upsertAccount(companyId: string, mfAccountId: string, name: string, category: string) {
  return prisma.mfAccount.upsert({
    where: { companyId_mfAccountId: { companyId, mfAccountId } },
    create: {
      companyId,
      mfAccountId,
      name,
      category,
      rawJson: { id: mfAccountId, name, category },
    },
    update: {
      name,
      category,
      rawJson: { id: mfAccountId, name, category },
    },
  });
}

async function createJournalWithDetails(args: {
  companyId: string;
  mfJournalId: string;
  issueDate: Date;
  description: string;
  details: Array<{
    mfDetailId: string;
    side: 'debit' | 'credit';
    accountId: string;
    amount: number;
  }>;
}) {
  const journal = await prisma.mfJournal.upsert({
    where: { companyId_mfJournalId: { companyId: args.companyId, mfJournalId: args.mfJournalId } },
    create: {
      companyId: args.companyId,
      mfJournalId: args.mfJournalId,
      issueDate: args.issueDate,
      description: args.description,
      tagNames: [],
      totalAmount: BigInt(args.details.reduce((sum, detail) => sum + detail.amount, 0) / 2),
      rawJson: args,
    },
    update: {
      issueDate: args.issueDate,
      description: args.description,
      totalAmount: BigInt(args.details.reduce((sum, detail) => sum + detail.amount, 0) / 2),
      rawJson: args,
    },
  });

  for (const detail of args.details) {
    await prisma.mfJournalDetail.upsert({
      where: {
        companyId_mfDetailId: {
          companyId: args.companyId,
          mfDetailId: detail.mfDetailId,
        },
      },
      create: {
        companyId: args.companyId,
        journalId: journal.id,
        mfDetailId: detail.mfDetailId,
        side: detail.side,
        accountId: detail.accountId,
        amount: BigInt(detail.amount),
        rawJson: detail,
      },
      update: {
        journalId: journal.id,
        side: detail.side,
        accountId: detail.accountId,
        amount: BigInt(detail.amount),
        rawJson: detail,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
