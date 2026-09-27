/* ==========================================================================
   QUEST LINES v28 — CHAPTER 1: SLIMES + THE AQUA SLIME BOSS (sprite enemies)
   --------------------------------------------------------------------------
   Presentation layer on the original battle engine — nothing is rewritten:
     · every Chapter-1 monster keeps its key, stats and traits (so saves,
       quests, codex and kill counts stay valid); only its look and name
       change to one of the slimes (3-frame idle strips in /enemies)
     · the Chapter-1 boss (key 'kingslime') is the Aqua Slime girl from a
       pixel sprite strip (bosses/aqua/boss.png: idle ×4 · attack · hurt)
     · stage 1-8 = slime → slime → boss, fought one at a time like every
       other stage. The boss is a normal single-bar boss, just very tough:
       see BOSS_TUNING below.
   ========================================================================== */

/* ------------------------------ sprite sheets ------------------------------ */
const SPRITES = {
  green: { img:'enemies/slime_green.png',  fw:69, fh:50, frames:3, col:'#7ed957' },
  blue:  { img:'enemies/slime_blue.png',   fw:74, fh:50, frames:3, col:'#6fb6ff' },
  yellow:{ img:'enemies/slime_yellow.png', fw:74, fh:50, frames:3, col:'#ffd24a' },
  devil: { img:'enemies/slime_devil.png',  fw:74, fh:50, frames:3, col:'#8a6aff' },
  orange:{ img:'enemies/slime_orange.png', fw:74, fh:50, frames:3, col:'#ff9a3a' },
  red:   { img:'enemies/slime_red.png',    fw:69, fh:50, frames:3, col:'#ff5a4a' },
  coke:  { img:'enemies/slime_coke.png',   fw:74, fh:50, frames:3, col:'#b87a4a' },
  golden:{ img:'enemies/slime_golden.png', fw:69, fh:50, frames:3, col:'#ffcf4a' },
  // the boss: cells 0-3 idle loop, 4 = attack (water burst), 5 = hurt (recoil). Pixel art → drawn pixelated.
  aqua:  { img:'bosses/aqua/boss.png', fw:100, fh:100, frames:4, col:'#4ad8f0', pixel:true, atk:4, hurt:5, fx:'bosses/aqua/wave.png' },
};
const SLIME_SKINS = {
  slime:     { sp:'green',  name:'Green Slime',   th:'สไลม์เขียว' },
  rat:       { sp:'yellow', name:'Street Slime',  th:'สไลม์ข้างทาง' },
  skel:      { sp:'blue',   name:'Bubble Slime',  th:'สไลม์ฟองน้ำ' },
  bat:       { sp:'red',    name:'Blood Slime',   th:'สไลม์โลหิต' },
  candle:    { sp:'devil',  name:'Shadow Slime',  th:'สไลม์เงา' },
  coinspider:{ sp:'coke',   name:'Choco Slime',   th:'สไลม์ช็อกโกแลต' },
  mimic:     { sp:'orange', name:'Pumpkin Slime', th:'สไลม์ฟักทองยักษ์', scale:2.6 },      // Chapter-1 mini boss (stages 1-1…1-7)
  kingslime: { sp:'aqua',   name:'Aqua Slime',    th:'ราชินีสไลม์วารี', scale:2.4 },       // Chapter-1 boss
};
const SPRITE_SCALE = 1.75;
Object.entries(SLIME_SKINS).forEach(([k,S])=>{ const M = MON[k]; if(!M) return; const sc = S.scale || SPRITE_SCALE, P = SPRITES[S.sp];
  Object.assign(M, { name:S.name, th:S.th, sprite:S.sp, spScale:sc, sc:1, h:Math.round(P.fh*sc*.8), pal:{ a:P.col, b:P.col, c:P.col } }); });
const spriteOf = e=>{ const M = e && MON[e.key]; return M && M.sprite ? SPRITES[e.golden ? 'golden' : M.sprite] : null; };

/* ------------------------------ the boss: very tough, hits very hard ------------------------------ */
// multipliers on the stage's normal boss stats; 'heavy' = charges one turn, then hits ×2.2 (the engine's own trait)
const BOSS_TUNING = { kingslime:{ ch:0, n:8, hp:2.6, atk:1.3, traits:['heavy','weak'] } };
buildStage = (f=>function(ch, n){
  const st = f.apply(this, arguments);
  const T = Object.entries(BOSS_TUNING).find(([k,t])=>t.ch===ch && t.n===n);
  if(!T) return st;
  const [key, t] = T, boss = st.enemies.find(e=>e.key===key);
  if(!boss) return st;
  boss.maxHp = boss.hp = Math.round(boss.maxHp*t.hp);
  boss.atk = Math.round(boss.atk*t.atk);
  boss.traits = t.traits.slice();
  // slime → slime → boss (the stage's mini boss is left out here)
  const rng = mulberry(hashStr('b8'+st.s)), C = CHAPTERS[ch];
  const normals = st.enemies.filter(e=>!e.boss && !e.mini);
  while(normals.length < 2){ const k = C.pool[Math.floor(rng()*C.pool.length)]; normals.push(makeEnemy(k==='slime' && normals[0] && normals[0].key==='slime' ? 'rat' : k, st.s, rng, false)); }
  st.enemies = [ ...normals.slice(0,2), boss ];
  return st;
})(buildStage);

/* ------------------------------ drawing ------------------------------ */
function spriteSVG(e, queued){
  const K = spriteOf(e), sc = MON[e.key].spScale || SPRITE_SCALE, w = K.fw*sc, h = K.fh*sc;
  const vals = Array.from({ length:K.frames }, (_,i)=>-i*K.fw).concat(K.frames===3 ? [-K.fw] : []).join(';');
  const top = K.pixel ? -h*.7 : -h;                                   // boss cells have headroom for the attack pose
  const col = e.boss ? '#d9452f' : e.mini ? '#f2b42c' : K.col;
  const crown = e.mini ? `<path d="M-14,8 L-16,-4 L-9,2 L-4,-8 L1,2 L8,-4 L6,8 Z" fill="#f2b42c" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` : '';
  const bar = queued ? '' : `<g class="ehp" transform="translate(-40,${top-26})"><rect width="80" height="12" rx="6" fill="#12100d" stroke="${OL}" stroke-width="3"/><rect class="ehpfill" x="2" y="2" width="76" height="8" rx="4" fill="${col}"/>${crown}</g>`;
  const ring = (e.mini || e.boss) && !queued ? `<ellipse class="elite-ring" cx="0" cy="2" rx="${Math.min(w*.4, 90)}" ry="12" fill="none" stroke="${e.boss?'#ff6a4a':'#f2b42c'}" stroke-width="4" opacity=".8"/>` : '';
  const anim = save.settings.anim===false ? '' : `<animate attributeName="x" values="${vals}" dur="${(.28*(K.frames+(K.frames===3?1:0))).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  const pose = K.atk!==undefined ? `<svg class="spr-pose" x="${-w/2}" y="${-h+4}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden" visibility="hidden"><image href="${K.img}" width="${K.fw*6}" height="${K.fh}"/></svg>` : '';
  return `<g class="enemy spr-enemy ${K.pixel?'spr-pixel':''} ${queued?'queued':''} ${e.golden?'golden':''}">${ring}<ellipse cx="0" cy="2" rx="${Math.min(w*.3, 70)}" ry="7" fill="#000" opacity=".28"/>
    <svg class="spr-idle" x="${-w/2}" y="${-h+4}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden"><image href="${K.img}" width="${K.fw*(K.atk!==undefined?6:K.frames)}" height="${K.fh}">${anim}</image></svg>${pose}${bar}${e.golden&&!queued?`<text class="golden-tag" x="-35" y="${top-34}">★ GOLDEN ★</text>`:''}</g>`;
}
enemyMarkup = (f=>function(e, queued){ return spriteOf(e) ? spriteSVG(e, queued) : f.apply(this, arguments); })(enemyMarkup);
monsterIcon = (f=>function(key){
  const K = spriteOf({ key }); if(!K) return f.apply(this, arguments);
  const v = K.pixel ? `12 6 ${K.fw-24} ${K.fh-6}` : `0 -4 ${K.fw} ${K.fh+6}`;
  return `<svg viewBox="${v}" class="spr-icon ${K.pixel?'spr-pixel':''}" aria-hidden="true"><image href="${K.img}" width="${K.fw*(K.atk!==undefined?6:K.frames)}" height="${K.fh}"/></svg>`;
})(monsterIcon);

/* ------------------------------ boss poses: attack / hurt ------------------------------ */
function spritePose(e, cell, ms){
  const K = spriteOf(e), g = document.querySelector('#enemyG .spr-enemy'); if(!K || !g || cell===undefined) return;
  const idle = g.querySelector('.spr-idle'), pose = g.querySelector('.spr-pose'); if(!idle || !pose) return;
  pose.querySelector('image').setAttribute('x', -cell*K.fw);
  pose.setAttribute('visibility', 'visible'); idle.setAttribute('visibility', 'hidden');
  clearTimeout(g._poseT); g._poseT = setTimeout(()=>{ pose.setAttribute('visibility', 'hidden'); idle.setAttribute('visibility', 'visible'); }, ms);
}
function spriteWave(K){
  const fx = $('#fx'); if(!fx || !K.fx) return;
  const w = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  w.setAttribute('href', K.fx); w.setAttribute('width', 69*2.2); w.setAttribute('height', 83*2.2); w.setAttribute('x', -69*1.1); w.setAttribute('y', -83*2.2);
  w.setAttribute('class', 'spr-pixel'); fx.appendChild(w);
  anim(w, [{ transform:tr(EN_X-90, FLOOR_Y+8)+' scale(.5)', opacity:.9 },{ transform:tr(HERO_X+30, FLOOR_Y+8)+' scale(1.05)', opacity:1, offset:.7 },{ transform:tr(HERO_X-10, FLOOR_Y+8)+' scale(1.15)', opacity:0 }], { duration:560, easing:'ease-in' }).then(()=>w.remove());
}
enemyHurt = (f=>function(dmg, big){
  const r = f.apply(this, arguments);
  try{ const e = curEnemy(), K = spriteOf(e); if(K && K.hurt!==undefined) spritePose(e, K.hurt, big ? 620 : 460); }catch(err){}
  return r;
})(enemyHurt);
enemyAttackAnim = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.atk!==undefined){
    spritePose(e, K.atk, 900);
    if(e.traits.includes('heavy')) floatText('💦 TIDAL CRUSH!', EN_X-30, FLOOR_Y-e.h*e.sc-40, '#8ff0ff', 26, true);
    setTimeout(()=>{ try{ spriteWave(K); }catch(err){} }, 180);
  }
  return f.apply(this, arguments);
})(enemyAttackAnim);
enemyCharge = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.atk!==undefined) floatText('💧 รวบรวมพลังน้ำ… เทิร์นหน้าแรงมาก!', EN_X-20, FLOOR_Y-e.h*e.sc-40, '#bff6ff', 20);
  return f.apply(this, arguments);
})(enemyCharge);
