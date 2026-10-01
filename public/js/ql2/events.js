/* ==========================================================================
   LETTERⁿ v64 — CHOICE EVENTS (2 per chapter, before stages 3 and 6)
   --------------------------------------------------------------------------
   A small fork in the road — never a full roguelike:
     stage 3  one of  💰 treasure (safe vs dig deeper) · 🧪 blood fountain
                      (trade HP for potions) · 🛒 wandering merchant
     stage 6  🚪 cursed door → ELITE battle (harder, x2 gold + gem) or walk past
   Shows once a day per stage (and the first time it is reached). Story
   battles only — challenges, Endless and the True Final Boss skip it.
   Elite / fountain effects are applied by js/ql2/tactics.js (ui.tacElite,
   ui.tacFountain). Numbers: BALANCE.TAC.elite.
   ========================================================================== */
(function(){
  const T = BALANCE.TAC;
  const EV_STAGES = [3, 6];
  const kindOf = (ch, n) => n===6 ? 'door' : ['treasure','fountain','merchant'][ch % 3];
  const seenMap = () => { const V = V2(); return V.ev || (V.ev = {}); };
  const due = (ch, n) => EV_STAGES.includes(n) && !ui.run && seenMap()[stageIndex(ch, n)] !== todayKey();
  let bypass = false;
  function go(ch, n){ seenMap()[stageIndex(ch, n)] = todayKey(); persist(); closeModal(); bypass = true; try{ startStage(ch, n); } finally { bypass = false; } }

  function show(ch, n){
    const k = kindOf(ch, n), s = stageIndex(ch, n), L = LOCS[ch] || LOCS[0];
    const head = (art, t, sub, d) => `<div class="ev-art">${art}</div><div class="ev-h">${t}<small>${sub}</small></div><p class="ev-d">${d}</p>`;
    const where = `${esc(L.name)} · ก่อนเข้าด่าน ${ch+1}-${n}`;
    let body = '';
    if(k==='door') body = head('🚪', 'ประตูต้องสาป', where, 'เสียงคำรามดังมาจากหลังประตูเหล็กเก่า… ข้างในมีสมบัติ แต่ศัตรูก็ดุกว่าปกติ')
      + `<button class="ev-c risk" data-act="evPick" data-v="elite"><span>⚔️</span><b>เปิดประตู — ELITE BATTLE</b><small>ศัตรู HP +${BALANCE.pct(T.elite.hp)}% · ATK +${BALANCE.pct(T.elite.atk)}% · ชนะได้ทอง x${T.elite.gold} + ${esc(MATS[L.gem].th)}</small></button>`
      + `<button class="ev-c safe" data-act="evPick" data-v="pass"><span>🚶</span><b>เดินผ่านไป</b><small>ปลอดภัย · ด่านปกติ ไม่มีรางวัลพิเศษ</small></button>`;
    else if(k==='treasure'){ const g = Math.round(40 + s*5);
      body = head('💰', 'หีบสมบัติข้างทาง', where, 'หีบเก่าโผล่พ้นดินออกมาครึ่งหนึ่ง จะเก็บของด้านบนแล้วไปต่อ หรือขุดลึกลงไปอีก?')
      + `<button class="ev-c safe" data-act="evPick" data-v="take"><span>🪙</span><b>เก็บของด้านบน</b><small>ได้แน่นอน: ทอง ${fmt(g)} + ${esc(MATS[L.mat].th)} ×2</small></button>`
      + `<button class="ev-c risk" data-act="evPick" data-v="dig"><span>⛏️</span><b>ขุดลึกลงไป</b><small>50%: ${esc(MATS[L.gem].th)} + ทอง ${fmt(g*2)} · 50%: กับดัก! เริ่มด่านด้วย HP 80%</small></button>`; }
    else if(k==='fountain') body = head('🧪', 'น้ำพุโลหิต', where, 'น้ำพุสีแดงเรืองแสง ใครดื่มจะได้พลัง… แต่ต้องแลกด้วยเลือดของตัวเอง')
      + `<button class="ev-c risk" data-act="evPick" data-v="drink"><span>🩸</span><b>ดื่มน้ำพุ</b><small>เริ่มด่านด้วย HP 70% · ได้ยาพลัง ×2 + ยาฟื้นพลัง ×1</small></button>`
      + `<button class="ev-c safe" data-act="evPick" data-v="pass"><span>🚶</span><b>เดินผ่านไป</b><small>ปลอดภัย · ไม่มีรางวัลพิเศษ</small></button>`;
    else { const ph = Math.round(POTIONS.heal.price*3*.5), pp = Math.round(POTIONS.power.price*2*.5);
      body = head('🛒', 'พ่อค้าเร่', where, 'พ่อค้าแบกเป้ใบใหญ่โบกมือเรียก "ลดครึ่งราคา เฉพาะวันนี้นะ!"')
      + `<button class="ev-c safe" data-act="evPick" data-v="buyHeal" ${save.gold<ph?'disabled':''}><span>❤️</span><b>ยาฟื้นพลัง ×3</b><small>${ICON.coin} ${fmt(ph)} (ลด 50%)${save.gold<ph?' · ทองไม่พอ':''}</small></button>`
      + `<button class="ev-c safe" data-act="evPick" data-v="buyPow" ${save.gold<pp?'disabled':''}><span>💜</span><b>ยาพลัง ×2</b><small>${ICON.coin} ${fmt(pp)} (ลด 50%)${save.gold<pp?' · ทองไม่พอ':''}</small></button>`
      + `<button class="ev-c" data-act="evPick" data-v="pass"><span>👋</span><b>ไม่ซื้อ ไปต่อ</b><small>เข้าด่านเลย</small></button>`; }
    ui.evAt = { ch, n, k };
    modal(`<div class="ev">${body}</div>`);
  }

  function pick(v){
    const at = ui.evAt; if(!at) return; ui.evAt = null;
    const { ch, n } = at, s = stageIndex(ch, n), L = LOCS[ch] || LOCS[0];
    if(v==='elite'){ ui.tacElite = true; }
    if(v==='take'){ const g = Math.round(40 + s*5); toast(`💰 ได้รับ ${grant({ gold:g, mats:{ [L.mat]:2 } })}`); }
    if(v==='dig'){ const g = Math.round(40 + s*5);
      if(Math.random() < .5){ toast(`💎 เจอของดี! ${grant({ gold:g*2, mats:{ [L.gem]:1 } })}`); sfx.win && sfx.win(); }
      else { ui.tacFountain = .8; toast('💥 กับดัก! เริ่มด่านด้วย HP 80%'); sfx.bad && sfx.bad(); } }
    if(v==='drink'){ ui.tacFountain = .7; toast(`🩸 ${grant({ potions:{ power:2, heal:1 } })}`); }
    if(v==='buyHeal' || v==='buyPow'){
      const heal = v==='buyHeal', price = heal ? Math.round(POTIONS.heal.price*3*.5) : Math.round(POTIONS.power.price*2*.5);
      if(save.gold < price){ toast('ทองไม่พอ'); ui.evAt = at; return; }
      save.gold -= price; toast(`🛒 ${grant({ potions: heal ? { heal:3 } : { power:2 } })}`); sfx.coin && sfx.coin(.1);
    }
    go(ch, n);
  }

  startStage = (f => function(ch, n){
    if(!bypass && !ui.run && due(ch, n)){
      try{ show(ch, n); return; }catch(e){ console.error('events', e); }
    }
    return f.apply(this, arguments);
  })(startStage);

  Object.assign(ACTS2, { evPick: v => { pick(v); } });
  window.QL_EVENTS = { kindOf, due, show };
})();
