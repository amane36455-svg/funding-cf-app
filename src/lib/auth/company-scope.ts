export type AppRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'REVIEWER' | 'VIEWER' | 'MEMBER';

export type CompanyMembershipScope = {
  companyId: string;
  role: AppRole;
  createdAt?: Date | string | null;
  lastAccessedAt?: Date | string | null;
};

const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  STAFF: '担当者',
  REVIEWER: 'レビュー担当',
  VIEWER: '閲覧者',
  MEMBER: 'メンバー',
};

export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function userCompanyAccessWhere(userId: string, companyId: string) {
  return {
    userId_companyId: {
      userId,
      companyId,
    },
  } as const;
}

export function resolveCurrentCompanyId(args: {
  requestedCompanyId?: string | null;
  preferredCompanyId?: string | null;
  memberships: CompanyMembershipScope[];
}): string | null {
  const allowed = new Set(args.memberships.map((membership) => membership.companyId));

  if (args.requestedCompanyId && allowed.has(args.requestedCompanyId)) {
    return args.requestedCompanyId;
  }

  if (args.preferredCompanyId && allowed.has(args.preferredCompanyId)) {
    return args.preferredCompanyId;
  }

  return [...args.memberships].sort(compareMembershipPriority)[0]?.companyId ?? null;
}

function compareMembershipPriority(a: CompanyMembershipScope, b: CompanyMembershipScope): number {
  const aLast = toTime(a.lastAccessedAt);
  const bLast = toTime(b.lastAccessedAt);
  if (aLast !== bLast) return bLast - aLast;

  const aCreated = toTime(a.createdAt);
  const bCreated = toTime(b.createdAt);
  return aCreated - bCreated;
}

function toTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}
