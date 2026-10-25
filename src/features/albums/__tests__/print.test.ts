import { autoPages, type PhotoIn } from '../auto';
import { printChecks } from '../print';
import type { Album, PhotoMeta } from '../types';

const meta = (p: PhotoIn, hasOriginal = true): PhotoMeta => ({
  ...p,
  albumId: 'a',
  status: 'ready',
  addedBy: 'me',
  addedAt: '',
  hasOriginal,
});
const album = (photos: PhotoIn[]): Album => ({
  id: 'a',
  title: 'Test',
  template: 'everyday',
  theme: 'linen',
  cover: { design: 'framed' },
  photoIds: photos.map((p) => p.id),
  pages: autoPages({ photos, template: 'everyday', seed: 'x' }),
  visibility: 'private',
  authorId: 'me',
  createdAt: '',
  updatedAt: '',
});

describe('print checks', () => {
  it('flags photos too small for their frames', () => {
    const tiny = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, width: 600, height: 400 }));
    const checks = printChecks(album(tiny), new Map(tiny.map((p) => [p.id, meta(p)])));
    expect(checks[0]).toMatchObject({ level: 'warn' });
    expect(checks[0].text).toMatch(/small for/);
  });

  it('passes sharp photos and checks the page count', () => {
    const big = Array.from({ length: 90 }, (_, i) => ({ id: `b${i}`, width: 6000, height: 4000 }));
    const a = album(big);
    const checks = printChecks(a, new Map(big.map((p) => [p.id, meta(p)])));
    expect(checks[0].level).toBe('ok');
    expect(checks[1].text).toMatch(a.pages.length < 20 ? /at least 20/ : a.pages.length % 2 ? /pairs/ : /ready for an 8 × 10/);
  });

  it('the 2048 px display version is still sharp enough when originals aren’t kept', () => {
    const big = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, width: 6000, height: 4000 }));
    expect(printChecks(album(big), new Map(big.map((p) => [p.id, meta(p, false)])))[0].level).toBe('ok');
  });
});
