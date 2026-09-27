/* ==========================================================================
   QUEST LINES 2.0 — HERO HUB (Moonlit Haven)
   Answers at a glance: where am I · what quest am I on · what to do next ·
   where can I get stronger. Every system is a "place" in the base.
   ========================================================================== */

// the base at night: big moon, sea, a keep on the cliff, a campfire — same moonlit palette as the title
const HUB_BG = ()=>{
  const r = mulberry(777), R = (a,b)=>a+r()*(b-a), f = v=>v.toFixed(1);
  let stars = '';
  for(let i=0;i<70;i++) stars += `<circle class="tstar" cx="${f(R(0,400))}" cy="${f(R(0,190))}" r="${f(R(.4,1.5))}" fill="${r()<.25?'#ffe3a3':'#fff'}" opacity="${f(R(.4,1))}" style="animation-delay:${f(R(0,3))}s"/>`;
  const win = (x,y)=>`<rect class="twin" x="${x}" y="${y}" width="4" height="6" rx="2" fill="#ffd27a" style="animation-delay:${f(R(0,2))}s"/>`;
  return `<svg class="title-bg hub-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07061a"/><stop offset=".45" stop-color="#1a1244"/><stop offset=".75" stop-color="#3a2a6a"/><stop offset="1" stop-color="#5a3a7a"/></linearGradient>
    <radialGradient id="hmoon" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fff1d0"/><stop offset="1" stop-color="#ffd27a"/></radialGradient>
    <radialGradient id="hhalo"><stop offset="0" stop-color="#ffe3a3" stop-opacity=".45"/><stop offset=".5" stop-color="#ff4d62" stop-opacity=".12"/><stop offset="1" stop-color="#ff4d62" stop-opacity="0"/></radialGradient>
    <linearGradient id="hsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2060"/><stop offset="1" stop-color="#0c0a26"/></linearGradient>
    <linearGradient id="hcliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2750"/><stop offset="1" stop-color="#0d0b1c"/></linearGradient>
    <radialGradient id="hfire"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ff4d62" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#hsky)"/>
  ${stars}
  <circle cx="250" cy="96" r="120" fill="url(#hhalo)"/>
  <circle cx="250" cy="96" r="54" fill="url(#hmoon)"/>
  ${[[-18,-12,9],[14,10,12],[-6,24,6],[24,-20,6]].map(([dx,dy,rr])=>`<circle cx="${250+dx}" cy="${96+dy}" r="${rr}" fill="#f0d8a0" opacity=".45"/>`).join('')}
  <g class="clouds"><path d="M-20,120 Q40,108 90,118 Q140,110 170,122 Q90,130 -20,126 Z" fill="#6a5aa0" opacity=".35"/><path d="M230,150 Q300,138 360,148 Q400,142 430,152 Q330,160 230,156 Z" fill="#8a6ab0" opacity=".3"/></g>
  <path d="M0,196 L40,170 L70,184 L110,160 L150,182 L190,168 L230,186 L260,172 L300,188 L340,170 L400,186 L400,210 L0,210 Z" fill="#241c4a"/>
  <rect x="0" y="206" width="400" height="94" fill="url(#hsea)"/>
  ${Array.from({length:14},(_,i)=>`<rect class="shim" x="${f(250-10-i*3+R(-6,6))}" y="${f(212+i*6)}" width="${f(20+i*6)}" height="1.4" rx="1" fill="#ffe3a3" opacity="${f(.6-i*.035)}" style="animation-delay:${f(R(0,2))}s"/>`).join('')}
  <!-- keep on the right cliff -->
  <path d="M268,300 L276,214 Q300,204 330,206 Q360,204 384,212 L400,300 Z" fill="url(#hcliff)" stroke="#07060d" stroke-width="1.5"/>
  <g stroke="#07060d" stroke-width="1.4" stroke-linejoin="round">
    <rect x="296" y="150" width="62" height="60" fill="#2a2350"/>
    <rect x="286" y="126" width="22" height="84" fill="#342c62"/><path d="M283,128 L297,104 L311,128 Z" fill="#b0122e"/>
    <rect x="346" y="134" width="20" height="76" fill="#342c62"/><path d="M343,136 L356,112 L369,136 Z" fill="#b0122e"/>
    <rect x="314" y="118" width="26" height="40" fill="#3a3270"/><path d="M310,120 L327,90 L344,120 Z" fill="#ff3b4e"/>
    <path d="M327,90 L327,78 L338,82 L327,86" fill="#ffc83d"/>
    ${[296,304,312,320,328,336,344,352].map(x=>`<rect x="${x}" y="146" width="5" height="5" fill="#2a2350"/>`).join('')}
    <path d="M318,210 L318,190 Q327,180 336,190 L336,210 Z" fill="#120f24"/>
  </g>
  ${win(293,140)}${win(353,148)}${win(321,130)}${win(305,170)}${win(343,172)}${win(324,164)}
  <!-- the plateau the hero stands on -->
  <path d="M-10,300 L-10,238 Q40,222 110,226 Q170,222 230,232 Q262,240 270,300 Z" fill="url(#hcliff)" stroke="#07060d" stroke-width="1.5"/>
  <path d="M-10,238 Q40,222 110,226 Q170,222 230,232" stroke="#8f7fd0" stroke-width="1.6" fill="none" opacity=".7"/>
  <g fill="#3a7a5a" stroke="#07060d" stroke-width="1"><path d="M20,232 L23,220 L26,231 L30,216 L33,232 Z"/><path d="M214,234 L217,222 L220,233 L224,219 L227,235 Z"/></g>
  <!-- campfire -->
  <circle cx="54" cy="240" r="34" fill="url(#hfire)" class="w-glow"/>
  <g stroke="#07060d" stroke-width="1.4"><path d="M40,246 L68,238 M40,238 L68,246" stroke="#6a3a1a" stroke-width="4" stroke-linecap="round"/></g>
  <path class="w-flame" d="M46,242 Q44,230 52,222 Q52,230 56,230 Q58,220 62,216 Q66,232 62,242 Z" fill="#ffb347" stroke="#07060d" stroke-width="1.2"/>
  <path class="w-flame" d="M50,242 Q50,234 54,230 Q56,236 58,242 Z" fill="#fff1a0" style="animation-delay:.1s"/>
  <g class="embers">${Array.from({length:8},(_,i)=>`<circle cx="${f(50+R(-6,10))}" cy="${f(230+R(-4,6))}" r="${f(R(.8,1.6))}" fill="#ffb347" style="animation-delay:${f(R(0,5))}s;animation-duration:${f(R(4,7))}s"/>`).join('')}</g>
  <!-- quest board -->
  <g stroke="#07060d" stroke-width="1.3"><rect x="150" y="206" width="4" height="26" fill="#5a3a1a"/><rect x="176" y="206" width="4" height="26" fill="#5a3a1a"/><rect x="144" y="198" width="42" height="20" rx="2" fill="#8a5a2a"/>
    <rect x="149" y="201" width="10" height="13" fill="#f3e2b8"/><rect x="162" y="202" width="9" height="11" fill="#f3e2b8"/><rect x="174" y="201" width="8" height="12" fill="#ffe3a3"/></g>
</svg>`;
};

function hubFx(){
  const k = V2().fx.eq; if(!k || k==='none') return '';
  const n = { fireflies:14, embers:16, aurora:1, petals:18 }[k] || 0;
  if(k==='aurora') return `<div class="hub-fx fx-aurora" aria-hidden="true"><i></i><i></i></div>`;
  return `<div class="hub-fx fx-${k}" aria-hidden="true">${Array.from({length:n},(_,i)=>`<i style="left:${(i*53)%100}%;top:${(i*37)%80+10}%;animation-delay:${((i*.61)%4).toFixed(2)}s;animation-duration:${(4+(i%5)).toFixed(1)}s"></i>`).join('')}</div>`;
}

// "where can I get stronger / what's waiting for me"
function hubSuggestions(){
  const out = [], id = save.eq.char, u = UP(id);
  const adv = advUnclaimed();
  if(adv) out.push({ ic:IC2.star, t:`รับรางวัล Adventure Level (${adv})`, a:'go', v:'profile', hot:true });
  const qc = claimableCount();
  if(qc) out.push({ ic:IC2.scroll, t:`รับรางวัลภารกิจ ${qc} รายการ`, a:'go', v:'quests', hot:true });
  const ups = Object.entries(UPS).filter(([k,U])=>u[k]<U.max && k!=='slot').map(([k,U])=>({ k, U, c:U.cost(u[k]) })).sort((a,b)=>a.c-b.c)[0];
  if(ups && save.gold>=ups.c) out.push({ ic:ICON.sword, t:`ฝึก ${ups.U.en} ของ ${heroName(id)} (${fmt(ups.c)} ทอง)`, a:'heroTrain', v:id });
  const w = WEAPONS.filter(x=>!save.weapons.includes(x.id) && x.atk>curWp().atk && save.gold>=x.price).sort((a,b)=>b.atk-a.atk)[0];
  if(w && id!=='boomtos') out.push({ ic:ICON.sword, t:`ซื้ออาวุธใหม่: ${w.th} (ATK ${w.atk})`, a:'shopTab2', v:'weapon' });
  const h = CHARACTERS.find(c=>!save.chars.includes(c.id) && save.gold>=c.price);
  if(h) out.push({ ic:IC2.heroes, t:`ปลดล็อกนักสู้ ${h.name} ได้แล้ว!`, a:'heroPick', v:h.id });
  if(typeof craftable==='function' && craftable().length) out.push({ ic:IC2.anvil, t:'มีวัตถุดิบพอผสมยาแล้ว', a:'invTab', v:'mat' });
  if(!out.length){
    if(save.cleared>=8 && (save.tower.best||0)<10) out.push({ ic:IC2.tower, t:'ลองปีนหอคอยไร้สิ้นสุด', a:'goTower' });
    out.push({ ic:IC2.book, t:'ทบทวนคำศัพท์ในโคเด็กซ์', a:'go', v:'codex' });
  }
  return out.slice(0,3);
}

function renderHub(){
  const V = V2(), N = nextStage(), L = LOCS[N.ch], q = trackedQuest(), D = dailyEnsure();
  const hi = heroInfo(save.eq.char), c = CH(save.eq.char), F = (typeof fighterOf==='function' ? fighterOf(save.eq.char) : { c:'#ff3b4e' });
  const total = CHAPTERS.length*STAGES_PER;
  // current quest card
  let qc = '';
  if(q){
    const objs = qObjs(q), st = qStatus(q), next = objs.find(o=>!o.done) || objs[objs.length-1], nDone = objs.filter(o=>o.done).length;
    const kind = { main:'MAIN QUEST · ภารกิจหลัก', side:'SIDE QUEST · ภารกิจเสริม', chain:`QUEST CHAIN · ขั้น ${(q.step||0)+1}/${q.of||1}` }[q.type];
    qc = `<div class="panel hub-quest ${st==='ready'?'ready':''}" data-act="go" data-v="quests" role="button" tabindex="0">
      <div class="hq-k">${IC2.scroll}<span>${kind}</span><em>${nDone}/${objs.length}</em></div>
      <h3 class="hq-t">${esc(q.en||q.title)}${q.en?`<small>${esc(q.title)}</small>`:''}</h3>
      <div class="hq-loc">${IC2.pin}${esc(locLabel(q.loc))}</div>
      ${st==='ready' ? `<div class="hq-ready">✔ ทำครบทุกเป้าหมายแล้ว!</div><button class="cbtn gold block" data-act="qClaim" data-v="${q.id}">${IC2.star} รับรางวัล</button>`
        : `<div class="hq-obj"><span class="hq-box"></span><span>${esc(next.txt)}</span><b>${fmt(next.cur)}/${fmt(next.need)}</b></div><div class="q2-meter"><i style="width:${Math.round(next.cur/next.need*100)}%"></i></div>`}
      <div class="hq-rw"><small>รางวัล</small>${rewardPreview(q.reward)}</div>
    </div>`;
  }
  const cta = N.done
    ? `<button class="cbtn gold hub-play" data-act="goTower">${IC2.tower}<span><b>หอคอยไร้สิ้นสุด</b><small>ผ่านครบทุกบทแล้ว · สถิติ ${save.tower.best||0} ชั้น</small></span></button>`
    : `<button class="cbtn gold hub-play" data-act="playNext">${IC2.play}<span><b>${save.cleared?'ผจญภัยต่อ':'เริ่มผจญภัย'}</b><small>ด่าน ${N.ch+1}-${N.n} · ${esc(L.name)}${N.n===STAGES_PER?' · BOSS':''}</small></span></button>`;
  const dInf = D.slots.map(s=>({ s, i:dailyInfo(s) })).filter(x=>x.i);
  const dDone = dInf.filter(x=>x.s.claimed || x.i.done).length;
  const daily = `<button class="panel hub-daily" data-act="qTab" data-v="daily"><span class="hd-ic">🗓</span><span class="hd-t"><b>ภารกิจประจำวัน</b><small>${dailyBonusReady()?'หีบโบนัสพร้อมรับ!':`ทำแล้ว ${dDone}/${dInf.length} · รีเซ็ตเที่ยงคืน`}</small></span>
    <span class="hd-pips">${dInf.map(x=>`<i class="${x.s.claimed?'c':x.i.done?'d':''}"></i>`).join('')}</span>${IC2.next}</button>`;
  const sug = hubSuggestions();
  const cx = Object.keys(V.seen.mon).length, cxAll = Object.keys(MON).length, tro = Object.keys(ACH).filter(k=>save.achievements[k]).length;
  const bld = [
    ['world', IC2.gate, 'ประตูสู่โลก', 'World', `${save.cleared}/${total} ด่าน`],
    ['heroes', IC2.heroes, 'วิหารนักสู้', 'Heroes', `${save.chars.length}/${CHARACTERS.length} นักสู้`],
    ['inventory', IC2.bag, 'คลังสมบัติ', 'Inventory', 'ร้านค้า · วัตถุดิบ'],
    ['codex', IC2.book, 'หอสมุด', 'Codex', `${Object.keys(save.book||{}).length} คำ · ${cx}/${cxAll} มอน`],
    ['profile', IC2.trophy, 'หอเกียรติยศ', 'Profile', `${tro}/${Object.keys(ACH).length} ถ้วย`],
    ['tower', IC2.tower, 'หอคอยไร้สิ้นสุด', 'Tower', `สถิติ ${save.tower.best||0} ชั้น`],
  ];
  const bd = navBadges();
  return `<div class="hub">
    <section class="hub-scene" style="--fc:${F.c}">
      ${HUB_BG()}${hubFx()}
      <div class="hub-loc">${IC2.pin}<span><b>${HUB_NAME.name}</b><small>${HUB_NAME.th} · แนวหน้า: ${esc(N.done?'Endless Tower':L.name)}</small></span></div>
      <button class="hub-spot s-quest" data-act="go" data-v="quests" aria-label="กระดานภารกิจ">${IC2.scroll}<span>กระดานภารกิจ</span>${claimableCount()?`<em class="q2-badge">${claimableCount()}</em>`:''}</button>
      <button class="hub-spot s-gate" data-act="go" data-v="world" aria-label="แผนที่โลก">${IC2.gate}<span>ประตูสู่โลก</span></button>
      <button class="hub-hero" data-act="go" data-v="heroes" aria-label="ไปที่วิหารนักสู้">${rockLedge()}${heroStandalone(save.eq)}</button>
      <div class="hub-tag"><b>${esc(c.name)}</b><span>Lv ${hi.lv} · ${hi.R.th}</span></div>
    </section>
    <section class="hub-panel">
      ${qc}
      ${cta}
      ${daily}
      ${sug.length?`<div class="hub-sug"><h4>พัฒนาตัวละคร · ทำอะไรต่อดี?</h4>${sug.map(s=>`<button class="hs-item ${s.hot?'hot':''}" data-act="${s.a}" ${s.v?`data-v="${s.v}"`:''}>${s.ic}<span>${esc(s.t)}</span>${IC2.next}</button>`).join('')}</div>`:''}
      <div class="hub-bld">${bld.map(([k,ic,th,en,st])=>`<button class="hb-b b-${k}" data-act="${k==='tower'?'goTower':'go'}" ${k==='tower'?'':`data-v="${k}"`}>${ic}<b>${th}</b><small>${en} · ${esc(st)}</small>${bd[k]?`<em class="q2-badge${bd[k]==='!'?' dot':''}">${bd[k]==='!'?'':bd[k]}</em>`:''}</button>`).join('')}</div>
    </section>
  </div>`;
}
SCREENS.hub = { nav:'hub', full:true, render:renderHub };
Object.assign(ACTS2, {
  heroTrain: v=>{ ui.hsPick = v; ui.hsTab = 'train'; goTo('heroes'); },
  heroPick: v=>{ ui.hsPick = v; ui.hsTab = 'stats'; goTo('heroes'); },
  shopTab2: v=>{ ui.invTab = v; ui.invShop = true; goTo('inventory'); },
});
