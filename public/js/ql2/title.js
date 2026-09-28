/* ==========================================================================
   QUEST LINES v40 — DRAGON TITLE SCREEN
   Shown every time the game is opened.
     · new player    → name box + START
     · saved player  → START only
   A huge dragon leans in from the right edge of the screen and breathes
   fire in a loop, in front of the castle wall at night. v40: the starter
   hero (Elite Knight) stands bottom-left and slashes every fireball apart.
   The loop is slower, and the dragon sits further right to make room.
   Sprites: title/dragon.png · fireball.png · burst.png
     Dragon from "Shrek: Hassle at the Castle" (GBA) — ripped by A.J. Nitro.
   Logo: title/logo.jpg (blended onto the scene with mix-blend-mode:screen)
   ========================================================================== */
const DT = {
  fw:142, fh:124, frames:18,              // dragon strip: 18 frames of 142×124, anchored bottom-right
  mouth:{ x:14, y:72 },                   // mouth in frame units (fire starts here)
  // the loop: [strip frame, ms, fire?]
  seq:[ [0,260],[1,260],[2,260],[1,260],[0,260],[1,260],[2,260],[1,260],
        [3,190],[4,190],[5,210],
        [6,220],[7,220],[8,190,1],[9,190],[10,190],[9,190],[10,190],[9,190,2],[10,190],[9,190],[10,190],[9,190],[10,190,3],[9,190],[10,190],[9,220],[11,300],
        [12,180],[13,180],[14,180],[15,180],[16,200],[17,300] ],
  // the knight (starter hero) — strips from heroes/knight/: 216×112 frames, feet at x=70
  kn:{ fw:216, fh:112, ax:70, idle:{ n:4, ms:380 }, atk3:{ n:5, ms:150, hit:2 }, atk1:{ n:5, ms:150, hit:2 }, fin:{ n:7, ms:160, hit:3 } },
  speed:.32,                              // fireball speed (px per ms) — slow enough to watch
  ball:{ src:'title/fireball.png', w:56, h:32, n:6 },
  burst:{ src:'title/burst.png', w:55, h:50, n:8 },
  run:0,
};
(function(){
  const css = `
  .dt{position:absolute;inset:0;overflow:hidden;background:#07060f;color:#fff;user-select:none;-webkit-user-select:none}
  .dt-wall{position:absolute;inset:0;background:url(scenes/bg/castlenight.png) repeat-x left bottom / auto 100%;image-rendering:pixelated;filter:brightness(.8) saturate(1.1)}
  .dt-glow{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse 60% 50% at 88% 72%,rgba(255,110,40,.30),transparent 70%),
               radial-gradient(ellipse 90% 60% at 50% 18%,rgba(70,120,255,.22),transparent 70%),
               linear-gradient(180deg,rgba(4,4,14,.55),rgba(4,4,14,.1) 40%,rgba(4,4,14,.2) 70%,rgba(2,2,8,.92))}
  .dt-flash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 40% 60%,rgba(255,150,40,.45),transparent 70%);opacity:0;transition:opacity .25s}
  .dt.fire .dt-flash{opacity:1}
  .dt-embers i{position:absolute;bottom:-10px;width:4px;height:4px;background:#ffb040;box-shadow:0 0 6px #ff7a20;animation:dtEmber linear infinite;opacity:0}
  @keyframes dtEmber{0%{transform:translateY(0);opacity:0}10%{opacity:.9}100%{transform:translateY(-95vh) translateX(-30px);opacity:0}}
  .dt-logo{position:absolute;left:50%;top:max(10px,env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(78vw,44vh,520px);mix-blend-mode:screen;pointer-events:none;
    animation:dtLogo 3.2s ease-in-out infinite}
  @keyframes dtLogo{50%{transform:translateX(-50%) translateY(-6px)}}
  .dt-dragon{position:absolute;left:0;top:0;width:142px;height:124px;transform-origin:0 0;
    background:url(title/dragon.png) 0 0 / 1800% 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
  .dt-knight{position:absolute;left:0;top:0;width:216px;height:112px;transform-origin:0 0;background:url(heroes/knight/idle.png) 0 0 / 400% 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}
  .dt-shadow{position:absolute;height:14px;border-radius:50%;background:radial-gradient(rgba(0,0,0,.55),transparent 70%);pointer-events:none}
  .dt-fx{position:absolute;inset:0;pointer-events:none}
  .dt-spr{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;will-change:transform}
  .dt-ui{position:absolute;left:0;right:0;bottom:calc(22px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 18px;z-index:2}
  .dt-ui .text-in{width:min(320px,86vw);text-align:center;font-size:18px;background:rgba(8,8,20,.78);border:2px solid rgba(255,190,90,.7);color:#fff;border-radius:12px;padding:12px 14px}
  .dt-start{min-width:min(300px,80vw);padding:14px 30px;border:0;border-radius:14px;cursor:pointer;font:italic 900 30px/1 var(--hand);letter-spacing:4px;color:#2a1204;
    background:linear-gradient(180deg,#fff2b0 0%,#ffc23a 45%,#e0761a 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.6),inset 0 -6px 0 rgba(120,40,0,.35),0 6px 0 #3a1606,0 0 30px rgba(255,150,40,.55);
    animation:dtPulse 1.6s ease-in-out infinite}
  .dt-start:active{transform:translateY(4px);box-shadow:inset 0 3px 0 rgba(255,255,255,.6),0 2px 0 #3a1606}
  @keyframes dtPulse{50%{box-shadow:inset 0 3px 0 rgba(255,255,255,.6),inset 0 -6px 0 rgba(120,40,0,.35),0 6px 0 #3a1606,0 0 48px rgba(255,170,60,.9)}}
  .dt-logo{width:min(74vw,34vh,500px)}
  @media (orientation:landscape){
    .dt-logo{left:20%;top:44%;transform:translate(-50%,-62%);width:min(34vw,54vh,480px);animation:none}
    .dt-ui{left:20%;right:auto;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px))}
  }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  [DT.ball.src, DT.burst.src, 'title/dragon.png', 'title/logo.jpg', 'heroes/knight/idle.png', 'heroes/knight/atk3.png', 'heroes/knight/atk1.png', 'heroes/knight/fin.png'].forEach(s=>{ const i = new Image(); i.src = s; });
})();

renderTitle = function(){
  const isNew = !save.name;
  const embers = Array.from({ length:14 }, (_, k)=>`<i style="left:${(k*37+11)%100}%;animation-duration:${5+(k%5)}s;animation-delay:${(k*.73)%6}s"></i>`).join('');
  setTimeout(dtStart, 0);
  return `<div class="dt" id="dtRoot">
    <div class="dt-wall"></div><div class="dt-glow"></div><div class="dt-embers">${embers}</div>
    <img class="dt-logo" src="title/logo.jpg" alt="Quest Lines — Word Battle RPG">
    <div class="dt-dragon" id="dtDragon" aria-hidden="true"></div>
    <div class="dt-shadow" id="dtKShadow"></div><div class="dt-knight" id="dtKnight" aria-hidden="true"></div>
    <div class="dt-fx" id="dtFx"></div><div class="dt-flash"></div>
    <div class="dt-ui">
      ${isNew ? `<input class="text-in" id="nameIn" maxlength="14" placeholder="ตั้งชื่อผู้เล่นของคุณ" autocomplete="off" aria-label="ชื่อผู้เล่น">` : ''}
      <button class="dt-start" data-act="startGame">START</button>
    </div>
  </div>`;
};

/* ------------------------------ layout (from the real screen size) ------------------------------ */
function dtLayout(){
  const root = $('#dtRoot'), dr = $('#dtDragon'), kn = $('#dtKnight'), sh = $('#dtKShadow'); if(!root || !dr || !kn) return null;
  const W = root.clientWidth, H = root.clientHeight, land = W > H*1.05;
  const uiEl = root.querySelector('.dt-ui'), uiH = uiEl ? uiEl.offsetHeight + 34 : 120;
  let ks, ground, ax, sc, dBottom, hit, left;
  if(land){
    // logo + buttons on the left fifth · knight in the middle · dragon on the right, same floor
    ks = Math.min(3.2, H/300); ground = H - 16; ax = W*.42;
    sc = Math.min(H*.6/124, W*.42/142);
    dBottom = ground - 40*ks;
    hit = { x: ax + 72*ks, y: ground - 62*ks };
    left = Math.max(W - DT.fw*sc, hit.x + W*.1 - DT.mouth.x*sc);
  } else {
    // phone: knight bottom-left, dragon above-right → the fire dives down onto the blade
    ks = Math.min(W/240, (H - uiH)/380, 2.2); ground = H - uiH; ax = 50*ks + 4;
    sc = Math.min(W*.78/142, H*.3/124);
    dBottom = ground - 120*ks;
    hit = { x: ax + 50*ks, y: ground - 80*ks };
    left = Math.max(W - DT.fw*sc*.88, hit.x + 60 - DT.mouth.x*sc);
  }
  dr.style.transform = `translate(${left}px,${dBottom - DT.fh*sc}px) scale(${sc})`;
  kn.style.transform = `translate(${ax - DT.kn.ax*ks}px,${ground - DT.kn.fh*ks}px) scale(${ks})`;
  if(sh){ sh.style.width = 90*ks+'px'; sh.style.left = ax - 45*ks + 'px'; sh.style.top = ground - 7 + 'px'; }
  return { W, H, ks, sc, ground, ax, hit, mouth:{ x:left + DT.mouth.x*sc, y:dBottom - DT.fh*sc + DT.mouth.y*sc } };
}
window.addEventListener('resize', ()=>{ if(ui.screen==='title') dtLayout(); });

/* ------------------------------ the knight ------------------------------ */
function dtKnightPlay(name){
  const kn = $('#dtKnight'); if(!kn) return;
  const A = DT.kn[name], run = DT.run; kn._act = (kn._act||0) + 1; const me = kn._act;
  kn.style.backgroundImage = `url(heroes/knight/${name}.png)`; kn.style.backgroundSize = `${A.n*100}% 100%`;
  let k = 0;
  const step = ()=>{
    if(run!==DT.run || !kn.isConnected || kn._act!==me) return;
    if(name==='idle'){ kn.style.backgroundPosition = `${(k % A.n)/(A.n-1)*100}% 0`; k++; setTimeout(step, A.ms); return; }
    if(k >= A.n){ dtKnightPlay('idle'); return; }
    kn.style.backgroundPosition = `${k/(A.n-1)*100}% 0`; k++; setTimeout(step, A.ms);
  };
  step();
}

/* ------------------------------ the dragon loop ------------------------------ */
function dtStart(){
  const root = $('#dtRoot'), dr = $('#dtDragon'); if(!root || !dr || root._on) return;
  root._on = true; const run = ++DT.run; let i = 0;
  dtLayout(); dtKnightPlay('idle');
  const tick = ()=>{
    if(run!==DT.run || !dr.isConnected) return;
    const [f, ms, fire] = DT.seq[i];
    dr.style.backgroundPosition = `${f/(DT.frames-1)*100}% 0`;
    if(fire) dtFire(root, fire);
    root.classList.toggle('fire', f>=8 && f<=11);
    i = (i+1) % DT.seq.length;
    setTimeout(tick, ms);
  };
  tick();
}
// a sprite strip stepped from JS (frames are background positions)
function dtSprite(fx, S, scale, loopFrom){
  const el = document.createElement('div'); el.className = 'dt-spr';
  el.style.width = S.w*scale+'px'; el.style.height = S.h*scale+'px';
  el.style.backgroundImage = `url(${S.src})`; el.style.backgroundSize = `${S.n*100}% 100%`;
  fx.appendChild(el);
  let k = 0;
  el._step = ()=>{ el.style.backgroundPosition = `${k/(S.n-1)*100}% 0`; k++; if(k>=S.n) k = loopFrom===undefined ? S.n-1 : loopFrom; };
  el._step();
  return el;
}
function dtBurst(fx, x, y, scale, op){
  const b = dtSprite(fx, DT.burst, scale), bw = DT.burst.w*scale, bh = DT.burst.h*scale;
  b.style.transform = `translate(${x - bw/2}px,${y - bh/2}px)`; b.style.opacity = op||1;
  const bt = setInterval(()=>{ if(!b.isConnected) return clearInterval(bt); b._step(); }, 70);
  setTimeout(()=>{ clearInterval(bt); b.remove(); }, 70*DT.burst.n);
}
// n = 1, 2, 3 — the third fireball of a volley gets the knight's finisher
function dtFire(root, n){
  const fx = $('#dtFx'), L = dtLayout(); if(!fx || !L) return;
  const { mouth, hit, sc, ks } = L;
  const s = Math.min(sc*1.05, ks*1.5), ball = dtSprite(fx, DT.ball, s, 3), w = DT.ball.w*s, h = DT.ball.h*s;
  const dx = hit.x - mouth.x, dy = hit.y - mouth.y, dist = Math.hypot(dx, dy);
  const ang = Math.atan2(-dy, -dx)*180/Math.PI;            // the sprite's head points left → turn it toward the knight
  const T = Math.max(900, dist/DT.speed);
  const t = setInterval(()=>{ if(!ball.isConnected) return clearInterval(t); ball._step(); }, 80);
  try{ tone(150 + Math.random()*50, .3, 'sawtooth', .025); }catch(e){}
  const at = (p, sc2)=>`translate(${mouth.x + dx*p - w/2}px,${mouth.y + dy*p - h/2}px) rotate(${-ang}deg) scale(${sc2})`;
  ball.animate([{ transform:at(0,.45) },{ transform:at(.2,.9), offset:.2 },{ transform:at(1,1.1) }], { duration:T, easing:'linear', fill:'forwards' })
    .finished.catch(()=>{}).then(()=>{ clearInterval(t); ball.remove();
      if(!fx.isConnected) return;
      dtBurst(fx, hit.x, hit.y, ks*1.5);
      try{ tone(900, .06, 'square', .04); tone(300, .18, 'triangle', .05, .03); }catch(e){}
      const st = $('#dtRoot'); if(st && n===3){ st.animate([{ transform:'translate(0,0)' },{ transform:'translate(-5px,3px)' },{ transform:'translate(4px,-2px)' },{ transform:'translate(0,0)' }], { duration:260 }); } });
  // flash at the mouth
  dtBurst(fx, mouth.x - 10*sc, mouth.y, sc*.9, .8);
  // the knight swings so the blade lands as the fireball arrives
  const move = n===3 ? 'fin' : n===2 ? 'atk1' : 'atk3', A = DT.kn[move], lead = A.ms*(A.hit + .5), run = DT.run;
  setTimeout(()=>{ if(run===DT.run) dtKnightPlay(move); }, Math.max(0, T - lead));
}

/* ------------------------------ start ------------------------------ */
ACTS2.startGame = ()=>{
  try{ ctxA(); }catch(e){}
  if(save.name){ DT.run++; wantFull(); goTo('hub', 'rise'); sfx.tap && sfx.tap(2); return; }
  const inp = $('#nameIn'), n = ((inp && inp.value)||'').trim();
  if(!n){ toast('ใส่ชื่อฮีโร่ก่อนนะ'); inp && inp.focus(); return; }
  save.name = n; persist(); DT.run++; wantFull(); goTo('hub', 'rise');
  setTimeout(()=>toast(`ยินดีต้อนรับสู่ ${HUB_NAME.name}! 📜 ภารกิจแรกรออยู่`), 500);
};
// every launch opens on the title screen
if(ui.screen!=='battle') ui.screen = 'title';
