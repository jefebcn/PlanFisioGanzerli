import type { Appointment, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { checkConflict } from './checkConflict';
import {
  ConflictError,
  OverrideNotAllowedError,
  StaleVersionError,
} from './errors';
import {
  OVERRIDE_ROLES,
  type BookingActor,
  type CheckConflictInput,
  type OverrideInput,
} from './types';

export interface BookAppointmentInput extends CheckConflictInput {
  notes?: string | null;
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

function dayBucketKey(therapistId: string, startsAt: Date): string {
  const day = startsAt.toISOString().slice(0, 10);
  return `${therapistId}:${day}`;
}

async function acquireDayLock(
  tx: Prisma.TransactionClient,
  therapistId: string,
  startsAt: Date,
): Promise<void> {
  const key = dayBucketKey(therapistId, startsAt);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

function assertCanOverride(
  ctx: BookingContext,
  reportItems: { severity: 'HARD' | 'SOFT' }[],
): void {
  if (!ctx.override) throw new OverrideNotAllowedError();
  if (!OVERRIDE_ROLES.includes(ctx.actor.role)) {
    throw new OverrideNotAllowedError();
  }
  // Hard conflicts SOLO su risorse o operatori, non su range invalidi
  // (un range invalido va corretto, non forzato).
  // Già garantito da checkConflict che ritorna HARD su INVALID_RANGE.
  void reportItems;
}

export async function bookAppointment(
  input: BookAppointmentInput,
  ctx: BookingContext,
): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    await acquireDayLock(tx, input.therapistId, input.startsAt);

    const report = await checkConflict(input, tx);

    if (report.hasHardConflict) {
      const invalidRange = report.items.find((i) => i.kind === 'INVALID_RANGE');
      if (invalidRange) throw new ConflictError(report);
      assertCanOverride(ctx, report.items);
    }

    const appointment = await tx.appointment.create({
      data: {
        therapistId: input.therapistId,
        patientId: input.patientId,
        therapyId: input.therapyId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        notes: input.notes ?? null,
        createdById: ctx.actor.id,
        resourceBookings: {
          create: input.resourceIds.map((resourceId) => ({
            resourceId,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          })),
        },
        ...(ctx.override
          ? {
              override: {
                create: {
                  reason: ctx.override.reason,
                  note: ctx.override.note,
                  approvedById: ctx.actor.id,
                },
              },
            }
          : {}),
      },
    });

    return appointment;
  });
}

export async function moveAppointment(
  input: MoveAppointmentInput,
  ctx: BookingContext,
): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { resourceBookings: true },
    });
    if (!current) throw new Error(`Appointment ${input.appointmentId} non trovato`);

    await acquireDayLock(tx, current.therapistId, input.startsAt);

    const checkInput: CheckConflictInput = {
      appointmentId: current.id,
      therapistId: current.therapistId,
      patientId: current.patientId,
      therapyId: current.therapyId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      resourceIds: current.resourceBookings.map((rb) => rb.resourceId),
    };
    const report = await checkConflict(checkInput, tx);

    if (report.hasHardConflict) {
      const invalidRange = report.items.find((i) => i.kind === 'INVALID_RANGE');
      if (invalidRange) throw new ConflictError(report);
      assertCanOverride(ctx, report.items);
    }

    // Optimistic locking: aggiorno solo se la version corrisponde.
    const updateResult = await tx.appointment.updateMany({
      where: { id: current.id, version: input.expectedVersion },
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        version: { increment: 1 },
      },
    });
    if (updateResult.count === 0) throw new StaleVersionError(current.id);

    await tx.resourceBooking.updateMany({
      where: { appointmentId: current.id },
      data: { startsAt: input.startsAt, endsAt: input.endsAt },
    });

    const updated = await tx.appointment.findUniqueOrThrow({
      where: { id: current.id },
    });
    return updated;
  });
}
