import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { readStore, writeStore } from '@/lib/storage/blobStore';
import { verifySessionToken, COOKIE_NAME, hashPassword } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET() {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  const store = await readStore();
  const users = store.users.map(({ passwordHash: _, ...u }) => u);
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { name, email, role, color, password } = await request.json();
  if (!name || !email || !role) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  const store = await readStore();
  if (store.users.find((u) => u.email === email)) {
    return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    color: color ?? '#6366f1',
    active: true,
    ...(password ? { passwordHash: hashPassword(password) } : {}),
  };
  store.users.push(user);
  await writeStore(store);
  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({ user: safe }, { status: 201 });
}
