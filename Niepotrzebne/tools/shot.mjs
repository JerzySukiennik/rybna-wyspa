// Rybna Wyspa: headless Chrome harness (real GPU via ANGLE/Metal): load, run setup JS, wait, screenshot, print logs.
// node shot.mjs <out.png> [setupJS] [waitMs] [width] [height]   env URL=..., STEPS=json array of {js, wait, shot}
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');
const [out = 'shot.png', setup = '', wait = '3000', w = '1280', h = '720'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
await page.goto(process.env.URL || 'http://localhost:8740/?auto=solo&nolock&fps&debug', { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__rw && window.__rw.playing, null, { timeout: 60000 }); } catch (e) { logs.push('[harness] boot timeout'); }
await page.waitForTimeout(600);
const run = async (js) => { try { const r = await page.evaluate(js); if (r !== undefined) logs.push('[eval] ' + JSON.stringify(r)); } catch (e) { logs.push('[eval error] ' + e.message); } };
if (process.env.STEPS) {
  const steps = JSON.parse(process.env.STEPS);
  for (const s of steps) {
    if (s.js) await run(s.js);
    await page.waitForTimeout(s.wait || 500);
    if (s.shot) await page.screenshot({ path: s.shot });
  }
} else {
  if (setup) await run(setup);
  await page.waitForTimeout(+wait);
}
await run(`({ fps: Math.round(__rw.fps), calls: __rw.renderer.info.render.calls, tris: __rw.renderer.info.render.triangles, fish: __rw.fishCount(), cash: Math.round(__rw.store && __rw.store.state.cash) })`);
await page.screenshot({ path: out });
console.log(logs.slice(-50).join('\n'));
await browser.close();
