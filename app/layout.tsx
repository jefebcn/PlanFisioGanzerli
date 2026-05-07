import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanFisioGanzerli — Gestionale Fisioterapisti',
  description:
    'Sistema intelligente di gestione conflitti e risorse per studi di fisioterapia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
