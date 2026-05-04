import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export async function requireUserAndCompany(): Promise<{
  userId: string;
  email: string;
  companyId: string;
  companyName: string;
  role: 'OWNER' | 'MEMBER';
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }
  if (!session.currentCompanyId) {
    redirect('/onboarding');
  }

  const membership = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: session.currentCompanyId,
      },
    },
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
    role: membership.role,
  };
}

export async function getUserAndCompanyForApi(): Promise<
  | {
      userId: string;
      email: string;
      companyId: string;
      companyName: string;
      role: 'OWNER' | 'MEMBER';
    }
  | null
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.currentCompanyId) return null;

  const membership = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: session.currentCompanyId,
      },
    },
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
    role: membership.role,
  };
}
