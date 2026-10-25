import { ageOn, assign, autoPages, chronological, planSection, redesign, sectionsOf, unplaced, type PhotoIn } from '../auto';
import { cropLoss, frameAspect, LAYOUTS, layoutById } from '../layouts';
import { suggestTemplate, templateOf } from '../templates';

const L = (id: string, at?: string): PhotoIn => ({ id, width: 1500, height: 1000, takenAt: at }); // landscape 3:2
const P = (id: string, at?: string): PhotoIn => ({ id, width: 1000, height: 1500, takenAt: at }); // portrait 2:3

/** A camera roll: a seeded random mix of landscape, portrait and the odd square, over a few days. */
function mix(n: number, days = 1, seed = 7): PhotoIn[] {
  let x = seed;
  const rand = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from({ length: n }, (_, i) => {
    const day = String(10 + Math.floor((i * days) / n)).padStart(2, '0');
    const at = `2026-08-${day}T${String(9 + (i % 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`;
    const r = rand();
    return r < 0.5 ? L(`p${i}`, at) : r < 0.9 ? P(`p${i}`, at) : { id: `p${i}`, width: 1200, height: 1200, takenAt: at };
  });
}

describe('page designs', () => {
  it('every frame sits on the page and photo frames don’t overlap on grid pages', () => {
    for (const l of LAYOUTS) {
      for (const f of l.frames) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(1.0001);
        expect(f.y + f.h).toBeLessThanOrEqual(1.0001);
      }
      if (l.family === 'grid' || l.family === 'masonry' || l.family === 'feature') {
        for (let i = 0; i < l.frames.length; i++)
          for (let j = i + 1; j < l.frames.length; j++) {
            const a = l.frames[i];
            const b = l.frames[j];
            const overlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
            expect({ layout: l.id, overlap }).toEqual({ layout: l.id, overlap: false });
          }
      }
    }
  });

  it('measures cropping', () => {
    expect(cropLoss(1.5, 1.5)).toBe(0);
    expect(cropLoss(1.5, 0.75)).toBeCloseTo(0.5);
  });

  it('puts portrait photos in tall frames and landscape in wide ones', () => {
    const layout = layoutById('feature-3-side'); // one tall frame, two near-square
    const { order } = assign([L('a'), P('b'), L('c')], layout);
    expect(order[0]).toBe(1);
  });
});

describe('automatic design', () => {
  it('places every photo exactly once, in reading order by time', () => {
    const photos = mix(120, 4);
    const pages = autoPages({ photos, template: 'holiday', seed: 'album1' });
    const placed = pages.flatMap((p) => p.slots.map((s) => s.photoId));
    expect([...placed].sort()).toEqual(photos.map((p) => p.id).sort());
    expect(new Set(placed).size).toBe(placed.length);
    expect(
      unplaced(
        photos.map((p) => p.id),
        pages,
      ),
    ).toEqual([]);
  });

  it('avoids awkward crops: no photo loses more than about 40%', () => {
    const photos = mix(60);
    const pages = autoPages({ photos, template: 'everyday', seed: 's' });
    const byId = new Map(photos.map((p) => [p.id, p]));
    for (const page of pages) {
      const layout = layoutById(page.layout);
      page.slots.forEach((s, i) => {
        const p = byId.get(s.photoId)!;
        expect(cropLoss(p.width / p.height, frameAspect(layout.frames[i]))).toBeLessThan(0.41);
      });
    }
  });

  it('never repeats the same page design twice in a row, and varies them', () => {
    const pages = planSection(mix(80), templateOf('everyday'), 'seed');
    for (let i = 1; i < pages.length; i++) expect(pages[i].layout).not.toBe(pages[i - 1].layout);
    expect(new Set(pages.map((p) => p.layout)).size).toBeGreaterThanOrEqual(8);
    // No design takes over the album.
    const uses = new Map<string, number>();
    for (const p of pages) uses.set(p.layout, (uses.get(p.layout) ?? 0) + 1);
    expect(Math.max(...uses.values()) / pages.length).toBeLessThan(0.25);
  });

  it('fills pages sensibly for the template', () => {
    const photos = mix(90);
    const avg = (key: Parameters<typeof templateOf>[0]) => photos.length / planSection(photos, templateOf(key), 'x').length;
    expect(avg('wedding')).toBeLessThan(avg('school'));
    expect(avg('everyday')).toBeGreaterThan(2);
    expect(avg('everyday')).toBeLessThan(4.5);
  });

  it('templates favour their own styles', () => {
    const photos = mix(60);
    const fam = (key: Parameters<typeof templateOf>[0]) =>
      planSection(photos, templateOf(key), 'x').map((p) => layoutById(p.layout).family);
    const share = (fs: string[], f: string) => fs.filter((x) => x === f).length / fs.length;
    expect(share(fam('holiday'), 'polaroid') + share(fam('holiday'), 'scrapbook')).toBeGreaterThan(
      share(fam('wedding'), 'polaroid') + share(fam('wedding'), 'scrapbook'),
    );
  });

  it('is deterministic for the same seed and varies with another', () => {
    const photos = mix(40);
    const a = autoPages({ photos, template: 'everyday', seed: 'one' }).map((p) => p.layout);
    expect(autoPages({ photos, template: 'everyday', seed: 'one' }).map((p) => p.layout)).toEqual(a);
    expect(autoPages({ photos, template: 'everyday', seed: 'another' }).map((p) => p.layout)).not.toEqual(a);
  });

  it('handles tiny albums', () => {
    expect(autoPages({ photos: [L('a')], template: 'everyday', seed: 's' })).toHaveLength(1);
    expect(autoPages({ photos: [], template: 'everyday', seed: 's' })).toEqual([]);
  });

  it('designs hundreds of photos quickly', () => {
    const t = Date.now();
    const pages = autoPages({ photos: mix(500, 10), template: 'holiday', seed: 'big' });
    expect(Date.now() - t).toBeLessThan(3000);
    expect(pages.length).toBeGreaterThan(100);
  });
});

describe('sections', () => {
  it('a holiday gets a divider per day', () => {
    const pages = autoPages({ photos: mix(30, 3), template: 'holiday', seed: 's' });
    const dividers = pages.filter((p) => p.kind === 'divider');
    expect(dividers.map((d) => d.title)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(dividers[0].note).toBe('Monday 10 August');
  });

  it('a single day needs no dividers', () => {
    expect(autoPages({ photos: mix(12, 1), template: 'holiday', seed: 's' }).some((p) => p.kind === 'divider')).toBe(false);
  });

  it('Growing Up has a chapter per year with ages', () => {
    const photos = [
      L('a', '2021-06-01T10:00:00'),
      L('b', '2022-02-01T10:00:00'),
      L('c', '2022-09-01T10:00:00'),
      P('d', '2024-05-01T10:00:00'),
    ];
    const s = sectionsOf(photos, 'year', { birthDate: '2021-04-20' });
    expect(s.map((x) => [x.title, x.subtitle])).toEqual([
      ['2021', 'Baby'],
      ['2022', 'Ages 0–1'.replace('0–1', '0–1')].map((v, i) => (i === 1 ? 'Baby to 1' : v)),
      ['2024', 'Age 3'],
    ]);
    expect(ageOn('2021-04-20', '2024-04-19')).toBe(2);
    expect(ageOn('2021-04-20', '2024-04-20')).toBe(3);
  });

  it('undated photos come last', () => {
    expect(chronological([L('x'), L('b', '2026-01-02'), L('a', '2026-01-01')]).map((p) => p.id)).toEqual(['a', 'b', 'x']);
  });

  it('adding photos to one year redesigns only that year and keeps edits elsewhere', () => {
    const photos = [
      L('a', '2021-06-01T10:00:00'),
      L('b', '2021-07-01T10:00:00'),
      L('c', '2022-02-01T10:00:00'),
      L('d', '2022-03-01T10:00:00'),
    ];
    const input = { photos, template: 'growingUp' as const, seed: 's' };
    const pages = autoPages(input).map((p) =>
      p.section === '2021' && p.kind === 'photos' ? { ...p, caption: 'Our first summer', edited: true } : p,
    );
    const next = redesign(pages, { ...input, photos: [...photos, P('e', '2022-04-01T10:00:00')] });
    expect(next.find((p) => p.caption === 'Our first summer')).toBeDefined();
    expect(next.flatMap((p) => p.slots.map((s) => s.photoId)).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('templates', () => {
  it('suggests one from the album’s name', () => {
    expect(suggestTemplate('Cornwall trip 2026')).toBe('holiday');
    expect(suggestTemplate('Sam’s 5th birthday')).toBe('birthday');
    expect(suggestTemplate('Our wedding')).toBe('wedding');
    expect(suggestTemplate('Reception year')).toBe('school');
    expect(suggestTemplate('Sunday walks')).toBe('everyday');
  });
});
