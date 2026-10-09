/* ==========================================================================
   LETTERⁿ v73 — CREAM (ครีม) · สารวัตรหญิงหมัดเพลิงแดง
   --------------------------------------------------------------------------
   Sprites: "Meshy AI · character action spritesheet" + "fx sprite sheet (red)"
   (supplied by the developer) — cut into heroes/cream/*.png. v75: attack effects from the
   "Attack Effects" pixel sheet · v77: character remodelled from "Airforce Officer Sprite (with kick)". Every pose is
   anchored on one floor / one foot position; idle = fighting stance breathing.

   SPLIT ATTACK BUTTON (like X): top half 🔥 ชาร์จ · bottom half โจมตี/ปล่อย
     CHARGE  the word's damage is stored, HEAT +1 (enemy still acts) ·
             while HEAT > 0 the red aura guards her: damage taken −20%
     RELEASE (stored + this word) × (1 + 25% per HEAT, max ×2.25)
       HEAT 1–2  CRIMSON STRIKE    dash · cross · red slash wave
       HEAT 3–4  CRIMSON RUSH      dash · a slash per HEAT · high kick
       HEAT 5+   RED MOON BREAKER  red sky · flurry · giant vertical slash ·
                                   ground impact · the enemy's prepared move breaks
   NO CHARGE — move by word length:
       3–4 JAB · 5–6 ONE-TWO (+15%) · 7+ / CRIT HIGH KICK (+30%)
   ULTIMATE ⚔️ CRIMSON ULTIMATE · tactical: BLOOD AURA (HEAT +2 · interrupt)
   Every effect in the red FX sheet is used: aura charge · aura sustain ·
   slash wave (H) · slash wave (V) · energy burst · impact · dissipate.
   ========================================================================== */
(function(){
  const CR = BALANCE.CREAM, K = 'cream', SVGNS = 'http://www.w3.org/2000/svg';
  const pc = x => `+${BALANCE.pct(x)}%`;
  const S = .62;   // v77 sheet is drawn ~204 px tall → same height as Mia / ELON
  // v77: "Meshy AI · Airforce Officer Sprite (with kick)" — clean pixel art; every frame on one floor,
  // attacks anchored on the feet, walk on the hips; idle = guard stance breathing (no idle row in the sheet)
  HERO_SPRITE.cream = { dir:'heroes/cream/', ch:230, scale:S, face:'-14 -122 34 34',
    anims:{
      idle:   { n:10, cw:200, ax:90,  dur:1.5, loop:true },
      walk:   { n:8,  cw:200, ax:90,  dur:.8,  loop:true, th:'เดิน' },
      hurt:   { n:3,  cw:240, ax:100, dur:.45 },
      dead:   { n:7,  cw:400, ax:110, dur:1.4 },
      guard:  { n:2,  cw:240, ax:90,  dur:.25, th:'🔥 ชาร์จ (การ์ด)' },
      jab:    { n:2,  cw:260, ax:90,  dur:.16, th:'ฝ่ามือกระแทก' },
      cross:  { n:2,  cw:260, ax:90,  dur:.18, th:'หมัดตรง' },
      kick:   { n:3,  cw:300, ax:90,  dur:.3,  th:'เตะสูง' },
      recover:{ n:2,  cw:240, ax:90,  dur:.28, th:'ตั้งการ์ด' } },
    attacks:['jab','cross','kick'], extra:['guard','recover','walk'], demoOnly:true, finMin:99,
    finNote:`ปุ่มโจมตีแบ่งครึ่ง: <b>🔥 ชาร์จ</b> เก็บดาเมจ + HEAT · <b>ปล่อย</b> = (ดาเมจที่เก็บ + คำนี้) × สูงสุด ×${CR.relMax} · HEAT 3+ CRIMSON RUSH · HEAT 5 RED MOON BREAKER · ไม่ชาร์จ: 3–4 ตัว แย็บ · 5–6 ตัว วันทู ${pc(CR.cross)} · 7+ / Critical เตะสูง ${pc(CR.kick)}` };
  const FIST = { x: Math.round((180-90)*S), y: Math.round((227-86)*S) };
  const FOOT = { x: Math.round((231-90)*S), y: Math.round((227-77)*S) };
  // effects: the attack-effects sheet (fist burst · kick crescent · ground blast) + the red aura sheet (charge · sustain · burst · dissipate)
  const FXS = { fist:{ w:250, h:250, n:6 }, kick:{ w:250, h:227, n:6 }, ground:{ w:210, h:240, n:8 },
                aurac:{ w:110, h:130, n:15 }, auras:{ w:112, h:108, n:14 }, burst:{ w:150, h:130, n:13 }, dissipate:{ w:140, h:124, n:12 } };
  Object.keys(FXS).forEach(k => { const i = new Image(); i.src = `heroes/cream/fx_${k}.png?v=${HERO_IMG_VER}`; });
  const fxAt = (k, o) => { const F = FXS[k]; try{ return window.QL_STRIP_FX ? QL_STRIP_FX(`heroes/cream/fx_${k}.png`, F.w, F.h, F.n, o) : null; }catch(e){ return null; } };
  // a looping strip glued to the hero (moves with her when she dashes)
  function heroFx(k, o){
    const a = $('#heroA'), F = FXS[k]; if(!a) return null;
    const s = o.scale || 1, W = F.w*s, H = F.h*s, g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'cr-aura');
    g.innerHTML = `<svg x="${-W/2}" y="${(o.y||0) - H}" width="${W}" height="${H}" viewBox="0 0 ${F.w} ${F.h}" overflow="hidden"><image href="heroes/cream/fx_${k}.png?v=${HERO_IMG_VER}" width="${F.w*F.n}" height="${F.h}"/></svg>`;
    if(o.behind) a.insertBefore(g, a.firstChild); else a.appendChild(g);
    const img = g.querySelector('image'); let f = o.from || 0;
    g._i = setInterval(() => { f++; if(f > (o.to!=null ? o.to : F.n-1)) f = o.loopFrom || 0; img.setAttribute('x', -f*F.w); }, o.ms || 60);
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
    css += `.spr-${K} .spr-a{display:none}.spr-${K} .spr-a-idle{display:inline}` + show('#heroA.walk','walk') + show('#heroA.hurt','hurt') + show('#heroA.dead','dead');
    [...c.attacks, ...c.extra].forEach(n => { css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n); });
    css += `.spr.spr-cream image{image-rendering:auto}
      #heroA.cr-hot .spr-cream image{filter:drop-shadow(0 0 3px #ff3b4e) drop-shadow(0 0 8px rgba(255,40,60,.6))}
      .cr-aura{pointer-events:none}
      .cr-badge{display:inline-flex;align-items:center;margin-left:6px;padding:1px 8px;border-radius:10px;font-weight:800;font-size:.82em;color:#fff;background:linear-gradient(90deg,#b0122e,#ff3b4e);border:1px solid #ff9aa6}
      .cr-badge.max{background:linear-gradient(90deg,#ff3b4e,#ffb03b);animation:crPulse .5s ease-in-out infinite alternate}
      @keyframes crPulse{to{transform:scale(1.1)}}
      #crSky{pointer-events:none}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    Object.keys(c.anims).forEach(n => { const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`; });
  })();
  try{ HERO_PORTRAIT.cream = { src:'heroes/cream/portrait.png', w:54, h:54, vb:'0 0 54 54' }; }catch(e){}

  CHARACTERS.push({ id:K, name:'Cream', th:'ครีม สารวัตรหญิงหมัดเพลิงแดง', price:7000, role:'ชาร์จ · ศิลปะการต่อสู้', skill:'หมัดเพลิงแดง',
    desc:`ปุ่มโจมตีแบ่งครึ่ง 🔥ชาร์จ / ปล่อย · ชาร์จ = เก็บดาเมจของคำ + HEAT 1 ขั้น (ศัตรูยังตีกลับ) ระหว่างมีออร่ารับดาเมจ -${BALANCE.pct(1-CR.guard)}% · ปล่อย = (ดาเมจที่เก็บ + คำนี้) × (1 + ${BALANCE.pct(CR.relStep)}% ต่อ HEAT สูงสุด ×${CR.relMax}) · HEAT 3+ CRIMSON RUSH ฟันรัวตาม HEAT ปิดด้วยเตะสูง · HEAT 5 RED MOON BREAKER ฟ้าแดง ฟันยักษ์ ทำลายท่าที่ศัตรูเตรียมไว้ · ไม่ชาร์จ: 3–4 ตัว แย็บ · 5–6 ตัว วันทู ${pc(CR.cross)} · 7 ตัวขึ้นไปหรือ Critical เตะสูง ${pc(CR.kick)}`,
    hpMul:1, get dmgTaken(){ const b = ui.bat; return b && (b.crHeat||0) > 0 && save.eq.char===K ? CR.guard : 1; } });
  CHAR_TIP.cream = FIST.y;
  FIGHTER.cream = { c:'#ff3b4e', atk:5, def:3, spd:4, diff:3 };
  HERO_EXTRA.cream = { el:'fire', elNote:'เพลิงแดง — ออร่าสีเลือดลุกท่วมตัวทุกครั้งที่ชาร์จ (ใช้คำธาตุได้ทุกชนิด)',
    ult:`ชาร์จเก็บดาเมจ + HEAT แล้วปล่อยทีเดียว (สูงสุด ×${CR.relMax}) · HEAT 3 CRIMSON RUSH · HEAT 5 RED MOON BREAKER · ⚔️ CRIMSON ULTIMATE · Ultimate แท็กติก: BLOOD AURA`,
    lore:'สารวัตรหญิงแชมป์ศิลปะการต่อสู้ประจำกองปราบ สุภาพเรียบร้อยจนกว่าจะมีคนสะกดผิดต่อหน้าเธอ — แล้วออร่าสีแดงก็ลุกขึ้นมา' };
  try{
    const R = window.UNLOCK_REQ;
    if(window.HERO_UNLOCK && R) window.HERO_UNLOCK.cream = { tier:5, price:7000, reqs:[ R.clear(4) ], pick:2, opts:[ R.combo(12), R.ult(12), R.flawless(4) ],
      quote:'"ขออนุญาตจับกุมค่ะ!" — ครีมพร้อมปฏิบัติหน้าที่' };
  }catch(e){}
  try{ if(window.QL_TAC) QL_TAC.UTIL.cream = { ic:'🩸', en:'BLOOD AURA', th:'ออร่าโลหิต: HEAT +2 ทันที · ขัดท่าที่ศัตรูเตรียมไว้' }; }catch(e){}
  try{ if(window.QL_ULTX) QL_ULTX.cream = { ic:'🔥', en:'CRIMSON HEAT', th:'เพลิงแดงเดือด', how:['กด 🔥 ชาร์จแต่ละครั้ง <b>+20%</b>','ปล่อยตอน HEAT 3 ขึ้นไป <b>+20%</b>'] }; }catch(e){}

  const isCream = () => save.eq && save.eq.char===K;
  const heatOf = b => (b && b.crHeat) || 0;
  const relMul = h => h > 0 ? Math.min(CR.relMax, 1 + h*CR.relStep) : 1;
  const moveOf = (len, crit) => crit || len >= CR.kickLen ? 'kick' : len >= CR.crossLen ? 'onetwo' : 'jab';
  const enY = e => FLOOR_Y - (e ? e.h*e.sc*.5 : 70);
  const gain = (n, tag) => { try{ window.QL_ULT_GAIN && QL_ULT_GAIN(n, tag); }catch(e){} };
  const tn = (f, d, t, v, dl) => { try{ tone(f, d, t||'sawtooth', v||.05, dl||0); }catch(e){} };
  const whoosh = () => { try{ noise(.12, .12); slide(900, 300, .12, 'triangle', .05); }catch(e){} };

  /* ------------------------------ aura (follows HEAT) ------------------------------ */
  function aura(){
    const a = $('#heroA'), b = ui.bat; if(!a) return;
    const h = isCream() && b ? heatOf(b) : 0;
    a.classList.toggle('cr-hot', h > 0);
    const key = h >= CR.moonHeat ? 'max' : h >= CR.rushHeat ? 'hi' : h > 0 ? 'lo' : '';
    let g = a.querySelector('.cr-aura[data-k]');
    if(g && g.dataset.k === key) return;
    if(g) g._stop();
    if(!key) return;
    const s = key==='max' ? 1.75 : key==='hi' ? 1.5 : 1.25;
    g = heroFx('auras', { scale:s, y:6, ms: key==='max' ? 45 : 65, behind:true });
    if(g) g.dataset.k = key;
  }
  function dissipate(){
    const a = $('#heroA'); const g = a && a.querySelector('.cr-aura[data-k]');
    if(g) g._stop();
    fxAt('dissipate', { x:HERO_X, y:FLOOR_Y-60, scale:1.1, ms:55 });
    if(a) a.classList.remove('cr-hot');
  }

  /* ------------------------------ the split button ------------------------------ */
  function buttons(){
    const bAtk = $('#bAtk'), b = ui.bat;
    let wrap = $('#crSplit');
    if(!bAtk || !b || !isCream()){ if(wrap && bAtk){ wrap.parentNode.insertBefore(bAtk, wrap); wrap.remove(); } const bd = $('#crBadge'); if(bd) bd.remove(); return; }
    if(!wrap){
      wrap = document.createElement('div'); wrap.id = 'crSplit'; wrap.className = 'xsplit';
      bAtk.parentNode.insertBefore(wrap, bAtk);
      const ch = document.createElement('button'); ch.id = 'bCrCharge'; ch.className = 'xcharge'; ch.type = 'button';
      ch.addEventListener('click', charge);
      wrap.appendChild(ch); wrap.appendChild(bAtk);
    }
    const ch = $('#bCrCharge'), h = heatOf(b), r = evalWord();
    ch.disabled = b.busy || r.state!=='ok' || !!r.rude;
    ch.style.setProperty('--xc', h >= CR.rushHeat ? '#ffb03b' : '#ff6a7a');
    ch.innerHTML = `<span class="xb">🔥 ชาร์จ</span><small>${h ? `HEAT ${h} · ${b.crBank||0} · ×${+relMul(h).toFixed(2)}→×${+relMul(h+1).toFixed(2)}` : 'เก็บดาเมจ + HEAT'}</small>`;
    bAtk.classList.toggle('xrelease', h > 0); bAtk.style.setProperty('--xc', h >= CR.moonHeat ? '#ffb03b' : '#ff3b4e');
    const me = document.querySelector('.hud .me');
    if(me){ let bd = $('#crBadge'); if(!h){ if(bd) bd.remove(); } else { if(!bd){ bd = document.createElement('span'); bd.id = 'crBadge'; me.appendChild(bd); }
      bd.className = 'cr-badge' + (h >= CR.moonHeat ? ' max' : ''); bd.textContent = `🔥 HEAT ${h}`; } }
    aura();
  }
  updateHud = (f => function(){ const o = f.apply(this, arguments); try{ buttons(); }catch(e){} return o; })(updateHud);
  renderTray = (f => function(){ const o = f.apply(this, arguments); try{ buttons(); }catch(e){} return o; })(renderTray);

  /* ------------------------------ damage ------------------------------ */
  evalWord = (f => function(){
    const r = f.apply(this, arguments), b = ui.bat;
    if(!isCream() || !b || !r || r.state!=='ok' || r.rude) return r;
    if(b.crCharging){ r.crStore = r.dmg; r.dmg = 0; r.el = null; r.crit = false; r.notes = [`🔥 ชาร์จ +${r.crStore} → HEAT ${heatOf(b)+1}`]; return r; }
    const h = heatOf(b);
    if(h > 0){ const base = r.dmg, m = relMul(h); r.dmg = Math.max(1, Math.round((base + (b.crBank||0)) * m));
      r.notes.unshift(`🔥 ปล่อย HEAT ${h} (${b.crBank||0} + ${base}) ×${+m.toFixed(2)}`); r.crMove = h >= CR.moonHeat ? 'moon' : h >= CR.rushHeat ? 'rush' : 'strike'; return r; }
    const mv = moveOf(VocabularyManager.wordLength(r.w), r.crit);
    if(mv==='onetwo') dmgMod(r, 'bonus', CR.cross, `👊 วันทู ${pc(CR.cross)}`);
    if(mv==='kick') dmgMod(r, 'bonus', CR.kick, `🦵 เตะสูง ${pc(CR.kick)}`);
    r.crMove = mv;
    return r;
  })(evalWord);

  async function charge(){
    const b = ui.bat; if(!isCream() || !b || b.busy) return;
    b.crCharging = true; const r = evalWord(); b.crCharging = false;
    if(r.state!=='ok' || r.rude){ if(r.rude) toast('คำหยาบชาร์จไม่ได้'); return; }
    const store = r.crStore||0, w0 = b.words, eh = enemyHurt, hit = sfx.hit;
    b.crCharging = true; enemyHurt = function(){ enemyHurt = eh; }; sfx.hit = function(){ sfx.hit = hit; };
    try{
      const p = doAttack();
      b.crHeat = heatOf(b) + 1; b.crBank = (b.crBank||0) + store;
      updateHud();
      floatText(`🔥 HEAT ${b.crHeat}!`, HERO_X, FLOOR_Y-190, b.crHeat >= CR.rushHeat ? '#ffb03b' : '#ff6a7a', 26, true);
      await p;
      if(ui.bat===b && b.words===w0){ b.crHeat--; b.crBank -= store; updateHud(); }
      else gain(1, '🔥 ชาร์จ');
    } finally { enemyHurt = eh; sfx.hit = hit; b.crCharging = false; }
  }
  // after a release lands the HEAT is spent
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!isCream() || !b || b.crCharging || b.busy) return f.apply(this, arguments);
    const r = evalWord(), h = heatOf(b), w0 = b.words;
    ui.crHit = r && r.state==='ok' ? { mv: r.rude ? 'jab' : (r.crMove || 'jab'), heat:h } : null;
    try{ await f.apply(this, arguments); } finally { ui.crHit = null; }
    if(h > 0 && ui.bat===b && b.words > w0){ b.crHeat = 0; b.crBank = 0; dissipate(); updateHud(); }
  })(doAttack);

  /* ------------------------------ moves ------------------------------ */
  const g0 = () => $('#heroG');
  function slashH(scale, ms, fromX){
    const x1 = fromX || HERO_X + FIST.x, y = FLOOR_Y - FIST.y, x2 = EN_X - 40;
    const s = fxAt('fist', { x:x1, y, scale:scale*.55, loop:true, from:0, loopFrom:1, to:3, ms:45 });
    if(!s) return sleep(ms||260);
    return anim(s, [{transform:tr(x1,y)},{transform:tr(x2,y)}], { duration:ms||260, easing:'ease-in', fill:'forwards' }).then(() => { s._stop(); fxAt('fist', { x:x2, y, scale:scale*.6, from:3, to:5, ms:50 }); });
  }
  function hit(scale, big){
    const e = curEnemy(), y = enY(e);
    fxAt('burst', { x:EN_X-20, y, scale:(scale||1)*.9, ms:32 });
    if(big) fxAt('ground', { x:EN_X-10, y:FLOOR_Y+14, anchor:'b', scale:big*.75, ms:48 });
    shake(!!big); try{ sfx.hit(!!big); }catch(err){}
  }
  async function dash(to, ms){ const g = g0(); return anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(to,FLOOR_Y)}], { duration:ms||180, easing:'ease-out', fill:'forwards' }); }
  async function back(from, ms){ const g = g0(); await anim(g, [{transform:tr(from,FLOOR_Y)},{transform:tr(HERO_X,FLOOR_Y)}], { duration:ms||260, easing:'ease-in-out', fill:'forwards' }); setT(g, HERO_X, FLOOR_Y); }
  function sky(on){
    let r = $('#crSky');
    if(on){ if(!r){ r = document.createElementNS(SVGNS, 'rect'); r.id = 'crSky'; ['x','y','width','height'].forEach((k,i) => r.setAttribute(k, [-400,-300,1700,1100][i])); r.setAttribute('fill', '#5a0010');
        const act = $('#actors'); if(act && act.parentNode) act.parentNode.insertBefore(r, act); }
      anim(r, [{opacity:0},{opacity:.6}], { duration:250, fill:'forwards' }); }
    else if(r) anim(r, [{opacity:.6},{opacity:0}], { duration:350, fill:'forwards' }).then(() => r.remove());
  }

  heroAttack = (f => async function(lv, rude){
    if(!isCream() || !sprOf()) return f.apply(this, arguments);
    const b = ui.bat;
    if(b && b.crCharging){   // power up in place: guard + aura charge
      heroPose('pose-guard', 900);
      fxAt('aurac', { x:HERO_X, y:FLOOR_Y+6, anchor:'b', scale:1.25, ms:42 });
      tn(220, .3, 'sawtooth', .05); tn(330, .3, 'sawtooth', .04, .12); tn(495, .35, 'square', .03, .24);
      await sleep(700); return;
    }
    const h = ui.crHit, mv = h ? h.mv : (lv >= 5 && !rude ? 'ult' : 'onetwo');
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    const near = EN_X - 120;
    if(mv==='jab'){
      floatText(rude ? 'แย็บ…หยาบ!' : 'JAB!', HERO_X+40, FLOOR_Y-170, '#ffd0d6', 22, true);
      heroPose('pose-jab', 380); whoosh();
      await sleep(90); await slashH(.7, 230); hit(.8); await sleep(120); return;
    }
    if(mv==='onetwo'){
      floatText('ONE-TWO!', HERO_X+40, FLOOR_Y-175, '#ff9aa6', 24, true);
      heroPose('pose-jab', 300); whoosh(); await sleep(80);
      const p1 = slashH(.75, 220); await sleep(150);
      heroPose('pose-cross', 420); whoosh(); await sleep(90);
      const p2 = slashH(1, 240); await p1; hit(.85); await p2; hit(1.1); await sleep(140); return;
    }
    if(mv==='kick'){
      floatText('HIGH KICK!!', HERO_X+40, FLOOR_Y-185, '#ff6a7a', 28, true);
      heroPose('pose-kick', 560); whoosh();
      await dash(near, 170);
      fxAt('kick', { x:EN_X-60, y:enY(curEnemy())-10, scale:.7, ms:45 });
      await sleep(120); hit(1.1, .9);
      heroPose('pose-recover', 500); await back(near, 260); return;
    }
    // ---------- releases & ultimate ----------
    const heat = h ? h.heat : 5, ult = mv==='ult';
    const name = ult ? 'CRIMSON ULTIMATE!!!' : mv==='moon' ? 'RED MOON BREAKER!!' : mv==='rush' ? 'CRIMSON RUSH!!' : 'CRIMSON STRIKE!';
    floatText(name, HERO_X+80, FLOOR_Y-215, mv==='strike' ? '#ff6a7a' : '#ffb03b', mv==='strike' ? 26 : 30, true);
    const big = ult || mv==='moon';
    if(big){ sky(true); fxAt('aurac', { x:HERO_X, y:FLOOR_Y+6, anchor:'b', scale:1.7, ms:34 }); tn(110, .9, 'sawtooth', .07); await sleep(420); }
    // dash in
    heroPose('pose-cross', 300); whoosh();
    await dash(near, 150);
    const hits = mv==='strike' ? 1 : Math.min(7, ult ? 7 : heat);
    for(let k=0;k<hits;k++){
      heroPose(k%2 ? 'pose-cross' : 'pose-jab', 260); whoosh();
      const y = enY(curEnemy()) + (k%3-1)*18;
      fxAt('fist', { x:EN_X-60, y, scale:.5 + (big?.15:0), ms:34 });
      await sleep(60); hit(.7 + k*.05);
      await sleep(mv==='strike' ? 140 : 90);
    }
    if(mv!=='strike'){
      heroPose('pose-kick', 600); whoosh();
      fxAt('kick', { x:EN_X-50, y:enY(curEnemy())-(big?30:10), scale: big ? 1.4 : .9, ms:42 });
      await sleep(130);
      hit(1.4, big ? 1.7 : 1.1);
      if(big){ fxAt('burst', { x:EN_X-10, y:enY(curEnemy())-20, scale:2.2, ms:30 }); shake(true); try{ const fl = document.createElementNS(SVGNS,'rect'); ['x','y','width','height'].forEach((k2,i) => fl.setAttribute(k2, [-400,-300,1700,1100][i])); fl.setAttribute('fill','#ffd0d6'); $('#fx').appendChild(fl); anim(fl, [{opacity:.7},{opacity:0}], { duration:380 }).then(() => fl.remove()); }catch(err){} }
      if(mv==='moon'){ const e = curEnemy(); if(e && e.intent && e.intent.k!=='atk'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; floatText('⛔ BREAK!', EN_X, FLOOR_Y - e.h*e.sc - 80, '#ffe14a', 26, true); } }
      if(heat >= CR.rushHeat && !ult) gain(1, '🔥 RUSH');
      await sleep(big ? 260 : 160);
    } else { await sleep(120); }
    if(big) sky(false);
    heroPose('pose-recover', 500); await back(near, 280);
  })(heroAttack);

  /* ------------------------------ tactical Ultimate: BLOOD AURA ------------------------------ */
  if(typeof window.tacUltUtil==='function'){
    window.tacUltUtil = (f => async function(b, e){
      if(!isCream()) return f.apply(this, arguments);
      floatText('🩸 BLOOD AURA!', HERO_X+30, FLOOR_Y-215, '#ff6a7a', 30, true);
      heroPose('pose-guard', 1200);
      fxAt('aurac', { x:HERO_X, y:FLOOR_Y+6, anchor:'b', scale:1.8, ms:36 });
      tn(110, .8, 'sawtooth', .07); tn(220, .6, 'square', .04, .2);
      b.crHeat = heatOf(b) + 2; b.crBank = b.crBank || 0;
      if(e && e.intent && e.intent.k!=='atk'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; floatText('⛔ INTERRUPT!', EN_X, FLOOR_Y - e.h*e.sc - 80, '#ffe14a', 26, true); }
      floatText(`🔥 HEAT ${b.crHeat}`, HERO_X, FLOOR_Y-185, '#ffb03b', 24, true);
      updateHud(); renderEnemyPanel(); persist();
      await sleep(900);
      await enemyTurn();
    })(window.tacUltUtil);
  }

  /* ------------------------------ entrance · victory · defeat ------------------------------ */
  intro = (f => async function(){
    if(!isCream()) return f.apply(this, arguments);
    const out = await f.apply(this, arguments);
    const b = ui.bat; if(!b || b.over) return out;
    b.busy = true;
    heroPose('pose-guard', 1100);
    floatText('พร้อมปฏิบัติหน้าที่ค่ะ!', HERO_X+40, FLOOR_Y-165, '#ffd0d6', 22, true);
    await sleep(700);
    heroPose('pose-guard', 600);
    fxAt('aurac', { x:HERO_X, y:FLOOR_Y+6, anchor:'b', scale:1.2, ms:40 }); tn(220, .3, 'sawtooth', .05);
    await sleep(500);
    if(ui.bat===b && !b.over){ b.busy = false; try{ renderTray(); }catch(e){} }
    return out;
  })(intro);
  stageClear = (f => async function(){
    if(isCream()){ const b = ui.bat; if(b){ b.crHeat = 0; b.crBank = 0; } dissipate(); heroPose('pose-guard', 1600); floatText('ภารกิจสำเร็จค่ะ!', HERO_X+30, FLOOR_Y-165, '#ffd0d6', 22, true); }
    return f.apply(this, arguments);
  })(stageClear);
  // HEAT resets with a new stage
  buildBattleDom = (f => function(){ const b = ui.bat; if(b && b.crStage !== b.stage){ b.crHeat = 0; b.crBank = 0; b.crStage = b.stage; } const o = f.apply(this, arguments); try{ buttons(); }catch(e){} return o; })(buildBattleDom);
  heroDies = (f => async function(){
    const b = ui.bat;
    if(!isCream() || !b || b.over) return f.apply(this, arguments);
    b.over = true; b.busy = true;
    const a = $('#heroA');
    if(a){ const g = a.querySelector('.cr-aura[data-k]'); if(g) g._stop(); a.classList.remove('cr-hot'); a.classList.add('dead'); sprRestart('dead'); }
    try{ sfx.hurt(); }catch(err){}
    await sleep(sprMs('dead', 1400) + 200);
    fxAt('dissipate', { x:HERO_X + 60, y:FLOOR_Y - 40, scale:1.3, ms:70 });
    if(a) anim(a, [{opacity:1},{opacity:1,offset:.3},{opacity:0}], { duration:900, fill:'forwards' });
    await sleep(1000);
    b.over = false;
    return f.apply(this, arguments);
  })(heroDies);

  window.QL_CREAM = { charge, relMul, moveOf };
})();
