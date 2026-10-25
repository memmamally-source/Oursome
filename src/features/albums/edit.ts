import { assign, defaultCrop, type PhotoIn } from './auto';
import { frameAspect, layoutById, layoutsFor } from './layouts';
import type { AlbumPage, Crop } from './types';

/**
 * Album edits as pure functions over pages. Every edit keeps the album
 * valid: each photo on at most one page, frames always filled.
 */

type Photos = Map<string, PhotoIn>;
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Lay these photos into a design, best order first (crops reset). */
export function fill(page: AlbumPage, layoutId: string, photoIds: string[], photos: Photos): AlbumPage {
  const layout = layoutById(layoutId);
  const ps = photoIds.map((id) => photos.get(id) ?? { id, width: 1, height: 1 });
  const { order } = assign(ps, layout);
  return {
    ...page,
    layout: layout.id,
    slots: layout.frames.map((f, i) => ({ photoId: ps[order[i]].id, crop: defaultCrop(ps[order[i]], frameAspect(f)) })),
  };
}

/** The best-fitting design for some photos, avoiding the neighbours' designs. */
export function bestLayout(photoIds: string[], photos: Photos, avoid: string[] = []): string | null {
  const options = layoutsFor(photoIds.length);
  if (!options.length) return null;
  const ps = photoIds.map((id) => photos.get(id) ?? { id, width: 1, height: 1 });
  const scored = options.map((l) => ({ id: l.id, loss: assign(ps, l).loss + (avoid.includes(l.id) ? 0.5 : 0) }));
  return scored.sort((a, b) => a.loss - b.loss)[0].id;
}

/** Change a page's design, keeping its photos. */
export function changeLayout(page: AlbumPage, layoutId: string, photos: Photos): AlbumPage {
  return {
    ...fill(
      page,
      layoutId,
      page.slots.map((s) => s.photoId),
      photos,
    ),
    edited: true,
  };
}

/** Take photos out of the album's pages; pages re-fit their remaining photos or disappear. */
export function removePhotos(pages: AlbumPage[], ids: string[], photos: Photos): AlbumPage[] {
  const gone = new Set(ids);
  const out: AlbumPage[] = [];
  pages.forEach((page, i) => {
    const keep = page.slots.filter((s) => !gone.has(s.photoId)).map((s) => s.photoId);
    if (keep.length === page.slots.length) return out.push(page);
    if (page.kind === 'divider') return out.push({ ...page, layout: 'divider', slots: [] });
    if (page.kind === 'note') return out.push({ ...page, layout: 'note', slots: [] });
    if (!keep.length) return; // nothing left on the page
    const avoid = [pages[i - 1]?.layout, pages[i + 1]?.layout].filter(Boolean) as string[];
    let ids2 = keep;
    let layout = bestLayout(ids2, photos, avoid);
    // No design for this many: keep as many as fit (the rest become unplaced).
    while (!layout && ids2.length > 1) layout = bestLayout((ids2 = ids2.slice(0, -1)), photos, avoid);
    if (layout) out.push({ ...fill(page, layout, ids2, photos), edited: page.edited });
  });
  return out;
}

/** Swap two photos (on the same page or different pages). */
export function swapPhotos(
  pages: AlbumPage[],
  a: { page: number; slot: number },
  b: { page: number; slot: number },
  photos: Photos,
): AlbumPage[] {
  const next = pages.map((p) => ({ ...p, slots: [...p.slots] }));
  const sa = next[a.page].slots[a.slot];
  const sb = next[b.page].slots[b.slot];
  const pa = photos.get(sb.photoId);
  const pb = photos.get(sa.photoId);
  const fa = layoutById(next[a.page].layout).frames[a.slot];
  const fb = layoutById(next[b.page].layout).frames[b.slot];
  next[a.page].slots[a.slot] = { photoId: sb.photoId, crop: pa && fa ? defaultCrop(pa, frameAspect(fa)) : sb.crop };
  next[b.page].slots[b.slot] = { photoId: sa.photoId, crop: pb && fb ? defaultCrop(pb, frameAspect(fb)) : sa.crop };
  next[a.page].edited = true;
  next[b.page].edited = true;
  return next;
}

/** Put a photo in a frame in place of the one there (the replaced photo becomes unplaced). */
export function replacePhoto(pages: AlbumPage[], at: { page: number; slot: number }, photoId: string, photos: Photos): AlbumPage[] {
  const next = removePhotos(pages, [photoId], photos);
  // Removing may have shifted pages; find the target page by id.
  const target = next.findIndex((p) => p.id === pages[at.page].id);
  if (target < 0) return pages;
  const page = next[target];
  const frame = layoutById(page.layout).frames[at.slot];
  const p = photos.get(photoId);
  if (!frame || !page.slots[at.slot]) return pages;
  const slots = [...page.slots];
  slots[at.slot] = { photoId, crop: p ? defaultCrop(p, frameAspect(frame)) : { x: 0.5, y: 0.5, zoom: 1 } };
  next[target] = { ...page, slots, edited: true };
  return next;
}

/** Add photos as new pages at the end (or after a page), designed to fit. */
export function appendPhotos(pages: AlbumPage[], ids: string[], photos: Photos, after = pages.length - 1): AlbumPage[] {
  const added: AlbumPage[] = [];
  let rest = [...ids];
  while (rest.length) {
    const take = rest.length >= 7 ? 3 + (added.length % 2) : rest.length <= 6 ? rest.length : 3;
    const group = rest.slice(0, take);
    rest = rest.slice(take);
    const prevLayout = added[added.length - 1]?.layout ?? pages[after]?.layout;
    const layout = bestLayout(group, photos, prevLayout ? [prevLayout] : []);
    if (layout) added.push(fill({ id: newId('pg'), kind: 'photos', layout, slots: [] }, layout, group, photos));
  }
  return [...pages.slice(0, after + 1), ...added, ...pages.slice(after + 1)];
}

export function movePage(pages: AlbumPage[], index: number, dir: -1 | 1): AlbumPage[] {
  const j = index + dir;
  if (j < 0 || j >= pages.length) return pages;
  const next = [...pages];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function removePage(pages: AlbumPage[], index: number): AlbumPage[] {
  return pages.filter((_, i) => i !== index);
}

/** A journal page: a title and words, with an optional photo. */
export function addNotePage(
  pages: AlbumPage[],
  after: number,
  note: { title?: string; note?: string; photoId?: string },
  photos: Photos,
): AlbumPage[] {
  const base: AlbumPage = { id: newId('pg'), kind: 'note', layout: 'note', slots: [], title: note.title, note: note.note, edited: true };
  let page = base;
  if (note.photoId) {
    const cleared = removePhotos(pages, [note.photoId], photos);
    pages = cleared;
    page = fill(base, 'note-photo', [note.photoId], photos);
  }
  return [...pages.slice(0, after + 1), page, ...pages.slice(after + 1)];
}

export function setCrop(pages: AlbumPage[], pageIndex: number, slot: number, crop: Crop): AlbumPage[] {
  return pages.map((p, i) =>
    i === pageIndex ? { ...p, edited: true, slots: p.slots.map((s, k) => (k === slot ? { ...s, crop: clampCrop(crop) } : s)) } : p,
  );
}

export function clampCrop(c: Crop): Crop {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return { x: clamp(c.x, 0, 1), y: clamp(c.y, 0, 1), zoom: clamp(c.zoom, 1, 3) };
}

export function updatePage(
  pages: AlbumPage[],
  index: number,
  patch: Partial<Pick<AlbumPage, 'caption' | 'title' | 'note' | 'date'>>,
): AlbumPage[] {
  return pages.map((p, i) => (i === index ? { ...p, ...patch, edited: true } : p));
}

/**
 * Where an image sits inside its frame for a crop: the image is scaled to
 * cover the frame (times zoom) and shifted so the focal point stays in view.
 * Returns position and size as fractions of the frame.
 */
export function imageRect(
  photoAspect: number,
  frameAspectValue: number,
  crop: Crop,
): { left: number; top: number; width: number; height: number } {
  const cover = photoAspect > frameAspectValue ? { w: photoAspect / frameAspectValue, h: 1 } : { w: 1, h: frameAspectValue / photoAspect };
  const w = cover.w * crop.zoom;
  const h = cover.h * crop.zoom;
  return { left: -(w - 1) * crop.x, top: -(h - 1) * crop.y, width: w, height: h };
}
