// Loads the Platform Mode engine (public/js/plat/*.js, no DOM) into a Node vm context — shared by the
// level / endless validators. Returns the PLAT namespace.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export function loadPlat(files) {
  const dir = path.join(ROOT, 'public/js/plat');
  const ctx = vm.createContext({ console, Math, Set, Map, Uint8Array, Float32Array, Array, Object, JSON, Number, String, Date, performance: { now: () => Date.now() } });
  for (const f of files || ['core', 'world', 'anim', 'heroes', 'x4-sheet', 'xmod', 'player', 'monster-sheets', 'enemies', 'levels', 'items', 'endless']) vm.runInContext(fs.readFileSync(`${dir}/${f}.js`, 'utf8'), ctx, { filename: f + '.js' });
  return ctx.globalThis ? ctx.globalThis.PLAT : ctx.PLAT;
}
