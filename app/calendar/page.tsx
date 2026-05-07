'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoredPatient, StoredResource, StoredTherapy, UserRole } from '@/lib/storage/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { WeekView } from '@/components/calendar/WeekView';
import { BookingDialog } from '@/components/calendar/BookingDialog';
import { ConflictBanner } from '@/components/calendar/ConflictBanner';
import { OverrideModal } from '@/components/calendar/OverrideModal';
import type { AppointmentDTO } from '@/lib/agenda/types';
import { isoDate } from '@/lib/agenda/time';
import { useRealtimeAgenda } from '@/lib/realtime/useRealtimeAgenda';
import type { ConflictReport, OverrideInput } from '@/lib/conflicts/types';
import clsx from 'clsx';

type Therapist = { id: string; name: string; color: string };
type UserInfo = { id: string; name: string; role: UserRole; color: string };

type View = 'week' | 'day' | 'month';

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const [view, setView] = useState<View>('week');

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [patients, setPatients] = useState<Pick<StoredPatient, 'id' | 'fullName'>[]>([]);
  const [therapies, setTherapies] = useState<StoredTherapy[]>([]);
  const [resources, setResources] = useState<StoredResource[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [me, setMe] = useState<UserInfo | null>(null);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [visibleTherapists, setVisibleTherapists] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState<Date>(new Date());
  const [dialogTherapistId, setDialogTherapistId] = useState<string>('');

  const [moveError, setMoveError] = useState<ConflictReport | null>(null);
  const [overrideForMove, setOverrideForMove] = useState<{
    id: string; startsAt: Date; endsAt: Date; version: number;
  } | null>(null);

  const dateISO = isoDate(date);

  const refetchAppointments = useCallback(async () => {
    const from = new Date(date);
    from.setUTCDate(from.getUTCDate() - 7);
    const to = new Date(date);
    to.setUTCDate(to.getUTCDate() + 14);
    const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
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
      setVisibleTherapists(new Set(t.therapists.map((x: Therapist) => x.id)));
    });

    // Fetch all users for sidebar avatar quick-switch
    fetch('/api/therapists').then((r) => r.json()).then((d) => setAllUsers(d.therapists));
  }, []);

  useEffect(() => {
    refetchAppointments();
  }, [refetchAppointments]);

  useRealtimeAgenda('default', dateISO, {
    onCreated: () => refetchAppointments(),
    onUpdated: () => refetchAppointments(),
    onDeleted: (id) => setAppointments((prev) => prev.filter((a) => a.id !== id)),
  });

  const toggleTherapist = useCallback((id: string) => {
    setVisibleTherapists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSlotClick = useCallback((therapistId: string, startsAt: Date) => {
    setDialogTherapistId(therapistId || (therapists[0]?.id ?? ''));
    setDialogStart(startsAt);
    setDialogOpen(true);
  }, [therapists]);

  const handleMove = useCallback(
    async (appointmentId: string, newStartsAt: Date, version: number) => {
      const appt = appointments.find((a) => a.id === appointmentId);
      if (!appt) return;
      const dur = new Date(appt.endsAt).getTime() - new Date(appt.startsAt).getTime();
      const endsAt = new Date(newStartsAt.getTime() + dur);

      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startsAt: newStartsAt.toISOString(), endsAt: endsAt.toISOString(), expectedVersion: version }),
      });
      if (res.status === 409) {
        const json = await res.json();
        if (json.error === 'CONFLICT') {
          setMoveError(json.report);
          setOverrideForMove({ id: appointmentId, startsAt: newStartsAt, endsAt, version });
          refetchAppointments();
          return;
        }
        if (json.error === 'STALE_VERSION') {
          alert('Appuntamento modificato da un altro utente, ricarico…');
        }
      }
      refetchAppointments();
    },
    [appointments, refetchAppointments],
  );

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handlePatientRenamed = useCallback((patientId: string, newName: string) => {
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, fullName: newName } : p));
    setAppointments((prev) => prev.map((a) =>
      a.patientId === patientId ? { ...a, patient: { ...a.patient, fullName: newName } } : a,
    ));
  }, []);

  const handleSwitchUser = useCallback(async (userId: string) => {
    await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const res = await fetch('/api/me');
    const json = await res.json();
    setMe(json.user);
  }, []);

  const goToday = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    setDate(d);
  };

  const shiftWeek = (delta: number) => {
    setDate((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + delta * 7);
      return d;
    });
  };

  const monthLabel = date.toLocaleDateString('it-IT', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left sidebar */}
      <Sidebar
        selected={date}
        onDateSelect={setDate}
        therapists={therapists}
        visibleTherapists={visibleTherapists}
        onToggleTherapist={toggleTherapist}
        currentUserId={me?.id ?? null}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        appointments={appointments}
        onNewAppointment={() => {
          setDialogStart(new Date());
          setDialogOpen(true);
        }}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <h1 className="text-base font-semibold text-slate-900 capitalize">{monthLabel}</h1>

          <div className="flex items-center gap-1">
            <button onClick={() => shiftWeek(-1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">‹</button>
            <button onClick={goToday} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Oggi</button>
            <button onClick={() => shiftWeek(1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">›</button>
          </div>

          <div className="flex-1" />

          {/* Conflict banner (for move errors) */}
          {moveError && (
            <div className="max-w-xs">
              <ConflictBanner
                report={moveError}
                canOverride={me?.role === 'ADMIN' || me?.role === 'SECRETARY'}
                onForce={() => {/* handled by OverrideModal below */}}
              />
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 rounded-md capitalize transition-all',
                  view === v ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {v === 'month' ? 'Mese' : v === 'week' ? 'Sett.' : 'Giorno'}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setDialogStart(new Date()); setDialogOpen(true); }}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            + Nuovo
          </button>
        </header>

        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden">
          <WeekView
            date={date}
            appointments={appointments}
            visibleTherapists={visibleTherapists}
            onSlotClick={handleSlotClick}
            onMove={handleMove}
            onDelete={handleDelete}
            onPatientRenamed={handlePatientRenamed}
          />
        </div>
      </div>

      {/* Booking dialog */}
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

      {/* Override modal for move conflicts */}
      <OverrideModal
        open={Boolean(overrideForMove && moveError)}
        onClose={() => { setOverrideForMove(null); setMoveError(null); }}
        onConfirm={async (override: OverrideInput) => {
          if (!overrideForMove) return;
          await fetch(`/api/appointments/${overrideForMove.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startsAt: overrideForMove.startsAt.toISOString(),
              endsAt: overrideForMove.endsAt.toISOString(),
              expectedVersion: overrideForMove.version,
              override,
            }),
          });
          setOverrideForMove(null);
          setMoveError(null);
          refetchAppointments();
        }}
      />
    </div>
  );
}
