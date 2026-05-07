import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { readStore, writeStore } from '@/lib/storage/blobStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await readStore();
  const patients = store.patients
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((p) => ({ id: p.id, fullName: p.fullName }));
  return NextResponse.json({ patients });
}

export async function POST(request: Request) {
  const { fullName, phone, email } = await request.json();
  if (!fullName) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const store = await readStore();
  const patient = { id: crypto.randomUUID(), fullName, phone, email };
  store.patients.push(patient);
  await writeStore(store);
  return NextResponse.json({ patient }, { status: 201 });
}
