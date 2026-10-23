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
  k: 'skel', q: 'goblin', n: 'shroom', e: 'eye', r: 'rat', v: 'bat', d: 'goo', x: 'mimic' };
// ELITE versions (upper case): more HP and poise, a pink aura, and one extra trick each (see think())
PLAT.ELITE_CODES = { Z: 'zombie', J: 'hopper', M: 'magma', W: 'ghost', L: 'licker', T: 'tyrant', I: 'skel', Q: 'goblin', N: 'shroom', V: 'bat', D: 'goo' };
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
  salvador: { name: 'Chainsaw Man', sheet: { kind: 'grid', img: 'enemies/re/salvador.png', cols: 7, fw: 56, fh: 72, ax: 40, by: 71, anims: { idle: [0, 1], move: [0, 1], atk: [2, 3], rev: [4, 5], dead: [6] } },
            scale: .85, box: [26, 34], hp: 6, dmg: 2, ai: 'charger', speed: .5, sight: 230, coins: 5, fps: 6, poise: 3 },
};

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
    if (this.boss) { this.poise -= perfect ? 10 : 6; this.flash = 8; if (this.breakPoise) this.breakPoise(); return; }
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
    if (this.st === 'crouch') { o.sy = .82; o.sx = 1.12; }
    if (this.st === 'dizzy' && this.t % 20 < 10) o.rot = .06;
    const face = -this.dir;    // sheets face left
    const fr = this.anim.frame(), x = this.cx - this.cOff * this.sc * face;
    if (this.elite && !this.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + Math.sin(this.t / 6) * .15; PLAT.drawFrame(ctx, fr, x, this.feet + 1, face, this.sc * 1.06, { alpha: 1 }); ctx.restore(); }
    if (!PLAT.drawFrame(ctx, fr, x, this.feet + (d.ghost ? Math.sin(this.t / 14) * 3 : 0), face, this.sc, o)) { ctx.fillStyle = '#c33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.st === 'dizzy') this.g.drawStars(ctx, this.cx, this.y - 6, this.t);
    // wind-up warning above the head
    if (!this.dead && TELE[this.st] && this.st !== 'charge') { ctx.font = '800 14px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000a'; ctx.strokeText('!', this.cx, this.y - 8); ctx.fillStyle = this.t % 8 < 4 ? '#ff4a4a' : '#ffd84a'; ctx.fillText('!', this.cx, this.y - 8); }
    if (this.elite && !this.dead) { ctx.font = '800 10px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff8ae8'; ctx.fillText('★ ELITE', this.cx, this.y - (TELE[this.st] ? 22 : 8)); }
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
    else this[this.type]();
    if (!this.flying) { this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); W.moveBody(g.L, this, this.vx, this.vy); }
    this.anim.update();
  }
  pick(list) { const n = list[this.pat++ % list.length]; this.set(n); return n; }
  intro(name) { if (this.stT === 1) { PLAT.sfx.roar(); this.g.shake(5); this.g.bossIntro(this); } if (this.stT > 80) this.set('move'); }
  arena() { return this.g.L.arena || { x0: T, x1: this.g.L.pw - T }; }

  aqua() {
    const g = this.g, p = g.player, A = this.arena(), sp = this.phase >= 2 ? 1.5 : 1, toP = U.sign(p.cx - this.cx) || this.dir;
    this.vulnerable = false;
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move':
        this.face(toP); this.vx = this.dir * .9 * sp; this.anim.play('move');
        if (this.stT > (this.phase >= 2 ? 70 : 110)) this.pick(this.phase >= 2 ? ['wave', 'rain', 'warp', 'wave2', 'rain'] : ['wave', 'rain', 'wave', 'warp']);
        break;
      case 'wave': case 'wave2':
        this.vx = 0; this.face(toP); this.anim.play(this.stT < 24 ? 'idle' : 'atk'); if (this.stT < 24 && this.stT % 6 < 3) this.flash = 2;
        if (this.stT === 24) { g.spawnProj('wave', this.cx + this.dir * 20, this.feet, this.dir, { speed: 2.8 * sp }); sfx().big(); if (this.st === 'wave2' || this.phase >= 3) g.spawnProj('wave', this.cx - this.dir * 20, this.feet, -this.dir, { speed: 2.4 * sp }); }
        if (this.stT > 60) { this.set('rest'); }
        break;
      case 'rain': {
        this.vx = 0; this.anim.play('atk');
        const n = this.phase >= 2 ? 9 : 6;
        if (this.stT === 10) { g.text(this.cx, this.y - 14, 'ฝนวารี!', '#7ad8ff', 50); sfx().big(); }
        if (this.stT >= 16 && this.stT < 16 + n * 8 && (this.stT - 16) % 8 === 0) { const x = U.clamp(p.cx + U.rnd(-120, 120), A.x0 + 10, A.x1 - 10); g.warn(x, g.floorBelow(x, p.y), 40, () => g.spawnProj('drop', x, g.cam.y - 10, 0, { vy: 1 })); }
        if (this.stT > 30 + n * 8) this.set('rest');
        break;
      }
      case 'warp':
        this.vx = 0;
        if (this.stT < 30) this.alpha = 1 - this.stT / 30;
        else if (this.stT === 30) { const left = p.cx > (A.x0 + A.x1) / 2; this.x = (left ? A.x0 + 40 : A.x1 - 40) - this.w / 2; this.alpha = 0; }
        else if (this.stT < 56) this.alpha = (this.stT - 30) / 26;
        else { this.alpha = 1; this.set(this.phase >= 2 ? 'wave2' : 'wave'); }
        break;
      case 'rest': this.vx = 0; this.anim.play('idle'); this.vulnerable = true; if (this.stT > (this.phase >= 2 ? 30 : 50) * TUNE.bossRest) this.set('move'); break;
    }
  }
  garg() {
    const g = this.g, p = g.player, toP = U.sign(p.cx - this.cx) || this.dir, fast = this.phase >= 2;
    this.vulnerable = false;
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move':
        this.face(toP); this.vx = this.dir * (fast ? 1.05 : .7); this.anim.play('move');
        if (Math.abs(p.cx - this.cx) < 120 || this.stT > 170) { this.set('raise'); g.text(this.cx, this.y - 16, '⚠ ยกเสา!', '#ffd060', 40); }
        break;
      case 'raise': this.vx = 0; this.anim.play('raise', fast ? 26 : 36); if (this.stT % 6 < 3) this.flash = 2; if (this.stT >= (fast ? 26 : 36)) { this.set('smash'); this.anim.play('smash', 32, true); } break;
      case 'smash':
        this.vx = 0;
        if (this.stT === 12) {
          sfx().boom(); g.shake(8); g.hitstop(3);
          const hb = { x: this.dir > 0 ? this.cx : this.cx - 96, y: this.feet - 70, w: 96, h: 70 };
          if (U.overlap(hb, p)) p.hurt(2, this.cx, { elem: 'shock' });
          g.spawnProj('shock', this.cx + this.dir * 70, this.feet, this.dir, {}); g.spawnProj('shock', this.cx - this.dir * 10, this.feet, -this.dir, {});
          g.dust(this.cx + this.dir * 60, this.feet, 12);
          if (fast) { for (let i = 0; i < (this.phase >= 3 ? 7 : 5); i++) { const x = U.rnd(this.arena().x0 + 16, this.arena().x1 - 16); g.warn(x, g.floorBelow(x, p.y), 46 + i * 9, () => g.spawnProj('rock', x, g.cam.y - 10, 0, {})); } }
        }
        if (this.stT >= 32) { this.set('stuck'); g.text(this.cx, this.y - 16, 'เสาติดพื้น! โจมตีเลย!', '#8aff8a', 50); }
        break;
      case 'stuck': this.vx = 0; this.anim.play('stuck'); this.vulnerable = true; if (this.stT > (this.phase >= 3 ? 46 : 70)) { this.set(fast && !this.double ? 'raise' : 'move'); this.double = fast && !this.double; } break;
    }
  }
  dragon() {
    const g = this.g, p = g.player, A = this.arena(), toP = U.sign(p.cx - this.cx) || this.dir;
    this.vulnerable = false;
    switch (this.st) {
      case 'intro': this.intro(); break;
      case 'move':
        this.flying = false; this.face(toP); this.anim.play('idle');
        const want = p.cx - toP * 170; this.vx = U.clamp((want - this.cx) * .02, -1.2, 1.2);
        if (this.stT > (this.phase >= 3 ? 50 : 80)) this.pick(this.phase >= 2 ? ['breath', 'takeoff', 'breath', 'takeoff'] : ['breath', 'breath', 'stomp']);
        break;
      case 'stomp':
        if (this.stT < 18) { this.vx = 0; this.face(toP); if (this.stT % 6 < 3) this.flash = 2; break; }          // crouch = warning
        if (this.stT === 18) { this.vy = -7; g.warn(this.cx + this.dir * 70, this.groundY, 30); }
        this.vx = this.dir * 2.2;
        if ((this.stT > 26 && this.onGround) || this.stT > 140) { sfx().boom(); g.shake(7); g.spawnProj('shock', this.cx + 50, this.feet, 1, {}); g.spawnProj('shock', this.cx - 50, this.feet, -1, {}); this.vx = 0; this.set('rest'); }
        break;
      case 'breath': {
        this.vx = 0; this.face(toP);
        this.anim.play('breath', 70);
        if (this.stT < 22 && this.stT % 6 < 3) this.flash = 2;
        // volleys aimed at where you ARE when each one leaves — keep moving / jump and they miss
        const n = this.phase >= 3 ? 4 : this.phase >= 2 ? 3 : 2;
        if (this.stT >= 28 && this.stT < 28 + n * 13 && (this.stT - 28) % 13 === 0) {
          const sx = this.cx + this.dir * 70, sy = this.y + 20, aim = Math.atan2((p.y + p.h / 2) - sy, Math.abs(p.cx - sx));
          const a = U.clamp(aim, -.35, .75);
          g.spawnProj('fireball', sx, sy, this.dir, { vx: this.dir * Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, scale: .8 }); sfx().shoot();
        }
        if (this.stT >= 70) this.set('rest');
        break;
      }
      case 'takeoff':
        this.anim.play('fly'); this.flying = true; this.vx = 0; this.y -= 2.2;
        if (this.y < (g.L.arena ? g.L.arena.top : 2 * T)) { this.set('fly'); this.dir = this.cx < (A.x0 + A.x1) / 2 ? 1 : -1; }
        break;
      case 'fly':
        this.flying = true; this.anim.play('fly'); this.x += this.dir * (this.phase >= 3 ? 2.6 : 2); this.y += Math.sin(this.stT / 12) * .6;
        if (this.stT % (this.phase >= 3 ? 26 : 36) === 10) { g.spawnProj('bigfire', this.cx, this.y + this.h, 0, { vx: this.dir * .6, vy: 1, grav: .14 }); sfx().shoot(); }
        if ((this.dir > 0 && this.x + this.w > A.x1 - 10) || (this.dir < 0 && this.x < A.x0 + 10)) { this.dir = -this.dir; this.passes = (this.passes || 0) + 1; }
        if (this.passes >= 2) { this.passes = 0; this.set('land'); }
        break;
      case 'land':
        this.flying = true; this.anim.play('fly');
        if (this.stT === 1) g.warn(this.cx, this.groundY, 34);          // shadow where it will land
        if (this.stT < 34 && !this.dropFast) { this.y += Math.sin(this.stT / 5) * .4; break; }
        this.y += this.dropFast ? 6 : 4;
        if (this.y + this.h >= this.groundY - 1) { const p2 = g.player; if (p2 && U.overlap(this, p2)) p2.hurt(1, this.cx, { elem: 'fire' }); }
        if (this.y + this.h >= this.groundY) { this.y = this.groundY - this.h; this.flying = false; this.dropFast = false; sfx().boom(); g.shake(6); g.dust(this.cx, this.feet, 14); this.set('tired'); g.text(this.cx, this.y - 14, 'มังกรเหนื่อย! โจมตี!', '#8aff8a', 60); }
        break;
      case 'tired': this.vx = 0; this.anim.play('hurt'); this.vulnerable = true; if (this.stT > 90) this.set('move'); break;
      case 'rest': this.vx = 0; this.anim.play('idle'); if (this.stT > 40) this.set('move'); break;
    }
  }
  takeHit(dmg, o) {
    // intro roar / phase change / fully warped out: the boss cannot be hurt — say so (game.hit shows "ไม่มีผล")
    if (this.st === 'intro' || this.st === 'phase' || this.alpha === 0) { this.reject = 'immune'; return false; }
    const ok = super.takeHit(dmg, o);
    if (ok) {
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
        if (this.stT === 40) { this.form2 = true; this.anim = new PLAT.Anim(g.sheets.get(this.type + ':2'), {}); this.drawScale = d.scale2; this.cOff = 0; g.flashT = 14; sfx().boom(); g.burst(this.cx, this.y + this.h / 2, '#c86aff', 30, 4); }
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
          const near = Math.abs(p.cx - this.cx) < 120, minions = g.enemies.filter(e => !e.dead && !e.boss).length;
          if (!fast) this.pick(near ? ['slash', 'warp', 'slash2', 'bolts'] : ['bolts', 'warp', 'slash', 'bolts']);
          else this.pick(near ? ['slash2', minions < 3 ? 'summon' : 'cast', 'dash', 'cast', 'warp', 'rain'] : ['cast', 'rain', 'dash', minions < 3 ? 'summon' : 'cast', 'warp', 'slash2']);
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
          const sx = this.cx + this.dir * 34, sy = this.feet - 60, a = Math.atan2((p.y + p.h / 2) - sy, (p.cx - sx)), sp = 3.6;
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
        else if (this.stT === 22) { const side = -(p.face || 1), x = U.clamp(p.cx + side * 80, A.x0 + 30, A.x1 - 30); this.x = x - this.w / 2; this.alpha = 0; this.face(U.sign(p.cx - x) || 1); for (let i = 0; i < 12; i++) g.burst(x, this.feet - U.rnd(0, 80), '#c86aff', 1, 2); }
        else if (this.stT < 40) this.alpha = (this.stT - 22) / 18;
        else { this.alpha = 1; this.set(fast ? 'slash2' : 'slash'); }
        break;
      }
      case 'summon': {                                     // phase 2: bats from the dark, goo from the mud
        this.vx = 0; this.anim.play('atk', 40, false);
        if (this.stT === 1) g.text(this.cx, this.y - 16, 'อัญเชิญ!', '#c86aff', 50);
        if (this.stT === 24) {
          const n = Math.min(2, 3 - g.enemies.filter(e => !e.dead && !e.boss).length);
          for (let i = 0; i < n; i++) { const type = d.minions[(this.pat + i) % d.minions.length], x = U.clamp(this.cx + (i ? 90 : -90), A.x0 + 30, A.x1 - 30), fly = type === 'bat';
            const e = PLAT.makeEnemy(g, type, x, fly ? this.feet - 90 : this.feet); e.cool = 40; g.enemies.push(e); for (let k = 0; k < 10; k++) g.burst(x, (fly ? this.feet - 100 : this.feet) - U.rnd(0, 30), '#7aff8a', 1, 2); }
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
    if (this.anim.sheet.anims.dead) this.anim.play('dead', 80, true);
    this.g.onEnemyKilled(this);
  }
  draw(ctx) {
    const d = this.def, face = -this.dir, fr = this.anim.frame();
    let alpha = this.alpha != null ? this.alpha : 1; if (this.dead && this.deadT > 90) alpha *= Math.max(0, 1 - (this.deadT - 90) / 30);
    const o = { alpha, flash: this.flash > 0 && this.flash % 2 ? .8 : 0 };
    if (this.vulnerable && this.t % 16 < 8) o.flash = Math.max(o.flash, .25);
    if (!PLAT.drawFrame(ctx, fr, this.cx - this.cOff * this.sc * face, this.feet, face, this.drawScale || d.scale, o)) { ctx.fillStyle = '#a33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.st === 'stagger') this.g.drawStars(ctx, this.cx, this.y - 10, this.t);
  }
}
PLAT.Enemy = Enemy; PLAT.Boss = Boss;
PLAT.makeEnemy = (g, type, x, y, elite) => PLAT.BOSSES[type] ? new Boss(g, type, x, y) : new Enemy(g, type, x, y, elite);
})(typeof window !== 'undefined' ? window : globalThis);
