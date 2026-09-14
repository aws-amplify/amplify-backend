import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSR Monorepo Test App',
  description: 'Next.js SSR monorepo test application for Amplify hosting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
