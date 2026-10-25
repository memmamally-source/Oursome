import { frameAspect, layoutById } from './layouts';
import type { Album, PhotoMeta } from './types';

/**
 * Printing. Today: a print-ready PDF (8 × 10 in pages, optional 1/8 in
 * bleed, 300 dpi). Tomorrow: ordering a printed book through a provider,
 * which would receive the same PDF and spec. No provider is connected and
 * nothing here costs money.
 */
export type PrintSpec = {
  trim: { w: number; h: number }; // inches
  bleed: number; // inches on each side, 0 for none
  dpi: number;
};

export const PRINT_SPEC: PrintSpec = { trim: { w: 8, h: 10 }, bleed: 0.125, dpi: 300 };
export const SCREEN_SPEC: PrintSpec = { trim: { w: 8, h: 10 }, bleed: 0, dpi: 150 };

/** The shape a future photo-book printing service would plug into. Not implemented. */
export interface PrintProvider {
  name: string;
  /** Price and delivery estimate for this many pages, before anything is ordered. */
  quote(spec: PrintSpec, pages: number): Promise<{ price: string; delivery: string }>;
  /** Hand over the PDF. Must only ever run after the person confirms and pays the provider directly. */
  submit(pdf: Blob, spec: PrintSpec, order: { pages: number; copies: number }): Promise<{ reference: string }>;
}

export const printProviders: PrintProvider[] = [];

export type PrintCheck = { level: 'ok' | 'warn'; text: string };

/**
 * Before printing: photos too small for their frame (below about 200 dpi
 * look soft), and page count (printed books are bound in even pages,
 * usually at least 20).
 */
export function printChecks(album: Album, photos: Map<string, PhotoMeta>, spec: PrintSpec = PRINT_SPEC): PrintCheck[] {
  const out: PrintCheck[] = [];
  let soft = 0;
  for (const page of album.pages) {
    const layout = layoutById(page.layout);
    page.slots.forEach((slot, i) => {
      const f = layout.frames[i];
      const p = photos.get(slot.photoId);
      if (!f || !p || !p.width) return;
      const frameW = f.w * spec.trim.w;
      const frameH = f.h * spec.trim.h;
      // Pixels that end up across the frame after cover-fit and zoom.
      const aspect = p.width / p.height;
      const fa = frameAspect(f);
      const visibleW = (aspect > fa ? p.height * fa : p.width) / slot.crop.zoom;
      const visibleH = (aspect > fa ? p.height : p.width / fa) / slot.crop.zoom;
      // Display versions are at most 2048 px on the long side when originals aren't kept.
      const scale = p.hasOriginal ? 1 : Math.min(1, 2048 / Math.max(p.width, p.height));
      if (Math.min((visibleW * scale) / frameW, (visibleH * scale) / frameH) < 200) soft++;
    });
  }
  out.push(
    soft
      ? {
          level: 'warn',
          text: `${soft} ${soft === 1 ? 'photo is' : 'photos are'} a little small for ${soft === 1 ? 'its' : 'their'} frame and may print softly. Full-size originals help.`,
        }
      : { level: 'ok', text: 'Every photo has enough detail to print sharply.' },
  );
  const total = album.pages.length + 2; // with covers
  if (album.pages.length < 20)
    out.push({ level: 'warn', text: `Printed books usually need at least 20 inside pages; this album has ${album.pages.length}.` });
  else if (album.pages.length % 2)
    out.push({ level: 'warn', text: 'Books are bound in pairs of pages: add or remove one page for an even count.' });
  else out.push({ level: 'ok', text: `${total} pages including covers, ready for an 8 × 10 in book.` });
  return out;
}
