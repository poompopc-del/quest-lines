/* ==========================================================================
   QUEST LINES v29 — KIRBY (replaces Puff; the fighter id stays 'puff')
   --------------------------------------------------------------------------
   · a word of 5+ letters = INHALE instead of attacking
       – normal enemy → sucked in and held in his mouth (counts as a kill)
       – boss / mini boss can't be swallowed → he sucks in the letters
         instead (the whole board is refreshed)
       – either way the whole letter board is inhaled (new tiles) and his
         mouthful power goes up one level (max 5)
   · every letter he inhales flies into his mouth and adds +0.25 to his
     spit power (v34): STAR SPIT = damage × (1 + 0.25 × letters held, up to
     40 letters) + a share of every enemy he is holding.
   · while his mouth is full, a word shorter than 5 = STAR SPIT at the
     current enemy. Another 5+ word inhales again (letters keep adding up).
   · two animation sets: normal (idle/walk/hurt + slide · roll · flip
     attacks) and mouthful (fidle/fwalk/fhurt + spit), switched by the
     'kfull' class on the actor. Sprites: heroes/kirby/*.png
   Everything is a wrapper — the battle engine is untouched.
   ========================================================================== */
const KIRBY = { id:'puff', min:5, cap:5, perLetter:.25, maxLetters:40, store:.4 };
const isKirby = ()=>typeof charIs==='function' && charIs(KIRBY.id);
// spit power: +0.25 for every letter in his mouth
const kMult = letters=>1 + KIRBY.perLetter*Math.min(KIRBY.maxLetters, letters||0);

/* ------------------------------ mouthful look ------------------------------ */
(function(){
  const k = '.spr-puff', css = `
    #heroA.kfull ${k} .spr-a{display:none !important}
    #heroA.kfull:not(.walk):not(.hurt):not(.dead):not([class*="pose-"]) ${k} .spr-a-fidle{display:inline !important}
    #heroA.kfull.walk:not(.hurt):not(.dead):not([class*="pose-"]) ${k} .spr-a-fwalk{display:inline !important}
    #heroA.kfull.hurt:not(.dead):not([class*="pose-"]) ${k} .spr-a-fhurt{display:inline !important}
    #heroA.kfull.dead ${k} .spr-a-dead{display:inline !important}
    #heroA.kfull.pose-inhale ${k} .spr-a-inhale,#heroA.kfull.pose-fspit ${k} .spr-a-fspit{display:inline !important}
    .k-badge{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:1px 8px;border-radius:999px;font:italic 800 12px var(--hand);color:#fff;background:linear-gradient(#ff8ad0,#e0409a);box-shadow:0 0 10px rgba(255,120,200,.6);white-space:nowrap}
    .k-letter{position:fixed;z-index:60;pointer-events:none;font:900 22px/1 var(--hand);color:#2a1a10;background:#fff8ec;border:2px solid #2a1a10;border-radius:6px;padding:3px 6px;text-transform:uppercase}`;
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
  const full = !!(b && isKirby() && (b.kStack > 0 || b.kLetters > 0));
  a.classList.toggle('kfull', full);
  const me = document.querySelector('.hud .me'); if(!me) return;
  let el = $('#kBadge');
  if(!full){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('span'); el.id = 'kBadge'; el.className = 'k-badge'; me.appendChild(el); }
  el.textContent = `😋${b.kLetters||0} ⭐x${kMult(b.kLetters).toFixed(2)}`; el.title = `อม ${b.kLetters||0} ตัวอักษร`;
}
buildBattleDom = (f=>function(){ const r = f.apply(this, arguments); try{ kSync(); }catch(e){} return r; })(buildBattleDom);
updateHud = (f=>function(){ const r = f.apply(this, arguments); try{ if(isKirby()) kSync(); }catch(e){} return r; })(updateHud);

/* ------------------------------ what a word does ------------------------------ */
evalWord = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat;
  if(!b || !isKirby() || r.state!=='ok' || r.rude) return r;
  const e = curEnemy(); if(!e) return r;
  const stack = b.kStack || 0, gain = b.tiles.length - b.sel.length, after = Math.min(KIRBY.maxLetters, (b.kLetters||0) + gain);
  if(r.w.length >= KIRBY.min){
    if(!e.boss && !e.mini){ r.kMode = 'eat'; r.dmg = Math.max(r.dmg, Math.ceil(e.hp)); r.notes.unshift(`🌀 ดูด! กลืน ${e.name} + ตัวอักษร ${gain} ตัว → ⭐x${kMult(after).toFixed(2)}`); }
    else { r.kMode = 'suck'; r.dmg = 0; r.notes.unshift(`🌀 ${e.boss?'บอส':'มินิบอส'}ดูดไม่ได้ → ดูดตัวอักษร ${gain} ตัว → ⭐x${kMult(after).toFixed(2)}`); }
  } else if(stack > 0 || b.kLetters > 0){
    const m = kMult(b.kLetters), bonus = b.kStore || 0;
    r.kMode = 'spit'; r.dmg = Math.max(1, Math.round(r.dmg*m + bonus));
    r.notes.unshift(`⭐ พ่นดาว x${m.toFixed(2)} (${b.kLetters||0} ตัวอักษร)${bonus?` +${bonus}`:''}`);
  }
  return r;
})(evalWord);
// the attack button tells what will happen
renderTray = (f=>function(){
  const r = f.apply(this, arguments);
  try{ if(isKirby() && ui.bat){ const w = evalWord(), d = $('#atkDmg'); if(d && w.state==='ok' && w.kMode) d.textContent = w.kMode==='spit' ? `⭐${w.dmg}` : '🌀'; } }catch(e){}
  return r;
})(renderTray);

doAttack = (f=>async function(){
  const b = ui.bat;
  if(!b || !isKirby() || b.busy) return f.apply(this, arguments);
  const r = evalWord(); b.kAct = r.state==='ok' ? (r.kMode || null) : null;
  try{ return await f.apply(this, arguments); }
  finally{ if(ui.bat===b){ b.kAct = null; kSync(); } }
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
// every letter left on the board flies one by one into his mouth; each one is +0.25 spit power
function kSuckLetters(){
  const b = ui.bat; if(!b) return 0;
  const M = kMouthScreen(); let n = 0;
  document.querySelectorAll('#tiles .tile').forEach((t)=>{
    const idx = +t.dataset.i; if(b.sel.includes(idx)) return;          // the spelled word is the attack itself
    const r = t.getBoundingClientRect(), d = document.createElement('div'), k = n++;
    d.className = 'k-letter'; d.textContent = t.firstChild ? String(t.firstChild.textContent||'').trim().slice(0,2) : '';
    d.style.left = r.left + r.width/2 - 14 + 'px'; d.style.top = r.top + r.height/2 - 14 + 'px';
    document.body.appendChild(d);
    const dx = M.x - (r.left + r.width/2), dy = M.y - (r.top + r.height/2);
    d.animate([{ transform:'translate(0,0) scale(1) rotate(0)', opacity:1 },{ transform:`translate(${dx*.45}px,${dy*.55 - 60}px) scale(.9) rotate(${k%2?120:-120}deg)`, opacity:1, offset:.55 },{ transform:`translate(${dx}px,${dy}px) scale(.12) rotate(${k%2?300:-300}deg)`, opacity:.3 }], { duration:560, delay:k*45, easing:'ease-in', fill:'forwards' })
      .finished.catch(()=>{}).then(()=>{ d.remove(); if(ui.bat!==b) return;
        b.kLetters = Math.min(KIRBY.maxLetters, (b.kLetters||0) + 1); kSync();
        try{ tone(500 + k*35, .04, 'triangle', .03); }catch(err){} });
    t.style.visibility = 'hidden';
  });
  return n;
}
function kRefillBoard(){
  const b = ui.bat; if(!b) return;
  b.tiles = b.tiles.map((t,i)=>b.sel.includes(i) ? t : Object.assign(newTile(b.stage.s), { fresh:true }));
  balanceTiles(b.tiles, true); try{ applyAura(); }catch(e){}
  renderTiles();
}
function kStar(n){
  const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return Promise.resolve();
  const m = mouthXY(), s = 1 + Math.min(4, n)*.25;
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.innerHTML = `<circle r="${30*s}" fill="#fff6a0" opacity=".35"/><path d="M0,${-26*s} L${7*s},${-8*s} L${26*s},${-8*s} L${11*s},${4*s} L${16*s},${24*s} L0,${12*s} L${-16*s},${24*s} L${-11*s},${4*s} L${-26*s},${-8*s} L${-7*s},${-8*s} Z" fill="#ffe14a" stroke="#2a1a10" stroke-width="3" stroke-linejoin="round"/><circle cx="${-5*s}" cy="${-2*s}" r="${2.4*s}" fill="#2a1a10"/><circle cx="${5*s}" cy="${-2*s}" r="${2.4*s}" fill="#2a1a10"/>`;
  fx.appendChild(g);
  const ex = EN_X, ey = FLOOR_Y - e.h*e.sc*.5;
  return anim(g, [{ transform:tr(m.x, m.y)+' scale(.4) rotate(0deg)' },{ transform:tr((m.x+ex)/2, Math.min(m.y, ey)-30)+' scale(1) rotate(360deg)', offset:.5 },{ transform:tr(ex, ey)+' scale(1.1) rotate(720deg)' }], { duration:430, easing:'ease-in' })
    .then(()=>{ g.remove(); for(let k=0;k<8;k++){ const c = document.createElementNS('http://www.w3.org/2000/svg','path'); c.setAttribute('d','M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z'); c.setAttribute('fill','#ffe14a'); fx.appendChild(c);
      const a = k/8*Math.PI*2, d = 40 + n*10; anim(c, [{ transform:tr(ex,ey)+' scale(.6)', opacity:1 },{ transform:tr(ex+Math.cos(a)*d, ey+Math.sin(a)*d)+' scale(1.4)', opacity:0 }], { duration:520, easing:'ease-out' }).then(()=>c.remove()); } });
}

/* ------------------------------ the moves (replace the normal attack animation) ------------------------------ */
heroAttack = (f=>async function(lv, rude){
  const b = ui.bat, act = b && isKirby() && b.kAct;
  if(!act) return f.apply(this, arguments);
  const e = curEnemy();
  if(act==='eat' || act==='suck'){
    heroPose('pose-inhale', 1450);
    floatText('🌀 ดูด!!', HERO_X+30, FLOOR_Y-190, '#ffb0e0', 30, true);
    try{ sfx.power && sfx.power(); slide(200, 900, 1.1, 'sawtooth', .05); }catch(err){}
    kSuction(1100);
    await sleep(260);
    const got = kSuckLetters();
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
    b.kStack = Math.min(KIRBY.cap, (b.kStack||0) + 1);
    if(act==='eat' && e) b.kStore = (b.kStore||0) + Math.round(e.maxHp*KIRBY.store);
    kSync(); kRefillBoard();
    floatText(`😋 +${got} ตัวอักษร ⭐x${kMult(b.kLetters).toFixed(2)}`, HERO_X, FLOOR_Y-200, '#ff8ad0', 24, true);
    sfx.coin && sfx.coin(.2);
    await sleep(260);
    return;
  }
  if(act==='spit'){
    heroPose('pose-fspit', 800);
    await sleep(240);
    try{ sfx.swing && sfx.swing(); }catch(err){}
    const n = Math.min(5, Math.ceil((b.kLetters||0)/8));                 // star size follows the letters held
    const hit = kStar(n);
    setTimeout(()=>{ b.kStack = 0; b.kStore = 0; b.kLetters = 0; kSync(); }, 380);   // mouth empties as the star leaves
    await hit;
    floatText('⭐ STAR SPIT!', EN_X-10, FLOOR_Y-(e ? e.h*e.sc : 120)-70, '#ffe14a', 28, true);
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
