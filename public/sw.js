/*
 * Oursome service worker: fast repeat visits and offline support.
 * - Install caches only what the first screen needs (CORE).
 * - Pages: network first (new deploys show up immediately), falling back
 *   to the cached app shell when offline.
 * - Built files have content hashes, so they are served cache-first.
 * - Once the app is idle it asks us to "warm" the remaining screens (WARM),
 *   fetched one at a time so they never compete with the first load.
 * - On activate, files from older deploys are removed.
 * The version, base path and file lists are filled in by scripts/build-web.js.
 */
const VERSION = '__VERSION__';
const SHELL_CACHE = `oursome-shell-${VERSION}`;
const ASSET_CACHE = 'oursome-assets';
const SHELL = '__BASE__/index.html';
const CORE = __CORE__;
const WARM = __WARM__;
const CURRENT = new Set([...CORE, ...WARM].map((p) => new URL(p, self.location.origin).href));

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL)),
      caches.open(ASSET_CACHE).then((cache) => cache.addAll(CORE)),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('oursome-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
      const assets = await caches.open(ASSET_CACHE);
      const stale = (await assets.keys()).filter((req) => !CURRENT.has(req.url));
      await Promise.all(stale.map((req) => assets.delete(req)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data !== 'warm') return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      for (const url of WARM) {
        if (!(await cache.match(url))) await cache.add(url).catch(() => {});
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (!CURRENT.has(request.url)) return; // Not a built file: let the browser handle it.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
