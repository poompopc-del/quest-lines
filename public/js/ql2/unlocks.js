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

   v64: no element-specific grinding for heroes or gear — milestones +
   "choose 2 of 3" paths (see the table below). Heroes / items already owned
   stay owned; old element counters are kept in the save but no longer used.
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
    kill:   (k, n, label) => ({ ic:'⚔️', th:label || `ปราบ ${MON[k].name}`, cur:() => V().kills[k]||0, need:n||1 }),
    long:   n => ({ ic:'📏', th:`สะกดคำยาว 6 ตัวอักษรขึ้นไป ${n} คำ`, cur:() => V().stats.long6||0, need:n }),
    adv:    n => ({ ic:'⭐', th:`Adventure Level ${n}`, cur:() => advInfo(V().adv.xp).lv, need:n }),
    tower:  n => ({ ic:'🗼', th:`ปีนหอคอยไร้สิ้นสุดถึงชั้น ${n}`, cur:() => Math.max(E().endBest||0, (save.tower && save.tower.best)||0), need:n, unit:'ชั้น' }),
    nm:     n => ({ ic:'🌙', th:`ผ่านด่าน Nightmare ${n} ด่าน`, cur:() => E().cnt.nmClears||0, need:n }),
    master: n => ({ ic:'🎓', th:`คำศัพท์ Mastery Lv.5 ${n} คำ`, cur:mastered, need:n, unit:'คำ' }),
    stage:  n => ({ ic:'🗺️', th:`ผ่านด่าน 1-${n}`, cur:() => Math.min(save.cleared||0, n), need:n, unit:'ด่าน' }),
    kills:  n => ({ ic:'💀', th:`ปราบมอนสเตอร์ ${n} ตัว`, cur:() => save.stats.kills||0, need:n }),
    bosses: n => ({ ic:'👑', th:`ปราบบอส ${n} ตัว`, cur:() => save.stats.bosses||0, need:n }),
    minis:  n => ({ ic:'🛡️', th:`ปราบมินิบอส ${n} ตัว`, cur:() => V().stats.minis||0, need:n }),
    bank:   n => ({ ic:'⭐', th:`สะกดคำศัพท์เป้าหมาย ${n} ครั้ง`, cur:() => V().stats.bankWords||0, need:n }),
    puzzles:n => ({ ic:'🧩', th:`ไขปริศนาคำศัพท์ ${n} ครั้ง`, cur:() => V().stats.puzzles||0, need:n }),
    longest:n => ({ ic:'📐', th:`สะกดคำยาว ${n} ตัวอักษรได้สักคำ`, cur:() => Math.min(n, ((save.stats.longest)||'').length), need:n, unit:'ตัว' }),
    // v64 milestones — earned by playing well, not by repeating one thing
    flawless:n => ({ ic:'💎', th:`Perfect Battle ${n} ครั้ง (ผ่านด่านโดยเสีย HP ไม่เกิน 20%)`, cur:() => V().stats.flawless||0, need:n }),
    objs:   n => ({ ic:'🎯', th:`ทำ Battle Objective สำเร็จ ${n} ครั้ง`, cur:() => V().stats.objs||0, need:n }),
    perfectRun: n => ({ ic:'✨', th:`ผ่านโหมด Perfect Run ${n} ครั้ง`, cur:() => E().cnt.perfects||0, need:n }),
    tfb:    () => ({ ic:'☠️', th:'ปราบ True Final Boss (Lexivore)', cur:() => (E().tfb && E().tfb.wins)||0, need:1 }),
    heroes: n => ({ ic:'🧑‍🤝‍🧑', th:`มีฮีโร่ในทีม ${n} คน`, cur:() => (save.chars||[]).length, need:n }),
    // still defined so old data / quests keep working — no longer used by core unlocks (v64)
    elem:   (el, n) => ({ ic:ELEM_ICON[el], th:`ใช้คำธาตุ${ELEMENTS[el].th} ${n} ครั้ง`, cur:() => V().elem[el]||0, need:n }),
    elems:  n => ({ ic:'🌈', th:`ใช้คำธาตุ (ธาตุใดก็ได้) ${n} ครั้ง`, cur:() => Object.values(V().elem||{}).reduce((a,x)=>a+(x||0),0), need:n }),
  };
  window.UNLOCK_REQ = R;
  /* ----------------------------------------------------------------------
     v64 UNLOCK REWORK — "play well → unlock", never "grind one element".
       reqs  = must all be done
       opts  = choose your own path: any `pick` of them
     Numbers follow a first playthrough (8 stages × ~4 enemies per chapter,
     1 mini boss per stage, Battle Objectives in ~half the stages):
       ch1 end ≈ 70 words · ch2 ≈ 150 · ch3 ≈ 230 · ch4 ≈ 320 · story ≈ 420
       mini bosses ≈ 8 per chapter · objectives done ≈ 2–3 per chapter
     ---------------------------------------------------------------------- */
  const HERO_UNLOCK = {
    pip:     { tier:1, price:900,   reqs:[ R.clear(1) ], pick:1, opts:[ R.words(60), R.minis(6) ],
               quote:'นักดาบหมวกเขียวเห็นฝีมือคุณในสุสานแล้ว — "ไปด้วยกันเถอะ!"' },
    mao:     { tier:2, price:2000,  reqs:[ R.clear(2) ], pick:2, opts:[ R.combo(8), R.long(15), R.objs(3) ],
               quote:'คุโนะอิจิพัดเพลิงยอมรับความว่องไวของถ้อยคำของคุณ' },
    elon:    { tier:3, price:3500,  reqs:[ R.clear(3) ], pick:2, opts:[ R.combo(12), R.crit(20), R.flawless(3) ],
               quote:'"คุณพิสูจน์แล้วว่าเชี่ยวชาญทั้งการต่อคำและการต่อสู้" — สายลับมือปืนพร้อมร่วมทีม' },
    boomtos: { tier:4, price:6000,  reqs:[ R.clear(4) ], pick:2, opts:[ R.ult(15), R.objs(10), R.adv(15) ],
               quote:'ผู้พิทักษ์ไฟใต้พิภพตื่นขึ้นเพราะเสียงคำรามแห่งชัยชนะของคุณ' },
    x:       { tier:5, price:9000,  reqs:[ R.story() ], pick:2, opts:[ R.tower(25), R.long(50), R.flawless(5) ],
               quote:'นักรบบัสเตอร์จากอนาคตตรวจพบพลังถ้อยคำระดับสูงสุด' },
    puff:    { tier:6, price:12000, reqs:[ R.story() ], pick:3, opts:[ R.tower(40), R.nm(3), R.master(15), R.perfectRun(1), R.tfb() ],
               quote:'ก้อนชมพูจอมดูดอยากชิม "ถ้อยคำ" ของวีรบุรุษตัวจริง' },
  };
  window.HERO_UNLOCK = HERO_UNLOCK;
  CHARACTERS.forEach(c => { const U = HERO_UNLOCK[c.id]; if(U) c.price = U.price; });

  const metN = list => (list||[]).filter(r => r.cur() >= r.need).length;
  const groupMet = U => !U || (metN(U.reqs) === (U.reqs||[]).length && metN(U.opts) >= (U.pick||0));
  const reqsMet = id => groupMet(HERO_UNLOCK[id]);
  window.heroReqsMet = reqsMet;
  window.unlockGroupMet = groupMet;
  const stars = t => t >= 6 ? '★★★★★+' : '★'.repeat(t) + '☆'.repeat(5 - t);
  const row = r => { const c = Math.min(r.cur(), r.need), ok = c >= r.need, pct = Math.round(c / r.need * 100);
    return `<div class="ul-r ${ok?'ok':''}"><span class="ul-i">${ok ? '✅' : r.ic}</span><span class="ul-t">${esc(r.th)}<i style="--p:${pct}%"></i></span><b>${ok ? 'ผ่าน' : `${fmt(c)}/${fmt(r.need)}`}</b></div>`; };
  function unlockHtml(id){
    const U = HERO_UNLOCK[id]; if(!U) return '';
    const opts = U.opts && U.opts.length ? `<p class="ul-pick">เลือกทำ ${U.pick} จาก ${U.opts.length} อย่าง (ทำแล้ว ${Math.min(metN(U.opts), U.pick)}/${U.pick})</p>${U.opts.map(row).join('')}` : '';
    return `<div class="panel ul-box"><div class="ul-h"><span>🔓 เงื่อนไขปลดล็อก</span><em title="ยิ่งสกิลโกง ยิ่งปลดล็อกยาก">ความโกง ${stars(U.tier)}</em></div>${(U.reqs||[]).map(row).join('')}${opts}</div>`;
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
  const unmetList = U => { const out = (U.reqs||[]).filter(r => r.cur() < r.need).map(r => r.th);
    const need = (U.pick||0) - metN(U.opts); if(need > 0) out.push(`ทำอีก ${need} อย่างจากตัวเลือก`); return out; };
  // the purchase itself is guarded too (old shop cards, stale buttons) — and celebrated
  ACTS2.buyC = function(v){
    if(!reqsMet(v)){ const left = unmetList(HERO_UNLOCK[v]); toast(`🔒 ยังปลดล็อก ${CH(v).name} ไม่ได้ — ${left[0]}${left.length>1 ? ` และอีก ${left.length-1} เงื่อนไข` : ''}`); sfx.bad && sfx.bad(); return; }
    const had = save.chars.includes(v);
    setTimeout(() => { if(!had && save.chars.includes(v)) celebrate('hero', v, true); }, 60);
    return false;                                   // → the original purchase (gold check, equip, save)
  };
  /* ======================================================================
     ITEMS — milestone feats (no element grinding); key items: 2 of 3
     ====================================================================== */
  const I = (reqs, pick, opts) => ({ reqs, pick:pick||0, opts:opts||[] });
  const ITEM_UNLOCK = {
    weapon: {
      axe:     I([ R.stage(3) ]),
      boomer:  I([ R.stage(5), R.long(10) ]),
      hammer:  I([ R.clear(1) ]),
      gerudo:  I([ R.clear(1), R.words(120) ]),
      moon:    I([ R.clear(1), R.bank(25) ]),
      staff:   I([ R.clear(2) ]),
      sickle:  I([ R.clear(2), R.kills(150) ]),
      frost:   I([ R.clear(2) ], 1, [ R.objs(3), R.minis(12) ]),
      flame:   I([ R.clear(2) ], 1, [ R.combo(8), R.long(20) ]),
      storm:   I([ R.clear(3) ], 1, [ R.crit(15), R.objs(5) ]),
      guardian:I([ R.clear(3), R.combo(15) ]),
      thunder: I([ R.clear(3), R.crit(30) ]),
      royal:   I([ R.clear(4), R.adv(12) ]),
      savage:  I([ R.clear(4), R.kill('hellhound', 3, 'ปราบมินิบอส Hellhound 3 ครั้ง') ]),
      ancient: I([ R.story() ], 2, [ R.crit(60), R.tower(20), R.objs(15) ]),
      master:  I([ R.story() ], 2, [ R.bosses(8), R.master(10), R.flawless(5) ]),
    },
    armor: {
      kite:    I([ R.clear(1) ]),
      dragon:  I([ R.clear(3), R.kill('frostgol', 1, 'ปราบบอส Frost Titan') ]),
      mythril: I([ R.story() ], 2, [ R.tower(20), R.flawless(4), R.nm(1) ]),
    },
    acc: {
      auraRing:  I([ R.stage(4) ]),
      lens:      I([ R.bank(20) ]),
      boots:     I([ R.clear(1) ]),
      fang:      I([ R.clear(2) ], 1, [ R.minis(10), R.flawless(2) ]),
      thorn:     I([ R.clear(2), R.kills(120) ]),
      sage:      I([ R.clear(2), R.long(40) ]),
      phoenix:   I([ R.clear(4), R.bosses(4) ]),
      monocle:   I([ R.clear(2), R.kill('goblin', 15, 'ปราบ Basic Zombie 15 ตัว') ]),
      prism:     I([ R.clear(3) ], 1, [ R.objs(6), R.puzzles(8) ]),
      ironHeart: I([ R.clear(2), R.kills(200) ]),
      hourglass: I([ R.clear(3), R.ult(15) ]),
      rune:      I([ R.clear(3), R.long(60), R.longest(8) ]),
      leaf:      I([ R.clear(3), R.puzzles(10) ]),
    },
  };
  window.ITEM_UNLOCK = ITEM_UNLOCK;
  const LISTS = { weapon:() => WEAPONS, armor:() => ARMORS, acc:() => ACCESSORIES };
  const OWNED = { weapon:() => save.weapons, armor:() => save.armors, acc:() => save.accs };
  // hook into the engine's existing weapon lock (w.req / w.reqTh — used by the shop, hub and nav badges)
  Object.entries(ITEM_UNLOCK).forEach(([kind, map]) => Object.entries(map).forEach(([id, U]) => {
    const it = LISTS[kind]().find(x => x.id===id); if(!it) return;
    it.unlock = U; it.reqs = U.reqs.concat(U.opts); it.req = () => groupMet(U);
    Object.defineProperty(it, 'reqTh', { configurable:true, get(){ const u = unmetList(U); return u.length ? `${u[0]}${u.length>1 ? ` +${u.length-1}` : ''}` : ''; } });
  }));
  const itemLocked = (kind, it) => !!(it && it.unlock && !groupMet(it.unlock) && !OWNED[kind]().includes(it.id));
  window.itemLocked = itemLocked;
  // shop card: the feats with progress instead of the buy button
  window.itemLockHtml = (kind, it) => {
    if(!itemLocked(kind, it)) return '';
    const U = it.unlock, line = r => { const c = Math.min(r.cur(), r.need), ok = c>=r.need;
      return `<span class="${ok?'ok':''}">${ok?'✅':'🔒'} ${esc(r.th)}${ok?'':` <b>${fmt(c)}/${fmt(r.need)}</b>`}</span>`; };
    return `<div class="ul-mini">${U.reqs.map(line).join('')}${U.opts.length ? `<span class="ul-pick">เลือกทำ ${U.pick} จาก ${U.opts.length}:</span>${U.opts.map(line).join('')}` : ''}</div>`;
  };
  const guard = kind => function(v){
    const it = LISTS[kind]().find(x => x.id===v);
    if(it && itemLocked(kind, it)){ const u = unmetList(it.unlock); toast(`🔒 ยังซื้อ ${it.th} ไม่ได้ — ${u[0]}${u.length>1 ? ` และอีก ${u.length-1} เงื่อนไข` : ''}`); sfx.bad && sfx.bad(); return; }
    return false;
  };
  ACTS2.buyW = guard('weapon'); ACTS2.buyA = guard('armor'); ACTS2.buyX = guard('acc');

  /* ======================================================================
     🔓 UNLOCK CELEBRATION — when the feats of a hero / item are completed
     (shown back on the menus, never on top of a battle result)
     ====================================================================== */
  const seen = () => { const v = V(); return v.ulSeen || (v.ulSeen = {}); };
  function available(){
    const out = [];
    CHARACTERS.forEach(c => { if(HERO_UNLOCK[c.id] && !save.chars.includes(c.id) && reqsMet(c.id)) out.push({ kind:'hero', id:c.id }); });
    Object.entries(ITEM_UNLOCK).forEach(([kind, map]) => Object.keys(map).forEach(id => {
      const it = LISTS[kind]().find(x => x.id===id); if(it && !OWNED[kind]().includes(id) && groupMet(map[id])) out.push({ kind, id }); }));
    return out;
  }
  function celebrate(kind, id, owned){
    let face = '', name = '', label = '', quote = '';
    if(kind==='hero'){ const c = CH(id); try{ face = heroFaceSvg({ char:id, weapon:'wood', armor:'none' }); }catch(e){} name = c.name; label = owned ? 'NEW HERO · ร่วมทีมแล้ว!' : 'NEW HERO · ปลดล็อกได้แล้ว'; quote = (HERO_UNLOCK[id] && HERO_UNLOCK[id].quote) || ''; }
    else { const it = LISTS[kind]().find(x => x.id===id); if(!it) return; name = it.th || it.name; label = kind==='weapon' ? 'NEW WEAPON' : kind==='armor' ? 'NEW ARMOR' : 'NEW ACCESSORY';
      face = kind==='acc' ? (ACC_ART[id]||'') : `<span style="font-size:52px">${kind==='weapon'?'⚔️':'🛡️'}</span>`; quote = 'ทำเงื่อนไขครบแล้ว — ซื้อได้ที่ร้านค้า'; }
    sfx.win && sfx.win();
    modal(`<div class="ul-cel"><div class="ul-k">🔓 ${esc(label)}</div><div class="ul-face">${face}</div><div class="ul-n">${esc(name)}</div>${quote?`<p class="ul-q">"${esc(quote)}"</p>`:''}
      <div class="btns">${!owned ? `<button class="cbtn gold block" data-act="go" data-v="${kind==='hero'?'heroes':'shop'}">${kind==='hero'?'ไปที่หน้าฮีโร่':'ไปร้านค้า'}</button>` : ''}<button class="cbtn wood block" data-act="closeModal">เยี่ยม!</button></div></div>`, { dismiss:true });
  }
  window.celebrateUnlock = celebrate;
  function checkNews(){
    if(ui.screen==='battle' || document.querySelector('#overlay .modal')) return;
    const S = seen(), list = available(), fresh = list.filter(x => !S[x.kind+':'+x.id]);
    if(!fresh.length) return;
    fresh.forEach(x => { S[x.kind+':'+x.id] = 1; }); persist();
    if(!V().ulInit){ V().ulInit = 1; persist(); toast(`🔓 ระบบปลดล็อกใหม่! ตอนนี้ปลดล็อกได้ ${fresh.length} อย่าง (ดูที่หน้าฮีโร่ / ร้านค้า)`); return; }
    const hero = fresh.find(x => x.kind==='hero');
    if(hero) celebrate('hero', hero.id, false); else celebrate(fresh[0].kind, fresh[0].id, false);
    if(fresh.length > 1) setTimeout(() => toast(`🔓 ปลดล็อกได้อีก ${fresh.length-1} อย่าง`), 900);
  }
  if(typeof goTo==='function') goTo = (f => function(){ const out = f.apply(this, arguments); setTimeout(checkNews, 450); return out; })(goTo);

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
