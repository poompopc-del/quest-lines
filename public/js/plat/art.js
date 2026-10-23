/* ==========================================================================
   PLATFORM MODE · world art (v89) — parallax layers, tile stamps, decor and
   enemy skins per theme, from the CC0 packs in public/scenes/plat/
   (Sunny Land · GothicVania Cemetery · GothicVania Church by ansimuz,
    2D Platformer Volcano Pack 1.1 by Tio Aimar — see scenes/plat/CREDITS.txt).
   --------------------------------------------------------------------------
   Pure DATA: physics, collision, maps and saves do not read anything here.
   A theme without `art` (or an image that fails to load) falls back to the
   old code-drawn look, so a missing file never breaks a level.

   tiles: stamps cut from a tileset (`img`, source cell = `unit` px) drawn into
          32 px world tiles.  A stamp is [sx, sy, sw, sh] or { img, r, oy }:
          oy = source px drawn ABOVE the tile top (grass overhang).
          Arrays of stamps = variants (picked per tile, stable).
   layers: back → front; f = horizontal parallax, fy = vertical, s = scale,
          y = top in view px, below = colour that fills under the layer.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, P = 'scenes/plat/';

const ART = PLAT.ART = {
  meadow: {
    layers: [
      { img: P + 'sunnyland/back.png', s: 1.6, f: .03, fy: .02, y: -14 },
      { img: P + 'sunnyland/middle.png', s: 1.25, f: .22, fy: .12, y: 112, below: '#2f5154' },
    ],
    tiles: { img: P + 'sunnyland/tileset.png', unit: 16,
      top: [[48, 16, 16, 16]], topL: [16, 16, 16, 16], topR: [80, 16, 16, 16],
      fill: [[48, 48, 16, 16]], fillL: [16, 48, 16, 16], fillR: [80, 48, 16, 16],
      bot: [48, 80, 16, 16], botL: [16, 80, 16, 16], botR: [80, 80, 16, 16],          // v122 the underside of floating ground
      brickTop: [272, 112, 16, 16], brick: [272, 144, 16, 16],
      oneway: [160, 16, 16, 16], onewayL: [144, 16, 16, 16], onewayR: [176, 16, 16, 16],
      spike: { img: P + 'sunnyland/spikes.png', r: [0, 0, 15, 10] },
      breakable: { img: P + 'sunnyland/crate.png', r: [0, 0, 16, 16] }, breakableClean: true,
      crumble: { img: P + 'sunnyland/block.png', r: [0, 0, 16, 16] } },
    decor: [{ img: P + 'sunnyland/tree.png', s: 1.6, w: 1 }, { img: P + 'sunnyland/bush.png', s: 2, w: 3 }, { img: P + 'sunnyland/rock.png', s: 2, w: 2 }, { img: P + 'sunnyland/shrooms.png', s: 2, w: 2 }],
  },
  night: {
    layers: [
      { img: P + 'cemetery/background.png', s: 1.7, f: .02, fy: .02, y: -20, below: '#2c0b26' },
      { img: P + 'cemetery/mountains.png', s: 1.3, f: .1, fy: .08, y: 120, below: '#00001a' },
      { img: P + 'cemetery/graveyard.png', s: 1.6, f: .28, fy: .14, y: 196, below: '#00001a' },
    ],
    tiles: { img: P + 'cemetery/tileset.png', unit: 16,
      top: [{ r: [64, 56, 16, 24], oy: 8 }, { r: [80, 56, 16, 24], oy: 8 }, { r: [96, 56, 16, 24], oy: 8 }, { r: [112, 56, 16, 24], oy: 8 }],
      topL: { r: [16, 56, 16, 24], oy: 8 }, topR: { r: [192, 56, 16, 24], oy: 8 },
      fill: [[64, 80, 16, 16], [80, 80, 16, 16], [96, 80, 16, 16], [112, 80, 16, 16]], deep: [[16, 96, 16, 16], [32, 96, 16, 16]],
      brickTop: { img: P + 'church/tileset.png', r: [16, 112, 16, 16] }, brick: [{ img: P + 'church/tileset.png', r: [16, 128, 16, 16] }, { img: P + 'church/tileset.png', r: [32, 128, 16, 16] }],
      oneway: { img: P + 'church/tileset.png', r: [72, 166, 16, 10] },
      spike: { r: [128, 80, 16, 16] },
      breakable: { img: P + 'church/tileset.png', r: [32, 112, 16, 16] }, crumble: { img: P + 'church/tileset.png', r: [16, 112, 16, 16] },
      liquidTop: P + 'swamp/water-top.png', liquid: P + 'swamp/water.png', acid: true },
    decor: [{ img: P + 'cemetery/stone-1.png', s: 1.4, w: 3 }, { img: P + 'cemetery/stone-2.png', s: 1.4, w: 3 }, { img: P + 'cemetery/stone-3.png', s: 1.4, w: 2 }, { img: P + 'cemetery/stone-4.png', s: 1.4, w: 2 },
      { img: P + 'cemetery/bush-small.png', s: 1.6, w: 2 }, { img: P + 'cemetery/tree-1.png', s: 1.1, w: 1 }, { img: P + 'cemetery/statue.png', s: 1.4, w: .6 }],
  },
  tower: {
    layers: [{ img: P + 'church/backgrounds.png', s: 1.5, f: .35, fy: .35, y: 0, tileY: true }],
    tiles: { img: P + 'church/tileset.png', unit: 16,
      top: [{ r: [72, 166, 16, 16], oy: 0 }, { r: [88, 166, 16, 16], oy: 0 }, { r: [136, 166, 16, 16], oy: 0 }],
      fill: [[16, 128, 16, 16], [32, 128, 16, 16]],
      brickTop: [[16, 112, 16, 16], [32, 112, 16, 16]], brick: [[16, 128, 16, 16], [32, 128, 16, 16], [80, 128, 16, 16]],
      oneway: [72, 166, 16, 10],
      spike: { img: P + 'cemetery/tileset.png', r: [128, 80, 16, 16] },
      breakable: [32, 112, 16, 16], crumble: [16, 112, 16, 16] },
    decor: [{ img: P + 'church/column.png', s: .8, w: 1 }],
  },
  lava: {
    layers: [
      { img: P + 'volcano/bg_6.png', s: .5, f: 0, fy: 0, y: 0, below: '#b0a0c8' },
      { img: P + 'volcano/bg_5.png', s: .5, f: .03, fy: .02, y: 4 },
      { img: P + 'volcano/bg_4.png', s: .5, f: .07, fy: .05, y: 150, below: '#311a3c' },
      { img: P + 'volcano/bg_3.png', s: .5, f: .12, fy: .08, y: 196, below: '#47225a' },
      { img: P + 'volcano/bg_2.png', s: .5, f: .18, fy: .11, y: 222, below: '#7a2f63' },
      { img: P + 'volcano/bg_1.png', s: .5, f: .26, fy: .14, y: 276, below: '#231a2e' },
    ],
    tiles: { unit: 128,
      top: [{ img: P + 'volcano/v05.png' }], topL: { img: P + 'volcano/v03.png' }, topR: { img: P + 'volcano/v07.png' },
      fill: [{ img: P + 'volcano/v34.png' }, { img: P + 'volcano/v35.png' }],
      brickTop: { img: P + 'volcano/v33.png' }, brick: [{ img: P + 'volcano/v34.png' }, { img: P + 'volcano/v35.png' }],
      oneway: { img: P + 'volcano/v15.png', r: [0, 0, 128, 64] }, onewayL: { img: P + 'volcano/v13.png', r: [0, 0, 128, 64] },
      liquidTop: P + 'volcano/v53.png', liquid: P + 'volcano/v54.png',
      breakable: { img: P + 'volcano/v21.png' }, crumble: { img: P + 'volcano/v33.png' } },
    decor: [{ img: P + 'volcano/v59.png', s: .4, w: 1 }, { img: P + 'volcano/v70.png', s: .3, w: 2 }, { img: P + 'volcano/v71.png', s: .3, w: 2 }, { img: P + 'volcano/v73.png', s: .3, w: 2 },
      { img: P + 'volcano/v66.png', s: .3, w: 1 }, { img: P + 'volcano/v68.png', s: .35, w: .7 }, { img: P + 'volcano/v65.png', s: .3, w: .7 }, { img: P + 'volcano/v72.png', s: .3, w: .7 }],
  },
  // v108 WORLD 4 swamp — Gothicvania Swamp by ansimuz (CC0). Its tileset has no spikes / ledges / crates,
  // so those borrow the cemetery + church packs (same artist, same palette family).
  swamp: {
    layers: [
      { img: P + 'swamp/background.png', s: 1.45, f: .02, fy: .02, y: -10, below: '#1c2a20' },
      { img: P + 'swamp/mid-layer-01.png', s: 1.45, f: .1, fy: .06, y: 0, below: '#141f18' },
      { img: P + 'swamp/mid-layer-02.png', s: 1.45, f: .22, fy: .12, y: 10, below: '#0e1712' },
    ],
    tiles: { img: P + 'swamp/tileset.png', unit: 16,
      // v111: every surface stamp starts 5 source px lower — the tileset leaves ~6 px of empty space above its grass,
      // so heroes and monsters looked like they floated above the ground
      top: [[48, 5, 16, 16], [64, 5, 16, 16], [80, 5, 16, 16], [240, 5, 16, 16], [256, 5, 16, 16]], topL: [32, 5, 16, 16], topR: [96, 5, 16, 16],
      // v109: only the lit rows — the tileset darkens toward its bottom, which made mounds / dips a light-dark checkerboard
      fill: [[48, 21, 16, 16], [64, 21, 16, 16], [80, 21, 16, 16], [240, 21, 16, 16], [256, 21, 16, 16]], fillL: [32, 21, 16, 16], fillR: [96, 21, 16, 16], deep: [[48, 37, 16, 16], [64, 37, 16, 16], [80, 37, 16, 16]], deepColor: '#1e201e',   // v122: fades into the dark like the pack (no more lit rows stacked with seams)
      brickTop: [[144, 5, 16, 16], [160, 4, 16, 16], [176, 5, 16, 16]], brick: [[144, 16, 16, 16], [160, 16, 16, 16], [176, 16, 16, 16], [160, 32, 16, 16]],
      oneway: [{ r: [48, 5, 16, 10] }, { r: [64, 5, 16, 10] }, { r: [80, 5, 16, 10] }], onewayL: { r: [32, 6, 16, 10] }, onewayR: { r: [96, 6, 16, 10] },
      spike: { img: P + 'cemetery/tileset.png', r: [128, 80, 16, 16] },
      liquidTop: P + 'swamp/water-top.png', liquid: P + 'swamp/water.png',
      breakable: [[160, 4, 16, 16]], crumble: [[256, 21, 16, 16]] },
    decor: [{ img: P + 'swamp/plant-1.png', s: 1.6, w: 3 }, { img: P + 'swamp/plant-2.png', s: 1.6, w: 2 }, { img: P + 'swamp/plant-3.png', s: 1.6, w: 3 },
      { img: P + 'swamp/prop-1.png', s: 1.5, w: 1 }, { img: P + 'swamp/prop-2.png', s: 1.5, w: 1 }, { img: P + 'swamp/prop-3.png', s: 1.5, w: 1 }],
  },
  // ---- v115 batch 2 (ansimuz, CC0): Gothicvania Town · Fort of Illusion · Forest of Illusion · Super Grotto Escape
  // town/tiles.png is an atlas built by tools/plat-import-monsters.py from the pack's sliced tiles
  town: {
    layers: [
      { img: P + 'town/background.png', s: 1.3, f: .02, fy: .02, y: -14, below: '#4a2e44' },
      { img: P + 'town/middleground.png', s: 1.3, f: .12, fy: .08, y: 6, below: '#2e2840' },
    ],
    tiles: { img: P + 'town/tiles.png', unit: 16,
      top: [[0, 0, 16, 16], [16, 0, 16, 16]], fill: [[0, 16, 16, 16], [16, 16, 16, 16]], deep: [[32, 16, 16, 16], [48, 16, 16, 16]],
      brickTop: [[32, 0, 16, 16], [48, 0, 16, 16]], brick: [[64, 16, 16, 16], [80, 16, 16, 16]],
      oneway: [64, 0, 16, 13],
      spike: { img: P + 'cemetery/tileset.png', r: [128, 80, 16, 16] },
      breakable: { img: P + 'sunnyland/crate.png', r: [0, 0, 16, 16] }, breakableClean: true,
      crumble: { img: P + 'church/tileset.png', r: [16, 112, 16, 16] },
      liquidTop: P + 'swamp/water-top.png', liquid: P + 'swamp/water.png', acid: true },   // v122: acid pools drawn with the swamp's water art + a green glow
    decor: [{ img: P + 'town/house-a.png', s: 1, w: 1.2, span: 6 }, { img: P + 'town/house-b.png', s: .9, w: 1, span: 7 }, { img: P + 'town/house-c.png', s: .9, w: 1, span: 7 },
      { img: P + 'town/street-lamp.png', s: 1, w: 1.4 }, { img: P + 'town/well.png', s: 1, w: .6, span: 2 }, { img: P + 'town/wagon.png', s: 1, w: .6, span: 3 },
      { img: P + 'town/barrel.png', s: 1, w: 1.2 }, { img: P + 'town/crate-stack.png', s: .8, w: .7, span: 2 }, { img: P + 'town/sign.png', s: 1, w: .5 }],
  },
  fort: {
    layers: [
      { img: P + 'fort/back.png', s: 1.35, f: .01, fy: .01, y: -10, below: '#1c1a2a' },
      { img: P + 'fort/mountains.png', s: 1.35, f: .08, fy: .06, y: 0, below: '#1c1a2a' },
    ],
    tiles: { img: P + 'fort/tileset.png', unit: 16,
      top: [[64, 48, 16, 16], [80, 48, 16, 16], [96, 48, 16, 16], [112, 48, 16, 16]], topL: [48, 48, 16, 16], topR: [128, 48, 16, 16],
      fill: [[64, 64, 16, 16], [80, 64, 16, 16], [96, 64, 16, 16]], fillL: [48, 64, 16, 16], fillR: [128, 64, 16, 16], deep: [[64, 96, 16, 16], [80, 96, 16, 16], [96, 96, 16, 16]],
      brickTop: [[0, 16, 16, 16], [16, 16, 16, 16]], brick: [[0, 48, 16, 16], [16, 48, 16, 16], [0, 64, 16, 16], [16, 64, 16, 16], [0, 80, 16, 16], [16, 80, 16, 16]],
      oneway: [[96, 14, 16, 12], [112, 14, 16, 12]],
      spike: { img: P + 'cemetery/tileset.png', r: [128, 80, 16, 16] },
      liquidTop: P + 'volcano/v53.png', liquid: P + 'volcano/v54.png',
      breakable: { img: P + 'sunnyland/crate.png', r: [0, 0, 16, 16] }, breakableClean: true,
      crumble: [[16, 96, 16, 16]] },
    decor: [{ img: P + 'fort/banner.png', s: 1, w: 1 }, { img: P + 'fort/window.png', s: 1, w: .8 }, { img: P + 'fort/door.png', s: 1, w: .5, span: 4 }, { img: P + 'fort/closed-door.png', s: 1, w: .5, span: 4 },
      { img: P + 'fort/flag.png', s: 1.2, w: .8 }, { img: P + 'fort/front.png', s: 1, w: .35, span: 5 }],
  },
  forest: {
    layers: [
      { img: P + 'forest/back.png', s: 1.35, f: .03, fy: .02, y: -6, below: '#244a24' },
      { img: P + 'forest/middle.png', s: 1.35, f: .15, fy: .08, y: 0, below: '#1e1c18' },
    ],
    tiles: { img: P + 'forest/tiles.png', unit: 16,
      top: [{ r: [32, 8, 16, 24], oy: 8 }, { r: [48, 8, 16, 24], oy: 8 }, { r: [112, 8, 16, 24], oy: 8 }, { r: [128, 8, 16, 24], oy: 8 }],
      topL: { r: [16, 8, 16, 24], oy: 8 }, topR: { r: [64, 8, 16, 24], oy: 8 },
      fill: [[32, 32, 16, 16], [48, 32, 16, 16], [112, 32, 16, 16], [128, 32, 16, 16]], fillL: [16, 32, 16, 16], fillR: [64, 32, 16, 16],
      deep: [[32, 48, 16, 16], [48, 48, 16, 16], [112, 48, 16, 16], [128, 48, 16, 16]],
      brickTop: [{ r: [32, 8, 16, 24], oy: 8 }, { r: [112, 8, 16, 24], oy: 8 }], brick: [[32, 40, 16, 16], [48, 40, 16, 16], [112, 40, 16, 16]],
      oneway: [{ r: [32, 8, 16, 18], oy: 8 }, { r: [48, 8, 16, 18], oy: 8 }, { r: [112, 8, 16, 18], oy: 8 }], onewayL: { r: [16, 8, 16, 18], oy: 8 }, onewayR: { r: [64, 8, 16, 18], oy: 8 },
      spike: { img: P + 'sunnyland/spikes.png', r: [0, 0, 15, 10] },
      breakable: { img: P + 'sunnyland/crate.png', r: [0, 0, 16, 16] }, breakableClean: true,
      crumble: { img: P + 'sunnyland/block.png', r: [0, 0, 16, 16] } },
    decor: [{ img: P + 'sunnyland/bush.png', s: 2, w: 3 }, { img: P + 'sunnyland/shrooms.png', s: 2, w: 2 }, { img: P + 'swamp/plant-1.png', s: 1.4, w: 2 }, { img: P + 'swamp/plant-3.png', s: 1.4, w: 2 },
      { img: P + 'sunnyland/tree.png', s: 1.4, w: .8 }, { img: P + 'sunnyland/rock.png', s: 2, w: 1 }],
  },
  grotto: {
    layers: [
      { img: P + 'grotto/back.png', s: 1.5, f: .02, fy: .02, y: 0, below: '#150f22' },
      { img: P + 'grotto/far.png', s: 1.5, f: .07, fy: .05, y: 0, below: '#150f22' },
      { img: P + 'grotto/middle.png', s: 1.5, f: .16, fy: .1, y: 0 },
    ],
    tiles: { img: P + 'grotto/tileset.png', unit: 16,
      top: [[32, 64, 16, 16], [48, 64, 16, 16]], topL: [16, 64, 16, 16], topR: [64, 64, 16, 16],
      fill: [[32, 80, 16, 16], [48, 80, 16, 16]], fillL: [16, 80, 16, 16], fillR: [64, 80, 16, 16],
      deepColor: '#151123',                            // v122: under the first row the grotto is plain dark (the fill row repeated made stripes)
      brickTop: [[16, 112, 16, 16], [32, 112, 16, 16]], brick: [[16, 128, 16, 16], [32, 128, 16, 16]], brickAsGround: true,   // v122: walls are the same stone as the floor
      oneway: [[48, 30, 16, 14], [64, 30, 16, 14]],
      spike: { img: P + 'cemetery/tileset.png', r: [128, 80, 16, 16] },
      liquidTop: P + 'grotto/lava-top.png', liquid: P + 'grotto/lava.png',
      breakable: [[64, 112, 16, 16]], crumble: [[80, 112, 16, 16]] },
    decor: [{ img: P + 'grotto/palm.png', s: 1.3, w: 1.2 }, { img: P + 'grotto/plant.png', s: 1.4, w: 2 }, { img: P + 'grotto/plant-big.png', s: 1.3, w: 1.4 }, { img: P + 'grotto/pillar.png', s: 1.2, w: .5, span: 3 }],
  },
};
for (const k in ART) if (PLAT.THEMES[k]) PLAT.THEMES[k].art = ART[k];
if (PLAT.THEMES.ink) PLAT.THEMES.ink.art = ART.tower;          // v121 world 6 reuses the church art (tinted in game.js)

/* ----------------------------------------------------------------- enemy skins
   Per theme: enemy type → new LOOK only. AI, HP, damage, speed, armour, coins,
   "small" (Kirby can inhale) — everything that decides the fight — stay the
   type's own, so difficulty does not change. Types without a skin in a theme
   keep their old sprite (golden slime, every lava enemy, all bosses). */
const MSS = PLAT.MONSTER_SHEETS || {}, MSk = (name, scale, extra) => MSS[name] ? Object.assign({ sheet: MSS[name], scale, box: null, fps: 8 }, extra || {}) : null;
const S = PLAT.ART_SHEETS || {}, sk = (name, scale, extra) => S[name] ? Object.assign({ sheet: S[name], scale, box: null, fps: 8 }, extra || {}) : null;
PLAT.SKINS = {
  meadow: { slime: sk('opossum', 1, { fps: 10 }), hopper: sk('frog', 1.15, { fps: 6 }) },
  night: {
    zombie: sk('skeleton', 1, { fps: 8 }),
    cone: sk('skeletonClothed', 1, { fps: 8, states: null, afterSheet: S.skeleton }),
    bucket: sk('skeletonClothed', 1, { fps: 7, states: null, afterSheet: S.skeleton }),
    ghost: sk('spectre', .9, { fps: 6 }),
  },
  // v108 swamp: the Gothicvania Swamp creatures (strips in PLAT.MONSTER_SHEETS)
  swamp: {
    slime: MSk('spider', 1.2, { fps: 10 }),
    zombie: MSk('thing', 1.15, { fps: 6 }),
    ghost: MSk('wraith', 1, { fps: 8 }),
  },
  // v115: the town's dead walk as skeletons; the forest has its own critters; the fort and the grotto burn
  town: { zombie: sk('skeleton', 1, { fps: 8 }), ghost: sk('spectre', .9, { fps: 6 }) },
  forest: { slime: sk('opossum', 1, { fps: 10 }), hopper: sk('frog', 1.15, { fps: 6 }) },
  tower: {
    zombie: sk('ghoul', .82, { fps: 10 }),
    cone: sk('skeletonClothed', 1, { fps: 8, states: null, afterSheet: S.skeleton }),
    bucket: sk('skeletonClothed', 1, { fps: 7, states: null, afterSheet: S.skeleton }),
    ghost: sk('angel', .42, { fps: 8, smooth: true }),
  },
};
for (const t in PLAT.SKINS) for (const k in PLAT.SKINS[t]) if (!PLAT.SKINS[t][k]) delete PLAT.SKINS[t][k];
/* the definition an enemy of `type` uses in a level of `theme` (skin over the base type) */
PLAT.enemyDef = (type, theme) => {
  const base = PLAT.ENEMIES[type] || PLAT.BOSSES[type], skin = PLAT.SKINS[theme] && PLAT.SKINS[theme][type];
  if (!skin || !base) return base;
  const d = Object.assign({}, base, skin);
  if (!skin.box) d.box = base.box;       // fallback collision box if the sprite cannot be measured
  return d;
};
/* every image a theme needs (layers, tileset, stamps, decor) — for the loader and tools/plat-assets.py */
PLAT.themeImages = th => {
  const a = th && th.art, out = new Set(); if (!a) return [];
  (a.layers || []).forEach(l => out.add(l.img)); (a.decor || []).forEach(d => out.add(d.img));
  const t = a.tiles || {}; if (t.img) out.add(t.img);
  for (const v of Object.values(t)) for (const s of [].concat(v)) { if (s && typeof s === 'object' && !Array.isArray(s) && s.img) out.add(s.img); else if (typeof s === 'string' && /\.png$/.test(s)) out.add(s); }
  return [...out];
};
})(typeof window !== 'undefined' ? window : globalThis);
