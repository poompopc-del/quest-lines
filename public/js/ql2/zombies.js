/* ==========================================================================
   QUEST LINES v47 — CHAPTER 2 ZOMBIES (Star Meadow)
   --------------------------------------------------------------------------
   Sprites: Plants vs. Zombies (J2ME) sheets supplied by the author
   (enemies/pvz/*). Presentation only — the monster KEYS stay the same, so
   saves, kill counts and quests keep working:
     goblin → Basic Zombie        (weak letter)
     shroom → Conehead Zombie     (armor3 · the cone dents as it takes damage)
     wolf   → Buckethead Zombie   (armor4 · the bucket dents as it takes damage)
     treant → Gargantuar          mini boss (heavy · armor4) — winds up, then smashes
     ogre   → Dr. Zomboss         chapter boss (heavy · armor3) — the Zombot:
                                  claw swipe, raised-claw charge, slam, collapse
   Sheets are regular grids (cols × rows). Every sprite knows where its feet
   are (ax, by) so all rows stand on the floor. Animations:
     idle loop · walk (while stepping into place) · attack · charge (held) ·
     heavy · death (held) · damage states (cone / bucket)
   ========================================================================== */
(function(){
  /* ------------------------------ sheets ------------------------------ */
  const row = (r, n, cols) => Array.from({ length:n }, (_, i) => r*(cols||10) + i);
  const Z = { cols:10, rows:6, fw:51, fh:59, ax:36, by:50, topPx:5, pixel:true, rate:.14,
    idle:row(0,10), walk:row(1,10), atk:row(2,10), dead:row(3,10), atkMs:62, deadMs:120, deadMax:1300 };
  const Zc = Object.assign({}, Z, { fw:52, fh:75, by:63, topPx:7 });
  Object.assign(SPRITES, {
    zbasic:  Object.assign({}, Z,  { img:'enemies/pvz/basic.png', col:'#9ab07a' }),
    zcone:   Object.assign({}, Zc, { img:'enemies/pvz/cone_1.png', states:['enemies/pvz/cone_1.png','enemies/pvz/cone_2.png','enemies/pvz/cone_3.png'], col:'#ff9a2a' }),
    zbucket: Object.assign({}, Zc, { img:'enemies/pvz/bucket_1.png', states:['enemies/pvz/bucket_1.png','enemies/pvz/bucket_2.png','enemies/pvz/bucket_3.png'], topPx:10, col:'#a8b4c0' }),
    // Gargantuar: 0-9 idle · 10-18 walk · 19-21 pole raised · 22-29 smash · 40-48 falls
    garg: { img:'enemies/pvz/garg.png', cols:10, rows:5, fw:126.8, fh:127.6, ax:80.5, by:99, topPx:22, pixel:true, rate:.13, col:'#8a9a6a',
      idle:row(0,10), walk:row(1,9), atk:[19,20,21,22,23,24,25,26,27], charge:[18,19,20,21], heavy:[21,22,23,24,25,26,27,28,29],
      dead:[40,41,42,43,44,45,46,47,48], atkMs:80, deadMs:130, deadMax:1400, lift:{ 46:-24, 47:-24, 48:-24 },   // the fallen body is drawn 24px low on the sheet
      heavyTxt:'💥 GARGANTUAR SMASH!', chargeTxt:'⚠ การ์แกนทัวร์ยกเสาไฟฟ้า… เทิร์นหน้าทุบหนัก!' },
    // Dr. Zomboss — v58: HEAD ONLY (no Zombot legs). The big Zombot head with Zomboss riding it:
    // idle bob, bite / slam lunges, and the head layer: comes down, eye yellow = fireball / blue = iceball, spits, rises.
    // "Up" (out of reach) = the whole head floats higher (CSS .zb-only.up), "down" = it drops to the ground.
    zomboss: { img:'enemies/pvz/zomboss.png', cols:10, rows:8, fw:186, fh:247, ax:62, by:232, topPx:92, pixel:false, rate:.2, col:'#c0584a', headOnly:true, hx:44, cut:86,
      idle:[57,58,59,58], bite:[68,69,70,70,69,68], slam:[54,55,56,60,60,56,55],
      dead:[60,59,58,57], deadMs:160, deadMax:1300,
      head:{ down:[54,55,56,57,58,59,60], fire:[61,62,63], ice:[64,65,66,67], spit:[68,69,70], up:[71,72] }, icon:[-2, 88, 88, 150] },
  });
  Object.values(SPRITES).forEach(P => { if(P.cols) P.cells = P.cols*P.rows; });

  /* ------------------------------ monsters ------------------------------ */
  const SKINS = {
    goblin: { sp:'zbasic',  name:'Basic Zombie',      th:'ซอมบี้ธรรมดา',        scale:3.2, traits:['weak'] },
    shroom: { sp:'zcone',   name:'Conehead Zombie',   th:'ซอมบี้หัวกรวย',        scale:3.2, traits:['armor3'] },
    wolf:   { sp:'zbucket', name:'Buckethead Zombie', th:'ซอมบี้หัวถัง',         scale:3.2, traits:['armor4'] },
    treant: { sp:'garg',    name:'Gargantuar',        th:'การ์แกนทัวร์ ยักษ์ซอมบี้', scale:2.35, traits:['heavy','armor4'] },
    ogre:   { sp:'zomboss', name:'Dr. Zomboss',       th:'ดร.ซอมบอส & ซอมบอท',  scale:2.0, traits:['armor3'] },   // 'heavy' is switched on only for the head-down cycle
  };
  Object.entries(SKINS).forEach(([k, S]) => { const M = MON[k], P = SPRITES[S.sp]; if(!M) return;
    Object.assign(M, { name:S.name, th:S.th, sprite:S.sp, spScale:S.scale, sc:1, h:Math.round((P.by - P.topPx)*S.scale), traits:S.traits.slice(), caster:false, pal:{ a:P.col, b:P.col, c:P.col } }); });
  try{ CHAPTERS[1].pool = ['goblin','shroom','wolf']; }catch(e){}


  /* ------------------------------ drawing (grid sheets) ------------------------------ */
  const cellX = (K, c) => -(c % K.cols) * K.fw, cellY = (K, c) => -Math.floor(c / K.cols) * K.fh;
  const stateImg = (K, e) => { if(!K.states || !e) return K.img; const p = e.maxHp ? Math.max(0, e.hp) / e.maxHp : 1; return K.states[p > .66 ? 0 : p > .33 ? 1 : 2]; };
  const layer = (K, cls, sc, cells, href, rate, extra) => {
    const w = K.fw*sc, h = K.fh*sc, x0 = -K.ax*sc, y0 = -K.by*sc, c0 = cells[0];
    const anim = save.settings.anim===false || cells.length<2 ? '' : `<animate attributeName="x" values="${cells.map(c => cellX(K, c)).join(';')}" dur="${(rate*cells.length).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;
    return `<svg class="${cls}" x="${x0}" y="${y0}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden" ${extra||''}><image class="spr-sheet" href="${href}" width="${K.fw*K.cols}" height="${K.fh*K.rows}" x="${cellX(K, c0)}" y="${cellY(K, c0)}">${anim}</image></svg>`;
  };
  const _spriteSVG = spriteSVG;
  spriteSVG = function(e, queued){
    const K = spriteOf(e); if(!K || !K.cols) return _spriteSVG.apply(this, arguments);
    const sc = MON[e.key].spScale || SPRITE_SCALE, href = stateImg(K, e);
    const top = -(K.by - K.topPx)*sc;
    const col = e.boss ? '#d9452f' : e.mini ? '#f2b42c' : K.col;
    const crown = e.mini ? `<path d="M-14,8 L-16,-4 L-9,2 L-4,-8 L1,2 L8,-4 L6,8 Z" fill="#f2b42c" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` : '';
    const bar = queued ? '' : `<g class="ehp" transform="translate(-40,${top-22})"><rect width="80" height="12" rx="6" fill="#12100d" stroke="${OL}" stroke-width="3"/><rect class="ehpfill" x="2" y="2" width="76" height="8" rx="4" fill="${col}"/>${crown}</g>`;
    const w = K.fw*sc, ring = (e.mini || e.boss) && !queued ? `<ellipse class="elite-ring" cx="0" cy="2" rx="${Math.min(w*.4, 90)}" ry="12" fill="none" stroke="${e.boss?'#ff6a4a':'#f2b42c'}" stroke-width="4" opacity=".8"/>` : '';
    return `<g class="enemy spr-enemy spr-grid ${K.walk?'has-walk':''} ${K.pixel?'spr-pixel':''} ${queued?'queued':''} ${e.golden?'golden':''}" data-spr="${esc(MON[e.key].sprite)}">${ring}<ellipse cx="0" cy="2" rx="${Math.min(w*.3, 70)}" ry="7" fill="#000" opacity=".28"/>
      ${layer(K, 'spr-idle', sc, K.idle, href, K.rate||.2)}${K.walk ? layer(K, 'spr-walk', sc, K.walk, href, K.rate||.2) : ''}${layer(K, 'spr-pose', sc, [K.idle[0]], href, 1, 'visibility="hidden"')}${K.head ? layer(K, 'zb-head', sc, [K.head.down[0]], href, 1, 'visibility="hidden"') : ''}${bar}${e.golden&&!queued?`<text class="golden-tag" x="-35" y="${top-30}">★ GOLDEN ★</text>`:''}</g>`;
  };
  const _icon = monsterIcon;
  monsterIcon = function(key){
    const K = spriteOf({ key }); if(!K || !K.cols) return _icon.apply(this, arguments);
    const c = K.idle[0], m = K.fw*.08;
    // clip to the one cell, so neighbouring frames never show in wide / tall icon boxes
    const [vx, vy, vw, vh] = K.icon || [m, K.topPx - 2, K.fw - 2*m, K.by - K.topPx + 6], id = 'zc-' + key;
    return `<svg viewBox="${vx} ${vy} ${vw} ${vh}" class="spr-icon ${K.pixel?'spr-pixel':''}" aria-hidden="true"><defs><clipPath id="${id}"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}"/></clipPath></defs><g clip-path="url(#${id})">${K.headOnly && window.ZB_FADE ? ZB_FADE('zbFadeI') : ''}<image href="${K.img}" width="${K.fw*K.cols}" height="${K.fh*K.rows}" x="${cellX(K, c)}" y="${cellY(K, c)}" ${K.headOnly ? 'mask="url(#zbFadeI)"' : ''}/>${K.iconHead!==undefined ? `<image href="${K.img}" width="${K.fw*K.cols}" height="${K.fh*K.rows}" x="${cellX(K, K.iconHead)}" y="${cellY(K, K.iconHead)}"/>` : ''}</g></svg>`;
  };
  // play cells on the pose layer (x + y for grid sheets); death cells may sit a little higher (deadDy)
  const _pose = spritePose;
  spritePose = function(e, cells, frameMs, hold){
    const K = spriteOf(e); if(!K || !K.cols) return _pose.apply(this, arguments);
    const g = document.querySelector('#enemyG .spr-enemy'); if(!g || !cells || !cells.length) return 0;
    const idle = g.querySelector('.spr-idle'), pose = g.querySelector('.spr-pose'); if(!idle || !pose) return 0;
    const img = pose.querySelector('image'), sc = MON[e.key].spScale || SPRITE_SCALE; let k = 0;
    clearInterval(g._poseI); clearTimeout(g._poseT);
    const show = () => { const c = cells[Math.min(k, cells.length-1)]; img.setAttribute('x', cellX(K, c)); img.setAttribute('y', cellY(K, c));
      pose.setAttribute('y', -K.by*sc + ((K.lift && K.lift[c]) || 0)*sc); };   // lift: per-cell floor correction
    show(); pose.setAttribute('visibility', 'visible'); idle.setAttribute('visibility', 'hidden');
    if(cells.length>1) g._poseI = setInterval(() => { k++; if(k>=cells.length){ clearInterval(g._poseI); return; } show(); }, frameMs);
    const total = frameMs*cells.length + (hold ? 0 : 160);
    if(!hold) g._poseT = setTimeout(() => { pose.setAttribute('visibility', 'hidden'); idle.setAttribute('visibility', 'visible'); }, total);
    return total;
  };
  // cone / bucket dent as the zombie loses HP
  const syncState = () => { const e = curEnemy(), K = spriteOf(e); if(!K || !K.states) return;
    const href = stateImg(K, e); document.querySelectorAll('#enemyG .spr-enemy image.spr-sheet').forEach(im => { if(im.getAttribute('href')!==href) im.setAttribute('href', href); }); };
  updateEnemyHp = (f => function(){ const r = f.apply(this, arguments); try{ syncState(); }catch(err){} return r; })(updateEnemyHp);

  /* ------------------------------ timing hooks ------------------------------ */
  // attack: grid sprites use their own frame speed (the lunge lasts ~0.6 s) and heavy texts
  enemyAttackAnim = (f => async function(){
    const e = curEnemy(), K = spriteOf(e);
    if(!K || !K.cols || !K.atk) return f.apply(this, arguments);
    const heavy = e.traits.includes('heavy'), cells = heavy && K.heavy ? K.heavy : K.atk;
    spritePose(e, cells, K.atkMs || 70);
    if(heavy) floatText(K.heavyTxt || '💥 CRUSHING BLOW!', EN_X-30, FLOOR_Y-e.h*e.sc-40, '#ffb0a0', 26, true);
    return f.apply(this, arguments);
  })(enemyAttackAnim);
  // the charge turn holds the wind-up pose until the hit lands
  enemyCharge = (f => async function(){
    const e = curEnemy(), K = spriteOf(e);
    if(!K || !K.cols || !K.charge) return f.apply(this, arguments);
    spritePose(e, K.charge, 110, true);
    floatText(K.chargeTxt || '⚠ กำลังชาร์จ…', EN_X-20, FLOOR_Y-e.h*e.sc-40, '#bff6ff', 20);
    return f.apply(this, arguments);
  })(enemyCharge);
  // death: the whole fall plays before the engine removes the body
  enemyDies = (f => async function(){
    const e = curEnemy(), K = spriteOf(e);
    if(K && K.cols && K.dead && ui.bat && !ui.bat.over && !e._sprDead){
      e._sprDead = true; const t = spritePose(e, K.dead, K.deadMs || 130, true);
      if(e.boss) shake(true);
      await sleep(Math.min(K.deadMax || 900, t));
    }
    return f.apply(this, arguments);
  })(enemyDies);

  /* ------------------------------ walk / golden look ------------------------------ */
  const st = document.createElement('style');
  st.textContent = `
    .spr-grid .spr-walk{display:none}
    .spr-grid.has-walk.walk .spr-walk{display:inline}
    .spr-grid.has-walk.walk .spr-idle{display:none}
    .spr-grid.golden image{filter:sepia(1) saturate(3.2) hue-rotate(-12deg) brightness(1.12)}
    /* Dr. Zomboss head-only: floats up out of reach, drops down to fire */
    .zb-only .zb-lift{transition:transform .7s cubic-bezier(.3,.1,.25,1)}
    .zb-only.up .zb-lift{transform:translateY(-42px)}
    .zb-only.up .zb-bob{animation:zbBob 2.6s ease-in-out infinite}
    @keyframes zbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    .zb-only.zb-dying .zb-lift{transform:translateY(70px);opacity:0;transition:transform 1.1s ease-in,opacity .9s ease-in .35s;transform-box:fill-box;transform-origin:50% 100%}
    html.noanim .zb-only.up .zb-bob{animation:none}`;
  document.head.appendChild(st);

  /* ======================================================================
     DR. ZOMBOSS — the Zombot fight (cycles, like the original boss battle)
       (v58: head only — UP = the head floats high out of reach → chomp / headbutt)
       UP   : head out of reach; words deal BALANCE.ZOMBOSS.upDmg
       DOWN : the head comes down, the eye glows yellow (fireball) or blue
              (iceball) — next turn it fires, then the head stays low one
              more turn. Words deal +50% while it is down.
              Counter: an ICE word melts nothing but stops the fireball,
              a FIRE word stops the iceball → the ball shatters, no damage.
     Numbers: BALANCE.ZOMBOSS. The engine's own 'heavy' trait (charge turn
     → ×2.2 hit) is switched on only for the head-down cycle.
     ====================================================================== */
  const ZB = BALANCE.ZOMBOSS;
  const isZB = e => !!(e && e.key==='ogre' && e.boss && MON.ogre.sprite==='zomboss');
  const zbOf = e => e.zb || (e.zb = { phase:'up', t:0, eye:null, shot:false, cancel:false, act:null });
  const setHeavy = (e, on) => { const i = e.traits.indexOf('heavy'); if(on && i<0) e.traits.push('heavy'); if(!on && i>=0) e.traits.splice(i, 1); };
  const baseEl = el => { const E = el && ELEMENTS[el]; return E && E.god ? E.base : el; };
  // tougher boss everywhere it appears (story stage, tower floors, challenges)
  makeEnemy = (f => function(key, s, rng, boss, mini){
    const e = f.apply(this, arguments);
    if(key==='ogre' && boss && MON.ogre.sprite==='zomboss'){ e.hp = e.maxHp = Math.round(e.maxHp*ZB.hp); e.traits = e.traits.filter(t => t!=='heavy'); }
    return e;
  })(makeEnemy);

  /* ---------- head layer ---------- */
  const zbG = () => document.querySelector('#enemyG .spr-enemy');
  function headPlay(cells, ms, then){
    const e = curEnemy(), K = spriteOf(e), g = zbG(); if(!K || !K.head || !g) return 0;
    const hd = g.querySelector('.zb-head'); if(!hd) return 0;
    const img = hd.querySelector('image'); let k = 0;
    clearInterval(g._headI);
    const show = c => { img.setAttribute('x', cellX(K, c)); img.setAttribute('y', cellY(K, c)); };
    const idle = g.querySelector('.spr-idle');
    show(cells[0]); hd.setAttribute('visibility', 'visible'); if(idle) idle.setAttribute('visibility', 'hidden');
    g._headI = setInterval(() => { k++;
      if(k < cells.length){ show(cells[k]); return; }
      if(then==='hide'){ clearInterval(g._headI); hd.setAttribute('visibility', 'hidden'); if(idle) idle.setAttribute('visibility', 'visible'); return; }
      if(Array.isArray(then)){ cells = then; k = 0; show(cells[0]); return; }   // loop
      clearInterval(g._headI); }, ms);
    return ms*cells.length;
  }
  const headHold = e => { const K = spriteOf(e), z = zbOf(e); if(!K || !K.head) return; headPlay(K.head[z.eye==='ice'?'ice':'fire'], 150, K.head[z.eye==='ice'?'ice':'fire']); };
  // re-drawn markup (walking in, re-renders) keeps the head where it was
  const LIFT = 42;
  const ZB_FADE = id => `<defs><linearGradient id="${id}G" gradientUnits="userSpaceOnUse" x1="67" y1="0" x2="86" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="186" height="247"><rect width="186" height="247" fill="url(#${id}G)"/></mask></defs>`;
  window.ZB_FADE = ZB_FADE;
  let zbDx = 0;
  function zbEdgeFit(){
    const e = curEnemy(), K = e && spriteOf(e), svg = document.getElementById('sceneSvg');
    if(!K || !K.headOnly || !svg) return;
    const r = svg.getBoundingClientRect(); if(!r.width || !r.height) return;
    const vb = svg.viewBox && svg.viewBox.baseVal, vx = vb && vb.width ? vb.x : 0, vw = vb && vb.width ? vb.width : 800, vh = vb && vb.height ? vb.height : 400;
    const k = Math.max(r.width/vw, r.height/vh), x1 = vx + vw/2 + (r.width/k)/2;      // right edge of what is visible (the battle camera changes the viewBox)
    zbDx = Math.max(0, x1 + 12 - (EN_X + (K.cut - K.ax)*(MON[e.key].spScale||1)));
    document.querySelectorAll('#enemyG .zb-edge').forEach(g => g.setAttribute('transform', `translate(${zbDx.toFixed(1)},0)`));
  }
  addEventListener('resize', () => setTimeout(zbEdgeFit, 60));
  fitScene = (f => function(){ const r = f.apply(this, arguments); try{ zbEdgeFit(); }catch(e){} return r; })(fitScene);   // px the head floats up while out of reach
  const _svg = spriteSVG;
  spriteSVG = function(e, queued){ let out = _svg.apply(this, arguments);
    const K = spriteOf(e);
    if(K && K.headOnly && MON[e.key] && MON[e.key].sprite==='zomboss'){
      const up = !queued && (!e.zb || e.zb.phase==='up');
      const a = out.indexOf('<svg class="spr-idle"'), b = out.indexOf('<g class="ehp"');
      if(a > 0){ const end = b > a ? b : out.lastIndexOf('</g>');
        out = out.slice(0, a) + `<g class="zb-lift"><g class="zb-bob">` + out.slice(a, end) + `</g></g>` + out.slice(end); }
      // the sheet cuts the neck off at the right: push that side against the screen edge, so the
      // Zombot head looks like it is thrusting in from off-screen (hubless: zbEdgeFit sets the shift)
      out = out.replace(/(<g class="enemy[^>]*>)/, `$1<g class="zb-edge" transform="translate(${zbDx.toFixed(1)},0)">`);
      out = out.replace(/<\/g>\s*$/, '</g></g>');
      if(!queued) setTimeout(zbEdgeFit, 0);
      out = out.replace('class="enemy spr-enemy spr-grid', `class="enemy spr-enemy spr-grid zb-only${up ? ' up' : ''}`)
               .replace(/class="ehp" transform="translate\(-40,(-?[\d.]+)\)"/, (m, y) => `class="ehp" transform="translate(${((K.hx - K.ax)*(MON[e.key].spScale||1) - 40).toFixed(1)},${(+y - LIFT).toFixed(1)})"`);
    }
    if(!queued && isZB(e) && e.zb && e.zb.phase==='down') setTimeout(() => { if(curEnemy()===e && e.hp>0) headHold(e); }, 0);
    return out; };
  const setUp = on => { const g = zbG(); if(g) g.classList.toggle('up', !!on); };

  /* ---------- the ball ---------- */
  function zbBall(eye){
    const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return Promise.resolve();
    const K = spriteOf(e), sc = MON[e.key].spScale, fire = eye!=='ice';
    const x0 = EN_X + zbDx + (38 - K.ax)*sc, y0 = FLOOR_Y + (200 - K.by)*sc, r = 34;
    const g = svgEl('g', {});
    g.innerHTML = `<defs><radialGradient id="zbg${fire?'f':'i'}"><stop offset="0" stop-color="${fire?'#fff6b0':'#ffffff'}"/><stop offset=".45" stop-color="${fire?'#ffb020':'#8fe8ff'}"/><stop offset="1" stop-color="${fire?'#e0401a':'#2a8adf'}"/></radialGradient></defs>
      <circle r="${r+10}" fill="${fire?'#ff7a1a':'#9fe8ff'}" opacity=".35"/><circle r="${r}" fill="url(#zbg${fire?'f':'i'})" stroke="${fire?'#a0200a':'#1a5a9a'}" stroke-width="3"/>
      <path d="M-18,-8 Q0,-26 18,-8 M-20,10 Q0,-6 20,10" stroke="${fire?'#fff3a0':'#ffffff'}" stroke-width="4" fill="none" opacity=".8"/>`;
    fx.appendChild(g);
    // a trail of flames / frost left on the lane, like the rolling ball in the original
    const trail = setInterval(() => { const t = g.getAttribute('data-x'); if(!t) return;
      const p = svgEl('circle', { r:rint(8,16), fill: fire ? ['#ff5a1a','#ffb030','#ffe27a'][rint(0,2)] : ['#bff6ff','#8fe8ff','#ffffff'][rint(0,2)], opacity:.85 }); fx.appendChild(p);
      anim(p, [{ transform:tr(+t, FLOOR_Y-6)+' scale(1)', opacity:.85 },{ transform:tr(+t+rint(-6,6), FLOOR_Y-rint(30,60))+' scale(.2)', opacity:0 }], { duration:600, easing:'ease-out' }).then(() => p.remove()); }, 45);
    const t0 = performance.now(), dur = 620, x1 = HERO_X + 20, y1 = FLOOR_Y - r;
    return new Promise(res => { const step = now => { const k = Math.min(1, (now-t0)/dur), x = x0 + (x1-x0)*k, y = y0 + (y1-y0)*Math.min(1, k*2.2);
        g.setAttribute('data-x', x); g.setAttribute('transform', `translate(${x},${y}) rotate(${-k*720})`);
        if(k<1) requestAnimationFrame(step); else { clearInterval(trail); g.remove(); res(); } };
      requestAnimationFrame(step); });
  }
  function zbShatter(eye){
    const fx = $('#fx'), e = curEnemy(); if(!fx || !e) return;
    const K = spriteOf(e), sc = MON[e.key].spScale, x = EN_X + zbDx + (38 - K.ax)*sc - 40, y = FLOOR_Y + (200 - K.by)*sc;
    for(let i=0;i<14;i++){ const p = svgEl('circle', { r:rint(5,11), fill: eye==='ice' ? '#bff6ff' : '#ffb030' }); fx.appendChild(p);
      const a = Math.random()*Math.PI*2, d = rint(40,110); anim(p, [{ transform:tr(x,y), opacity:1 },{ transform:tr(x+Math.cos(a)*d, y+Math.sin(a)*d), opacity:0 }], { duration:600, easing:'ease-out' }).then(() => p.remove()); }
  }

  /* ---------- player damage: out of reach vs weak spot ---------- */
  evalWord = (f => function(){
    const r = f.apply(this, arguments), e = curEnemy();
    if(!r || r.state!=='ok' || !r.dmg || !isZB(e)) return r;
    const z = zbOf(e);
    if(z.phase==='up'){ r.dmg = Math.max(1, Math.round(r.dmg*ZB.upDmg)); r.notes.unshift(`🤖 หัวซอมบอสอยู่สูง — ดาเมจเหลือ ${BALANCE.pct(ZB.upDmg)}%`); }
    else dmgMod(r, 'burst', ZB.weakBonus, `🎯 WEAK SPOT! หัวลงมาแล้ว +${BALANCE.pct(ZB.weakBonus)}%`);
    const el = baseEl(r.el);
    if(z.phase==='down' && !z.shot && ((z.eye==='fire' && el==='ice') || (z.eye==='ice' && el==='fire'))){ r.zbCounter = true; dmgMod(r, 'bonus', ZB.counterBonus, z.eye==='fire' ? '❄ คำน้ำแข็งสกัดลูกไฟ!' : '🔥 คำไฟละลายลูกน้ำแข็ง!'); }
    return r;
  })(evalWord);
  doAttack = (f => async function(){
    const b = ui.bat, e = curEnemy();
    if(b && !b.busy && isZB(e)){ const r = evalWord(); if(r.state==='ok' && r.zbCounter){ const z = zbOf(e); z.cancel = true; } }
    return f.apply(this, arguments);
  })(doAttack);

  /* ---------- the boss turn ---------- */
  enemyTurn = (f => async function(){
    const b = ui.bat, e = curEnemy();
    if(!b || !isZB(e) || e.hp<=0) return f.apply(this, arguments);
    const z = zbOf(e), K = spriteOf(e);
    // the ball was stopped by a counter word → it shatters, the head stays down one more turn
    if(z.phase==='down' && !z.shot && e.charge && z.cancel){
      z.cancel = false; z.shot = true; e.charge = 0; setHeavy(e, false);
      zbShatter(z.eye); sfx.elem(z.eye==='ice' ? 'fire' : 'ice'); shake(false);
      floatText(z.eye==='ice' ? '🔥 ลูกน้ำแข็งแตก!' : '❄ ลูกไฟดับ!', EN_X-60, FLOOR_Y-e.h*e.sc-30, '#fff', 28, true);
      headPlay(K.head.spit, 110, K.head[z.eye==='ice'?'ice':'fire']);
      await sleep(900); endTurn(); return;
    }
    // after the shot the head floats back up out of reach
    if(z.phase==='down' && z.shot){
      z.phase = 'up'; z.shot = false; z.eye = null; z.t = 0; setHeavy(e, false);
      headPlay(K.head.up, 110, 'hide'); setUp(true); floatText('🤖 ซอมบอสลอยหนีขึ้นไป!', EN_X-40, FLOOR_Y-e.h*e.sc-30, '#ffd0c0', 22);
      await sleep(500);
    }
    if(z.phase==='up'){
      z.t++;
      if(z.t > (e.phase2 ? ZB.upTurnsRage : ZB.upTurns)){
        // lower the head: this turn = the engine's charge turn (enemyCharge below plays it)
        z.phase = 'down'; z.shot = false; z.cancel = false; z.eye = Math.random()<.5 ? 'fire' : 'ice'; setHeavy(e, true);
        return f.apply(this, arguments);
      }
      z.act = ['bite','slam'][(z.t-1) % 2];
      const mul = z.act==='slam' ? ZB.crushAtk : 1, a0 = e.atk; e.atk = Math.round(a0*mul);
      try{ return await f.apply(this, arguments); } finally { if(mul!==1) e.atk = Math.max(1, Math.round(e.atk/mul)); }
    }
    // head down, charged → fire the ball (or re-charge if a freeze / stun cost the charge)
    if(!e.charge) return f.apply(this, arguments);
    const mul = z.eye==='ice' ? ZB.iceAtk : 1, a0 = e.atk; e.atk = Math.round(a0*mul);
    const hp0 = b.hp;
    try{ await f.apply(this, arguments); } finally { if(mul!==1) e.atk = Math.max(1, Math.round(e.atk/mul)); }
    if(ui.bat!==b || b.over) return;
    if(!e.charge){ z.shot = true; setHeavy(e, false);
      if(z.eye==='ice' && b.hp < hp0){   // iceball: a few letters freeze into stone
        const free = b.tiles.map((t,i)=>i).filter(i=>!b.tiles[i].stone && !b.tiles[i].sel).sort(()=>Math.random()-.5).slice(0, ZB.iceStones);
        free.forEach(i=>{ b.tiles[i].stone = 2; b.tiles[i].gem = null; }); if(free.length){ sfx.stone(); renderTiles(); floatText(`❄ ตัวอักษรแข็งตัว ${free.length} ตัว`, HERO_X, FLOOR_Y-215, '#bff6ff', 20); }
      }
    }
  })(enemyTurn);
  // charge turn = the head comes down, eye telegraphs the ball
  enemyCharge = (f => async function(){
    const e = curEnemy();
    if(!isZB(e)) return f.apply(this, arguments);
    const z = zbOf(e), K = spriteOf(e);
    setUp(false);
    const t = headPlay(K.head.down, 95, K.head[z.eye==='ice'?'ice':'fire']);
    sfx.boss(); setTimeout(() => shake(true), t);
    floatText(z.eye==='ice' ? '❄ ตาสีฟ้า — ลูกน้ำแข็งกำลังมา! ใช้คำธาตุไฟสกัด' : '🔥 ตาสีเหลือง — ลูกไฟกำลังมา! ใช้คำธาตุน้ำแข็งสกัด', EN_X-70, FLOOR_Y-e.h*e.sc-40, z.eye==='ice' ? '#bff6ff' : '#ffd27a', 19);
    await sleep(t + 150);
    renderEnemyPanel();
  })(enemyCharge);
  // attacks: body moves while the head is up, the head spits the ball when it is down
  enemyAttackAnim = (f => async function(){
    const e = curEnemy();
    if(!isZB(e)) return f.apply(this, arguments);
    const z = zbOf(e), K = spriteOf(e);
    if(z.phase==='down'){
      headPlay(K.head.spit, 110, K.head[z.eye==='ice'?'ice':'fire']);
      floatText(z.eye==='ice' ? '❄ ICEBALL!' : '🔥 FIREBALL!', EN_X-60, FLOOR_Y-e.h*e.sc-40, z.eye==='ice' ? '#bff6ff' : '#ffb030', 28, true);
      sfx.elem(z.eye==='ice' ? 'ice' : 'fire');
      await sleep(260); await zbBall(z.eye); shake(true);
      return;
    }
    // the head swoops down from up high, strikes, and floats back out of reach
    const cells = K[z.act] || K.bite;
    setUp(false);
    const t = spritePose(e, cells, z.act==='slam' ? 90 : 80);
    const txt = { bite:'🤖 ZOMBOT CHOMP!', slam:'💥 ZOMBOT HEADBUTT!' }[z.act];
    if(txt) floatText(txt, EN_X-40, FLOOR_Y-e.h*e.sc-30, '#ffb0a0', 24, true);
    setTimeout(() => { if(curEnemy()===e && e.hp>0 && zbOf(e).phase==='up') setUp(true); }, Math.max(700, t));
    // no forward lunge: the head's cut side stays hidden against the screen edge
    if(z.act==='slam'){ await sleep(420); shake(true); await sleep(260); return; }
    await sleep(300); sfx.hit && sfx.hit(); shake(false); await sleep(260); return;
  })(enemyAttackAnim);
  // death: the head layer goes, the full collapse plays on the body layer
  enemyDies = (f => async function(){
    const e = curEnemy();
    if(isZB(e)){ const g = zbG(); if(g){ clearInterval(g._headI); const hd = g.querySelector('.zb-head'); if(hd) hd.setAttribute('visibility', 'hidden');
      g.classList.remove('up'); setTimeout(() => g.classList.add('zb-dying'), 450); } }
    return f.apply(this, arguments);
  })(enemyDies);
  // enemy panel says what to do right now
  renderEnemyPanel = (f => function(){
    const r = f.apply(this, arguments), e = curEnemy(), el = $('#enemyPanel');
    if(el && isZB(e) && e.hp>0){ const z = zbOf(e);
      const tip = z.phase==='up' ? `🤖 หัวอยู่สูง: คำทำดาเมจแค่ ${BALANCE.pct(ZB.upDmg)}% · อีก ${Math.max(0, (e.phase2 ? ZB.upTurnsRage : ZB.upTurns) - z.t + 1)} เทิร์นหัวจะลงมา`
        : z.shot ? `🎯 หัวยังค้างอยู่! ดาเมจ +${BALANCE.pct(ZB.weakBonus)}% — รีบโจมตี`
        : z.eye==='ice' ? `❄ ตาสีฟ้า: ลูกน้ำแข็งเทิร์นหน้า · ใช้คำธาตุไฟ 🔥 สกัด · ดาเมจ +${BALANCE.pct(ZB.weakBonus)}%`
        : `🔥 ตาสีเหลือง: ลูกไฟเทิร์นหน้า · ใช้คำธาตุน้ำแข็ง ❄ สกัด · ดาเมจ +${BALANCE.pct(ZB.weakBonus)}%`;
      el.insertAdjacentHTML('beforeend', `<div class="trait charge">${esc(tip)}</div>`); }
    return r;
  })(renderEnemyPanel);
  /* ------------------------------ story text ------------------------------ */
  try{
    LOCS[1].blurb = 'ทุ่งหญ้าใต้ท้องฟ้าเต็มดาวถูกกองทัพซอมบี้ของ ดร.ซอมบอส ยึดครอง การ์แกนทัวร์เฝ้าประตูโบราณของอาณาจักรที่สาบสูญ';
    const Q = id => QUESTS.find(q => q.id===id);
    const m2 = Q('m2'); if(m2){
      m2.desc = 'แผนที่ในรังของราชินีสไลม์วารีชี้ไปยังทุ่งดาว — แต่ทุ่งดาวถูกกองทัพซอมบี้ของ ดร.ซอมบอส บุกยึด! ฝ่าฝูงซอมบี้ ล้มการ์แกนทัวร์ แล้วพังหุ่นซอมบอทให้ได้';
      m2.objs = [O.kills(1,3), O.open(1), O.kill('treant',1,'ปราบมินิบอส Gargantuar'), O.kill('ogre',1,'ปราบบอส Dr. Zomboss')];
    }
    const sw = Q('s_wolf'); if(sw){ sw.title = 'ซอมบี้หัวถังบุกทุ่ง'; sw.desc = 'ซอมบี้หัวถังเดินเรียงแถวเข้ามาในทุ่งดาว ถังเหล็กบนหัวทำให้คำสั้นๆ แทบไม่ระคาย'; sw.objs = [O.kill('wolf',4,'ปราบ Buckethead Zombie 4 ตัว')]; }
    const sp = Q('s_plant'); if(sp){ sp.title = 'กรวยจราจรเกลื่อนทุ่ง'; sp.desc = 'ซอมบี้หัวกรวยยึดทางเดินในทุ่งดาว จัดการพวกมันก่อนที่ฝูงใหญ่จะตามมา'; sp.objs = [O.kill('shroom',3,'ปราบ Conehead Zombie 3 ตัว')]; }
    LORE.forEach(l => { const m = /^boss(\d)$/.exec(l.id); if(!m) return; const B = MON[CHAPTERS[+m[1]].boss]; l.t = `บันทึกการปราบ ${B.name}`; l.reqTxt = `ปราบ ${B.name}`; });
  }catch(e){ console.error(e); }
})();
