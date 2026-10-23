/* ==========================================================================
   PLATFORM MODE · heroes
   --------------------------------------------------------------------------
   Every hero = sprite (the SAME strip files and frame sizes as the main game's
   HERO_SPRITE in index.html / js/ql2/*.js) + poses + stats + 3 abilities:
     attack (J) · skill (I) · dash (L)
   The player controller (player.js) runs every hero; a hero only DESCRIBES
   itself here with ability "kinds", so adding a hero = adding one entry.

   Ability kinds (handled in player.js):
     attack: combo (melee steps) · shot (projectiles, optional charge)
     skill : proj · spin · inhale · slam · beam · heat · burst · flare
     dash  : dash (optionally hitting) · roll (i-frames) · rocket (up-forward) · spin (Sonic ground spin / air homing)
   Hit boxes: box:[forward, top, w, h] — forward from the body centre, top from the feet (negative = up).
   Timings are in frames (60 / s).

   Sprite facts checked against the PNGs (tools/plat-assets.py):
     · no hero sheet has a jump/fall pose → poses pick the closest real frame and the
       renderer adds squash & stretch. ELON's walk strip = his idle (2 identical frames) and
       KEA has no walk strip at all → their walk uses idle + a step bob.
     · elon/roll.png is not a uniform strip (1 px divider lines at irregular x) → explicit frame rects.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT;
const strip = (dir, ch, anims, extra) => Object.assign({ kind: 'strip', dir, ch, anims }, extra || {});

const PROJ = PLAT.PROJ = {
  arc:    { img: 'heroes/knight/arc.png', fw: 166, fh: 110, n: 1, scale: .34, speed: 6.2, dmg: 3, pierce: 99, life: 46, box: [44, 40], fade: true },
  lemon:  { img: 'heroes/x/lemon0.png', fw: 8, fh: 8, n: 1, scale: 1.4, speed: 7.5, dmg: 1, life: 55, box: [10, 8], glow: '#ffe96a' },
  shotB:  { img: 'heroes/x/shotB.png', fw: 60, fh: 33, n: 2, rate: 4, scale: .62, speed: 7.5, dmg: 3, pierce: 1, life: 60, box: [30, 18], glow: '#6ad8ff' },
  shotP:  { img: 'heroes/x/shotP.png', fw: 48, fh: 31, n: 2, rate: 4, scale: .8, speed: 8, dmg: 5, pierce: 3, life: 60, box: [32, 22], glow: '#ff7af0' },
  lvl4:   { img: 'heroes/x/lvl4.png', fw: 196, fh: 136, n: 4, rate: 5, scale: .42, speed: 6.5, dmg: 9, pierce: 99, life: 75, box: [64, 50], glow: '#9fe8ff', shake: 3 },
  star:   { img: 'heroes/kirby/star.png', fw: 24, fh: 24, n: 4, rate: 3, scale: 1.25, speed: 7, dmg: 6, pierce: 2, life: 60, box: [26, 26], spin: .3 },
  puff:   { img: 'heroes/kirby/starmini.png', fw: 16, fh: 16, n: 4, rate: 3, scale: 1, speed: 5, dmg: 1, life: 22, box: [16, 16], decel: .9 },
  bullet: { proc: 'tracer', col: '#ffe08a', speed: 11, dmg: 1, life: 40, box: [12, 4] },
  bolt:   { proc: 'bolt', col: '#d8c6a0', speed: 10, dmg: 2, pierce: 1, life: 45, box: [18, 5] },
  rocket: { img: 'heroes/elon/rocket.png', fw: 67, fh: 10, n: 1, scale: .55, speed: 3, accel: .35, maxSpeed: 9, dmg: 4, life: 70, box: [30, 8], explode: { r: 54, dmg: 5 }, trail: '#ffb04a' },
  // fan: leaves Mia's raised hand (kasen frame 1, ~-42) and levels out 12 px lower (settle), at slime height
  fan:    { img: 'heroes/mia/fireshuriken.png', fw: 34, fh: 34, n: 11, rate: 2, scale: .8, speed: 6.5, dmg: 2, pierce: 99, life: 70, box: [24, 24], boomerang: true, settle: 12, glow: '#ff8a3a' },
  flare:  { atlasAnim: 'fireball', scale: 2, speed: 3.8, dmg: 2, life: 80, box: [14, 14], explode: { r: 30, dmg: 2, atlasAnim: 'boom' } },
  flareBig: { atlasAnim: 'fireball', scale: 3, speed: 4.5, dmg: 4, life: 90, box: [22, 22], explode: { r: 44, dmg: 4, atlasAnim: 'boom' } },
  fist:   { img: 'heroes/cream/fx_fist.png', fw: 250, fh: 250, n: 6, rate: 4, scale: .26, speed: 7, dmg: 2, pierce: 2, life: 34, box: [40, 40], glow: '#ff3a3a' },
  // enemy shots
  fireball:  { img: 'bosses/dragon/fireball.png', fw: 56, fh: 32, n: 6, rate: 4, loopFrom: 3, scale: .55, speed: 3.2, dmg: 1, life: 140, box: [14, 12], enemy: true, elem: 'fire', explode: { r: 0 } },
  bigfire:   { img: 'bosses/dragon/fireball.png', fw: 56, fh: 32, n: 6, rate: 4, loopFrom: 3, scale: 1, speed: 3.6, dmg: 2, life: 200, box: [26, 20], enemy: true, elem: 'fire', explode: { r: 40, dmg: 2 } },
  wave:      { img: 'bosses/aqua/wave.png', fw: 69, fh: 83, n: 1, scale: .7, speed: 2.8, dmg: 1, life: 260, box: [30, 50], enemy: true, elem: 'ice', ground: true },
  drop:      { proc: 'drop', col: '#7ad8ff', speed: 0, grav: .22, dmg: 1, life: 200, box: [8, 12], enemy: true, elem: 'ice' },
  rock:      { proc: 'rock', col: '#8a7a6a', speed: 0, grav: .3, dmg: 1, life: 200, box: [16, 16], enemy: true },
  // v108 monster shots (CC0 strips from Monsters Creatures Fantasy 1.3 — PLAT.MONSTER_FX)
  wbolt:     { img: 'enemies/mcf/fx/wbolt.png', fw: 30, fh: 11, n: 4, rate: 4, scale: 1.7, speed: 3.6, dmg: 1, life: 170, box: [16, 10], enemy: true, elem: 'poison', glow: '#c86aff', pixel: true },
  gbomb:     { img: 'enemies/mcf/fx/bomb.png', fw: 54, fh: 62, n: 19, rate: 3, loopFrom: 0, scale: .5, speed: 0, dmg: 1, life: 160, box: [14, 14], enemy: true, elem: 'fire', explode: { r: 34, dmg: 1 } },
  spore:     { img: 'enemies/mcf/fx/spore.png', fw: 20, fh: 18, n: 8, rate: 4, scale: 1, speed: 0, dmg: 1, life: 160, box: [12, 12], enemy: true, elem: 'poison', pixel: true },
  ebolt:     { img: 'enemies/mcf/fx/bolt.png', fw: 44, fh: 44, n: 8, rate: 3, scale: .55, speed: 3.4, dmg: 1, life: 120, box: [14, 14], enemy: true },
  // v115 world-5 bosses
  bubble:    { img: 'bosses/serpent/bubble.png', fw: 16, fh: 16, n: 4, rate: 7, loopFrom: 2, scale: 2.2, speed: 1.5, dmg: 1, life: 260, box: [24, 24], enemy: true, bob: 1.1, pixel: true },
  cball:     { proc: 'bomb', col: '#2a2630', speed: 0, dmg: 1, life: 220, box: [16, 16], enemy: true, elem: 'fire', explode: { r: 38, dmg: 1 } },
  lblob:     { proc: 'drop', col: '#ff8a2a', speed: 0, grav: .22, dmg: 1, life: 200, box: [8, 12], enemy: true, elem: 'fire' },
  shock:     { proc: 'shock', col: '#ffd060', speed: 4, dmg: 1, life: 90, box: [20, 18], enemy: true, elem: 'shock', ground: true },
};
const FX = PLAT.FXDEF = {
  puff:   { img: 'scenes/plat/swamp/death-puff.png', fw: 39, fh: 49, n: 6, rate: 4, scale: 1 },
  boom:   { img: 'bosses/dragon/boom.png', fw: 53, fh: 48, n: 8, rate: 3, scale: 1 },
  impact: { img: 'heroes/yota/fx_impact.png', fw: 200, fh: 200, n: 10, rate: 2, scale: .3 },
  orb:    { img: 'heroes/yota/fx_orb.png', fw: 216, fh: 216, n: 11, rate: 3, scale: .22 },
  spark:  { img: 'heroes/kea/fx_spark.png', fw: 153, fh: 159, n: 8, rate: 3, scale: .4 },
  slash:  { img: 'heroes/kea/fx_slash.png', fw: 161, fh: 156, n: 8, rate: 2, scale: .34 },
  aura:   { img: 'heroes/kea/fx_aura.png', fw: 129, fh: 178, n: 8, rate: 3, scale: .42 },
  craura: { img: 'heroes/cream/fx_auras.png', fw: 112, fh: 108, n: 14, rate: 3, scale: .55 },
  ground: { img: 'heroes/cream/fx_ground.png', fw: 210, fh: 240, n: 8, rate: 3, scale: .3 },
  pillar: { img: 'heroes/mia/fx/pillar.png', fw: 73, fh: 106, n: 26, rate: 2, scale: .9 },
  mburst: { img: 'heroes/mia/fx/burst.png', fw: 110, fh: 82, n: 24, rate: 2, scale: 1.1 },
  kick:   { img: 'heroes/cream/fx_kick.png', fw: 250, fh: 227, n: 6, rate: 3, scale: .28 },
};

/* ---------------------------------- heroes ---------------------------------- */
const H = PLAT.HEROES = {};

H.knight = {
  name: 'Elite Knight', th: 'อัศวินเหล็กผมแดง', role: 'ดาบใหญ่ · ทนทาน', color: '#ff5a4a',
  desc: 'ดาบยักษ์ระยะไกลที่สุด ช้าแต่หนัก · เกราะหนากระเด็นน้อย · ↑+โจมตีเสยลอย วิ่ง+โจมตีพุ่งแทง',
  sprite: strip('heroes/knight/', 112, {
    idle: { n: 4, cw: 216, ax: 70 }, walk: { n: 8, cw: 216, ax: 70 }, hurt: { n: 3, cw: 216, ax: 70 }, dead: { n: 4, cw: 216, ax: 110 },
    atk1: { n: 5, cw: 216, ax: 70 }, atk2: { n: 5, cw: 216, ax: 70 }, atk3: { n: 5, cw: 216, ax: 70 }, fin: { n: 7, cw: 216, ax: 70 } }, { by: 109 }),
  scale: .62, box: [18, 42], hp: 6, speed: .92, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 5 }, walk: { a: 'walk', fps: 12 }, run: { a: 'walk', fps: 17 }, jump: { a: 'walk', f: [2] }, fall: { a: 'walk', f: [6] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 6 } },
  attack: { kind: 'combo', name: 'ฟันดาบยักษ์ 3 จังหวะ', steps: [
    { pose: 'atk1', dur: 24, on: [2, 3], hit: [9, 18], box: [2, -36, 58, 24], dmg: 2, kb: 4, lunge: 1.5 },
    { pose: 'atk2', dur: 24, on: [2, 3], hit: [9, 18], box: [2, -32, 64, 22], dmg: 2, kb: 4, lunge: 3.5 },
    { pose: 'atk3', dur: 30, on: [2, 3], hit: [11, 20], box: [-12, -70, 74, 70], dmg: 3, kb: 6, lunge: 1, shake: 2 } ] },
  moves: {
    up:  { name: 'เสยดาบจันทร์เสี้ยว (ลอยศัตรู)', pose: 'atk3', dur: 28, on: [2, 3], hit: [10, 19], box: [-14, -84, 70, 84], dmg: 2, kb: 3, up: true },
    run: { name: 'พุ่งแทงทะลวง', pose: 'atk2', dur: 26, on: [2, 3], hit: [9, 18], box: [2, -32, 70, 22], dmg: 3, kb: 8, lunge: 6.5, heavy: true },
  },
  skill: { kind: 'proj', name: 'คลื่นดาบอัศวิน', cost: 30, pose: 'fin', dur: 36, fireAt: 17, proj: 'arc', y: -30 },
  dash: { kind: 'dash', name: 'แทงพุ่ง', pose: 'atk2', f: [2, 3], speed: 6, dur: 14, cd: 40, hit: { box: [0, -32, 40, 24], dmg: 2 }, air: true },
  ult: { input: 'du+A', name: 'ARC TRINITY · คลื่นดาบสามจันทร์', kind: 'arcs', pose: 'fin', dur: 46, fireAt: [16, 22, 28], proj: 'arc', scale: .58, dmg: 7 },
};

H.pip = {
  name: 'Plink', th: 'พลิงค์ นักดาบหมวกเขียว', role: 'นักดาบ · โล่', color: '#5ad06a',
  desc: 'ฟันเร็ว · กด ↓ ค้าง = ตั้งโล่ · กดโจมตีค้างแล้วปล่อย = สปินแอทแท็ก · สกิลพุ่งโล่กระแทก สะท้อนกระสุน',
  sprite: strip('heroes/plink/', 73, {
    idle: { n: 2, cw: 24, ax: 13 }, walk: { n: 10, cw: 42, ax: 21 }, hurt: { n: 3, cw: 46, ax: 25 }, dead: { n: 2, cw: 50, ax: 25 },
    atk1: { n: 5, cw: 68, ax: 45 }, atk2: { n: 4, cw: 47, ax: 17 }, atk3: { n: 5, cw: 57, ax: 35 }, spin: { n: 6, cw: 45, ax: 16 }, guard: { n: 7, cw: 32, ax: 16 },
    fin: { n: 10, cw: 118, ax: 45 } }),
  scale: 1, box: [16, 42], hp: 5, speed: 1.02, jump: 1,
  poses: { idle: { a: 'idle', fps: 3 }, walk: { a: 'walk', fps: 14 }, run: { a: 'walk', fps: 20 }, jump: { a: 'walk', f: [3] }, fall: { a: 'walk', f: [8] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 5 },
    guard: { a: 'guard', f: [6] }, dashp: { a: 'atk3', f: [0] }, bash: { a: 'guard', f: [5, 6], fps: 14 } },
  guard: { pose: 'guard' },
  attack: { kind: 'combo', name: 'ฟันดาบ 3 จังหวะ', steps: [
    { pose: 'atk2', dur: 15, on: [1, 2, 3], hit: [5, 11], box: [2, -32, 36, 14], dmg: 1, kb: 3, lunge: 1.5 },
    { pose: 'atk2', dur: 14, on: [1, 2, 3], hit: [5, 11], box: [2, -32, 36, 14], dmg: 1, kb: 3, lunge: 1 },
    { pose: 'atk1', dur: 20, on: [2, 3], hit: [5, 13], box: [-6, -60, 50, 60], dmg: 2, kb: 5 } ] },
  moves: {
    up:   { name: 'ฟันเสยขึ้นฟ้า (ลอยศัตรู)', pose: 'atk3', dur: 22, on: [2, 3, 4], hit: [6, 15], box: [-8, -66, 46, 66], dmg: 2, kb: 3, up: true },
    air:  { name: 'ฟันลงกลางอากาศ', pose: 'atk1', dur: 18, on: [2, 3], hit: [5, 13], box: [-6, -60, 50, 64], dmg: 1, kb: 3 },
    hold: { name: 'สปินแอทแท็ก (กดค้างแล้วปล่อย)', t: 40, kind: 'spin', cost: 0, pose: 'spin', dur: 26, every: 9, box: [-36, -46, 72, 48], dmg: 2 },
  },
  skill: { kind: 'bash', name: 'โล่กระแทก (สะท้อนกระสุน)', cost: 20, pose: 'bash', speed: 5.2, dur: 20, hit: { box: [2, -40, 24, 40], dmg: 2, kb: 11 } },
  dash: { kind: 'dash', name: 'ฟันพุ่ง', pose: 'dashp', speed: 6.8, dur: 12, cd: 34, hit: { box: [-4, -36, 36, 30], dmg: 1 }, air: true, trail: '#ffb04a' },
  ult: { input: 'S+A', name: 'FLAME SWORD · คลื่นดาบเพลิง', kind: 'step', step: { pose: 'fin', dur: 56, on: [5, 6, 7, 8], hit: [28, 48], box: [6, -48, 70, 52], dmg: 8, kb: 10, heavy: true, shake: 6, multi: true } },
};

H.puff = {
  name: 'Kirby', th: 'เคอร์บี้ ก้อนชมพูจอมดูด', role: 'ลอยตัว · ดูดแล้วพ่น', color: '#ff8ac8',
  desc: 'โจมตีค้าง = ดูด (ตัวใหญ่ต้องปัดก่อนถึงดูดได้ · ปัดบอส = ดาวหล่น 3 ดวง) · อมแล้วกด = พ่นดาว / ค้าง = ดูดเพิ่ม ยิ่งอมเยอะดาวยิ่งใหญ่ · ↓+โจมตี = เตะสไลด์ · กดกระโดดกลางอากาศ = ลอย 5 ครั้ง · กลางอากาศโจมตี = ตีลังกา · ↓+โจมตีกลางอากาศ = กลิ้งทิ่มลง · ↓ ค้าง = ตั้งการ์ด',
  sprite: strip('heroes/kirby/', 34, {
    idle: { n: 10, cw: 26, ax: 13 }, walk: { n: 7, cw: 28, ax: 14 }, hurt: { n: 4, cw: 26, ax: 13 }, dead: { n: 4, cw: 36, ax: 18 },
    atk1: { n: 5, cw: 32, ax: 16 }, atk2: { n: 8, cw: 30, ax: 15 }, atk3: { n: 7, cw: 34, ax: 17 }, inhale: { n: 8, cw: 31, ax: 15 },
    fspit: { n: 6, cw: 33, ax: 16 }, fidle: { n: 4, cw: 33, ax: 16 }, fwalk: { n: 6, cw: 35, ax: 17 }, fhurt: { n: 4, cw: 34, ax: 17 }, guard: { n: 5, cw: 30, ax: 15 },
    // elemental hurt strips (already in heroes/kirby/, unused until v100) — their own heights
    burned: { n: 10, cw: 41, ax: 20, ch: 40, by: 39, fullBleed: true }, shocked: { n: 8, cw: 40, ax: 20, ch: 40, by: 39, fullBleed: true }, frozen: { n: 7, cw: 27, ax: 13, ch: 26, by: 25, fullBleed: true } }, { by: 33 }),
  scale: 1.45, box: [20, 30], hp: 5, speed: .9, jump: 1,
  // v98 animation pass (checked against Kirby Super Star footage): quick blink instead of a
  // ¾-second eye-close · upright rise → somersault at the top of a jump → upright fall ·
  // cheeks puff up before hovering · mouth-open exhale when the hover ends · the roll loops
  // only its ball frames (atk2 6–7 are the stand-up frames that used to flicker into it).
  poses: { idle: { a: 'idle', f: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 7], fps: 12 },
    walk: { a: 'walk', fps: 14 }, run: { a: 'walk', fps: 20 },
    jump: { a: 'walk', f: [6] }, fall: { a: 'idle', f: [0] }, flip: { a: 'atk3', f: [0, 1, 2, 3], fps: 22 },
    puffUp: { a: 'fspit', f: [0, 1], fps: 20 }, float: { a: 'fidle', fps: 10, loopy: true }, exhale: { a: 'fspit', f: [2, 3, 4, 5], fps: 22 },
    hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 5 }, guard: { a: 'guard', f: [2] },
    hurt_fire: { a: 'burned', fps: 30 }, hurt_shock: { a: 'shocked', f: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3], fps: 30 }, hurt_ice: { a: 'frozen', f: [0, 1, 2, 3, 3, 3, 4, 5, 6], fps: 24 },
    m_idle: { a: 'fidle', fps: 5, loopy: true }, m_walk: { a: 'fwalk', f: [0, 1, 2, 3], fps: 10, loopy: true }, m_hurt: { a: 'fhurt', fps: 10 }, m_jump: { a: 'fidle', f: [1] }, m_fall: { a: 'fidle', f: [2] },
    inhaling: { a: 'inhale', f: [3, 4, 5, 6, 7], fps: 12, loopy: true },
    // v101: swallowing — the spit frames in reverse: small with the mouth still open → cheeks fill → settle
    gulp: { a: 'fspit', f: [5, 5, 4, 4, 1, 1, 0], fps: 20 },
    // v101: a dash with a full mouth slides along puffed up instead of rolling
    m_roll: { a: 'fwalk', f: [4, 5], fps: 12, loopy: true }, roll: { a: 'atk2', f: [0, 1, 2, 3], fps: 18, loopy: true },
    // slide kick: duck flat → foot-forward slide held through the hit window → back up
    // (the strip's frames 0–1 point the foot backwards, so they are left out)
    atk1: { a: 'atk1', f: [2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2] },
    // air attack: a double somersault (the strip's frames 4–6 are the back-view puff-up)
    atk3: { a: 'atk3', f: [0, 1, 2, 3, 0, 1, 2, 3] } },
  mod: { drawFront(ctx, p) {                         // v100: mouthful stack counter over Kirby's head
    if (!p.mouth || (p.mouth.n || 1) < 2 || p.dead) return;
    const n = p.mouth.n, t = p.g.frame, y = p.y - 18 + Math.sin(t / 8) * 2;
    ctx.save(); ctx.font = '900 ' + Math.min(22, 12 + n) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#2a0a1a';
    ctx.strokeText('★×' + n, p.cx, y); ctx.fillStyle = n >= 10 ? '#ffe36a' : '#ffb0e0'; ctx.fillText('★×' + n, p.cx, y); ctx.restore();
  }, update(p) {
    // dust kicked up behind the slide (Kirby Super Star)
    if (p.act && p.act.pose === 'atk1' && p.onGround && (p.act.t || 0) % 3 === 1 && Math.abs(p.vx) > 1.5) p.g.dust(p.cx - p.face * 12, p.feet, 1);
    return false;
  }, pose(p) {
    const a = p.anim, wasFloat = p._kFloat; p._kFloat = p.floating;
    const mn = p.mouth ? p.mouth.n || 1 : 0; if (!mn) p._kGulp = 0;
    if (p.dead || p.hurtT > 0 || p.act || p.guarding || p.wallDir) { p._kRise = false; return false; }
    if (mn) {                                           // something new went in: swallow it before the puffed poses
      if (p._kGulp !== mn) { p._kGulp = mn; a.play('gulp', null, true); p.sq = { x: .9, y: 1.08 }; return true; }
      if (a.pose === 'gulp' && !a.done) return true;
      p._kRise = false; return false;
    }
    if (p.floating) {
      if (!wasFloat) { a.play('puffUp', null, true); return true; }        // first press: cheeks fill up
      if (a.pose === 'puffUp' && !a.done) return true;
      if (a.pose !== 'float') a.play('float');
      return true;
    }
    if (wasFloat) { a.play('exhale', null, true); p.sq = { x: 1.12, y: .9 }; return true; }   // hover ended: blow the air out
    if (a.pose === 'exhale' && !a.done) return true;
    if (p.onGround) { p._kRise = false; return false; }
    if (p.jumping && p.vy < -2) { p._kRise = true; if (a.pose !== 'jump') a.play('jump'); return true; }
    if (p._kRise) { p._kRise = false; a.play('flip', null, true); return true; }   // top of the jump
    if (a.pose === 'flip' && !a.done) return true;
    if (a.pose !== 'fall') a.play('fall');
    return true;
  } },
  airJumps: 5, float: { vy: -4.6, maxFall: 1.4, pose: 'float', puff: 'puff' }, guard: { pose: 'guard' },
  // v100: J = INHALE (hold) like the real thing · ↓+J = slide kick. With a full mouth: tap J = spit a star,
  // hold J = keep inhaling — every swallow adds to the stack and the star grows with it, no cap.
  // Big enemies can only be inhaled after a successful parry (while they reel); a parried boss drops 3 stars.
  attack: { kind: 'inhale', name: 'ดูด! (ค้าง) · อมแล้วกด = พ่นดาว · อมแล้วค้าง = ดูดเพิ่ม',
    suck: { pose: 'inhaling', range: 104, height: 44, pull: 2.6 }, holdToSuck: 10,
    mouthful: { pose: 'fspit', dur: 18, fireAt: 6, proj: 'star', y: -18 } },
  counterInhale: true, parryStars: 3,
  moves: {
    down:    { name: 'เตะสไลด์', pose: 'atk1', dur: 22, hit: [3, 17], box: [-6, -16, 32, 16], dmg: 2, kb: 4, lunge: 5.5, slide: true },
    air:     { name: 'ตีลังกากลางอากาศ', pose: 'atk3', dur: 22, auto: false, hit: [3, 18], box: [-16, -32, 34, 34], dmg: 2, kb: 4 },
    downAir: { name: 'กลิ้งทิ่มลง', kind: 'dive', pose: 'roll', vy: 8.5, dmg: 2, bounce: 7.5 },
  },
  skill: { kind: 'inhale', name: 'ดูด! (แล้วโจมตี = พ่นดาว · สกิลอีกครั้ง = กลืน +พลัง)', cost: 0, pose: 'inhaling', range: 104, height: 44, pull: 2.6 },
  dash: { kind: 'dash', name: 'กลิ้งพุ่ง', pose: 'roll', speed: 5.6, dur: 20, cd: 36, hit: { box: [-14, -26, 30, 26], dmg: 1 }, air: false },
  ult: { input: 'u+S', name: 'STAR STORM · พายุดาวเคอร์บี้', kind: 'stars', pose: 'fspit', dur: 50, at: [10, 16, 22, 28, 34], rise: -5, proj: 'star', scale: 1.8, dmg: 7 },
};

H.sonic = {
  name: 'Sonic', th: 'โซนิค เดอะเฮดจ์ฮ็อก', role: 'ความเร็ว · ลูกบอลหมุน', color: '#4a8aff',
  desc: 'เร็วที่สุด กระโดดเป็นลูกบอลชนแล้วเด้ง · กลางอากาศโจมตี = โฮมมิ่งแอทแท็ก · ↓ + กดโจมตีค้างแล้วปล่อย = สปินแดช · สกิลบูสต์ทะลุทุกอย่าง',
  sprite: strip('heroes/sonic/', 45, {
    idle: { n: 9, cw: 32, ax: 17 }, walk: { n: 6, cw: 39, ax: 19 }, hurt: { n: 2, cw: 39, ax: 22 }, dead: { n: 2, cw: 34, ax: 18 },
    run: { n: 4, cw: 31, ax: 14 }, spin: { n: 9, cw: 31, ax: 15 }, dash: { n: 10, cw: 31, ax: 15 }, spring: { n: 1, cw: 24, ax: 13 }, skid: { n: 2, cw: 34, ax: 16 },
    super_idle: { n: 9, cw: 32, ax: 17 }, super_run: { n: 4, cw: 31, ax: 14 }, super_spin: { n: 9, cw: 31, ax: 15 }, super_dash: { n: 10, cw: 31, ax: 15 } }),
  scale: 1.15, box: [16, 38], hp: 4, speed: 1.3, jump: 1.06, accel: 1.4,
  // v102: Sonic 1 — stands still (0–4) for a few seconds, then looks out and taps his foot impatiently (5–8)
  poses: { idle: { a: 'idle', f: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 7, 8, 7, 8, 7, 8, 7, 8, 6, 5], fps: 8 },
    walk: { a: 'walk', fps: 12 }, run: { a: 'run', fps: 20 }, jump: { a: 'spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true }, fall: { a: 'walk', f: [1] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 4 }, skid: { a: 'skid', fps: 10 }, spring: { a: 'spring' },
    ball: { a: 'spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true }, rev: { a: 'dash', f: [3, 4, 5, 6, 7, 8, 9], fps: 40, loopy: true }, boost: { a: 'dash', f: [4, 5, 6, 7, 8, 9], fps: 30, loopy: true },
    // SUPER SONIC — the golden strips from the same sheet set
    s_idle: { a: 'super_idle', fps: 6 }, s_walk: { a: 'super_run', fps: 14, loopy: true }, s_run: { a: 'super_run', fps: 24, loopy: true }, s_jump: { a: 'super_spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true },
    s_fall: { a: 'super_idle', f: [0] }, s_ball: { a: 'super_spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true }, s_boost: { a: 'super_dash', f: [4, 5, 6, 7, 8, 9], fps: 30, loopy: true } },
  ballJump: true,
  attack: { kind: 'combo', name: 'สปินแอทแท็ก (กลิ้งชน)', steps: [{ pose: 'ball', dur: 22, hit: [0, 22], box: [-12, -30, 30, 30], dmg: 1, kb: 4, lunge: 5, slide: true }] },
  moves: {
    air:  { name: 'โฮมมิ่งแอทแท็ก', kind: 'homing', pose: 'ball', speed: 8, cd: 0, range: 190, hit: { box: [-14, -32, 30, 32], dmg: 2 } },
    down: { name: 'สปินแดช (↓ + กดค้างแล้วปล่อย)', kind: 'spindash', btn: 'attack', cost: 0, rev: 'rev', pose: 'ball', speed: 9.5, dur: 34, dmg: 2 },
  },
  skill: { kind: 'boost', name: 'ไลต์สปีดบูสต์ (ทะลุทุกอย่าง)', cost: 30, pose: 'boost', speed: 9, dur: 30, inv: 30, hit: { box: [-8, -36, 36, 36], dmg: 2, multi: 10 } },
  dash: { kind: 'dash', name: 'แอร์แดช / บูสต์สั้น', pose: 'ball', speed: 7, dur: 12, cd: 22, air: true, hit: { box: [-12, -32, 28, 32], dmg: 1 } },
  ult: { input: 'SS', name: 'SUPER SONIC · ซูเปอร์โซนิค', kind: 'super', dur: 600, speed: 1.35, dmg: 3 },
};

// GEAR SECOND palette: Luffy's skin tones → pink / red (exact colours from the luffy strips)
const GEAR_PAL = { key: 'gear2', from: [[248, 200, 144], [216, 136, 40], [160, 72, 0]], to: [[255, 150, 160], [228, 84, 92], [160, 32, 48]] };
const U = PLAT.U, sfx_ = n => PLAT.sfx && PLAT.sfx[n] && PLAT.sfx[n]();
H.luffy = {
  name: 'Luffy', th: 'ลูฟี่ หมวกฟาง', role: 'แขนยาง · ระยะกลาง', color: '#ff4a3a',
  desc: 'Q / ⟳ = เกียร์ 2 (เร็ว · แรง ×1.5 · ชาร์จไว · ทุกหมัดจอสั่น) · โจมตีรัว = หมัด หมัด แล้วพิสทอลยืดแขน · โจมตีค้าง = พิสทอลชาร์จ · ↓+โจมตีค้าง = แกตลิ่งชาร์จ · ↑+โจมตี = ขวานยางยืด · สกิล = บาซูก้า · ↓+สกิลค้าง = ชาร์จเหยียบพื้น (ยิ่งค้างยิ่งกว้าง) · ปัด = ลูกโป่ง · พุ่ง = วิ่งพุ่งบนพื้น / ร็อกเก็ตกลางอากาศ',
  sprite: strip('heroes/luffy/', 127, {
    idle: { n: 7, cw: 33, ax: 14 }, walk: { n: 6, cw: 40, ax: 18 }, hurt: { n: 3, cw: 51, ax: 34 }, dead: { n: 4, cw: 62, ax: 23 },
    pistol: { n: 7, cw: 94, ax: 21 }, gatling: { n: 9, cw: 125, ax: 52 }, rocket: { n: 6, cw: 66, ax: 46 }, dash: { n: 8, cw: 61, ax: 26 },
    axe: { n: 11, cw: 68, ax: 19 }, bazooka: { n: 8, cw: 110, ax: 18, flip: true }, balloon: { n: 11, cw: 49, ax: 24 } }),
  scale: 1.08, box: [16, 42], hp: 5, speed: 1, jump: 1,
  poses: { idle: { a: 'idle', fps: 8 }, walk: { a: 'walk', fps: 12 }, run: { a: 'dash', f: [2, 3, 4, 5, 6, 7], fps: 16, loopy: true }, jump: { a: 'walk', f: [5] }, fall: { a: 'walk', f: [2] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 5 }, fly: { a: 'rocket', f: [4, 5], fps: 12, loopy: true },
    // v103 (picked by the player): jab = the pistol wind-up without the stretch · bazooka plays 1→7 then back to 0 ·
    // parry = Gomu Gomu Fusen (balloon) · ground dash = the sprint with sparks · ↓+skill = leg raised while charging, stomp on release
    jab: { a: 'pistol', f: [1, 2, 2, 1] }, pisUp: { a: 'pistol', f: [0] }, pisHold: { a: 'pistol', f: [0, 1, 1, 1], fps: 6, loopy: true }, pisGo: { a: 'pistol', f: [2, 3, 3, 5, 6] }, gearOn: { a: 'pistol', f: [0, 0, 1, 0, 0] }, bazUp: { a: 'bazooka', f: [1, 2, 3] }, bazHold: { a: 'bazooka', f: [4, 5, 6, 5], fps: 10, loopy: true }, bazGo: { a: 'bazooka', f: [7, 0, 0, 0, 0] }, parryp: { a: 'balloon', f: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
    dashp: { a: 'dash', f: [0, 1, 2, 3, 4, 5, 6, 7], fps: 24, loopy: true }, stompUp: { a: 'axe', f: [0, 1] }, gatWind: { a: 'axe', f: [0] }, gatLoop: { a: 'gatling', f: [2, 3, 4, 5, 6, 7], fps: 24, loopy: true }, gatEnd: { a: 'gatling', f: [8] }, stompDown: { a: 'axe', f: [4, 5, 6, 7, 8, 9, 10] } },
  parryPose: 'parryp',
  attack: { kind: 'combo', name: 'หมัด · หมัด · โกมุโกมุโนะ พิสทอล', steps: [
    { pose: 'jab', dur: 13, on: [1, 2], hit: [4, 9], box: [4, -40, 24, 16], dmg: 1, kb: 2 },
    { pose: 'jab', dur: 13, on: [1, 2], hit: [4, 9], box: [4, -40, 24, 16], dmg: 1, kb: 2 },
    { pose: 'pistol', dur: 26, on: [3, 4, 5], hit: [11, 19], box: [6, -42, 30, 16], dmg: 3, kb: 5 }] },
  moves: { hold: { live: true, t: 14, kind: 'chargeBlast', area: 'front', btn: 'attack', name: 'พิสทอลชาร์จ (โจมตีค้าง · ยิ่งค้างยิ่งไกลและแรง)', cost: 0, up: 'pisUp', rise: 6, hold: 'pisHold', go: 'pisGo', goDur: 16, call: 'GOMU GOMU PISTOL!!', hitAt: 5, y: -36, base: 80, grow: 2, dmg: 3, kb: 10 },
    down: { kind: 'gatlingCharge', name: 'โกมุโกมุ แกตลิ่ง (↓+โจมตีค้าง · ยิ่งชาร์จยิ่งนานและแรง)', wind: 'gatWind', loop: 'gatLoop', end: 'gatEnd', base: 30, perFrame: .8, every: 4, box: [4, -48, 100, 36], dmg: 1 },
    up: { name: 'โกมุโกมุโนะ โอโนะ (ขวาน)', pose: 'axe', dur: 40, on: [4, 5, 6, 7, 8, 9], hit: [14, 34], box: [0, -96, 44, 96], dmg: 3, kb: 6, up: true, heavy: true } },
  // v104: both skills are HOLD-to-charge — the longer the hold, the further the blast reaches (no cap, +dmg every second)
  skill: { kind: 'chargeBlast', area: 'front', name: 'โกมุโกมุโนะ บาซูก้า (สกิลค้าง · ยิ่งค้างยิ่งไกล)', cost: 30, up: 'bazUp', rise: 12, hold: 'bazHold', go: 'bazGo', goDur: 16, hitAt: 5, y: -30, base: 90, grow: 2.6, dmg: 4, kb: 16 },
  skills: { down: { kind: 'chargeBlast', area: 'ground', name: 'ชาร์จเหยียบพื้น (↓+สกิลค้าง · ยิ่งค้างยิ่งกว้าง)', cost: 20, up: 'stompUp', rise: 10, go: 'stompDown', goDur: 18, hitAt: 14, base: 70, grow: 2.4, dmg: 3, kb: 8 } },
  dash: { kind: 'dash', name: 'พุ่งยาง', pose: 'dashp', speed: 7.2, dur: 18, cd: 26, hit: { box: [-6, -40, 34, 40], dmg: 2 }, air: false },
  airDash: { kind: 'rocket', name: 'โกมุโกมุ ร็อกเก็ต', pose: 'fly', vx: 6.4, vy: -9.6, dur: 18, cd: 10, hit: { box: [-6, -40, 34, 40], dmg: 2 } },
  // ult: the gatling until the player picks the new one
  ult: { input: 'D+A', name: 'GOMU GOMU GATLING · แกตลิ่ง', kind: 'step', step: { pose: 'gatling', dur: 50, on: [2, 3, 4, 5, 6, 7], hit: [6, 44], box: [4, -48, 100, 36], dmg: 9, kb: 10, heavy: true, multi: true, shake: 5 } },
  // v106 GEAR SECOND — a form change (Q / ⟳, like X's armour): pink-red skin, steam, faster, harder blows, charges fill faster
  forms: [{ name: 'ปกติ' }, { name: 'เกียร์ 2' }], formLabel: 'เปลี่ยนร่าง', formBtn: 'เกียร์',
  mod: {
    dash(p, D) { if (p.onGround) return false; p.startDash(p.hero.airDash); return true; },
    reset(p) { p.gear2 = false; p.speedMul = 1; p.dmgMul = 1; p.chargeMul = 1; p.ghostPal = null; },
    update(p, inp) {
      const g = p.g;
      if (inp.wasPressed('swap') && p.onGround && !p.act && !p.dead && p.hurtT === 0) {
        const on = !p.gear2;
        p.anim.play(on ? 'gearOn' : 'idle', on ? 26 : null, true); sfx_(on ? 'gem' : 'select');
        p.act = { kind: 'gear', t: 0, pose: on ? 'gearOn' : 'idle', ownsMove: true, noJump: true, canTurn: false,
          update() { p.vx *= .5;
            if (on && this.t % 2 === 0) for (let i = 0; i < 3; i++) g.parts.push({ x: p.cx + U.rnd(-14, 14), y: p.y + U.rnd(4, p.h), vx: U.rnd(-1.5, 1.5), vy: U.rnd(-3, -1), life: 26, col: 'rgba(255,220,230,.85)', size: 5, grav: -.02, fade: true });
            if (++this.t === 14) { p.gear2 = on; p.speedMul = on ? 1.35 : 1; p.dmgMul = on ? 1.5 : 1; p.chargeMul = on ? 1.6 : 1; p.ghostPal = on ? GEAR_PAL : null;
              if (on) { g.flashT = 10; g.shake(4); g.text(p.cx, p.y - 16, 'GEAR SECOND!', '#ff8aa0', 70, true); } else g.text(p.cx, p.y - 10, 'กลับร่างปกติ', '#ffd8a0', 40); }
            if (this.t >= (on ? 26 : 16)) p.endAct(); } };
        return true;
      }
      if (p.gear2) {                                   // steam off the skin, afterimages at speed
        if (g.frame % 3 === 0) g.parts.push({ x: p.cx + U.rnd(-10, 10), y: p.y + U.rnd(2, p.h - 6), vx: U.rnd(-.6, .6), vy: U.rnd(-1.8, -.6), life: 30, col: 'rgba(255,225,235,.7)', size: 4, grav: -.01, fade: true });
        if (Math.abs(p.vx) > 2.6 && g.frame % 4 === 0) g.afterimage(p);
      }
      return false;
    },
    drawOpts(p, o) { if (p.gear2) o.pal = GEAR_PAL; },
  },
};

H.x = {
  name: 'X', th: 'เอ็กซ์ นักรบบัสเตอร์', role: 'ยิง · ชาร์จ · Z-เซเบอร์', color: '#3aa8ff',
  desc: 'ยิงบัสเตอร์ · กดโจมตีค้างเพื่อชาร์จ · ↑+โจมตี ยิงเฉียงขึ้น · ไต่/ถีบกำแพง · สกิล Z-เซเบอร์ฟันระยะประชิด',
  sprite: strip('heroes/x/', 80, {
    idle: { n: 9, cw: 37, ax: 18 }, walk: { n: 14, cw: 50, ax: 28 }, hurt: { n: 6, cw: 44, ax: 21 }, dead: { n: 5, cw: 53, ax: 29 },
    atk1: { n: 7, cw: 43, ax: 19 }, atk3: { n: 6, cw: 68, ax: 33 }, charge: { n: 4, cw: 43, ax: 19 }, fin: { n: 8, cw: 43, ax: 19 },
    saber: { n: 11, cw: 82, ax: 40 }, saber2: { n: 13, cw: 102, ax: 48 } }),
  scale: 1.02, box: [16, 42], hp: 4, speed: 1.05, jump: 1.02,
  poses: { idle: { a: 'idle', fps: 6 }, walk: { a: 'walk', f: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], fps: 18 }, run: { a: 'walk', f: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], fps: 24 },
    jump: { a: 'walk', f: [4] }, fall: { a: 'walk', f: [10] }, wall: { a: 'hurt', f: [0] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 6 }, dashp: { a: 'atk3', f: [2, 3, 4, 5], fps: 14, loopy: true },
    ucharge: { a: 'charge', fps: 14, loopy: true } },
  wallJump: true,
  attack: { kind: 'shot', name: 'บัสเตอร์ (ค้าง = ชาร์จ)', pose: 'atk1', dur: 14, fireAt: 2, proj: 'lemon', y: -27, rate: 8, max: 3,
    charge: [{ t: 26, proj: 'shotB', col: '#6ad8ff' }, { t: 66, proj: 'shotP', col: '#ff7af0' }] },
  moves: { up: { name: 'ยิงเฉียงขึ้น', kind: 'shotUp', pose: 'atk1', dur: 14, fireAt: 2, proj: 'lemon', angle: .8, y: -36, rate: 8 } },
  skill: { kind: 'step', name: 'Z-เซเบอร์', cost: 15, pose: 'saber', dur: 30, on: [3, 4, 5, 6, 7], hit: [8, 20], box: [0, -50, 48, 50], dmg: 3, kb: 6, heavy: true },
  skills: { up: { kind: 'step', name: 'Z-เซเบอร์ จันทร์เสี้ยว (↑+สกิล)', cost: 25, pose: 'saber2', dur: 36, on: [1, 2, 3, 4, 5], hit: [4, 16], box: [-10, -66, 70, 66], dmg: 4, kb: 7, up: true, heavy: true } },
  dash: { kind: 'dash', name: 'แดช', pose: 'dashp', speed: 6.2, dur: 18, cd: 22, air: true },
  ult: { input: 'holdS', name: 'GIGA BUSTER · ชาร์จสกิลค้างแล้วปล่อย', kind: 'giga', pose: 'fin', dur: 44, fireAt: 22, proj: 'lvl4', scale: .72, dmg: 14, chargePose: 'ucharge', hold: 50 },
};

H.elon = {
  name: 'ELON S. KEMNANY', th: 'อีลอน สายลับมือปืน', role: 'มือปืน · คอมโบอาวุธ', color: '#c8b48a',
  desc: 'ยิงปืนพกไกล · ยิงโดนต่อเนื่อง 5 ครั้งเปลี่ยนเป็นหน้าไม้ทะลุ (เหมือนเกมหลัก) · ใกล้ศัตรูจะเตะแทน · สกิลบาซูก้าระเบิด · กลิ้งหลบอมตะ',
  sprite: strip('heroes/elon/', 105, {
    idle: { n: 2, cw: 54, ax: 26 }, hurt: { n: 3, cw: 94, ax: 43 }, dead: { n: 3, cw: 99, ax: 43 },
    melee: { n: 6, cw: 96, ax: 42 }, pistol: { n: 6, cw: 76, ax: 28 }, xbow: { n: 6, cw: 119, ax: 57 }, rpg: { n: 7, cw: 133, ax: 63 },
    // roll.png is NOT a uniform strip: frames sit between 1 px divider lines at irregular x → explicit rects [x, w, ax]
    roll: { n: 7, rects: [[0, 160, 93], [161, 149, 76], [311, 168, 102], [480, 142, 70], [623, 173, 90], [797, 166, 72], [964, 162, 95]] } }),
  scale: .5, box: [16, 44], hp: 4, speed: 1, jump: 1, stepBob: true,
  poses: { idle: { a: 'idle', fps: 3 }, walk: { a: 'idle', fps: 6 }, run: { a: 'idle', fps: 9 }, jump: { a: 'melee', f: [1] }, fall: { a: 'idle', f: [0] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 4 }, rollp: { a: 'roll', fps: 18 } },
  attack: { kind: 'shot', pose: 'pistol', dur: 16, fireAt: 5, proj: 'bullet', y: -36, rate: 12, max: 4,
    combo: { at: 5, pose: 'xbow', proj: 'bolt' },
    melee: { range: 30, pose: 'melee', dur: 22, hit: [7, 15], box: [0, -44, 34, 30], dmg: 2, kb: 6 } },
  skill: { kind: 'proj', name: 'บาซูก้า', cost: 40, pose: 'rpg', dur: 40, fireAt: 22, proj: 'rocket', y: -40, recoil: 2.5 },
  dash: { kind: 'roll', name: 'กลิ้งหลบ', pose: 'rollp', speed: 5, dur: 26, cd: 34, inv: 26 },
};

H.mao = {
  name: 'Mia', th: 'มีอา นินจาพัดไฟ', role: 'คล่องตัว · กระโดด 2 ชั้น', color: '#ff6a4a',
  desc: 'กระโดดสองชั้น · ↑+โจมตี = พัดเสยลอย · กลางอากาศโจมตี = เตะตีลังกา · สกิลขว้างพัดไฟวนกลับ · ↑+สกิล = เสาเพลิง',
  sprite: strip('heroes/mia/', 182, {
    idle: { n: 11, cw: 95, ax: 41 }, walk: { n: 11, cw: 118, ax: 55 }, hurt: { n: 4, cw: 112, ax: 43 }, dead: { n: 5, cw: 173, ax: 79 },
    atk1: { n: 5, cw: 122, ax: 62 }, atk2: { n: 5, cw: 181, ax: 73 }, atk3: { n: 7, cw: 157, ax: 64 }, kasen: { n: 5, cw: 151, ax: 60 },
    roll: { n: 11, cw: 164, ax: 71 }, flip: { n: 6, cw: 134, ax: 56 }, fin: { n: 12, cw: 137, ax: 76 } }, { by: 181 }),
  scale: .44, smooth: true, box: [16, 44], hp: 4, speed: 1.08, jump: 1,
  poses: { idle: { a: 'idle', fps: 8 }, walk: { a: 'walk', fps: 14 }, run: { a: 'walk', fps: 20 }, jump: { a: 'fin', f: [1] }, fall: { a: 'walk', f: [2] },
    airjump: { a: 'flip', f: [1, 2, 3, 4, 5], fps: 18, hold: true }, hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 6 }, rollp: { a: 'roll', f: [0, 1, 2, 3, 4, 5, 6, 7], fps: 20, loopy: true },
    flipk: { a: 'flip', f: [1, 2, 3, 4, 5] }, u_rise: { a: 'fin', f: [1, 2, 3, 4], fps: 12, hold: true }, u_dive: { a: 'fin', f: [5, 6, 7, 8, 9], fps: 14, loopy: true }, u_land: { a: 'fin', f: [10, 11], fps: 8 } },
  airJumps: 1,
  attack: { kind: 'combo', name: 'พัด-เตะ-ศอก 3 จังหวะ', steps: [
    { pose: 'atk1', dur: 18, on: [1, 2, 3], hit: [5, 13], box: [-4, -56, 44, 56], dmg: 1, kb: 3 },
    { pose: 'atk2', dur: 20, on: [1, 2, 3], hit: [7, 15], box: [-10, -46, 58, 40], dmg: 1, kb: 3 },
    { pose: 'atk3', dur: 22, on: [2, 3, 4], hit: [6, 16], box: [0, -44, 42, 30], dmg: 2, kb: 5, lunge: 5 } ] },
  moves: {
    up:  { name: 'พัดเสยลอย', pose: 'atk1', dur: 20, on: [1, 2, 3], hit: [5, 14], box: [-6, -70, 48, 70], dmg: 2, kb: 3, up: true },
    air: { name: 'เตะตีลังกา', pose: 'flipk', dur: 22, auto: false, hit: [4, 18], box: [-20, -50, 44, 50], dmg: 2, kb: 4 },
  },
  skill: { kind: 'proj', name: 'คาโชเซ็น (พัดบูมเมอแรง)', cost: 18, pose: 'kasen', dur: 22, fireAt: 8, proj: 'fan', y: -42, max: 1 },
  skills: { up: { kind: 'pillar', name: 'คาเงโรโนะไม (↑+สกิล เสาเพลิง)', cost: 30, pose: 'kasen', dur: 26, at: 10, dist: 64, every: 8, hits: 5, dmg: 1, box: [26, 96] } },
  dash: { kind: 'roll', name: 'ชิโนบิบาจิ', pose: 'rollp', speed: 5.8, dur: 24, cd: 34, inv: 24, hit: { box: [-14, -34, 34, 34], dmg: 1 } },
  ult: { input: 'dS_air', name: 'MUSASABI NO MAI · กลางอากาศ ↓+สกิล', kind: 'dive', pose: 'u_dive', rise: 'u_rise', land: 'u_land', riseT: 16, riseVy: -5, vx: 5.5, vy: 6.5, dmg: 6, boom: { r: 96, dmg: 6 } },
};

H.boomtos = {
  name: 'Boomtos', th: 'บูมทอส ผู้พิทักษ์ไฟใต้พิภพ', role: 'หนัก · ทุบแผ่นดิน', color: '#ff7a2a',
  desc: 'ฟาดดาบเพลิงวงกว้างดาเมจสูง · สกิลกระโดดทุบแผ่นดิน คลื่นไฟทั้งสองข้าง (กลางอากาศกด ↓+โจมตีก็ทุบได้) · หมุนกระโดดฟันพุ่ง',
  sprite: strip('heroes/boomtos/', 97, {
    idle: { n: 2, cw: 61, ax: 33 }, walk: { n: 6, cw: 61, ax: 33 }, hurt: { n: 3, cw: 61, ax: 33 }, dead: { n: 2, cw: 71, ax: 32 },
    atk1: { n: 8, cw: 101, ax: 32 }, atk2: { n: 6, cw: 59, ax: 30 }, slam: { n: 11, cw: 109, ax: 49 } }),
  scale: 1.12, box: [24, 38], hp: 6, speed: .9, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 3 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 15 }, jump: { a: 'slam', f: [2] }, fall: { a: 'slam', f: [3] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 4 }, spinp: { a: 'atk2', f: [2, 3], fps: 16, loopy: true }, slamDown: { a: 'slam', f: [3] }, slamLand: { a: 'slam', f: [4, 5, 6, 7, 8, 9, 10], fps: 16 } },
  attack: { kind: 'combo', steps: [{ pose: 'atk1', dur: 30, hit: [12, 22], box: [-16, -66, 76, 66], dmg: 3, kb: 6, shake: 2 }],
    down: 'slam' },
  skill: { kind: 'slam', name: 'ทุบแผ่นดิน', cost: 30, leap: 8, fall: 12, wave: { r: 96, h: 40, dmg: 3 } },
  dash: { kind: 'dash', name: 'หมุนฟันเพลิง', pose: 'spinp', speed: 5.2, dur: 20, cd: 40, hit: { box: [-18, -40, 40, 40], dmg: 2, multi: 8 }, air: true, trail: '#ff6a2a' },
};

H.cream = {
  name: 'Cream', th: 'ครีม สารวัตรหญิงหมัดเพลิงแดง', role: 'หมัดเร็ว · ชาร์จ HEAT', color: '#ff3a4a',
  desc: 'หมัด-หมัด-เตะ เร็วที่สุด · สกิลค้างเพื่อชาร์จ HEAT (ลดดาเมจที่รับ 50%) ปล่อยหมัดเพลิงไกล แรงตาม HEAT · เตะพุ่ง',
  sprite: strip('heroes/cream/', 230, {
    idle: { n: 10, cw: 200, ax: 90 }, walk: { n: 8, cw: 200, ax: 90 }, hurt: { n: 3, cw: 240, ax: 100 }, dead: { n: 7, cw: 400, ax: 110 },
    guard: { n: 2, cw: 240, ax: 90 }, jab: { n: 2, cw: 260, ax: 90 }, cross: { n: 2, cw: 260, ax: 90 }, kick: { n: 3, cw: 300, ax: 90 } }, { by: 228 }),
  scale: .23, smooth: true, box: [16, 44], hp: 5, speed: 1.04, jump: 1,
  poses: { idle: { a: 'idle', fps: 7 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 15 }, jump: { a: 'kick', f: [0] }, fall: { a: 'walk', f: [3] },
    hurt: { a: 'hurt', fps: 7 }, dead: { a: 'dead', fps: 6 }, guardp: { a: 'guard', f: [1, 0], fps: 12 }, kickp: { a: 'kick', f: [1] } },
  attack: { kind: 'combo', steps: [
    { pose: 'jab', dur: 11, hit: [3, 8], box: [4, -40, 30, 14], dmg: 1, kb: 2 },
    { pose: 'cross', dur: 13, hit: [4, 9], box: [4, -40, 34, 14], dmg: 1, kb: 3 },
    { pose: 'kick', dur: 20, hit: [6, 14], box: [2, -48, 38, 28], dmg: 2, kb: 6, fx: 'kick' } ] },
  skill: { kind: 'heat', name: 'CRIMSON STRIKE', cost: 12, pose: 'guardp', step: 28, max: 3, proj: 'fist', dmg: [2, 4, 7], y: -34 },
  dash: { kind: 'dash', name: 'เตะพุ่ง', pose: 'kickp', speed: 6.4, dur: 14, cd: 34, hit: { box: [0, -48, 38, 30], dmg: 2 }, air: true, trail: '#ff3a3a' },
};

H.yota = {
  name: 'YOTA', th: 'โยตะ ผู้กองทวงค่าเช่า', role: 'หนัก · ลำแสง', color: '#6a8aff',
  desc: 'หมัดทวงหนี้ 3 จังหวะ · ↑+โจมตี = เตะเสยลอย · ↓+โจมตี = ผลักกระเด็น · สกิลลำแสงค่าเช่าทะลุทั้งแถว · พุ่งดัน "ส่งค่าเช่าบ้านยัง!!!"',
  sprite: strip('heroes/yota/', 200, {
    idle: { n: 12, cw: 200, ax: 90 }, walk: { n: 8, cw: 200, ax: 90 }, hurt: { n: 2, cw: 260, ax: 130 }, dead: { n: 7, cw: 380, ax: 170 },
    push: { n: 4, cw: 240, ax: 90 }, palm: { n: 2, cw: 240, ax: 90 }, charge: { n: 2, cw: 240, ax: 90 }, fire: { n: 1, cw: 240, ax: 90 }, kick: { n: 2, cw: 240, ax: 90 } }, { by: 199 }),
  scale: .25, smooth: true, box: [22, 44], hp: 6, speed: .86, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 7 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 14 }, jump: { a: 'walk', f: [2] }, fall: { a: 'walk', f: [6] },
    hurt: { a: 'hurt', fps: 6 }, dead: { a: 'dead', fps: 6 }, pushp: { a: 'push', f: [2, 3], fps: 8, loopy: true } },
  attack: { kind: 'combo', name: 'หมัดทวงหนี้ 3 จังหวะ', steps: [
    { pose: 'palm', dur: 16, on: [1], hit: [5, 12], box: [4, -40, 34, 22], dmg: 1, kb: 3 },
    { pose: 'palm', dur: 16, on: [1], hit: [5, 12], box: [4, -40, 34, 22], dmg: 2, kb: 4 },
    { pose: 'kick', dur: 22, on: [1], hit: [7, 15], box: [2, -36, 40, 24], dmg: 3, kb: 8, heavy: true } ] },
  moves: {
    up:   { name: 'เตะเสยยึดบ้าน', pose: 'kick', dur: 22, on: [1], hit: [7, 15], box: [-4, -64, 44, 64], dmg: 2, kb: 3, up: true },
    down: { name: 'ผลักกระเด็น', pose: 'push', dur: 26, on: [2, 3], hit: [10, 20], box: [2, -44, 38, 44], dmg: 1, kb: 14 },
  },
  // beam: y = the palm in fire.png (-33 px), h = the visible core of the drawn beam (drawBeam's bright band ≈ ±0.6·h·1.15)
  skill: { kind: 'beam', name: 'ลำแสงค่าเช่า', cost: 40, chargePose: 'charge', firePose: 'fire', charge: 26, fire: 22, len: 330, h: 22, y: -33, dmg: 4, every: 6 },
  dash: { kind: 'dash', name: 'ส่งค่าเช่าบ้านยัง!!!', pose: 'pushp', speed: 4.4, dur: 22, cd: 40, hit: { box: [2, -44, 34, 44], dmg: 1, kb: 9 }, shout: 'ส่งค่าเช่าบ้านยัง!!!' },
  ult: { input: 'S+D', name: 'FINAL EVICTION · ยึดหมด!!!', kind: 'beam', beam: { chargePose: 'charge', firePose: 'fire', charge: 40, fire: 60, len: 640, h: 46, y: -34, dmg: 3, every: 4 } },
};

H.kea = {
  name: 'KEA', th: 'เคีย แม่พระเพลิง', role: 'แม่นับ ๑๒๓', color: '#ff4a6a', devOnly: true,
  desc: 'นับ ๑ ๒ ๓ — หมัด หมัด แล้วเตะแม่ดาเมจ ×4 · สกิลออร่าแม่โกรธระเบิดรอบตัว · (ชีตไม่มีท่าเดิน ใช้ท่ายืนแทน)',
  sprite: strip('heroes/kea/', 240, {
    idle: { n: 10, cw: 200, ax: 135 }, hurt: { n: 5, cw: 260, ax: 135 }, dead: { n: 8, cw: 410, ax: 130 },
    guard: { n: 2, cw: 220, ax: 135 }, jab: { n: 3, cw: 260, ax: 135 }, kick: { n: 3, cw: 360, ax: 135 } }, { by: 237 }),
  scale: .22, smooth: true, box: [16, 44], hp: 5, speed: 1, jump: 1, stepBob: true,
  poses: { idle: { a: 'idle', fps: 7 }, walk: { a: 'idle', fps: 12 }, run: { a: 'idle', fps: 16 }, jump: { a: 'kick', f: [1] }, fall: { a: 'guard', f: [0] },
    hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 7 }, kickp: { a: 'kick', f: [2] } },
  attack: { kind: 'combo', count: ['๑', '๒', '๓'], steps: [
    { pose: 'jab', dur: 13, hit: [4, 10], box: [4, -42, 32, 16], dmg: 1, kb: 2 },
    { pose: 'jab', dur: 13, hit: [4, 10], box: [4, -42, 32, 16], dmg: 1, kb: 2 },
    { pose: 'kick', dur: 22, hit: [8, 16], box: [4, -46, 54, 30], dmg: 4, kb: 8, fx: 'spark', shake: 3 } ] },
  skill: { kind: 'burst', name: 'แม่จะนับถึงสาม!', cost: 40, pose: 'guard', dur: 34, at: 18, r: 92, dmg: 3, fx: 'aura' },
  dash: { kind: 'dash', name: 'เตะแม่พุ่ง', pose: 'kickp', speed: 6.4, dur: 14, cd: 34, hit: { box: [4, -46, 40, 30], dmg: 2 }, air: true, trail: '#ff4a6a' },
};

H.shovel = {
  name: 'Shovel Knight', th: 'อัศวินพลั่ว (ตัวดั้งเดิมของโหมดนี้)', role: 'กระโดดพลั่ว · ไม้เท้าไฟ', color: '#6ab8ff', free: true,
  desc: 'สกิลบนพื้น: กดค้าง = ชาร์จลูกไฟ (ยิ่งนานยิ่งใหญ่) ปล่อย = ลูกไฟลอยไปช้า ๆ → พุ่งฟันใส่ลูกไฟเพื่อตีมันพุ่งออกไป · กลางอากาศ ↓+โจมตี = พลั่วอุกกาบาต (ดิ่งลง เด้งบนศัตรู/หนาม กระแทกพื้นเป็นคลื่น) · สกิลกลางอากาศหมุนตัวฟัน',
  sprite: { kind: 'atlas', atlasSrc: 'heroes/shovel/atlas.json', img: 'heroes/shovel/atlas.png', footGap: 0, midBy: 16 },
  scale: 1.35, box: [16, 38], hp: 5, speed: 1, jump: 1,
  poses: { idle: { a: 'idle', fps: 5 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 15 }, jump: { a: 'jump' }, fall: { a: 'fall' }, hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 5 },
    pogo: { a: 'pogo' }, dashp: { a: 'dash', fps: 16, loopy: true }, spinp: { a: 'spin', fps: 20, loopy: true }, castp: { a: 'cast', fps: 8 } },
  attack: { kind: 'combo', name: 'ฟาดพลั่ว', steps: [{ pose: 'attack', dur: 15, on: [3, 4], hit: [9, 15], box: [2, -32, 32, 24], dmg: 1, kb: 3 }] },
  // v93: the old ULT (SHOVEL METEOR) is now an ordinary move — in the air ↓ + attack, no ULT gauge, no cut-in.
  // It is the pogo plunge made heavier: dives fast, still bounces off enemies / spikes (chain them),
  // and hitting the ground sends a shock-wave (smaller than the old ULT, since it is free and repeatable).
  moves: { downAir: { name: 'พลั่วอุกกาบาต (กลางอากาศ ↓+โจมตี)', kind: 'meteorDive', fall: 11, wave: { r: 84, h: 40, dmg: 3 }, booms: 2, minFall: 8 } },
  // v93: hold the skill on the ground to charge a fireball (bigger the longer), release to let it go — it CRAWLS
  // forward very slowly; a dash-slash (L) that touches it bats it away at speed.
  skill: { kind: 'flareCharge', name: 'ไม้เท้าไฟ (ค้าง = ชาร์จ)', cost: 25, pose: 'castp', proj: 'flare', y: -24, max: 90, slow: .35,
    sizes: { scale: [1.6, 4.2], box: [14, 40], dmg: [2, 6], boom: [28, 70], boomDmg: [2, 5] }, crawl: .7, life: 520, push: 9,
    air: { kind: 'spin', name: 'หมุนตัวฟัน', cost: 25, pose: 'spinp', dur: 26, every: 8, box: [-28, -46, 56, 54], dmg: 1, hover: true } },
  dash: { kind: 'dash', name: 'พุ่งฟัน (ตีลูกไฟ)', pose: 'dashp', speed: 5.6, dur: 14, cd: 36, hit: { box: [-4, -34, 46, 30], dmg: 1 }, air: true, inv: 14, batFire: true },
  ult: null,
};

/* Roster rule (v86): only heroes whose sheet has a COMPLETE walk cycle are playable here.
   Kept out (definitions stay so they can return once a proper walk strip exists):
     elon    — walk.png is 2 identical idle frames (no steps)
     kea     — the sheet has no walk row at all
     cream   — the 8 walk frames repeat the same stride (legs never alternate; see README v80)
     boomtos — walk.png mixes 2 idle frames with a 4-frame run drawn at a smaller size (the body pops) */
['elon', 'kea', 'cream', 'boomtos'].forEach(id => { H[id].disabled = 'walk'; });
// platform-mode unlocks (in addition to heroes owned in the main game): clear these levels
PLAT.HERO_UNLOCK = { pip: '1-3', puff: '1-3', sonic: '2-3', x: '2-3', luffy: '2-3', mao: '3-1', yota: '3-3' };
PLAT.HERO_ORDER = ['knight', 'shovel', 'pip', 'puff', 'sonic', 'x', 'luffy', 'mao', 'yota'];
})(typeof window !== 'undefined' ? window : globalThis);
