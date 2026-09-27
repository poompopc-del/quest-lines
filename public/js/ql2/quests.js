/* ==========================================================================
   QUEST LINES 2.0 — QUESTS (main · side · chain · daily) + TROPHIES
   Progress is read from the save (so quests already done in older versions
   count right away). Rewards are claimed by the player.
   ========================================================================== */

/* ------------------------------ objectives ------------------------------ */
const sumObj = o=>Object.values(o||{}).reduce((a,b)=>a+(b||0),0);
const O = {
  kills:(ch,n)=>({ txt:`ปราบมอนสเตอร์ใน ${LOCS[ch].name} ${n} ตัว`, cur:()=>V2().chKills[ch]||0, need:n, go:{ ch } }),
  kill:(key,n,label)=>({ txt:label || `ปราบ ${MON[key].name}${n>1?` ${n} ตัว`:''}`, cur:()=>V2().kills[key]||0, need:n, go:{ mon:key } }),
  clear:(ch,n,label)=>({ txt:label || `ผ่านด่าน ${ch+1}-${n}`, cur:()=>save.cleared > stageIndex(ch,n) ? 1 : 0, need:1, go:{ ch, n } }),
  open:(ch)=>({ txt:`ค้นพบ ${LOCS[ch].name}`, cur:()=>chapterOpen(ch) ? 1 : 0, need:1 }),
  elem:(el,n)=>({ txt:`ใช้คำธาตุ ${ELEM_ICON[el]} ${ELEMENTS[el].name} ${n} ครั้ง`, cur:()=>V2().elem[el]||0, need:n }),
  elemAny:(n)=>({ txt:`ใช้คำธาตุใดก็ได้ ${n} ครั้ง`, cur:()=>sumObj(V2().elem), need:n }),
  elemKinds:(n)=>({ txt:`ใช้คำธาตุให้ครบ ${n} ชนิด`, cur:()=>BASE_ELEMS.filter(e=>V2().elem[e]).length, need:n }),
  tower:(n)=>({ txt:`ปีนหอคอยไร้สิ้นสุดถึงชั้น ${n}`, cur:()=>save.tower.best||0, need:n, go:{ tower:1 } }),
  words:(n)=>({ txt:`สะกดคำสำเร็จรวม ${n} คำ`, cur:()=>save.stats.words||0, need:n }),
  combo:(n)=>({ txt:`ทำคอมโบให้ถึง x${n}`, cur:()=>save.stats.bestCombo||0, need:n }),
  puzzles:(n)=>({ txt:`ไขปริศนาคำศัพท์ถูก ${n} ครั้ง`, cur:()=>V2().stats.puzzles||0, need:n }),
  golden:(n)=>({ txt:`ปราบ Golden Monster ${n} ตัว`, cur:()=>save.stats.golden||0, need:n }),
  longest:(n)=>({ txt:`สะกดคำยาว ${n} ตัวอักษรขึ้นไป`, cur:()=>(save.stats.longest||'').length, need:n }),
  mastery:(lv,n)=>({ txt:`ฝึกคำให้ถึง Mastery Lv.${lv} จำนวน ${n} คำ`, cur:()=>Object.keys(save.mastery||{}).filter(w=>masteryInfo(w).lv>=lv).length, need:n }),
  mats:(n)=>({ txt:`เก็บวัตถุดิบรวม ${n} ชิ้น`, cur:()=>V2().stats.mats||0, need:n }),
  heroes:(n)=>({ txt:`มีนักสู้ในทีม ${n} คน`, cur:()=>(save.chars||[]).length, need:n }),
  stars3:(n)=>({ txt:`ได้ 3 ดาวใน ${n} ด่าน`, cur:()=>Object.values(save.stars||{}).filter(v=>v>=3).length, need:n }),
  bank:(n)=>({ txt:`สะกดคำศัพท์เป้าหมาย ⭐ ${n} คำ`, cur:()=>V2().stats.bankWords||0, need:n }),
};

/* ------------------------------ quest book ------------------------------ */
const QUESTS = [];
const QX = {};
function defQ(q){ q.objs = q.objs||[]; QUESTS.push(q); QX[q.id] = q; return q; }

// MAIN STORY — one per location, then the tower
const MAIN = [
  { id:'m1', loc:0, en:'WHISPERS OF THE CRYPT', title:'เสียงกระซิบใต้สุสาน',
    desc:'มีเสียงเหรียญทองกระทบกันดังมาจากสุสานที่ถูกลืม ออกไปสำรวจ ปราบผู้เฝ้าหีบสมบัติ และหยุดราชินีสไลม์อเวจีผู้กักตุนทองคำ',
    objs:[O.kills(0,5), O.clear(0,4), O.kill('mimic',1,'ปราบมินิบอส Greedy Mimic'), O.kill('kingslime',1,'ปราบบอส Abyss Slime')],
    reward:{ gold:250, xp:150, potions:{ heal:2 } } },
  { id:'m2', loc:1, en:'THE LOST KINGDOM', title:'อาณาจักรที่สาบสูญ',
    desc:'แผนที่ในหีบของราชินีสไลม์อเวจีชี้ไปยังทุ่งดาว ที่ซึ่งประตูโบราณของอาณาจักรที่สาบสูญถูกผู้พิทักษ์ต้นไม้เฒ่าปิดตายไว้',
    objs:[O.kills(1,3), O.open(1), O.kill('treant',1,'ปราบผู้พิทักษ์ Old Rootbeard'), O.kill('ogre',1,'เปิดประตูโบราณ — ปราบ Forest Ogre')],
    reward:{ gold:500, xp:220, mats:{ fireGem:1 } } },
  { id:'m3', loc:2, en:'THE FROZEN HEART', title:'หัวใจน้ำแข็ง',
    desc:'เลยประตูโบราณไปคือถ้ำน้ำแข็ง ไททันผู้หลับใหลเริ่มตื่น ใช้พลังคำธาตุเพื่อฝ่าความหนาวไปให้ถึงหัวใจของถ้ำ',
    objs:[O.open(2), O.elemAny(3), O.kill('yeti',1,'ปราบมินิบอส Yeti'), O.kill('frostgol',1,'ปราบบอส Frost Titan')],
    reward:{ gold:700, xp:300, potions:{ power:2 }, mats:{ frostGem:1 } } },
  { id:'m4', loc:3, en:'SIEGE OF FLAMES', title:'ศึกป้อมเปลวเพลิง',
    desc:'ป้อมที่ไม่เคยดับไฟคือคลังอาวุธของกองทัพเงา บุกเข้าไป ฝ่าสุนัขนรก และดับไฟของมังกรเพลิง',
    objs:[O.open(3), O.kills(3,15), O.kill('hellhound',1,'ปราบมินิบอส Hellhound'), O.kill('dragon',1,'ปราบบอส Ember Dragon')],
    reward:{ gold:900, xp:380, mats:{ fireGem:1, ember:5 } } },
  { id:'m5', loc:4, en:"THE NECROMANCER'S END", title:'จุดจบจอมเวทมรณะ',
    desc:'ผู้อยู่เบื้องหลังทุกอย่างคือจอมเวทมรณะ ผู้ขโมยถ้อยคำไปจากโลก สะกดคำให้ได้ แล้วส่งเขากลับสู่ความเงียบ',
    objs:[O.open(4), O.kill('mummy',1,'ปราบมินิบอส Tomb Mummy'), O.clear(4,6), O.kill('necro',1,'ปราบจอมเวท Necromancer')],
    reward:{ gold:1500, xp:600, title:'dawn', mats:{ soulGem:1 } } },
  { id:'m6', loc:'tower', en:'TOWER OF ENDLESS NIGHT', title:'หอคอยราตรีนิรันดร์',
    desc:'แม้จอมเวทจะพ่ายแพ้ แต่หอคอยที่เขาสร้างยังทอดยาวสู่ฟ้า ยิ่งสูงยิ่งมืด ยิ่งมืดยิ่งแข็งแกร่ง',
    objs:[O.tower(10), O.tower(20), O.tower(30)],
    reward:{ gold:2000, xp:800, title:'towerlord' } },
];
MAIN.forEach((q,i)=>defQ(Object.assign(q, { type:'main', order:i,
  req: i ? ()=>!!V2().q.claimed[MAIN[i-1].id] : ()=>true,
  reqTxt: i ? `ทำภารกิจหลัก "${MAIN[i-1].title}" ให้สำเร็จ` : '' })));

// SIDE QUESTS — one-off jobs posted at each location
[
  { id:'s_bat',    loc:0, title:'ค้างคาวรังควาน',   desc:'ค้างคาวเขี้ยวแย่งเหรียญไปจากผู้มาเยือนสุสาน ช่วยไล่พวกมันออกไปที', objs:[O.kill('bat',4,'ปราบ Fang Bat 4 ตัว')], reward:{ gold:120, xp:60, mats:{ bone:4 } } },
  { id:'s_candle', loc:0, title:'เทียนที่ไม่ยอมดับ',  desc:'เทียนหลอนจุดไฟเผาแผนที่ของนักสำรวจ ดับมันให้หมด', objs:[O.kill('candle',3,'ปราบ Wax Wick 3 ตัว')], reward:{ gold:120, xp:60, potions:{ heal:1 } } },
  { id:'s_wolf',   loc:1, title:'หมาป่าในทุ่งดาว',   desc:'หมาป่าตะไคร่ล่าคนเลี้ยงแกะในทุ่งดาว', objs:[O.kill('wolf',4,'ปราบ Moss Wolf 4 ตัว')], reward:{ gold:180, xp:80, mats:{ starmoss:5 } } },
  { id:'s_plant',  loc:1, title:'ดอกไม้กินคน',       desc:'ดอกไม้ยักษ์งอกขวางทางเดิน ตัดทิ้งเสียก่อนมันจะออกดอกอีก', objs:[O.kill('plant',3,'ปราบ Snapvine 3 ตัว')], reward:{ gold:180, xp:80, potions:{ power:1 } } },
  { id:'s_snow',   loc:2, title:'มนุษย์หิมะอาละวาด', desc:'มนุษย์หิมะทุบกระท่อมนักปีนเขา ช่วยพวกเขาที', objs:[O.kill('snowman',3,'ปราบ Frosty Brute 3 ตัว')], reward:{ gold:240, xp:100, mats:{ frost:5 } } },
  { id:'s_ice',    loc:2, title:'ละลายน้ำแข็ง',       desc:'ใช้คำธาตุไฟละลายกำแพงน้ำแข็ง', objs:[O.elem('fire',3)], reward:{ gold:200, xp:100, mats:{ frost:3 } } },
  { id:'s_salam',  loc:3, title:'ซาลาแมนเดอร์หลุด',   desc:'ซาลาแมนเดอร์ไฟหนีออกจากเตาหลอม จับให้หมด', objs:[O.kill('salamander',4,'ปราบ Salamander 4 ตัว')], reward:{ gold:300, xp:120, mats:{ ember:5 } } },
  { id:'s_water',  loc:3, title:'ดับไฟป้อม',          desc:'ใช้คำธาตุน้ำดับเปลวไฟที่ลุกลาม', objs:[O.elem('water',3)], reward:{ gold:260, xp:120, potions:{ heal:2 } } },
  { id:'s_zombie', loc:4, title:'ซอมบี้ไม่ยอมนอน',     desc:'ซอมบี้เดินโซเซวนเวียนรอบบ้านร้าง ส่งพวกมันกลับหลุม', objs:[O.kill('zombie',4,'ปราบ Shambler 4 ตัว')], reward:{ gold:360, xp:150, mats:{ soul:5 } } },
  { id:'s_holy',   loc:4, title:'แสงแห่งความหวัง',     desc:'คำธาตุแสงเจ็บแสบสำหรับผีและโครงกระดูก ใช้มันส่องทางในความมืด', objs:[O.elem('holy',4)], reward:{ gold:320, xp:150, potions:{ heal:2 } } },
  { id:'s_stars',  loc:null, title:'นักล่าดาว',       desc:'ชนะด่านด้วย HP เหลือเยอะเพื่อเก็บ 3 ดาว', objs:[O.stars3(8)], reward:{ gold:400, xp:180, frame:'crimson' } },
  { id:'s_bank',   loc:null, title:'คลังคำศัพท์',      desc:'คำศัพท์เป้าหมาย ⭐ คือคำสำคัญที่ควรจำ สะกดให้ได้เยอะๆ', objs:[O.bank(20)], reward:{ gold:300, xp:150 } },
].forEach(q=>defQ(Object.assign(q, { type:'side',
  req: q.loc===null || q.loc===undefined ? ()=>true : ()=>chapterOpen(q.loc),
  reqTxt: q.loc===null || q.loc===undefined ? '' : `ปลดล็อก ${LOCS[q.loc].name}` })));

// QUEST CHAINS — several steps, each opens after the previous one is claimed
const CHAINS = [
  { id:'c_words', title:'เส้นทางนักสะกด', en:'Wordsmith', loc:null, steps:[
    { objs:[O.words(25)],  reward:{ gold:100, xp:80 } },
    { objs:[O.words(100)], reward:{ gold:250, xp:160, potions:{ heal:2 } } },
    { objs:[O.words(300)], reward:{ gold:600, xp:300, title:'spellblade' } } ],
    desc:'ทุกคำที่สะกดได้คือก้าวหนึ่งบนเส้นทาง' },
  { id:'c_elem', title:'ผู้ปลุกธาตุ', en:'Elementalist', loc:null, steps:[
    { objs:[O.elemAny(3)],   reward:{ gold:120, xp:80 } },
    { objs:[O.elemKinds(5)], reward:{ gold:300, xp:180, mats:{ starGem:1 } } },
    { objs:[O.elemKinds(9)], reward:{ gold:700, xp:350, title:'elemental' } } ],
    desc:'คำอย่าง FIRE, ICE, STORM, WATER, POISON, WIND, ROCK, LIGHT, DARK ปลุกพลังให้อาวุธ' },
  { id:'c_combo', title:'จังหวะนักรบ', en:'Combo Artist', loc:null, steps:[
    { objs:[O.combo(5)],  reward:{ gold:120, xp:80 } },
    { objs:[O.combo(10)], reward:{ gold:300, xp:180, potions:{ power:2 } } },
    { objs:[O.combo(15)], reward:{ gold:600, xp:320, fx:'petals' } } ],
    desc:'โจมตีต่อเนื่องโดยไม่โดนตีเพื่อสะสมคอมโบ' },
  { id:'c_puzzle', title:'ไขปริศนาโบราณ', en:'Riddle Seeker', loc:null, steps:[
    { objs:[O.puzzles(1)],  reward:{ gold:100, xp:60 } },
    { objs:[O.puzzles(5)],  reward:{ gold:250, xp:160, mats:{ moonGem:1 } } },
    { objs:[O.puzzles(15)], reward:{ gold:600, xp:320, title:'scholar' } } ],
    desc:'ปราบมินิบอสแล้วเติมตัวอักษรที่หายไปในปริศนาคำศัพท์' },
  { id:'c_tower', title:'นักปีนหอคอย', en:'Tower Climber', loc:'tower', steps:[
    { objs:[O.tower(5)],  reward:{ gold:150, xp:100 } },
    { objs:[O.tower(15)], reward:{ gold:400, xp:220, potions:{ heal:3 } } },
    { objs:[O.tower(25)], reward:{ gold:900, xp:420, fx:'embers' } } ],
    desc:'หอคอยไร้สิ้นสุดไม่มีจุดจบ แต่ทุกชั้นคือความภูมิใจ' },
  { id:'c_long', title:'คำยาวทรงพลัง', en:'Long Words', loc:null, steps:[
    { objs:[O.longest(6)],  reward:{ gold:120, xp:80 } },
    { objs:[O.longest(8)],  reward:{ gold:300, xp:180 } },
    { objs:[O.longest(10)], reward:{ gold:800, xp:400, mats:{ soulGem:1 } } } ],
    desc:'ยิ่งคำยาว ยิ่งแรง — คำ 8 ตัวขึ้นไปเป็น CRITICAL WORD' },
  { id:'c_master', title:'ความชำนาญ', en:'Mastery', loc:null, steps:[
    { objs:[O.mastery(2,5)], reward:{ gold:150, xp:100 } },
    { objs:[O.mastery(3,5)], reward:{ gold:350, xp:200 } },
    { objs:[O.mastery(5,3)], reward:{ gold:800, xp:400, title:'wordmaster' } } ],
    desc:'ใช้คำเดิมซ้ำๆ เพื่อเพิ่ม Word Mastery (สูงสุด Lv.5) และดาเมจ' },
  { id:'c_gold', title:'นักล่าทองคำ', en:'Gold Hunter', loc:null, steps:[
    { objs:[O.golden(1)], reward:{ gold:200, xp:100 } },
    { objs:[O.golden(5)], reward:{ gold:600, xp:250, acc:'luckyCoin' } } ],
    desc:'★ Golden Monster เกิดแบบสุ่ม ให้ทองมากกว่าปกติ 4 เท่า' },
  { id:'c_mats', title:'นักสะสมวัตถุดิบ', en:'Gatherer', loc:null, steps:[
    { objs:[O.mats(10)],  reward:{ gold:100, xp:60 } },
    { objs:[O.mats(40)],  reward:{ gold:250, xp:150 } },
    { objs:[O.mats(120)], reward:{ gold:600, xp:300, frame:'gold' } } ],
    desc:'มอนสเตอร์ทำวัตถุดิบหล่นตามพื้นที่ ใช้ทำยาหรือขายในร้านค้า' },
  { id:'c_heroes', title:'รวมพลนักสู้', en:'Assemble', loc:null, steps:[
    { objs:[O.heroes(2)], reward:{ gold:200, xp:120 } },
    { objs:[O.heroes(4)], reward:{ gold:500, xp:250 } },
    { objs:[O.heroes(6)], reward:{ gold:1200, xp:500, title:'collector' } } ],
    desc:'ปลดล็อกนักสู้ใหม่ที่วิหารนักสู้' },
];
CHAINS.forEach(c=>c.steps.forEach((s,i)=>defQ({ id:`${c.id}_${i+1}`, type:'chain', chain:c, step:i, of:c.steps.length, loc:c.loc,
  title:c.title, en:c.en, desc:c.desc, objs:s.objs, reward:s.reward,
  req: i ? ()=>!!V2().q.claimed[`${c.id}_${i}`] : ()=>true, reqTxt: i ? `ทำขั้นที่ ${i} ให้สำเร็จ` : '' })));

/* ------------------------------ status ------------------------------ */
function qObjs(q){ return q.objs.map(o=>{ const cur = Math.min(o.need, Math.max(0, o.cur())); return { txt:o.txt, cur, need:o.need, done:cur>=o.need, go:o.go||null }; }); }
function qStatus(q){
  const V = V2();
  if(V.q.claimed[q.id]) return 'claimed';
  if(q.req && !q.req()) return 'locked';
  return qObjs(q).every(o=>o.done) ? 'ready' : 'active';
}
function qPct(q){ const o = qObjs(q); return Math.round(o.reduce((a,x)=>a+x.cur/x.need,0)/o.length*100); }
function currentMain(){ return MAIN.find(q=>qStatus(q)!=='claimed') || null; }
function chainStep(c){ // the visible step of a chain
  for(let i=0;i<c.steps.length;i++){ const q = QX[`${c.id}_${i+1}`]; if(qStatus(q)!=='claimed') return q; }
  return QX[`${c.id}_${c.steps.length}`];
}
function trackedQuest(){
  const V = V2(), t = V.q.track && QX[V.q.track];
  if(t && ['active','ready'].includes(qStatus(t))) return t;
  return currentMain() || QUESTS.find(q=>['active','ready'].includes(qStatus(q))) || null;
}
function locLabel(loc){ return loc==='tower' ? 'หอคอยไร้สิ้นสุด' : (loc===null || loc===undefined) ? 'ทุกพื้นที่' : LOCS[loc].name; }

/* ------------------------------ daily ------------------------------ */
const DAILY_POOL = {
  words:  { txt:n=>`สะกดคำสำเร็จ ${n} คำ`,          n:15, c:()=>save.stats.words||0,        r:{ gold:80,  xp:60 } },
  kills:  { txt:n=>`ปราบมอนสเตอร์ ${n} ตัว`,         n:10, c:()=>save.stats.kills||0,        r:{ gold:90,  xp:60 } },
  clears: { txt:n=>`ผ่านด่าน ${n} ด่าน (เล่นซ้ำได้)`, n:2,  c:()=>V2().stats.clears||0,      r:{ gold:100, xp:70, potions:{ heal:1 } } },
  elem:   { txt:n=>`ใช้คำธาตุ ${n} ครั้ง`,           n:2,  c:()=>sumObj(V2().elem),          r:{ gold:90,  xp:70 } },
  long6:  { txt:n=>`สะกดคำยาว 6 ตัวขึ้นไป ${n} คำ`,  n:3,  c:()=>V2().stats.long6||0,       r:{ gold:100, xp:80 } },
  puzzle: { txt:n=>`ไขปริศนาคำศัพท์ถูก ${n} ครั้ง`,   n:1,  c:()=>V2().stats.puzzles||0,     r:{ gold:90,  xp:70, mats:{ moonGem:1 } } },
  minis:  { txt:n=>`ปราบมินิบอส ${n} ตัว`,           n:2,  c:()=>V2().stats.minis||0,       r:{ gold:110, xp:80 } },
  ult:    { txt:n=>`ใช้ ⚡ Ultimate ${n} ครั้ง`,       n:1,  c:()=>save.stats.ultimates||0,   r:{ gold:80,  xp:60, potions:{ power:1 } } },
  floors: { txt:n=>`ปีนหอคอย ${n} ชั้น`,             n:5,  c:()=>V2().stats.floors||0,      r:{ gold:120, xp:90 } },
  bank:   { txt:n=>`สะกดคำศัพท์เป้าหมาย ⭐ ${n} คำ`,  n:3,  c:()=>V2().stats.bankWords||0,   r:{ gold:90,  xp:70 } },
  combo:  { txt:n=>`ทำคอมโบ x${n} ในวันนี้`,          n:5,  c:()=>today().combo||0, abs:true, r:{ gold:100, xp:80 } },
};
const DAILY_BONUS = { gold:250, xp:150, potions:{ heal:1, power:1 } };
function dailyRoll(seedStr, exclude){
  const rng = mulberry(hashStr(seedStr)), keys = Object.keys(DAILY_POOL).filter(k=>!(exclude||[]).includes(k));
  return keys.sort(()=>rng()-.5);
}
function dailyEnsure(){
  const V = V2(), D = V.daily, k = todayKey();
  if(D.date!==k){
    const pick = dailyRoll('daily'+k).slice(0,3);
    V.daily = { date:k, rerolls:0, bonus:false, slots:pick.map(id=>({ id, base: DAILY_POOL[id].abs ? 0 : DAILY_POOL[id].c(), claimed:false, done:false })) };
    persist();
  }
  return V.daily;
}
function dailyInfo(slot){
  const P = DAILY_POOL[slot.id]; if(!P) return null;
  const cur = Math.max(0, Math.min(P.n, P.abs ? P.c() : P.c() - slot.base));
  return { txt:P.txt(P.n), cur, need:P.n, done:cur>=P.n, reward:P.r };
}
function dailyReroll(i){
  const D = dailyEnsure(), s = D.slots[i]; if(!s || s.claimed || D.rerolls>=1) return false;
  const used = D.slots.map(x=>x.id);
  const id = dailyRoll('re'+D.date+i+Date.now(), used)[0]; if(!id) return false;
  D.slots[i] = { id, base: DAILY_POOL[id].abs ? 0 : DAILY_POOL[id].c(), claimed:false, done:false };
  D.rerolls++; persist(); return true;
}
function dailyClaim(i){
  const D = dailyEnsure(), s = D.slots[i], inf = s && dailyInfo(s); if(!inf || !inf.done || s.claimed) return '';
  s.claimed = true; V2().stats.quests++;
  const html = grant(inf.reward); persist(); return html;
}
function dailyBonusReady(){ const D = dailyEnsure(); return !D.bonus && D.slots.length && D.slots.every(s=>s.claimed); }

/* ------------------------------ claim / scan ------------------------------ */
function claimQuest(id){
  const q = QX[id]; if(!q || qStatus(q)!=='ready') return '';
  const V = V2(); V.q.claimed[id] = Date.now(); V.stats.quests++;
  if(V.q.track===id) V.q.track = null;
  const html = grant(q.reward); persist();
  bump(); return html;
}
function claimableCount(){
  const D = dailyEnsure();
  return QUESTS.filter(q=>qStatus(q)==='ready').length + D.slots.filter(s=>!s.claimed && dailyInfo(s) && dailyInfo(s).done).length + (dailyBonusReady()?1:0);
}
// announce newly finished objectives / quests exactly once
function questScan(){
  const V = V2(); V.q.objDone = V.q.objDone || {};
  const tq = trackedQuest();
  QUESTS.forEach(q=>{
    const st = qStatus(q); if(st==='locked' || st==='claimed') return;
    V.q.act = V.q.act || {};
    const fresh = !V.q.act[q.id]; V.q.act[q.id] = 1;       // just unlocked: what's already done is not news
    if(q===tq || q.type==='main' || fresh){
      qObjs(q).forEach((o,i)=>{ const k = q.id+'#'+i; if(o.done && !V.q.objDone[k]){ V.q.objDone[k] = 1; if(st!=='ready' && !fresh) note('obj', `☑ ${esc(o.txt)}`); } });
    }
    if(st==='ready' && !V.q.done[q.id]){ V.q.done[q.id] = Date.now(); note('quest', `📜 ภารกิจสำเร็จ: <b>${esc(q.title)}</b> — ไปรับรางวัลได้เลย`); }
  });
  const D = dailyEnsure();
  D.slots.forEach(s=>{ const inf = dailyInfo(s); if(inf && inf.done && !s.done){ s.done = true; note('daily', `🗓 ภารกิจประจำวันสำเร็จ: ${esc(inf.txt)}`); } });
  try{ checkAchievements(); }catch(e){}
  persist();
  if(!inBattle() && typeof refreshChrome==='function') refreshChrome();
}
QL2.bus.push(questScan);

/* ------------------------------ trophies ------------------------------ */
// keep the 8 original achievements, give them rarity + progress, and add a trophy room's worth more
const RAR = { 1:{ k:'common', th:'ธรรมดา' }, 2:{ k:'rare', th:'หายาก' }, 3:{ k:'epic', th:'มหากาพย์' }, 4:{ k:'legend', th:'ตำนาน' } };
const TMETA = {
  word10:{ r:1, p:()=>[save.stats.words,10], ic:'✍️' }, word100:{ r:2, p:()=>[save.stats.words,100], ic:'📜' },
  combo5:{ r:1, p:()=>[save.stats.bestCombo,5], ic:'🔥' }, crit10:{ r:2, p:()=>[save.stats.crit||0,10], ic:'💥' },
  golden:{ r:1, p:()=>[save.stats.golden||0,1], ic:'🪙' }, boss3:{ r:2, p:()=>[save.stats.bosses,3], ic:'💀' },
  ult5:{ r:1, p:()=>[save.stats.ultimates||0,5], ic:'⚡' }, words7:{ r:2, p:()=>[(save.stats.longest||'').length,7], ic:'📏' },
};
const NEW_TROPHIES = {
  clr0:{ th:'ผู้พิชิตสุสานที่ถูกลืม', d:'ผ่านครบ 8 ด่านของ Forgotten Cemetery', r:2, p:()=>[chapterCleared(0),8], ic:'🪦' },
  clr1:{ th:'ผู้พิชิตทุ่งดาว', d:'ผ่านครบ 8 ด่านของ Star Meadow', r:2, p:()=>[chapterCleared(1),8], ic:'🌟' },
  clr2:{ th:'ผู้พิชิตถ้ำน้ำแข็ง', d:'ผ่านครบ 8 ด่านของ Frozen Caverns', r:3, p:()=>[chapterCleared(2),8], ic:'❄️' },
  clr3:{ th:'ผู้พิชิตป้อมเปลวเพลิง', d:'ผ่านครบ 8 ด่านของ Flame Fortress', r:3, p:()=>[chapterCleared(3),8], ic:'🏰' },
  clr4:{ th:'ผู้ปราบจอมเวทมรณะ', d:"ผ่านครบ 8 ด่านของ Necromancer's Grave", r:4, p:()=>[chapterCleared(4),8], ic:'🌙' },
  tower10:{ th:'ชั้นที่ 10', d:'ปีนหอคอยไร้สิ้นสุดถึงชั้น 10', r:2, p:()=>[save.tower.best||0,10], ic:'🗼' },
  tower25:{ th:'เหนือเมฆ', d:'ปีนหอคอยไร้สิ้นสุดถึงชั้น 25', r:3, p:()=>[save.tower.best||0,25], ic:'☁️' },
  tower50:{ th:'ราชันย์หอคอย', d:'ปีนหอคอยไร้สิ้นสุดถึงชั้น 50', r:4, p:()=>[save.tower.best||0,50], ic:'👑', title:'towerlord' },
  word500:{ th:'นักสะกดตัวยง', d:'สะกดคำสำเร็จ 500 คำ', r:3, p:()=>[save.stats.words,500], ic:'📚' },
  word1000:{ th:'พันถ้อยคำ', d:'สะกดคำสำเร็จ 1,000 คำ', r:4, p:()=>[save.stats.words,1000], ic:'🏛️', title:'wordsage' },
  combo10:{ th:'Combo x10', d:'ทำคอมโบถึง 10', r:2, p:()=>[save.stats.bestCombo,10], ic:'🔥' },
  combo20:{ th:'สายฟ้าไม่หยุด', d:'ทำคอมโบถึง 20', r:3, p:()=>[save.stats.bestCombo,20], ic:'⚡', title:'combo' },
  heroes3:{ th:'ทีมเล็กๆ', d:'มีนักสู้ 3 คน', r:2, p:()=>[save.chars.length,3], ic:'🛡️' },
  heroesAll:{ th:'ครบทีม', d:'ปลดล็อกนักสู้ครบทุกคน', r:4, p:()=>[save.chars.length,CHARACTERS.length], ic:'🎖️', title:'collector' },
  master5:{ th:'ปรมาจารย์ถ้อยคำ', d:'มีคำที่ Mastery Lv.5 จำนวน 5 คำ', r:3, p:()=>[Object.keys(save.mastery||{}).filter(w=>masteryInfo(w).lv>=5).length,5], ic:'🧠', title:'wordmaster' },
  elemAll:{ th:'เก้าธาตุ', d:'ใช้คำธาตุครบทั้ง 9 ชนิด', r:3, p:()=>[BASE_ELEMS.filter(e=>V2().elem[e]).length,9], ic:'🔮', title:'elemental' },
  puzzle10:{ th:'นักไขปริศนา', d:'ไขปริศนาคำศัพท์ถูก 10 ครั้ง', r:2, p:()=>[V2().stats.puzzles,10], ic:'🧩', title:'scholar' },
  pzPerfect:{ th:'ไม่พลาดสักตัว', d:'ไขปริศนาถูกตั้งแต่ครั้งแรก 5 ครั้ง', r:2, p:()=>[V2().stats.perfect,5], ic:'🎯' },
  stars:{ th:'ดาวเต็มฟ้า', d:'เก็บ 3 ดาวครบทุกด่าน', r:4, p:()=>[starsTotal(), CHAPTERS.length*STAGES_PER*3], ic:'✨', title:'perfect' },
  adv10:{ th:'นักผจญภัยตัวจริง', d:'Adventure Level 10', r:2, p:()=>[advInfo(V2().adv.xp).lv,10], ic:'🧭' },
  adv25:{ th:'ตำนานแห่งแสงจันทร์', d:'Adventure Level 25', r:3, p:()=>[advInfo(V2().adv.xp).lv,25], ic:'🌕' },
  golden10:{ th:'มือทอง', d:'ปราบ Golden Monster 10 ตัว', r:3, p:()=>[save.stats.golden||0,10], ic:'💰' },
  mats100:{ th:'กระเป๋าไม่เคยว่าง', d:'เก็บวัตถุดิบรวม 100 ชิ้น', r:2, p:()=>[V2().stats.mats,100], ic:'🎒' },
  mainAll:{ th:'ผู้พิทักษ์ตำนาน', d:'ทำภารกิจหลักครบทุกบท', r:4, p:()=>[MAIN.filter(q=>V2().q.claimed[q.id]).length, MAIN.length], ic:'📖', title:'lorekeeper' },
  rude:{ th:'So Rude!', d:'??? (ความลับ)', dOpen:'ใช้คำหยาบโจมตีศัตรู', r:2, p:()=>[V2().stats.rude,1], ic:'🤬', secret:true, title:'rude' },
};
Object.entries(NEW_TROPHIES).forEach(([id,t])=>{ ACH[id] = { th:t.th, d:t.d, need:()=>{ try{ const [a,b] = t.p(); return a>=b; }catch(e){ return false; } } }; TMETA[id] = t; });
function trophyOf(id){ const a = ACH[id], m = TMETA[id]||{ r:1 }; let pr = [0,1]; try{ pr = m.p ? m.p() : [save.achievements[id]?1:0,1]; }catch(e){}
  return { id, th:a.th, d:(m.secret && !save.achievements[id]) ? a.d : (m.dOpen||a.d), r:m.r||1, ic:m.ic||'🏆', title:m.title, secret:!!m.secret, on:!!save.achievements[id], at:save.achievements[id], cur:Math.min(pr[0]||0, pr[1]), need:pr[1] }; }
// unlocking a trophy that carries a title gives the title too
unlockAch = (f=>function(id){
  const had = !!save.achievements[id];
  f(id);
  try{ const m = TMETA[id]; if(!had && save.achievements[id] && m && m.title){ const V = V2(); if(!V.titles.own.includes(m.title)){ V.titles.own.push(m.title); persist(); note('title', `🎖 ได้รับฉายา "${esc(TITLES[m.title].th)}"`); } } }catch(e){}
})(unlockAch);
