// Rybna Wyspa: shared low-poly builder (triangle soup with per-face colour, glow mask, raycast and part helpers).
import * as THREE from 'three';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const C = (h) => new THREE.Color(h);
export const mixC = (a, b, t) => a.clone().lerp(b, clamp(t, 0, 1));
export const shade = (c, k) => c.clone().multiplyScalar(k);

export function hh(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hh(xi, yi, s), b = hh(xi + 1, yi, s), c = hh(xi, yi + 1, s), d = hh(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const centroid = (a, b, c) => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];

export function basis(n) {
  const ref = Math.abs(n[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const t1 = norm(cross(ref, n));
  return [t1, cross(n, t1)];
}

export function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
export function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
export function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }

export class Soup {
  constructor() { this.p = []; this.c = []; this.g = []; this.k = []; }

  tri(a, b, c, col, glow = 0, want = null, kind = 0) {
    const n = cross(sub(b, a), sub(c, a));
    if (n[0] * n[0] + n[1] * n[1] + n[2] * n[2] < 1e-15) return;
    if (want && dot(n, want) < 0) { const t = b; b = c; c = t; }
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.c.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);
    this.g.push(glow, glow, glow);
    this.k.push(kind);
  }

  quad(a, b, c, d, col, glow = 0, want = null, kind = 0) {
    this.tri(a, b, c, col, glow, want, kind);
    this.tri(a, c, d, col, glow, want, kind);
  }

  get count() { return this.k.length; }

  append(o) {
    for (let i = 0; i < o.p.length; i++) this.p.push(o.p[i]);
    for (let i = 0; i < o.c.length; i++) this.c.push(o.c[i]);
    for (let i = 0; i < o.g.length; i++) this.g.push(o.g[i]);
    for (let i = 0; i < o.k.length; i++) this.k.push(o.k[i]);
    return this;
  }

  map(fn) {
    for (let i = 0; i < this.p.length; i += 3) {
      const r = fn([this.p[i], this.p[i + 1], this.p[i + 2]]);
      this.p[i] = r[0]; this.p[i + 1] = r[1]; this.p[i + 2] = r[2];
    }
    return this;
  }

  tris(kind = null) {
    const out = [];
    for (let t = 0; t < this.k.length; t++) {
      if (kind !== null && this.k[t] !== kind) continue;
      const i = t * 9, p = this.p;
      out.push([[p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]]]);
    }
    return out;
  }

  bounds(kind = null) {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let t = 0; t < this.k.length; t++) {
      if (kind !== null && this.k[t] !== kind) continue;
      for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) {
        const x = this.p[t * 9 + v * 3 + a];
        if (x < mn[a]) mn[a] = x;
        if (x > mx[a]) mx[a] = x;
      }
    }
    return { min: mn, max: mx };
  }

  geometry(bend = null) {
    const n = this.p.length / 3;
    const pos = new Float32Array(this.p);
    const nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      const o = i * 3;
      const ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2];
      const vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      for (let v = 0; v < 3; v++) { nor[o + v * 3] = nx; nor[o + v * 3 + 1] = ny; nor[o + v * 3 + 2] = nz; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.c), 3));
    if (bend) {
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) b[i] = bend(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      g.setAttribute('aBend', new THREE.BufferAttribute(b, 1));
    }
    g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(this.g), 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

export class Caster {
  constructor(tris, inner) { this.t = tris; this.inner = inner; }

  cast(o, d) {
    let bt = Infinity, best = null;
    for (const tr of this.t) {
      const a = tr[0];
      const e1 = sub(tr[1], a), e2 = sub(tr[2], a);
      const pv = cross(d, e2);
      const det = dot(e1, pv);
      if (Math.abs(det) < 1e-14) continue;
      const inv = 1 / det;
      const tv = sub(o, a);
      const u = dot(tv, pv) * inv;
      if (u < -1e-6 || u > 1 + 1e-6) continue;
      const qv = cross(tv, e1);
      const v = dot(d, qv) * inv;
      if (v < -1e-6 || u + v > 1 + 1e-6) continue;
      const t = dot(e2, qv) * inv;
      if (t > 1e-7 && t < bt) { bt = t; best = tr; }
    }
    if (!best) return null;
    let n = norm(cross(sub(best[1], best[0]), sub(best[2], best[0])));
    if (dot(n, d) < 0) n = mul(n, -1);
    return { p: madd(o, d, bt), n, t: bt };
  }

  project(q) {
    const o = this.inner(q);
    const d = sub(q, o);
    if (vlen(d) < 1e-9) return { p: q, n: [0, 0, 1] };
    return this.cast(o, norm(d)) || { p: q, n: norm(d) };
  }
}

export function finStrip(S, rows, thick, nrm, colorFn, glow = 0, kind = 1) {
  const R = rows.length - 1, m = rows[0].length - 1;
  const off = (p, t, s) => madd(p, nrm, t * s);
  const gf = typeof glow === 'function' ? glow : () => glow;
  for (let r = 0; r < R; r++) {
    for (let j = 0; j < m; j++) {
      for (const s of [1, -1]) {
        const a = off(rows[r][j], thick[r], s), b = off(rows[r][j + 1], thick[r], s);
        const c = off(rows[r + 1][j + 1], thick[r + 1], s), d = off(rows[r + 1][j], thick[r + 1], s);
        const col = colorFn(r, j, s), g = gf(r, j);
        const w = mul(nrm, s);
        if ((r + j) & 1) { S.tri(a, b, c, col, g, w, kind); S.tri(a, c, d, col, g, w, kind); }
        else { S.tri(a, b, d, col, g, w, kind); S.tri(b, c, d, col, g, w, kind); }
      }
    }
  }
  for (const j of [0, m]) {
    const jn = j === 0 ? 1 : m - 1;
    for (let r = 0; r < R; r++) {
      if (thick[r] <= 0 && thick[r + 1] <= 0) continue;
      const out = norm(sub(vlerp(rows[r][j], rows[r + 1][j], 0.5), vlerp(rows[r][jn], rows[r + 1][jn], 0.5)));
      const a = off(rows[r][j], thick[r], 1), b = off(rows[r][j], thick[r], -1);
      const c = off(rows[r + 1][j], thick[r + 1], -1), d = off(rows[r + 1][j], thick[r + 1], 1);
      const col = colorFn(r, j === 0 ? 0 : m - 1, 1), g = gf(r, j === 0 ? 0 : m - 1);
      S.tri(a, b, c, col, g, out, kind);
      S.tri(a, c, d, col, g, out, kind);
    }
  }
}

export function ridge(S, pts, nrms, w, h, col, glow = 0, kind = 2, caps = true) {
  const n = pts.length;
  const T = [], L = [], R = [], tans = [], sides = [];
  for (let i = 0; i < n; i++) {
    const tan = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const side = norm(cross(nrms[i], tan));
    tans.push(tan); sides.push(side);
    T.push(madd(pts[i], nrms[i], h));
    const base = madd(pts[i], nrms[i], -h * 0.7);
    L.push(madd(base, side, w));
    R.push(madd(base, side, -w));
  }
  const cf = typeof col === 'function' ? col : () => col;
  for (let i = 0; i < n - 1; i++) {
    const c = cf(i);
    S.quad(L[i], L[i + 1], T[i + 1], T[i], c, glow, add(sides[i], nrms[i]), kind);
    S.quad(R[i], T[i], T[i + 1], R[i + 1], c, glow, sub(nrms[i], sides[i]), kind);
  }
  if (!caps) return;
  S.tri(L[0], R[0], T[0], cf(0), glow, mul(tans[0], -1), kind);
  S.tri(L[n - 1], T[n - 1], R[n - 1], cf(n - 2), glow, tans[n - 1], kind);
}

export function dome(S, caster, P, n, r, o = {}) {
  const seg = o.seg || 8, st = o.stretch || 1, rot = o.rot || 0;
  const rings = o.rings || [[1, -0.06], [0.55, 0.2]];
  const cols = o.cols, glows = o.glows || cols.map(() => 0);
  const apex = o.apex ?? 0.3;
  const [t1, t2] = o.basis || basis(n);
  const R = rings.map(([f, hgt]) => {
    const ring = [];
    for (let j = 0; j < seg; j++) {
      const a = rot + (j / seg) * Math.PI * 2;
      const q = add(P, add(mul(t1, Math.cos(a) * r * f * st), mul(t2, Math.sin(a) * r * f)));
      const hit = caster ? caster.project(madd(q, n, 0.001)) : { p: q, n };
      ring.push(madd(hit.p, n, hgt * r));
    }
    return ring;
  });
  const top = madd(caster ? caster.project(madd(P, n, 0.001)).p : P, n, apex * r);
  const kind = o.kind ?? 3;
  for (let k = 0; k < R.length - 1; k++) {
    for (let j = 0; j < seg; j++) {
      const a = R[k][j], b = R[k][(j + 1) % seg], c = R[k + 1][(j + 1) % seg], d = R[k + 1][j];
      const w = sub(centroid(a, b, c), sub(P, mul(n, r)));
      S.quad(a, b, c, d, cols[k], glows[k], w, kind);
    }
  }
  const last = R[R.length - 1];
  for (let j = 0; j < seg; j++) {
    S.tri(last[j], last[(j + 1) % seg], top, cols[cols.length - 1], glows[glows.length - 1], n, kind);
  }
}

export function tube(S, pts, radii, sides, col, glow = 0, kind = 4, o = {}) {
  const n = pts.length;
  const rings = [];
  let prevU = null;
  for (let i = 0; i < n; i++) {
    const tan = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    let u;
    if (prevU) { u = norm(sub(prevU, mul(tan, dot(prevU, tan)))); }
    else { const ref = Math.abs(tan[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; u = norm(cross(tan, ref)); }
    prevU = u;
    const v = cross(tan, u);
    const ring = [];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2 + (o.twist || 0);
      ring.push(add(pts[i], add(mul(u, Math.cos(a) * radii[i]), mul(v, Math.sin(a) * radii[i] * (o.flat || 1)))));
    }
    rings.push(ring);
  }
  const cf = typeof col === 'function' ? col : () => col;
  for (let i = 0; i < n - 1; i++) {
    const axisA = pts[i], axisB = pts[i + 1];
    for (let j = 0; j < sides; j++) {
      const a = rings[i][j], b = rings[i][(j + 1) % sides], c = rings[i + 1][(j + 1) % sides], d = rings[i + 1][j];
      const mid = vlerp(axisA, axisB, 0.5);
      const w = sub(centroid(a, b, c), mid);
      const cc = cf(i, j);
      if (radii[i + 1] <= 1e-6) S.tri(a, b, c, cc, glow, w, kind);
      else if (radii[i] <= 1e-6) S.tri(a, c, d, cc, glow, w, kind);
      else S.quad(a, b, c, d, cc, glow, w, kind);
    }
  }
  if (o.capStart && radii[0] > 1e-6) {
    const tan = norm(sub(pts[0], pts[1]));
    for (let j = 1; j < sides - 1; j++) S.tri(rings[0][0], rings[0][j], rings[0][j + 1], o.capCol || cf(0, 0), glow, tan, kind);
  }
  if (o.capEnd && radii[n - 1] > 1e-6) {
    const tan = norm(sub(pts[n - 1], pts[n - 2]));
    for (let j = 1; j < sides - 1; j++) S.tri(rings[n - 1][0], rings[n - 1][j], rings[n - 1][j + 1], o.capCol || cf(n - 2, 0), glow, tan, kind);
  }
  return rings;
}

export function blob(S, center, radii, detail, colFn, o = {}) {
  const src = new THREE.IcosahedronGeometry(1, detail).getAttribute('position');
  const key = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const jit = new Map();
  const seed = o.seed || 0, amt = o.jitter ?? 0.12;
  const P = (x, y, z) => {
    const k = key(x, y, z);
    if (!jit.has(k)) {
      const h = hh(Math.round(x * 997), Math.round(y * 991), Math.round(z * 983) + seed * 7919);
      const s = 1 + (h - 0.5) * 2 * amt;
      let py = y;
      if (o.flatBottom !== undefined && py < o.flatBottom) py = o.flatBottom + (py - o.flatBottom) * 0.25;
      jit.set(k, [center[0] + x * radii[0] * s, center[1] + py * radii[1] * s, center[2] + z * radii[2] * s]);
    }
    return jit.get(k);
  };
  for (let i = 0; i < src.count; i += 3) {
    const a = P(src.getX(i), src.getY(i), src.getZ(i));
    const b = P(src.getX(i + 1), src.getY(i + 1), src.getZ(i + 1));
    const c = P(src.getX(i + 2), src.getY(i + 2), src.getZ(i + 2));
    const m = centroid(a, b, c);
    const w = sub(m, center);
    S.tri(a, b, c, colFn(m, w, i / 3), o.glow || 0, w, o.kind || 0);
  }
}

export function hexa(S, corners, col, glow = 0, kind = 0) {
  const [a, b, c, d, e, f, g, h] = corners;
  const ctr = mul(corners.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / 8);
  const cf = typeof col === 'function' ? col : () => col;
  const faces = [[a, b, c, d], [h, g, f, e], [a, e, f, b], [b, f, g, c], [c, g, h, d], [d, h, e, a]];
  faces.forEach((q, i) => {
    const m = mul(add(add(q[0], q[1]), add(q[2], q[3])), 0.25);
    S.quad(q[0], q[1], q[2], q[3], cf(i), glow, sub(m, ctr), kind);
  });
}

export function box(S, cx, cy, cz, sx, sy, sz, col, glow = 0, kind = 0) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
  hexa(S, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col, glow, kind);
}
