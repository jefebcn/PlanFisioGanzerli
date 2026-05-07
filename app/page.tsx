import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">PlanFisioGanzerli</h1>
      <p className="max-w-xl text-center text-slate-600">
        Gestionale per fisioterapisti con sistema intelligente di rilevamento
        conflitti su operatori, pazienti e macchinari (Tecar, Laser, Viss
        Terapia).
      </p>
      <Link
        href="/calendar"
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Apri agenda
      </Link>
    </main>
  );
}
