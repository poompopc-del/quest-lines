/* ==========================================================================
   LETTERⁿ v67 — HERO UPGRADES (existing heroes · presentation + small extras)
   --------------------------------------------------------------------------
   MIA  — real Shiranui flames from "Capcom vs. SNK 2 · Mai Shiranui"
          (PS2 rip, The Spriters Resource) — heroes/mia/fx/*.png
          · fan hits burst into CvS2 flames, Kagerou-no-Mai fire pillars
            with a burning ground ring
          · Shinobibachi roll leaves a trail of embers
          · Musasabi-no-Mai dive is wrapped in a diagonal flame
          · ⚔️ Damage Ultimate = CHOU HISSATSU SHINOBIBACHI: a giant flame
            charge that rolls across the stage
   (Kirby / X / Boomtos sections follow below.)
   ========================================================================== */
(function(){
  const SVGNS = 'http://www.w3.org/2000/svg';
  // play a horizontal strip once (or looped) in the fx layer.
  // anchor 'c' = centre on (x,y) · 'b' = bottom-centre on (x,y)
  function stripFx(src, w, h, n, o){
    o = o || {}; const fx = $('#fx'); if(!fx) return null;
    const s = o.scale || 2, W = w*s, H = h*s, ms = o.ms || 50;
    const g = document.createElementNS(SVGNS, 'g');
    const ox = -W/2, oy = o.anchor==='b' ? -H : -H/2;
    g.innerHTML = `<g transform="${o.flipX ? 'scale(-1,1)' : ''}${o.rot ? ` rotate(${o.rot})` : ''}"><svg x="${ox}" y="${oy}" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}" overflow="hidden"><image href="${src}?v=${HERO_IMG_VER}" width="${w*n}" height="${h}"/></svg></g>`;
    g.style.transform = tr(o.x||0, o.y||0); if(o.blend) g.style.mixBlendMode = o.blend;
    fx.appendChild(g);
    const img = g.querySelector('image'); let f = o.from || 0; const end = o.to!==undefined ? o.to : n-1;
    img.setAttribute('x', -f*w);
    g._i = setInterval(() => { f++; if(f > end){ if(o.loop){ f = o.loopFrom || 0; } else { clearInterval(g._i); g.remove(); return; } } img.setAttribute('x', -f*w); }, ms);
    g._stop = () => { clearInterval(g._i); g.remove(); };
    return g;
  }
  window.QL_STRIP_FX = stripFx;

  /* ------------------------------ MIA ------------------------------ */
  const MF = { flame:{ w:75, h:53, n:27 }, burst:{ w:110, h:82, n:24 }, swirl:{ w:82, h:78, n:13 }, trail:{ w:95, h:80, n:24 },
               pillar:{ w:73, h:106, n:26 }, ring:{ w:77, h:22, n:15 }, ember:{ w:66, h:39, n:18 } };
  const mfx = (k, o) => { const F = MF[k]; return stripFx(`heroes/mia/fx/${k}.png`, F.w, F.h, F.n, o); };
  Object.keys(MF).forEach(k => { const i = new Image(); i.src = `heroes/mia/fx/${k}.png?v=${HERO_IMG_VER}`; });
  const miaOn = () => save.eq && save.eq.char==='mao';
  window.QL_MIA_FX = mfx;

  if(typeof miaBurst==='function'){
    miaBurst = (f => function(x, y, scale){ if(!miaOn()) return f.apply(this, arguments);
      mfx('flame', { x, y, scale:(scale||2.4)*.75, ms:34 }); })(miaBurst);
  }
  if(typeof firePillar==='function'){
    firePillar = (f => function(x, s){ if(!miaOn()) return f.apply(this, arguments);
      s = s || 1;
      mfx('pillar', { x, y:FLOOR_Y+10, anchor:'b', scale:1.9*s, ms:36 });
      mfx('ring',   { x, y:FLOOR_Y+6, scale:1.6*s, ms:45 }); })(firePillar);
  }
  // choreography extras on top of Mia's own moves
  heroAttack = (f => async function(lv, rude){
    if(!miaOn() || !ui.bat) return f.apply(this, arguments);
    const h = ui.maoHit, mv = h && !rude ? h.mv : null;
    try{
      if(mv==='fan'){ setTimeout(() => mfx('swirl', { x:HERO_X+40, y:FLOOR_Y-110, scale:1.6, ms:40 }), 380); }
      if(mv==='roll'){ const D = sprMs('roll', 1400);
        for(let k=0;k<6;k++) setTimeout(() => { const x = HERO_X + (EN_X-95-HERO_X)*(k/6); mfx('ember', { x, y:FLOOR_Y-40, scale:1.5, ms:40 }); }, Math.round(D*.18 + k*D*.045)); }
      if(mv==='fin'){ const D = sprMs('fin', 2100);
        setTimeout(() => { const t = mfx('trail', { x:HERO_X+90, y:FLOOR_Y-200, scale:2, flipX:true, loop:true, from:4, loopFrom:4, to:14, ms:40 });
          if(t) anim(t, [{ transform:tr(HERO_X+90, FLOOR_Y-200) },{ transform:tr(EN_X-80, FLOOR_Y-50) }], { duration:Math.round(D*.22), easing:'ease-in', fill:'forwards' }).then(() => t._stop()); }, Math.round(D*.32)); }
      if(!h && lv===5 && !rude) return await miaSuper(f, lv, rude);
    }catch(e){}
    return f.apply(this, arguments);
  })(heroAttack);
  // ⚔️ Damage Ultimate: Chou Hissatsu Shinobibachi
  async function miaSuper(f, lv, rude){
    const g = $('#heroG'); ui.slashLv = lv; ui.slashRude = false;
    floatText('超必殺忍蜂!', HERO_X+40, FLOOR_Y-250, '#ffcf4a', 30, true);
    floatText('CHOU HISSATSU SHINOBIBACHI', HERO_X+40, FLOOR_Y-215, '#ffd0e8', 16, true);
    heroPose('pose-roll', sprMs('roll', 1400)+80);
    try{ sfx.elem('fire'); }catch(e){}
    const ball = mfx('burst', { x:HERO_X+60, y:FLOOR_Y-70, scale:2.2, loop:true, from:0, loopFrom:4, to:16, ms:40 });
    const ex = EN_X - 90;
    const p = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X-14,FLOOR_Y),offset:.15},{transform:tr(ex,FLOOR_Y),offset:.5},{transform:tr(ex,FLOOR_Y),offset:.72},{transform:tr(HERO_X,FLOOR_Y)}], { duration:1300, easing:'ease-in-out' });
    if(ball) anim(ball, [{transform:tr(HERO_X+60,FLOOR_Y-70)},{transform:tr(HERO_X+40,FLOOR_Y-70),offset:.15},{transform:tr(EN_X-30,FLOOR_Y-70),offset:.5},{transform:tr(EN_X-20,FLOOR_Y-70)}], { duration:1000, easing:'ease-in-out', fill:'forwards' }).then(() => ball._stop());
    await sleep(650); slash(); shake(true);
    [0,140,280].forEach((d,i) => setTimeout(() => firePillar(EN_X + (i-1)*40, 1.15), d));
    await p;
  }

  /* ------------------------------ KIRBY ------------------------------
     Kirby Super Star Ultra reactions (ripped by Drshnaps):
       · ice chapter / frost hits  → frozen into an ice block
       · lava chapter / fire hits  → burned (the "burned" palette flames)
       · spells (cast / hex)       → shocked
       · 🛡 guard → the KSSU guard squat
     ------------------------------------------------------------------ */
  try{ if(window.QL_ADD_ANIMS) QL_ADD_ANIMS('puff', { guard:{ n:5, cw:30, ax:14, dur:.5, th:'การ์ด (ตัวกลม)' } }, { extra:['guard'] }); }catch(e){}
  const KF = { burned:{ w:41, h:40, n:10, ms:60 }, shocked:{ w:40, h:40, n:8, ms:55 }, frozen:{ w:27, h:26, n:7, ms:70 } };
  Object.keys(KF).forEach(k => { const i = new Image(); i.src = `heroes/kirby/${k}.png?v=${HERO_IMG_VER}`; });
  const kirbyOn = () => save.eq && save.eq.char==='puff';
  function kirbyState(){
    const b = ui.bat, e = curEnemy(); if(!b || !e) return null;
    const k = e.tacKindNow;
    if(k==='cast2' || k==='hex' || e.caster) return 'shocked';
    const ch = b.stage && b.stage.ch;
    if(ch===2) return 'frozen';
    if(ch===3) return 'burned';
    return null;
  }
  heroHurt = (f => function(dmg, big, toxic){
    const out = f.apply(this, arguments);
    try{
      if(!kirbyOn() || toxic) return out;
      const st = kirbyState(); if(!st || (!big && st!=='shocked' && Math.random() < .5)) return out;
      const F = KF[st], a = $('#heroA'); if(!a) return out;
      const g = stripFx(`heroes/kirby/${st}.png`, F.w, F.h, F.n, { x:HERO_X, y:FLOOR_Y+2, anchor:'b', scale:3.8, ms:F.ms });
      a.style.opacity = '0';
      setTimeout(() => { a.style.opacity = ''; }, F.n*F.ms);
      floatText(st==='frozen' ? '🧊 แข็ง!' : st==='burned' ? '🔥 ไหม้!' : '⚡ ช็อต!', HERO_X, FLOOR_Y-170, st==='frozen' ? '#bff6ff' : st==='burned' ? '#ffb04a' : '#fff36a', 22, true);
    }catch(e){}
    return out;
  })(heroHurt);
  // 🛡 guard pose: see GUARD_POSE in heroplus.js (puff → 'guard')
  /* ------------------------------ X ------------------------------
     Z-SABER (from the "X (PS1-Style, Extended)" custom sheet) — an
     uncharged word of 6+ letters is a saber combo instead of a lemon:
       6 letters  overhead Z-Saber slash        +15%
       7+ letters triple crescent (ร้อยจันทร์) +25%
     A stored charge always fires the buster as before.
     ------------------------------------------------------------------ */
  try{ if(window.QL_ADD_ANIMS) QL_ADD_ANIMS('x', {
    saber:  { n:11, cw:82,  ax:40, dur:.8, th:'Z-เซเบอร์' },
    saber2: { n:13, cw:102, ax:48, dur:1,  th:'Z-เซเบอร์ จันทร์เสี้ยว' } }, { extra:['saber','saber2'] }); }catch(e){}
  const XS = { len:6, big:7, mul:.15, bigMul:.25 };
  const xOn = () => save.eq && save.eq.char==='x';
  const xSaberOf = (b, r) => (!b || b.xCharging || (b.xLvl||0) > 0 || !r || r.state!=='ok' || r.rude) ? null :
    (VocabularyManager.wordLength(r.w) >= XS.big ? 'saber2' : VocabularyManager.wordLength(r.w) >= XS.len ? 'saber' : null);
  evalWord = (f => function(){
    const r = f.apply(this, arguments);
    if(!xOn()) return r;
    const s = xSaberOf(ui.bat, r);
    if(s==='saber')  dmgMod(r, 'bonus', XS.mul,    `🗡 Z-SABER +${BALANCE.pct(XS.mul)}%`);
    if(s==='saber2') dmgMod(r, 'bonus', XS.bigMul, `🌙 Z-SABER COMBO +${BALANCE.pct(XS.bigMul)}%`);
    if(r) r.xSaber = s;
    return r;
  })(evalWord);
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!xOn() || !b || b.busy) return f.apply(this, arguments);
    const r = evalWord(); ui.xSab = r && r.xSaber || null;
    try{ return await f.apply(this, arguments); } finally { ui.xSab = null; }
  })(doAttack);
  heroAttack = (f => async function(lv, rude){
    const b = ui.bat, s = ui.xSab;
    if(!xOn() || !b || !s || b.xCharging || (b.xLvl||0) > 0) return f.apply(this, arguments);
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    const g = $('#heroG'), D = sprMs(s, 900), ex = EN_X - 110;
    floatText(s==='saber2' ? 'Z-SABER COMBO!' : 'Z-SABER!', HERO_X+30, FLOOR_Y-215, '#9dffb0', s==='saber2' ? 28 : 24, true);
    const A = $('#heroA'); if(A) A.classList.add('walk');
    await anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(ex,FLOOR_Y)}], { duration:240, easing:'ease-in', fill:'forwards' });
    if(A) A.classList.remove('walk');
    heroPose('pose-'+s, D+60);
    try{ tone(1200, .08, 'sawtooth', .04); }catch(e){}
    await sleep(Math.round(D*(s==='saber2' ? .3 : .38)));
    slash(); shake(s==='saber2');
    if(s==='saber2') setTimeout(() => { try{ hitSpark(EN_X-10, FLOOR_Y-110); hitSpark(EN_X+10, FLOOR_Y-60); }catch(e){} }, 160);
    await sleep(Math.round(D*.55));
    await anim(g, [{transform:tr(ex,FLOOR_Y)},{transform:tr(HERO_X,FLOOR_Y)}], { duration:260, easing:'ease-out', fill:'forwards' });
    g.getAnimations().forEach(a => a.cancel());
  })(heroAttack);
  /* ------------------------------ ELITE KNIGHT ------------------------------
     the sheet's unused golden sword-arc (heroes/knight/arc.png) now flashes
     on every blow — bigger on the finisher and the Ultimate
     ------------------------------------------------------------------ */
  { const i = new Image(); i.src = `heroes/knight/arc.png?v=${HERO_IMG_VER}`; }
  function knightArc(big){
    const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return;
    const s = big ? 1.9 : 1.25, w = 166*s, h = 110*s, y = FLOOR_Y - Math.min(140, e.h*e.sc*.55);
    const g = document.createElementNS(SVGNS, 'g');
    g.innerHTML = `<image href="heroes/knight/arc.png?v=${HERO_IMG_VER}" x="${-w*.55}" y="${-h/2}" width="${w}" height="${h}" style="image-rendering:pixelated"/>`;
    fx.appendChild(g);
    anim(g, [{ transform:tr(EN_X-20, y)+' rotate(-18deg) scale(.6)', opacity:0 },{ transform:tr(EN_X-10, y)+' rotate(0deg) scale(1)', opacity:1, offset:.25 },{ transform:tr(EN_X+10, y)+' rotate(12deg) scale(1.08)', opacity:0 }], { duration:big ? 520 : 380, easing:'ease-out' }).then(() => g.remove());
  }
  slash = (f => function(){
    const out = f.apply(this, arguments);
    try{ if(save.eq && save.eq.char==='knight' && ui.bat) knightArc((ui.slashLv||0) >= 4); }catch(e){}
    return out;
  })(slash);

  /* ------------------------------ ELON ------------------------------
     combat roll (cartwheel frames from the PXZ2 Leon sheet) — used for
     🛡 guard and for dodging (MISS)
     ------------------------------------------------------------------ */
  try{ if(window.QL_ADD_ANIMS) QL_ADD_ANIMS('elon', { roll:{ n:7, cw:161, ax:62, dur:.75, th:'กลิ้งหลบ' } }, { extra:['roll'] }); }catch(e){}

  /* ------------------------------ BOOMTOS ------------------------------
     unused frames from Boomtos.png:
       · SLAM — leaps and smashes the ground, dust shock wave (selectable
         attack pose; the ground wave also shakes the enemy)
       · REVEAL — enters each stage in a red hooded robe, then flings it off
     ------------------------------------------------------------------ */
  try{ if(window.QL_ADD_ANIMS) QL_ADD_ANIMS('boomtos', {
    slam:   { n:11, cw:109, ax:49, dur:1.1, th:'ทุบแผ่นดิน (แผ่นดินไหว)' },
    reveal: { n:15, cw:84,  ax:42, dur:1.6, th:'สะบัดผ้าคลุม' } }, { attacks:['slam'], extra:['reveal'] }); }catch(e){}
  const boomOn = () => save.eq && save.eq.char==='boomtos';
  if(typeof intro==='function'){
    intro = (f => async function(){
      const p = f.apply(this, arguments);
      if(boomOn()){ setTimeout(() => { const a = $('#heroA'); if(a && ui.bat){ a.classList.remove('walk'); heroPose('pose-reveal', sprMs('reveal', 1600)+60); } }, 700); }
      return p;
    })(intro);
  }
  heroAttack = (f => async function(lv, rude){
    const out = f.apply(this, arguments);
    try{
      if(boomOn() && atkPoseOf()==='slam' && ui.bat){
        const D = sprMs('slam', 1100);
        setTimeout(() => { shake(true);
          for(let k=0;k<5;k++) setTimeout(() => { try{ hitSpark(HERO_X + 60 + k*((EN_X-HERO_X-60)/5), FLOOR_Y - 8); }catch(e){} }, k*45);
          const eg = $('#enemyG'); if(eg) anim(eg, [{transform:tr(EN_X,FLOOR_Y)},{transform:tr(EN_X,FLOOR_Y-26),offset:.3},{transform:tr(EN_X,FLOOR_Y)}], { duration:380, easing:'ease-out' });
        }, Math.round(D*.55));
      }
    }catch(e){}
    return out;
  })(heroAttack);
})();
