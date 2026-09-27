/* ==========================================================================
   QUEST LINES — ENDGAME & MASTERY · MODES
   Nightmare · Endless Challenge · Speedrun · Perfect Run · Challenge Creator ·
   Daily / Weekly Challenge · True Final Boss · Master Rank · Word Mastery tiers ·
   Trophy categories. All of it reuses the existing stages, monsters and battle.
   ========================================================================== */

/* ------------------------------ NIGHTMARE ------------------------------ */
function nmRules(ch){
  return { hp:.6, dmg:.35, enrage:true, hard:true, time:ch>=3 ? 25 : 30, potionLimit:1, ultLimit:1, bossP3:true, fast:ch>=2 };
}
const nmKey = (ch,n)=>stageIndex(ch,n);
const nmCleared = (ch,n)=>!!(EGS().nm[nmKey(ch,n)] && EGS().nm[nmKey(ch,n)].clear);
function nmChapterOpen(ch){ return storyDone() && (ch===0 || nmCleared(ch-1, STAGES_PER)); }
function nmStageOpen(ch,n){ return nmChapterOpen(ch) && (n===1 || nmCleared(ch, n-1)); }
function nmCount(){ return Object.values(EGS().nm).filter(x=>x && x.clear).length; }
function nmBosses(){ return CHAPTERS.filter((_,ci)=>nmCleared(ci, STAGES_PER)).length; }
function startNightmare(ch, n){ egStart({ type:'nightmare', ch, n, rules:nmRules(ch), key:'nm'+nmKey(ch,n) }, `<small>🌙 NIGHTMARE</small>${esc(LOCS[ch].name)} ${ch+1}-${n}`); }

/* ------------------------------ ENDLESS (tower) ------------------------------ */
// floor modifiers change enemy stats as they are generated; 25 / 50 / 100 are special bosses
TOWER.enemy = (f=>function(fl, seed){
  let e;
  if(fl%25===0 && fl%10!==0){ const ci = TOWER.chapterOf(fl), C = CHAPTERS[ci], rng = mulberry(hashStr('tower'+seed+'|'+fl)); e = makeEnemy(C.boss, Math.min(39, Math.round(fl*.9)), rng, true); e.floor = fl; const over = Math.max(0, fl-40); e.hp = e.maxHp = Math.round(e.maxHp*(1+over*.07)); e.atk = Math.round(e.atk*(1+over*.045)); }
  else e = f(fl, seed);
  const R = towerRules(seed, fl);
  if(R.hp){ e.hp = e.maxHp = Math.round(e.maxHp*(1+R.hp)); }
  if(R.dmg){ e.atk = Math.round(e.atk*(1+R.dmg)); }
  if(fl%100===0){ e.hp = e.maxHp = Math.round(e.maxHp*2); e.atk = Math.round(e.atk*1.3); e.name = 'Nightmare '+e.name.replace(/^Golden /,''); e.th = 'ฝันร้าย '+e.th; e.egTier = 'nightmare'; }
  else if(fl%50===0){ e.hp = e.maxHp = Math.round(e.maxHp*1.6); e.name = 'Elite '+e.name; e.th = 'ยอดฝีมือ '+e.th; e.egTier = 'elite'; }
  else if(fl%25===0){ e.hp = e.maxHp = Math.round(e.maxHp*1.25); e.egTier = 'boss'; }
  return e;
})(TOWER.enemy);
walkToNext = (f=>async function(){
  const r = await f.apply(this, arguments), b = ui.bat;
  try{ if(b && b.stage && b.stage.tower){ const fl = TOWER.floor(b); b.egTR = null; egHud(b);
    const R = rulesOf(b), ft = fl%10===1 && fl>10;
    if(ft && Object.keys(R).length) setTimeout(()=>{ if(ui.bat===b) banner(`ชั้น ${fl}`, Object.keys(MODS).filter(k=>R[k]).map(k=>MODS[k].en).join(' · ')||'', 'mini'); }, 200);
    const e = curEnemy(); if(e && e.egTier && e.egTier!=='boss'){ banner(e.egTier==='nightmare'?'NIGHTMARE BOSS':'ELITE BOSS', e.th); shake(true); }
  } }catch(e){ console.error(e); }
  return r;
})(walkToNext);

/* ------------------------------ PERFECT RUN ------------------------------ */
const PERFECT = [
  null,
  { k:'Perfect',   th:'ชนะโดยไม่ใช้ยาและไม่สลับตัวอักษร' },
  { k:'Perfect+',  th:'+ รับดาเมจไม่เกิน 35% และไม่ใช้ Ultimate' },
  { k:'Perfect++', th:'+ รับดาเมจไม่เกิน 15% และจบภายใน 2:30' },
];
function perfectTier(run, maxHp){
  if(run.potions || run.shuffles) return 0;
  const dmgPct = run.dmgTaken / Math.max(1, maxHp);
  let t = 1;
  if(dmgPct<=.35 && !run.ults) t = 2;
  if(t===2 && dmgPct<=.15 && run.t<=150000) t = 3;
  return t;
}
function startPerfect(ch, n){ egStart({ type:'perfect', ch, n, rules:{}, key:'pf'+stageIndex(ch,n) }, `<small>✨ PERFECT RUN</small>ด่าน ${ch+1}-${n}`); }
const perfectTotal = ()=>Object.values(EGS().perfect).reduce((a,t)=>a+(t||0),0);

/* ------------------------------ SPEEDRUN ------------------------------ */
const SPEED_PAR = 6*60000;                // 6:00 per chapter
function startSpeed(ch){ egStart({ type:'speed', ch, n:1, rules:{}, key:'sp'+ch }, `<small>⚡ SPEEDRUN</small>${esc(LOCS[ch].name)}`); }

/* ------------------------------ CHALLENGE CREATOR ------------------------------ */
function startCustom(ch, n, mods){ const R = rulesFromMods(mods); egStart({ type:'custom', ch, n, rules:R, mods:mods.slice().sort(), key:`cu${stageIndex(ch,n)}|${mods.slice().sort().join(',')}` }, `<small>🧩 CHALLENGE ×${modMult(R)}</small>ด่าน ${ch+1}-${n}`); }

/* ------------------------------ DAILY / WEEKLY CHALLENGE ------------------------------ */
const EG_DAILY = {
  fire:   { ic:'🔥', en:'FIRE MASTER',   th:'ปราบศัตรู 12 ตัวด้วยคำธาตุไฟ',            need:12, c:()=>EGS().cnt.killEl.fire||0 },
  ice:    { ic:'❄️', en:'FROZEN HEART',  th:'ปราบศัตรู 10 ตัวด้วยคำธาตุน้ำแข็ง',         need:10, c:()=>EGS().cnt.killEl.ice||0 },
  thunder:{ ic:'⚡', en:'STORMCALLER',   th:'ปราบศัตรู 10 ตัวด้วยคำธาตุสายฟ้า',          need:10, c:()=>EGS().cnt.killEl.thunder||0 },
  holy:   { ic:'✨', en:'LIGHTBRINGER',  th:'ปราบศัตรู 10 ตัวด้วยคำธาตุแสง',             need:10, c:()=>EGS().cnt.killEl.holy||0 },
  long:   { ic:'📏', en:'LONG BLADE',    th:'ปราบศัตรู 15 ตัวด้วยคำยาว 6 ตัวขึ้นไป',      need:15, c:()=>EGS().cnt.killLong||0 },
  boss:   { ic:'💀', en:'BOSS RUSH',     th:'ปราบบอสหรือมินิบอส 6 ตัว',                 need:6,  c:()=>EGS().cnt.killBoss||0 },
  nm:     { ic:'🌙', en:'BAD DREAMS',    th:'ผ่านด่าน Nightmare 2 ด่าน',                need:2,  c:()=>EGS().cnt.nmClears||0 },
  perfect:{ ic:'💎', en:'FLAWLESS',      th:'ผ่าน Perfect Run 2 ครั้ง',                  need:2,  c:()=>EGS().cnt.perfects||0 },
  floors: { ic:'♾️', en:'CLIMBER',       th:'ปีนหอคอยไร้สิ้นสุด 15 ชั้น',                need:15, c:()=>V2().stats.floors||0 },
  words:  { ic:'✍️', en:'WORDSTORM',     th:'สะกดคำสำเร็จ 60 คำ',                       need:60, c:()=>save.stats.words||0 },
};
const EG_DAILY_REWARD = { cc:40, mats:{ moonGem:1 } };
function egDaily(){
  const E = EGS(), k = todayKey();
  if(E.daily.date!==k){ const keys = Object.keys(EG_DAILY), id = keys[hashStr('egd'+k)%keys.length]; E.daily = { date:k, id, base:EG_DAILY[id].c(), claimed:false }; persist(); }
  const D = EGS().daily, C = EG_DAILY[D.id], cur = Math.max(0, Math.min(C.need, C.c() - D.base));
  return { D, C, cur, done:cur>=C.need };
}
const EG_WEEKLY = [
  { id:'sword',  ic:'⚔️', en:'THE SWORDSMAN',   th:'ชนะ 12 ด่าน', mods:['noUlt','hard'],         need:12, cos:{ trail:'flame' } },
  { id:'storm',  ic:'⏱️', en:'RACE THE STORM',  th:'ชนะ 12 ด่าน', mods:['time','fast'],          need:12, cos:{ victory:'fireworks' } },
  { id:'iron',   ic:'💔', en:'IRON WILL',       th:'ชนะ 10 ด่าน', mods:['noHeal','dmg'],         need:10, cos:{ aura:'ember' } },
  { id:'chaos',  ic:'🌀', en:'CHAOS SCHOLAR',   th:'ชนะ 12 ด่าน', mods:['chaos','noRepeat'],     need:12, cos:{ trail:'star' } },
  { id:'berserk',ic:'💀', en:'BERSERKER',       th:'ชนะ 10 ด่าน', mods:['enrage','comboBreak'],  need:10, cos:{ aura:'frost' } },
  { id:'titan',  ic:'❤️', en:'TITAN SLAYER',    th:'ชนะ 10 ด่าน', mods:['hp','hard'],            need:10, cos:{ victory:'confetti' } },
];
function egWeekly(){
  const E = EGS(), k = weekKey();
  if(E.weekly.week!==k){ const t = EG_WEEKLY[hashStr('egw'+k)%EG_WEEKLY.length]; E.weekly = { week:k, id:t.id, wins:0, claimed:false }; persist(); }
  const W = EGS().weekly, T = EG_WEEKLY.find(x=>x.id===W.id) || EG_WEEKLY[0];
  const owned = Object.entries(T.cos).every(([k,v])=>EGS().cos.own[k].includes(v));
  return { W, T, done:W.wins>=T.need, reward: Object.assign({ cc:150 }, owned ? { nc:150 } : T.cos) };
}
function startWeekly(){
  const { T } = egWeekly();
  const max = Math.min(save.cleared, CHAPTERS.length*STAGES_PER) - 1;
  const lo = Math.max(0, max-11), s = lo + Math.floor(Math.random()*(max-lo+1));
  const ch = Math.floor(s/STAGES_PER), n = s%STAGES_PER+1;
  egStart({ type:'weekly', ch, n, rules:rulesFromMods(T.mods), key:'wk' }, `<small>📅 ${T.en}</small>ด่าน ${ch+1}-${n}`);
}

/* ------------------------------ TRUE FINAL BOSS ------------------------------ */
MON.lexivore = { name:'Lexivore', th:'ผู้กลืนถ้อยคำ', art:'necro', pal:{ a:'#2a1a4a', b:'#07060d', c:'#ffc83d' }, sc:1.25, h:190, boss:true, traits:['armor3'], caster:true };
const TFB_REQ = [
  { th:'จบเนื้อเรื่องหลัก (40 ด่าน)',        cur:()=>Math.min(save.cleared,40), need:40 },
  { th:'ปราบบอส Nightmare ครบ 5 บท',        cur:()=>nmBosses(), need:5 },
  { th:'Master คำศัพท์ 30 คำ (Mastered+)',   cur:()=>wordTierCount(4), need:30 },
  { th:'Endless Tower ชั้น 30',             cur:()=>Math.min(EGS().endBest||0, 30), need:30 },
  { th:'ถ้วยรางวัล 25 ใบ',                    cur:()=>Object.keys(ACH).filter(k=>save.achievements[k]).length, need:25 },
  { th:'Master Rank ระดับ Elite',           cur:()=>Math.min(mrInfo().i, 3), need:3 },
];
const tfbUnlocked = ()=>TFB_REQ.every(r=>r.cur()>=r.need);
const TFB_PHASES = [
  null,
  { at:1,   en:'PHASE 1', th:'การต่อสู้ด้วยถ้อยคำ' },
  { at:.8,  en:'PHASE 2 · HARDER WORDS', th:'คำสั้นกว่า 5 ตัวอักษร แรงเหลือ 30%' },
  { at:.6,  en:'PHASE 3 · ELEMENT SHIFT', th:'บอสเปลี่ยนธาตุทุกเทิร์น — ใช้ธาตุที่แพ้ทาง x2.5 · ธาตุเดียวกันถูกดูดซับ' },
  { at:.4,  en:'PHASE 4 · TIME PRESSURE', th:'เหลือเวลา 12 วินาทีต่อคำ' },
  { at:.25, en:'PHASE 5 · SILENCE', th:'ห้ามสลับ ห้ามคำใบ้ · สาปหินทุกเทิร์น' },
  { at:.1,  en:'FINAL PHASE · BLIND', th:'ไม่เห็นดาเมจ ไม่เห็นคำเตือน — เชื่อความรู้ของตัวเอง' },
];
const TFB_ELEMS = ['fire','ice','thunder','water','earth'];
const TFB_WEAK = { fire:'water', ice:'fire', thunder:'earth', water:'thunder', earth:'wind' };
function startTFB(){ egStart({ type:'tfb', rules:{}, key:'tfb' }, `<small>☠️ TRUE FINAL BOSS</small>LEXIVORE`); }
function tfbSetup(b){
  const rng = mulberry(4242), e = makeEnemy('necro', 39, rng, true);
  Object.assign(e, { key:'lexivore', name:'Lexivore', th:'ผู้กลืนถ้อยคำ', pal:MON.lexivore.pal, sc:1.25, traits:['armor3'], golden:false });
  e.hp = e.maxHp = Math.round(e.maxHp*4); e.atk = Math.round(e.atk*1.2); e.gold = 500; e.phase2 = true;   // its own phases replace the normal phase 2
  b.stage.enemies = [e];
  b.egTfb = { phase:1, el:null };
  try{ placeEnemies(true); }catch(err){}
}
function tfbWordMult(b, r){
  const T = b.egTfb, e = curEnemy(); if(!T || !e) return 1;
  let m = 1;
  if(T.phase>=2 && r.w.length<5){ m *= .3; r.notes.unshift('☠️ HARDER WORDS x0.3'); }
  if(T.phase>=3 && r.el && T.el){ if(r.el===TFB_WEAK[T.el]){ m *= 2.5; r.notes.unshift(`☠️ แพ้ทาง ${ELEMENTS[r.el].name} x2.5`); } else if(r.el===T.el){ m = 0; r.notes.unshift(`☠️ ${ELEMENTS[T.el].name} ถูกดูดซับ!`); } }
  return m;
}
function tfbCheck(b, e){
  const T = b.egTfb, p = e.hp/e.maxHp; let ph = 1;
  TFB_PHASES.forEach((x,i)=>{ if(x && p < x.at) ph = Math.max(ph, i); });
  if(ph > T.phase){
    T.phase = ph; const P = TFB_PHASES[ph];
    banner(P.en, P.th); sfx.boss && sfx.boss(); shake(true);
    if(ph>=3 && !T.el){ T.el = TFB_ELEMS[0]; }
    if(ph>=4) b.egTfbTime = 12;
    if(ph>=5 && !e.traits.includes('stone')) e.traits.push('stone');
    if(ph>=6) document.querySelector('.battle') && document.querySelector('.battle').classList.add('eg-blind');
    e.atk = Math.round(e.atk*1.08);
    egTfbTag(b);
  }
}
function egTfbTag(b){
  const h = document.querySelector('.eg-hud'); if(!h || !b.egTfb) return;
  let t = h.querySelector('.eg-tfb'); if(!t){ t = document.createElement('span'); t.className = 'eg-tfb'; h.appendChild(t); }
  const T = b.egTfb; t.innerHTML = `${TFB_PHASES[T.phase].en}${T.el?` · ${ELEM_ICON[T.el]} ${ELEMENTS[T.el].name} (แพ้ ${ELEM_ICON[TFB_WEAK[T.el]]})`:''}`;
}
// the boss shifts element after each of its turns in phase 3+
enemyTurn = (f=>async function(){
  const b = ui.bat, r = await f.apply(this, arguments);
  if(b && b.egTfb && b.egTfb.phase>=3 && !b.over){ const T = b.egTfb; T.el = TFB_ELEMS[(TFB_ELEMS.indexOf(T.el)+1)%TFB_ELEMS.length]; egTfbTag(b); }
  return r;
})(enemyTurn);

/* ------------------------------ WORD MASTERY TIERS ------------------------------ */
const WTIERS = [
  { k:'Unknown',    th:'ยังไม่รู้จัก',  c:'#6f6993' },
  { k:'Discovered', th:'ค้นพบ',       c:'#8fd0ff' },
  { k:'Familiar',   th:'คุ้นเคย',      c:'#4ad07a' },
  { k:'Skilled',    th:'ชำนาญ',       c:'#ffc83d' },
  { k:'Mastered',   th:'เชี่ยวชาญ',     c:'#ff8a3a' },
  { k:'Perfected',  th:'สมบูรณ์แบบ',   c:'#c77dff' },
];
function wordTier(w){
  const d = save.mastery[w], n = (d && d.n) || ((save.book[w] && save.book[w].n) || 0);
  if(!n && !save.book[w]) return 0;
  if(n>=20 && d && (d.bc||0)>=5 && d.boss && d.ch) return 5;
  if(n>=20) return 4; if(n>=10) return 3; if(n>=4) return 2; return 1;
}
function wordTierCount(min){ const keys = new Set([...Object.keys(save.mastery||{}), ...Object.keys(save.book||{})]); let c = 0; keys.forEach(w=>{ if(wordTier(w)>=min) c++; }); return c; }
function wordCompletion(){
  const total = ALL_WORDS.length, bank = ALL_WORDS.map(x=>x.word);
  const disc = bank.filter(w=>wordTier(w)>=1).length, mast = bank.filter(w=>wordTier(w)>=4).length, perf = bank.filter(w=>wordTier(w)>=5).length;
  return { total, disc, mast, perf, pct: Math.round(mast/total*10000)/100 };
}

/* ------------------------------ MASTER RANK ------------------------------ */
const MR = [
  { k:'Novice',      th:'มือใหม่',      at:0,     c:'#8a84ad' },
  { k:'Adventurer',  th:'นักผจญภัย',    at:1500,  c:'#8fd0ff', r:{ title:'adventurer', badge:'adv' } },
  { k:'Warrior',     th:'นักรบ',        at:3500,  c:'#4ad07a', r:{ title:'warrior', frame:'warrior', cc:200 } },
  { k:'Elite',       th:'ยอดฝีมือ',     at:6000,  c:'#ffc83d', r:{ title:'elite', aura:'elite', cc:300 } },
  { k:'Master',      th:'ปรมาจารย์',    at:9500,  c:'#ff8a3a', r:{ title:'master', victory:'masterv', badge:'master' } },
  { k:'Grandmaster', th:'ปรมาจารย์ใหญ่', at:14000, c:'#ff3b4e', r:{ title:'grandmaster', frame:'grand', trail:'grand' } },
  { k:'Legend',      th:'ตำนาน',        at:20000, c:'#c77dff', r:{ title:'legend', aura:'legend' } },
  { k:'Mythic',      th:'เทพนิยาย',     at:28000, c:'#ff4df0', r:{ title:'mythic', frame:'mythic', badge:'mythic', victory:'mythic', aura:'mythic' } },
];
function mrParts(){
  const E = EGS(), RP = { 1:10, 2:25, 3:50, 4:100 };
  const bossKeys = CHAPTERS.flatMap(C=>[C.mini, C.boss]);
  const customPts = Object.entries(E.scores).filter(([k])=>k.startsWith('cu')).reduce((a,[,v])=>a + ({ S:150, A:90, B:50, C:25 }[v.rank]||0), 0);
  return [
    ['เนื้อเรื่อง', Math.round(Math.min(save.cleared,40)/40*1500)],
    ['Nightmare', Math.min(2400, nmCount()*60) + nmBosses()*100],
    ['Endless', Math.min(E.endBest||0,100)*20 + Math.max(0,(E.endBest||0)-100)*5],
    ['Word Mastery', wordTierCount(4)*12 + wordTierCount(5)*25 + wordCompletion().disc*2],
    ['Perfect Run', perfectTotal()*15],
    ['Speedrun', Object.values(E.speed).reduce((a,s)=>a + 120 + (s.best && s.best<=SPEED_PAR ? 80 : 0), 0)],
    ['ถ้วยรางวัล', Object.keys(ACH).filter(k=>save.achievements[k]).reduce((a,k)=>a + (RP[(TMETA[k]||{}).r||1]||10), 0)],
    ['บอส', bossKeys.filter(k=>V2().kills[k]).length*40 + (E.tfb.wins ? 1500 : 0)],
    ['Challenge', Math.min(3000, customPts)],
  ];
}
function mrInfo(){
  const parts = mrParts(), pts = parts.reduce((a,p)=>a+p[1],0);
  let i = 0; MR.forEach((r,k)=>{ if(pts>=r.at) i = k; });
  const next = MR[i+1];
  return { pts, i, R:MR[i], next, pct: next ? Math.round((pts-MR[i].at)/(next.at-MR[i].at)*100) : 100, parts };
}
function mrUnclaimed(){ return Math.max(0, mrInfo().i - (EGS().mrClaimed||0)); }
function mrClaim(){ const E = EGS(), I = mrInfo(); let html = ''; for(let k=(E.mrClaimed||0)+1;k<=I.i;k++){ if(MR[k].r) html += egGrant(MR[k].r); E.mrClaimed = k; } persist(); return html; }

/* ------------------------------ TROPHIES (endgame) + categories ------------------------------ */
const TCAT = { combat:'⚔️ Combat', words:'📖 Words', boss:'💀 Boss', speedrun:'⚡ Speedrun', nightmare:'🌙 Nightmare', endless:'♾️ Endless', mastery:'👑 Mastery', exploration:'🧭 Exploration' };
const TCAT_OF = {
  combo5:'combat', crit10:'combat', ult5:'combat', combo10:'combat', combo20:'combat', golden:'combat', golden10:'combat', rude:'combat',
  word10:'words', word100:'words', word500:'words', word1000:'words', words7:'words', master5:'words', elemAll:'words', puzzle10:'words', pzPerfect:'words',
  boss3:'boss', tower10:'endless', tower25:'endless', tower50:'endless', stars:'mastery',
  clr0:'exploration', clr1:'exploration', clr2:'exploration', clr3:'exploration', clr4:'exploration', heroes3:'exploration', heroesAll:'exploration', mats100:'exploration', mainAll:'exploration', adv10:'exploration', adv25:'exploration',
};
const EG_TROPHIES = {
  comboHunter:{ th:'Combo Hunter', d:'ทำคอมโบถึง 25', r:3, cat:'combat', p:()=>[save.stats.bestCombo||0,25], ic:'🎯', title:'combohunter' },
  bossAll:{ th:'Boss Slayer', d:'ปราบบอสและมินิบอสครบทั้ง 10 ตัว', r:3, cat:'boss', p:()=>[CHAPTERS.flatMap(C=>[C.mini,C.boss]).filter(k=>V2().kills[k]).length,10], ic:'🗡️', title:'bossslayer' },
  bossFast:{ th:'สังหารสายฟ้า', d:'ปราบบอสภายใน 20 วินาทีหลังเจอ', r:2, cat:'boss', p:()=>[EGS().pb.bossMs && EGS().pb.bossMs<=20000 ? 1 : 0,1], ic:'⏲️' },
  tfb:{ th:'TRUE HERO', d:'ปราบ True Final Boss "Lexivore"', r:4, cat:'boss', p:()=>[EGS().tfb.wins?1:0,1], ic:'☠️', title:'truehero', secret:true, dOpen:'ปราบ Lexivore ผู้กลืนถ้อยคำ' },
  spFirst:{ th:'ออกตัวแรง', d:'จบ Speedrun 1 บท', r:2, cat:'speedrun', p:()=>[Object.keys(EGS().speed).length?1:0,1], ic:'🏁' },
  spAll:{ th:'นักวิ่งทุกสนาม', d:'จบ Speedrun ครบ 5 บท', r:3, cat:'speedrun', p:()=>[Object.keys(EGS().speed).length,5], ic:'🏃' },
  spFast:{ th:'Speed Demon', d:'จบ Speedrun บทใดก็ได้ภายใน 4:00', r:4, cat:'speedrun', p:()=>[Object.values(EGS().speed).some(s=>s.best && s.best<=240000)?1:0,1], ic:'⚡', title:'speeddemon' },
  nmFirst:{ th:'ฝันร้ายครั้งแรก', d:'ผ่านด่าน Nightmare 1 ด่าน', r:2, cat:'nightmare', p:()=>[Math.min(1,nmCount()),1], ic:'🌒' },
  nmBoss:{ th:'ตื่นจากฝันร้าย', d:'ปราบบอส Nightmare 1 บท', r:3, cat:'nightmare', p:()=>[Math.min(1,nmBosses()),1], ic:'🌘' },
  nmAll:{ th:'Nightmare Walker', d:'ปราบบอส Nightmare ครบ 5 บท', r:4, cat:'nightmare', p:()=>[nmBosses(),5], ic:'🌑', title:'nightwalker' },
  tower100:{ th:'Tower Conqueror', d:'ปีน Endless ถึงชั้น 100', r:4, cat:'endless', p:()=>[EGS().endBest||0,100], ic:'🏯', title:'towerconq' },
  pfFirst:{ th:'ไร้ที่ติ', d:'ผ่าน Perfect Run 1 ด่าน', r:2, cat:'mastery', p:()=>[Object.keys(EGS().perfect).length?1:0,1], ic:'💎' },
  pfPP:{ th:'Perfect Warrior', d:'ได้ Perfect++ ใน 5 ด่าน', r:4, cat:'mastery', p:()=>[Object.values(EGS().perfect).filter(t=>t>=3).length,5], ic:'💠', title:'perfectw' },
  customS:{ th:'S Rank', d:'ได้ S Rank ใน Challenge ที่สร้างเอง', r:3, cat:'mastery', p:()=>[Object.entries(EGS().scores).some(([k,v])=>k.startsWith('cu') && v.rank==='S')?1:0,1], ic:'🅢' },
  rankElite:{ th:'Elite', d:'Master Rank ระดับ Elite', r:3, cat:'mastery', p:()=>[Math.min(mrInfo().i,3),3], ic:'🥇' },
  rankMaster:{ th:'Master', d:'Master Rank ระดับ Master', r:4, cat:'mastery', p:()=>[Math.min(mrInfo().i,4),4], ic:'👑' },
  wm50:{ th:'คลังคำเชี่ยวชาญ', d:'Master คำศัพท์ 50 คำ', r:3, cat:'words', p:()=>[wordTierCount(4),50], ic:'📚' },
  wmPerf:{ th:'สมบูรณ์แบบ', d:'Perfected คำศัพท์ 10 คำ', r:4, cat:'words', p:()=>[wordTierCount(5),10], ic:'🔮' },
};
Object.entries(EG_TROPHIES).forEach(([id,t])=>{ ACH[id] = { th:t.th, d:t.d, need:()=>{ try{ const [a,b] = t.p(); return a>=b; }catch(e){ return false; } } }; TMETA[id] = t; TCAT_OF[id] = t.cat; });
Object.keys(ACH).forEach(id=>{ if(!TCAT_OF[id]) TCAT_OF[id] = 'exploration'; });

/* ------------------------------ results for every challenge ------------------------------ */
function egResultBlock(run, S, extra){
  const pb = extra.pb ? '<em class="eg-pb">NEW RECORD!</em>' : '';
  return `<div class="eg-res">
    <div class="eg-score"><span class="eg-rank r-${S.rank}">${S.rank}</span><span><small>CHALLENGE SCORE</small><b>${fmt(S.score)}</b>${extra.best?`<i>สถิติ ${fmt(extra.best)}</i>`:''}</span>${pb}</div>
    <div class="eg-stats"><span>เวลา<b>${fmtT(run.t)}</b></span><span>คำ<b>${run.words}</b></span><span>พลาด<b>${run.mistakes}</b></span><span>Combo<b>x${run.bestCombo}</b></span><span>รับดาเมจ<b>${fmt(run.dmgTaken)}</b></span><span>แม่นยำ<b>${S.acc}%</b></span></div>
    ${extra.html||''}
  </div>`;
}
function egButtons(m, list){
  const btns = m.querySelector('.btns'); if(!btns) return;
  btns.innerHTML = list.map(([act, cls, label, v])=>`<button class="cbtn ${cls} block" data-act="${act}" ${v!==undefined?`data-v="${v}"`:''}>${label}</button>`).join('');
}
QL2.egAfter = function(kind, b){
  const m = document.querySelector('#overlay .modal'); if(!m || !b) return;
  const run = runOf(b), E = EGS();
  // endless tower: show personal records
  if(!run && b.stage.tower){
    const R = rulesOf(b) || {};
    const blk = `<div class="eg-res"><div class="eg-stats"><span>ชั้นสูงสุด<b>${E.endBest||0}</b></span><span>Combo สูงสุด<b>x${E.pb.combo||0}</b></span><span>ปีนรอบนี้<b>${b.kills}</b></span></div>${Object.keys(R).length?`<div class="eg-modrow">${modChips(R,'sm')}</div>`:''}</div>`;
    const x = m.querySelector('.q2-res'); x ? x.insertAdjacentHTML('afterend', blk) : m.querySelector('.btns').insertAdjacentHTML('beforebegin', blk);
    return;
  }
  if(!run) return;
  run.dmg += b.score||0;
  const won = kind==='clear', ch = run.ch, n = run.n, s = run.type==='tfb' ? -1 : stageIndex(ch,n);
  m.classList.add('eg-result', 'eg-'+run.type);
  let extra = { html:'' }, rewards = {}, title = '';
  const keep = ()=>{ const S = egScore(run, b, won), old = E.scores[run.key]; const pb = won && (!old || S.score>old.score); if(pb) E.scores[run.key] = { score:S.score, rank:S.rank, t:Date.now() }; extra.best = old ? old.score : 0; extra.pb = pb && !!old; return { S, pb }; };
  // speedrun: mid-chapter split
  if(run.type==='speed' && won && n<STAGES_PER){
    run.splits.push(run.t);
    m.querySelector('h3') && (m.querySelector('h3').textContent = `SPLIT ${n}/${STAGES_PER}`);
    const blk = `<div class="eg-res"><div class="eg-split">⏱ ${fmtT(run.t)}</div><div class="eg-stats"><span>คำ<b>${run.words}</b></span><span>พลาด<b>${run.mistakes}</b></span><span>Combo<b>x${run.bestCombo}</b></span></div>${E.speed[ch]?`<p class="sub">สถิติดีที่สุด ${fmtT(E.speed[ch].best)}</p>`:''}</div>`;
    const x = m.querySelector('.q2-res'); x ? x.insertAdjacentHTML('afterend', blk) : m.querySelector('.btns').insertAdjacentHTML('beforebegin', blk);
    egButtons(m, [['egNext','gold',`⚡ ด่านต่อไป ${ch+1}-${n+1}`],['egQuit','wood','ยอมแพ้ Speedrun']]);
    persist(); return;
  }
  const { S, pb } = keep();
  if(won){
    if(run.type==='nightmare'){
      const rec = E.nm[s] || {}; const first = !rec.clear; E.nm[s] = { clear:1, best:Math.max(rec.best||0, S.score) };
      E.cnt.nmClears++;
      if(first) rewards = n===STAGES_PER ? { nc:100, mats:{ [LOCS[ch].gem]:1 } } : { nc:30 };
      else { const dk = todayKey()+'|'+s; if(!E.nmDay[dk]){ E.nmDay = { [dk]:1, ...Object.fromEntries(Object.entries(E.nmDay).filter(([k])=>k.startsWith(todayKey()))) }; rewards = { nc:5 }; } }
      if(first && n===STAGES_PER && ch<CHAPTERS.length-1) extra.html += `<p class="eg-unlock">🌙 ปลดล็อก Nightmare: ${esc(LOCS[ch+1].name)}</p>`;
      title = first ? 'NIGHTMARE CLEAR!' : 'NIGHTMARE CLEAR';
    }
    if(run.type==='perfect'){
      const t = perfectTier(run, b.max), old = E.perfect[s]||0;
      if(t){ E.cnt.perfects++; if(t>old){ E.perfect[s] = t; const pay = [0,10,20,40]; let cc = 0; for(let k=old+1;k<=t;k++) cc += pay[k]; if(n===STAGES_PER) cc *= 2; rewards = { cc }; } }
      extra.html += `<div class="eg-tier t${t}">${t ? '✦'.repeat(t)+' '+PERFECT[t].k : '✗ ไม่ผ่านเงื่อนไข Perfect'}<small>${t ? PERFECT[t].th : 'ห้ามใช้ยาและห้ามสลับตัวอักษร'}</small></div>`;
      extra.html += `<p class="sub eg-tierinfo">✦ ${PERFECT[1].th}<br>✦✦ ${PERFECT[2].th}<br>✦✦✦ ${PERFECT[3].th}</p>`;
      title = t ? PERFECT[t].k.toUpperCase()+'!' : 'CLEAR';
    }
    if(run.type==='speed'){
      const old = E.speed[ch], best = !old || run.t < old.best;
      const acc = S.acc;
      if(best) E.speed[ch] = { best:Math.round(run.t), words:run.words, mistakes:run.mistakes, combo:run.bestCombo, acc };
      if(!old) rewards = { cc:60 }; else if(best && old.best - run.t >= 1000) rewards = { cc:15 };
      if(E.pb.fewest===null || run.mistakes < E.pb.fewest) E.pb.fewest = run.mistakes;
      extra.pb = best && !!old;
      extra.html = `<div class="eg-split big">⏱ ${fmtT(run.t)}<small>${best?'🏆 สถิติใหม่!':`สถิติ ${fmtT(old.best)}`} · Par ${fmtT(SPEED_PAR)}</small></div>` + extra.html;
      title = `${LOCS[ch].name.toUpperCase()} SPEEDRUN`;
    }
    if(run.type==='custom'){ E.cnt.customs++; if(pb){ rewards = { cc: Math.min(120, Math.round(S.score/300)) }; } title = 'CHALLENGE CLEAR'; extra.html += `<div class="eg-modrow">${modChips(run.rules,'sm')}<span class="eg-mult">×${modMult(run.rules)}</span></div>`; }
    if(run.type==='weekly'){ const { W, T } = egWeekly(); if(!W.claimed && W.wins < T.need) W.wins++; title = `${T.en} · ${W.wins}/${T.need}`; }
    if(run.type==='tfb'){
      const first = !E.tfb.wins; E.tfb.wins++; if(!E.tfb.bestMs || run.t < E.tfb.bestMs) E.tfb.bestMs = Math.round(run.t);
      rewards = first ? { title:'truehero', aura:'cosmos', trail:'legend', victory:'supernova', badge:'crown', frame:'crown', nc:500, cc:500 } : { nc:50 };
      title = first ? '☠️ TRUE HERO ☠️' : 'LEXIVORE DEFEATED';
      extra.html += `<p class="eg-unlock">${first?'ถ้อยคำทั้งหมดกลับคืนสู่โลก — คุณคือวีรบุรุษแท้จริง':'สถิติเร็วที่สุด '+fmtT(E.tfb.bestMs)}</p>`;
    }
  } else {
    title = run.type==='speed' ? 'SPEEDRUN FAILED' : run.type==='tfb' ? 'ถ้อยคำถูกกลืน…' : 'CHALLENGE FAILED';
  }
  const pills = Object.keys(rewards).length ? egGrant(rewards) : '';
  if(pills) extra.html += `<div class="rewards eg-rw">${pills}</div>`;
  const h3 = m.querySelector('h3'); if(h3 && title) h3.textContent = title;
  const blk = egResultBlock(run, S, extra);
  const x = m.querySelector('.q2-res'); x ? x.insertAdjacentHTML('afterend', blk) : m.querySelector('.btns').insertAdjacentHTML('beforebegin', blk);
  const view = { nightmare:'nightmare', perfect:'perfect', speed:'speed', custom:'creator', weekly:'daily', tfb:'tfb' }[run.type];
  const next = run.type==='nightmare' && won && n<STAGES_PER && nmStageOpen(ch, n+1) ? [['egNm','gold',`🌙 ด่านต่อไป ${ch+1}-${n+1}`, `${ch}-${n+1}`]] : [];
  egButtons(m, [...next, ['egRetry', next.length?'wood':'gold', run.type==='speed'?'⚡ เริ่ม Speedrun ใหม่':'↻ ลองอีกครั้ง'], ['egBack','wood',`🏆 Challenge Hall`, view], ['toHub','wood',`${IC2.hub} กลับฐาน`]]);
  ui.egLast = run; if(run.type!=='speed' || !won) ui.run = null;
  persist(); bump();
};
