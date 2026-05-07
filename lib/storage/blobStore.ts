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
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PATH });
    const blob = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!blob) return structuredClone(DEFAULT_DATA);
    const res = await fetch(blob.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return structuredClone(DEFAULT_DATA);
    const data = await res.json() as DataStore;
    // Merge: ensure default users/resources/therapies exist
    return mergeWithDefaults(data);
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

async function writeToBlob(data: DataStore): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
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
  // Ensure default users exist (don't lose admin)
  for (const def of DEFAULT_DATA.users) {
    if (!merged.users.find((u) => u.id === def.id)) {
      merged.users.push(def);
    }
  }
  for (const def of DEFAULT_DATA.resources) {
    if (!merged.resources.find((r) => r.id === def.id)) {
      merged.resources.push(def);
    }
  }
  for (const def of DEFAULT_DATA.therapies) {
    if (!merged.therapies.find((t) => t.id === def.id)) {
      merged.therapies.push(def);
    }
  }
  return merged;
}
