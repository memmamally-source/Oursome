import { File as DeviceFile, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Where album photos live: on this device only. In the browser they're
 * Blobs in IndexedDB (separate from the small settings storage); on phones,
 * files in the app's own documents folder. Nothing here uploads anything.
 *
 * Three versions per photo: the original (kept when there's room), a display
 * version (2048 px) for reading and printing, and a thumbnail (480 px).
 */
export type Version = 'original' | 'display' | 'thumb';
const VERSIONS: Version[] = ['original', 'display', 'thumb'];

const web = Platform.OS === 'web';
const DB = 'oursome-albums';

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => VERSIONS.forEach((v) => req.result.createObjectStore(v));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx<T>(store: Version, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    t.oncomplete = () => resolve(req.result as T);
    t.onerror = () => reject(t.error ?? req.error);
    t.onabort = () => reject(t.error ?? new Error('aborted'));
  });
}

function folder(): Directory {
  const dir = new Directory(Paths.document, 'albums');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}
const deviceFile = (id: string, v: Version) => new DeviceFile(folder(), `${id}.${v}.jpg`);

/** Save a version. Web takes a Blob; phones take the file's uri. */
export async function putPhoto(id: string, v: Version, data: Blob | string): Promise<void> {
  if (web) {
    await tx(v, 'readwrite', (s) => s.put(data, id));
  } else {
    const dest = deviceFile(id, v);
    if (dest.exists) dest.delete();
    new DeviceFile(data as string).copy(dest);
  }
  urls.delete(`${id}:${v}`);
}

export async function getPhotoBlob(id: string, v: Version): Promise<Blob | null> {
  if (web) return (await tx<Blob | undefined>(v, 'readonly', (s) => s.get(id))) ?? null;
  const f = deviceFile(id, v);
  return f.exists ? (f as unknown as Blob) : null;
}

export async function hasPhoto(id: string, v: Version): Promise<boolean> {
  if (web) return (await tx<number>(v, 'readonly', (s) => s.count(id))) > 0;
  return deviceFile(id, v).exists;
}

export async function deletePhotoFiles(id: string, only?: Version[]): Promise<void> {
  for (const v of only ?? VERSIONS) {
    const key = `${id}:${v}`;
    const u = urls.get(key);
    if (u && web) URL.revokeObjectURL(u);
    urls.delete(key);
    if (web) await tx(v, 'readwrite', (s) => s.delete(id)).catch(() => {});
    else {
      const f = deviceFile(id, v);
      if (f.exists) f.delete();
    }
  }
}

/** Object URLs (web) or file uris (phones), made once and reused while the app is open. */
const urls = new Map<string, string>();

export async function photoUrl(id: string, v: Version): Promise<string | null> {
  const key = `${id}:${v}`;
  const hit = urls.get(key);
  if (hit) return hit;
  let url: string | null = null;
  if (web) {
    const blob = await getPhotoBlob(id, v);
    url = blob ? URL.createObjectURL(blob) : null;
  } else {
    const f = deviceFile(id, v);
    url = f.exists ? f.uri : null;
  }
  if (url) urls.set(key, url);
  return url;
}

export const cachedPhotoUrl = (id: string, v: Version) => urls.get(`${id}:${v}`) ?? null;

/** How much space this browser lets Oursome use, and how much it uses. */
export async function storageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (!web || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { used: e.usage ?? 0, quota: e.quota ?? 0 };
}

/** Ask the browser not to clear these photos when space runs low. */
export async function askToKeepPhotos(): Promise<boolean> {
  if (!web || !navigator.storage?.persist) return false;
  return (await navigator.storage.persisted?.()) || navigator.storage.persist();
}
