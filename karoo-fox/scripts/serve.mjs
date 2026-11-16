// Minimal static server for dist/ that behaves like GitHub Pages
// (directory index.html, 404.html for missing paths). Used by the tests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

export function serve(root, port = 0, base = '/') {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404, { 'Content-Type': types['.html'] });
      return res.end(fs.readFileSync(path.join(root, '404.html')));
    }
    let file = path.join(root, decodeURIComponent(url.pathname.slice(base.length - 1)));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': types['.html'] });
      return res.end(fs.readFileSync(path.join(root, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.resolve(import.meta.dirname, '../dist');
  const s = await serve(root, Number(process.env.PORT ?? 4321), (process.env.BASE_PATH || '/').replace(/\/?$/, '/'));
  console.log(`Serving ${root} at http://127.0.0.1:${s.address().port}/`);
}
