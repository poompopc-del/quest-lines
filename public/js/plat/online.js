/* ==========================================================================
   PLATFORM MODE · online (v129) — leaderboards + cloud save
   --------------------------------------------------------------------------
   Talks to the Vercel functions in /api (api/lb.js, api/save.js — storage: Upstash Redis, see README).
   Everything here is optional: if the API is missing / not configured / offline the game just says so and
   keeps working exactly as before. Boards:
     daily:YYYY-MM-DD  today's daily challenge score      endless:1..6  best endless score per world
     rush              boss rush total time (lower is better)
   The player is an anonymous random id (localStorage) + a display name (Settings).
   Cloud save: upload → a 10-character code; on another device "load from code" replaces the Platform save.
   ========================================================================== */
(function () {
'use strict';
const PLAT = window.PLAT, S = PLAT.save, app = PLAT.app, U = PLAT.U;
const A = () => app.api, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
Object.assign(app.SCREENS, { board: 'sBoard' }); app.subScreens.add('board');

const pid = (() => { try { let v = localStorage.getItem('ql_pid'); if (!/^[a-f0-9]{16}$/.test(v || '')) { v = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('ql_pid', v); } return v; } catch (e) { return '0000000000000000'; } })();
const name = () => (S.data.settings.lbName || '').trim() || 'ผู้กล้า-' + pid.slice(0, 4).toUpperCase();
let state = 'unknown';                                  // unknown · ok · off (not configured) · down (offline / error)
async function api(path, opts) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), 8000);
  try {
    const r = await fetch('api/' + path, Object.assign({ headers: { 'Content-Type': 'application/json' }, signal: ctl && ctl.signal }, opts || {}));
    const j = await r.json().catch(() => ({}));
    if (r.status === 503) { state = 'off'; return { off: true }; }
    state = r.ok ? 'ok' : state; return Object.assign({ status: r.status }, j);
  } catch (e) { state = 'down'; return { down: true }; } finally { clearTimeout(t); }
}
const why = r => r.off ? 'ยังไม่ได้เชื่อมฐานข้อมูลออนไลน์ (ผู้ดูแลต้องเปิด Upstash Redis ใน Vercel)' : r.down ? 'ออฟไลน์อยู่ หรือเซิร์ฟเวอร์ไม่ตอบ' : r.status === 429 ? 'ส่งถี่เกินไป ลองใหม่อีกสักครู่' : 'มีบางอย่างผิดพลาด';

/* ------------------------------------------------------------------ submit */
const sent = new Set();
async function submit(board, score, extra) {
  if (!(score > 0)) return null;
  const k = board + ':' + score; if (sent.has(k)) return null; sent.add(k);
  const r = await api('lb', { method: 'POST', body: JSON.stringify({ board, pid, name: name(), score: Math.round(score), hero: S.data.hero, extra }) });
  if (r.ok && r.rank) A().notify(`🏆 อันดับออนไลน์ #${r.rank}`, board.startsWith('daily') ? 'ท้าทายรายวันวันนี้' : board === 'rush' ? 'ล่าบอสต่อเนื่อง' : 'โหมดไม่สิ้นสุด โลก ' + board.split(':')[1]);
  return r;
}
// daily: after the result screen is drawn
const fd0 = app.finishDaily;
app.finishDaily = (r, dl) => {
  fd0(r, dl);
  submit('daily:' + dl.key, r.score, { d: r.dist, t: r.frames });
  const m = $('#overBox .menu'); if (m) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = '🏆 อันดับออนไลน์'; b.onclick = () => { PLAT.sfx.select(); openBoard('daily:' + dl.key); }; m.appendChild(b); }
};
// endless (not daily): when the game-over screen shows
const ov0 = app.onShow.over;
app.onShow.over = () => {
  if (ov0) ov0();
  const g = app.game; if (!g || !g.endlessWorld || g.daily || g.mode !== 'dead') return;
  const r = g.result(), key = g.seed + ':' + r.frames; if (g._lbSent === key) return; g._lbSent = key;
  submit('endless:' + g.endlessWorld, r.score, { d: r.dist, t: r.frames });
  const m = $('#overBox .menu'); if (m) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = '🏆 อันดับออนไลน์'; b.onclick = () => { PLAT.sfx.select(); openBoard('endless:' + g.endlessWorld); }; m.appendChild(b); }
};
// boss rush: a full clear posts its total time
app.onRushEnd = (win, R) => { if (win && R && R.total > 0) submit('rush', R.total, { g: R.res.map(x => x.grade).join('') }); };

/* ------------------------------------------------------------------ 🏆 board screen */
let cur = null;
function openBoard(board) { cur = board || cur || 'daily:' + PLAT.meta.daily().key; A().show('board', true); }
app.openBoard = openBoard;
const label = b => b.startsWith('daily') ? '📅 วันนี้' : b === 'rush' ? '⚔️ ล่าบอส' : '∞ โลก ' + b.split(':')[1];
const fmt = (b, v) => b === 'rush' ? U.fmtTime(v) : v.toLocaleString();
async function renderBoard() {
  const box = $('#boardBox'), today = 'daily:' + PLAT.meta.daily().key, tabs = [today, ...Object.keys(PLAT.ENDLESS_WORLDS).map(k => 'endless:' + k), 'rush'];
  if (!cur) cur = today;
  const head = `<div class="row" style="justify-content:space-between;align-items:center"><h2 class="kick">🏆 อันดับออนไลน์</h2><button class="btn" data-x="back">✕ ปิด</button></div>
    <p class="sub">ชื่อของคุณ: <b>${esc(name())}</b> · เปลี่ยนได้ใน ⚙️ ตั้งค่า · บันทึกคะแนนดีที่สุดของแต่ละคนอัตโนมัติ</p>
    <div class="tabs">${tabs.map(t => `<button class="btn ${t === cur ? 'on' : ''}" data-b="${t}">${label(t)}</button>`).join('')}</div>`;
  box.innerHTML = head + '<p class="sub">กำลังโหลด…</p>'; bind();
  const r = await api('lb?board=' + encodeURIComponent(cur) + '&pid=' + pid);
  if (app.screen !== 'board') return;
  let body;
  if (!r.top) body = `<div class="lbme">⚠️ ${why(r)}</div>`;
  else if (!r.top.length) body = '<div class="lbme">ยังไม่มีใครส่งคะแนน — เป็นคนแรกเลย!</div>';
  else body = `<div class="lbrows">${r.top.map(x => `<div class="lbrow ${x.me ? 'me' : ''}"><span class="rk">${x.rank <= 3 ? ['🥇', '🥈', '🥉'][x.rank - 1] : '#' + x.rank}</span><span><b>${esc(x.name)}</b>${x.hero && PLAT.HEROES[x.hero] ? `<small>${esc(PLAT.HEROES[x.hero].name)}</small>` : ''}${x.extra && x.extra.d ? `<small>${x.extra.d} ม.</small>` : ''}${x.extra && x.extra.g ? `<small>${esc(x.extra.g)}</small>` : ''}</span><span class="sc">${fmt(cur, x.score)}</span></div>`).join('')}</div>
    <div class="lbme">${r.me ? `อันดับของคุณ <b>#${r.me.rank}</b> จาก ${r.total} คน · ${fmt(cur, r.me.score)}` : `มีผู้เล่น ${r.total} คน — คุณยังไม่มีคะแนนในกระดานนี้`}</div>`;
  box.innerHTML = head + body; bind();
}
function bind() {
  $$('#boardBox [data-b]').forEach(b => b.onclick = () => { PLAT.sfx.select(); cur = b.dataset.b; renderBoard(); });
  $$('#boardBox [data-x]').forEach(b => b.onclick = () => { PLAT.sfx.select(); A().go('back'); });
}
app.onShow.board = renderBoard;
const go20 = app.go2;
app.go2 = w => { if (w === 'board') { openBoard(); return true; } return go20 ? go20(w) : false; };

/* ------------------------------------------------------------------ ⚙️ settings: name + cloud save */
let confirmLoad = null;
function cloudMsg(html) { const b = $('#cloudBox'); if (b) b.innerHTML = html; }
async function upload() {
  cloudMsg('กำลังอัปโหลด…');
  S.persist();
  const r = await api('save', { method: 'POST', body: JSON.stringify({ code: S.data.settings.cloudCode || '', data: S.data }) });
  if (!r.code) { cloudMsg('⚠️ ' + why(r)); return; }
  S.data.settings.cloudCode = r.code; S.persist();
  cloudMsg(`✅ อัปโหลดแล้ว · รหัสเซฟ <code>${r.code}</code> <button class="btn" id="cloudCopy">📋 คัดลอก</button><br><small>อัปโหลดครั้งต่อไปจะทับรหัสเดิม · อย่าให้คนอื่นเห็นรหัส</small>`);
  const c = $('#cloudCopy'); if (c) c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(r.code).then(() => A().notify('📋 คัดลอกรหัสแล้ว', r.code)).catch(() => {}); };
}
function askCode() {
  cloudMsg(`ใส่รหัสเซฟ: <input id="cloudCode" maxlength="10" placeholder="XXXXXXXXXX"> <button class="btn red" id="cloudGo">โหลด</button><br><small>⚠️ ความคืบหน้าในเครื่องนี้จะถูกแทนที่ด้วยเซฟจากรหัส</small>`);
  $('#cloudGo').onclick = download;
}
async function download() {
  const code = String(($('#cloudCode') || {}).value || '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) { A().notify('รหัสไม่ถูกต้อง', 'ต้องเป็นตัวอักษร/ตัวเลข 10 ตัว'); return; }
  if (confirmLoad !== code) { confirmLoad = code; $('#cloudGo').textContent = '⚠️ กดอีกครั้งเพื่อยืนยัน'; return; }
  confirmLoad = null; cloudMsg('กำลังโหลด…');
  const r = await api('save?code=' + code);
  if (!r.data) { cloudMsg('⚠️ ' + (r.status === 404 ? 'ไม่พบเซฟของรหัสนี้' : why(r))); return; }
  try {
    const d = r.data; d.settings = Object.assign({}, d.settings || {}, { cloudCode: code });
    localStorage.setItem('ql_platform_v1', JSON.stringify(d));
    cloudMsg('✅ โหลดเซฟแล้ว — กำลังเริ่มใหม่…'); setTimeout(() => location.reload(), 700);
  } catch (e) { cloudMsg('⚠️ บันทึกลงเครื่องไม่สำเร็จ'); }
}
function setupSettings() {
  const inp = $('#setLbName'); if (!inp) return;
  inp.value = S.data.settings.lbName || ''; inp.placeholder = name();
  $('#setLbSave').onclick = () => { S.data.settings.lbName = inp.value.trim().slice(0, 16); S.persist(); PLAT.sfx.select(); A().notify('🏷 บันทึกชื่อแล้ว', name()); };
  $('#cloudUp').onclick = () => { PLAT.sfx.select(); upload(); };
  $('#cloudDown').onclick = () => { PLAT.sfx.select(); askCode(); };
  if (S.data.settings.cloudCode) cloudMsg(`รหัสเซฟของเครื่องนี้: <code>${S.data.settings.cloudCode}</code>`);
}
const st0 = app.onShow.settings;
app.onShow.settings = () => { if (st0) st0(); const i = $('#setLbName'); if (i) { i.value = S.data.settings.lbName || ''; i.placeholder = name(); } };
const boot0 = app.onBoot;
app.onBoot = () => { if (boot0) boot0(); setupSettings(); };
app.online = { submit, api, pid, name, state: () => state };
})();
