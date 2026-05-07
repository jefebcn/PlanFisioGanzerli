'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes?: string;
  override?: { note: string; reason: string } | null;
  therapist: { id: string; name: string; color: string } | null;
  patient: { id: string; fullName: string } | null;
  therapy: { id: string; name: string; durationMinutes: number } | null;
  resourceBookings: { id: string; resource: { name: string; type: string } | null }[];
}

type FilterStatus = 'all' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-300',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300',
  CANCELLED: 'bg-slate-500/15 text-slate-400',
  NO_SHOW: 'bg-rose-500/15 text-rose-300',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programmato',
  COMPLETED: 'Completato',
  CANCELLED: 'Cancellato',
  NO_SHOW: 'Assente',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
function formatTime(iso: string) { return iso.slice(11, 16); }

export default function AdminPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/appointments');
    if (res.status === 401) { router.push('/login'); return; }
    const json = await res.json();
    setAppointments(json.appointments ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo appuntamento?')) return;
    await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    setEditingId(null);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const filtered = appointments.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        a.patient?.fullName ?? '',
        a.therapist?.name ?? '',
        a.therapy?.name ?? '',
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === 'SCHEDULED').length,
    today: appointments.filter((a) => {
      const today = new Date().toISOString().slice(0, 10);
      return a.startsAt.slice(0, 10) === today;
    }).length,
    overrides: appointments.filter((a) => a.override).length,
  };

  return (
    <div className="min-h-screen bg-[#0f0e1a] text-white font-['Nunito',sans-serif]">
      {/* Header */}
      <header className="bg-[#1a1830] border-b border-slate-800/60 px-6 py-3.5 flex items-center gap-4">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <div className="flex-1">
          <span className="font-semibold text-white">PlanFisio</span>
          <span className="text-slate-500 text-sm ml-2">· Dashboard Admin</span>
        </div>
        <a href="/calendar" className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800">
          ← Calendario
        </a>
        <button onClick={handleLogout} className="text-sm text-rose-400 hover:text-rose-300 transition px-3 py-1.5 rounded-lg hover:bg-rose-500/10">
          Esci
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Totale', value: stats.total, color: 'text-violet-400' },
            { label: 'Programmati', value: stats.scheduled, color: 'text-blue-400' },
            { label: 'Oggi', value: stats.today, color: 'text-emerald-400' },
            { label: 'Con override', value: stats.overrides, color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#1a1830] rounded-2xl p-5 border border-slate-800/50">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            type="text"
            placeholder="Cerca paziente, operatore, terapia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-[#1a1830] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-1 bg-[#1a1830] border border-slate-800 rounded-xl p-1">
            {(['all', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {f === 'all' ? 'Tutti' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition"
          >
            Aggiorna
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Nessun appuntamento trovato</div>
        ) : (
          <div className="bg-[#1a1830] rounded-2xl border border-slate-800/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Data/Ora</th>
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Paziente</th>
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Operatore</th>
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Terapia</th>
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Stato</th>
                  <th className="text-right px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-5 py-3.5">
                      <div className="text-white font-medium">{formatDate(a.startsAt)}</div>
                      <div className="text-slate-400 text-xs">{formatTime(a.startsAt)} – {formatTime(a.endsAt)}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-white">{a.patient?.fullName ?? '—'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {a.therapist && (
                          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: a.therapist.color }}>
                            {a.therapist.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-slate-300">{a.therapist?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-300">{a.therapy?.name ?? '—'}</div>
                      {a.resourceBookings.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {a.resourceBookings.map((rb) => (
                            <span key={rb.id} className="text-[10px] bg-slate-700/60 text-slate-400 rounded-full px-1.5 py-0">
                              {rb.resource?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === a.id ? (
                        <div className="flex gap-1">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            {['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                            ))}
                          </select>
                          <button onClick={() => handleStatusChange(a.id, editStatus)}
                            className="text-[10px] bg-violet-600 text-white rounded-lg px-2 py-1">✓</button>
                          <button onClick={() => setEditingId(null)}
                            className="text-[10px] bg-slate-700 text-slate-300 rounded-lg px-2 py-1">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(a.id); setEditStatus(a.status); }}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                        >
                          {STATUS_LABELS[a.status] ?? a.status}
                          {a.override && <span className="ml-1 text-amber-400">⚡</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
