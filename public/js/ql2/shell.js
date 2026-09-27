/* ==========================================================================
   QUEST LINES 2.0 — SHELL
   New main navigation (Hub · World · Heroes · Inventory · Codex · Profile),
   top bar with Adventure Level, ⚙️ settings overlay, screen transitions and
   the action router. Replaces the old 4-tab render() but keeps its actions.
   ========================================================================== */

/* ------------------------------ icons ------------------------------ */
const IC2 = (()=>{
  const o = '#07060d', sw = 'stroke="#07060d" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  const s = (b)=>`<svg viewBox="0 0 40 40" class="ico" aria-hidden="true">${b}</svg>`;
  return {
    hub: s(`<path d="M5,36 L5,16 L10,16 L10,11 L14,11 L14,16 L17,16 L17,8 L20,4 L23,8 L23,16 L26,16 L26,11 L30,11 L30,16 L35,16 L35,36 Z" fill="#5a4e9a" ${sw}/><path d="M16,36 L16,27 Q20,22 24,27 L24,36 Z" fill="#ffc83d" ${sw}/><path d="M20,4 L20,1 L25,2.5 L20,4" fill="#ff3b4e" stroke="${o}" stroke-width="1.4"/><rect x="9" y="21" width="3" height="4" fill="#ffe3a3"/><rect x="28" y="21" width="3" height="4" fill="#ffe3a3"/>`),
    world: s(`<circle cx="20" cy="20" r="15" fill="#2f6fd0" ${sw}/><path d="M9,14 Q14,11 16,15 Q15,20 11,21 Q8,19 9,14 Z M21,9 Q27,8 30,13 Q27,17 23,15 Q20,12 21,9 Z M19,24 Q25,22 29,26 Q26,32 21,31 Q18,28 19,24 Z" fill="#5fd07a" stroke="${o}" stroke-width="1.4"/><path d="M8,26 Q20,31 33,23" stroke="#ffe3a3" stroke-width="1.6" fill="none" stroke-dasharray="2 2.5"/>`),
    heroes: s(`<path d="M8,32 L27,9 L31,8 L30,12 L11,35 Z" fill="#dfe8ff" ${sw}/><path d="M32,32 L13,9 L9,8 L10,12 L29,35 Z" fill="#dfe8ff" ${sw}/><path d="M6,29 L12,35 M34,29 L28,35" stroke="#ffc83d" stroke-width="4" stroke-linecap="round"/><path d="M6,29 L12,35 M34,29 L28,35" stroke="${o}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`),
    bag: s(`<path d="M13,13 Q13,5 20,5 Q27,5 27,13" fill="none" stroke="${o}" stroke-width="3"/><path d="M6,15 Q6,11 11,11 L29,11 Q34,11 34,15 L33,32 Q33,36 28,36 L12,36 Q7,36 7,32 Z" fill="#b8642e" ${sw}/><path d="M7,19 Q20,24 33,19" stroke="${o}" stroke-width="2" fill="none"/><rect x="17" y="19" width="6" height="7" rx="1.5" fill="#ffc83d" ${sw}/>`),
    book: s(`<path d="M5,9 Q12,6 20,10 Q28,6 35,9 L35,33 Q28,30 20,34 Q12,30 5,33 Z" fill="#7a3aa8" ${sw}/><path d="M20,10 L20,34" stroke="${o}" stroke-width="2"/><path d="M8,12 Q13,10 17,12 M8,16 Q13,14 17,16 M23,12 Q27,10 32,12" stroke="#ffe3a3" stroke-width="1.6" fill="none"/><circle cx="27" cy="21" r="3.2" fill="#ffc83d" stroke="${o}" stroke-width="1.4"/>`),
    trophy: s(`<path d="M11,5 L29,5 L28,16 Q27,25 20,26 Q13,25 12,16 Z" fill="#ffc83d" ${sw}/><path d="M11,8 Q4,8 5,13 Q6,18 12,18 M29,8 Q36,8 35,13 Q34,18 28,18" fill="none" stroke="${o}" stroke-width="2.4"/><path d="M17,26 L23,26 L24,31 L16,31 Z" fill="#d68a12" ${sw}/><rect x="12" y="31" width="16" height="5" rx="1.5" fill="#5a4e9a" ${sw}/><path d="M16,9 L16,15" stroke="#fff6d8" stroke-width="2" stroke-linecap="round"/>`),
    scroll: s(`<path d="M9,7 L29,7 Q33,7 33,11 L33,29 Q33,33 29,33 L13,33" fill="#f3e2b8" ${sw}/><path d="M9,7 Q5,7 5,11 Q5,14 9,14 L13,14 L13,33 Q9,33 9,29" fill="#e0c890" ${sw}/><path d="M17,14 L29,14 M17,19 L29,19 M17,24 L25,24" stroke="#8a5a2a" stroke-width="2" stroke-linecap="round"/>`),
    pin: s(`<path d="M20,37 Q8,23 8,15 Q8,4 20,4 Q32,4 32,15 Q32,23 20,37 Z" fill="#ff3b4e" ${sw}/><circle cx="20" cy="15" r="5" fill="#fff6d8" stroke="${o}" stroke-width="1.8"/>`),
    tower: s(`<path d="M12,37 L14,14 L11,14 L20,3 L29,14 L26,14 L28,37 Z" fill="#3a4e86" ${sw}/><rect x="18" y="18" width="4" height="6" rx="2" fill="#ffd27a"/><rect x="18" y="28" width="4" height="5" rx="2" fill="#ffd27a"/><circle cx="31" cy="8" r="4" fill="#eafcff"/>`),
    play: s(`<path d="M12,6 L33,20 L12,34 Z" fill="#fff6d8" ${sw}/>`),
    back: s(`<path d="M25,6 L11,20 L25,34" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`),
    next: s(`<path d="M15,6 L29,20 L15,34" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`),
    close: s(`<path d="M10,10 L30,30 M30,10 L10,30" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>`),
    anvil: s(`<path d="M6,12 L30,12 Q36,12 36,17 L26,19 L26,24 L30,30 L10,30 L14,24 L14,19 Q6,18 6,12 Z" fill="#8a96a3" ${sw}/><path d="M9,14 L28,14" stroke="#dfe8ff" stroke-width="1.6"/><path d="M29,6 L33,2 M33,8 L37,6" stroke="#ffc83d" stroke-width="2.2" stroke-linecap="round"/>`),
    gate: s(`<path d="M6,37 L6,14 Q6,4 20,4 Q34,4 34,14 L34,37 Z" fill="#433b6b" ${sw}/><path d="M11,37 L11,16 Q11,9 20,9 Q29,9 29,16 L29,37 Z" fill="#3ee0ff" opacity=".85" stroke="${o}" stroke-width="2"/><path d="M14,30 Q20,14 26,30" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/>`),
    star: s(`<path d="M20,3 L25,14 L37,15 L28,23 L31,35 L20,29 L9,35 L12,23 L3,15 L15,14 Z" fill="#ffc83d" ${sw}/>`),
  };
})();

/* ------------------------------ screens ------------------------------ */
const SCREENS = {};           // filled by the screen modules: { render, nav, title? }
const NAV = [
  { k:'hub',       th:'ฐาน',       ic:()=>IC2.hub },
  { k:'world',     th:'โลก',       ic:()=>IC2.world },
  { k:'heroes',    th:'ฮีโร่',      ic:()=>IC2.heroes },
  { k:'inventory', th:'กระเป๋า',    ic:()=>IC2.bag },
  { k:'codex',     th:'โคเด็กซ์',   ic:()=>IC2.book },
  { k:'profile',   th:'โปรไฟล์',   ic:()=>IC2.trophy },
];
const ALIAS = { map:'hub', shop:'inventory', hero:'heroes', settings:'hub' };
const navIndex = k=>{ const S = SCREENS[k]; const n = (S && S.nav) || k; return NAV.findIndex(x=>x.k===n); };

// what to point at: small dots on nav items
function navBadges(){
  const b = {};
  try{
    const u = UP(), id = save.eq.char;
    const cheapUp = Math.min(...Object.entries(UPS).filter(([k,U])=>u[k]<U.max).map(([k,U])=>U.cost(u[k])));
    const lockedHero = CHARACTERS.some(c=>!save.chars.includes(c.id) && save.gold>=c.price);
    if(save.gold>=cheapUp || lockedHero) b.heroes = '!';
    const curAtk = curWp().atk, curBlk = AR(save.eq.armor).block;
    if(WEAPONS.some(w=>!save.weapons.includes(w.id) && !(typeof wpLocked==='function' && wpLocked(w)) && w.atk>curAtk && save.gold>=w.price && id!=='boomtos') || ARMORS.some(a=>!save.armors.includes(a.id) && a.block>curBlk && save.gold>=a.price)) b.inventory = '!';
    const adv = advUnclaimed(); if(adv) b.profile = adv;
  }catch(e){}
  return b;
}

function topbar(){
  const V = V2(), A = advInfo(V.adv.xp), q = claimableCount(), fr = FRAMES[V.frames.eq] || FRAMES.basic;
  const badge = (typeof egBadge==='function') ? egBadge() : '';
  return `<header class="q2-top">
    <button class="q2-me" data-act="go" data-v="profile" aria-label="โปรไฟล์">
      <span class="q2-ava ${fr.css}">${heroFaceSvg(save.eq)}<b class="q2-lv">${A.lv}</b></span>
      <span class="q2-id"><b>${badge}${esc(save.name||'Hero')}</b><small>${esc((TITLES[V.titles.eq]||TITLES.rookie).th)}</small><i class="q2-xp"><i style="width:${A.pct}%"></i></i></span>
    </button>
    <span class="pill q2-gold">${ICON.coin}<b id="goldTop">${fmt(save.gold)}</b></span>
    <button class="q2-ib" data-act="go" data-v="quests" aria-label="ภารกิจ">${IC2.scroll}${q?`<em class="q2-badge">${q}</em>`:''}</button>
    <button class="q2-ib" data-act="settings" aria-label="ตั้งค่า">${ICON.gear}</button>
  </header>`;
}
function navbar(){
  const cur = navIndex(ui.screen), bd = navBadges();
  return `<nav class="tabbar q2-nav" aria-label="เมนูหลัก">${NAV.map((n,i)=>`<button class="${i===cur?'on':''}" data-act="go" data-v="${n.k}" ${i===cur?'aria-current="page"':''}>${n.ic()}<span>${n.th}</span>${bd[n.k]?`<em class="q2-badge${bd[n.k]==='!'?' dot':''}">${bd[n.k]==='!'?'':bd[n.k]}</em>`:''}</button>`).join('')}</nav>`;
}
// refresh just the chrome (top bar + nav badges) without rebuilding the page
function refreshChrome(){
  if(ui.screen==='battle' || ui.screen==='title') return;
  const t = document.querySelector('.q2-top'), n = document.querySelector('.q2-nav');
  if(t) t.outerHTML = topbar();
  if(n) n.outerHTML = navbar();
}

render = function(){
  const app = $('#app');
  document.body.classList.toggle('lowfx', save.settings.rim===false);
  document.documentElement.classList.toggle('noanim', save.settings.anim===false);
  if(ui.screen==='battle') return;
  if(ui.screen==='title'){ app.innerHTML = renderTitle(); ui.v2prev = null; return; }
  if(ALIAS[ui.screen]){ if(ui.screen==='shop') ui.invShop = true; ui.screen = ALIAS[ui.screen]; }
  if(!SCREENS[ui.screen]) ui.screen = 'hub';
  dailyEnsure();
  const S = SCREENS[ui.screen], key = ui.screen + '|' + (S.key ? S.key() : '');
  const same = ui.v2prev===key, old = $('#scr'), keep = same && old ? old.scrollTop : 0;
  let body = '';
  try{ body = S.render(); }catch(e){ console.error(e); body = `<div class="panel" style="padding:16px">เกิดข้อผิดพลาดในการแสดงผล: ${esc(e.message)}</div>`; }
  app.innerHTML = topbar() + `<main class="screen q2-screen scr-${ui.screen}${S.full?' full':''}${same?'':' enter '+(ui.v2dir||'fade')}" id="scr">${S.full ? body : `<div class="q2-wrap">${body}</div>`}</main>` + navbar();
  const scr = $('#scr'); if(same && scr) scr.scrollTop = keep;
  ui.v2prev = key; ui.v2dir = '';
  if(S.after) try{ S.after(); }catch(e){ console.error(e); }
  if(!same) flushNotes();
};
goto = function(s){ goTo(s); };
function goTo(s, dir){
  s = ALIAS[s] || s;
  if(!dir){
    const a = navIndex(ui.screen), b = navIndex(s);
    dir = (s==='chapter' && ui.screen==='world') || (s==='world' && ui.screen==='hub') ? 'zoom-in'
        : (ui.screen==='chapter' && s==='world') ? 'zoom-out'
        : a<0 || b<0 || a===b ? 'fade' : b>a ? 'from-right' : 'from-left';
  }
  ui.v2dir = dir; ui.screen = s; ui.v2prev = null;
  render();
}
// switch a tab inside a screen: keep the page, just make sure the tabs stay in view
function tabRender(){
  render();
  const a = document.querySelector('.q2-anchor'), scr = $('#scr');
  if(a && scr){ const top = a.offsetTop; if(scr.scrollTop > top) scr.scrollTop = top; }
}

/* ------------------------------ transitions ------------------------------ */
// a quick moonlit portal between the map and a battle
function portal(fn, label){
  if(save.settings.anim===false){ fn(); return; }
  const p = document.createElement('div'); p.className = 'q2-portal';
  p.innerHTML = `<div class="q2-portal-ring"></div>${label?`<div class="q2-portal-t">${label}</div>`:''}`;
  document.body.appendChild(p);
  setTimeout(()=>{ try{ fn(); }catch(e){ console.error(e); } p.classList.add('out'); setTimeout(()=>p.remove(), 420); }, 430);
}
function wantFull(){
  if(!save.settings.fullscreen) return;
  const el = document.documentElement;
  if(document.fullscreenElement || document.webkitFullscreenElement) return;
  try{ (el.requestFullscreen ? el.requestFullscreen({ navigationUI:'hide' }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen()); }catch(e){}
}
function exitFull(){ try{ if(document.fullscreenElement) document.exitFullscreen(); else if(document.webkitFullscreenElement) document.webkitExitFullscreen(); }catch(e){} }
const canFull = ()=>!!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

function playStage(ch, n){
  wantFull();
  const L = LOCS[ch];
  portal(()=>startStage(ch, n), `<small>${esc(L.name)}</small>ด่าน ${ch+1}-${n}`);
}
function playTower(){ wantFull(); portal(()=>startTower(), `<small>Endless Tower</small>หอคอยไร้สิ้นสุด`); }

/* ------------------------------ battle result screens ------------------------------ */
QL2.afterBattle = function(kind, b){
  const m = document.querySelector('#overlay .modal'); if(!m || !b) return;
  m.classList.add('q2-result', 'r-'+kind);
  const V = V2(), A = advInfo(V.adv.xp), notes = takeNotes();
  const mats = Object.entries(b.v2mats||{}).map(([k,n])=>`<span class="pill">${matIcon(k)}+${n}</span>`).join('');
  const lvUp = notes.find(x=>x.kind==='level');
  const list = notes.filter(x=>x.kind!=='level').slice(0,5).map(x=>`<li>${x.html}</li>`).join('');
  const block = `<div class="q2-res">
    <div class="q2-res-xp"><span class="q2-res-lv">Lv ${A.lv}</span><div class="q2-xpbar"><i style="--w:${A.pct}%"></i></div><b>+${fmt(b.v2xp||0)} EXP</b></div>
    ${lvUp?`<div class="q2-lvup">⭐ LEVEL UP! Adventure Level ${A.lv} <small>รับรางวัลได้ที่หน้าโปรไฟล์</small></div>`:''}
    ${mats?`<div class="rewards q2-mats">${mats}</div>`:''}
    ${list?`<ul class="q2-notes">${list}</ul>`:''}</div>`;
  const rw = m.querySelector('.rewards');
  if(rw) rw.insertAdjacentHTML('afterend', block); else m.querySelector('.btns') && m.querySelector('.btns').insertAdjacentHTML('beforebegin', block);
  const btns = m.querySelector('.btns');
  if(btns){
    btns.querySelectorAll('[data-act="toMap"]').forEach(x=>{ x.innerHTML = `${IC2.world} แผนที่โลก`; });
    btns.querySelectorAll('[data-act="toShop"]').forEach(x=>{ x.innerHTML = `${IC2.bag} ร้านค้า / กระเป๋า`; });
    btns.insertAdjacentHTML('beforeend', `<button class="cbtn wood block" data-act="toHub">${IC2.hub} กลับฐาน</button>`);
  }
  // pretty pop for the result
  if(kind==='clear') m.insertAdjacentHTML('afterbegin', '<div class="q2-res-glow" aria-hidden="true"></div>');
};
// the pause menu gets a settings button
pauseMenu = (f=>function(){
  f.apply(this, arguments);
  const btns = document.querySelector('#overlay .modal .btns');
  if(btns && !btns.querySelector('[data-act="settings"]')){
    const q = btns.querySelector('[data-act="quitAsk"]');
    const h = `<button class="cbtn wood block" data-act="settings">${ICON.gear} ตั้งค่า</button>`;
    q ? q.insertAdjacentHTML('beforebegin', h) : btns.insertAdjacentHTML('beforeend', h);
  }
})(pauseMenu);

/* ------------------------------ action router ------------------------------ */
// runs before the original click handler; handled actions stop there
const ACTS2 = {};
document.addEventListener('click', ev=>{
  const el = ev.target.closest && ev.target.closest('[data-act]'); if(!el || el.disabled) return;
  const a = el.dataset.act, fn = ACTS2[a];
  if(!fn) return;
  const r = fn(el.dataset.v, el, ev);
  if(r!==false){ ev.stopImmediatePropagation(); ev.preventDefault(); }
}, true);

Object.assign(ACTS2, {
  go: v=>{ try{ ctxA(); }catch(e){} if(v==='hub' && ui.screen==='hub'){ const s = $('#scr'); if(s) s.scrollTo({ top:0, behavior:'smooth' }); return; } goTo(v); sfx.tap && sfx.tap(1); },
  tab: v=>{ if(v==='settings'){ openSettings(); return; } if(v==='shop') ui.invShop = true; goTo(v); },
  toHub: ()=>{ closeModal(); ui.bat = null; ui.pz = null; goTo('hub', 'rise'); },
  toMap: ()=>{ const b = ui.bat; closeModal(); if(b && b.stage && !b.stage.tower){ ui.v2ch = b.stage.ch; ui.bat = null; ui.pz = null; goTo('chapter', 'rise'); } else { ui.bat = null; ui.pz = null; ui.v2ch = 'tower'; goTo('chapter', 'rise'); } },
  toShop: ()=>{ closeModal(); ui.bat = null; ui.pz = null; ui.invShop = true; goTo('inventory', 'rise'); },
  stage: (v, el)=>{ playStage(+el.dataset.ch, +el.dataset.n); },
  playNext: ()=>{ const n = nextStage(); playStage(n.ch, n.n); },
  goTower: ()=>{ playTower(); },
  openCh: v=>{ ui.v2ch = +v; goTo('chapter'); sfx.tap && sfx.tap(2); },
  startGame: ()=>{ const inp = $('#nameIn'); const n = ((inp && inp.value)||'').trim(); if(!n){ toast('ใส่ชื่อฮีโร่ก่อนนะ'); inp && inp.focus(); return; }
    const isNew = !save.name; save.name = n; persist(); wantFull(); goTo('hub', 'rise');
    if(isNew) setTimeout(()=>toast(`ยินดีต้อนรับสู่ ${HUB_NAME.name}! 📜 ภารกิจแรกรออยู่`), 500); },
  settings: v=>{ openSettings(v); },
  fullscreen: ()=>{ save.settings.fullscreen = !save.settings.fullscreen; persist(); if(save.settings.fullscreen) wantFull(); else exitFull(); openSettings('gfx'); },
});
// resize: re-fit battle already handled; menus are fluid
document.addEventListener('fullscreenchange', ()=>{ try{ fitScene(); }catch(e){} });
