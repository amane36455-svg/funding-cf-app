const baseUrl = normalizeBaseUrl(process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://localhost:3000');

const checks = [
  {
    name: 'health',
    path: '/api/health',
    expectStatus: 200,
    validate: async (response) => {
      const body = await response.json();
      return body?.ok === true && body?.data?.status === 'ok' && body?.data?.checks?.database === 'ok';
    },
  },
  {
    name: 'login page',
    path: '/login',
    expectStatus: 200,
    validate: async (response) => (await response.text()).includes('ログイン'),
  },
  {
    name: 'signup page',
    path: '/signup',
    expectStatus: 200,
    validate: async (response) => (await response.text()).includes('アカウント作成'),
  },
  {
    name: 'cron rejects unauthenticated request',
    path: '/api/sync/daily',
    expectStatus: 401,
    validate: async (response) => {
      const body = await response.json();
      return body?.ok === false && body?.code === 'UNAUTHORIZED';
    },
  },
];

let failed = false;

for (const check of checks) {
  const url = new URL(check.path, baseUrl);
  try {
    const response = await fetch(url, { redirect: 'manual' });
    const statusOk = response.status === check.expectStatus;
    const bodyOk = statusOk ? await check.validate(response) : false;

    if (!statusOk || !bodyOk) {
      failed = true;
      console.error(
        `[fail] ${check.name}: expected ${check.expectStatus}, got ${response.status}`,
      );
      continue;
    }

    console.log(`[ok] ${check.name}`);
  } catch (error) {
    failed = true;
    console.error(`[fail] ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Smoke checks passed for ${baseUrl}`);

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    console.error(`Invalid smoke base URL: ${value}`);
    process.exit(1);
  }
}
