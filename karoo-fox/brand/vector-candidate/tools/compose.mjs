// Builds the candidate full-logo SVG and a visual comparison against the
// approved original, with a simple pixel-difference score.
// Usage: node brand/vector-candidate/tools/compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve(import.meta.dirname, '..');
const root = path.resolve(dir, '../..');
const original = path.join(root, 'brand/source/Karoo_Fox_Logo_Original_Lossless.png');
const fox = fs.readFileSync(path.join(dir, 'fox-mark.svg'), 'utf8');
const foxInner = fox.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const wm = JSON.parse(fs.readFileSync(path.join(dir, 'wordmark.json'), 'utf8'));
// Same canvas and positions as the 1536×1024 original (fox crop at 520,125).
// The wordmark's top-left in the original is found from its ink bounds below.
const { data, info } = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let x0 = Infinity, y0 = Infinity;
for (let y = 715; y < 920; y++) for (let x = 240; x < 1310; x++) {
  if (y < 755 && x >= 400 && x < 910) continue; // the fox's tail dips in above "aroo"
  const i = (y * info.width + x) * 3;
  if (255 - Math.min(data[i], data[i + 1], data[i + 2]) > 127) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
}
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" role="img" aria-label="Karoo Fox"><rect width="1536" height="1024" fill="#fff"/><g transform="translate(520 125)">${foxInner}</g><g transform="translate(${x0} ${y0})"><path fill="#031E3C" fill-rule="evenodd" d="${wm.karoo}"/><path fill="#D83E02" fill-rule="evenodd" d="${wm.fox}"/></g></svg>\n`;
fs.writeFileSync(path.join(dir, 'karoo-fox-logo-candidate.svg'), logo);

const rendered = await sharp(Buffer.from(logo), { density: 72 }).resize(1536, 1024).removeAlpha().raw().toBuffer();
let sum = 0, big = 0, n = 0;
const diff = Buffer.alloc(1536 * 1024 * 3);
for (let i = 0; i < rendered.length; i += 3) {
  const d = Math.max(Math.abs(rendered[i] - data[i]), Math.abs(rendered[i + 1] - data[i + 1]), Math.abs(rendered[i + 2] - data[i + 2]));
  sum += d; n++;
  if (d > 48) big++;
  const v = 255 - Math.min(255, d * 3);
  diff[i] = 255; diff[i + 1] = v; diff[i + 2] = v;
}
const report = { meanChannelDifference: +(sum / n).toFixed(2), pixelsDifferingMoreThan48: `${((big / n) * 100).toFixed(2)}%` };
fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify(report, null, 2) + '\n');
const half = (buf, raw) => (raw ? sharp(buf, { raw: { width: 1536, height: 1024, channels: 3 } }) : sharp(buf)).resize(768).png().toBuffer();
await sharp({ create: { width: 768 * 3 + 40, height: 512 + 40, channels: 3, background: '#d0d4dc' } })
  .composite([
    { input: await half(original), left: 10, top: 30 },
    { input: await half(rendered, true), left: 778 + 10, top: 30 },
    { input: await half(diff, true), left: 1546 + 20, top: 30 },
    { input: Buffer.from('<svg width="2344" height="28"><style>text{font:16px sans-serif;fill:#061f3e}</style><text x="10" y="20">Approved original (PNG)</text><text x="788" y="20">Vector candidate (SVG, rendered)</text><text x="1566" y="20">Difference (red = differs)</text></svg>'), left: 0, top: 0 },
  ])
  .png()
  .toFile(path.join(dir, 'comparison.png'));
console.log(report);
