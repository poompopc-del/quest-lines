/* ==========================================================================
   PLATFORM MODE · meta progression (v118)
   --------------------------------------------------------------------------
   Everything that lives OUTSIDE a single level:
     counters + achievements (rewards: coins, titles)
     daily / weekly missions · daily login streak · daily challenge (seeded Endless run + a modifier)
     talents (permanent upgrade tree, paid with the Platform wallet)
     boons (Endless: pick 1 of 3 — run-only powers with DUO synergies)
     assist mode (game speed / damage taken)
   Pure logic + data — no DOM. The UI (ui.js) renders it; game / player call the hooks:
     PLAT.meta.track(key, n)          a thing happened (kill, parry, clear …)
     PLAT.meta.buildMods(g)           g.mods = talents + boons (+ daily rules) for this run
     onHit / onParry / onKill / onHurt / step(g)   boon & talent effects
   Saved under PLAT.save.data.meta (older saves just get the defaults).
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, U = PLAT.U;
const S = () => PLAT.save, sfx = () => PLAT.sfx;
const M = PLAT.meta = {};
M.listeners = [];                      // ui: (kind, payload) → toasts for achievements / missions

/* ------------------------------------------------------------------ save */
M.d = () => {
  const d = S().data, m = d.meta || (d.meta = {});
  for (const [k, v] of Object.entries({ ach: {}, cnt: {}, best: {}, tal: {}, daily: {}, rush: {}, medals: {}, titles: [] })) if (!m[k] || typeof m[k] !== 'object') m[k] = v;
  if (!m.streak) m.streak = { last: '', n: 0, max: 0 };
  if (!m.assist) m.assist = { speed: 1, dmg: 1 };
  return m;
};
const save = () => S().persist();
const emit = (k, p) => M.listeners.forEach(f => { try { f(k, p); } catch (e) {} });

/* ------------------------------------------------------------------ dates */
const pad2 = n => String(n).padStart(2, '0');
M.dayKey = (t) => { const d = t ? new Date(t) : new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
M.dayIndex = (t) => { const d = t ? new Date(t) : new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); };
M.weekIndex = (t) => Math.floor((M.dayIndex(t) + 3) / 7);                // weeks start on Monday
const hash = (...n) => { let h = 2166136261 >>> 0; for (const v of n) { h ^= v >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return h >>> 0; };
const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ------------------------------------------------------------------ counters */
M.cnt = k => M.d().cnt[k] || 0;
M.track = (key, n) => {
  if (n === 0) return; const m = M.d(); m.cnt[key] = (m.cnt[key] || 0) + (n == null ? 1 : n);
  M.checkAch(); M.checkMissions();
};
M.best = (key, v) => { const m = M.d(); if (v > (m.best[key] || 0)) { m.best[key] = v; M.checkAch(); } };
// the assist "no damage" setting turns achievements off (everything else still counts)
M.invincible = () => (M.d().assist.dmg || 1) <= 0;

/* ------------------------------------------------------------------ achievements */
// key: a counter (cnt) or a best (best: true) · title: unlocks a title to show on the title screen
const ACH = M.ACH = [
  { id: 'kill1', icon: '🗡️', name: 'ศัตรูตัวแรก', desc: 'ปราบศัตรู 1 ตัว', key: 'kill', need: 1, coins: 20 },
  { id: 'kill100', icon: '⚔️', name: 'นักล่า', desc: 'ปราบศัตรู 100 ตัว', key: 'kill', need: 100, coins: 120 },
  { id: 'kill1000', icon: '💀', name: 'ผู้กวาดล้าง', desc: 'ปราบศัตรู 1,000 ตัว', key: 'kill', need: 1000, coins: 600, title: 'ผู้กวาดล้าง' },
  { id: 'elite25', icon: '★', name: 'ล่าหัวกะทิ', desc: 'ปราบ ELITE 25 ตัว', key: 'eliteKill', need: 25, coins: 250 },
  { id: 'parry10', icon: '🛡️', name: 'มือปัด', desc: 'ปัดสำเร็จ 10 ครั้ง', key: 'parry', need: 10, coins: 50 },
  { id: 'parry300', icon: '🏰', name: 'กำแพงเหล็ก', desc: 'ปัดสำเร็จ 300 ครั้ง', key: 'parry', need: 300, coins: 400, title: 'กำแพงเหล็ก' },
  { id: 'perfect50', icon: '✨', name: 'จังหวะเทพ', desc: 'ปัดเพอร์เฟกต์ 50 ครั้ง', key: 'perfectParry', need: 50, coins: 350 },
  { id: 'boss1', icon: '👹', name: 'ผู้ล้มยักษ์', desc: 'ปราบบอสตัวแรก', key: 'bossKill', need: 1, coins: 100 },
  { id: 'boss12', icon: '👑', name: 'นักปราบบอส', desc: 'ปราบบอส 12 ครั้ง', key: 'bossKill', need: 12, coins: 400 },
  { id: 'nohit1', icon: '🌟', name: 'ไร้รอยขีดข่วน', desc: 'ปราบบอสโดยไม่โดนตีเลย', key: 'noHitBoss', need: 1, coins: 500, title: 'ไร้รอยขีดข่วน' },
  { id: 'clear10', icon: '🗺️', name: 'นักผจญภัย', desc: 'ผ่านด่าน 10 ครั้ง', key: 'clear', need: 10, coins: 150 },
  { id: 'copy20', icon: '🌟', name: 'นักลอกเลียน', desc: 'เคอร์บี้ได้พลังลอกเลียน 20 ครั้ง', key: 'copy', need: 20, coins: 300, title: 'นักลอกเลียน' },
  { id: 'lantern', icon: '🏮', name: 'ผู้จุดตะเกียง', desc: 'จบเนื้อเรื่อง «ห้าตะเกียงแห่งนาม»', key: 'storyEnd', need: 1, coins: 1000, title: 'ผู้จุดตะเกียง' },
  { id: 'allclear', icon: '🏆', name: 'พิชิตทุกโลก', desc: 'ผ่านทุกด่านในเนื้อเรื่อง', key: 'levelsCleared', need: (PLAT.LEVEL_ORDER || []).length || 22, best: true, coins: 1200, title: 'ผู้พิชิตทุกโลก' },
  { id: 'rankS5', icon: '🅢', name: 'มือโปร', desc: 'ได้แรงก์ S 5 ครั้ง', key: 'rankS', need: 5, coins: 250 },
  { id: 'rankS30', icon: '🔱', name: 'ตำนาน', desc: 'ได้แรงก์ S 30 ครั้ง', key: 'rankS', need: 30, coins: 900, title: 'ตำนาน' },
  { id: 'gems', icon: '💎', name: 'นักสะสมอัญมณี', desc: 'เก็บ 💎 ครบ 30 เม็ด', key: 'gems', need: 30, best: true, coins: 500 },
  { id: 'town4', icon: '🏘️', name: 'ฮีโร่ของเมือง', desc: 'ช่วยชาวบ้าน 4 คน', key: 'villager', need: 4, coins: 120 },
  { id: 'town30', icon: '🕊️', name: 'ผู้พิทักษ์', desc: 'ช่วยชาวบ้าน 30 คน', key: 'villager', need: 30, coins: 350, title: 'ผู้พิทักษ์เมือง' },
  { id: 'inhale100', icon: '🌀', name: 'หลุมดำสีชมพู', desc: 'ดูดศัตรู 100 ตัว (Kirby)', key: 'inhale', need: 100, coins: 300 },
  { id: 'coin1k', icon: '🪙', name: 'เศรษฐีน้อย', desc: 'เก็บเหรียญรวม 1,000', key: 'coin', need: 1000, coins: 100 },
  { id: 'coin20k', icon: '💰', name: 'มหาเศรษฐี', desc: 'เก็บเหรียญรวม 20,000', key: 'coin', need: 20000, coins: 1000, title: 'มหาเศรษฐี' },
  { id: 'run500', icon: '🏃', name: 'นักวิ่ง', desc: 'วิ่งโหมดไม่สิ้นสุดได้ 500 ม. ในรอบเดียว', key: 'endlessBest', need: 500, best: true, coins: 200 },
  { id: 'run2000', icon: '♾️', name: 'ไม่มีที่สิ้นสุด', desc: 'วิ่งได้ 2,000 ม. ในรอบเดียว', key: 'endlessBest', need: 2000, best: true, coins: 800, title: 'นักวิ่งนิรันดร์' },
  { id: 'champ1', icon: '🐲', name: 'ล่าแชมป์', desc: 'ปราบบอสโหมดไม่สิ้นสุด 1 ตัว', key: 'champKill', need: 1, coins: 150 },
  { id: 'champ15', icon: '⚜️', name: 'ราชาไร้ขอบเขต', desc: 'ปราบบอสโหมดไม่สิ้นสุด 15 ตัว', key: 'champKill', need: 15, coins: 700 },
  { id: 'boon30', icon: '🎴', name: 'นักสะสมพร', desc: 'เลือกพร 30 ครั้ง', key: 'boonPick', need: 30, coins: 250 },
  { id: 'duo1', icon: '☯️', name: 'พลังผสาน', desc: 'ได้พรคู่ (DUO) ครั้งแรก', key: 'duoPick', need: 1, coins: 250 },
  { id: 'daily1', icon: '📅', name: 'ท้าทายรายวัน', desc: 'เล่นด่านท้าทายรายวัน 1 ครั้ง', key: 'dailyDone', need: 1, coins: 100 },
  { id: 'daily10', icon: '🗓️', name: 'สม่ำเสมอ', desc: 'เล่นด่านท้าทายรายวัน 10 วัน', key: 'dailyDone', need: 10, coins: 600, title: 'นักท้าทาย' },
  { id: 'streak7', icon: '🔥', name: 'ขาประจำ', desc: 'เข้าเล่นติดกัน 7 วัน', key: 'streak', need: 7, best: true, coins: 400 },
  { id: 'mission20', icon: '📜', name: 'มือภารกิจ', desc: 'ทำภารกิจสำเร็จ 20 ภารกิจ', key: 'missionDone', need: 20, coins: 400 },
  { id: 'rush1', icon: '⚡', name: 'ผู้รอดจากศึกบอส', desc: 'ผ่านโหมดล่าบอสครบทุกตัว', key: 'rushClear', need: 1, coins: 1000, title: 'ผู้รอดจากศึกบอส' },
  { id: 'rushS', icon: '🌌', name: 'เทพเจ้าแห่งสงคราม', desc: 'ผ่านโหมดล่าบอสโดยได้เกรด S ทุกตัว', key: 'rushPerfect', need: 1, coins: 2000, title: 'เทพเจ้าแห่งสงคราม' },
  { id: 'talent10', icon: '🌱', name: 'เติบโต', desc: 'อัปพรสวรรค์ 10 ขั้น', key: 'talentRanks', need: 10, best: true, coins: 200 },
  { id: 'talent30', icon: '🌳', name: 'ปรมาจารย์', desc: 'อัปพรสวรรค์ครบทุกขั้น', key: 'talentRanks', need: 27, best: true, coins: 1500, title: 'ปรมาจารย์' },
];
M.achValue = a => a.best ? (M.d().best[a.key] || 0) : M.cnt(a.key);
M.checkAch = () => {
  if (M.invincible()) return;
  const m = M.d(); let any = false;
  for (const a of ACH) {
    if (m.ach[a.id] || M.achValue(a) < a.need) continue;
    m.ach[a.id] = M.dayKey(); any = true;
    if (a.coins) PLAT.bag.earn(a.coins);
    if (a.title && !m.titles.includes(a.title)) m.titles.push(a.title);
    emit('ach', a);
  }
  if (any) save();
};

/* ------------------------------------------------------------------ missions */
const MPOOL = [
  { key: 'kill', txt: 'ปราบศัตรู {n} ตัว', d: [30, 60], w: [200, 350] },
  { key: 'parry', txt: 'ปัดสำเร็จ {n} ครั้ง', d: [10, 25], w: [60, 120] },
  { key: 'perfectParry', txt: 'ปัดเพอร์เฟกต์ {n} ครั้ง', d: [3, 8], w: [20, 40] },
  { key: 'coin', txt: 'เก็บเหรียญ {n} เหรียญ', d: [150, 400], w: [1200, 2500] },
  { key: 'clear', txt: 'ผ่านด่าน {n} ด่าน', d: [2, 4], w: [10, 16] },
  { key: 'endlessDist', txt: 'วิ่งโหมดไม่สิ้นสุดรวม {n} ม.', d: [300, 800], w: [2500, 5000] },
  { key: 'champKill', txt: 'ปราบบอสโหมดไม่สิ้นสุด {n} ตัว', d: [1, 2], w: [5, 8] },
  { key: 'bossKill', txt: 'ปราบบอส {n} ครั้ง', d: [1, 2], w: [4, 7] },
  { key: 'boonPick', txt: 'เลือกพร {n} ครั้ง', d: [3, 6], w: [15, 25] },
  { key: 'eliteKill', txt: 'ปราบ ELITE {n} ตัว', d: [3, 8], w: [20, 35] },
];
const round = v => v >= 100 ? Math.round(v / 50) * 50 : v >= 20 ? Math.round(v / 5) * 5 : Math.round(v);
function makeMissions(seed, weekly, base) {
  const r = rng(seed), pool = MPOOL.slice(), out = [];
  for (let i = 0; i < 3; i++) {
    const k = Math.floor(r() * pool.length), q = pool.splice(k, 1)[0], rg = weekly ? q.w : q.d, need = round(rg[0] + r() * (rg[1] - rg[0]));
    out.push({ key: q.key, txt: q.txt.replace('{n}', need.toLocaleString()), need, base: base[q.key] || 0, coins: weekly ? 400 + i * 100 : 60 + i * 30, item: weekly ? (i === 2 ? 'potL' : 'potS') : null, done: false, claimed: false });
  }
  return out;
}
M.missions = () => {
  const m = M.d(), day = M.dayKey(), wk = M.weekIndex();
  if (!m.mis || m.mis.day !== day) m.mis = { day, list: makeMissions(hash(M.dayIndex(), 11), false, m.cnt) };
  if (!m.wmis || m.wmis.week !== wk) m.wmis = { week: wk, list: makeMissions(hash(wk, 77), true, m.cnt) };
  return { daily: m.mis.list, weekly: m.wmis.list };
};
M.misProgress = q => Math.min(q.need, M.cnt(q.key) - q.base);
M.checkMissions = () => {
  if (!M.d().mis) return;
  const { daily, weekly } = M.missions();
  for (const q of daily.concat(weekly)) if (!q.done && M.misProgress(q) >= q.need) { q.done = true; emit('mission', q); }
};
M.claimable = () => { const { daily, weekly } = M.missions(); return daily.concat(weekly).filter(q => q.done && !q.claimed).length; };
M.claim = q => {
  if (!q.done || q.claimed) return false;
  q.claimed = true; PLAT.bag.earn(q.coins); if (q.item) PLAT.bag.add(q.item, 1);
  M.track('missionDone'); save(); return true;
};

/* ------------------------------------------------------------------ login streak */
const STREAK = M.STREAK = [{ coins: 50 }, { coins: 80, item: 'potS' }, { coins: 120 }, { coins: 150, item: 'bomb' }, { coins: 200, item: 'potS', n: 2 }, { coins: 250, item: 'potL' }, { coins: 400, item: 'frost' }];
// once per calendar day (called at boot): returns { n, reward } when today's reward was just granted
M.checkLogin = () => {
  const m = M.d(), today = M.dayKey(), s = m.streak;
  if (s.last === today) return null;
  const y = M.dayKey(Date.now() - 864e5);
  s.n = s.last === y ? s.n + 1 : 1; s.last = today; s.max = Math.max(s.max || 0, s.n);
  const rw = STREAK[(s.n - 1) % 7];
  PLAT.bag.earn(rw.coins); if (rw.item) PLAT.bag.add(rw.item, rw.n || 1);
  M.best('streak', s.n); save();
  return { n: s.n, reward: rw };
};

/* ------------------------------------------------------------------ daily challenge */
const DMODS = M.DAILY_MODS = [
  { id: 'blessed', name: 'พรสวรรค์', desc: 'เริ่มรอบพร้อมพร 2 อย่าง', icon: '🎴' },
  { id: 'hunt', name: 'ฤดูล่า', desc: 'บอสโผล่เร็วและถี่ขึ้น (ทุก 200 ม.)', icon: '🐲' },
  { id: 'glass', name: 'ปืนแก้ว', desc: 'HP สูงสุดครึ่งเดียว แต่เหรียญ ×2', icon: '🔮' },
  { id: 'swarm', name: 'ฝูงคลั่ง', desc: 'ศัตรูเร็วขึ้น 25%', icon: '🐺' },
  { id: 'boonrush', name: 'ฝนพร', desc: 'ได้เลือกพรทุก 80 ม.', icon: '✨' },
];
M.daily = (t) => {
  const di = M.dayIndex(t), worlds = Object.keys(PLAT.ENDLESS_WORLDS || { 1: 1 }).map(Number);
  return { key: M.dayKey(t), world: worlds[di % worlds.length], seed: hash(di, 2026) % 2147483647, mod: DMODS[hash(di, 9) % DMODS.length] };
};
M.dailyRec = () => { const m = M.d(), k = M.dayKey(); return m.daily[k] || (m.daily[k] = { best: 0, dist: 0, runs: 0 }); };
M.recordDaily = r => {
  const rec = M.dailyRec(), first = !rec.runs; rec.runs++;
  const nb = r.score > rec.best; if (nb) { rec.best = r.score; rec.dist = r.dist; rec.hero = r.heroId; }
  if (first) M.track('dailyDone');
  const keys = Object.keys(M.d().daily).sort(); while (keys.length > 30) delete M.d().daily[keys.shift()];   // keep 30 days of history
  save(); return { rec, newBest: nb, first };
};

/* ------------------------------------------------------------------ talents */
// br: 0 attack · 1 defence · 2 skill — tier n needs (n-1)×2 ranks in the same branch
const TAL = M.TALENTS = [
  { id: 'dmg', br: 0, tier: 1, max: 3, icon: '🗡️', name: 'คมดาบ', desc: 'ดาเมจทุกท่า +8% ต่อขั้น', cost: [150, 300, 500], mod: { dmg: .08 } },
  { id: 'crit', br: 0, tier: 2, max: 3, icon: '🎯', name: 'จุดตาย', desc: 'โอกาสคริติคอล +5% ต่อขั้น (ดาเมจ ×2)', cost: [300, 500, 800], mod: { crit: .05 } },
  { id: 'charge', br: 0, tier: 3, max: 2, icon: '⚡', name: 'พลังสะสม', desc: 'ท่าชาร์จเต็มเร็วขึ้น 25% ต่อขั้น', cost: [600, 1000], mod: { charge: .25 } },
  { id: 'exec', br: 0, tier: 4, max: 1, icon: '☠️', name: 'ประหาร', desc: 'ศัตรูที่ HP ต่ำกว่า 25% โดนแรงขึ้น 50% (บอสด้วย)', cost: [2000], flag: 'execute' },
  { id: 'hp', br: 1, tier: 1, max: 3, icon: '❤️', name: 'พลังชีวิต', desc: 'HP สูงสุด +10 ต่อขั้น', cost: [150, 300, 500], mod: { maxHp: 10 } },
  { id: 'parry', br: 1, tier: 2, max: 3, icon: '🛡️', name: 'จังหวะปัด', desc: 'หน้าต่างปัดนานขึ้น 2 เฟรมต่อขั้น', cost: [300, 600, 900], mod: { parryWin: 2 } },
  { id: 'potion', br: 1, tier: 3, max: 2, icon: '🧪', name: 'ยาเข้มข้น', desc: 'ยาฟื้นฟูแรงขึ้น 25% ต่อขั้น', cost: [500, 900], mod: { potion: .25 } },
  { id: 'counter', br: 1, tier: 4, max: 1, icon: '💥', name: 'สวนกลับ', desc: 'ปัดเพอร์เฟกต์ = คลื่นกระแทกรอบตัว ดาเมจ 8', cost: [2000], flag: 'counterWave' },
  { id: 'en', br: 2, tier: 1, max: 3, icon: '🔷', name: 'พลังไหลเวียน', desc: 'พลังงานสกิลฟื้นเร็วขึ้น 20% ต่อขั้น', cost: [150, 300, 500], mod: { en: .2 } },
  { id: 'ult', br: 2, tier: 2, max: 3, icon: '★', name: 'อัลติไว', desc: 'เกจ ULT เต็มเร็วขึ้น 15% ต่อขั้น', cost: [300, 600, 900], mod: { ult: .15 } },
  { id: 'coin', br: 2, tier: 3, max: 3, icon: '🪙', name: 'นักล่าสมบัติ', desc: 'เหรียญที่เก็บได้ +10% ต่อขั้น', cost: [400, 700, 1000], mod: { coin: .1 } },
  { id: 'wing', br: 2, tier: 4, max: 1, icon: '🪽', name: 'ลมใต้ปีก', desc: 'กระโดดกลางอากาศได้อีก 1 ครั้ง (ทุกตัวละคร)', cost: [2500], mod: { airJumps: 1 } },
];
M.BRANCH = [{ name: 'โจมตี', icon: '⚔️', col: '#ff6a5a' }, { name: 'ป้องกัน', icon: '🛡️', col: '#5ab0ff' }, { name: 'ทักษะ', icon: '✦', col: '#c88aff' }];
M.rank = id => M.d().tal[id] || 0;
M.branchRanks = br => TAL.filter(t => t.br === br).reduce((n, t) => n + M.rank(t.id), 0);
M.talentState = t => {
  const r = M.rank(t.id);
  if (r >= t.max) return { s: 'max' };
  if (M.branchRanks(t.br) < (t.tier - 1) * 2) return { s: 'locked', need: (t.tier - 1) * 2 };
  return { s: PLAT.bag.coins() >= t.cost[r] ? 'buy' : 'poor', cost: t.cost[r] };
};
M.buyTalent = id => {
  const t = TAL.find(x => x.id === id); if (!t) return false;
  const st = M.talentState(t); if (st.s !== 'buy' || !PLAT.bag.pay(st.cost)) return false;
  M.d().tal[id] = M.rank(id) + 1; M.best('talentRanks', TAL.reduce((n, x) => n + M.rank(x.id), 0)); save(); return true;
};
M.resetTalents = () => {             // full refund
  let back = 0; for (const t of TAL) for (let i = 0; i < M.rank(t.id); i++) back += t.cost[i];
  M.d().tal = {}; PLAT.bag.earn(back); save(); return back;
};

/* ------------------------------------------------------------------ boons (Endless) */
const BOONS = M.BOONS = {
  blade:  { icon: '🗡️', name: 'คมพิฆาต', tag: 'atk', max: 3, col: '#ff7a6a', desc: l => `ดาเมจ +${15 * l}%`, mod: l => ({ dmg: .15 * l }) },
  crit:   { icon: '🎯', name: 'ตาเหยี่ยว', tag: 'atk', max: 3, col: '#ffd06a', desc: l => `คริติคอล +${8 * l}% (×2)`, mod: l => ({ crit: .08 * l }) },
  burn:   { icon: '🔥', name: 'ดาบเพลิง', tag: 'fire', max: 3, col: '#ff8a3a', desc: l => `ตีโดน = ติดไฟ 3 วิ (${l + 1} ดาเมจ/ครึ่งวิ)`, mod: l => ({ burn: l }) },
  shock:  { icon: '⚡', name: 'สายฟ้าโซ่', tag: 'storm', max: 3, col: '#8ae0ff', desc: l => `ตีโดนทุก 4 ครั้ง = ฟ้าผ่าโซ่ ${l + 1} ตัว ดาเมจ ${3 + 2 * l}`, mod: l => ({ shock: l }) },
  pwave:  { icon: '🌊', name: 'คลื่นปัด', tag: 'parry', max: 3, col: '#5ab0ff', desc: l => `ปัดสำเร็จ = คลื่นกระแทกรอบตัว ดาเมจ ${2 + 3 * l}`, mod: l => ({ pwave: l }) },
  dfire:  { icon: '☄️', name: 'รอยเพลิง', tag: 'fire', max: 2, col: '#ff6a2a', desc: l => `พุ่ง/แดช = ทิ้งเปลวไฟบนพื้น (${l * 2} ดาเมจ)`, mod: l => ({ dfire: l }) },
  leech:  { icon: '🩸', name: 'ดูดชีวิต', tag: 'blood', max: 3, col: '#ff4a6a', desc: l => `ปราบศัตรู = +${4 * l} HP`, mod: l => ({ leech: 4 * l }) },
  thorns: { icon: '🌵', name: 'เกราะหนาม', tag: 'guard', max: 3, col: '#8ad06a', desc: l => `โดนตี = คนตีโดนสวน ${6 * l}`, mod: l => ({ thorns: 6 * l }) },
  swift:  { icon: '💨', name: 'ฝีเท้าลม', tag: 'move', max: 2, col: '#c8ffe0', desc: l => `เร็วขึ้น ${12 * l}%`, mod: l => ({ speed: .12 * l }) },
  vital:  { icon: '❤️', name: 'หัวใจหิน', tag: 'guard', max: 3, col: '#ff8aa8', desc: l => `HP สูงสุด +${20 * l} (ฟื้นทันที)`, mod: l => ({ maxHp: 20 * l }) },
  focus:  { icon: '🔷', name: 'สมาธิ', tag: 'skill', max: 2, col: '#7a9aff', desc: l => `พลังงาน +${40 * l}% · ULT +${20 * l}%`, mod: l => ({ en: .4 * l, ult: .2 * l }) },
  greed:  { icon: '🪙', name: 'มือทอง', tag: 'gold', max: 3, col: '#ffd84a', desc: l => `เหรียญ +${30 * l}%`, mod: l => ({ coin: .3 * l }) },
  wing:   { icon: '🪽', name: 'ปีกเบา', tag: 'move', max: 1, col: '#e0f0ff', desc: () => 'กระโดดกลางอากาศได้อีก 1 ครั้ง', mod: () => ({ airJumps: 1 }) },
  guard:  { icon: '🔰', name: 'สัญชาตญาณ', tag: 'parry', max: 2, col: '#6ac0ff', desc: l => `หน้าต่างปัด +${3 * l} เฟรม`, mod: l => ({ parryWin: 3 * l }) },
  // DUO boons: only offered when you already own BOTH halves — the "build" moments
  firestorm: { duo: ['burn', 'shock'], icon: '🌋', name: 'พายุเพลิง', col: '#ff5a2a', max: 1, desc: () => 'ฟ้าผ่าศัตรูที่ติดไฟ = ระเบิดรอบตัวมัน ดาเมจ 8', mod: () => ({ firestorm: 1 }) },
  stormparry: { duo: ['pwave', 'shock'], icon: '🌩️', name: 'ปัดอัสนี', col: '#8ae0ff', max: 1, desc: () => 'ปัดสำเร็จ = ฟ้าผ่าศัตรูทุกตัวรอบตัว ดาเมจ 6', mod: () => ({ stormparry: 1 }) },
  lavaarmor: { duo: ['dfire', 'thorns'], icon: '🛡️', name: 'เกราะลาวา', col: '#ff8a3a', max: 1, desc: () => 'โดนตี = ไฟระเบิดรอบตัว · เปลวไฟอยู่นานขึ้นสองเท่า', mod: () => ({ lavaarmor: 1 }) },
  bloodmoon: { duo: ['leech', 'burn'], icon: '🌕', name: 'จันทร์เลือด', col: '#ff3a5a', max: 1, desc: () => 'ศัตรูที่ติดไฟตาย = ระเบิด + ฟื้น HP ×3', mod: () => ({ bloodmoon: 1 }) },
  swiftblade: { duo: ['swift', 'blade'], icon: '🌪️', name: 'ดาบพายุ', col: '#c8ffe0', max: 1, desc: () => 'ยิ่งวิ่งเร็ว ยิ่งแรง: ขณะวิ่ง ดาเมจ +40%', mod: () => ({ swiftblade: 1 }) },
};
const MODK = ['dmg', 'crit', 'charge', 'maxHp', 'parryWin', 'potion', 'en', 'ult', 'coin', 'airJumps', 'speed', 'burn', 'shock', 'pwave', 'dfire', 'leech', 'thorns'];
// g.mods for one game: permanent talents + this run's boons (+ the daily rule)
M.buildMods = g => {
  const o = {}; MODK.forEach(k => o[k] = 0);
  const add = (src, k) => { for (const [kk, v] of Object.entries(src)) o[kk] = (o[kk] || 0) + v * (k || 1); };
  for (const t of TAL) { const r = M.rank(t.id); if (!r) continue; if (t.mod) add(t.mod, r); if (t.flag) o[t.flag] = 1; }
  for (const [id, lv] of Object.entries(g.boons || {})) { const b = BOONS[id]; if (b) add(b.mod(lv)); }
  if (g.daily && g.daily.mod.id === 'glass') { o.maxHpMul = .5; o.coin += 1; }
  return (g.mods = o);
};
// 3 choices: duos first when available (they are the exciting pick), never a maxed boon
M.boonChoices = (g, n) => {
  const own = g.boons || {}, all = Object.keys(BOONS).filter(id => (own[id] || 0) < BOONS[id].max);
  const duo = all.filter(id => BOONS[id].duo && BOONS[id].duo.every(k => own[k]));
  const norm = all.filter(id => !BOONS[id].duo);
  const out = []; if (duo.length && Math.random() < .75) out.push(duo[Math.floor(Math.random() * duo.length)]);
  // half the time, prefer an upgrade or a partner of something you own (builds converge)
  while (out.length < (n || 3) && norm.length) {
    const pref = norm.filter(id => !out.includes(id) && (own[id] || Object.values(BOONS).some(b => b.duo && b.duo.includes(id) && b.duo.some(k => own[k]))));
    const list = (pref.length && Math.random() < .5 ? pref : norm).filter(id => !out.includes(id));
    if (!list.length) break; out.push(list[Math.floor(Math.random() * list.length)]);
  }
  return out;
};
M.pickBoon = (g, id) => {
  const b = BOONS[id]; if (!b) return;
  g.boons = g.boons || {}; g.boons[id] = (g.boons[id] || 0) + 1;
  const p = g.player, oldMax = p.maxHp; M.buildMods(g); M.applyMods(g);
  if (p.maxHp > oldMax) p.heal(p.maxHp - oldMax);
  M.track('boonPick'); if (b.duo) M.track('duoPick');
};
// player numbers that depend on g.mods (called at start and after each boon)
M.maxHpOf = (p, g) => { const m = (g && g.mods) || {}; return Math.max(20, Math.round((p.hero.hp * PLAT.HPU + (PLAT.relicOn('dragon') ? 40 : 0) + (m.maxHp || 0)) * (m.maxHpMul || 1))); };
M.applyMods = g => { const p = g.player; if (!p) return; p.maxHp = M.maxHpOf(p, g); p.hp = Math.min(p.hp, p.maxHp); };

/* ------------------------------------------------------------------ effects (hooks) */
const newSwing = () => PLAT.newSwing();
// a quick lightning bolt drawn as particles between two points
// v120: lightning = a thin jagged arc + the electric-impact sprite where it lands (PVFX Foundry, CC0)
function bolt(g, x0, y0, x1, y1) {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 16));
  for (let i = 0; i <= n; i++) { const k = i / n; g.parts.push({ x: x0 + (x1 - x0) * k + U.rnd(-4, 4), y: y0 + (y1 - y0) * k + U.rnd(-4, 4), vx: 0, vy: 0, life: 7, col: i % 2 ? '#ffffff' : '#8ae0ff', size: 2 }); }
  g.fx('zap', x1, y1, { scale: .8 });
}
// shockwaves are sprites now: frost-nova (parry wave), solar-shrapnel (counter), warm-explosion (lava armour)
function ring(g, x, y, r, fx) { g.fx(fx || 'fnova', x, y, { scale: Math.max(.8, r / 60) }); }
const procHit = (g, box, dmg, o) => g.hit(box, dmg, Object.assign({ id: newSwing(), from: g.player, proc: true, kb: 3, dir: 0, at: g.player.cx }, o || {}));
function chain(g, from, n, dmg) {
  let src = from; const hit = new Set([from]);
  for (let k = 0; k < n; k++) {
    let best = null, bd = 170;
    for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = Math.hypot(e.cx - src.cx, e.y - src.y); if (d < bd) { bd = d; best = e; } }
    if (!best) break; hit.add(best); bolt(g, src.cx, src.y + src.h / 2, best.cx, best.y + best.h / 2);
    if (g.mods.firestorm && best.burnT > 0) { procHit(g, { x: best.cx - 60, y: best.y + best.h / 2 - 50, w: 120, h: 100 }, 8, { at: best.cx }); g.fx('wexp', best.cx, best.y + best.h / 2, { scale: 1.3 }); }
    best.takeHit(dmg, { id: -1, dir: 0 }); src = best;
  }
  if (hit.size > 1) sfx().clang();
}
// after a player blow landed on e (dd = damage dealt) — burn / chain lightning
M.onHit = (g, e, o) => {
  const m = g.mods; if (!m || o.proc || e.dead && !m.bloodmoon) return;
  const p = g.player;
  if (m.burn) { e.burnT = 180; e.burnLv = m.burn; }
  if (m.shock) { p.shockN = (p.shockN || 0) + 1; if (p.shockN % 4 === 0) chain(g, e, m.shock + 1, 3 + 2 * m.shock); }
};
// extra damage multiplier for a player blow (talents / boons): crit, execute, swift blade
M.dmgMul = (g, e, p) => {
  const m = g.mods || {}; let k = 1 + (m.dmg || 0), crit = false;
  if (m.execute && e.hp < e.maxHp * .25) k *= 1.5;
  if (m.swiftblade && p.runT >= PLAT.C.RUN_AFTER) k *= 1.4;
  if (m.crit && Math.random() < m.crit) { k *= 2; crit = true; }
  return { k, crit };
};
M.onParry = (g, p, perfect) => {
  const m = g.mods; if (!m) return;
  const wave = (r, dmg, col) => { procHit(g, { x: p.cx - r, y: p.y + p.h / 2 - r * .6, w: r * 2, h: r * 1.2 }, dmg, { kb: 6, heavy: true }); ring(g, p.cx, p.y + p.h / 2, r, col); g.shake(3); };
  if (m.pwave) wave(70 + 15 * m.pwave, 2 + 3 * m.pwave, 'fnova');
  if (m.counterWave && perfect) { wave(110, 8, 'shrap'); g.text(p.cx, p.y - 24, 'สวนกลับ!', '#ffd84a', 40); }
  if (m.stormparry) for (const e of g.enemies) if (!e.dead && Math.hypot(e.cx - p.cx, e.y - p.y) < 200) { bolt(g, p.cx, p.y, e.cx, e.y + e.h / 2); e.takeHit(6, { id: -1, dir: 0 }); }
};
M.onKill = (g, e) => {
  const m = g.mods, p = g.player; if (!m || !p || p.dead) return;
  if (m.leech) { const hv = m.leech * (m.bloodmoon && e.burnT > 0 ? 3 : 1); if (p.hp < p.maxHp) { p.heal(hv); g.text(p.cx, p.y - 18, '+' + hv, '#ff8aa8', 26); if (!(g.frame - (p._healFx || -99) < 40)) { p._healFx = g.frame; g.fx('heal', p.cx, p.y + p.h / 2, { scale: .7, follow: () => ({ x: p.cx, y: p.y + p.h / 2 }) }); } } }
  if (m.bloodmoon && e.burnT > 0) { procHit(g, { x: e.cx - 55, y: e.y + e.h / 2 - 45, w: 110, h: 90 }, 6, { at: e.cx }); g.fx('wexp', e.cx, e.y + e.h / 2, { scale: 1.1 }); }
};
// the player got hurt by `src` (an enemy) — thorns / lava armour
M.onHurt = (g, p, src) => {
  const m = g.mods; if (!m) return;
  if (m.thorns && src && src.takeHit && !src.dead) { src.takeHit(m.thorns, { id: -1, dir: U.sign(src.cx - p.cx) }); g.burst(src.cx, src.y + src.h / 2, '#8ad06a', 6, 2); }
  if (m.lavaarmor) { procHit(g, { x: p.cx - 70, y: p.y - 30, w: 140, h: p.h + 50 }, 6, { kb: 5 }); g.fx('wexp', p.cx, p.y + p.h / 2, { scale: 1.6 }); }
};
// every frame: burning enemies, fire trails
M.step = g => {
  const m = g.mods; if (!m) return;
  for (const e of g.enemies) {
    if (!(e.burnT > 0) || e.dead || e.gone) { if (e.burnFx) { e.burnFx.dead = true; e.burnFx = null; } continue; }
    e.burnT--;
    if (!e.burnFx || e.burnFx.dead) { const sc = U.clamp(e.h / 44, .6, 1.6); e.burnFx = g.fx('fire', e.cx, e.y, { loop: true, scale: sc, alpha: .9, follow: () => ({ x: e.cx, y: e.y + e.h - 31 * .6 * sc }) }); }
    if (e.burnT <= 0) { e.burnFx.dead = true; e.burnFx = null; }
    if (e.burnT % 30 === 0) { e.takeHit((e.burnLv || 1) + 1, { id: -1, dir: 0 }); }
  }
  const p = g.player;
  if (m.dfire && p && !p.dead) {
    const dashing = p.act && /^(dash|roll|rocket|homing|spindash|bash)$/.test(p.act.kind);
    if (dashing && g.frame % 5 === 0 && p.onGround) { const f = { x: p.cx, y: p.feet, t: (m.lavaarmor ? 240 : 120), id: newSwing() }; f.fx = g.fxGround('fire', f.x, f.y, { loop: true, scale: .55 }); (g.fires || (g.fires = [])).push(f); }
  }
  if (g.fires && g.fires.length) {
    for (const f of g.fires) {
      f.t--; if (f.fx) { f.fx.alpha = Math.min(1, f.t / 30); if (f.t <= 0) f.fx.dead = true; }
      if (g.frame % 15 === 0) procHit(g, { x: f.x - 16, y: f.y - 30, w: 32, h: 30 }, (m.dfire || 1) * 2, { id: newSwing(), kb: 0 });
    }
    g.fires = g.fires.filter(f => f.t > 0); if (g.fires.length > 60) g.fires.splice(0, g.fires.length - 60).forEach(f => { if (f.fx) f.fx.dead = true; });
  }
};

/* ------------------------------------------------------------------ assist */
M.assist = () => M.d().assist;
M.assistOn = () => { const a = M.assist(); return a.speed < 1 || a.dmg < 1; };

/* ------------------------------------------------------------------ boss rush */
M.RUSH = ['1-3', '2-3', '3-3', '4-4', '5-2', '5-4', '6-2'];
M.grade = (hits, frames, par) => hits === 0 ? 'S' : hits <= 2 ? 'A' : hits <= 5 ? 'B' : 'C';
M.medal = (id, grade, frames) => {
  const md = M.d().medals, r = md[id] || (md[id] = {}), GV = { S: 4, A: 3, B: 2, C: 1 };
  if (!r.grade || GV[grade] > GV[r.grade]) r.grade = grade;
  if (!r.time || frames < r.time) r.time = frames;
  save(); return r;
};
})(typeof window !== 'undefined' ? window : globalThis);
