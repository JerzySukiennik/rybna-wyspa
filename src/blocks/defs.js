// Rybna Wyspa: per-block visual geometry, physics colliders, effect zones and connection ports, all from one set of dimensions.

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { BLOCKS, BLOCK_BY_ID } from '../data/blocks.js';

export const BELT_TOP = 0.55;
export const FLUME_WATER = BELT_TOP + 0.15;
export const FLUME_FLOOR = FLUME_WATER - 0.3;
export const CURVE_R = 1;
const CC = 0.75;

export const COLORS = {
  metal: '#7f888e', metalD: '#5d666c', metalL: '#a7afb4', galvL: '#c3c9cc', rubber: '#3a3a39', yellow: '#d9a43a', blue: '#4f7fb0', violet: '#8a6bb8',
  wood: '#a8835a', woodD: '#7a5a3c', woodL: '#c2a073', plank: '#b08d62', funnel: '#a7afb4', funnelD: '#7f888e',
  ice: '#dfeef2', iceD: '#b8d4dc', tray: '#7f888e', glass: '#bfd8e0', post: '#7a5a3c', crate: '#b08a58', crateD: '#8a6a42',
  dark: '#2b2f33', lamp: '#ffb347', water: '#4f8a86', iron: '#2b2f33', cast: '#2f3d35', castL: '#41544a', stone: '#8d8a80', stoneD: '#77746b',
  concrete: '#a29f94', rope: '#b9a57a', net: '#3b423c', float: '#d9a43a', tank: '#d6dcd8',
};
const K = COLORS;

export const ACCENT = {
  myjnia: '#5fa8d6', solarnia: '#eef0f2', wedzarnia: '#a8692c', zamrazarka: '#8fd0ea', szczotkarnia: '#d9a43a', polerka: '#e8cf7a',
  grill: '#e07a3c', transformator: '#e8c23a', wazenie: '#6fb86a', czekoladziarnia: '#6b3a22', cukiernia: '#e89fc4', neonownia: '#4fe8a0',
  kadz: '#9bc83b', pakowaczka: '#c9935c', piec: '#e86a20', magnetyzer: '#d85fc4', komora: '#9ad83a', pikselator: '#5f9ee0',
  etykieciarka: '#f2efe6', dyskoteka: '#e07bd8', robofabryka: '#9aa3ad', wulkan: '#e0602a', krysztalownia: '#a8def2', portal_k: '#9b7be8',
  kontrola: '#4fd8cc', reaktor: '#e06be0', diamentownia: '#c4ecf6',
};

export function curvePoint(curve, a, r) {
  return [-CC * curve + curve * Math.cos(a) * r, CC + Math.sin(a) * r];
}

export function curveTangent(curve, lx, lz) {
  const mx = curve > 0 ? lx : -lx;
  const a = Math.atan2(lz - CC, mx + CC);
  const r = Math.hypot(lz - CC, mx + CC);
  const tx = Math.sin(a), tz = -Math.cos(a);
  return { x: curve > 0 ? tx : -tx, z: tz, r, a };
}

function tier(def) {
  return def.fast === 2 ? K.violet : def.fast === 1 ? K.blue : K.yellow;
}

function legs(g, w, l, h, color) {
  const lx = w / 2 - 0.08, lz = l / 2 - 0.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * lx, h / 2, sz * lz, 0.08, h, 0.08, color);
}

function trestle(g, z, w, top, yaw = 0, x = 0) {
  g.at(x, 0, z, yaw);
  const hw = w / 2 - 0.06;
  for (const s of [-1, 1]) {
    g.line([s * (hw + 0.07), 0.02, 0], [s * (hw - 0.01), top, 0], 0.026, K.metalD, 5);
    g.box(s * (hw + 0.07), 0.015, 0, 0.16, 0.03, 0.12, K.metalD);
  }
  g.box(0, top * 0.42, 0, w - 0.12, 0.04, 0.04, K.metalD);
  g.line([-(hw + 0.03), top * 0.42, 0], [hw - 0.01, top - 0.02, 0], 0.016, K.metalD, 4);
  g.box(0, top - 0.015, 0, w + 0.02, 0.05, 0.07, K.metalD);
  g.pop();
}

function bolts(g, x, y, z0, z1, step, color) {
  for (let z = z0; z <= z1 + 1e-4; z += step) g.box(x, y, z, 0.012, 0.028, 0.028, color);
}

function motor(g, x, z, def, side = 1) {
  const y = BELT_TOP - 0.13;
  g.line([x, y, z], [x + side * 0.24, y, z], 0.085, tier(def), 8);
  g.line([x + side * 0.24, y, z], [x + side * 0.27, y, z], 0.06, K.metalD, 8);
  g.box(x + side * 0.05, y - 0.1, z, 0.16, 0.05, 0.18, K.metalD);
  for (let i = 0; i < 4; i++) g.box(x + side * (0.05 + i * 0.05), y + 0.085, z, 0.012, 0.02, 0.15, K.metalD);
}

function straightBelt(g, w, l, def) {
  const top = BELT_TOP, hw = w / 2;
  for (const s of [-1, 1]) {
    g.box(s * (hw - 0.03), top + 0.02, 0, 0.06, 0.2, l, K.metalL, { top: K.galvL });
    g.box(s * (hw - 0.005), top + 0.115, 0, 0.012, 0.012, l, K.galvL);
    bolts(g, s * (hw + 0.002), top - 0.03, -l / 2 + 0.2, l / 2 - 0.2, 0.4, K.metalD);
  }
  g.box(0, top - 0.035, 0, w - 0.12, 0.06, l - 0.06, K.rubber);
  for (const e of [-1, 1]) g.line([-(hw - 0.08), top - 0.045, e * (l / 2 - 0.045)], [hw - 0.08, top - 0.045, e * (l / 2 - 0.045)], 0.045, K.galvL, 8);
  for (let z = -l / 2 + 0.25; z <= l / 2 - 0.24; z += Math.abs(z) > l / 2 - 0.6 ? 0.25 : 0.5) g.line([-(hw - 0.1), top - 0.13, z], [hw - 0.1, top - 0.13, z], 0.03, K.metalD, 6);
  const ts = l <= 1.01 ? [0] : l <= 2.01 ? [-l / 2 + 0.35, l / 2 - 0.35] : [-l / 2 + 0.45, 0, l / 2 - 0.45];
  for (const z of ts) trestle(g, z, w, top - 0.08);
  motor(g, hw + 0.01, -l / 2 + 0.2, def);
}

function stripStraight(w, l) {
  const g = new Geo();
  const y = BELT_TOP + 0.004, x0 = -w / 2 + 0.06, x1 = w / 2 - 0.06;
  g.quadN([x0, y, l / 2], [x1, y, l / 2], [x1, y, -l / 2], [x0, y, -l / 2], [0, 1, 0], K.rubber, 0, [[0, 0], [1, 0], [1, l], [0, l]]);
  return g.geometry({ uv: true });
}

function arcSegs(seg, fn) {
  for (let i = 0; i < seg; i++) fn(-(i / seg) * Math.PI / 2, -((i + 1) / seg) * Math.PI / 2, i);
}

function radial(curve, a) {
  return [curve * Math.cos(a), 0, Math.sin(a)];
}

function curveBelt(g, def) {
  const c = def.curve, top = BELT_TOP;
  const ri = CURVE_R - 0.5, ro = CURVE_R + 0.5;
  const P = (a, r, y) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
  arcSegs(10, (a0, a1) => {
    const am = (a0 + a1) / 2, out = radial(c, am), inn = out.map((v) => -v);
    g.quadN(P(a0, ri + 0.06, top - 0.005), P(a0, ro - 0.06, top - 0.005), P(a1, ro - 0.06, top - 0.005), P(a1, ri + 0.06, top - 0.005), [0, 1, 0], K.rubber);
    g.quadN(P(a0, ri + 0.06, top - 0.065), P(a0, ro - 0.06, top - 0.065), P(a1, ro - 0.06, top - 0.065), P(a1, ri + 0.06, top - 0.065), [0, -1, 0], K.rubber);
    for (const [r0, r1] of [[ri, ri + 0.06], [ro - 0.06, ro]]) {
      g.quadN(P(a0, r0, top + 0.12), P(a0, r1, top + 0.12), P(a1, r1, top + 0.12), P(a1, r0, top + 0.12), [0, 1, 0], K.galvL);
      g.quadN(P(a0, r1, top - 0.08), P(a1, r1, top - 0.08), P(a1, r1, top + 0.12), P(a0, r1, top + 0.12), out, K.metalL);
      g.quadN(P(a0, r0, top - 0.08), P(a1, r0, top - 0.08), P(a1, r0, top + 0.12), P(a0, r0, top + 0.12), inn, K.metalL);
      g.quadN(P(a0, r0, top - 0.08), P(a0, r1, top - 0.08), P(a1, r1, top - 0.08), P(a1, r0, top - 0.08), [0, -1, 0], K.metalD);
    }
  });
  for (const a of [0, -Math.PI / 2]) {
    const pa = P(a, ri + 0.08, top - 0.045), pb = P(a, ro - 0.08, top - 0.045);
    const k = a === 0 ? 0.045 : -0.045;
    const tz = a === 0 ? [0, 0, -k] : [c * -k, 0, 0];
    g.line([pa[0] + tz[0], pa[1], pa[2] + tz[2]], [pb[0] + tz[0], pb[1], pb[2] + tz[2]], 0.045, K.galvL, 8);
  }
  const mq = curvePoint(c, -Math.PI / 4, CURVE_R);
  g.at(mq[0], 0, mq[1], (c > 0 ? Math.PI / 4 : -Math.PI / 4));
  trestle(g, 0, 1.0, top - 0.08);
  g.pop();
}

function stripCurve(c) {
  const g = new Geo();
  const ri = CURVE_R - 0.44, ro = CURVE_R + 0.44, y = BELT_TOP + 0.004, len = (Math.PI / 2) * CURVE_R, seg = 10;
  const P = (a, r) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
  arcSegs(seg, (a0, a1, i) => {
    const v0 = (i / seg) * len, v1 = ((i + 1) / seg) * len;
    g.quadN(P(a0, ri), P(a0, ro), P(a1, ro), P(a1, ri), [0, 1, 0], K.rubber, 0, [[0, v0], [1, v0], [1, v1], [0, v1]]);
  });
  return g.geometry({ uv: true });
}

const FW = 0.42;
const FT = 0.08;
const FTILT = 0.18;

function woodTrestle(g, z, half, top, yaw = 0, x = 0) {
  g.at(x, 0, z, yaw);
  for (const s of [-1, 1]) g.box(s * half, top / 2, 0, 0.09, top, 0.09, K.woodD);
  g.box(0, top - 0.05, 0, half * 2 + 0.16, 0.1, 0.11, K.woodD);
  g.line([-half, 0.06, 0], [half, top - 0.1, 0], 0.025, K.woodD, 4);
  g.pop();
}

function flumeStraight(g, w, l) {
  const F = FLUME_FLOOR;
  g.box(0, F - 0.04, 0, FW * 2 + 0.02, 0.08, l, K.woodD, { top: '#8f6a44' });
  for (const s of [-1, 1]) g.at(s * (FW + FT / 2), F, 0, 0, 0, -s * FTILT).box(0, 0.24, 0, FT, 0.48, l, K.wood, { top: K.woodL }).pop();
  for (let z = -l / 2 + 0.3; z < l / 2; z += 0.9) {
    for (const s of [-1, 1]) g.at(s * (FW + 0.1), F, z, 0, 0, -s * FTILT).box(0, 0.2, 0, 0.05, 0.46, 0.08, K.iron).pop();
    g.box(0, F - 0.1, z, FW * 2 + 0.3, 0.04, 0.06, K.iron);
  }
  const ts = l <= 2.01 ? [-l / 2 + 0.4, l / 2 - 0.4] : [-l / 2 + 0.45, 0, l / 2 - 0.45];
  for (const z of ts) woodTrestle(g, z, FW + 0.05, F - 0.08);
}

function flumeCurve(g, c) {
  const F = FLUME_FLOOR;
  const ri = CURVE_R - FW, ro = CURVE_R + FW;
  const P = (a, r, y) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
  const top = F + 0.48, lean = 0.48 * Math.sin(FTILT);
  arcSegs(8, (a0, a1) => {
    const am = (a0 + a1) / 2, out = radial(c, am), inn = out.map((v) => -v);
    g.quadN(P(a0, ri, F), P(a0, ro, F), P(a1, ro, F), P(a1, ri, F), [0, 1, 0], '#8f6a44');
    g.quadN(P(a0, ri - 0.02, F - 0.08), P(a0, ro + 0.02, F - 0.08), P(a1, ro + 0.02, F - 0.08), P(a1, ri - 0.02, F - 0.08), [0, -1, 0], K.woodD);
    for (const [r, sgn] of [[ro, 1], [ri, -1]]) {
      const facing = sgn > 0 ? inn : out;
      const away = sgn > 0 ? out : inn;
      const rTop = r + sgn * lean, rOut = r + sgn * FT, rOutTop = rOut + sgn * lean;
      g.quadN(P(a0, r, F), P(a1, r, F), P(a1, rTop, top), P(a0, rTop, top), facing, K.wood);
      g.quadN(P(a0, rOut, F - 0.08), P(a1, rOut, F - 0.08), P(a1, rOutTop, top), P(a0, rOutTop, top), away, K.wood);
      g.quadN(P(a0, rTop, top), P(a1, rTop, top), P(a1, rOutTop, top), P(a0, rOutTop, top), [0, 1, 0], K.woodL);
    }
  });
  const mq = curvePoint(c, -Math.PI / 4, CURVE_R);
  g.at(mq[0], 0, mq[1], c > 0 ? Math.PI / 4 : -Math.PI / 4);
  woodTrestle(g, 0, FW + 0.05, F - 0.08);
  g.pop();
}

function flumeWaterGeo(l, c) {
  const g = new Geo();
  const y = FLUME_WATER, hw = FW + 0.03;
  if (!c) {
    g.quadN([-hw, y, l / 2], [hw, y, l / 2], [hw, y, -l / 2], [-hw, y, -l / 2], [0, 1, 0], K.water, 0, [[0, 0], [1, 0], [1, l], [0, l]]);
  } else {
    const len = (Math.PI / 2) * CURVE_R, seg = 10;
    const P = (a, r) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
    arcSegs(seg, (a0, a1, i) => {
      const v0 = (i / seg) * len, v1 = ((i + 1) / seg) * len;
      g.quadN(P(a0, CURVE_R - hw), P(a0, CURVE_R + hw), P(a1, CURVE_R + hw), P(a1, CURVE_R - hw), [0, 1, 0], K.water, 0, [[0, v0], [1, v0], [1, v1], [0, v1]]);
    });
  }
  return g.geometry({ uv: true });
}

export function funnelVisual(g, r, outR, neck, top, o = {}) {
  const seg = 12;
  const P = (rr, a, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    const outN = [Math.cos(am), 0, Math.sin(am)];
    const inN = [-Math.cos(am) * 0.7, 0.7, -Math.sin(am) * 0.7];
    g.quadN(P(r, a0, top), P(r, a1, top), P(outR, a1, neck), P(outR, a0, neck), inN, o.inner || (i % 2 ? K.metal : '#929ba1'));
    g.quadN(P(r + 0.05, a0, top), P(r + 0.05, a1, top), P(outR + 0.05, a1, neck), P(outR + 0.05, a0, neck), [outN[0], -0.6, outN[2]], o.outer || (i % 2 ? K.metalL : '#b4bcc1'));
    g.quadN(P(r, a0, top), P(r + 0.05, a0, top), P(r + 0.05, a1, top), P(r, a1, top), [0, 1, 0], o.rim || K.galvL);
  }
  g.ring(0, neck - 0.16, 0, outR, outR + 0.07, 0.16, seg, K.metalD);
}

function base(g, w, d, h = 0.16, color = K.stone) {
  g.box(0, h / 2, 0, w, h, d, color, { top: K.stoneD });
  g.box(0, h + 0.01, 0, w - 0.08, 0.02, d - 0.08, K.stoneD);
}

function pumpVisual(g) {
  base(g, 0.9, 0.9, 0.26);
  g.box(0, 0.05, -0.5, 0.5, 0.1, 0.24, K.iron);
  for (let i = 0; i < 4; i++) g.box(-0.18 + i * 0.12, 0.105, -0.5, 0.03, 0.01, 0.2, '#14181b');
  g.cyl(0, 0.27, 0.05, 0.2, 0.17, 0.16, 10, K.castL);
  g.cyl(0, 0.43, 0.05, 0.15, 0.13, 0.95, 10, K.cast, { alt: K.castL });
  for (const y of [0.62, 1.12, 1.36]) g.cyl(0, y, 0.05, 0.165, 0.165, 0.05, 10, K.castL);
  g.cyl(0, 1.38, 0.05, 0.16, 0.06, 0.16, 10, K.cast);
  g.cyl(0, 1.54, 0.05, 0.05, 0.02, 0.1, 6, K.castL);
  g.line([0, 1.06, -0.05], [0, 1.08, -0.36], 0.055, K.cast, 8);
  g.line([0, 1.08, -0.36], [0, 0.98, -0.47], 0.055, K.cast, 8);
  g.cyl(0, 0.9, -0.48, 0.075, 0.06, 0.09, 8, K.castL);
  g.box(0, 1.5, 0.12, 0.05, 0.16, 0.06, K.castL);
  g.line([0, 1.52, 0.12], [0, 1.67, 0.62], 0.028, K.cast, 6);
  g.line([0, 1.67, 0.62], [0, 1.6, 0.86], 0.026, K.cast, 6);
  g.cyl(0, 1.56, 0.88, 0.05, 0.05, 0.08, 6, K.castL);
  g.line([0, 1.33, 0.05], [0, 1.52, 0.12], 0.02, K.cast, 5);
  return { outlet: [0, 0.98, -0.56], vel: [0, 0.7, -1.9], lever: [0, 1.62, 0.6] };
}

function netPanel(g, x0, x1, yTop, yBot, z, sag, nx = 7, ny = 6) {
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    const k = Math.sin((i / nx) * Math.PI);
    g.line([x, yTop, z], [x, (yTop + yBot) / 2, z - sag * k], 0.007, K.net, 3);
    g.line([x, (yTop + yBot) / 2, z - sag * k], [x, yBot, z - sag * k * 0.5], 0.007, K.net, 3);
  }
  for (let j = 1; j <= ny; j++) {
    const t = j / ny, y = yTop + (yBot - yTop) * t;
    const zz = z - sag * Math.sin(t * Math.PI * 0.8);
    g.line([x0, y, z - sag * 0.1 * t], [x1, y, z - sag * 0.1 * t], 0.006, K.net, 3);
    g.line([(x0 + x1) / 2 - 0.2, y, zz], [(x0 + x1) / 2 + 0.2, y, zz], 0.006, K.net, 3);
  }
}

function siecVisual(g, def) {
  const [w, , d] = def.dim;
  g.box(0, 0.07, 0, w, 0.14, d, K.woodD, { top: K.wood });
  for (let i = 0; i < 5; i++) g.box(-w / 2 + 0.12 + i * ((w - 0.24) / 4), 0.145, 0, 0.18, 0.01, d - 0.05, i % 2 ? K.wood : K.plank);
  for (const s of [-1, 1]) {
    g.cyl(s * 0.52, 0.14, 0.32, 0.055, 0.045, 2.25, 6, K.woodD);
    g.line([s * 0.52, 0.14, 0.32 + 0.45], [s * 0.52, 1.3, 0.32], 0.03, K.woodD, 5);
  }
  g.line([-0.6, 2.25, 0.32], [0.6, 2.25, 0.32], 0.04, K.woodD, 6);
  netPanel(g, -0.48, 0.48, 2.2, 0.9, 0.28, 0.32);
  for (let i = 0; i < 6; i++) g.cyl(-0.42 + i * 0.168, 2.12, 0.28, 0.04, 0.04, 0.09, 6, K.float);
  for (let i = 0; i < 4; i++) g.cyl(-0.33 + i * 0.22, 0.86, 0.12, 0.03, 0.03, 0.05, 6, K.iron);
  const cz = -0.05;
  g.at(0, 0.92, cz, 0, -0.42, 0);
  g.box(0, 0, -0.32, 0.5, 0.04, 0.78, K.plank);
  for (const s of [-1, 1]) g.box(s * 0.25, 0.08, -0.32, 0.04, 0.16, 0.78, K.wood);
  g.pop();
  for (const s of [-1, 1]) g.box(s * 0.22, 0.5, -0.45, 0.06, 0.72, 0.06, K.woodD);
  g.line([0.6, 2.25, 0.32], [0.62, 1.4, 0.66], 0.012, K.rope, 4);
  return { outlet: [0, 1.12, -0.82], vel: [0, 0.9, -1.7] };
}

function wiecierzVisual(g) {
  for (const z of [0.38, -0.3]) {
    for (const s of [-1, 1]) g.line([s * 0.42, 0, z], [s * 0.08, 0.62, z], 0.035, K.woodD, 5);
    g.box(0, 0.5, z, 0.7, 0.05, 0.07, K.woodD);
  }
  const hoops = [[0.52, 0.42], [0.44, 0.17], [0.36, -0.06], [0.28, -0.27], [0.2, -0.45]];
  const cy = 1.02;
  for (const [r, z] of hoops) g.torus(0, cy, z, r, 0.022, 14, 4, K.woodL);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    for (let i = 0; i < hoops.length - 1; i++) {
      const [r0, z0] = hoops[i], [r1, z1] = hoops[i + 1];
      g.line([Math.cos(a) * r0, cy + Math.sin(a) * r0, z0], [Math.cos(a) * r1, cy + Math.sin(a) * r1, z1], 0.006, K.net, 3);
    }
  }
  for (let i = 0; i < hoops.length - 1; i++) {
    const [r0, z0] = hoops[i], [r1, z1] = hoops[i + 1];
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
      const rm = (r0 + r1) / 2, zm = (z0 + z1) / 2;
      g.line([Math.cos(a0) * rm, cy + Math.sin(a0) * rm, zm], [Math.cos(a1) * rm, cy + Math.sin(a1) * rm, zm], 0.005, K.net, 3);
    }
  }
  for (const s of [-1, 1]) {
    g.cyl(s * 0.58, 0, 0.5, 0.035, 0.03, 1.55, 6, K.woodD);
    netPanel(g, s > 0 ? 0.5 : -0.58, s > 0 ? 0.58 : -0.5, 1.5, 0.55, 0.5, 0.02, 1, 5);
    g.line([s * 0.52, cy + 0.45, 0.42], [s * 0.58, 1.5, 0.5], 0.006, K.net, 3);
  }
  g.cyl(0, cy - 0.08, -0.5, 0.09, 0.07, 0.16, 8, K.float);
  return { outlet: [0, cy - 0.05, -0.68], vel: [0, 1.0, -1.7] };
}

function klatkaVisual(g, def) {
  const [w, , d] = def.dim;
  const hw = w / 2 - 0.02;
  g.box(0, 0.18, 0, w, 0.36, d, K.woodD, { top: K.wood });
  g.box(0, 0.37, 0, w - 0.14, 0.01, d - 0.14, '#3f6560');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.line([sx * (hw - 0.12), 0.48, sz * (hw - 0.12) - 0.12], [sx * (hw - 0.12), 0.48, sz * (hw - 0.12) + 0.12], 0.11, '#4f7fb0', 8);
  }
  for (const s of [-1, 1]) {
    g.box(s * (hw - 0.12), 0.6, 0, 0.06, 0.06, d - 0.2, K.metalL);
    g.box(0, 0.6, s * (hw - 0.12), w - 0.2, 0.06, 0.06, K.metalL);
  }
  for (let i = 0; i < 6; i++) g.box(-hw + 0.2 + i * ((w - 0.44) / 5), 0.64, 0.05, 0.1, 0.02, d - 0.35, K.galvL);
  g.cyl(0.42, 0.62, 0.42, 0.045, 0.04, 1.95, 6, K.metalD);
  g.line([0.42, 2.5, 0.42], [-0.05, 2.32, -0.62], 0.035, K.metalD, 5);
  g.line([0.42, 1.4, 0.42], [0.2, 2.3, -0.2], 0.022, K.metalD, 4);
  g.line([-0.05, 2.32, -0.62], [-0.05, 1.62, -0.62], 0.008, K.rope, 3);
  g.at(-0.05, 1.6, -0.62, 0, Math.PI / 2, 0).torus(0, 0, 0, 0.18, 0.016, 12, 4, K.metalL).pop();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.line([-0.05 + Math.cos(a) * 0.18, 1.6, -0.62 + Math.sin(a) * 0.18], [-0.05, 1.24, -0.62], 0.005, K.net, 3);
  }
  return { outlet: [-0.05, 1.28, -0.66], vel: [0, 0.8, -1.8] };
}

function wylegarniaVisual(g, def) {
  const [w, , d] = def.dim;
  base(g, w, d, 0.12, K.concrete);
  for (const [x, z, r, h] of [[-0.3, 0.2, 0.3, 0.75], [0.33, 0.2, 0.26, 0.62]]) {
    g.cyl(x, 0.12, z, r, r, h, 12, K.tank, { top: '#c3cbc6' });
    g.cyl(x, 0.12 + h - 0.06, z, r - 0.03, r - 0.03, 0.065, 12, '#3f6f6a', { top: '#4f8a86' });
    g.ring(x, 0.12 + h, z, r - 0.03, r + 0.01, 0.03, 12, '#b9c2bd');
  }
  g.line([-0.3, 0.95, 0.2], [-0.3, 1.25, 0.2], 0.035, K.metalL, 6);
  g.line([-0.3, 1.25, 0.2], [0.33, 1.25, 0.2], 0.035, K.metalL, 6);
  g.line([0.33, 1.25, 0.2], [0.33, 0.8, 0.2], 0.035, K.metalL, 6);
  g.box(0.42, 0.32, -0.35, 0.34, 0.4, 0.3, '#5f7f9a', { top: '#4f6f8a' });
  g.box(0.42, 0.42, -0.505, 0.12, 0.08, 0.01, '#9be8c8', { emit: 0.8 });
  g.cyl(0, 0.12, -0.25, 0.12, 0.1, 1.0, 8, K.tank);
  g.line([0, 1.0, -0.25], [0, 1.08, -0.55], 0.06, K.metalL, 8);
  return { outlet: [0, 1.06, -0.62], vel: [0, 0.8, -1.8] };
}

function glebinowaVisual(g, def) {
  const [w, , d] = def.dim;
  base(g, w, d, 0.12, K.concrete);
  const apex = [0, 2.45, 0.05];
  for (const [x, z] of [[-0.55, 0.45], [0.55, 0.45], [0, -0.5]]) g.line([x, 0.12, z], apex, 0.035, K.metalD, 5);
  g.torus(0, 2.32, 0.05, 0.13, 0.025, 10, 4, K.iron);
  g.line([0, 2.32, 0.05], [0, 0.6, 0.05], 0.008, K.iron, 3);
  g.cyl(0, 0.12, 0.05, 0.13, 0.13, 0.5, 10, '#4f6f8a', { top: '#3f5f7a' });
  g.box(0.32, 0.35, 0.25, 0.3, 0.42, 0.34, '#4f6f8a', { top: '#3f5f7a' });
  for (let i = 0; i < 4; i++) g.box(0.48, 0.25 + i * 0.07, 0.25, 0.01, 0.03, 0.26, K.iron);
  g.line([0, 0.58, 0.05], [0, 1.15, 0.05], 0.07, K.metalL, 8);
  g.line([0, 1.15, 0.05], [0, 1.15, -0.5], 0.07, K.metalL, 8);
  g.cyl(0, 1.08, -0.55, 0.09, 0.09, 0.14, 8, K.metalD);
  g.box(-0.36, 0.45, 0.3, 0.12, 0.66, 0.12, K.metalD);
  g.box(-0.36, 0.82, 0.3, 0.1, 0.08, 0.1, '#e8c23a', { emit: 0.6 });
  return { outlet: [0, 1.12, -0.68], vel: [0, 0.8, -1.8] };
}

function sonarVisual(g, def) {
  base(g, def.dim[0], def.dim[2], 0.12, K.concrete);
  g.box(-0.28, 0.5, 0.22, 0.5, 0.76, 0.56, '#d6d8d2', { top: '#9aa3ad' });
  g.box(-0.28, 0.66, -0.065, 0.32, 0.18, 0.01, '#5fd0a8', { emit: 0.9 });
  for (const [x, z] of [[0.18, 0.12], [0.5, 0.12], [0.18, 0.44], [0.5, 0.44]]) g.line([x, 0.12, z], [0.34, 2.1, 0.28], 0.018, K.metalD, 4);
  for (const y of [0.6, 1.1, 1.6]) {
    const k = 1 - (y - 0.12) / 1.98;
    g.box(0.34, y, 0.28, 0.32 * k + 0.02, 0.02, 0.32 * k + 0.02, K.metalD);
  }
  g.at(0.34, 2.15, 0.28, -0.6, -0.55, 0);
  g.cyl(0, 0, 0, 0.5, 0.06, 0.2, 12, K.galvL, { top: K.metalL, bottom: K.metalL });
  g.line([0, 0.1, 0], [0, 0.42, 0], 0.012, K.metalD, 4);
  g.pop();
  g.box(0.34, 2.05, 0.28, 0.06, 0.12, 0.06, '#5fd0a8', { emit: 1 });
  g.box(0, 0.32, -0.5, 0.44, 0.3, 0.12, K.metalL);
  g.line([0, 0.47, -0.5], [0, 0.95, -0.55], 0.05, K.metalL, 8);
  return { outlet: [0, 1.0, -0.66], vel: [0, 0.9, -1.8] };
}

function tamaVisual(g, def) {
  const [w, , d] = def.dim;
  g.box(0, 0.12, 0, w, 0.24, d, K.concrete, { top: '#b3b0a5' });
  g.box(0, 0.25, -0.1, w - 0.4, 0.02, d - 0.3, '#3f6f6a');
  for (const s of [-1, 1]) g.box(s * (w / 2 - 0.13), 1.15, 0.2, 0.26, 1.85, 0.36, K.concrete, { top: '#b3b0a5' });
  g.box(0, 2.0, 0.2, w, 0.22, 0.4, K.concrete, { top: '#b3b0a5' });
  for (let i = 0; i < 6; i++) g.box(0, 0.42 + i * 0.22, 0.2, w - 0.52, 0.2, 0.12, i % 2 ? K.wood : K.woodD);
  g.box(0, 1.75, 0.2, 0.08, 0.5, 0.08, K.iron);
  g.line([0, 2.11, 0.2], [0, 2.32, 0.2], 0.03, K.iron, 6);
  g.at(0, 2.42, 0.2, 0, Math.PI / 2, 0);
  g.torus(0, 0, 0, 0.3, 0.025, 14, 4, '#a8483a');
  for (let k = 0; k < 3; k++) g.at(0, 0, 0, 0, 0, (k / 3) * Math.PI).box(0, 0, 0, 0.6, 0.03, 0.03, '#a8483a').pop();
  g.pop();
  g.box(0, 0.3, -0.35, w - 0.55, 0.06, 0.5, '#5a8f8a', { emit: 0.15 });
  return { outlet: [0, 1.0, -0.72], vel: [0, 1.1, -1.7] };
}

function wirVisual(g) {
  g.ring(0, 0, 0, 0.5, 0.68, 0.5, 14, K.stone, { top: K.stoneD });
  const seg = 28;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const r0 = 0.5 * (j / 3), r1 = 0.5 * ((j + 1) / 3);
      const tw = (i + j * 3) % 6 < 3;
      const P = (r, a) => [Math.cos(a + r * 2.5) * r, 0.36 - (0.5 - r) * 0.3, Math.sin(a + r * 2.5) * r];
      g.quadN(P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1), [0, 1, 0], tw ? '#4f8a86' : '#7fb0aa', tw ? 0.25 : 0.4);
    }
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    g.at(0, 0.5, 0, a);
    g.torus(0.32, 0.55, 0, 0.42, 0.03, 8, 4, '#4f7fb0', { arc: Math.PI * 0.6, a0: Math.PI * 0.2 });
    g.pop();
  }
  g.cyl(0, 0.5, 0, 0.06, 0.03, 1.3, 8, K.metalD);
  g.at(0, 1.85, 0, 0, Math.PI / 2, 0).torus(0, 0, 0, 0.16, 0.035, 12, 4, '#9fd8e0', { emit: 0.5 }).pop();
  return { outlet: [0, 1.15, -0.62], vel: [0, 1.0, -1.7] };
}

function zrodloVisual(g) {
  g.ring(0, 0, 0, 0.42, 0.62, 0.72, 12, K.stone, { top: '#a39f94', inner: K.stoneD });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.box(Math.cos(a) * 0.62, 0.18 + (i % 2) * 0.36, Math.sin(a) * 0.62, 0.05, 0.02, 0.2, K.stoneD);
  }
  g.cyl(0, 0.55, 0, 0.42, 0.42, 0.05, 12, '#7fd8c8', { emit: 1.1, top: '#a8f0e0' });
  for (const s of [-1, 1]) g.box(s * 0.56, 1.25, 0, 0.1, 1.4, 0.1, K.woodD);
  g.line([-0.6, 1.62, 0], [0.75, 1.62, 0], 0.04, K.woodD, 6);
  g.line([0.75, 1.62, 0], [0.75, 1.4, -0.18], 0.025, K.iron, 4);
  g.line([0, 1.62, 0], [0, 0.9, 0], 0.008, K.rope, 3);
  g.cyl(0, 0.78, 0, 0.1, 0.12, 0.16, 8, K.wood);
  for (const sz of [-1, 1]) g.quadN([-0.75, 1.95, sz * 0.62], [0.75, 1.95, sz * 0.62], [0.75, 2.4, 0], [-0.75, 2.4, 0], [0, 1, sz], '#5d4f40');
  for (const [a, h] of [[0.6, 0.3], [2.2, 0.42], [4.1, 0.26]]) g.cyl(Math.cos(a) * 0.5, 0.72, Math.sin(a) * 0.5, 0.06, 0, h, 5, '#c08ae0', { emit: 0.9 });
  return { outlet: [0, 1.0, -0.72], vel: [0, 1.2, -1.6] };
}

function portalVisual(g, def) {
  base(g, def.dim[0], def.dim[2], 0.2, K.stoneD);
  for (let i = 0; i < 3; i++) g.box(0, 0.25 + i * 0.07, -0.45 - i * 0.07, 0.9 - i * 0.12, 0.07, 0.2, K.stone);
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const P = (r, a, z) => [Math.cos(a) * r, 1.35 + Math.sin(a) * r, z];
    for (const z of [0.1, 0.3]) g.quadN(P(0.62, a0, z), P(0.62, a1, z), P(0.42, a1, z), P(0.42, a0, z), [0, 0, z > 0.2 ? 1 : -1], i % 2 ? K.stone : '#9a968b');
    g.quadN(P(0.62, a0, 0.1), P(0.62, a1, 0.1), P(0.62, a1, 0.3), P(0.62, a0, 0.3), [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], K.stoneD);
    g.quadN(P(0.42, a0, 0.1), P(0.42, a1, 0.1), P(0.42, a1, 0.3), P(0.42, a0, 0.3), [-Math.cos((a0 + a1) / 2), -Math.sin((a0 + a1) / 2), 0], K.stoneD);
    g.quadN(P(0, a0, 0.2), P(0.42, a0, 0.2), P(0.42, a1, 0.2), P(0, a1, 0.2), [0, 0, -1], i % 2 ? '#5fe0d8' : '#8fefe8', 1.2);
  }
  for (const s of [-1, 1]) g.box(s * 0.5, 0.45, 0.2, 0.22, 0.5, 0.3, K.stone);
  return { outlet: [0, 1.25, -0.4], vel: [0, 1.0, -1.8] };
}

function spawnerVisual(g, def) {
  switch (def.id) {
    case 'pompa': return pumpVisual(g, def);
    case 'siec': return siecVisual(g, def);
    case 'wiecierz': return wiecierzVisual(g);
    case 'klatka': return klatkaVisual(g, def);
    case 'wylegarnia': return wylegarniaVisual(g, def);
    case 'glebinowa': return glebinowaVisual(g, def);
    case 'sonar': return sonarVisual(g, def);
    case 'tama': return tamaVisual(g, def);
    case 'wir': return wirVisual(g);
    case 'zrodlo': return zrodloVisual(g);
    case 'portal': return portalVisual(g, def);
    default: return siecVisual(g, def);
  }
}

function machineVisual(g, def) {
  const acc = ACCENT[def.id] || '#ffffff';
  const [w, h, l] = def.dim;
  straightBelt(g, 1, l, { fast: 0 });
  const hw = w / 2, sh = h - BELT_TOP;
  const housing = '#8a9298', housingD = '#6f777d', trim = '#59616a';
  for (const s of [-1, 1]) {
    g.box(s * (hw - 0.09), BELT_TOP + sh / 2 - 0.02, 0, 0.16, sh, l * 0.8, housing, { top: housingD });
    g.box(s * (hw - 0.005), BELT_TOP + sh * 0.45, 0, 0.012, sh * 0.5, l * 0.5, trim);
    g.box(s * (hw + 0.002), BELT_TOP + sh * 0.45, 0, 0.012, sh * 0.34, l * 0.34, '#2f363b');
    for (const zz of [-1, 1]) g.box(s * (hw - 0.09), BELT_TOP / 2, zz * l * 0.36, 0.14, BELT_TOP, 0.14, housingD);
  }
  g.box(0, h - 0.09, 0, w, 0.18, l * 0.84, housing, { top: housingD });
  g.box(0, h + 0.005, 0, w - 0.16, 0.02, l * 0.7, acc);
  for (const zz of [-1, 1]) {
    g.box(0, h - 0.24, zz * l * 0.41, w - 0.32, 0.12, 0.03, trim);
    for (let i = 0; i < 6; i++) g.box(-0.3 + i * 0.12, BELT_TOP + 0.3 + 0.08, zz * l * 0.405, 0.1, sh - 0.62, 0.012, '#3c4146');
  }
  g.box(hw + 0.08, BELT_TOP + 0.45, l * 0.22, 0.14, 0.34, 0.24, '#d6d8d2', { top: '#b9bcb6' });
  g.box(hw + 0.152, BELT_TOP + 0.52, l * 0.22, 0.01, 0.08, 0.08, acc, { emit: 1.2 });
  g.box(hw + 0.152, BELT_TOP + 0.4, l * 0.22 + 0.05, 0.01, 0.04, 0.04, '#2f363b');
  const id = def.id;
  if (['wedzarnia', 'piec', 'grill', 'wulkan'].includes(id)) {
    g.cyl(w * 0.25, h, 0.3, 0.1, 0.09, 0.7, 8, '#3f4954', { top: '#22262b' });
    g.cyl(w * 0.25, h + 0.68, 0.3, 0.14, 0.14, 0.05, 8, '#3f4954');
  }
  if (id === 'zamrazarka') for (let i = 0; i < 3; i++) g.box(-0.4 + i * 0.4, h + 0.06, 0, 0.25, 0.1, 0.25, K.ice);
  if (['transformator', 'reaktor', 'magnetyzer'].includes(id)) for (const s of [-1, 1]) {
    g.cyl(s * 0.35, h, 0, 0.07, 0.07, 0.3, 8, '#d6d8d2');
    for (let k = 0; k < 3; k++) g.cyl(s * 0.35, h + 0.06 + k * 0.08, 0, 0.11, 0.11, 0.03, 8, '#b9bcb6');
    g.cyl(s * 0.35, h + 0.3, 0, 0.04, 0.04, 0.08, 6, acc, { emit: 1 });
  }
  if (id === 'komora') g.cyl(0, h, 0, 0.3, 0.3, 0.2, 10, '#2b2f35', { top: acc, emitTop: 1 });
  if (id === 'dyskoteka') g.cyl(0, h + 0.05, 0, 0, 0.26, 0.4, 8, '#d0d6dc', { emit: 0.5, alt: '#e07bd8' });
  if (id === 'krysztalownia' || id === 'diamentownia') g.cyl(0, h, 0, 0.22, 0, 0.5, 6, acc, { emit: 0.6 });
  if (id === 'portal_k') g.at(0, h + 0.3, 0, Math.PI / 2, 0, 0).at(0, 0, 0, 0, Math.PI / 2, 0).ring(0, -0.04, 0, 0.22, 0.3, 0.08, 12, acc, { emit: 1 }).pop().pop();
  if (id === 'pikselator') for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.box(-0.3 + i * 0.3, h + 0.08 + j * 0.16, 0, 0.14, 0.14, 0.14, i % 2 === j ? acc : '#2b2f35', { emit: i % 2 === j ? 0.6 : 0 });
  if (['myjnia', 'szczotkarnia'].includes(id)) for (let i = 0; i < 3; i++) g.line([-0.42, BELT_TOP + 0.35, -0.3 + i * 0.3], [0.42, BELT_TOP + 0.35, -0.3 + i * 0.3], 0.07, acc, 8);
  if (['solarnia', 'cukiernia', 'czekoladziarnia', 'kadz'].includes(id)) {
    g.cyl(0, h, -0.1, 0.24, 0.32, 0.36, 10, '#d6d8d2', { top: acc });
    g.line([0, h + 0.05, -0.1], [0, h - 0.3, -0.1], 0.03, '#d6d8d2', 6);
  }
  if (id === 'wazenie' || id === 'kontrola' || id === 'etykieciarka' || id === 'pakowaczka' || id === 'polerka' || id === 'neonownia' || id === 'robofabryka') {
    g.box(0, h + 0.12, 0.2, 0.5, 0.22, 0.3, '#d6d8d2', { top: '#b9bcb6' });
    g.box(0, h + 0.14, 0.045, 0.32, 0.12, 0.01, acc, { emit: 0.8 });
  }
  if (def.upgr) g.box(0, h + 0.4, -l * 0.3, 0.6, 0.24, 0.05, '#f2efe6', { front: acc, back: acc });
}

function wedgeVisual(g, w, h, l) {
  const A = [-w / 2, 0, l / 2], B = [w / 2, 0, l / 2], C = [w / 2, 0, -l / 2], D = [-w / 2, 0, -l / 2];
  const E = [-w / 2, h, -l / 2], F = [w / 2, h, -l / 2];
  g.quadN(A, B, C, D, [0, -1, 0], K.woodD);
  g.quadN(D, C, F, E, [0, 0, -1], K.woodD);
  g.quadN(A, B, F, E, [0, 1, 1], K.woodL);
  g.triN(A, D, E, [-1, 0, 0], K.wood);
  g.triN(B, C, F, [1, 0, 0], K.wood);
}

function solidVisual(g, def) {
  const [w, h, l] = def.dim;
  const mat = def.mat;
  if (def.shape === 'box') {
    if (mat === 'wood' && w >= 2) {
      const n = Math.round(l / 0.4);
      for (let i = 0; i < n; i++) g.box(0, h / 2, -l / 2 + (i + 0.5) * (l / n), w, h, l / n - 0.02, i % 2 ? K.wood : K.woodL, { side: K.woodD });
    } else if (mat === 'plank') {
      for (let i = 0; i < 4; i++) g.box(0, (i + 0.5) * (h / 4), 0, w, h / 4 - 0.015, l, i % 2 ? K.plank : K.woodL, { side: K.plank });
      for (const s of [-1, 1]) g.box(s * (w / 2 - 0.06), h / 2, -l / 2 - 0.02, 0.1, h, 0.04, K.woodD);
    } else if (mat === 'crate') {
      g.box(0, h / 2, 0, w, h, l, K.crate, { top: K.woodL });
      for (const s of [-1, 1]) g.box(0, h / 2, s * (l / 2 + 0.005), w * 0.9, 0.12, 0.01, K.crateD);
      for (const s of [-1, 1]) g.box(s * (w / 2 + 0.005), h / 2, 0, 0.01, 0.12, l * 0.9, K.crateD);
    } else {
      const c = mat === 'glass' ? K.glass : mat === 'post' ? K.post : K.wood;
      g.box(0, h / 2, 0, w, h, l, c, mat === 'glass' ? { top: '#e3f0f4' } : {});
    }
  } else if (def.shape === 'rail') {
    g.box(0, h - 0.04, 0, w, 0.08, l + 0.02, K.woodL);
    for (const x of [-w / 2 + 0.05, 0, w / 2 - 0.05]) g.box(x, (h - 0.08) / 2, 0, 0.08, h - 0.08, 0.08, K.woodD);
    g.box(0, h * 0.45, 0, w, 0.05, l * 0.8, K.wood);
  } else if (def.shape === 'wedge') {
    wedgeVisual(g, w, h, l);
  } else if (def.shape === 'stairs') {
    for (let i = 0; i < 4; i++) {
      const sh = (h / 4) * (i + 1);
      g.box(0, sh / 2, l / 2 - (i + 0.5) * (l / 4), w, sh, l / 4, i % 2 ? K.wood : K.woodL, { side: K.woodD });
    }
  }
}

function decoVisual(g, def) {
  const [w, , l] = def.dim;
  if (def.kind === 'lamp') {
    g.box(0, 0.06, 0, 0.36, 0.12, 0.36, K.dark);
    g.cyl(0, 0.12, 0, 0.06, 0.05, 2.15, 6, K.dark);
    g.box(0, 2.42, 0, 0.3, 0.36, 0.3, K.lamp, { emit: 2.7, top: K.dark, emitTop: 0 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 0.15, 2.42, sz * 0.15, 0.03, 0.4, 0.03, K.dark);
    g.cyl(0, 2.6, 0, 0.24, 0.02, 0.18, 4, K.dark, { rot: Math.PI / 4 });
  } else if (def.shape === 'flag') {
    g.cyl(0, 0, 0, 0.05, 0.04, 3.1, 6, '#e9eef2');
    g.box(0.34, 2.79, 0, 0.6, 0.18, 0.02, '#f2efe6');
    g.box(0.34, 2.61, 0, 0.6, 0.18, 0.02, '#2a8f86');
    g.box(0.34, 2.43, 0, 0.6, 0.18, 0.02, '#d9a43a');
  } else if (def.shape === 'bench') {
    g.box(0, 0.45, 0, w, 0.07, l * 0.9, K.woodL);
    g.box(0, 0.75, l * 0.4, w, 0.18, 0.05, K.wood);
    for (const s of [-1, 1]) { g.box(s * (w / 2 - 0.1), 0.22, 0, 0.07, 0.44, l * 0.8, K.dark); g.box(s * (w / 2 - 0.1), 0.6, l * 0.4, 0.06, 0.4, 0.06, K.dark); }
  } else if (def.shape === 'flowers') {
    const cols = ['#d98fc4', '#e8c23a', '#f2efe6', '#9f86c8', '#6f9fd0'];
    g.cyl(0, 0, 0, 0.26, 0.2, 0.06, 7, '#6f8a45');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39, r = 0.08 + (i % 3) * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = 0.22 + (i % 3) * 0.07;
      g.box(x, hh / 2, z, 0.02, hh, 0.02, '#5f8040');
      g.cyl(x, hh, z, 0.06, 0.03, 0.05, 5, cols[i % cols.length]);
    }
  } else if (def.shape === 'tree') {
    g.cyl(0, 0, 0, 0.1, 0.08, 1.2, 6, K.woodD);
    g.cyl(0, 1.0, 0, 0.62, 0, 1.0, 7, '#4f7034');
    g.cyl(0, 1.55, 0, 0.48, 0, 0.9, 7, '#5a7a3a');
    g.cyl(0, 2.0, 0, 0.32, 0, 0.6, 7, '#668444');
  } else if (def.shape === 'rock') {
    g.cyl(0, 0, 0, 0.48, 0.3, 0.42, 6, '#9a978d', { top: '#aaa79d' });
    g.cyl(0.05, 0.4, -0.05, 0.3, 0.12, 0.18, 5, '#a3a096');
  }
}

const vcache = new Map();

export function blockVisual(id) {
  if (vcache.has(id)) return vcache.get(id);
  const def = BLOCK_BY_ID[id];
  const g = new Geo();
  const out = { body: null, strip: null, water: null, spawn: null, stripLen: 0 };
  const [w, h, l] = def.dim;
  if (def.kind === 'belt') {
    if (def.curve) { curveBelt(g, def); out.strip = stripCurve(def.curve); out.stripLen = (Math.PI / 2) * CURVE_R; }
    else { straightBelt(g, w, l, def); out.strip = stripStraight(w, l); out.stripLen = l; }
  } else if (def.kind === 'flume') {
    if (def.curve) flumeCurve(g, def.curve); else flumeStraight(g, w, l);
    out.water = flumeWaterGeo(def.curve ? 0 : l, def.curve || 0);
  } else if (def.kind === 'slide') {
    const ang = Math.atan2(def.drop, l), len = Math.hypot(l, def.drop), yMid = BELT_TOP + def.drop / 2;
    g.at(0, yMid, 0, 0, -ang, 0);
    g.box(0, 0, 0, w - 0.1, 0.06, len, K.galvL, { top: '#d3d8db' });
    for (const s of [-1, 1]) g.box(s * (w / 2 - 0.03), 0.14, 0, 0.06, 0.28, len, K.metalL, { top: K.galvL });
    g.pop();
    for (const s of [-1, 1]) {
      g.box(s * (w / 2 - 0.08), (BELT_TOP + def.drop) / 2, l / 2 - 0.12, 0.07, BELT_TOP + def.drop, 0.07, K.metalD);
      g.box(s * (w / 2 - 0.08), BELT_TOP / 2, -l / 2 + 0.12, 0.07, BELT_TOP, 0.07, K.metalD);
    }
  } else if (def.kind === 'funnel') {
    funnelVisual(g, def.r, 0.34, def.out, h);
    legs(g, def.r * 1.3, def.r * 1.3, def.out, K.metalD);
  } else if (def.kind === 'ice') {
    g.box(0, 0.06, 0, w, 0.12, l, K.tray, { top: '#8e989e' });
    for (const s of [-1, 1]) { g.box(s * (w / 2 - 0.03), 0.22, 0, 0.06, 0.2, l, K.metalL, { top: K.galvL }); g.box(0, 0.22, s * (l / 2 - 0.03), w, 0.2, 0.06, K.metalL, { top: K.galvL }); }
    const nx = Math.round(w / 0.4), nz = Math.round(l / 0.4);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const hh = 0.1 + ((i * 7 + j * 3) % 5) * 0.012;
      g.box(-w / 2 + 0.2 + i * 0.4, 0.12 + hh / 2, -l / 2 + 0.2 + j * 0.4, 0.36, hh, 0.36, (i + j) % 2 ? K.ice : K.iceD);
    }
  } else if (def.kind === 'machine') {
    machineVisual(g, def);
    out.strip = stripStraight(1, l);
    out.stripLen = l;
  } else if (def.kind === 'spawner') {
    out.spawn = spawnerVisual(g, def);
  } else if (def.kind === 'sell') {
    g.ring(0, 0, 0, 1.5, 1.62, 0.45, 16, K.metalL, { top: K.galvL });
    funnelVisual(g, 1.5, 0.4, 0.12, 0.45);
    g.cyl(0, 0.02, 0, 0.4, 0.4, 0.1, 12, '#14181b');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.box(Math.cos(a) * 1.63, 0.3, Math.sin(a) * 1.63, 0.05, 0.05, 0.05, K.metalD); }
    g.box(1.85, 0.9, 0, 0.12, 1.8, 0.12, K.woodD);
    g.box(1.85, 1.62, -0.42, 0.08, 0.36, 0.86, K.woodD);
  } else if (def.kind === 'solid') {
    solidVisual(g, def);
  } else {
    decoVisual(g, def);
  }
  out.body = g.geometry();
  vcache.set(id, out);
  return out;
}

const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function framed(frame, lx, ly, lz, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
  const out = frame ? frame.clone().multiply(m) : m;
  out.decompose(_p, _q, _s);
  return { pos: [_p.x, _p.y, _p.z], quat: [_q.x, _q.y, _q.z, _q.w] };
}

function frameOf(x, y, z, rx = 0, ry = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
}

export function funnelColliders(r, outR, neck, top, fr = 0.3, seg = 10, th = 0.08) {
  const out = [];
  const slope = Math.atan2(top - neck, r - outR);
  const len = Math.hypot(top - neck, r - outR) + 0.1;
  const mid = (r + outR) / 2, midY = (top + neck) / 2;
  const width = 2 * Math.tan(Math.PI / seg) * (r + 0.06) + 0.02;
  for (let i = 0; i < seg; i++) {
    const a = ((i + 0.5) / seg) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), slope));
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const c = new THREE.Vector3(Math.cos(a) * mid, midY, Math.sin(a) * mid).addScaledVector(n, -th / 2);
    out.push({ t: 'box', hx: len / 2, hy: th / 2, hz: width / 2, pos: [c.x, c.y, c.z], quat: [q.x, q.y, q.z, q.w], fr });
  }
  return out;
}

const pcache = new Map();

export function blockPhysics(id) {
  if (pcache.has(id)) return pcache.get(id);
  const def = BLOCK_BY_ID[id];
  const [w, h, l] = def.dim;
  const col = [];
  const zones = [];
  const T = BELT_TOP;
  const box = (hx, hy, hz, x, y, z, o = {}) => col.push({ t: 'box', hx, hy, hz, ...framed(o.frame, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), fr: o.fr ?? 0.7 });
  const zone = (kind, hx, hy, hz, x, y, z, o = {}) => zones.push({ kind, hx, hy, hz, ...framed(o.frame, x, y, z, o.rx || 0, o.ry || 0, 0), ...o, frame: undefined });
  if (def.kind === 'belt' || def.kind === 'machine') {
    if (def.curve) {
      const seg = 6;
      for (let i = 0; i < seg; i++) {
        const a = -((i + 0.5) / seg) * Math.PI / 2, yaw = def.curve > 0 ? -a : a;
        const p = curvePoint(def.curve, a, CURVE_R);
        box(0.5, T / 2, ((Math.PI / 2 / seg) * (CURVE_R + 0.5)) / 2 + 0.03, p[0], T / 2, p[1], { ry: yaw, fr: 0.06 });
        for (const r of [CURVE_R - 0.47, CURVE_R + 0.47]) {
          const q = curvePoint(def.curve, a, r);
          box(0.03, 0.06, ((Math.PI / 2 / seg) * r) / 2 + 0.03, q[0], T + 0.06, q[1], { ry: yaw });
        }
      }
      zone('belt', 0.78, 0.16, 0.78, 0, T + 0.16, 0, { curve: def.curve, speed: def.speed });
    } else {
      box(0.5, T / 2, l / 2, 0, T / 2, 0, { fr: 0.06 });
      for (const s of [-1, 1]) box(0.03, 0.06, l / 2, s * 0.47, T + 0.06, 0);
      zone('belt', 0.44, 0.16, l / 2, 0, T + 0.16, 0, { speed: def.speed || 1.7 });
    }
    if (def.kind === 'machine') {
      for (const s of [-1, 1]) box(0.1, h / 2, l * 0.41, s * (w / 2 - 0.1), h / 2, 0);
      box(w / 2, 0.1, l * 0.43, 0, h - 0.1, 0);
      zone('machine', 0.42, 0.3, l * 0.3, 0, T + 0.25, 0, { machine: def.id });
    }
  } else if (def.kind === 'flume') {
    const F = FLUME_FLOOR;
    if (def.curve) {
      const seg = 6;
      for (let i = 0; i < seg; i++) {
        const a = -((i + 0.5) / seg) * Math.PI / 2, yaw = def.curve > 0 ? -a : a;
        const p = curvePoint(def.curve, a, CURVE_R);
        box(FW + 0.02, (F - 0.04) / 2 + 0.02, ((Math.PI / 2 / seg) * (CURVE_R + FW)) / 2 + 0.04, p[0], (F - 0.04) / 2, p[1], { ry: yaw, fr: 0.12 });
        for (const s of [1, -1]) {
          const r = CURVE_R + s * (FW + FT / 2);
          const q = curvePoint(def.curve, a, r);
          box(FT / 2, 0.24, ((Math.PI / 2 / seg) * r) / 2 + 0.05, 0, 0.24, 0, { frame: frameOf(q[0], F, q[1], 0, yaw, -FTILT * s * def.curve), fr: 0.12 });
        }
      }
      zone('flume', 0.8, 0.3, 0.8, 0, F + 0.3, 0, { curve: def.curve, speed: def.speed });
    } else {
      box(FW + 0.01, (F - 0.04) / 2 + 0.02, l / 2, 0, (F - 0.04) / 2, 0, { fr: 0.12 });
      for (const s of [-1, 1]) box(FT / 2, 0.24, l / 2, 0, 0.24, 0, { frame: frameOf(s * (FW + FT / 2), F, 0, 0, 0, -s * FTILT), fr: 0.12 });
      zone('flume', FW, 0.3, l / 2, 0, F + 0.3, 0, { speed: def.speed });
    }
  } else if (def.kind === 'slide') {
    const ang = Math.atan2(def.drop, l), len = Math.hypot(l, def.drop), yMid = T + def.drop / 2;
    const fr = frameOf(0, yMid, 0, -ang, 0, 0);
    box((w - 0.1) / 2, 0.03, len / 2, 0, 0, 0, { frame: fr, fr: 0.04 });
    for (const s of [-1, 1]) box(0.03, 0.14, len / 2, s * (w / 2 - 0.03), 0.14, 0, { frame: fr, fr: 0.04 });
    zone('slide', (w - 0.1) / 2, 0.2, len / 2, 0, 0.22, 0, { frame: fr });
  } else if (def.kind === 'funnel') {
    col.push(...funnelColliders(def.r, 0.34, def.out, h));
    zone('wet', def.r * 0.75, (h - def.out) / 2 + 0.1, def.r * 0.75, 0, (h + def.out) / 2, 0);
  } else if (def.kind === 'sell') {
    col.push(...funnelColliders(1.5, 0.4, 0.12, 0.45, 0.3, 12));
    box(0.42, 0.05, 0.42, 0, 0.07, 0);
    zone('sell', 0.85, 0.14, 0.85, 0, 0.3, 0);
  } else if (def.kind === 'ice') {
    box(w / 2, 0.12, l / 2, 0, 0.12, 0, { fr: 0.03 });
    for (const s of [-1, 1]) { box(0.03, 0.1, l / 2, s * (w / 2 - 0.03), 0.22, 0); box(w / 2, 0.1, 0.03, 0, 0.22, s * (l / 2 - 0.03)); }
    zone('ice', w / 2 - 0.06, 0.2, l / 2 - 0.06, 0, 0.42, 0);
  } else if (def.kind === 'spawner') {
    box(w / 2, h * 0.38, l / 2, 0, h * 0.38, 0);
  } else if (def.kind === 'solid') {
    if (def.shape === 'box') box(w / 2, h / 2, l / 2, 0, h / 2, 0, { fr: def.mat === 'glass' ? 0.2 : 0.7 });
    else if (def.shape === 'rail') {
      box(w / 2, 0.04, l / 2 + 0.01, 0, h - 0.04, 0);
      for (const x of [-w / 2 + 0.05, 0, w / 2 - 0.05]) box(0.04, (h - 0.08) / 2, 0.04, x, (h - 0.08) / 2, 0);
      box(w / 2, 0.025, l * 0.4, 0, h * 0.45, 0);
    } else if (def.shape === 'wedge') {
      col.push({ t: 'hull', pts: [-w / 2, 0, l / 2, w / 2, 0, l / 2, -w / 2, 0, -l / 2, w / 2, 0, -l / 2, -w / 2, h, -l / 2, w / 2, h, -l / 2], pos: [0, 0, 0], quat: [0, 0, 0, 1], fr: 0.7 });
    } else if (def.shape === 'stairs') {
      for (let i = 0; i < 4; i++) { const sh = (h / 4) * (i + 1); box(w / 2, sh / 2, l / 8, 0, sh / 2, l / 2 - (i + 0.5) * (l / 4)); }
    }
  } else if (def.kind === 'lamp') {
    box(0.08, 1.3, 0.08, 0, 1.3, 0);
    box(0.16, 0.18, 0.16, 0, 2.42, 0);
  } else if (def.kind === 'deco') {
    if (def.shape === 'bench') box(w / 2, 0.24, l / 2, 0, 0.24, 0);
    else if (def.shape === 'tree') box(0.12, 0.6, 0.12, 0, 0.6, 0);
    else if (def.shape === 'rock') box(w * 0.4, h / 2, l * 0.4, 0, h / 2, 0);
    else if (def.shape === 'flag') box(0.05, 1.55, 0.05, 0, 1.55, 0);
  }
  const res = { col, zones, ports: blockPorts(def), spawn: def.kind === 'spawner' ? blockVisual(id).spawn : null };
  pcache.set(id, res);
  return res;
}

export function blockPorts(def) {
  const [, , l] = def.dim;
  const y = BELT_TOP;
  if (def.kind === 'belt' || def.kind === 'machine' || def.kind === 'flume') {
    if (def.curve) {
      const e0 = curvePoint(def.curve, 0, CURVE_R), e1 = curvePoint(def.curve, -Math.PI / 2, CURVE_R);
      return [{ io: 'in', p: [e0[0], y, CC], d: [0, 0, -1] }, { io: 'out', p: [e1[0], y, e1[1]], d: [-def.curve, 0, 0] }];
    }
    return [{ io: 'in', p: [0, y, l / 2], d: [0, 0, -1] }, { io: 'out', p: [0, y, -l / 2], d: [0, 0, -1] }];
  }
  if (def.kind === 'slide') return [{ io: 'in', p: [0, BELT_TOP + def.drop, l / 2], d: [0, 0, -1] }, { io: 'out', p: [0, BELT_TOP, -l / 2], d: [0, 0, -1] }];
  return [];
}

export const SPAWNER_IDS = BLOCKS.filter((b) => b.kind === 'spawner').map((b) => b.id);
