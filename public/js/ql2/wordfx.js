/* ==========================================================================
   QUEST LINES v26 — WORD STREAK · WORD MASTERY (per hero)
   Presentation + record-keeping only. The combo itself (and its damage
   bonus: v44 +5% per word, max +25% — BALANCE.COMBO_*) is the original system;
   this file just makes it visible and short-lived:
     · a small "🔥 WORD STREAK ×n · +x% DMG" chip that appears from 2 words
     · a quick GOOD! / GREAT! / AMAZING! / PERFECT! pop that fades by itself
   and keeps a few per-hero numbers for the Heroes screen:
     words typed · perfect words (no letters removed, no hint) · best streak
     · longest word. Stored in save.v2.wm — nothing existing is changed.
   ========================================================================== */
const WS = { tiers:[ null, 'GOOD!', 'GREAT!', 'AMAZING!', 'PERFECT!' ] };
const streakBonus = c=>Math.round(BALANCE.comboBonus(c)*100);   // mirrors evalWord (BALANCE.comboBonus)

/* ------------------------------ per-hero word mastery ------------------------------ */
function wmOf(id){
  const V = V2(); V.wm = V.wm || {};
  const k = id || save.eq.char;
  V.wm[k] = Object.assign({ n:0, perfect:0, best:0, longest:0, lw:'' }, V.wm[k]||{});
  return V.wm[k];
}
// every successful non-rude word passes through addMastery exactly once (called synchronously inside doAttack)
addMastery = (f=>function(w){
  const r = f.apply(this, arguments);
  try{
    if(w && !RUDE.has(w) && ui.bat){
      const M = wmOf(), b = ui.bat;
      M.n++;
      if(!b.wmEdit) M.perfect++;
      if(w.length > M.longest){ M.longest = w.length; M.lw = w; }
      M.best = Math.max(M.best, (b.combo||0) + 1);
    }
  }catch(e){ console.error(e); }
  return r;
})(addMastery);
// a word stops being "perfect" as soon as a letter is taken back or a hint is used
const wmEdited = ()=>{ if(ui.bat && ui.screen==='battle') ui.bat.wmEdit = true; };
document.addEventListener('click', ev=>{
  const el = ev.target.closest && ev.target.closest('[data-act]'); if(!el || !ui.bat || ui.screen!=='battle') return;
  const a = el.dataset.act;
  if(a==='untray' || a==='clearSel' || a==='hint') wmEdited();
  else if(a==='tile'){ const t = ui.bat.tiles[+el.dataset.i]; if(t && t.sel) wmEdited(); }
}, true);
document.addEventListener('keydown', e=>{ if(e.key==='Backspace' && ui.bat && ui.screen==='battle' && !ui.pz && ui.bat.sel.length) wmEdited(); }, true);
// the edit flag belongs to one word: clear it once the attack has been sent
doAttack = (f=>function(){
  const b = ui.bat;
  const p = f.apply(this, arguments);
  if(b && ui.bat===b) b.wmEdit = false;
  return p;
})(doAttack);

/* ------------------------------ streak chip + feedback ------------------------------ */
function wsEnsure(){
  const st = $('#stage'); if(!st || !ui.bat) return null;
  let c = $('#wsChip');
  if(!c){
    st.insertAdjacentHTML('beforeend', `<div class="ws-chip" id="wsChip" aria-live="polite" hidden><span class="ws-k">🔥 WORD STREAK</span><b class="ws-n"></b><span class="ws-pips"><i></i><i></i><i></i><i></i><i></i></span><em class="ws-b"></em></div>`);
    c = $('#wsChip');
  }
  return c;
}
function wsPop(txt, tier){
  if(save.settings.anim===false) return;
  const st = $('#stage'); if(!st) return;
  st.querySelectorAll('.ws-pop').forEach(x=>x.remove());
  const d = document.createElement('div'); d.className = `ws-pop t${tier}`; d.textContent = txt; d.setAttribute('aria-hidden', 'true');
  st.appendChild(d); setTimeout(()=>d.remove(), 1000);
}
function wsUpdate(){
  const b = ui.bat; if(!b || ui.screen!=='battle') return;
  const c = wsEnsure(); if(!c) return;
  const n = b.combo||0, last = b._wsLast||0;
  c.hidden = n < 2;
  if(n>=2){
    // sit just under the HUD row (its height differs between phone / desktop layouts)
    const hud = $('#stage .hud'); if(hud) c.style.top = (hud.offsetTop + hud.offsetHeight + 6) + 'px';
    c.querySelector('.ws-n').textContent = `×${n}`;
    c.querySelector('.ws-b').textContent = `+${streakBonus(n)}% DMG`;
    c.querySelectorAll('.ws-pips i').forEach((p,i)=>p.classList.toggle('on', i < Math.min(5,n)));
    c.classList.toggle('max', n>=5);
  }
  if(n > last){
    try{ const M = wmOf(); M.best = Math.max(M.best, n); }catch(e){}
    const w = (b.recent && b.recent[0] && b.recent[0].w) || '';
    let tier = n>=5 ? 4 : n>=4 ? 3 : n>=3 ? 2 : n>=2 ? 1 : 0;
    if(w.length>=7) tier = Math.min(4, Math.max(1, tier+1));
    if(tier) wsPop(WS.tiers[tier], tier);
    if(n>=2){ c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  b._wsLast = n;
}
updateHud = (f=>function(){ const r = f.apply(this, arguments); try{ wsUpdate(); }catch(e){} return r; })(updateHud);
