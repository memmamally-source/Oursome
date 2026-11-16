// Browser checks on the built site: loads every page in Chromium at phone and
// desktop sizes and fails on console errors, CSP violations, failed requests,
// horizontal scrolling or axe accessibility violations.
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
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];
for (const scheme of ['light', 'dark']) {
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
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) errors.push(`horizontal overflow of ${overflow}px`);
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
await browser.close();
server.close();
if (failures.length) {
  console.error(`Browser checks failed on ${failures.length} page view(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Browser checks passed: ${pages.length} pages × 2 sizes × light/dark.`);
