import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { encryptToken } from '@/lib/crypto/token';
import { prisma } from '@/lib/db/prisma';
import { requireMfEnv } from '@/lib/env';
import { MF_PATHS, buildApiUrl } from '@/lib/mf/endpoints';
import { MFAuthError } from '@/lib/mf/errors';
import { OfficeSchema } from '@/lib/mf/types';
import { unwrapList } from '@/lib/mf/client';

const STATE_COOKIE = 'mf_oauth_state';

export function createMfAuthorizationUrl(): string {
  const mf = requireMfEnv();
  const state = randomBytes(24).toString('hex');
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });

  const url = new URL(mf.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', mf.clientId);
  url.searchParams.set('redirect_uri', mf.redirectUri);
  url.searchParams.set('scope', mf.scopes);
  url.searchParams.set('state', state);
  return url.toString();
}

export function verifyMfState(state: string | null): void {
  const expected = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);
  if (!state || !expected || state !== expected) {
    throw new MFAuthError('Invalid MF OAuth state', { code: 'MF_INVALID_STATE' });
  }
}

export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string | null;
}> {
  const mf = requireMfEnv();
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: mf.clientId,
    client_secret: mf.clientSecret,
    redirect_uri: mf.redirectUri,
    code,
  });

  const response = await fetch(mf.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new MFAuthError('MF authorization code exchange failed', { status: response.status });
  }

  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!body.access_token || !body.refresh_token) {
    throw new MFAuthError('MF token response is missing token fields');
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + (body.expires_in ?? 3600) * 1000),
    scope: body.scope ?? null,
  };
}

export async function fetchOfficesWithAccessToken(accessToken: string): Promise<
  Array<{ id: string; name: string }>
> {
  const response = await fetch(buildApiUrl(MF_PATHS.offices), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new MFAuthError('MF offices fetch failed', { status: response.status });
  }

  const body = await response.json();
  const single = OfficeSchema.safeParse(body);
  if (single.success) return [single.data];

  return unwrapList(body)
    .map((item) => OfficeSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

export async function saveMfConnection(args: {
  companyId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string | null;
  officeId?: string | null;
}) {
  return prisma.mfConnection.upsert({
    where: { companyId: args.companyId },
    create: {
      companyId: args.companyId,
      mfOfficeId: args.officeId ?? null,
      accessTokenEnc: encryptToken(args.accessToken),
      refreshTokenEnc: encryptToken(args.refreshToken),
      tokenExpiresAt: args.expiresAt,
      scope: args.scope,
    },
    update: {
      mfOfficeId: args.officeId ?? null,
      accessTokenEnc: encryptToken(args.accessToken),
      refreshTokenEnc: encryptToken(args.refreshToken),
      tokenExpiresAt: args.expiresAt,
      scope: args.scope,
    },
  });
}
