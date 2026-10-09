/* ==========================================================================
   LETTERⁿ v78 — 💡 GOLDEN BULB (หลอดไฟทองคำ) + REDEEM CODES
   --------------------------------------------------------------------------
   · Golden Bulb — a permanent key item (no slot needed): the yellow 💡 hint
     button (shows the longest word on the board) never runs out — ∞.
     Shop → ไอเทม → ยา tab · price 1,000,000 gold.
   · Redeem codes — typed into the hidden code box (⚙️ → 💾 → tap the
     version line 7 times), the same box that opens dev mode:
       kondo007  → the Golden Bulb
       jdijk15   → +500,000 gold
     Each code works once per save.
   ========================================================================== */
(function(){
  const PRICE = 1000000;
  const has = () => !!(save && save.goldBulb);
  const BULB_ART = `<svg viewBox="0 0 40 40" class="ico" aria-hidden="true"><defs><radialGradient id="gbG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd84a"/><stop offset="1" stop-color="#e09a12"/></radialGradient></defs>
    <circle cx="20" cy="16" r="15" fill="#ffe27a" opacity=".35"/><path d="M20,4 C12,4 8,10 8,15 C8,20 12,22 14,26 L26,26 C28,22 32,20 32,15 C32,10 28,4 20,4 Z" fill="url(#gbG)" stroke="#161a3c" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="14" y="26" width="12" height="5" rx="1.5" fill="#c9a24a" stroke="#161a3c" stroke-width="2"/><rect x="15.5" y="31" width="9" height="4" rx="2" fill="#8a6a2a" stroke="#161a3c" stroke-width="2"/>
    <path d="M16,17 Q20,12 24,17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><text x="20" y="21.5" text-anchor="middle" font-size="7" font-weight="900" fill="#7a4a00">∞</text></svg>`;

  /* ------------------------------ ∞ hints in battle ------------------------------ */
  if(typeof useHint==='function'){
    useHint = (f => function(){
      const b = ui.bat;
      if(!has() || !b) return f.apply(this, arguments);
      b.hints = Math.max(1, b.hints||0);
      const out = f.apply(this, arguments);
      b.hints = 99;          // never runs out
      return out;
    })(useHint);
  }
  updateHud = (f => function(){
    const out = f.apply(this, arguments);
    try{
      const b = ui.bat, n = $('#nHint'), btn = $('#bHint');
      if(has() && b && n && btn){ b.hints = Math.max(b.hints||0, 99); n.textContent = ' ∞'; btn.disabled = false; btn.classList.add('gb-on'); }
    }catch(e){}
    return out;
  })(updateHud);

  /* ------------------------------ the shop / bag card ------------------------------ */
  function card(shop){
    const own = has();
    const btn = own ? `<span class="inv-own">✔ มีแล้ว · ทำงานอัตโนมัติ</span>`
      : shop ? `<button class="cbtn small gold" data-act="buyBulb" ${save.gold<PRICE?'disabled':''}>${ICON.coin} ${fmt(PRICE)}</button>` : `<span class="inv-own lock">🛒 ${fmt(PRICE)}</span>`;
    return `<div class="panel item inv-it gb-card ${own?'equipped':''}"><div class="pic">${BULB_ART}</div><div class="meta"><h4>Golden Bulb<small>หลอดไฟทองคำ · ไอเทมถาวร</small></h4>
      <div class="stat">💡 คำใบ้ไม่จำกัด</div><p>ปุ่มหลอดไฟสีเหลือง (โชว์คำที่ยาวที่สุดบนกระดาน) ใช้ได้ไม่จำกัดทุกด่าน · ไม่ต้องใส่ช่องเสริม</p>${btn}</div></div>`;
  }
  renderInventory = (f => function(){
    const html = f.apply(this, arguments);
    try{
      const t = ui.invTab || 'weapon';
      if(t==='item' && (ui.invShop || has())){ const i = html.lastIndexOf('</div>'); return html.slice(0, i) + card(!!ui.invShop) + html.slice(i); }
    }catch(e){}
    return html;
  })(renderInventory);
  try{ ['shop','inventory'].forEach(k => { const S = SCREENS[k]; if(S){ const r = S.render; S.render = function(){ const out = r.apply(this, arguments); return out.includes('gb-card') ? out : (function(){ const t = ui.invTab || 'weapon'; if(t==='item' && (ui.invShop || has())){ const i = out.lastIndexOf('</div>'); return out.slice(0, i) + card(!!ui.invShop) + out.slice(i); } return out; })(); }; } }); }catch(e){}

  ACTS2.buyBulb = function(){
    if(has()) return;
    if(save.gold < PRICE){ toast(`ทองไม่พอ — ต้องใช้ ${fmt(PRICE)} ทอง`); return; }
    save.gold -= PRICE; give();
  };
  function give(){
    save.goldBulb = true; persist();
    try{ sfx.win(); }catch(e){}
    try{ modal(`<div class="ul-cel"><div class="ul-k">💡 NEW ITEM</div><div class="ul-face"><span style="display:inline-block;width:72px;height:72px">${BULB_ART}</span></div>
      <div class="ul-n">Golden Bulb</div><p class="ul-q">หลอดไฟทองคำ — ปุ่มคำใบ้ 💡 ใช้ได้ไม่จำกัดแล้ว!</p>
      <div class="btns"><button class="cbtn gold block" data-act="closeModal">เยี่ยม!</button></div></div>`, { dismiss:true }); }catch(e){ toast('💡 ได้ Golden Bulb แล้ว!'); }
    try{ render(); }catch(e){}
  }

  /* ------------------------------ redeem codes ------------------------------ */
  const CODES = {
    kondo007: { th:'💡 Golden Bulb', run(){ if(has()){ toast('มี Golden Bulb อยู่แล้ว'); return false; } give(); return true; } },
    jdijk15:  { th:'💰 +500,000 ทอง', run(){ save.gold = (save.gold||0) + 500000; persist(); try{ sfx.buy ? sfx.buy() : sfx.win(); }catch(e){}
      try{ modal(`<div class="ul-cel"><div class="ul-k">🎁 REDEEM</div><div class="ul-face"><span style="font-size:60px">💰</span></div><div class="ul-n">+500,000 ทอง</div>
        <p class="ul-q">ทองทั้งหมด ${fmt(save.gold)}</p><div class="btns"><button class="cbtn gold block" data-act="closeModal">เยี่ยม!</button></div></div>`, { dismiss:true }); }catch(e){ toast('💰 +500,000 ทอง'); }
      try{ render(); }catch(e){} return true; } },
  };
  /** returns true when the text was a reward code (handled, even if already used) */
  window.QL_REDEEM = function(raw){
    const code = String(raw||'').trim().toLowerCase();
    const C = CODES[code]; if(!C) return false;
    save.codes = save.codes || {};
    if(save.codes[code]){ toast('ใช้รหัสนี้ไปแล้ว'); return true; }
    if(C.run() !== false){ save.codes[code] = Date.now(); persist(); }
    return true;
  };

  const st = document.createElement('style');
  st.textContent = `#bHint.gb-on{background:linear-gradient(180deg,#fff6c8,#ffd84a 55%,#e09a12) !important;color:#5a3a00 !important;box-shadow:0 0 10px rgba(255,210,70,.7)}
    .gb-card .pic .ico{width:44px;height:44px}
    .gb-card{border-color:#ffc83d !important}`;
  document.head.appendChild(st);
})();
