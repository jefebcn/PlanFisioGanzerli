'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { DAY_END_HOUR, DAY_START_HOUR, SLOT_MINUTES } from '@/lib/agenda/time';
import type { AppointmentDTO } from '@/lib/agenda/types';

interface Props {
  date: Date;
  therapists: { id: string; name: string; color: string }[];
  appointments: AppointmentDTO[];
  conflictIds: Set<string>;
  onSlotClick: (therapistId: string, startsAt: Date) => void;
  onMove: (
    appointmentId: string,
    newStartsAt: Date,
    expectedVersion: number,
  ) => Promise<void>;
}

const SLOT_HEIGHT_PX = 28;

function buildSlots(): { hour: number; minute: number }[] {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push({ hour: h, minute: m });
    }
  }
  return slots;
}

export function CalendarBoard({
  date,
  therapists,
  appointments,
  conflictIds,
  onSlotClick,
  onMove,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const slots = buildSlots();

  function slotKey(therapistId: string, h: number, m: number) {
    return `${therapistId}-${h}-${m}`;
  }

  function appointmentTopPx(a: AppointmentDTO): number {
    const start = new Date(a.startsAt);
    const minutes =
      start.getUTCHours() * 60 + start.getUTCMinutes() - DAY_START_HOUR * 60;
    return (minutes / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  }

  function appointmentHeightPx(a: AppointmentDTO): number {
    const dur =
      (new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000;
    return Math.max((dur / SLOT_MINUTES) * SLOT_HEIGHT_PX - 2, SLOT_HEIGHT_PX - 2);
  }

  async function handleDrop(
    therapistId: string,
    hour: number,
    minute: number,
    e: React.DragEvent,
  ) {
    e.preventDefault();
    const id = e.dataTransfer.getData('appointmentId');
    const versionStr = e.dataTransfer.getData('version');
    if (!id) return;
    const newStart = new Date(date);
    newStart.setUTCHours(hour, minute, 0, 0);
    await onMove(id, newStart, parseInt(versionStr || '0', 10));
    setDraggingId(null);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(${therapists.length}, minmax(180px, 1fr))` }}>
        <div className="sticky left-0 top-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-2 text-xs font-semibold">
          Ora
        </div>
        {therapists.map((t) => (
          <div
            key={t.id}
            className="border-b border-r border-slate-200 bg-slate-50 p-2 text-sm font-semibold"
            style={{ borderTop: `3px solid ${t.color}` }}
          >
            {t.name}
          </div>
        ))}

        {slots.map(({ hour, minute }) => (
          <div
            key={`row-${hour}-${minute}`}
            className="contents"
          >
            <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-1 text-right text-[11px] text-slate-500">
              {minute === 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
            </div>
            {therapists.map((t) => {
              const slotStart = new Date(date);
              slotStart.setUTCHours(hour, minute, 0, 0);
              return (
                <div
                  key={slotKey(t.id, hour, minute)}
                  className="relative border-b border-r border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                  style={{ height: SLOT_HEIGHT_PX }}
                  onClick={() => onSlotClick(t.id, slotStart)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(t.id, hour, minute, e)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute" />

      {/* Cards: rendered absolutely su ciascuna colonna operatore */}
      <div className="relative">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${therapists.length}, minmax(180px, 1fr))` }}>
          <div />
          {therapists.map((t) => {
            const dayAppts = appointments
              .filter((a) => a.therapistId === t.id)
              .filter((a) => {
                const start = new Date(a.startsAt);
                return (
                  start.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
                );
              });
            return (
              <div key={`col-${t.id}`} className="relative" style={{ minHeight: 0 }}>
                {dayAppts.map((a) => {
                  const top = appointmentTopPx(a);
                  const height = appointmentHeightPx(a);
                  const conflict = conflictIds.has(a.id);
                  return (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('appointmentId', a.id);
                        e.dataTransfer.setData('version', String(a.version));
                        setDraggingId(a.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={clsx(
                        'pointer-events-auto absolute left-1 right-1 rounded-md p-1.5 text-xs shadow-sm cursor-grab active:cursor-grabbing',
                        conflict
                          ? 'bg-red-100 border-2 border-red-500 animate-shake'
                          : 'bg-white border border-slate-300',
                        draggingId === a.id && 'opacity-50',
                        a.override && 'ring-2 ring-amber-400',
                      )}
                      style={{
                        top: `calc(${top}px - ${SLOT_HEIGHT_PX * (DAY_END_HOUR - DAY_START_HOUR) * 60 / SLOT_MINUTES}px)`,
                        height,
                        borderLeftColor: t.color,
                        borderLeftWidth: 4,
                      }}
                      title={`${a.patient.fullName} — ${a.therapy.name}`}
                    >
                      <div className="font-semibold text-slate-900 truncate">
                        {a.patient.fullName}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">
                        {a.therapy.name}
                      </div>
                      {a.resourceBookings.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5">
                          {a.resourceBookings.map((rb) => (
                            <span
                              key={rb.id}
                              className="rounded bg-slate-200 px-1 text-[9px] uppercase text-slate-700"
                            >
                              {rb.resource.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {a.override && (
                        <span className="mt-0.5 inline-block rounded bg-amber-200 px-1 text-[9px] font-bold uppercase text-amber-900">
                          override
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
