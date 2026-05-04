import type { ReactNode } from 'react';
import { SessionProviderWrapper } from '@/components/common/SessionProviderWrapper';
import './globals.css';

export const metadata = {
  title: 'Funding CF App',
  description: 'Cash-flow dashboard and loan document draft MVP',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
