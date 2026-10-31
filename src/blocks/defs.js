// Rybna Wyspa: per-block visual geometry, physics colliders, effect zones and connection ports, all from one set of dimensions.

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { BLOCKS, BLOCK_BY_ID } from '../data/blocks.js';

export const BELT_TOP = 0.3;
export const FLUME_FLOOR = 0.12;
export const FLUME_WATER = 0.42;
export const CURVE_R = 1;
const CC = 0.75;

export const COLORS = {
  metal: '#66737f', metalD: '#434c56', metalL: '#93a1ae', rubber: '#2b2f35', yellow: '#f4b73a', blue: '#4aa8ff', violet: '#b57bff',
  wood: '#b9824f', woodD: '#8a5c34', woodL: '#cf9a62', plank: '#c08955', funnel: '#a4b4c1', funnelD: '#6a7a87',
  ice: '#d9f4ff', iceD: '#a9def6', tray: '#788d9c', glass: '#bfe6ff', post: '#8a5c34', crate: '#c48f4e', crateD: '#9a6a35',
  dark: '#2f3438', lamp: '#ffd27a', water: '#3fb6d6',
};
const K = COLORS;

export const ACCENT = {
  myjnia: '#4ac0ff', solarnia: '#f4f6f8', wedzarnia: '#a8692c', zamrazarka: '#7fd9ff', szczotkarnia: '#f2b632', polerka: '#ffe27a',
  grill: '#ff8a3c', transformator: '#ffd23a', wazenie: '#5fd068', czekoladziarnia: '#6b3a22', cukiernia: '#ff9fd0', neonownia: '#38ff9c',
  kadz: '#9be22b', pakowaczka: '#c9935c', piec: '#ff6a00', magnetyzer: '#ff4fd8', komora: '#8dff2a', pikselator: '#4aa8ff',
  etykieciarka: '#ffffff', dyskoteka: '#ff7be8', robofabryka: '#9aa3ad', wulkan: '#ff5a1a', krysztalownia: '#9fe6ff', portal_k: '#9b6bff',
  kontrola: '#3ff2e4', reaktor: '#ff6bf1', diamentownia: '#bff3ff',
};

const SPAWNER_LOOK = {
  pompa: { body: '#4f8fc0', top: '#2f5f86', accent: '#f4b73a' },
  siec: { body: '#9a6a35', top: '#7a5228', accent: '#dfe6ea' },
  wiecierz: { body: '#b58a52', top: '#8a6a3a', accent: '#d6c08a' },
  klatka: { body: '#5d8f6a', top: '#3f6b4b', accent: '#cfe8d5' },
  wylegarnia: { body: '#e9eef2', top: '#9fb3c3', accent: '#47c9c2' },
  glebinowa: { body: '#2f5f86', top: '#1f3f5a', accent: '#f4b73a' },
  sonar: { body: '#5d6b78', top: '#3f4954', accent: '#38ff9c' },
  tama: { body: '#8f9aa5', top: '#6c7781', accent: '#4aa8ff' },
  wir: { body: '#1f6fa8', top: '#123f63', accent: '#9fe6ff' },
  zrodlo: { body: '#f2e6c9', top: '#d4c39b', accent: '#ff5fd2' },
  portal: { body: '#2a2440', top: '#171327', accent: '#3ff2e4' },
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

function beltDeco(def) {
  return def.fast === 2 ? K.violet : def.fast === 1 ? K.blue : K.yellow;
}

function legs(g, w, l, h, color) {
  const lx = w / 2 - 0.08, lz = l / 2 - 0.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * lx, h / 2, sz * lz, 0.08, h, 0.08, color);
}

function straightBelt(g, w, l, def) {
  g.box(0, 0.15, 0, w, 0.3, l, K.metal, { top: K.metalD });
  for (const s of [-1, 1]) g.box(s * (w / 2 - 0.03), 0.36, 0, 0.06, 0.12, l, beltDeco(def));
  for (let z = -l / 2 + 0.25; z <= l / 2 - 0.2; z += 0.5) for (const s of [-1, 1]) g.box(s * (w / 2 + 0.005), 0.16, z, 0.01, 0.07, 0.07, K.metalL);
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
  const c = def.curve, deco = beltDeco(def);
  const ri = CURVE_R - 0.5, ro = CURVE_R + 0.5;
  const P = (a, r, y) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
  arcSegs(8, (a0, a1) => {
    const am = (a0 + a1) / 2, out = radial(c, am), inn = out.map((v) => -v);
    g.quadN(P(a0, ri, 0.3), P(a0, ro, 0.3), P(a1, ro, 0.3), P(a1, ri, 0.3), [0, 1, 0], K.metalD);
    g.quadN(P(a0, ro, 0), P(a1, ro, 0), P(a1, ro, 0.3), P(a0, ro, 0.3), out, K.metal);
    g.quadN(P(a0, ri, 0), P(a1, ri, 0), P(a1, ri, 0.3), P(a0, ri, 0.3), inn, K.metal);
    for (const [r0, r1] of [[ri, ri + 0.06], [ro - 0.06, ro]]) {
      g.quadN(P(a0, r0, 0.42), P(a0, r1, 0.42), P(a1, r1, 0.42), P(a1, r0, 0.42), [0, 1, 0], deco);
      g.quadN(P(a0, r1, 0.3), P(a1, r1, 0.3), P(a1, r1, 0.42), P(a0, r1, 0.42), out, deco);
      g.quadN(P(a0, r0, 0.3), P(a1, r0, 0.3), P(a1, r0, 0.42), P(a0, r0, 0.42), inn, deco);
    }
  });
  const z0 = CC, x0 = -CC * c + c * ri, x1 = -CC * c + c * ro;
  g.quadN([x0, 0, z0], [x1, 0, z0], [x1, 0.3, z0], [x0, 0.3, z0], [0, 0, 1], K.metal);
  const xe = -CC * c, ze0 = CC - ri, ze1 = CC - ro;
  g.quadN([xe, 0, ze0], [xe, 0, ze1], [xe, 0.3, ze1], [xe, 0.3, ze0], [-c, 0, 0], K.metal);
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

function flumeStraight(g, w, l) {
  g.box(0, FLUME_FLOOR - 0.04, 0, FW * 2 + 0.02, 0.08, l, K.woodD, { top: '#9b6a3c' });
  for (const s of [-1, 1]) g.at(s * (FW + FT / 2), FLUME_FLOOR, 0, 0, 0, -s * FTILT).box(0, 0.24, 0, FT, 0.48, l, K.wood, { top: K.woodL }).pop();
  for (let z = -l / 2 + 0.3; z < l / 2; z += 0.9) {
    g.box(0, 0.035, z, w, 0.07, 0.12, K.woodD);
    for (const s of [-1, 1]) g.box(s * (w / 2 - 0.05), 0.3, z, 0.07, 0.56, 0.07, K.woodD);
  }
}

function flumeCurve(g, c) {
  const ri = CURVE_R - FW, ro = CURVE_R + FW;
  const P = (a, r, y) => { const q = curvePoint(c, a, r); return [q[0], y, q[1]]; };
  const top = FLUME_FLOOR + 0.48, lean = 0.48 * Math.sin(FTILT);
  arcSegs(8, (a0, a1) => {
    const am = (a0 + a1) / 2, out = radial(c, am), inn = out.map((v) => -v);
    g.quadN(P(a0, ri, FLUME_FLOOR), P(a0, ro, FLUME_FLOOR), P(a1, ro, FLUME_FLOOR), P(a1, ri, FLUME_FLOOR), [0, 1, 0], '#9b6a3c');
    g.quadN(P(a0, ri - 0.02, FLUME_FLOOR - 0.08), P(a0, ro + 0.02, FLUME_FLOOR - 0.08), P(a1, ro + 0.02, FLUME_FLOOR - 0.08), P(a1, ri - 0.02, FLUME_FLOOR - 0.08), [0, -1, 0], K.woodD);
    for (const [r, sgn] of [[ro, 1], [ri, -1]]) {
      const facing = sgn > 0 ? inn : out;
      const away = sgn > 0 ? out : inn;
      const rTop = r + sgn * lean, rOut = r + sgn * FT, rOutTop = rOut + sgn * lean;
      g.quadN(P(a0, r, FLUME_FLOOR), P(a1, r, FLUME_FLOOR), P(a1, rTop, top), P(a0, rTop, top), facing, K.wood);
      g.quadN(P(a0, rOut, FLUME_FLOOR - 0.08), P(a1, rOut, FLUME_FLOOR - 0.08), P(a1, rOutTop, top), P(a0, rOutTop, top), away, K.wood);
      g.quadN(P(a0, rTop, top), P(a1, rTop, top), P(a1, rOutTop, top), P(a0, rOutTop, top), [0, 1, 0], K.woodL);
    }
  });
  for (const a of [-Math.PI / 8, -Math.PI * 3 / 8]) {
    const q = curvePoint(c, a, CURVE_R);
    const yaw = c > 0 ? -a : a;
    g.at(q[0], 0, q[1], yaw).box(0, 0.035, 0, 0.12, 0.07, 1.0, K.woodD).pop();
  }
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
  const seg = 10;
  const P = (rr, a, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    const outN = [Math.cos(am), 0, Math.sin(am)];
    const inN = [-Math.cos(am) * 0.7, 0.7, -Math.sin(am) * 0.7];
    g.quadN(P(r, a0, top), P(r, a1, top), P(outR, a1, neck), P(outR, a0, neck), inN, o.inner || (i % 2 ? K.funnelD : '#5f6e7a'));
    g.quadN(P(r + 0.06, a0, top), P(r + 0.06, a1, top), P(outR + 0.06, a1, neck), P(outR + 0.06, a0, neck), [outN[0], -0.6, outN[2]], o.outer || (i % 2 ? K.funnel : '#b4c3cf'));
    g.quadN(P(r, a0, top), P(r + 0.06, a0, top), P(r + 0.06, a1, top), P(r, a1, top), [0, 1, 0], o.rim || K.metalL);
  }
  g.ring(0, neck - 0.16, 0, outR, outR + 0.07, 0.16, seg, K.metalD);
}

function spawnerVisual(g, def) {
  const L = SPAWNER_LOOK[def.id] || SPAWNER_LOOK.siec;
  const [w, , d] = def.dim;
  if (def.manual) {
    g.box(0, 0.2, 0, w, 0.4, d, K.metalD, { top: K.metal });
    g.cyl(0, 0.4, 0.1, 0.28, 0.24, 1.1, 8, L.body, { top: L.top });
    g.cyl(0, 1.5, 0.1, 0.27, 0.27, 0.12, 8, L.top);
    g.at(0, 1.18, -0.12, 0, -0.25, 0).box(0, 0, -0.2, 0.16, 0.16, 0.46, L.top).pop();
    g.box(0, 0.42, -0.4, 0.5, 0.04, 0.24, L.accent);
    return { outlet: [0, 1.06, -0.62], vel: [0, 0.4, -1.8], lever: [0, 1.62, 0.1] };
  }
  g.box(0, 0.12, 0, w, 0.24, d, K.metalD, { top: K.metal });
  g.box(0, 0.75, 0.05, w * 0.82, 1.0, d * 0.75, L.body, { top: L.top });
  g.box(0, 1.25, -d / 2 + 0.02, 0.44, 0.32, 0.24, '#2b2f35');
  g.box(0, 1.47, -d / 2 + 0.02, 0.52, 0.06, 0.3, L.accent, { emit: 0.6 });
  const id = def.id;
  if (id === 'siec' || id === 'wiecierz') {
    for (const sx of [-1, 1]) g.box(sx * w * 0.36, 1.55, 0.2, 0.08, 1.0, 0.08, L.top);
    g.box(0, 2.02, 0.2, w * 0.8, 0.06, 0.06, L.top);
    for (let i = 0; i < 4; i++) g.box(-w * 0.3 + i * w * 0.2, 1.68, 0.2, 0.02, 0.6, 0.5, L.accent);
  } else if (id === 'klatka') {
    g.box(0, 1.55, 0.15, w * 0.8, 0.6, d * 0.55, '#cfe8d5', { top: L.top });
    for (let i = 0; i < 5; i++) g.box(-w * 0.36 + i * w * 0.18, 1.55, 0.15 - d * 0.28, 0.03, 0.6, 0.03, L.top);
  } else if (id === 'wylegarnia') {
    for (const sx of [-1, 1]) g.cyl(sx * 0.3, 1.25, 0.2, 0.24, 0.24, 0.7, 8, '#bfeee9', { top: L.accent, emit: 0.15 });
  } else if (id === 'glebinowa') {
    g.cyl(0, 1.25, 0.25, 0.16, 0.16, 0.9, 8, L.accent);
    g.cyl(0, 2.1, 0.25, 0.26, 0.2, 0.14, 8, L.top);
  } else if (id === 'sonar') {
    g.cyl(0, 1.25, 0.2, 0.06, 0.06, 0.5, 6, K.metalL);
    g.at(0, 1.85, 0.2, 0, -0.5, 0).cyl(0, 0, 0, 0.5, 0.05, 0.22, 10, '#e9eef2').pop();
    g.box(0, 1.96, 0.2, 0.08, 0.08, 0.08, L.accent, { emit: 1 });
  } else if (id === 'tama') {
    g.box(0, 1.6, 0.25, w * 0.95, 0.7, 0.3, '#8f9aa5', { top: '#b0b9c2' });
    g.box(0, 1.35, -0.05, w * 0.5, 0.06, 0.4, L.accent, { emit: 0.25 });
  } else if (id === 'wir') {
    for (let i = 0; i < 3; i++) g.ring(0, 1.25 + i * 0.22, 0.1, 0.2 + i * 0.12, 0.28 + i * 0.12, 0.08, 10, L.accent, { emit: 0.35 });
  } else if (id === 'zrodlo') {
    g.cyl(0, 1.25, 0.1, 0.5, 0.35, 0.35, 9, '#f2e6c9', { top: '#47c9c2', emitTop: 0.4 });
    g.cyl(0, 1.6, 0.1, 0.08, 0.02, 0.6, 6, L.accent, { emit: 0.8 });
  } else if (id === 'portal') {
    g.at(0, 1.9, 0.15, 0, Math.PI / 2, 0).ring(0, -0.05, 0, 0.42, 0.56, 0.1, 14, L.accent, { emit: 0.9 }).pop();
  }
  return { outlet: [0, 1.25, -d / 2 - 0.22], vel: [0, 1.1, -1.6] };
}

function machineVisual(g, def) {
  const acc = ACCENT[def.id] || '#ffffff';
  const [w, h, l] = def.dim;
  straightBelt(g, 1, l, { fast: 0 });
  for (const s of [-1, 1]) g.box(s * (w / 2 - 0.1), h / 2, 0, 0.2, h, l * 0.82, '#76828e', { top: '#5f6a75' });
  g.box(0, h - 0.1, 0, w, 0.2, l * 0.86, '#5f6a75', { top: acc });
  for (const s of [-1, 1]) g.box(0, h - 0.32, s * l * 0.43, w - 0.4, 0.3, 0.04, acc, { emit: 0.35 });
  for (let i = 0; i < 4; i++) g.box(-0.28 + i * 0.19, 0.95, -l * 0.41, 0.08, 0.5, 0.02, '#2b2f35');
  const id = def.id;
  if (['wedzarnia', 'piec', 'grill', 'wulkan'].includes(id)) g.cyl(w * 0.25, h, 0.3, 0.12, 0.1, 0.6, 6, '#3f4954', { top: '#22262b' });
  if (id === 'zamrazarka') for (let i = 0; i < 3; i++) g.box(-0.4 + i * 0.4, h + 0.06, 0, 0.25, 0.12, 0.25, K.ice);
  if (['transformator', 'reaktor', 'magnetyzer'].includes(id)) for (const s of [-1, 1]) g.cyl(s * 0.35, h, 0, 0.09, 0.05, 0.45, 6, '#e9eef2', { top: acc, emitTop: 1 });
  if (id === 'komora') g.cyl(0, h, 0, 0.3, 0.3, 0.2, 8, '#2b2f35', { top: acc, emitTop: 1 });
  if (id === 'dyskoteka') g.cyl(0, h + 0.05, 0, 0, 0.26, 0.4, 8, '#d0d6dc', { emit: 0.5, alt: '#ff7be8' });
  if (id === 'krysztalownia' || id === 'diamentownia') g.cyl(0, h, 0, 0.25, 0, 0.55, 6, acc, { emit: 0.6 });
  if (id === 'portal_k') g.at(0, h + 0.3, 0, Math.PI / 2, 0, 0).at(0, 0, 0, 0, Math.PI / 2, 0).ring(0, -0.04, 0, 0.22, 0.3, 0.08, 12, acc, { emit: 1 }).pop().pop();
  if (id === 'pikselator') for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.box(-0.3 + i * 0.3, h + 0.08 + j * 0.16, 0, 0.14, 0.14, 0.14, i % 2 === j ? acc : '#2b2f35', { emit: i % 2 === j ? 0.6 : 0 });
  if (def.upgr) g.box(0, h + 0.15, 0, 0.6, 0.3, 0.05, '#ffffff', { front: acc, back: acc });
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
      g.box(0, h / 2, 0, w, h, l, c, mat === 'glass' ? { top: '#e3f5ff' } : {});
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
  const [w, h, l] = def.dim;
  if (def.kind === 'lamp') {
    g.box(0, 0.06, 0, 0.36, 0.12, 0.36, K.dark);
    g.cyl(0, 0.12, 0, 0.06, 0.05, 2.15, 6, K.dark);
    g.box(0, 2.42, 0, 0.32, 0.36, 0.32, K.lamp, { emit: 1, top: K.dark, emitTop: 0 });
    g.cyl(0, 2.6, 0, 0.24, 0.02, 0.18, 4, K.dark, { rot: Math.PI / 4 });
  } else if (def.shape === 'flag') {
    g.cyl(0, 0, 0, 0.05, 0.04, 3.1, 6, '#e9eef2');
    g.box(0.34, 2.79, 0, 0.6, 0.18, 0.02, '#ffffff');
    g.box(0.34, 2.61, 0, 0.6, 0.18, 0.02, '#47c9c2');
    g.box(0.34, 2.43, 0, 0.6, 0.18, 0.02, '#ffb02e');
  } else if (def.shape === 'bench') {
    g.box(0, 0.45, 0, w, 0.07, l * 0.9, K.woodL);
    g.box(0, 0.75, l * 0.4, w, 0.18, 0.05, K.wood);
    for (const s of [-1, 1]) { g.box(s * (w / 2 - 0.1), 0.22, 0, 0.07, 0.44, l * 0.8, K.dark); g.box(s * (w / 2 - 0.1), 0.6, l * 0.4, 0.06, 0.4, 0.06, K.dark); }
  } else if (def.shape === 'flowers') {
    const cols = ['#ff7be8', '#ffd23a', '#ffffff', '#b57bff', '#4aa8ff'];
    g.cyl(0, 0, 0, 0.26, 0.2, 0.06, 7, '#5fa548');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39, r = 0.08 + (i % 3) * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = 0.22 + (i % 3) * 0.07;
      g.box(x, hh / 2, z, 0.02, hh, 0.02, '#4f9a3c');
      g.cyl(x, hh, z, 0.06, 0.03, 0.05, 5, cols[i % cols.length]);
    }
  } else if (def.shape === 'tree') {
    g.cyl(0, 0, 0, 0.1, 0.08, 1.2, 6, K.woodD);
    g.cyl(0, 1.0, 0, 0.62, 0, 1.0, 7, '#4f9a3c');
    g.cyl(0, 1.55, 0, 0.48, 0, 0.9, 7, '#5fae45');
    g.cyl(0, 2.0, 0, 0.32, 0, 0.6, 7, '#6fbe52');
  } else if (def.shape === 'rock') {
    g.cyl(0, 0, 0, 0.48, 0.3, 0.42, 6, '#9aa0a6', { top: '#b3b8bd' });
    g.cyl(0.05, 0.4, -0.05, 0.3, 0.12, 0.18, 5, '#a9aeb3');
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
    const ang = Math.atan2(def.drop, l), len = Math.hypot(l, def.drop), yMid = 0.12 + def.drop / 2;
    g.at(0, yMid, 0, 0, -ang, 0);
    g.box(0, 0, 0, w - 0.1, 0.06, len, '#d7dde3', { top: '#eef2f5' });
    for (const s of [-1, 1]) g.box(s * (w / 2 - 0.03), 0.14, 0, 0.06, 0.28, len, K.blue);
    g.pop();
    for (const s of [-1, 1]) {
      g.box(s * (w / 2 - 0.08), (0.12 + def.drop) / 2, l / 2 - 0.12, 0.07, 0.12 + def.drop, 0.07, K.metalD);
      g.box(s * (w / 2 - 0.08), 0.1, -l / 2 + 0.12, 0.07, 0.2, 0.07, K.metalD);
    }
  } else if (def.kind === 'funnel') {
    funnelVisual(g, def.r, 0.34, def.out, h);
    legs(g, def.r * 1.3, def.r * 1.3, def.out, K.metalD);
  } else if (def.kind === 'ice') {
    g.box(0, 0.06, 0, w, 0.12, l, K.tray, { top: '#8ea3b2' });
    for (const s of [-1, 1]) { g.box(s * (w / 2 - 0.03), 0.22, 0, 0.06, 0.2, l, K.metalL); g.box(0, 0.22, s * (l / 2 - 0.03), w, 0.2, 0.06, K.metalL); }
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
    g.box(0, 0.4, 0, 1.6, 0.8, 1.6, '#3d7f4d', { top: '#2f6b3f' });
    funnelVisual(g, w / 2, 0.42, 1.25, h);
    legs(g, w * 0.9, w * 0.9, 1.25, K.metalD);
    g.box(0, 0.6, -0.81, 1.0, 0.36, 0.02, '#ffd23a', { emit: 0.4 });
  } else if (def.kind === 'solid') {
    solidVisual(g, def);
  } else {
    decoVisual(g, def);
  }
  out.body = g.geometry();
  vcache.set(id, out);
  return out;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
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
  const box = (hx, hy, hz, x, y, z, o = {}) => col.push({ t: 'box', hx, hy, hz, ...framed(o.frame, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), fr: o.fr ?? 0.7 });
  const zone = (kind, hx, hy, hz, x, y, z, o = {}) => zones.push({ kind, hx, hy, hz, ...framed(o.frame, x, y, z, o.rx || 0, o.ry || 0, 0), ...o, frame: undefined });
  if (def.kind === 'belt' || def.kind === 'machine') {
    if (def.curve) {
      const seg = 6;
      for (let i = 0; i < seg; i++) {
        const a = -((i + 0.5) / seg) * Math.PI / 2, yaw = def.curve > 0 ? -a : a;
        const p = curvePoint(def.curve, a, CURVE_R);
        box(0.5, 0.15, ((Math.PI / 2 / seg) * (CURVE_R + 0.5)) / 2 + 0.03, p[0], 0.15, p[1], { ry: yaw, fr: 0.06 });
        for (const r of [CURVE_R - 0.47, CURVE_R + 0.47]) {
          const q = curvePoint(def.curve, a, r);
          box(0.03, 0.06, ((Math.PI / 2 / seg) * r) / 2 + 0.03, q[0], 0.36, q[1], { ry: yaw });
        }
      }
      zone('belt', 0.78, 0.16, 0.78, 0, 0.46, 0, { curve: def.curve, speed: def.speed });
    } else {
      box(0.5, 0.15, l / 2, 0, 0.15, 0, { fr: 0.06 });
      for (const s of [-1, 1]) box(0.03, 0.06, l / 2, s * 0.47, 0.36, 0);
      zone('belt', 0.44, 0.16, l / 2, 0, 0.46, 0, { speed: def.speed || 1.7 });
    }
    if (def.kind === 'machine') {
      for (const s of [-1, 1]) box(0.1, h / 2, l * 0.41, s * (w / 2 - 0.1), h / 2, 0);
      box(w / 2, 0.1, l * 0.43, 0, h - 0.1, 0);
      zone('machine', 0.42, 0.3, l * 0.3, 0, 0.62, 0, { machine: def.id });
    }
  } else if (def.kind === 'flume') {
    if (def.curve) {
      const seg = 6;
      for (let i = 0; i < seg; i++) {
        const a = -((i + 0.5) / seg) * Math.PI / 2, yaw = def.curve > 0 ? -a : a;
        const p = curvePoint(def.curve, a, CURVE_R);
        box(FW + 0.02, 0.04, ((Math.PI / 2 / seg) * (CURVE_R + FW)) / 2 + 0.04, p[0], FLUME_FLOOR - 0.04, p[1], { ry: yaw, fr: 0.12 });
        for (const s of [1, -1]) {
          const r = CURVE_R + s * (FW + FT / 2);
          const q = curvePoint(def.curve, a, r);
          box(FT / 2, 0.24, ((Math.PI / 2 / seg) * r) / 2 + 0.05, 0, 0.24, 0, { frame: frameOf(q[0], FLUME_FLOOR, q[1], 0, yaw, -FTILT * s * def.curve), fr: 0.12 });
        }
      }
      zone('flume', 0.8, 0.3, 0.8, 0, FLUME_FLOOR + 0.3, 0, { curve: def.curve, speed: def.speed });
    } else {
      box(FW + 0.01, 0.04, l / 2, 0, FLUME_FLOOR - 0.04, 0, { fr: 0.12 });
      for (const s of [-1, 1]) box(FT / 2, 0.24, l / 2, 0, 0.24, 0, { frame: frameOf(s * (FW + FT / 2), FLUME_FLOOR, 0, 0, 0, -s * FTILT), fr: 0.12 });
      zone('flume', FW, 0.3, l / 2, 0, FLUME_FLOOR + 0.3, 0, { speed: def.speed });
    }
  } else if (def.kind === 'slide') {
    const ang = Math.atan2(def.drop, l), len = Math.hypot(l, def.drop), yMid = 0.12 + def.drop / 2;
    const fr = frameOf(0, yMid, 0, -ang, 0, 0);
    box((w - 0.1) / 2, 0.03, len / 2, 0, 0, 0, { frame: fr, fr: 0.04 });
    for (const s of [-1, 1]) box(0.03, 0.14, len / 2, s * (w / 2 - 0.03), 0.14, 0, { frame: fr, fr: 0.04 });
    zone('slide', (w - 0.1) / 2, 0.2, len / 2, 0, 0.22, 0, { frame: fr });
  } else if (def.kind === 'funnel') {
    col.push(...funnelColliders(def.r, 0.34, def.out, h));
    zone('wet', def.r * 0.75, (h - def.out) / 2 + 0.1, def.r * 0.75, 0, (h + def.out) / 2, 0);
  } else if (def.kind === 'sell') {
    col.push(...funnelColliders(w / 2, 0.42, 1.25, h));
    box(0.8, 0.4, 0.8, 0, 0.4, 0);
    zone('sell', 0.46, 0.22, 0.46, 0, 1.1, 0);
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
  const y = def.kind === 'flume' ? FLUME_FLOOR : BELT_TOP;
  if (def.kind === 'belt' || def.kind === 'machine' || def.kind === 'flume') {
    if (def.curve) {
      const e0 = curvePoint(def.curve, 0, CURVE_R), e1 = curvePoint(def.curve, -Math.PI / 2, CURVE_R);
      return [{ io: 'in', p: [e0[0], y, CC], d: [0, 0, -1] }, { io: 'out', p: [e1[0], y, e1[1]], d: [-def.curve, 0, 0] }];
    }
    return [{ io: 'in', p: [0, y, l / 2], d: [0, 0, -1] }, { io: 'out', p: [0, y, -l / 2], d: [0, 0, -1] }];
  }
  if (def.kind === 'slide') return [{ io: 'in', p: [0, 0.12 + def.drop, l / 2], d: [0, 0, -1] }, { io: 'out', p: [0, 0.12, -l / 2], d: [0, 0, -1] }];
  return [];
}

export const SPAWNER_IDS = BLOCKS.filter((b) => b.kind === 'spawner').map((b) => b.id);
