import { autoPages, type PhotoIn } from '../auto';
import { addNotePage, appendPhotos, changeLayout, imageRect, movePage, removePhotos, replacePhoto, setCrop, swapPhotos } from '../edit';
import { layoutById, layoutsFor } from '../layouts';
import type { AlbumPage } from '../types';

const photos: PhotoIn[] = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, width: i % 3 ? 1500 : 1000, height: i % 3 ? 1000 : 1500 }));
const map = new Map(photos.map((p) => [p.id, p]));
const base = () => autoPages({ photos, template: 'everyday', seed: 't' });
const placed = (pages: AlbumPage[]) => pages.flatMap((p) => p.slots.map((s) => s.photoId));
const valid = (pages: AlbumPage[]) => pages.every((p) => p.slots.length === layoutById(p.layout).frames.length);

describe('album edits', () => {
  it('removing photos re-fits pages and drops empty ones', () => {
    const pages = base();
    const firstPage = pages[0].slots.map((s) => s.photoId);
    const next = removePhotos(pages, [...firstPage, 'p19'], map);
    expect(placed(next)).not.toContain('p19');
    firstPage.forEach((id) => expect(placed(next)).not.toContain(id));
    expect(next.length).toBe(pages.length - 1 - (pages.find((p) => p.slots.some((s) => s.photoId === 'p19'))!.slots.length === 1 ? 1 : 0));
    expect(valid(next)).toBe(true);
  });

  it('changing a design keeps the same photos and marks the page edited', () => {
    const pages = base();
    const page = pages.find((p) => p.slots.length === 3)!;
    const other = layoutsFor(3).find((l) => l.id !== page.layout)!;
    const changed = changeLayout(page, other.id, map);
    expect(changed.layout).toBe(other.id);
    expect(changed.slots.map((s) => s.photoId).sort()).toEqual(page.slots.map((s) => s.photoId).sort());
    expect(changed.edited).toBe(true);
  });

  it('swaps photos across pages', () => {
    const pages = base();
    const a = pages[0].slots[0].photoId;
    const b = pages[1].slots[0].photoId;
    const next = swapPhotos(pages, { page: 0, slot: 0 }, { page: 1, slot: 0 }, map);
    expect(next[0].slots[0].photoId).toBe(b);
    expect(next[1].slots[0].photoId).toBe(a);
    expect(pages[0].slots[0].photoId).toBe(a); // original untouched
  });

  it('replaces a photo with one from elsewhere, never duplicating it', () => {
    const pages = base();
    const moving = pages[pages.length - 1].slots[0].photoId;
    const next = replacePhoto(pages, { page: 0, slot: 0 }, moving, map);
    expect(next[0].slots[0].photoId).toBe(moving);
    expect(placed(next).filter((id) => id === moving)).toHaveLength(1);
    expect(valid(next)).toBe(true);
  });

  it('adds new photos as designed pages', () => {
    const extra = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const next = appendPhotos([], extra, map);
    expect(placed(next).sort()).toEqual([...extra].sort());
    expect(valid(next)).toBe(true);
  });

  it('reorders pages and adds journal pages (taking the photo from where it was)', () => {
    const pages = base();
    expect(movePage(pages, 0, 1)[1].id).toBe(pages[0].id);
    expect(movePage(pages, 0, -1)).toBe(pages);
    const photo = pages[2].slots[0].photoId;
    const withNote = addNotePage(pages, 0, { title: 'Why this day mattered', note: 'Sam rode without stabilisers.', photoId: photo }, map);
    expect(withNote[1]).toMatchObject({ kind: 'note', layout: 'note-photo', title: 'Why this day mattered' });
    expect(placed(withNote).filter((id) => id === photo)).toHaveLength(1);
  });

  it('keeps crops within bounds', () => {
    const next = setCrop(base(), 0, 0, { x: 2, y: -1, zoom: 9 });
    expect(next[0].slots[0].crop).toEqual({ x: 1, y: 0, zoom: 3 });
  });

  it('positions an image to cover its frame around the focal point', () => {
    // A wide photo in a square frame: twice as wide, centred.
    expect(imageRect(2, 1, { x: 0.5, y: 0.5, zoom: 1 })).toEqual({ left: -0.5, top: -0, width: 2, height: 1 });
    // Focal point at the left edge.
    expect(imageRect(2, 1, { x: 0, y: 0.5, zoom: 1 }).left).toBe(-0);
    // Zoomed in: larger than the frame in both directions.
    const z = imageRect(1, 1, { x: 0.5, y: 0.5, zoom: 2 });
    expect(z).toEqual({ left: -0.5, top: -0.5, width: 2, height: 2 });
  });
});
