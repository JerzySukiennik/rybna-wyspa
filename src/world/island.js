// Rybna Wyspa: the island terrain (stepped rocky cliffs, beaches, flat grass plateau), its collider data and the height texture for the water.

import * as THREE from 'three';
import { fbm, noise2, smooth, clamp, hash2 } from '../util.js';

export const LAND = 1.6;
export const ISLAND_R = 25;
export const SPAN = 100;
const CELL = 1.5;

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
  return smooth(0.42, 0.62, n + south * 0.35);
}

function stepped(s) {
  if (s <= 0) return -0.4 + s * 0.6;
  const t1 = smooth(0.25, 0.9, s);
  const t2 = smooth(3.0, 3.9, s);
  return -0.4 + (LAND * 0.48 + 0.4) * t1 + (LAND * 0.52) * t2;
}

function beach(s) {
  if (s <= 0) return 0.06 + s * 0.16;
  return 0.06 + (LAND - 0.06) * smooth(0.6, 7, s);
}

export function islandHeight(x, z) {
  const s = coastDist(x, z);
  if (s < -14) return -4.5;
  const b = beachiness(x, z);
  let h = stepped(s) * (1 - b) + beach(s) * b;
  if (s < 0) h = Math.max(-4.5, h);
  const rim = smooth(3.8, 5.2, s) * (1 - smooth(6.4, 8.2, s)) * smooth(-2, -8, z);
  const hill = Math.max(0, fbm(x * 0.09 + 9, z * 0.09 - 4, 3, 5) - 0.46) * 7 * rim;
  const terr = Math.floor(hill / 1.2) * 1.2 + smooth(0.75, 1, (hill / 1.2) % 1) * 1.2;
  h += terr;
  if (s > 5) h += (noise2(x * 0.12, z * 0.12, 9) - 0.5) * 0.06;
  return h;
}

const PATHS = [
  [[0, 13], [-4.5, 12.5], [-9.5, 13.2]],
  [[0, 13], [2.5, 6], [5, 1.6]],
  [[5, -7.4], [3.5, -14], [2, -21]],
  [[0, 13], [-1, 18], [-2, 23]],
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
  return best + (noise2(x * 0.4, z * 0.4, 77) - 0.5) * 0.7;
}

export function isBuildable(x, z) {
  return coastDist(x, z) > 3;
}

const PAL = {
  grass: new THREE.Color('#82ab3c'),
  grass2: new THREE.Color('#76a136'),
  grassHi: new THREE.Color('#93b946'),
  path: new THREE.Color('#b99c68'),
  path2: new THREE.Color('#a98f5e'),
  rock: new THREE.Color('#3f6f62'),
  rock2: new THREE.Color('#355f56'),
  rockTop: new THREE.Color('#5d8a5a'),
  sand: new THREE.Color('#f2e3a4'),
  wet: new THREE.Color('#d6c98e'),
  under: new THREE.Color('#9fd6b8'),
};

const nrm = new THREE.Vector3();
const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();

function faceColor(ax, ay, az, bx, by, bz, cx, cy, cz, out) {
  e1.set(bx - ax, by - ay, bz - az);
  e2.set(cx - ax, cy - ay, cz - az);
  nrm.crossVectors(e1, e2).normalize();
  const slope = 1 - Math.abs(nrm.y);
  const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mz = (az + bz + cz) / 3;
  const s = coastDist(mx, mz);
  const b = beachiness(mx, mz);
  if (my < -0.15) return out.copy(PAL.under).lerp(PAL.rock2, clamp(-my / 4, 0, 0.6));
  if (b > 0.5 && s < 7 && my < LAND - 0.2) return out.copy(my < 0.3 ? PAL.wet : PAL.sand);
  if (slope > 0.32) return out.copy(slope > 0.6 ? PAL.rock2 : PAL.rock);
  if (my < LAND - 0.3 && s < 4.5) return out.copy(PAL.rockTop);
  const pd = pathDist(mx, mz);
  if (pd < 0.7 && s > 3.5) return out.copy(hash2(Math.floor(mx * 2), Math.floor(mz * 2), 3) < 0.5 ? PAL.path : PAL.path2);
  const n = fbm(mx * 0.07, mz * 0.07, 2, 21);
  out.copy(PAL.grass).lerp(n > 0.55 ? PAL.grassHi : PAL.grass2, Math.abs(n - 0.5) * 1.6);
  if (my > LAND + 0.5) out.lerp(PAL.grassHi, 0.35);
  return out;
}

export function buildIsland(holes = []) {
  const n = Math.round(SPAN / CELL);
  const half = SPAN / 2;
  const vtx = new Float32Array((n + 1) * (n + 1) * 3);
  for (let iz = 0; iz <= n; iz++) {
    for (let ix = 0; ix <= n; ix++) {
      const k = iz * (n + 1) + ix;
      const edge = ix === 0 || iz === 0 || ix === n || iz === n;
      const jx = edge ? 0 : (hash2(ix, iz, 4) - 0.5) * 0.8, jz = edge ? 0 : (hash2(ix, iz, 8) - 0.5) * 0.8;
      const x = -half + ix * CELL + jx, z = -half + iz * CELL + jz;
      vtx[k * 3] = x;
      vtx[k * 3 + 1] = islandHeight(x, z);
      vtx[k * 3 + 2] = z;
    }
  }
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const push = (a, b, d) => {
    const ax = vtx[a * 3], ay = vtx[a * 3 + 1], az = vtx[a * 3 + 2];
    const bx = vtx[b * 3], by = vtx[b * 3 + 1], bz = vtx[b * 3 + 2];
    const dx = vtx[d * 3], dy = vtx[d * 3 + 1], dz = vtx[d * 3 + 2];
    if (ay < -3.8 && by < -3.8 && dy < -3.8) return;
    const mx = (ax + bx + dx) / 3, mz = (az + bz + dz) / 3;
    for (const h of holes) if ((mx - h.x) ** 2 + (mz - h.z) ** 2 < h.r * h.r) return;
    pos.push(ax, ay, az, bx, by, bz, dx, dy, dz);
    faceColor(ax, ay, az, bx, by, bz, dx, dy, dz, c);
    for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b);
    idx.push(a, b, d);
  };
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iz * (n + 1) + ix, b = a + 1, d = a + n + 1, e = d + 1;
      if ((ix + iz) & 1) { push(a, d, b); push(b, d, e); } else { push(a, d, e); push(a, e, b); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'island';

  const tn = 256;
  const tex = new Uint16Array(tn * tn);
  for (let y = 0; y < tn; y++) for (let x = 0; x < tn; x++) {
    const wx = -half + (x + 0.5) / tn * SPAN, wz = -half + (y + 0.5) / tn * SPAN;
    tex[y * tn + x] = THREE.DataUtils.toHalfFloat(clamp(islandHeight(wx, wz), -6, 6));
  }
  const heightTex = new THREE.DataTexture(tex, tn, tn, THREE.RedFormat, THREE.HalfFloatType);
  heightTex.magFilter = THREE.LinearFilter;
  heightTex.minFilter = THREE.LinearFilter;
  heightTex.needsUpdate = true;

  return { mesh, collider: { vertices: vtx, indices: new Uint32Array(idx) }, heightTex, span: SPAN };
}
