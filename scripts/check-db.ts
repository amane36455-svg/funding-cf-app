import './load-env';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Database connection OK.');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
