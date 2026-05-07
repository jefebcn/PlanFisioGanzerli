import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlanFisioGanzerli',
  description: 'Sistema intelligente di gestione conflitti e risorse per studi di fisioterapia',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PlanFisio' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#13111e',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={nunito.variable}>
      <body className="font-nunito overscroll-none">{children}</body>
    </html>
  );
}
