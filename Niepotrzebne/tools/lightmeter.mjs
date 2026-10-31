// Rybna Wyspa: measure sunlit vs shadowed grass luminance next to the shop on a fixed frame.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:8740/?auto=solo&nolock&phase=0.3&weather=clear', { waitUntil: 'load' });
await page.waitForFunction(() => window.__rw && window.__rw.playing, null, { timeout: 60000 });
await page.evaluate(() => { const g = __rw; g.hud.show(false); g.player.teleport(-3.5, 1.65, 12.5); g.player.yaw = 1.45; g.player.pitch = -0.35; g.grass.mesh.visible = false; });
await page.waitForTimeout(1500);
const out = process.argv[2] || '/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/shots/light.png';
await page.screenshot({ path: out });
await browser.close();
console.log('ok');
