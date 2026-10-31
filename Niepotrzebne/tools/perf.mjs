// Rybna Wyspa: stress test: spawn ~400 fish on the island and measure frame rate and step cost for a few seconds.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8740/?auto=solo&nolock&fps&phase=0.2&weather=clear', { waitUntil: 'load' });
await page.waitForFunction(() => window.__rw && window.__rw.playing, null, { timeout: 60000 });
await page.evaluate(() => {
  const g = __rw;
  const b = { def: { w: [40, 30, 15, 8, 4, 3], secret: 0.02 }, outlet: null, vel: null };
  let n = 0;
  window.__spawnT = setInterval(() => {
    for (let k = 0; k < 10 && g.sim.count() < 400; k++) {
      const a = Math.random() * 6.28, r = Math.random() * 13;
      b.outlet = new g.constructor.prototype.constructor === undefined ? null : null;
      const THREE = window.__THREE;
      g.farm.spawnFrom({ def: { w: [40, 30, 15, 8, 4, 3], secret: 0.01 }, outlet: { clone: () => ({ x: Math.cos(a) * r, y: 3 + Math.random() * 2, z: Math.sin(a) * r, add(v) { this.x += v.x; this.z += v.z; return this; } }) }, vel: { x: 0, y: 0, z: 0, clone() { return { x: 0, y: 0, z: 0, multiplyScalar() { return this; } }; } }, id: 'x' }, null);
      n++;
    }
  }, 100);
});
await page.waitForTimeout(6000);
await page.evaluate(() => { const g = __rw; g.player.teleport(-9, 1.65, 9); g.player.yaw = -0.8; g.player.pitch = -0.35; });
const samples = [];
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(1000);
  samples.push(await page.evaluate(() => {
    const g = __rw;
    const t0 = performance.now();
    g.phys.step(() => {});
    const step = performance.now() - t0;
    return { fps: Math.round(g.fps), fish: g.sim.fish.size, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, stepMs: +step.toFixed(2) };
  }));
}
console.log(samples.map((s) => JSON.stringify(s)).join('\n'));
await page.screenshot({ path: '/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/shots/perf.png' });
await browser.close();
