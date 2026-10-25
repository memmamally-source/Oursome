import { PAGE_ASPECT, type PageKind } from './types';

/**
 * Page designs. Every position is a fraction of the page (x, w of its width;
 * y, h of its height). Frames are where photos go; text boxes are where the
 * caption, title or note sit when the page has one.
 */

export type Family = 'grid' | 'editorial' | 'feature' | 'masonry' | 'scrapbook' | 'polaroid' | 'timeline' | 'minimal';

export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, for scrapbook and polaroid pages. */
  rotate?: number;
  /** How the photo is presented. */
  style?: 'plain' | 'polaroid' | 'tape';
};

export type TextBox = { x: number; y: number; w: number; h: number; align?: 'left' | 'center' | 'right' };

export type LayoutDef = {
  id: string;
  name: string;
  family: Family;
  kind: PageKind;
  frames: Frame[];
  caption?: TextBox;
  title?: TextBox;
  note?: TextBox;
  /** The caption sits over the photo (full-bleed pages). */
  overlay?: boolean;
};

const cap = (y: number, align: TextBox['align'] = 'center'): TextBox => ({ x: 0.08, y, w: 0.84, h: 0.06, align });

export const LAYOUTS: LayoutDef[] = [
  // ── One photo ──
  {
    id: 'full',
    name: 'Full page',
    family: 'editorial',
    kind: 'photos',
    frames: [{ x: 0, y: 0, w: 1, h: 1 }],
    caption: { x: 0.08, y: 0.86, w: 0.84, h: 0.08, align: 'left' },
    overlay: true,
  },
  { id: 'framed', name: 'Framed', family: 'minimal', kind: 'photos', frames: [{ x: 0.1, y: 0.08, w: 0.8, h: 0.68 }], caption: cap(0.8) },
  {
    id: 'landscape-1',
    name: 'Wide',
    family: 'minimal',
    kind: 'photos',
    frames: [{ x: 0.08, y: 0.2, w: 0.84, h: 0.46 }],
    caption: cap(0.71),
  },
  {
    id: 'portrait-1',
    name: 'Tall',
    family: 'minimal',
    kind: 'photos',
    frames: [{ x: 0.16, y: 0.07, w: 0.68, h: 0.72 }],
    caption: cap(0.83),
  },
  {
    id: 'polaroid-1',
    name: 'Polaroid',
    family: 'polaroid',
    kind: 'photos',
    frames: [{ x: 0.14, y: 0.16, w: 0.72, h: 0.48, rotate: -2, style: 'polaroid' }],
    caption: cap(0.8),
  },

  // ── Two ──
  {
    id: 'stack-2',
    name: 'Stacked',
    family: 'grid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.4 },
      { x: 0.08, y: 0.49, w: 0.84, h: 0.4 },
    ],
    caption: cap(0.91),
  },
  {
    id: 'side-2',
    name: 'Side by side',
    family: 'grid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.15, w: 0.41, h: 0.54 },
      { x: 0.51, y: 0.15, w: 0.41, h: 0.54 },
    ],
    caption: cap(0.74),
  },
  {
    id: 'editorial-2',
    name: 'Magazine',
    family: 'editorial',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.52 },
      { x: 0.52, y: 0.62, w: 0.4, h: 0.3 },
    ],
    caption: { x: 0.08, y: 0.64, w: 0.4, h: 0.26, align: 'left' },
  },
  {
    id: 'polaroid-2',
    name: 'Two polaroids',
    family: 'polaroid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.08, w: 0.54, h: 0.36, rotate: -4, style: 'polaroid' },
      { x: 0.38, y: 0.48, w: 0.54, h: 0.36, rotate: 3, style: 'polaroid' },
    ],
    caption: { x: 0.08, y: 0.89, w: 0.84, h: 0.06, align: 'center' },
  },

  {
    id: 'pair-mixed',
    name: 'Tall and wide',
    family: 'editorial',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.18, w: 0.36, h: 0.43 },
      { x: 0.46, y: 0.27, w: 0.46, h: 0.25 },
    ],
    caption: { x: 0.46, y: 0.54, w: 0.46, h: 0.1, align: 'left' },
  },

  // ── Three ──
  {
    id: 'mixed-3',
    name: 'Wide over pair',
    family: 'feature',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.45 },
      { x: 0.08, y: 0.54, w: 0.3, h: 0.36 },
      { x: 0.4, y: 0.54, w: 0.52, h: 0.28 },
    ],
    caption: { x: 0.4, y: 0.84, w: 0.52, h: 0.06, align: 'left' },
  },
  {
    id: 'mixed-3-tall',
    name: 'Portrait between',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.28 },
      { x: 0.08, y: 0.37, w: 0.41, h: 0.49 },
      { x: 0.51, y: 0.37, w: 0.41, h: 0.22 },
    ],
    caption: { x: 0.51, y: 0.62, w: 0.41, h: 0.2, align: 'left' },
  },
  {
    id: 'feature-3',
    name: 'Feature and two',
    family: 'feature',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.48 },
      { x: 0.08, y: 0.57, w: 0.41, h: 0.3 },
      { x: 0.51, y: 0.57, w: 0.41, h: 0.3 },
    ],
    caption: cap(0.9),
  },
  {
    id: 'feature-3-side',
    name: 'Tall feature',
    family: 'feature',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.08, w: 0.52, h: 0.74 },
      { x: 0.62, y: 0.08, w: 0.3, h: 0.36 },
      { x: 0.62, y: 0.46, w: 0.3, h: 0.36 },
    ],
    caption: cap(0.86),
  },
  {
    id: 'masonry-3',
    name: 'Masonry',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.5 },
      { x: 0.08, y: 0.59, w: 0.41, h: 0.3 },
      { x: 0.51, y: 0.2, w: 0.41, h: 0.55 },
    ],
    caption: { x: 0.51, y: 0.78, w: 0.41, h: 0.12, align: 'left' },
  },
  {
    id: 'scrapbook-3',
    name: 'Scrapbook',
    family: 'scrapbook',
    kind: 'photos',
    frames: [
      { x: 0.1, y: 0.07, w: 0.5, h: 0.34, rotate: -3, style: 'tape' },
      { x: 0.42, y: 0.35, w: 0.48, h: 0.32, rotate: 2.5, style: 'tape' },
      { x: 0.1, y: 0.62, w: 0.44, h: 0.29, rotate: -1.5, style: 'tape' },
    ],
    note: { x: 0.6, y: 0.73, w: 0.32, h: 0.18, align: 'left' },
    caption: { x: 0.6, y: 0.73, w: 0.32, h: 0.18, align: 'left' },
  },
  {
    id: 'timeline-3',
    name: 'Timeline',
    family: 'timeline',
    kind: 'photos',
    frames: [
      { x: 0.3, y: 0.06, w: 0.62, h: 0.28 },
      { x: 0.3, y: 0.36, w: 0.62, h: 0.28 },
      { x: 0.3, y: 0.66, w: 0.62, h: 0.28 },
    ],
    title: { x: 0.08, y: 0.06, w: 0.18, h: 0.88, align: 'right' },
  },

  // ── Four ──
  {
    id: 'grid-4',
    name: 'Grid',
    family: 'grid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.39 },
      { x: 0.51, y: 0.07, w: 0.41, h: 0.39 },
      { x: 0.08, y: 0.48, w: 0.41, h: 0.39 },
      { x: 0.51, y: 0.48, w: 0.41, h: 0.39 },
    ],
    caption: cap(0.9),
  },
  {
    id: 'feature-4',
    name: 'Feature and strip',
    family: 'feature',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.84, h: 0.5 },
      { x: 0.08, y: 0.59, w: 0.267, h: 0.27 },
      { x: 0.367, y: 0.59, w: 0.266, h: 0.27 },
      { x: 0.653, y: 0.59, w: 0.267, h: 0.27 },
    ],
    caption: cap(0.89),
  },
  {
    id: 'masonry-4',
    name: 'Masonry',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.48 },
      { x: 0.08, y: 0.57, w: 0.41, h: 0.32 },
      { x: 0.51, y: 0.07, w: 0.41, h: 0.32 },
      { x: 0.51, y: 0.41, w: 0.41, h: 0.48 },
    ],
    caption: cap(0.91),
  },
  {
    id: 'polaroid-4',
    name: 'Polaroid table',
    family: 'polaroid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.1, w: 0.4, h: 0.27, rotate: -3, style: 'polaroid' },
      { x: 0.52, y: 0.14, w: 0.4, h: 0.27, rotate: 2, style: 'polaroid' },
      { x: 0.1, y: 0.52, w: 0.4, h: 0.27, rotate: 2.5, style: 'polaroid' },
      { x: 0.5, y: 0.56, w: 0.4, h: 0.27, rotate: -2, style: 'polaroid' },
    ],
    caption: cap(0.91),
  },

  {
    id: 'mixed-4',
    name: 'Woven',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.22 },
      { x: 0.08, y: 0.31, w: 0.41, h: 0.49 },
      { x: 0.51, y: 0.07, w: 0.41, h: 0.49 },
      { x: 0.51, y: 0.58, w: 0.41, h: 0.22 },
    ],
    caption: cap(0.85),
  },

  // ── Five and six ──
  {
    id: 'collage-5',
    name: 'Collage',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.56, h: 0.55 },
      { x: 0.66, y: 0.07, w: 0.26, h: 0.265 },
      { x: 0.66, y: 0.355, w: 0.26, h: 0.265 },
      { x: 0.08, y: 0.64, w: 0.41, h: 0.25 },
      { x: 0.51, y: 0.64, w: 0.41, h: 0.25 },
    ],
    caption: cap(0.91),
  },
  {
    id: 'masonry-5',
    name: 'Masonry',
    family: 'masonry',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.27 },
      { x: 0.08, y: 0.36, w: 0.41, h: 0.27 },
      { x: 0.08, y: 0.65, w: 0.41, h: 0.27 },
      { x: 0.51, y: 0.07, w: 0.41, h: 0.41 },
      { x: 0.51, y: 0.5, w: 0.41, h: 0.42 },
    ],
  },
  {
    id: 'grid-6',
    name: 'Classic grid',
    family: 'grid',
    kind: 'photos',
    frames: [
      { x: 0.08, y: 0.07, w: 0.41, h: 0.265 },
      { x: 0.51, y: 0.07, w: 0.41, h: 0.265 },
      { x: 0.08, y: 0.355, w: 0.41, h: 0.265 },
      { x: 0.51, y: 0.355, w: 0.41, h: 0.265 },
      { x: 0.08, y: 0.64, w: 0.41, h: 0.265 },
      { x: 0.51, y: 0.64, w: 0.41, h: 0.265 },
    ],
    caption: cap(0.92),
  },

  // ── Words ──
  {
    id: 'divider',
    name: 'Section',
    family: 'minimal',
    kind: 'divider',
    frames: [],
    title: { x: 0.1, y: 0.4, w: 0.8, h: 0.12, align: 'center' },
    note: { x: 0.15, y: 0.54, w: 0.7, h: 0.2, align: 'center' },
  },
  {
    id: 'divider-photo',
    name: 'Section with photo',
    family: 'minimal',
    kind: 'divider',
    frames: [{ x: 0.22, y: 0.14, w: 0.56, h: 0.44 }],
    title: { x: 0.1, y: 0.64, w: 0.8, h: 0.1, align: 'center' },
    note: { x: 0.15, y: 0.76, w: 0.7, h: 0.14, align: 'center' },
  },
  {
    id: 'note',
    name: 'Journal page',
    family: 'minimal',
    kind: 'note',
    frames: [],
    title: { x: 0.12, y: 0.1, w: 0.76, h: 0.08, align: 'left' },
    note: { x: 0.12, y: 0.22, w: 0.76, h: 0.68, align: 'left' },
  },
  {
    id: 'note-photo',
    name: 'Journal with photo',
    family: 'minimal',
    kind: 'note',
    frames: [{ x: 0.12, y: 0.08, w: 0.76, h: 0.38, rotate: -1, style: 'tape' }],
    title: { x: 0.12, y: 0.52, w: 0.76, h: 0.07, align: 'left' },
    note: { x: 0.12, y: 0.6, w: 0.76, h: 0.32, align: 'left' },
  },
];

const byId = new Map(LAYOUTS.map((l) => [l.id, l]));

export function layoutById(id: string): LayoutDef {
  return byId.get(id) ?? byId.get('framed')!;
}

/** Photo layouts that hold exactly `count` photos. */
export function layoutsFor(count: number, kind: PageKind = 'photos'): LayoutDef[] {
  return LAYOUTS.filter((l) => l.kind === kind && l.frames.length === count);
}

export const MAX_PER_PAGE = Math.max(...LAYOUTS.map((l) => l.frames.length));

/** A frame's real width ÷ height on the 4:5 page. */
export const frameAspect = (f: Frame) => (f.w / f.h) * PAGE_ASPECT;

/** How much of a photo is lost when it fills a frame (0 = nothing, 0.5 = half). */
export function cropLoss(photoAspect: number, frameAspectValue: number): number {
  return 1 - Math.min(photoAspect, frameAspectValue) / Math.max(photoAspect, frameAspectValue);
}
