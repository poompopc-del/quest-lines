/* ==========================================================================
   QUEST LINES — ENDGAME & MASTERY · CORE
   Challenge rules (modifiers) layered on top of the existing battle through
   wrappers, run tracking (time · words · mistakes · damage · combo), scores,
   currencies, prestige cosmetics and the save.eg block. The battle code itself
   is untouched: every rule is applied by wrapping existing functions.
   ========================================================================== */
const EG = { tick:null, ver:'2.1' };

/* ------------------------------ modifiers ------------------------------ */
const MODS = {
  hp:        { ic:'❤️', en:'TOUGH ENEMIES',  th:'ศัตรู HP +50%',                                         w:.6 },
  dmg:       { ic:'💢', en:'BRUTAL',         th:'ศัตรูโจมตีแรงขึ้น +30%',                                 w:.5 },
  fast:      { ic:'⚡', en:'FAST ENEMIES',   th:'ศัตรูโจมตีเพิ่ม 1 ครั้งทุก 3 เทิร์น',                      w:.6 },
  time:      { ic:'⏱️', en:'TIME LIMIT',     th:'20 วินาทีต่อคำ — หมดเวลา ศัตรูได้ตีฟรี',                   w:.7 },
  noUlt:     { ic:'🚫', en:'NO ULTIMATE',    th:'ห้ามใช้ Ultimate',                                     w:.3 },
  noHeal:    { ic:'💔', en:'NO HEALING',     th:'ฟื้น HP ไม่ได้ทุกกรณี (ยา อัญมณี ธาตุ ชนะศัตรู ขนนก)',       w:.7 },
  chaos:     { ic:'🌀', en:'ELEMENTAL CHAOS',th:'คำธาตุให้พลังธาตุอื่นแบบสุ่ม (สลับทุกรอบ)',                  w:.3 },
  hard:      { ic:'🔤', en:'HARD WORDS',     th:'คำต้องยาว 4 ตัวขึ้นไป · คำ 4 ตัวแรงลด 30%',                w:.6 },
  noRepeat:  { ic:'❌', en:'NO REPEAT',      th:'ห้ามใช้คำซ้ำในรอบนี้',                                   w:.5 },
  enrage:    { ic:'💀', en:'ENRAGE',         th:'ศัตรูแรงขึ้น 10% ทุกเทิร์นที่ยังไม่ตาย',                    w:.6 },
  comboBreak:{ ic:'💥', en:'COMBO BREAK',    th:'คอมโบ 3+ หลุด = เสีย HP 8%',                             w:.4 },
};
const modMult = R=>Math.round((1 + Object.keys(MODS).reduce((a,k)=>a + (R && R[k] ? MODS[k].w : 0), 0))*10)/10;
const modStars = R=>{ const s = modMult(R) - 1; return Math.max(1, Math.min(5, Math.ceil(s/1.05))); };
function rulesFromMods(list){ const R = {}; (list||[]).forEach(k=>{ if(!MODS[k]) return; R[k] = true; }); if(R.hp) R.hp = .5; if(R.dmg) R.dmg = .3; if(R.time) R.time = 20; return R; }
function modChips(R, cls){ return Object.keys(MODS).filter(k=>R && R[k]).map(k=>`<span class="eg-mod ${cls||''}" title="${esc(MODS[k].th)}">${MODS[k].ic}<b>${MODS[k].en}</b></span>`).join(''); }

/* ------------------------------ cosmetics ------------------------------ */
const COS = {
  aura: {
    none:{ th:'ไม่มี' },
    ember:{ th:'ออร่าถ่านไฟ', c:['#ff8a3a','#ffd24a'] }, frost:{ th:'ออร่าน้ำค้างแข็ง', c:['#7fe6ff','#e6ffff'] },
    spirit:{ th:'ออร่าวิญญาณ', c:['#b8ffb0','#5a3a9a'] }, elite:{ th:'ออร่าชนชั้นยอด', c:['#ffc83d','#ff3b4e'] },
    nightmare:{ th:'ออร่าฝันร้าย', c:['#8a2aff','#ff3b4e'] }, void:{ th:'Void Aura', c:['#6a2ab0','#07060d'] },
    legend:{ th:'ออร่าตำนาน', c:['#fff1a0','#ffc83d'] }, cosmos:{ th:'Cosmic Aura', c:['#3ee0ff','#c77dff'] }, mythic:{ th:'Mythic Aura', c:['#ff4df0','#3ee0ff'] },
  },
  trail: {
    none:{ th:'ไม่มี' }, flame:{ th:'รอยเพลิง', c:'#ff8a3a' }, star:{ th:'รอยดาว', c:'#fff1a0' }, shadow:{ th:'รอยเงา', c:'#8a4aff' },
    grand:{ th:'รอยปรมาจารย์', c:'#ffc83d' }, legend:{ th:'Legendary Trail', c:'#3ee0ff' },
  },
  victory: {
    none:{ th:'ปกติ' }, confetti:{ th:'กระดาษสี' }, fireworks:{ th:'ดอกไม้ไฟ' }, moonburst:{ th:'จันทร์ระเบิด' },
    masterv:{ th:'มงกุฎปรมาจารย์' }, supernova:{ th:'Supernova' }, mythic:{ th:'Mythic Rain' },
  },
  badge: {
    none:{ th:'ไม่มี', ic:'' }, adv:{ th:'เข็มนักผจญภัย', ic:'🧭' }, master:{ th:'ตราปรมาจารย์', ic:'🎖️' }, mythic:{ th:'ตรา Mythic', ic:'💠' },
    nightmare:{ th:'ตราฝันร้าย', ic:'🌙' }, speed:{ th:'ตราสายฟ้า', ic:'⚡' }, crown:{ th:'มงกุฎวีรบุรุษแท้', ic:'👑' }, tower:{ th:'ตราหอคอย', ic:'🗼' },
  },
};
Object.assign(TITLES, {
  combohunter:{ th:'Combo Hunter', r:3 }, perfectw:{ th:'Perfect Warrior', r:3 }, towerconq:{ th:'Tower Conqueror', r:4 },
  nightwalker:{ th:'Nightmare Walker', r:4 }, speeddemon:{ th:'Speed Demon', r:3 }, bossslayer:{ th:'Boss Slayer', r:3 },
  adventurer:{ th:'Adventurer', r:1 }, warrior:{ th:'Warrior', r:2 }, elite:{ th:'Elite', r:2 }, master:{ th:'Master', r:3 },
  grandmaster:{ th:'Grandmaster', r:4 }, legend:{ th:'Legend', r:4 }, mythic:{ th:'Mythic', r:4 }, truehero:{ th:'TRUE HERO', r:4 },
});
Object.assign(FRAMES, {
  warrior:{ th:'นักรบ', css:'fr-warrior' }, grand:{ th:'ปรมาจารย์', css:'fr-grand' }, mythic:{ th:'Mythic', css:'fr-mythic' },
  crown:{ th:'มงกุฎวีรบุรุษ', css:'fr-crown' }, abyss:{ th:'ห้วงลึก', css:'fr-abyss' }, nightmare:{ th:'ฝันร้าย', css:'fr-nightmare' },
});

/* ------------------------------ save block ------------------------------ */
function egDefaults(){
  return { ver:1, nc:0, cc:0,
    nm:{}, nmDay:{},                       // nightmare: stage index → { clear, best score }
    perfect:{},                            // stage index → best tier (1..3)
    speed:{},                              // chapter → { best(ms), words, mistakes, combo, acc }
    scores:{},                             // challenge key → { score, rank }
    pb:{ combo:0, dmg:0, bossMs:0, fewest:null, floor:0 },
    endBest:0, endPaid:0,
    cnt:{ killEl:{}, killLong:0, killBoss:0, nmClears:0, perfects:0, customs:0, tfb:0 },
    daily:{ date:'', id:'', base:0, claimed:false },
    weekly:{ week:'', id:'', wins:0, claimed:false },
    cos:{ own:{ aura:['none'], trail:['none'], victory:['none'], badge:['none'] }, eq:{ aura:'none', trail:'none', victory:'none', badge:'none' } },
    mrClaimed:0, tfb:{ wins:0, bestMs:0 }, seenHall:false };
}
function migrateEG(s){
  if(!s || typeof s!=='object') return s;
  s.eg = mergeDeep(egDefaults(), (s.eg && typeof s.eg==='object') ? s.eg : {});
  // a player who already climbed the tower keeps that as the endless record
  if(s.tower && (s.tower.best||0) > (s.eg.endBest||0)){ s.eg.endBest = s.tower.best; s.eg.endPaid = Math.max(s.eg.endPaid||0, Math.floor(s.tower.best/10)*10); }
  s.v = Math.max(s.v||3, 4);
  return s;
}
loadSave = (f=>function(){ return migrateEG(f()); })(loadSave);
defaultSave = (f=>function(){ return migrateEG(f()); })(defaultSave);
migrateEG(save); persist();
const EGS = ()=>save.eg;

/* ------------------------------ helpers ------------------------------ */
const storyDone = ()=>save.cleared >= CHAPTERS.length*STAGES_PER;
const fmtT = ms=>{ ms = Math.max(0, Math.round(ms||0)); const m = Math.floor(ms/60000), s = Math.floor(ms/1000)%60, c = Math.floor(ms/10)%100; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`; };
const weekKey = ()=>{ const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y = new Date(Date.UTC(t.getUTCFullYear(),0,1)); return t.getUTCFullYear()+'-W'+Math.ceil(((t-y)/86400000+1)/7); };
function egGrant(R){
  const E = EGS(), out = [];
  if(R.nc){ E.nc += R.nc; out.push(`<span class="pill eg-nc">🌙 +${fmt(R.nc)}</span>`); }
  if(R.cc){ E.cc += R.cc; out.push(`<span class="pill eg-cc">🏅 +${fmt(R.cc)}</span>`); }
  ['aura','trail','victory','badge'].forEach(k=>{ const v = R[k]; if(v && !E.cos.own[k].includes(v)){ E.cos.own[k].push(v); out.push(`<span class="pill title">✨ ${esc(COS[k][v].th)}</span>`); } });
  const rest = Object.assign({}, R); ['nc','cc','aura','trail','victory','badge'].forEach(k=>delete rest[k]);
  const html = out.join('') + (Object.keys(rest).length ? grant(rest) : '');
  persist(); return html;
}
function egPreview(R){
  const p = [];
  if(R.nc) p.push(`<span class="rw eg-nc">🌙${fmt(R.nc)}</span>`);
  if(R.cc) p.push(`<span class="rw eg-cc">🏅${fmt(R.cc)}</span>`);
  ['aura','trail','victory','badge'].forEach(k=>{ if(R[k]) p.push(`<span class="rw title">✨ ${esc(COS[k][R[k]].th)}</span>`); });
  const rest = Object.assign({}, R); ['nc','cc','aura','trail','victory','badge'].forEach(k=>delete rest[k]);
  return p.join('') + rewardPreview(rest);
}
function egBadge(){ const b = EGS().cos.eq.badge; return b && COS.badge[b] && COS.badge[b].ic ? `<i class="eg-bdg">${COS.badge[b].ic}</i>` : ''; }

/* ------------------------------ runs ------------------------------ */
// ui.run = the challenge being played ({ type, rules, ch, n, … }); null = normal play
function newRun(cfg){
  return Object.assign({ pending:true, t:0, words:0, mistakes:0, shuffles:0, timeouts:0, breaks:0, dmgTaken:0, bestCombo:0, kills:0, dmg:0,
    potions:0, ults:0, hints:0, stages:0, maxHpSum:0, enemies:0, used:[], splits:[] }, cfg);
}
function egStart(cfg, label){
  ui.run = newRun(cfg);
  const go = ()=>{
    if(cfg.type==='tfb') startStage(CHAPTERS.length-1, STAGES_PER);
    else startStage(cfg.ch, cfg.n);
  };
  wantFull(); portal(go, label || '');
}
const runOf = b=>(b && b.egRun) || null;
// chaos: a shuffled element map per run
function chaosMap(seed){ const r = mulberry(seed), a = BASE_ELEMS.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } const m = {}; BASE_ELEMS.forEach((e,i)=>m[e] = a[i]===e ? a[(i+1)%a.length] : a[i]); return m; }

/* the rules active right now (a run's rules, endless floor rules, or the true final boss) */
function rulesOf(b){
  if(!b) return null;
  if(b.stage && b.stage.tower){ const f = TOWER.floor(b); if(!b.egTR || b.egTR.f!==f){ b.egTR = { f, R: towerRules(b.stage.seed, f) }; } return b.egTR.R; }
  return b.egRules || null;
}
// endless tower: every 10 floors past 10 draws modifiers (more as you climb); boss floors add their own
function towerRules(seed, f){
  const R = {};
  if(f>10){
    const region = Math.floor((f-1)/10), n = Math.min(4, Math.floor((f-1)/20)+1);
    const rng = mulberry(hashStr('tmods'+seed+'|'+region));
    const pool = ['hp','dmg','fast','time','noUlt','chaos','hard','noRepeat','enrage','comboBreak'].concat(region>=3 ? ['noHeal'] : []);
    for(let i=0;i<n && pool.length;i++){ const k = pool.splice(Math.floor(rng()*pool.length),1)[0]; R[k] = true; }
    if(R.hp) R.hp = .25; if(R.dmg) R.dmg = .2; if(R.time) R.time = 25;
  }
  if(f%100===0){ R.time = 15; R.enrage = true; R.bossP3 = true; }
  else if(f%50===0 || f%25===0){ R.bossP3 = true; }
  return R;
}

/* ------------------------------ run attach at battle start ------------------------------ */
function egAttach(b){
  if(!b) return;
  const run = ui.run && ui.run.pending ? ui.run : null;
  if(ui.run && !ui.run.pending && !(b.stage && b.stage.tower)) ui.run = null;   // a normal retry / next stage leaves the challenge
  b.egUsed = new Set();
  b.egPrevHp = b.hp;
  if(run){
    run.pending = false; b.egRun = run;
    const R = Object.assign({}, run.rules||{}); b.egRules = R;
    if(R.chaos) b.egChaos = chaosMap(hashStr('chaos'+Date.now()));
    if(run.type==='tfb') tfbSetup(b);
    // stronger enemies
    b.stage.enemies.forEach(e=>{
      if(R.hp){ e.hp = e.maxHp = Math.round(e.maxHp*(1+R.hp)); }
      if(R.dmg){ e.atk = Math.round(e.atk*(1+R.dmg)); }
      if(R.fast && e.traits.includes('heavy')) e.traits = e.traits.filter(t=>t!=='heavy');
    });
    if(R.noHeal) b.phoenix = false;
    run.stages++; run.maxHpSum += b.max; run.enemies += b.stage.enemies.length;
    try{ updateEnemyHp(); renderEnemyPanel(); updateHud(); }catch(e){}
  }
  egHud(b);
  egStartTicker(b);
}
startStage = (f=>function(){ const r = f.apply(this, arguments); try{ egAttach(ui.bat); }catch(e){ console.error(e); } return r; })(startStage);
startTower = (f=>function(){ ui.run = null; const r = f.apply(this, arguments); try{ egAttach(ui.bat); }catch(e){ console.error(e); } return r; })(startTower);

/* ------------------------------ battle overlay: modifiers + timer + aura ------------------------------ */
function egHud(b){
  const st = $('#stage'); if(!st || !b) return;
  let h = st.querySelector('.eg-hud');
  if(!h){ h = document.createElement('div'); h.className = 'eg-hud'; st.appendChild(h); }
  const R = rulesOf(b) || {}, run = runOf(b);
  const tag = run ? { nightmare:'🌙 NIGHTMARE', perfect:'✨ PERFECT RUN', speed:'⚡ SPEEDRUN', custom:'🧩 CHALLENGE', weekly:'📅 WEEKLY TRIAL', tfb:'☠️ TRUE FINAL BOSS' }[run.type] : (b.stage.tower && Object.keys(R).length ? `♾️ ชั้น ${TOWER.floor(b)}` : '');
  h.innerHTML = (tag||Object.keys(R).length) ? `${tag?`<span class="eg-tag">${tag}</span>`:''}<span class="eg-mods">${modChips(R,'sm')}</span>${R.time||(run&&run.type==='speed')?`<span class="eg-clock" id="egClock"></span>`:''}<div class="eg-tbar" id="egTbar" hidden><i></i></div>` : '';
  h.hidden = !h.innerHTML;
  if(b.egChaos && R.chaos) h.insertAdjacentHTML('beforeend', `<span class="eg-chaos">🌀 ${Object.entries(b.egChaos).slice(0,3).map(([a,c])=>`${ELEM_ICON[a]}→${ELEM_ICON[c]}`).join(' ')} …</span>`);
  egAura();
}
function egAura(){
  const hg = $('#heroG'); if(!hg) return;
  hg.querySelectorAll('.eg-aura').forEach(n=>n.remove());
  const k = EGS().cos.eq.aura, A = COS.aura[k]; if(!A || !A.c) return;
  const g = document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('class','eg-aura au-'+k);
  const gid = 'egAuG'+k;
  g.innerHTML = `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="${A.c[1]}" stop-opacity=".55"/><stop offset=".55" stop-color="${A.c[0]}" stop-opacity=".28"/><stop offset="1" stop-color="${A.c[0]}" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="eg-au-body" cx="0" cy="-72" rx="70" ry="92" fill="url(#${gid})"/>
    <ellipse class="eg-au-base" cx="0" cy="0" rx="66" ry="14" fill="${A.c[0]}" opacity=".6"/><ellipse class="eg-au-ring" cx="0" cy="0" rx="48" ry="9" fill="none" stroke="${A.c[1]}" stroke-width="3"/>`
    + Array.from({length:9},(_,i)=>`<circle class="eg-au-p" cx="${-48+i*12}" cy="-6" r="${2.5+(i%3)}" fill="${i%2?A.c[0]:A.c[1]}" style="animation-delay:${(i*.27).toFixed(2)}s"/>`).join('');
  hg.insertBefore(g, hg.firstChild);
}
buildBattleDom = (f=>function(){ const r = f.apply(this, arguments); try{ const b = ui.bat; if(b && b.egUsed) egHud(b); else egAura(); }catch(e){} return r; })(buildBattleDom);

/* one ticker per battle: challenge clock + per-turn time limit. It stops itself when the battle ends. */
function egStartTicker(b){
  clearInterval(EG.tick); EG.tick = null;
  let last = performance.now();
  EG.tick = setInterval(()=>{
    const now = performance.now(), dt = Math.min(500, now-last); last = now;
    if(ui.bat!==b || ui.screen!=='battle'){ clearInterval(EG.tick); EG.tick = null; return; }
    const run = runOf(b), paused = !!$('#overlay').innerHTML || document.hidden;
    if(run && !paused && !b.over && !b.egDone) run.t += dt;
    const R = rulesOf(b) || {}, lim = (b.egTfbTime || R.time || 0)*1000;
    const clock = $('#egClock');
    if(clock && run && run.type==='speed') clock.textContent = '⏱ ' + fmtT(run.t);
    const bar = $('#egTbar');
    if(lim){
      if(b.busy || b.over){ b.egTL = lim; }
      else if(!paused){ b.egTL = (b.egTL===undefined ? lim : b.egTL) - dt; if(b.egTL<=0){ b.egTL = lim; egTimeout(b); } }
      if(bar){ bar.hidden = false; const p = Math.max(0, (b.egTL===undefined?lim:b.egTL)/lim); bar.firstChild.style.width = (p*100)+'%'; bar.classList.toggle('low', p<.3); }
      if(clock && !(run && run.type==='speed')) clock.textContent = '⏱ ' + Math.ceil((b.egTL===undefined?lim:b.egTL)/1000) + 's';
    } else if(bar) bar.hidden = true;
  }, 100);
}
async function egTimeout(b){
  if(b.busy || b.over) return;
  const run = runOf(b); if(run){ run.timeouts++; run.mistakes++; }
  b.busy = true; clearSelSilent(); b.combo = 0; renderTiles(); renderTray(); updateHud();
  floatText('⏱ หมดเวลา!', HERO_X, FLOOR_Y-190, '#ff8a96', 30, true); sfx.bad && sfx.bad();
  await sleep(350);
  if(ui.bat===b && !b.over) await enemyTurn();
}

/* ------------------------------ rule hooks ------------------------------ */
// chaos: element words give a different element
elementOf = (f=>function(w){ const el = f(w); const b = ui.bat, R = b && rulesOf(b); if(el && R && R.chaos && b.egChaos && b.egChaos[el]) return b.egChaos[el]; return el; })(elementOf);

evalWord = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat;
  if(!b || !b.egUsed) return r;
  const R = rulesOf(b) || {};
  if(R.hard && r.w && r.w.length===3 && (r.state==='ok' || r.state==='bad')) return { w:r.w, state:'short', reason:'🔤 HARD WORDS: ต้องยาว 4 ตัวอักษรขึ้นไป' };
  if(r.state!=='ok') return r;
  if(R.noRepeat && b.egUsed.has(r.w)) return { w:r.w, state:'bad', reason:'❌ NO REPEAT: ใช้คำนี้ไปแล้ว' };
  let m = 1;
  if(R.hard && r.w.length===4){ m *= .7; r.notes.push('HARD x0.7'); }
  if(b.egTfb) m *= tfbWordMult(b, r);
  if(m!==1) r.dmg = Math.max(m===0?0:1, Math.round(r.dmg*m));
  return r;
})(evalWord);
renderTray = (f=>function(){
  const out = f.apply(this, arguments), b = ui.bat;
  try{ if(b && b.egUsed){ const r = evalWord(); const msg = $('#trayMsg'); if(r.reason && msg){ msg.textContent = r.reason; msg.className = 'tray-msg toxic'; } } }catch(e){}
  return out;
})(renderTray);

// words spelled inside a challenge (every successful non-rude word passes here once)
addMastery = (f=>function(w){
  const r = f.apply(this, arguments), b = ui.bat;
  try{
    if(b && b.egUsed && w){
      b.egUsed.add(w);
      let el = null; try{ el = elementOf(w); }catch(e){} if(el && ELEMENTS[el] && ELEMENTS[el].god) el = ELEMENTS[el].base;
      b.eglastEl = el; b.eglastLen = w.length;
      const run = runOf(b), d = save.mastery[w];
      if(run){ run.words++; run.bestCombo = Math.max(run.bestCombo, (b.combo||0)+1); }
      const e = curEnemy();
      if(d){ if(e && e.boss) d.boss = 1; if(run && ['nightmare','custom','tfb','weekly','perfect','speed'].includes(run.type)) d.ch = 1; if(el) d.el = d.el || el; }
      const comboNow = (b.combo||0)+1; if(comboNow > (EGS().pb.combo||0)) EGS().pb.combo = comboNow;
    }
  }catch(e){ console.error(e); }
  return r;
})(addMastery);

usePotion = (f=>function(k){
  const b = ui.bat, R = b && rulesOf(b), run = runOf(b);
  if(b && !b.busy){
    if(run && run.type==='perfect'){ toast('✨ Perfect Run: ห้ามใช้ยา'); return; }
    if(R && R.noHeal && k==='heal'){ toast('💔 NO HEALING: ฟื้น HP ไม่ได้'); return; }
    if(R && R.potionLimit!==undefined && (b.egPot||0) >= R.potionLimit){ toast(`🌙 ใช้ยาได้ ${R.potionLimit} ครั้งต่อด่าน`); return; }
  }
  const before = save.potions[k];
  const r = f.apply(this, arguments);
  if(b && save.potions[k] < before){ b.egPot = (b.egPot||0)+1; if(run) run.potions++; }
  return r;
})(usePotion);
useUltimate = (f=>async function(){
  const b = ui.bat, R = b && rulesOf(b), run = runOf(b);
  if(b && !b.busy && b.ult>=5){
    if(R && R.noUlt){ toast('🚫 NO ULTIMATE'); return; }
    if(R && R.ultLimit!==undefined && (b.egUlt||0) >= R.ultLimit){ toast(`🌙 ใช้ Ultimate ได้ ${R.ultLimit} ครั้งต่อด่าน`); return; }
    b.egUlt = (b.egUlt||0)+1; if(run) run.ults++;
  }
  return f.apply(this, arguments);
})(useUltimate);
doShuffle = (f=>async function(){
  const b = ui.bat, run = runOf(b);
  if(b && b.egTfb && b.egTfb.phase>=5){ toast('🔇 SILENCE: สลับตัวอักษรไม่ได้'); return; }
  if(b && !b.busy && run){ run.shuffles++; run.mistakes++; }
  return f.apply(this, arguments);
})(doShuffle);
useHint = (f=>function(){
  const b = ui.bat, run = runOf(b);
  if(b && b.egTfb && b.egTfb.phase>=5){ toast('🔇 SILENCE: ใช้คำใบ้ไม่ได้'); return; }
  const h = b ? b.hints : 0; const r = f.apply(this, arguments);
  if(b && run && b.hints<h) run.hints++;
  return r;
})(useHint);

// HUD: no-healing cap, damage taken, per-run best combo
updateHud = (f=>function(){
  const b = ui.bat;
  if(b && b.egUsed){
    const R = rulesOf(b) || {}, run = runOf(b);
    if(R.noHeal){ if(b.egCap===undefined || b.hp < b.egCap) b.egCap = b.hp; if(b.hp > b.egCap) b.hp = b.egCap; }
    if(b.egPrevHp!==undefined && b.hp < b.egPrevHp && run) run.dmgTaken += (b.egPrevHp - Math.max(0,b.hp));
    b.egPrevHp = b.hp;
    if(run) run.bestCombo = Math.max(run.bestCombo, b.combo||0);
  }
  return f.apply(this, arguments);
})(updateHud);
floatText = (f=>function(txt, x, y, color){
  const b = ui.bat, R = b && b.egUsed && rulesOf(b);
  if(R && R.noHeal && /^[+✨💧😋🌑💀🌙]/.test(String(txt)) && /#6ef08a|#8affb0|#fff6a0|#bfe6ff|#ff9ad0|#d0a0ff|#d0b0ff|#c0b0ff/i.test(color||'')) return;
  return f.apply(this, arguments);
})(floatText);

// enemy turn: enrage, speed, combo-break penalty
enemyTurn = (f=>async function(){
  const b = ui.bat; if(!b || !b.egUsed) return f.apply(this, arguments);
  const R = rulesOf(b) || {}, run = runOf(b), e = curEnemy(), comboBefore = b.combo||0;
  if(R.enrage && e && e.hp>0){ e.egRage = (e.egRage||0)+1; if(e.egRage>1){ e.atk = Math.max(e.atk+1, Math.round(e.atk*1.1)); floatText(`💀 ENRAGE x${e.egRage}`, EN_X, FLOOR_Y-e.h*e.sc-40, '#ff5a5a', 20); } }
  await f.apply(this, arguments);
  if(ui.bat!==b || b.over) return;
  if(comboBefore>=3 && b.combo===0){
    if(run){ run.breaks++; run.mistakes++; }
    if(R.comboBreak){ const d = Math.max(1, Math.round(b.max*.08)); b.hp -= d; floatText(`💥 COMBO BREAK -${d}`, HERO_X, FLOOR_Y-200, '#ff8a96', 22, true); heroHurt(d, false); updateHud(); if(await checkHeroDeath()) return; }
  }
  if(R.fast){ b.egTurn = (b.egTurn||0)+1; const n = curEnemy();
    if(b.egTurn%3===0 && n && n.hp>0 && !b.over && !n.frozen && !n.stun){ b.busy = true; renderTray(); floatText('⚡ FAST!', EN_X, FLOOR_Y-n.h*n.sc-40, '#ffe14a', 26, true); await sleep(320); if(ui.bat===b && !b.over) await f.apply(this, arguments); } }
})(enemyTurn);

// boss phase 3 (nightmare / elite) and the true final boss phases
updateEnemyHp = (f=>function(){
  const r = f.apply(this, arguments), b = ui.bat, e = curEnemy();
  try{
    if(b && b.egUsed && e && e.hp>0){
      if(!e.egSeen){ e.egSeen = performance.now(); }
      const R = rulesOf(b) || {};
      if(e.boss && R.bossP3 && !e.egP3 && !b.egTfb && e.hp <= e.maxHp*.3){
        e.egP3 = true; e.atk = Math.round(e.atk*1.3); if(!e.traits.includes('stone')) e.traits.push('stone');
        e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp*.08));
        banner('PHASE 3!', 'บอสคลั่ง · สาปหิน · แรงขึ้น 30%'); sfx.boss && sfx.boss(); shake(true); setTimeout(()=>{ try{ f(); renderEnemyPanel(); }catch(err){} }, 30);
      }
      if(b.egTfb) tfbCheck(b, e);
    }
  }catch(err){ console.error(err); }
  return r;
})(updateEnemyHp);

// kills: boss timing, daily-challenge counters, endless records
enemyDies = (f=>async function(){
  const b = ui.bat, e = b && curEnemy();
  if(b && e && b.egUsed && !e._eg){
    e._eg = true;
    try{
      const E = EGS(), run = runOf(b);
      if(run){ run.kills++; }
      if(e.boss && e.egSeen){ const ms = performance.now() - e.egSeen; if(!E.pb.bossMs || ms < E.pb.bossMs) E.pb.bossMs = Math.round(ms); }
      if(b.eglastEl) E.cnt.killEl[b.eglastEl] = (E.cnt.killEl[b.eglastEl]||0) + 1;
      if((b.eglastLen||0) >= 6) E.cnt.killLong++;
      if(e.boss || e.mini) E.cnt.killBoss++;
      if(b.stage.tower){ const fl = TOWER.floor(b); if(fl > (E.endBest||0)){ E.endBest = fl; egEndlessReward(fl); } if(fl > (E.pb.floor||0)) E.pb.floor = fl; }
      persist(); bump();
    }catch(err){ console.error(err); }
  }
  return f.apply(this, arguments);
})(enemyDies);
function egEndlessReward(fl){
  const E = EGS();
  if(fl%10===0 && fl > (E.endPaid||0)){ E.endPaid = fl; const cc = Math.round(fl*1.2); E.cc += cc; note('eg', `♾️ ชั้น ${fl} ครั้งแรก! 🏅 +${cc} Challenge Coins`);
    if(fl===50) egGrant({ frame:'abyss', badge:'tower' });
    if(fl===100){ egGrant({ aura:'void' }); note('eg', '✨ ได้รับ Void Aura!'); }
  }
}

// cosmetics in battle: attack trail + victory effect
heroAttack = (f=>async function(){
  try{ const t = EGS().cos.eq.trail, T = COS.trail[t]; const fx = $('#fx');
    if(T && T.c && fx){ for(let k=0;k<9;k++){ const c = document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('r', 7-k*.5); c.setAttribute('fill', T.c); c.setAttribute('opacity', .8); fx.appendChild(c);
      const x = HERO_X+30+k*(EN_X-HERO_X-60)/9, y = FLOOR_Y-90-Math.sin(k/8*Math.PI)*60;
      anim(c, [{transform:tr(x,y)+' scale(0)',opacity:0},{transform:tr(x,y)+' scale(1.4)',opacity:.9,offset:.3},{transform:tr(x,y-10)+' scale(.2)',opacity:0}], { duration:520, delay:120+k*28, easing:'ease-out' }).then(()=>c.remove()); } }
  }catch(e){}
  return f.apply(this, arguments);
})(heroAttack);
function egVictoryFx(){
  const k = EGS().cos.eq.victory, st = $('#stage'); if(!st || !k || k==='none') return;
  const d = document.createElement('div'); d.className = 'eg-vfx vf-'+k;
  const n = { confetti:40, fireworks:24, moonburst:18, masterv:20, supernova:30, mythic:40 }[k] || 20;
  d.innerHTML = (k==='masterv' ? '<b class="vf-crown">👑</b>' : k==='moonburst' ? '<b class="vf-moon"></b>' : k==='supernova' ? '<b class="vf-nova"></b>' : '') + Array.from({length:n},(_,i)=>`<i style="--x:${(i*37)%100}%;--d:${((i*.13)%1.2).toFixed(2)}s;--r:${(i*47)%360}deg"></i>`).join('');
  st.appendChild(d); setTimeout(()=>d.remove(), 2600);
}
stageClear = (f=>async function(){
  const b = ui.bat; if(b) b.egDone = true;
  try{ egVictoryFx(); }catch(e){}
  await f.apply(this, arguments);
  try{ if(QL2.egAfter) QL2.egAfter('clear', b); }catch(e){ console.error(e); }
})(stageClear);
heroDies = (f=>async function(){
  const b = ui.bat; if(b) b.egDone = true;
  await f.apply(this, arguments);
  try{ if(QL2.egAfter && b) QL2.egAfter(b.stage.tower ? 'tower' : 'lose', b); }catch(e){ console.error(e); }
})(heroDies);

/* ------------------------------ score ------------------------------ */
function egScore(run, b, won){
  const mult = run.type==='nightmare' ? 2.2 : run.type==='tfb' ? 4 : modMult(run.rules);
  const acc = run.words ? run.words/(run.words+run.mistakes) : 0;
  const hpF = 1 - Math.min(.6, run.dmgTaken / Math.max(1, run.maxHpSum*1.5));
  const par = Math.max(1, run.enemies)*25000, tB = Math.max(0, (par - run.t)/par)*.3;
  const base = run.kills*120 + run.words*25 + run.bestCombo*40 + Math.min(run.dmg, 6000)*.2;
  let score = Math.round(base * mult * (.6 + .4*acc) * hpF * (1+tB)); if(!won) score = Math.round(score*.4);
  const ideal = Math.max(1, run.enemies)*300*mult;
  const q = score/ideal, rank = !won ? 'D' : q>=1 ? 'S' : q>=.8 ? 'A' : q>=.6 ? 'B' : q>=.4 ? 'C' : 'D';
  return { score, rank, acc:Math.round(acc*100) };
}
