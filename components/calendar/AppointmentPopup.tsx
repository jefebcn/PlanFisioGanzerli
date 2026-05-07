'use client';

import clsx from 'clsx';
import type { AppointmentDTO } from '@/lib/agenda/types';

interface Props {
  appointment: AppointmentDTO;
  anchorTop: number;
  anchorLeft: number;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function formatTime(d: Date | string): string {
  const date = new Date(d);
  return date.toISOString().slice(11, 16);
}

const RESOURCE_COLORS: Record<string, string> = {
  TECAR: 'bg-blue-100 text-blue-700',
  LASER: 'bg-purple-100 text-purple-700',
  VISS: 'bg-teal-100 text-teal-700',
  ROOM: 'bg-slate-100 text-slate-700',
};

export function AppointmentPopup({ appointment, anchorTop, anchorLeft, onClose, onDelete }: Props) {
  const startsAt = new Date(appointment.startsAt);
  const endsAt = new Date(appointment.endsAt);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 w-72 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        style={{ top: anchorTop, left: anchorLeft }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 relative"
          style={{ backgroundColor: appointment.therapist.color + '18' }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-500 text-sm"
          >
            ×
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: appointment.therapist.color }} />
            <span className="text-xs text-slate-500">{appointment.therapy.name}</span>
          </div>
          <div className="text-base font-semibold text-slate-900 leading-tight">
            {appointment.patient.fullName}
          </div>

          {/* Tab-style row */}
          <div className="flex gap-1 mt-2.5">
            {['Dettagli', 'Risorse', 'Note'].map((tab, i) => (
              <span
                key={tab}
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                  i === 0
                    ? 'bg-white shadow-sm text-slate-700'
                    : 'text-slate-400 hover:text-slate-600 cursor-pointer',
                )}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 16 16">
                <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 2.5v3.75l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                {startsAt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
              </div>
              <div className="text-sm font-medium text-slate-800">
                {formatTime(startsAt)} – {formatTime(endsAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: appointment.therapist.color }}
            >
              {appointment.therapist.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Operatore</div>
              <div className="text-sm font-medium text-slate-800">{appointment.therapist.name}</div>
            </div>
          </div>

          {appointment.resourceBookings.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {appointment.resourceBookings.map((rb) => (
                <span
                  key={rb.id}
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-[11px] font-medium',
                    RESOURCE_COLORS[rb.resource.type] ?? 'bg-slate-100 text-slate-600',
                  )}
                >
                  {rb.resource.name}
                </span>
              ))}
            </div>
          )}

          {appointment.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-2">
              {appointment.notes}
            </p>
          )}

          {appointment.override && (
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
              <span className="text-amber-600 text-[10px] font-bold uppercase">Override</span>
              <span className="text-xs text-amber-700">{appointment.override.note}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 pt-1 flex justify-end">
          <button
            onClick={() => { onDelete(appointment.id); onClose(); }}
            className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
          >
            Elimina appuntamento
          </button>
        </div>
      </div>
    </>
  );
}
