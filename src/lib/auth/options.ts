import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';
import {
  resolveCurrentCompanyId,
  userCompanyAccessWhere,
  type AppRole,
  type CompanyMembershipScope,
} from '@/lib/auth/company-scope';

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        const membership = await resolveMembershipForToken(user.id);
        token.currentCompanyId = membership?.companyId ?? null;
        token.role = membership?.role ?? null;
      }

      if (trigger === 'update' && token.userId && session) {
        const requested = session as { currentCompanyId?: string | null };
        if (requested.currentCompanyId) {
          const membership = await resolveMembershipForToken(token.userId, requested.currentCompanyId);
          if (membership) {
            token.currentCompanyId = membership.companyId;
            token.role = membership.role;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.currentCompanyId = token.currentCompanyId ?? null;
      session.role = token.role ?? null;
      return session;
    },
  },
};

async function resolveMembershipForToken(userId: string, requestedCompanyId?: string | null) {
  const [memberships, preference] = await Promise.all([
    prisma.userCompany.findMany({
      where: { userId },
      orderBy: [{ lastAccessedAt: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.userPreference.findUnique({ where: { userId } }),
  ]);

  const scopedMemberships: CompanyMembershipScope[] = memberships.map((membership) => ({
    companyId: membership.companyId,
    role: membership.role as AppRole,
    createdAt: membership.createdAt,
    lastAccessedAt: membership.lastAccessedAt,
  }));
  const currentCompanyId = resolveCurrentCompanyId({
    requestedCompanyId,
    preferredCompanyId: preference?.currentCompanyId,
    memberships: scopedMemberships,
  });

  if (!currentCompanyId) return null;

  const membership = memberships.find((item) => item.companyId === currentCompanyId);
  if (!membership) return null;

  const now = new Date();
  await prisma.$transaction([
    prisma.userPreference.upsert({
      where: { userId },
      create: { userId, currentCompanyId },
      update: { currentCompanyId },
    }),
    prisma.userCompany.update({
      where: userCompanyAccessWhere(userId, currentCompanyId),
      data: { lastAccessedAt: now },
    }),
  ]);

  return {
    companyId: membership.companyId,
    role: membership.role as AppRole,
  };
}
