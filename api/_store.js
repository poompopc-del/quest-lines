// Storage for the online features (leaderboards + cloud save).
// Production: Upstash Redis over REST — add "Upstash for Redis" (free tier) to the Vercel project in the
// Vercel dashboard (Storage → Create / Connect) and it sets KV_REST_API_URL / KV_REST_API_TOKEN by itself.
// `npm start` (server.mjs) sets QL_MEMORY_STORE=1 → an in-memory store, so everything works locally.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = globalThis.__qlMem || (globalThis.__qlMem = { kv: new Map(), z: new Map(), h: new Map(), exp: new Map() });

export const ready = () => !!(URL_ && TOKEN) || process.env.QL_MEMORY_STORE === '1';

async function redis(cmds) {
  const r = await fetch(URL_ + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('store ' + r.status);
  return (await r.json()).map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const live = k => { const e = mem.exp.get(k); if (e && e < Date.now()) { mem.kv.delete(k); mem.z.delete(k); mem.h.delete(k); mem.exp.delete(k); return false; } return true; };

// one tiny command set, same shape for both backends
export async function run(cmds) {
  if (URL_ && TOKEN) return redis(cmds);
  return cmds.map(([c, k, ...a]) => {
    live(k);
    switch (c) {
      case 'GET': return mem.kv.has(k) ? mem.kv.get(k) : null;
      case 'SET': { const nx = a.includes('NX'); if (nx && mem.kv.has(k)) return null; mem.kv.set(k, a[0]); const ex = a.indexOf('EX'); if (ex >= 0) mem.exp.set(k, Date.now() + a[ex + 1] * 1000); return 'OK'; }
      case 'EXPIRE': mem.exp.set(k, Date.now() + a[0] * 1000); return 1;
      case 'ZADD': { const z = mem.z.get(k) || new Map(); mem.z.set(k, z); const flag = a[0] === 'GT' || a[0] === 'LT' ? a.shift() : null; const sc = +a[0], m = a[1], old = z.get(m);
        if (old == null || !flag || (flag === 'GT' ? sc > old : sc < old)) z.set(m, sc); return 1; }
      case 'ZRANGE': { const z = [...(mem.z.get(k) || new Map())]; const rev = a.includes('REV'); z.sort((x, y) => rev ? y[1] - x[1] : x[1] - y[1]);
        return z.slice(+a[0], +a[1] + 1).flatMap(([m, s]) => [m, String(s)]); }
      case 'ZCARD': return (mem.z.get(k) || new Map()).size;
      case 'ZRANK': case 'ZREVRANK': { const z = [...(mem.z.get(k) || new Map())]; z.sort((x, y) => c === 'ZREVRANK' ? y[1] - x[1] : x[1] - y[1]); const i = z.findIndex(([m]) => m === a[0]); return i < 0 ? null : i; }
      case 'ZSCORE': { const v = (mem.z.get(k) || new Map()).get(a[0]); return v == null ? null : String(v); }
      case 'HSET': { const h = mem.h.get(k) || new Map(); mem.h.set(k, h); h.set(a[0], a[1]); return 1; }
      case 'HMGET': { const h = mem.h.get(k) || new Map(); return a.map(f => h.has(f) ? h.get(f) : null); }
      default: throw new Error('unsupported ' + c);
    }
  });
}
// request helpers that work on Vercel (req.body parsed) and in server.mjs
export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 300000) break; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
export function send(res, code, obj) {
  res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export const ip = req => String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'x').trim();
// a short per-IP cooldown so a script cannot hammer the store
export async function limited(req, key, sec) { const [ok] = await run([['SET', `rl:${key}:${ip(req)}`, '1', 'NX', 'EX', sec]]); return ok !== null; }   // true = allowed
