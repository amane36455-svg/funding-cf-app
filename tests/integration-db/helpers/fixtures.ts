import { PrismaClient, type Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const prisma = new PrismaClient();

class RollbackTestTransaction extends Error {
  constructor() {
    super('rollback test transaction');
    this.name = 'RollbackTestTransaction';
  }
}

export async function withRollback<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;

  try {
    await prisma.$transaction(
      async (tx) => {
        result = await callback(tx);
        throw new RollbackTestTransaction();
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    if (!(error instanceof RollbackTestTransaction)) {
      throw error;
    }
  }

  return result as T;
}

export async function seedTwoCompanyFixture(tx: Prisma.TransactionClient) {
  const suffix = randomUUID();
  const userA = await tx.user.create({
    data: {
      email: `user-a-${suffix}@example.test`,
      name: 'User A',
      passwordHash: 'test-password-hash',
    },
  });
  const userB = await tx.user.create({
    data: {
      email: `user-b-${suffix}@example.test`,
      name: 'User B',
      passwordHash: 'test-password-hash',
    },
  });
  const companyA = await tx.company.create({
    data: {
      name: 'Company A',
      ownerUserId: userA.id,
    },
  });
  const companyB = await tx.company.create({
    data: {
      name: 'Company B',
      ownerUserId: userB.id,
    },
  });

  await tx.userCompany.create({
    data: {
      userId: userA.id,
      companyId: companyA.id,
      role: 'STAFF',
    },
  });
  await tx.userCompany.create({
    data: {
      userId: userB.id,
      companyId: companyB.id,
      role: 'STAFF',
    },
  });

  return { companyA, companyB, userA, userB };
}
