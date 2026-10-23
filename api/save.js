// Cloud save — the CODE is the key (10 characters, like a password: whoever has it can load / overwrite).
// POST /api/save { data, code? }  → { code }   (no code = a new one)
// GET  /api/save?code=XXXXXXXXXX  → { data, at }
import { ready, run, body, send, limited } from './_store.js';
import { randomBytes } from 'node:crypto';
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', CODE = /^[A-HJ-NP-Z2-9]{10}$/, TTL = 60 * 60 * 24 * 365;
const newCode = () => [...randomBytes(10)].map(b => ABC[b % ABC.length]).join('');
export default async function handler(req, res) {
  if (!ready()) return send(res, 503, { error: 'not-configured' });
  try {
    if (req.method === 'GET') {
      const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams), code = String(q.code || '').toUpperCase();
      if (!CODE.test(code)) return send(res, 400, { error: 'code' });
      if (!(await limited(req, 'sg', 1))) return send(res, 429, { error: 'slow' });
      const [v] = await run([['GET', 'save:' + code]]);
      if (!v) return send(res, 404, { error: 'none' });
      return send(res, 200, JSON.parse(v));
    }
    if (req.method === 'POST') {
      const d = await body(req);
      if (!d.data || typeof d.data !== 'object') return send(res, 400, { error: 'data' });
      const s = JSON.stringify({ data: d.data, at: Date.now() }); if (s.length > 250000) return send(res, 413, { error: 'big' });
      if (!(await limited(req, 'sp', 3))) return send(res, 429, { error: 'slow' });
      let code = String(d.code || '').toUpperCase(); if (!CODE.test(code)) code = newCode();
      await run([['SET', 'save:' + code, s, 'EX', TTL]]);
      return send(res, 200, { ok: true, code });
    }
    return send(res, 405, { error: 'method' });
  } catch (e) { return send(res, 500, { error: 'store' }); }
}
