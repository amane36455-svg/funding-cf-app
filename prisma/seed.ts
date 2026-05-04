import '../scripts/load-env';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_CF_RULES } from '../src/lib/cf/rules';

const prisma = new PrismaClient();

async function main() {
  for (const rule of DEFAULT_CF_RULES) {
    await prisma.cfClassificationRule.upsert({
      where: { id: deterministicUuid(`${rule.priority}:${rule.matchType}:${rule.matchValue}`) },
      create: {
        id: deterministicUuid(`${rule.priority}:${rule.matchType}:${rule.matchValue}`),
        priority: rule.priority,
        matchType: rule.matchType,
        matchValue: rule.matchValue,
        cfCategory: rule.cfCategory,
        cfGroup: rule.cfGroup,
        isPersonal: rule.isPersonal,
        enabled: true,
      },
      update: {
        priority: rule.priority,
        matchType: rule.matchType,
        matchValue: rule.matchValue,
        cfCategory: rule.cfCategory,
        cfGroup: rule.cfGroup,
        isPersonal: rule.isPersonal,
        enabled: true,
      },
    });
  }
}

function deterministicUuid(input: string): string {
  const hex = createHash('sha1').update(input).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
