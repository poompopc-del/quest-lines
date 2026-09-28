/* ==========================================================================
   QUEST LINES 2.0 — QUEST CODEX
   Everything the player has discovered: Words (with Word Mastery), Monsters,
   Heroes, Elements, Bosses and Lore. Undiscovered entries stay as ???.
   ========================================================================== */
const LORE = [
  { id:'haven', t:'ฐานแสงจันทร์', en:'Moonlit Haven', req:()=>true, txt:'ป้อมเล็กๆ บนหน้าผาริมทะเล ที่ซึ่งนักสะกดคำทุกคนเริ่มต้นการเดินทาง ใต้แสงจันทร์ดวงใหญ่ที่ไม่เคยลับฟ้า' },
  { id:'words', t:'พลังแห่งถ้อยคำ', en:'The Power of Words', req:()=>save.stats.words>=10, reqTxt:'สะกดคำ 10 คำ', txt:'ในโลกนี้ คำที่สะกดถูกต้องคือเวทมนตร์ ยิ่งคำยาว พลังยิ่งมาก และคำบางคำยังปลุกธาตุที่หลับใหลอยู่ในอาวุธ' },
  ...LOCS.map((L,i)=>({ id:'loc'+i, t:L.th, en:L.name, req:()=>chapterOpen(i), reqTxt:`ปลดล็อก ${L.name}`, txt:L.blurb })),
  ...CHAPTERS.map((C,i)=>({ id:'boss'+i, t:`บันทึกการปราบ ${MON[C.boss].name}`, en:'Boss Record', req:()=>(V2().kills[C.boss]||0)>0, reqTxt:`ปราบ ${MON[C.boss].name}`,
    txt:[ 'ราชินีสไลม์วารีหลอมร่างจากน้ำใต้สุสาน สั่งฝูงสไลม์ให้เฝ้าทองคำต้องสาป เมื่อนางพ่ายแพ้ ร่างของนางก็ไหลกลับลงสู่ธารน้ำใต้ดินอีกครั้ง',
          'ยักษ์ป่าเฝ้าประตูโบราณมาหลายร้อยปี เมื่อมันล้มลง ประตูสู่อาณาจักรที่สาบสูญก็เปิดออกเป็นครั้งแรก',
          'ไททันน้ำแข็งละลายกลายเป็นธารน้ำใส เสียงของมันยังก้องอยู่ในถ้ำ — "คำที่อบอุ่นที่สุดคือคำที่พูดออกมา"',
          'มังกรเพลิงหลับลงกลางกองไฟ คลังอาวุธของกองทัพเงาถูกปิดตาย แต่แผนที่ในนั้นชี้ไปยังบ้านร้างใต้แสงจันทร์สีเขียว',
          'ไทแรนต์ล้มลงกลางห้องทดลอง ถ้อยคำที่ถูกขโมยไปกลับคืนสู่โลก… แต่ใครกันที่สร้างมันขึ้นมา? หอคอยยังคงยืนอยู่' ][i] })),
  { id:'tower', t:'หอคอยราตรีนิรันดร์', en:'Endless Tower', req:()=>(save.tower.runs||0)>0, reqTxt:'เข้าหอคอยไร้สิ้นสุด 1 ครั้ง', txt:'ไม่มีใครรู้ว่าหอคอยสูงแค่ไหน ทุกๆ สิบชั้น ทิวทัศน์นอกหน้าต่างจะเปลี่ยนไปเป็นดินแดนที่เคยผ่านมาแล้ว' },
  { id:'gods', t:'นามแห่งทวยเทพ', en:'Names of the Gods', req:()=>save.chars.includes('boomtos'), reqTxt:'ปลดล็อก Boomtos', txt:'Boomtos รู้จักชื่อจริงของเทพกรีก เมื่อเขาสะกดชื่อเหล่านั้น เทพก็ตอบรับด้วยพลังของตัวเอง — ZEUS, POSEIDON, HADES, ATHENA …' },
];
// only monsters that still appear in a chapter (Chapter 5 now uses 3 kinds) count toward the codex
const cxMonsters = ()=>[...new Set(CHAPTERS.flatMap(C=>C.pool))].filter(k=>MON[k] && !MON[k].boss && !MON[k].mini);
const cxBosses = ()=>CHAPTERS.flatMap(C=>[C.mini, C.boss]);
const monLoc = k=>{ const i = CHAPTERS.findIndex(C=>C.pool.includes(k) || C.mini===k || C.boss===k); return i<0 ? null : i; };

function cxCounts(){
  const V = V2();
  return {
    words:[Object.keys(save.book||{}).length, null],
    mon:[cxMonsters().filter(k=>V.seen.mon[k]).length, cxMonsters().length],
    boss:[cxBosses().filter(k=>V.kills[k]).length, cxBosses().length],
    hero:[save.chars.length, CHARACTERS.length],
    el:[BASE_ELEMS.filter(e=>V.elem[e]).length, BASE_ELEMS.length],
    lore:[LORE.filter(l=>l.req()).length, LORE.length],
  };
}
function renderCodex(){
  const t = ui.cxTab || 'words', V = V2(), C = cxCounts();
  const tabs = [['words','คำศัพท์'],['mon','มอนสเตอร์'],['boss','บอส'],['hero','ฮีโร่'],['el','ธาตุ'],['lore','ตำนาน']];
  const all = Object.values(C).filter(x=>x[1]).reduce((a,x)=>[a[0]+x[0],a[1]+x[1]],[0,0]);
  let body = '';
  if(t==='words'){
    const sort = ui.cxSort || 'recent';
    let words = Object.entries(save.book||{});
    if(sort==='recent') words.sort((a,b)=>(b[1].t||0)-(a[1].t||0));
    else if(sort==='mastery') words.sort((a,b)=>(save.mastery[b[0]]?save.mastery[b[0]].n:0)-(save.mastery[a[0]]?save.mastery[a[0]].n:0));
    else words.sort((a,b)=>a[0].localeCompare(b[0]));
    const lv5 = Object.keys(save.mastery||{}).filter(w=>masteryInfo(w).lv>=5).length, bank = words.filter(x=>x[1].bank).length;
    const WC = wordCompletion();
    body = `<button class="panel cx-comp" data-act="egView" data-v="mastery"><span class="q2-kicker">WORD COMPLETION</span><span class="cx-cg"><span>Total<b>${fmt(WC.total)}</b></span><span>Discovered<b>${fmt(WC.disc)}</b></span><span>Mastered<b>${fmt(WC.mast)}</b></span><span>Progress<b>${WC.pct}%</b></span></span><span class="q2-meter"><i style="width:${WC.pct}%"></i></span></button>
      <div class="cx-sum"><div><b>${fmt(words.length)}</b><small>คำที่รู้จัก</small></div><div><b>${bank}</b><small>คำเป้าหมาย ⭐</small></div><div><b>${lv5}</b><small>Mastery Lv.5</small></div></div>
      <div class="cx-tools"><input class="text-in cx-q" id="cxQ" placeholder="🔍 ค้นหาคำ หรือคำแปล" autocomplete="off" aria-label="ค้นหาคำศัพท์">
      <div class="seg cx-sort">${[['recent','ล่าสุด'],['mastery','ใช้บ่อย'],['az','A–Z']].map(([k,l])=>`<button class="${sort===k?'on':''}" data-act="cxSort" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="cx-words">${words.length ? words.map(([w,d])=>{ const m = masteryInfo(w), md = save.mastery[w]||{}, el = md.el;
        return `<button class="cx-w" data-act="cxWord" data-v="${esc(w)}" data-s="${esc((w+' '+bookThai(w, d)).toLowerCase())}"><b>${esc(w.toUpperCase())}${d.bank?' <i class="st">⭐</i>':''}${el?` <i>${ELEM_ICON[el]}</i>`:''}</b><span>${esc(bookThai(w, d))}</span><span class="cx-lv"><em style="color:${WTIERS[wordTier(w)].c}">${WTIERS[wordTier(w)].k}</em><span class="mastery-bar"><i style="width:${m.lv>=5?100:m.prog/5*100}%"></i></span></span></button>`; }).join('')
        : `<p class="sub cx-empty">ยังไม่มีคำ ออกไปผจญภัยแล้วสะกดคำแรกเลย!</p>`}</div>`;
  } else if(t==='mon'){
    body = CHAPTERS.map((Ch,ci)=>`<h3 class="q2-sec">${esc(LOCS[ci].name)} <small>${Ch.pool.filter(k=>V.seen.mon[k]).length}/${Ch.pool.length}</small></h3>
      <div class="cx-grid">${Ch.pool.map(k=>cxMonCard(k)).join('')}</div>`).join('');
  } else if(t==='boss'){
    body = CHAPTERS.map((Ch,ci)=>`<h3 class="q2-sec">${esc(LOCS[ci].name)}</h3><div class="cx-grid two">${cxMonCard(Ch.mini,'mini')}${cxMonCard(Ch.boss,'boss')}</div>`).join('');
  } else if(t==='hero'){
    body = `<div class="cx-heroes">${CHARACTERS.map(c=>{ const own = save.chars.includes(c.id), hi = heroInfo(c.id), X = HERO_EXTRA[c.id]||{}, f = fighterOf(c.id);
      return `<button class="panel cx-hero ${own?'':'locked'}" style="--fc:${f.c}" data-act="heroPick" data-v="${c.id}"><span class="fc-face">${heroFaceSvg(Object.assign({}, save.eq, { char:c.id }))}</span><span><b>${esc(c.name)}</b><small>${esc(c.th)}</small><p>${esc(X.lore||c.desc)}</p><em>${own?`Lv ${hi.lv} · ${hi.R.th}`:`🔒 ${fmt(c.price)} ทอง`}</em></span></button>`; }).join('')}</div>`;
  } else if(t==='el'){
    body = `<div class="cx-els">${BASE_ELEMS.map(el=>{ const E = ELEMENTS[el], n = V.elem[el]||0, seen = !!n;
      const sample = E.words.split(' ').slice(0,8).map(w=>w.toUpperCase()).join(' · ');
      return `<div class="panel cx-el el-${el} ${seen?'':'unseen'}"><span class="cx-eli">${ELEM_ICON[el]}</span><span><b>${E.name} <small>${esc(E.th)}</small></b><p>${esc(E.desc)}</p><small class="cx-elw">${seen?esc(sample):'สะกดคำธาตุนี้เพื่อบันทึกลงโคเด็กซ์'}</small></span><em>${seen?`ใช้ ${n} ครั้ง`:'???'}</em></div>`; }).join('')}</div>
      ${save.chars.includes('boomtos') ? `<h3 class="q2-sec">คำแห่งทวยเทพ <small>เฉพาะ Boomtos</small></h3><div class="cx-gods">${Object.entries(ELEMENTS).filter(([k,E])=>E.god).map(([k,E])=>`<span class="cx-god ${V.gods[k]?'':'unseen'}" title="${esc(E.desc)}">${ELEM_ICON[k]} ${E.name}${V.gods[k]?` ×${V.gods[k]}`:''}</span>`).join('')}</div>` : ''}`;
  } else {
    body = `<div class="cx-lore">${LORE.map(l=>{ const ok = l.req(); return `<div class="panel cx-l ${ok?'':'locked'}"><small>${esc(l.en)}</small><b>${ok?esc(l.t):'???'}</b><p>${ok?esc(l.txt):`🔒 ${esc(l.reqTxt||'')}`}</p></div>`; }).join('')}</div>`;
  }
  return `<div class="q2-head"><div><span class="q2-kicker">QUEST CODEX</span><h2 class="q2-h">โคเด็กซ์</h2></div><div class="cx-pct"><b>${Math.round(all[0]/all[1]*100)}%</b><small>ค้นพบแล้ว</small></div></div>
    <div class="q2-anchor"></div><div class="seg q2-tabs cx-tabs">${tabs.map(([k,l])=>`<button class="${t===k?'on':''}" data-act="cxTab" data-v="${k}">${l}<small>${C[k][1]?`${C[k][0]}/${C[k][1]}`:C[k][0]}</small></button>`).join('')}</div>
    <div class="cx-body">${body}</div>`;
}
function cxMonCard(k, tag){
  const V = V2(), seen = tag ? !!V.kills[k] || !!V.seen.mon[k] : !!V.seen.mon[k], M = MON[k];
  return `<button class="panel cx-mon ${seen?'':'unseen'} ${tag||''}" data-act="cxMon" data-v="${k}" ${seen?'':'disabled'}><span class="cx-art">${monsterIcon(k)}</span>${tag?`<span class="cx-tag">${tag==='boss'?'BOSS':'MINI'}</span>`:''}<b>${seen?esc(M.name):'???'}</b><small>${seen?`ปราบ ${V.kills[k]||0}`:'ยังไม่พบ'}</small></button>`;
}
/* v45: word details from the Vocabulary Database — every meaning, part of speech, difficulty, category, review status */
function vocabCardHtml(v, d){
  const g = VocabularyManager.getWord(v), S = VocabularyManager.SCHEMA;
  if(!g) return `<p class="cx-th">${esc((d||{}).th||'')}${(d||{}).bank?' ⭐':''}</p><p class="sub vc-st unk">Unknown Word · ยังไม่มีในคลังคำศัพท์</p>`;
  const r = g.record, tr = r.preferredTranslation ? [r.preferredTranslation] : r.translations;
  const list = r.translations.length > 1 && !r.preferredTranslation
    ? `<ol class="vc-tr">${r.translations.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>` : `<p class="cx-th">${esc(tr[0])}</p>`;
  const chips = [ g.target ? '⭐ คำเป้าหมาย' : '', ...(r.partOfSpeech||[]).map(p=>S.posTh[p] || p), r.difficulty ? `${S.difficulty[r.difficulty]} · ${S.difficultyTh[r.difficulty]}` : '', ...(r.category||[]).filter(c=>c!=='general').map(c=>S.categoryTh[c] || c) ].filter(Boolean);
  const st = g.official ? '<span class="vc-st ok">✔ ตรวจสอบแล้ว</span>' : g.pending ? '<span class="vc-st pend">⏳ แปลอัตโนมัติ · รอตรวจ</span>' : r.status==='deprecated' ? '<span class="vc-st">เลิกใช้</span>' : '<span class="vc-st">คลังคำของเกม · ยังไม่ได้ตรวจทาน</span>';
  return `${g.match==='form' ? `<p class="sub">รูปของคำว่า <b>${esc(g.base)}</b></p>` : ''}${list}
    ${chips.length?`<div class="vc-chips">${chips.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:''}
    ${r.pron||r.definition?`<p class="sub vc-def">${esc([r.pron, r.definition].filter(Boolean).join(' · '))}</p>`:''}${st}`;
}
(function(){ const st = document.createElement('style'); st.textContent = `
  .vc-tr{margin:4px auto 6px;padding:0;list-style:none;counter-reset:vc;display:grid;gap:2px;justify-items:center}
  .vc-tr li{counter-increment:vc;font-size:18px}.vc-tr li::before{content:counter(vc) '. ';opacity:.6}
  .vc-chips{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:6px 0}
  .vc-chips span{font-size:12px;padding:2px 8px;border-radius:999px;background:rgba(127,227,245,.12);border:1px solid rgba(127,227,245,.35)}
  .vc-def{margin:4px 0}.vc-st{display:inline-block;font-size:12px;opacity:.85;margin:2px 0 6px}.vc-st.ok{color:#7dff9a}.vc-st.pend{color:#ffd27a}.vc-st.unk{color:#ff9a9a}`;
  document.head.appendChild(st); })();
function traitTextGeneric(t){ return t==='weak' ? 'จุดอ่อนตัวอักษร: คำที่มีตัวอักษรจุดอ่อน (สุ่มแต่ละตัว) แรงขึ้น +50%' : traitText(t, { weak:'?' }); }
SCREENS.codex = { nav:'more', back:'more', render:renderCodex, key:()=>'', after:()=>{
  const q = $('#cxQ'); if(!q) return;
  q.value = ui.cxQ || ''; const run = ()=>{ const s = q.value.trim().toLowerCase(); ui.cxQ = q.value; document.querySelectorAll('.cx-w').forEach(b=>{ b.style.display = !s || b.dataset.s.includes(s) ? '' : 'none'; }); };
  q.addEventListener('input', run); if(q.value) run();
} };
Object.assign(ACTS2, {
  cxTab: v=>{ ui.cxTab = v; tabRender(); },
  cxSort: v=>{ ui.cxSort = v; render(); },
  cxWord: v=>{
    const d = (save.book||{})[v] || {}, m = masteryInfo(v), md = save.mastery[v]||{}, el = md.el || (()=>{ try{ const e = elementOf(v); return e && ELEMENTS[e] && ELEMENTS[e].god ? ELEMENTS[e].base : e; }catch(e){ return null; } })();
    const pct = m.lv>=5 ? 100 : Math.round(m.prog/5*100);
    modal(`<div class="cx-card"><span class="q2-kicker">WORD MASTERY</span><h3 class="cx-cw">${esc(v.toUpperCase())}</h3>${vocabCardHtml(v, d)}
      <div class="cx-tierline">${WTIERS.slice(1).map((t,i)=>`<span class="${wordTier(v)>=i+1?'on':''}" style="--wt:${t.c}">${t.k}</span>`).join('<i>›</i>')}</div>
      <div class="cx-mlv"><b>Level ${m.lv}</b><span>${m.lv>=5?'MAX':`อีก ${5-m.prog} ครั้งถึง Lv.${m.lv+1}`}</span></div>
      <div class="cx-blocks">${Array.from({length:10},(_,i)=>`<i class="${i<Math.round(pct/10)?'on':''}"></i>`).join('')}</div>
      <div class="cx-kv"><span>Uses</span><b>${md.n||d.n||0}</b><span>Best Combo</span><b>x${md.bc||0}</b><span>Element</span><b>${el && ELEMENTS[el] ? `${ELEM_ICON[el]} ${ELEMENTS[el].name}` : '—'}</b><span>ดาเมจโบนัส</span><b>+${(m.lv-1)*4}%</b><span>ใช้กับบอส</span><b>${md.boss?'✔':'—'}</b><span>ใช้ใน Challenge</span><b>${md.ch?'✔':'—'}</b></div>
      <p class="sub cx-perf">Perfected: ใช้ 20 ครั้ง ${(md.n||0)>=20?'✔':''} · คอมโบ 5+ ${(md.bc||0)>=5?'✔':''} · ใช้กับบอส ${md.boss?'✔':''} · ใช้ใน Challenge/Nightmare ${md.ch?'✔':''}</p>
      <div class="btns"><button class="cbtn blue block" data-act="say" data-v="${esc(v)}">🔊 ฟังเสียง</button><button class="cbtn wood block" data-act="closeModal">ปิด</button></div></div>`, { dismiss:true });
  },
  cxMon: v=>{
    const M = MON[v], V = V2(), li = monLoc(v); if(!M) return;
    modal(`<div class="cx-card"><span class="q2-kicker">${M.boss?'BOSS':M.mini?'MINI BOSS':'MONSTER'}</span><div class="cx-big">${monsterIcon(v)}</div><h3>${esc(M.name)}</h3><p class="cx-th">${esc(M.th)}</p>
      <div class="cx-kv"><span>พื้นที่</span><b>${li===null?'—':esc(LOCS[li].name)}</b><span>ปราบแล้ว</span><b>${V.kills[v]||0}</b></div>
      <div class="cx-traits">${M.traits.length ? M.traits.map(t=>`<div class="trait">${esc(traitTextGeneric(t))}</div>`).join('') : '<div class="trait none">ไม่มีความสามารถพิเศษ</div>'}${M.caster?'<div class="trait">ร่ายลูกไฟวิญญาณจากระยะไกล</div>':''}${M.boss?'<div class="trait charge">BOSS PHASE 2: เมื่อ HP เหลือครึ่งหนึ่ง จะแข็งแกร่งขึ้น</div>':''}</div>
      <div class="btns"><button class="cbtn wood block" data-act="closeModal">ปิด</button></div></div>`, { dismiss:true });
  },
});
