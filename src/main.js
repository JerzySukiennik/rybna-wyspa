// Rybna Wyspa: boot, loading screen, main menu, settings, pause and joining a farm.

import { Game, saveSettings } from './game/game.js';
import { esc } from './util.js';

const $ = (id) => document.getElementById(id);
const COLORS = ['#4aa8ff', '#5fd068', '#ffb02e', '#b57bff', '#ff7be8', '#47c9c2', '#f4f6f8', '#2f3438'];

const game = new Game();
window.__rw = game;

function progress(k, text) {
  $('ld-fill').style.width = `${Math.round(k * 100)}%`;
  $('ld-text').textContent = text;
}

async function main() {
  try {
    await game.boot(progress);
  } catch (e) {
    console.error(e);
    $('ld-text').textContent = 'Nie udało się uruchomić gry: ' + e.message;
    return;
  }
  setupMenu();
  game.netStatus('Łączenie z serwerem…');
  game.probeNet().then((ok) => game.netStatus(ok ? 'Serwer działa. Publiczna wyspa czeka.' : 'Brak połączenia z serwerem: zagrasz solo, zapis w tej przeglądarce.'));
  $('loading').classList.add('out');
  setTimeout(() => $('loading').remove(), 600);
  $('menu').classList.remove('hidden');
  const q = new URLSearchParams(location.search);
  if (q.get('auto') === 'solo') start('solo');
  else if (q.get('auto') === 'public') game.probeNet().then(() => start('public'));
  else if (q.get('auto') === 'code') game.probeNet().then(() => start('code', q.get('code')));
}

function setupMenu() {
  const s = game.settings;
  const nick = $('nick');
  nick.value = s.nick || randomNick();
  nick.addEventListener('input', () => { s.nick = nick.value.trim().slice(0, 16); game.nick = s.nick || 'Gracz'; saveSettings(s); });
  s.nick = nick.value;
  game.nick = s.nick;
  const cbox = $('colors');
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.style.background = c;
    b.dataset.c = c;
    if (c === s.color) b.classList.add('on');
    b.addEventListener('click', () => { s.color = c; game.color = c; saveSettings(s); for (const x of cbox.children) x.classList.toggle('on', x === b); });
    cbox.appendChild(b);
  }
  $('m-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of $('m-tabs').children) x.classList.toggle('on', x === b);
    for (const p of document.querySelectorAll('.m-pane')) p.classList.toggle('on', p.dataset.pane === b.dataset.tab);
  });
  $('play-pub').addEventListener('click', () => start('public'));
  $('play-new').addEventListener('click', () => start('new'));
  $('play-code').addEventListener('click', () => { const c = $('code').value.trim().toUpperCase(); if (c.length >= 4) start('code', c); });
  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('play-code').click(); });
  $('resume').addEventListener('click', () => { game.pause(false); game.input.lock(); });
  $('to-menu').addEventListener('click', () => location.reload());
  buildSettings();
  buildCredits();
  renderRecent();
  game.netStatus = (t) => { $('net-status').textContent = t; };
}

function randomNick() {
  const a = ['Szczupak', 'Okoń', 'Sum', 'Karp', 'Płotka', 'Leszcz', 'Węgorz', 'Boleń', 'Sandacz', 'Lin'];
  return a[Math.floor(Math.random() * a.length)] + Math.floor(10 + Math.random() * 89);
}

function renderRecent() {
  const box = $('recent');
  let list = [];
  try { list = JSON.parse(localStorage.getItem('rybnaWyspa.recent') || '[]'); } catch (e) { list = []; }
  box.innerHTML = list.length ? '<div class="net">Ostatnie prywatne wyspy:</div>' + list.slice(0, 4).map((r) => `<div class="li" data-code="${esc(r.code)}"><b class="grow">${esc(r.name || r.code)}</b><span class="muted">${esc(r.code)}</span></div>`).join('') : '';
  box.onclick = (e) => { const li = e.target.closest('[data-code]'); if (li) start('code', li.dataset.code); };
}

function buildSettings() {
  const s = game.settings;
  const el = $('settings');
  const row = (label, key, min, max, step, fmt, on) => {
    const d = document.createElement('div');
    d.className = 'srow';
    d.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}"><output>${fmt(s[key])}</output>`;
    const inp = d.querySelector('input'), out = d.querySelector('output');
    inp.addEventListener('input', () => { s[key] = +inp.value; out.textContent = fmt(s[key]); on(s[key]); saveSettings(s); });
    el.appendChild(d);
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  row('Muzyka', 'music', 0, 1, 0.01, pct, (v) => game.audio.setVolume('music', v));
  row('Efekty', 'sfx', 0, 1, 0.01, pct, (v) => game.audio.setVolume('sfx', v));
  row('Otoczenie', 'amb', 0, 1, 0.01, pct, (v) => game.audio.setVolume('amb', v));
  row('Czułość myszy', 'sens', 0.3, 2.5, 0.05, (v) => v.toFixed(2), (v) => { game.player.sens = v; });
  row('Pole widzenia', 'fov', 60, 100, 1, (v) => `${v}°`, (v) => { game.camera.fov = v; game.camera.updateProjectionMatrix(); });
  row('Rozdzielczość', 'scale', 0.6, 2, 0.05, (v) => `×${v.toFixed(2)}`, () => game.resize());
  const f = document.createElement('div');
  f.className = 'srow';
  f.innerHTML = `<span>Licznik FPS</span><div class="seg"><button data-v="0">Ukryty</button><button data-v="1">Widoczny</button></div><span></span>`;
  const seg = f.querySelector('.seg');
  const paint = () => { for (const b of seg.children) b.classList.toggle('on', +b.dataset.v === (s.showFps ? 1 : 0)); };
  seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; s.showFps = !!+b.dataset.v; saveSettings(s); paint(); if (!s.showFps) $('fps').classList.add('hidden'); });
  paint();
  el.appendChild(f);
}

async function buildCredits() {
  const el = $('credits');
  let html = '<p><b>Rybna Wyspa</b> · Gzowo Labs · gra Jurka, kod i modele: Claude.</p><p>Wszystkie modele i ryby są robione proceduralnie w kodzie. Ryby z Narwi, sekretne z Gzowa.</p>';
  for (const dir of ['music', 'amb', 'sfx']) {
    try {
      const r = await fetch(`assets/audio/${dir}/CREDITS.md`);
      if (r.ok) {
        const t = await r.text();
        const lines = t.split('\n').filter((l) => l.startsWith('- ') || l.startsWith('|')).slice(0, 80);
        if (lines.length) html += `<p><b>${dir === 'music' ? 'Muzyka' : dir === 'amb' ? 'Otoczenie' : 'Efekty'}</b></p>` + lines.map((l) => `<p>${esc(l.replace(/^- /, '').replace(/`/g, ''))}</p>`).join('');
      }
    } catch (e) { /* none */ }
  }
  el.innerHTML = html;
}

async function start(mode, code) {
  for (const b of document.querySelectorAll('#menu button')) b.disabled = true;
  try {
    if (mode === 'solo' || !game.netAvailable) await game.startSolo();
    else await game.startOnline(mode, code);
  } catch (e) {
    console.error(e);
    $('net-status').textContent = 'Nie udało się dołączyć: ' + e.message + '. Startuję solo.';
    await game.startSolo();
  }
  game.enterPlay();
}

main();
