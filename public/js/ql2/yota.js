/* ==========================================================================
   LETTERⁿ v69 — YOTA (โยตะ) · ผู้กองทวงค่าเช่า สายลำแสง
   --------------------------------------------------------------------------
   Sprites: "Meshy AI · Detailed Smooth Boss Sprite Sheet" (supplied by the
   developer) — cut into heroes/yota/*.png (background removed, feet aligned).

   BEFORE THE FIGHT — every stage, after walking in she shoves her palm at the
     enemy and yells "ส่งค่าเช่าบ้านยัง!!!" (a shockwave rocks the enemy).
   CORE — the move depends on the word length (numbers: BALANCE.YOTA)
     3–4 letters   ฝ่ามือทวงหนี้      PALM ORB      blue orb from the palm
     5–6 letters   ลำแสงค่าเช่า       RENT BEAM     (+20%)
     7+ / CRIT     ไฮเปอร์บีมยึดบ้าน   HYPER BEAM    (+35%) — the beam pierces
                   the enemies waiting in line (they take 25%)
   PASSIVE — ดอกเบี้ยค้างจ่าย: every enemy turn the enemy survives it owes
     one more 📄 (max 5) · each 📄 = +6% on YOTA's hits · a beam (5+ letters)
     COLLECTS the rent: the 📄 are cleared and YOTA heals 3% max HP per 📄.
   ULTIMATE ⚔️ — GIGA RENT CANNON (ค่าเช่า! ค่าน้ำ! ค่าไฟ!!!)
   ULTIMATE (tactical) — หมายศาลยึดบ้าน: 📄 maxed, the enemy is stunned
     for a turn and its prepared move is interrupted.
   Starts as devOnly (dev mode only) until the developer releases her.
   ========================================================================== */
(function(){
  const YT = BALANCE.YOTA, pc = x => `+${BALANCE.pct(x)}%`, K = 'yota', SVGNS = 'http://www.w3.org/2000/svg';
  const S = 1.4;   // sprite scale — sized to stand beside Mia / ELON (also used for the hand / palm positions below)
  // v71: re-cut from "Meshy AI · sprite sheet (no grid lines)" — every pose is REGISTERED (frames
  // aligned to each other by image correlation) so nothing wobbles; idle re-ordered into one smooth breath
  HERO_SPRITE.yota = { dir:'heroes/yota/', ch:100, scale:S, face:'-24 -120 48 48',
    anims:{
      idle:   { n:12, cw:80,  ax:40, dur:1.8, loop:true },
      walk:   { n:12, cw:80,  ax:40, dur:1.0, loop:true, th:'เดิน' },
      hurt:   { n:12, cw:96,  ax:44, dur:.8 },
      dead:   { n:7,  cw:160, ax:60, dur:1.3 },
      push:   { n:9,  cw:100, ax:40, dur:.7,  th:'ส่งค่าเช่าบ้านยัง!!!' },
      palm:   { n:5,  cw:100, ax:40, dur:.45, th:'ฝ่ามือทวงหนี้' },
      charge: { n:6,  cw:100, ax:40, dur:.6,  th:'ชาร์จลำแสง' },
      fire:   { n:12, cw:100, ax:40, dur:1.0, loop:true, th:'ลำแสงค่าเช่า' },
      recover:{ n:15, cw:100, ax:40, dur:1.0, th:'ปัดฝุ่น' } },
    attacks:['palm','charge'], extra:['push','recover','walk'], demoOnly:true, finisher:'fire', finMin:99,
    finNote:`ท่าเปลี่ยนตามความยาวคำ: <b>3–4 ตัว</b> ฝ่ามือทวงหนี้ · <b>5–6 ตัว</b> ลำแสงค่าเช่า ${pc(YT.beam)} · <b>7 ตัวขึ้นไป / Critical</b> ไฮเปอร์บีมยึดบ้าน ${pc(YT.hyper)} ทะลุศัตรูที่รอคิว · ศัตรูรอดแต่ละเทิร์นค้างหนี้ 📄 เพิ่ม` };
  const HAND = { x: (73-40)*S, y: (97-45)*S };    // arm stretched (fire frames)
  const PALM = { x: (69-40)*S, y: (97-50)*S };    // the palm while charging / shoving
  // isolated effects from the sheet (square cells)
  const FXS = { orb:{ w:44, n:12 }, ring:{ w:60, n:5 }, dissolve:{ w:68, n:12 }, bits:{ w:68, n:12 } };
  Object.keys(FXS).forEach(k => { const i = new Image(); i.src = `heroes/yota/fx_${k}.png?v=${HERO_IMG_VER}`; });
  const sfxStrip = (k, o) => { const F = FXS[k]; try{ return window.QL_STRIP_FX ? QL_STRIP_FX(`heroes/yota/fx_${k}.png`, F.w, F.w, F.n, o) : null; }catch(e){ return null; } };
  // the same visibility rules the engine builds for its own sprite heroes (index.html sprCSS)
  (function(){
    const c = HERO_SPRITE[K]; let css = '';
    for(const [n,a] of Object.entries(c.anims)){
      css += `@keyframes spr-${K}-${n}{from{transform:translateX(0px)}to{transform:translateX(${-(a.loop?a.n:a.n-1)*a.cw}px)}}`;
      css += `.spr-demo .spr-${K} .spr-a-${n} .spr-strip{animation:spr-${K}-${n} ${a.dur}s steps(${a.loop?a.n:a.n+',jump-none'}) infinite}`;
    }
    const show = (sel, n) => `${sel} .spr-${K} .spr-a{display:none}${sel} .spr-${K} .spr-a-${n}{display:inline}`;
    css += `.spr-${K} .spr-a{display:none}.spr-${K} .spr-a-idle{display:inline}` + show('#heroA.walk','walk') + show('#heroA.hurt','hurt') + show('#heroA.dead','dead');
    [...c.attacks, ...c.extra, c.finisher].forEach(n => { css += show(`#heroA.pose-${n}`, n) + show(`.spr-demo.pose-${n}`, n); });
    css += `.spr.spr-yota image{image-rendering:auto}
      .yt-debt{display:inline-flex;align-items:center;gap:2px;margin-left:6px;padding:1px 7px;border-radius:10px;background:rgba(60,0,10,.6);color:#ffd6d6;font-weight:800;font-size:.82em;border:1px solid #ff5a6a}
      .yt-debt.max{background:linear-gradient(90deg,#ff3b4e,#ff9a3b);color:#fff;animation:ytPulse .7s ease-in-out infinite alternate}
      @keyframes ytPulse{to{transform:scale(1.08)}}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    Object.keys(c.anims).forEach(n => { const i = new Image(); i.src = `${c.dir}${n}.png?v=${HERO_IMG_VER}`; });
  })();
  try{ HERO_PORTRAIT.yota = { src:'heroes/yota/portrait.png', w:36, h:36, vb:'0 0 36 36' }; }catch(e){}

  CHARACTERS.push({ id:K, devOnly:true, name:'YOTA', th:'โยตะ ผู้กองทวงค่าเช่า', price:5500, role:'ลำแสง · ทวงหนี้', skill:'ลำแสงทวงค่าเช่า',
    desc:`ก่อนสู้ทุกด่านยื่นมือทวง "ส่งค่าเช่าบ้านยัง!!!" · 3–4 ตัว ฝ่ามือทวงหนี้ · 5–6 ตัว ลำแสงค่าเช่า ${pc(YT.beam)} · 7 ตัวขึ้นไปหรือ Critical ไฮเปอร์บีมยึดบ้าน ${pc(YT.hyper)} ทะลุศัตรูที่รอคิว ${BALANCE.pct(YT.pierce)}% · ดอกเบี้ยค้างจ่าย: ศัตรูรอดแต่ละเทิร์นค้างหนี้ 📄 +1 (สูงสุด ${YT.debtMax}) ใบละ ${pc(YT.debtPer)} · ลำแสง (5 ตัวขึ้นไป) เก็บค่าเช่า ล้างหนี้ + ฟื้น HP ${BALANCE.pct(YT.healPer)}% ต่อใบ`,
    hpMul:1.1, dmgTaken:1 });
  CHAR_TIP.yota = HAND.y;
  FIGHTER.yota = { c:'#3d8bff', atk:5, def:3, spd:2, diff:2 };
  HERO_EXTRA.yota = { el:'thunder', elNote:'พลังงาน — ลำแสงสีฟ้าจากฝ่ามือ ยิงทะลุทุกข้ออ้าง (ใช้คำธาตุได้ทุกชนิด)',
    ult:`ฝ่ามือทวงหนี้ → ลำแสงค่าเช่า ${pc(YT.beam)} → ไฮเปอร์บีมยึดบ้าน ${pc(YT.hyper)} (ทะลุคิว) · ดอกเบี้ยค้างจ่าย 📄 ${pc(YT.debtPer)}/ใบ · ⚔️ GIGA RENT CANNON · Ultimate แท็กติก: หมายศาลยึดบ้าน`,
    lore:'ผู้กองหญิงเหล็กแห่งกองทวงค่าเช่า ไม่มีมอนสเตอร์ตัวไหนค้างค่าเช่าเธอได้เกินหนึ่งเทิร์น — ทุกวันที่ห้าของเดือน เธอจะยื่นมือมาตรงหน้าคุณ…แล้วยิงลำแสงใส่' };
  try{
    const R = window.UNLOCK_REQ;
    if(window.HERO_UNLOCK && R) window.HERO_UNLOCK.yota = { tier:4, price:5500, reqs:[ R.clear(3) ], pick:2, opts:[ R.long(25), R.ult(10), R.flawless(3) ],
      quote:'"ส่งค่าเช่าบ้านยัง!!!" — YOTA มาเคาะประตูทีมแล้ว' };
  }catch(e){}
  try{ if(window.QL_TAC) QL_TAC.UTIL.yota = { ic:'📜', en:'EVICTION NOTICE', th:`หมายศาลยึดบ้าน: หนี้ 📄 เต็ม ${YT.debtMax} ใบ · ศัตรูมึนงง 1 เทิร์น · ขัดท่าที่เตรียมไว้` }; }catch(e){}
  try{ if(window.QL_ULTX) QL_ULTX.yota = { ic:'💸', en:'RENT DUE', th:'ถึงกำหนดชำระ', how:['เก็บค่าเช่าได้ 📄 3 ใบขึ้นไป <b>+30%</b>','ไฮเปอร์บีมยึดบ้าน <b>+10%</b>'] }; }catch(e){}

  const isYota = () => save.eq && save.eq.char===K;
  const moveOf = (len, crit) => crit || len >= YT.hyperLen ? 'hyper' : len >= YT.beamLen ? 'beam' : 'palm';
  const debtOf = e => Math.min(YT.debtMax, (e && e.ytDebt) || 0);
  const enY = e => FLOOR_Y - (e ? e.h*e.sc*.55 : 70);
  const isBossy = e => !!(e && (e.boss || e.mini || e.miniBoss));

  /* ------------------------------ tiny SVG helpers ------------------------------ */
  function el(tag, attrs, parent){
    const n = document.createElementNS(SVGNS, tag);
    for(const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || $('#fx')).appendChild(n); return n;
  }
  function tone2(a, b, d, type, vol, delay){ try{ slide(a, b, d, type||'sawtooth', vol||.08, delay||0); }catch(e){} }
  function zap(big){ try{ noise(big ? .5 : .25, big ? .22 : .14); tone2(big?180:320, big?1400:1100, big?.6:.3, 'square', .06); tone2(90, 60, big?.7:.35, 'sawtooth', .1, .05); }catch(e){} }
  // blue square sparks (the sheet's digital particles)
  function bits(x, y, n, spread, col){
    const fx = $('#fx'); if(!fx) return;
    for(let k=0;k<n;k++){
      const s = rint(3,8), r = el('rect', { x:-s/2, y:-s/2, width:s, height:s, fill: k%3 ? (col||'#6fd8ff') : '#ffffff' });
      const a = Math.random()*Math.PI*2, d = rint(20, spread||90);
      anim(r, [{transform:tr(x,y),opacity:1},{transform:tr(x+Math.cos(a)*d, y+Math.sin(a)*d*.7 - rint(0,40)),opacity:0}], { duration:rint(450,900), easing:'ease-out' }).then(()=>r.remove());
    }
  }
  function ringBurst(x, y, s, col){
    for(let k=0;k<3;k++){
      const c = el('ellipse', { rx:18, ry:30, fill:'none', stroke: k===1 ? '#fff' : (col||'#5fd0ff'), 'stroke-width': 5-k });
      anim(c, [{transform:tr(x,y)+' scale(.3)',opacity:1},{transform:tr(x,y)+` scale(${(2.2+k*.9)*(s||1)})`,opacity:0}], { duration:420+k*120, delay:k*60, easing:'ease-out' }).then(()=>c.remove());
    }
    const f = el('circle', { r:40, fill:'#bff3ff', opacity:.8 });
    anim(f, [{transform:tr(x,y)+' scale(.2)',opacity:.9},{transform:tr(x,y)+` scale(${1.6*(s||1)})`,opacity:0}], { duration:380, easing:'ease-out' }).then(()=>f.remove());
    bits(x, y, Math.round(12*(s||1)), 110*(s||1));
  }
  function screenFlash(col, ms, op){
    const r = el('rect', { x:-400, y:-300, width:1700, height:1100, fill:col||'#fff', opacity:0, 'pointer-events':'none' });
    anim(r, [{opacity:op||.75},{opacity:0}], { duration:ms||420, easing:'ease-out' }).then(()=>r.remove());
  }
  function dim(on, ms){
    let r = $('#ytDim');
    if(on){ if(!r){ r = el('rect', { id:'ytDim', x:-400, y:-300, width:1700, height:1100, fill:'#020a2a', opacity:0, 'pointer-events':'none' });
        // behind the fighters: only the scenery goes dark
        const act = $('#actors'); if(act && act.parentNode) act.parentNode.insertBefore(r, act); }
      anim(r, [{opacity:0},{opacity:.55}], { duration:ms||300, fill:'forwards' }); }
    else if(r){ anim(r, [{opacity:.55},{opacity:0}], { duration:ms||300, fill:'forwards' }).then(()=>r.remove()); }
  }
  // comic speech bubble above YOTA
  function bubble(text, ms, opts){
    opts = opts || {};
    const fx = $('#fx'); if(!fx) return Promise.resolve();
    const size = opts.size || 27;
    const g = el('g', { class:'yt-bubble' });
    const box = el('rect', { rx:16, ry:16, fill:'#fffdf4', stroke:'#2a1a10', 'stroke-width':4 }, g);
    const tail = el('path', { d:'M0,-12 L-30,10 L0,12 Z', fill:'#fffdf4', stroke:'#2a1a10', 'stroke-width':4, 'stroke-linejoin':'round' }, g);
    const t = el('text', { 'text-anchor':'middle', 'font-size':size, 'font-weight':800, fill:opts.col||'#e0102a', 'font-family':"Kanit, 'Mitr', sans-serif", y:size*.36, stroke:'#fff', 'stroke-width':3, 'paint-order':'stroke' }, g);
    t.textContent = text;
    let w = text.length * size * .55; try{ w = t.getComputedTextLength() || w; }catch(e){}
    const W = w + 34, H = size + 22;
    box.setAttribute('x', -W/2); box.setAttribute('y', -H/2); box.setAttribute('width', W); box.setAttribute('height', H);
    // sits beside her head, the tail points back at her mouth
    const x = opts.x || HERO_X + 30 + W/2, y = opts.y || FLOOR_Y - 112;
    tail.setAttribute('transform', `translate(${-W/2 + 6},4)`);
    g.appendChild(tail); g.appendChild(box); g.appendChild(t);   // tail behind the box
    g.insertBefore(tail, box);
    const shakeK = [];
    for(let k=0;k<8;k++) shakeK.push({ transform:tr(x + (k%2?4:-4), y + (k%3-1)*2), offset:.18 + k*.05 });
    return anim(g, [{transform:tr(x,y)+' scale(.2)',opacity:0},{transform:tr(x,y-8)+' scale(1.15)',opacity:1,offset:.08},{transform:tr(x,y),offset:.14},
      ...shakeK, {transform:tr(x,y),opacity:1,offset:.85},{transform:tr(x,y-24),opacity:0}], { duration:ms||1900, easing:'ease-out' }).then(()=>g.remove());
  }

  /* ------------------------------ the blue beam ------------------------------ */
  // x1,y = palm · x2 = where the beam ends · w = thickness · ms = how long it stays
  async function beam(x1, y, x2, w, ms, rings){
    const fx = $('#fx'); if(!fx) return;
    const L = Math.max(10, x2 - x1);
    const g = el('g', {});
    g.style.transform = tr(x1, y);
    const glow = el('rect', { x:0, y:-w*1.15, width:L, height:w*2.3, rx:w, fill:'#1f5bff', opacity:.35 }, g);
    const mid  = el('rect', { x:0, y:-w*.55, width:L, height:w*1.1, rx:w*.55, fill:'#4fc8ff', opacity:.9 }, g);
    const core = el('rect', { x:0, y:-w*.2, width:L, height:w*.4, rx:w*.2, fill:'#ffffff' }, g);
    const mouth = el('ellipse', { cx:0, cy:0, rx:w*.5, ry:w*1.2, fill:'#dff8ff', opacity:.9 }, g);
    [glow, mid, core].forEach(r => anim(r, [{transform:'scaleX(0)'},{transform:'scaleX(1)'}], { duration:Math.min(260, ms*.3), easing:'ease-out', fill:'forwards' }));
    // flicker
    anim(mid, [{opacity:.9},{opacity:.6},{opacity:1},{opacity:.7},{opacity:.95}], { duration:ms, easing:'linear' });
    anim(mouth, [{transform:'scale(.6)'},{transform:'scale(1.15)'},{transform:'scale(.85)'},{transform:'scale(1.1)'}], { duration:ms, easing:'linear' });
    // rings rushing down the beam (like the sheet)
    const N = rings || 3;
    for(let k=0;k<N;k++){
      const r = el('ellipse', { cx:0, cy:0, rx:w*.32, ry:w*1.35, fill:'none', stroke:'#c8f6ff', 'stroke-width':Math.max(3, w*.13) }, g);
      anim(r, [{transform:'translateX(0px) scale(.4)',opacity:0},{transform:`translateX(${L*.15}px) scale(1)`,opacity:1,offset:.15},{transform:`translateX(${L}px) scale(1.25)`,opacity:.2}],
        { duration:Math.max(380, ms*.75), delay:k*(ms*.6/N), easing:'ease-in', fill:'forwards' }).then(()=>r.remove());
    }
    // sparks shed along the beam
    const iv = setInterval(() => { for(let k=0;k<3;k++){ const s = rint(3,7), px = rint(0, L), r = el('rect', { x:-s/2, y:-s/2, width:s, height:s, fill:k%2?'#7fe0ff':'#fff' }, g);
      anim(r, [{transform:`translate(${px}px,${rint(-w,w)}px)`,opacity:1},{transform:`translate(${px+rint(-20,40)}px,${rint(-w*2.4,w*2.4)}px)`,opacity:0}], { duration:rint(300,600), easing:'ease-out' }).then(()=>r.remove()); } }, 60);
    await sleep(ms);
    clearInterval(iv);
    await anim(g, [{transform:tr(x1,y)+' scale(1,1)',opacity:1},{transform:tr(x1,y)+' scale(1,.05)',opacity:0}], { duration:220, easing:'ease-in' });
    g.remove();
  }
  function orbShot(x1, y1, x2, y2, s){
    const iv = setInterval(() => bits(x1 + (x2-x1)*Math.random(), y1 + (y2-y1)*Math.random(), 2, 30), 50);
    const o = sfxStrip('orb', { x:x1, y:y1, scale:1.6*s, loop:true, from:6, loopFrom:6, to:11, ms:45 });
    let g = o;
    if(!g){
      g = el('g', {});
      el('circle', { r:30*s, fill:'#1f5bff', opacity:.35 }, g);
      el('circle', { r:19*s, fill:'#4fc8ff' }, g);
      el('circle', { r:10*s, fill:'#fff' }, g);
    }
    return anim(g, [{transform:tr(x1,y1)},{transform:tr(x1+30,y1),offset:.15},{transform:tr(x2,y2)}], { duration:300, easing:'ease-in', fill:'forwards' })
      .then(() => { clearInterval(iv); o ? o._stop() : g.remove(); });
  }
  // a glowing orb grows in her palm (sheet VFX 01–09)
  function chargeOrb(x, y, ms, scale){
    const g = sfxStrip('orb', { x, y, scale:scale||1.6, from:0, to:8, ms:Math.max(30, Math.round(ms/9)) });
    return g;
  }
  // the palm gathers particles (charging)
  function gather(x, y, n, ms){
    for(let k=0;k<n;k++){
      const s = rint(3,7), r = el('rect', { x:-s/2, y:-s/2, width:s, height:s, fill:k%2?'#7fe0ff':'#fff' });
      const a = Math.random()*Math.PI*2, d = rint(90,190);
      anim(r, [{transform:tr(x+Math.cos(a)*d, y+Math.sin(a)*d),opacity:0},{transform:tr(x+Math.cos(a)*d*.5, y+Math.sin(a)*d*.5),opacity:1,offset:.5},{transform:tr(x,y),opacity:0}],
        { duration:ms||600, delay:rint(0, (ms||600)*.6), easing:'ease-in' }).then(()=>r.remove());
    }
  }

  /* ------------------------------ 📄 debt chip on the enemy panel ------------------------------ */
  renderEnemyPanel = (f => function(){
    const out = f.apply(this, arguments);
    try{
      const e = curEnemy(), p = $('#enemyPanel'), st = p && p.querySelector('.estats'), d = debtOf(e);
      if(isYota() && st && d > 0 && e.hp > 0) st.insertAdjacentHTML('beforeend', `<span class="yt-debt${d>=YT.debtMax?' max':''}">📄×${d} ${pc(d*YT.debtPer)}</span>`);
    }catch(err){}
    return out;
  })(renderEnemyPanel);

  /* ------------------------------ damage ------------------------------ */
  evalWord = (f => function(){
    const r = f.apply(this, arguments);
    if(!isYota() || !r || r.state!=='ok' || r.rude) return r;
    const mv = moveOf(VocabularyManager.wordLength(r.w), r.crit);
    if(mv==='beam') dmgMod(r, 'bonus', YT.beam, `🔷 ลำแสงค่าเช่า ${pc(YT.beam)}`);
    if(mv==='hyper') dmgMod(r, 'bonus', YT.hyper, `🏠 ไฮเปอร์บีมยึดบ้าน ${pc(YT.hyper)}`);
    const d = debtOf(curEnemy());
    if(d) dmgMod(r, 'bonus', d*YT.debtPer, `📄 ดอกเบี้ย ×${d} ${pc(d*YT.debtPer)}`);
    r.ytMove = mv; r.ytDebt = d;
    return r;
  })(evalWord);
  doAttack = (f => async function(){
    const b = ui.bat;
    if(!isYota() || !b || b.busy) return f.apply(this, arguments);
    const r = evalWord(), e = curEnemy();
    ui.ytHit = r && r.state==='ok' && e ? { mv: r.rude ? 'palm' : (r.ytMove || 'palm'), debt: r.rude ? 0 : (r.ytDebt||0), dmg: r.dmg, e } : null;
    if(ui.ytHit && ui.ytHit.mv==='hyper' && b.stage && b.stage.enemies){
      const q = [];
      for(let k=1;k<=YT.pierceN;k++){ const n = b.stage.enemies[b.idx+k]; if(n && n.hp>0) q.push(n); }
      ui.ytHit.queue = q; ui.ytHit.pierce = Math.max(1, Math.round(r.dmg*YT.pierce));
    }
    try{ return await f.apply(this, arguments); } finally { ui.ytHit = null; }
  })(doAttack);

  // a beam collects the rent: clear the 📄 and heal
  function collect(h){
    const b = ui.bat, e = h && h.e; if(!b || !e || !h.debt) return;
    const d = h.debt; e.ytDebt = 0;
    const heal = Math.round(b.max*YT.healPer*d);
    b.hp = Math.min(b.max, b.hp + heal);
    floatText(`💸 เก็บค่าเช่า ×${d}!`, HERO_X+10, FLOOR_Y-236, '#ffe14a', 24, true);
    floatText(`+${heal}`, HERO_X-30, FLOOR_Y-160, '#6ef08a', 26);
    for(let k=0;k<Math.min(10, d*2);k++) setTimeout(() => { try{ coinFly(EN_X - 20, enY(e), 0); }catch(err){} }, k*50);
    try{ sfx.coin(); sfx.coin(.12); }catch(err){}
    if(d >= 3) try{ QL_ULT_GAIN && QL_ULT_GAIN(1.5, '💸 ทวงครบ'); }catch(err){}
    try{ updateHud(); }catch(err){}
  }
  // the hyper beam punches through the queue
  function pierceQueue(h){
    if(!h || !h.queue || !h.queue.length) return;
    let n = 0;
    h.queue.forEach(q => { if(q.hp > 0){ q.hp -= h.pierce; if(q.hp < 1 && isBossy(q)) q.hp = 1; if(q.hp < 0) q.hp = 0; n++; } });
    if(n){ floatText(`🏠 ทะลุคิว ${h.pierce} ×${n}`, Q_X-30, FLOOR_Y-200, '#8fe6ff', 24, true); ringBurst(Q_X, FLOOR_Y-70, .9); }
  }

  /* ------------------------------ attacks ------------------------------ */
  heroAttack = (f => async function(lv, rude){
    if(!isYota() || !sprOf()) return f.apply(this, arguments);
    const h = ui.ytHit, e = curEnemy();
    const mv = h ? h.mv : (lv >= 5 && !rude ? 'giga' : 'beam');
    ui.slashLv = lv||0; ui.slashRude = !!rude;
    const hx = HERO_X + HAND.x, hy = FLOOR_Y - HAND.y, ty = enY(e);
    if(mv==='palm'){
      floatText(rude ? 'ฝ่ามือ…หยาบ!' : 'ฝ่ามือทวงหนี้!', HERO_X+40, FLOOR_Y-205, rude ? '#9dff4a' : '#cfe8ff', 22, true);
      heroPose('pose-palm', sprMs('palm', 450)+260);
      gather(HERO_X + PALM.x, FLOOR_Y - PALM.y, 8, 300);
      chargeOrb(HERO_X + PALM.x + 6, FLOOR_Y - PALM.y, 220, 1.3);
      await sleep(220); zap(false);
      await orbShot(HERO_X + PALM.x + 10, FLOOR_Y - PALM.y, EN_X - 30, ty, 1);
      ringBurst(EN_X - 20, ty, .9); shake();
      try{ hitSpark(EN_X-30, ty); }catch(err){}
      return;
    }
    if(mv==='beam'){
      floatText('ลำแสงค่าเช่า!!', HERO_X+40, FLOOR_Y-215, '#8fe6ff', 28, true);
      heroPose('pose-charge', 760);
      gather(HERO_X + PALM.x, FLOOR_Y - PALM.y, 14, 600);
      setTimeout(() => chargeOrb(HERO_X + PALM.x + 6, FLOOR_Y - PALM.y, 560, 1.7), 120);
      try{ sfx.power(); }catch(err){}
      await sleep(620);
      heroPose('pose-fire', 900);
      zap(false);
      const p = beam(hx, hy, EN_X + 40, 22, 620, 3);
      await sleep(230);
      ringBurst(EN_X - 10, hy + 10, 1.1); shake(); collect(h);
      await p;
      heroPose('pose-recover', sprMs('recover', 600)+40);
      return;
    }
    // hyper / giga — the big one
    const giga = mv==='giga';
    dim(true, 260);
    floatText(giga ? 'GIGA RENT CANNON!!!' : 'ไฮเปอร์บีมยึดบ้าน!!!', HERO_X+70, FLOOR_Y-250, giga ? '#ffe14a' : '#8fe6ff', giga ? 34 : 32, true);
    if(!giga) floatText('HYPER EVICTION BEAM', HERO_X+70, FLOOR_Y-215, '#cfe8ff', 16, true);
    heroPose('pose-charge', 1300);
    gather(HERO_X + PALM.x, FLOOR_Y - PALM.y, giga ? 40 : 26, 900);
    setTimeout(() => chargeOrb(HERO_X + PALM.x + 8, FLOOR_Y - PALM.y, 950, giga ? 3 : 2.4), 80);
    try{ sfx.power(); tone2(120, 900, 1, 'sawtooth', .06); }catch(err){}
    if(giga){ ['ค่าเช่า!','ค่าน้ำ!','ค่าไฟ!!!'].forEach((t,i) => setTimeout(() => floatText(t, HERO_X - 40 + i*95, FLOOR_Y - 170 - i*14, ['#ff8a8a','#8fd8ff','#ffe14a'][i], 26, true), 220 + i*260)); }
    await sleep(1050);
    heroPose('pose-fire', giga ? 1500 : 1250);
    screenFlash('#e8fbff', 380, .8); zap(true); shake(true);
    const W = giga ? 64 : 44, p = beam(hx, hy, 980, W, giga ? 1250 : 1000, giga ? 7 : 5);
    await sleep(200);
    ringBurst(EN_X - 10, hy + 10, giga ? 1.8 : 1.4); shake(true);
    if(h){ collect(h); pierceQueue(h); }
    setTimeout(() => { ringBurst(EN_X + 20, hy - 20, 1.2); shake(true); }, giga ? 380 : 320);
    if(giga) setTimeout(() => { ringBurst(EN_X - 30, hy + 30, 1.5); shake(true); screenFlash('#bff3ff', 300, .5); }, 760);
    await p;
    dim(false, 300);
    heroPose('pose-recover', sprMs('recover', 600)+40);
    try{ if(!giga && QL_ULT_GAIN) QL_ULT_GAIN(.5, '🏠 ยึดบ้าน'); }catch(err){}
  })(heroAttack);

  /* ------------------------------ 📄 interest after every enemy turn ------------------------------ */
  enemyTurn = (f => async function(){
    const b = ui.bat, e = curEnemy();
    const out = await f.apply(this, arguments);
    try{
      if(isYota() && b && ui.bat===b && !b.over && e && curEnemy()===e && e.hp > 0){
        const d0 = debtOf(e);
        if(d0 < YT.debtMax){ e.ytDebt = d0 + 1;
          floatText(`📄 ดอกเบี้ย +1 (×${e.ytDebt})`, EN_X, FLOOR_Y - e.h*e.sc - 40, e.ytDebt >= YT.debtMax ? '#ff7a7a' : '#ffd6d6', 18);
          renderEnemyPanel(); }
      }
    }catch(err){}
    return out;
  })(enemyTurn);

  /* ------------------------------ tactical Ultimate: EVICTION NOTICE ------------------------------ */
  if(typeof window.tacUltUtil==='function'){
    window.tacUltUtil = (f => async function(b, e){
      if(!isYota()) return f.apply(this, arguments);
      floatText('📜 หมายศาลยึดบ้าน!', HERO_X+40, FLOOR_Y-235, '#ffe14a', 30, true);
      heroPose('pose-push', sprMs('push', 700)+500);
      try{ sfx.power(); }catch(err){}
      // the notice flies over and gets STAMPED
      const g = el('g', {});
      el('rect', { x:-34, y:-44, width:68, height:88, rx:4, fill:'#fffdf2', stroke:'#2a1a10', 'stroke-width':3 }, g);
      for(let k=0;k<5;k++) el('rect', { x:-24, y:-30+k*12, width:k===0?48:36-(k%2)*10, height:4, fill:'#b9ab90' }, g);
      const ty = enY(e);
      await anim(g, [{transform:tr(HERO_X+60, FLOOR_Y-120)+' rotate(-30deg) scale(.4)'},{transform:tr(EN_X, ty-30)+' rotate(8deg) scale(1.1)'}], { duration:520, easing:'ease-out', fill:'forwards' });
      const stamp = el('g', {}, g);
      el('rect', { x:-30, y:-14, width:60, height:28, rx:5, fill:'none', stroke:'#e0102a', 'stroke-width':4 }, stamp);
      const t = el('text', { 'text-anchor':'middle', y:8, 'font-size':20, 'font-weight':800, fill:'#e0102a', 'font-family':"Kanit, sans-serif" }, stamp); t.textContent = 'ยึด!';
      anim(stamp, [{transform:'rotate(-14deg) scale(3)',opacity:0},{transform:'rotate(-14deg) scale(1)',opacity:1}], { duration:180, easing:'ease-in', fill:'forwards' });
      await sleep(170); shake(true); try{ sfx.stone(); }catch(err){}
      e.ytDebt = YT.debtMax; e.stun = true;
      if(e.intent && e.intent.k!=='atk'){ if(e.intent.k==='cast2') e.tacCast = false; e.intent = { k:'stagger' }; floatText('⛔ INTERRUPT!', EN_X, FLOOR_Y - e.h*e.sc - 80, '#ffe14a', 26, true); }
      floatText(`💫 มึนงง · 📄×${YT.debtMax}`, EN_X, FLOOR_Y - e.h*e.sc - 40, '#fff', 24, true);
      setTimeout(() => anim(g, [{opacity:1},{opacity:0}], { duration:300 }).then(()=>g.remove()), 500);
      updateHud(); renderEnemyPanel(); persist();
      await sleep(900);
      await enemyTurn();
    })(window.tacUltUtil);
  }

  /* ------------------------------ BEFORE THE FIGHT: "ส่งค่าเช่าบ้านยัง!!!" ------------------------------ */
  async function rentDemand(){
    const e = curEnemy(), D = sprMs('push', 700);
    heroPose('pose-push', D + 1400);
    try{ tone2(260, 520, .18, 'square', .05); }catch(err){}
    await sleep(Math.round(D*.55));
    // the shove: shockwave rings roll from the palm to the enemy
    const hx = HERO_X + HAND.x, hy = FLOOR_Y - HAND.y;
    for(let k=0;k<3;k++){
      const r = el('ellipse', { rx:12, ry:34, fill:'none', stroke:k===1?'#fff':'#8fd8ff', 'stroke-width':4 });
      anim(r, [{transform:tr(hx,hy)+' scale(.5)',opacity:.95},{transform:tr(EN_X-40,hy)+' scale(1.6)',opacity:0}], { duration:520, delay:k*110, easing:'ease-out' }).then(()=>r.remove());
    }
    bits(hx, hy, 10, 60);
    try{ noise(.3, .16); tone2(500, 160, .3, 'sawtooth', .07); }catch(err){}
    const p = bubble('ส่งค่าเช่าบ้านยัง!!!', 2000);
    shake();
    await sleep(380);
    const eg = $('#enemyG');
    if(eg) anim(eg, [{transform:tr(EN_X,FLOOR_Y)},{transform:tr(EN_X+22,FLOOR_Y)},{transform:tr(EN_X+16,FLOOR_Y),offset:.6},{transform:tr(EN_X,FLOOR_Y)}], { duration:520, easing:'ease-out' });
    if(e) floatText(e.boss ? '!!?' : '!?', EN_X+10, FLOOR_Y - e.h*e.sc - 30, '#ffe14a', 34, true);
    await p;
  }
  intro = (f => async function(){
    if(!isYota()) return f.apply(this, arguments);
    const out = await f.apply(this, arguments);   // walk in · banner · b.busy = false
    const b = ui.bat;
    if(!b || b.over || !curEnemy()) return out;
    b.busy = true;
    try{ await rentDemand(); }catch(err){ console.error('yota', err); }
    if(ui.bat===b && !b.over){ b.busy = false; try{ renderTray(); }catch(err){} }
    return out;
  })(intro);

  // stage clear: "see you next month"
  stageClear = (f => async function(){
    if(isYota()){ heroPose('pose-push', sprMs('push', 700)+900); bubble('เดือนหน้าเจอกันใหม่!!', 1500, { col:'#1a5bd8', size:22 }); }
    return f.apply(this, arguments);
  })(stageClear);

  // defeat: she falls, then dissolves into blue pixels (the sheet's digital fade)
  heroDies = (f => async function(){
    const b = ui.bat;
    if(!isYota() || !b || b.over) return f.apply(this, arguments);
    b.over = true; b.busy = true;
    const a = $('#heroA');
    if(a){ a.classList.add('dead'); sprRestart('dead'); }
    try{ sfx.hurt(); }catch(err){}
    await sleep(sprMs('dead', 1500) + 150);
    const d = sfxStrip('dissolve', { x:HERO_X, y:FLOOR_Y + 8, anchor:'b', scale:2.6, ms:60 });
    setTimeout(() => sfxStrip('bits', { x:HERO_X, y:FLOOR_Y + 8, anchor:'b', scale:2.6, ms:70 }), 700);
    try{ tone2(900, 200, 1.1, 'triangle', .07); noise(.6, .08); }catch(err){}
    if(a) anim(a, [{opacity:1},{opacity:1,offset:.25},{opacity:0}], { duration:900, easing:'ease-in', fill:'forwards' });
    if(!d) bits(HERO_X, FLOOR_Y - 30, 26, 120);
    await sleep(1100);
    b.over = false;           // let the engine run its own defeat (sets it again)
    return f.apply(this, arguments);
  })(heroDies);

  window.QL_YOTA = { moveOf, rentDemand, beam };
})();
