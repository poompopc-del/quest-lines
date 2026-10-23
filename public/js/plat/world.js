/* ==========================================================================
   PLATFORM MODE · world — level building + tile physics
   --------------------------------------------------------------------------
   Level maps are ASCII (js/plat/levels.js). Tile legend:
     .  empty            #  ground (solid)        =  stone brick (solid)
     -  one-way ledge    ^  spikes (hurt)         ~  lava / water (hurt + respawn)
     B  breakable block  C  crumbling block       F  fake wall (secret, walk through)
     S  spring           o  coin                  G  gem (3 per level)
     H  heart            P  player start          K  checkpoint flag
     U  poison gas vent  Y  lantern (dark levels)  (v108, js/plat/gimmicks.js)
     E  exit door        1-9 hint sign (text in level.signs)
     enemy letters: see PLAT.ENEMY_CODES (enemies.js)
   Pure logic — no DOM, so tools/plat-validate.mjs can run it in Node.
   ========================================================================== */
(function (G) {
'use strict';
const PLAT = G.PLAT, C = PLAT.C, T = C.T;
const TL = PLAT.TILE = { EMPTY: 0, GROUND: 1, BRICK: 2, ONEWAY: 3, SPIKE: 4, LIQUID: 5, BREAK: 6, CRUMBLE: 7, FAKE: 8 };
const CHAR_TILE = { '#': 1, '=': 2, '-': 3, '^': 4, '~': 5, B: 6, C: 7, F: 8 };

function buildLevel(spec) {
  const rows = spec.map, h = rows.length, w = Math.max(...rows.map(r => r.length));
  const L = {
    spec, id: spec.id, w, h, pw: w * T, ph: h * T,
    tiles: new Uint8Array(w * h),
    crumble: new Map(),        // index → { t: frames until it falls / respawns, state: 'idle'|'shake'|'gone' }
    coins: [], gems: [], hearts: [], springs: [], checkpoints: [], signs: [], spawns: [], movers: [],
    start: { x: T * 2, y: T * 2 }, exit: null,
  };
  for (let ty = 0; ty < h; ty++) {
    const row = rows[ty];
    for (let tx = 0; tx < w; tx++) {
      const ch = row[tx] || '.', cx = tx * T + T / 2, by = (ty + 1) * T;   // tile centre x, tile bottom y
      if (CHAR_TILE[ch]) { L.tiles[ty * w + tx] = CHAR_TILE[ch]; continue; }
      switch (ch) {
        case 'o': L.coins.push({ x: cx, y: ty * T + T / 2, got: false }); break;
        case 'G': L.gems.push({ x: cx, y: ty * T + T / 2, got: false, i: L.gems.length }); break;
        case 'H': L.hearts.push({ x: cx, y: ty * T + T / 2, got: false }); break;
        case 'S': L.springs.push({ x: tx * T + 4, y: by - 12, w: T - 8, h: 12, sq: 0 }); break;
        case 'P': L.start = { x: cx, y: by }; break;
        case 'K': L.checkpoints.push({ x: cx, y: by, on: false }); break;
        case 'A': L.bossSpawn = { x: cx, y: by }; break;
        case 'U': (L.vents || (L.vents = [])).push({ tx, ty }); break;              // v108 poison gas vent (gimmicks.js)
        case 'Y': (L.lights || (L.lights = [])).push({ x: cx, y: ty * T + T / 2 }); break;   // v108 lantern (dark levels)
        case 'E': L.exit = { x: tx * T, y: by - T * 2, w: T, h: T * 2, open: !spec.boss }; break;
        default:
          if (ch >= '1' && ch <= '9') L.signs.push({ x: cx, y: by, text: (spec.signs || {})[ch] || '' });
          else if (PLAT.ENEMY_CODES && PLAT.ENEMY_CODES[ch]) L.spawns.push({ type: PLAT.ENEMY_CODES[ch], x: cx, y: by });
          else if (PLAT.ELITE_CODES && PLAT.ELITE_CODES[ch]) L.spawns.push({ type: PLAT.ELITE_CODES[ch], x: cx, y: by, elite: true });
      }
    }
  }
  (spec.movers || []).forEach((m, i) => {
    const LIFT = m.sink ? 12 : 0, x = m.tx * T, y = m.ty * T - LIFT;     // v110: a lily pad floats 12 px ABOVE the water line (ty)
    L.movers.push({ id: i, x, y, w: (m.w || 3) * T, h: 12, x0: x, y0: y, axis: m.axis || 'x', range: (m.range || 3) * T, speed: m.speed || 1, t: (m.phase || 0) * Math.PI * 2, dx: 0, dy: 0, prevY: y, sink: m.sink ? (m.sink === true ? 1.6 : m.sink) * T : 0, off: 0, load: 0, hold: 0, wy: m.ty * T });
  });
  return L;
}

/* ---------------------------------- tiles ---------------------------------- */
/* Tile coordinates are WORLD columns. A normal level starts at column 0 (L.ox = 0). An Endless level
   (endless.js) is a sliding window: L.ox is the world column of window column 0 and moves right as
   chunks are dropped behind the player — so nothing that stores world x (enemies, shots, camera …)
   ever has to be shifted. Columns left of the window (and right of it) read as wall. */
function tileAt(L, tx, ty) {
  const lx = tx - (L.ox || 0);
  if (lx < 0 || lx >= L.w) return TL.BRICK;          // level sides are walls
  if (ty < 0 || ty >= L.h) return TL.EMPTY;          // open above and below (below = pit)
  return L.tiles[ty * L.w + lx];
}
// crumble-state key of a tile (world coordinates, so it survives the Endless window sliding)
const ckey = (tx, ty) => tx * 128 + ty;
function isSolidTile(t) { return t === TL.GROUND || t === TL.BRICK || t === TL.BREAK || t === TL.CRUMBLE; }
function solidAt(L, tx, ty) {
  const t = tileAt(L, tx, ty);
  if (t === TL.CRUMBLE) { const c = L.crumble.get(ckey(tx, ty)); return !(c && c.state === 'gone'); }
  return isSolidTile(t);
}
function setTile(L, tx, ty, t) { const lx = tx - (L.ox || 0); if (lx >= 0 && lx < L.w && ty >= 0 && ty < L.h) { L.tiles[ty * L.w + lx] = t; L.dirty = true; } }

/* -------------------------------- movement --------------------------------
   moveBody(L, b, dx, dy, opt): axis-separated sweep in ≤ 6 px sub-steps (never tunnels: T = 32).
   b: { x, y, w, h } (top-left box). Sets b.onGround, b.wall (-1 / 0 / 1), b.ceil, b.groundTile.
   opt.drop  : fall through one-way ledges this frame
   opt.nudge : corner correction when bonking a ceiling edge (player only) */
function moveBody(L, b, dx, dy, opt) {
  opt = opt || {};
  b.wall = 0; b.ceil = false;
  // ---- X ----
  let steps = Math.ceil(Math.abs(dx) / 6) || 0;
  for (let i = 0; i < steps; i++) {
    const s = dx / steps; b.x += s;
    const edge = s > 0 ? b.x + b.w : b.x, tx = Math.floor((s > 0 ? edge - .001 : edge) / T);
    const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - .001) / T);
    let hit = false;
    for (let ty = y0; ty <= y1; ty++) if (solidAt(L, tx, ty)) { hit = true; break; }
    if (hit) { b.x = s > 0 ? tx * T - b.w : (tx + 1) * T; b.wall = s > 0 ? 1 : -1; break; }
  }
  // ---- Y ----
  b.onGround = false; b.groundTile = null;
  steps = Math.ceil(Math.abs(dy) / 6) || 0;
  for (let i = 0; i < steps; i++) {
    const s = dy / steps, prevBottom = b.y + b.h; b.y += s;
    const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - .001) / T);
    if (s > 0) {
      const ty = Math.floor((b.y + b.h - .001) / T); let hit = false, hitT = null;
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(L, tx, ty);
        if (solidAt(L, tx, ty)) { hit = true; hitT = { tx, ty, t }; break; }
        if (t === TL.ONEWAY && !opt.drop && prevBottom <= ty * T + .01) { hit = true; hitT = { tx, ty, t }; }
      }
      if (hit) { b.y = ty * T - b.h; b.onGround = true; b.groundTile = hitT; break; }
    } else {
      const ty = Math.floor(b.y / T); let hit = false, hitX = [];
      for (let tx = x0; tx <= x1; tx++) if (solidAt(L, tx, ty)) { hit = true; hitX.push(tx); }
      if (hit && opt.nudge) {
        // corner correction: only one column blocked and we overlap it by ≤ 7 px → slide around it
        const only = hitX.length === 1 && x0 !== x1 ? hitX[0] : null;
        if (only !== null) {
          const over = only === x0 ? (only + 1) * T - b.x : b.x + b.w - only * T;
          if (over <= 7) { const nx = only === x0 ? (only + 1) * T : only * T - b.w; if (!overlapsSolid(L, { x: nx, y: b.y, w: b.w, h: b.h })) { b.x = nx; continue; } }
        }
      }
      if (hit) { b.y = (ty + 1) * T; b.ceil = true; break; }
    }
  }
  if (!b.onGround && dy === 0) {           // standing still vertically: probe 1 px below so onGround stays true
    const ty = Math.floor((b.y + b.h + .5) / T), x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - .001) / T);
    if (Math.abs(b.y + b.h - ty * T) < .6) for (let tx = x0; tx <= x1; tx++) { const t = tileAt(L, tx, ty); if (solidAt(L, tx, ty) || (t === TL.ONEWAY && !opt.drop)) { b.onGround = true; b.groundTile = { tx, ty, t }; break; } }
  }
}
function overlapsSolid(L, r) {
  const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - .001) / T), y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - .001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(L, tx, ty)) return true;
  return false;
}
// tiles of a type touched by a box (hazards / breakables)
function tilesIn(L, r, type) {
  const out = [], x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - .001) / T), y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - .001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(L, tx, ty) === type) out.push({ tx, ty });
  return out;
}
// is there floor in front of a walker? (edge detection for patrol AI)
function floorAhead(L, b, dir) {
  const fx = dir > 0 ? b.x + b.w + 2 : b.x - 2, ty = Math.floor((b.y + b.h + 4) / T), tx = Math.floor(fx / T);
  const t = tileAt(L, tx, ty); return solidAt(L, tx, ty) || t === TL.ONEWAY;
}
function wallAhead(L, b, dir) {
  const fx = dir > 0 ? b.x + b.w + 2 : b.x - 2, tx = Math.floor(fx / T);
  return solidAt(L, tx, Math.floor((b.y + b.h - 4) / T)) || solidAt(L, tx, Math.floor((b.y + 2) / T));
}
// line of sight on the tile grid (for ranged enemies)
function clearLine(L, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 3));
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (solidAt(L, Math.floor(x / T), Math.floor(y / T))) return false; }
  return true;
}

/* ------------------------------ moving platforms ------------------------------ */
const SINK_GRACE = 24;
function stepMovers(L) {
  for (const m of L.movers) {
    if (m.sink) {                                  // v108 lily pad: sinks while stood on (load), floats back up
      // stood on: it wobbles for SINK_GRACE frames, then goes down; your feet reach the water after ~1–1.5 s
      if (m.load > 0) { m.hold++; if (m.hold > SINK_GRACE) m.off = Math.min(m.sink, m.off + .3 * m.speed); m.load--; }
      else { m.hold = 0; m.off = Math.max(0, m.off - .7); }
      const ny = m.y0 + m.off; m.dx = 0; m.dy = ny - m.y; m.prevY = m.y; m.y = ny; continue;
    }
    m.t += m.speed * 0.02;
    const off = (Math.sin(m.t) * .5 + .5) * m.range;
    const nx = m.axis === 'x' ? m.x0 + off : m.x0, ny = m.axis === 'y' ? m.y0 + off : m.y0;
    m.dx = nx - m.x; m.dy = ny - m.y; m.prevY = m.y; m.x = nx; m.y = ny;
  }
}
// land a falling body on a mover (one-way from above). Returns the mover or null.
function landOnMovers(L, b, prevBottom) {
  if (b.vy < 0) return null;
  for (const m of L.movers) {
    if (b.x + b.w <= m.x + 1 || b.x >= m.x + m.w - 1) continue;
    const bottom = b.y + b.h;
    if (prevBottom <= m.prevY + 2 + Math.max(0, m.dy) && bottom >= m.y - .5) { b.y = m.y - b.h; return m; }
  }
  return null;
}

/* -------------------------------- crumbling -------------------------------- */
function touchCrumble(L, tx, ty) {
  const i = ckey(tx, ty), c = L.crumble.get(i);
  if (!c || c.state === 'idle') { L.crumble.set(i, { state: 'shake', t: 28, tx, ty }); return true; }
  return false;
}
function stepCrumble(L, blocker) {
  for (const [i, c] of L.crumble) {
    if (c.state === 'shake' && --c.t <= 0) { c.state = 'gone'; c.t = 200; L.dirty = true; c.fell = true; }
    else if (c.state === 'gone' && --c.t <= 0) {
      const box = { x: c.tx * T, y: c.ty * T, w: T, h: T };
      if (blocker && blocker(box)) c.t = 20; else { c.state = 'idle'; L.dirty = true; c.back = true; }
    }
  }
}

PLAT.world = { buildLevel, tileAt, ckey, solidAt, setTile, isSolidTile, moveBody, overlapsSolid, tilesIn, floorAhead, wallAhead, clearLine, stepMovers, landOnMovers, touchCrumble, stepCrumble };
})(typeof window !== 'undefined' ? window : globalThis);
