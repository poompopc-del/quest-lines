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
    // Dr. Zomboss (built from the Zombot sheet: robot + claw arm composites, then its collapse)
    zomboss: { img:'enemies/pvz/zomboss.png', cols:10, rows:4, fw:160, fh:244, ax:72, by:232, topPx:2, pixel:false, rate:.5, col:'#c0584a',
      idle:[0,1], atk:[2,3,4,5,6,7,8,9,10,11], charge:[12], heavy:[12,13,14,15,16,17,18,19], dead:[20,21,22,23,24,25,26,27,28,29,30,31,32,33,34],
      atkMs:70, deadMs:120, deadMax:2000, heavyTxt:'🤖 ZOMBOT CLAW SLAM!', chargeTxt:'⚠ ซอมบอทง้างกรงเล็บ… เทิร์นหน้าแรงมาก!' },
  });
  Object.values(SPRITES).forEach(P => { if(P.cols) P.cells = P.cols*P.rows; });

  /* ------------------------------ monsters ------------------------------ */
  const SKINS = {
    goblin: { sp:'zbasic',  name:'Basic Zombie',      th:'ซอมบี้ธรรมดา',        scale:3.2, traits:['weak'] },
    shroom: { sp:'zcone',   name:'Conehead Zombie',   th:'ซอมบี้หัวกรวย',        scale:3.2, traits:['armor3'] },
    wolf:   { sp:'zbucket', name:'Buckethead Zombie', th:'ซอมบี้หัวถัง',         scale:3.2, traits:['armor4'] },
    treant: { sp:'garg',    name:'Gargantuar',        th:'การ์แกนทัวร์ ยักษ์ซอมบี้', scale:2.35, traits:['heavy','armor4'] },
    ogre:   { sp:'zomboss', name:'Dr. Zomboss',       th:'ดร.ซอมบอส & ซอมบอท',  scale:1.2, traits:['heavy','armor3'] },
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
      ${layer(K, 'spr-idle', sc, K.idle, href, K.rate||.2)}${K.walk ? layer(K, 'spr-walk', sc, K.walk, href, K.rate||.2) : ''}${layer(K, 'spr-pose', sc, [K.idle[0]], href, 1, 'visibility="hidden"')}${bar}${e.golden&&!queued?`<text class="golden-tag" x="-35" y="${top-30}">★ GOLDEN ★</text>`:''}</g>`;
  };
  const _icon = monsterIcon;
  monsterIcon = function(key){
    const K = spriteOf({ key }); if(!K || !K.cols) return _icon.apply(this, arguments);
    const c = K.idle[0], m = K.fw*.08;
    // clip to the one cell, so neighbouring frames never show in wide / tall icon boxes
    const vx = m, vy = K.topPx - 2, vw = K.fw - 2*m, vh = K.by - K.topPx + 6, id = 'zc-' + key;
    return `<svg viewBox="${vx} ${vy} ${vw} ${vh}" class="spr-icon ${K.pixel?'spr-pixel':''}" aria-hidden="true"><defs><clipPath id="${id}"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}"/></clipPath></defs><g clip-path="url(#${id})"><image href="${K.img}" width="${K.fw*K.cols}" height="${K.fh*K.rows}" x="${cellX(K, c)}" y="${cellY(K, c)}"/></g></svg>`;
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
    .spr-grid.golden image{filter:sepia(1) saturate(3.2) hue-rotate(-12deg) brightness(1.12)}`;
  document.head.appendChild(st);

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
