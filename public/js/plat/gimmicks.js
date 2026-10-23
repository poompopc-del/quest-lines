/* ==========================================================================
   PLATFORM MODE · level gimmicks (v108, world 4 "หนองพิษ")
   --------------------------------------------------------------------------
   Opt-in per level spec — a level without these keys is untouched:
     vents: [{ tx, ty, period, phase }]   poison gas vent on the tile row ty (the floor tile under it is ty + 1):
                                          bubbles → "!" warning (40 f) → a 3-tile gas column (50 f) that hurts
     rise:  { row, speed, delay, top }     poison flood that rises from tile row `row` after `delay` frames,
                                          `speed` px / frame, never above row `top`. Touch it = lose 1 heart and
                                          go back to the checkpoint; the flood restarts 4 tiles under it.
     dark:  { r }                          the level is pitch dark: light radius r around the hero, plus the lanterns
     lights: [{ tx, ty }]                  lanterns (glow + light) — map 'Y' places one too
   Lily pads are movers with `sink: true` (world.js): they sink while stood on and float back up.
   v115:
     vents in a level whose theme is not poison are FLAME jets (fire damage, orange)
     rise in a level whose theme has `lavaRise` is rising LAVA
     villagers: map 'R' — scared townsfolk; touch one to rescue it (coins / a heart back), save them all for a bonus
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, U = PLAT.U, T = C.T;
const sfx = () => PLAT.sfx;
const VENT_WARN = 40, VENT_ON = 50, VENT_H = 3;

class Gimmicks {
  constructor(g) {
    this.g = g; const s = g.spec, L = g.L;
    this.vents = (s.vents || []).concat(L.vents || []).map(v => ({ x: v.tx * T + T / 2, y: (v.ty + 1) * T, period: v.period || 190, t: Math.round((v.phase || 0) * (v.period || 190)) }));
    this.lights = (s.lights || []).map(l => ({ x: l.tx * T + T / 2, y: l.ty * T + T / 2 })).concat(L.lights || []);
    this.rise = s.rise ? Object.assign({ speed: .35, delay: 120, top: 2 }, s.rise) : null;
    if (this.rise) this.resetRise(this.rise.row * T);
    this.dark = s.dark ? Object.assign({ r: 110 }, s.dark) : null;
    const th = PLAT.THEMES[s.theme] || {};
    this.fire = !th.poison; this.lavaRise = !!th.lavaRise;                     // v115 flame jets / rising lava
    const kinds = ['vOld', 'vWoman', 'vHat', 'vBeard'];
    this.npcs = (L.npcs || []).map((n, i) => {
      const kind = kinds[i % kinds.length], sh = g.sheets.get('npc:' + kind);
      return { x: n.x, y: n.y, kind, st: 'scared', t: i * 23, anim: sh ? new PLAT.Anim(sh, {}) : null, dir: -1, alpha: 1 };
    });
    this.saved = 0;
    this.active = !!(this.vents.length || this.rise || this.dark || this.lights.length || this.npcs.length);
  }
  resetRise(y) { const R = this.rise; R.y = Math.min(y, this.g.L.ph + T); R.wait = R.delay; }
  /* ------------------------------------------------------------------ step */
  step() {
    const g = this.g, p = g.player;
    const armed = !g.spec.ventsFrom || (g.boss && !g.boss.dead && g.boss.phase >= g.spec.ventsFrom);   // v114 boss arena: vents wake in phase 2
    for (const v of this.vents) {
      if (!armed) { v.t = 0; continue; }
      v.t = (v.t + 1) % v.period; const on = this.ventOn(v);
      const F = this.fire;
      if (v.t % 9 === 0) g.parts.push({ x: v.x + U.rnd(-8, 8), y: v.y - 2, vx: 0, vy: U.rnd(-1.2, -.5), life: 22, col: F ? 'rgba(120,110,110,.6)' : 'rgba(150,230,110,.7)', size: 3, fade: true });
      if (this.ventWarn(v) && v.t % 3 === 0) g.parts.push({ x: v.x + U.rnd(-10, 10), y: v.y - 2, vx: U.rnd(-.4, .4), vy: U.rnd(-2.2, -1), life: 18, col: F ? '#ffb04a' : '#b8ff7a', size: 3 });
      if (on && v.t % 2 === 0) for (let i = 0; i < 2; i++) g.parts.push({ x: v.x + U.rnd(-12, 12), y: v.y - U.rnd(0, VENT_H * T), vx: U.rnd(-.6, .6), vy: U.rnd(-2.6, -1.2), life: 26, col: F ? (i ? 'rgba(255,200,60,.7)' : 'rgba(255,90,30,.65)') : 'rgba(120,220,90,.55)', size: 7, grav: -.02, fade: true });
      if (on && !p.dead && U.overlap(this.ventBox(v), p)) p.hurt(1, v.x, { unblockable: true, elem: this.fire ? 'fire' : 'poison' });
      if (on) for (const e of g.enemies) if (!e.dead && !e.boss && !e.def.ghost && U.overlap(this.ventBox(v), e) && g.frame % 20 === 0) e.takeHit(1, { id: -1, dir: 0 });
      if (v.t === v.period - VENT_ON && Math.abs(v.x - p.cx) < 360) { sfx().shoot(); if (!F) g.fxGround('acid', v.x, v.y, { scale: .9 }); }     // v120 sprite effects
      if (v.t === v.period - VENT_ON - VENT_WARN && Math.abs(v.x - p.cx) < 360) g.fxGround('smoke', v.x, v.y, { scale: .6 });
    }
    const R = this.rise;
    if (R && g.mode === 'play' && !p.dead) {
      if (R.wait > 0) R.wait--; else R.y = Math.max(R.top * T, R.y - R.speed);
      if (g.frame % 4 === 0) g.parts.push({ x: g.cam.x + U.rnd(0, C.VW), y: R.y + 4, vx: 0, vy: U.rnd(-1.4, -.4), life: 18, col: this.lavaRise ? '#ffd04a' : '#9aff6a', size: 3, fade: true });
      if (p.feet > R.y + 8) { this.flooded(); return; }
      for (const e of g.enemies) if (!e.dead && !e.boss && !e.def.ghost && e.feet > R.y + 10) e.kill({});
    }
    for (const n of this.npcs) this.stepNpc(n);
  }
  /* v115 villagers: shiver and call for help until you touch them → "thank you" + a reward → they walk off and fade */
  stepNpc(n) {
    const g = this.g, p = g.player; n.t++;
    if (n.anim) n.anim.update();
    if (n.st === 'scared') {
      if (n.anim) n.anim.play('idle');
      if (Math.abs(p.cx - n.x) < 260) n.dir = U.sign(p.cx - n.x) || n.dir;
      if (!p.dead && Math.abs(p.cx - n.x) < 22 && Math.abs(p.feet - n.y) < 40) {
        n.st = 'saved'; n.t = 0; this.saved++; if (PLAT.meta) PLAT.meta.track('villager'); const all = this.saved === this.npcs.length; g.emit('villager', { n: this.saved, of: this.npcs.length });
        sfx().checkpoint(); g.text(n.x, n.y - 58, all ? 'ช่วยครบทุกคนแล้ว! 🎉' : `ขอบคุณ! (${this.saved}/${this.npcs.length})`, '#8aff8a', 70, all);
        if (p.hp < p.maxHp) { p.heal(PLAT.HPU); g.text(p.cx, p.y - 20, '+' + PLAT.HPU + ' ❤', '#ff8aa8', 50); }
        g.fx('heal', p.cx, p.y + p.h / 2, { follow: () => ({ x: p.cx, y: p.y + p.h / 2 }) });
        const coins = all ? 15 : 5;
        for (let i = 0; i < coins; i++) g.loose.push({ x: n.x, y: n.y - 30, vx: U.rnd(-2, 2), vy: U.rnd(-6, -2.5), kind: 'coin', t: 0 });
        for (let i = 0; i < 10; i++) g.burst(n.x + U.rnd(-12, 12), n.y - U.rnd(0, 40), '#fff6a0', 1, 1.6);
        n.dir = -(U.sign(p.cx - n.x) || 1);
      }
    } else {                                    // walks home and fades away
      if (n.anim) n.anim.play(n.t > 30 ? 'move' : 'idle');
      if (n.t > 30) n.x += n.dir * .9;
      n.alpha = Math.max(0, 1 - Math.max(0, n.t - 90) / 50);
    }
  }
  fireFrames() { if (this._ff === undefined) { const d = PLAT.FXDEF && PLAT.FXDEF.fire; this._ff = d && PLAT.assets.img(d.img) ? PLAT.fxSheet(d).map(q => Object.assign({}, q, { by: q.sh - 3 })) : null; } return this._ff; }   // bottom-anchored copies
  ventOn(v) { return v.t >= v.period - VENT_ON; }
  ventWarn(v) { return v.t >= v.period - VENT_ON - VENT_WARN && !this.ventOn(v); }
  ventBox(v) { return { x: v.x - 12, y: v.y - VENT_H * T, w: 24, h: VENT_H * T }; }
  flooded() {
    const g = this.g, p = g.player;
    for (let i = 0; i < 16; i++) g.burst(p.cx + U.rnd(-12, 12), this.rise.y, this.lavaRise ? '#ff8a2a' : '#7ad05a', 1, 2.6);
    sfx().hurt(); g.flashT = 8;
    if (p.hp <= PLAT.HPU) { p.inv = 0; p.hurt(1, p.cx, { unblockable: true, elem: this.lavaRise ? 'fire' : 'poison' }); return; }
    p.hp -= PLAT.HPU; g.stats.hits++; g.text(p.cx, p.y, '-' + PLAT.HPU, '#ff6a7a', 40);
    p.endAct(); p.reset(g.checkpoint); p.inv = 90; g.snapCam();
    this.resetRise(g.checkpoint.y + 4 * T);
  }
  onRespawn() { if (this.rise) this.resetRise(this.g.checkpoint.y + 4 * T); for (const v of this.vents) v.t = 0; }
  /* ------------------------------------------------------------------ draw (world space) */
  draw(ctx) {
    const g = this.g, f = g.frame;
    for (const n of this.npcs) {
      if (n.alpha <= 0 || !n.anim) continue;
      const shiver = n.st === 'scared' ? Math.sin(n.t * 1.3) * .8 : 0;
      PLAT.drawFrame(ctx, n.anim.frame(), n.x + shiver, n.y + 1, -n.dir, 1.05, { alpha: n.alpha });
      if (n.st === 'scared' && Math.abs(g.player.cx - n.x) < 300 && n.t % 120 < 80) {
        ctx.font = '800 11px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000a';
        const tx = n.x, ty = n.y - 54 + Math.sin(n.t / 9) * 2;
        ctx.strokeText('ช่วยด้วย!', tx, ty); ctx.fillStyle = '#ffe36a'; ctx.fillText('ช่วยด้วย!', tx, ty);
      }
    }
    for (const v of this.vents) {
      // the vent mouth: a cracked stone ring that glows before it blows
      const warn = this.ventWarn(v), on = this.ventOn(v);
      const F = this.fire;
      ctx.fillStyle = '#2a2a1a'; ctx.fillRect(v.x - 13, v.y - 6, 26, 6); ctx.fillStyle = warn || on ? (F ? '#ffb04a' : '#b8ff7a') : (F ? '#7a3a1a' : '#5a7a3a'); ctx.fillRect(v.x - 9, v.y - 5, 18, 3);
      if (warn && f % 10 < 6) { ctx.fillStyle = '#ffe36a'; ctx.font = '900 16px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', v.x, v.y - 12); }
      if (on && F && this.fireFrames()) {                // v120: a column of real flames (Animated Fire, CC0)
        const fr = this.fireFrames(), k = (v.t - (v.period - VENT_ON)) / VENT_ON, grow = Math.min(1, k * 5), fade = Math.min(1, (1 - k) * 6);
        for (let i = 0; i < 3; i++) { const q = fr[Math.floor(f / 3 + i * 9) % fr.length], sc = (.95 - i * .15) * grow;
          PLAT.drawFrame(ctx, q, v.x + Math.sin(f / 5 + i) * 2, v.y - i * 26 * grow, i % 2 ? -1 : 1, sc, { alpha: fade, smooth: false }); }
      } else if (on) {
        const gr = ctx.createLinearGradient(0, v.y - VENT_H * T, 0, v.y);
        if (F) { gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(.6, 'rgba(255,150,40,.6)'); gr.addColorStop(1, 'rgba(255,240,140,.85)'); }
        else { gr.addColorStop(0, 'rgba(120,220,90,0)'); gr.addColorStop(1, 'rgba(140,240,100,.55)'); }
        ctx.fillStyle = gr; ctx.fillRect(v.x - 14 + Math.sin(f / 4) * 2, v.y - VENT_H * T, 28, VENT_H * T);
      }
    }
    const lamp = PLAT.assets.img('scenes/plat/town/street-lamp.png');
    if (lamp) for (const l of this.lights) {   // v122: the Gothicvania Town street lamp (ansimuz, CC0) instead of a drawn box
      const k = .45, w = lamp.width * k, h = lamp.height * k, by = l.y + 16; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lamp, l.x - w / 2, by - h, w, h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + (f % 30 < 15 ? .1 : 0); ctx.fillStyle = 'rgba(255,200,90,.35)'; ctx.beginPath(); ctx.arc(l.x, by - h + 10, 12, 0, 6.283); ctx.fill(); ctx.restore();
    }
    else for (const l of this.lights) {          // a swamp lantern on a post
      ctx.fillStyle = '#2a2016'; ctx.fillRect(l.x - 1.5, l.y - 4, 3, 22);
      ctx.fillStyle = '#5a4a2a'; ctx.fillRect(l.x - 6, l.y - 12, 12, 10);
      ctx.fillStyle = f % 30 < 15 ? '#ffd86a' : '#ffc84a'; ctx.fillRect(l.x - 4, l.y - 10, 8, 6);
    }
    const R = this.rise;
    if (R) {
      const y = R.y, x0 = g.cam.x - 10, w = C.VW + 20, bot = Math.max(y, g.cam.y + C.VH + 10);
      const LV = this.lavaRise;
      const at = g.theme.art && g.theme.art.tiles, lt = at && at.liquidTop && PLAT.assets.img(at.liquidTop), lf = at && at.liquid && PLAT.assets.img(at.liquid);
      if (lt && lf) {                         // v122: the rising flood is the world's own water / lava tiles
        ctx.imageSmoothingEnabled = false; const T = C.T, sx = Math.floor(x0 / T) * T;
        for (let x = sx; x < x0 + w; x += T) { const yy = y + Math.round(Math.sin((x + f * 2) / 22) * 2); ctx.drawImage(lt, x, yy, T, T); for (let yb = yy + T; yb < bot + 40; yb += T) ctx.drawImage(lf, x, yb, T, T); }
        if (!LV) { ctx.fillStyle = 'rgba(70,200,80,.3)'; ctx.fillRect(x0, y + 3, w, bot - y + 40); }
      } else {
        ctx.fillStyle = LV ? 'rgba(200,60,20,.88)' : 'rgba(40,110,50,.82)'; ctx.fillRect(x0, y, w, bot - y + 40);
        if (LV) { ctx.fillStyle = 'rgba(255,170,40,.35)'; ctx.fillRect(x0, y + 4, w, 10); }
        ctx.fillStyle = LV ? '#ffd04a' : '#7ad05a';
        for (let x = Math.floor(x0 / 8) * 8; x < x0 + w; x += 8) { const yy = y + Math.sin((x + f * 2) / 22) * 2.5; ctx.fillRect(x, yy - 1, 8, 3); }
      }
      if (R.wait > 0 && f % 20 < 12) { ctx.fillStyle = '#ffe36a'; ctx.font = '800 12px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(LV ? 'ลาวากำลังขึ้น!' : 'น้ำพิษกำลังขึ้น!', g.player.cx, y - 8); }
    }
  }
  /* ------------------------------------------------------------------ darkness (screen space) */
  drawDark(ctx, cx, cy) {
    if (!this.dark) return;
    const g = this.g, VW = C.VW, VH = C.VH, p = g.player;
    if (!this.cv) { this.cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(VW, VH) : Object.assign(document.createElement('canvas'), { width: VW, height: VH }); this.cx2 = this.cv.getContext('2d'); }
    const d = this.cx2; d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VW, VH); d.fillStyle = 'rgba(4,8,6,.94)'; d.fillRect(0, 0, VW, VH);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => { const gr = d.createRadialGradient(x, y, r * .25, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 6.283); d.fill(); };
    const flick = Math.sin(g.frame / 7) * 4;
    if (!p.dead) hole(p.cx - cx, p.y + p.h / 2 - cy, this.dark.r + flick);
    for (const l of this.lights) hole(l.x - cx, l.y - cy, 90 + flick);
    for (const pr of g.projs) if (!pr.enemy) hole(pr.x - cx, pr.y - cy, 30);         // your shots light the way
    for (const e of g.enemies) if (!e.dead && (e.def.ai === 'flyer' || e.def.ghost)) hole(e.cx - cx, e.y + e.h / 3 - cy, 14);   // glowing eyes in the dark
    ctx.drawImage(this.cv, 0, 0);
  }
}
PLAT.Gimmicks = Gimmicks;
})(typeof window !== 'undefined' ? window : globalThis);
