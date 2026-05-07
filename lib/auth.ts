import { cookies } from 'next/headers';
import { readStore } from './storage/blobStore';
import type { BookingActor } from './conflicts';

const ACTOR_COOKIE = 'pfg_actor';

export async function getCurrentActor(): Promise<BookingActor> {
  const store = await readStore();
  const id = cookies().get(ACTOR_COOKIE)?.value;
  if (id) {
    const user = store.users.find((u) => u.id === id && u.active);
    if (user) return { id: user.id, role: user.role };
  }
  const fallback = store.users.find((u) => u.active);
  if (!fallback) throw new Error('Nessun utente disponibile');
  return { id: fallback.id, role: fallback.role };
}
