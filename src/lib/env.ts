import { z } from 'zod';

const testTokenKey = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=';
const tokenEncryptionKeyMessage =
  'TOKEN_ENCRYPTION_KEY must be standard base64 for exactly 32 random bytes; generate it with pnpm gen:key, and do not use hex or a raw 32-character string';

function isBase64Encoded32ByteKey(value: string): boolean {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  return Buffer.from(value, 'base64').length === 32;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .optional()
    .transform((value) => {
      if (value) return value;
      if (process.env.NODE_ENV === 'test') return testTokenKey;
      return '';
    })
    .refine(isBase64Encoded32ByteKey, tokenEncryptionKeyMessage),
  MF_CLIENT_ID: z.string().optional(),
  MF_CLIENT_SECRET: z.string().optional(),
  MF_REDIRECT_URI: z.string().url().optional(),
  MF_AUTHORIZE_URL: z.string().url().optional(),
  MF_TOKEN_URL: z.string().url().optional(),
  MF_API_BASE_URL: z.string().url().optional(),
  MF_SCOPES: z.string().optional(),
  MF_PATH_OFFICES: z.string().default('/api/v3/offices'),
  MF_PATH_ACCOUNTS: z.string().default('/api/v3/accounts'),
  MF_PATH_JOURNALS: z.string().default('/api/v3/journals'),
  MF_QUERY_OFFICE_ID: z.string().default(''),
  MF_QUERY_PAGE: z.string().default('page'),
  MF_QUERY_PER_PAGE: z.string().default('per_page'),
  MF_QUERY_JOURNALS_FROM: z.string().default('start_date'),
  MF_QUERY_JOURNALS_TO: z.string().default('end_date'),
  MF_ACCOUNTS_PAGINATED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);

export function requireMfEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  scopes: string;
} {
  const missing = [
    ['MF_CLIENT_ID', env.MF_CLIENT_ID],
    ['MF_CLIENT_SECRET', env.MF_CLIENT_SECRET],
    ['MF_REDIRECT_URI', env.MF_REDIRECT_URI],
    ['MF_AUTHORIZE_URL', env.MF_AUTHORIZE_URL],
    ['MF_TOKEN_URL', env.MF_TOKEN_URL],
    ['MF_API_BASE_URL', env.MF_API_BASE_URL],
    ['MF_SCOPES', env.MF_SCOPES],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing MF env: ${missing.join(', ')}`);
  }

  return {
    clientId: env.MF_CLIENT_ID!,
    clientSecret: env.MF_CLIENT_SECRET!,
    redirectUri: env.MF_REDIRECT_URI!,
    authorizeUrl: env.MF_AUTHORIZE_URL!,
    tokenUrl: env.MF_TOKEN_URL!,
    apiBaseUrl: env.MF_API_BASE_URL!,
    scopes: env.MF_SCOPES!,
  };
}
