// Platform Mode COMBAT REGRESSION TESTS — real browser (Playwright + Chromium), real game code.
// usage: npm run test:combat        (starts the local server itself on a free port)
//        node tools/plat-combat-test.mjs [filter]   — only tests whose name contains <filter> (a|b = either)
// Needs the `playwright` package (npm i -D playwright, or a global install) and a Chromium build.
// Every test steps the game frame by frame with scripted input and checks HP / armour / state —
// nothing here is mocked except the enemy AI in "dummy" tests (frozen so only the attack is measured).
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
async function loadPW() {
  for (const p of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean)) {
    try { return await import(p); } catch (e) {}
  }
  console.error('✗ playwright is not installed — run `npm i -D playwright` (or set PLAYWRIGHT_MODULE). Combat tests NOT run.');
  process.exit(2);
}
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

const { chromium } = await loadPW();
const port = await freePort();
const srv = spawn(process.execPath, [path.join(ROOT, 'server.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
let browser;
const launch = [{}, { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }];
for (const o of launch) { try { browser = await chromium.launch(o); break; } catch (e) {} }
if (!browser) { console.error('✗ could not start Chromium'); srv.kill(); process.exit(2); }
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g|net::ERR/.test(m.text())) pageErrors.push(m.text()); });
await page.goto(`http://localhost:${port}/platformer.html`);
await page.waitForFunction(() => window.PLAT && PLAT.app && PLAT.app.raf);
await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools/plat-test-harness.js'), 'utf8') });

const filter = process.argv[2] || '';
const results = await page.evaluate(async (filter) => {
  const { P, I, T, GY, setup, step, press, rel, sum, shield, game } = QT;
  const out = [];
  const t = async (name, fn) => {
    if (filter && !filter.split('|').some(f => name.includes(f))) return;
    try { const r = await fn(); out.push({ name, ok: r === true || (r && r.ok), detail: r && r.detail || '' }); }
    catch (e) { out.push({ name, ok: false, detail: 'THREW ' + (e && e.stack || e) }); }
  };
  const HEROES = P.HERO_ORDER.filter(id => P.HEROES[id] && !P.HEROES[id].disabled);   // the playable roster
  const MELEE = HEROES.filter(id => P.HEROES[id].attack.kind === 'combo');
  const TARGETS = ['slime', 'zombie', 'licker', 'tyrant', 'ghost', 'garg'];          // small · tall · wide-low · heavy · floating · boss
  const hurtW = async (hid, et) => { const { e } = await setup(hid, et, 400, 1); return e.hurtBox ? e.hurtBox().w : e.w; };

  // 1 · in range → HP drops by exactly the step's damage, both directions, every target size
  for (const hid of MELEE) for (const et of TARGETS) for (const dir of [1, -1]) await t(`melee hits in range · ${hid} vs ${et} ${dir > 0 ? '→' : '←'}`, async () => {
    const w = await hurtW(hid, et);
    const { g, p, e, log } = await setup(hid, et, P.HEROES[hid].box[0] / 2 + w / 2 + 4, dir, { hp: 99 });
    press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
    const s = sum(log), want = P.HEROES[hid].attack.steps[0].dmg * (e.vulnerable || e.st === 'dizzy' ? 2 : 1);
    return { ok: s.hits === 1 && s.dmg === want, detail: `hits ${s.hits} dmg ${s.dmg} (want 1 / ${want})` };
  });
  // 2 · out of range → no damage
  for (const hid of MELEE) for (const et of ['slime', 'tyrant']) await t(`melee misses out of range · ${hid} vs ${et}`, async () => {
    const { g, p, log } = await setup(hid, et, 230, 1, { hp: 99 });
    press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
    const s = sum(log); return { ok: s.hits === 0, detail: `hits ${s.hits}` };
  });
  // 3 · a target BEHIND the hero is not hit by a forward blow
  for (const hid of MELEE) await t(`melee does not hit behind · ${hid}`, async () => {
    const w = await hurtW(hid, 'zombie');
    const { g, p, log } = await setup(hid, 'zombie', -(w / 2 + 16), 1, { hp: 99 });
    press('attack'); step(g, 1); rel('attack'); step(g, 30, () => shield(p));
    const s = sum(log); return { ok: s.hits === 0, detail: `hits ${s.hits}` };
  });
  // 4 · air attacks: jumping, at the top of a jump and while falling, beside a tall target
  for (const hid of MELEE.filter(h => !P.HEROES[h].attack.steps[0].slide)) for (const when of ['rising', 'falling']) await t(`air attack (${when}) hits · ${hid}`, async () => {
    const w = await hurtW(hid, 'tyrant');
    const { g, p, log } = await setup(hid, 'tyrant', P.HEROES[hid].box[0] / 2 + w / 2 + 4, 1, { hp: 99 });
    p.y = GY - p.h - 14; p.vy = when === 'rising' ? -3 : 2; p.onGround = false;
    press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
    const s = sum(log); return { ok: s.hits >= 1, detail: `hits ${s.hits}` };
  });
  // 5 · full combo on a heavy dummy and on a light dummy: every step lands exactly once, in order, mashing or rhythmic
  for (const hid of MELEE) for (const et of ['tyrant', 'zombie']) for (const gap of [4, 9, 13]) await t(`full combo, each step once · ${hid} vs ${et} (press every ${gap}f)`, async () => {
    const A = P.HEROES[hid].attack, w = await hurtW(hid, et);
    const { g, p, log } = await setup(hid, et, P.HEROES[hid].box[0] / 2 + w / 2 + 4, 1, { hp: 999 });
    const started = []; let lastAct = null;
    step(g, A.steps.length * 34 + 30, i => { shield(p); if (i % gap === 0 && i < A.steps.length * 30) press('attack'); else rel('attack'); if (p.act && p.act !== lastAct && p.act.kind === 'step') started.push(p.act.idx); lastAct = p.act; });
    const okHits = log.filter(l => l.ok), ids = okHits.map(l => l.id), dup = ids.length !== new Set(ids).size;
    const firstRound = started.slice(0, A.steps.length).join(',');
    const expect = A.steps.map((_, i) => i).join(',');
    return { ok: !dup && firstRound === expect && okHits.length >= A.steps.length, detail: `steps ${started.join(',')} · hits ${okHits.length} · dup ${dup}` };
  });
  // 5a · started from the very edge of step 1's reach, a light target is still reached by every later step
  //      (knock-back of non-final steps is capped, and a short follow-up steps in toward the target it hit)
  for (const hid of MELEE.filter(h => P.HEROES[h].attack.steps.length > 1)) for (const et of ['zombie', 'slime']) await t(`combo connects from max reach · ${hid} vs ${et}`, async () => {
    let maxD = 0;
    for (let d = 10; d < 130; d += 2) { const { g, p, log } = await setup(hid, et, d, 1, { hp: 999 }); press('attack'); step(g, 1); rel('attack'); step(g, 30, () => shield(p)); if (log.some(l => l.ok)) maxD = d; }
    const n = P.HEROES[hid].attack.steps.length, { g, p, log } = await setup(hid, et, maxD, 1, { hp: 999 });
    const hitIdx = new Set();
    step(g, n * 34 + 20, i => { shield(p); if (i % 10 === 0 && i < n * 26) press('attack'); else rel('attack'); });
    log.filter(l => l.ok).forEach(l => hitIdx.add(l.idx));
    return { ok: hitIdx.size === n, detail: `reach ${maxD}px · steps that hit: ${[...hitIdx].join(',')} of ${n}` };
  });
  // 5b · ONE early press during a step's wind-up is buffered into the next step (was dropped when the blow ran to the last frame)
  for (const hid of MELEE.filter(h => P.HEROES[h].attack.steps.length > 1)) for (const ult of [0, 100]) await t(`one early press is buffered into the next step · ${hid}${ult ? ' (ULT ready)' : ''}`, async () => {
    const w = await hurtW(hid, 'tyrant');
    const { g, p } = await setup(hid, 'tyrant', P.HEROES[hid].box[0] / 2 + w / 2 + 4, 1, { hp: 999 });
    p.ult = ult;
    press('attack'); step(g, 1); rel('attack'); step(g, 3, () => shield(p)); press('attack'); step(g, 1); rel('attack');
    let second = false; step(g, 60, () => { shield(p); if (p.act && p.act.idx === 1) second = true; });
    return { ok: second, detail: `2nd step ${second}` };
  });
  // 6 · an attack pressed DURING hit-stop is not lost
  for (const hid of MELEE.filter(h => P.HEROES[h].attack.steps.length > 1)) await t(`press during hit-stop is kept · ${hid}`, async () => {
    const w = await hurtW(hid, 'tyrant');
    const { g, p } = await setup(hid, 'tyrant', P.HEROES[hid].box[0] / 2 + w / 2 + 4, 1, { hp: 999 });
    press('attack'); step(g, 1); rel('attack');
    let pressedInFreeze = false, second = false;
    step(g, 80, () => { shield(p); if (!pressedInFreeze && g.freeze > 0) { press('attack'); pressedInFreeze = true; } else rel('attack'); if (p.act && p.act.idx === 1) second = true; });
    return { ok: pressedInFreeze && second, detail: `pressed in freeze ${pressedInFreeze} · 2nd step ${second}` };
  });
  // 7 · no hitting through a wall
  for (const hid of MELEE) await t(`melee blocked by wall · ${hid}`, async () => {
    const w = await hurtW(hid, 'tyrant');
    const { g, p, e, log } = await setup(hid, 'tyrant', 0, 1, { hp: 99 });
    // wall tile column right in front of the hero; enemy just on the other side
    const tx = Math.floor((p.x + p.w) / T) + 1; for (let ty = 0; ty < 10; ty++) P.world.setTile(g.L, tx, ty, P.TILE.BRICK);
    e.x = (tx + 1) * T + 1; e.y = GY - e.h;
    press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
    const s = sum(log); return { ok: s.hits === 0, detail: `hits ${s.hits}` };
  });

  // 8 · every hero projectile: correct direction, hits small AND tall targets at range, once per pass
  const shots = [];
  for (const hid of HEROES) { const h = P.HEROES[hid], A = h.attack, S = h.skill;
    if (A.kind === 'shot') { shots.push([hid, A.proj, A.y]); (A.charge || []).forEach(c => shots.push([hid, c.proj, A.y])); }
    if (A.mouthful) shots.push([hid, A.mouthful.proj, A.mouthful.y]);
    if (S && S.proj && typeof S.proj === 'string') shots.push([hid, S.proj, S.y]); }
  for (const [hid, pn, y] of shots) for (const et of ['slime', 'licker', 'zombie', 'tyrant']) for (const dir of [1, -1]) await t(`projectile ${pn} (${hid}) hits ${et} ${dir > 0 ? '→' : '←'}`, async () => {
    const def = P.PROJ[pn], range = Math.min(140, def.speed * (def.life || 60) * .6 + 20);
    const { g, p, log } = await setup(hid, et, range, dir, { hp: 99 });
    const pr = g.spawnProj(pn, p.cx + dir * 16, p.feet + (y || -24), dir, { owner: p });
    let wrongDir = Math.sign(pr.vx) !== dir && !def.accel ? true : false;
    step(g, 90, () => shield(p));
    const s = sum(log); return { ok: s.hits >= 1 && !wrongDir, detail: `hits ${s.hits} dmg ${s.dmg} vx ${pr.vx.toFixed(1)}` };
  });
  await t('fast projectile cannot skip a thin target (swept collision)', async () => {
    const { g, p, e, log } = await setup('x', 'ghost', 100, 1, { hp: 99 });
    const pr = g.spawnProj({ ...P.PROJ.lemon, speed: 30, life: 30 }, p.cx + 16, e.y + e.h / 2, 1, { owner: p });
    step(g, 10, () => shield(p));
    return { ok: sum(log).hits === 1, detail: `hits ${sum(log).hits} (speed 30 px/f)` };
  });
  await t('projectile stops at a wall (does not hit what is behind it)', async () => {
    const { g, p, e, log } = await setup('x', 'zombie', 150, 1, { hp: 99, wall: 70 });
    g.spawnProj('lemon', p.cx + 16, p.feet - 27, 1, { owner: p }); step(g, 60, () => shield(p));
    return { ok: sum(log).hits === 0 && g.projs.length === 0, detail: `hits ${sum(log).hits} · projs left ${g.projs.length}` };
  });
  await t('boomerang fan hits going out AND coming back', async () => {
    const { g, p, log } = await setup('mao', 'tyrant', 70, 1, { hp: 99 });
    g.spawnProj('fan', p.cx + 18, p.feet - 42, 1, { owner: p }); step(g, 90, () => shield(p));
    return { ok: sum(log).hits === 2, detail: `hits ${sum(log).hits}` };
  });
  await t('expired projectiles and effects are removed', async () => {
    const { g, p } = await setup('x', null, 0, 1);
    for (let i = 0; i < 30; i++) { g.spawnProj('lemon', p.cx, p.feet - 27 - i, 1, { owner: p }); g.fx('impact', p.cx, p.y, {}); }
    step(g, 200, () => shield(p));
    return { ok: g.projs.length === 0 && g.fxs.length === 0, detail: `projs ${g.projs.length} fxs ${g.fxs.length}` };
  });

  // 9 · every hero's skill and dash do what they say, against a target where the move should land
  const skillSetup = { step: 24, bash: 30, proj: 90, flare: 70, flareCharge: 70, spin: 22, beam: 120, spindash: 80, inhale: 50, slam: 30, burst: 40, heat: 90 };
  for (const hid of HEROES) for (const et of ['slime', 'tyrant']) await t(`skill ${P.HEROES[hid].skill.kind} hits · ${hid} vs ${et}`, async () => {
    const S = P.HEROES[hid].skill, hold = ['inhale', 'heat', 'spindash'].includes(S.kind) ? 70 : 1;
    const w = await hurtW(hid, et);
    const { g, p, e, log } = await setup(hid, et, (skillSetup[S.kind] || 60) + w / 2, 1, { hp: S.kind === 'inhale' ? undefined : 99 });
    step(g, 120, i => { shield(p); if (i < hold) press('skill'); else rel('skill'); });
    if (S.kind === 'inhale') { const small = !!e.def.small; return { ok: small ? (e.inhaled && !!p.mouth) : !e.inhaled, detail: `inhaled ${!!e.inhaled} mouth ${!!p.mouth}` }; }
    const s = sum(log); return { ok: s.hits >= 1, detail: `hits ${s.hits} dmg ${s.dmg}` };
  });
  for (const hid of HEROES.filter(h => P.HEROES[h].dash.hit && P.HEROES[h].dash.kind !== 'homing' && P.HEROES[h].dash.kind !== 'rocket')) await t(`dash hits · ${hid}`, async () => {
    const { g, p, log } = await setup(hid, 'tyrant', 40, 1, { hp: 99 });
    press('dash'); step(g, 1); rel('dash'); step(g, 40, () => shield(p));
    return { ok: sum(log).hits >= 1, detail: `hits ${sum(log).hits}` };
  });
  await t('Sonic homing attack locks onto an enemy in the air', async () => {
    const { g, p, e, log } = await setup('sonic', 'ghost', 90, 1, { hp: 99, ey: 40 });
    p.y = GY - p.h - 60; p.vy = 0; p.onGround = false; p.airDash = true;
    press('dash'); step(g, 1); rel('dash'); step(g, 40, () => shield(p));
    return { ok: sum(log).hits >= 1, detail: `hits ${sum(log).hits}` };
  });
  await t('Luffy rocket dash hits on the way up', async () => {
    const { g, p, log } = await setup('luffy', 'tyrant', 34, 1, { hp: 99 });
    press('dash'); step(g, 1); rel('dash'); step(g, 30, () => shield(p));
    return { ok: sum(log).hits >= 1, detail: `hits ${sum(log).hits}` };
  });
  await t('X charge shot: holding fires a bigger shot that hits', async () => {
    const { g, p, log } = await setup('x', 'tyrant', 120, 1, { hp: 99 });
    step(g, 80, i => { shield(p); if (i < 70) press('attack'); else rel('attack'); });
    const big = log.filter(l => l.ok && l.dmg >= 3).length;
    return { ok: big >= 1, detail: `charged hits ${big}` };
  });
  // X4 X (xmod.js): animation states, armour forms and their abilities
  const xf = (p, i) => { p.xs.form = i; };
  await t('X4: shooting while running keeps running, uses the run-shoot frames', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    let poses = new Set(), minVx = 9;
    step(g, 40, i => { shield(p); press('right'); if (i === 20) press('attack'); else rel('attack'); if (i > 21 && i < 30) { poses.add(p.anim.pose); minVx = Math.min(minVx, Math.abs(p.vx)); } });
    rel('right');
    return { ok: poses.has('shotWalk') && minVx > 1 && !p.act, detail: `poses ${[...poses]} minVx ${minVx.toFixed(2)}` };
  });
  await t('X4: shot leaves from the buster muzzle (in front, chest height)', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    press('attack'); step(g, 1); rel('attack'); step(g, 1);
    const pr = g.projs[0]; return { ok: !!pr && pr.x > p.cx + 12 && pr.y < p.feet - 20 && pr.y > p.feet - 45, detail: pr ? `dx ${(pr.x - p.cx).toFixed(1)} dy ${(pr.y - p.feet).toFixed(1)}` : 'no proj' };
  });
  await t('X4: charge flashes the palette, lv2 fires the big shot with a muzzle fx', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    let palSeen = false;
    step(g, 75, i => { press('attack'); const o = {}; P.HEROES.x.mod.drawOpts(p, o); if (o.pal && /c[123]/.test(o.pal.key)) palSeen = true; });
    rel('attack'); step(g, 2);
    const big = g.projs.find(q => q.def === P.PROJ.x4c2 || q.name === 'x4c2' || (q.def && q.def.dmg === 5));
    return { ok: palSeen && !!big && g.fxs.some(f => /x4C2Muzzle/.test(f.name || f.k || f.type || '') || f.def === P.FXDEF.x4C2Muzzle), detail: `pal ${palSeen} big ${!!big} fx ${g.fxs.map(f => f.name || f.k).join(',')}` };
  });
  await t('X4: ground dash — hold extends, release ends early, then stand-up frames', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    const x0 = p.cx; press('dash'); step(g, 12, () => shield(p)); rel('dash');
    let sawEnd = false; step(g, 14, () => { shield(p); if (p.anim.pose === 'dashEnd') sawEnd = true; });
    const short = p.cx - x0;
    const r2 = await setup('x', null, 0, 1); const x1 = r2.p.cx; press('dash'); step(r2.g, 40, () => shield(r2.p)); rel('dash'); step(r2.g, 10);
    const long = r2.p.cx - x1;
    return { ok: sawEnd && long > short + 40 && !p.act, detail: `short ${short.toFixed(0)} long ${long.toFixed(0)} end ${sawEnd}` };
  });
  await t('X4: dash-jump keeps dash speed in the air', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    press('dash'); press('right'); step(g, 6, () => shield(p)); press('jump'); step(g, 1); rel('jump'); step(g, 8, () => shield(p));
    rel('dash'); rel('right');
    return { ok: !p.onGround && Math.abs(p.vx) > 4, detail: `vx ${p.vx.toFixed(2)} ground ${p.onGround}` };
  });
  await t('X4: plain X cannot air dash; armour can (once per jump)', async () => {
    const r = await setup('x', null, 0, 1); xf(r.p, 0);
    press('jump'); step(r.g, 10); press('dash'); step(r.g, 1); rel('dash'); const plain = r.p.act && r.p.act.kind; rel('jump'); step(r.g, 60);
    const s = await setup('x', null, 0, 1); xf(s.p, 1);
    press('jump'); step(s.g, 10); press('dash'); step(s.g, 1); rel('dash'); const arm = s.p.act && s.p.act.kind; step(s.g, 20); press('dash'); step(s.g, 1); rel('dash'); const again = s.p.act && s.p.act.kind; rel('jump'); step(s.g, 60);
    return { ok: !plain && arm === 'airdash' && again !== 'airdash', detail: `plain ${plain} armour ${arm} again ${again}` };
  });
  await t('X4: armour hover — press jump again while falling, slows the fall', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 1);
    p.y = GY - p.h - 160; p.vy = 0; p.onGround = false; p.coyote = 0; step(g, 4);
    press('jump'); step(g, 1); const hv = p.xs.hover; const y0 = p.y; step(g, 30); const fell = p.y - y0; rel('jump'); step(g, 80);
    return { ok: hv > 0 && Math.abs(fell) < 12 && p.anim.pose !== 'hover', detail: `hover ${hv} fell ${fell.toFixed(1)}` };
  });
  await t('X4: armour swap on the ground cycles X → Force → Ultimate → X', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    const seen = [];
    for (let k = 0; k < 3; k++) { press('swap'); step(g, 1); rel('swap'); step(g, 40); seen.push(P.X_FORMS[p.xs.form].id); }
    return { ok: seen.join() === 'force,ult,x', detail: seen.join() };
  });
  await t('X4: Force Armor ↓+skill = Nova Strike, rushes forward and hits', async () => {
    const { g, p, log } = await setup('x', 'tyrant', 110, 1, { hp: 99 }); xf(p, 1); p.en = 100;
    const x0 = p.cx; press('down'); press('skill'); step(g, 1); rel('skill'); rel('down'); let k = null; step(g, 70, () => { if (p.act && !k) k = p.act.kind; });
    return { ok: sum(log).hits >= 1 && p.cx - x0 > 60, detail: `act ${k} hits ${sum(log).hits} moved ${(p.cx - x0).toFixed(0)}` };
  });
  await t('X4: Ultimate armour ↓+skill Nova costs 40 energy', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 2); p.en = 100;
    press('down'); press('skill'); step(g, 1); rel('skill'); rel('down'); const k = p.act && p.act.kind; step(g, 60);
    return { ok: k === 'nova' && p.en < 70, detail: `act ${k} en ${p.en.toFixed(0)}` };
  });
  await t('X4: wall cling → slide → kick uses the cling and kick frames', async () => {
    const { g, p } = await setup('x', null, 0, 1, { wall: 40 }); xf(p, 0);
    press('jump'); press('right'); step(g, 8); rel('jump');
    const poses = new Set(); step(g, 30, () => poses.add(p.anim.pose));
    press('jump'); step(g, 1); rel('jump'); step(g, 8, () => poses.add(p.anim.pose)); rel('right'); step(g, 80);
    return { ok: poses.has('cling') && poses.has('kick'), detail: [...poses].join(',') };
  });
  await t('X4: beam-in plays at level start when the intro is on', async () => {
    const { g, p } = await setup('x', null, 0, 1); P.skipIntro = false; p.reset({ x: 20 * T, y: GY }); P.skipIntro = true;
    const k = p.act && p.act.kind; step(g, 40);
    return { ok: k === 'beam' && !p.act, detail: `act ${k} after ${p.act && p.act.kind}` };
  });
  await t('↑ / W never jump (aim only)', async () => {
    const m = P.KEYMAP || {}; const j = (m.jump || []);
    const keys = ['attack', 'skill', 'dash', 'swap'].every(k => (m[k] || []).length >= 2);
    return { ok: !j.includes('ArrowUp') && !j.includes('KeyW') && j.includes('Space') && (m.up || []).includes('ArrowUp') && keys, detail: `jump ${j} · attack ${m.attack}` };
  });
  await t('X4: dash-jump, then press back — reverses at full dash speed at once', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    press('right'); press('dash'); step(g, 6, () => shield(p)); press('jump'); step(g, 1); step(g, 4, () => shield(p));
    const v0 = p.vx; rel('right'); press('left'); step(g, 1); const v1 = p.vx; rel('left'); step(g, 1); const v2 = p.vx; rel('jump'); rel('dash'); step(g, 60);
    return { ok: v0 > 5 && v1 < -5 && Math.abs(v2) < .01, detail: `fwd ${v0.toFixed(2)} back ${v1.toFixed(2)} released ${v2.toFixed(2)}` };
  });
  await t('X4: releasing jump stops the rise at once (short hop)', async () => {
    const { g, p } = await setup('x', null, 0, 1); xf(p, 0);
    const y0 = p.feet; press('jump'); step(g, 5); rel('jump'); let top = p.feet; step(g, 40, () => { top = Math.min(top, p.feet); });
    const r2 = await setup('x', null, 0, 1); press('jump'); let top2 = r2.p.feet; step(r2.g, 40, () => { top2 = Math.min(top2, r2.p.feet); }); rel('jump'); step(r2.g, 40);
    return { ok: y0 - top < 60 && GY - top2 > 100, detail: `hop ${(y0 - top).toFixed(0)} full ${(GY - top2).toFixed(0)}` };
  });
  for (const [lv, hold, pn, en] of [[3, 130, 'x4c3', 100], [4, 190, 'x4c4', 100], [3, 190, 'x4c3', 10]]) await t(`X4: charge ${hold}f (energy ${en}) fires level ${lv} (${pn})`, async () => {
    const { g, p, log } = await setup('x', 'tyrant', 160, 1, { hp: 99 }); xf(p, 0);
    let bar = 0; step(g, hold, i => { shield(p); press('attack'); p.en = Math.max(p.en, en); if (en < 50) p.en = en; bar = Math.max(bar, g.hudData ? 0 : 0); });
    const cb = P.HEROES.x.chargeBar(p); rel('attack'); step(g, 2);
    const pr = g.projs.find(q => q.def === P.PROJ[pn]); step(g, 60, () => shield(p));
    return { ok: !!pr && cb.lv === lv && sum(log).hits >= 1, detail: `bar lv ${cb.lv} ${cb.pct.toFixed(0)}% proj ${!!pr} hits ${sum(log).hits} dmg ${sum(log).dmg}` };
  });
  await t('X4: death spawns the bubble burst', async () => {
    const { g, p } = await setup('x', null, 0, 1); p.inv = 0; p.hp = 1; p.hurt(1, p.cx + 10); step(g, 2);
    const n = g.fxs.filter(f => (f.name || f.k) === 'x4Bubble' || f.def === P.FXDEF.x4Bubble).length;
    return { ok: p.dead && n >= 16, detail: `dead ${p.dead} bubbles ${n}` };
  });
  await t('Kirby: inhale a slime, then spit a star that hits', async () => {
    const { g, p, e } = await setup('puff', 'slime', 50, 1);
    step(g, 60, i => { shield(p); if (i < 50) press('skill'); else rel('skill'); });
    if (!p.mouth) return { ok: false, detail: 'did not inhale' };
    const t2 = P.makeEnemy(g, 'tyrant', p.cx + 90, GY); t2.think = () => {}; t2.hp = 99; g.enemies.push(t2);
    press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
    return { ok: t2.hp < 99, detail: `tyrant hp ${t2.hp}` };
  });
  await t('Shovel pogo bounces off an enemy and damages it', async () => {
    const { g, p, e, log } = await setup('shovel', 'tyrant', 0, 1, { hp: 99 });
    p.x = e.cx - p.w / 2; p.y = e.y - p.h - 40; p.vy = 1; p.onGround = false;
    step(g, 30, i => { shield(p); press('down'); if (i === 0) press('attack'); else rel('attack'); });
    rel('down');
    return { ok: sum(log).hits >= 1, detail: `hits ${sum(log).hits}` };
  });
  // v93 · Shovel Knight: charged fireball (grows while held, crawls), dash-slash bats it, meteor = air ↓ + attack
  await t('Shovel: holding the skill grows the fireball; released it crawls slowly', async () => {
    const tap = await setup('shovel', null, 0, 1); press('skill'); step(tap.g, 2); rel('skill'); step(tap.g, 3);
    const a = tap.g.projs.find(q => q.def.charged); const sa = a && a.scale, x0 = a && a.x; step(tap.g, 30); const crawl = a && Math.abs(a.x - x0) / 30;
    const hold = await setup('shovel', null, 0, 1); press('skill'); step(hold.g, 95); rel('skill'); step(hold.g, 3);
    const b = hold.g.projs.find(q => q.def.charged);
    return { ok: !!a && !!b && b.scale > sa * 2 && b.def.dmg > a.def.dmg && b.def.box[0] > a.def.box[0] && crawl > .3 && crawl < 1.2,
      detail: `tap scale ${sa && sa.toFixed(2)} dmg ${a && a.def.dmg} · max scale ${b && b.scale.toFixed(2)} dmg ${b && b.def.dmg} · speed ${crawl && crawl.toFixed(2)} px/f` };
  });
  await t('Shovel: dash-slash bats his fireball away fast and it hits far away', async () => {
    const { g, p, e, log } = await setup('shovel', 'tyrant', 330, 1, { hp: 99 });
    press('skill'); step(g, 40, () => shield(p)); rel('skill'); step(g, 20, () => shield(p));
    const fb = g.projs.find(q => q.def.charged); const slow = fb && Math.abs(fb.vx);
    press('dash'); step(g, 1); rel('dash'); step(g, 10, () => shield(p)); const fast = fb && Math.abs(fb.vx);
    step(g, 60, () => shield(p));
    return { ok: !!fb && slow < 1.2 && fast > 6 && fb.batted && sum(log).hits >= 1, detail: `speed ${slow} → ${fast} batted ${fb && fb.batted} hits ${sum(log).hits}` };
  });
  await t('Shovel: hitting his fireball splits it — more hits, more balls, slower, one tight cluster; dash bats them all', async () => {
    const { g, p } = await setup('shovel', null, 0, 1);
    press('skill'); step(g, 30, () => shield(p)); rel('skill'); step(g, 16);
    const speeds = [], counts = [];
    for (let i = 0; i < 4; i++) {
      const fb = g.projs.find(q => q.def.charged); p.x = fb.x - 30 - p.w / 2; p.face = 1;
      press('attack'); step(g, 1); rel('attack'); step(g, 20, () => shield(p));
      const fs = g.projs.filter(q => q.def.charged); counts.push(fs.length); speeds.push(Math.abs(fs[0].vx));
    }
    const fs = g.projs.filter(q => q.def.charged), xs = fs.map(q => q.x), ys = fs.map(q => q.y);
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const same = fs.every(q => q.vx === fs[0].vx);
    p.x = Math.min(...xs) - 40 - p.w / 2; press('dash'); step(g, 1); rel('dash'); step(g, 12, () => shield(p));
    const batted = g.projs.filter(q => q.def.charged && q.batted).length;
    return { ok: counts.join() === '2,3,4,5' && speeds.every((v, i) => i === 0 || v < speeds[i - 1]) && spread < 48 && same && batted === 5,
      detail: `balls ${counts} · speed ${speeds.map(v => v.toFixed(2))} · cluster ${spread.toFixed(0)} px · batted ${batted}` };
  });
  await t('Shovel: input reset while charging drops the fireball (nothing thrown)', async () => {
    const { g, p } = await setup('shovel', null, 0, 1);
    const saved = P.app.game; P.app.game = g;                 // the UI routes input resets to the running game
    press('skill'); step(g, 40); I.reset('test'); step(g, 5); P.app.game = saved;
    return { ok: !g.projs.some(q => q.def.charged) && !(p.act && p.act.kind === 'flareCharge') && !g.fxs.some(f => f.loop), detail: `shots ${g.projs.length} act ${p.act && p.act.kind}` };
  });
  await t('Shovel: meteor is air ↓+attack (no ULT, no cut-in) — dives, shock-wave on landing', async () => {
    const { g, p, e, log } = await setup('shovel', 'tyrant', 60, 1, { hp: 99 });
    p.y = GY - p.h - 150; p.vy = 0; p.onGround = false;
    step(g, 40, i => { shield(p); press('down'); if (i === 0) press('attack'); else rel('attack'); }); rel('down');
    return { ok: !P.HEROES.shovel.ult && !g.cut && sum(log).hits >= 1 && p.onGround, detail: `ult ${!!P.HEROES.shovel.ult} cut ${!!g.cut} hits ${sum(log).hits} ground ${p.onGround}` };
  });
  // v93 · every hero: jump out of a ground dash = dash-jump (dash speed carried in the air, X-style instant reversal)
  for (const hid of HEROES.filter(h => ['dash', 'roll'].includes(P.HEROES[h].dash.kind) || h === 'x')) await t(`dash-jump keeps the dash speed · ${hid}`, async () => {
    const { g, p } = await setup(hid, null, 0, 1); p.en = 100;
    press('right'); press('dash'); step(g, 4, () => shield(p)); rel('dash');
    press('jump'); step(g, 1); const air = !p.onGround;
    step(g, 10, () => shield(p)); const vAir = Math.abs(p.vx), run = P.C.RUN * (P.HEROES[hid].speed || 1);
    rel('right'); press('left'); step(g, 2, () => shield(p)); const back = p.vx; rel('left'); rel('jump');
    step(g, 90, () => shield(p));
    return { ok: air && vAir > run + .4 && back < -run && p.onGround && !p.dashJump, detail: `air ${air} vx ${vAir.toFixed(2)} (run ${run.toFixed(2)}) reverse ${back.toFixed(2)} landed ${p.onGround}` };
  });
  // v94 · PARRY (every hero) and harder enemies
  for (const hid of HEROES) await t(`parry: a zombie bite is deflected and the zombie reels · ${hid}`, async () => {
    const { g, p, e } = await setup(hid, 'zombie', 30, 1, { ai: true });
    let hp0 = null, pressed = false;
    for (let i = 0; i < 260 && !g.stats.parries; i++) {
      // contact before the bite is not what is tested: protected until just before the bite lands, then parry
      if (hp0 == null && !(e.st === 'bite' && e.stT >= e.def.bite.wind - 6)) { shield(p); p.hp = p.maxHp; step(g, 1); continue; }
      if (hp0 == null) { hp0 = p.hp; p.inv = 0; }
      if (!pressed) { pressed = true; press('parry'); step(g, 1); rel('parry'); } else step(g, 1);
    }
    step(g, 4);
    return { ok: p.hp === hp0 && g.stats.parries >= 1 && e.st === 'dizzy', detail: `hp ${hp0}→${p.hp} parries ${g.stats.parries || 0} zombie ${e.st} pressed ${pressed} pT ${p.parryT} cd ${p.parryCd} act ${p.act && p.act.kind} hurtT ${p.hurtT}` };
  });
  await t('parry: PERFECT (first frames) vs late — perfect gives more energy and a longer stun', async () => {
    const run = async late => { const { g, p, e } = await setup('knight', 'zombie', 26, 1); p.en = 0; p.inv = 0;
      press('parry'); step(g, 1); rel('parry'); step(g, late ? 8 : 0); const r = p.hurt(1, e.cx, { src: e }); return { r, en: p.en, dz: e.dizzyFor, st: e.st }; };
    const a = await run(false), b = await run(true);
    return { ok: a.r === 'parried' && b.r === 'parried' && a.en > b.en && a.dz > b.dz && a.st === 'dizzy', detail: JSON.stringify([a, b]) };
  });
  // v100: Kirby (counterInhale) swaps the counter for inhaling the reeling enemy
  for (const hid of HEROES.filter(h => P.HEROES[h].counterInhale)) await t(`parry then hold attack inhales the reeling (big) enemy · ${hid}`, async () => {
    const { g, p, e } = await setup(hid, 'zombie', 60, 1, { hp: 99 }); p.inv = 0; e.def = Object.assign({}, e.def, { small: false });
    press('parry'); step(g, 1); rel('parry'); p.hurt(1, e.cx, { src: e });
    let counter = false; step(g, 4); press('attack'); step(g, 70, () => { shield(p); if (p.act && p.act.kind === 'counter') counter = true; }); rel('attack'); step(g, 5);
    return { ok: !counter && e.inhaled && p.mouth && p.mouth.n >= 2, detail: `counter ${counter} inhaled ${!!e.inhaled} mouth ${p.mouth && p.mouth.n}` };   // v116: + the parry's star
  });
  // v116: holding a CHARGE turns the hero to the direction pressed (the release goes that way)
  for (const [hid, btn] of [['luffy', 'skill'], ['x', 'attack'], ['shovel', 'skill']]) await t(`v116 charging turns with the direction pressed · ${hid} ${btn}`, async () => {
    const { g, p } = await setup(hid, null, 0, 1); press(btn); step(g, 50, () => shield(p));
    const charging = p.charging(); press('left'); step(g, 6, () => shield(p)); const face = p.face; rel('left'); rel(btn); step(g, 40, () => shield(p));
    return { ok: charging && face === -1, detail: `charging ${charging} face ${face}` };
  });
  // v118 meta progression
  await t('v118 talents: HP / damage / parry window reach the game', async () => {
    const MT = P.meta, keep = JSON.stringify(MT.d().tal); MT.d().tal = { hp: 2, dmg: 1, parry: 1 };
    const { g, p } = await setup('knight', null, 0, 1); MT.buildMods(g); MT.applyMods(g);
    const ok = p.maxHp === P.HEROES.knight.hp * P.HPU + 20 && Math.abs(g.mods.dmg - .08) < 1e-9 && g.mods.parryWin === 2;
    MT.d().tal = JSON.parse(keep); MT.buildMods(g); MT.applyMods(g);
    return { ok, detail: `maxHp ${p.maxHp} dmg ${g.mods.dmg}` };
  });
  await t('v118 boons: vital raises max HP, burn sets enemies on fire, a duo needs both halves', async () => {
    const MT = P.meta, { g, p, e } = await setup('knight', 'zombie', 60, 1, { hp: 99 }); g.boons = {}; MT.buildMods(g); MT.applyMods(g);
    const hp0 = p.maxHp; MT.pickBoon(g, 'vital'); const up = p.maxHp - hp0;
    MT.pickBoon(g, 'burn'); g.hit({ x: e.x, y: e.y, w: e.w, h: e.h }, 1, { id: P.newSwing(), from: p, dir: 1 });
    let duoOk = true; for (let i = 0; i < 30; i++) if (MT.boonChoices(g, 3).some(id => MT.BOONS[id].duo && !MT.BOONS[id].duo.every(k => g.boons[k]))) duoOk = false;
    g.boons = {}; MT.buildMods(g); MT.applyMods(g);
    return { ok: up === 20 && e.burnT > 0 && duoOk, detail: `+${up} burn ${e.burnT} duo ${duoOk}` };
  });
  await t('v118 achievements + missions: counters unlock, rewards pay once', async () => {
    const MT = P.meta, d = MT.d(), keep = JSON.stringify({ ach: d.ach, cnt: d.cnt, mis: d.mis, wmis: d.wmis, titles: d.titles }), w0 = P.bag.coins();
    d.ach = {}; d.cnt = {}; d.mis = null; d.wmis = null; MT.missions();
    MT.track('kill', 1); const a1 = !!d.ach.kill1, paid = P.bag.coins() - w0;
    const q = MT.missions().daily[0]; MT.track(q.key, q.need); const c1 = MT.claim(q), c2 = MT.claim(q);
    Object.assign(d, JSON.parse(keep)); P.bag.d().wallet = w0;
    return { ok: a1 && paid >= 20 && c1 && !c2, detail: `ach ${a1} paid ${paid} claim ${c1}/${c2}` };
  });
  await t('v118 daily challenge: same day → same world / seed / rule', async () => {
    const MT = P.meta, a = MT.daily(Date.UTC(2026, 9, 23, 5)), b = MT.daily(Date.UTC(2026, 9, 23, 9)), c = MT.daily(Date.UTC(2026, 9, 24, 5));
    return { ok: a.seed === b.seed && a.world === b.world && a.mod.id === b.mod.id && (a.seed !== c.seed), detail: `${a.world}/${a.mod.id} vs ${c.world}/${c.mod.id}` };
  });
  await t('v116 a parried NORMAL enemy drops a star for Kirby (bosses 3, elites 2) · puff', async () => {
    const { g, p, e } = await setup('puff', 'zombie', 60, 1, { hp: 99 }); p.inv = 0;
    press('parry'); step(g, 1); rel('parry'); p.hurt(1, e.cx, { src: e });
    return { ok: g.mstars.length === 1, detail: `stars ${g.mstars.length}` };
  });
  await t('a big enemy cannot be inhaled without a parry · puff', async () => {
    const { g, p, e } = await setup('puff', 'zombie', 60, 1, { hp: 99 }); p.inv = 0; e.def = Object.assign({}, e.def, { small: false });
    press('attack'); step(g, 70, () => shield(p)); rel('attack'); step(g, 5);
    return { ok: !e.inhaled && !p.mouth, detail: `inhaled ${!!e.inhaled}` };
  });
  await t('mouthfuls stack and the spat star grows · puff', async () => {
    const { g, p } = await setup('puff', null, 0, 1); p.mouth = { n: 5 };
    press('attack'); step(g, 2); rel('attack'); step(g, 20, () => shield(p));
    const st = g.projs.find(q => q.owner === p && !q.dead), base = P.PROJ.star;
    return { ok: !!st && st.def.box[0] > base.box[0] * 2 && st.def.dmg > base.dmg && !p.mouth, detail: st ? `box ${st.def.box} dmg ${st.def.dmg}` : 'no star' };
  });
  await t('inhaling tears a breakable block loose and swallows it · puff', async () => {
    const { g, p } = await setup('puff', null, 0, 1); const tx = Math.floor((p.cx + 50) / T), ty = Math.floor((p.feet - 4) / T);
    P.world.setTile(g.L, tx, ty, P.TILE.BREAK); g.tileCache = null;
    press('attack'); step(g, 40, () => shield(p)); rel('attack'); step(g, 5);
    return { ok: !P.world.solidAt(g.L, tx, ty) && p.mouth && p.mouth.n === 1, detail: `solid ${P.world.solidAt(g.L, tx, ty)} mouth ${p.mouth && p.mouth.n}` };
  });
  await t('a parried boss drops 3 stars for Kirby · puff', async () => {
    const { g, p, e } = await setup('puff', 'aqua', 120, 1, { hp: 999 }); p.inv = 0; g.mstars = [];
    press('parry'); step(g, 1); rel('parry'); p.hurt(1, e.cx, { src: e }); step(g, 5);
    return { ok: g.mstars.length === 3, detail: `stars ${g.mstars.length}` };
  });
  for (const hid of HEROES.filter(h => !P.HEROES[h].counterInhale)) await t(`counter strike: attack right after a parry flash-steps in and hits hard · ${hid}`, async () => {
    const { g, p, e, log } = await setup(hid, 'zombie', 70, 1, { hp: 99 }); p.inv = 0;
    press('parry'); step(g, 1); rel('parry'); p.hurt(1, e.cx, { src: e });        // PERFECT parry (from 70 px away)
    let act = null; step(g, 4); press('attack'); step(g, 1); rel('attack'); step(g, 90, () => { shield(p); if (p.act && p.act.kind === 'counter') act = 'counter'; });
    const hit = log.filter(l => l.ok).reduce((n, l) => n + l.dhp, 0), close = Math.abs(p.cx - e.cx) < 70;
    return { ok: act === 'counter' && hit >= 12 && !p.act && close, detail: `act ${act} dmg ${hit} dist ${Math.abs(p.cx - e.cx).toFixed(0)}` };
  });
  await t('counter strike: only right after a parry (a late attack is a normal attack)', async () => {
    const { g, p, e } = await setup('knight', 'zombie', 40, 1, { hp: 99 }); p.inv = 0;
    press('parry'); step(g, 1); rel('parry'); p.hurt(1, e.cx, { src: e }); step(g, 60, () => shield(p));
    press('attack'); step(g, 1); rel('attack');
    return { ok: p.act && p.act.kind !== 'counter', detail: `act ${p.act && p.act.kind}` };
  });
  await t('parry: whiffing locks the parry for a moment (no mashing)', async () => {
    const { g, p, e } = await setup('knight', 'zombie', 26, 1); p.inv = 0;
    press('parry'); step(g, 1); rel('parry'); step(g, 16);              // window over, still locked
    press('parry'); step(g, 1); rel('parry'); const r = p.hurt(1, e.cx, { src: e });
    return { ok: r === 'hit', detail: `second press during lock → ${r}` };
  });
  await t('parry: an enemy fireball is reflected and hits its shooter', async () => {
    const { g, p, e, log } = await setup('knight', 'tyrant', 160, 1, { hp: 99 });
    g.spawnProj('fireball', p.cx + 40, p.feet - 24, -1, { vx: -3.2 }); let parried = false;
    for (let i = 0; i < 80; i++) { const pr = g.projs.find(q => q.enemy); if (!parried && pr && Math.abs(pr.x - p.cx) < 26) { press('parry'); step(g, 1); rel('parry'); parried = true; } else step(g, 1); }
    return { ok: parried && g.stats.parries >= 1 && p.hp === p.maxHp && sum(log).hits >= 1 && sum(log).dmg >= 2, detail: `parries ${g.stats.parries || 0} hp ${p.hp}/${p.maxHp} tyrant hits ${sum(log).hits} dmg ${sum(log).dmg}` };
  });
  await t('parry: boss loses poise (repeated parries stagger it); spikes / pits cannot be parried', async () => {
    const { g, p, e } = await setup('knight', 'garg', 60, 1, { hp: 99 }); e.set('move'); p.inv = 0;
    const po = e.poise; for (let i = 0; i < 2; i++) { press('parry'); step(g, 1); rel('parry'); p.hurt(2, e.cx, { src: e }); step(g, 8); }
    const boss = e.poise < po || e.st === 'stagger';
    press('parry'); step(g, 1); rel('parry'); p.inv = 0; const r = p.hurt(1, p.cx, { unblockable: true });
    return { ok: boss && r === 'hit', detail: `poise ${po}→${e.poise} st ${e.st} · spike → ${r}` };
  });
  await t('harder enemies: tougher, faster to act, 3 attack tokens; a poise-broken heavy recovers (was dizzy forever)', async () => {
    const { g, e } = await setup('knight', 'tyrant', 200, 1, { ai: true });
    const z = P.makeEnemy(g, 'zombie', 0, 0);
    const tough = z.maxHp > P.ENEMIES.zombie.hp && e.def.rate < P.ENEMIES.tyrant.rate && e.def.sight > P.ENEMIES.tyrant.sight;
    e.set('dizzy'); step(g, 140); const back = e.st !== 'dizzy';
    return { ok: tough && back && P.ENEMY_TUNE.tokens === 3, detail: `zombie hp ${z.maxHp} (base ${P.ENEMIES.zombie.hp}) · tyrant rate ${e.def.rate} sight ${e.def.sight.toFixed(0)} · dizzy recovered ${back}` };
  });
  await t('Plink guard blocks a frontal hit', async () => {
    const { g, p } = await setup('pip', null, 0, 1);
    press('down'); step(g, 3); const r = p.hurt(1, p.cx + 30); rel('down');
    return { ok: r === 'blocked' && p.hp === p.maxHp, detail: `result ${r} hp ${p.hp}` };
  });

  // 10 · damage processing rules
  await t('armour soaks hits first; HP only drops after the armour breaks', async () => {
    const { g, p, e, log } = await setup('knight', 'bucket', 34, 1);
    const hp0 = e.hp, ar0 = e.armor; let ok = true;
    for (let k = 0; k < 6 && e.armor > 0; k++) { press('attack'); step(g, 1); rel('attack'); step(g, 30, () => shield(p)); if (e.armor > 0 && e.hp !== hp0) ok = false; }
    return { ok: ok && e.armor < ar0 && log.some(l => l.dar > 0), detail: `armor ${ar0}→${e.armor} hp ${hp0}→${e.hp}` };
  });
  await t('an armoured zombie in lava dies (armour does not soak lava)', async () => {
    const { g, e } = await setup('knight', 'cone', 200, 1);
    const tx = Math.floor(e.cx / T); P.world.setTile(g.L, tx, 9, P.TILE.LIQUID); step(g, 3);
    return { ok: e.dead, detail: `dead ${e.dead} armor ${e.armor}` };
  });
  await t('a dead enemy takes no more damage', async () => {
    const { g, p, e, log } = await setup('knight', 'slime', 34, 1);
    e.hp = 1; press('attack'); step(g, 1); rel('attack'); step(g, 30, () => shield(p));
    const r = e.takeHit(5, { id: P.newSwing() });
    return { ok: e.dead && r === false && e.reject === 'dead' && e.hp <= 0, detail: `dead ${e.dead} reject ${e.reject}` };
  });
  await t('charging chainsaw blocks frontal hits, not hits from behind', async () => {
    const { g, p, e } = await setup('knight', 'salvador', 300, 1);
    e.blocking = true; e.dir = -1;
    const front = e.takeHit(2, { id: P.newSwing(), dir: 1, from: p }), back = e.takeHit(2, { id: P.newSwing(), dir: -1, from: p });
    return { ok: !front && e.reject === null && back, detail: `front ${front} back ${back}` };
  });
  await t('boss: immune during intro (with feedback), hittable after, stagger on poise break', async () => {
    const { g, p, e, log } = await setup('knight', 'garg', 300, 1);
    e.set('intro'); const r1 = e.takeHit(2, { id: P.newSwing() }); const imm = e.reject === 'immune';
    e.set('move'); const hp0 = e.hp; for (let k = 0; k < 20 && e.st !== 'stagger'; k++) e.takeHit(1, { id: P.newSwing() });
    return { ok: !r1 && imm && e.hp < hp0 && e.st === 'stagger', detail: `intro→${r1}/${imm} hp ${hp0}→${e.hp} st ${e.st}` };
  });
  await t('boss punish window: no contact damage while vulnerable', async () => {
    const { g, p, e } = await setup('knight', 'garg', 10, 1);
    e.set('stuck'); e.vulnerable = true; e[e.type] = () => { e.vulnerable = true; e.vx = 0; };
    p.inv = 0; step(g, 10);
    return { ok: p.hp === p.maxHp, detail: `hp ${p.hp}/${p.maxHp}` };
  });
  await t('enemy shot hurts the hero once', async () => {
    const { g, p } = await setup('knight', null, 0, 1);
    p.inv = 0; g.spawnProj('fireball', p.cx + 60, p.feet - 20, -1, {}); step(g, 40);
    return { ok: p.hp === p.maxHp - P.HPU, detail: `hp ${p.hp}/${p.maxHp}` };
  });

  // 11 · state safety
  await t('hero dies in the middle of an attack — no error, attack stops', async () => {
    const { g, p } = await setup('mao', 'zombie', 30, 1, { hp: 99 });
    press('attack'); step(g, 3); rel('attack'); p.hp = 1; p.inv = 0; p.hurt(1, p.cx + 10); step(g, 90);
    return { ok: p.dead && !p.act, detail: `dead ${p.dead} act ${p.act && p.act.kind}` };
  });
  await t('enemy dies during its own wind-up — no damage after death', async () => {
    const { g, p, e } = await setup('knight', 'zombie', 26, 1, { ai: true });
    step(g, 60, () => { if (e.st === 'bite' && !e.dead) { e.hp = 1; e.takeHit(1, { id: P.newSwing() }); } });
    // (loot flying to the hero is not "damage after death"; drops are cleared)
    p.inv = 0; const hp0 = p.hp; step(g, 60, () => { g.loose.length = 0; });
    return { ok: e.dead && p.hp === hp0, detail: `dead ${e.dead} hp ${hp0}→${p.hp}` };
  });
  await t('looping skill effects are cleaned up (pit respawn / boss phase / level clear)', async () => {
    const { g, p } = await setup('yota', null, 0, 1);
    press('skill'); step(g, 1); rel('skill'); step(g, 5); const loops0 = g.fxs.filter(f => f.loop).length;
    p.y = g.L.ph + 60; step(g, 2);                          // falls out of the level → respawn at last safe spot
    const after = g.fxs.filter(f => f.loop).length;
    return { ok: loops0 >= 1 && after === 0 && !p.act, detail: `loop fx ${loops0} → ${after}` };
  });
  await t('retry from checkpoint resets hero and combat state', async () => {
    const { g, p } = await setup('knight', 'zombie', 30, 1);
    press('attack'); step(g, 3); g.spawnProj('fireball', p.cx + 60, p.feet - 20, -1, {}); g.freeze = 5; p.hp = 0; p.die(); step(g, 80);
    g.respawn();
    return { ok: p.hp === p.maxHp && !p.dead && !p.act && g.projs.length === 0 && g.freeze === 0 && g.mode === 'play', detail: `hp ${p.hp} dead ${p.dead} projs ${g.projs.length}` };
  });

  // 11b · world-art enemy skins (art.js): only the LOOK changes — the fight is the base type's (with the v94 ENEMY_TUNE applied to every type alike)
  for (const th of Object.keys(P.SKINS)) for (const type of Object.keys(P.SKINS[th])) await t(`skin ${th}:${type} keeps stats, is hittable both sides, has its sprite`, async () => {
    QT.theme(th);
    const base = P.ENEMIES[type], out = [];
    for (const dir of [1, -1]) {
      const { g, p, e, log } = await setup('knight', type, 0, dir);
      const hb = e.hurtBox(), want = dir > 0 ? p.cx + 14 : p.cx - 14 - hb.w; e.x += want - hb.x; if (e.def.ai === 'flyer') e.y = QT.GY - e.h;
      const hp0 = e.hp, ar0 = e.armor;
      press('attack'); step(g, 1); rel('attack'); step(g, 40, () => shield(p));
      out.push(sum(log).hits >= 1 && (e.hp < hp0 || e.armor < ar0));
      out.push(e.def.sheet === P.SKINS[th][type].sheet && e.def.hp === Math.max(2, Math.round(base.hp * P.ENEMY_TUNE.hp)) && e.def.ai === base.ai && e.def.dmg === base.dmg && (e.def.armor || 0) === Math.round((base.armor || 0) * P.ENEMY_TUNE.armor) && !!e.def.small === !!base.small);
      out.push(!!P.assets.img(e.def.sheet.img) && !!e.anim.frame());
    }
    QT.theme('meadow');
    return { ok: out.every(Boolean), detail: out.join(',') };
  });
  await t('skin: a clothed skeleton turns into a plain skeleton when its armour breaks', async () => {
    QT.theme('night');
    const { g, p, e } = await setup('knight', 'bucket', 300, 1);
    e.armor = 1; e.takeHit(3, { id: P.newSwing() }); const ok = e.armor === 0 && e.anim.sheet.def.img === P.ART_SHEETS.skeleton.img;
    QT.theme('meadow'); return { ok, detail: `armor ${e.armor} sheet ${e.anim.sheet.def.img}` };
  });
  // 12 · every level loads and survives scripted play with every playable hero
  for (const lv of P.LEVEL_ORDER) await t(`level ${lv} loads with every hero and 900 frames of play throw no error`, async () => {
    let errs = 0;
    for (const hid of HEROES) {
      const g = new P.Game({ levelId: lv, heroId: hid }); await g.load(); I.clearAll();
      const acts = ['right', 'jump', 'attack', 'skill', 'dash', 'attack', 'right', 'left', 'down'];
      for (let f = 0; f < 900; f++) {
        if (f % 7 === 0) { const a = acts[(f / 7 | 0) % acts.length]; I.set(a, 't', true); }
        if (f % 7 === 3) for (const a of acts) I.set(a, 't', false);
        I.set('right', 'h', f % 120 < 90);
        try { g.update(); } catch (e) { errs++; if (errs < 2) throw new Error(`${hid}@${lv} f${f}: ${e.message}`); }
        if (g.mode === 'dead') g.respawn();
        I.endFrame();
      }
      I.clearAll(); I.set('right', 'h', false);
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; g.render(cv.getContext('2d'), 1);
    }
    return { ok: errs === 0, detail: `errors ${errs}` };
  });
  return out;
}, filter);

// 13 · save compatibility (main save is only touched by gold; an old platform save loads)
const save = await page.evaluate(() => {
  const S = PLAT.save, out = [];
  const main0 = { gold: 100, chars: ['knight', 'pip'], settings: { sfx: 50 }, other: { keep: 1 } };
  localStorage.setItem('questlines_wordbattle_v1', JSON.stringify(main0));
  localStorage.setItem('ql_platform_v1', JSON.stringify({ v: 1, hero: 'pip', levels: { '1-1': { cleared: true, bestRank: 'A', gems: [0] } }, settings: { shake: false } }));
  const d = S.load();
  out.push({ name: 'old platform save loads (levels, hero, settings kept; new defaults filled)', ok: d.hero === 'pip' && d.levels['1-1'].cleared && d.settings.shake === false && d.settings.btnSize === 'M' && d.stats.kills === 0 });
  S.addMainGold(30); const m = JSON.parse(localStorage.getItem('questlines_wordbattle_v1'));
  out.push({ name: 'reward adds gold to the main save without touching anything else', ok: m.gold === 130 && JSON.stringify({ ...m, gold: 100 }) === JSON.stringify(main0) });
  out.push({ name: 'save keys unchanged', ok: !!localStorage.getItem('ql_platform_v1') && !!localStorage.getItem('questlines_wordbattle_v1') });
  return out;
});
results.push(...save);

// 14 · UI flow with the REAL game loop: title → map → level → pause → resume → die → retry → restart → clear → results
const ui = await browser.newPage({ viewport: { width: 1280, height: 720 } });
ui.on('pageerror', e => pageErrors.push('[ui] ' + String(e && e.stack || e)));
await ui.goto(`http://localhost:${port}/platformer.html`);
await ui.waitForFunction(() => window.PLAT && PLAT.app && PLAT.app.raf);
const flow = [];
const ck = async (name, fn) => { try { const ok = await fn(); flow.push({ name: 'ui · ' + name, ok: !!ok }); } catch (e) { flow.push({ name: 'ui · ' + name, ok: false, detail: String(e) }); } };
const scr = () => ui.evaluate(() => PLAT.app.screen);
await ck('title shows', async () => (await scr()) === 'title');
await ui.click('#sTitle [data-go="map"]');
await ck('map shows every level', async () => (await scr()) === 'map' && (await ui.locator('#worlds .lvl').count()) === await ui.evaluate(() => PLAT.LEVEL_ORDER.length));
await ui.click('#worlds .lvl >> nth=0');
// v121 story: the prologue plays before 1-1 the first time — skip through every scene
await ui.waitForFunction(() => PLAT.app.screen === 'story' || PLAT.app.screen === 'game', null, { timeout: 15000 });
await ck('story · the prologue plays before 1-1', async () => (await scr()) === 'story' && (await ui.evaluate(() => document.querySelector('#stTitle').textContent.includes('ห้าตะเกียง'))));
for (let i = 0; i < 6 && (await scr()) === 'story'; i++) { await ui.click('#stSkip'); await ui.waitForTimeout(250); }
await ui.waitForFunction(() => PLAT.app.screen === 'game', null, { timeout: 15000 });
await ck('story · scenes are remembered', async () => ui.evaluate(() => PLAT.app.story.seen('prologue') && PLAT.app.story.seen('w1in') && PLAT.app.story.seen('L1-1')));
await ck('level 1-1 starts', async () => (await ui.evaluate(() => PLAT.app.game && PLAT.app.game.mode)) === 'play');
await ui.keyboard.down('KeyD'); await ui.waitForTimeout(500); await ui.keyboard.press('KeyJ'); await ui.waitForTimeout(200); await ui.keyboard.press('KeyJ'); await ui.keyboard.up('KeyD');
await ck('hero moved right with the keyboard', async () => (await ui.evaluate(() => PLAT.app.game.player.cx)) > (await ui.evaluate(() => PLAT.app.game.L.start.x)) + 20);
await ui.keyboard.press('Escape'); await ui.waitForTimeout(150);
await ck('pause stops the game', async () => { const f0 = await ui.evaluate(() => PLAT.app.game.frame); await ui.waitForTimeout(300); return (await scr()) === 'pause' && (await ui.evaluate(() => PLAT.app.game.frame)) === f0; });
await ui.click('#sPause [data-go="resume"]'); await ui.waitForTimeout(200);
await ck('resume continues', async () => { const f0 = await ui.evaluate(() => PLAT.app.game.frame); await ui.waitForTimeout(300); return (await scr()) === 'game' && (await ui.evaluate(() => PLAT.app.game.frame)) > f0; });
await ui.evaluate(() => { const p = PLAT.app.game.player; p.inv = 0; p.hp = 1; p.hurt(1, p.cx + 10); });
await ui.waitForFunction(() => PLAT.app.screen === 'dead', null, { timeout: 5000 });
await ck('death shows the retry screen', async () => (await scr()) === 'dead');
await ui.click('#dRetry'); await ui.waitForTimeout(200);
await ck('retry: full HP, playing, not dead', async () => ui.evaluate(() => { const g = PLAT.app.game, p = g.player; return PLAT.app.screen === 'game' && g.mode === 'play' && p.hp === p.maxHp && !p.dead && !p.act; }));
await ui.keyboard.press('Escape'); await ui.waitForTimeout(100); await ui.click('#sPause [data-go="restart"]');
await ui.waitForFunction(() => PLAT.app.screen === 'game' && PLAT.app.game.mode === 'play', null, { timeout: 15000 });
await ck('restart reloads the level from the start', async () => ui.evaluate(() => PLAT.app.game.stats.frames < 120 && Math.abs(PLAT.app.game.player.cx - PLAT.app.game.L.start.x) < 40));
await ui.evaluate(() => { const g = PLAT.app.game, ex = g.L.exit, p = g.player; p.x = ex.x; p.y = ex.y + ex.h - p.h; p.vx = 0; p.vy = 0; });
await ui.waitForFunction(() => PLAT.app.screen === 'clear', null, { timeout: 8000 });
await ck('reaching the exit shows results (rank, time, deaths, best combo)', async () => { const t = await ui.locator('#clearBox').innerText(); return /ผ่านด่าน/.test(t) && /คอมโบสูงสุด/.test(t) && /ตาย/.test(t); });
await ck('clear is saved to the platform save', async () => ui.evaluate(() => { const d = JSON.parse(localStorage.getItem('ql_platform_v1')); return d.levels['1-1'] && d.levels['1-1'].cleared; }));
await ui.click('#clearBox [data-go2="next"]');
await ui.waitForFunction(() => PLAT.app.screen === 'story', null, { timeout: 15000 });
await ck('story · 1-2 intro scene; ▶ / Enter step through the lines', async () => { const n = await ui.evaluate(() => PLAT.STORY.levels['1-2'].length);
  for (let i = 0; i < n * 2 + 2 && (await scr()) === 'story'; i++) { await ui.keyboard.press('Enter'); await ui.waitForTimeout(200); } return (await scr()) === 'game'; });
await ui.waitForFunction(() => PLAT.app.screen === 'game' && PLAT.app.game && PLAT.app.game.levelId === '1-2', null, { timeout: 15000 });
await ck('next level (1-2) unlocked and starts', async () => true);
await ui.screenshot({ path: path.join(process.env.SHOT_DIR || ROOT, '.combat-test-last.png') }).catch(() => {});
results.push(...flow);

await browser.close(); srv.kill();
let fail = 0;
for (const r of results) { if (!r.ok) fail++; if (!r.ok || process.env.VERBOSE) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? '  — ' + r.detail : ''}`); }
if (pageErrors.length) { console.log('\npage errors:'); pageErrors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0])); }
console.log(`\n${results.length - fail}/${results.length} combat tests passed${pageErrors.length ? ` · ${pageErrors.length} page error(s)` : ''}`);
process.exit(fail || pageErrors.length ? 1 : 0);
