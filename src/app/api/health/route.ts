import { prisma } from '@/lib/db/prisma';
import { ok, fail } from '@/lib/http/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'failed'> = {
    app: 'ok',
    database: 'failed',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'failed';
  }

  if (checks.database !== 'ok') {
    return fail('HEALTH_CHECK_FAILED', 'Health check failed', 503, { checks });
  }

  return ok({
    status: 'ok',
    checks,
    timestamp: new Date().toISOString(),
  });
}
