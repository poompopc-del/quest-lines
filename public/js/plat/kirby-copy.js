/* ==========================================================================
   PLATFORM MODE · Kirby COPY ABILITIES (v124)
   --------------------------------------------------------------------------
   Swallow (skill with a full mouth) a "power" monster and Kirby copies its power — like the real games.
   While Kirby has a power, ATTACK uses it; SKILL (empty mouth) throws the power away to inhale again.
   The power is lost on death. Stars swallowed are still banked for STAR STORM (player.js).
     🔥 FIRE   magma slime · devil slime · hell hound / ink hound          hold = fire breath
     ❄️ ICE    ghost · swamp goo                                          hold = frost breath (freezes; frozen = ×2 damage)
     ⚔️ SWORD  skeleton knight / ink knight · zombies (+ cone / bucket)    tap = slash combo (3rd = spin) · full HP = sword beam · air = spin
     ⚡ SPARK  flying eye / ink eye · vampire bat / ink bat                hold = electric aura around Kirby
     💣 BOMB   goblin bomber · mimic                                       tap = throw a bomb (3 at a time)
     🪨 STONE  licker · tyrant · chainsaw man · rat · mushroom              hold = turn to stone (invincible) · in the air = stone drop
   Loaded after player.js; adds methods to PLAT.Player.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, U = PLAT.U, C = PLAT.C;
const sfx = () => PLAT.sfx;
const COPY = PLAT.COPY = {
  fire:  { name: 'FIRE', th: 'ไฟ', icon: '🔥', col: '#ff8a3a', from: ['magma', 'hopper', 'hound', 'inkhound'] },
  ice:   { name: 'ICE', th: 'น้ำแข็ง', icon: '❄️', col: '#8ae0ff', from: ['ghost', 'goo'] },
  sword: { name: 'SWORD', th: 'ดาบ', icon: '⚔️', col: '#c8ff8a', from: ['skel', 'inkskel', 'zombie', 'cone', 'bucket'] },
  spark: { name: 'SPARK', th: 'สายฟ้า', icon: '⚡', col: '#ffe36a', from: ['eye', 'inkeye', 'bat', 'inkbat'] },
  bomb:  { name: 'BOMB', th: 'ระเบิด', icon: '💣', col: '#ff6a6a', from: ['goblin', 'mimic'] },
  stone: { name: 'STONE', th: 'หิน', icon: '🪨', col: '#c8b8a8', from: ['licker', 'tyrant', 'salvador', 'rat', 'shroom'] },
};
const BY_TYPE = {}; for (const [id, c] of Object.entries(COPY)) for (const t of c.from) BY_TYPE[t] = id;
PLAT.copyOf = types => { for (let i = (types || []).length - 1; i >= 0; i--) if (BY_TYPE[types[i]]) return BY_TYPE[types[i]]; return null; };   // the last power swallowed wins

const P = PLAT.Player.prototype;
P.gainCopy = function (id) {
  const c = COPY[id]; if (!c) return;
  const had = this.copy; this.copy = id; this.copyCd = 0; this.swordN = 0;
  this.g.ultCut(this, `${c.icon} ${c.name} · ${c.th}`);
  this.g.fx('sparkle', this.cx, this.y + 10, { scale: 2 }); sfx().gem(); this.sq = { x: 1.25, y: .8 };
  if (PLAT.meta) PLAT.meta.track('copy');
  if (!had) this.g.text(this.cx, this.y - 30, 'สกิล (ตอนปากว่าง) = ทิ้งพลัง', '#ffe0f0', 90);
};
P.dropCopy = function () {
  const c = COPY[this.copy]; if (!c) return;
  this.copy = null; this.g.fx('smoke', this.cx, this.y + 12, { scale: 1 }); this.g.text(this.cx, this.y - 8, `ทิ้งพลัง ${c.icon}`, '#ffb0e0', 40); sfx().select();
};
// ATTACK with a power
P.startCopy = function (inp) {
  const g = this.g, self = this, id = this.copy;
  if (this.copyCd > 0) return;
  const held = () => g.input.isHeld('attack');
  switch (id) {
    case 'fire': case 'ice': {                         // hold = breath
      const proj = id === 'fire' ? 'kfire' : 'kice';
      this.anim.play('exhale', null, true);
      this.act = { kind: 'copy', t: 0, pose: 'exhale', slow: .35, canTurn: true,
        update() {
          this.t++; if (self.anim.pose !== 'exhale' || self.anim.done) self.anim.play('exhale', null, true);
          if (this.t % 4 === 1) { g.spawnProj(proj, self.cx + self.face * 18, self.feet - 16 + U.rnd(-3, 3), self.face, { owner: self, vy: U.rnd(-.5, .5) }); if (this.t % 12 === 1) sfx().shoot(); }
          if ((!held() && this.t > 8) || this.t > 110) { self.copyCd = 14; self.endAct(); }
        } };
      break;
    }
    case 'spark': {                                    // hold = electric aura
      this.anim.play('guard', null, true);
      this.act = { kind: 'copy', t: 0, pose: 'guard', slow: .15, canTurn: false,
        update() {
          this.t++;
          if (this.t % 7 === 1) {
            const r = 58; g.hit({ x: self.cx - r, y: self.y + self.h / 2 - r, w: r * 2, h: r * 2 }, 1, { id: PLAT.newSwing(), kb: 2, dir: 0, at: self.cx, from: self, multi: true });
            const a = Math.random() * 6.283; g.fx('zap', self.cx + Math.cos(a) * 26, self.y + self.h / 2 + Math.sin(a) * 22, { scale: .55 });
            if (this.t % 14 === 1) sfx().swing();
          }
          if ((!held() && this.t > 10) || this.t > 150) { self.copyCd = 18; self.endAct(); }
        },
        draw(ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + Math.sin(this.t) * .15; ctx.strokeStyle = '#ffe36a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(self.cx, self.y + self.h / 2, 40 + Math.sin(this.t / 2) * 4, 0, 6.283); ctx.stroke(); ctx.restore(); } };
      break;
    }
    case 'bomb': {                                     // tap = throw (max 3 out)
      if (g.projs.filter(p => p.owner === this && p.def.kbomb).length >= 3) return;
      this.anim.play('exhale', 14, true);
      this.act = { kind: 'copy', t: 0, pose: 'exhale', slow: .5, canTurn: true,
        update() { if (++this.t === 4) { g.spawnProj('kbomb', self.cx + self.face * 14, self.feet - 24, self.face, { owner: self, vx: self.face * (inp.isHeld('up') ? 2.6 : 4.6) + self.vx * .5, vy: inp.isHeld('up') ? -7.5 : -4.5, grav: .3 }); sfx().swing(); }
          if (this.t >= 14) { self.copyCd = 8; self.endAct(); } } };
      break;
    }
    case 'sword': {                                    // slash combo · 3rd = spin · air = spin · full HP = sword beam
      const air = !this.onGround, n = air ? 2 : ((this.swordT > 0 ? this.swordN : 0) % 3);
      this.swordN = n + 1; this.swordT = 30;
      const spin = air || n === 2, sw = PLAT.newSwing();
      this.anim.play('atk3', spin ? 22 : 14, true); sfx().swing();
      if (spin && air) this.vy = Math.min(this.vy, -3);
      this.act = { kind: 'copy', t: 0, pose: 'atk3', slow: spin ? .6 : .25, canTurn: false,
        update() {
          this.t++;
          if (spin ? this.t % 5 === 3 && this.t < 20 : this.t === 4) {
            const box = spin ? { x: self.cx - 48, y: self.y - 14, w: 96, h: self.h + 26 } : { x: self.face > 0 ? self.cx : self.cx - 58, y: self.y - 10, w: 58, h: self.h + 16 };
            g.hit(box, spin ? 2 : 3, { id: spin ? PLAT.newSwing() : sw, kb: spin ? 4 : 5, dir: self.face, from: self, heavy: n === 2, multi: spin, los: self.losPt() });
            if (!spin && self.hp >= self.maxHp) { const d = Object.assign({}, PLAT.PROJ.arc, { dmg: 2, scale: .26, life: 34 }); g.spawnProj(d, self.cx + self.face * 22, self.y + self.h / 2, self.face, { owner: self }); }
          }
          if (this.t >= (spin ? 22 : 14)) { self.copyCd = spin ? 10 : 3; self.endAct(); }
        },
        draw(ctx) {
          const k = Math.min(1, this.t / 8); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(220,255,180,.8)'; ctx.lineWidth = 4; ctx.beginPath();
          if (spin) ctx.arc(self.cx, self.y + self.h / 2, 40, this.t * .5, this.t * .5 + 4); else { const a0 = self.face > 0 ? -1.4 : Math.PI + 1.4; ctx.arc(self.cx, self.y + self.h / 2, 36, a0, a0 + self.face * 2.6 * k, self.face < 0); }
          ctx.stroke(); ctx.restore();
        } };
      break;
    }
    case 'stone': {                                    // hold = stone (invincible); from the air it slams down
      const fromAir = !this.onGround; let landed = !fromAir;
      sfx().heavy(); this.sq = { x: 1.2, y: .8 };
      this.act = { kind: 'copy', t: 0, pose: 'guard', slow: 0, canTurn: false, ownsMove: true, stone: true,
        update() {
          this.t++; self.inv = Math.max(self.inv, 2); self.vx = 0;
          if (!landed) { self.vy = 10; if (self.onGround) { landed = true; g.shake(6); sfx().boom(); g.fxGround('ldust', self.cx, self.feet, { scale: 1.4 });
            g.hit({ x: self.cx - 40, y: self.feet - 36, w: 80, h: 40 }, 4, { id: PLAT.newSwing(), kb: 6, dir: 0, at: self.cx, from: self, up: true, heavy: true }); } }
          else self.vy = Math.max(self.vy, 0);
          if ((!held() && this.t > 14 && landed) || this.t > 180) { self.copyCd = 20; self.sq = { x: .85, y: 1.15 }; g.fx('smoke', self.cx, self.y + 10, { scale: .8 }); self.endAct(); }
        },
        draw(ctx) {
          const im = PLAT.assets.img('items/plat/props/rock.png'); if (!im) return;
          ctx.save(); ctx.imageSmoothingEnabled = false; const w = 28 * 1.6, h = 15 * 1.9; ctx.drawImage(im, self.cx - w / 2, self.feet - h, w, h); ctx.restore();
        } };
      break;
    }
  }
};
P.copyTick = function () { if (this.copyCd > 0) this.copyCd--; if (this.swordT > 0) this.swordT--; };
})(typeof window !== 'undefined' ? window : globalThis);
