'use client';

import clsx from 'clsx';
import { useState } from 'react';
import type { AppointmentDTO } from '@/lib/agenda/types';
import { AppointmentPopup } from './AppointmentPopup';

const HOUR_HEIGHT = 64;
const DAY_START = 8;
const DAY_END = 20;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

// Minimum column width — keeps day columns usable on small screens
const MIN_COL_WIDTH = 80;
const TIME_COL_W = 44;

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const HEADER_BG = [
  { bg: '#f5f0ff', text: '#7c3aed' },
  { bg: '#eff6ff', text: '#2563eb' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#ecfdf5', text: '#059669' },
  { bg: '#f0fdf4', text: '#16a34a' },
  { bg: '#fdf4ff', text: '#9333ea' },
  { bg: '#fef9c3', text: '#b45309' },
];

function getWeekDays(date: Date): Date[] {
  const dow = date.getUTCDay();
  const mondayOff = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setUTCDate(date.getUTCDate() + mondayOff + i);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
}

function apptTop(startsAt: Date): number {
  const h = new Date(startsAt).getUTCHours();
  const m = new Date(startsAt).getUTCMinutes();
  return (h + m / 60 - DAY_START) * HOUR_HEIGHT;
}

function apptHeight(startsAt: Date, endsAt: Date): number {
  const dur = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000;
  return Math.max(dur * HOUR_HEIGHT - 2, 20);
}

interface Props {
  date: Date;
  appointments: AppointmentDTO[];
  visibleTherapists: Set<string>;
  onSlotClick: (therapistId: string, startsAt: Date) => void;
  onMove: (id: string, newStartsAt: Date, version: number) => Promise<void>;
  onDelete: (id: string) => void;
  onPatientRenamed?: (patientId: string, newName: string) => void;
}

export function WeekView({
  date,
  appointments,
  visibleTherapists,
  onSlotClick,
  onMove,
  onDelete,
  onPatientRenamed,
}: Props) {
  const days = getWeekDays(date);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ appt: AppointmentDTO; top: number; left: number } | null>(null);

  function slotClick(day: Date, hour: number, e: React.MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const fracY = (e.clientY - rect.top) / rect.height;
    const minute = fracY >= 0.5 ? 30 : 0;
    const start = new Date(day);
    start.setUTCHours(hour, minute, 0, 0);
    onSlotClick('', start);
  }

  function handleDrop(day: Date, hour: number, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData('appointmentId');
    const ver = parseInt(e.dataTransfer.getData('version') || '0', 10);
    if (!id) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const fracY = (e.clientY - rect.top) / rect.height;
    const minute = fracY >= 0.5 ? 30 : 0;
    const start = new Date(day);
    start.setUTCHours(hour, minute, 0, 0);
    onMove(id, start, ver);
    setDraggingId(null);
  }

  const dayAppointments = (day: Date) =>
    appointments.filter((a) => {
      if (!visibleTherapists.has(a.therapistId)) return false;
      return new Date(a.startsAt).toISOString().slice(0, 10) === day.toISOString().slice(0, 10);
    });

  const minGridWidth = TIME_COL_W + MIN_COL_WIDTH * 7;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Horizontally scrollable wrapper — lets mobile users swipe to see all days */}
      <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
        <div style={{ minWidth: minGridWidth }}>
          {/* Day header row — sticky so it stays visible when scrolling vertically */}
          <div className="flex bg-white border-b border-slate-200 sticky top-0 z-10">
            <div
              className="flex-shrink-0 flex items-end pb-2 justify-center"
              style={{ width: TIME_COL_W }}
            >
              <span className="text-[9px] text-slate-400 font-medium">GMT+1</span>
            </div>
            {days.map((day, i) => {
              const iso = day.toISOString().slice(0, 10);
              const isToday = iso === todayISO;
              const { bg, text } = HEADER_BG[i];
              return (
                <div
                  key={iso}
                  className="flex-1 px-1 py-2 text-center transition-colors"
                  style={{ backgroundColor: isToday ? '#d1fae5' : bg, minWidth: MIN_COL_WIDTH }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: isToday ? '#065f46' : text }}>
                    {DAY_LABELS[i]}
                  </div>
                  <div
                    className={clsx(
                      'inline-flex items-center justify-center rounded-full text-sm font-bold w-7 h-7 mx-auto',
                      isToday ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-700',
                    )}
                  >
                    {day.getUTCDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Time labels */}
            <div className="flex-shrink-0" style={{ width: TIME_COL_W }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 pt-0 text-[10px] text-slate-400 select-none"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="-translate-y-2.5">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const iso = day.toISOString().slice(0, 10);
              const isToday = iso === todayISO;
              const appts = dayAppointments(day);

              return (
                <div
                  key={iso}
                  className={clsx(
                    'flex-1 relative border-l border-slate-100',
                    isToday && 'bg-emerald-50/30',
                  )}
                  style={{ minWidth: MIN_COL_WIDTH, minHeight: HOURS.length * HOUR_HEIGHT }}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-colors"
                      style={{ top: (h - DAY_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={(e) => slotClick(day, h, e)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(day, h, e)}
                    >
                      <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-slate-100/80" />
                    </div>
                  ))}

                  {/* Appointment cards */}
                  {appts.map((a) => {
                    const top = apptTop(new Date(a.startsAt));
                    const height = apptHeight(new Date(a.startsAt), new Date(a.endsAt));
                    const isDragging = draggingId === a.id;

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
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const POPUP_W = 304;
                          const POPUP_H = 420;
                          const left = rect.right + 8 + POPUP_W > window.innerWidth
                            ? Math.max(0, rect.left - POPUP_W - 8)
                            : rect.right + 8;
                          const top = Math.max(8, Math.min(rect.top, window.innerHeight - POPUP_H - 8));
                          setPopup({ appt: a, top, left });
                        }}
                        className={clsx(
                          'absolute left-0.5 right-0.5 rounded-xl px-1.5 py-1 cursor-pointer select-none transition-all',
                          'shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
                          isDragging && 'opacity-40',
                          a.override && 'ring-1 ring-amber-400',
                        )}
                        style={{
                          top,
                          height,
                          backgroundColor: a.therapist.color + '22',
                          borderLeft: `3px solid ${a.therapist.color}`,
                        }}
                      >
                        <div className="text-[10px] font-semibold leading-tight truncate" style={{ color: a.therapist.color }}>
                          {a.patient.fullName}
                        </div>
                        {height > 36 && (
                          <div className="text-[9px] text-slate-500 truncate leading-tight mt-0.5">
                            {a.therapy.name}
                          </div>
                        )}
                        {height > 52 && a.resourceBookings.length > 0 && (
                          <div className="flex gap-0.5 mt-1 flex-wrap">
                            {a.resourceBookings.map((rb) => (
                              <span
                                key={rb.id}
                                className="text-[9px] px-1 py-0 rounded-full font-medium"
                                style={{ backgroundColor: a.therapist.color + '33', color: a.therapist.color }}
                              >
                                {rb.resource.name}
                              </span>
                            ))}
                          </div>
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

      {/* Appointment popup */}
      {popup && (
        <AppointmentPopup
          appointment={popup.appt}
          anchorTop={popup.top}
          anchorLeft={popup.left}
          onClose={() => setPopup(null)}
          onDelete={(id) => { onDelete(id); setPopup(null); }}
          onPatientRenamed={onPatientRenamed}
        />
      )}
    </div>
  );
}
