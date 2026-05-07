import type { DataStore } from '@/lib/storage/types';
import type { CheckConflictInput, ConflictItem, ConflictReport } from './types';

const BUSINESS_HOURS = { start: 7, end: 21 };
const PATIENT_CONFLICT_HARD = process.env.STRICT_PATIENT_CONFLICTS === 'true';

function fmt(iso: string): string {
  return iso.slice(11, 16);
}

export async function checkConflict(
  input: CheckConflictInput,
  store: DataStore,
): Promise<ConflictReport> {
  const items: ConflictItem[] = [];

  if (input.endsAt <= input.startsAt) {
    return {
      hasHardConflict: true,
      hasSoftConflict: false,
      items: [{
        kind: 'INVALID_RANGE',
        severity: 'HARD',
        message: 'Orario di fine deve essere successivo a quello di inizio',
      }],
    };
  }

  const startHour = input.startsAt.getUTCHours();
  const endHour = input.endsAt.getUTCHours();
  if (startHour < BUSINESS_HOURS.start || endHour > BUSINESS_HOURS.end) {
    items.push({
      kind: 'OUTSIDE_BUSINESS_HOURS',
      severity: 'SOFT',
      message: `Orario fuori dalla fascia ${BUSINESS_HOURS.start}:00–${BUSINESS_HOURS.end}:00`,
    });
  }

  const startMs = input.startsAt.getTime();
  const endMs = input.endsAt.getTime();
  const excl = input.appointmentId;

  const overlapping = store.appointments.filter(
    (a) =>
      a.status === 'SCHEDULED' &&
      a.id !== excl &&
      new Date(a.startsAt).getTime() < endMs &&
      new Date(a.endsAt).getTime() > startMs,
  );

  const therapistBusy = overlapping.find((a) => a.therapistId === input.therapistId);
  if (therapistBusy) {
    const patient = store.patients.find((p) => p.id === therapistBusy.patientId);
    items.push({
      kind: 'THERAPIST_BUSY',
      severity: 'HARD',
      message: `Operatore già impegnato con ${patient?.fullName ?? '?'} (${fmt(therapistBusy.startsAt)}–${fmt(therapistBusy.endsAt)})`,
      conflictingId: therapistBusy.id,
    });
  }

  const patientBusy = overlapping.find((a) => a.patientId === input.patientId);
  if (patientBusy) {
    const therapist = store.users.find((u) => u.id === patientBusy.therapistId);
    items.push({
      kind: 'PATIENT_DOUBLE_BOOK',
      severity: PATIENT_CONFLICT_HARD ? 'HARD' : 'SOFT',
      message: `Paziente già in agenda con ${therapist?.name ?? '?'} (${fmt(patientBusy.startsAt)}–${fmt(patientBusy.endsAt)})`,
      conflictingId: patientBusy.id,
    });
  }

  if (input.resourceIds.length > 0) {
    for (const appt of overlapping) {
      for (const rb of appt.resourceBookings) {
        if (input.resourceIds.includes(rb.resourceId)) {
          const resource = store.resources.find((r) => r.id === rb.resourceId);
          const therapist = store.users.find((u) => u.id === appt.therapistId);
          items.push({
            kind: 'RESOURCE_BUSY',
            severity: 'HARD',
            message: `Risorsa ${resource?.name ?? '?'} già occupata da ${therapist?.name ?? '?'} (${fmt(rb.startsAt)}–${fmt(rb.endsAt)})`,
            conflictingId: appt.id,
            resourceId: rb.resourceId,
          });
        }
      }
    }
  }

  return {
    hasHardConflict: items.some((i) => i.severity === 'HARD'),
    hasSoftConflict: items.some((i) => i.severity === 'SOFT'),
    items,
  };
}
