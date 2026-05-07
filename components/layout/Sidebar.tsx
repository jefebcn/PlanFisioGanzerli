'use client';

import clsx from 'clsx';
import { MiniCalendar } from './MiniCalendar';

interface Therapist {
  id: string;
  name: string;
  color: string;
}

interface Props {
  selected: Date;
  onDateSelect: (d: Date) => void;
  therapists: Therapist[];
  visibleTherapists: Set<string>;
  onToggleTherapist: (id: string) => void;
  currentUserId: string | null;
  allUsers: Therapist[];
  onSwitchUser: (id: string) => void;
  onNewAppointment: () => void;
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
}: Props) {
  return (
    <aside className="w-[220px] min-w-[220px] flex flex-col h-full overflow-y-auto bg-[#1a1830] border-r border-slate-800/60">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-base">P</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold leading-tight truncate">PlanFisio</div>
          <div className="text-slate-500 text-[10px] leading-tight">Studio Ganzerli</div>
        </div>
        <button
          onClick={onNewAppointment}
          className="w-7 h-7 rounded-full bg-slate-700 hover:bg-violet-600 transition-colors flex items-center justify-center text-slate-300 hover:text-white text-lg leading-none"
          title="Nuovo appuntamento"
        >
          +
        </button>
      </div>

      {/* Mini calendar */}
      <div className="mx-3 rounded-xl bg-slate-800/40 my-1">
        <MiniCalendar selected={selected} onSelect={onDateSelect} />
      </div>

      {/* Operatori */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Operatori
          </span>
        </div>
        <div className="space-y-1.5">
          {therapists.map((t) => (
            <button
              key={t.id}
              onClick={() => onToggleTherapist(t.id)}
              className="flex items-center gap-2.5 w-full group"
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
                    <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors text-left leading-tight truncate">
                {t.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* User avatars */}
      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="text-[9px] text-slate-600 mb-2 uppercase tracking-widest">Accedi come</div>
        <div className="flex flex-wrap gap-1.5">
          {allUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => onSwitchUser(u.id)}
              title={u.name}
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all',
                currentUserId === u.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1a1830]' : 'opacity-60 hover:opacity-100',
              )}
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0)}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
