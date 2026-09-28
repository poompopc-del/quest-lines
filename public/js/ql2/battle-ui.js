/* ==========================================================================
   QUEST LINES — BATTLE UI 2 ("Less UI, More Game")
   A presentation layer only. After the original buildBattleDom() draws the
   battle, the existing elements (same ids, same listeners) are re-arranged
   into 4 zones:  HEADER · ARENA · WORD · ACTION BAR.
   Details that used to sit on screen all the time move to the Items tray,
   Skills tray, Enemy detail sheet and Battle Log. Game logic is untouched.
   ========================================================================== */
const BT = { log:[], lastCombo:0, clockT:null, lastSec:null };

function btLog(txt, cls){
  if(!ui.bat) return;
  BT.log.unshift({ t:txt, c:cls||'' }); if(BT.log.length>60) BT.log.length = 60;
}

/* ------------------------------ restructure ------------------------------ */
function btBuild(){
  const bt = document.querySelector('.battle'), b = ui.bat; if(!bt || !b || bt.classList.contains('bt2')) return;
  bt.classList.add('bt2');
  BT.log = []; BT.lastCombo = 0;
  const stage = $('#stage'), dock = bt.querySelector('.dock'), hud = stage.querySelector('.hud');
  const hold = document.createElement('div'); hold.className = 'bt-hold'; hold.hidden = true; bt.appendChild(hold);

  // HEADER — hero (portrait · name · Lv · HP) | combo | enemy progress · log · pause
  const me = hud.querySelector('.me'), bar = me.querySelector('.bar'), c = CH(save.eq.char);
  const hp = document.createElement('div'); hp.className = 'bt-hp';
  hp.innerHTML = `<div class="bt-hpn"><b>${esc(c.name)}</b><small>Lv ${heroInfo(save.eq.char).lv}</small><span class="bt-hst" id="btHst"></span></div>`;
  me.insertBefore(hp, bar); hp.appendChild(bar);
  const mid = hud.children[1]; mid.classList.add('bt-mid');
  const right = hud.querySelector('.right');
  const pause = right.querySelector('.pause');
  pause.insertAdjacentHTML('beforebegin', `<button class="bt-logbtn" data-act="btLog" aria-label="บันทึกการต่อสู้">📜</button>`);

  // ARENA — enemy plate (name · HP · status), badge for challenge modes
  stage.insertAdjacentHTML('beforeend', `<button class="bt-enemy" id="btEnemy" data-act="btEnemyInfo" aria-label="ข้อมูลศัตรู"></button><div class="bt-cast" id="btCast"></div>`);

  // WORD ZONE — current word + message + timer + clear
  const word = document.createElement('div'); word.className = 'bt-word';
  word.innerHTML = `<div class="bt-wtop"><span class="bt-wlab">CURRENT WORD</span><span class="bt-timer" id="btTimer" hidden></span></div><div class="bt-wrow"></div>`;
  const row = word.querySelector('.bt-wrow');
  const tray = $('#tray'), msg = $('#trayMsg');
  row.appendChild(tray);
  const clr = dock.querySelector('[data-act="clearSel"]'); if(clr){ clr.className = 'bt-clr'; clr.textContent = '⌫'; row.appendChild(clr); }
  word.appendChild(msg);

  // ACTION BAR — Items · Hint · ATTACK · Ultimate · Shuffle (+ Skills when the hero has them)
  const act = document.createElement('div'); act.className = 'attack bt-actions';
  const atk = $('#bAtk'), hint = $('#bHint'), ult = $('#bUlt'), shuf = $('#bShuf'), heal = $('#bHeal'), pow = $('#bPow');
  atk.insertAdjacentHTML('afterbegin', '<span class="bt-atkl">ATTACK</span>');
  act.innerHTML = `<button class="bt-ab bt-items" id="btItems" data-act="btPop" data-v="items" aria-label="ไอเทม">🎒<small>ไอเทม</small><em id="btItemsN"></em></button>`;
  act.appendChild(hint); hint.classList.add('bt-ab'); hint.insertAdjacentHTML('beforeend','<small>คำใบ้</small>');
  act.appendChild(atk);
  act.appendChild(ult); ult.classList.add('bt-ab'); ult.insertAdjacentHTML('beforeend','<small>ULT</small>');
  act.appendChild(shuf); shuf.classList.add('bt-ab');
  act.insertAdjacentHTML('beforeend', `<button class="bt-ab bt-skills" id="btSkills" data-act="btPop" data-v="skills" hidden aria-label="สกิล">⚔️<small>สกิล</small><em id="btSkillN"></em></button>`);
  // popover trays (above the action bar)
  const pops = document.createElement('div'); pops.className = 'bt-pops';
  pops.innerHTML = `<div class="bt-pop" id="btPopItems" hidden><span class="bt-pt">ITEMS</span><div class="bt-pbody"></div><div class="bt-acc">${save.acc.slice(0,accSlots()).filter(Boolean).map(a=>`<span title="${esc(ACC(a).th)}">${ACC_ART[a]}</span>`).join('')}</div></div>
    <div class="bt-pop" id="btPopSkills" hidden><span class="bt-pt">SKILLS</span><div class="bt-pbody"></div></div>`;
  const ib = pops.querySelector('#btPopItems .bt-pbody');
  [heal, pow].forEach(p=>{ ib.appendChild(p); p.classList.add('bt-item'); });
  heal.insertAdjacentHTML('beforeend', '<span class="bt-il"><b>ยาฟื้นพลัง</b><small>HP +50%</small></span>');
  pow.insertAdjacentHTML('beforeend', '<span class="bt-il"><b>ยาพลังคูณ</b><small>คำถัดไป +50%</small></span>');

  // move the old side panels out of sight (they keep receiving updates)
  ['.left','.right','.tools'].forEach(s=>{ const n = dock.querySelector(s); if(n) hold.appendChild(n); });
  const oldAtk = dock.querySelector('.attack'); if(oldAtk) oldAtk.remove();
  const acc = stage.querySelector('.hud-acc'); if(acc) hold.appendChild(acc);
  const tiles = $('#tiles');
  dock.innerHTML = ''; dock.append(word, tiles, pops, act);
  dock.classList.add('bt-dock');
  btEnemy(); btHeroStatus(); btWordState(); btItemsBadge();
  try{ fitScene(); }catch(e){}
  btStartClock();
}
buildBattleDom = (f=>function(){ const r = f.apply(this, arguments); try{ btBuild(); }catch(e){ console.error('battle-ui', e); } return r; })(buildBattleDom);

/* ------------------------------ enemy plate ------------------------------ */
function btStatuses(e, b){
  const out = [];
  if(e.burn>0) out.push({ i:'🔥', t:'ติดไฟ', v:e.burn, d:`เสีย HP ${e.burnDmg||0} ทุกเทิร์น` });
  if(e.poison>0) out.push({ i:'☠️', t:'พิษ', v:e.poison, d:`เสีย HP ${e.poisonDmg||0} ทุกเทิร์น` });
  if(e.frozen>0) out.push({ i:'❄️', t:'แช่แข็ง', v:e.frozen, d:'ข้ามเทิร์นโจมตี' });
  if(e.stun) out.push({ i:'💫', t:'มึนงง', v:'', d:'ข้ามเทิร์นถัดไป' });
  if(e.traits.includes('heavy') && e.charge) out.push({ i:'⚠️', t:'ชาร์จพลัง', v:'', d:'จะโจมตีหนักเทิร์นหน้า!' });
  if(e.egRage>1) out.push({ i:'💀', t:'คลั่ง', v:'x'+e.egRage, d:'แรงขึ้นทุกเทิร์น' });
  return out;
}
function btEnemy(){
  const el = $('#btEnemy'), b = ui.bat, e = curEnemy(); if(!el || !b) return;
  if(!e){ el.hidden = true; return; } el.hidden = false;
  const pct = Math.max(0, e.hp/e.maxHp*100), st = btStatuses(e, b), run = (typeof runOf==='function') && runOf(b);
  const badge = run ? { nightmare:'🌙 NIGHTMARE', perfect:'✨ PERFECT', speed:'⚡ SPEEDRUN', custom:'🧩 CHALLENGE', weekly:'📅 WEEKLY', tfb:'☠️ TRUE BOSS' }[run.type] : b.stage.tower ? `♾️ ชั้น ${TOWER.floor(b)}` : '';
  const R = (typeof rulesOf==='function' && rulesOf(b)) || {}, nMods = Object.keys(MODS||{}).filter(k=>R[k]).length;
  const phase = b.egTfb ? `PHASE ${b.egTfb.phase}` : e.egP3 ? 'PHASE 3' : e.phase2 && e.boss ? 'PHASE 2' : '';
  const weak = e.traits.includes('weak') ? `<span class="bt-weak">จุดอ่อน <b>${e.weak.toUpperCase()}</b></span>` : '';
  el.className = 'bt-enemy' + (e.boss ? ' boss' : e.mini ? ' mini' : '') + (e.golden ? ' golden' : '');
  el.innerHTML = `<span class="bt-en"><b>${esc(e.name)}</b>${e.boss?'<i class="bt-tag">BOSS</i>':e.mini?'<i class="bt-tag m">MINI</i>':''}</span>
    <span class="bt-ebar"><i style="width:${pct}%"></i><em>${Math.max(0,Math.ceil(e.hp))} / ${e.maxHp}</em></span>
    <span class="bt-erow"><span class="bt-atk">⚔ ${e.atk}</span>${weak}${st.slice(0,3).map(s=>`<span class="bt-st" title="${esc(s.t)}">${s.i}${s.v!==''?`<small>${s.v}</small>`:''}</span>`).join('')}${st.length>3?`<span class="bt-st more">+${st.length-3}</span>`:''}${e.traits.filter(t=>t!=='weak').length?'<span class="bt-st info">ⓘ</span>':''}</span>
    ${b.egTfb && b.egTfb.el ? `<span class="bt-shift">${ELEM_ICON[b.egTfb.el]} ${ELEMENTS[b.egTfb.el].name} · แพ้ทาง ${ELEM_ICON[TFB_WEAK[b.egTfb.el]]}</span>` : ''}
    ${badge||phase?`<span class="bt-badges">${badge?`<i class="bt-mode">${badge}${nMods?` · ⚙${nMods}`:''}</i>`:''}${phase?`<i class="bt-phase">${phase}</i>`:''}</span>`:''}`;
}
function btHeroStatus(){
  const b = ui.bat, el = $('#btHst'); if(!b || !el) return;
  const s = [b.power?'💜':'', b.evade?'🌪️':'', b.stoneSkin?'🪨':'', b.phoenix?'🪶':''].filter(Boolean);
  el.innerHTML = s.map(x=>`<i>${x}</i>`).join('');
}
function btItemsBadge(){ const n = $('#btItemsN'); if(n){ const k = (save.potions.heal||0)+(save.potions.power||0); n.textContent = k||''; } const bt = $('#btItems'); if(bt && ui.bat) bt.classList.toggle('on', !!ui.bat.power); }

/* ------------------------------ combo · word ------------------------------ */
function btCombo(){
  const b = ui.bat, h = document.querySelector('.bt2 .combo-hud'); if(!b || !h) return;
  const c = b.combo||0;
  h.classList.toggle('zero', !c);
  h.classList.remove('t5','t10','t15','t20');
  if(c>=20) h.classList.add('t20'); else if(c>=15) h.classList.add('t15'); else if(c>=10) h.classList.add('t10'); else if(c>=5) h.classList.add('t5');
  if(c>BT.lastCombo){ h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); if(c>=2) btLog(`🔥 Combo x${c}`, 'combo'); }
  BT.lastCombo = c;
}
function btWordState(){
  const b = ui.bat, w = document.querySelector('.bt-word'); if(!b || !w) return;
  const r = evalWord();
  w.classList.toggle('empty', r.state==='empty');
  w.classList.toggle('ok', r.state==='ok'); w.classList.toggle('bad', r.state==='bad');
  const atk = $('#bAtk'); if(atk) atk.classList.toggle('has', r.state==='ok');
}
updateHud = (f=>function(){ const r = f.apply(this, arguments); try{ btEnemy(); btHeroStatus(); btCombo(); btItemsBadge(); btSkills(); }catch(e){} return r; })(updateHud);
renderEnemyPanel = (f=>function(){ const r = f.apply(this, arguments); try{ btEnemy(); }catch(e){} return r; })(renderEnemyPanel);
updateEnemyHp = (f=>function(){ const r = f.apply(this, arguments); try{ btEnemy(); }catch(e){} return r; })(updateEnemyHp);
renderTray = (f=>function(){
  const prev = document.querySelector('.bt-word.bad');
  const r = f.apply(this, arguments);
  try{ btWordState(); const w = document.querySelector('.bt-word.bad'); if(w && !prev){ w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } }catch(e){}
  return r;
})(renderTray);

/* skills tray: hero skills (ELON) live here instead of the action bar */
function btSkills(){
  const sk = $('#elonSk'), btn = $('#btSkills'), pop = document.querySelector('#btPopSkills .bt-pbody'); if(!btn || !pop) return;
  if(sk && sk.parentNode!==pop) pop.appendChild(sk);
  btn.hidden = !sk;
  if(sk){ const ready = sk.querySelectorAll('button.ready').length; const n = $('#btSkillN'); if(n) n.textContent = ready||''; btn.classList.toggle('ready', ready>0); }
  else { const p = $('#btPopSkills'); if(p) p.hidden = true; }
}

/* ------------------------------ floating combat feedback + log ------------------------------ */
doAttack = (f=>async function(){
  const b = ui.bat; let r = null;
  try{ if(b && !b.busy){ r = evalWord(); } }catch(e){}
  if(r && r.state==='ok'){
    btClosePops();
    const e = curEnemy(), before = e ? e.hp : 0;
    const c = $('#btCast');
    if(c){ c.className = 'bt-cast' + (r.crit?' crit':'') + (r.el?' el':'') + (r.rude?' rude':''); c.innerHTML = `<b>✓ ${esc(r.w.toUpperCase())}</b><span>+${r.dmg}${r.crit?' · CRITICAL!':''}</span>${r.el?`<small>${ELEM_ICON[r.el]} ${esc(ELEMENTS[r.el].name)}</small>`:''}`; void c.offsetWidth; c.classList.add('show'); setTimeout(()=>c.classList.remove('show'), 1300); }
    const out = await f.apply(this, arguments);
    try{ const dealt = e ? Math.max(0, Math.round(before - Math.max(0,e.hp))) : r.dmg;
      btLog(`⚔️ ${r.w.toUpperCase()} → ${dealt||r.dmg} ดาเมจ${r.crit?' · CRITICAL!':''}${r.el?` · ${ELEM_ICON[r.el]} ${ELEMENTS[r.el].name}`:''}`, r.crit?'crit':''); }catch(err){}
    return out;
  }
  return f.apply(this, arguments);
})(doAttack);
enemyTurn = (f=>async function(){
  const b = ui.bat, e = curEnemy(), hp0 = b ? b.hp : 0;
  const out = await f.apply(this, arguments);
  try{ if(b && e){ const d = Math.round(hp0 - b.hp); if(d>0) btLog(`💥 ${e.name} โจมตี -${d} HP`, 'hurt'); else if(e.frozen || e.stun) btLog(`💫 ${e.name} ข้ามเทิร์น`); } }catch(err){}
  return out;
})(enemyTurn);
enemyDies = (f=>async function(){ const e = curEnemy(); if(e && ui.bat && !e._btl){ e._btl = 1; btLog(`☠️ ปราบ ${e.name} +${e.gold} ทอง`, 'kill'); } return f.apply(this, arguments); })(enemyDies);
useUltimate = (f=>async function(){ const b = ui.bat, ok = b && !b.busy && b.ult>=5; const r = await f.apply(this, arguments); if(ok && b.ult===0) btLog('⚡ ใช้ ULTIMATE!', 'crit'); return r; })(useUltimate);
usePotion = (f=>function(k){ const n = save.potions[k]; const r = f.apply(this, arguments); if(save.potions[k] < n){ btLog(k==='heal'?'🧪 ใช้ยาฟื้นพลัง':'💜 ใช้ยาพลังคูณ'); btClosePops(); btItemsBadge(); } return r; })(usePotion);

/* boss phases: a short full-screen transition instead of a small banner */
banner = (f=>function(t, sub, cls){
  const st = $('#stage');
  if(st && ui.bat && /PHASE|^BOSS!$|NIGHTMARE BOSS|ELITE BOSS/.test(String(t))){
    btLog(`🩸 ${t}${sub?` — ${sub}`:''}`, 'phase');
    const d = document.createElement('div'); d.className = 'bt-phasefx';
    d.innerHTML = `<i></i><b>${esc(t)}</b>${sub?`<small>${esc(sub)}</small>`:''}<i></i>`;
    st.appendChild(d); setTimeout(()=>d.remove(), 1700);
    return;
  }
  return f.apply(this, arguments);
})(banner);

/* ------------------------------ timer (only when a time limit exists) ------------------------------ */
function btStartClock(){
  clearInterval(BT.clockT); BT.lastSec = null;
  const b = ui.bat;
  BT.clockT = setInterval(()=>{
    if(ui.bat!==b || ui.screen!=='battle'){ clearInterval(BT.clockT); BT.clockT = null; return; }
    const el = $('#btTimer'); if(!el) return;
    const R = (typeof rulesOf==='function' && rulesOf(b)) || {}, lim = (b.egTfbTime || R.time || 0)*1000, run = typeof runOf==='function' && runOf(b);
    if(run && run.type==='speed'){ el.hidden = false; el.className = 'bt-timer run'; el.textContent = '⏱ ' + fmtT(run.t); return; }
    if(!lim){ el.hidden = true; return; }
    const left = b.egTL===undefined ? lim : b.egTL, s = Math.max(0, Math.ceil(left/1000));
    el.hidden = false; el.innerHTML = `⏱ ${s}s<i style="width:${Math.max(0,left/lim*100)}%"></i>`;
    el.className = 'bt-timer' + (s<=5 ? ' crit' : s<=10 ? ' warn' : '');
    if(s<=5 && s!==BT.lastSec && !b.busy && !$('#overlay').innerHTML){ try{ tone(s<=2?880:660, .06, 'square', .05); }catch(e){} }
    BT.lastSec = s;
  }, 200);
}
/* ------------------------------ popovers · sheets ------------------------------ */
function btClosePops(){ document.querySelectorAll('.bt-pop').forEach(p=>p.hidden = true); document.querySelectorAll('.bt-actions .bt-ab.open').forEach(x=>x.classList.remove('open')); }
Object.assign(ACTS2, {
  btPop: (v, el)=>{ const p = $(v==='items' ? '#btPopItems' : '#btPopSkills'); if(!p) return; const open = p.hidden; btClosePops(); p.hidden = !open; el.classList.toggle('open', open); sfx.tap && sfx.tap(1); },
  btEnemyInfo: ()=>{
    const b = ui.bat, e = curEnemy(); if(!b || !e) return;
    const st = btStatuses(e, b), R = (typeof rulesOf==='function' && rulesOf(b)) || {};
    const traits = e.traits.map(t=>`<div class="trait">${esc(traitText(t,e))}</div>`).join('') || `<div class="trait none">ไม่มีความสามารถพิเศษ</div>`;
    modal(`<div class="bt-sheet"><span class="q2-kicker">${e.boss?'BOSS':e.mini?'MINI BOSS':'ENEMY'}</span><h3>${esc(e.name)}</h3><p class="sub">${esc(e.th)}</p>
      <div class="cx-kv"><span>HP</span><b>${Math.max(0,Math.ceil(e.hp))} / ${e.maxHp}</b><span>โจมตี</span><b>⚔ ${e.atk}</b><span>ทองที่ได้</span><b>${ICON.coin} ${e.gold}</b>${e.traits.includes('weak')?`<span>จุดอ่อน</span><b>ตัว ${e.weak.toUpperCase()} x2</b>`:''}</div>
      <h4 class="bt-sh">ความสามารถ</h4><div class="bt-traits">${traits}${e.caster?'<div class="trait">ร่ายเวทจากระยะไกล</div>':''}</div>
      ${st.length?`<h4 class="bt-sh">สถานะตอนนี้</h4><div class="bt-traits">${st.map(s=>`<div class="trait">${s.i} ${esc(s.t)}${s.v!==''?` (${s.v})`:''} — ${esc(s.d)}</div>`).join('')}</div>`:''}
      ${Object.keys(MODS||{}).some(k=>R[k])?`<h4 class="bt-sh">กติกาพิเศษ</h4><div class="eg-modrow">${modChips(R,'')}</div>`:''}
      <div class="btns"><button class="cbtn gold block" data-act="closeModal">กลับสู่การต่อสู้</button></div></div>`, { dismiss:true });
  },
  btLog: ()=>{
    const b = ui.bat; if(!b) return;
    const words = b.recent.slice(0,8).map(r=>{ const th = r.rude ? '' : bookThai(r.w); return `<div class="bt-lw"><b>${esc(r.w.toUpperCase())}</b><span>${esc(th)}</span><em>${r.dmg}</em>${r.rude?'':`<button data-act="say" data-v="${esc(r.w)}" aria-label="ฟังเสียง">🔊</button>`}</div>`; }).join('');
    modal(`<div class="bt-sheet"><span class="q2-kicker">BATTLE LOG</span><h3>บันทึกการต่อสู้</h3>
      <div class="bt-logl">${BT.log.length ? BT.log.map(x=>`<div class="${x.c}">${esc(x.t)}</div>`).join('') : '<p class="sub">ยังไม่มีเหตุการณ์</p>'}</div>
      ${words?`<h4 class="bt-sh">คำที่ใช้ (คำแปล)</h4><div class="bt-lws">${words}</div>`:''}
      <div class="cx-kv"><span>คะแนน</span><b>${fmt(b.score)}</b><span>ทองที่ได้</span><b>${ICON.coin} ${fmt(b.goldGain)}</b><span>คำที่สะกด</span><b>${b.words}</b></div>
      <div class="btns"><button class="cbtn gold block" data-act="closeModal">กลับสู่การต่อสู้</button></div></div>`, { dismiss:true });
  },
  btRestart: ()=>{
    const b = ui.bat; if(!b) return; closeModal();
    if(b.egRun && ACTS2.egRetry){ ui.egLast = b.egRun; ui.bat = null; ACTS2.egRetry(); return; }
    if(b.stage.tower){ ui.bat = null; startTower(); return; }
    const st = b.stage; ui.bat = null; startStage(st.ch, st.n);
  },
});
// tap outside a tray closes it
document.addEventListener('click', ev=>{ if(!ev.target.closest || ev.target.closest('.bt-pop,.bt-actions .bt-ab')) return; if(document.querySelector('.bt-pop:not([hidden])')) btClosePops(); }, true);

/* pause: Resume · Restart · Settings · Battle Log · Sound · Quit */
pauseMenu = (f=>function(){
  f.apply(this, arguments);
  const m = document.querySelector('#overlay .modal'); if(!m || !ui.bat) return;
  m.classList.add('bt-pause');
  const h = m.querySelector('h3'); if(h) h.textContent = 'PAUSED';
  const btns = m.querySelector('.btns'); if(!btns) return;
  btns.innerHTML = `<button class="cbtn gold block" data-act="closeModal">▶ เล่นต่อ</button>
    <button class="cbtn wood block" data-act="btRestart">↻ เริ่มด่านใหม่</button>
    <button class="cbtn wood block" data-act="btLog">📜 บันทึกการต่อสู้</button>
    <button class="cbtn wood block" data-act="settings">${ICON.gear} ตั้งค่า</button>
    <button class="cbtn wood block" data-act="howto">📘 วิธีเล่น</button>
    <button class="cbtn red block" data-act="quitAsk">ออกจากด่าน</button>`;
})(pauseMenu);

window.addEventListener('resize', ()=>{ if(ui.screen==='battle') setTimeout(()=>{ try{ fitScene(); }catch(e){} }, 60); });
