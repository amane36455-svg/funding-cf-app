import { describe, expect, it } from 'vitest';
import {
  canRunImportPreview,
  resolveCurrentCompanyId,
  userCompanyAccessWhere,
  type AppRole,
} from '@/lib/auth/company-scope';

const memberships = [
  {
    companyId: 'company-a',
    role: 'OWNER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastAccessedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    companyId: 'company-b',
    role: 'STAFF' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
    lastAccessedAt: '2026-01-20T00:00:00.000Z',
  },
];

describe('company scope helpers', () => {
  it('rejects requested company ids outside the user membership set', () => {
    expect(
      resolveCurrentCompanyId({
        requestedCompanyId: 'company-x',
        preferredCompanyId: 'company-a',
        memberships,
      }),
    ).toBe('company-a');
  });

  it('rejects persisted currentCompanyId when membership no longer exists', () => {
    expect(
      resolveCurrentCompanyId({
        preferredCompanyId: 'company-x',
        memberships,
      }),
    ).toBe('company-b');
  });

  it('builds a compound user/company membership guard', () => {
    expect(userCompanyAccessWhere('user-a', 'company-a')).toEqual({
      userId_companyId: {
        userId: 'user-a',
        companyId: 'company-a',
      },
    });
  });

  it('allows import preview only for upload-capable roles', () => {
    const allowed: AppRole[] = ['OWNER', 'ADMIN', 'STAFF', 'MEMBER'];
    const denied: AppRole[] = ['REVIEWER', 'VIEWER'];

    for (const role of allowed) {
      expect(canRunImportPreview(role)).toBe(true);
    }
    for (const role of denied) {
      expect(canRunImportPreview(role)).toBe(false);
    }
  });
});
