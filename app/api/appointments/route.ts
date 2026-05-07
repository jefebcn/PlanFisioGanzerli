import { NextResponse } from 'next/server';
import { readStore } from '@/lib/storage/blobStore';
import { getCurrentActor } from '@/lib/auth';
import { bookAppointment, ConflictError, OverrideNotAllowedError } from '@/lib/conflicts';
import { broadcastAppointmentCreated } from '@/lib/realtime/broadcast';
import { createAppointmentSchema } from '@/lib/validation';
import { joinAppointment } from '@/lib/agenda/joinAppointment';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const store = await readStore();

  let appts = store.appointments;
  if (from && to) {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    appts = appts.filter(
      (a) => new Date(a.startsAt).getTime() >= fromMs && new Date(a.endsAt).getTime() <= toMs,
    );
  }

  const appointments = appts
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((a) => joinAppointment(a, store));

  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = createAppointmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const actor = await getCurrentActor();
    const data = parsed.data;
    const appointment = await bookAppointment(
      {
        therapistId: data.therapistId,
        patientId: data.patientId ?? '',
        newPatientName: data.newPatientName,
        therapyId: data.therapyId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        resourceIds: data.resourceIds,
        notes: data.notes ?? null,
      },
      { actor, override: data.override },
    );

    broadcastAppointmentCreated(appointment);
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: 'CONFLICT', report: err.report }, { status: 409 });
    }
    if (err instanceof OverrideNotAllowedError) {
      return NextResponse.json({ error: 'OVERRIDE_NOT_ALLOWED' }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('POST /api/appointments error', err);
    return NextResponse.json({ error: 'INTERNAL', message }, { status: 500 });
  }
}
