/* ==========================================================================
   QUEST LINES v36 — ELITE KNIGHT (new starter) + PLINK (now bought, new kit)
   --------------------------------------------------------------------------
   ELITE KNIGHT  (id 'knight', free, everyone owns him)
     · 🛡️ เกราะเหล็ก   — takes 15% less damage (dmgTaken .85) · HP x1.1
     · ⚔️ คลื่นดาบอัศวิน — words of 5+ letters use the finisher, +20%
     · 🔥 ใจอัศวิน      — below half HP, +15% damage
   PLINK  (id 'pip', 1200 gold — saves that already had him keep him)
     · ✨ ลำแสงดาบ      — at full HP a sword beam flies ahead of the swing, +30%
     · 🔥 คลื่นดาบเพลิง — words of 6+ letters use the finisher, x1.5
     · 🛡️ โล่           — 15% chance to block an enemy attack completely
     · 📚 นักเรียนขยัน  — +1 hint per stage, ⭐ target words give +3 gold (engine)
   Everything is a wrapper — the battle engine is untouched.
   ========================================================================== */
const KNIGHT = { id:'knight', finLen:5, finMul:1.2, lowHp:.5, lowMul:1.15 };
const PLINK = { id:'pip', beamMul:1.3, finLen:6, finMul:1.5, block:.15 };
const isKnight = ()=>save.eq && save.eq.char===KNIGHT.id;
const isPlink = ()=>save.eq && save.eq.char===PLINK.id;
CHAR_TIP.knight = 160;

/* ------------------------------ damage ------------------------------ */
evalWord = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat;
  if(!b || r.state!=='ok' || r.rude) return r;
  let m = 1;
  if(isKnight()){
    if(r.w.length >= KNIGHT.finLen){ m *= KNIGHT.finMul; r.notes.unshift(`⚔️ คลื่นดาบอัศวิน +${Math.round((KNIGHT.finMul-1)*100)}%`); }
    if(b.hp > 0 && b.hp < b.max*KNIGHT.lowHp){ m *= KNIGHT.lowMul; r.notes.unshift(`🔥 ใจอัศวิน +${Math.round((KNIGHT.lowMul-1)*100)}%`); }
  } else if(isPlink()){
    if(b.hp >= b.max){ m *= PLINK.beamMul; r.notes.unshift(`✨ ลำแสงดาบ +${Math.round((PLINK.beamMul-1)*100)}%`); }
    if(r.w.length >= PLINK.finLen){ m *= PLINK.finMul; r.notes.unshift(`🔥 คลื่นดาบเพลิง x${PLINK.finMul}`); }
  }
  if(m !== 1) r.dmg = Math.max(1, Math.round(r.dmg*m));
  return r;
})(evalWord);

/* ------------------------------ Plink: sword beam ------------------------------ */
function plinkBeam(){
  const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return Promise.resolve();
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  // a glowing sword pointing at the enemy
  g.innerHTML = `<ellipse rx="46" ry="14" fill="#9ff6ff" opacity=".35"/>
    <path d="M-30,-4 L22,-4 L36,0 L22,4 L-30,4 Z" fill="#eaffff" stroke="#2fb8e0" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-30,-11 L-26,-11 L-26,11 L-30,11 Z" fill="#ffd34a" stroke="#2a1a10" stroke-width="2"/>
    <path d="M-42,-3 L-30,-3 L-30,3 L-42,3 Z" fill="#6a4a2a" stroke="#2a1a10" stroke-width="2"/>`;
  fx.appendChild(g);
  const sx = HERO_X + 50, sy = FLOOR_Y - 90, ex = EN_X - 10, ey = FLOOR_Y - e.h*e.sc*.5;
  try{ slide(700, 1500, .3, 'square', .04); }catch(err){}
  return anim(g, [{ transform:tr(sx, sy)+' scale(.5)', opacity:.2 },{ transform:tr(sx+40, sy)+' scale(1.1)', opacity:1, offset:.2 },{ transform:tr(ex, ey)+' scale(1.1)', opacity:1 }], { duration:340, easing:'ease-in' })
    .then(()=>{ g.remove();
      for(let k=0;k<10;k++){ const c = document.createElementNS('http://www.w3.org/2000/svg','path'); c.setAttribute('d','M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z'); c.setAttribute('fill', k%2 ? '#9ff6ff' : '#fff'); fx.appendChild(c);
        const a = k/10*Math.PI*2, d = 50; anim(c, [{ transform:tr(ex,ey)+' scale(.6)', opacity:1 },{ transform:tr(ex+Math.cos(a)*d, ey+Math.sin(a)*d)+' scale(1.3)', opacity:0 }], { duration:420, easing:'ease-out' }).then(()=>c.remove()); } });
}
heroAttack = (f=>async function(lv, rude){
  const b = ui.bat;
  if(!isPlink() || !b || rude || b.hp < b.max || !curEnemy()) return f.apply(this, arguments);
  floatText('✨ SWORD BEAM!', HERO_X+30, FLOOR_Y-205, '#bff8ff', 24, true);
  const beam = sleep(120).then(plinkBeam);
  const r = await f.apply(this, arguments);
  await beam;
  return r;
})(heroAttack);

/* ------------------------------ Plink: shield block ------------------------------ */
enemyTurn = (f=>async function(){
  const b = ui.bat;
  if(!isPlink() || !b || b.evade>0 || Math.random() >= PLINK.block) return f.apply(this, arguments);
  b.evade = 1; b.plinkBlock = true;
  try{ return await f.apply(this, arguments); }
  finally{ if(b.plinkBlock && b.evade>0) b.evade--; b.plinkBlock = false; }
})(enemyTurn);
// the engine's dodge text becomes a shield block while Plink's shield is up
floatText = (f=>function(txt){
  const b = ui.bat;
  if(b && b.plinkBlock && typeof txt==='string' && txt.startsWith('MISS!')){
    b.plinkBlock = false;
    try{ sfx.stone ? sfx.stone() : tone(900, .08, 'square', .05); }catch(e){}
    const a = [...arguments]; a[0] = '🛡️ BLOCK!'; a[3] = '#bfe8ff'; return f.apply(this, a);
  }
  return f.apply(this, arguments);
})(floatText);
