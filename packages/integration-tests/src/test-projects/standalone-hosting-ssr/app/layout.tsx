import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSR Test App',
  description: 'Next.js SSR test application for Amplify hosting',
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
