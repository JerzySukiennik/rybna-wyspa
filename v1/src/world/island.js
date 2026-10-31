// Rybna Wyspa: the river island terrain (earth banks with mud at the waterline, sandy spits, a flat meadow plateau, sunken paths), its collider data and the height texture for the water.

import * as THREE from 'three';
import { fbm, noise2, smooth, clamp, hash2 } from '../util.js';
import { terrainMaterial } from '../render/materials.js';

export const LAND = 1.6;
export const ISLAND_R = 25;
export const SPAN = 100;
const CELL = 0.75;

export const SPOTS = {
  spawn: new THREE.Vector3(0, LAND, 11),
  shop: new THREE.Vector3(-9.5, LAND, 11.5),
  sell: new THREE.Vector3(5, LAND, -3),
  pier: new THREE.Vector3(2, LAND, -24),
};

function coastR(a) {
  return ISLAND_R + (fbm(Math.cos(a) * 2.2 + 3, Math.sin(a) * 2.2 + 7, 4, 11) - 0.5) * 8;
}

export function coastDist(x, z) {
  const r = Math.pow(Math.pow(Math.abs(x), 3.2) + Math.pow(Math.abs(z), 3.2), 1 / 3.2);
  return coastR(Math.atan2(z, x)) - r;
}

export function beachiness(x, z) {
  const a = Math.atan2(z, x);
  const n = fbm(Math.cos(a) * 1.6 + 11, Math.sin(a) * 1.6 - 5, 3, 31);
  const south = Math.max(0, Math.sin(a)) * 0.55;
  return smooth(0.46, 0.66, n + south * 0.3);
}

function stepped(s) {
  if (s <= 0) return 0.04 + s * 0.32;
  return 0.04 + 0.48 * smooth(0, 2.6, s) + (LAND - 0.52) * smooth(1.6, 7.2, s);
}

const HILLS = [[14, -12, 6.5, 1.5], [-15.5, 4, 5.5, 1.1], [9, 15, 4.5, 0.7]];

function beach(s) {
  if (s <= 0) return 0.06 + s * 0.16;
  return 0.06 + (LAND - 0.06) * smooth(0.6, 7, s);
}

const PATHS = [
  [[0, 13], [-4.5, 12.5], [-9.5, 13.2]],
  [[0, 13], [2.5, 6], [5, 1.6]],
  [[5, -7.4], [3.5, -14], [2, -21]],
  [[0, 13], [-1, 18], [-2, 23]],
  [[2.5, 6], [6.2, 4.4], [9.6, 3.0]],
];

export function pathDist(x, z) {
  let best = 1e9;
  for (const pl of PATHS) {
    for (let i = 0; i < pl.length - 1; i++) {
      const [ax, az] = pl[i], [bx, bz] = pl[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
      if (d < best) best = d;
    }
  }
  return best + (noise2(x * 0.35, z * 0.35, 77) - 0.5) * 0.16;
}

const FLAT = [[5, -3, 7.5], [-9.5, 11.5, 5.5], [12.6, 2.6, 5.5], [0, 11, 4.5], [2, -21, 4]];

function relief(x, z, s) {
  let k = smooth(5, 9, s);
  for (const [fx, fz, r] of FLAT) k *= smooth(r, r + 4, Math.hypot(x - fx, z - fz));
  if (k <= 0) return 0;
  return (fbm(x / 15 + 3.1, z / 15 - 1.7, 3, 41) - 0.5) * 0.9 * k;
}

export function islandHeight(x, z) {
  const s = coastDist(x, z);
  if (s < -14) return -4.5;
  const b = beachiness(x, z);
  let h = stepped(s) * (1 - b) + beach(s) * b;
  if (s < 0) h = Math.max(-4.5, h);
  for (const [hx, hz, hr, hh] of HILLS) {
    const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (hr * hr);
    if (d2 < 4) h += hh * Math.exp(-d2 * 1.6) * smooth(1, 4, s);
  }
  if (s > 5) h += relief(x, z, s);
  if (s > 3.5) h -= 0.08 * (1 - smooth(0.55, 1.05, pathDist(x, z))) * smooth(3.5, 5, s);
  return h;
}

export function isBuildable(x, z) {
  return coastDist(x, z) > 3;
}

const C = (h) => new THREE.Color(h);
const PAL = {
  grass: C('#7fa046'),
  grass2: C('#6e9440'),
  grassHi: C('#8ea852'),
  meadow: C('#8a9a55'),
  dry: C('#9a9a62'),
  trod: C('#8a8a52'),
  path: C('#a88a5e'),
  path2: C('#9c7f56'),
  bank: C('#6b6a48'),
  earth: C('#8b7152'),
  earth2: C('#76603f'),
  ledge: C('#6f8442'),
  sand: C('#cdbd8f'),
  wetSand: C('#a3946c'),
  mud: C('#7a6a4f'),
  wetMud: C('#594d3b'),
  under: C('#4c4f37'),
};

const nrm = new THREE.Vector3();
const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();
const tmpC = new THREE.Color();

function faceColor(ax, ay, az, bx, by, bz, cx, cy, cz, out) {
  e1.set(bx - ax, by - ay, bz - az);
  e2.set(cx - ax, cy - ay, cz - az);
  nrm.crossVectors(e1, e2).normalize();
  return colorAt((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3, 1 - Math.abs(nrm.y), out);
}

function colorAt(mx, my, mz, slope, out) {
  const s = coastDist(mx, mz);
  const b = beachiness(mx, mz);
  if (my < -0.15) return out.copy(PAL.under).lerp(PAL.wetMud, clamp(1 + my / 1.2, 0, 1));
  if (b > 0.5 && s < 7 && my < LAND - 0.2) return out.copy(PAL.sand).lerp(PAL.wetSand, smooth(0.6, 0.12, my));
  if (my < 0.5) return out.copy(PAL.wetMud).lerp(PAL.bank, smooth(0.05, 0.5, my));
  if (slope > 0.34) return out.copy(slope > 0.6 ? PAL.earth2 : PAL.earth).lerp(PAL.bank, smooth(0.95, 0.45, my) * 0.7);
  const z1 = fbm(mx / 12 + 4, mz / 12 - 6, 2, 21);
  const z2 = fbm(mx / 7 - 2, mz / 7 + 5, 2, 24);
  out.copy(PAL.grass).lerp(PAL.grass2, smooth(0.5, 0.36, z1)).lerp(PAL.grassHi, smooth(0.52, 0.66, z1) * 0.85).lerp(PAL.dry, smooth(0.6, 0.72, z2) * 0.45);
  out.lerp(PAL.bank, smooth(2.6, 1.1, s) * 0.8);
  out.lerp(PAL.meadow, smooth(6.5, 3.5, s) * 0.4);
  if (s > 3.5) {
    const pd = pathDist(mx, mz);
    out.lerp(PAL.trod, smooth(1.5, 0.95, pd) * 0.5);
    out.lerp(noise2(mx * 0.5, mz * 0.5, 3) < 0.5 ? PAL.path : PAL.path2, smooth(1.0, 0.72, pd));
  }
  return out;
}

function occlusion(x, z, h) {
  let sum = 0;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    sum += islandHeight(x + Math.cos(a) * 1.7, z + Math.sin(a) * 1.7);
  }
  const d = sum / 6 - h;
  return clamp(1 - Math.max(0, d) * 0.32 + Math.max(0, -d) * 0.08, 0.68, 1.05);
}

export function buildIsland(holes = []) {
  const n = Math.round(SPAN / CELL);
  const half = SPAN / 2;
  const N = n + 1;
  const vtx = new Float32Array(N * N * 3);
  const ao = new Float32Array(N * N);
  const vcol = new Float32Array(N * N * 3);
  const vc = new THREE.Color();
  for (let iz = 0; iz <= n; iz++) {
    for (let ix = 0; ix <= n; ix++) {
      const k = iz * N + ix;
      const edge = ix === 0 || iz === 0 || ix === n || iz === n;
      const jx = edge ? 0 : (hash2(ix, iz, 4) - 0.5) * 0.5, jz = edge ? 0 : (hash2(ix, iz, 8) - 0.5) * 0.5;
      const x = -half + ix * CELL + jx, z = -half + iz * CELL + jz;
      const h = islandHeight(x, z);
      vtx[k * 3] = x;
      vtx[k * 3 + 1] = h;
      vtx[k * 3 + 2] = z;
      ao[k] = h > -4.4 ? occlusion(x, z, h) : 1;
      const sl = Math.min(0.33, Math.hypot(islandHeight(x + 0.4, z) - h, islandHeight(x, z + 0.4) - h) / 0.4 * 0.5);
      colorAt(x, h, z, sl, vc);
      vcol[k * 3] = vc.r; vcol[k * 3 + 1] = vc.g; vcol[k * 3 + 2] = vc.b;
    }
  }
  const pos = [];
  const nor = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const fn = new THREE.Vector3();
  const push = (a, b, d) => {
    const ax = vtx[a * 3], ay = vtx[a * 3 + 1], az = vtx[a * 3 + 2];
    const bx = vtx[b * 3], by = vtx[b * 3 + 1], bz = vtx[b * 3 + 2];
    const dx = vtx[d * 3], dy = vtx[d * 3 + 1], dz = vtx[d * 3 + 2];
    if (ay < -3.8 && by < -3.8 && dy < -3.8) return;
    const mx = (ax + bx + dx) / 3, mz = (az + bz + dz) / 3;
    for (const h of holes) if ((mx - h.x) ** 2 + (mz - h.z) ** 2 < h.r * h.r) return;
    pos.push(ax, ay, az, bx, by, bz, dx, dy, dz);
    e1.set(bx - ax, by - ay, bz - az);
    e2.set(dx - ax, dy - ay, dz - az);
    fn.crossVectors(e1, e2).normalize();
    if (fn.y < 0) fn.negate();
    const steep = 1 - fn.y > 0.34;
    if (steep) faceColor(ax, ay, az, bx, by, bz, dx, dy, dz, c);
    const j = 1 + (hash2(a, d, 13) - 0.5) * 0.06;
    for (const v of [a, b, d]) {
      const o = ao[v] * j;
      nor.push(fn.x, fn.y, fn.z);
      if (steep) col.push(c.r * o, c.g * o, c.b * o);
      else col.push(vcol[v * 3] * o, vcol[v * 3 + 1] * o, vcol[v * 3 + 2] * o);
    }
    idx.push(a, b, d);
  };
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iz * N + ix, b = a + 1, d = a + N, e = d + 1;
      if ((ix + iz) & 1) { push(a, d, b); push(b, d, e); } else { push(a, d, e); push(a, e, b); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, terrainMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'island';

  const texN = 256;
  const tex = new Uint16Array(texN * texN);
  for (let y = 0; y < texN; y++) for (let x = 0; x < texN; x++) {
    const wx = -half + (x + 0.5) / texN * SPAN, wz = -half + (y + 0.5) / texN * SPAN;
    tex[y * texN + x] = THREE.DataUtils.toHalfFloat(clamp(islandHeight(wx, wz), -6, 6));
  }
  const heightTex = new THREE.DataTexture(tex, texN, texN, THREE.RedFormat, THREE.HalfFloatType);
  heightTex.magFilter = THREE.LinearFilter;
  heightTex.minFilter = THREE.LinearFilter;
  heightTex.needsUpdate = true;

  const hn = Math.round(SPAN / 0.8);
  const hs = new Float32Array((hn + 1) * (hn + 1));
  for (let j = 0; j <= hn; j++) for (let i = 0; i <= hn; i++) {
    const x = -half + (j / hn) * SPAN, z = -half + (i / hn) * SPAN;
    let h = islandHeight(x, z);
    for (const o of holes) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r - 0.15) ** 2) h = -4;
    hs[i + j * (hn + 1)] = h;
  }

  return { mesh, collider: { vertices: vtx, indices: new Uint32Array(idx) }, field: { n: hn, heights: hs, size: SPAN }, heightTex, span: SPAN };
}
