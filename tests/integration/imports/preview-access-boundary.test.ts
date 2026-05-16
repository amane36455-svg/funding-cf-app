import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/auth/company-scope';

const authMock = vi.hoisted(() => ({
  getUserAndCompanyForApi: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => authMock);

describe('import preview access boundary scaffold', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('returns 401 without a server-side user/company context', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(null);
    const { POST } = await import('@/app/api/imports/preview/route');

    const response = await POST(createCsvRequest({ spoofedCompanyId: 'company-b' }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(serialized).not.toContain('company-b');
  });

  it.each(['VIEWER', 'REVIEWER'] as const)(
    'blocks %s before reading upload data or trusting client companyId',
    async (role) => {
      const formData = vi.fn();
      authMock.getUserAndCompanyForApi.mockResolvedValue(
        createContext({
          companyId: 'company-a',
          role,
          userId: 'user-a',
        }),
      );
      const { POST } = await import('@/app/api/imports/preview/route');

      const response = await POST({ formData } as unknown as Request);
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(403);
      expect(body.code).toBe('FORBIDDEN');
      expect(formData).not.toHaveBeenCalled();
      expect(serialized).not.toContain(role);
      expect(serialized).not.toContain('company-a');
      expect(serialized).not.toContain('user-a');
    },
  );

  it.each(['OWNER', 'ADMIN', 'STAFF', 'MEMBER'] as const)(
    'allows %s but ignores spoofed companyId and does not echo tenant context',
    async (role) => {
      authMock.getUserAndCompanyForApi.mockResolvedValue(
        createContext({
          companyId: 'company-a',
          role,
          userId: 'user-a',
        }),
      );
      const { POST } = await import('@/app/api/imports/preview/route');

      const response = await POST(createCsvRequest({ spoofedCompanyId: 'company-b' }));
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.file.kind).toBe('csv');
      expect(serialized).not.toContain('company-a');
      expect(serialized).not.toContain('company-b');
      expect(serialized).not.toContain('user-a');
    },
  );

  it('keeps company A context isolated when a client submits company B in form data', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(
      createContext({
        companyId: 'company-a',
        role: 'OWNER',
        userId: 'user-a',
      }),
    );
    const { POST } = await import('@/app/api/imports/preview/route');

    const response = await POST(createCsvRequest({ spoofedCompanyId: 'company-b' }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(serialized).not.toContain('company-a');
    expect(serialized).not.toContain('company-b');
    expect(serialized).not.toContain('user-a');
  });
});

function createCsvRequest(args: { spoofedCompanyId?: string }): Request {
  const formData = new FormData();
  formData.append(
    'file',
    new Blob(['date,debit,credit,amount\n2026/05/01,cash,sales,1000\n'], {
      type: 'text/csv',
    }),
    'journal.csv',
  );
  if (args.spoofedCompanyId) {
    formData.append('companyId', args.spoofedCompanyId);
  }

  return new Request('http://localhost/api/imports/preview', {
    method: 'POST',
    body: formData,
  });
}

function createContext(args: { companyId: string; role: AppRole; userId: string }) {
  return {
    userId: args.userId,
    email: `${args.userId}@example.test`,
    companyId: args.companyId,
    companyName: 'Test Company',
    role: args.role,
  };
}
