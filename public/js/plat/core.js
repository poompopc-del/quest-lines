/* ==========================================================================
   Quest Lines — PLATFORM MODE · core
   --------------------------------------------------------------------------
   Shared namespace (window.PLAT), constants, small utils, asset loader,
   input (keyboard · touch · gamepad → actions), synthesized sound effects
   and the Platform Mode save (its own localStorage key — the main game's
   save schema is never changed; only `gold` is added to it on rewards).
   Load order: core → world → anim → heroes → player → enemies → levels → game → ui
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT = G.PLAT || {};
const HAS_DOM = typeof document !== 'undefined';

/* ------------------------------- constants ------------------------------- */
PLAT.C = {
  T: 32,                 // tile size (world px)
  VW: 640, VH: 360,      // view size (world px) — 16:9
  FPS: 60,
  // physics — tuned together, validated by tools/plat-validate.mjs (do not change one alone)
  GRAV_UP: 0.42,         // gravity while rising with jump held
  GRAV: 0.62,            // gravity otherwise
  MAX_FALL: 9.5,
  WALK: 2.2, RUN: 3.4,   // px / frame
  RUN_AFTER: 26,         // frames of holding a direction on the ground before walking turns into running
  ACC_GROUND: 0.34, DEC_GROUND: 0.5, ACC_AIR: 0.24,
  JUMP: 9.2,             // jump velocity
  JUMP_CUT: 3.2,         // releasing jump early caps the upward speed to this…
  MIN_JUMP: 6,           // …but only after 6 frames, so a quick tap is still a useful hop (~1.7 tiles)
  COYOTE: 7,             // frames you can still jump after walking off a ledge
  BUFFER: 8,             // frames a jump press is remembered before landing
  SPRING: 14.2,
  INV_FRAMES: 70,        // invulnerability after a hit
  // combat (v87) — see enemies.js hurtBox() / player.js startStep()
  HURT_MIN: 28,          // an enemy's HURT box is at least this tall (slimes / lickers are ~20 px: chest-high shots used to fly over them)
  HURT_PAD: 2,           // hurt boxes reach 2 px past the (shrunk) collision body on each side — the body box is 80 % of the sprite
  COMBO_KB: 2.4,         // knock-back cap for a combo step that has a follow-up, so the next step can still reach (finishers keep full kb)
  BUFFER_ATK: 14,        // frames an attack press is remembered while a move cannot be cancelled yet
};

/* --------------------------------- debug ---------------------------------
   Combat debug overlay (hit / hurt boxes, states, damage log, why a blow did nothing).
   Off in the normal game; turned on with ?debug=1 in the URL, or the ` key when the
   main game's developer mode is on. When off, the game only checks one boolean. */
PLAT.debug = { on: false, log: [], boxes: [] };
try { if (HAS_DOM && /[?&]debug=1\b/.test(location.search)) PLAT.debug.on = true; } catch (e) {}

/* --------------------------------- utils --------------------------------- */
const U = PLAT.U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  sign: v => v > 0 ? 1 : v < 0 ? -1 : 0,
  rnd: (a, b) => a + Math.random() * (b - a),
  rint: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  overlap: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  fmtTime: f => { const s = f / 60, m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s * 10) % 10)}`; },
};

/* ------------------------------ asset loader ------------------------------ */
// Images never throw: a missing file resolves to null and is logged once; drawing code
// checks for null and falls back (silhouette box) so a 404 can never stop the game.
const IMG = {}, FAILED = [];
PLAT.assets = {
  img(src) { return IMG[src] && IMG[src].ok ? IMG[src].im : null; },
  failed: FAILED,
  load(src) {
    if (!HAS_DOM) return Promise.resolve(null);
    if (IMG[src]) return IMG[src].p;
    const rec = IMG[src] = { ok: false, im: new Image() };
    rec.p = new Promise(res => {
      rec.im.onload = () => { rec.ok = true; res(rec.im); };
      rec.im.onerror = () => { FAILED.push(src); console.warn('[platform] missing asset', src); res(null); };
      rec.im.src = src;
    });
    return rec.p;
  },
  loadAll(list, onProgress) {
    const uniq = [...new Set(list.filter(Boolean))]; let done = 0;
    return Promise.all(uniq.map(s => this.load(s).then(r => { done++; onProgress && onProgress(done, uniq.length); return r; })));
  },
  json(src) { return fetch(src).then(r => r.ok ? r.json() : null).catch(() => null); },
  /* palette swap: every pixel of colour from[i] replaced by to[i] (exact RGB match).
     pal = { key, from:[[r,g,b]…], to:[[r,g,b]…] }
     v92: cached PER FRAME (only the frame's own rectangle), in a bounded LRU. It used to recolour and keep the
     WHOLE strip per palette: X's 57 strips × 14 palettes could pile up ~75 MB over a long session, and every
     first (strip, palette) pair cost a full-strip getImageData — a visible hitch while charging / swapping armour. */
  _pal: new Map(), PAL_MAX: 360,
  _palMap(pal) {
    if (pal._map) return pal._map;
    const map = pal._map = new Map(); pal.from.forEach((f, i) => { if (pal.to[i]) map.set((f[0] << 16) | (f[1] << 8) | f[2], pal.to[i]); });
    return map;
  },
  recolorFrame(fr, pal) {
    const k = fr.src + '|' + fr.sx + ',' + fr.sy + ',' + fr.sw + ',' + fr.sh + '|' + pal.key, C = this._pal;
    let c = C.get(k);
    if (c !== undefined) { C.delete(k); C.set(k, c); return c; }          // LRU: most recent at the end
    const im = this.img(fr.src); if (!im || !HAS_DOM) return null;
    try {
      c = document.createElement('canvas'); c.width = Math.max(1, fr.sw); c.height = Math.max(1, fr.sh);
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, fr.sw, fr.sh);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data, map = this._palMap(pal);
      for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const t = map.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]); if (t) { a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2]; } }
      x.putImageData(d, 0, 0);
    } catch (e) { c = null; }
    C.set(k, c);
    if (C.size > this.PAL_MAX) C.delete(C.keys().next().value);          // drop the least recently used frame
    return c;
  },
  // kept for older callers: the whole image recoloured (not cached — use recolorFrame)
  recolor(src, pal) { const im = this.img(src); if (!im) return null; return this.recolorFrame({ src, sx: 0, sy: 0, sw: im.width, sh: im.height }, pal) || im; },
};

/* ---------------------------------- input ---------------------------------- */
// Everything reads ACTIONS, never keys — touch controls and gamepads just set the same actions.
// An action is held while at least one SOURCE holds it (a key, a touch pointer, the pad), so two
// sources never fight: lifting one finger cannot release a key that is still down, and vice versa.
const KEYMAP = {                          // ↑ / W are aim only — they never jump
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyK'], attack: ['KeyJ', 'KeyX'], parry: ['KeyO', 'KeyF'], skill: ['KeyI', 'KeyC'], dash: ['KeyL', 'ShiftLeft', 'ShiftRight'], swap: ['KeyQ', 'KeyU'],
  pause: ['Escape', 'KeyP'], ok: ['Enter', 'NumpadEnter'], back: ['Backspace'], ult: [],
};
const ACTIONS = Object.keys(KEYMAP); PLAT.KEYMAP = KEYMAP;

/* ---- gamepad button bindings (v92: re-mappable in Settings) ----
   Standard mapping indices: 0 A/✕ · 1 B/○ · 2 X/□ · 3 Y/△ · 4 LB/L1 · 5 RB/R1 · 6 LT/L2 · 7 RT/R2 ·
   8 Select/Share · 9 Start/Options · 10 L3 · 11 R3 · 12-15 d-pad · 16 Home/Guide.
   Movement (d-pad + left stick) and menu keys (A = choose · B = back · Start) are FIXED, so a bad
   mapping can never lock the player out of the menus. */
// v94: PARRY takes LB (it used to double as skill) — listed before skill so an older saved mapping hands LB over to it
const PAD_ACTIONS = ['jump', 'attack', 'parry', 'skill', 'dash', 'swap', 'pause'];
const PAD_DEFAULT = { jump: [0], attack: [2], parry: [4], skill: [3, 6], dash: [1, 5, 7], swap: [10, 11], pause: [9, 8] };
const PAD_CRITICAL = ['jump', 'attack', 'pause'];            // must always keep at least one button
const PAD_RESERVED = { 12: 'ปุ่มทิศทางใช้เดิน', 13: 'ปุ่มทิศทางใช้เดิน', 14: 'ปุ่มทิศทางใช้เดิน', 15: 'ปุ่มทิศทางใช้เดิน', 16: 'ปุ่ม Home สงวนไว้ให้ระบบ' };
// some pads (mostly non-standard ones on Android / Firefox) report LT / RT as AXES, not buttons: an axis
// pushed well away from where it rests counts as a virtual button AXB + axis index (sticks 0/1 excluded)
const AXB = 100;
const PAD_NAMES = ['A / ✕', 'B / ○', 'X / □', 'Y / △', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', 'Select / Share', 'Start / Options', 'L3 (กดสติ๊กซ้าย)', 'R3 (กดสติ๊กขวา)', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home'];
PLAT.PAD = { ACTIONS: PAD_ACTIONS, DEFAULT: PAD_DEFAULT, CRITICAL: PAD_CRITICAL, RESERVED: PAD_RESERVED,
  name(i, standard) { if (i >= AXB) return 'ไก/แกน #' + (i - AXB); return standard !== false && PAD_NAMES[i] ? PAD_NAMES[i] : 'ปุ่ม #' + i; },
  copy(m) { const o = {}; for (const a of PAD_ACTIONS) o[a] = (m && Array.isArray(m[a]) ? m[a] : PAD_DEFAULT[a]).slice(); return o; },
  // a stored mapping is trusted only if it is well-formed; anything odd falls back to the defaults
  sanitize(m) {
    if (!m || typeof m !== 'object') return this.copy(PAD_DEFAULT);
    const o = {}, used = new Set();
    for (const a of PAD_ACTIONS) {
      const l = Array.isArray(m[a]) ? m[a].filter(b => Number.isInteger(b) && ((b >= 0 && b < 32) || (b >= AXB + 2 && b < AXB + 6)) && !PAD_RESERVED[b] && !used.has(b)) : null;
      o[a] = l && (l.length || !PAD_CRITICAL.includes(a)) ? l : PAD_DEFAULT[a].filter(b => !used.has(b));
      o[a].forEach(b => used.add(b));
    }
    for (const a of PAD_CRITICAL) if (!o[a].length) return this.copy(PAD_DEFAULT);
    return o;
  },
  /* bind `action` to button `b`. Conflict policy: one button = one action. If `b` belonged to another
     action, it is taken from it; an action left with no button at all gets `action`'s old main
     button (the two SWAP), so nothing ever ends up unbound. Returns { ok, map, msg, swapped } */
  bind(map, action, b, buttonsOnPad) {
    if (!PAD_ACTIONS.includes(action)) return { ok: false, map, msg: 'การกระทำนี้ตั้งปุ่มไม่ได้' };
    if (!Number.isInteger(b) || b < 0) return { ok: false, map, msg: 'ปุ่มนี้ใช้ไม่ได้' };
    if (PAD_RESERVED[b]) return { ok: false, map, msg: PAD_RESERVED[b] + ' — เลือกปุ่มอื่น' };
    if (buttonsOnPad && b < AXB && b >= buttonsOnPad) return { ok: false, map, msg: 'จอยนี้ไม่มีปุ่มนี้' };
    const m = this.copy(map), old = m[action].slice(); let swapped = null;
    for (const a of PAD_ACTIONS) if (a !== action && m[a].includes(b)) {
      m[a] = m[a].filter(x => x !== b);
      if (!m[a].length) { const give = old.find(x => x !== b); if (give != null) { m[a] = [give]; swapped = a; } }
      if (!m[a].length && PAD_CRITICAL.includes(a)) return { ok: false, map, msg: 'ปุ่มนี้เป็นปุ่มเดียวของการกระทำสำคัญ — ตั้งปุ่มอื่นให้มันก่อน' };
      if (!swapped) swapped = a;
    }
    m[action] = [b];
    return { ok: true, map: m, swapped };
  },
};

// joystick → directions. nx / ny are the knob offset in base radii (-1 … 1, y down).
// Horizontal is generous (walking is what the stick is for); up / down need a clear, mostly vertical
// push so walking never leaks a "down" (no accidental drop-through) or an "up" (aim).
PLAT.joyDirs = function (nx, ny, dead) {
  const m = Math.hypot(nx, ny), out = { left: false, right: false, up: false, down: false };
  if (m < dead) return out;
  const ang = Math.atan2(ny, nx) * 180 / Math.PI;           // 0 = right, 90 = down
  out.right = ang > -70 && ang < 70; out.left = ang > 110 || ang < -110;
  out.down = ny > .55 && ang > 30 && ang < 150; out.up = ny < -.55 && ang < -30 && ang > -150;
  return out;
};

const input = PLAT.input = {
  held: {}, pressed: {}, released: {}, src: {},      // src[action] = Set of sources holding it (keys / touch ids / pad)
  attached: false, lastDevice: 'none',             // none · touch · key · pad (what the player used last)
  pad: null,                                        // { id, name, index, standard, buttons } of the connected controller, or null
  onDevice: null, onPad: null, onReset: null,       // UI callbacks: device switched / controller (dis)connected / input was reset
  padMap: PLAT.PAD.copy(PAD_DEFAULT),               // gamepad bindings (Settings, saved in the Platform save)
  capture: null,                                    // remap: a function(buttonIndex) waiting for the next pad press
  ptr: new Map(),                                   // live touch pointers: id → { kind: 'btn'|'joy', act, el }
  isHeld(a) { return !!this.held[a]; },
  wasPressed(a) { return !!this.pressed[a]; },
  setDevice(d) { if (this.lastDevice === d) return; this.lastDevice = d; if (this.onDevice) this.onDevice(d); },
  set(a, srcId, on) {
    const s = this.src[a] || (this.src[a] = new Set());
    const was = s.size > 0;
    if (on) s.add(srcId); else s.delete(srcId);
    const now = s.size > 0;
    if (now && !was) this.pressed[a] = true;
    if (!now && was) this.released[a] = true;
    this.held[a] = now;
  },
  endFrame() { this.pressed = {}; this.released = {}; },
  // release only the on-screen controls (touch pointers) — keyboard / pad presses stay intact
  releaseTouch() {
    for (const id of [...this.ptr.keys()]) this.releasePointer(id);
    for (const a of ACTIONS) { const s = this.src[a]; if (!s) continue; for (const id of [...s]) if (/^[pdj]:/.test(id)) this.set(a, id, false); }
  },
  releasePointer(id) {
    const r = this.ptr.get(id); if (!r) return; this.ptr.delete(id);
    if (r.kind === 'btn') { if (r.el) r.el.classList.remove('on'); this.set(r.act, 'p:' + id, false); }
    else if (r.kind === 'joy' && r.joy) r.joy.end(id);
  },
  // note: _pad keeps the controller's physical state, so a button still held after clearAll() does not fire a fresh press
  clearAll() { for (const id of [...this.ptr.keys()]) this.releasePointer(id); for (const a of ACTIONS) { if (this.src[a]) this.src[a].clear(); this.held[a] = false; } this.pressed = {}; this.released = {}; },
  /* the ONE reliable reset: every held action off (keys, fingers, pad), visuals back to rest, and the
     game told so it can drop charges / buffered presses without firing them. Called on lost focus,
     tab switch, pause, menus, restart, death and device changes. */
  reset(reason) { this.clearAll(); if (this.onReset) { try { this.onReset(reason || ''); } catch (e) {} } },
  _kd: null, _ku: null, _blur: null, _vis: null, _gc: null, _gd: null, _pu: null, _te: null,
  attach() {
    if (this.attached || !HAS_DOM) return; this.attached = true;
    this._kd = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'range') return;
      let hit = false;
      for (const a of ACTIONS) if (KEYMAP[a].includes(e.code)) { this.set(a, 'k:' + e.code, true); hit = true; }
      if (hit) { e.preventDefault(); this.setDevice('key'); }
    };
    this._ku = e => { for (const a of ACTIONS) if (KEYMAP[a].includes(e.code)) this.set(a, 'k:' + e.code, false); };
    this._blur = () => this.reset('blur');
    this._vis = () => { if (document.hidden) this.reset('hidden'); };
    // safety nets for touch: a pointerup / cancel that reaches the window always frees its pointer, and when
    // the LAST finger leaves the screen every touch-held action is released (no more "walks by itself")
    this._pu = e => { if (this.ptr.has(e.pointerId)) this.releasePointer(e.pointerId); };
    this._te = e => { if (!e.touches || e.touches.length === 0) this.releaseTouch(); };
    // a controller only shows up after its first button press on most browsers (security rule)
    this._gc = e => { this._axRest = null; this.pad = this._padInfo(e.gamepad); this.setDevice('pad'); if (this.onPad) this.onPad(this.pad); };
    this._gd = e => { if (this.pad && this.pad.index === e.gamepad.index) { this.pad = null; for (const a of ACTIONS) this.set(a, 'pad', false); this._pad = {}; this._raw = []; this._axRest = null; if (this.lastDevice === 'pad') this.setDevice('touchless'); if (this.onPad) this.onPad(null); } };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
    addEventListener('blur', this._blur); document.addEventListener('visibilitychange', this._vis);
    addEventListener('pointerup', this._pu, true); addEventListener('pointercancel', this._pu, true);
    addEventListener('touchend', this._te, true); addEventListener('touchcancel', this._te, true);
    addEventListener('gamepadconnected', this._gc); addEventListener('gamepaddisconnected', this._gd);
  },
  detach() {
    if (!this.attached) return; this.attached = false;
    removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku);
    removeEventListener('blur', this._blur); document.removeEventListener('visibilitychange', this._vis);
    removeEventListener('pointerup', this._pu, true); removeEventListener('pointercancel', this._pu, true);
    removeEventListener('touchend', this._te, true); removeEventListener('touchcancel', this._te, true);
    removeEventListener('gamepadconnected', this._gc); removeEventListener('gamepaddisconnected', this._gd);
    this.clearAll();
  },
  /* gamepad — polled once per frame. Default (standard mapping: Xbox / PlayStation / Switch Pro / most
     Bluetooth pads on Android & iOS):
       A / ✕ jump · X / □ attack · Y / △ skill · B / ○ dash · LB/LT skill · RB/RT dash · L3/R3 armour
       d-pad or left stick move · Start / Options pause · Select / Share pause
     Actions are re-mappable (padMap); movement and the menu keys are not.
     In menus: d-pad / stick move the focus · A confirm · B back. */
  _pad: {}, _raw: [],
  _padInfo(p) { return { index: p.index, name: p.id, standard: p.mapping === 'standard', buttons: (p.buttons || []).length, rumble: !!(p.vibrationActuator && p.vibrationActuator.playEffect) }; },
  getPad() {
    if (!HAS_DOM || !navigator.getGamepads) return null;
    let pads; try { pads = navigator.getGamepads(); } catch (e) { return null; }
    if (!pads) return null;
    if (this.pad && pads[this.pad.index]) return pads[this.pad.index];
    const p = [...pads].find(x => x && x.connected !== false);
    if (p && !this.pad) { this.pad = this._padInfo(p); if (this.onPad) this.onPad(this.pad); }
    return p || null;
  },
  setPadMap(m) { this.padMap = PLAT.PAD.sanitize(m); },
  pollPad() {
    const p = this.getPad(); if (!p) return;
    const ax = p.axes || [], rest = this._axRest || (this._axRest = ax.map(v => v));   // first reading = resting position
    const b = i => i >= AXB ? (ax[i - AXB] !== undefined && Math.abs(ax[i - AXB] - (rest[i - AXB] || 0)) > .6) : !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > .5));
    const sx = Math.abs(ax[0] || 0) > .4 ? ax[0] : 0, sy = Math.abs(ax[1] || 0) > .4 ? ax[1] : 0;
    // some non-standard Android pads report the d-pad as a hat on axes 9 or 6/7
    let hx = 0, hy = 0;
    if (p.mapping !== 'standard') {
      if (ax.length > 9 && ax[9] !== undefined && Math.abs(ax[9]) <= 1.01 && ax[9] > -1.01 && Math.abs(ax[9]) > .05) { const v = Math.round((ax[9] + 1) * 3.5); hy = [0, 1, 2].includes(v) ? -1 : [4, 5, 6].includes(v) ? 1 : 0; hx = [2, 3, 4].includes(v) ? 1 : [6, 7, 0].includes(v) ? -1 : 0; }
      else if (ax.length >= 8) { hx = Math.abs(ax[6]) > .5 ? Math.sign(ax[6]) : 0; hy = Math.abs(ax[7]) > .5 ? Math.sign(ax[7]) : 0; }
    }
    const M = this.padMap, any_ = l => { for (const i of l) if (b(i)) return true; return false; };
    const want = {
      left: b(14) || sx < -.4 || hx < 0, right: b(15) || sx > .4 || hx > 0, up: b(12) || sy < -.6 || hy < 0, down: b(13) || sy > .6 || hy > 0,
      jump: any_(M.jump), attack: any_(M.attack), parry: any_(M.parry || []), skill: any_(M.skill), dash: any_(M.dash), swap: any_(M.swap), pause: any_(M.pause),
      ok: b(0) || b(9), back: b(1),
    };
    const raw = (p.buttons || []).map((_, i) => b(i));
    if (p.mapping !== 'standard') for (let k = 2; k < Math.min(ax.length, 6); k++) raw[AXB + k] = b(AXB + k);    // trigger axes as virtual buttons (non-standard pads only; standard pads give LT/RT as buttons 6/7)
    // remap listening: wait until every button is up, then hand over the next button that goes down.
    // Meanwhile the pad drives NOTHING (no menu moves, no "back"), and buttons still down afterwards
    // do not count as fresh presses (the state is tracked silently).
    if (this.capture) {
      if (this.capture.armed) { const i = raw.findIndex((v, k) => v && !this._raw[k]); if (i >= 0) { const cb = this.capture.cb; this.capture = null; cb(i, p); } }
      else if (!raw.some(Boolean)) this.capture.armed = true;
      this._raw = raw; this._pad = want; return;
    }
    let any = false;
    for (const a in want) if (want[a] !== !!this._pad[a]) { this._pad[a] = want[a]; this.set(a, 'pad', want[a]); if (want[a]) any = true; }
    this._raw = raw;
    if (any) this.setDevice('pad');
  },
  // which pad buttons are down right now (Settings shows it live)
  padDown() { const p = this.getPad(); if (!p) return []; const ax = p.axes || [], rest = this._axRest || []; const d = (p.buttons || []).map((x, i) => x && (x.pressed || x.value > .5) ? i : -1).filter(i => i >= 0); if (p.mapping !== 'standard') for (let k = 2; k < Math.min(ax.length, 6); k++) if (Math.abs(ax[k] - (rest[k] || 0)) > .6) d.push(AXB + k); return d; },
  rumble(strong, weak, ms) {
    const p = this.getPad(); const v = p && p.vibrationActuator;
    if (v && v.playEffect) v.playEffect(v.type || 'dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  },
  /* on-screen action buttons: any element with data-act="<action>" inside `root`.
     Each finger is tracked by its pointerId (never by event target), captured, and released on
     up / cancel / lost capture — plus the window-level safety nets in attach(). Sliding a finger from
     one button onto another moves the press (jump → attack without lifting), other fingers are untouched. */
  bindTouch(root) {
    if (!HAS_DOM || !root || root._platBound) return; root._platBound = true;
    const press = (id, el) => { this.ptr.set(id, { kind: 'btn', act: el.dataset.act, el }); el.classList.add('on'); this.set(el.dataset.act, 'p:' + id, true); };
    root.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
      e.preventDefault(); this.setDevice('touch');
      if (this.ptr.has(e.pointerId)) this.releasePointer(e.pointerId);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      press(e.pointerId, el);
      if (PLAT.haptic) PLAT.haptic('tap');
    });
    root.addEventListener('pointermove', e => {
      const r = this.ptr.get(e.pointerId); if (!r || r.kind !== 'btn') return;
      const over = document.elementFromPoint(e.clientX, e.clientY), el = over && over.closest && over.closest('[data-act]');
      if (!el || el === r.el || !root.contains(el) || getComputedStyle(el).display === 'none') return;
      this.releasePointer(e.pointerId); press(e.pointerId, el);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const up = e => this.releasePointer(e.pointerId);
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', e => { const r = this.ptr.get(e.pointerId); if (r && r.el === e.target) this.releasePointer(e.pointerId); });
    root.addEventListener('contextmenu', e => e.preventDefault());
  },
  /* VIRTUAL JOYSTICK (v92, replaces the 4-way d-pad). One finger anywhere in `zone`:
       floating mode — the stick appears where the thumb lands; fixed mode — it stays at its rest spot.
     Drag continuously in any direction, reverse instantly (pulling past the rim drags the base along, so
     a reversal is only one radius away). Dead zone stops accidental moves. Output = the same
     left / right / up / down actions the keys use (source 'j:<pointerId>'). */
  bindJoystick(zone, base, knob, opt) {
    if (!HAS_DOM || !zone || zone._platBound) return null; zone._platBound = true;
    const self = this, J = { id: null, cx: 0, cy: 0, nx: 0, ny: 0, dirs: { left: false, right: false, up: false, down: false } };
    const cfg = () => (opt && opt.get ? opt.get() : {}) || {};
    const rest = () => { const z = zone.getBoundingClientRect(), b = base.getBoundingClientRect(); return { x: b.left - z.left + b.width / 2, y: b.top - z.top + b.height / 2 }; };
    const radius = () => base.getBoundingClientRect().width * .5;
    const place = () => {
      const R = radius();
      if (J.id == null) { base.style.transform = ''; knob.style.transform = ''; zone.classList.remove('act'); return; }
      zone.classList.add('act');
      base.style.transform = `translate(${J.ox}px,${J.oy}px)`;
      knob.style.transform = `translate(${J.ox + J.nx * R}px,${J.oy + J.ny * R}px)`;
    };
    const apply = () => {
      const d = PLAT.joyDirs(J.nx, J.ny, cfg().dead != null ? cfg().dead : .25);
      for (const k of ['left', 'right', 'up', 'down']) if (d[k] !== J.dirs[k]) { J.dirs[k] = d[k]; self.set(k, 'j:' + J.id, d[k]); }
      zone.dataset.dir = (d.left ? 'l' : d.right ? 'r' : '') + (d.up ? 'u' : d.down ? 'd' : '');
    };
    const move = (x, y) => {
      const R = radius(); let dx = x - J.cx, dy = y - J.cy, m = Math.hypot(dx, dy);
      if (m > R * 1.15 && cfg().follow !== false) { const k = (m - R * 1.15) / m; J.cx += dx * k; J.cy += dy * k; dx = x - J.cx; dy = y - J.cy; m = Math.hypot(dx, dy); }
      const c = m > R ? R / m : 1; J.nx = dx * c / R; J.ny = dy * c / R;
      const r0 = J.r0; J.ox = J.cx - r0.x; J.oy = J.cy - r0.y;
      apply(); place();
    };
    J.end = id => {
      if (J.id == null || (id != null && id !== J.id)) return;
      for (const k of ['left', 'right', 'up', 'down']) { if (J.dirs[k]) self.set(k, 'j:' + J.id, false); J.dirs[k] = false; }
      self.ptr.delete(J.id); J.id = null; J.nx = J.ny = 0; zone.dataset.dir = ''; place();
    };
    zone.addEventListener('pointerdown', e => {
      if (e.target.closest('[data-act]')) return;                // never steal an action button
      e.preventDefault(); self.setDevice('touch');
      if (J.id != null) return;                                  // one stick finger at a time — a 2nd finger is ignored
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      base.style.transform = ''; const z = zone.getBoundingClientRect(), x = e.clientX - z.left, y = e.clientY - z.top, r0 = J.r0 = rest(), R = radius();
      J.id = e.pointerId; self.ptr.set(e.pointerId, { kind: 'joy', joy: J });
      if (cfg().mode === 'fixed') { J.cx = r0.x; J.cy = r0.y; }
      else { J.cx = U.clamp(x, R, z.width - R); J.cy = U.clamp(y, R, z.height - R); }
      move(x, y);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId !== J.id) return; const z = zone.getBoundingClientRect(); move(e.clientX - z.left, e.clientY - z.top); });
    const up = e => { if (e.pointerId === J.id) J.end(e.pointerId); };
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    zone.addEventListener('contextmenu', e => e.preventDefault());
    return J;
  },
};

/* haptics: phone vibration when playing by touch, controller rumble when playing with a pad */
const HAPTIC = { tap: [6, 0, 0, 0], hit: [12, .2, .3, 60], hurt: [40, .7, .5, 160], big: [25, .4, .6, 120], boss: [120, 1, 1, 450], gem: [18, .1, .4, 80] };
PLAT.haptic = function (kind) {
  const h = HAPTIC[kind]; if (!h || !PLAT.save || PLAT.save.data.settings.vibrate === false) return;
  try {
    if (input.lastDevice === 'pad') { if (h[3]) input.rumble(h[1], h[2], h[3]); }
    else if (input.lastDevice === 'touch' && navigator.vibrate) navigator.vibrate(h[0]);
  } catch (e) {}
};

/* ------------------------------ sound effects ------------------------------ */
// No audio files exist in the project (the main game synthesizes its sounds too), so every
// effect here is generated with WebAudio. If audio is unavailable everything silently no-ops.
let AC = null, MASTER = null, NOISE = null;
function ac() {
  if (!HAS_DOM) return null;
  if (!AC) {
    try { AC = new (G.AudioContext || G.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.connect(AC.destination); } catch (e) { AC = null; return null; }
    const n = AC.sampleRate * .5, buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    NOISE = buf;
  }
  if (AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
// a hard cap on simultaneous voices: busy fights never stack into a wall of noise (or leak audio nodes)
let VOICES = 0; const MAX_VOICES = 18;
const voice = (node, dur) => { VOICES++; node.onended = () => { VOICES--; }; };
function tone(type, f0, f1, dur, vol, delay = 0) {
  const a = ac(); if (!a || PLAT.sfx.vol <= 0 || VOICES >= MAX_VOICES) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol * PLAT.sfx.vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(MASTER); voice(o); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, f0 = 1800, f1 = 300, delay = 0, q = 1) {
  const a = ac(); if (!a || !NOISE || PLAT.sfx.vol <= 0 || VOICES >= MAX_VOICES) return;
  const t = a.currentTime + delay, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  s.buffer = NOISE; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(vol * PLAT.sfx.vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(MASTER); voice(s); s.start(t); s.stop(t + dur + .02);
}
let lastPlay = {};
function limit(name, ms) { const n = performance.now(); if (lastPlay[name] && n - lastPlay[name] < ms) return false; lastPlay[name] = n; return true; }
PLAT.sfx = {
  vol: .6,
  unlock() { ac(); },
  jump() { tone('square', 260, 520, .12, .12); },
  airjump() { tone('square', 380, 760, .12, .1); },
  land() { if (limit('land', 90)) noise(.06, .12, 500, 120); },
  swing() { if (limit('swing', 50)) noise(.09, .2, 2600, 700, 0, 2); },
  heavy() { if (!limit('heavy', 60)) return; noise(.18, .3, 900, 120, 0, 1.5); tone('sawtooth', 140, 60, .18, .12); },
  hit() { if (!limit('hit', 35)) return; noise(.08, .32, 1400, 200); tone('square', 180, 70, .09, .14); },
  clang() { if (!limit('clang', 60)) return; tone('triangle', 1250, 900, .14, .16); tone('square', 2100, 1600, .08, .06); },
  kill() { if (!limit('kill', 50)) return; tone('square', 520, 120, .18, .13); noise(.16, .2, 1600, 200); tone('triangle', 880, 1320, .08, .06, .05); },
  hurt() { if (!limit('hurt', 80)) return; tone('sawtooth', 300, 90, .25, .2); noise(.15, .2, 800, 150); },
  die() { tone('square', 440, 60, .7, .2); tone('triangle', 220, 50, .9, .15, .1); },
  coin() { if (!limit('coin', 40)) return; tone('square', 988, 988, .05, .1); tone('square', 1319, 1319, .14, .1, .05); },
  gem() { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, .16, .14, i * .07)); },
  heart() { tone('sine', 523, 1046, .25, .2); },
  shoot() { if (limit('shoot', 45)) tone('square', 900, 300, .1, .08); },
  big() { tone('sawtooth', 200, 900, .25, .16); noise(.3, .2, 3000, 400); },
  charge() { if (limit('charge', 120)) tone('sine', 300, 600, .12, .05); },
  boom() { noise(.45, .42, 700, 60, 0, .8); tone('sine', 110, 40, .4, .3); },
  spring() { tone('sine', 220, 880, .22, .2); },
  dash() { noise(.14, .22, 3200, 600, 0, 1.2); },
  checkpoint() { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, .12, .09, i * .08)); },
  crumble() { if (limit('crumble', 120)) noise(.25, .16, 400, 90); },
  break() { noise(.22, .3, 1200, 150); tone('square', 160, 60, .12, .1); },
  roar() { tone('sawtooth', 120, 70, .8, .22); noise(.8, .2, 500, 100, 0, .7); },
  inhale() { noise(.5, .16, 400, 2400, 0, 2); },
  clear() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone('square', f, f, .16, .1, i * .11)); },
  select() { tone('square', 660, 880, .06, .08); },
  back() { tone('square', 500, 330, .07, .08); },
  denied() { tone('square', 160, 120, .14, .1); },
};

/* ---------------------------------- save ---------------------------------- */
// Platform Mode progress lives in its own key. The main save is only READ (owned heroes,
// sound volume, dev flag) — and written in exactly one place: addMainGold(), which re-reads
// the latest main save, adds to `gold` and writes it back without touching anything else.
const PKEY = 'ql_platform_v1', MAIN_KEY = 'questlines_wordbattle_v1';
const ls = {
  get(k) { try { return HAS_DOM ? localStorage.getItem(k) : null; } catch (e) { return null; } },
  set(k, v) { try { if (HAS_DOM) localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
// v92 adds (all optional — an older save simply gets the defaults, nothing is migrated or reset):
//   settings.joy    { mode: 'float'|'fixed', dead: 0.15-0.4 }   virtual joystick
//   settings.padMap { jump:[0], attack:[2], … }                 gamepad bindings (PLAT.PAD)
//   endless         { '1': { best, bestDist, bestTier, runs, totalDist, kills, coins, lastSeed, bestSeed, bestHero } … }
function defaultPSave() { return { v: 1, hero: 'knight', levels: {}, settings: { sfx: null, shake: true, touch: 'auto', vibrate: true, btnSize: 'M', joy: { mode: 'float', dead: .25 }, padMap: null }, stats: { kills: 0, deaths: 0, coins: 0, playFrames: 0 }, goldEarned: 0, endless: {} }; }
PLAT.save = {
  data: defaultPSave(),
  load() {
    let d = null; try { d = JSON.parse(ls.get(PKEY) || 'null'); } catch (e) { d = null; }
    const def = defaultPSave();
    this.data = d && typeof d === 'object' ? Object.assign(def, d, { settings: Object.assign(def.settings, d.settings || {}), stats: Object.assign(def.stats, d.stats || {}), levels: d.levels && typeof d.levels === 'object' ? d.levels : {}, endless: d.endless && typeof d.endless === 'object' ? d.endless : {} }) : def;
    const j = this.data.settings.joy; this.data.settings.joy = { mode: j && j.mode === 'fixed' ? 'fixed' : 'float', dead: j && typeof j.dead === 'number' ? U.clamp(j.dead, .1, .45) : .25 };
    if (PLAT.input) PLAT.input.setPadMap(this.data.settings.padMap);
    return this.data;
  },
  endlessRec(world) { const e = this.data.endless || (this.data.endless = {}); return e[world] || (e[world] = { best: 0, bestDist: 0, bestTier: 0, runs: 0, totalDist: 0, kills: 0, coins: 0 }); },
  persist() { ls.set(PKEY, JSON.stringify(this.data)); },
  level(id) { return this.data.levels[id] || null; },
  main() { try { const d = JSON.parse(ls.get(MAIN_KEY) || 'null'); return d && typeof d === 'object' ? d : null; } catch (e) { return null; } },
  ownedMain() { const m = this.main(); const c = m && Array.isArray(m.chars) ? m.chars : []; return new Set(['knight', ...c]); },
  devOn() { return ls.get('ql_dev_on') === '1'; },
  mainVolume() { const m = this.main(); const v = m && m.settings && typeof m.settings.sfx === 'number' ? m.settings.sfx : 70; return v / 100; },
  mainGold() { const m = this.main(); return m && typeof m.gold === 'number' ? m.gold : null; },
  addMainGold(n) {
    n = Math.max(0, Math.floor(n)); if (!n) return false;
    const m = this.main(); if (!m || typeof m.gold !== 'number') return false;   // no main save yet → nothing to add to
    m.gold += n; if (!ls.set(MAIN_KEY, JSON.stringify(m))) return false;
    this.data.goldEarned = (this.data.goldEarned || 0) + n; return true;
  },
};
})(typeof window !== 'undefined' ? window : globalThis);
