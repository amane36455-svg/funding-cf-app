const REQUIRED_DATABASE_URLS = ['APP_DATABASE_URL', 'APP_DIRECT_URL'];
const ALLOWED_HOSTS_ENV = 'TEST_DATABASE_ALLOWED_HOSTS';
const ALLOWED_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const PRODUCTION_LIKE_MARKERS = ['production', 'prod', 'staging', 'supabase', 'pooler'];

function fail(reason = 'invalid-target') {
  console.error(`test database target check failed: ${reason}`);
  process.exit(1);
}

function normalizeAllowedHost(value) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed || trimmed === '*') {
    return null;
  }

  if (trimmed.includes('@') || trimmed.includes('/') || trimmed.includes('?') || trimmed.includes('#')) {
    return null;
  }

  return trimmed.split(':')[0] || null;
}

function parseAllowedHosts() {
  const raw = process.env[ALLOWED_HOSTS_ENV];

  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(',')
      .map(normalizeAllowedHost)
      .filter(Boolean),
  );
}

function parseDatabaseUrl(value) {
  try {
    const parsed = new URL(value);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.trim().toLowerCase();
    const databaseName = parsed.pathname.replace(/^\//, '').trim().toLowerCase();

    if (!hostname || !databaseName) {
      return null;
    }

    return { hostname, databaseName };
  } catch {
    return null;
  }
}

function hasProductionLikeMarker(parsedUrl) {
  const targetParts = [parsedUrl.hostname, parsedUrl.databaseName].filter(Boolean);

  return targetParts.some((part) =>
    PRODUCTION_LIKE_MARKERS.some(
      (marker) =>
        part === marker ||
        part.startsWith(`${marker}-`) ||
        part.startsWith(`${marker}.`) ||
        part.endsWith(`-${marker}`) ||
        part.endsWith(`.${marker}`) ||
        part.includes(`-${marker}-`) ||
        part.includes(`.${marker}.`),
    ),
  );
}

function isTestDatabaseName(databaseName) {
  return databaseName === 'test' || databaseName.endsWith('_test') || databaseName.includes('_test_');
}

function main() {
  const allowedHosts = parseAllowedHosts();

  if (allowedHosts.size === 0) {
    fail('allowlist-missing');
  }

  for (const envName of REQUIRED_DATABASE_URLS) {
    const value = process.env[envName];

    if (!value) {
      fail('url-missing');
    }

    const parsedUrl = parseDatabaseUrl(value);

    if (!parsedUrl) {
      fail('url-invalid');
    }

    if (hasProductionLikeMarker(parsedUrl)) {
      fail('production-like-target');
    }

    if (!allowedHosts.has(parsedUrl.hostname)) {
      fail('host-not-allowed');
    }

    if (!isTestDatabaseName(parsedUrl.databaseName)) {
      fail('database-name-not-test');
    }
  }

  console.log('test database target check passed');
}

main();
