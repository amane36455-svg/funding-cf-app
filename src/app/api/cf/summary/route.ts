import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { getMonthlyCfSummary } from '@/lib/cf/aggregator';
import { fail, ok } from '@/lib/http/apiResponse';

export async function GET(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) {
    return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get('year') ?? now.getFullYear());
  const month = Number(url.searchParams.get('month') ?? now.getMonth() + 1);
  const scopeParam = url.searchParams.get('scope') ?? 'all';

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fail('INVALID_MONTH', 'year と month を確認してください', 400);
  }

  const scope = scopeParam === 'corporate' || scopeParam === 'personal' ? scopeParam : 'all';
  const summary = await getMonthlyCfSummary({
    companyId: context.companyId,
    year,
    month,
    scope,
  });

  return ok({ year, month, scope, summary });
}
