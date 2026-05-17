import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export interface RateLimiter {
  check(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{
    allowed: boolean;
    retryAfterSeconds?: number;
  }>;
}

export type ImportRateLimitAction = 'preview' | 'save';

export const IMPORT_RATE_LIMIT_MESSAGE =
  '一定時間内のファイル読み込み回数が上限に達しました。サーバーの混雑を防ぐため、約1分後に再度お試しください。';

export const IMPORT_RATE_LIMITS: Record<
  ImportRateLimitAction,
  { actionName: string; limit: number; windowMs: number }
> = {
  preview: { actionName: 'import.preview', limit: 5, windowMs: 60_000 },
  save: { actionName: 'import.save', limit: 3, windowMs: 60_000 },
};

type Bucket = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true };
  }

  reset() {
    this.buckets.clear();
  }
}

const runtimeHashSalt = randomBytes(32).toString('hex');
const importRateLimiter = new InMemoryRateLimiter();

export async function checkImportApiRateLimit(args: {
  action: ImportRateLimitAction;
  request: Request;
  userId?: string | null;
  limiter?: RateLimiter;
}) {
  const config = IMPORT_RATE_LIMITS[args.action];
  const limiter = args.limiter ?? importRateLimiter;
  const key = buildImportRateLimitKey(args.request, config.actionName, args.userId);
  return limiter.check(key, config.limit, config.windowMs);
}

export function buildImportRateLimitKey(
  request: Request,
  actionName: string,
  userId?: string | null,
): string {
  if (userId) return `${actionName}:user:${userId}`;

  const clientIp = getClientIpForRateLimit(request);
  if (clientIp) return `${actionName}:ip:${hashRateLimitValue(clientIp)}`;

  return `${actionName}:missing-ip:${hashRateLimitValue('missing-ip')}`;
}

export function getClientIpForRateLimit(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedIp = forwardedFor
    ?.split(',')
    .map((value) => value.trim())
    .find(Boolean);
  if (forwardedIp) return forwardedIp;

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || null;
}

export function hashRateLimitValue(value: string): string {
  const salt = process.env.RATE_LIMIT_HASH_SALT || runtimeHashSalt;
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function rateLimitedResponse(retryAfterSeconds = 60) {
  return NextResponse.json(
    {
      ok: false as const,
      code: 'RATE_LIMITED',
      message: IMPORT_RATE_LIMIT_MESSAGE,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}

export function resetImportRateLimitForTests() {
  importRateLimiter.reset();
}
