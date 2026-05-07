import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readStore, writeStore } from '@/lib/storage/blobStore';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const body = await request.json();
  const store = await readStore();
  const idx = store.appointments.findIndex((a) => a.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  store.appointments[idx] = {
    ...store.appointments[idx],
    ...body,
    id: params.id,
    updatedAt: new Date().toISOString(),
    version: store.appointments[idx].version + 1,
  };
  await writeStore(store);
  return NextResponse.json({ appointment: store.appointments[idx] });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const store = await readStore();
  const idx = store.appointments.findIndex((a) => a.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  store.appointments.splice(idx, 1);
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
