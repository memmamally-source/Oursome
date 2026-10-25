import { cropLoss, frameAspect, LAYOUTS, layoutById, type LayoutDef } from './layouts';
import { templateOf, type Template } from './templates';
import type { AlbumPage, Crop, PhotoMeta, Slot, TemplateKey } from './types';

/**
 * Automatic album design. Pure and deterministic: the same photos, template
 * and seed always give the same pages, and the result is saved as data.
 *
 * 1. Photos are put in time order and grouped into sections (days of a
 *    holiday, months of a school year, years of Growing Up).
 * 2. Each section is laid out by dynamic programming over page choices,
 *    scoring cropping, the template's taste, fullness and variety.
 */

export type PhotoIn = Pick<PhotoMeta, 'id' | 'width' | 'height' | 'takenAt'>;
export type Section = { key: string; title?: string; subtitle?: string; photos: PhotoIn[] };

const aspectOf = (p: PhotoIn) => (p.width > 0 && p.height > 0 ? p.width / p.height : 1);

/** Time order; photos without a date keep their place after the dated ones. */
export function chronological<T extends PhotoIn>(photos: T[]): T[] {
  const dated = photos.filter((p) => p.takenAt).sort((a, b) => a.takenAt!.localeCompare(b.takenAt!));
  return [...dated, ...photos.filter((p) => !p.takenAt)];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Whole years between two ISO dates. */
export function ageOn(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number);
  const [y, m, d] = on.slice(0, 10).split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

function ageLabel(birthDate: string, from: string, to: string): string | undefined {
  const a = ageOn(birthDate, from);
  const b = ageOn(birthDate, to);
  if (b < 0) return undefined;
  const fmt = (n: number) => (n <= 0 ? 'Baby' : `Age ${n}`);
  return a === b || a < 0 ? fmt(Math.max(a, b)) : a <= 0 ? `Baby to ${b}` : `Ages ${a}–${b}`;
}

export function sectionsOf(photos: PhotoIn[], mode: Template['sections'], opts: { birthDate?: string } = {}): Section[] {
  const ordered = chronological(photos);
  if (mode === 'none') return [{ key: 'all', photos: ordered }];
  const keyOf = (p: PhotoIn) =>
    p.takenAt ? (mode === 'day' ? p.takenAt.slice(0, 10) : mode === 'month' ? p.takenAt.slice(0, 7) : p.takenAt.slice(0, 4)) : 'undated';
  const groups = new Map<string, PhotoIn[]>();
  for (const p of ordered) groups.set(keyOf(p), [...(groups.get(keyOf(p)) ?? []), p]);
  const keys = [...groups.keys()];
  // One day or one month needs no dividers (Growing Up always shows its year).
  if (keys.length === 1 && mode !== 'year') return [{ key: 'all', photos: ordered }];
  const years = new Set(keys.filter((k) => k !== 'undated').map((k) => k.slice(0, 4)));
  return keys.map((key, i) => {
    const ps = groups.get(key)!;
    if (key === 'undated') return { key, title: 'More moments', photos: ps };
    if (mode === 'day') {
      const d = new Date(`${key}T12:00:00`);
      return { key, title: `Day ${i + 1}`, subtitle: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`, photos: ps };
    }
    if (mode === 'month') {
      const name = MONTHS[Number(key.slice(5, 7)) - 1];
      return { key, title: years.size > 1 ? `${name} ${key.slice(0, 4)}` : name, photos: ps };
    }
    const first = ps[0].takenAt!;
    const last = ps[ps.length - 1].takenAt!;
    return { key, title: key, subtitle: opts.birthDate ? ageLabel(opts.birthDate, first, last) : undefined, photos: ps };
  });
}

/** Small deterministic noise so albums with the same shape still differ. */
function hash(seed: string, a: number, b: number): number {
  let h = 2166136261;
  const s = `${seed}:${a}:${b}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function permutations(n: number): number[][] {
  if (n <= 1) return [[0]].slice(0, n === 1 ? 1 : 0).concat(n === 0 ? [[]] : []);
  const out: number[][] = [];
  const rec = (rest: number[], acc: number[]) => {
    if (!rest.length) out.push(acc);
    rest.forEach((r, i) => rec([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, r]));
  };
  rec([...Array(n).keys()], []);
  return out;
}
const PERMS = Array.from({ length: 7 }, (_, n) => permutations(n));

/** Best way to put these photos in a layout's frames: the order, and how much is cropped. */
export function assign(photos: PhotoIn[], layout: LayoutDef): { order: number[]; loss: number } {
  const frames = layout.frames.map(frameAspect);
  const aspects = photos.map(aspectOf);
  const cost = (fi: number, pi: number) => {
    const l = cropLoss(aspects[pi], frames[fi]);
    // Losing more than about a third of a photo looks awkward: penalise it sharply.
    // Losing more than about a third looks awkward; more than 40% is never acceptable.
    return l + (l > 0.33 ? (l - 0.33) * 3 : 0) + (l > 0.4 ? 20 : 0);
  };
  const identical = frames.every((f) => Math.abs(f - frames[0]) < 0.02);
  const candidates = identical ? [[...Array(photos.length).keys()]] : PERMS[photos.length];
  let best = { order: candidates[0], loss: Infinity };
  for (const perm of candidates) {
    // perm[fi] = which photo goes in frame fi
    let total = 0;
    for (let fi = 0; fi < perm.length; fi++) total += cost(fi, perm[fi]);
    if (total < best.loss) best = { order: perm, loss: total };
  }
  return best;
}

/** Faces tend to sit high in portrait photos: aim slightly above centre when cropping them. */
export function defaultCrop(photo: PhotoIn, frameAspectValue: number): Crop {
  return { x: 0.5, y: aspectOf(photo) < frameAspectValue ? 0.38 : 0.5, zoom: 1 };
}

function slotsFor(photos: PhotoIn[], layout: LayoutDef, order: number[]): Slot[] {
  return layout.frames.map((f, fi) => {
    const p = photos[order[fi]];
    return { photoId: p.id, crop: defaultCrop(p, frameAspect(f)) };
  });
}

const PHOTO_LAYOUTS = LAYOUTS.filter((l) => l.kind === 'photos');

type Plan = { layout: LayoutDef; start: number; count: number };

/** Lay out one section's photos (already in order). */
export function planSection(photos: PhotoIn[], template: Template, seed: string, sectionKey = 'all'): AlbumPage[] {
  const n = photos.length;
  if (!n) return [];
  const L = PHOTO_LAYOUTS;
  const famWeight = (l: LayoutDef) => template.families[l.family] ?? 1;
  // Cost of each design at each starting photo, computed once (Infinity where it doesn't fit).
  const base = new Float64Array((n + 1) * L.length).fill(Infinity);
  for (let start = 0; start < n; start++) {
    for (let j = 0; j < L.length; j++) {
      const l = L[j];
      const c = l.frames.length;
      if (start + c > n) continue;
      const { loss } = assign(photos.slice(start, start + c), l);
      base[start * L.length + j] =
        0.5 * (template.density / 3) + // every page costs a little (less for airy templates), so pages are reasonably full
        loss * 1.8 + // cropping, summed over the page's photos
        (1 - famWeight(l)) * 1.2 + // the template's taste
        Math.abs(c - template.density) * 0.3 + // how full the template likes pages
        (start === 0 && (l.family === 'feature' || l.family === 'editorial') ? -0.3 : 0) + // open sections with a feature
        hash(seed, start, j) * 0.3; // a little character, different per album
    }
  }
  const sizes = L.map((l) => l.frames.length);
  const families = L.map((l) => l.family);

  /**
   * One pass of dynamic programming. State: the last page design, so a design
   * never follows itself; the one before it comes from the best path so far,
   * so designs don't come straight back either. `overuse` nudges away from
   * designs the album already leans on.
   */
  const run = (overuse: number[]): Plan[] => {
    const S = L.length + 1; // index L.length = "none yet"
    const NONE = L.length;
    const dp = new Float64Array((n + 1) * S).fill(Infinity);
    const back = new Int32Array((n + 1) * S).fill(-1); // previous design on the best path
    dp[NONE] = 0;
    for (let i = 0; i < n; i++) {
      for (let last = 0; last < S; last++) {
        const cur = dp[i * S + last];
        if (cur === Infinity) continue;
        const prev2 = last === NONE ? NONE : back[i * S + last];
        for (let j = 0; j < L.length; j++) {
          const b = base[i * L.length + j];
          if (b === Infinity || j === last) continue;
          let total = cur + b + overuse[j];
          if (j === prev2) total += 0.7;
          if (last !== NONE && families[last] === families[j]) total += 0.35;
          const k = (i + sizes[j]) * S + j;
          if (total < dp[k]) {
            dp[k] = total;
            back[k] = last;
          }
        }
      }
    }
    let j = 0;
    for (let x = 1; x < L.length; x++) if (dp[n * S + x] < dp[n * S + j]) j = x;
    const plans: Plan[] = [];
    let i = n;
    while (i > 0 && j !== NONE) {
      const c = sizes[j];
      plans.unshift({ layout: L[j], start: i - c, count: c });
      const prev = back[i * S + j];
      i -= c;
      j = prev;
    }
    return plans;
  };

  // Re-plan twice, discouraging designs that the previous plan leaned on.
  let plans = run(new Array(L.length).fill(0));
  const overuse = new Array(L.length).fill(0);
  for (let pass = 0; pass < 4 && plans.length > 6; pass++) {
    const uses = new Array(L.length).fill(0);
    for (const p of plans) uses[L.indexOf(p.layout)]++;
    const fair = Math.max(1, plans.length / 10);
    uses.forEach((u, j) => (overuse[j] += Math.max(0, u - fair) * 0.2));
    plans = run(overuse);
  }

  return plans.map((p, idx) => {
    const group = photos.slice(p.start, p.start + p.count);
    const { order } = assign(group, p.layout);
    return {
      id: `pg_${sectionKey}_${idx}_${hash(seed, idx, p.start).toString(36).slice(2, 7)}`,
      kind: 'photos' as const,
      layout: p.layout.id,
      slots: slotsFor(group, p.layout, order),
      date: group.find((g) => g.takenAt)?.takenAt?.slice(0, 10),
      section: sectionKey,
    };
  });
}

export type AutoInput = { photos: PhotoIn[]; template: TemplateKey; seed: string; birthDate?: string };

/** Design a whole album: section dividers and photo pages. */
export function autoPages({ photos, template: key, seed, birthDate }: AutoInput): AlbumPage[] {
  const template = templateOf(key);
  const sections = sectionsOf(photos, template.sections, { birthDate });
  const pages: AlbumPage[] = [];
  sections.forEach((s, si) => {
    let rest = s.photos;
    if (s.title) {
      // Larger sections open with one of their photos on the divider.
      const withPhoto = rest.length >= 4;
      const divider = layoutById(withPhoto ? 'divider-photo' : 'divider');
      pages.push({
        id: `pg_${s.key}_div`,
        kind: 'divider',
        layout: divider.id,
        slots: withPhoto ? [{ photoId: rest[0].id, crop: defaultCrop(rest[0], frameAspect(divider.frames[0])) }] : [],
        title: s.title,
        note: s.subtitle,
        section: s.key,
      });
      if (withPhoto) rest = rest.slice(1);
    }
    pages.push(...planSection(rest, template, `${seed}:${si}`, s.key));
  });
  return pages;
}

/**
 * Redesign after photos are added or removed, keeping every section whose
 * photos haven't changed exactly as it is (including manual edits).
 */
export function redesign(previous: AlbumPage[], input: AutoInput): AlbumPage[] {
  const fresh = autoPages(input);
  const photoSet = (pages: AlbumPage[]) =>
    pages
      .flatMap((p) => p.slots.map((s) => s.photoId))
      .sort()
      .join(',');
  const bySection = (pages: AlbumPage[]) => {
    const m = new Map<string, AlbumPage[]>();
    for (const p of pages) if (p.section) m.set(p.section, [...(m.get(p.section) ?? []), p]);
    return m;
  };
  const old = bySection(previous);
  const out: AlbumPage[] = [];
  const done = new Set<string>();
  for (const p of fresh) {
    const key = p.section ?? '';
    if (done.has(key)) continue;
    done.add(key);
    const nextPages = fresh.filter((x) => x.section === key);
    const before = old.get(key);
    out.push(...(before && photoSet(before) === photoSet(nextPages) ? before : nextPages));
  }
  // Pages added by hand that hold no photos (notes) stay, after their section.
  for (const p of previous) if (!p.section && !p.slots.length) out.push(p);
  return out;
}

/** Photos in the album that aren't on any page. */
export function unplaced(photoIds: string[], pages: AlbumPage[]): string[] {
  const used = new Set(pages.flatMap((p) => p.slots.map((s) => s.photoId)));
  return photoIds.filter((id) => !used.has(id));
}
