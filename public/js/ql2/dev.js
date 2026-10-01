/* ==========================================================================
   LETTERⁿ v63 — DEVELOPER / TESTER MODE (โหมดทดสอบสำหรับผู้พัฒนา)
   --------------------------------------------------------------------------
   A hidden sandbox for the developer to try new heroes and systems first.

   HOW TO OPEN
     ⚙️ ตั้งค่า → แท็บ 💾 เซฟ → แตะข้อความเวอร์ชันด้านล่าง 7 ครั้ง → ใส่รหัส
     (once the code is accepted on a device, 7 taps open the panel directly)

   SANDBOX — the real save is never touched
     Entering copies the real save to SAVE_KEY+'_devReal' and plays on a copy
     that has everything unlocked. Exiting puts the real save back exactly as
     it was. Nothing done in dev mode leaks into real progress.

   WHAT DEV MODE GIVES
     · every hero / weapon / armor / accessory owned (new ones added later are
       owned automatically on the next load — no code change needed here)
     · all chapters cleared ★★★, all Nightmare stages, Endless floor 100,
       True Final Boss open, Adventure Lv.50, hero Lv.30, all titles / frames /
       hub effects / cosmetics, every monster + element in the Codex
     · 9,999,999 gold · 999 of every material · 99 of every potion
     · battle cheats: God mode, one-hit kill, kill current enemy
     · warp to any stage / boss / Nightmare / Endless / True Final Boss

   HIDING WORK-IN-PROGRESS CONTENT FROM PLAYERS
     Add  devOnly:true  to a hero, weapon, armor or accessory, e.g.
       CHARACTERS.push({ id:'newguy', devOnly:true, … })
     It only exists while dev mode is on; normal players never see it.
     For a whole new system, check  window.QL_DEV_ON  (set in <head>, so it is
     ready before any script runs):  if(window.QL_DEV_ON){ … }

   CHANGING THE CODE
     node tools/dev-pass.mjs "your new code"  → paste the printed value into
     DEV_PASS_HASH below. (The code lives in the page, so it keeps casual
     players out but is not real security — that is fine because the sandbox
     only ever affects the save on that one device.)
   ========================================================================== */
(function(){
  const DEV_PASS_HASH = '1dcm8nlugy8';           // = "letterdev"  (see tools/dev-pass.mjs)
  const K_ON = 'ql_dev_on', K_AUTH = 'ql_dev_auth', K_OPTS = 'ql_dev_opts', K_REAL = SAVE_KEY + '_devReal';
  const NONE = '__none__';
  const ls = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  };
  // small sync hash (works on http:// LAN testing too, where crypto.subtle is missing)
  function hash(str, seed){
    let h1 = 0xdeadbeef ^ (seed||0), h2 = 0x41c6ce57 ^ (seed||0);
    for(let i=0, ch; i<str.length; i++){ ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507); h1 ^= Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507); h2 ^= Math.imul(h1 ^ (h1>>>13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1>>>0)).toString(36);
  }
  const norm = s => String(s||'').trim().toLowerCase();

  const ON = window.QL_DEV_ON = ls.get(K_ON)==='1';
  const authed = () => ls.get(K_AUTH)===DEV_PASS_HASH;
  let opts = {}; try{ opts = JSON.parse(ls.get(K_OPTS)||'{}') || {}; }catch(e){ opts = {}; }
  const saveOpts = () => ls.set(K_OPTS, JSON.stringify(opts));
  const QL_DEV = window.QL_DEV = { on:ON, opts, hash };

  /* ---------------- dev-only content: gone for normal players ---------------- */
  const LISTS = { CHARACTERS, WEAPONS, ARMORS, ACCESSORIES };
  const hidden = {};
  Object.entries(LISTS).forEach(([name, arr]) => {
    hidden[name] = arr.filter(x => x && x.devOnly).map(x => x.id);
    if(!ON) for(let i=arr.length-1; i>=0; i--) if(arr[i] && arr[i].devOnly) arr.splice(i, 1);
  });
  QL_DEV.hidden = hidden;
  if(!ON){
    // a normal save can never hold dev-only things (e.g. an old sandbox export imported by mistake)
    const ids = new Set([].concat(...Object.values(hidden)));
    if(ids.size){
      ['chars','weapons','armors','accs'].forEach(k => { if(Array.isArray(save[k])) save[k] = save[k].filter(id => !ids.has(id)); });
      if(ids.has(save.eq.char)) save.eq.char = 'knight';
      if(ids.has(save.eq.weapon)) save.eq.weapon = 'wood';
      if(ids.has(save.eq.armor)) save.eq.armor = 'none';
      save.acc = (save.acc||[]).map(a => ids.has(a) ? null : a);
    }
  }

  /* ---------------- unlock everything (idempotent — runs on every dev load) ---------------- */
  function maxAll(s){
    const add = (arr, ids) => { ids.forEach(id => { if(!arr.includes(id)) arr.push(id); }); return arr; };
    s.chars   = add(s.chars   || [], CHARACTERS.map(c => c.id));
    s.weapons = add(s.weapons || [], WEAPONS.map(w => w.id));
    s.armors  = add(s.armors  || [], ARMORS.map(a => a.id));
    s.accs    = add(s.accs    || [], ACCESSORIES.map(a => a.id));
    const total = CHAPTERS.length * STAGES_PER;
    s.cleared = Math.max(s.cleared||0, total);
    s.stars = s.stars || {}; for(let i=0; i<total; i++) s.stars[i] = 3;
    s.gold = Math.max(s.gold||0, 9999999);
    s.potions = s.potions || {}; Object.keys(POTIONS).forEach(k => { s.potions[k] = Math.max(s.potions[k]||0, 99); });
    s.tower = s.tower || { best:0, runs:0 }; s.tower.best = Math.max(s.tower.best||0, 100);
    const V = s.v2;
    if(V){
      V.mats = V.mats || {}; Object.keys(MATS).forEach(k => { V.mats[k] = Math.max(V.mats[k]||0, 999); });
      let axp = 0; for(let lv=1; lv<ADV.cap; lv++) axp += ADV.need(lv);
      V.adv.xp = Math.max(V.adv.xp||0, axp); V.adv.claimed = Math.max(V.adv.claimed||1, ADV.cap);
      let hxp = 0; for(let lv=1; lv<HLV.cap; lv++) hxp += HLV.need(lv);
      V.heroXp = V.heroXp || {}; CHARACTERS.forEach(c => { V.heroXp[c.id] = Math.max(V.heroXp[c.id]||0, hxp); });
      add(V.titles.own, Object.keys(TITLES)); add(V.frames.own, Object.keys(FRAMES)); add(V.fx.own, Object.keys(HUBFX));
      V.seen = V.seen || { mon:{}, el:{} };
      Object.keys(MON).forEach(k => { V.seen.mon[k] = 1; });
      Object.keys(ELEMENTS).forEach(k => { V.seen.el[k] = 1; });
    }
    const E = s.eg;
    if(E){
      E.nc = Math.max(E.nc||0, 99999); E.cc = Math.max(E.cc||0, 99999);
      for(let ch=0; ch<CHAPTERS.length; ch++) for(let n=1; n<=STAGES_PER; n++){
        const k = stageIndex(ch, n); E.nm[k] = Object.assign({ best:0 }, E.nm[k]||{}, { clear:true });
      }
      E.endBest = Math.max(E.endBest||0, 100);
      Object.keys(COS).forEach(k => { add(E.cos.own[k], Object.keys(COS[k])); });
    }
    return s;
  }
  QL_DEV.maxAll = () => { maxAll(save); persist(); };

  // feats (hero / item unlock conditions, True Final Boss requirements) all count as done
  function passFeats(){
    const pass = r => { if(r && typeof r==='object' && 'need' in r){ r.cur = () => r.need; } };
    try{ Object.values(window.HERO_UNLOCK||{}).forEach(U => (U.reqs||[]).forEach(pass)); }catch(e){}
    try{ Object.values(window.ITEM_UNLOCK||{}).forEach(map => Object.values(map).forEach(list => list.forEach(pass))); }catch(e){}
    try{ if(typeof TFB_REQ!=='undefined') TFB_REQ.forEach(pass); }catch(e){}
  }

  /* ---------------- battle cheats ---------------- */
  function wrapBattle(){
    checkHeroDeath = (f => async function(){
      const b = ui.bat;
      if(opts.god && b && b.hp<=0){ b.hp = b.max; updateHud(); floatText('🛡 GOD', HERO_X, FLOOR_Y-190, '#7dff9a', 24, true); return false; }
      return f.apply(this, arguments);
    })(checkHeroDeath);
    heroHurt = (f => function(){
      const r = f.apply(this, arguments), b = ui.bat;
      if(opts.god && b){ b.hp = b.max; setTimeout(() => { if(ui.bat===b){ b.hp = b.max; updateHud(); } }, 380); }
      return r;
    })(heroHurt);
    enemyHurt = (f => function(){
      const e = curEnemy();
      if(opts.oneHit && e && e.hp>0) e.hp = 0;
      return f.apply(this, arguments);
    })(enemyHurt);
  }
  async function killCurrent(){
    const b = ui.bat, e = curEnemy();
    if(!b || !e || b.over) return toast('ใช้ได้ระหว่างการต่อสู้เท่านั้น');
    if(b.busy) return toast('รอให้จบเทิร์นก่อน แล้วลองอีกครั้ง');
    closeModal(); b.busy = true; e.hp = 0;
    try{ updateEnemyHp(); }catch(err){}
    await enemyDies();
  }

  /* ---------------- enter / exit the sandbox ---------------- */
  function enterDev(){
    if(ui.screen==='battle') return toast('ออกจากการต่อสู้ก่อน แล้วค่อยเข้าโหมดทดสอบ');
    const raw = ls.get(SAVE_KEY);
    if(!ls.set(K_REAL, raw===null ? NONE : raw)) return toast('เก็บเซฟจริงไม่ได้ (พื้นที่เครื่องเต็ม?) — ยกเลิก');
    const dev = maxAll(JSON.parse(JSON.stringify(save)));
    ls.set(SAVE_KEY, JSON.stringify(dev));
    ls.set(K_ON, '1');
    location.reload();
  }
  function exitDev(){
    if(ui.screen==='battle') return toast('ออกจากการต่อสู้ก่อน แล้วค่อยออกจากโหมดทดสอบ');
    const real = ls.get(K_REAL);
    if(real===null || real===NONE) ls.del(SAVE_KEY); else ls.set(SAVE_KEY, real);
    ls.del(K_REAL); ls.del(K_ON);
    location.reload();
  }

  /* ---------------- panel ---------------- */
  const st = document.createElement('style');
  st.textContent = `
    .dev-tab{position:fixed;left:0;top:42%;z-index:40;writing-mode:vertical-rl;transform:rotate(180deg);padding:10px 5px;border:0;border-radius:0 8px 8px 0;
      background:linear-gradient(180deg,#ff3b4e,#8a2aff);color:#fff;font:700 11px/1 Kanit,sans-serif;letter-spacing:2px;opacity:.82;box-shadow:0 2px 10px rgba(0,0,0,.5);cursor:pointer}
    .dev-tab:active{opacity:1}
    .dev{display:grid;gap:10px;max-height:min(78vh,calc(var(--app-h,100vh) - 90px));overflow:auto;text-align:left}
    .dev-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;font:700 19px/1.2 Kanit,sans-serif;color:#ffd27a;letter-spacing:.5px}
    .dev-hd small{display:block;font-size:12px;font-weight:400;color:#fff;opacity:.65;letter-spacing:0;margin-top:2px}
    .dev-hd .q2-x{flex:none}
    .dev-sec{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;display:grid;gap:8px;background:rgba(0,0,0,.18)}
    .dev-sec>b{font-size:13px;color:#ffd27a}
    .dev-row{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px}
    .dev-row small{display:block;font-size:11.5px;opacity:.65}
    .dev-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .dev-grid button,.dev-chs button{padding:8px 0;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:inherit;font:600 13px Kanit,sans-serif}
    .dev-grid button.boss{background:rgba(255,59,78,.25);border-color:#ff3b4e}
    .dev-chs{display:flex;gap:6px;flex-wrap:wrap}
    .dev-chs button{padding:6px 10px}
    .dev-chs button.on{background:#f2b42c;color:#1a1020;border-color:#f2b42c}
    .dev-2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .dev-note{font-size:12px;opacity:.7;margin:0;line-height:1.45}
    .dev-in{width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.3);color:inherit;font:16px Kanit,sans-serif;text-align:center;letter-spacing:2px}`;
  document.head.appendChild(st);

  function tabButton(){
    if(!ON || document.querySelector('.dev-tab')) return;
    const t = document.createElement('button'); t.className = 'dev-tab'; t.textContent = '🛠 DEV'; t.dataset.act = 'devPanel'; t.setAttribute('aria-label', 'เปิดแผงโหมดทดสอบ');
    document.body.appendChild(t);
  }

  function askCode(){
    modal(`<div class="dev"><div class="dev-hd"><span>🔐 โหมดทดสอบ<small>สำหรับผู้พัฒนาเท่านั้น</small></span></div>
      <input class="dev-in" id="devCode" type="password" autocomplete="off" placeholder="รหัสผู้พัฒนา" aria-label="รหัสผู้พัฒนา">
      <div class="dev-2"><button class="cbtn wood" data-act="closeModal">ยกเลิก</button><button class="cbtn gold" data-act="devCode">ยืนยัน</button></div></div>`, { dismiss:true });
    setTimeout(() => { const i = $('#devCode'); if(i){ i.focus(); i.addEventListener('keydown', e => { if(e.key==='Enter') ACTS2.devCode(); }); } }, 50);
  }

  function panel(){
    if(!ON){
      modal(`<div class="dev"><div class="dev-hd"><span>🛠 DEV MODE<small>โหมดทดสอบ · ปลดล็อกทุกอย่าง</small></span><button class="q2-x" data-act="closeModal" aria-label="ปิด">${IC2.close}</button></div>
        <p class="dev-note">เข้าโหมดนี้แล้วจะได้ฮีโร่ อาวุธ เกราะ เครื่องประดับ ทุกบท ทุกโหมด และทรัพยากรเต็ม รวมถึงของที่ซ่อนไว้ (devOnly) ที่ผู้เล่นทั่วไปยังไม่เห็น</p>
        <p class="dev-note">🔒 <b>เซฟจริงจะถูกเก็บไว้</b> และเล่นบนสำเนาแยก — กดออกเมื่อไหร่ เซฟจริงกลับมาเหมือนเดิมทุกอย่าง</p>
        <button class="cbtn gold block" data-act="devEnter">▶ เข้าโหมดทดสอบ</button>
        <button class="cbtn wood block" data-act="devLock">ล็อกเครื่องนี้ (ต้องใส่รหัสใหม่)</button></div>`, { dismiss:true });
      return;
    }
    const inB = ui.screen==='battle' && ui.bat, ch = Math.min(CHAPTERS.length-1, Math.max(0, ui.devCh|0)), nm = !!ui.devNm;
    const tog = (k, l, d) => `<div class="dev-row"><div>${l}<small>${d}</small></div><button class="tog ${opts[k]?'on':''}" data-act="devOpt" data-v="${k}" role="switch" aria-checked="${!!opts[k]}" aria-label="${l}"></button></div>`;
    const hid = Object.values(hidden).reduce((a, x) => a + x.length, 0);
    modal(`<div class="dev"><div class="dev-hd"><span>🛠 DEV MODE<small>กำลังเล่นบนเซฟทดสอบ · เซฟจริงปลอดภัย</small></span><button class="q2-x" data-act="closeModal" aria-label="ปิด">${IC2.close}</button></div>
      <div class="dev-sec"><b>⚔️ การต่อสู้</b>
        ${tog('god', '🛡 God mode', 'HP ไม่ลด ไม่มีวันตาย')}
        ${tog('oneHit', '💥 ตีทีเดียวตาย', 'ศัตรูตายทุกครั้งที่โดนตี (อาจข้ามเฟสบอส)')}
        ${inB ? `<button class="cbtn red block" data-act="devKill">☠ ฆ่าศัตรูตัวนี้ทันที</button>` : ''}
      </div>
      <div class="dev-sec"><b>🗺️ วาร์ปไปด่าน</b>
        <div class="dev-chs">${CHAPTERS.map((C, i) => `<button class="${i===ch?'on':''}" data-act="devCh" data-v="${i}">บท ${i+1}</button>`).join('')}
          <button class="${nm?'on':''}" data-act="devNm">🌙 Nightmare</button></div>
        <p class="dev-note">${esc((LOCS[ch]||CHAPTERS[ch]).name)} · ${esc((LOCS[ch]||CHAPTERS[ch]).th)}</p>
        <div class="dev-grid">${[...Array(STAGES_PER)].map((_, k) => `<button class="${k===STAGES_PER-1?'boss':''}" data-act="devGo" data-v="${k+1}">${k===STAGES_PER-1?'👑 บอส':`${ch+1}-${k+1}`}</button>`).join('')}</div>
        <div class="dev-2"><button class="cbtn blue" data-act="devTower">🗼 Endless</button><button class="cbtn red" data-act="devTfb">☠️ True Final Boss</button></div>
      </div>
      <div class="dev-sec"><b>🎒 ของและทรัพยากร</b>
        <button class="cbtn gold block" data-act="devMax">🔓 ปลดล็อกทุกอย่าง + เติมทอง/ยา/วัตถุดิบเต็ม</button>
        <p class="dev-note">ของใหม่ที่เพิ่มเข้าเกมจะได้อัตโนมัติทุกครั้งที่เปิดเกมในโหมดนี้${hid ? ` · ของที่ซ่อนจากผู้เล่น (devOnly) ตอนนี้มี ${hid} ชิ้น` : ''}</p>
      </div>
      <button class="cbtn wood block" data-act="devExit">⏏ ออกจากโหมดทดสอบ (คืนเซฟจริง)</button></div>`, { dismiss:true });
  }

  /* ---------------- secret entrance: 7 taps on the version line in ⚙️ → 💾 ---------------- */
  let taps = 0, tapT = 0;
  document.addEventListener('click', ev => {
    const el = ev.target.closest && ev.target.closest('.set2-ver'); if(!el) return;
    const now = Date.now(); taps = now - tapT < 900 ? taps + 1 : 1; tapT = now;
    if(taps>=4 && taps<7) toast(`🛠 อีก ${7-taps} ครั้ง`);
    if(taps>=7){ taps = 0; authed() ? panel() : askCode(); }
  }, true);

  Object.assign(ACTS2, {
    devPanel: () => { authed() ? panel() : askCode(); },
    devCode: () => {
      const i = $('#devCode'); const v = i ? i.value : '';
      if(hash(norm(v))===DEV_PASS_HASH){ ls.set(K_AUTH, DEV_PASS_HASH); sfx.tap && sfx.tap(3); panel(); }
      else { toast('รหัสไม่ถูกต้อง'); sfx.bad && sfx.bad(); if(i){ i.value = ''; i.focus(); } }
    },
    devLock: () => { ls.del(K_AUTH); closeModal(); toast('ล็อกแล้ว'); },
    devEnter: () => enterDev(),
    devExit: () => {
      modal(`<div class="dev"><div class="dev-hd"><span>ออกจากโหมดทดสอบ?</span></div><p class="dev-note">ความคืบหน้าในโหมดทดสอบจะหายไป และเซฟจริงจะกลับมาเหมือนตอนก่อนเข้า</p>
        <div class="dev-2"><button class="cbtn wood" data-act="devPanel">กลับ</button><button class="cbtn red" data-act="devExitDo">ออก</button></div></div>`);
    },
    devExitDo: () => exitDev(),
    devOpt: v => { opts[v] = !opts[v]; saveOpts(); panel(); },
    devCh: v => { ui.devCh = +v; panel(); },
    devNm: () => { ui.devNm = !ui.devNm; panel(); },
    devGo: v => {
      const ch = ui.devCh|0, n = +v; closeModal(); ui.bat = null; ui.pz = null; ui.run = null;
      if(ui.devNm && typeof startNightmare==='function') startNightmare(ch, n);
      else { ui.run = null; playStage(ch, n); }
    },
    devTower: () => { closeModal(); ui.bat = null; ui.pz = null; ui.run = null; playTower(); },
    devTfb: () => { closeModal(); ui.bat = null; ui.pz = null; if(typeof startTFB==='function') startTFB(); },
    devKill: () => { killCurrent(); },
    devMax: () => { QL_DEV.maxAll(); passFeats(); closeModal(); toast('🔓 ปลดล็อกทุกอย่างแล้ว'); if(ui.screen!=='battle'){ try{ render(); }catch(e){} } },
  });

  if(ON){
    maxAll(save); persist();
    passFeats();
    wrapBattle();
    tabButton();
  }
})();
