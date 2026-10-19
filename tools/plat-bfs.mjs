// Full-engine reachability search, shared by tools/plat-validate.mjs (story levels) and
// tools/plat-endless-test.mjs (Endless runs). It drives the REAL Player.update() frame by frame with
// scripted input (walk / run / jump-hold lengths / release frames), moving platforms sampled at 8 phases,
// springs, one-way ledges — from every standing spot it finds — and reports whether the exit and every
// gem can be reached. Hazards (spikes, liquid, pits) end a try.
// Player profile: the weakest movement in the roster (speed .86, jump 1, no air jumps, widest box) by
// default, or any hero id (e.g. 'x' for X's own jump physics).
export function bfsValidate(PLAT, spec, opt) {
  opt = opt || {};
  const { C, world: W, TILE } = PLAT, T = C.T, errs = [];
  if (!PLAT.HEROES.__test) PLAT.HEROES.__test = { name: 'test', disabled: true, sprite: { kind: 'strip', dir: '', ch: 1, anims: {} }, poses: {}, box: [24, 44], hp: 9, speed: .86, jump: 1, attack: { kind: 'combo', steps: [] } };
  const heroId = opt.hero || '__test', skip = PLAT.skipIntro; PLAT.skipIntro = true;
  const widths = new Set(spec.map.map(r => r.length)); if (widths.size !== 1) errs.push(`rows have different widths: ${[...widths]}`);
  const base = W.buildLevel(spec);
  if (!base.exit) errs.push('no exit E'); if (!spec.map.some(r => r.includes('P'))) errs.push('no start P');
  if (opt.gems !== false && !spec.boss && base.gems.length !== 3) errs.push(`has ${base.gems.length} gems (want 3)`);
  // breakable blocks are assumed broken (any hero can break them)
  for (let i = 0; i < base.tiles.length; i++) if (base.tiles[i] === TILE.BREAK) base.tiles[i] = 0;
  const phases = base.movers.length ? 8 : 1;
  const freeze = (L, k) => { for (const m of L.movers) { const off = (Math.sin(m.t0 + k / phases * Math.PI * 2) * .5 + .5) * m.range; m.x = m.axis === 'x' ? m.x0 + off : m.x0; m.y = m.axis === 'y' ? m.y0 + off : m.y0; m.prevY = m.y; m.dx = 0; m.dy = 0; } };
  base.movers.forEach(m => m.t0 = m.t);
  const hazard = p => W.tilesIn(base, { x: p.x + 2, y: p.y + 4, w: p.w - 4, h: p.h - 4 }, TILE.SPIKE).length || W.tilesIn(base, p, TILE.LIQUID).length || p.y > base.ph + 40;
  const gemsGot = new Set(); let exitOk = false, maxCol = 0;
  const touch = p => { for (const g of base.gems) if (Math.abs(g.x - p.cx) < 10 + p.w / 2 && Math.abs(g.y - (p.y + p.h / 2)) < 10 + p.h / 2) gemsGot.add(g.i);
    if (base.exit && p.x < base.exit.x + base.exit.w && p.x + p.w > base.exit.x && p.y < base.exit.y + base.exit.h && p.y + p.h > base.exit.y) exitOk = true; };
  const key = p => p.mover ? 'm' + p.mover.id : `${Math.floor(p.cx / T)},${Math.round(p.feet / T)}`;
  const seen = new Set(), queue = [];
  const input = { held: {}, pressed: {}, isHeld(a) { return !!this.held[a]; }, wasPressed(a) { return !!this.pressed[a]; } };
  const no = () => {};
  const g = { L: base, input, mode: 'play', parts: [], stats: { hits: 0 }, hit: () => 0, dust: no, burst: no, text: no, hazardNear: () => false, spawnProj: no, fx: () => ({}),
    shake: no, hitstop: no, afterimage: no, nearestEnemy: () => null, countProj: () => 0, emit: no, flashT: 0 };
  const sheet = new PLAT.Sheet({ kind: 'strip', dir: '', ch: 1, anims: {} }), P = new PLAT.Player(g, heroId, base.start, sheet);
  const SPD = (P.hero.speed || 1);
  P.lastSafe = base.start;
  function push(st) { const k = st.key; if (seen.has(k)) return; seen.add(k); queue.push(st); }
  P.reset(base.start); for (let i = 0; i < 30; i++) P.update(input);
  push({ key: key(P), x: P.x, y: P.y, mover: null });
  let sims = 0;
  const holds = opt.holds || [-2, -1, 4, 8, 14, 22, 60], rels = opt.rels || [999, 8, 18, 30], dirs = opt.dirs || [-1, 1];
  while (queue.length) {
    if (opt.stopAtExit && exitOk) break;
    const st = queue.shift();
    for (let k = 0; k < phases; k++) {
      freeze(base, k);
      let starts;
      if (st.mover != null) { const m = base.movers[st.mover]; starts = [m.x + 2, m.x + m.w / 2 - P.w / 2, m.x + m.w - P.w - 2].map(x => ({ x, y: m.y - P.h })); }
      else { if (k > 0 && !base.movers.some(m => Math.abs(m.x0 - st.x) < 12 * T && Math.abs(m.y0 - st.y) < 12 * T)) continue; starts = [{ x: st.x, y: st.y }]; }
      for (const s0 of starts) for (const dir of dirs) for (const v0 of [0, C.WALK * SPD, C.RUN * SPD]) for (const hold of holds) for (const rel of rels) {
        P.reset({ x: s0.x + P.w / 2, y: s0.y + P.h }); P.x = s0.x; P.y = s0.y; P.vx = dir * v0; P.face = dir; P.runT = v0 > C.WALK * SPD ? C.RUN_AFTER : 0;
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
        maxCol = Math.max(maxCol, Math.floor(P.cx / T));
        push({ key: mi != null ? 'm' + mi : key(P), x: P.x, y: P.y, mover: mi });
      }
    }
  }
  PLAT.skipIntro = skip;
  if (!exitOk) errs.push('exit NOT reachable (got to column ' + maxCol + ')');
  const missing = base.gems.filter(g => !gemsGot.has(g.i)).map(g => `(${Math.floor(g.x / T)},${Math.floor(g.y / T)})`);
  if (missing.length) errs.push('gems NOT reachable: ' + missing.join(' '));
  return { id: spec.id, errs, nodes: seen.size, sims, maxCol };
}
