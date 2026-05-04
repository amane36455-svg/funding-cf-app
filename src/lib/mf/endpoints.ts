import { env, requireMfEnv } from '@/lib/env';

export const MF_PATHS = {
  offices: env.MF_PATH_OFFICES,
  accounts: env.MF_PATH_ACCOUNTS,
  journals: env.MF_PATH_JOURNALS,
} as const;

export const MF_DEFAULT_PER_PAGE = 100;

export function pagingQuery(page: number, perPage = MF_DEFAULT_PER_PAGE): Record<string, string | number> {
  return {
    [env.MF_QUERY_PAGE]: page,
    [env.MF_QUERY_PER_PAGE]: perPage,
  };
}

export function officeQuery(officeId: string): Record<string, string> {
  if (!env.MF_QUERY_OFFICE_ID) return {};
  return {
    [env.MF_QUERY_OFFICE_ID]: officeId,
  };
}

export function accountsQuery(page: number): Record<string, string | number> {
  return env.MF_ACCOUNTS_PAGINATED === 'true' ? pagingQuery(page) : {};
}

export function shouldPaginateAccounts(): boolean {
  return env.MF_ACCOUNTS_PAGINATED === 'true';
}

export function journalRangeQuery(from: string, to: string): Record<string, string> {
  return {
    [env.MF_QUERY_JOURNALS_FROM]: from,
    [env.MF_QUERY_JOURNALS_TO]: to,
  };
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  const { apiBaseUrl } = requireMfEnv();
  const base = apiBaseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}
