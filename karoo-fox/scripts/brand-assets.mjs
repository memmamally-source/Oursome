/**
 * Builds every logo variant, favicon and social image from two sources:
 *   src/brand/fox-mark.svg  – the fox, traced from the original artwork (scripts/trace-logo)
 *   src/brand/wordmark.json – "Karoo Fox", traced from the original artwork
 * Run `npm run brand` after changing either; the outputs are committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const brandDir = path.join(root, 'src/brand');
const out = path.join(root, 'public/brand');
fs.mkdirSync(out, { recursive: true });

const NAVY = '#031E3C'; // sampled from the original artwork
const ORANGE = '#D83E02'; // sampled from the original artwork
const CREAM = '#FBF6EE';

const foxSvg = fs.readFileSync(path.join(brandDir, 'fox-mark.svg'), 'utf8');
const foxInner = foxSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
const FOX_W = 505;
const FOX_H = 620;
const wm = JSON.parse(fs.readFileSync(path.join(brandDir, 'wordmark.json'), 'utf8'));
const wordmark = (karooFill = NAVY) =>
  `<path fill="${karooFill}" fill-rule="evenodd" d="${wm.karoo}"/><path fill="${ORANGE}" fill-rule="evenodd" d="${wm.fox}"/>`;

const svg = (w, h, body, label = 'Karoo Fox') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>\n`;

const fox = (x, y, scale) => `<g transform="translate(${x} ${y}) scale(${scale})">${foxInner}</g>`;

// Horizontal lockup (site header): fox left, wordmark right.
function horizontal(karooFill) {
  const foxH = 310;
  const s = foxH / FOX_H;
  const foxW = FOX_W * s;
  const wmScale = 118 / wm.h;
  const gap = 36;
  const w = Math.ceil(foxW + gap + wm.w * wmScale);
  const wmY = foxH - wm.h * wmScale - 18;
  return svg(w, foxH, fox(0, 0, s) + `<g transform="translate(${foxW + gap} ${wmY}) scale(${wmScale})">${wordmark(karooFill)}</g>`);
}

// Stacked lockup, positioned exactly as in the original artwork (both traced at
// the original's scale: the fox crop sits 270 px right of and 605 px above the wordmark).
function stacked(karooFill, bg) {
  const pad = 60;
  const w = Math.ceil(wm.w + pad * 2);
  const h = Math.ceil(pad + 605 + wm.h + pad);
  const back = bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '';
  return svg(w, h, back + fox(pad + 270, pad, 1) + `<g transform="translate(${pad} ${pad + 605})">${wordmark(karooFill)}</g>`);
}

// Square app-icon style tile (for touch icons and maskable icons).
function tile(size, bg, foxShare = 0.7) {
  const s = (size * foxShare) / FOX_H;
  const x = (size - FOX_W * s) / 2;
  const y = (size - FOX_H * s) / 2;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${bg}"/>` + fox(x, y, s));
}

const files = {
  'logo-horizontal.svg': horizontal(NAVY),
  'logo-horizontal-light.svg': horizontal(CREAM), // for dark backgrounds
  'logo-stacked.svg': stacked(NAVY),
  'logo-stacked-light.svg': stacked(CREAM),
  'fox-mark.svg': foxSvg,
  'wordmark.svg': svg(wm.w, wm.h, wordmark()),
};
for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(out, name), content);
fs.writeFileSync(path.join(root, 'public/favicon.svg'), foxSvg);

const png = (input, file, w, h) =>
  sharp(Buffer.from(input), { density: 300 }).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(root, file));

await Promise.all([
  png(foxSvg, 'public/favicon-32.png', 32, 32),
  png(foxSvg, 'public/favicon-48.png', 48, 48),
  png(tile(180, CREAM, 0.74), 'public/apple-touch-icon.png', 180, 180),
  png(tile(512, CREAM, 0.74), 'public/icon-512.png', 512, 512),
  png(tile(512, CREAM, 0.56), 'public/icon-maskable-512.png', 512, 512),
  png(tile(192, CREAM, 0.74), 'public/icon-192.png', 192, 192),
  png(stacked(NAVY, '#FFFFFF'), 'public/brand/logo-stacked-2000.png', 2000, null),
  png(horizontal(NAVY), 'public/brand/logo-horizontal-1200.png', 1200, null),
]);

// Social sharing image, 1200×630: horizontal logo centred on cream.
const ogLogo = await sharp(Buffer.from(horizontal(NAVY)), { density: 300 }).resize(860).png().toBuffer();
const meta = await sharp(ogLogo).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: CREAM } })
  .composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect y="606" width="1200" height="24" fill="${ORANGE}"/></svg>`), left: 0, top: 0 },
    { input: ogLogo, left: Math.round((1200 - meta.width) / 2), top: Math.round((606 - meta.height) / 2) },
  ])
  .png()
  .toFile(path.join(root, 'public/og-image.png'));

console.log('Brand assets written to public/ and public/brand/');
