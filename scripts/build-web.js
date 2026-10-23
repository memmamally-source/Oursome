/**
 * Builds the Oursome website into dist/ (static files, host anywhere).
 *
 *   EXPO_BASE_URL=/Oursome SITE_URL=https://memmamally-source.github.io/Oursome npm run build:web
 *
 * EXPO_BASE_URL: sub-path the site is served from ("" for a custom domain).
 * SITE_URL:      full public URL, used for link previews.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');

let sha = 'local';
try {
  sha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch {}
const version = `${sha}-${Date.now().toString(36)}`;

fs.rmSync(dist, { recursive: true, force: true });
execSync('npx expo export --platform web --output-dir dist', { cwd: root, stdio: 'inherit', env: process.env });

// Everything the app loads on demand, for the service worker to precache.
const listFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const precache = ['_expo', 'assets', 'icons']
  .filter((d) => fs.existsSync(path.join(dist, d)))
  .flatMap((d) => listFiles(path.join(dist, d)))
  .map((f) => `${base}/${path.relative(dist, f).split(path.sep).join('/')}`);

const fill = (file) => {
  const p = path.join(dist, file);
  const text = fs
    .readFileSync(p, 'utf8')
    .replaceAll('__BASE__', base)
    .replaceAll('__SITE_URL__', siteUrl || base)
    .replaceAll('__VERSION__', version)
    .replaceAll('__PRECACHE__', JSON.stringify(precache));
  fs.writeFileSync(p, text);
};
['index.html', 'manifest.webmanifest', 'sw.js'].forEach(fill);

// Single-page app: GitHub Pages serves 404.html for unknown paths, so deep
// links like /calendar load the app and the router takes over.
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
// Stop GitHub Pages' Jekyll step from dropping the `_expo` folder.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const leftover = ['index.html', 'manifest.webmanifest', 'sw.js'].filter((f) =>
  /__BASE__|__VERSION__|__SITE_URL__|__PRECACHE__/.test(fs.readFileSync(path.join(dist, f), 'utf8')),
);
if (leftover.length) throw new Error(`Unreplaced placeholders in: ${leftover.join(', ')}`);

console.log(`\nWebsite built in dist/ (base "${base || '/'}", version ${version}, ${precache.length} files precached).`);
