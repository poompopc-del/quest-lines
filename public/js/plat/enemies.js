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
const zSheet = (img, tall) => ({ kind: 'grid', img, cols: 10, fw: tall ? 52 : 51, fh: tall ? 75 : 59, ax: 31, by: tall ? 64 : 51,
  anims: { idle: row(0, 10), move: row(1, 10), atk: row(2, 10), dead: row(3, 10), hurt: [20] } });

PLAT.ENEMY_CODES = { s: 'slime', j: 'hopper', g: 'golden', m: 'magma', z: 'zombie', c: 'cone', b: 'bucket', w: 'ghost', l: 'licker', t: 'tyrant', h: 'salvador' };
// ELITE versions (upper case): more HP and poise, a pink aura, and one extra trick each (see think())
PLAT.ELITE_CODES = { Z: 'zombie', J: 'hopper', M: 'magma', W: 'ghost', L: 'licker', T: 'tyrant' };
const E = PLAT.ENEMIES = {
  slime:  { name: 'Green Slime', sheet: slimeSheet('green'), scale: .5, box: [26, 22], hp: 2, dmg: 1, ai: 'patrol', speed: .55, coins: 1, small: true, fps: 6 },
  hopper: { name: 'Devil Slime', sheet: slimeSheet('devil', true), scale: .55, box: [30, 24], hp: 3, dmg: 1, ai: 'hopper', jumpV: 7.6, jumpX: 2.4, wait: 54, sight: 210, coins: 2, small: true, fps: 6 },
  golden: { name: 'Golden Slime', sheet: slimeSheet('golden'), scale: .5, box: [26, 22], hp: 3, dmg: 0, ai: 'coward', speed: 2, sight: 150, coins: 10, small: true, fps: 8, sparkle: true },
  magma:  { name: 'Magma Slime', sheet: slimeSheet('magma'), scale: .55, box: [28, 24], hp: 3, dmg: 1, ai: 'hopper', jumpV: 8.2, jumpX: 2.8, wait: 44, sight: 240, coins: 2, small: true, fps: 7, trail: '#ff8a2a' },
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
  salvador: { name: 'Chainsaw Man', sheet: { kind: 'grid', img: 'enemies/re/salvador.png', cols: 7, fw: 56, fh: 72, ax: 40, by: 71, anims: { idle: [0, 1], move: [0, 1], atk: [2, 3], rev: [4, 5], dead: [6] } },
            scale: .85, box: [26, 34], hp: 6, dmg: 2, ai: 'charger', speed: .5, sight: 230, coins: 5, fps: 6, poise: 3 },
};

/* --------------------------------- enemy ---------------------------------
   Every damaging move follows WIND-UP (readable: flash + "!" + pose) → ACTIVE (the only frames
   that hurt) → RECOVERY (open to a counter-attack). A crowd shares 2 attack tokens (game.takeToken)
   so enemies take turns. Being hit puts an enemy in hit-stun (no contact damage, AI paused);
   light enemies are interrupted by any hit, heavy ones only when their poise breaks (stagger). */
const TELE = { bite: 1, crouch: 1, aim: 1, rev: 1, tele: 1 };
class Enemy {
  constructor(g, type, x, y, elite) {
    const d = this.def = E[type] || PLAT.BOSSES[type]; this.type = type; this.g = g; this.elite = !!elite && !d.boss;
    this.sc = d.scale * (this.elite ? 1.15 : 1);
    const geo = g.geom && g.geom[type], k = this.sc / d.scale;
    this.w = Math.round((geo ? geo.w : d.box[0]) * k); this.h = Math.round((geo ? geo.h : d.box[1]) * k); this.cOff = geo ? geo.c / d.scale : 0;
    this.x = x - this.w / 2; this.y = y - this.h; this.home = { x: this.x, y: this.y };
    this.vx = 0; this.vy = 0; this.dir = -1; this.hp = d.hp * (this.elite ? 2 : 1) + (this.elite ? 1 : 0); this.maxHp = this.hp; this.armor = d.armor || 0;
    this.maxPoise = (d.poise || 1) * (this.elite ? 2 : 1); this.poise = this.maxPoise;
    this.t = U.rint(0, 60); this.st = 'idle'; this.stT = 0; this.flash = 0; this.kbT = 0; this.stunT = 0; this.cool = U.rint(20, 60);
    this.lastHit = new Set(); this.dead = false; this.deadT = 0; this.gone = false; this.stuckT = 0; this.lastX = this.x; this.combo = 0;
    this.anim = new PLAT.Anim(g.sheets.get(this.sheetKey()), {});
    this.anim.play('move');
  }
  sheetKey() { return this.type + (this.armorStage != null ? ':' + this.armorStage : ''); }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  set(st) { this.st = st; this.stT = 0; }
  seesPlayer(range, dyMax) {
    const p = this.g.player; if (!p || p.dead) return false;
    return Math.abs(p.cx - this.cx) < range && Math.abs(p.feet - this.feet) < (dyMax || 80);
  }
  token() { return this.g.takeToken(this); }
  release() { this.g.dropToken(this); }
  // a hit (or a stagger) cancels a wind-up / attack in progress
  interrupt(next) { if (TELE[this.st] || this.st === 'swoop' || this.st === 'charge') { this.set(next || 'walk'); this.cool = 50; this.blocking = false; this.release(); } }

  update() {
    const d = this.def, g = this.g, p = g.player; this.t++; this.stT++;
    if (this.flash > 0) this.flash--; if (this.cool > 0) this.cool--; if (this.stunT > 0) this.stunT--;
    if (this.dead) { this.deadT++; this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); if (!d.ghost && !this.inhaled) W.moveBody(g.L, this, this.vx *= .9, this.vy); if (this.deadT > 50) this.gone = true; this.anim.update(); return; }
    if (this.inhaled) return;
    if (this.kbT > 0) { this.kbT--; this.vx *= .86; }
    else this.think(p);
    if (d.ai !== 'flyer') {
      this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL);
      W.moveBody(g.L, this, this.vx, this.vy);
      if (this.y > g.L.ph + 64) { this.fell = true; this.kill({}); this.gone = true; return; }
      // hazards hurt enemies too (knock one into lava!)
      if (W.tilesIn(g.L, this.box(), PLAT.TILE.LIQUID).length) { this.fell = true; this.takeHit(99, { dir: 0, id: -1 }); }
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
            else { this.combo = 0; this.set('walk'); this.cool = 60; this.release(); }
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
          if (this.stT >= 26) { const tx = p.cx, ty = p.y + p.h / 2, dx = tx - this.cx, dy = ty - (this.y + this.h / 2), dd = Math.hypot(dx, dy) || 1; this.sw = { vx: dx / dd * 3.4, vy: dy / dd * 3.4 }; this.set('swoop'); sfx().dash(); }
          break; }
        if (this.st === 'swoop') { this.vx = this.sw.vx; this.vy = this.sw.vy; if (this.t % 2 === 0) g.afterimage(this); if (this.stT >= 34) { if (this.elite && ++this.combo < 2) this.set('tele'); else { this.combo = 0; this.set('recover'); this.release(); this.cool = 100; } } break; }
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
      case 'leaper': {
        if (this.st === 'crouch') {
          this.vx = 0; if (this.stT % 6 < 3) this.flash = 2;
          if (this.stT >= (this.elite ? 18 : 24)) { this.vy = -6.2; this.vx = this.dir * 4.3; this.set('leap'); this.anim.play('atk', 40, true); sfx().swing(); }
          break;
        }
        if (this.st === 'leap') { if (this.onGround && this.stT > 4) { if (this.elite && ++this.combo < 2) { this.face(toP); this.set('crouch'); } else { this.combo = 0; this.set('rest'); this.vx = 0; this.release(); this.cool = 60; } } break; }
        if (this.st === 'rest') { this.vx *= .8; this.anim.play('idle'); if (this.stT > 60) this.set('idle'); break; }
        if (this.onGround && this.cool <= 0 && this.seesPlayer(d.sight, 70) && this.token()) { this.face(toP); this.set('crouch'); this.anim.play('idle'); break; }
        this.walkTurn(L);
        this.vx = this.dir * d.speed; this.anim.play('move');
        break;
      }
      case 'shooter': {
        if (this.st === 'aim') {
          this.vx = 0; this.face(toP); if (this.stT % 8 < 4) this.flash = 1;
          if (this.stT === 28) {
            const sx = this.cx + this.dir * 18, sy = this.y + 16, a = Math.atan2((p.y + p.h / 2) - sy, Math.abs(p.cx - sx));
            const base = U.clamp(a, -.5, .5), shots = this.elite ? [-.22, 0, .22] : [0];
            for (const o of shots) g.spawnProj('fireball', sx, sy, this.dir, { vx: this.dir * Math.cos(base + o) * 3.2, vy: Math.sin(base + o) * 3.2 });
            sfx().shoot();
          }
          if (this.stT > 48) { this.set('walk'); this.release(); this.cool = d.rate; }
          break;
        }
        const sees = this.seesPlayer(d.sight, 140) && W.clearLine(L, this.cx, this.y + 14, p.cx, p.y + p.h / 2);
        if (sees) {
          this.face(toP);
          // keep its distance: back off when you get close (if there is floor behind)
          const tooClose = Math.abs(p.cx - this.cx) < 90 && Math.abs(p.feet - this.feet) < 40;
          if (tooClose && this.onGround && W.floorAhead(L, this, -this.dir) && !W.wallAhead(L, this, -this.dir)) { this.vx = -this.dir * .7; this.anim.play('move'); }
          else { this.vx = 0; this.anim.play('idle'); }
          if (this.cool <= 0 && this.token()) { this.set('aim'); this.anim.play('atk', 48, true); }
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
        if (this.st === 'dizzy') { this.vx = 0; this.anim.play('idle'); if (this.stT > 80) { this.set('walk'); this.cool = 60; } break; }
        if (this.onGround && this.cool <= 0 && this.seesPlayer(d.sight, 40) && this.token()) { this.face(toP); this.set('rev'); break; }
        this.walkTurn(L);
        this.vx = this.dir * d.speed; this.anim.play('move');
        break;
      }
    }
  }
  // returns true if the hit counted (for hit-stop / energy)
  takeHit(dmg, o) {
    if (this.dead || this.inhaled) return false;
    if (o.id != null && o.id !== -1) { if (this.lastHit.has(o.id)) return false; this.lastHit.add(o.id); if (this.lastHit.size > 40) this.lastHit = new Set([...this.lastHit].slice(-20)); }
    const g = this.g, d = this.def;
    // frontal block (charging chainsaw) — jump over it and hit its back, or wait for the crash
    if (this.blocking && o.dir && U.sign(o.dir) === -this.dir && !o.pogo) { sfx().clang(); g.burst(this.cx + this.dir * 12, this.y + 14, '#ffffff', 6, 2); g.text(this.cx, this.y - 6, 'กัน!', '#d0d8e0', 26); return false; }
    if (this.st === 'dizzy' || this.vulnerable) dmg *= 2;
    if (this.armor > 0) {
      const ad = d.heavyArmor && !o.pogo && !o.body ? Math.max(1, dmg - 1) : dmg;
      this.armor = Math.max(0, this.armor - ad); sfx().clang(); g.burst(this.cx, this.y + 4, '#d8dde8', 6, 2); this.flash = 6;
      this.updateArmorSheet();
      this.kbT = 6; this.stunT = 8; this.vx = (o.dir || 0) * 1.2;
      return true;
    }
    this.hp -= dmg; this.flash = 8;
    g.text(this.cx, this.y - 4, String(dmg), dmg >= 4 ? '#ffd84a' : '#ffffff', 32);
    if (this.hp <= 0) { this.kill(o); return true; }
    this.poise -= dmg;
    const dirKb = o.dir || U.sign(this.cx - (o.from ? o.from.cx : this.cx)) || 1;
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
  updateArmorSheet() {
    const d = this.def; if (!d.states) return;
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
    sfx().kill(); g.burst(this.cx, this.y + this.h / 2, d.ghost ? '#c8d0ff' : '#ffffff', 14, 2.6);
    g.onEnemyKilled(this);
  }
  draw(ctx) {
    const d = this.def; if (this.inhaled) return;
    let alpha = 1;
    if (this.dead && !this.anim.sheet.anims.dead) alpha = Math.max(0, 1 - this.deadT / 30);
    else if (this.dead && this.deadT > 34) alpha = Math.max(0, 1 - (this.deadT - 34) / 16);
    if (d.ghost) alpha *= .72 + Math.sin(this.t / 9) * .2;
    const o = { alpha, flash: this.flash > 0 && this.flash % 2 ? .9 : 0, sy: 1, sx: 1 };
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
  aqua: { name: 'AQUA SPIRIT', th: 'วิญญาณวารี', boss: true, hp: 34, dmg: 1, poise: 9, scale: 1.15, box: [34, 56],
    sheet: { kind: 'grid', img: 'bosses/aqua/boss.png', cols: 6, fw: 100, fh: 100, ax: 50, by: 98, anims: { idle: [0, 1, 2, 3], move: [0, 1, 2, 3], atk: [4], hurt: [5] } }, fps: 6, heavy: true },
  garg: { name: 'GARGANTUAR', th: 'การ์แกนทัวร์ ยักษ์เสาไฟฟ้า', boss: true, hp: 50, dmg: 1, poise: 12, scale: .95, box: [42, 70],
    sheet: { kind: 'grid', img: 'enemies/pvz/garg.png', cols: 10, fw: 126.8, fh: 127.6, ax: 80.5, by: 99,
      anims: { idle: row(0, 10), move: row(1, 9), raise: [18, 19, 20, 21], smash: range(22, 29), stuck: [29], dead: range(40, 48) } }, fps: 8, heavy: true },
  dragon: { name: 'BLACK DRAGON', th: 'มังกรทมิฬ เปลวนรก', boss: true, hp: 72, dmg: 1, poise: 16, scale: 1.2, box: [112, 82],
    sheet: { kind: 'grid', img: 'bosses/dragon/blackdragon.png', cols: 37, fw: 246, fh: 134, ax: 128, by: 134,
      anims: { idle: range(0, 12), breath: range(13, 19), hurt: [20, 21, 22, 23], dead: range(24, 28), fly: range(29, 36) } }, fps: 8, heavy: true },
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
    const before = this.phase; this.phase = this.hp <= this.maxHp * .25 ? 3 : this.phase2 ? 2 : 1;
    if (this.phase !== before) {
      // PHASE CHANGE: a readable pause — roar, blast the player back (no damage), clear the field, then new patterns
      g.text(this.cx, this.y - 20, this.phase === 2 ? 'โกรธแล้ว!!' : 'บ้าคลั่ง!!!', '#ff4a4a', 80, true); sfx().roar(); g.shake(6); g.clearHostile();
      const p = g.player; if (p && !p.dead) { p.vx = (p.cx < this.cx ? -1 : 1) * 5; p.vy = -4; p.act = null; }
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
      case 'rest': this.vx = 0; this.anim.play('idle'); this.vulnerable = true; if (this.stT > (this.phase >= 2 ? 30 : 50)) this.set('move'); break;
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
          if (U.overlap(hb, p)) p.hurt(2, this.cx);
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
        if (this.y + this.h >= this.groundY - 1) { const p2 = g.player; if (p2 && U.overlap(this, p2)) p2.hurt(1, this.cx); }
        if (this.y + this.h >= this.groundY) { this.y = this.groundY - this.h; this.flying = false; this.dropFast = false; sfx().boom(); g.shake(6); g.dust(this.cx, this.feet, 14); this.set('tired'); g.text(this.cx, this.y - 14, 'มังกรเหนื่อย! โจมตี!', '#8aff8a', 60); }
        break;
      case 'tired': this.vx = 0; this.anim.play('hurt'); this.vulnerable = true; if (this.stT > 90) this.set('move'); break;
      case 'rest': this.vx = 0; this.anim.play('idle'); if (this.stT > 40) this.set('move'); break;
    }
  }
  takeHit(dmg, o) {
    if (this.st === 'intro' || this.st === 'phase' || this.alpha === 0) return false;
    const ok = super.takeHit(dmg, o);
    if (ok) {
      this.g.bossHit(this);
      // poise break → STAGGER: the boss reels (takes double damage); a flying dragon is knocked out of the sky
      if (!this.dead && this.poise <= 0 && this.st !== 'stagger') {
        this.poise = this.maxPoise; this.alpha = 1;
        if (this.flying) { this.passes = 0; this.set('land'); this.dropFast = true; }
        else this.set('stagger');
        this.g.text(this.cx, this.y - 16, 'เสียหลัก! ตีแรง ×2', '#8aff8a', 60, true); sfx().heavy(); this.g.shake(4);
      }
    }
    return ok;
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
    if (!PLAT.drawFrame(ctx, fr, this.cx - this.cOff * this.sc * face, this.feet, face, d.scale, o)) { ctx.fillStyle = '#a33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.st === 'stagger') this.g.drawStars(ctx, this.cx, this.y - 10, this.t);
  }
}
PLAT.Enemy = Enemy; PLAT.Boss = Boss;
PLAT.makeEnemy = (g, type, x, y, elite) => PLAT.BOSSES[type] ? new Boss(g, type, x, y) : new Enemy(g, type, x, y, elite);
})(typeof window !== 'undefined' ? window : globalThis);
