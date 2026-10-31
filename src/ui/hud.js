// Rybna Wyspa: in-game HUD in the fishing-licence style (licence card, cash ticket, weather slip, fish ID card, paper tabs, stamps).

import { fmtZl, fmtKg, fmtTime, esc } from '../util.js';
import { LEVELS, levelOf, MAX_LEVEL } from '../data/progress.js';
import { WEATHERS } from '../data/weather.js';
import { TRAIT_BY_ID, TRAITS, VARIANTS } from '../data/traits.js';
import { SPECIES, RARITIES } from '../data/species.js';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { fishValue, slotsOf } from '../sim/value.js';

const $ = (id) => document.getElementById(id);

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;
const CLOUD = '<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1.4A3.3 3.3 0 0 1 17 15z"/>';
export const ICONS = {
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  night: P('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  rain: P(CLOUD, '<path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>'),
  storm: P(CLOUD, '<path d="M12 15l-2 4h3l-2 4"/>'),
  fog: P('<path d="M4 9h13M3 13h17M6 17h13M8 5h8"/>'),
  wind: P('<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>'),
  heat: P('<circle cx="12" cy="10" r="4"/><path d="M12 2v1M5 10H4M20 10h-1M6.3 4.3l.7.7M17.7 4.3l-.7.7M5 18c2-1 3 1 5 0s3-1 5 0 3 1 4 0"/>'),
  frost: P('<path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17M9 4l3 2 3-2M9 20l3-2 3 2"/>'),
  snow: P(CLOUD, '<path d="M8 19h.01M12 20h.01M16 19h.01M10 22h.01M14 22h.01"/>'),
  moon: P('<circle cx="12" cy="12" r="8"/><path d="M9 9h.01M14 14h.01M15 9.5h.01"/>'),
  meteor: P('<circle cx="16" cy="8" r="3"/><path d="M13.5 10.5L4 20M11 9L5 15M15 13l-6 6"/>'),
  aurora: P('<path d="M3 16c3-6 5-6 8 0s5 6 10-4M3 11c3-5 5-5 8 0"/>'),
  bloodmoon: P('<circle cx="12" cy="12" r="8"/><path d="M8 12a4 4 0 0 0 8 0"/>'),
  rainbow: P('<path d="M2 18a10 10 0 0 1 20 0M5 18a7 7 0 0 1 14 0M8 18a4 4 0 0 1 8 0"/>'),
  gold: P('<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'),
  hand: P('<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10V4.5a1.5 1.5 0 0 1 3 0V10V5.5a1.5 1.5 0 0 1 3 0V11V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 13a1.6 1.6 0 0 1 2.6-1.8z"/>'),
};

export class Hud {
  constructor() {
    this.cashShown = 0;
    this.cashTarget = 0;
    this.el = {
      hud: $('hud'), ticket: $('ticket'), cashN: $('cash-n'), rate: $('rate'), lvlN: $('lvl-n'), lvlFill: $('lvl-fill'), lvlNext: $('lvl-next'), lvlTo: $('lvl-to'),
      farm: $('farm-name'), onlineDot: $('online-dot'), onlineN: $('online-n'), wIcon: $('w-icon'), wName: $('w-name'), wLeft: $('w-left'), wTrait: $('w-trait'),
      prompt: $('prompt'), label: $('fish-label'), toasts: $('toasts'), banner: $('banner'), full: $('full'), hotbar: $('hotbar'),
      stackIcons: $('stack-icons'), stackN: $('stack-n'), stackV: $('stack-v'), hint: $('build-hint'), cross: $('crosshair'), fps: $('fps'),
    };
    this.bannerT = 0;
    this.lastPrompt = '';
    this.lastLabel = '';
    this.lastW = '';
    this.slots = [];
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      this.el.hotbar.appendChild(s);
      this.slots.push(s);
    }
    this.slotKey = [];
    this.icons = null;
  }

  show(on) { this.el.hud.classList.toggle('hidden', !on); }

  setCash(v, instant) {
    this.cashTarget = v;
    if (instant) { this.cashShown = v; this.el.cashN.textContent = fmtZl(v); }
  }

  setRate(r) { this.el.rate.textContent = `+${fmtZl(r, 0)} / min`; }

  setFarm(name, online, n) {
    this.el.farm.textContent = name;
    this.el.onlineDot.classList.toggle('on', !!online);
    this.el.onlineN.textContent = online ? `${n} ${n === 1 ? 'wędkarz' : n < 5 ? 'wędkarzy' : 'wędkarzy'}` : 'solo';
  }

  setLevel(earned) {
    const l = levelOf(earned);
    this.el.lvlN.textContent = String(l);
    if (l >= MAX_LEVEL) { this.el.lvlFill.style.width = '100%'; this.el.lvlTo.textContent = 'poziom maksymalny'; this.el.lvlNext.textContent = ''; return; }
    const a = LEVELS[l - 1], b = LEVELS[l];
    this.el.lvlFill.style.width = `${Math.min(100, ((earned - a) / (b - a)) * 100).toFixed(1)}%`;
    this.el.lvlTo.textContent = `do poziomu ${l + 1}`;
    this.el.lvlNext.textContent = fmtZl(b - earned, 0);
  }

  setWeather(w, night) {
    const W = WEATHERS[w.id] || WEATHERS.clear;
    const key = w.id === 'clear' ? (night ? 'night' : 'sun') : W.icon;
    if (key !== this.lastW) { this.el.wIcon.innerHTML = ICONS[key] || ICONS.sun; this.lastW = key; }
    this.el.wName.textContent = w.id === 'clear' ? (night ? 'Noc' : 'Pogodnie') : W.name;
    this.el.wLeft.textContent = w.id === 'clear' ? '' : `· ${fmtTime(w.left)}`;
    const t = W.trait ? TRAIT_BY_ID[W.trait] : null;
    this.el.wTrait.textContent = t ? `ryby na dworze: ${t.name} ×${String(t.m).replace('.', ',')}` : W.boost ? `więcej ryb ${VARIANTS[W.boost.variant].name.toLowerCase()}ch przy spawnie` : '';
  }

  frame(dt) {
    if (this.cashShown !== this.cashTarget) {
      const d = this.cashTarget - this.cashShown;
      this.cashShown = Math.abs(d) < 0.01 ? this.cashTarget : this.cashShown + d * Math.min(1, dt * 9);
      this.el.cashN.textContent = fmtZl(this.cashShown);
    }
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.el.banner.classList.remove('on');
    }
  }

  bump() {
    const t = this.el.ticket;
    t.classList.remove('bump');
    void t.offsetWidth;
    t.classList.add('bump');
  }

  prompt(html) {
    if (html === this.lastPrompt) return;
    this.lastPrompt = html;
    this.el.prompt.innerHTML = html;
  }

  hot(on) { this.el.cross.classList.toggle('hot', !!on); }

  toast(text, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast paper ' + kind;
    d.textContent = text;
    this.el.toasts.prepend(d);
    while (this.el.toasts.children.length > 5) this.el.toasts.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 3800);
    setTimeout(() => d.remove(), 4300);
  }

  banner(big, small = '', t = 2.6) {
    this.el.banner.innerHTML = `<div class="bs"><b>${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div>`;
    this.el.banner.classList.add('on');
    this.bannerT = t;
  }

  setFull(on) { this.el.full.classList.toggle('hidden', !on); }

  hotbar(slots, sel, wh, icons) {
    for (let i = 0; i < 9; i++) {
      const s = this.slots[i];
      const t = slots[i];
      const key = `${t}|${t ? wh[t] || 0 : ''}|${i === sel}`;
      if (this.slotKey[i] === key) continue;
      this.slotKey[i] = key;
      s.classList.toggle('on', i === sel);
      s.classList.toggle('empty', i > 0 && !t && i !== sel);
      if (i === 0) { s.innerHTML = `<span class="k">1</span>${ICONS.hand}`; continue; }
      if (!t) { s.innerHTML = `<span class="k">${i + 1}</span>`; continue; }
      const n = wh[t] || 0;
      s.innerHTML = `<span class="k">${i + 1}</span><img src="${icons.block(t)}" alt=""><span class="n ${n ? '' : 'zero'}">×${n}</span>`;
    }
  }

  buildHint(def, free) {
    if (!def) { if (this.lastHint) { this.el.hint.innerHTML = ''; this.lastHint = ''; } return; }
    const undo = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z';
    const html = `${esc(def.name)} &nbsp; <kbd>LPM</kbd>postaw <kbd>PPM</kbd>zdejmij <kbd>R</kbd>obróć <kbd>Alt</kbd>${free ? 'swobodnie: tak' : 'swobodnie'} <kbd>${undo}</kbd>cofnij`;
    if (html !== this.lastHint) { this.el.hint.innerHTML = html; this.lastHint = html; }
  }

  stack(stack, cap, mult) {
    let slots = 0, val = 0;
    for (const f of stack) { slots += slotsOf(f); val += fishValue(f, mult); }
    const shown = Math.min(cap, 20);
    let html = '';
    for (let i = 0; i < shown; i++) html += `<i class="${i < Math.min(slots, shown) ? 'on' : ''}"></i>`;
    if (html !== this.lastStackHtml) { this.el.stackIcons.innerHTML = html; this.lastStackHtml = html; }
    this.el.stackN.textContent = `STOS ${slots}/${cap}`;
    this.el.stackV.textContent = val > 0 ? fmtZl(val) : '';
  }

  fishLabel(f, mult, sx, sy) {
    const el = this.el.label;
    if (!f) { if (this.lastLabel) { el.classList.add('hidden'); this.lastLabel = ''; } return; }
    const S = SPECIES[f.sp];
    const R = RARITIES[S.rarity];
    const v = fishValue(f, mult);
    const fresh = Math.round(Math.max(0.5, 1 - 0.002 * (f.dry || 0)) * 100);
    const key = `${f.id}|${f.tr.join('.')}|${f.v}|${Math.round(v * 100)}|${fresh}|${f.cold > 0}|${f.wet}|${f.onIce}`;
    if (key !== this.lastLabel) {
      this.lastLabel = key;
      const chips = [];
      if (f.v) chips.push(`<span class="chip v${f.v}">${VARIANTS[f.v].name} ×${VARIANTS[f.v].m}</span>`);
      for (const i of f.tr) chips.push(`<span class="chip">${esc(TRAITS[i].name)}${TRAITS[i].m !== 1 ? ` ×${String(TRAITS[i].m).replace('.', ',')}` : ''}</span>`);
      if (f.up) chips.push(`<span class="chip up">+${Math.round(f.up * 100)}% z maszyn</span>`);
      const state = f.cold > 0 ? 'zimna' : f.wet ? 'w wodzie' : f.onIce ? 'na lodzie' : `${fresh}%`;
      el.style.setProperty('--rc', R.color);
      const img = this.icons ? `<img src="${this.icons.fish(f.sp)}" alt="">` : '<span></span>';
      el.innerHTML = `${img}<div><div class="nm">${esc(S.name)}</div><div class="lat">${esc(S.latin || 'gatunek nieopisany')}</div><div class="rar">${R.name}</div></div><div class="val"><span>${fmtKg(f.w)} · ${state}</span><b>${fmtZl(v)}</b></div>${chips.length ? `<div class="tr">${chips.join('')}</div>` : ''}`;
      el.classList.remove('hidden');
    }
    const w = 300, h = el.offsetHeight || 150;
    let x = sx + 36, y = sy - h * 0.5;
    if (x + w > innerWidth - 12) x = sx - 36 - w;
    y = Math.max(150, Math.min(innerHeight - h - 150, y));
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(-1deg)`;
  }

  fps(text) {
    this.el.fps.textContent = text;
  }
}

export function blockName(t) { return BLOCK_BY_ID[t] ? BLOCK_BY_ID[t].name : t; }
