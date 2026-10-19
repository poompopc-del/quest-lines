/* ==========================================================================
   PLATFORM MODE · X (Mega Man X4-style) — hero module
   --------------------------------------------------------------------------
   Sprites: heroes/x4/*.png, cut by tools/plat-import-x.py from the sprite
   compilation sheet the developer supplied; frame tables / muzzle points /
   effects / palettes in js/plat/x4-sheet.js (generated).
   Behaviour follows the X4 reference clip:
     · beams in at the start of a level / after a retry, beams out at the exit
     · runs with a start-up step; shooting never stops him — the run, jump,
       dash, wall-slide and hover poses each have their own "buster out" frames
     · buster arm stays out ~⅓ s after a shot, muzzle flash at the cannon
     · charging flashes his palette (lv1 blue, lv2 green/pink), particles gather
     · dash: start → hold (afterimages, dust) → stand-up; hold the button for a
       longer dash, jump out of it to keep the speed (dash-jump)
     · wall: grab → slide (sparks) → kick; dies in X4's bubble burst
   ARMOUR (Q · pad L3/R3 · touch ⟳ button, on the ground): X → Force Armor →
   Ultimate Armor. The sheet has no armour-plated body frames, so each armour
   is shown in its X4 colours (palette swap) and brings its X4 abilities:
     both : air dash (once per jump) · hover (press jump again while falling)
            · ULT becomes NOVA STRIKE · fully charged shot = plasma (pierces)
     Ultimate: ↓ + skill = Nova Strike for 40 energy (X4's "unlimited" Nova)
   Damage / speeds of the buster are X's previous values (no balance change).
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, U = PLAT.U, X4 = PLAT.X4, H = PLAT.HEROES && PLAT.HEROES.x;
if (!X4 || !H) return;
const sfx = () => PLAT.sfx;

/* ------------------------------------------------------------- sprite + data */
H.sprite = { kind: 'strip', dir: 'heroes/x4/', ch: X4.ch, by: X4.ch, anims: {} };
for (const [k, v] of Object.entries(X4.anims)) H.sprite.anims[k] = { n: v.n, cw: v.cw, ax: v.ax };
H.scale = 1; H.smooth = false;
H.poses = { idle: { a: 'idle', fps: 5 }, walk: { a: 'walk', fps: 20 }, run: { a: 'walk', fps: 20 }, jump: { a: 'jump', f: [2] }, fall: { a: 'jump', f: [6] },
  wall: { a: 'cling', f: [2] }, hurt: { a: 'hurt', fps: 14 }, dead: { a: 'knock', fps: 6 }, ucharge: { a: 'shoot', f: [0] } };
const FXN = {};
for (const [k, v] of Object.entries(X4.fx)) {
  const name = 'x4' + k[0].toUpperCase() + k.slice(1); FXN[k] = name;
  PLAT.FXDEF[name] = { img: v.img, fw: v.fw, fh: v.fh, n: v.n, rate: /Hit|Muzzle|muzzle/.test(k) ? 2 : k === 'bubble' ? 4 : 3, scale: 1, pixel: true };
}
const shotDef = (k, o) => Object.assign({ img: X4.fx[k].img, fw: X4.fx[k].fw, fh: X4.fx[k].fh, n: X4.fx[k].n, rate: 3, scale: 1, pixel: true }, o);
// same damage / speed / reach as X's previous buster (lemon 1 · charge 1 = 3 · charge 2 = 5)
PLAT.PROJ.x4lemon = shotDef('lemon', { speed: 7.5, dmg: 1, life: 55, box: [12, 8], hitFx: FXN.lemonHit });
PLAT.PROJ.x4c1 = shotDef('c1Shot', { speed: 7.5, dmg: 3, pierce: 1, life: 60, box: [30, 18], hitFx: FXN.c1Hit });
PLAT.PROJ.x4c2 = shotDef('c2Shot', { speed: 8, dmg: 5, pierce: 3, life: 60, box: [44, 26], hitFx: FXN.c2Hit, shake: 2 });
PLAT.PROJ.x4plasma = shotDef('plasmaShot', { speed: 8, dmg: 6, pierce: 99, life: 60, box: [48, 40], hitFx: FXN.plasmaHit, shake: 2 });   // armour lv2: Ultimate Armor plasma, pierces
// charge level 3 (X-Fire sphere) and level 4 (LVL 4 buster shot) — the old ULT, now reached by holding the buster
PLAT.PROJ.x4c3 = shotDef('c3Shot', { speed: 7, dmg: 8, pierce: 99, life: 70, box: [62, 62], hitFx: FXN.c2Hit, shake: 3 });
PLAT.PROJ.x4c4 = { img: 'heroes/x/lvl4.png', fw: 196, fh: 136, n: 4, rate: 5, scale: .82, pixel: true, speed: 6.5, dmg: 14, pierce: 99, life: 80, box: [120, 96], hitFx: FXN.c2Hit, shake: 5 };
H.preload = Object.values(X4.fx).map(v => v.img).concat(['heroes/x/lvl4.png']);
const LV4_COST = 50;                                                    // energy for a level-4 shot (else the charge stops at level 3)

H.desc = 'บัสเตอร์ยิงได้ทุกท่า (วิ่ง · กระโดด · แดช · เกาะกำแพง) · กดยิงค้าง = ชาร์จ 4 ระดับ (หลอด CHARGE · ระดับ 4 = ลูกใหญ่สุด ใช้พลัง 50) · แดชค้างได้ กระโดดออกจากแดชพาความเร็วไป กลับทิศได้ทันที · ไต่/ถีบกำแพง · สกิล Z-เซเบอร์ · Q / ⟳ เปลี่ยนเกราะ (Force · Ultimate: แดชกลางอากาศ · ลอยตัว · ↓+สกิล Nova Strike)';
H.jump = 1.15;
H.phys = { gravUp: .5, grav: .66, maxFall: 9, cut: 1, minJump: 5, instantAir: true, instantGround: true };   // X4: snappy rise, release = stop rising, no air momentum
H.attack = Object.assign({}, H.attack, { proj: 'x4lemon', rate: 8, max: 3, charge: [{ t: 26, proj: 'x4c1', col: '#6ad8ff' }, { t: 66, proj: 'x4c2', col: '#7aff8a' }, { t: 120, proj: 'x4c3', col: '#9fe8ff' }, { t: 180, proj: 'x4c4', col: '#ffe36a' }] });
if (H.moves && H.moves.up) H.moves.up = Object.assign({}, H.moves.up, { pose: 'shoot', proj: 'x4lemon' });
H.skill = { kind: 'step', name: 'Z-เซเบอร์', cost: 15, pose: 'saber', dur: 32, on: [2, 3, 4, 5, 6, 7], hit: [6, 18], box: [0, -50, 48, 50], dmg: 3, kb: 6, heavy: true,
  air: { kind: 'step', name: 'Z-เซเบอร์ กลางอากาศ', cost: 15, pose: 'jumpSaber', dur: 24, on: [1, 2, 3, 4, 5], hit: [3, 14], box: [-10, -56, 60, 62], dmg: 3, kb: 6, heavy: true } };
const WALL_SABER = { kind: 'step', name: 'Z-เซเบอร์ กำแพง', cost: 15, pose: 'wallSaber', dur: 26, on: [2, 3, 4, 5, 6], hit: [4, 16], box: [0, -50, 60, 54], dmg: 3, kb: 6, heavy: true };
H.skills = { up: { kind: 'step', name: 'Z-เซเบอร์ จันทร์เสี้ยว (↑+สกิล)', cost: 25, pose: 'jumpSaber', dur: 26, on: [1, 2, 3, 4, 5], hit: [4, 16], box: [-10, -66, 70, 66], dmg: 4, kb: 7, up: true, heavy: true } };
H.dash = { kind: 'dash', name: 'แดช', pose: 'dash', speed: 5.6, dur: 30, cd: 12, air: true };
H.ult = null;                                                           // X's ULT is the charge bar (level 4 shot)
const chargeLv = p => { const C4 = H.attack.charge; let lv = 0; for (let i = 0; i < C4.length; i++) if (p.charge >= C4[i].t) lv = i + 1; return lv; };
H.chargeBar = p => ({ pct: Math.min(100, (p.charge || 0) / H.attack.charge[3].t * 100), lv: chargeLv(p) });

/* ----------------------------------------------------------------- palettes */
const PAL = {};
for (const k of Object.keys(X4.pal)) PAL[k] = { key: 'x4' + k, from: X4.pal.default.slice(1), to: X4.pal[k].slice(1) };
const FORMS = PLAT.X_FORMS = [
  { id: 'x', name: 'X', th: 'ร่างปกติ', pal: null },
  { id: 'force', name: 'FORCE ARMOR', th: 'ฟอร์ซอาร์เมอร์', pal: 'force', armor: true, nova: 'novaBlue', flame: FXN.novaFlameBlue, novaSkill: true },
  { id: 'ult', name: 'ULTIMATE ARMOR', th: 'อัลติเมทอาร์เมอร์', pal: 'ult', armor: true, nova: 'novaGold', flame: FXN.novaFlameGold, novaSkill: true },
];
H.forms = FORMS;

/* ------------------------------------------------------------------ helpers */
const st = p => p.xs || (p.xs = { form: 0, aimT: 0, fireT: 99, runPh: 0, runT: 0, landT: 0, kickT: 0, hover: 0, hoverUsed: false, airDashUsed: false, clingT: 0, blinkT: 200, flashT: 0 });
const form = p => FORMS[st(p).form] || FORMS[0];
const ax = p => (p.g.input.isHeld('right') ? 1 : 0) - (p.g.input.isHeld('left') ? 1 : 0);
// which "buster out" pose X is in right now (also picks the muzzle point)
function shotKey(p) {
  const s = st(p), a = p.act;
  if (a && a.kind === 'x4dash') return 'shotDash';
  if (p.wallDir) return 'shotCling';
  if (s.kickT > 0) return 'shotKick';
  if (s.hover > 0) return 'hoverShot';
  if (!p.onGround) return 'shotJump';
  if (s.landT > 0) return 'shotLand';
  if (Math.abs(p.vx) > .4) return 'shotWalk';
  return 'shoot';
}
function muzzlePt(p, key) {
  const m = X4.muzzle[key] || X4.muzzle.shoot || [20, -30];
  return { x: p.cx + p.face * m[0] * H.scale, y: p.feet + m[1] * H.scale };
}
function jumpIdx(p) {
  if (p.airT < 3 && p.vy < 0) return 0;
  const v = p.vy; return v < -6 ? 1 : v < -3 ? 2 : v < -1 ? 3 : v < 1.2 ? 4 + (Math.floor(p.airT / 5) % 2) : v < 4 ? 6 : 7;
}

/* ---------------------------------------------------------------- actions */
function startBeamIn(p) {
  p.act = { kind: 'beam', t: 0, ownsMove: true, ownsY: true, noJump: true,
    update() { this.t++; p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 2); if (this.t === 12) { sfx().land(); p.g.dust(p.cx, p.feet, 6, '#bfe8ff'); } if (this.t >= 34) p.endAct(); } };
}
function startTransform(p) {
  const s = st(p), g = p.g;
  p.act = { kind: 'transform', t: 0, ownsMove: true, noJump: true,
    update() {
      this.t++; p.vx *= .7; p.inv = Math.max(p.inv, 2);
      if (this.t % 3 === 0) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, r = 30; g.parts.push({ x: p.cx + Math.cos(a) * r, y: p.feet - 22 + Math.sin(a) * r, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, life: 12, col: i % 2 ? '#bfe8ff' : '#ffffff', size: 2, grav: 0 }); }
      if (this.t === 20) {
        s.form = (s.form + 1) % FORMS.length; const f = form(p);
        g.flashT = 10; g.shake(3); sfx().gem(); g.text(p.cx, p.y - 14, f.name, f.armor ? '#ffe36a' : '#9fe8ff', 70, true);
        g.emit('toast', { text: f.name, sub: f.armor ? f.th + ' · แดชกลางอากาศ · ลอยตัว (กดกระโดดซ้ำ) · ชาร์จ 2 = พลาสม่า · ↓+สกิล = NOVA STRIKE' : f.th });
      }
      if (this.t >= 36) p.endAct();
    } };
  sfx().charge();
}
function startNova(p, isUlt) {
  const s = st(p), g = p.g, f = form(p);
  if (isUlt) g.ultCut(p, 'NOVA STRIKE'); else { if (!p.spend(40)) return false; g.text(p.cx, p.y - 14, 'NOVA STRIKE', '#ffe36a', 50, true); }
  p.inv = Math.max(p.inv, 60); let id = PLAT.newSwing();
  p.act = { kind: 'nova', t: 0, ownsMove: true, ownsY: true, noJump: true, stopOnWall: true,
    update() {
      this.t++;
      if (this.t <= 14) { p.vx = 0; p.vy = 0; if (this.t === 14) { sfx().big(); g.shake(4); } return; }
      p.vx = p.face * 9; p.vy = 0; p.inv = Math.max(p.inv, 2);
      if (this.t % 6 === 0) id = PLAT.newSwing();
      p.bodyHit = { dmg: isUlt ? 4 : 2, id, kb: 7 };
      if (this.t % 4 === 0 && f.flame) g.fx(f.flame, p.cx - p.face * 34, p.feet - 22, { flip: p.face < 0, pixel: true });
      if (this.t % 2 === 0) { p.ghostPal = PAL.gold; g.afterimage(p); p.ghostPal = null; }
      if (this.t >= 14 + 36) { p.endAct(); p.vx = p.face * 2; }
    } };
  return true;
}

// level-4 shot: X plants his feet and the recoil pushes him back (in the air he hangs for a moment)
function bigShot(p) {
  if (p.act) p.endAct();
  const air = !p.onGround;
  p.act = { kind: 'bigshot', t: 0, ownsMove: true, ownsY: air, noJump: true,
    update() { this.t++; p.vx = this.t < 10 ? -p.face * 2.2 * (1 - this.t / 10) : 0; if (air) p.vy = 0; if (this.t >= (air ? 14 : 22)) p.endAct(); } };
}

/* ------------------------------------------------------------------ module */
H.mod = {
  reset(p) {
    const s = st(p); s.aimT = 0; s.hover = 0; s.kickT = 0; s.landT = 0; s.flashT = 0;
    if (!PLAT.skipIntro) startBeamIn(p);
  },
  update(p, inp, axv) {
    const s = st(p), f = form(p), g = p.g;
    if (s.aimT > 0) s.aimT--; s.fireT++; if (s.landT > 0) s.landT--; if (s.kickT > 0) s.kickT--; if (s.flashT > 0) s.flashT--;
    if (p.onGround || p.wallDir) { s.hoverUsed = false; s.airDashUsed = false; }
    if (p.wallLock === 8 && s.lastLock !== 8) s.kickT = 12;                 // a wall kick just happened (wallLock 9 → 8 this frame)
    s.lastLock = p.wallLock;
    s.clingT = p.wallDir ? s.clingT + 1 : 0;
    if (p.wallDir && p.vy > 1 && s.clingT % 4 === 0) g.dust(p.x + (p.wallDir > 0 ? p.w : 0), p.y + 8, 1, '#ffe8a0');
    if (p.act && (p.act.kind === 'beam' || p.act.kind === 'transform')) return true;
    if (p.dead || p.hurtT > 0) return false;
    // ARMOUR swap (on the ground, not in a move)
    if (inp.wasPressed('swap') && p.onGround && !p.act) { startTransform(p); return true; }
    // charge level 4 needs the energy for it — without it the charge waits at level 3
    if (p.charge >= H.attack.charge[3].t && p.en < LV4_COST) p.charge = H.attack.charge[3].t - 2;
    if (p.charge === H.attack.charge[2].t) { sfx().charge(); g.text(p.cx, p.y - 10, 'LV3', '#9fe8ff', 26); }
    if (p.charge === H.attack.charge[3].t) { sfx().gem(); g.flashT = 4; g.text(p.cx, p.y - 10, 'LV4 MAX!', '#ffe36a', 34, true); }
    // armour: ↓ + skill = Nova Strike for energy
    if (f.novaSkill && !p.act && inp.wasPressed('skill') && inp.isHeld('down')) { if (startNova(p, false)) return true; }
    // wall Z-saber
    if (p.wallDir && !p.act && inp.wasPressed('skill')) { p.useSkill(WALL_SABER, inp); if (p.act) return true; }
    // HOVER (armour): press jump again while falling — float, steer, shoot
    if (f.armor) {
      if (s.hover > 0) {
        if (!inp.isHeld('jump') || p.onGround || p.wallDir || p.act) s.hover = 0;
        else { s.hover--; p.vy = -C.GRAV + Math.sin(p.t / 6) * .15; p.jumping = false; p.airTop = 2;
          if (p.t % 3 === 0) g.burst(p.cx + U.rnd(-4, 4), p.feet + 2, p.t % 6 ? '#9fe8ff' : '#ffffff', 1, .6); }
      } else if (!p.onGround && !p.wallDir && !p.act && !s.hoverUsed && inp.wasPressed('jump') && p.coyote <= 0 && p.vy > -2) {
        s.hover = 60; s.hoverUsed = true; p.buffer = 0; sfx().airjump();
      }
    }
    // charging: particles gather around X (the body flash is in drawOpts)
    const A = H.attack;
    const lv = chargeLv(p);
    if (lv && p.t % (lv >= 3 ? 1 : 2) === 0) {
      const COL = [null, ['#8ad8ff'], ['#7aff8a', '#ff8ae8'], ['#9fe8ff', '#ffffff', '#3a8aff'], ['#ffe36a', '#ffffff', '#ff9a3a']][lv];
      for (let k = 0; k < (lv >= 4 ? 2 : 1); k++) {
        const a = Math.random() * 6.283, r = U.rnd(22, 34) + lv * 5;
        g.parts.push({ x: p.cx + Math.cos(a) * r, y: p.feet - 22 + Math.sin(a) * r, vx: -Math.cos(a) * r / 10, vy: -Math.sin(a) * r / 10, life: 10, col: COL[(p.t + k) % COL.length], size: lv >= 3 ? 3 : 2, grav: 0 });
      }
      if (lv >= 4 && p.t % 20 === 0) g.shake(1);
    }
    return false;
  },
  shoot(p, A, o) {
    const s = st(p), g = p.g, key = shotKey(p), m = muzzlePt(p, key), f = form(p);
    let proj = o.proj || A.proj, mz = FXN.muzzle;
    if (proj === 'x4c1') mz = FXN.c1Muzzle;
    if (proj === 'x4c2') { mz = FXN.c2Muzzle; if (f.armor) proj = 'x4plasma'; g.shake(2); }
    if (proj === 'x4c3' || proj === 'x4c4') {
      mz = FXN.c2Muzzle;
      if (proj === 'x4c4') { if (!p.spend(LV4_COST)) proj = 'x4c3'; else { g.flashT = 8; g.shake(5); bigShot(p); } }
      if (proj === 'x4c3') g.shake(3);
    }
    g.spawnProj(proj, m.x, m.y, p.face, { owner: p });
    const fx = g.fx(mz, m.x + p.face * 4, m.y, { flip: p.face < 0, pixel: true }), off = p.face * 4;
    fx.follow = () => { const q = muzzlePt(p, shotKey(p)); return { x: q.x + off, y: q.y }; };
    if (proj === 'x4lemon') sfx().shoot(); else sfx().big();
    if (proj === 'x4c4') { g.text(p.cx, p.y - 16, 'LVL 4 BUSTER', '#ffe36a', 50, true); }
    s.aimT = 24; s.fireT = 0;
  },
  dash(p, D) {
    const s = st(p), g = p.g, f = form(p);
    if (!p.onGround) {
      if (!f.armor || s.airDashUsed) return true;                            // plain X4 X cannot dash in the air
      s.airDashUsed = true; s.hover = 0; p.cd.dash = D.cd; sfx().dash();
      p.act = { kind: 'airdash', t: 0, ownsMove: true, ownsY: true, noJump: true, stopOnWall: true,
        update() { this.t++; p.vx = p.face * D.speed * 1.05; p.vy = 0; if (this.t % 3 === 0) { p.ghostPal = PAL.after1; g.afterimage(p); p.ghostPal = null; } if (this.t >= 18) { p.endAct(); p.airTop = Math.abs(p.vx); } } };
      return true;
    }
    p.cd.dash = D.cd; sfx().dash();
    g.fx(FXN.dust, p.cx - p.face * 16, p.feet - 14, { flip: p.face < 0, pixel: true });
    p.act = { kind: 'x4dash', t: 0, ownsMove: true, noJump: false, cancelOnJump: true, canTurn: false, stopOnWall: true, ending: false, endT: 0,
      update() {
        this.t++;
        if (!this.ending) {
          p.vx = p.face * D.speed;
          if (this.t % 3 === 0) { p.ghostPal = PAL.after1; g.afterimage(p); p.ghostPal = null; }
          if (this.t % 9 === 0) g.fx(FXN.dust, p.cx - p.face * 14, p.feet - 12, { flip: p.face < 0, pixel: true, alpha: .6 });
          if (!p.onGround || this.t >= D.dur || (this.t >= 10 && !g.input.isHeld('dash'))) { this.ending = true; if (!p.onGround) p.endAct(); }
        } else { this.endT++; p.vx *= .72; if (this.endT >= 8) p.endAct(); }
      } };
    return true;
  },
  ult(p) { return form(p).armor ? startNova(p, true) : false; },
  onLand(p, vy) { const s = st(p); s.landT = 6; s.hover = 0; },
  onHurt(p) { st(p).flashT = 16; st(p).hover = 0; },
  die(p) {
    const g = p.g;
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283 + ring * .39, sp = ring ? 1.4 : 2.6;
      g.fx(FXN.bubble, p.cx, p.feet - 22, { loop: true, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 80, pixel: true });
    }
    g.flashT = 8;
  },
  clear(p, t) {
    const a = p.anim;
    if (t < 24) a.show('victory', Math.min(3, Math.floor(t / 6)));
    else if (t < 40) a.show('exit', Math.min(3, Math.floor((t - 24) / 4)));
    else a.show('intro', 0);
    if (t === 40) { sfx().jump(); }
  },
  pose(p) {
    const s = st(p), a = p.anim, act = p.act, aim = s.aimT > 0 ? 'shot' : '';
    if (p.g.mode === 'clear') return true;
    if (p.dead || p.hurtT > 0) return false;
    if (act) {
      if (act.kind === 'beam') { a.show('intro', act.t < 12 ? 0 : Math.min(9, 1 + Math.floor((act.t - 12) / 22 * 9))); return true; }
      if (act.kind === 'transform') { a.show('exit', act.t < 20 ? 1 : 0); return true; }
      if (act.kind === 'nova') { if (act.t <= 14) a.show('novaStart', Math.min(3, Math.floor(act.t / 4))); else a.show(form(p).nova || 'novaBlue', 0); return true; }
      if (act.kind === 'bigshot') { a.show('shootC', Math.min(6, Math.floor(act.t / 3))); return true; }
      if (act.kind === 'airdash') { a.show('airDash', act.t < 4 ? 0 : 1); return true; }
      if (act.kind === 'x4dash') {
        const pre = s.aimT > 0 ? 'shotDash' : 'dash';
        if (act.ending) a.show(s.aimT > 0 ? 'shotDashEnd' : 'dashEnd', Math.min(3, Math.floor(act.endT / 2)));
        else if (act.t < 5) a.show(pre + 'Start', act.t < 3 ? 0 : 1);
        else a.show(pre, Math.floor(act.t / 4) % 3);
        return true;
      }
      if (act.pose) return false;                                           // sabers, giga buster … (their own pose)
    }
    if (p.wallDir) { const c = s.clingT; if (aim) a.show('shotCling', c < 4 ? 0 : c < 8 ? 1 : 2); else a.show('cling', c < 4 ? 0 : c < 8 ? 1 : 2 + Math.floor(c / 10) % 2); return true; }
    if (s.kickT > 0) { a.show(aim + (aim ? 'Kick' : 'kick'), Math.min(2, Math.floor((12 - s.kickT) / 4))); return true; }
    if (s.hover > 0) {
      const d = ax(p) * p.face, fast = Math.abs(p.vx) > 1.4;
      a.show(aim ? 'hoverShot' : 'hover', d > 0 ? (fast ? 0 : 1) : d < 0 ? (fast ? 4 : 3) : 2); return true;
    }
    if (!p.onGround) { a.show(aim ? 'shotJump' : 'jump', jumpIdx(p)); return true; }
    if (s.landT > 0) { a.show(aim ? 'shotLand' : 'land', Math.min(2, Math.floor((6 - s.landT) / 2))); return true; }
    const sp = Math.abs(p.vx);
    if (sp > .4) {
      s.runT++; s.runPh += sp * .23;
      if (s.runT < 6) a.show(aim ? 'shotWalkStart' : 'walkStart', s.runT < 3 ? 0 : 1);
      else a.show(aim ? 'shotWalk' : 'walk', Math.floor(s.runPh) % 14);
      return true;
    }
    s.runT = 0; s.runPh = 0;
    if (aim) { a.show('shoot', s.fireT < 3 ? 1 : 0); return true; }
    if (p.hp <= 1) { if (a.pose !== 'tired') a.play('tired'); return true; }
    if (a.pose === 'blink' && !a.done) return true;
    if (--s.blinkT <= 0) { s.blinkT = 160 + Math.floor(Math.random() * 120); a.play('blink', 30, true); return true; }
    if (a.pose !== 'idle' || a.manual != null) a.play('idle', null, true);
    return true;
  },
  drawOpts(p, o) {
    const s = st(p), f = form(p), A = H.attack, act = p.act;
    let pal = f.pal ? PAL[f.pal] : null;
    const lv = chargeLv(p);
    if (lv && p.t % (lv >= 3 ? 3 : 4) < 2) pal = [null, PAL.c1, p.t % 8 < 4 ? PAL.c2 : PAL.c3, p.t % 6 < 3 ? PAL.c3 : PAL.c4, p.t % 6 < 3 ? PAL.c4 : PAL.gold][lv];
    if (s.flashT > 0 && p.t % 4 < 2) pal = PAL.flash;
    if (act && act.kind === 'transform') pal = [PAL.c1, PAL.c2, PAL.flash, PAL.gold][Math.floor(act.t / 3) % 4];
    if (act && act.kind === 'nova' && act.t > 14) pal = null;               // the Nova frames carry their own colours
    o.pal = pal; o.flash = 0;
    if ((act && act.kind === 'beam' && act.t < 12) || (p.g.mode === 'clear' && p.g.clearT >= 40) || (p.dead && p.deadT > 10)) o.hide = true;
  },
  drawExtra(ctx, p) {
    const fr = (p.anim.sheet.frames('intro') || [])[0], f = form(p), pal = f.pal ? PAL[f.pal] : null;
    if (!fr) return;
    const act = p.act, g = p.g;
    if (act && act.kind === 'beam' && act.t < 12) PLAT.drawFrame(ctx, fr, p.cx, p.feet - (12 - act.t) * 22, 1, 1, { pal });
    if (g.mode === 'clear' && g.clearT >= 40) PLAT.drawFrame(ctx, fr, p.cx, p.feet - (g.clearT - 40) * 16, 1, 1, { pal });
  },
  // v92: no energy ball is drawn in X's hand while CHARGING any more (the developer did not want it).
  // Charging shows only what X4 shows: the palette flash (drawOpts) + the gathering particles (update).
  // The ball / sphere sprites are used only once the shot is RELEASED (x4c3 / x4c4 projectiles, muzzle, hit FX).
  drawFront() {},
  chargeFx: true,                 // this module draws its own charge particles (player.js skips the generic ones)
};
})(typeof window !== 'undefined' ? window : globalThis);
