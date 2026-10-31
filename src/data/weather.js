// Rybna Wyspa: day/night cycle and the deterministic weather schedule shared by everyone on a farm.

export const DAY_LEN = 1440;
export const NIGHT_FROM = 0.7;
export const SLOT = 300;

export const WEATHERS = {
  clear: { name: 'Pogodnie', icon: 'sun', trait: null },
  deszcz: { name: 'Deszcz', icon: 'rain', trait: 'mokra', w: 16, day: 1, night: 1 },
  burza: { name: 'Burza', icon: 'storm', trait: 'elektryczna', w: 6, day: 1, night: 1 },
  mgla: { name: 'Mgła nad Narwią', icon: 'fog', trait: 'widmowa', w: 8, day: 1, night: 1 },
  wichura: { name: 'Wichura', icon: 'wind', trait: 'wietrzna', w: 8, day: 1, night: 1 },
  upal: { name: 'Upał', icon: 'heat', trait: 'sloneczna', w: 9, day: 1 },
  mroz: { name: 'Mróz', icon: 'frost', trait: 'oszroniona', w: 6, day: 1, night: 1 },
  sniezyca: { name: 'Śnieżyca', icon: 'snow', trait: 'sniezna', w: 4, day: 1, night: 1 },
  pelnia: { name: 'Pełnia', icon: 'moon', trait: 'ksiezycowa', w: 14, night: 1 },
  meteory: { name: 'Deszcz meteorów', icon: 'meteor', trait: 'kosmiczna', w: 6, night: 1 },
  zorza: { name: 'Zorza polarna', icon: 'aurora', trait: 'zorzowa', w: 2.5, night: 1 },
  krwawy: { name: 'Krwawy Księżyc', icon: 'bloodmoon', trait: 'krwawa', w: 1.2, night: 1 },
  tecza: { name: 'Tęcza', icon: 'rainbow', trait: null, boost: { variant: 3, k: 6 } },
  zlota: { name: 'Złota godzina', icon: 'gold', trait: null, boost: { variant: 2, k: 4 }, w: 3, day: 1 },
};

export const SPAWN_TRAIT_CHANCE = 0.18;
export const EXPOSE_EVERY = 8;
export const EXPOSE_CHANCE = 0.035;

function hash(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function dayPhase(tSec, seed = 0) {
  const p = ((tSec + seed * 97) % DAY_LEN + DAY_LEN) % DAY_LEN;
  return p / DAY_LEN;
}

export function isNight(phase) { return phase >= NIGHT_FROM; }

function pick(slot, seed, night) {
  const r = hash(slot * 7919 + seed * 31);
  if (r < 0.5) return 'clear';
  let tot = 0;
  const list = [];
  for (const [id, w] of Object.entries(WEATHERS)) {
    if (!w.w) continue;
    if (night ? !w.night : !w.day) continue;
    tot += w.w;
    list.push([id, w.w]);
  }
  let x = hash(slot * 104729 + seed * 13 + 5) * tot;
  for (const [id, w] of list) { if ((x -= w) <= 0) return id; }
  return 'clear';
}

export function weatherAt(tSec, seed = 0) {
  const slot = Math.floor(tSec / SLOT);
  const into = tSec - slot * SLOT;
  const mid = slot * SLOT + SLOT * 0.5;
  const night = isNight(dayPhase(mid, seed));
  let id = pick(slot, seed, night);
  const len = 150 + Math.floor(hash(slot * 31 + seed) * 120);
  if (id === 'clear') {
    const prev = pick(slot - 1, seed, isNight(dayPhase(mid - SLOT, seed)));
    if ((prev === 'deszcz' || prev === 'burza') && !night && hash(slot * 17 + seed * 3) < 0.45) {
      return into < 100 ? { id: 'tecza', left: 100 - into, len: 100 } : { id: 'clear', left: SLOT - into, len: SLOT };
    }
    return { id: 'clear', left: SLOT - into, len: SLOT };
  }
  if (into < len) return { id, left: len - into, len };
  return { id: 'clear', left: SLOT - into, len: SLOT - len };
}
