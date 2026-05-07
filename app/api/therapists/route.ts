import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const therapists = await prisma.user.findMany({
    where: { role: 'THERAPIST', active: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ therapists });
}
