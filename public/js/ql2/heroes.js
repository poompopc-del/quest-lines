/* ==========================================================================
   QUEST LINES — HEROES
   v26: the artwork leads. Name · element · class · level, then HP / ATK /
   DEF, a one-line Passive and Ultimate and Word Mastery. Lore, the full
   skill text, element notes and rank live behind [DETAILS]. Tabs:
   Overview · Equipment · Training (the existing per-hero upgrades).
   ========================================================================== */
const HERO_EXTRA = {
  pip:    { el:'wind',    elNote:'สายลม — นักดาบคล่องแคล่ว (ใช้คำธาตุได้ทุกชนิด)', ult:'ท่าไม้ตาย: คำ 5 ตัวอักษรขึ้นไปใช้ท่าฟันพิเศษอัตโนมัติ', lore:'เด็กหนุ่มหมวกเขียวจากหมู่บ้านริมทะเล ผู้เชื่อว่าคำพูดคือดาบที่คมที่สุด' },
  puff:   { el:'holy',    elNote:'แสง — ก้อนชมพูผู้กลืนพลังศัตรู (ใช้คำธาตุได้ทุกชนิด)', ult:'ท่าไม้ตาย: คำ 5 ตัวอักษรขึ้นไปใช้ท่าพิเศษอัตโนมัติ · สูบศัตรูแล้วก๊อปพลัง', lore:'ก้อนสีชมพูจากดาวที่ห่างไกล สูบได้ทุกอย่าง ยกเว้นคำที่สะกดผิด' },
  boomtos:{ el:'fire',    elNote:'ไฟนรก — ทุกการโจมตีเผาไหม้ด้วยดาบหลอมนรก', ult:'ท่าไม้ตาย BOOM: สะกด B-O-O-M ฆ่าศัตรูทันที ดาเมจเกินทะลุตัวถัดไป · ชื่อเทพกรีกมีพลังพิเศษ', lore:'ผู้พิทักษ์ไฟใต้พิภพ โทสะของเขาเพิ่มขึ้นเป็นเท่าตัวทุกเทิร์น' },
  elon:   { el:'thunder', elNote:'สายฟ้า — มือปืนผู้เร็วกว่ากระสุน (ใช้คำธาตุได้ทุกชนิด)', ult:'🔥 Quick Shot (ชาร์จ 3 คำ) ยิงคำเป็นกระสุน · 🥽 Agent\'s Focus (ชาร์จ 6 คำ) ไฮไลต์ตัวอักษร + Critical', lore:'สายลับผู้พกอาวุธทุกชนิด ยิ่งคอมโบสูง อาวุธยิ่งใหญ่' },
  mao:    { el:'fire',    elNote:'ไฟ — คำธาตุไฟแรง x1.3 และทุกการโจมตีทำให้ติดไฟ', ult:'ระบำมังกรเพลิง: คำ 7 ตัวอักษรขึ้นไป x1.5 · คำ 5+ ขว้างพัดไฟ', lore:'นักระบำพัดไฟ เคลื่อนไหวเร็วจนศัตรูตีโดนแค่เงา' },
  x:      { el:'thunder', elNote:'พลาสมา — บัสเตอร์ชาร์จพลังงาน (ใช้คำธาตุได้ทุกชนิด)', ult:'X-Buster: ชาร์จเก็บดาเมจไม่จำกัดแล้วยิงทีเดียว · ชาร์จ x3+ ปล่อย HADOUKEN · ชาร์จ x4+ ยิงทะลุถึงศัตรูตัวถัดไป (x4=1 ตัว, x5=2 ตัว, …)', lore:'นักรบจากอนาคตที่เทเลพอร์ตลงสนาม ชาร์จได้ไม่มีขีดจำกัด' },
};
function heroStats(id){
  const u = UP(id), c = CH(id), wp = id==='boomtos' ? HELLBLADE : W(save.eq.weapon), ar = AR(save.eq.armor);
  const atkM = 1 + u.atk*.08, taken = (1-ar.block)*(1-u.def*.03)*(typeof c.dmgTaken==='number' ? c.dmgTaken : 1);
  return { hp:maxHpOf(id), atk:Math.round(wp.atk*atkM*10)/10, atkM, wp, ar, red:Math.round((1-taken)*100), slots:2+u.slot, u };
}
// the first clause of a long description — the rest lives behind DETAILS
const shortTxt = (t, n)=>{ t = String(t||'').split(/\s*·\s*/)[0]; n = n||70; return t.length>n ? t.slice(0,n-1).trim()+'…' : t; };
function wordMasteryHtml(id, compact){
  const M = (typeof wmOf==='function') ? wmOf(id) : { n:0, perfect:0, best:0, longest:0 };
  const cell = (v,l)=>`<div><b>${v}</b><small>${l}</small></div>`;
  return `<div class="panel hs-wm${compact?' compact':''}"><span class="hs-k">WORD MASTERY</span><div class="hs-wmg">${cell(fmt(M.n),'Words Typed')}${cell(fmt(M.perfect),'Perfect Words')}${cell(fmt(M.best),'Best Streak')}${cell(M.longest||'—','Longest Word')}</div></div>`;
}
function renderHeroes(){
  const list = CHARACTERS, ids = list.map(c=>c.id);
  let pick = ui.hsPick && ids.includes(ui.hsPick) ? ui.hsPick : save.eq.char; ui.hsPick = pick;
  const i = ids.indexOf(pick), prev = list[(i-1+list.length)%list.length], next = list[(i+1)%list.length];
  const c = CH(pick), F = fighterOf(pick), own = save.chars.includes(pick), eq = save.eq.char===pick, X = HERO_EXTRA[pick] || { el:'holy', elNote:'', ult:'', lore:'' };
  const hi = heroInfo(pick), S = heroStats(pick);
  let tab = ui.hsTab || 'stats'; if(tab==='skills') tab = 'stats';
  const cta = eq ? `<div class="fs-owned">✓ นักสู้ที่ใช้อยู่</div>`
    : own ? `<button class="cbtn gold block" data-act="equipC" data-v="${c.id}">⚔ เลือกนักสู้คนนี้</button>`
    : `<button class="cbtn red block" data-act="buyC" data-v="${c.id}" ${save.gold<c.price?'disabled':''}>${ICON.coin} ปลดล็อก ${fmt(c.price)}</button>`;
  let body = '';
  if(tab==='stats'){
    const skills = String(c.desc||'').split(/\s*·\s*/).filter(Boolean);
    const tile = (ic, lab, val, sub)=>`<div class="hs-st"><small>${ic} ${lab}</small><b>${val}</b>${sub?`<em>${sub}</em>`:''}</div>`;
    body = `<div class="hs-stats">${tile(ICON.heart,'HP',S.hp,'')}${tile(ICON.sword,'ATK',S.atk,`${S.wp.atk} × ${S.atkM.toFixed(2)}`)}${tile(ICON.shield,'DEF',`${S.red}%`,'ลดดาเมจ')}</div>
      <div class="hs-skills">
        <div class="panel hs-sk"><span class="hs-k">PASSIVE</span><b>${esc(c.skill)}</b><p>${esc(shortTxt(skills[0]||'', 64))}</p></div>
        <div class="panel hs-sk ult"><span class="hs-k">⚡ ULTIMATE</span><b>Ultimate Attack</b><p>${esc(shortTxt(X.ult||'สะกดคำ 5 ครั้งติดเพื่อชาร์จเกจ ⚡', 64))}</p></div>
      </div>
      ${wordMasteryHtml(pick)}
      <button class="cbtn wood block hs-details" data-act="hsDetails" data-v="${pick}">DETAILS · สกิล · ตำนาน</button>
      ${eq ? `<details class="hs-atk" ${ui.hsAtkOpen?'open':''}><summary>⚔️ ท่าโจมตี <small>ตั้งค่าท่าที่ใช้ตอนโจมตี</small></summary>${atkPicker()}</details>` : ''}`;
  } else if(tab==='gear'){
    const boom = pick==='boomtos';
    body = `<div class="panel hs-gear">
      <button class="hs-slot" data-act="invTab" data-v="weapon" ${boom?'disabled':''}><span class="hs-si">${boom?'🔥':weaponIcon(save.eq.weapon)}</span><span><small>อาวุธ · Weapon</small><b>${esc(S.wp.th)}</b><em>ATK ${S.wp.atk}${boom?' · ดาบประจำตัว (เปลี่ยนไม่ได้)':''}</em></span>${boom?'':IC2.next}</button>
      <button class="hs-slot" data-act="invTab" data-v="armor"><span class="hs-si">${save.eq.armor==='none'?'👕':shieldIcon(save.eq.armor)}</span><span><small>ชุดเกราะ · Armor</small><b>${esc(S.ar.th)}</b><em>กันดาเมจ ${Math.round(S.ar.block*100)}%${S.ar.hp?` · HP +${S.ar.hp}`:''}</em></span>${IC2.next}</button>
      ${[0,1,2,3].map(k=>{ if(k>=S.slots) return `<div class="hs-slot locked"><span class="hs-si">${ICON.lock}</span><span><small>ช่องเสริม ${k+1}</small><b>ล็อก</b><em>ปลดล็อกได้ที่แท็บ "ฝึกฝน"</em></span></div>`;
        const a = save.acc[k]; return `<button class="hs-slot" data-act="invTab" data-v="acc"><span class="hs-si">${a?ACC_ART[a]:'+'}</span><span><small>ช่องเสริม ${k+1} · Accessory</small><b>${a?esc(ACC(a).th):'ว่าง'}</b><em>${a?esc(ACC(a).desc):'แตะเพื่อเลือกไอเทมเสริม'}</em></span>${IC2.next}</button>`; }).join('')}
      </div><p class="sub">อาวุธ ชุดเกราะ และไอเทมเสริมใช้ร่วมกันทุกนักสู้ · จำนวนช่องเสริมเป็นของแต่ละคน</p>`;
  } else {
    const prevUp = ui.upChar; ui.upChar = pick;
    body = own ? renderUpgrades().replace(/<div class="chip-row"[\s\S]*?<\/div>/, '') : `<p class="sub">ปลดล็อก ${esc(c.name)} ก่อนเพื่อฝึกฝน</p>`;
    ui.upChar = prevUp;
  }
  const tabs = [['stats','ภาพรวม'],['gear','อุปกรณ์'],['train','ฝึกฝน']];
  return `<div class="hs v26" style="--fc:${F.c}">
    <div class="hs-stage" id="hsStage">
      <div class="hs-bgname" aria-hidden="true">${esc(c.name)}</div>
      <button class="hs-arrow l" data-act="hsPick" data-v="${prev.id}" aria-label="ก่อนหน้า: ${esc(prev.name)}">${IC2.back}</button>
      <div class="hs-hero ${own?'':'locked'}">${rockLedge()}${heroStandalone(Object.assign({}, save.eq, { char:pick }))}</div>
      <button class="hs-arrow r" data-act="hsPick" data-v="${next.id}" aria-label="ถัดไป: ${esc(next.name)}">${IC2.next}</button>
      ${own?'':`<div class="hs-lockt">${ICON.lock} ยังไม่ปลดล็อก</div>`}
    </div>
    <div class="hs-id">
      <h2 class="hs-name">${esc(c.name)}</h2>
      <div class="hs-tags"><span class="hs-tag el-${X.el}">${ELEM_ICON[X.el]} ${ELEMENTS[X.el].name}</span><span class="hs-tag">${esc(c.role)}</span></div>
      <div class="hs-lv"><span class="hs-lvb">Lv ${hi.lv}</span><div class="hs-xp"><i style="width:${hi.pct}%"></i></div><small>${hi.lv>=HLV.cap?'MAX':`${fmt(hi.into)}/${fmt(hi.need)} EXP`}</small></div>
      <div class="hs-cta">${cta}</div>
    </div>
    <div class="q2-anchor"></div><div class="seg q2-tabs">${tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="hsTab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="hs-body">${body}</div>
    <div class="fs-roster hs-roster" style="grid-template-columns:repeat(${list.length},minmax(0,1fr))">${list.map(x=>{ const o = save.chars.includes(x.id), f = fighterOf(x.id);
      return `<button class="fs-card ${x.id===pick?'on':''} ${o?'':'locked'} ${save.eq.char===x.id?'eq':''}" style="--fc:${f.c}" data-act="hsPick" data-v="${x.id}"><span class="fc-face">${heroFaceSvg(Object.assign({}, save.eq, { char:x.id }))}</span><b>${esc(x.name)}</b><small>${o?(save.eq.char===x.id?'ใช้อยู่':`Lv ${heroInfo(x.id).lv}`):`${ICON.coin}${fmt(x.price)}`}</small></button>`; }).join('')}</div>
  </div>`;
}
// everything long — lore, full passive list, ultimate rules, element, mastery rank — in one sheet
function heroDetails(id){
  const c = CH(id), F = fighterOf(id), X = HERO_EXTRA[id] || { el:'holy', elNote:'', ult:'', lore:'' }, hi = heroInfo(id), nextRank = HLV.ranks[hi.rank+1];
  const skills = String(c.desc||'').split(/\s*·\s*/).filter(Boolean);
  modal(`<div class="hs-sheet" style="--fc:${F.c}"><div class="hs-sh-head"><span class="fc-face">${heroFaceSvg(Object.assign({}, save.eq, { char:id }))}</span><div><span class="q2-kicker">HERO DETAILS</span><h3>${esc(c.name)}</h3><small>${esc(c.th)} · ${esc(c.role)} · ความยาก <b style="color:${F.c}">${DIFF_TH[F.diff]}</b></small></div><button class="q2-x" data-act="closeModal" aria-label="ปิด">${IC2.close}</button></div>
    <div class="hs-sh-body">
      <h4>PASSIVE · ${esc(c.skill)}</h4><ul>${skills.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
      <h4>⚡ ULTIMATE</h4><ul><li>สะกดคำ 5 ครั้งติดเพื่อชาร์จเกจ ⚡ แล้วกดปุ่ม Ultimate ในการต่อสู้</li>${X.ult?`<li>${esc(X.ult)}</li>`:''}</ul>
      <h4>ธาตุ · ${ELEM_ICON[X.el]} ${ELEMENTS[X.el].name}</h4><p>${esc(X.elNote)}</p>
      <h4>Hero Rank · ${hi.R.th} <small>${hi.R.thTh}</small></h4><div class="hs-ranks">${HLV.ranks.map((r,k)=>`<i class="${k<=hi.rank?'on':''}" title="${r.th} Lv${r.lv}"></i>`).join('')}</div><p>${nextRank?`ถึง Lv ${nextRank.lv} เพื่อเป็น ${nextRank.th}`:'ถึงระดับสูงสุดแล้ว!'}</p>
      <h4>บันทึกนักสู้</h4><p class="hs-lorep">${esc(X.lore)}</p>
    </div>
    <div class="btns"><button class="cbtn gold block" data-act="closeModal">ปิด</button></div></div>`, { dismiss:true });
  const m = document.querySelector('#overlay .modal'); if(m) m.classList.add('hs-modal');
}
SCREENS.heroes = { nav:'heroes', render:renderHeroes, key:()=>ui.hsPick||'', after:()=>{
  const at = document.querySelector('.hs-atk'); if(at) at.addEventListener('toggle', ()=>{ ui.hsAtkOpen = at.open; });
  const st = $('#hsStage'); if(!st) return;
  let x0 = null, y0 = null;
  st.addEventListener('touchstart', e=>{ const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive:true });
  st.addEventListener('touchend', e=>{ if(x0===null) return; const t = e.changedTouches[0], dx = t.clientX-x0, dy = t.clientY-y0; x0 = null;
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) heroStep(dx<0 ? 1 : -1); }, { passive:true });
} };
function heroStep(d){
  const ids = CHARACTERS.map(c=>c.id), i = ids.indexOf(ui.hsPick||save.eq.char);
  ui.hsPick = ids[(i+d+ids.length)%ids.length]; sfx.tap && sfx.tap(2);
  const h = document.querySelector('.hs-hero'); if(h && save.settings.anim!==false){ h.classList.add(d>0?'sw-l':'sw-r'); setTimeout(render, 140); } else render();
}
Object.assign(ACTS2, {
  hsPick: v=>{ const ids = CHARACTERS.map(c=>c.id), a = ids.indexOf(ui.hsPick||save.eq.char), b = ids.indexOf(v); if(a===b) return; heroStep(b-a); },
  hsTab: v=>{ ui.hsTab = v; tabRender(); },
  hsDetails: v=>{ heroDetails(v); sfx.tap && sfx.tap(2); },
});
// equipping / buying keeps that fighter on screen
document.addEventListener('click', ev=>{ const el = ev.target.closest && ev.target.closest('[data-act="equipC"],[data-act="buyC"]'); if(el) ui.hsPick = el.dataset.v; }, true);
