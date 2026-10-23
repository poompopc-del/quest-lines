/* ==========================================================================
   PLATFORM MODE · hub (v118) — the title menu and the meta screens
   --------------------------------------------------------------------------
   Title: an animated backdrop (the worlds' own parallax art, a hero running through it) + a tile menu.
   Screens: daily challenge · missions / achievements / titles · talents · boss rush · boon pick (in-run) ·
   daily login reward. Menu music (Pascal Belisle). Assist-mode settings.
   Logic lives in meta.js; this file only renders it and starts runs through PLAT.app.api.
   ========================================================================== */
(function () {
'use strict';
const PLAT = window.PLAT, U = PLAT.U, S = PLAT.save, M = PLAT.meta, app = PLAT.app, input = PLAT.input;
const A = () => app.api, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const fmtT = f => U.fmtTime(f);
Object.assign(app.SCREENS, { daily: 'sDaily', quests: 'sQuests', talents: 'sTalents', rush: 'sRush', boon: 'sBoon', streak: 'sStreak' });
['daily', 'quests', 'talents', 'rush'].forEach(n => app.subScreens.add(n));
const MENU = new Set(['title', 'map', 'endless', 'heroes', 'shop', 'settings', 'daily', 'quests', 'talents', 'rush', 'streak']);

/* ------------------------------------------------------------------ routing */
app.go2 = where => {
  if (['daily', 'quests', 'talents', 'rush'].includes(where)) { A().show(where, true); return true; }
  return false;
};
app.onShow.title = () => {
  if (BM.on) battle(false);
  refreshTitle2(); music(true);
  if (app.pendingStreak) setTimeout(() => { const r = app.pendingStreak; if (r && app.screen === 'title' && !app.game) { app.pendingStreak = null; showStreak(r); } }, 700);
};
app.onShow.daily = renderDaily; app.onShow.quests = renderQuests; app.onShow.talents = renderTalents; app.onShow.rush = renderRush;
['map', 'endless', 'heroes', 'shop', 'settings'].forEach(n => { const f = app.onShow[n]; app.onShow[n] = () => { if (f) f(); music(true); }; });
app.onShow.game = () => { music(false); if (BM.on) bmFade(bmLevel(), .3); };

/* ------------------------------------------------------------------ music */
let bgm = null, gestured = false;
function musicVol() { const v = S.data.settings.music; return (v == null ? 45 : v) / 100; }
function music(on) {
  if (!bgm) { try { bgm = new Audio('audio/plat/title.mp3'); bgm.loop = true; bgm.preload = 'none'; } catch (e) { return; } }
  bgm.volume = musicVol() * .6;
  if (on && musicVol() > 0 && gestured && !app.game && !BM.on) { const p = bgm.play(); if (p && p.catch) p.catch(() => {}); }
  else if (!on || !musicVol()) bgm.pause();
}
const firstGesture = () => { if (gestured) return; gestured = true; if (MENU.has(app.screen)) music(true); if (bmCtx()) bmLoad(); };
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, firstGesture, { capture: true }));
setInterval(() => { if (input.pad && !gestured) firstGesture(); }, 1500);

/* ------------------------------------------------------------------ boss music
   "8-bit Battle Loop" by Wolfgang_ (CC0). Played through Web Audio so the loop has no gap; .ogg where the browser
   can decode it, .mp3 otherwise (iPhone Safari). Starts when a boss / endless champion appears, fades out when it
   falls; quieter while paused; keeps going between the fights of a boss rush. */
const BM = { ctx: null, gain: null, buf: null, src: null, on: false, loading: null };
function bmCtx() {
  if (!BM.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; BM.ctx = new AC(); BM.gain = BM.ctx.createGain(); BM.gain.gain.value = 0; BM.gain.connect(BM.ctx.destination); }
  if (BM.ctx.state === 'suspended') BM.ctx.resume().catch(() => {});
  return BM.ctx;
}
function bmLoad() {
  if (BM.buf || BM.loading) return BM.loading;
  const ctx = bmCtx(); if (!ctx) return null;
  const ogg = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"');
  const get = url => fetch(url).then(r => r.arrayBuffer()).then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no)));
  BM.loading = get(ogg ? 'audio/plat/boss.ogg' : 'audio/plat/boss.mp3').catch(() => get('audio/plat/boss.mp3')).then(b => { BM.buf = b; return b; }).catch(() => null);
  return BM.loading;
}
function bmLevel() { return BM.on ? musicVol() * (app.screen === 'game' ? .55 : .2) : 0; }
function bmFade(to, sec) { if (!BM.ctx) return; const g = BM.gain.gain, t = BM.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + (sec || .6)); }
function battle(on) {
  if (on === BM.on) { bmFade(bmLevel(), .4); return; }
  BM.on = on;
  if (!on) { bmFade(0, 1.4); const s = BM.src; setTimeout(() => { if (!BM.on && s) { try { s.stop(); } catch (e) {} if (BM.src === s) BM.src = null; } }, 1500); return; }
  if (!gestured || !bmCtx()) return;
  Promise.resolve(bmLoad()).then(buf => {
    if (!buf || !BM.on || BM.src) { if (BM.src) bmFade(bmLevel(), .5); return; }
    const src = BM.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(BM.gain); src.start(); BM.src = src;
    bmFade(bmLevel(), .8);
  });
  if (bgm) bgm.pause();
}
app.bm = BM;                                         // (tests / console)
app.onBoss = d => { if (d) battle(true); else if (!app.rushRun) battle(false); };
['pause', 'dead', 'clear', 'over', 'boon'].forEach(n => { const f = app.onShow[n]; app.onShow[n] = () => { if (f) f(); if (BM.on) bmFade(bmLevel(), .3); }; });

/* ------------------------------------------------------------------ title backdrop */
const BG_THEMES = ['meadow', 'night', 'swamp', 'grotto', 'town', 'forest', 'fort', 'lava'];
const bg = { i: 0, t0: 0, ready: new Set(), heroT: 0 };
function loadBackdrops() {
  for (const th of BG_THEMES) {
    const art = PLAT.ART[th]; if (!art) continue;
    PLAT.assets.loadAll(PLAT.themeImages(PLAT.THEMES[th]).filter(src => !/decor|plant|prop|house|lamp|stone|tree|bush|rock|shroom|statue|column|banner|window|door|flag|front|palm|pillar|well|wagon|barrel|crate|sign/.test(src) || /tileset|tiles/.test(src))).then(() => bg.ready.add(th)).catch(() => {});
  }
}
function drawLayersTo(ctx, layers, cx, W, H) {
  const k = H / 360;                                         // the art is authored for a 360 px tall view
  for (const l of layers) {
    const im = PLAT.assets.img(l.img); if (!im) return false;
    const w = Math.round(im.width * l.s * k), h = Math.round(im.height * l.s * k), y = Math.round(l.y * k);
    const ox = -(((cx * l.f * k) % w) + w) % w;
    if (l.tileY) { for (let yy = ((y % h) + h) % h - h; yy < H; yy += h) for (let x = ox; x < W; x += w) ctx.drawImage(im, x, yy, w, h); continue; }
    for (let x = ox; x < W; x += w) ctx.drawImage(im, x, y, w, h);
    if (l.below && y + h < H) { ctx.fillStyle = l.below; ctx.fillRect(0, y + h - 1, W, H - y - h + 1); }
  }
  return true;
}
app.drawBackdrop = (ctx0, cv0, now) => {
  const cv = $('#tBg'); if (!cv || app.screen !== 'title') return false;
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr / 2), H = Math.round(innerHeight * dpr / 2);   // half-res: chunky pixels, cheap
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  if (!bg.t0) bg.t0 = now;
  const ready = BG_THEMES.filter(t => bg.ready.has(t)); if (!ready.length) { ctx.fillStyle = '#08070f'; ctx.fillRect(0, 0, W, H); return false; }
  const per = 9000, k = (now - bg.t0) / per, cur = ready[Math.floor(k) % ready.length], nxt = ready[(Math.floor(k) + 1) % ready.length], f = k % 1;
  const cx = (now - bg.t0) * .09;
  const sky = PLAT.THEMES[cur].sky; const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  drawLayersTo(ctx, PLAT.ART[cur].layers, cx, W, H);
  if (f > .85 && nxt !== cur) { ctx.globalAlpha = (f - .85) / .15; const s2 = PLAT.THEMES[nxt].sky, g2 = ctx.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, s2[0]); g2.addColorStop(1, s2[1]); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); drawLayersTo(ctx, PLAT.ART[nxt].layers, cx, W, H); ctx.globalAlpha = 1; }
  // the world's own ground tiles scroll under the hero (foreground speed)
  const gy = Math.round(H * .86); drawGround(ctx, cur, cx * 1.6, gy, W, H);
  if (f > .85 && nxt !== cur) { ctx.globalAlpha = (f - .85) / .15; drawGround(ctx, nxt, cx * 1.6, gy, W, H); ctx.globalAlpha = 1; }
  // the chosen hero runs through the worlds
  const sh = heroRun.sheet, fr = sh && (sh.frames('run') || sh.frames('walk') || sh.frames('idle'));
  if (fr && fr.length) {
    const h = PLAT.HEROES[heroRun.id], f0 = fr[Math.floor(now / 70) % fr.length], sc = (h.scale || 1) * H / 360 * 1.15;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(W * .16, gy, 22 * sc, 4 * sc, 0, 0, 6.283); ctx.fill();
    PLAT.viewScale = 1; PLAT.drawFrame(ctx, f0, W * .16, gy, 1, sc, { smooth: !!h.smooth });
  }
  return false;
};
const stampOf = (t, v) => { const a = v == null ? null : Array.isArray(v) && typeof v[0] !== 'number' ? v[0] : v; if (!a) return null; const im = PLAT.assets.img((a.img) || t.img); if (!im) return null; return { im, r: Array.isArray(a) ? a : a.r || [0, 0, im.width, im.height], oy: a.oy || 0 }; };
function drawGround(ctx, th, cx, gy, W, H) {
  const t = PLAT.ART[th] && PLAT.ART[th].tiles; if (!t) return;
  const ts = Math.round(H / 360 * 32), k = ts / t.unit, top = stampOf(t, t.top), fill = stampOf(t, t.fill || t.top);
  if (!top || !fill) { ctx.fillStyle = PLAT.THEMES[th].ground; ctx.fillRect(0, gy, W, H - gy); return; }
  const ox = -((cx % ts) + ts) % ts;
  for (let x = ox; x < W; x += ts) {
    for (let y = gy + ts; y < H; y += ts) ctx.drawImage(fill.im, fill.r[0], fill.r[1], fill.r[2], fill.r[3], x, y, ts, fill.r[3] * k);
    ctx.drawImage(top.im, top.r[0], top.r[1], top.r[2], top.r[3], x + (ts - top.r[2] * k) / 2, gy - top.oy * k, top.r[2] * k, top.r[3] * k);
  }
}
const heroRun = { id: null, sheet: null };
function syncTitleHero() {
  const id = S.data.hero; if (heroRun.id === id) return; heroRun.id = id; heroRun.sheet = null;
  A().heroSheet(id).then(sh => { const fr = sh.frames('run') || sh.frames('walk'); if (fr) PLAT.assets.loadAll(fr.map(f => f.src)).then(() => { if (heroRun.id === id) heroRun.sheet = sh; }); else heroRun.sheet = sh; }).catch(() => {});
}

/* ------------------------------------------------------------------ title info */
function refreshTitle2() {
  syncTitleHero();
  const m = M.d(), cleared = PLAT.LEVEL_ORDER.filter(id => S.level(id) && S.level(id).cleared).length;
  $('#tWallet').textContent = '🪙 ' + PLAT.bag.coins().toLocaleString();
  $('#tTitleChip').textContent = m.title ? '「' + m.title + '」' : ''; $('#tTitleChip').style.display = m.title ? '' : 'none';
  $('#tStreak').textContent = m.streak.n ? `🔥 ${m.streak.n} วันติด` : '';
  $('#tStory').textContent = `ผ่าน ${cleared}/${PLAT.LEVEL_ORDER.length} ด่าน`;
  const bestD = Math.max(0, ...Object.keys(PLAT.ENDLESS_WORLDS).map(k => S.endlessRec(+k).bestDist || 0));
  $('#tEndless').textContent = bestD ? `ไกลสุด ${bestD} ม. · 5 โลก` : '5 โลก · พร · บอสสุ่ม';
  const dl = M.daily(), rec = M.dailyRec();
  $('#tDaily').textContent = `${dl.mod.icon} ${dl.mod.name} · ${rec.runs ? 'ดีสุด ' + rec.best.toLocaleString() : 'ยังไม่ได้เล่น'}`; $('#tDailyDot').classList.toggle('on', !rec.runs);
  const medals = M.RUSH.filter(id => m.medals[id]).length; $('#tRush').textContent = `เหรียญบอส ${medals}/${M.RUSH.length}` + (m.rush.best ? ` · ${fmtT(m.rush.best)}` : '');
  const cl = M.claimable(), ach = M.ACH.filter(a => m.ach[a.id]).length;
  $('#tQuests').textContent = `ความสำเร็จ ${ach}/${M.ACH.length}`; $('#tQuestBadge').textContent = cl || ''; $('#tQuestBadge').classList.toggle('on', cl > 0);
  const ranks = M.TALENTS.reduce((n, t) => n + M.rank(t.id), 0), maxR = M.TALENTS.reduce((n, t) => n + t.max, 0);
  $('#tTalents').textContent = `${ranks}/${maxR} ขั้น`;
  $('#tHeroes').textContent = PLAT.HEROES[S.data.hero].name;
}

/* ------------------------------------------------------------------ notifications */
M.listeners.push((k, p) => {
  if (k === 'ach') { A().notify(`🏆 ปลดล็อก: ${p.icon} ${p.name}`, `${p.desc} · +${p.coins} 🪙${p.title ? ' · ฉายาใหม่「' + p.title + '」' : ''}`); PLAT.sfx.gem(); }
  if (k === 'mission') A().notify('📜 ภารกิจสำเร็จ!', p.txt + ' — กดรับรางวัลที่ "ภารกิจ"');
});

/* ------------------------------------------------------------------ daily login reward */
const itemTxt = (id, n) => { const it = PLAT.ITEMS[id]; return it ? `${it.icon} ${it.name}${n > 1 ? ' ×' + n : ''}` : ''; };
function showStreak(res) {
  const n = res.n, cyc = (n - 1) % 7;
  $('#streakBox').innerHTML = `<h2 class="kick" style="text-align:center">รางวัลรายวัน!</h2>
    <p class="sub" style="text-align:center">เข้าเล่นติดกัน <b style="color:var(--k-gold)">${n} วัน</b> 🔥 — มาทุกวันรางวัลจะใหญ่ขึ้น</p>
    <div class="streak7">${M.STREAK.map((r, i) => `<div class="sd ${i < cyc ? 'got' : i === cyc ? 'now' : ''}"><b>วัน ${i + 1}</b><span>🪙 ${r.coins}</span>${r.item ? `<small>${PLAT.ITEMS[r.item].icon}${r.n > 1 ? '×' + r.n : ''}</small>` : '<small>&nbsp;</small>'}</div>`).join('')}</div>
    <div class="reward" style="text-align:center">ได้รับ 🪙 ${res.reward.coins}${res.reward.item ? ' + ' + itemTxt(res.reward.item, res.reward.n || 1) : ''}</div>
    <div class="menu"><button class="btn red" id="stOk">รับแล้ว!</button></div>`;
  $('#stOk').onclick = () => { PLAT.sfx.checkpoint(); A().show('title'); };
  A().show('streak'); PLAT.sfx.gem();
}

/* ------------------------------------------------------------------ DAILY CHALLENGE */
function untilMidnight() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = Math.max(0, Math.floor((m - n) / 1000)); return `${Math.floor(s / 3600)} ชม. ${Math.floor(s / 60) % 60} นาที`; }
function renderDaily() {
  const dl = M.daily(), rec = M.dailyRec(), W = PLAT.ENDLESS_WORLDS[dl.world], m = M.d();
  const hist = []; for (let i = 1; i <= 6; i++) { const k = M.dayKey(Date.now() - i * 864e5), r = m.daily[k]; hist.push(`<div><span>${k.slice(5)}</span><b>${r ? r.best.toLocaleString() : '—'}</b></div>`); }
  $('#dailyBox').innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center"><h2 class="kick">📅 ท้าทายรายวัน</h2><button class="btn" data-x="back">✕ ปิด</button></div>
    <p class="sub">ทุกวันมีด่านโหมดไม่สิ้นสุด 1 ด่านที่ทุกคนได้เหมือนกัน (ซีดเดียวกัน) + กฎพิเศษประจำวัน · เล่นได้ไม่จำกัด นับคะแนนที่ดีที่สุด · เปลี่ยนด่านใหม่ในอีก <b>${untilMidnight()}</b></p>
    <div class="daily-card" style="--wc:${W.color}">
      <div class="dc-l"><div class="dc-date">${dl.key}</div><div class="dc-world">โลก ${dl.world} · ${esc(W.name)}</div><div class="dc-mod"><em>${dl.mod.icon}</em><div><b>${dl.mod.name}</b><span>${dl.mod.desc}</span></div></div></div>
      <div class="dc-r"><div>คะแนนดีสุดวันนี้<b>${rec.best.toLocaleString()}</b></div><div>ระยะ<b>${rec.dist || 0} ม.</b></div><div>เล่นแล้ว<b>${rec.runs} รอบ</b></div></div>
    </div>
    <div class="menu" style="width:min(420px,100%)"><button class="btn red" data-x="play">▶ เริ่มท้าทายวันนี้</button><button class="btn" data-x="board">🏆 อันดับออนไลน์วันนี้</button>${rec.runs ? '<button class="btn" data-x="share">📤 แชร์คะแนนให้เพื่อน</button>' : ''}</div>
    <h3>6 วันที่ผ่านมา</h3><div class="hist">${hist.join('')}</div>
    <p class="note">ภารกิจ "เล่นท้าทายรายวัน" นับครั้งแรกของแต่ละวัน · ความสำเร็จ 📅 สม่ำเสมอ = เล่นครบ 10 วัน</p>`;
  bindX('#dailyBox', { play: () => A().startEndless(dl.world, dl.seed, { daily: dl }), share: () => shareDaily(dl, rec), board: () => app.openBoard && app.openBoard('daily:' + dl.key) });
}
function shareDaily(dl, rec) {
  const txt = `📅 Quest Lines ท้าทายรายวัน ${dl.key}\n${dl.mod.icon} ${dl.mod.name} · โลก ${dl.world}\nคะแนน ${rec.best.toLocaleString()} · ${rec.dist} ม. — มาแข่งกัน!`;
  if (navigator.share) navigator.share({ text: txt }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => A().notify('📋 คัดลอกข้อความแล้ว', 'วางส่งให้เพื่อนได้เลย')).catch(() => {});
}
app.finishDaily = (r, dl) => {
  const res = M.recordDaily(r), W = PLAT.ENDLESS_WORLDS[dl.world];
  $('#overBox').innerHTML = `
    <h2 class="kick" style="text-align:center;color:#7ad8ff">ท้าทายรายวัน · จบรอบ</h2>
    <p class="sub" style="text-align:center;margin:0">${dl.key} · ${dl.mod.icon} ${dl.mod.name} · ${esc(W.name)}</p>
    <div class="bigdist">${r.score.toLocaleString()}<small> แต้ม</small></div>
    ${res.newBest ? '<div class="newbest">★ ดีที่สุดของวันนี้!</div>' : ''}
    <div class="kv"><div>ระยะ<b>${r.dist} ม.</b></div><div>ระดับ<b>LV ${r.tier}</b></div><div>ปราบ<b>${r.kills}</b></div><div>เหรียญ<b>🪙 ${r.coins}</b></div><div>โดนตี<b>${r.hits}</b></div><div>ปัด<b>🛡 ${r.parries || 0}</b></div></div>
    <div class="reward" style="color:var(--ink)">ดีสุดวันนี้ <b>${res.rec.best.toLocaleString()}</b> · เล่น ${res.rec.runs} รอบ${res.first ? ' · ✓ ภารกิจท้าทายรายวันวันนี้' : ''}</div>
    <div class="menu" style="margin-top:6px"><button class="btn red" data-x="again">▶ ท้าทายอีกครั้ง</button><button class="btn" data-x="share">📤 แชร์คะแนน</button><button class="btn" data-x="menu">🏠 เมนูหลัก</button></div>`;
  bindX('#overBox', { again: () => A().startEndless(dl.world, dl.seed, { daily: dl }), share: () => shareDaily(dl, res.rec), menu: () => { A().quitGame(); A().show('title'); } });
  A().show('over');
};

/* ------------------------------------------------------------------ QUESTS · ACHIEVEMENTS · TITLES */
let qTab = 'mis';
function renderQuests() {
  const m = M.d(), { daily, weekly } = M.missions();
  const row = q => { const pr = M.misProgress(q), pc = Math.round(pr / q.need * 100);
    return `<div class="mis ${q.claimed ? 'claimed' : q.done ? 'done' : ''}"><div class="mt"><b>${esc(q.txt)}</b><span class="bar"><i style="width:${pc}%"></i></span><small>${Math.min(pr, q.need).toLocaleString()} / ${q.need.toLocaleString()}</small></div>
      <div class="mr"><span>🪙 ${q.coins}${q.item ? ' + ' + PLAT.ITEMS[q.item].icon : ''}</span>${q.claimed ? '<em>✓ รับแล้ว</em>' : q.done ? `<button class="btn gold" data-claim="${q.key}|${q.need}">รับรางวัล</button>` : ''}</div></div>`; };
  const tabs = `<div class="seg qtabs"><button data-t="mis" class="${qTab === 'mis' ? 'on' : ''}">📜 ภารกิจ</button><button data-t="ach" class="${qTab === 'ach' ? 'on' : ''}">🏆 ความสำเร็จ</button><button data-t="tit" class="${qTab === 'tit' ? 'on' : ''}">🎖 ฉายา</button></div>`;
  let body = '';
  if (qTab === 'mis') {
    const wkEnd = (7 - ((new Date().getDay() + 6) % 7));
    body = `<h3>ภารกิจประจำวัน <span class="chip">รีเซ็ตใน ${untilMidnight()}</span></h3>${daily.map(row).join('')}
      <h3>ภารกิจประจำสัปดาห์ <span class="chip">อีก ${wkEnd} วัน</span></h3>${weekly.map(row).join('')}
      <h3>เข้าเล่นติดกัน 🔥 ${m.streak.n} วัน <span class="chip">สูงสุด ${m.streak.max || m.streak.n} วัน</span></h3>
      <div class="streak7">${M.STREAK.map((r, i) => `<div class="sd ${i < (m.streak.n - 1) % 7 + 1 ? 'got' : ''}"><b>วัน ${i + 1}</b><span>🪙 ${r.coins}</span><small>${r.item ? PLAT.ITEMS[r.item].icon : '&nbsp;'}</small></div>`).join('')}</div>`;
  } else if (qTab === 'ach') {
    const done = M.ACH.filter(a => m.ach[a.id]).length;
    body = `<p class="sub">ปลดล็อกแล้ว ${done}/${M.ACH.length}${M.invincible() ? ' · <b style="color:#ff8a8a">ปิดอยู่ระหว่างโหมดอมตะ</b>' : ''}</p><div class="achs">${M.ACH.map(a => { const v = Math.min(a.need, M.achValue(a)), got = !!m.ach[a.id];
      return `<div class="ach ${got ? 'got' : ''}"><em>${a.icon}</em><div><b>${a.name}</b><span>${a.desc}</span>${got ? `<small>✓ ${m.ach[a.id]}</small>` : `<span class="bar"><i style="width:${v / a.need * 100}%"></i></span><small>${v.toLocaleString()} / ${a.need.toLocaleString()}</small>`}</div><i>🪙${a.coins}${a.title ? '<br>🎖' : ''}</i></div>`; }).join('')}</div>`;
  } else {
    const all = M.ACH.filter(a => a.title);
    body = `<p class="sub">ฉายาจะแสดงที่หน้าเมนูหลัก · ได้จากความสำเร็จที่มี 🎖</p><div class="titles"><button class="tit ${!m.title ? 'on' : ''}" data-title="">— ไม่ใช้ฉายา —</button>${all.map(a => { const own = m.titles.includes(a.title);
      return `<button class="tit ${m.title === a.title ? 'on' : ''}" data-title="${esc(a.title)}" ${own ? '' : 'disabled'}>${own ? '「' + esc(a.title) + '」' : '🔒 ' + esc(a.title)}<small>${own ? 'ใช้ฉายานี้' : a.desc}</small></button>`; }).join('')}</div>`;
  }
  $('#questBox').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h2 class="kick">📜 ภารกิจ · ความสำเร็จ</h2><div class="row"><span class="wallet">🪙 <b>${PLAT.bag.coins().toLocaleString()}</b></span><button class="btn" data-x="back">✕ ปิด</button></div></div>${tabs}${body}`;
  $$('#questBox .qtabs button').forEach(b => b.onclick = () => { qTab = b.dataset.t; PLAT.sfx.select(); renderQuests(); });
  $$('#questBox [data-claim]').forEach(b => b.onclick = () => { const [k, n] = b.dataset.claim.split('|'); const q = daily.concat(weekly).find(x => x.key === k && String(x.need) === n && x.done && !x.claimed); if (q && M.claim(q)) { PLAT.sfx.gem(); A().notify('🎁 รับรางวัลแล้ว', `🪙 +${q.coins}${q.item ? ' · ' + itemTxt(q.item, 1) : ''}`); } renderQuests(); });
  $$('#questBox [data-title]').forEach(b => b.onclick = () => { m.title = b.dataset.title || null; S.persist(); PLAT.sfx.select(); renderQuests(); });
  bindX('#questBox', {});
}

/* ------------------------------------------------------------------ TALENTS */
function renderTalents() {
  const cols = M.BRANCH.map((B, bi) => {
    const nodes = M.TALENTS.filter(t => t.br === bi).sort((a, b) => a.tier - b.tier).map(t => {
      const r = M.rank(t.id), st = M.talentState(t);
      return `<div class="tal ${st.s}${t.tier === 4 ? ' cap' : ''}"><div class="th"><em>${t.icon}</em><div><b>${t.name}</b><span class="pips">${Array.from({ length: t.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span></div></div>
        <p>${t.desc}</p>${st.s === 'max' ? '<div class="tb done">✓ เต็มแล้ว</div>' : st.s === 'locked' ? `<div class="tb">🔒 ลงสาย${B.name}อีก ${st.need - M.branchRanks(bi)} ขั้น</div>` : `<button class="btn ${st.s === 'buy' ? 'gold' : ''}" data-tal="${t.id}" ${st.s === 'buy' ? '' : 'disabled'}>🪙 ${st.cost.toLocaleString()}</button>`}</div>`;
    }).join('<div class="tline"></div>');
    return `<div class="tcol" style="--bc:${B.col}"><div class="tcolh">${B.icon} สาย${B.name}<small>${M.branchRanks(bi)} ขั้น</small></div>${nodes}</div>`;
  }).join('');
  $('#talentBox').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h2 class="kick">🌳 พรสวรรค์</h2><div class="row"><span class="wallet">🪙 <b>${PLAT.bag.coins().toLocaleString()}</b></span><button class="btn" data-x="back">✕ ปิด</button></div></div>
    <p class="sub">อัปเกรดถาวร ใช้ได้กับทุกฮีโร่ทุกโหมด · จ่ายด้วยเหรียญในโหมดนี้ · ขั้นสุดท้ายของแต่ละสายปลดความสามารถใหม่ · ลงสายละ 2 ขั้นเพื่อเปิดชั้นถัดไป</p>
    <div class="tcols">${cols}</div>
    <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-x="reset">↺ รีเซ็ต (คืนเหรียญทั้งหมด)</button></div>`;
  $$('#talentBox [data-tal]').forEach(b => b.onclick = () => { if (M.buyTalent(b.dataset.tal)) { PLAT.sfx.gem(); const t = M.TALENTS.find(x => x.id === b.dataset.tal); A().notify(`🌳 ${t.icon} ${t.name} ขั้น ${M.rank(t.id)}`, t.desc); } else PLAT.sfx.denied(); renderTalents(); });
  bindX('#talentBox', { reset: () => { const back = M.resetTalents(); if (back) A().notify('↺ รีเซ็ตพรสวรรค์แล้ว', `คืน 🪙 ${back.toLocaleString()}`); renderTalents(); } });
}

/* ------------------------------------------------------------------ BOSS RUSH */
const bossName = id => PLAT.LEVELS[id].name.replace(/^บอส:\s*/, '');
function rushUnlocked() { return S.devOn() || M.RUSH.every(id => S.level(id) && S.level(id).cleared); }
function renderRush() {
  const m = M.d(), R = m.rush;
  const rows = M.RUSH.map(id => { const md = m.medals[id], ok = S.devOn() || (S.level(id) && S.level(id).cleared);
    return `<div class="rrow ${ok ? '' : 'lock'}"><span class="rid">${PLAT.levelLabel(id)}</span><b>${ok ? esc(bossName(id)) : '???'}</b>
      <span class="rk ${md ? md.grade : ''}">${md ? md.grade : '—'}</span><small>${md && md.time ? '⏱ ' + fmtT(md.time) : ok ? 'ยังไม่มีเกรด' : '🔒 ล้มในเนื้อเรื่องก่อน'}</small>
      <button class="btn" data-duel="${id}" ${ok ? '' : 'disabled'}>⚔ ท้าดวล</button></div>`; }).join('');
  const un = rushUnlocked();
  $('#rushBox').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h2 class="kick">⚔️ ล่าบอส</h2><button class="btn" data-x="back">✕ ปิด</button></div>
    <p class="sub">ท้าดวลบอสตัวไหนก็ได้เพื่อเก็บเกรด (S = ไม่โดนตีเลย · A ≤ 2 · B ≤ 5) · <b>ล่าบอสต่อเนื่อง</b> = สู้ 6 ตัวรวด เลือดไม่เต็มระหว่างด่าน (ฟื้น 30%) จับเวลารวม</p>
    <div class="rushhead"><div>เวลาดีที่สุด<b>${R.best ? fmtT(R.best) : '—'}</b></div><div>ผ่านแล้ว<b>${R.clears || 0} ครั้ง</b></div><div>เกรดรวมดีสุด<b>${R.bestGrades ? R.bestGrades.join(' ') : '—'}</b></div></div>
    <div class="menu" style="width:min(420px,100%)"><button class="btn" data-x="board">🏆 อันดับออนไลน์ (ล่าบอสต่อเนื่อง)</button><button class="btn red" data-x="rush" ${un ? '' : 'disabled'}>${un ? '▶ เริ่มล่าบอสต่อเนื่อง (6 ตัว)' : '🔒 ล้มบอสทั้ง 6 ตัวในเนื้อเรื่องก่อน'}</button></div>
    <h3>บอสทั้งหมด · เหรียญเกรด</h3><div class="rrows">${rows}</div>`;
  $$('#rushBox [data-duel]').forEach(b => b.onclick = () => { PLAT.sfx.select(); A().startLevel(b.dataset.duel); });
  bindX('#rushBox', { rush: startRush, board: () => app.openBoard && app.openBoard('rush') });
}
function startRush() { app.rushRun = { i: 0, list: M.RUSH.slice(), total: 0, hits: 0, res: [], hp: null }; rushStep(); }
function rushStep() { const R = app.rushRun; A().startLevel(R.list[R.i], { rush: true, hp: R.hp }); }
function rushEnd(win) {
  const R = app.rushRun; app.rushRun = null; if (!R) return;
  if (app.onRushEnd) app.onRushEnd(win, R);                // v129 online board
  battle(false);
  const m = M.d(), RR = m.rush; let nb = false;
  if (win) {
    RR.clears = (RR.clears || 0) + 1; M.track('rushClear');
    if (R.res.every(x => x.grade === 'S')) M.track('rushPerfect');
    if (!RR.best || R.total < RR.best) { RR.best = R.total; RR.bestGrades = R.res.map(x => x.grade); nb = true; }
    PLAT.bag.earn(500); S.persist();
  }
  $('#overBox').innerHTML = `<h2 class="kick" style="text-align:center;color:${win ? '#ffd84a' : '#ff8a8a'}">${win ? '🏆 ล่าบอสสำเร็จ!' : 'ล่าบอสล้มเหลว'}</h2>
    <p class="sub" style="text-align:center">${win ? 'ล้มบอสครบ 6 ตัวรวด' : `ไปได้ ${R.res.length}/${R.list.length} ตัว`}</p>
    <div class="bigdist">${fmtT(R.total)}<small> รวม</small></div>${nb ? '<div class="newbest">★ สถิติใหม่!</div>' : ''}
    <div class="rrows">${R.list.map((id, i) => { const x = R.res[i]; return `<div class="rrow ${x ? '' : 'lock'}"><span class="rid">${PLAT.levelLabel(id)}</span><b>${esc(bossName(id))}</b><span class="rk ${x ? x.grade : ''}">${x ? x.grade : '✗'}</span><small>${x ? '⏱ ' + fmtT(x.frames) + ' · โดนตี ' + x.hits : ''}</small></div>`; }).join('')}</div>
    ${win ? '<div class="reward">🪙 +500</div>' : ''}
    <div class="menu" style="margin-top:6px"><button class="btn red" data-x="again">⟲ ล่าใหม่</button><button class="btn" data-x="rushm">⚔️ หน้าล่าบอส</button><button class="btn" data-x="menu">🏠 เมนูหลัก</button></div>`;
  bindX('#overBox', { again: () => { A().quitGame(); startRush(); }, rushm: () => { A().quitGame(); A().show('rush'); }, menu: () => { A().quitGame(); A().show('title'); } });
  A().show('over');
}

/* ------------------------------------------------------------------ BOONS (in-run) */
function showBoons(d) {
  const g = app.game; if (!g) return;
  const card = id => { const b = M.BOONS[id], lv = (g.boons[id] || 0) + 1;
    return `<button class="boon ${b.duo ? 'duo' : ''}" data-boon="${id}" style="--bc:${b.col}"><em>${b.icon}</em><b>${b.name}</b><span class="lv">${b.duo ? 'DUO · ' + b.duo.map(k => M.BOONS[k].icon).join('+') : lv > 1 ? 'Lv ' + (lv - 1) + ' → ' + lv : 'ใหม่'}</span><p>${b.desc(lv)}</p></button>`; };
  const owned = Object.entries(g.boons || {}).map(([id, l]) => `<span title="${M.BOONS[id].name}">${M.BOONS[id].icon}${l > 1 ? '<sub>' + l + '</sub>' : ''}</span>`).join('');
  $('#boonBox').innerHTML = `<h2 class="kick" style="text-align:center">เลือกพร 1 อย่าง</h2><p class="sub" style="text-align:center">พรอยู่จนจบรอบนี้ · พรบางคู่รวมกันเป็น <b style="color:#ffd84a">DUO</b> สุดโกง</p>
    <div class="boons">${d.choices.map(card).join('')}</div>${owned ? `<div class="owned">มีแล้ว: ${owned}</div>` : ''}`;
  $$('#boonBox [data-boon]').forEach(b => b.onclick = () => { if (!app.game) return; app.game.takeBoon(b.dataset.boon); input.reset('boon'); A().show('game'); });
  A().show('boon');
}

/* ------------------------------------------------------------------ game events */
app.onEvent = (type, d) => {
  if (type === 'boon') showBoons(d);
  else if (type === 'rushWin') {
    const R = app.rushRun; if (!R) { return; }
    const grade = M.grade(d.hits, d.frames); R.res.push({ id: d.levelId, frames: d.frames, hits: d.hits, grade }); R.total += d.frames; R.hits += d.hits;
    M.medal(d.levelId, grade, d.frames);
    R.hp = Math.min(d.maxHp, d.hp + Math.round(d.maxHp * .3)); R.i++;
    if (R.i >= R.list.length) { rushEnd(true); return; }
    A().toast(`เกรด ${grade} · ⏱ ${fmtT(d.frames)}`, `บอสถัดไป: ${bossName(R.list[R.i])}`);
    setTimeout(() => { if (app.rushRun === R) rushStep(); }, 1500);
  }
  else if (type === 'rushDead') rushEnd(false);
};

/* ------------------------------------------------------------------ settings: music + assist */
function setupSettings2() {
  const sl = $('#setMusic'); sl.value = S.data.settings.music == null ? 45 : S.data.settings.music;
  sl.addEventListener('input', () => { S.data.settings.music = +sl.value; S.persist(); if (bgm) bgm.volume = musicVol() * .6; if (BM.on) bmFade(bmLevel(), .1); if (+sl.value === 0) music(false); else music(true); });
  const seg = (el, key) => { const sync = () => $$(`#${el} button`).forEach(b => b.classList.toggle('on', String(M.assist()[key]) === b.dataset.v));
    $$(`#${el} button`).forEach(b => b.addEventListener('click', () => { M.assist()[key] = +b.dataset.v; S.persist(); sync(); PLAT.sfx.select(); })); sync(); };
  seg('setAsSpeed', 'speed'); seg('setAsDmg', 'dmg');
}

/* ------------------------------------------------------------------ helpers */
function bindX(root, map) {
  $$(root + ' [data-x]').forEach(b => b.onclick = () => { PLAT.sfx.select(); const k = b.dataset.x; if (k === 'back') A().go('back'); else if (map[k]) map[k](); });
}

app.onBoot = () => {
  M.missions(); loadBackdrops(); setupSettings2();
  app.pendingStreak = M.checkLogin();                       // shown the next time the title screen is up (never over another screen)
};
})();
