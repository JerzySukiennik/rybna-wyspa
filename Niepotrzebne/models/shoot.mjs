// Rybna Wyspa: headless Chrome screenshots of the model viewer plus the fish contract check table.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const { chromium } = require('playwright-core');

const OUT = '/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa/Niepotrzebne/models/shots/';
const BASE = 'http://localhost:8742/Niepotrzebne/models/viewer.html';
const jobs = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: +(process.env.DPR || 1) });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
for (const job of jobs) {
  const [kind, val] = job.split('=');
  const q = kind === 'check' ? '?sheet=none' : kind === 'fish' ? `?fish=${val}` : kind === 'ids' ? `?ids=${val}` : `?sheet=${kind}${val ? '&' + val : ''}`;
  await page.goto(BASE + q, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 }).catch(() => logs.push('[harness] timeout ' + job));
  const err = await page.evaluate(() => window.__error);
  if (err) { console.log('ERROR', job, err); continue; }
  if (kind === 'check') {
    const rows = await page.evaluate(() => window.__check());
    console.log('id'.padEnd(12), 'tris', ' lim', '  len  ', '  x0   ', '  cy   ', '  cz   ', '  h    ', '  w    ', 'attrs idx bend        glow');
    for (const r of rows) console.log(r.id.padEnd(12), String(r.tris).padStart(4), String(r.lim).padStart(4), r.len.toFixed(4), r.x0.toFixed(4).padStart(7), r.cy.toFixed(4).padStart(7), r.cz.toFixed(4).padStart(7), r.h.toFixed(4).padStart(6), r.w.toFixed(4).padStart(6), String(r.attrs).padEnd(5), String(r.indexed).padEnd(5), JSON.stringify(r.bend).padEnd(12), r.glow, r.tris > r.lim || r.tris < 150 ? 'BUDGET!' : '', Math.abs(r.len - 1) > 0.01 ? 'LEN!' : '');
    continue;
  }
  await page.waitForTimeout(300);
  const name = kind === 'ids' ? 'grid_' + val.split(',')[0] + '.png' : (kind === 'fish' ? 'fish_' + val : kind) + (val && kind !== 'fish' ? '_' + val.replace(/[^a-z0-9]/gi, '') : '') + '.png';
  await page.screenshot({ path: OUT + name });
  console.log('shot', OUT + name);
}
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
