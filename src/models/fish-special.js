// Rybna Wyspa: special fish parts (eel fin, teeth, scutes, rocket, flame, 3D print, neural net, monster jaw).
import { finStrip, ridge, dome, tube, C, mixC, shade, clamp, lerp, smooth, hh, vnoise, add, sub, mul, madd, cross, norm, vlerp } from './soup.js';

export function eelFin(ctx, o) {
  const { sp, prof, S } = ctx;
  const L = sp.L, path = [];
  const nT = o.nTop ?? 18, nB = o.nBot ?? 14;
  for (let i = 0; i <= nT; i++) {
    const s = i / nT, pr = prof(lerp(o.u0, L, s));
    path.push({ p: [pr.x, pr.c + pr.ht, 0], h: smooth(0, 0.3, s) * lerp(o.hTop, o.hEnd, smooth(0.55, 1, s)), g: 0 });
  }
  const pe = prof(L);
  path.push({ p: [pe.x, pe.c, 0], h: o.hEnd, g: 1 });
  for (let i = nB; i >= 0; i--) {
    const s = i / nB, pr = prof(lerp(o.u1, L, s));
    path.push({ p: [pr.x, pr.c - pr.hb, 0], h: smooth(0, 0.3, s) * lerp(o.hBot, o.hEnd, smooth(0.55, 1, s)), g: 2 });
  }
  const n = path.length, rows = [[], [], []];
  for (let i = 0; i < n; i++) {
    const t = norm(sub(path[Math.min(n - 1, i + 1)].p, path[Math.max(0, i - 1)].p));
    const nr = [t[1], -t[0], 0];
    const pt = path[i];
    const base = madd(pt.p, nr, -Math.min(0.006, 0.004 + pt.h * 0.1));
    const tip = madd(pt.p, nr, pt.h);
    rows[0].push(base); rows[1].push(vlerp(base, tip, 0.5)); rows[2].push(tip);
  }
  finStrip(S, rows, [0.0042, 0.0016, 0], [0, 0, 1], (r, j) => ctx.finCol(path[j].g === 2 ? 'A' : 'D', j / n, r === 0 ? 0.25 : 0.8, j, r), 0, 1);
}

export function teeth(ctx, list, col = '#f2efe4') {
  const c = C(col);
  for (const t of list) {
    for (const side of [1, -1]) {
      const at = ctx.surfAt(t.u, t.yn, side);
      const p0 = madd(at.p, at.n, t.inset ?? -0.002);
      const d = norm(add([t.dir[0], t.dir[1], t.dir[2] * side], mul(at.n, t.out ?? 0.2)));
      tube(ctx.S, [p0, madd(p0, d, t.len)], [t.r, 0], 3, c, 0, 4);
    }
  }
}

export function scutes(ctx, o) {
  const col = C(o.col);
  const put = (at, r, st) => dome(ctx.S, ctx.caster, at.p, at.n, r, { seg: 4, rings: [[1, -0.15]], apex: o.apex ?? 0.7, stretch: st, cols: [col], kind: 5 });
  const D = o.dorsal;
  for (let i = 0; i < D.n; i++) put(ctx.surfRad(lerp(D.u0, D.u1, i / (D.n - 1)), 0), D.r * lerp(1.1, 0.75, i / D.n), 1.35);
  for (const row of [o.lateral, o.ventral]) {
    for (const side of [1, -1]) {
      for (let i = 0; i < row.n; i++) {
        const f = i / (row.n - 1);
        put(ctx.surfAt(lerp(row.u0, row.u1, f), row.yn + (row.dy || 0) * f, side), row.r * lerp(1, 0.7, f), 1.5);
      }
    }
  }
}

export const rocketProf = (t) => {
  const R = 0.072;
  const r = t < 0.3 ? R * Math.pow(Math.sin((t / 0.3) * Math.PI * 0.5), 0.62) : R * (1 - 0.1 * smooth(0.93, 1, t));
  return { ht: r, hb: r, w: r, c: 0 };
};

export function rocket(ctx) {
  const { S } = ctx;
  const R = 0.072, black = C('#1b1b1f');
  for (let q = 0; q < 4; q++) {
    const ang = (q * Math.PI) / 2;
    const rad = [0, Math.cos(ang), Math.sin(ang)];
    const nrm = cross([1, 0, 0], rad);
    const P = (u, r) => [0.5 - u, rad[1] * r, rad[2] * r];
    const root = [P(0.6, R * 0.8), P(0.83, R * 0.76)];
    const tip = [P(0.785, R + 0.088), P(0.885, R + 0.09)];
    finStrip(S, [root, tip], [0.0065, 0], nrm, () => black, 0, 1);
  }
  const us = [0.832, 0.87, 0.925, 1.0], ro = [0.041, 0.045, 0.053, 0.064];
  const seg = 10;
  const ring = (u, r) => Array.from({ length: seg }, (_, k) => { const a = (k / seg) * Math.PI * 2; return [0.5 - u, Math.cos(a) * r, Math.sin(a) * r]; });
  const O = us.map((u, i) => ring(u, ro[i])), I = us.map((u, i) => ring(u, ro[i] - 0.0055));
  const metal = [C('#4a4a50'), C('#3a3a40'), C('#2e2e33')];
  const hot = [C('#fff3b8'), C('#ffd255'), C('#ff9a2a')];
  for (let i = 0; i < us.length - 1; i++) {
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg;
      const a = O[i][k], b = O[i][k1], c = O[i + 1][k1], d = O[i + 1][k];
      const m = vlerp(a, c, 0.5);
      S.quad(a, b, c, d, metal[i].clone().multiplyScalar(k & 1 ? 0.92 : 1), 0, [0, m[1], m[2]], 1);
      const e = I[i][k], f = I[i][k1], g = I[i + 1][k1], h = I[i + 1][k];
      const mi = vlerp(e, g, 0.5);
      S.quad(e, f, g, h, hot[i], 1 - i * 0.12, [-0.4, -mi[1], -mi[2]], 1);
    }
  }
  const last = us.length - 1;
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    S.quad(O[last][k], O[last][k1], I[last][k1], I[last][k], C('#55555c'), 0, [-1, 0, 0], 1);
  }
  const ctr = [0.5 - us[0] - 0.004, 0, 0];
  for (let k = 0; k < seg; k++) S.tri(ctr, I[0][k], I[0][(k + 1) % seg], C('#fffbe6'), 1, [-1, 0, 0], 1);
}

const FIRE = ['#ff3a0e', '#ff6512', '#ff9419', '#ffbf2c', '#ffe25a', '#fff6bc'].map(C);
export function fireRamp(h) {
  const x = clamp(h, 0, 1) * (FIRE.length - 1);
  const i = Math.min(FIRE.length - 2, Math.floor(x));
  return mixC(FIRE[i], FIRE[i + 1], x - i);
}
export function fireHeat(f) {
  return clamp(1.05 - 0.72 * Math.pow(Math.abs(f.yn), 1.35) - 0.28 * smooth(0.5, 0.82, f.u) + (vnoise(f.u * 15, f.yn * 3 + f.side * 2, 5) - 0.5) * 0.4, 0, 1);
}
export const fireFinCol = (lo = 0.15) => (r, j, R) => fireRamp(lerp(0.78, lo, (r + 0.5) / R) + (hh(j, r, 77) - 0.5) * 0.12);
export const fireFinGlow = (r, j, R = 2) => lerp(0.95, 0.5, (r + 0.5) / R);

function boxPrism(S, x0, x1, y0, y1, z0, z1, col, kind) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  faces.forEach((f, i) => {
    const q = f.map((k) => v[k]);
    const m = mul(add(add(q[0], q[1]), add(q[2], q[3])), 0.25);
    S.quad(q[0], q[1], q[2], q[3], col.clone().multiplyScalar(i === 1 ? 1.05 : i === 0 ? 0.9 : 1), 0, sub(m, [cx, cy, cz]), kind);
  });
}

function sliceX(poly, y) {
  let a = Infinity, b = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) continue;
    const x = p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]);
    a = Math.min(a, x); b = Math.max(b, x);
  }
  return a < b ? [a, b] : null;
}

export function printedBody(ctx) {
  const { sp, prof, S } = ctx;
  const green = C(sp.filament);
  const NL = sp.layers;
  let yMin = Infinity, yMax = -Infinity;
  const U = [];
  for (let i = 0; i <= 240; i++) {
    const pr = prof((sp.L * i) / 240);
    U.push(pr);
    yMin = Math.min(yMin, pr.c - pr.hb); yMax = Math.max(yMax, pr.c + pr.ht);
  }
  const lh = (yMax - yMin) / NL;
  ctx.layer = { yMin, lh, NL, yMax };
  const K = sp.K;
  const layers = [];
  for (let k = 0; k < NL; k++) {
    const y0 = yMin + k * lh, y1 = y0 + lh, ym = (y0 + y1) / 2;
    const inside = U.filter((pr) => ym <= pr.c + pr.ht && ym >= pr.c - pr.hb);
    if (inside.length < 2) continue;
    const ua = inside[0].u, ub = inside[inside.length - 1].u;
    const top = [];
    for (let i = 0; i <= K; i++) {
      const f = i / K;
      const pr = prof(lerp(ua, ub, i === 0 || i === K ? f : f));
      const up = ym >= pr.c;
      const yn = clamp((ym - pr.c) / (up ? pr.ht : pr.hb), -1, 1);
      const e = up ? pr.eU : pr.eL;
      top.push([pr.x, Math.max(0.008, pr.w * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(yn), e)), 1 / e))]);
    }
    let area = 0;
    for (let i = 0; i < K; i++) area += (top[i][0] - top[i + 1][0]) * (top[i][1] + top[i + 1][1]);
    layers.push({ k, y0, y1, top, area });
  }
  let wi = 0;
  layers.forEach((L, i) => { if (L.area > layers[wi].area) wi = i; });
  layers.forEach((L, li) => {
    const { k, y0, y1, top } = L;
    const poly = [...top.map(([x, z]) => [x, z]), ...top.slice().reverse().map(([x, z]) => [x, -z])];
    const cw = shade(green, k % 2 ? 0.88 : 1);
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 1e-6) continue;
      S.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], cw.clone().multiplyScalar(1 + (hh(i, k, 5) - 0.5) * 0.05), 0, [q[1] - p[1], 0, -(q[0] - p[0])], 0);
    }
    const capT = shade(green, k % 2 ? 0.98 : 1.07), capB = shade(green, 0.8);
    for (let i = 0; i < K; i++) {
      const [xa, za] = top[i], [xb, zb] = top[i + 1];
      if (li >= wi) S.quad([xa, y1, za], [xb, y1, zb], [xb, y1, -zb], [xa, y1, -za], capT, 0, [0, 1, 0], 0);
      if (li <= wi) S.quad([xa, y0, za], [xb, y0, zb], [xb, y0, -zb], [xa, y0, -za], capB, 0, [0, -1, 0], 0);
    }
  });
}

function prismPoly(S, foot, y0, y1, col, kind) {
  const n = foot.length;
  const cx = foot.reduce((a, p) => a + p[0], 0) / n, cz = foot.reduce((a, p) => a + p[1], 0) / n, cy = (y0 + y1) / 2;
  for (let i = 0; i < n; i++) {
    const p = foot[i], q = foot[(i + 1) % n];
    const m = [(p[0] + q[0]) / 2, cy, (p[1] + q[1]) / 2];
    S.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], col, 0, sub(m, [cx, cy, cz]), kind);
  }
  for (let i = 1; i < n - 1; i++) {
    S.tri([foot[0][0], y1, foot[0][1]], [foot[i][0], y1, foot[i][1]], [foot[i + 1][0], y1, foot[i + 1][1]], shade(col, 1.07), 0, [0, 1, 0], kind);
    S.tri([foot[0][0], y0, foot[0][1]], [foot[i][0], y0, foot[i][1]], [foot[i + 1][0], y0, foot[i + 1][1]], shade(col, 0.82), 0, [0, -1, 0], kind);
  }
}

export function printedParts(ctx) {
  const { sp, prof, S } = ctx;
  const green = C(sp.filament);
  const { yMin, lh } = ctx.layer;
  const T = 0.0075;
  const lay = (y) => Math.floor((y - yMin) / lh);
  const plate = (poly) => {
    let lo = Infinity, hi = -Infinity;
    for (const p of poly) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    for (let k = lay(lo); k <= lay(hi); k++) {
      const y0 = yMin + k * lh, y1 = y0 + lh;
      const sl = sliceX(poly, (y0 + y1) / 2);
      if (!sl || sl[1] - sl[0] < 0.022) continue;
      boxPrism(S, sl[0], sl[1], y0, y1, -T, T, shade(green, k % 2 ? 0.88 : 1), 1);
    }
  };
  const top = (u) => { const pr = prof(u); return pr.c + pr.ht; };
  const bot = (u) => { const pr = prof(u); return pr.c - pr.hb; };
  const X = (u) => 0.5 - u;
  plate([[X(0.36), top(0.36) - 0.025], [X(0.41), top(0.41) + 0.1], [X(0.5), top(0.5) + 0.075], [X(0.66), top(0.66) + 0.02], [X(0.66), top(0.66) - 0.025]]);
  plate([[X(0.635), bot(0.635) + 0.025], [X(0.675), bot(0.675) - 0.07], [X(0.74), bot(0.74) - 0.035], [X(0.74), bot(0.74) + 0.025]]);
  const pe = prof(sp.L - 0.05);
  const yc = pe.c;
  plate([[X(sp.L - 0.06), yc + pe.ht * 0.85], [-0.5, yc + 0.125], [-0.445, yc + 0.01], [-0.5, yc - 0.12], [X(sp.L - 0.06), yc - pe.hb * 0.85]]);
  const slab = (u0, u1, yRef, out, sweep) => {
    const k = lay(yRef);
    const y0 = yMin + k * lh, y1 = y0 + lh, ym = (y0 + y1) / 2;
    const zAt = (u) => { const pr = prof(u); const up = ym >= pr.c; const yn = clamp((ym - pr.c) / (up ? pr.ht : pr.hb), -1, 1); return pr.w * Math.sqrt(Math.max(0, 1 - yn * yn)); };
    for (const side of [1, -1]) {
      const za = zAt(u0) - 0.012, zb = zAt(u1) - 0.012;
      const foot = [[X(u0), za], [X(u1), zb], [X(u1 + sweep), zb + out], [X(u0 + sweep * 1.4), za + out * 0.85]].map(([x, z]) => [x, z * side]);
      prismPoly(S, side > 0 ? foot : foot.reverse(), y0, y1, shade(green, k % 2 ? 0.88 : 1), 1);
    }
  };
  slab(0.2, 0.27, prof(0.23).c - 0.25 * prof(0.23).hb, 0.06, 0.06);
  slab(0.42, 0.48, prof(0.45).c - 0.7 * prof(0.45).hb, 0.045, 0.05);
  const E = sp.eye;
  for (const side of [1, -1]) {
    const pr = prof(E.u);
    const y = yMin + (lay(pr.c + E.yn * pr.ht) + 0.5) * lh;
    const hit = ctx.caster.cast([pr.x, y, 0], [0, 0, side]);
    if (!hit) continue;
    dome(S, null, hit.p, hit.n, E.r, { seg: 6, rings: [[1, -0.05], [0.62, 0.5]], apex: 0.12, cols: [shade(green, 0.92), C('#003a12')], kind: 3 });
  }
}

export function gmicroNet(ctx, o = {}) {
  const { sp, S, rings, prof } = ctx;
  const glowC = C(o.col || '#3ff2e4');
  const N = sp.N, nr = rings.length;
  const key = (i, k) => i * N + (((k % N) + N) % N);
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  };
  for (let i = 0; i < nr; i++) {
    for (let k = 0; k < N; k++) {
      link(key(i, k), key(i, k + 1));
      if (i < nr - 1) {
        link(key(i, k), key(i + 1, k));
        if ((i + k) & 1) link(key(i, k), key(i + 1, k + 1));
        else link(key(i, k + 1), key(i + 1, k));
      }
    }
  }
  const pos = (kk) => rings[Math.floor(kk / N)].pts[kk % N];
  const nrm = (p) => { const pr = prof(0.5 - p[0]); return norm([0, p[1] - pr.c, p[2]]); };
  const edges = new Set(), nodes = new Set();
  const walks = o.walks ?? 5, steps = o.steps ?? 6;
  for (let w = 0; w < walks; w++) {
    let cur = key(1 + Math.floor(hh(w, 1, 9) * (nr - 3)), Math.floor(hh(w, 2, 9) * N));
    nodes.add(cur);
    for (let s = 0; s < steps; s++) {
      const nb = [...adj.get(cur)].filter((x) => Math.floor(x / N) < nr - 1);
      const nxt = nb[Math.floor(hh(w * 31 + s, 3, 9) * nb.length)];
      const ek = cur < nxt ? cur + '-' + nxt : nxt + '-' + cur;
      edges.add(ek);
      nodes.add(nxt);
      cur = nxt;
    }
  }
  for (const ek of edges) {
    const [a, b] = ek.split('-').map(Number);
    const pa = pos(a), pb = pos(b);
    ridge(S, [pa, pb], [nrm(pa), nrm(pb)], 0.0021, 0.0034, glowC, 1, 6);
  }
  for (const kk of nodes) {
    const p = pos(kk);
    dome(S, null, p, nrm(p), 0.0095, { seg: 4, rings: [[1, -0.45]], apex: 0.95, cols: [glowC], glows: [1], kind: 6 });
  }
}

export function monster(ctx) {
  const { sp, prof, S } = ctx;
  const skin = C('#1e2c1b'), skin2 = C('#121a10'), inner = C('#4a1214');
  const hinge = 0.2, prH = prof(hinge);
  const hp = [prH.x, prH.c - prH.hb * 0.45, 0];
  const open = 0.36, len = 0.2, n = 5;
  const rings = [];
  for (let s = 0; s <= n; s++) {
    const f = s / n;
    const c = [hp[0] + Math.cos(open) * len * f, hp[1] - Math.sin(open) * len * f, 0];
    const hw = lerp(prH.w * 0.92, prH.w * 0.32, Math.pow(f, 1.2));
    const dp = lerp(0.07, 0.03, f);
    const ring = [[c[0], c[1], hw], [c[0], c[1] - dp * 0.55, hw * 0.92], [c[0], c[1] - dp, hw * 0.42], [c[0], c[1] - dp, -hw * 0.42], [c[0], c[1] - dp * 0.55, -hw * 0.92], [c[0], c[1], -hw]];
    rings.push({ c, ring });
  }
  for (let s = 0; s < n; s++) {
    const A = rings[s], B = rings[s + 1];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      const a = A.ring[k], b = A.ring[k1], c = B.ring[k1], d = B.ring[k];
      const m = vlerp(a, c, 0.5);
      const ctr = vlerp(A.c, B.c, 0.5);
      const isTop = k === 5;
      const want = isTop ? [0, 1, 0] : sub(m, add(ctr, [0, -0.01, 0]));
      S.quad(a, b, c, d, isTop ? inner : (k === 2 ? skin2 : skin), 0, want, 0);
    }
  }
  const tipR = rings[n].ring, tipC = add(rings[n].c, [0.012, -0.012, 0]);
  for (let k = 0; k < 6; k++) S.tri(tipR[k], tipR[(k + 1) % 6], tipC, skin, 0, [1, -0.3, 0], 0);
  const tooth = C('#e9e3c6');
  for (let s = 1; s < n; s++) {
    const R = rings[s].ring;
    for (const side of [0, 5]) {
      const p0 = R[side];
      tube(S, [add(p0, [0, -0.004, 0]), add(p0, [0.004, 0.032 - s * 0.003, side === 0 ? -0.004 : 0.004])], [0.0075, 0], 3, tooth, 0, 4);
    }
  }
  teeth(ctx, [0.03, 0.06, 0.09, 0.12, 0.155].map((u, i) => ({ u, yn: -0.62, dir: [0.1, -1, -0.15], len: 0.038 - i * 0.003, r: 0.0085, out: 0.1 })), '#e9e3c6');
  const tent = (u, yn, dir, droop, ln, from) => {
    for (const side of [1, -1]) {
      let at;
      if (from === 'jaw') {
        const R = rings[Math.round(u)].ring;
        const p = side > 0 ? R[1] : R[4];
        at = { p, n: [0, -0.5, side * 0.8] };
      } else at = ctx.surfAt(u, yn, side);
      let d = norm([dir[0], dir[1], dir[2] * side]);
      const pts = [at.p];
      const segs = 5;
      for (let i = 0; i < segs; i++) {
        pts.push(madd(pts[pts.length - 1], d, ln / segs));
        d = norm(add(d, mul([droop[0], droop[1], droop[2] * side], 1 / segs + i * 0.05)));
      }
      tube(S, pts, pts.map((_, i) => 0.009 * Math.pow(1 - i / segs, 0.6)), 3, (i) => mixC(C('#2e4028'), C('#5a6e3a'), i / segs), 0, 4);
    }
  };
  tent(3, 0, [-0.2, -1, 0.35], [-1.2, 0.6, 0.4], 0.2, 'jaw');
  tent(5, 0, [0.1, -1, 0.15], [-0.9, 0.5, -0.5], 0.17, 'jaw');
  tent(0.17, -0.25, [-0.3, -0.6, 0.8], [-1.0, -0.2, -0.4], 0.16);
  const plateC = C('#4a5638'), plateE = C('#2c3524');
  const rows = [[0.27, 0.66, 0.28, 4], [0.33, 0.62, -0.28, 3]];
  for (const [u0, u1, yn, cnt] of rows) {
    for (const side of [1, -1]) {
      for (let i = 0; i < cnt; i++) {
        const at = ctx.surfAt(lerp(u0, u1, i / Math.max(1, cnt - 1)), yn, side);
        dome(S, ctx.caster, at.p, at.n, 0.034, { seg: 4, rot: Math.PI / 4, stretch: 1.25, rings: [[1, -0.1], [0.62, 0.16]], apex: 0.2, cols: [plateE, plateC], kind: 5 });
      }
    }
  }
}
