import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const therapies = await prisma.therapy.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ therapies });
}
