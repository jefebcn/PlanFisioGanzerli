'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from './events';
import type {
  AppointmentCreatedEvent,
  AppointmentDeletedEvent,
  AppointmentUpdatedEvent,
  AppointmentWithResources,
} from './events';

export interface RealtimeHandlers {
  onCreated?: (a: AppointmentWithResources) => void;
  onUpdated?: (a: AppointmentWithResources) => void;
  onDeleted?: (id: string) => void;
}

export function useRealtimeAgenda(
  studioId: string,
  dateISO: string,
  handlers: RealtimeHandlers,
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!dateISO) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const socket: Socket = io(url, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(SOCKET_EVENTS.joinRoom, { studioId, dateISO });
    });

    socket.on(SOCKET_EVENTS.appointmentCreated, (e: AppointmentCreatedEvent) => {
      handlersRef.current.onCreated?.(e.appointment);
    });
    socket.on(SOCKET_EVENTS.appointmentUpdated, (e: AppointmentUpdatedEvent) => {
      handlersRef.current.onUpdated?.(e.appointment);
    });
    socket.on(SOCKET_EVENTS.appointmentDeleted, (e: AppointmentDeletedEvent) => {
      handlersRef.current.onDeleted?.(e.id);
    });

    return () => {
      socket.emit(SOCKET_EVENTS.leaveRoom, { studioId, dateISO });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [studioId, dateISO]);
}
