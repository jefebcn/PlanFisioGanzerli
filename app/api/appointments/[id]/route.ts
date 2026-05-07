import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentActor } from '@/lib/auth';
import {
  ConflictError,
  OverrideNotAllowedError,
  StaleVersionError,
  moveAppointment,
} from '@/lib/conflicts';
import {
  broadcastAppointmentDeleted,
  broadcastAppointmentUpdated,
} from '@/lib/realtime/broadcast';
import { moveAppointmentSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const json = await request.json();
  const parsed = moveAppointmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const actor = await getCurrentActor();
    const updated = await moveAppointment(
      {
        appointmentId: params.id,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        expectedVersion: parsed.data.expectedVersion,
      },
      { actor, override: parsed.data.override },
    );

    const enriched = await prisma.appointment.findUniqueOrThrow({
      where: { id: updated.id },
      include: { resourceBookings: true },
    });
    broadcastAppointmentUpdated(enriched);

    return NextResponse.json({ appointment: enriched });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: 'CONFLICT', report: err.report },
        { status: 409 },
      );
    }
    if (err instanceof StaleVersionError) {
      return NextResponse.json({ error: 'STALE_VERSION' }, { status: 409 });
    }
    if (err instanceof OverrideNotAllowedError) {
      return NextResponse.json({ error: 'OVERRIDE_NOT_ALLOWED' }, { status: 403 });
    }
    // eslint-disable-next-line no-console
    console.error('PATCH /api/appointments error', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const existing = await prisma.appointment.findUnique({
    where: { id: params.id },
  });
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  await prisma.appointment.delete({ where: { id: params.id } });
  broadcastAppointmentDeleted(params.id, existing.startsAt);
  return NextResponse.json({ ok: true });
}
