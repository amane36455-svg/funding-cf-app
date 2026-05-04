import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const apiDir = path.resolve('src/app/api');
const publicRoutes = new Set([
  'auth/[...nextauth]/route.ts',
  'auth/signup/route.ts',
  'health/route.ts',
]);
const cronRoutes = new Set(['sync/daily/route.ts']);

const routeFiles = listRouteFiles(apiDir);
const failures = [];

for (const file of routeFiles) {
  const relative = path.relative(apiDir, file).replaceAll(path.sep, '/');
  const source = readFileSync(file, 'utf8');

  if (publicRoutes.has(relative)) {
    continue;
  }

  if (cronRoutes.has(relative)) {
    if (!source.includes('CRON_SECRET') || !source.includes('authorization')) {
      failures.push(`${relative}: cron route must validate CRON_SECRET authorization`);
    }
    continue;
  }

  const hasApiContext = source.includes('getUserAndCompanyForApi');
  const hasSession = source.includes('getServerSession');
  if (!hasApiContext && !hasSession) {
    failures.push(`${relative}: route must require an authenticated user/session`);
    continue;
  }

  if (hasApiContext && source.includes('prisma.') && !source.includes('companyId: context.companyId')) {
    failures.push(`${relative}: Prisma access with API context should include companyId scope`);
  }

  if (hasSession && source.includes('prisma.') && !source.includes('userId: session.user.id')) {
    failures.push(`${relative}: session-scoped Prisma access should include userId scope`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[fail] ${failure}`);
  }
  process.exit(1);
}

console.log(`API scope audit passed for ${routeFiles.length} routes.`);

function listRouteFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listRouteFiles(fullPath));
    } else if (entry === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}
