import { cookies } from 'next/headers';
import { prisma } from './db';
import type { BookingActor } from './conflicts';

const ACTOR_COOKIE = 'pfg_actor';

export async function getCurrentActor(): Promise<BookingActor> {
  const id = cookies().get(ACTOR_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user && user.active) return { id: user.id, role: user.role };
  }
  // Fallback demo: primo utente attivo (per sviluppo locale senza auth completa).
  const fallback = await prisma.user.findFirst({ where: { active: true } });
  if (!fallback) throw new Error('Nessun utente disponibile, eseguire il seed');
  return { id: fallback.id, role: fallback.role };
}
