import type { DataStore, StoredAppointment } from '@/lib/storage/types';
import type { AppointmentDTO } from './types';

const FALLBACK_THERAPIST = { id: '', name: 'Operatore', color: '#94a3b8' };
const FALLBACK_PATIENT = { id: '', fullName: 'Paziente' };
const FALLBACK_THERAPY = { id: '', name: 'Terapia', durationMinutes: 0 };

export function joinAppointment(a: StoredAppointment, store: DataStore): AppointmentDTO {
  const therapist = store.users.find((u) => u.id === a.therapistId);
  const patient = store.patients.find((p) => p.id === a.patientId);
  const therapy = store.therapies.find((t) => t.id === a.therapyId);

  return {
    ...a,
    therapist: therapist
      ? { id: therapist.id, name: therapist.name, color: therapist.color }
      : { ...FALLBACK_THERAPIST, id: a.therapistId },
    patient: patient
      ? { id: patient.id, fullName: patient.fullName }
      : { ...FALLBACK_PATIENT, id: a.patientId },
    therapy: therapy
      ? { id: therapy.id, name: therapy.name, durationMinutes: therapy.durationMinutes }
      : { ...FALLBACK_THERAPY, id: a.therapyId },
    resourceBookings: a.resourceBookings.map((rb) => ({
      ...rb,
      resource: store.resources.find((r) => r.id === rb.resourceId)
        ?? { id: rb.resourceId, name: 'Risorsa', type: 'ROOM' as const, active: true, quantity: 1 },
    })),
    override: a.override ?? null,
  };
}
