/* ==========================================================================
   QUEST LINES 2.0 — PLAYER PROFILE · ADVENTURE ROAD · TROPHY ROOM · STYLE
   ========================================================================== */
function overallProgress(){
  const total = CHAPTERS.length*STAGES_PER, C = cxCounts();
  const parts = [
    ['ด่าน', Math.min(save.cleared,total), total],
    ['ดาว', starsTotal(), total*3],
    ['ภารกิจหลัก', MAIN.filter(q=>V2().q.claimed[q.id]).length, MAIN.length],
    ['โคเด็กซ์', C.mon[0]+C.boss[0]+C.el[0]+C.lore[0]+C.hero[0], C.mon[1]+C.boss[1]+C.el[1]+C.lore[1]+C.hero[1]],
    ['ถ้วยรางวัล', Object.keys(ACH).filter(k=>save.achievements[k]).length, Object.keys(ACH).length],
  ];
  const pct = Math.round(parts.reduce((a,p)=>a + p[1]/p[2], 0) / parts.length * 100);
  return { pct, parts };
}
function renderProfile(){
  const t = ui.pfTab || 'pf', V = V2(), A = advInfo(V.adv.xp), fr = FRAMES[V.frames.eq]||FRAMES.basic, st = save.stats;
  const tabs = [['pf','โปรไฟล์'],['road','เส้นทาง'],['trophy','ถ้วยรางวัล'],['style','สไตล์']];
  const un = advUnclaimed(), trOn = Object.keys(ACH).filter(k=>save.achievements[k]).length;
  const card = `<div class="panel pf-card">
    <span class="pf-ava ${fr.css}">${heroFaceSvg(save.eq)}</span>
    <div class="pf-id"><span class="q2-kicker">PLAYER</span><h2>${esc(save.name||'Hero')}</h2><span class="pf-title">🎖 ${esc((TITLES[V.titles.eq]||TITLES.rookie).th)}</span></div>
    <div class="pf-lv"><small>ADVENTURE</small><b>Lv ${A.lv}</b></div>
    <button class="eg-mr mini pf-mr" data-act="egView" data-v="rank" style="--rc:${mrInfo().R.c}"><span class="eg-mr-gem"></span><b>${mrInfo().R.k}</b></button>
    <div class="pf-xp"><div class="q2-xpbar"><i style="--w:${A.pct}%"></i></div><small>${A.lv>=ADV.cap?'MAX LEVEL':`${fmt(A.into)} / ${fmt(A.need)} EXP · ถัดไป: ${rewardPreview(ADV.reward(A.lv+1))}`}</small></div>
  </div>`;
  let body = '';
  if(t==='pf'){
    const O = overallProgress();
    const box = (l,v,ic)=>`<div class="panel pf-stat"><small>${l}</small><b>${ic?ic+' ':''}${v}</b></div>`;
    const mLv = [1,2,3,4,5].map(l=>Object.keys(save.mastery||{}).filter(w=>masteryInfo(w).lv===l).length), mMax = Math.max(1,...mLv);
    body = `<div class="pf-stats">
        ${box('Battles', fmt(V.stats.battles))}${box('Words Used', fmt(st.words))}${box('Bosses', fmt(st.bosses), '💀')}${box('Best Combo', 'x'+(st.bestCombo||0), '🔥')}
        ${box('มอนสเตอร์ที่ล้ม', fmt(st.kills))}${box('คำยาวที่สุด', esc((st.longest||'—').toUpperCase()))}${box('ดาเมจสูงสุด', `${fmt(st.bestDmg)}${st.bestWord?` <small>${esc(st.bestWord.toUpperCase())}</small>`:''}`)}${box('ดาว', `${starsTotal()}/${CHAPTERS.length*STAGES_PER*3}`, '★')}
        ${box('หอคอย', `${save.tower.best||0} ชั้น`, '🗼')}${box('ภารกิจสำเร็จ', fmt(V.stats.quests))}${box('ปริศนา', fmt(V.stats.puzzles), '🧩')}${box('Critical', fmt(st.crit||0), '💥')}
      </div>
      <h3 class="q2-sec">ความก้าวหน้าโดยรวม <small>Overall ${O.pct}%</small></h3>
      <div class="panel pf-over"><div class="pf-ring" style="--p:${O.pct}"><b>${O.pct}%</b></div><div class="pf-parts">${O.parts.map(([l,a,b])=>`<div><span>${l}</span><div class="q2-meter"><i style="width:${Math.round(a/b*100)}%"></i></div><b>${fmt(a)}/${fmt(b)}</b></div>`).join('')}</div></div>
      <h3 class="q2-sec">Word Mastery <small>${Object.keys(save.mastery||{}).length} คำ</small></h3>
      <div class="panel pf-mastery">${mLv.map((n,i)=>`<div><span>Lv.${i+1}</span><div class="pf-mb"><i style="width:${Math.round(n/mMax*100)}%"></i></div><b>${n}</b></div>`).join('')}<button class="cbtn small wood" data-act="cxOpen" data-v="words">📖 ดูในโคเด็กซ์</button></div>`;
  } else if(t==='road'){
    let rows = '';
    for(let L=2; L<=ADV.cap; L++){
      const got = L<=V.adv.claimed, ready = !got && L<=A.lv, R = ADV.reward(L), big = !!ADV.extra[L];
      if(!big && L>A.lv+3 && L%5) continue;
      rows += `<div class="pf-road ${got?'got':ready?'ready':'lock'} ${big?'big':''}"><span class="pr-lv">${L}</span><span class="pr-rw">${rewardPreview(R)}</span><span class="pr-st">${got?'✔':ready?'🎁':'🔒'}</span></div>`;
    }
    body = `<div class="panel pf-roadhead"><span>${un?`มีรางวัลรอรับ <b>${un}</b> เลเวล`:'รับรางวัลครบแล้ว — เล่นต่อเพื่อเลเวลอัป!'}</span><button class="cbtn ${un?'gold':'wood'} small" data-act="advClaim" ${un?'':'disabled'}>${IC2.star} รับทั้งหมด</button></div>
      <p class="sub">ได้ EXP จากการสะกดคำ ปราบมอนสเตอร์ ผ่านด่าน ไขปริศนา และทำภารกิจ · ทุกเลเวลได้ทอง บางเลเวลได้ไอเทม อาวุธ ฉายา กรอบรูป และเอฟเฟกต์ฐาน</p>
      <div class="pf-roads">${rows}</div>`;
  } else if(t==='trophy'){
    const cat = ui.trCat || 'all';
    const all0 = Object.keys(ACH).map(trophyOf), all = cat==='all' ? all0 : all0.filter(x=>TCAT_OF[x.id]===cat);
    const byR = [4,3,2,1].map(r=>({ r, on:all.filter(x=>x.r===r && x.on).length, n:all.filter(x=>x.r===r).length }));
    const titles = all.filter(x=>x.title);
    const sorted = all.slice().sort((a,b)=>(b.on-a.on) || (b.r-a.r) || (b.cur/b.need - a.cur/a.need));
    body = `<div class="panel tr-hall"><div class="tr-count"><b>${trOn}</b><small>/ ${all.length}</small><span>ถ้วยรางวัล</span></div><div class="tr-rars">${byR.map(x=>`<span class="rr r${x.r}"><i></i>${RAR[x.r].th} ${x.on}/${x.n}</span>`).join('')}</div></div>
      <div class="tr-cats">${[['all','ทั้งหมด'], ...Object.entries(TCAT)].map(([k,l])=>{ const n = k==='all' ? all0 : all0.filter(x=>TCAT_OF[x.id]===k); return `<button class="${cat===k?'on':''}" data-act="trCat" data-v="${k}">${l}<small>${n.filter(x=>x.on).length}/${n.length}</small></button>`; }).join('')}</div>
      <div class="tr-grid">${sorted.map(x=>`<div class="tr ${x.on?'on':'off'} r${x.r} ${x.secret&&!x.on?'secret':''}"><span class="tr-ped"><span class="tr-ic">${x.secret&&!x.on?'❔':x.ic}</span></span><b>${esc(x.secret&&!x.on?'???':x.th)}</b><small>${esc(x.d)}</small>
        ${x.on?`<em class="tr-rar">${RAR[x.r].th}${x.title?` · 🎖 ${esc(TITLES[x.title].th)}`:''}</em>`:`<span class="tr-prog"><i style="width:${Math.round(x.cur/x.need*100)}%"></i></span><em>${fmt(x.cur)}/${fmt(x.need)}</em>`}</div>`).join('')}</div>
      <h3 class="q2-sec">ฉายาพิเศษจากถ้วยรางวัล <small>Special Titles</small></h3>
      <div class="tr-titles">${titles.map(x=>`<span class="${x.on?'on':''}">🎖 ${esc(TITLES[x.title].th)}<small>${x.on?'ได้แล้ว':esc(x.secret?'???':x.th)}</small></span>`).join('')}</div>`;
  } else {
    const opt = (kind, map, own, eq, act, extra)=>Object.entries(map).map(([k,o])=>{ const have = own.includes(k); return `<button class="pf-opt ${have?'':'lock'} ${eq===k?'on':''}" data-act="${act}" data-v="${k}" ${have?'':'disabled'}>${extra?extra(k):''}<b>${esc(o.th)}</b><small>${eq===k?'ใช้อยู่':have?'แตะเพื่อใช้':'ยังไม่ปลดล็อก'}</small></button>`; }).join('');
    body = `<h3 class="q2-sec">ฉายา <small>Titles · ${V.titles.own.length}/${Object.keys(TITLES).length}</small></h3><div class="pf-opts">${opt('t', TITLES, V.titles.own, V.titles.eq, 'eqTitle')}</div>
      <h3 class="q2-sec">กรอบรูป <small>Avatar Frames</small></h3><div class="pf-opts">${opt('f', FRAMES, V.frames.own, V.frames.eq, 'eqFrame', k=>`<span class="pf-ava sm ${FRAMES[k].css}">${heroFaceSvg(save.eq)}</span>`)}</div>
      <h3 class="q2-sec">เอฟเฟกต์ที่ฐาน <small>Hub Effects</small></h3><div class="pf-opts">${opt('x', HUBFX, V.fx.own, V.fx.eq, 'eqFx')}</div>
      ${['aura','trail','victory','badge'].map(k=>{ const E = EGS(); return `<h3 class="q2-sec">${{aura:'ออร่าตัวละคร',trail:'รอยโจมตี',victory:'ฉากชัยชนะ',badge:'ตราโปรไฟล์'}[k]} <small>${{aura:'Aura',trail:'Attack Trail',victory:'Victory',badge:'Badge'}[k]} · ${E.cos.own[k].length}/${Object.keys(COS[k]).length}</small></h3><div class="pf-opts">${Object.entries(COS[k]).map(([id,o])=>{ const have = E.cos.own[k].includes(id), on = E.cos.eq[k]===id; return `<button class="pf-opt ${have?'':'lock'} ${on?'on':''}" data-act="eqCos" data-k="${k}" data-v="${id}" ${have?'':'disabled'}>${k==='aura'&&o.c?`<span class="eg-swatch" style="--a:${o.c[0]};--b:${o.c[1]}"></span>`:k==='trail'&&o.c?`<span class="eg-trail" style="--a:${o.c}"></span>`:k==='badge'&&o.ic?`<span class="eg-bdg big">${o.ic}</span>`:''}<b>${esc(o.th)}</b><small>${on?'ใช้อยู่':have?'แตะเพื่อใช้':'ยังไม่ปลดล็อก'}</small></button>`; }).join('')}</div>`; }).join('')}
      <p class="sub">ปลดล็อกเพิ่มได้จาก Adventure Level ภารกิจ ถ้วยรางวัล Master Rank และ Prestige Shop ใน Challenge Hall</p>`;
  }
  return card + `<div class="q2-anchor"></div><div class="seg q2-tabs">${tabs.map(([k,l])=>`<button class="${t===k?'on':''}" data-act="pfTab" data-v="${k}">${l}${k==='road'&&un?`<em class="q2-badge">${un}</em>`:''}</button>`).join('')}</div><div class="pf-body">${body}</div>`;
}
SCREENS.profile = { nav:'profile', render:renderProfile };
Object.assign(ACTS2, {
  pfTab: v=>{ ui.pfTab = v; tabRender(); },
  advClaim: ()=>{ const html = claimAdv(); if(html){ claimModal('รางวัล Adventure Level!', html, `Adventure Level ${advInfo(V2().adv.xp).lv}`); render(); } },
  eqTitle: v=>{ const V = V2(); if(!V.titles.own.includes(v)) return; V.titles.eq = v; persist(); sfx.tap && sfx.tap(3); render(); },
  eqFrame: v=>{ const V = V2(); if(!V.frames.own.includes(v)) return; V.frames.eq = v; persist(); sfx.tap && sfx.tap(3); render(); },
  eqFx: v=>{ const V = V2(); if(!V.fx.own.includes(v)) return; V.fx.eq = v; persist(); sfx.tap && sfx.tap(3); render(); },
  cxOpen: v=>{ ui.cxTab = v; goTo('codex'); },
});
