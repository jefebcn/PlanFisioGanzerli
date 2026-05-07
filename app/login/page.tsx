'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Credenziali non valide'); return; }
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#13111e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div>
            <div className="text-white font-semibold text-lg leading-tight">PlanFisio</div>
            <div className="text-slate-500 text-xs">Studio Ganzerli</div>
          </div>
        </div>

        <div className="bg-[#1a1830] rounded-2xl p-7 shadow-2xl border border-slate-800/50">
          <h1 className="text-xl font-semibold text-white mb-1">Accesso Admin</h1>
          <p className="text-slate-400 text-sm mb-6">Inserisci le credenziali per accedere</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@planfisio.it"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition shadow-lg shadow-violet-900/30"
            >
              {loading ? 'Accesso…' : 'Accedi'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/calendar" className="text-slate-500 text-xs hover:text-slate-300 transition">
              ← Torna al calendario
            </a>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          Credenziali di default: ADMIN_EMAIL / ADMIN_PASSWORD
        </p>
      </div>
    </div>
  );
}
