/* ==========================================================================
   QUEST LINES 2.0 — BOOT
   Runs last. Quietly records progress that existed before 2.0 (so the first
   load is not a wall of pop-ups), then draws the Hub.
   ========================================================================== */
(function(){
  const V = V2(); V.q.objDone = V.q.objDone || {};
  if(!V.booted){
    QUESTS.forEach(q=>{ const st = qStatus(q); if(st==='ready') V.q.done[q.id] = Date.now();
      if(st!=='locked' && st!=='claimed'){ V.q.act = V.q.act||{}; V.q.act[q.id] = 1; } if(st!=='locked' && st!=='claimed') qObjs(q).forEach((o,i)=>{ if(o.done) V.q.objDone[q.id+'#'+i] = 1; }); });
    let n = 0;
    Object.keys(ACH).forEach(id=>{ try{ if(!save.achievements[id] && ACH[id].need(save.stats)){ save.achievements[id] = Date.now(); n++; const m = TMETA[id]; if(m && m.title && !V.titles.own.includes(m.title)) V.titles.own.push(m.title); } }catch(e){} });
    const wasPlayer = !!save.name;
    V.booted = 1; persist();
    if(wasPlayer) setTimeout(()=>toast(`✨ ยินดีต้อนรับสู่ Quest Lines 2.0! ความคืบหน้าเดิมอยู่ครบ${n?` · ปลดล็อกถ้วยรางวัลใหม่ ${n} ถ้วย`:''}${claimableCount()?` · มีภารกิจรอรับรางวัล ${claimableCount()}`:''}`), 900);
  }
  // use the real visible height (iOS home-screen apps get 100vh/100dvh wrong → black band / cut-off bottom)
  const setH = ()=>{ const h = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight); document.documentElement.style.setProperty('--app-h', h+'px'); };
  setH(); window.addEventListener('resize', setH); window.addEventListener('orientationchange', ()=>setTimeout(setH, 250)); if(window.visualViewport) window.visualViewport.addEventListener('resize', setH);
  window.__QL2_READY = 1;
  dailyEnsure();
  // renaming from settings updates the top bar
  document.addEventListener('input', e=>{ if(e.target.dataset && e.target.dataset.input==='rename') setTimeout(refreshChrome, 0); });
  if(ui.screen==='map' || ui.screen==='shop' || ui.screen==='hero' || ui.screen==='settings') ui.screen = ALIAS[ui.screen];
  if(ui.screen!=='battle') render();
})();
