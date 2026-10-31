// Rybna Wyspa: farm upgrades, farm levels, quests and rebirth.

export const UPGRADES = [
  { id: 'stos', name: 'Większy stos', desc: 'Ile ryb mieści się w rękach.', vals: [3, 5, 8, 12, 16, 20, 25, 30, 40, 50], cost: [0, 60, 250, 900, 3200, 12000, 45000, 180000, 800000, 4e6], fmt: (v) => `${v} ryb` },
  { id: 'bieg', name: 'Szybkie nogi', desc: 'Szybsze chodzenie i sprint.', vals: [1, 1.12, 1.24, 1.36, 1.5, 1.65, 1.8], cost: [0, 120, 600, 3000, 16000, 90000, 500000], fmt: (v) => `×${v.toFixed(2)}` },
  { id: 'magnes', name: 'Magnes', desc: 'Ryby w promieniu same lecą do rąk.', vals: [0, 1.6, 2.6, 3.6, 5, 7, 9], cost: [0, 400, 2200, 11000, 60000, 350000, 2e6], fmt: (v) => (v ? `${v} m` : 'brak') },
  { id: 'skok', name: 'Wysoki skok', desc: 'Wyżej skaczesz.', vals: [1, 1.18, 1.36, 1.55, 1.75], cost: [0, 200, 1500, 9000, 60000], fmt: (v) => `×${v.toFixed(2)}` },
  { id: 'podwojny', name: 'Podwójny skok', desc: 'Drugi skok w powietrzu.', vals: [0, 1], cost: [0, 5000], fmt: (v) => (v ? 'tak' : 'nie') },
  { id: 'jetpack', name: 'Plecak odrzutowy', desc: 'Trzymaj spację w powietrzu.', vals: [0, 1.2, 2.4, 4], cost: [0, 40000, 300000, 2.5e6], fmt: (v) => (v ? `${v} s paliwa` : 'brak') },
  { id: 'zasieg', name: 'Długie ręce', desc: 'Zasięg łapania i budowania.', vals: [4.5, 6, 7.5, 9.5], cost: [0, 300, 4000, 50000], fmt: (v) => `${v} m` },
  { id: 'rzut', name: 'Mocny rzut', desc: 'Dalej rzucasz rybami.', vals: [1, 1.3, 1.6, 2], cost: [0, 150, 2500, 30000], fmt: (v) => `×${v.toFixed(1)}` },
  { id: 'lodowka', name: 'Lodówka w rękach', desc: 'Ryby w stosie się nie psują.', vals: [0, 1], cost: [0, 25000], fmt: (v) => (v ? 'tak' : 'nie') },
  { id: 'szczescie', name: 'Szczęście farmy', desc: 'Większa szansa na warianty i traity.', vals: [1, 1.15, 1.32, 1.52, 1.75, 2, 2.3, 2.65, 3], cost: [0, 800, 6000, 40000, 250000, 1.6e6, 1e7, 6.5e7, 4e8], fmt: (v) => `×${v.toFixed(2)}` },
  { id: 'tempo', name: 'Szybsze spawnery', desc: 'Automaty łowią częściej.', vals: [1, 0.93, 0.86, 0.8, 0.74, 0.69, 0.64, 0.6], cost: [0, 1500, 12000, 90000, 650000, 4.5e6, 3e7, 2e8], fmt: (v) => `${Math.round((1 / v - 1) * 100)}% szybciej` },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function upVal(up, id) {
  const u = UPGRADE_BY_ID[id];
  const l = Math.max(0, Math.min(u.vals.length - 1, (up && up[id]) || 0));
  return u.vals[l];
}

export const LEVELS = [0, 300, 1500, 6000, 25000, 1e5, 4e5, 1.6e6, 6.5e6, 2.6e7, 1e8, 4e8, 1.6e9, 6.5e9, 2.6e10, 1e11, 4e11, 1.6e12, 6.5e12, 2.6e13];

export function levelOf(earned) {
  let l = 1;
  for (let i = 1; i < LEVELS.length; i++) if (earned >= LEVELS[i]) l = i + 1;
  return l;
}

export const MAX_LEVEL = LEVELS.length;
export const REBIRTH_LEVEL = 10;
export const REBIRTH_MULT = 1.5;
export const START_CASH = 150;

const ryb = (n) => (n === 1 ? 'rybę' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'ryby' : 'ryb');
const rar = (r, n) => (n === 1 ? r.replace(/a$/, 'ą') : r.replace(/a$/, n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'e' : 'ych'));

export const QUEST_KINDS = [
  { id: 'sell_n', text: (q) => `Sprzedaj ${q.n} ${ryb(q.n)}` },
  { id: 'sell_sp', text: (q, sp) => `Sprzedaj ${q.n} × ${sp}` },
  { id: 'sell_rar', text: (q, sp, r) => `Sprzedaj ${q.n} ${ryb(q.n)} rzadkości ${r.replace(/a$/, 'ej')} lub wyższej` },
  { id: 'sell_trait', text: (q) => `Sprzedaj ${q.n} ${ryb(q.n)} z dowolnym traitem` },
  { id: 'sell_var', text: (q) => `Sprzedaj ${q.n} ${ryb(q.n)} ${rar('srebrna', q.n)}, ${rar('złota', q.n)} albo ${rar('tęczowa', q.n)}` },
  { id: 'earn', text: (q, sp, rar, fmt) => `Zarób ${fmt(q.n)}` },
  { id: 'big', text: (q, sp, rar, fmt) => `Sprzedaj jedną rybę za ${fmt(q.n)} lub więcej` },
];
