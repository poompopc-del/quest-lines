/* ==========================================================================
   PLATFORM MODE · animation controller
   --------------------------------------------------------------------------
   One controller drives every sprite (heroes, enemies, bosses, effects).
   A "sheet" turns a sprite definition into frame rectangles:
     strip  — one PNG per animation, n frames of cw × ch side by side
              (exactly the HERO_SPRITE format of the main game)
     grid   — one PNG, cols × rows of fw × fh cells (enemy sheets)
     atlas  — JSON rects (Shovel Knight)
   Poses name what the character is doing (idle / run / jump / attack …).
   A pose that a sheet lacks — or whose image failed to load — falls back
   through FALLBACK, so a missing animation never shows a wrong frame,
   flickers, or throws: the worst case is the idle frame.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT;
const FALLBACK = {
  run: ['walk', 'idle'], walk: ['idle'], jump: ['fall', 'idle'], fall: ['jump', 'idle'], airjump: ['jump', 'fall', 'idle'],
  float: ['fall', 'jump', 'idle'], wall: ['fall', 'jump', 'idle'], hurt: ['idle'], dead: ['hurt', 'idle'], skid: ['walk', 'idle'],
  guard: ['idle'], land: ['idle'],
};

/* -------------------------------- sheets -------------------------------- */
class Sheet {
  constructor(def) {
    this.def = def; this.anims = {};
    if (def.kind === 'atlas') this._atlas(def);
    else if (def.kind === 'grid') this._grid(def);
    else this._strips(def);
  }
  _strips(def) {
    for (const [name, a] of Object.entries(def.anims)) {
      const src = def.dir + (a.file || name) + '.png', frames = [];
      const by = a.by != null ? a.by : (def.by != null ? def.by : def.ch);   // feet line inside the cell
      if (a.rects) a.rects.forEach(([x, w, ax]) => frames.push({ src, sx: x + 1, sy: 0, sw: w - 2, sh: def.ch, ax: ax - 1, by }));   // 1 px inset: no divider bleed when smoothed
      else for (let i = 0; i < a.n; i++) frames.push({ src, sx: i * a.cw + (a.trimL || 0), sy: 0, sw: a.cw - (a.trimL || 0) - (a.trim || 0), sh: def.ch, ax: a.ax - (a.trimL || 0), by });
      this.anims[name] = frames;
    }
  }
  _grid(def) {
    const src = def.img;
    const cell = i => ({ src, sx: Math.round((i % def.cols) * def.fw), sy: Math.round(Math.floor(i / def.cols) * def.fh), sw: Math.floor(def.fw), sh: Math.floor(def.fh), ax: def.ax, by: def.by != null ? def.by : def.fh });
    for (const [name, list] of Object.entries(def.anims)) this.anims[name] = list.map(cell);
  }
  _atlas(def) {
    const A = def.atlas, src = def.img;
    for (const [name, ids] of Object.entries(A.anims)) this.anims[name] = ids.map(id => { const f = A.frames[id]; const mid = (A.center || []).includes(name);
      return { src, sx: f.x, sy: f.y, sw: f.w, sh: f.h, ax: f.ax, by: mid ? f.h / 2 + (def.midBy || 14) : f.h - (def.footGap || 0) }; });
  }
  /* alpha bounds of a frame, relative to its anchor (ax = 0, feet line by = 0; up is negative).
     Used to put hit boxes exactly where the pixels are. Cached per frame; null if unreadable. */
  bounds(fr) {
    if (!fr) return null; if (fr._b !== undefined) return fr._b;
    fr._b = null;
    const im = PLAT.assets.img(fr.src); if (!im || typeof document === 'undefined') return null;
    try {
      const c = document.createElement('canvas'); c.width = fr.sw; c.height = fr.sh;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, fr.sw, fr.sh);
      const d = x.getImageData(0, 0, fr.sw, fr.sh).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let yy = 0; yy < fr.sh; yy++) for (let xx = 0; xx < fr.sw; xx++) if (d[(yy * fr.sw + xx) * 4 + 3] > 60) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 >= 0) fr._b = { x0: x0 - fr.ax, x1: x1 + 1 - fr.ax, y0: y0 - fr.by, y1: y1 + 1 - fr.by };
    } catch (e) { fr._b = null; }
    return fr._b;
  }
  srcs() { const s = new Set(); for (const fr of Object.values(this.anims)) fr.forEach(f => s.add(f.src)); return [...s]; }
  usable(name) { const fr = this.anims[name]; return !!(fr && fr.length && PLAT.assets.img(fr[0].src)); }
  frames(name) { return this.anims[name]; }
}

/* ------------------------------ controller ------------------------------
   poses: { idle:{ a:'idle', fps:8, loop:true }, jump:{ a:'walk', f:[3] }, … }
   play(pose, durFrames): durFrames stretches a one-shot animation over exactly that many frames
   (attacks stay in sync with their hit windows whatever the source fps was). */
class Anim {
  constructor(sheet, poses) { this.sheet = sheet; this.poses = poses || {}; this.cur = null; this.t = 0; this.pose = ''; this.done = false; this._cache = {}; }
  resolve(name) {
    if (this._cache[name]) return this._cache[name];
    const tryOne = n => {
      const p = this.poses[n] || (this.sheet.anims[n] ? { a: n } : null);
      if (!p || !this.sheet.usable(p.a)) return null;
      const all = this.sheet.frames(p.a), idx = p.f || all.map((_, i) => i);
      return { name: n, frames: idx.map(i => all[Math.min(i, all.length - 1)]), fps: p.fps || 10, loop: p.loop != null ? p.loop : /^(idle|walk|run|float|fidle|fwalk)$/.test(n) || !!p.loopy, hold: p.hold };
    };
    let r = tryOne(name);
    for (const fb of (FALLBACK[name] || ['idle'])) { if (r) break; r = tryOne(fb); }
    if (!r && name !== 'idle') r = tryOne('idle');
    if (!r) { const any = Object.keys(this.sheet.anims).find(n => this.sheet.usable(n)); r = any ? tryOne(any) : null; }
    // only cache once images are known (a failed image must keep falling back)
    if (r) this._cache[name] = r;
    return r;
  }
  play(name, dur, restart) {
    if (this.pose === name && !restart) return;
    const r = this.resolve(name); this.pose = name; this.cur = r; this.t = 0; this.done = false; this.manual = null;
    this.dur = dur || null;
  }
  update() {
    if (!this.cur) return; this.t++;
    const n = this.cur.frames.length;
    if (this.dur) { if (this.t >= this.dur) this.done = true; }
    else if (!this.cur.loop && this.t >= n * 60 / this.cur.fps) this.done = true;
  }
  // show(name, i): hold a pose on an exact frame (frame picked by game state, e.g. X's run phase / jump height)
  show(name, i) { if (this.pose !== name) this.play(name); this.manual = i; }
  index() {
    if (!this.cur) return 0; const n = this.cur.frames.length;
    if (this.manual != null) return Math.max(0, Math.min(n - 1, this.manual));
    if (this.dur) return Math.min(n - 1, Math.floor(this.t / this.dur * n));
    const i = Math.floor(this.t * this.cur.fps / 60);
    return this.cur.loop ? i % n : Math.min(n - 1, i);
  }
  frame() { return this.cur ? this.cur.frames[this.index()] : null; }
}

/* --------------------------------- drawing ---------------------------------
   Draws a frame with its feet at (x, y). Pixel-art sprites stay crisp (nearest neighbour)
   whenever they land on ≥ 1.5 device px per source px; smaller ones are smoothed. */
function drawFrame(ctx, fr, x, y, face, scale, o) {
  if (!fr) return false;
  o = o || {};
  const im = o.pal ? PLAT.assets.recolor(fr.src, o.pal) : PLAT.assets.img(fr.src); if (!im) return false;
  const dev = (PLAT.viewScale || 1) * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = o.smooth || dev < 1.5;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  const sx = (o.sx || 1) * (face < 0 ? -1 : 1) * (fr.flip ? -1 : 1), sy = o.sy || 1;
  ctx.scale(sx * scale, sy * scale);
  ctx.drawImage(im, fr.sx, fr.sy, fr.sw, fr.sh, -fr.ax, -fr.by, fr.sw, fr.sh);
  if (o.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= o.flash; ctx.drawImage(im, fr.sx, fr.sy, fr.sw, fr.sh, -fr.ax, -fr.by, fr.sw, fr.sh); ctx.drawImage(im, fr.sx, fr.sy, fr.sw, fr.sh, -fr.ax, -fr.by, fr.sw, fr.sh); }
  ctx.restore();
  return true;
}
// simple strips used by projectiles / effects: { img, fw, fh, n }
const FX_SHEETS = {};
function fxSheet(def) {
  const key = def.img + '|' + def.fw + '|' + def.fh;
  if (!FX_SHEETS[key]) {
    const n = def.n || 1, frames = [];
    for (let i = 0; i < n; i++) frames.push({ src: def.img, sx: (def.x0 || 0) + i * def.fw, sy: def.y0 || 0, sw: def.fw, sh: def.fh, ax: def.fw / 2, by: def.fh / 2 });
    FX_SHEETS[key] = frames;
  }
  return FX_SHEETS[key];
}

PLAT.Sheet = Sheet; PLAT.Anim = Anim; PLAT.drawFrame = drawFrame; PLAT.fxSheet = fxSheet;
})(typeof window !== 'undefined' ? window : globalThis);
