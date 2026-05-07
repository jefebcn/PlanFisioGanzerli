import type { AppointmentWithResources } from './events';
import { SOCKET_EVENTS, studioRoom } from './events';

const DEFAULT_STUDIO = 'default';

function dateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Dynamic import: socket.io non viene caricato a module-eval time (build).
// Viene caricato solo a request time, quando la funzione è effettivamente chiamata.
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

export function broadcastAppointmentCreated(appointment: AppointmentWithResources) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentCreated,
    studioRoom(DEFAULT_STUDIO, dateISO(appointment.startsAt)),
    { studioId: DEFAULT_STUDIO, appointment },
  );
}

export function broadcastAppointmentUpdated(appointment: AppointmentWithResources) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentUpdated,
    studioRoom(DEFAULT_STUDIO, dateISO(appointment.startsAt)),
    { studioId: DEFAULT_STUDIO, appointment },
  );
}

export function broadcastAppointmentDeleted(id: string, startsAt: Date) {
  void emitToRoom(
    SOCKET_EVENTS.appointmentDeleted,
    studioRoom(DEFAULT_STUDIO, dateISO(startsAt)),
    { studioId: DEFAULT_STUDIO, id },
  );
}
