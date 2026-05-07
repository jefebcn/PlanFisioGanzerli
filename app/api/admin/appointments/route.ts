import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readStore } from '@/lib/storage/blobStore';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET() {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const store = await readStore();
  const appointments = store.appointments
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((a) => ({
      ...a,
      therapist: store.users.find((u) => u.id === a.therapistId) ?? null,
      patient: store.patients.find((p) => p.id === a.patientId) ?? null,
      therapy: store.therapies.find((t) => t.id === a.therapyId) ?? null,
      resourceBookings: a.resourceBookings.map((rb) => ({
        ...rb,
        resource: store.resources.find((r) => r.id === rb.resourceId) ?? null,
      })),
    }));

  return NextResponse.json({ appointments, users: store.users, patients: store.patients });
}
