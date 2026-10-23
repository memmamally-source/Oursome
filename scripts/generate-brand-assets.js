/**
 * Generates icon concepts and app icon PNGs from SVG using Chromium.
 * Requires `playwright` to be resolvable (it is not a project dependency):
 *   NODE_PATH=/path/to/node_modules node scripts/generate-brand-assets.js
 * Colours mirror src/config/brand.ts.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const C = { coral: '#FF7468', sunshine: '#FFC857', sky: '#76C8F5', lavender: '#B7A2ED', mint: '#79D6B0', cream: '#FFF9F2', charcoal: '#242632' };
const root = path.join(__dirname, '..');
const out = (p) => path.join(root, p);

function arc(cx, cy, r, a1, a2) {
  const rad = (d) => (d * Math.PI) / 180;
  const p = (a) => `${(cx + r * Math.cos(rad(a))).toFixed(2)} ${(cy + r * Math.sin(rad(a))).toFixed(2)}`;
  return `M ${p(a1)} A ${r} ${r} 0 0 1 ${p(a2)}`;
}

/** Concept 1 — "Gathering": four rounded pieces circling a shared centre. */
function gathering({ scale = 1, mono, dot = true } = {}) {
  const segs = [[C.coral, -158], [C.sunshine, -68], [C.mint, 22], [C.sky, 112]];
  const r = 32 * scale, w = 17 * scale;
  return segs.map(([c, s]) => `<path d="${arc(50, 50, r, s, s + 46)}" stroke="${mono || c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`).join('') +
    (dot ? `<circle cx="50" cy="50" r="${7 * scale}" fill="${mono || C.lavender}"/>` : '');
}

/** Concept 2 — "Petals": overlapping circles that read as an o. */
const petals = () => [[C.coral, 38, 38], [C.sunshine, 62, 38], [C.mint, 62, 62], [C.sky, 38, 62]]
  .map(([c, x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${c}" opacity="0.85"/>`).join('') + `<circle cx="50" cy="50" r="9" fill="${C.cream}"/>`;

/** Concept 3 — "Linked days": a calendar page with two linked rings. */
const linked = () => `<rect x="18" y="22" width="64" height="60" rx="16" fill="#fff" stroke="${C.charcoal}" stroke-opacity="0.08" stroke-width="2"/>
  <rect x="18" y="22" width="64" height="18" rx="9" fill="${C.coral}"/>
  <circle cx="43" cy="61" r="12" fill="none" stroke="${C.sky}" stroke-width="7"/>
  <circle cx="57" cy="61" r="12" fill="none" stroke="${C.sunshine}" stroke-width="7"/>`;

/** Concept 4 — "Pieces": four soft tiles forming one rounded whole. */
const pieces = () => [[C.coral, 22, 22, '0'], [C.sunshine, 52, 22, '1'], [C.sky, 22, 52, '2'], [C.mint, 52, 52, '3']]
  .map(([c, x, y, i]) => {
    const rad = ['26 6 6 6', '6 26 6 6', '6 6 6 26', '6 6 26 6'][i].split(' ');
    return `<rect x="${x}" y="${y}" width="26" height="26" rx="${rad[0] === '26' || rad[1] === '26' ? 6 : 6}" fill="${c}"/>`;
  }).join('') + `<circle cx="50" cy="50" r="7" fill="${C.cream}"/>`;

const svg = (body, { bg = C.cream, size = 1024, viewBox = '0 0 100 100' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}${body}</svg>`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage();
  const render = async (markup, file, size, transparent = false) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.locator('svg').first().screenshot({ path: out(file), omitBackground: transparent });
  };

  // Chosen app icon (iOS: square, opaque — iOS applies the corner mask).
  await render(svg(gathering({ scale: 1 }), { size: 1024 }).replace('viewBox="0 0 100 100"', 'viewBox="-4 -4 108 108"').replace('<rect width="100"', '<rect x="-4" y="-4" width="108"'), 'assets/images/icon.png', 1024);
  // Android adaptive icon: transparent foreground inside the 66% safe zone, solid background, monochrome.
  await render(svg(gathering(), { bg: null, size: 1024 }).replace('viewBox="0 0 100 100"', 'viewBox="-35 -35 170 170"'), 'assets/images/android-icon-foreground.png', 1024, true);
  await render(svg('', { size: 1024 }), 'assets/images/android-icon-background.png', 1024);
  await render(svg(gathering({ mono: '#000000' }), { bg: null, size: 1024 }).replace('viewBox="0 0 100 100"', 'viewBox="-35 -35 170 170"'), 'assets/images/android-icon-monochrome.png', 1024, true);
  // Splash mark and favicon.
  await render(svg(gathering(), { bg: null, size: 512 }), 'assets/images/splash-icon.png', 512, true);
  await render(svg(gathering(), { size: 196 }), 'assets/images/favicon.png', 196);

  // Web app (PWA) icons. "maskable" keeps the mark inside the 80% safe zone.
  fs.mkdirSync(out('public/icons'), { recursive: true });
  const padded = (vb) => svg(gathering(), { size: 512 }).replace('viewBox="0 0 100 100"', `viewBox="${vb}"`).replace('<rect width="100" height="100"', '<rect x="-50" y="-50" width="200" height="200"');
  await render(padded('-8 -8 116 116'), 'public/icons/icon-512.png', 512);
  await render(padded('-8 -8 116 116').replace('width="512" height="512"', 'width="192" height="192"'), 'public/icons/icon-192.png', 192);
  await render(padded('-22 -22 144 144'), 'public/icons/icon-maskable-512.png', 512);
  await render(padded('-10 -10 120 120').replace('width="512" height="512"', 'width="180" height="180"'), 'public/icons/apple-touch-icon.png', 180);

  // Social preview image (1200×630).
  const og = `<div id="og" style="width:1200px;height:630px;background:${C.cream};position:relative;overflow:hidden;font-family:system-ui">
    <div style="position:absolute;right:-120px;top:-140px;width:520px;height:520px;border-radius:50%;background:#FFF3D6"></div>
    <div style="position:absolute;right:160px;bottom:-200px;width:380px;height:380px;border-radius:50%;background:#FFE8E4"></div>
    <div style="position:absolute;right:110px;top:150px">${svg(gathering(), { size: 330, bg: null })}</div>
    <div style="position:absolute;left:90px;top:170px;width:620px">
      <div style="font:800 96px/1 system-ui;letter-spacing:-3px;color:${C.charcoal}">oursome<span style="color:${C.coral}">.</span></div>
      <div style="font:700 44px/1.2 system-ui;color:${C.charcoal};margin-top:28px">Life’s better together.</div>
      <div style="font:400 28px/1.4 system-ui;color:#6B6D7B;margin-top:18px">Calendar, tasks, reminders and shopping lists, shared with the people you live with.</div>
    </div></div>`;
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<html><body style="margin:0">${og}</body></html>`);
  await page.locator('#og').screenshot({ path: out('public/og-image.png') });

  // Concept sheet for review.
  const concepts = [['Gathering (chosen)', gathering()], ['Petals', petals()], ['Linked days', linked()], ['Pieces', pieces()]];
  const tile = (name, body, dark) => `<figure style="margin:0;text-align:center;font:600 22px 'Nunito',system-ui;color:${C.charcoal}">
    <div style="width:240px;height:240px;border-radius:54px;overflow:hidden;box-shadow:0 10px 30px rgba(122,75,42,.15)">${svg(body, { size: 240, bg: dark ? '#22242F' : C.cream })}</div>
    <figcaption style="margin-top:14px">${name}</figcaption></figure>`;
  const sheet = `<div id="sheet" style="width:1240px;padding:48px;background:${C.cream};font-family:system-ui">
    <h1 style="font:800 44px system-ui;color:${C.charcoal};margin:0 0 6px">oursome<span style="color:${C.coral}">.</span> — app icon concepts</h1>
    <p style="font:20px system-ui;color:#6B6D7B;margin:0 0 36px">Togetherness · organisation · warmth. Name is provisional pending clearance.</p>
    <div style="display:flex;gap:44px">${concepts.map(([n, b]) => tile(n, b)).join('')}</div>
    <div style="display:flex;gap:44px;margin-top:40px">${concepts.map(([n, b]) => tile(n + ' · dark', b, true)).join('')}</div></div>`;
  await page.setViewportSize({ width: 1340, height: 900 });
  await page.setContent(`<html><body style="margin:0">${sheet}</body></html>`);
  await page.locator('#sheet').screenshot({ path: out('docs/brand/icon-concepts.png') });
  fs.writeFileSync(out('docs/brand/icon-gathering.svg'), svg(gathering(), { size: 1024 }));
  await browser.close();
  console.log('Brand assets generated.');
})();
