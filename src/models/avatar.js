// Rybna Wyspa: low-poly Narew angler avatar (named limb pivots) and first-person carrying hands.
import * as THREE from 'three';
import { Soup, tube, blob, hexa, ridge, C, shade, mixC, hh } from './soup.js';

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const SKIN = C('#e8b48e'), SKIN_D = C('#d39c78'), BOOT = C('#2d4a2b'), SOLE = C('#1b2619'), PANTS = C('#7a7348'), PANTS_D = C('#686238');
const SHIRT = C('#7d8fa8'), SHIRT_D = C('#6a7b94'), BELT = C('#3a2c20'), DARK = C('#2a2220');

function mesh(S, name) {
  const m = new THREE.Mesh(S.geometry(), MAT);
  m.name = name + '_mesh';
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function pivot(name, x, y, z, S) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  if (S) g.add(mesh(S, name));
  return g;
}

function loft(S, rings, sides, colFn, kind = 0) {
  const pts = rings.map(([y, rx, rz, cz = 0]) => {
    const r = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      r.push([rx * Math.cos(a), y, cz + rz * Math.sin(a)]);
    }
    return r;
  });
  for (let i = 0; i < rings.length - 1; i++) {
    const cy = (rings[i][0] + rings[i + 1][0]) / 2, cz = ((rings[i][3] || 0) + (rings[i + 1][3] || 0)) / 2;
    for (let k = 0; k < sides; k++) {
      const a = pts[i][k], b = pts[i][(k + 1) % sides], c = pts[i + 1][(k + 1) % sides], d = pts[i + 1][k];
      const m = [(a[0] + b[0] + c[0] + d[0]) / 4, cy, (a[2] + b[2] + c[2] + d[2]) / 4];
      const ang = Math.atan2(m[2] - cz, m[0]);
      S.quad(a, b, c, d, colFn(i, k, ang, cy), 0, [m[0], 0, m[2] - cz], kind);
    }
  }
  return pts;
}

function capFan(S, ring, apex, col, want) {
  for (let k = 0; k < ring.length; k++) S.tri(ring[k], ring[(k + 1) % ring.length], apex, col, 0, want);
}

function buildTorso(vest) {
  const S = new Soup();
  const pocket = shade(vest, 0.78), vestD = shade(vest, 0.88);
  const rings = [[-0.07, 0.165, 0.105], [0.04, 0.17, 0.108], [0.08, 0.172, 0.11], [0.26, 0.19, 0.12], [0.42, 0.205, 0.118], [0.5, 0.185, 0.105], [0.55, 0.11, 0.08]];
  const pts = loft(S, rings, 12, (i, k, ang) => {
    if (i === 0) return PANTS;
    if (i === 1) return BELT;
    const side = Math.abs(Math.cos(ang));
    const front = Math.sin(ang) < -0.85;
    if (i === 5) return side > 0.55 ? SHIRT : vestD;
    if (i === 4 && side > 0.92) return SHIRT_D;
    if (front && i >= 2 && i <= 4) return shade(vest, 0.93);
    return (k & 1) ? vest : shade(vest, 0.96);
  });
  capFan(S, pts[0], [0, -0.07, 0], PANTS_D, [0, -1, 0]);
  capFan(S, pts[pts.length - 1], [0, 0.57, 0], SHIRT, [0, 1, 0]);
  const pk = (x, y, w, h) => hexa(S, [[x - w, y - h, -0.128], [x + w, y - h, -0.128], [x + w, y - h, -0.098], [x - w, y - h, -0.098], [x - w, y + h, -0.13], [x + w, y + h, -0.13], [x + w, y + h, -0.1], [x - w, y + h, -0.1]], (f) => (f === 1 ? shade(vest, 0.95) : pocket));
  pk(-0.085, 0.32, 0.05, 0.045); pk(0.085, 0.32, 0.05, 0.045);
  pk(-0.09, 0.15, 0.06, 0.055); pk(0.09, 0.15, 0.06, 0.055);
  ridge(S, [[0, 0.1, -0.112], [0, 0.3, -0.122], [0, 0.46, -0.118]], [[0, 0, -1], [0, 0, -1], [0, 0, -1]], 0.006, 0.006, shade(vest, 0.55), 0, 0);
  const neck = tube(S, [[0, 0.52, 0], [0, 0.6, 0]], [0.05, 0.048], 8, SKIN, 0, 0);
  void neck;
  loft(S, [[0.53, 0.075, 0.07], [0.565, 0.068, 0.064]], 10, () => SHIRT_D);
  return S;
}

function buildHead(cap) {
  const S = new Soup();
  blob(S, [0, 0.135, 0], [0.104, 0.118, 0.108], 1, (m) => (m[1] < 0.06 ? SKIN_D : SKIN).clone().multiplyScalar(1 + (hh(Math.round(m[0] * 300), Math.round(m[1] * 300), 7) - 0.5) * 0.05), { jitter: 0.025, seed: 3 });
  const eye = (x) => hexa(S, [[x - 0.011, 0.15, -0.096], [x + 0.011, 0.15, -0.096], [x + 0.011, 0.15, -0.112], [x - 0.011, 0.15, -0.112], [x - 0.011, 0.174, -0.094], [x + 0.011, 0.174, -0.094], [x + 0.011, 0.174, -0.11], [x - 0.011, 0.174, -0.11]], DARK);
  eye(-0.038); eye(0.038);
  hexa(S, [[-0.012, 0.115, -0.1], [0.012, 0.115, -0.1], [0.01, 0.112, -0.126], [-0.01, 0.112, -0.126], [-0.008, 0.15, -0.1], [0.008, 0.15, -0.1], [0.006, 0.122, -0.12], [-0.006, 0.122, -0.12]], SKIN_D);
  const sm = [[-0.034, 0.096, -0.094], [-0.016, 0.086, -0.103], [0.016, 0.086, -0.103], [0.034, 0.096, -0.094]];
  ridge(S, sm, sm.map((p) => [p[0] * 0.6, 0, -1]), 0.0045, 0.004, C('#8a4a3c'), 0, 0);
  for (const sx of [-1, 1]) {
    hexa(S, [[sx * 0.098, 0.11, -0.012], [sx * 0.118, 0.112, -0.012], [sx * 0.118, 0.112, 0.022], [sx * 0.098, 0.11, 0.022], [sx * 0.098, 0.165, -0.016], [sx * 0.12, 0.162, -0.016], [sx * 0.12, 0.162, 0.024], [sx * 0.098, 0.165, 0.024]], SKIN_D);
  }
  const capD = shade(cap, 0.8);
  const dome = loft(S, [[0.19, 0.114, 0.118, 0.006], [0.235, 0.11, 0.114, 0.006], [0.272, 0.088, 0.092, 0.008], [0.292, 0.048, 0.05, 0.008]], 12, (i, k) => (k & 1 ? cap : shade(cap, 0.94)));
  capFan(S, dome[dome.length - 1], [0, 0.3, 0.008], cap, [0, 1, 0]);
  capFan(S, dome[0], [0, 0.19, 0.006], capD, [0, -1, 0]);
  hexa(S, [[-0.108, 0.186, -0.06], [0.108, 0.186, -0.06], [0.086, 0.168, -0.205], [-0.086, 0.168, -0.205], [-0.108, 0.198, -0.06], [0.108, 0.198, -0.06], [0.086, 0.178, -0.205], [-0.086, 0.178, -0.205]], (f) => (f === 1 ? cap : capD));
  hexa(S, [[-0.012, 0.296, -0.004], [0.012, 0.296, -0.004], [0.012, 0.296, 0.02], [-0.012, 0.296, 0.02], [-0.012, 0.31, -0.004], [0.012, 0.31, -0.004], [0.012, 0.31, 0.02], [-0.012, 0.31, 0.02]], capD);
  return S;
}

function hand(S, x0, y0, z0, sx, palmDown = false) {
  const w = 0.04, t = 0.016, L = 0.085;
  const c = palmDown ? SKIN : SKIN_D;
  hexa(S, [[x0 - t, y0, z0 - w], [x0 + t, y0, z0 - w], [x0 + t, y0, z0 + w], [x0 - t, y0, z0 + w], [x0 - t * 0.8, y0 - L, z0 - w * 0.9], [x0 + t * 0.8, y0 - L, z0 - w * 0.9], [x0 + t * 0.8, y0 - L, z0 + w * 0.85], [x0 - t * 0.8, y0 - L, z0 + w * 0.85]], (f) => (f === 3 || f === 5 ? c : SKIN));
  hexa(S, [[x0 - 0.01, y0 - 0.02, z0 - w], [x0 + 0.01, y0 - 0.02, z0 - w], [x0 + 0.01, y0 - 0.02, z0 - w - 0.012], [x0 - 0.01, y0 - 0.02, z0 - w - 0.012], [x0 - sx * 0.006 - 0.008, y0 - 0.07, z0 - w - 0.02], [x0 - sx * 0.006 + 0.008, y0 - 0.07, z0 - w - 0.02], [x0 - sx * 0.006 + 0.008, y0 - 0.07, z0 - w - 0.034], [x0 - sx * 0.006 - 0.008, y0 - 0.07, z0 - w - 0.034]], SKIN);
}

function buildArm(sx) {
  const S = new Soup();
  const pts = [[0, 0.03, 0], [sx * 0.012, -0.12, 0.005], [sx * 0.02, -0.29, 0.01], [sx * 0.022, -0.44, -0.012], [sx * 0.02, -0.565, -0.03]];
  tube(S, pts, [0.06, 0.057, 0.05, 0.046, 0.042], 8, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.95)), 0, 0, { capStart: true, capEnd: true, capCol: SHIRT_D });
  tube(S, [[sx * 0.02, -0.545, -0.028], [sx * 0.02, -0.585, -0.032]], [0.047, 0.047], 8, SHIRT_D, 0, 0, { capStart: true, capEnd: true });
  hand(S, sx * 0.02, -0.58, -0.03, sx);
  return S;
}

function buildLeg() {
  const S = new Soup();
  tube(S, [[0, 0.02, 0], [0, -0.22, -0.006], [0, -0.45, 0.004], [0, -0.53, 0.008]], [0.088, 0.08, 0.068, 0.066], 8, (i, j) => (j & 1 ? PANTS : PANTS_D), 0, 0, { capStart: true });
  tube(S, [[0, -0.47, 0.006], [0, -0.505, 0.006]], [0.083, 0.083], 10, shade(BOOT, 1.12), 0, 0, { capStart: true, capEnd: true });
  tube(S, [[0, -0.5, 0.006], [0, -0.7, 0.008], [0, -0.84, 0.012]], [0.077, 0.073, 0.072], 10, (i, j) => (j & 1 ? BOOT : shade(BOOT, 0.92)), 0, 0, {});
  hexa(S, [[-0.058, -0.9, 0.075], [0.058, -0.9, 0.075], [0.052, -0.9, -0.2], [-0.052, -0.9, -0.2], [-0.068, -0.79, 0.07], [0.068, -0.79, 0.07], [0.05, -0.84, -0.165], [-0.05, -0.84, -0.165]], (f) => (f === 0 ? SOLE : BOOT));
  hexa(S, [[-0.06, -0.92, 0.08], [0.06, -0.92, 0.08], [0.054, -0.92, -0.205], [-0.054, -0.92, -0.205], [-0.06, -0.9, 0.08], [0.06, -0.9, 0.08], [0.054, -0.9, -0.205], [-0.054, -0.9, -0.205]], SOLE);
  return S;
}

export function buildAvatar(color = 0xe8742c) {
  const vest = new THREE.Color(color);
  const root = new THREE.Group();
  root.name = 'avatar';
  const body = pivot('body', 0, 0.92, 0, buildTorso(vest));
  const head = pivot('head', 0, 1.49, 0, buildHead(vest));
  const armL = pivot('armL', -0.222, 1.395, 0, buildArm(-1));
  const armR = pivot('armR', 0.222, 1.395, 0, buildArm(1));
  const legL = pivot('legL', -0.095, 0.92, 0, buildLeg());
  const legR = pivot('legR', 0.095, 0.92, 0, buildLeg());
  root.add(body, head, armL, armR, legL, legR);
  return root;
}

export function buildViewHands() {
  const root = new THREE.Group();
  root.name = 'viewHands';
  for (const sx of [-1, 1]) {
    const S = new Soup();
    const wrist = [sx * 0.13, -0.32, -0.36], elbow = [sx * 0.24, -0.46, -0.02];
    tube(S, [elbow, [sx * 0.2, -0.41, -0.16], wrist], [0.05, 0.047, 0.042], 8, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.94)), 0, 0, { capStart: true });
    tube(S, [[sx * 0.135, -0.322, -0.345], [sx * 0.127, -0.317, -0.38]], [0.046, 0.046], 8, SHIRT_D, 0, 0, { capStart: true, capEnd: true });
    const px = sx * 0.125, py = -0.318, pz = -0.38;
    const palm = mixC(SKIN, C('#f0c4a2'), 0.6);
    hexa(S, [[px - 0.042, py - 0.012, pz], [px + 0.042, py - 0.012, pz], [px + 0.044, py - 0.012, pz - 0.085], [px - 0.044, py - 0.012, pz - 0.085], [px - 0.042, py + 0.008, pz], [px + 0.042, py + 0.008, pz], [px + 0.044, py + 0.008, pz - 0.085], [px - 0.044, py + 0.008, pz - 0.085]], (f) => (f === 1 ? palm : SKIN_D));
    for (let i = 0; i < 4; i++) {
      const fx = px - 0.033 + i * 0.022, len = i === 0 || i === 3 ? 0.05 : 0.06;
      tube(S, [[fx, py, pz - 0.08], [fx, py + 0.012, pz - 0.08 - len * 0.6], [fx, py + 0.034, pz - 0.08 - len]], [0.0105, 0.0098, 0.008], 6, (k, j) => (j < 3 ? SKIN : palm), 0, 0, { capEnd: true });
    }
    const tx = px - sx * 0.05;
    tube(S, [[px - sx * 0.035, py, pz - 0.02], [tx, py + 0.016, pz - 0.05], [tx - sx * 0.004, py + 0.03, pz - 0.085]], [0.012, 0.011, 0.009], 6, SKIN, 0, 0, { capEnd: true });
    const m = new THREE.Mesh(S.geometry(), MAT);
    m.name = sx < 0 ? 'handL' : 'handR';
    root.add(m);
  }
  return root;
}
