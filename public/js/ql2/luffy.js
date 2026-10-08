/* ==========================================================================
   LETTERⁿ v66 — LUFFY (ลูฟี่ หมวกฟาง) · ผู้ใช้ผลยางยืด "โกมุโกมุ"
   --------------------------------------------------------------------------
   Sprites: "One Piece (GBA) · Playable Characters · Monkey D. Luffy"
   (ripped by Paddy · The Spriters Resource) — cut into heroes/luffy/*.png,
   mirrored to face right (the Bazooka row already faced right).
   Move names follow the anime / manga (Gomu Gomu no …):

   CORE — the move depends on the word length (numbers: BALANCE.LUFFY)
     3–4 letters  Gomu Gomu no PISTOL   the arm stretches across the screen
     5 letters    Gomu Gomu no ONO (Axe) leg stretches up and slams · 25% stun
     6–7 letters  Gomu Gomu no GATLING  a storm of stretching punches (+22%)
     8+ / CRIT    Gomu Gomu no BAZOOKA  two-palm blast (+35%), knocks the enemy
                                         back and breaks its prepared move
   PASSIVE — rubber body: heavy blows (charged smashes, spells, mirror hits)
     bounce off: -40% damage, 25% bounced back to the enemy (Fusen balloon).
   ULTIMATE (tactical) — Gomu Gomu no FUSEN: a balloon shield that sends the
     next hit straight back. Damage Ultimate = a full Gatling flurry.
   v73: released to every player (was devOnly).
   ========================================================================== */
(function(){
  const LF = BALANCE.LUFFY, pc = x => `+${BALANCE.pct(x)}%`;
  HERO_SPRITE.luffy = { dir:'heroes/luffy/', ch:127, scale:3.3, face:'-24 -152 48 48',
    anims:{
      idle:   { n:7,  cw:33,  ax:14, dur:1.1, loop:true },
      walk:   { n:6,  cw:40,  ax:18, dur:.6,  loop:true },
      hurt:   { n:3,  cw:51,  ax:34, dur:.6 },
      dead:   { n:4,  cw:62,  ax:23, dur:1.0 },
      pistol: { n:7,  cw:94,  ax:21, dur:.75, th:'โกมุโกมุโนะ พิสทอล' },
      axe:    { n:11, cw:68,  ax:19, dur:1.0, th:'โกมุโกมุโนะ โอโนะ (ขวาน)' },
      gatling:{ n:9,  cw:125, ax:52, dur:1.0, th:'โกมุโกมุโนะ แกตลิ่ง' },
      bazooka:{ n:8,  cw:110, ax:18, dur:.95, th:'โกมุโกมุโนะ บาซูก้า' },
      balloon:{ n:11, cw:49,  ax:24, dur:1.1, th:'โกมุโกมุโนะ ฟูเซ็น (ลูกโป่ง)' },
      rocket: { n:6,  cw:66,  ax:46, dur:.7,  th:'โกมุโกมุโนะ ร็อกเก็ต' },
      dash:   { n:8,  cw:61,  ax:26, dur:.6,  th:'พุ่งตัว' },
      taunt:  { n:6,  cw:49,  ax:24, dur:1.3, th:'ชูกำปั้นดีใจ' } },
    attacks:['pistol','axe','gatling','bazooka'], extra:['balloon','rocket','dash','taunt'], demoOnly:true, finisher:'bazooka', finMin:99,
    finNote:`ท่าเปลี่ยนตามความยาวคำ: <b>3–4 ตัว</b> พิสทอล · <b>5 ตัว</b> โอโนะ ${pc(LF.axe)} ลุ้นมึนงง · <b>6–7 ตัว</b> แกตลิ่ง ${pc(LF.gatling)} · <b>8 ตัวขึ้นไป / Critical</b> บาซูก้า ${pc(LF.bazooka)} ผลักศัตรูจนเสียท่า` };
  // the same visibility rules the engine builds for its own sprite heroes (index.html sprCSS)
  (function(){
    const k = 'luffy', c = HERO_SPRITE[k]; let css = '';
    for(const [n,a] of Object.entries(c.anims)){
      css += `@keyframes spr-${k}-${n}{from{transform:translateX(0px)}to{transform:translateX(${-(a.loop?a.n:a.n-1)*a.cw}px)}}`;
      css += `.spr-demo .spr-${k} .spr-a-${n} .spr-strip{animation:spr-${k}-${n} ${a.dur}s steps(${a.loop?a.n:a.n+',jump-none'}) infinite}`;
    }
    const show = (sel, n) => `${sel} .spr-${k} .spr-a{display:none}${sel} .spr-${k} .spr-a-${n}{display:inline}`;
    css += `.spr-${k} .spr-a{display:none}.spr-${k} .spr-a-idle{display:inline}` + show('#heroA.walk','walk') + show('#heroA.hurt','hurt') + show('#heroA.dead','dead');
    [...c.attacks, ...c.extra].forEach(n => { css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n); });
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    Object.keys(c.anims).forEach(n => { const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`; });
  })();

  CHARACTERS.push({ id:'luffy', name:'Luffy', th:'ลูฟี่ หมวกฟาง', price:4000, role:'ยางยืด · หมัดยาว', skill:'โกมุโกมุ',
    desc:`ท่าเปลี่ยนตามความยาวคำ · 3–4 ตัว พิสทอล หมัดยืดข้ามจอ · 5 ตัว โอโนะ ${pc(LF.axe)} ${BALANCE.pct(LF.axeStun)}% ทำศัตรูมึนงง · 6–7 ตัว แกตลิ่ง ${pc(LF.gatling)} หมัดรัว · 8 ตัวขึ้นไปหรือ Critical บาซูก้า ${pc(LF.bazooka)} ผลักศัตรูจนท่าที่เตรียมไว้พัง · ร่างยาง: การโจมตีหนัก (ชาร์จ/เวท/เลียนแบบ) เบาลง ${BALANCE.pct(LF.rubber)}% และเด้งกลับ ${BALANCE.pct(LF.reflect)}%`,
    hpMul:1.05, dmgTaken:1 });
  CHAR_TIP.luffy = 120;
  FIGHTER.luffy = { c:'#ff3b3b', atk:4, def:3, spd:4, diff:2 };
  HERO_EXTRA.luffy = { el:'earth', elNote:'ยาง — ร่างกายยืดหยุ่นทุกส่วน กระสุนและแรงกระแทกเด้งออก (ใช้คำธาตุได้ทุกชนิด)',
    ult:`ท่าตามความยาวคำ: พิสทอล → โอโนะ → แกตลิ่ง → บาซูก้า · ร่างยางลดการโจมตีหนัก ${BALANCE.pct(LF.rubber)}% · Ultimate แท็กติก: ฟูเซ็น สะท้อนการโจมตีครั้งถัดไป`,
    lore:'เด็กหนุ่มหมวกฟางที่กินผลปีศาจยางยืด ออกเดินทางเพื่อเป็นราชาแห่งถ้อยคำ — หมัดของเขายืดได้ไกลเท่าที่ความฝันจะไปถึง' };
  try{
    const R = window.UNLOCK_REQ;
    if(window.HERO_UNLOCK && R) window.HERO_UNLOCK.luffy = { tier:3, price:4000, reqs:[ R.clear(3) ], pick:2, opts:[ R.combo(10), R.long(30), R.minis(15) ],
      quote:'"ฉันจะเป็นราชาแห่งถ้อยคำให้ได้!" — ลูฟี่ขอร่วมทีม' };
  }catch(e){}
  try{ if(window.QL_TAC) QL_TAC.UTIL.luffy = { ic:'🎈', en:'GUM-GUM FUSEN', th:'ป่องตัวเป็นลูกโป่ง: โล่ 35% HP + สะท้อนการโจมตีครั้งถัดไปกลับทั้งหมด' }; }catch(e){}

  const isLuffy = () => save.eq && save.eq.char==='luffy';
  const moveOf = (len, crit) => crit || len >= LF.bazLen ? 'bazooka' : len >= LF.gatLen ? 'gatling' : len >= LF.axeLen ? 'axe' : 'pistol';
  const NAME = { pistol:'GUM-GUM PISTOL!', axe:'GUM-GUM AXE!', gatling:'GUM-GUM GATLING!', bazooka:'GUM-GUM BAZOOKA!' };

  evalWord = (f => function(){
    const r = f.apply(this, arguments);
    if(!isLuffy() || !r || r.state!=='ok' || r.rude) return r;
    const mv = moveOf(VocabularyManager.wordLength(r.w), r.crit);
    if(mv==='axe') dmgMod(r, 'bonus', LF.axe, `🦵 โอโนะ ${pc(LF.axe)}`);
    if(mv==='gatling') dmgMod(r, 'bonus', LF.gatling, `👊 แกตลิ่ง ${pc(LF.gatling)}`);
    if(mv==='bazooka') dmgMod(r, 'bonus', LF.bazooka, `💥 บาซูก้า ${pc(LF.bazooka)}`);
    r.lfMove = mv;
    return r;
  })(evalWord);
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!isLuffy() || !b || b.busy) return f.apply(this, arguments);
    const r = evalWord();
    ui.lfHit = r.state==='ok' ? { mv: r.rude ? 'pistol' : (r.lfMove || 'pistol'), len:r.w.length, dmg:r.dmg } : null;
    try{ return await f.apply(this, arguments); } finally { ui.lfHit = null; }
  })(doAttack);

  function sparkAt(x, y, col){ try{ hitSpark(x, y); }catch(e){} if(col) floatText('✦', x, y, col, 18); }
  heroAttack = (f => async function(lv, rude){
    if(!isLuffy() || !sprOf()) return f.apply(this, arguments);
    const h = ui.lfHit, mv = h ? h.mv : 'gatling', g = $('#heroG'), D = sprMs(mv, 900);
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    heroPose('pose-'+mv, D+80);
    floatText(NAME[mv], HERO_X+30, FLOOR_Y-235, mv==='bazooka' ? '#ffcf4a' : '#ffe0b0', mv==='pistol' ? 22 : 28, true);
    try{ sfx.swing(); }catch(e){}
    if(mv==='pistol'){
      await sleep(Math.round(D*.5)); slash(); sparkAt(EN_X-20, FLOOR_Y-90);
      await sleep(Math.round(D*.5));
    } else if(mv==='axe'){
      const p = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X+70,FLOOR_Y),offset:.4},{transform:tr(HERO_X+70,FLOOR_Y),offset:.85},{transform:tr(HERO_X,FLOOR_Y)}], { duration:D, easing:'ease-in-out' });
      await sleep(Math.round(D*.78)); slash(); shake(true); sparkAt(EN_X-10, FLOOR_Y-120, '#fff');
      await p;
    } else if(mv==='gatling'){
      const n = Math.max(5, Math.min(12, (h && h.len) || 8));
      for(let k=0;k<n;k++) setTimeout(() => { sparkAt(EN_X - 30 + rint(-25,25), FLOOR_Y - 60 - rint(0,90)); try{ sfx.hit(false); }catch(e){} }, Math.round(D*.25 + k*D*.6/n));
      await sleep(Math.round(D*.7)); slash();
      floatText(`${n} HITS!`, EN_X+30, FLOOR_Y-200, '#ffb04a', 26, true);
      await sleep(Math.round(D*.3));
    } else { // bazooka
      const p = anim(g, [{transform:tr(HERO_X,FLOOR_Y)},{transform:tr(HERO_X-14,FLOOR_Y),offset:.35},{transform:tr(HERO_X+40,FLOOR_Y),offset:.55},{transform:tr(HERO_X,FLOOR_Y)}], { duration:D, easing:'ease-in-out' });
      await sleep(Math.round(D*.55)); slash(); shake(true);
      const eg = $('#enemyG'); if(eg) anim(eg, [{transform:tr(EN_X,FLOOR_Y)},{transform:tr(EN_X+90,FLOOR_Y-20),offset:.35},{transform:tr(EN_X,FLOOR_Y)}], { duration:520, easing:'ease-out' });
      sparkAt(EN_X-30, FLOOR_Y-100, '#ffcf4a'); sparkAt(EN_X-10, FLOOR_Y-70);
      await p;
    }
  })(heroAttack);
  // when the blow lands: axe stun · bazooka breaks the enemy's prepared move
  slash = (f => function(){
    const out = f.apply(this, arguments), h = ui.lfHit, e = curEnemy();
    if(!isLuffy() || !h || !e || h._done) return out;
    h._done = true;
    if(h.mv==='axe' && !e.boss && Math.random() < LF.axeStun){ e.stun = true; setTimeout(() => { if(curEnemy()===e && e.hp>0) floatText('💫 มึนงง!', EN_X, FLOOR_Y-e.h*e.sc-40, '#fff', 22); }, 200); }
    if(h.mv==='bazooka' && e.intent && e.intent.k!=='atk' && e.intent.k!=='stagger'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' };
      setTimeout(() => { if(curEnemy()===e && e.hp>0){ floatText('⛔ เสียท่า!', EN_X, FLOOR_Y-e.h*e.sc-70, '#ffe14a', 24, true); renderEnemyPanel(); } }, 250); }
    return out;
  })(slash);

  // rubber body + Fusen balloon (both happen before the guard shield / HP)
  if(typeof window.tacAbsorb==='function'){
    window.tacAbsorb = (f => function(b, e, dmg, heavy){
      if(isLuffy() && b && e && dmg>0){
        if(b.lfBalloon){ b.lfBalloon = 0; heroPose('pose-balloon', sprMs('balloon', 1100)+60);
          e.hp -= dmg; floatText(`🎈 BOING! สะท้อน ${dmg}`, HERO_X+20, FLOOR_Y-220, '#ffd0a0', 26, true); try{ updateEnemyHp(); }catch(err){} return f.call(this, b, e, 0, heavy); }
        const big = heavy || ['cast2','copy'].includes(e.tacKindNow);
        if(big){ const cut = Math.round(dmg*LF.rubber), back = Math.max(1, Math.round(dmg*LF.reflect));
          dmg -= cut; e.hp -= back; heroPose('pose-balloon', sprMs('balloon', 1100)+60);
          floatText(`🎈 ร่างยาง -${cut} · เด้งกลับ ${back}`, HERO_X+20, FLOOR_Y-215, '#ffd0a0', 20, true); try{ updateEnemyHp(); }catch(err){} }
      }
      return f.call(this, b, e, dmg, heavy);
    })(window.tacAbsorb);
  }
  // tactical Ultimate: Gum-Gum Fusen
  if(typeof window.tacUltUtil==='function'){
    window.tacUltUtil = (f => async function(b, e){
      if(!isLuffy()) return f.apply(this, arguments);
      heroPose('pose-balloon', sprMs('balloon', 1100)+60);
      floatText('🎈 GUM-GUM FUSEN!', HERO_X, FLOOR_Y-225, '#ffd0a0', 30, true);
      const s = Math.round(b.max*.35); b.guard = (b.guard||0) + s; b.guardT = Math.max(b.guardT||0, 1); b.lfBalloon = 1;
      floatText(`🛡 +${s}`, HERO_X, FLOOR_Y-180, '#8fd0ff', 26, true);
      updateHud(); renderEnemyPanel(); persist();
      await sleep(900);
      await enemyTurn();
    })(window.tacUltUtil);
  }
  // celebrate a cleared stage
  stageClear = (f => async function(){ if(isLuffy()) heroPose('pose-taunt', sprMs('taunt', 1300)+60); return f.apply(this, arguments); })(stageClear);
  window.QL_LUFFY = { moveOf };
})();
