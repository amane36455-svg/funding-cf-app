import { NextResponse } from 'next/server';
import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail } from '@/lib/http/apiResponse';
import { createMfAuthorizationUrl } from '@/lib/mf/oauth';

export async function GET() {
  const context = await getUserAndCompanyForApi();
  if (!context) {
    return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  }

  return NextResponse.redirect(createMfAuthorizationUrl());
}
