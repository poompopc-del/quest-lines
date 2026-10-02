/* ==========================================================================
   LETTERⁿ v66 — HERO PLUS · extra poses for existing sprite heroes
   --------------------------------------------------------------------------
   · Plink: Spin Attack (selectable attack pose) + shield stance "guard"
     (frames cut from Plink.png — the same "Link by Goldstud" sheet)
   · Every hero can now show a guard pose when you 🛡 guard with a word or
     when the guard shield soaks a hit (GUARD_POSE below).
   ========================================================================== */
(function(){
  // add animations to a hero that the engine's sprCSS() already styled
  function addAnims(k, anims, opts){
    const c = HERO_SPRITE[k]; if(!c) return;
    Object.assign(c.anims, anims);
    (opts && opts.attacks || []).forEach(n => { if(!c.attacks.includes(n)) c.attacks.push(n); });
    c.extra = c.extra || []; (opts && opts.extra || []).forEach(n => { if(!c.extra.includes(n)) c.extra.push(n); });
    let css = '';
    const show = (sel, n) => `${sel} .spr-${k} .spr-a{display:none}${sel} .spr-${k} .spr-a-${n}{display:inline}`;
    for(const [n,a] of Object.entries(anims)){
      css += `@keyframes spr-${k}-${n}{from{transform:translateX(0px)}to{transform:translateX(${-(a.loop?a.n:a.n-1)*a.cw}px)}}`;
      css += `.spr-demo .spr-${k} .spr-a-${n} .spr-strip{animation:spr-${k}-${n} ${a.dur}s steps(${a.loop?a.n:a.n+',jump-none'}) infinite}`;
      css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n);
      const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`;
    }
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
  window.QL_ADD_ANIMS = addAnims;

  addAnims('pip', {
    spin:  { n:6, cw:45, ax:16, dur:.6, th:'สปินแอทแท็ก (หมุนดาบ)' },
    guard: { n:7, cw:32, ax:16, dur:.55, th:'ตั้งโล่' } }, { attacks:['spin'], extra:['guard'] });

  // which pose each hero strikes when guarding
  const GUARD_POSE = { pip:'guard', luffy:'balloon', sonic:'spin', mao:'flip', elon:'aim' };
  function guardPose(){
    const k = save.eq && save.eq.char, c = sprOf(k), n = GUARD_POSE[k];
    if(!c || !n || !c.anims[n]) return;
    heroPose('pose-'+n, Math.max(500, sprMs(n, 600)+80));
  }
  window.QL_GUARD_POSE = guardPose;
  try{
    if(typeof ACTS2!=='undefined' && ACTS2.tacGuard){
      ACTS2.tacGuard = (f => function(){ const b = ui.bat; const out = f.apply(this, arguments); try{ if(b && b.busy && b.guard > 0) guardPose(); }catch(e){} return out; })(ACTS2.tacGuard);
    }
  }catch(e){}
  if(typeof window.tacAbsorb==='function'){
    window.tacAbsorb = (f => function(b, e, dmg, heavy){ const had = b && b.guard > 0 && dmg > 0; const out = f.apply(this, arguments);
      if(had && !(save.eq.char==='luffy' && b.lfBalloon)) try{ guardPose(); }catch(err){}
      return out; })(window.tacAbsorb);
  }
})();
