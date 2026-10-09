/* ==========================================================================
   LETTERⁿ v76 — HEROES OPEN TO EVERYONE + 🎟️ HERO COUPONS
   --------------------------------------------------------------------------
   · No more unlock conditions for heroes: every hero can be bought with gold
     from the start (the feat lists / "🔒 ทำเงื่อนไขให้ครบก่อน" are gone).
     Weapons / armor / accessories keep their own conditions.
   · Every player gets 2 hero coupons (once per save, old and new players):
     one coupon = one hero of your choice for free.
   Loaded after every hero file, so it sees the whole roster.
   ========================================================================== */
(function(){
  const COUPONS = 2, FLAG = 'heroCouponV76';
  // 1) drop every hero condition — buyC's guard (heroReqsMet) then always passes
  try{ const U = window.HERO_UNLOCK; if(U) Object.keys(U).forEach(k => { delete U[k]; }); }catch(e){}

  // 2) coupons
  function grant(){
    if(typeof save!=='object' || !save) return;
    if(save[FLAG]) return;
    save[FLAG] = 1; save.heroCoupons = (save.heroCoupons||0) + COUPONS;
    try{ persist(); }catch(e){}
  }
  // the gift card shows once, the first time the player is on a menu screen (not title / battle)
  function announce(){
    try{
      if(!save || save.heroCouponSeen || !save.name || !ui || ['battle','title'].includes(ui.screen) || $('#overlay .modal')) return;
      save.heroCouponSeen = 1; persist();
      modal(`<div class="ul-cel"><div class="ul-k">🎟️ ของขวัญ</div><div class="ul-face"><span style="font-size:64px">🎟️🎟️</span></div>
        <div class="ul-n">คูปองแลกฮีโร่ฟรี ${COUPONS} ใบ!</div><p class="ul-q">${save.couponRefund79 ? 'ขอโทษด้วย! ฮีโร่ที่แลกไว้หายเพราะบั๊ก — คืนคูปองให้ครบแล้ว ตอนนี้แลกแล้วอยู่ถาวร' : `ฮีโร่ทุกตัวเปิดให้เลือกแล้ว ไม่ต้องทำเงื่อนไข — ใช้คูปองแลกฮีโร่ที่ชอบได้ฟรี ${COUPONS} ตัว`}</p>
        <div class="btns"><button class="cbtn gold block" data-act="go" data-v="heroes">ไปเลือกฮีโร่</button><button class="cbtn wood block" data-act="closeModal">ไว้ทีหลัง</button></div></div>`, { dismiss:true });
    }catch(e){}
  }
  if(typeof render==='function') render = (f => function(){ const o = f.apply(this, arguments); try{ grant(); if(!save.heroCouponSeen) setTimeout(announce, 500); }catch(e){} return o; })(render);
  const left = () => (save && save.heroCoupons) || 0;

  // the coupon button sits right under the gold "ปลดล็อก" button of a hero you don't own
  function inject(html){
    if(typeof html!=='string' || html.includes('hc-btn')) return html;
    grant();
    const n = left();
    const chip = n > 0 ? `<div class="hc-chip">🎟️ คูปองแลกฮีโร่ฟรี เหลือ <b>${n}</b> ใบ</div>` : '';
    let done = false;
    html = html.replace(/<button class="cbtn red( block)?" data-act="buyC" data-v="(\w+)"([^>]*)>([\s\S]*?)<\/button>/g, (m, blk, id, attrs, inner) => {
      if(save.chars.includes(id)) return m;
      // gold button stays; coupon button added (enabled while coupons remain)
      const cBtn = n > 0 ? `<button class="cbtn gold${blk||''} hc-btn" data-act="useCoupon" data-v="${id}">🎟️ แลกฟรีด้วยคูปอง <small>(เหลือ ${n})</small></button>` : '';
      done = true;
      return m + cBtn;
    });
    if(done && chip) html = html.replace(/(<button class="cbtn red( block)?" data-act="buyC")/, chip + '$1');
    return html;
  }
  if(typeof fighterSelect==='function') fighterSelect = (f => function(){ return inject(f.apply(this, arguments)); })(fighterSelect);
  if(typeof renderHeroes==='function') renderHeroes = (f => function(){ return inject(f.apply(this, arguments)); })(renderHeroes);
  try{ if(SCREENS.heroes){ const r = SCREENS.heroes.render; SCREENS.heroes.render = function(){ return inject(r.apply(this, arguments)); }; } }catch(e){}

  ACTS2.useCoupon = function(v){
    const c = CH(v); if(!c || save.chars.includes(v)) return;
    if(left() <= 0){ toast('คูปองหมดแล้ว — ปลดล็อกด้วยทองได้เลย'); return; }
    let face = ''; try{ face = heroFaceSvg({ char:v, weapon:'wood', armor:'none' }); }catch(e){}
    modal(`<div class="ul-cel"><div class="ul-k">🎟️ ใช้คูปองแลกฮีโร่</div><div class="ul-face">${face}</div><div class="ul-n">${esc(c.name)}</div>
      <p class="ul-q">ใช้คูปอง 1 ใบแลก ${esc(c.name)} ฟรี? (ราคาปกติ ${fmt(c.price)} ทอง · เหลือคูปอง ${left()-1} ใบหลังแลก)</p>
      <div class="btns"><button class="cbtn gold block" data-act="couponYes" data-v="${v}">🎟️ แลกเลย</button><button class="cbtn wood block" data-act="closeModal">ยกเลิก</button></div></div>`, { dismiss:true });
  };
  ACTS2.couponYes = function(v){
    const c = CH(v); if(!c || save.chars.includes(v) || left() <= 0){ closeModal(); return; }
    save.heroCoupons = left() - 1;
    save.chars.push(v); save.eq.char = v;
    (save.couponHeroes = save.couponHeroes || []).push(v);
    persist(); closeModal();
    try{ sfx.win(); }catch(e){}
    try{ ui.hsPick = v; ui.pickChar = v; }catch(e){}
    render();
    toast(`🎟️ ได้ ${c.name} แล้ว! · เหลือคูปอง ${left()} ใบ`);
  };

  const st = document.createElement('style');
  st.textContent = `.hc-chip{margin:8px 0 6px;padding:6px 10px;border-radius:10px;background:linear-gradient(90deg,rgba(255,200,61,.18),rgba(255,200,61,.05));border:1px dashed #ffc83d;color:#ffe9a8;font-weight:700;text-align:center}
    .hc-chip b{color:#fff;font-size:1.1em}
    .hc-btn{margin-top:6px}
    .hc-btn small{opacity:.8;font-weight:600}`;
  document.head.appendChild(st);
  // v79 repair — until v78 every reload wiped heroes registered by js/ql2/*.js (Luffy · Sonic · YOTA · Cream),
  // so coupon heroes vanished. Give the used coupons back once so nobody loses a free pick.
  (function repair(){
    try{
      if(!save || save.couponFix79) return;
      save.couponFix79 = 1;
      if(save[FLAG] && left() < COUPONS){ save.heroCoupons = COUPONS; save.heroCouponSeen = 0; save.couponRefund79 = 1; }
      persist();
    }catch(e){}
  })();
  // the equipped hero must exist and be owned (now that every hero file has loaded)
  (function keepHero(){
    try{
      const ids = new Set(CHARACTERS.map(c => c.id));
      save.chars = (save.chars||['knight']).filter(id => ids.has(id));
      if(!save.chars.includes('knight')) save.chars.unshift('knight');
      if(!ids.has(save.eq.char) || !save.chars.includes(save.eq.char)) save.eq.char = 'knight';
      persist();
    }catch(e){}
  })();
  // first load (title / hub)
  setTimeout(grant, 800);
  window.QL_COUPON = { grant, left };
})();
