'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type {
  StoredPatient, StoredResource, StoredTherapy, StoredUser, UserRole,
} from '@/lib/storage/types';
import { OVERRIDE_ROLES, type ConflictReport, type OverrideInput } from '@/lib/conflicts/types';
import { ConflictBanner } from './ConflictBanner';
import { OverrideModal } from './OverrideModal';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStartsAt: Date;
  therapists: Pick<StoredUser, 'id' | 'name' | 'color'>[];
  patients: Pick<StoredPatient, 'id' | 'fullName'>[];
  therapies: StoredTherapy[];
  resources: StoredResource[];
  currentUserRole: UserRole;
  onCreated: () => void;
}

const HOURS_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const total = 7 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const TAG_COLORS = ['#5eead4', '#fde68a', '#fbcfe8', '#bfdbfe', '#c4b5fd'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function toTimeStr(d: Date) { return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; }
function combine(date: string, time: string): Date { return new Date(`${date}T${time}:00.000Z`); }

export function BookingDialog({
  open, onClose, defaultStartsAt,
  therapists, patients, therapies, resources,
  currentUserRole, onCreated,
}: Props) {
  const [therapistId, setTherapistId] = useState(therapists[0]?.id ?? '');
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [therapyId, setTherapyId] = useState(therapies[0]?.id ?? '');
  const [date, setDate] = useState(toDateStr(defaultStartsAt));
  const [startTime, setStartTime] = useState(toTimeStr(defaultStartsAt));
  const [location, setLocation] = useState('Studio Ganzerli');
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<ConflictReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  // Sync local state when defaultStartsAt prop changes (slot click).
  useEffect(() => {
    setDate(toDateStr(defaultStartsAt));
    setStartTime(toTimeStr(defaultStartsAt));
  }, [defaultStartsAt]);

  const therapy = useMemo(() => therapies.find((t) => t.id === therapyId), [therapies, therapyId]);
  const startsAtDate = useMemo(() => combine(date, startTime), [date, startTime]);
  const endsAtDate = useMemo(() => {
    if (!therapy) return null;
    return new Date(startsAtDate.getTime() + therapy.durationMinutes * 60_000);
  }, [startsAtDate, therapy]);

  const canOverride = OVERRIDE_ROLES.includes(currentUserRole);
  const selectedPatient = patients.find((p) => p.id === patientId);

  // Auto-suggest required resources.
  useEffect(() => {
    if (!therapy) return;
    const required = therapy.requiredResourceTypes;
    if (required.length === 0) { setResourceIds([]); return; }
    const pick = required.map((type) => resources.find((r) => r.type === type)?.id).filter((id): id is string => Boolean(id));
    setResourceIds(pick);
  }, [therapy, resources]);

  // Live conflict check.
  useEffect(() => {
    if (!open || !therapistId || !patientId || !therapyId || !endsAtDate) { setReport(null); return; }
    const handle = setTimeout(async () => {
      const res = await fetch('/api/appointments/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId, patientId, therapyId,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate.toISOString(),
          resourceIds,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setReport(json.report);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [open, therapistId, patientId, therapyId, startsAtDate, endsAtDate, resourceIds]);

  if (!open) return null;

  async function submit(override?: OverrideInput) {
    if (!endsAtDate) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId, patientId, therapyId,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate.toISOString(),
          resourceIds,
          notes: [location ? `📍 ${location}` : '', notes].filter(Boolean).join('\n') || null,
          override,
        }),
      });
      if (res.status === 409) {
        const json = await res.json();
        setReport(json.report);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const detail = json.message ? `\n${json.message}` : '';
        alert(`Errore: ${json.error ?? res.statusText}${detail}`);
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled = submitting || !endsAtDate || (report?.hasHardConflict ?? false);

  const dateLabel = startsAtDate.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with patient title */}
          <div className="px-6 pt-6 pb-4 relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              ×
            </button>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Nuovo appuntamento
            </div>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full text-2xl font-bold text-slate-900 bg-transparent border-0 outline-none cursor-pointer hover:text-violet-600 transition appearance-none -ml-0.5"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div className="px-6 pb-5 space-y-3">
            {/* Date row */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 16 16">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M2 6h12M5.5 2v2M10.5 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            {/* Time row */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-violet-500 transition cursor-pointer"
              >
                {HOURS_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-slate-400 text-sm">→</span>
              <div className="flex-1 text-sm font-medium text-slate-600 bg-slate-50 rounded-xl px-3 py-2 text-center">
                {endsAtDate ? toTimeStr(endsAtDate) : '—'}
              </div>
            </div>

            {/* Location row */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 16 16">
                  <path d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 3 4.5 8 4.5 8s4.5-5 4.5-8A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            {/* Therapy chips */}
            <div className="pt-1">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Terapia</div>
              <div className="flex flex-wrap gap-1.5">
                {therapies.map((t, i) => {
                  const selected = therapyId === t.id;
                  const color = TAG_COLORS[i % TAG_COLORS.length];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTherapyId(t.id)}
                      className={clsx(
                        'text-xs font-semibold rounded-full px-3 py-1.5 transition border',
                        selected ? 'text-slate-900 border-transparent' : 'text-slate-500 bg-white border-slate-200 hover:border-slate-300',
                      )}
                      style={selected ? { backgroundColor: color } : {}}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resource chips */}
            {resources.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Macchinari</div>
                <div className="flex flex-wrap gap-1.5">
                  {resources.map((r) => {
                    const selected = resourceIds.includes(r.id);
                    const conflictOnThis = report?.items.some((i) => i.kind === 'RESOURCE_BUSY' && i.resourceId === r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setResourceIds((prev) => prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id])}
                        className={clsx(
                          'text-xs font-semibold rounded-full px-3 py-1.5 transition border',
                          selected
                            ? conflictOnThis
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-violet-100 text-violet-700 border-violet-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                        )}
                      >
                        {r.name}{conflictOnThis && selected ? ' ⚠' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Therapist avatars */}
            <div className="pt-1">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Operatore</div>
              <div className="flex gap-1.5">
                {therapists.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTherapistId(t.id)}
                    title={t.name}
                    className={clsx(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all',
                      therapistId === t.id
                        ? 'ring-2 ring-offset-2 ring-violet-500 scale-105'
                        : 'opacity-50 hover:opacity-100',
                    )}
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict banner */}
            {report && (report.hasHardConflict || report.hasSoftConflict) && (
              <div className="pt-1">
                <ConflictBanner
                  report={report}
                  canOverride={canOverride}
                  onForce={() => setOverrideOpen(true)}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex gap-2">
            <button
              type="button"
              disabled={submitDisabled}
              onClick={() => submit()}
              className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl py-3 text-sm transition shadow-md"
            >
              {submitting ? 'Salvataggio…' : 'Aggiungi appuntamento'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-12 h-12 rounded-2xl border border-slate-200 text-slate-500 text-xl hover:bg-slate-50 transition"
              title="Annulla"
            >
              ⋯
            </button>
          </div>
        </div>
      </div>

      <OverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onConfirm={(override) => { setOverrideOpen(false); submit(override); }}
      />
    </>
  );
}
