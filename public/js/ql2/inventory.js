/* ==========================================================================
   QUEST LINES 2.0 — INVENTORY · SHOP
   v26: grouped as EQUIPMENT (Weapon · Armor · Accessory) · ITEMS (Potion ·
   Materials) · CRAFT. The Shop is its own screen (☰ More → Shop) that reuses
   the same list. Buying / equipping reuse the original actions (buyW,
   equipW, buyA, equipA, buyX, equipX …).
   ========================================================================== */
const RECIPES = [
  { id:'heal',   th:'ยาฟื้นพลัง',     out:{ potions:{ heal:1 } },  need:{ bone:3, starmoss:2 } },
  { id:'power',  th:'ยาพลังคูณ',      out:{ potions:{ power:1 } }, need:{ frost:2, ember:2 } },
  { id:'heal3',  th:'ยาฟื้นพลัง ×3',  out:{ potions:{ heal:3 } },  need:{ soul:3, frost:2 } },
  { id:'power2', th:'ยาพลังคูณ ×2',   out:{ potions:{ power:2 } }, need:{ moonGem:1, ember:2 } },
];
const canCraft = r=>Object.entries(r.need).every(([k,n])=>(V2().mats[k]||0)>=n);
function craftable(){ return RECIPES.filter(canCraft); }

function renderInventory(){
  const shop = !!ui.invShop, V = V2();
  let t = ui.invTab || 'weapon'; if(shop && t==='craft') t = 'weapon';
  const GROUPS = [
    { k:'eq',   th:'อุปกรณ์',  en:'EQUIPMENT', tabs:[['weapon','อาวุธ'],['armor','เกราะ'],['acc','เสริม']] },
    { k:'it',   th:'ไอเทม',    en:'ITEMS',     tabs:[['item','ยา'],['mat','วัตถุดิบ']] },
    ...(shop ? [] : [{ k:'cr', th:'ผสมยา', en:'CRAFT', tabs:[['craft','ผสมยา']] }]),
  ];
  const G = GROUPS.find(g=>g.tabs.some(x=>x[0]===t)) || GROUPS[0];
  const eqBtn = (on, act, id)=> on ? `<button class="cbtn small wood" disabled>ใส่อยู่</button>` : `<button class="cbtn small blue" data-act="${act}" data-v="${id}">ใส่</button>`;
  const buy = (act, id, price)=>`<button class="cbtn small gold" data-act="${act}" data-v="${id}" ${save.gold<price?'disabled':''}>${ICON.coin} ${fmt(price)}</button>`;
  const card = (on, pic, h, small, stat, p, btn, cls)=>`<div class="panel item inv-it ${on?'equipped':''} ${cls||''}"><div class="pic">${pic}</div><div class="meta"><h4>${h}<small>${small}</small></h4>${stat?`<div class="stat">${stat}</div>`:''}<p>${p}</p>${btn}</div></div>`;
  // v51: items with unmet feats show them (with progress) instead of the price button — js/ql2/unlocks.js
  const isLocked = (k, it) => typeof itemLocked==='function' && itemLocked(k, it);
  const lockOr = (k, it, btn) => isLocked(k, it) ? `<span class="inv-own lock">🔒 ${fmt(it.price)}</span>${itemLockHtml(k, it)}` : btn;
  const lockCls = (k, it) => isLocked(k, it) ? 'locked' : '';
  const boom = save.eq.char==='boomtos';
  let items = '';
  if(t==='weapon'){
    if(boom) items += `<p class="sub inv-note">🔥 Boomtos ใช้ดาบหลอมนรกประจำตัวเท่านั้น อาวุธที่ใส่จะมีผลกับนักสู้คนอื่น</p>`;
    WEAPONS.filter(w=>shop || save.weapons.includes(w.id)).forEach(w=>{ const own = save.weapons.includes(w.id), on = save.eq.weapon===w.id;
      items += card(on, weaponIcon(w.id), esc(w.name), esc(w.th), `ATK ${w.atk}`, esc(w.perkTh||'อาวุธพื้นฐาน'), own ? (shop ? `<span class="inv-own">✔ มีแล้ว</span>` : eqBtn(on,'equipW',w.id)) : lockOr('weapon', w, buy('buyW', w.id, w.price)), lockCls('weapon', w)); });
  } else if(t==='armor'){
    ARMORS.filter(a=>shop || save.armors.includes(a.id)).forEach(a=>{ const own = save.armors.includes(a.id), on = save.eq.armor===a.id;
      items += card(on, a.id==='none'?'<span class="sub">—</span>':shieldIcon(a.id), esc(a.name), esc(a.th), `กันดาเมจ ${Math.round(a.block*100)}%${a.hp?` · HP +${a.hp}`:''}`, a.id==='none'?'ชุดพื้นฐาน ไม่มีเกราะ':'ลดดาเมจจากมอนสเตอร์ และเพิ่ม HP สูงสุด', own ? (shop ? `<span class="inv-own">✔ มีแล้ว</span>` : eqBtn(on,'equipA',a.id)) : lockOr('armor', a, buy('buyA', a.id, a.price)), lockCls('armor', a)); });
  } else if(t==='acc'){
    items += `<div class="panel inv-slots"><span>${esc(CH(save.eq.char).name)} ใส่ได้ ${accSlots()} ชิ้น</span><div class="acc-slots">${[0,1,2,3].map(i=>{ if(i>=accSlots()) return `<span class="acc-slot locked" title="ปลดล็อกที่ ฮีโร่ → ฝึกฝน">${ICON.lock}</span>`; const a = save.acc[i]; return `<span class="acc-slot ${a?'':'empty'}" title="${a?esc(ACC(a).th):'ช่องว่าง'}">${a?ACC_ART[a]:'+'}</span>`; }).join('')}</div></div>`;
    const list = ACCESSORIES.filter(x=>shop || save.accs.includes(x.id));
    list.forEach(x=>{ const own = save.accs.includes(x.id), on = hasAcc(x.id);
      items += card(on, ACC_ART[x.id], esc(x.name), esc(x.th), '', esc(x.desc), !own ? lockOr('acc', x, buy('buyX', x.id, x.price)) : shop ? `<span class="inv-own">✔ มีแล้ว</span>` : on ? `<button class="cbtn small wood" data-act="unequipX" data-v="${x.id}">ถอดออก</button>` : `<button class="cbtn small blue" data-act="equipX" data-v="${x.id}">ใส่</button>`, lockCls('acc', x)); });
    if(!list.length) items += `<div class="inv-empty">ยังไม่มีไอเทมเสริม<button class="cbtn gold small" data-act="invShop" data-v="1">เปิดร้านค้า</button></div>`;
  } else if(t==='item'){
    Object.entries(POTIONS).forEach(([k,p])=>{ items += card(false, ICON[p.icon], esc(p.name), `${esc(p.th)} · มีอยู่ ${save.potions[k]||0}`, '', `${esc(p.desc)} · ใช้ได้ระหว่างต่อสู้`, shop ? buy('buyP', k, p.price) : `<span class="inv-own">×${save.potions[k]||0}</span>`); });
    if(!shop) items += `<p class="sub inv-note">ซื้อยาเพิ่มได้ที่ร้านค้า หรือผสมเองที่แท็บ "ผสมยา"</p>`;
  } else if(t==='mat'){
    const owned = Object.keys(MATS).filter(k=>(V.mats[k]||0)>0);
    items += `<div class="inv-mats">${Object.entries(MATS).map(([k,M])=>{ const n = V.mats[k]||0;
      return `<div class="panel inv-mat ${n?'':'none'} r${M.rar}"><span class="im-ic">${matIcon(k)}</span><b>${esc(M.th)}</b><small>${esc(M.name)} · ${esc(LOCS[M.from].name)}</small><span class="im-n">×${n}</span>
        ${shop && n ? `<div class="im-sell"><button class="cbtn small wood" data-act="sellMat" data-v="${k}">ขาย 1 · ${M.sell}</button>${n>1?`<button class="cbtn small gold" data-act="sellAll" data-v="${k}">ขายหมด ${fmt(M.sell*n)}</button>`:''}</div>` : ''}</div>`; }).join('')}</div>`;
    if(shop && !owned.length) items += `<p class="sub inv-note">ยังไม่มีวัตถุดิบให้ขาย — ปราบมอนสเตอร์เพื่อเก็บวัตถุดิบ</p>`;
  }
  if(t==='craft'){
    items = `<p class="sub inv-note">ใช้วัตถุดิบที่ได้จากมอนสเตอร์ ผสมเป็นยาสำหรับการต่อสู้</p>` + RECIPES.map(r=>{ const ok = canCraft(r);
      return `<div class="panel inv-craft ${ok?'ok':''}"><span class="ic-out">${ICON[POTIONS[Object.keys(r.out.potions)[0]].icon]}</span><span class="ic-t"><b>${esc(r.th)}</b><span class="ic-need">${Object.entries(r.need).map(([k,n])=>`<i class="${(V.mats[k]||0)>=n?'ok':''}">${matIcon(k)}${V.mats[k]||0}/${n}</i>`).join('')}</span></span><button class="cbtn small ${ok?'gold':'wood'}" data-act="craft" data-v="${r.id}" ${ok?'':'disabled'}>ผสม</button></div>`; }).join('');
  }
  const head = shop
    ? `<div class="inv-top"><div><span class="q2-kicker">SHOP</span><h2 class="q2-h">ร้านค้า</h2><small class="sub">ของที่ซื้อจะเข้ากระเป๋าและใส่ให้ทันที</small></div><button class="cbtn wood small" data-act="invShop" data-v="0">${IC2.bag} กระเป๋า</button></div>`
    : `<div class="inv-top"><div><span class="q2-kicker">INVENTORY</span><h2 class="q2-h">กระเป๋า</h2>
        <div class="inv-eq"><span>${boom?'🔥':ICON.sword} ${esc(curWp().th)}</span><span>${ICON.shield} ${esc(AR(save.eq.armor).th)}</span></div></div>
        <button class="cbtn gold small" data-act="invShop" data-v="1">${ICON.coin} ร้านค้า</button></div>`;
  const groups = `<div class="inv-groups" role="tablist">${GROUPS.map(g=>`<button class="${g===G?'on':''}" data-act="invTab" data-v="${g.tabs[0][0]}" role="tab" aria-selected="${g===G}"><small>${g.en}</small>${g.th}${g.k==='cr' && craftable().length?'<em class="q2-badge dot"></em>':''}</button>`).join('')}</div>`;
  const sub = G.tabs.length>1 ? `<div class="inv-sub">${G.tabs.map(([k,l])=>`<button class="${t===k?'on':''}" data-act="invTab" data-v="${k}">${l}</button>`).join('')}</div>` : '';
  return head + `<div class="q2-anchor"></div><div class="inv-nav">${groups}${sub}</div><div class="items inv-items ${t==='mat'?'mats':''} ${t==='craft'?'craft':''}">${items}</div>`;
}
SCREENS.inventory = { nav:'more', back:'more', render:()=>{ ui.invShop = false; return renderInventory(); }, key:()=>'b' };
SCREENS.shop = { nav:'more', back:'more', render:()=>{ ui.invShop = true; return renderInventory(); }, key:()=>'s' };
Object.assign(ACTS2, {
  invTab: v=>{ ui.invTab = v; if(ui.screen!=='inventory' && ui.screen!=='shop') goTo('inventory'); else tabRender(); },
  invShop: v=>{ sfx.tap && sfx.tap(2); goTo(v==='1' ? 'shop' : 'inventory', 'fade'); },
  sellMat: v=>{ const V = V2(), M = MATS[v]; if(!M || !(V.mats[v]>0)) return; V.mats[v]--; save.gold += M.sell; sfx.coin && sfx.coin(); persist(); render(); },
  sellAll: v=>{ const V = V2(), M = MATS[v], n = V.mats[v]||0; if(!M || !n) return; V.mats[v] = 0; save.gold += M.sell*n; sfx.coin && sfx.coin(); toast(`ขาย ${esc(M.th)} ×${n} ได้ ${fmt(M.sell*n)} ทอง`); persist(); render(); },
  craft: v=>{ const r = RECIPES.find(x=>x.id===v); if(!r || !canCraft(r)) return; const V = V2(); Object.entries(r.need).forEach(([k,n])=>V.mats[k]-=n);
    const html = grant(r.out); sfx.power && sfx.power(); toast(`⚗️ ผสม ${esc(r.th)} สำเร็จ!`); persist(); render(); },
});
