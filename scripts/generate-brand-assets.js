/**
 * Oursome brand assets: the "O with a home" mark, the horizontal logo, app
 * icons, favicons, PWA icons and the social image, all drawn from the same
 * vector geometry (see logoGeometry below and src/components/brand/Logo.tsx).
 *
 * Requires `playwright` (not a project dependency) for the PNG exports:
 *   NODE_PATH=/path/to/node_modules node scripts/generate-brand-assets.js
 * The wordmark is "oursome" in Nunito Sans ExtraBold (SIL Open Font Licence),
 * outlined to a path in assets/brand/wordmark-path.json.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = (p) => path.join(root, p);

// Mirrors src/config/brand.ts.
const C = {
  navy: '#102A43',
  ocean: '#1769AA',
  turquoise: '#12B8B0',
  deepBlue: '#0F4C80',
  cloud: '#F7FBFE',
  white: '#FFFFFF',
  night: '#0B1A2B',
  // Lighter tones of the mark for dark backgrounds.
  oceanLight: '#4DA3E8',
  turquoiseLight: '#2CCFC6',
  blueLight: '#3B8FD9',
};

// ---- Geometry (100 × 100) ---------------------------------------------------
const R_OUT = 46;
const R_IN = 30;
const APEX = 40; // roof peak height
function roofMeetsCircle() {
  // Roof lines fall at 45° from (50, APEX): (50 ∓ s, APEX + s) on the outer circle.
  const d = APEX - 50;
  const s = (-d + Math.sqrt(d * d - 2 * (d * d - R_OUT * R_OUT))) / 2;
  return s;
}
const s = roofMeetsCircle();
const f = (n) => n.toFixed(2);
const L = [50 - s, APEX + s];
const Rt = [50 + s, APEX + s];
const round = 3;
const HOUSE = `M ${f(L[0])} ${f(L[1])} L ${f(50 - round)} ${f(APEX + round)} Q 50 ${APEX} ${f(50 + round)} ${f(APEX + round)} L ${f(Rt[0])} ${f(Rt[1])} A ${R_OUT} ${R_OUT} 0 0 1 ${f(L[0])} ${f(L[1])} Z`;
const circle = (r) => `M ${50 - r} 50 A ${r} ${r} 0 1 0 ${50 + r} 50 A ${r} ${r} 0 1 0 ${50 - r} 50 Z`;
const RING = `${circle(R_OUT)} ${circle(R_IN)}`;
const PANE = 8;
const GAP = 2.6;
const WIN_Y = 61.5;
const panes = [0, 1].flatMap((r) => [0, 1].map((c) => [50 - PANE - GAP / 2 + c * (PANE + GAP), WIN_Y + r * (PANE + GAP)]));

/** The mark as SVG markup (no <svg> wrapper). `id` keeps gradient/mask ids unique. */
function mark({ id = 'o', dark = false, mono = null } = {}) {
  const ring = mono ? mono : `url(#${id}-ring)`;
  const house = mono ? mono : `url(#${id}-house)`;
  const [r1, r2, h1, h2] = dark
    ? [C.oceanLight, C.turquoiseLight, C.blueLight, C.ocean]
    : [C.ocean, C.turquoise, C.ocean, C.deepBlue];
  return `<defs>
    <linearGradient id="${id}-ring" x1="0.1" y1="0.9" x2="0.9" y2="0.1"><stop offset="0" stop-color="${r1}"/><stop offset="1" stop-color="${r2}"/></linearGradient>
    <linearGradient id="${id}-house" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${h1}"/><stop offset="1" stop-color="${h2}"/></linearGradient>
    <mask id="${id}-gap" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/><path d="${HOUSE}" fill="#000" stroke="#000" stroke-width="7" stroke-linejoin="round"/></mask>
    <mask id="${id}-win" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${panes.map(([x, y]) => `<rect x="${f(x)}" y="${f(y)}" width="${PANE}" height="${PANE}" rx="1.8" fill="#000"/>`).join('')}</mask>
  </defs>
  <path d="${RING}" fill-rule="evenodd" fill="${ring}" mask="url(#${id}-gap)"/>
  <path d="${HOUSE}" fill="${house}" mask="url(#${id}-win)"/>`;
}

const word = JSON.parse(fs.readFileSync(out('assets/brand/wordmark-path.json'), 'utf8'));
/** Horizontal lockup: mark, then "oursome" with its x-height centred on the mark. */
function lockup({ dark = false, id = 'l' } = {}) {
  const xh = 36;
  const k = xh / word.xHeight;
  const gap = 20;
  const width = 100 + gap + word.width * k;
  const text = dark ? C.cloud : C.navy;
  const body = `${mark({ id, dark })}<path transform="translate(${100 + gap} ${50 + xh / 2}) scale(${k.toFixed(5)})" d="${word.d}" fill="${text}"/>`;
  return { body, width };
}

const svgDoc = (body, { vb = '0 0 100 100', w = 1024, h = w, bg = null, bgRect = '-50 -50 300 300' } = {}) => {
  const [bx, by, bw, bh] = bgRect.split(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${bg ? `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${bg}"/>` : ''}${body}</svg>`;
};

(async () => {
  fs.mkdirSync(out('assets/brand'), { recursive: true });
  fs.mkdirSync(out('public/icons'), { recursive: true });

  // ---- SVG masters ----
  const light = lockup();
  const dark = lockup({ dark: true, id: 'ld' });
  const masters = {
    'assets/brand/oursome-mark.svg': svgDoc(mark(), { vb: '-2 -2 104 104', w: 512 }),
    'assets/brand/oursome-mark-on-dark.svg': svgDoc(mark({ dark: true }), { vb: '-2 -2 104 104', w: 512 }),
    'assets/brand/oursome-mark-mono.svg': svgDoc(mark({ mono: C.navy }), { vb: '-2 -2 104 104', w: 512 }),
    'assets/brand/oursome-logo.svg': svgDoc(light.body, { vb: `-4 -4 ${f(light.width + 8)} 108`, w: Math.round((light.width + 8) * 4), h: 432 }),
    'assets/brand/oursome-logo-on-dark.svg': svgDoc(dark.body, { vb: `-4 -4 ${f(dark.width + 8)} 108`, w: Math.round((dark.width + 8) * 4), h: 432 }),
  };
  for (const [file, markup] of Object.entries(masters)) fs.writeFileSync(out(file), markup + '\n');

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage();
  const render = async (markup, file, w, h = w, transparent = true) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.locator('svg').first().screenshot({ path: out(file), omitBackground: transparent });
  };

  // ---- PNG exports of the logo ----
  await render(svgDoc(mark(), { vb: '-2 -2 104 104', w: 1024 }), 'assets/brand/oursome-mark-1024.png', 1024);
  await render(svgDoc(mark(), { vb: '-2 -2 104 104', w: 256 }), 'assets/brand/oursome-mark-256.png', 256);
  await render(svgDoc(mark({ dark: true }), { vb: '-2 -2 104 104', w: 1024 }), 'assets/brand/oursome-mark-on-dark-1024.png', 1024);
  const lw = 1600, lh = Math.round(lw * 108 / (light.width + 8));
  await render(svgDoc(light.body, { vb: `-4 -4 ${f(light.width + 8)} 108`, w: lw, h: lh }), 'assets/brand/oursome-logo-1600.png', lw, lh);
  await render(svgDoc(dark.body, { vb: `-4 -4 ${f(dark.width + 8)} 108`, w: lw, h: lh, bg: C.night, bgRect: `-10 -10 ${light.width + 30} 130` }), 'assets/brand/oursome-logo-on-dark-1600.png', lw, lh, false);

  // ---- App icons ----
  // iOS: square and opaque (iOS rounds the corners). White, with the mark at ~78%.
  await render(svgDoc(mark({ id: 'i' }), { vb: '-14 -14 128 128', w: 1024, bg: C.white }), 'assets/images/icon.png', 1024, 1024, false);
  // Android adaptive: the mark inside the 66% safe zone; plain background; monochrome for themed icons.
  await render(svgDoc(mark({ id: 'a' }), { vb: '-37 -37 174 174', w: 1024 }), 'assets/images/android-icon-foreground.png', 1024);
  await render(svgDoc('', { w: 1024, bg: C.white }), 'assets/images/android-icon-background.png', 1024, 1024, false);
  await render(svgDoc(mark({ id: 'm', mono: '#000000' }), { vb: '-37 -37 174 174', w: 1024 }), 'assets/images/android-icon-monochrome.png', 1024);
  // Splash and favicon.
  await render(svgDoc(mark({ id: 's' }), { w: 512 }), 'assets/images/splash-icon.png', 512);
  await render(svgDoc(mark({ id: 'f' }), { vb: '-4 -4 108 108', w: 196, bg: C.white }), 'assets/images/favicon.png', 196, 196, false);
  // Web app (PWA) icons; "maskable" keeps the mark inside the 80% safe zone.
  await render(svgDoc(mark({ id: 'p1' }), { vb: '-10 -10 120 120', w: 512, bg: C.white }), 'public/icons/icon-512.png', 512, 512, false);
  await render(svgDoc(mark({ id: 'p2' }), { vb: '-10 -10 120 120', w: 192, bg: C.white }), 'public/icons/icon-192.png', 192, 192, false);
  await render(svgDoc(mark({ id: 'p3' }), { vb: '-26 -26 152 152', w: 512, bg: C.white }), 'public/icons/icon-maskable-512.png', 512, 512, false);
  await render(svgDoc(mark({ id: 'p4' }), { vb: '-12 -12 124 124', w: 180, bg: C.white }), 'public/icons/apple-touch-icon.png', 180, 180, false);
  fs.writeFileSync(out('public/icons/favicon.svg'), svgDoc(mark({ id: 'fv' }), { vb: '-2 -2 104 104', w: 64 }) + '\n');

  // ---- Social preview (1200 × 630) ----
  const og = `<div id="og" style="width:1200px;height:630px;background:${C.cloud};position:relative;overflow:hidden;font-family:'Nunito Sans',system-ui,sans-serif">
    <div style="position:absolute;right:-160px;top:-180px;width:640px;height:640px;border-radius:50%;background:#E5F5FB"></div>
    <div style="position:absolute;left:90px;top:150px">${svgDoc(light.body, { vb: `-4 -4 ${f(light.width + 8)} 108`, w: 640, h: Math.round(640 * 108 / (light.width + 8)) })}</div>
    <div style="position:absolute;left:96px;top:370px;width:900px;font:700 46px/1.2 system-ui,sans-serif;color:${C.navy}">Life’s better together.</div>
    <div style="position:absolute;left:96px;top:440px;width:900px;font:400 28px/1.4 system-ui,sans-serif;color:#64748B">Shared calendar, tasks, shopping lists and photo albums for your household.</div></div>`;
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<html><body style="margin:0">${og}</body></html>`);
  await page.locator('#og').screenshot({ path: out('public/og-image.png') });

  // ---- Review sheet ----
  const tile = (body, bg, label, fg = C.navy) => `<figure style="margin:0;text-align:center;font:600 18px system-ui;color:${fg}">
    <div style="width:200px;height:200px;border-radius:44px;overflow:hidden;box-shadow:0 8px 24px rgba(16,42,67,.15);background:${bg}">${svgDoc(body, { vb: '-14 -14 128 128', w: 200 })}</div>
    <figcaption style="margin-top:12px">${label}</figcaption></figure>`;
  const sheet = `<div id="sheet" style="width:1180px;padding:48px;background:${C.cloud};font-family:system-ui">
    ${svgDoc(light.body, { vb: `-4 -4 ${f(light.width + 8)} 108`, w: 560, h: Math.round(560 * 108 / (light.width + 8)) })}
    <div style="margin:28px 0;padding:28px;background:${C.night};border-radius:24px;width:600px">${svgDoc(dark.body, { vb: `-4 -4 ${f(dark.width + 8)} 108`, w: 540, h: Math.round(540 * 108 / (dark.width + 8)) })}</div>
    <div style="display:flex;gap:36px;align-items:flex-end">
      ${tile(mark({ id: 'r1' }), C.white, 'App icon')}
      ${tile(mark({ id: 'r2', dark: true }), C.night, 'On dark', C.navy)}
      ${tile(mark({ id: 'r3', mono: C.navy }), C.white, 'One colour')}
      <figure style="margin:0;text-align:center;font:600 18px system-ui;color:${C.navy}"><div style="display:flex;gap:18px;align-items:flex-end">${[64, 32, 16].map((n, i) => svgDoc(mark({ id: 'z' + i }), { vb: '-2 -2 104 104', w: n })).join('')}</div><figcaption style="margin-top:12px">64 · 32 · 16 px</figcaption></figure>
    </div></div>`;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(`<html><body style="margin:0">${sheet}</body></html>`);
  fs.mkdirSync(out('docs/brand'), { recursive: true });
  await page.locator('#sheet').screenshot({ path: out('docs/brand/logo-sheet.png') });
  await browser.close();
  console.log('Brand assets generated.');
})();
