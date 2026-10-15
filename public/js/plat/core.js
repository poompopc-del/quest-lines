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
};

/* ---------------------------------- input ---------------------------------- */
// Everything reads ACTIONS, never keys — touch buttons and gamepads just set the same actions.
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyK', 'ArrowUp', 'KeyW'], attack: ['KeyJ', 'KeyX'], skill: ['KeyI', 'KeyC'], dash: ['KeyL', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'], ok: ['Enter', 'NumpadEnter'], back: ['Backspace'], ult: [],
};
const ACTIONS = Object.keys(KEYMAP);
const input = PLAT.input = {
  held: {}, pressed: {}, released: {}, src: {},      // src[action] = Set of sources holding it (keys / touch ids / pad)
  attached: false, lastDevice: 'none',             // none · touch · key · pad (what the player used last)
  pad: null,                                        // { id, name, index } of the connected controller, or null
  onDevice: null, onPad: null,                      // UI callbacks: device switched / controller (dis)connected
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
  releaseTouch() { for (const a of ACTIONS) { const s = this.src[a]; if (!s) continue; for (const id of [...s]) if (/^[pd]:/.test(id)) this.set(a, id, false); } },
  // note: _pad keeps the controller's physical state, so a button still held after clearAll() does not fire a fresh press
  clearAll() { for (const a of ACTIONS) { if (this.src[a]) this.src[a].clear(); this.held[a] = false; } this.pressed = {}; this.released = {}; },
  _kd: null, _ku: null, _blur: null, _gc: null, _gd: null,
  attach() {
    if (this.attached || !HAS_DOM) return; this.attached = true;
    this._kd = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'range') return;
      let hit = false;
      for (const a of ACTIONS) if (KEYMAP[a].includes(e.code)) { this.set(a, 'k:' + e.code, true); hit = true; }
      if (hit) { e.preventDefault(); this.setDevice('key'); }
    };
    this._ku = e => { for (const a of ACTIONS) if (KEYMAP[a].includes(e.code)) this.set(a, 'k:' + e.code, false); };
    this._blur = () => this.clearAll();
    // a controller only shows up after its first button press on most browsers (security rule)
    this._gc = e => { this.pad = { index: e.gamepad.index, name: e.gamepad.id, standard: e.gamepad.mapping === 'standard' }; this.setDevice('pad'); if (this.onPad) this.onPad(this.pad); };
    this._gd = e => { if (this.pad && this.pad.index === e.gamepad.index) { this.pad = null; for (const a of ACTIONS) this.set(a, 'pad', false); this._pad = {}; if (this.lastDevice === 'pad') this.setDevice('touchless'); if (this.onPad) this.onPad(null); } };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
    addEventListener('blur', this._blur); document.addEventListener('visibilitychange', this._blur);
    addEventListener('gamepadconnected', this._gc); addEventListener('gamepaddisconnected', this._gd);
  },
  detach() {
    if (!this.attached) return; this.attached = false;
    removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku);
    removeEventListener('blur', this._blur); document.removeEventListener('visibilitychange', this._blur);
    removeEventListener('gamepadconnected', this._gc); removeEventListener('gamepaddisconnected', this._gd);
    this.clearAll();
  },
  /* gamepad — polled once per frame. Standard mapping (Xbox / PlayStation / Switch Pro / most
     Bluetooth pads on Android & iOS):
       A / ✕ jump · X / □ attack · Y / △ skill · B / ○ dash · LB/LT skill · RB/RT dash
       d-pad or left stick move · Start / Options pause · Select / Share pause
     In menus: d-pad / stick move the focus · A confirm · B back. */
  _pad: {},
  getPad() {
    if (!HAS_DOM || !navigator.getGamepads) return null;
    let pads; try { pads = navigator.getGamepads(); } catch (e) { return null; }
    if (!pads) return null;
    if (this.pad && pads[this.pad.index]) return pads[this.pad.index];
    const p = [...pads].find(x => x && x.connected !== false);
    if (p && !this.pad) { this.pad = { index: p.index, name: p.id, standard: p.mapping === 'standard' }; if (this.onPad) this.onPad(this.pad); }
    return p || null;
  },
  pollPad() {
    const p = this.getPad(); if (!p) return;
    const b = i => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > .5)), ax = p.axes || [];
    const sx = Math.abs(ax[0] || 0) > .4 ? ax[0] : 0, sy = Math.abs(ax[1] || 0) > .4 ? ax[1] : 0;
    // some non-standard Android pads report the d-pad as a hat on axes 9 or 6/7
    let hx = 0, hy = 0;
    if (p.mapping !== 'standard') {
      if (ax.length > 9 && ax[9] !== undefined && Math.abs(ax[9]) <= 1.01 && ax[9] > -1.01 && Math.abs(ax[9]) > .05) { const v = Math.round((ax[9] + 1) * 3.5); hy = [0, 1, 2].includes(v) ? -1 : [4, 5, 6].includes(v) ? 1 : 0; hx = [2, 3, 4].includes(v) ? 1 : [6, 7, 0].includes(v) ? -1 : 0; }
      else if (ax.length >= 8) { hx = Math.abs(ax[6]) > .5 ? Math.sign(ax[6]) : 0; hy = Math.abs(ax[7]) > .5 ? Math.sign(ax[7]) : 0; }
    }
    const want = {
      left: b(14) || sx < -.4 || hx < 0, right: b(15) || sx > .4 || hx > 0, up: b(12) || sy < -.6 || hy < 0, down: b(13) || sy > .6 || hy > 0,
      jump: b(0), attack: b(2), skill: b(3) || b(4) || b(6), dash: b(1) || b(5) || b(7), pause: b(9) || b(8), ok: b(0) || b(9), back: b(1),
    };
    let any = false;
    for (const a in want) if (want[a] !== !!this._pad[a]) { this._pad[a] = want[a]; this.set(a, 'pad', want[a]); if (want[a]) any = true; }
    if (any) this.setDevice('pad');
  },
  rumble(strong, weak, ms) {
    const p = this.getPad(); const v = p && p.vibrationActuator;
    if (v && v.playEffect) v.playEffect(v.type || 'dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  },
  // on-screen buttons: any element with data-act="<action>" inside `root`
  bindTouch(root) {
    if (!HAS_DOM || !root || root._platBound) return; root._platBound = true;
    const down = (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      e.preventDefault(); this.setDevice('touch');
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add('on'); this.set(el.dataset.act, 'p:' + e.pointerId, true);
      if (PLAT.haptic) PLAT.haptic('tap');
    };
    const up = (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      el.classList.remove('on'); this.set(el.dataset.act, 'p:' + e.pointerId, false);
    };
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', up);
    root.addEventListener('contextmenu', e => e.preventDefault());
  },
  // a d-pad area that turns a finger position into left / right / up / down (slide between directions).
  // The whole pad zone is generous: a finger that drifts outside still counts (pointer capture).
  bindPad(el) {
    if (!HAS_DOM || !el || el._platBound) return; el._platBound = true;
    const dirs = ['left', 'right', 'up', 'down'];
    const apply = (e, on) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      const id = 'd:' + e.pointerId;
      // angle-based 8-way: diagonals only when clearly diagonal, so "right" never leaks a "down" (no accidental drop-through)
      const ang = Math.atan2(y, x) * 180 / Math.PI, far = Math.hypot(x, y) > .1;
      const want = { left: on && far && (ang > 112.5 || ang < -112.5), right: on && far && ang > -67.5 && ang < 67.5,
                     up: on && far && ang < -22.5 && ang > -157.5, down: on && far && ang > 22.5 && ang < 157.5 };
      for (const d of dirs) this.set(d, id, want[d]);
      el.dataset.dir = on ? (want.left ? 'l' : want.right ? 'r' : '') + (want.up ? 'u' : want.down ? 'd' : '') : '';
    };
    el.addEventListener('pointerdown', e => { e.preventDefault(); this.setDevice('touch'); try { el.setPointerCapture(e.pointerId); } catch (_) {} apply(e, true); });
    el.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') apply(e, true); });
    const off = e => apply(e, false);
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
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
function defaultPSave() { return { v: 1, hero: 'knight', levels: {}, settings: { sfx: null, shake: true, touch: 'auto', vibrate: true, btnSize: 'M' }, stats: { kills: 0, deaths: 0, coins: 0, playFrames: 0 }, goldEarned: 0 }; }
PLAT.save = {
  data: defaultPSave(),
  load() {
    let d = null; try { d = JSON.parse(ls.get(PKEY) || 'null'); } catch (e) { d = null; }
    const def = defaultPSave();
    this.data = d && typeof d === 'object' ? Object.assign(def, d, { settings: Object.assign(def.settings, d.settings || {}), stats: Object.assign(def.stats, d.stats || {}), levels: d.levels && typeof d.levels === 'object' ? d.levels : {} }) : def;
    return this.data;
  },
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
