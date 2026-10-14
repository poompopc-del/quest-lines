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
  fan:    { img: 'heroes/mia/fireshuriken.png', fw: 34, fh: 34, n: 11, rate: 2, scale: .8, speed: 6.5, dmg: 2, pierce: 99, life: 70, box: [24, 24], boomerang: true, glow: '#ff8a3a' },
  flare:  { atlasAnim: 'fireball', scale: 2, speed: 3.8, dmg: 2, life: 80, box: [14, 14], explode: { r: 30, dmg: 2, atlasAnim: 'boom' } },
  fist:   { img: 'heroes/cream/fx_fist.png', fw: 250, fh: 250, n: 6, rate: 4, scale: .26, speed: 7, dmg: 2, pierce: 2, life: 34, box: [40, 40], glow: '#ff3a3a' },
  // enemy shots
  fireball:  { img: 'bosses/dragon/fireball.png', fw: 56, fh: 32, n: 6, rate: 4, loopFrom: 3, scale: .55, speed: 3.2, dmg: 1, life: 140, box: [14, 12], enemy: true, explode: { r: 0 } },
  bigfire:   { img: 'bosses/dragon/fireball.png', fw: 56, fh: 32, n: 6, rate: 4, loopFrom: 3, scale: 1, speed: 3.6, dmg: 2, life: 200, box: [26, 20], enemy: true, explode: { r: 40, dmg: 2 } },
  wave:      { img: 'bosses/aqua/wave.png', fw: 69, fh: 83, n: 1, scale: .7, speed: 2.8, dmg: 1, life: 260, box: [30, 50], enemy: true, ground: true },
  drop:      { proc: 'drop', col: '#7ad8ff', speed: 0, grav: .22, dmg: 1, life: 200, box: [8, 12], enemy: true },
  rock:      { proc: 'rock', col: '#8a7a6a', speed: 0, grav: .3, dmg: 1, life: 200, box: [16, 16], enemy: true },
  shock:     { proc: 'shock', col: '#ffd060', speed: 4, dmg: 1, life: 90, box: [20, 18], enemy: true, ground: true },
};
const FX = PLAT.FXDEF = {
  boom:   { img: 'bosses/dragon/boom.png', fw: 53, fh: 48, n: 8, rate: 3, scale: 1 },
  impact: { img: 'heroes/yota/fx_impact.png', fw: 200, fh: 200, n: 10, rate: 2, scale: .3 },
  orb:    { img: 'heroes/yota/fx_orb.png', fw: 216, fh: 216, n: 11, rate: 3, scale: .22 },
  spark:  { img: 'heroes/kea/fx_spark.png', fw: 153, fh: 159, n: 8, rate: 3, scale: .4 },
  slash:  { img: 'heroes/kea/fx_slash.png', fw: 161, fh: 156, n: 8, rate: 2, scale: .34 },
  aura:   { img: 'heroes/kea/fx_aura.png', fw: 129, fh: 178, n: 8, rate: 3, scale: .42 },
  craura: { img: 'heroes/cream/fx_auras.png', fw: 112, fh: 108, n: 14, rate: 3, scale: .55 },
  ground: { img: 'heroes/cream/fx_ground.png', fw: 210, fh: 240, n: 8, rate: 3, scale: .3 },
  kick:   { img: 'heroes/cream/fx_kick.png', fw: 250, fh: 227, n: 6, rate: 3, scale: .28 },
};

/* ---------------------------------- heroes ---------------------------------- */
const H = PLAT.HEROES = {};

H.knight = {
  name: 'Elite Knight', th: 'อัศวินเหล็กผมแดง', role: 'ดาบใหญ่ · ทนทาน', color: '#ff5a4a',
  desc: 'ฟันดาบยักษ์ 3 จังหวะ ระยะไกลที่สุด · สกิลปล่อยคลื่นดาบทะลุศัตรู · เกราะหนา กระเด็นน้อย',
  sprite: strip('heroes/knight/', 112, {
    idle: { n: 4, cw: 216, ax: 70 }, walk: { n: 8, cw: 216, ax: 70 }, hurt: { n: 3, cw: 216, ax: 70 }, dead: { n: 4, cw: 216, ax: 110 },
    atk1: { n: 5, cw: 216, ax: 70 }, atk2: { n: 5, cw: 216, ax: 70 }, atk3: { n: 5, cw: 216, ax: 70 }, fin: { n: 7, cw: 216, ax: 70 } }, { by: 109 }),
  scale: .62, box: [18, 42], hp: 6, speed: .92, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 5 }, walk: { a: 'walk', fps: 12 }, run: { a: 'walk', fps: 17 }, jump: { a: 'walk', f: [2] }, fall: { a: 'walk', f: [6] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 6 } },
  attack: { kind: 'combo', steps: [
    { pose: 'atk1', dur: 24, on: [2, 3], hit: [9, 18], box: [2, -36, 58, 24], dmg: 2, kb: 4, lunge: 1.5 },
    { pose: 'atk2', dur: 24, on: [2, 3], hit: [9, 18], box: [2, -32, 64, 22], dmg: 2, kb: 4, lunge: 3.5 },
    { pose: 'atk3', dur: 30, on: [2, 3], hit: [11, 20], box: [-12, -70, 74, 70], dmg: 3, kb: 6, lunge: 1, shake: 2 } ] },
  skill: { kind: 'proj', name: 'คลื่นดาบอัศวิน', cost: 30, pose: 'fin', dur: 36, fireAt: 17, proj: 'arc', y: -30 },
  dash: { kind: 'dash', name: 'แทงพุ่ง', pose: 'atk2', f: [2, 3], speed: 6, dur: 14, cd: 40, hit: { box: [0, -32, 40, 24], dmg: 2 }, air: true },
};

H.pip = {
  name: 'Plink', th: 'พลิงค์ นักดาบหมวกเขียว', role: 'นักดาบ · โล่', color: '#5ad06a',
  desc: 'ฟันเร็ว 3 ท่า · กด ↓ ค้างบนพื้น = ตั้งโล่กันการโจมตีด้านหน้า · สกิลหมุนดาบรอบตัว · พุ่งฟันกลางอากาศได้',
  sprite: strip('heroes/plink/', 73, {
    idle: { n: 2, cw: 24, ax: 13 }, walk: { n: 10, cw: 42, ax: 21 }, hurt: { n: 3, cw: 46, ax: 25 }, dead: { n: 2, cw: 50, ax: 25 },
    atk1: { n: 5, cw: 68, ax: 45 }, atk2: { n: 4, cw: 47, ax: 17 }, atk3: { n: 5, cw: 57, ax: 35 }, spin: { n: 6, cw: 45, ax: 16 }, guard: { n: 7, cw: 32, ax: 16 } }),
  scale: 1, box: [16, 42], hp: 5, speed: 1.02, jump: 1,
  poses: { idle: { a: 'idle', fps: 3 }, walk: { a: 'walk', fps: 14 }, run: { a: 'walk', fps: 20 }, jump: { a: 'walk', f: [3] }, fall: { a: 'walk', f: [8] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 5 },
    guard: { a: 'guard', f: [6] }, dashp: { a: 'atk3', f: [0] } },
  guard: { pose: 'guard' },
  attack: { kind: 'combo', steps: [
    { pose: 'atk2', dur: 15, on: [1, 2, 3], hit: [5, 11], box: [2, -32, 36, 14], dmg: 1, kb: 3, lunge: 1.5 },
    { pose: 'atk1', dur: 18, on: [2, 3], hit: [5, 13], box: [-6, -60, 50, 60], dmg: 1, kb: 3 },
    { pose: 'atk3', dur: 22, on: [2, 3, 4], hit: [6, 15], box: [-8, -64, 46, 64], dmg: 2, kb: 5, lunge: 2.5 } ] },
  skill: { kind: 'spin', name: 'สปินแอทแท็ก', cost: 25, pose: 'spin', dur: 30, every: 7, box: [-34, -48, 68, 50], dmg: 1, hover: true },
  dash: { kind: 'dash', name: 'ฟันพุ่ง', pose: 'dashp', speed: 6.8, dur: 12, cd: 34, hit: { box: [-4, -36, 36, 30], dmg: 1 }, air: true, trail: '#ffb04a' },
};

H.puff = {
  name: 'Kirby', th: 'เคอร์บี้ ก้อนชมพูจอมดูด', role: 'ลอยตัว · ดูดแล้วพ่น', color: '#ff8ac8',
  desc: 'กดกระโดดกลางอากาศ = ลอยได้ 5 ครั้ง · สกิลค้าง = ดูดศัตรูตัวเล็ก/กระสุน แล้วกดโจมตีพ่นดาวแรง ×6 · ปกติเตะสไลด์',
  sprite: strip('heroes/kirby/', 34, {
    idle: { n: 10, cw: 26, ax: 13 }, walk: { n: 7, cw: 28, ax: 14 }, hurt: { n: 4, cw: 26, ax: 13 }, dead: { n: 4, cw: 36, ax: 18 },
    atk1: { n: 5, cw: 32, ax: 16 }, atk2: { n: 8, cw: 30, ax: 15 }, atk3: { n: 7, cw: 34, ax: 17 }, inhale: { n: 8, cw: 31, ax: 15 },
    fspit: { n: 6, cw: 33, ax: 16 }, fidle: { n: 4, cw: 33, ax: 16 }, fwalk: { n: 6, cw: 35, ax: 17 }, fhurt: { n: 4, cw: 34, ax: 17 } }, { by: 33 }),
  scale: 1.45, box: [20, 30], hp: 5, speed: .9, jump: 1,
  poses: { idle: { a: 'idle', fps: 4 }, walk: { a: 'walk', fps: 12 }, run: { a: 'walk', fps: 18 }, jump: { a: 'atk3', f: [0, 1, 2, 3], fps: 16, hold: true }, fall: { a: 'idle', f: [0] },
    float: { a: 'fidle', fps: 8, loopy: true }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 5 },
    // mouthful set (an enemy is held in Kirby's mouth)
    m_idle: { a: 'fidle', fps: 5, loopy: true }, m_walk: { a: 'fwalk', fps: 10, loopy: true }, m_hurt: { a: 'fhurt', fps: 10 }, m_jump: { a: 'fidle', f: [1] }, m_fall: { a: 'fidle', f: [2] },
    inhaling: { a: 'inhale', f: [3, 4, 5, 6, 7], fps: 12, loopy: true }, roll: { a: 'atk2', fps: 18, loopy: true } },
  airJumps: 5, float: { vy: -4.6, maxFall: 1.4, pose: 'float', puff: 'puff' },
  attack: { kind: 'combo', steps: [{ pose: 'atk1', dur: 22, hit: [3, 17], box: [-6, -16, 32, 16], dmg: 2, kb: 4, lunge: 5.5, slide: true }],
    mouthful: { pose: 'fspit', dur: 18, fireAt: 6, proj: 'star', y: -18 } },
  skill: { kind: 'inhale', name: 'ดูด!', cost: 0, pose: 'inhaling', range: 104, height: 44, pull: 2.6 },
  dash: { kind: 'dash', name: 'กลิ้งพุ่ง', pose: 'roll', speed: 5.6, dur: 20, cd: 36, hit: { box: [-14, -26, 30, 26], dmg: 1 }, air: false },
};

H.sonic = {
  name: 'Sonic', th: 'โซนิค เดอะเฮดจ์ฮ็อก', role: 'ความเร็ว · ลูกบอลหมุน', color: '#4a8aff',
  desc: 'เร็วที่สุด กระโดดเป็นลูกบอล ชนศัตรูแล้วเด้ง · กลางอากาศกดพุ่ง = โฮมมิ่งแอทแท็ก · สกิลค้าง = สปินแดชทะลุทุกอย่าง',
  sprite: strip('heroes/sonic/', 45, {
    idle: { n: 9, cw: 32, ax: 17 }, walk: { n: 6, cw: 39, ax: 19 }, hurt: { n: 2, cw: 39, ax: 22 }, dead: { n: 2, cw: 34, ax: 18 },
    run: { n: 4, cw: 31, ax: 14 }, spin: { n: 9, cw: 31, ax: 15 }, dash: { n: 10, cw: 31, ax: 15 }, spring: { n: 1, cw: 24, ax: 13 }, skid: { n: 2, cw: 34, ax: 16 } }),
  scale: 1.15, box: [16, 38], hp: 4, speed: 1.3, jump: 1.06, accel: 1.4,
  poses: { idle: { a: 'idle', fps: 4 }, walk: { a: 'walk', fps: 12 }, run: { a: 'run', fps: 20 }, jump: { a: 'spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true }, fall: { a: 'walk', f: [1] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 4 }, skid: { a: 'skid', fps: 10 }, spring: { a: 'spring' },
    ball: { a: 'spin', f: [2, 3, 4, 5, 6, 7, 8], fps: 30, loopy: true }, rev: { a: 'dash', f: [0, 1, 2, 3], fps: 24, loopy: true } },
  ballJump: true,
  attack: { kind: 'combo', steps: [{ pose: 'ball', dur: 22, hit: [0, 22], box: [-12, -30, 30, 30], dmg: 1, kb: 4, lunge: 5, slide: true }] },
  skill: { kind: 'spindash', name: 'สปินแดช', cost: 20, rev: 'rev', pose: 'ball', speed: 9.5, dur: 34, dmg: 2 },
  dash: { kind: 'homing', name: 'โฮมมิ่งแอทแท็ก', pose: 'ball', speed: 8, dur: 16, cd: 20, range: 190, hit: { box: [-14, -32, 30, 32], dmg: 2 } },
};

H.luffy = {
  name: 'Luffy', th: 'ลูฟี่ หมวกฟาง', role: 'แขนยาง · ระยะกลาง', color: '#ff4a3a',
  desc: 'กำปั้นยางยืดตีไกลมาก · สกิลแกตลิ่งรัวหมัด · พุ่งร็อกเก็ตเฉียงขึ้นข้ามเหวได้ (ทุกครั้งที่ลอยตัว)',
  sprite: strip('heroes/luffy/', 127, {
    idle: { n: 7, cw: 33, ax: 14 }, walk: { n: 6, cw: 40, ax: 18 }, hurt: { n: 3, cw: 51, ax: 34 }, dead: { n: 4, cw: 62, ax: 23 },
    pistol: { n: 7, cw: 94, ax: 21 }, gatling: { n: 9, cw: 125, ax: 52 }, rocket: { n: 6, cw: 66, ax: 46 }, dash: { n: 8, cw: 61, ax: 26 } }),
  scale: 1.08, box: [16, 42], hp: 5, speed: 1, jump: 1,
  poses: { idle: { a: 'idle', fps: 8 }, walk: { a: 'walk', fps: 12 }, run: { a: 'dash', f: [2, 3, 4, 5, 6, 7], fps: 16, loopy: true }, jump: { a: 'rocket', f: [2] }, fall: { a: 'walk', f: [2] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 5 }, fly: { a: 'rocket', f: [4, 5], fps: 12, loopy: true } },
  attack: { kind: 'combo', steps: [{ pose: 'pistol', dur: 26, on: [3, 4, 5], hit: [11, 19], box: [6, -42, 30, 16], dmg: 2, kb: 4 }] },
  skill: { kind: 'spin', name: 'โกมุโกมุ แกตลิ่ง', cost: 30, pose: 'gatling', dur: 46, every: 5, box: [4, -48, 96, 36], dmg: 1, front: true, loopPose: true },
  dash: { kind: 'rocket', name: 'โกมุโกมุ ร็อกเก็ต', pose: 'fly', vx: 6.4, vy: -9.6, dur: 18, cd: 10, hit: { box: [-6, -40, 34, 40], dmg: 2 } },
};

H.x = {
  name: 'X', th: 'เอ็กซ์ นักรบบัสเตอร์', role: 'ยิง · ชาร์จ · ไต่กำแพง', color: '#3aa8ff',
  desc: 'ยิงบัสเตอร์รัว · กดโจมตีค้างเพื่อชาร์จ ปล่อยเป็นกระสุนใหญ่ · ไต่/ถีบกำแพงได้ · สกิล GIGA BUSTER ทะลุทั้งจอ',
  sprite: strip('heroes/x/', 80, {
    idle: { n: 9, cw: 37, ax: 18 }, walk: { n: 14, cw: 50, ax: 28 }, hurt: { n: 6, cw: 44, ax: 21 }, dead: { n: 5, cw: 53, ax: 29 },
    atk1: { n: 7, cw: 43, ax: 19 }, atk3: { n: 6, cw: 68, ax: 33 }, charge: { n: 4, cw: 43, ax: 19 }, fin: { n: 8, cw: 43, ax: 19 } }),
  scale: 1.02, box: [16, 42], hp: 4, speed: 1.05, jump: 1.02,
  poses: { idle: { a: 'idle', fps: 6 }, walk: { a: 'walk', f: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], fps: 18 }, run: { a: 'walk', f: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], fps: 24 },
    jump: { a: 'walk', f: [4] }, fall: { a: 'walk', f: [10] }, wall: { a: 'hurt', f: [0] }, hurt: { a: 'hurt', fps: 10 }, dead: { a: 'dead', fps: 6 }, dashp: { a: 'atk3', f: [2, 3, 4, 5], fps: 14, loopy: true } },
  wallJump: true,
  attack: { kind: 'shot', pose: 'atk1', dur: 14, fireAt: 2, proj: 'lemon', y: -27, rate: 8, max: 3,
    charge: [{ t: 26, proj: 'shotB', col: '#6ad8ff' }, { t: 66, proj: 'shotP', col: '#ff7af0' }] },
  skill: { kind: 'proj', name: 'GIGA BUSTER', cost: 45, pose: 'fin', dur: 40, fireAt: 22, proj: 'lvl4', y: -26, recoil: 2 },
  dash: { kind: 'dash', name: 'แดช', pose: 'dashp', speed: 6.2, dur: 18, cd: 22, air: true },
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
  desc: 'กระโดดสองชั้นด้วยตีลังกา · ฟาดพัด 3 จังหวะ · สกิลขว้างพัดไฟวนกลับ · ม้วนตัวพุ่งชนอมตะ',
  sprite: strip('heroes/mia/', 182, {
    idle: { n: 11, cw: 95, ax: 41 }, walk: { n: 11, cw: 118, ax: 55 }, hurt: { n: 4, cw: 112, ax: 43 }, dead: { n: 5, cw: 173, ax: 79 },
    atk1: { n: 5, cw: 122, ax: 62 }, atk2: { n: 5, cw: 181, ax: 73 }, atk3: { n: 7, cw: 157, ax: 64 }, kasen: { n: 5, cw: 151, ax: 60 },
    roll: { n: 11, cw: 164, ax: 71 }, flip: { n: 6, cw: 134, ax: 56 } }, { by: 181 }),
  scale: .44, smooth: true, box: [16, 44], hp: 4, speed: 1.08, jump: 1,
  poses: { idle: { a: 'idle', fps: 8 }, walk: { a: 'walk', fps: 14 }, run: { a: 'walk', fps: 20 }, jump: { a: 'walk', f: [6] }, fall: { a: 'walk', f: [2] },
    airjump: { a: 'flip', f: [1, 2, 3, 4, 5], fps: 18, hold: true }, hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 6 }, rollp: { a: 'roll', f: [0, 1, 2, 3, 4, 5, 6, 7], fps: 20, loopy: true } },
  airJumps: 1,
  attack: { kind: 'combo', steps: [
    { pose: 'atk1', dur: 18, on: [1, 2, 3], hit: [5, 13], box: [-4, -56, 44, 56], dmg: 1, kb: 3 },
    { pose: 'atk2', dur: 20, on: [1, 2, 3], hit: [7, 15], box: [-10, -46, 58, 40], dmg: 1, kb: 3 },
    { pose: 'atk3', dur: 22, on: [2, 3, 4], hit: [6, 16], box: [0, -44, 42, 30], dmg: 2, kb: 5, lunge: 5 } ] },
  skill: { kind: 'proj', name: 'คาโชเซ็น', cost: 18, pose: 'kasen', dur: 22, fireAt: 8, proj: 'fan', y: -42, max: 1 },
  dash: { kind: 'roll', name: 'ชิโนบิบาจิ', pose: 'rollp', speed: 5.8, dur: 24, cd: 34, inv: 24, hit: { box: [-14, -34, 34, 34], dmg: 1 } },
};

H.boomtos = {
  name: 'Boomtos', th: 'บูมทอส ผู้พิทักษ์ไฟใต้พิภพ', role: 'หนัก · ทุบแผ่นดิน', color: '#ff7a2a',
  desc: 'ฟาดดาบเพลิงวงกว้างดาเมจสูง · สกิลกระโดดทุบแผ่นดิน คลื่นไฟทั้งสองข้าง (กลางอากาศกด ↓+โจมตีก็ทุบได้) · หมุนกระโดดฟันพุ่ง',
  sprite: strip('heroes/boomtos/', 97, {
    idle: { n: 2, cw: 61, ax: 33 }, walk: { n: 6, cw: 61, ax: 33 }, hurt: { n: 3, cw: 61, ax: 33 }, dead: { n: 2, cw: 71, ax: 32 },
    atk1: { n: 8, cw: 101, ax: 32 }, atk2: { n: 6, cw: 59, ax: 30 }, slam: { n: 11, cw: 109, ax: 49 } }),
  scale: 1.12, box: [24, 38], hp: 6, speed: .9, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 3 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 15 }, jump: { a: 'slam', f: [2] }, fall: { a: 'slam', f: [3] },
    hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 4 }, spinp: { a: 'atk2', f: [1, 2, 3, 4], fps: 18, loopy: true }, slamDown: { a: 'slam', f: [3] }, slamLand: { a: 'slam', f: [4, 5, 6, 7, 8, 9, 10], fps: 16 } },
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
    hurt: { a: 'hurt', fps: 7 }, dead: { a: 'dead', fps: 6 }, guardp: { a: 'guard', fps: 6, loopy: true }, kickp: { a: 'kick', f: [1] } },
  attack: { kind: 'combo', steps: [
    { pose: 'jab', dur: 11, hit: [3, 8], box: [4, -40, 30, 14], dmg: 1, kb: 2 },
    { pose: 'cross', dur: 13, hit: [4, 9], box: [4, -40, 34, 14], dmg: 1, kb: 3 },
    { pose: 'kick', dur: 20, hit: [6, 14], box: [2, -48, 38, 28], dmg: 2, kb: 6, fx: 'kick' } ] },
  skill: { kind: 'heat', name: 'CRIMSON STRIKE', cost: 12, pose: 'guardp', step: 28, max: 3, proj: 'fist', dmg: [2, 4, 7], y: -34 },
  dash: { kind: 'dash', name: 'เตะพุ่ง', pose: 'kickp', speed: 6.4, dur: 14, cd: 34, hit: { box: [0, -48, 38, 30], dmg: 2 }, air: true, trail: '#ff3a3a' },
};

H.yota = {
  name: 'YOTA', th: 'โยตะ ผู้กองทวงค่าเช่า', role: 'หนัก · ลำแสง', color: '#6a8aff',
  desc: 'หมัดทวงหนี้ + เตะยึดบ้าน · สกิลลำแสงค่าเช่ายิงทะลุทั้งแถว · พุ่งดัน "ส่งค่าเช่าบ้านยัง!!!" ผลักศัตรูกระเด็น',
  sprite: strip('heroes/yota/', 200, {
    idle: { n: 12, cw: 200, ax: 90 }, walk: { n: 8, cw: 200, ax: 90 }, hurt: { n: 2, cw: 260, ax: 130 }, dead: { n: 7, cw: 380, ax: 170 },
    push: { n: 4, cw: 240, ax: 90 }, palm: { n: 2, cw: 240, ax: 90 }, charge: { n: 2, cw: 240, ax: 90 }, fire: { n: 1, cw: 240, ax: 90 }, kick: { n: 2, cw: 240, ax: 90 } }, { by: 199 }),
  scale: .25, smooth: true, box: [22, 44], hp: 6, speed: .86, jump: 1, armor: true,
  poses: { idle: { a: 'idle', fps: 7 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 14 }, jump: { a: 'walk', f: [2] }, fall: { a: 'walk', f: [6] },
    hurt: { a: 'hurt', fps: 6 }, dead: { a: 'dead', fps: 6 }, pushp: { a: 'push', f: [2, 3], fps: 8, loopy: true } },
  attack: { kind: 'combo', steps: [
    { pose: 'palm', dur: 18, on: [1], hit: [5, 12], box: [4, -40, 34, 22], dmg: 2, kb: 5 },
    { pose: 'kick', dur: 22, on: [1], hit: [7, 15], box: [2, -36, 40, 24], dmg: 2, kb: 7 } ] },
  skill: { kind: 'beam', name: 'ลำแสงค่าเช่า', cost: 40, chargePose: 'charge', firePose: 'fire', charge: 26, fire: 22, len: 330, h: 18, y: -36, dmg: 4, every: 6 },
  dash: { kind: 'dash', name: 'ส่งค่าเช่าบ้านยัง!!!', pose: 'pushp', speed: 4.4, dur: 22, cd: 40, hit: { box: [2, -44, 34, 44], dmg: 1, kb: 9 }, shout: 'ส่งค่าเช่าบ้านยัง!!!' },
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
  desc: 'กลางอากาศกด ↓ + โจมตี = กดพลั่วลงเหยียบเด้งได้ต่อเนื่อง (เด้งบนหนามได้) · สกิลบนพื้นยิงลูกไฟ กลางอากาศหมุนตัวฟัน · พุ่งฟัน',
  sprite: { kind: 'atlas', atlasSrc: 'heroes/shovel/atlas.json', img: 'heroes/shovel/atlas.png', footGap: 0, midBy: 16 },
  scale: 1.35, box: [16, 38], hp: 5, speed: 1, jump: 1,
  poses: { idle: { a: 'idle', fps: 5 }, walk: { a: 'walk', fps: 10 }, run: { a: 'walk', fps: 15 }, jump: { a: 'jump' }, fall: { a: 'fall' }, hurt: { a: 'hurt', fps: 8 }, dead: { a: 'dead', fps: 5 },
    pogo: { a: 'pogo' }, dashp: { a: 'dash', fps: 16, loopy: true }, spinp: { a: 'spin', fps: 20, loopy: true }, castp: { a: 'cast', fps: 8 } },
  attack: { kind: 'combo', steps: [{ pose: 'attack', dur: 15, on: [3, 4], hit: [9, 15], box: [2, -32, 32, 24], dmg: 1, kb: 3 }], down: 'pogo' },
  skill: { kind: 'flare', name: 'ไม้เท้าไฟ / หมุนตัวฟัน', cost: 25, pose: 'castp', dur: 16, fireAt: 8, proj: 'flare', y: -24,
    air: { kind: 'spin', pose: 'spinp', dur: 26, every: 8, box: [-28, -46, 56, 54], dmg: 1, hover: true } },
  dash: { kind: 'dash', name: 'พุ่งฟัน', pose: 'dashp', speed: 5.6, dur: 14, cd: 36, hit: { box: [-4, -34, 46, 30], dmg: 1 }, air: true, inv: 14 },
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
