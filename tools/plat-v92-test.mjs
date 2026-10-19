// Platform Mode v92 TESTS — real browser (Playwright + Chromium), real game code, nothing mocked except
// the gamepad (navigator.getGamepads) and synthetic pointer / focus events.
//   X animation & charge · story levels still play · Endless (3 worlds: streaming, determinism, game over,
//   stats, restart, difficulty) · virtual joystick & touch input reset · gamepad remap · long-run performance
// usage: node tools/plat-v92-test.mjs [filter]      (npm run test:v92)
import { spawn } from 'node:child_process';
import path from 'node:path'; import net from 'node:net';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
async function loadPW() {
  for (const p of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean)) { try { return await import(p); } catch (e) {} }
  console.error('✗ playwright is not installed — run `npm i -D playwright`. Tests NOT run.'); process.exit(2);
}
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const { chromium } = await loadPW();
const port = await freePort();
const srv = spawn(process.execPath, [path.join(ROOT, 'server.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
let browser;
for (const o of [{}, { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }]) { try { browser = await chromium.launch({ ...o, args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] }); break; } catch (e) {} }
if (!browser) { console.error('✗ could not start Chromium'); srv.kill(); process.exit(2); }
const filter = process.argv[2] || '';
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const page = await ctxB.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g|net::ERR/.test(m.text())) pageErrors.push(m.text()); });
const URL0 = `http://localhost:${port}/platformer.html`;
await page.goto(URL0);
await page.waitForFunction(() => window.PLAT && PLAT.app && PLAT.app.raf);
await page.addScriptTag({ path: path.join(ROOT, 'tools/plat-v92-tests.js') });
const results = await page.evaluate(f => window.V92(f), filter);
// persistence across a reload (gamepad mapping + endless stats are in the Platform save)
if (!filter || 'persist'.includes(filter) || filter.includes('persist')) {
  await page.reload(); await page.waitForFunction(() => window.PLAT && PLAT.app && PLAT.app.raf);
  const r = await page.evaluate(() => ({ map: JSON.stringify(PLAT.input.padMap), endless: JSON.stringify(PLAT.save.data.endless) }));
  const ok = /"jump":\[3\]/.test(r.map) && /"runs":[1-9]/.test(r.endless);
  results.push({ name: 'persistence: pad mapping + endless stats survive a reload', ok, detail: r.map + ' ' + r.endless.slice(0, 120) });
}
let fail = 0;
for (const r of results) { if (!r.ok) fail++; if (!r.ok || process.env.VERBOSE) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? '  — ' + r.detail : ''}`); }
for (const r of results.filter(r => r.ok && r.info)) console.log(`  · ${r.name}: ${r.info}`);
if (pageErrors.length) { console.log('page errors:\n  ' + [...new Set(pageErrors)].slice(0, 12).join('\n  ')); fail++; }
console.log(`\n${results.length - results.filter(r => !r.ok).length}/${results.length} v92 tests passed`);
await browser.close(); srv.kill();
process.exit(fail ? 1 : 0);
