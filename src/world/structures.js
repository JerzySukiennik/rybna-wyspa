// Rybna Wyspa: fixed island structures (the galvanized skup hopper sunk into a plank deck with its booth and scale, the fishing shop stall, the signpost, lanterns).

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { funnelColliders, COLORS as K } from '../blocks/defs.js';
import { SPOTS, LAND } from './island.js';
import { G, groups } from '../sim/physics.js';

export const SELL_R = 1.9;
const PLAZA_R = 4.45;
const SELL_TOP = 0.42;
const SELL_NECK = -1.0;
const SELL_OUT = 0.45;
const GALV = '#a7afb4', GALV_D = '#7f888e', GALV_DD = '#5d666c', IRON = '#2b2f33';

export function lantern(g, x, y, z, h = 2.4, arm = 0.55, yaw = 0) {
  g.at(x, y, z, yaw);
  g.box(0, h / 2, 0, 0.13, h, 0.13, K.woodD);
  g.box(arm / 2, h - 0.08, 0, arm + 0.1, 0.07, 0.07, IRON);
  g.box(arm, h - 0.2, 0, 0.02, 0.18, 0.02, IRON);
  const ly = h - 0.55;
  g.box(arm, ly + 0.26, 0, 0.26, 0.04, 0.26, IRON);
  g.cyl(arm, ly + 0.28, 0, 0.17, 0.02, 0.12, 4, IRON, { rot: Math.PI / 4 });
  g.box(arm, ly, 0, 0.19, 0.28, 0.19, '#ffb347', { emit: 2.7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(arm + sx * 0.1, ly, sz * 0.1, 0.025, 0.32, 0.025, IRON);
  g.box(arm, ly - 0.16, 0, 0.24, 0.04, 0.24, IRON);
  g.pop();
  return new THREE.Vector3(x + Math.cos(yaw) * arm, y + ly, z - Math.sin(yaw) * arm);
}

function hopper(g) {
  const seg = 16;
  const P = (rr, a, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    const inN = [-Math.cos(am) * 0.6, 0.8, -Math.sin(am) * 0.6];
    g.quadN(P(SELL_R, a0, SELL_TOP), P(SELL_R, a1, SELL_TOP), P(SELL_OUT, a1, SELL_NECK), P(SELL_OUT, a0, SELL_NECK), inN, i % 2 ? GALV_D : '#929ba1');
    g.quadN(P(SELL_R + 0.08, a0, SELL_TOP), P(SELL_R + 0.08, a1, SELL_TOP), P(SELL_R + 0.08, a1, -0.1), P(SELL_R + 0.08, a0, -0.1), [Math.cos(am), 0, Math.sin(am)], GALV);
    g.quadN(P(SELL_R, a0, SELL_TOP), P(SELL_R + 0.08, a0, SELL_TOP), P(SELL_R + 0.08, a1, SELL_TOP), P(SELL_R, a1, SELL_TOP), [0, 1, 0], '#c3c9cc');
    const rm = P(SELL_R + 0.09, am, SELL_TOP - 0.07);
    g.box(rm[0], rm[1], rm[2], 0.05, 0.05, 0.05, GALV_DD);
    const mid = P((SELL_R + SELL_OUT) / 2 + 0.03, a0, (SELL_TOP + SELL_NECK) / 2 + 0.035);
    g.at(mid[0], mid[1], mid[2], -a0, 0, Math.atan2(SELL_TOP - SELL_NECK, SELL_R - SELL_OUT)).box(0, 0, 0, 1.9, 0.03, 0.045, GALV_DD).pop();
  }
  g.ring(0, SELL_NECK - 0.2, 0, SELL_OUT, SELL_OUT + 0.08, 0.2, seg, GALV_DD);
  g.cyl(0, SELL_NECK - 0.5, 0, SELL_OUT + 0.02, SELL_OUT + 0.02, 0.3, seg, '#14181b');
  g.cyl(0, SELL_NECK + 0.32, 0, 0.08, 0.08, 0.04, 6, IRON);
  for (let i = 0; i < 6; i++) g.at(0, SELL_NECK + 0.36, 0, (i / 6) * Math.PI).box(0, 0, 0, SELL_OUT * 2 + 0.3, 0.03, 0.04, IRON).pop();
}

function deck(g) {
  g.ring(0, 0.0, 0, SELL_R + 0.08, PLAZA_R - 0.02, 0.105, 24, '#3f3123', { inner: '#3f3123' });
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const r0 = SELL_R + 0.09, r1 = PLAZA_R;
    const cols = ['#9c7b52', '#a8865a', '#8f6f48'];
    const k = 5;
    for (let j = 0; j < k; j++) {
      const ra = r0 + ((r1 - r0) * j) / k, rb = r0 + ((r1 - r0) * (j + 1)) / k - 0.025;
      const c = cols[(i * 3 + j) % 3];
      const P = (r, a) => [Math.cos(a) * r, 0.12, Math.sin(a) * r];
      g.quadN(P(ra, a0 + 0.004), P(rb, a0 + 0.004), P(rb, a1 - 0.004), P(ra, a1 - 0.004), [0, 1, 0], c);
    }
    const P0 = (r, y) => [Math.cos(a0) * r, y, Math.sin(a0) * r], P1 = (r, y) => [Math.cos(a1) * r, y, Math.sin(a1) * r];
    g.quadN(P0(PLAZA_R, -0.25), P1(PLAZA_R, -0.25), P1(PLAZA_R, 0.12), P0(PLAZA_R, 0.12), [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)], '#6f5536');
  }
}

function booth(g, sellLamps) {
  const bx = SELL_R + 2.35, bz = 0.7;
  g.at(bx, 0.12, bz, Math.PI / 2);
  g.box(0, 0.06, 0, 2.3, 0.12, 1.9, K.woodD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 1.05, 1.25, sz * 0.85, 0.12, 2.5, 0.12, K.woodD);
  g.box(-1.08, 1.25, 0, 0.06, 2.4, 1.7, '#8c6b46', { side: '#7b5d3d' });
  g.box(1.08, 1.25, 0, 0.06, 2.4, 1.7, '#8c6b46', { side: '#7b5d3d' });
  g.box(0, 1.25, 0.88, 2.1, 2.4, 0.06, '#8c6b46');
  g.box(0, 0.55, -0.88, 2.1, 0.95, 0.06, '#8c6b46');
  g.box(0, 1.06, -1.0, 2.2, 0.06, 0.32, '#b08d5e');
  for (let i = 0; i < 7; i++) g.box(-1.02 + i * 0.34, 0.55, -0.92, 0.03, 0.9, 0.02, '#6f5536');
  g.quadN([-1.3, 2.5, -1.25], [1.3, 2.5, -1.25], [1.3, 2.75, 1.15], [-1.3, 2.75, 1.15], [0, 1, -0.3], '#5f6a5f');
  g.box(0, 2.48, -1.25, 2.6, 0.06, 0.06, K.woodD);
  g.box(0, 2.95, -0.1, 2.5, 0.62, 0.08, K.woodD);
  g.box(-0.62, 1.95, -1.05, 0.04, 0.32, 0.04, IRON);
  g.cyl(-0.62, 1.55, -1.05, 0.11, 0.11, 0.2, 10, '#d9d2c1', { top: '#e9e3d4' });
  g.box(-0.62, 1.66, -1.115, 0.06, 0.06, 0.01, '#c43c3c');
  g.cyl(-0.62, 1.32, -1.05, 0.2, 0.24, 0.03, 10, GALV);
  for (const s of [-1, 1]) g.box(-0.62 + s * 0.16, 1.43, -1.05, 0.01, 0.22, 0.01, IRON);
  g.box(0.55, 0.58, -0.93, 0.76, 0.52, 0.03, '#26302b');
  g.box(0.55, 0.58, -0.915, 0.84, 0.6, 0.02, '#6f5536');
  g.pop();
  sellLamps.push(lantern(g, bx + 1.05, 0.12, bz - 0.95, 2.6, 0.5, Math.PI));
  return { bx, bz };
}

export function buildStructures(scene, phys, mat, models) {
  const out = { zones: [], shop: null, sell: null, lamps: [] };
  const R = phys.R;

  const g = new Geo();
  hopper(g);
  deck(g);
  const { bx, bz } = booth(g, out.lamps);
  const sellMesh = new THREE.Mesh(g.geometry(), mat);
  sellMesh.position.copy(SPOTS.sell);
  sellMesh.receiveShadow = true;
  sellMesh.castShadow = true;
  scene.add(sellMesh);
  for (const p of out.lamps) p.add(SPOTS.sell);
  const skupSign = textPlane('SKUP RYB', 2.3, 0.5, { bg: '#f5eedd', ink: '#1f2d4a', size: 92 });
  skupSign.position.set(bx - 0.145, 3.07, bz);
  skupSign.rotation.y = -Math.PI / 2;
  sellMesh.add(skupSign);
  const skupBack = textPlane('SKUP RYB', 2.3, 0.5, { bg: '#f5eedd', ink: '#1f2d4a', size: 92 });
  skupBack.position.set(bx - 0.055, 3.07, bz);
  skupBack.rotation.y = Math.PI / 2;
  sellMesh.add(skupBack);
  const board = textPlane('CENY DNIA', 0.7, 0.22, { bg: '#26302b', ink: '#e9e3d4', size: 70, frame: false });
  board.position.set(bx - 0.95, 0.82, bz - 0.55);
  board.rotation.y = -Math.PI / 2;
  sellMesh.add(board);

  const body = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SPOTS.sell.x, SPOTS.sell.y, SPOTS.sell.z));
  for (const c of funnelColliders(SELL_R, SELL_OUT, SELL_NECK, SELL_TOP, 0.25, 16)) phys.makeCollider(c, body);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    phys.makeCollider({ t: 'box', hx: 0.06, hy: (SELL_TOP + 0.1) / 2, hz: 0.42, pos: [Math.cos(a) * (SELL_R + 0.04), (SELL_TOP - 0.1) / 2, Math.sin(a) * (SELL_R + 0.04)], quat: [q.x, q.y, q.z, q.w], fr: 0.4 }, body);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    const rm = (SELL_R + 0.1 + PLAZA_R) / 2;
    phys.makeCollider({ t: 'box', hx: (PLAZA_R - SELL_R - 0.1) / 2, hy: 0.19, hz: Math.PI * PLAZA_R / 20 + 0.05, pos: [Math.cos(a) * rm, -0.07, Math.sin(a) * rm], quat: [q.x, q.y, q.z, q.w], fr: 0.8 }, body);
  }
  phys.makeCollider({ t: 'box', hx: 0.95, hy: 1.3, hz: 1.15, pos: [bx, 1.42, bz], quat: [0, 0, 0, 1] }, body);
  const grate = R.ColliderDesc.cylinder(0.05, 1.0).setTranslation(0, SELL_NECK + 0.35, 0).setCollisionGroups(groups(G.WORLD, G.PLAYER));
  phys.world.createCollider(grate, body);
  const sensor = R.ColliderDesc.cuboid(SELL_OUT + 0.05, 0.25, SELL_OUT + 0.05).setTranslation(0, SELL_NECK - 0.05, 0).setSensor(true)
    .setCollisionGroups(groups(G.SENSOR, G.FISH)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
  const sc = phys.world.createCollider(sensor, body);
  const z = { kind: 'sell', tag: 'skup', handle: sc.handle, col: sc, body };
  phys.zoneOf.set(sc.handle, z);
  out.sell = { pos: SPOTS.sell.clone(), top: SPOTS.sell.y + SELL_TOP, r: SELL_R, mesh: sellMesh };

  const W = 4.4, D = 3.0, YAW = -Math.PI / 2;
  const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  const s = new Geo();
  s.box(0, 0.09, 0, W + 0.8, 0.18, D + 0.9, K.woodD, { top: K.wood });
  for (let i = 0; i < 9; i++) s.box(-W / 2 - 0.4 + (i + 0.5) * ((W + 0.8) / 9), 0.185, 0, (W + 0.8) / 9 - 0.03, 0.01, D + 0.9, i % 2 ? K.wood : K.woodL);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box(sx * (W / 2 - 0.1), 1.5, sz * (D / 2 - 0.1), 0.18, 2.7, 0.18, K.woodD);
  s.box(-W / 2 + 0.1, 1.5, 0.15, 0.1, 2.7, D - 0.5, K.plank, { side: K.woodL });
  s.box(W / 2 - 0.1, 1.5, 0.15, 0.1, 2.7, D - 0.5, K.plank, { side: K.woodL });
  s.box(0, 1.5, D / 2 - 0.1, W - 0.3, 2.7, 0.1, K.plank);
  for (const sx of [-1, 1]) {
    s.box(sx * (W / 2 - 0.02), 1.75, 0.2, 0.03, 0.74, 0.94, K.woodD);
    s.box(sx * (W / 2 + 0.005), 1.75, 0.2, 0.02, 0.62, 0.82, '#ffb347', { emit: 2.5 });
    s.box(sx * (W / 2 + 0.02), 1.75, 0.2, 0.02, 0.62, 0.04, K.woodD);
  }
  s.box(0, 0.62, -D / 2 + 0.32, W - 0.3, 0.88, 0.5, K.woodL, { top: '#d9cfb8' });
  for (let i = 0; i < 6; i++) s.box(-W / 2 + 0.45 + i * ((W - 0.9) / 5), 0.62, -D / 2 + 0.06, 0.06, 0.86, 0.02, K.woodD);
  const crates = [];
  for (let i = 0; i < 3; i++) {
    const cx = -1.3 + i * 1.3, cz = -D / 2 + 0.32;
    s.box(cx, 1.15, cz, 0.95, 0.18, 0.44, '#9a7a50', { top: '#7d6040' });
    for (let k = 0; k < 9; k++) s.box(cx - 0.36 + (k % 3) * 0.36 + (k * 0.13 % 0.1), 1.26, cz - 0.13 + Math.floor(k / 3) * 0.13, 0.3, 0.05 + (k % 2) * 0.02, 0.12, k % 2 ? '#e3eef2' : '#cfe0e7');
    crates.push([cx, 1.32, cz]);
  }
  for (let i = 0; i < 8; i++) {
    const x0 = -W / 2 - 0.3 + i * ((W + 0.6) / 8), x1 = x0 + (W + 0.6) / 8;
    const col = i % 2 ? '#efe7d4' : '#2a8f86';
    s.quadN([x0, 2.55, -D / 2 - 0.05], [x1, 2.55, -D / 2 - 0.05], [x1, 2.12, -D / 2 - 1.05], [x0, 2.12, -D / 2 - 1.05], [0, 1, -0.5], col);
    s.quadN([x0, 2.12, -D / 2 - 1.05], [x1, 2.12, -D / 2 - 1.05], [x1, 1.98, -D / 2 - 1.05], [x0, 1.98, -D / 2 - 1.05], [0, 0, -1], col);
  }
  for (const sx of [-1, 1]) s.box(sx * (W / 2 + 0.25), 2.05, -D / 2 - 1.0, 0.04, 0.12, 0.04, IRON);
  const rh = 2.85, ridge = 4.15, ov = 0.45;
  for (const sz of [-1, 1]) s.quadN([-W / 2 - ov, rh, sz * (D / 2 + ov)], [W / 2 + ov, rh, sz * (D / 2 + ov)], [W / 2 + ov, ridge, 0], [-W / 2 - ov, ridge, 0], [0, 1, sz], '#4b5e52');
  for (const sz of [-1, 1]) s.quadN([-W / 2 - ov, rh - 0.12, sz * (D / 2 + ov)], [W / 2 + ov, rh - 0.12, sz * (D / 2 + ov)], [W / 2 + ov, ridge - 0.12, 0], [-W / 2 - ov, ridge - 0.12, 0], [0, -1, -sz], K.woodD);
  for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) {
    const t = (k + 0.5) / 6;
    const y = rh + (ridge - rh) * t, zz = sz * (D / 2 + ov) * (1 - t);
    s.box(0, y + 0.02, zz, W + ov * 2, 0.03, 0.05, '#3e4f45');
  }
  for (const sx of [-1, 1]) s.triN([sx * (W / 2 - 0.05), rh, -D / 2], [sx * (W / 2 - 0.05), rh, D / 2], [sx * (W / 2 - 0.05), ridge - 0.1, 0], [sx, 0, 0], K.plank);
  s.box(0, ridge + 0.04, 0, W + ov * 2 + 0.1, 0.12, 0.16, K.woodD);
  s.box(0, rh - 0.18, -D / 2 + 0.02, 3.75, 0.78, 0.1, K.woodD);
  for (const [x, zz] of [[W / 2 + 0.25, -D / 2 - 0.1], [W / 2 + 0.25, -D / 2 + 0.55], [-W / 2 - 0.3, D / 2 - 0.2]]) {
    s.cyl(x, 0.18, zz, 0.27, 0.3, 0.55, 9, '#8a5c34', { top: '#6a4528' });
    s.ring(x, 0.42, zz, 0.3, 0.32, 0.05, 9, '#3a3f45');
    s.ring(x, 0.27, zz, 0.29, 0.31, 0.05, 9, '#3a3f45');
  }
  s.box(-W / 2 - 0.35, 0.45, -D / 2 + 0.1, 0.55, 0.55, 0.55, K.crate, { top: K.woodL });
  s.box(-W / 2 - 0.3, 0.98, -D / 2 + 0.12, 0.4, 0.42, 0.42, K.crate, { top: K.woodL });
  for (let i = 0; i < 3; i++) s.at(W / 2 + 0.05 - i * 0.12, 0.2, D / 2 - 0.3 - i * 0.15, 0, 0, 0.12 + i * 0.05).box(0, 1.25, 0, 0.035, 2.5, 0.035, i === 1 ? '#2f3438' : '#8a5c34').pop();
  s.box(-W / 2 - 0.55, 2.42, -D / 2 + 0.1, 1.3, 0.07, 0.07, IRON);
  s.at(-W / 2 - 0.12, 2.22, -D / 2 + 0.1, 0, 0, -0.75).box(0, 0, 0, 0.5, 0.05, 0.05, IRON).pop();
  for (const dx of [-0.95, -0.45]) s.box(-W / 2 + dx, 2.24, -D / 2 + 0.1, 0.015, 0.36, 0.015, IRON);
  const shopLamp = lantern(s, W / 2 - 0.1, 0.18, -D / 2 - 0.12, 2.35, 0.5, -Math.PI / 2);
  const shopMesh = new THREE.Mesh(s.geometry(), mat);
  shopMesh.position.copy(SPOTS.shop);
  shopMesh.quaternion.copy(sq);
  shopMesh.castShadow = true;
  shopMesh.receiveShadow = true;
  scene.add(shopMesh);
  out.lamps.push(shopLamp.applyQuaternion(sq).add(SPOTS.shop));
  if (models) {
    const fm = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const trophy = new THREE.Mesh(models.fishGeometry('szczupak'), fm);
    trophy.scale.setScalar(1.15);
    trophy.position.set(-W / 2 - 0.7, 1.98, -D / 2 + 0.1);
    trophy.rotation.set(0, 0, 0.04);
    shopMesh.add(trophy);
    const kinds = ['okon', 'ploc', 'leszcz', 'karp', 'ukleja', 'lin'];
    crates.forEach((c, i) => {
      for (let k = 0; k < 2; k++) {
        const f = new THREE.Mesh(models.fishGeometry(kinds[(i * 2 + k) % kinds.length]), fm);
        f.scale.setScalar(0.34);
        f.position.set(c[0] - 0.18 + k * 0.34, c[1], c[2] + (k ? 0.06 : -0.05));
        f.rotation.set(Math.PI / 2, 0, 0.4 + k * 2.2);
        shopMesh.add(f);
      }
    });
  }
  const shopSign = textPlane('SKLEP RYBACKI', 3.45, 0.62, { bg: '#f5eedd', ink: '#1f2d4a', size: 92 });
  shopSign.position.set(0, rh - 0.18, -D / 2 - 0.035);
  shopSign.rotation.y = Math.PI;
  shopMesh.add(shopSign);
  const sb = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SPOTS.shop.x, SPOTS.shop.y, SPOTS.shop.z).setRotation(sq));
  const box = (hx, hy, hz, x, y, zz) => phys.makeCollider({ t: 'box', hx, hy, hz, pos: [x, y, zz], quat: [0, 0, 0, 1] }, sb);
  box(W / 2 + 0.4, 0.09, D / 2 + 0.45, 0, 0.09, 0);
  box((W - 0.3) / 2, 0.44, 0.25, 0, 0.62, -D / 2 + 0.32);
  box(0.05, 1.35, D / 2, -W / 2 + 0.1, 1.5, 0);
  box(0.05, 1.35, D / 2, W / 2 - 0.1, 1.5, 0);
  box(W / 2, 1.35, 0.05, 0, 1.5, D / 2 - 0.1);
  box(W / 2 + 0.5, 0.65, D / 2 + 0.5, 0, 3.5, 0);
  for (const [x, zz] of [[W / 2 + 0.25, -D / 2 - 0.1], [W / 2 + 0.25, -D / 2 + 0.55], [-W / 2 - 0.3, D / 2 - 0.2]]) box(0.28, 0.32, 0.28, x, 0.5, zz);
  box(0.3, 0.5, 0.3, -W / 2 - 0.35, 0.5, -D / 2 + 0.1);
  const front = new THREE.Vector3(0, 1.1, -D / 2 - 0.7).applyQuaternion(sq).add(SPOTS.shop);
  out.shop = { pos: front, mesh: shopMesh };

  const post = new Geo();
  post.box(0, 1.75, 0, 0.18, 3.5, 0.18, K.woodD);
  post.cyl(0, 3.5, 0, 0.13, 0.02, 0.2, 4, K.woodD, { rot: Math.PI / 4 });
  post.box(0, 0.08, 0, 0.5, 0.16, 0.5, '#8d8a80');
  const sign = new THREE.Mesh(post.geometry(), mat);
  sign.position.copy(SPOTS.spawn).add(new THREE.Vector3(2.4, 0, 1.6));
  sign.castShadow = true;
  scene.add(sign);
  const arrow = (text, target, y) => {
    const d = new THREE.Vector3().subVectors(target, sign.position);
    const yaw = Math.atan2(-d.z, d.x);
    const gr = new THREE.Group();
    gr.position.set(0, y, 0);
    gr.rotation.y = yaw;
    const bd = new Geo();
    bd.prism([[0.1, -0.3], [1.95, -0.3], [2.35, 0], [1.95, 0.3], [0.1, 0.3]], -0.045, 0.045, '#d9bd8c', { side: K.wood });
    const bm = new THREE.Mesh(bd.geometry(), mat);
    bm.castShadow = true;
    gr.add(bm);
    for (const side of [1, -1]) {
      const t = textPlane(text, 1.75, 0.46, { bg: '#e6c99a', ink: '#1f2d4a', size: 78 });
      t.position.set(1.08, 0, side * 0.047);
      if (side < 0) t.rotation.y = Math.PI;
      gr.add(t);
    }
    sign.add(gr);
  };
  arrow('SKUP RYB', SPOTS.sell, 2.95);
  arrow('SKLEP', SPOTS.shop, 2.3);

  return out;
}

const signs = [];

export function textPlane(text, w, h, o = {}) {
  const c = document.createElement('canvas');
  const px = 512;
  c.width = px;
  c.height = Math.max(32, Math.round((px * h) / w));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  m.castShadow = false;
  const draw = () => {
    const x = c.getContext('2d');
    x.fillStyle = o.bg || '#f5eedd';
    x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(120,90,40,${0.04 + Math.random() * 0.05})`; x.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2); }
    x.strokeStyle = o.ink || '#1f2d4a';
    if (o.frame !== false) {
      x.lineWidth = 6;
      x.strokeRect(12, 12, c.width - 24, c.height - 24);
    }
    x.fillStyle = o.ink || '#1f2d4a';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    let size = Math.min(o.size || 80, c.height * 0.62);
    x.font = `700 ${size}px Oswald, 'Arial Narrow', sans-serif`;
    while (x.measureText(text).width > c.width * 0.8 && size > 10) { size -= 2; x.font = `700 ${size}px Oswald, 'Arial Narrow', sans-serif`; }
    x.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
    tex.needsUpdate = true;
  };
  draw();
  signs.push(draw);
  return m;
}

export function redrawSigns() {
  for (const d of signs) d();
}

export function sellHole() {
  return { x: SPOTS.sell.x, z: SPOTS.sell.z, r: PLAZA_R - 1.25 };
}

export { SELL_TOP, LAND };
