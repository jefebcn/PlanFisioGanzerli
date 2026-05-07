import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readStore } from '@/lib/storage/blobStore';
import { createSessionToken, verifyPassword, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Credenziali mancanti' }, { status: 400 });
  }

  // Check env-var credentials first (highest priority)
  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envEmail && envPassword && email === envEmail && password === envPassword) {
    const store = await readStore();
    const admin = store.users.find((u) => u.role === 'ADMIN') ?? store.users[0];
    const token = createSessionToken({ userId: admin.id, role: admin.role, name: admin.name });
    cookies().set(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return NextResponse.json({ ok: true, user: { id: admin.id, name: admin.name, role: admin.role } });
  }

  // Check stored user credentials
  const store = await readStore();
  const user = store.users.find((u) => u.email === email && (u.role === 'ADMIN' || u.role === 'SECRETARY'));
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
  }

  const token = createSessionToken({ userId: user.id, role: user.role, name: user.name });
  cookies().set(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
}
