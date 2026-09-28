/* ==========================================================================
   QUEST LINES — HOME (Hollow Haven — cave camp)
   v26: answers only three questions — where am I · what should I do next ·
   where do I tap to play. NEXT OBJECTIVE (tracked quest → PLAY NOW goes to
   a stage that advances it) · QUICK PLAY (continue the story, shown only
   when it goes somewhere else). Every other system lives under ☰ More.
   ========================================================================== */

// v54: the base is the cave camp — just the painted scene (scenes/hub/cave.png, 787×440 pixel art), no props.
// .hd-live keeps pixel-art mode from rasterising the image layer away.
const HUB_W = 787, HUB_H = 440;
const HUB_BG = ()=>`<svg class="title-bg hub-bg hub-cave" viewBox="0 0 ${HUB_W} ${HUB_H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <image class="hd-live" href="scenes/hub/cave.png" x="0" y="0" width="${HUB_W}" height="${HUB_H}" preserveAspectRatio="none" style="image-rendering:pixelated"/>
</svg>`;

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
