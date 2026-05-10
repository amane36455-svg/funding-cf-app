import { Buffer } from 'node:buffer';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const isProductionCheck =
  process.argv.includes('--production') || process.env.CHECK_ENV_TARGET === 'production';

const required = [
 'APP_DATABASE_URL',
'APP_DIRECT_URL',
  'NEXTAUTH_SECRET',
  'TOKEN_ENCRYPTION_KEY',
  'MF_CLIENT_ID',
  'MF_CLIENT_SECRET',
  'MF_REDIRECT_URI',
  'MF_AUTHORIZE_URL',
  'MF_TOKEN_URL',
  'MF_API_BASE_URL',
  'MF_SCOPES',
  'CRON_SECRET',
];

const productionRequired = ['NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL'];
const placeholderPattern = /replace_me|dummy|local_development|your-|example\.com|password/i;
const productionHttpsUrls = ['NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL', 'MF_REDIRECT_URI'];
const productionNoLocalhostUrls = [
  'APP_DATABASE_URL',
'APP_DIRECT_URL',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'MF_REDIRECT_URI',
];
const tokenEncryptionKeyMessage =
  'TOKEN_ENCRYPTION_KEY must be standard base64 for exactly 32 random bytes. Generate it with `pnpm gen:key`, register only the value after `TOKEN_ENCRYPTION_KEY=`, and do not use hex or a raw 32-character string.';

function isBase64Encoded32ByteKey(value) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  return Buffer.from(value, 'base64').length === 32;
}

let failed = false;

for (const key of isProductionCheck ? [...required, ...productionRequired] : required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    failed = true;
  }
}

const tokenKey = process.env.TOKEN_ENCRYPTION_KEY;
if (tokenKey) {
  if (!isBase64Encoded32ByteKey(tokenKey)) {
    console.error(tokenEncryptionKeyMessage);
    failed = true;
  }
}

const cronSecret = process.env.CRON_SECRET;
if (cronSecret && cronSecret.length < 16) {
  console.error('CRON_SECRET should be at least 16 characters');
  failed = true;
}

for (const key of ['MF_REDIRECT_URI', 'MF_AUTHORIZE_URL', 'MF_TOKEN_URL', 'MF_API_BASE_URL']) {
  const value = process.env[key];
  if (!value) continue;
  try {
    new URL(value);
  } catch {
    console.error(`${key} must be a valid URL`);
    failed = true;
  }
}

if (isProductionCheck) {
  for (const key of [...required, ...productionRequired]) {
    const value = process.env[key];
    if (value && placeholderPattern.test(value)) {
      console.error(`${key} must not use a placeholder or local dummy value in production`);
      failed = true;
    }
  }

  for (const key of productionNoLocalhostUrls) {
    const value = process.env[key];
    if (value && value.includes('localhost')) {
      console.error(`${key} must not point at localhost in production`);
      failed = true;
    }
  }

  for (const key of productionHttpsUrls) {
    const value = process.env[key];
    if (value && !value.startsWith('https://')) {
      console.error(`${key} must use https:// in production`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log(`Environment looks valid${isProductionCheck ? ' for production' : ''}.`);
