/* ==========================================================================
   QUEST LINES 2.0 — QUEST BOARD (Main · Side · Chains · Daily)
   ========================================================================== */
const Q_TYPE = { main:'MAIN', side:'SIDE', chain:'CHAIN', daily:'DAILY' };
const Q_ST = { locked:'🔒 ล็อก', active:'กำลังทำ', ready:'✔ สำเร็จ', claimed:'รับแล้ว' };

function questRow(q, st, compact){
  st = st || qStatus(q);
  const objs = qObjs(q), V = V2(), tracked = trackedQuest()===q;
  const chainPips = q.type==='chain' ? `<span class="qr-steps">${q.chain.steps.map((_,i)=>`<i class="${V.q.claimed[`${q.chain.id}_${i+1}`]?'c':i===q.step?'n':''}"></i>`).join('')}</span>` : '';
  const foot = st==='ready' ? `<button class="cbtn gold small" data-act="qClaim" data-v="${q.id}">${IC2.star} รับรางวัล</button>`
    : st==='active' ? `<button class="cbtn small ${tracked?'red':'wood'}" data-act="qTrack" data-v="${q.id}">${tracked?'📌 กำลังติดตาม':'📌 ติดตาม'}</button>`
    : st==='locked' ? `<span class="qr-req">🔒 ${esc(q.reqTxt||'ยังไม่ปลดล็อก')}</span>` : `<span class="qr-req">✔ รับรางวัลแล้ว</span>`;
  return `<div class="panel qrow st-${st} t-${q.type}${tracked?' tracked':''}">
    <div class="qr-head"><span class="qr-type">${Q_TYPE[q.type]}${q.type==='chain'?` · ขั้น ${q.step+1}/${q.of}`:''}</span><span class="qr-loc">${IC2.pin}${esc(locLabel(q.loc))}</span><span class="qr-st">${Q_ST[st]}</span></div>
    <h4>${q.en?`${esc(q.en)}<small>${esc(q.title)}</small>`:esc(q.title)}</h4>${chainPips}
    ${compact?'':`<p class="qr-desc">${esc(q.desc||'')}</p>`}
    ${st==='locked' && q.type==='main' ? '' : `<ul class="qr-objs">${objs.map(o=>`<li class="${o.done?'done':''}"><i aria-hidden="true">${o.done?'☑':'☐'}</i><span>${esc(o.txt)}</span><b>${fmt(o.cur)}/${fmt(o.need)}</b></li>`).join('')}</ul>`}
    <div class="qr-foot"><span class="qr-rw"><small>รางวัล</small>${rewardPreview(q.reward)}</span>${foot}</div>
  </div>`;
}
function dailyRow(s, i){
  const inf = dailyInfo(s); if(!inf) return '';
  const D = dailyEnsure();
  const btn = s.claimed ? `<span class="qr-req">✔ รับแล้ว</span>`
    : inf.done ? `<button class="cbtn gold small" data-act="dClaim" data-v="${i}">${IC2.star} รับ</button>`
    : D.rerolls<1 ? `<button class="cbtn wood small" data-act="dReroll" data-v="${i}" title="เปลี่ยนภารกิจนี้ (วันละ 1 ครั้ง)">🔄 เปลี่ยน</button>` : '';
  return `<div class="panel qrow daily ${s.claimed?'st-claimed':inf.done?'st-ready':'st-active'}">
    <div class="qr-head"><span class="qr-type">DAILY</span><span class="qr-loc">${IC2.pin}ทุกพื้นที่</span><span class="qr-st">${s.claimed?'รับแล้ว':inf.done?'✔ สำเร็จ':'กำลังทำ'}</span></div>
    <h4>${esc(inf.txt)}</h4>
    <div class="q2-meter"><i style="width:${Math.round(inf.cur/inf.need*100)}%"></i></div>
    <div class="qr-foot"><span class="qr-rw"><small>${fmt(inf.cur)}/${fmt(inf.need)} · รางวัล</small>${rewardPreview(inf.reward)}</span>${btn}</div></div>`;
}
function renderQuests(){
  const t = ui.qTab || 'main', D = dailyEnsure();
  const cnt = k=>{ if(k==='daily') return D.slots.filter(s=>!s.claimed && dailyInfo(s) && dailyInfo(s).done).length + (dailyBonusReady()?1:0);
    return QUESTS.filter(q=>(k==='chain' ? q.type==='chain' : q.type===k) && qStatus(q)==='ready').length; };
  const tabs = [['main','หลัก'],['side','เสริม'],['chain','ต่อเนื่อง'],['daily','ประจำวัน']];
  let body = '';
  if(t==='main'){
    const cm = currentMain();
    body = MAIN.map(q=>{ const st = qStatus(q); if(st==='locked' && q!==MAIN[MAIN.indexOf(cm)+1]) return `<div class="panel qrow st-locked t-main mini"><div class="qr-head"><span class="qr-type">MAIN</span><span class="qr-loc">${IC2.pin}${esc(locLabel(q.loc))}</span><span class="qr-st">🔒</span></div><h4>${esc(q.en)}<small>???</small></h4></div>`; return questRow(q, st); }).join('');
  } else if(t==='side'){
    const list = QUESTS.filter(q=>q.type==='side').map(q=>({ q, st:qStatus(q) })).sort((a,b)=>({ ready:0, active:1, locked:2, claimed:3 }[a.st] - { ready:0, active:1, locked:2, claimed:3 }[b.st]));
    body = list.map(x=>questRow(x.q, x.st)).join('');
  } else if(t==='chain'){
    body = CHAINS.map(c=>{ const q = chainStep(c); return questRow(q, qStatus(q)); }).join('');
  } else {
    const all = D.slots.every(s=>s.claimed);
    body = `<div class="qd-head"><span>🗓 รีเซ็ตทุกเที่ยงคืน · เปลี่ยนภารกิจได้วันละ 1 ครั้ง (${Math.max(0,1-D.rerolls)} ครั้งเหลือ)</span></div>`
      + D.slots.map((s,i)=>dailyRow(s,i)).join('')
      + `<div class="panel qd-bonus ${D.bonus?'got':dailyBonusReady()?'ready':''}"><span class="qd-chest">${D.bonus?'🎁':'🧰'}</span><span><b>หีบโบนัสประจำวัน</b><small>ทำภารกิจประจำวันครบ 3 อย่าง</small><span class="qr-rw">${rewardPreview(DAILY_BONUS)}</span></span>
        ${D.bonus?'<span class="qr-req">✔ รับแล้ว</span>':`<button class="cbtn ${dailyBonusReady()?'gold':'wood'} small" data-act="dBonus" ${dailyBonusReady()?'':'disabled'}>${all?'เปิดหีบ':'ยังไม่ครบ'}</button>`}</div>`;
  }
  const readyHere = t==='daily' ? 0 : QUESTS.filter(q=>(t==='chain' ? q.type==='chain' : q.type===t) && qStatus(q)==='ready').length;
  if(readyHere>1) body = `<button class="cbtn gold block q2-claimall" data-act="qClaimAll" data-v="${t}">${IC2.star} รับรางวัลทั้งหมด (${readyHere})</button>` + body;
  return `<div class="q2-head"><button class="q2-back" data-act="go" data-v="more" aria-label="กลับเมนู">${IC2.back}</button><div><span class="q2-kicker">QUEST BOARD</span><h2 class="q2-h">กระดานภารกิจ</h2></div><span class="q2-headic">${IC2.scroll}</span></div>
    <div class="q2-anchor"></div><div class="seg q2-tabs">${tabs.map(([k,l])=>`<button class="${t===k?'on':''}" data-act="qTab" data-v="${k}">${l}${cnt(k)?`<em class="q2-badge">${cnt(k)}</em>`:''}</button>`).join('')}</div>
    <div class="q2-list">${body}</div>`;
}
SCREENS.quests = { nav:'more', render:renderQuests };

function claimModal(title, pills, sub){
  sfx.win && sfx.win();
  modal(`<div class="q2-claim"><div class="q2-res-glow" aria-hidden="true"></div><span class="q2-kicker">REWARD</span><h3>${title}</h3>${sub?`<p>${sub}</p>`:''}<div class="rewards">${pills||''}</div>
    <div class="btns"><button class="cbtn gold block" data-act="closeModal">เยี่ยม!</button></div></div>`, { dismiss:true });
}
Object.assign(ACTS2, {
  qTab: v=>{ ui.qTab = v; if(ui.screen!=='quests') goTo('quests'); else tabRender(); },
  qTrack: v=>{ const V = V2(); V.q.track = V.q.track===v ? null : v; persist(); render(); },
  qClaim: v=>{ const q = QX[v]; const html = claimQuest(v); if(html===''){ return; } const next = q.type==='main' ? currentMain() : q.type==='chain' ? chainStep(q.chain) : null;
    claimModal('ภารกิจสำเร็จ!', html, `<b>${esc(q.title)}</b>${next && next!==q && qStatus(next)!=='claimed' ? `<br><small>ภารกิจถัดไป: ${esc(next.title)}</small>` : ''}`); render(); },
  qClaimAll: v=>{ let html = '', n = 0; let guard = 0;
    while(guard++ < 40){ const q = QUESTS.find(x=>(v==='chain' ? x.type==='chain' : x.type===v) && qStatus(x)==='ready'); if(!q) break; html += claimQuest(q.id); n++; }
    if(n){ claimModal(`รับรางวัล ${n} ภารกิจ!`, html); render(); } },
  dClaim: v=>{ const html = dailyClaim(+v); if(html){ claimModal('ภารกิจประจำวันสำเร็จ!', html); render(); } },
  dReroll: v=>{ if(dailyReroll(+v)){ sfx.shuffle && sfx.shuffle(); toast('🔄 เปลี่ยนภารกิจประจำวันแล้ว'); render(); } },
  dBonus: ()=>{ if(!dailyBonusReady()) return; const D = dailyEnsure(); D.bonus = true; const html = grant(DAILY_BONUS); persist(); claimModal('หีบโบนัสประจำวัน!', html, 'ทำภารกิจประจำวันครบแล้ว เจอกันพรุ่งนี้!'); render(); },
});
