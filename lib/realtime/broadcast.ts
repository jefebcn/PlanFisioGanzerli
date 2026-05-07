type BroadcastableAppointment = { startsAt: string; [k: string]: unknown };
import { SOCKET_EVENTS, studioRoom } from './events';

const DEFAULT_STUDIO = 'default';

async function emitToRoom(event: string, room: string, payload: object) {
  try {
    const { getIO } = await import('./socketServer');
    const io = getIO();
    if (!io) return;
    io.to(room).emit(event, payload);
  } catch {
    // Socket.IO non disponibile (serverless, build worker, test)
  }
}

export function broadcastAppointmentCreated(appointment: BroadcastableAppointment) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentCreated,
    studioRoom(DEFAULT_STUDIO, appointment.startsAt.slice(0, 10)),
    { studioId: DEFAULT_STUDIO, appointment },
  );
}

export function broadcastAppointmentUpdated(appointment: BroadcastableAppointment) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentUpdated,
    studioRoom(DEFAULT_STUDIO, appointment.startsAt.slice(0, 10)),
    { studioId: DEFAULT_STUDIO, appointment },
  );
}

export function broadcastAppointmentDeleted(id: string, startsAt: string) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentDeleted,
    studioRoom(DEFAULT_STUDIO, startsAt.slice(0, 10)),
    { studioId: DEFAULT_STUDIO, id },
  );
}
