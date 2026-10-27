import { Platform } from 'react-native';
import { create } from 'zustand';

import { createId } from '@/lib/id';

import { readExif } from './exif';
import { askToKeepPhotos, deletePhotoFiles, getPhotoBlob, hasPhoto, photoUrl, putPhoto } from './storage';
import { useAlbums } from './store';
import type { PhotoMeta } from './types';

/**
 * Bringing photos in, built to survive interruptions:
 * 1. The original is saved first, then its details are recorded as "pending".
 * 2. A small queue makes the display and thumbnail versions (two at a time),
 *    turned the right way up, and marks the photo ready.
 * 3. If the tab closes halfway, `resumeAlbum` carries on from the saved
 *    originals next time; failures can be retried.
 */

const DISPLAY = 2048;
const THUMB = 480;
const CONCURRENCY = 2;

type Progress = { total: number; done: number; failed: number };
type ImportState = { progress: Record<string, Progress>; set: (albumId: string, p: Progress) => void };

export const useImports = create<ImportState>()((set) => ({
  progress: {},
  set: (albumId, p) => set((s) => ({ progress: { ...s.progress, [albumId]: p } })),
}));

/** What the picker gives us: a browser File, or a phone file uri with what the picker knows. */
export type Picked = {
  file?: Blob & { name?: string; lastModified?: number };
  uri?: string;
  width?: number;
  height?: number;
  takenAt?: string;
  name?: string;
};

const queue: string[] = [];
let running = 0;
const listeners = new Map<string, () => void>();

function report(albumId: string) {
  const photos = useAlbums.getState().photos.filter((p) => p.albumId === albumId);
  const done = photos.filter((p) => p.status === 'ready').length;
  const failed = photos.filter((p) => p.status === 'failed').length;
  useImports.getState().set(albumId, { total: photos.length, done, failed });
  if (done + failed === photos.length) listeners.get(albumId)?.();
}

/** Resolves when nothing in the album is still being prepared. */
export function whenSettled(albumId: string): Promise<void> {
  const pending = useAlbums.getState().photos.some((p) => p.albumId === albumId && p.status === 'pending');
  if (!pending) return Promise.resolve();
  return new Promise((resolve) => listeners.set(albumId, () => (listeners.delete(albumId), resolve())));
}

/** Save the originals and queue them for preparing. */
export async function addPhotos(albumId: string, picked: Picked[], opts: { keepOriginals: boolean }): Promise<number> {
  void askToKeepPhotos();
  const metas: PhotoMeta[] = [];
  for (const p of picked) {
    const id = createId('ph_');
    try {
      let takenAt = p.takenAt;
      if (p.file) {
        if (!takenAt) takenAt = readExif(await p.file.slice(0, 256 * 1024).arrayBuffer()).takenAt;
        if (!takenAt && p.file.lastModified) takenAt = localIso(new Date(p.file.lastModified));
        await putPhoto(id, 'original', p.file);
      } else if (p.uri) {
        await putPhoto(id, 'original', p.uri);
      } else continue;
      metas.push({
        id,
        albumId,
        width: p.width ?? 0,
        height: p.height ?? 0,
        takenAt,
        name: p.name ?? p.file?.name,
        status: 'pending',
        hasOriginal: opts.keepOriginals,
        addedBy: 'me',
        addedAt: new Date().toISOString(),
      });
    } catch {
      // Couldn't even save it (storage full?): skip, and say so below.
    }
  }
  useAlbums.getState().addPhotoMetas(metas);
  metas.forEach((m) => enqueue(m.id));
  report(albumId);
  return picked.length - metas.length;
}

const localIso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

function enqueue(id: string) {
  if (!queue.includes(id)) queue.push(id);
  pump();
}

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift()!;
    running++;
    void prepare(id).finally(() => {
      running--;
      pump();
    });
  }
}

async function prepare(id: string) {
  const meta = useAlbums.getState().photos.find((p) => p.id === id);
  if (!meta) return;
  try {
    if (Platform.OS === 'web') {
      const original = await getPhotoBlob(id, 'original');
      if (!original) throw new Error('missing');
      const bitmap = await decode(original);
      const width = bitmap.width;
      const height = bitmap.height;
      await putPhoto(id, 'display', await resize(bitmap, DISPLAY, 0.86));
      await putPhoto(id, 'thumb', await resize(bitmap, THUMB, 0.78));
      if ('close' in bitmap) bitmap.close();
      if (!meta.hasOriginal) await deletePhotoFiles(id, ['original']);
      useAlbums.getState().updatePhoto(id, { width, height, status: 'ready' });
    } else {
      // Phones: make the display and thumbnail versions the pages show (JPEG, the right way up).
      const source = await photoUrl(id, 'original');
      if (!source) throw new Error('missing');
      try {
        const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
        const full = await ImageManipulator.manipulate(source).renderAsync();
        const width = full.width;
        const height = full.height;
        for (const [version, max, compress] of [
          ['display', DISPLAY, 0.86],
          ['thumb', THUMB, 0.78],
        ] as const) {
          const scale = Math.min(1, max / Math.max(width, height));
          const sized = await ImageManipulator.manipulate(source)
            .resize({ width: Math.max(1, Math.round(width * scale)) })
            .renderAsync();
          const saved = await sized.saveAsync({ format: SaveFormat.JPEG, compress });
          await putPhoto(id, version, saved.uri);
        }
        if (!meta.hasOriginal) await deletePhotoFiles(id, ['original']);
        useAlbums.getState().updatePhoto(id, { width, height, status: 'ready' });
      } catch {
        // Couldn't make the smaller copies: the pages show the original instead (see photoUrl).
        useAlbums.getState().updatePhoto(id, { status: 'ready', hasOriginal: true });
      }
    }
  } catch {
    useAlbums.getState().updatePhoto(id, { status: 'failed' });
  }
  report(meta.albumId);
}

/** Decode a photo the right way up. */
async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to an <img>, which some formats need.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function resize(source: ImageBitmap | HTMLImageElement, max: number, quality: number): Promise<Blob> {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no canvas'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality));
}

/** Carry on preparing anything left pending (after a reload or interruption). */
export function resumeAlbum(albumId: string) {
  useAlbums
    .getState()
    .photos.filter((p) => p.albumId === albumId && p.status === 'pending')
    .forEach((p) => enqueue(p.id));
  report(albumId);
}

/** Try failed photos again. Ones whose original is gone are removed. */
export async function retryFailed(albumId: string): Promise<void> {
  const failed = useAlbums.getState().photos.filter((p) => p.albumId === albumId && p.status === 'failed');
  const lost: string[] = [];
  for (const p of failed) {
    if (await hasPhoto(p.id, 'original')) {
      useAlbums.getState().updatePhoto(p.id, { status: 'pending' });
      enqueue(p.id);
    } else lost.push(p.id);
  }
  if (lost.length) useAlbums.getState().removePhotos(albumId, lost);
  report(albumId);
}
