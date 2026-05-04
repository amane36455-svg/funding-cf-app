import type { MfConnection } from '@prisma/client';
import { decryptToken, encryptToken } from '@/lib/crypto/token';
import { prisma } from '@/lib/db/prisma';
import { requireMfEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildApiUrl } from '@/lib/mf/endpoints';
import {
  MFApiError,
  MFAuthError,
  MFNetworkError,
  MFRateLimitError,
  MFServerError,
} from '@/lib/mf/errors';

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_SERVER_RETRIES = 3;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
};

export class MfClient {
  private connection: MfConnection;
  private accessToken: string;
  private refreshToken: string;

  private constructor(connection: MfConnection) {
    this.connection = connection;
    this.accessToken = decryptToken(Buffer.from(connection.accessTokenEnc));
    this.refreshToken = decryptToken(Buffer.from(connection.refreshTokenEnc));
  }

  static async fromCompany(companyId: string): Promise<MfClient> {
    const connection = await prisma.mfConnection.findUnique({ where: { companyId } });
    if (!connection) {
      throw new MFAuthError('MF connection was not found for this company', {
        code: 'MF_NOT_CONNECTED',
      });
    }
    return new MfClient(connection);
  }

  get officeId(): string | null {
    return this.connection.mfOfficeId;
  }

  private async ensureFreshToken(): Promise<void> {
    if (this.connection.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
      return;
    }

    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const mf = requireMfEnv();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: mf.clientId,
      client_secret: mf.clientSecret,
      refresh_token: this.refreshToken,
    });

    let response: Response;
    try {
      response = await fetch(mf.tokenUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (error) {
      throw new MFNetworkError('MF token refresh network error', { cause: error });
    }

    if (!response.ok) {
      logger.warn({ status: response.status }, 'mf token refresh failed');
      throw new MFAuthError('MF token refresh failed', { status: response.status });
    }

    const body = (await response.json().catch(() => null)) as
      | {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          scope?: string;
        }
      | null;

    if (!body?.access_token) {
      throw new MFAuthError('MF token refresh response did not include access_token');
    }

    const nextRefreshToken = body.refresh_token ?? this.refreshToken;
    const expiresInSec = typeof body.expires_in === 'number' ? body.expires_in : 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

    const updated = await prisma.mfConnection.update({
      where: { companyId: this.connection.companyId },
      data: {
        accessTokenEnc: encryptToken(body.access_token),
        refreshTokenEnc: encryptToken(nextRefreshToken),
        tokenExpiresAt,
        scope: body.scope ?? this.connection.scope,
      },
    });

    this.connection = updated;
    this.accessToken = body.access_token;
    this.refreshToken = nextRefreshToken;
  }

  async request<T = unknown>(options: RequestOptions): Promise<T> {
    await this.ensureFreshToken();

    const url = buildApiUrl(options.path, options.query);
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    let authRetried = false;
    let rateLimitRetries = 0;
    let serverRetries = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (error) {
        throw new MFNetworkError('MF request network error', { cause: error });
      }

      if (response.status === 401 && !authRetried) {
        authRetried = true;
        await this.refresh();
        (init.headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
        continue;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSec = retryAfter ? Number(retryAfter) : undefined;
        if (rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          rateLimitRetries++;
          await sleep(retryDelayMs(rateLimitRetries, retryAfterSec));
          continue;
        }
        throw new MFRateLimitError('MF API rate limited the request', { retryAfterSec });
      }

      if (response.status >= 500) {
        if (serverRetries < MAX_SERVER_RETRIES) {
          serverRetries++;
          await sleep(retryDelayMs(serverRetries));
          continue;
        }
        throw new MFServerError(`MF server error: ${response.status}`, {
          status: response.status,
        });
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new MFApiError(`MF API error: ${response.status}`, {
          status: response.status,
          detail: detail.slice(0, 500),
        });
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const detail = await response.text().catch(() => '');
        throw new MFApiError('MF API returned non-JSON response', {
          status: response.status,
          detail: detail.slice(0, 500),
        });
      }

      return (await response.json()) as T;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterSec?: number): number {
  if (retryAfterSec && Number.isFinite(retryAfterSec)) {
    return Math.max(0, retryAfterSec * 1000);
  }

  const base = Math.min(30_000, 1000 * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

export function unwrapList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'offices', 'accounts', 'journals']) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
  }

  logger.warn({ bodyType: typeof body }, 'mf response list shape was not recognized');
  return [];
}
