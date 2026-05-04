import { env } from '@/lib/env';
import { fail, ok } from '@/lib/http/apiResponse';
import { runDailySyncForConnectedCompanies } from '@/lib/mf/sync/daily';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function handleDailySync(request: Request) {
  const expected = env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  const actual = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;

  if (!expected || actual !== expected) {
    return fail('UNAUTHORIZED', 'Cron secret is invalid', 401);
  }

  const result = await runDailySyncForConnectedCompanies();
  return ok(result);
}

// Vercel Cron invokes the configured path with GET.
export async function GET(request: Request) {
  return handleDailySync(request);
}

// Keep POST for local/manual verification.
export async function POST(request: Request) {
  return handleDailySync(request);
}
