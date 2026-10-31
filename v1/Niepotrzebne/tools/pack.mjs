// Rybna Wyspa: capture the critic pack (aerial of a working farm, first-person scenes with HUD, fish card, held stack, shop, rain, river fog) at 1600x900.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');
const OUT = process.argv[2] || '/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/gauntlet/pack';
const line = fs.readFileSync('/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/tools/farmdemo.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const shoot = async (q, steps) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => { if (!e.message.includes('pointer lock')) console.log('[pageerror]', e.message); });
  await page.goto(`http://localhost:8740/?auto=solo&nolock${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__rw && window.__rw.playing, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.clear(); });
  for (const s of steps) {
    if (s.js) { const r = await page.evaluate(s.js); if (s.log) console.log(s.log, JSON.stringify(r)); }
    await page.waitForTimeout(s.wait || 800);
    if (s.shot) await page.screenshot({ path: `${OUT}/${s.shot}.png` });
  }
  await page.close();
};
const card = `(() => { const g = __rw; clearInterval(window.__pumpT); const f = [...g.sim.fish.values()].find((x) => x.body && x.body.translation().y > 1.9); if (!f) return 0; const p = { x: 0.6, y: 1.75, z: 9.2 }; f.body.setTranslation(p, true); f.body.setLinvel({ x: 0, y: 0, z: 0 }, true); f.body.setAngvel({ x: 0, y: 0, z: 0 }, true); g.player.teleport(0.6, 1.62, 10.9); g.player.yaw = 0; g.player.pitch = -0.72; return f.sp; })()`;
await shoot('&phase=0.3&weather=clear', [
  { js: line, wait: 9000 },
  { js: '__rw.playing = false; __rw.hud.show(false); __rw.mT = 0.95; 1', wait: 1800, shot: 'a' },
  { js: '__rw.playing = true; __rw.hud.show(true); __rw.player.teleport(-2.2, 1.65, 13.4); __rw.player.yaw = 1.32; __rw.player.pitch = 0.0; 1', wait: 1500, shot: 'b' },
  { js: card, wait: 160, shot: 'c', log: 'card' },
  { js: `(() => { const g = __rw; g.store.state.up.stos = 3; const ids = [...g.sim.fish.keys()].slice(0, 4); for (const id of ids) g.farm.pick(g.pid, id); g.player.teleport(-3, 1.65, 4); g.player.yaw = -2.2; g.player.pitch = -0.05; return ids.length; })()`, wait: 1200, shot: 'd' },
  { js: '__rw.panels.toggleShop(true); 1', wait: 800, shot: 'e' },
]);
await shoot('&phase=0.42&weather=deszcz', [
  { js: line, wait: 7000 },
  { js: '__rw.player.teleport(-8, 1.65, 1.5); __rw.player.yaw = -2.0; __rw.player.pitch = -0.1; 1', wait: 1800, shot: 'f' },
]);
await shoot('&phase=0.3&weather=mgla', [
  { js: line, wait: 3000 },
  { js: '__rw.player.teleport(2.3, 1.8, -32); __rw.player.yaw = 0.7; __rw.player.pitch = 0.02; 1', wait: 2500, shot: 'g' },
]);
await browser.close();
console.log('pack ok');
