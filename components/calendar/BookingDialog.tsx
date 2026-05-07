'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Patient, Resource, Therapy, User } from '@prisma/client';
import { OVERRIDE_ROLES, type ConflictReport, type OverrideInput } from '@/lib/conflicts';
import { ConflictBanner } from './ConflictBanner';
import { OverrideModal } from './OverrideModal';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStartsAt: Date;
  therapists: Pick<User, 'id' | 'name' | 'color'>[];
  patients: Pick<Patient, 'id' | 'fullName'>[];
  therapies: Therapy[];
  resources: Resource[];
  currentUserRole: User['role'];
  onCreated: () => void;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function BookingDialog({
  open,
  onClose,
  defaultStartsAt,
  therapists,
  patients,
  therapies,
  resources,
  currentUserRole,
  onCreated,
}: Props) {
  const [therapistId, setTherapistId] = useState(therapists[0]?.id ?? '');
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [therapyId, setTherapyId] = useState(therapies[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(defaultStartsAt));
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<ConflictReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const therapy = useMemo(
    () => therapies.find((t) => t.id === therapyId),
    [therapies, therapyId],
  );

  const computedEndsAt = useMemo(() => {
    if (!therapy) return null;
    const start = new Date(`${startsAt}:00.000Z`);
    const end = new Date(start.getTime() + therapy.durationMinutes * 60_000);
    return end;
  }, [startsAt, therapy]);

  const canOverride = OVERRIDE_ROLES.includes(currentUserRole);

  // Auto-suggerisci risorse richieste dalla terapia.
  useEffect(() => {
    if (!therapy) return;
    const required = therapy.requiredResourceTypes;
    if (required.length === 0) {
      setResourceIds([]);
      return;
    }
    const pick = required
      .map((type) => resources.find((r) => r.type === type)?.id)
      .filter((id): id is string => Boolean(id));
    setResourceIds(pick);
  }, [therapy, resources]);

  // Live conflict check (debounced 300 ms).
  useEffect(() => {
    if (!open || !therapistId || !patientId || !therapyId || !computedEndsAt) {
      setReport(null);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch('/api/appointments/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId,
          patientId,
          therapyId,
          startsAt: new Date(`${startsAt}:00.000Z`).toISOString(),
          endsAt: computedEndsAt.toISOString(),
          resourceIds,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setReport(json.report);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [open, therapistId, patientId, therapyId, startsAt, resourceIds, computedEndsAt]);

  if (!open) return null;

  async function submit(override?: OverrideInput) {
    if (!computedEndsAt) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId,
          patientId,
          therapyId,
          startsAt: new Date(`${startsAt}:00.000Z`).toISOString(),
          endsAt: computedEndsAt.toISOString(),
          resourceIds,
          notes: notes || null,
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
        alert(`Errore: ${json.error ?? res.statusText}`);
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    submitting ||
    !computedEndsAt ||
    (report?.hasHardConflict ?? false);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
          <h2 className="text-lg font-semibold">Nuovo appuntamento</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Operatore</label>
              <select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              >
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Paziente</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Terapia</label>
              <select
                value={therapyId}
                onChange={(e) => setTherapyId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              >
                {therapies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.durationMinutes}&prime;)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Inizio</label>
              <input
                type="datetime-local"
                step={300}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
              {computedEndsAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Fine prevista: {computedEndsAt.toISOString().slice(11, 16)}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium">Macchinari richiesti</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {resources.map((r) => {
                  const selected = resourceIds.includes(r.id);
                  const conflictOnThis = report?.items.some(
                    (i) => i.kind === 'RESOURCE_BUSY' && i.resourceId === r.id,
                  );
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() =>
                        setResourceIds((prev) =>
                          prev.includes(r.id)
                            ? prev.filter((x) => x !== r.id)
                            : [...prev, r.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        selected
                          ? conflictOnThis
                            ? 'border-red-500 bg-red-100 text-red-800'
                            : 'border-blue-500 bg-blue-100 text-blue-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r.name}
                      {conflictOnThis && selected ? ' (occupato)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium">Note</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </div>
          </div>

          <div className="mt-4">
            <ConflictBanner
              report={report}
              canOverride={canOverride}
              onForce={() => setOverrideOpen(true)}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={submitDisabled}
              onClick={() => submit()}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Salvataggio…' : 'Conferma'}
            </button>
          </div>
        </div>
      </div>

      <OverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onConfirm={(override) => {
          setOverrideOpen(false);
          submit(override);
        }}
      />
    </>
  );
}
