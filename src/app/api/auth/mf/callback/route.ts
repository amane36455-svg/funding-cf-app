import { NextResponse } from 'next/server';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import {
  exchangeAuthorizationCode,
  fetchOfficesWithAccessToken,
  saveMfConnection,
  verifyMfState,
} from '@/lib/mf/oauth';

export async function GET(request: Request) {
  const context = await getUserAndCompanyForApi();
  if (!context) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) {
    return NextResponse.redirect(new URL('/settings?mf=error', request.url));
  }

  try {
    verifyMfState(state);
    const token = await exchangeAuthorizationCode(code);
    const offices = await fetchOfficesWithAccessToken(token.accessToken);
    const officeId = offices.length === 1 ? offices[0].id : null;

    await saveMfConnection({
      companyId: context.companyId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scope: token.scope,
      officeId,
    });

    if (officeId) {
      return NextResponse.redirect(new URL('/settings?mf=connected', request.url));
    }
    return NextResponse.redirect(new URL('/settings/mf/select-office', request.url));
  } catch {
    return NextResponse.redirect(new URL('/settings?mf=error', request.url));
  }
}
