import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Photo storage kept apart from the small settings storage: IndexedDB in
 * the browser (plenty of room), AsyncStorage on phones. Photos are small
 * JPEG data URIs (see lib/photos.ts) and never leave the device until
 * cloud sharing is switched on.
 */
const DB = 'oursome-photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

const hasIdb = () => Platform.OS === 'web' && typeof indexedDB !== 'undefined';

export async function savePhoto(id: string, dataUri: string): Promise<void> {
  if (hasIdb()) await idb('readwrite', (s) => s.put(dataUri, id));
  else await AsyncStorage.setItem(`oursome.photo.${id}`, dataUri);
  cache.set(id, dataUri);
}

export async function loadPhoto(id: string): Promise<string | null> {
  if (cache.has(id)) return cache.get(id)!;
  const v = hasIdb() ? await idb<string | undefined>('readonly', (s) => s.get(id)) : await AsyncStorage.getItem(`oursome.photo.${id}`);
  if (v) cache.set(id, v);
  return v ?? null;
}

export async function deletePhoto(id: string): Promise<void> {
  cache.delete(id);
  if (hasIdb()) await idb('readwrite', (s) => s.delete(id));
  else await AsyncStorage.removeItem(`oursome.photo.${id}`);
}

/** Every journal and household photo on this device (phones keep them under `oursome.photo.*`). */
export async function deleteAllPhotos(): Promise<void> {
  cache.clear();
  if (hasIdb()) await idb('readwrite', (s) => s.clear());
  else await AsyncStorage.multiRemove((await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('oursome.photo.')));
}

const cache = new Map<string, string>();

/** Load a stored photo for display; null while loading or if missing. */
export function usePhoto(id?: string): string | null {
  const [state, setState] = useState<{ id?: string; uri: string | null }>({ id, uri: id ? (cache.get(id) ?? null) : null });
  if (state.id !== id) setState({ id, uri: id ? (cache.get(id) ?? null) : null });
  useEffect(() => {
    if (!id || cache.has(id)) return;
    let alive = true;
    loadPhoto(id)
      .then((uri) => alive && setState({ id, uri }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return state.uri;
}
