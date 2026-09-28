/* ==========================================================================
   QUEST LINES v49 — HERO UNLOCK CONDITIONS
   --------------------------------------------------------------------------
   Every hero still costs gold, but now also needs a set of feats. The
   stronger (more "broken") the kit, the harder the feats and the price:

     ★☆☆☆☆  Plink    — plain bonuses                       (chapter 1)
     ★★☆☆☆  Mia      — move bonuses + dodge                (chapter 2)
     ★★★☆☆  ELON     — combo weapons + crit skills         (chapter 3)
     ★★★★☆  Boomtos  — rage stacks, BOOM kills outright    (chapter 4)
     ★★★★★  X        — banks damage, pierces the queue     (story done + tower)
     ★★★★★+ Kirby    — swallows enemies whole, even bosses  (story + tower + nightmare + mastery)

   Heroes already owned stay owned. Progress is read from data the game
   already saves (no new save fields).
   ========================================================================== */
(function(){
  const V = () => V2(), E = () => EGS();
  const mastered = () => Object.keys(save.mastery || {}).filter(w => masteryInfo(w).lv >= 5).length;
  const R = {
    clear:  ch => ({ ic:'🗺️', th:`ผ่านบทที่ ${ch} (${LOCS[ch-1] ? LOCS[ch-1].name : ''})`, cur:() => Math.min(save.cleared||0, ch*STAGES_PER), need:ch*STAGES_PER, unit:'ด่าน' }),
    story:  () => ({ ic:'📜', th:'จบเนื้อเรื่องหลักทั้ง 5 บท', cur:() => Math.min(save.cleared||0, CHAPTERS.length*STAGES_PER), need:CHAPTERS.length*STAGES_PER, unit:'ด่าน' }),
    words:  n => ({ ic:'🔤', th:`สะกดคำสำเร็จ ${n} คำ`, cur:() => save.stats.words||0, need:n }),
    combo:  n => ({ ic:'🔥', th:`ทำคอมโบให้ถึง x${n}`, cur:() => save.stats.bestCombo||0, need:n }),
    crit:   n => ({ ic:'💥', th:`ทำ Critical Word ${n} ครั้ง`, cur:() => save.stats.crit||0, need:n }),
    ult:    n => ({ ic:'⚡', th:`ใช้ Ultimate ${n} ครั้ง`, cur:() => save.stats.ultimates||0, need:n }),
    elem:   (el, n) => ({ ic:ELEM_ICON[el], th:`ใช้คำธาตุ${ELEMENTS[el].th} ${n} ครั้ง`, cur:() => V().elem[el]||0, need:n }),
    kill:   (k, n, label) => ({ ic:'⚔️', th:label || `ปราบ ${MON[k].name}`, cur:() => V().kills[k]||0, need:n||1 }),
    long:   n => ({ ic:'📏', th:`สะกดคำยาว 6 ตัวอักษรขึ้นไป ${n} คำ`, cur:() => V().stats.long6||0, need:n }),
    adv:    n => ({ ic:'⭐', th:`Adventure Level ${n}`, cur:() => advInfo(V().adv.xp).lv, need:n }),
    tower:  n => ({ ic:'🗼', th:`ปีนหอคอยไร้สิ้นสุดถึงชั้น ${n}`, cur:() => Math.max(E().endBest||0, (save.tower && save.tower.best)||0), need:n, unit:'ชั้น' }),
    nm:     n => ({ ic:'🌙', th:`ผ่านด่าน Nightmare ${n} ด่าน`, cur:() => E().cnt.nmClears||0, need:n }),
    master: n => ({ ic:'🎓', th:`คำศัพท์ Mastery Lv.5 ${n} คำ`, cur:mastered, need:n, unit:'คำ' }),
    stage:  n => ({ ic:'🗺️', th:`ผ่านด่าน 1-${n}`, cur:() => Math.min(save.cleared||0, n), need:n, unit:'ด่าน' }),
    kills:  n => ({ ic:'💀', th:`ปราบมอนสเตอร์ ${n} ตัว`, cur:() => save.stats.kills||0, need:n }),
    bosses: n => ({ ic:'👑', th:`ปราบบอส ${n} ตัว`, cur:() => save.stats.bosses||0, need:n }),
    bank:   n => ({ ic:'⭐', th:`สะกดคำศัพท์เป้าหมาย ${n} ครั้ง`, cur:() => V().stats.bankWords||0, need:n }),
    elems:  n => ({ ic:'🌈', th:`ใช้คำธาตุ (ธาตุใดก็ได้) ${n} ครั้ง`, cur:() => Object.values(V().elem||{}).reduce((a,x)=>a+(x||0),0), need:n }),
    puzzles:n => ({ ic:'🧩', th:`ไขปริศนาคำศัพท์ ${n} ครั้ง`, cur:() => V().stats.puzzles||0, need:n }),
    longest:n => ({ ic:'📐', th:`สะกดคำยาว ${n} ตัวอักษรได้สักคำ`, cur:() => Math.min(n, ((save.stats.longest)||'').length), need:n, unit:'ตัว' }),
  };
  window.UNLOCK_REQ = R;
  // Prices follow the gold a first-time player has earned when the feats are done (enemies + word puzzles + quests):
  //   end of ch1 ≈ 1.2k · ch2 ≈ 4k · ch3 ≈ 8.7k · ch4 ≈ 15.5k · story ≈ 25k (+ level-up / tower / daily gold)
  //   → cheap kits cost ~⅓–¾ of one chapter; the broken ones cost a big chunk of the whole game's gold.
  const HERO_UNLOCK = {
    pip:     { tier:1, price:900,  reqs:[ R.clear(1), R.words(60) ] },
    mao:     { tier:2, price:2000, reqs:[ R.clear(2), R.elem('fire', 10), R.combo(8) ] },
    elon:    { tier:3, price:3500, reqs:[ R.clear(3), R.combo(12), R.crit(25) ] },
    boomtos: { tier:4, price:6000, reqs:[ R.clear(4), R.kill('dragon', 1, 'ปราบบอส Ember Dragon'), R.elem('fire', 30), R.adv(15) ] },
    x:       { tier:5, price:9000, reqs:[ R.story(), R.tower(25), R.long(80), R.ult(20) ] },
    puff:    { tier:6, price:12000, reqs:[ R.story(), R.tower(40), R.nm(3), R.master(15) ] },
  };
  window.HERO_UNLOCK = HERO_UNLOCK;
  CHARACTERS.forEach(c => { const U = HERO_UNLOCK[c.id]; if(U) c.price = U.price; });

  const reqsMet = id => { const U = HERO_UNLOCK[id]; return !U || U.reqs.every(r => r.cur() >= r.need); };
  window.heroReqsMet = reqsMet;
  const stars = t => t >= 6 ? '★★★★★+' : '★'.repeat(t) + '☆'.repeat(5 - t);
  function unlockHtml(id){
    const U = HERO_UNLOCK[id]; if(!U) return '';
    const rows = U.reqs.map(r => { const c = Math.min(r.cur(), r.need), ok = c >= r.need, pct = Math.round(c / r.need * 100);
      return `<div class="ul-r ${ok?'ok':''}"><span class="ul-i">${ok ? '✅' : r.ic}</span><span class="ul-t">${esc(r.th)}<i style="--p:${pct}%"></i></span><b>${ok ? 'ผ่าน' : `${fmt(c)}/${fmt(r.need)}`}</b></div>`; }).join('');
    return `<div class="panel ul-box"><div class="ul-h"><span>🔓 เงื่อนไขปลดล็อก</span><em title="ยิ่งสกิลโกง ยิ่งปลดล็อกยาก">ความโกง ${stars(U.tier)}</em></div>${rows}</div>`;
  }
  // replace the unlock button of a locked hero with the feat list (+ a disabled button until every feat is done)
  function inject(html){
    return html.replace(/<button class="cbtn red( block)?" data-act="buyC" data-v="(\w+)"[^>]*>[\s\S]*?<\/button>/, (m, blk, id) => {
      if(!HERO_UNLOCK[id]) return m;
      if(reqsMet(id)) return unlockHtml(id) + m;
      return unlockHtml(id) + `<button class="cbtn wood${blk||''}" disabled>🔒 ทำเงื่อนไขให้ครบก่อน · ${ICON.coin} ${fmt(CH(id).price)}</button>`;
    });
  }
  fighterSelect = (f => function(){ return inject(f.apply(this, arguments)); })(fighterSelect);
  renderHeroes = (f => function(){ return inject(f.apply(this, arguments)); })(renderHeroes);
  if(SCREENS.heroes) SCREENS.heroes.render = renderHeroes;
  // the purchase itself is guarded too (old shop cards, stale buttons)
  ACTS2.buyC = function(v){
    if(!reqsMet(v)){ const U = HERO_UNLOCK[v], left = U.reqs.filter(r => r.cur() < r.need).map(r => r.th); toast(`🔒 ยังปลดล็อก ${CH(v).name} ไม่ได้ — ${left[0]}${left.length>1 ? ` และอีก ${left.length-1} เงื่อนไข` : ''}`); sfx.bad && sfx.bad(); return; }
    return false;                                   // → the original purchase (gold check, equip, save)
  };
  /* ======================================================================
     ITEMS — weapons / armor / accessories need feats too (gold price unchanged)
     ====================================================================== */
  const ITEM_UNLOCK = {
    weapon: {
      axe:     [ R.stage(3) ],
      boomer:  [ R.stage(5), R.long(10) ],
      hammer:  [ R.clear(1) ],
      gerudo:  [ R.clear(1), R.words(120) ],
      moon:    [ R.clear(1), R.bank(25) ],
      staff:   [ R.clear(2) ],
      sickle:  [ R.clear(2), R.kills(150) ],
      frost:   [ R.clear(2), R.elem('ice', 15) ],
      flame:   [ R.clear(2), R.elem('fire', 20) ],
      storm:   [ R.clear(3), R.elem('thunder', 15) ],
      guardian:[ R.clear(3), R.combo(15) ],
      thunder: [ R.clear(3), R.crit(30) ],
      royal:   [ R.clear(4), R.adv(12) ],
      savage:  [ R.clear(4), R.kill('hellhound', 3, 'ปราบมินิบอส Hellhound 3 ครั้ง') ],
      ancient: [ R.story(), R.crit(60) ],
      master:  [ R.story(), R.bosses(8), R.master(10) ],
    },
    armor: {
      kite:    [ R.clear(1) ],
      dragon:  [ R.clear(3), R.kill('frostgol', 1, 'ปราบบอส Frost Titan') ],
      mythril: [ R.story(), R.tower(20) ],
    },
    acc: {
      auraRing:  [ R.stage(4) ],
      lens:      [ R.bank(20) ],
      boots:     [ R.clear(1) ],
      fang:      [ R.clear(2), R.elem('shadow', 10) ],
      thorn:     [ R.clear(2), R.kills(120) ],
      sage:      [ R.clear(2), R.long(40) ],
      phoenix:   [ R.clear(4), R.bosses(4) ],
      monocle:   [ R.clear(2), R.kill('goblin', 15, 'ปราบ Basic Zombie 15 ตัว') ],
      prism:     [ R.clear(3), R.elems(40) ],
      ironHeart: [ R.clear(2), R.kills(200) ],
      hourglass: [ R.clear(3), R.ult(15) ],
      rune:      [ R.clear(3), R.long(60), R.longest(8) ],
      leaf:      [ R.clear(3), R.puzzles(10) ],
    },
  };
  window.ITEM_UNLOCK = ITEM_UNLOCK;
  const LISTS = { weapon:() => WEAPONS, armor:() => ARMORS, acc:() => ACCESSORIES };
  const OWNED = { weapon:() => save.weapons, armor:() => save.armors, acc:() => save.accs };
  const unmet = reqs => (reqs||[]).filter(r => r.cur() < r.need);
  // hook into the engine's existing weapon lock (w.req / w.reqTh — used by the shop, hub and nav badges)
  Object.entries(ITEM_UNLOCK).forEach(([kind, map]) => Object.entries(map).forEach(([id, reqs]) => {
    const it = LISTS[kind]().find(x => x.id===id); if(!it) return;
    it.reqs = reqs; it.req = () => !unmet(reqs).length;
    Object.defineProperty(it, 'reqTh', { configurable:true, get(){ const u = unmet(reqs); return u.length ? `${u[0].th} (${fmt(Math.min(u[0].cur(), u[0].need))}/${fmt(u[0].need)})${u.length>1 ? ` +${u.length-1}` : ''}` : ''; } });
  }));
  const itemLocked = (kind, it) => !!(it && it.reqs && unmet(it.reqs).length && !OWNED[kind]().includes(it.id));
  window.itemLocked = itemLocked;
  // shop card: the feats with progress instead of the buy button
  window.itemLockHtml = (kind, it) => {
    if(!itemLocked(kind, it)) return '';
    return `<div class="ul-mini">${it.reqs.map(r => { const c = Math.min(r.cur(), r.need), ok = c>=r.need;
      return `<span class="${ok?'ok':''}">${ok?'✅':'🔒'} ${esc(r.th)}${ok?'':` <b>${fmt(c)}/${fmt(r.need)}</b>`}</span>`; }).join('')}</div>`;
  };
  const guard = kind => function(v){
    const it = LISTS[kind]().find(x => x.id===v);
    if(it && itemLocked(kind, it)){ const u = unmet(it.reqs); toast(`🔒 ยังซื้อ ${it.th} ไม่ได้ — ${u[0].th}${u.length>1 ? ` และอีก ${u.length-1} เงื่อนไข` : ''}`); sfx.bad && sfx.bad(); return; }
    return false;
  };
  ACTS2.buyW = guard('weapon'); ACTS2.buyA = guard('armor'); ACTS2.buyX = guard('acc');

  // a small lock on locked roster cards

  const st = document.createElement('style');
  st.textContent = `
    .ul-box{margin:10px 0;padding:10px 12px;display:grid;gap:6px}
    .ul-h{display:flex;justify-content:space-between;align-items:center;font-weight:700}
    .ul-h em{font-style:normal;font-size:12px;color:#ffd27a;letter-spacing:.5px}
    .ul-r{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;font-size:13.5px}
    .ul-r b{font-size:12.5px;opacity:.85;white-space:nowrap}
    .ul-r.ok{opacity:.7}.ul-r.ok b{color:#7dff9a}
    .ul-t{display:grid;gap:3px}
    .ul-t i{display:block;height:5px;border-radius:3px;background:linear-gradient(90deg,#f2b42c var(--p),rgba(255,255,255,.12) var(--p))}
    .ul-r.ok .ul-t i{background:#3fbf6a}
    .ul-mini{display:grid;gap:3px;margin-top:4px;font-size:12px;line-height:1.3}
    .ul-mini span{opacity:.9}.ul-mini span.ok{opacity:.55}
    .ul-mini b{color:#ffd27a;font-weight:600;margin-left:3px}
    .inv-it.locked .pic{filter:grayscale(.8) brightness(.7)}`;
  document.head.appendChild(st);
})();
