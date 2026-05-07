import { NextResponse } from 'next/server';
import { readStore } from '@/lib/storage/blobStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await readStore();
  const resources = store.resources
    .filter((r) => r.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ resources });
}
