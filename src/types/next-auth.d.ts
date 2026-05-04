import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

type AppRole = 'OWNER' | 'MEMBER';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    currentCompanyId: string | null;
    role: AppRole | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string;
    currentCompanyId: string | null;
    role: AppRole | null;
  }
}
