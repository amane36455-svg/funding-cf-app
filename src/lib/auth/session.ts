import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import { type AppRole, userCompanyAccessWhere } from '@/lib/auth/company-scope';
import { prisma } from '@/lib/db/prisma';

export type UserCompanyContext = {
  userId: string;
  email: string;
  companyId: string;
  companyName: string;
  role: AppRole;
};

export async function requireUserAndCompany(): Promise<UserCompanyContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }
  if (!session.currentCompanyId) {
    redirect('/onboarding');
  }

  const membership = await prisma.userCompany.findUnique({
    where: userCompanyAccessWhere(session.user.id, session.currentCompanyId),
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    redirect('/onboarding');
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role as AppRole,
  };
}

export async function getUserAndCompanyForApi(): Promise<UserCompanyContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.currentCompanyId) return null;

  const membership = await prisma.userCompany.findUnique({
    where: userCompanyAccessWhere(session.user.id, session.currentCompanyId),
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) return null;

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role as AppRole,
  };
}
