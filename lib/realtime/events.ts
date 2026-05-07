import type { Appointment, ResourceBooking } from '@prisma/client';
import type { ConflictReport } from '@/lib/conflicts';

export type AppointmentWithResources = Appointment & {
  resourceBookings: ResourceBooking[];
};

export interface AppointmentEventBase {
  studioId: string;
}

export interface AppointmentCreatedEvent extends AppointmentEventBase {
  appointment: AppointmentWithResources;
}

export interface AppointmentUpdatedEvent extends AppointmentEventBase {
  appointment: AppointmentWithResources;
}

export interface AppointmentDeletedEvent extends AppointmentEventBase {
  id: string;
}

export interface AppointmentRejectedEvent extends AppointmentEventBase {
  id: string;
  report: ConflictReport;
}

export interface AppointmentLockedEvent extends AppointmentEventBase {
  id: string;
  byUserId: string;
  byUserName: string;
  expiresAt: string;
}

export const SOCKET_EVENTS = {
  appointmentCreated: 'appointment:created',
  appointmentUpdated: 'appointment:updated',
  appointmentDeleted: 'appointment:deleted',
  appointmentRejected: 'appointment:rejected',
  appointmentLocked: 'appointment:locked',
  appointmentUnlocked: 'appointment:unlocked',
  joinRoom: 'room:join',
  leaveRoom: 'room:leave',
} as const;

export function studioRoom(studioId: string, dateISO: string): string {
  return `studio:${studioId}:date:${dateISO.slice(0, 10)}`;
}
