/* Platform Mode v92 tests — injected into platformer.html by tools/plat-v92-test.mjs. window.V92(filter) → results.
   Game tests build their OWN Game objects and step them frame by frame (the UI loop keeps running, but it only
   drives PLAT.app.game). Input / UI tests go through the real DOM handlers with synthetic events. */
window.V92 = async function (filter) {
  const P = window.PLAT, I = P.input, T = P.C.T, out = [], app = P.app;
  const t = async (name, fn) => {
    if (filter && !filter.split('|').some(f => name.includes(f))) return;
    try { const r = await fn(); out.push({ name, ok: r === true || !!(r && r.ok), detail: r && r.detail || '', info: r && r.info || '' }); }
    catch (e) { out.push({ name, ok: false, detail: 'THREW ' + (e && e.stack || e) }); }
  };
  const frames = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const off = document.createElement('canvas'); off.width = 1280; off.height = 720; const octx = off.getContext('2d');
  const press = a => I.set(a, 'test', true), rel = a => I.set(a, 'test', false);
  function step(g, n, each, render) { for (let i = 0; i < n; i++) { if (each) each(i); g.update(); if (render) g.render(octx, 2); I.endFrame(); } }
  P.skipIntro = true;
  // a flat room for hero tests (same as the combat harness)
  const row = s => s.padEnd(80, '.');
  P.LEVELS.__v = { name: 'test', theme: 'meadow', par: 99, map: [...Array(9)].map(() => row('')).concat([row('P'), '#'.repeat(80), '#'.repeat(80)]) };
  const games = {};
  async function hero(hid) { if (!games[hid]) { const g = new P.Game({ levelId: '__v', heroId: hid }); await g.load(); games[hid] = g; } const g = games[hid]; I.clearAll(); g.start(); step(g, 3); return g; }
  // spy on what gets drawn
  const realDraw = P.drawFrame; let drawn = [];
  P.drawFrame = function (ctx, fr) { if (fr && fr.src) drawn.push(fr.src); return realDraw.apply(this, arguments); };

  /* =============================== X ANIMATION =============================== */
  await t('X: no energy ball / orb drawn while charging (all 4 levels)', async () => {
    const g = await hero('x'), p = g.player; drawn = [];
    press('attack'); step(g, 1, null, true); step(g, 200, () => { p.en = 100; p.inv = 5; }, true);
    const ball = drawn.filter(s => /chargeBall|chargeOrb/.test(s)).length, lv = P.HEROES.x.chargeBar(p).lv;
    rel('attack'); step(g, 2, null, true);
    return { ok: ball === 0 && lv === 4, detail: `ball frames drawn ${ball}, reached LV ${lv}` };
  });
  await t('X: release fires the charged shot, then back to idle (no stuck pose)', async () => {
    const g = await hero('x'), p = g.player;
    press('attack'); step(g, 1); step(g, 130, () => { p.inv = 5; }); const lv = P.HEROES.x.chargeBar(p).lv;
    const n0 = g.projs.length; rel('attack'); step(g, 2);
    const shot = g.projs.find(q => /x4c3|c3Shot/.test(q.def.img || '') || q.def === P.PROJ.x4c3);
    step(g, 90, () => { p.inv = 5; });
    const pose = p.anim.pose;
    return { ok: lv === 3 && !!shot && p.charge === 0 && !p.act && /^(idle|blink|tired)$/.test(pose), detail: `lv ${lv} shot ${!!shot} (${g.projs.length - n0}) charge ${p.charge} act ${p.act && p.act.kind} pose ${pose}` };
  });
  await t('X: getting hurt cancels the charge — nothing fires on release', async () => {
    const g = await hero('x'), p = g.player;
    press('attack'); step(g, 1); step(g, 80); p.inv = 0; p.hurt(1, p.cx + 20);
    const c = p.charge; step(g, 20); const n0 = g.projs.length; rel('attack'); step(g, 5);
    return { ok: c === 0 && g.projs.length === n0, detail: `charge after hit ${c}, shots on release ${g.projs.length - n0}` };
  });
  await t('X: input reset (pause / lost focus) drops the charge without shooting', async () => {
    const g = await hero('x'), p = g.player, saved = app.game; app.game = g;
    press('attack'); step(g, 1); step(g, 90);
    I.reset('test'); const n0 = g.projs.length; step(g, 5); app.game = saved;
    return { ok: p.charge === 0 && g.projs.length === n0 && !I.isHeld('attack'), detail: `charge ${p.charge} shots ${g.projs.length - n0}` };
  });
  await t('X: dying while charging clears the charge (no palette flash while dying)', async () => {
    const g = await hero('x'), p = g.player;
    press('attack'); step(g, 1); step(g, 70); p.inv = 0; p.hp = 1; p.hurt(1, p.cx + 10); rel('attack');
    step(g, 10); const o = {}; P.HEROES.x.mod.drawOpts(p, o);
    return { ok: p.dead && p.charge === 0 && (!o.pal || o.pal.key === 'x4flash' || o.hide), detail: `dead ${p.dead} charge ${p.charge} pal ${o.pal && o.pal.key}` };
  });
  await t('X: walk → jump → fall → land → idle and dash → idle transitions', async () => {
    const g = await hero('x'), p = g.player, seen = new Set();
    const rec = () => seen.add(p.anim.pose);
    press('right'); step(g, 30, rec); rel('right'); step(g, 10, rec);
    press('jump'); step(g, 1, rec); step(g, 40, rec); rel('jump'); step(g, 60, rec);
    press('dash'); step(g, 1, rec); step(g, 8, rec); rel('dash'); step(g, 60, rec);
    const end = p.anim.pose, need = ['walk', 'jump', 'land', 'dash'].filter(n => ![...seen].some(s => s === n || s.startsWith(n)));
    return { ok: !need.length && /^(idle|blink|tired)$/.test(end) && p.onGround, detail: `missing ${need} · end ${end} · seen ${[...seen].join(',')}` };
  });
  await t('X: the shot comes out of the buster (muzzle in front of the body, chest height)', async () => {
    const g = await hero('x'), p = g.player; g.projs.length = 0;
    press('attack'); step(g, 1); rel('attack'); step(g, 1);
    const q = g.projs[0]; if (!q) return { ok: false, detail: 'no shot' };
    const dx = (q.x - p.cx) * p.face, dy = p.feet - q.y;
    return { ok: dx > 8 && dx < 40 && dy > 18 && dy < 44, detail: `dx ${dx.toFixed(1)} dy ${dy.toFixed(1)}` };
  });
  // every playable hero: hurt → back to a standing pose, never stuck in hurt / an action
  for (const hid of P.HERO_ORDER.filter(h => P.HEROES[h] && !P.HEROES[h].disabled)) await t(`animation recovers after a hit · ${hid}`, async () => {
    const g = await hero(hid), p = g.player; press('attack'); step(g, 2); rel('attack'); p.inv = 0; p.hurt(1, p.cx + 10);
    step(g, 120); const pose = p.anim.pose;
    return { ok: !p.act && p.hurtT === 0 && !/hurt|atk|dead/.test(pose), detail: `pose ${pose} act ${p.act && p.act.kind}` };
  });

  /* =============================== STORY LEVELS =============================== */
  for (const id of P.LEVEL_ORDER) await t(`story level still loads and plays · ${id}`, async () => {
    const g = new P.Game({ levelId: id, heroId: 'knight' }); await g.load();
    const w0 = g.L.w;
    step(g, 900, i => { (i % 50 < 40 ? press : rel)('right'); (i % 37 === 0 ? press : rel)('jump'); (i % 23 === 0 ? press : rel)('attack'); g.player.inv = 5; }, i => 0);
    for (let i = 0; i < 30; i++) g.render(octx, 2);
    rel('right'); rel('jump'); rel('attack');
    const p = g.player;
    return { ok: Number.isFinite(p.x) && Number.isFinite(p.y) && !g.runner && !g.L.ox && g.L.w === w0 && !!g.tileCache && g.enemies.length > 0, detail: `x ${p.x.toFixed(0)} mode ${g.mode} ox ${g.L.ox} cache ${!!g.tileCache}` };
  });

  /* ================================= ENDLESS ================================= */
  const E = P.Endless;
  for (const w of [1, 2, 3]) await t(`endless world ${w}: 120 chunks streamed — window, memory and objects stay bounded`, async () => {
    const g = new P.Game({ endless: w, seed: 1000 + w, heroId: 'knight' }); await g.load();
    const L = () => g.L, p = g.player; let maxE = 0, maxD = 0, maxC = 0, maxCache = 0, shifts = 0, bad = '';
    let lastOx = L().ox; const t0 = performance.now();
    for (let k = 0; k < 120 * 30 && !bad; k++) {
      if (k % 30 === 0) { for (let w = 0; w < 60 && !g.runner.got; w++) { g.runner.poll(); if (!g.runner.got) await frames(1); }   // the next chunk is ready (worker message)
        const ch = L().chunks[3]; p.x = ch.pad.x - p.w / 2; p.y = ch.pad.y - p.h; p.vx = p.vy = 0; p.inv = 9; }
      g.update(); if (k % 3 === 0) g.render(octx, 2); I.endFrame();
      if (g.L.ox !== lastOx) { shifts++; lastOx = g.L.ox; }
      maxE = Math.max(maxE, g.enemies.length); maxD = Math.max(maxD, g.decor.length); maxC = Math.max(maxC, L().coins.length); maxCache = Math.max(maxCache, g.chunkCache.size);
      if (L().chunks.length !== E.WIN) bad = 'window has ' + L().chunks.length + ' chunks';
      if (g.enemies.some(e => e.x + e.w < L().px0 - 64)) bad = 'enemy left behind the window';
      if (P.world.overlapsSolid(L(), p) && k % 30 === 1) bad = 'player inside a wall at ' + Math.floor(p.cx / T);
    }
    const ms = performance.now() - t0, gen = g.runner.stats || g.runner.gen.stats, wk = !!g.runner.worker; g.dispose();
    return { ok: !bad && shifts >= 115 && maxE <= 45 && maxD <= 220 && maxC <= 400 && maxCache <= E.WIN + 1, detail: bad || `shifts ${shifts} enemies≤${maxE} decor≤${maxD} coins≤${maxC} canvases≤${maxCache}`,
      info: `${shifts} chunks in ${(ms / 1000).toFixed(1)} s wall time, worker ${wk}, gen ${JSON.stringify(gen)}` };
  });
  await t('endless: worker chunks are identical to page-built chunks (same seed → same level)', async () => {
    const g = new P.Game({ endless: 2, seed: 77, heroId: 'knight' }); await g.load(); const R = g.runner, p = g.player;
    const got = [];
    for (let k = 0; k < 20 * 40 && got.length < 15; k++) {
      if (k % 40 === 0) { const ch = g.L.chunks[3]; p.x = ch.pad.x - p.w / 2; p.y = ch.pad.y - p.h; p.inv = 9; }
      const before = g.L.ox; g.update(); I.endFrame(); if (g.L.ox !== before) got.push(g.L.chunks[E.WIN - 1]);
      if (k % 40 === 39) await frames(2);                                       // let worker messages in
    }
    const worker = !!R.worker; g.dispose();
    const ref = new E.Generator(2, 77); ref.start(); const refC = []; for (let i = 1; i < 6 + got.length; i++) refC.push(ref.next(i));
    let diff = 0; for (const c of got) { const r = refC.find(x => x.gi === c.gi); if (!r || r.tiles.join() !== Array.from(c.tiles).join() || r.spawns.length !== c.spawns.length) diff++; }
    return { ok: got.length >= 12 && diff === 0, detail: `compared ${got.length} chunks, ${diff} differ, worker ${worker}` };
  });
  await t('endless: every generated chunk passes the reachability check with every movement profile (3 worlds × 4 seeds × 40)', async () => {
    let n = 0, fails = 0, fallbacks = 0, tries = 0;
    for (const w of [1, 2, 3]) for (const seed of [1, 2, 3, 4]) {
      const gen = new E.Generator(w, seed); let prev = gen.start();
      for (let i = 1; i <= 40; i++) { const c = gen.next(i); const r = E.validate(prev, c); n++; if (!r.ok) fails++; prev = c; }
      fallbacks += gen.stats.fallback; tries += gen.stats.tries;
    }
    return { ok: fails === 0, detail: `${fails}/${n} invalid`, info: `${n} chunks, ${tries} attempts (${((tries - n) / tries * 100).toFixed(1)} % re-rolled), ${fallbacks} safe-chunk fallbacks` };
  });
  await t('endless: difficulty rises with distance (enemies, elites, hazards) but stays capped', async () => {
    const stat = { lo: { e: 0, el: 0, hz: 0, n: 0 }, hi: { e: 0, el: 0, hz: 0, n: 0 } };
    for (const w of [1, 2, 3]) for (const seed of [5, 6]) {
      const gen = new E.Generator(w, seed); gen.start();
      for (let i = 1; i <= 64; i++) { const c = gen.next(i), b = i <= 6 ? stat.lo : i >= 49 ? stat.hi : null; if (!b) continue;
        b.n++; b.e += c.spawns.length; b.el += c.spawns.filter(s => s.elite).length; b.hz += Array.from(c.tiles).filter(x => x === P.TILE.SPIKE || x === P.TILE.LIQUID).length + c.tiles.filter((x, k) => x === 0 && Math.floor(k / E.CW) === E.H - 1).length; }
    }
    const lo = stat.lo, hi = stat.hi, avg = (b, k) => b[k] / b.n;
    const maxSpawn = Math.max(...[1, 2, 3].map(w => { const g = new E.Generator(w, 9); g.start(); let m = 0; for (let i = 1; i < 80; i++) m = Math.max(m, g.next(i).spawns.length); return m; }));
    return { ok: avg(hi, 'e') > avg(lo, 'e') && avg(hi, 'el') > avg(lo, 'el') && E.tierOf(500) === 10 && maxSpawn <= 4,
      detail: `enemies/chunk ${avg(lo, 'e').toFixed(2)} → ${avg(hi, 'e').toFixed(2)} · elites ${avg(lo, 'el').toFixed(2)} → ${avg(hi, 'el').toFixed(2)} · hazard tiles ${avg(lo, 'hz').toFixed(1)} → ${avg(hi, 'hz').toFixed(1)} · max ${maxSpawn}/chunk` };
  });
  await t('endless: the 3 worlds are built differently (own patterns, hazards and enemies)', async () => {
    const sig = {};
    for (const w of [1, 2, 3]) { const gen = new E.Generator(w, 3); gen.start(); const pats = {}, types = new Set(); let lava = 0, spikes = 0, springs = 0, movers = 0, brk = 0;
      for (let i = 1; i <= 60; i++) { const c = gen.next(i); c.pats.forEach(x => pats[x] = (pats[x] || 0) + 1); c.spawns.forEach(s => types.add(s.type)); springs += c.springs.length; movers += c.movers.length;
        for (const x of c.tiles) { if (x === P.TILE.LIQUID) lava++; if (x === P.TILE.SPIKE) spikes++; if (x === P.TILE.BREAK) brk++; } }
      sig[w] = { pats: Object.keys(pats).sort().join(','), types: [...types].sort().join(','), lava, spikes, springs, movers, brk }; }
    const ok = sig[1].types !== sig[2].types && sig[2].types !== sig[3].types && sig[2].spikes > sig[1].spikes && sig[3].lava > sig[1].lava && sig[1].springs > sig[3].springs && sig[2].brk > 0 && sig[1].pats !== sig[3].pats;
    return { ok, detail: JSON.stringify(sig).slice(0, 400) };
  });
  await t('endless: no pattern repeats back-to-back more than twice', async () => {
    let worst = 0;
    for (const w of [1, 2, 3]) { const gen = new E.Generator(w, 11); gen.start(); const seq = []; for (let i = 1; i <= 80; i++) seq.push(...gen.next(i).pats);
      let run = 1; for (let k = 1; k < seq.length; k++) { run = seq[k] === seq[k - 1] && seq[k] !== 'flat' ? run + 1 : 1; worst = Math.max(worst, run); } }
    return { ok: worst <= 2, detail: `longest repeat ${worst}` };
  });
  await t('endless: game over → summary + stats saved → play again restarts in place', async () => {
    const before = JSON.parse(localStorage.getItem('ql_platform_v1') || '{}').endless || {};
    await app.api.startEndless(1, 4242); await frames(5);
    const g = app.game; if (!g || !g.runner) return { ok: false, detail: 'no endless game' };
    g.player.inv = 0; g.player.hp = 1; g.player.hurt(1, g.player.cx + 10);
    for (let k = 0; k < 120 && app.screen !== 'over'; k++) await frames(1);
    const over = app.screen === 'over', saved = (JSON.parse(localStorage.getItem('ql_platform_v1')).endless || {})[1] || {};
    const runs0 = (before[1] || {}).runs || 0;
    document.querySelector('#overBox [data-go2="endlessAgain"]').click(); await frames(5);
    const again = app.game === g && g.mode === 'play' && g.runner.dist === 0 && !g.player.dead && g.seed !== 4242;
    document.querySelector('#overBox [data-go2="endlessAgain"]') && 0;
    app.api.pause(); await frames(2); const pausedOk = g.mode === 'paused';
    app.api.go('endless'); await frames(2);
    return { ok: over && saved.runs === runs0 + 1 && again && pausedOk && !app.game, detail: `over ${over} runs ${runs0}→${saved.runs} again ${again} paused ${pausedOk}` };
  });

  /* ================================== INPUT ================================== */
  // touch UI on, a real level running under the UI loop
  P.save.data.settings.touch = 'on';
  await app.api.startLevel('1-1'); await frames(5);
  const joy = document.querySelector('#joy'), base = joy.querySelector('.jbase');
  const pe = (el, type, x, y, id, extra) => el.dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: id === 1, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 }, extra || {})));
  const held = () => ['left', 'right', 'up', 'down', 'jump', 'attack', 'skill', 'dash'].filter(a => I.isHeld(a)).join(',');
  const bc = () => { const r = base.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; };
  const btn = a => { const r = document.querySelector(`#btns [data-act="${a}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, el: document.querySelector(`#btns [data-act="${a}"]`) }; };
  await t('touch UI: joystick and buttons are on screen and do not overlap', async () => {
    const on = document.querySelector('#touch').classList.contains('on'), j = joy.getBoundingClientRect(), b = document.querySelector('#btns').getBoundingClientRect();
    return { ok: on && j.right <= b.left + 1, detail: `touch on ${on} joy right ${j.right.toFixed(0)} buttons left ${b.left.toFixed(0)}` };
  });
  await t('joystick: drag right → walk right, reverse without lifting → left, lift → stop', async () => {
    const c = bc(); I.clearAll();
    pe(joy, 'pointerdown', c.x, c.y, 11); pe(joy, 'pointermove', c.x + c.R * .7, c.y, 11); const a = held();
    pe(joy, 'pointermove', c.x - c.R * .7, c.y + 2, 11); const b = held();
    pe(joy, 'pointermove', c.x - c.R * 3, c.y, 11); pe(joy, 'pointermove', c.x - c.R * 1.4, c.y, 11); const d = held();     // pulled far left → the base follows the thumb, so ~1 radius back = right again
    pe(joy, 'pointerup', c.x, c.y, 11); const e = held();
    return { ok: a === 'right' && b === 'left' && d === 'right' && e === '', detail: `${a} | ${b} | ${d} | ${e}` };
  });
  await t('joystick: dead zone, and up / down only on a clear vertical push', async () => {
    const c = bc(); I.clearAll();
    pe(joy, 'pointerdown', c.x, c.y, 12); pe(joy, 'pointermove', c.x + c.R * .12, c.y, 12); const dz = held();
    pe(joy, 'pointermove', c.x + c.R * .8, c.y + c.R * .3, 12); const walkDown = held();
    pe(joy, 'pointermove', c.x + c.R * .1, c.y + c.R * .9, 12); const down = held();
    pe(joy, 'pointermove', c.x, c.y - c.R * .9, 12); const up = held();
    pe(joy, 'pointercancel', c.x, c.y, 12); const after = held();
    return { ok: dz === '' && walkDown === 'right' && down === 'down' && up === 'up' && after === '', detail: `${dz} | ${walkDown} | ${down} | ${up} | cancel→${after}` };
  });
  await t('touch: a lost pointerup cannot leave the hero walking (last finger lifted = everything released)', async () => {
    const c = bc(); I.clearAll();
    pe(joy, 'pointerdown', c.x, c.y, 13); pe(joy, 'pointermove', c.x + c.R * .8, c.y, 13); const a = held();
    window.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] })); const b = held();
    pe(joy, 'pointerdown', c.x, c.y, 14); pe(joy, 'pointermove', c.x - c.R * .8, c.y, 14);
    document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 14, pointerType: 'touch' })); const d = held();   // up lands elsewhere
    return { ok: a === 'right' && b === '' && d === '', detail: `${a} | touchend→${b} | stray up→${d}` };
  });
  await t('touch: walk + jump + attack at the same time, fingers independent', async () => {
    const c = bc(), J = btn('jump'), A = btn('attack'); I.clearAll();
    pe(joy, 'pointerdown', c.x, c.y, 21); pe(joy, 'pointermove', c.x + c.R * .8, c.y, 21);
    pe(J.el, 'pointerdown', J.x, J.y, 22); pe(A.el, 'pointerdown', A.x, A.y, 23); const all = held();
    pe(J.el, 'pointerup', J.x, J.y, 22); const noJump = held();
    pe(A.el, 'pointerup', A.x, A.y, 23); pe(joy, 'pointerup', c.x, c.y, 21); const none = held();
    return { ok: all === 'right,jump,attack' && noJump === 'right,attack' && none === '', detail: `${all} | ${noJump} | ${none}` };
  });
  await t('touch: sliding a finger from one button to another moves the press', async () => {
    const A = btn('attack'), J = btn('jump'); I.clearAll();
    pe(A.el, 'pointerdown', A.x, A.y, 31); const a = held();
    pe(A.el, 'pointermove', J.x, J.y, 31); const b = held();
    pe(J.el, 'pointerup', J.x, J.y, 31); const c = held();
    return { ok: a === 'attack' && b === 'jump' && c === '' && !A.el.classList.contains('on'), detail: `${a} | ${b} | ${c}` };
  });
  await t('input reset: window blur / tab hidden release keys, fingers and pad; tab hidden pauses', async () => {
    const c = bc(); I.clearAll();
    pe(joy, 'pointerdown', c.x, c.y, 41); pe(joy, 'pointermove', c.x + c.R * .8, c.y, 41); press('attack'); const a = held();
    window.dispatchEvent(new Event('blur')); const b = held(); await frames(2); const paused = app.screen === 'pause';
    app.api.resume(); await frames(2);
    document.querySelector('#joy').dataset.dir = '';
    return { ok: a === 'right,attack' && b === '' && paused, detail: `${a} | blur→${b} | paused ${paused}` };
  });
  await t('UI tap (pause button) does not make the hero attack or jump', async () => {
    I.clearAll(); const g = app.game; const n0 = g.stats.frames;
    const pb = document.querySelector('#hPause'); const r = pb.getBoundingClientRect();
    let pressedAny = false; const orig = I.set.bind(I); I.set = (a, s, on) => { if (on && /jump|attack|skill|dash/.test(a)) pressedAny = true; return orig(a, s, on); };
    pe(pb, 'pointerdown', r.left + 5, r.top + 5, 51); pe(pb, 'pointerup', r.left + 5, r.top + 5, 51); pb.click(); await frames(2);
    I.set = orig; const paused = app.screen === 'pause'; app.api.resume(); await frames(1);
    return { ok: !pressedAny && paused, detail: `action pressed ${pressedAny} paused ${paused}` };
  });

  /* ================================= GAMEPAD ================================= */
  const pad = { index: 0, id: 'Test Xbox Controller (STANDARD GAMEPAD)', mapping: 'standard', connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), vibrationActuator: null };
  const realGP = navigator.getGamepads.bind(navigator); navigator.getGamepads = () => [pad, null, null, null];
  const btnSet = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
  window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })); await frames(3);
  await t('gamepad: connects, default mapping drives the actions', async () => {
    btnSet(0, true); await frames(3); const j = I.isHeld('jump'); btnSet(0, false); btnSet(2, true); await frames(3); const a = I.isHeld('attack'); btnSet(2, false); await frames(3);
    return { ok: !!I.pad && j && a && !I.isHeld('attack'), detail: `pad ${!!I.pad} jump ${j} attack ${a}` };
  });
  app.api.pause(); await frames(2); app.api.go('settings'); await frames(3);
  const bindBtn = a => document.querySelector(`#padRemap [data-bind="${a}"]`);
  const capture = async (action, b) => { bindBtn(action).click(); await frames(3); btnSet(b, true); await frames(3); btnSet(b, false); await frames(3); };
  await t('remap: jump → Y (button 3) — Y leaves skill, saved to the Platform save', async () => {
    await capture('jump', 3);
    const m = I.padMap, saved = JSON.parse(localStorage.getItem('ql_platform_v1')).settings.padMap;
    return { ok: m.jump.join() === '3' && !m.skill.includes(3) && m.skill.length > 0 && saved && saved.jump.join() === '3', detail: JSON.stringify(m) };
  });
  await t('remap: taking the only button of another action swaps them (nothing left unbound)', async () => {
    await capture('dash', 3);          // 3 is jump's only button → jump gets dash's old main button
    const m = I.padMap; const ok = m.dash.join() === '3' && m.jump.length === 1 && m.jump[0] === 1;
    await capture('jump', 3);          // and back (dash gets 1 again)
    return { ok: ok && I.padMap.jump.join() === '3' && I.padMap.dash.join() === '1', detail: JSON.stringify(I.padMap) };
  });
  await t('remap: d-pad / Home are refused, the dialog keeps listening, Esc cancels', async () => {
    bindBtn('attack').click(); await frames(3); btnSet(12, true); await frames(3); btnSet(12, false); await frames(2);
    const msg = document.querySelector('#plMsg').textContent, still = document.querySelector('#padListen').classList.contains('on') && !!I.capture;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); await frames(2);
    const closed = !document.querySelector('#padListen').classList.contains('on') && !I.capture;
    return { ok: /ทิศทาง/.test(msg) && still && closed && I.padMap.attack.join() === '2', detail: `msg "${msg}" listening ${still} closed ${closed}` };
  });
  await t('remap: the listening dialog ignores menu input (B does not close Settings)', async () => {
    bindBtn('skill').click(); await frames(3); btnSet(1, true); await frames(3); btnSet(1, false); await frames(3);
    const stillSettings = app.screen === 'settings', skill = I.padMap.skill.join();
    return { ok: stillSettings && skill === '1' && I.padMap.dash.length > 0, detail: `screen ${app.screen} skill ${skill} dash ${I.padMap.dash}` };
  });
  await t('remap: restore defaults', async () => {
    document.querySelector('#padDefaults').click(); await frames(2); const d = JSON.stringify(I.padMap) === JSON.stringify(P.PAD.copy(P.PAD.DEFAULT));
    await capture('jump', 3);          // leave a custom mapping for the reload (persistence) test
    return { ok: d, detail: JSON.stringify(I.padMap) };
  });
  await t('remap: the new mapping is used in game (Y jumps, A does not)', async () => {
    app.api.go('back'); await frames(2); app.api.resume(); await frames(3);
    const p = app.game.player; p.inv = 99;
    btnSet(0, true); await frames(3); const aJump = I.isHeld('jump'); btnSet(0, false); await frames(3);
    btnSet(3, true); await frames(3); const yJump = I.isHeld('jump'); btnSet(3, false); await frames(3);
    return { ok: !aJump && yJump, detail: `A→jump ${aJump} Y→jump ${yJump}` };
  });
  await t('gamepad: unplugging pauses the game and releases its buttons', async () => {
    btnSet(2, true); await frames(3); const before = I.isHeld('attack');
    navigator.getGamepads = () => [null, null, null, null];
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: pad })); await frames(3);
    const ok = before && !I.isHeld('attack') && !I.pad && app.screen === 'pause';
    navigator.getGamepads = realGP; btnSet(2, false);
    return { ok, detail: `before ${before} after ${I.isHeld('attack')} pad ${!!I.pad} screen ${app.screen}` };
  });
  app.api.quitGame(); app.api.show('title');

  /* =============================== PERFORMANCE =============================== */
  const heap = () => { if (window.gc) { window.gc(); window.gc(); } return performance.memory ? performance.memory.usedJSHeapSize : 0; };
  for (const [id, hid] of [['1-2', 'x'], ['3-3', 'knight'], ['2-1', 'luffy']]) await t(`long session (5 min of game time) · ${id} with ${hid} — no slowdown, no growth`, async () => {
    const g = new P.Game({ levelId: id, heroId: hid }); await g.load(); P.skipIntro = true;
    const win = [], N = 18000, W = 1500; let tw = 0, maxParts = 0, maxFx = 0, maxProj = 0; const h0 = heap();
    for (let i = 0; i < N; i++) {
      const a = performance.now();
      (i % 300 < 200 ? press : rel)(i % 600 < 300 ? 'right' : 'left'); (i % 41 === 0 ? press : rel)('jump'); (i % 9 < 5 ? press : rel)('attack'); (i % 97 === 0 ? press : rel)('skill'); (i % 131 === 0 ? press : rel)('dash');
      const p = g.player; p.inv = 9; p.hp = p.maxHp; p.en = 100; if (p.dead || g.mode !== 'play') { g.respawn(); }
      if (i % 2400 === 0 && g.boss) { g.boss.hp = g.boss.maxHp; }
      g.update(); g.render(octx, 2); octx.getImageData(0, 0, 1, 1); I.endFrame(); tw += performance.now() - a;   // getImageData: finish the raster work inside this frame (an off-screen canvas otherwise batches it)
      maxParts = Math.max(maxParts, g.parts.length); maxFx = Math.max(maxFx, g.fxs.length); maxProj = Math.max(maxProj, g.projs.length);
      if ((i + 1) % W === 0) { win.push(tw / W); tw = 0; }
    }
    ['right', 'left', 'jump', 'attack', 'skill', 'dash'].forEach(rel);
    const h1 = heap(), first = (win[1] + win[2]) / 2, last = (win[win.length - 1] + win[win.length - 2]) / 2, grow = (h1 - h0) / 1048576, mode = g.mode;
    g.dispose();
    return { ok: last <= first * 1.6 + .5 && grow < 25 && maxParts <= 600 && maxFx <= 160 && maxProj <= 141 && P.assets._pal.size <= P.assets.PAL_MAX,
      detail: `mode ${mode} ms/frame ${first.toFixed(2)} → ${last.toFixed(2)} · heap +${grow.toFixed(1)} MB · parts≤${maxParts} fx≤${maxFx} shots≤${maxProj} palette cache ${P.assets._pal.size}`,
      info: `ms/frame (update+render) first ${first.toFixed(2)} last ${last.toFixed(2)} · heap ${(h0 / 1048576).toFixed(1)} → ${(h1 / 1048576).toFixed(1)} MB` };
  });
  await t('long endless run (300 chunks) — heap stays flat', async () => {
    const g = new P.Game({ endless: 3, seed: 99, heroId: 'x' }); await g.load(); const p = g.player;
    let h0 = 0; const t0 = performance.now();
    for (let k = 0; k < 300 * 24; k++) {
      if (k % 24 === 0) { const ch = g.L.chunks[3]; p.x = ch.pad.x - p.w / 2; p.y = ch.pad.y - p.h; p.vx = p.vy = 0; p.inv = 9; p.hp = p.maxHp; }
      if (k % 24 === 5) await frames(1);
      press('attack'); if (k % 30 === 0) rel('attack');
      g.update(); if (k % 2 === 0) g.render(octx, 2); I.endFrame();
      if (k === 40 * 24) h0 = heap();
    }
    rel('attack'); const h1 = heap(), grow = (h1 - h0) / 1048576, ms = (performance.now() - t0) / (300 * 24);
    const st = { enemies: g.enemies.length, decor: g.decor.length, coins: g.L.coins.length, canvases: g.chunkCache.size, gi: g.L.chunks[4].gi };
    g.dispose();
    return { ok: grow < 12 && st.gi >= 250 && st.canvases <= 6, detail: `heap +${grow.toFixed(1)} MB after 260 more chunks · ${JSON.stringify(st)}`, info: `${ms.toFixed(2)} ms/frame avg (with rendering every 2nd frame) · heap +${grow.toFixed(1)} MB over 260 chunks` };
  });
  P.drawFrame = realDraw;
  return out;
};
