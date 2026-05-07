import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getCurrentActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getCurrentActor();
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, role: true, color: true },
  });
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'USER_ID_REQUIRED' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  cookies().set('pfg_actor', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
}
