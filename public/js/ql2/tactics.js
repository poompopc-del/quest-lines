/* ==========================================================================
   LETTERⁿ v64 — TACTICS ("Word Battle + Tactical Decisions")
   --------------------------------------------------------------------------
   Layered on the existing battle through wrappers + 5 tiny hooks in the base
   enemyTurn / useUltimate / doShuffle (index.html, marked "v64"). No new
   combat engine — the same turn loop, now with information and choices:

     Enemy shows its NEXT move (INTENT) → player reads it → spells a word →
     ATTACK or 🛡 GUARD with it → the word's ROLE adds an effect → enemy
     reacts → new intent.

   1. ENEMY INTENT   one archetype per enemy (from traits it already had):
        attacker · heavy · healer · defender · hex · venom · ghost · caster ·
        summoner · mimic · boss (+ Dr. Zomboss shown from its own cycle)
   2. WORD ROLES     ⚔️ attack (always) · 🛡 GUARD button (any word → shield) ·
        🎯 PRECISION (6+ letters / critical: shatters shields) ·
        🌀 CONTROL (ice/thunder/wind/earth words: interrupt spells & heals) ·
        💚 RECOVERY (food words heal · water/holy cure venom) ·
        ⚡ CHARGE (fantasy/tech/science words: Ultimate +1) · 🔥 element (unchanged)
   3. PERFECT WORD   a word that answers the intent: +15% & Ultimate +1
      WORD CHAIN     next word starts with the last letter: +8% per link
   4. SHUFFLE        selected letters are kept · free when the board has no word
   5. OBJECTIVES     optional bonus goal in about half of the story battles
   6. BOSSES         intent cycle + phase 2 (existing) + FINAL WORD under 15%
   7. ULTIMATE       choose ⚔️ damage (old) or a hero-specific tactical option
   Every number: BALANCE.TAC (js/ql2/balance.js).
   ========================================================================== */
(function(){
  const T = BALANCE.TAC, pc = x => `+${BALANCE.pct(x)}%`;
  const baseEl = el => { const E = el && ELEMENTS[el]; return E && E.god ? E.base : el; };
  const isZB = e => !!(e && e.key==='ogre' && e.boss && MON.ogre && MON.ogre.sprite==='zomboss');
  const ex = (e, dy) => FLOOR_Y - (e ? e.h*e.sc : 120) - (dy||0);
  const tacOf = b => b.tac || (b.tac = { turns:0, taken:0, chain:0, lastL:null, used:new Set(), long5:0, elems:0, ults:0, tactics:0, exec:0, perfects:0 });

  /* ======================================================================
     1 · ENEMY INTENT
     ====================================================================== */
  const SUMMONS = { treant:'goblin', kingslime:'slime', necro:'necroskel' };
  const VENOM_ART = new Set(['spider','frog','plant']);
  function archOf(e){
    if(isZB(e)) return 'zomboss';
    if(e.boss) return 'boss';
    if(e.key==='mimic') return 'mimic';
    if(SUMMONS[e.key] && MON[SUMMONS[e.key]]) return 'summoner';
    if(e.caster) return 'caster';
    if(e.art==='ghost') return 'ghost';
    const t = e.traits || [];
    if(t.includes('regen')) return 'healer';
    if(t.includes('armor3') || t.includes('armor4')) return 'defender';
    if(VENOM_ART.has(e.art)) return 'venom';
    if(t.includes('stone')) return 'hex';
    if(t.includes('heavy')) return 'heavy';
    return 'attacker';
  }
  const ARCH = {
    attacker:{ th:'นักสู้', d:'โจมตีตรงๆ ทุกเทิร์น' },
    heavy:   { th:'สายพลัง', d:'ชาร์จหนึ่งเทิร์น แล้วทุบแรง ×2.2' },
    healer:  { th:'สายฟื้นฟู', d:'บางเทิร์นจะฟื้น HP แทนการโจมตี' },
    defender:{ th:'สายป้องกัน', d:'บางเทิร์นตั้งโล่ ดูดซับดาเมจ' },
    hex:     { th:'สายสาป', d:'สาปตัวอักษรให้เป็นหิน' },
    venom:   { th:'สายพิษ', d:'โจมตีติดพิษ · ใช้คำซ้ำ = พิษสะสม' },
    ghost:   { th:'วิญญาณ', d:'ร่างโปร่ง: คำธรรมดาทะลุผ่าน ต้องใช้คำธาตุ' },
    caster:  { th:'จอมเวท', d:'ร่ายเวทหนึ่งเทิร์น แล้วปล่อยเวทรุนแรง' },
    summoner:{ th:'ผู้เรียก', d:'เรียกสมุนมาช่วย' },
    mimic:   { th:'นักเลียนแบบ', d:'สะท้อนดาเมจคำล่าสุดของคุณกลับมา' },
    boss:    { th:'บอส', d:'สลับท่าตามจังหวะ · เฟส 2 เร็วขึ้น · FINAL WORD' },
    zomboss: { th:'บอส', d:'หัวลอยสูง ↔ หัวลงมายิงลูกไฟ/ลูกน้ำแข็ง' },
  };
  // pattern: which special move on which turn of this enemy (t = 0, 1, 2 …)
  function pickIntent(e, b){
    const t = e.tacT, rage = e.phase2;
    switch(e.arch){
      case 'healer':   return (t%3===2 && e.hp < e.maxHp*.85) ? 'heal' : 'atk';
      case 'defender': return t%3===1 ? 'defend' : 'atk';
      case 'hex':      return t%3===1 ? 'hex' : 'atk';
      case 'venom':    return t%3===0 ? 'venom' : 'atk';
      case 'ghost':    return t%2===0 ? 'phase' : 'atk';
      case 'caster':   return ['cast1','cast2','atk'][t%3];
      case 'mimic':    return t%2===1 ? 'copy' : 'atk';
      case 'summoner': return (t%4===1 && (e.tacSum||0) < T.summonMax && !b.stage.tower && !e.boss) ? 'summon' : 'atk';
      case 'boss': {
        if(e.tacCast) return 'cast2';
        const every = rage ? 2 : 3; if(t%every!==every-1) return 'atk';
        const tr = e.traits||[];
        if(SUMMONS[e.key] && (e.tacSum||0) < T.summonMax && !b.stage.tower) return 'summon';
        if(e.caster) return e.tacCast ? 'cast2' : 'cast1';
        if(tr.includes('regen') && e.hp < e.maxHp*.8) return 'heal';
        if(tr.includes('stone')) return 'hex';
        return 'defend';
      }
    }
    return 'atk';
  }
  function planIntent(e, b){
    if(!e || e.hp<=0 || !b || b.over || e.intent) return;
    if(!e.arch) e.arch = archOf(e);
    e.tacT = e.tacT==null ? 0 : e.tacT + 1;
    let k = pickIntent(e, b);
    if(e.arch==='boss' && k==='cast1') e.tacCast = true;
    e.intent = { k };
    e.ethereal = k==='phase';
  }
  // predicted hit (same formula as the base enemyTurn, without the ±15% roll)
  function predict(e, mul){
    const heavy = e.traits.includes('heavy') && e.charge;
    let d = e.atk * (heavy ? 2.2 : 1) * BALANCE.takenMul(AR(save.eq.armor).block * (charIs('bruna') ? .5 : 1), CH(save.eq.char).dmgTaken, defMul());
    return Math.max(1, Math.round(d * (mul||1)));
  }
  function zbIntent(e){
    const z = e.zb || { phase:'up', t:0 }, up = BALANCE.ZOMBOSS ? (e.phase2 ? BALANCE.ZOMBOSS.upTurnsRage : BALANCE.ZOMBOSS.upTurns) : 2;
    if(z.phase==='down' && !z.shot && e.charge) return { c:'red', ic:z.eye==='ice'?'❄️':'🔥', t:z.eye==='ice'?'ลูกน้ำแข็ง':'ลูกไฟ', n:predict(e), hint:z.eye==='ice' ? 'ใช้คำธาตุ 🔥 ไฟ สกัด' : 'ใช้คำธาตุ ❄️ น้ำแข็ง สกัด' };
    if(z.phase==='down' && z.shot) return { c:'blue', ic:'🤖', t:'ลอยหนีขึ้น', hint:'โอกาสทอง! หัวยังต่ำอยู่' };
    if(z.phase==='up' && z.t+1 > up) return { c:'purple', ic:'⬇️', t:'หัวลงมาชาร์จ', hint:'เทิร์นหน้าจะยิงลูกไฟ/น้ำแข็ง' };
    const slam = ((z.t) % 2)===1;
    return { c:'red', ic:'🤖', t:slam ? 'กระแทก' : 'กัด', n:predict(e, slam && BALANCE.ZOMBOSS ? BALANCE.ZOMBOSS.crushAtk : 1), hint:'หัวอยู่สูง ดาเมจคุณลดลง' };
  }
  // what the player sees
  function intentView(e){
    if(!e || !e.intent) return null;
    if(e.arch==='zomboss') return zbIntent(e);
    const k = e.intent.k, heavyT = e.traits.includes('heavy');
    if(k==='atk' && heavyT && !e.charge) return { c:'purple', ic:'⚡', t:'ชาร์จพลัง', hint:'เทิร์นหน้าทุบแรง ×2.2 — เตรียม 🛡' };
    if(k==='atk' && heavyT && e.charge) return { c:'red', ic:'💥', t:'ทุบหนัก', n:predict(e), hint:'🛡 ป้องกันตอนนี้ = PERFECT' };
    switch(k){
      case 'atk':    return { c:'red', ic:'⚔️', t:'โจมตี', n:predict(e), hint:'🛡 ป้องกันได้' };
      case 'heal':   return { c:'green', ic:'💚', t:'ฟื้น HP', n:Math.round(e.maxHp*T.healPct), plus:true, hint:'🌀 คำควบคุมขัดได้ · ไฟ/พิษลดฮีลครึ่ง' };
      case 'defend': return { c:'blue', ic:'🛡️', t:'ตั้งโล่', n:Math.round(e.maxHp*T.enemyShield), plus:true, hint:`🎯 คำ ${T.precisionLen}+ ตัวทุบโล่แตก` };
      case 'hex':    return { c:'purple', ic:'🪨', t:'สาปหิน', n:predict(e, T.hexMul), hint:`หิน ${T.hexStones} ตัว · 🛡 ลดดาเมจ` };
      case 'venom':  return { c:'green', ic:'☠️', t:'กัดพิษ', n:predict(e, T.venomMul), hint:'💧/✨ ล้างพิษ · อย่าใช้คำซ้ำ' };
      case 'phase':  return { c:'purple', ic:'👻', t:'ร่างโปร่ง', n:predict(e), hint:'คำธรรมดาทะลุผ่าน — ใช้คำธาตุ!' };
      case 'cast1':  return { c:'purple', ic:'🔮', t:'ร่ายเวท', hint:'ไม่โจมตีเทิร์นนี้ · เทิร์นหน้าปล่อยเวท ×2' };
      case 'cast2':  return { c:'red', ic:'🔮', t:'ปล่อยเวท', n:predict(e, T.castMul), hint:`🌀 คำควบคุม หรือตี ≥${BALANCE.pct(T.breakPct)}% HP เพื่อขัด` };
      case 'copy':   return { c:'red', ic:'🪞', t:'เลียนแบบ', n:mimicDmg(e), hint:'สะท้อนคำล่าสุดของคุณ · 🛡 กันได้' };
      case 'summon': return { c:'yellow', ic:'📯', t:'เรียกสมุน', hint:'ปราบให้ไวก่อนสมุนมาเพิ่ม' };
      case 'stagger':return { c:'gray', ic:'💫', t:'เสียจังหวะ', hint:'ศัตรูถูกขัด เทิร์นนี้ไม่ทำอะไร' };
    }
    return null;
  }
  const mimicDmg = e => { const b = ui.bat; const last = b && b.tac && b.tac.lastDmg || 0; return Math.max(Math.round(e.atk*.5), Math.round(last*T.mimicPct)); };

  // the hook inside the base enemyTurn (after burn / poison / freeze / stun / regen, before the heavy charge)
  window.tacEnemyAct = async function(b, e){
    const it = e.intent; e.intent = null; e.tacMul = 0; e.tacFlat = 0; e.tacKindNow = null; e.tacActed = true; e.ethereal = false;
    // hero venom ticks first
    if(b.venom > 0){
      const d = Math.max(1, Math.round(b.max*T.venomPct)); b.venom--;
      b.hp -= d; floatText(`☠ -${d}`, HERO_X, FLOOR_Y-185, '#b8ff6a', 22); heroHurt(d, false, true); updateHud(); tacHud(); await sleep(350);
      if(await checkHeroDeath()) return true;
    }
    if(!it) return false;
    const k = it.k; e.tacKindNow = k;
    const done = async (ms) => { updateEnemyHp(); updateHud(); renderEnemyPanel(); await sleep(ms||650); endTurn(); return true; };
    switch(k){
      case 'stagger':
        floatText('💫 เสียจังหวะ!', EN_X, ex(e, 30), '#fff', 24, true); return done(500);
      case 'heal': {
        let h = Math.round(e.maxHp*T.healPct); if(e.burn>0 || e.poison>0){ h = Math.round(h*T.healPoisoned); }
        h = Math.min(h, e.maxHp - e.hp); e.hp += h; sfx.heal && sfx.heal();
        floatText(`💚 +${h}${(e.burn>0||e.poison>0)?' (ลดครึ่ง)':''}`, EN_X+20, ex(e, 20), '#6ef08a', 26, true); return done();
      }
      case 'defend': {
        const s = Math.round(e.maxHp*T.enemyShield); e.eShield = (e.eShield||0) + s;
        floatText(`🛡️ โล่ +${s}`, EN_X, ex(e, 24), '#8fd0ff', 26, true); sfx.stone && sfx.stone(); return done();
      }
      case 'cast1':
        floatText('🔮 ร่ายเวท…', EN_X, ex(e, 26), '#d8a0ff', 26, true); sfx.power && sfx.power();
        try{ anim($('#enemyG .enemy'), [{filter:'none'},{filter:'drop-shadow(0 0 18px #c77dff) brightness(1.3)'},{filter:'none'}], { duration:900 }); }catch(err){}
        return done(700);
      case 'summon': {
        const key = SUMMONS[e.key] || 'goblin', s = b.stage.s || 0, rng = mulberry(hashStr('sum'+s+(e.tacSum||0)+b.idx));
        const m = makeEnemy(key, s, rng, false, false);
        m.hp = m.maxHp = Math.max(8, Math.round(m.maxHp*T.summonHp)); m.gold = Math.max(1, Math.round(m.gold*.5)); m.summoned = true; m.golden = false;
        b.stage.enemies.splice(b.idx+1, 0, m); e.tacSum = (e.tacSum||0) + 1;
        banner('SUMMON!', `${e.th} เรียก ${m.th}`, 'mini'); sfx.boss && sfx.boss();
        try{ placeEnemies(false); }catch(err){}
        return done(900);
      }
      case 'hex':   e.tacMul = T.hexMul; break;
      case 'venom': e.tacMul = T.venomMul; break;
      case 'cast2': e.tacMul = T.castMul; e.tacCast = false; floatText('🔮 ปล่อยเวท!', EN_X, ex(e, 30), '#ff8aff', 28, true); break;
      case 'copy':  e.tacFlat = Math.round(mimicDmg(e) * BALANCE.takenMul(AR(save.eq.armor).block, CH(save.eq.char).dmgTaken, defMul())); floatText('🪞 เลียนแบบ!', EN_X, ex(e, 30), '#ffd27a', 24, true); break;
    }
    return false;
  };
  // after the hit landed (or was dodged / blocked)
  window.tacAfterHit = function(b, e, dmg){
    const k = e.tacKindNow; e.tacMul = 0; e.tacFlat = 0;
    const stone = n => { const c = b.tiles.map((t,i)=>i).filter(i=>!b.tiles[i].stone && !b.tiles[i].sel); for(let j=0;j<n && c.length;j++){ const i = c.splice(rint(0,c.length-1),1)[0]; b.tiles[i].stone = 2; b.tiles[i].gem = null; } sfx.stone && sfx.stone(); renderTiles(); };
    if(k==='hex') stone(T.hexStones);
    if(k==='cast2') stone(T.castStones);
    if(k==='venom' && dmg>0){ b.venom = Math.max(b.venom||0, T.venomTurns); floatText(`☠ ติดพิษ ${T.venomTurns} เทิร์น`, HERO_X, FLOOR_Y-210, '#b8ff6a', 20); }
    tacOf(b);
  };
  // 🛡 the guard shield soaks the hit before HP
  window.tacAbsorb = function(b, e, dmg, heavy){
    const tc = tacOf(b);
    if(!(b.guard > 0)){ tc.taken += dmg; return dmg; }
    const a = Math.min(b.guard, dmg); b.guard -= a; dmg -= a;
    floatText(`🛡 -${a}`, HERO_X+10, FLOOR_Y-200, '#8fd0ff', 26, true); sfx.stone && sfx.stone();
    if(dmg<=0){
      const big = heavy || ['cast2','copy'].includes(e.tacKindNow);
      floatText(big ? '✨ PERFECT GUARD!' : 'BLOCK!', HERO_X, FLOOR_Y-235, big ? '#fff1a0' : '#bfe8ff', big ? 30 : 24, true);
      if(big){ b.ult = Math.min(5, b.ult + T.perfectUlt); tc.perfects++; tc.tactics++; }
    }
    tc.taken += dmg; tacHud();
    return dmg;
  };

  // frozen / stunned / dodged turns: a planned intent is cancelled; guards wear off after the enemy's turn
  enemyTurn = (f => async function(){
    const b = ui.bat, e = curEnemy();
    if(!b || !e) return f.apply(this, arguments);
    const it = e.intent; e.tacActed = false;
    await f.apply(this, arguments);
    if(ui.bat!==b) return;
    if(it && !e.tacActed && e.hp>0 && e.intent===it){
      if(['cast2','heal','summon','defend'].includes(it.k)) floatText('💫 ถูกขัดจังหวะ!', EN_X, ex(e, 40), '#fff', 22, true);
      if(it.k==='cast2') e.tacCast = false;
      e.intent = null; e.ethereal = false; renderEnemyPanel();
    }
    if(b.guardT > 0){ b.guardT--; if(!b.guardT) b.guard = 0; }
    tacHud();
  })(enemyTurn);

  /* ======================================================================
     2 · WORD ROLES · PERFECT · CHAIN  (preview in evalWord, effects on use)
     ====================================================================== */
  const catsOf = w => { try{ const g = VocabularyManager.getWord(w); return (g && g.record && g.record.category) || []; }catch(err){ return []; } };
  evalWord = (f => function(){
    const r = f.apply(this, arguments), b = ui.bat, e = curEnemy();
    if(!r || r.state!=='ok' || !b) return r;
    const tc = tacOf(b), len = VocabularyManager.wordLength(r.w), el = baseEl(r.el), cats = r.rude ? [] : catsOf(r.w);
    const R = r.tac = {
      precision: !r.rude && (len >= T.precisionLen || !!r.crit),
      control: !r.rude && T.controlEls.includes(el),
      recovery: !r.rude && (cats.includes('food') || el==='water' || el==='holy'),
      food: cats.includes('food'),
      charge: !r.rude && cats.some(c => ['fantasy','technology','science'].includes(c)),
      guardRole: cats.some(c => ['combat','weapons','body'].includes(c)),
      chain: 0, perfect: null,
    };
    // chain
    const first = r.w[0];
    if(!r.rude && tc.lastL && first===tc.lastL){ R.chain = Math.min(T.chainMax, tc.chain + 1); dmgMod(r, 'bonus', T.chainStep*R.chain, `🔗 CHAIN x${R.chain} ${pc(T.chainStep*R.chain)}`); }
    // elon's scan: guaranteed critical
    if(b.tacCrit > 0 && !r.crit && !r.rude){ dmgMod(r, 'burst', BALANCE.CRIT_BONUS, `🎯 SCAN CRITICAL ${pc(BALANCE.CRIT_BONUS)}`); R.precision = true; }
    // ghost
    if(e && e.ethereal && !r.el){ r.dmg = 0; r.notes.unshift('👻 ร่างโปร่ง — คำธรรมดาทะลุผ่าน! ใช้คำธาตุ'); }
    // perfect: the word answers the intent
    const k = e && e.intent && e.intent.k;
    if(e && !r.rude){
      if(e.eShield>0 && R.precision) R.perfect = 'SHATTER';
      else if(k==='cast2' && R.control) R.perfect = 'INTERRUPT';
      else if(k==='heal' && R.control) R.perfect = 'INTERRUPT';
      else if(e.ethereal && r.el) R.perfect = 'SPIRIT BREAK';
      if(R.perfect && r.dmg>0) dmgMod(r, 'burst', T.perfect, `✨ PERFECT ${R.perfect}! ${pc(T.perfect)}`);
    }
    // shield preview
    if(e && e.eShield>0 && !R.precision && r.dmg>0) r.notes.push(`🛡 โล่ศัตรูดูดซับ ${Math.min(e.eShield, r.dmg)}`);
    return r;
  })(evalWord);

  const guardAmount = (r, b) => Math.min(Math.round(b.max*T.guardCapHp), Math.max(1, Math.round(Math.max(r.dmg, r.base||1) * T.guard * (1 + (r.tac && r.tac.guardRole ? T.guardRole : 0)))));

  // effects of the word's role (shared by ATTACK and GUARD)
  function applyRoles(b, r, e){
    const tc = tacOf(b), R = r.tac || {};
    tc.turns++;
    if(!r.rude){
      if(VocabularyManager.wordLength(r.w) >= 5) tc.long5++;
      if(r.el) tc.elems++;
      if(e && e.arch==='venom' && tc.used.has(r.w)){ b.venom = (b.venom||0) + T.repeatVenom; floatText(`☠ คำซ้ำ! พิษ +${T.repeatVenom}`, HERO_X, FLOOR_Y-215, '#b8ff6a', 20, true); }
      tc.used.add(r.w);
    }
    if(R.food){ const h = Math.max(1, Math.round(b.max*T.foodHeal)); if(b.hp < b.max){ b.hp = Math.min(b.max, b.hp+h); floatText(`💚 +${h}`, HERO_X-40, FLOOR_Y-130, '#6ef08a', 22); } }
    if(R.recovery && b.venom>0){ b.venom = 0; floatText('✨ ล้างพิษ!', HERO_X, FLOOR_Y-205, '#bfffd0', 22, true); }
    if(R.charge){ b.ult = Math.min(5, b.ult + T.chargeUlt); floatText(`⚡ CHARGE +${T.chargeUlt}`, HERO_X+30, FLOOR_Y-150, '#e4b6ff', 20); }
    if(R.control) tc.tactics++;
    if(R.perfect){ b.ult = Math.min(5, b.ult + T.perfectUlt); tc.perfects++; tc.tactics++; setTimeout(()=>{ if(ui.bat===b) floatText(`✨ PERFECT ${R.perfect}!`, EN_X-20, ex(e, 140), '#fff1a0', 30, true); }, 120); }
    tc.chain = R.chain || 0; tc.maxChain = Math.max(tc.maxChain||0, tc.chain);
    if(!r.rude){ const w = r.w; tc.lastL = w[w.length-1]; }
    if(b.tacCrit > 0) b.tacCrit--;
  }

  // ATTACK: roles + shield / interrupt / final word handled when the hit lands (enemyHurt)
  doAttack = (f => async function(){
    const b = ui.bat, e = curEnemy();
    if(!b || b.busy || !e) return f.apply(this, arguments);
    const r = evalWord(); if(r.state!=='ok') return f.apply(this, arguments);
    applyRoles(b, r, e);
    b.tacR = { r, e, len:VocabularyManager.wordLength(r.w), hp0:e.hp, done:false };
    tacOf(b).lastDmg = r.dmg;
    try{ return await f.apply(this, arguments); } finally { b.tacR = null; }
  })(doAttack);

  enemyHurt = (f => function(dmg, big){
    const b = ui.bat, e = curEnemy(), W = b && b.tacR;
    if(b && e && dmg > 0){
      // enemy shield
      if(e.eShield > 0){
        if(W && W.r.tac && W.r.tac.precision){ floatText('💥 SHATTER!', EN_X, ex(e, 60), '#8fd0ff', 30, true); e.eShield = 0; }
        else { const a = Math.min(e.eShield, dmg); e.eShield -= a; e.hp += a; dmg -= a; floatText(`🛡 -${a}`, EN_X+30, ex(e, 30), '#8fd0ff', 24, true); if(dmg<=0){ renderEnemyPanel(); return; } }
      }
      // interrupt a spell / heal with a big hit or a control word
      const k = e.intent && e.intent.k;
      if(W && !W.done && e.hp > 0 && (k==='cast2' || k==='heal' || k==='summon')){
        const broke = (W.r.tac && W.r.tac.control) || (W.hp0 - e.hp) >= e.maxHp*T.breakPct;
        if(broke){ W.done = true; if(k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; tacOf(b).tactics++; setTimeout(()=>{ if(ui.bat===b) floatText('⛔ INTERRUPT!', EN_X, ex(e, 100), '#ffe14a', 28, true); }, 200); }
      }
      // boss FINAL WORD: under 15% only a long word (or the Ultimate) may finish it
      if(e.boss && !isZB(e) && e.hp <= 0 && W && !b.tacUlt && W.len < T.finalLen){ e.hp = 1; setTimeout(()=>{ if(ui.bat===b) floatText(`FINAL WORD: ปิดฉากด้วยคำ ${T.finalLen}+ ตัว!`, EN_X-30, ex(e, 120), '#ff8a6a', 22, true); }, 150); }
      if(e.boss && !isZB(e) && !e.tacFinal && e.hp > 0 && e.hp <= e.maxHp*T.bossFinal){ e.tacFinal = true; setTimeout(()=>{ if(ui.bat===b){ banner('FINAL WORD!', `ปิดฉากด้วยคำ ${T.finalLen} ตัวอักษรขึ้นไป หรือ Ultimate`); } }, 500); }
      // execution: the finishing blow by a 6+ letter word
      if(W && e.hp <= 0 && W.len >= 6) tacOf(b).exec++;
    }
    return f.call(this, dmg, big);
  })(enemyHurt);

  /* ---------------- 🛡 GUARD: any word becomes a shield ---------------- */
  async function guardWord(){
    const b = ui.bat, e = curEnemy(); if(!b || b.busy || !e || b.over) return;
    const r = evalWord(); if(r.state!=='ok') return;
    if(r.rude){ toast('🤬 คำหยาบใช้ป้องกันไม่ได้'); sfx.bad && sfx.bad(); return; }
    b.busy = true; renderTray();
    const sh = guardAmount(r, b);
    applyRoles(b, r, e);
    if(save.settings.autoSpeak) speak(r.w);
    b.words++; save.stats.words++; addMastery(r.w); b.combo++; b.ult = Math.min(5, b.ult+1);
    save.stats.bestCombo = Math.max(save.stats.bestCombo, b.combo); checkAchievements();
    if(r.w.length > (save.stats.longest||'').length) save.stats.longest = r.w;
    const tm = r.meaning || thaiOf(r.w, 'combat'); if(tm) recordWord(tm.base, tm.thai, tm.bank);
    b.recent.unshift({ w:r.w, dmg:0 }); b.last = { w:r.w, meaning:tm, bank:r.bank, rude:false };
    try{ showWordCard(r.w, tm, r.bank, !tm); }catch(err){}
    b.guard = (b.guard||0) + sh; b.guardT = Math.max(b.guardT||0, 1);
    tacOf(b).tactics++;
    heroFlash('#7fd6ff'); floatText(`🛡 GUARD +${sh}`, HERO_X, FLOOR_Y-190, '#8fd0ff', 30, true); sfx.power && sfx.power();
    const used = b.sel.slice(); b.sel = []; used.forEach(i => { b.tiles[i] = newTile(b.stage.s); });
    balanceTiles(b.tiles, true); applyAura();
    updateHud(); renderTiles(); renderTray(); renderSide(); renderEnemyPanel(); tacHud(); persist();
    await sleep(450);
    await enemyTurn();
  }

  /* ======================================================================
     3 · SHUFFLE — keep the selected letters · free when the board is dead
     ====================================================================== */
  let deadKey = '', deadVal = false;
  function boardDead(b){
    const key = b.tiles.map(t => (t.stone?'#':'') + t.l).join('');
    if(key===deadKey) return deadVal;
    deadKey = key; try{ deadVal = !!DICT && !findBest(); }catch(err){ deadVal = false; }
    return deadVal;
  }
  doShuffle = (f => async function(){
    const b = ui.bat; if(!b || b.busy) return f.apply(this, arguments);
    b.sel.forEach(i => { if(b.tiles[i]) b.tiles[i].keep = true; });
    if(T.freeShuffle && boardDead(b)) b.tacFree = true;
    tacOf(b).turns++;
    return f.apply(this, arguments);
  })(doShuffle);

  /* ======================================================================
     4 · BATTLE OBJECTIVES (optional bonus)
     ====================================================================== */
  const OBJ = {
    speed:    { ic:'⚡', en:'SPEED',      th:n=>`ชนะภายใน ${n} เทิร์น`, need:b=>b.stage.enemies.length*2+3, cur:t=>t.turns, under:true, dyn:true, unit:'เทิร์น' },   // dyn: summoned enemies raise the limit
    scholar:  { ic:'📚', en:'SCHOLAR',    th:n=>`สะกดคำ 5+ ตัวอักษร ${n} ครั้ง`, need:()=>3, cur:t=>t.long5 },
    elemental:{ ic:'🔥', en:'ELEMENTAL',  th:n=>`ใช้คำธาตุ ${n} ครั้ง`, need:()=>2, cur:t=>t.elems },
    perfect:  { ic:'💎', en:'PERFECT',    th:()=>'เสีย HP ไม่เกิน 20%', need:b=>Math.round(b.max*.2), cur:t=>t.taken, under:true, unit:'HP' },
    execution:{ ic:'🎯', en:'EXECUTION',  th:()=>'ปิดฉากศัตรูด้วยคำ 6+ ตัว', need:()=>1, cur:t=>t.exec },
    overcharge:{ ic:'⚡', en:'OVERCHARGE',th:()=>'ใช้ Ultimate อย่างน้อย 1 ครั้ง', need:()=>1, cur:t=>t.ults },
    tactician:{ ic:'🧩', en:'TACTICIAN',  th:n=>`ใช้ 🛡/🌀/PERFECT ${n} ครั้ง`, need:()=>2, cur:t=>t.tactics },
    chain:    { ic:'🔗', en:'WORD CHAIN', th:()=>'ต่อคำให้ถึง CHAIN x2', need:()=>2, cur:t=>t.maxChain||0 },
  };
  const objState = b => { const tc = tacOf(b), o = tc.obj; if(!o) return null; const D = OBJ[o.k], c = D.cur(tc)||0; if(D.dyn) o.need = Math.max(o.need, D.need(b));
    return { D, need:o.need, cur:c, ok: D.under ? c <= o.need : c >= o.need, failed: D.under && c > o.need }; };
  startStage = (f => function(ch, n){
    const out = f.apply(this, arguments), b = ui.bat;
    try{
      if(b && !b.stage.tower){
        const tc = tacOf(b);
        if(!ui.run){
          const rng = mulberry(hashStr('obj' + b.stage.s + todayKey()));
          if(rng() < T.objChance || n===STAGES_PER){ const keys = Object.keys(OBJ), k = keys[Math.floor(rng()*keys.length)]; tc.obj = { k, need:OBJ[k].need(b) }; }
        }
        if(ui.tacElite){ ui.tacElite = false; tc.elite = true;
          b.stage.enemies.forEach(e => { e.hp = e.maxHp = Math.round(e.maxHp*(1+T.elite.hp)); e.atk = Math.round(e.atk*(1+T.elite.atk)); });
          setTimeout(()=>{ if(ui.bat===b) banner('ELITE BATTLE!', `ศัตรู HP +${BALANCE.pct(T.elite.hp)}% · ATK +${BALANCE.pct(T.elite.atk)}% · รางวัล x${T.elite.gold}`); }, 900); }
        if(ui.tacFountain){ const p = ui.tacFountain; ui.tacFountain = null; b.hp = Math.max(1, Math.round(b.max*p)); }
        renderEnemyPanel(); tacHud();
      }
    }catch(err){ console.error('tactics', err); }
    return out;
  })(startStage);

  stageClear = (f => async function(){
    const b = ui.bat; let html = '';
    try{
      if(b && !b.stage.tower){
        const tc = tacOf(b), V = V2();
        if(tc.taken <= b.max*.2){ V.stats.flawless = (V.stats.flawless||0) + 1; }
        const s = objState(b);
        if(s){
          if(s.ok){ V.stats.objs = (V.stats.objs||0) + 1;
            const R = { gold: Math.round(T.objGold + b.stage.s*T.objGoldPer), xp:T.objXp };
            const rng = Math.random(); if(rng < .25) R.potions = { heal:1 }; else if(rng < .45) R.potions = { power:1 }; else if(rng < .7){ const L = LOCS[b.stage.ch]||LOCS[0]; R.mats = { [L.mat]:2 }; }
            b.goldGain += R.gold;
            html = `<div class="tac-res ok"><b>${s.D.ic} ${s.D.en} ✔</b><span>${esc(s.D.th(s.need))}</span><div class="rewards">${grant(R)}</div></div>`;
          } else html = `<div class="tac-res"><b>${s.D.ic} ${s.D.en} ✖</b><span>${esc(s.D.th(s.need))} · ${s.D.under?`ใช้ไป ${s.cur} ${s.D.unit||''} (เกิน ${s.need})`:`ทำได้ ${s.cur}/${s.need}`}</span></div>`;
        }
        if(tc.elite){ const L = LOCS[b.stage.ch]||LOCS[0], g = b.goldGain*(T.elite.gold-1); save.gold += g; b.goldGain += g; addMat(L.gem, T.elite.gem, true);
          html += `<div class="tac-res ok"><b>⚔️ ELITE ✔</b><span>รางวัลพิเศษ</span><div class="rewards"><span class="pill">${ICON.coin}+${fmt(g)}</span><span class="pill">${matIcon(L.gem)}+${T.elite.gem}</span></div></div>`; }
        persist();
      }
    }catch(err){ console.error('tactics', err); }
    await f.apply(this, arguments);
    try{ const m = document.querySelector('#overlay .modal'); if(m && html){ const at = m.querySelector('.q2-res') || m.querySelector('.rewards'); at ? at.insertAdjacentHTML('afterend', html) : m.insertAdjacentHTML('beforeend', html); } }catch(err){}
  })(stageClear);

  /* ======================================================================
     5 · ULTIMATE — ⚔️ damage (unchanged) or a hero-specific tactical option
     ====================================================================== */
  const UTIL = {
    knight: { ic:'🛡️', en:'LAST STAND',   th:'โล่ 45% HP ยาว 2 เทิร์น + ฟื้น 15%' },
    pip:    { ic:'🧚', en:'FAIRY LIGHT',  th:'ฟื้น HP 35% · ล้างหินและพิษ' },
    mao:    { ic:'💨', en:'SMOKE VEIL',   th:'หลบ 2 ครั้ง · ศัตรูมึนงง 1 เทิร์น' },
    elon:   { ic:'🎯', en:'TACTICAL SCAN',th:'ทุบโล่ · ขัดเวท · 2 คำถัดไป CRITICAL' },
    boomtos:{ ic:'🌋', en:'HELL BRAND',   th:'ติดไฟ 4 เทิร์น · ขัดจังหวะศัตรู' },
    x:      { ic:'🔋', en:'OVERCLOCK',    th:'สุ่มกระดานใหม่ (ล้างหิน) · ไม่เสียเทิร์น' },
    puff:   { ic:'🌀', en:'VACUUM GUARD', th:'ดูดหินออกทั้งกระดาน · โล่ 30% HP' },
  };
  const utilOf = () => UTIL[save.eq.char] || { ic:'🛡️', en:'GUARDIAN', th:'โล่ 40% HP' };
  useUltimate = (f => async function(){
    const b = ui.bat, e = curEnemy();
    if(!b || b.busy || b.ult < 5 || !e || b.over) return f.apply(this, arguments);
    const RU = typeof rulesOf==='function' && b.egUsed ? (rulesOf(b)||{}) : {};
    if(RU.noUlt || (RU.ultLimit!==undefined && (b.egUlt||0) >= RU.ultLimit)) return f.apply(this, arguments);
    if(b.tacUltPick){ b.tacUltPick = false; tacOf(b).ults++; b.tacUlt = true; try{ return await f.apply(this, arguments); } finally { b.tacUlt = false; } }
    const U = utilOf(), dmg = BALANCE.ultDamage(b);
    modal(`<div class="tac-ult"><div class="tac-ult-h">⚡ ULTIMATE<small>เลือกใช้พลังแบบไหน?</small></div>
      <button class="tac-ult-b dmg" data-act="tacUlt" data-v="dmg"><span>⚔️</span><b>ULTIMATE STRIKE</b><small>ดาเมจ ~${fmt(dmg)}</small></button>
      <button class="tac-ult-b util" data-act="tacUlt" data-v="util"><span>${U.ic}</span><b>${esc(U.en)}</b><small>${esc(U.th)}</small></button>
      <button class="cbtn wood small" data-act="closeModal">ยกเลิก</button></div>`, { dismiss:true });
  })(useUltimate);
  window.tacUltUtil = async function(b, e){
    const id = save.eq.char, U = utilOf(), tc = tacOf(b);
    floatText(`${U.ic} ${U.en}!`, HERO_X, FLOOR_Y-215, '#e4b6ff', 30, true);
    try{ auraBurst(4, false, '#7fd6ff'); }catch(err){} heroFlash('#7fd6ff'); sfx.power && sfx.power();
    const shield = p => { const s = Math.round(b.max*p); b.guard = (b.guard||0) + s; floatText(`🛡 +${s}`, HERO_X, FLOOR_Y-180, '#8fd0ff', 26, true); };
    const heal = p => { const h = Math.round(b.max*p); b.hp = Math.min(b.max, b.hp + h); floatText(`+${h}`, HERO_X-30, FLOOR_Y-150, '#6ef08a', 26); };
    const unstone = () => { b.tiles.forEach(t => { if(t.stone){ t.stone = 0; t.fresh = true; } }); };
    const interrupt = () => { if(e.intent && e.intent.k!=='atk'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; floatText('⛔ INTERRUPT!', EN_X, ex(e, 80), '#ffe14a', 26, true); } };
    let free = false;
    switch(id){
      case 'knight': shield(.45); b.guardT = 2; heal(.15); break;
      case 'pip': heal(.35); unstone(); b.venom = 0; break;
      case 'mao': b.evade = Math.max(b.evade||0, 2); e.stun = true; floatText('💫 มึนงง!', EN_X, ex(e, 30), '#fff', 24); break;
      case 'elon': if(e.eShield){ e.eShield = 0; floatText('💥 SHATTER!', EN_X, ex(e, 50), '#8fd0ff', 28, true); } interrupt(); b.tacCrit = 2; break;
      case 'boomtos': e.burn = Math.max(e.burn||0, 4); e.burnDmg = Math.max(e.burnDmg||0, Math.round(e.atk*1.25)); interrupt(); try{ updateEnemyStatus(); }catch(err){} break;
      case 'x': b.tiles = b.tiles.map(() => newTile(b.stage.s)); balanceTiles(b.tiles, true); applyAura(); free = true; break;
      case 'puff': unstone(); shield(.30); break;
      default: shield(.40);
    }
    tc.tactics++;
    updateHud(); renderTiles(); renderTray(); renderEnemyPanel(); tacHud(); persist();
    await sleep(700);
    if(free){ floatText('⏩ ไม่เสียเทิร์น', HERO_X, FLOOR_Y-200, '#fff', 20); endTurn(); return; }
    await enemyTurn();
  };

  /* ======================================================================
     6 · UI — intent badge · enemy panel line · guard button · chips · HUD
     ====================================================================== */
  const CLR = { red:'#ff5a5a', purple:'#c77dff', green:'#5ee08a', blue:'#5ab8ff', yellow:'#ffd24a', gray:'#9a96b8' };
  function intentBadge(){
    const st = $('#stage'), b = ui.bat, e = curEnemy(); if(!st) return;
    let el = $('#tacIntent');
    const v = b && !b.over && e && e.hp>0 ? intentView(e) : null;
    if(!v){ if(el) el.hidden = true; return; }
    if(!el){ el = document.createElement('button'); el.id = 'tacIntent'; el.className = 'tac-intent'; el.dataset.act = 'tacInfo'; st.appendChild(el); }
    el.hidden = false; el.style.setProperty('--ic', CLR[v.c]||CLR.red);
    el.innerHTML = `<span class="ti-ic">${v.ic}</span><b>${esc(v.t)}</b>${v.n!=null?`<em>${v.plus?'+':''}${v.n}</em>`:''}`;
    // above the enemy's HP bar
    try{
      const g = $('#enemyG'), bar = g && (g.querySelector('.ehp') || g.querySelector('.enemy'));
      const r = bar.getBoundingClientRect(), s = st.getBoundingClientRect();
      if(r.width){ el.style.left = Math.max(4, Math.min(s.width - 4 - el.offsetWidth, r.left - s.left + r.width/2 - el.offsetWidth/2)) + 'px'; el.style.top = Math.max(46, r.top - s.top - el.offsetHeight - 6) + 'px'; }
    }catch(err){}
  }
  renderEnemyPanel = (f => function(){
    const out = f.apply(this, arguments), b = ui.bat, e = curEnemy(), el = $('#enemyPanel');
    try{
      if(b && e && el && e.hp>0){
        planIntent(e, b);
        const v = intentView(e), st = el.querySelector('.estats');
        if(e.eShield>0 && st) st.insertAdjacentHTML('beforeend', `<span class="tac-esh">🛡️${e.eShield}</span>`);
        if(v && st) st.insertAdjacentHTML('afterend', `<button class="tac-row" data-act="tacInfo" style="--ic:${CLR[v.c]||CLR.red}"><span class="ti-ic">${v.ic}</span><b>${esc(v.t)}${v.n!=null?` ${v.plus?'+':''}${v.n}`:''}</b><small>${esc(v.hint||'')}</small><i>ⓘ</i></button>`);
      }
      intentBadge();
    }catch(err){ console.error('tactics', err); }
    return out;
  })(renderEnemyPanel);
  window.addEventListener('resize', () => setTimeout(intentBadge, 60));
  // keep the badge glued to the enemy while it walks in / reacts
  placeEnemies = (f => function(){ const out = f.apply(this, arguments); setTimeout(intentBadge, 30); setTimeout(intentBadge, 700); return out; })(placeEnemies);
  enemyDies = (f => async function(){ const el = $('#tacIntent'); if(el) el.hidden = true; return f.apply(this, arguments); })(enemyDies);
  walkToNext = (f => async function(){ const el = $('#tacIntent'); if(el) el.hidden = true; const out = await f.apply(this, arguments); setTimeout(intentBadge, 50); return out; })(walkToNext);

  // hero chips (guard · venom) + the objective chip
  function tacHud(){
    const b = ui.bat, me = document.querySelector('.battle .hud .me'); if(!b || !me) return;
    let h = $('#tacHero'); if(!h){ h = document.createElement('span'); h.id = 'tacHero'; h.className = 'tac-hero'; me.appendChild(h); }
    h.innerHTML = `${b.guard>0?`<i class="g">🛡${b.guard}</i>`:''}${b.venom>0?`<i class="v">☠${b.venom}</i>`:''}`;
    const s = objState(b), stage = $('#stage'); let o = $('#tacObj');
    if(!s || !stage){ if(o) o.remove(); return; }
    if(!o){ o = document.createElement('button'); o.id = 'tacObj'; o.className = 'tac-obj'; o.dataset.act = 'tacObjInfo'; stage.appendChild(o); }
    o.className = 'tac-obj' + (s.failed ? ' fail' : s.ok && !s.D.under ? ' ok' : '');
    o.innerHTML = `${s.D.ic} <b>${s.D.en}</b> ${s.D.under ? `${s.cur}/${s.need}${s.D.unit?' '+s.D.unit:''}` : `${Math.min(s.cur,s.need)}/${s.need}`}${s.failed?' ✖':s.ok&&!s.D.under?' ✔':''}`;
  }
  window.tacHud = tacHud;
  updateHud = (f => function(){ if(!ui.bat || !$('#hpBar')) return; const out = f.apply(this, arguments); try{ tacHud(); }catch(err){} return out; })(updateHud);   // safe if a late animation finishes after leaving the battle

  // the 🛡 button sits under the shuffle button
  buildBattleDom = (f => function(){
    const out = f.apply(this, arguments);
    try{
      const sh = $('#bShuf');
      if(sh && !$('#bGuard')){
        const col = document.createElement('div'); col.className = 'tac-sg'; sh.parentNode.insertBefore(col, sh); col.appendChild(sh);
        col.insertAdjacentHTML('beforeend', `<button class="bigbtn tac-guard" data-act="tacGuard" id="bGuard" disabled aria-label="ป้องกันด้วยคำนี้"><span class="tg-i">🛡</span><span class="tg-t">ป้องกัน</span></button>`);
      }
      tacHud(); renderTray();
    }catch(err){ console.error('tactics', err); }
    return out;
  })(buildBattleDom);

  renderTray = (f => function(){
    const out = f.apply(this, arguments), b = ui.bat;
    try{
      if(!b) return out;
      const r = evalWord(), msg = $('#trayMsg'), g = $('#bGuard'), sh = $('#bShuf'), tc = tacOf(b);
      if(g){ const ok = r.state==='ok' && !r.rude && !b.busy; g.disabled = !ok; g.querySelector('.tg-t').textContent = ok ? `+${guardAmount(r, b)}` : 'ป้องกัน'; }
      if(sh){ const free = !b.busy && T.freeShuffle && boardDead(b); sh.classList.toggle('tac-free', free); }
      if(msg && r.state==='ok' && r.tac && !r.reason){
        const R = r.tac, chips = [
          R.perfect && `<i class="p">✨ PERFECT</i>`, R.chain && `<i class="c">🔗 x${R.chain}</i>`, R.precision && `<i class="pr">🎯 PRECISION</i>`,
          R.control && `<i class="ct">🌀 CONTROL</i>`, R.recovery && `<i class="rc">💚 RECOVERY</i>`, R.charge && `<i class="ch">⚡ CHARGE</i>`, R.guardRole && `<i class="gd">🛡 +25%</i>`,
        ].filter(Boolean);
        if(chips.length) msg.insertAdjacentHTML('afterbegin', `<span class="tac-chips">${chips.join('')}</span>`);
      } else if(msg && r.state==='empty' && tc.lastL && !b.busy){
        msg.innerHTML = `<span class="tac-hint">🔗 ต่อคำ: ขึ้นต้นด้วย <b>${tc.lastL.toUpperCase()}</b> = CHAIN${tc.chain?` x${Math.min(T.chainMax, tc.chain+1)}`:''}</span>`;
      }
    }catch(err){}
    return out;
  })(renderTray);

  function infoModal(){
    const e = curEnemy(), b = ui.bat; if(!e || !b) return;
    const v = intentView(e), A = ARCH[e.arch] || ARCH.attacker;
    modal(`<div class="tac-info"><div class="tac-ult-h">${esc(e.name)}<small>${esc(e.th)} · ${esc(A.th)}</small></div>
      ${v?`<div class="tac-row big" style="--ic:${CLR[v.c]}"><span class="ti-ic">${v.ic}</span><b>เทิร์นหน้า: ${esc(v.t)}${v.n!=null?` ${v.plus?'+':''}${v.n}`:''}</b><small>${esc(v.hint||'')}</small></div>`:''}
      <p class="tac-p">${esc(A.d)}</p>
      ${e.boss && !isZB(e) ? `<p class="tac-p">👑 <b>กติกาบอส</b> · ทุก ${e.phase2?2:3} เทิร์นใช้ท่าพิเศษ · HP ต่ำกว่า 50% = PHASE 2 (จุดอ่อนใหม่ เร็วขึ้น) · ต่ำกว่า ${BALANCE.pct(T.bossFinal)}% = FINAL WORD ปิดฉากได้ด้วยคำ ${T.finalLen}+ ตัว หรือ Ultimate</p>` : ''}
      <div class="tac-legend"><b>บทบาทของคำ</b>
        <span>⚔️ ทุกคำโจมตีได้ · <b>🛡 ปุ่มป้องกัน</b> เปลี่ยนคำเป็นโล่ (หมดหลังศัตรูเล่น 1 เทิร์น)</span>
        <span>🎯 PRECISION คำ ${T.precisionLen}+ ตัว / Critical → ทุบโล่ศัตรู</span>
        <span>🌀 CONTROL คำธาตุ ❄️⚡🌪️🪨 → ขัดเวทและการฟื้น HP</span>
        <span>💚 RECOVERY คำหมวดอาหาร ฟื้น HP · 💧✨ ล้างพิษ</span>
        <span>⚡ CHARGE คำหมวดแฟนตาซี/เทคโนโลยี/วิทยาศาสตร์ → Ultimate +1</span>
        <span>🔗 CHAIN คำถัดไปขึ้นต้นด้วยตัวสุดท้ายของคำก่อน +${BALANCE.pct(T.chainStep)}%/ต่อ</span>
        <span>✨ PERFECT คำที่ตอบโต้ท่าของศัตรูได้พอดี +${BALANCE.pct(T.perfect)}% และ Ultimate +1</span>
        <span>🔄 สลับ: ตัวอักษรที่เลือกไว้จะไม่ถูกสลับ · กระดานไม่มีคำ = สลับฟรี</span></div>
      <button class="cbtn gold block" data-act="closeModal">เข้าใจแล้ว</button></div>`, { dismiss:true });
  }

  Object.assign(ACTS2, {
    tacGuard: () => { guardWord(); },
    tacInfo: () => { infoModal(); },
    tacObjInfo: () => { const b = ui.bat, s = b && objState(b); if(s) toast(`${s.D.ic} ${s.D.en}: ${s.D.th(s.need)} — โบนัสเมื่อผ่านด่าน (ไม่บังคับ)`); },
    tacUlt: v => { const b = ui.bat; closeModal(); if(!b) return; b.tacUltPick = true; b.ultMode = v==='util' ? 'util' : null; useUltimate(); },
  });

  window.QL_TAC = { planIntent, intentView, archOf, OBJ, objState, UTIL };
})();
