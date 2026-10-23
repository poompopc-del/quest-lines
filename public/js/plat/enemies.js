/* ==========================================================================
   PLATFORM MODE · enemies & bosses (real-time AI)
   --------------------------------------------------------------------------
   Sprites are the main game's sheets (js/ql2/boss-encounter.js, bestiary.js,
   zombies.js) — same files, same cell sizes; they all face LEFT, so the
   renderer mirrors them when they walk right. Feet lines (by) were measured
   from the PNG alpha (tools/plat-assets.py).
   AI kinds:
     patrol   walk, turn at walls / ledges, chase when the player is close (zombies)
     hopper   waits, then leaps at the player          (devil / magma slime)
     coward   runs away, drops a coin shower            (golden slime)
     flyer    floats through walls, drifts toward you   (ghost maiden)
     leaper   crouches (telegraph) then pounces         (licker)
     shooter  keeps distance, telegraphs, shoots       (tyrant)
     charger  revs, charges, blocks frontal hits while charging, dizzy after a crash (salvador)
     hound    walks, sprints at you when it sees you, "!" crouch then a long pounce (hell hound, v115)
   Armour (cone / bucket zombies): hits break the armour first; the sheet
   swaps to its dented states, then to a plain zombie.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, U = PLAT.U, W = PLAT.world, T = C.T;
const sfx = () => PLAT.sfx;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const row = (r, n) => range(r * 10, r * 10 + n - 1);
const slimeSheet = (k, big) => ({ kind: 'grid', img: `enemies/slime2/${k}.png`, cols: 16, fw: big ? 84 : 75, fh: big ? 87 : 84, ax: big ? 36 : 39, by: big ? 87 : 84,
  anims: { idle: [0, 1, 2, 1], move: [0, 1, 2, 1], hop: range(3, 9), hurt: [11], dead: range(12, 15) } });
const MS = PLAT.MONSTER_SHEETS || {};          // v108: CC0 monster strips (monster-sheets.js, loaded before this file)
const zSheet = (img, tall) => ({ kind: 'grid', img, cols: 10, fw: tall ? 52 : 51, fh: tall ? 75 : 59, ax: 31, by: tall ? 64 : 51,
  anims: { idle: row(0, 10), move: row(1, 10), atk: row(2, 10), dead: row(3, 10), hurt: [20] } });

PLAT.ENEMY_CODES = { s: 'slime', j: 'hopper', g: 'golden', m: 'magma', z: 'zombie', c: 'cone', b: 'bucket', w: 'ghost', l: 'licker', t: 'tyrant', h: 'salvador',
  // v108 CC0 monsters (Monsters Creatures Fantasy 1 + 2 by LuizMelo — js/plat/monster-sheets.js)
  k: 'skel', q: 'goblin', n: 'shroom', e: 'eye', r: 'rat', v: 'bat', d: 'goo', x: 'mimic',
  // v115 Hell Hound by ansimuz (CC-BY 3.0)
  f: 'hound',
  // v121 INK creatures of the Nameless Scribe (world 6): shadows of erased things — the same monsters, drawn in ink
  a: 'inkskel', i: 'inkeye', u: 'inkbat', y: 'inkhound' };
// ELITE versions (upper case): more HP and poise, a pink aura, and one extra trick each (see think())
PLAT.ELITE_CODES = { Z: 'zombie', J: 'hopper', M: 'magma', W: 'ghost', L: 'licker', T: 'tyrant', I: 'skel', Q: 'goblin', N: 'shroom', V: 'bat', D: 'goo', X: 'hound' };
const E = PLAT.ENEMIES = {
  slime:  { name: 'Green Slime', sheet: slimeSheet('green'), scale: .5, box: [26, 22], hp: 2, dmg: 1, ai: 'patrol', speed: .55, coins: 1, small: true, fps: 6 },
  hopper: { name: 'Devil Slime', sheet: slimeSheet('devil', true), scale: .55, box: [30, 24], hp: 3, dmg: 1, ai: 'hopper', jumpV: 7.6, jumpX: 2.4, wait: 54, sight: 210, coins: 2, small: true, fps: 6 },
  golden: { name: 'Golden Slime', sheet: slimeSheet('golden'), scale: .5, box: [26, 22], hp: 3, dmg: 0, ai: 'coward', speed: 2, sight: 150, coins: 10, small: true, fps: 8, sparkle: true },
  magma:  { elem: 'fire', name: 'Magma Slime', sheet: slimeSheet('magma'), scale: .55, box: [28, 24], hp: 3, dmg: 1, ai: 'hopper', jumpV: 8.2, jumpX: 2.8, wait: 44, sight: 240, coins: 2, small: true, fps: 7, trail: '#ff8a2a' },
  zombie: { name: 'Zombie', sheet: zSheet('enemies/pvz/basic.png'), scale: .9, box: [18, 42], hp: 4, dmg: 1, ai: 'patrol', bite: { wind: 22, recover: 34, reach: 24 }, speed: .4, chase: 1.0, sight: 170, coins: 2, small: true, fps: 8 },
  cone:   { name: 'Conehead', sheet: zSheet('enemies/pvz/cone_1.png', true), states: ['enemies/pvz/cone_1.png', 'enemies/pvz/cone_2.png', 'enemies/pvz/cone_3.png'], after: 'enemies/pvz/basic.png',
            scale: .9, box: [18, 42], hp: 4, armor: 3, dmg: 1, ai: 'patrol', bite: { wind: 22, recover: 34, reach: 24 }, speed: .4, chase: 1.0, sight: 170, coins: 3, fps: 8 },
  bucket: { name: 'Buckethead', sheet: zSheet('enemies/pvz/bucket_1.png', true), states: ['enemies/pvz/bucket_1.png', 'enemies/pvz/bucket_2.png', 'enemies/pvz/bucket_3.png'], after: 'enemies/pvz/basic.png',
            scale: .9, box: [18, 42], hp: 4, armor: 6, dmg: 1, ai: 'patrol', bite: { wind: 22, recover: 34, reach: 24 }, speed: .35, chase: .9, sight: 170, coins: 4, fps: 8, heavyArmor: true },
  ghost:  { name: 'Ghost Maiden', sheet: { kind: 'grid', img: 'enemies/re/maiden.png', cols: 3, fw: 34, fh: 46, ax: 14, by: 45, anims: { idle: [0, 1], move: [0, 1], atk: [2] } },
            scale: 1, box: [20, 34], hp: 2, dmg: 1, ai: 'flyer', speed: .85, sight: 200, coins: 2, small: true, fps: 4, ghost: true },
  licker: { name: 'Licker', sheet: { kind: 'grid', img: 'enemies/re/licker.png', cols: 14, fw: 90, fh: 50, ax: 47, by: 49, anims: { idle: [0, 1], move: [0, 1], atk: range(2, 9), hurt: [10], dead: [11, 12, 13] } },
            scale: .95, box: [36, 20], hp: 4, dmg: 1, ai: 'leaper', speed: .7, sight: 190, coins: 3, fps: 5 },
  tyrant: { name: 'Tyrant', sheet: { kind: 'grid', img: 'enemies/re/tyrant.png', cols: 14, fw: 83, fh: 58, ax: 45, by: 57, anims: { idle: [0, 1], move: [0, 1], atk: [6, 7, 8, 8], hurt: [9], dead: range(10, 13) } },
            scale: .95, box: [24, 46], hp: 7, dmg: 1, ai: 'shooter', speed: .35, sight: 300, rate: 120, coins: 5, fps: 3, heavy: true, poise: 4 },
  // ---- v108 CC0 monsters (sheets: tools/plat-import-monsters.py) ----
  skel:   { name: 'Skeleton Knight', sheet: MS.skel, scale: .82, box: [22, 44], hp: 5, dmg: 1, ai: 'patrol', bite: { wind: 22, recover: 32, reach: 36 }, speed: .45, chase: 1.05, sight: 190, coins: 3, fps: 9, shield: .45, poise: 2 },
  goblin: { name: 'Goblin Bomber', sheet: MS.goblin, scale: .9, box: [20, 36], hp: 3, dmg: 1, ai: 'shooter', proj: 'gbomb', lob: true, aimAnim: 'throw', aimT: 34, speed: 1.1, sight: 260, rate: 110, coins: 3, fps: 10, small: true },
  shroom: { name: 'Spore Mushroom', sheet: MS.shroom, scale: .85, box: [22, 34], hp: 4, dmg: 1, ai: 'shooter', proj: 'spore', lob: true, aimAnim: 'spit', aimT: 40, speed: .35, sight: 230, rate: 130, coins: 3, fps: 8, small: true, elem: 'poison' },
  eye:    { name: 'Flying Eye', sheet: MS.eye, scale: .85, box: [26, 24], hp: 3, dmg: 1, ai: 'flyer', speed: 1, sight: 220, coins: 2, fps: 12, small: true },
  rat:    { name: 'Plague Rat', sheet: MS.rat, scale: .85, box: [26, 14], hp: 2, dmg: 1, ai: 'patrol', bite: { wind: 14, recover: 26, reach: 22 }, speed: 1.1, chase: 2.1, sight: 170, coins: 1, fps: 14, small: true },
  bat:    { name: 'Vampire Bat', sheet: MS.bat, scale: .7, box: [24, 20], hp: 2, dmg: 1, ai: 'flyer', speed: 1.2, sight: 230, coins: 2, fps: 14, small: true },
  goo:    { name: 'Swamp Goo', sheet: MS.goo, scale: .7, box: [32, 18], hp: 3, dmg: 1, ai: 'leaper', speed: .5, sight: 170, coins: 2, fps: 10, small: true, elem: 'poison' },
  mimic:  { name: 'Mimic', sheet: MS.mimic, scale: .75, box: [28, 28], hp: 7, dmg: 1, ai: 'mimic', bite: { wind: 18, recover: 30, reach: 34 }, speed: .9, chase: 1.7, sight: 220, wake: 74, coins: 12, fps: 12, poise: 3 },
  // v115 Hell Hound: walks → spots you → sprints (fire trail) → "!" crouch → pounce
  hound:  { elem: 'fire', name: 'Hell Hound', sheet: MS.hound, scale: 1.3, box: [44, 28], hp: 4, dmg: 1, ai: 'hound', speed: .55, chase: 2.3, sight: 230, coins: 3, fps: 12, small: true },
  salvador: { name: 'Chainsaw Man', sheet: { kind: 'grid', img: 'enemies/re/salvador.png', cols: 7, fw: 56, fh: 72, ax: 40, by: 71, anims: { idle: [0, 1], move: [0, 1], atk: [2, 3], rev: [4, 5], dead: [6] } },
            scale: .85, box: [26, 34], hp: 6, dmg: 2, ai: 'charger', speed: .5, sight: 230, coins: 5, fps: 6, poise: 3 },
};
/* v121 ink creatures: tougher, faster versions of the world's monsters. Drawn through assets.inkFrame (core.js) with dripping ink;
   they burst into a puff of ink when beaten. */
const inkOf = (base, o) => Object.assign({}, E[base], { ink: true, elem: null, trail: null }, o);
Object.assign(E, {
  inkskel: inkOf('skel', { name: 'Ink Knight', hp: 6, speed: .55, chase: 1.2, shield: .35, coins: 4 }),
  inkeye: inkOf('eye', { name: 'Ink Eye', hp: 3, speed: 1.15, coins: 3 }),
  inkbat: inkOf('bat', { name: 'Ink Bat', hp: 2, speed: 1.35, coins: 2 }),
  inkhound: inkOf('hound', { name: 'Ink Hound', hp: 5, chase: 2.5, coins: 4 }),
});

/* --------------------------------- enemy ---------------------------------
   Every damaging move follows WIND-UP (readable: flash + "!" + pose) → ACTIVE (the only frames
   that hurt) → RECOVERY (open to a counter-attack). A crowd shares 2 attack tokens (game.takeToken)
   so enemies take turns. Being hit puts an enemy in hit-stun (no contact damage, AI paused);
   light enemies are interrupted by any hit, heavy ones only when their poise breaks (stagger). */
const TELE = { bite: 1, crouch: 1, aim: 1, rev: 1, tele: 1 };
/* v94 — HARDER ENEMIES (developer: "too weak"). One place to tune. Telegraph wind-ups ("!") keep their length
   so attacks stay readable — and parryable — but enemies are tougher, see further, move and recover faster,
   attack more often and three may attack at once. Bosses get more HP and shorter rests. */
const TUNE = PLAT.ENEMY_TUNE = { hp: 1.6, armor: 1.3, bossHp: 3.5, speed: 1.25, chase: 1.3, sight: 1.35, cool: .55, rate: .6, wait: .6, recover: .65, shot: 1.3, swoop: 1.25, rest: .6, tokens: 3, bossRest: .7 };
function tuneDef(d) {
  if (d.boss) return Object.assign({}, d, { hp: Math.round(d.hp * TUNE.bossHp) });
  const o = Object.assign({}, d, { hp: Math.max(2, Math.round(d.hp * TUNE.hp)) });
  if (d.armor) o.armor = Math.round(d.armor * TUNE.armor);
  if (d.speed) o.speed = d.speed * TUNE.speed; if (d.chase) o.chase = d.chase * TUNE.chase; if (d.sight) o.sight = d.sight * TUNE.sight;
  if (d.rate) o.rate = Math.round(d.rate * TUNE.rate); if (d.wait) o.wait = Math.round(d.wait * TUNE.wait);
  if (d.bite) o.bite = Object.assign({}, d.bite, { recover: Math.round(d.bite.recover * TUNE.recover) });
  return o;
}
const coolT = n => Math.round(n * TUNE.cool);
class Enemy {
  constructor(g, type, x, y, elite) {
    // the theme's skin (art.js) replaces only the look; AI / HP / damage stay the type's own
    const d = this.def = tuneDef((PLAT.enemyDef ? PLAT.enemyDef(type, g.spec && g.spec.theme) : null) || E[type] || PLAT.BOSSES[type]); this.type = type; this.g = g; this.elite = !!elite && !d.boss;
    if (g.daily && g.daily.mod.id === 'swarm' && !d.boss) { if (d.speed) d.speed *= 1.25; if (d.chase) d.chase *= 1.25; }   // v118 daily rule
    this.sc = d.scale * (this.elite ? 1.15 : 1);
    const geo = g.geom && g.geom[type], k = this.sc / d.scale;
    this.w = Math.round((geo ? geo.w : d.box[0]) * k); this.h = Math.round((geo ? geo.h : d.box[1]) * k); this.cOff = geo ? geo.c / d.scale : 0;
    this.x = x - this.w / 2; this.y = y - this.h; this.home = { x: this.x, y: this.y };
    this.vx = 0; this.vy = 0; this.dir = -1; this.hp = d.hp * (this.elite ? 2 : 1) + (this.elite ? 1 : 0); this.maxHp = this.hp; this.armor = d.armor || 0;
    this.maxPoise = (d.poise || 1) * (this.elite ? 2 : 1); this.poise = this.maxPoise;
    this.t = U.rint(0, 60); this.st = 'idle'; this.stT = 0; this.flash = 0; this.kbT = 0; this.stunT = 0; this.cool = U.rint(10, 40); this.dizzyFor = 80;
    this.lastHit = new Set(); this.dead = false; this.deadT = 0; this.gone = false; this.stuckT = 0; this.lastX = this.x; this.combo = 0;
    this.anim = new PLAT.Anim(g.sheets.get(this.sheetKey()), {});
    this.anim.play('move');
  }
  sheetKey() { return this.type + (this.armorStage != null ? ':' + this.armorStage : ''); }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  /* HURT box (where the player's blows / shots land) ≠ collision body (walls, floors, contact).
     The body is 80 % of the sprite and small enemies are only ~20 px tall, so chest-high shots
     (X's buster, Mia's fan, YOTA's beam) flew over slimes and lickers. The hurt box covers the
     sprite (+HURT_PAD each side) and is never shorter than HURT_MIN, growing upward from the feet. */
  hurtBox() {
    const pad = C.HURT_PAD, h = Math.max(this.h + pad, C.HURT_MIN);
    return { x: this.x - pad, y: this.y + this.h - h, w: this.w + pad * 2, h };
  }
  set(st) { this.st = st; this.stT = 0; }
  seesPlayer(range, dyMax) {
    const p = this.g.player; if (!p || p.dead) return false;
    return Math.abs(p.cx - this.cx) < range && Math.abs(p.feet - this.feet) < (dyMax || 80);
  }
  token() { return this.g.takeToken(this); }
  release() { this.g.dropToken(this); }
  // a hit (or a stagger) cancels a wind-up / attack in progress
  interrupt(next) { if (TELE[this.st] || this.st === 'swoop' || this.st === 'charge') { this.set(next || 'walk'); this.cool = coolT(50); this.blocking = false; this.release(); } }

  update() {
    const d = this.def, g = this.g, p = g.player; this.t++; this.stT++;
    if (this.flash > 0) this.flash--; if (this.cool > 0) this.cool--; if (this.stunT > 0) this.stunT--;
    if (this.dead) { this.deadT++; this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); if (!d.ghost && !this.inhaled) W.moveBody(g.L, this, this.vx *= .9, this.vy); if (this.deadT > 50) this.gone = true; this.anim.update(); return; }
    if (this.inhaled) return;
    if (this.frozenT > 0) { this.frozenT--; this.vx = 0; if (d.ai !== 'flyer') { this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); W.moveBody(g.L, this, 0, this.vy); } return; }   // ❄️ frost orb
    if (this.kbT > 0) { this.kbT--; this.vx *= .86; }
    else if (this.st === 'dizzy') { this.vx *= .7; this.anim.play('idle'); if (this.stT > this.dizzyFor) { this.set('walk'); this.cool = coolT(40); this.dizzyFor = 80; if (p) this.face(U.sign(p.cx - this.cx)); } }
    else this.think(p);
    if (d.ai !== 'flyer') {
      this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL);
      W.moveBody(g.L, this, this.vx, this.vy);
      if (this.y > g.L.ph + 64) { this.fell = true; this.kill({}); this.gone = true; return; }
      // hazards hurt enemies too (knock one into lava!)
      // (killed directly: going through takeHit let a cone / bucket zombie's ARMOUR soak the lava and survive)
      if (W.tilesIn(g.L, this.box(), PLAT.TILE.LIQUID).length) { this.fell = true; this.kill({ dir: 0 }); return; }
      // never walk into a wall forever: no progress for a while → turn around
      if (Math.abs(this.vx) > .1 && this.onGround && Math.abs(this.x - this.lastX) < .05) { if (++this.stuckT > 40) { this.dir = -this.dir; this.stuckT = 0; } } else this.stuckT = 0;
      this.lastX = this.x;
    } else { this.x += this.vx; this.y += this.vy; }
    if (d.trail && this.t % 6 === 0) g.burst(this.cx, this.feet - 4, d.trail, 1, .3);
    if (d.sparkle && this.t % 10 === 0) g.burst(this.cx + U.rnd(-10, 10), this.y + U.rnd(0, 14), '#fff6a0', 1, .2);
    if (this.elite && this.t % 8 === 0) g.burst(this.cx + U.rnd(-this.w / 2, this.w / 2), this.y + U.rnd(0, this.h), '#ff5ad8', 1, .3);
    this.anim.update();
  }
  face(dir) { if (dir) this.dir = dir; }
  walkTurn(L) { if (this.onGround && (this.wall || W.wallAhead(L, this, this.dir) || !W.floorAhead(L, this, this.dir))) { this.dir = -this.dir; return true; } return false; }
  think(p) {
    const d = this.def, g = this.g, L = g.L;
    const toP = p ? U.sign(p.cx - this.cx) || this.dir : this.dir;
    switch (d.ai) {
      case 'patrol': {
        const B = d.bite;
        if (this.st === 'bite') {                          // zombie bite: wind-up → bite → recovery
          const wind = this.elite ? 16 : B.wind;
          this.vx = this.stT > wind && this.stT < wind + 6 && this.elite ? this.dir * 2.6 : 0;
          if (this.stT < wind && this.stT % 6 < 3) this.flash = 2;
          if (this.stT === wind) {
            sfx().swing();
            const hb = { x: this.dir > 0 ? this.cx : this.cx - B.reach, y: this.y + 4, w: B.reach, h: this.h - 8 };
            if (U.overlap(hb, p)) p.hurt(d.dmg, this.cx);
          }
          if (this.stT >= wind + B.recover) {
            if (this.elite && ++this.combo < 2) { this.set('bite'); this.anim.play('atk', wind + 10, true); }
            else { this.combo = 0; this.set('walk'); this.cool = coolT(60); this.release(); }
          }
          break;
        }
        const chasing = d.chase && this.seesPlayer(d.sight, 48);
        if (chasing) this.face(toP);
        const sp = (chasing ? d.chase : d.speed) * (this.elite ? 1.25 : 1);
        if (this.onGround && (this.wall || W.wallAhead(L, this, this.dir) || !W.floorAhead(L, this, this.dir))) { if (!chasing) this.dir = -this.dir; this.vx = 0; }
        else this.vx = this.dir * sp;
        const close = B && p && Math.abs(p.cx - this.cx) < this.w / 2 + B.reach && Math.abs(p.feet - this.feet) < 30 && Math.sign(p.cx - this.cx) === this.dir;
        if (close && this.cool <= 0 && this.token()) { this.set('bite'); this.vx = 0; this.anim.play('atk', (this.elite ? 16 : B.wind) + 10, true); break; }
        this.anim.play('move');
        break;
      }
      case 'hopper': {
        if (this.st === 'crouch') { this.vx = 0; if (this.stT % 6 < 3) this.flash = 2;
          if (this.stT >= 16) { this.face(toP); this.vy = -d.jumpV; this.vx = this.dir * d.jumpX * U.rnd(.85, 1.1); this.set('air'); this.anim.play('hop', 34, true); }
          break; }
        if (this.onGround) {
          this.vx *= .7;
          if (this.st === 'air' && this.stT > 3) {
            this.set('idle'); g.dust(this.cx, this.feet, 3); this.release(); this.cool = d.wait;
            if (this.elite) { g.spawnProj('shock', this.cx + 14, this.feet, 1, { speed: 2.6 }); g.spawnProj('shock', this.cx - 14, this.feet, -1, { speed: 2.6 }); sfx().heavy(); }
          }
          if (this.st === 'air') break;
          this.anim.play('idle');
          if (this.cool <= 0 && this.seesPlayer(d.sight, 70) && this.token()) { this.set('crouch'); this.face(toP); }
          else if (this.stT > d.wait * 2.2) { this.dir = -this.dir; if (W.floorAhead(L, this, this.dir)) { this.vy = -4; this.vx = this.dir * 1.2; this.set('air'); this.anim.play('hop', 26, true); } else this.set('idle'); }
        }
        break;
      }
      case 'coward': {
        const near = this.seesPlayer(d.sight, 90);
        if (near) { this.face(-toP); if (this.onGround && (this.wall || !W.floorAhead(L, this, this.dir))) { this.vy = -6.5; } this.vx = this.dir * d.speed; if (this.onGround && this.t % 40 === 0) this.vy = -4; }
        else this.vx *= .8;
        this.anim.play(this.onGround ? 'idle' : 'hop');
        break;
      }
      case 'flyer': {                                       // ghost: drift → telegraph → swoop at where you were → recover
        if (this.st === 'tele') { this.vx *= .85; this.vy *= .85; this.face(toP); this.anim.play('atk'); if (this.stT % 6 < 3) this.flash = 2;
          if (this.stT >= 26) { const tx = p.cx, ty = p.y + p.h / 2, dx = tx - this.cx, dy = ty - (this.y + this.h / 2), dd = Math.hypot(dx, dy) || 1; this.sw = { vx: dx / dd * 3.4 * TUNE.swoop, vy: dy / dd * 3.4 * TUNE.swoop }; this.set('swoop'); sfx().dash(); }
          break; }
        if (this.st === 'swoop') { this.vx = this.sw.vx; this.vy = this.sw.vy; if (this.t % 2 === 0) g.afterimage(this); if (this.stT >= 34) { if (this.elite && ++this.combo < 2) this.set('tele'); else { this.combo = 0; this.set('recover'); this.release(); this.cool = coolT(100); } } break; }
        if (this.st === 'recover') { this.vx *= .95; this.vy += (this.home.y - this.y) * .002 - this.vy * .04; this.anim.play('move'); if (this.stT > 50) this.set('drift'); break; }
        const hx = this.home.x, hy = this.home.y;
        if (this.seesPlayer(d.sight, 160)) {
          const ty = p.y - 30, dx = p.cx - this.cx, dy = ty - this.y, dd = Math.hypot(dx, dy) || 1;
          this.vx += (dx / dd * d.speed - this.vx) * .04; this.vy += (dy / dd * d.speed - this.vy) * .04; this.face(U.sign(dx));
          if (this.cool <= 0 && dd < 170 && this.token()) this.set('tele');
        } else {
          this.vx += ((hx + Math.sin(this.t / 70) * 48) - this.x) * .002 - this.vx * .02; this.vy += ((hy + Math.sin(this.t / 31) * 14) - this.y) * .004 - this.vy * .03; this.face(U.sign(this.vx) || this.dir);
        }
        this.anim.play('move');
        break;
      }
      case 'mimic': {                                      // v108: sits as a treasure chest → wakes when you come close → chases and bites
        if (this.st === 'idle' || this.st === 'sleep') {
          if (this.st === 'idle') this.set('sleep');
          this.vx = 0; this.sleeping = true; this.anim.play('closed');
          if (p && Math.abs(p.cx - this.cx) < d.wake && Math.abs(p.feet - this.feet) < 60) { this.face(toP); this.wakeUp(); }
          break;
        }
        if (this.st === 'wake') { this.vx = 0; if (this.stT === 22) this.anim.play('transform', 22, true); if (this.stT % 6 < 3) this.flash = 2; if (this.stT >= 44) { this.sleeping = false; this.set('walk'); this.cool = coolT(20); } break; }
        this.sleeping = false;
        d.ai = 'patrol'; this.think(p); d.ai = 'mimic';     // awake: a fast biting patrol
        break;
      }
      case 'hound': {                                      // v115 hell hound
        if (this.st === 'crouch') {
          this.vx = 0; if (this.stT % 6 < 3) this.flash = 2; this.anim.play('idle');
          if (this.stT >= (this.elite ? 12 : 18)) { this.face(toP); this.vy = -5.6; this.vx = this.dir * 5.2; this.set('leap'); this.anim.play('atk', 36, true); sfx().swing(); }
          break;
        }
        if (this.st === 'leap') {
          if (this.t % 3 === 0) g.burst(this.cx - this.dir * 12, this.y + this.h / 2, '#ff7a2a', 1, .5);
          if (this.onGround && this.stT > 4) { if (this.elite && ++this.combo < 2) { this.face(toP); this.set('crouch'); } else { this.combo = 0; this.set('rest'); this.vx = 0; this.release(); this.cool = coolT(70); } }
          break;
        }
        if (this.st === 'rest') { this.vx *= .8; this.anim.play('idle'); if (this.stT > 50 * TUNE.rest) this.set('idle'); break; }
        if (p && this.seesPlayer(d.sight, 70)) {
          this.face(toP);
          const dist = Math.abs(p.cx - this.cx);
          if (this.onGround && dist < 130 && this.cool <= 0 && this.token()) { this.set('crouch'); this.vx = 0; break; }
          if (this.onGround && (!W.floorAhead(L, this, this.dir) || W.wallAhead(L, this, this.dir))) { this.vx = 0; this.anim.play('idle'); break; }
          this.vx = dist < 70 ? 0 : this.dir * d.chase * (this.elite ? 1.2 : 1); this.anim.play(this.vx ? 'run' : 'idle');
          if (this.vx && this.t % 4 === 0) g.burst(this.cx - this.dir * 14, this.feet - 4, '#ff7a2a', 1, .3);
          break;
        }
        this.walkTurn(L); this.vx = this.dir * d.speed; this.anim.play('move');
        break;
      }
      case 'leaper': {
        if (this.st === 'crouch') {
          this.vx = 0; if (this.stT % 6 < 3) this.flash = 2;
          if (this.stT >= (this.elite ? 18 : 24)) { this.vy = -6.2; this.vx = this.dir * 4.3; this.set('leap'); this.anim.play('atk', 40, true); sfx().swing(); }
          break;
        }
        if (this.st === 'leap') { if (this.onGround && this.stT > 4) { if (this.elite && ++this.combo < 2) { this.face(toP); this.set('crouch'); } else { this.combo = 0; this.set('rest'); this.vx = 0; this.release(); this.cool = coolT(60); } } break; }
        if (this.st === 'rest') { this.vx *= .8; this.anim.play('idle'); if (this.stT > 60 * TUNE.rest) this.set('idle'); break; }
        if (this.onGround && this.cool <= 0 && this.seesPlayer(d.sight, 70) && this.token()) { this.face(toP); this.set('crouch'); this.anim.play('idle'); break; }
        this.walkTurn(L);
        this.vx = this.dir * d.speed; this.anim.play('move');
        break;
      }
      case 'shooter': {
        if (this.st === 'aim') {
          this.vx = 0; this.face(toP); if (this.stT % 8 < 4) this.flash = 1;
          const fireAt = d.aimT ? Math.round(d.aimT * .7) : 28;
          if (this.stT === fireAt) {
            const sx = this.cx + this.dir * 18, sy = this.y + 16, a = Math.atan2((p.y + p.h / 2) - sy, Math.abs(p.cx - sx));
            const base = U.clamp(a, -.5, .5), shots = this.elite ? [-.22, 0, .22] : [0];
            if (d.lob) {                                   // v108: arcing throw that lands where the player stands (goblin bombs, spores)
              const dx = p.cx - sx, tFl = 46;
              for (const o of shots) g.spawnProj(d.proj, sx, sy, this.dir, { vx: dx / tFl * (1 + o), vy: -5.4 + o * 3, grav: .24 });
            } else for (const o of shots) g.spawnProj(d.proj || 'fireball', sx, sy, this.dir, { vx: this.dir * Math.cos(base + o) * 3.2 * TUNE.shot, vy: Math.sin(base + o) * 3.2 * TUNE.shot });
            sfx().shoot();
          }
          if (this.stT > (d.aimT || 48)) { this.set('walk'); this.release(); this.cool = d.rate; }
          break;
        }
        const sees = this.seesPlayer(d.sight, 140) && W.clearLine(L, this.cx, this.y + 14, p.cx, p.y + p.h / 2);
        if (sees) {
          this.face(toP);
          // keep its distance: back off when you get close (if there is floor behind)
          const tooClose = Math.abs(p.cx - this.cx) < 90 && Math.abs(p.feet - this.feet) < 40;
          if (tooClose && this.onGround && W.floorAhead(L, this, -this.dir) && !W.wallAhead(L, this, -this.dir)) { this.vx = -this.dir * .7; this.anim.play('move'); }
          else { this.vx = 0; this.anim.play('idle'); }
          if (this.cool <= 0 && this.token()) { this.set('aim'); this.anim.play(d.aimAnim && this.anim.sheet.anims[d.aimAnim] ? d.aimAnim : 'atk', d.aimT || 48, true); }
        } else { this.walkTurn(L); this.vx = this.dir * d.speed; this.anim.play('move'); }
        break;
      }
      case 'charger': {
        if (this.st === 'rev') { this.vx = 0; this.anim.play('rev'); if (this.stT % 6 < 3) this.flash = 2; if (this.stT % 4 === 0) g.burst(this.cx + this.dir * 14, this.y + 12, '#ffd060', 1, 1); if (this.stT % 10 === 0) sfx().charge(); if (this.stT > 36) { this.set('charge'); } break; }
        if (this.st === 'charge') {
          this.anim.play('atk'); this.vx = this.dir * 4.4; this.blocking = true;
          if (this.stT % 3 === 0) g.dust(this.cx - this.dir * 10, this.feet, 1);
          if (this.wall || !W.floorAhead(L, this, this.dir) || this.stT > 100) { this.blocking = false; this.vx = 0; this.set('dizzy'); this.release(); if (this.wall) { g.shake(3); sfx().clang(); } g.text(this.cx, this.y - 8, 'มึน!', '#ffe08a', 40); }
          break;
        }
        this.blocking = false;
        if (this.st === 'dizzy') { this.vx = 0; this.anim.play('idle'); if (this.stT > this.dizzyFor) { this.set('walk'); this.cool = coolT(60); this.dizzyFor = 80; } break; }
        if (this.onGround && this.cool <= 0 && this.seesPlayer(d.sight, 40) && this.token()) { this.face(toP); this.set('rev'); break; }
        this.walkTurn(L);
        this.vx = this.dir * d.speed; this.anim.play('move');
        break;
      }
    }
  }
  wakeUp() {                                             // mimic: the lid flies open
    if (this.st === 'wake' || !this.sleeping) return;
    this.set('wake'); this.anim.play('open', 22, true); this.sleeping = true; this.g.text(this.cx, this.y - 12, 'MIMIC!', '#ff6a8a', 50, true); sfx().heavy(); this.g.shake(2);
  }
  // returns true if the hit counted (for hit-stop / energy)
  /* DAMAGE PROCESSING (the only place an enemy's HP / armour changes).
     Returns true if the blow counted. When it does not, this.reject says why
     ('dead' · 'same-swing' · 'blocked' · 'immune') — game.hit() shows it in the debug overlay
     and gives the player clear feedback for 'blocked' / 'immune'. */
  takeHit(dmg, o) {
    this.reject = null;
    if (this.dead || this.inhaled) { this.reject = 'dead'; return false; }
    if (o.id != null && o.id !== -1) { if (this.lastHit.has(o.id)) { this.reject = 'same-swing'; return false; } this.lastHit.add(o.id); if (this.lastHit.size > 40) this.lastHit = new Set([...this.lastHit].slice(-20)); }
    const g = this.g, d = this.def;
    // frontal block (charging chainsaw) — jump over it and hit its back, or wait for the crash
    if (this.blocking && o.dir && U.sign(o.dir) === -this.dir && !o.pogo) { this.reject = 'blocked'; sfx().clang(); g.burst(this.cx + this.dir * 12, this.y + 14, '#ffffff', 6, 2); g.text(this.cx, this.y - 6, 'กัน!', '#d0d8e0', 26); return false; }
    if (d.shield && !o.pogo && !o.unblock && o.dir && U.sign(o.dir) === -this.dir && this.st !== 'bite' && this.st !== 'dizzy' && this.stunT <= 0 && Math.random() < d.shield) {
      this.reject = 'blocked'; this.anim.play('shield', 16, true); this.stunT = 10; sfx().clang(); g.burst(this.cx + this.dir * 10, this.y + 14, '#e0e8ff', 6, 2); g.text(this.cx, this.y - 6, 'โล่!', '#d0d8e0', 26); return false;   // v108 skeleton knight: raises its shield
    }
    if (this.sleeping) this.wakeUp();                                    // v108 mimic: hitting the "chest" wakes it
    if (this.st === 'dizzy' || this.vulnerable || this.frozenT > 0) dmg *= 2;
    this.lastDmg = 0;
    if (this.armor > 0) {
      const ad = d.heavyArmor && !o.pogo && !o.body ? Math.max(1, dmg - 1) : dmg;
      this.armor = Math.max(0, this.armor - ad); sfx().clang(); g.burst(this.cx, this.y + 4, '#d8dde8', 6, 2); this.flash = 6;
      g.text(this.cx, this.y - 4, '🛡' + ad, '#c8d0e0', 28);          // armour damage is shown too, so a hit never looks like it "did nothing"
      this.lastDmg = ad; this.updateArmorSheet();
      this.kbT = 6; this.stunT = 8; this.vx = (o.dir || 0) * 1.2;
      return true;
    }
    this.hp -= dmg; this.flash = 8; this.lastDmg = dmg;
    if (this.champion) g.bossHit(this);                                 // v116 endless boss bar
    g.text(this.cx, this.y - 4, String(dmg), dmg >= 4 ? '#ffd84a' : '#ffffff', 32);
    if (this.hp <= 0) { this.kill(o); return true; }
    this.poise -= dmg;
    // knock-back = away from the attacker (a spin / burst used to throw an enemy BEHIND the hero through the hero, toward where it faces)
    const dirKb = (o.at != null ? U.sign(this.cx - o.at) : o.from && o.from.cx != null && !o.proj ? U.sign(this.cx - o.from.cx) : 0) || o.dir || 1;
    if (!d.heavy && !d.boss) {                        // light enemies: every hit interrupts and knocks back
      this.interrupt(); this.stunT = 16;
      if (o.kb) { this.kbT = 12; this.vx = dirKb * o.kb * .7; if (this.onGround || o.up) this.vy = o.up ? -5 : -2.4; }
      if (this.anim.sheet.anims.hurt) this.anim.play('hurt', 12, true);
    } else {
      this.stunT = 6;
      if (this.poise <= 0 && !d.boss) { this.poise = this.maxPoise; this.interrupt('dizzy'); this.set('dizzy'); this.kbT = 10; this.vx = dirKb * 1.5; g.text(this.cx, this.y - 10, 'เสียหลัก!', '#8aff8a', 40); }
    }
    return true;
  }
  /* v94 PARRY: the player deflected this enemy's attack. A normal enemy is knocked off balance (dizzy: takes ×2
     damage, harmless) — longer after a PERFECT parry; an elite recovers faster. A boss loses a chunk of poise
     instead (enough parries → stagger). */
  parried(perfect, fromX) {
    const g = this.g; if (this.dead) return;
    this.release(); this.blocking = false;
    if (this.boss) { this.poise -= perfect ? 10 : 6; this.flash = 8; if (this.noteParry) this.noteParry(); if (this.breakPoise) this.breakPoise(); return; }
    this.interrupt('dizzy'); this.set('dizzy'); this.dizzyFor = (perfect ? 110 : 75) * (this.elite ? .65 : 1);
    this.suckUntil = g.frame + this.dizzyFor;                                   // v100 Kirby: inhalable while it reels
    this.kbT = 8; this.vx = U.sign(this.cx - (fromX != null ? fromX : g.player.cx)) * 2.2; this.flash = 8;
    g.text(this.cx, this.y - 10, perfect ? 'เสียหลัก! ×2' : 'เสียหลัก!', '#8aff8a', 40);
  }
  updateArmorSheet() {
    const d = this.def;
    // a skin without dented states (skeleton in clothes) keeps its look until the armour breaks, then swaps once
    if (!d.states && d.afterSheet) {
      if (this.armor > 0 || this.armorStage === 'off') return;
      this.armorStage = 'off'; const key = this.sheetKey();
      if (!this.g.sheets.has(key)) this.g.sheets.set(key, new PLAT.Sheet(d.afterSheet));
      const pose = this.anim.pose; this.anim = new PLAT.Anim(this.g.sheets.get(key), {}); this.anim.play(pose || 'move');
      this.g.text(this.cx, this.y - 10, 'เกราะแตก!', '#ffe08a', 40); sfx().break(); this.interrupt(); this.stunT = 30;
      return;
    }
    if (!d.states) return;
    const stage = this.armor <= 0 ? 'off' : Math.min(d.states.length - 1, Math.floor((1 - this.armor / d.armor) * d.states.length));
    if (stage === this.armorStage) return;
    this.armorStage = stage;
    const key = this.sheetKey();
    if (!this.g.sheets.has(key)) {
      const img = stage === 'off' ? d.after : d.states[stage];
      const def = Object.assign({}, d.sheet, { img }); if (stage === 'off') Object.assign(def, { fw: 51, fh: 59, by: 51 });
      this.g.sheets.set(key, new PLAT.Sheet(def));
    }
    const pose = this.anim.pose; this.anim = new PLAT.Anim(this.g.sheets.get(key), {}); this.anim.play(pose || 'move');
    if (stage === 'off') { this.g.text(this.cx, this.y - 10, 'เกราะแตก!', '#ffe08a', 40); sfx().break(); this.interrupt(); this.stunT = 30; }
  }
  kill(o) {
    if (this.dead) return;
    const g = this.g, d = this.def;
    this.dead = true; this.deadT = 0; this.vx = (o && o.dir || 0) * 2; this.vy = -3; this.blocking = false; this.release();
    if (this.anim.sheet.anims.dead) this.anim.play('dead', 40, true);
    else if (PLAT.FXDEF.puff) g.fx('puff', this.cx, this.y + this.h / 2, { scale: Math.max(.7, this.h / 40) });   // v108: swamp creatures pop
    sfx().kill(); g.burst(this.cx, this.y + this.h / 2, d.ghost ? '#c8d0ff' : '#ffffff', 14, 2.6);
    if (d.ink) { g.fx('void', this.cx, this.y + this.h / 2, { scale: Math.max(.8, this.h / 44) }); g.burst(this.cx, this.y + this.h / 2, '#6a3aba', 10, 2.2); }
    g.onEnemyKilled(this);
  }
  draw(ctx) {
    const d = this.def; if (this.inhaled) return;
    if (this.sleeping && this.st === 'sleep' && PLAT.drawIcon && PLAT.ICON_CELL) {     // v108 mimic: looks EXACTLY like a treasure chest… except for a twitch now and then
      const tw = this.t % 240 < 10 ? Math.sin(this.t * 1.7) * 1.5 : 0;
      if (PLAT.drawIcon(ctx, PLAT.ICON_CELL.chest, this.cx + tw, this.feet - 13, 26)) return;
    }
    let alpha = 1;
    if (this.dead && !this.anim.sheet.anims.dead) alpha = Math.max(0, 1 - this.deadT / 30);
    else if (this.dead && this.deadT > 34) alpha = Math.max(0, 1 - (this.deadT - 34) / 16);
    if (d.ghost) alpha *= .72 + Math.sin(this.t / 9) * .2;
    const o = { alpha, flash: this.flash > 0 && this.flash % 2 ? .9 : this.frozenT > 0 ? .55 : 0, sy: 1, sx: 1 };
    if (d.ink) { o.ink = true; if (!this.dead && this.t % 9 === 0) this.g.parts.push({ x: this.cx + U.rnd(-this.w / 2, this.w / 2), y: this.y + this.h * U.rnd(.3, .9), vx: 0, vy: .6, grav: .08, life: 26, col: this.t % 18 ? '#3a1a6a' : '#a07aff', size: 3, fade: true }); }
    if (this.st === 'crouch') { o.sy = .82; o.sx = 1.12; }
    if (this.st === 'dizzy' && this.t % 20 < 10) o.rot = .06;
    const face = -this.dir;    // sheets face left
    const fr = this.anim.frame(), x = this.cx - this.cOff * this.sc * face;
    if (d.ink && !this.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .28 + Math.sin(this.t / 7) * .1; PLAT.drawFrame(ctx, fr, x, this.feet + 1, face, this.sc * 1.08, { ink: true }); ctx.restore(); }   // v121 ink glow
    if (this.elite && !this.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + Math.sin(this.t / 6) * .15; PLAT.drawFrame(ctx, fr, x, this.feet + 1, face, this.sc * 1.06, { alpha: 1 }); ctx.restore(); }
    if (!PLAT.drawFrame(ctx, fr, x, this.feet + (d.ghost ? Math.sin(this.t / 14) * 3 : 0), face, this.sc, o)) { ctx.fillStyle = '#c33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.st === 'dizzy') this.g.drawStars(ctx, this.cx, this.y - 6, this.t);
    // wind-up warning above the head
    if (!this.dead && TELE[this.st] && this.st !== 'charge') { ctx.font = '800 14px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000a'; ctx.strokeText('!', this.cx, this.y - 8); ctx.fillStyle = this.t % 8 < 4 ? '#ff4a4a' : '#ffd84a'; ctx.fillText('!', this.cx, this.y - 8); }
    if (this.elite && !this.dead) { ctx.font = '800 10px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = this.champion ? '#ffd84a' : '#ff8ae8'; ctx.fillText(this.champion ? '👑 BOSS LV ' + this.champN : '★ ELITE', this.cx, this.y - (TELE[this.st] ? 22 : 8)); }
    if (this.armor > 0 && d.armor && !this.dead) { const w = 22, f = this.armor / d.armor; ctx.fillStyle = '#0008'; ctx.fillRect(this.cx - w / 2, this.y - 8, w, 3); ctx.fillStyle = '#c8d0e0'; ctx.fillRect(this.cx - w / 2, this.y - 8, w * f, 3); }
  }
}

/* ---------------------------------- bosses ----------------------------------
   Each boss: multi-phase pattern loop with readable telegraphs and a punish window. */
PLAT.BOSSES = {
  aqua: { elem: 'ice', name: 'AQUA SPIRIT', th: 'วิญญาณวารี', boss: true, hp: 34, dmg: 1, poise: 9, scale: 1.15, box: [34, 56],
    sheet: { kind: 'grid', img: 'bosses/aqua/boss.png', cols: 6, fw: 100, fh: 100, ax: 50, by: 98, anims: { idle: [0, 1, 2, 3], move: [0, 1, 2, 3], atk: [4], hurt: [5] } }, fps: 6, heavy: true },
  garg: { elem: 'shock', name: 'GARGANTUAR', th: 'การ์แกนทัวร์ ยักษ์เสาไฟฟ้า', boss: true, hp: 50, dmg: 1, poise: 12, scale: .95, box: [42, 70],
    sheet: { kind: 'grid', img: 'enemies/pvz/garg.png', cols: 10, fw: 126.8, fh: 127.6, ax: 80.5, by: 99,
      anims: { idle: row(0, 10), move: row(1, 9), raise: [18, 19, 20, 21], smash: range(22, 29), stuck: [29], dead: range(40, 48) } }, fps: 8, heavy: true },
  dragon: { elem: 'fire', name: 'BLACK DRAGON', th: 'มังกรทมิฬ เปลวนรก', boss: true, hp: 72, dmg: 1, poise: 16, scale: 1.2, box: [112, 82],
    sheet: { kind: 'grid', img: 'bosses/dragon/blackdragon.png', cols: 37, fw: 246, fh: 134, ax: 128, by: 134,
      anims: { idle: range(0, 12), breath: range(13, 19), hurt: [20, 21, 22, 23], dead: range(24, 28), fly: range(29, 36) } }, fps: 8, heavy: true },
  // v114 WORLD 4 BOSS — Evil Wizard 2 → (50 % HP) transforms into Evil Wizard 3 (LuizMelo, CC0; monster-sheets.js)
  wizard: { elem: 'poison', name: 'MARSH WARLOCK', th: 'จอมเวทหนองพิษ', boss: true, hp: 64, dmg: 1, poise: 14, scale: .95, box: [30, 60],
    sheet: MS.wiz2, sheet2: MS.wiz3, scale2: 1.55, proj: 'wbolt', minions: ['bat', 'goo'], fps: 10, heavy: true },
  // v115 WORLD 5 BOSSES — from the CC0 "Bosses" sprite sheet (public/bosses/snail, public/bosses/serpent)
  snail: { elem: 'fire', name: 'SNAIL TANK', th: 'หอยทากรถถัง', boss: true, hp: 56, dmg: 1, poise: 12, scale: 2.6, box: [84, 60], proj: 'cball',
    sheet: MS.snail, fps: 6, heavy: true },
  serpent: { elem: 'fire', name: 'HORNED SERPENT', th: 'อสรพิษเขาเดียว', boss: true, hp: 66, dmg: 1, poise: 14, scale: 2.2, box: Object.assign([52, 40], { fixed: true }), proj: 'bubble',
    sheet: { kind: 'grid', img: 'bosses/serpent/head0.png', cols: 1, fw: 30, fh: 22, ax: 15, by: 22, anims: { idle: [0], move: [0], fly: [0], hurt: [0] } },
    imgs: ['bosses/serpent/head1.png', 'bosses/serpent/head2.png', 'bosses/serpent/body.png', 'bosses/serpent/dead.png', 'bosses/serpent/fin1.png', 'bosses/serpent/fin2.png', 'bosses/serpent/fin3.png', 'bosses/serpent/fin4.png'],
    fps: 6, heavy: true },
  // v121 FINAL BOSS (6-2) — the Nameless Scribe: Evil Wizard 3 (LuizMelo, CC0) drawn in ink. He fights with the stolen names
  // of the five lantern keepers — every attack is one of theirs, called out by name.
  scribe: { name: 'THE NAMELESS SCRIBE', th: 'ผู้จารึกไร้นาม', boss: true, hp: 84, dmg: 1, poise: 16, scale: 1.6, box: [30, 66], ink: true,
    sheet: MS.wiz3, proj: 'wbolt', projs: ['wave', 'shock', 'fireball', 'cball', 'rock'], minions: ['inkbat', 'inkskel'], fps: 10, heavy: true },
};

class Boss extends Enemy {
  constructor(g, type, x, y) { super(g, type, x, y); this.boss = true; this.phase = 1; this.set('intro'); this.anim.play('idle'); this.pat = 0; }
  get phase2() { return this.hp <= this.maxHp * .5; }
  update() {
    const g = this.g; this.t++; this.stT++;
    if (this.flash > 0) this.flash--;
    if (this.dead) { this.deadT++; if (this.deadT % 8 === 0 && this.deadT < 90) { g.fx('boom', this.cx + U.rnd(-this.w / 2, this.w / 2), this.y + U.rnd(0, this.h), { scale: 1.3 }); sfx().boom(); g.shake(4); } if (this.flying) { this.vy += .2; this.y = Math.min(this.y + this.vy, this.groundY - this.h); } this.anim.update(); if (this.deadT > 120) this.gone = true; return; }
    if (!this.groundY) this.groundY = this.feet;
    if (this.stunT > 0) this.stunT--;
    if (this.frozenT > 0) { this.frozenT--; this.vx = 0; this.anim.update(); return; }   // ❄️ frost orb (bosses: 1 s)
    const before = this.phase; this.phase = this.hp <= this.maxHp * .25 ? 3 : this.phase2 ? 2 : 1;
    if (this.phase !== before) {
      // PHASE CHANGE: a readable pause — roar, blast the player back (no damage), clear the field, then new patterns
      g.text(this.cx, this.y - 20, this.phase === 2 ? 'โกรธแล้ว!!' : 'บ้าคลั่ง!!!', '#ff4a4a', 80, true); sfx().roar(); g.shake(6); g.clearHostile();
      const p = g.player; if (p && !p.dead) { p.vx = (p.cx < this.cx ? -1 : 1) * 5; p.vy = -4; p.endAct(); }   // endAct (not act = null): a looping skill effect must be cleaned up
      this.poise = this.maxPoise; this.prevSt = null; this.set('phase'); this.vulnerable = false;
      if (this.flying) { this.passes = 0; }
    }
    if (this.st === 'phase') { this.vx = 0; this.anim.play(this.flying ? 'fly' : 'idle'); if (this.flying) this.y = Math.min(this.y + 2, this.groundY - this.h); if (this.t % 4 === 0) g.burst(this.cx + U.rnd(-this.w / 2, this.w / 2), this.y + U.rnd(0, this.h), '#ff4a4a', 1, 2); if (this.stT > 60) { if (this.flying && this.y + this.h < this.groundY - 2) this.set('land'); else { this.flying = false; this.set('move'); } } }
    else if (this.st === 'stagger') { this.vx = 0; this.vulnerable = true; this.anim.play(this.anim.sheet.anims.hurt ? 'hurt' : 'idle'); if (this.stT > 80) { this.vulnerable = false; this.set('move'); } }
    else { this.sense(); this[this.type](); }                                   // v117: the boss brain watches you first
    if (!this.flying) { this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); W.moveBody(g.L, this, this.vx, this.vy); }
    this.anim.update();
  }
  pick(list) { const n = list[this.pat++ % list.length]; this.set(n); return n; }
  intro(name) { if (this.stT === 1) { PLAT.sfx.roar(); this.g.shake(5); this.g.bossIntro(this); } if (this.stT > 80) this.set('move'); }
  arena() { return this.g.L.arena || { x0: T, x1: this.g.L.pw - T }; }

  /* ---------------- v117 BOSS BRAIN (shared) ----------------
     Every boss watches you all fight long: where you stand (ledge / ground / behind it / far away), whether you stand
     still or jump a lot, how often you jump over it, parry it or land hits in a row — and it LEARNS which of its own
     attacks connect (used more) and which you dodge (used less). Each boss uses this in its own way (see each one). */
  sense() {
    const g = this.g, p = g.player;
    const m = this.mind || (this.mind = { hit: {}, miss: {}, air: 0, still: 0, above: 0, far: 0, near: 0, behind: 0, streak: 0, streakT: 0, overs: 0, parries: 0, php: p ? p.hp : 0, side: 0, vx: 0, last: null, landed: false, said: -999 });
    if (!p || p.dead) return m;
    m.vx += (p.vx - m.vx) * .15;
    m.air += ((p.onGround ? 0 : 1) - m.air) * .03;
    m.still = Math.abs(p.vx) < .4 && p.onGround ? m.still + 1 : 0;
    const dx = p.cx - this.cx, dist = Math.abs(dx);
    m.above = p.onGround && p.feet < (this.groundY || this.feet) - 48 ? m.above + 1 : Math.max(0, m.above - 2);
    m.far = dist > 230 ? m.far + 1 : 0; m.near = dist < 90 ? m.near + 1 : 0;
    m.behind = U.sign(dx) === -this.dir && dist < 170 ? m.behind + 1 : 0;
    const side = U.sign(dx) || m.side; if (m.side && side !== m.side && !p.onGround && dist < 110) m.overs++; m.side = side;
    if (p.hp < m.php && m.last && !m.landed) { m.hit[m.last] = (m.hit[m.last] || 0) + 1; m.landed = true; }
    m.php = p.hp;
    if (m.streakT > 0) m.streakT--; else m.streak = 0;
    return m;
  }
  noteHit() { const m = this.mind; if (m) { m.streak++; m.streakT = 100; } }
  noteParry() { const m = this.mind; if (m) m.parries++; }
  // a weighted pick over [name, weight] — weights grow for attacks that hit you, shrink for ones you keep dodging
  choose(opts) {
    const m = this.mind || this.sense();
    if (m.last && !m.landed) m.miss[m.last] = (m.miss[m.last] || 0) + 1;
    const W = opts.filter(o => o[1] > 0).map(([n, w]) => [n, U.clamp(w * (1 + .6 * (m.hit[n] || 0)) / (1 + .3 * (m.miss[n] || 0)), w * .25, w * 4) * (n === m.last ? .35 : 1)]);
    let t = W.reduce((a, b) => a + b[1], 0) * Math.random(), pick = W.length ? W[0][0] : 'move';
    for (const [n, w] of W) { t -= w; if (t <= 0) { pick = n; break; } }
    m.last = pick; m.landed = false; this.pat++;
    return pick;
  }
  // a short "it read you" line above the boss (never spammy)
  think(text) { const m = this.mind; if (!m || this.t - m.said < 200) return; m.said = this.t; this.g.text(this.cx, this.y - 34, text, '#ffb0ff', 70, true); }
  // where you will be when a shot fired now (speed px/frame) reaches you
  lead(sx, speed, k) {
    const p = this.g.player, A = this.arena(), m = this.mind || {}; const t = Math.min(70, Math.abs(p.cx - sx) / Math.max(.5, speed));
    return U.clamp(p.cx + (m.vx || 0) * t * (k == null ? .85 : k), A.x0 + 12, A.x1 - 12);
  }
  // an arcing throw from (sx, sy) that lands on (tx, ty) after `t` frames under gravity `gr`
  arc(sx, sy, tx, ty, t, gr) { return { vx: (tx - sx) / t, vy: (ty - sy - .5 * gr * t * t) / t, grav: gr }; }

  /* AQUA SPIRIT (1-3) — "the evasive one": keeps its distance, punishes standing on ledges / standing still with rain,
     warps away when you corner it or land 3 hits in a row, times a second wave for when you land, and (phase 2)
     raises geysers where you are RUNNING TO. */
  aqua() {
    const g = this.g, p = g.player, A = this.arena(), sp = this.phase >= 2 ? 1.5 : 1, toP = U.sign(p.cx - this.cx) || this.dir, m = this.mind, ph2 = this.phase >= 2;
    this.vulnerable = false;
    if (m.streak >= 3 && (this.st === 'move' || this.st === 'rest')) { m.streak = 0; this.think('หลบ!'); this.set('warp'); }
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move': {
        this.face(toP); const want = p.cx - toP * 150; this.vx = U.clamp((want - this.cx) * .02, -1.3, 1.3) * sp; this.anim.play('move');
        if (this.x < A.x0 + 4 && this.vx < 0 || this.x + this.w > A.x1 - 4 && this.vx > 0) this.vx = 0;
        if (this.stT > (ph2 ? 60 : 95)) {
          const ledge = m.above > 40, camp = m.still > 50, airy = m.air > .45, corner = (this.x < A.x0 + 60 || this.x + this.w > A.x1 - 60) && Math.abs(p.cx - this.cx) < 140;
          const n = this.choose([['wave', ledge ? .4 : 3], ['rain', 1.4 + (ledge ? 3 : 0) + (camp ? 2 : 0)], ['warp', .7 + (corner ? 4 : 0)], ['wave2', ph2 ? 2 + (airy ? 2 : 0) : airy ? 1 : 0], ['tide', ph2 ? 1.6 + (ledge ? 1 : 0) : .5]]);
          if (n === 'rain' && ledge) this.think('ปีนหนีไม่พ้นหรอก!'); else if (n === 'rain' && camp) this.think('ยืนนิ่งเหรอ?'); else if (n === 'warp' && corner) this.think('ไม่ยอมจนมุมหรอก');
          this.set(n);
        }
        break;
      }
      case 'wave': case 'wave2':
        this.vx = 0; this.face(toP); this.anim.play(this.stT < 24 ? 'idle' : 'atk'); if (this.stT < 24 && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === 24) { g.spawnProj('wave', this.cx + this.dir * 20, this.feet, this.dir, { speed: 2.8 * sp }); sfx().big(); if (this.st === 'wave2' || this.phase >= 3) g.spawnProj('wave', this.cx - this.dir * 20, this.feet, -this.dir, { speed: 2.4 * sp }); }
        if (this.stT === 46 && m.air > .35) { this.face(U.sign(p.cx - this.cx) || this.dir); g.spawnProj('wave', this.cx + this.dir * 20, this.feet, this.dir, { speed: 3.2 * sp }); sfx().big(); }   // timed for your landing
        if (this.stT > 70) this.set('rest');
        break;
      case 'rain': {
        this.vx = 0; this.anim.play('atk');
        const n = ph2 ? 9 : 6;
        if (this.stT === 10) { g.text(this.cx, this.y - 14, 'ฝนวารี!', '#7ad8ff', 50); sfx().big(); }
        if (this.stT >= 16 && this.stT < 16 + n * 8 && (this.stT - 16) % 8 === 0) {
          const i = (this.stT - 16) / 8, base = i % 2 ? this.lead(p.cx, 0.01, 0) + (m.vx || 0) * 40 : p.cx;          // every other drop falls where you are heading
          const x = U.clamp(base + U.rnd(-70, 70), A.x0 + 10, A.x1 - 10); g.warn(x, g.floorBelow(x, p.y), 40, () => g.spawnProj('drop', x, g.cam.y - 10, 0, { vy: 1 }));
        }
        if (this.stT > 30 + n * 8) this.set('rest');
        break;
      }
      case 'tide': {                                      // geysers burst up under where you are running to
        this.vx = 0; this.anim.play('atk');
        if (this.stT === 4) { g.text(this.cx, this.y - 14, 'น้ำพุ!', '#7ad8ff', 40); sfx().big(); }
        if (this.stT === 8 || this.stT === 26 || this.stT === 44) {
          const x = U.clamp(p.cx + (m.vx || 0) * 34, A.x0 + 14, A.x1 - 14), fl = g.floorBelow(x, p.y);
          g.warn(x, fl, 30, () => { for (let i = 0; i < 3; i++) g.spawnProj('drop', x + (i - 1) * 9, fl - 6, 0, { vy: -8.5 - i * .8, grav: .3 }); sfx().shoot(); });
        }
        if (this.stT > 70) this.set('rest');
        break;
      }
      case 'warp':
        this.vx = 0;
        if (this.stT < 30) this.alpha = 1 - this.stT / 30;
        else if (this.stT === 30) { g.fx('splash', this.cx, this.y + this.h / 2, { scale: 1.3 }); const left = p.cx > (A.x0 + A.x1) / 2; this.x = (left ? A.x0 + 40 : A.x1 - 40) - this.w / 2; this.alpha = 0; g.fx('splash', this.cx, this.y + this.h / 2, { scale: 1.3 }); }
        else if (this.stT < 56) this.alpha = (this.stT - 30) / 26;
        else { this.alpha = 1; this.set(ph2 ? 'wave2' : 'wave'); }
        break;
      case 'rest': this.vx = 0; this.anim.play('idle'); this.vulnerable = true; if (this.stT > (ph2 ? 30 : 50) * TUNE.bossRest) this.set('move'); break;
    }
  }
  /* GARGANTUAR (2-3) — "the relentless brute": closes in and smashes; if you keep AWAY it leaps onto where you will be;
     if you hide on a ledge it rips up rocks and throws them at you; jump over it twice and it learns — the next jump-over
     gets swatted out of the air. */
  garg() {
    const g = this.g, p = g.player, toP = U.sign(p.cx - this.cx) || this.dir, fast = this.phase >= 2, m = this.mind, A = this.arena();
    this.vulnerable = false;
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move': {
        this.face(toP); this.vx = this.dir * (fast ? 1.05 : .7); this.anim.play('move');
        const dist = Math.abs(p.cx - this.cx);
        if (m.overs >= 2 && !p.onGround && dist < 100) { m.overs = 0; this.think('อ่านทางแล้ว!'); this.set('swat'); break; }
        if (m.far > (fast ? 60 : 100) || m.above > 70) {
          m.far = 0; const n = this.choose([['leap', m.above > 40 ? 1 : 3], ['throw', m.above > 40 ? 3.5 : 1.2]]);
          if (n === 'throw' && m.above > 40) this.think('ลงมานี่!'); else if (n === 'leap') this.think('หนีไม่พ้น!');
          this.set(n); break;
        }
        if (dist < 120 || this.stT > 170) { this.set('raise'); g.text(this.cx, this.y - 16, '⚠ ยกเสา!', '#ffd060', 40); }
        break;
      }
      case 'raise': this.vx = 0; this.anim.play('raise', fast ? 26 : 36); if (this.stT % 6 < 3) this.flash = 2; if (this.stT >= (fast ? 26 : 36)) { this.set('smash'); this.anim.play('smash', 32, true); } break;
      case 'smash':
        this.vx = 0;
        if (this.stT === 12) {
          sfx().boom(); g.shake(8); g.hitstop(3);
          const hb = { x: this.dir > 0 ? this.cx : this.cx - 96, y: this.feet - 70, w: 96, h: 70 };
          if (U.overlap(hb, p)) p.hurt(2, this.cx, { elem: 'shock' });
          g.spawnProj('shock', this.cx + this.dir * 70, this.feet, this.dir, {}); g.spawnProj('shock', this.cx - this.dir * 10, this.feet, -this.dir, {});
          g.fxGround('rupture', this.cx + this.dir * 60, this.feet, { scale: 1.3 });
          if (fast) { for (let i = 0; i < (this.phase >= 3 ? 7 : 5); i++) { const x = i < 2 ? U.clamp(p.cx + (m.vx || 0) * (30 + i * 20), A.x0 + 16, A.x1 - 16) : U.rnd(A.x0 + 16, A.x1 - 16); g.warn(x, g.floorBelow(x, p.y), 46 + i * 9, () => g.spawnProj('rock', x, g.cam.y - 10, 0, {})); } }
        }
        if (this.stT >= 32) { this.set('stuck'); g.text(this.cx, this.y - 16, 'เสาติดพื้น! โจมตีเลย!', '#8aff8a', 50); }
        break;
      case 'stuck': this.vx = 0; this.anim.play('stuck'); this.vulnerable = true; if (this.stT > (this.phase >= 3 ? 46 : 70)) { this.set(fast && !this.double ? 'raise' : 'move'); this.double = fast && !this.double; } break;
      case 'leap': {                                       // crouch → a huge jump that lands where you are going → shockwaves
        if (this.stT < 22) { this.vx = 0; this.anim.play('raise', 22); if (this.stT % 6 < 3) this.flash = 2; break; }
        if (this.stT === 22) { const tx = this.lead(this.cx, 5, 1.1); this.leapX = tx; this.vy = -10.5; this.vx = (tx - this.cx) / 42; g.warn(tx, g.floorBelow(tx, this.y), 40); sfx().heavy(); }
        this.anim.play('smash');
        if (this.stT > 26 && this.onGround) {
          this.vx = 0; sfx().boom(); g.shake(9); g.hitstop(3); g.fxGround('rupture', this.cx, this.feet, { scale: 1.7 }); g.fxGround('ldust', this.cx, this.feet, { scale: 1.6 });
          g.spawnProj('shock', this.cx + 40, this.feet, 1, {}); g.spawnProj('shock', this.cx - 40, this.feet, -1, {});
          if (U.overlap({ x: this.x - 20, y: this.feet - 60, w: this.w + 40, h: 60 }, p)) p.hurt(2, this.cx, { elem: 'shock' });
          this.set('stuck'); g.text(this.cx, this.y - 16, 'ลงพื้นแรง! โจมตีเลย!', '#8aff8a', 50);
        }
        if (this.stT > 160) this.set('move');
        break;
      }
      case 'throw': {                                      // rips up rocks and lobs them onto your ledge
        this.vx = 0; this.face(toP); this.anim.play('raise', 30);
        if (this.stT < 24 && this.stT % 6 < 3) this.flash = 2;
        const n = fast ? 4 : 3;
        if (this.stT >= 24 && (this.stT - 24) % 12 === 0 && this.stT < 24 + n * 12) {
          const i = (this.stT - 24) / 12, sx = this.cx + this.dir * 30, sy = this.y + 10, tx = i % 2 ? this.lead(sx, 4) : p.cx + U.rnd(-30, 30), ty = p.y + p.h / 2;
          g.spawnProj('rock', sx, sy, this.dir, this.arc(sx, sy, tx, ty, 44, .3)); sfx().swing();
        }
        if (this.stT > 30 + n * 12) { this.set('stuck'); }
        break;
      }
      case 'swat': {                                       // a quick upward swipe: the answer to jumping over it
        this.vx = 0; this.face(toP); this.anim.play('raise', 12);
        if (this.stT < 10) { if (this.stT % 4 < 2) this.flash = 2; break; }
        if (this.stT === 10) { const hb = { x: this.cx - 80, y: this.y - 100, w: 160, h: 120 }; if (U.overlap(hb, p)) p.hurt(2, this.cx, { elem: 'shock' }); g.fx('zap', this.cx, this.y - 30, { scale: 1.6 }); sfx().big(); g.shake(3); }
        if (this.stT > 28) this.set('stuck');
        break;
      }
    }
  }
  /* BLACK DRAGON (3-3) — "the hunter": its fireballs are aimed where you are GOING (every other one at where you are,
     so you cannot just keep running one way), it stomps you when you get under it, takes to the air when you go up on
     ledges or stay far, and its bombing run drops fire right where you will be. */
  dragon() {
    const g = this.g, p = g.player, A = this.arena(), toP = U.sign(p.cx - this.cx) || this.dir, m = this.mind;
    this.vulnerable = false;
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move': {
        this.flying = false; this.face(toP); this.anim.play('idle');
        const want = p.cx - toP * 170; this.vx = U.clamp((want - this.cx) * .02, -1.2, 1.2);
        const close = Math.abs(p.cx - this.cx) < 110;
        if (close && m.near > 30) { this.think('ใกล้เกินไปแล้ว!'); this.set('stomp'); break; }
        if (this.stT > (this.phase >= 3 ? 50 : 80)) {
          const ph2 = this.phase >= 2, ledge = m.above > 40;
          const n = this.choose([['breath', ledge ? 1.2 : 3], ['stomp', close ? 3 : .6], ['takeoff', ph2 ? 1.6 + (ledge ? 3 : 0) + (m.far > 60 ? 1.5 : 0) : 0]]);
          if (n === 'takeoff' && ledge) this.think('บนนั้นก็ไม่รอด!');
          this.set(n);
        }
        break;
      }
      case 'stomp':
        if (this.stT < 18) { this.vx = 0; this.face(toP); if (this.stT % 6 < 3) this.flash = 2; break; }          // crouch = warning
        if (this.stT === 18) { this.vy = -7; const tx = this.lead(this.cx, 4); this.vx = U.clamp((tx - this.cx) / 36, -3.2, 3.2); g.warn(tx, this.groundY, 30); }
        if ((this.stT > 26 && this.onGround) || this.stT > 140) { sfx().boom(); g.shake(7); g.fxGround('rupture', this.cx, this.feet, { scale: 2 }); g.spawnProj('shock', this.cx + 50, this.feet, 1, {}); g.spawnProj('shock', this.cx - 50, this.feet, -1, {}); this.vx = 0; this.set('rest'); }
        break;
      case 'breath': {
        this.vx = 0; this.face(toP);
        this.anim.play('breath', 70);
        if (this.stT < 22 && this.stT % 6 < 3) this.flash = 2;
        const n = this.phase >= 3 ? 4 : this.phase >= 2 ? 3 : 2;
        if (this.stT >= 28 && this.stT < 28 + n * 13 && (this.stT - 28) % 13 === 0) {
          const i = (this.stT - 28) / 13, sx = this.cx + this.dir * 70, sy = this.y + 20, tx = i % 2 ? this.lead(sx, 3.6) : p.cx;   // alternate: where you ARE / where you are GOING
          const a = U.clamp(Math.atan2((p.y + p.h / 2) - sy, Math.abs(tx - sx)), -.35, .75);
          g.spawnProj('fireball', sx, sy, this.dir, { vx: this.dir * Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, scale: .8 }); sfx().shoot();
        }
        if (this.stT >= 70) this.set('rest');
        break;
      }
      case 'takeoff':
        this.anim.play('fly'); this.flying = true; this.vx = 0; this.y -= 2.2;
        if (this.y < (g.L.arena ? g.L.arena.top : 2 * T)) { this.set('fly'); this.dir = this.cx < (A.x0 + A.x1) / 2 ? 1 : -1; this.dropT = 0; }
        break;
      case 'fly': {
        this.flying = true; this.anim.play('fly'); this.x += this.dir * (this.phase >= 3 ? 2.6 : 2); this.y += Math.sin(this.stT / 12) * .6;
        // bombs fall so they LAND where you will be (fall time ~ 40 frames), plus a steady trail
        if (this.dropT > 0) this.dropT--;
        const fallX = this.cx + this.dir * .6 * 40, aim = U.clamp(p.cx + (m.vx || 0) * 40, A.x0, A.x1);
        if ((Math.abs(fallX - aim) < 26 && this.dropT <= 0) || this.stT % (this.phase >= 3 ? 40 : 54) === 10) { g.spawnProj('bigfire', this.cx, this.y + this.h, 0, { vx: this.dir * .6, vy: 1, grav: .14 }); sfx().shoot(); this.dropT = 22; }
        if ((this.dir > 0 && this.x + this.w > A.x1 - 10) || (this.dir < 0 && this.x < A.x0 + 10)) { this.dir = -this.dir; this.passes = (this.passes || 0) + 1; }
        if (this.passes >= 2) { this.passes = 0; this.set('land'); }
        break;
      }
      case 'land':
        this.flying = true; this.anim.play('fly');
        if (this.stT === 1) { this.landX = this.dropFast ? this.cx : U.clamp(p.cx, A.x0 + this.w / 2, A.x1 - this.w / 2); g.warn(this.landX, this.groundY, 34); }   // it dives at you — the shadow shows where
        if (this.stT < 34 && !this.dropFast) { this.y += Math.sin(this.stT / 5) * .4; this.x += U.clamp((this.landX - this.cx) * .12, -5, 5); break; }
        this.y += this.dropFast ? 6 : 4;
        if (this.y + this.h >= this.groundY - 1) { const p2 = g.player; if (p2 && U.overlap(this, p2)) p2.hurt(1, this.cx, { elem: 'fire' }); }
        if (this.y + this.h >= this.groundY) { this.y = this.groundY - this.h; this.flying = false; this.dropFast = false; sfx().boom(); g.shake(6); g.fxGround('ldust', this.cx, this.feet, { scale: 2.2 }); this.set('tired'); g.text(this.cx, this.y - 14, 'มังกรเหนื่อย! โจมตี!', '#8aff8a', 60); }
        break;
      case 'tired': this.vx = 0; this.anim.play('hurt'); this.vulnerable = true; if (this.stT > 90) this.set('move'); break;
      case 'rest': this.vx = 0; this.anim.play('idle'); if (this.stT > 40) this.set('move'); break;
    }
  }
  takeHit(dmg, o) {
    // intro roar / phase change / fully warped out: the boss cannot be hurt — say so (game.hit shows "ไม่มีผล")
    if (this.st === 'intro' || this.st === 'phase' || this.alpha === 0) { this.reject = 'immune'; return false; }
    if (this.armored && !this.dead) {                    // v115 snail tank: inside its shell nothing gets through
      if (o.id == null || !this.lastHit.has(o.id)) { if (o.id != null) this.lastHit.add(o.id); PLAT.sfx.clang(); this.g.burst(this.cx, this.y + this.h / 2, '#ffffff', 6, 2); this.g.text(this.cx, this.y - 6, 'แข็ง!', '#d0d8e0', 26); }
      this.reject = 'blocked'; return false;
    }
    const ok = super.takeHit(dmg, o);
    if (ok) {
      this.noteHit();
      this.g.bossHit(this);
      // poise break → STAGGER: the boss reels (takes double damage); a flying dragon is knocked out of the sky
      this.breakPoise();
    }
    return ok;
  }
  /* ---------------- v114 MARSH WARLOCK (world 4) ----------------
     phase 1 (Evil Wizard 2): keeps its distance, warps behind you, sweeping staff blows (telegraphed "!", PARRY them),
       homing-ish bolt volleys (parry = reflect). Rests after every move (vulnerable).
     phase 2 (50 %): transforms into Evil Wizard 3 — faster, bolt fans, bolt rain from the sky, a dash through the arena,
       summons bats / swamp goo (max 3), and the arena's gas vents start erupting.
     phase 3 (25 %): shorter telegraphs and rests, slash combos, bigger fans. */
  wizard() {
    const g = this.g, p = g.player, A = this.arena(), d = this.def, ph = this.phase, fast = ph >= 2, toP = U.sign(p.cx - this.cx) || this.dir;
    this.vulnerable = false;
    if (fast && !this.form2 && this.st !== 'phase' && this.st !== 'xform' && this.st !== 'intro') { this.set('xform'); }
    const bolt = (x, y, vx, vy, k) => g.spawnProj(d.proj, x, y, U.sign(vx) || this.dir, { vx, vy, scale: k || 1.7 });
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'xform': {                                    // the transformation: invulnerable, a column of poison light
        this.vx = 0; this.alpha = 1;
        if (this.stT === 1) { g.text(this.cx, this.y - 24, 'ร่างที่สอง!!', '#c86aff', 80, true); sfx().roar(); g.shake(6); g.clearHostile(); }
        if (this.stT % 2 === 0) for (let i = 0; i < 3; i++) g.parts.push({ x: this.cx + U.rnd(-30, 30), y: this.feet - U.rnd(0, 110), vx: U.rnd(-.5, .5), vy: U.rnd(-3, -1), life: 30, col: i ? '#c86aff' : '#7aff8a', size: 4, fade: true });
        if (this.stT < 40 && this.stT % 4 < 2) this.flash = 3;
        if (this.stT === 40) { this.form2 = true; this.anim = new PLAT.Anim(g.sheets.get(this.type + ':2'), {}); this.drawScale = d.scale2; this.cOff = 0; g.flashT = 14; sfx().boom(); g.fx('void', this.cx, this.y + this.h / 2, { scale: 2.6 }); }
        this.anim.play('idle');
        if (this.stT > 70) this.set('move');
        break;
      }
      case 'move': {
        this.face(toP); const want = p.cx - toP * (fast ? 115 : 150);
        this.vx = U.clamp((want - this.cx) * .03, -1.6, 1.6) * (fast ? 1.35 : 1);
        if (this.x < A.x0 + 4 && this.vx < 0 || this.x + this.w > A.x1 - 4 && this.vx > 0) this.vx = 0;
        this.anim.play(Math.abs(this.vx) > .3 ? 'move' : 'idle');
        if (this.stT > (ph >= 3 ? 30 : fast ? 46 : 70)) {
          // v117 THE TACTICIAN: it counters your habits — parry its bolts and it stops shooting reflectable bolts; hug it and it
          // blinks away; snipe from afar and it warps behind you; hide up high and the sky rains on you; jump a lot = bolt fans
          const m = this.mind, near = Math.abs(p.cx - this.cx) < 120, minions = g.enemies.filter(e => !e.dead && !e.boss).length;
          const noRef = m.parries >= 2 ? .25 : 1, hug = m.near > 50, snipe = m.far > 60, high = m.above > 40, jumpy = m.air > .45;
          const n = this.choose([
            ['slash', fast ? 0 : (near ? 3 : 1) * (m.parries >= 2 ? 1.6 : 1)], ['slash2', (near ? 2.5 : .8) * (m.parries >= 2 ? 1.6 : 1)],
            ['bolts', fast ? 0 : (near ? 1 : 3) * noRef], ['cast', fast ? (2 + (jumpy ? 2 : 0)) * noRef : 0],
            ['warp', 1 + (snipe ? 3 : 0)], ['blink', hug ? 4 : 0], ['rain', fast ? 1.5 + (high ? 3 : 0) + (m.parries >= 2 ? 1.5 : 0) : 0],
            ['summon', fast && minions < 3 ? 1.4 : 0], ['dash', fast ? 1.4 + (snipe ? 1 : 0) : 0]]);
          if (m.parries >= 2 && !m.saidRef) { m.saidRef = true; this.think('สะท้อนเวทข้าอีกไม่ได้แล้ว!'); }
          else if (n === 'blink') this.think('ไม่ให้ประชิดหรอก'); else if (n === 'warp' && snipe) this.think('อยู่ไกลก็ไม่รอด'); else if (n === 'rain' && high) this.think('บนนั้นก็ไม่รอด');
          this.set(n);
        }
        break;
      }
      case 'slash': case 'slash2': {                      // staff sweep: "!" + flash → lunge + big arc in front (parry it!)
        const wind = ph >= 3 ? 14 : fast ? 18 : 24, two = this.st === 'slash2';
        if (this.stT === 1) { this.face(toP); this.anim.play(two && !this.form2 ? 'atk2' : 'atk', wind + 24, true); g.text(this.cx, this.y - 16, '!', '#ff5a9a', 26, true); }
        this.vx = this.stT > wind && this.stT < wind + 8 ? this.dir * (fast ? 4.2 : 3) : 0;
        if (this.stT < wind && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === wind + 6) {
          const reach = fast ? 120 : 104, hb = { x: this.dir > 0 ? this.cx - 10 : this.cx - reach, y: this.feet - 92, w: reach + 10, h: 92 };
          if (U.overlap(hb, p)) p.hurt(2, this.cx, { src: this, elem: 'poison' });
          sfx().big(); g.shake(3); g.burst(this.cx + this.dir * 60, this.feet - 50, '#c86aff', 10, 3);
        }
        if (this.stT >= wind + 24) { if (two && !this.again) { this.again = true; this.set('slash'); } else { this.again = false; this.set('rest'); } }
        break;
      }
      case 'bolts': {                                      // raise the staff, a volley of bolts aimed at where you ARE (parry = reflect)
        this.vx = 0; this.face(toP); const n = ph >= 3 ? 5 : fast ? 4 : 3;
        this.anim.play('atk2', 26 + n * 12, false);
        if (this.stT < 20 && this.stT % 6 < 3) this.flash = 2;
        if (this.stT >= 22 && (this.stT - 22) % 12 === 0 && this.stT < 22 + n * 12) {
          const i = (this.stT - 22) / 12, sx = this.cx + this.dir * 34, sy = this.feet - 60, sp = 3.6, tx = i % 2 ? this.lead(sx, sp) : p.cx, a = Math.atan2((p.y + p.h / 2) - sy, (tx - sx));
          bolt(sx, sy, Math.cos(a) * sp, Math.sin(a) * sp); sfx().shoot();
        }
        if (this.stT > 30 + n * 12) this.set('rest');
        break;
      }
      case 'cast': {                                       // phase 2: a fan of bolts
        this.vx = 0; this.face(toP); this.anim.play('atk', 54, false);
        if (this.stT < 22 && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === 26 || (ph >= 3 && this.stT === 40)) {
          const sx = this.cx + this.dir * 30, sy = this.feet - 50, base = Math.atan2((p.y + p.h / 2) - sy, Math.abs(p.cx - sx)), k = ph >= 3 ? 3 : 2;
          for (let i = -k; i <= k; i++) { const a = U.clamp(base, -.6, .6) + i * .2; bolt(sx, sy, this.dir * Math.cos(a) * 3.4, Math.sin(a) * 3.4); }
          sfx().big();
        }
        if (this.stT > 56) this.set('rest');
        break;
      }
      case 'rain': {                                       // phase 2: marked spots, bolts fall from the sky
        this.vx = 0; this.anim.play('idle'); const n = ph >= 3 ? 8 : 6;
        if (this.stT === 6) { g.text(this.cx, this.y - 16, 'ฝนเวทพิษ!', '#c86aff', 50); sfx().big(); }
        if (this.stT >= 12 && this.stT < 12 + n * 9 && (this.stT - 12) % 9 === 0) {
          const x = U.clamp(p.cx + U.rnd(-130, 130), A.x0 + 12, A.x1 - 12);
          g.warn(x, g.floorBelow(x, p.y), 36, () => bolt(x, g.cam.y - 10, 0, 4.2, 1.9));
        }
        if (this.stT > 30 + n * 9) this.set('rest');
        break;
      }
      case 'warp': {                                       // fade out → reappear BEHIND you → slash at once
        this.vx = 0;
        if (this.stT < 22) this.alpha = 1 - this.stT / 22;
        else if (this.stT === 22) { const side = -(p.face || 1), x = U.clamp(p.cx + side * 80, A.x0 + 30, A.x1 - 30); this.x = x - this.w / 2; this.alpha = 0; this.face(U.sign(p.cx - x) || 1); g.fx('void', x, this.feet - 50, { scale: 1.4 }); }
        else if (this.stT < 40) this.alpha = (this.stT - 22) / 18;
        else { this.alpha = 1; this.set(fast ? 'slash2' : 'slash'); }
        break;
      }
      case 'blink': {                                      // v117: you are too close — it vanishes and reappears on the far side, then fires
        this.vx = 0;
        if (this.stT < 14) this.alpha = 1 - this.stT / 14;
        else if (this.stT === 14) { const x = p.cx < (A.x0 + A.x1) / 2 ? A.x1 - 50 : A.x0 + 50; this.x = x - this.w / 2; this.alpha = 0; this.face(U.sign(p.cx - x) || 1); g.fx('void', x, this.feet - 50, { scale: 1.4 }); }
        else if (this.stT < 28) this.alpha = (this.stT - 14) / 14;
        else { this.alpha = 1; this.set(fast ? (this.mind.parries >= 2 ? 'rain' : 'cast') : 'bolts'); }
        break;
      }
      case 'summon': {                                     // phase 2: bats from the dark, goo from the mud
        this.vx = 0; this.anim.play('atk', 40, false);
        if (this.stT === 1) g.text(this.cx, this.y - 16, 'อัญเชิญ!', '#c86aff', 50);
        if (this.stT === 24) {
          const n = Math.min(2, 3 - g.enemies.filter(e => !e.dead && !e.boss).length);
          for (let i = 0; i < n; i++) { const type = d.minions[(this.pat + i) % d.minions.length], x = U.clamp(this.cx + (i ? 90 : -90), A.x0 + 30, A.x1 - 30), fly = type === 'bat';
            const e = PLAT.makeEnemy(g, type, x, fly ? this.feet - 90 : this.feet); e.cool = 40; g.enemies.push(e); g.fx('void', x, (fly ? this.feet - 100 : this.feet - 30), { scale: 1.2 }); }
          sfx().big();
        }
        if (this.stT > 44) this.set('rest');
        break;
      }
      case 'dash': {                                       // phase 2: crouch (telegraph) → run straight through the arena
        if (this.stT < 22) { this.vx = 0; this.face(toP); this.anim.play('idle'); if (this.stT % 6 < 3) this.flash = 2; if (this.stT === 1) g.text(this.cx, this.y - 16, '!', '#ff5a9a', 26, true); break; }
        this.anim.play(this.anim.sheet.anims.run ? 'run' : 'move'); this.vx = this.dir * (ph >= 3 ? 7 : 6);
        if (this.stT % 2 === 0) g.afterimage(this);
        const hb = { x: this.x, y: this.y, w: this.w, h: this.h };
        if (U.overlap(hb, p)) p.hurt(2, this.cx, { src: this, elem: 'poison' });
        if (this.x < A.x0 + 8 || this.x + this.w > A.x1 - 8 || this.stT > 90) { this.vx = 0; g.shake(4); sfx().heavy(); this.set('tired'); g.text(this.cx, this.y - 16, 'หอบ! โจมตีเลย!', '#8aff8a', 50); }
        break;
      }
      case 'tired': this.vx = 0; this.vulnerable = true; this.anim.play('idle'); if (this.stT > (ph >= 3 ? 50 : 70)) this.set('move'); break;
      case 'rest': this.vx = 0; this.anim.play('idle'); this.vulnerable = true; if (this.stT > (ph >= 3 ? 26 : fast ? 34 : 50) * TUNE.bossRest) this.set('move'); break;
    }
  }
  /* ---------------- v121 THE NAMELESS SCRIBE (6-2, final boss) ----------------
     He has no attacks of his own — he writes with the names he erased: TIDE (the spring keeper's waves), QUAKE (the bell-ringer's
     leap + shockwaves), FLAME (the forge dragon's fireballs, aimed where you run), HEX (the healer's bolt fan — parry = reflect),
     MORTAR (machine No.7's shells on marked spots), LANCE (the serpent's beam: aim line → beam). Plus ink: summons, warp + slash.
     The brain is the shared one: he reads your habits like every keeper did.
     phase 2: chains two names back to back, ink minions · phase 3: ink rain, faster telegraphs, three-name chains. */
  scribe() {
    const g = this.g, p = g.player, A = this.arena(), d = this.def, ph = this.phase, fast = ph >= 2, toP = U.sign(p.cx - this.cx) || this.dir, m = this.mind;
    this.vulnerable = false;
    const KEEP = { tide: ['นามแห่งวารี!', '#7ad8ff'], quake: ['นามแห่งระฆัง!', '#e8d08a'], flame: ['นามแห่งเพลิง!', '#ff8a5a'], hex: ['นามแห่งการเยียวยา!', '#a8ff8a'],
      mortar: ['เจ็ด… ขุด!', '#e8b86a'], lance: ['นามแรก!', '#d08aff'], rain: ['ฝนหมึก!', '#a07aff'], summon: ['จงถูกลบ!', '#a07aff'] };
    const call = k => { const c = KEEP[k]; if (!c) return; g.text(this.cx, this.y - 30, c[0], c[1], 60, true); this.aura = c[1]; this.auraT = 50; };
    const done = () => {                                  // phase 2+: chain the next name straight away (1 extra · 2 in phase 3)
      const max = ph >= 3 ? 2 : fast ? 1 : 0;
      if ((this.chainN || 0) < max && Math.random() < (ph >= 3 ? .75 : .55)) { this.chainN = (this.chainN || 0) + 1; this.set('move'); this.stT = 999; }
      else { this.chainN = 0; this.set('rest'); }
    };
    const wind = ph >= 3 ? 16 : fast ? 20 : 26;
    if (this.auraT > 0) this.auraT--;
    if (m.streak >= 3 && (this.st === 'move' || this.st === 'rest')) { m.streak = 0; this.think('อย่าแตะหน้ากระดาษของข้า!'); this.set('warp'); }
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move': {
        this.face(toP); const want = p.cx - toP * (fast ? 130 : 165);
        this.vx = U.clamp((want - this.cx) * .03, -1.6, 1.6) * (fast ? 1.3 : 1);
        if (this.x < A.x0 + 4 && this.vx < 0 || this.x + this.w > A.x1 - 4 && this.vx > 0) this.vx = 0;
        this.anim.play(Math.abs(this.vx) > .3 ? 'move' : 'idle');
        if (this.stT > (ph >= 3 ? 28 : fast ? 42 : 62)) {
          const minions = g.enemies.filter(e => !e.dead && !e.boss).length, ledge = m.above > 40, camp = m.still > 40, far = m.far > 50, hug = m.near > 50, jumpy = m.air > .45;
          const n = this.choose([['tide', 2 + (jumpy ? -1 : 1)], ['quake', 1.4 + (far ? 1.5 : 0)], ['flame', 1.6 + (far ? 2 : 0)], ['hex', 1.6 * (m.parries >= 2 ? .35 : 1) + (jumpy ? 1 : 0)],
            ['mortar', 1.2 + (camp ? 2 : 0) + (ledge ? 2.5 : 0)], ['lance', fast ? 1.4 + (camp ? 2 : 0) + (ledge ? 1 : 0) : .6], ['warp', .8 + (hug ? 3 : 0)],
            ['summon', fast && minions < 2 ? 1.3 : 0], ['rain', ph >= 3 ? 1.6 + (ledge ? 2 : 0) : 0]]);
          if (m.parries >= 2 && !m.saidRef) { m.saidRef = true; this.think('เจ้าปัดคำของข้ากลับมาได้… งั้นข้าจะไม่เขียนคำที่ปัดได้'); }
          else if (n === 'mortar' && ledge) this.think('ที่สูงก็ลบได้'); else if (n === 'warp' && hug) this.think('อย่าเข้ามาใกล้!'); else if (n === 'flame' && far) this.think('หนีไปไหน?');
          this.set(n);
        }
        break;
      }
      case 'tide': {                                       // the spring keeper's waves: both ways, then one timed for your landing
        this.vx = 0; this.face(toP); this.anim.play(this.stT < wind ? 'idle' : 'atk');
        if (this.stT === 1) call('tide');
        if (this.stT < wind && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === wind) { g.spawnProj('wave', this.cx + this.dir * 20, this.feet, this.dir, { speed: 3 }); g.spawnProj('wave', this.cx - this.dir * 20, this.feet, -this.dir, { speed: 2.4 }); g.fxGround('splash', this.cx, this.feet, { scale: 1.4 }); sfx().big(); }
        if (this.stT === wind + 24 && (m.air > .3 || ph >= 3)) { this.face(U.sign(p.cx - this.cx) || this.dir); g.spawnProj('wave', this.cx + this.dir * 20, this.feet, this.dir, { speed: 3.4 }); sfx().big(); }
        if (this.stT > wind + 44) done();
        break;
      }
      case 'quake': {                                      // the bell-ringer's leap: crouch → lands where you run to → shockwaves
        if (this.stT === 1) call('quake');
        if (this.stT < wind) { this.vx = 0; this.anim.play('idle'); if (this.stT % 6 < 3) this.flash = 2; break; }
        if (this.stT === wind) { const tx = this.lead(this.cx, 5, 1.05); this.vy = -10.5; this.vx = (tx - this.cx) / 42; g.warn(tx, g.floorBelow(tx, this.y), 40); sfx().heavy(); }
        this.anim.play(this.vy < 0 ? 'jump' : 'fall');
        if (this.stT > wind + 4 && this.onGround) {
          this.vx = 0; sfx().boom(); g.shake(8); g.hitstop(3); g.fxGround('rupture', this.cx, this.feet, { scale: 1.5 });
          g.spawnProj('shock', this.cx + 40, this.feet, 1, {}); g.spawnProj('shock', this.cx - 40, this.feet, -1, {});
          if (U.overlap({ x: this.x - 20, y: this.feet - 60, w: this.w + 40, h: 60 }, p)) p.hurt(2, this.cx, { src: this });
          this.set('tired'); g.text(this.cx, this.y - 16, 'ลงพื้นแรง! โจมตีเลย!', '#8aff8a', 50);
        }
        if (this.stT > 150) this.set('move');
        break;
      }
      case 'flame': {                                      // the forge dragon's fireballs: every other one aimed where you are GOING
        this.vx = 0; this.face(toP); this.anim.play('atk', 40, false); const n = ph >= 3 ? 5 : fast ? 4 : 3;
        if (this.stT === 1) call('flame');
        if (this.stT < wind && this.stT % 6 < 3) this.flash = 2;
        if (this.stT >= wind && (this.stT - wind) % 11 === 0 && this.stT < wind + n * 11) {
          const i = (this.stT - wind) / 11, sx = this.cx + this.dir * 30, sy = this.feet - 56, sp = 3.6, tx = i % 2 ? this.lead(sx, sp) : p.cx, a = Math.atan2((p.y + p.h / 2) - sy, tx - sx);
          g.spawnProj('fireball', sx, sy, U.sign(Math.cos(a)) || this.dir, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, scale: .8 }); sfx().shoot();
        }
        if (this.stT > wind + n * 11 + 14) done();
        break;
      }
      case 'hex': {                                        // the healer's bolt fan (parry = reflect)
        this.vx = 0; this.face(toP); this.anim.play('atk', 50, false);
        if (this.stT === 1) call('hex');
        if (this.stT < wind && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === wind || (ph >= 3 && this.stT === wind + 16)) {
          const sx = this.cx + this.dir * 30, sy = this.feet - 56, base = Math.atan2((p.y + p.h / 2) - sy, Math.abs(p.cx - sx)), k = fast ? 2 : 1;
          for (let i = -k; i <= k; i++) { const a = U.clamp(base, -.6, .6) + i * .22; g.spawnProj(d.proj, sx, sy, this.dir, { vx: this.dir * Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, scale: 1.7 }); }
          sfx().big();
        }
        if (this.stT > wind + 36) done();
        break;
      }
      case 'mortar': {                                     // machine No.7's shells: where you are, where you run to, and the way out
        this.vx = 0; this.anim.play(this.stT < wind ? 'idle' : 'atk'); const n = ph >= 3 ? 6 : fast ? 5 : 3;
        if (this.stT === 1) call('mortar');
        if (this.stT < wind) { if (this.stT % 6 < 3) this.flash = 2; break; }
        const k = this.stT - wind;
        if (k % 10 === 0 && k < n * 10) {
          const i = k / 10, ahead = U.clamp(p.cx + (m.vx || 0) * 46, A.x0 + 14, A.x1 - 14);
          const x = U.clamp(i === 0 ? p.cx : i === 1 ? ahead : ahead + U.rnd(40, 120) * (i % 2 ? 1 : -1), A.x0 + 14, A.x1 - 14);
          g.warn(x, g.floorBelow(x, p.y), 46, () => g.spawnProj('cball', x, g.cam.y - 12, 0, { vy: 3, grav: .2 })); sfx().shoot();
          g.parts.push({ x: this.cx, y: this.y, vx: 0, vy: -6, life: 26, col: '#3a1a6a', size: 7 });
        }
        if (k > n * 10 + 20) done();
        break;
      }
      case 'lance': {                                      // the serpent's beam: an aim line at where you WERE → the beam; phase 3 twice
        this.vx = 0; this.face(toP); this.anim.play('atk', 30, false);
        if (this.stT === 1) call('lance');
        const second = ph >= 3 && this.stT >= 70, t = second ? this.stT - 69 : this.stT, w = ph >= 3 ? 28 : 36;
        const sx = this.cx + this.dir * 22, sy = this.feet - 70;
        if (t === 1) { this.aim = { x: p.cx, y: p.y + p.h / 2 }; sfx().charge(); }
        const a = Math.atan2(this.aim.y - sy, this.aim.x - sx);
        this.beam = { x: sx, y: sy, a, on: t > w && t <= w + 24, warn: t <= w };
        if (this.beam.warn && t % 6 < 3) this.flash = 2;
        if (this.beam.on) {
          if (t === w + 1) { sfx().big(); g.shake(4); }
          const ux = Math.cos(a), uy = Math.sin(a), px = p.cx - sx, py = p.y + p.h / 2 - sy, along = px * ux + py * uy, off = Math.abs(px * -uy + py * ux);
          if (along > 0 && off < 9 + Math.min(p.w, p.h) / 2 && !p.dead) p.hurt(2, sx, { src: this });
          if (t % 2 === 0) g.parts.push({ x: sx + ux * U.rnd(20, 400), y: sy + uy * U.rnd(20, 400), vx: U.rnd(-1, 1), vy: U.rnd(-1, 1), life: 12, col: '#e0b0ff', size: 3, fade: true });
        }
        if (t > w + 28) { this.beam = null; if (ph >= 3 && !second) this.stT = 69; else { this.set('tired'); g.text(this.cx, this.y - 16, 'หมึกหมด! โจมตีเลย!', '#8aff8a', 50); } }
        break;
      }
      case 'rain': {                                       // phase 3: ink falls from the ceiling on marked spots
        this.vx = 0; this.anim.play('idle'); const n = 8;
        if (this.stT === 1) call('rain');
        if (this.stT >= 12 && this.stT < 12 + n * 8 && (this.stT - 12) % 8 === 0) {
          const x = U.clamp(p.cx + U.rnd(-140, 140), A.x0 + 12, A.x1 - 12);
          g.warn(x, g.floorBelow(x, p.y), 34, () => g.spawnProj(d.proj, x, g.cam.y - 10, 0, { vx: 0, vy: 4.4, scale: 1.9 }));
        }
        if (this.stT > 30 + n * 8) done();
        break;
      }
      case 'summon': {                                     // ink shadows of erased things
        this.vx = 0; this.anim.play('atk', 40, false);
        if (this.stT === 1) call('summon');
        if (this.stT === 24) {
          const n = Math.min(2, 3 - g.enemies.filter(e => !e.dead && !e.boss).length);
          for (let i = 0; i < n; i++) { const type = d.minions[(this.pat + i) % d.minions.length], x = U.clamp(this.cx + (i ? 100 : -100), A.x0 + 30, A.x1 - 30), fly = type === 'inkbat';
            const e = PLAT.makeEnemy(g, type, x, fly ? this.feet - 90 : this.feet); e.cool = 50; g.enemies.push(e); g.fx('void', x, fly ? this.feet - 100 : this.feet - 30, { scale: 1.2 }); }
          sfx().big();
        }
        if (this.stT > 44) done();
        break;
      }
      case 'warp': {                                       // dissolves into ink → reappears behind you → an ink slash (parry it!)
        this.vx = 0;
        if (this.stT < 20) this.alpha = 1 - this.stT / 20;
        else if (this.stT === 20) { const side = -(p.face || 1), x = U.clamp(p.cx + side * 80, A.x0 + 30, A.x1 - 30); this.x = x - this.w / 2; this.alpha = 0; this.face(U.sign(p.cx - x) || 1); g.fx('void', x, this.feet - 50, { scale: 1.5 }); }
        else if (this.stT < 36) this.alpha = (this.stT - 20) / 16;
        else { this.alpha = 1; this.set('slash'); }
        break;
      }
      case 'slash': {
        const w = ph >= 3 ? 12 : 16;
        if (this.stT === 1) { this.face(toP); this.anim.play('atk', w + 22, true); g.text(this.cx, this.y - 16, '!', '#ff5a9a', 26, true); }
        this.vx = this.stT > w && this.stT < w + 8 ? this.dir * 3.6 : 0;
        if (this.stT < w && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === w + 6) {
          const reach = 110, hb = { x: this.dir > 0 ? this.cx - 10 : this.cx - reach, y: this.feet - 96, w: reach + 10, h: 96 };
          if (U.overlap(hb, p)) p.hurt(2, this.cx, { src: this });
          sfx().big(); g.shake(3); g.burst(this.cx + this.dir * 60, this.feet - 50, '#a07aff', 12, 3);
        }
        if (this.stT >= w + 24) done();
        break;
      }
      case 'tired': this.vx = 0; this.vulnerable = true; this.anim.play('hurt'); if (this.stT > (ph >= 3 ? 50 : 70)) { this.chainN = 0; this.set('move'); } break;
      case 'rest': this.vx = 0; this.anim.play('idle'); this.vulnerable = true; if (this.stT > (ph >= 3 ? 26 : fast ? 34 : 48) * TUNE.bossRest) this.set('move'); break;
      default: this.set('move');
    }
  }
  /* ---------------- v115 SNAIL TANK (world 5, 5-2) ----------------
     crawls at you · MORTAR: raises its cannon ("!"), shells fall on marked spots · CANNON: two/three low cannonballs (jump them) ·
     ROLL: hides in its shell (hits bounce off) and rolls wall to wall — jump over it; after the last bounce it is dizzy (×2 damage).
     phase 2: faster, more shells, an extra bounce · phase 3: everything again, shorter rests. */
  snail() {
    const g = this.g, p = g.player, A = this.arena(), ph = this.phase, toP = U.sign(p.cx - this.cx) || this.dir;
    this.vulnerable = false; this.armored = false; this.rollA = this.st === 'roll' ? this.rollA : 0;
    const muzzle = () => ({ x: this.cx + this.dir * -20 * this.def.scale / 2.1, y: this.y + 4 });           // the cannon sits on the shell's back
    const smoke = (x, y) => g.fx('smoke', x, y, { scale: .9 });                                              // v120 smoke sprite
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move':
        this.face(toP); this.vx = this.dir * (ph >= 2 ? .85 : .55); this.anim.play('move');
        if (this.x < A.x0 + 4 && this.vx < 0 || this.x + this.w > A.x1 - 4 && this.vx > 0) this.vx = 0;
        {                                                  // v117 THE FORTRESS: it punishes the side you pick
          const m = this.mind;
          if (m.behind > 45) { m.behind = 0; this.think('ข้างหลังก็ไม่รอด!'); this.choose([['roll', 1]]); this.set('roll'); break; }
          if (m.streak >= 4) { m.streak = 0; this.think('หดเข้ากระดอง!'); this.choose([['roll', 1]]); this.set('roll'); break; }
          if (this.stT > (ph >= 3 ? 40 : ph >= 2 ? 60 : 90)) {
            const high = m.above > 40, close = Math.abs(p.cx - this.cx) < 130;
            const n = this.choose([['mortar', 2 + (high ? 2.5 : 0) + (m.still > 40 ? 1.5 : 0)], ['cannon', high ? 1.5 : close ? 1 : 2.5], ['roll', (ph >= 2 ? 2 : 1) + (close ? 1.5 : 0) + (m.air > .45 ? 1 : 0)]]);
            if (n === 'cannon' && high) this.think('ยิงโค้งขึ้นไปก็ได้!');
            this.set(n);
          }
        }
        break;
      case 'mortar': {
        this.vx = 0; const n = ph >= 3 ? 7 : ph >= 2 ? 5 : 3, wind = ph >= 3 ? 18 : 26;
        if (this.stT === 1) g.text(this.cx, this.y - 16, '⚠ ปืนครก!', '#ffd060', 40);
        if (this.stT < wind) { this.anim.play('raise'); if (this.stT % 6 < 3) this.flash = 2; break; }
        this.anim.play('fire');
        const k = this.stT - wind;
        if (k % 10 === 0 && k < n * 10) {
          const m = muzzle(); smoke(m.x, m.y - 10); sfx().shoot(); g.shake(2);
          g.parts.push({ x: m.x, y: m.y - 14, vx: 0, vy: -7, life: 30, col: '#2a2630', size: 9 });
          const mi = this.mind, i = k / 10, ahead = U.clamp(p.cx + (mi.vx || 0) * 46, A.x0 + 14, A.x1 - 14);   // where you are, where you run to, and the way out
          const x = U.clamp(i === 0 ? p.cx : i === 1 ? ahead : ahead + U.sign(mi.vx || (p.cx - this.cx) || 1) * U.rnd(40, 120) * (i % 2 ? 1 : -1), A.x0 + 14, A.x1 - 14);
          g.warn(x, g.floorBelow(x, p.y), 46, () => g.spawnProj('cball', x, g.cam.y - 12, 0, { vy: 3, grav: .2 }));
        }
        if (k > n * 10 + 20) this.set('rest');
        break;
      }
      case 'cannon': {
        this.vx = 0; this.face(toP); const n = ph >= 3 ? 3 : 2, wind = ph >= 3 ? 16 : 22;
        if (this.stT === 1) g.text(this.cx, this.y - 16, '!', '#ff5a5a', 26, true);
        if (this.stT < wind) { this.anim.play('raise'); if (this.stT % 6 < 3) this.flash = 2; break; }
        this.anim.play('fire'); const k = this.stT - wind;
        if (k % 22 === 0 && k < n * 22) {
          const sx = this.cx + this.dir * this.w * .45, sy = this.feet - 22;
          if (this.mind.above > 40) { const tx = this.lead(sx, 4); g.spawnProj('cball', sx, sy - 20, this.dir, this.arc(sx, sy - 20, tx, p.y + p.h / 2, 48, .2)); }   // you are up on a ledge → a high arc onto it
          else g.spawnProj('cball', sx, sy, this.dir, { vx: this.dir * (ph >= 2 ? 4.4 : 3.8), vy: -1.2, grav: .045 });
          smoke(sx, sy); sfx().boom(); g.shake(3);
        }
        if (k > n * 22 + 14) this.set('rest');
        break;
      }
      case 'roll': {                                       // tuck in (telegraph) → roll wall to wall → dizzy
        const wind = ph >= 3 ? 22 : 32;
        this.armored = true; if (this.stT < (ph >= 3 ? 22 : 32)) this.anim.play('hide');
        if (this.stT === 1) { g.text(this.cx, this.y - 16, '⚠ กลิ้ง! กระโดดข้าม!', '#ffd060', 50); this.face(toP); this.bounces = 0; sfx().charge(); }
        if (this.stT < wind) { this.vx = 0; if (this.stT % 6 < 3) this.flash = 2; this.rollA = (this.rollA || 0) + this.dir * .05 * this.stT / wind; break; }
        this.anim.play('shell'); this.vx = this.dir * (ph >= 3 ? 6.4 : ph >= 2 ? 5.6 : 4.8); this.rollA = (this.rollA || 0) + this.vx / 36;
        if (this.stT % 3 === 0) g.dust(this.cx - this.dir * 20, this.feet, 1);
        if (U.overlap({ x: this.x + 6, y: this.y + 6, w: this.w - 12, h: this.h - 6 }, p) && !p.dead) p.hurt(2, this.cx, { src: this });
        if ((this.dir < 0 && this.x < A.x0 + 6) || (this.dir > 0 && this.x + this.w > A.x1 - 6) || this.wall) {
          this.dir = -this.dir; this.bounces++; g.shake(5); sfx().clang(); g.fxGround('ldust', this.cx, this.feet, { scale: 1.5 });
          if (ph >= 2) for (let i = 0; i < 2; i++) { const x = U.clamp(U.rnd(A.x0 + 20, A.x1 - 20), A.x0, A.x1); g.warn(x, g.floorBelow(x, p.y), 40 + i * 8, () => g.spawnProj('rock', x, g.cam.y - 10, 0, {})); }
          if (this.bounces >= (ph >= 2 ? 3 : 2)) { this.vx = 0; this.rollA = 0; this.set('tired'); g.text(this.cx, this.y - 16, 'มึน! โจมตีเลย!', '#8aff8a', 60); }
        }
        if (this.stT > 400) { this.rollA = 0; this.set('tired'); }
        break;
      }
      case 'tired': this.vx = 0; this.vulnerable = true; this.anim.play('hurt'); if (this.t % 20 === 0) g.burst(this.cx, this.y, '#fff6a0', 2, 1); if (this.stT > (ph >= 3 ? 70 : 100)) this.set('move'); break;
      case 'rest': this.vx = 0; this.vulnerable = true; this.anim.play('idle'); if (this.stT > (ph >= 3 ? 24 : 40) * TUNE.bossRest) this.set('move'); break;
    }
  }
  /* ---------------- v115 HORNED SERPENT (world 5, 5-4) ----------------
     lives in the lava pool between two shores. Bubbles on the surface show where it comes up next.
     LEAP: jumps out of one side of the pool and arcs to the other (its whole body hurts) ·
     SURFACE: comes up on the far side from you → horn LASER (a red aim line first, then the beam: move off the line)
       or a stream of BUBBLES (parry = reflect) → then it rests its head on the shore: cross over and hit it (×2).
     phase 2: two leaps in a row, lava blobs splash out, wider bubble fans · phase 3: faster, a second laser. */
  serpent() {
    const g = this.g, p = g.player, A = this.arena(), ph = this.phase, k = this.def.scale;
    this.flying = true; this.vulnerable = false;
    if (!this.pool) {                                     // the lava pool under the spawn point
      const ty = Math.floor((this.groundY || this.feet) / T), L = g.L; let x0 = Math.floor(this.cx / T), x1 = x0;
      while (W.tileAt(L, x0 - 1, ty) === PLAT.TILE.LIQUID) x0--; while (W.tileAt(L, x1 + 1, ty) === PLAT.TILE.LIQUID) x1++;
      this.pool = { x0: x0 * T, x1: (x1 + 1) * T, y: ty * T + 4 }; this.hx = this.cx; this.hy = this.pool.y + 70; this.ang = -Math.PI / 2; this.trail = [];
    }
    const P = this.pool, surf = P.y;
    const place = (x, y, ang) => { this.hx = x; this.hy = y; if (ang != null) this.ang = ang; this.x = x - this.w / 2; this.y = y - this.h / 2; };
    const splash = (x, n) => { for (let i = 0; i < (n || 14); i++) g.parts.push({ x: x + U.rnd(-20, 20), y: surf, vx: U.rnd(-2, 2), vy: U.rnd(-5, -1.5), life: 30, col: i % 2 ? '#ffd04a' : '#ff6a1a', size: 4, grav: .2, fade: true }); sfx().heavy(); };
    const blobs = x => { if (ph < 2) return; for (let i = 0; i < (ph >= 3 ? 4 : 3); i++) g.spawnProj('lblob', x, surf - 6, 0, { vx: U.rnd(-2.6, 2.6), vy: U.rnd(-7.5, -5) }); };
    const farSide = () => (p.cx < (P.x0 + P.x1) / 2 ? 1 : -1);          // +1 = the right edge
    const edgeX = s => s > 0 ? P.x1 - 34 : P.x0 + 34;
    const bubbleMarks = x => { if (g.frame % 4 === 0) g.parts.push({ x: x + U.rnd(-18, 18), y: surf + 2, vx: 0, vy: U.rnd(-1.6, -.6), life: 16, col: '#fff0a0', size: 4, fade: true }); };
    this.trail.unshift([this.hx, this.hy]); if (this.trail.length > 40) this.trail.length = 40;
    switch (this.st) {
      case 'intro':                                       // rises out of the middle of the pool, roars, dives
        if (this.stT < 60) { place(this.hx, surf + 60 - this.stT * 1.7, -Math.PI / 2 + Math.sin(this.stT / 8) * .2); if (this.stT === 1) splash(this.hx, 20); }
        else place(this.hx, surf - 42, -Math.PI / 2 + .35 * -1);
        this.intro(); break;
      case 'move': case 'land': case 'dive': {            // under the lava (invulnerable): bubbles mark the next spot
        if (this.stT === 1) { if (this.hy < surf + 10) splash(this.hx); this.alpha = 1; this.next = this.dropFast ? 'tired' : this.pick2(); this.side = this.next === 'leap' ? -farSide() : farSide(); this.dropFast = false; }
        if (this.st !== 'dive' && this.next === 'tired') { this.set('surface'); this.next = 'tired'; this.side = p.cx < (P.x0 + P.x1) / 2 ? -1 : 1; break; }
        place(this.hx, Math.min(surf + 80, this.hy + 5), Math.PI / 2 * U.sign(Math.cos(this.ang) || 1));
        if (this.hy > surf + 40) this.alpha = 0;
        bubbleMarks(edgeX(this.side));
        if (this.stT > (ph >= 3 ? 34 : ph >= 2 ? 46 : 60)) { this.alpha = 1; this.set(this.next === 'leap' ? 'leap' : 'surface'); }
        break;
      }
      case 'leap': {                                      // a long arc from one side of the pool to the other
        const D = ph >= 3 ? 64 : 76, H = ph >= 2 ? 190 : 160, s = this.side, x0 = edgeX(s), x1 = edgeX(-s), u = Math.min(1, this.stT / D);
        if (this.stT === 1) { splash(x0); blobs(x0); sfx().roar(); this.face(-s); }
        const x = x0 + (x1 - x0) * u, y = surf + 40 - 4 * (H + 40) * u * (1 - u), dx = (x1 - x0) / D, dy = -4 * (H + 40) * (1 - 2 * u) / D;
        place(x, y, Math.atan2(dy, dx));
        if (this.stT % 2 === 0) for (const [bx, by] of this.bodyPts()) if (by < surf && !p.dead && Math.abs(bx - p.cx) < 16 * k / 2.2 + p.w / 2 && Math.abs(by - (p.y + p.h / 2)) < 14 * k / 2.2 + p.h / 2) { p.hurt(1, bx, { src: this, elem: 'fire' }); break; }
        if (u >= 1) { splash(x1); blobs(x1); this.leaps = (this.leaps || 0) + 1;
          if (ph >= 2 && this.leaps < 2) { this.side = -s; this.set('leapWait'); } else { this.leaps = 0; this.set('dive'); this.next = null; } }
        break;
      }
      case 'leapWait': place(this.hx, Math.min(surf + 80, this.hy + 6)); this.alpha = this.hy > surf + 40 ? 0 : 1; bubbleMarks(edgeX(this.side)); if (this.stT > 26) { this.alpha = 1; this.set('leap'); } break;
      case 'surface': {                                   // comes up at the edge, then attacks
        const s = this.side, x = edgeX(s), face = -s;
        if (this.stT === 1) { splash(x); this.face(face); }
        const up = Math.min(1, this.stT / 22);
        place(x + s * 6 * (1 - up), surf + 50 - 92 * up, Math.atan2(-.55, face));
        if (this.stT > 26) { if (this.next === 'tired') this.set('tired'); else this.set(this.next); }
        break;
      }
      case 'laser': {                                     // aim line (where you WERE) → beam; phase 3 fires twice
        const s = this.side, face = -s;
        const hornX = this.hx + face * 26 * k / 2.2, hornY = this.hy - 12 * k / 2.2;
        if (this.stT === 1 || this.stT === 64) { this.aim = { x: p.cx, y: p.y + p.h / 2 }; sfx().charge(); }
        const t = this.stT >= 64 ? this.stT - 63 : this.stT, wind = ph >= 3 ? 26 : 34;
        const a = Math.atan2(this.aim.y - hornY, this.aim.x - hornX); this.ang = Math.atan2(Math.sin(a) * .6 - .3, Math.cos(a));
        this.beam = { x: hornX, y: hornY, a, on: t > wind && t <= wind + 26, warn: t <= wind };
        if (this.beam.warn && t % 6 < 3) this.flash = 2;
        if (this.beam.on) {
          if (t === wind + 1) { sfx().big(); g.shake(4); }
          const ux = Math.cos(a), uy = Math.sin(a), px = p.cx - hornX, py = p.y + p.h / 2 - hornY, along = px * ux + py * uy, off = Math.abs(px * -uy + py * ux);
          if (along > 0 && off < 9 + Math.min(p.w, p.h) / 2 && !p.dead) p.hurt(2, hornX, { src: this, elem: 'fire' });
          if (t % 2 === 0) g.parts.push({ x: hornX + ux * U.rnd(20, 400), y: hornY + uy * U.rnd(20, 400), vx: U.rnd(-1, 1), vy: U.rnd(-1, 1), life: 12, col: '#ffb0b0', size: 3, fade: true });
        }
        place(this.hx, this.hy + Math.sin(this.stT / 6) * .3);
        if (t > wind + 30) { this.beam = null; if (ph >= 3 && this.stT < 64) { this.stT = 63; } else this.set('tired'); }
        break;
      }
      case 'bubbles': {
        const s = this.side, face = -s, n = ph >= 3 ? 7 : ph >= 2 ? 5 : 3;
        place(this.hx, this.hy + Math.sin(this.stT / 5) * .6, Math.atan2(-.3 + Math.sin(this.stT / 6) * .25, face));
        if (this.stT === 1) g.text(this.hx, this.hy - 40, 'ฟองลาวา!', '#ffb08a', 40);
        if (this.stT >= 16 && (this.stT - 16) % 14 === 0 && this.stT < 16 + n * 14) {
          const mx = this.hx + face * 28 * k / 2.2, my = this.hy + 4, i = (this.stT - 16) / 14;
          g.spawnProj('bubble', mx, my, face, { vx: face * (1.3 + (i % 3) * .35), vy: 0 }); sfx().shoot();
        }
        if (this.stT > 30 + n * 14) this.set('tired');
        break;
      }
      case 'tired': {                                     // the head rests on the shore: the punish window
        const s = this.side, shoreX = s > 0 ? P.x1 + 22 : P.x0 - 22, face = s;
        const u = Math.min(1, this.stT / 20);
        place(this.hx + (shoreX - this.hx) * u * .25, this.hy + ((surf - 16) - this.hy) * u * .25, Math.atan2(-.4, face));   // chin on the shore, the body sloping down into the lava
        this.vulnerable = this.stT > 14; this.face(face);
        if (this.stT === 16) g.text(this.hx, this.hy - 34, 'เหนื่อย! ตีหัวเลย!', '#8aff8a', 60);
        if (this.stT > (ph >= 3 ? 80 : 110)) this.set('dive');
        break;
      }
      default: this.set('dive');
    }
    this.vx = 0; this.vy = 0;
  }
  // serpent: up on the ledges → it leaps through them · standing still on a shore → laser · jumping around → bubbles
  pick2() { const m = this.mind, ph2 = this.phase >= 2, p = this.g.player, ledge = p.feet < this.pool.y - 40;
    const n = this.choose([['leap', (ph2 ? 2 : 1.2) + (ledge ? 3 : 0)], ['laser', 1.6 + (m.still > 30 ? 2 : 0) + (ph2 ? .6 : 0)], ['bubbles', 1.2 + (m.air > .45 ? 2 : 0)]]);
    if (n === 'leap' && ledge) this.think('บนสะพานก็ไม่รอด'); return n; }
  // serpent: points along the body (head first) — for contact damage and drawing
  bodyPts() {
    const k = this.def.scale, out = [[this.hx, this.hy]], c = Math.cos(this.ang), s = Math.sin(this.ang);
    for (let i = 1; i <= 4; i++) out.push([this.hx - c * i * 17 * k, this.hy - s * i * 17 * k + Math.sin(this.t / 8 + i) * 2]);
    return out;
  }
  /* the horned serpent is drawn from pieces: tail (body.png) → flapping fin → head, everything under the lava hidden */
  drawSerpent(ctx) {
    const A = PLAT.assets, k = this.def.scale, P = this.pool; if (!P) return;
    let alpha = this.alpha != null ? this.alpha : 1; if (this.dead) alpha *= Math.max(0, 1 - this.deadT / 110);
    if (alpha <= 0) return;
    const fl = this.flash > 0 && this.flash % 2 ? .8 : this.vulnerable && this.t % 16 < 8 ? .25 : 0;
    const piece = (src, x, y, ang, ax, ay, rot) => {     // a piece that points LEFT in its image, turned to point along `ang`
      const im = A.img(src); if (!im) return;
      ctx.save(); ctx.translate(x, y);
      if (Math.cos(ang) <= 0) ctx.rotate(ang - Math.PI); else { ctx.rotate(ang); ctx.scale(-1, 1); }
      if (rot) ctx.rotate(rot);
      ctx.scale(k, k); ctx.drawImage(im, -ax, -ay);
      if (fl) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= fl; ctx.drawImage(im, -ax, -ay); }
      ctx.restore();
    };
    ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
    if (this.dead) { const im = A.img('bosses/serpent/dead.png'); if (im) { ctx.translate(this.hx, Math.min(this.hy, P.y - 6)); ctx.scale(k * (this.dir > 0 ? -1 : 1), k); ctx.drawImage(im, -im.width / 2, -im.height + 6); } ctx.restore(); return; }
    ctx.beginPath(); ctx.rect(this.hx - 600, this.hy - 600, 1200, P.y + 2 - (this.hy - 600)); ctx.clip();     // nothing below the lava surface
    const c = Math.cos(this.ang), s = Math.sin(this.ang), neck = [this.hx - c * 12 * k, this.hy - s * 12 * k];
    // the tail follows the head's path a little (trail), so arcs curve
    const tr = this.trail && this.trail[Math.min(this.trail.length - 1, 10)] || [this.hx - c * 60, this.hy - s * 60];
    let ba = Math.atan2(this.hy - tr[1], this.hx - tr[0]); if (!isFinite(ba) || Math.hypot(this.hx - tr[0], this.hy - tr[1]) < 24) ba = this.ang;   // the way it is moving
    else { let d = ba - this.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); ba = this.ang + U.clamp(d, -.7, .7); }                                   // a gentle bend, never a fold
    const fin = 'bosses/serpent/fin' + (1 + Math.floor(this.t / 6) % 4) + '.png';
    piece('bosses/serpent/body.png', neck[0], neck[1], ba, 8, 7);
    const bc = Math.cos(ba), bs = Math.sin(ba);
    piece(fin, neck[0] - bc * 22 * k, neck[1] - bs * 22 * k + 6, ba, 8, 2);
    const head = this.st === 'bubbles' || (this.beam && this.beam.on) ? 'bosses/serpent/head2.png' : this.st === 'tired' || this.st === 'laser' ? 'bosses/serpent/head1.png' : 'bosses/serpent/head0.png';
    piece(head, this.hx, this.hy, this.ang, 15, 12);
    ctx.restore();
    // the surface around it: a glowing ring where it breaks the lava
    if (this.hy > P.y - 60 && alpha > 0) { ctx.fillStyle = 'rgba(255,220,120,.55)'; ctx.beginPath(); ctx.ellipse(this.hx, P.y + 2, 26 + Math.sin(this.t / 5) * 4, 4, 0, 0, 6.283); ctx.fill(); }
    const b = this.beam;
    if (b) {
      const L = 900, ex = b.x + Math.cos(b.a) * L, ey = b.y + Math.sin(b.a) * L;
      ctx.save(); ctx.lineCap = 'round';
      if (b.warn) { ctx.strokeStyle = this.t % 8 < 4 ? 'rgba(255,60,60,.85)' : 'rgba(255,200,120,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); }
      if (b.on) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,40,60,.55)'; ctx.lineWidth = 18 + Math.sin(this.t) * 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fff0f0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); }
      ctx.restore();
    }
    if (this.st === 'stagger') this.g.drawStars(ctx, this.hx, this.hy - 30, this.t);
  }
  breakPoise() {
    if (!this.dead && this.poise <= 0 && this.st !== 'stagger' && this.st !== 'intro' && this.st !== 'phase') {
      this.poise = this.maxPoise; this.alpha = 1;
      if (this.flying) { this.passes = 0; this.set('land'); this.dropFast = true; }
      else this.set('stagger');
      this.g.text(this.cx, this.y - 16, 'เสียหลัก! ตีแรง ×2', '#8aff8a', 60, true); sfx().heavy(); this.g.shake(4);
    }
  }
  kill(o) {
    this.dead = true; this.deadT = 0; this.vx = 0; sfx().roar(); this.g.hitstop(8); this.g.shake(10);
    this.beam = null; this.alpha = 1;
    if (this.type === 'scribe') for (const e of this.g.enemies) if (!e.dead && !e.boss) e.kill({});      // his ink fades with him
    if (this.anim.sheet.anims.dead) this.anim.play('dead', 80, true);
    this.g.onEnemyKilled(this);
  }
  draw(ctx) {
    if (this.type === 'serpent') return this.drawSerpent(ctx);
    const d = this.def, face = -this.dir, fr = this.anim.frame();
    if (this.rollA) {                                    // v115 snail tank rolling in its shell: spin round the shell's middle
      const b = this.anim.sheet.bounds ? this.anim.sheet.bounds(fr) : null, sc = d.scale;
      const ox = b ? (b.x0 + b.x1) / 2 * sc * face : 0, r = b ? -(b.y0 + b.y1) / 2 * sc : this.h * .5;   // bounds are anchor-relative   // the shell's visual centre
      ctx.save(); ctx.translate(this.cx + ox, this.feet - r); ctx.rotate(this.rollA);
      PLAT.drawFrame(ctx, fr, -ox, r, face, sc, { flash: this.flash > 0 && this.flash % 2 ? .8 : 0 }); ctx.restore(); return;
    }
    let alpha = this.alpha != null ? this.alpha : 1; if (this.dead && this.deadT > 90) alpha *= Math.max(0, 1 - (this.deadT - 90) / 30);
    const o = { alpha, flash: this.flash > 0 && this.flash % 2 ? .8 : 0 };
    if (this.vulnerable && this.t % 16 < 8) o.flash = Math.max(o.flash, .25);
    if (d.ink) {
      o.ink = !(this.dead && this.deadT > 30);            // v121: as the Scribe falls, the ink washes off — the man underneath
      if (this.auraT > 0 && !this.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.auraT / 50 * .5; ctx.fillStyle = this.aura || '#a07aff';
        ctx.beginPath(); ctx.ellipse(this.cx, this.feet - this.h * .55, this.w * 1.6, this.h * .8, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      if (!this.dead && this.t % 6 === 0) this.g.parts.push({ x: this.cx + U.rnd(-14, 14), y: this.feet - U.rnd(10, 80), vx: U.rnd(-.3, .3), vy: .5, grav: .06, life: 30, col: this.t % 12 ? '#2a0e52' : '#a07aff', size: 3, fade: true });
    }
    if (!PLAT.drawFrame(ctx, fr, this.cx - this.cOff * this.sc * face, this.feet, face, this.drawScale || d.scale, o)) { ctx.fillStyle = '#a33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.st === 'stagger') this.g.drawStars(ctx, this.cx, this.y - 10, this.t);
    const b = this.beam;
    if (b && !this.dead) {                                // the Scribe's lance (the serpent's beam, in violet)
      const L = 900, ex = b.x + Math.cos(b.a) * L, ey = b.y + Math.sin(b.a) * L;
      ctx.save(); ctx.lineCap = 'round';
      if (b.warn) { ctx.strokeStyle = this.t % 8 < 4 ? 'rgba(200,120,255,.9)' : 'rgba(255,200,255,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); }
      if (b.on) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,60,255,.55)'; ctx.lineWidth = 18 + Math.sin(this.t) * 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#f6e8ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); }
      ctx.restore();
    }
  }
}
PLAT.Enemy = Enemy; PLAT.Boss = Boss;
PLAT.makeEnemy = (g, type, x, y, elite) => PLAT.BOSSES[type] ? new Boss(g, type, x, y) : new Enemy(g, type, x, y, elite);
})(typeof window !== 'undefined' ? window : globalThis);
