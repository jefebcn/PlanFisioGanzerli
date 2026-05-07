import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlanFisioGanzerli — Gestionale Fisioterapisti',
  description: 'Sistema intelligente di gestione conflitti e risorse per studi di fisioterapia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={nunito.variable}>
      <body className="font-nunito">{children}</body>
    </html>
  );
}
