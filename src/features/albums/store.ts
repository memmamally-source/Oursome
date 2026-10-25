import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { recordActivity } from '@/features/activity/store';
import { withFamily } from '@/features/space/store';
import { createId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';

import { autoPages, redesign } from './auto';
import { removePhotos as removeFromPages } from './edit';
import { deletePhotoFiles } from './storage';
import { templateOf } from './templates';
import type { Album, AlbumPage, PhotoMeta, TemplateKey } from './types';

/**
 * Albums and photo details (the photos themselves are in ./storage).
 * Layouts are plain data, so an album looks the same wherever it opens.
 */
type AlbumsState = {
  albums: Album[];
  photos: PhotoMeta[];
  createAlbum: (
    input: Pick<Album, 'title' | 'template'> & Partial<Pick<Album, 'description' | 'date' | 'endDate' | 'person' | 'visibility' | 'theme'>>,
  ) => Album;
  updateAlbum: (id: string, patch: Partial<Omit<Album, 'id' | 'createdAt'>>) => void;
  setPages: (id: string, pages: AlbumPage[]) => void;
  addPhotoMetas: (metas: PhotoMeta[]) => void;
  updatePhoto: (id: string, patch: Partial<PhotoMeta>) => void;
  /** Design (or redesign after changes) from the album's ready photos. */
  design: (id: string, opts?: { fresh?: boolean }) => void;
  removePhotos: (albumId: string, ids: string[]) => void;
  deleteAlbum: (id: string) => void;
};

const touch = (a: Album): Album => ({ ...a, updatedAt: new Date().toISOString() });

export const useAlbums = create<AlbumsState>()(
  persist(
    (set, get) => ({
      albums: [],
      photos: [],
      createAlbum: (input) => {
        const now = new Date().toISOString();
        const tpl = templateOf(input.template);
        const album: Album = withFamily({
          id: createId('al_'),
          title: input.title.trim() || 'Our album',
          description: input.description?.trim() || undefined,
          date: input.date,
          endDate: input.endDate,
          template: input.template,
          theme: input.theme ?? tpl.theme,
          cover: { design: tpl.cover },
          photoIds: [],
          pages: [],
          person: input.person,
          // Private by default: sharing with the family is a choice.
          visibility: input.visibility ?? 'private',
          membersCanEdit: false,
          authorId: 'me',
          createdAt: now,
          updatedAt: now,
        });
        set((s) => ({ albums: [album, ...s.albums] }));
        recordActivity('memory', `started the album “${album.title}”`);
        return album;
      },
      updateAlbum: (id, patch) => set((s) => ({ albums: s.albums.map((a) => (a.id === id ? touch(withFamily({ ...a, ...patch })) : a)) })),
      setPages: (id, pages) => set((s) => ({ albums: s.albums.map((a) => (a.id === id ? touch({ ...a, pages }) : a)) })),
      addPhotoMetas: (metas) =>
        set((s) => {
          const byAlbum = new Map<string, string[]>();
          for (const m of metas) byAlbum.set(m.albumId, [...(byAlbum.get(m.albumId) ?? []), m.id]);
          return {
            photos: [...s.photos, ...metas],
            albums: s.albums.map((a) => (byAlbum.has(a.id) ? touch({ ...a, photoIds: [...a.photoIds, ...byAlbum.get(a.id)!] }) : a)),
          };
        }),
      updatePhoto: (id, patch) => set((s) => ({ photos: s.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      design: (id, opts) => {
        const album = get().albums.find((a) => a.id === id);
        if (!album) return;
        const ready = get().photos.filter((p) => p.albumId === id && p.status === 'ready');
        const input = {
          photos: ready,
          template: album.template,
          seed: opts?.fresh ? `${album.id}:${Date.now()}` : album.id,
          birthDate: album.person?.birthDate,
        };
        const pages = opts?.fresh || !album.pages.length ? autoPages(input) : redesign(album.pages, input);
        const cover =
          album.cover.photoId && ready.some((p) => p.id === album.cover.photoId)
            ? album.cover
            : { ...album.cover, photoId: pickCover(ready) };
        // Dates come from the photos unless set by hand.
        const dated = ready
          .map((p) => p.takenAt)
          .filter(Boolean)
          .sort() as string[];
        const dates = !album.date && dated.length ? { date: dated[0].slice(0, 10), endDate: dated[dated.length - 1].slice(0, 10) } : {};
        set((s) => ({ albums: s.albums.map((a) => (a.id === id ? touch({ ...a, ...dates, pages, cover }) : a)) }));
      },
      removePhotos: (albumId, ids) => {
        const gone = new Set(ids);
        const photos = new Map(
          get()
            .photos.filter((p) => p.albumId === albumId)
            .map((p) => [p.id, p]),
        );
        set((s) => ({
          photos: s.photos.filter((p) => !gone.has(p.id)),
          albums: s.albums.map((a) =>
            a.id === albumId
              ? touch({
                  ...a,
                  photoIds: a.photoIds.filter((x) => !gone.has(x)),
                  pages: removeFromPages(a.pages, ids, photos),
                  cover: a.cover.photoId && gone.has(a.cover.photoId) ? { ...a.cover, photoId: undefined } : a.cover,
                })
              : a,
          ),
        }));
        ids.forEach((pid) => void deletePhotoFiles(pid).catch(() => {}));
      },
      deleteAlbum: (id) => {
        const ids = get()
          .photos.filter((p) => p.albumId === id)
          .map((p) => p.id);
        set((s) => ({ albums: s.albums.filter((a) => a.id !== id), photos: s.photos.filter((p) => p.albumId !== id) }));
        ids.forEach((pid) => void deletePhotoFiles(pid).catch(() => {}));
      },
    }),
    { name: 'oursome.albums', version: 1, storage: persistStorage },
  ),
);

/** A good cover: a landscape-ish photo from early in the album, else the first. */
export function pickCover(photos: PhotoMeta[]): string | undefined {
  const wide = photos.find((p) => p.width >= p.height);
  return (wide ?? photos[0])?.id;
}

export const useAlbum = (id: string) => useAlbums((s) => s.albums.find((a) => a.id === id));
export type { TemplateKey };
