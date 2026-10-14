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
    this.x = spawn.x - this.w / 2; this.y = spawn.y - this.h; this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.coyote = 0; this.buffer = 0; this.jumping = false; this.airJumps = 0; this.runT = 0; this.drop = 0;
    this.inv = 0; this.hurtT = 0; this.dead = false; this.deadT = 0; this.act = null; this.cd = { dash: 0, shot: 0 };
    this.combo = 0; this.comboWin = 0; this.queued = false; this.floating = false; this.wallDir = 0; this.wallLock = 0;
    this.ball = false; this.mouth = null; this.charge = 0; this.airDash = true; this.rocketUsed = false; this.heat = 0;
    this.mover = null; this.sq = { x: 1, y: 1 }; this.guarding = false; this.bodyHit = null; this.streak = 0; this.streakT = 0;
    this.t = 0; this.airT = 0; this.landT = 0; this.lastSafe = { x: spawn.x, y: spawn.y };
    this.anim.play('idle', null, true);
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

    if (this.dead) { this.deadT++; this.vy = Math.min(this.vy + C.GRAV, C.MAX_FALL); this.vx *= .9; W.moveBody(g.L, this, this.vx, this.vy); this.pose(); this.anim.update(); return; }

    const ax = (inp.isHeld('right') ? 1 : 0) - (inp.isHeld('left') ? 1 : 0);
    if (inp.wasPressed('jump')) this.buffer = C.BUFFER; else if (this.buffer > 0) this.buffer--;
    if (this.onGround) { this.coyote = C.COYOTE; this.airJumps = h.airJumps || 0; this.airDash = true; this.rocketUsed = false; this.floating = false; }
    else if (this.coyote > 0) this.coyote--;

    if (this.hurtT > 0) { this.hurtT--; }
    else {
      this.startActions(inp, ax);
      if (h.attack.charge && this.charge > 0) {            // X: hold attack to charge the buster
        if (inp.isHeld('attack')) { this.charge++; const A = h.attack; if (this.charge === A.charge[0].t || this.charge === A.charge[A.charge.length - 1].t) sfx().charge(); if (this.charge > A.charge[0].t && this.t % 3 === 0) g.burst(this.cx + U.rnd(-14, 14), this.feet - U.rnd(4, 40), this.charge >= A.charge[A.charge.length - 1].t ? '#ff7af0' : '#6ad8ff', 1, .4); }
        else this.releaseCharge();
      }
      if (this.act) this.stepAct(inp, ax);
      if (!this.act || !this.act.ownsMove) this.walk(inp, ax);
      if (!this.act || !this.act.noJump) this.jumpLogic(inp, ax);
    }
    // gravity
    const ownsY = this.act && this.act.ownsY;
    // variable jump height: letting go early cuts the rise (springs / bounces are never cut)
    if (this.jumping && this.cutOK && !inp.isHeld('jump') && this.airT >= C.MIN_JUMP && this.vy < -C.JUMP_CUT) { this.vy = -C.JUMP_CUT; this.cutOK = false; }
    if (!ownsY) {
      const up = this.jumping && inp.isHeld('jump') && this.vy < 0;
      this.vy += up ? C.GRAV_UP : C.GRAV;
      let maxFall = C.MAX_FALL;
      if (this.floating) maxFall = h.float.maxFall;
      if (this.wallDir && this.vy > 0) maxFall = 2.2;
      if (this.act && this.act.hover) maxFall = 1.6;
      if (this.vy > maxFall) this.vy = maxFall;
    }
    if (this.jumping && this.vy >= 0) this.jumping = false;
    this.physics(inp);
    if (this.act && this.act.afterMove) this.act.afterMove();
    if (this.ball && !this.onGround && !this.bodyHit) { if (!this.ballId) this.ballId = newSwing(); this.bodyHit = { dmg: 1, id: this.ballId, kb: 3, ball: true }; }
    if (!this.ball) this.ballId = 0;
    if (this.bodyHit) {
      const n = this.g.hit(this.bodyBox(), this.bodyHit.dmg, { id: this.bodyHit.id, kb: this.bodyHit.kb || 3, dir: this.face, from: this, body: true });
      if (n && this.bodyHit.ball) { this.vy = Math.min(this.vy, -7.5); this.jumping = false; this.ballId = newSwing(); this.airDash = true; }
    }
    this.pose(); this.anim.update();
  }

  /* ------------------------------ movement ------------------------------ */
  walk(inp, ax) {
    const h = this.hero, spd = h.speed || 1, accMul = h.accel || 1;
    if (this.wallLock > 0) ax = 0;
    if (ax && this.onGround) this.runT = (Math.sign(this.vx) === ax || Math.abs(this.vx) < .5) ? this.runT + 1 : 0; else if (this.onGround) this.runT = 0;
    let top = (this.runT >= C.RUN_AFTER ? C.RUN : C.WALK) * spd;
    if (!this.onGround) top = Math.max(C.WALK * spd, this.airTop || 0);
    if (this.act && this.act.slow) top *= this.onGround ? this.act.slow : 1;
    if (this.mouth) top *= .85;
    if (this.guarding) top = 0;
    const target = ax * top;
    let k;
    if (this.onGround) k = ax ? C.ACC_GROUND * accMul : C.DEC_GROUND; else k = C.ACC_AIR * accMul;
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
    this.ball = false; this.floating = false; this.jumping = false; this.springT = 0;
    if (vy > 4) { this.sq = { x: 1.14, y: .86 }; sfx().land(); this.g.dust(this.cx, this.feet, vy > 7 ? 6 : 3); }
    if (this.act && this.act.onLand) this.act.onLand(vy);
  }
  bodyBox() { return { x: this.x - 2, y: this.y - 2, w: this.w + 4, h: this.h + 4 }; }

  /* ------------------------------- abilities ------------------------------- */
  startActions(inp, ax) {
    const h = this.hero;
    const busy = this.act && !this.act.cancellable;
    // guard (Plink): hold ↓ on the ground
    if (h.guard && !this.act && this.onGround && inp.isHeld('down') && !ax) { this.guarding = true; this.vx *= .6; }
    // DASH
    if (inp.wasPressed('dash') && !busy && this.cd.dash <= 0) this.startDash();
    // SKILL
    else if (inp.wasPressed('skill') && !busy) this.startSkill(inp);
    // ATTACK
    if (inp.wasPressed('attack')) {
      if (!this.act || this.act.cancellable) this.startAttack(inp);
      else if (this.act.kind === 'step') this.queued = true;      // buffer the next combo step
    }
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
    if (!this.onGround && inp.isHeld('down') && A.down) { if (A.down === 'pogo') return this.startPogo(); if (A.down === 'slam') return this.startSlam(true); }
    if (A.kind === 'shot') {
      if (A.melee) { const e = g.nearestEnemy(this.cx, this.feet - this.h / 2, this.face, A.melee.range + this.w / 2, 30); if (e) return this.startStep(A.melee); }
      if (this.cd.shot > 0) return;
      if (A.max && g.countProj(this, A.proj) >= A.max) return;
      const st = A.combo && this.streak >= A.combo.at ? { pose: A.combo.pose, proj: A.combo.proj } : null;
      this.shoot(A, st ? { pose: st.pose, proj: st.proj } : null);
      this.cd.shot = A.rate; if (A.charge) this.charge = 1;
      return;
    }
    // melee combo
    const steps = A.steps, i = this.comboWin > 0 ? this.combo % steps.length : 0;
    this.startStep(steps[i], i);
    this.combo = i + 1; this.comboWin = 0;
    if (A.count) g.text(this.cx + this.face * 18, this.y - 4, A.count[i], i === 2 ? '#ff4a6a' : '#ffd84a', 34, true);
  }
  startStep(s, idx) {
    const swing = newSwing(), self = this;
    this.anim.play(s.pose, s.dur, true);
    if (s.lunge) this.vx = this.face * Math.max(Math.abs(this.vx), s.lunge) * (s.slide ? 1 : 1);
    sfx().swing();
    this.act = { kind: 'step', t: 0, s, swing, pose: s.pose, slow: s.slide ? 1 : .3, canTurn: false, idx,
      ownsMove: !!s.slide,
      update() {
        const t = ++this.t;
        if (s.slide) { self.vx *= .94; }
        if (t >= s.hit[0] && t <= s.hit[1]) {
          const n = self.g.hit(self.box(s.box), s.dmg, { id: swing, kb: s.kb, dir: self.face, from: self, shake: s.shake, fx: s.fx });
          if (n && s.fx && !this.fxDone) { this.fxDone = true; }
        }
        if (t >= s.dur) {
          self.endAct();
          self.comboWin = 14;
          if (self.queued) { self.queued = false; self.startAttack(self.g.input); }
        }
      } };
    this.queued = false;
  }
  shoot(A, o) {
    o = o || {};
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
  releaseCharge() {
    const A = this.hero.attack; if (!A.charge) return;
    let lv = null; for (const c of A.charge) if (this.charge >= c.t) lv = c;
    this.charge = 0;
    if (lv) {
      if (this.act && this.act.kind === 'shot') this.act = null;
      this.shoot(A, { proj: lv.proj }); sfx().big(); this.g.shake(2);
    }
  }

  startDash() {
    const h = this.hero, D = h.dash, g = this.g, self = this;
    if (!D) return;
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
    this.cd.dash = D.cd; this.floating = false;
    const sw = newSwing(); let multi = 0;
    this.anim.play(D.pose, null, true); sfx().dash();
    if (D.shout) g.text(this.cx + this.face * 10, this.y - 10, D.shout, '#ff5a6a', 70, true);
    if (D.inv) this.inv = Math.max(this.inv, D.inv);
    this.act = { kind: D.kind, t: 0, pose: D.pose, ownsMove: true, ownsY: !this.onGround || D.kind === 'dash', noJump: D.kind !== 'roll', stopOnWall: true,
      update() {
        this.t++;
        const ease = this.t > D.dur - 5 ? .7 : 1;
        self.vx = self.face * D.speed * ease;
        if (this.ownsY) self.vy = 0;
        if (D.hit) {
          if (D.hit.multi && this.t % D.hit.multi === 0) this.mid = newSwing();
          self.g.hit(self.box(D.hit.box), D.hit.dmg, { id: this.mid || sw, kb: D.hit.kb || 4, dir: self.face, from: self });
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
    if (!this.airDash) return; this.airDash = false; this.cd.dash = D.cd;
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
    const h = this.hero, g = this.g, self = this;
    let S = h.skill; if (!S) return;
    if (S.air && !this.onGround) S = S.air;
    if (this.mouth) { this.mouth = null; this.en = Math.min(100, this.en + 30); g.text(this.cx, this.y - 6, 'กลืน! +30 พลัง', '#ffb0e0', 50); sfx().heart(); return; }
    switch (S.kind) {
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
          update() { this.t++; if (this.t % S.every === 1) { sfx().swing(); g.hit(S.front ? self.box(S.box) : { x: self.cx + S.box[0], y: self.feet + S.box[1], w: S.box[2], h: S.box[3] }, S.dmg, { id: newSwing(), kb: 2, dir: self.face, from: self }); }
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
            if (ft % S.every === 0) g.hit({ x: self.face > 0 ? x0 : x0 - len, y: y - S.h / 2, w: len, h: S.h }, S.dmg, { id: newSwing(), kb: 2, dir: self.face, from: self, fx: 'impact' });
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
          update() { if (++this.t === S.at) { g.fx(S.fx, self.cx, self.feet - 34, { scale: .7 }); g.hit({ x: self.cx - S.r, y: self.feet - S.r, w: S.r * 2, h: S.r + 10 }, S.dmg, { id: newSwing(), kb: 7, dir: 0, from: self, fx: 'spark' }); g.shake(5); sfx().boom(); }
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
            if (!g.input.isHeld('skill') || this.t > 60) {
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
  startSlam(free) {
    const self = this, g = this.g, S = this.hero.skill;
    if (this.onGround) { this.vy = -S.leap; this.onGround = false; this.coyote = 0; }
    this.anim.play('jump', null, true); sfx().jump();
    const sw = newSwing();
    this.act = { kind: 'slam', t: 0, pose: 'jump', ownsMove: true, ownsY: true, noJump: true, phase: 'rise',
      update() {
        this.t++; self.vx *= .9;
        if (this.phase === 'rise') { self.vy += C.GRAV; if (self.vy >= -1) { this.phase = 'fall'; self.anim.play('slamDown', null, true); sfx().dash(); } }
        else if (this.phase === 'fall') { self.vy = S.fall; self.vx = 0; self.bodyHit = { dmg: 2, id: sw, kb: 3 }; if (this.t % 2 === 0) g.burst(self.cx, self.y, '#ff8a3a', 1, .5); }
        else if (this.phase === 'land') { self.vy += C.GRAV; if (++this.lt >= 24) self.endAct(); }
      },
      onLand() {
        if (this.phase !== 'fall') return;
        this.phase = 'land'; this.lt = 0; self.anim.play('slamLand', 24, true);
        const w = S.wave; g.shake(6); g.hitstop(3); sfx().boom();
        g.hit({ x: self.cx - w.r, y: self.feet - w.h, w: w.r * 2, h: w.h + 6 }, w.dmg, { id: newSwing(), kb: 7, dir: 0, from: self, up: true });
        g.fx('ground', self.cx - 30, self.feet - 34, { scale: .32 }); g.fx('ground', self.cx + 30, self.feet - 34, { scale: .32, flip: true });
        for (let i = 0; i < 18; i++) g.burst(self.cx + U.rnd(-w.r, w.r), self.feet - 2, i % 2 ? '#ff6a2a' : '#ffd060', 1, 2.5);
      } };
  }
  stepAct(inp, ax) {
    const a = this.act;
    // X: charge while holding attack
    a.update && a.update();
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
    this.g.stats.hits++;
    if (this.hp <= 0) this.die();
    return 'hit';
  }
  die() {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.act = null; this.hurtT = 0; this.vy = -6; this.vx = -this.face * 1.2;
    sfx().die(); this.anim.play('dead', null, true);
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  onHitLanded(n) {
    this.en = Math.min(100, this.en + 3 * n);
    this.streak += n; this.streakT = 180;
    const A = this.hero.attack;
    if (A.combo && this.streak === A.combo.at) this.g.text(this.cx, this.y - 10, 'คอมโบ ' + A.combo.at + '! หน้าไม้ทะลุ', '#ffe08a', 50);
  }

  /* -------------------------------- anim pose -------------------------------- */
  pose() {
    const a = this.anim, m = this.mouth ? 'm_' : '';
    const has = n => !!a.resolve(n) && (a.resolve(n).name === n);
    const pick = n => (m && has(m + n)) ? m + n : n;
    let want;
    if (this.dead) want = 'dead';
    else if (this.hurtT > 0) want = pick('hurt');
    else if (this.act && this.act.pose) { if (a.pose !== this.act.pose) a.play(this.act.pose, null, true); return; }
    else if (this.guarding) want = 'guard';
    else if (this.wallDir) want = 'wall';
    else if (this.floating) want = 'float';
    else if (!this.onGround) {
      if (this.ball) want = 'ball';
      else if (this.springT > 0 && has('spring')) want = 'spring';
      else if (a.pose === 'airjump' && !a.done) return;
      else want = this.mouth ? (this.vy < 0 ? 'm_jump' : 'm_fall') : (this.vy < 0 ? 'jump' : 'fall');
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
    if (this.act && this.act.draw) this.act.draw(ctx);
    if (!PLAT.drawFrame(ctx, fr, x, y, this.face, h.scale, o)) {      // image missing → coloured stand-in, never a crash
      ctx.fillStyle = h.color || '#fff'; ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }
}
PLAT.Player = Player;
PLAT.newSwing = newSwing;
})(typeof window !== 'undefined' ? window : globalThis);
