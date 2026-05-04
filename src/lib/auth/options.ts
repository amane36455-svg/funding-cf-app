import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';

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
        const membership = await prisma.userCompany.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
        });
        token.currentCompanyId = membership?.companyId ?? null;
        token.role = membership?.role ?? null;
      }

      if (trigger === 'update' && token.userId && session) {
        const requested = session as { currentCompanyId?: string | null };
        if (requested.currentCompanyId) {
          const membership = await prisma.userCompany.findUnique({
            where: {
              userId_companyId: {
                userId: token.userId,
                companyId: requested.currentCompanyId,
              },
            },
          });
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
