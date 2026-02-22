import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-secondary',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-primary',
});

export const metadata: Metadata = {
  title: 'SageInvest',
  description: '개인 투자 자산 관리 대시보드 - KIS OpenAPI 기반',
  keywords: ['투자', '자산관리', 'KIS', '한국투자증권', '대시보드'],
  authors: [{ name: 'SageInvest Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
