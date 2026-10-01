/* ==========================================================================
   QUEST LINES 2.0 — WORLD MAP + LOCATION (chapter) VIEW
   Chapters are places on a moonlit sea. Tap a place to see its stages,
   mini boss, boss, quests, rewards and progress. Endless Tower is its own
   special location at the top of the map.
   ========================================================================== */
const WM_POS = [ [30,86], [70,70], [31,53], [70,36], [34,19] ];   // % of the map (x, y)
const WM_TOWER = [76,6];
const LOC_BG = { crypt:'scenes/bg/cave.png', woods:'scenes/meadow/sky.png', ice:'scenes/bg/snow.png', lava:'scenes/bg/castlenight.png', necro:'scenes/bg/ghostnight.png' };

const WORLD_BG = ()=>{
  const r = mulberry(99), R = (a,b)=>a+r()*(b-a), f = v=>v.toFixed(1);
  const P = WM_POS.map(([x,y])=>[x*4, y*8.6]), T = [WM_TOWER[0]*4, WM_TOWER[1]*8.6+30];
  let stars = ''; for(let i=0;i<60;i++) stars += `<circle class="tstar" cx="${f(R(0,400))}" cy="${f(R(0,860))}" r="${f(R(.3,1.1))}" fill="#fff" opacity="${f(R(.15,.5))}" style="animation-delay:${f(R(0,3))}s"/>`;
  let waves = ''; for(let i=0;i<40;i++){ const x = R(0,380), y = R(0,860); waves += `<path d="M${f(x)},${f(y)} q6,-4 12,0 q6,4 12,0" stroke="#6a5ab0" stroke-width="1.2" fill="none" opacity="${f(R(.2,.45))}"/>`; }
  const path = [[200,850], ...P, T].map((p,i,a)=>{ if(!i) return `M${p[0]},${p[1]}`; const q = a[i-1]; const mx = (q[0]+p[0])/2 + (i%2?40:-40); return `Q${mx},${(q[1]+p[1])/2} ${p[0]},${p[1]}`; }).join(' ');
  const isle = (i, body)=>{ const [x,y] = P[i], open = chapterOpen(i); return `<g transform="translate(${x},${y})">${body}${open?'':`<ellipse cx="0" cy="-6" rx="78" ry="46" fill="#07060d" opacity=".55"/><g class="drift"><ellipse cx="-20" cy="-18" rx="40" ry="12" fill="#3a3460" opacity=".7"/><ellipse cx="24" cy="4" rx="46" ry="12" fill="#3a3460" opacity=".6"/></g>`}</g>`; };
  const base = (c1,c2)=>`<ellipse cx="0" cy="14" rx="74" ry="26" fill="#0c0a22" opacity=".6"/><path d="M-70,6 Q-64,-26 -20,-30 Q30,-36 64,-18 Q80,-4 70,10 Q30,26 -20,24 Q-66,22 -70,6 Z" fill="${c1}" stroke="#07060d" stroke-width="2"/><path d="M-66,4 Q-30,14 20,12 Q56,10 70,4" stroke="${c2}" stroke-width="3" fill="none" opacity=".7"/>`;
  const I = [
    // 1 Forgotten Cemetery — tombs + crypt
    base('#5a4a3e','#9a8468') + `<g stroke="#07060d" stroke-width="1.6"><path d="M-40,-10 L-40,-30 Q-32,-40 -24,-30 L-24,-10 Z" fill="#8a8a96"/><path d="M-12,-14 L-12,-28 Q-6,-34 0,-28 L0,-14 Z" fill="#8a8a96"/><path d="M14,-12 L14,-46 L34,-56 L54,-46 L54,-12 Z" fill="#4a4050"/><path d="M28,-12 L28,-26 Q34,-32 40,-26 L40,-12 Z" fill="#ffc83d"/><path d="M34,-56 L34,-66 M29,-61 L39,-61" stroke="#c9a060" stroke-width="2.4"/></g><circle class="twin" cx="34" cy="-20" r="2" fill="#fff6c0"/>`,
    // 2 Star Meadow — trees + stars
    base('#2f6a3a','#6fe07a') + `<g stroke="#07060d" stroke-width="1.6"><rect x="-38" y="-30" width="6" height="20" fill="#5a3a1a"/><circle cx="-35" cy="-40" r="18" fill="#3fae4a"/><rect x="14" y="-26" width="6" height="16" fill="#5a3a1a"/><circle cx="17" cy="-36" r="14" fill="#56c85a"/><path d="M40,-30 l4,-10 l4,10 l10,1 l-8,6 l3,10 l-9,-6 l-9,6 l3,-10 l-8,-6 Z" fill="#ffe14a" stroke-width="1.2"/></g><circle class="twin" cx="-10" cy="-50" r="2" fill="#fff6c0"/><circle class="twin" cx="30" cy="-58" r="1.6" fill="#fff6c0"/>`,
    // 3 Frozen Caverns — snowy peaks
    base('#3a5a8a','#bff4ff') + `<g stroke="#07060d" stroke-width="1.6"><path d="M-60,-6 L-30,-56 L-2,-6 Z" fill="#9ec0dc"/><path d="M-40,-40 L-30,-56 L-20,-40 L-26,-36 L-32,-42 Z" fill="#fff"/><path d="M-14,-6 L20,-70 L56,-6 Z" fill="#cfe6f6"/><path d="M8,-48 L20,-70 L32,-48 L24,-44 L18,-52 Z" fill="#fff"/><path d="M34,-6 L40,-24 L46,-6 Z" fill="#6fe6ff"/></g>`,
    // 4 Flame Fortress — castle + lava
    base('#4a1e1a','#ff7a2e') + `<g stroke="#07060d" stroke-width="1.6"><rect x="-44" y="-44" width="18" height="38" fill="#3a3040"/><rect x="26" y="-44" width="18" height="38" fill="#3a3040"/><rect x="-26" y="-32" width="52" height="26" fill="#4a3a4a"/><path d="M-46,-44 L-35,-60 L-24,-44 Z M24,-44 L35,-60 L46,-44 Z" fill="#b0122e"/><path d="M-8,-6 L-8,-18 Q0,-26 8,-18 L8,-6 Z" fill="#ffb347"/></g><path class="lava-glow" d="M-60,8 Q-20,18 20,14 Q50,12 64,6" stroke="#ff7a2e" stroke-width="4" fill="none"/>`,
    // 5 Necromancer's Grave — haunted house + green moon
    base('#2a1e3e','#8a5ad0') + `<circle cx="42" cy="-58" r="12" fill="#b8ffb0" opacity=".85"/><g stroke="#07060d" stroke-width="1.6"><path d="M-40,-6 L-40,-38 L-20,-56 L0,-38 L0,-6 Z" fill="#3a2a50"/><path d="M-44,-36 L-20,-60 L4,-36" fill="none" stroke-width="3"/><rect x="-30" y="-32" width="7" height="8" fill="#7fff5a"/><rect x="-17" y="-32" width="7" height="8" fill="#7fff5a"/><path d="M12,-6 L12,-22 Q18,-30 24,-22 L24,-6 Z" fill="#6a6a78"/><path d="M34,-6 L34,-18 Q39,-24 44,-18 L44,-6 Z" fill="#6a6a78"/></g>`,
  ];
  return `<svg class="title-bg world-bg" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="wsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07061a"/><stop offset=".35" stop-color="#140f38"/><stop offset="1" stop-color="#1e1650"/></linearGradient>
  <radialGradient id="wmoon"><stop offset="0" stop-color="#ffe3a3" stop-opacity=".35"/><stop offset="1" stop-color="#ffe3a3" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="860" fill="url(#wsea)"/>${stars}<circle cx="90" cy="60" r="120" fill="url(#wmoon)"/><circle cx="90" cy="60" r="26" fill="#fff1d0"/>
  ${waves}
  <path d="${path}" stroke="#07060d" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>
  <path d="${path}" stroke="#ffc83d" stroke-width="2.6" fill="none" stroke-dasharray="7 7" stroke-linecap="round" opacity=".85"/>
  ${I.map((b,i)=>isle(i, typeof SCENE_HIDDEN!=='undefined' && SCENE_HIDDEN.has(CHAPTERS[i].id) ? base('#2a2550','#4a4290') : b)).join('')}
  <g transform="translate(${T[0]},${T[1]})"><ellipse cx="0" cy="40" rx="40" ry="12" fill="#0c0a22" opacity=".6"/><path d="M-36,40 Q-30,24 0,22 Q30,24 36,40 Z" fill="#2d2750" stroke="#07060d" stroke-width="2"/>
    <path d="M-14,30 L-10,-40 L-16,-40 L0,-72 L16,-40 L10,-40 L14,30 Z" fill="#3a4e86" stroke="#07060d" stroke-width="2"/>${[-20,0,16].map((y,i)=>`<rect class="twin" x="-3" y="${y}" width="6" height="8" rx="3" fill="#ffd27a" style="animation-delay:${i*.4}s"/>`).join('')}<path d="M0,-72 L0,-84 L10,-80 L0,-76" fill="#ff3b4e" stroke="#07060d" stroke-width="1"/></g>
  <g transform="translate(200,846)"><path d="M-40,14 Q-30,-6 0,-8 Q30,-6 40,14 Z" fill="#2d2750" stroke="#07060d" stroke-width="2"/><path d="M-10,0 L-10,-18 L-4,-18 L-4,-26 L4,-26 L4,-18 L10,-18 L10,0 Z" fill="#5a4e9a" stroke="#07060d" stroke-width="1.6"/></g>
</svg>`;
};

function renderWorld(){
  const N = nextStage(), tq = trackedQuest(), total = CHAPTERS.length*STAGES_PER;
  const questAt = ci=>QUESTS.some(q=>q.loc===ci && ['active','ready'].includes(qStatus(q)));
  const nodes = LOCS.map((L,ci)=>{
    const open = chapterOpen(ci), done = chapterDone(ci), cl = chapterCleared(ci), stars = chapterStars(ci), here = !N.done && N.ch===ci;
    const [x,y] = WM_POS[ci];
    const ready = QUESTS.some(q=>q.loc===ci && qStatus(q)==='ready');
    return `<button class="wm-node ${open?'':'locked'} ${done?'done':''} ${here?'here':''} ${x>50?'r':'l'}" style="left:${x}%;top:${y}%;--lc:${L.col}" data-act="openCh" data-v="${ci}" aria-label="${esc(L.name)}">
      <span class="wm-pin">${open ? monsterIcon(CHAPTERS[ci].boss) : ICON.lock}${here?`<span class="wm-you">${heroFaceSvg(save.eq)}</span>`:''}${questAt(ci)?`<em class="wm-q ${ready?'ready':''}">${ready?'✔':'!'}</em>`:''}</span>
      <span class="wm-plate"><small>บทที่ ${ci+1}${done?' · ✔':''}</small><b>${esc(L.name)}</b><span class="wm-prog"><i style="width:${cl/STAGES_PER*100}%"></i></span><span class="wm-meta">${open?`${cl}/${STAGES_PER} · ★${stars}`:`🔒 ผ่าน ${ci}-8`}</span></span>
    </button>`;
  }).join('');
  const [tx,ty] = WM_TOWER, tOpen = true;
  const tower = `<button class="wm-node tower r" style="left:${tx}%;top:${ty}%;--lc:#3ee0ff" data-act="openCh" data-v="tower" aria-label="หอคอยไร้สิ้นสุด">
    <span class="wm-pin">${IC2.tower}${QUESTS.some(q=>q.loc==='tower' && ['active','ready'].includes(qStatus(q)))?'<em class="wm-q">!</em>':''}</span>
    <span class="wm-plate"><small>พื้นที่พิเศษ</small><b>Endless Tower</b><span class="wm-meta">🏆 สถิติ ${save.tower.best||0} ชั้น</span></span></button>`;
  return `<div class="wm-head"><div><span class="q2-kicker">WORLD MAP</span><h2 class="q2-h">แผนที่โลก</h2></div>
      <div class="wm-sum"><b>${save.cleared}/${total}</b><small>ด่าน</small><b>★${starsTotal()}</b><small>ดาว</small></div></div>
    ${tq?`<button class="panel wm-track" data-act="go" data-v="quests">${IC2.scroll}<span><small>ภารกิจที่ติดตาม · ${esc(locLabel(tq.loc))}</small><b>${esc(tq.title)}</b></span><em>${qPct(tq)}%</em></button>`:''}
    <div class="wm-map">${WORLD_BG()}<div class="wm-nodes">${nodes}${tower}<span class="wm-home" style="left:50%;top:97.5%">${IC2.hub}<small>${HUB_NAME.th}</small></span></div></div>`;
}
SCREENS.world = { nav:'world', render:renderWorld, after:()=>{ // scroll the map so the current location is in view
  const el = document.querySelector('.wm-node.here') || document.querySelector('.wm-node.tower'), scr = $('#scr');
  if(el && scr && !ui.v2wmScrolled){ const r = el.getBoundingClientRect(), s = scr.getBoundingClientRect(); scr.scrollTop += r.top - s.top - s.height*.45; }
  ui.v2wmScrolled = false;
} };

/* ------------------------------ location view ------------------------------ */
function renderChapter(){
  if(ui.v2ch==='tower') return renderTowerLoc();
  const ci = Math.max(0, Math.min(CHAPTERS.length-1, +ui.v2ch||0)), C = CHAPTERS[ci], L = LOCS[ci];
  const open = chapterOpen(ci), cl = chapterCleared(ci), stars = chapterStars(ci), V = V2();
  const nextN = (()=>{ for(let n=1;n<=STAGES_PER;n++) if(stageIndex(ci,n)>=save.cleared) return n; return 0; })();
  let nodes = '';
  for(let n=1;n<=STAGES_PER;n++){
    const s = stageIndex(ci,n), lock = s>save.cleared, cur = s===save.cleared, boss = n===STAGES_PER, st = save.stars[s]||0;
    nodes += `<button class="node ${lock?'lock':''} ${cur?'cur':''} ${boss?'boss':''} ${!lock&&!cur?'done':''}" data-act="stage" data-ch="${ci}" data-n="${n}" ${lock?'disabled':''} aria-label="ด่าน ${ci+1}-${n}">
      ${lock?ICON.lock:boss?ICON.skull:''}<span>${lock?'':boss?'BOSS':`${ci+1}-${n}`}</span>${!lock&&st?`<span class="stars">${starsHtml(st)}</span>`:''}</button>`;
  }
  const foe = (k, tag)=>{ const seen = V.seen.mon[k], kills = V.kills[k]||0, M = MON[k];
    return `<div class="lc-foe ${seen?'':'unseen'} ${tag||''}"><span class="lc-art">${monsterIcon(k)}</span><span class="lc-ft"><small>${tag==='boss'?'BOSS':tag==='mini'?'MINI BOSS':''}</small><b>${seen?esc(M.name):'???'}</b><em>${seen?esc(M.th):'ยังไม่พบ'}</em>${kills?`<i class="lc-kill">✔ ปราบแล้ว ${kills}</i>`:''}</span></div>`; };
  const qs = QUESTS.filter(q=>q.loc===ci && (q.type!=='chain' || chainStep(q.chain)===q)).map(q=>({ q, st:qStatus(q) })).filter(x=>x.st!=='claimed' || x.q.type==='main');
  const play = nextN ? `<button class="cbtn gold block lc-play" data-act="stage" data-ch="${ci}" data-n="${nextN}">${IC2.play} ${cl?'ลุยต่อ':'เริ่ม'} ด่าน ${ci+1}-${nextN}${nextN===STAGES_PER?' · BOSS':''}</button>`
    : `<button class="cbtn wood block lc-play" data-act="stage" data-ch="${ci}" data-n="${STAGES_PER}">${IC2.play} ท้าทายบอสอีกครั้ง</button>`;
  return `<div class="lc-banner" style="--lc:${L.col};--bgimg:${typeof SCENE_HIDDEN!=='undefined' && SCENE_HIDDEN.has(C.id) ? 'none' : `url('${new URL(LOC_BG[C.id], document.baseURI).href}')`}">
      <button class="q2-back" data-act="go" data-v="world" aria-label="กลับแผนที่โลก">${IC2.back}</button>
      <div class="lc-boss">${monsterIcon(C.boss)}</div>
      <div class="lc-title"><span class="q2-kicker">บทที่ ${ci+1} · LOCATION</span><h2>${esc(L.name)}</h2><small>${esc(L.th)}</small></div>
    </div>
    ${open ? '' : `<div class="panel lc-lock">${ICON.lock}<span><b>ยังไม่ปลดล็อก</b><small>ผ่านด่าน ${ci}-${STAGES_PER} (บอสของ ${esc(LOCS[ci-1].name)}) เพื่อเปิดเส้นทาง</small></span></div>`}
    <div class="lc-stats"><div><b>${cl}/${STAGES_PER}</b><small>ด่านที่ผ่าน</small></div><div><b>★ ${stars}/${STAGES_PER*3}</b><small>ดาว</small></div><div><b>${fmt(V.chKills[ci]||0)}</b><small>ปราบแล้ว</small></div></div>
    ${open?play:''}${typeof nmChapterOpen==='function' && nmChapterOpen(ci) ? `<button class="cbtn red block lc-play eg-nmbtn" data-act="egView" data-v="nightmare">🌙 NIGHTMARE · ${[...Array(STAGES_PER)].filter((_,k)=>nmCleared(ci,k+1)).length}/${STAGES_PER}</button>` : ''}
    <h3 class="q2-sec">เส้นทางด่าน <small>Stages</small></h3>
    <div class="panel lc-path"><div class="nodes">${nodes}</div></div>
    ${qs.length ? `<h3 class="q2-sec">ภารกิจที่นี่ <small>Quests</small></h3>${qs.map(({q,st})=>questRow(q, st, true)).join('')}` : ''}
    <details class="lc-more" ${ui.lcMore?'open':''}><summary>ข้อมูลพื้นที่ <small>ผู้พิทักษ์ · มอนสเตอร์ · รางวัล</small></summary>
    <h3 class="q2-sec">ผู้พิทักษ์ <small>Mini Boss · Boss</small></h3>
    <div class="lc-foes2">${foe(C.mini,'mini')}${foe(C.boss,'boss')}</div>
    <p class="sub">ทุกด่านมี <b>มินิบอส</b> เฝ้าท้ายด่าน · ด่านที่ 8 คือ <b>บอสใหญ่</b></p>
    <h3 class="q2-sec">มอนสเตอร์ในพื้นที่ <small>${C.pool.filter(k=>V.seen.mon[k]).length}/${C.pool.length} ค้นพบ</small></h3>
    <div class="lc-pool">${C.pool.map(k=>`<span class="lc-mini ${V.seen.mon[k]?'':'unseen'}" title="${V.seen.mon[k]?esc(MON[k].name):'???'}">${monsterIcon(k)}</span>`).join('')}</div>
    <h3 class="q2-sec">รางวัลในพื้นที่ <small>Rewards</small></h3>
    <div class="panel lc-rw">
      <div><span>วัตถุดิบที่หล่น</span><p>${matIcon(L.mat)} ${esc(MATS[L.mat].th)} <small>(มอนสเตอร์ · มินิบอส ×2)</small></p><p>${matIcon(L.gem)} ${esc(MATS[L.gem].th)} <small>(บอส · หายาก)</small></p></div>
      <div><span>ผ่านบทครั้งแรก</span><p>${ICON.potRed}×2 ${ICON.potStar}×1 ${ci<CHAPTERS.length-1?`· ปลดล็อก ${esc(LOCS[ci+1].name)}`:''}</p></div>
      <div><span>ปริศนามินิบอส</span><p>${ICON.coin} ทอง ${ci>=1?'+ ยา (ตอบถูกครั้งแรก)':''}</p></div>
    </div>
    <p class="sub">ตำนานของพื้นที่นี้อ่านได้ที่ ☰ เพิ่มเติม → โคเด็กซ์ → ตำนาน</p>
    </details>`;
}
function renderTowerLoc(){
  const best = save.tower.best||0, runs = save.tower.runs||0;
  const qs = QUESTS.filter(q=>q.loc==='tower' && (q.type!=='chain' || chainStep(q.chain)===q)).map(q=>({ q, st:qStatus(q) })).filter(x=>x.st!=='claimed');
  return `<div class="lc-banner tower" style="--lc:#3ee0ff">
      <button class="q2-back" data-act="go" data-v="world" aria-label="กลับแผนที่โลก">${IC2.back}</button>
      <div class="lc-boss">${TOWER_ART()}</div>
      <div class="lc-title"><span class="q2-kicker">SPECIAL AREA</span><h2>Endless Tower</h2><small>หอคอยไร้สิ้นสุด</small></div>
    </div>
    <div class="lc-stats"><div><b>${best}</b><small>ชั้นสูงสุด</small></div><div><b>${runs}</b><small>จำนวนครั้งที่ปีน</small></div><div><b>${fmt(V2().stats.floors)}</b><small>ชั้นที่ผ่านรวม</small></div></div>
    <button class="cbtn gold block lc-play" data-act="goTower">${IC2.tower} เข้าสู่หอคอย</button>
    <details class="lc-more" ${ui.lcMore?'open':''}><summary>กติกา · รางวัล <small>Milestones</small></summary>
    <p class="sub">ปีนได้ไม่จำกัด ชั้นละ 1 ตัว · มินิบอสทุก 5 ชั้น · บอสทุก 10 ชั้นพร้อมรางวัล · HP ต่อเนื่องข้ามชั้น (ชนะแต่ละตัวฟื้น 15%) · ฉากเปลี่ยนทุก 10 ชั้น</p>
    <div class="panel lc-rw"><div><span>ทุก 10 ชั้น</span><p>${ICON.coin} ทองโบนัส + ${ICON.potRed}×1</p></div><div><span>ทุกชั้น</span><p>${ICON.coin} ทองจากมอนสเตอร์ (เก็บไว้แม้แพ้) + วัตถุดิบตามฉาก</p></div><div><span>ชั้น 30+</span><p>มอนสเตอร์ได้ความสามารถเพิ่ม · ชั้น 40+ แข็งแกร่งขึ้นไม่มีเพดาน</p></div></div></details>
    <h3 class="q2-sec">ภารกิจที่หอคอย <small>Quests</small></h3>
    ${qs.length ? qs.map(({q,st})=>questRow(q, st, true)).join('') : `<p class="sub">ทำภารกิจหอคอยครบแล้ว</p>`}`;
}
SCREENS.chapter = { nav:'world', render:renderChapter, key:()=>String(ui.v2ch), after:()=>{ const d = document.querySelector('.lc-more'); if(d) d.addEventListener('toggle', ()=>{ ui.lcMore = d.open; }); } };
