import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  cookies().delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
