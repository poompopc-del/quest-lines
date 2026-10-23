/* Platform Mode combat test harness — injected into platformer.html by tools/plat-combat-test.mjs.
   Runs the REAL game code (js/plat/*.js) in a real browser, frame by frame, with scripted input.
   The UI loop is stopped so every frame is stepped here (deterministic, no rAF timing). */
window.QT = (() => {
  const P = window.PLAT, I = P.input, T = P.C.T;
  P.skipIntro = true;                        // X4 beam-in intro off for scripted tests
  cancelAnimationFrame(P.app.raf); window.requestAnimationFrame = () => 0;
  // a flat test room (80 × 12 tiles, ground at row 10), with one of every enemy so all sheets load
  const row = s => s.padEnd(80, '.');
  const flat = () => [...Array(9)].map(() => row('')).concat([row('P...s.j.g.m.z.c.b.w.l.t.h'), '#'.repeat(80), '#'.repeat(80)]);
  P.LEVELS.__t = { name: 'test', theme: 'meadow', par: 99, map: flat() };
  const GY = 10 * T;                        // ground line (feet y) in the test room
  const games = {};
  async function game(hid) {
    if (games[hid]) return games[hid];
    const g = new P.Game({ levelId: '__t', heroId: hid }); await g.load();
    for (const t of Object.keys(P.BOSSES)) if (!g.sheets.has(t)) { const d = P.BOSSES[t]; g.sheets.set(t, new P.Sheet(d.sheet)); await P.assets.load(d.sheet.img); }
    g.geom = null; g.measureEnemies();
    return (games[hid] = g);
  }
  const press = a => I.set(a, 't', true), rel = a => I.set(a, 't', false);
  function step(g, n, each) { for (let i = 0; i < n; i++) { if (each) each(i); g.update(); I.endFrame(); } }
  /* place the hero on flat ground facing `dir`, and one enemy `dist` px in front (dir) of the hero's centre.
     o.ai: keep the enemy's AI (default: frozen dummy) · o.hp: override HP · o.wall: put a wall column between */
  async function setup(hid, etype, dist, dir, o) {
    o = o || {};
    const g = await game(hid); I.clearAll();
    g.L.tiles.set(W0(g));                     // restore the room (tests may add walls)
    g.tileCache = null;
    g.enemies = []; g.projs = []; g.fxs = []; g.loose = []; g.mstars = []; g.warns = []; g.freeze = 0; g.held_ = null; g.mode = 'play'; g.boss = null; g.bossActive = false; g.tokens.clear(); g.chain = 0; g.chainT = 0;
    const p = g.player; p.ult = 0; p.reset({ x: 20 * T, y: GY }); p.face = dir; p.en = 100; p.inv = 0; p.hp = p.maxHp; p.dead = false;
    step(g, 2);
    const log = [];
    let e = null;
    if (etype) {
      e = P.makeEnemy(g, etype, p.cx + dir * dist, GY - (o.ey || 0));
      if (!o.ai) { e.think = () => {}; if (e.boss) { e.set('move'); e[etype] = () => { e.vx = 0; }; } }
      if (o.hp) { e.hp = e.maxHp = o.hp; }
      e.dir = -dir; g.enemies.push(e); if (e.boss) g.boss = e;
      const orig = e.takeHit.bind(e);
      e.takeHit = (dmg, oo) => { const hp0 = e.hp, ar0 = e.armor; const r = orig(dmg, oo); log.push({ f: g.frame, dmg, ok: r, dhp: hp0 - e.hp, dar: ar0 - e.armor, id: oo.id, why: e.reject, idx: p.act && p.act.idx }); return r; };
    }
    if (o.wall) { const tx = Math.floor((p.cx + dir * o.wall) / T); for (let ty = 0; ty < 10; ty++) P.world.setTile(g.L, tx, ty, P.TILE.BRICK); g.tileCache = null; }
    return { g, p, e, log };
  }
  const base = {};
  function W0(g) { if (!base[g.heroId]) base[g.heroId] = g.L.tiles.slice(); return base[g.heroId]; }
  const sum = log => ({ hits: log.filter(l => l.ok).length, dmg: log.reduce((s, l) => s + (l.dhp || 0) + (l.dar || 0), 0) });
  // keep the hero from being hurt by contact so only the attack is measured
  const shield = p => { p.inv = Math.max(p.inv, 2); };
  // switch the test room to another world theme (its art + enemy skins); hero games are rebuilt
  function theme(t) { P.LEVELS.__t.theme = t; for (const k in games) delete games[k]; for (const k in base) delete base[k]; }
  return { P, I, T, GY, game, setup, step, press, rel, sum, shield, flat, theme };
})();
