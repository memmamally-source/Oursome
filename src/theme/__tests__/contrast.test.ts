import { accentKeys, darkPalette, lightPalette, type Palette } from '../tokens';

/** WCAG 2 contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
] as [string, Palette][])('%s palette meets WCAG AA', (_, p) => {
  it.each(['background', 'surface', 'surfaceAlt'] as const)('body text on %s', (bg) => {
    expect(contrast(p.text, p[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textSecondary, p[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textTertiary, p[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(accentKeys)('%s: text on its fill and on its tint', (k) => {
    const a = p.accents[k];
    expect(contrast(a.on, a.base)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.ink, a.soft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('danger text', () => {
    expect(contrast(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.danger, p.dangerSoft)).toBeGreaterThanOrEqual(4.5);
  });
});
