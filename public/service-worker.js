const CACHE_NAME = 'quest-lines-v13d';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Network-first for pages (so updates land right away), cache-first for everything else.
// /api/* is never cached. Google Fonts are cached so the pixel look survives offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('/api/')) return;
  // translation lookups are cached by the game itself; let them go straight to the network
  if (/translate\.googleapis\.com|mymemory\.translated\.net/.test(req.url)) return;
  const isPage = req.mode === 'navigate' || req.url.endsWith('.html') || req.url.endsWith('/');
  const save = (res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, c)); } return res; };
  if (isPage) {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then((cached) => cached || fetch(req).then(save)));
  }
});
