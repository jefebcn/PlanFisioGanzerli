'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Patient, Resource, Therapy, UserRole } from '@prisma/client';
import { CalendarBoard } from '@/components/calendar/CalendarBoard';
import { BookingDialog } from '@/components/calendar/BookingDialog';
import { ConflictBanner } from '@/components/calendar/ConflictBanner';
import { OverrideModal } from '@/components/calendar/OverrideModal';
import type { AppointmentDTO } from '@/lib/agenda/types';
import { isoDate } from '@/lib/agenda/time';
import { useRealtimeAgenda } from '@/lib/realtime/useRealtimeAgenda';
import type { ConflictReport, OverrideInput } from '@/lib/conflicts';

type Therapist = { id: string; name: string; color: string };

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [patients, setPatients] = useState<Pick<Patient, 'id' | 'fullName'>[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [me, setMe] = useState<{ id: string; name: string; role: UserRole } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState<Date>(new Date());

  const [moveError, setMoveError] = useState<{
    appointmentId: string;
    report: ConflictReport;
  } | null>(null);
  const [overrideForMove, setOverrideForMove] = useState<{
    appointmentId: string;
    startsAt: Date;
    endsAt: Date;
    expectedVersion: number;
  } | null>(null);

  const dateISO = isoDate(date);

  const refetchAppointments = useCallback(async () => {
    const from = new Date(date);
    const to = new Date(date);
    to.setUTCHours(23, 59, 59, 999);
    const url = `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setAppointments(json.appointments);
    }
  }, [date]);

  useEffect(() => {
    Promise.all([
      fetch('/api/therapists').then((r) => r.json()),
      fetch('/api/patients').then((r) => r.json()),
      fetch('/api/therapies').then((r) => r.json()),
      fetch('/api/resources').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
    ]).then(([t, p, th, r, m]) => {
      setTherapists(t.therapists);
      setPatients(p.patients);
      setTherapies(th.therapies);
      setResources(r.resources);
      setMe(m.user);
    });
  }, []);

  useEffect(() => {
    refetchAppointments();
  }, [refetchAppointments]);

  useRealtimeAgenda('default', dateISO, {
    onCreated: () => refetchAppointments(),
    onUpdated: () => refetchAppointments(),
    onDeleted: (id) =>
      setAppointments((prev) => prev.filter((a) => a.id !== id)),
  });

  const conflictIds = useMemo<Set<string>>(() => new Set(), []);

  const handleSlotClick = useCallback((therapistId: string, startsAt: Date) => {
    setDialogStart(startsAt);
    setDialogOpen(true);
  }, []);

  const handleMove = useCallback(
    async (appointmentId: string, newStartsAt: Date, expectedVersion: number) => {
      const appt = appointments.find((a) => a.id === appointmentId);
      if (!appt) return;
      const duration =
        new Date(appt.endsAt).getTime() - new Date(appt.startsAt).getTime();
      const endsAt = new Date(newStartsAt.getTime() + duration);

      const doMove = async (override?: OverrideInput) => {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startsAt: newStartsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            expectedVersion,
            override,
          }),
        });
        if (res.status === 409) {
          const json = await res.json();
          if (json.error === 'CONFLICT') {
            setMoveError({ appointmentId, report: json.report });
            setOverrideForMove({
              appointmentId,
              startsAt: newStartsAt,
              endsAt,
              expectedVersion,
            });
            // Ricarica per ripristinare posizione visiva.
            refetchAppointments();
            return;
          }
          if (json.error === 'STALE_VERSION') {
            alert('Appuntamento modificato da un altro utente, ricarico…');
            refetchAppointments();
            return;
          }
        }
        if (!res.ok) {
          alert('Errore spostamento');
          refetchAppointments();
          return;
        }
        refetchAppointments();
      };

      await doMove();
    },
    [appointments, refetchAppointments],
  );

  const goToday = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    setDate(d);
  };
  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + delta);
    setDate(d);
  };

  return (
    <main className="mx-auto max-w-screen-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda — {date.toISOString().slice(0, 10)}</h1>
          {me && (
            <p className="text-sm text-slate-600">
              Connesso come <strong>{me.name}</strong> ({me.role})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          >
            ←
          </button>
          <button
            onClick={goToday}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          >
            Oggi
          </button>
          <button
            onClick={() => shiftDay(1)}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          >
            →
          </button>
        </div>
      </header>

      {moveError && (
        <div className="mb-3">
          <ConflictBanner
            report={moveError.report}
            canOverride={me?.role === 'ADMIN' || me?.role === 'SECRETARY'}
            onForce={() => {
              if (!overrideForMove) return;
              // Gestito tramite OverrideModal sotto.
            }}
          />
        </div>
      )}

      <CalendarBoard
        date={date}
        therapists={therapists}
        appointments={appointments}
        conflictIds={conflictIds}
        onSlotClick={handleSlotClick}
        onMove={handleMove}
      />

      {dialogOpen && me && (
        <BookingDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          defaultStartsAt={dialogStart}
          therapists={therapists}
          patients={patients}
          therapies={therapies}
          resources={resources}
          currentUserRole={me.role}
          onCreated={refetchAppointments}
        />
      )}

      <OverrideModal
        open={Boolean(overrideForMove && moveError)}
        onClose={() => {
          setOverrideForMove(null);
          setMoveError(null);
        }}
        onConfirm={async (override) => {
          if (!overrideForMove) return;
          const res = await fetch(`/api/appointments/${overrideForMove.appointmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startsAt: overrideForMove.startsAt.toISOString(),
              endsAt: overrideForMove.endsAt.toISOString(),
              expectedVersion: overrideForMove.expectedVersion,
              override,
            }),
          });
          setOverrideForMove(null);
          setMoveError(null);
          if (!res.ok) alert('Errore override');
          refetchAppointments();
        }}
      />
    </main>
  );
}
