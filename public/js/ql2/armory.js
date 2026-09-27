/* ==========================================================================
   QUEST LINES — ARMORY UPDATE
   Weapon / armor icons from public/items/ and 11 new weapons, each with a
   word-based ability that fits the spelling combat. Perks are applied by
   wrapping evalWord / enemyHurt / enemyDies — the battle code is untouched.
   ========================================================================== */
const ITEM_ICON_V = 1;
const ITEM_IMG = { wood:1, iron:1, axe:1, hammer:1, staff:1, flame:1, thunder:1, boomer:1, gerudo:1, moon:1, sickle:1, frost:1, storm:1, guardian:1, royal:1, savage:1, ancient:1, master:1 };
const ARMOR_IMG = { buckler:'a_buckler', kite:'a_kite', dragon:'a_dragon', mythril:'a_mythril' };

WEAPONS.push(
  { id:'boomer',  name:'Boomerang',          th:'บูมเมอแรง',            atk:8,  price:450,  perk:'echo',    perkTh:'คำ 5 ตัวอักษรขึ้นไป บูมเมอแรงวกกลับตีซ้ำ ดาเมจ x1.4' },
  { id:'gerudo',  name:'Gerudo Scimitar',    th:'ดาบโค้งเกรูโด',        atk:10, price:800,  perk:'twin',    perkTh:'คำที่มีตัวอักษรซ้ำติดกัน (เช่น LL, EE, SS) ฟันคู่ x1.5' },
  { id:'moon',    name:"Scholar's Scimitar", th:'ดาบจันทร์นักปราชญ์',    atk:11, price:1000, perk:'scholar', perkTh:'คำศัพท์เป้าหมาย ⭐ แรงขึ้นอีก x1.5 — อาวุธของนักเรียนตัวจริง' },
  { id:'sickle',  name:'Moonlit Sickle',     th:'เคียวราตรี',            atk:13, price:1400, perk:'reap',    perkTh:'ศัตรู HP ต่ำกว่า 30% เก็บเกี่ยวดาเมจ x1.6' },
  { id:'frost',   name:'Frostblade',         th:'ดาบน้ำแข็ง',            atk:14, price:1700, perk:'freeze',  perkTh:'20% แช่แข็งศัตรู ข้าม 1 เทิร์น' },
  { id:'storm',   name:'Lightning Blade',    th:'ดาบอัสนี',              atk:16, price:2400, perk:'chain',   perkTh:'30% ฟ้าผ่าตามอีกครั้ง 50% ของดาเมจ' },
  { id:'guardian',name:'Guardian Sword',     th:'ดาบผู้พิทักษ์',          atk:17, price:2700, perk:'combo',   perkTh:'ดาเมจ +6% ต่อคอมโบ (สูงสุด +48%)' },
  { id:'royal',   name:'Royal Claymore',     th:'ดาบใหญ่ราชวงศ์',        atk:20, price:3600, perk:'gold',    perkTh:'ทองจากศัตรู +30%' },
  { id:'savage',  name:'Lynel Crusher',      th:'ค้อนไลเนล',             atk:24, price:4500, perk:'heavy',   perkTh:'หนักมาก: คำ 3 ตัว x0.5 · คำ 6 ตัวขึ้นไป x1.3' },
  { id:'ancient', name:'Ancient Bladesaw',   th:'เลื่อยโบราณ',            atk:26, price:6000, perk:'ancient', perkTh:'คำ 6–7 ตัวอักษรก็เป็น CRITICAL WORD (x1.75)' },
  { id:'master',  name:'Master Sword',       th:'ดาบผู้กล้า',             atk:30, price:8000, perk:'master',  perkTh:'HP 90% ขึ้นไป ปล่อยลำแสง x1.5 · คำธาตุแสงใส่ผี/โครงกระดูก x2', req:()=>storyDone(), reqTh:'จบเนื้อเรื่องหลักก่อน' },
);
WEAPONS.sort((a,b)=>a.price-b.price);
const wpLocked = w=>!!(w.req && !w.req() && !save.weapons.includes(w.id));

/* icons */
weaponIcon = (f=>function(id){ return ITEM_IMG[id] ? `<img class="wicon witem" src="items/${id}.png?v=${ITEM_ICON_V}" alt="" draggable="false">` : f(id); })(weaponIcon);
shieldIcon = (f=>function(id){ return ARMOR_IMG[id] ? `<img class="wicon witem" src="items/${ARMOR_IMG[id]}.png?v=${ITEM_ICON_V}" alt="" draggable="false">` : f(id); })(shieldIcon);
// code-drawn heroes (none in the current roster) keep a drawn blade for new weapons
Object.keys(ITEM_IMG).forEach(id=>{ if(!WEAPON_ART[id]) WEAPON_ART[id] = WEAPON_ART[{ boomer:'wood', gerudo:'iron', moon:'iron', sickle:'axe', frost:'iron', storm:'thunder', guardian:'thunder', royal:'flame', savage:'hammer', ancient:'flame', master:'thunder' }[id]] || WEAPON_ART.wood; });

/* perks */
evalWord = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat;
  if(!b || r.state!=='ok' || !r.dmg) return r;
  const wp = curWp(), e = curEnemy(), len = r.w.length; let m = 1;
  switch(wp.perk){
    case 'echo':    if(len>=5){ m *= 1.4; r.notes.push('🪃 บูมเมอแรง x1.4'); } break;
    case 'twin':    if(/(.)\1/.test(r.w)){ m *= 1.5; r.notes.push('⚔️ ฟันคู่ x1.5'); } break;
    case 'scholar': if(r.bank){ m *= 1.5; r.notes.push('🌙 นักปราชญ์ x1.5'); } break;
    case 'reap':    if(e && e.hp <= e.maxHp*.3){ m *= 1.6; r.notes.push('🌑 เก็บเกี่ยว x1.6'); } break;
    case 'combo':   if(b.combo>0){ const c = 1 + Math.min(8,b.combo)*.06; m *= c; r.notes.push(`🛡 ผู้พิทักษ์ x${c.toFixed(2)}`); } break;
    case 'heavy':   if(len===3){ m *= .5; r.notes.push('🔨 หนักเกินไป x0.5'); } else if(len>=6){ m *= 1.3; r.notes.push('🔨 ทุบหนัก x1.3'); } break;
    case 'ancient': if(len>=6 && !r.crit){ m *= 1.75; r.crit = true; r.notes.push('⚙️ CRITICAL WORD! (โบราณ)'); } break;
    case 'master':  if(b.hp >= b.max*.9){ m *= 1.5; r.notes.push('✨ ลำแสงผู้กล้า x1.5'); } if(r.el==='holy' && e && UNDEAD.has(e.art)){ m *= 2; r.notes.push('✨ แสงศักดิ์สิทธิ์ x2'); } break;
  }
  if(m!==1) r.dmg = Math.max(1, Math.round(r.dmg*m));
  return r;
})(evalWord);

let _armoryHit = false;
enemyHurt = (f=>function(dmg, big){
  const r = f.apply(this, arguments);
  if(_armoryHit) return r;
  try{
    const b = ui.bat, e = curEnemy(), wp = curWp(); if(!b || !e || e.hp<=0 || !b.busy) return r;
    if(wp.perk==='freeze' && Math.random()<.2 && !e.frozen){ e.frozen = 1; floatText('❄ แช่แข็ง!', EN_X, FLOOR_Y-e.h*e.sc-70, '#bff6ff', 24); try{ sfx.elem('ice'); updateEnemyStatus(); }catch(err){} }
    if(wp.perk==='chain' && Math.random()<.3){
      const d = Math.max(1, Math.round(Number(dmg)*.5)); if(!d) return r;
      _armoryHit = true;
      setTimeout(()=>{ try{ if(ui.bat===b && e.hp>0){ lightningBolt(); sfx.elem('thunder'); e.hp -= d; b.score += d; f(d, false); updateEnemyHp(); renderEnemyPanel(); } }catch(err){} _armoryHit = false; }, 220);
    }
  }catch(err){ _armoryHit = false; }
  return r;
})(enemyHurt);

enemyDies = (f=>async function(){
  const e = curEnemy();
  if(e && !e._royal && curWp().perk==='gold'){ e._royal = true; e.gold = Math.round(e.gold*1.3); }
  return f.apply(this, arguments);
})(enemyDies);

/* Master Sword needs the story finished */
ACTS2.buyW = function(v){ const w = W(v); if(!w || w.id!==v) return; if(wpLocked(w)){ toast(`🔒 ${esc(w.reqTh)}`); return; } return false; };
