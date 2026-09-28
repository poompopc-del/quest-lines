/* ==========================================================================
   QUEST LINES v43 — DRAGON TITLE SCREEN
   Shown every time the game is opened.
     · new player    → name box + START
     · saved player  → START only
   A huge dragon leans in from the right edge of the screen and breathes
   fire in a loop, in front of the castle wall at night. v40: the starter
   hero (Elite Knight) stands bottom-left and slashes every fireball apart.
   The loop is slower, and the dragon sits further right to make room.
   v43: comedy — the knight panics and runs back and forth to dodge the first
   three fireballs (they blow up on the ground where he stood), walks back to
   his spot, squares up… and slashes the fourth one with his finisher.
   Sprites: title/dragon.png · fireball.png · burst.png
     Dragon from "Shrek: Hassle at the Castle" (GBA) — ripped by A.J. Nitro.
   v62: the game is now LETTERⁿ (logo: title/logo.webp, transparent).
   Every fireball that bursts drops a letter tile — W · O · R · D. When the
   fourth one is slashed, the four tiles float up and line up into "WORD",
   stream into the knight's greatsword, and its aura grows until his finisher
   sends a giant slash wave across the screen into the dragon.
   ========================================================================== */
const DT = {
  fw:142, fh:124, frames:18,              // dragon strip: 18 frames of 142×124, anchored bottom-right
  mouth:{ x:14, y:72 },                   // mouth in frame units (fire starts here)
  // the loop: [strip frame, ms, fire?]
  seq:[ [0,260],[1,260],[2,260],[1,260],[0,260],[1,260],[2,260],[1,260],
        [3,190],[4,190],[5,210],
        [6,220],[7,220],[8,190,1],[9,190],[10,190],[9,190],[10,190,2],[9,190],[10,190],[9,190],[10,190,3],
        [9,190],[10,190],[9,190],[10,190],[9,190],[10,190],[9,190],[10,190,4],[9,190],[10,190],[9,220],[11,300],[0,260,0,1],
        [12,180],[13,180],[14,180],[15,180],[16,200],[17,300] ],
  // the knight (starter hero) — strips from heroes/knight/: 216×112 frames, feet at x=70
  kn:{ fw:216, fh:112, ax:70, idle:{ n:4, ms:380 }, walk:{ n:8, ms:70 }, atk3:{ n:5, ms:150, hit:2 }, atk1:{ n:5, ms:150, hit:2 }, fin:{ n:7, ms:160, hit:3 } },
  // v43: fireballs 1–3 are dodged (the knight panics and runs back and forth), #4 is slashed
  k:{ spot:'home', face:1, x:null, moving:false },
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
  .dt-logo{position:absolute;left:50%;top:max(10px,env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(78vw,44vh,520px);pointer-events:none;filter:drop-shadow(0 0 18px rgba(150,80,255,.35));
    animation:dtLogo 3.2s ease-in-out infinite}
  @keyframes dtLogo{50%{transform:translateX(-50%) translateY(-6px)}}
  .dt-dragon{position:absolute;left:0;top:0;width:142px;height:124px;transform-origin:0 0;
    background:url(title/dragon.png) 0 0 / 1800% 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
  .dt-knight{position:absolute;left:0;top:0;width:216px;height:112px;transform-origin:0 0;background:url(heroes/knight/idle.png) 0 0 / 400% 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}
  .dt-emote{position:absolute;left:0;top:0;font:900 26px/1 var(--hand);color:#fff;text-shadow:0 2px 0 #000,0 0 8px rgba(0,0,0,.7);pointer-events:none;white-space:nowrap}
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
  .dt-logo{width:min(92vw,40vh,560px)}
  /* v62: letter tiles W-O-R-D, the charged sword, the slash wave, the dragon getting hit */
  .dt-letter{position:absolute;left:0;top:0;display:grid;place-items:center;border-radius:18%;pointer-events:none;will-change:transform;
    font:900 var(--ls,32px)/1 Kanit,system-ui,sans-serif;color:#2a1640;background:linear-gradient(180deg,#fffaf0,#f1dfbf);
    border:3px solid #1b0f2a;box-shadow:inset 0 -5px 0 rgba(120,80,40,.28),0 4px 0 #1b0f2a,0 0 14px rgba(170,110,255,.55)}
  .dt-letter.lit{color:#fff;background:linear-gradient(180deg,#d9b8ff,#8f4dff 60%,#5a22c9);border-color:#fff;
    box-shadow:inset 0 -5px 0 rgba(40,0,90,.35),0 4px 0 #1b0f2a,0 0 26px #b77dff,0 0 48px rgba(183,125,255,.7);text-shadow:0 2px 0 #3a0f7a}
  .dt-knight.charged{animation:dtCharge .18s linear infinite}
  @keyframes dtCharge{0%,100%{filter:drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px #b77dff) drop-shadow(0 0 36px #ffc83d)}
    50%{filter:drop-shadow(0 0 10px #fff) drop-shadow(0 0 28px #b77dff) drop-shadow(0 0 60px #ffc83d)}}
  .dt-aura{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;mix-blend-mode:screen;
    background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(200,140,255,.55) 40%,rgba(255,200,61,.25) 65%,transparent)}
  .dt-wave{position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;will-change:transform}
  .dt-bigtxt{position:absolute;left:0;top:0;font:italic 900 var(--bs,40px)/1 var(--hand);color:#fff;letter-spacing:3px;white-space:nowrap;pointer-events:none;
    text-shadow:0 3px 0 #3a0f7a,0 0 18px #b77dff,0 0 34px #ffc83d}
  @media (orientation:landscape){
    .dt-logo{left:20%;top:44%;transform:translate(-50%,-62%);width:min(38vw,62vh,600px);animation:none}
    .dt-ui{left:20%;right:auto;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px))}
  }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  [DT.ball.src, DT.burst.src, 'title/dragon.png', 'title/logo.webp', 'heroes/knight/idle.png', 'heroes/knight/walk.png', 'heroes/knight/atk3.png', 'heroes/knight/atk1.png', 'heroes/knight/fin.png'].forEach(s=>{ const i = new Image(); i.src = s; });
})();

renderTitle = function(){
  const isNew = !save.name;
  const embers = Array.from({ length:14 }, (_, k)=>`<i style="left:${(k*37+11)%100}%;animation-duration:${5+(k%5)}s;animation-delay:${(k*.73)%6}s"></i>`).join('');
  setTimeout(dtStart, 0);
  return `<div class="dt" id="dtRoot">
    <div class="dt-wall"></div><div class="dt-glow"></div><div class="dt-embers">${embers}</div>
    <img class="dt-logo" src="title/logo.webp" alt="LETTERⁿ">
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
    // logo + buttons on the left fifth · knight in the middle · a big dragon on the right, same floor
    ks = Math.min(3.2, H/300); ground = H - 16; ax = W*.40;
    sc = Math.min(H*.72/124, W*.5/142);
    dBottom = ground - 16*ks;
    hit = { x: ax + 72*ks, y: ground - 62*ks };
    left = Math.max(W - DT.fw*sc*.92, hit.x + W*.08 - DT.mouth.x*sc);
  } else {
    // phone: knight bottom-left standing just above the name box / START button, a dragon above-right
    // (v42: smaller so nothing hides behind the buttons, and the dragon shows more of its body)
    const uiTop = uiEl ? uiEl.getBoundingClientRect().top - root.getBoundingClientRect().top : H - 150;
    ground = Math.min(H - 110, uiTop - 14);
    ks = Math.min(W/300, ground/470, 1.6); ax = 50*ks + 6;
    sc = Math.min(W*.74/142, H*.27/124, (ground - 150*ks)/124);
    dBottom = ground - 96*ks;
    hit = { x: ax + 40*ks, y: ground - 84*ks };
    left = Math.max(W - DT.fw*sc, hit.x + 26 - DT.mouth.x*sc);
  }
  dr.style.transform = `translate(${left}px,${dBottom - DT.fh*sc}px) scale(${sc})`;
  // where he runs to when dodging: under the dragon, toward the middle
  const far = land ? ax + Math.min(W*.14, 130*ks) : Math.min(W*.62, ax + 150*ks);
  const L = DT.L = { W, H, ks, sc, ground, ax, far, hit, mouth:{ x:left + DT.mouth.x*sc, y:dBottom - DT.fh*sc + DT.mouth.y*sc } };
  if(!DT.k.moving) DT.k.x = DT.k.spot==='far' ? far : ax;
  dtKPlace();
  return L;
}
window.addEventListener('resize', ()=>{ if(ui.screen==='title') dtLayout(); });

/* ------------------------------ the knight ------------------------------ */
function dtKPlace(){
  const kn = $('#dtKnight'), sh = $('#dtKShadow'), L = DT.L; if(!kn || !L) return;
  const { ks, ground } = L, x = DT.k.x, f = DT.k.face;
  // facing left = mirrored around the feet
  kn.style.transform = f > 0 ? `translate(${x - DT.kn.ax*ks}px,${ground - DT.kn.fh*ks}px) scale(${ks})`
                             : `translate(${x + DT.kn.ax*ks}px,${ground - DT.kn.fh*ks}px) scale(${-ks},${ks})`;
  if(sh){ sh.style.width = 90*ks+'px'; sh.style.left = x - 45*ks + 'px'; sh.style.top = ground - 7 + 'px'; }
}
function dtEmote(txt, ms){
  const fx = $('#dtFx'), L = DT.L; if(!fx || !L) return;
  const e = document.createElement('div'); e.className = 'dt-emote'; e.textContent = txt; fx.appendChild(e);
  e.style.fontSize = Math.round(16 + 7*L.ks) + 'px';
  const x = DT.k.x + (txt==='💦' ? -10*L.ks : 6*L.ks), y = L.ground - 96*L.ks;
  e.animate([{ transform:`translate(${x}px,${y}px) scale(.3)`, opacity:0 },{ transform:`translate(${x}px,${y - 14}px) scale(1.2)`, opacity:1, offset:.2 },{ transform:`translate(${x}px,${y - 24}px) scale(1)`, opacity:1, offset:.75 },{ transform:`translate(${x}px,${y - 34}px) scale(1)`, opacity:0 }],
    { duration:ms||700, easing:'ease-out' }).finished.catch(()=>{}).then(()=>e.remove());
}
// run (fast, arms flailing) or walk back — the walk strip plays and he faces where he goes
function dtKRun(spot, ms, then){
  const L = DT.L, run = DT.run; if(!L) return;
  const from = DT.k.x, to = spot==='far' ? L.far : L.ax; if(Math.abs(to - from) < 2){ DT.k.spot = spot; then && then(); return; }
  DT.k.face = to > from ? 1 : -1; DT.k.moving = true; DT.k.spot = spot;
  dtKnightPlay('walk');
  const t0 = performance.now();
  const step = now=>{
    if(run!==DT.run) return;
    const p = Math.min(1, (now - t0)/ms), e = p<.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2)/2;
    DT.k.x = from + (to - from)*e; dtKPlace();
    if(p < 1){ requestAnimationFrame(step); return; }
    DT.k.moving = false; dtKnightPlay('idle'); then && then();
  };
  requestAnimationFrame(step);
}
function dtKnightPlay(name){
  const kn = $('#dtKnight'); if(!kn) return;
  const A = DT.kn[name], run = DT.run; kn._act = (kn._act||0) + 1; const me = kn._act;
  kn.style.backgroundImage = `url(heroes/knight/${name}.png)`; kn.style.backgroundSize = `${A.n*100}% 100%`;
  let k = 0;
  const step = ()=>{
    if(run!==DT.run || !kn.isConnected || kn._act!==me) return;
    if(name==='idle' || name==='walk'){ kn.style.backgroundPosition = `${(k % A.n)/(A.n-1)*100}% 0`; k++; setTimeout(step, A.ms); return; }
    if(k >= A.n){ dtKnightPlay('idle'); return; }
    kn.style.backgroundPosition = `${k/(A.n-1)*100}% 0`; k++; setTimeout(step, A.ms);
  };
  step();
}

/* ------------------------------ the dragon loop ------------------------------ */
function dtStart(){
  const root = $('#dtRoot'), dr = $('#dtDragon'); if(!root || !dr || root._on) return;
  root._on = true; const run = ++DT.run; let i = 0;
  DT.k = { spot:'home', face:1, x:null, moving:false };
  DT.hold = false; DT.letters = []; let bob = 0;
  dtLayout(); dtKnightPlay('idle');
  const tick = ()=>{
    if(run!==DT.run || !dr.isConnected) return;
    if(i===0) dtClearLetters();
    // v62: after the volley the dragon hovers until the WORD slash has hit it
    if(DT.seq[i][3] && DT.hold){ dr.style.backgroundPosition = `${[0,1,2,1][bob++ % 4]/(DT.frames-1)*100}% 0`; root.classList.remove('fire'); setTimeout(tick, 260); return; }
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
  const { mouth, sc, ks } = L, dodge = n < 4;
  // 1–3 are aimed at his feet (where he is heading); 4 meets the blade
  const tx = DT.k.spot==='far' ? L.far : L.ax, hit = dodge ? { x: tx + 8*ks, y: L.ground - 6*ks } : L.hit;
  const s = Math.min(sc*1.05, ks*1.5), ball = dtSprite(fx, DT.ball, s, 3), w = DT.ball.w*s, h = DT.ball.h*s;
  const dx = hit.x - mouth.x, dy = hit.y - mouth.y, dist = Math.hypot(dx, dy);
  const T = Math.max(1000, dist/DT.speed);
  // a real throw: launched from the mouth, pulled down by gravity, lands on the blade at time T.
  // p(t) = m + v·t + ½·g·t²  →  v = (d − ½·g·T²) / T.  The sprite's round head points left, so it is
  // turned every frame to face its velocity (v + g·t): the tail of flame always trails behind.
  const g = .0005 * (L.H/800), vx = dx/T, vy = (dy - .5*g*T*T)/T;
  try{ tone(150 + Math.random()*50, .3, 'sawtooth', .025); }catch(e){}
  const t = setInterval(()=>{ if(!ball.isConnected) return clearInterval(t); ball._step(); }, 80);
  const t0 = performance.now();
  const fly = now=>{
    if(!ball.isConnected) return;
    const tt = Math.min(T, now - t0), p = tt/T;
    const x = mouth.x + vx*tt, y = mouth.y + vy*tt + .5*g*tt*tt;
    const ang = Math.atan2(-(vy + g*tt), -vx)*180/Math.PI;      // head (−x of the sprite) → along the velocity
    const grow = p < .2 ? .45 + p/.2*.5 : .95 + (p-.2)*.2;
    ball.style.transform = `translate(${x - w*.3}px,${y - h/2}px) rotate(${ang}deg) scale(${grow})`;
    if(tt < T){ requestAnimationFrame(fly); return; }
    clearInterval(t); ball.remove();
    if(!fx.isConnected) return;
    if(dodge){                                                   // missed! it blows up on the floor
      dtBurst(fx, hit.x, hit.y - 18*ks, ks*1.9); setTimeout(()=>fx.isConnected && dtBurst(fx, hit.x + 22*ks, hit.y - 10*ks, ks*1.1, .9), 90);
      try{ tone(120, .25, 'sawtooth', .05); }catch(e){}
      dtLetter(n-1, hit.x, hit.y - 18*ks);                        // …and a letter tumbles out of the flames
      return;
    }
    dtBurst(fx, hit.x, hit.y, ks*1.5);
    dtLetter(3, hit.x, hit.y);
    try{ tone(900, .06, 'square', .04); tone(300, .18, 'triangle', .05, .03); }catch(e){}
    const st = $('#dtRoot'); if(st){ st.animate([{ transform:'translate(0,0)' },{ transform:'translate(-5px,3px)' },{ transform:'translate(4px,-2px)' },{ transform:'translate(0,0)' }], { duration:260 }); }
  };
  ball.style.transformOrigin = '30% 50%';                      // turn around the round head, not the tail
  requestAnimationFrame(fly);
  // flash at the mouth
  dtBurst(fx, mouth.x - 10*sc, mouth.y, sc*.9, .8);
  const run = DT.run, ok = ()=>run===DT.run;
  if(dodge){
    // "!" → panic → sprint the other way with a drop of sweat
    setTimeout(()=>{ if(ok()) dtEmote('!', 650); }, 80);
    setTimeout(()=>{ if(!ok()) return; dtEmote('💦', 700); dtKRun(DT.k.spot==='far' ? 'home' : 'far', 430); }, T*.42);
    if(n===3) setTimeout(()=>{ if(!ok()) return;                // phew… back to his spot, turn around, square up
      dtKRun('home', 650, ()=>{ if(!ok()) return; DT.k.face = 1; dtKPlace(); dtEmote('😤', 900); }); }, T + 220);
    return;
  }
  // the knight swings so the blade lands as the fireball arrives (atk3 here — the finisher is saved for the dragon)
  DT.hold = true;
  const A = DT.kn.atk3, lead = A.ms*(A.hit + .5);
  setTimeout(()=>{ if(!ok()) return; DT.k.face = 1; dtKPlace(); dtKnightPlay('atk3'); }, Math.max(0, T - lead));
}

/* ------------------------------ v62: W · O · R · D ------------------------------ */
const DT_WORD = 'WORD';
function dtClearLetters(){ (DT.letters||[]).forEach(l=>l.el.remove()); DT.letters = []; $('#dtFx') && $('#dtFx').querySelectorAll('.dt-letter,.dt-aura,.dt-wave,.dt-bigtxt').forEach(e=>e.remove()); }
function dtTileSize(){ const L = DT.L; return Math.round(Math.max(34, Math.min(60, 26*L.ks + 12))); }
// a tile pops out of the burst, spins through the air and lands on the floor in its slot
function dtLetter(k, x, y){
  const fx = $('#dtFx'), L = DT.L; if(!fx || !L) return;
  const s = dtTileSize(), el = document.createElement('div');
  el.className = 'dt-letter'; el.textContent = DT_WORD[k]; el.style.width = el.style.height = s+'px'; el.style.setProperty('--ls', Math.round(s*.66)+'px');
  fx.appendChild(el);
  const gap = s*.35, x0 = L.ax + 34*L.ks, span = Math.max(4*s + 3*gap, Math.min(L.W*.5, (L.mouth.x - x0)*.8));
  const tx = x0 + span*(k/3) , ty = L.ground - s - 2;
  const peak = Math.min(y, ty) - 70*L.ks - 30, spin = (k%2 ? -1 : 1)*360;
  const P = (px, py, r, sc)=>`translate(${px - s/2}px,${py}px) rotate(${r}deg) scale(${sc})`;
  el.animate([{ transform:P(x, y - s/2, 0, .2), opacity:0 },{ transform:P((x+tx)/2, peak, spin*.6, 1.1), opacity:1, offset:.45 },
              { transform:P(tx, ty, spin, 1), offset:.82 },{ transform:P(tx, ty - 10, spin, 1), offset:.9 },{ transform:P(tx, ty, spin, 1) }],
    { duration:900, easing:'cubic-bezier(.3,.6,.4,1)', fill:'forwards' });
  try{ tone(520 + k*130, .12, 'triangle', .04); }catch(e){}
  const L0 = { el, x:tx, y:ty, s };
  DT.letters = (DT.letters||[]).filter(l=>l.el.isConnected); DT.letters[k] = L0;
  if(k===3) setTimeout(()=>dtSpell(DT.run), 1250);
}
// the four tiles rise and line up → WORD → they stream into the sword → the aura slash hits the dragon
function dtSpell(run){
  const fx = $('#dtFx'), L = DT.L, ok = ()=>run===DT.run && fx && fx.isConnected;
  if(!ok() || !L) return;
  const tiles = DT.letters.filter(Boolean); if(tiles.length < 4){ DT.hold = false; return; }
  const s = tiles[0].s, gap = s*.18, rowW = 4*s + 3*gap;
  const cx = Math.min(L.W - rowW/2 - 12, Math.max(rowW/2 + 12, (L.ax + L.mouth.x)/2)), ry = Math.max(L.H*.36, Math.min(L.mouth.y - 20*L.ks, L.ground - 150*L.ks));
  const P = (px, py, sc)=>`translate(${px - s/2}px,${py}px) scale(${sc})`;
  tiles.forEach((t, k)=>{
    const rx = cx - rowW/2 + s/2 + k*(s + gap);
    setTimeout(()=>{ if(!ok()) return;
      t.el.getAnimations().forEach(a=>a.cancel());
      t.el.animate([{ transform:P(t.x, t.y, 1) },{ transform:P((t.x+rx)/2, ry - 40, 1.15), offset:.6 },{ transform:P(rx, ry, 1.25) }], { duration:700, easing:'cubic-bezier(.25,.8,.3,1)', fill:'forwards' });
      t.x = rx; t.y = ry;
      setTimeout(()=>{ if(!ok()) return; t.el.classList.add('lit'); try{ tone(660 + k*110, .14, 'square', .03); }catch(e){} }, 650);
    }, k*140);
  });
  // WORD! — hold, then the tiles zip into the blade one by one
  const sword = { x: DT.k.x + 60*L.ks, y: L.ground - 78*L.ks };
  setTimeout(()=>{ if(!ok()) return;
    tiles.forEach(t=>t.el.animate([{ transform:P(t.x, t.y, 1.25) },{ transform:P(t.x, t.y - 6, 1.45) },{ transform:P(t.x, t.y, 1.25) }], { duration:380, fill:'forwards' }));
    dtBig('WORD!', cx, ry - s*.9, 360);
  }, 4*140 + 750);
  const zipAt = 4*140 + 1350;
  tiles.forEach((t, k)=>setTimeout(()=>{ if(!ok()) return;
    t.el.animate([{ transform:P(t.x, t.y, 1.25), opacity:1 },{ transform:P(sword.x, sword.y, .2), opacity:.2 }], { duration:330, easing:'ease-in', fill:'forwards' });
    setTimeout(()=>{ t.el.remove(); dtCharge(k+1); }, 320);
  }, zipAt + k*120));
  // fully charged → the finisher
  setTimeout(()=>{ if(!ok()) return; dtSlash(run, sword); }, zipAt + 4*120 + 520);
}
function dtBig(txt, x, y, ms){
  const fx = $('#dtFx'), L = DT.L; if(!fx || !L) return;
  const e = document.createElement('div'); e.className = 'dt-bigtxt'; e.textContent = txt; e.style.setProperty('--bs', Math.round(26 + 8*L.ks)+'px'); fx.appendChild(e);
  const w = e.offsetWidth;
  e.animate([{ transform:`translate(${x - w/2}px,${y}px) scale(.4)`, opacity:0 },{ transform:`translate(${x - w/2}px,${y - 10}px) scale(1.15)`, opacity:1, offset:.25 },
             { transform:`translate(${x - w/2}px,${y - 14}px) scale(1)`, opacity:1, offset:.8 },{ transform:`translate(${x - w/2}px,${y - 24}px) scale(1)`, opacity:0 }], { duration:ms*3, easing:'ease-out', fill:'forwards' })
    .finished.catch(()=>{}).then(()=>e.remove());
}
// the sword's aura grows with every letter it swallows
function dtCharge(n){
  const fx = $('#dtFx'), L = DT.L, kn = $('#dtKnight'); if(!fx || !L) return;
  let a = fx.querySelector('.dt-aura'); if(!a){ a = document.createElement('div'); a.className = 'dt-aura'; fx.appendChild(a); }
  const r = (40 + n*34)*L.ks, x = DT.k.x + 40*L.ks, y = L.ground - 70*L.ks;
  a.style.width = a.style.height = 2*r+'px';
  a.animate([{ transform:`translate(${x - r}px,${y - r}px) scale(.8)`, opacity:.5 },{ transform:`translate(${x - r}px,${y - r}px) scale(1.05)`, opacity:.95 },{ transform:`translate(${x - r}px,${y - r}px) scale(1)`, opacity:.8 }],
    { duration:300, fill:'forwards' });
  if(kn) kn.classList.add('charged');
  try{ tone(300 + n*120, .18, 'sawtooth', .03); }catch(e){}
}
function dtSlash(run, sword){
  const fx = $('#dtFx'), L = DT.L, kn = $('#dtKnight'), dr = $('#dtDragon'), ok = ()=>run===DT.run && fx && fx.isConnected;
  if(!ok() || !L) return;
  DT.k.face = 1; dtKPlace(); dtKnightPlay('fin');
  const A = DT.kn.fin;
  setTimeout(()=>{ if(!ok()) return;
    const a = fx.querySelector('.dt-aura'); if(a) a.animate([{ opacity:.9 },{ opacity:0 }], { duration:250, fill:'forwards' }).finished.catch(()=>{}).then(()=>a.remove());
    kn && kn.classList.remove('charged');
    // a giant crescent of light sweeps across into the dragon's head
    const h = Math.min(L.H*.7, 260*L.ks), w = h*.55, wave = document.createElement('div'); wave.className = 'dt-wave';
    wave.style.width = w+'px'; wave.style.height = h+'px';
    wave.innerHTML = `<svg viewBox="0 0 55 100" width="100%" height="100%"><defs><linearGradient id="dtWg" x1="0" x2="1"><stop offset="0" stop-color="#b77dff" stop-opacity="0"/><stop offset=".55" stop-color="#d9b8ff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
      <path d="M8,2 Q60,50 8,98 Q38,50 8,2 Z" fill="url(#dtWg)"/><path d="M14,10 Q52,50 14,90" stroke="#ffe7a0" stroke-width="3" fill="none" opacity=".9"/></svg>`;
    fx.appendChild(wave);
    const tx = L.mouth.x + 40*L.sc, ty = L.mouth.y, x0 = sword.x, y0 = L.ground - 70*L.ks;
    wave.animate([{ transform:`translate(${x0 - w/2}px,${y0 - h/2}px) scale(.5)`, opacity:.2 },{ transform:`translate(${x0 + 20 - w/2}px,${y0 - h/2}px) scale(1)`, opacity:1, offset:.15 },
                  { transform:`translate(${tx - w/2}px,${ty - h/2}px) scale(1.35)`, opacity:1 }], { duration:420, easing:'cubic-bezier(.4,0,.9,.6)', fill:'forwards' })
      .finished.catch(()=>{}).then(()=>{ wave.animate([{ opacity:1, transform:`translate(${tx - w/2}px,${ty - h/2}px) scale(1.35)` },{ opacity:0, transform:`translate(${tx + 40 - w/2}px,${ty - h/2}px) scale(1.9)` }], { duration:260, fill:'forwards' }).finished.catch(()=>{}).then(()=>wave.remove()); dtDragonHit(run); });
    try{ tone(180, .4, 'sawtooth', .06); tone(1200, .08, 'square', .03, .05); }catch(e){}
  }, A.ms*A.hit);
}
function dtDragonHit(run){
  const fx = $('#dtFx'), L = DT.L, dr = $('#dtDragon'), root = $('#dtRoot'), ok = ()=>run===DT.run && fx && fx.isConnected;
  if(!ok() || !L) return;
  const hx = L.mouth.x + 45*L.sc, hy = L.mouth.y - 10*L.sc;
  [[0,0,1.6],[30,-26,1.1],[-10,24,1.2],[50,10,1]].forEach(([dx,dy,k], i)=>setTimeout(()=>ok() && dtBurst(fx, hx + dx*L.sc/2, hy + dy*L.sc/2, L.sc*.55*k), i*80));
  if(dr){
    dr.animate([{ translate:'0 0', filter:'brightness(3) saturate(0)' },{ translate:`${24*L.sc/3}px ${-6*L.sc/3}px`, filter:'brightness(2.2) saturate(.3)', offset:.2 },
                { translate:`${34*L.sc/3}px 0`, filter:'brightness(1)', offset:.5 },{ translate:'0 0', filter:'brightness(1)' }], { duration:900, easing:'ease-out' });
  }
  if(root) root.animate([{ transform:'translate(0,0)' },{ transform:'translate(-9px,5px)' },{ transform:'translate(7px,-4px)' },{ transform:'translate(-4px,2px)' },{ transform:'translate(0,0)' }], { duration:380 });
  dtBig('CRITICAL!', hx - 20*L.sc, hy - 70*L.sc/2, 320);
  try{ tone(90, .5, 'sawtooth', .08); tone(60, .6, 'square', .05, .1); }catch(e){}
  setTimeout(()=>{ if(!ok()) return; dtEmote('😎', 1000); }, 600);
  setTimeout(()=>{ if(run===DT.run) DT.hold = false; }, 1100);     // the dragon reels back (frames 12–17) and the loop starts again
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
