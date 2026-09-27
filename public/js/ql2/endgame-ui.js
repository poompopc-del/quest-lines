/* ==========================================================================
   QUEST LINES — ENDGAME & MASTERY · UI
   HERO HUB → 🏆 CHALLENGE HALL
     ├── Nightmare  ├── Endless  ├── Speedrun  ├── Perfect  ├── Creator
     ├── Daily / Weekly  ├── Mastery (words + personal bests)  ├── Master Rank
     ├── Prestige Shop   └── True Final Boss
   ========================================================================== */
const PRESTIGE = [
  { id:'a_ember',  k:'aura',    v:'ember',     cur:'cc', price:250 },
  { id:'a_frost',  k:'aura',    v:'frost',     cur:'cc', price:250 },
  { id:'a_spirit', k:'aura',    v:'spirit',    cur:'nc', price:400 },
  { id:'a_nm',     k:'aura',    v:'nightmare', cur:'nc', price:800 },
  { id:'t_flame',  k:'trail',   v:'flame',     cur:'cc', price:200 },
  { id:'t_star',   k:'trail',   v:'star',      cur:'cc', price:200 },
  { id:'t_shadow', k:'trail',   v:'shadow',    cur:'nc', price:300 },
  { id:'v_conf',   k:'victory', v:'confetti',  cur:'cc', price:150 },
  { id:'v_fire',   k:'victory', v:'fireworks', cur:'cc', price:300 },
  { id:'v_moon',   k:'victory', v:'moonburst', cur:'nc', price:350 },
  { id:'b_nm',     k:'badge',   v:'nightmare', cur:'nc', price:250 },
  { id:'b_speed',  k:'badge',   v:'speed',     cur:'cc', price:250 },
  { id:'f_nm',     k:'frame',   v:'nightmare', cur:'nc', price:600 },
  { id:'m_moon',   k:'mat',     v:'moonGem',   cur:'nc', price:40, rep:true },
  { id:'m_fire',   k:'mat',     v:'fireGem',   cur:'nc', price:80, rep:true },
  { id:'m_soul',   k:'mat',     v:'soulGem',   cur:'nc', price:100, rep:true },
];
const cosOwned = it=>it.k==='frame' ? V2().frames.own.includes(it.v) : it.k==='mat' ? false : EGS().cos.own[it.k].includes(it.v);
const cosName = it=>it.k==='frame' ? 'กรอบ '+FRAMES[it.v].th : it.k==='mat' ? MATS[it.v].th : COS[it.k][it.v].th;
const cosKindTh = { aura:'ออร่าตัวละคร', trail:'รอยโจมตี', victory:'ฉากชัยชนะ', badge:'ตราโปรไฟล์', frame:'กรอบรูป', mat:'วัตถุดิบหายาก' };

function egHeader(view){
  const I = mrInfo(), E = EGS();
  return `<div class="eg-top">${view!=='hall'?`<button class="q2-back" data-act="egView" data-v="hall" aria-label="กลับ">${IC2.back}</button>`:`<button class="q2-back" data-act="go" data-v="hub" aria-label="กลับฐาน">${IC2.back}</button>`}
    <div class="eg-cur"><span class="eg-nc">🌙 <b>${fmt(E.nc)}</b></span><span class="eg-cc">🏅 <b>${fmt(E.cc)}</b></span></div>
    <button class="eg-mr mini" data-act="egView" data-v="rank" style="--rc:${I.R.c}"><span class="eg-mr-gem"></span><b>${I.R.k}</b></button></div>`;
}
function modeCard(v, ic, en, th, stat, lock, cls){
  return `<button class="eg-card ${lock?'locked':''} ${cls||''}" data-act="egView" data-v="${v}" ${lock?'disabled':''}><span class="eg-ci">${ic}</span><b>${en}</b><small>${th}</small><em>${lock?'🔒 '+lock:stat}</em></button>`;
}
function renderHall(){
  const I = mrInfo(), E = EGS(), open = storyDone();
  const d = egDaily(), w = egWeekly(), wc = wordCompletion(), tro = Object.keys(ACH).filter(k=>save.achievements[k]).length;
  const tfbOk = tfbUnlocked();
  let h = `<div class="eg-banner"><span class="q2-kicker">ENDGAME · CHALLENGE HALL</span><h2>MASTER THE GAME</h2><p>${open?'เนื้อเรื่องจบแล้ว — แต่เกมยังไม่จบ พิสูจน์ฝีมือของคุณ':'จบเนื้อเรื่องหลักเพื่อเปิดประตูสู่ Endgame'}</p>
    <button class="eg-mr" data-act="egView" data-v="rank" style="--rc:${I.R.c}"><span class="eg-mr-gem"></span><span class="eg-mr-t"><small>MASTER RANK</small><b>${I.R.k}</b><i>${I.R.th}</i></span><span class="eg-mr-p"><span class="q2-meter"><i style="width:${I.pct}%"></i></span><small>${fmt(I.pts)} MP${I.next?` · ถัดไป ${I.next.k} ${fmt(I.next.at)}`:' · MAX'}</small></span>${mrUnclaimed()?`<em class="q2-badge">${mrUnclaimed()}</em>`:''}</button></div>`;
  if(!open){
    h += `<div class="panel eg-gate">${ICON.lock}<span><b>ยังไม่ปลดล็อก</b><small>ผ่านครบ ${CHAPTERS.length*STAGES_PER} ด่าน (ตอนนี้ ${save.cleared}/${CHAPTERS.length*STAGES_PER}) · Endless Tower และ Master Rank ใช้ได้เลย</small></span></div>
      <div class="q2-meter big"><i style="width:${Math.round(save.cleared/(CHAPTERS.length*STAGES_PER)*100)}%"></i></div>`;
  }
  const lk = open ? '' : 'จบเนื้อเรื่อง';
  h += `<div class="eg-grid">
    ${modeCard('nightmare','🌙','NIGHTMARE','ด่านเดิม กติกาโหด',`${nmCount()}/40 · บอส ${nmBosses()}/5`, lk, 'c-nm')}
    ${modeCard('endless','♾️','ENDLESS','หอคอย + Modifier',`สถิติ ชั้น ${E.endBest||0}`, '', 'c-end')}
    ${modeCard('speed','⚡','SPEEDRUN','จบบทให้เร็วที่สุด',`${Object.keys(E.speed).length}/5 บท`, lk, 'c-sp')}
    ${modeCard('perfect','✨','PERFECT RUN','ไร้ที่ติ 3 ระดับ',`✦ ${perfectTotal()}`, lk, 'c-pf')}
    ${modeCard('creator','🧩','CHALLENGE CREATOR','สร้างกติกาเอง',`${Object.keys(E.scores).filter(k=>k.startsWith('cu')).length} สถิติ`, lk, 'c-cr')}
    ${modeCard('daily','📅','DAILY · WEEKLY','ภารกิจท้าทาย',`${d.D.claimed?'✔':d.done?'🎁':`${d.cur}/${d.C.need}`} · ${w.W.claimed?'✔':`${w.W.wins}/${w.T.need}`}`, lk, 'c-dw')}
    ${modeCard('mastery','📖','WORD MASTERY','เก็บทุกคำ + สถิติ',`${wc.pct}% · ${wc.mast} Mastered`, '', 'c-wm')}
    ${modeCard('shop','💠','PRESTIGE SHOP','ออร่า · รอย · ตรา',`🌙${fmt(E.nc)} · 🏅${fmt(E.cc)}`, '', 'c-sh')}
    <button class="eg-card c-tro" data-act="egTrophy"><span class="eg-ci">🏆</span><b>TROPHY ROOM</b><small>8 หมวด</small><em>${tro}/${Object.keys(ACH).length}</em></button>
    ${modeCard('rank','👑','MASTER RANK','ความชำนาญรวม',`${I.R.k} · ${fmt(I.pts)} MP`, '', 'c-mr')}
  </div>
  <button class="eg-tfb-card ${tfbOk?'open':''}" data-act="egView" data-v="tfb"><span class="eg-skull">☠️</span><span><small>${tfbOk?'TRUE FINAL BOSS UNLOCKED':'??? · ความลับสุดท้าย'}</small><b>${tfbOk||E.tfb.wins?'LEXIVORE':'TRUE FINAL BOSS'}</b><i>${E.tfb.wins?`ปราบแล้ว ${E.tfb.wins} ครั้ง`:`เงื่อนไข ${TFB_REQ.filter(r=>r.cur()>=r.need).length}/${TFB_REQ.length}`}</i></span></button>
  <h3 class="q2-sec">Endgame Loop <small>วงจรของผู้เชี่ยวชาญ</small></h3>
  <div class="eg-loop">${['⚔️ เล่น','⭐ EXP','🛡 พัฒนาฮีโร่','🧩 ท้าทาย','🎁 รางวัล','👑 Rank ขึ้น','🌙 ด่านโหดขึ้น','🔁 ลองอีกครั้ง','🏆 Master'].map(x=>`<span>${x}</span>`).join('<i>›</i>')}</div>`;
  return h;
}
function renderNightmareView(){
  const R = nmRules(0);
  let h = `<div class="eg-hero nm"><span class="eg-hi">🌙</span><div><span class="q2-kicker">NIGHTMARE MODE</span><h2>ฝันร้าย</h2><p>ด่านเดิม แต่กติกาเปลี่ยน: ศัตรูทนและแรงขึ้น คลั่งทุกเทิร์น คำต้องยาว 4 ตัว มีเวลาจำกัด ยาและ Ultimate ใช้ได้ 1 ครั้งต่อด่าน บอสมี PHASE 3 · ตั้งแต่บท 3 ศัตรูเร็วขึ้น</p></div></div>
    <div class="eg-modrow">${modChips(Object.assign({}, R, { fast:true }),'')}<span class="eg-mod"><b>ยา ×1 · ULT ×1</b></span><span class="eg-mod">🩸<b>BOSS PHASE 3</b></span></div>
    <div class="panel eg-rwinfo"><b>รางวัล</b><span>ผ่านครั้งแรก 🌙 30 · บอส 🌙 100 + อัญมณีประจำพื้นที่ · เล่นซ้ำ 🌙 5 (วันละครั้งต่อด่าน) · Nightmare Coins ใช้ซื้อของใน Prestige Shop</span></div>`;
  CHAPTERS.forEach((C,ci)=>{
    const open = nmChapterOpen(ci), L = LOCS[ci];
    h += `<div class="panel eg-nmch ${open?'':'locked'}" style="--lc:${L.col}"><div class="eg-nmh"><span class="eg-nmb">${monsterIcon(C.boss)}</span><span><small>บทที่ ${ci+1}</small><b>${esc(L.name)}</b><i>${open?`${[...Array(STAGES_PER)].filter((_,k)=>nmCleared(ci,k+1)).length}/${STAGES_PER}`:`🔒 ${ci?`ปราบบอส Nightmare บท ${ci}`:'จบเนื้อเรื่อง'}`}</i></span></div>
      <div class="eg-nodes">${[...Array(STAGES_PER)].map((_,k)=>{ const n = k+1, ok = nmStageOpen(ci,n), cl = nmCleared(ci,n), boss = n===STAGES_PER;
        return `<button class="eg-node ${cl?'done':''} ${ok&&!cl?'cur':''} ${boss?'boss':''}" data-act="egNm" data-v="${ci}-${n}" ${ok?'':'disabled'}>${ok?(boss?'💀':`${ci+1}-${n}`):'🔒'}${cl?'<i>✔</i>':''}</button>`; }).join('')}</div></div>`;
  });
  return h;
}
function renderEndlessView(){
  const E = EGS(), next = Math.max(10, Math.ceil(((E.endPaid||0)+1)/10)*10);
  return `<div class="eg-hero end"><span class="eg-hi">♾️</span><div><span class="q2-kicker">ENDLESS CHALLENGE</span><h2>หอคอยไร้สิ้นสุด</h2><p>ปีนได้ไม่จำกัด ศัตรูแข็งแกร่งขึ้นทุกชั้น และตั้งแต่ชั้น 11 ทุกๆ 10 ชั้นจะสุ่ม Modifier ใหม่ (ยิ่งสูงยิ่งหลายกติกา) — ทุกการปีนไม่เหมือนกัน</p></div></div>
    <div class="lc-stats"><div><b>${E.endBest||0}</b><small>ชั้นสูงสุด</small></div><div><b>${save.tower.runs||0}</b><small>ครั้งที่ปีน</small></div><div><b>${next}</b><small>รางวัลถัดไป</small></div></div>
    <button class="cbtn gold block lc-play" data-act="goTower">${IC2.tower} เข้าสู่ Endless</button>
    <h3 class="q2-sec">ความยากตามชั้น <small>Scaling</small></h3>
    <div class="panel lc-rw">
      <div><span>ทุกชั้น</span><p>HP · ดาเมจ · ความหลากหลายของศัตรูเพิ่มขึ้น · ชั้น 30+ ได้ความสามารถเพิ่ม · 40+ ไม่มีเพดาน</p></div>
      <div><span>Modifier</span><p>ชั้น 11–20: 1 กติกา · 21–40: 2 · 41–60: 3 · 61+: 4 · ชั้น 31+ อาจเจอ NO HEALING</p></div>
      <div><span>บอส</span><p>ทุก 5 ชั้น มินิบอส · ทุก 10 ชั้น บอส · ชั้น 25/75 บอสพิเศษ · ชั้น 50 <b>Elite Boss</b> · ชั้น 100 <b>Nightmare Boss</b> (+15 วิ + Enrage) · บอสพิเศษมี PHASE 3</p></div>
    </div>
    <h3 class="q2-sec">รางวัลสถิติใหม่ <small>ครั้งแรกเท่านั้น — ฟาร์มไม่ได้</small></h3>
    <div class="panel lc-rw"><div><span>ทุก 10 ชั้น</span><p>🏅 Challenge Coins = ชั้น × 1.2</p></div><div><span>ชั้น 50</span><p>🖼 กรอบห้วงลึก + 🗼 ตราหอคอย</p></div><div><span>ชั้น 100</span><p>✨ <b>Void Aura</b> + ฉายา Tower Conqueror</p></div></div>
    <h3 class="q2-sec">ตัวอย่าง Modifier <small>สุ่มต่อรอบ</small></h3><div class="eg-modrow">${modChips(Object.fromEntries(Object.keys(MODS).map(k=>[k,1])),'sm')}</div>`;
}
function renderSpeedView(){
  const E = EGS();
  return `<div class="eg-hero sp"><span class="eg-hi">⚡</span><div><span class="q2-kicker">SPEEDRUN</span><h2>จบทั้งบทให้เร็วที่สุด</h2><p>เล่น 8 ด่านต่อเนื่องของบทเดียว นาฬิกาเดินตลอด (หยุดเฉพาะตอนหยุดเกม/ปริศนา) แพ้ = เริ่มใหม่ · Par ${fmtT(SPEED_PAR)}</p></div></div>
    ${CHAPTERS.map((C,ci)=>{ const s = E.speed[ci], L = LOCS[ci];
      return `<div class="panel eg-sp" style="--lc:${L.col}"><span class="eg-nmb">${monsterIcon(C.boss)}</span><div class="eg-sp-b"><small>บทที่ ${ci+1}</small><b>${esc(L.name)}</b>
        ${s?`<div class="eg-sp-t">🏆 ${fmtT(s.best)}${s.best<=SPEED_PAR?' <i>SUB-PAR</i>':''}</div><div class="eg-stats mini"><span>คำ<b>${s.words}</b></span><span>พลาด<b>${s.mistakes}</b></span><span>Combo<b>x${s.combo}</b></span><span>แม่นยำ<b>${s.acc}%</b></span></div>`:'<div class="sub">ยังไม่มีสถิติ · ครั้งแรก 🏅 60</div>'}</div>
        <button class="cbtn gold small" data-act="egSpeed" data-v="${ci}">▶ GO</button></div>`; }).join('')}`;
}
function renderPerfectView(){
  const E = EGS();
  return `<div class="eg-hero pf"><span class="eg-hi">✨</span><div><span class="q2-kicker">PERFECT RUN</span><h2>ไร้ที่ติ</h2><p>เล่นด่านที่ผ่านแล้วแบบห้ามพลาด — ห้ามใช้ยา (ล็อกไว้) · ได้ระดับตามผลงาน · รางวัล 🏅 เมื่อได้ระดับใหม่ (ด่านบอส ×2)</p></div></div>
    <div class="panel eg-tiers">${[1,2,3].map(t=>`<div class="eg-tier t${t}">${'✦'.repeat(t)} ${PERFECT[t].k}<small>${PERFECT[t].th}</small></div>`).join('')}</div>
    ${CHAPTERS.map((C,ci)=>`<h3 class="q2-sec">${esc(LOCS[ci].name)} <small>✦ ${[...Array(STAGES_PER)].reduce((a,_,k)=>a+(E.perfect[stageIndex(ci,k+1)]||0),0)}/${STAGES_PER*3}</small></h3>
      <div class="eg-pfrow">${[...Array(STAGES_PER)].map((_,k)=>{ const n = k+1, s = stageIndex(ci,n), ok = s < save.cleared, t = E.perfect[s]||0;
        return `<button class="eg-pfn t${t}" data-act="egPerfect" data-v="${ci}-${n}" ${ok?'':'disabled'}><b>${ok?`${ci+1}-${n}`:'🔒'}</b><i>${'✦'.repeat(t)||'·'}</i></button>`; }).join('')}</div>`).join('')}`;
}
function renderCreatorView(){
  const c = ui.egCr = ui.egCr || { ch:0, n:1, mods:['hp','time'] };
  const R = rulesFromMods(c.mods), stars = modStars(R), key = `cu${stageIndex(c.ch,c.n)}|${c.mods.slice().sort().join(',')}`, best = EGS().scores[key];
  const maxCh = Math.min(CHAPTERS.length-1, Math.floor((save.cleared-1)/STAGES_PER));
  return `<div class="eg-hero cr"><span class="eg-hi">🧩</span><div><span class="q2-kicker">CHALLENGE CREATOR</span><h2>สร้างการท้าทายของคุณ</h2><p>เลือกด่านและกติกาเอง · ยิ่งยากคะแนนยิ่งคูณสูง · รางวัล 🏅 เมื่อทำลายสถิติคะแนนของชุดกติกานั้น</p></div></div>
    <div class="panel eg-cr">
      <span class="eg-lab">ด่าน</span>
      <div class="seg eg-chs">${CHAPTERS.map((_,ci)=>`<button class="${c.ch===ci?'on':''}" data-act="egCrCh" data-v="${ci}" ${ci>maxCh?'disabled':''}>บท ${ci+1}</button>`).join('')}</div>
      <div class="eg-pfrow">${[...Array(STAGES_PER)].map((_,k)=>{ const ok = stageIndex(c.ch,k+1) < save.cleared; return `<button class="eg-pfn ${c.n===k+1?'sel':''}" data-act="egCrN" data-v="${k+1}" ${ok?'':'disabled'}><b>${c.ch+1}-${k+1}</b></button>`; }).join('')}</div>
      <span class="eg-lab">Modifiers</span>
      <div class="eg-mods-pick">${Object.entries(MODS).map(([k,M])=>`<button class="eg-mp ${c.mods.includes(k)?'on':''}" data-act="egCrMod" data-v="${k}"><i>${c.mods.includes(k)?'☑':'☐'}</i><span>${M.ic} <b>${M.en}</b><small>${esc(M.th)}</small></span><em>+${M.w}</em></button>`).join('')}</div>
      <div class="eg-crsum"><span>Difficulty<b class="eg-stars">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</b></span><span>Reward Multiplier<b>×${modMult(R)}</b></span><span>สถิติ<b>${best?`${fmt(best.score)} (${best.rank})`:'—'}</b></span></div>
      <button class="cbtn gold block lc-play" data-act="egCrGo" ${c.mods.length?'':'disabled'}>🧩 เริ่ม Challenge</button>
    </div>`;
}
function renderDailyView(){
  const d = egDaily(), w = egWeekly(), E = EGS();
  return `<div class="eg-hero dw"><span class="eg-hi">📅</span><div><span class="q2-kicker">DAILY · WEEKLY</span><h2>ความท้าทายประจำ</h2><p>Daily Challenge เปลี่ยนทุกเที่ยงคืน · Weekly Trial เปลี่ยนทุกวันจันทร์ พร้อม Cosmetic หายาก</p></div></div>
    <div class="panel eg-dc"><span class="q2-kicker">TODAY'S CHALLENGE</span><h3>${d.C.ic} ${d.C.en}</h3><p>${esc(d.C.th)}</p><div class="q2-meter big"><i style="width:${Math.round(d.cur/d.C.need*100)}%"></i></div>
      <div class="qr-foot"><span class="qr-rw"><small>${d.cur}/${d.C.need} · รางวัล</small>${egPreview(EG_DAILY_REWARD)}</span>${d.D.claimed?'<span class="qr-req">✔ รับแล้ว</span>':`<button class="cbtn ${d.done?'gold':'wood'} small" data-act="egDailyClaim" ${d.done?'':'disabled'}>รับรางวัล</button>`}</div></div>
    <div class="panel eg-dc wk"><span class="q2-kicker">WEEKLY TRIAL · ${w.W.week}</span><h3>${w.T.ic} ${w.T.en}</h3><p>${esc(w.T.th)} ภายใต้กติกา:</p><div class="eg-modrow">${modChips(rulesFromMods(w.T.mods),'')}</div>
      <div class="q2-meter big"><i style="width:${Math.round(w.W.wins/w.T.need*100)}%"></i></div>
      <div class="qr-foot"><span class="qr-rw"><small>${w.W.wins}/${w.T.need} · รางวัล</small>${egPreview(w.reward)}</span>${w.W.claimed?'<span class="qr-req">✔ รับแล้ว</span>':w.done?`<button class="cbtn gold small" data-act="egWeeklyClaim">รับรางวัล</button>`:`<button class="cbtn red small" data-act="egWeeklyGo">⚔️ ท้าทาย (สุ่มด่าน)</button>`}</div></div>`;
}
function renderMasteryView(){
  const W = wordCompletion(), E = EGS(), st = save.stats;
  const tiers = WTIERS.map((t,i)=>({ t, n:i ? ALL_WORDS.filter(x=>wordTier(x.word)===i).length : W.total - W.disc }));
  return `<div class="eg-hero wm"><span class="eg-hi">📖</span><div><span class="q2-kicker">WORD MASTERY · ENDGAME</span><h2>Word Completion</h2><p>Master คำศัพท์เป้าหมายทุกคำ · ระดับ Perfected ต้องใช้คำ 20 ครั้ง + ใช้ในคอมโบ 5+ + ใช้กับบอส + ใช้ใน Challenge/Nightmare</p></div></div>
    <div class="panel eg-wc"><div><small>Total Words</small><b>${fmt(W.total)}</b></div><div><small>Discovered</small><b>${fmt(W.disc)}</b></div><div><small>Mastered</small><b>${fmt(W.mast)}</b></div><div><small>Progress</small><b>${W.pct}%</b></div></div>
    <div class="q2-meter big"><i style="width:${W.pct}%"></i></div>
    <div class="panel eg-tierlist">${tiers.map(({t,n},i)=>`<div><span class="wt" style="--wt:${t.c}">${t.k}</span><span class="sub">${t.th}</span><div class="pf-mb"><i style="width:${Math.round(n/Math.max(1,W.total)*100)}%;background:${t.c}"></i></div><b>${n}</b></div>`).join('')}
      <button class="cbtn small wood" data-act="cxOpen" data-v="words">📖 เปิดโคเด็กซ์</button></div>
    <h3 class="q2-sec">Personal Best <small>สถิติส่วนตัว</small></h3>
    <div class="pf-stats">
      <div class="panel pf-stat"><small>Best Time (Speedrun)</small><b>${Object.values(E.speed).length ? fmtT(Math.min(...Object.values(E.speed).map(s=>s.best))) : '—'}</b></div>
      <div class="panel pf-stat"><small>Best Combo</small><b>🔥 x${Math.max(st.bestCombo||0, E.pb.combo||0)}</b></div>
      <div class="panel pf-stat"><small>Highest Damage</small><b>${fmt(st.bestDmg)} <small>${esc((st.bestWord||'').toUpperCase())}</small></b></div>
      <div class="panel pf-stat"><small>Fewest Mistakes</small><b>${E.pb.fewest===null?'—':E.pb.fewest}</b></div>
      <div class="panel pf-stat"><small>Fastest Boss Kill</small><b>${E.pb.bossMs?fmtT(E.pb.bossMs):'—'}</b></div>
      <div class="panel pf-stat"><small>Highest Endless Floor</small><b>🗼 ${E.endBest||0}</b></div>
    </div>`;
}
function renderRankView(){
  const I = mrInfo(), E = EGS(), un = mrUnclaimed();
  return `<div class="eg-hero mr" style="--rc:${I.R.c}"><span class="eg-mr-gem big"></span><div><span class="q2-kicker">MASTER RANK</span><h2>${I.R.k} <small>${I.R.th}</small></h2><p>คำนวณจากทุกด้านของเกม — เพิ่มได้ด้วยฝีมือเท่านั้น ไม่สามารถฟาร์มได้</p></div></div>
    <div class="panel eg-mrbar"><b>${fmt(I.pts)} MP</b><div class="q2-meter big"><i style="width:${I.pct}%"></i></div><small>${I.next?`อีก ${fmt(I.next.at-I.pts)} MP ถึง ${I.next.k}`:'ถึงระดับสูงสุดแล้ว'}</small>${un?`<button class="cbtn gold small" data-act="egMrClaim">รับรางวัล Rank (${un})</button>`:''}</div>
    <h3 class="q2-sec">ที่มาของคะแนน <small>Breakdown</small></h3>
    <div class="panel pf-parts eg-parts">${I.parts.map(([l,v])=>`<div><span>${l}</span><div class="q2-meter"><i style="width:${Math.min(100,Math.round(v/Math.max(1,I.pts)*100))}%"></i></div><b>${fmt(v)}</b></div>`).join('')}</div>
    <h3 class="q2-sec">ลำดับ Rank <small>Prestige Rewards</small></h3>
    <div class="eg-ladder">${MR.map((r,k)=>`<div class="eg-rung ${k<=I.i?'on':''} ${k===I.i?'cur':''}" style="--rc:${r.c}"><span class="eg-mr-gem"></span><span><b>${r.k}</b><small>${r.th} · ${fmt(r.at)} MP</small></span><span class="qr-rw">${r.r?egPreview(r.r):''}</span><i>${k<=(E.mrClaimed||0)?'✔':k<=I.i?'🎁':''}</i></div>`).join('')}</div>`;
}
function renderTfbView(){
  const ok = tfbUnlocked(), E = EGS();
  return `<div class="eg-hero tfb ${ok?'open':''}"><div class="eg-tfbart">${monsterIcon('lexivore')}</div><div><span class="q2-kicker">${ok?'TRUE FINAL BOSS UNLOCKED':'TRUE FINAL BOSS · LOCKED'}</span><h2>${ok||E.tfb.wins?'LEXIVORE':'???'}</h2><p>${ok||E.tfb.wins?'ผู้กลืนถ้อยคำ — สิ่งที่อยู่เบื้องหลังจอมเวทมรณะ มันกินคำทุกคำที่โลกลืม และจะใช้ทุกกติกาที่คุณเคยเจอมาต่อสู้กับคุณ':'มีบางอย่างซ่อนอยู่หลังจอมเวทมรณะ… ทำเงื่อนไขทั้งหมดให้ครบเพื่อเผชิญหน้ากับมัน'}</p></div></div>
    <h3 class="q2-sec">เงื่อนไขปลดล็อก <small>${TFB_REQ.filter(r=>r.cur()>=r.need).length}/${TFB_REQ.length}</small></h3>
    <div class="panel eg-req">${TFB_REQ.map(r=>{ const c = r.cur(), d = c>=r.need; return `<div class="${d?'done':''}"><i>${d?'☑':'☐'}</i><span>${esc(r.th)}</span><b>${fmt(c)}/${fmt(r.need)}</b></div>`; }).join('')}</div>
    ${ok||E.tfb.wins?`<h3 class="q2-sec">กลไกการต่อสู้ <small>6 Phases</small></h3><div class="panel eg-phases">${TFB_PHASES.slice(1).map(p=>`<div><b>${p.en}</b><span>${esc(p.th)}</span></div>`).join('')}</div>`:''}
    <h3 class="q2-sec">รางวัล <small>ครั้งแรก</small></h3><div class="panel eg-rwinfo"><span class="qr-rw">${egPreview({ title:'truehero', aura:'cosmos', trail:'legend', victory:'supernova', badge:'crown', frame:'crown', nc:500, cc:500 })}</span></div>
    <button class="cbtn ${ok?'red':'wood'} block lc-play" data-act="egTfbGo" ${ok?'':'disabled'}>☠️ ${ok?'เผชิญหน้า LEXIVORE':'ยังไม่ปลดล็อก'}</button>`;
}
function renderShopView(){
  const E = EGS(), kinds = ['aura','trail','victory','badge','frame','mat'];
  return `<div class="eg-hero sh"><span class="eg-hi">💠</span><div><span class="q2-kicker">PRESTIGE SHOP</span><h2>ร้านเกียรติยศ</h2><p>ของแต่งตัวที่แสดงความสำเร็จ — ไม่เพิ่มพลังต่อสู้ · 🌙 Nightmare Coins จาก Nightmare · 🏅 Challenge Coins จาก Challenge/Perfect/Speedrun/Endless/Daily</p></div></div>
    ${kinds.map(k=>`<h3 class="q2-sec">${cosKindTh[k]}</h3><div class="eg-shop">${PRESTIGE.filter(it=>it.k===k).map(it=>{ const own = cosOwned(it), can = E[it.cur] >= it.price;
      return `<div class="panel eg-it ${own?'own':''}">${it.k==='mat'?`<span class="eg-iti">${matIcon(it.v)}</span>`:it.k==='badge'?`<span class="eg-iti">${COS.badge[it.v].ic}</span>`:it.k==='aura'?`<span class="eg-iti eg-swatch" style="--a:${COS.aura[it.v].c[0]};--b:${COS.aura[it.v].c[1]}"></span>`:it.k==='trail'?`<span class="eg-iti eg-trail" style="--a:${COS.trail[it.v].c}"></span>`:it.k==='frame'?`<span class="eg-iti pf-ava sm ${FRAMES[it.v].css}">${heroFaceSvg(save.eq)}</span>`:`<span class="eg-iti">🎆</span>`}
        <b>${esc(cosName(it))}</b>${own?'<em class="inv-own">✔ มีแล้ว</em>':`<button class="cbtn small ${can?'gold':'wood'}" data-act="egBuy" data-v="${it.id}" ${can?'':'disabled'}>${it.cur==='nc'?'🌙':'🏅'} ${fmt(it.price)}</button>`}</div>`; }).join('')}</div>`).join('')}
    <p class="sub">ใส่ของที่ได้ได้ที่ โปรไฟล์ → สไตล์</p>`;
}
function renderEndgame(){
  const v = ui.egView || 'hall';
  const body = { hall:renderHall, nightmare:renderNightmareView, endless:renderEndlessView, speed:renderSpeedView, perfect:renderPerfectView, creator:renderCreatorView, daily:renderDailyView, mastery:renderMasteryView, rank:renderRankView, tfb:renderTfbView, shop:renderShopView }[v] || renderHall;
  if(!storyDone() && ['nightmare','speed','perfect','creator','daily'].includes(v)){ ui.egView = 'hall'; return egHeader('hall') + renderHall(); }
  return egHeader(v) + `<div class="eg-body eg-v-${v}">${body()}</div>`;
}
SCREENS.endgame = { nav:'hub', render:renderEndgame, key:()=>ui.egView||'hall' };

/* ------------------------------ actions ------------------------------ */
const endRun = ()=>{ ui.run = null; };
['toHub','toMap','toShop','stage','playNext','goTower'].forEach(k=>{ const f = ACTS2[k]; if(f) ACTS2[k] = function(){ endRun(); return f.apply(this, arguments); }; });
Object.assign(ACTS2, {
  egView: v=>{ ui.egView = v; if(v==='hall' && storyDone()) EGS().seenHall = true; if(ui.screen!=='endgame') goTo('endgame'); else { ui.v2dir = v==='hall' ? 'zoom-out' : 'zoom-in'; ui.v2prev = null; render(); } sfx.tap && sfx.tap(2); },
  egTrophy: ()=>{ ui.pfTab = 'trophy'; goTo('profile'); },
  egNm: v=>{ const [ch,n] = v.split('-').map(Number); if(!nmStageOpen(ch,n)) return; closeModal(); ui.bat = null; startNightmare(ch,n); },
  egSpeed: v=>{ startSpeed(+v); },
  egPerfect: v=>{ const [ch,n] = v.split('-').map(Number); startPerfect(ch,n); },
  egCrCh: v=>{ ui.egCr.ch = +v; ui.egCr.n = 1; render(); },
  egCrN: v=>{ ui.egCr.n = +v; render(); },
  egCrMod: v=>{ const m = ui.egCr.mods, i = m.indexOf(v); i<0 ? m.push(v) : m.splice(i,1); sfx.tap && sfx.tap(3); render(); },
  egCrGo: ()=>{ const c = ui.egCr; if(!c.mods.length || stageIndex(c.ch,c.n)>=save.cleared) return; startCustom(c.ch, c.n, c.mods); },
  egWeeklyGo: ()=>{ startWeekly(); },
  egTfbGo: ()=>{ if(tfbUnlocked()) startTFB(); },
  egDailyClaim: ()=>{ const d = egDaily(); if(!d.done || d.D.claimed) return; d.D.claimed = true; const html = egGrant(EG_DAILY_REWARD); claimModal('Daily Challenge!', html, `${d.C.ic} ${d.C.en}`); render(); },
  egWeeklyClaim: ()=>{ const w = egWeekly(); if(!w.done || w.W.claimed) return; w.W.claimed = true; const html = egGrant(w.reward); claimModal('Weekly Trial!', html, `${w.T.ic} ${w.T.en}`); render(); },
  egMrClaim: ()=>{ const html = mrClaim(); if(html){ claimModal(`MASTER RANK · ${mrInfo().R.k}`, html); render(); } },
  egBuy: v=>{ const it = PRESTIGE.find(x=>x.id===v), E = EGS(); if(!it || cosOwned(it) || E[it.cur] < it.price) return;
    E[it.cur] -= it.price; const R = it.k==='mat' ? { mats:{ [it.v]:1 } } : { [it.k]:it.v }; const html = it.k==='frame' ? grant(R) : egGrant(R); sfx.buy && sfx.buy(); persist(); toast(`💠 ได้รับ ${esc(cosName(it))}`); render(); },
  egNext: ()=>{ const r = ui.run; if(!r || r.type!=='speed') return; closeModal(); r.n++; r.pending = true; startStage(r.ch, r.n); },
  egQuit: ()=>{ closeModal(); ui.run = null; ui.bat = null; ui.egView = 'speed'; goTo('endgame', 'rise'); },
  egRetry: ()=>{ const L = ui.egLast; closeModal(); ui.bat = null; if(!L) return goTo('endgame');
    ({ nightmare:()=>startNightmare(L.ch, L.n), perfect:()=>startPerfect(L.ch, L.n), speed:()=>startSpeed(L.ch), custom:()=>startCustom(L.ch, L.n, L.mods), weekly:()=>startWeekly(), tfb:()=>startTFB() }[L.type] || (()=>goTo('endgame')))(); },
  egBack: v=>{ closeModal(); ui.bat = null; ui.pz = null; ui.run = null; ui.egView = v || 'hall'; goTo('endgame', 'rise'); },
  eqCos: (v, el)=>{ const k = el.dataset.k, E = EGS(); if(!E.cos.own[k] || !E.cos.own[k].includes(v)) return; E.cos.eq[k] = v; persist(); sfx.tap && sfx.tap(3); render(); },
  trCat: v=>{ ui.trCat = v; render(); },
});
// the pause menu "leave stage" during a challenge goes back to the Challenge Hall
ACTS2.toMap = (f=>function(){ const b = ui.bat; if(b && b.egRun){ const v = { nightmare:'nightmare', perfect:'perfect', speed:'speed', custom:'creator', weekly:'daily', tfb:'tfb' }[b.egRun.type]; closeModal(); ui.bat = null; ui.run = null; ui.egView = v; goTo('endgame','rise'); return; } return f.apply(this, arguments); })(ACTS2.toMap);
// notes from challenge rewards appear outside battle as toasts
QL2.bus.push(()=>{ try{ checkAchievements(); }catch(e){} });
// the equipped aura also glows around the hero in the Hub and the Hero Sanctum
function auraStyle(){ const A = COS.aura[EGS().cos.eq.aura]; return A && A.c ? ` eg-aurahost" style="--au1:${A.c[0]};--au2:${A.c[1]}` : ''; }
{
  const h = SCREENS.hub.render; SCREENS.hub.render = function(){ return h().replace('<button class="hub-hero"', `<button class="hub-hero${auraStyle()}"`); };
  const r = SCREENS.heroes.render; SCREENS.heroes.render = function(){ const s = r(); return (ui.hsPick||save.eq.char)===save.eq.char ? s.replace('<div class="hs-hero ', `<div class="hs-hero ${auraStyle().replace(/^ /,'')} `) : s; };
}
