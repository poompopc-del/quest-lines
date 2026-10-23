/* ==========================================================================
   PLATFORM MODE · player controller
   --------------------------------------------------------------------------
   One controller for every hero. Movement (walk → run, variable jump, coyote
   time, jump buffer, one-way drop-through, air jumps, Kirby float, wall
   jump, springs, moving platforms) is shared; the hero's data (heroes.js)
   picks the ability kinds. Combat goes through the game object (game.js):
   g.hit(box, dmg, opts) · g.spawnProj · g.fx · g.burst · g.shake · g.text
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, U = PLAT.U, W = PLAT.world;
const sfx = () => PLAT.sfx;
/* v94 PARRY (every hero) — press PARRY (O / F · pad LB · touch 🛡) just before an attack lands.
     window   PARRY_WIN frames after the press; the first PARRY_PERFECT of them are a PERFECT parry
     success  no damage · melee / contact attacker knocked off balance (dizzy, takes ×2) · shots reflected
              (×2, PERFECT ×3) · boss loses poise · +energy +ULT · short invulnerability · parry ready again at once
     whiff    the parry is locked for PARRY_CD frames after the press (no mashing) and you are slowed while it is up
   Spikes / pits / lava are not attacks — they cannot be parried. */
const PARRY_WIN = 12, PARRY_PERFECT = 5, PARRY_CD = 36;
/* v95 COUNTER STRIKE — a normal ATTACK pressed within COUNTER_WIN frames after a successful parry becomes a
   special move for every hero: a flash-step to the parried enemy (afterimages), a huge crescent slash with a
   long hit-stop, white flash, shake and a "COUNTER!" call-out. Big damage (the reeling enemy also takes ×2),
   PERFECT parry → PERFECT COUNTER (more damage, gold slash). Invulnerable for the whole move. */
const COUNTER_WIN = 45, COUNTER_DMG = 4, COUNTER_PERFECT_DMG = 6;

let SWING = 1;                         // global swing id: one swing hits each target once
const newSwing = () => ++SWING;
// v106: a charge just crossed 1 s, 3 s, then every further 3 s (works with fractional charge rates)
const lvlUp = (h, inc) => { const a = h - inc; return [60, 180].some(m => a < m && h >= m) || (h > 180 && Math.floor((a - 180) / 180) !== Math.floor((h - 180) / 180)); };

class Player {
  constructor(g, heroId, spawn, sheet) {
    const h = this.hero = PLAT.HEROES[heroId]; this.id = heroId; this.g = g;
    this.anim = new PLAT.Anim(sheet, h.poses);
    this.w = h.box[0]; this.h = h.box[1];
    this.maxHp = h.hp * PLAT.HPU + (PLAT.relicOn('dragon') ? 40 : 0); this.hp = this.maxHp; this.en = 100;   // v96: HP bar (1 old heart = HPU)
    this.reset(spawn);
  }
  reset(spawn) {
    if (this.act) this.endAct();          // retry / respawn: a looping skill effect must not survive the reset
    this.x = spawn.x - this.w / 2; this.y = spawn.y - this.h; this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.coyote = 0; this.buffer = 0; this.jumping = false; this.airJumps = 0; this.runT = 0; this.drop = 0;
    this.inv = 0; this.hurtT = 0; this.dead = false; this.deadT = 0; this.act = null; this.cd = { dash: 0, shot: 0 };
    this.combo = 0; this.comboWin = 0; this.queued = false; this.floating = false; this.wallDir = 0; this.wallLock = 0;
    this.ball = false; this.mouth = null; this.charge = 0; this.airDash = true; this.rocketUsed = false; this.heat = 0;
    this.mover = null; this.dashJump = false; this.parryT = 0; this.parryCd = 0; this.parryOk = 0; this.parryAnim = 0; this.tapT = 0; this.aegisCd = this.aegisCd || 0; this.itemCd = 0; this.sq = { x: 1, y: 1 }; this.guarding = false; this.bodyHit = null; this.streak = 0; this.streakT = 0;
    this.t = 0; this.airT = 0; this.landT = 0; this.lastSafe = { x: spawn.x, y: spawn.y };
    this.ult = this.ult || 0; this.superT = 0; this.pend = null; this.holdS = null; this.holdA = null; this.pressAt = {};
    this.anim.play('idle', null, true);
    if (this.hero.mod && this.hero.mod.reset) this.hero.mod.reset(this);      // hero module (e.g. X: beam-in)
  }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }
  box(b) {   // ability box [forward, top, w, h] → world rect, mirrored when facing left
    const fx = b[0], x = this.face > 0 ? this.cx + fx : this.cx - fx - b[2];
    return { x, y: this.feet + b[1], w: b[2], h: b[3] };
  }

  /* --------------------------------- update --------------------------------- */
  update(inp) {
    const h = this.hero, g = this.g; this.t++;
    if (this.inv > 0) this.inv--; if (this.cd.dash > 0) this.cd.dash--; if (this.cd.shot > 0) this.cd.shot--;
    if (this.comboWin > 0 && --this.comboWin === 0) this.combo = 0;
    if (this.streakT > 0 && --this.streakT === 0) this.streak = 0;
    if (this.wallLock > 0) this.wallLock--; if (this.drop > 0) this.drop--;
    this.en = Math.min(100, this.en + .12);
    this.sq.x += (1 - this.sq.x) * .2; this.sq.y += (1 - this.sq.y) * .2;
    this.bodyHit = null; this.guarding = false;

    if (this.superT > 0) {                 // SUPER SONIC: invincible, faster, burns through enemies
      if (--this.superT === 0) { this.g.text(this.cx, this.y - 8, 'หมดแรงซูเปอร์', '#ffe36a', 40); }
      this.inv = Math.max(this.inv, 2);
      if (this.t % 18 === 0) this.superId = newSwing();
      if (this.t % 3 === 0) g.burst(this.cx + U.rnd(-10, 10), this.y + U.rnd(0, this.h), '#ffe36a', 1, .8);
    }
    if (this.dead) { this.deadT++; this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); this.vx *= .9; W.moveBody(g.L, this, this.vx, this.vy); this.pose(); this.anim.update(); return; }

    const ax = (inp.isHeld('right') ? 1 : 0) - (inp.isHeld('left') ? 1 : 0);
    if (inp.wasPressed('jump')) this.buffer = C.BUFFER; else if (this.buffer > 0) this.buffer--;
    if (this.onGround) { this.coyote = C.COYOTE; this.airJumps = this.maxAirJumps(); this.airDash = true; this.rocketUsed = false; this.floating = false; }
    else if (this.coyote > 0) this.coyote--;

    const md = h.mod, busy = md && md.update ? md.update(this, inp, ax) : false;   // hero module: forms, hover, beam-in …
    this.relicTick();
    if (this.parryCd > 0) this.parryCd--; if (this.parryOk > 0) this.parryOk--;
    if (inp.wasPressed('potion')) this.usePotion();
    if (inp.wasPressed('item')) this.useItem();
    { const td = inp.wasPressed('right') ? 1 : inp.wasPressed('left') ? -1 : 0;          // v102: double tap → run
      if (this.tapT > 0) this.tapT--;
      if (td) { if (this.tapDir === td && this.tapT > 0) { this.runT = C.RUN_AFTER; this.tapT = 0; if (this.onGround) this.g.dust(this.cx - td * 8, this.feet, 3); } else { this.tapDir = td; this.tapT = C.TAP_RUN; } } }
    if (this.parryAnim > 0) this.parryAnim--;
    if (this.parryT > 0) this.parryT--;
    else if (inp.wasPressed('parry') && this.parryCd <= 0 && this.hurtT === 0 && !busy) this.startParry();
    if (this.hurtT > 0) { this.hurtT--; if (this.onGround) this.vx *= .86; }
    else if (this.parryT > 0) { if (this.onGround) this.vx *= .6; }                // committed: no attacks during the window
    else if (busy) { if (this.act) this.stepAct(inp, ax); }
    else if (this.parryT > 0) { this.walk(inp, 0); this.jumpLogic(inp, ax); }
    else {
      this.startActions(inp, ax);
      if (h.attack.charge && this.charge > 0) {            // X: hold attack to charge the buster
        if (inp.isHeld('attack')) { this.charge++; const A = h.attack; if (this.charge === A.charge[0].t || this.charge === A.charge[A.charge.length - 1].t) sfx().charge(); if (!(md && md.chargeFx) && this.charge > A.charge[0].t && this.t % 3 === 0) g.burst(this.cx + U.rnd(-14, 14), this.feet - U.rnd(4, 40), this.charge >= A.charge[A.charge.length - 1].t ? '#ff7af0' : '#6ad8ff', 1, .4); }
        else this.releaseCharge();
      }
      if (this.act) this.stepAct(inp, ax);
      if (!this.act || !this.act.ownsMove) this.walk(inp, ax);
      if (!this.act || !this.act.noJump) this.jumpLogic(inp, ax);
    }
    if (ax && this.hurtT === 0 && this.charging()) this.face = ax;          // v116: every CHARGE turns to the direction you press (the release goes that way)
    // gravity
    const ownsY = this.act && this.act.ownsY;
    // variable jump height: letting go early cuts the rise (springs / bounces are never cut)
    const PH = h.phys || {}, cut = PH.cut != null ? PH.cut : C.JUMP_CUT;        // per-hero jump feel (X: X4 physics)
    if (this.jumping && this.cutOK && !inp.isHeld('jump') && this.airT >= (PH.minJump || C.MIN_JUMP) && this.vy < -cut) { this.vy = -cut; this.cutOK = false; }
    if (!ownsY) {
      const up = this.jumping && inp.isHeld('jump') && this.vy < 0;
      this.vy += up ? (PH.gravUp || C.GRAV_UP) : (PH.grav || C.GRAV);
      let maxFall = PH.maxFall || C.MAX_FALL;
      if (this.floating) maxFall = h.float.maxFall;
      if (this.wallDir && this.vy > 0) maxFall = 2.2;
      if (this.act && this.act.hover) maxFall = 1.6;
      if (this.vy > maxFall) this.vy = maxFall;
    }
    if (this.jumping && this.vy >= 0) this.jumping = false;
    this.physics(inp);
    if (this.act && this.act.afterMove) this.act.afterMove();
    if (this.superT > 0 && !this.bodyHit) this.bodyHit = { dmg: this.hero.ult.dmg, id: this.superId || (this.superId = newSwing()), kb: 6 };
    if (this.ball && !this.onGround && !this.bodyHit) { if (!this.ballId) this.ballId = newSwing(); this.bodyHit = { dmg: 1, id: this.ballId, kb: 3, ball: true }; }
    if (!this.ball) this.ballId = 0;
    if (this.bodyHit) {
      const n = this.g.hit(this.bodyBox(), this.bodyHit.dmg, { id: this.bodyHit.id, kb: this.bodyHit.kb || 3, dir: this.face, from: this, body: true });
      if (n && this.bodyHit.ball) { this.vy = Math.min(this.vy, -7.5); this.jumping = false; this.ballId = newSwing(); this.airDash = true; }
      if (n && this.bodyHit.dive && this.act) { this.endAct(); this.vy = -(this.hero.moves.downAir.bounce || 7); this.jumping = false; this.airJumps = this.maxAirJumps(); }
    }
    this.pose(); this.anim.update();
  }

  /* ------------------------------ movement ------------------------------ */
  walk(inp, ax) {
    const h = this.hero, spd = h.speed || 1, accMul = h.accel || 1;
    if (this.wallLock > 0) ax = 0;
    // v102: holding a direction WALKS; a double tap (runTap) makes it RUN until the direction is let go or reversed
    if (ax && this.onGround) this.runT = (Math.sign(this.vx) === ax || Math.abs(this.vx) < .5) ? (this.runT >= C.RUN_AFTER ? this.runT + 1 : Math.min(this.runT + 1, C.RUN_AFTER - 1)) : 0; else if (this.onGround) this.runT = 0;
    let top = (this.runT >= C.RUN_AFTER ? C.RUN : C.WALK) * spd * (this.superT > 0 ? h.ult.speed : 1) * (this.speedMul || 1);
    if (!this.onGround) top = Math.max(C.WALK * spd, this.airTop || 0);
    if (this.act && this.act.slow) top *= this.onGround ? this.act.slow : 1;
    if (this.mouth) top *= .85;
    if (this.guarding) top = 0;
    const target = ax * top;
    let k;
    if (this.onGround) k = ax ? C.ACC_GROUND * accMul : C.DEC_GROUND; else k = C.ACC_AIR * accMul;
    const PH = h.phys; if ((PH && (this.onGround ? PH.instantGround : PH.instantAir)) || (!this.onGround && this.dashJump)) k = 99;   // X4: no momentum — full speed / stop / reverse at once (every hero during a dash-jump)
    if (k === 99 && this.wallLock > 0) return;                                   // …except the wall-kick push
    if (ax && Math.sign(target) !== Math.sign(this.vx) && this.onGround) k *= 1.6;   // snappy turn
    const d = target - this.vx; this.vx += U.clamp(d, -k, k);
    if (ax && (!this.act || this.act.canTurn)) this.face = ax;
  }
  jumpLogic(inp, ax) {
    const h = this.hero;
    // wall slide / wall jump (X)
    this.wallDir = 0;
    if (h.wallJump && !this.onGround && this.vy > -1) {
      const dir = ax || 0;
      if (dir && W.overlapsSolid(this.g.L, { x: this.x + dir * 2, y: this.y + 4, w: this.w, h: this.h - 10 })) { this.wallDir = dir; this.face = -dir; this.airDash = true; }
    }
    if (this.buffer > 0) {
      // drop through a one-way ledge
      if (this.onGround && inp.isHeld('down') && this.groundTile && this.groundTile.t === PLAT.TILE.ONEWAY) { this.drop = 10; this.buffer = 0; this.onGround = false; this.y += 2; return; }
      if (this.coyote > 0 && !this.act?.lockJump) {
        this.vy = -C.JUMP * (h.jump || 1); this.jumping = true; this.cutOK = true; this.buffer = 0; this.coyote = 0; this.onGround = false;
        this.airTop = Math.abs(this.vx); this.sq = { x: .86, y: 1.14 }; sfx().jump(); this.ball = !!h.ballJump; this.g.dust(this.cx, this.feet, 4);
        if (this.act && (this.act.dashJumpable || this.act.kind === 'x4dash')) this.dashJump = true;   // dash-jump: dash speed in the air, X-style steering
        if (this.act && this.act.cancelOnJump) this.endAct();
        return;
      }
      if (this.wallDir) {
        this.vy = -C.JUMP * .95; this.cutOK = true; this.vx = -this.wallDir * 4.3; this.face = -this.wallDir; this.wallLock = 9; this.jumping = true; this.buffer = 0; this.wallDir = 0;
        this.airTop = 4.3; sfx().jump(); this.g.dust(this.cx + this.face * -8, this.y + this.h * .6, 4); return;
      }
      if (this.airJumps > 0 && !this.act) {
        this.airJumps--; this.buffer = 0; this.jumping = true;
        if (h.float) { this.floating = true; this.vy = h.float.vy; sfx().airjump(); this.anim.play('float', null, true); }
        else { this.cutOK = true; this.vy = -C.JUMP * .9 * (h.jump || 1); sfx().airjump(); this.flipT = 26; this.anim.play('airjump', null, true); }
        this.g.dust(this.cx, this.feet, 5, '#ffffff');
      }
    }
  }
  physics(inp) {
    const g = this.g, L = g.L, prevBottom = this.feet, wasGround = this.onGround, preVy = this.vy;
    if (this.mover && this.onGround) { W.moveBody(L, this, this.mover.dx, 0); if (this.mover.dy > 0) this.y += this.mover.dy; }
    const fallDrop = this.drop > 0 || (inp.isHeld('down') && this.act && this.act.dropThrough);
    W.moveBody(L, this, this.vx, this.vy, { drop: fallDrop, nudge: true });
    if (this.wall && this.act && this.act.stopOnWall) this.endAct();
    if (this.wall) this.vx = 0;
    if (this.ceil && this.vy < 0) this.vy = 0;
    const m = W.landOnMovers(L, this, prevBottom);
    this.mover = null;
    if (m && !(this.drop > 0)) { this.onGround = true; this.vy = 0; this.mover = m; this.groundTile = { t: -1 }; if (m.sink) m.load = 3; }
    if (this.onGround && this.vy > 0) this.vy = 0;
    if (this.onGround && !wasGround) this.land(preVy);
    if (!this.onGround) this.airT++; else this.airT = 0;
    // crumbling blocks start shaking when stood on
    if (this.onGround && this.groundTile && this.groundTile.t === PLAT.TILE.CRUMBLE) { if (W.touchCrumble(L, this.groundTile.tx, this.groundTile.ty)) sfx().crumble(); }
    // springs
    for (const s of L.springs) if (this.vy >= 0 && U.overlap({ x: this.x, y: this.feet - 6, w: this.w, h: 8 }, s)) {
      this.vy = -C.SPRING; this.jumping = true; this.cutOK = false;   // holding jump on a spring = higher bounce
      this.onGround = false; this.coyote = 0; s.sq = 14; this.airJumps = this.maxAirJumps(); this.airDash = true; this.rocketUsed = false;
      this.floating = false; this.ball = !!this.hero.ballJump; this.springT = 30; sfx().spring(); this.sq = { x: .8, y: 1.25 };
      if (this.act && this.act.kind === 'pogo') this.endAct();
    }
    // remember the last safe ground spot (respawn point after a pit / lava)
    if (this.onGround && !this.mover && this.groundTile && (this.groundTile.t === PLAT.TILE.GROUND || this.groundTile.t === PLAT.TILE.BRICK)) {
      if (this.t % 10 === 0 && !g.hazardNear(this)) this.lastSafe = { x: this.cx, y: this.feet };
    }
  }
  land(vy) {
    this.dashJump = false;
    this.ball = false; this.floating = false; this.jumping = false; this.springT = 0;
    if (vy > 4) { this.sq = { x: 1.14, y: .86 }; sfx().land(); this.g.dust(this.cx, this.feet, vy > 7 ? 6 : 3); }
    if (this.act && this.act.onLand) this.act.onLand(vy);
    if (this.hero.mod && this.hero.mod.onLand) this.hero.mod.onLand(this, vy);
  }
  bodyBox() { return { x: this.x - 2, y: this.y - 2, w: this.w + 4, h: this.h + 4 }; }
  // origin for melee line-of-sight checks (chest height): a blow never reaches a target on the other side of a wall
  losPt() { return { x: this.cx, y: this.feet - Math.min(24, this.h * .55) }; }

  /* ------------------------------- abilities ------------------------------- */
  /* ------------------------------ command inputs ------------------------------
     Every hero has: J = free normal moves (combo · ↑+J · ↓+J · air J · running J · hold J),
     I = moves that cost mana (+ ↑/↓ variants), L = mobility, and ONE ultimate with its own input
     (needs a full ULT gauge, filled by landing hits and taking damage):
       du+A  ↓ then ↑ then attack       S+A  skill + attack together     D+A  dash + attack together
       S+D   skill + dash together      u+S  ↑ + skill                    dS_air  in the air ↓ + skill
       SS    double-tap skill           holdS hold skill, then release    dd+A ↓ ↓ + attack            */
  trackInputs(inp) {
    const P = this.pressAt || (this.pressAt = {});
    for (const a of ['attack', 'skill', 'dash', 'down', 'up']) if (inp.wasPressed(a)) { P[a + '2'] = P[a]; P[a] = this.t; }
  }
  since(a) { const v = this.pressAt && this.pressAt[a]; return v == null ? 1e9 : this.t - v; }
  get ultReady() { return this.ult >= 100 && !(this.superT > 0) && !!this.hero.ult; }
  ultMatch(b, inp) {
    const I = this.hero.ult && this.hero.ult.input;
    switch (I) {
      case 'du+A': return b === 'attack' && this.since('up') <= 16 && this.since('down') <= 30 && this.pressAt.down < this.pressAt.up;
      case 'dd+A': return b === 'attack' && this.since('down') <= 18 && this.since('down2') <= 34;
      case 'S+A': return (b === 'attack' && this.since('skill') <= 6) || (b === 'skill' && this.since('attack') <= 6);
      case 'D+A': return (b === 'attack' && this.since('dash') <= 6) || (b === 'dash' && this.since('attack') <= 6);
      case 'S+D': return (b === 'skill' && this.since('dash') <= 6) || (b === 'dash' && this.since('skill') <= 6);
      case 'u+S': return b === 'skill' && inp.isHeld('up');
      case 'dS_air': return b === 'skill' && !this.onGround && inp.isHeld('down');
      case 'SS': return b === 'skill' && this.since('skill2') <= 16;
    }
    return false;
  }
  startActions(inp, ax) {
    const h = this.hero, I = h.ult && h.ult.input;
    this.trackInputs(inp);
    if (this.parryOk > 0 && !h.counterInhale && inp.wasPressed('attack') && !(this.act && /^(counter|ult)$/.test(this.act.kind))) { this.startCounter(); return; }
    // guard (Plink / Kirby): hold ↓ on the ground
    if (h.guard && !this.act && this.onGround && inp.isHeld('down') && !ax && !this.holdA) { this.guarding = true; this.vx *= .6; }
    if (inp.wasPressed('ult') && this.ultReady) return this.startUlt();            // touch ULT button
    // the first button of a chord / double tap waits a few frames for its partner
    if (this.pend) {
      const P = this.pend;
      if ((P.partner && inp.wasPressed(P.partner)) || (I === 'SS' && P.btn === 'skill' && inp.wasPressed('skill'))) { this.pend = null; if (this.ultReady) return this.startUlt(); }
      // the same button again while waiting for its chord partner is a combo press, not noise: remember it
      // (it used to be swallowed — with ULT ready, Plink / Luffy / YOTA lost their 2nd combo step)
      else if (this.t - P.t < P.wait) { if (inp.wasPressed(P.btn)) P.again = true; return; }
      else { this.pend = null; this.press(P.btn, inp); if (P.again) this.press(P.btn, inp); }
    }
    // X: hold skill to charge the ultimate; a short press is the normal skill
    if (this.holdS != null) {
      if (inp.isHeld('skill')) {
        this.holdS++; this.anim.play(h.ult.chargePose || 'idle'); this.vx *= .8;
        if (this.t % 3 === 0) this.g.burst(this.cx + U.rnd(-16, 16), this.feet - U.rnd(0, 44), this.holdS >= h.ult.hold ? '#ffffff' : '#9fe8ff', 1, .6);
        if (this.holdS === h.ult.hold) { sfx().charge(); this.g.text(this.cx, this.y - 8, 'ปล่อย!', '#9fe8ff', 30); }
        return;
      }
      const t = this.holdS; this.holdS = null;
      if (t >= h.ult.hold && this.ultReady) return this.startUlt();
      this.skillBuf = 10;
    }
    for (const b of ['dash', 'skill', 'attack']) {
      if (!inp.wasPressed(b)) continue;
      if (this.ultReady && I) {
        if (this.ultMatch(b, inp)) return this.startUlt();
        const CH = { 'S+A': ['skill', 'attack'], 'D+A': ['dash', 'attack'], 'S+D': ['skill', 'dash'] }[I];
        if (CH && CH.includes(b)) { this.pend = { btn: b, t: this.t, wait: 6, partner: CH.find(x => x !== b) }; return; }
        if (I === 'SS' && b === 'skill') { this.pend = { btn: b, t: this.t, wait: 14 }; return; }
        if (I === 'holdS' && b === 'skill') { this.holdS = 0; return; }
      }
      this.press(b, inp);
    }
    // hold attack, then release (Plink's spin attack)
    const HM = h.moves && h.moves.hold;
    if (HM) {
      if (inp.wasPressed('attack')) this.holdA = 0;
      if (this.holdA != null) {
        if (inp.isHeld('attack')) { this.holdA++; if (this.holdA === HM.t) { sfx().charge(); this.g.burst(this.cx, this.y + 8, '#ffffff', 10, 2); } if (this.holdA > HM.t && this.t % 4 === 0) this.g.burst(this.cx + U.rnd(-12, 12), this.y + U.rnd(0, this.h), '#ffe36a', 1, .4); }
        else { const t = this.holdA; this.holdA = null; if (t >= HM.t && !HM.live) { if (this.act) this.endAct(); this.doMove(HM); } }
        // v107: a LIVE hold move (Luffy's charged pistol) starts at HM.t and keeps charging while the button is held
        if (HM.live && this.holdA === HM.t && this.onGround && !(this.act && /^(chargeBlast|gatlingCharge|ult|counter)$/.test(this.act.kind))) { this.holdA = null; if (this.act) this.endAct(); this.doMove(HM); }
      }
    }
    this.runBuffers(inp);
  }
  press(b, inp) {
    if (b === 'dash') this.dashBuf = 10;
    else if (b === 'skill') this.skillBuf = 10;
    // ATTACK (+ buffer): a press while a move cannot be cancelled yet is remembered for BUFFER_ATK frames
    // and fires the moment the move can be cancelled (or ends) — never dropped, never doubled (runBuffers)
    else if (b === 'attack') {
      if (!this.act || this.act.cancellable) { this.queued = false; this.startAttack(inp); }
      else if (/^(step|shot|skill)$/.test(this.act.kind)) { this.queued = true; this.queuedT = C.BUFFER_ATK; }
    }
  }
  // input buffer: a dash / skill pressed while busy fires the moment the current move can be cancelled
  runBuffers(inp) {
    const busy = this.act && !this.act.cancellable;
    if (this.queued && !inp.wasPressed('attack') && !(this.act && this.act.kind === 'step') && --this.queuedT <= 0) this.queued = false;
    if (this.queued && !busy && !this.dead && this.hurtT === 0) { this.queued = false; this.startAttack(inp); return; }
    if (this.dashBuf > 0) this.dashBuf--; if (this.skillBuf > 0) this.skillBuf--;
    if (this.dashBuf > 0 && !busy && this.cd.dash <= 0) { this.dashBuf = 0; if (this.act) this.endAct(); this.startDash(); }
    else if (this.skillBuf > 0 && !busy) { this.skillBuf = 0; if (this.act) this.endAct(); this.startSkill(inp); }
  }
  endAct() { const a = this.act; this.act = null; if (a && a.onEnd) a.onEnd(); }
  spend(cost) {
    if (!cost) return true;
    if (this.en < cost) { this.g.text(this.cx, this.y - 6, 'พลังไม่พอ', '#8ac8ff', 26); sfx().denied(); return false; }
    this.en -= cost; return true;
  }

  startAttack(inp) {
    const h = this.hero, A = h.attack, g = this.g;
    if (this.mouth && A.mouthful) return A.kind === 'inhale' ? this.startSpitHold(A) : this.shoot(A.mouthful, { mouth: true });
    if (this.floating && h.float.puff) { this.floating = false; this.airJumps = 0; g.spawnProj(h.float.puff, this.cx + this.face * 14, this.feet - 16, this.face, { owner: this }); sfx().shoot(); return; }
    const M = h.moves || {}, run = this.onGround && Math.abs(this.vx) > C.RUN * (h.speed || 1) * .8;
    let mv = null;
    if (!this.onGround && inp.isHeld('down') && M.downAir) mv = M.downAir;
    else if (this.onGround && inp.isHeld('down') && M.down) mv = M.down;
    else if (inp.isHeld('up') && M.up) mv = M.up;
    else if (!this.onGround && M.air) mv = M.air;
    else if (run && M.run) mv = M.run;
    if (mv) { if (this.act) this.endAct(); return this.doMove(mv); }
    if (A.kind === 'inhale') { if (this.act) this.endAct(); return this.startInhale(A.suck, 'attack'); }
    if (A.kind === 'shot') {
      if (A.melee) { const e = g.nearestEnemy(this.cx, this.feet - this.h / 2, this.face, A.melee.range + this.w / 2, 30); if (e) return this.startStep(A.melee); }
      if (this.cd.shot > 0) return;
      if (A.max && g.countProj(this, A.proj) >= A.max) return;
      const st = A.combo && this.streak >= A.combo.at ? { pose: A.combo.pose, proj: A.combo.proj } : null;
      this.shoot(A, st ? { pose: st.pose, proj: st.proj } : null);
      this.cd.shot = A.rate; if (A.charge) this.charge = 1;
      return;
    }
    // melee combo: continue from a step in its recovery, or within the combo window after it
    const steps = A.steps, cur = this.act && this.act.kind === 'step' && this.act.idx != null ? this.act.idx + 1 : null;
    const i = cur != null ? cur % steps.length : this.comboWin > 0 ? this.combo % steps.length : 0;
    if (this.act) this.endAct();
    this.startStep(steps[i], i);
    this.combo = i + 1; this.comboWin = 0;
    if (A.count) g.text(this.cx + this.face * 18, this.y - 4, A.count[i], i === 2 ? '#ff4a6a' : '#ffd84a', 34, true);
  }
  /* Where does this attack actually hurt? Read it from the pixels of the attack frames:
     a frame is ACTIVE when the drawing reaches clearly further forward than the idle pose
     (blade / fist / leg / effect out), and its hit box covers what is drawn in front of the body.
     So the damage window is the frames you see the weapon in, and the reach is the reach you see.
     Steps that move the whole body (slides, rolls) keep their hand-set window from heroes.js. */
  frameHits(s) {
    const key = s.pose + '|' + s.dur; this._fh = this._fh || {};
    if (this._fh[key] !== undefined) return this._fh[key];
    let out = null;
    const sheet = this.anim.sheet, r = this.anim.resolve(s.pose), idle = this.anim.resolve('idle');
    const ib = idle && sheet.bounds(idle.frames[0]);
    if (r && ib && !s.slide && s.auto !== false && r.name === s.pose) {
      const sc = this.hero.scale, fx = Math.max(0, ib.x1 * .35) * sc;
      // the part of a frame that is drawn in front of the body, in world units (forward, top, w, h)
      const pix = fr => { const b = sheet.bounds(fr); if (!b) return null; return [fx, b.y0 * sc - 2, Math.max(10, b.x1 * sc - fx + 2), Math.max(12, (b.y1 - b.y0) * sc + 4)]; };
      const union = (a, b) => { if (!a) return b; if (!b) return a; const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]); return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0]; };
      if (s.on) {
        // the frames where the blow lands are listed per move (checked by eye against the sheets);
        // the reach comes from the pixels of those frames, never smaller than the move's base box
        out = r.frames.map((fr, i) => s.on.includes(i) ? { box: union(pix(fr), s.box) } : null);
      } else {
        // automatic: a frame is active when its drawing reaches clearly further than the least-extended
        // frame of the same animation (the wind-up / recovery pose)
        const bs = r.frames.map(fr => sheet.bounds(fr)).filter(Boolean);
        const front = Math.max(ib.x1 * .6, Math.min(...bs.map(b => b.x1))), bodyW = Math.max(8, ib.x1 - ib.x0), need = front + Math.max(6, bodyW * .3);
        const frames = r.frames.map(fr => { const b = sheet.bounds(fr); return b && b.x1 >= need ? { box: pix(fr) } : null; });
        if (frames.some(Boolean)) {
          for (let i = 0; i < frames.length - 1; i++) if (frames[i] && !frames[i + 1] && !(i > 0 && frames[i - 1])) frames[i + 1] = { box: frames[i].box, follow: true };
          out = frames;
        }
      }
    }
    return (this._fh[key] = out);
  }
  startStep(s, idx) {
    const swing = newSwing(), self = this, fh = this.frameHits(s), n = fh ? fh.length : 0;
    const steps = this.hero.attack.steps || [], last = idx == null || idx === steps.length - 1;
    // a step that has a follow-up only pushes the target a little (it must stay in reach of the next step);
    // the finisher (and single-step attacks) keep their full knock-back
    const kb = last ? s.kb : Math.min(s.kb || 0, C.COMBO_KB);
    this.anim.play(s.pose, s.dur, true);
    if (s.lunge && (this.onGround || s.slide)) this.vx = this.face * Math.max(Math.abs(this.vx) * .5, s.lunge);
    // COMBO STEP-IN: a follow-up step whose reach is shorter than where the last target now stands
    // (knock-back, or a short second swing like Plink's) steps forward just enough to connect — only
    // toward a target that was hit by the previous step, in front, on the same level, and close
    const tg = this.lastTarget;
    if (idx > 0 && tg && !tg.dead && this.onGround && !s.slide && Math.abs(tg.feet - this.feet) < 24) {
      const hb = tg.hurtBox ? tg.hurtBox() : tg, near = this.face > 0 ? hb.x - this.cx : this.cx - (hb.x + hb.w);
      const reach = fh ? Math.max(...fh.filter(Boolean).map(f => f.box[0] + f.box[2])) : s.box[0] + s.box[2];
      const gap = near - reach + 6;                       // +6: overlap the target by a few px, not just touch it
      if (near > -4 && gap > 0 && gap < 34) this.vx = this.face * Math.max(Math.abs(this.vx), Math.min(5, Math.sqrt(gap * 2 * C.DEC_GROUND) + .3));
    }
    sfx().swing();
    // the frame index → time: anim.index() maps t ∈ [0, dur) onto the frames
    const lastActive = fh ? Math.floor((Math.max(...fh.map((f, i) => f ? i : -1)) + 1) * s.dur / n) : s.hit[1];
    this.act = { kind: 'step', t: 0, s, swing, pose: s.pose, slow: s.slide ? 1 : .3, canTurn: false, idx, cancellable: false,
      ownsMove: !!s.slide, lastActive,
      update() {
        const t = ++this.t;
        if (s.slide) { self.vx *= .94; }
        let box = null, fi = self.anim.index();
        if (fh) { const f = fh[fi]; if (f && t < s.dur) box = f.box; }
        else if (t >= s.hit[0] && t <= s.hit[1]) box = s.box;
        if (s.multi && fi !== this.lastFi) { this.lastFi = fi; this.mid = newSwing(); }        // multi-hit moves: a new blow on every active frame
        if (box) self.g.hit(self.box(box), s.dmg, { id: s.multi ? this.mid : swing, kb, dir: self.face, from: self, shake: s.shake, fx: s.fx, up: s.up, heavy: s.heavy || s.dmg >= 3 || !!s.shake, finisher: idx != null && last && idx > 0, los: self.losPt(), multi: !!s.multi });
        // recovery: once the blow is over the move can be cancelled into the next hit, a dash, a skill or a jump
        if (t > this.lastActive && !this.cancellable) {
          this.cancellable = true;
          if (self.queued) { self.queued = false; self.startAttack(self.g.input); return; }
        }
        if (t >= s.dur) { self.endAct(); self.comboWin = 16; }
      } };
    this.queued = false;
  }
  shoot(A, o) {
    o = o || {};
    if (this.hero.mod && this.hero.mod.shoot) return this.hero.mod.shoot(this, A, o);
    const self = this, pose = o.pose || A.pose, dur = A.dur || 14;
    let proj = o.proj || A.proj, py = A.y || -24;
    if (o.mouth && this.mouth && this.mouth.n > 1) {       // v100 Kirby: every extra mouthful = a bigger, harder star (no cap)
      const n = this.mouth.n, base = PLAT.PROJ[proj], k = 1 + .3 * (n - 1), bw = Math.round(base.box[0] * k);
      proj = Object.assign({}, base, { scale: base.scale * k, box: [bw, bw], dmg: base.dmg + 3 * (n - 1), pierce: (base.pierce || 0) + n, life: base.life + 4 * n });
      py = Math.min(py, -bw / 2 - 2);
    }
    this.anim.play(pose, dur, true);
    this.act = { kind: 'shot', t: 0, pose, slow: .55, canTurn: true, cancellable: false,
      update() {
        if (++this.t === (A.fireAt || 1)) {
          self.g.spawnProj(proj, self.cx + self.face * 16, self.feet + py, self.face, { owner: self });
          sfx().shoot(); if (o.mouth && proj.box && proj.box[0] > 40) { self.g.shake(Math.min(8, proj.box[0] / 30)); sfx().boom(); }
          if (o.mouth) { self.mouth = null; }
        }
        if (this.t >= dur) self.endAct();
        else if (this.t > (A.fireAt || 1) + 4) this.cancellable = true;
      } };
  }
  // input reset (pause / lost focus / menu / restart): drop every held-button state WITHOUT firing anything —
  // releasing a charge here used to shoot the moment the game resumed (the button "came up" while paused)
  cancelHeld() {
    this.charge = 0; this.holdS = null; this.holdA = null; this.queued = false; this.pend = null; this.dashBuf = 0; this.skillBuf = 0; this.buffer = 0;
    if (this.act && this.act.kind === 'rev') this.endAct();
    if (this.act && this.act.kind === 'flareCharge') this.endAct();     // Shovel Knight's charging fireball is dropped, not thrown          // Sonic's spin-dash rev would launch on "release"
  }
  /* v116: is the hero building up a charge right now? (X buster / ult, held attack, Luffy's charges, Shovel's flare,
     Sonic's rev, Mao's heat, a beam's wind-up) — while it is, the hero faces whichever way you press */
  charging() {
    const h = this.hero, a = this.act;
    if (this.holdS != null) return true;
    if (this.holdA != null && this.holdA >= 12 && !(a && a.kind === 'step')) return true;   // not mid-swing
    if (this.charge > 0 && h.attack.charge && this.charge >= h.attack.charge[0].t) return true;
    if (!a) return false;
    switch (a.kind) {
      case 'chargeBlast': return a.phase === 'up';
      case 'gatlingCharge': return a.phase === 'wind';
      case 'flareCharge': case 'rev': case 'heat': return true;
      case 'beam': return a.t < (a.chargeT || 0);
    }
    return false;
  }
  releaseCharge() {
    const A = this.hero.attack; if (!A.charge) return;
    let lv = null; for (const c of A.charge) if (this.charge >= c.t) lv = c;
    this.charge = 0;
    if (lv) {
      if (this.act && this.act.kind === 'shot') this.act = null;
      this.shoot(A, { proj: lv.proj }); sfx().big(); this.g.shake(2);
    }
  }

  startDash(D0) {
    const h = this.hero, D = D0 || h.dash, g = this.g, self = this;
    if (!D) return;
    if (!D0 && h.mod && h.mod.dash && h.mod.dash(this, D)) return;
    if (D.kind === 'homing') return this.startHoming(D);
    if (D.kind === 'rocket') {
      if (this.rocketUsed) return; this.rocketUsed = true;
      this.vx = this.face * D.vx; this.vy = D.vy; this.onGround = false; this.coyote = 0; this.jumping = false; this.cd.dash = D.cd;
      const sw = newSwing(); this.anim.play(D.pose, null, true); sfx().dash(); g.dust(this.cx, this.feet, 6);
      this.act = { kind: 'rocket', t: 0, pose: D.pose, ownsMove: true, noJump: true, canTurn: false,
        update() { if (++this.t > 3) self.bodyHit = { dmg: D.hit.dmg, id: sw }; if (this.t % 2 === 0) g.burst(self.cx - self.face * 8, self.y + 20, '#ffd8a0', 1, .6); if (this.t >= D.dur || self.onGround) self.endAct(); } };
      return;
    }
    if (!this.onGround) { if (!D.air || !this.airDash) return; this.airDash = false; }
    if (!D.isSkill) this.cd.dash = D.cd; this.floating = false;
    const sw = newSwing(); let multi = 0;
    const mp = this.mouth && this.anim.poses['m_' + D.pose] ? 'm_' + D.pose : D.pose;   // v101 Kirby: full-mouth dash stays puffed
    this.anim.play(mp, null, true); sfx().dash();
    if (D.shout) g.text(this.cx + this.face * 10, this.y - 10, D.shout, '#ff5a6a', 70, true);
    if (D.inv) this.inv = Math.max(this.inv, D.inv);
    // v93: like X — a dash started on the ground can be jumped out of; the jump keeps the dash speed (dash-jump)
    const fromGround = this.onGround;
    this.act = { kind: D.kind, t: 0, pose: D.pose, ownsMove: true, ownsY: !this.onGround || D.kind === 'dash', noJump: !fromGround && D.kind !== 'roll', cancelOnJump: fromGround, dashJumpable: fromGround, stopOnWall: true,
      update() {
        this.t++;
        const ease = this.t > D.dur - 5 ? .7 : 1;
        self.vx = self.face * D.speed * ease;
        if (this.ownsY) self.vy = 0;
        if (D.hit) {
          if (D.hit.multi && this.t % D.hit.multi === 0) this.mid = newSwing();
          self.g.hit(self.box(D.hit.box), D.hit.dmg, { id: this.mid || sw, kb: D.hit.kb || 4, dir: self.face, from: self, los: self.losPt(), multi: !!D.hit.multi, bat: !!D.batFire });
          if (D.batFire) self.batFireballs(self.box(D.hit.box));
        }
        if (this.t % 2 === 0) { if (D.trail) self.g.burst(self.cx - self.face * 10, self.y + self.h * .6, D.trail, 1, .5); else self.g.afterimage(self); }
        if (this.t >= D.dur) { self.endAct(); self.vx *= .5; }
      } };
    if (D.kind === 'roll') { this.act.cancelOnJump = true; this.act.noJump = false; this.act.ownsY = false; }
  }
  startHoming(D) {
    const g = this.g, self = this;
    if (this.onGround) {           // on the ground: a quick boost into a full-speed run
      this.vx = this.face * 7; this.runT = C.RUN_AFTER; this.cd.dash = 16; sfx().dash(); g.dust(this.cx, this.feet, 5); return;
    }
    if (!this.airDash) return; this.airDash = false; if (D.cd) this.cd.dash = D.cd;
    const tgt = g.nearestEnemy(this.cx, this.feet - 16, this.face, D.range, 140, true);
    const sw = newSwing(); this.ball = true; sfx().dash();
    let vx, vy;
    if (tgt) { const tx = tgt.x + tgt.w / 2, ty = tgt.y + tgt.h / 2, d = U.dist(this.cx, this.feet - 16, tx, ty) || 1; vx = (tx - this.cx) / d * D.speed; vy = (ty - (this.feet - 16)) / d * D.speed; this.face = U.sign(vx) || this.face; }
    else { vx = this.face * D.speed; vy = -.5; }
    this.act = { kind: 'homing', t: 0, pose: D.pose, ownsMove: true, ownsY: true, noJump: true,
      update() {
        this.t++; self.vx = vx; self.vy = vy; self.bodyHit = { dmg: D.hit.dmg, id: sw, kb: 3 };
        if (this.t % 2 === 0) self.g.afterimage(self);
        if (this.t >= (tgt ? 30 : 12) || self.wall || self.onGround || self.ceil) { self.endAct(); }
      } };
  }
  /* v100 INHALE (Kirby): hold `btn` to suck. Whatever is swallowed STACKS in the mouth (mouth.n) —
     the spat star grows with the stack, with no cap. */
  startInhale(S, btn) {
    if (!this.onGround) return;
    const self = this, g = this.g;
    this.anim.play(S.pose, null, true); sfx().inhale();
    this.act = { kind: 'inhale', t: 0, pose: S.pose, slow: 0, canTurn: false,
      update() { this.t++; if (this.t % 30 === 0) sfx().inhale();
        const got = g.inhale(self, S);
        if (got) {
          const n = (self.mouth ? self.mouth.n || 1 : 0) + (got.n || 1);
          self.mouth = Object.assign({}, got, { n }); sfx().heart(); self.sq = { x: 1.2, y: .88 };
          g.text(self.cx, self.y - 8, n > 1 ? 'อม! ×' + n : 'อม!', '#ff9ad8', 40, n >= 5);
          if (btn !== 'attack') { self.endAct(); return; }                      // J: keep hoovering while it is held
        }
        if (!g.input.isHeld(btn) && this.t > 10) self.endAct(); } };
  }
  // full mouth + J: a tap spits the star, holding past `holdToSuck` frames opens up and inhales more
  startSpitHold(A) {
    const self = this, g = this.g, wait = A.holdToSuck || 10;
    this.act = { kind: 'spitHold', t: 0, slow: .3, canTurn: true,
      update() { this.t++;
        if (!g.input.isHeld('attack')) { self.endAct(); self.shoot(A.mouthful, { mouth: true }); return; }
        if (this.t >= wait) { self.endAct(); if (self.onGround) self.startInhale(A.suck, 'attack'); else self.shoot(A.mouthful, { mouth: true }); } } };
  }
  startSkill(inp) {
    const h = this.hero, g = this.g;
    let S = h.skill; if (!S) return;
    if (h.skills && inp.isHeld('up') && h.skills.up) S = h.skills.up;
    else if (h.skills && inp.isHeld('down') && h.skills.down) S = h.skills.down;
    else if (S.air && !this.onGround) S = S.air;
    if (this.mouth) { this.mouth = null; this.en = Math.min(100, this.en + 30); g.text(this.cx, this.y - 6, 'กลืน! +30 พลัง', '#ffb0e0', 50); sfx().heart(); return; }
    this.useSkill(S, inp);
  }
  // free normal moves share the skill machinery (cost 0) — see heroes.js moves{}
  doMove(m) {
    switch (m.kind || 'step') {
      case 'step': this.startStep(m, null); break;
      case 'pogo': this.startPogo(); break;
      case 'meteorDive': this.startMeteorDive(m); break;
      case 'homing': if (this.onGround) return; this.startHoming(m); break;
      default: this.useSkill(Object.assign({ cost: 0 }, m), this.g.input);
    }
  }
  useSkill(S, inp) {
    const h = this.hero, g = this.g, self = this;
    switch (S.kind) {
      case 'step': if (!this.spend(S.cost)) return; this.startStep(S, null); sfx().big(); break;
      case 'shotUp': {
        if (this.cd.shot > 0) return; this.cd.shot = S.rate || 8;
        this.anim.play(S.pose, S.dur, true);
        this.act = { kind: 'shot', t: 0, pose: S.pose, slow: .55, canTurn: true, cancellable: false,
          update() { if (++this.t === S.fireAt) { const sp = PLAT.PROJ[S.proj].speed; g.spawnProj(S.proj, self.cx + self.face * 12, self.feet + S.y, self.face, { owner: self, vx: self.face * Math.cos(S.angle) * sp, vy: -Math.sin(S.angle) * sp }); sfx().shoot(); }
            if (this.t >= S.dur) self.endAct(); else if (this.t > S.fireAt + 3) this.cancellable = true; } };
        break;
      }
      case 'dive': {                                   // Kirby roll-dive: fall fast, bounce off what you hit
        if (this.onGround) return; const sw = newSwing();
        this.anim.play(S.pose, null, true); sfx().dash(); this.vy = Math.max(this.vy, 2);
        this.act = { kind: 'dive', t: 0, pose: S.pose, ownsY: true, canTurn: true,
          update() { this.t++; self.vy = S.vy; self.bodyHit = { dmg: S.dmg, id: this.sw || sw, kb: 4, dive: true }; },
          afterMove() {}, onLand() { self.endAct(); g.dust(self.cx, self.feet, 6); sfx().land(); } };
        this.act.bounce = S.bounce;
        break;
      }
      case 'boost': {                                  // Sonic: invincible speed burst through everything
        if (!this.spend(S.cost)) return;
        this.startDash(Object.assign({ kind: 'dash', air: true, isSkill: true }, S)); this.airDash = true;
        break;
      }
      case 'bash': {                                   // Plink: shield bash — reflects shots, shoves enemies
        if (!this.spend(S.cost)) return; const sw = newSwing();
        this.anim.play(S.pose, null, true); sfx().dash();
        this.act = { kind: 'bash', t: 0, pose: S.pose, ownsMove: true, reflect: true, stopOnWall: true,
          update() { this.t++; self.vx = self.face * S.speed * (this.t > S.dur - 5 ? .6 : 1); g.hit(self.box(S.hit.box), S.hit.dmg, { id: sw, kb: S.hit.kb, dir: self.face, from: self, heavy: true }); if (this.t % 3 === 0) g.burst(self.cx + self.face * 14, self.y + 18, '#cfe8ff', 1, .6); if (this.t >= S.dur) self.endAct(); } };
        break;
      }
      case 'balloon': {                                // Luffy: Fusen — bounces shots back, pushes enemies away
        if (!this.spend(S.cost)) return;
        this.anim.play(S.pose, S.dur, true); sfx().spring();
        this.act = { kind: 'balloon', t: 0, pose: S.pose, slow: 0, reflect: false,
          update() { this.t++; const fi = self.anim.index(); this.reflect = fi >= S.on[0] && fi <= S.on[1]; if (this.t >= S.dur) self.endAct(); } };
        break;
      }
      case 'gatlingCharge': {                          // v105 Luffy: hold ↓+attack = wind up; release = a gatling flurry that lasts longer and hits harder the longer the charge (no cap)
        if (!this.onGround) return;
        this.anim.play(S.wind, 10, true); sfx().charge();
        this.act = { kind: 'gatlingCharge', t: 0, pose: S.wind, slow: 0, canTurn: true, phase: 'wind', held: 0, ft: 0,
          update() {
            this.t++;
            if (this.phase === 'wind') {
              this.held += (self.chargeMul || 1); self.vx *= .6;
              if (this.t % 12 === 0) sfx().charge();
              if (this.t % 3 === 0) g.burst(self.cx + self.face * 14, self.feet - 34, this.held > 180 ? '#ffe36a' : this.held > 60 ? '#ffb04a' : '#ffd8a0', 1, .6);
              if (lvlUp(this.held, self.chargeMul || 1)) { g.text(self.cx, self.y - 14, 'ชาร์จ! ' + ((S.base + this.held * S.perFrame) / 60).toFixed(1) + ' วิ', '#ffd060', 40); sfx().gem(); }
              if (!g.input.isHeld('attack') || self.hurtT > 0) { this.phase = 'go'; this.dur = Math.round(S.base + this.held * S.perFrame); this.dmg = S.dmg + Math.floor(this.held / 120); self.anim.play(S.loop, null, true); this.pose = S.loop; this.canTurn = false; this.sw = newSwing(); }
              return;
            }
            if (this.phase === 'go') {
              this.ft++; self.vx = 0;
              if (this.ft % S.every === 0) { this.sw = newSwing(); g.hit(self.box(S.box), this.dmg, { id: this.sw, kb: 1.5, dir: self.face, from: self, los: self.losPt() }); if (this.ft % (S.every * 2) === 0) sfx().swing(); }
              if (this.ft % 2 === 0) g.parts.push({ x: self.cx + self.face * U.rnd(20, S.box[2]), y: self.feet + U.rnd(-44, -16), vx: self.face * U.rnd(2, 5), vy: 0, life: 6, col: '#ffd8a0', size: 3, line: true });
              if (this.ft >= this.dur) { this.phase = 'end'; this.et = 0; self.anim.play(S.end, 14, true); this.pose = S.end; g.hit(self.box(S.box), this.dmg * 2, { id: newSwing(), kb: 9, dir: self.face, from: self, heavy: true }); g.shake(4); sfx().boom(); }
              return;
            }
            if (++this.et >= 14) self.endAct();
          } };
        break;
      }
      case 'chargeBlast': {                            // v104 Luffy: hold = charge (area grows, no cap) · release = the blast — 'ground' spreads both ways, 'front' shoots straight ahead
        if (!this.onGround) return;
        if (S.cost && !this.spend(S.cost)) return;
        const front = S.area === 'front';
        this.anim.play(S.up, S.rise, true); sfx().charge();
        this.act = { kind: 'chargeBlast', t: 0, pose: S.up, slow: 0, canTurn: !front, phase: 'up', held: 0, dt: 0,
          update() {
            this.t++;
            if (this.phase === 'up') {
              this.held += (self.chargeMul || 1); const w = S.base + this.held * S.grow; self.vx *= .6;
              if (S.hold && this.held === S.rise) { self.anim.play(S.hold, null, true); this.pose = S.hold; }
              if (this.held % 12 === 0) sfx().charge();
              const col = this.held > 180 ? '#ffe36a' : this.held > 60 ? '#ffb04a' : '#ffd8a0';
              for (let i = 0; i < (this.held > 60 ? 2 : 1); i++) {
                if (front) g.parts.push({ x: self.cx + self.face * U.rnd(20, w), y: self.feet + S.y + U.rnd(-10, 10), vx: -self.face * 1.5, vy: 0, life: 12, col, size: 2, line: true });
                else g.parts.push({ x: self.cx + U.rnd(-w / 2, w / 2), y: self.feet - 1, vx: 0, vy: U.rnd(-1.4, -.4), life: 14, col, size: 2 });
              }
              if (lvlUp(this.held, self.chargeMul || 1)) { g.text(self.cx, self.y - 14, 'ชาร์จ! ' + (front ? 'ไกล ' : 'กว้าง ') + Math.round(w) + 'px', '#ffd060', 40); sfx().gem(); }
              if (!g.input.isHeld(S.btn || 'skill') || self.hurtT > 0) { this.phase = 'go'; this.w = w; self.anim.play(S.go, S.goDur, true); this.pose = S.go; }
              return;
            }
            if (++this.dt === S.hitAt) {
              const w = this.w, dmg = S.dmg + Math.floor(this.held / 60), fy = self.feet + (S.y || 0);
              const box = front ? { x: self.face > 0 ? self.cx : self.cx - w, y: fy - 24, w, h: 48 } : { x: self.cx - w / 2, y: self.feet - 44, w, h: 48 };
              g.hit(box, dmg, { id: newSwing(), kb: S.kb + Math.min(10, w / 60), dir: front ? self.face : 0, from: self, at: self.cx, heavy: true });
              g.shake(Math.min(12, 3 + w / 70)); g.hitstop(Math.min(8, 2 + w / 150)); sfx().boom(); PLAT.haptic('big');
              const n = Math.min(70, Math.round(w / 10));
              for (let i = 0; i < n; i++) {
                if (front) { const x = self.cx + self.face * (i + .5) * w / n; g.parts.push({ x, y: fy + U.rnd(-14, 14), vx: self.face * U.rnd(4, 9), vy: U.rnd(-1, 1), life: 16, col: '#ffe0a0', size: 3, line: true }); if (i % 4 === 0) g.burst(x, fy, '#ffb04a', 1, 1.2); }
                else { const x = self.cx - w / 2 + (i + .5) * w / n; g.dust(x, self.feet, 1); g.parts.push({ x, y: self.feet - 2, vx: U.sign(x - self.cx) * U.rnd(1, 3), vy: U.rnd(-6, -2) * (1 - Math.abs(x - self.cx) / w), life: 26, col: '#ffb04a', size: 3, grav: .3 }); }
              }
              if (w > 200) g.text(self.cx, self.y - 18, S.call || (front ? 'GOMU GOMU BAZOOKA!!' : 'GOMU GOMU STOMP!!'), '#ffd060', 60, true);
            }
            if (this.dt >= S.goDur) self.endAct();
          } };
        break;
      }
      case 'pillar': {                                 // Mia: fire pillar in front, several ticks
        if (!this.spend(S.cost)) return;
        this.anim.play(S.pose, S.dur, true); sfx().big();
        const x = this.cx + this.face * S.dist, fl = g.floorBelow(x, this.feet - 30);
        this.act = { kind: 'skill', t: 0, pose: S.pose, slow: 0,
          update() { this.t++; if (this.t === S.at) { g.fx('pillar', x, fl - 48, { scale: 1 }); g.shake(3); sfx().boom(); }
            if (this.t >= S.at && (this.t - S.at) % S.every === 0 && (this.t - S.at) / S.every < S.hits) g.hit({ x: x - S.box[0] / 2, y: fl - S.box[1], w: S.box[0], h: S.box[1] }, S.dmg, { id: newSwing(), kb: 2, dir: self.face, from: self, up: true, multi: true });
            if (this.t >= S.dur) self.endAct(); } };
        this.act.cancellable = false;
        break;
      }
      case 'proj': case 'flare': {
        if (S.max && g.countProj(this, S.proj) >= S.max) return;
        if (!this.spend(S.cost)) return;
        this.anim.play(S.pose, S.dur, true); sfx().big();
        this.act = { kind: 'skill', t: 0, pose: S.pose, slow: 0, canTurn: false,
          update() { if (++this.t === S.fireAt) { g.spawnProj(S.proj, self.cx + self.face * 18, self.feet + (S.y || -26), self.face, { owner: self }); if (S.recoil) self.vx = -self.face * S.recoil; if (PLAT.PROJ[S.proj].shake) g.shake(PLAT.PROJ[S.proj].shake); }
            if (this.t >= S.dur) self.endAct(); } };
        break;
      }
      case 'spin': {
        if (!this.spend(S.cost)) return;
        this.anim.play(S.pose, S.loopPose ? null : S.dur, true); sfx().big();
        this.act = { kind: 'spin', t: 0, pose: S.pose, slow: S.front ? 0 : .6, hover: !!S.hover, canTurn: !S.front,
          update() { this.t++; if (this.t % S.every === 1) { sfx().swing(); g.hit(S.front ? self.box(S.box) : { x: self.cx + S.box[0], y: self.feet + S.box[1], w: S.box[2], h: S.box[3] }, S.dmg, { id: newSwing(), kb: 2, dir: self.face, from: self, los: self.losPt(), multi: true }); }
            if (S.hover && self.vy > 1) self.vy = 1;
            if (this.t >= S.dur) self.endAct(); } };
        break;
      }
      case 'inhale': this.startInhale(S, 'skill'); break;
      case 'slam': if (this.spend(S.cost)) this.startSlam(false); break;
      case 'flareCharge': {                            // Shovel Knight: hold = the fireball grows on the staff, release = it crawls out
        if (!this.onGround) return;
        if (!this.spend(S.cost)) return;
        const Z = S.sizes, lerp = (a, k) => a[0] + (a[1] - a[0]) * k, frames = this.anim.sheet.frames('fireball') || [];
        let k = 0;
        const ball = g.fx({ frames, rate: 3, scale: Z.scale[0] }, 0, 0, { loop: true, follow: () => ({ x: self.cx + self.face * (16 + k * 14), y: self.feet + S.y - k * 8 }) });
        this.anim.show(S.pose, 0); sfx().charge();
        this.act = { kind: 'flareCharge', t: 0, pose: S.pose, slow: S.slow, canTurn: true,
          update() {
            this.t++; k = Math.min(1, this.t / S.max); ball.scale = lerp(Z.scale, k);
            self.anim.show(S.pose, 0);
            if (this.t % 10 === 0 && k < 1) sfx().charge();
            if (this.t === S.max) { g.text(self.cx, self.y - 10, 'MAX!', '#ffb04a', 30); sfx().gem(); }
            if (this.t % 3 === 0) g.burst(self.cx + self.face * (16 + k * 14) + U.rnd(-6, 6) * (1 + k), self.feet + S.y - k * 8 + U.rnd(-6, 6) * (1 + k), k >= 1 ? '#ffe36a' : '#ff8a3a', 1, .4);
            if (!g.input.isHeld('skill') || self.hurtT > 0) this.release();
          },
          release() {
            ball.dead = true;
            const base = PLAT.PROJ[S.proj], b = Math.round(lerp(Z.box, k)), dmg = Math.round(lerp(Z.dmg, k));
            const pd = Object.assign({}, base, { dmg, box: [b, b], speed: S.crawl, life: S.life, charged: true, pushSpeed: S.push,
              explode: Object.assign({}, base.explode, { r: Math.round(lerp(Z.boom, k)), dmg: Math.round(lerp(Z.boomDmg, k)) }) });
            const fb = g.spawnProj(pd, self.cx + self.face * (16 + k * 14), self.feet + S.y - k * 8, self.face, { owner: self, scale: lerp(Z.scale, k) });
            if (fb) fb.cluster = { members: [fb], cx: fb.x, cy: fb.y, lastId: 0 };
            sfx().big(); g.shake(1 + Math.round(k * 3));
            self.anim.play(S.pose, 12, true);
            self.act = { kind: 'skill', t: 0, pose: S.pose, slow: .3, cancellable: false, update() { if (++this.t >= 12) self.endAct(); else if (this.t > 4) this.cancellable = true; } };
          },
          onEnd() { ball.dead = true; } };
        break;
      }
      case 'beam': {
        if (!this.spend(S.cost)) return;
        this.anim.play(S.chargePose, null, true); sfx().charge();
        const fx = g.fx('orb', 0, 0, { follow: () => ({ x: self.cx + self.face * 22, y: self.feet + S.y }), loop: true });
        this.act = { kind: 'beam', t: 0, pose: S.chargePose, slow: 0, canTurn: false, chargeT: S.charge,
          update() {
            this.t++;
            if (this.t < S.charge) { if (this.t % 6 === 0) sfx().charge(); return; }
            if (this.t === S.charge) { self.anim.play(S.firePose, null, true); sfx().big(); g.shake(4); fx.dead = true; }
            const ft = this.t - S.charge, x0 = self.cx + self.face * 22, y = self.feet + S.y;
            let len = S.len; for (let d = 8; d < S.len; d += 8) if (W.solidAt(g.L, Math.floor((x0 + self.face * d) / C.T), Math.floor(y / C.T))) { len = d; break; }
            this.beam = { x0, y, len, t: ft };
            if (ft % S.every === 0) g.hit({ x: self.face > 0 ? x0 : x0 - len, y: y - S.h / 2, w: len, h: S.h }, S.dmg, { id: newSwing(), kb: 2, dir: self.face, from: self, fx: 'impact', multi: true });
            if (S.ult && ft % 6 === 0) g.shake(3);
            if (ft >= S.fire) self.endAct();
          }, onEnd() { fx.dead = true; } };
        this.act.draw = (ctx) => { const b = self.act && self.act.beam; if (b) g.drawBeam(ctx, b, self.face, S.h); };
        break;
      }
      case 'heat': {
        if (!this.spend(S.cost)) return;
        this.heat = 1; this.anim.play(S.pose, null, true); sfx().charge();
        const aura = g.fx('craura', 0, 0, { follow: () => ({ x: self.cx, y: self.feet - 22 }), loop: true, behind: true, alpha: .85 });
        this.act = { kind: 'heat', t: 0, pose: S.pose, slow: .25, canTurn: true, guardMul: .5,
          update() {
            this.t++;
            if (this.t % S.step === 0 && self.heat < S.max && g.input.isHeld('skill')) { if (self.en >= S.cost) { self.en -= S.cost; self.heat++; sfx().charge(); g.burst(self.cx, self.feet - 20, '#ff3a3a', 8, 2); g.text(self.cx, self.y - 6, 'HEAT ' + self.heat, '#ff5a5a', 30); } }
            if (!g.input.isHeld('skill') || this.t > 200) {
              const lv = self.heat; self.heat = 0; aura.dead = true; self.endAct();
              const pd = Object.assign({}, PLAT.PROJ[S.proj], { dmg: S.dmg[lv - 1], scale: .2 + lv * .07 });
              self.anim.play('cross', 14, true);
              g.spawnProj(pd, self.cx + self.face * 18, self.feet + S.y, self.face, { owner: self }); sfx().big(); g.shake(lv);
              self.act = { kind: 'step', t: 0, pose: 'cross', slow: .2, update() { if (++this.t >= 14) self.endAct(); } };
            }
          }, onEnd() { aura.dead = true; } };
        break;
      }
      case 'burst': {
        if (!this.spend(S.cost)) return;
        this.anim.play(S.pose, S.dur, true); g.text(this.cx, this.y - 10, S.name, '#ff4a6a', 60, true);
        this.act = { kind: 'burst', t: 0, pose: S.pose, slow: 0,
          update() { if (++this.t === S.at) { g.fx(S.fx, self.cx, self.feet - 34, { scale: .7 }); g.hit({ x: self.cx - S.r, y: self.feet - S.r, w: S.r * 2, h: S.r + 10 }, S.dmg, { id: newSwing(), kb: 7, dir: 0, from: self, fx: 'spark', los: self.losPt(), heavy: true }); g.shake(5); sfx().boom(); }
            if (this.t >= S.dur) self.endAct(); } };
        break;
      }
      case 'spindash': {
        if (!this.onGround) return;
        if (!this.spend(S.cost)) return;
        this.anim.play(S.rev, null, true);
        this.act = { kind: 'rev', t: 0, pose: S.rev, slow: 0, ownsMove: true, noJump: true, canTurn: true,
          update() {
            this.t++; self.vx *= .8; if (this.t % 8 === 0) { sfx().charge(); g.dust(self.cx - self.face * 10, self.feet, 2); }
            if (!g.input.isHeld(S.btn || 'skill') || this.t > 60) {
              const pow = U.clamp(this.t / 40, .5, 1), sw = newSwing();
              self.ball = true; sfx().dash(); self.anim.play(S.pose, null, true); self.inv = Math.max(self.inv, S.dur);
              self.act = { kind: 'spindash', t: 0, pose: S.pose, ownsMove: true, noJump: false, cancelOnJump: false,
                update() { this.t++; self.vx = self.face * S.speed * pow * (this.t > S.dur - 8 ? .8 : 1); self.bodyHit = { dmg: S.dmg, id: sw, kb: 6 }; if (this.t % 2 === 0) g.afterimage(self); if (this.t >= S.dur) { self.endAct(); self.runT = C.RUN_AFTER; } } };
            }
          } };
        break;
      }
    }
  }
  // Shovel Knight: a dash-slash that touches one of his own crawling fireballs bats it away, fast, in the dash direction
  batFireballs(box) {
    for (const pr of this.g.projs) {
      if (pr.dead || pr.enemy || pr.owner !== this || !pr.def.charged || pr.batted) continue;
      const b = pr.box(); if (!U.overlap(box, { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 })) continue;
      // the whole cluster flies together (same speed, so it stays one tight bunch)
      const list = pr.cluster ? pr.cluster.members.filter(q => !q.dead) : [pr];
      for (const q of list) { q.batted = true; q.dir = this.face; q.vx = this.face * q.def.pushSpeed; q.vy = 0; q.life = 120; q.id = newSwing(); }
      const G = this.g; G.hitstop(4); G.shake(3); sfx().clang(); sfx().big(); G.spark(pr.x, pr.y, 1.6); G.burst(pr.x, pr.y, '#ffd060', 10, 3);
      G.text(pr.x, pr.y - 16, list.length > 1 ? `ตีลูกไฟ! ×${list.length}` : 'ตีลูกไฟ!', '#ffb04a', 36);
    }
  }
  /* Shovel Knight: hitting his own crawling fireball with a normal attack splits off one more. Every split
     slows the whole bunch down further, and the new ball appears right next to the others (they stay one
     tight cluster, sharing one speed). One split per swing; at most CLUSTER_MAX balls. */
  splitFireball(pr, swingId) {
    const g = this.g, CL = pr.cluster || (pr.cluster = { members: [pr], cx: pr.x, cy: pr.y, lastId: 0 });
    if (CL.lastId === swingId) return; CL.lastId = swingId;
    const live = CL.members = CL.members.filter(q => !q.dead);
    if (live.length >= 8) { g.text(pr.x, pr.y - 16, 'เต็ม!', '#ffb04a', 24); return; }
    const sp = Math.max(.12, Math.abs(pr.vx) * .7) * (pr.dir || 1);
    const n = live.length, ang = n * 2.4, rad = 6 + Math.min(10, n * 2.2);           // golden-angle spiral: packed, never far apart
    const cx = live.reduce((a, q) => a + q.x, 0) / n, cy = live.reduce((a, q) => a + q.y, 0) / n;
    const nb = g.spawnProj(pr.def, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * .8, pr.dir, { owner: this, scale: pr.scale, vx: sp });
    if (!nb) return;
    nb.cluster = CL; live.push(nb);
    for (const q of live) { q.vx = sp; q.life = Math.max(q.life, q.def.life); }
    sfx().big(); g.shake(1); g.burst(nb.x, nb.y, '#ff8a3a', 8, 2); g.text(cx, cy - 18, `ลูกไฟ ×${live.length}`, '#ffb04a', 30);
  }
  /* Shovel Knight: SHOVEL METEOR as a normal move (air ↓ + attack). Plunges straight down fast; touching an
     enemy or spikes on the way bounces him up like the pogo (and the move stays on, so bounces chain);
     reaching the ground after a real drop makes a shock-wave + a few blasts. */
  startMeteorDive(M) {
    if (this.onGround) return;
    const self = this, g = this.g; let sw = newSwing();
    this.anim.play('pogo', null, true); sfx().dash();
    this.act = { kind: 'pogo', t: 0, pose: 'pogo', canTurn: true, cancellable: true, ownsY: true, fallT: 0,
      update() {
        this.t++;
        if (self.vy < M.fall) { self.vy = Math.min(M.fall, self.vy + (self.vy < 0 ? C.GRAV : 1.6)); }
        if (self.vy > 0) {
          this.fallT++;
          if (this.fallT % 2 === 0) g.burst(self.cx, self.y, '#ff8a3a', 1, .5);
          const box = { x: self.x + 1, y: self.feet - 4, w: self.w - 2, h: 16 };
          const n = g.hit(box, 1, { id: sw, kb: 0, dir: 0, from: self, pogo: true });
          const spikes = W.tilesIn(g.L, box, PLAT.TILE.SPIKE).length;
          if (n || spikes) { sw = newSwing(); self.vy = -8.6; this.fallT = 0; self.jumping = false; self.airDash = true; self.airJumps = self.maxAirJumps(); self.inv = Math.max(self.inv, 8); g.burst(self.cx, self.feet, '#ffffff', 5, 1.5); if (spikes) sfx().clang(); }
        }
      },
      onLand() {
        const big = this.fallT >= M.minFall; self.endAct();
        if (!big) { sfx().land(); return; }
        const w = M.wave; g.shake(4); g.hitstop(2); sfx().boom();
        for (let i = 0; i < M.booms; i++) { const x = self.cx + (i - (M.booms - 1) / 2) * 40; g.fx({ frames: self.anim.sheet.frames('boom') || PLAT.fxSheet(PLAT.FXDEF.boom), rate: 3, scale: 1.6 }, x, self.feet - 18, {}); }
        g.hit({ x: self.cx - w.r, y: self.feet - w.h, w: w.r * 2, h: w.h + 6 }, w.dmg, { id: newSwing(), kb: 6, dir: 0, from: self, up: true, los: self.losPt(), heavy: true });
        for (let i = 0; i < 10; i++) g.burst(self.cx + U.rnd(-w.r, w.r), self.feet - 2, i % 2 ? '#ff6a2a' : '#ffd060', 1, 2.2);
      } };
  }
  startPogo() {
    const self = this, g = this.g;
    this.anim.play('pogo', null, true);
    this.act = { kind: 'pogo', t: 0, pose: 'pogo', canTurn: true, cancellable: true,
      update() {
        this.t++;
        if (self.vy > 0) {
          const box = { x: self.x + 1, y: self.feet - 4, w: self.w - 2, h: 16 };
          const n = g.hit(box, 1, { id: newSwing(), kb: 0, dir: 0, from: self, pogo: true });
          const spikes = W.tilesIn(g.L, box, PLAT.TILE.SPIKE).length;
          if (n || spikes) { self.vy = -8.6; self.jumping = false; self.airDash = true; self.airJumps = self.maxAirJumps(); self.inv = Math.max(self.inv, 8); g.burst(self.cx, self.feet, '#ffffff', 5, 1.5); if (spikes) sfx().clang(); }
        }
      }, onLand() { self.endAct(); } };
  }
  startSlam(free, S0) {
    const self = this, g = this.g, S = S0 || this.hero.skill;
    this.vy = -S.leap; this.onGround = false; this.coyote = 0;
    this.anim.play(S.rise || 'jump', null, true); sfx().jump();
    const sw = newSwing();
    this.act = { kind: 'slam', t: 0, pose: 'jump', ownsMove: true, ownsY: true, noJump: true, phase: 'rise',
      update() {
        this.t++; self.vx *= .9;
        if (this.phase === 'rise') { self.vy += C.GRAV; if (self.vy >= -1) { this.phase = 'fall'; this.pose = S.drop || 'slamDown'; self.anim.play(this.pose, null, true); sfx().dash(); } }
        else if (this.phase === 'fall') { self.vy = S.fall; self.vx = 0; self.bodyHit = { dmg: 2, id: sw, kb: 3 }; if (this.t % 2 === 0) g.burst(self.cx, self.y, '#ff8a3a', 1, .5); }
        else if (this.phase === 'land') { self.vy += C.GRAV; if (++this.lt >= 24) self.endAct(); }
        if (this.t > 160) self.endAct();
      },
      onLand() {
        if (this.phase !== 'fall') return;
        this.phase = 'land'; this.lt = 0; this.pose = S.drop ? 'idle' : 'slamLand'; self.anim.play(this.pose, 24, true);
        if (S.booms) for (let i = 0; i < S.booms; i++) { const x = self.cx + (i - (S.booms - 1) / 2) * 44; g.fx({ frames: self.anim.sheet.frames('boom') || PLAT.fxSheet(PLAT.FXDEF.boom), rate: 3, scale: 2 }, x, self.feet - 20, {}); }
        const w = S.wave; g.shake(6); g.hitstop(3); sfx().boom();
        g.hit({ x: self.cx - w.r, y: self.feet - w.h, w: w.r * 2, h: w.h + 6 }, w.dmg, { id: newSwing(), kb: 7, dir: 0, from: self, up: true, los: self.losPt(), heavy: true });
        g.fx('ground', self.cx - 30, self.feet - 34, { scale: .32 }); g.fx('ground', self.cx + 30, self.feet - 34, { scale: .32, flip: true });
        for (let i = 0; i < 18; i++) g.burst(self.cx + U.rnd(-w.r, w.r), self.feet - 2, i % 2 ? '#ff6a2a' : '#ffd060', 1, 2.5);
      } };
  }
  stepAct(inp, ax) {
    const a = this.act;
    // X: charge while holding attack
    a.update && a.update();
  }

  /* ------------------------------- ULTIMATE ------------------------------- */
  gainUlt(n) {
    if (this.superT > 0 || !this.hero.ult) return;
    const was = this.ult >= 100; this.ult = Math.min(100, this.ult + n);
    if (!was && this.ult >= 100) { this.g.text(this.cx, this.y - 14, 'ULT พร้อม!', '#ffd84a', 70, true); sfx().gem(); }
  }
  startUlt() {
    const h = this.hero, U_ = h.ult, g = this.g, self = this;
    if (!U_ || this.ult < 100) return;
    this.ult = 0; this.pend = null; this.holdS = null; this.holdA = null; this.skillBuf = 0; this.dashBuf = 0; this.queued = false;
    if (this.act) this.endAct();
    this.inv = Math.max(this.inv, U_.inv || 70); this.floating = false;
    if (h.mod && h.mod.ult && h.mod.ult(this)) return;
    g.ultCut(this, U_.name);
    switch (U_.kind) {
      case 'arcs': {                                   // Knight: three huge crescents (up · straight · down)
        this.anim.play(U_.pose, U_.dur, true); const ang = [-.22, 0, .22];
        this.act = { kind: 'ult', t: 0, pose: U_.pose, slow: 0,
          update() { const i = U_.fireAt.indexOf(++this.t); if (i >= 0) { const pd = Object.assign({}, PLAT.PROJ[U_.proj], { dmg: U_.dmg, scale: U_.scale, box: [70, 64] }); const sp = pd.speed; g.spawnProj(pd, self.cx + self.face * 22, self.feet - 34, self.face, { owner: self, vx: self.face * Math.cos(ang[i]) * sp, vy: Math.sin(ang[i]) * sp }); sfx().big(); g.shake(4); }
            if (this.t >= U_.dur) self.endAct(); } };
        break;
      }
      case 'step': this.startStep(Object.assign({ ult: true }, U_.step), null); break;
      case 'stars': {                                  // Kirby: rise and spit a fan of giant stars
        this.vy = U_.rise; this.anim.play(U_.pose, U_.dur, true); let k = 0;
        this.act = { kind: 'ult', t: 0, pose: U_.pose, slow: 0, hover: true,
          update() { if (U_.at.includes(++this.t)) { const a = (k++ - 2) * .2, pd = Object.assign({}, PLAT.PROJ[U_.proj], { dmg: U_.dmg, scale: U_.scale, box: [40, 40], pierce: 99 }); g.spawnProj(pd, self.cx + self.face * 16, self.feet - 18, self.face, { owner: self, vx: self.face * Math.cos(a) * 7, vy: Math.sin(a) * 7 }); sfx().shoot(); }
            if (self.vy > .5) self.vy = .5; if (this.t >= U_.dur) self.endAct(); } };
        break;
      }
      case 'super': this.superT = U_.dur; this.superId = newSwing(); sfx().gem(); g.flashT = 14; break;
      case 'giga': {                                   // X: Giga Buster
        this.anim.play(U_.pose, U_.dur, true);
        this.act = { kind: 'ult', t: 0, pose: U_.pose, slow: 0,
          update() { if (++this.t === U_.fireAt) { const pd = Object.assign({}, PLAT.PROJ[U_.proj], { dmg: U_.dmg, scale: U_.scale, box: [110, 90], speed: 7 }); g.spawnProj(pd, self.cx + self.face * 30, self.feet - 28, self.face, { owner: self }); self.vx = -self.face * 3; g.shake(7); sfx().boom(); }
            if (this.t >= U_.dur) self.endAct(); } };
        break;
      }
      case 'dive': {                                   // Mia: Musasabi no Mai — rise, then a burning dive
        const sw = newSwing(); this.anim.play(U_.rise, null, true); this.vy = U_.riseVy;
        this.act = { kind: 'ult', t: 0, pose: U_.rise, ownsMove: true, ownsY: true, phase: 'rise',
          update() {
            this.t++;
            if (this.phase === 'rise') { self.vx = 0; self.vy += .35; if (this.t >= U_.riseT) { this.phase = 'dive'; this.pose = U_.pose; self.anim.play(U_.pose, null, true); sfx().dash(); } }
            else if (this.phase === 'dive') { self.vx = self.face * U_.vx; self.vy = U_.vy; self.bodyHit = { dmg: U_.dmg, id: sw, kb: 6 }; if (this.t % 2 === 0) g.fx('mburst', self.cx - self.face * 10, self.y + 20, { scale: .35 }); if (self.wall || this.t > 120) this.onLand(); }
            else if (++this.lt > 20) self.endAct();
          },
          onLand() {
            if (this.phase !== 'dive') return; this.phase = 'land'; this.lt = 0; this.pose = U_.land; self.anim.play(U_.land, null, true); self.vx = 0;
            g.fx('mburst', self.cx, self.feet - 30, { scale: 1.4 }); g.fx('pillar', self.cx - 40, self.feet - 48, {}); g.fx('pillar', self.cx + 40, self.feet - 48, {});
            g.hit({ x: self.cx - U_.boom.r, y: self.feet - U_.boom.r, w: U_.boom.r * 2, h: U_.boom.r + 8 }, U_.boom.dmg, { id: newSwing(), kb: 8, dir: 0, from: self, up: true, heavy: true }); g.shake(7); sfx().boom();
          } };
        break;
      }
      case 'beam': this.useSkill(Object.assign({ kind: 'beam', cost: 0, ult: true }, U_.beam)); this.g.text(this.cx, this.y - 20, 'ยึดหมด!!!', '#ff5a6a', 80, true); break;
      case 'meteor': this.startSlam(true, U_); break;
    }
  }

  /* -------------------------------- damage -------------------------------- */
  /* --------------------------------- counter --------------------------------- */
  counterPose() {
    const h = this.hero, A = h.attack;
    if (h.counterPose) return h.counterPose;
    if (A.steps && A.steps.length) return A.steps[A.steps.length - 1].pose;          // the combo finisher
    return (h.skill && h.skill.kind === 'step' && h.skill.pose) || A.pose || 'idle'; // shooters: their melee skill (X: Z-saber)
  }
  startCounter() {
    const g = this.g, self = this, perfect = !!this.counterPerfect, e = this.counterTarget && !this.counterTarget.dead ? this.counterTarget : null;
    if (this.act) this.endAct();
    this.parryOk = 0; this.counterTarget = null; this.inv = Math.max(this.inv, 50); this.cancelHeld();
    if (e) this.face = U.sign(e.cx - this.cx) || this.face;
    const pose = this.counterPose(), sw = newSwing(), dmg = (perfect ? COUNTER_PERFECT_DMG : COUNTER_DMG) * (PLAT.relicOn('shadow') ? 1.5 : 1), col = perfect ? '#ffe36a' : '#ffffff';
    const goal = e ? e.cx - this.face * (e.w / 2 + this.w / 2 + 6) : this.cx + this.face * 56;
    this.anim.play(pose, 30, true); sfx().dash(); g.hitstop(3);
    g.text(this.cx, this.y - 16, perfect ? 'PERFECT COUNTER!' : 'COUNTER!', perfect ? '#ffe36a' : '#ff5a6a', 70, true);
    this.act = { kind: 'counter', t: 0, pose, ownsMove: true, ownsY: true, noJump: true, canTurn: false, slash: 0,
      update() {
        this.t++;
        if (this.t <= 6) {                                       // flash-step
          const dx = (goal - self.cx) / Math.max(1, 7 - this.t);
          W.moveBody(g.L, self, dx, 0); self.vx = 0; self.vy = 0; g.afterimage(self); if (this.t % 2) g.burst(self.cx, self.y + self.h / 2, col, 2, 1);
        } else if (this.t === 7) {                               // the strike
          self.vx = 0; self.vy = 0; this.slash = 1;
          const box = { x: self.face > 0 ? self.cx - 10 : self.cx - 86, y: self.feet - 76, w: 96, h: 84 };
          g.hit(box, dmg, { id: sw, kb: 9, dir: self.face, from: self, up: true, heavy: true, finisher: true, fx: 'impact', shake: perfect ? 9 : 7, los: self.losPt() });
          g.hitstop(perfect ? 18 : 13); g.flashT = perfect ? 14 : 10; sfx().boom(); sfx().heavy(); PLAT.haptic('boss');
          const fx = e && !e.dead ? e : null, cx = fx ? fx.cx : self.cx + self.face * 40, cy = fx ? fx.y + fx.h / 2 : self.feet - 30;
          g.fx('impact', cx, cy, { scale: perfect ? 1.4 : 1.1 }); g.spark(cx, cy, 2.6);
          for (let i = 0; i < (perfect ? 30 : 20); i++) g.burst(cx, cy, i % 3 ? col : '#ff5a6a', 1, 4.2);
        } else { self.vx = 0; self.vy = Math.min(self.vy + .3, 3); this.slash++; if (this.t >= 26) self.endAct(); }
      },
      draw(ctx) {
        if (!this.slash || this.slash > 12) return;
        const k = this.slash / 12, cx = self.cx + self.face * 34, cy = self.feet - 34, r = 34 + k * 30;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
        const a0 = self.face > 0 ? -1.9 : Math.PI - 1.2, a1 = self.face > 0 ? 1.2 : Math.PI + 1.9;
        ctx.strokeStyle = col; ctx.lineWidth = 10 * (1 - k) + 2; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
        ctx.strokeStyle = perfect ? '#ff9a3a' : '#9fe8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r + 8, a0 + .3, a1 - .3); ctx.stroke();
        ctx.restore();
      } };
  }
  /* ---------------------------------- parry ---------------------------------- */
  startParry() {
    const a = this.act;
    if (a && /^(ult|beam|transform|nova|meteor|bigshot)$/.test(a.kind)) return;       // big committed moves cannot be cancelled
    if (a) this.endAct();
    this.cancelHeld();
    this.parryWin = PARRY_WIN + (PLAT.relicOn('shadow') ? 6 : 0); this.parryT = this.parryWin; this.parryCd = PARRY_CD;
    if (this.hero.parryPose) { this.anim.play(this.hero.parryPose, 30, true); this.parryAnim = 30; }   // v103: Luffy parries with Gomu Gomu Fusen
    sfx().swing(); this.g.burst(this.cx + this.face * 12, this.y + this.h * .4, '#cfe8ff', 4, 1.2);
  }
  parryPerfect() { return this.parryT > (this.parryWin || PARRY_WIN) - PARRY_PERFECT - 1; }
  onParry(e, fromX, perfect) {
    const g = this.g; if (perfect == null) perfect = this.parryPerfect();
    if (e && e.parried) e.parried(perfect, this.cx);
    if (this.hero.parryStars) {                       // v100 Kirby: a parried enemy (or its shot) drops stars to inhale — v116: EVERY enemy, not just bosses
      const B = e && !e.dead ? e : (!e && g.bossActive && g.boss && !g.boss.dead ? g.boss : null);
      if (B) g.dropMouthStars(B.cx, B.y + B.h * .3, B.boss ? this.hero.parryStars : B.elite ? 2 : 1);
      else if (fromX != null) g.dropMouthStars(fromX, this.y + this.h * .3, 1);   // a parried shot from a normal enemy
    }
    this.parryT = 0; this.parryCd = 6; this.parryOk = COUNTER_WIN;        // a successful parry is ready again almost at once (chains)
    this.counterTarget = e && !e.dead ? e : null; this.counterPerfect = perfect;
    this.inv = Math.max(this.inv, 22);
    this.en = Math.min(100, this.en + (perfect ? 30 : 15)); this.gainUlt(perfect ? 20 : 10);
    if (fromX != null) this.face = U.sign(fromX - this.cx) || this.face;
    g.hitstop(perfect ? 10 : 6); g.shake(perfect ? 4 : 2); g.flashT = perfect ? 8 : 4; sfx().clang(); if (perfect) sfx().gem(); PLAT.haptic(perfect ? 'big' : 'hit');
    const x = this.cx + this.face * 14, y = this.y + this.h * .4;
    g.spark(x, y, perfect ? 2.2 : 1.5); g.burst(x, y, perfect ? '#ffe36a' : '#cfe8ff', perfect ? 16 : 10, 3);
    g.text(this.cx, this.y - 12, perfect ? 'PERFECT PARRY!' : 'ปัด!', perfect ? '#ffe36a' : '#bfe8ff', perfect ? 50 : 36, perfect);
    g.stats.parries = (g.stats.parries || 0) + 1;
    if (PLAT.relicOn('halo')) { this.heal(15); g.text(this.cx, this.y - 26, '+15 😇', '#fff4a0', 30); }
  }
  // returns 'hit' | 'blocked' | 'ignored' | 'parried'
  hurt(dmg, fromX, o) {
    o = o || {};
    if (this.dead) return 'ignored';
    if (this.parryT > 0 && !o.unblockable) {
      let e = o.src || null;
      if (!e && fromX != null) { let bd = 110; for (const q of this.g.enemies) { if (q.dead) continue; const d = Math.abs(q.cx - fromX); if (d < bd) { bd = d; e = q; } } }
      this.onParry(e, fromX); return 'parried';
    }
    if (this.inv > 0) return 'ignored';
    if (!o.raw) dmg = Math.round(dmg * PLAT.HPU);                          // enemy damage is in old hearts
    if (PLAT.relicOn('aegis') && this.aegisCd <= 0 && !o.unblockable) {   // relic: the barrier eats one hit
      this.aegisCd = 900; this.inv = 40; sfx().clang(); PLAT.haptic('hit');
      this.g.burst(this.cx, this.y + this.h / 2, '#9fe8ff', 16, 3); this.g.text(this.cx, this.y - 10, 'BARRIER!', '#9fe8ff', 40, true); return 'blocked';
    }
    const dir = fromX < this.cx ? 1 : -1;      // pushed away from the source
    if (this.guarding && Math.sign(fromX - this.cx) === this.face && !o.unblockable) {
      this.vx = dir * 2; sfx().clang(); this.g.burst(this.cx + this.face * 10, this.y + 20, '#e0f0ff', 6, 2); this.inv = 12; this.g.text(this.cx, this.y - 4, 'กันได้!', '#bfe8ff', 30); return 'blocked';
    }
    if (this.act && this.act.guardMul && Math.random() < this.act.guardMul) { dmg = Math.max(0, dmg - 1); }
    this.hurtElem = o.elem && this.anim.poses['hurt_' + o.elem] ? o.elem : null;   // v100: burned / shocked / frozen strip
    this.hp = Math.max(0, this.hp - dmg); this.inv = C.INV_FRAMES; this.hurtT = this.hurtElem ? 28 : 16; this.streak = 0; this.charge = 0; this.heat = 0;
    if (this.act) this.endAct();
    this.floating = false; this.ball = false; this.mouth = null;
    const kb = this.hero.armor ? 1.5 : 2.8;
    this.vx = dir * kb; this.vy = -4.4; this.jumping = false;
    sfx().hurt(); PLAT.haptic('hurt'); this.g.shake(3); this.g.hitstop(4); this.g.burst(this.cx, this.y + 16, '#ff5a6a', 10, 2.4);
    if (dmg > 0) this.g.text(this.cx, this.y - 6, '-' + dmg, '#ff6a7a', 40);
    this.g.stats.hits++; this.gainUlt(8); this.g.hurtT = 18; this.g.chain = 0; this.g.chainT = 0; this.queued = false;
    if (this.hero.mod && this.hero.mod.onHurt) this.hero.mod.onHurt(this, dmg);
    if (this.hp <= 0 && PLAT.relicOn('phoenix') && !this.g.phoenixUsed) { this.g.phoenixUsed = true; this.rebirth(); return 'hit'; }
    if (this.hp <= 0) this.die();
    return 'hit';
  }
  die() {
    if (this.dead) return; this.dead = true; this.deadT = 0; if (this.act) this.endAct(); this.hurtT = 0; this.vy = -6; this.vx = -this.face * 1.2;
    // a charge / held move must not survive death (X kept flashing his charge palette while dying)
    this.charge = 0; this.holdS = null; this.holdA = null; this.queued = false; this.pend = null; this.dashBuf = 0; this.skillBuf = 0;
    sfx().die(); this.anim.play('dead', null, true);
    if (this.hero.mod && this.hero.mod.die) this.hero.mod.die(this);
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  maxAirJumps() { return (this.hero.airJumps || 0) + (PLAT.relicOn('wind') ? 1 : 0); }
  // relic: PHOENIX — rise from the ashes once per level
  rebirth() {
    const g = this.g; this.hp = Math.ceil(this.maxHp * .5); this.inv = 150; this.hurtT = 0; this.vy = -6;
    g.flashT = 16; g.shake(8); g.hitstop(14); sfx().boom(); sfx().gem(); PLAT.haptic('boss');
    g.text(this.cx, this.y - 20, '🔥 REBIRTH! 🔥', '#ff9a3a', 90, true);
    g.hit({ x: this.cx - 130, y: this.feet - 110, w: 260, h: 120 }, 10, { id: newSwing(), kb: 9, dir: 0, at: this.cx, from: this, heavy: true, up: true });
    for (let i = 0; i < 40; i++) g.burst(this.cx, this.y + this.h / 2, i % 2 ? '#ff6a1a' : '#ffd060', 1, 5);
  }
  /* POTION (H · pad Select · 🧪): drinks the smallest potion that covers most of what is missing */
  usePotion() {
    const g = this.g, B = PLAT.bag; if (this.dead) return false;
    if (this.hp >= this.maxHp) { g.text(this.cx, this.y - 8, 'HP เต็มแล้ว', '#c8ffd0', 30); sfx().denied(); return false; }
    const miss = (this.maxHp - this.hp) / this.maxHp, order = ['potS', 'potL', 'elixir'].filter(k => B.count(k) > 0);
    if (!order.length) { g.text(this.cx, this.y - 8, 'ไม่มียา! (ซื้อที่ร้านค้า)', '#ff9a9a', 40); sfx().denied(); return false; }
    const id = order.find(k => PLAT.ITEMS[k].heal >= miss * .6) || order[order.length - 1], it = PLAT.ITEMS[id];
    B.take(id); const n = Math.ceil(this.maxHp * it.heal); this.heal(n); if (it.inv) this.inv = Math.max(this.inv, it.inv);
    sfx().heart(); g.text(this.cx, this.y - 10, `${it.icon} +${n} HP`, '#7aff9a', 50, true);
    for (let i = 0; i < 18; i++) g.parts.push({ x: this.cx + U.rnd(-12, 12), y: this.feet - U.rnd(0, this.h), vx: U.rnd(-.4, .4), vy: U.rnd(-2.2, -.8), life: 30, col: i % 2 ? '#7aff9a' : '#ffffff', size: 3, grav: -.02, fade: true });
    g.emit('bag', {}); return true;
  }
  /* QUICK ITEM (G · pad R3 · HUD button) */
  useItem() {
    const g = this.g, B = PLAT.bag, id = B.d().quick, it = PLAT.ITEMS[id]; if (this.dead || !it) return false;
    if ((this.itemCd || 0) > 0) return false;
    if (!B.count(id)) { g.text(this.cx, this.y - 8, `ไม่มี ${it.icon} (ซื้อที่ร้านค้า)`, '#ff9a9a', 40); sfx().denied(); return false; }
    B.take(id); this.itemCd = 40; g.emit('bag', {});
    if (id === 'bomb') {
      const pd = { proc: 'bomb', col: '#2a2a3a', speed: 0, grav: .32, dmg: 2, life: 160, box: [16, 16], spin: .25, explode: { r: 80, dmg: 12 } };
      g.spawnProj(pd, this.cx + this.face * 10, this.feet - 30, this.face, { owner: this, vx: this.face * 4.6 + this.vx * .5, vy: -6.4 }); sfx().swing();
    } else if (id === 'frost') {
      let n = 0; const x0 = g.cam.x - 20, x1 = g.cam.x + PLAT.C.VW + 20;
      for (const e of g.enemies) if (!e.dead && e.cx > x0 && e.cx < x1) { e.frozenT = e.boss ? 60 : 180; e.release && e.release(); n++; }
      for (const pr of g.projs) if (pr.enemy) pr.dead = true;
      g.flashT = 10; g.shake(3); sfx().gem(); g.text(this.cx, this.y - 14, `❄️ FREEZE ×${n}`, '#bfe8ff', 60, true);
    } else if (id === 'meteor') {
      const x0 = g.cam.x, x1 = g.cam.x + PLAT.C.VW, tg = g.enemies.filter(e => !e.dead && e.cx > x0 && e.cx < x1);
      for (let i = 0; i < 8; i++) {
        const e = tg.length ? tg[i % tg.length] : null, tx = e ? e.cx + U.rnd(-20, 20) : U.rnd(x0 + 40, x1 - 40);
        g.warn(tx, g.floorBelow(tx, g.cam.y + 40), 20 + i * 7, () => g.spawnProj({ proc: 'meteor', col: '#ff7a2a', speed: 0, grav: .45, dmg: 8, life: 120, box: [24, 24], explode: { r: 44, dmg: 4 } }, tx - 60, g.cam.y - 10, 1, { owner: this, vx: 2.2, vy: 5 }));
      }
      sfx().roar(); g.shake(4); g.text(this.cx, this.y - 14, '☄️ METEOR RAIN!', '#ffb04a', 60, true);
    }
    return true;
  }
  // relic effects that run every frame
  relicTick() {
    const g = this.g;
    if (this.aegisCd > 0 && --this.aegisCd === 0) { g.text(this.cx, this.y - 8, '🛡️ บาเรียพร้อม', '#9fe8ff', 30); }
    if (this.itemCd > 0) this.itemCd--;
    if (this.dead) return;
    if (PLAT.relicOn('halo') && this.t % 30 === 0 && this.hp < this.maxHp) this.heal(1);
    if (PLAT.relicOn('berserk') && this.hp < this.maxHp * .4 && this.t % 3 === 0) g.burst(this.cx + U.rnd(-8, 8), this.feet - U.rnd(4, this.h), '#ff3a2a', 1, .6);
    if (PLAT.relicOn('dragon')) {
      if (this.t % 4 === 0) g.burst(this.cx + U.rnd(-30, 30), this.feet - U.rnd(0, 30), '#ff8a2a', 1, .5);
      if (this.t % 30 === 0) g.hit({ x: this.cx - 52, y: this.feet - 60, w: 104, h: 64 }, 1, { id: newSwing(), kb: 1, dir: 0, at: this.cx, from: this, multi: true, aura: true, noBreak: true });
    }
  }
  onHitLanded(n) {
    if (PLAT.relicOn('thunder') && (this.thunderN = (this.thunderN || 0) + n) >= 6 && this.lastTarget && !this.lastTarget.dead) {
      this.thunderN = 0; const e = this.lastTarget, g = this.g;
      g.bolts = g.bolts || []; g.bolts.push({ x: e.cx, y: e.y + e.h / 2, t: 12 });
      g.hit({ x: e.cx - 18, y: e.y - 10, w: 36, h: e.h + 20 }, 6, { id: newSwing(), kb: 3, dir: 0, from: this, proc: 'thunder', noBreak: true, heavy: true });
      sfx().boom(); g.flashT = 4; g.text(e.cx, e.y - 18, '⚡ THUNDER!', '#fff36a', 36);
    }
    this.en = Math.min(100, this.en + 3 * n);
    this.gainUlt(4 * n);
    this.streak += n; this.streakT = 180;
    const A = this.hero.attack;
    if (A.combo && this.streak === A.combo.at) this.g.text(this.cx, this.y - 10, 'คอมโบ ' + A.combo.at + '! หน้าไม้ทะลุ', '#ffe08a', 50);
  }

  /* -------------------------------- anim pose -------------------------------- */
  pose() {
    if (this.hero.mod && this.hero.mod.pose && this.hero.mod.pose(this)) { if (this.springT > 0) this.springT--; return; }
    const a = this.anim, m = this.mouth ? 'm_' : this.superT > 0 ? 's_' : '';
    const has = n => !!a.resolve(n) && (a.resolve(n).name === n);
    const pick = n => (m && has(m + n)) ? m + n : n;
    let want;
    if (this.dead) want = 'dead';
    else if (this.hurtT > 0) want = this.hurtElem ? 'hurt_' + this.hurtElem : pick('hurt');
    else if (this.parryAnim > 0 && this.hero.parryPose && !this.act) return;
    else if (this.act && this.act.pose) { const ap = m && has(m + this.act.pose) ? m + this.act.pose : this.act.pose; if (a.pose !== ap && a.pose !== this.act.pose) a.play(ap, null, true); return; }
    else if (this.guarding) want = 'guard';
    else if (this.wallDir) want = 'wall';
    else if (this.floating) want = 'float';
    else if (!this.onGround) {
      if (this.ball) want = pick('ball');
      else if (this.springT > 0 && has('spring')) want = 'spring';
      else if (a.pose === 'airjump' && !a.done) return;
      else want = pick(this.vy < 0 ? 'jump' : 'fall');
    } else {
      const sp = Math.abs(this.vx), top = C.RUN * (this.hero.speed || 1);
      const ax = (this.g.input.isHeld('right') ? 1 : 0) - (this.g.input.isHeld('left') ? 1 : 0);
      if (ax && ax !== U.sign(this.vx) && sp > 2.6 && has('skid')) want = 'skid';
      else if (sp > top * .82) want = pick('run');
      else if (sp > .35) want = pick('walk');
      else want = pick('idle');
    }
    if (this.springT > 0) this.springT--;
    if (a.pose !== want) a.play(want, null, a.pose === 'dead');
  }

  /* ---------------------------------- draw ---------------------------------- */
  draw(ctx) {
    const h = this.hero, g = this.g;
    if (this.inv > 0 && !this.dead && this.hurtT === 0 && !(this.act && /roll|spindash|dash/.test(this.act.kind)) && Math.floor(this.inv / 4) % 2) return;
    let y = this.feet, x = this.cx;
    if (h.stepBob && this.onGround && Math.abs(this.vx) > .35 && !this.act) y -= Math.abs(Math.sin(this.t * .32)) * 2.5;
    const fr = this.anim.frame();
    let rot = 0;
    if (this.dead && this.anim.pose === 'dead' && !this.anim.resolve('dead')) rot = Math.min(1.4, this.deadT * .06) * -this.face;
    const o = { sx: this.sq.x, sy: this.sq.y, smooth: h.smooth, rot };
    if (this.charge > 0) { const A = h.attack; let col = null; for (const c of A.charge || []) if (this.charge >= c.t) col = c.col; if (col && this.t % 6 < 3) o.flash = .5; }
    if (h.mod && h.mod.drawOpts) h.mod.drawOpts(this, o);
    if (this.act && this.act.draw) this.act.draw(ctx);
    if (h.mod && h.mod.drawExtra) h.mod.drawExtra(ctx, this);
    if (o.hide) return;
    if (!PLAT.drawFrame(ctx, fr, x, y, this.face, h.scale, o)) {      // image missing → coloured stand-in, never a crash
      ctx.fillStyle = h.color || '#fff'; ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    if (h.mod && h.mod.drawFront) h.mod.drawFront(ctx, this);
    // counter ready: a pulsing ⚔ over the head — press ATTACK now
    if (this.parryOk > 0 && !this.dead && !(this.act && this.act.kind === 'counter')) {
      ctx.save(); ctx.globalAlpha = .6 + Math.sin(this.t * .6) * .4; ctx.font = '900 12px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000a';
      ctx.strokeText('⚔ COUNTER', this.cx, this.y - 40); ctx.fillStyle = this.counterPerfect ? '#ffe36a' : '#ff8a8a'; ctx.fillText('⚔ COUNTER', this.cx, this.y - 40); ctx.restore();
    }
    // parry window: a bright guard arc in front (gold during the PERFECT frames); a flash after a successful parry
    if ((this.parryT > 0 || this.parryOk > COUNTER_WIN - 10) && !this.dead) {
      const perf = this.parryT > 0 && this.parryPerfect(), cx = this.cx + this.face * 6, cy = this.y + this.h * .5, r = this.h * .62;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = perf || this.parryOk > COUNTER_WIN - 10 ? 'rgba(255,230,120,.95)' : 'rgba(150,220,255,.85)'; ctx.lineWidth = perf ? 4 : 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, this.face > 0 ? -1.1 : Math.PI - 1.1 + 0, this.face > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r - 4, this.face > 0 ? -.8 : Math.PI - .8, this.face > 0 ? .8 : Math.PI + .8); ctx.stroke();
      ctx.restore();
    }
  }
}
PLAT.Player = Player;
PLAT.newSwing = newSwing;
})(typeof window !== 'undefined' ? window : globalThis);
