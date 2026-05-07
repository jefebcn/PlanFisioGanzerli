import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const patients = await prisma.patient.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  return NextResponse.json({ patients });
}
