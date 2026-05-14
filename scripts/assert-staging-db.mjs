const REQUIRED_DATABASE_URLS = ['APP_DATABASE_URL', 'APP_DIRECT_URL'];
const ALLOWED_HOSTS_ENV = 'STAGING_DB_ALLOWED_HOSTS';
const ALLOWED_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

function fail() {
  console.error('staging target check failed');
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

function parseDatabaseUrl(value) {
  try {
    const parsed = new URL(value);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.trim().toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

function parseAllowedHosts() {
  const raw = process.env[ALLOWED_HOSTS_ENV];

  if (!raw) {
    return new Set();
  }

  const hosts = raw
    .split(',')
    .map(normalizeAllowedHost)
    .filter(Boolean);

  return new Set(hosts);
}

function main() {
  const allowedHosts = parseAllowedHosts();

  if (allowedHosts.size === 0) {
    fail();
  }

  for (const envName of REQUIRED_DATABASE_URLS) {
    const value = process.env[envName];

    if (!value) {
      fail();
    }

    const hostname = parseDatabaseUrl(value);

    if (!hostname || !allowedHosts.has(hostname)) {
      fail();
    }
  }

  console.log('staging target check passed');
}

main();
