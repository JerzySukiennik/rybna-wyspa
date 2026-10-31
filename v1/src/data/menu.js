// Rybna Wyspa: the fish fry's "danie dnia", the same for everyone on a farm (two common or uncommon species and one rare or epic, new every 10 minutes).

import { SPECIES } from './species.js';

export const MENU_SLOT = 600;
export const MENU_MULT = 2;

const LOW = SPECIES.map((s, i) => (s.rarity <= 1 ? i : -1)).filter((i) => i >= 0);
const MID = SPECIES.map((s, i) => (s.rarity === 2 || s.rarity === 3 ? i : -1)).filter((i) => i >= 0);

function hash(n) {
  let x = (n | 0) ^ 0x5bd1e995;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

export function menuAt(tSec, seed = 0) {
  const slot = Math.floor(tSec / MENU_SLOT);
  const pick = (list, k, avoid) => {
    let i = Math.floor(hash(slot * 7907 + seed * 131 + k * 17) * list.length);
    while (avoid.includes(list[i])) i = (i + 1) % list.length;
    return list[i];
  };
  const a = pick(LOW, 1, []);
  const b = pick(LOW, 2, [a]);
  const c = pick(MID, 3, []);
  return { slot, sp: [a, b, c], left: (slot + 1) * MENU_SLOT - tSec };
}
