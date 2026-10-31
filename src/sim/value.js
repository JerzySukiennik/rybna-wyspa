// Rybna Wyspa: fish price formula and spawn rolls shared by the simulation and the UI.

import { SPECIES, RARITIES } from '../data/species.js';
import { TRAITS, TRAIT_BY_ID, VARIANTS, SPAWN_TRAITS } from '../data/traits.js';
import { WEATHERS, SPAWN_TRAIT_CHANCE } from '../data/weather.js';

export const DECAY_RATE = 0.002;
export const FRESH_MIN = 0.5;

export function freshness(f) {
  return Math.max(FRESH_MIN, 1 - DECAY_RATE * (f.dry || 0));
}

export function traitBonus(f) {
  let b = f.up || 0;
  for (const t of f.tr) b += TRAITS[t].m - 1;
  return b;
}

export function fishValue(f, mult = 1) {
  const sp = SPECIES[f.sp];
  const base = sp.price * (f.w / sp.kg);
  return base * Math.max(0.2, 1 + traitBonus(f)) * VARIANTS[f.v].m * freshness(f) * mult;
}

export function fishLength(f) {
  const sp = SPECIES[f.sp];
  return sp.len * Math.cbrt(f.w / sp.kg);
}

export function bodyLength(f) {
  const L = fishLength(f);
  const t = Math.min(1, Math.max(0, (L - 0.25) / 0.65));
  return L * (1 + 0.45 * (1 - t * t * (3 - 2 * t)));
}

export function fatOf(f) {
  let k = 1;
  for (const t of f.tr) k *= TRAITS[t].fat;
  return k;
}

export function slotsOf(f) {
  const L = fishLength(f);
  return L < 0.45 ? 1 : L < 0.8 ? 2 : L < 1.5 ? 3 : L < 2.6 ? 5 : 99;
}

export function hasTrait(f, id) {
  return f.tr.includes(TRAIT_BY_ID[id].idx);
}

export function addTrait(f, id) {
  const t = TRAIT_BY_ID[id];
  if (!t || f.tr.includes(t.idx)) return false;
  if (SPECIES[f.sp].special === 'fire' && ['zamrozona', 'ice', 'oszroniona', 'sniezna'].includes(id)) return false;
  if (t.grp) {
    const same = f.tr.find((i) => TRAITS[i].grp === t.grp);
    if (same !== undefined) {
      if (TRAITS[same].m >= t.m) return false;
      f.tr = f.tr.filter((i) => i !== same);
    }
  }
  f.tr.push(t.idx);
  f.tr.sort((a, b) => a - b);
  return true;
}

const BY_RARITY = RARITIES.map((_, r) => SPECIES.filter((s) => s.rarity === r).map((s) => s.idx));
const SECRET_W = { rakieta: 1, ognista: 1, wydrukowana: 1, gmicro: 1, zloty_sum: 0.6, potwor: 0.35 };

function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function rollFish(def, rand, { luck = 1, weather = 'clear', night = false } = {}) {
  let sp;
  if (def.secret && rand() < def.secret * luck) {
    const ids = BY_RARITY[6];
    const tot = ids.reduce((a, i) => a + SECRET_W[SPECIES[i].id], 0);
    let x = rand() * tot;
    sp = ids.find((i) => (x -= SECRET_W[SPECIES[i].id]) <= 0) ?? ids[0];
  } else {
    const w = def.w;
    let tot = 0;
    for (let i = 0; i < w.length; i++) tot += w[i];
    let x = rand() * tot, r = 0;
    for (; r < w.length; r++) { x -= w[r]; if (x <= 0) break; }
    r = Math.min(r, 5);
    const list = BY_RARITY[r];
    sp = list[Math.floor(rand() * list.length)];
  }
  const S = SPECIES[sp];
  const f = { sp, w: 0, v: 0, tr: [], up: 0, ups: [], dry: 0, cold: 0, iceT: 0 };
  const wb = WEATHERS[weather] || WEATHERS.clear;
  const boostV = wb.boost ? wb.boost.variant : 0, boostK = wb.boost ? wb.boost.k : 1;
  const vr = rand();
  const cR = VARIANTS[3].chance * luck * (boostV === 3 ? boostK : 1);
  const cG = VARIANTS[2].chance * luck * (boostV === 2 ? boostK : 1);
  const cS = VARIANTS[1].chance * luck;
  if (vr < cR) f.v = 3; else if (vr < cR + cG) f.v = 2; else if (vr < cR + cG + cS) f.v = 1;
  for (const t of SPAWN_TRAITS) {
    if (t.night && !night) continue;
    if (rand() < t.spawn * luck) addTrait(f, t.id);
  }
  if (wb.trait && rand() < SPAWN_TRAIT_CHANCE * luck) addTrait(f, wb.trait);
  let k = Math.exp(gauss(rand) * 0.22);
  k = Math.min(1.8, Math.max(0.55, k));
  if (hasTrait(f, 'mini')) k *= 0.343;
  if (hasTrait(f, 'gigant')) k *= 3.05;
  if (hasTrait(f, 'kolos')) k *= 6.86;
  f.w = S.kg * k;
  return f;
}

export function rarityOf(f) {
  return RARITIES[SPECIES[f.sp].rarity];
}
