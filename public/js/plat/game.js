/* ==========================================================================
   PLATFORM MODE · game session
   --------------------------------------------------------------------------
   One Game = one level being played. Owns the level, player, enemies,
   projectiles, pickups, camera and effects; runs at a fixed 60 steps / s
   (ui.js drives the loop). Talks to the UI only through emit(type, data):
     hud · sign · checkpoint · gem · boss · bossHit · dead · clear · toast
   Rendering draws in world units; the canvas backing store is the device
   resolution, so pixel art stays sharp at any window size.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, U = PLAT.U, W = PLAT.world, T = C.T, TL = PLAT.TILE;
const sfx = () => PLAT.sfx;

class Game {
  constructor(opt) {
    this.opt = opt; this.levelId = opt.levelId; this.heroId = opt.heroId; this.spec = PLAT.LEVELS[opt.levelId];
    this.theme = PLAT.THEMES[this.spec.theme]; this.input = PLAT.input; this.emitFn = opt.onEvent || (() => {});
    this.sheets = new Map(); this.frame = 0; this.mode = 'loading';
  }
  enemyDef(type) { return (PLAT.enemyDef && PLAT.enemyDef(type, this.spec.theme)) || PLAT.ENEMIES[type] || PLAT.BOSSES[type]; }
  emit(type, data) { try { this.emitFn(type, data); } catch (e) { console.error(e); } }

  /* --------------------------------- loading --------------------------------- */
  async load(onProgress) {
    const hero = PLAT.HEROES[this.heroId];
    let hdef = hero.sprite;
    if (hdef.kind === 'atlas') { const atlas = await PLAT.assets.json(hdef.atlasSrc); if (!atlas) throw new Error('missing ' + hdef.atlasSrc); hdef = Object.assign({}, hdef, { atlas }); }
    this.heroSheet = new PLAT.Sheet(hdef);
    const L = this.L0spec = this.spec;
    const types = new Set(W.buildLevel(L).spawns.map(s => s.type)); if (L.boss) types.add(L.boss);
    const imgs = [...this.heroSheet.srcs()];
    for (const t of types) {
      const d = this.enemyDef(t);
      this.sheets.set(t, new PLAT.Sheet(d.sheet)); imgs.push(d.sheet.img); (d.states || []).forEach(s => imgs.push(s)); if (d.after) imgs.push(d.after); if (d.afterSheet) imgs.push(d.afterSheet.img);
    }
    // projectiles / effects this hero and these enemies can make
    const projNames = new Set(['fireball', 'bigfire', 'wave']);
    const A = hero.attack, S = hero.skill, D = hero.dash;
    [A.proj, A.mouthful && A.mouthful.proj, A.combo && A.combo.proj, S && S.proj, hero.float && hero.float.puff].forEach(n => n && projNames.add(n));
    (A.charge || []).forEach(c => projNames.add(c.proj));
    for (const n of projNames) { const p = PLAT.PROJ[n]; if (p && p.img) imgs.push(p.img); }
    for (const k of ['boom', 'impact', 'spark', 'orb', 'craura', 'ground', 'kick', 'aura']) imgs.push(PLAT.FXDEF[k].img);
    (hero.preload || []).forEach(s => s && imgs.push(s));
    const th = this.theme; [th.bg, th.wall, th.block, ...(th.decor || [])].forEach(s => s && imgs.push(s));
    if (PLAT.themeImages) imgs.push(...PLAT.themeImages(th));            // world art (art.js): layers, tileset, decor
    await PLAT.assets.loadAll(imgs, onProgress);
    this.start();
  }
  start() {
    const L = this.L = W.buildLevel(this.spec);
    if (this.spec.arena) { const a = this.spec.arena; L.arena = { x0: a.x0 * T, x1: a.x1 * T, top: a.top || 2 * T }; }
    this.player = new PLAT.Player(this, this.heroId, L.start, this.heroSheet);
    this.checkpoint = { x: L.start.x, y: L.start.y };
    this.tokens = new Set();
    this.measureEnemies();
    this.enemies = L.spawns.map(s => PLAT.makeEnemy(this, s.type, s.x, s.y, s.elite));
    this.enemyTotal = this.enemies.length;
    this.boss = null; this.bossActive = false;
    this.projs = []; this.fxs = []; this.parts = []; this.texts = []; this.loose = []; this.warns = []; this.ghosts = [];
    this.stats = { coins: 0, gems: new Set(), kills: 0, hits: 0, deaths: 0, frames: 0, maxChain: 0 };
    this.shakeT = 0; this.shakeMag = 0; this.freeze = 0; this.flashT = 0;
    this.cam = { x: 0, y: 0 }; this.snapCam();
    this.buildDecor(); this.tileCache = null;
    this.mode = 'play'; this.signNear = null; this.clearT = 0;
    if (this.spec.boss) this.emit('toast', { text: this.spec.name, sub: this.spec.teach });
    this.emit('hud', this.hudState());
  }
  /* enemy collision boxes come from the sprite's own pixels (idle frame), so what you see is what you hit */
  measureEnemies() {
    this.geom = this.geom || {};
    for (const [type, sheet] of this.sheets) {
      if (this.geom[type] || type.includes(':')) continue;
      const d = this.enemyDef(type), fr = (sheet.frames('idle') || sheet.frames('move') || [])[0], b = fr && sheet.bounds(fr);
      if (!b || d.box.fixed) continue;
      const k = d.boss ? .72 : .8;
      this.geom[type] = { w: Math.round((b.x1 - b.x0) * d.scale * k), h: Math.round((b.y1 - b.y0) * d.scale * (d.boss ? .85 : .92)), c: (b.x0 + b.x1) / 2 * d.scale };
    }
  }
  spawnBoss() {
    const L = this.L, s = L.bossSpawn || { x: L.pw - 4 * T, y: (L.h - 2) * T };
    this.boss = PLAT.makeEnemy(this, this.spec.boss, s.x, s.y); this.boss.dir = -1; this.clearHostile();
    this.enemies.push(this.boss); this.bossActive = true;
  }

  /* --------------------------------- update --------------------------------- */
  update() {
    if (this.mode === 'loading' || this.mode === 'paused') return;
    this.frame++;
    // HIT-STOP: the world pauses for a few frames — but button presses made during the pause are
    // kept and delivered on the first frame after it (the loop clears `pressed` every frame, so an
    // attack / jump / dash tapped during hit-stop used to vanish and combos dropped)
    if (this.freeze > 0) { this.freeze--; Object.assign(this.held_ || (this.held_ = {}), this.input.pressed); this.stepParts(); return; }
    if (this.held_) { Object.assign(this.input.pressed, this.held_); this.held_ = null; }
    const L = this.L, p = this.player;
    if (this.mode === 'play') this.stats.frames++;
    if (this.chainT > 0 && --this.chainT === 0) this.chain = 0;
    if (PLAT.debug.on) for (const b of PLAT.debug.boxes) b.t--;
    W.stepMovers(L);
    W.stepCrumble(L, b => U.overlap(b, p) || this.enemies.some(e => !e.dead && U.overlap(b, e)));
    for (const [, c] of L.crumble) { if (c.fell) { c.fell = false; for (let i = 0; i < 8; i++) this.burst(c.tx * T + U.rnd(4, 28), c.ty * T + U.rnd(4, 28), this.theme.brick, 1, 1.6); } }
    if (this.mode === 'clear') { this.stepClear(); this.stepParts(); this.updateCamera(); return; }
    p.update(this.input);
    this.playerHazards();
    if (this.spec.boss && !this.boss && !p.dead && p.cx > (L.arena ? L.arena.x0 + 5 * T : 6 * T)) this.spawnBoss();
    for (const e of this.enemies) e.update();
    this.separate();
    for (const e of this.tokens) if (e.dead || e.gone || !this.enemies.includes(e)) this.tokens.delete(e);
    this.contacts();
    this.enemies = this.enemies.filter(e => !e.gone);
    this.stepProjs(); this.stepPickups(); this.stepWarns(); this.stepParts();
    for (const s of L.springs) if (s.sq > 0) s.sq--;
    // signs
    let near = null; for (const s of L.signs) if (Math.abs(s.x - p.cx) < 40 && Math.abs(s.y - p.feet) < 50) near = s;
    if (near !== this.signNear) { this.signNear = near; this.emit('sign', near ? near.text : null); }
    // exit
    const ex = L.exit;
    if (ex && ex.open && !p.dead && U.overlap(p, ex)) this.beginClear();
    // death
    if (p.dead && p.deadT === 70) { this.stats.deaths++; this.emit('dead', {}); this.mode = 'dead'; }
    this.updateCamera();
    if (this.frame % 6 === 0) this.emit('hud', this.hudState());
  }
  contacts() {
    const p = this.player; if (p.dead) return;
    for (const e of this.enemies) {
      if (e.dead || e.inhaled || !e.def.dmg) continue;
      if (e.boss && (e.st === 'intro' || e.alpha === 0)) continue;
      if (e.st === 'dizzy' || e.stunT > 0 || e.st === 'phase') continue;          // a reeling enemy cannot hurt you
      if (e.boss && (e.vulnerable || e.st === 'stagger')) continue;              // a boss's punish window (stuck pole / tired / stagger / rest) is safe to stand in
      const eb = { x: e.x + 3, y: e.y + 3, w: e.w - 6, h: e.h - 4 };
      if (!U.overlap(eb, p)) continue;
      if (p.bodyHit || (p.act && p.act.kind === 'pogo' && p.vy > 0)) continue;       // we are the one hitting
      if (p.act && (p.act.kind === 'roll' || p.act.kind === 'spindash' || p.act.kind === 'ult')) continue;
      if (p.act && p.act.reflect) { if (!e.boss && !e.def.heavy) { e.kbT = 14; e.vx = (e.cx < p.cx ? -1 : 1) * 5; e.vy = -3; e.interrupt && e.interrupt(); } continue; }
      p.hurt(e.def.dmg, e.cx);
    }
  }
  playerHazards() {
    const p = this.player, L = this.L; if (p.dead) return;
    // spikes (lower part of the tile)
    if (!(p.act && p.act.kind === 'pogo' && p.vy > 0)) {
      for (const s of W.tilesIn(L, { x: p.x + 2, y: p.y + 6, w: p.w - 4, h: p.h - 6 }, TL.SPIKE)) {
        const r = { x: s.tx * T + 4, y: s.ty * T + 12, w: T - 8, h: T - 12 };
        if (U.overlap(r, p)) { if (p.hurt(1, p.cx + (p.vx > 0 ? 10 : -10), { unblockable: true }) === 'hit') p.vy = -6.5; break; }
      }
    }
    // pits and lava/water: lose 1 HP, back to the last safe spot
    const inLiquid = W.tilesIn(L, { x: p.x + 2, y: p.y + p.h * .5, w: p.w - 4, h: p.h * .5 }, TL.LIQUID).length;
    if (inLiquid || p.y > L.ph + 30) {
      for (let i = 0; i < 14; i++) this.burst(p.cx + U.rnd(-10, 10), Math.min(p.feet, L.ph), inLiquid ? this.theme.liquid[1] : '#ffffff', 1, 2.4);
      if (p.hp <= 1) { p.inv = 0; p.hurt(1, p.cx, { unblockable: true }); p.vy = -2; }
      else {
        p.hp--; this.stats.hits++; sfx().hurt(); this.flashT = 10; this.text(p.cx, p.y, '-1', '#ff6a7a', 40);
        p.endAct();          // not act = null: a looping skill effect (YOTA's orb, a charge aura) would follow the player forever
        const s = p.lastSafe; p.x = s.x - p.w / 2; p.y = s.y - p.h; p.vx = 0; p.vy = 0; p.inv = 90; p.floating = false; p.ball = false; p.charge = 0;
      }
    }
  }
  hazardNear(p) {
    const L = this.L, box = { x: p.x - 24, y: p.y, w: p.w + 48, h: p.h + 30 };
    return W.tilesIn(L, box, TL.SPIKE).length > 0 || W.tilesIn(L, box, TL.LIQUID).length > 0 || W.tilesIn(L, box, TL.CRUMBLE).length > 0;
  }

  /* --------------------------------- combat --------------------------------- */
  /* One blow (o.id) hits each target once. Feedback scales with the blow, not with every hit alike:
       light  (1 dmg)          → 2-frame hit-stop, small spark
       medium (2 dmg)          → 3 frames, spark + dust
       heavy  (3+ / o.heavy)   → 5 frames, impact flash, small shake
       finisher (last combo step) → +1 frame and a bigger burst · multi-hit ticks (o.multi) → 1 frame */
  /* Collision → damage for every PLAYER attack (melee steps, skills, dashes, body hits, projectiles,
     explosions). Boxes are world rects; enemies are tested with their HURT box (enemies.js hurtBox).
       o.id     swing id — a swing / projectile hits each target once (multi-hit moves pass a new id per tick)
       o.los    {x, y} origin of a melee blow: a target behind a solid tile is not hit (no hitting through walls)
     Feedback scales with the blow, not with every hit alike:
       light  (1 dmg)          → 2-frame hit-stop, small spark
       medium (2 dmg)          → 3 frames, spark + dust
       heavy  (3+ / o.heavy)   → 5 frames, impact flash, small shake
       finisher (last combo step) → +1 frame and a bigger burst · multi-hit ticks (o.multi) → 1 frame */
  hit(box, dmg, o) {
    o = o || {}; let n = 0, kills = 0, cxs = 0, cys = 0;
    const dbg = PLAT.debug.on;
    if (dbg) PLAT.debug.boxes.push({ b: { x: box.x, y: box.y, w: box.w, h: box.h }, t: 6, col: o.from === this.player || (o.from && o.from.hero) ? '#ff3a3a' : '#ffa03a' });
    for (const e of this.enemies) {
      if (e.dead || e.inhaled) continue;
      const hb = e.hurtBox ? e.hurtBox() : e;
      if (!U.overlap(box, hb)) continue;
      if (o.los) {
        const tx = U.clamp(o.los.x, hb.x, hb.x + hb.w), ty = U.clamp(o.los.y, hb.y, hb.y + hb.h);
        if (!W.clearLine(this.L, o.los.x, o.los.y, tx, ty)) { if (dbg) this.dbgLog(e, 'wall', 0); continue; }
      }
      if (e.takeHit(dmg, o)) {
        n++; if (e.dead) kills++;
        if (o.from === this.player && !o.proj) this.player.lastTarget = e;      // combo step-in (player.startStep) follows this target
        if (dbg) this.dbgLog(e, 'hit', e.lastDmg);
        const cx = U.clamp(e.cx, box.x, box.x + box.w), cy = U.clamp(e.y + e.h / 2, box.y, box.y + box.h); cxs = cx; cys = cy;
        this.burst(cx, cy, '#fff4c0', o.heavy ? 10 : 5, o.heavy ? 3.2 : 2.2); this.spark(cx, cy, o.heavy ? 1.6 : 1);
        if (o.fx) this.fx(o.fx, cx, cy, {}); else if (o.heavy && o.from === this.player) this.fx('impact', cx, cy, { scale: .7 });
      } else {
        if (dbg && e.reject !== 'same-swing') this.dbgLog(e, e.reject || 'rejected', 0);
        // an IMMUNE boss tells the player (once per ~½ s), instead of silently eating the blow
        if (e.reject === 'immune' && (this.frame - (e._immT || -99)) > 30) { e._immT = this.frame; this.text(e.cx, e.y - 4, 'ไม่มีผล!', '#b0b8c8', 30); sfx().clang(); this.burst(U.clamp(e.cx, box.x, box.x + box.w), e.y + e.h / 2, '#c8d0e0', 4, 1.6); }
      }
    }
    // breakable blocks
    if (!o.noBreak) for (const t of W.tilesIn(this.L, box, TL.BREAK)) this.breakTile(t.tx, t.ty);
    if (n) {
      const heavy = o.heavy || dmg >= 3, stop = o.multi ? 1 : o.pogo ? 2 : heavy ? 5 : dmg >= 2 ? 3 : 2;
      this.hitstop(stop + (o.finisher ? 1 : 0) + (kills ? 1 : 0));
      if (heavy) sfx().heavy(); else sfx().hit();
      if (o.from === this.player) PLAT.haptic(heavy ? 'big' : 'hit');
      if (o.shake) this.shake(o.shake); else if (heavy) this.shake(2);
      if (o.finisher) this.burst(cxs, cys, '#ffd860', 8, 3.5);
      if (o.from === this.player) { this.player.onHitLanded(n); this.chainHit(n); }
    }
    return n;
  }
  /* hit chain: consecutive hits that land within 1.5 s of each other — shown as "N HIT!" from 3 on,
     so a combo that connects is visible (resets when you get hurt or stop hitting) */
  chainHit(n) {
    this.chain = (this.chainT > 0 ? this.chain || 0 : 0) + n; this.chainT = 90; if (this.chain > (this.stats.maxChain || 0)) this.stats.maxChain = this.chain;
    if (this.chain >= 3) {
      const p = this.player, col = this.chain >= 10 ? '#ff5ad8' : this.chain >= 6 ? '#ffd84a' : '#ffffff';
      this.texts = this.texts.filter(t => !t.chain);
      this.texts.push({ x: p.cx, y: p.y - 18, str: this.chain + ' HIT!', col, life: 50, max: 50, big: this.chain >= 6, chain: true });
    }
  }
  dbgLog(e, why, dmg) {
    const L = PLAT.debug.log; L.push({ f: this.frame, who: e.type, why, dmg, hp: Math.max(0, e.hp), st: e.st });
    if (L.length > 8) L.shift();
  }
  /* attack tokens: at most 2 enemies may be winding up / attacking at the same moment,
     so a crowd takes turns instead of hitting all at once */
  takeToken(e) { if (this.tokens.has(e)) return true; if (this.tokens.size >= 2) return false; this.tokens.add(e); return true; }
  dropToken(e) { this.tokens.delete(e); }
  // ground enemies push each other apart instead of stacking into one sprite
  separate() {
    const list = this.enemies.filter(e => !e.dead && !e.boss && e.def.ai !== 'flyer' && !e.inhaled && Math.abs(e.cx - this.cam.x - C.VW / 2) < C.VW);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!U.overlap(a, b) || Math.abs(a.feet - b.feet) > 12) continue;
      const ov = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), d = (a.cx < b.cx ? -1 : 1) * Math.min(1.2, ov / 2);
      W.moveBody(this.L, a, d, 0); W.moveBody(this.L, b, -d, 0);
    }
  }
  breakTile(tx, ty) {
    W.setTile(this.L, tx, ty, TL.EMPTY); this.tileCache = null; sfx().break(); this.shake(2);
    for (let i = 0; i < 10; i++) this.parts.push({ x: tx * T + U.rnd(4, 28), y: ty * T + U.rnd(4, 28), vx: U.rnd(-2.5, 2.5), vy: U.rnd(-5, -1), life: 40, col: this.theme.brick, size: 4, grav: .3 });
  }
  onEnemyKilled(e) {
    this.stats.kills++;
    const d = e.def;
    if (e.inhaled) return;
    if (e.fell) return;                     // fell into a pit / lava: no loot raining into the hole
    const n = d.boss ? 20 : (d.coins || 1) * (e.elite ? 2 : 1);
    if (e.elite) this.loose.push({ x: e.cx, y: e.y, vx: 0, vy: -5.5, kind: 'heart', t: 0 });
    for (let i = 0; i < n; i++) this.loose.push({ x: e.cx, y: e.y + e.h / 2, vx: U.rnd(-2, 2) * (d.boss ? 1.6 : 1), vy: U.rnd(-6, -2.5), kind: 'coin', t: 0 });
    if (!d.boss && Math.random() < .09) this.loose.push({ x: e.cx, y: e.y, vx: 0, vy: -5, kind: 'heart', t: 0 });
    if (d.boss) {
      PLAT.haptic('boss'); this.bossActive = false; this.clearHostile(); this.emit('boss', null);
      setTimeout(() => { if (this.L.exit) { this.L.exit.open = true; this.text(this.L.exit.x + T / 2, this.L.exit.y - 10, 'ประตูเปิดแล้ว!', '#8aff8a', 120, true); sfx().checkpoint(); } }, 1600);
    }
  }
  // remove every enemy shot and pending hazard (boss defeated / phase change) — nothing hits you after the fight
  clearHostile() { for (const pr of this.projs) if (pr.enemy) { pr.dead = true; this.burst(pr.x, pr.y, '#ffffff', 3, 1); } this.projs = this.projs.filter(p => !p.dead); this.warns = []; }
  // ultimate cut-in: the world freezes for a beat, the screen darkens, the move's name slams in
  ultCut(p, name) { this.cut = { t: 0, name, col: p.hero.color || '#ffd84a' }; this.hitstop(16); this.shake(4); PLAT.sfx.big(); PLAT.haptic('boss'); this.emit('ult', { name }); }
  bossIntro(b) { this.emit('boss', { name: b.def.name, th: b.def.th, hp: b.hp, max: b.maxHp }); }
  bossHit(b) { this.emit('bossHit', { hp: Math.max(0, b.hp), max: b.maxHp }); }
  nearestEnemy(x, y, dir, range, dyMax, homing) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e.inhaled || (e.alpha === 0)) continue;
      const dx = e.cx - x, dy = (e.y + e.h / 2) - y;
      if (dir && Math.sign(dx) !== dir && Math.abs(dx) > 8) continue;
      if (Math.abs(dy) > (dyMax || 60)) continue;
      if (homing && dy < -40) continue;
      const d = Math.hypot(dx, dy); if (d < range + e.w / 2 && d < bd) { bd = d; best = e; }
    }
    return best;
  }
  countProj(owner, name) { const def = PLAT.PROJ[name]; return this.projs.filter(p => p.owner === owner && p.def === def).length; }
  inhale(p, S) {
    const mx = p.cx + p.face * 12, my = p.feet - 14;
    const zone = { x: p.face > 0 ? p.cx : p.cx - S.range, y: p.feet - S.height, w: S.range, h: S.height + 6 };
    if (this.frame % 3 === 0) this.parts.push({ x: mx + p.face * S.range * U.rnd(.5, 1), y: my + U.rnd(-18, 12), vx: -p.face * 4, vy: 0, life: 14, col: '#ffffff', size: 2, line: true });
    for (const e of this.enemies) {
      if (e.dead || e.inhaled || !U.overlap(zone, e)) continue;
      if (!e.def.small || e.boss) { if (!e._heavyMsg) { e._heavyMsg = true; this.text(e.cx, e.y - 6, 'หนักเกิน!', '#ffb0b0', 40); } continue; }
      e.kbT = 3; e.vx = U.sign(mx - e.cx) * S.pull; e.x += U.sign(mx - e.cx) * S.pull; e.y += U.sign(my - (e.y + e.h / 2)) * 1.2;
      if (Math.abs(e.cx - mx) < 16) { e.inhaled = true; e.dead = true; e.gone = true; this.onEnemyKilled(e); this.burst(mx, my, '#ffb0e0', 8, 1.5); return { type: e.type }; }
    }
    for (const pr of this.projs) {
      if (!pr.enemy || pr.def.ground || !U.overlap(zone, pr.box())) continue;
      pr.vx = U.sign(mx - pr.x) * 4; pr.vy = U.sign(my - pr.y) * 1;
      if (Math.abs(pr.x - mx) < 14) { pr.dead = true; return { proj: true }; }
    }
    return null;
  }

  /* ------------------------------ projectiles ------------------------------ */
  spawnProj(nameOrDef, x, y, dir, o) {
    o = o || {};
    const def = typeof nameOrDef === 'string' ? PLAT.PROJ[nameOrDef] : nameOrDef; if (!def) return null;
    const g = this, pr = {
      def, x, y, px: x, py: y, y0: y, dir: dir || 1, t: 0, owner: o.owner || null, enemy: !!def.enemy, life: def.life, pierce: def.pierce || 0, id: PLAT.newSwing(),
      vx: o.vx != null ? o.vx : (dir || 0) * (o.speed || def.speed), vy: o.vy || 0, grav: o.grav != null ? o.grav : (def.grav || 0), scale: o.scale || def.scale || 1, dead: false,
      box() { const b = def.box; return def.ground ? { x: this.x - b[0] / 2, y: this.y - b[1], w: b[0], h: b[1] } : { x: this.x - b[0] / 2, y: this.y - b[1] / 2, w: b[0], h: b[1] }; },
    };
    if (def.ground) { pr.y = this.floorBelow(x, y - 8); }
    if (this.projs.length > 140) this.projs.shift().dead = true;      // hard cap: never an unbounded pile of shots
    this.projs.push(pr); return pr;
  }
  stepProjs() {
    const p = this.player, L = this.L;
    for (const pr of this.projs) {
      const d = pr.def; pr.t++;
      if (d.accel) pr.vx = U.clamp(pr.vx + pr.dir * d.accel, -d.maxSpeed, d.maxSpeed);
      if (d.decel) { pr.vx *= d.decel; }
      if (d.boomerang && pr.t > 20 && pr.owner) {
        const tx = pr.owner.cx, ty = pr.owner.feet - 30; pr.vx += U.sign(tx - pr.x) * .55; pr.vy += U.sign(ty - pr.y) * .3; pr.vx = U.clamp(pr.vx, -7, 7); pr.vy = U.clamp(pr.vy, -4, 4);
        // on the way BACK it is a new pass: it may hit the same enemies once more (was: one hit per throw)
        if (!pr.back && U.sign(pr.vx) === -pr.dir) { pr.back = true; pr.id = PLAT.newSwing(); }
        if (pr.t > 30 && Math.abs(tx - pr.x) < 14 && Math.abs(ty - pr.y) < 30) pr.dead = true;
      } else if (d.settle != null && pr.y0 != null && pr.t < 40) pr.y += ((pr.y0 + d.settle) - pr.y) * .12;   // thrown high, levels out lower (Mia's fan)
      pr.px = pr.x; pr.py = pr.y;
      pr.vy += pr.grav; pr.x += pr.vx; pr.y += pr.vy;
      if (d.trail && pr.t % 2 === 0) this.burst(pr.x - pr.dir * 14, pr.y, d.trail, 1, .4);
      if (--pr.life <= 0) { this.killProj(pr); continue; }
      const b = pr.box();
      if (d.ground) { if (W.solidAt(L, Math.floor((pr.x + pr.dir * b.w / 2) / T), Math.floor((pr.y - 4) / T)) || !W.solidAt(L, Math.floor(pr.x / T), Math.floor((pr.y + 4) / T))) { this.killProj(pr); continue; } if (pr.t % 4 === 0) this.dust(pr.x, pr.y, 1, d.proc === 'shock' ? '#ffd060' : '#bfe8ff'); }
      else if (!d.boomerang && W.solidAt(L, Math.floor(pr.x / T), Math.floor(pr.y / T))) { if (!pr.enemy) for (const t of W.tilesIn(L, b, TL.BREAK)) this.breakTile(t.tx, t.ty); this.killProj(pr); continue; }
      if (pr.enemy) {
        if (!p.dead && p.act && p.act.reflect && !d.ground && U.overlap(b, { x: p.x - 10, y: p.y - 6, w: p.w + 20, h: p.h + 8 })) {
          // reflected: the shot now belongs to the player and flies back
          pr.enemy = false; pr.owner = p; pr.vx = -pr.vx * 1.3 || p.face * 5; pr.vy = -pr.vy * .5; pr.dir = U.sign(pr.vx); pr.id = PLAT.newSwing(); pr.life = 90; pr.pierce = 1;
          sfx().clang(); this.burst(pr.x, pr.y, '#cfe8ff', 8, 2); this.text(pr.x, pr.y - 10, 'สะท้อน!', '#bfe8ff', 30); continue;
        }
        if (!p.dead && U.overlap(b, { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 })) { const r = p.hurt(d.dmg, pr.x); if (r !== 'ignored' || !d.ground) { if (r !== 'ignored') this.killProj(pr); } }
      } else {
        // swept box (continuous collision): the box covers where the shot was last frame AND where it is now,
        // so a fast shot can never step over a thin target between two frames
        const sx = Math.min(b.x, b.x - (pr.x - pr.px)), sy = Math.min(b.y, b.y - (pr.y - pr.py));
        const sweep = { x: sx, y: sy, w: b.w + Math.abs(pr.x - pr.px), h: b.h + Math.abs(pr.y - pr.py) };
        const n = this.hit(sweep, d.dmg, { id: pr.id, dir: U.sign(pr.vx) || pr.dir, kb: d.kb != null ? d.kb : 3, from: pr.owner, proj: true });
        if (n) { if (d.hitFx) { this.fx(d.hitFx, pr.x + U.sign(pr.vx || pr.dir) * b.w * .4, pr.y, { flip: (pr.vx || pr.dir) < 0 }); pr.didFx = true; } pr.pierce -= n; if (pr.pierce < 0) this.killProj(pr); }
      }
    }
    this.projs = this.projs.filter(q => !q.dead);
    for (const f of this.fxs) { f.t++; if (f.vx || f.vy) { f.x += f.vx || 0; f.y += f.vy || 0; } if (f.star) { if (f.t > f.life) f.dead = true; } else if (f.life ? f.t >= f.life : !f.loop && f.t >= f.frames.length * f.rate) f.dead = true; }
    this.fxs = this.fxs.filter(f => !f.dead);
    for (const a of this.ghosts) a.life--; this.ghosts = this.ghosts.filter(a => a.life > 0);
  }
  killProj(pr) {
    if (pr.dead) return; pr.dead = true; const d = pr.def, ex = d.explode;
    if (d.hitFx && !pr.enemy && pr.life > 0 && !pr.didFx) { this.fx(d.hitFx, pr.x, pr.y, { flip: (pr.vx || pr.dir) < 0 }); return; }   // shot stopped by a wall
    if (ex) {
      if (ex.atlasAnim) this.fx({ frames: this.heroSheet.frames(ex.atlasAnim), rate: 3, scale: 2 }, pr.x, pr.y, {});
      else if (ex.r > 0 || pr.enemy) this.fx('boom', pr.x, pr.y, { scale: ex.r ? ex.r / 30 : .7 });
      if (ex.r > 0) {
        const area = { x: pr.x - ex.r, y: pr.y - ex.r, w: ex.r * 2, h: ex.r * 2 };
        if (pr.enemy) { if (U.overlap(area, this.player)) this.player.hurt(ex.dmg, pr.x); }
        else this.hit(area, ex.dmg, { id: PLAT.newSwing(), kb: 5, dir: 0, from: pr.owner, at: pr.x, heavy: ex.dmg >= 3 });
        sfx().boom(); this.shake(3);
      }
    } else if (!pr.enemy) this.burst(pr.x, pr.y, d.glow || '#fff4c0', 5, 1.6);
    else if (d.proc === 'drop') this.burst(pr.x, pr.y, '#9ad8ff', 6, 1.8);
    else if (d.proc === 'rock') { this.burst(pr.x, pr.y, '#a89888', 8, 2); sfx().crumble(); }
  }

  /* -------------------------------- pickups -------------------------------- */
  stepPickups() {
    const p = this.player, L = this.L; if (p.dead) return;
    const pb = { x: p.x - 4, y: p.y - 4, w: p.w + 8, h: p.h + 8 };
    const near = (x, y, r) => x > pb.x - r && x < pb.x + pb.w + r && y > pb.y - r && y < pb.y + pb.h + r;
    for (const c of L.coins) if (!c.got && near(c.x, c.y, 8)) { c.got = true; this.stats.coins++; sfx().coin(); this.burst(c.x, c.y, '#ffd84a', 5, 1.4); }
    for (const g of L.gems) if (!g.got && near(g.x, g.y, 10)) {
      g.got = true; this.stats.gems.add(g.i); sfx().gem(); PLAT.haptic('gem'); this.flashT = 6;
      for (let i = 0; i < 18; i++) this.burst(g.x, g.y, i % 2 ? '#7af0ff' : '#ffffff', 1, 3);
      this.text(g.x, g.y - 14, `💎 ${this.stats.gems.size}/${L.gems.length}`, '#9af0ff', 80, true); this.emit('gem', { n: this.stats.gems.size, of: L.gems.length });
    }
    for (const h of L.hearts) if (!h.got && near(h.x, h.y, 8)) { h.got = true; this.collectHeart(h.x, h.y); }
    for (const k of L.checkpoints) if (!k.on && Math.abs(k.x - p.cx) < 22 && Math.abs(k.y - p.feet) < 40) {
      L.checkpoints.forEach(o => o.on = false); k.on = true; this.checkpoint = { x: k.x, y: k.y }; sfx().checkpoint();
      for (let i = 0; i < 16; i++) this.burst(k.x, k.y - 40, i % 2 ? '#ffe36a' : '#8aff8a', 1, 2.4);
      this.text(k.x, k.y - 60, 'เช็กพอยต์!', '#8aff8a', 70, true); p.heal(1); this.emit('checkpoint', {});
    }
    // loose drops (coins / hearts thrown out of enemies)
    for (const c of this.loose) {
      c.t++; c.vy = Math.min(c.vy + .35, 7);
      const b = { x: c.x - 5, y: c.y - 5, w: 10, h: 10, vx: c.vx, vy: c.vy };
      W.moveBody(L, b, c.vx, c.vy); c.x = b.x + 5; c.y = b.y + 5; if (b.onGround) { c.vy = c.vy > 2 ? -c.vy * .4 : 0; c.vx *= .85; }
      if (c.t > 14 && near(c.x, c.y, 6)) { c.got = true; if (c.kind === 'coin') { this.stats.coins++; sfx().coin(); } else this.collectHeart(c.x, c.y); }
      if (c.t > 600 || c.y > L.ph + 50) c.got = true;
    }
    this.loose = this.loose.filter(c => !c.got);
  }
  collectHeart(x, y) {
    const p = this.player;
    if (p.hp < p.maxHp) { p.heal(1); this.text(x, y - 10, '+1 ❤', '#ff8aa0', 50); } else { this.stats.coins += 5; this.text(x, y - 10, 'HP เต็ม · +5', '#ffd84a', 50); }
    sfx().heart(); this.burst(x, y, '#ff8aa0', 8, 1.8);
  }
  warn(x, y, frames, cb) { this.warns.push({ x, y, t: 0, frames, cb }); }
  stepWarns() { for (const w of this.warns) if (++w.t >= w.frames) { w.done = true; w.cb && w.cb(); } this.warns = this.warns.filter(w => !w.done); }
  floorBelow(x, y) {
    const tx = Math.floor(x / T);
    for (let ty = Math.max(0, Math.floor(y / T)); ty < this.L.h; ty++) if (W.solidAt(this.L, tx, ty) || W.tileAt(this.L, tx, ty) === TL.ONEWAY) return ty * T;
    return this.L.ph;
  }

  /* ----------------------------- respawn / clear ----------------------------- */
  respawn() {
    const p = this.player; p.reset(this.checkpoint); p.hp = p.maxHp; p.inv = 90; p.en = 100;
    // a retry starts clean: no shots, warnings, effects, pending hit-stop or buffered presses from the run that ended
    this.projs = []; this.warns = []; this.tokens.clear(); this.fxs = []; this.ghosts = []; this.freeze = 0; this.held_ = null; this.chain = 0; this.chainT = 0; this.shakeT = 0; this.shakeMag = 0;
    if (this.spec.boss) { this.enemies = this.enemies.filter(e => !e.boss); this.boss = null; this.bossActive = false; this.emit('boss', null); if (this.L.exit) this.L.exit.open = false; }
    this.mode = 'play'; this.snapCam(); this.emit('hud', this.hudState());
  }
  beginClear() {
    if (this.mode !== 'play') return;
    this.mode = 'clear'; this.clearT = 0; sfx().clear(); this.player.endAct();
    this.emit('hud', this.hudState());
  }
  stepClear() {
    const p = this.player; this.clearT++;
    p.vx = 0;
    if (p.hero.mod && p.hero.mod.clear) p.hero.mod.clear(p, this.clearT);      // X: victory pose, then beams out
    else p.anim.play('idle');
    p.anim.update();
    if (this.clearT === 70) this.emit('clear', this.result());
  }
  result() {
    const s = this.stats, L = this.L, par = this.spec.par * 60;
    const checks = [
      { id: 'time', th: `เวลา ≤ ${U.fmtTime(par)}`, ok: s.frames <= par },
      { id: 'hits', th: 'โดนโจมตี ≤ 2 ครั้ง', ok: s.hits <= 2 },
      this.spec.boss ? { id: 'death', th: 'ไม่ตายเลย', ok: s.deaths === 0 } : { id: 'gems', th: `เก็บ 💎 ครบ ${L.gems.length}`, ok: s.gems.size === L.gems.length },
      { id: 'kills', th: this.spec.boss ? 'ปราบบอส' : `ปราบศัตรู ≥ 70% (${s.kills}/${this.enemyTotal})`, ok: this.spec.boss ? true : s.kills >= Math.ceil(this.enemyTotal * .7) },
    ];
    const n = checks.filter(c => c.ok).length, rank = n === 4 ? 'S' : n === 3 ? 'A' : n === 2 ? 'B' : 'C';
    const score = s.coins * 10 + s.kills * 50 + s.gems.size * 500 + Math.max(0, Math.round((par - s.frames) / 60)) * 10 + (s.hits === 0 ? 1000 : 0);
    return { levelId: this.levelId, heroId: this.heroId, frames: s.frames, coins: s.coins, gems: [...s.gems], gemTotal: L.gems.length, kills: s.kills, enemyTotal: this.enemyTotal, hits: s.hits, deaths: s.deaths, maxChain: s.maxChain || 0, checks, rank, score };
  }
  hudState() {
    const p = this.player, L = this.L, h = p.hero;
    return { hp: p.hp, maxHp: p.maxHp, en: p.en, coins: this.stats.coins, gems: [...this.stats.gems], gemTotal: L.gems.length, frames: this.stats.frames,
      dashCd: h.dash && h.dash.cd ? p.cd.dash / h.dash.cd : 0, skillCost: h.skill ? (h.skill.cost || 0) : 0, ult: p.ult, superT: p.superT, mouth: !!p.mouth, heat: p.heat, streak: p.streak, charge: p.charge };
  }

  /* --------------------------------- effects --------------------------------- */
  shake(n) { if (n >= 5) PLAT.haptic('big'); if (PLAT.save.data.settings.shake === false) return; this.shakeMag = Math.max(this.shakeMag, n); this.shakeT = 12; }
  hitstop(n) { this.freeze = Math.max(this.freeze, n); }
  burst(x, y, col, n, sp) { for (let i = 0; i < (n || 6); i++) { const a = Math.random() * 6.283, s = (.3 + Math.random()) * (sp || 2); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .6, life: 18 + Math.random() * 16, col, size: 2, grav: .1 }); } if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600); }
  dust(x, y, n, col) { for (let i = 0; i < (n || 3); i++) this.parts.push({ x: x + U.rnd(-8, 8), y: y - 2, vx: U.rnd(-1.2, 1.2), vy: U.rnd(-1.2, -.2), life: 20 + U.rnd(0, 12), col: col || 'rgba(230,220,200,.8)', size: 3, grav: -.01, fade: true }); }
  spark(x, y, s) { this.fxs.push({ frames: null, star: true, x, y, t: 0, rate: 1, life: 8, dead: false, s: s || 1 }); }
  text(x, y, str, col, life, big) { this.texts.push({ x, y, str, col: col || '#fff', life: life || 40, max: life || 40, big: !!big }); }
  // motion trail for the player (hero) or an enemy (ghost swoop) — enemies' sheets face left
  afterimage(p) { const fr = p.anim.frame(); if (!fr) return; const hero = p.hero; this.ghosts.push({ fr, x: hero ? p.cx : p.cx - (p.cOff || 0) * p.sc * -p.dir, y: p.feet, face: hero ? p.face : -p.dir, scale: hero ? hero.scale : p.sc, smooth: hero ? hero.smooth : false, life: 12, pal: p.ghostPal || null }); }
  fx(nameOrDef, x, y, o) {
    o = o || {};
    let frames, rate, scale;
    if (typeof nameOrDef === 'string') { const d = PLAT.FXDEF[nameOrDef]; if (!d) return { dead: true }; frames = PLAT.fxSheet(d); rate = d.rate; scale = (o.scale || 1) * d.scale; }
    else { frames = nameOrDef.frames; rate = nameOrDef.rate || 3; scale = nameOrDef.scale || 1; }
    const f = { name: typeof nameOrDef === 'string' ? nameOrDef : null, frames, rate, scale, x, y, t: 0, loop: !!o.loop, follow: o.follow, behind: !!o.behind, alpha: o.alpha || 1, flip: o.flip, dead: false, vx: o.vx, vy: o.vy, pixel: !!(o.pixel || (typeof nameOrDef === 'string' && PLAT.FXDEF[nameOrDef].pixel)), life: o.life };
    if (frames && frames.length) this.fxs.push(f); else f.dead = true;
    return f;
  }
  stepParts() {
    for (const q of this.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.grav != null ? q.grav : .1; q.life--; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const t of this.texts) { t.life--; t.y -= t.big ? .25 : .55; }
    this.texts = this.texts.filter(t => t.life > 0);
    if (this.shakeT > 0) { this.shakeT--; if (this.shakeT === 0) this.shakeMag = 0; }
    if (this.flashT > 0) this.flashT--;
    if (this.hurtT > 0) this.hurtT--;
  }

  /* --------------------------------- camera --------------------------------- */
  snapCam() { this.updateCamera(true); }
  updateCamera(snap) {
    const p = this.player, L = this.L, VW = C.VW, VH = C.VH;
    if (!p) return;
    this.look = U.lerp(this.look || 0, p.face * 44 + p.vx * 10, .04);
    let tx = p.cx - VW / 2 + this.look, ty = p.feet - VH * .62;
    if (this.bossActive && L.arena) { tx = U.clamp(tx, L.arena.x0 - T, L.arena.x1 + T - VW); }
    tx = U.clamp(tx, 0, Math.max(0, L.pw - VW)); ty = U.clamp(ty, 0, Math.max(0, L.ph - VH));
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    this.cam.x += (tx - this.cam.x) * .14;
    const dy = ty - this.cam.y; this.cam.y += dy * (Math.abs(dy) > 60 ? .16 : .08);
  }

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */
  render(ctx, k) {
    if (this.mode === 'loading' || !this.L) return;
    PLAT.viewScale = k;
    const VW = C.VW, VH = C.VH, th = this.theme;
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (this.shakeMag > 0) { sx = U.rnd(-1, 1) * this.shakeMag * (this.shakeT / 12); sy = U.rnd(-1, 1) * this.shakeMag * (this.shakeT / 12); }
    const cx = Math.round((this.cam.x + sx) * k) / k, cy = Math.round((this.cam.y + sy) * k) / k;
    this.drawBackground(ctx, cx, cy);
    ctx.save(); ctx.translate(-cx, -cy);
    this.drawDecor(ctx, cx);
    this.drawTiles(ctx, cx, cy);
    this.drawObjects(ctx);
    for (const f of this.fxs) if (f.behind) this.drawFx(ctx, f);
    for (const a of this.ghosts) PLAT.drawFrame(ctx, a.fr, a.x, a.y, a.face, a.scale, { alpha: a.pal ? a.life / 14 : a.life / 24, smooth: a.smooth, pal: a.pal });
    for (const e of this.enemies) if (e.x + e.w > cx - 80 && e.x < cx + VW + 80 && e.y < cy + VH + 80 && e.y + e.h > cy - 120) e.draw(ctx);
    this.player.draw(ctx);
    if (this.player.mouth && !this.player.dead) { ctx.fillStyle = '#ffb0e0'; ctx.font = '700 10px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('อมอยู่', this.player.cx, this.player.y - 6); }
    for (const pr of this.projs) this.drawProj(ctx, pr);
    for (const f of this.fxs) if (!f.behind) this.drawFx(ctx, f);
    for (const q of this.parts) {
      ctx.globalAlpha = q.fade ? Math.min(1, q.life / 20) : 1; ctx.fillStyle = q.col;
      if (q.line) ctx.fillRect(q.x, q.y, 10, 1.5); else ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    for (const w of this.warns) { const a = (w.t % 10 < 5) ? .9 : .4; ctx.fillStyle = `rgba(255,60,60,${a})`; ctx.beginPath(); ctx.ellipse(w.x, w.y - 2, 12 + w.t / w.frames * 6, 4, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = `rgba(255,220,120,${a})`; ctx.font = '700 14px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', w.x, w.y - 10); }
    this.drawTexts(ctx);
    if (PLAT.debug.on) this.drawDebug(ctx);
    ctx.restore();
    if (PLAT.debug.on) this.drawDebugLog(ctx);
    if (th.embers) this.drawEmbers(ctx);
    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 30})`; ctx.fillRect(0, 0, VW, VH); }
    if (this.cut) {
      const c = this.cut, a = c.t < 8 ? c.t / 8 : Math.max(0, 1 - (c.t - 40) / 20);
      if (++c.t > 60) this.cut = null;
      ctx.fillStyle = `rgba(6,4,14,${.55 * a})`; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c.col; ctx.fillRect(0, VH * .36, VW, 3); ctx.fillRect(0, VH * .36 + 46, VW, 3);
      ctx.font = 'italic 900 26px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#000';
      const x = VW / 2 + Math.max(0, 30 - c.t * 4); ctx.strokeText(c.name, x, VH * .36 + 34); ctx.fillStyle = '#fff'; ctx.fillText(c.name, x, VH * .36 + 34); ctx.restore();
    }
    // getting hurt: a short red vignette at the screen edges (never covers the middle of the action)
    if (this.hurtT > 0) { const a = this.hurtT / 18 * .55, gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VW * .62); gr.addColorStop(0, 'rgba(255,30,50,0)'); gr.addColorStop(1, `rgba(255,30,50,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
    if (this.mode === 'clear') { const a = Math.min(1, this.clearT / 60); ctx.fillStyle = `rgba(8,7,15,${a * .6})`; ctx.fillRect(0, 0, VW, VH); }
  }
  /* world art (art.js): parallax layers back → front. Each layer repeats sideways, moves at f × the
     camera (fy vertically), and `below` fills under a bottom-anchored layer when the camera rises. */
  drawLayers(ctx, cx, cy, layers) {
    const VW = C.VW, VH = C.VH, A = PLAT.assets; let drawn = 0;
    for (const l of layers) {
      const im = A.img(l.img); if (!im) continue; drawn++;
      const w = Math.round(im.width * l.s), h = Math.round(im.height * l.s), gap = l.gap || 0, step = w + gap;
      const y = Math.round(l.y - cy * (l.fy || 0)), ox = -(((cx * l.f) % step) + step) % step;
      ctx.imageSmoothingEnabled = false;
      if (l.tileY) { for (let yy = ((y % h) + h) % h - h; yy < VH; yy += h) for (let x = ox; x < VW; x += step) ctx.drawImage(im, Math.round(x), yy, w, h); continue; }
      for (let x = ox - (gap ? step : 0); x < VW; x += step) ctx.drawImage(im, Math.round(x), y, w, h);
      if (l.below && y + h < VH) { ctx.fillStyle = l.below; ctx.fillRect(0, y + h - 1, VW, VH - y - h + 1); }
    }
    return drawn === layers.length;
  }
  drawBackground(ctx, cx, cy) {
    const th = this.theme, VW = C.VW, VH = C.VH, A = PLAT.assets;
    const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    if (th.art && th.art.layers && this.drawLayers(ctx, cx, cy, th.art.layers)) return;   // all layers loaded → the old drawn background is not needed
    const bg = th.bg && A.img(th.bg);
    if (th.bgFull && bg) {
      // an SVG background is re-rasterised on every drawImage (its blur filters cost ~20 ms) → rasterise once
      if (!this.bgCache) { const c = document.createElement('canvas'); c.width = 1408; c.height = 792; const s = Math.max(c.width / bg.width, c.height / bg.height); c.getContext('2d').drawImage(bg, (c.width - bg.width * s) / 2, (c.height - bg.height * s) / 2, bg.width * s, bg.height * s); this.bgCache = c; }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(this.bgCache, -((cx * .05) % 40), -cy * .03, VW * 1.1, VH * 1.1); ctx.imageSmoothingEnabled = false;
    }
    else if (bg && th.moon == null) {   // meadow: Kirby-sky strip
      const s = .78, w = bg.width * s, h = bg.height * s, ox = -((cx * .12) % w), y = VH * .7 - h - cy * .04;
      for (let x = ox; x < VW; x += w - 1) ctx.drawImage(bg, x, y, w, h);
    }
    if (th.moon) {
      ctx.fillStyle = '#fff8'; for (let i = 0; i < 40; i++) { const x = (i * 97 - cx * .05) % VW, y = (i * 53) % (VH * .6); ctx.fillRect((x + VW) % VW, y, 1.5, 1.5); }
      ctx.fillStyle = '#f4f0d0'; ctx.beginPath(); ctx.arc(VW * .78 - cx * .02, 70, 34, 0, 6.283); ctx.fill(); ctx.fillStyle = '#e0dcb8'; ctx.beginPath(); ctx.arc(VW * .78 - cx * .02 - 9, 62, 8, 0, 6.283); ctx.fill();
      if (bg) { ctx.globalAlpha = th.bgAlpha || .5; const s = .9, w = bg.width * s, ox = -((cx * .25) % w); for (let x = ox; x < VW; x += w - 1) ctx.drawImage(bg, x, VH * .42 - cy * .1, w, bg.height * s); ctx.globalAlpha = 1; }
    }
    if (th.wall) { const im = A.img(th.wall); if (im) { ctx.globalAlpha = .28; const s = .8, w = im.width * s, ox = -((cx * .35) % w); for (let x = ox; x < VW; x += w - 1) ctx.drawImage(im, x, VH * .35 - cy * .15, w, im.height * s); ctx.globalAlpha = 1; } }
    // two rolling hill layers
    th.hills.forEach((col, i) => {
      const sp = i ? .45 : .25, base = VH * (i ? .86 : .74) - cy * (i ? .2 : .12), amp = i ? 26 : 34;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, base - Math.abs(Math.sin((x + cx * sp) / 70)) * amp - Math.sin((x + cx * sp) / 23) * 5);
      ctx.lineTo(VW, VH); ctx.fill();
    });
  }
  buildDecor() {
    const L = this.L, th = this.theme, out = this.decor = [], rnd = mulberry(L.w * 31 + L.h);
    for (let tx = 2; tx < L.w - 2; tx++) for (let ty = 1; ty < L.h; ty++) {
      const t = W.tileAt(L, tx, ty);
      if (t !== TL.GROUND || W.tileAt(L, tx, ty - 1) !== TL.EMPTY) continue;
      if (W.tileAt(L, tx, ty - 2) !== TL.EMPTY) continue;
      const r = rnd();
      if (th.art && th.art.decor) {                      // world art: weighted pick, per-item scale, never on a hazard edge
        if (r < .12 && !W.tilesIn(L, { x: tx * T - T, y: ty * T - 2 * T, w: 3 * T, h: 3 * T }, TL.SPIKE).length) {
          const D = th.art.decor, tot = D.reduce((n, d) => n + d.w, 0); let k = rnd() * tot, d = D[0];
          for (const it of D) { k -= it.w; if (k <= 0) { d = it; break; } }
          out.push({ img: d.img, x: tx * T + 16, y: ty * T, sc: d.s, flip: rnd() < .5 });
        }
        continue;
      }
      if (th.decor.length && r < .1) out.push({ img: th.decor[Math.floor(rnd() * th.decor.length)], x: tx * T + 16, y: ty * T, s: .5 + rnd() * .3 });
      else if (th.graves && r < .1) out.push({ grave: true, x: tx * T + 16, y: ty * T, s: .8 + rnd() * .4, cross: rnd() < .4 });
    }
  }
  drawDecor(ctx, cx) {
    for (const d of this.decor) {
      if (d.x < cx - 200 || d.x > cx + C.VW + 200) continue;
      if (d.grave) { ctx.fillStyle = '#4a4658'; const w = 14 * d.s, h = 20 * d.s; if (d.cross) { ctx.fillRect(d.x - 2, d.y - h - 4, 4, h + 4); ctx.fillRect(d.x - 7, d.y - h + 2, 14, 4); } else { ctx.beginPath(); ctx.moveTo(d.x - w / 2, d.y); ctx.lineTo(d.x - w / 2, d.y - h + w / 2); ctx.arc(d.x, d.y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(d.x + w / 2, d.y); ctx.fill(); ctx.fillStyle = '#5e5a70'; ctx.fillRect(d.x - w / 2 + 2, d.y - h + 4, 2, h - 6); } continue; }
      const im = PLAT.assets.img(d.img); if (!im) continue;
      const s = d.sc != null ? d.sc : d.img.includes('tree') ? d.s * .55 : d.s * .9;
      ctx.imageSmoothingEnabled = false;
      if (d.flip) { ctx.save(); ctx.translate(d.x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -im.width * s / 2, d.y - im.height * s + 2, im.width * s, im.height * s); ctx.restore(); }
      else ctx.drawImage(im, d.x - im.width * s / 2, d.y - im.height * s + 2, im.width * s, im.height * s);
    }
  }
  /* static tiles are drawn once into an offscreen canvas (world px) */
  buildTileCache() {
    const L = this.L, th = this.theme;
    const c = document.createElement('canvas'); c.width = L.pw; c.height = L.ph;
    const g = c.getContext('2d');
    const solidish = (tx, ty) => { const t = W.tileAt(this.L, tx, ty); return t === TL.GROUND || t === TL.BRICK; };
    if (th.art && th.art.tiles && this.tileArtReady(th.art.tiles)) { this.buildTileArt(g, th.art.tiles, solidish); this.tileCache = c; L.dirty = false; return; }
    for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) {
      const t = L.tiles[ty * L.w + tx], x = tx * T, y = ty * T;
      if (t === TL.GROUND) {
        g.fillStyle = th.ground; g.fillRect(x, y, T, T);
        g.fillStyle = th.groundDark; const h = (tx * 7 + ty * 13) % 5; g.fillRect(x + 4 + h, y + 12, 5, 3); g.fillRect(x + 18 - h, y + 22, 4, 3); g.fillRect(x + 10, y + 4 + h, 3, 2);
        if (!solidish(tx, ty - 1)) { g.fillStyle = th.top; g.fillRect(x, y, T, 8); g.fillStyle = th.topLight; g.fillRect(x, y, T, 2); g.fillStyle = th.top; for (let i = 0; i < 4; i++) g.fillRect(x + i * 8 + 2, y + 8, 4, 2 + ((tx + i) % 3)); }
      } else if (t === TL.BRICK) this.drawBrick(g, x, y, th, tx, ty);
      else if (t === TL.ONEWAY) {
        g.fillStyle = th.brickDark; g.fillRect(x, y, T, 9); g.fillStyle = th.brickLight; g.fillRect(x, y, T, 3); g.fillStyle = th.brick; g.fillRect(x, y + 3, T, 4);
        g.fillStyle = th.brickDark; if (tx % 2 === 0) { g.fillRect(x + 6, y + 9, 3, 6); g.fillRect(x + 23, y + 9, 3, 6); }
      } else if (t === TL.SPIKE) {
        for (let i = 0; i < 4; i++) { g.fillStyle = '#d6dbe6'; g.beginPath(); g.moveTo(x + i * 8, y + T); g.lineTo(x + i * 8 + 4, y + 12); g.lineTo(x + i * 8 + 8, y + T); g.fill(); g.fillStyle = '#8a90a0'; g.fillRect(x + i * 8 + 4, y + 16, 1, T - 16); }
      }
    }
    this.tileCache = c; L.dirty = false;
  }
  /* ---- world-art tiles (art.js stamps). Order: every tile body first, then the overhangs (grass that
     reaches above a top tile) so a row below never paints over them. Same tiles, same collision. */
  stampImg(st, t) { return PLAT.assets.img((st && !Array.isArray(st) && st.img) || t.img); }
  tileArtReady(t) {
    for (const v of Object.values(t)) for (const st of this.variants(v)) if (st && typeof st === 'object' && !this.stampImg(st, t)) return false;
    return !t.img || !!PLAT.assets.img(t.img);
  }
  variants(v) { return v == null || typeof v !== 'object' ? [] : Array.isArray(v) && typeof v[0] !== 'number' ? v : [v]; }
  pick(v, tx, ty) { const a = this.variants(v); return a.length ? a[((tx * 7 + ty * 13) >>> 0) % a.length] : null; }
  stamp(g, t, st, x, y, o) {
    if (!st) return false; o = o || {};
    const im = this.stampImg(st, t); if (!im) return false;
    const r = Array.isArray(st) ? st : st.r || [0, 0, im.width, im.height], k = T / t.unit, oy = (st.oy || 0) * k;
    const dw = r[2] * k, dh = r[3] * k, dx = x + (T - dw) / 2, dy = o.bottom ? y + T - dh : y - oy;
    g.drawImage(im, r[0], r[1], r[2], r[3], dx, dy, dw, dh); return true;
  }
  buildTileArt(g, t, solidish) {
    const L = this.L, th = this.theme; g.imageSmoothingEnabled = false;
    const tileT = (tx, ty) => W.tileAt(L, tx, ty), over = [];
    for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) {
      const tt = L.tiles[ty * L.w + tx], x = tx * T, y = ty * T;
      if (tt === TL.GROUND || tt === TL.BRICK) {
        const open = !solidish(tx, ty - 1), lOpen = !solidish(tx - 1, ty) && tileT(tx - 1, ty) !== TL.BREAK && tileT(tx - 1, ty) !== TL.CRUMBLE, rOpen = !solidish(tx + 1, ty) && tileT(tx + 1, ty) !== TL.BREAK && tileT(tx + 1, ty) !== TL.CRUMBLE;
        let st;
        if (tt === TL.BRICK) st = open ? this.pick(t.brickTop, tx, ty) || this.pick(t.brick, tx, ty) : this.pick(t.brick, tx, ty);
        else if (open) st = (lOpen && !rOpen && t.topL) || (rOpen && !lOpen && t.topR) || this.pick(t.top, tx, ty);
        else {
          const deep = t.deep && solidish(tx, ty - 1) && solidish(tx, ty - 2);
          st = deep ? this.pick(t.deep, tx, ty) : (lOpen && !rOpen && t.fillL) || (rOpen && !lOpen && t.fillR) || this.pick(t.fill, tx, ty);
        }
        if (st && st.oy) { over.push([st, x, y]); this.stamp(g, t, { img: st.img, r: [st.r[0], st.r[1] + st.oy, st.r[2], st.r[3] - st.oy] }, x, y); }
        else if (!this.stamp(g, t, st, x, y)) { g.fillStyle = th.ground; g.fillRect(x, y, T, T); }
      } else if (tt === TL.ONEWAY) {
        const l = tileT(tx - 1, ty) !== TL.ONEWAY, r = tileT(tx + 1, ty) !== TL.ONEWAY;
        this.stamp(g, t, (l && t.onewayL) || (r && t.onewayR) || t.oneway, x, y);
      } else if (tt === TL.SPIKE) {
        if (t.spike) { const n = Array.isArray(t.spike) || (t.spike.r && t.spike.r[2] * T / t.unit >= T * .9) ? 1 : 2;
          for (let i = 0; i < n; i++) { const im = this.stampImg(t.spike, t), r = t.spike.r || [0, 0, im.width, im.height], k = T / t.unit, dw = r[2] * k, dh = r[3] * k;
            g.drawImage(im, r[0], r[1], r[2], r[3], x + (n === 1 ? (T - dw) / 2 : i * T / 2 + (T / 2 - dw) / 2), y + T - dh, dw, dh); } }
        else for (let i = 0; i < 4; i++) { g.fillStyle = '#d6dbe6'; g.beginPath(); g.moveTo(x + i * 8, y + T); g.lineTo(x + i * 8 + 4, y + 12); g.lineTo(x + i * 8 + 8, y + T); g.fill(); }
      }
    }
    for (const [st, x, y] of over) this.stamp(g, t, { img: st.img, r: [st.r[0], st.r[1], st.r[2], st.oy], oy: st.oy }, x, y);
  }
  drawBrick(g, x, y, th, tx, ty) {
    g.fillStyle = th.brick; g.fillRect(x, y, T, T);
    g.fillStyle = th.brickDark; g.fillRect(x, y + 15, T, 2); g.fillRect(x, y + 31, T, 1);
    const o = ty % 2 ? 0 : 16; g.fillRect(x + (o + 8) % 32, y, 2, 15); g.fillRect(x + (o + 24) % 32, y + 17, 2, 14);
    g.fillStyle = th.brickLight; g.fillRect(x, y, T, 2);
  }
  drawTiles(ctx, cx, cy) {
    const L = this.L, th = this.theme, VW = C.VW, VH = C.VH, p = this.player;
    if (!this.tileCache) this.buildTileCache();
    const x0 = Math.max(0, Math.floor(cx)), y0 = Math.max(0, Math.floor(cy)), w = Math.min(VW + 2, L.pw - x0), h = Math.min(VH + 2, L.ph - y0);
    if (w > 0 && h > 0) ctx.drawImage(this.tileCache, x0, y0, w, h, x0, y0, w, h);
    // dynamic tiles
    const tx0 = Math.floor(cx / T) - 1, tx1 = tx0 + Math.ceil(VW / T) + 2, ty0 = Math.floor(cy / T) - 1, ty1 = ty0 + Math.ceil(VH / T) + 2;
    const blockImg = th.block && PLAT.assets.img(th.block);
    const at = th.art && th.art.tiles, lt = at && at.liquidTop && PLAT.assets.img(at.liquidTop), lf = at && at.liquid && PLAT.assets.img(at.liquid), liqArt = lt && lf ? [lt, lf] : null;
    for (let ty = Math.max(0, ty0); ty <= Math.min(L.h - 1, ty1); ty++) for (let tx = Math.max(0, tx0); tx <= Math.min(L.w - 1, tx1); tx++) {
      const t = L.tiles[ty * L.w + tx], x = tx * T, y = ty * T;
      if (t === TL.LIQUID && liqArt) {             // world-art lava: the pack's lava tiles, the surface bobs a little
        const top = W.tileAt(L, tx, ty - 1) !== TL.LIQUID;
        ctx.drawImage(top ? liqArt[0] : liqArt[1], x, top ? y + Math.round(Math.sin((this.frame + tx * 9) / 14) * 1.5) : y, T, T);
      } else if (t === TL.LIQUID) {
        const top = W.tileAt(L, tx, ty - 1) !== TL.LIQUID, wave = Math.sin((this.frame + tx * 9) / 10) * 2;
        ctx.fillStyle = th.liquid[0]; ctx.globalAlpha = .9; ctx.fillRect(x, top ? y + 6 + wave : y, T, top ? T - 6 - wave : T); ctx.globalAlpha = 1;
        if (top) { ctx.fillStyle = th.liquid[1]; ctx.fillRect(x, y + 5 + wave, T, 3); if ((this.frame + tx * 17) % 90 < 8) { ctx.fillRect(x + 12, y + wave, 4, 4); } }
      } else if (t === TL.BREAK && at && at.breakable && this.stamp(ctx, at, this.pick(at.breakable, tx, ty), x, y)) {
        if (!at.breakableClean) this.drawCracks(ctx, x, y);
      } else if (t === TL.BREAK) {
        if (blockImg) ctx.drawImage(blockImg, 0, 0, 24, 32, x, y, T, T);
        else { this.drawBrick(ctx, x, y, th, tx, ty); ctx.strokeStyle = '#0006'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 10, y + 26); ctx.moveTo(x + 14, y + 16); ctx.lineTo(x + 26, y + 12); ctx.stroke(); }
      } else if (t === TL.CRUMBLE) {
        const c = L.crumble.get(ty * L.w + tx), cr = at && at.crumble && this.pick(at.crumble, tx, ty);
        const draw = (xx, yy) => { if (!(cr && this.stamp(ctx, at, cr, xx, yy))) this.drawCrumble(ctx, xx, yy, blockImg); else if (!at.crumbleClean) this.drawCracks(ctx, xx, yy, true); };
        if (c && c.state === 'gone') { if (c.t < 30) { ctx.globalAlpha = .25; draw(x, y); ctx.globalAlpha = 1; } continue; }
        const j = c && c.state === 'shake' ? U.rnd(-1.5, 1.5) : 0; draw(x + j, y);
      } else if (t === TL.FAKE) {
        const inside = U.overlap({ x: x - 40, y: y - 40, w: T + 80, h: T + 80 }, p);
        // a secret wall must look exactly like the real wall around it
        ctx.globalAlpha = inside ? .35 : 1; if (!(at && this.stamp(ctx, at, this.pick(at.brick, tx, ty), x, y))) this.drawBrick(ctx, x, y, th, tx, ty); ctx.globalAlpha = 1;
      }
    }
    // moving platforms
    for (const m of L.movers) {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(m.x, m.y + 2, m.w, m.h); ctx.fillStyle = '#c8a060'; ctx.fillRect(m.x, m.y, m.w, 4); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(m.x, m.y + 4, m.w, 5);
      ctx.fillStyle = '#ffd060'; ctx.fillRect(m.x + 4, m.y + 5, 3, 3); ctx.fillRect(m.x + m.w - 7, m.y + 5, 3, 3);
    }
  }
  drawCracks(ctx, x, y, light) {
    ctx.strokeStyle = light ? 'rgba(255,240,220,.35)' : 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 10, y + 26); ctx.moveTo(x + 14, y + 16); ctx.lineTo(x + 26, y + 12); ctx.stroke();
  }
  drawCrumble(ctx, x, y, blockImg) {
    if (blockImg) { ctx.drawImage(blockImg, 27, 0, 24, 32, x, y, T, T); return; }
    const th = this.theme; ctx.fillStyle = th.brickDark; ctx.fillRect(x, y, T, T); ctx.fillStyle = th.brick; ctx.fillRect(x + 2, y + 2, 13, 13); ctx.fillRect(x + 17, y + 2, 13, 13); ctx.fillRect(x + 2, y + 17, 28, 13);
    ctx.strokeStyle = '#0007'; ctx.beginPath(); ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 12, y + 30); ctx.moveTo(x + 22, y + 2); ctx.lineTo(x + 18, y + 30); ctx.stroke();
  }
  drawObjects(ctx) {
    const L = this.L, f = this.frame;
    // exit door
    const ex = L.exit;
    if (ex) {
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(ex.x - 4, ex.y - 6, ex.w + 8, ex.h + 6);
      ctx.fillStyle = ex.open ? '#ffe9a0' : '#5a4030'; ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
      if (ex.open) { const g = ctx.createRadialGradient(ex.x + ex.w / 2, ex.y + ex.h / 2, 4, ex.x + ex.w / 2, ex.y + ex.h / 2, 40); g.addColorStop(0, 'rgba(255,240,160,.7)'); g.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = g; ctx.fillRect(ex.x - 30, ex.y - 30, ex.w + 60, ex.h + 60); }
      else { ctx.fillStyle = '#8a6a50'; ctx.fillRect(ex.x + 4, ex.y + 6, ex.w - 8, 2); ctx.fillRect(ex.x + 4, ex.y + 30, ex.w - 8, 2); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(ex.x + ex.w / 2 - 3, ex.y + ex.h / 2 - 3, 6, 8); }
      ctx.fillStyle = '#ffd060'; ctx.font = '700 9px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ex.open ? 'EXIT' : '🔒', ex.x + ex.w / 2, ex.y - 9);
    }
    // checkpoints
    for (const k of L.checkpoints) {
      ctx.fillStyle = '#ddd'; ctx.fillRect(k.x - 1, k.y - 48, 3, 48);
      const wv = Math.sin(f / 8) * 2; ctx.fillStyle = k.on ? '#5aff7a' : '#a0a0a0'; ctx.beginPath(); ctx.moveTo(k.x + 2, k.y - 48); ctx.lineTo(k.x + 20, k.y - 41 + wv); ctx.lineTo(k.x + 2, k.y - 34); ctx.fill();
    }
    // signs
    for (const s of L.signs) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(s.x - 1, s.y - 18, 3, 18); ctx.fillStyle = '#c8965a'; ctx.fillRect(s.x - 11, s.y - 30, 22, 14); ctx.fillStyle = '#6a4a2a'; ctx.font = '700 10px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', s.x, s.y - 19); }
    // springs
    for (const s of L.springs) { const sq = s.sq > 0 ? Math.sin(s.sq / 14 * Math.PI) * 6 : 0; ctx.fillStyle = '#8a8a9a'; ctx.fillRect(s.x + 3, s.y + 4 + sq / 2, s.w - 6, 8 - sq / 2); ctx.fillStyle = '#ff4a5a'; ctx.fillRect(s.x, s.y + sq - 2, s.w, 5); ctx.fillStyle = '#ffa0a8'; ctx.fillRect(s.x, s.y + sq - 2, s.w, 1.5); }
    // coins / gems / hearts
    for (const c of L.coins) if (!c.got) this.drawCoin(ctx, c.x, c.y + Math.sin((f + c.x) / 12) * 2, (f + c.x) / 16);
    for (const c of this.loose) { if (c.kind === 'coin') this.drawCoin(ctx, c.x, c.y, (f + c.t) / 6, .8); else this.drawHeart(ctx, c.x, c.y); }
    for (const g of L.gems) if (!g.got) this.drawGem(ctx, g.x, g.y + Math.sin(f / 15) * 3);
    for (const h of L.hearts) if (!h.got) this.drawHeart(ctx, h.x, h.y + Math.sin(f / 14) * 2);
  }
  drawCoin(ctx, x, y, ph, s) {
    s = s || 1; const w = Math.max(1.2, Math.abs(Math.cos(ph)) * 6 * s);
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(x, y, w + .8, 7 * s, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x, y, w, 6 * s, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff3a0'; ctx.fillRect(x - .5, y - 3 * s, 1.5, 3 * s);
  }
  drawGem(ctx, x, y) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 22); g.addColorStop(0, 'rgba(120,240,255,.6)'); g.addColorStop(1, 'rgba(120,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
    ctx.fillStyle = '#2aa8d8'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x, y + 11); ctx.lineTo(x - 9, y - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9af0ff'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y - 3); ctx.closePath(); ctx.fill();
    if (this.frame % 40 < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 5, y - 9, 2, 6); ctx.fillRect(x + 3, y - 7, 6, 2); }
  }
  drawHeart(ctx, x, y) { ctx.fillStyle = '#ff4a6a'; ctx.beginPath(); ctx.arc(x - 4, y - 2, 4.5, 0, 6.283); ctx.arc(x + 4, y - 2, 4.5, 0, 6.283); ctx.moveTo(x - 8.5, y - 1); ctx.lineTo(x, y + 8); ctx.lineTo(x + 8.5, y - 1); ctx.fill(); ctx.fillStyle = '#ffc0cc'; ctx.fillRect(x - 6, y - 5, 2, 2); }
  drawProj(ctx, pr) {
    const d = pr.def;
    if (d.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const r = Math.max(d.box[0], d.box[1]) * .9, g = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, r); g.addColorStop(0, d.glow + 'aa'); g.addColorStop(1, d.glow + '00'); ctx.fillStyle = g; ctx.fillRect(pr.x - r, pr.y - r, r * 2, r * 2); ctx.restore(); }
    if (d.proc) {
      ctx.fillStyle = d.col;
      if (d.proc === 'tracer') { ctx.fillRect(pr.x - 8, pr.y - 1, 16, 2.5); ctx.fillStyle = '#fff'; ctx.fillRect(pr.x + (pr.vx > 0 ? 4 : -8), pr.y - 1, 4, 2.5); }
      else if (d.proc === 'bolt') { ctx.fillRect(pr.x - 10, pr.y - 1, 20, 2); ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); const tip = pr.x + U.sign(pr.vx) * 12; ctx.moveTo(tip, pr.y); ctx.lineTo(tip - U.sign(pr.vx) * 5, pr.y - 3); ctx.lineTo(tip - U.sign(pr.vx) * 5, pr.y + 3); ctx.fill(); }
      else if (d.proc === 'drop') { ctx.beginPath(); ctx.moveTo(pr.x, pr.y - 8); ctx.quadraticCurveTo(pr.x + 6, pr.y + 2, pr.x, pr.y + 6); ctx.quadraticCurveTo(pr.x - 6, pr.y + 2, pr.x, pr.y - 8); ctx.fill(); }
      else if (d.proc === 'rock') { ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.t * .1); ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-8, 2, 16, 6); ctx.restore(); }
      else if (d.proc === 'shock') { ctx.globalAlpha = .9; ctx.beginPath(); ctx.ellipse(pr.x, pr.y - 6, 12, 14 + Math.sin(pr.t / 2) * 3, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff8c0'; ctx.fillRect(pr.x - 2, pr.y - 18, 4, 14); ctx.globalAlpha = 1; }
      return;
    }
    let frames, rate = d.rate || 3;
    if (d.atlasAnim) frames = this.heroSheet.frames(d.atlasAnim); else frames = PLAT.fxSheet(d);
    if (!frames || !frames.length) return;
    let i = Math.floor(pr.t / rate); if (i >= frames.length) i = d.loopFrom != null ? d.loopFrom + (i - d.loopFrom) % (frames.length - d.loopFrom) : i % frames.length;
    const fr = frames[i], dir = U.sign(pr.vx) || pr.dir || 1;
    const o = { smooth: pr.scale < 1 && !d.pixel, alpha: d.fade ? Math.min(1, pr.life / 14) : 1 };
    if (d.spin) o.rot = pr.t * d.spin;
    if (!d.ground && pr.enemy && d.img && d.img.includes('fireball') && (pr.vy || pr.vx)) { o.rot = Math.atan2(pr.vy, Math.abs(pr.vx)) * dir; }
    const y = (d.ground ? pr.y - fr.sh * pr.scale / 2 : pr.y) + (fr.by - fr.sh / 2) * pr.scale;   // centre any frame on the projectile
    PLAT.drawFrame(ctx, fr, pr.x, y, d.img && d.img.includes('aqua/wave') ? -dir : dir, pr.scale, o);
  }
  drawFx(ctx, f) {
    if (f.star) { const a = Math.max(0, 1 - f.t / f.life); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; const r = (4 + f.t * 2) * (f.s || 1), th = f.s > 1 ? 3 : 2; ctx.fillRect(f.x - r, f.y - th / 2, r * 2, th); ctx.fillRect(f.x - th / 2, f.y - r, th, r * 2); ctx.restore(); return; }
    if (f.follow) { const p = f.follow(); f.x = p.x; f.y = p.y; }
    let i = Math.floor(f.t / f.rate); if (f.loop) i %= f.frames.length; else i = Math.min(i, f.frames.length - 1);
    const fr = f.frames[i];
    PLAT.drawFrame(ctx, fr, f.x, f.y + (fr.by - fr.sh / 2) * f.scale, f.flip ? -1 : 1, f.scale, { alpha: f.alpha * (f.life ? Math.min(1, (f.life - f.t) / 8) : 1), smooth: !f.pixel });
  }
  drawBeam(ctx, b, face, h) {
    const x = face > 0 ? b.x0 : b.x0 - b.len, flick = 1 + Math.sin(b.t * 1.3) * .15, hh = h * flick * Math.min(1, b.t / 4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, b.y - hh, 0, b.y + hh); g.addColorStop(0, 'rgba(80,140,255,0)'); g.addColorStop(.3, 'rgba(120,180,255,.8)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(.7, 'rgba(120,180,255,.8)'); g.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, b.y - hh, b.len, hh * 2);
    ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(face > 0 ? b.x0 : b.x0, b.y, hh * .9, 0, 6.283); ctx.fill();
    ctx.restore();
    if (b.t % 3 === 0) this.burst(face > 0 ? b.x0 + b.len : b.x0 - b.len, b.y, '#bfe0ff', 2, 2);
  }
  drawStars(ctx, x, y, t) { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t / 10 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 10 - 1.5, y + Math.sin(a) * 3 - 1.5, 3, 3); } }
  drawTexts(ctx) {
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 12), sz = t.big ? 15 : 11;
      ctx.globalAlpha = a; ctx.font = `700 ${sz}px Kanit, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
  /* ----------------------------- debug overlay -----------------------------
     cyan = player body · green = enemy body (walls / contact) · yellow = enemy HURT box ·
     red = player attack boxes (last 6 frames) · orange = other damage areas · magenta = shots.
     Text: enemy state / HP / armour / poise / flags, player move state. Top-left: last hits and
     why a blow did nothing (same-swing · blocked · immune · wall · dead). */
  drawDebug(ctx) {
    const D = PLAT.debug, p = this.player, r = (b, c, f) => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); if (f) { ctx.fillStyle = f; ctx.fillRect(b.x, b.y, b.w, b.h); } };
    ctx.save(); ctx.font = '600 7px monospace'; ctx.textAlign = 'center';
    r(p, '#3af0ff');
    for (const e of this.enemies) {
      if (e.dead) continue;
      r(e, '#3aff6a'); if (e.hurtBox) r(e.hurtBox(), '#ffe03a');
      ctx.fillStyle = '#fff';
      ctx.fillText(`${e.st} ${Math.max(0, e.hp)}/${e.maxHp}${e.armor ? ' 🛡' + e.armor : ''}${e.maxPoise > 1 ? ' p' + e.poise : ''}${e.vulnerable ? ' VULN' : ''}${e.blocking ? ' BLOCK' : ''}${e.stunT > 0 ? ' stun' : ''}`, e.cx, e.y - 26);
    }
    D.boxes = D.boxes.filter(b => b.t > 0);
    for (const b of D.boxes) r(b.b, b.col, b.col + '33');
    for (const pr of this.projs) r(pr.box(), pr.enemy ? '#ff7a3a' : '#ff3aff');
    const a = p.act;
    ctx.fillStyle = '#3af0ff';
    ctx.fillText(`${a ? a.kind + ' t' + a.t + (a.idx != null ? ' #' + a.idx : '') + (a.cancellable ? ' C' : '') : (p.onGround ? 'ground' : 'air')}${p.queued ? ' Q' : ''}${p.inv > 0 ? ' inv' + p.inv : ''} combo${p.combo}`, p.cx, p.y - 30);
    ctx.restore();
  }
  drawDebugLog(ctx) {
    const L = PLAT.debug.log; if (!L.length) return;
    ctx.save(); ctx.font = '600 8px monospace'; ctx.textAlign = 'left';
    // top-left, under the HUD hearts (the bottom of the screen belongs to the ability bar / touch buttons)
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(4, 48, 236, L.length * 10 + 6);
    L.forEach((l, i) => { ctx.fillStyle = l.why === 'hit' ? '#8aff8a' : '#ff9a7a'; ctx.fillText(`f${l.f} ${l.who} ${l.why}${l.why === 'hit' ? ' -' + l.dmg + ' → ' + l.hp : ''} [${l.st}]`, 8, 58 + i * 10); });
    ctx.restore();
  }
  drawEmbers(ctx) {
    ctx.fillStyle = '#ffb04a';
    for (let i = 0; i < 26; i++) { const x = ((i * 137 + this.frame * (.3 + (i % 3) * .2)) % (C.VW + 40)) - 20, y = C.VH - ((i * 59 + this.frame * (.6 + (i % 4) * .2)) % (C.VH + 20)); ctx.globalAlpha = .35 + (i % 3) * .2; ctx.fillRect(x + Math.sin((this.frame + i * 20) / 20) * 6, y, 2, 2); }
    ctx.globalAlpha = 1;
  }
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
PLAT.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
