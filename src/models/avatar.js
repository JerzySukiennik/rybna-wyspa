// Rybna Wyspa: low-poly Narew angler avatar (named limb pivots, elbow and knee sub-pivots) and first-person cradling hands.
import * as THREE from 'three';
import { Soup, tube, blob, hexa, ridge, C, shade, hh, add, mul, norm } from './soup.js';

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const SKIN = C('#e3b08a'), SKIN_D = C('#cc9a76'), PALM = C('#ecc4a2'), BOOT = C('#2f4a2c'), SOLE = C('#1d261a');
const PANTS = C('#8a8252'), PANTS_D = C('#776f45'), SHIRT = C('#7b8ca2'), SHIRT_D = C('#687990');
const BELT = C('#3a2e22'), DARK = C('#2a2220'), EYE_W = C('#f4f1ea');

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

function box(S, x, y, z, sx, sy, sz, col) {
  const a = sx / 2, b = sy / 2, c = sz / 2;
  hexa(S, [[x - a, y - b, z - c], [x + a, y - b, z - c], [x + a, y - b, z + c], [x - a, y - b, z + c], [x - a, y + b, z - c], [x + a, y + b, z - c], [x + a, y + b, z + c], [x - a, y + b, z + c]], col);
}

function buildTorso(vest) {
  const S = new Soup();
  const pocket = shade(vest, 0.78), vestD = shade(vest, 0.88);
  const rings = [[-0.07, 0.168, 0.108], [0.04, 0.165, 0.106], [0.08, 0.166, 0.108], [0.24, 0.186, 0.118], [0.4, 0.212, 0.122], [0.47, 0.208, 0.112], [0.52, 0.16, 0.094], [0.56, 0.09, 0.075]];
  const pts = loft(S, rings, 10, (i, k, ang) => {
    if (i === 0) return PANTS;
    if (i === 1) return BELT;
    const side = Math.abs(Math.cos(ang));
    const front = Math.sin(ang) < -0.85;
    if (i >= 5) return side > 0.6 ? SHIRT : vestD;
    if (i === 4 && side > 0.94) return SHIRT_D;
    if (front && i >= 2 && i <= 4) return shade(vest, 0.93);
    return (k & 1) ? vest : shade(vest, 0.96);
  });
  capFan(S, pts[0], [0, -0.07, 0], PANTS_D, [0, -1, 0]);
  capFan(S, pts[pts.length - 1], [0, 0.575, 0], SHIRT, [0, 1, 0]);
  const pk = (x, y, w, h) => hexa(S, [[x - w, y - h, -0.132], [x + w, y - h, -0.132], [x + w, y - h, -0.1], [x - w, y - h, -0.1], [x - w, y + h, -0.134], [x + w, y + h, -0.134], [x + w, y + h, -0.104], [x - w, y + h, -0.104]], (f) => (f === 1 ? shade(vest, 0.95) : pocket));
  pk(-0.088, 0.32, 0.05, 0.045); pk(0.088, 0.32, 0.05, 0.045);
  pk(-0.094, 0.15, 0.06, 0.055); pk(0.094, 0.15, 0.06, 0.055);
  ridge(S, [[0, 0.1, -0.114], [0, 0.3, -0.126], [0, 0.45, -0.12]], [[0, 0, -1], [0, 0, -1], [0, 0, -1]], 0.006, 0.006, shade(vest, 0.55), 0, 0);
  tube(S, [[0, 0.52, 0], [0, 0.6, 0]], [0.052, 0.05], 8, SKIN, 0, 0);
  loft(S, [[0.535, 0.078, 0.072], [0.572, 0.07, 0.066]], 10, () => SHIRT_D);
  const rodA = [-0.22, -0.04, 0.15], rodB = [0.3, 0.83, 0.18];
  const dir = norm([rodB[0] - rodA[0], rodB[1] - rodA[1], rodB[2] - rodA[2]]);
  const at = (t) => add(rodA, mul(dir, t));
  tube(S, [at(0), at(0.28)], [0.017, 0.015], 6, C('#b5895a'), 0, 0, { capStart: true });
  tube(S, [at(0.28), at(0.31)], [0.013, 0.013], 6, C('#3a3c40'), 0, 0);
  box(S, ...at(0.2), 0.05, 0.045, 0.05, C('#8a9098'));
  tube(S, [at(0.31), at(0.65), at(1.02)], [0.011, 0.008, 0.005], 5, C('#2b2d31'), 0, 0, { capEnd: true });
  box(S, ...add(at(0.62), [0, 0, -0.02]), 0.06, 0.03, 0.05, DARK);
  return S;
}

function buildHead(cap) {
  const S = new Soup();
  blob(S, [0, 0.14, 0], [0.11, 0.126, 0.114], 1, (m) => (m[1] < 0.065 ? SKIN_D : SKIN).clone().multiplyScalar(1 + (hh(Math.round(m[0] * 300), Math.round(m[1] * 300), 7) - 0.5) * 0.05), { jitter: 0.025, seed: 3 });
  for (const sx of [-1, 1]) {
    box(S, sx * 0.04, 0.165, -0.103, 0.028, 0.024, 0.012, EYE_W);
    box(S, sx * 0.038, 0.163, -0.11, 0.012, 0.016, 0.006, DARK);
  }
  hexa(S, [[-0.013, 0.118, -0.105], [0.013, 0.118, -0.105], [0.011, 0.115, -0.132], [-0.011, 0.115, -0.132], [-0.009, 0.155, -0.106], [0.009, 0.155, -0.106], [0.007, 0.126, -0.126], [-0.007, 0.126, -0.126]], SKIN_D);
  const sm = [[-0.036, 0.098, -0.1], [-0.017, 0.088, -0.11], [0.017, 0.088, -0.11], [0.036, 0.098, -0.1]];
  ridge(S, sm, sm.map((p) => [p[0] * 0.6, 0, -1]), 0.0045, 0.004, C('#8a4a3c'), 0, 0);
  for (const sx of [-1, 1]) {
    hexa(S, [[sx * 0.104, 0.112, -0.012], [sx * 0.124, 0.114, -0.012], [sx * 0.124, 0.114, 0.022], [sx * 0.104, 0.112, 0.022], [sx * 0.104, 0.168, -0.016], [sx * 0.126, 0.165, -0.016], [sx * 0.126, 0.165, 0.024], [sx * 0.104, 0.168, 0.024]], SKIN_D);
  }
  const capD = shade(cap, 0.8);
  const dome = loft(S, [[0.196, 0.12, 0.124, 0.006], [0.24, 0.116, 0.12, 0.006], [0.276, 0.092, 0.096, 0.008], [0.296, 0.05, 0.052, 0.008]], 10, (i, k) => (k & 1 ? cap : shade(cap, 0.94)));
  capFan(S, dome[dome.length - 1], [0, 0.315, 0.008], cap, [0, 1, 0]);
  capFan(S, dome[0], [0, 0.196, 0.006], capD, [0, -1, 0]);
  hexa(S, [[-0.112, 0.19, -0.064], [0.112, 0.19, -0.064], [0.09, 0.172, -0.212], [-0.09, 0.172, -0.212], [-0.112, 0.202, -0.064], [0.112, 0.202, -0.064], [0.09, 0.182, -0.212], [-0.09, 0.182, -0.212]], (f) => (f === 1 ? cap : capD));
  return S;
}

function sideHand(S, x0, y0, z0, sx) {
  const w = 0.046, t = 0.021, L = 0.075;
  hexa(S, [[x0 - t, y0, z0 - w], [x0 + t, y0, z0 - w], [x0 + t, y0, z0 + w], [x0 - t, y0, z0 + w], [x0 - t * 0.85, y0 - L, z0 - w * 0.9], [x0 + t * 0.85, y0 - L, z0 - w * 0.9], [x0 + t * 0.85, y0 - L, z0 + w * 0.88], [x0 - t * 0.85, y0 - L, z0 + w * 0.88]], (f) => (f === 3 || f === 5 ? SKIN_D : SKIN));
  hexa(S, [[x0 - t * 0.8, y0 - L, z0 - w * 0.88], [x0 + t * 0.8, y0 - L, z0 - w * 0.88], [x0 + t * 0.8, y0 - L, z0 + w * 0.86], [x0 - t * 0.8, y0 - L, z0 + w * 0.86], [x0 - t * 0.6 - sx * 0.008, y0 - L - 0.045, z0 - w * 0.75], [x0 + t * 0.6 - sx * 0.008, y0 - L - 0.045, z0 - w * 0.75], [x0 + t * 0.6 - sx * 0.008, y0 - L - 0.04, z0 + w * 0.7], [x0 - t * 0.6 - sx * 0.008, y0 - L - 0.04, z0 + w * 0.7]], SKIN);
  tube(S, [[x0 - sx * 0.004, y0 - 0.015, z0 - w], [x0 - sx * 0.008, y0 - 0.05, z0 - w - 0.018], [x0 - sx * 0.012, y0 - 0.075, z0 - w - 0.02]], [0.012, 0.011, 0.008], 5, SKIN, 0, 0, { capEnd: true });
}

function buildArm(sx) {
  const upper = new Soup();
  blob(upper, [0, 0, 0], [0.066, 0.066, 0.066], 0, (m, w, i) => shade(SHIRT, 0.94 + 0.08 * hh(i, 2)), { jitter: 0.04 });
  tube(upper, [[0, -0.01, 0], [sx * 0.012, -0.15, 0.004], [sx * 0.018, -0.3, 0.006]], [0.061, 0.056, 0.05], 7, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.95)), 0, 0, { capEnd: true, capCol: SHIRT_D });
  const arm = pivot(sx < 0 ? 'armL' : 'armR', sx * 0.204, 1.372, 0, upper);
  const fore = new Soup();
  tube(fore, [[0, 0.03, 0], [sx * 0.002, -0.13, -0.004], [sx * 0.004, -0.245, -0.006]], [0.05, 0.045, 0.041], 7, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.95)), 0, 0, { capStart: true, capCol: SHIRT });
  tube(fore, [[sx * 0.004, -0.235, -0.006], [sx * 0.004, -0.27, -0.006]], [0.046, 0.046], 7, SHIRT_D, 0, 0, { capEnd: true });
  sideHand(fore, sx * 0.004, -0.268, -0.006, sx);
  const forearm = pivot(sx < 0 ? 'forearmL' : 'forearmR', sx * 0.018, -0.29, 0.006, fore);
  forearm.rotation.x = 0.2;
  arm.add(forearm);
  return arm;
}

function buildLeg(sx) {
  const thigh = new Soup();
  tube(thigh, [[0, 0.03, 0], [0, -0.2, -0.008], [0, -0.43, -0.004]], [0.094, 0.086, 0.074], 7, (i, j) => (j & 1 ? PANTS : PANTS_D), 0, 0, { capStart: true });
  blob(thigh, [0, -0.45, -0.012], [0.072, 0.068, 0.072], 0, (m, w, i) => shade(PANTS, 0.92 + 0.1 * hh(i, 5)), { jitter: 0.05 });
  const leg = pivot(sx < 0 ? 'legL' : 'legR', sx * 0.096, 0.92, 0, thigh);
  const shin = new Soup();
  tube(shin, [[0, 0.01, 0], [0, -0.06, 0.004]], [0.07, 0.068], 7, (i, j) => (j & 1 ? PANTS : PANTS_D), 0, 0);
  tube(shin, [[0, -0.02, 0.006], [0, -0.055, 0.006]], [0.084, 0.084], 8, shade(BOOT, 1.12), 0, 0, { capStart: true });
  tube(shin, [[0, -0.05, 0.006], [0, -0.25, 0.01], [0, -0.39, 0.014]], [0.078, 0.073, 0.074], 8, (i, j) => (j & 1 ? BOOT : shade(BOOT, 0.92)), 0, 0, {});
  hexa(shin, [[-0.06, -0.45, 0.08], [0.06, -0.45, 0.08], [0.054, -0.45, -0.21], [-0.054, -0.45, -0.21], [-0.07, -0.34, 0.075], [0.07, -0.34, 0.075], [0.052, -0.39, -0.17], [-0.052, -0.39, -0.17]], (f) => (f === 0 ? SOLE : BOOT));
  hexa(shin, [[-0.062, -0.47, 0.085], [0.062, -0.47, 0.085], [0.056, -0.47, -0.215], [-0.056, -0.47, -0.215], [-0.062, -0.45, 0.085], [0.062, -0.45, 0.085], [0.056, -0.45, -0.215], [-0.056, -0.45, -0.215]], SOLE);
  const knee = pivot(sx < 0 ? 'shinL' : 'shinR', 0, -0.45, 0, shin);
  leg.add(knee);
  return leg;
}

export function buildAvatar(color = 0xe8742c) {
  const vest = new THREE.Color(color);
  const root = new THREE.Group();
  root.name = 'avatar';
  const body = pivot('body', 0, 0.92, 0, buildTorso(vest));
  const head = pivot('head', 0, 1.485, 0, buildHead(vest));
  root.add(body, head, buildArm(-1), buildArm(1), buildLeg(-1), buildLeg(1));
  return root;
}

function finger(S, base, dir, up, lens, radii, curl) {
  const pts = [base];
  let d = norm(dir);
  let ang = 0;
  for (let i = 0; i < lens.length; i++) {
    ang += curl[i];
    const v = norm(add(mul(d, Math.cos(ang)), mul(up, Math.sin(ang))));
    pts.push(add(pts[pts.length - 1], mul(v, lens[i])));
  }
  tube(S, pts, radii, 6, (i, j) => (j === 1 || j === 2 ? PALM : SKIN), 0, 0, { capEnd: true });
}

export function buildViewHands() {
  const root = new THREE.Group();
  root.name = 'viewHands';
  for (const sx of [-1, 1]) {
    const S = new Soup();
    const px = sx * 0.11, py = -0.27, pz = -0.42;
    const elbow = [sx * 0.25, -0.45, -0.07], wrist = [sx * 0.118, -0.285, pz + 0.075];
    tube(S, [elbow, [sx * 0.19, -0.37, -0.22], wrist], [0.054, 0.05, 0.045], 8, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.94)), 0, 0, { capStart: true });
    tube(S, [add(wrist, [0, 0.001, 0.012]), add(wrist, [-sx * 0.002, 0.002, -0.02])], [0.05, 0.05], 8, SHIRT_D, 0, 0, { capStart: true, capEnd: true });
    tube(S, [add(wrist, [0, 0.004, -0.015]), [px, py - 0.002, pz + 0.045]], [0.034, 0.036], 6, SKIN, 0, 0);
    const hw = 0.038, hk = 0.047, hl = 0.05, th = 0.011;
    hexa(S, [
      [px - hw, py - th, pz + hl], [px + hw, py - th, pz + hl], [px + hk, py - th + 0.004, pz - hl], [px - hk, py - th + 0.004, pz - hl],
      [px - hw - 0.003, py + th + 0.004, pz + hl], [px + hw + 0.003, py + th + 0.004, pz + hl], [px + hk + 0.003, py + th + 0.009, pz - hl], [px - hk - 0.003, py + th + 0.009, pz - hl],
    ], (f) => (f === 1 ? PALM : SKIN_D));
    hexa(S, [
      [px + sx * 0.03, py - 0.004, pz + 0.04], [px + sx * 0.052, py - 0.004, pz + 0.035], [px + sx * 0.054, py - 0.002, pz - 0.012], [px + sx * 0.03, py - 0.002, pz - 0.01],
      [px + sx * 0.03, py + 0.022, pz + 0.04], [px + sx * 0.05, py + 0.02, pz + 0.035], [px + sx * 0.052, py + 0.02, pz - 0.012], [px + sx * 0.03, py + 0.022, pz - 0.01],
    ], SKIN);
    const up = [0, 1, 0];
    for (let i = 0; i < 4; i++) {
      const fx = px + sx * 0.033 - sx * i * 0.022;
      const spread = (i - 1.5) * 0.07 * sx;
      const k = i === 3 ? 0.8 : i === 0 ? 0.92 : 1;
      finger(S, [fx, py + 0.006, pz - hl + 0.006], [spread, 0, -1], up, [0.036 * k, 0.026 * k, 0.02 * k], [0.0108, 0.0102, 0.0094, 0.0078], [0.22, 0.32, 0.3]);
    }
    const tb = [px + sx * 0.046, py + 0.012, pz - 0.006];
    finger(S, tb, [-sx * 0.12, 0.2, -1], up, [0.034, 0.028], [0.0128, 0.0118, 0.0098], [0.38, 0.36]);
    const m = new THREE.Mesh(S.geometry(), MAT);
    m.name = sx < 0 ? 'handL' : 'handR';
    root.add(m);
  }
  return root;
}

