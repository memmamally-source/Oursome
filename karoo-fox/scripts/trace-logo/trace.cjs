// Traces the colour-layer masks into the layered fox-mark.svg.
const potrace = require('potrace');
const path = require('path');
const work = process.argv[2];
const outFile = process.argv[3];
const fs = require('fs');
const S = 3;
const trace = (file, opts) => new Promise((res, rej) => potrace.trace(path.join(work, file), { threshold: 128, alphaMax: 1.0, optTolerance: 0.6, ...opts }, (e, svg) => (e ? rej(e) : res((svg.match(/ d="([^"]+)"/) || [])[1] || ''))));
// Round to 0.1 px in the final 505×620 space and drop redundant spaces.
const compact = (d) => d.replace(/-?\d+\.?\d*/g, (n) => String(Math.round((parseFloat(n) / S) * 10) / 10)).replace(/\s+/g, ' ').replace(/ ?([MCLZ]) ?/g, '$1');
(async () => {
  const layer = async (id, mask, fill, turdSize) => `<path id="${id}" fill="${fill}" fill-rule="evenodd" d="${compact(await trace(mask, { turdSize }))}"/>`;
  const navy = ['ear-left-edge', 'ear-right-inner', 'eye', 'eye-far', 'nose', 'chest-navy'];
  const parts = [
    '<g id="fox-body">',
    await layer('silhouette', 'mask_sil.png', '#F85A0C', 60),
    await layer('shade-1', 'mask_o1.png', '#EC4E08', 400),
    await layer('shade-2', 'mask_o2.png', '#E03D0A', 400),
    await layer('shade-3', 'mask_o3.png', '#BC3A10', 400),
    await layer('cream', 'mask_cream.png', '#FCF5EE', 80),
    await layer('chin-shadow', 'mask_shade.png', '#E2D8CD', 200),
    '</g>',
    '<g id="fox-features" fill="#0A1E3C" fill-rule="evenodd">',
    ...(await Promise.all(navy.map(async (n) => `<path id="${n}" d="${compact(await trace(`mask_navy_${n}.png`, { turdSize: 60 }))}"/>`))),
    '</g>',
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 505 620" role="img" aria-label="Karoo Fox">${parts.join('')}</svg>\n`;
  fs.writeFileSync(outFile, svg);
  console.log('bytes', svg.length);
})();
