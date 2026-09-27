/* ==========================================================================
   QUEST LINES v27 — BOSS ENCOUNTERS (multi-phase bosses + slime waves)
   --------------------------------------------------------------------------
   Built on top of the existing battle engine — nothing is rewritten:
     · the fight is still the original one-enemy-at-a-time queue
       (stage.enemies / b.idx / walkToNext / enemyDies / enemyTurn)
     · a boss "phase" is the boss enemy's own hp/maxHp; when it hits 0 the
       outermost enemyDies wrapper turns the kill into a PHASE TRANSITION
       (new face, new hp bar, new traits, a new slime wave spliced into the
       queue in front of the boss) until the last phase — only then does the
       original death / reward / stageClear run
     · attack patterns reuse the engine's traits (stone · heavy · weak ·
       vamp · caster) — each phase just swaps the list
     · Chapter 1's monsters are re-skinned as slimes (same keys / stats /
       traits) and the waves are made of them, so quests / codex still count
   The boss art is an extra SVG layer (#bossG) behind the actors: a large,
   cropped upper body rising out of an abyss pool — scaled uniformly, never
   stretched. The fighting slot (#enemyG) holds an invisible placeholder
   while the boss is the target, so every engine animation still works.

   To add another boss later: add an entry to BOSS_DEFS (+ its art folder).
   ========================================================================== */

/* ------------------------------ Chapter 1 = the slime chapter (sprite strips) ------------------------------ */
// every Chapter-1 monster keeps its key, stats and traits (so saves, quests, codex and kill counts stay valid) —
// only its look and name change to one of the slimes. 3-frame idle strips live in /enemies.
const SPRITES = {
  green: { img:'enemies/slime_green.png',  fw:69, fh:50, frames:3, col:'#7ed957' },
  blue:  { img:'enemies/slime_blue.png',   fw:74, fh:50, frames:3, col:'#6fb6ff' },
  yellow:{ img:'enemies/slime_yellow.png', fw:74, fh:50, frames:3, col:'#ffd24a' },
  devil: { img:'enemies/slime_devil.png',  fw:74, fh:50, frames:3, col:'#8a6aff' },
  orange:{ img:'enemies/slime_orange.png', fw:74, fh:50, frames:3, col:'#ff9a3a' },
  red:   { img:'enemies/slime_red.png',    fw:69, fh:50, frames:3, col:'#ff5a4a' },
  coke:  { img:'enemies/slime_coke.png',   fw:74, fh:50, frames:3, col:'#b87a4a' },
  golden:{ img:'enemies/slime_golden.png', fw:69, fh:50, frames:3, col:'#ffcf4a' },
};
const SLIME_SKINS = {
  slime:     { sp:'green',  name:'Green Slime',   th:'สไลม์เขียว' },
  rat:       { sp:'yellow', name:'Street Slime',  th:'สไลม์ข้างทาง' },
  skel:      { sp:'blue',   name:'Bubble Slime',  th:'สไลม์ฟองน้ำ' },
  bat:       { sp:'red',    name:'Blood Slime',   th:'สไลม์โลหิต' },
  candle:    { sp:'devil',  name:'Shadow Slime',  th:'สไลม์เงา' },
  coinspider:{ sp:'coke',   name:'Choco Slime',   th:'สไลม์ช็อกโกแลต' },
  mimic:     { sp:'orange', name:'Pumpkin Slime', th:'สไลม์ฟักทองยักษ์', scale:2.6 },      // Chapter-1 mini boss
};
const SPRITE_SCALE = 1.75;
Object.entries(SLIME_SKINS).forEach(([k,S])=>{ const M = MON[k]; if(!M) return; const sc = S.scale || SPRITE_SCALE;
  Object.assign(M, { name:S.name, th:S.th, sprite:S.sp, spScale:sc, sc:1, h:Math.round(SPRITES[S.sp].fh*sc), pal:{ a:SPRITES[S.sp].col, b:SPRITES[S.sp].col, c:SPRITES[S.sp].col } }); });
const spriteOf = e=>{ const M = e && MON[e.key]; return M && M.sprite ? SPRITES[e.golden ? 'golden' : M.sprite] : null; };

/* ------------------------------ boss configuration ------------------------------ */
// hp / atk are fractions of the stage's classic boss (so the fight scales with the stage like before);
// the total is ~1.4× the old single bar — the difficulty comes from phases, patterns and waves, not a sponge.
const BOSS_DEFS = {
  abyss: {
    key:'kingslime', ch:0, n:8,                                   // Chapter 1 · stage 1-8 (story)
    name:'Abyss Slime', th:'ราชินีสไลม์อเวจี',
    art:{ dir:'bosses/abyss/', body:'body.png', w:609, h:490,        // cropped upper body (bottom edge fades into the pool)
          face:{ x:150, y:160, w:102, h:88 },                        // where the face patch sits on the body
          icon:'icon.png', defeat:'face1.png',
          height:380, x:EN_X+20, floor:FLOOR_Y+36 },               // on-screen size (scene units) and anchor
    minion:{ hp:.5, atk:.55, gold:.6 },                          // wave slimes are weaker than the stage's own
    phases:[
      { face:'face5.png', hp:.30, atk:.90, traits:[],               wave:['slime'],
        pattern:'Slime Slap', patternTh:'ตบสไลม์ — เรียนรู้จังหวะ' },
      { face:'face3.png', hp:.34, atk:1.00, traits:['stone'],        wave:['slime','skel'],
        pattern:'Sticky Spit', patternTh:'ถ่มเมือก — ตัวอักษรกลายเป็นหิน' },
      { face:'face2.png', hp:.36, atk:1.10, traits:['heavy','weak'], wave:['candle','skel'], support:3,
        pattern:'Abyss Crash', patternTh:'ชาร์จแล้วทุบหนัก · มีจุดอ่อนตัวอักษร · ยิงสนับสนุนสไลม์' },
      { face:'face4.png', hp:.42, atk:1.15, traits:['vamp'], caster:true, wave:['bat'], support:2, summon:{ every:3, max:2, kind:'bat' },
        pattern:'Abyss Orb', patternTh:'ยิงลูกเมือกระยะไกล · ดูดเลือด · เรียกสไลม์เป็นช่วงๆ' },
    ],
  },
};
const bossDefFor = key=>Object.values(BOSS_DEFS).find(d=>d.key===key) || null;
const isBxBoss = x=>!!(x && (x.bxBoss || bossDefFor(x.key)));

// the chapter-1 boss is now Abyss Slime everywhere (quests, codex, map); the key stays 'kingslime' so old saves / quests keep working
try{ Object.assign(MON.kingslime, { name:BOSS_DEFS.abyss.name, th:BOSS_DEFS.abyss.th, h:190, sc:1 }); }catch(e){}

/* ------------------------------ encounter setup ------------------------------ */
const BX = { pending:null };
function bxMinion(key, s, rng, def){
  const M = def.minion, e = makeEnemy(MON[key] ? key : 'slime', s, rng || Math.random, false, false);
  const hp = Math.max(6, Math.round(e.maxHp*M.hp));
  return Object.assign(e, { hp, maxHp:hp, atk:Math.max(1, Math.round(e.atk*M.atk)), gold:Math.max(1, Math.round(e.gold*M.gold)),
    golden:false, name:MON[e.key].name, th:MON[e.key].th, minion:e.key });
}
function bxApplyPhase(e, i){
  const B = e.bx, P = B.def.phases[i];
  B.phase = i+1; B.turns = 0; B.summons = 0;
  const hp = Math.max(10, Math.round(B.baseHp*P.hp));
  Object.assign(e, { hp, maxHp:hp, atk:Math.max(1, Math.round(B.baseAtk*P.atk)), traits:P.traits.slice(), caster:!!P.caster,
    charge:0, burn:0, poison:0, frozen:0, stun:false });
  B.face = P.face;
}
// stage 1-8 in story mode: wave 1 + the boss (the old mimic mini boss is left out of this stage only)
buildStage = (f=>function(ch, n){
  const st = f.apply(this, arguments);
  const def = BX.pending;
  if(!def || ch!==def.ch || n!==def.n) return st;
  const rng = mulberry(hashStr('bx'+st.s));
  const boss = st.enemies.find(e=>e.key===def.key);
  if(!boss) return st;
  boss.bx = { def, baseHp:boss.maxHp, baseAtk:boss.atk, phase:1, sup:0 };
  boss.phase2 = true;                  // the engine's own 50% "PHASE 2" is replaced by the phase system
  bxApplyPhase(boss, 0);
  st.enemies = [ ...def.phases[0].wave.map(k=>bxMinion(k, st.s, rng, def)), boss ];
  st.bx = def;
  return st;
})(buildStage);
startStage = (f=>function(ch, n){
  const story = !(ui.run && ui.run.pending);           // endgame runs keep the classic single-bar fight
  const def = story ? Object.values(BOSS_DEFS).find(d=>d.ch===ch && d.n===n) : null;
  BX.pending = def || null;
  let r;
  try{ r = f.apply(this, arguments); } finally { BX.pending = null; }
  return r;
})(startStage);
const bxBoss = ()=>{ const b = ui.bat; return b && b.stage && b.stage.enemies.find(e=>e.bx) || null; };

/* ------------------------------ drawing ------------------------------ */
function spriteSVG(e, queued){
  const K = spriteOf(e), sc = MON[e.key].spScale || SPRITE_SCALE, w = K.fw*sc, h = K.fh*sc;
  const vals = Array.from({ length:K.frames }, (_,i)=>-i*K.fw).concat(K.frames>2 ? [-K.fw] : []).join(';');
  const col = e.boss ? '#d9452f' : e.mini ? '#f2b42c' : K.col;
  const crown = e.mini ? `<path d="M-14,8 L-16,-4 L-9,2 L-4,-8 L1,2 L8,-4 L6,8 Z" fill="#f2b42c" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` : '';
  const bar = queued ? '' : `<g class="ehp" transform="translate(-40,${-h-26})"><rect width="80" height="12" rx="6" fill="#12100d" stroke="${OL}" stroke-width="3"/><rect class="ehpfill" x="2" y="2" width="76" height="8" rx="4" fill="${col}"/>${crown}</g>`;
  const ring = e.mini && !queued ? `<ellipse class="elite-ring" cx="0" cy="2" rx="${w*.46}" ry="${10*sc/1.75}" fill="none" stroke="#f2b42c" stroke-width="4" opacity=".8"/>` : '';
  return `<g class="enemy spr-enemy ${e.minion?'bx-minion':''} ${queued?'queued':''} ${e.golden?'golden':''}">${ring}<ellipse cx="0" cy="2" rx="${w*.38}" ry="7" fill="#000" opacity=".28"/>
    <svg x="${-w/2}" y="${-h+4}" width="${w}" height="${h}" viewBox="0 0 ${K.fw} ${K.fh}" overflow="hidden"><image href="${K.img}" width="${K.fw*K.frames}" height="${K.fh}">${save.settings.anim===false?'':`<animate attributeName="x" values="${vals}" dur="${(.3*(K.frames+1)).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`}</image></svg>${bar}${e.golden&&!queued?`<text class="golden-tag" x="-35" y="${-h-34}">★ GOLDEN ★</text>`:''}</g>`;
}
enemyMarkup = (f=>function(e, queued){
  if(e && e.key==='kingslime'){ e.bxBoss = true; setTimeout(bxEnsureLayer, 0); return `<g class="enemy bx-ph"></g>`; }
  if(spriteOf(e)) return spriteSVG(e, queued);
  return f.apply(this, arguments);
})(enemyMarkup);
monsterIcon = (f=>function(key){
  if(key==='kingslime'){ const A = BOSS_DEFS.abyss.art; return `<svg viewBox="0 0 128 128" class="bx-icon" aria-hidden="true"><image href="${A.dir}${A.icon}" width="128" height="128"/></svg>`; }
  const K = spriteOf({ key }); if(K) return `<svg viewBox="0 -4 ${K.fw} ${K.fh+6}" class="spr-icon" aria-hidden="true"><image href="${K.img}" width="${K.fw*K.frames}" height="${K.fh}"/></svg>`;
  return f.apply(this, arguments);
})(monsterIcon);

function bxFaceOf(e){
  if(e.bx) return e.bx.face;
  const P = BOSS_DEFS.abyss.phases;                       // classic fights: face follows the engine's own phases
  return e.egP3 ? P[3].face : e.phase2 ? P[2].face : P[0].face;
}
function bxEnsureLayer(){
  const b = ui.bat, act = $('#actors'); if(!b || !act) return null;
  const e = b.stage.enemies.slice(b.idx).find(isBxBoss); if(!e) return null; e.bxBoss = true;
  let g = $('#bossG');
  if(!g){
    const def = bossDefFor(e.key) || BOSS_DEFS.abyss, A = def.art, s = A.height/A.h, W = A.w*s, H = A.h*s;
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'bossG'; g.setAttribute('class', 'bx-boss rise');
    g.setAttribute('transform', `translate(${A.x},${A.floor})`);
    g.innerHTML = `<defs><radialGradient id="bxPool"><stop offset="0" stop-color="#1a0a2e" stop-opacity=".95"/><stop offset=".55" stop-color="#2a1048" stop-opacity=".75"/><stop offset="1" stop-color="#2a1048" stop-opacity="0"/></radialGradient>
        <radialGradient id="bxAura"><stop offset="0" stop-color="#b04aff" stop-opacity=".35"/><stop offset="1" stop-color="#b04aff" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="bx-aura" cx="${-W*.05}" cy="${-H*.55}" rx="${W*.62}" ry="${H*.6}" fill="url(#bxAura)"/>
      <g class="bx-body"><image href="${A.dir}${A.body}" x="${-W/2}" y="${-H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"/>
        <image class="bx-face" href="${A.dir}${bxFaceOf(e)}" x="${-W/2 + A.face.x*s}" y="${-H + A.face.y*s}" width="${A.face.w*s}" height="${A.face.h*s}"/></g>
      <ellipse class="bx-pool" cx="0" cy="-2" rx="${W*.62}" ry="34" fill="url(#bxPool)"/>
      <g class="bx-drips">${[-.34,-.12,.1,.3].map((k,i)=>`<ellipse cx="${W*k}" cy="${-4 - (i%2)*6}" rx="${16+i*4}" ry="7" fill="#3a1a60" opacity=".7"/>`).join('')}</g>`;
    act.insertBefore(g, act.firstChild);
  }
  bxRefresh();
  return g;
}
function bxSetFace(file){
  const g = $('#bossG'), f = g && g.querySelector('.bx-face'); if(!f) return;
  const e = bxBoss() || curEnemy(), A = ((e && bossDefFor(e.key)) || BOSS_DEFS.abyss).art;
  f.setAttribute('href', A.dir + file);
}
// active / waiting look + face + hp bar
function bxRefresh(){
  const b = ui.bat, g = $('#bossG'); if(!b || !g) return;
  const e = curEnemy(), boss = b.stage.enemies.slice(b.idx).find(isBxBoss);
  if(!boss){ return; }
  g.classList.toggle('active', isBxBoss(e));
  if(!boss._bxDying) bxSetFace(bxFaceOf(boss));
  bxBar();
}

/* ------------------------------ phase hp bar (4 segments) ------------------------------ */
function bxBar(){
  const b = ui.bat, st = $('#stage'); if(!b || !st) return;
  const boss = b.stage.enemies.find(x=>x.bx); let el = $('#bxBar');
  if(!boss){ if(el) el.remove(); return; }
  const B = boss.bx, P = B.def.phases, n = P.length, cur = B.phase;
  if(!el){
    st.insertAdjacentHTML('beforeend', `<div class="bx-bar" id="bxBar" aria-live="polite"><div class="bx-top"><b class="bx-name"></b><em class="bx-ph"></em></div><div class="bx-segs">${P.map(()=>'<span><i></i></span>').join('')}</div><div class="bx-pat"></div></div>`);
    el = $('#bxBar');
  }
  const hud = st.querySelector('.hud'); if(hud) el.style.top = (hud.offsetTop + hud.offsetHeight + 4) + 'px';
  el.querySelector('.bx-name').innerHTML = `${esc(B.def.name)} <small>${esc(B.def.th)}</small>`;
  el.querySelector('.bx-ph').textContent = boss._bxDying ? 'DEFEATED' : `PHASE ${cur}/${n}`;
  el.querySelectorAll('.bx-segs span').forEach((s,i)=>{
    const done = boss._bxDying || i < cur-1, now = !done && i===cur-1;
    const pct = done ? 0 : now ? Math.max(0, boss.hp/boss.maxHp*100) : 100;
    s.className = done ? 'done' : now ? 'now' : 'next';
    s.firstChild.style.width = pct + '%';
  });
  const e = curEnemy(), P0 = P[cur-1];
  el.querySelector('.bx-pat').textContent = boss._bxDying ? '' : e && e.minion ? `🟢 WAVE · สไลม์ ${b.stage.enemies.slice(b.idx).filter(x=>x.minion).length} ตัวขวางอยู่ — บอสรออยู่ด้านหลัง` : `⚔ ${P0.pattern} — ${P0.patternTh}`;
  el.classList.toggle('wait', !!(e && e.minion));
  // the word-streak chip sits under this bar
  const ws = $('#wsChip'); if(ws && !ws.hidden) ws.style.top = (el.offsetTop + el.offsetHeight + 6) + 'px';
}
['updateEnemyHp','renderEnemyPanel','updateHud'].forEach(fn=>{
  const f = window[fn]; if(typeof f!=='function') return;
  window[fn] = function(){ const r = f.apply(this, arguments); try{ if(ui.bat && ($('#bossG') || $('#bxBar'))) bxRefresh(); }catch(e){} return r; };
});
buildBattleDom = (f=>function(){ const r = f.apply(this, arguments); try{ bxEnsureLayer(); bxBar(); }catch(e){ console.error(e); } return r; })(buildBattleDom);
// entrance: a short title once the boss is in view
intro = (f=>async function(){
  const r = await f.apply(this, arguments);
  const b = ui.bat;
  if(b && b.stage.bx && !b.bxIntro){ b.bxIntro = true; sfx.boss && sfx.boss(); banner(b.stage.bx.name.toUpperCase(), `${b.stage.bx.th} ปรากฏตัว!`); shake(true); }
  return r;
})(intro);

/* ------------------------------ boss animations (the placeholder does the engine's moves) ------------------------------ */
const bxBody = ()=>document.querySelector('#bossG .bx-body');
enemyHurt = (f=>function(dmg, big){
  const r = f.apply(this, arguments);
  try{ const e = curEnemy(), body = bxBody();
    if(isBxBoss(e) && body){ anim(body, [{ transform:'translateX(0)', filter:'brightness(1)' },{ transform:'translateX(14px)', filter:'brightness(2.2) saturate(.3)' },{ transform:'translateX(-6px)', filter:'brightness(1.3)' },{ transform:'translateX(0)', filter:'brightness(1)' }], { duration:big?420:320 }); bxBar(); }
  }catch(err){}
  return r;
})(enemyHurt);
function bxSplash(col){
  const fx = $('#fx'); if(!fx) return;
  for(let k=0;k<7;k++){ const c = document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('r', rint(6,12)); c.setAttribute('fill', col); c.setAttribute('stroke', '#1a0a2e'); c.setAttribute('stroke-width', 2); fx.appendChild(c);
    const a = -Math.PI*(.15+k/7*.7), d = rint(30,70);
    anim(c, [{ transform:tr(HERO_X+20, FLOOR_Y-70)+' scale(.4)', opacity:1 },{ transform:tr(HERO_X+20+Math.cos(a)*d, FLOOR_Y-70+Math.sin(a)*d)+' scale(1)', opacity:0 }], { duration:520, easing:'ease-out' }).then(()=>c.remove()); }
}
async function bxLunge(heavy){
  const body = bxBody(); if(!body) return;
  anim(body, [{ transform:'translate(0,0) scale(1)' },{ transform:'translate(10px,4px) scale(.99)', offset:.3 },{ transform:`translate(${heavy?-70:-46}px,8px) scale(${heavy?1.08:1.05})`, offset:.55 },{ transform:'translate(0,0) scale(1)' }], { duration:heavy?760:640, easing:'ease-in-out' });
  await sleep(330);
  bxSplash('#9a5aff');
}
enemyAttackAnim = (f=>async function(){
  const e = curEnemy();
  if(isBxBoss(e)){ const p = f.apply(this, arguments); await bxLunge(e.traits.includes('heavy')); return p; }
  return f.apply(this, arguments);
})(enemyAttackAnim);
casterAttackAnim = (f=>async function(){
  const e = curEnemy(), body = bxBody();
  if(isBxBoss(e) && body){ e.pal = Object.assign({}, e.pal, { c:'#b06aff' }); anim(body, [{ transform:'translateY(0)' },{ transform:'translateY(-10px) scale(1.02)' },{ transform:'translateY(0)' }], { duration:900 }); }
  return f.apply(this, arguments);
})(casterAttackAnim);
enemyCharge = (f=>async function(){
  const e = curEnemy(), body = bxBody();
  if(isBxBoss(e) && body) anim(body, [{ filter:'brightness(1)' },{ filter:'brightness(1.4) drop-shadow(0 0 14px #ff3b6a)' },{ filter:'brightness(1)' },{ filter:'brightness(1.4) drop-shadow(0 0 14px #ff3b6a)' },{ filter:'brightness(1)' }], { duration:800 });
  return f.apply(this, arguments);
})(enemyCharge);

/* ------------------------------ phase transition + waves ------------------------------ */
async function bxPhaseBreak(e){
  const b = ui.bat, B = e.bx, P = B.def.phases, next = B.phase;          // index of the next phase
  B.lock = true; b.busy = true;
  clearEnchant && clearEnchant();
  sfx.boss && sfx.boss(); shake(true);
  const st = $('#stage'); if(st){ const f = document.createElement('div'); f.className = 'bx-flash'; st.appendChild(f); setTimeout(()=>f.remove(), 900); }
  const body = bxBody();
  if(body) anim(body, [{ transform:'scale(1)', filter:'brightness(1)' },{ transform:'scale(.97) translateX(10px)', filter:'brightness(2.4)', offset:.35 },{ transform:'scale(1.03)', filter:'brightness(1.2) drop-shadow(0 0 20px #b04aff)', offset:.7 },{ transform:'scale(1)', filter:'brightness(1)' }], { duration:1100, easing:'ease-out' });
  await sleep(420);
  bxApplyPhase(e, next);
  bxSetFace(B.face);
  const Pn = P[next];
  banner(`PHASE ${next+1}`, `${Pn.pattern} · ${Pn.patternTh}`);
  updateEnemyHp(); renderEnemyPanel(); updateHud(); bxBar();
  await sleep(1150);
  // spawn this phase's wave in front of the boss (the engine only ever fights one at a time, one waits in the queue)
  const wave = (Pn.wave||[]).map(k=>bxMinion(k, b.stage.s, null, B.def));
  B.lock = false;
  if(wave.length && !b.over){
    b.stage.enemies.splice(b.idx, 1, ...wave, e);
    await walkToNext();
    banner(`WAVE ${next+1}`, `สไลม์ ${wave.length} ตัวบุกเข้ามา!`, 'mini');
    await sleep(500);
  }
  b.busy = false; renderTray(); renderEnemyPanel(); updateHud(); bxRefresh();
}
async function bxDefeat(e){
  const b = ui.bat, B = e.bx;
  e._bxDying = true; b.busy = true;
  // no more slimes: drop anything still queued behind the boss
  b.stage.enemies = b.stage.enemies.filter((x,i)=>i<=b.idx || !x.minion);
  bxSetFace((bossDefFor(e.key) || BOSS_DEFS.abyss).art.defeat);
  bxBar(); sfx.boss && sfx.boss(); shake(true);
  banner('BOSS DEFEATED!', `${B ? B.def.th : e.th} พ่ายแพ้!`);
  const g = $('#bossG'), body = bxBody();
  if(body) await anim(body, [{ transform:'translate(0,0)', filter:'brightness(1)', opacity:1 },{ transform:'translate(8px,0)', filter:'brightness(2)', opacity:1, offset:.2 },{ transform:'translate(-8px,10px)', filter:'brightness(1.4)', opacity:1, offset:.4 },{ transform:'translate(0,160px)', filter:'brightness(.6) blur(1px)', opacity:0 }], { duration:1500, easing:'ease-in', fill:'forwards' });
  if(g) g.classList.add('gone');
  const eg = $('#enemyG'); if(eg) eg.innerHTML = '';
}
// the outermost kill hook: a boss with phases left doesn't die — it changes phase
enemyDies = (f=>async function(){
  const b = ui.bat, e = b && curEnemy();
  if(e && e.bx && !b.over){
    if(e.bx.lock) return;                                   // already transitioning (guards double triggers)
    if(e.bx.phase < e.bx.def.phases.length){ await bxPhaseBreak(e); return; }
    if(!e._bxDying) await bxDefeat(e);
  } else if(isBxBoss(e) && !e.bx && !e._bxDying && b && !b.over){
    await bxDefeat(e);                                      // classic (endgame / tower) fights: same art, single bar
  }
  const r = await f.apply(this, arguments);
  try{ if(!b || !b.stage.enemies.slice(b.idx).some(isBxBoss)){ const g = $('#bossG'); if(g) g.remove(); const bar = $('#bxBar'); if(bar) bar.remove(); } else bxRefresh(); }catch(err){}
  return r;
})(enemyDies);
// after any walk the active/waiting look follows the new target
walkToNext = (f=>async function(){ const r = await f.apply(this, arguments); try{ bxEnsureLayer(); bxRefresh(); }catch(e){} return r; })(walkToNext);

/* ------------------------------ patterns that need the boss off-target ------------------------------ */
async function bxSupportShot(boss){
  const b = ui.bat, fx = $('#fx'); if(!b || !fx) return false;
  const body = bxBody(); if(body) anim(body, [{ transform:'translateY(0)' },{ transform:'translateY(-8px) scale(1.02)' },{ transform:'translateY(0)' }], { duration:700 });
  floatText('Abyss Orb!', EN_X+40, FLOOR_Y-250, '#d8a8ff', 22);
  await sleep(300);
  const orb = document.createElementNS('http://www.w3.org/2000/svg','g');
  orb.innerHTML = `<circle r="22" fill="#b06aff" opacity=".3"/><circle r="12" fill="#8a4aff" stroke="#1a0a2e" stroke-width="3"/>`;
  fx.appendChild(orb);
  const sx = EN_X-10, sy = FLOOR_Y-180, hx = HERO_X+15, hy = FLOOR_Y-80;
  await anim(orb, [{ transform:tr(sx,sy)+' scale(.3)' },{ transform:tr((sx+hx)/2, sy-50)+' scale(1.1)', offset:.5 },{ transform:tr(hx,hy) }], { duration:520, easing:'ease-in' });
  orb.remove(); bxSplash('#b06aff');
  const dmg = Math.max(1, Math.round(boss.atk*.45*(1 - AR(save.eq.armor).block)*CH(save.eq.char).dmgTaken*defMul()));
  if(b.evade>0){ b.evade--; floatText('MISS! 🌪️', HERO_X, FLOOR_Y-170, '#dfffff', 26, true); return false; }
  b.hp -= dmg; sfx.hurt && sfx.hurt(); heroHurt(dmg, false); updateHud();
  await sleep(380);
  return await checkHeroDeath();
}
async function bxSummon(boss, kind){
  const b = ui.bat, B = boss.bx;
  const body = bxBody(); if(body) anim(body, [{ transform:'scale(1)' },{ transform:'scale(1.04) translateY(-6px)' },{ transform:'scale(1)' }], { duration:700 });
  floatText('สไลม์ มา!', EN_X+30, FLOOR_Y-240, '#d8a8ff', 24, true);
  sfx.power && sfx.power(); await sleep(450);
  const m = bxMinion(kind, b.stage.s, null, B.def);
  b.stage.enemies.splice(b.idx, 0, m);         // the slime steps in front, the boss waits right behind it
  B.summons++;
  await walkToNext();
  bxRefresh();
}
enemyTurn = (f=>async function(){
  const b = ui.bat, e = b && curEnemy(), boss = b && bxBoss();
  if(b && e && boss && boss.bx && !b.over && !boss._bxDying){
    const P = boss.bx.def.phases[boss.bx.phase-1];
    // Phase 4: every few boss turns she calls a slime in instead of attacking
    if(e===boss && P.summon && !e.frozen && !e.stun && e.hp>0){
      boss.bx.turns++;
      if(boss.bx.turns % P.summon.every===0 && boss.bx.summons < P.summon.max){ await bxSummon(boss, P.summon.kind); endTurn(); return; }
    }
    // Phases 3–4: while a slime is in front, the boss fires a support orb every N slime turns
    if(e.minion && P.support && e.hp>0){
      boss.bx.sup = (boss.bx.sup||0) + 1;
      if(boss.bx.sup % P.support===0){ if(await bxSupportShot(boss)) return; }
    }
  }
  return f.apply(this, arguments);
})(enemyTurn);
