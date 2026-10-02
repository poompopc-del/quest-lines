/* ==========================================================================
   LETTERⁿ v66 — BESTIARY UPGRADE (presentation only · monster keys unchanged)
   --------------------------------------------------------------------------
   1) SLIMES — full MapleStory animation sets (ripped by Random Talking Bush,
      The Spriters Resource) instead of the old 3-frame idle strips:
        cells 0-2 idle · 3-9 hop / jump-attack · 10 alert · 11 hit · 12-15 melt
      enemies/slime2/<colour>.png · plus two new skins:
        silver → Chapter 3 'iceslime' (Frost Slime)
        magma  → Chapter 4 'magmaslime' (Magma Slime, recoloured red slime)
   2) BLACK DRAGON — Chapter 4 boss 'dragon' (Heroes of Might and Magic II ·
      Black Dragon, ripped by Maxim): breathing idle · fire breath · flinch ·
      death · flight. Its charged turn takes to the air, the next turn it
      spits an Inferno Ball (fireball frames from Shrek: Hassle at the
      Castle, ripped by A.J. Nitro) that bursts on the hero.
   Must load after boss-encounter.js (SPRITES / spritePose) and zombies.js.
   ========================================================================== */
(function(){
  if(typeof SPRITES==='undefined' || typeof spritePose!=='function') return;
  const range = (a, b) => Array.from({ length:b-a+1 }, (_, i) => a+i);
  /* ---------- slimes ---------- */
  const DIM = { big:{ fw:84, fh:87, ax:36 }, small:{ fw:75, fh:84, ax:32 } };
  const SL = { green:'small', blue:'big', yellow:'big', devil:'big', orange:'big', red:'small', coke:'big', golden:'small', silver:'small', magma:'small' };
  const COL = { silver:'#cfe0ea', magma:'#ff8a2a' };
  Object.entries(SL).forEach(([k, d]) => {
    const D = DIM[d], old = SPRITES[k] || {};
    SPRITES[k] = Object.assign({}, old, { img:`enemies/slime2/${k}.png`, fw:D.fw, fh:D.fh, ax:D.ax, cells:16, frames:undefined,
      idle:[0,1,2,1], atk:[3,5,6,7,8,9], hurt:[11], dead:[12,13,14,15], col:old.col || COL[k], rate:.22, top:52/D.fh, slime2:true });
  });
  try{ SLIME_SPRITES.add('silver'); SLIME_SPRITES.add('magma'); }catch(e){}
  const skin = (key, sp, name, th) => { const M = MON[key]; if(!M) return; const sc = 1.75;
    Object.assign(M, { name, th, sprite:sp, spScale:sc, sc:1, h:Math.round(50*sc*.8), pal:{ a:SPRITES[sp].col, b:SPRITES[sp].col, c:SPRITES[sp].col } }); };
  skin('iceslime',  'silver', 'Frost Slime', 'สไลม์น้ำแข็งเงิน');
  skin('magmaslime','magma',  'Magma Slime', 'สไลม์ลาวาเดือด');

  /* ---------- the Black Dragon ---------- */
  const DR = { idle:range(0,12), breath:range(13,19), hurt:[20,21,22,23], dead:range(24,28), fly:range(29,36) };
  SPRITES.bdragon = { img:'bosses/dragon/blackdragon.png', fw:246, fh:134, ax:128, cells:37, idle:DR.idle, atk:DR.breath, heavy:DR.breath, hurt:[21,22],
    dead:DR.dead, fly:DR.fly, col:'#e0a030', pixel:true, rate:.16, top:.82 };
  if(MON.dragon){
    const sc = 2.25;
    Object.assign(MON.dragon, { name:'Black Dragon', th:'มังกรทมิฬ เปลวนรก', sprite:'bdragon', spScale:sc, sc:1, h:Math.round(134*sc*.75), pal:{ a:'#e0a030', b:'#e0a030', c:'#e0a030' } });
    try{ LORE.forEach(l => { if(l.id==='boss3'){ l.t = 'บันทึกการปราบ Black Dragon'; l.reqTxt = 'ปราบ Black Dragon'; } }); }catch(e){}
  }
  const isDragon = e => !!(e && MON[e.key] && MON[e.key].sprite==='bdragon');

  // an animated strip in the fx layer (fireball / burst)
  function fxStrip(src, fw, fh, n, ms, scale, x, y, loop){
    const fx = $('#fx'); if(!fx) return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = `<svg x="${-fw*scale/2}" y="${-fh*scale/2}" width="${fw*scale}" height="${fh*scale}" viewBox="0 0 ${fw} ${fh}" overflow="hidden" class="spr-pixel"><image href="${src}" width="${fw*n}" height="${fh}"/></svg>`;
    g.setAttribute('transform', `translate(${x},${y})`); fx.appendChild(g);
    const img = g.querySelector('image'); let k = 0;
    g._i = setInterval(() => { k++; if(k>=n){ if(!loop){ clearInterval(g._i); g.remove(); return; } k = n-3; } img.setAttribute('x', -k*fw); }, ms);
    return g;
  }
  async function infernoBall(){
    const x0 = EN_X - 120, y0 = FLOOR_Y - 190, x1 = HERO_X + 10, y1 = FLOOR_Y - 70;
    const ball = fxStrip('bosses/dragon/fireball.png', 56, 32, 6, 70, 3.2, x0, y0, true); if(!ball) return;
    ball.style.transform = `translate(${x0}px,${y0}px)`; ball.removeAttribute('transform');
    try{ sfx.elem('fire'); }catch(e){}
    await anim(ball, [{ transform:`translate(${x0}px,${y0}px)` },{ transform:`translate(${x1}px,${y1}px)` }], { duration:520, easing:'ease-in' });
    clearInterval(ball._i); ball.remove();
    fxStrip('bosses/dragon/boom.png', 53, 48, 8, 70, 3.6, x1, y1-10, false);
    for(let k=0;k<6;k++) setTimeout(() => { try{ hitSpark(x1 + rint(-40,40), y1 + rint(-50,30)); }catch(e){} }, k*60);
  }
  // charge turn: the dragon takes off (flight loop held until its next pose)
  enemyCharge = (f => async function(){
    const e = curEnemy();
    if(isDragon(e)){
      const K = SPRITES.bdragon; spritePose(e, K.fly, 95, true);
      const g = document.querySelector('#enemyG .spr-enemy');
      if(g) anim(g, [{ transform:'translate(0,0)' },{ transform:'translate(0,-46px)' }], { duration:600, easing:'ease-out', fill:'forwards' });
      floatText('🐉 บินขึ้นสูง… เทิร์นหน้า INFERNO BALL!', EN_X-60, FLOOR_Y-e.h-20, '#ffb04a', 20, true);
      await sleep(700);
      return;
    }
    return f.apply(this, arguments);
  })(enemyCharge);
  enemyAttackAnim = (f => async function(){
    const e = curEnemy();
    if(isDragon(e)){
      const heavy = e.traits.includes('heavy') && !e.charge;
      const g = document.querySelector('#enemyG .spr-enemy');
      if(g) anim(g, [{ transform:getComputedStyle(g).transform==='none' ? 'translate(0,0)' : getComputedStyle(g).transform },{ transform:'translate(0,0)' }], { duration:260, fill:'forwards' });
      spritePose(e, SPRITES.bdragon.breath, 95);
      floatText(heavy ? '🔥 INFERNO BALL!' : '🔥 DRAGON BREATH', EN_X-40, FLOOR_Y-e.h-30, '#ffcf4a', heavy ? 30 : 24, true);
      try{ sfx.elem('fire'); }catch(err){}
      if(heavy){ await sleep(330); await infernoBall(); shake(true); }
      else { await sleep(420); const fx = []; for(let k=0;k<5;k++) setTimeout(() => { try{ hitSpark(HERO_X + 20 + rint(-20,30), FLOOR_Y - 80 + rint(-40,40)); }catch(err){} }, k*50); await sleep(260); }
      return;
    }
    return f.apply(this, arguments);
  })(enemyAttackAnim);
  window.QL_BESTIARY = { fxStrip, infernoBall };
})();
