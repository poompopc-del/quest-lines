// Platform Mode level validator — runs the REAL engine physics (js/plat/*.js) headless.
// For every level: rows have equal width, start/exit exist, and the exit and every gem are
// reachable by a player with the weakest movement in the roster (speed .86, no air jumps,
// widest box) using only walking / jumping / springs / moving platforms.
// The search itself lives in tools/plat-bfs.mjs (shared with the Endless test).
// usage: node tools/plat-validate.mjs [levelId]   (npm run validate:levels)
import { loadPlat } from './plat-vm.mjs';
import { bfsValidate } from './plat-bfs.mjs';
const PLAT = loadPlat(['core', 'world', 'anim', 'heroes', 'x4-sheet', 'xmod', 'player', 'enemies', 'levels', 'items']);
const only = process.argv[2]; let bad = 0;
for (const id of PLAT.LEVEL_ORDER) {
  if (only && id !== only) continue;
  const r = bfsValidate(PLAT, PLAT.LEVELS[id]); bad += r.errs.length;
  console.log(`${r.errs.length ? '✗' : '✓'} ${id}  nodes:${r.nodes} sims:${r.sims}${r.errs.length ? '\n    ' + r.errs.join('\n    ') : ''}`);
}
process.exit(bad ? 1 : 0);
