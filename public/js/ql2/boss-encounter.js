/* ==========================================================================
   QUEST LINES v31 — SPRITE ENEMIES: Chapter 1 slimes + Aqua Slime · Chapter 5 Resident Evil + Tyrant
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
  aqua:  { img:'bosses/aqua/boss.png', fw:100, fh:100, cells:6, idle:[0,1,2,3], atk:[4], hurt:[5], col:'#4ad8f0', pixel:true, fx:'bosses/aqua/wave.png' },
  // Chapter 5 — Resident Evil sprites (Metal Slug style by DC Hunk). ax = where the feet are inside a cell.
  tyrant:  { img:'enemies/re/tyrant.png',     fw:83, fh:58, ax:44.6, cells:14, idle:[0,1], atk:[2,3,4,5], heavy:[6,7,8,8], hurt:[9], dead:[10,11,12,13], col:'#b8c0b0', pixel:true, rate:.45 , top:.9 },
  salvador:{ img:'enemies/re/salvador.png',   fw:56, fh:72, ax:39.5, cells:7,  idle:[0,1], atk:[2,3,4,5,6], col:'#e0b060', pixel:true, rate:.4 , top:.9 },
  salvadorB:{img:'enemies/re/salvador_b.png', fw:56, fh:72, ax:39.5, cells:7,  idle:[0,1], atk:[2,3,4,5,6], col:'#e05a4a', pixel:true, rate:.4 , top:.9 },
  licker:  { img:'enemies/re/licker.png',     fw:90, fh:50, ax:47.4, cells:14, idle:[0,1], atk:[2,3,4,5,6,7,8,9], hurt:[10], dead:[11,12,13], col:'#d0584a', pixel:true, rate:.5 , top:.9 },
  maiden:  { img:'enemies/re/maiden.png',     fw:34, fh:46, ax:14,   cells:3,  idle:[0,1], atk:[2], col:'#a0a8a0', pixel:true, rate:.5 , top:.9 },
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
  // Chapter 5 (same keys, stats and traits as before — only the look changes)
  zombie:    { sp:'salvador', name:'Dr. Salvador',  th:'ด็อกเตอร์ซัลวาดอร์ เลื่อยยนต์', scale:2.5 },   // v32: all Chapter-5 sizes ×~1.4
  wraith:    { sp:'licker',   name:'Licker',        th:'ลิกเกอร์ ลิ้นมรณะ', scale:2.7 },
  necroskel: { sp:'maiden',   name:'Iron Maiden',   th:'ไอรอนเมเดน หนามเหล็ก', scale:3.2 },
  mummy:     { sp:'salvadorB',name:'Bloody Salvador',th:'ซัลวาดอร์เลือดสาด', scale:3.1 },   // Chapter-5 mini boss
  necro:     { sp:'tyrant',   name:'Tyrant',        th:'ไทแรนต์ อาวุธชีวภาพ', scale:4.0 },   // Chapter-5 boss
};
const SPRITE_SCALE = 1.75;
Object.entries(SLIME_SKINS).forEach(([k,S])=>{ const M = MON[k]; if(!M) return; const sc = S.scale || SPRITE_SCALE, P = SPRITES[S.sp];
  Object.assign(M, { name:S.name, th:S.th, sprite:S.sp, spScale:sc, sc:1, h:Math.round(P.fh*sc*.8), pal:{ a:P.col, b:P.col, c:P.col } });
  if(S.sp==='tyrant') M.caster = false; });                                // the Tyrant fights up close
// slimes: 3-cell strips that ping-pong
Object.values(SPRITES).forEach(P=>{ if(!P.cells){ P.cells = P.frames; P.idle = P.frames===3 ? [0,1,2,1] : [...Array(P.frames).keys()]; } });
// Chapter 5 is fought only by the Resident Evil creatures
try{ CHAPTERS[4].pool = ['zombie','wraith','necroskel']; }catch(e){}
const spriteOf = e=>{ const M = e && MON[e.key]; return M && M.sprite ? SPRITES[e.golden ? 'golden' : M.sprite] : null; };

/* ------------------------------ the boss: very tough, hits very hard ------------------------------ */
// multipliers on the stage's normal boss stats; 'heavy' = charges one turn, then hits ×2.2 (the engine's own trait)
const BOSS_TUNING = {
  kingslime:{ ch:0, n:8, hp:2.6, atk:1.3, traits:['heavy','weak'], lineup:'two' },     // slime → slime → boss
  // Tyrant: much tougher than the old Necromancer — huge HP, charged claw rush (×2.2), thick hide
  // (3-letter words do half) and it drinks back part of what it deals
  necro:    { ch:4, n:8, hp:2.4, atk:1.35, traits:['heavy','armor3','vamp'] },
};
buildStage = (f=>function(ch, n){
  const st = f.apply(this, arguments);
  const T = Object.entries(BOSS_TUNING).find(([k,t])=>t.ch===ch && t.n===n);
  if(!T) return st;
  const [key, t] = T, boss = st.enemies.find(e=>e.key===key);
  if(!boss) return st;
  boss.maxHp = boss.hp = Math.round(boss.maxHp*t.hp);
  boss.atk = Math.round(boss.atk*t.atk);
  boss.traits = t.traits.slice();
  boss.phase2 = true;                  // no engine 50% heal / phase 2 on top — the tuning is the difficulty
  if(t.lineup!=='two') return st;
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
  const x0 = K.ax!==undefined ? -K.ax*sc : -w/2;                         // feet on the ground point
  const vals = K.idle.map(c=>-c*K.fw).join(';');
  const top = -h*(K.top || (K.pixel ? .7 : 1));                           // where the hp bar sits (fraction of the cell)
  const col = e.boss ? '#d9452f' : e.mini ? '#f2b42c' : K.col;
  const crown = e.mini ? `<path d="M-14,8 L-16,-4 L-9,2 L-4,-8 L1,2 L8,-4 L6,8 Z" fill="#f2b42c" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` : '';
  const bar = queued ? '' : `<g class="ehp" transform="translate(-40,${top-26})"><rect width="80" height="12" rx="6" fill="#12100d" stroke="${OL}" stroke-width="3"/><rect class="ehpfill" x="2" y="2" width="76" height="8" rx="4" fill="${col}"/>${crown}</g>`;
  const ring = (e.mini || e.boss) && !queued ? `<ellipse class="elite-ring" cx="0" cy="2" rx="${Math.min(w*.4, 90)}" ry="12" fill="none" stroke="${e.boss?'#ff6a4a':'#f2b42c'}" stroke-width="4" opacity=".8"/>` : '';
  const anim = save.settings.anim===false || K.idle.length<2 ? '' : `<animate attributeName="x" values="${vals}" dur="${((K.rate||.28)*K.idle.length).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  const W = K.fw*K.cells, poses = K.atk || K.hurt || K.dead;
  const pose = poses ? `<svg class="spr-pose" x="${x0}" y="${-h+4}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden" visibility="hidden"><image href="${K.img}" width="${W}" height="${K.fh}"/></svg>` : '';
  return `<g class="enemy spr-enemy ${K.pixel?'spr-pixel':''} ${queued?'queued':''} ${e.golden?'golden':''}">${ring}<ellipse cx="0" cy="2" rx="${Math.min(w*.3, 70)}" ry="7" fill="#000" opacity=".28"/>
    <svg class="spr-idle" x="${x0}" y="${-h+4}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden"><image href="${K.img}" width="${W}" height="${K.fh}" x="${-K.idle[0]*K.fw}">${anim}</image></svg>${pose}${bar}${e.golden&&!queued?`<text class="golden-tag" x="-35" y="${top-34}">★ GOLDEN ★</text>`:''}</g>`;
}
enemyMarkup = (f=>function(e, queued){ return spriteOf(e) ? spriteSVG(e, queued) : f.apply(this, arguments); })(enemyMarkup);
monsterIcon = (f=>function(key){
  const K = spriteOf({ key }); if(!K) return f.apply(this, arguments);
  const v = K.pixel ? `${K.fw*.1} ${K.fh*.05} ${K.fw*.8} ${K.fh*.95}` : `0 -4 ${K.fw} ${K.fh+6}`;
  return `<svg viewBox="${v}" class="spr-icon ${K.pixel?'spr-pixel':''}" aria-hidden="true"><image href="${K.img}" width="${K.fw*K.cells}" height="${K.fh}" x="${-K.idle[0]*K.fw}"/></svg>`;
})(monsterIcon);

/* ------------------------------ boss poses: attack / hurt ------------------------------ */
// play a list of cells on the pose layer (attack / hurt / death), then go back to the idle loop (unless hold)
function spritePose(e, cells, frameMs, hold){
  const K = spriteOf(e), g = document.querySelector('#enemyG .spr-enemy'); if(!K || !g || !cells || !cells.length) return 0;
  const idle = g.querySelector('.spr-idle'), pose = g.querySelector('.spr-pose'); if(!idle || !pose) return 0;
  const img = pose.querySelector('image'); let k = 0;
  clearInterval(g._poseI); clearTimeout(g._poseT);
  const show = ()=>img.setAttribute('x', -cells[Math.min(k, cells.length-1)]*K.fw);
  show(); pose.setAttribute('visibility', 'visible'); idle.setAttribute('visibility', 'hidden');
  if(cells.length>1) g._poseI = setInterval(()=>{ k++; if(k>=cells.length){ clearInterval(g._poseI); return; } show(); }, frameMs);
  const total = frameMs*cells.length + (hold ? 0 : 160);
  if(!hold) g._poseT = setTimeout(()=>{ pose.setAttribute('visibility', 'hidden'); idle.setAttribute('visibility', 'visible'); }, total);
  return total;
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
  try{ const e = curEnemy(), K = spriteOf(e); if(K && K.hurt) spritePose(e, K.hurt, big ? 520 : 380); }catch(err){}
  return r;
})(enemyHurt);
enemyAttackAnim = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.atk){
    const heavy = e.traits.includes('heavy'), cells = heavy && K.heavy ? K.heavy : K.atk;
    spritePose(e, cells, cells.length>2 ? 110 : 700);
    if(heavy) floatText(K.fx ? '💦 TIDAL CRUSH!' : '💥 CRUSHING BLOW!', EN_X-30, FLOOR_Y-e.h*e.sc-40, K.fx ? '#8ff0ff' : '#ffb0a0', 26, true);
    if(K.fx) setTimeout(()=>{ try{ spriteWave(K); }catch(err){} }, 180);
  }
  return f.apply(this, arguments);
})(enemyAttackAnim);
casterAttackAnim = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.atk) spritePose(e, K.atk, K.atk.length>2 ? 110 : 700);
  return f.apply(this, arguments);
})(casterAttackAnim);
// death frames (when the sheet has them) play before the engine's own vanish
enemyDies = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.dead && ui.bat && !ui.bat.over && !e._sprDead){ e._sprDead = true; const t = spritePose(e, K.dead, 150, true); await sleep(Math.min(700, t)); }
  return f.apply(this, arguments);
})(enemyDies);
enemyCharge = (f=>async function(){
  const e = curEnemy(), K = spriteOf(e);
  if(K && K.atk && e.boss) floatText(K.fx ? '💧 รวบรวมพลังน้ำ… เทิร์นหน้าแรงมาก!' : '⚠ กำลังเกร็งกรงเล็บ… เทิร์นหน้าแรงมาก!', EN_X-20, FLOOR_Y-e.h*e.sc-40, '#bff6ff', 20);
  return f.apply(this, arguments);
})(enemyCharge);

// the codex lore was written before the re-skin above ran → refresh the boss names it quotes
try{ LORE.forEach(l=>{ const m = /^boss(\d)$/.exec(l.id); if(!m) return; const C = CHAPTERS[+m[1]]; const B = MON[C.boss];
  l.t = `บันทึกการปราบ ${B.name}`; l.reqTxt = `ปราบ ${B.name}`; }); }catch(e){}
