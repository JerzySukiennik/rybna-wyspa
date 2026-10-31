// Rybna Wyspa: the Narew around the island (far banks with embankments and mud, riparian alders and willows, reeds, fields, a village with a church, a steel truss bridge, sandbars).

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { addWet } from '../render/materials.js';
import { fbm, noise2, smooth, clamp, rng, hash2 } from '../util.js';

export function riverCenter(x) {
  return 8 + 12 * Math.sin(x * 0.0051 + 0.7) + 330 * smooth(250, 950, x) - 320 * smooth(250, 950, -x);
}

export function riverHalf(x) {
  return 130 + 10 * Math.sin(x * 0.0067 + 2.0);
}

export function bankZ(x, side) {
  return riverCenter(x) + side * riverHalf(x);
}

export function treeTop(x, side) {
  return 15 + 5 * noise2(x * 0.03, side * 7.3, 61) + 3 * noise2(x * 0.11, side * 3.1, 62);
}

export const SANDBARS = [
  { x: 74, z: -64, rx: 21, rz: 6.5, rot: 0.12 },
  { x: -86, z: 66, rx: 16, rz: 5.5, rot: -0.2 },
  { x: 160, z: 52, rx: 13, rz: 4.5, rot: 0.05 },
];

export const RIVER_GLSL = /* glsl */`
float rvCenter(float x) { return 8.0 + 12.0 * sin(x * 0.0051 + 0.7) + 330.0 * smoothstep(250.0, 950.0, x) - 320.0 * smoothstep(250.0, 950.0, -x); }
float rvHalf(float x) { return 130.0 + 10.0 * sin(x * 0.0067 + 2.0); }
float rvBank(float x, float side) { return rvCenter(x) + side * rvHalf(x); }
float rvBankDist(vec2 p) { float c = rvCenter(p.x), h = rvHalf(p.x); return h - abs(p.y - c); }
`;

const BANK_D = [-12, -4, 0, 1.4, 3.2, 5.5, 8.5, 13, 20, 30, 44, 62, 85, 115, 150, 200, 270, 360, 480, 650, 900];

function bankShape(x, side) {
  const e = 1.4 + 3.4 * smooth(0.38, 0.62, fbm(x * 0.004 + side * 9, 3.3, 3, 71));
  const beachK = smooth(0.6, 0.72, noise2(x * 0.006 + side * 5, 1.7, 72));
  return { e, beachK };
}

function bankHeight(d, x, side, sh) {
  if (d <= 0) return Math.max(-2.4, d * 0.24) + 0.02;
  const emb = 0.05 + 0.42 * smooth(0, 3.2, d) + (sh.e - 0.47) * smooth(3.2, 9, d);
  const flat = 0.05 + 0.5 * smooth(0, 16, d) + sh.e * 0.55 * smooth(10, 44, d);
  let h = emb + (flat - emb) * sh.beachK;
  h += 0.8 * smooth(14, 170, d) + 2.2 * smooth(170, 900, d);
  h += (noise2(x * 0.05, d * 0.06, 73 + side) - 0.5) * 0.6 * smooth(6, 30, d);
  return h;
}

const C = (h) => new THREE.Color(h);
const P = {
  under: C('#4c4f37'), wetMud: C('#5a4e3c'), mud: C('#7a6a4f'), sand: C('#c9b98b'), wetSand: C('#a3946c'),
  bankGrass: C('#6f8440'), earth: C('#836a4c'), meadow: C('#8d9a50'), meadow2: C('#7c8f45'),
  wheat: C('#c2ad66'), stubble: C('#b4a27a'), plowed: C('#86704f'), crop: C('#6b8a3e'), forest: C('#4b6232'),
};

function bankColor(d, h, x, side, sh, out) {
  const n = noise2(x * 0.04, d * 0.05, 81 + side);
  if (d < -0.5) return out.copy(P.under);
  if (d < 1.4) return out.copy(sh.beachK > 0.5 ? P.wetSand : P.wetMud).lerp(sh.beachK > 0.5 ? P.sand : P.mud, smooth(-0.5, 1.4, d));
  if (d < 4) return out.copy(sh.beachK > 0.5 ? P.sand : P.mud).lerp(P.bankGrass, smooth(2.6, 4, d) * (1 - sh.beachK * 0.8));
  if (d < 10) return out.copy(P.bankGrass).lerp(P.earth, (n > 0.62 ? 0.55 : 0) * (1 - sh.beachK));
  if (d < 26) return out.copy(P.meadow).lerp(P.meadow2, n);
  const f = Math.floor(noise2((x + 31) / 95, d / 85, 83 + side) * 6.99);
  out.copy([P.meadow, P.wheat, P.crop, P.plowed, P.meadow2, P.stubble, P.wheat][f]);
  out.lerp(P.forest, smooth(330, 420, d) * 0.85);
  return out.offsetHSL(0, 0, (n - 0.5) * 0.04);
}

function buildBank(side) {
  const x0 = -1900, x1 = 1900, step = 6;
  const cols = Math.round((x1 - x0) / step) + 1;
  const rows = BANK_D.length;
  const pos = new Float32Array(cols * rows * 3);
  const col = new Float32Array(cols * rows * 3);
  const c = new THREE.Color();
  for (let i = 0; i < cols; i++) {
    const x = x0 + i * step;
    const sh = bankShape(x, side);
    const zb = bankZ(x, side);
    for (let j = 0; j < rows; j++) {
      const d = BANK_D[j];
      const h = bankHeight(d, x, side, sh);
      const k = (i * rows + j) * 3;
      pos[k] = x;
      pos[k + 1] = h;
      pos[k + 2] = zb + side * d;
      bankColor(d, h, x, side, sh, c);
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
  }
  const idx = [];
  for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) {
    const a = i * rows + j, b = a + rows, d = a + 1, e = b + 1;
    if (side > 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function bankPoint(x, side, d) {
  const sh = bankShape(x, side);
  return { x, y: bankHeight(d, x, side, sh), z: bankZ(x, side) + side * d, sh };
}

const ICO = new THREE.IcosahedronGeometry(1, 0).toNonIndexed().attributes.position.array;

function blob(g, cx, cy, cz, sx, sy, sz, color, seed) {
  const r = rng(seed);
  const jit = new Map();
  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const v = (i) => {
    const x = ICO[i], y = ICO[i + 1], z = ICO[i + 2];
    const k = key(x, y, z);
    if (!jit.has(k)) jit.set(k, 0.82 + r() * 0.3);
    const j = jit.get(k);
    return [cx + x * sx * j, cy + y * sy * j, cz + z * sz * j];
  };
  const base = new THREE.Color(color);
  const tc = new THREE.Color();
  for (let i = 0; i < ICO.length; i += 9) {
    const a = v(i), b = v(i + 3), d = v(i + 6);
    const ny = (a[1] + b[1] + d[1]) / 3 - cy;
    tc.copy(base).multiplyScalar(0.84 + 0.22 * clamp(ny / sy * 0.5 + 0.5, 0, 1) + (r() - 0.5) * 0.06);
    g.tri(a, b, d, '#' + tc.getHexString());
  }
}

function treeGeo(type) {
  const g = new Geo();
  if (type === 'alder') {
    g.cyl(0, 0, 0, 0.35, 0.22, 7, 5, '#4a4237');
    blob(g, 0, 9.5, 0, 3.6, 4.6, 3.6, '#40592c', 11);
    blob(g, 1.2, 7.5, 0.8, 2.6, 2.8, 2.6, '#3b5328', 12);
    blob(g, -1.1, 11.8, -0.5, 2.3, 2.6, 2.3, '#486233', 13);
  } else if (type === 'willow') {
    g.cyl(0, 0, 0, 0.6, 0.45, 3.2, 5, '#5c564a');
    blob(g, 0, 6.2, 0, 4.8, 3.6, 4.8, '#7d8f5c', 21);
    blob(g, 2.2, 5.2, 1.0, 3.0, 2.6, 3.0, '#86965f', 22);
    blob(g, -2.0, 5.6, -1.2, 3.2, 2.8, 3.2, '#748655', 23);
  } else if (type === 'poplar') {
    g.cyl(0, 0, 0, 0.4, 0.25, 6, 5, '#55503f');
    blob(g, 0, 12, 0, 2.2, 8.5, 2.2, '#566d33', 31);
    blob(g, 0.4, 17.5, 0.2, 1.4, 4, 1.4, '#5e7638', 32);
  } else if (type === 'pine') {
    g.cyl(0, 0, 0, 0.35, 0.2, 14, 5, '#6b4a35');
    blob(g, 0, 15.5, 0, 3.0, 3.2, 3.0, '#2f4628', 41);
    blob(g, 0.8, 13.2, 0.4, 2.2, 1.8, 2.2, '#344d2b', 42);
  } else if (type === 'birch') {
    g.cyl(0, 0, 0, 0.22, 0.14, 8, 5, '#e8e4da');
    blob(g, 0, 10, 0, 2.6, 4.2, 2.6, '#7a984a', 51);
    blob(g, 0.9, 8.4, 0.5, 1.8, 2.2, 1.8, '#83a14f', 52);
  } else if (type === 'bush') {
    blob(g, 0, 1.1, 0, 2.2, 1.4, 2.0, '#6f8350', 61);
    blob(g, 1.3, 0.9, 0.4, 1.4, 1.0, 1.4, '#7a8c58', 62);
  }
  return g.geometry({ emit: false });
}

function reedGeo() {
  const g = new Geo();
  const r = rng(91);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.3;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = 1.6 + r() * 1.4, lean = (r() - 0.5) * 0.5, w = 0.07;
    const tip = [x + lean, h, z + lean * 0.4];
    const c = r() < 0.25 ? '#a39a62' : r() < 0.5 ? '#8a8e4f' : '#7d8546';
    g.tri([x - w, 0, z], [x + w, 0, z], tip, c);
    g.tri([x, 0, z - w], [x, 0, z + w], tip, c);
    if (r() < 0.2) g.box(tip[0], h - 0.1, tip[2], 0.08, 0.35, 0.08, '#6e5236');
  }
  return g.geometry({ emit: false });
}

function forestWall(side) {
  const g = new Geo();
  const x0 = -1900, x1 = 1900, step = 9;
  const top = (x) => 9 + 4 * noise2(x * 0.012, side, 96) + 2.2 * Math.abs(Math.sin(x * 0.21 + side)) + 1.2 * noise2(x * 0.09, side, 97);
  for (let x = x0; x < x1; x += step) {
    const d0 = 470 + 50 * noise2(x * 0.004, side, 95), d1 = 470 + 50 * noise2((x + step) * 0.004, side, 95);
    const pa = bankPoint(x, side, d0), pb = bankPoint(x + step, side, d1);
    const ha = top(x), hb = top(x + step);
    g.quadN([pa.x, pa.y - 1, pa.z], [pb.x, pb.y - 1, pb.z], [pb.x, pb.y + hb, pb.z], [pa.x, pa.y + ha, pa.z], [0, 0, -side], '#3c522f');
    g.quadN([pa.x, pa.y + ha, pa.z], [pb.x, pb.y + hb, pb.z], [pb.x, pb.y + hb * 0.8, pb.z + side * 8], [pa.x, pa.y + ha * 0.8, pa.z + side * 8], [0, 1, -side], '#425a33');
  }
  return g.geometry({ emit: false });
}

function gable(g, x, y, z, w, l, wallH, roofH, yaw, wall, roof, win = true) {
  g.at(x, y, z, yaw);
  g.box(0, wallH / 2, 0, w, wallH, l, wall);
  const ov = 0.35;
  for (const s of [-1, 1]) g.quadN([s * (w / 2 + ov), wallH - 0.1, -l / 2 - ov], [s * (w / 2 + ov), wallH - 0.1, l / 2 + ov], [0, wallH + roofH, l / 2 + ov], [0, wallH + roofH, -l / 2 - ov], [s, 1, 0], roof);
  for (const s of [-1, 1]) g.triN([-w / 2, wallH, s * l / 2], [w / 2, wallH, s * l / 2], [0, wallH + roofH, s * l / 2], [0, 0, s], wall);
  if (win) {
    for (const s of [-1, 1]) for (let i = 0; i < Math.max(1, Math.floor(l / 3.2)); i++) {
      const zz = -l / 2 + (i + 0.5) * (l / Math.max(1, Math.floor(l / 3.2)));
      g.box(s * (w / 2 + 0.03), wallH * 0.55, zz, 0.06, 1.0, 0.8, '#ffb347', { emit: 2.4 });
    }
  }
  g.pop();
}

function village(g) {
  const r = rng(404);
  const roofs = ['#8f4632', '#7b3c2c', '#5a4a3c', '#6b6e6c', '#8f4632'];
  const walls = ['#e6dcc4', '#d9cdb0', '#cfc7b8', '#e9e1cf', '#c9b79a'];
  for (let i = 0; i < 11; i++) {
    const x = -330 + i * 34 + (r() - 0.5) * 14;
    const p = bankPoint(x, 1, 52 + r() * 70);
    const w = 6 + r() * 3, l = 8 + r() * 5;
    gable(g, p.x, p.y - 0.3, p.z, w, l, 3.2 + r() * 0.6, 3.2 + r() * 1.4, Math.PI / 2 + (r() - 0.5) * 0.3, walls[i % walls.length], roofs[Math.floor(r() * roofs.length)]);
  }
  for (const [x, d] of [[210, 45], [228, 60], [520, 70]]) {
    const p = bankPoint(x, -1, d);
    gable(g, p.x, p.y - 0.3, p.z, 7, 12, 3.4, 4, (r() - 0.5) * 0.4, '#d6c9ad', '#6b4b3a');
    gable(g, p.x + 14, p.y - 0.3, p.z - 4, 9, 16, 5, 4.5, (r() - 0.5) * 0.3, '#8a6a4c', '#5d5146', false);
  }
  const cp = bankPoint(-175, 1, 118);
  g.at(cp.x, cp.y - 0.4, cp.z, Math.PI / 2);
  g.box(0, 6, 0, 11, 12, 24, '#8e4a36', { top: '#7a3f2e' });
  for (const s of [-1, 1]) g.quadN([s * 6, 11.8, -12.4], [s * 6, 11.8, 12.4], [0, 18.5, 12.4], [0, 18.5, -12.4], [s, 1, 0], '#7d3a2b');
  for (const s of [-1, 1]) g.triN([-5.5, 12, s * 12], [5.5, 12, s * 12], [0, 18.5, s * 12], [0, 0, s], '#8e4a36');
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.box(s * 5.53, 6.5, -8 + i * 5.2, 0.08, 4.2, 1.1, '#ffcf7a', { emit: 2.2 });
  g.box(0, 12, -14.5, 7, 24, 7, '#944e39', { top: '#7a3f2e' });
  g.box(0, 19, -18.03, 1.6, 2.6, 0.08, '#ffcf7a', { emit: 2.2 });
  g.cyl(0, 24, -14.5, 5.1, 0.25, 15, 4, '#5f7b6c', { rot: Math.PI / 4 });
  g.box(0, 39.6, -14.5, 0.25, 2.2, 0.25, '#c9a548');
  g.box(0, 40.1, -14.5, 1.3, 0.22, 0.22, '#c9a548');
  g.pop();
  const hp = bankPoint(78, -1, 2.5);
  gable(g, hp.x, hp.y, hp.z - 3, 4, 3.4, 2.4, 1.6, 0.1, '#7d6648', '#4f4438');
  for (let i = 0; i < 6; i++) g.box(hp.x + 0.4, 0.55, hp.z + 1 + i * 2.2, 1.6, 0.14, 2.1, i % 2 ? '#9b7a52' : '#8c6d48');
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) g.box(hp.x + 0.4 + s * 0.75, -0.4, hp.z + 0.6 + i * 2.2, 0.16, 2, 0.16, '#5d4a36');
  g.at(hp.x + 2.6, 0.12, hp.z + 9, 0.35);
  g.box(0, 0.25, 0, 1.4, 0.5, 4.4, '#3f5f6f', { top: '#6c5a44' });
  g.pop();
}

function bridge(g) {
  const x = -430;
  const zn = bankZ(x, -1) - 40, zs = bankZ(x, 1) + 40;
  const deck = 10.5, len = zs - zn, spans = 6, sl = len / spans;
  const steel = '#6d7a72', steelD = '#56625b', conc = '#a29f94';
  g.box(x, deck - 0.6, (zn + zs) / 2, 9, 1.2, len, conc, { top: '#77746c' });
  for (let i = 1; i < spans; i++) {
    const z = zn + i * sl;
    g.box(x, deck / 2 - 2, z, 7, deck + 3, 3.2, conc, { top: '#8f8c82' });
  }
  for (const s of [-1, 1]) {
    const xx = x + s * 4.3;
    g.box(xx, deck + 6.2, (zn + zs) / 2, 0.7, 0.7, len, steel);
    g.box(xx, deck + 0.3, (zn + zs) / 2, 0.7, 0.6, len, steelD);
    for (let i = 0; i < spans; i++) {
      const z0 = zn + i * sl;
      const n = 6;
      for (let k = 0; k < n; k++) {
        const za = z0 + (k / n) * sl, zb2 = z0 + ((k + 1) / n) * sl;
        const up = k % 2 === 0;
        const ya = up ? deck + 0.4 : deck + 6.2, yb = up ? deck + 6.2 : deck + 0.4;
        const zm = (za + zb2) / 2, ym = (ya + yb) / 2, ln = Math.hypot(zb2 - za, yb - ya);
        g.at(xx, ym, zm, 0, -Math.atan2(yb - ya, zb2 - za), 0).box(0, 0, 0, 0.5, 0.5, ln, steel).pop();
        g.box(xx, deck + 3.3, za, 0.45, 5.8, 0.45, steelD);
      }
    }
  }
  for (let z = zn + 8; z < zs; z += 24) {
    g.box(x, deck + 6.2, z, 8.6, 0.4, 0.4, steelD);
    for (const s of [-1, 1]) g.box(x + s * 3.6, deck + 4.6, z, 0.6, 0.4, 0.4, '#ffd58a', { emit: 2.6 });
  }
  for (const [z0, dir] of [[zn, -1], [zs, 1]]) {
    const L = 70;
    g.at(x, 0, z0 + dir * L / 2).box(0, deck / 2 - 0.4, 0, 12, deck, L, '#7c8a4a', { top: '#77746c' }).pop();
  }
}

function sandbarGeo(sb) {
  const g = new Geo();
  const seg = 18, rings = [[1.0, 0.0], [0.82, 0.18], [0.6, 0.36], [0.32, 0.46], [0, 0.5]];
  const P2 = (k, a) => {
    const [s, h] = rings[k];
    const wob = 1 + (noise2(Math.cos(a) * 2 + sb.x, Math.sin(a) * 2, 98) - 0.5) * 0.35;
    const lx = Math.cos(a) * sb.rx * s * wob, lz = Math.sin(a) * sb.rz * s * wob;
    const c = Math.cos(sb.rot), sn = Math.sin(sb.rot);
    return [sb.x + lx * c - lz * sn, h - 0.12, sb.z + lx * sn + lz * c];
  };
  const cols = ['#a3946c', '#c9b98b', '#b8ab7d', '#8d9450', '#7e8c49'];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      g.quadN(P2(k, a0), P2(k, a1), P2(k + 1, a1), P2(k + 1, a0), [0, 1, 0], cols[k]);
    }
  }
  return g;
}

export function buildRiver(scene, blockMat) {
  const group = new THREE.Group();
  group.name = 'river';
  const landMat = addWet(new THREE.MeshLambertMaterial({ vertexColors: true }));
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(buildBank(side), landMat);
    m.matrixAutoUpdate = false;
    group.add(m);
    const fw = new THREE.Mesh(forestWall(side), landMat);
    fw.matrixAutoUpdate = false;
    group.add(fw);
  }

  const r = rng(3131);
  const lists = { alder: [], willow: [], poplar: [], pine: [], birch: [], bush: [] };
  const reeds = [];
  for (const side of [-1, 1]) {
    for (let x = -1050; x < 1050; x += 2.8 + r() * 2.4) {
      const gap = noise2(x * 0.012, side * 4, 99);
      if (gap > 0.32) {
        const n = 1 + Math.floor(r() * 1.7);
        for (let k = 0; k < n; k++) {
          const p = bankPoint(x + (r() - 0.5) * 3, side, 6 + r() * 12);
          const t = p.sh.beachK > 0.5 ? (r() < 0.6 ? 'willow' : 'bush') : (r() < 0.55 ? 'alder' : r() < 0.75 ? 'willow' : r() < 0.88 ? 'birch' : 'poplar');
          lists[t].push({ ...p, s: 0.75 + r() * 0.5, ry: r() * 6.28 });
        }
      }
      if (r() < 0.55 && noise2(x * 0.02, side * 2, 100) > 0.35) {
        const p = bankPoint(x, side, -1.5 + r() * 2.6);
        reeds.push({ x: p.x, y: 0, z: p.z, s: 0.8 + r() * 0.6, ry: r() * 6.28 });
      }
    }
    for (let i = 0; i < 520; i++) {
      const x = -1100 + r() * 2200, d = 30 + Math.pow(r(), 1.4) * 330;
      if (noise2(x * 0.006, d * 0.008 + side * 3, 101) < 0.56) continue;
      const p = bankPoint(x, side, d);
      const t = d > 220 ? (r() < 0.7 ? 'pine' : 'birch') : (r() < 0.4 ? 'alder' : r() < 0.6 ? 'poplar' : r() < 0.8 ? 'birch' : 'willow');
      lists[t].push({ ...p, s: 0.8 + r() * 0.5, ry: r() * 6.28 });
    }
  }
  for (const sb of SANDBARS) {
    const c = Math.cos(sb.rot), sn = Math.sin(sb.rot);
    for (let i = 0; i < 4 + Math.floor(sb.rx / 6); i++) {
      const lx = (r() - 0.5) * sb.rx * 1.1, lz = (r() - 0.5) * sb.rz * 0.6;
      lists[r() < 0.6 ? 'bush' : 'willow'].push({ x: sb.x + lx * c - lz * sn, y: 0.2, z: sb.z + lx * sn + lz * c, s: 0.35 + r() * 0.3, ry: r() * 6.28 });
    }
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2, k = 0.85 + r() * 0.3;
      const lx = Math.cos(a) * sb.rx * k, lz = Math.sin(a) * sb.rz * k;
      reeds.push({ x: sb.x + lx * c - lz * sn, y: -0.05, z: sb.z + lx * sn + lz * c, s: 0.6 + r() * 0.5, ry: r() * 6.28 });
    }
  }

  const treeMat = addWet(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  const inst = (geo, list, mat, hue = 0.02) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      mesh.setMatrixAt(i, m4.compose(p.set(it.x, it.y - 0.15, it.z), q.setFromAxisAngle(up, it.ry), sc.setScalar(it.s)));
      tint.setRGB(1, 1, 1).offsetHSL((r() - 0.5) * hue, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08);
      mesh.setColorAt(i, tint);
    });
    mesh.computeBoundingSphere();
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  };
  for (const t in lists) inst(treeGeo(t), lists[t], treeMat);
  inst(reedGeo(), reeds, treeMat, 0.03);

  const lg = new Geo();
  village(lg);
  bridge(lg);
  for (const sb of SANDBARS) {
    const sg = sandbarGeo(sb);
    lg.p.push(...sg.p); lg.c.push(...sg.c); lg.e.push(...sg.e); lg.uv.push(...sg.uv);
  }
  const lm = new THREE.Mesh(lg.geometry(), blockMat);
  lm.matrixAutoUpdate = false;
  group.add(lm);

  scene.add(group);
  return { group, trees: Object.values(lists).reduce((a, l) => a + l.length, 0), reeds: reeds.length };
}
