import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  },
}));

describe('token crypto', () => {
  it('encrypts and decrypts token text', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/crypto/token');
    const encrypted = encryptToken('mf-access-token');

    expect(encrypted.equals(Buffer.from('mf-access-token'))).toBe(false);
    expect(decryptToken(encrypted)).toBe('mf-access-token');
  });
});
