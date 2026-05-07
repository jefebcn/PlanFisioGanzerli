import fs from 'fs';
import path from 'path';
import type { DataStore } from './types';
import { DEFAULT_DATA } from './defaultData';

const IS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_PATH = path.join(process.cwd(), '.planfisio-store.json');
const BLOB_PATH = 'planfisio/store.json';

export async function readStore(): Promise<DataStore> {
  if (IS_BLOB) return readFromBlob();
  return readFromLocal();
}

export async function writeStore(data: DataStore): Promise<void> {
  if (IS_BLOB) {
    await writeToBlob(data);
  } else {
    writeToLocal(data);
  }
}

async function readFromBlob(): Promise<DataStore> {
  try {
    const mod = await import('@vercel/blob');
    // v2 SDK exposes get() for both public and private blobs.
    if (typeof mod.get === 'function') {
      try {
        const result = await mod.get(BLOB_PATH, { access: 'private' as const });
        if (result && (result as any).blob) {
          const text = await (result as any).blob.text();
          return mergeWithDefaults(JSON.parse(text) as DataStore);
        }
      } catch {
        // Fall through to list+fetch fallback
      }
    }
    // Fallback for older SDK or different store config: list + fetch
    const { blobs } = await mod.list({ prefix: BLOB_PATH });
    const blob = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!blob) return structuredClone(DEFAULT_DATA);
    const res = await fetch(blob.url + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: process.env.BLOB_READ_WRITE_TOKEN
        ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
        : undefined,
    });
    if (!res.ok) return structuredClone(DEFAULT_DATA);
    return mergeWithDefaults((await res.json()) as DataStore);
  } catch (err) {
    console.error('[blobStore] readFromBlob failed', err);
    return structuredClone(DEFAULT_DATA);
  }
}

async function writeToBlob(data: DataStore): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'private' as const,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  } as Parameters<typeof put>[2]);
}

function readFromLocal(): DataStore {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return structuredClone(DEFAULT_DATA);
    const raw = fs.readFileSync(LOCAL_PATH, 'utf-8');
    return mergeWithDefaults(JSON.parse(raw) as DataStore);
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function writeToLocal(data: DataStore): void {
  try {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2));
  } catch {
    // ignore write errors in read-only environments
  }
}

function mergeWithDefaults(data: DataStore): DataStore {
  const merged = { ...DEFAULT_DATA, ...data };
  for (const def of DEFAULT_DATA.users) {
    if (!merged.users.find((u) => u.id === def.id)) merged.users.push(def);
  }
  for (const def of DEFAULT_DATA.resources) {
    if (!merged.resources.find((r) => r.id === def.id)) merged.resources.push(def);
  }
  for (const def of DEFAULT_DATA.therapies) {
    if (!merged.therapies.find((t) => t.id === def.id)) merged.therapies.push(def);
  }
  return merged;
}
