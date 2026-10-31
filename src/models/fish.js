// Rybna Wyspa: procedural low-poly fish (34 Narew species) built from a parametric body loft, fins, eyes and barbels.
import { Soup, Caster, finStrip, ridge, dome, tube, C, mixC, shade, clamp, lerp, smooth, hh, vnoise, add, sub, mul, madd, dot, cross, norm, vlerp, basis } from './soup.js';
import { SPECS } from './fish-species.js';

export const FISH_IDS = [
  'ukleja', 'ploc', 'kielb', 'jazgarz', 'okon', 'krap',
  'leszcz', 'wzdrega', 'karas', 'jelec', 'klen', 'lin', 'piskorz',
  'jaz', 'karp', 'bolen', 'brzana', 'certa', 'amur',
  'sandacz', 'szczupak', 'mietus', 'wegorz',
  'troc', 'pstrag', 'sum',
  'losos', 'jesiotr',
  'rakieta', 'ognista', 'wydrukowana', 'gmicro', 'zloty_sum', 'potwor',
];

const BASE = {
  L: 0.81, H: 0.25, up: 0.52, W: 0.1, pkT: 0.4, pkB: 0.44, pkW: 0.3, nT: 0.72, nB: 0.8, nW: 0.55,
  tT: 1, tB: 1, tW: 1, ped: 0.3, pedB: null, pedW: 0.34, my: 0, mt: 0.3, cT: 0, eU: 2, eL: 2, N: 10, S: 13,
  grad: [-0.65, -0.25, 0.3, 0.75], jit: 0.08, pat: [], sat: 0.88,
  col: { back: '#4d6470', flank: '#cfd6da', belly: '#f0f1ee' },
  eye: { u: 0.072, yn: 0.25, r: 0.025, iris: '#f1efe6', pupil: '#0b0c0f', glow: 0 },
  mouth: { t: 'term', u: 0.032, y0: 0, y1: -0.15, w: 0.0034, h: 0.0028, col: '#2a2420' },
  gill: { u: 0.19, k: 0.022, y0: 0.6, y1: -0.7 },
  fins: {
    D: [0.4, 0.52, 0.11, 'tri', 0.45],
    A: [0.63, 0.73, 0.075, 'tri', 0.45],
    P: { u: 0.205, yn: -0.5, len: 0.105, shape: 'point' },
    V: { u: 0.43, yn: -0.82, len: 0.085, shape: 'point' },
    C: { t: 'fork', S: 0.12, F: 0.42 },
  },
  fc: {}, fp: {},
};

const cache = new Map();
const hexCache = new Map();
const H = (hex) => { if (!hexCache.has(hex)) hexCache.set(hex, C(hex)); return hexCache.get(hex); };

function resolve(id) {
  const raw = SPECS[id] || SPECS.ploc;
  const sp = { ...BASE, ...raw };
  sp.id = id;
  sp.seed = FISH_IDS.indexOf(id) + 1;
  sp.col = { ...BASE.col, ...(raw.col || {}) };
  sp.eye = { ...BASE.eye, ...(raw.eye || {}) };
  sp.mouth = raw.mouth === null ? null : { ...BASE.mouth, ...(raw.mouth || {}) };
  sp.gill = raw.gill === null ? null : { ...BASE.gill, ...(raw.gill || {}) };
  sp.fins = { ...BASE.fins, ...(raw.fins || {}) };
  for (const k of ['P', 'V', 'C']) if (sp.fins[k] && raw.fins && raw.fins[k]) sp.fins[k] = { ...BASE.fins[k], ...raw.fins[k] };
  sp.fc = { ...(raw.fc || {}) };
  sp.fp = { ...(raw.fp || {}) };
  sp._c = { back: C(sp.col.back), flank: C(sp.col.flank), belly: C(sp.col.belly) };
  return sp;
}

function env(t, pk, a, b, ped) {
  if (t <= 0) return 0;
  if (t < pk) return Math.pow(Math.sin((t / pk) * Math.PI * 0.5), a);
  const s = Math.min(1, (t - pk) / (1 - pk));
  return ped + (1 - ped) * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * s), b);
}

function makeProf(sp) {
  const ex = (v, t) => (Array.isArray(v) ? lerp(v[0], v[1], smooth(0.08, 0.55, t)) : v);
  return (u) => {
    const t = clamp(u / sp.L, 0, 1);
    let r;
    if (sp.profFn) r = sp.profFn(t);
    else {
      r = {
        ht: sp.H * sp.up * env(t, sp.pkT, sp.nT, sp.tT, sp.ped),
        hb: sp.H * (1 - sp.up) * env(t, sp.pkB, sp.nB, sp.tB, sp.pedB ?? sp.ped),
        w: 0.5 * sp.W * env(t, sp.pkW, sp.nW, sp.tW, sp.pedW),
        c: sp.my * sp.H * (1 - smooth(0, sp.mt, t)) + sp.cT * smooth(0.5, 1, t),
      };
    }
    return { u, t, x: 0.5 - u, c: r.c, ht: Math.max(r.ht, 1e-5), hb: Math.max(r.hb, 1e-5), w: Math.max(r.w, 1e-5), eU: ex(sp.eU, t), eL: ex(sp.eL, t) };
  };
}

function ringPt(pr, th) {
  const cs = Math.cos(th), sn = Math.sin(th);
  const e = cs >= 0 ? pr.eU : pr.eL;
  const yy = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / e);
  const zz = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e);
  return [pr.x, pr.c + (cs >= 0 ? pr.ht : pr.hb) * yy, pr.w * zz];
}

function patCuts(sp) {
  const cuts = [...(sp.cuts || [])];
  for (const p of sp.pat) {
    if (p.t === 'bars' && p.cut !== false) {
      const per = (p.u1 - p.u0) / p.n;
      for (let k = 0; k < p.n; k++) {
        const ctr = p.u0 + (k + 0.5) * per, hw = per * p.w * 0.5;
        cuts.push(ctr - hw, ctr + hw);
      }
    }
    if (p.t === 'band') cuts.push(p.u0, p.u1);
  }
  return cuts.filter((u) => u > 0.02 && u < sp.L - 0.01).sort((a, b) => a - b);
}

function stations(sp) {
  if (sp.stations) return sp.stations.slice();
  const L = sp.L, n = sp.S - 3;
  const base = [0, 0.012, 0.034];
  const a = 0.068;
  for (let i = 0; i < n; i++) base.push(lerp(a, L, i / (n - 1)));
  const cuts = patCuts(sp);
  if (!cuts.length) return base;
  const gap = (L - a) / (n - 1);
  const keep = base.filter((u, i) => i < 3 || u >= L - 1e-6 || !cuts.some((c) => Math.abs(c - u) < gap * 0.42));
  return [...new Set([...keep, ...cuts])].sort((x, y) => x - y);
}

function gradient(sp, yn) {
  const [g0, g1, g2, g3] = sp.grad;
  const { back, flank, belly } = sp._c;
  if (yn < g0) return belly.clone();
  if (yn < g1) return mixC(belly, flank, (yn - g0) / (g1 - g0));
  if (yn < g2) return flank.clone();
  if (yn < g3) return mixC(flank, back, (yn - g2) / (g3 - g2));
  return back.clone();
}

function applyPat(sp, p, c, f) {
  const { u, yn, side, idx } = f;
  const inU = (u >= (p.u0 ?? -1)) && (u <= (p.u1 ?? 2));
  const inY = (yn >= (p.y0 ?? -2)) && (yn <= (p.y1 ?? 2));
  switch (p.t) {
    case 'bars': {
      if (!inU) return c;
      const per = (p.u1 - p.u0) / p.n;
      const k = Math.floor((u - p.u0) / per);
      const ctr = p.u0 + (k + 0.5) * per, hw = per * p.w * 0.5;
      const wob = p.jag ? (hh(idx, 5, sp.seed) - 0.5) * per * 0.5 : 0;
      if (Math.abs(u - ctr + wob) > hw) return c;
      const ymin = p.ymin + (hh(k, 3, sp.seed) - 0.5) * 0.3;
      if (yn < ymin) return c;
      return mixC(c, H(p.col), p.a * smooth(ymin, ymin + (p.taper ?? 0.3), yn));
    }
    case 'band': return inU ? H(p.col).clone() : c;
    case 'spots':
      if (!inU || !inY) return c;
      return hh(idx, 17 + (p.seed || 0), sp.seed) < p.d ? mixC(c, H(p.col), p.a ?? 1) : c;
    case 'blotch': {
      if (!inU || !inY) return c;
      const per = (p.u1 - p.u0) / p.n;
      const k = Math.floor((u - p.u0) / per);
      const ctr = p.u0 + (k + 0.5) * per;
      return Math.abs(u - ctr) < p.w * 0.5 ? mixC(c, H(p.col), p.a ?? 1) : c;
    }
    case 'stripes':
      if (!inU) return c;
      for (const [a, b, col, al] of p.bands) if (yn >= a && yn <= b) c = mixC(c, H(col), al ?? 1);
      return c;
    case 'mottle': {
      if (!inU || !inY) return c;
      const nz = vnoise(u * p.sc[0] + side * 13.7, yn * p.sc[1] + side * 3.1, sp.seed * 3 + (p.seed || 0));
      if (nz > p.thr) return mixC(c, H(p.col), p.a * smooth(p.thr, p.thr + 0.07, nz));
      if (p.col2 && nz < 1 - p.thr) return mixC(c, H(p.col2), (p.a2 ?? p.a) * smooth(1 - p.thr, 1 - p.thr - 0.07, nz));
      return c;
    }
    case 'tint':
      if (!inU) return c;
      return mixC(c, H(p.col), (p.a ?? 1) * smooth(p.y1 ?? -0.3, p.y0 ?? -1, yn) * (p.fu ? smooth(p.fu[0], p.fu[1], u) : 1));
    default: return c;
  }
}

function paintBody(sp, f) {
  if (sp.paint) return sp.paint(sp, f);
  let c = gradient(sp, f.yn);
  for (const p of sp.pat) c = applyPat(sp, p, c, f);
  return c.multiplyScalar(1 + (hh(f.idx, 91, sp.seed) - 0.5) * sp.jit);
}

function finShape(t, s, j, n, o) {
  switch (t) {
    case 'tri': return (j === 0 ? 0.9 : 1) * (1 - 0.82 * s);
    case 'concave': return (j === 0 ? 0.92 : 1) * (0.14 + 0.86 * Math.pow(1 - s, 2.2));
    case 'convex': return 0.3 + 0.7 * (1 - s * s) * (j === 0 ? 0.85 : 1);
    case 'round': return 0.38 + 0.62 * Math.pow(Math.sin(Math.PI * (0.12 + 0.8 * s)), 0.8);
    case 'long': return 0.15 + 0.85 * smooth(0, o.rise ?? 0.2, s) * (1 - (o.fall ?? 0) * smooth(0.7, 1, s));
    case 'spiny': {
      const e = s < 0.28 ? 0.62 + 0.38 * (s / 0.28) : 1 - 0.5 * ((s - 0.28) / 0.72);
      return e * (j % 2 === 0 ? 1 : 0.64);
    }
    case 'ruffe': {
      if (s < 0.6) { const e = s < 0.2 ? 0.7 + 0.3 * (s / 0.2) : 1 - 0.25 * ((s - 0.2) / 0.4); return e * (j % 2 === 0 ? 1 : 0.62); }
      return 0.62 * (0.5 + 0.5 * Math.sin(Math.PI * (0.25 + 0.75 * ((s - 0.6) / 0.4))));
    }
    case 'carp': return 0.38 + 0.12 * (1 - s) + 0.5 * Math.pow(1 - s, 7);
    case 'adipose': return 0.2 + 0.8 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.6);
    case 'crest': return (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1))) * (j % 2 === 0 ? 1 : 0.2);
    case 'flame': return j % 2 === 1 ? 0.62 + 0.38 * hh(j, 7, o.seed || 1) : 0.18 + 0.1 * hh(j, 3, 1);
    default: return 1 - 0.8 * s;
  }
}

function defaultFc(sp, key) {
  const { back, flank, belly } = sp._c;
  if (key === 'D' || key === 'D2' || key === 'C' || key === 'AD') return [mixC(back, flank, 0.45), mixC(back, flank, 0.7)];
  return [mixC(flank, belly, 0.4), mixC(flank, belly, 0.75)];
}

function finCol(sp, key, s, rf, j, r) {
  const alt = { D2: 'D', AD: 'D', Cl: 'C', A2: 'A' }[key];
  const pair = sp.fc[key] || (alt && sp.fc[alt]) || defaultFc(sp, key);
  const c0 = typeof pair[0] === 'string' ? H(pair[0]) : pair[0];
  const c1 = typeof pair[1] === 'string' ? H(pair[1]) : pair[1];
  let c = mixC(c0, c1, rf);
  const fp = sp.fp[key] || {};
  if ((fp.rays ?? 0.05) && (j & 1)) c.multiplyScalar(1 - (fp.rays ?? 0.05));
  if (fp.dots && rf > 0.25 && hh(j * 7 + 3, r * 13 + 5, sp.seed * 31 + key.charCodeAt(0)) < fp.dots[1]) c = mixC(c, H(fp.dots[0]), fp.dots[2] ?? 0.75);
  if (fp.spot && s >= fp.spot[1] && rf >= fp.spot[2]) c = H(fp.spot[0]).clone();
  if (fp.edge && rf >= fp.edge[1]) c = mixC(c, H(fp.edge[0]), fp.edge[2] ?? 1);
  if (fp.lead && j === 0) c = mixC(c, H(fp.lead), 0.85);
  if (rf > 0.8 && !fp.noEdge) c.multiplyScalar(fp.edgeK ?? 0.82);
  return c.multiplyScalar(1 + (hh(j * 17 + r * 5 + 3, key.charCodeAt(0), sp.seed) - 0.5) * 0.08);
}

function medianFin(ctx, key, spec) {
  if (!spec) return;
  const [u0, u1, h, shape = 'tri', rake = 0.4, o = {}] = spec;
  const { sp, prof, S } = ctx;
  const top = key !== 'A' && key !== 'A2';
  const n = o.n || Math.max(3, Math.round((u1 - u0) / 0.024));
  const R = o.rows || (n > 12 ? 1 : 2);
  const qs = R === 2 ? [0, o.q ?? 0.66, 1] : Array.from({ length: R + 1 }, (_, r) => r / R);
  const rows = Array.from({ length: R + 1 }, () => []);
  const sg = top ? 1 : -1;
  for (let j = 0; j <= n; j++) {
    const s = j / n, u = lerp(u0, u1, s), pr = prof(u);
    const yb = top ? pr.c + pr.ht : pr.c - pr.hb;
    const inset = Math.min(0.012, 0.4 * (top ? pr.ht : pr.hb));
    const hf = h * finShape(shape, s, j, n, o);
    const rk = rake * hf + (o.rakeJ ? o.rakeJ(s, j) : 0);
    const B = [pr.x, yb - sg * inset, 0];
    const T = [pr.x - rk, yb + sg * hf, 0];
    for (let r = 0; r <= R; r++) {
      const q = qs[r];
      const bow = o.bow ? o.bow * Math.sin(Math.PI * q) * hf : 0;
      rows[r].push([lerp(B[0], T[0], q) + bow, lerp(B[1], T[1], q), 0]);
    }
  }
  const th = o.th ?? 0.0082;
  const thick = R === 1 ? [th, 0] : [th, th * 0.42, 0];
  const glow = o.glowFn || o.glow || 0;
  finStrip(S, rows, thick, [0, 0, 1], (r, j) => (o.colFn ? o.colFn(r, j, R, n) : finCol(sp, key, (j + 0.5) / n, R === 1 ? 0.5 : (r === 0 ? 0.3 : 0.9), j, r)), glow, 1);
  ctx.edges = ctx.edges || [];
  ctx.edges.push({ key, pts: rows[R], top });
}

function caudalOutline(Cs, Lc, m) {
  const O = [];
  const S = Cs.S, F = Cs.F ?? 0.4, up = Cs.up ?? 1, lo = Cs.lo ?? 1, Sl = Cs.Sl ?? S;
  for (let j = 0; j <= m; j++) {
    const v = j / m;
    let X, Y;
    if (Cs.t === 'round') {
      X = Lc * (0.6 + 0.4 * Math.pow(Math.sin(Math.PI * v), 0.7));
      Y = lerp(S, -Sl, v) * (0.85 + 0.15 * Math.sin(Math.PI * v));
    } else if (Cs.t === 'hetero') {
      const P = [[Lc, S], [Lc * 0.66, S * 0.42], [Lc * 0.38, -Sl * 0.05], [Lc * 0.5, -Sl]];
      const k = v <= 0.6 ? v / 0.6 * 2 : 2 + (v - 0.6) / 0.4;
      const i = Math.min(2, Math.floor(k)), f = k - i;
      X = lerp(P[i][0], P[i + 1][0], f); Y = lerp(P[i][1], P[i + 1][1], f);
    } else if (Cs.t === 'flame') {
      const tipJ = j % 2 === 0;
      X = Lc * (tipJ ? 0.78 + 0.22 * hh(j, 11, 3) : 0.42 + 0.08 * hh(j, 5, 2));
      Y = lerp(S, -Sl, v) * (tipJ ? 1.12 : 0.85);
    } else {
      const notch = [Lc * (1 - F), (Cs.ny ?? 0) * S];
      const w = v <= 0.5 ? v / 0.5 : (1 - v) / 0.5;
      const tip = v <= 0.5 ? [Lc * up, S] : [Lc * lo, -Sl];
      X = lerp(tip[0], notch[0], w) - (Cs.bow ?? 0) * Lc * Math.sin(Math.PI * w);
      Y = lerp(tip[1], notch[1], w);
      if (Cs.rt && (j === 0 || j === m)) X -= Cs.rt * 0.12 * Lc;
      if (Cs.rt && (j === 1 || j === m - 1)) Y += (j === 1 ? 1 : -1) * Cs.rt * 0.08 * S;
    }
    O.push([X, Y]);
  }
  return O;
}

function caudal(ctx) {
  const { sp, prof, S } = ctx;
  const Cs = sp.fins.C;
  if (!Cs || Cs.t === 'none') return;
  const ub = sp.L - 0.022, pr = prof(ub);
  const xb = pr.x, yc = pr.c + (pr.ht - pr.hb) * 0.5;
  const hp = Math.min(pr.ht, pr.hb) * 0.9;
  const Lc = xb + 0.5;
  const m = Cs.m || (Cs.t === 'flame' ? 10 : 8);
  const O = caudalOutline(Cs, Lc, m);
  const B = [], M = [], E = [];
  const bul = Cs.bul ?? 0.012;
  for (let j = 0; j <= m; j++) {
    const v = j / m;
    const b = [xb, yc + hp * (1 - 2 * v), 0];
    const e = [xb - O[j][0], yc + O[j][1], 0];
    let mm = vlerp(b, e, Cs.q ?? 0.6);
    if (j === 0) mm = add(mm, [0, bul, 0]);
    if (j === m) mm = add(mm, [0, -bul, 0]);
    B.push(b); M.push(mm); E.push(e);
  }
  const thB = clamp(pr.w * 0.85, 0.004, 0.022);
  const lowSplit = Cs.split ?? 0.5;
  const colFn = Cs.colFn || ((r, j) => {
    const v = (j + 0.5) / m;
    const rf = r === 0 ? 0.3 : 0.9;
    const low = sp.fc.Cl && v > lowSplit;
    const c = finCol(sp, low ? 'Cl' : 'C', v, rf, j, r);
    return c;
  });
  finStrip(S, [B, M, E], [thB, 0.0036, 0], [0, 0, 1], colFn, Cs.glowFn || Cs.glow || 0, 1);
  ctx.edges = ctx.edges || [];
  ctx.edges.push({ key: 'C', pts: E, top: true });
}

function pairedFin(ctx, key) {
  const { sp, S } = ctx;
  const P = sp.fins[key];
  if (!P) return;
  const m = P.m || 3;
  const R = P.rows || 2;
  for (const side of [1, -1]) {
    const at = ctx.surfAt(P.u, P.yn, side);
    let e1, e2;
    if (key === 'P') {
      if (P.plane === 'flat') { e1 = [-1, -0.12, 0.6 * side]; e2 = [0.12, -0.18, 1 * side]; }
      else { e1 = [-1, -0.4, 0.42 * side]; e2 = [0.15, 1, 0.12 * side]; }
    } else { e1 = [-1, -0.32, 0.26 * side]; e2 = [0, -0.55, 0.85 * side]; }
    if (P.e1) e1 = [P.e1[0], P.e1[1], P.e1[2] * side];
    if (P.e2) e2 = [P.e2[0], P.e2[1], P.e2[2] * side];
    e1 = norm(e1);
    e2 = norm(sub(e2, mul(e1, dot(e2, e1))));
    const nrm = cross(e1, e2);
    const A = madd(at.p, at.n, -0.004);
    const rl = P.root ?? 0.022, spread = P.spread ?? 0.5;
    const rows = Array.from({ length: R + 1 }, () => []);
    for (let j = 0; j <= m; j++) {
      const s = j / m;
      const rp = madd(A, e2, rl * (0.5 - s));
      const d = norm(add(e1, mul(e2, spread * (0.5 - s) * 2)));
      let f;
      switch (P.shape) {
        case 'round': f = 0.62 + 0.38 * Math.sin(Math.PI * s); break;
        case 'fan': f = 0.78 + 0.22 * Math.sin(Math.PI * s); break;
        case 'flame': f = j % 2 === 0 ? 1 : 0.45; break;
        default: f = 1 - 0.5 * s;
      }
      const tp = madd(rp, d, P.len * f);
      for (let r = 0; r <= R; r++) rows[r].push(vlerp(rp, tp, R === 2 ? [0, 0.66, 1][r] : r / R));
    }
    const thick = R === 1 ? [0.006, 0] : [0.006, 0.0026, 0];
    finStrip(S, rows, thick, nrm, P.colFn || ((r, j) => finCol(sp, key, (j + 0.5) / m, R === 1 ? 0.5 : (r === 0 ? 0.3 : 0.9), j, r)), P.glow || 0, 1);
  }
}

function eyes(ctx) {
  const E = ctx.sp.eye;
  if (!E) return;
  const pr = ctx.prof(E.u);
  const r = Math.min(E.r * (E.k ?? 1.75), (E.fit ?? 0.34) * (pr.ht + pr.hb));
  ctx.eyeR = r;
  for (const side of [1, -1]) {
    const at = ctx.surfAt(E.u, E.yn, side);
    const n = norm(add(at.n, [0, 0, side * (E.out ?? 0.25)]));
    dome(ctx.S, ctx.caster, at.p, n, r, {
      rings: [[1, -0.08], [E.pf ?? 0.5, 0.2]], apex: 0.3, seg: 8, kind: 3,
      cols: [H(E.iris), H(E.pupil)], glows: [E.glow || 0, E.pglow ?? (E.glow || 0)],
    });
    if (E.spark !== false) {
      const [t1, t2] = basis(n);
      const q = madd(madd(madd(at.p, n, 0.3 * r), t2, 0.2 * r), t1, 0.14 * r * (E.u < 0.5 ? 1 : 1));
      dome(ctx.S, null, q, n, 0.15 * r, { seg: 3, rings: [[1, -0.35]], apex: 0.5, cols: [H('#ffffff')], glows: [E.glow ? 0.6 : 0], kind: 3 });
    }
  }
}

function mouth(ctx) {
  const M = ctx.sp.mouth;
  if (!M || M.t === 'none') return;
  const col = H(M.col);
  if (M.t === 'term') {
    for (const side of [1, -1]) {
      const pts = [], nr = [], K = M.k || 2;
      for (let i = 0; i <= K; i++) {
        const s = i / K;
        const at = ctx.surfAt(lerp(0.004, M.u, s), lerp(M.y0, M.y1, Math.pow(s, 0.85)), side);
        pts.push(at.p); nr.push(at.n);
      }
      ridge(ctx.S, pts, nr, M.w, M.h, col, 0, 2);
    }
  } else if (M.t === 'under') {
    const pts = [], nr = [], K = M.k || 4, A = ((M.ang ?? 50) * Math.PI) / 180;
    for (let i = 0; i <= K; i++) {
      const a = A * ((2 * i) / K - 1);
      const at = ctx.surfRad(M.u + (M.bk ?? 0.012) * (1 - Math.cos(a)), Math.PI + a);
      pts.push(at.p); nr.push(at.n);
    }
    ridge(ctx.S, pts, nr, M.w, M.h, col, 0, 2);
  } else if (M.t === 'wide') {
    const pr = ctx.prof(M.u);
    const y = pr.c + M.yn * (M.yn >= 0 ? pr.ht : pr.hb);
    const pts = [], nr = [], K = M.k || 6, A = ((M.ang ?? 78) * Math.PI) / 180;
    for (let i = 0; i <= K; i++) {
      const a = A * ((2 * i) / K - 1);
      const hit = ctx.caster.cast([pr.x, y, 0], norm([Math.cos(a), (M.dip ?? 0) * (1 - Math.cos(a)), Math.sin(a)]));
      if (hit) { pts.push(hit.p); nr.push(hit.n); }
    }
    if (pts.length > 1) ridge(ctx.S, pts, nr, M.w, M.h, col, 0, 2);
  }
}

function gill(ctx) {
  const G = ctx.sp.gill;
  if (!G) return;
  for (const side of [1, -1]) {
    const K = G.kseg || 3, pts = [], nr = [];
    for (let i = 0; i <= K; i++) {
      const s = i / K;
      const at = ctx.surfAt(G.u + G.k * Math.sin(Math.PI * s), lerp(G.y0, G.y1, s), side);
      pts.push(at.p); nr.push(at.n);
    }
    const c = G.col ? H(G.col).clone() : shade(ctx.paintAt(G.u, 0.05, side), G.dark ?? 0.78);
    ridge(ctx.S, pts, nr, G.w ?? 0.0032, G.h ?? 0.0021, c, 0, 2);
  }
}

function barbels(ctx) {
  for (const B of ctx.sp.barbels || []) {
    const sides = B.mid ? [0] : [1, -1];
    for (const side of sides) {
      let at;
      if (B.mid) at = ctx.surfRad(B.u, Math.PI);
      else if (B.ang !== undefined) at = ctx.surfRad(B.u, side > 0 ? (B.ang * Math.PI) / 180 : -(B.ang * Math.PI) / 180);
      else at = ctx.surfAt(B.u, B.yn, side);
      const sg = side || 1;
      const p0 = madd(at.p, at.n, -0.002);
      let d = norm([B.dir[0], B.dir[1], B.dir[2] * sg]);
      const dr = B.droop ? [B.droop[0], B.droop[1], B.droop[2] * sg] : [-0.5, -0.5, 0];
      const segs = B.segs || 3, step = B.len / segs;
      const pts = [p0];
      for (let i = 0; i < segs; i++) {
        pts.push(madd(pts[pts.length - 1], d, step));
        d = norm(add(d, mul(dr, 1 / segs)));
      }
      const radii = pts.map((_, i) => B.r * Math.pow(1 - i / segs, B.taper ?? 0.7));
      tube(ctx.S, pts, radii, 3, H(B.col || '#8a7a5a'), B.glow || 0, 4);
    }
  }
}

function spotsRaised(ctx) {
  const R = ctx.sp.rspots;
  if (!R) return;
  for (const side of [1, -1]) {
    for (let i = 0; i < R.n; i++) {
      const u = R.u0 + ((i + 0.5 + (hh(i, 41 + side, R.seed) - 0.5) * 0.7) * (R.u1 - R.u0)) / R.n;
      const yn = lerp(R.y0, R.y1, hh(i, 43 + side, R.seed));
      const at = ctx.surfAt(u, yn, side);
      const r = R.r * (0.8 + 0.4 * hh(i, 47, R.seed));
      dome(ctx.S, ctx.caster, at.p, at.n, r, { seg: R.seg || 5, rings: [[1, -0.15], [R.inner ?? 0.56, 0.12]], apex: 0.15, cols: [H(R.ring), H(R.col)], kind: 5 });
    }
  }
}

function spotsX(ctx) {
  const X = ctx.sp.xspots;
  if (!X) return;
  const col = H(X.col);
  for (const side of [1, -1]) {
    for (let i = 0; i < X.n; i++) {
      const u = X.u0 + ((i + 0.5 + (hh(i, 61 + side, X.seed) - 0.5) * 0.8) * (X.u1 - X.u0)) / X.n;
      const yn = lerp(X.y0, X.y1, Math.pow(hh(i, 63 + side, X.seed), X.bias ?? 1));
      const at = ctx.surfAt(u, yn, side);
      const [t1, t2] = basis(at.n);
      const r = X.r * (0.75 + 0.5 * hh(i, 67, X.seed));
      const tw = (hh(i, 71, X.seed) - 0.5) * 0.6;
      for (const sgn of [1, -1]) {
        const dir = norm(add(mul(t1, Math.cos(Math.PI / 4 + tw) * sgn), mul(t2, Math.sin(Math.PI / 4 + tw))));
        const a = ctx.caster.project(madd(madd(at.p, dir, r), at.n, 0.001));
        const b = ctx.caster.project(madd(madd(at.p, dir, -r), at.n, 0.001));
        ridge(ctx.S, [a.p, b.p], [a.n, b.n], X.w ?? 0.0032, X.h ?? 0.0022, col, 0, 5, false);
      }
    }
  }
}

function spotsDisc(ctx) {
  for (const D of ctx.sp.dspots || []) {
    const rows = D.rows || [null];
    for (const side of [1, -1]) {
      rows.forEach((ry, k) => {
        for (let i = 0; i < D.n; i++) {
          const sd = D.seed + k * 7 + (side > 0 ? 0 : 3);
          const off = ry === null ? 0 : (k % 2) * 0.5;
          const u = D.u0 + ((i + 0.5 + off + (hh(i, 81, sd) - 0.5) * (D.ju ?? 0.8)) * (D.u1 - D.u0)) / (D.n + (ry === null ? 0 : 0.5));
          if (u > D.u1 || u < D.u0) continue;
          const yn = ry === null ? lerp(D.y0, D.y1, hh(i, 83, sd)) : ry + (hh(i, 85, sd) - 0.5) * (D.jy ?? 0.15);
          if (D.skip && hh(i, 93, sd) < D.skip) continue;
          const at = ctx.surfAt(u, yn, side);
          const rv = D.rv ?? 0.4;
          const r = D.r * (1 - rv / 2 + rv * hh(i, 87, sd));
          const st = (D.st ?? 1) * (0.85 + 0.3 * hh(i, 89, sd));
          dome(ctx.S, ctx.caster, at.p, at.n, r, { seg: D.seg || 5, rings: [[1, -0.06]], apex: D.h ?? 0.16, stretch: st, rot: (D.rot ?? hh(i, 91, sd)) * 6.283, cols: [H(D.col)], kind: 5 });
        }
      });
    }
  }
}

function buildBody(ctx) {
  const { sp, prof, S } = ctx;
  const N = sp.N;
  const us = stations(sp);
  const rings = [];
  for (let i = 1; i < us.length; i++) {
    const pr = prof(us[i]);
    const pts = [];
    for (let k = 0; k < N; k++) pts.push(ringPt(pr, (k / N) * Math.PI * 2 + (sp.ringRot || 0)));
    rings.push({ pr, pts });
  }
  ctx.rings = rings;
  ctx.tip = [0.5, prof(0).c, 0];
  let idx = 0;
  const face = (a, b, c, want, info) => {
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
    const u = 0.5 - cx, pr = prof(u);
    const yn = clamp((cy - pr.c) / (cy >= pr.c ? pr.ht : pr.hb), -1, 1);
    const f = { u, yn, side: cz >= 0 ? 1 : -1, idx: idx++, x: cx, y: cy, z: cz, ...info };
    let col = paintBody(sp, f);
    if (info.mul) col = col.multiplyScalar(info.mul);
    if (info.net) col = mixC(col, H(info.net[0]), info.net[1]);
    S.tri(a, b, c, col, sp.glowFn ? sp.glowFn(f) : 0, want, 0);
  };
  const r0 = rings[0];
  for (let k = 0; k < N; k++) {
    const a = ctx.tip, b = r0.pts[k], c = r0.pts[(k + 1) % N];
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    face(a, b, c, sub(m, [r0.pr.x - 0.03, r0.pr.c, 0]), { i: 0, k });
  }
  const sc = sp.scales;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let k = 0; k < N; k++) {
      const a = A.pts[k], b = A.pts[(k + 1) % N], c = B.pts[(k + 1) % N], d = B.pts[k];
      const mid = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
      const um = 0.5 - mid[0], pm = prof(um);
      const ax = [mid[0], pm.c, 0];
      const want = sub(mid, ax);
      const dTop = k < N / 2 ? k : N - 1 - k;
      if (sc && um >= sc.from && um <= sc.to && sc.rows.includes(dTop)) {
        const M = add(ax, mul(want, 1 + sc.h));
        face(a, b, M, sub(centroid3(a, b, M), ax), { i, k, part: 'front', mul: 1.07 });
        face(b, c, M, sub(centroid3(b, c, M), ax), { i, k, part: 'side', mul: 0.97 });
        face(c, d, M, sub(centroid3(c, d, M), ax), { i, k, part: 'rear', net: [sc.net, sc.a ?? 0.5] });
        face(d, a, M, sub(centroid3(d, a, M), ax), { i, k, part: 'side', mul: 0.97 });
      } else if ((i + k) & 1) {
        face(a, b, c, want, { i, k, half: 0 });
        face(a, c, d, want, { i, k, half: 1 });
      } else {
        face(a, b, d, want, { i, k, half: 0 });
        face(b, c, d, want, { i, k, half: 1 });
      }
    }
  }
  const last = rings[rings.length - 1];
  const ctr = [last.pr.x, last.pr.c, 0];
  for (let k = 0; k < N; k++) face(ctr, last.pts[(k + 1) % N], last.pts[k], [-1, 0, 0], { i: rings.length, k });
}

const centroid3 = (a, b, c) => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];

function makeCtx(sp) {
  const prof = makeProf(sp);
  const S = new Soup();
  const ctx = { sp, prof, S, H, finCol: (k, s, rf, j, r) => finCol(sp, k, s, rf, j, r), medianFin: (key, spec) => medianFin(ctx, key, spec) };
  ctx.surfRad = (u, ang) => {
    const pr = prof(u);
    const d = norm([0, Math.cos(ang) * (Math.cos(ang) >= 0 ? pr.ht : pr.hb), Math.sin(ang) * pr.w]);
    return ctx.caster.cast([pr.x, pr.c, 0], d) || { p: [pr.x, pr.c, 0], n: d };
  };
  ctx.surfAt = (u, yn, side) => {
    const pr = prof(u);
    const h = yn >= 0 ? pr.ht : pr.hb;
    const d = norm([0, yn * h, side * pr.w * Math.sqrt(Math.max(0, 1 - yn * yn))]);
    return ctx.caster.cast([pr.x, pr.c, 0], d) || { p: [pr.x, pr.c + yn * h, side * pr.w * 0.5], n: d };
  };
  ctx.paintAt = (u, yn, side) => paintBody(sp, { u, yn, side, idx: 0 });
  return ctx;
}

const LIMIT = { jesiotr: 1000, sum: 1000, zloty_sum: 1000, potwor: 1000 };

function build(id) {
  const sp0 = resolve(id);
  const lim = LIMIT[id] ?? 700;
  let res = null;
  for (let s = sp0.S; s >= 8; s--) {
    res = buildOnce({ ...sp0, S: s });
    if (res.tris <= lim || sp0.stations || sp0.builder) break;
  }
  return res;
}

function grade(S, sat) {
  if (sat >= 1) return;
  for (let v = 0; v < S.g.length; v++) {
    if (S.g[v] > 0) continue;
    const i = v * 3;
    const L = 0.2126 * S.c[i] + 0.7152 * S.c[i + 1] + 0.0722 * S.c[i + 2];
    for (let a = 0; a < 3; a++) S.c[i + a] = L + (S.c[i + a] - L) * sat;
  }
}

function buildOnce(sp) {
  const id = sp.id;
  const ctx = makeCtx(sp);
  if (sp.builder) sp.builder(ctx);
  else buildBody(ctx);
  ctx.caster = new Caster(ctx.S.tris(0), (q) => {
    const u = clamp(0.5 - q[0], 0, sp.L);
    return [0.5 - u, ctx.prof(u).c, 0];
  });
  if (!sp.builder) {
    for (const key of ['D', 'D2', 'AD', 'A']) medianFin(ctx, key, key === 'AD' && sp.fins.AD ? [...sp.fins.AD.slice(0, 3), 'adipose', 0.55, { n: 3, rows: 1 }] : sp.fins[key]);
    caudal(ctx);
    pairedFin(ctx, 'P');
    pairedFin(ctx, 'V');
    eyes(ctx);
    mouth(ctx);
    gill(ctx);
    barbels(ctx);
    spotsRaised(ctx);
    spotsDisc(ctx);
    spotsX(ctx);
  }
  if (sp.special) sp.special(ctx);
  const S = ctx.S;
  grade(S, sp.sat);
  let inward = 0;
  for (let t = 0; t < S.k.length; t++) {
    if (S.k[t] !== 0) continue;
    const p = S.p, o = t * 9;
    const a = [p[o], p[o + 1], p[o + 2]], b = [p[o + 3], p[o + 4], p[o + 5]], c = [p[o + 6], p[o + 7], p[o + 8]];
    const m = centroid3(a, b, c), n = cross(sub(b, a), sub(c, a));
    const ax = [m[0], ctx.prof(clamp(0.5 - m[0], 0, sp.L)).c, 0];
    const r = sub(m, ax);
    if (Math.hypot(r[1], r[2]) > 0.004 && dot(n, [0, r[1], r[2]]) < 0 && Math.abs(n[0]) < 0.9 * Math.hypot(n[0], n[1], n[2])) inward++;
  }
  const bb = S.bounds();
  const s = 1 / (bb.max[0] - bb.min[0]);
  const cx = (bb.max[0] + bb.min[0]) / 2, cy = (bb.max[1] + bb.min[1]) / 2, cz = (bb.max[2] + bb.min[2]) / 2;
  S.map((p) => [(p[0] - cx) * s, (p[1] - cy) * s, (p[2] - cz) * s]);
  const body = S.bounds(0);
  const dims = { h: +(body.max[1] - body.min[1]).toFixed(4), w: +(body.max[2] - body.min[2]).toFixed(4), cy: +((body.max[1] + body.min[1]) / 2).toFixed(4) };
  const geo = S.geometry((x) => clamp(0.5 - x, 0, 1));
  geo.name = 'fish_' + id;
  geo.userData = { id, dims, body: { min: body.min, max: body.max }, inward, stations: sp.S };
  return { geo, dims, tris: S.count };
}

function get(id) {
  const key = SPECS[id] ? id : 'ploc';
  if (!cache.has(key)) cache.set(key, build(key));
  return cache.get(key);
}

export function fishGeometry(id) {
  return get(id).geo;
}

export function fishDims(id) {
  const d = get(id).dims;
  return { h: d.h, w: d.w, cy: d.cy };
}
