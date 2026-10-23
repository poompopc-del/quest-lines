// GET  /api/lb?board=<id>&pid=<player id>   → { top: [{ rank, name, score, extra }], me: { rank, score } | null, total }
// POST /api/lb { board, pid, name, score, extra } → keeps each player's BEST (higher score wins; boss rush: lower time wins)
// boards: daily:YYYY-MM-DD (score) · endless:1..6 (score) · rush (frames, lower is better)
import { ready, run, body, send, limited } from './_store.js';
const BOARD = /^(daily:\d{4}-\d{2}-\d{2}|endless:[1-6]|rush)$/;
const low = b => b === 'rush';
const MAX = b => b === 'rush' ? 3600 * 60 : 50000000;
const clean = s => String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 16) || 'ผู้กล้า';
export default async function handler(req, res) {
  if (!ready()) return send(res, 503, { error: 'not-configured' });
  try {
    if (req.method === 'GET') {
      const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      const b = String(q.board || ''), pid = String(q.pid || '');
      if (!BOARD.test(b)) return send(res, 400, { error: 'board' });
      const k = 'lb:' + b, rg = low(b) ? ['ZRANGE', k, 0, 19] : ['ZRANGE', k, 0, 19, 'REV'];
      const [flat, total, rank, sc] = await run([rg, ['ZCARD', k], [low(b) ? 'ZRANK' : 'ZREVRANK', k, pid || '-'], ['ZSCORE', k, pid || '-']]);
      const ids = []; for (let i = 0; i < flat.length; i += 2) ids.push([flat[i], +flat[i + 1]]);
      const info = ids.length ? (await run([['HMGET', 'lbn:' + b, ...ids.map(x => x[0])]]))[0] : [];
      const top = ids.map(([id, s], i) => { let o = {}; try { o = JSON.parse(info[i] || '{}'); } catch (e) {} return { rank: i + 1, name: o.n || 'ผู้กล้า', hero: o.h || '', extra: o.x || null, score: s, me: id === pid }; });
      return send(res, 200, { board: b, low: low(b), top, total, me: rank == null ? null : { rank: rank + 1, score: +sc } });
    }
    if (req.method === 'POST') {
      const d = await body(req), b = String(d.board || ''), pid = String(d.pid || ''), score = Math.round(+d.score);
      if (!BOARD.test(b) || !/^[a-f0-9]{16}$/.test(pid) || !Number.isFinite(score) || score <= 0 || score > MAX(b)) return send(res, 400, { error: 'bad' });
      if (!(await limited(req, 'lb', 2))) return send(res, 429, { error: 'slow' });
      const k = 'lb:' + b, ttl = b.startsWith('daily:') ? 60 * 60 * 24 * 14 : null;
      const x = d.extra && typeof d.extra === 'object' ? { d: +d.extra.d || 0, t: +d.extra.t || 0, g: String(d.extra.g || '').slice(0, 24) } : null;
      const cmds = [['ZADD', k, low(b) ? 'LT' : 'GT', score, pid], ['HSET', 'lbn:' + b, pid, JSON.stringify({ n: clean(d.name), h: String(d.hero || '').slice(0, 16), x })]];
      if (ttl) cmds.push(['EXPIRE', k, ttl], ['EXPIRE', 'lbn:' + b, ttl]);
      await run(cmds);
      const [rank] = await run([[low(b) ? 'ZRANK' : 'ZREVRANK', k, pid]]);
      return send(res, 200, { ok: true, rank: rank == null ? null : rank + 1 });
    }
    return send(res, 405, { error: 'method' });
  } catch (e) { return send(res, 500, { error: 'store' }); }
}
