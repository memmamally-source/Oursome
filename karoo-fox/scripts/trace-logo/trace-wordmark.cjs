// Traces the wordmark masks into src/brand/wordmark.json ({ w, h, karoo, fox }).
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');
const [work, outFile] = process.argv.slice(2);
const S = 4;
const trace = (f) => new Promise((res, rej) => potrace.trace(path.join(work, f), { threshold: 128, turdSize: 50, optTolerance: 0.4 }, (e, svg) => (e ? rej(e) : res(svg.match(/ d="([^"]+)"/)[1]))));
const nums = (d) => [...d.matchAll(/-?\d+\.?\d*/g)].map((m) => parseFloat(m[0]) / S);
(async () => {
  const raw = { karoo: await trace('wm_karoo.png'), fox: await trace('wm_fox.png') };
  // Tight bounding box so the wordmark starts at 0,0.
  const all = [...nums(raw.karoo), ...nums(raw.fox)];
  const xs = all.filter((_, i) => i % 2 === 0), ys = all.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const shift = (d) => {
    let i = 0;
    return d.replace(/-?\d+\.?\d*/g, (n) => String(Math.round((parseFloat(n) / S - (i++ % 2 === 0 ? x0 : y0)) * 10) / 10)).replace(/\s+/g, ' ').replace(/ ?([MCLZ]) ?/g, '$1');
  };
  const w = Math.ceil(Math.max(...xs) - x0), h = Math.ceil(Math.max(...ys) - y0);
  fs.writeFileSync(outFile, JSON.stringify({ w, h, karoo: shift(raw.karoo), fox: shift(raw.fox), source: 'Traced from src/brand/original/karoo-fox-logo-original.jpg' }));
  console.log(w, h);
})();
