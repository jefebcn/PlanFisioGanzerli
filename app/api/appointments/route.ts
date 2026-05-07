import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentActor } from '@/lib/auth';
import {
  bookAppointment,
  ConflictError,
  OverrideNotAllowedError,
} from '@/lib/conflicts';
import { broadcastAppointmentCreated } from '@/lib/realtime/broadcast';
import { createAppointmentSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const where =
    from && to
      ? { startsAt: { gte: new Date(from) }, endsAt: { lte: new Date(to) } }
      : {};

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      therapist: { select: { id: true, name: true, color: true } },
      patient: { select: { id: true, fullName: true } },
      therapy: { select: { id: true, name: true, durationMinutes: true } },
      resourceBookings: { include: { resource: true } },
      override: true,
    },
    orderBy: { startsAt: 'asc' },
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = createAppointmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const actor = await getCurrentActor();
    const data = parsed.data;
    const appointment = await bookAppointment(
      {
        therapistId: data.therapistId,
        patientId: data.patientId,
        therapyId: data.therapyId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        resourceIds: data.resourceIds,
        notes: data.notes ?? null,
      },
      { actor, override: data.override },
    );

    const enriched = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      include: { resourceBookings: true },
    });
    broadcastAppointmentCreated(enriched);

    return NextResponse.json({ appointment: enriched }, { status: 201 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: 'CONFLICT', report: err.report },
        { status: 409 },
      );
    }
    if (err instanceof OverrideNotAllowedError) {
      return NextResponse.json({ error: 'OVERRIDE_NOT_ALLOWED' }, { status: 403 });
    }
    // eslint-disable-next-line no-console
    console.error('POST /api/appointments error', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
