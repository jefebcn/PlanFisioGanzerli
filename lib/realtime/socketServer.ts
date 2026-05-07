import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import { SOCKET_EVENTS, studioRoom } from './events';

let io: IOServer | null = null;

export function initSocketIO(httpServer: HttpServer): IOServer {
  if (io) return io;
  io = new IOServer(httpServer, {
    path: '/api/socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket: Socket) => {
    socket.on(SOCKET_EVENTS.joinRoom, ({ studioId, dateISO }: { studioId: string; dateISO: string }) => {
      if (!studioId || !dateISO) return;
      socket.join(studioRoom(studioId, dateISO));
    });

    socket.on(SOCKET_EVENTS.leaveRoom, ({ studioId, dateISO }: { studioId: string; dateISO: string }) => {
      if (!studioId || !dateISO) return;
      socket.leave(studioRoom(studioId, dateISO));
    });
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}

export function broadcast<T>(event: string, payload: T & { studioId?: string }, dateISO?: string) {
  if (!io) return;
  if (payload.studioId && dateISO) {
    io.to(studioRoom(payload.studioId, dateISO)).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
