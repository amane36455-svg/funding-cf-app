import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'access_token',
      'refresh_token',
      'accessToken',
      'refreshToken',
      'authorization',
      'client_secret',
      '*.access_token',
      '*.refresh_token',
      '*.authorization',
      '*.client_secret',
    ],
    censor: '[REDACTED]',
  },
});
