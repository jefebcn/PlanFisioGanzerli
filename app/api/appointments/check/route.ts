import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { checkConflict } from '@/lib/conflicts';
import { checkConflictSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = checkConflictSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const report = await checkConflict(
    {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    },
    prisma,
  );
  return NextResponse.json({ report });
}
