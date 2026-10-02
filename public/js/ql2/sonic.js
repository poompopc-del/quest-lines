/* ==========================================================================
   LETTERⁿ v66 — SONIC (โซนิค) · เม่นสายฟ้าสีฟ้า สายความเร็ว
   --------------------------------------------------------------------------
   Sprites: "Sonic the Hedgehog (Genesis) · Sonic" sheet (The Spriters
   Resource) — cut into heroes/sonic/*.png. The golden "super_*" strips are
   recoloured from the same frames (Super Sonic never appears in Sonic 1).
   Rules borrow from the games:

   RINGS — every letter you spell picks up a ring (+10 when an enemy falls).
     Get hit while holding rings → the rings scatter and soak HALF the hit
     (you lose them all) · with 0 rings you take the full blow.
   CORE — the move depends on the word length (numbers: BALANCE.SONIC)
     3–4 letters  SPIN ATTACK   curls into a ball and rolls through
     5–6 letters  SPIN DASH     revs in place and launches (+20%)
     7+ / CRIT    HOMING ATTACK springs up and homes in from above (+30%)
   ULTIMATE (tactical) — SUPER SONIC: spends the rings, turns gold —
     immune to damage and +30% damage for 1 + rings/20 enemy turns (max 3).
   Starts as devOnly (dev mode only) until the developer releases him.
   ========================================================================== */
(function(){
  const SN = BALANCE.SONIC, pc = x => `+${BALANCE.pct(x)}%`;
  HERO_SPRITE.sonic = { dir:'heroes/sonic/', ch:45, scale:4, face:'-44 -176 80 80',
    anims:{
      idle:   { n:9,  cw:32, ax:17, dur:2.2, loop:true },
      walk:   { n:6,  cw:39, ax:19, dur:.55, loop:true },
      hurt:   { n:2,  cw:39, ax:22, dur:.6 },
      dead:   { n:2,  cw:34, ax:18, dur:.8 },
      run:    { n:4,  cw:31, ax:14, dur:.32, loop:true, th:'วิ่งเต็มสปีด' },
      spin:   { n:9,  cw:31, ax:15, dur:.7,  th:'สปินแอทแท็ก' },
      dash:   { n:10, cw:31, ax:15, dur:.85, th:'สปินแดช' },
      spring: { n:1,  cw:24, ax:13, dur:.5,  th:'กระโดดสปริง' },
      skid:   { n:2,  cw:34, ax:16, dur:.4,  th:'เบรกเท้า' },
      taunt:  { n:6,  cw:35, ax:18, dur:1.2, th:'ท่าชนะ' },
      super_idle: { n:9,  cw:32, ax:17, dur:1.2, loop:true },
      super_run:  { n:4,  cw:31, ax:14, dur:.28, loop:true },
      super_spin: { n:9,  cw:31, ax:15, dur:.7 },
      super_dash: { n:10, cw:31, ax:15, dur:.85 } },
    attacks:['spin','dash','spring'], extra:['run','skid','taunt'], demoOnly:true, finisher:'dash', finMin:99,
    finNote:`ท่าเปลี่ยนตามความยาวคำ: <b>3–4 ตัว</b> สปินแอทแท็ก · <b>5–6 ตัว</b> สปินแดช ${pc(SN.dash)} · <b>7 ตัวขึ้นไป / Critical</b> โฮมมิ่งแอทแท็ก ${pc(SN.homing)} · ทุกตัวอักษร = 1 แหวน 💍` };
  const SUPER = ['idle','run','spin','dash'];
  (function(){
    const k = 'sonic', c = HERO_SPRITE[k]; let css = '';
    for(const [n,a] of Object.entries(c.anims)){
      css += `@keyframes spr-${k}-${n}{from{transform:translateX(0px)}to{transform:translateX(${-(a.loop?a.n:a.n-1)*a.cw}px)}}`;
      css += `.spr-demo .spr-${k} .spr-a-${n} .spr-strip{animation:spr-${k}-${n} ${a.dur}s steps(${a.loop?a.n:a.n+',jump-none'}) infinite}`;
    }
    const show = (sel, n) => `${sel} .spr-${k} .spr-a{display:none}${sel} .spr-${k} .spr-a-${n}{display:inline}`;
    css += `.spr-${k} .spr-a{display:none}.spr-${k} .spr-a-idle{display:inline}` + show('#heroA.walk','run') + show('#heroA.hurt','hurt') + show('#heroA.dead','dead');
    [...c.attacks, ...c.extra].forEach(n => { css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n); });
    // Super Sonic: the golden strips replace their blue twins (higher specificity than the rules above)
    css += show('#heroA.ss', 'super_idle') + show('#heroA.ss.walk', 'super_run');
    ['spin','dash','run'].forEach(n => { css += show(`#heroA.ss.pose-${n}`, 'super_'+n); });
    css += `#heroA.ss .spr-sonic image{filter:drop-shadow(0 0 3px #fff6a0) drop-shadow(0 0 9px #ffd23a)}
      .sn-rings{display:inline-flex;align-items:center;gap:2px;margin-left:6px;padding:1px 7px;border-radius:10px;background:rgba(40,30,0,.55);color:#ffe14a;font-weight:800;font-size:.82em;border:1px solid #c9a21a}
      .sn-rings.zero{color:#ff8a7a;border-color:#a33;animation:snBlink .6s steps(2) infinite}
      .sn-rings.sup{background:linear-gradient(90deg,#ffe14a,#fff6c0);color:#5a3a00}
      @keyframes snBlink{50%{opacity:.35}}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    Object.keys(c.anims).forEach(n => { const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`; });
  })();
  // which strip the frame ticker should step while golden
  if(typeof sprActiveName==='function'){
    sprActiveName = (f => function(actor, c){
      const n = f.apply(this, arguments);
      if(c===HERO_SPRITE.sonic && actor.id==='heroA' && actor.classList.contains('ss')){ const m = n==='walk' ? 'run' : n; if(SUPER.includes(m)) return 'super_'+m; }
      return n;
    })(sprActiveName);
  }
  try{ HERO_PORTRAIT.sonic = { src:'heroes/sonic/portrait.png', w:174, h:134, vb:'18 0 92 92', px:true }; }catch(e){}

  CHARACTERS.push({ id:'sonic', devOnly:true, name:'Sonic', th:'โซนิค เดอะเฮดจ์ฮ็อก', price:5000, role:'ความเร็ว · แหวน', skill:'สปินแดช',
    desc:`ทุกตัวอักษรที่สะกดได้ = 1 แหวน 💍 (ล้มศัตรู +${SN.killRings}) · ถ้าโดนโจมตีตอนมีแหวน แหวนกระจายและรับความเสียหายแทน ${BALANCE.pct(SN.ringCut)}% · 3–4 ตัว สปินแอทแท็ก · 5–6 ตัว สปินแดช ${pc(SN.dash)} · 7 ตัวขึ้นไปหรือ Critical โฮมมิ่งแอทแท็ก ${pc(SN.homing)}`,
    hpMul:.9, dmgTaken:1 });
  CHAR_TIP.sonic = 100;
  FIGHTER.sonic = { c:'#2f6bff', atk:4, def:2, spd:5, diff:3 };
  HERO_EXTRA.sonic = { el:'wind', elNote:'ลม — เร็วกว่าเสียง วิ่งจนเกิดกระแสลม (ใช้คำธาตุได้ทุกชนิด)',
    ult:`สปิน → สปินแดช → โฮมมิ่ง ตามความยาวคำ · แหวนรับความเสียหายแทนครึ่งหนึ่ง · Ultimate แท็กติก: SUPER SONIC อมตะ + ดาเมจ ${pc(SN.superDmg)}`,
    lore:'เม่นสีฟ้าที่วิ่งเร็วที่สุดในโลกแห่งตัวอักษร เก็บแหวนทองทุกครั้งที่สะกดคำ — ช้าไปนิดเดียวก็ทนไม่ได้แล้ว' };
  try{
    const R = window.UNLOCK_REQ;
    if(window.HERO_UNLOCK && R) window.HERO_UNLOCK.sonic = { tier:4, price:5000, reqs:[ R.clear(3) ], pick:2, opts:[ R.combo(12), R.objs(6), R.flawless(3) ],
      quote:'"ช้าเกินไปแล้ว! (You\'re too slow!)" — โซนิคพร้อมวิ่งไปกับทีม' };
  }catch(e){}
  try{ if(window.QL_TAC) QL_TAC.UTIL.sonic = { ic:'🌟', en:'SUPER SONIC', th:`ใช้แหวนทั้งหมดแปลงร่างทอง: อมตะ + ดาเมจ ${pc(SN.superDmg)} นาน 1 + แหวน/${SN.superPer} เทิร์นศัตรู (สูงสุด ${SN.superMax})` }; }catch(e){}

  const isSonic = () => save.eq && save.eq.char==='sonic';
  const moveOf = (len, crit) => crit || len >= SN.homLen ? 'homing' : len >= SN.dashLen ? 'dash' : 'spin';
  const NAME = { spin:'SPIN ATTACK!', dash:'SPIN DASH!', homing:'HOMING ATTACK!' };
  const superOn = b => !!(b && b.ssT > 0);
  function setGold(on){ const a = $('#heroA'); if(a) a.classList.toggle('ss', !!on); }

  // 💍 ring chip in the hero HUD
  function ringHud(){
    const b = ui.bat, me = document.querySelector('.battle .hud .me'); let c = $('#snRings');
    if(!b || !me || !isSonic()){ if(c) c.remove(); return; }
    if(!c){ c = document.createElement('span'); c.id = 'snRings'; me.appendChild(c); }
    const r = b.rings||0;
    c.className = 'sn-rings' + (superOn(b) ? ' sup' : r ? '' : ' zero');
    c.innerHTML = superOn(b) ? `🌟 SUPER ×${b.ssT}` : `💍 ${r}`;
    setGold(superOn(b));
  }
  updateHud = (f => function(){ const out = f.apply(this, arguments); try{ ringHud(); }catch(err){} return out; })(updateHud);
  function ringBurst(n, x, y){
    const fx = $('#fx'); if(!fx) return;
    for(let k=0;k<Math.min(16, n);k++){
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('r', 7); c.setAttribute('fill','none'); c.setAttribute('stroke','#ffd23a'); c.setAttribute('stroke-width',3.5); fx.appendChild(c);
      const a = -Math.PI*(.1 + .8*Math.random()), d = rint(70,160), up = rint(60,130);
      anim(c, [{transform:tr(x,y),opacity:1},{transform:tr(x+Math.cos(a)*d, y-up),opacity:1,offset:.45},{transform:tr(x+Math.cos(a)*d*1.4, y+30),opacity:0}], { duration:rint(700,1000), easing:'ease-out' }).then(()=>c.remove());
    }
  }
  function addRings(n){ const b = ui.bat; if(!b || n<=0) return; const r0 = b.rings||0; b.rings = r0 + n;
    try{ const t = Math.floor(b.rings/10) - Math.floor(r0/10); if(t > 0 && window.QL_ULT_GAIN) QL_ULT_GAIN(t, `💍x${t*10}`); }catch(e){}
    floatText(`💍 +${n}`, HERO_X-30, FLOOR_Y-190, '#ffe14a', 20); try{ sfx.coin ? sfx.coin() : 0; }catch(e){} ringHud(); }

  evalWord = (f => function(){
    const r = f.apply(this, arguments);
    if(!isSonic() || !r || r.state!=='ok' || r.rude) return r;
    const mv = moveOf(VocabularyManager.wordLength(r.w), r.crit);
    if(mv==='dash') dmgMod(r, 'bonus', SN.dash, `🌀 สปินแดช ${pc(SN.dash)}`);
    if(mv==='homing') dmgMod(r, 'bonus', SN.homing, `🎯 โฮมมิ่ง ${pc(SN.homing)}`);
    if(superOn(ui.bat)) dmgMod(r, 'bonus', SN.superDmg, `🌟 SUPER ${pc(SN.superDmg)}`);
    r.snMove = mv;
    return r;
  })(evalWord);
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!isSonic() || !b || b.busy) return f.apply(this, arguments);
    const r = evalWord();
    ui.snHit = r.state==='ok' ? { mv: r.rude ? 'spin' : (r.snMove || 'spin'), len:VocabularyManager.wordLength(r.w) } : null;
    if(ui.snHit) addRings(ui.snHit.len);
    try{ return await f.apply(this, arguments); } finally { ui.snHit = null; }
  })(doAttack);

  function sparkAt(x, y, col){ try{ hitSpark(x, y); }catch(e){} if(col) floatText('✦', x, y, col, 18); }
  heroAttack = (f => async function(lv, rude){
    if(!isSonic() || !sprOf()) return f.apply(this, arguments);
    const h = ui.snHit, mv = h ? h.mv : 'homing', g = $('#heroG'), gold = superOn(ui.bat);
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    floatText(NAME[mv], HERO_X+30, FLOOR_Y-205, gold ? '#fff1a0' : mv==='homing' ? '#8fd8ff' : '#cfe4ff', mv==='spin' ? 22 : 28, true);
    try{ sfx.swing(); }catch(e){}
    const reach = EN_X - HERO_X - 70;
    if(mv==='spin'){
      const D = 620; heroPose('pose-spin', D+120);
      const p = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X+reach,FLOOR_Y),offset:.45},{transform:tr(HERO_X+reach-30,FLOOR_Y-40),offset:.6},{transform:tr(HERO_X,FLOOR_Y)}], { duration:D, easing:'ease-in-out' });
      await sleep(Math.round(D*.45)); slash(); sparkAt(EN_X-30, FLOOR_Y-50, gold ? '#ffe14a' : null);
      await p;
    } else if(mv==='dash'){
      const D = sprMs('dash', 850); heroPose('pose-dash', D+60);
      // rev in place (dust), then launch
      for(let k=0;k<4;k++) setTimeout(() => floatText('💨', HERO_X-30-k*8, FLOOR_Y-10, '#fff', 18), k*90);
      await sleep(Math.round(D*.4));
      const p = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X+reach,FLOOR_Y),offset:.35},{transform:tr(HERO_X+reach,FLOOR_Y),offset:.55},{transform:tr(HERO_X,FLOOR_Y)}], { duration:Math.round(D*.85), easing:'ease-in' });
      await sleep(Math.round(D*.3)); slash(); shake(); sparkAt(EN_X-30, FLOOR_Y-45, '#8fd8ff');
      await p;
    } else { // homing: spring up, lock on, curl and dive
      heroPose('pose-spring', 520);
      floatText('⌖', EN_X, FLOOR_Y-110, '#ff4a4a', 46, true);
      const up = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X+40,FLOOR_Y-170)}], { duration:380, easing:'ease-out' });
      await up; heroPose('pose-spin', 700);
      const dive = anim(g, [{transform:tr(HERO_X+40,FLOOR_Y-170)},{transform:tr(EN_X-60,FLOOR_Y-90),offset:.5},{transform:tr(EN_X-120,FLOOR_Y-150),offset:.75},{transform:tr(HERO_X,FLOOR_Y)}], { duration:760, easing:'ease-in-out' });
      await sleep(380); slash(); shake(true); sparkAt(EN_X-30, FLOOR_Y-90, gold ? '#ffe14a' : '#8fd8ff'); sparkAt(EN_X-10, FLOOR_Y-120);
      await dive; heroPose('pose-skid', 380);
    }
  })(heroAttack);

  // 💍 rings soak half the hit · 🌟 Super Sonic is immune
  if(typeof window.tacAbsorb==='function'){
    window.tacAbsorb = (f => function(b, e, dmg, heavy){
      if(isSonic() && b && dmg>0){
        if(superOn(b)){ floatText('🌟 INVINCIBLE!', HERO_X, FLOOR_Y-220, '#fff1a0', 26, true); return 0; }
        dmg = f.call(this, b, e, dmg, heavy);   // guard shield first
        if(dmg>0 && (b.rings||0) > 0){
          const cut = Math.round(dmg*SN.ringCut), lost = b.rings; dmg -= cut; b.rings = 0;
          ringBurst(lost, HERO_X, FLOOR_Y-80);
          floatText(`💍×${lost} กระจาย! -${cut}`, HERO_X+10, FLOOR_Y-215, '#ffe14a', 22, true);
          try{ sfx.coin ? sfx.coin() : 0; }catch(err){}
          ringHud();
        }
        return dmg;
      }
      return f.call(this, b, e, dmg, heavy);
    })(window.tacAbsorb);
  }
  // Super Sonic counts down after each enemy turn
  enemyTurn = (f => async function(){
    const b = ui.bat;
    const out = await f.apply(this, arguments);
    if(isSonic() && b && ui.bat===b && b.ssT > 0){ if(b.ssFresh){ b.ssFresh = 0; return out; } b.ssT--; if(!b.ssT){ floatText('สิ้นสุด Super Sonic', HERO_X, FLOOR_Y-200, '#cfe4ff', 20); } ringHud(); }
    return out;
  })(enemyTurn);
  // tactical Ultimate: Super Sonic
  if(typeof window.tacUltUtil==='function'){
    window.tacUltUtil = (f => async function(b, e){
      if(!isSonic()) return f.apply(this, arguments);
      const r = b.rings||0, t = Math.min(SN.superMax, 1 + Math.floor(r/SN.superPer));
      b.rings = 0; b.ssT = (b.ssT||0) + t; b.ssFresh = 1;   // the turn spent transforming is free
      setGold(true); heroPose('pose-spin', 700);
      floatText('🌟 SUPER SONIC!', HERO_X, FLOOR_Y-225, '#fff1a0', 32, true);
      floatText(`อมตะ ${t} เทิร์น · ${pc(SN.superDmg)}`, HERO_X, FLOOR_Y-185, '#ffe14a', 20, true);
      try{ ringBurst(Math.min(r, 12), HERO_X, FLOOR_Y-90); }catch(err){}
      updateHud(); renderEnemyPanel(); persist();
      await sleep(900);
      await enemyTurn();
    })(window.tacUltUtil);
  }
  // +rings when an enemy falls; keep the gold when the next stage builds
  enemyDies = (f => async function(){ if(isSonic() && ui.bat && curEnemy() && curEnemy().hp<=0) addRings(SN.killRings); return f.apply(this, arguments); })(enemyDies);
  buildBattleDom = (f => function(){ const out = f.apply(this, arguments); try{ ringHud(); }catch(err){} return out; })(buildBattleDom);
  stageClear = (f => async function(){ if(isSonic()) heroPose('pose-taunt', sprMs('taunt', 1200)+60); return f.apply(this, arguments); })(stageClear);
  window.QL_SONIC = { moveOf, ringHud };
})();
