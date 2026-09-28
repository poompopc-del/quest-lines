/* ==========================================================================
   QUEST LINES v39 — DRAGON TITLE SCREEN
   Shown every time the game is opened.
     · new player    → name box + START
     · saved player  → START only
   A huge dragon leans in from the right edge of the screen and breathes
   fire in a loop, in front of the castle wall at night.
   Sprites: title/dragon.png · fireball.png · burst.png
     Dragon from "Shrek: Hassle at the Castle" (GBA) — ripped by A.J. Nitro.
   Logo: title/logo.jpg (blended onto the scene with mix-blend-mode:screen)
   ========================================================================== */
const DT = {
  fw:142, fh:124, frames:18,              // dragon strip: 18 frames of 142×124, anchored bottom-right
  mouth:{ x:14, y:72 },                   // mouth in frame units (fire starts here)
  // the loop: [strip frame, ms, fire?]
  seq:[ [0,170],[1,170],[2,170],[1,170],[0,170],[1,170],[2,170],[1,170],
        [3,120],[4,120],[5,130],
        [6,140],[7,140],[8,110,1],[9,110],[10,110,1],[9,110],[10,110,1],[9,110],[10,110],[9,130],[11,160],
        [12,110],[13,110],[14,110],[15,110],[16,120],[17,160] ],
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
  .dt-dragon{position:absolute;right:0;bottom:calc(128px + env(safe-area-inset-bottom,0px));height:min(56vh,calc(100vw * 124 / 142));aspect-ratio:142/124;
    background:url(title/dragon.png) 0 0 / 1800% 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
  .dt-fx{position:absolute;inset:0;pointer-events:none}
  .dt-spr{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;will-change:transform}
  .dt-ui{position:absolute;left:0;right:0;bottom:calc(22px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 18px;z-index:2}
  .dt-ui .text-in{width:min(320px,86vw);text-align:center;font-size:18px;background:rgba(8,8,20,.78);border:2px solid rgba(255,190,90,.7);color:#fff;border-radius:12px;padding:12px 14px}
  .dt-start{min-width:min(300px,80vw);padding:14px 30px;border:0;border-radius:14px;cursor:pointer;font:italic 900 30px/1 var(--hand);letter-spacing:4px;color:#2a1204;
    background:linear-gradient(180deg,#fff2b0 0%,#ffc23a 45%,#e0761a 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.6),inset 0 -6px 0 rgba(120,40,0,.35),0 6px 0 #3a1606,0 0 30px rgba(255,150,40,.55);
    animation:dtPulse 1.6s ease-in-out infinite}
  .dt-start:active{transform:translateY(4px);box-shadow:inset 0 3px 0 rgba(255,255,255,.6),0 2px 0 #3a1606}
  @keyframes dtPulse{50%{box-shadow:inset 0 3px 0 rgba(255,255,255,.6),inset 0 -6px 0 rgba(120,40,0,.35),0 6px 0 #3a1606,0 0 48px rgba(255,170,60,.9)}}
  @media (orientation:landscape){
    .dt-dragon{bottom:0;height:min(72vh,calc(58vw * 124 / 142))}
    .dt-logo{left:30%;top:50%;transform:translate(-50%,-62%);width:min(46vw,58vh,560px);animation:none}
    .dt-ui{left:30%;right:auto;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px))}
  }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  [DT.ball.src, DT.burst.src, 'title/dragon.png', 'title/logo.jpg'].forEach(s=>{ const i = new Image(); i.src = s; });
})();

renderTitle = function(){
  const isNew = !save.name;
  const embers = Array.from({ length:14 }, (_, k)=>`<i style="left:${(k*37+11)%100}%;animation-duration:${5+(k%5)}s;animation-delay:${(k*.73)%6}s"></i>`).join('');
  setTimeout(dtStart, 0);
  return `<div class="dt" id="dtRoot">
    <div class="dt-wall"></div><div class="dt-glow"></div><div class="dt-embers">${embers}</div>
    <img class="dt-logo" src="title/logo.jpg" alt="Quest Lines — Word Battle RPG">
    <div class="dt-dragon" id="dtDragon" aria-hidden="true"></div>
    <div class="dt-fx" id="dtFx"></div><div class="dt-flash"></div>
    <div class="dt-ui">
      ${isNew ? `<input class="text-in" id="nameIn" maxlength="14" placeholder="ตั้งชื่อผู้เล่นของคุณ" autocomplete="off" aria-label="ชื่อผู้เล่น">` : ''}
      <button class="dt-start" data-act="startGame">START</button>
    </div>
  </div>`;
};

/* ------------------------------ the dragon loop ------------------------------ */
function dtStart(){
  const root = $('#dtRoot'), dr = $('#dtDragon'); if(!root || !dr || root._on) return;
  root._on = true; const run = ++DT.run; let i = 0;
  const tick = ()=>{
    if(run!==DT.run || !dr.isConnected) return;
    const [f, ms, fire] = DT.seq[i];
    dr.style.backgroundPosition = `${f/(DT.frames-1)*100}% 0`;
    if(fire) dtFire(root, dr);
    root.classList.toggle('fire', f>=7 && f<=11);
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
function dtFire(root, dr){
  const fx = $('#dtFx'); if(!fx) return;
  const R = dr.getBoundingClientRect(), P = root.getBoundingClientRect(), sc = R.height/DT.fh;
  const mx = R.left - P.left + DT.mouth.x*sc, my = R.top - P.top + DT.mouth.y*sc;
  const s = sc*1.25, ball = dtSprite(fx, DT.ball, s, 3), w = DT.ball.w*s, h = DT.ball.h*s;
  const endX = -w - 40, dist = mx - endX, drift = (Math.random()-.5)*sc*30;
  const t = setInterval(()=>{ if(!ball.isConnected) return clearInterval(t); ball._step(); }, 70);
  try{ tone(160 + Math.random()*60, .25, 'sawtooth', .025); }catch(e){}
  ball.animate([{ transform:`translate(${mx - w*.15}px,${my - h/2}px) scale(.5)` },{ transform:`translate(${mx - dist*.25}px,${my - h/2 + drift*.3}px) scale(1)`, offset:.25 },{ transform:`translate(${endX}px,${my - h/2 + drift}px) scale(1.15)` }],
    { duration:Math.max(700, dist/1.1), easing:'linear', fill:'forwards' }).finished.catch(()=>{}).then(()=>{ clearInterval(t); ball.remove(); });
  // an explosion where the fire leaves the mouth
  const bs = sc*1.1, b = dtSprite(fx, DT.burst, bs), bw = DT.burst.w*bs, bh = DT.burst.h*bs;
  b.style.transform = `translate(${mx - bw*.8}px,${my - bh/2}px)`; b.style.opacity = '.85';
  const bt = setInterval(()=>{ if(!b.isConnected) return clearInterval(bt); b._step(); }, 60);
  setTimeout(()=>{ clearInterval(bt); b.remove(); }, 60*DT.burst.n);
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
