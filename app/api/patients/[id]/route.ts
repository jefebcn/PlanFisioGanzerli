import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storage/blobStore';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { fullName } = await request.json();
  if (!fullName?.trim()) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  const store = await readStore();
  const idx = store.patients.findIndex((p) => p.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  store.patients[idx] = { ...store.patients[idx], fullName: fullName.trim() };
  await writeStore(store);
  return NextResponse.json({ patient: store.patients[idx] });
}
