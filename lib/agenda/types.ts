import type {
  StoredAppointment,
  StoredConflictOverride,
  StoredResource,
  StoredResourceBooking,
  StoredTherapy,
  StoredUser,
  StoredPatient,
} from '@/lib/storage/types';

export type AppointmentDTO = Omit<StoredAppointment, 'override' | 'resourceBookings'> & {
  therapist: Pick<StoredUser, 'id' | 'name' | 'color'>;
  patient: Pick<StoredPatient, 'id' | 'fullName'>;
  therapy: Pick<StoredTherapy, 'id' | 'name' | 'durationMinutes'>;
  resourceBookings: (StoredResourceBooking & { resource: StoredResource })[];
  override: StoredConflictOverride | null;
};
