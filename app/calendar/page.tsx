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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleCreated = useCallback((appointment?: AppointmentDTO) => {
    // Optimistic merge: insert the new appointment directly so the user sees it
    // immediately, even if the next blob read returns stale data due to CDN
    // propagation. A background refetch reconciles state shortly after.
    if (appointment) {
      setAppointments((prev) => {
        if (prev.some((a) => a.id === appointment.id)) return prev;
        return [...prev, appointment].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      });
    }
    refetchAppointments();
  }, [refetchAppointments]);

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
    setDialogStart(startsAt);
    setDialogOpen(true);
  }, []);

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
      } else if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.appointment) {
          setAppointments((prev) => prev.map((a) => a.id === json.appointment.id ? json.appointment : a));
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
      a.patientId === patientId
        ? { ...a, patient: { id: a.patient?.id ?? patientId, fullName: newName } }
        : a,
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
      {/* Sidebar — drawer on mobile, fixed on desktop */}
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
          setSidebarOpen(false);
        }}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main area — offset on desktop to make room for the always-visible sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 md:px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0"
            aria-label="Apri menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>

          <h1 className="text-sm font-semibold text-slate-900 capitalize flex-1 md:flex-none">{monthLabel}</h1>

          <div className="flex items-center gap-1">
            <button onClick={() => shiftWeek(-1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">‹</button>
            <button onClick={goToday} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Oggi</button>
            <button onClick={() => shiftWeek(1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">›</button>
          </div>

          <div className="flex-1 hidden md:block" />

          {/* Conflict banner for move errors — desktop only inline */}
          {moveError && (
            <div className="max-w-xs hidden md:block">
              <ConflictBanner
                report={moveError}
                canOverride={me?.role === 'ADMIN' || me?.role === 'SECRETARY'}
                onForce={() => {/* handled by OverrideModal below */}}
              />
            </div>
          )}

          {/* View toggle — desktop only */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
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

          {/* + Nuovo — desktop */}
          <button
            onClick={() => { setDialogStart(new Date()); setDialogOpen(true); }}
            className="hidden md:flex px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            + Nuovo
          </button>
        </header>

        {/* Move-conflict banner on mobile (below header) */}
        {moveError && (
          <div className="md:hidden px-3 py-2 bg-white border-b border-slate-200">
            <ConflictBanner
              report={moveError}
              canOverride={me?.role === 'ADMIN' || me?.role === 'SECRETARY'}
              onForce={() => {}}
            />
          </div>
        )}

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

      {/* Floating action button — mobile only */}
      <button
        onClick={() => { setDialogStart(new Date()); setDialogOpen(true); }}
        className="md:hidden fixed bottom-6 right-5 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-3xl shadow-xl flex items-center justify-center z-30 transition-colors active:scale-95"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        aria-label="Nuovo appuntamento"
      >
        +
      </button>

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
          onCreated={handleCreated}
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
