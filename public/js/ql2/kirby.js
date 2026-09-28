/* ==========================================================================
   QUEST LINES v37 — KIRBY (the fighter id stays 'puff')
   --------------------------------------------------------------------------
   The attack button is split in half:
     🌀 ดูด (left)  — only for words of 4+ letters
         · a RUDE word (4+) can swallow even a boss / mini boss (the
           rude backlash still hits Kirby)
         · normal enemy → swallowed whole (counts as a kill) and its HP is
           added to the stored damage
         · boss / mini boss can't be swallowed → only the letters go in
         · EVERY letter on the board goes in too — the spelled word and the
           unused ones — and the whole board is refreshed
         · the word's own damage is added to the stored damage
         · stored damage keeps stacking until he attacks
     ⚔ โจมตี (right) — mouth empty: a normal Kirby attack
                        mouth full : STAR SPIT = (word + stored) × letter bonus
   Letter bonus: every 10 letters held doubles it → 10 = x2 · 20 = x4 ·
   30 = x8 · 40 = x16 … The star grows with everything he has swallowed.
   Two animation sets: normal (idle/walk/hurt + slide · roll · flip attacks)
   and mouthful (fidle/fwalk/fhurt + spit), switched by the 'kfull' class.
   Everything is a wrapper — the battle engine is untouched.
   ========================================================================== */
const KIRBY = { id:'puff', min:4, per:10 };
const isKirby = ()=>typeof charIs==='function' && charIs(KIRBY.id);
// letter bonus: x2 for every full 10 letters in his mouth
const kMult = letters=>Math.pow(2, Math.floor((letters||0)/KIRBY.per));
const kFull = b=>!!(b && ((b.kLetters||0) > 0 || (b.kStore||0) > 0));
const kFmt = n=>n>=1e6 ? (n/1e6).toFixed(n>=1e7?0:1)+'M' : n>=1e4 ? Math.round(n/1e3)+'K' : String(n);
// letters that can be sucked in right now: the whole board except stone tiles
const kBoardCount = ()=>{ const b = ui.bat; return b ? b.tiles.filter(t=>!t.stone).length : 0; };

/* ------------------------------ look ------------------------------ */
(function(){
  const k = '.spr-puff', css = `
    #heroA.kfull ${k} .spr-a{display:none !important}
    #heroA.kfull:not(.walk):not(.hurt):not(.dead):not([class*="pose-"]) ${k} .spr-a-fidle{display:inline !important}
    #heroA.kfull.walk:not(.hurt):not(.dead):not([class*="pose-"]) ${k} .spr-a-fwalk{display:inline !important}
    #heroA.kfull.hurt:not(.dead):not([class*="pose-"]) ${k} .spr-a-fhurt{display:inline !important}
    #heroA.kfull.dead ${k} .spr-a-dead{display:inline !important}
    #heroA.kfull.pose-inhale ${k} .spr-a-inhale,#heroA.kfull.pose-fspit ${k} .spr-a-fspit{display:inline !important}
    .k-badge{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:1px 8px;border-radius:999px;font:italic 800 12px var(--hand);color:#fff;background:linear-gradient(#ff8ad0,#e0409a);box-shadow:0 0 10px rgba(255,120,200,.6);white-space:nowrap}
    .k-letter{position:fixed;z-index:60;pointer-events:none;font:900 22px/1 var(--hand);color:#2a1a10;background:#fff8ec;border:2px solid #2a1a10;border-radius:6px;padding:3px 6px;text-transform:uppercase}
    /* split attack button: 🌀 inhale | ⚔ attack */
    .ksplit{display:flex;flex-direction:row;gap:5px;flex:2;min-width:0}
    .ksplit .atk,html.v16 .dock .attack .ksplit .atk{flex:1 1 0 !important;min-width:0 !important;width:auto !important;padding:0 4px}
    .ksplit .atk .ico{font-size:30px}
    .ksplit .atk .dmg{font-size:19px;white-space:nowrap}
    .kinhale{flex:1 1 0;min-width:0;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0 4px;border:0;border-radius:6px;cursor:pointer;color:#3a0626;
      font:italic 800 17px/1.05 var(--hand);background:linear-gradient(180deg,#ffe3f3 0%,#ff8ad0 50%,#c2307e 100%);
      box-shadow:inset 0 3px 0 rgba(255,255,255,.55),inset 0 -5px 0 rgba(0,0,0,.22),0 0 0 2px #07060d,0 0 14px rgba(255,120,200,.45)}
    .kinhale .kt{display:flex;align-items:center;gap:3px;white-space:nowrap}
    .kinhale .ki{font-size:22px;line-height:1;display:inline-block}
    .kinhale small{font:600 10.5px/1.1 var(--hand);font-style:normal;opacity:.85;text-align:center;overflow-wrap:anywhere}
    .kinhale:disabled{filter:grayscale(.85) brightness(.5);cursor:default}
    .kinhale:active:not(:disabled){transform:translateY(2px)}
    .kinhale.ready .ki{animation:kspin 1s linear infinite}
    @keyframes kspin{to{transform:rotate(-360deg)}}
    html.v16 .atk.kspit{background:linear-gradient(180deg,#fffbe0 0%,#ffe14a 45%,#e0a010 100%) !important;color:#2a1a06}
    html.v16 .atk.kspit .dmg{text-shadow:0 1px 0 rgba(255,255,255,.5)}
    @media (max-width:900px), (max-aspect-ratio:4/3){ .ksplit{flex:1 1 auto} .ksplit .atk,.kinhale{min-height:40px !important} html.v16 .dock .attack .ksplit{flex:1 1 auto;min-width:0} }
    @media (orientation:landscape) and (max-height:540px){ .ksplit .atk,.kinhale{min-height:52px !important} }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
// which strip the ticker shows: the mouthful set replaces idle / walk / hurt while he is holding something
sprActiveName = (f=>function(actor, c){
  const n = f.apply(this, arguments);
  if(c===HERO_SPRITE.puff && actor && actor.classList.contains('kfull')) return { idle:'fidle', walk:'fwalk', hurt:'fhurt' }[n] || n;
  return n;
})(sprActiveName);
function kSync(){
  const b = ui.bat, a = $('#heroA'); if(!a) return;
  const full = !!(b && isKirby() && kFull(b));
  a.classList.toggle('kfull', full);
  const me = document.querySelector('.hud .me'); if(!me) return;
  let el = $('#kBadge');
  if(!full){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('span'); el.id = 'kBadge'; el.className = 'k-badge'; me.appendChild(el); }
  const L = b.kLetters||0;
  el.textContent = `😋${L} ⭐x${kMult(L)} 💥${kFmt(b.kStore||0)}`;
  el.title = `อม ${L} ตัวอักษร (อีก ${KIRBY.per - L%KIRBY.per} ตัวได้ x${kMult(L)*2}) · ดาเมจสะสม ${b.kStore||0}`;
}

/* ------------------------------ the split button ------------------------------ */
function kButtons(){
  const bAtk = $('#bAtk'), b = ui.bat;
  let wrap = $('#kSplit');
  if(!bAtk || !b || !isKirby()){
    if(wrap && bAtk){ wrap.parentNode.insertBefore(bAtk, wrap); wrap.remove(); }
    if(bAtk) bAtk.classList.remove('kspit');
    return;
  }
  if(!wrap){
    wrap = document.createElement('div'); wrap.id = 'kSplit'; wrap.className = 'ksplit';
    bAtk.parentNode.insertBefore(wrap, bAtk);
    const bi = document.createElement('button'); bi.id = 'bInhale'; bi.className = 'kinhale'; bi.type = 'button';
    bi.setAttribute('aria-label', 'ดูด');
    bi.addEventListener('click', kInhale);
    wrap.appendChild(bi); wrap.appendChild(bAtk);
  }
  const bi = $('#bInhale'), e = curEnemy();
  const prev = b.kChoice; b.kChoice = null; const r = evalWord(); b.kChoice = prev;
  const okWord = r.state==='ok', long = okWord && r.w.length >= KIRBY.min;
  const can = long && !!e && !b.busy;
  bi.disabled = !can;
  bi.classList.toggle('ready', can);
  const tip = !okWord ? `คำ ${KIRBY.min} ตัวขึ้นไป` : !long ? `ต้อง ${KIRBY.min} ตัว+` : (e && (e.boss || e.mini) && r.rude) ? `🤬 กลืน${e.boss?'บอส':'มินิบอส'}!` : (e && !e.boss && !e.mini) ? `กลืน +${kBoardCount()} ตัว` : `+${kBoardCount()} ตัว`;
  bi.innerHTML = `<span class="kt"><span class="ki">🌀</span>ดูด</span><small>${tip}</small>`;
  bAtk.classList.toggle('kspit', kFull(b));
}
function kInhale(){
  const b = ui.bat; if(!b || b.busy || !isKirby()) return;
  b.kChoice = 'inhale';
  const r = evalWord();
  if(r.state!=='ok' || (r.kMode!=='eat' && r.kMode!=='suck')){ b.kChoice = null; try{ sfx.bad(); }catch(e){} kButtons(); return; }
  doAttack();
}
buildBattleDom = (f=>function(){ const r = f.apply(this, arguments); try{ kSync(); kButtons(); }catch(e){} return r; })(buildBattleDom);
updateHud = (f=>function(){ const r = f.apply(this, arguments); try{ kSync(); kButtons(); }catch(e){} return r; })(updateHud);

/* ------------------------------ what a word does ------------------------------ */
evalWord = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat;
  if(!b || !isKirby() || r.state!=='ok') return r;
  const e = curEnemy(); if(!e) return r;
  const inhale = b.kChoice==='inhale' && r.w.length >= KIRBY.min;
  if(r.rude && !inhale) return r;                         // rude words only matter for inhaling
  r.kBase = r.dmg;
  if(inhale){
    const gain = kBoardCount(), eat = (!e.boss && !e.mini) || !!r.rude;   // a rude word swallows bosses too
    const L = (b.kLetters||0) + gain, add = r.dmg + (eat ? e.maxHp : 0);
    r.kMode = eat ? 'eat' : 'suck'; r.kGain = gain; r.kAdd = add;
    r.dmg = eat ? Math.max(1, Math.ceil(e.hp)) : 0;       // swallowed = gone · bosses take nothing
    r.notes.unshift(eat
      ? `${r.rude && (e.boss || e.mini) ? '🤬 ดูดด้วยคำหยาบ! ' : '🌀 ดูด! '}กลืน ${e.name} (HP ${e.maxHp}) + ตัวอักษร ${gain} ตัว → สะสม ${(b.kStore||0)+add} ⭐x${kMult(L)}`
      : `🌀 ${e.boss?'บอส':'มินิบอส'}ดูดไม่ได้ → ดูดตัวอักษร ${gain} ตัว → สะสม ${(b.kStore||0)+add} ⭐x${kMult(L)}`);
  } else if(kFull(b)){
    const m = kMult(b.kLetters), st = b.kStore||0;
    r.kMode = 'spit'; r.dmg = Math.max(1, Math.round((r.dmg + st) * m));
    r.notes.unshift(`⭐ พ่นดาว (${r.kBase} + สะสม ${st}) x${m} · อม ${b.kLetters||0} ตัว`);
  } else if(r.w.length >= KIRBY.min){
    r.notes.push('🌀 กดดูดเพื่อเก็บดาเมจ');
  }
  return r;
})(evalWord);
// the attack half tells what it will do
renderTray = (f=>function(){
  const r = f.apply(this, arguments);
  try{
    if(isKirby() && ui.bat){
      const b = ui.bat, prev = b.kChoice; b.kChoice = null;
      const w = evalWord(); b.kChoice = prev;
      const d = $('#atkDmg'); if(d && w.state==='ok' && w.kMode==='spit') d.textContent = `⭐${kFmt(w.dmg)}`;
      kButtons();
    }
  }catch(e){}
  return r;
})(renderTray);

doAttack = (f=>async function(){
  const b = ui.bat;
  if(!b || !isKirby() || b.busy){ return f.apply(this, arguments); }
  const r = evalWord();
  b.kAct = r.state==='ok' ? (r.kMode || null) : null;
  b.kPend = b.kAct ? r : null;
  try{ return await f.apply(this, arguments); }
  finally{ if(ui.bat===b){ b.kAct = null; b.kPend = null; b.kChoice = null; kSync(); kButtons(); } }
})(doAttack);

/* ------------------------------ effects ------------------------------ */
const mouthXY = ()=>{ const f = HERO_SPRITE.puff.scale/5; return { x:HERO_X+46*f, y:FLOOR_Y-62*f }; };
function kSuction(ms){
  const fx = $('#fx'); if(!fx) return;
  const m = mouthXY();
  for(let i=0;i<9;i++){
    const p = document.createElementNS('http://www.w3.org/2000/svg','path');
    const y0 = FLOOR_Y - 20 - i*22, x0 = EN_X + 60 + (i%3)*20;
    p.setAttribute('d', `M${x0},${y0} Q${(x0+m.x)/2},${(y0+m.y)/2 + (i%2?-18:18)} ${m.x},${m.y}`);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', i%3 ? '#dff6ff' : '#ffb0e0'); p.setAttribute('stroke-width', 4); p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-dasharray', '26 60'); fx.appendChild(p);
    anim(p, [{ strokeDashoffset:0, opacity:0 },{ strokeDashoffset:-86*2, opacity:.9, offset:.2 },{ strokeDashoffset:-86*6, opacity:.9, offset:.8 },{ strokeDashoffset:-86*7, opacity:0 }], { duration:ms, delay:i*40, easing:'linear' }).then(()=>p.remove());
  }
}
// the mouth point on screen (scene units → page pixels through the battle svg)
function kMouthScreen(){
  const m = mouthXY(), svg = $('#sceneSvg') || document.querySelector('#stage svg');
  try{ const pt = svg.createSVGPoint(); pt.x = m.x; pt.y = m.y; const p = pt.matrixTransform(svg.getScreenCTM()); return { x:p.x, y:p.y }; }
  catch(e){ const r = $('#heroA').getBoundingClientRect(); return { x:r.left + r.width*.72, y:r.top + r.height*.55 }; }
}
// every letter on the board — the spelled word too — flies one by one into his mouth
function kSuckLetters(){
  const b = ui.bat; if(!b) return 0;
  const M = kMouthScreen(); let n = 0;
  const tray = $('#tray'); if(tray) tray.style.visibility = 'hidden';
  document.querySelectorAll('#tiles .tile').forEach((t)=>{
    const idx = +t.dataset.i, tile = b.tiles[idx]; if(!tile || tile.stone) return;
    const r = t.getBoundingClientRect(), d = document.createElement('div'), k = n++;
    d.className = 'k-letter'; d.textContent = tile.l==='qu' ? 'Qu' : tile.l;
    if(tile.sel) d.style.background = '#ffe14a';
    d.style.left = r.left + r.width/2 - 14 + 'px'; d.style.top = r.top + r.height/2 - 14 + 'px';
    document.body.appendChild(d);
    const dx = M.x - (r.left + r.width/2), dy = M.y - (r.top + r.height/2);
    d.animate([{ transform:'translate(0,0) scale(1) rotate(0)', opacity:1 },{ transform:`translate(${dx*.45}px,${dy*.55 - 60}px) scale(.9) rotate(${k%2?120:-120}deg)`, opacity:1, offset:.55 },{ transform:`translate(${dx}px,${dy}px) scale(.12) rotate(${k%2?300:-300}deg)`, opacity:.3 }], { duration:560, delay:k*45, easing:'ease-in', fill:'forwards' })
      .finished.catch(()=>{}).then(()=>{ d.remove(); if(ui.bat!==b) return;
        b.kLetters = (b.kLetters||0) + 1; kSync();
        try{ tone(500 + (k%16)*35, .04, 'triangle', .03); }catch(err){} });
    t.style.visibility = 'hidden';
  });
  return n;
}
function kRefillBoard(){
  const b = ui.bat; if(!b) return;
  b.tiles = b.tiles.map((t,i)=>(b.sel.includes(i) || t.stone) ? t : Object.assign(newTile(b.stage.s), { fresh:true }));
  balanceTiles(b.tiles, true); try{ applyAura(); }catch(e){}
  renderTiles();
  const tray = $('#tray'); if(tray) tray.style.visibility = '';
}
// star size follows everything he swallowed: letters + stored damage
function kStarSize(letters, store){
  return Math.min(9, .9 + (letters||0)*.11 + Math.log10(1 + (store||0))*.35);
}
// the star sprite (SNES Kirby Super Star warp-star frames): 4 frames that flash yellow / white and turn
const KSTAR = { big:{ src:'heroes/kirby/star.png', px:24, n:4 }, mini:{ src:'heroes/kirby/starmini.png', px:16, n:4 } };
function kStarSprite(kind, size, ms){
  const K = KSTAR[kind], g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.innerHTML = `<svg x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" viewBox="0 0 ${K.px} ${K.px}" overflow="hidden"><image href="${K.src}?v=${HERO_IMG_VER}" width="${K.px*K.n}" height="${K.px}" style="image-rendering:pixelated"/></svg>`;
  const sv = g.firstElementChild; let f = Math.floor(Math.random()*K.n);
  const step = ()=>{ sv.setAttribute('viewBox', `${f*K.px} 0 ${K.px} ${K.px}`); f = (f+1) % K.n; };
  step(); const t = setInterval(()=>{ if(!g.isConnected) return clearInterval(t); step(); }, ms||70);
  return g;
}
function kStar(s){
  const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return Promise.resolve();
  const m = mouthXY(), D = 56*s;
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.innerHTML = `<circle r="${D*.62}" fill="#fff6a0" opacity=".3"/>`;
  g.appendChild(kStarSprite('big', D, 60));
  fx.appendChild(g);
  const ex = EN_X, ey = FLOOR_Y - e.h*e.sc*.5, dur = 430 + Math.min(400, s*45);
  // a big star starts small at the mouth and swells on its way
  return anim(g, [{ transform:tr(m.x, m.y)+' scale(.25)' },{ transform:tr((m.x+ex)/2, Math.min(m.y, ey)-30-s*6)+' scale(1)', offset:.5 },{ transform:tr(ex, ey)+' scale(1.1)' }], { duration:dur, easing:'ease-in' })
    .then(()=>{ g.remove(); if(s>=3){ try{ shake(true); }catch(err){} }
      const pieces = Math.min(20, 8 + Math.round(s*1.5)), q = 18*Math.min(3, .7 + s*.25);
      for(let k=0;k<pieces;k++){ const c = kStarSprite('mini', q, 80); fx.appendChild(c);
        const a = k/pieces*Math.PI*2, d = 40 + s*28; anim(c, [{ transform:tr(ex,ey)+' scale(.6)', opacity:1 },{ transform:tr(ex+Math.cos(a)*d, ey+Math.sin(a)*d)+' scale(1.3)', opacity:0 }], { duration:520 + s*30, easing:'ease-out' }).then(()=>c.remove()); } });
}

/* ------------------------------ the moves (replace the normal attack animation) ------------------------------ */
heroAttack = (f=>async function(lv, rude){
  const b = ui.bat, act = b && isKirby() && b.kAct, r = b && b.kPend;
  if(!act) return f.apply(this, arguments);
  const e = curEnemy();
  if(act==='eat' || act==='suck'){
    heroPose('pose-inhale', 1450);
    floatText('🌀 ดูด!!', HERO_X+30, FLOOR_Y-190, '#ffb0e0', 30, true);
    try{ sfx.power && sfx.power(); slide(200, 900, 1.1, 'sawtooth', .05); }catch(err){}
    kSuction(1100);
    await sleep(260);
    const L0 = b.kLetters||0, got = kSuckLetters();
    const eg = $('#enemyG');
    if(act==='eat' && eg){
      // the enemy is pulled off its feet and shrinks into his mouth
      const m = mouthXY();
      anim(eg, [{ transform:tr(EN_X,FLOOR_Y) },{ transform:tr(EN_X-30,FLOOR_Y-8)+' rotate(-8deg)', offset:.25 },{ transform:tr((EN_X+m.x)/2, m.y+30)+' scale(.6) rotate(-120deg)', offset:.7 },{ transform:tr(m.x, m.y+40)+' scale(.05) rotate(-300deg)' }], { duration:760, easing:'ease-in', fill:'forwards' });
    } else if(eg){
      // bosses resist: they lean in but stay put
      anim(eg, [{ transform:tr(EN_X,FLOOR_Y) },{ transform:tr(EN_X-26,FLOOR_Y) },{ transform:tr(EN_X-14,FLOOR_Y) },{ transform:tr(EN_X-28,FLOOR_Y) },{ transform:tr(EN_X,FLOOR_Y) }], { duration:900 });
      setTimeout(()=>floatText(`${e && e.boss ? 'บอส' : 'มินิบอส'}ดูดไม่ขึ้น! ดูดตัวอักษรแทน`, EN_X-20, FLOOR_Y-(e ? e.h*e.sc : 120)-40, '#ffd0f0', 20), 250);
    }
    await sleep(Math.max(820, got*45 + 600));                           // wait for the last letter to land
    // the mouth is full now → mouthful set of animations
    b.kLetters = L0 + got;
    b.kStore = (b.kStore||0) + ((r && r.kAdd) || 0);
    if(act==='eat') b.kEaten = (b.kEaten||0) + 1;
    kSync(); kRefillBoard();
    floatText(`😋 +${got} ตัว · 💥${kFmt(b.kStore)} ⭐x${kMult(b.kLetters)}`, HERO_X, FLOOR_Y-200, '#ff8ad0', 24, true);
    if(Math.floor(b.kLetters/KIRBY.per) > Math.floor(L0/KIRBY.per)) setTimeout(()=>floatText(`⭐ x${kMult(b.kLetters)}!`, HERO_X+10, FLOOR_Y-240, '#ffe14a', 30, true), 250);
    sfx.coin && sfx.coin(.2);
    await sleep(260);
    return;
  }
  if(act==='spit'){
    heroPose('pose-fspit', 800);
    await sleep(240);
    try{ sfx.swing && sfx.swing(); }catch(err){}
    const s = kStarSize(b.kLetters, b.kStore);
    const hit = kStar(s);
    setTimeout(()=>{ b.kStore = 0; b.kLetters = 0; b.kEaten = 0; kSync(); kButtons(); }, 380);   // mouth empties as the star leaves
    await hit;
    floatText(s>=5 ? '🌟 MEGA STAR SPIT!!' : '⭐ STAR SPIT!', EN_X-10, FLOOR_Y-(e ? e.h*e.sc : 120)-70, '#ffe14a', s>=5 ? 34 : 28, true);
    return;
  }
  return f.apply(this, arguments);
})(heroAttack);
// while swallowing / sucking, the engine's hit number and flash on the enemy are skipped
enemyHurt = (f=>function(dmg, big){
  const b = ui.bat;
  if(b && isKirby() && (b.kAct==='eat' || b.kAct==='suck')) return;
  return f.apply(this, arguments);
})(enemyHurt);
