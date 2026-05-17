import { describe, expect, it } from 'vitest';
import {
  IMPORT_RATE_LIMIT_MESSAGE,
  IMPORT_RATE_LIMITS,
  InMemoryRateLimiter,
  buildImportRateLimitKey,
  getClientIpForRateLimit,
  hashRateLimitValue,
  rateLimitedResponse,
} from '@/lib/rate-limit/import-rate-limit';

describe('import API rate limit helpers', () => {
  it('limits repeated requests for the same key within a window', async () => {
    const limiter = new InMemoryRateLimiter();

    expect(await limiter.check('import.preview:user:user-a', 2, 60_000)).toEqual({ allowed: true });
    expect(await limiter.check('import.preview:user:user-a', 2, 60_000)).toEqual({ allowed: true });
    expect(await limiter.check('import.preview:user:user-a', 2, 60_000)).toEqual(
      expect.objectContaining({ allowed: false, retryAfterSeconds: expect.any(Number) }),
    );
  });

  it('does not share limits across different keys', async () => {
    const limiter = new InMemoryRateLimiter();

    expect(await limiter.check('import.preview:user:user-a', 1, 60_000)).toEqual({ allowed: true });
    expect(await limiter.check('import.preview:user:user-b', 1, 60_000)).toEqual({ allowed: true });
  });

  it('supports a separate cancel action key and limit', async () => {
    const limiter = new InMemoryRateLimiter();

    expect(IMPORT_RATE_LIMITS.cancel).toEqual({
      actionName: 'import.cancel',
      limit: 10,
      windowMs: 60_000,
    });
    expect(await limiter.check('import.cancel:user:user-a', 10, 60_000)).toEqual({ allowed: true });
    expect(await limiter.check('import.cancel:user:user-b', 10, 60_000)).toEqual({ allowed: true });
  });

  it('extracts the first forwarded IP before falling back to x-real-ip', () => {
    expect(
      getClientIpForRateLimit(
        new Request('http://localhost', {
          headers: {
            'x-forwarded-for': '203.0.113.10, 198.51.100.20',
            'x-real-ip': '198.51.100.30',
          },
        }),
      ),
    ).toBe('203.0.113.10');

    expect(
      getClientIpForRateLimit(
        new Request('http://localhost', {
          headers: {
            'x-real-ip': '198.51.100.30',
          },
        }),
      ),
    ).toBe('198.51.100.30');
  });

  it('hashes IP values without exposing the original IP', () => {
    const previousSalt = process.env.RATE_LIMIT_HASH_SALT;
    process.env.RATE_LIMIT_HASH_SALT = 'test-salt';
    try {
      const hashed = hashRateLimitValue('203.0.113.10');

      expect(hashed).toMatch(/^[a-f0-9]{64}$/);
      expect(hashed).not.toContain('203.0.113.10');
      expect(hashed).toBe(hashRateLimitValue('203.0.113.10'));
    } finally {
      if (previousSalt === undefined) {
        delete process.env.RATE_LIMIT_HASH_SALT;
      } else {
        process.env.RATE_LIMIT_HASH_SALT = previousSalt;
      }
    }
  });

  it('uses userId before IP for rate limit keys', () => {
    const key = buildImportRateLimitKey(
      new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.10',
        },
      }),
      'import.preview',
      'user-a',
    );

    expect(key).toBe('import.preview:user:user-a');
    expect(key).not.toContain('203.0.113.10');
  });

  it('uses a hashed IP fallback without exposing the raw IP', () => {
    const key = buildImportRateLimitKey(
      new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.10',
        },
      }),
      'import.preview',
      null,
    );

    expect(key).toMatch(/^import\.preview:ip:[a-f0-9]{64}$/);
    expect(key).not.toContain('203.0.113.10');
  });

  it('returns a sanitized 429 response shape', async () => {
    const response = rateLimitedResponse(60);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(body).toEqual({
      ok: false,
      code: 'RATE_LIMITED',
      message: IMPORT_RATE_LIMIT_MESSAGE,
      retryAfterSeconds: 60,
    });
    expect(serialized).not.toContain('companyId');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('role');
    expect(serialized).not.toContain('journal.csv');
  });
});
