import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { canRunImportPreview, userCompanyAccessWhere } from '@/lib/auth/company-scope';
import { prisma, seedTwoCompanyFixture, withRollback } from '../helpers/fixtures';

describe('real DB import access boundary infrastructure', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps company membership queries scoped to the server-side user and company', async () => {
    await withRollback(async (tx) => {
      const { companyA, companyB, userA } = await seedTwoCompanyFixture(tx);
      const clientSubmittedCompanyId = companyB.id;
      const serverSideCompanyId = companyA.id;

      const allowed = await tx.userCompany.findUnique({
        where: userCompanyAccessWhere(userA.id, serverSideCompanyId),
      });
      const blocked = await tx.userCompany.findUnique({
        where: userCompanyAccessWhere(userA.id, clientSubmittedCompanyId),
      });

      expect(allowed?.companyId).toBe(serverSideCompanyId);
      expect(allowed?.companyId).not.toBe(clientSubmittedCompanyId);
      expect(blocked).toBeNull();
    });
  });

  it('supports the import preview role boundary against migrated enum values', async () => {
    await withRollback(async (tx) => {
      const { companyA, userA } = await seedTwoCompanyFixture(tx);
      const roles = ['OWNER', 'ADMIN', 'STAFF', 'MEMBER', 'REVIEWER', 'VIEWER'] as const;

      for (const role of roles) {
        await tx.userCompany.update({
          where: userCompanyAccessWhere(userA.id, companyA.id),
          data: { role },
        });
        const membership = await tx.userCompany.findUniqueOrThrow({
          where: userCompanyAccessWhere(userA.id, companyA.id),
        });

        expect(canRunImportPreview(membership.role)).toBe(
          role === 'OWNER' || role === 'ADMIN' || role === 'STAFF' || role === 'MEMBER',
        );
      }
    });
  });

  it('enforces userCompany company foreign keys in the migrated schema', async () => {
    await expect(
      withRollback(async (tx) => {
        const { userA } = await seedTwoCompanyFixture(tx);

        await tx.userCompany.create({
          data: {
            userId: userA.id,
            companyId: randomUUID(),
            role: 'STAFF',
          },
        });
      }),
    ).rejects.toThrow();
  });
});
