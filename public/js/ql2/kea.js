/* ==========================================================================
   LETTERⁿ v83 — KEA (เคีย) · แม่พระเพลิง "แม่จะนับถึงสาม!"   [DEV MODE ONLY]
   --------------------------------------------------------------------------
   Sprites: "Meshy AI · Character Sprite Sheet" (idle · attack · hurt · death) +
   "Meshy AI · FX Aura Wide Spaced" (red aura · slash · hit sparks/shockwave ·
   energy fade) + a pixel portrait — all supplied by the developer, cut by
   tools/kea-cut.py and tools/kea-fx.py into heroes/kea/*.png.
   devOnly:true → she only exists while developer mode is on (js/ql2/dev.js).

   CORE  🧮 แม่นับ 1-2-3 — every word counts up (๑ → ๒ → ๓)
           ๑  หนึ่ง!   JAB          red crescent
           ๒  สอง!!   ONE-TWO      +60%
           ๓  สาม!!!  MOTHER'S KICK +200% · aura · shockwave · breaks the enemy's
                       prepared move · 🍚 heals 6% max HP · count resets
         7+ letters or a Critical Word = "แม่ไม่รอแล้ว!" → counts 2 at once
   PASSIVE 😡 แม่โกรธ — every hit she takes counts +1 and stacks ANGER
           (+30% damage per stack, max 3, spent by ๓) · 👁️ สายตาแม่:
           damage taken −12% per count already called
   ULTIMATE ⚡ MOTHER'S WRATH · tactical: 🖐️ COUNT TO THREE — cut-in "แม่จะนับ
           ถึงสาม!!!" · ๑ ๒ ๓ slam the screen · flurry + giant kick · damage
           ×8 Ultimate (+ anger) · shockwave hits the whole queue 60% · heals 15%
   Every effect in the FX sheet is used: aura loop · slash · sparks/shockwave · fade.
   ========================================================================== */
(function(){
  const KE = BALANCE.KEA, K = 'kea', SVGNS = 'http://www.w3.org/2000/svg';
  const pc = x => `+${BALANCE.pct(x)}%`;
  const TH = ['๐','๑','๒','๓'];
  const S = .57;   // the sheet is drawn ~212 px tall → same height on screen as Cream / Mia
  HERO_SPRITE.kea = { dir:'heroes/kea/', ch:240, scale:S, face:'-13 -125 36 36',
    anims:{
      idle:   { n:10, cw:200, ax:135, dur:1.6, loop:true },
      hurt:   { n:5,  cw:260, ax:135, dur:.5 },
      dead:   { n:8,  cw:410, ax:130, dur:1.6 },
      guard:  { n:2,  cw:220, ax:135, dur:.3,  th:'ตั้งการ์ด' },
      jab:    { n:3,  cw:260, ax:135, dur:.22, th:'หนึ่ง! (หมัด)' },
      kick:   { n:3,  cw:360, ax:135, dur:.3,  th:'สาม!!! (เตะแม่)' },
      recover:{ n:2,  cw:220, ax:135, dur:.3,  th:'ตั้งหลัก' } },
    attacks:['jab','kick'], extra:['guard','recover'], demoOnly:true, finMin:99,
    finNote:`<b>แม่นับ ๑ ๒ ๓</b> ทุกคำนับเพิ่ม · ๒ วันทู ${pc(KE.two)} · <b>๓ เตะแม่</b> ${pc(KE.three)} ทำลายท่าศัตรู ฟื้น HP · คำ ${KE.skipLen}+ ตัว / Critical นับข้าม 2 · โดนตี = แม่โกรธ นับเพิ่ม + ดาเมจ ${pc(KE.angry)}/ขั้น` };
  const FIST = { x: Math.round(60*S), y: Math.round(161*S) };
  const FOOT = { x: Math.round(115*S), y: Math.round(151*S) };
  const FXS = { aura:{ w:129, h:178, n:8 }, slash:{ w:161, h:156, n:8 }, spark:{ w:153, h:159, n:8 }, fade:{ w:129, h:173, n:9 } };
  Object.keys(FXS).forEach(k => { const i = new Image(); i.src = `heroes/kea/fx_${k}.png?v=${HERO_IMG_VER}`; });
  { const i = new Image(); i.src = `heroes/kea/cutin.jpg?v=${HERO_IMG_VER}`; }
  const fxAt = (k, o) => { const F = FXS[k]; try{ return window.QL_STRIP_FX ? QL_STRIP_FX(`heroes/kea/fx_${k}.png`, F.w, F.h, F.n, o) : null; }catch(e){ return null; } };
  // a looping strip glued to the hero (moves with her when she dashes)
  function heroFx(k, o){
    const a = $('#heroA'), F = FXS[k]; if(!a) return null;
    const s = o.scale || 1, W = F.w*s, H = F.h*s, g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'kea-aura');
    g.innerHTML = `<svg x="${-W/2}" y="${(o.y||0) - H}" width="${W}" height="${H}" viewBox="0 0 ${F.w} ${F.h}" overflow="hidden"><image href="heroes/kea/fx_${k}.png?v=${HERO_IMG_VER}" width="${F.w*F.n}" height="${F.h}"/></svg>`;
    if(o.behind) a.insertBefore(g, a.firstChild); else a.appendChild(g);
    const img = g.querySelector('image'); let f = 0;
    g._i = setInterval(() => { f = (f + 1) % F.n; img.setAttribute('x', -f*F.w); }, o.ms || 80);
    g._stop = () => { clearInterval(g._i); g.remove(); };
    return g;
  }
  (function(){
    const c = HERO_SPRITE[K]; let css = '';
    for(const [n,a] of Object.entries(c.anims)){
      css += `@keyframes spr-${K}-${n}{from{transform:translateX(0px)}to{transform:translateX(${-(a.loop?a.n:a.n-1)*a.cw}px)}}`;
      css += `.spr-demo .spr-${K} .spr-a-${n} .spr-strip{animation:spr-${K}-${n} ${a.dur}s steps(${a.loop?a.n:a.n+',jump-none'}) infinite}`;
    }
    const show = (sel, n) => `${sel} .spr-${K} .spr-a{display:none}${sel} .spr-${K} .spr-a-${n}{display:inline}`;
    css += `.spr-${K} .spr-a{display:none}.spr-${K} .spr-a-idle{display:inline}` + show('#heroA.hurt','hurt') + show('#heroA.dead','dead');
    [...c.attacks, ...c.extra].forEach(n => { css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n); });
    css += `.spr.spr-kea image{image-rendering:auto}
      #heroA.kea-hot .spr-kea image{filter:drop-shadow(0 0 3px #ff3b4e) drop-shadow(0 0 9px rgba(255,40,60,.65))}
      .kea-aura{pointer-events:none}
      .kea-badge{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:1px 8px;border-radius:10px;font-weight:800;font-size:.82em;color:#fff;background:linear-gradient(90deg,#7a0a1e,#ff3b4e);border:1px solid #ff9aa6}
      .kea-badge.c2{background:linear-gradient(90deg,#ff3b4e,#ffb03b);animation:keaPulse .45s ease-in-out infinite alternate}
      @keyframes keaPulse{to{transform:scale(1.1)}}
      #keaSky{pointer-events:none}
      .kea-num{position:absolute;left:50%;top:44%;z-index:31;pointer-events:none;font:900 clamp(90px,26vw,170px)/1 Kanit,sans-serif;color:#fff;
        -webkit-text-stroke:4px #5a0010;paint-order:stroke;text-shadow:0 0 22px #ff2a3a,0 0 60px #ff2a3a,0 6px 0 #5a0010}
      .kea-cut{position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden}
      .kea-cut .dim{position:absolute;inset:0;background:rgba(10,0,4,.55);opacity:0;animation:keaFade .25s forwards}
      .kea-cut .band{position:absolute;left:-15%;right:-15%;top:26%;height:48%;transform:skewY(-7deg) scaleX(0);transform-origin:left center;
        background:repeating-linear-gradient(100deg,rgba(255,255,255,.0) 0 26px,rgba(255,210,215,.16) 26px 30px),linear-gradient(90deg,#2a0006,#a3102a 35%,#ff3b4e 62%,#2a0006);
        box-shadow:0 0 0 4px #ffd0d6,0 0 50px #ff2a3a;animation:keaBand .32s cubic-bezier(.2,.9,.3,1) forwards}
      .kea-cut img{position:absolute;left:3%;top:15%;height:70%;width:auto;max-width:36%;aspect-ratio:1;object-fit:cover;object-position:50% 20%;border:4px solid #ffd0d6;border-radius:14px;
        box-shadow:0 0 30px #ff2a3a,0 0 0 3px #5a0010;filter:contrast(1.08) saturate(1.15);transform:translateX(-160%) rotate(-7deg);animation:keaIn .5s .12s cubic-bezier(.2,1.5,.4,1) forwards}
      .kea-cut .t1,.kea-cut .t2,.kea-cut .t3{position:absolute;left:41%;right:2%;line-height:1.05;font-family:Kanit,sans-serif;font-weight:900;color:#fff;white-space:nowrap;
        -webkit-text-stroke:2px #3a0008;paint-order:stroke;text-shadow:0 0 16px #ff2a3a;transform:translateX(130%);animation:keaIn .42s .26s cubic-bezier(.2,1.3,.4,1) forwards}
      .kea-cut .t1{top:24%;font-size:clamp(34px,10vw,84px);letter-spacing:.06em}
      .kea-cut .t2{top:44%;font-size:clamp(20px,5.6vw,46px);white-space:normal;animation-delay:.36s}
      .kea-cut .t3{top:66%;font-size:clamp(14px,3.6vw,28px);color:#ffe1e5;animation-delay:.46s}
      .kea-cut.out{animation:keaOut .3s forwards}
      @keyframes keaBand{to{transform:skewY(-7deg) scaleX(1)}}
      @keyframes keaIn{to{transform:translateX(0) rotate(0)}}
      @keyframes keaFade{to{opacity:1}}
      @keyframes keaOut{to{opacity:0;transform:scale(1.08)}}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    Object.keys(c.anims).forEach(n => { const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`; });
  })();
  try{ HERO_PORTRAIT.kea = { src:'heroes/kea/portrait.png', w:80, h:80, vb:'0 0 80 80' }; }catch(e){}

  CHARACTERS.push({ id:K, devOnly:true, name:'KEA', th:'เคีย แม่พระเพลิง', price:15000, role:'แม่นับ ๑๒๓ · ศิลปะการต่อสู้', skill:'แม่จะนับถึงสาม!',
    desc:`🧮 แม่นับ: ทุกคำนับเพิ่ม ๑ → ๒ → ๓ · ๑ หมัดแย็บ · ๒ วันทู ${pc(KE.two)} · <b>๓ เตะแม่</b> ${pc(KE.three)} ออร่าแดงระเบิด ทำลายท่าที่ศัตรูเตรียมไว้ ฟื้น HP ${BALANCE.pct(KE.heal)}% · คำ ${KE.skipLen} ตัวขึ้นไปหรือ Critical นับข้ามทีละ 2 · 😡 แม่โกรธ: โดนตีทุกครั้งนับเพิ่ม 1 + ดาเมจ ${pc(KE.angry)} ซ้อนได้ ${KE.angerMax} ขั้น · 👁️ สายตาแม่: ยิ่งนับ ยิ่งรับดาเมจน้อยลง ${BALANCE.pct(KE.glare)}%/ขั้น · พลังแม่ทุกการโจมตี ${pc(KE.power)}`,
    hpMul:1.05, get dmgTaken(){ const b = ui.bat; return b && save.eq.char===K ? Math.max(.5, 1 - (b.keaCount||0)*KE.glare) : 1; } });
  CHAR_TIP.kea = FIST.y;
  FIGHTER.kea = { c:'#ff2a4a', atk:5, def:4, spd:4, diff:2 };
  HERO_EXTRA.kea = { el:'fire', elNote:'เพลิงแม่ — ออร่าสีเลือดลุกท่วมตัวทุกครั้งที่แม่โกรธ (ใช้คำธาตุได้ทุกชนิด)',
    ult:`แม่นับ ๑ ๒ ๓ · ๓ = เตะแม่ ${pc(KE.three)} ทำลายท่าศัตรู · ⚡ MOTHER'S WRATH · Ultimate ที่ 2: 🖐️ COUNT TO THREE คัตอิน "แม่จะนับถึงสาม!!!" ดาเมจ ×${KE.finalMul} โดนทั้งคิว`,
    lore:'แม่ที่ใจดีที่สุดในโลก จนกว่าจะได้ยินว่าการบ้านยังไม่เสร็จ — แล้วเธอก็เริ่มนับ… ยังไม่เคยมีมอนสเตอร์ตัวไหนรอดถึง "สาม"' };
  try{ if(window.QL_TAC) QL_TAC.UTIL.kea = { ic:'🖐️', en:'COUNT TO THREE', get th(){ let d = ''; try{ const b = ui.bat; if(b) d = `ดาเมจ ~${fmt(finalDmg(b))} · `; }catch(e){}
    return `${d}แม่จะนับถึงสาม!!! ๑ ๒ ๓ ทุบจอ · หมัดรัว + เตะแม่ ×${KE.finalMul} (+ แม่โกรธ) · คลื่นกระแทกโดนทั้งคิว ${BALANCE.pct(KE.finalSplash)}% · ฟื้น HP ${BALANCE.pct(KE.finalHeal)}%`; } }; }catch(e){}
  try{ if(window.QL_ULTX) QL_ULTX.kea = { ic:'🧮', en:"MOTHER'S COUNT", th:'แม่นับ', how:['นับครบ ๓ (เตะแม่) <b>+30%</b>','โดนตี (แม่โกรธ) <b>+20%</b> แทนที่จะเสียเกจ'] }; }catch(e){}

  const isKea = () => save.eq && save.eq.char===K;
  const cntOf = b => (b && b.keaCount) || 0;
  const angOf = b => (b && b.keaAnger) || 0;
  const finalDmg = b => Math.max(1, Math.round(BALANCE.ultDamage(b) * KE.finalMul * (1 + angOf(b)*KE.angry)));
  const nextN = (b, len, crit) => Math.min(3, cntOf(b) + 1 + (len >= KE.skipLen || crit ? 1 : 0));
  const enY = e => FLOOR_Y - (e ? e.h*e.sc*.5 : 70);
  const gain = (n, tag) => { try{ window.QL_ULT_GAIN && QL_ULT_GAIN(n, tag); }catch(e){} };
  const tn = (f, d, t, v, dl) => { try{ tone(f, d, t||'sawtooth', v||.05, dl||0); }catch(e){} };
  const whoosh = () => { try{ noise(.12, .12); slide(900, 300, .12, 'triangle', .05); }catch(e){} };
  const boom = () => { tn(70, .8, 'sawtooth', .08); tn(140, .5, 'square', .05, .05); try{ noise(.4, .2); }catch(e){} };

  /* ------------------------------ aura · badge ------------------------------ */
  function aura(){
    const a = $('#heroA'), b = ui.bat; if(!a) return;
    const an = isKea() && b ? angOf(b) : 0, c = isKea() && b ? cntOf(b) : 0;
    const key = an >= 2 || (an && c >= 2) ? 'max' : an || c >= 2 ? 'lo' : '';
    a.classList.toggle('kea-hot', !!key);
    let g = a.querySelector('.kea-aura[data-k]');
    if(g && g.dataset.k === key) return;
    if(g) g._stop();
    if(!key) return;
    g = heroFx('aura', { scale: key==='max' ? 1.25 : 1, y:10, ms: key==='max' ? 60 : 85, behind:true });
    if(g) g.dataset.k = key;
  }
  function fade(){
    const a = $('#heroA'); const g = a && a.querySelector('.kea-aura[data-k]');
    if(g) g._stop();
    if(a) a.classList.remove('kea-hot');
    fxAt('fade', { x:HERO_X, y:FLOOR_Y-75, scale:.85, ms:55 });
  }
  function badge(){
    const me = document.querySelector('.hud .me'), b = ui.bat; let bd = $('#keaBadge');
    if(!me || !b || !isKea()){ if(bd) bd.remove(); return; }
    const c = cntOf(b), an = angOf(b);
    if(!c && !an){ if(bd) bd.remove(); aura(); return; }
    if(!bd){ bd = document.createElement('span'); bd.id = 'keaBadge'; me.appendChild(bd); }
    bd.className = 'kea-badge' + (c >= 2 ? ' c2' : '');
    bd.textContent = `🧮 นับ ${TH[c]}${an ? ` · 😡×${an}` : ''}`;
    aura();
  }
  updateHud = (f => function(){ const o = f.apply(this, arguments); try{ badge(); }catch(e){} return o; })(updateHud);

  /* ------------------------------ damage ------------------------------ */
  evalWord = (f => function(){
    const r = f.apply(this, arguments), b = ui.bat;
    if(!isKea() || !b || !r || r.state!=='ok' || r.rude) return r;
    const n = nextN(b, VocabularyManager.wordLength(r.w), r.crit), an = angOf(b);
    if(n===2) dmgMod(r, 'bonus', KE.two, `✌️ สอง!! ${pc(KE.two)}`);
    if(n>=3) dmgMod(r, 'bonus', KE.three, `🦵 สาม!!! เตะแม่ ${pc(KE.three)}`);
    if(an) dmgMod(r, 'bonus', KE.angry*an, `😡 แม่โกรธ ×${an} ${pc(KE.angry*an)}`);
    if(KE.power) dmgMod(r, 'burst', KE.power, `👩‍👧 พลังแม่ ${pc(KE.power)}`);
    if(n - cntOf(b) > 1) r.notes.unshift('⏩ แม่ไม่รอแล้ว! นับข้าม');
    r.keaN = n; r.keaMove = n>=3 ? 'three' : n===2 ? 'two' : 'one';
    return r;
  })(evalWord);

  doAttack = (f => async function(){
    const b = ui.bat;
    if(!isKea() || !b || b.busy) return f.apply(this, arguments);
    const r = evalWord();
    ui.keaHit = r && r.state==='ok' ? (r.rude ? { mv:'rude' } : { mv:r.keaMove, n:r.keaN, skip: r.keaN - cntOf(b) > 1 }) : null;
    try{ return await f.apply(this, arguments); } finally { ui.keaHit = null; }
  })(doAttack);

  // 😡 every hit she takes: the count goes up and the anger stacks
  heroHurt = (f => function(dmg){
    const o = f.apply(this, arguments), b = ui.bat;
    try{
      if(isKea() && b && !b.over && dmg > 0){
        b.keaCount = Math.min(2, cntOf(b) + 1);
        const an0 = angOf(b); b.keaAnger = Math.min(KE.angerMax, an0 + 1);
        setTimeout(() => floatText(an0 >= KE.angerMax ? '😡 แม่โกรธสุดๆ!!' : `😡 แม่โกรธแล้วนะ! นับ ${TH[b.keaCount]}`, HERO_X+10, FLOOR_Y-215, '#ff6a7a', 22, true), 260);
        fxAt('aura', { x:HERO_X, y:FLOOR_Y+10, anchor:'b', scale:1.1, ms:45 });
        gain(1, '😡 แม่โกรธ');
        badge();
      }
    }catch(e){}
    return o;
  })(heroHurt);

  /* ------------------------------ moves ------------------------------ */
  const g0 = () => $('#heroG');
  function shot(scale, ms){
    const x1 = HERO_X + FIST.x, y = FLOOR_Y - FIST.y, x2 = EN_X - 40;
    const s = fxAt('slash', { x:x1, y, scale:scale*.5, loop:true, from:1, loopFrom:2, to:4, ms:45 });
    if(!s) return sleep(ms||240);
    return anim(s, [{transform:tr(x1,y)},{transform:tr(x2,y)}], { duration:ms||240, easing:'ease-in', fill:'forwards' })
      .then(() => { s._stop(); fxAt('slash', { x:x2, y, scale:scale*.6, from:5, to:7, ms:55 }); });
  }
  function hit(scale, big){
    const e = curEnemy(), y = enY(e);
    fxAt('spark', { x:EN_X-20, y, scale:(scale||1)*.75, from:0, to:2, ms:55 });
    if(big) fxAt('spark', { x:EN_X-10, y:FLOOR_Y+16, anchor:'b', scale:big, from:3, to:7, ms:62 });
    shake(!!big); try{ sfx.hit(!!big); }catch(err){}
  }
  async function dash(to, ms){ const g = g0(); return anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(to,FLOOR_Y)}], { duration:ms||170, easing:'ease-out', fill:'forwards' }); }
  async function back(from, ms){ const g = g0(); await anim(g, [{transform:tr(from,FLOOR_Y)},{transform:tr(HERO_X,FLOOR_Y)}], { duration:ms||260, easing:'ease-in-out', fill:'forwards' }); setT(g, HERO_X, FLOOR_Y); }
  function sky(on){
    let r = $('#keaSky');
    if(on){ if(!r){ r = document.createElementNS(SVGNS, 'rect'); r.id = 'keaSky'; ['x','y','width','height'].forEach((k,i) => r.setAttribute(k, [-400,-300,1700,1100][i])); r.setAttribute('fill', '#4a000c');
        const act = $('#actors'); if(act && act.parentNode) act.parentNode.insertBefore(r, act); }
      anim(r, [{opacity:0},{opacity:.65}], { duration:250, fill:'forwards' }); }
    else if(r) anim(r, [{opacity:.65},{opacity:0}], { duration:350, fill:'forwards' }).then(() => r.remove());
  }
  function flash(col){ try{ const fl = document.createElementNS(SVGNS,'rect'); ['x','y','width','height'].forEach((k,i) => fl.setAttribute(k, [-400,-300,1700,1100][i])); fl.setAttribute('fill', col||'#ffe1e5'); $('#fx').appendChild(fl); anim(fl, [{opacity:.75},{opacity:0}], { duration:400 }).then(() => fl.remove()); }catch(e){} }
  // ๑ ๒ ๓ slam the whole screen
  function num(n, ms){
    const st = $('#stage'); if(!st) return sleep(ms||520);
    const d = document.createElement('div'); d.className = 'kea-num'; d.textContent = TH[n]; st.appendChild(d);
    const big = n===3;
    tn(big ? 196 : 262 + n*40, big ? .5 : .25, 'square', .06); if(big) boom();
    try{ d.animate([{transform:'translate(-50%,-50%) scale(3.2) rotate(-12deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1) rotate(0)',opacity:1,offset:.22},
      {transform:'translate(-50%,-50%) scale(1.06)',opacity:1,offset:.75},{transform:`translate(-50%,-50%) scale(${big?1.8:.7})`,opacity:0}], { duration:ms||620, easing:'ease-out' }).finished.then(() => d.remove()); }
    catch(e){ setTimeout(() => d.remove(), ms||620); }
    shake(big);
    return sleep((ms||620)*.55);
  }
  function breakMove(){
    const e = curEnemy();
    if(e && e.intent && e.intent.k!=='atk'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; floatText('⛔ BREAK! แม่สั่งหยุด!', EN_X, FLOOR_Y - e.h*e.sc - 80, '#ffe14a', 24, true); }
  }
  function heal(p, tag){
    const b = ui.bat; if(!b) return;
    const h = Math.max(1, Math.round(b.max*p)); b.hp = Math.min(b.max, b.hp + h);
    floatText(`+${h} ${tag||'🍚'}`, HERO_X-30, FLOOR_Y-150, '#6ef08a', 24, true);
  }

  heroAttack = (f => async function(lv, rude){
    if(!isKea() || !sprOf()) return f.apply(this, arguments);
    const b = ui.bat, h = ui.keaHit;
    const mv = h ? h.mv : (lv >= 5 && !rude ? 'ult' : 'one');
    // the count is committed as the move starts (damage was fixed by evalWord before this)
    if(b && h && h.n){ b.keaCount = h.n >= 3 ? 0 : h.n; if(h.n >= 3) b.keaAnger = 0; }
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    const near = EN_X - 125;
    if(mv==='rude'){
      floatText('ใครสอนให้พูดแบบนี้!!', HERO_X+40, FLOOR_Y-185, '#ffd0d6', 22, true);
      heroPose('pose-jab', 400); whoosh(); await sleep(80); await shot(.7, 230); hit(.8); await sleep(120); return;
    }
    if(h && h.skip) floatText('⏩ แม่ไม่รอแล้ว!', HERO_X+30, FLOOR_Y-215, '#ffe14a', 20, true);
    if(mv==='one'){
      floatText('๑ หนึ่ง!', HERO_X+40, FLOOR_Y-180, '#ffd0d6', 26, true); tn(330, .15, 'square', .04);
      heroPose('pose-jab', 380); whoosh();
      await sleep(90); await shot(.8, 230); hit(.85); await sleep(130); badge(); return;
    }
    if(mv==='two'){
      floatText('๒ สอง!!', HERO_X+40, FLOOR_Y-185, '#ff9aa6', 30, true); tn(392, .18, 'square', .05);
      heroPose('pose-jab', 320); whoosh(); await sleep(80);
      const p1 = shot(.8, 220); await sleep(160);
      heroPose('pose-jab', 380); whoosh(); await sleep(90);
      const p2 = shot(1.05, 230); await p1; hit(.85); await p2; hit(1.1); await sleep(140); badge(); return;
    }
    if(mv==='three'){
      floatText('๓ สาม!!!', HERO_X+60, FLOOR_Y-205, '#ff3b4e', 38, true);
      heroPose('pose-guard', 500);
      fxAt('aura', { x:HERO_X, y:FLOOR_Y+10, anchor:'b', scale:1.55, ms:42 }); boom();
      await sleep(330);
      heroPose('pose-kick', 720); whoosh();
      await dash(near, 160);
      fxAt('slash', { x:EN_X-55, y:enY(curEnemy())-10, scale:1.15, ms:42 });
      await sleep(140);
      hit(1.5, 1.25); flash('#ffd0d6');
      breakMove();
      heal(KE.heal, '🍚 กินข้าวก่อนลูก');
      gain(1.5, '๓ นับครบ!');
      await sleep(240);
      heroPose('pose-recover', 520); await back(near, 260); fade(); badge(); return;
    }
    // ---------- ⚡ ULTIMATE · MOTHER'S WRATH ----------
    floatText("MOTHER'S WRATH!!!", HERO_X+90, FLOOR_Y-225, '#ffb03b', 32, true);
    if(b){ b.keaCount = 0; }
    sky(true);
    fxAt('aura', { x:HERO_X, y:FLOOR_Y+10, anchor:'b', scale:1.9, ms:36 }); boom();
    await num(1, 520); await num(2, 520);
    heroPose('pose-guard', 300); whoosh();
    await dash(near, 150);
    for(let k=0;k<6;k++){
      heroPose('pose-jab', 240); whoosh();
      const y = enY(curEnemy()) + (k%3-1)*18;
      fxAt('slash', { x:EN_X-55, y, scale:.6, from:2, ms:30 });
      await sleep(55); hit(.7 + k*.06); await sleep(80);
    }
    const p3 = num(3, 720);
    heroPose('pose-kick', 760); whoosh();
    fxAt('slash', { x:EN_X-50, y:enY(curEnemy())-25, scale:1.6, ms:38 });
    await p3;
    hit(1.6, 1.8); flash('#ffe1e5');
    fxAt('spark', { x:EN_X-10, y:enY(curEnemy())-20, scale:2, from:0, to:2, ms:50 });
    await sleep(300);
    sky(false);
    if(b){ b.keaAnger = 0; }
    heroPose('pose-recover', 520); await back(near, 280); fade(); badge();
  })(heroAttack);

  /* ------------------------------ cut-in ------------------------------ */
  async function cutIn(l1, l2, l3, ms){
    const st = $('#stage'); if(!st) return;
    const d = document.createElement('div'); d.className = 'kea-cut';
    d.innerHTML = `<div class="dim"></div><div class="band"></div><img alt="" src="heroes/kea/cutin.jpg?v=${HERO_IMG_VER}"><div class="t1">${l1}</div><div class="t2">${l2}</div><div class="t3">${l3}</div>`;
    st.appendChild(d);
    tn(150, .5, 'sawtooth', .06); tn(300, .4, 'square', .04, .15); try{ slide(200, 900, .35, 'sawtooth', .05); }catch(e){}
    await sleep(ms||1600);
    d.classList.add('out'); setTimeout(() => d.remove(), 320);
    await sleep(200);
  }

  /* ------------------------------ tactical Ultimate → COUNT TO THREE ------------------------------ */
  if(typeof window.tacUltUtil==='function'){
    window.tacUltUtil = (f => async function(b, e){
      if(!isKea()) return f.apply(this, arguments);
      const dmg = finalDmg(b);
      heroPose('pose-guard', 2600);
      sky(true);
      fxAt('aura', { x:HERO_X, y:FLOOR_Y+10, anchor:'b', scale:2.2, ms:40 });
      await cutIn('KEA', 'แม่จะนับถึงสาม!!!', '🖐️ COUNT TO THREE', 1600);
      const ring = heroFx('aura', { scale:1.4, y:10, ms:50, behind:true });
      await num(1, 600);
      heroPose('pose-jab', 260); whoosh(); fxAt('slash', { x:HERO_X+FIST.x+60, y:FLOOR_Y-FIST.y, scale:.9, ms:40 });
      await num(2, 600);
      heroPose('pose-jab', 260); whoosh(); fxAt('slash', { x:HERO_X+FIST.x+60, y:FLOOR_Y-FIST.y, scale:1.1, ms:40 });
      // ๓ — the whole flurry + the giant kick
      const near = EN_X - 125;
      heroPose('pose-guard', 300); await dash(near, 140);
      for(let k=0;k<8;k++){
        heroPose('pose-jab', 220); whoosh();
        fxAt('slash', { x:EN_X-55, y:enY(e) + (k%3-1)*20, scale:.65 + k*.04, from:2, ms:28 });
        await sleep(50); hit(.75 + k*.05); await sleep(70);
      }
      const p3 = num(3, 900);
      heroPose('pose-kick', 900); whoosh();
      fxAt('slash', { x:EN_X-50, y:enY(e)-25, scale:2, ms:36 });
      await p3;
      if(ring) ring._stop();
      fxAt('spark', { x:EN_X-10, y:FLOOR_Y+16, anchor:'b', scale:2.2, from:3, to:7, ms:60 });
      fxAt('spark', { x:EN_X-10, y:enY(e)-10, scale:2.4, from:0, to:2, ms:55 });
      flash('#fff'); shake(true); boom();
      const queue = (b.stage && b.stage.enemies ? b.stage.enemies.slice(b.idx+1) : []).filter(q => q.hp > 0);
      const sd = Math.max(1, Math.round(dmg * KE.finalSplash));
      queue.forEach(q => { q.hp -= sd; if(q.hp < 1 && (q.boss || q.mini)) q.hp = 1; if(q.hp < 0) q.hp = 0; });
      if(queue.length){ fxAt('spark', { x:Q_X, y:FLOOR_Y+16, anchor:'b', scale:1.5, from:3, to:7, ms:60 }); floatText(`🖐️ คลื่นแม่ ${fmt(sd)} ×${queue.length}`, Q_X-20, FLOOR_Y-205, '#ff9aa6', 24, true); }
      sky(false);
      b.keaCount = 0; b.keaAnger = 0;
      e.hp -= dmg; b.score += dmg;
      floatText(`${fmt(dmg)}`, EN_X, FLOOR_Y - e.h*e.sc - 90, '#ff6a7a', 48, true);
      floatText('นับครบสามแล้วนะ!', HERO_X+40, FLOOR_Y-215, '#ffd0d6', 22, true);
      try{ sfx.hit(true); }catch(err){} enemyHurt(dmg, true);
      heal(KE.finalHeal, '🍚 แม่ทำกับข้าวไว้แล้ว');
      try{ if(typeof bossPhase2Check==='function') bossPhase2Check(e); }catch(err){}
      heroPose('pose-recover', 520); await back(near, 280); fade(); badge();
      if(e.hp <= 0){ await enemyDies(); return; }
      updateEnemyHp(); updateHud(); renderEnemyPanel(); persist();
      await sleep(450);
      await enemyTurn();
    })(window.tacUltUtil);
  }

  /* ------------------------------ entrance · victory · defeat ------------------------------ */
  intro = (f => async function(){
    if(!isKea()) return f.apply(this, arguments);
    const out = await f.apply(this, arguments);
    const b = ui.bat; if(!b || b.over) return out;
    b.busy = true;
    heroPose('pose-guard', 1300);
    fxAt('aura', { x:HERO_X, y:FLOOR_Y+10, anchor:'b', scale:1.3, ms:50 }); tn(220, .3, 'sawtooth', .05);
    floatText('การบ้านเสร็จยัง!!!', HERO_X+50, FLOOR_Y-185, '#ff6a7a', 26, true);
    await sleep(900);
    floatText('แม่จะนับถึงสามนะ', HERO_X+50, FLOOR_Y-150, '#ffd0d6', 18, true);
    await sleep(600);
    if(ui.bat===b && !b.over){ b.busy = false; try{ renderTray(); }catch(e){} }
    return out;
  })(intro);
  stageClear = (f => async function(){
    if(isKea()){ const b = ui.bat; if(b){ b.keaCount = 0; b.keaAnger = 0; } fade(); badge(); heroPose('pose-guard', 1600); floatText('เก่งมากลูก! ไปกินข้าวได้แล้ว', HERO_X+40, FLOOR_Y-165, '#ffd0d6', 20, true); }
    return f.apply(this, arguments);
  })(stageClear);
  // the count and the anger reset with a new stage
  buildBattleDom = (f => function(){ const b = ui.bat; if(b && b.keaStage !== b.stage){ b.keaCount = 0; b.keaAnger = 0; b.keaStage = b.stage; } const o = f.apply(this, arguments); try{ badge(); }catch(e){} return o; })(buildBattleDom);
  heroDies = (f => async function(){
    const b = ui.bat;
    if(!isKea() || !b || b.over) return f.apply(this, arguments);
    b.over = true; b.busy = true;
    const a = $('#heroA');
    if(a){ const g = a.querySelector('.kea-aura[data-k]'); if(g) g._stop(); a.classList.remove('kea-hot'); a.classList.add('dead'); sprRestart('dead'); }
    try{ sfx.hurt(); }catch(err){}
    floatText('แม่เหนื่อยแล้วนะลูก…', HERO_X+30, FLOOR_Y-150, '#ffd0d6', 20, true);
    await sleep(sprMs('dead', 1600) + 200);
    fxAt('fade', { x:HERO_X + 70, y:FLOOR_Y - 50, scale:1.1, ms:70 });
    if(a) anim(a, [{opacity:1},{opacity:1,offset:.3},{opacity:0}], { duration:900, fill:'forwards' });
    await sleep(1000);
    b.over = false;
    return f.apply(this, arguments);
  })(heroDies);

  window.QL_KEA = { nextN, finalDmg, cutIn };
})();
