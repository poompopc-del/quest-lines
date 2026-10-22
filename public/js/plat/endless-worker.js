/* PLATFORM MODE · Endless chunk generator in a Web Worker (v92).
   Same code and seed as the page (endless.js), so the chunks are identical to what the page would
   build itself — the worker only moves the build + validation off the main thread (no frame hitch).
   init: rebuild the run up to `upTo` (the page already placed those) · next: build + validate chunk gi. */
const V = self.location.search || '';
importScripts(...['core', 'world', 'anim', 'heroes', 'x4-sheet', 'xmod', 'player', 'enemies', 'levels', 'items', 'endless'].map(f => f + '.js' + V));
let gen = null;
const ser = c => ({ gi: c.gi, inRow: c.inRow, outRow: c.outRow, tier: c.tier, tiles: c.tiles.slice(), coins: c.coins, hearts: c.hearts, springs: c.springs, movers: c.movers, spawns: c.spawns, signs: c.signs, pats: c.pats });
onmessage = e => {
  const m = e.data;
  try {
    if (m.cmd === 'init') { gen = new PLAT.Endless.Generator(m.world, m.seed); gen.start(); for (let i = 1; i < m.upTo; i++) gen.next(i); postMessage({ cmd: 'ready' }); }
    else if (m.cmd === 'next' && gen) { const t = Date.now(), c = gen.next(m.gi); postMessage({ cmd: 'chunk', gi: m.gi, chunk: ser(c), ms: Date.now() - t, stats: gen.stats, log: gen.log.slice(-8) }); }
  } catch (err) { postMessage({ cmd: 'error', gi: m.gi, msg: String(err && err.stack || err) }); }
};
