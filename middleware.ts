import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
  callbacks: {
    authorized: ({ token }) => Boolean(token?.userId),
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/documents/:path*', '/onboarding'],
};
