// Rybna Wyspa: low-poly decorations of the Narew bank (trees, reeds, rocks, lily, boat, pier) as vertex-coloured geometry.
import { Soup, tube, blob, hexa, C, shade, mixC, hh, norm, add, mul, sub } from './soup.js';

export const DECO_IDS = ['willow', 'willow_weeping', 'birch', 'alder', 'alder_row', 'pine', 'bush', 'reeds', 'cattail', 'rock_s', 'rock_m', 'rock_l', 'grass', 'flowers', 'log', 'stump', 'lily', 'boat', 'pier'];

const cache = new Map();
const pick = (pal, h) => pal[Math.floor(h * pal.length) % pal.length];

function leafCol(pal, m, w, i, seed, shadeLow = 0.2) {
  const up = norm(w)[1];
  return pick(pal, hh(i, seed, 3)).clone().multiplyScalar(1 - shadeLow + shadeLow * (up * 0.5 + 0.5) + (hh(i, seed, 9) - 0.5) * 0.08);
}

function bark(pal, seed) {
  return (i, j) => pick(pal, hh(i * 13 + j, seed, 5)).clone().multiplyScalar(0.94 + hh(j, i, seed) * 0.12);
}

function bend(pts, k) {
  return pts.map((p, i) => [p[0] + k[0] * i * i, p[1], p[2] + k[1] * i * i]);
}

function blade(S, base, dir, side, len, w, col, tipCol, segs = 2) {
  const pts = [];
  let d = norm(dir);
  let p = base;
  for (let i = 0; i <= segs; i++) {
    pts.push(p);
    p = add(p, mul(d, len / segs));
    d = norm(add(d, [0, -0.35 / segs, 0]));
  }
  const s = norm(side);
  for (let i = 0; i < segs; i++) {
    const w0 = w * (1 - i / segs), w1 = w * (1 - (i + 1) / segs);
    const a = add(pts[i], mul(s, -w0)), b = add(pts[i], mul(s, w0)), c = add(pts[i + 1], mul(s, w1)), e = add(pts[i + 1], mul(s, -w1));
    const n = norm([s[1] * d[2] - s[2] * d[1], s[2] * d[0] - s[0] * d[2], s[0] * d[1] - s[1] * d[0]]);
    const col0 = mixC(col, tipCol, i / segs);
    for (const sg of [1, -1]) {
      if (w1 > 1e-5) S.quad(a, b, c, e, col0, 0, mul(n, sg));
      else S.tri(a, b, c, col0, 0, mul(n, sg));
    }
  }
  return pts[pts.length - 1];
}

function tri2(S, a, b, c, col) {
  const n = norm([(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]);
  S.tri(a, b, c, col, 0, n);
  S.tri(a, c, b, col, 0, mul(n, -1));
}

function ribbon(S, pts, widths, side, colFn) {
  const sd = norm(side);
  for (let i = 0; i < pts.length - 1; i++) {
    const d = norm(sub(pts[i + 1], pts[i]));
    const n = norm([sd[1] * d[2] - sd[2] * d[1], sd[2] * d[0] - sd[0] * d[2], sd[0] * d[1] - sd[1] * d[0]]);
    const a = add(pts[i], mul(sd, -widths[i] / 2)), b = add(pts[i], mul(sd, widths[i] / 2));
    const c = add(pts[i + 1], mul(sd, widths[i + 1] / 2)), e = add(pts[i + 1], mul(sd, -widths[i + 1] / 2));
    const col = colFn(i);
    for (const sg of [1, -1]) {
      if (widths[i + 1] > 1e-5) S.quad(a, b, c, e, col, 0, mul(n, sg));
      else S.tri(a, b, c, col, 0, mul(n, sg));
    }
  }
}

function willow() {
  const S = new Soup();
  const barkC = (i, j) => pick([C('#6a6052'), C('#5c5347'), C('#776b5a')], hh(i * 13 + j, 1, 5)).clone().multiplyScalar(0.92 + 0.16 * hh(j, i, 3));
  const trunk = [[0, 0, 0], [0.05, 0.6, 0.03], [0.12, 1.3, 0.06], [0.16, 1.95, 0.07], [0.18, 2.3, 0.08]];
  tube(S, trunk, [0.52, 0.4, 0.36, 0.38, 0.44], 8, barkC, 0, 0, { twist: 0.3 });
  const head = [0.18, 2.42, 0.08];
  const knobs = [[0, 0.05, 0, 0.5, 0.32, 0.48], [0.3, 0.12, 0.18, 0.26, 0.22, 0.24], [-0.28, 0.1, -0.12, 0.25, 0.2, 0.26], [0.05, 0.16, -0.32, 0.24, 0.2, 0.22]];
  knobs.forEach(([x, y, z, rx, ry, rz], k) => blob(S, add(head, [x, y, z]), [rx, ry, rz], 0, (m, w, i) => pick([C('#6e6354'), C('#5f5648'), C('#7a6e5c')], hh(i, k, 4)), { jitter: 0.3, seed: 2 + k }));
  const twig = [C('#8a8650'), C('#93844e'), C('#7e7a48'), C('#8e6e4a')];
  const leaf = [C('#9aaa86'), C('#8c9c78'), C('#a8b694'), C('#82946e')];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996 + 0.3, rr = Math.sqrt((i + 0.5) / N);
    const p0 = add(head, [Math.cos(a) * rr * 0.36, 0.2 - rr * 0.08, Math.sin(a) * rr * 0.34]);
    const tilt = 0.06 + rr * 0.6 + (hh(i, 3, 9) - 0.5) * 0.14;
    const d = norm([Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)]);
    const L = 2.7 + 1.0 * hh(i, 5, 9) - rr * 0.5;
    const tc = pick(twig, hh(i, 7, 9));
    tube(S, [p0, add(p0, mul(d, L * 0.5)), add(p0, mul(d, L))], [0.034, 0.02, 0], 3, tc, 0, 0);
    const s1 = norm([-d[2], 0, d[0]].map((v, k) => v + (k === 1 ? 0.0001 : 0)));
    const s2 = norm([d[1] * s1[2] - d[2] * s1[1], d[2] * s1[0] - d[0] * s1[2], d[0] * s1[1] - d[1] * s1[0]]);
    const lc = pick(leaf, hh(i, 11, 9)), lc2 = pick(leaf, hh(i, 13, 9));
    const fp = [0.12, 0.55, 1.02].map((f) => add(p0, mul(d, L * f)));
    ribbon(S, fp, [0.12, 0.26, 0.1], s1, (k) => (k ? lc : shade(lc, 0.88)));
    ribbon(S, fp, [0.1, 0.24, 0.09], s2, (k) => (k ? lc2 : shade(lc2, 0.9)));
  }
  return S;
}

function willowWeeping() {
  const S = new Soup();
  const barkC = (i, j) => pick([C('#5e554a'), C('#6a5f52'), C('#53493f')], hh(i * 7 + j, 2, 6)).clone().multiplyScalar(0.92 + 0.16 * hh(j, i, 4));
  tube(S, [[0, 0, 0], [0.04, 0.9, 0.02], [0.1, 1.8, 0.05], [0.14, 2.3, 0.06]], [0.46, 0.36, 0.33, 0.34], 8, barkC, 0, 0, { twist: 0.2 });
  const base = [0.14, 2.25, 0.06];
  const limbs = [[0.4, 2.2, 1.0], [2.5, 2.4, 0.9], [4.4, 2.1, 1.05], [1.4, 1.2, 1.25]];
  const tops = [];
  for (const [a, out, up] of limbs) {
    const d = [Math.cos(a), 0, Math.sin(a)];
    const p1 = add(base, add(mul(d, out * 0.35), [0, up * 1.5, 0]));
    const p2 = add(base, add(mul(d, out * 0.8), [0, up * 2.9, 0]));
    const p3 = add(base, add(mul(d, out), [0, up * 3.35, 0]));
    tube(S, [base, p1, p2, p3], [0.2, 0.14, 0.09, 0.05], 6, barkC, 0, 0);
    tops.push(p3);
  }
  const pal = [C('#a4b06c'), C('#96a45e'), C('#b2bc7e'), C('#8a9a58')];
  const crownY = 5.9;
  blob(S, [0.2, crownY - 0.15, 0.05], [2.5, 0.75, 2.4], 1, (m, w, i) => leafCol(pal, m, w, i, 41, 0.25), { jitter: 0.18, seed: 41, flatBottom: -0.2 });
  const ring = (n, R, y0, len, seed) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (hh(i, 1, seed) - 0.5) * 0.25;
      const r = R * (0.88 + 0.24 * hh(i, 2, seed));
      const out = [Math.cos(a), 0, Math.sin(a)];
      const side = [-Math.sin(a), 0, Math.cos(a)];
      const top = [0.2 + out[0] * r, y0 - 0.25 * (r / R) ** 2 + 0.3 * hh(i, 3, seed), 0.05 + out[2] * r];
      const L = len * (0.8 + 0.35 * hh(i, 4, seed));
      const sway = (hh(i, 5, seed) - 0.5) * 0.5;
      const pts = [0, 0.25, 0.55, 0.82, 1].map((f) => add(top, add(mul(out, 0.55 * Math.sin(f * 2.2)), add(mul(side, sway * f * f), [0, -L * f, 0]))));
      const w = 0.34 + 0.12 * hh(i, 6, seed);
      const c = pick(pal, hh(i, 7, seed));
      ribbon(S, pts, [w, w * 1.1, w * 0.9, w * 0.55, 0], side, (k) => mixC(c, C('#c4ca90'), k * 0.12).multiplyScalar(1 - (k === 0 ? 0.08 : 0)));
    }
  };
  ring(30, 2.85, crownY, 4.3, 7);
  ring(14, 1.7, crownY + 0.35, 3.2, 8);
  return S;
}

function birch() {
  const S = new Soup();
  const white = C('#e6e2d8'), black = C('#2a2722'), grey = C('#c4beb2');
  const col = (i, j) => {
    if (i < 2) return hh(i * 9 + j, 1, 2) < 0.55 + (1 - i) * 0.3 ? black : shade(grey, 0.72);
    const h = hh(i * 7 + j, 3, 11);
    return h < 0.2 ? black : h < 0.32 ? grey : white.clone().multiplyScalar(0.96 + 0.06 * hh(j, i, 5));
  };
  const pts = [];
  for (let i = 0; i <= 9; i++) pts.push([0.18 * Math.sin(i * 0.45) * (i / 9), i * 0.86, 0.1 * (i / 9) ** 2]);
  tube(S, pts, pts.map((_, i) => 0.17 * (1 - i / 10.5) + 0.012), 6, col, 0, 0);
  const brC = (i, j) => (hh(i, j, 4) < 0.25 ? black : shade(white, 0.88));
  const pal = [C('#93b468'), C('#a2c076'), C('#86a85e'), C('#acc684')];
  const hang = [C('#9cba70'), C('#8eae64')];
  const branches = [[3.4, 0.4, 1.7, 0.55], [4.1, 2.5, 1.6, 0.6], [4.8, 4.3, 1.5, 0.65], [5.5, 1.5, 1.3, 0.75], [6.2, 3.4, 1.1, 0.8], [6.9, 5.4, 0.9, 0.9]];
  branches.forEach(([y, a, l, up], n) => {
    const k = Math.min(8, Math.floor(y / 0.86));
    const p0 = vl(pts[k], pts[k + 1], y / 0.86 - k);
    const d = norm([Math.cos(a), up, Math.sin(a)]);
    const p1 = add(p0, mul(d, l * 0.6));
    const p2 = add(p1, mul(norm(add(d, [0, -0.5, 0])), l * 0.5));
    tube(S, [p0, p1, p2], [0.055, 0.035, 0.012], 4, brC, 0, 0);
    const cc = add(p2, [0, 0.1, 0]);
    blob(S, cc, [1.0 - n * 0.05, 0.8, 0.95 - n * 0.05], 1, (m, w, i) => leafCol(pal, m, w, i, 50 + n, 0.25), { jitter: 0.32, seed: 50 + n });
    for (let t = 0; t < 3; t++) {
      const ang = a + (t - 1) * 0.9;
      const q = add(cc, [Math.cos(ang) * 0.5, -0.25, Math.sin(ang) * 0.5]);
      const side = [-Math.sin(ang), 0, Math.cos(ang)];
      const L = 1.1 + 0.6 * hh(n, t, 3);
      ribbon(S, [q, add(q, [Math.cos(ang) * 0.12, -L * 0.5, Math.sin(ang) * 0.12]), add(q, [Math.cos(ang) * 0.16, -L, Math.sin(ang) * 0.16])], [0.26, 0.2, 0], side, () => pick(hang, hh(n, t, 7)));
    }
  });
  blob(S, add(pts[9], [0, 0.3, 0]), [0.8, 0.95, 0.78], 1, (m, w, i) => leafCol(pal, m, w, i, 60, 0.22), { jitter: 0.3, seed: 60 });
  return S;
}

function vl(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function alderInto(S, o, sc, seed, full) {
  const barkC = bark([C('#4a4640'), C('#3f3c37'), C('#55504a')], 3 + seed);
  const P = (p) => [o[0] + p[0] * sc, o[1] + p[1] * sc, o[2] + p[2] * sc];
  const pts = bend([[0, 0, 0], [0, 1.4, 0], [0, 3.0, 0], [0, 4.6, 0], [0, 6.4, 0]], [0.01 * (hh(seed, 1) - 0.5), 0.01 * (hh(seed, 2) - 0.5)]).map(P);
  tube(S, pts, [0.25, 0.2, 0.16, 0.11, 0.05].map((r) => r * sc), full ? 7 : 6, barkC, 0, 0);
  if (full) {
    for (const [y, a] of [[2.6, 0.9], [3.3, 3.4], [4.0, 5.2]]) {
      const d = norm([Math.cos(a), 0.7, Math.sin(a)]);
      const p0 = P([0, y, 0]);
      tube(S, [p0, add(p0, mul(d, 0.8 * sc)), add(p0, mul(d, 1.4 * sc))], [0.07 * sc, 0.045 * sc, 0.02 * sc], 4, barkC, 0, 0);
    }
  }
  const pal = [C('#4e7238'), C('#587c40'), C('#466632'), C('#628446')];
  const puffs = [[0, 4.2, 0, 1.75, 1.6, 1.7], [0.15, 5.9, -0.1, 1.45, 1.4, 1.4], [-0.1, 7.2, 0.1, 0.95, 1.05, 0.95], [0.9, 3.4, 0.6, 1.0, 0.85, 0.95]];
  puffs.slice(0, full ? 4 : 3).forEach(([x, y, z, rx, ry, rz], k) => {
    const sd = 3 + k + seed * 10;
    blob(S, P([x, y, z]), [rx * sc, ry * sc, rz * sc], 1, (m, w, i) => leafCol(pal, m, w, i, sd, 0.3), { jitter: 0.17, seed: sd });
  });
}

function alder() {
  const S = new Soup();
  alderInto(S, [0, 0, 0], 1, 0, true);
  return S;
}

function alderRow() {
  const S = new Soup();
  alderInto(S, [-3.6, 0, 0.3], 0.92, 1, false);
  alderInto(S, [0, 0, -0.2], 1.06, 2, false);
  alderInto(S, [3.8, 0, 0.25], 0.84, 3, false);
  return S;
}

function pine() {
  const S = new Soup();
  const low = [C('#6a5444'), C('#5c4a3c')], high = [C('#c4743c'), C('#b8683a'), C('#cf8248')];
  const pts = bend([[0, 0, 0], [0, 1.6, 0], [0, 3.2, 0], [0, 4.8, 0], [0, 6.2, 0], [0, 7.4, 0], [0, 8.5, 0]], [0.02, 0.012]);
  tube(S, pts, [0.25, 0.2, 0.17, 0.145, 0.12, 0.09, 0.05], 7, (i, j) => (i < 2 ? pick(low, hh(i, j, 2)) : pick(high, hh(i, j, 3))).clone().multiplyScalar(0.95 + hh(j, i, 8) * 0.1), 0, 0);
  const brC = (i, j) => pick(high, hh(i, j, 6));
  const pal = [C('#3e5d3a'), C('#47693f'), C('#365234'), C('#4f7446')];
  const arms = [[5.7, 0.3, 1.9, 0.22, 1.35], [6.4, 2.4, 1.8, 0.3, 1.3], [7.0, 4.3, 1.6, 0.28, 1.2], [7.5, 1.3, 1.3, 0.4, 1.05]];
  arms.forEach(([y, a, l, up, sz], n) => {
    const d = norm([Math.cos(a), up, Math.sin(a)]);
    const p0 = [pts[4][0] * (y / 6.2), y, pts[4][2] * (y / 6.2)];
    const tip = add(p0, mul(d, l));
    tube(S, [p0, add(p0, mul(d, l * 0.5)), tip], [0.09, 0.065, 0.035], 4, brC, 0, 0);
    blob(S, add(tip, [-d[0] * 0.3, 0.2, -d[2] * 0.3]), [1.25 * sz, 0.62 * sz, 1.1 * sz], 1, (m, w, i) => leafCol(pal, m, w, i, 20 + n, 0.32), { jitter: 0.2, seed: 20 + n });
  });
  blob(S, [pts[6][0], 8.28, pts[6][2]], [1.35, 0.7, 1.25], 1, (m, w, i) => leafCol(pal, m, w, i, 30, 0.32), { jitter: 0.2, seed: 30 });
  return S;
}

function bush() {
  const S = new Soup();
  const pal = [C('#5c8c40'), C('#6a9a4a'), C('#527f3a'), C('#76a554')];
  const puffs = [[0, 0.55, 0, 0.75, 0.6, 0.7, 1], [0.55, 0.45, 0.25, 0.5, 0.45, 0.5, 2], [-0.5, 0.42, -0.2, 0.52, 0.42, 0.5, 3], [0.1, 0.4, -0.55, 0.48, 0.4, 0.45, 4], [-0.15, 0.95, 0.15, 0.45, 0.4, 0.45, 5]];
  for (const [x, y, z, rx, ry, rz, sd] of puffs) blob(S, [x, y, z], [rx, ry, rz], 0, (m, w, i) => leafCol(pal, m, w, i, sd, 0.3), { jitter: 0.14, seed: sd, flatBottom: -0.55 });
  return S;
}

function reeds() {
  const S = new Soup();
  const green = [C('#7c8c4c'), C('#8a9654'), C('#6f8044')], straw = [C('#b6a66c'), C('#a8986a'), C('#c2b27c')];
  const leaf = [C('#7a8e4c'), C('#889a58')], plume = [C('#6a5046'), C('#7a5c50'), C('#5e463c')];
  const N = 150;
  for (let i = 0; i < N; i++) {
    const rx = (hh(i, 1, 21) - 0.5) * 2, rz = (hh(i, 2, 21) - 0.5) * 2;
    const k = 1 - 0.35 * (rx * rx + rz * rz);
    const base = [rx * 1.5, 0, rz * 0.6];
    const h = (1.5 + 1.1 * hh(i, 3, 21)) * Math.max(0.6, k);
    const lean = [(hh(i, 4, 21) - 0.5) * 0.35 + rx * 0.12, 0, (hh(i, 5, 21) - 0.5) * 0.35 + rz * 0.1];
    const a = hh(i, 6, 21) * Math.PI;
    const w = 0.022 + 0.012 * hh(i, 7, 21);
    const b0 = add(base, [Math.cos(a) * w, 0, Math.sin(a) * w]), b1 = add(base, [-Math.cos(a) * w, 0, -Math.sin(a) * w]);
    const top = add(base, [lean[0] * h, h, lean[2] * h]);
    const col = hh(i, 8, 21) < 0.38 ? pick(straw, hh(i, 9, 21)) : pick(green, hh(i, 10, 21));
    tri2(S, b0, b1, top, col.clone().multiplyScalar(0.92 + 0.12 * hh(i, 11, 21)));
    if (i < 12) {
      const pd = norm([lean[0] + 0.3 * Math.cos(a), 1, lean[2] + 0.3 * Math.sin(a)]);
      const p0 = add(top, mul(pd, -0.06));
      tube(S, [p0, add(p0, mul(pd, 0.14)), add(p0, add(mul(pd, 0.3), [0.07 * Math.cos(a), -0.08, 0.07 * Math.sin(a)]))], [0.03, 0.05, 0], 3, pick(plume, hh(i, 12, 21)), 0, 0);
    }
    if (i % 4 === 0) {
      const la = a + 1.2;
      const lb = add(base, [0, h * (0.25 + 0.2 * hh(i, 13, 21)), 0]);
      const lt = add(lb, [Math.cos(la) * 0.55, 0.45 + 0.3 * hh(i, 14, 21), Math.sin(la) * 0.55]);
      const ls = [-Math.sin(la) * 0.03, 0, Math.cos(la) * 0.03];
      tri2(S, add(lb, ls), sub(lb, ls), lt, pick(leaf, hh(i, 15, 21)));
    }
  }
  return S;
}

function cattail() {
  const S = new Soup();
  const leaf = [C('#6f8a48'), C('#7c9652'), C('#66803f'), C('#8c9c5c')], head = C('#5c3c26'), stem = C('#7a9050');
  for (let i = 0; i < 80; i++) {
    const rx = (hh(i, 1, 31) - 0.5) * 2, rz = (hh(i, 2, 31) - 0.5) * 2;
    const base = [rx * 0.9, 0, rz * 0.45];
    const a = hh(i, 3, 31) * Math.PI;
    const h = 1.2 + 0.9 * hh(i, 4, 31);
    const out = 0.12 + 0.3 * hh(i, 5, 31);
    const lean = [Math.cos(a + 1.57) * out * Math.sign(rx + 0.01), 0, Math.sin(a + 1.57) * out];
    const w = 0.03 + 0.02 * hh(i, 6, 31);
    const b0 = add(base, [Math.cos(a) * w, 0, Math.sin(a) * w]), b1 = add(base, [-Math.cos(a) * w, 0, -Math.sin(a) * w]);
    const tip = add(base, [lean[0] * h, h, lean[2] * h]);
    const c = pick(leaf, hh(i, 7, 31)).clone().multiplyScalar(0.92 + 0.14 * hh(i, 8, 31));
    tri2(S, b0, b1, tip, c);
  }
  for (let i = 0; i < 11; i++) {
    const rx = (hh(i, 11, 31) - 0.5) * 1.4, rz = (hh(i, 12, 31) - 0.5) * 0.6;
    const base = [rx, 0, rz];
    const h = 1.5 + 0.45 * hh(i, 13, 31);
    const top = add(base, [(hh(i, 14, 31) - 0.5) * 0.25, h, (hh(i, 15, 31) - 0.5) * 0.2]);
    tri2(S, add(base, [0.012, 0, 0]), add(base, [-0.012, 0, 0]), top, stem);
    const hb = add(top, [0, -0.02, 0]);
    tube(S, [hb, add(hb, [0, 0.04, 0]), add(hb, [0, 0.24, 0])], [0.03, 0.044, 0.03], 5, head.clone().multiplyScalar(0.9 + 0.2 * hh(i, 16, 31)), 0, 0, { capStart: true, capEnd: true });
    tube(S, [add(hb, [0, 0.24, 0]), add(hb, [0, 0.4, 0])], [0.007, 0], 3, C('#9a8a5c'), 0, 0);
  }
  return S;
}

function rock(size, seed, parts) {
  const S = new Soup();
  const pal = [C('#8e8d86'), C('#9a9890'), C('#83827b'), C('#a3a198')];
  const moss = [C('#7d8a4e'), C('#6f7d46')];
  for (const [x, y, z, rx, ry, rz, det, sd] of parts) {
    blob(S, [x * size, y * size, z * size], [rx * size, ry * size, rz * size], det, (m, w, i) => {
      const up = norm(w)[1];
      const base = pick(pal, hh(i, sd, seed)).clone();
      if (size > 0.6 && up > 0.75 && hh(i, 3, seed) < 0.55) return pick(moss, hh(i, 4, seed)).clone();
      return base.multiplyScalar(0.86 + 0.22 * (up * 0.5 + 0.5));
    }, { jitter: 0.22, seed: sd + seed, flatBottom: -0.4 });
  }
  return S;
}

function grass() {
  const S = new Soup();
  const g = [C('#6fae48'), C('#7fbe56'), C('#64a040'), C('#8cc862')];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + hh(i, 1) * 0.6, r = 0.04 + 0.06 * hh(i, 2);
    const base = [Math.cos(a) * r, 0, Math.sin(a) * r];
    const out = 0.25 + 0.35 * hh(i, 3);
    blade(S, base, [Math.cos(a) * out, 1, Math.sin(a) * out], [-Math.sin(a), 0, Math.cos(a)], 0.32 + 0.2 * hh(i, 4), 0.022, pick(g, hh(i, 5)).clone().multiplyScalar(0.8), pick(g, hh(i, 6)), 2);
  }
  return S;
}

function flower(S, p, petals, col, mid, r, tilt) {
  const up = norm([Math.sin(tilt), 1, Math.cos(tilt) * 0.3]);
  const ref = Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const t1 = norm([ref[1] * up[2] - ref[2] * up[1], ref[2] * up[0] - ref[0] * up[2], ref[0] * up[1] - ref[1] * up[0]]);
  const t2 = [up[1] * t1[2] - up[2] * t1[1], up[2] * t1[0] - up[0] * t1[2], up[0] * t1[1] - up[1] * t1[0]];
  const ctr = add(p, mul(up, 0.012));
  for (let k = 0; k < petals; k++) {
    const a0 = (k / petals) * Math.PI * 2, a1 = ((k + 0.5) / petals) * Math.PI * 2, a2 = ((k + 1) / petals) * Math.PI * 2;
    const q = (a, rr) => add(p, add(mul(t1, Math.cos(a) * rr), mul(t2, Math.sin(a) * rr)));
    const tip = add(q(a1, r), mul(up, 0.01));
    for (const sg of [1, -1]) S.tri(q(a0, r * 0.35), q(a2, r * 0.35), tip, col, 0, mul(up, sg));
  }
  for (let k = 0; k < 5; k++) {
    const a0 = (k / 5) * Math.PI * 2, a1 = ((k + 1) / 5) * Math.PI * 2;
    S.tri(add(p, add(mul(t1, Math.cos(a0) * r * 0.36), mul(t2, Math.sin(a0) * r * 0.36))), add(p, add(mul(t1, Math.cos(a1) * r * 0.36), mul(t2, Math.sin(a1) * r * 0.36))), ctr, mid, 0, up);
  }
}

function flowers() {
  const S = new Soup();
  const stem = C('#5e8a3a');
  const list = [[0.06, 0.02, 0.36, '#f4f1e6', '#e8c23a', 8, 0.055], [-0.12, 0.07, 0.3, '#5a78d8', '#3c4c9a', 6, 0.05], [0.1, -0.12, 0.27, '#f2c43c', '#d89a20', 5, 0.04], [-0.05, -0.1, 0.4, '#f4f1e6', '#e8c23a', 8, 0.05]];
  list.forEach(([x, z, h, c, m, n, r], i) => {
    const top = [x * 1.4, h, z * 1.4];
    tube(S, [[x, 0, z], [x * 1.2, h * 0.5, z * 1.2], top], [0.008, 0.006, 0.005], 3, stem, 0, 0);
    flower(S, top, n, C(c), C(m), r, (hh(i, 3) - 0.5) * 0.8);
  });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    blade(S, [Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03], [Math.cos(a) * 0.8, 1, Math.sin(a) * 0.8], [-Math.sin(a), 0, Math.cos(a)], 0.16, 0.022, stem, shade(stem, 1.2), 1);
  }
  return S;
}

function log() {
  const S = new Soup();
  const barkC = bark([C('#5e4a36'), C('#6c5640'), C('#534130')], 7);
  const pts = [[-1.3, 0.21, 0], [-0.45, 0.22, 0.04], [0.45, 0.2, -0.02], [1.3, 0.18, 0.03]];
  const rings = tube(S, pts, [0.23, 0.22, 0.2, 0.18], 8, barkC, 0, 0, { twist: 0.4 });
  const wood = C('#c9a676'), core = C('#a8814e');
  for (const [ri, dir] of [[0, -1], [rings.length - 1, 1]]) {
    const ring = rings[ri], ctr = pts[ri];
    const inner = ring.map((p) => add(ctr, mul(sub(p, ctr), 0.55)));
    for (let k = 0; k < ring.length; k++) {
      S.quad(ring[k], ring[(k + 1) % ring.length], inner[(k + 1) % ring.length], inner[k], wood, 0, [dir, 0, 0]);
      S.tri(inner[k], inner[(k + 1) % ring.length], ctr, core, 0, [dir, 0, 0]);
    }
  }
  tube(S, [[0.2, 0.32, 0.12], [0.35, 0.5, 0.3], [0.42, 0.56, 0.4]], [0.07, 0.05, 0.035], 5, barkC, 0, 0, { capEnd: true, capCol: wood });
  const moss = C('#6f8a44');
  hexa(S, [[-0.7, 0.4, -0.1], [-0.2, 0.41, -0.08], [-0.2, 0.41, 0.1], [-0.7, 0.4, 0.12], [-0.7, 0.44, -0.08], [-0.2, 0.445, -0.06], [-0.2, 0.445, 0.08], [-0.7, 0.44, 0.1]], moss);
  return S;
}

function stump() {
  const S = new Soup();
  const barkC = bark([C('#5a4734'), C('#67523c'), C('#4f3e2e')], 9);
  const pts = [[0, 0, 0], [0, 0.18, 0], [0, 0.42, 0], [0.02, 0.55, 0.01]];
  const rings = tube(S, pts, [0.42, 0.33, 0.3, 0.29], 8, barkC, 0, 0, { twist: 0.2 });
  const top = rings[rings.length - 1], ctr = pts[pts.length - 1];
  const wood = C('#c7a372'), ringC = C('#a98552');
  const mid = top.map((p) => add(ctr, mul(sub(p, ctr), 0.62)));
  for (let k = 0; k < 8; k++) {
    const k1 = (k + 1) % 8;
    const lift = (p) => add(p, [0, 0.02 * hh(k, 3), 0]);
    S.quad(top[k], top[k1], lift(mid[k1]), lift(mid[k]), wood, 0, [0, 1, 0]);
    S.tri(lift(mid[k]), lift(mid[k1]), add(ctr, [0, 0.015, 0]), ringC, 0, [0, 1, 0]);
  }
  for (let r = 0; r < 4; r++) {
    const a = r * 1.57 + 0.4;
    const d = [Math.cos(a), 0, Math.sin(a)];
    tube(S, [add(mul(d, 0.2), [0, 0.15, 0]), add(mul(d, 0.45), [0, 0.06, 0]), add(mul(d, 0.65), [0, -0.02, 0])], [0.1, 0.07, 0.03], 4, barkC, 0, 0);
  }
  return S;
}

function lily() {
  const S = new Soup();
  const pad = [C('#4f8a3a'), C('#5a9642'), C('#467e34')], under = C('#7a4a3a');
  const n = 10, R = 0.36, notch = 0.34;
  const ctr = [0, 0.012, 0], ctrB = [0, -0.006, 0];
  const pt = (a, y, rr = R) => [Math.cos(a) * rr * (1 + 0.04 * Math.sin(a * 3)), y, Math.sin(a) * rr];
  for (let k = 0; k < n; k++) {
    const a0 = notch + (k / n) * (Math.PI * 2 - notch), a1 = notch + ((k + 1) / n) * (Math.PI * 2 - notch);
    const t0 = pt(a0, 0.01), t1 = pt(a1, 0.01), b0 = pt(a0, -0.004), b1 = pt(a1, -0.004);
    S.tri(ctr, t0, t1, pick(pad, hh(k, 2)).clone().multiplyScalar(0.95 + 0.1 * hh(k, 5)), 0, [0, 1, 0]);
    S.tri(ctrB, b0, b1, under, 0, [0, -1, 0]);
    S.quad(t0, t1, b1, b0, shade(pad[0], 0.8), 0, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]);
  }
  for (const a of [notch, Math.PI * 2]) {
    const t = pt(a, 0.01), b = pt(a, -0.004);
    S.quad(ctr, t, b, ctrB, shade(pad[0], 0.75), 0, [Math.sin(a) * (a === notch ? -1 : 1), 0, -Math.cos(a) * (a === notch ? -1 : 1)]);
  }
  const fc = [-0.08, 0.012, 0.06];
  const white = C('#f6f3ec'), pink = C('#f2dce0'), yel = C('#f0c63a');
  for (const [cnt, len, rise, rot, col] of [[8, 0.12, 0.05, 0, white], [5, 0.085, 0.085, 0.4, pink]]) {
    for (let k = 0; k < cnt; k++) {
      const a = rot + (k / cnt) * Math.PI * 2;
      const d = [Math.cos(a), 0, Math.sin(a)], s = [-Math.sin(a), 0, Math.cos(a)];
      const b0 = add(fc, mul(s, 0.022)), b1 = add(fc, mul(s, -0.022));
      const mid0 = add(add(fc, mul(d, len * 0.6)), add(mul(s, 0.03), [0, rise * 0.5, 0])), mid1 = add(add(fc, mul(d, len * 0.6)), add(mul(s, -0.03), [0, rise * 0.5, 0]));
      const tip = add(add(fc, mul(d, len)), [0, rise, 0]);
      const nrm = norm([d[0] * -rise, len, d[2] * -rise]);
      for (const sg of [1, -1]) {
        S.quad(b0, mid0, mid1, b1, col, 0, mul(nrm, sg));
        S.tri(mid0, tip, mid1, col, 0, mul(nrm, sg));
      }
    }
  }
  tube(S, [fc, add(fc, [0, 0.045, 0])], [0.028, 0.02], 6, yel, 0, 0, { capEnd: true });
  return S;
}

function boat() {
  const S = new Soup();
  const st = [[-1.45, 0.62, 0.36], [-1.0, 0.7, 0.4], [-0.4, 0.74, 0.42], [0.2, 0.72, 0.42], [0.8, 0.6, 0.45], [1.25, 0.36, 0.52], [1.5, 0.02, 0.64]];
  const prof = [[0, 0], [0.45, 0.04], [0.8, 0.22], [0.95, 0.5], [1, 1]];
  const planks = [C('#8a6a48'), C('#7c5e40'), C('#94744e'), C('#86663f')], inside = C('#a68660'), insideD = C('#937352'), rim = C('#5e4632');
  const outer = st.map(([x, hw, top]) => prof.map(([z, y]) => [x, y * top, z * hw]));
  const T = 0.035;
  const inner = st.map(([x, hw, top]) => prof.map(([z, y]) => [x, Math.max(0.04, y * top), Math.max(0, z * hw - T)]));
  for (let i = 0; i < st.length - 1; i++) {
    for (let k = 0; k < prof.length - 1; k++) {
      for (const sg of [1, -1]) {
        const f = (p) => [p[0], p[1], p[2] * sg];
        const a = f(outer[i][k]), b = f(outer[i][k + 1]), c = f(outer[i + 1][k + 1]), d = f(outer[i + 1][k]);
        const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
        S.quad(a, b, c, d, planks[(k + (i > 2 ? 1 : 0)) % planks.length], 0, [0, m[1] - 0.45, m[2] * 3 + sg * 0.01]);
        if (i < st.length - 2 || k > 0) {
          const ia = f(inner[i][k]), ib = f(inner[i][k + 1]), ic = f(inner[i + 1][k + 1]), id = f(inner[i + 1][k]);
          S.quad(ia, ib, ic, id, k === 0 ? insideD : inside, 0, [0, 0.6 - m[1], -m[2] * 3 - sg * 0.01]);
        }
      }
    }
    for (const sg of [1, -1]) {
      const f = (p) => [p[0], p[1], p[2] * sg];
      const k = prof.length - 1;
      S.quad(f(outer[i][k]), f(outer[i + 1][k]), f(inner[i + 1][k]), f(inner[i][k]), rim, 0, [0, 1, 0]);
    }
  }
  const tr = st[0];
  const stern = prof.map(([z, y]) => [tr[0], y * tr[2], z * tr[1]]);
  for (let k = 0; k < prof.length - 1; k++) {
    for (const sg of [1, -1]) {
      const f = (p) => [p[0], p[1], p[2] * sg];
      S.quad(f([tr[0], 0, 0]), f(stern[k]), f(stern[k + 1]), f([tr[0], stern[k + 1][1], 0]), planks[1], 0, [-1, 0, 0]);
      S.quad(f(add([0.035, 0, 0], [tr[0], 0.04, 0])), f(add(inner[0][k], [0.035, 0, 0])), f(add(inner[0][k + 1], [0.035, 0, 0])), f([tr[0] + 0.035, inner[0][k + 1][1], 0]), insideD, 0, [1, 0, 0]);
    }
  }
  const seat = C('#7a5a3c');
  for (const [x, w, h] of [[-1.05, 0.38, 0.4], [0.05, 0.4, 0.42], [0.85, 0.3, 0.38]]) {
    hexa(S, [[x - 0.12, h - 0.03, -w], [x + 0.12, h - 0.03, -w], [x + 0.12, h - 0.03, w], [x - 0.12, h - 0.03, w], [x - 0.12, h + 0.01, -w], [x + 0.12, h + 0.01, -w], [x + 0.12, h + 0.01, w], [x - 0.12, h + 0.01, w]], seat);
  }
  hexa(S, [[-1.45, -0.03, -0.04], [1.5, 0.0, -0.04], [1.5, 0.0, 0.04], [-1.45, -0.03, 0.04], [-1.45, 0.03, -0.04], [1.5, 0.08, -0.04], [1.5, 0.08, 0.04], [-1.45, 0.03, 0.04]], rim);
  const oar = C('#b48c5c');
  for (const sg of [1, -1]) {
    hexa(S, [[-0.9, 0.08, sg * 0.18], [0.9, 0.08, sg * 0.26], [0.9, 0.08, sg * 0.3], [-0.9, 0.08, sg * 0.22], [-0.9, 0.11, sg * 0.18], [0.9, 0.11, sg * 0.26], [0.9, 0.11, sg * 0.3], [-0.9, 0.11, sg * 0.22]], oar);
    hexa(S, [[0.85, 0.075, sg * 0.21], [1.25, 0.075, sg * 0.23], [1.25, 0.075, sg * 0.35], [0.85, 0.075, sg * 0.33], [0.85, 0.105, sg * 0.21], [1.25, 0.105, sg * 0.23], [1.25, 0.105, sg * 0.35], [0.85, 0.105, sg * 0.33]], shade(oar, 0.9));
  }
  return S;
}

function pier() {
  const S = new Soup();
  const boards = [C('#9a7a56'), C('#8c6e4c'), C('#a6845e'), C('#94744f')];
  const post = C('#5e4a38'), beam = C('#6e563f');
  const n = 14, L = 4, gap = 0.025, bw = L / n - gap;
  for (let i = 0; i < n; i++) {
    const z0 = -L / 2 + i * (L / n) + gap / 2, z1 = z0 + bw;
    const j = (hh(i, 3) - 0.5) * 0.06;
    const c = boards[i % boards.length];
    hexa(S, [[-1 + j, 0.555, z0], [1 + j, 0.555, z0], [1 + j, 0.555, z1], [-1 + j, 0.555, z1], [-1 + j, 0.6, z0], [1 + j, 0.6, z0], [1 + j, 0.6, z1], [-1 + j, 0.6, z1]], (f) => (f === 1 ? c : shade(c, 0.85)));
  }
  for (const x of [-0.82, 0.82]) {
    hexa(S, [[x - 0.06, 0.43, -2], [x + 0.06, 0.43, -2], [x + 0.06, 0.43, 2], [x - 0.06, 0.43, 2], [x - 0.06, 0.555, -2], [x + 0.06, 0.555, -2], [x + 0.06, 0.555, 2], [x - 0.06, 0.555, 2]], beam);
  }
  for (const z of [-1.85, 0, 1.85]) {
    for (const x of [-0.95, 0.95]) {
      const top = z === 1.85 ? 1.0 : 0.555;
      const r = 0.075;
      const col = (i, j) => shade(post, 0.92 + 0.12 * hh(i, j, z * 10 + x));
      tube(S, [[x, -1.3, z], [x, 0.0, z], [x, top, z]], [r, r, r * 0.95], 6, col, 0, 0, { capEnd: true, capCol: shade(post, 1.25) });
    }
  }
  hexa(S, [[-0.95, 0.3, 1.82], [0.95, 0.3, 1.82], [0.95, 0.3, 1.88], [-0.95, 0.3, 1.88], [-0.95, 0.4, 1.82], [0.95, 0.4, 1.82], [0.95, 0.4, 1.88], [-0.95, 0.4, 1.88]], beam);
  return S;
}

const SINK = { rock_s: 0.03, rock_m: 0.06, rock_l: 0.12, bush: 0.04, stump: 0.03, log: 0.03, grass: 0, flowers: 0, boat: 0 };

const BUILD = {
  willow, willow_weeping: willowWeeping, birch, alder, alder_row: alderRow, pine, bush, reeds, cattail,
  rock_s: () => rock(0.42, 1, [[0, 0.32, 0, 0.62, 0.45, 0.55, 0, 1], [0.42, 0.18, 0.2, 0.32, 0.26, 0.3, 0, 2]]),
  rock_m: () => rock(0.95, 2, [[0, 0.4, 0, 0.62, 0.5, 0.55, 1, 3]]),
  rock_l: () => rock(1.8, 3, [[0, 0.42, 0, 0.62, 0.55, 0.52, 1, 4], [0.48, 0.2, 0.35, 0.3, 0.26, 0.28, 0, 5]]),
  grass, flowers, log, stump, lily, boat, pier,
};

export function decoGeometry(id) {
  if (!cache.has(id)) {
    const S = (BUILD[id] || BUILD.rock_s)();
    if (SINK[id] !== undefined) {
      const dy = -S.bounds().min[1] - SINK[id];
      S.map((p) => [p[0], p[1] + dy, p[2]]);
    }
    for (let i = 0; i < S.c.length; i += 3) {
      const L = 0.2126 * S.c[i] + 0.7152 * S.c[i + 1] + 0.0722 * S.c[i + 2];
      for (let a = 0; a < 3; a++) S.c[i + a] = L + (S.c[i + a] - L) * 0.86;
    }
    const g = S.geometry();
    g.name = 'deco_' + id;
    cache.set(id, g);
  }
  return cache.get(id);
}

