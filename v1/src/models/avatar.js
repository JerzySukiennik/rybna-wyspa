// Rybna Wyspa: low-poly Narew angler avatar (named limb pivots, elbow and knee sub-pivots) and first-person cradling hands.
import * as THREE from 'three';
import { Soup, tube, blob, hexa, ridge, C, shade, mixC, hh, add, mul, norm } from './soup.js';

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const SKIN = C('#f0c6a2'), SKIN_D = C('#ddae8a'), BOOT = C('#2f4a2c'), SOLE = C('#1d261a');
const HAND = C('#dcae86'), HAND_D = C('#b07f5f'), HAND_M = mixC(HAND, HAND_D, 0.45);
const PANTS = C('#8a8252'), PANTS_D = C('#776f45'), SHIRT = C('#7b8ca2'), SHIRT_D = C('#687990');
const BELT = C('#3a2e22'), DARK = C('#2a2220'), EYE_W = C('#f6f3ec'), BROW = C('#5a4030');

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

const shadeBy = (light, mid, dark) => (i, j, w) => {
  const l = Math.hypot(w[0], w[1], w[2]) || 1;
  const y = w[1] / l;
  return y < -0.35 ? dark : y > 0.35 ? light : mid;
};

function buildTorso(vest) {
  const S = new Soup();
  const pocket = shade(vest, 0.78), vestD = shade(vest, 0.88);
  const rings = [[-0.07, 0.168, 0.108], [0.04, 0.165, 0.106], [0.24, 0.186, 0.118], [0.39, 0.212, 0.122], [0.45, 0.206, 0.112], [0.5, 0.15, 0.09], [0.53, 0.082, 0.07]];
  const pts = loft(S, rings, 9, (i, k, ang) => {
    if (i === 0) return PANTS;
    const side = Math.abs(Math.cos(ang));
    const front = Math.sin(ang) < -0.85;
    if (i >= 4) return side > 0.6 ? SHIRT : vestD;
    if (i === 3 && side > 0.94) return SHIRT_D;
    if (front && i >= 1 && i <= 3) return shade(vest, 0.93);
    return (k & 1) ? vest : shade(vest, 0.96);
  });
  loft(S, [[0.035, 0.168, 0.108], [0.075, 0.169, 0.109]], 9, () => BELT);
  capFan(S, pts[0], [0, -0.07, 0], PANTS_D, [0, -1, 0]);
  capFan(S, pts[pts.length - 1], [0, 0.54, 0], SHIRT_D, [0, 1, 0]);
  const pk = (x, y, w, h) => hexa(S, [[x - w, y - h, -0.132], [x + w, y - h, -0.132], [x + w, y - h, -0.1], [x - w, y - h, -0.1], [x - w, y + h, -0.134], [x + w, y + h, -0.134], [x + w, y + h, -0.104], [x - w, y + h, -0.104]], (f) => (f === 1 ? shade(vest, 0.95) : pocket));
  pk(-0.088, 0.31, 0.05, 0.045); pk(0.088, 0.31, 0.05, 0.045);
  pk(-0.094, 0.15, 0.06, 0.055); pk(0.094, 0.15, 0.06, 0.055);
  ridge(S, [[0, 0.1, -0.114], [0, 0.3, -0.126], [0, 0.43, -0.12]], [[0, 0, -1], [0, 0, -1], [0, 0, -1]], 0.006, 0.006, shade(vest, 0.55), 0, 0);
  tube(S, [[0, 0.48, 0.004], [0, 0.63, 0.008]], [0.05, 0.047], 8, (i, j, w) => (w[2] > 0.02 ? SKIN_D : SKIN), 0, 0);
  const rodA = [-0.36, -0.04, 0.15], rodB = [0.56, 0.875, 0.2];
  const dir = norm([rodB[0] - rodA[0], rodB[1] - rodA[1], rodB[2] - rodA[2]]);
  const at = (t) => add(rodA, mul(dir, t));
  tube(S, [at(0), at(0.24)], [0.019, 0.016], 6, C('#b5895a'), 0, 0, { capStart: true, capCol: C('#3a2c20') });
  tube(S, [at(0.24), at(0.62), at(0.98), at(1.32)], [0.012, 0.0085, 0.0055, 0.0025], 5, C('#2b2d31'), 0, 0, { capEnd: true });
  const out = norm([0, -0.25, 1]);
  const rc = add(at(0.27), mul(out, 0.062));
  box(S, ...add(at(0.27), mul(out, 0.03)), 0.02, 0.02, 0.05, C('#4a4e54'));
  tube(S, [add(rc, mul(dir, -0.032)), add(rc, mul(dir, 0.032))], [0.038, 0.035], 6, C('#a6aeb6'), 0, 0, { capStart: true, capEnd: true, capCol: C('#5c636b') });
  box(S, ...add(rc, mul(dir, -0.048)), 0.012, 0.055, 0.012, C('#3a3e44'));
  box(S, ...add(add(rc, mul(dir, -0.052)), [0, -0.034, 0.022]), 0.022, 0.022, 0.032, C('#d8d2c4'));
  box(S, ...add(at(0.75), [0, 0, -0.02]), 0.06, 0.03, 0.05, DARK);
  return S;
}

function buildHead(cap) {
  const S = new Soup();
  blob(S, [0, 0.14, 0], [0.11, 0.126, 0.114], 1, (m) => (m[1] < 0.065 ? SKIN_D : SKIN).clone().multiplyScalar(1 + (hh(Math.round(m[0] * 300), Math.round(m[1] * 300), 7) - 0.5) * 0.04), { jitter: 0.02, seed: 3 });
  for (const sx of [-1, 1]) {
    box(S, sx * 0.042, 0.148, -0.1, 0.038, 0.034, 0.014, EYE_W);
    box(S, sx * 0.04, 0.146, -0.109, 0.019, 0.025, 0.006, DARK);
    S.tri([sx * 0.033, 0.149, -0.1125], [sx * 0.039, 0.149, -0.1125], [sx * 0.036, 0.155, -0.1125], EYE_W, 0, [0, 0, -1]);
    ridge(S, [[sx * 0.02, 0.174, -0.1], [sx * 0.064, 0.182, -0.096]], [[0, 0.3, -1], [sx * 0.3, 0.3, -1]], 0.0055, 0.0055, BROW, 0, 0, false);
  }
  hexa(S, [[-0.013, 0.118, -0.105], [0.013, 0.118, -0.105], [0.011, 0.115, -0.132], [-0.011, 0.115, -0.132], [-0.009, 0.155, -0.106], [0.009, 0.155, -0.106], [0.007, 0.126, -0.126], [-0.007, 0.126, -0.126]], SKIN_D);
  const sm = [[-0.036, 0.096, -0.1], [-0.017, 0.086, -0.11], [0.017, 0.086, -0.11], [0.036, 0.096, -0.1]];
  ridge(S, sm, sm.map((p) => [p[0] * 0.6, 0, -1]), 0.0045, 0.004, C('#8a4a3c'), 0, 0);
  for (const sx of [-1, 1]) {
    hexa(S, [[sx * 0.104, 0.112, -0.012], [sx * 0.124, 0.114, -0.012], [sx * 0.124, 0.114, 0.022], [sx * 0.104, 0.112, 0.022], [sx * 0.104, 0.168, -0.016], [sx * 0.126, 0.165, -0.016], [sx * 0.126, 0.165, 0.024], [sx * 0.104, 0.168, 0.024]], SKIN_D);
  }
  const capD = shade(cap, 0.8);
  const dome = loft(S, [[0.196, 0.12, 0.124, 0.006], [0.25, 0.112, 0.116, 0.006], [0.292, 0.06, 0.062, 0.008]], 10, (i, k) => (k & 1 ? cap : shade(cap, 0.94)));
  capFan(S, dome[dome.length - 1], [0, 0.315, 0.008], cap, [0, 1, 0]);
  capFan(S, dome[0], [0, 0.196, 0.006], capD, [0, -1, 0]);
  hexa(S, [[-0.112, 0.196, -0.064], [0.112, 0.196, -0.064], [0.088, 0.198, -0.172], [-0.088, 0.198, -0.172], [-0.112, 0.208, -0.064], [0.112, 0.208, -0.064], [0.088, 0.207, -0.172], [-0.088, 0.207, -0.172]], (f) => (f === 1 ? cap : capD));
  return S;
}

function sideHand(S, x0, y0, z0, sx) {
  const w = 0.042, t = 0.019, L = 0.07;
  hexa(S, [[x0 - t, y0, z0 - w], [x0 + t, y0, z0 - w], [x0 + t, y0, z0 + w], [x0 - t, y0, z0 + w], [x0 - t * 0.85, y0 - L, z0 - w * 0.9], [x0 + t * 0.85, y0 - L, z0 - w * 0.9], [x0 + t * 0.85, y0 - L, z0 + w * 0.88], [x0 - t * 0.85, y0 - L, z0 + w * 0.88]], (f) => (f === 3 || f === 5 ? SKIN_D : SKIN));
  for (let i = 0; i < 4; i++) {
    const fz = z0 - w * 0.68 + i * w * 0.46;
    const len = i === 3 ? 0.034 : 0.044;
    const b = [x0 - sx * 0.002, y0 - L + 0.004, fz];
    tube(S, [b, add(b, [-sx * 0.014, -len, -0.004])], [0.009, 0], 3, SKIN, 0, 0);
  }
  tube(S, [[x0 - sx * 0.004, y0 - 0.015, z0 - w], [x0 - sx * 0.008, y0 - 0.048, z0 - w - 0.016], [x0 - sx * 0.012, y0 - 0.07, z0 - w - 0.018]], [0.011, 0.01, 0.007], 4, SKIN, 0, 0, { capEnd: true });
}

function buildArm(sx) {
  const upper = new Soup();
  blob(upper, [0, 0, 0], [0.064, 0.064, 0.064], 0, (m, w, i) => shade(SHIRT, 0.94 + 0.08 * hh(i, 2)), { jitter: 0.04 });
  tube(upper, [[0, -0.01, 0], [sx * 0.012, -0.14, 0.004], [sx * 0.018, -0.28, 0.006]], [0.06, 0.055, 0.049], 7, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.95)), 0, 0, { capEnd: true, capCol: SHIRT_D });
  const arm = pivot(sx < 0 ? 'armL' : 'armR', sx * 0.204, 1.292, 0, upper);
  const fore = new Soup();
  tube(fore, [[0, 0.03, 0], [sx * 0.002, -0.12, -0.004], [sx * 0.004, -0.225, -0.006]], [0.049, 0.044, 0.04], 7, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.95)), 0, 0, { capStart: true, capCol: SHIRT });
  tube(fore, [[sx * 0.004, -0.215, -0.006], [sx * 0.004, -0.25, -0.006]], [0.045, 0.045], 7, SHIRT_D, 0, 0, { capEnd: true });
  sideHand(fore, sx * 0.004, -0.248, -0.006, sx);
  const forearm = pivot(sx < 0 ? 'forearmL' : 'forearmR', sx * 0.018, -0.27, 0.006, fore);
  forearm.rotation.x = 0.2;
  arm.add(forearm);
  return arm;
}

function buildLeg(sx) {
  const thigh = new Soup();
  tube(thigh, [[0, 0.03, 0], [0, -0.2, -0.008], [0, -0.41, -0.004], [0, -0.44, 0.002]], [0.094, 0.086, 0.074, 0.06], 7, (i, j) => (j & 1 ? PANTS : PANTS_D), 0, 0, { capStart: true, capEnd: true });
  const leg = pivot(sx < 0 ? 'legL' : 'legR', sx * 0.096, 0.88, 0, thigh);
  const shin = new Soup();
  tube(shin, [[0, 0.01, 0], [0, -0.06, 0.004]], [0.07, 0.068], 7, (i, j) => (j & 1 ? PANTS : PANTS_D), 0, 0);
  tube(shin, [[0, -0.02, 0.006], [0, -0.055, 0.006]], [0.084, 0.084], 8, shade(BOOT, 1.12), 0, 0, { capStart: true });
  tube(shin, [[0, -0.05, 0.006], [0, -0.24, 0.01], [0, -0.37, 0.014]], [0.078, 0.073, 0.074], 8, (i, j) => (j & 1 ? BOOT : shade(BOOT, 0.92)), 0, 0, {});
  hexa(shin, [[-0.062, -0.45, 0.085], [0.062, -0.45, 0.085], [0.056, -0.45, -0.215], [-0.056, -0.45, -0.215], [-0.07, -0.32, 0.075], [0.07, -0.32, 0.075], [0.052, -0.37, -0.17], [-0.052, -0.37, -0.17]], (f) => (f === 0 ? SOLE : f === 1 ? BOOT : f === 2 || f === 4 ? shade(BOOT, 0.9) : BOOT));
  const knee = pivot(sx < 0 ? 'shinL' : 'shinR', 0, -0.43, 0, shin);
  leg.add(knee);
  return leg;
}

export function buildAvatar(color = 0xe8742c) {
  const vest = new THREE.Color(color);
  const root = new THREE.Group();
  root.name = 'avatar';
  const body = pivot('body', 0, 0.85, 0, buildTorso(vest));
  const head = pivot('head', 0, 1.427, 0, buildHead(vest));
  head.children[0].scale.setScalar(1.18);
  root.add(body, head, buildArm(-1), buildArm(1), buildLeg(-1), buildLeg(1));
  return root;
}

function finger(S, base, dir, up, lens, radii, curl, sides = 5) {
  const pts = [base];
  const d = norm(dir);
  let ang = 0;
  for (let i = 0; i < lens.length; i++) {
    ang += curl[i];
    const v = norm(add(mul(d, Math.cos(ang)), mul(up, Math.sin(ang))));
    pts.push(add(pts[pts.length - 1], mul(v, lens[i])));
  }
  tube(S, pts, radii, sides, shadeBy(HAND, HAND_M, HAND_D), 0, 0, { capEnd: true, capCol: HAND });
}

function cupPalm(S, px, py, pz, sx) {
  const xs = [-0.026, 0, 0.027], zs = [0.044, 0, -0.044], th = 0.011;
  const top = [], bot = [];
  for (let iz = 0; iz < 3; iz++) {
    for (let ix = 0; ix < 3; ix++) {
      const edge = ix !== 1 || iz !== 1;
      const lift = iz === 2 ? 0.011 : ix === (sx > 0 ? 2 : 0) ? 0.012 : 0.008;
      const w = iz === 0 ? 0.86 : 1;
      top.push([px + xs[ix] * w * sx, py + th + (edge ? lift : -0.006), pz + zs[iz]]);
      bot.push([px + xs[ix] * w * sx * 0.94, py - th + (iz === 1 && ix === 1 ? -0.003 : 0), pz + zs[iz] * 0.95]);
    }
  }
  const id = (ix, iz) => iz * 3 + ix;
  const ctr = [px, py, pz];
  const inner = mixC(HAND, C('#e8c09c'), 0.5);
  for (let iz = 0; iz < 2; iz++) {
    for (let ix = 0; ix < 2; ix++) {
      const q = [id(ix, iz), id(ix + 1, iz), id(ix + 1, iz + 1), id(ix, iz + 1)];
      const cq = q.map((k) => (top[k][1] < py + th ? mixC(inner, HAND_M, 0.35) : inner));
      S.triC(top[q[0]], top[q[1]], top[q[2]], cq[0], cq[1], cq[2], 0, [0, 1, 0]);
      S.triC(top[q[0]], top[q[2]], top[q[3]], cq[0], cq[2], cq[3], 0, [0, 1, 0]);
      S.quad(bot[q[0]], bot[q[1]], bot[q[2]], bot[q[3]], HAND_D, 0, [0, -1, 0]);
    }
  }
  const ring = [id(0, 0), id(1, 0), id(2, 0), id(2, 1), id(2, 2), id(1, 2), id(0, 2), id(0, 1)];
  for (let k = 0; k < 8; k++) {
    const a = ring[k], b = ring[(k + 1) % 8];
    const m = mul(add(top[a], top[b]), 0.5);
    S.triC(top[a], top[b], bot[b], HAND, HAND, HAND_D, 0, [m[0] - ctr[0], 0, m[2] - ctr[2]]);
    S.triC(top[a], bot[b], bot[a], HAND, HAND_D, HAND_D, 0, [m[0] - ctr[0], 0, m[2] - ctr[2]]);
  }
}

export function buildViewHands() {
  const root = new THREE.Group();
  root.name = 'viewHands';
  for (const sx of [-1, 1]) {
    const S = new Soup();
    const px = sx * 0.1, py = -0.27, pz = -0.42;
    const elbow = [sx * 0.22, -0.45, -0.08], wrist = [sx * 0.104, -0.28, pz + 0.07];
    tube(S, [elbow, [sx * 0.17, -0.37, -0.22], wrist], [0.042, 0.039, 0.035], 8, (i, j) => (j & 1 ? SHIRT : shade(SHIRT, 0.94)), 0, 0, { capStart: true });
    tube(S, [add(wrist, [0, 0.001, 0.014]), add(wrist, [-sx * 0.002, 0.002, -0.016])], [0.04, 0.04], 8, SHIRT_D, 0, 0, { capStart: true, capEnd: true });
    tube(S, [add(wrist, [0, 0.003, -0.012]), [px, py - 0.001, pz + 0.04]], [0.022, 0.024], 6, shadeBy(HAND, HAND_M, HAND_D), 0, 0);
    cupPalm(S, px, py, pz, sx);
    blob(S, [px + sx * 0.02, py + 0.012, pz + 0.02], [0.014, 0.011, 0.022], 0, () => HAND, { jitter: 0.05, vcol: (p) => (p[1] < py + 0.008 ? HAND_M : HAND) });
    const up = [0, 1, 0];
    for (let i = 0; i < 4; i++) {
      const fx = px + sx * 0.019 - sx * i * 0.0128;
      const spread = (i - 1.5) * 0.07 * sx;
      const k = i === 3 ? 0.8 : i === 0 ? 0.93 : 1;
      finger(S, [fx, py + 0.016, pz - 0.042], [spread, 0.04, -1], up, [0.03 * k, 0.022 * k, 0.017 * k], [0.0074, 0.007, 0.0064, 0.0054], [0.2, 0.3, 0.3]);
    }
    const tb = [px + sx * 0.03, py + 0.014, pz + 0.006];
    finger(S, tb, [sx * 0.35, 0.5, -0.75], norm([-sx * 0.55, 1, -0.12]), [0.024, 0.026, 0.022], [0.0094, 0.0088, 0.0078, 0.0064], [0.22, 0.5, 0.32], 6);
    const m = new THREE.Mesh(S.geometry(), MAT);
    m.name = sx < 0 ? 'handL' : 'handR';
    root.add(m);
  }
  return root;
}
