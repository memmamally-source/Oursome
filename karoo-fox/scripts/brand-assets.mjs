/**
 * Builds every website and social image from the APPROVED raster artwork in
 * brand/source/ (supplied by the owner; filenames preserved). Nothing is
 * redrawn: images are only cropped of blank canvas and resized (Lanczos).
 *
 *   brand/source/Karoo_Fox_Logo_High_Resolution_6144x4096.png is the single source
 *   for every image (the owner asked that all logos match this file):
 *     - logo: the artwork with surrounding blank canvas trimmed
 *     - fox icon, favicons, profile icons: the fox cut from the same file
 *
 * The source images have a white canvas, so they are used on white
 * backgrounds. The only transparent derivative is the favicon (browser tabs
 * can be dark): its background is removed by flood fill from the edges, so
 * the fox's cream details stay opaque, and only the outer anti-aliased edge
 * is converted to partial transparency. Check it with `npm run brand` output
 * brand/review/favicon-check.png.
 *
 * Run `npm run brand` after replacing a source file; outputs are committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = (f) => path.join(root, 'brand/source', f);
/**
 * The artwork's canvas is near-white (252–254) rather than pure white, which
 * shows as a faint box on a white page. Snap only neutral near-white pixels
 * (all channels ≥ 248, spread ≤ 4) to 255. The fox's cream (#FFF6E9, blue
 * 233) and every other artwork colour are far outside that range.
 */
async function whitenCanvas(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const lo = Math.min(data[i], data[i + 1], data[i + 2]);
    const hi = Math.max(data[i], data[i + 1], data[i + 2]);
    if (lo >= 248 && hi - lo <= 4) data[i] = data[i + 1] = data[i + 2] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer();
}
const HIRES = await whitenCanvas(src('Karoo_Fox_Logo_High_Resolution_6144x4096.png'));
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

// Logo: trim the blank canvas, then add an even 4% margin.
const trimmed = await sharp(HIRES).trim({ background: '#ffffff', threshold: 8 }).png().toBuffer();
const tm = await sharp(trimmed).metadata();
const lm = Math.round(tm.width * 0.04);
const LOGO = await sharp(trimmed).extend({ top: lm, bottom: lm, left: lm, right: lm, background: WHITE_BG }).png().toBuffer();
const LOGO_SIZE = { width: tm.width + 2 * lm, height: tm.height + 2 * lm };
fs.writeFileSync(path.join(root, 'src/config/logo-size.json'), JSON.stringify(LOGO_SIZE) + '\n');

// Fox: the artwork above the wordmark. The tail dips to y≈2950 (in this 4×
// file) between the letters, and the top of the "F" starts at y≈2930 on the
// right, so the F's corner is blanked before trimming.
const foxArea = await sharp(HIRES).extract({ left: 1800, top: 300, width: 2600, height: 2660 }).raw().toBuffer({ resolveWithObject: true });
{
  const { data, info } = foxArea;
  for (let y = 2600; y < info.height; y++) for (let x = 1700; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
}
const foxTrim = await sharp(foxArea.data, { raw: foxArea.info }).trim({ background: '#ffffff', threshold: 8 }).png().toBuffer();
const fm = await sharp(foxTrim).metadata();
// Square canvas with the fox centred (8% margin), like an app icon.
const side = Math.round(Math.max(fm.width, fm.height) * 1.16);
const ICON = await sharp(foxTrim)
  .extend({ top: Math.floor((side - fm.height) / 2), bottom: Math.ceil((side - fm.height) / 2), left: Math.floor((side - fm.width) / 2), right: Math.ceil((side - fm.width) / 2), background: WHITE_BG })
  .png()
  .toBuffer();
const out = path.join(root, 'public/brand');
const review = path.join(root, 'brand/review');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(review, { recursive: true });
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const write = (img, file) => img.toFile(path.join(root, file));

// ---- Logo (fox + wordmark), responsive widths for the header and hero ----
export const LOGO_WIDTHS = [160, 240, 320, 480, 640, 960, 1280];
for (const w of LOGO_WIDTHS) {
  await write(sharp(LOGO).resize({ width: w, kernel: 'lanczos3' }).webp({ quality: 92 }), `public/brand/karoo-fox-logo-${w}.webp`);
}
await write(sharp(LOGO).resize({ width: 1280 }).png({ compressionLevel: 9 }), 'public/brand/karoo-fox-logo-1280.png');

// ---- Fox icon ----
// The icon source is a 2048 square with the fox centred on white. A tighter
// square crop (blank canvas only) gives the fox more presence at small sizes.

for (const w of [128, 256, 512]) {
  await write(sharp(ICON).resize(w).webp({ quality: 92 }), `public/brand/karoo-fox-icon-${w}.webp`);
}
await write(sharp(ICON).resize(1024).png(), 'public/brand/karoo-fox-icon-1024.png');

const padded = async (size, scale) =>
  sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: await sharp(ICON).resize(Math.round(size * scale)).png().toBuffer(), gravity: 'centre' }]);
await write(await padded(512, 0.72), 'public/icon-maskable-512.png');

// App/home-screen icons on white (iOS rounds the corners itself).
await write((await padded(180, 0.84)).png(), 'public/apple-touch-icon.png');
await write((await padded(192, 0.84)).png(), 'public/icon-192.png');
await write((await padded(512, 0.84)).png(), 'public/icon-512.png');
// Maskable: keep the whole fox inside the 80% safe circle.
// ---- Social profile pictures (square; the fox stays inside a circular crop) ----
for (const size of [400, 800, 1080]) {
  await write((await padded(size, 0.86)).png(), `public/brand/karoo-fox-profile-${size}.png`);
}

// ---- Open Graph / link preview: the full logo centred on white ----
const ogLogo = await sharp(LOGO).resize({ height: 520 }).png().toBuffer();
await write(
  sharp({ create: { width: 1200, height: 630, channels: 3, background: WHITE } }).composite([{ input: ogLogo, gravity: 'centre' }]).png(),
  'public/og-image.png',
);

// ---- Favicon with a genuine transparent background ----
const { data, info } = await sharp(ICON).resize(256).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const isWhite = (i) => data[i] >= 246 && data[i + 1] >= 246 && data[i + 2] >= 246;
const bg = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, 0, x, H - 1);
for (let y = 0; y < H; y++) stack.push(0, y, W - 1, y);
while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const p = y * W + x;
  if (bg[p] || !isWhite(p * 4)) continue;
  bg[p] = 1;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (bg[p]) {
    data[i + 3] = 0;
    continue;
  }
  // Edge pixels next to the background: un-blend from white (colour-to-alpha).
  const x = p % W;
  const y = (p / W) | 0;
  const touchesBg = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < W && ny < H && bg[ny * W + nx];
  });
  if (!touchesBg) continue;
  const a = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) / 255;
  if (a < 0.6) {
    const alpha = Math.max(a, 0.02);
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(255 - (255 - data[i + c]) / alpha);
    data[i + 3] = Math.round(alpha * 255);
  }
}
const transparent = sharp(data, { raw: { width: W, height: H, channels: 4 } });
const fav = async (size) => transparent.clone().resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
const favs = { 16: await fav(16), 32: await fav(32), 48: await fav(48) };
fs.writeFileSync(path.join(root, 'public/favicon-32.png'), favs[32]);
fs.writeFileSync(path.join(root, 'public/favicon-48.png'), favs[48]);
// favicon.ico with embedded PNGs (16, 32, 48).
const entries = [16, 32, 48];
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach((s, n) => {
  const e = 6 + n * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(favs[s].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += favs[s].length;
});
fs.writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries.map((s) => favs[s])]));

// Review sheet: the transparent favicon on light, mid and dark backgrounds, enlarged.
const big = await transparent.clone().resize(256).png().toBuffer();
await sharp({ create: { width: 3 * 276, height: 276, channels: 3, background: '#ffffff' } })
  .composite([
    { input: { create: { width: 276, height: 276, channels: 3, background: '#ffffff' } }, left: 0, top: 0 },
    { input: { create: { width: 276, height: 276, channels: 3, background: '#8a8f99' } }, left: 276, top: 0 },
    { input: { create: { width: 276, height: 276, channels: 3, background: '#061f3e' } }, left: 552, top: 0 },
    { input: big, left: 10, top: 10 },
    { input: big, left: 286, top: 10 },
    { input: big, left: 562, top: 10 },
  ])
  .png()
  .toFile(path.join(review, 'favicon-check.png'));

console.log('Brand assets written to public/ and public/brand/ (review sheet: brand/review/favicon-check.png)');
