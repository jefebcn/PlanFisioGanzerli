'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { MiniCalendar } from './MiniCalendar';
import type { AppointmentDTO } from '@/lib/agenda/types';

interface Therapist {
  id: string;
  name: string;
  color: string;
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
  color: string;
}

interface Props {
  selected: Date;
  onDateSelect: (d: Date) => void;
  therapists: Therapist[];
  visibleTherapists: Set<string>;
  onToggleTherapist: (id: string) => void;
  currentUserId: string | null;
  allUsers: UserInfo[];
  onSwitchUser: (id: string) => void;
  onNewAppointment: () => void;
  appointments?: AppointmentDTO[];
}

const CATEGORY_COLORS: Record<string, string> = {
  TECAR: '#2563eb',
  LASER: '#9333ea',
  VISS: '#0891b2',
  MANUAL: '#16a34a',
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={clsx('w-3.5 h-3.5 text-slate-500 transition-transform', open && 'rotate-180')}
      fill="none" viewBox="0 0 16 16"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function getNextAppointment(appointments: AppointmentDTO[]): AppointmentDTO | null {
  const now = Date.now();
  return (
    appointments
      .filter((a) => a.status === 'SCHEDULED' && new Date(a.startsAt).getTime() > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
  );
}

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'iniziato';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function Sidebar({
  selected,
  onDateSelect,
  therapists,
  visibleTherapists,
  onToggleTherapist,
  currentUserId,
  allUsers,
  onSwitchUser,
  onNewAppointment,
  appointments = [],
}: Props) {
  const [calendarsOpen, setCalendarsOpen] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [countdown, setCountdown] = useState('');
  const currentUser = allUsers.find((u) => u.id === currentUserId);
  const nextAppt = getNextAppointment(appointments);

  useEffect(() => {
    if (!nextAppt) return;
    const tick = () => setCountdown(formatCountdown(nextAppt.startsAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [nextAppt]);

  // Therapy category distribution
  const therapyCount: Record<string, number> = {};
  const total = appointments.filter((a) => a.status === 'SCHEDULED').length || 1;
  appointments.forEach((a) => {
    if (a.status !== 'SCHEDULED') return;
    const key = a.therapy?.name ?? 'Altro';
    therapyCount[key] = (therapyCount[key] ?? 0) + 1;
  });
  const categories = Object.entries(therapyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const therapistCounts = therapists.map((t) => ({
    ...t,
    count: appointments.filter((a) => a.therapistId === t.id && a.status === 'SCHEDULED').length,
  }));

  return (
    <aside className="w-[240px] min-w-[240px] flex flex-col h-full overflow-y-auto bg-[#13111e] border-r border-slate-800/60 scrollbar-hide">
      {/* User profile header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-slate-800/40">
        {currentUser ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.name.charAt(0)}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">P</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold leading-tight truncate">
            {currentUser?.name ?? 'PlanFisio'}
          </div>
          <div className="text-slate-500 text-[10px] capitalize">
            {currentUser?.role === 'THERAPIST' ? 'Fisioterapista' :
             currentUser?.role === 'SECRETARY' ? 'Segreteria' :
             currentUser?.role === 'ADMIN' ? 'Amministratore' : 'Studio Ganzerli'}
          </div>
        </div>
        <button
          onClick={onNewAppointment}
          className="w-7 h-7 rounded-full bg-slate-700/80 hover:bg-violet-600 transition-colors flex items-center justify-center text-slate-300 hover:text-white text-lg leading-none flex-shrink-0"
          title="Nuovo appuntamento"
        >
          +
        </button>
      </div>

      {/* Mini calendar */}
      <div className="mx-3 rounded-xl bg-slate-800/30 mt-3 mb-1">
        <MiniCalendar selected={selected} onSelect={onDateSelect} />
      </div>

      {/* Next appointment card */}
      {nextAppt && (
        <div className="mx-3 mt-3 bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400">
              {nextAppt.startsAt.slice(11, 16)} – {nextAppt.endsAt.slice(11, 16)}
            </span>
            <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full">
              {countdown}
            </span>
          </div>
          <div className="text-white text-xs font-semibold leading-snug mb-0.5 truncate">
            {nextAppt.patient?.fullName}
          </div>
          <div className="text-slate-400 text-[10px] truncate mb-3">
            {nextAppt.therapy?.name} · {nextAppt.therapist?.name}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {}}
              className="flex-1 text-[10px] font-semibold text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-lg py-1.5 transition"
            >
              Dopo
            </button>
            <button
              onClick={() => {}}
              className="flex-1 text-[10px] font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg py-1.5 transition"
            >
              Dettagli
            </button>
          </div>
        </div>
      )}

      {/* My Calendars */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setCalendarsOpen((o) => !o)}
          className="flex items-center justify-between w-full mb-2"
        >
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Le mie agende
          </span>
          <Chevron open={calendarsOpen} />
        </button>
        {calendarsOpen && (
          <div className="space-y-1">
            {therapistCounts.map((t) => (
              <button
                key={t.id}
                onClick={() => onToggleTherapist(t.id)}
                className="flex items-center gap-2.5 w-full group py-0.5"
              >
                <div
                  className="w-3.5 h-3.5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
                  style={{
                    borderColor: t.color,
                    backgroundColor: visibleTherapists.has(t.id) ? t.color : 'transparent',
                  }}
                >
                  {visibleTherapists.has(t.id) && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-sm text-slate-400 group-hover:text-slate-200 transition text-left truncate">
                  {t.name.split(' ')[0]}
                </span>
                {t.count > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 rounded-full px-1.5 min-w-[18px] text-center">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-4 pt-4">
          <button
            onClick={() => setCategoriesOpen((o) => !o)}
            className="flex items-center justify-between w-full mb-2"
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Categorie
            </span>
            <Chevron open={categoriesOpen} />
          </button>
          {categoriesOpen && (
            <div className="space-y-2.5">
              {categories.map(([name, count]) => {
                const pct = Math.round((count / total) * 100);
                const color = CATEGORY_COLORS[name.split(' ')[0].toUpperCase()] ?? '#6366f1';
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-400 truncate max-w-[130px]">{name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* User quick-switch */}
      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="text-[9px] text-slate-600 mb-2 uppercase tracking-widest">Accedi come</div>
        <div className="flex flex-wrap gap-1.5">
          {allUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => onSwitchUser(u.id)}
              title={u.name}
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all',
                currentUserId === u.id
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-[#13111e] scale-110'
                  : 'opacity-50 hover:opacity-100',
              )}
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0)}
            </button>
          ))}
        </div>
        <a
          href="/admin"
          className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-violet-400 transition group"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 3v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Dashboard admin
        </a>
      </div>
    </aside>
  );
}
