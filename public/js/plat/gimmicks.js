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
    this.active = !!(this.vents.length || this.rise || this.dark || this.lights.length);
  }
  resetRise(y) { const R = this.rise; R.y = Math.min(y, this.g.L.ph + T); R.wait = R.delay; }
  /* ------------------------------------------------------------------ step */
  step() {
    const g = this.g, p = g.player;
    for (const v of this.vents) {
      v.t = (v.t + 1) % v.period; const on = this.ventOn(v);
      if (v.t % 9 === 0) g.parts.push({ x: v.x + U.rnd(-8, 8), y: v.y - 2, vx: 0, vy: U.rnd(-1.2, -.5), life: 22, col: 'rgba(150,230,110,.7)', size: 3, fade: true });
      if (this.ventWarn(v) && v.t % 3 === 0) g.parts.push({ x: v.x + U.rnd(-10, 10), y: v.y - 2, vx: U.rnd(-.4, .4), vy: U.rnd(-2.2, -1), life: 18, col: '#b8ff7a', size: 3 });
      if (on && v.t % 2 === 0) for (let i = 0; i < 2; i++) g.parts.push({ x: v.x + U.rnd(-12, 12), y: v.y - U.rnd(0, VENT_H * T), vx: U.rnd(-.6, .6), vy: U.rnd(-2.6, -1.2), life: 26, col: 'rgba(120,220,90,.55)', size: 7, grav: -.02, fade: true });
      if (on && !p.dead && U.overlap(this.ventBox(v), p)) p.hurt(1, v.x, { unblockable: true, elem: 'poison' });
      if (on) for (const e of g.enemies) if (!e.dead && !e.boss && !e.def.ghost && U.overlap(this.ventBox(v), e) && g.frame % 20 === 0) e.takeHit(1, { id: -1, dir: 0 });
      if (v.t === v.period - VENT_ON && Math.abs(v.x - p.cx) < 360) sfx().shoot();
    }
    const R = this.rise;
    if (R && g.mode === 'play' && !p.dead) {
      if (R.wait > 0) R.wait--; else R.y = Math.max(R.top * T, R.y - R.speed);
      if (g.frame % 4 === 0) g.parts.push({ x: g.cam.x + U.rnd(0, C.VW), y: R.y + 4, vx: 0, vy: U.rnd(-1.4, -.4), life: 18, col: '#9aff6a', size: 3, fade: true });
      if (p.feet > R.y + 8) { this.flooded(); return; }
      for (const e of g.enemies) if (!e.dead && !e.boss && !e.def.ghost && e.feet > R.y + 10) e.kill({});
    }
  }
  ventOn(v) { return v.t >= v.period - VENT_ON; }
  ventWarn(v) { return v.t >= v.period - VENT_ON - VENT_WARN && !this.ventOn(v); }
  ventBox(v) { return { x: v.x - 12, y: v.y - VENT_H * T, w: 24, h: VENT_H * T }; }
  flooded() {
    const g = this.g, p = g.player;
    for (let i = 0; i < 16; i++) g.burst(p.cx + U.rnd(-12, 12), this.rise.y, '#7ad05a', 1, 2.6);
    sfx().hurt(); g.flashT = 8;
    if (p.hp <= PLAT.HPU) { p.inv = 0; p.hurt(1, p.cx, { unblockable: true, elem: 'poison' }); return; }
    p.hp -= PLAT.HPU; g.stats.hits++; g.text(p.cx, p.y, '-' + PLAT.HPU, '#ff6a7a', 40);
    p.endAct(); p.reset(g.checkpoint); p.inv = 90; g.snapCam();
    this.resetRise(g.checkpoint.y + 4 * T);
  }
  onRespawn() { if (this.rise) this.resetRise(this.g.checkpoint.y + 4 * T); for (const v of this.vents) v.t = 0; }
  /* ------------------------------------------------------------------ draw (world space) */
  draw(ctx) {
    const g = this.g, f = g.frame;
    for (const v of this.vents) {
      // the vent mouth: a cracked stone ring that glows before it blows
      const warn = this.ventWarn(v), on = this.ventOn(v);
      ctx.fillStyle = '#2a2a1a'; ctx.fillRect(v.x - 13, v.y - 6, 26, 6); ctx.fillStyle = warn || on ? '#b8ff7a' : '#5a7a3a'; ctx.fillRect(v.x - 9, v.y - 5, 18, 3);
      if (warn && f % 10 < 6) { ctx.fillStyle = '#ffe36a'; ctx.font = '900 16px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', v.x, v.y - 12); }
      if (on) {
        const gr = ctx.createLinearGradient(0, v.y - VENT_H * T, 0, v.y);
        gr.addColorStop(0, 'rgba(120,220,90,0)'); gr.addColorStop(1, 'rgba(140,240,100,.55)');
        ctx.fillStyle = gr; ctx.fillRect(v.x - 14 + Math.sin(f / 4) * 2, v.y - VENT_H * T, 28, VENT_H * T);
      }
    }
    for (const l of this.lights) {          // a swamp lantern on a post
      ctx.fillStyle = '#2a2016'; ctx.fillRect(l.x - 1.5, l.y - 4, 3, 22);
      ctx.fillStyle = '#5a4a2a'; ctx.fillRect(l.x - 6, l.y - 12, 12, 10);
      ctx.fillStyle = f % 30 < 15 ? '#ffd86a' : '#ffc84a'; ctx.fillRect(l.x - 4, l.y - 10, 8, 6);
    }
    const R = this.rise;
    if (R) {
      const y = R.y, x0 = g.cam.x - 10, w = C.VW + 20, bot = Math.max(y, g.cam.y + C.VH + 10);
      ctx.fillStyle = 'rgba(40,110,50,.82)'; ctx.fillRect(x0, y, w, bot - y + 40);
      ctx.fillStyle = '#7ad05a';
      for (let x = Math.floor(x0 / 8) * 8; x < x0 + w; x += 8) { const yy = y + Math.sin((x + f * 2) / 22) * 2.5; ctx.fillRect(x, yy - 1, 8, 3); }
      if (R.wait > 0 && f % 20 < 12) { ctx.fillStyle = '#ffe36a'; ctx.font = '800 12px Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('น้ำพิษกำลังขึ้น!', g.player.cx, y - 8); }
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
