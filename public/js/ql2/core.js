/* ==========================================================================
   QUEST LINES 2.0 — CORE (world data · save v3 · progression · battle hooks)
   --------------------------------------------------------------------------
   Loaded after the main game script in index.html. The battle system is NOT
   rewritten: everything here wraps existing functions (addMastery, enemyDies,
   stageClear, pzFinish, startStage, startTower …) and only *records* what
   happened so the new World / Quest / Codex / Profile layers can use it.
   Old saves are migrated in place (save.v2 block) — nothing is removed.
   ========================================================================== */

const QL2 = { ver:'2.0', notes:[], bus:[] };

/* ------------------------------ world ------------------------------ */
// one location per chapter (same order / ids as CHAPTERS)
const LOCS = [
  { id:'crypt', name:'Forgotten Cemetery', th:'สุสานที่ถูกลืม', col:'#c98a3a', mat:'bone', gem:'moonGem',
    blurb:'สุสานใต้ดินที่ทองต้องสาปยังส่งเสียงกระทบกันในความมืด จุดเริ่มต้นของทุกการผจญภัย' },
  { id:'woods', name:'Star Meadow', th:'ทุ่งดาวเขียวขจี', col:'#3fae4a', mat:'starmoss', gem:'starGem',
    blurb:'ทุ่งหญ้าใต้ท้องฟ้าเต็มดาว ต้นไม้เฒ่าเฝ้าประตูโบราณของอาณาจักรที่สาบสูญ' },
  { id:'ice', name:'Frozen Caverns', th:'ถ้ำน้ำแข็ง', col:'#4f9fe0', mat:'frost', gem:'frostGem',
    blurb:'ภูเขาหิมะและถ้ำคริสตัลที่หนาวจนคำพูดกลายเป็นน้ำแข็ง ไททันหลับใหลอยู่ใต้ธารน้ำแข็ง' },
  { id:'lava', name:'Flame Fortress', th:'ป้อมเปลวเพลิง', col:'#e0502e', mat:'ember', gem:'fireGem',
    blurb:'ป้อมปราการที่ไม่เคยดับไฟ มังกรเพลิงนอนเฝ้าคลังอาวุธของกองทัพเงา' },
  { id:'necro', name:"Necromancer's Grave", th:'สุสานจอมเวทมรณะ', col:'#8a5ad0', mat:'soul', gem:'soulGem',
    blurb:'บ้านร้างใต้แสงจันทร์สีเขียว ที่ซึ่งจอมเวทมรณะปลุกคนตายด้วยคำสาปที่ไม่มีใครสะกดได้' },
];
// the new location names show everywhere (battle banners, reward screens …)
CHAPTERS.forEach((C,i)=>{ const L = LOCS[i]; if(L){ C.name = L.name; C.th = L.th; } });
const HUB_NAME = { name:'Moonlit Haven', th:'ฐานแสงจันทร์' };

/* ------------------------------ materials ------------------------------ */
const MATS = {
  bone:     { name:'Bone Dust',  th:'ผงกระดูก',     kind:'dust',  col:'#e8dcc0', col2:'#9a8a70', sell:6,  rar:1, from:0 },
  starmoss: { name:'Star Moss',  th:'ตะไคร่ดาว',    kind:'leaf',  col:'#6fe07a', col2:'#2f8a3a', sell:8,  rar:1, from:1 },
  frost:    { name:'Frost Shard',th:'เศษน้ำแข็ง',   kind:'shard', col:'#bff4ff', col2:'#4f9fe0', sell:10, rar:1, from:2 },
  ember:    { name:'Ember Core', th:'แกนถ่านไฟ',    kind:'core',  col:'#ffb347', col2:'#d0381e', sell:12, rar:1, from:3 },
  soul:     { name:'Soul Wisp',  th:'ดวงวิญญาณ',    kind:'wisp',  col:'#b8ffb0', col2:'#5a3a9a', sell:14, rar:1, from:4 },
  moonGem:  { name:'Moon Gem',   th:'อัญมณีจันทรา', kind:'gem',   col:'#eaf6ff', col2:'#7fb4f2', sell:60, rar:2, from:0 },
  starGem:  { name:'Star Gem',   th:'อัญมณีดวงดาว', kind:'gem',   col:'#fff3a0', col2:'#e0a020', sell:80, rar:2, from:1 },
  frostGem: { name:'Frost Gem',  th:'อัญมณีน้ำแข็ง',kind:'gem',   col:'#9ff0ff', col2:'#2f7fd0', sell:100,rar:2, from:2 },
  fireGem:  { name:'Fire Gem',   th:'อัญมณีเพลิง',  kind:'gem',   col:'#ff8a5a', col2:'#c0201e', sell:120,rar:2, from:3 },
  soulGem:  { name:'Soul Gem',   th:'อัญมณีวิญญาณ', kind:'gem',   col:'#d8a8ff', col2:'#6a2ab0', sell:150,rar:2, from:4 },
};
function matIcon(id, cls){
  const M = MATS[id] || MATS.bone, a = M.col, b = M.col2, o = '#07060d';
  const sh = {
    dust: `<path d="M6,32 Q8,20 20,18 Q32,20 34,32 Z" fill="${a}" stroke="${o}" stroke-width="2"/><circle cx="14" cy="14" r="3" fill="${a}" stroke="${o}" stroke-width="1.5"/><circle cx="25" cy="11" r="2.4" fill="${b}"/><path d="M12,28 Q20,24 28,28" stroke="${b}" stroke-width="2" fill="none"/>`,
    leaf: `<path d="M8,32 Q6,10 32,6 Q34,30 8,32 Z" fill="${a}" stroke="${o}" stroke-width="2"/><path d="M9,31 Q18,20 30,8" stroke="${b}" stroke-width="2" fill="none"/><path d="M30,26 l2,-5 l2,5 l-2,3 Z" fill="#fff3a0"/>`,
    shard:`<path d="M20,3 L30,16 L24,37 L12,30 L9,14 Z" fill="${a}" stroke="${o}" stroke-width="2" stroke-linejoin="round"/><path d="M20,3 L18,20 L24,37 M9,14 L18,20 L30,16" stroke="${b}" stroke-width="1.6" fill="none"/>`,
    core: `<circle cx="20" cy="22" r="12" fill="${b}" stroke="${o}" stroke-width="2"/><circle cx="17" cy="19" r="5" fill="${a}"/><path d="M14,12 Q16,4 20,2 Q19,8 24,10 Q26,5 28,8" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    wisp: `<path d="M20,36 Q8,34 9,22 Q10,12 20,4 Q17,14 24,14 Q32,18 31,26 Q30,35 20,36 Z" fill="${a}" stroke="${o}" stroke-width="2"/><circle cx="17" cy="24" r="2" fill="${b}"/><circle cx="24" cy="24" r="2" fill="${b}"/>`,
    gem:  `<path d="M8,15 L14,6 L26,6 L32,15 L20,35 Z" fill="${a}" stroke="${o}" stroke-width="2" stroke-linejoin="round"/><path d="M8,15 L32,15 M14,6 L17,15 L20,35 L23,15 L26,6" stroke="${b}" stroke-width="1.5" fill="none"/><path d="M13,11 L16,8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  }[M.kind];
  return `<svg viewBox="0 0 40 40" class="ico mat ${cls||''}" aria-hidden="true">${sh}</svg>`;
}

/* ------------------------------ titles · frames · hub effects ------------------------------ */
const TITLES = {
  rookie:   { th:'ผู้กล้ามือใหม่',          r:1 },
  wanderer: { th:'นักเดินทางใต้แสงจันทร์',  r:1 },
  spellblade:{th:'นักดาบแห่งอักษร',          r:2 },
  lorekeeper:{th:'ผู้พิทักษ์ตำนาน',          r:2 },
  wordsage: { th:'ปราชญ์แห่งถ้อยคำ',        r:3 },
  moonlord: { th:'เจ้าแห่งแสงจันทร์',        r:4 },
  dawn:     { th:'ผู้นำรุ่งอรุณ',            r:4 },
  towerlord:{ th:'ผู้พิชิตหอคอย',           r:4 },
  elemental:{ th:'จอมเวทธาตุ',             r:3 },
  wordmaster:{th:'Word Master',            r:3 },
  collector:{ th:'นักสะสมนักสู้',            r:3 },
  perfect:  { th:'ผู้สมบูรณ์แบบ',            r:4 },
  rude:     { th:'ปากร้ายแต่ใจดี',          r:2 },
  scholar:  { th:'นักไขปริศนา',            r:2 },
  combo:    { th:'จังหวะสายฟ้า',            r:3 },
};
const FRAMES = {
  basic:  { th:'หินจันทร์',   css:'fr-basic' },
  crimson:{ th:'ทับทิมแดง',   css:'fr-crimson' },
  gold:   { th:'ทองคำ',      css:'fr-gold' },
  moon:   { th:'เสี้ยวจันทร์', css:'fr-moon' },
  void:   { th:'ความว่างเปล่า', css:'fr-void' },
};
const HUBFX = {
  none:     { th:'ไม่มี' },
  fireflies:{ th:'หิ่งห้อยแสงจันทร์' },
  embers:   { th:'ประกายไฟนรก' },
  aurora:   { th:'แสงออโรรา' },
  petals:   { th:'ละอองดาว' },
};

/* ------------------------------ adventure level ------------------------------ */
const ADV = {
  cap: 50,
  need: lv=>80 + (lv-1)*45,                     // xp to go from lv → lv+1
  // extra rewards on top of the base gold every level gives
  extra: {
    2:{ potions:{ heal:2 } },
    3:{ mats:{ bone:5 } },
    4:{ potions:{ power:1 } },
    5:{ title:'wanderer', gold:150 },
    6:{ potions:{ heal:2, power:1 } },
    7:{ mats:{ starmoss:5, bone:5 } },
    8:{ weapon:'iron' },
    9:{ mats:{ moonGem:1 } },
    10:{ frame:'crimson', title:'spellblade' },
    12:{ fx:'fireflies', potions:{ heal:3 } },
    14:{ mats:{ frost:6, starGem:1 } },
    15:{ weapon:'axe', frame:'gold' },
    17:{ acc:'luckyCoin' },
    18:{ mats:{ ember:6, frostGem:1 } },
    20:{ title:'wordsage', fx:'aurora' },
    22:{ potions:{ heal:4, power:2 } },
    25:{ acc:'sage', fx:'embers' },
    28:{ mats:{ fireGem:1, soulGem:1 } },
    30:{ title:'moonlord', frame:'moon' },
    35:{ fx:'petals', weapon:'flame' },
    40:{ frame:'void' },
    45:{ potions:{ heal:5, power:5 } },
    50:{ acc:'phoenix' },
  },
  reward(lv){ return Object.assign({ gold: 40 + lv*10 }, ADV.extra[lv]||{}); },
};
function advInfo(xp){
  xp = Math.max(0, Math.floor(xp||0)); let lv = 1;
  while(lv < ADV.cap && xp >= ADV.need(lv)){ xp -= ADV.need(lv); lv++; }
  const need = lv>=ADV.cap ? 1 : ADV.need(lv);
  return { lv, into: lv>=ADV.cap ? need : xp, need, pct: lv>=ADV.cap ? 100 : Math.round(xp/need*100) };
}
// hero level (per fighter, from battles fought with them) — progression only, no combat effect
const HLV = { cap:30, need: lv=>50 + (lv-1)*30,
  ranks:[ { lv:1, th:'Novice', thTh:'ฝึกหัด' }, { lv:5, th:'Adept', thTh:'ชำนาญ' }, { lv:10, th:'Expert', thTh:'เชี่ยวชาญ' },
          { lv:15, th:'Veteran', thTh:'ทหารผ่านศึก' }, { lv:20, th:'Master', thTh:'ปรมาจารย์' }, { lv:25, th:'Grandmaster', thTh:'ตำนาน' } ] };
function heroInfo(id){
  let xp = Math.floor((save.v2.heroXp||{})[id]||0), lv = 1;
  while(lv < HLV.cap && xp >= HLV.need(lv)){ xp -= HLV.need(lv); lv++; }
  const need = lv>=HLV.cap ? 1 : HLV.need(lv);
  let rank = 0; HLV.ranks.forEach((r,i)=>{ if(lv>=r.lv) rank = i; });
  return { lv, into: lv>=HLV.cap ? need : xp, need, pct: lv>=HLV.cap ? 100 : Math.round(xp/need*100), rank, R:HLV.ranks[rank] };
}

/* ------------------------------ save v3 ------------------------------ */
const BASE_ELEMS = ['fire','ice','thunder','water','poison','wind','earth','holy','shadow'];
function ql2Defaults(){
  return {
    ver:1,
    adv:{ xp:0, claimed:1 },                         // claimed = highest level whose reward was collected
    heroXp:{},
    stats:{ battles:0, clears:0, puzzles:0, perfect:0, minis:0, floors:0, long6:0, bankWords:0, mats:0, rude:0, quests:0, wins:0 },
    kills:{}, chKills:[0,0,0,0,0], elem:{}, gods:{},
    seen:{ mon:{}, el:{} },
    mats:{},
    q:{ claimed:{}, done:{}, track:null },
    daily:{ date:'', slots:[], rerolls:0, bonus:false },
    today:{ date:'', combo:0 },
    titles:{ own:['rookie'], eq:'rookie' },
    frames:{ own:['basic'], eq:'basic' },
    fx:{ own:['none'], eq:'none' },
    trophyClaimed:{},
  };
}
function mergeDeep(base, extra){
  if(!extra || typeof extra!=='object') return base;
  Object.keys(extra).forEach(k=>{
    const v = extra[k];
    if(v && typeof v==='object' && !Array.isArray(v) && base[k] && typeof base[k]==='object' && !Array.isArray(base[k])) base[k] = mergeDeep(base[k], v);
    else base[k] = v;
  });
  return base;
}
// rebuild what an existing player has already done from data that was always saved
function ql2Retro(s){
  const V = s.v2;
  const cleared = Math.min(s.cleared||0, CHAPTERS.length*STAGES_PER);
  for(let i=0;i<cleared;i++){
    const ch = Math.floor(i/STAGES_PER), n = i%STAGES_PER + 1;
    try{
      buildStage(ch, n).enemies.forEach(e=>{
        V.kills[e.key] = (V.kills[e.key]||0) + 1; V.chKills[ch] = (V.chKills[ch]||0) + 1; V.seen.mon[e.key] = 1;
        if(e.mini) V.stats.minis++;
      });
    }catch(e){}
  }
  V.stats.clears = cleared; V.stats.wins = cleared;
  V.stats.battles = cleared + ((s.tower && s.tower.runs) || 0);
  V.stats.floors = (s.tower && s.tower.best) || 0;
  // elements + long words from word mastery / word book
  Object.entries(s.mastery||{}).forEach(([w,d])=>{
    const n = (d && d.n) || 0; if(!n) return;
    let el = null; try{ el = elementOf(w); }catch(e){}
    if(el && ELEMENTS[el] && ELEMENTS[el].god) el = ELEMENTS[el].base;
    if(el && BASE_ELEMS.includes(el)){ V.elem[el] = (V.elem[el]||0) + n; V.seen.el[el] = 1; }
    if(w.length>=6) V.stats.long6 += n;
  });
  Object.values(s.book||{}).forEach(b=>{ if(b && b.bank) V.stats.bankWords += (b.n||1); if(b && b.pz) V.stats.puzzles++; });
  // adventure xp for everything done before 2.0
  const st = s.stats||{};
  V.adv.xp = Math.round((st.words||0)*3 + (st.kills||0)*6 + (st.bosses||0)*40 + cleared*25 + Object.keys(s.achievements||{}).length*40);
  const heroId = (s.eq && s.eq.char) || 'pip';
  V.heroXp[heroId] = Math.round((st.words||0)*2 + (st.kills||0)*4);
}
function migrateV2(s){
  if(!s || typeof s!=='object') return s;
  const fresh = !s.v2 || typeof s.v2!=='object';
  s.v2 = mergeDeep(ql2Defaults(), fresh ? {} : s.v2);
  if(!Array.isArray(s.v2.chKills)) s.v2.chKills = [0,0,0,0,0];
  while(s.v2.chKills.length < CHAPTERS.length) s.v2.chKills.push(0);
  if(!s.tower || typeof s.tower!=='object') s.tower = { best:0, runs:0 };
  if(!s.settings) s.settings = {};
  ['anim','haptic'].forEach(k=>{ if(s.settings[k]===undefined) s.settings[k] = true; });
  if(s.settings.fullscreen===undefined) s.settings.fullscreen = false;
  if(fresh) ql2Retro(s);
  if(!TITLES[s.v2.titles.eq]) s.v2.titles.eq = 'rookie';
  if(!FRAMES[s.v2.frames.eq]) s.v2.frames.eq = 'basic';
  s.v = Math.max(s.v||2, 3);
  return s;
}
// every future load / import / reset gets the 2.0 block too
loadSave = (f=>function(){ return migrateV2(f()); })(loadSave);
defaultSave = (f=>function(){ const d = f(); d.tower = { best:0, runs:0 }; return migrateV2(d); })(defaultSave);
migrateV2(save); persist();

/* ------------------------------ helpers ------------------------------ */
const V2 = ()=>save.v2;
const todayKey = ()=>{ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const inBattle = ()=>ui.screen==='battle' && !!ui.bat;
const fmt = n=>Math.round(n||0).toLocaleString('en-US');
function heroName(id){ const c = CHARACTERS.find(x=>x.id===id); return c ? c.name : id; }
function chapterOfStage(s){ return Math.min(CHAPTERS.length-1, Math.floor(s/STAGES_PER)); }
function nextStage(){ // the stage the player should play next
  const total = CHAPTERS.length*STAGES_PER, s = Math.min(save.cleared, total-1);
  return { s, ch:Math.floor(s/STAGES_PER), n:s%STAGES_PER+1, done: save.cleared>=total };
}
function chapterOpen(ci){ return stageIndex(ci,1) <= save.cleared; }
function chapterDone(ci){ return stageIndex(ci,STAGES_PER) < save.cleared; }
function chapterCleared(ci){ let n=0; for(let i=1;i<=STAGES_PER;i++) if(stageIndex(ci,i) < save.cleared) n++; return n; }
function chapterStars(ci){ let n=0; for(let i=1;i<=STAGES_PER;i++) n += save.stars[stageIndex(ci,i)]||0; return n; }
function starsTotal(){ return Object.values(save.stars||{}).reduce((a,b)=>a+(b||0),0); }

/* ------------------------------ rewards ------------------------------ */
// gives a reward object and returns pill html describing it
function grant(R){
  if(!R) return '';
  const V = V2(), out = [];
  if(R.gold){ save.gold += R.gold; out.push(`<span class="pill">${ICON.coin}+${fmt(R.gold)}</span>`); }
  if(R.xp){ addXp(R.xp, false); out.push(`<span class="pill xp">EXP +${fmt(R.xp)}</span>`); }
  Object.entries(R.potions||{}).forEach(([k,n])=>{ save.potions[k] = (save.potions[k]||0) + n; out.push(`<span class="pill">${ICON[POTIONS[k].icon]}+${n}</span>`); });
  Object.entries(R.mats||{}).forEach(([k,n])=>{ addMat(k, n, true); out.push(`<span class="pill">${matIcon(k)}+${n}</span>`); });
  if(R.weapon){ if(save.weapons.includes(R.weapon)){ const g = Math.round(W(R.weapon).price*.5); save.gold += g; out.push(`<span class="pill">${ICON.coin}+${g}</span>`); } else { save.weapons.push(R.weapon); out.push(`<span class="pill">${ICON.sword} ${esc(W(R.weapon).th)}</span>`); } }
  if(R.acc){ if(save.accs.includes(R.acc)){ const g = Math.round(ACC(R.acc).price*.5); save.gold += g; out.push(`<span class="pill">${ICON.coin}+${g}</span>`); } else { save.accs.push(R.acc); out.push(`<span class="pill">${ACC_ART[R.acc]} ${esc(ACC(R.acc).th)}</span>`); } }
  if(R.title && !V.titles.own.includes(R.title)){ V.titles.own.push(R.title); out.push(`<span class="pill title">🎖 ${esc(TITLES[R.title].th)}</span>`); }
  if(R.frame && !V.frames.own.includes(R.frame)){ V.frames.own.push(R.frame); out.push(`<span class="pill">🖼 กรอบ${esc(FRAMES[R.frame].th)}</span>`); }
  if(R.fx && !V.fx.own.includes(R.fx)){ V.fx.own.push(R.fx); out.push(`<span class="pill">✨ ${esc(HUBFX[R.fx].th)}</span>`); }
  persist();
  return out.join('');
}
function rewardPreview(R){
  if(!R) return '';
  const p = [];
  if(R.gold) p.push(`<span class="rw">${ICON.coin}${fmt(R.gold)}</span>`);
  if(R.xp) p.push(`<span class="rw xp">EXP ${fmt(R.xp)}</span>`);
  Object.entries(R.potions||{}).forEach(([k,n])=>p.push(`<span class="rw">${ICON[POTIONS[k].icon]}×${n}</span>`));
  Object.entries(R.mats||{}).forEach(([k,n])=>p.push(`<span class="rw" title="${esc(MATS[k].th)}">${matIcon(k)}×${n}</span>`));
  if(R.weapon) p.push(save.weapons.includes(R.weapon) ? `<span class="rw" title="มี ${esc(W(R.weapon).th)} แล้ว">${ICON.coin}${fmt(Math.round(W(R.weapon).price*.5))}</span>` : `<span class="rw">${ICON.sword}${esc(W(R.weapon).th)}</span>`);
  if(R.acc) p.push(save.accs.includes(R.acc) ? `<span class="rw" title="มี ${esc(ACC(R.acc).th)} แล้ว">${ICON.coin}${fmt(Math.round(ACC(R.acc).price*.5))}</span>` : `<span class="rw">${ACC_ART[R.acc]}${esc(ACC(R.acc).th)}</span>`);
  if(R.title) p.push(`<span class="rw title">🎖 ${esc(TITLES[R.title].th)}</span>`);
  if(R.frame) p.push(`<span class="rw">🖼 ${esc(FRAMES[R.frame].th)}</span>`);
  if(R.fx) p.push(`<span class="rw">✨ ${esc(HUBFX[R.fx].th)}</span>`);
  return p.join('');
}

/* ------------------------------ xp / materials ------------------------------ */
function addXp(n, heroToo){
  if(!n) return;
  const V = V2(), before = advInfo(V.adv.xp).lv;
  V.adv.xp += n;
  if(heroToo!==false){ const id = save.eq.char; const hb = heroInfo(id).lv; V.heroXp[id] = (V.heroXp[id]||0) + n; const ha = heroInfo(id).lv;
    if(ha>hb) note('hero', `⚔️ ${esc(heroName(id))} เลเวล ${ha}!`); }
  const after = advInfo(V.adv.xp).lv;
  if(after>before){ note('level', `⭐ Adventure Level ${after}!`, after); }
  if(inBattle()) ui.bat.v2xp = (ui.bat.v2xp||0) + n;
}
function addMat(k, n, silent){
  if(!MATS[k] || !n) return;
  const V = V2(); V.mats[k] = (V.mats[k]||0) + n; V.stats.mats += n;
  if(inBattle()){ const b = ui.bat; b.v2mats = b.v2mats||{}; b.v2mats[k] = (b.v2mats[k]||0) + n; }
}
function advUnclaimed(){ const V = V2(), lv = advInfo(V.adv.xp).lv; return Math.max(0, lv - Math.max(1, V.adv.claimed)); }
function claimAdv(){
  const V = V2(), lv = advInfo(V.adv.xp).lv; let html = '';
  for(let L = Math.max(1,V.adv.claimed)+1; L<=lv; L++){ html += grant(ADV.reward(L)); V.adv.claimed = L; }
  persist(); return html;
}

/* ------------------------------ notifications ------------------------------ */
// outside battle → toast right away; inside battle → shown on the reward screen
function note(kind, html, extra){
  QL2.notes.push({ kind, html, extra, t:Date.now() });
  if(!inBattle()){ flushNotes(); }
}
function flushNotes(){
  const n = QL2.notes.splice(0);
  n.forEach((x,i)=>setTimeout(()=>toast(x.html), i*450));
  if(n.some(x=>x.kind==='level')) setTimeout(()=>{ if(typeof refreshChrome==='function') refreshChrome(); }, 60);
}
function takeNotes(){ return QL2.notes.splice(0); }

/* ------------------------------ event bus ------------------------------ */
let _scanT = null;
function bump(){ clearTimeout(_scanT); _scanT = setTimeout(()=>{ try{ QL2.bus.forEach(f=>f()); }catch(e){ console.error(e); } }, 250); }
function today(){ const V = V2(), k = todayKey(); if(V.today.date!==k){ V.today = { date:k, combo:0 }; } return V.today; }

/* ------------------------------ battle hooks (record only) ------------------------------ */
// every successfully spelled (non-rude) word passes through addMastery exactly once
addMastery = (f=>function(w){
  const r = f(w);
  try{
    if(w && !RUDE.has(w)){
      const V = V2(), d = save.mastery[w];
      const combo = ui.bat ? (ui.bat.combo||0) + 1 : 0;
      if(d){ d.bc = Math.max(d.bc||0, combo); }
      let el = null; try{ el = elementOf(w); }catch(e){}
      if(el && ELEMENTS[el] && ELEMENTS[el].god){ V.gods[el] = (V.gods[el]||0) + 1; el = ELEMENTS[el].base; }
      if(el && BASE_ELEMS.includes(el)){ V.elem[el] = (V.elem[el]||0) + 1; if(!V.seen.el[el]){ V.seen.el[el] = 1; note('codex', `📖 Codex: ค้นพบธาตุ ${ELEM_ICON[el]} ${ELEMENTS[el].name}`); } if(d) d.el = el; }
      if(w.length>=6) V.stats.long6++;
      let bank = false; try{ bank = VocabularyManager.isTargetWord(w); }catch(e){}
      if(bank) V.stats.bankWords++;
      const t = today(); t.combo = Math.max(t.combo, combo);
      addXp(2 + Math.max(0, w.length-4));
      bump();
    }
  }catch(e){ console.error(e); }
  return r;
})(addMastery);

// rude words are allowed (x2 but hurt you) — counted for a secret trophy
speakRude = (f=>function(){ try{ V2().stats.rude++; bump(); }catch(e){} return f.apply(this, arguments); })(speakRude);

// kills: bestiary, per-location counts, material drops, xp
enemyDies = (f=>async function(){
  const b = ui.bat, e = b && curEnemy();
  if(b && e && !e._v2){
    e._v2 = true;
    try{
      const V = V2(), ch = b.stage.tower ? TOWER.chapterOf(TOWER.floor(b)) : b.stage.ch;
      const first = !V.seen.mon[e.key];
      V.kills[e.key] = (V.kills[e.key]||0) + 1; V.seen.mon[e.key] = 1;
      if(!b.stage.tower) V.chKills[ch] = (V.chKills[ch]||0) + 1;
      if(e.mini) V.stats.minis++;
      if(b.stage.tower) V.stats.floors++;
      if(first) note('codex', `📖 Codex: บันทึกมอนสเตอร์ใหม่ ${esc(MON[e.key] ? MON[e.key].name : e.name)}`);
      // drops
      const L = LOCS[ch] || LOCS[0];
      let n = 0;
      if(e.boss) n = 3; else if(e.mini) n = 2; else if(Math.random() < (b.stage.tower ? .3 : .4)) n = 1;
      if(e.golden) n += 2;
      if(n){ addMat(L.mat, n); setTimeout(()=>{ if(ui.bat===b) floatText(`+${n}`, EN_X+40, FLOOR_Y-e.h*e.sc-8, MATS[L.mat].col, 22); }, 380); }
      if(e.boss){ addMat(L.gem, 1); }
      addXp(e.boss ? 60 : e.mini ? 20 : 6);
      bump();
    }catch(err){ console.error(err); }
  }
  return f.apply(this, arguments);
})(enemyDies);

pzFinish = (f=>function(ok){
  try{ const z = ui.pz, V = V2(); if(ok){ V.stats.puzzles++; if(z && z.miss===0) V.stats.perfect++; addXp(10); } bump(); }catch(e){}
  return f.apply(this, arguments);
})(pzFinish);

startStage = (f=>function(ch, n){
  try{ V2().stats.battles++; QL2.notes.length = 0; persist(); }catch(e){}
  const r = f.apply(this, arguments);
  try{ if(ui.bat) Object.assign(ui.bat, { v2xp:0, v2mats:{}, v2first: stageIndex(ch,n)===save.cleared }); }catch(e){}
  return r;
})(startStage);
startTower = (f=>function(){
  try{ V2().stats.battles++; QL2.notes.length = 0; persist(); }catch(e){}
  const r = f.apply(this, arguments);
  try{ if(ui.bat) Object.assign(ui.bat, { v2xp:0, v2mats:{} }); }catch(e){}
  return r;
})(startTower);

// stage clear / defeat: record, then let the 2.0 shell dress up the result screen
stageClear = (f=>async function(){
  const b = ui.bat;
  try{ if(b && !b.stage.tower){ const V = V2(); V.stats.clears++; V.stats.wins++; addXp(20 + b.stage.ch*5 + (b.v2first ? 25 : 0)); bump(); } }catch(e){ console.error(e); }
  await f.apply(this, arguments);
  try{ if(QL2.afterBattle) QL2.afterBattle('clear', b); }catch(e){ console.error(e); }
})(stageClear);
heroDies = (f=>async function(){
  const b = ui.bat;
  await f.apply(this, arguments);
  try{ if(QL2.afterBattle && b) QL2.afterBattle(b.stage.tower ? 'tower' : 'lose', b); }catch(e){ console.error(e); }
})(heroDies);
