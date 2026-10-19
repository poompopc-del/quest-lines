// ENDLESS level test — generates runs with the game's own generator (js/plat/endless.js, same seeds as the
// game) and checks them with the FULL engine search (tools/plat-bfs.mjs: the real Player.update, frame by
// frame). Each run = the intro chunk + N generated chunks stitched into one ordinary level (the seams are
// inside it), start at the left, exit on the last chunk's exit pad.
//   ✓ pass  — the exit is reachable with the weakest roster body AND with X's own jump physics
//   ✗ fail  — not reachable: the seed is printed (re-run: node tools/plat-endless-test.mjs <world> <seed>)
//   ? unverified — the search hit its size limit before deciding
// Also: the per-world SAFE fallback chunk, and the in-game validator never accepting a chunk this rejects.
// usage: node tools/plat-endless-test.mjs [seedsPerWorld=4] [chunks=6]   ·   node tools/plat-endless-test.mjs <world> <seed> [chunks] [fromChunk]
import { loadPlat } from './plat-vm.mjs';
import { bfsValidate } from './plat-bfs.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const PLAT = loadPlat(), E = PLAT.Endless, a = process.argv.slice(2).map(Number);
const single = a.length >= 2 && a[0] >= 1 && a[0] <= 3 && a[1] > 10 ? { world: a[0], seed: a[1], n: a[2] || 6, from: a[3] || 1 } : null;
const SEEDS = single ? 1 : (a[0] || 4), N = single ? single.n : (a[1] || 6);
const heroes = ['__test', 'x'], failed = []; let pass = 0, fail = 0, unk = 0;
const t0 = Date.now();
// every seed is checked twice: the start of a run (LV 1-2) and deep into it (chunks 50+, LV 9-10, hardest)
const runs = single ? [[single.world, single.seed, single.from || 1]] : [1, 2, 3].flatMap(w => [...Array(SEEDS)].flatMap((_, i) => [[w, 1000 + w * 97 + i * 7919, 1], [w, 1000 + w * 97 + i * 7919, 50]]));
for (const [w, seed, from] of runs) {
  const { spec, gen, chunks } = E.toSpec(w, seed, N + 1, from);
  const res = heroes.map(h => bfsValidate(PLAT, spec, { hero: h, gems: false, stopAtExit: true }));
  const bad = res.filter(r => r.errs.length), big = res.some(r => r.sims > 400000);
  const st = gen.stats;
  if (!bad.length) pass++; else if (big) unk++; else { fail++; failed.push({ world: w, seed, from, chunks: N, errs: bad.map((r, i) => r.errs.join('; ')) }); }
  console.log(`${bad.length ? (big ? '?' : '✗') : '✓'} world ${w} seed ${seed} chunks ${chunks[1].gi}-${chunks[chunks.length - 1].gi} (LV ${chunks[1].tier}-${chunks[chunks.length - 1].tier}) · ${chunks.slice(1).map(c => c.pats.join('+')).join(' | ')}
    sims ${res.map(r => r.sims).join('/')} · generator: ${st.tries} tries, ${st.failed} re-rolled, ${st.fallback} fallback${bad.length ? '\n    ' + bad.map(r => r.errs.join('; ')).join('\n    ') : ''}`);
}
// the fallback chunk of every world (used if MAX_TRIES candidates all fail)
for (const w of [1, 2, 3]) {
  const g = new E.Generator(w, 1); const intro = g.start(); const chunks = [intro];
  for (let i = 1; i <= 3; i++) chunks.push(E.safeChunk(i, chunks[i - 1].outRow));
  const ok = chunks.slice(1).every((c, i) => E.validate(chunks[i], c).ok);
  console.log(`${ok ? '✓' : '✗'} world ${w} safe fallback chunk passes the in-game validator`); if (!ok) fail++;
}
if (failed.length) { const f = path.join(os.tmpdir(), 'endless-failed-seeds.json'); fs.writeFileSync(f, JSON.stringify(failed, null, 1)); console.log('failing seeds written to ' + f); }
console.log(`\nEndless: ${pass} pass · ${fail} fail · ${unk} unverified  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(fail ? 1 : 0);
