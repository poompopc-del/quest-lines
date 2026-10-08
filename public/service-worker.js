const CACHE_NAME = 'quest-lines-v71';
const V = '?v=71';
const MODULES = ['balance','vocab','core','quests','shell','settings','hub','world','questboard','heroes','inventory','codex','profile','endgame-core','endgame-modes','endgame-ui','armory','items','more','wordfx','boss-encounter','zombies','bestiary','kirby','knight','unlocks','tactics','events','ecl','luffy','sonic','heroplus','heroup','ultcharge','yota','title','dev','boot'];
const APP_SHELL = ['./', './index.html', './manifest.json', './scenes/hub/cave.png', './title/logo.webp', './npc/merchant.png', './icons/icon-192.png', './icons/icon-512.png', './css/ql2.css' + V, './css/endgame.css' + V, './css/battle.css' + V, './css/ui26.css' + V, './css/boss.css' + V, './css/tactics.css' + V, './css/ecl.css' + V,
  './data/lexicon.js' + V, './data/vocabulary.js' + V,
  ...MODULES.map((m) => `./js/ql2/${m}.js${V}`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Network-first for pages, scripts and styles (so updates land right away, cache = offline copy).
// Cache-first for everything else (sprites, scenes, fonts). /api/* is never cached.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('/api/') || req.url.includes('version.json')) return;
  // translation lookups are cached by the game itself; let them go straight to the network
  if (/translate\.googleapis\.com|mymemory\.translated\.net/.test(req.url)) return;
  const url = new URL(req.url);
  const path = url.pathname;
  const fresh = req.mode === 'navigate' || path.endsWith('.html') || path.endsWith('/') || path.endsWith('.js') || path.endsWith('.css');
  const save = (res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, c)); } return res; };
  if (fresh) {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then((r) => r || caches.match(req, { ignoreSearch: true })).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
  } else {
    e.respondWith(caches.match(req).then((cached) => cached || fetch(req).then(save)));
  }
});
