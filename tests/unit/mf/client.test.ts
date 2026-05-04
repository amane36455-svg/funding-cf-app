import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  mfConnection: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/env', () => ({
  env: {
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    LOG_LEVEL: 'error',
  },
  requireMfEnv: () => ({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost:3000/api/auth/mf/callback',
    authorizeUrl: 'https://api.biz.moneyforward.com/authorize',
    tokenUrl: 'https://api.biz.moneyforward.com/token',
    apiBaseUrl: 'https://mf.example.test',
    scopes: 'accounting.read',
  }),
}));

describe('MfClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('refreshes token on 401 and retries once', async () => {
    const { encryptToken } = await import('@/lib/crypto/token');
    const { MfClient } = await import('@/lib/mf/client');

    prismaMock.mfConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      companyId: 'company-1',
      mfOfficeId: 'office-1',
      accessTokenEnc: encryptToken('old-access'),
      refreshTokenEnc: encryptToken('old-refresh'),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scope: 'accounting.read',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.mfConnection.update.mockResolvedValue({
      id: 'conn-1',
      companyId: 'company-1',
      mfOfficeId: 'office-1',
      accessTokenEnc: encryptToken('new-access'),
      refreshTokenEnc: encryptToken('new-refresh'),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scope: 'accounting.read',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'accounting.read',
        }),
      )
      .mockResolvedValueOnce(Response.json({ data: [{ id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await MfClient.fromCompany('company-1');
    const result = await client.request({ path: '/accounts' });

    expect(result).toEqual({ data: [{ id: 1 }] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prismaMock.mfConnection.update).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
  });

  it('retries 5xx responses before succeeding', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'setTimeout');
    const { encryptToken } = await import('@/lib/crypto/token');
    const { MfClient } = await import('@/lib/mf/client');

    prismaMock.mfConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      companyId: 'company-1',
      mfOfficeId: 'office-1',
      accessTokenEnc: encryptToken('access'),
      refreshTokenEnc: encryptToken('refresh'),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scope: 'accounting.read',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('server error', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await MfClient.fromCompany('company-1');
    const promise = client.request({ path: '/accounts' });
    await vi.runOnlyPendingTimersAsync();

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
