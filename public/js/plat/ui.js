/* ==========================================================================
   PLATFORM MODE · UI + app loop
   --------------------------------------------------------------------------
   Screens (title · heroes · map · pause · dead · clear · settings · loading),
   HUD, touch controls, the fixed-step loop, progress + rewards.
   Rewards: gold is added to the MAIN game's save (same currency — no new
   one) only for first clears, newly found gems and a first S rank, so it
   cannot be farmed; replays give a small coin-based amount.
   ========================================================================== */
(function () {
'use strict';
const PLAT = window.PLAT, C = PLAT.C, U = PLAT.U, S = PLAT.save, input = PLAT.input;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const RANKV = { S: 4, A: 3, B: 2, C: 1 };

const app = PLAT.app = { game: null, screen: 'title', prev: [], selHero: null, raf: 0, last: 0, acc: 0, previews: [], busy: false, lastGo: 0, cv: null, ctx: null };

/* -------------------------------- boot -------------------------------- */
function boot() {
  S.load();
  if (S.data.settings.sfx == null) S.data.settings.sfx = Math.round(S.mainVolume() * 100);
  PLAT.sfx.vol = S.data.settings.sfx / 100;
  if (!heroAvailable(S.data.hero)) S.data.hero = 'knight';
  input.attach(); input.bindTouch($('#btns'));
  app.joy = input.bindJoystick($('#joy'), $('#joy .jbase'), $('#joy .jknob'), { get: () => S.data.settings.joy });
  // every input reset (lost focus, pause, menus, restart) also drops the hero's held charge / buffered presses — nothing fires on resume
  input.onReset = () => { if (app.game) app.game.onInputReset(); $$('#btns .on').forEach(b => b.classList.remove('on')); };
  app.cv = $('#cv'); app.ctx = app.cv.getContext('2d');
  input.onDevice = d => { document.documentElement.dataset.dev = d; syncTouch(app.screen === 'game'); refreshGlyphs(); };
  input.onPad = pad => {
    refreshGlyphs(); syncTouch(app.screen === 'game'); refreshTitle(); renderPadStatus();
    if (pad) notify('🎮 เชื่อมต่อจอยแล้ว', 'ปุ่มบนจอซ่อนอัตโนมัติ · แตะจอเมื่อไหร่ปุ่มจะกลับมา');
    else notify('🎮 จอยหลุดการเชื่อมต่อ', touchWanted() ? 'กลับไปใช้ปุ่มบนจอ' : '');
    if (!pad && app.game && app.game.mode === 'play') pause();      // a dropped controller should not get you killed
  };
  // touching the screen anywhere = back to touch controls (even after a pad was used)
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') input.setDevice('touch'); }, true);
  $('#hFull').addEventListener('click', toggleFullscreen); $('#tFull').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => { setTimeout(resize, 120); refreshFullBtn(); });
  $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('#hPause').addEventListener('click', () => pause());
  // v96: potion / quick item buttons on the HUD (also H / G on the keyboard, Select / R3 on a pad)
  const useBtn = (sel, fn) => $(sel).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const g = app.game; if (g && g.mode === 'play' && g.player) g.player[fn](); });
  useBtn('#hPot', 'usePotion'); useBtn('#hItem', 'useItem');
  $$('#shTabs button').forEach(b => b.addEventListener('click', () => { app.shopTab = b.dataset.t; PLAT.sfx.select(); renderShop(); }));
  document.addEventListener('pointerdown', () => PLAT.sfx.unlock(), { once: true });
  // iOS Safari ignores user-scalable=no: block pinch / double-tap zoom so a two-finger press never zooms the game
  document.addEventListener('gesturestart', e => e.preventDefault()); document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  addEventListener('keydown', menuKeys);
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden && app.game && app.game.mode === 'play') pause(); if (!document.hidden) app.last = performance.now(); });
  addEventListener('blur', () => { if (app.game && app.game.mode === 'play' && app.screen === 'game') pause(); });
  addEventListener('pagehide', () => { if (app.game && app.game.endlessWorld && app.game.mode === 'play') recordEndless(app.game.result(), true); input.detach(); cancelAnimationFrame(app.raf); });
  $('#plCancel').addEventListener('click', () => stopListen('ยกเลิกแล้ว'));
  $('#padDefaults').addEventListener('click', () => { input.setPadMap(PLAT.PAD.copy(PLAT.PAD.DEFAULT)); S.data.settings.padMap = null; S.persist(); renderPadMap(); refreshGlyphs(); notify('🎮 คืนค่าปุ่มจอยเริ่มต้นแล้ว'); PLAT.sfx.checkpoint(); });
  setupSettings(); refreshFullBtn(); applyBtnSize(); renderPadStatus();
  document.documentElement.dataset.dev = input.lastDevice;
  if (app.onBoot) app.onBoot();
  resize(); show('title'); refreshTitle();
  app.last = performance.now(); app.raf = requestAnimationFrame(tick);
}

/* -------------------------------- screens -------------------------------- */
const SCREENS = app.SCREENS = { title: 'sTitle', heroes: 'sHeroes', map: 'sMap', endless: 'sEndless', over: 'sOver', pause: 'sPause', dead: 'sDead', clear: 'sClear', settings: 'sSettings', loading: 'sLoading', shop: 'sShop' };
app.onShow = {}; app.subScreens = new Set(['settings', 'heroes', 'shop']);        // v118: hub.js adds screens (daily, missions, talents, rush …)
function show(name, push) {
  if (name !== app.screen) input.reset('screen');                     // switching screens never leaves a button held
  if (push && app.screen !== name) app.prev.push(app.screen);
  app.screen = name;
  $$('.screen').forEach(s => s.classList.remove('on'));
  const id = SCREENS[name];
  if (id) $('#' + id).classList.add('on');
  const playing = name === 'game';
  $('#hud').classList.toggle('on', !!app.game && ['game', 'pause', 'dead', 'clear', 'over'].includes(name));
  syncTouch(playing);
  if (name === 'heroes') renderHeroes();
  if (name === 'map') renderMap();
  if (name === 'endless') renderEndless();
  if (name === 'title') refreshTitle();
  if (name === 'settings') { renderPadStatus(); renderPadMap(); }
  if (name === 'shop') renderShop();
  if (name !== 'settings' && input.capture) stopListen();
  if (app.onShow[name]) app.onShow[name]();
  const first = id && $('#' + id + ' .btn.red, #' + id + ' .btn');
  if (first && (input.lastDevice === 'pad' || input.lastDevice === 'key')) setTimeout(() => first.focus({ preventScroll: true }), 30);
}
function go(where) {
  // a double tap / double click on a menu button must not start (or restart) twice
  const now = performance.now(); if (now - app.lastGo < 280 && where === app.lastWhere) return; app.lastGo = now; app.lastWhere = where;
  PLAT.sfx.select();
  switch (where) {
    case 'map': quitGame(); show('map'); break;
    case 'endless': quitGame(); show('endless'); break;
    case 'endlessAgain': if (app.game && app.game.endlessWorld) { app.game.restart(); setupHud(app.game); show('game'); toast('∞ ' + app.game.spec.name, 'รอบใหม่ · ด่านใหม่ทั้งหมด'); } break;
    case 'endlessSeed': if (app.game && app.game.endlessWorld) { app.game.restart(app.game.seed); setupHud(app.game); show('game'); toast('∞ ' + app.game.spec.name, 'เล่นซ้ำด่านเดิม (ซีด ' + app.game.seed + ')'); } break;
    case 'heroes': show('heroes', true); break;
    case 'settings': show('settings', true); break;
    case 'shop': S.persist(); show('shop', true); break;
    case 'title': show('title'); break;
    case 'back': show(app.prev.pop() || 'title'); break;
    case 'main': quitGame(); input.detach(); location.href = 'index.html'; break;
    case 'resume': resume(); break;
    case 'retryCp': if (app.game && !app.game.endlessWorld) { app.game.respawn(); show('game'); } break;
    case 'restart': if (app.game) { if (app.game.endlessWorld) { recordEndless(app.game.result(), true); go2('endlessAgain'); } else startLevel(app.game.levelId); } break;
    default: if (app.go2 && app.go2(where)) break; break;
    case 'next': { const i = PLAT.ALL_ORDER.indexOf(app.game && app.game.levelId); const n = PLAT.ALL_ORDER[i + 1]; if (n && levelUnlocked(n)) startLevel(n); else { quitGame(); show('map'); } break; }
  }
}
function go2(w) { app.lastGo = 0; go(w); }
function menuKeys(e) {
  if (input.capture && e.code === 'Escape') { e.preventDefault(); stopListen('ยกเลิกแล้ว'); return; }
  // ` toggles the combat debug overlay — only for developers (main game's dev mode, or ?debug=1 in the URL)
  if (e.code === 'Backquote' && (S.devOn() || /[?&]debug=1\b/.test(location.search))) { PLAT.debug.on = !PLAT.debug.on; PLAT.debug.boxes = []; PLAT.debug.log = []; notify('🛠 Debug ' + (PLAT.debug.on ? 'ON' : 'OFF'), PLAT.debug.on ? 'กล่องโจมตี / กล่องรับดาเมจ / สถานะ / เหตุผลที่ตีไม่เข้า' : ''); return; }
  if (app.screen === 'game') return;
  if (e.code === 'Escape') { e.preventDefault(); if (app.screen === 'pause') resume(); else if (app.subScreens.has(app.screen)) go('back'); else if (app.screen === 'map' || app.screen === 'endless') show('title'); }
}
function pause() {
  const g = app.game; if (!g || g.mode !== 'play') return; g.mode = 'paused';
  $('#pSub').textContent = g.endlessWorld ? `∞ ${g.spec.name} · ${g.runner.dist} ม. · LV ${g.runner.tier} · ${PLAT.HEROES[g.heroId].name}` : `${PLAT.levelLabel(g.levelId)} ${g.spec.name} · ${PLAT.HEROES[g.heroId].name}`;
  $('#pRetry').style.display = g.endlessWorld ? 'none' : ''; $('#pRestart').textContent = g.endlessWorld ? '⟲ เริ่มรอบใหม่ (ด่านใหม่)' : '⟲ เริ่มด่านใหม่';
  $('#pExit').textContent = g.endlessWorld ? '∞ ออก (บันทึกสถิติรอบนี้)' : '🗺 ออกไปแผนที่'; $('#pExit').dataset.go = g.endlessWorld ? 'endless' : 'map';
  show('pause'); input.reset('pause');
}
function resume() { if (!app.game) return; if (app.game.mode === 'paused') app.game.mode = 'play'; input.reset('resume'); app.acc = 0; app.last = performance.now(); show('game'); }

/* ---------------------------- menu navigation ----------------------------
   D-pad / stick / arrow keys move the focus to the nearest button in that direction,
   A / Enter presses it, B / Backspace goes back — every menu works without touching the screen. */
function screenEl() { const id = app.screen !== 'loading' && SCREENS[app.screen]; return id && $('#' + id); }
function focusables(root) { return [...root.querySelectorAll('button:not([disabled]), input[type=range]')].filter(el => el.offsetParent !== null && el.getBoundingClientRect().width > 0); }
function moveFocus(dx, dy) {
  const root = screenEl(); if (!root) return;
  const list = focusables(root); if (!list.length) return;
  const cur = document.activeElement;
  if (!list.includes(cur)) { list[0].focus({ preventScroll: false }); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = 1e9;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ddx = x - ax, ddy = y - ay;
    const along = dx ? ddx * dx : ddy * dy, side = dx ? Math.abs(ddy) : Math.abs(ddx);
    if (along <= 4) continue;
    const score = along + side * 2.2;
    if (score < bs) { bs = score; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); PLAT.sfx.select(); }
}
function menuNav() {
  if (app.screen === 'game' || app.screen === 'loading' || input.capture) return;
  const P = a => input.wasPressed(a), cur = document.activeElement;
  if (cur && cur.type === 'range' && (P('left') || P('right'))) {
    cur.value = +cur.value + (P('right') ? 1 : -1) * (+cur.step || 1) * 2; cur.dispatchEvent(new Event('input')); cur.dispatchEvent(new Event('change')); return;
  }
  if (P('up')) moveFocus(0, -1); else if (P('down')) moveFocus(0, 1); else if (P('left')) moveFocus(-1, 0); else if (P('right')) moveFocus(1, 0);
  else if (P('ok')) { const root = screenEl(); if (root && cur && root.contains(cur) && cur.tagName === 'BUTTON') cur.click(); else moveFocus(0, 1); }
  else if (P('back') || (P('pause') && app.screen === 'pause')) {
    if (app.screen === 'pause') resume(); else if (app.subScreens.has(app.screen)) go('back');
    else if (app.screen === 'map' || app.screen === 'endless') show('title'); else if (app.screen === 'dead') go('retryCp');
  }
  else return;
  input.endFrame();              // a menu press is used up here — it must not also reach the game this frame
}

/* ------------------------------- fullscreen ------------------------------- */
const fsOK = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen; if (!req) return;
  Promise.resolve(req.call(el, { navigationUI: 'hide' })).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
}
function refreshFullBtn() {
  const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
  [$('#hFull'), $('#tFull')].forEach(b => { if (!b) return; b.style.display = fsOK() ? '' : 'none'; b.textContent = '⛶'; b.title = on ? 'ออกจากเต็มจอ' : 'เต็มจอ (แนะนำบนมือถือ)'; });
}

/* ------------------------- controls: glyphs & pad info ------------------------- */
// the pad glyphs follow the player's own button mapping (Settings → จอยเกม)
const shortPad = a => { const b = (input.padMap[a] || [])[0]; return b == null ? '—' : PLAT.PAD.name(b, !input.pad || input.pad.standard).split(' / ')[0].split(' (')[0]; };
const GLYPH = { key: { a: 'J', p: 'O', h: 'H', g: 'G', s: 'I', d: 'L', j: 'Space' }, get pad() { return { a: shortPad('attack'), p: shortPad('parry'), h: shortPad('potion'), g: shortPad('item'), s: shortPad('skill'), d: shortPad('dash'), j: shortPad('jump') }; } };
function refreshGlyphs() {
  const g = input.lastDevice === 'pad' || (input.pad && input.lastDevice !== 'touch' && input.lastDevice !== 'key') ? GLYPH.pad : GLYPH.key;
  $$('#hAbil kbd').forEach((k, i) => k.textContent = [g.a, g.p, g.h, g.g, g.s, g.d][i] || k.textContent);
}
function renderPadStatus() {
  const el = $('#padStatus'); if (!el) return;
  if (!navigator.getGamepads) { el.innerHTML = '🎮 เบราว์เซอร์นี้ไม่รองรับจอยเกม (Gamepad API) — ใช้คีย์บอร์ดหรือปุ่มบนจอแทน'; return; }
  const P = input.pad;
  el.innerHTML = P ? `🎮 เชื่อมต่อแล้ว: <b>${String(P.name).replace(/[<>&]/g, '').slice(0, 60)}</b> · ${P.buttons} ปุ่ม${P.standard ? ' · แบบมาตรฐาน' : ' <span class="chip">จอยไม่ใช่แบบมาตรฐาน: ชื่อปุ่มอาจไม่ตรงกับที่เห็นบนจอย — กดดูไฟที่แถวด้านล่าง</span>'}${P.rumble ? '' : ' · <span class="chip">จอย/เบราว์เซอร์นี้ไม่รองรับการสั่น</span>'}`
    : '🎮 ยังไม่พบจอย — ต่อ Bluetooth/USB แล้ว<b>กดปุ่มใดก็ได้ 1 ครั้ง</b> เกมจะเจอเอง (เบราว์เซอร์จะไม่บอกว่ามีจอยจนกว่าจะกดปุ่ม)';
}
/* ------------------------------ controller remap ------------------------------ */
const PAD_LABEL = { jump: 'กระโดด', attack: 'โจมตี / ยิง (ค้าง = ชาร์จ)', parry: 'ปัดป้อง (Parry)', skill: 'สกิล', dash: 'พุ่ง / แดช', potion: 'ดื่มยา 🧪', item: 'ไอเทมด่วน 💣', swap: 'เปลี่ยนเกราะ (X)', pause: 'หยุดเกม' };
function renderPadMap() {
  const box = $('#padRemap'); if (!box) return;
  const std = !input.pad || input.pad.standard;
  box.innerHTML = PLAT.PAD.ACTIONS.map(a => `<div class="rm" data-a="${a}"><span class="an">${PAD_LABEL[a]}${PLAT.PAD.CRITICAL.includes(a) ? ' <span class="chip">จำเป็น</span>' : ''}</span><span class="bn">${(input.padMap[a] || []).map(b => PLAT.PAD.name(b, std)).join(' · ') || '— ไม่มี —'}</span><button class="btn" data-bind="${a}" ${input.pad ? '' : 'disabled'}>${input.pad ? 'ตั้งปุ่ม' : 'ต่อจอยก่อน'}</button></div>`).join('');
  $$('#padRemap [data-bind]').forEach(b => b.addEventListener('click', () => startListen(b.dataset.bind)));
}
let listenT = 0, listenFor = null;
function startListen(action) {
  if (!input.pad) { notify('🎮 ยังไม่พบจอย', 'กดปุ่มบนจอย 1 ครั้งเพื่อเชื่อมต่อ'); return; }
  listenFor = action; $('#plTitle').textContent = 'กดปุ่มบนจอย…'; $('#plSub').innerHTML = `ปุ่มใหม่สำหรับ <b>${PAD_LABEL[action]}</b> · ปล่อยทุกปุ่มก่อน แล้วกดปุ่มที่ต้องการ 1 ครั้ง`; $('#plMsg').textContent = '';
  $('#padListen').classList.add('on'); setTimeout(() => $('#plCancel').focus(), 30);
  const arm = () => { input.clearAll(); input.capture = { armed: false, cb: onCaptured }; clearTimeout(listenT); listenT = setTimeout(() => stopListen('หมดเวลา — ไม่ได้เปลี่ยนปุ่ม'), 10000); };
  const onCaptured = (b, pad) => {
    const res = PLAT.PAD.bind(input.padMap, action, b, pad && pad.buttons ? pad.buttons.length : 0);
    if (!res.ok) { $('#plMsg').textContent = `✗ ${PLAT.PAD.name(b, input.pad && input.pad.standard)}: ${res.msg}`; PLAT.sfx.denied(); arm(); return; }
    input.padMap = res.map; S.data.settings.padMap = res.map; S.persist();
    const nm = PLAT.PAD.name(b, input.pad && input.pad.standard);
    stopListen(); renderPadMap(); refreshGlyphs(); PLAT.sfx.checkpoint();
    notify(`🎮 ${PAD_LABEL[action]} = ${nm}`, res.swapped ? `ปุ่มนี้เคยเป็นของ "${PAD_LABEL[res.swapped]}" — สลับให้แล้ว: ${PAD_LABEL[res.swapped]} = ${(res.map[res.swapped] || []).map(x => PLAT.PAD.name(x, input.pad && input.pad.standard)).join(' · ')}` : '');
  };
  arm();
}
function stopListen(msg) {
  const was = !!input.capture || $('#padListen').classList.contains('on');
  input.capture = null; clearTimeout(listenT); $('#padListen').classList.remove('on'); listenFor = null;
  if (was && msg) notify('🎮 ' + msg);
  input.reset('remap');
}
// Settings: the rows light up while their button is held (shows which physical button is which)
let padHot = '';
function padLive() {
  if (app.screen !== 'settings' || !input.pad) return;
  const down = input.padDown(), hot = PLAT.PAD.ACTIONS.filter(a => (input.padMap[a] || []).some(b => down.includes(b))).join(',');
  if (hot === padHot) return; padHot = hot;
  $$('#padRemap .rm').forEach(r => r.classList.toggle('hot', hot.split(',').includes(r.dataset.a)));
}
// sign texts name buttons as {JUMP} {ATK} {SKL} {DSH} — shown as the keys / pad buttons / touch icons in use
function signText(t) {
  const dev = input.lastDevice === 'pad' ? 'pad' : input.lastDevice === 'touch' || (input.lastDevice === 'none' && isPhone()) ? 'touch' : 'key';
  const M = { key: { JUMP: 'Space', ATK: 'J', SKL: 'I', DSH: 'L' }, pad: { JUMP: shortPad('jump'), ATK: shortPad('attack'), SKL: shortPad('skill'), DSH: shortPad('dash') }, touch: { JUMP: '⤒', ATK: '⚔', SKL: '✦', DSH: '»' } }[dev];
  return t.replace(/\{(JUMP|ATK|SKL|DSH)\}/g, (_, k) => M[k]);
}
// how to fire each hero's ultimate, written for the device in use
function ultHint(input) {
  const dev = PLAT.input.lastDevice === 'pad' ? 'pad' : 'key';
  const K = dev === 'pad' ? { A: shortPad('attack'), S: shortPad('skill'), D: shortPad('dash') } : { A: 'J', S: 'I', D: 'L' };
  return { 'du+A': `↓ ↑ + ${K.A}`, 'dd+A': `↓ ↓ + ${K.A}`, 'S+A': `${K.S} + ${K.A} พร้อมกัน`, 'D+A': `${K.D} + ${K.A} พร้อมกัน`, 'S+D': `${K.S} + ${K.D} พร้อมกัน`,
    'u+S': `↑ + ${K.S}`, 'dS_air': `กลางอากาศ ↓ + ${K.S}`, 'SS': `${K.S} ${K.S} (กดสองครั้งเร็ว ๆ)`, 'holdS': `กด ${K.S} ค้าง แล้วปล่อย` }[input] || '';
}
let notifyT = 0;
function notify(a, b) { const n = $('#notify'); if (!n) return; n.innerHTML = `<b>${a}</b>${b ? `<span>${b}</span>` : ''}`; n.classList.add('on'); clearTimeout(notifyT); notifyT = setTimeout(() => n.classList.remove('on'), 3200); }
function applyBtnSize() { const m = { S: .82, M: 1, L: 1.2 }[S.data.settings.btnSize || 'M'] || 1; document.documentElement.style.setProperty('--tsz', m); }

/* ------------------------------ availability ------------------------------ */
function heroAvailable(id) {
  const h = PLAT.HEROES[id]; if (!h || h.disabled) return false;
  if (h.devOnly && !S.devOn()) return false;
  if (h.free || S.devOn()) return true;
  if (S.ownedMain().has(id)) return true;
  if (S.data.meta && (S.data.meta.keptHeroes || []).includes(id)) return true;     // v121: unlocked before a story reset
  const need = PLAT.HERO_UNLOCK[id]; return !!(need && S.level(need) && S.level(need).cleared);
}
function heroLockText(id) {
  const need = PLAT.HERO_UNLOCK[id];
  return need ? `ผ่านด่าน ${PLAT.levelLabel(need)} หรือมีในเกมหลัก` : 'มีในเกมหลักก่อน';
}
function levelUnlocked(id) {
  if (PLAT.LEVELS[id] && PLAT.LEVELS[id].secret) {          // v125 secret world: opens with the true-ending condition, then in order
    if (!(S.devOn() || (app.story && app.story.trueOpen()))) return false;
    const w = PLAT.WORLDS.find(w => w.levels.includes(id)), k = w.levels.indexOf(id); if (k <= 0) return true;
    const pv = S.level(w.levels[k - 1]); return !!(pv && pv.cleared) || !!(S.level(id) && S.level(id).cleared);
  }
  const i = PLAT.LEVEL_ORDER.indexOf(id); if (i <= 0 || S.devOn()) return true;
  const own = S.level(id); if (own && own.cleared) return true;               // v115: new levels were inserted between old ones — nothing you cleared re-locks
  const prev = S.level(PLAT.LEVEL_ORDER[i - 1]); return !!(prev && prev.cleared);
}
const heroList = () => PLAT.HERO_ORDER.filter(id => PLAT.HEROES[id] && !PLAT.HEROES[id].disabled && !(PLAT.HEROES[id].devOnly && !S.devOn()));

/* --------------------------------- title --------------------------------- */
function refreshTitle() {
  $('#tHero').textContent = PLAT.HEROES[S.data.hero].name; $('#tWallet').textContent = '🪙 ' + PLAT.bag.coins().toLocaleString();
  const cleared = PLAT.LEVEL_ORDER.filter(id => S.level(id) && S.level(id).cleared).length;
  const gems = PLAT.LEVEL_ORDER.reduce((n, id) => n + ((S.level(id) || {}).gems || []).length, 0);
  $('#tNote').textContent = (input.pad ? '🎮 จอยพร้อมใช้ · ' : '') + `ผ่านแล้ว ${cleared}/${PLAT.LEVEL_ORDER.length} ด่าน · 💎 ${gems}/${PLAT.LEVEL_ORDER.filter(id => !PLAT.LEVELS[id].boss).length * 3} · ทองที่ได้เข้าเกมหลักรวม ${S.data.goldEarned || 0}` + (S.devOn() ? ' · 🛠 โหมดผู้พัฒนา: ปลดล็อกทุกอย่าง' : '');
}

/* ------------------------------ hero previews ------------------------------
   Every card animates the hero's real idle strip (loaded on demand). */
const sheetCache = {};
async function heroSheet(id) {
  if (sheetCache[id]) return sheetCache[id];
  const h = PLAT.HEROES[id]; let def = h.sprite;
  if (def.kind === 'atlas') { const atlas = await PLAT.assets.json(def.atlasSrc); def = Object.assign({}, def, { atlas }); }
  const sh = new PLAT.Sheet(def);
  const idle = sh.frames('idle') || []; await PLAT.assets.loadAll(idle.map(f => f.src));
  return (sheetCache[id] = sh);
}
function drawPreview(cv, id, t, big) {
  const sh = sheetCache[id]; if (!sh) return;
  const ctx = cv.getContext('2d'), h = PLAT.HEROES[id], fr = sh.frames('idle'); if (!fr || !fr.length) return;
  const f = fr[Math.floor(t / 9) % fr.length], dpr = cv.width / cv.clientWidth || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  const sc = h.scale * cv.height / (big ? 64 : 58);          // same relative size as in-game
  PLAT.viewScale = 1;
  PLAT.drawFrame(ctx, f, cv.width / 2, cv.height * .94, 1, sc, { smooth: !!h.smooth || sc < 1.5 });
}
function animatePreviews() {
  const t = performance.now() / 16.7;
  for (const p of app.previews) if (p.cv.isConnected) drawPreview(p.cv, p.id, t + p.off, p.big);
  app.previews = app.previews.filter(p => p.cv.isConnected);
}

/* --------------------------------- heroes --------------------------------- */
function renderHeroes() {
  const grid = $('#heroGrid'); grid.innerHTML = '';
  app.selHero = app.selHero || S.data.hero;
  heroList().forEach((id, i) => {
    const h = PLAT.HEROES[id], ok = heroAvailable(id);
    const b = document.createElement('button'); b.className = 'hcard' + (ok ? '' : ' lock') + (id === app.selHero ? ' sel' : '');
    b.innerHTML = `<canvas width="144" height="128"></canvas><span>${h.name}</span>${ok ? (id === S.data.hero ? '<span class="lk">✓</span>' : '') : '<span class="lk">🔒</span>'}`;
    b.addEventListener('click', () => { app.selHero = id; PLAT.sfx.select(); renderHeroes(); });
    grid.appendChild(b);
    const cv = b.querySelector('canvas');
    heroSheet(id).then(() => app.previews.push({ cv, id, off: i * 7 }));
  });
  renderHeroInfo(app.selHero);
}
function renderHeroInfo(id) {
  const h = PLAT.HEROES[id], ok = heroAvailable(id), box = $('#heroInfo');
  const bar = (v, max) => `<span class="bar"><b style="width:${Math.round(U.clamp(v / max, 0, 1) * 100)}%"></b></span>`;
  const A = h.attack, Sk = h.skill, D = h.dash;
  const atkName = A.kind === 'inhale' ? A.name : A.kind === 'shot' ? 'ยิง' + (A.charge ? ' · กดค้างเพื่อชาร์จ' : '') + (A.combo ? ` · คอมโบ ${A.combo.at}+ เปลี่ยนอาวุธ` : '') : `ฟัน/ต่อย ${A.steps.length} จังหวะ`;
  const extra = [h.airJumps ? (h.float ? `ลอยตัวได้ ${h.airJumps} ครั้ง` : `กระโดด ${h.airJumps + 1} ชั้น`) : '', h.wallJump ? 'ถีบกำแพง' : '', h.ballJump ? 'กระโดดเป็นลูกบอลชนศัตรู' : '', h.armor ? 'เกราะหนา' : ''].filter(Boolean);
  box.innerHTML = `<canvas width="300" height="300"></canvas>
    <div><div class="nm" style="color:${h.color}">${h.name}</div><div class="th">${h.th} · <span class="chip">${h.role}</span></div>
      <p style="font-size:13px;margin:6px 0">${h.desc}</p>
      <div class="moves">${moveList(h).map(m => `<div class="${m.cls || ''}"><kbd>${m.k}</kbd>${m.n}${m.c ? ` <span class="chip">พลัง ${m.c}</span>` : ''}</div>`).join('')}${extra.length ? `<div><kbd>★</kbd>${extra.join(' · ')}</div>` : ''}</div>
      <div class="stat">HP ${h.hp * PLAT.HPU} ${bar(h.hp, 6)}</div><div class="stat">ความเร็ว ${bar(h.speed || 1, 1.3)}</div>
      <div class="row" style="margin-top:10px">${ok ? `<button class="btn red" id="hPick">${id === S.data.hero ? '✓ ใช้อยู่' : 'ใช้ฮีโร่นี้'}</button>` : `<button class="btn" disabled>🔒 ${heroLockText(id)}</button>`}</div></div>`;
  const cv = box.querySelector('canvas'); heroSheet(id).then(() => app.previews.push({ cv, id, off: 0, big: true }));
  const pick = $('#hPick'); if (pick) pick.addEventListener('click', () => { S.data.hero = id; S.persist(); PLAT.sfx.checkpoint(); renderHeroes(); refreshTitle(); });
}

// every input of a hero, in the order a player learns them
function moveList(h) {
  const M = h.moves || {}, A = h.attack, L = [];
  L.push({ k: 'J', n: A.name || (A.kind === 'shot' ? 'ยิง' : 'โจมตี') });
  if (M.up) L.push({ k: '↑+J', n: M.up.name }); if (M.down) L.push({ k: '↓+J', n: M.down.name });
  if (M.air) L.push({ k: 'อากาศ J', n: M.air.name }); if (M.downAir) L.push({ k: 'อากาศ ↓+J', n: M.downAir.name });
  if (M.run) L.push({ k: 'วิ่ง+J', n: M.run.name }); if (M.hold) L.push({ k: 'ค้าง J', n: M.hold.name });
  if (h.guard) L.push({ k: '↓ ค้าง', n: 'ตั้งการ์ด' });
  L.push({ k: 'I', n: h.skill.name, c: h.skill.cost });
  if (h.skill.air) L.push({ k: 'อากาศ I', n: h.skill.air.name, c: h.skill.air.cost });
  if (h.skills && h.skills.up) L.push({ k: '↑+I', n: h.skills.up.name, c: h.skills.up.cost });
  if (h.skills && h.skills.down) L.push({ k: '↓+I', n: h.skills.down.name, c: h.skills.down.cost });
  L.push({ k: 'L', n: h.dash.name });
  L.push({ k: 'O', n: 'ปัดป้อง — กดตอนศัตรูจะโดน: ไม่เสียเลือด ศัตรูเสียหลัก (โดน ×2) กระสุนสะท้อนกลับ · กดเร็วพอดี = PERFECT', cls: 'hd' });
  if (h.chargeBar) L.push({ k: 'ค้าง J', n: 'ชาร์จบัสเตอร์ 4 ระดับ (หลอด CHARGE) · ระดับ 4 = LVL 4 BUSTER ใช้พลัง 50', cls: 'hd' });
  if (h.forms) L.push({ k: 'Q', n: (h.formLabel || 'เปลี่ยนเกราะ') + ' (บนพื้น): ' + h.forms.map(f => f.name).join(' → '), cls: 'hd' });
  if (h.ult) L.push({ k: 'ULT', n: `${h.ult.name} — ${ultHint(h.ult.input)}`, cls: 'hd' });
  return L;
}
/* ---------------------------------- map ---------------------------------- */
function renderMap() {
  $('#mHero').textContent = PLAT.HEROES[S.data.hero].name;
  const mg = S.mainGold();
  $('#mSub').textContent = 'ผ่านด่านเพื่อปลดล็อกด่านถัดไป · เก็บ 💎 3 เม็ดต่อด่าน · แรงก์ S = ครบ 4 เงื่อนไข' + (mg != null ? ` · ทองในเกมหลัก ${mg.toLocaleString()}` : '');
  const box = $('#worlds'); box.innerHTML = '';
  for (const w of PLAT.WORLDS) {
    if (w.secret && !S.devOn() && !(app.story && app.story.trueOpen())) {     // v125: the secret chapter — a teaser after the ending
      if (app.story && app.story.seen('ending')) { const t = document.createElement('div'); t.className = 'world secret'; const f = app.story.fragCount();
        t.innerHTML = `<div class="wn"><span>✨ ??? · บทที่ยังไม่ถูกเขียน</span><span class="chip">💎 ${f.got}/${f.all}</span></div><p class="sub" style="margin:4px 0 0">เก็บเศษความทรงจำ 💎 ให้ครบทุกชิ้น แล้วหน้าสุดท้ายจะเปิดออก…</p>`; box.appendChild(t); }
      continue;
    }
    const div = document.createElement('div'); div.className = 'world';
    const g = w.levels.reduce((n, id) => n + ((S.level(id) || {}).gems || []).length, 0);
    div.innerHTML = `<div class="wn"><span>โลก ${w.n} · ${w.name}</span><span class="chip">💎 ${g}/${w.levels.filter(id => !PLAT.LEVELS[id].boss).length * 3}</span></div><div class="lvls"></div>`;
    const lv = div.querySelector('.lvls');
    for (const id of w.levels) {
      const L = PLAT.LEVELS[id], rec = S.level(id) || {}, open = levelUnlocked(id);
      const b = document.createElement('button'); b.className = 'lvl' + (open ? '' : ' lock') + (L.boss ? ' boss' : '');
      const gemTxt = L.boss ? '👑 บอส' : `💎 ${(rec.gems || []).length}/3`;
      b.innerHTML = `<div class="id">${PLAT.levelLabel(id)}</div><div class="nm">${L.name}</div><div class="meta">${open ? (rec.cleared ? `${gemTxt} · ⏱ ${U.fmtTime(rec.bestTime)} · ${rec.bestScore || 0} แต้ม` : `${gemTxt} · ยังไม่ผ่าน`) : '🔒 ผ่านด่านก่อนหน้า'}</div>${rec.bestRank ? `<div class="rk ${rec.bestRank}">${rec.bestRank}</div>` : ''}`;
      if (open) b.addEventListener('click', () => startLevel(id));
      else b.disabled = true;
      lv.appendChild(b);
    }
    box.appendChild(div);
  }
  const e = document.createElement('div'); e.className = 'world';
  const best = Object.keys(PLAT.ENDLESS_WORLDS).map(k => S.endlessRec(+k).bestDist || 0);
  e.innerHTML = `<div class="wn"><span>∞ โหมดไม่สิ้นสุด (Endless)</span><span class="chip gold">ไกลสุด ${best.map(b => b + ' ม.').join(' · ')}</span></div><button class="btn gold block">∞ เลือกโลกแล้ววิ่งไม่หยุด</button>`;
  e.querySelector('button').addEventListener('click', () => go('endless'));
  box.appendChild(e);
}

/* ------------------------------ level session ------------------------------ */
async function startLevel(id, opts) {
  if (app.busy) return; app.busy = true;
  try { await startLevel_(id, opts); } finally { app.busy = false; }
}
async function startLevel_(id, opts) {
  opts = opts || {};
  quitGame();
  const L = PLAT.LEVELS[id], heroId = heroAvailable(S.data.hero) ? S.data.hero : 'knight';
  $('#lTitle').textContent = `${PLAT.levelLabel(id)} · ${L.name}`; $('#lSub').textContent = L.teach || ''; $('#lBar').style.width = '0%';
  show('loading');
  const g = new PLAT.Game({ levelId: id, heroId, onEvent: onGameEvent, rush: opts.rush || null });
  app.game = g;
  try { await g.load((d, n) => { $('#lBar').style.width = Math.round(d / n * 100) + '%'; }); }
  catch (e) { console.error(e); $('#lTitle').textContent = 'โหลดด่านไม่สำเร็จ'; $('#lSub').textContent = String(e.message || e); app.game = null; setTimeout(() => show('map'), 2200); return; }
  if (app.game !== g) return;
  setupHud(g);
  if (opts.hp != null) { g.player.hp = Math.min(g.player.maxHp, Math.max(1, opts.hp)); }            // v118 boss rush: HP carries over
  if (app.storyBefore && !opts.rush) { try { await app.storyBefore(id); } catch (e) { console.error(e); } if (app.game !== g) return; }   // v121 story scenes
  input.clearAll(); app.acc = 0; app.last = performance.now(); show('game');
  toast(`${PLAT.levelLabel(id)} ${L.name}`, L.teach);
  if (PLAT.assets.failed.length) console.warn('[platform] missing assets:', PLAT.assets.failed);
}
/* ENDLESS: one run per world. Loading uses the same loader / hero as the story levels. */
async function startEndless(world, seed, opts) {
  opts = opts || {};
  if (app.busy) return; app.busy = true;
  try {
    quitGame();
    const heroId = heroAvailable(S.data.hero) ? S.data.hero : 'knight', W = PLAT.ENDLESS_WORLDS[world];
    $('#lTitle').textContent = `∞ ${W.name}`; $('#lSub').textContent = W.th; $('#lBar').style.width = '0%';
    show('loading');
    const g = new PLAT.Game({ endless: world, seed, heroId, onEvent: onGameEvent, daily: opts.daily || null });
    app.game = g;
    try { await g.load((d, n) => { $('#lBar').style.width = Math.round(d / n * 100) + '%'; }); }
    catch (e) { console.error(e); $('#lTitle').textContent = 'โหลดไม่สำเร็จ'; $('#lSub').textContent = String(e.message || e); app.game = null; setTimeout(() => show('endless'), 2200); return; }
    if (app.game !== g) { g.dispose(); return; }
    setupHud(g); input.reset('start'); show('game');
    if (opts.daily) toast('📅 ท้าทายรายวัน · ' + opts.daily.mod.icon + ' ' + opts.daily.mod.name, opts.daily.mod.desc); else toast('∞ ' + W.name, 'ไปให้ไกลที่สุด! · ยิ่งไกลยิ่งยาก');
  } finally { app.busy = false; }
}
function quitGame() {
  const g = app.game; S.persist();
  if (g) { if (g.endlessWorld && (g.mode === 'play' || g.mode === 'paused')) recordEndless(g.result(), true); g.dispose(); app.game = null; }
  $('#hud').classList.remove('on'); $('#hBoss').classList.remove('on'); $('#hSign').classList.remove('on');
  if (app.onBoss && !app.rushRun) app.onBoss(null);
  app.idleOf = null; app.stillOf = null;                               // menus repaint their plain backdrop once
}
function onGameEvent(type, d) {
  const g = app.game; if (!g) return;
  switch (type) {
    case 'hud': updateHud(d); break;
    case 'sign': $('#hSign').classList.toggle('on', !!d); if (d) $('#hSign').textContent = signText(d); break;
    case 'boss': if (app.onBoss) app.onBoss(d); $('#hBoss').classList.toggle('on', !!d); if (d) { $('#hBossNm').textContent = `${d.name} · ${d.th}`; $('#hBossBar').style.width = '100%'; toast(d.name, d.th); } break;
    case 'bossHit': $('#hBossBar').style.width = (d.hp / d.max * 100) + '%'; break;
    case 'toast': toast(d.text, d.sub); break;
    case 'bag': hudCache.bag = null; break;
    case 'dead': S.data.stats.deaths++; S.persist(); if (g.rush && app.onEvent) { app.onEvent('rushDead', d); break; } $('#dRetry').textContent = g.spec.boss ? '↺ ท้าบอสอีกครั้ง' : '↺ เกิดใหม่ที่เช็กพอยต์'; show('dead'); break;
    case 'clear': if (app.storyAfter && !g.rush) app.storyAfter(g.levelId, () => { if (app.game === g) finishLevel(d); }); else finishLevel(d); break;   // v121: story scenes first
    case 'over': finishEndless(d); break;
    default: if (app.onEvent) app.onEvent(type, d);
  }
}
let toastT = 0;
function toast(a, b) { $('#hToast1').textContent = a || ''; $('#hToast2').textContent = b || ''; $('#hToast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('#hToast').classList.remove('on'), 2600); }

/* ------------------------------- SHOP (v96) -------------------------------
   buy potions / quick items / relics · sell treasure · bag: equip relics (max 3), pick the quick item */
function lootLine(r) {
  const l = r.loot || []; if (!l.length) return '';
  const c = {}; l.forEach(id => c[id] = (c[id] || 0) + 1);
  return `<div class="lootline">ของที่ได้: ${Object.entries(c).map(([id, n]) => { const it = PLAT.ITEMS[id]; return `<span class="${it.type === 'relic' ? (it.legend ? 'leg' : 'rel') : ''}">${PLAT.iconHTML(it)}${n > 1 ? '×' + n : ''}</span>`; }).join(' ')} <small>· ขาย/ใส่ได้ที่ 🛒 ร้านค้า</small></div>`;
}
function renderShop() {
  const B = PLAT.bag, I = PLAT.ITEMS, d = B.d(), tab = app.shopTab || 'buy', box = $('#shGrid');
  const keep = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
  $('#shWallet').textContent = B.coins().toLocaleString();
  $$('#shTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  const card = (it, right, extra, cls) => `<div class="sh-card ${cls || ''} t-${it.type}${it.legend ? ' legend' : ''}"><div class="ic">${PLAT.iconHTML(it)}</div><div class="tx"><b>${it.name}</b><span>${it.desc || ('ขายได้ 🪙 ' + it.sell)}</span>${extra || ''}</div><div class="act">${right}</div></div>`;
  let html = '', sub = '';
  if (tab === 'buy') {
    sub = 'ยาต้องกดดื่มเอง (H / 🧪) · ไอเทมด่วนกด G · เรลิกใส่ได้ 3 ชิ้น (แท็บกระเป๋า) · ไอเทมเทพ 🗡️😇🐉 ไม่มีขาย — ต้องล่าจากศัตรู (บอสดรอปบ่อยสุด)';
    const sec = (title, ids) => `<h3>${title}</h3>` + ids.map(id => { const it = I[id], owned = it.type === 'relic' && B.owns(id), poor = B.coins() < it.price;
      const have = it.type === 'relic' ? (owned ? '<em class="own">✓ มีแล้ว</em>' : '') : `<em>มี ${B.count(id)}</em>`;
      return card(it, owned ? '<button class="btn" disabled>มีแล้ว</button>' : `<button class="btn ${poor ? '' : 'gold'}" data-k="buy:${id}" ${poor ? 'disabled' : ''}>🪙 ${it.price}</button>`, have); }).join('');
    html = sec('🧪 ยาฟื้นฟู', ['potS', 'potL', 'elixir']) + sec('💥 ไอเทมด่วน', ['bomb', 'frost', 'meteor']) + sec('✨ เรลิก (พลังติดตัว)', PLAT.SHOP_ORDER.filter(k => I[k].type === 'relic'));
  } else if (tab === 'sell') {
    const tr = Object.keys(I).filter(k => I[k].type === 'treasure' && B.count(k) > 0), total = tr.reduce((n, k) => n + I[k].sell * B.count(k), 0);
    sub = 'สมบัติที่ศัตรูดรอป (ตัวเก่ง/บอสดรอปของแพง) · ขายเป็นเหรียญไปซื้อของ';
    html = tr.length ? `<div class="row" style="margin:4px 0 8px"><button class="btn gold" data-k="sellall">💰 ขายสมบัติทั้งหมด · 🪙 ${total.toLocaleString()}</button></div>` + tr.map(id => card(I[id], `<button class="btn" data-k="sell:${id}">ขาย 1 · 🪙 ${I[id].sell}</button>`, `<em>มี ${B.count(id)}</em>`)).join('')
      : '<p class="note">ยังไม่มีสมบัติ — ปราบศัตรู (โดยเฉพาะตัวเรืองแสง/บอส) และเปิดหีบสมบัติในด่าน</p>';
    const legs = d.owned.filter(k => I[k].legend);
    if (legs.length) html += '<h3>ไอเทมเทพ (ขายได้แต่หาใหม่ยากมาก!)</h3>' + legs.map(id => card(I[id], `<button class="btn" data-k="sellr:${id}">ขาย · 🪙 ${I[id].sell}</button>`)).join('');
  } else {
    sub = `เรลิกที่ใส่ ${d.relics.length}/${PLAT.RELIC_SLOTS} · มีผลทันที (ระหว่างหยุดเกมก็เปลี่ยนได้) · เลือกไอเทมด่วนสำหรับปุ่ม G`;
    const cons = ['potS', 'potL', 'elixir', 'bomb', 'frost', 'meteor'];
    html = '<h3>ของใช้</h3>' + cons.map(id => { const it = I[id], q = it.type === 'use';
      return card(it, q ? (d.quick === id ? '<button class="btn gold" disabled>★ ไอเทมด่วน</button>' : `<button class="btn" data-k="quick:${id}">ตั้งเป็นไอเทมด่วน</button>`) : '', `<em>มี ${B.count(id)}</em>`, B.count(id) ? '' : 'none'); }).join('');
    html += '<h3>เรลิก</h3>' + (d.owned.length ? d.owned.map(id => { const on = d.relics.includes(id);
      return card(I[id], `<button class="btn ${on ? 'red' : ''}" data-k="eq:${id}">${on ? '✓ ใส่อยู่ · ถอด' : 'ใส่'}</button>`, '', on ? 'on' : ''); }).join('') : '<p class="note">ยังไม่มีเรลิก — ซื้อในแท็บ "ซื้อของ" หรือล่าจากศัตรู</p>');
  }
  $('#shSub').textContent = sub; box.innerHTML = html;
  box.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => shopAct(b.dataset.k)));
  const f = keep && box.querySelector(`[data-k="${keep}"]`); if (f) f.focus({ preventScroll: true });
}
function shopAct(k) {
  const B = PLAT.bag, I = PLAT.ITEMS, [a, id] = k.split(':'), it = I[id];
  if (a === 'buy') { const r = B.buy(id); if (r === 'ok') { PLAT.sfx.coin(); notify(`${it.icon} ซื้อ ${it.name} แล้ว`, it.type === 'relic' ? 'ไปที่แท็บ "กระเป๋า" เพื่อใส่' : `มี ${B.count(id)}`); if (it.type === 'relic' && B.d().relics.length < PLAT.RELIC_SLOTS) { B.toggleRelic(id); relicChanged(); } } else { PLAT.sfx.denied(); notify(r === 'money' ? '🪙 เหรียญไม่พอ' : 'ซื้อไม่ได้'); } }
  else if (a === 'sell') { if (B.sell(id)) PLAT.sfx.coin(); }
  else if (a === 'sellall') { let n = 0; for (const t of Object.keys(I)) if (I[t].type === 'treasure') while (B.count(t)) { n += I[t].sell; B.sell(t); } PLAT.sfx.gem(); notify(`💰 ขายสมบัติได้ 🪙 ${n.toLocaleString()}`); }
  else if (a === 'sellr') { if (B.sellRelic(id)) { PLAT.sfx.coin(); relicChanged(); } }
  else if (a === 'quick') { B.setQuick(id); PLAT.sfx.select(); }
  else if (a === 'eq') { const r = B.toggleRelic(id); if (r === 'full') { PLAT.sfx.denied(); notify(`ใส่เรลิกได้สูงสุด ${PLAT.RELIC_SLOTS} ชิ้น`, 'ถอดชิ้นอื่นออกก่อน'); } else { PLAT.sfx.checkpoint(); relicChanged(); } }
  hudCache.bag = null; hudCache.wallet = null; renderShop(); refreshTitle();
}
// equipping / removing a relic mid-run: max HP (dragon) follows at once
function relicChanged() {
  const g = app.game, p = g && g.player; if (!p) return;
  p.maxHp = PLAT.meta ? PLAT.meta.maxHpOf(p, g) : p.hero.hp * PLAT.HPU + (PLAT.relicOn('dragon') ? 40 : 0); p.hp = Math.min(p.hp, p.maxHp); hudCache.hp = null;
}

/* ---------------------------------- HUD ---------------------------------- */
let hudCache = {};
function setupHud(g) {
  const h = PLAT.HEROES[g.heroId];
  $('#hLv').textContent = g.endlessWorld ? `∞ ${g.spec.name}` : `${PLAT.levelLabel(g.levelId)} ${g.spec.name}`;
  $('#hDist').classList.toggle('on', !!g.endlessWorld); $('#hTime').style.display = g.endlessWorld ? 'none' : '';
  $('#hHpL').style.width = '100%';
  $('#hGems').innerHTML = g.spec.boss || g.endlessWorld ? '' : Array.from({ length: g.L.gems.length }, () => '<i>💎</i>').join('');
  $('#hEnMark').style.left = (h.skill.cost || 0) + '%'; $('#hEnMark').style.display = h.skill.cost ? '' : 'none';
  $('#hAbil').innerHTML = `<span id="abA"><kbd>J</kbd>${h.attack.kind === 'shot' ? 'ยิง' : 'โจมตี'}</span><span id="abP"><kbd>O</kbd>ปัด</span><span><kbd>H</kbd>ยา</span><span><kbd>G</kbd>ไอเทม</span><span id="abS"><kbd>I</kbd>${h.skill.name}</span><span id="abD"><kbd>L</kbd>${h.dash.name}</span>`;
  $('#tA').textContent = h.attack.kind === 'shot' ? 'ยิง' : 'โจมตี'; $('#tS').textContent = shortName(h.skill.name); $('#tD').textContent = shortName(h.dash.name);
  $('#hBoss').classList.remove('on'); $('#hSign').classList.remove('on'); $('#hUltHint').classList.remove('on'); $('#tU').classList.remove('ready'); $('#tW').classList.toggle('on2', !!h.forms); $('#tW span').innerHTML = '<b>⟳</b>' + (h.formBtn || 'เกราะ'); $('#hUltB span').textContent = h.chargeBar ? 'CHARGE' : 'ULT'; $('#hUltB').classList.toggle('charge', !!h.chargeBar); $('#hUltB').style.display = h.ult || h.chargeBar ? '' : 'none';
  hudCache = {}; refreshGlyphs();
  const fc = $('#hFace'); heroSheet(g.heroId).then(() => { const ctx = fc.getContext('2d'); ctx.clearRect(0, 0, 48, 48); const sh = sheetCache[g.heroId], f = sh.frames('idle')[0]; PLAT.viewScale = 1;
    const s = 70 / (f.by || f.sh); PLAT.drawFrame(ctx, f, 24, 48 + (f.by * s) * .32, 1, s, { smooth: !!h.smooth }); });
}
const shortName = n => n.length > 9 ? n.split(/[ (/]/)[0].slice(0, 9) : n;
function updateHud(d) {
  const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
  set('hp', d.hp + '/' + d.maxHp, () => {
    const pc = U.clamp(d.hp / d.maxHp, 0, 1) * 100; $('#hHpB').style.width = pc + '%'; $('#hHpT').textContent = `${Math.max(0, Math.ceil(d.hp))} / ${d.maxHp}`;
    $('#hHp').classList.toggle('low', pc <= 30); setTimeout(() => { const l = $('#hHpL'); if (l) l.style.width = pc + '%'; }, 260);     // the pale "lost HP" trail catches up a moment later
  });
  { const B = PLAT.bag, q = B.d().quick, pot = B.count('potS') + B.count('potL') + B.count('elixir'), qi = PLAT.ITEMS[q];
    set('bag', pot + '|' + q + '|' + B.count(q), () => { $('#hPotN').textContent = pot; $('#hPotI').innerHTML = PLAT.iconHTML(PLAT.ITEMS.potS); $('#hPot').classList.toggle('empty', !pot); $('#hItemI').innerHTML = PLAT.iconHTML(qi); $('#hItemN').textContent = B.count(q); $('#hItem').classList.toggle('empty', !B.count(q)); }); }
  set('wallet', d.coins, () => $('#hCoins').textContent = PLAT.bag.coins().toLocaleString());
  set('en', Math.round(d.en), v => $('#hEn').style.width = v + '%');
  set('gems', d.gems.join(','), () => $$('#hGems i').forEach((el, i) => el.classList.toggle('on', d.gems.includes(i))));
  if (d.endless) set('dist', d.dist + '|' + d.tier + '|' + d.score, () => $('#hDist').innerHTML = `<b>${d.dist}</b> ม. · ${d.score.toLocaleString()} แต้ม<i>LV ${d.tier}</i>`);
  else set('time', Math.floor(d.frames / 6), () => $('#hTime').textContent = U.fmtTime(d.frames));
  set('low', d.en < d.skillCost, v => { const el = $('#abS'); if (el) el.classList.toggle('low', v); });
  set('cd', Math.round(d.dashCd * 10), v => { const el = $('#abD'); if (el) { el.classList.toggle('cd', v > 0); el.style.setProperty('--cd', (v * 10) + '%'); } $('#btns .bd').style.setProperty('--cd', (v * 10) + '%'); });
  set('tlow', d.en < d.skillCost, v => $('#btns .bs').classList.toggle('low', v));
  set('ult', Math.round(d.ult), v => { $('#hUlt').style.width = v + '%'; $('#hUltB').classList.toggle('full', v >= 100 && !d.chargeBar); });
  set('ultLv', d.ultLv || 0, v => { $('#hUltB').dataset.lv = v; });
  const h = app.game && PLAT.HEROES[app.game.heroId], ready = !d.chargeBar && d.ult >= 100 && !(d.superT > 0);
  set('ultReady', ready + '|' + input.lastDevice, () => {
    const touch = document.documentElement.classList.contains('touchui');
    $('#tU').classList.toggle('ready', ready && touch);
    $('#hUltHint').classList.toggle('on', ready && !touch);
    if (ready && h && h.ult) $('#hUltHint').textContent = `★ ULT พร้อม: ${ultHint(h.ult.input)} — ${h.ult.name.split('·')[0].trim()}`;
  });
  set('super', d.superT > 0 ? Math.ceil(d.superT / 60) : 0, v => { if (v) { $('#hUltHint').classList.add('on'); $('#hUltHint').textContent = `SUPER ${v}s`; } });
  set('mouth', d.mouth, v => $('#tA').textContent = v ? 'พ่นดาว' : (PLAT.HEROES[app.game.heroId].attack.kind === 'shot' ? 'ยิง' : 'โจมตี'));
}

/* ------------------------------ results / save ------------------------------ */
function finishLevel(r) {
  const id = r.levelId, prev = S.level(id) || {}, idx = PLAT.LEVEL_ORDER.indexOf(id);
  const first = !prev.cleared;
  const oldGems = new Set(prev.gems || []), newGems = r.gems.filter(i => !oldGems.has(i));
  const firstS = r.rank === 'S' && prev.bestRank !== 'S';
  let gold = (first ? 30 + idx * 15 : Math.min(25, Math.floor(r.coins / 4))) + newGems.length * 20 + (firstS ? 60 : 0);
  const rec = {
    cleared: true, plays: (prev.plays || 0) + 1,
    bestRank: !prev.bestRank || RANKV[r.rank] > RANKV[prev.bestRank] ? r.rank : prev.bestRank,
    bestTime: prev.bestTime ? Math.min(prev.bestTime, r.frames) : r.frames,
    bestScore: Math.max(prev.bestScore || 0, r.score), gems: [...new Set([...(prev.gems || []), ...r.gems])].sort(),
    hero: r.heroId,
  };
  // hero unlocks granted by this clear
  const before = new Set(heroList().filter(heroAvailable));
  S.data.levels[id] = rec;
  const unlocked = heroList().filter(h => heroAvailable(h) && !before.has(h));
  S.data.stats.kills += r.kills; S.data.stats.coins += r.coins; S.data.stats.playFrames += r.frames;
  const paid = S.addMainGold(gold);
  const MT = PLAT.meta;
  if (MT) {                                                              // v118 counters → missions / achievements
    MT.track('clear'); if (r.rank === 'S') MT.track('rankS');
    if (PLAT.LEVELS[id].boss && r.hits === 0 && r.deaths === 0 && !MT.invincible()) MT.track('noHitBoss');
    MT.best('levelsCleared', PLAT.LEVEL_ORDER.filter(l => S.level(l) && S.level(l).cleared).length);
    MT.best('gems', PLAT.LEVEL_ORDER.reduce((n, l) => n + ((S.level(l) || {}).gems || []).length, 0));
    if (PLAT.LEVELS[id].boss) MT.medal(id, MT.grade(r.hits, r.frames), r.frames);
  }
  S.persist();
  const nx = PLAT.ALL_ORDER[PLAT.ALL_ORDER.indexOf(id) + 1], next = nx && levelUnlocked(nx) ? nx : null;   // v125: the secret world only when it is open
  const newBest = !first && rec.bestScore === r.score && r.score > (prev.bestScore || 0);
  $('#clearBox').innerHTML = `
    <h2 class="kick" style="text-align:center">${PLAT.LEVELS[id].boss ? 'ปราบบอสสำเร็จ!' : 'ผ่านด่าน!'}</h2>
    <p class="sub" style="text-align:center;margin:0">${PLAT.levelLabel(id)} ${PLAT.LEVELS[id].name}</p>
    <div class="res-rank rk ${r.rank}">${r.rank}</div>
    <div class="checks">${r.checks.map(c => `<div><span>${c.th}</span><span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'}</span></div>`).join('')}</div>
    <div class="kv"><div>เวลา<b>${U.fmtTime(r.frames)}</b></div><div>คะแนน<b>${r.score.toLocaleString()}</b></div><div>เหรียญ<b>🪙 ${r.coins}</b></div>${PLAT.LEVELS[id].boss ? '' : `<div>💎<b>${r.gems.length}/${r.gemTotal}</b></div>`}<div>ปราบ<b>${r.kills}</b></div><div>โดนตี<b>${r.hits}</b></div><div>ตาย<b>${r.deaths}</b></div><div>คอมโบสูงสุด<b>${r.maxChain} HIT</b></div><div>ปัดสำเร็จ<b>🛡 ${r.parries || 0}</b></div></div>${lootLine(r)}
    ${newBest ? '<p class="note" style="text-align:center;color:#8aff8a">★ สถิติใหม่!</p>' : ''}
    <div class="reward">${paid ? `🪙 ทองเข้ากระเป๋าเกมหลัก +${gold}` : gold ? `🪙 ได้ทอง ${gold} — แต่ยังไม่มีเซฟเกมหลักในเครื่องนี้ (เริ่มเกมหลักก่อนแล้วทองจะเข้าครั้งถัดไป)` : '🪙 ทองให้เฉพาะผ่านครั้งแรก / 💎 ใหม่ / แรงก์ S ครั้งแรก'}
      <div class="note">${first ? 'ผ่านครั้งแรก' : 'เล่นซ้ำ (ได้จากเหรียญที่เก็บ)'}${newGems.length ? ` · 💎 ใหม่ ${newGems.length}` : ''}${firstS ? ' · แรงก์ S ครั้งแรก' : ''}</div></div>
    ${unlocked.length ? `<div class="reward" style="color:#8aff8a;border-color:#8aff8a55;background:#8aff8a14">🔓 ปลดล็อกฮีโร่ในโหมดนี้: ${unlocked.map(h => PLAT.HEROES[h].name).join(', ')}</div>` : ''}
    <div class="menu" style="margin-top:8px">${next ? '<button class="btn red" data-go2="next">▶ ด่านต่อไป</button>' : '<div class="reward" style="text-align:center">🏆 จบทุกด่านแล้ว! ลองเก็บ 💎 และแรงก์ S ให้ครบ</div>'}
      <button class="btn" data-go2="restart">⟲ เล่นซ้ำ</button><button class="btn" data-go2="map">🗺 แผนที่</button></div>`;
  $$('#clearBox [data-go2]').forEach(b => b.addEventListener('click', () => go(b.dataset.go2)));
  show('clear');
}

/* --------------------------------- endless --------------------------------- */
function renderEndless() {
  $('#eHero').textContent = PLAT.HEROES[S.data.hero].name;
  const box = $('#eWorlds'); box.innerHTML = '';
  for (const k of Object.keys(PLAT.ENDLESS_WORLDS).map(Number)) {
    const W = PLAT.ENDLESS_WORLDS[k], r = S.endlessRec(k);
    const b = document.createElement('button'); b.className = 'eworld'; b.style.setProperty('--wc', W.color);
    b.innerHTML = `<div class="nm">โลก ${k} · ${W.name}</div><div class="th">${W.th}</div>
      <div class="rec"><span>แต้มสูงสุด<br><b>${(r.best || 0).toLocaleString()}</b></span><span>ไกลสุด<br><b>${r.bestDist || 0} ม.</b></span><span>LV สูงสุด<br><b>${r.bestTier || '-'}</b></span><span>เล่นแล้ว<br><b>${r.runs || 0} รอบ</b></span></div>
      <div class="go">▶ เริ่มวิ่ง</div>`;
    b.addEventListener('click', () => { PLAT.sfx.select(); startEndless(k); });
    box.appendChild(b);
  }
}
/* stats of one finished (or abandoned) run → the Platform save. Returns { rec, newBest } */
function recordEndless(r, quit) {
  if (!r || !r.endless || r._saved) return null; r._saved = true;
  const g = app.game; if (g && g._recorded === g.seed + ':' + g.stats.frames) return null; if (g) g._recorded = g.seed + ':' + g.stats.frames;
  if (quit && r.dist < 5) return null;                                  // quitting at the start is not a run
  const rec = S.endlessRec(r.endless), newBest = r.score > (rec.best || 0);
  rec.runs = (rec.runs || 0) + 1; rec.totalDist = (rec.totalDist || 0) + r.dist; rec.kills = (rec.kills || 0) + r.kills; rec.coins = (rec.coins || 0) + r.coins; rec.lastSeed = r.seed;
  if (newBest) { rec.best = r.score; rec.bestSeed = r.seed; rec.bestHero = r.heroId; }
  if (r.dist > (rec.bestDist || 0)) rec.bestDist = r.dist;
  if (r.tier > (rec.bestTier || 0)) rec.bestTier = r.tier;
  S.data.stats.kills += r.kills; S.data.stats.coins += r.coins; S.data.stats.playFrames += r.frames; if (!quit) S.data.stats.deaths++;
  if (PLAT.meta) { PLAT.meta.track('endlessDist', r.dist); PLAT.meta.best('endlessBest', r.dist); }
  S.persist();
  return { rec, newBest };
}
function finishEndless(r) {
  const g0 = app.game; if (g0 && g0.daily && app.finishDaily) { recordEndless(r, false); app.finishDaily(r, g0.daily); return; }
  const res = recordEndless(r, false) || { rec: S.endlessRec(r.endless), newBest: false }, rec = res.rec, W = PLAT.ENDLESS_WORLDS[r.endless];
  const dev = S.devOn() || PLAT.debug.on;
  $('#overBox').innerHTML = `
    <h2 class="kick" style="text-align:center;color:#ff8a8a">จบรอบ!</h2>
    <p class="sub" style="text-align:center;margin:0">∞ ${W.name} · ${PLAT.HEROES[r.heroId].name}</p>
    <div class="bigdist">${r.dist}<small> ม.</small></div>
    ${res.newBest ? '<div class="newbest">★ สถิติใหม่!</div>' : ''}
    <div class="kv"><div>คะแนน<b>${r.score.toLocaleString()}</b></div><div>ระดับ<b>LV ${r.tier}</b></div><div>เหรียญ<b>🪙 ${r.coins}</b></div><div>ปราบ<b>${r.kills}</b></div><div>โดนตี<b>${r.hits}</b></div><div>เวลา<b>${U.fmtTime(r.frames)}</b></div><div>คอมโบสูงสุด<b>${r.maxChain} HIT</b></div><div>ปัดสำเร็จ<b>🛡 ${r.parries || 0}</b></div></div>${lootLine(r)}
    <div class="reward" style="color:var(--ink)">สถิติโลกนี้ · แต้มสูงสุด <b>${(rec.best || 0).toLocaleString()}</b> · ไกลสุด <b>${rec.bestDist || 0} ม.</b> · LV สูงสุด <b>${rec.bestTier || 1}</b> · เล่น ${rec.runs || 0} รอบ</div>
    <p class="note" style="text-align:center">ซีดด่าน ${r.seed}${dev && r.gen ? ` · สร้าง ${r.gen.built} ชิ้น · ไม่ผ่านตรวจ ${r.gen.failed} · สำรอง ${r.gen.fallback}` : ''}</p>
    <div class="menu" style="margin-top:6px"><button class="btn red" data-go2="endlessAgain">▶ เล่นอีกครั้ง (ด่านใหม่)</button><button class="btn" data-go2="endlessSeed">🎲 เล่นซ้ำด่านเดิม</button><button class="btn" data-go2="endless">∞ เลือกโลก</button><button class="btn" data-go2="map">🗺 แผนที่</button></div>`;
  $$('#overBox [data-go2]').forEach(b => b.addEventListener('click', () => go(b.dataset.go2)));
  show('over');
}

/* -------------------------------- settings -------------------------------- */
function setupSettings() {
  const sl = $('#setSfx'); sl.value = S.data.settings.sfx;
  sl.addEventListener('input', () => { S.data.settings.sfx = +sl.value; PLAT.sfx.vol = sl.value / 100; S.persist(); });
  sl.addEventListener('change', () => PLAT.sfx.coin());
  const seg = (el, key, map) => { const sync = () => $$(`#${el} button`).forEach(b => b.classList.toggle('on', String(map.to(S.data.settings[key])) === b.dataset.v));
    $$(`#${el} button`).forEach(b => b.addEventListener('click', () => { S.data.settings[key] = map.from(b.dataset.v); S.persist(); sync(); syncTouch(app.screen === 'game'); PLAT.sfx.select(); })); sync(); };
  seg('setShake', 'shake', { to: v => v === false ? '0' : '1', from: v => v === '1' });
  seg('setTouch', 'touch', { to: v => v || 'auto', from: v => v });
  seg('setVib', 'vibrate', { to: v => v === false ? '0' : '1', from: v => v === '1' });
  seg('setSize', 'btnSize', { to: v => v || 'M', from: v => { setTimeout(applyBtnSize); return v; } });
  const jseg = (el, key, parse) => { const sync = () => $$(`#${el} button`).forEach(b => b.classList.toggle('on', String(S.data.settings.joy[key]) === String(parse(b.dataset.v))));
    $$(`#${el} button`).forEach(b => b.addEventListener('click', () => { S.data.settings.joy[key] = parse(b.dataset.v); S.persist(); sync(); PLAT.sfx.select(); })); sync(); };
  jseg('setJoyMode', 'mode', v => v); jseg('setJoyDead', 'dead', v => +v);
}
function touchWanted() {
  const m = S.data.settings.touch || 'auto';
  if (m === 'on') return true; if (m === 'off') return false;
  // auto: a controller or a real keyboard in use → hide; touching the screen brings them back
  if (input.lastDevice === 'pad' || input.lastDevice === 'key') return false;
  if (input.pad && input.lastDevice !== 'touch') return false;
  return input.lastDevice === 'touch' || (matchMedia && matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
}
const isPhone = () => matchMedia && matchMedia('(pointer:coarse)').matches;
function syncTouch(playing) {
  const on = playing && touchWanted();
  if (!on) { input.releaseTouch(); $$('#btns .on').forEach(b => b.classList.remove('on')); $('#joy').dataset.dir = ''; }   // never leave a hidden button / the stick held (keyboard/pad input untouched)
  $('#touch').classList.toggle('on', on); $('#hAbil').style.display = on ? 'none' : '';
  $('#rotHint').classList.toggle('need', playing && (on || isPhone()));
  document.documentElement.classList.toggle('touchui', on);
}

/* ---------------------------------- loop ---------------------------------- */
function resize() {
  const vw = innerWidth, vh = innerHeight, ar = C.VW / C.VH;
  let w = vw, h = vw / ar; if (h > vh) { h = vh; w = vh * ar; }
  w = Math.floor(w); h = Math.floor(h);
  const st = $('#stage'); st.style.width = w + 'px'; st.style.height = h + 'px';
  // device-resolution canvas (sharp pixels) but capped at ~2.6 MP so phones keep 60 fps
  let dpr = Math.min(2, window.devicePixelRatio || 1); const cap = 2560 / (w * dpr); if (cap < 1) dpr *= cap;
  const cv = $('#cv'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  $('#hud').style.fontSize = (h / 30) + 'px';
}
function tick(now) {
  app.raf = requestAnimationFrame(tick);
  const g = app.game, dt = Math.min(100, now - app.last); app.last = now;
  input.pollPad();
  menuNav(); padLive();
  if (g && g.mode !== 'loading') {
    if (app.screen === 'game' && input.wasPressed('pause') && g.mode === 'play') { pause(); input.endFrame(); }
    if (app.screen === 'game' && (g.mode === 'play' || g.mode === 'clear' || (g.mode === 'dead'))) {
      app.acc += dt / (1000 / C.FPS) * (PLAT.meta ? PLAT.meta.assist().speed || 1 : 1);   // v118 assist: slower game
      let steps = 0;
      while (app.acc >= 1 && steps < 5) {
        try { g.update(); } catch (e) { if (!app.errLogged) { app.errLogged = true; console.error('[platform] update error', e); } }   // one bad frame must not freeze the game
        input.endFrame(); app.acc -= 1; steps++;
      }
      if (steps === 5) app.acc = 0;
    } else { app.acc = 0; input.endFrame(); }
    const cv = app.cv, ctx = app.ctx;
    // a paused / dead / clear screen is a still frame: draw it once, not 60 times a second
    const still = app.screen !== 'game' && g.mode !== 'clear';
    if (!still || app.stillOf !== g.frame + ':' + cv.width) { app.stillOf = still ? g.frame + ':' + cv.width : null;
      try { g.render(ctx, cv.width / C.VW); } catch (e) { if (!app.renderErr) { app.renderErr = true; console.error('[platform] render error', e); } } }
  } else {
    input.endFrame();
    if (app.previews.length) animatePreviews();
    // idle menu backdrop
    const cv = app.cv, ctx = app.ctx; if (app.drawBackdrop && app.drawBackdrop(ctx, cv, now)) { app.idleOf = null; }
    else if (app.idleOf !== cv.width + 'x' + cv.height) { app.idleOf = cv.width + 'x' + cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#08070f'; ctx.fillRect(0, 0, cv.width, cv.height); }
  }
  if (g && app.previews.length && app.screen !== 'game') animatePreviews();
}

// small handle for tools/plat-v92-test.mjs (and the browser console): the same functions the buttons call
app.api = { startLevel, startEndless, show, go, pause, resume, quitGame, syncTouch, renderPadMap, startListen, stopListen, notify, toast, refreshTitle, heroSheet, drawPreview, heroAvailable, levelUnlocked, setupHud };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();   // v118: after hub.js has registered its screens
})();
