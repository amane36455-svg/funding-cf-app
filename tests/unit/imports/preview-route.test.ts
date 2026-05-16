import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IMPORT_LIMITS } from '@/lib/imports/limits';

const authMock = vi.hoisted(() => ({
  getUserAndCompanyForApi: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => authMock);

describe('POST /api/imports/preview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue(null);
    const { POST } = await import('@/app/api/imports/preview/route');

    const response = await POST(new Request('http://localhost/api/imports/preview', { method: 'POST' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('uses server-side company context and does not echo companyId', async () => {
    authMock.getUserAndCompanyForApi.mockResolvedValue({
      userId: 'user-a',
      email: 'user@example.test',
      companyId: 'company-secret-a',
      companyName: 'Company A',
      role: 'OWNER',
    });
    const { POST } = await import('@/app/api/imports/preview/route');
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['date,debit,credit,amount\n2026/05/01,cash,sales,1000\n'], {
        type: 'text/csv',
      }),
      'journal.csv',
    );
    formData.append('companyId', 'company-b');

    const response = await POST(
      new Request('http://localhost/api/imports/preview', {
        method: 'POST',
        body: formData,
      }),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(serialized).not.toContain('company-secret-a');
    expect(serialized).not.toContain('company-b');
  });

  it('rejects oversized files before reading the file body', async () => {
    const arrayBuffer = vi.fn();
    authMock.getUserAndCompanyForApi.mockResolvedValue({
      userId: 'user-a',
      email: 'user@example.test',
      companyId: 'company-a',
      companyName: 'Company A',
      role: 'OWNER',
    });
    const { POST } = await import('@/app/api/imports/preview/route');
    const request = {
      formData: async () => ({
        get: () => ({
          name: 'large.csv',
          size: IMPORT_LIMITS.maxFileSizeBytes + 1,
          type: 'text/csv',
          arrayBuffer,
        }),
      }),
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.code).toBe('IMPORT_FILE_TOO_LARGE');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
