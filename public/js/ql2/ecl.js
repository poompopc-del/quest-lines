/* ==========================================================================
   LETTERⁿ v65 — 🎓 ECL EXAM QUEST (V1)
   --------------------------------------------------------------------------
   THE EXAM IS THE GAME:  content → quest → battle → answer → consequence →
   results → progress.  Reuses the game's scene (Star Meadow), hero sprite,
   enemy sprites, attack / hurt animations, floating text, sfx, EXP (addXp)
   and the word book (recordWord) — no second combat engine.

   Screens (☰ More → 🎓 ECL EXAM):
     ecl         level select (A2 · B1 · B2 · C1) + ECL progress
     eclLevel    skills of one level (Reading · Listening · Writing) with tasks
     'exam'      full-screen quest: brief → document / audio → battle →
                 results → mistake review   ·   writing quest → self review
   Content: data/ecl-content.js (lazy-loaded) — original ECL-style practice,
   never presented as an official ECL exam. Writing is NOT auto-graded:
   players self-review with the five ECL writing criteria.
   Save: save.ecl = { tasks:{ id:{best,total,acc,combo,plays,cleared,xp,at,last} },
                      writing:{ id:{text,words,chars,secs,bullets,self,xp,at} } }
   ========================================================================== */
(function(){
  const LV = ['A2','B1','B2','C1'];
  const SK = {
    reading:   { ic:'📖', en:'READING',   th:'การอ่าน' },
    listening: { ic:'🎧', en:'LISTENING', th:'การฟัง' },
    writing:   { ic:'✍️', en:'WRITING',   th:'การเขียน' },
  };
  // ECL writing criteria (eclexam.eu/proba — five criteria, 0–5 points each)
  const CRIT = [
    ['ความถูกต้องของไวยากรณ์', 'Formal accuracy'],
    ['การเรียบเรียงข้อความ / การสะกด', 'Text construction & spelling'],
    ['ความหลากหลายของคำศัพท์', 'Vocabulary range'],
    ['ภาษาเหมาะกับสถานการณ์', 'Style (pragmatic / sociolinguistic)'],
    ['สื่อสารครบตามโจทย์', 'Communicative effectiveness'],
  ];
  const PASS = .6;                        // ECL: at least 60% overall (and 40% per skill)
  const XP = { perCorrect:6, comboMin:3, comboPer:2, clear:30, firstGold:60, write:30, writeBullets:10 };
  const HIT = 10;                         // enemy HP per question in its room
  let LIB = null, loading = null;

  /* ------------------------------ data ------------------------------ */
  function load(){
    if(window.ECL_LIBRARY){ LIB = window.ECL_LIBRARY; return Promise.resolve(LIB); }
    if(loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'data/ecl-content.js?v=65';
      s.onload = () => { LIB = window.ECL_LIBRARY; res(LIB); };
      s.onerror = () => { loading = null; rej(new Error('load')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  const ES = () => { if(!save.ecl || typeof save.ecl!=='object') save.ecl = {}; const e = save.ecl; e.tasks = e.tasks || {}; e.writing = e.writing || {}; return e; };
  const tasksOf = (lv, sk) => (LIB && LIB.levels[lv] && LIB.levels[lv][sk]) || [];
  const findTask = id => { for(const lv of LV) for(const sk in SK) { const t = tasksOf(lv, sk).find(x => x.id===id); if(t) return t; } return null; };
  const done = t => t.skill==='writing' ? !!(ES().writing[t.id] && ES().writing[t.id].at) : !!(ES().tasks[t.id] && ES().tasks[t.id].cleared);
  function skillProg(lv, sk){ const L = tasksOf(lv, sk); return { n:L.length, d:L.filter(done).length }; }
  function levelProg(lv){ let n = 0, d = 0; for(const sk in SK){ const p = skillProg(lv, sk); n += p.n; d += p.d; } return n ? d/n : 0; }
  const bar = (p, col) => `<span class="ecl-bar" style="--p:${Math.round(p*100)}%;--c:${col||'#ffd27a'}"><i></i></span>`;
  const badge = t => `<span class="ecl-src" title="${esc(t.sourceName||'')}">ECL-style Practice</span>`;
  const shuffle = (a, rng) => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(rng()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };

  /* ------------------------------ screens ------------------------------ */
  function renderHome(){
    if(!LIB){ load().then(() => { if(ui.screen==='ecl') render(); }).catch(() => toast('โหลดคลังข้อสอบไม่ได้ ลองใหม่อีกครั้ง')); return `<div class="ecl-load">🎓 กำลังเปิดคลังข้อสอบ…</div>`; }
    const I = LIB.levelInfo;
    return `<div class="ecl-head"><span class="q2-kicker">ECL EXAM QUEST</span><h2 class="q2-h">🎓 ECL EXAM</h2>
        <p class="ecl-sub">Choose your challenge · ฝึกทักษะสอบ ECL ผ่านการต่อสู้</p></div>
      <div class="ecl-levels">${LV.map(lv => { const p = levelProg(lv), L = I[lv];
        return `<button class="ecl-lv" data-act="eclLevel" data-v="${lv}" style="--c:${L.col}"><b>${lv}</b><span>${esc(L.en)}<small>${esc(L.th)}</small></span>${bar(p, L.col)}<em>${Math.round(p*100)}%</em></button>`; }).join('')}</div>
      <section class="panel ecl-prog"><h3>ECL PROGRESS</h3>
        ${LV.map(lv => `<div class="ecl-pr"><b>${lv}</b>${Object.keys(SK).map(sk => { const s = skillProg(lv, sk); return `<span title="${SK[sk].en}">${SK[sk].ic}${bar(s.n ? s.d/s.n : 0, I[lv].col)}</span>`; }).join('')}</div>`).join('')}</section>
      <p class="ecl-note">ℹ️ ข้อสอบในโหมดนี้เป็น <b>ECL-style Practice</b> ที่เขียนขึ้นใหม่ตามรูปแบบข้อสอบ ECL (ทักษะละ 2 Task · Reading/Listening Task ละ 10 ข้อ · ตัวเลือก 3 ข้อ · Listening ฟังได้ 2 รอบ · เกณฑ์ผ่าน 60%) <b>ไม่ใช่ข้อสอบ ECL ทางการ</b> · ข้อมูลรูปแบบจาก <a href="https://eclexam.eu/proba/" target="_blank" rel="noopener">eclexam.eu</a></p>`;
  }
  function renderLevel(){
    if(!LIB){ load().then(() => render()); return `<div class="ecl-load">🎓 กำลังโหลด…</div>`; }
    const lv = LV.includes(ui.eclLv) ? ui.eclLv : 'A2', L = LIB.levelInfo[lv];
    const card = t => {
      const sk = t.skill, r = sk==='writing' ? ES().writing[t.id] : ES().tasks[t.id];
      let st = '<span class="ecl-st new">NEW</span>', info = sk==='writing' ? `${t.words} คำ · ${t.minutes} นาที · 4 ประเด็น` : `10 ข้อ${sk==='listening' ? ' · ฟังได้ 2 รอบ' : ''}`;
      if(r && sk!=='writing'){ st = r.cleared ? '<span class="ecl-st ok">✔ CLEAR</span>' : '<span class="ecl-st try">ลองอีก</span>'; info += ` · ดีที่สุด ${r.best}/${r.total} (${Math.round((r.acc||0)*100)}%) · Combo x${r.combo||0}`; }
      if(r && sk==='writing' && r.at){ st = '<span class="ecl-st ok">✔ ส่งแล้ว</span>'; info += ` · ${r.words} คำ`; }
      if(r && r.xp) info += ` · EXP ${fmt(r.xp)}`;
      return `<button class="ecl-task" data-act="eclStart" data-v="${t.id}"><span class="ecl-ti">${SK[sk].ic}</span><span class="ecl-tt"><b>${esc(t.title)}</b><small>${esc(t.th||'')}</small><i>${info}</i></span>${st}</button>`;
    };
    return `<div class="ecl-lvhead" style="--c:${L.col}"><span class="q2-kicker">ECL ${lv} · ${esc(L.en)}</span><h2 class="q2-h">${lv} <small>${esc(L.th)}</small></h2>${bar(levelProg(lv), L.col)}</div>
      ${Object.keys(SK).map(sk => { const T = tasksOf(lv, sk), p = skillProg(lv, sk);
        return `<section class="ecl-skill"><h3>${SK[sk].ic} ${SK[sk].en} <small>${SK[sk].th} · ${p.d}/${p.n} Challenge</small></h3>${T.length ? T.map(card).join('') : '<p class="ecl-note">ยังไม่มีชุดฝึก</p>'}</section>`; }).join('')}
      <section class="ecl-skill soon"><h3>🗣️ SPEAKING <small>เร็วๆ นี้</small></h3><p class="ecl-note">ECL ทดสอบการพูดเป็นคู่กับผู้คุมสอบ 2 คน — โหมดนี้จะเพิ่มในอนาคต</p></section>`;
  }
  SCREENS.ecl = { nav:'more', back:'more', render:renderHome };
  SCREENS.eclLevel = { nav:'more', back:'ecl', render:renderLevel, key:() => ui.eclLv };
  // the exam itself owns the whole screen
  render = (f => function(){ if(ui.screen==='exam') return; return f.apply(this, arguments); })(render);

  /* ------------------------------ quest flow ------------------------------ */
  const app = () => $('#app');
  function enterExam(html){ ui.screen = 'exam'; closeModal(); app().innerHTML = `<div class="ecl-x">${html}</div>`; }
  function leave(to){
    try{ AUD.stop(); }catch(e){}
    clearInterval(ui.exTimer); ui.exTimer = null;
    ui.bat = null; ui.ex = null; closeModal();
    ui.screen = to || 'eclLevel'; ui.v2prev = null; render();
  }
  function start(id){
    const t = findTask(id); if(!t){ toast('ไม่พบชุดฝึก'); return; }
    ui.eclLv = t.level;
    if(t.skill==='writing') return writeBrief(t);
    const icon = SK[t.skill].ic;
    enterExam(`<div class="ecl-brief" style="--c:${LIB.levelInfo[t.level].col}">
      <button class="ecl-quit" data-act="eclQuit" aria-label="ออก">${IC2.close}</button>
      <div class="ecl-kick">ECL ${t.level} · ${SK[t.skill].en} QUEST</div>
      <div class="ecl-scroll"><div class="ecl-qt">${icon} QUEST: ${esc(t.title.toUpperCase())}</div><p>${esc(t.brief)}</p>
        <ul><li>10 คำถาม · ตัวเลือก ${t.options ? t.options.length : 3} ข้อ</li><li>ตอบถูก = ฟันศัตรู · ต่อเนื่อง = COMBO</li><li>ตอบผิด = ศัตรูโจมตีกลับ</li>${t.skill==='listening' ? `<li>🎧 เปิดฟังได้ ${t.plays||2} รอบ (เหมือนสอบจริง)</li>` : '<li>📜 เปิดอ่านเอกสารซ้ำได้ระหว่างสู้</li>'}<li>ผ่านเกณฑ์ ${PASS*100}% = QUEST CLEAR</li></ul>
        ${badge(t)}</div>
      <button class="cbtn gold block" data-act="${t.skill==='reading' ? 'eclDoc' : 'eclBattle'}" data-v="${t.id}">${t.skill==='reading' ? '📜 READ DOCUMENT' : '⚔️ BEGIN QUEST'}</button></div>`);
  }
  const docHtml = t => `<article class="ecl-doc"><h3>${esc(t.passageTitle||t.title)}</h3>${t.passage.map(p => `<p>${esc(p)}</p>`).join('')}<footer>${badge(t)}</footer></article>`;
  function showDoc(id, inBattle){
    const t = findTask(id);
    if(inBattle){ modal(`<div class="ecl-docm">${docHtml(t)}<button class="cbtn gold block" data-act="closeModal">กลับไปสู้ต่อ ⚔️</button></div>`, { dismiss:true }); return; }
    enterExam(`<div class="ecl-reader"><div class="ecl-rbar"><button class="ecl-quit" data-act="eclQuit" aria-label="ออก">${IC2.close}</button><span>📜 ${esc(t.title)}</span></div>
      ${docHtml(t)}<button class="cbtn gold block ecl-go" data-act="eclBattle" data-v="${t.id}">⚔️ BEGIN BATTLE</button></div>`);
  }

  /* ------------------------------ battle ------------------------------ */
  function battle(id){
    const t = findTask(id); if(!t) return;
    const rng = mulberry(Date.now() % 100000);
    // shuffled choice order per play (answers are not always in the same place)
    const qs = t.questions.map(q => {
      const base = (q.type==='matching' ? t.options : q.choices).map((c, i) => ({ c, k:'ABCD'[i] }));
      return { q, opts: q.type==='matching' ? base : shuffle(base, rng) };
    });
    const s = 8 + LV.indexOf(t.level)*4;
    const enemies = [];
    t.rooms.forEach((r, ri) => { const e = makeEnemy(r.key, s, mulberry(hashStr(t.id+ri)), false, !!r.mini); e.hp = e.maxHp = r.n*HIT; e.golden = false; e.name = MON[r.key].name; e.th = MON[r.key].th; e.traits = []; e.room = r.n; enemies.push(e); });
    ui.bat = { exam:true, stage:{ ch:1, n:1, s, theme:'woods', enemies }, idx:0, hp:100, max:100, busy:true, sel:[], tiles:[], combo:0, ult:0, recent:[], words:0, score:0, kills:0, goldGain:0, dist:0 };
    const wrongDmg = Math.ceil(100 / (Math.floor(qs.length*(1-PASS*.5))+1));   // ≈ 7 wrong answers (< 40%) knock you out
    ui.ex = { t, qs, qi:0, room:0, roomQ:0, answers:[], combo:0, best:0, correct:0, ko:false, wrongDmg, t0:Date.now(), plays:0 };
    ui.screen = 'exam'; closeModal();
    app().innerHTML = `<div class="battle ecl-battle"><div class="stage" id="stage">${sceneSVG('woods', hashStr(t.id), 2)}
        <div class="ecl-hud"><button class="ecl-quit" data-act="eclQuit" aria-label="ออก">${IC2.close}</button>
          <div class="ecl-me"><span class="ecl-face">${heroFaceSvg(save.eq)}</span><span class="ecl-hp"><i id="exHp"></i><b id="exHpT">100/100</b></span></div>
          <div class="ecl-qn"><b id="exQn">1/${qs.length}</b><small id="exCombo"></small></div></div>
      </div><div class="ecl-dock" id="exDock"></div></div>`;
    const act = $('#actors');
    act.innerHTML = `<g id="enemyQ"></g><g id="enemyG"></g><g id="heroG"><g class="actor idle" id="heroA">${charSVG(save.eq)}</g></g>`;
    setT($('#heroG'), -120, FLOOR_Y);
    placeEnemies(true); fitScene();
    introWalk().then(() => { banner(`${SK[t.skill].en} QUEST`, t.title); ui.bat.busy = false; drawQ(); });
    if(t.skill==='listening') AUD.prepare(t);
  }
  function scroll(dist, ms){
    const b = ui.bat, L = [['#lyBack',.2],['#lyFar',.45],['#lyNear',1],['#lyFloor',1],['#lyFore',1.3]].map(([q,k]) => [$(q),k]);
    const d0 = b.dist||0, t0 = performance.now();
    return new Promise(res => { function fr(now){ const k = Math.min(1, (now-t0)/ms), d = d0 + dist*k; b.dist = d;
      L.forEach(([el,f]) => { if(el) el.setAttribute('transform', `translate(${(-d*f).toFixed(1)},0)`); }); if(k<1 && ui.bat===b) requestAnimationFrame(fr); else res(); } requestAnimationFrame(fr); });
  }
  async function introWalk(){
    const hero = $('#heroA'), eg = $('#enemyG'), qg = $('#enemyQ'), dur = 1300;
    hero.classList.add('walk');
    anim($('#heroG'), [{transform:tr(-120,FLOOR_Y)},{transform:tr(HERO_X,FLOOR_Y)}], { duration:dur, easing:'ease-out', fill:'forwards' });
    anim(eg, [{transform:tr(EN_X+320,FLOOR_Y)},{transform:tr(EN_X,FLOOR_Y)}], { duration:dur, easing:'ease-out', fill:'forwards' });
    anim(qg, [{transform:tr(Q_X+320,FLOOR_Y,.82)},{transform:tr(Q_X,FLOOR_Y,.82)}], { duration:dur, easing:'ease-out', fill:'forwards' });
    await scroll(240, dur);
    hero.classList.remove('walk'); getAnims([$('#heroG'), eg, qg]); setT($('#heroG'), HERO_X, FLOOR_Y); setT(eg, EN_X, FLOOR_Y); setT(qg, Q_X, FLOOR_Y, .82);
    updateEnemyHp();
  }
  function hud(){
    const b = ui.bat, x = ui.ex; if(!b || !x) return;
    const hp = $('#exHp'); if(hp){ hp.style.width = Math.max(0, b.hp)/b.max*100 + '%'; $('#exHpT').textContent = x.ko ? 'KO' : `${Math.max(0, b.hp)}/${b.max}`; }
    const qn = $('#exQn'); if(qn) qn.textContent = `${Math.min(x.qi+1, x.qs.length)}/${x.qs.length}`;
    const c = $('#exCombo'); if(c){ c.textContent = x.combo>=2 ? `🔥 COMBO x${x.combo}` : ''; c.classList.toggle('hot', x.combo>=3); }
  }
  function drawQ(){
    const x = ui.ex, b = ui.bat; if(!x) return;
    const { q, opts } = x.qs[x.qi], t = x.t, last = x.qi===x.qs.length-1, e = curEnemy();
    const tag = last ? '<span class="ecl-tag fin">FINAL QUESTION</span>' : e && e.mini ? '<span class="ecl-tag mini">MINI BOSS</span>' : `<span class="ecl-tag">ROOM ${String(x.room+1).padStart(2,'0')}</span>`;
    const tool = t.skill==='reading' ? `<button class="ecl-tool" data-act="eclDocView" data-v="${t.id}">📜 เอกสาร</button>` : AUD.html();
    $('#exDock').innerHTML = `<div class="ecl-qbox">
        <div class="ecl-qh">${tag}<span>Question ${String(x.qi+1).padStart(2,'0')} / ${x.qs.length}</span>${tool}</div>
        <div class="ecl-qp">${esc(q.prompt)}</div>
        <div class="ecl-ch">${opts.map((o, i) => `<button class="ecl-c" data-act="eclAns" data-v="${o.k}"><b>${q.type==='matching' ? o.k : 'ABC'[i]}</b><span>${esc(q.type==='matching' ? o.c.replace(/^[A-D] — /,'') : o.c)}</span></button>`).join('')}</div>
        <div class="ecl-fb" id="exFb"></div></div>`;
    hud(); AUD.sync();
  }
  async function answer(k){
    const x = ui.ex, b = ui.bat; if(!x || !b || b.busy) return;
    const { q, opts } = x.qs[x.qi], ok = k===q.correctAnswer, e = curEnemy();
    b.busy = true;
    x.answers.push({ qid:q.id, pick:k, ok });
    document.querySelectorAll('.ecl-c').forEach(btn => { btn.disabled = true; const v = btn.dataset.v; if(v===q.correctAnswer) btn.classList.add('right'); else if(v===k) btn.classList.add('wrong'); });
    const label = v => { const o = opts.find(z => z.k===v), i = opts.indexOf(o); return `${q.type==='matching' ? v : 'ABC'[i]}. ${esc(q.type==='matching' ? o.c.replace(/^[A-D] — /,'') : o.c)}`; };
    const fb = $('#exFb');
    if(ok){
      x.correct++; x.combo++; x.best = Math.max(x.best, x.combo);
      fb.innerHTML = `<b class="ok">✓ CORRECT!</b>${x.combo>=2 ? ` <span class="cmb">COMBO x${x.combo}</span>` : ''}${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}`;
      ui.atkLen = 0; await heroAttack(Math.min(5, x.combo), false);
      e.hp -= HIT; sfx.hit(x.combo>=3); enemyHurt(HIT, x.combo>=3); updateEnemyHp();
      if(x.combo>=3) floatText(`🔥 COMBO x${x.combo}`, HERO_X+40, FLOOR_Y-210, '#ffb04a', 26, true);
    } else {
      x.combo = 0;
      fb.innerHTML = `<b class="bad">✗ WRONG — ENEMY ATTACKS!</b><p>Correct Answer: <b>${label(q.correctAnswer)}</b></p>${q.explanation ? `<p class="ex">${esc(q.explanation)}</p>` : '<p class="ex">No explanation available.</p>'}`;
      await enemyAttackAnim();
      if(!x.ko){ b.hp = Math.max(0, b.hp - x.wrongDmg); sfx.hurt(); heroHurt(x.wrongDmg, false);
        if(b.hp<=0){ x.ko = true; banner('KNOCKED OUT', 'ตอบต่อให้จบเพื่อฝึก — แต่ Quest นี้ไม่ผ่าน'); } }
    }
    hud();
    fb.insertAdjacentHTML('beforeend', `<button class="cbtn gold block ecl-next" data-act="eclNext">${x.qi===x.qs.length-1 ? 'ดูผลลัพธ์ ▶' : 'ข้อต่อไป ▶'}</button>`);
    b.busy = false;
    const nb = document.querySelector('.ecl-next'); if(nb) nb.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }
  async function next(){
    const x = ui.ex, b = ui.bat; if(!x || !b || b.busy) return;
    b.busy = true; x.qi++; x.roomQ++;
    const e = curEnemy();
    if(e && x.roomQ >= e.room){
      // end of this room: defeated or escaped
      const g = $('#enemyG'), body = g && g.querySelector('.enemy');
      if(e.hp<=0){ b.kills++; sfx.poof(); poof(EN_X, FLOOR_Y - e.h*e.sc*.5, e.mini ? 1.4 : 1); if(body) body.animate([{ transform:'translate(0,0) scale(1)', opacity:1 },{ transform:'translate(20px,0) scale(1.2,.2)', opacity:0 }], { duration:450, fill:'forwards' }); floatText('DEFEATED!', EN_X, FLOOR_Y-e.h*e.sc-40, '#ffe14a', 30, true); }
      else { floatText('หนีไปได้!', EN_X, FLOOR_Y-e.h*e.sc-40, '#bfe8ff', 26, true); anim(g, [{transform:tr(EN_X,FLOOR_Y)},{transform:tr(EN_X+420,FLOOR_Y)}], { duration:700, easing:'ease-in', fill:'forwards' }); }
      await sleep(800);
      b.idx++; x.room++; x.roomQ = 0;
      if(x.qi < x.qs.length && curEnemy()) await walkOn();
    }
    if(x.qi >= x.qs.length){ b.busy = false; return results(); }
    if(x.qi===x.qs.length-1) banner('FINAL QUESTION!', 'ข้อสุดท้าย');
    b.busy = false; drawQ();
    const d = $('#exDock'); if(d) d.scrollTop = 0;
  }
  async function walkOn(){
    const b = ui.bat, hero = $('#heroA'), eg = $('#enemyG'), qg = $('#enemyQ'), n = curEnemy(), after = b.stage.enemies[b.idx+1];
    eg.getAnimations().forEach(a => a.cancel()); eg.style.opacity = 1;
    eg.innerHTML = n ? enemyMarkup(n, false) : ''; setT(eg, Q_X, FLOOR_Y, .82);
    qg.innerHTML = after ? enemyMarkup(after, true) : ''; setT(qg, Q_X+320, FLOOR_Y, .82);
    updateEnemyHp(); hero.classList.add('walk');
    anim(eg, [{transform:tr(Q_X+60,FLOOR_Y,.82)},{transform:tr(EN_X,FLOOR_Y,1)}], { duration:1200, easing:'ease-in-out', fill:'forwards' });
    anim(qg, [{transform:tr(Q_X+320,FLOOR_Y,.82)},{transform:tr(Q_X,FLOOR_Y,.82)}], { duration:1200, easing:'ease-in-out', fill:'forwards' });
    await scroll(300, 1200);
    getAnims([eg, qg]); setT(eg, EN_X, FLOOR_Y); setT(qg, Q_X, FLOOR_Y, .82); hero.classList.remove('walk');
    if(n && n.mini){ sfx.boss(); banner('MINI BOSS!', n.th, 'mini'); shake(false); await sleep(600); }
  }

  /* ------------------------------ results + review ------------------------------ */
  function vocabBlock(t){
    const rows = (t.keyWords||[]).map(w => { let m = null; try{ m = VocabularyManager.lookup(w); }catch(e){}
      const inBook = m && save.book && save.book[m.base];
      return `<div class="ecl-w"><button class="spk" data-act="say" data-v="${esc(w)}" aria-label="ฟังเสียง">🔊</button><b>${esc(w)}</b><span>${m && m.thai ? esc(m.thai) : '<i>— ยังไม่มีคำแปลในคลัง</i>'}</span>${m && m.thai ? (inBook ? '<em>✓ ในสมุด</em>' : `<button class="cbtn small wood" data-act="eclBook" data-v="${esc(w)}">+ สมุด</button>`) : ''}</div>`; }).join('');
    return rows ? `<section class="ecl-vocab"><h4>📚 KEY WORDS <small>คำศัพท์สำคัญในชุดนี้</small></h4>${rows}<button class="ecl-link" data-act="eclVocab">VIEW VOCABULARY ›</button></section>` : '';
  }
  function results(){
    const x = ui.ex, t = x.t, n = x.qs.length, acc = x.correct/n, clear = acc >= PASS && !x.ko;
    try{ AUD.stop(); }catch(e){}
    const E = ES(), prev = E.tasks[t.id] || { best:0, xp:0, plays:0 };
    const earned = x.correct*XP.perCorrect + (x.best>=XP.comboMin ? x.best*XP.comboPer : 0) + (clear ? XP.clear : 0);
    const gain = Math.max(0, earned - (prev.xp||0));          // replays only pay for doing better than before
    const firstClear = clear && !prev.cleared;
    const rec = E.tasks[t.id] = { best:Math.max(prev.best||0, x.correct), total:n, acc:Math.max(prev.acc||0, acc), combo:Math.max(prev.combo||0, x.best),
      plays:(prev.plays||0)+1, cleared:!!(prev.cleared || clear), xp:Math.max(prev.xp||0, earned), at:Date.now(), last:{ correct:x.correct, acc, combo:x.best, secs:Math.round((Date.now()-x.t0)/1000) } };
    if(gain) addXp(gain);
    if(firstClear) save.gold += XP.firstGold;
    persist();
    x.result = { acc, clear, gain, firstClear }; ui.bat = null;
    const wrong = x.answers.filter(a => !a.ok).length, sk = skillProg(t.level, t.skill), lp = levelProg(t.level);
    if(clear){ sfx.win && sfx.win(); } else { sfx.lose && sfx.lose(); }
    enterExam(`<div class="ecl-res ${clear?'clear':'fail'}">
      <div class="ecl-rt">${clear ? 'QUEST CLEAR' : x.ko ? 'KNOCKED OUT' : 'QUEST FAILED'}<small>ECL ${t.level} · ${SK[t.skill].en} · ${esc(t.title)}</small></div>
      <div class="ecl-stats">
        <div><span>Accuracy</span><b>${Math.round(acc*100)}%</b></div><div><span>Correct</span><b>${x.correct} / ${n}</b></div>
        <div><span>Best Combo</span><b>×${x.best}</b></div><div><span>EXP</span><b>+${fmt(gain)}</b></div></div>
      ${!gain && earned ? `<p class="ecl-note">EXP จะได้เฉพาะเมื่อทำได้ดีกว่าสถิติเดิม (ดีที่สุด EXP ${fmt(rec.xp)})</p>` : ''}
      ${firstClear ? `<div class="rewards"><span class="pill">${ICON.coin}+${XP.firstGold}</span><span class="pill">🎓 CLEAR ครั้งแรก</span></div>` : ''}
      <p class="ecl-pass">เกณฑ์ผ่าน ECL: 60% ขึ้นไป ${clear ? '✔' : `· ขาดอีก ${Math.max(1, Math.ceil(n*PASS) - x.correct)} ข้อ`}</p>
      <div class="ecl-skp"><span>${SK[t.skill].en} ${t.level}</span>${bar(sk.n ? sk.d/sk.n : 0)}<em>${sk.d}/${sk.n}</em></div>
      <div class="ecl-skp"><span>ECL ${t.level}</span>${bar(lp)}<em>${Math.round(lp*100)}%</em></div>
      ${vocabBlock(t)}
      <div class="btns">${wrong ? `<button class="cbtn red block" data-act="eclReview">REVIEW MISTAKES (${wrong})</button>` : ''}
        ${t.skill==='listening' ? `<button class="cbtn wood block" data-act="eclScript">📄 อ่านบทสนทนา (Transcript)</button>` : ''}
        <button class="cbtn wood block" data-act="eclStart" data-v="${t.id}">↻ เล่นอีกครั้ง</button>
        <button class="cbtn gold block" data-act="eclDone">CONTINUE ▶</button></div></div>`);
    setTimeout(() => { try{ flushNotes(); }catch(e){} }, 1600);
  }
  function review(){
    const x = ui.ex; if(!x) return; const t = x.t;
    const rows = x.answers.map((a, i) => { if(a.ok) return '';
      const { q, opts } = x.qs[i], lab = v => { const o = opts.find(z => z.k===v), j = opts.indexOf(o); return `${q.type==='matching' ? v : 'ABC'[j]}. ${esc(q.type==='matching' ? o.c.replace(/^[A-D] — /,'') : o.c)}`; };
      return `<div class="ecl-mr"><div class="ecl-mq">Question ${String(i+1).padStart(2,'0')} · ${esc(q.prompt)}</div>
        <div class="ecl-ma bad">Your Answer: ${lab(a.pick)}</div><div class="ecl-ma ok">Correct Answer: ${lab(q.correctAnswer)}</div>
        <details><summary>EXPLANATION</summary><p>${q.explanation ? esc(q.explanation) + '<br><small>คำอธิบายโดยผู้จัดทำ LETTERⁿ (ไม่ใช่คำอธิบายทางการของ ECL)</small>' : 'No explanation available.'}</p></details></div>`; }).join('');
    modal(`<div class="ecl-rev"><div class="ecl-rt sm">MISTAKE REVIEW<small>${esc(t.title)}</small></div>${rows || '<p>ไม่มีข้อผิด 🎉</p>'}
      ${t.skill==='reading' ? `<button class="cbtn wood block" data-act="eclDocView" data-v="${t.id}">📜 เปิดเอกสารอีกครั้ง</button>` : ''}
      <button class="cbtn gold block" data-act="closeModal">ปิด</button></div>`, { dismiss:true });
  }

  /* ------------------------------ listening audio ------------------------------ */
  // a real recording (audio.src) when there is one; otherwise the device's text-to-speech reads the script
  const AUD = {
    t:null, el:null, line:0, playing:false, paused:false, plays:0, prog:0, chars:0, done:0, raf:null,
    prepare(t){ this.stop(); this.t = t; this.plays = 0; this.prog = 0; const A = t.audio || {};
      this.chars = (A.lines||[]).reduce((a, l) => a + l[1].length, 0) || 1;
      if(A.src){ this.el = new Audio(); this.el.preload = 'none'; this.el.src = A.src; this.el.ontimeupdate = () => { this.prog = this.el.duration ? this.el.currentTime/this.el.duration : 0; this.sync(); }; this.el.onended = () => { this.playing = false; this.prog = 1; this.sync(); }; } },
    max(){ return (this.t && this.t.plays) || 2; },
    secs(){ const A = this.t && this.t.audio; if(this.el && this.el.duration) return Math.round(this.el.duration); const w = A && A.lines ? A.lines.reduce((a, l) => a + l[1].split(/\s+/).length, 0) : 0; return Math.round(w/2.3); },
    tts(){ return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance!=='undefined'; },
    voices(){ const vs = this.tts() ? speechSynthesis.getVoices() : []; const en = vs.filter(v => /^en/i.test(v.lang)), gb = en.filter(v => /GB/i.test(v.lang)); const pool = gb.length ? gb.concat(en.filter(v => !gb.includes(v))) : en; return [pool[0], pool[1] || pool[0]]; },
    play(){
      if(!this.t) return;
      if(this.paused){ this.paused = false; this.playing = true; if(this.el) this.el.play(); else speechSynthesis.resume(); this.sync(); return; }
      if(this.playing) return;
      if(this.plays >= this.max()){ toast(`🎧 ฟังครบ ${this.max()} รอบแล้ว`); return; }
      this.plays++; this.playing = true; this.prog = 0; this.done = 0; this.line = 0;
      if(this.el){ this.el.currentTime = 0; this.el.play().catch(() => { this.playing = false; toast('เล่นเสียงไม่ได้'); this.sync(); }); this.sync(); return; }
      if(!this.tts()){ this.playing = false; toast('เครื่องนี้ไม่รองรับเสียงอ่าน — เปิด Transcript หลังจบแทน'); this.sync(); return; }
      speechSynthesis.cancel(); this.next(); this.sync();
    },
    next(){
      const L = this.t.audio.lines; if(!this.playing) return;
      if(this.line >= L.length){ this.playing = false; this.prog = 1; this.sync(); return; }
      const [who, txt] = L[this.line], [v1, v2] = this.voices(), u = new SpeechSynthesisUtterance(txt);
      u.lang = (this.t.audio.voice || 'en-GB'); u.rate = .92; u.pitch = who==='B' ? 1.18 : .95; const v = who==='B' ? v2 : v1; if(v) u.voice = v;
      const base = this.done;
      u.onboundary = ev => { this.prog = Math.min(1, (base + (ev.charIndex||0)) / this.chars); this.syncBar(); };
      u.onend = () => { this.done += txt.length; this.prog = this.done/this.chars; this.line++; setTimeout(() => this.next(), 280); this.syncBar(); };
      u.onerror = () => { this.line++; setTimeout(() => this.next(), 50); };
      speechSynthesis.speak(u);
    },
    pause(){ if(!this.playing) return; this.paused = true; this.playing = false; if(this.el) this.el.pause(); else try{ speechSynthesis.pause(); }catch(e){} this.sync(); },
    stop(){ this.playing = false; this.paused = false; if(this.el){ try{ this.el.pause(); }catch(e){} } if(this.tts()) try{ speechSynthesis.cancel(); }catch(e){} },
    html(){
      const left = this.max() - this.plays, s = this.secs();
      return `<div class="ecl-aud" id="exAud"><button class="ecl-ab" data-act="eclPlay" aria-label="เล่น/หยุดเสียง">${this.playing ? '⏸' : '▶'}</button>
        <span class="ecl-ap"><i id="exAudP" style="width:${Math.round(this.prog*100)}%"></i></span><small id="exAudT">~${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · เหลือ ${left}/${this.max()} รอบ</small></div>`;
    },
    syncBar(){ const p = $('#exAudP'); if(p) p.style.width = Math.round(this.prog*100) + '%'; },
    sync(){ const a = $('#exAud'); if(a) a.outerHTML = this.html(); },
  };

  /* ------------------------------ writing quest ------------------------------ */
  function writeBrief(t){
    enterExam(`<div class="ecl-brief" style="--c:${LIB.levelInfo[t.level].col}">
      <button class="ecl-quit" data-act="eclQuit" aria-label="ออก">${IC2.close}</button>
      <div class="ecl-kick">ECL ${t.level} · WRITING QUEST</div>
      <div class="ecl-scroll"><div class="ecl-qt">✍️ QUEST: ${esc(t.title.toUpperCase())}</div>
        <p><b>QUEST OBJECTIVE</b><br>${esc(t.situation)}</p>
        <ul>${t.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
        <p class="ecl-small">เขียนประมาณ <b>${t.words} คำ</b> · เวลา <b>${t.minutes} นาที</b> · ทุกคำที่เขียนคือการโจมตี "หน้ากระดาษว่าง" 👻</p>${badge(t)}</div>
      <button class="cbtn gold block" data-act="eclWrite" data-v="${t.id}">✍️ START WRITING</button></div>`);
  }
  const wc = s => (s.trim().match(/[A-Za-zÀ-ÿ0-9'’-]+/g) || []).length;
  function writeQuest(id){
    const t = findTask(id); if(!t) return;
    const old = ES().writing[t.id];
    ui.ex = { t, w:true, t0:Date.now(), bullets:[false,false,false,false], beat:false };
    enterExam(`<div class="ecl-write">
      <div class="ecl-wbar"><button class="ecl-quit" data-act="eclQuit" aria-label="ออก">${IC2.close}</button><b>✍️ ${esc(t.title)}</b><span class="ecl-timer" id="exTime">${t.minutes}:00</span></div>
      <div class="ecl-foe"><span class="ecl-foei">${monsterIcon('ghost')}</span><span class="ecl-foet"><b>The Blank Page</b><small>HP = คำที่ยังต้องเขียน</small><span class="ecl-fhp"><i id="exFoe" style="width:100%"></i></span></span><em id="exFoeN">${t.words}</em></div>
      <details class="ecl-sit" open><summary>QUEST OBJECTIVE</summary><p>${esc(t.situation)}</p>
        <div class="ecl-bul">${t.bullets.map((b, i) => `<label><input type="checkbox" data-bul="${i}"> ${esc(b)}</label>`).join('')}</div>
        <p class="ecl-small">ติ๊กเองเมื่อเขียนครบแต่ละประเด็น (ระบบไม่ได้ตรวจเนื้อหาอัตโนมัติ)</p></details>
      <textarea id="exText" class="ecl-ta" placeholder="Start writing in English…" spellcheck="false" autocapitalize="sentences">${old && old.text ? esc(old.text) : ''}</textarea>
      <div class="ecl-cnt"><span>Words: <b id="exWc">0</b> / ${t.words}</span><span>Characters: <b id="exCc">0</b></span></div>
      <button class="cbtn gold block" data-act="eclSubmit">SUBMIT QUEST ▶</button></div>`);
    const ta = $('#exText');
    const upd = () => { const x = ui.ex; if(!x) return; const n = wc(ta.value), left = Math.max(0, t.words - n);
      $('#exWc').textContent = n; $('#exCc').textContent = ta.value.length;
      $('#exFoe').style.width = (left/t.words*100) + '%'; $('#exFoeN').textContent = left;
      if(!left && !x.beat){ x.beat = true; toast('💥 The Blank Page พ่ายแพ้! เขียนครบจำนวนคำแล้ว'); sfx.win && sfx.win(); }
      if(left && x.beat) x.beat = false; };
    ta.addEventListener('input', upd); upd();
    document.querySelectorAll('[data-bul]').forEach(c => c.addEventListener('change', () => { if(ui.ex) ui.ex.bullets[+c.dataset.bul] = c.checked; }));
    clearInterval(ui.exTimer);
    ui.exTimer = setInterval(() => { const x = ui.ex, el = $('#exTime'); if(!x || !el){ clearInterval(ui.exTimer); return; }
      const left = t.minutes*60 - Math.round((Date.now()-x.t0)/1000), a = Math.abs(left);
      el.textContent = `${left<0?'+':''}${Math.floor(a/60)}:${String(a%60).padStart(2,'0')}`; el.classList.toggle('over', left<0); el.classList.toggle('warn', left>=0 && left<120); }, 1000);
  }
  function submitWriting(){
    const x = ui.ex; if(!x || !x.w) return;
    const ta = $('#exText'), text = ta ? ta.value : '', n = wc(text);
    if(n < 5){ toast('เขียนอย่างน้อยสักประโยคก่อนส่งนะ'); return; }
    clearInterval(ui.exTimer);
    x.text = text; x.words = n; x.chars = text.length; x.secs = Math.round((Date.now()-x.t0)/1000);
    x.self = CRIT.map(() => 3);
    enterExam(`<div class="ecl-self"><div class="ecl-rt sm">SELF REVIEW<small>ประเมินงานเขียนของตัวเองด้วยเกณฑ์ 5 ข้อของ ECL (ข้อละ 0–5)</small></div>
      <div class="ecl-mytext">${esc(text).replace(/\n/g,'<br>')}</div>
      ${CRIT.map((c, i) => `<div class="ecl-cr"><span><b>${c[1]}</b><small>${c[0]}</small></span><input type="range" min="0" max="5" value="3" data-crit="${i}" aria-label="${esc(c[1])}"><em id="exCr${i}">3</em></div>`).join('')}
      <p class="ecl-note">ระบบนี้<b>ไม่ได้ให้คะแนนงานเขียนอัตโนมัติ</b> — คะแนนนี้เป็นการประเมินตนเองเพื่อฝึก หากต้องการผลที่แม่นยำ ให้ครูหรือผู้สอนตรวจ (กด "คัดลอกข้อความ" ในหน้าถัดไป)</p>
      <button class="cbtn gold block" data-act="eclSelfDone">บันทึก & ดูผล ▶</button></div>`);
    document.querySelectorAll('[data-crit]').forEach(r => r.addEventListener('input', () => { const i = +r.dataset.crit; ui.ex.self[i] = +r.value; $('#exCr'+i).textContent = r.value; }));
  }
  function writingResults(){
    const x = ui.ex, t = x.t, E = ES(), prev = E.writing[t.id] || { xp:0 };
    const okLen = x.words >= Math.round(t.words*.8), allB = x.bullets.every(Boolean);
    const earned = (okLen ? XP.write : 0) + (okLen && allB ? XP.writeBullets : 0), gain = Math.max(0, earned - (prev.xp||0));
    const self = x.self.reduce((a, b) => a + b, 0);
    E.writing[t.id] = { text:x.text, words:x.words, chars:x.chars, secs:x.secs, bullets:x.bullets.filter(Boolean).length, self:x.self.slice(), xp:Math.max(prev.xp||0, earned), at:Date.now(), plays:(prev.plays||0)+1 };
    if(gain) addXp(gain);
    persist(); sfx.win && sfx.win();
    const mm = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    enterExam(`<div class="ecl-res clear">
      <div class="ecl-rt">QUEST COMPLETE<small>ECL ${t.level} · WRITING · ${esc(t.title)}</small></div>
      <div class="ecl-stats">
        <div><span>Words</span><b>${x.words} / ${t.words}</b></div><div><span>Time</span><b class="${x.secs>t.minutes*60?'over':''}">${mm(x.secs)}</b></div>
        <div><span>Bullet points</span><b>${x.bullets.filter(Boolean).length} / 4</b></div><div><span>EXP</span><b>+${fmt(gain)}</b></div></div>
      <div class="ecl-selfsc"><span>คะแนนประเมินตนเอง</span><b>${self} / 25</b><small>Self review — ไม่ใช่คะแนนจริงของ ECL</small></div>
      ${!okLen ? `<p class="ecl-note">💡 ข้อสอบจริงคาดหวังประมาณ ${t.words} คำ — ครั้งนี้เขียน ${x.words} คำ</p>` : ''}
      ${!gain && earned ? `<p class="ecl-note">EXP ของโจทย์นี้ได้รับไปแล้ว</p>` : ''}
      ${vocabBlock(t)}
      <div class="btns"><button class="cbtn wood block" data-act="eclCopy">📋 คัดลอกข้อความ (ส่งให้ครูตรวจ)</button>
        <button class="cbtn wood block" data-act="eclStart" data-v="${t.id}">↻ เขียนใหม่</button>
        <button class="cbtn gold block" data-act="eclDone">CONTINUE ▶</button></div></div>`);
    setTimeout(() => { try{ flushNotes(); }catch(e){} }, 1600);
  }

  /* ------------------------------ actions ------------------------------ */
  Object.assign(ACTS2, {
    eclLevel: v => { ui.eclLv = v; goTo('eclLevel'); },
    eclStart: v => { load().then(() => start(v)); },
    eclDoc: v => showDoc(v, false),
    eclDocView: v => showDoc(v, true),
    eclBattle: v => battle(v),
    eclAns: v => { answer(v); },
    eclNext: () => { next(); },
    eclPlay: () => { AUD.playing ? AUD.pause() : AUD.play(); },
    eclQuit: () => { const x = ui.ex;
      if(x && !x.result && (x.answers ? x.answers.length : x.w)){ modal(`<h3>ออกจาก Quest?</h3><p>ความคืบหน้าของรอบนี้จะไม่ถูกบันทึก</p><div class="btns"><button class="cbtn red block" data-act="eclQuitDo">ออก</button><button class="cbtn wood block" data-act="closeModal">เล่นต่อ</button></div>`); return; }
      leave('eclLevel'); },
    eclQuitDo: () => leave('eclLevel'),
    eclDone: () => leave('eclLevel'),
    eclReview: () => review(),
    eclScript: () => { const x = ui.ex; if(!x) return; modal(`<div class="ecl-docm"><article class="ecl-doc"><h3>📄 Transcript — ${esc(x.t.title)}</h3>${x.t.audio.lines.map(l => `<p><b>${l[0]==='A'?'Speaker A':'Speaker B'}:</b> ${esc(l[1])}</p>`).join('')}<footer>${badge(x.t)}</footer></article><button class="cbtn gold block" data-act="closeModal">ปิด</button></div>`, { dismiss:true }); },
    eclWrite: v => writeQuest(v),
    eclSubmit: () => submitWriting(),
    eclSelfDone: () => writingResults(),
    eclCopy: () => { const x = ui.ex; if(!x) return; const txt = `ECL ${x.t.level} Writing (ECL-style practice) — ${x.t.title}\n${x.t.situation}\n- ${x.t.bullets.join('\n- ')}\n\n${x.text}\n\n(${x.words} words)`;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('📋 คัดลอกแล้ว')).catch(() => toast('คัดลอกไม่ได้ — กดค้างที่ข้อความเพื่อคัดลอกเอง')); },
    eclBook: v => { let m = null; try{ m = VocabularyManager.lookup(v); }catch(e){} if(m && m.thai){ recordWord(m.base, m.thai, m.bank); persist(); toast(`📚 บันทึก "${esc(v)}" ลงสมุดคำศัพท์แล้ว`); const b = document.querySelector(`[data-act="eclBook"][data-v="${CSS.escape(v)}"]`); if(b) b.outerHTML = '<em>✓ ในสมุด</em>'; } },
    eclVocab: () => { leave('codex'); ui.cxTab = 'words'; goTo('codex'); },
  });
  // keyboard: 1/2/3/4 or A/B/C/D to answer, Enter = next
  document.addEventListener('keydown', e => {
    if(ui.screen!=='exam' || !ui.ex || ui.ex.w || $('#overlay').innerHTML) return;
    const k = e.key.toUpperCase(), map = { '1':0, '2':1, '3':2, '4':3, A:0, B:1, C:2, D:3 };
    if(k==='ENTER'){ const n = document.querySelector('.ecl-next'); if(n){ n.click(); e.preventDefault(); } return; }
    if(k in map){ const btn = document.querySelectorAll('.ecl-c')[map[k]]; if(btn && !btn.disabled){ btn.click(); e.preventDefault(); } }
  });
  window.QL_ECL = { load, findTask, levelProg, skillProg, AUD };
})();
