import type { AppointmentWithResources } from './events';
import { SOCKET_EVENTS, studioRoom } from './events';
import { getIO } from './socketServer';

const DEFAULT_STUDIO = 'default';

function dateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function broadcastAppointmentCreated(appointment: AppointmentWithResources) {
  const io = getIO();
  if (!io) return;
  const room = studioRoom(DEFAULT_STUDIO, dateISO(appointment.startsAt));
  io.to(room).emit(SOCKET_EVENTS.appointmentCreated, { studioId: DEFAULT_STUDIO, appointment });
}

export function broadcastAppointmentUpdated(appointment: AppointmentWithResources) {
  const io = getIO();
  if (!io) return;
  const room = studioRoom(DEFAULT_STUDIO, dateISO(appointment.startsAt));
  io.to(room).emit(SOCKET_EVENTS.appointmentUpdated, { studioId: DEFAULT_STUDIO, appointment });
}

export function broadcastAppointmentDeleted(id: string, startsAt: Date) {
  const io = getIO();
  if (!io) return;
  const room = studioRoom(DEFAULT_STUDIO, dateISO(startsAt));
  io.to(room).emit(SOCKET_EVENTS.appointmentDeleted, { studioId: DEFAULT_STUDIO, id });
}
