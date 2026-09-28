/* ==========================================================================
   QUEST LINES v51 — NEW ACCESSORIES
   --------------------------------------------------------------------------
   Six new accessories, each changing HOW you play rather than adding raw
   damage (numbers: BALANCE.ACC_NEW). Damage bonuses go through dmgMod(), so
   they add inside the BONUS / BURST groups like everything else.
     prism      Elemental Prism     element words +15% · burn / poison / freeze last 1 turn longer
     hourglass  Chrono Hourglass    every stage starts with the Ultimate gauge at 2/5
     ironHeart  Iron Heart          max HP +15%
     monocle    Weakpoint Monocle   hitting a weakness letter: +25% more
     rune       Rune of Eloquence   words of 7+ letters +20%
     leaf       Mandrake Leaf       heal 3% max HP after every word
   Unlock feats for every weapon / armor / accessory live in js/ql2/unlocks.js.
   ========================================================================== */
(function(){
  const A = BALANCE.ACC_NEW, pc = x => `+${BALANCE.pct(x)}%`;
  ACCESSORIES.push(
    { id:'monocle',  name:'Weakpoint Monocle', th:'แว่นส่องจุดอ่อน',   price:1100, desc:`ตีโดนตัวอักษรจุดอ่อน ดาเมจเพิ่มอีก ${pc(A.monocle)}` },
    { id:'prism',    name:'Elemental Prism',   th:'ปริซึมธาตุ',        price:1200, desc:`คำธาตุแรงขึ้น ${pc(A.prism)} · ติดไฟ/พิษ/แช่แข็ง นานขึ้น 1 เทิร์น` },
    { id:'ironHeart',name:'Iron Heart',        th:'หัวใจเหล็ก',        price:1300, desc:`HP สูงสุด ${pc(A.ironHeart)}` },
    { id:'hourglass',name:'Chrono Hourglass',  th:'นาฬิกาทรายกาลเวลา', price:1500, desc:`เริ่มทุกด่านด้วยเกจ Ultimate ${A.hourglassUlt}/5` },
    { id:'rune',     name:'Rune of Eloquence', th:'รูนวาจา',           price:1800, desc:`คำ 7 ตัวอักษรขึ้นไป ดาเมจ ${pc(A.rune)}` },
    { id:'leaf',     name:'Mandrake Leaf',     th:'ใบแมนเดรก',         price:2200, desc:`ฟื้น HP ${BALANCE.pct(A.leaf)}% ของ HP สูงสุด ทุกครั้งที่สะกดคำ` },
  );
  const svg = inner => `<svg viewBox="0 0 40 40" class="ico">${inner}</svg>`;
  Object.assign(ACC_ART, {
    monocle:  svg(`<circle cx="17" cy="17" r="11" fill="#bfe8ff" opacity=".55" ${S(3)}/><circle cx="17" cy="17" r="7" fill="none" stroke="#ffcf4a" stroke-width="2.5"/><path d="M13,13 Q15,11 18,12" stroke="#fff" stroke-width="2" fill="none"/><path d="M25,25 Q30,31 34,36" stroke="${OL}" stroke-width="3" fill="none"/><circle cx="17" cy="17" r="2.5" fill="#e0453a"/>`),
    prism:    svg(`<path d="M20,4 L35,32 L5,32 Z" fill="#e8f6ff" ${S(3)}/><path d="M20,4 L20,32" stroke="#9fd8ff" stroke-width="2"/><path d="M27,18 L38,14 M28,21 L39,21 M27,24 L38,28" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M27,18 L38,14" stroke="#ff5a3a" stroke-width="3"/><path d="M28,21 L39,21" stroke="#ffe14a" stroke-width="3"/><path d="M27,24 L38,28" stroke="#4ad8ff" stroke-width="3"/>`),
    ironHeart:svg(`<path d="M20,34 L6,19 Q2,12 8,7 Q15,3 20,11 Q25,3 32,7 Q38,12 34,19 Z" fill="#9aa6b4" ${S(3)}/><path d="M11,12 Q14,9 17,12" stroke="#fff" stroke-width="2" fill="none"/><circle cx="14" cy="21" r="1.8" fill="${OL}"/><circle cx="26" cy="21" r="1.8" fill="${OL}"/><circle cx="20" cy="27" r="1.8" fill="${OL}"/>`),
    hourglass:svg(`<path d="M9,4 L31,4 M9,36 L31,36" stroke="#8a5a30" stroke-width="4" stroke-linecap="round"/><path d="M11,6 Q11,17 20,20 Q11,23 11,34 L29,34 Q29,23 20,20 Q29,17 29,6 Z" fill="#dff6ff" ${S(2.5)}/><path d="M14,30 Q20,25 26,30 L27,33 L13,33 Z" fill="#c77dff"/><path d="M20,20 L20,28" stroke="#c77dff" stroke-width="2"/><path d="M15,9 L25,9 Q23,14 20,16 Q17,14 15,9 Z" fill="#c77dff"/>`),
    rune:     svg(`<path d="M8,6 L30,4 L33,34 L10,36 Z" fill="#7a6a58" ${S(3)}/><path d="M16,11 L22,11 M19,11 L19,29 M15,20 L24,17 M15,26 L24,23" stroke="#7fe6ff" stroke-width="2.6" stroke-linecap="round"/><circle cx="27" cy="9" r="2" fill="#7fe6ff"/>`),
    leaf:     svg(`<path d="M20,36 Q6,26 8,12 Q20,2 32,12 Q34,26 20,36 Z" fill="#6fcf4a" ${S(3)}/><path d="M20,34 Q18,20 20,8" stroke="#3a8a2a" stroke-width="2.5" fill="none"/><path d="M20,20 L13,15 M20,26 L27,20 M20,15 L26,11" stroke="#3a8a2a" stroke-width="2" fill="none"/><circle cx="29" cy="30" r="5" fill="#ff8aa0" ${S(2)}/><path d="M29,27 L29,33 M26,30 L32,30" stroke="#fff" stroke-width="2"/>`),
  });

  /* ---------- effects ---------- */
  evalWord = (f => function(){
    const r = f.apply(this, arguments);
    if(!r || r.state!=='ok' || !r.dmg || !ui.bat) return r;
    if(hasAcc('prism') && r.el) dmgMod(r, 'bonus', A.prism, `🔺 ปริซึมธาตุ ${pc(A.prism)}`);
    if(hasAcc('rune') && VocabularyManager.wordLength(r.w) >= 7) dmgMod(r, 'bonus', A.rune, `📜 รูนวาจา ${pc(A.rune)}`);
    if(hasAcc('monocle') && r.weak) dmgMod(r, 'burst', A.monocle, `🧐 แว่นส่องจุดอ่อน ${pc(A.monocle)}`);
    return r;
  })(evalWord);
  applyElement = (f => async function(el, dmg, e){
    const out = await f.apply(this, arguments);
    if(hasAcc('prism') && e){ ['burn','poison','frozen'].forEach(k => { if(e[k] > 0) e[k]++; }); try{ updateEnemyStatus(); renderEnemyPanel(); }catch(err){} }
    return out;
  })(applyElement);
  doAttack = (f => async function(){
    const b = ui.bat, w0 = b ? b.words : 0;
    const out = await f.apply(this, arguments);
    if(b && ui.bat===b && b.words > w0 && hasAcc('leaf') && b.hp > 0 && !b.over){
      const h = Math.max(1, Math.round(b.max*A.leaf)); if(b.hp < b.max){ b.hp = Math.min(b.max, b.hp + h); floatText(`🌿+${h}`, HERO_X-50, FLOOR_Y-120, '#8aff9a', 20); updateHud(); }
    }
    return out;
  })(doAttack);
  const ultStart = f => function(){ const out = f.apply(this, arguments); try{ if(ui.bat && hasAcc('hourglass')) ui.bat.ult = Math.max(ui.bat.ult||0, A.hourglassUlt); }catch(e){} return out; };
  startStage = ultStart(startStage);
  startTower = ultStart(startTower);
  // Iron Heart: HP multiplier of the hero wearing it (maxHpOf reads CH(id).hpMul)
  CHARACTERS.forEach(c => { const base = c.hpMul || 1;
    Object.defineProperty(c, 'hpMul', { configurable:true, get(){ return base * (save.eq && save.eq.char===c.id && hasAcc('ironHeart') ? 1 + A.ironHeart : 1); } }); });
})();
