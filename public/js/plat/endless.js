/* ==========================================================================
   PLATFORM MODE · ENDLESS (v92) — procedural runs for the 3 main worlds
   --------------------------------------------------------------------------
   A run is an endless line of 24-column CHUNKS. Each chunk is assembled from
   hand-designed PATTERNS (per world: its own hazards, platforms, mechanics and
   enemies) with seeded randomness, then VALIDATED before it is ever put into
   the level:

     · movement envelope — recorded once from the REAL player physics
       (player.js update() on a test floor) for every movement profile in the
       roster: the weakest reference body the level validator uses (speed .86,
       jump 1, widest box) + every hero with its own physics (X4 jump). No
       jump distance in this file is guessed.
     · reachability — the chunk is joined to the chunk before it (so the seam
       is checked, not each chunk alone) and a search over standable surfaces
       replays the recorded jump / fall / spring arcs against the tile grid
       (walls, ceilings, one-way ledges, spikes, liquid, pits, springs, ferry
       platforms). It must reach the exit pad with EVERY profile.
     · fairness rules — 3-column safe pads at both chunk ends (seams are flat,
       hazard-free, enemy-free), enemies only on flat ground ≥ 5 wide and ≥ 2
       tiles from an edge, no landing on 1-wide ground, hazards never inside a pad.
     · retries — a failed chunk is re-rolled (new seed) up to MAX_TRIES times,
       then a per-world SAFE chunk (validated at start-up) is used instead, then
       plain flat ground. Every failure is logged with its seed (reproducible).

   tools/plat-endless-test.mjs runs many seeds through this generator AND the
   full engine-physics search from tools/plat-validate.mjs (real Player.update,
   frame by frame, moving platforms by phase) — see README.

   The level is a sliding window of 5 chunks (world.js L.ox): one chunk is
   dropped behind the player and one appended ahead, so memory stays flat no
   matter how long the run is. Generation is spread over frames (one attempt per
   frame), never in the middle of a shift.
   Pure logic up to "Runner" — no DOM, so Node tools can run it.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, T = C.T, W = PLAT.world, TL = PLAT.TILE;
const H = 14, CW = 24, WIN = 5, BASE = 12, ROW_MIN = 7, ROW_MAX = 12, PAD = 3, MAX_TRIES = 8;

/* ------------------------------------------------------------------ rng */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(...n) { let h = 2166136261 >>> 0; for (const v of n) { h ^= v >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return h >>> 0; }
const R = rng => ({ f: rng, int: (a, b) => a + Math.floor(rng() * (b - a + 1)), pick: l => l[Math.floor(rng() * l.length)], chance: p => rng() < p });

/* ------------------------------------------------------------------ worlds
   One entry per main world. Same theme / art / enemy skins as the story levels. */
const WORLDS = PLAT.ENDLESS_WORLDS = {
  1: { world: 1, theme: 'meadow', name: 'ทุ่งสไลม์ไม่สิ้นสุด', th: 'สปริง แท่นลอยพาข้ามเหว สะพานบล็อกร่วง เนินหญ้า — สไลม์ กบกระโดด สไลม์ทองหายาก',
       hazard: 'pit', ledge: [TL.ONEWAY, TL.BRICK], color: '#6fd06a',
       pool: [{ t: 'slime', w: 4 }, { t: 'hopper', w: 2.5, d: .12 }, { t: 'golden', w: .5, d: .05 }, { t: 'hopper', w: 1, d: .5, elite: true }],
       pat: { flat: 3, gap: 3, hill: 2, steps: 2, ledges: 2.2, spring: 2.2, crumble: [1.6, .15], ferry: [1.4, .25], arena: [1, .2] } },
  2: { world: 2, theme: 'night', name: 'สุสานไม่สิ้นสุด', th: 'ทุ่งหนามกับแผ่นไม้ ประตูสุสานที่ต้องตีแตก บันไดหลุมศพ บ่อกรด — ซอมบี้เกราะ ผีลอย',
       hazard: 'acid', ledge: [TL.ONEWAY, TL.BRICK], color: '#b08ad8',
       pool: [{ t: 'zombie', w: 4 }, { t: 'cone', w: 2.2, d: .1 }, { t: 'bucket', w: 1.6, d: .35 }, { t: 'ghost', w: 2, d: .18, fly: true }, { t: 'zombie', w: 1, d: .45, elite: true }, { t: 'ghost', w: .8, d: .6, fly: true, elite: true }],
       pat: { flat: 2, gap: 2, spikes: 3, ledges: 2.2, crypt: 2.2, tomb: 2.6, steps: 1.2, arena: [2, .1], spring: .6 } },
  3: { world: 3, theme: 'lava', name: 'ป้อมเพลิงไม่สิ้นสุด', th: 'บ่อลาวา เสาหินโผล่ลาวา สะพานร่วงเหนือลาวา แท่นลอยข้ามลาวา — Licker กระโจน สไลม์แมกม่า Tyrant',
       hazard: 'lava', ledge: [TL.BRICK, TL.ONEWAY], color: '#ff7a3a',
       pool: [{ t: 'licker', w: 3.5 }, { t: 'magma', w: 2.6, d: .1 }, { t: 'salvador', w: 1.4, d: .3, wide: true }, { t: 'tyrant', w: 1.2, d: .45, wide: true }, { t: 'licker', w: 1, d: .5, elite: true }, { t: 'magma', w: .8, d: .55, elite: true }, { t: 'tyrant', w: .5, d: .75, elite: true, wide: true }],
       pat: { flat: 1.5, gap: 3, pillars: 3, crumble: 2.6, ledges: 2, ferry: [2, .2], steps: 1.5, arena: [1.4, .2] } },
  // v113 WORLD 4 — the poison swamp: sinking lily-pad ponds, skull mounds, mossy branches, swamp creatures and mimics
  4: { world: 4, theme: 'swamp', name: 'หนองพิษไม่สิ้นสุด', th: 'บ่อน้ำพิษกับใบบัวที่จม เนินกะโหลก กิ่งไม้ — แมงมุม ปีศาจโคลน สไลม์หนอง เห็ดพ่นสปอร์ ค้างคาว และหีบ Mimic',
       hazard: 'acid', ledge: [TL.ONEWAY, TL.BRICK], color: '#7ad05a',
       pool: [{ t: 'slime', w: 3 }, { t: 'zombie', w: 2.2, d: .05 }, { t: 'goo', w: 2.2, d: .1 }, { t: 'rat', w: 1.6, d: .15 }, { t: 'shroom', w: 1.4, d: .3, wide: true },
         { t: 'ghost', w: 1.4, d: .2, fly: true }, { t: 'bat', w: 1.2, d: .35, fly: true }, { t: 'mimic', w: .7, d: .4, wide: true }, { t: 'goo', w: .8, d: .55, elite: true }, { t: 'shroom', w: .6, d: .65, elite: true, wide: true }],
       pat: { flat: 2, hill: 2.2, steps: 1.4, gap: 1.6, lily: 3.2, ledges: 1.8, tomb: 1.6, spring: .7, crumble: [1.3, .2], arena: [1.4, .2] } },
  // v117 WORLD 5 — the crystal grotto: lava channels, rope bridges, stone pillars; hell hounds, skeleton knights, eyes and bats
  5: { world: 5, theme: 'grotto', name: 'ถ้ำคริสตัลไม่สิ้นสุด', th: 'ลาวาใต้ถ้ำ สะพานเชือก เสาหิน แท่นลอยข้ามลาวา — Hell Hound อัศวินโครงกระดูก ตาบิน ค้างคาว เห็ดพ่นสปอร์',
       hazard: 'lava', ledge: [TL.ONEWAY, TL.BRICK], color: '#3ac0e8',
       pool: [{ t: 'hound', w: 3.2 }, { t: 'goo', w: 2, d: .05 }, { t: 'skel', w: 2, d: .15 }, { t: 'bat', w: 1.6, d: .1, fly: true }, { t: 'eye', w: 1.2, d: .3, fly: true },
         { t: 'shroom', w: 1.2, d: .35, wide: true }, { t: 'goblin', w: 1, d: .45 }, { t: 'hound', w: 1, d: .5, elite: true }, { t: 'skel', w: .6, d: .65, elite: true }],
       pat: { flat: 1.8, gap: 2.6, pillars: 2.6, crumble: 2, ledges: 2.2, ferry: [1.8, .2], steps: 1.6, hill: 1.2, spring: .8, arena: [1.4, .2] } },
};
const CHAMP_FIRST = 180, CHAMP_EVERY = 320, BOON_FIRST = 60, BOON_EVERY = 150;   // v118 boons: first at 60 m, then every 150 m (+ one per endless boss)             // v116 endless boss: first at 180 m, then 320 m after each one is beaten
const enemyTypes = world => [...new Set(WORLDS[world].pool.map(p => p.t))];

/* ------------------------------------------------------------------ chunk */
class Chunk {
  constructor(gi, inRow) { this.gi = gi; this.inRow = inRow; this.outRow = inRow; this.tiles = new Uint8Array(H * CW); this.coins = []; this.hearts = []; this.springs = []; this.movers = []; this.pads = []; this.spawns = []; this.signs = []; this.pats = []; this.safe = []; }
  get(c, r) { return c < 0 || c >= CW || r < 0 || r >= H ? TL.EMPTY : this.tiles[r * CW + c]; }
  set(c, r, t) { if (c >= 0 && c < CW && r >= 0 && r < H) this.tiles[r * CW + c] = t; }
  ground(c0, c1, row, t) { for (let c = c0; c < c1; c++) for (let r = row; r < H; r++) this.set(c, r, r === row && t ? t : TL.GROUND); }
  // the floor of a gap: nothing (pit) · acid at the bottom · lava. `row` = the LOWER of the two floors beside it:
  // lava never stands higher than the ground you land on (it used to — a landing near the edge then touched lava)
  hazard(c0, c1, row, kind) {
    for (let c = c0; c < c1; c++) for (let r = 0; r < H; r++) this.set(c, r, TL.EMPTY);
    if (kind === 'lava') for (let c = c0; c < c1; c++) for (let r = Math.max(row, Math.min(BASE, row + 1)); r < H; r++) this.set(c, r, TL.LIQUID);
    if (kind === 'acid') for (let c = c0; c < c1; c++) for (let r = H - 2; r < H; r++) this.set(c, r, TL.LIQUID);
  }
  coin(c, r) { if (c >= 0 && c < CW && r > 0 && r < H && this.get(c, r) === TL.EMPTY) this.coins.push([c, r]); }
}

/* ------------------------------------------------------------------ movement envelope
   Trajectories recorded from the real controller. A trajectory = per-frame offsets of the body
   centre (dx) and feet (dy) after take-off, plus the run-up distance it needs on flat ground. */
// steer = [first, last) frame after take-off while → is held
const PRESETS = [];
for (const run of [0, 10, 45]) for (const hold of [3, 10, 99]) for (const steer of [[0, 99], [0, 16]]) PRESETS.push({ kind: 'jump', run, hold, steer });
for (const run of [10, 45]) PRESETS.push({ kind: 'fall', run, hold: 0, steer: [0, 99] });
for (const run of [6, 40]) for (const hold of [0, 99]) for (const steer of [[0, 99], [99, 99], [18, 99]]) PRESETS.push({ kind: 'spring', run, hold, steer });
PLAT.HEROES.__endlessRef = { name: 'ref', disabled: true, sprite: { kind: 'strip', dir: '', ch: 1, anims: {} }, poses: {}, box: [24, 44], hp: 9, speed: .86, jump: 1, attack: { kind: 'combo', steps: [] } };

function stubGame(L, input) {
  const no = () => {}, g = { L, input, mode: 'play', frame: 0, parts: [], stats: { hits: 0 }, hit: () => 0, dust: no, burst: no, text: no, hazardNear: () => false, spawnProj: no, fx: () => ({}),
    shake: no, hitstop: no, afterimage: no, nearestEnemy: () => null, countProj: () => 0, emit: no, ultCut: no, flashT: 0, enemies: [], projs: [] };
  return g;
}
let ENV = null;
function profiles() {
  const out = [{ id: '__endlessRef' }], seen = new Set();
  for (const id of PLAT.HERO_ORDER || []) { const h = PLAT.HEROES[id]; if (!h || h.disabled || !h.phys) continue; const k = JSON.stringify([h.phys, h.speed, h.jump, h.box]); if (seen.has(k)) continue; seen.add(k); out.push({ id }); }
  return out;
}
function record(hid) {
  const rows = []; for (let r = 0; r < 32; r++) rows.push((r === BASE || r === BASE + 1 ? '#' : '.').repeat(140));
  const sheet = new PLAT.Sheet({ kind: 'strip', dir: '', ch: 1, anims: {} }), out = [];
  const skip = PLAT.skipIntro; PLAT.skipIntro = true;
  const h = PLAT.HEROES[hid], prof = { id: hid, w: h.box[0], h: h.box[1], traj: [] };
  for (const pre of PRESETS) {
    const L = W.buildLevel({ map: rows }), inp = { held: {}, pressed: {}, isHeld(a) { return !!this.held[a]; }, wasPressed(a) { return !!this.pressed[a]; } };
    const g = stubGame(L, inp), p = new PLAT.Player(g, hid, { x: 4 * T, y: BASE * T }, sheet);
    for (let i = 0; i < 20; i++) p.update(inp);
    const x0 = p.cx;
    for (let f = 0; f < pre.run; f++) { inp.held.right = true; p.update(inp); inp.pressed = {}; }
    const runDist = p.cx - x0, cx0 = p.cx, ft0 = p.feet;
    const clear = () => { for (let c = 0; c < L.w; c++) { W.setTile(L, c, BASE, TL.EMPTY); W.setTile(L, c, BASE + 1, TL.EMPTY); } };
    if (pre.kind === 'jump') { inp.pressed.jump = true; inp.held.jump = pre.hold > 0; }
    else if (pre.kind === 'fall') clear();
    else { clear(); p.vy = -C.SPRING; p.jumping = true; p.cutOK = false; p.onGround = false; p.coyote = 0; p.y -= 2; inp.held.jump = pre.hold > 0; }
    const dx = [], dy = [], vy = [];
    for (let f = 0; f < 150; f++) {
      if (f > 0) { inp.pressed = {}; inp.held.jump = f < pre.hold; }
      inp.held.right = f >= pre.steer[0] && f < pre.steer[1];
      p.update(inp);
      if (f === 0 && pre.kind === 'jump') clear();
      dx.push(p.cx - cx0); dy.push(p.feet - ft0); vy.push(p.vy);
      if (p.feet - ft0 > 12 * T) break;
    }
    prof.traj.push({ pre, runDist: Math.max(0, runDist), dx: Float32Array.from(dx), dy: Float32Array.from(dy), vy: Float32Array.from(vy),
      peak: -Math.min(...dy) });
  }
  PLAT.skipIntro = skip;
  // safe gap table (generator guidance only — the validator replays the arcs anyway)
  prof.peak = Math.max(...prof.traj.filter(t => t.pre.kind === 'jump').map(t => t.peak));
  prof.gap = {};
  for (let up = -3; up <= 3; up++) {
    let best = 0;
    for (const t of prof.traj) {
      if (t.pre.kind !== 'jump') continue;
      for (let i = 1; i < t.dy.length; i++) if (t.vy[i] > 0 && t.dy[i - 1] <= -up * T && t.dy[i] >= -up * T) { best = Math.max(best, t.dx[i]); break; }
    }
    prof.gap[up] = best ? Math.floor((best + prof.w - 3) / T - .5) : 0;
  }
  return prof;
}
function envelope() {
  if (ENV) return ENV;
  const P = profiles().map(p => record(p.id));
  const gap = {}; for (let up = -3; up <= 3; up++) gap[up] = Math.min(...P.map(p => p.gap[up]));
  const rise = Math.floor((Math.min(...P.map(p => p.peak)) - 6) / T);          // whole rows every profile clears with room to spare
  ENV = { profiles: P, gap, rise };
  return ENV;
}

/* ------------------------------------------------------------------ validator
   V: { w, tiles (H × w), springs: [{c, r}], movers: [{c0, c1, r}] (ferry span), startCol, startRow, goalCol }
   Surfaces = runs of standable cells; a cell is standable if its tile can be stood on and the two
   cells above are free of solids and hazards. BREAK blocks count as broken (every hero breaks them). */
const SOLID = t => t === TL.GROUND || t === TL.BRICK || t === TL.CRUMBLE;
const FLOOR = t => SOLID(t) || t === TL.ONEWAY;
const FREE = t => !SOLID(t) && t !== TL.SPIKE && t !== TL.LIQUID;
function vt(V, c, r) { if (c < 0 || c >= V.w) return TL.BRICK; if (r < 0 || r >= H) return TL.EMPTY; const t = V.tiles[r * V.w + c]; return t === TL.BREAK || t === TL.FAKE ? TL.EMPTY : t; }
function segments(V) {
  const segs = [], at = new Int16Array(H * V.w).fill(-1), spring = new Set(V.springs.map(s => s.r * V.w + s.c));
  for (let r = 1; r < H; r++) {
    let s = null;
    for (let c = 0; c <= V.w; c++) {
      const ok = c < V.w && FLOOR(vt(V, c, r)) && FREE(vt(V, c, r - 1)) && FREE(vt(V, c, r - 2)) && !spring.has(r * V.w + c);
      if (ok) { if (!s) s = { c0: c, c1: c, r, i: segs.length }; else s.c1 = c; }
      else if (s) { segs.push(s); for (let k = s.c0; k <= s.c1; k++) at[r * V.w + k] = s.i; s = null; }
    }
  }
  return { segs, at, get(c, r) { if (c < 0 || c >= V.w || r < 0 || r >= H) return null; const i = at[r * V.w + c]; return i < 0 ? null : segs[i]; } };
}
// replay one arc from take-off (centre cx, feet ft). Returns { seg } | { spring } | null
function fly(V, S, prof, tr, cx, ft) {
  const w = prof.w, h = prof.h, n = tr.dx.length, VW = V.w, tiles = V.tiles, sp = V.springs, ns = sp.length;
  let prev = ft;
  for (let i = 0; i < n; i++) {
    const x = cx + tr.dx[i], f = ft + tr.dy[i], x0 = x - w / 2, x1 = x + w / 2, y0 = f - h, vy = tr.vy[i];
    if (f > (H + 1) * T) return null;                                       // pit
    const c0 = Math.floor(x0 / T), c1 = Math.floor((x1 - .001) / T);
    if (c0 < 0 || c1 >= VW) return null;                                   // left the checked region
    const r0 = Math.max(0, Math.floor(y0 / T)), r1 = Math.min(H - 1, Math.floor((f - .001) / T));
    let land = -1, block = false;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      let t = tiles[r * VW + c]; if (t === TL.BREAK || t === TL.FAKE) t = TL.EMPTY;
      if (t === TL.EMPTY) continue;
      if (t === TL.GROUND || t === TL.BRICK || t === TL.CRUMBLE) { if (vy > 0 && prev <= r * T + .5) { if (land < 0 || r < land) land = r; } else block = true; }
      else if (t === TL.SPIKE) { const sx = c * T + 4; if (x0 < sx + T - 8 && x1 > sx && f > r * T + 12) return null; }
      else if (t === TL.LIQUID) { if (f > r * T && y0 + h * .5 < r * T + T) return null; }
      else if (t === TL.ONEWAY && vy > 0 && prev <= r * T + .01 && f >= r * T) { if (land < 0 || r < land) land = r; }
    }
    if (block && land < 0) return null;                                     // wall / ceiling in the way (conservative)
    if (vy >= 0) for (let k = 0; k < ns; k++) { const s = sp[k], sx = s.c * T + 4, sy = s.r * T - 12; if (x0 < sx + T - 8 && x1 > sx && f - 6 < sy + 12 && f + 2 > sy) return { spring: s }; }
    if (land >= 0) {
      for (let c = c0; c <= c1; c++) { const sg = S.get(c, land); if (sg) return { seg: sg, x }; }
      return null;                                                          // landed somewhere you cannot stand
    }
    prev = f;
  }
  return null;
}
function reachable(V, prof) {
  const S = segments(V), start = S.get(V.startCol, V.startRow);
  if (!start) return { ok: false, why: 'no start surface' };
  let won = false;
  const isGoal = sg => sg.c1 >= V.goalCol && sg.r === V.goalRow, seen = new Uint8Array(S.segs.length), q = [start], doneSpring = new Set();
  seen[start.i] = 1; if (isGoal(start)) return { ok: true, n: 1 };
  const visit = r => { if (!r || won) return; if (r.seg) { if (!seen[r.seg.i]) { seen[r.seg.i] = 1; if (isGoal(r.seg)) won = true; q.push(r.seg); } } else if (r.spring) springFrom(r.spring); };
  const springFrom = s => {
    const k = s.r * V.w + s.c; if (doneSpring.has(k)) return; doneSpring.add(k);
    // the bounce starts as soon as the body touches the spring box (its left side when walking in from the left)
    for (const tr of prof.traj) if (tr.pre.kind === 'spring' && !won) { const res = fly(V, S, prof, tr, s.c * T + 4 - prof.w / 2 + 1, s.r * T - 8); if (res && res.seg) visit(res); }
  };
  const JUMPS = prof.traj.filter(t => t.pre.kind === 'jump').sort((a, b) => b.pre.run - a.pre.run), FALLS = prof.traj.filter(t => t.pre.kind === 'fall'), STAND = JUMPS.filter(t => t.pre.run === 0);
  while (q.length && !won) {
    // best-first: the surface furthest to the right (the exit is on the right)
    let bi = 0; for (let k = 1; k < q.length; k++) if (q[k].c1 > q[bi].c1) bi = k;
    const sg = q.splice(bi, 1)[0];
    const left = sg.c0 * T, right = (sg.c1 + 1) * T, ft = sg.r * T, edge = right + prof.w / 2 - 2;
    for (const s of V.springs) if (s.r === sg.r && s.c === sg.c1 + 1) springFrom(s);         // walking on into a spring
    for (const m of V.movers) if (m.r === sg.r && m.c0 === sg.c1 + 1) visit({ seg: S.get(m.c1, m.r) });   // ferry: wait for it, ride across
    for (const tr of FALLS) if (!won) visit(fly(V, S, prof, tr, right + prof.w / 2, ft));
    // a jump from the edge only counts if it ALSO works from a take-off 10 px earlier (or the earlier pair):
    // the player gets a timing window, not a pixel-perfect jump (fairness rule)
    for (const tr of JUMPS) {
      if (won) break;
      const xs = [edge, edge - 10, edge - 24].filter(x => !(tr.pre.run > 0 && x - tr.runDist < left + prof.w / 2 - 2));   // enough run-up on this surface
      const res = xs.map(x => fly(V, S, prof, tr, x, ft));
      for (let k = 0; k + 1 < res.length; k++) {
        const a = res[k], b = res[k + 1];
        if (a && b && ((a.seg && b.seg && a.seg === b.seg) || (a.spring && b.spring && a.spring === b.spring))) visit(a);
      }
    }
    // standing jumps from inside the surface: only under something higher to land on
    for (let c = sg.c1; c >= sg.c0 && !won; c--) {
      let up = false;
      for (let r = sg.r - 4; r < sg.r && !up; r++) for (let k = c - 1; k <= c + 3; k++) { const o = S.get(k, r); if (o && o !== sg && !seen[o.i]) { up = true; break; } }
      if (!up) continue;
      for (const tr of STAND) { if (won) break; visit(fly(V, S, prof, tr, c * T + T / 2, ft)); }
    }
  }
  return won ? { ok: true, n: seen.reduce((a, b) => a + b, 0) } : { ok: false, why: 'exit not reachable', n: seen.reduce((a, b) => a + b, 0) };
}
/* rules that do not need arcs: safe pads, enemy spots, landing widths */
function rules(ch) {
  for (const [c0, c1, row] of [[0, PAD, ch.inRow], [CW - PAD, CW, ch.outRow]]) for (let c = c0; c < c1; c++) {
    if (ch.get(c, row) !== TL.GROUND && ch.get(c, row) !== TL.BRICK) return 'pad not solid at ' + c;
    for (let r = 0; r < row; r++) if (ch.get(c, r) !== TL.EMPTY) return 'pad blocked at ' + c;
  }
  for (const e of ch.spawns) { if (e.c < PAD + 1 || e.c > CW - PAD - 2) return 'enemy in a pad'; }
  for (const s of ch.springs) if (s.c < PAD || s.c >= CW - PAD) return 'spring in a pad';
  return null;
}
// the region checked for a new chunk: the previous chunk (from its entry pad) + the new chunk
function region(prev, ch) {
  const parts = prev ? [prev, ch] : [ch], w = parts.length * CW, tiles = new Uint8Array(H * w), V = { w, tiles, springs: [], movers: [] };
  parts.forEach((p, k) => { for (let r = 0; r < H; r++) for (let c = 0; c < CW; c++) tiles[r * w + k * CW + c] = p.tiles[r * CW + c];
    p.springs.forEach(s => V.springs.push({ c: s.c + k * CW, r: s.r })); p.movers.forEach(m => V.movers.push({ c0: m.c0 + k * CW, c1: m.c1 + k * CW, r: m.r }));
    // a lily pad = a ledge on the water row for the search (the real pad floats 12 px higher: the check is the stricter one)
    (p.pads || []).forEach(pd => { for (let c = pd.c; c < pd.c + pd.w; c++) tiles[pd.r * w + k * CW + c] = TL.ONEWAY; }); });
  V.startCol = 1; V.startRow = parts[0].inRow; V.goalCol = w - 2; V.goalRow = ch.outRow;
  return V;
}
function validate(prev, ch) {
  const why = rules(ch); if (why) return { ok: false, why };
  const V = region(prev, ch), E = envelope();
  for (const p of E.profiles) { const r = reachable(V, p); if (!r.ok) return { ok: false, why: r.why + ' (' + p.id + ')' }; }
  return { ok: true };
}

/* ------------------------------------------------------------------ patterns
   make(ch, x, row, X) → { x, row } (cursor after it; ground at `row` under x-1) or null if it cannot fit.
   X: { r (rng helpers), d (0 easy … 1 hardest), E (envelope), Wd (world), left (columns until the exit pad) } */
const clampRow = r => Math.max(ROW_MIN, Math.min(ROW_MAX, r));
// which way the floor should move next: it wanders, but is pulled back toward the base row
// (a run never drifts to the top of the screen and stays there)
function vdir(X, row) { if (row >= ROW_MAX - 1) return X.r.chance(.7) ? -1 : 1; if (row <= ROW_MIN + 2) return X.r.chance(.8) ? 1 : -1; return X.r.chance(.5) ? -1 : 1; }
function gapMax(X, up) { const g = X.E.gap[Math.max(-3, Math.min(3, up))]; return Math.max(1, Math.min(g == null ? 1 : g, X.d < .2 ? 2 : 3)); }   // never wider than 3 tiles (the story levels' own limit) — 4 was edge-pixel jumps
function ledgeType(X) { const L = X.Wd.ledge; return X.r.chance(.65) ? L[0] : L[1]; }
const PAT = {
  flat: { w: 4, make(ch, x, row, X) { const n = Math.min(X.left, X.r.int(4, 7)); ch.ground(x, x + n, row); if (X.r.chance(.6)) for (let i = 1; i < n - 1; i++) ch.coin(x + i, row - 2); return { x: x + n, row }; } },
  hill: { w: 7, make(ch, x, row, X) {
    const up = vdir(X, row), n = X.r.int(3, 5), r2 = clampRow(row + up);
    ch.ground(x, x + 2, row); ch.ground(x + 2, x + 2 + n, r2); for (let i = 0; i < n; i++) ch.coin(x + 2 + i, r2 - 2);
    const back = Math.abs(r2 - BASE) < Math.abs(row - BASE) ? X.r.chance(.2) : X.r.chance(.75);   // settle on whichever is nearer the base row
    ch.ground(x + 2 + n, x + 4 + n, back ? row : r2); return { x: x + 4 + n, row: back ? row : r2 }; } },
  steps: { w: 8, make(ch, x, row, X) {
    const k = X.r.int(2, 3), dir = vdir(X, row); let c = x, r = row;
    ch.ground(c, c + 2, r); c += 2;
    for (let i = 0; i < k; i++) { const rise = Math.min(X.d > .5 && X.E.rise >= 2 ? 2 : 1, X.E.rise), nr = clampRow(r + dir * X.r.int(1, rise)), w = X.r.int(2, 3); if (c + w > x + X.left) break; ch.ground(c, c + w, nr); if (X.r.chance(.5)) ch.coin(c + 1, nr - 2); c += w; r = nr; }
    return { x: c, row: r }; } },
  gap: { w: 7, make(ch, x, row, X) {
    const up = X.r.chance(.5) ? 0 : -vdir(X, row), r2 = clampRow(row - up), dy = row - r2, g = X.r.int(Math.min(2, gapMax(X, dy)), gapMax(X, dy));
    ch.ground(x, x + 2, row); ch.hazard(x + 2, x + 2 + g, Math.max(row, r2), X.Wd.hazard); const land = X.r.int(3, 4); ch.ground(x + 2 + g, x + 2 + g + land, r2);
    for (let i = 0; i < g; i++) ch.coin(x + 2 + i, Math.min(row, r2) - 3);
    return { x: x + 2 + g + land, row: r2 }; } },
  ledges: { w: 12, make(ch, x, row, X) {
    const span = Math.min(X.left - 3, X.r.int(8, 12)); if (span < 7) return null;
    ch.ground(x, x + 1, row);
    const hz = X.Wd.hazard === 'pit' ? 'pit' : X.Wd.hazard;
    if (X.Wd.theme === 'night') { ch.ground(x + 1, x + 1 + span, row); for (let c = x + 1; c < x + 1 + span; c++) ch.set(c, row - 1, TL.SPIKE); }
    else ch.hazard(x + 1, x + 1 + span, row, hz);
    let c = x + 1, pr = row, guard = 0;
    while (guard++ < 8) {
      const top = X.Wd.theme === 'night' ? row - 2 : row - 1, lr = clampRow(Math.max(row - 3, Math.min(top, pr + X.r.pick([-1, 0, 1])))), dy = pr - lr, g = X.r.int(1, Math.max(1, gapMax(X, dy) - 1));
      const w = X.r.int(X.d < .3 ? 3 : 2, 4), c0 = c + g;
      if (c0 + w > x + 1 + span - 1) break;
      const t = ledgeType(X); for (let k = c0; k < c0 + w; k++) ch.set(k, lr, t);
      for (let k = c0; k < c0 + w; k++) ch.coin(k, lr - 2);
      c = c0 + w; pr = lr;
    }
    const g2 = (x + 1 + span) - c, dy2 = pr - row;
    if (g2 > gapMax(X, dy2)) return null;                                   // last jump too long → let the validator never see it
    ch.ground(x + 1 + span, x + 3 + span, row);
    return { x: x + 3 + span, row }; } },
  spring: { w: 9, make(ch, x, row, X) {
    const hi = clampRow(row - X.r.int(4, 5)); if (row - hi < 4) return null;
    if (X.r.chance(.5) && row >= ROW_MAX - 1) {   // spring up a cliff (only from low ground: the run comes back down later)
      ch.ground(x, x + 3, row); ch.springs.push({ c: x + 2, r: row }); ch.ground(x + 3, x + 8, hi); for (let k = 0; k < 4; k++) ch.coin(x + 3 + k, hi - 2);
      return { x: x + 8, row: hi };
    }
    // optional high road: spring → floating ledge with coins (and maybe a heart), ground continues under it
    ch.ground(x, x + 9, row); ch.springs.push({ c: x + 1, r: row });
    for (let k = x + 3; k < x + 8; k++) { ch.set(k, hi - 1, TL.BRICK); ch.coin(k, hi - 3); }
    if (X.r.chance(.3)) ch.hearts.push([x + 5, hi - 3]);
    return { x: x + 9, row }; } },
  crumble: { w: 9, make(ch, x, row, X) {
    const n = Math.min(X.left - 4, X.r.int(4, X.d < .4 ? 5 : 7)); if (n < 3) return null;
    ch.ground(x, x + 2, row); ch.hazard(x + 2, x + 2 + n, row, X.Wd.hazard === 'acid' ? 'acid' : X.Wd.hazard);
    for (let c = x + 2; c < x + 2 + n; c++) { ch.set(c, row, TL.CRUMBLE); ch.coin(c, row - 2); }
    ch.ground(x + 2 + n, x + 4 + n, row); return { x: x + 4 + n, row }; } },
  ferry: { w: 12, make(ch, x, row, X) {
    const g = X.r.int(5, 7); if (x + 4 + g > x + X.left) return null;
    ch.ground(x, x + 2, row); ch.hazard(x + 2, x + 2 + g, row, X.Wd.hazard); ch.ground(x + 2 + g, x + 4 + g, row);
    ch.movers.push({ c0: x + 2, c1: x + 2 + g, r: row, w: 2, range: g - 2, speed: +(.8 + X.r.f() * .3).toFixed(2), phase: +X.r.f().toFixed(2) });
    for (let k = 0; k < g; k++) ch.coin(x + 2 + k, row - 3);
    return { x: x + 4 + g, row }; } },
  pillars: { w: 10, make(ch, x, row, X) {
    const span = Math.min(X.left - 2, X.r.int(8, 12)); if (span < 6) return null;
    ch.ground(x, x + 1, row); ch.hazard(x + 1, x + 1 + span, row, 'lava');
    let c = x + 1, pr = row;
    for (let i = 0; i < 5; i++) {
      const pr2 = clampRow(row - X.r.int(0, 2)), dy = pr - pr2, g = X.r.int(1, Math.max(1, gapMax(X, dy) - 1)), w = 2;
      if (c + g + w > x + 1 + span - 1) break;
      for (let k = c + g; k < c + g + w; k++) for (let r = pr2; r < H; r++) ch.set(k, r, r === pr2 ? TL.GROUND : TL.GROUND);
      ch.coin(c + g, pr2 - 2); c += g + w; pr = pr2;
    }
    const g2 = (x + 1 + span) - c; if (g2 > gapMax(X, pr - row)) return null;
    ch.ground(x + 1 + span, x + 3 + span, row); return { x: x + 3 + span, row }; } },
  spikes: { w: 9, make(ch, x, row, X) {
    const n = X.r.int(3, X.d < .4 ? 4 : 6); ch.ground(x, x + n + 4, row);
    for (let c = x + 2; c < x + 2 + n; c++) ch.set(c, row - 1, TL.SPIKE);
    if (n > gapMax(X, 0) || X.r.chance(.5)) { const lr = row - 3; for (let c = x + 1; c < x + 3 + n; c++) { ch.set(c, lr, TL.ONEWAY); ch.coin(c, lr - 2); } }
    return { x: x + n + 4, row }; } },
  crypt: { w: 8, make(ch, x, row, X) {    // a crypt door (breakable) — hit it to get through; coins and maybe a heart behind
    ch.ground(x, x + 7, row); const hh = Math.min(3, row - 1);
    for (let r = row - hh; r < row; r++) ch.set(x + 3, r, TL.BREAK);
    for (let r = 1; r < row - hh; r++) ch.set(x + 3, r, TL.BRICK);
    for (let c = x + 4; c < x + 7; c++) ch.coin(c, row - 1);
    return { x: x + 7, row }; } },
  tomb: { w: 9, make(ch, x, row, X) {     // tomb-stone stairs ('=' bricks): up 1-2 rows, along, down
    const h1 = X.r.int(1, Math.max(1, Math.min(2, X.E.rise))); if (row - h1 < ROW_MIN) return null;
    ch.ground(x, x + 9, row);
    for (let c = x + 2; c < x + 7; c++) { const hh = h1 > 1 && (c === x + 2 || c === x + 6) ? h1 - 1 : h1; for (let r = row - hh; r < row; r++) ch.set(c, r, TL.BRICK); if (hh === h1) ch.coin(c, row - h1 - 2); }
    return { x: x + 9, row }; } },
  // v113 swamp pond: water one row LOWER than the banks, 2-wide lily pads (sinking movers) with 1-tile gaps
  lily: { w: 9, make(ch, x, row, X) {
    const n = X.r.int(2, X.d < .4 ? 3 : 4), span = n * 3 + 1; if (2 + span + 2 > X.left) return null;
    const s = Math.max(row, Math.min(BASE, row + 1)), spd = +(X.d < .3 ? .6 : X.d < .7 ? .85 : 1.1).toFixed(2);
    ch.ground(x, x + 2, row); ch.hazard(x + 2, x + 2 + span, row, 'lava');
    for (let i = 0; i < n; i++) { const c = x + 3 + i * 3; ch.pads.push({ c, r: s, w: 2, speed: spd }); ch.coin(c, s - 3); ch.coin(c + 1, s - 3); }
    ch.ground(x + 2 + span, x + 4 + span, row); return { x: x + 4 + span, row }; } },
  arena: { w: 9, make(ch, x, row, X) { const n = Math.min(X.left, X.r.int(8, 10)); ch.ground(x, x + n, row); ch.arena = { c0: x, c1: x + n - 1, r: row }; return { x: x + n, row }; } },
};

/* ------------------------------------------------------------------ chunk builder */
function patWeights(Wd, d) {
  const out = [];
  for (const [k, v] of Object.entries(Wd.pat)) { const w = Array.isArray(v) ? (d >= v[1] ? v[0] : 0) : v; if (w > 0) out.push([k, w]); }
  return out;
}
function pickPat(X, hist) {
  // never the same pattern as either of the last two (unless nothing else fits); less likely if used a little earlier
  let ws = patWeights(X.Wd, X.d).filter(([k]) => PAT[k].w <= X.left);
  const fresh = ws.filter(([k]) => !hist.slice(-2).includes(k)); if (fresh.length) ws = fresh;
  ws = ws.map(([k, w]) => [k, w * (hist.slice(-4).includes(k) ? .45 : 1)]);
  const tot = ws.reduce((n, [, w]) => n + w, 0); let k = X.r.f() * tot;
  for (const [n, w] of ws) { k -= w; if (k <= 0) return n; }
  return ws.length ? ws[ws.length - 1][0] : 'flat';
}
function decorate(ch, X, opt) {
  // enemies on flat ground ≥ 5 wide, ≥ 2 tiles from both ends, outside the pads
  const Wd = X.Wd, flats = [];
  for (let r = ROW_MIN; r <= ROW_MAX; r++) { let s = -1; for (let c = 0; c <= CW; c++) { const ok = c < CW && c > PAD && c < CW - PAD - 1 && (ch.get(c, r) === TL.GROUND || ch.get(c, r) === TL.BRICK) && ch.get(c, r - 1) === TL.EMPTY && ch.get(c, r - 2) === TL.EMPTY; if (ok) { if (s < 0) s = c; } else if (s >= 0) { if (c - s >= 5) flats.push({ c0: s, c1: c - 1, r }); s = -1; } } }
  let budget = opt.noEnemies ? 0 : Math.min(4, 1 + Math.floor(X.d * 2.5 + X.r.f() * 1.2) + (ch.arena ? 1 : 0));
  const pool = Wd.pool.filter(p => X.d >= (p.d || 0)), tot = pool.reduce((n, p) => n + p.w, 0);
  const pickE = () => { let k = X.r.f() * tot; for (const p of pool) { k -= p.w; if (k <= 0) return p; } return pool[0]; };
  const used = new Set();
  if (ch.arena) flats.sort((a, b) => (b.c0 === ch.arena.c0) - (a.c0 === ch.arena.c0));
  for (const f of flats) {
    const slots = Math.max(1, Math.floor((f.c1 - f.c0 - 3) / 3));
    for (let i = 0; i < slots && budget > 0; i++) {
      const p = pickE(); if (p.wide && f.c1 - f.c0 < 6) continue;
      const c = X.r.int(f.c0 + 2, f.c1 - 2); if (used.has(c) || used.has(c - 1) || used.has(c + 1)) continue;
      if (p.elite && !X.r.chance(.35 + X.d * .3)) continue;
      used.add(c); budget--;
      ch.spawns.push({ type: p.t, c, r: p.fly ? f.r - 3 : f.r, elite: !!p.elite, fly: !!p.fly });
    }
  }
  if (opt.heart) {
    const f = flats.length ? flats[X.r.int(0, flats.length - 1)] : null;
    if (f) ch.hearts.push([X.r.int(f.c0 + 1, f.c1 - 1), f.r - 2]); else ch.hearts.push([1, ch.inRow - 2]);
  }
}
function buildChunk(gi, inRow, X, hist, opt) {
  const ch = new Chunk(gi, inRow);
  ch.ground(0, PAD, inRow);
  let x = PAD, row = inRow, guard = 0;
  while (x < CW - PAD && guard++ < 12) {
    X.left = CW - PAD - x;
    if (X.left < 4) { ch.ground(x, CW - PAD, row); x = CW - PAD; break; }
    // a pattern that does not fit is rolled back completely (tiles + objects), never half-kept
    const snap = { t: ch.tiles.slice(), n: [ch.coins.length, ch.hearts.length, ch.springs.length, ch.movers.length, ch.spawns.length, ch.pads.length], arena: ch.arena };
    let name = null, res = null;
    for (let k = 0; k < 4 && !res; k++) {
      name = pickPat(X, hist.concat(ch.pats, k ? [name, name] : [])); res = PAT[name].make(ch, x, row, X);
      if (res && res.x > CW - PAD) res = null;
      if (!res) { ch.tiles.set(snap.t); ch.coins.length = snap.n[0]; ch.hearts.length = snap.n[1]; ch.springs.length = snap.n[2]; ch.movers.length = snap.n[3]; ch.spawns.length = snap.n[4]; ch.pads.length = snap.n[5]; ch.arena = snap.arena; }
    }
    if (!res) { ch.ground(x, CW - PAD, row); x = CW - PAD; break; }
    ch.pats.push(name); x = res.x; row = res.row;
  }
  ch.ground(CW - PAD, CW, row); ch.outRow = row;
  decorate(ch, X, opt || {});
  return ch;
}
function introChunk(gi) {
  const ch = new Chunk(gi, BASE); ch.ground(0, CW, BASE); for (let c = 9; c < 15; c++) ch.coin(c, BASE - 2);
  ch.signs.push({ c: 5, r: BASE, text: '∞ ENDLESS — ไปให้ไกลที่สุด! · ยิ่งไกลยิ่งยาก · HP หมด = จบรอบ' }); ch.pats = ['intro']; return ch;
}
function safeChunk(gi, inRow) {          // fallback: a gentle hill back to the base row, no enemies
  const ch = new Chunk(gi, inRow); ch.ground(0, 8, inRow);
  const r = clampRow(inRow - 1); ch.ground(8, 14, r); for (let c = 8; c < 14; c++) ch.coin(c, r - 2);
  ch.ground(14, CW, inRow); ch.pats = ['safe']; return ch;
}
function flatChunk(gi, inRow) { const ch = new Chunk(gi, inRow); ch.ground(0, CW, inRow); ch.pats = ['flat-fallback']; return ch; }
const tierOf = gi => Math.min(10, 1 + Math.floor(Math.max(0, gi - 1) / 6));

/* ------------------------------------------------------------------ generator
   gen.next() returns a validated chunk. gen.attempt() does at most ONE build + validation (cheap enough
   for a frame); the runner calls it once per frame until a chunk is ready. */
class Generator {
  constructor(world, seed) {
    this.Wd = WORLDS[world]; this.world = world; this.seed = seed >>> 0; this.E = envelope();
    this.hist = []; this.last = null; this.pending = null; this.log = []; this.stats = { built: 0, failed: 0, fallback: 0, tries: 0 };
    this.lastHeart = 0;
  }
  start() { const c = introChunk(0); this.last = c; return c; }
  begin(gi) { this.pending = { gi, tries: 0, chunk: null }; }
  /* one STEP per call: build a candidate, or check it against one movement profile. A chunk is accepted
     only after every profile passed; any failure re-rolls the chunk with the next attempt seed. */
  attempt() {
    const P = this.pending; if (!P || P.chunk) return P && P.chunk;
    const gi = P.gi, tier = tierOf(gi), d = (tier - 1) / 9, prev = this.last;
    let ch = null;
    if (P.tries < MAX_TRIES) {
      if (!P.cand) {
        const heart = gi - this.lastHeart >= 6 + Math.floor(tier / 2);
        const rng = mulberry(hash(this.seed, gi, P.tries, this.world)), X = { r: R(rng), d, tier, E: this.E, Wd: this.Wd, left: 0 };
        const c = buildChunk(gi, prev.outRow, X, this.hist, { heart }), why = rules(c);
        P.tries++; this.stats.tries++;
        if (why) { this.reject(P, c, why); return null; }
        P.cand = c; P.V = region(prev, c); P.k = 0; return null;
      }
      const prof = this.E.profiles[P.k], r = reachable(P.V, prof);
      if (!r.ok) { this.reject(P, P.cand, r.why + ' (' + prof.id + ')'); P.cand = null; return null; }
      if (++P.k < this.E.profiles.length) return null;
      ch = P.cand;
    }
    if (!ch) {
      this.stats.fallback++;
      ch = safeChunk(gi, prev.outRow); if (!validate(prev, ch).ok) ch = flatChunk(gi, prev.outRow);
      this.note({ seed: this.seed, world: this.world, gi, attempt: 'fallback', why: 'used ' + ch.pats[0] });
    }
    ch.tier = tier; this.stats.built++;
    if (ch.hearts.length) this.lastHeart = gi;
    this.hist = this.hist.concat(ch.pats).slice(-6); this.last = ch; P.chunk = ch; this.pending = null;
    return ch;
  }
  next(gi) { this.begin(gi); let c = null; while (!(c = this.attempt())); return c; }
  reject(P, c, why) { this.stats.failed++; this.note({ seed: this.seed, world: this.world, gi: P.gi, attempt: P.tries - 1, why, pats: c.pats.join('+') }); }
  note(e) { this.log.push(e); if (this.log.length > 60) this.log.shift(); if (PLAT.debug && PLAT.debug.on && typeof console !== 'undefined') console.warn('[endless] chunk rejected', e); }
}

/* ------------------------------------------------------------------ level window */
function makeWindow(spec) {
  const L = { spec, id: spec.id, endless: true, w: WIN * CW, h: H, ox: 0, pw: WIN * CW * T, ph: H * T, px0: 0,
    tiles: new Uint8Array(WIN * CW * H), crumble: new Map(), coins: [], gems: [], hearts: [], springs: [], checkpoints: [], signs: [], spawns: [], movers: [],
    start: { x: 3 * T + T / 2, y: BASE * T }, exit: null, chunks: [] };
  return L;
}
// write chunk `ch` into window slot k (world column gi × CW) and create its objects in world coordinates
function placeChunk(L, ch, k) {
  const base = ch.gi * CW;
  for (let r = 0; r < H; r++) for (let c = 0; c < CW; c++) L.tiles[r * L.w + k * CW + c] = ch.tiles[r * CW + c];
  const wx = c => (base + c) * T;
  for (const [c, r] of ch.coins) L.coins.push({ x: wx(c) + T / 2, y: r * T + T / 2, got: false });
  for (const [c, r] of ch.hearts) L.hearts.push({ x: wx(c) + T / 2, y: r * T + T / 2, got: false });
  for (const s of ch.springs) L.springs.push({ x: wx(s.c) + 4, y: s.r * T - 12, w: T - 8, h: 12, sq: 0 });
  for (const s of ch.signs) L.signs.push({ x: wx(s.c) + T / 2, y: s.r * T, text: s.text });
  for (const m of ch.movers) { const x = wx(m.c0), y = m.r * T; L.movers.push({ id: ch.gi * 10 + L.movers.length, x, y, w: m.w * T, h: 12, x0: x, y0: y, axis: 'x', range: m.range * T, speed: m.speed, t: m.phase * Math.PI * 2, dx: 0, dy: 0, prevY: y }); }
  for (const pd of ch.pads || []) { const x = wx(pd.c), y = pd.r * T - 12; L.movers.push({ id: ch.gi * 10 + L.movers.length, x, y, w: pd.w * T, h: 12, x0: x, y0: y, axis: 'x', range: 0, speed: pd.speed, t: 0, dx: 0, dy: 0, prevY: y, sink: 1.6 * T, off: 0, load: 0, hold: 0, wy: pd.r * T }); }
  ch.pad = { x: wx(1) + T / 2, y: ch.inRow * T };
  L.chunks[k] = ch;
}
// slide the window one chunk: drop slot 0, shift the tiles, put `ch` in the last slot
function shiftWindow(L, ch) {
  const w = L.w;
  for (let r = 0; r < H; r++) L.tiles.copyWithin(r * w, r * w + CW, r * w + w);
  L.ox += CW; L.px0 = L.ox * T; L.pw = (L.ox + w) * T;
  const px0 = L.px0, keep = o => o.x >= px0;
  L.coins = L.coins.filter(keep); L.hearts = L.hearts.filter(keep); L.springs = L.springs.filter(keep); L.signs = L.signs.filter(keep);
  L.movers = L.movers.filter(m => m.x0 >= px0);
  for (const [key, c] of L.crumble) if (c.tx < L.ox) L.crumble.delete(key);
  L.chunks.shift();
  placeChunk(L, ch, WIN - 1);
}

/* ------------------------------------------------------------------ public */
PLAT.Endless = {
  CW, H, WIN, WORLDS, enemyTypes, envelope, validate, buildChunk, introChunk, safeChunk, Generator, makeWindow, placeChunk, shiftWindow, tierOf, segments, reachable, region, mulberry, hash,
  resetEnvelope() { ENV = null; },
  spec(world) {
    const Wd = WORLDS[world], th = PLAT.THEMES[Wd.theme];
    return { id: 'E' + world, endless: world, theme: Wd.theme, name: Wd.name, teach: Wd.th, par: 0, map: ['.'] , themeName: th && th.name };
  },
  /* Debug / tools: the first n chunks of a run as an ordinary ASCII level (P start, E exit at the end) */
  toSpec(world, seed, n, from) {
    from = from || 1;
    const g = new Generator(world, seed), all = [g.start()];
    for (let i = 1; i < from - 1 + n; i++) all.push(g.next(i));
    const chunks = all.slice(from - 1);                                    // starts on the entry pad of chunk from-1 (the intro when from = 1)
    const ch2 = { '#': TL.GROUND, '=': TL.BRICK, '-': TL.ONEWAY, '^': TL.SPIKE, '~': TL.LIQUID, B: TL.BREAK, C: TL.CRUMBLE, F: TL.FAKE }, inv = {}; for (const [k, v] of Object.entries(ch2)) inv[v] = k;
    const rows = []; for (let r = 0; r < H; r++) rows.push([]);
    const movers = [];
    chunks.forEach((ch, k) => {
      for (let r = 0; r < H; r++) for (let c = 0; c < CW; c++) rows[r][k * CW + c] = inv[ch.tiles[r * CW + c]] || '.';
      ch.springs.forEach(s => rows[s.r - 1][k * CW + s.c] = 'S');
      ch.movers.forEach(m => movers.push({ tx: k * CW + m.c0, ty: m.r, w: m.w, axis: 'x', range: m.range, speed: m.speed, phase: m.phase }));
      (ch.pads || []).forEach(pd => movers.push({ tx: k * CW + pd.c, ty: pd.r, w: pd.w, sink: true, speed: pd.speed }));
    });
    rows[chunks[0].inRow - 1][1] = 'P';
    const last = chunks[chunks.length - 1]; rows[last.outRow - 1][n * CW - 2] = 'E';
    return { spec: { id: `E${world}#${seed}`, name: 'endless test', theme: WORLDS[world].theme, par: 99, map: rows.map(r => r.join('')), movers }, chunks, gen: g };
  },
};

/* ------------------------------------------------------------------ runner (in a Game)
   Chunks come from a Web Worker when the browser allows one (no build work on the game thread at all),
   otherwise from an in-page generator stepped ONE attempt per frame. Either way the next chunk is asked
   for right after a shift, ~2 chunks before it is needed; the window only slides when it has arrived
   (and as a last resort near the window end, it is built on the spot). */
class Runner {
  constructor(g, world, seed) { this.g = g; this.world = world; this.seed = seed >>> 0; this.worker = null; this.wait = null; this.got = null; this.log = []; this.genMs = []; }
  init() {
    const g = this.g, L = makeWindow(g.spec), gen = this.gen = new Generator(this.world, this.seed);
    placeChunk(L, gen.start(), 0);
    for (let k = 1; k < WIN; k++) placeChunk(L, gen.next(k), k);
    this.nextGi = WIN; this.startX = L.start.x; this.maxX = L.start.x; this.dist = 0; this.tier = 1;
    const DM = g.daily && g.daily.mod.id;
    this.champEvery = DM === 'hunt' ? 200 : CHAMP_EVERY; this.boonEvery = DM === 'boonrush' ? 80 : BOON_EVERY;
    this.champ = null; this.champN = 0; this.nextChamp = DM === 'hunt' ? 100 : CHAMP_FIRST; g.emit('boss', null);
    this.nextBoon = DM === 'boonrush' ? 80 : BOON_FIRST; this.boonDue = false;
    this.startWorker();
    this.request(this.nextGi);
    return L;
  }
  startWorker() {
    if (PLAT.Endless.noWorker || typeof Worker === 'undefined' || typeof location === 'undefined' || location.protocol === 'file:') return;
    try {
      const w = this.worker = new Worker('js/plat/endless-worker.js' + (PLAT.Endless.ver || ''));
      w.onmessage = e => { const m = e.data; if (m.cmd === 'chunk' && this.wait === m.gi) { this.got = m.chunk; this.genMs.push(m.ms); if (this.genMs.length > 20) this.genMs.shift(); this.log = m.log || []; this.stats = m.stats; } else if (m.cmd === 'error') this.dropWorker(m.msg); };
      w.onerror = e => this.dropWorker(e && e.message);
      w.postMessage({ cmd: 'init', world: this.world, seed: this.seed, upTo: WIN });
    } catch (e) { this.worker = null; }
  }
  dropWorker(msg) {
    if (!this.worker) return; try { this.worker.terminate(); } catch (e) {} this.worker = null;
    if (typeof console !== 'undefined') console.warn('[endless] worker off, generating in the page', msg || '');
    if (this.wait != null && !this.got) this.gen.begin(this.wait);
  }
  request(gi) { this.wait = gi; this.got = null; if (this.worker) this.worker.postMessage({ cmd: 'next', gi }); else this.gen.begin(gi); }
  poll() {
    if (this.got) return this.got;
    if (!this.worker) { const c = this.gen.attempt(); if (c) this.got = c; }
    return this.got;
  }
  // the page generator must stay in step with the worker (same history), so a worker chunk is replayed into it lazily
  syncGen(ch) { const g = this.gen; g.last = ch; g.hist = g.hist.concat(ch.pats).slice(-6); if (ch.hearts.length) g.lastHeart = ch.gi; }
  dispose() { if (this.worker) { try { this.worker.terminate(); } catch (e) {} this.worker = null; } }
  spawnChunk(ch) {
    const g = this.g, base = ch.gi * CW;
    for (const s of ch.spawns) { const e = PLAT.makeEnemy(g, s.type, (base + s.c) * T + T / 2, s.r * T, s.elite); if (s.fly) e.home = { x: e.x, y: e.y }; g.enemies.push(e); g.enemyTotal++; }
    g.decorChunk(ch);
  }
  step() {
    const g = this.g, L = g.L, p = g.player; if (!p) return;
    let ch = this.poll();
    const local = p.cx / T - L.ox;
    if (!ch && local > CW * 3.6) {                                            // worker late (very rare): build it here, now
      this.dropWorker('late'); this.gen.begin(this.wait); while (!(ch = this.gen.attempt()));
    }
    if (ch && local > CW * 2.5 && !p.dead) {
      if (this.worker) this.syncGen(ch);
      const dropped = L.chunks[0];
      shiftWindow(L, ch);
      this.spawnChunk(ch);
      g.onWindowShift(dropped, ch);
      this.request(++this.nextGi);
      // the pit / lava return point must still be inside the level
      if (!p.lastSafe || p.lastSafe.x < L.px0 + 2 * T) { const cur = L.chunks.find(c => (c.gi + 1) * CW * T > p.cx) || L.chunks[1]; p.lastSafe = { x: cur.pad.x, y: cur.pad.y }; }
    }
    if (p.cx > this.maxX) this.maxX = p.cx;
    this.dist = Math.max(0, Math.floor((this.maxX - this.startX) / T));
    const cur = L.chunks.find(c => (c.gi + 1) * CW * T > p.cx); this.tier = cur && cur.tier || this.tier;
    this.stepChampion();
    // v118 BOONS: pick 1 of 3 at every milestone and after each endless boss (only when no boss is alive)
    if (!p.dead && !this.champ && g.mode === 'play' && (this.boonDue || this.dist >= this.nextBoon)) {
      if (!this.boonDue) this.nextBoon += this.boonEvery; this.boonDue = false;
      if (PLAT.meta) g.offerBoon(PLAT.meta.boonChoices(g, 3));
    }
  }
  /* v116 ENDLESS BOSSES: every so often one of this world's own enemies comes back as a giant CHAMPION —
     ×1.7 size, lots of HP (a boss bar), heavier hits, faster, it does not flinch until its poise breaks, it hunts you
     (never left behind) and every new one is stronger. Beating it: a coin fountain + loot. */
  stepChampion() {
    const g = this.g, p = g.player, L = g.L;
    const c = this.champ;
    if (c) {
      if (c.dead || c.gone) { this.champ = null; this.nextChamp = this.dist + this.champEvery; return; }
      if (c.cx < p.cx - 13 * T && !p.dead) {                       // left behind → it catches up (lands just behind you)
        const x = p.cx - 7 * T, fl = g.floorBelow(x, p.y - 4 * T);
        if (fl < L.ph && !W.tilesIn(L, { x: x - 8, y: fl, w: 16, h: 8 }, TL.LIQUID).length) { c.x = x - c.w / 2; c.y = (c.def.ai === 'flyer' ? fl - 4 * T : fl) - c.h; c.vx = 0; c.vy = 0; c.home = { x: c.x, y: c.y }; g.burst(c.cx, c.y + c.h / 2, '#ff5ad8', 12, 2.4); }
      }
      return;
    }
    if (this.dist < this.nextChamp || p.dead) return;
    const pool = this.Wd().pool.filter(q => q.t !== 'golden' && q.t !== 'mimic' && (q.d || 0) <= .2 + this.champN * .2);
    const pick = pool[Math.floor(Math.random() * pool.length)] || this.Wd().pool[0];
    for (let k = 10; k <= 17; k++) {                               // a spot on solid ground ahead of you
      const x = p.cx + k * T, fl = g.floorBelow(x, p.y - 5 * T);
      if (fl >= L.ph || fl < p.y - 6 * T) continue;
      if (W.tilesIn(L, { x: x - 30, y: fl, w: 60, h: 8 }, TL.LIQUID).length || W.tilesIn(L, { x: x - 30, y: fl - 8, w: 60, h: 10 }, TL.SPIKE).length) continue;
      this.spawnChampion(pick, x, pick.fly ? fl - 4 * T : fl); return;
    }
  }
  Wd() { return WORLDS[this.world]; }
  spawnChampion(q, x, y) {
    const g = this.g, U = PLAT.U, n = ++this.champN, e = PLAT.makeEnemy(g, q.t, x, y, true), d = e.def, k = 1.7;
    e.champion = true; e.champN = n;
    e.sc *= k; const fw = Math.round(e.w * k), fh = Math.round(e.h * k); e.x -= (fw - e.w) / 2; e.y -= fh - e.h; e.w = fw; e.h = fh; e.home = { x: e.x, y: e.y };
    const more = 1 + .35 * (n - 1);
    e.hp = e.maxHp = Math.round((40 + d.hp * 8) * more); if (e.armor) e.armor = Math.round(e.armor * 2 * more);
    e.maxPoise = e.poise = Math.round(8 + 2 * n);
    d.heavy = true; d.small = false; d.dmg = 2; d.coins = 0;
    d.name = '👑 ' + (d.name || q.t);
    for (const s of ['speed', 'chase']) if (d[s]) d[s] *= 1.2 + .05 * n;
    if (d.sight) d.sight *= 1.6; if (d.rate) d.rate = Math.round(d.rate * .7); if (d.wait) d.wait = Math.round(d.wait * .7);
    if (d.jumpV) { d.jumpV *= 1.1; d.jumpX *= 1.3; }
    e.cool = 40; e.face(-1);
    g.enemies.push(e); g.enemyTotal++; this.champ = e;
    g.text(x, y - e.h - 30, '⚠ บอสปรากฏตัว! LV ' + n, '#ff5a8a', 120, true); PLAT.sfx.roar(); g.shake(6); PLAT.haptic('boss');
    for (let i = 0; i < 24; i++) g.burst(e.cx + U.rnd(-e.w / 2, e.w / 2), e.y + U.rnd(0, e.h), '#ff5ad8', 1, 3);
    g.emit('boss', { name: 'BOSS LV ' + n, th: d.name.replace('👑 ', ''), hp: e.hp, max: e.maxHp });
  }
  score(st) { return this.dist * 10 + st.kills * 50 + st.coins * 10; }
}
PLAT.Endless.Runner = Runner;
// the worker loads the same file versions as the page (cache-busting query of this script)
try { if (typeof document !== 'undefined' && document.currentScript) { const q = document.currentScript.src.split('?')[1]; if (q) PLAT.Endless.ver = '?' + q; } } catch (e) {}
})(typeof window !== 'undefined' ? window : globalThis);
