// Rybna Wyspa: fixed island structures (the main sell funnel sunk into the ground, the shop stall, the welcome sign).

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { funnelVisual, funnelColliders, COLORS as K } from '../blocks/defs.js';
import { SPOTS, LAND } from './island.js';
import { G, groups } from '../sim/physics.js';

export const SELL_R = 1.9;
const PLAZA_R = 4.45;
const SELL_TOP = 0.26;
const SELL_NECK = -1.0;
const SELL_OUT = 0.45;

export function buildStructures(scene, phys, mat) {
  const out = { zones: [], shop: null, sell: null };
  const R = phys.R;

  const g = new Geo();
  funnelVisual(g, SELL_R, SELL_OUT, SELL_NECK, SELL_TOP, { inner: '#3a4650', outer: '#3a4650', rim: '#f4b73a' });
  g.ring(0, -0.3, 0, SELL_R + 0.06, PLAZA_R, 0.42, 18, '#c9b07a', { top: '#dcc48f', inner: '#9a8257' });
  g.cyl(0, SELL_NECK - 0.4, 0, 0.7, 0.7, 0.4, 10, '#1b2228');
  for (const s of [-1, 1]) g.box(s * 1.3, 1.0, -SELL_R - 0.6, 0.12, 2.0, 0.12, K.woodD);
  g.box(0, 2.05, -SELL_R - 0.6, 3.0, 0.7, 0.1, '#2f6b3f', { front: '#3d7f4d', back: '#3d7f4d' });
  g.box(0, 2.05, -SELL_R - 0.54, 2.7, 0.5, 0.02, '#ffd23a', { emit: 0.25 });
  g.box(SELL_R + 1.25, 0.5, 0.5, 1.0, 1.0, 0.8, '#3d7f4d', { top: '#2f6b3f' });
  g.box(SELL_R + 1.25, 1.1, 0.5, 0.8, 0.2, 0.55, '#2b2f35', { top: '#ffd23a', emitTop: 0.35 });
  const sellMesh = new THREE.Mesh(g.geometry(), mat);
  sellMesh.position.copy(SPOTS.sell);
  sellMesh.receiveShadow = true;
  sellMesh.castShadow = true;
  scene.add(sellMesh);

  const body = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SPOTS.sell.x, SPOTS.sell.y, SPOTS.sell.z));
  for (const c of funnelColliders(SELL_R, SELL_OUT, SELL_NECK, SELL_TOP, 0.25, 14)) phys.makeCollider(c, body);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    phys.makeCollider({ t: 'box', hx: 0.05, hy: SELL_TOP / 2, hz: 0.45, pos: [Math.cos(a) * (SELL_R + 0.03), SELL_TOP / 2, Math.sin(a) * (SELL_R + 0.03)], quat: [q.x, q.y, q.z, q.w], fr: 0.4 }, body);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    const rm = (SELL_R + 0.1 + PLAZA_R) / 2;
    phys.makeCollider({ t: 'box', hx: (PLAZA_R - SELL_R - 0.1) / 2, hy: 0.21, hz: Math.PI * PLAZA_R / 20 + 0.05, pos: [Math.cos(a) * rm, -0.09, Math.sin(a) * rm], quat: [q.x, q.y, q.z, q.w], fr: 0.8 }, body);
  }
  phys.makeCollider({ t: 'box', hx: 0.5, hy: 0.5, hz: 0.4, pos: [SELL_R + 1.25, 0.5, 0.5], quat: [0, 0, 0, 1] }, body);
  for (const s of [-1, 1]) phys.makeCollider({ t: 'box', hx: 0.06, hy: 1.0, hz: 0.06, pos: [s * 1.3, 1.0, -SELL_R - 0.6], quat: [0, 0, 0, 1] }, body);
  const grate = R.ColliderDesc.cylinder(0.05, 1.0).setTranslation(0, SELL_NECK + 0.35, 0).setCollisionGroups(groups(G.WORLD, G.PLAYER));
  phys.world.createCollider(grate, body);
  const sensor = R.ColliderDesc.cuboid(SELL_OUT + 0.05, 0.25, SELL_OUT + 0.05).setTranslation(0, SELL_NECK - 0.05, 0).setSensor(true)
    .setCollisionGroups(groups(G.SENSOR, G.FISH)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
  const sc = phys.world.createCollider(sensor, body);
  const z = { kind: 'sell', tag: 'skup', handle: sc.handle, col: sc, body };
  phys.zoneOf.set(sc.handle, z);
  out.sell = { pos: SPOTS.sell.clone(), top: SPOTS.sell.y + SELL_TOP, r: SELL_R, mesh: sellMesh };

  const s = new Geo();
  const W = 4.6, D = 2.6;
  s.box(0, 0.08, 0, W + 0.4, 0.16, D + 0.4, K.woodD, { top: K.wood });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box(sx * (W / 2 - 0.1), 1.45, sz * (D / 2 - 0.1), 0.16, 2.6, 0.16, K.woodD);
  s.box(0, 0.6, -D / 2 + 0.25, W - 0.2, 0.9, 0.5, K.woodL, { top: '#e9eef2' });
  s.box(0, 0.6, 0, 0.12, 0.9, D - 0.4, K.wood);
  s.box(-W / 2 + 0.1, 1.45, 0, 0.1, 2.6, D - 0.3, K.plank);
  s.box(W / 2 - 0.1, 1.45, 0, 0.1, 2.6, D - 0.3, K.plank);
  s.box(0, 1.45, D / 2 - 0.1, W - 0.3, 2.6, 0.1, K.plank);
  for (let i = 0; i < 7; i++) {
    const x = -W / 2 - 0.2 + i * ((W + 0.4) / 6.5);
    s.at(x + 0.33, 2.95, -D / 2 - 0.15, 0, 0.32, 0).box(0, 0, 0, (W + 0.4) / 6.5, 0.06, 1.0, i % 2 ? '#ffffff' : '#47c9c2').pop();
  }
  s.box(0, 3.15, 0, W + 0.6, 0.12, D + 0.6, K.woodD, { top: '#3d7f4d' });
  s.box(0, 3.55, -D / 2 - 0.05, 2.6, 0.7, 0.12, '#2f6b3f');
  s.box(0, 3.55, -D / 2 - 0.12, 2.3, 0.5, 0.02, '#ffd23a', { emit: 0.25 });
  for (let i = 0; i < 5; i++) s.box(-1.6 + i * 0.8, 1.12, -D / 2 + 0.12, 0.5, 0.14, 0.32, ['#4f8fc0', '#5fd068', '#ffb02e', '#b57bff', '#47c9c2'][i], { emit: 0.15 });
  const shopMesh = new THREE.Mesh(s.geometry(), mat);
  shopMesh.position.copy(SPOTS.shop);
  shopMesh.castShadow = true;
  shopMesh.receiveShadow = true;
  scene.add(shopMesh);
  const sb = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SPOTS.shop.x, SPOTS.shop.y, SPOTS.shop.z));
  const box = (hx, hy, hz, x, y, zz) => phys.makeCollider({ t: 'box', hx, hy, hz, pos: [x, y, zz], quat: [0, 0, 0, 1] }, sb);
  box(W / 2 + 0.2, 0.08, D / 2 + 0.2, 0, 0.08, 0);
  box((W - 0.2) / 2, 0.45, 0.25, 0, 0.6, -D / 2 + 0.25);
  box(0.05, 1.3, D / 2, -W / 2 + 0.1, 1.45, 0);
  box(0.05, 1.3, D / 2, W / 2 - 0.1, 1.45, 0);
  box(W / 2, 1.3, 0.05, 0, 1.45, D / 2 - 0.1);
  box(W / 2 + 0.3, 0.06, D / 2 + 0.3, 0, 3.15, 0);
  out.shop = { pos: SPOTS.shop.clone().add(new THREE.Vector3(0, 1.1, -D / 2 - 0.2)), mesh: shopMesh, npc: SPOTS.shop.clone().add(new THREE.Vector3(0, 0.16, 0.25)) };

  const w = new Geo();
  w.box(0, 0.9, 0, 0.12, 1.8, 0.12, K.woodD);
  w.box(0, 1.65, 0, 1.9, 0.6, 0.08, K.woodL, { front: K.wood });
  w.box(0, 1.65, -0.045, 1.7, 0.42, 0.01, '#2f6b3f');
  const sign = new THREE.Mesh(w.geometry(), mat);
  sign.position.copy(SPOTS.spawn).add(new THREE.Vector3(3.2, 0, 2.2));
  sign.rotation.y = -0.6;
  sign.castShadow = true;
  scene.add(sign);

  return out;
}

export function sellHole() {
  return { x: SPOTS.sell.x, z: SPOTS.sell.z, r: PLAZA_R - 1.25 };
}

export { SELL_TOP, LAND };
