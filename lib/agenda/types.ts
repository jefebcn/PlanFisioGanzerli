import type {
  Appointment,
  ConflictOverride,
  Patient,
  Resource,
  ResourceBooking,
  Therapy,
  User,
} from '@prisma/client';

export type AppointmentDTO = Appointment & {
  therapist: Pick<User, 'id' | 'name' | 'color'>;
  patient: Pick<Patient, 'id' | 'fullName'>;
  therapy: Pick<Therapy, 'id' | 'name' | 'durationMinutes'>;
  resourceBookings: (ResourceBooking & { resource: Resource })[];
  override: ConflictOverride | null;
};
