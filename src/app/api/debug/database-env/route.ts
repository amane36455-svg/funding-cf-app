import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function inspectDatabaseUrl() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    return {
      hostname: null,
      kind: 'missing',
    };
  }

  try {
    const url = new URL(raw);
    const hostname = url.hostname || null;

    const kind = hostname?.includes('pooler.supabase.com')
      ? 'pooler'
      : hostname?.includes('supabase.co')
        ? 'direct'
        : 'unknown';

    return {
      hostname,
      kind,
    };
  } catch {
    return {
      hostname: null,
      kind: 'invalid',
    };
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    database: inspectDatabaseUrl(),
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      url: process.env.VERCEL_URL ?? null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  });
}
