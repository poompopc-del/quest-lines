/* ==========================================================================
   PLATFORM MODE · ITEMS (v96) — HP bar, potions, shop, relics, loot
   --------------------------------------------------------------------------
   · HP: one old heart = HPU hit points (shown as a bar). Enemy damage is in
     hearts and scaled in Player.hurt. No HP pickups exist any more — healing
     is potions you buy / find and drink yourself.
   · Wallet: coins (🪙) collected in Platform Mode, kept in the Platform save.
   · Items  potion  — drink (H · pad Select · 🧪 on the HUD)
            use     — the QUICK item (G · pad R3 · HUD button): bomb / frost / meteor
            relic   — passive, up to RELIC_SLOTS equipped (shop → กระเป๋า)
            legend  — relics that are never sold: only enemies (mostly bosses) drop them
            treasure— loot to sell in the shop
   · Loot: enemies drop coins (+ treasure, potions, relics, legendaries by chance);
     everything flies to the player by itself (magnet).
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, U = PLAT.U;
const HPU = PLAT.HPU = 20;                         // hit points per old heart
const RELIC_SLOTS = PLAT.RELIC_SLOTS = 3;

const I = PLAT.ITEMS = {
  // ---- potions
  potS:   { type: 'potion', spr: [0, 0], name: 'ยาฟื้นฟูเล็ก', icon: '🧪', price: 40, heal: .3, desc: 'ฟื้น HP 30%' },
  potL:   { type: 'potion', spr: [1, 0], name: 'ยาฟื้นฟูใหญ่', icon: '⚗️', price: 110, heal: .7, desc: 'ฟื้น HP 70%' },
  elixir: { type: 'potion', spr: [2, 0], name: 'น้ำอมฤตสวรรค์', icon: '🌟', price: 280, heal: 1, inv: 300, desc: 'ฟื้นเต็มหลอด + อมตะ 5 วินาที' },
  // ---- quick items (one is selected as the QUICK item)
  bomb:   { type: 'use', name: 'ระเบิดปีศาจ', icon: '💣', price: 90, desc: 'ขว้างระเบิดโค้ง ระเบิดรัศมีกว้าง ดาเมจ 12' },
  frost:  { type: 'use', spr: [3, 0], name: 'ลูกแก้วยุคน้ำแข็ง', icon: '❄️', price: 170, desc: 'แช่แข็งศัตรูทั้งจอ 3 วิ (บอส 1 วิ) — โดนตี ×2 ระหว่างแข็ง' },
  meteor: { type: 'use', spr: [4, 0], name: 'คัมภีร์ฝนอุกกาบาต', icon: '☄️', price: 260, desc: 'เรียกอุกกาบาต 8 ลูกถล่มศัตรูบนจอ ลูกละ 8' },
  // ---- relics (passive · equip up to 3)
  wind:    { type: 'relic', name: 'รองเท้าวายุ', icon: '🪽', price: 800, desc: 'กระโดดกลางอากาศได้อีก 1 ครั้ง (ทุกตัวละคร)' },
  vamp:    { type: 'relic', name: 'เขี้ยวแวมไพร์', icon: '🩸', price: 650, desc: 'ฆ่าศัตรู = ดูดเลือด +6 HP (บอส +40)' },
  thunder: { type: 'relic', name: 'เครื่องรางสายฟ้า', icon: '⚡', price: 700, desc: 'ตีโดนครบ 6 ครั้ง = ฟ้าผ่าศัตรูตรงหน้า ดาเมจ 6' },
  midas:   { type: 'relic', name: 'แม่เหล็กไมดาส', icon: '🧲', price: 500, desc: 'เหรียญ ×1.5 · โอกาสดรอปสมบัติ/ไอเทม ×1.5' },
  aegis:   { type: 'relic', name: 'เศษโล่อีจิส', icon: '🛡️', price: 900, desc: 'บาเรียกันการโจมตี 1 ครั้ง ชาร์จใหม่ทุก 15 วิ' },
  berserk: { type: 'relic', name: 'หน้ากากอสูรคลั่ง', icon: '👹', price: 550, desc: 'HP ต่ำกว่า 40% = ดาเมจ +50% ตัวลุกเป็นไฟ' },
  phoenix: { type: 'relic', name: 'ขนนกฟีนิกซ์', icon: '🔥', price: 1200, desc: 'ตายครั้งแรกของด่าน = ฟื้นจากเถ้า HP 50% + ระเบิดไฟรอบตัว' },
  shadow:  { type: 'relic', name: 'ตราดาบเงา', icon: '🌀', price: 750, desc: 'หน้าต่างปัดนานขึ้น · COUNTER แรงขึ้น 50%' },
  // ---- legendary (drop only)
  godblade:{ type: 'relic', legend: true, name: 'เศษดาบเทพสวรรค์', icon: '🗡️', price: 0, sell: 1500, desc: 'ดาเมจทุกท่า +60% · คริติคอล 15% (×2)' },
  halo:    { type: 'relic', legend: true, name: 'วงแหวนเทวดา', icon: '😇', price: 0, sell: 1500, desc: 'ฟื้น HP เองตลอดเวลา · ปัดสำเร็จ +15 HP' },
  dragon:  { type: 'relic', legend: true, name: 'มงกุฎราชันมังกร', icon: '🐉', price: 0, sell: 2000, desc: 'HP สูงสุด +40 · ออร่าไฟเผาศัตรูรอบตัวตลอดเวลา' },
  // ---- treasure (sell)
  ring:   { type: 'treasure', name: 'แหวนทองโบราณ', icon: '💍', sell: 25 },
  goblet: { type: 'treasure', spr: [5, 0], name: 'ถ้วยราชวงศ์', icon: '🏆', sell: 45 },
  orb:    { type: 'treasure', name: 'ลูกแก้วพยากรณ์', icon: '🔮', sell: 80 },
  crown:  { type: 'treasure', name: 'มงกุฎราชา', icon: '👑', sell: 160 },
  egg:    { type: 'treasure', name: 'ไข่มังกรทองคำ', icon: '🥚', sell: 400 },
};
for (const [k, v] of Object.entries(I)) v.id = k;

/* ------------------------------------------------------------------ pixel icons (v97)
   items/plat/icons.png = 16 px cells from "16x16 Assorted RPG Icons" by Shade (CC0),
   built by tools/plat-icons.py. An item with `spr: [col, row]` shows that cell;
   items without one (or before the image loads) keep their emoji. */
const ICON_SRC = 'items/plat/icons.png?v=1', ICON_COLS = 8, ICON_ROWS = 1;
let iconImg = null;
const icons = () => { if (!iconImg && typeof Image === 'function') { iconImg = new Image(); iconImg.src = ICON_SRC; } return iconImg; };
icons();
PLAT.ICON_CELL = { chest: [6, 0] };
// draw an item (or a raw [col,row] cell) centred on x,y, `size` px tall
PLAT.drawIcon = function (ctx, it, x, y, size) {
  const spr = Array.isArray(it) ? it : it && it.spr;
  const img = icons();
  if (spr && img && img.complete && img.naturalWidth) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, spr[0] * 16, spr[1] * 16, 16, 16, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    ctx.imageSmoothingEnabled = sm; return true;
  }
  if (Array.isArray(it)) return false;
  ctx.font = Math.round(size * .78) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.icon, x, y); ctx.textBaseline = 'alphabetic';
  return true;
};
// HTML for an item icon: a pixel sprite sized 1em (scale it with font-size), else the emoji
PLAT.iconHTML = function (it) {
  if (!it) return '—';
  if (!it.spr) return it.icon;
  return `<i class="pi" role="img" aria-label="${it.name}" style="background-image:url('${ICON_SRC}');background-size:${ICON_COLS}em ${ICON_ROWS}em;background-position:-${it.spr[0]}em -${it.spr[1]}em"></i>`;
};
PLAT.SHOP_ORDER = ['potS', 'potL', 'elixir', 'bomb', 'frost', 'meteor', 'wind', 'vamp', 'thunder', 'midas', 'aegis', 'berserk', 'phoenix', 'shadow'];
const LEGENDS = ['godblade', 'halo', 'dragon'], BUY_RELICS = PLAT.SHOP_ORDER.filter(k => I[k].type === 'relic');

/* ------------------------------------------------------------------ save (Platform save, own fields) */
const S = () => PLAT.save;
PLAT.bag = {
  d() {
    const d = S().data;
    if (typeof d.wallet !== 'number') d.wallet = Math.max(0, Math.floor((d.stats && d.stats.coins) || 0));   // first run: the coins already collected
    if (!d.inv || typeof d.inv !== 'object') d.inv = { potS: 2 };                                            // a starter kit
    if (!Array.isArray(d.relics)) d.relics = [];
    if (!Array.isArray(d.owned)) d.owned = [];
    if (d.quick === undefined) d.quick = 'bomb';
    return d;
  },
  count(id) { return this.d().inv[id] || 0; },
  add(id, n) { const d = this.d(); if (I[id].type === 'relic') { if (!d.owned.includes(id)) d.owned.push(id); return; } d.inv[id] = (d.inv[id] || 0) + (n || 1); },
  take(id) { const d = this.d(); if (!d.inv[id]) return false; d.inv[id]--; return true; },
  owns(id) { return this.d().owned.includes(id); },
  equipped(id) { return this.d().relics.includes(id); },
  coins() { return this.d().wallet; },
  pay(n) { const d = this.d(); if (d.wallet < n) return false; d.wallet -= n; return true; },
  earn(n) { this.d().wallet += n; },
  buy(id) { const it = I[id]; if (!it || !it.price) return 'nope'; if (it.type === 'relic' && this.owns(id)) return 'owned'; if (!this.pay(it.price)) return 'money'; this.add(id); S().persist(); return 'ok'; },
  sell(id) { const it = I[id]; if (!it || !it.sell || !this.count(id)) return false; this.take(id); this.earn(it.sell); S().persist(); return true; },
  sellRelic(id) { const d = this.d(), it = I[id]; if (!it || !it.sell || !this.owns(id)) return false; d.owned = d.owned.filter(x => x !== id); d.relics = d.relics.filter(x => x !== id); this.earn(it.sell); S().persist(); return true; },
  toggleRelic(id) { const d = this.d(); if (!this.owns(id)) return 'no'; if (d.relics.includes(id)) { d.relics = d.relics.filter(x => x !== id); S().persist(); return 'off'; } if (d.relics.length >= RELIC_SLOTS) return 'full'; d.relics.push(id); S().persist(); return 'on'; },
  setQuick(id) { this.d().quick = id; S().persist(); },
};

/* ------------------------------------------------------------------ loot */
// what an enemy leaves behind (besides its coins). Chances ×1.5 with the Midas relic.
PLAT.rollLoot = function (e, rnd) {
  rnd = rnd || Math.random;
  const boss = !!(e.def && e.def.boss), elite = !!e.elite, m = PLAT.relicOn('midas') ? 1.5 : 1, out = [];
  const pick = l => { let t = l.reduce((a, b) => a + b[1], 0) * rnd(); for (const [k, w] of l) { t -= w; if (t <= 0) return k; } return l[0][0]; };
  if (boss) {
    out.push('crown', pick([['ring', 3], ['goblet', 3], ['orb', 2]]), pick([['potL', 2], ['elixir', 1]]));
    if (rnd() < .35 * m) out.push('egg');
  } else if (rnd() < (elite ? .45 : .12) * m) out.push(pick(elite ? [['goblet', 3], ['orb', 3], ['crown', 1]] : [['ring', 6], ['goblet', 3], ['orb', 1]]));
  if (!boss && rnd() < (elite ? .15 : .04) * m) out.push(rnd() < .8 ? 'potS' : 'potL');
  const relicP = (boss ? .3 : elite ? .04 : .005) * m, legendP = (boss ? .12 : elite ? .015 : .0015) * m;
  if (rnd() < legendP) { const l = LEGENDS.filter(k => !PLAT.bag.owns(k)); if (l.length) out.push(l[Math.floor(rnd() * l.length)]); }
  else if (rnd() < relicP) { const l = BUY_RELICS.filter(k => !PLAT.bag.owns(k)); if (l.length) out.push(l[Math.floor(rnd() * l.length)]); }
  return out;
};
// relics in effect for the current run (the equipped ones)
PLAT.relicOn = id => { try { return PLAT.bag.equipped(id); } catch (e) { return false; } };
})(typeof window !== 'undefined' ? window : globalThis);
