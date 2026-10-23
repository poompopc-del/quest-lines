/* ==========================================================================
   PLATFORM MODE · story player (v121) — "ห้าตะเกียงแห่งนาม"
   --------------------------------------------------------------------------
   Plays the scenes in story-data.js at the right moments (first time only; the journal replays them):
     before a level   prologue (first level) → chapter intro (first level of a world) → level intro
     a boss appears   its "pre" lines (never in boss rush / endless)
     level cleared    the boss's "post" lines → chapter outro (last level of a world) → ending + credits (6-2)
     💎 picked up      a memory fragment (a note at the top, the game keeps running)
     villager saved   what they remember (a note)
   📖 Journal screen: replay every scene you have seen, read the memory fragments you found, and RESET THE STORY
   (levels lock again; coins, heroes, talents, achievements and records stay).
   Seen flags + fragments live in save.data.meta.story.
   ========================================================================== */
(function () {
'use strict';
const PLAT = window.PLAT, S = PLAT.save, M = PLAT.meta, app = PLAT.app, ST = PLAT.STORY;
if (!ST) return;
const A = () => app.api, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
Object.assign(app.SCREENS, { story: 'sStory', journal: 'sJournal' });
app.subScreens.add('journal');

/* ------------------------------------------------------------------ save */
function sd() {
  const m = M.d(); const s = m.story || (m.story = { seen: {}, frags: {} });
  if (!s.frags) s.frags = {}; if (!s.seen) s.seen = {};
  if (!s.migrated) {                                   // gems found before v121 already count as fragments
    s.migrated = true;
    for (const id of PLAT.LEVEL_ORDER) { const r = S.level(id); if (r && r.gems && r.gems.length) s.frags[id] = [...new Set([...(s.frags[id] || []), ...r.gems])]; }
  }
  return s;
}
const seen = k => !!sd().seen[k];
const mark = k => { sd().seen[k] = 1; S.persist(); };
const worldOf = id => PLAT.WORLDS.find(w => w.levels.includes(id));
// v125 TRUE ending: every memory fragment of the main story (worlds 1-6) + the ending seen
function fragCount() { const s = sd(); let got = 0, all = 0; for (const id of PLAT.LEVEL_ORDER) { const F = ST.gems[id]; if (!F) continue; all += F.length; got += (s.frags[id] || []).filter(i => i < F.length).length; } return { got, all }; }
function trueOpen() { const f = fragCount(); return seen('ending') && f.got >= f.all; }

/* ------------------------------------------------------------------ the scene player */
let cur = null;
const FACE = { narr: '📜', hero: '⚔️', aqua: '💧', garg: '🔔', dragon: '🔥', wizard: '🌿', snail: '⚙️', serpent: '🐉', scribe: '🖋️', arun: '🌅' };
function play(lines, o) {
  o = o || {};
  if (!lines || !lines.length) return Promise.resolve();
  return new Promise(done => {
    cur = { lines, i: 0, n: 0, done, title: o.title || '', sub: o.sub || '', last: 0, t0: performance.now() };
    $('#stCredits').classList.remove('on'); $('#sStory').classList.remove('credits'); $('#stBox').style.display = ''; $('#stNext').textContent = 'ต่อ ▶';
    $('#stTitle').innerHTML = cur.title ? `<b>${esc(cur.title)}</b>${cur.sub ? `<small>${esc(cur.sub)}</small>` : ''}` : '';
    $('#stTitle').classList.toggle('on', !!cur.title);
    A().show('story'); line();
    setTimeout(() => { const b = $('#stNext'); if (b && app.screen === 'story') b.focus({ preventScroll: true }); }, 40);
  });
}
function line() {
  const L = cur.lines[cur.i], sp = ST.speakers[L.who] || {}, hero = L.who === 'hero';
  const name = hero ? (PLAT.HEROES[(app.game && app.game.heroId) || S.data.hero] || {}).name || 'นักเดินทาง' : sp.name || '';
  $('#stName').textContent = name; $('#stName').style.color = sp.col || '#ffd84a';
  $('#stBox').classList.toggle('narr', L.who === 'narr');
  $('#stBox').classList.toggle('lumi', L.who === 'lumi');
  cur.n = 0; cur.text = L.t; $('#stText').textContent = '';
  $('#stStep').textContent = `${cur.i + 1}/${cur.lines.length}`;
  if (L.who !== 'narr' && L.who !== 'hero' && L.who !== 'lumi') PLAT.sfx.select && PLAT.sfx.select();
}
function next() {
  if (!cur) return; const now = performance.now(); if (now - cur.last < 160) return; cur.last = now;
  if (cur.credits) { endScene(); return; }
  if (cur.n < cur.text.length) { cur.n = cur.text.length; $('#stText').textContent = cur.text; return; }   // first press: show the whole line
  cur.i++;
  if (cur.i >= cur.lines.length) endScene(); else line();
}
function endScene() { const c = cur; cur = null; $('#sStory').classList.remove('credits'); $('#stCredits').classList.remove('on'); if (c) c.done(); }
function skip() { if (!cur) return; cur.i = cur.lines.length; endScene(); }
// typewriter + portrait (only while the scene screen is up)
let faceT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!cur || app.screen !== 'story') return;
  if (!cur.credits && cur.n < cur.text.length) { cur.n = Math.min(cur.text.length, cur.n + 1.6); $('#stText').textContent = cur.text.slice(0, Math.floor(cur.n)); }
  if (!cur.credits) drawFace(cur.lines[cur.i].who, now);
}
requestAnimationFrame(frame);
let heroSh = null;
function drawFace(who, now) {
  const cv = $('#stFace'); if (!cv) return; const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, t = now / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  if (who === 'narr') { cv.style.display = 'none'; return; } cv.style.display = '';
  if (who === 'lumi') {                                  // the last spark: a breathing firefly light
    const r = W * .16 + Math.sin(t * 3) * 2, x = W / 2 + Math.sin(t * 1.3) * 4, y = H / 2 + Math.cos(t * 1.7) * 4;
    const gr = ctx.createRadialGradient(x, y, 1, x, y, W * .48); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(.25, 'rgba(232,255,138,.85)'); gr.addColorStop(1, 'rgba(232,255,138,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; const fl = Math.sin(t * 22) * .3 + .7;
    ctx.beginPath(); ctx.ellipse(x - r * .9, y - r * .5, r * .9, r * .45 * fl, -.5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * .9, y - r * .5, r * .9, r * .45 * fl, .5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 6.283); ctx.fill();
    return;
  }
  let sh = null, ink = false, sc = 1;
  const g = app.game;
  if (who === 'hero') { sh = (g && g.heroSheet) || heroSh; if (!sh && !drawFace.req) { drawFace.req = true; A().heroSheet(S.data.hero).then(s => { heroSh = s; drawFace.req = false; }); } }
  else if (g && g.sheets) { const k = who === 'arun' ? 'scribe' : who; sh = g.sheets.get(k + ':2') && k === 'wizard' ? g.sheets.get(k + ':2') : g.sheets.get(k); ink = who === 'scribe' || who === 'inkdragon'; }
  const fr = sh && (sh.frames('idle') || sh.frames('move') || [])[Math.floor(t * 6) % ((sh.frames('idle') || sh.frames('move') || [1]).length)];
  const b = fr && sh.bounds && sh.bounds(fr);
  if (fr && b && PLAT.assets.img(fr.src)) {
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0; sc = Math.min((W - 10) / bw, (H - 10) / bh);
    if (who === 'snail' || who === 'dragon' || who === 'serpent') sc = Math.min(sc, (W - 6) / bw);
    PLAT.viewScale = 1;
    const face = who === 'hero' ? 1 : -1, x = W / 2 - (b.x0 + bw / 2) * sc * (face < 0 ? -1 : 1), y = H / 2 - (b.y0 + bh / 2) * sc;
    PLAT.drawFrame(ctx, fr, x, y, face, sc, { ink, smooth: sc < 1.5 });
    return;
  }
  ctx.font = `${Math.round(H * .55)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(FACE[who] || '❔', W / 2, H / 2 + 4);
}
function credits() {
  return new Promise(done => {
    cur = { credits: true, done, last: performance.now() + 1500, lines: [] };
    $('#stBox').style.display = 'none'; $('#stTitle').classList.remove('on');
    const c = $('#stCredits');
    c.innerHTML = `<div class="roll"><h2>${esc(ST.title)}</h2>${ST.credits.map(([h, ...v]) => `<h3>${esc(h)}</h3>${v.map(x => `<p>${esc(x)}</p>`).join('')}`).join('')}<h2 class="fin">🏮</h2></div>`;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); $('#sStory').classList.add('credits');
    $('#stNext').textContent = 'ต่อ ▶';
    A().show('story');
  });
}
// controls: tap the box / ▶ = next · ⏭ = skip the scene · keys J K X Space Enter = next · Esc = skip
function bindPlayer() {
  $('#stNext').addEventListener('click', e => { e.stopPropagation(); next(); });
  $('#stSkip').addEventListener('click', e => { e.stopPropagation(); if (cur && cur.credits) endScene(); else skip(); });
  $('#sStory').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; next(); });
  addEventListener('keydown', e => {
    if (app.screen !== 'story' || !cur) return;
    if (['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyK', 'KeyX'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); next(); }
    else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); skip(); }
  }, true);
}

/* ------------------------------------------------------------------ when scenes play */
// back into the level after a scene (or straight to the next screen)
function resumeGame() { const g = app.game; if (!g) return; PLAT.input.reset('story'); app.acc = 0; app.last = performance.now(); A().show('game'); }
async function before(id) {
  const w = worldOf(id), W = w && ST.worlds[w.n];
  if (id === PLAT.LEVEL_ORDER[0] && !seen('prologue')) { mark('prologue'); await play(ST.prologue, { title: ST.title, sub: 'บทนำ' }); }
  if (W && id === w.levels[0] && !seen('w' + w.n + 'in')) { mark('w' + w.n + 'in'); await play(W.intro, { title: W.name }); }
  if (ST.levels[id] && !seen('L' + id)) { mark('L' + id); await play(ST.levels[id], { title: `${PLAT.levelLabel(id)} · ${PLAT.LEVELS[id].name}` }); }
}
app.storyBefore = id => before(id);
async function after(id) {
  const L = PLAT.LEVELS[id], w = worldOf(id), W = w && ST.worlds[w.n], B = L.boss && ST.bosses[L.boss];
  if (B && B.post && B.post.length && !seen('B' + L.boss + 'post')) { mark('B' + L.boss + 'post'); await play(B.post); }
  if (W && w.levels[w.levels.length - 1] === id && W.outro && W.outro.length && !seen('w' + w.n + 'out')) { mark('w' + w.n + 'out'); await play(W.outro, { title: W.name, sub: 'จบบท' }); }
  if (id === '6-2' && !seen('ending')) {
    mark('ending'); await play(ST.ending, { title: 'บทส่งท้าย', sub: 'รุ่งอรุณ' });
    await credits();
    M.track('storyEnd');
  }
  if (id === '7-2' && !seen('trueEnding')) {
    mark('trueEnding'); await play(ST.trueEnding, { title: 'รุ่งอรุณที่แท้จริง', sub: 'จบอย่างแท้จริง' });
    await credits();
    M.track('trueEnd');
  }
}
app.storyAfter = (id, cb) => { after(id).then(cb, e => { console.error(e); cb(); }); };
// a boss appears for the first time: its lines (not in boss rush / endless; the game waits)
const onBoss0 = app.onBoss;
app.onBoss = d => {
  if (onBoss0) onBoss0(d);
  const g = app.game;
  if (!d || !g || g.endlessWorld || g.rush || !g.spec.boss) return;
  const k = 'B' + g.spec.boss + 'pre', B = ST.bosses[g.spec.boss];
  if (!B || !B.pre || seen(k)) return;
  mark(k);
  setTimeout(() => { if (app.game === g && app.screen === 'game') play(B.pre).then(() => { if (app.game === g) resumeGame(); }); }, 650);
};
// 💎 memory fragments / villagers: a note at the top, the game keeps going
let noteT = 0;
function note(head, text, col) {
  const n = $('#stNote'); if (!n) return;
  n.innerHTML = `<b style="color:${col || '#9af0ff'}">${esc(head)}</b><span>${esc(text)}</span>`;
  n.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('on'), 4200 + text.length * 45);
}
app.storyNote = note;
const onEvent0 = app.onEvent;
app.onEvent = (type, d) => {
  const g = app.game;
  if (type === 'gem' && g && !g.endlessWorld && d && d.i != null) {
    const id = g.levelId, F = ST.gems[id];
    if (F && F[d.i]) { const s = sd(), a = s.frags[id] || (s.frags[id] = []); if (!a.includes(d.i)) { a.push(d.i); S.persist(); } note(`💎 ความทรงจำ ${d.n}/${d.of}`, F[d.i]); }
  } else if (type === 'villager' && g && g.levelId === 'town') {
    const t = ST.villagers[(d.n - 1) % ST.villagers.length]; if (t) note('🏠 ชาวบ้าน', t, '#8aff8a');
  }
  if (onEvent0) onEvent0(type, d);
};
const onShowGame0 = app.onShow.game;
app.onShow.game = () => { if (onShowGame0) onShowGame0(); };
['title', 'map', 'pause', 'dead', 'clear', 'over', 'loading', 'story', 'journal'].forEach(n => { const f = app.onShow[n]; app.onShow[n] = () => { if (f) f(); const e = $('#stNote'); if (e) e.classList.remove('on'); }; });
// the map shows each world's chapter
const onMap0 = app.onShow.map;
app.onShow.map = () => {
  if (onMap0) onMap0();
  $$('#worlds .world').forEach((el, i) => { const w = PLAT.WORLDS[i], W = w && ST.worlds[w.n]; if (!W || el.querySelector('.chap')) return; const c = document.createElement('div'); c.className = 'chap'; c.textContent = '📖 ' + W.name; el.querySelector('.wn').after(c); });
};

/* ------------------------------------------------------------------ 📖 JOURNAL */
let jTab = 'scenes', confirmReset = false;
function scenes() {
  const out = [{ k: 'prologue', name: 'บทนำ · ' + ST.title, lines: ST.prologue }];
  for (const w of PLAT.WORLDS) {
    const W = ST.worlds[w.n]; if (!W) continue;
    out.push({ k: 'w' + w.n + 'in', name: W.name, lines: W.intro, head: true });
    for (const id of w.levels) {
      if (ST.levels[id]) out.push({ k: 'L' + id, name: `${PLAT.levelLabel(id)} · ${PLAT.LEVELS[id].name}`, lines: ST.levels[id] });
      const b = PLAT.LEVELS[id].boss, B = b && ST.bosses[b];
      if (B && B.pre) out.push({ k: 'B' + b + 'pre', name: `⚔ ${ST.speakers[b] ? ST.speakers[b].name : PLAT.BOSSES[b].th} ปรากฏตัว`, lines: B.pre });
      if (B && B.post && B.post.length) out.push({ k: 'B' + b + 'post', name: `🕯 ${ST.speakers[b] ? ST.speakers[b].name : PLAT.BOSSES[b].th} หลับใหล`, lines: B.post });
    }
    if (W.outro && W.outro.length) out.push({ k: 'w' + w.n + 'out', name: 'จบ' + W.name.replace(/^บท(ที่ \d+|สุดท้าย)/, m => m), lines: W.outro });
  }
  out.push({ k: 'ending', name: '🌅 บทส่งท้าย · รุ่งอรุณ', lines: ST.ending, end: true });
  if (ST.trueEnding) out.push({ k: 'trueEnding', name: '✨ รุ่งอรุณที่แท้จริง', lines: ST.trueEnding, end: true });
  return out;
}
function renderJournal() {
  const s = sd(), box = $('#journalBox');
  const all = scenes(), got = all.filter(x => seen(x.k)).length;
  const fragN = Object.values(s.frags).reduce((n, a) => n + a.length, 0), fragAll = Object.values(ST.gems).reduce((n, a) => n + a.length, 0);
  let body = '';
  if (jTab === 'scenes') {
    body = `<div class="jlist">${all.map((x, i) => seen(x.k)
      ? `<button class="jrow ${x.head ? 'head' : ''}" data-scene="${i}"><span>${esc(x.name)}</span><em>▶ ดูอีกครั้ง</em></button>`
      : `<div class="jrow lock ${x.head ? 'head' : ''}"><span>🔒 ${x.head ? esc(x.name) : '???'}</span></div>`).join('')}</div>`;
  } else if (jTab === 'frags') {
    body = `<p class="sub">💎 แต่ละเม็ดคือเศษความทรงจำของโลกที่ถูกลบ — เก็บให้ครบเพื่อรู้เรื่องราวทั้งหมด</p><div class="jfrags">${PLAT.LEVEL_ORDER.filter(id => ST.gems[id]).map(id => {
      const a = s.frags[id] || [];
      return `<div class="jfrag"><b>${PLAT.levelLabel(id)} · ${esc(PLAT.LEVELS[id].name)} <small>${a.length}/${ST.gems[id].length}</small></b>${ST.gems[id].map((t, i) => a.includes(i) ? `<p>💎 ${esc(t)}</p>` : '<p class="lock">💎 ??? — ยังไม่พบ</p>').join('')}</div>`; }).join('')}</div>`;
  } else {
    body = `<div class="jreset"><p>เริ่มเนื้อเรื่อง <b>"${esc(ST.title)}"</b> ใหม่ตั้งแต่บทนำ</p>
      <ul><li>ด่านในโหมดเนื้อเรื่องจะล็อกใหม่ · แรงก์ / เวลา / 💎 ในด่านเริ่มใหม่</li><li>ฉากเนื้อเรื่องจะเล่นใหม่ทั้งหมด</li>
      <li style="color:#8aff8a">เก็บไว้: เหรียญ ทอง ไอเทม ฮีโร่ที่ปลดล็อกแล้ว พรสวรรค์ ความสำเร็จ ฉายา สถิติโหมดไม่สิ้นสุด / ล่าบอส และเศษความทรงจำในสมุดนี้</li></ul>
      <button class="btn red" data-x="reset">${confirmReset ? '⚠ กดอีกครั้งเพื่อยืนยัน — เริ่มใหม่จริงๆ' : '↺ เริ่มเนื้อเรื่องใหม่'}</button>${confirmReset ? '<button class="btn" data-x="noreset">ยกเลิก</button>' : ''}</div>`;
  }
  box.innerHTML = `<h2 class="kick">📖 ตำนาน · ${esc(ST.title)}</h2>
    <p class="sub">ฉากที่ดูแล้ว ${got}/${all.length} · ความทรงจำ 💎 ${fragN}/${fragAll}</p>
    <div class="tabs"><button class="btn ${jTab === 'scenes' ? 'on' : ''}" data-x="tScenes">🎬 ฉาก</button><button class="btn ${jTab === 'frags' ? 'on' : ''}" data-x="tFrags">💎 ความทรงจำ</button><button class="btn ${jTab === 'reset' ? 'on' : ''}" data-x="tReset">↺ เริ่มใหม่</button></div>
    ${body}
    <div class="menu" style="margin-top:8px"><button class="btn" data-x="back">← กลับ</button></div>`;
  $$('#journalBox [data-scene]').forEach(b => b.onclick = () => {
    const x = all[+b.dataset.scene]; PLAT.sfx.select();
    const p = play(x.lines, { title: x.name }).then(() => x.end ? credits() : null);
    p.then(() => A().show('journal'));
  });
  $$('#journalBox [data-x]').forEach(b => b.onclick = () => {
    PLAT.sfx.select(); const k = b.dataset.x;
    if (k === 'back') { confirmReset = false; A().go('back'); return; }
    if (k === 'tScenes') jTab = 'scenes'; else if (k === 'tFrags') jTab = 'frags'; else if (k === 'tReset') jTab = 'reset';
    else if (k === 'noreset') confirmReset = false;
    else if (k === 'reset') { if (!confirmReset) confirmReset = true; else { confirmReset = false; resetStory(); A().toast('↺ เริ่มเนื้อเรื่องใหม่แล้ว', 'ไปที่ "เนื้อเรื่อง" เพื่อเริ่มบทนำ'); jTab = 'scenes'; } }
    renderJournal();
  });
}
function resetStory() {
  const m = M.d(), kept = new Set(m.keptHeroes || []);
  for (const id of PLAT.HERO_ORDER || []) { const need = PLAT.HERO_UNLOCK && PLAT.HERO_UNLOCK[id]; if (need && S.level(need) && S.level(need).cleared) kept.add(id); }   // heroes you unlocked stay unlocked
  m.keptHeroes = [...kept];
  const s = sd(); s.seen = {}; s.resets = (s.resets || 0) + 1;
  S.data.levels = {};
  S.persist();
}
app.onShow.journal = () => { confirmReset = false; renderJournal(); };
const go20 = app.go2;
app.go2 = where => { if (where === 'journal') { A().show('journal', true); return true; } return go20 ? go20(where) : false; };

/* ------------------------------------------------------------------ title tile */
function refreshTile() {
  const t = $('#tJournal'); if (!t) return;
  const all = scenes(); t.textContent = seen('ending') ? '🏮 จบแล้ว · ดูซ้ำได้' : `ฉาก ${all.filter(x => seen(x.k)).length}/${all.length}`;
}
const onTitle0 = app.onShow.title;
app.onShow.title = () => { if (onTitle0) onTitle0(); refreshTile(); };

const boot0 = app.onBoot;
app.onBoot = () => { if (boot0) boot0(); sd(); bindPlayer(); refreshTile(); };
app.story = { play, credits, before, after, seen, sd, resetStory, scenes, trueOpen, fragCount };
})();
