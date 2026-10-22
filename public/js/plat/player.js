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

let SWING = 1;                         // global swing id: one swing hits each target once
const newSwing = () => ++SWING;

class Player {
  constructor(g, heroId, spawn, sheet) {
    const h = this.hero = PLAT.HEROES[heroId]; this.id = heroId; this.g = g;
    this.anim = new PLAT.Anim(sheet, h.poses);
    this.w = h.box[0]; this.h = h.box[1];
    this.maxHp = h.hp; this.hp = h.hp; this.en = 100;
    this.reset(spawn);
  }
  reset(spawn) {
    if (this.act) this.endAct();          // retry / respawn: a looping skill effect must not survive the reset
    this.x = spawn.x - this.w / 2; this.y = spawn.y - this.h; this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.coyote = 0; this.buffer = 0; this.jumping = false; this.airJumps = 0; this.runT = 0; this.drop = 0;
    this.inv = 0; this.hurtT = 0; this.dead = false; this.deadT = 0; this.act = null; this.cd = { dash: 0, shot: 0 };
    this.combo = 0; this.comboWin = 0; this.queued = false; this.floating = false; this.wallDir = 0; this.wallLock = 0;
    this.ball = false; this.mouth = null; this.charge = 0; this.airDash = true; this.rocketUsed = false; this.heat = 0;
    this.mover = null; this.dashJump = false; this.sq = { x: 1, y: 1 }; this.guarding = false; this.bodyHit = null; this.streak = 0; this.streakT = 0;
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
    if (this.onGround) { this.coyote = C.COYOTE; this.airJumps = h.airJumps || 0; this.airDash = true; this.rocketUsed = false; this.floating = false; }
    else if (this.coyote > 0) this.coyote--;

    const md = h.mod, busy = md && md.update ? md.update(this, inp, ax) : false;   // hero module: forms, hover, beam-in …
    if (this.hurtT > 0) { this.hurtT--; if (this.onGround) this.vx *= .86; }
    else if (busy) { if (this.act) this.stepAct(inp, ax); }
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
      if (n && this.bodyHit.dive && this.act) { this.endAct(); this.vy = -(this.hero.moves.downAir.bounce || 7); this.jumping = false; this.airJumps = this.hero.airJumps || 0; }
    }
    this.pose(); this.anim.update();
  }

  /* ------------------------------ movement ------------------------------ */
  walk(inp, ax) {
    const h = this.hero, spd = h.speed || 1, accMul = h.accel || 1;
    if (this.wallLock > 0) ax = 0;
    if (ax && this.onGround) this.runT = (Math.sign(this.vx) === ax || Math.abs(this.vx) < .5) ? this.runT + 1 : 0; else if (this.onGround) this.runT = 0;
    let top = (this.runT >= C.RUN_AFTER ? C.RUN : C.WALK) * spd * (this.superT > 0 ? h.ult.speed : 1);
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
    if (m && !(this.drop > 0)) { this.onGround = true; this.vy = 0; this.mover = m; this.groundTile = { t: -1 }; }
    if (this.onGround && this.vy > 0) this.vy = 0;
    if (this.onGround && !wasGround) this.land(preVy);
    if (!this.onGround) this.airT++; else this.airT = 0;
    // crumbling blocks start shaking when stood on
    if (this.onGround && this.groundTile && this.groundTile.t === PLAT.TILE.CRUMBLE) { if (W.touchCrumble(L, this.groundTile.tx, this.groundTile.ty)) sfx().crumble(); }
    // springs
    for (const s of L.springs) if (this.vy >= 0 && U.overlap({ x: this.x, y: this.feet - 6, w: this.w, h: 8 }, s)) {
      this.vy = -C.SPRING; this.jumping = true; this.cutOK = false;   // holding jump on a spring = higher bounce
      this.onGround = false; this.coyote = 0; s.sq = 14; this.airJumps = this.hero.airJumps || 0; this.airDash = true; this.rocketUsed = false;
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
        else { const t = this.holdA; this.holdA = null; if (t >= HM.t) { if (this.act) this.endAct(); this.doMove(HM); } }
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
    if (this.mouth && A.mouthful) return this.shoot(A.mouthful, { mouth: true });
    if (this.floating && h.float.puff) { this.floating = false; this.airJumps = 0; g.spawnProj(h.float.puff, this.cx + this.face * 14, this.feet - 16, this.face, { owner: this }); sfx().shoot(); return; }
    const M = h.moves || {}, run = this.onGround && Math.abs(this.vx) > C.RUN * (h.speed || 1) * .8;
    let mv = null;
    if (!this.onGround && inp.isHeld('down') && M.downAir) mv = M.downAir;
    else if (this.onGround && inp.isHeld('down') && M.down) mv = M.down;
    else if (inp.isHeld('up') && M.up) mv = M.up;
    else if (!this.onGround && M.air) mv = M.air;
    else if (run && M.run) mv = M.run;
    if (mv) { if (this.act) this.endAct(); return this.doMove(mv); }
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
    const self = this, pose = o.pose || A.pose, dur = A.dur || 14, proj = o.proj || A.proj;
    this.anim.play(pose, dur, true);
    this.act = { kind: 'shot', t: 0, pose, slow: .55, canTurn: true, cancellable: false,
      update() {
        if (++this.t === (A.fireAt || 1)) {
          self.g.spawnProj(proj, self.cx + self.face * 16, self.feet + (A.y || -24), self.face, { owner: self });
          sfx().shoot();
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
    this.anim.play(D.pose, null, true); sfx().dash();
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
          self.g.hit(self.box(D.hit.box), D.hit.dmg, { id: this.mid || sw, kb: D.hit.kb || 4, dir: self.face, from: self, los: self.losPt(), multi: !!D.hit.multi });
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
      case 'inhale': {
        if (!this.onGround) return;
        this.anim.play(S.pose, null, true); sfx().inhale();
        this.act = { kind: 'inhale', t: 0, pose: S.pose, slow: 0, canTurn: false,
          update() { this.t++; if (this.t % 30 === 0) sfx().inhale();
            const got = g.inhale(self, S);
            if (got) { self.mouth = got; self.endAct(); sfx().heart(); g.text(self.cx, self.y - 8, 'อม!', '#ff9ad8', 40); return; }
            if (!g.input.isHeld('skill') && this.t > 10) self.endAct(); } };
        break;
      }
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
            g.spawnProj(pd, self.cx + self.face * (16 + k * 14), self.feet + S.y - k * 8, self.face, { owner: self, scale: lerp(Z.scale, k) });
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
        this.act = { kind: 'beam', t: 0, pose: S.chargePose, slow: 0, canTurn: false,
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
    const g = this.g;
    for (const pr of g.projs) {
      if (pr.dead || pr.enemy || pr.owner !== this || !pr.def.charged || pr.batted) continue;
      const b = pr.box(); if (!U.overlap(box, { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 })) continue;
      pr.batted = true; pr.dir = this.face; pr.vx = this.face * pr.def.pushSpeed; pr.vy = 0; pr.life = 120; pr.id = newSwing();
      g.hitstop(4); g.shake(3); sfx().clang(); sfx().big(); g.spark(pr.x, pr.y, 1.6); g.burst(pr.x, pr.y, '#ffd060', 10, 3);
      g.text(pr.x, pr.y - 16, 'ตีลูกไฟ!', '#ffb04a', 36);
    }
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
          if (n || spikes) { sw = newSwing(); self.vy = -8.6; this.fallT = 0; self.jumping = false; self.airDash = true; self.airJumps = self.hero.airJumps || 0; self.inv = Math.max(self.inv, 8); g.burst(self.cx, self.feet, '#ffffff', 5, 1.5); if (spikes) sfx().clang(); }
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
          if (n || spikes) { self.vy = -8.6; self.jumping = false; self.airDash = true; self.airJumps = self.hero.airJumps || 0; self.inv = Math.max(self.inv, 8); g.burst(self.cx, self.feet, '#ffffff', 5, 1.5); if (spikes) sfx().clang(); }
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
  // returns 'hit' | 'blocked' | 'ignored'
  hurt(dmg, fromX, o) {
    o = o || {};
    if (this.dead || this.inv > 0) return 'ignored';
    const dir = fromX < this.cx ? 1 : -1;      // pushed away from the source
    if (this.guarding && Math.sign(fromX - this.cx) === this.face && !o.unblockable) {
      this.vx = dir * 2; sfx().clang(); this.g.burst(this.cx + this.face * 10, this.y + 20, '#e0f0ff', 6, 2); this.inv = 12; this.g.text(this.cx, this.y - 4, 'กันได้!', '#bfe8ff', 30); return 'blocked';
    }
    if (this.act && this.act.guardMul && Math.random() < this.act.guardMul) { dmg = Math.max(0, dmg - 1); }
    this.hp = Math.max(0, this.hp - dmg); this.inv = C.INV_FRAMES; this.hurtT = 16; this.streak = 0; this.charge = 0; this.heat = 0;
    if (this.act) this.endAct();
    this.floating = false; this.ball = false; this.mouth = null;
    const kb = this.hero.armor ? 1.5 : 2.8;
    this.vx = dir * kb; this.vy = -4.4; this.jumping = false;
    sfx().hurt(); PLAT.haptic('hurt'); this.g.shake(3); this.g.hitstop(4); this.g.burst(this.cx, this.y + 16, '#ff5a6a', 10, 2.4);
    if (dmg > 0) this.g.text(this.cx, this.y - 6, '-' + dmg, '#ff6a7a', 40);
    this.g.stats.hits++; this.gainUlt(8); this.g.hurtT = 18; this.g.chain = 0; this.g.chainT = 0; this.queued = false;
    if (this.hero.mod && this.hero.mod.onHurt) this.hero.mod.onHurt(this, dmg);
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
  onHitLanded(n) {
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
    else if (this.hurtT > 0) want = pick('hurt');
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
  }
}
PLAT.Player = Player;
PLAT.newSwing = newSwing;
})(typeof window !== 'undefined' ? window : globalThis);
