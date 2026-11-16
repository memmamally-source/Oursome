// Static checks on dist/: valid HTML, every internal link and asset resolves,
// each page has exactly one <h1>, a title, description and canonical URL, and
// the stable per-app URLs used by the app stores exist.
import fs from 'node:fs';
import path from 'node:path';
import { HtmlValidate, FileSystemConfigLoader } from 'html-validate';
import { apps } from '../src/data/apps.ts';
import { appPaths } from '../src/lib/url.ts';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const problems = [];

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const resolveLocal = (ref, fromFile) => {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return true;
  let target;
  if (clean.startsWith('/')) {
    if (!clean.startsWith(base)) return false;
    target = path.join(dist, clean.slice(base.length));
  } else {
    target = path.resolve(path.dirname(fromFile), clean);
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  return fs.existsSync(target);
};

const validator = new HtmlValidate(new FileSystemConfigLoader());
for (const file of htmlFiles) {
  const rel = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  const report = await validator.validateString(html, rel);
  for (const r of report.results) for (const m of r.messages) problems.push(`${rel}:${m.line}:${m.column} ${m.ruleId}: ${m.message}`);

  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const ref = m[1].split(/\s+/)[0];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    if (!resolveLocal(ref, file)) problems.push(`${rel}: broken link ${ref}`);
  }
  if (rel === '404.html') continue;
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) problems.push(`${rel}: expected one <h1>, found ${h1s}`);
  if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) problems.push(`${rel}: missing or short description`);
  if (!/<link rel="canonical" href="https?:\/\//.test(html)) problems.push(`${rel}: missing canonical`);
  if (!/<meta property="og:image" content="https?:\/\//.test(html)) problems.push(`${rel}: missing og:image`);
  if (/to be supplied\]/.test(html) && !/name="robots" content="noindex/.test(html)) problems.push(`${rel}: placeholder shown on an indexable page`);
}

// Stable URLs referenced from App Store Connect / Play Console.
const required = ['/', '/apps/', '/about/', '/support/', '/support/data-deletion/', '/contact/', '/privacy/', '/legal/', '/news/', ...apps.flatMap((a) => Object.values(appPaths(a.slug)))];
for (const p of required) if (!fs.existsSync(path.join(dist, p, 'index.html'))) problems.push(`missing required page ${p}`);
for (const f of ['sitemap-index.xml', 'robots.txt', 'favicon.svg', 'og-image.png', 'apple-touch-icon.png', 'site.webmanifest', '404.html', 'app-accents.css']) {
  if (!fs.existsSync(path.join(dist, f))) problems.push(`missing ${f}`);
}
for (const a of apps) if (!fs.existsSync(path.join(dist, 'images/apps', `${a.slug}.webp`))) problems.push(`missing icon for ${a.slug}`);

if (problems.length) {
  console.error(`Site checks failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Site checks passed: ${htmlFiles.length} HTML files, links, metadata and required URLs.`);
