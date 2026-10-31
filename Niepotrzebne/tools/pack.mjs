// Rybna Wyspa: capture the critic pack (aerial, first-person scenes with HUD, fish card, held stack, shop, weather) at 1600x900.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');
const OUT = process.argv[2] || '/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/gauntlet/pack';
const line = fs.readFileSync('/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/tools/line.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const shoot = async (q, steps) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => { if (!e.message.includes('pointer lock')) console.log('[pageerror]', e.message); });
  await page.goto(`http://localhost:8740/?auto=solo&nolock${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__rw && window.__rw.playing, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.clear(); });
  for (const s of steps) {
    if (s.js) await page.evaluate(s.js);
    await page.waitForTimeout(s.wait || 800);
    if (s.shot) await page.screenshot({ path: `${OUT}/${s.shot}.png` });
  }
  await page.close();
};
const aimFish = `(() => { const g = __rw; let best = null; for (const f of g.sim.fish.values()) { const p = f.body.translation(); if (Math.abs(p.y - 1.9) < 0.15 && (!best || p.z < best.z)) best = { x: p.x, y: p.y, z: p.z }; } if (!best) return 0; const e = { x: best.x + 1.3, z: best.z + 1.5 }; g.player.teleport(e.x, 1.62, e.z); const dx = best.x - e.x, dy = best.y - (1.62 + 1.62), dz = best.z - e.z; g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz)); return 1; })()`;
await shoot('&phase=0.17&weather=clear', [
  { js: '__rw.playing = false; __rw.hud.show(false); __rw.mT = 0.95; 1', wait: 1500, shot: 'a' },
  { js: '__rw.playing = true; __rw.hud.show(true); __rw.player.teleport(-2.2, 1.65, 13.4); __rw.player.yaw = 1.32; __rw.player.pitch = 0.0; 1', wait: 1500, shot: 'b' },
  { js: line, wait: 6500 },
  { js: aimFish, wait: 900, shot: 'c' },
  { js: `(() => { const g = __rw; clearInterval(window.__pumpT); g.store.state.up.stos = 3; const ids = [...g.sim.fish.keys()].slice(0, 3); for (const id of ids) g.farm.pick(g.pid, id); g.player.teleport(-3, 1.65, 4); g.player.yaw = -2.2; g.player.pitch = -0.05; return ids.length; })()`, wait: 1200, shot: 'd' },
  { js: '__rw.panels.toggleShop(true); 1', wait: 800, shot: 'e' },
]);
await shoot('&phase=0.62&weather=deszcz', [
  { js: line, wait: 5000 },
  { js: '__rw.player.teleport(-7, 1.65, 6); __rw.player.yaw = -1.9; __rw.player.pitch = -0.08; 1', wait: 1500, shot: 'f' },
]);
await shoot('&phase=0.85&weather=pelnia', [
  { js: '__rw.playing = false; __rw.hud.show(false); __rw.mT = 2.2; 1', wait: 1800, shot: 'g' },
]);
await browser.close();
console.log('pack ok');
