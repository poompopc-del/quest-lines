/* ==========================================================================
   LETTERⁿ v68 — ULTIMATE 2.0 · the ULT orb + a signature charge per hero
   --------------------------------------------------------------------------
   The gauge is still b.ult (0 → 5) so every older system keeps working, but
   it can now hold fractions and fills from more than "one word = +1":
     · every hero: +1 per word (as before) · +0.5 when an enemy falls
       · getting hit only drains 0.5 (was 1)
     · plus ONE signature way to charge, unique to each hero (ULTX below)
   The tiny ⚡ button is replaced by a big ULT orb in the action bar:
   a ring that fills in the hero's colour, the hero's ultimate icon, the
   name of the hero's charge and a READY burst. Tapping it before it is full
   explains how this hero charges.
   ========================================================================== */
(function(){
  const X = BALANCE.ULTX = Object.assign({ word:1, kill:.5, hitDrain:.5 }, BALANCE.ULTX || {});
  const MAX = 5;
  // signature charges — text shown on the info sheet (th) and on each gain (tag)
  const ULTX = {
    knight: { ic:'🛡️', en:'IRON WILL',   th:'ใจเหล็ก',        how:['โดนโจมตี <b>ไม่เสียเกจ</b> แต่กลับได้ <b>+16%</b>','ป้องกัน 🛡 ด้วยคำ <b>+20%</b>'] },
    pip:    { ic:'💎', en:'RUPEES',      th:'รูปีแห่งโชค',     how:['ใช้ตัวอักษรที่มีอัญมณี/เหรียญ/หัวใจ <b>+12%</b> ต่อชิ้น','โจมตีตอน HP เต็ม (ลำแสงดาบ) <b>+10%</b>'] },
    puff:   { ic:'🍰', en:'GOURMET',     th:'นักกินตัวกลม',    how:['คำหมวดอาหาร 🍎 <b>+30%</b>','ดูดกลืนศัตรู <b>+30%</b> · ดูดตัวอักษร <b>+16%</b> · พ่นดาว <b>+10%</b>'] },
    boomtos:{ ic:'💢', en:'SPARTAN RAGE',th:'โทสะสปาร์ตา',     how:['โดนโจมตี <b>ไม่เสียเกจ</b> แต่ได้ <b>+14%</b>','สะกดชื่อเทพเจ้ากรีก <b>+40%</b>','HP ต่ำกว่า 30% เก็บเกจได้ <b>x2</b>'] },
    elon:   { ic:'🎯', en:'HEADSHOT',    th:'เฮดช็อต',         how:['คำ Critical / PRECISION <b>+24%</b>','อัปเกรดอาวุธตามคอมโบ (4 · 5 · 6) <b>+10%</b>'] },
    mao:    { ic:'🪭', en:'EVASION DANCE',th:'ระบำหลบหลีก',    how:['ตีลังกาหลบสำเร็จ <b>+30%</b>','คำธาตุไฟ 🔥 <b>+20%</b>','ล้มศัตรูแล้วโพสท่า (เสน่ห์) <b>+20%</b>'] },
    x:      { ic:'🔋', en:'OVERCHARGE',  th:'พลังงานล้น',       how:['กด ⚡ ชาร์จแต่ละครั้ง <b>+20%</b>','ปล่อยชาร์จระดับ 3 ขึ้นไป <b>+20%</b>'] },
    luffy:  { ic:'🎈', en:'GEAR SECOND', th:'เกียร์สอง',        how:['ร่างยางเด้งการโจมตีหนัก <b>+24%</b>','แกตลิ่ง / บาซูก้า <b>+10%</b>'] },
    sonic:  { ic:'💍', en:'RING POWER',  th:'พลังแหวน',         how:['ทุก 10 แหวนที่เก็บได้ <b>+20%</b>','โฮมมิ่งแอทแท็ก <b>+10%</b>'] },
  };
  const DEF = { ic:'⚡', en:'BATTLE SPIRIT', th:'จิตวิญญาณนักสู้', how:['คำยาว 6 ตัวอักษรขึ้นไป <b>+10%</b>'] };
  const heroK = () => (save.eq && save.eq.char) || 'knight';
  const SIG = () => ULTX[heroK()] || DEF;
  window.QL_ULTX = ULTX;
  const pctOf = b => Math.round(Math.min(MAX, b.ult||0)/MAX*100);
  const UT = k => (window.QL_TAC && QL_TAC.UTIL && QL_TAC.UTIL[k]) || null;
  const colOf = k => (FIGHTER[k] && FIGHTER[k].c) || '#c77dff';

  /* ------------------------------ gaining ------------------------------ */
  function gain(n, tag){
    const b = ui.bat; if(!b || b.over || !(n > 0)) return;
    if(heroK()==='boomtos' && b.hp < b.max*.3) n *= 2;
    const was = b.ult||0; if(was >= MAX) return;
    b.ult = Math.min(MAX, Math.round((was + n)*100)/100);
    pop(`+${Math.round((b.ult-was)/MAX*100)}%`, tag);
    if(was < MAX && b.ult >= MAX) readyBurst();
    orbSync();
  }
  window.QL_ULT_GAIN = gain;

  // a word attack: compare the word that is about to be used with the board
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!b || b.busy) return f.apply(this, arguments);
    const r = evalWord(); if(!r || r.state!=='ok') return f.apply(this, arguments);
    const k = heroK(), w0 = b.words, kills0 = b.kills, full = b.hp >= b.max, xLvl = b.xLvl||0, xc = !!b.xCharging;
    const gems = (b.sel||[]).filter(i => b.tiles[i] && b.tiles[i].gem && !b.tiles[i].stone).length;
    const chain0 = ui.elonBat===b ? (ui.elonChain||0) : 0, rings0 = b.rings||0, len = VocabularyManager.wordLength(r.w);
    const out = await f.apply(this, arguments);
    if(ui.bat!==b || b.words===w0) return out;           // nothing was spelled (cancelled)
    const tac = r.tac || {};
    if(k==='pip'){ if(gems) gain(.6*gems, `💎x${gems}`); if(full && !r.rude) gain(.5, '🗡 BEAM'); }
    if(k==='puff'){
      if(tac.food) gain(1.5, '🍎 อร่อย!');
      if(r.kMode==='eat') gain(1.5, '😋 กลืน!'); else if(r.kMode==='suck') gain(.8, '🌀 ดูด'); else if(r.kMode==='spit') gain(.5, '⭐ พ่น'); }
    if(k==='boomtos' && typeof GODS!=='undefined' && GODS[r.w]) gain(2, '⚡ เทพเจ้า!');
    if(k==='elon'){ if(r.crit || tac.precision) gain(1.2, '🎯 HEADSHOT');
      const c1 = ui.elonChain||0; if(c1 > chain0 && [4,5,6].includes(c1)) gain(.5, '🔫 อาวุธใหม่'); }
    if(k==='mao' && r.el && String(r.el).includes('fire')) gain(1, '🔥 ไฟ');
    if(k==='x' && !xc && xLvl >= 3) gain(1, '🔋 ปล่อยเต็ม');
    if(k==='luffy' && (r.lfMove==='gatling' || r.lfMove==='bazooka')) gain(.5, '👊 GOMU');
    if(k==='sonic' && r.snMove==='homing') gain(.5, '🎯 HOMING');   // rings: see addRings in sonic.js
    if(!ULTX[k] && len >= 6) gain(.5, '✨ คำยาว');
    return out;
  })(doAttack);
  // an enemy falls
  enemyDies = (f => async function(){
    const e = curEnemy(), b = ui.bat;
    if(b && e && !e._ultK && !b.over){ e._ultK = 1; gain(X.kill, '☠'); if(heroK()==='mao') gain(1, '💋 เสน่ห์'); }
    return f.apply(this, arguments);
  })(enemyDies);
  // enemy turn: softer drain · knight / boomtos charge from pain
  enemyTurn = (f => async function(){
    const b = ui.bat; if(!b) return f.apply(this, arguments);
    const hp0 = b.hp, u0 = b.ult||0;
    ui.ultInET = true;
    try{ await f.apply(this, arguments); } finally { ui.ultInET = false; }
    if(ui.bat!==b || b.over) return;
    if(b.hp < hp0 && (b.ult||0) < u0){
      const k = heroK();
      if(k==='knight'){ b.ult = u0; gain(.8, '🛡️ ใจเหล็ก'); }
      else if(k==='boomtos'){ b.ult = u0; gain(.7, '💢 โทสะ'); }
      else b.ult = Math.max(0, Math.round((u0 - X.hitDrain)*100)/100);
      orbSync();
    }
  })(enemyTurn);
  // guard (knight bonus)
  try{
    if(typeof ACTS2!=='undefined' && ACTS2.tacGuard){
      ACTS2.tacGuard = (f => function(){ const b = ui.bat, u0 = b && b.ult; const out = f.apply(this, arguments);
        try{ if(b && b.busy && b.guard > 0 && heroK()==='knight') gain(1, '🛡 ป้องกัน'); }catch(e){} orbSync(); return out; })(ACTS2.tacGuard);
    }
  }catch(e){}
  // Mia: a successful backflip dodge
  heroPose = (f => function(cls){
    const out = f.apply(this, arguments);
    try{ const b = ui.bat; if(cls==='pose-flip' && heroK()==='mao' && b && b.maoDodge && ui.ultInET && !b._ultDodge){ b._ultDodge = 1; setTimeout(() => { b._ultDodge = 0; }, 900); gain(1.5, '🤸 หลบ!'); } }catch(e){}
    return out;
  })(heroPose);
  // Luffy: the rubber body bounces a heavy hit
  if(typeof window.tacAbsorb==='function'){
    window.tacAbsorb = (f => function(b, e, dmg, heavy){
      const big = heavy || (e && ['cast2','copy'].includes(e.tacKindNow));
      const out = f.apply(this, arguments);
      try{ if(heroK()==='luffy' && dmg > 0 && big && !b.lfBalloon) gain(1.2, '🎈 เด้ง!'); }catch(err){}
      return out;
    })(window.tacAbsorb);
  }
  // X: every charge
  if(typeof xCharge==='function'){
    xCharge = (f => async function(){ const b = ui.bat, l0 = b && b.xLvl; const out = await f.apply(this, arguments);
      try{ if(b && heroK()==='x' && (b.xLvl||0) > (l0||0)) gain(1, '⚡ ชาร์จ'); }catch(e){} return out; })(xCharge);
  }

  /* ------------------------------ the orb ------------------------------ */
  const css = `
  .ult-orb{--hc:#c77dff;--p:0;position:relative;flex:0 0 76px;width:76px;align-self:stretch;min-height:76px;border:0;padding:0;background:none;cursor:pointer;display:grid;place-items:center;font-family:Kanit,sans-serif;-webkit-tap-highlight-color:transparent}
  .ult-orb .uo-ring{position:absolute;inset:50% auto auto 50%;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:50%;
    background:conic-gradient(var(--hc) calc(var(--p)*1%), rgba(255,255,255,.09) 0);
    -webkit-mask:radial-gradient(circle,transparent 27px,#000 28px);mask:radial-gradient(circle,transparent 27px,#000 28px);transition:filter .3s}
  .ult-orb .uo-core{position:absolute;inset:50% auto auto 50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#3b2f63,#140f27 70%);box-shadow:inset 0 -6px 12px rgba(0,0,0,.6),0 0 0 2px #0b0816;display:grid;place-items:center;overflow:hidden}
  .ult-orb .uo-fill{position:absolute;left:0;right:0;bottom:0;height:calc(var(--p)*1%);background:linear-gradient(0deg,var(--hc),transparent);opacity:.45;transition:height .4s}
  .ult-orb .uo-ic{position:relative;font-size:24px;line-height:1;filter:grayscale(.55) brightness(.8);transition:filter .3s,transform .3s}
  .ult-orb .uo-pct{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);font:800 11px/1 Kanit,sans-serif;color:#fff;background:#0b0816;border:1.5px solid var(--hc);border-radius:9px;padding:2px 6px;white-space:nowrap;z-index:2}
  .ult-orb .uo-lbl{position:absolute;left:50%;top:-3px;transform:translateX(-50%);font:900 10px/1 Kanit,sans-serif;letter-spacing:1.5px;color:var(--hc);text-shadow:0 1px 0 #000;white-space:nowrap;z-index:2}
  .ult-orb .uo-rays{position:absolute;inset:50% auto auto 50%;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;opacity:0;pointer-events:none;
    background:repeating-conic-gradient(from 0deg,var(--hc) 0 6deg,transparent 6deg 24deg);-webkit-mask:radial-gradient(circle,transparent 34px,#000 36px,transparent 48px);mask:radial-gradient(circle,transparent 34px,#000 36px,transparent 48px)}
  .ult-orb.ready .uo-rays{opacity:.9;animation:uoSpin 3s linear infinite}
  .ult-orb.ready .uo-ring{background:conic-gradient(from var(--a,0deg),#fff6c0,var(--hc),#ffd23a,var(--hc),#fff6c0);animation:uoHue 1.2s linear infinite;filter:drop-shadow(0 0 6px var(--hc)) drop-shadow(0 0 14px var(--hc))}
  .ult-orb.ready .uo-core{background:radial-gradient(circle at 35% 30%,#fff3c4,var(--hc) 55%,#2a1640 100%);animation:uoPulse .9s ease-in-out infinite}
  .ult-orb.ready .uo-ic{filter:none;transform:scale(1.25);text-shadow:0 0 10px #fff}
  .ult-orb.ready .uo-pct{background:linear-gradient(90deg,#ffd23a,#fff6c0,#ffd23a);color:#2a1300;border-color:#fff;animation:uoTxt 1s ease-in-out infinite}
  .ult-orb.ready .uo-lbl{color:#fff;text-shadow:0 0 8px var(--hc),0 1px 0 #000}
  .ult-orb:disabled{opacity:1}
  .ult-orb.busy{filter:saturate(.6) brightness(.8)}
  .ult-orb:active .uo-core{transform:scale(.94)}
  @keyframes uoSpin{to{transform:rotate(360deg)}}
  @keyframes uoPulse{50%{box-shadow:inset 0 -6px 12px rgba(0,0,0,.4),0 0 0 2px #fff,0 0 22px var(--hc)}}
  @keyframes uoTxt{50%{transform:translateX(-50%) scale(1.12)}}
  @property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
  @keyframes uoHue{to{--a:360deg}}
  .uo-pop{position:absolute;left:50%;top:6px;transform:translateX(-50%);font:800 12px/1 Kanit,sans-serif;color:#fff;white-space:nowrap;pointer-events:none;z-index:5;
    background:rgba(10,8,22,.85);border:1.5px solid var(--hc);border-radius:10px;padding:3px 7px;animation:uoPop 1.1s ease-out forwards}
  @keyframes uoPop{0%{opacity:0;transform:translate(-50%,6px) scale(.7)}15%{opacity:1;transform:translate(-50%,-6px) scale(1.08)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-34px)}}
  .ult-ready-fx{position:absolute;left:0;right:0;top:38%;z-index:30;pointer-events:none;display:grid;place-items:center;--hc:#c77dff}
  .ult-ready-fx b{font:900 34px/1 Kanit,sans-serif;letter-spacing:3px;color:#fff;text-shadow:0 0 12px var(--hc),0 0 26px var(--hc),0 3px 0 #000;
    padding:10px 26px;background:linear-gradient(90deg,transparent,rgba(10,6,24,.85) 20%,rgba(10,6,24,.85) 80%,transparent);animation:urIn 1.4s cubic-bezier(.2,1.4,.4,1) forwards}
  .ult-ready-fx small{display:block;font:700 13px Kanit,sans-serif;letter-spacing:1px;color:var(--hc);text-align:center;margin-top:4px}
  @keyframes urIn{0%{opacity:0;transform:scaleX(.2) skewX(-20deg)}18%{opacity:1;transform:scaleX(1.06) skewX(-8deg)}30%{transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-16px)}}
  .minirow .ultbtn{display:none!important}
  /* make room for the orb: potions stack in one slim column */
  .dock .potrow{flex-direction:column!important;flex:0 0 54px!important;gap:5px!important}
  .dock .potrow .bigbtn{flex:1 1 0!important;min-height:0!important;min-width:0!important;width:100%!important;padding:0 4px!important;display:flex!important;align-items:center;justify-content:center}
  .dock .potrow .bigbtn svg,.dock .potrow .bigbtn .ico{width:24px!important;height:24px!important;font-size:22px!important}
  .dock .potrow .bigbtn .n{transform:scale(.8);transform-origin:right bottom}
  @media (max-width:900px), (max-aspect-ratio:4/3){
    .dock{grid-template-columns:auto minmax(0,1fr)!important}
    .dock .tools{flex:0 0 auto!important}
    .dock .tools .tac-sg{flex:0 0 74px!important;width:74px}
    .dock .attack{min-width:0!important}
    .dock .attack .atk,.dock .attack .xsplit{flex:1 1 auto;min-width:0}
  }
  .tac-ult.uo-cut{position:relative;overflow:hidden}
  .uo-cuthd{position:relative;display:flex;align-items:center;gap:12px;margin:-4px -4px 2px;padding:10px 12px;border-radius:14px;overflow:hidden;
    background:linear-gradient(105deg,var(--hc) 0%,rgba(20,12,40,.95) 62%);box-shadow:0 0 22px color-mix(in srgb,var(--hc) 55%,transparent)}
  .uo-cuthd::before{content:'';position:absolute;inset:-60%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.16) 0 5deg,transparent 5deg 20deg);animation:uoSpin 9s linear infinite;pointer-events:none}
  .uo-cuthd .uo-face{position:relative;flex:0 0 64px;width:64px;height:64px;border-radius:50%;overflow:hidden;background:radial-gradient(#fff6,#0006);border:3px solid #fff;box-shadow:0 0 14px var(--hc)}
  .uo-cuthd .uo-face svg{width:100%;height:100%}
  .uo-cuthd div{position:relative;display:grid;line-height:1.05}
  .uo-cuthd i{font:900 italic 26px/1 Kanit,sans-serif;letter-spacing:2px;color:#fff;text-shadow:0 2px 0 #000,0 0 14px var(--hc)}
  .uo-cuthd b{font:800 15px Kanit,sans-serif;color:#ffe9a8;letter-spacing:1px}
  .uo-cuthd small{font-size:12px;color:#fff;opacity:.75}
  .tac-ult.uo-cut .tac-ult-b{transition:transform .15s}
  .tac-ult.uo-cut .tac-ult-b.util{border-color:var(--hc);background:linear-gradient(90deg,color-mix(in srgb,var(--hc) 30%,transparent),transparent)}
  .uo-sheet{display:grid;gap:10px;text-align:left}
  .uo-sheet .uo-sh{display:flex;align-items:center;gap:12px}
  .uo-sheet .uo-big{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:30px;background:radial-gradient(circle at 35% 30%,#fff3c4,var(--hc) 60%,#1a0f2e);box-shadow:0 0 16px var(--hc)}
  .uo-sheet h4{margin:0;font:800 19px/1.1 Kanit,sans-serif;color:#ffd27a}
  .uo-sheet h4 small{display:block;font:600 12.5px Kanit,sans-serif;color:var(--hc);letter-spacing:1px;margin-top:3px}
  .uo-sheet ul{margin:0;padding:10px 12px 10px 28px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:14px;line-height:1.7}
  .uo-sheet .uo-base{font-size:12.5px;opacity:.75}
  .uo-sheet .uo-bar{height:12px;border-radius:7px;background:rgba(255,255,255,.1);overflow:hidden}
  .uo-sheet .uo-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--hc),#ffd23a)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function orbBuild(){
    const tools = document.querySelector('.dock .tools'), atk = $('#bAtk'); if((!tools && !atk) || $('#ultOrb')) return;
    const k = heroK(), U = UT(k), S = SIG();
    const o = document.createElement('button');
    o.id = 'ultOrb'; o.className = 'ult-orb'; o.dataset.act = 'ultOrb'; o.setAttribute('aria-label', 'Ultimate');
    o.style.setProperty('--hc', colOf(k));
    o.innerHTML = `<span class="uo-rays"></span><span class="uo-ring"></span><span class="uo-core"><span class="uo-fill"></span><span class="uo-ic">${U ? U.ic : '⚡'}</span></span><span class="uo-lbl">ULT</span><span class="uo-pct">0%</span>`;
    o.title = `${S.en} — ${S.th}`;
    if(tools) tools.appendChild(o); else atk.parentNode.insertBefore(o, atk);
  }
  function orbSync(){
    const o = $('#ultOrb'), b = ui.bat; if(!o || !b) return;
    const p = pctOf(b), ready = (b.ult||0) >= MAX;
    o.style.setProperty('--p', p);
    o.classList.toggle('ready', ready); o.classList.toggle('busy', !!b.busy);
    const t = o.querySelector('.uo-pct'); if(t) t.textContent = ready ? 'ULTIMATE!' : `${p}%`;
    const l = o.querySelector('.uo-lbl'); if(l) l.textContent = ready ? '⚡ READY ⚡' : SIG().en;
  }
  window.QL_ULT_SYNC = orbSync;
  function pop(txt, tag){
    const o = $('#ultOrb'); if(!o) return;
    const s = document.createElement('span'); s.className = 'uo-pop'; s.textContent = `${tag ? tag+' ' : ''}${txt}`;
    o.appendChild(s); setTimeout(() => s.remove(), 1150);
  }
  function readyBurst(){
    const stg = $('#stage'); if(!stg) return;
    const k = heroK(), U = UT(k);
    const d = document.createElement('div'); d.className = 'ult-ready-fx'; d.style.setProperty('--hc', colOf(k));
    d.innerHTML = `<b>ULTIMATE READY<small>${U ? `${U.ic} ${U.en}` : ''}</small></b>`;
    stg.appendChild(d); setTimeout(() => d.remove(), 1500);
    try{ tone(660, .12, 'square', .05); tone(990, .16, 'square', .05, .1); tone(1320, .22, 'triangle', .05, .22); }catch(e){}
  }
  buildBattleDom = (f => function(){ const out = f.apply(this, arguments); try{ orbBuild(); orbSync(); }catch(e){} return out; })(buildBattleDom);
  updateHud = (f => function(){ const out = f.apply(this, arguments); try{ orbSync(); }catch(e){} return out; })(updateHud);

  function infoSheet(){
    const b = ui.bat, k = heroK(), S = SIG(), U = UT(k), p = b ? pctOf(b) : 0;
    modal(`<div class="uo-sheet" style="--hc:${colOf(k)}">
      <div class="uo-sh"><span class="uo-big">${S.ic}</span><h4>${esc(S.en)}<small>${esc(CH(k).name)} · ${esc(S.th)}</small></h4></div>
      <div class="uo-bar"><i style="width:${p}%"></i></div>
      <div>เกจ Ultimate <b>${p}%</b> — เก็บเกจแบบเฉพาะตัว:</div>
      <ul>${S.how.map(h => `<li>${h}</li>`).join('')}</ul>
      <div class="uo-base">ทุกฮีโร่: สะกดคำ +20% · ล้มศัตรู +10% · โดนโจมตี −10%${U ? ` · เต็มแล้วเลือก ⚔️ ดาเมจ หรือ ${U.ic} ${esc(U.en)}` : ''}</div>
      <button class="cbtn gold block" data-act="closeModal">สู้ต่อ!</button></div>`, { dismiss:true });
  }
  Object.assign(ACTS2, {
    ultOrb: () => { const b = ui.bat; if(!b) return; if((b.ult||0) >= MAX && !b.busy) return useUltimate(); if(!b.busy) infoSheet(); },
  });
  window.QL_ULT_INFO = infoSheet;

  // the chooser gets a hero cut-in header
  useUltimate = (f => function(){
    const out = f.apply(this, arguments);
    try{
      const m = document.querySelector('.tac-ult'); if(m && !m.classList.contains('uo-cut')){
        const k = heroK(), c = colOf(k);
        m.classList.add('uo-cut'); m.style.setProperty('--hc', c);
        const h = m.querySelector('.tac-ult-h');
        if(h) h.outerHTML = `<div class="uo-cuthd"><span class="uo-face">${heroFaceSvg(save.eq)}</span><div><i>ULTIMATE</i><b>${esc(CH(k).name)}</b><small>เลือกใช้พลังแบบไหน?</small></div></div>`;
      }
    }catch(e){}
    return out;
  })(useUltimate);
})();
