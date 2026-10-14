/* Quest Lines — Platformer mode (round 1)
   Keyboard play. Hero = Shovel Knight frames from heroes/shovel/atlas.{png,json}.
   Swap the hero: replace the atlas + anims; everything else only uses the names below. */
(() => {
'use strict';
const W = 384, H = 216, T = 24, ROWS = 9;
const GRAV = .36, MAXFALL = 8, SPEED = 1.7, JUMP = 7.1, POGO = 6.6;
const ATK_STEP = 3, ATK_FRAMES = 5;            // 3 steps per frame · active on the last 2 frames
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* ---------------------------------- input ---------------------------------- */
const keys = {}, pressed = {};
const K = { left:['ArrowLeft','KeyA'], right:['ArrowRight','KeyD'], down:['ArrowDown','KeyS'],
            jump:['Space','ArrowUp','KeyW','KeyK'], atk:['KeyJ','KeyX','KeyZ'], dash:['ShiftLeft','ShiftRight','KeyL'], spin:['KeyU','KeyC'], wand:['KeyI','KeyV'], restart:['KeyR'], ok:['Enter'] };
addEventListener('keydown', e => {
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const held = a => K[a].some(c => keys[c]);
const tap  = a => K[a].some(c => pressed[c]);

/* ---------------------------------- levels --------------------------------- */
// tiles: 1 ground · 2 brick · 3 spikes.  slimes: [col, solidRow] (stands on top of that row)
const LEVELS = [
  { name:'1  MEADOW GATE', w:80, pits:[[22,23],[44,45],[58,59]],
    plats:[[14,5,3],[28,5,3],[32,4,3],[36,5,3],[48,5,4],[52,4,3],[66,5,3],[70,4,3]],
    spikes:[38,39], slimes:[[10,7],[18,7],[29,5],[40,7],[49,5],[56,7],[67,5],[72,7]],
    coins:[[15,4],[16,4],[29,4],[33,3],[34,3],[49,4],[50,4],[53,3],[67,4],[71,3],[26,6],[41,6],[62,6]], goal:77 },
  { name:'2  BRICK RUINS', w:90, pits:[[16,17],[30,31],[42,43],[56,57],[70,71]],
    plats:[[10,5,3],[20,5,2],[24,4,3],[34,5,3],[38,4,3],[46,5,3],[50,4,3],[60,5,3],[64,4,3],[74,5,3]],
    spikes:[26,27,28,52,53,66,67], slimes:[[8,7],[14,7],[21,5],[25,4],[35,5],[39,4],[47,5],[48,7],[61,5],[65,4],[76,7],[80,7]],
    coins:[[11,4],[21,4],[25,3],[35,4],[39,3],[47,4],[51,3],[61,4],[65,3],[75,4],[18,6],[44,6],[58,6]], goal:87 }
];

/* --------------------------------- assets ---------------------------------- */
const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing ' + src)); i.src = src; });
let ATLAS, ATIMG, SLIME;
Promise.all([ fetch('heroes/shovel/atlas.json').then(r => r.json()), load('heroes/shovel/atlas.png'), load('enemies/slime_green.png') ])
  .then(([a, i, s]) => { ATLAS = a; ATIMG = i; SLIME = s; start(); })
  .catch(err => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f66'; ctx.font = '12px monospace'; ctx.fillText(String(err.message), 10, 20); });

/* ---------------------------------- state ---------------------------------- */
let L, G, P, enemies, coins, parts, shots, fxs, cam, mode, lvl = 0, bank = 0, time = 0, swingId = 0;

function build(spec) {
  const g = Array.from({ length: ROWS }, () => new Array(spec.w).fill(0));
  for (let x = 0; x < spec.w; x++) { if (spec.pits.some(p => x >= p[0] && x <= p[1])) continue; g[7][x] = 1; g[8][x] = 1; }
  spec.plats.forEach(([x, y, l]) => { for (let i = 0; i < l; i++) g[y][x + i] = 2; });
  spec.spikes.forEach(x => { if (g[7][x] === 1 && g[6][x] === 0) g[6][x] = 3; });
  return { w: spec.w, g, spec };
}
function load_level(n) {
  lvl = n % LEVELS.length; L = build(LEVELS[lvl]);
  enemies = L.spec.slimes.map(([c, r]) => ({ x: c * T + 4, y: r * T - 12, w: 16, h: 12, vx: Math.random() < .5 ? -.4 : .4, vy: 0, hp: 2, flash: 0, kb: 0, swing: -1, t: Math.random() * 50 }));
  coins = L.spec.coins.map(([c, r]) => ({ x: c * T + T / 2, y: r * T + T / 2, got: false }));
  parts = []; shots = []; fxs = []; cam = 0; time = 0; G = { got: 0, kills: 0 };
  P = { x: 2 * T, y: 5 * T, w: 14, h: 28, vx: 0, vy: 0, face: 1, onGround: false, hp: 4, inv: 0, hurtT: 0, atkT: -1, pogo: false, pogoGrace: 0,
        coyote: 0, buf: 0, jumping: false, dead: false, deadT: 0,
        mp: 100, dashT: 0, dashCd: 0, dashId: 0, airDash: true, spinT: 0, castT: 0 };
  mode = 'play';
}
function start() { load_level(0); last = performance.now(); requestAnimationFrame(loop); }

/* -------------------------------- collisions -------------------------------- */
function solid(tx, ty) {
  if (ty < 0) return false; if (tx < 0 || tx >= L.w) return true; if (ty >= ROWS) return false;
  const t = L.g[ty][tx]; return t === 1 || t === 2;
}
function moveX(e, dx) {
  if (!dx) return; e.x += dx; e.hitX = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - .01) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - .01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) { e.x = dx > 0 ? tx * T - e.w : (tx + 1) * T; e.hitX = true; e.vx = e.vx; return; }
}
function moveY(e, dy) {
  e.y += dy; e.onGround = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - .01) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - .01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) {
    if (dy > 0) { e.y = ty * T - e.h; e.onGround = true; } else { e.y = (ty + 1) * T; }
    e.vy = 0; return;
  }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spikeTiles(box) {
  const out = []; const x0 = Math.floor(box.x / T), x1 = Math.floor((box.x + box.w) / T), y0 = Math.floor(box.y / T), y1 = Math.floor((box.y + box.h) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (ty >= 0 && ty < ROWS && tx >= 0 && tx < L.w && L.g[ty][tx] === 3) out.push({ x: tx * T + 3, y: ty * T + 10, w: T - 6, h: T - 10 });
  return out;
}
function burst(x, y, col, n = 10, sp = 2.2) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (.4 + Math.random()) * sp; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 22 + Math.random() * 14, col }); }
}

/* ---------------------------------- player ---------------------------------- */
function hurtPlayer(fromX) {
  if (P.inv > 0 || P.dead) return;
  P.hp--; P.inv = 80; P.hurtT = 18; P.pogo = false; P.atkT = -1;
  P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 2.4; P.vy = -4.2; burst(P.x + P.w / 2, P.y + 10, '#ff5a5a', 8);
  if (P.hp <= 0) { P.dead = true; P.deadT = 0; P.vx = -P.face * 1.2; P.vy = -5.5; mode = 'dead'; }
}
function stepPlayer() {
  const p = P;
  if (p.dead) { p.deadT++; p.vy = Math.min(p.vy + GRAV, MAXFALL); p.x += p.vx * .9; p.vx *= .96; p.y += p.vy; return; }
  const ax = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  if (p.hurtT > 0) p.hurtT--;
  else {
    const slow = p.atkT >= 0 && p.onGround ? .35 : 1, tv = ax * SPEED * slow, k = p.onGround ? .4 : .22;
    p.vx += (tv - p.vx) * k; if (ax && p.atkT < 0) p.face = ax;
    if (p.onGround) p.coyote = 6; else p.coyote--;
    p.buf = tap('jump') ? 7 : p.buf - 1;
    if (p.buf > 0 && p.coyote > 0 && !p.pogo) { p.vy = -JUMP; p.jumping = true; p.buf = 0; p.coyote = 0; p.onGround = false; }
    if (p.jumping && !held('jump') && p.vy < -2.6) p.vy = -2.6;
    if (p.vy >= 0) p.jumping = false;
    if (tap('atk')) {
      if (!p.onGround && held('down')) p.pogo = true;
      else if (p.atkT < 0) { p.atkT = 0; swingId++; }
    }
    const busy = p.dashT > 0 || p.spinT > 0 || p.castT > 0;
    if (tap('dash') && !busy && p.dashCd <= 0 && (p.onGround || p.airDash)) {      // DASH SLASH
      p.dashT = 14; p.dashCd = 36; p.dashId = ++swingId; p.atkT = -1; p.pogo = false; p.inv = Math.max(p.inv, 14); if (!p.onGround) p.airDash = false;
    } else if (tap('spin') && !busy && p.mp >= 25) {                                // WHIRLWIND SPIN
      p.mp -= 25; p.spinT = 26; p.atkT = -1; p.pogo = false;
    } else if (tap('wand') && !busy && p.mp >= 30) {                                // FLARE WAND
      p.mp -= 30; p.castT = 14; p.atkT = -1; p.pogo = false;
    }
  }
  if (p.onGround) p.airDash = true;
  p.mp = Math.min(100, p.mp + .12); if (p.dashCd > 0) p.dashCd--;
  if (p.castT > 0) { p.castT--; if (p.castT === 7) shots.push({ x: p.x + p.w / 2 + p.face * 14, y: p.y + 10, vx: p.face * 3.6, t: 0 }); }
  if (p.atkT >= 0 && ++p.atkT >= ATK_STEP * ATK_FRAMES) p.atkT = -1;
  if (p.inv > 0) p.inv--; if (p.pogoGrace > 0) p.pogoGrace--;
  if (p.dashT > 0) { p.dashT--; p.vx = p.face * 4.6; p.vy = 0; }
  else if (p.spinT > 0) { p.spinT--; p.vx *= .7; p.vy = Math.min(p.vy + GRAV * .3, 1.2); }
  else { if (p.castT > 0) p.vx *= .5; p.vy = Math.min(p.vy + GRAV, MAXFALL); }
  moveX(p, p.vx); moveY(p, p.vy);
  if (p.dashT > 0) {
    const box = { x: p.face > 0 ? p.x + p.w - 2 : p.x - 46, y: p.y, w: 48, h: p.h };
    for (const e of enemies) if (e.hp > 0 && e.swing !== p.dashId && overlap(box, e)) { e.swing = p.dashId; damage(e, p.face); }
  }
  if (p.spinT > 0 && p.spinT % 8 === 0) {
    swingId++; const box = { x: p.x - 26, y: p.y - 6, w: p.w + 52, h: p.h + 12 };
    for (const e of enemies) if (e.hp > 0 && overlap(box, e)) { e.swing = swingId; damage(e, e.x < p.x ? -1 : 1); }
  }
  if (p.onGround && p.pogo) p.pogo = false;
  // swing hitbox
  if (p.atkT >= ATK_STEP * (ATK_FRAMES - 2)) {
    const box = { x: p.face > 0 ? p.x + p.w - 2 : p.x - 34, y: p.y + 2, w: 36, h: 24 };
    for (const e of enemies) if (e.hp > 0 && e.swing !== swingId && overlap(box, e)) { e.swing = swingId; damage(e, p.face); }
  }
  // pogo hitbox
  if (p.pogo && p.vy > 0) {
    const box = { x: p.x + 1, y: p.y + p.h - 6, w: p.w - 2, h: 18 };
    for (const e of enemies) if (e.hp > 0 && overlap(box, e)) { damage(e, 0); p.vy = -POGO; p.jumping = false; p.pogoGrace = 10; p.onGround = false; break; }
    if (p.vy > 0 && spikeTiles(box).length) { p.vy = -POGO; p.pogoGrace = 10; burst(p.x + 7, p.y + p.h, '#ffffff', 5, 1.5); }
  }
  // spikes
  if (!p.pogo || p.vy < 0) for (const s of spikeTiles({ x: p.x + 2, y: p.y + 6, w: p.w - 4, h: p.h - 6 })) if (overlap(p, s)) { hurtPlayer(s.x + s.w / 2); break; }
  if (p.y > H + 40) { p.hp = 0; p.dead = true; p.deadT = 0; p.vy = 0; mode = 'dead'; }
}
function damage(e, dir) {
  e.hp--; e.flash = 8; e.kb = 10; e.vx = dir * 1.4 || e.vx; e.vy = -2;
  burst(e.x + e.w / 2, e.y + e.h / 2, '#9dff7a', e.hp > 0 ? 6 : 14);
  if (e.hp <= 0) { G.kills++; G.got += 1; bank++; }
}

/* --------------------------------- enemies --------------------------------- */
function stepEnemies() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    e.t++; if (e.flash > 0) e.flash--;
    if (e.kb > 0) { e.kb--; moveX(e, e.vx); } else {
      const sp = Math.sign(e.vx) * .4; e.vx = sp || .4; moveX(e, e.vx);
      const fx = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      if (e.hitX || (e.onGround && !solid(Math.floor(fx / T), Math.floor((e.y + e.h + 2) / T)))) e.vx = -e.vx;
    }
    e.vy = Math.min(e.vy + GRAV, MAXFALL); moveY(e, e.vy);
    if (e.y > H + 60) e.hp = 0;
    if (!P.dead && P.pogoGrace === 0 && overlap(P, e)) hurtPlayer(e.x + e.w / 2);
  }
}

/* ------------------------------- flare wand shots ------------------------------- */
function boom(x, y, dir) {
  fxs.push({ x, y, t: 0 }); burst(x, y, '#ffb347', 10, 2.6);
  const box = { x: x - 24, y: y - 24, w: 48, h: 48 };
  for (const e of enemies) if (e.hp > 0 && overlap(box, e)) { damage(e, dir); if (e.hp > 0) damage(e, dir); }
}
function stepShots() {
  for (const s of shots) {
    s.x += s.vx; s.t++;
    const hitE = enemies.find(e => e.hp > 0 && overlap({ x: s.x - 7, y: s.y - 7, w: 14, h: 14 }, e));
    if (hitE || solid(Math.floor(s.x / T), Math.floor(s.y / T)) || s.t > 90) { s.dead = true; boom(s.x, s.y, Math.sign(s.vx)); }
  }
  shots = shots.filter(s => !s.dead); fxs.forEach(f => f.t++); fxs = fxs.filter(f => f.t < 16);
}

/* ----------------------------------- loop ----------------------------------- */
let last = 0, acc = 0;
function step() {
  time++;
  if (tap('restart') || ((mode === 'dead') && tap('ok') && P.deadT > 45)) { if (mode === 'dead') bank -= G.got; load_level(lvl); return; }
  if (mode === 'clear') { if (tap('ok')) { load_level(lvl + 1); } return; }
  stepPlayer(); stepEnemies(); stepShots();
  for (const c of coins) if (!c.got && Math.abs(c.x - (P.x + P.w / 2)) < 14 && Math.abs(c.y - (P.y + P.h / 2)) < 18 && !P.dead) { c.got = true; G.got++; bank++; burst(c.x, c.y, '#ffd84a', 6, 1.6); }
  const goalX = L.spec.goal * T;
  if (!P.dead && P.x + P.w > goalX && mode === 'play') mode = 'clear';
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += .12; q.life--; } parts = parts.filter(q => q.life > 0);
  const target = Math.max(0, Math.min(L.w * T - W, P.x + P.w / 2 - W / 2 + P.face * 20)); cam += (target - cam) * .12;
}
function loop(now) {
  acc += Math.min(100, now - last) / (1000 / 60); last = now;
  while (acc >= 1) { step(); for (const k in pressed) delete pressed[k]; acc--; }
  draw(); requestAnimationFrame(loop);
}

/* ----------------------------------- draw ----------------------------------- */
function animFrame() {
  const p = P, A = ATLAS.anims;
  if (p.dead) return A.dead[Math.min(A.dead.length - 1, Math.floor(p.deadT / 8))];
  if (p.hurtT > 0) return A.hurt[Math.floor(p.hurtT / 5) % A.hurt.length];
  if (p.dashT > 0) return A.dash[Math.floor(time / 3) % A.dash.length];
  if (p.spinT > 0) return A.spin[Math.floor((26 - p.spinT) / 3.25) % A.spin.length];
  if (p.castT > 0) return A.cast[p.castT > 7 ? 0 : 1];
  if (p.atkT >= 0) return A.attack[Math.min(A.attack.length - 1, Math.floor(p.atkT / ATK_STEP))];
  if (p.pogo) return A.pogo[0];
  if (!p.onGround) return p.vy < 0 ? A.jump[0] : A.fall[0];
  if (Math.abs(p.vx) > .35) return A.walk[Math.floor(time / 6) % A.walk.length];
  return A.idle[Math.floor(time / 14) % A.idle.length];
}
function drawHero() {
  const id = animFrame(), f = ATLAS.frames[id], cx = Math.round(P.x + P.w / 2 - cam);
  const mid = ATLAS.center.some(n => ATLAS.anims[n].includes(id)),
        by = mid ? Math.round(P.y + P.h / 2 - f.h / 2) : Math.round(P.y + P.h + 1 - f.h);
  if (P.inv > 0 && !P.dead && P.dashT <= 0 && Math.floor(P.inv / 4) % 2) return;
  ctx.save(); ctx.translate(cx, 0); if (P.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(ATIMG, f.x, f.y, f.w, f.h, -Math.round(f.ax), by, f.w, f.h); ctx.restore();
}
function draw() {
  // sky + parallax hills
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5aa8ff'); sky.addColorStop(1, '#bfe6ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (const [sp, col, base, amp] of [[.2, '#8cc5e8', 150, 34], [.4, '#6fb07a', 176, 26]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - Math.abs(Math.sin((x + cam * sp) / 46)) * amp - Math.sin((x + cam * sp) / 17) * 4);
    ctx.lineTo(W, H); ctx.fill();
  }
  const c0 = Math.floor(cam / T), c1 = c0 + Math.ceil(W / T) + 1, ox = -Math.round(cam);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1 && tx < L.w; tx++) {
    const t = L.g[ty][tx]; if (!t) continue; const x = tx * T + ox, y = ty * T;
    if (t === 1) { ctx.fillStyle = '#8a5a2c'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#6e4620'; ctx.fillRect(x + 4, y + 10, 5, 3); ctx.fillRect(x + 14, y + 16, 4, 3);
      if (!L.g[ty - 1] || L.g[ty - 1][tx] !== 1) { ctx.fillStyle = '#4fbf55'; ctx.fillRect(x, y, T, 6); ctx.fillStyle = '#7fe07a'; ctx.fillRect(x, y, T, 2); } }
    else if (t === 2) { ctx.fillStyle = '#b3784a'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#7d4d2b'; ctx.fillRect(x, y + 11, T, 2); ctx.fillRect(x + 11, y, 2, 11); ctx.fillRect(x + 5, y + 13, 2, 11); ctx.fillStyle = '#d9a06a'; ctx.fillRect(x, y, T, 2); }
    else if (t === 3) { ctx.fillStyle = '#d6dbe6'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y + T); ctx.lineTo(x + i * 8 + 4, y + 8); ctx.lineTo(x + i * 8 + 8, y + T); ctx.fill(); } }
  }
  // goal flag
  const gx = L.spec.goal * T + ox; ctx.fillStyle = '#eee'; ctx.fillRect(gx + 10, 4 * T, 3, 3 * T); ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.moveTo(gx + 13, 4 * T); ctx.lineTo(gx + 33, 4 * T + 9); ctx.lineTo(gx + 13, 4 * T + 18); ctx.fill();
  // coins
  for (const c of coins) if (!c.got) { const bob = Math.sin((time + c.x) / 12) * 2, w = Math.abs(Math.cos((time + c.x) / 16)) * 5 + 2;
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(c.x + ox, c.y + bob, w, 6, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff3a0'; ctx.fillRect(c.x + ox - 1, c.y + bob - 3, 2, 3); }
  // slimes
  for (const e of enemies) if (e.hp > 0) {
    const fr = Math.floor(e.t / 14) % 2, dw = 19, dh = 15;
    ctx.save(); if (e.flash && e.flash % 2) ctx.globalAlpha = .45;
    ctx.drawImage(SLIME, fr * 69, 0, 64, 50, Math.round(e.x + e.w / 2 - dw / 2 + ox), Math.round(e.y + e.h - dh + 1), dw, dh); ctx.restore();
  }
  drawHero();
  for (const sh of shots) { const id = ATLAS.anims.fireball[Math.floor(sh.t / 3) % 4], f = ATLAS.frames[id];
    ctx.drawImage(ATIMG, f.x, f.y, f.w, f.h, Math.round(sh.x + ox - f.w), Math.round(sh.y - f.h), f.w * 2, f.h * 2); }
  for (const fx of fxs) { const id = ATLAS.anims.boom[Math.min(3, Math.floor(fx.t / 4))], f = ATLAS.frames[id];
    ctx.drawImage(ATIMG, f.x, f.y, f.w, f.h, Math.round(fx.x + ox - f.w), Math.round(fx.y - f.h), f.w * 2, f.h * 2); }
  for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x + ox), Math.round(q.y), 2, 2); }
  // HUD
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i < P.hp ? '#ff4d6a' : '#3a2230'; ctx.fillRect(8 + i * 14, 8, 10, 10); ctx.fillStyle = 'rgba(255,255,255,.35)'; if (i < P.hp) ctx.fillRect(10 + i * 14, 10, 3, 3); }
  ctx.fillStyle = '#12203a'; ctx.fillRect(7, 40, 62, 8); ctx.fillStyle = P.mp >= 30 ? '#4db8ff' : '#2a6ea0'; ctx.fillRect(8, 41, Math.floor(60 * P.mp / 100), 6);
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(30 * .6 + 8 - 1, 40, 1, 8);
  ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0008'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const hud = `COINS ${bank}   STAGE ${L.spec.name}`; ctx.strokeText(hud, 8, 62); ctx.fillText(hud, 8, 62);
  if (mode !== 'play') {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 76, W, 64); ctx.textAlign = 'center'; ctx.font = 'bold 22px monospace';
    ctx.fillStyle = mode === 'clear' ? '#ffe36a' : '#ff7a7a'; ctx.fillText(mode === 'clear' ? 'STAGE CLEAR!' : 'DEFEATED', W / 2, 108);
    ctx.font = '11px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(mode === 'clear' ? `Enter = next stage   (coins ${bank})` : 'Enter / R = try again', W / 2, 128); ctx.textAlign = 'left';
  }
}
})();
