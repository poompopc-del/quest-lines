// Local dev server: `npm start` → http://localhost:3000
// Serves the static game in public/ + the online API (api/*.js) with an in-memory store (no keys, no costs).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');

const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webp':'image/webp', '.txt':'text/plain; charset=utf-8', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.mp3':'audio/mpeg', '.ogg':'audio/ogg' };

process.env.QL_MEMORY_STORE = process.env.QL_MEMORY_STORE || '1';
const API = { '/api/lb': () => import('./api/lb.js'), '/api/save': () => import('./api/save.js') };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (API[url.pathname]) { const m = await API[url.pathname](); req.query = Object.fromEntries(url.searchParams); return m.default(req, res); }
  let file = path.normalize(path.join(pub, decodeURIComponent(url.pathname)));
  if (!file.startsWith(pub)) { res.writeHead(403).end(); return; }
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
  catch { file = path.join(pub, 'index.html'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(process.env.PORT || 3000, () => {
  console.log(`⚔️  Quest Lines → http://localhost:${process.env.PORT || 3000}`);
});
