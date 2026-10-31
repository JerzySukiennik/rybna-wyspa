// Rybna Wyspa: simple stand-in models used until (or if) the procedural model modules are missing.

import * as THREE from 'three';
import { Geo } from './geo.js';
import { SPECIES } from '../data/species.js';

export const FISH_IDS = SPECIES.map((s) => s.id);
const cache = new Map();

export function fishDims() {
  return { h: 0.26, w: 0.11 };
}

export function fishGeometry(id) {
  if (cache.has(id)) return cache.get(id);
  const g = new Geo();
  const hue = (FISH_IDS.indexOf(id) * 0.137) % 1;
  const back = new THREE.Color().setHSL(hue, 0.35, 0.38), belly = new THREE.Color().setHSL(hue, 0.25, 0.82);
  const rings = [[0.5, 0, 0], [0.38, 0.08, 0.04], [0.15, 0.13, 0.055], [-0.1, 0.12, 0.05], [-0.3, 0.07, 0.03], [-0.38, 0.03, 0.015]];
  const seg = 6;
  const P = (r, a) => [r[0], Math.cos(a) * r[1], Math.sin(a) * r[2]];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const c = Math.cos((a0 + a1) / 2) > 0 ? back : belly;
      const A = P(rings[i], a0), B = P(rings[i], a1), C = P(rings[i + 1], a1), D = P(rings[i + 1], a0);
      const n = [0, Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2)];
      if (i === 0) g.triN(A, C, D, n, c); else g.quadN(A, B, C, D, n, c);
    }
  }
  g.triN([-0.36, 0, 0], [-0.5, 0.11, 0], [-0.5, -0.11, 0], [0, 0, 1], back);
  g.triN([-0.36, 0, 0], [-0.5, -0.11, 0], [-0.5, 0.11, 0], [0, 0, -1], back);
  g.triN([0.05, 0.12, 0], [-0.15, 0.2, 0], [-0.2, 0.11, 0], [0, 0, 1], back);
  g.triN([0.05, 0.12, 0], [-0.2, 0.11, 0], [-0.15, 0.2, 0], [0, 0, -1], back);
  for (const s of [-1, 1]) g.box(0.36, 0.025, s * 0.045, 0.03, 0.03, 0.01, '#111111');
  const geo = g.geometry({ emit: false });
  const n = geo.attributes.position.count;
  const bend = new Float32Array(n), glow = new Float32Array(n);
  for (let i = 0; i < n; i++) bend[i] = 0.5 - geo.attributes.position.getX(i);
  geo.setAttribute('aBend', new THREE.BufferAttribute(bend, 1));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
  cache.set(id, geo);
  return geo;
}

export function buildAvatar(color = '#4aa8ff') {
  const root = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const part = (name, fn, px, py, pz) => {
    const g = new Geo();
    fn(g);
    const m = new THREE.Mesh(g.geometry({ emit: false }), mat);
    m.name = name;
    m.position.set(px, py, pz);
    m.castShadow = true;
    root.add(m);
    return m;
  };
  part('body', (g) => { g.box(0, 1.15, 0, 0.5, 0.6, 0.3, color); g.box(0, 0.8, 0, 0.46, 0.2, 0.28, '#6b6a4a'); }, 0, 0, 0);
  part('head', (g) => { g.box(0, 0.14, 0, 0.3, 0.3, 0.3, '#f0c9a0'); g.box(0, 0.32, 0, 0.34, 0.08, 0.34, color); g.box(0, 0.3, -0.2, 0.3, 0.04, 0.12, color); }, 0, 1.47, 0);
  for (const s of [-1, 1]) {
    part(s < 0 ? 'armL' : 'armR', (g) => g.box(0, -0.3, 0, 0.14, 0.6, 0.14, '#e6e1d3'), s * 0.32, 1.42, 0);
    part(s < 0 ? 'legL' : 'legR', (g) => { g.box(0, -0.35, 0, 0.18, 0.5, 0.2, '#6b6a4a'); g.box(0, -0.66, -0.03, 0.2, 0.22, 0.28, '#2f5a3a'); }, s * 0.13, 0.78, 0);
  }
  return root;
}

export function buildViewHands() {
  const g = new Geo();
  for (const s of [-1, 1]) {
    g.at(s * 0.2, -0.33, -0.42, 0, 0.15, 0);
    g.box(0, 0, 0.12, 0.1, 0.1, 0.34, '#e6e1d3');
    g.box(0, 0.02, -0.08, 0.11, 0.06, 0.13, '#f0c9a0');
    g.pop();
  }
  const m = new THREE.Mesh(g.geometry({ emit: false }), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

export const DECO_IDS = ['willow', 'birch', 'alder', 'pine', 'bush', 'reeds', 'cattail', 'rock_s', 'rock_m', 'rock_l', 'grass', 'flowers', 'log', 'stump', 'lily', 'boat', 'pier'];

export function decoGeometry(id) {
  const g = new Geo();
  if (['willow', 'birch', 'alder', 'pine'].includes(id)) {
    g.cyl(0, 0, 0, 0.18, 0.14, 2.6, 6, id === 'birch' ? '#ebe6dc' : '#7a5a3a');
    g.cyl(0, 2.2, 0, 1.6, 0, 3.6, 7, id === 'pine' ? '#2f6b3f' : '#5fa548');
  } else if (id === 'bush') g.cyl(0, 0, 0, 0.8, 0.2, 0.9, 7, '#4f9a3c');
  else if (id === 'reeds' || id === 'cattail' || id === 'grass') for (let i = 0; i < 6; i++) g.box(Math.cos(i * 2.4) * 0.15, 0.5, Math.sin(i * 2.4) * 0.15, 0.03, 1.0, 0.03, '#6f9a3c');
  else if (id.startsWith('rock')) { const s = id === 'rock_s' ? 0.4 : id === 'rock_m' ? 0.8 : 1.4; g.cyl(0, 0, 0, s, s * 0.6, s * 0.8, 6, '#9aa0a6'); }
  else if (id === 'lily') g.cyl(0, 0, 0, 0.35, 0.35, 0.02, 7, '#4f9a3c');
  else if (id === 'pier') { g.box(0, 0.55, 0, 2, 0.1, 4, '#b9824f'); for (const sx of [-0.9, 0.9]) for (const sz of [-1.8, 0, 1.8]) g.box(sx, 0, sz, 0.14, 1.4, 0.14, '#8a5c34'); }
  else if (id === 'boat') g.box(0, 0.2, 0, 1.1, 0.4, 3, '#b9824f');
  else g.box(0, 0.2, 0, 0.6, 0.4, 0.6, '#8a5c34');
  return g.geometry({ emit: false });
}
