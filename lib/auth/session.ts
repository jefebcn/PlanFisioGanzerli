import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'planfisio-dev-secret-change-in-prod';
const COOKIE_NAME = 'pfg_admin_session';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AdminSession {
  userId: string;
  role: string;
  name: string;
}

export function createSessionToken(session: AdminSession): string {
  const payload = JSON.stringify({ ...session, exp: Date.now() + MAX_AGE });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AdminSession | null {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, role: data.role, name: data.name };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

export { COOKIE_NAME };
