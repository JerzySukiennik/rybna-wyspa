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

export function buildStructures(scene, phys, mat, models) {
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

  const W = 4.4, D = 3.0, YAW = -Math.PI / 2;
  const s = new Geo();
  s.box(0, 0.09, 0, W + 0.8, 0.18, D + 0.9, K.woodD, { top: K.wood });
  for (let i = 0; i < 9; i++) s.box(-W / 2 - 0.4 + (i + 0.5) * ((W + 0.8) / 9), 0.185, 0, (W + 0.8) / 9 - 0.03, 0.01, D + 0.9, i % 2 ? K.wood : K.woodL);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box(sx * (W / 2 - 0.1), 1.5, sz * (D / 2 - 0.1), 0.18, 2.7, 0.18, K.woodD);
  s.box(-W / 2 + 0.1, 1.5, 0.15, 0.1, 2.7, D - 0.5, K.plank, { side: K.woodL });
  s.box(W / 2 - 0.1, 1.5, 0.15, 0.1, 2.7, D - 0.5, K.plank, { side: K.woodL });
  s.box(0, 1.5, D / 2 - 0.1, W - 0.3, 2.7, 0.1, K.plank);
  for (const sx of [-1, 1]) s.box(sx * (W / 2 - 0.04), 1.75, 0.2, 0.02, 0.7, 0.9, '#22313f', { emit: 0.08 });
  s.box(0, 0.62, -D / 2 + 0.32, W - 0.3, 0.88, 0.5, K.woodL, { top: '#e9e2cf' });
  for (let i = 0; i < 6; i++) s.box(-W / 2 + 0.45 + i * ((W - 0.9) / 5), 0.62, -D / 2 + 0.06, 0.06, 0.86, 0.02, K.woodD);
  for (let i = 0; i < 5; i++) s.box(-1.5 + i * 0.75, 1.13, -D / 2 + 0.3, 0.46, 0.13, 0.3, ['#4f8fc0', '#5fd068', '#ffb02e', '#b57bff', '#47c9c2'][i]);
  for (let i = 0; i < 8; i++) {
    const x0 = -W / 2 - 0.3 + i * ((W + 0.6) / 8), x1 = x0 + (W + 0.6) / 8;
    const col = i % 2 ? '#f5eedd' : '#2a8f86';
    s.quadN([x0, 2.55, -D / 2 - 0.05], [x1, 2.55, -D / 2 - 0.05], [x1, 2.12, -D / 2 - 1.05], [x0, 2.12, -D / 2 - 1.05], [0, 1, -0.5], col);
    s.quadN([x0, 2.12, -D / 2 - 1.05], [x1, 2.12, -D / 2 - 1.05], [x1, 2.0, -D / 2 - 1.05], [x0, 2.0, -D / 2 - 1.05], [0, 0, -1], col);
  }
  const rh = 2.85, ridge = 4.15, ov = 0.45;
  for (const sz of [-1, 1]) s.quadN([-W / 2 - ov, rh, sz * (D / 2 + ov)], [W / 2 + ov, rh, sz * (D / 2 + ov)], [W / 2 + ov, ridge, 0], [-W / 2 - ov, ridge, 0], [0, 1, sz], '#3d6b55');
  for (const sz of [-1, 1]) s.quadN([-W / 2 - ov, rh - 0.12, sz * (D / 2 + ov)], [W / 2 + ov, rh - 0.12, sz * (D / 2 + ov)], [W / 2 + ov, ridge - 0.12, 0], [-W / 2 - ov, ridge - 0.12, 0], [0, -1, -sz], K.woodD);
  for (const sx of [-1, 1]) s.triN([sx * (W / 2 - 0.05), rh, -D / 2], [sx * (W / 2 - 0.05), rh, D / 2], [sx * (W / 2 - 0.05), ridge - 0.1, 0], [sx, 0, 0], K.plank);
  s.box(0, ridge + 0.04, 0, W + ov * 2 + 0.1, 0.12, 0.16, K.woodD);
  s.box(0, rh - 0.18, -D / 2 + 0.02, W - 0.2, 0.36, 0.08, K.woodD);
  for (const [x, z] of [[W / 2 + 0.25, -D / 2 - 0.1], [W / 2 + 0.25, -D / 2 + 0.55], [-W / 2 - 0.3, D / 2 - 0.2]]) {
    s.cyl(x, 0.18, z, 0.27, 0.3, 0.55, 9, '#8a5c34', { top: '#6a4528' });
    s.ring(x, 0.42, z, 0.3, 0.32, 0.05, 9, '#3a3f45');
    s.ring(x, 0.27, z, 0.29, 0.31, 0.05, 9, '#3a3f45');
  }
  s.box(-W / 2 - 0.35, 0.45, -D / 2 + 0.1, 0.55, 0.55, 0.55, K.crate, { top: K.woodL });
  s.box(-W / 2 - 0.3, 0.98, -D / 2 + 0.12, 0.4, 0.42, 0.42, K.crate, { top: K.woodL });
  for (let i = 0; i < 3; i++) s.at(W / 2 + 0.05 - i * 0.12, 0.2, D / 2 - 0.3 - i * 0.15, 0, 0, 0.12 + i * 0.05).box(0, 1.25, 0, 0.035, 2.5, 0.035, i === 1 ? '#2f3438' : '#8a5c34').pop();
  s.box(0, 2.05, -D / 2 - 1.0, 0.03, 0.3, 0.03, K.dark);
  s.box(0, 1.8, -D / 2 - 1.0, 0.22, 0.26, 0.22, K.lamp, { emit: 1, top: K.dark, emitTop: 0 });
  const shopMesh = new THREE.Mesh(s.geometry(), mat);
  shopMesh.position.copy(SPOTS.shop);
  shopMesh.rotation.y = YAW;
  shopMesh.castShadow = true;
  shopMesh.receiveShadow = true;
  scene.add(shopMesh);
  if (models) {
    const trophy = new THREE.Mesh(models.fishGeometry('karp'), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    trophy.scale.set(1.2, 1.2, 1.2);
    trophy.position.set(0, 3.45, -D / 2 - 0.42);
    trophy.rotation.set(0, 0, 0.12);
    shopMesh.add(trophy);
  }
  const shopSign = textPlane('SKLEP RYBACKI', 2.9, 0.56, { bg: '#f5eedd', ink: '#1f2d4a', size: 92 });
  shopSign.position.set(0, rh - 0.18, -D / 2 - 0.03);
  shopSign.rotation.y = Math.PI;
  shopMesh.add(shopSign);
  const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  const sb = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SPOTS.shop.x, SPOTS.shop.y, SPOTS.shop.z).setRotation(sq));
  const box = (hx, hy, hz, x, y, zz) => phys.makeCollider({ t: 'box', hx, hy, hz, pos: [x, y, zz], quat: [0, 0, 0, 1] }, sb);
  box(W / 2 + 0.4, 0.09, D / 2 + 0.45, 0, 0.09, 0);
  box((W - 0.3) / 2, 0.44, 0.25, 0, 0.62, -D / 2 + 0.32);
  box(0.05, 1.35, D / 2, -W / 2 + 0.1, 1.5, 0);
  box(0.05, 1.35, D / 2, W / 2 - 0.1, 1.5, 0);
  box(W / 2, 1.35, 0.05, 0, 1.5, D / 2 - 0.1);
  box(W / 2 + 0.5, 0.65, D / 2 + 0.5, 0, 3.5, 0);
  for (const [x, z] of [[W / 2 + 0.25, -D / 2 - 0.1], [W / 2 + 0.25, -D / 2 + 0.55], [-W / 2 - 0.3, D / 2 - 0.2]]) box(0.28, 0.32, 0.28, x, 0.5, z);
  box(0.3, 0.5, 0.3, -W / 2 - 0.35, 0.5, -D / 2 + 0.1);
  const front = new THREE.Vector3(0, 1.1, -D / 2 - 0.7).applyQuaternion(sq).add(SPOTS.shop);
  out.shop = { pos: front, mesh: shopMesh };

  const post = new Geo();
  post.box(0, 1.3, 0, 0.14, 2.6, 0.14, K.woodD);
  post.cyl(0, 2.6, 0, 0.1, 0.02, 0.14, 4, K.woodD, { rot: Math.PI / 4 });
  const sign = new THREE.Mesh(post.geometry(), mat);
  sign.position.copy(SPOTS.spawn).add(new THREE.Vector3(2.4, 0, 1.6));
  sign.castShadow = true;
  scene.add(sign);
  const arrow = (text, target, y) => {
    const d = new THREE.Vector3().subVectors(target, sign.position);
    const yaw = Math.atan2(-d.z, d.x);
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    g.rotation.y = yaw;
    const board = new Geo();
    board.prism([[0.08, -0.2], [1.25, -0.2], [1.5, 0], [1.25, 0.2], [0.08, 0.2]], -0.035, 0.035, K.woodL, { side: K.wood });
    const bm = new THREE.Mesh(board.geometry(), mat);
    bm.castShadow = true;
    g.add(bm);
    for (const side of [1, -1]) {
      const t = textPlane(text, 1.15, 0.3, { bg: '#e6c99a', ink: '#1f2d4a', size: 70 });
      t.position.set(0.72, 0, side * 0.037);
      if (side < 0) t.rotation.y = Math.PI;
      g.add(t);
    }
    sign.add(g);
  };
  arrow('SKUP RYB', SPOTS.sell, 2.15);
  arrow('SKLEP', SPOTS.shop, 1.7);
  const skupSign = textPlane('SKUP RYB', 2.6, 0.45, { bg: '#f5eedd', ink: '#1f2d4a', size: 92 });
  skupSign.position.copy(SPOTS.sell).add(new THREE.Vector3(0, 2.05, -SELL_R - 0.53));
  skupSign.rotation.y = Math.PI;
  scene.add(skupSign);
  const skupBack = skupSign.clone();
  skupBack.position.z -= 0.14;
  skupBack.rotation.y = 0;
  scene.add(skupBack);

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
    x.lineWidth = 6;
    x.strokeRect(10, 10, c.width - 20, c.height - 20);
    x.fillStyle = o.ink || '#1f2d4a';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    let size = Math.min(o.size || 80, c.height * 0.7);
    x.font = `700 ${size}px Oswald, 'Arial Narrow', sans-serif`;
    while (x.measureText(text).width > c.width - 60 && size > 10) { size -= 2; x.font = `700 ${size}px Oswald, 'Arial Narrow', sans-serif`; }
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
