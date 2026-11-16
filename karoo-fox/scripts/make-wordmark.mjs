import opentype from 'opentype.js';
import fs from 'node:fs';
// Regenerates src/brand/wordmark.json ("Karoo Fox" outlined in Poppins SemiBold).
// Usage: node scripts/make-wordmark.mjs && npm run brand
const out = new URL('../src/brand', import.meta.url).pathname;
const font = opentype.parse(fs.readFileSync(new URL('../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff', import.meta.url).pathname).buffer);
const size = 200;
const k = font.getPath('Karoo', 0, 0, size);
const kb = k.getBoundingBox();
const gap = 50;
const f = font.getPath('Fox', 0, 0, size);
const fb = f.getBoundingBox();
// rebuild with offsets so text starts at x=0 and cap top at y=0
const top = Math.min(kb.y1, fb.y1);
const kp = font.getPath('Karoo', -kb.x1, -top, size);
const fx = (kb.x2 - kb.x1) + gap - fb.x1;
const fp = font.getPath('Fox', fx, -top, size);
const w = Math.ceil(fx + fb.x2);
const h = Math.ceil(Math.max(kb.y2, fb.y2) - top);
const NAVY = '#0B1F3F', ORANGE = '#D9410C';
const r = (n) => String(Math.round(n * 10) / 10);
const d = (p) => p.commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}` : c.type === 'C' ? `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}` : `${c.type}${r(c.x)} ${r(c.y)}`).join('');
const wordmarkInner = `<path fill="${NAVY}" d="${d(kp)}"/><path fill="${ORANGE}" d="${d(fp)}"/>`;
fs.writeFileSync(`${out}/wordmark.json`, JSON.stringify({ w, h, karoo: d(kp), fox: d(fp) }));
console.log(w, h);
