// Browser checks on the built site: loads every page in Chromium at small
// phone, phone, tablet and desktop widths and fails on console errors, CSP
// violations, failed requests, horizontal scrolling, broken images, logos
// placed on a non-white background (the approved artwork has a white canvas)
// or axe accessibility violations.
// SCREENSHOTS=dir also saves full-page screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../scripts/serve.mjs';

import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const dist = path.resolve(import.meta.dirname, '../dist');
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') pages.push('/' + path.relative(dist, path.dirname(p)).split(path.sep).filter(Boolean).join('/') + (p === path.join(dist, 'index.html') ? '' : '/'));
  }
})(dist);
pages.push('/this-page-does-not-exist/');

const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const server = await serve(dist, 0, base);
const origin = `http://127.0.0.1:${server.address().port}${base.slice(0, -1)}`;
const shots = process.env.SCREENSHOTS;
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const failures = [];
const viewports = [
  { name: 'small-phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];
for (const scheme of ['light']) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme, deviceScaleFactor: 1 });
    for (const url of pages) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => {
        const expected404 = url.includes('does-not-exist') && m.text().includes('404');
        if (m.type() === 'error' && !expected404) errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
      page.on('response', (r) => {
        if (r.status() >= 400 && !(url.includes('does-not-exist') && r.url() === origin + url)) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(origin + url, { waitUntil: 'networkidle' });
      // Scroll through so lazy images load, then return to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 20));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) errors.push(`horizontal overflow of ${overflow}px`);
      const imageProblems = await page.evaluate(() => {
        const out = [];
        for (const img of document.images) {
          if (!img.complete || img.naturalWidth === 0) out.push(`image did not load: ${img.currentSrc || img.src}`);
          if (!img.hasAttribute('data-white-canvas')) continue;
          let el = img;
          let bg = 'rgba(0, 0, 0, 0)';
          while (el && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
            bg = getComputedStyle(el).backgroundColor;
            el = el.parentElement;
          }
          if (bg !== 'rgb(255, 255, 255)') out.push(`white-canvas logo on ${bg}: ${img.currentSrc}`);
        }
        return out;
      });
      errors.push(...imageProblems);
      // Injected through DevTools, so the page's strict CSP stays in force for everything else.
      await page.evaluate(axeSource);
      const axe = await page.evaluate(async () => {
        // @ts-ignore
        if (!window.axe) return { violations: [{ id: 'axe-not-loaded', nodes: [] }] };
        // @ts-ignore
        return window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
      });
      for (const v of axe.violations) errors.push(`axe ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      if (shots) await page.screenshot({ path: path.join(shots, `${scheme}-${vp.name}${url.replace(/\//g, '_') || '_home'}.png`), fullPage: true });
      if (errors.length) failures.push(`${scheme} ${vp.name} ${url}\n    ${errors.join('\n    ')}`);
      await page.close();
    }
    await ctx.close();
  }
}
// Keyboard: the first Tab reaches the skip link, Enter moves focus to <main>,
// and focused elements show a visible outline.
{
  const page = await browser.newPage();
  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.className);
  if (first !== 'skip-link') failures.push(`keyboard: first Tab focused "${first}", expected the skip link`);
  await page.keyboard.press('Enter');
  const after = await page.evaluate(() => document.activeElement?.id);
  if (after !== 'main') failures.push(`keyboard: skip link moved focus to "${after}", expected main`);
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  if (outline === 'none') failures.push('keyboard: focused element has no visible outline');
  await page.close();
}
await browser.close();
server.close();
if (failures.length) {
  console.error(`Browser checks failed on ${failures.length} page view(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Browser checks passed: ${pages.length} pages × ${viewports.length} widths (320–1280 px).`);
