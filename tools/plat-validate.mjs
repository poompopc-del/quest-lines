// Platform Mode level validator — runs the REAL engine physics (js/plat/*.js) headless.
// For every level: rows have equal width, start/exit exist, and the exit and every gem are
// reachable by a player with the weakest movement in the roster (speed .86, no air jumps,
// widest box) using only walking / jumping / springs / moving platforms.
// usage: node tools/plat-validate.mjs [levelId]   (npm run validate:levels)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/js/plat');
const ctx = vm.createContext({ console, Math, Set, Map, Uint8Array, Array, Object, JSON, Number, String, performance: { now: () => 0 } });
for (const f of ['core', 'world', 'anim', 'heroes', 'player', 'enemies', 'levels']) vm.runInContext(fs.readFileSync(`${root}/${f}.js`, 'utf8'), ctx, { filename: f + '.js' });
const PLAT = ctx.globalThis ? ctx.globalThis.PLAT : ctx.PLAT;
const { C, world: W, TILE } = PLAT, T = C.T;
PLAT.HEROES.__test = { name: 'test', sprite: { kind: 'strip', dir: '', ch: 1, anims: {} }, poses: {}, box: [24, 44], hp: 9, speed: .86, jump: 1, attack: { kind: 'combo', steps: [] } };

function makeInput() {
  const held = {}, pressed = {};
  return { held, pressed, isHeld: a => !!held[a], wasPressed: a => !!pressed[a] };
}
function stubGame(L, input) {
  return { L, input, stats: { hits: 0 }, hit: () => 0, dust() {}, burst() {}, text() {}, hazardNear: () => false, spawnProj() {}, fx: () => ({}),
    shake() {}, hitstop() {}, afterimage() {}, nearestEnemy: () => null, countProj: () => 0 };
}
const sheet = new PLAT.Sheet({ kind: 'strip', dir: '', ch: 1, anims: {} });

function validate(id) {
  const spec = PLAT.LEVELS[id], errs = [];
  const widths = new Set(spec.map.map(r => r.length)); if (widths.size !== 1) errs.push(`rows have different widths: ${[...widths]}`);
  const base = W.buildLevel(spec);
  if (!base.exit) errs.push('no exit E'); if (!spec.map.some(r => r.includes('P'))) errs.push('no start P');
  if (!spec.boss && base.gems.length !== 3) errs.push(`has ${base.gems.length} gems (want 3)`);
  // breakable blocks are assumed broken (any hero can break them)
  for (let i = 0; i < base.tiles.length; i++) if (base.tiles[i] === TILE.BREAK) base.tiles[i] = 0;
  const phases = base.movers.length ? 8 : 1;
  const freeze = (L, k) => { for (const m of L.movers) { const off = (Math.sin(m.t0 + k / phases * Math.PI * 2) * .5 + .5) * m.range; m.x = m.axis === 'x' ? m.x0 + off : m.x0; m.y = m.axis === 'y' ? m.y0 + off : m.y0; m.prevY = m.y; m.dx = 0; m.dy = 0; } };
  base.movers.forEach(m => m.t0 = m.t);
  const hazard = p => W.tilesIn(base, { x: p.x + 2, y: p.y + 4, w: p.w - 4, h: p.h - 4 }, TILE.SPIKE).length || W.tilesIn(base, p, TILE.LIQUID).length || p.y > base.ph + 40;
  const gemsGot = new Set(); let exitOk = false;
  const touch = p => { for (const g of base.gems) if (Math.abs(g.x - p.cx) < 10 + p.w / 2 && Math.abs(g.y - (p.y + p.h / 2)) < 10 + p.h / 2) gemsGot.add(g.i);
    if (base.exit && p.x < base.exit.x + base.exit.w && p.x + p.w > base.exit.x && p.y < base.exit.y + base.exit.h && p.y + p.h > base.exit.y) exitOk = true; };
  const key = p => p.mover ? 'm' + p.mover.id : `${Math.floor(p.cx / T)},${Math.round(p.feet / T)}`;
  const seen = new Set(), queue = [];
  const input = makeInput(), g = stubGame(base, input), P = new PLAT.Player(g, '__test', base.start, sheet);
  P.lastSafe = base.start;
  function push(st) { const k = st.key; if (seen.has(k)) return; seen.add(k); queue.push(st); }
  // settle at start
  P.reset(base.start); for (let i = 0; i < 30; i++) { P.update(input); }
  push({ key: key(P), x: P.x, y: P.y, mover: null });
  let sims = 0;
  while (queue.length) {
    const st = queue.shift();
    for (let k = 0; k < phases; k++) {
      freeze(base, k);
      // start positions: if on a mover, its current spot in this phase
      let starts;
      if (st.mover != null) { const m = base.movers[st.mover]; starts = [m.x + 2, m.x + m.w / 2 - P.w / 2, m.x + m.w - P.w - 2].map(x => ({ x, y: m.y - P.h })); }
      else { if (k > 0 && !base.movers.some(m => Math.abs(m.x0 - st.x) < 12 * T && Math.abs(m.y0 - st.y) < 12 * T)) continue; starts = [{ x: st.x, y: st.y }]; }
      for (const s0 of starts) for (const dir of [-1, 1]) for (const v0 of [0, C.WALK * .86, C.RUN * .86]) for (const hold of [-2, -1, 4, 8, 14, 22, 60]) for (const rel of [999, 8, 18, 30]) {
        P.reset({ x: s0.x + P.w / 2, y: s0.y + P.h }); P.x = s0.x; P.y = s0.y; P.vx = dir * v0; P.face = dir; P.runT = v0 > C.WALK ? C.RUN_AFTER : 0;
        // settle onto the ground / mover for one frame
        for (const a in input.held) input.held[a] = false; for (const a in input.pressed) delete input.pressed[a];
        P.update(input); if (!P.onGround) continue;
        sims++; let air = false, ok = true;
        for (let f = 0; f < 160; f++) {
          for (const a in input.pressed) delete input.pressed[a];
          input.held.left = dir < 0 && f < rel; input.held.right = dir > 0 && f < rel;
          if (hold >= 0) { input.held.jump = f < hold; if (f === 0) input.pressed.jump = true; } else input.held.jump = hold === -2;   // -2: walk (onto a spring) holding jump
          P.update(input); touch(P);
          if (hazard(P)) { ok = false; break; }
          if (!P.onGround) air = true;
          else if (air || (hold < 0 && Math.abs(P.x - s0.x) > T * 2)) break;
        }
        if (!ok || !P.onGround) continue;
        const mi = P.mover ? P.mover.id : null;
        push({ key: mi != null ? 'm' + mi : key(P), x: P.x, y: P.y, mover: mi });
      }
    }
  }
  if (!exitOk) errs.push('exit NOT reachable');
  const missing = base.gems.filter(g => !gemsGot.has(g.i)).map(g => `(${Math.floor(g.x / T)},${Math.floor(g.y / T)})`);
  if (missing.length) errs.push('gems NOT reachable: ' + missing.join(' '));
  // DBG=1 prints how far the search got
  if (process.env.DBG) { const cols = [...seen].filter(k => k[0] !== "m").map(k => k.split(",").map(Number)); console.log("   max col", Math.max(...cols.map(c => c[0])), "min row", Math.min(...cols.map(c => c[1]))); }
  return { id, errs, nodes: seen.size, sims };
}
const only = process.argv[2]; let bad = 0;
for (const id of PLAT.LEVEL_ORDER) { if (only && id !== only) continue; const r = validate(id); bad += r.errs.length; console.log(`${r.errs.length ? '✗' : '✓'} ${id}  nodes:${r.nodes} sims:${r.sims}${r.errs.length ? '\n    ' + r.errs.join('\n    ') : ''}`); }
process.exit(bad ? 1 : 0);
