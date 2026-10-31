// Rybna Wyspa: shared helpers (Polish money formatting, seeded RNG, small math).

const UNITS = [[1e18, 'tld'], [1e15, 'bld'], [1e12, 'bln'], [1e9, 'mld'], [1e6, 'mln'], [1e4, 'tys.']];

function group(int) {
  return String(int).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function fmtNum(v, dec = 2) {
  const neg = v < 0;
  v = Math.abs(v);
  for (const [d, u] of UNITS) {
    if (v >= d) {
      const x = v / (u === 'tys.' ? 1e3 : d);
      const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
      return (neg ? '-' : '') + s.replace('.', ',') + ' ' + u;
    }
  }
  const fixed = v.toFixed(dec);
  const [i, f] = fixed.split('.');
  return (neg ? '-' : '') + group(i) + (f ? ',' + f : '');
}

export function fmtZl(v, dec = 2) {
  return fmtNum(v, v >= 1000 ? 0 : dec) + ' zł';
}

export function fmtKg(kg) {
  if (kg < 1) return Math.round(kg * 1000) + ' g';
  return kg.toFixed(kg < 10 ? 2 : 1).replace('.', ',') + ' kg';
}

export function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}:${String(r).padStart(2, '0')}` : `${r} s`;
}

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 4, s = 0) {
  let t = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { t += a * noise2(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return t / n;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function randId(n = 6) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += abc[buf[i] % abc.length];
  return s;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
