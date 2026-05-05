import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = path.resolve(__dirname, '../../../scripts/check-env.mjs');

describe('check-env production mode', () => {
  it('rejects local placeholders and localhost production URLs', () => {
    let output = '';

    try {
      execFileSync(process.execPath, [scriptPath, '--production'], {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          NODE_ENV: 'test',
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/funding_cf',
          DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/funding_cf',
          NEXTAUTH_SECRET: 'local_development_nextauth_secret_please_replace',
          TOKEN_ENCRYPTION_KEY: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
          MF_CLIENT_ID: 'local_dummy_client_id',
          MF_CLIENT_SECRET: 'local_dummy_client_secret',
          MF_REDIRECT_URI: 'http://localhost:3000/api/auth/mf/callback',
          MF_AUTHORIZE_URL: 'https://api.biz.moneyforward.com/authorize',
          MF_TOKEN_URL: 'https://api.biz.moneyforward.com/token',
          MF_API_BASE_URL: 'https://api.example.invalid',
          MF_SCOPES: 'read',
          CRON_SECRET: 'local_development_cron_secret',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      output = String((error as { stderr?: Buffer }).stderr ?? '');
    }

    expect(output).toContain('NEXTAUTH_URL');
    expect(output).toContain('NEXT_PUBLIC_APP_URL');
    expect(output).toContain('NEXTAUTH_SECRET must not use a placeholder');
    expect(output).toContain('DATABASE_URL must not point at localhost');
    expect(output).toContain('MF_REDIRECT_URI must use https://');
  });

  it('accepts production-shaped values', () => {
    const output = execFileSync(process.execPath, [scriptPath, '--production'], {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: 'test',
        DATABASE_URL:
          'postgresql://postgres.project-ref:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
        DIRECT_URL: 'postgresql://postgres:secret@db.project-ref.supabase.co:5432/postgres',
        NEXTAUTH_URL: 'https://funding-cf.example.jp',
        NEXT_PUBLIC_APP_URL: 'https://funding-cf.example.jp',
        NEXTAUTH_SECRET: 'prod_nextauth_secret_32_chars_minimum',
        TOKEN_ENCRYPTION_KEY: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
        MF_CLIENT_ID: 'prod-client-id',
        MF_CLIENT_SECRET: 'prod-client-secret',
        MF_REDIRECT_URI: 'https://funding-cf.example.jp/api/auth/mf/callback',
        MF_AUTHORIZE_URL: 'https://api.biz.moneyforward.com/authorize',
        MF_TOKEN_URL: 'https://api.biz.moneyforward.com/token',
        MF_API_BASE_URL: 'https://api-accounting.moneyforward.com',
        MF_SCOPES: 'read',
        CRON_SECRET: 'prod_cron_secret_32_chars_minimum',
      },
    });

    expect(output).toContain('Environment looks valid for production.');
  });

  it('rejects token encryption keys that are not 32-byte standard base64', () => {
    let output = '';

    try {
      execFileSync(process.execPath, [scriptPath, '--production'], {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          NODE_ENV: 'test',
          DATABASE_URL:
            'postgresql://postgres.project-ref:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
          DIRECT_URL: 'postgresql://postgres:secret@db.project-ref.supabase.co:5432/postgres',
          NEXTAUTH_URL: 'https://funding-cf.example.jp',
          NEXT_PUBLIC_APP_URL: 'https://funding-cf.example.jp',
          NEXTAUTH_SECRET: 'prod_nextauth_secret_32_chars_minimum',
          TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
          MF_CLIENT_ID: 'prod-client-id',
          MF_CLIENT_SECRET: 'prod-client-secret',
          MF_REDIRECT_URI: 'https://funding-cf.example.jp/api/auth/mf/callback',
          MF_AUTHORIZE_URL: 'https://api.biz.moneyforward.com/authorize',
          MF_TOKEN_URL: 'https://api.biz.moneyforward.com/token',
          MF_API_BASE_URL: 'https://api-accounting.moneyforward.com',
          MF_SCOPES: 'read',
          CRON_SECRET: 'prod_cron_secret_32_chars_minimum',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      output = String((error as { stderr?: Buffer }).stderr ?? '');
    }

    expect(output).toContain('TOKEN_ENCRYPTION_KEY must be standard base64');
    expect(output).toContain('do not use hex or a raw 32-character string');
  });
});
