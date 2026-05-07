import { NextResponse } from 'next/server';
import { readStore } from '@/lib/storage/blobStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await readStore();
  const therapies = store.therapies.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ therapies });
}
