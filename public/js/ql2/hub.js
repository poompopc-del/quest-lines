/* ==========================================================================
   QUEST LINES — HOME (Moonlit Haven)
   v26: answers only three questions — where am I · what should I do next ·
   where do I tap to play. NEXT OBJECTIVE (tracked quest → PLAY NOW goes to
   a stage that advances it) · QUICK PLAY (continue the story, shown only
   when it goes somewhere else). Every other system lives under ☰ More.
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
  if(typeof mrUnclaimed==='function' && mrUnclaimed()) out.push({ ic:IC2.trophy, t:`รับรางวัล Master Rank (${mrInfo().R.k})`, a:'egView', v:'rank', hot:true });
  if(typeof storyDone==='function' && storyDone() && !EGS().seenHall) out.push({ ic:IC2.trophy, t:'Challenge Hall เปิดแล้ว! — MASTER THE GAME', a:'egView', v:'hall', hot:true });
  if(adv) out.push({ ic:IC2.star, t:`รับรางวัล Adventure Level (${adv})`, a:'go', v:'profile', hot:true });
  const qc = claimableCount();
  if(qc) out.push({ ic:IC2.scroll, t:`รับรางวัลภารกิจ ${qc} รายการ`, a:'go', v:'quests', hot:true });
  const ups = Object.entries(UPS).filter(([k,U])=>u[k]<U.max && k!=='slot').map(([k,U])=>({ k, U, c:U.cost(u[k]) })).sort((a,b)=>a.c-b.c)[0];
  if(ups && save.gold>=ups.c) out.push({ ic:ICON.sword, t:`ฝึก ${ups.U.en} ของ ${heroName(id)} (${fmt(ups.c)} ทอง)`, a:'heroTrain', v:id });
  const w = WEAPONS.filter(x=>!save.weapons.includes(x.id) && !(typeof wpLocked==='function' && wpLocked(x)) && x.atk>curWp().atk && save.gold>=x.price).sort((a,b)=>b.atk-a.atk)[0];
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

/* ------------------------------ v26: what to do next ------------------------------ */
// a rough preview of what a stage pays (gold from its monsters + clear bonus, EXP from clear + kills)
function stageRewardEst(ch, n){
  let gold = 0, xp = 20 + ch*5 + (stageIndex(ch,n)===save.cleared ? 25 : 0);
  try{
    const st = buildStage(ch, n), gm = goldMul();
    st.enemies.forEach(e=>{ gold += Math.round(e.gold*gm); xp += e.boss ? 60 : e.mini ? 20 : 6; });
    gold += Math.round((15 + st.s*4)*gm);
  }catch(e){}
  return { gold, xp };
}
// the guardian at the end of a stage (mini boss, or the chapter boss on stage 8)
function stageGuardian(ch, n){ const C = CHAPTERS[ch]; return n===STAGES_PER ? C.boss : C.mini; }
// best stage to work on a chapter's goals: the story frontier if it is here, else the busiest cleared stage
function stageFor(ch, mon){
  if(!chapterOpen(ch)) return null;
  const N = nextStage();
  if(!N.done && N.ch===ch) return { ch, n:N.n };
  const C = CHAPTERS[ch];
  if(mon && mon===C.boss) return { ch, n:STAGES_PER };
  return { ch, n:STAGES_PER-1 };
}
// where PLAY NOW should take the player for a quest
function questTarget(q){
  if(!q) return null;
  const o = qObjs(q).find(x=>!x.done), g = (o && o.go) || {};
  if(g.tower || q.loc==='tower') return { tower:true };
  if(g.ch!==undefined && g.n!==undefined && stageIndex(g.ch, g.n)<=save.cleared) return { ch:g.ch, n:g.n };
  if(g.mon){ const li = monLoc(g.mon); if(li!==null){ const t = stageFor(li, g.mon); if(t) return t; } }
  if(g.ch!==undefined){ const t = stageFor(g.ch); if(t) return t; }
  if(typeof q.loc==='number'){ const t = stageFor(q.loc); if(t) return t; }
  return null;   // anything else (words, elements, combos…) counts in any battle → the story
}
const sameStage = (a,b)=>a && b && !a.tower && !b.tower && a.ch===b.ch && a.n===b.n;

function renderHub(){
  const V = V2(), N = nextStage(), L = LOCS[N.ch], q = trackedQuest();
  const hi = heroInfo(save.eq.char), c = CH(save.eq.char), F = (typeof fighterOf==='function' ? fighterOf(save.eq.char) : { c:'#ff3b4e' });
  const story = N.done ? null : { ch:N.ch, n:N.n };

  /* ---- NEXT OBJECTIVE: the tracked quest (normally the main quest), else the story ---- */
  let obj = '', target = null;
  if(q){
    const objs = qObjs(q), st = qStatus(q), nxt = objs.find(o=>!o.done) || objs[objs.length-1];
    target = questTarget(q) || story || (N.done ? { tower:true } : null);
    const kind = { main:'MAIN QUEST', side:'SIDE QUEST', chain:`QUEST CHAIN ${(q.step||0)+1}/${q.of||1}` }[q.type] || 'QUEST';
    const go = nxt && nxt.go && nxt.go.mon ? nxt.go.mon : target && !target.tower ? stageGuardian(target.ch, target.n) : null;
    const where = target && target.tower ? 'Endless Tower · หอคอยไร้สิ้นสุด'
      : target ? `บทที่ ${target.ch+1} · ด่าน ${target.ch+1}-${target.n} · ${esc(LOCS[target.ch].name)}` : esc(locLabel(q.loc));
    const pct = Math.round(nxt.cur/nxt.need*100);
    const btn = st==='ready'
      ? `<button class="cbtn gold block no-play" data-act="qClaim" data-v="${q.id}">${IC2.star} รับรางวัล</button>`
      : target && target.tower ? `<button class="cbtn gold block no-play" data-act="goTower">${IC2.play} PLAY NOW</button>`
      : target ? `<button class="cbtn gold block no-play" data-act="stage" data-ch="${target.ch}" data-n="${target.n}">${IC2.play} PLAY NOW</button>`
      : `<button class="cbtn gold block no-play" data-act="playNext">${IC2.play} PLAY NOW</button>`;
    obj = `<section class="panel no-card ${st==='ready'?'ready':''}">
      <div class="no-k"><span class="q2-kicker">NEXT OBJECTIVE</span><button class="no-type" data-act="go" data-v="quests">${kind} · ${objs.filter(o=>o.done).length}/${objs.length}${IC2.next}</button></div>
      <div class="no-main">${go?`<span class="no-art">${monsterIcon(go)}</span>`:`<span class="no-art ic">${IC2.scroll}</span>`}
        <div class="no-t"><h3>${esc(st==='ready' ? 'ภารกิจสำเร็จ!' : nxt.txt)}</h3><small>${esc(q.en||q.title)}${q.en?` · ${esc(q.title)}`:''}</small></div></div>
      ${st==='ready' ? '' : `<div class="no-prog"><div class="q2-meter"><i style="width:${pct}%"></i></div><b>${fmt(nxt.cur)}/${fmt(nxt.need)}</b></div>`}
      <div class="no-meta"><span class="no-where">${IC2.pin}${where}</span><span class="no-rw">${rewardPreview(q.reward)}</span></div>
      ${btn}
    </section>`;
  } else if(!N.done){
    target = story;
    const R = stageRewardEst(N.ch, N.n), boss = N.n===STAGES_PER, g = stageGuardian(N.ch, N.n);
    obj = `<section class="panel no-card">
      <div class="no-k"><span class="q2-kicker">NEXT OBJECTIVE</span></div>
      <div class="no-main"><span class="no-art">${monsterIcon(g)}</span><div class="no-t"><h3>Defeat ${esc(MON[g].name)}</h3><small>บทที่ ${N.ch+1} · ด่าน ${N.ch+1}-${N.n}${boss?' · BOSS':''} · ${esc(L.name)}</small></div></div>
      <div class="no-meta"><span class="no-rw"><small>รางวัล</small><span class="rw xp">EXP ${fmt(R.xp)}</span><span class="rw">${ICON.coin}${fmt(R.gold)}</span></span></div>
      <button class="cbtn gold block no-play" data-act="playNext">${IC2.play} PLAY NOW</button>
    </section>`;
  } else {
    obj = `<section class="panel no-card">
      <div class="no-k"><span class="q2-kicker">NEXT OBJECTIVE</span></div>
      <div class="no-main"><span class="no-art ic">${IC2.trophy}</span><div class="no-t"><h3>Master the Game</h3><small>Challenge Hall · ${mrInfo().R.k} · Nightmare · Endless · Speedrun</small></div></div>
      <button class="cbtn gold block no-play" data-act="egView" data-v="hall">${IC2.play} PLAY NOW</button>
    </section>`;
  }

  /* ---- QUICK PLAY: continue the story — only when it goes somewhere PLAY NOW doesn't ---- */
  let quick = '';
  const qTarget = story || { tower:true };
  if(!(sameStage(target, qTarget) || (target && target.tower && qTarget.tower))){
    const t = qTarget.tower ? `<b>Endless Tower</b><small>สถิติ ${save.tower.best||0} ชั้น</small>` : `<b>Continue Story</b><small>ด่าน ${N.ch+1}-${N.n} · ${esc(L.name)}${N.n===STAGES_PER?' · BOSS':''}</small>`;
    quick = `<button class="panel qp-row" data-act="${qTarget.tower?'goTower':'playNext'}"><span class="qp-k">⚡ QUICK PLAY</span><span class="qp-t">${t}</span><span class="qp-go">PLAY ${IC2.play}</span></button>`;
  }

  /* ---- one quiet line when something is waiting to be claimed ---- */
  const adv = advUnclaimed(), qc = claimableCount() - (q && qStatus(q)==='ready' ? 1 : 0), mr = typeof mrUnclaimed==='function' ? mrUnclaimed() : 0;
  const claim = qc>0 ? { t:`รางวัลภารกิจรอรับ ${qc} รายการ`, a:'go', v:'quests' }
    : adv ? { t:`รางวัล Adventure Level รอรับ (${adv})`, a:'pfRoad' }
    : mr ? { t:`รางวัล Master Rank รอรับ`, a:'egView', v:'rank' } : null;

  return `<div class="hub v26">
    <section class="hub-scene" style="--fc:${F.c}">
      ${HUB_BG()}${hubFx()}
      <div class="hub-loc">${IC2.pin}<span><b>${HUB_NAME.name}</b><small>แนวหน้า: ${esc(N.done?'Endless Tower':L.name)} · ${save.cleared}/${CHAPTERS.length*STAGES_PER} ด่าน</small></span></div>
      <button class="hub-hero" data-act="go" data-v="heroes" aria-label="ไปที่หน้าฮีโร่">${rockLedge()}${heroStandalone(save.eq)}</button>
      <div class="hub-tag"><b>${esc(c.name)}</b><span>Lv ${hi.lv} · ${hi.R.th}</span></div>
    </section>
    <section class="hub-panel">
      ${obj}
      ${quick}
      ${claim?`<button class="hub-claim" data-act="${claim.a}" ${claim.v?`data-v="${claim.v}"`:''}>🎁<span>${esc(claim.t)}</span>${IC2.next}</button>`:''}
    </section>
  </div>`;
}
SCREENS.hub = { nav:'hub', full:true, render:renderHub };
Object.assign(ACTS2, {
  heroTrain: v=>{ ui.hsPick = v; ui.hsTab = 'train'; goTo('heroes'); },
  heroPick: v=>{ ui.hsPick = v; ui.hsTab = 'stats'; goTo('heroes'); },
  shopTab2: v=>{ ui.invTab = v; goTo('shop'); },
  pfRoad: ()=>{ ui.pfTab = 'road'; goTo('profile'); },
});
