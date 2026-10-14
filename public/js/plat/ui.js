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

const app = PLAT.app = { game: null, screen: 'title', prev: [], selHero: null, raf: 0, last: 0, acc: 0, previews: [] };

/* -------------------------------- boot -------------------------------- */
function boot() {
  S.load();
  if (S.data.settings.sfx == null) S.data.settings.sfx = Math.round(S.mainVolume() * 100);
  PLAT.sfx.vol = S.data.settings.sfx / 100;
  if (!heroAvailable(S.data.hero)) S.data.hero = 'knight';
  input.attach(); input.bindTouch($('#btns')); input.bindPad($('#dpad'));
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
  document.addEventListener('pointerdown', () => PLAT.sfx.unlock(), { once: true });
  addEventListener('keydown', menuKeys);
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden && app.game && app.game.mode === 'play') pause(); });
  addEventListener('pagehide', () => { input.detach(); cancelAnimationFrame(app.raf); });
  setupSettings(); refreshFullBtn(); applyBtnSize(); renderPadStatus();
  document.documentElement.dataset.dev = input.lastDevice;
  resize(); show('title'); refreshTitle();
  app.last = performance.now(); app.raf = requestAnimationFrame(tick);
}

/* -------------------------------- screens -------------------------------- */
function show(name, push) {
  if (push && app.screen !== name) app.prev.push(app.screen);
  app.screen = name;
  $$('.screen').forEach(s => s.classList.remove('on'));
  const id = { title: 'sTitle', heroes: 'sHeroes', map: 'sMap', pause: 'sPause', dead: 'sDead', clear: 'sClear', settings: 'sSettings', loading: 'sLoading' }[name];
  if (id) $('#' + id).classList.add('on');
  const playing = name === 'game';
  $('#hud').classList.toggle('on', !!app.game && ['game', 'pause', 'dead', 'clear'].includes(name));
  syncTouch(playing);
  if (name === 'heroes') renderHeroes();
  if (name === 'map') renderMap();
  if (name === 'title') refreshTitle();
  const first = id && $('#' + id + ' .btn.red, #' + id + ' .btn');
  if (first && (input.lastDevice === 'pad' || input.lastDevice === 'key')) setTimeout(() => first.focus({ preventScroll: true }), 30);
}
function go(where) {
  PLAT.sfx.select();
  switch (where) {
    case 'map': quitGame(); show('map'); break;
    case 'heroes': show('heroes', true); break;
    case 'settings': show('settings', true); break;
    case 'title': show('title'); break;
    case 'back': show(app.prev.pop() || 'title'); break;
    case 'main': quitGame(); input.detach(); location.href = 'index.html'; break;
    case 'resume': resume(); break;
    case 'retryCp': if (app.game) { app.game.respawn(); show('game'); } break;
    case 'restart': if (app.game) startLevel(app.game.levelId); break;
    case 'next': { const i = PLAT.LEVEL_ORDER.indexOf(app.game && app.game.levelId); const n = PLAT.LEVEL_ORDER[i + 1]; if (n && levelUnlocked(n)) startLevel(n); else { quitGame(); show('map'); } break; }
  }
}
function menuKeys(e) {
  if (app.screen === 'game') return;
  if (e.code === 'Escape') { e.preventDefault(); if (app.screen === 'pause') resume(); else if (app.screen === 'settings' || app.screen === 'heroes') go('back'); else if (app.screen === 'map') show('title'); }
}
function pause() { if (!app.game || app.game.mode !== 'play') return; app.game.mode = 'paused'; $('#pSub').textContent = `${app.game.levelId} ${app.game.spec.name} · ${PLAT.HEROES[app.game.heroId].name}`; show('pause'); input.clearAll(); }
function resume() { if (!app.game) return; if (app.game.mode === 'paused') app.game.mode = 'play'; input.clearAll(); show('game'); }

/* ---------------------------- menu navigation ----------------------------
   D-pad / stick / arrow keys move the focus to the nearest button in that direction,
   A / Enter presses it, B / Backspace goes back — every menu works without touching the screen. */
function screenEl() { const id = { title: 'sTitle', heroes: 'sHeroes', map: 'sMap', pause: 'sPause', dead: 'sDead', clear: 'sClear', settings: 'sSettings' }[app.screen]; return id && $('#' + id); }
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
  if (app.screen === 'game' || app.screen === 'loading') return;
  const P = a => input.wasPressed(a), cur = document.activeElement;
  if (cur && cur.type === 'range' && (P('left') || P('right'))) {
    cur.value = +cur.value + (P('right') ? 1 : -1) * (+cur.step || 1) * 2; cur.dispatchEvent(new Event('input')); cur.dispatchEvent(new Event('change')); return;
  }
  if (P('up')) moveFocus(0, -1); else if (P('down')) moveFocus(0, 1); else if (P('left')) moveFocus(-1, 0); else if (P('right')) moveFocus(1, 0);
  else if (P('ok')) { const root = screenEl(); if (root && cur && root.contains(cur) && cur.tagName === 'BUTTON') cur.click(); else moveFocus(0, 1); }
  else if (P('back') || (P('pause') && app.screen === 'pause')) {
    if (app.screen === 'pause') resume(); else if (app.screen === 'settings' || app.screen === 'heroes') go('back');
    else if (app.screen === 'map') show('title'); else if (app.screen === 'dead') go('retryCp');
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
  [$('#hFull'), $('#tFull')].forEach(b => { if (!b) return; b.style.display = fsOK() ? '' : 'none'; b.textContent = b.id === 'tFull' ? (on ? '⛶ ออกจากเต็มจอ' : '⛶ เต็มจอ (แนะนำบนมือถือ)') : '⛶'; });
}

/* ------------------------- controls: glyphs & pad info ------------------------- */
const GLYPH = { key: { a: 'J', s: 'I', d: 'L', j: 'Space' }, pad: { a: 'X', s: 'Y', d: 'B', j: 'A' } };
function refreshGlyphs() {
  const g = input.lastDevice === 'pad' || (input.pad && input.lastDevice !== 'touch' && input.lastDevice !== 'key') ? GLYPH.pad : GLYPH.key;
  $$('#hAbil kbd').forEach((k, i) => k.textContent = [g.a, g.s, g.d][i] || k.textContent);
}
function renderPadStatus() {
  const el = $('#padStatus'); if (!el) return;
  el.innerHTML = input.pad ? `🎮 เชื่อมต่อแล้ว: <b>${String(input.pad.name).replace(/[<>&]/g, '').slice(0, 60)}</b>${input.pad.standard ? '' : ' <span class="chip">ปุ่มอาจสลับตำแหน่ง (จอยไม่ใช่แบบมาตรฐาน)</span>'}`
    : '🎮 ยังไม่พบจอย — ต่อ Bluetooth/USB แล้ว<b>กดปุ่มใดก็ได้ 1 ครั้ง</b> เกมจะเจอเอง';
}
let notifyT = 0;
function notify(a, b) { const n = $('#notify'); if (!n) return; n.innerHTML = `<b>${a}</b>${b ? `<span>${b}</span>` : ''}`; n.classList.add('on'); clearTimeout(notifyT); notifyT = setTimeout(() => n.classList.remove('on'), 3200); }
function applyBtnSize() { const m = { S: .82, M: 1, L: 1.2 }[S.data.settings.btnSize || 'M'] || 1; document.documentElement.style.setProperty('--tsz', m); }

/* ------------------------------ availability ------------------------------ */
function heroAvailable(id) {
  const h = PLAT.HEROES[id]; if (!h) return false;
  if (h.devOnly && !S.devOn()) return false;
  if (h.free || S.devOn()) return true;
  if (S.ownedMain().has(id)) return true;
  const need = PLAT.HERO_UNLOCK[id]; return !!(need && S.level(need) && S.level(need).cleared);
}
function heroLockText(id) {
  const need = PLAT.HERO_UNLOCK[id];
  return need ? `ผ่านด่าน ${need} หรือมีในเกมหลัก` : 'มีในเกมหลักก่อน';
}
function levelUnlocked(id) {
  const i = PLAT.LEVEL_ORDER.indexOf(id); if (i <= 0 || S.devOn()) return true;
  const prev = S.level(PLAT.LEVEL_ORDER[i - 1]); return !!(prev && prev.cleared);
}
const heroList = () => PLAT.HERO_ORDER.filter(id => PLAT.HEROES[id] && !(PLAT.HEROES[id].devOnly && !S.devOn()));

/* --------------------------------- title --------------------------------- */
function refreshTitle() {
  $('#tHero').textContent = PLAT.HEROES[S.data.hero].name;
  const cleared = PLAT.LEVEL_ORDER.filter(id => S.level(id) && S.level(id).cleared).length;
  const gems = PLAT.LEVEL_ORDER.reduce((n, id) => n + ((S.level(id) || {}).gems || []).length, 0);
  $('#tNote').textContent = (input.pad ? '🎮 จอยพร้อมใช้ · ' : '') + `ผ่านแล้ว ${cleared}/${PLAT.LEVEL_ORDER.length} ด่าน · 💎 ${gems}/18 · ทองที่ได้เข้าเกมหลักรวม ${S.data.goldEarned || 0}` + (S.devOn() ? ' · 🛠 โหมดผู้พัฒนา: ปลดล็อกทุกอย่าง' : '');
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
  const atkName = A.kind === 'shot' ? 'ยิง' + (A.charge ? ' · กดค้างเพื่อชาร์จ' : '') + (A.combo ? ` · คอมโบ ${A.combo.at}+ เปลี่ยนอาวุธ` : '') : `ฟัน/ต่อย ${A.steps.length} จังหวะ`;
  const extra = [h.airJumps ? (h.float ? `ลอยตัวได้ ${h.airJumps} ครั้ง` : `กระโดด ${h.airJumps + 1} ชั้น`) : '', h.wallJump ? 'ถีบกำแพง' : '', h.ballJump ? 'กระโดดเป็นลูกบอลชนศัตรู' : '', h.guard ? '↓ ค้าง = ตั้งโล่' : '', h.armor ? 'เกราะหนา' : '', A.down ? (A.down === 'pogo' ? 'กลางอากาศ ↓+โจมตี = กดพลั่วเด้ง' : 'กลางอากาศ ↓+โจมตี = ทุบพื้น') : ''].filter(Boolean);
  box.innerHTML = `<canvas width="300" height="300"></canvas>
    <div><div class="nm" style="color:${h.color}">${h.name}</div><div class="th">${h.th} · <span class="chip">${h.role}</span></div>
      <p style="font-size:13px;margin:6px 0">${h.desc}</p>
      <div class="moves"><div><kbd>J</kbd>${atkName}</div><div><kbd>I</kbd>${Sk.name}${Sk.cost ? ` <span class="chip">พลัง ${Sk.cost}</span>` : ''}</div><div><kbd>L</kbd>${D.name}</div>${extra.length ? `<div><kbd>★</kbd>${extra.join(' · ')}</div>` : ''}</div>
      <div class="stat">HP ${h.hp} ${bar(h.hp, 6)}</div><div class="stat">ความเร็ว ${bar(h.speed || 1, 1.3)}</div>
      <div class="row" style="margin-top:10px">${ok ? `<button class="btn red" id="hPick">${id === S.data.hero ? '✓ ใช้อยู่' : 'ใช้ฮีโร่นี้'}</button>` : `<button class="btn" disabled>🔒 ${heroLockText(id)}</button>`}</div></div>`;
  const cv = box.querySelector('canvas'); heroSheet(id).then(() => app.previews.push({ cv, id, off: 0, big: true }));
  const pick = $('#hPick'); if (pick) pick.addEventListener('click', () => { S.data.hero = id; S.persist(); PLAT.sfx.checkpoint(); renderHeroes(); refreshTitle(); });
}

/* ---------------------------------- map ---------------------------------- */
function renderMap() {
  $('#mHero').textContent = PLAT.HEROES[S.data.hero].name;
  const mg = S.mainGold();
  $('#mSub').textContent = 'ผ่านด่านเพื่อปลดล็อกด่านถัดไป · เก็บ 💎 3 เม็ดต่อด่าน · แรงก์ S = ครบ 4 เงื่อนไข' + (mg != null ? ` · ทองในเกมหลัก ${mg.toLocaleString()}` : '');
  const box = $('#worlds'); box.innerHTML = '';
  for (const w of PLAT.WORLDS) {
    const div = document.createElement('div'); div.className = 'world';
    const g = w.levels.reduce((n, id) => n + ((S.level(id) || {}).gems || []).length, 0);
    div.innerHTML = `<div class="wn"><span>โลก ${w.n} · ${w.name}</span><span class="chip">💎 ${g}/6</span></div><div class="lvls"></div>`;
    const lv = div.querySelector('.lvls');
    for (const id of w.levels) {
      const L = PLAT.LEVELS[id], rec = S.level(id) || {}, open = levelUnlocked(id);
      const b = document.createElement('button'); b.className = 'lvl' + (open ? '' : ' lock') + (L.boss ? ' boss' : '');
      const gemTxt = L.boss ? '👑 บอส' : `💎 ${(rec.gems || []).length}/3`;
      b.innerHTML = `<div class="id">${id}</div><div class="nm">${L.name}</div><div class="meta">${open ? (rec.cleared ? `${gemTxt} · ⏱ ${U.fmtTime(rec.bestTime)} · ${rec.bestScore || 0} แต้ม` : `${gemTxt} · ยังไม่ผ่าน`) : '🔒 ผ่านด่านก่อนหน้า'}</div>${rec.bestRank ? `<div class="rk ${rec.bestRank}">${rec.bestRank}</div>` : ''}`;
      if (open) b.addEventListener('click', () => startLevel(id));
      else b.disabled = true;
      lv.appendChild(b);
    }
    box.appendChild(div);
  }
}

/* ------------------------------ level session ------------------------------ */
async function startLevel(id) {
  quitGame();
  const L = PLAT.LEVELS[id], heroId = heroAvailable(S.data.hero) ? S.data.hero : 'knight';
  $('#lTitle').textContent = `${id} · ${L.name}`; $('#lSub').textContent = L.teach || ''; $('#lBar').style.width = '0%';
  show('loading');
  const g = new PLAT.Game({ levelId: id, heroId, onEvent: onGameEvent });
  app.game = g;
  try { await g.load((d, n) => { $('#lBar').style.width = Math.round(d / n * 100) + '%'; }); }
  catch (e) { console.error(e); $('#lTitle').textContent = 'โหลดด่านไม่สำเร็จ'; $('#lSub').textContent = String(e.message || e); app.game = null; setTimeout(() => show('map'), 2200); return; }
  if (app.game !== g) return;
  setupHud(g);
  input.clearAll(); show('game');
  toast(`${id} ${L.name}`, L.teach);
  if (PLAT.assets.failed.length) console.warn('[platform] missing assets:', PLAT.assets.failed);
}
function quitGame() { if (app.game) { app.game.mode = 'loading'; app.game = null; } $('#hud').classList.remove('on'); $('#hBoss').classList.remove('on'); $('#hSign').classList.remove('on'); }
function onGameEvent(type, d) {
  const g = app.game; if (!g) return;
  switch (type) {
    case 'hud': updateHud(d); break;
    case 'sign': $('#hSign').classList.toggle('on', !!d); if (d) $('#hSign').textContent = d; break;
    case 'boss': $('#hBoss').classList.toggle('on', !!d); if (d) { $('#hBossNm').textContent = `${d.name} · ${d.th}`; $('#hBossBar').style.width = '100%'; toast(d.name, d.th); } break;
    case 'bossHit': $('#hBossBar').style.width = (d.hp / d.max * 100) + '%'; break;
    case 'toast': toast(d.text, d.sub); break;
    case 'dead': S.data.stats.deaths++; S.persist(); $('#dRetry').textContent = g.spec.boss ? '↺ ท้าบอสอีกครั้ง' : '↺ เกิดใหม่ที่เช็กพอยต์'; show('dead'); break;
    case 'clear': finishLevel(d); break;
  }
}
let toastT = 0;
function toast(a, b) { $('#hToast1').textContent = a || ''; $('#hToast2').textContent = b || ''; $('#hToast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('#hToast').classList.remove('on'), 2600); }

/* ---------------------------------- HUD ---------------------------------- */
let hudCache = {};
function setupHud(g) {
  const h = PLAT.HEROES[g.heroId];
  $('#hLv').textContent = `${g.levelId} ${g.spec.name}`;
  $('#hHearts').innerHTML = Array.from({ length: g.player.maxHp }, () => '<i></i>').join('');
  $('#hGems').innerHTML = g.spec.boss ? '' : Array.from({ length: g.L.gems.length }, () => '<i>💎</i>').join('');
  $('#hEnMark').style.left = (h.skill.cost || 0) + '%'; $('#hEnMark').style.display = h.skill.cost ? '' : 'none';
  $('#hAbil').innerHTML = `<span id="abA"><kbd>J</kbd>${h.attack.kind === 'shot' ? 'ยิง' : 'โจมตี'}</span><span id="abS"><kbd>I</kbd>${h.skill.name}</span><span id="abD"><kbd>L</kbd>${h.dash.name}</span>`;
  $('#tA').textContent = h.attack.kind === 'shot' ? 'ยิง' : 'โจมตี'; $('#tS').textContent = shortName(h.skill.name); $('#tD').textContent = shortName(h.dash.name);
  $('#hBoss').classList.remove('on'); $('#hSign').classList.remove('on');
  hudCache = {}; refreshGlyphs();
  const fc = $('#hFace'); heroSheet(g.heroId).then(() => { const ctx = fc.getContext('2d'); ctx.clearRect(0, 0, 48, 48); const sh = sheetCache[g.heroId], f = sh.frames('idle')[0]; PLAT.viewScale = 1;
    const s = 70 / (f.by || f.sh); PLAT.drawFrame(ctx, f, 24, 48 + (f.by * s) * .32, 1, s, { smooth: !!h.smooth }); });
}
const shortName = n => n.length > 9 ? n.split(/[ (/]/)[0].slice(0, 9) : n;
function updateHud(d) {
  const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
  set('hp', d.hp + '/' + d.maxHp, () => $$('#hHearts i').forEach((el, i) => el.classList.toggle('on', i < d.hp)));
  set('en', Math.round(d.en), v => $('#hEn').style.width = v + '%');
  set('coins', d.coins, v => $('#hCoins').textContent = v);
  set('gems', d.gems.join(','), () => $$('#hGems i').forEach((el, i) => el.classList.toggle('on', d.gems.includes(i))));
  set('time', Math.floor(d.frames / 6), () => $('#hTime').textContent = U.fmtTime(d.frames));
  set('low', d.en < d.skillCost, v => { const el = $('#abS'); if (el) el.classList.toggle('low', v); });
  set('cd', Math.round(d.dashCd * 10), v => { const el = $('#abD'); if (el) { el.classList.toggle('cd', v > 0); el.style.setProperty('--cd', (v * 10) + '%'); } $('#btns .bd').style.setProperty('--cd', (v * 10) + '%'); });
  set('tlow', d.en < d.skillCost, v => $('#btns .bs').classList.toggle('low', v));
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
  S.persist();
  const next = PLAT.LEVEL_ORDER[idx + 1];
  const newBest = !first && rec.bestScore === r.score && r.score > (prev.bestScore || 0);
  $('#clearBox').innerHTML = `
    <h2 class="kick" style="text-align:center">${PLAT.LEVELS[id].boss ? 'ปราบบอสสำเร็จ!' : 'ผ่านด่าน!'}</h2>
    <p class="sub" style="text-align:center;margin:0">${id} ${PLAT.LEVELS[id].name}</p>
    <div class="res-rank rk ${r.rank}">${r.rank}</div>
    <div class="checks">${r.checks.map(c => `<div><span>${c.th}</span><span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'}</span></div>`).join('')}</div>
    <div class="kv"><div>เวลา<b>${U.fmtTime(r.frames)}</b></div><div>คะแนน<b>${r.score.toLocaleString()}</b></div><div>เหรียญ<b>🪙 ${r.coins}</b></div>${PLAT.LEVELS[id].boss ? '' : `<div>💎<b>${r.gems.length}/${r.gemTotal}</b></div>`}<div>ปราบ<b>${r.kills}</b></div><div>โดนตี<b>${r.hits}</b></div></div>
    ${newBest ? '<p class="note" style="text-align:center;color:#8aff8a">★ สถิติใหม่!</p>' : ''}
    <div class="reward">${paid ? `🪙 ทองเข้ากระเป๋าเกมหลัก +${gold}` : gold ? `🪙 ได้ทอง ${gold} — แต่ยังไม่มีเซฟเกมหลักในเครื่องนี้ (เริ่มเกมหลักก่อนแล้วทองจะเข้าครั้งถัดไป)` : '🪙 ทองให้เฉพาะผ่านครั้งแรก / 💎 ใหม่ / แรงก์ S ครั้งแรก'}
      <div class="note">${first ? 'ผ่านครั้งแรก' : 'เล่นซ้ำ (ได้จากเหรียญที่เก็บ)'}${newGems.length ? ` · 💎 ใหม่ ${newGems.length}` : ''}${firstS ? ' · แรงก์ S ครั้งแรก' : ''}</div></div>
    ${unlocked.length ? `<div class="reward" style="color:#8aff8a;border-color:#8aff8a55;background:#8aff8a14">🔓 ปลดล็อกฮีโร่ในโหมดนี้: ${unlocked.map(h => PLAT.HEROES[h].name).join(', ')}</div>` : ''}
    <div class="menu" style="margin-top:8px">${next ? '<button class="btn red" data-go2="next">▶ ด่านต่อไป</button>' : '<div class="reward" style="text-align:center">🏆 จบทุกด่านแล้ว! ลองเก็บ 💎 และแรงก์ S ให้ครบ</div>'}
      <button class="btn" data-go2="restart">⟲ เล่นซ้ำ</button><button class="btn" data-go2="map">🗺 แผนที่</button></div>`;
  $$('#clearBox [data-go2]').forEach(b => b.addEventListener('click', () => go(b.dataset.go2)));
  show('clear');
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
  if (!on) { input.releaseTouch(); $$('#btns .on').forEach(b => b.classList.remove('on')); $('#dpad').dataset.dir = ''; }   // never leave a hidden button held (keyboard/pad input untouched)
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
  menuNav();
  if (g && g.mode !== 'loading') {
    if (app.screen === 'game' && input.wasPressed('pause') && g.mode === 'play') { pause(); input.endFrame(); }
    if (app.screen === 'game' && (g.mode === 'play' || g.mode === 'clear' || (g.mode === 'dead'))) {
      app.acc += dt / (1000 / C.FPS);
      let steps = 0;
      while (app.acc >= 1 && steps < 5) {
        try { g.update(); } catch (e) { if (!app.errLogged) { app.errLogged = true; console.error('[platform] update error', e); } }   // one bad frame must not freeze the game
        input.endFrame(); app.acc -= 1; steps++;
      }
      if (steps === 5) app.acc = 0;
    } else { app.acc = 0; input.endFrame(); }
    const cv = $('#cv'), ctx = cv.getContext('2d');
    try { g.render(ctx, cv.width / C.VW); } catch (e) { if (!app.renderErr) { app.renderErr = true; console.error('[platform] render error', e); } }
  } else {
    input.endFrame();
    if (app.previews.length) animatePreviews();
    // idle menu backdrop
    const cv = $('#cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#08070f'; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  if (g && app.previews.length && app.screen !== 'game') animatePreviews();
}

boot();
})();
