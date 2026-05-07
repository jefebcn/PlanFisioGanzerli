import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { readStore, writeStore } from '@/lib/storage/blobStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await readStore();
  const therapists = store.users
    .filter((u) => u.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id, name: u.name, color: u.color, role: u.role }));
  return NextResponse.json({ therapists });
}

export async function POST(request: Request) {
  const { name, color, role, email } = await request.json();
  if (!name || !color) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const store = await readStore();
  const user = {
    id: crypto.randomUUID(),
    name,
    color: color ?? '#6366f1',
    role: role ?? 'THERAPIST',
    email: email ?? `${name.toLowerCase().replace(/\s+/g, '.')}@planfisio.it`,
    active: true,
  };
  store.users.push(user);
  await writeStore(store);
  return NextResponse.json({ user }, { status: 201 });
}
