import crypto from 'crypto';
import { readStore, writeStore } from '@/lib/storage/blobStore';
import type { StoredAppointment } from '@/lib/storage/types';
import { joinAppointment } from '@/lib/agenda/joinAppointment';
import type { AppointmentDTO } from '@/lib/agenda/types';
import { checkConflict } from './checkConflict';
import { ConflictError, OverrideNotAllowedError, StaleVersionError } from './errors';
import {
  OVERRIDE_ROLES,
  type BookingActor,
  type CheckConflictInput,
  type OverrideInput,
} from './types';

export interface BookAppointmentInput extends CheckConflictInput {
  notes?: string | null;
  newPatientName?: string;
}

export interface BookingContext {
  actor: BookingActor;
  override?: OverrideInput;
}

export interface MoveAppointmentInput {
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
  expectedVersion: number;
}

function checkOverride(ctx: BookingContext): void {
  if (!ctx.override) throw new ConflictError({ hasHardConflict: true, hasSoftConflict: false, items: [] });
  if (!OVERRIDE_ROLES.includes(ctx.actor.role)) throw new OverrideNotAllowedError();
}

export async function bookAppointment(
  input: BookAppointmentInput,
  ctx: BookingContext,
): Promise<AppointmentDTO> {
  const store = await readStore();

  // Create patient atomically in the same read-write cycle to avoid race conditions
  let patientId = input.patientId;
  if (input.newPatientName?.trim()) {
    const newPatient = { id: crypto.randomUUID(), fullName: input.newPatientName.trim() };
    store.patients.push(newPatient);
    patientId = newPatient.id;
  }

  const report = await checkConflict({ ...input, patientId }, store);

  if (report.hasHardConflict) {
    if (report.items.find((i) => i.kind === 'INVALID_RANGE')) throw new ConflictError(report);
    if (!ctx.override) throw new ConflictError(report);
    if (!OVERRIDE_ROLES.includes(ctx.actor.role)) throw new OverrideNotAllowedError();
  }

  const now = new Date().toISOString();
  const appointment: StoredAppointment = {
    id: crypto.randomUUID(),
    therapistId: input.therapistId,
    patientId,
    therapyId: input.therapyId,
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    status: 'SCHEDULED',
    notes: input.notes ?? undefined,
    createdById: ctx.actor.id,
    version: 0,
    resourceBookings: input.resourceIds.map((resourceId) => ({
      id: crypto.randomUUID(),
      resourceId,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt.toISOString(),
    })),
    ...(ctx.override
      ? {
          override: {
            reason: ctx.override.reason,
            note: ctx.override.note,
            approvedById: ctx.actor.id,
            createdAt: now,
          },
        }
      : {}),
    createdAt: now,
    updatedAt: now,
  };

  store.appointments.push(appointment);
  await writeStore(store);
  return joinAppointment(appointment, store);
}

export async function moveAppointment(
  input: MoveAppointmentInput,
  ctx: BookingContext,
): Promise<AppointmentDTO> {
  const store = await readStore();
  const idx = store.appointments.findIndex((a) => a.id === input.appointmentId);
  if (idx === -1) throw new Error(`Appointment ${input.appointmentId} non trovato`);
  const current = store.appointments[idx];

  if (current.version !== input.expectedVersion) throw new StaleVersionError(current.id);

  const checkInput: CheckConflictInput = {
    appointmentId: current.id,
    therapistId: current.therapistId,
    patientId: current.patientId,
    therapyId: current.therapyId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    resourceIds: current.resourceBookings.map((rb) => rb.resourceId),
  };

  const report = await checkConflict(checkInput, store);

  if (report.hasHardConflict) {
    if (report.items.find((i) => i.kind === 'INVALID_RANGE')) throw new ConflictError(report);
    if (!ctx.override) throw new ConflictError(report);
    if (!OVERRIDE_ROLES.includes(ctx.actor.role)) throw new OverrideNotAllowedError();
  }

  const updated: StoredAppointment = {
    ...current,
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    resourceBookings: current.resourceBookings.map((rb) => ({
      ...rb,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt.toISOString(),
    })),
    ...(ctx.override
      ? {
          override: {
            reason: ctx.override.reason,
            note: ctx.override.note,
            approvedById: ctx.actor.id,
            createdAt: new Date().toISOString(),
          },
        }
      : {}),
  };

  store.appointments[idx] = updated;
  await writeStore(store);
  return joinAppointment(updated, store);
}
