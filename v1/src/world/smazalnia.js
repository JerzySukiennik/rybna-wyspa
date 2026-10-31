// Rybna Wyspa: the riverside fish fry (white plank kiosk with a serving hatch and fryer, chalkboard "danie dnia", picnic tables with umbrellas and two diners, a steel hopper that buys fish).

import * as THREE from 'three';
import { Geo } from '../render/geo.js';
import { COLORS as K, BELT_TOP } from '../blocks/defs.js';
import { textPlane, lantern } from './structures.js';
import { islandHeight, LAND } from './island.js';
import { G, groups } from '../sim/physics.js';
import { SPECIES } from '../data/species.js';
import { MENU_MULT } from '../data/menu.js';

export const SMAZ = new THREE.Vector3(12.6, LAND, 2.6);
const YAW = Math.PI / 2;
const KW = 3.4, KD = 2.4, KZ = 1.45, KH = 2.75, KHB = 2.45;
const DECK = { x0: -3.4, x1: 1.75, z0: -3.1, z1: 2.85 };
const HOP = { x: 2.45, z: 0.85, r: 0.6, rim: BELT_TOP - 0.08, neck: 0.16, out: 0.2 };
const WHITE = '#ece6d8', WHITE2 = '#e2dbcb', NAVY = '#2c4a6e', NAVY2 = '#24405f', STEEL = '#b9c1c6', STEEL2 = '#8f989e', OIL = '#d4a03a';

function planksH(g, x0, x1, y0, y1, z, nz, n, cols) {
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const y = y0 + (i + 0.5) * h;
    g.box((x0 + x1) / 2, y, z, x1 - x0, h - 0.012, 0.06, cols[i % cols.length]);
    g.box((x0 + x1) / 2, y - h / 2 + 0.006, z + nz * 0.032, x1 - x0, 0.012, 0.01, '#bdb5a3');
  }
}

function kiosk(g) {
  const x0 = -KW / 2, x1 = KW / 2, z0 = KZ - KD / 2, z1 = KZ + KD / 2;
  const cols = [WHITE, WHITE2, WHITE, '#e8e1d2'];
  g.box(0, 0.24, KZ, KW, 0.1, KD, '#7a6a55');
  planksH(g, x0, x1, 0.2, KHB, z1 - 0.03, 1, 13, cols);
  for (const [sx, xx] of [[-1, x0 + 0.03], [1, x1 - 0.03]]) {
    const n = 13, h = (KHB - 0.2) / n;
    for (let i = 0; i < n; i++) g.box(xx, 0.2 + (i + 0.5) * h, KZ, 0.06, h - 0.012, KD, cols[(i + 1) % cols.length]);
    g.triN([xx + sx * 0.031, KHB, z1], [xx + sx * 0.031, KH - 0.02, z0], [xx + sx * 0.031, KHB, z0], [sx, 0, 0], WHITE2);
    g.triN([xx - sx * 0.031, KHB, z1], [xx - sx * 0.031, KH - 0.02, z0], [xx - sx * 0.031, KHB, z0], [-sx, 0, 0], WHITE2);
  }
  const wx0 = -0.35, wx1 = 1.4, wy0 = 1.02, wy1 = 2.0;
  planksH(g, x0, x1, 0.2, wy0, z0 + 0.03, -1, 4, cols);
  planksH(g, x0, wx0, wy0, KH - 0.05, z0 + 0.03, -1, 7, cols);
  planksH(g, wx1, x1, wy0, KH - 0.05, z0 + 0.03, -1, 7, cols);
  planksH(g, wx0, wx1, wy1, KH - 0.05, z0 + 0.03, -1, 3, cols);
  for (const [x, w] of [[wx0 - 0.03, 0.06], [wx1 + 0.03, 0.06]]) g.box(x, (wy0 + wy1) / 2, z0 - 0.005, w, wy1 - wy0 + 0.06, 0.08, NAVY);
  g.box((wx0 + wx1) / 2, wy1 + 0.03, z0 - 0.005, wx1 - wx0 + 0.12, 0.06, 0.08, NAVY);
  g.box((wx0 + wx1) / 2, wy0 - 0.02, z0 - 0.2, wx1 - wx0 + 0.2, 0.05, 0.46, STEEL, { top: '#d3d9dc' });
  for (const sx of [wx0 + 0.05, wx1 - 0.05]) g.line([sx, wy0 - 0.05, z0 - 0.38], [sx, wy0 - 0.38, z0 + 0.0], 0.018, STEEL2, 4);
  g.box((wx0 + wx1) / 2, wy1 + 0.17, z0 - 0.07, wx1 - wx0 + 0.16, 0.2, 0.16, '#5d666c');
  for (const [x, xx] of [[x0, x0 + 0.035], [x1, x1 - 0.035]]) g.box(xx, KHB / 2 + 0.1, z0 + 0.035, 0.09, KHB, 0.09, NAVY);
  for (const xx of [x0 + 0.035, x1 - 0.035]) g.box(xx, KHB / 2 + 0.1, z1 - 0.035, 0.09, KHB, 0.09, NAVY);
  const ov = 0.35;
  const yF = KH + 0.02, yB = KHB + 0.02;
  const P = (x, y, z) => [x, y, z];
  g.quadN(P(x0 - ov, yF, z0 - ov), P(x1 + ov, yF, z0 - ov), P(x1 + ov, yB, z1 + ov), P(x0 - ov, yB, z1 + ov), [0, 1, 0.12], '#55605a');
  g.quadN(P(x0 - ov, yF - 0.06, z0 - ov), P(x1 + ov, yF - 0.06, z0 - ov), P(x1 + ov, yB - 0.06, z1 + ov), P(x0 - ov, yB - 0.06, z1 + ov), [0, -1, -0.12], '#3f4842');
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = x0 - ov + (i / n) * (KW + ov * 2);
    g.line([x, yF + 0.012, z0 - ov], [x, yB + 0.012, z1 + ov], 0.012, '#47524b', 3);
  }
  g.box(0, yF - 0.07, z0 - ov, KW + ov * 2 + 0.04, 0.12, 0.05, NAVY2);
  g.box(0.95, yB + 0.32, 1.95, 0.16, 0.7, 0.16, STEEL2, { top: '#5d666c' });
  g.cyl(0.95, yB + 0.68, 1.95, 0.2, 0.06, 0.1, 6, '#5d666c');
  const fz = z1 - 0.45;
  g.box(0.35, 0.55, fz, 1.15, 0.7, 0.6, STEEL, { top: STEEL2 });
  g.box(0.35, 0.91, fz, 1.0, 0.02, 0.48, OIL, { emit: 0.25 });
  for (const sx of [-1, 1]) {
    g.box(0.35 + sx * 0.25, 0.97, fz - 0.05, 0.42, 0.1, 0.34, '#d8d4c8');
    g.box(0.35 + sx * 0.25, 1.06, fz - 0.3, 0.04, 0.04, 0.28, '#2b2f33');
  }
  g.box(0.35, 1.7, fz + 0.1, 1.3, 0.5, 0.5, STEEL2, { top: '#7f888e' });
  g.box(-1.1, 0.45, fz + 0.05, 0.8, 0.9, 0.5, '#d9d4c4', { top: STEEL });
  g.box(-1.1, 1.25, fz + 0.12, 0.8, 0.04, 0.3, '#a8865c');
  for (let i = 0; i < 4; i++) g.cyl(-1.35 + i * 0.17, 1.27, fz + 0.12, 0.05, 0.05, 0.16, 6, ['#d9a43a', '#efe7d4', '#4f8a55', '#d9a43a'][i]);
}

function table(g, x, z, rot, umb) {
  g.at(x, 0.18, z, rot);
  g.box(0, 0.74, 0, 1.6, 0.05, 0.72, '#a8865c', { side: '#8a6a46' });
  for (let i = 0; i < 4; i++) g.box(0, 0.768, -0.27 + i * 0.18, 1.58, 0.004, 0.012, '#7a5c3c');
  for (const s of [-1, 1]) {
    g.box(0, 0.44, s * 0.6, 1.6, 0.045, 0.26, '#9c7b52', { side: '#7a5c3c' });
    g.line([-0.62, 0, s * 0.42], [-0.62, 0.74, 0], 0.03, '#7a5c3c', 4);
    g.line([0.62, 0, s * 0.42], [0.62, 0.74, 0], 0.03, '#7a5c3c', 4);
    g.line([-0.62, 0.42, s * 0.6], [-0.62, 0.0, s * 0.62], 0.025, '#7a5c3c', 4);
    g.line([0.62, 0.42, s * 0.6], [0.62, 0.0, s * 0.62], 0.025, '#7a5c3c', 4);
  }
  if (umb) {
    g.cyl(0, 0, 0, 0.025, 0.025, 2.45, 6, '#e2dbcb');
    const R = 1.25, seg = 8, top = 2.42, low = 2.0;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const c = i % 2 ? NAVY : WHITE;
      g.triN([0, top, 0], [Math.cos(a1) * R, low, Math.sin(a1) * R], [Math.cos(a0) * R, low, Math.sin(a0) * R], [0, 1, 0], c);
      g.triN([0, top - 0.03, 0], [Math.cos(a0) * R, low - 0.03, Math.sin(a0) * R], [Math.cos(a1) * R, low - 0.03, Math.sin(a1) * R], [0, -1, 0], i % 2 ? NAVY2 : WHITE2);
      g.quadN([Math.cos(a0) * R, low, Math.sin(a0) * R], [Math.cos(a1) * R, low, Math.sin(a1) * R], [Math.cos(a1) * R, low - 0.16, Math.sin(a1) * R], [Math.cos(a0) * R, low - 0.16, Math.sin(a0) * R], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)], c);
    }
    g.cyl(0, top, 0, 0.05, 0.02, 0.1, 6, '#e2dbcb');
  }
  g.pop();
}

function aframe(g, x, z, rot) {
  g.at(x, 0.18, z, rot);
  for (const s of [-1, 1]) {
    g.at(0, 0, s * 0.2, 0, -s * 0.2, 0);
    g.box(0, 0.58, 0, 0.72, 1.12, 0.04, '#7a5c3c');
    g.pop();
  }
  g.pop();
}

function hopper(g) {
  const { r, rim, neck, out } = HOP;
  const P = (sx, sz, rr, y) => [sx * rr, y, sz * rr];
  const sides = [[[-1, -1], [1, -1], [0, -1]], [[1, -1], [1, 1], [1, 0]], [[1, 1], [-1, 1], [0, 1]], [[-1, 1], [-1, -1], [-1, 0]]];
  for (const [a, b, n] of sides) {
    g.quadN(P(a[0], a[1], r, rim), P(b[0], b[1], r, rim), P(b[0], b[1], out, neck), P(a[0], a[1], out, neck), [-n[0] * 0.6, 0.8, -n[1] * 0.6], '#9aa3a8');
    g.quadN(P(a[0], a[1], r + 0.04, rim), P(b[0], b[1], r + 0.04, rim), P(b[0], b[1], r + 0.04, 0.0), P(a[0], a[1], r + 0.04, 0.0), [n[0], 0, n[1]], STEEL);
    g.quadN(P(a[0], a[1], r, rim), P(a[0], a[1], r + 0.04, rim), P(b[0], b[1], r + 0.04, rim), P(b[0], b[1], r, rim), [0, 1, 0], '#d3d9dc');
  }
  g.box(0, neck - 0.02, 0, out * 2 + 0.04, 0.04, out * 2 + 0.04, '#14181b');
  g.box(-(r + 0.25), 0.3, 0, 0.5, 0.26, 0.34, STEEL2, { top: STEEL });
  for (let i = 0; i < 5; i++) g.box(-(r + 0.5) - 0.005, 0.3, -0.12 + i * 0.06, 0.01, 0.2, 0.05, '#2b2f33');
}

function chalkBoard() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 600;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = (sp, left) => {
    const x = c.getContext('2d');
    x.fillStyle = '#1e2a25';
    x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 30; i++) {
      x.strokeStyle = `rgba(230,236,230,${0.03 + (i % 5) * 0.008})`;
      x.lineWidth = 18 + (i % 7) * 6;
      x.beginPath();
      const y = (i * 97) % c.height;
      x.moveTo(-20, y);
      x.quadraticCurveTo(c.width / 2, y + ((i % 3) - 1) * 40, c.width + 20, y + 30);
      x.stroke();
    }
    x.fillStyle = '#f2efe6';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = "700 82px Caveat, 'Courier Prime', cursive";
    x.fillText('Danie dnia', c.width / 2, 74);
    x.strokeStyle = 'rgba(242,239,230,0.85)';
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(70, 124); x.quadraticCurveTo(256, 138, 442, 120); x.stroke();
    x.fillStyle = '#e8c56a';
    x.font = "700 56px Caveat, 'Courier Prime', cursive";
    x.fillText(`ceny ×${MENU_MULT}!`, c.width / 2, 172);
    x.textAlign = 'left';
    sp.forEach((s, i) => {
      const y = 262 + i * 92;
      x.fillStyle = '#f2efe6';
      x.font = "700 66px Caveat, 'Courier Prime', cursive";
      x.fillText(SPECIES[s].name, 98, y);
      x.strokeStyle = 'rgba(242,239,230,0.9)';
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(60, y + 2, 20, 10, 0, 0, Math.PI * 2);
      x.moveTo(80, y + 2); x.lineTo(92, y - 8); x.lineTo(92, y + 12); x.closePath();
      x.stroke();
    });
    x.textAlign = 'center';
    x.fillStyle = 'rgba(242,239,230,0.8)';
    x.font = "600 44px Caveat, 'Courier Prime', cursive";
    x.fillText(`zmiana za ${Math.max(1, Math.ceil(left / 60))} min`, c.width / 2, 556);
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

function seat(models, color, phase) {
  const a = models.buildAvatar(color);
  const part = (n) => a.getObjectByName(n);
  a.updateMatrixWorld(true);
  const hip = new THREE.Vector3();
  part('legL').getWorldPosition(hip);
  for (const s of ['L', 'R']) {
    part('leg' + s).rotation.x = 1.42;
    if (part('shin' + s)) part('shin' + s).rotation.x = -1.42;
    part('arm' + s).rotation.x = 0.7 + (s === 'L' ? phase * 0.15 : 0);
    if (part('forearm' + s)) part('forearm' + s).rotation.x = 1.0;
  }
  part('head').rotation.x = 0.18;
  a.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { a, hipY: hip.y };
}

export function buildSmazalnia(scene, phys, mat, models, structs) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  const W = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(q).add(SMAZ);
  const g = new Geo();
  const dw = DECK.x1 - DECK.x0, dd = DECK.z1 - DECK.z0, dcx = (DECK.x0 + DECK.x1) / 2, dcz = (DECK.z0 + DECK.z1) / 2;
  g.box(dcx, -0.04, dcz, dw, 0.44, dd, '#6f5536', { top: '#9c7b52' });
  const nb = Math.round(dw / 0.2);
  for (let i = 0; i < nb; i++) g.box(DECK.x0 + (i + 0.5) * (dw / nb), 0.185, dcz, dw / nb - 0.018, 0.012, dd - 0.02, ['#a8865c', '#9c7b52', '#b08d62', '#957450'][(i * 3) % 4]);
  kiosk(g);
  table(g, -2.15, -1.75, 0, true);
  table(g, 0.15, -2.15, 0, true);
  aframe(g, 1.3, -2.75, -0.55);
  const lamps = [lantern(g, DECK.x0 + 0.15, 0.18, DECK.z0 + 0.15, 2.5, 0.45, -Math.PI / 4)];
  const mesh = new THREE.Mesh(g.geometry({ ao: 0.5 }), mat);
  mesh.position.copy(SMAZ);
  mesh.quaternion.copy(q);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const sign = textPlane('SMAŻALNIA RYB', 3.6, 0.62, { bg: '#ece6d8', ink: '#2c4a6e', size: 96, painted: true });
  sign.position.set(0, KH + 0.34, KZ - KD / 2 - 0.37);
  sign.rotation.y = Math.PI;
  const signBack = new Geo();
  signBack.box(0, KH + 0.34, KZ - KD / 2 - 0.33, 3.72, 0.74, 0.06, NAVY2);
  for (const sx of [-1.3, 1.3]) signBack.box(sx, KH + 0.12, KZ - KD / 2 - 0.3, 0.06, 0.3, 0.06, NAVY2);
  const sbm = new THREE.Mesh(signBack.geometry(), mat);
  mesh.add(sbm, sign);

  const board = chalkBoard();
  const bmat = new THREE.MeshLambertMaterial({ map: board.tex });
  const wallBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.15), bmat);
  wallBoard.position.set(-1.12, 1.55, KZ - KD / 2 - 0.047);
  wallBoard.rotation.y = Math.PI;
  const frame = new Geo();
  frame.box(-1.12, 1.55, KZ - KD / 2 - 0.02, 1.08, 1.25, 0.03, '#6f5536');
  mesh.add(new THREE.Mesh(frame.geometry(), mat), wallBoard);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.73), bmat);
    const fr = new THREE.Object3D();
    fr.position.set(1.3, 0.18, -2.75);
    fr.rotation.y = -0.55;
    const tilt = new THREE.Object3D();
    tilt.position.set(0, 0, s * 0.2);
    tilt.rotation.x = -s * 0.2;
    p.position.set(0, 0.62, s * 0.025);
    p.rotation.y = s > 0 ? 0 : Math.PI;
    tilt.add(p);
    fr.add(tilt);
    mesh.add(fr);
  }

  const fishMat = new THREE.MeshLambertMaterial({ color: '#c48a3a', flatShading: true });
  const plateMat = new THREE.MeshLambertMaterial({ color: '#f2efe6' });
  const plateGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.02, 12);
  const kinds = ['ploc', 'okon', 'leszcz', 'karp'];
  const plates = [[-2.45, -1.95], [-1.85, -1.55], [0.4, -2.25], [-0.2, -2.0], [0.2, 0.05], [0.8, 0.05]];
  plates.forEach(([px, pz], i) => {
    const y = i >= 4 ? 1.035 : 0.955;
    const pl = new THREE.Mesh(plateGeo, plateMat);
    pl.position.set(px, y, pz);
    mesh.add(pl);
    const f = new THREE.Mesh(models.fishGeometry(kinds[i % kinds.length]), fishMat);
    f.scale.setScalar(0.24);
    f.position.set(px, y + 0.035, pz);
    f.rotation.set(Math.PI / 2, 0, 0.6 + i * 1.3);
    mesh.add(f);
  });

  const diners = [];
  if (models.buildAvatar) {
    for (const [i, col, dx, side] of [[0, '#2a8f86', -2.45, 1], [1, '#d9a43a', -1.85, -1]]) {
      const { a, hipY } = seat(models, col, i);
      a.position.set(dx, 0.18 + 0.47 - hipY, -1.75 + side * 0.62);
      a.rotation.y = side > 0 ? 0 : Math.PI;
      mesh.add(a);
      diners.push(a);
    }
  }

  const R = phys.R;
  const body = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(SMAZ.x, SMAZ.y, SMAZ.z).setRotation(q));
  const box = (hx, hy, hz, x, y, z, fr = 0.7) => phys.makeCollider({ t: 'box', hx, hy, hz, pos: [x, y, z], quat: [0, 0, 0, 1], fr }, body);
  box(dw / 2, 0.11, dd / 2, dcx, 0.07, dcz);
  box(KW / 2, KH / 2, KD / 2, 0, KH / 2 + 0.18, KZ);
  box(1.0, 0.04, 0.24, 0.53, 0.98, KZ - KD / 2 - 0.2);
  for (const [tx, tz] of [[-2.15, -1.75], [0.15, -2.15]]) {
    box(0.8, 0.4, 0.36, tx, 0.58, tz);
    for (const s of [-1, 1]) box(0.8, 0.24, 0.13, tx, 0.42, tz + s * 0.6);
    box(0.04, 1.2, 0.04, tx, 1.4, tz);
  }
  box(0.4, 0.55, 0.3, 1.3, 0.72, -2.75);

  const hq = new THREE.Vector3(HOP.x, 0, HOP.z).applyQuaternion(q).add(SMAZ);
  hq.y = Math.max(islandHeight(hq.x, hq.z), SMAZ.y - 0.05);
  const hg = new Geo();
  hopper(hg);
  const hm = new THREE.Mesh(hg.geometry({ ao: 0.3 }), mat);
  hm.position.copy(hq);
  hm.quaternion.copy(q);
  hm.castShadow = true;
  hm.receiveShadow = true;
  scene.add(hm);
  const hb = phys.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(hq.x, hq.y, hq.z).setRotation(q));
  const slope = Math.atan2(HOP.rim - HOP.neck, HOP.r - HOP.out);
  const len = Math.hypot(HOP.rim - HOP.neck, HOP.r - HOP.out) + 0.06;
  const mid = (HOP.r + HOP.out) / 2, midY = (HOP.rim + HOP.neck) / 2;
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = Math.atan2(nz, nx);
    const wq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), slope));
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(wq);
    const c = new THREE.Vector3(nx * mid, midY, nz * mid).addScaledVector(n, -0.03);
    phys.makeCollider({ t: 'box', hx: len / 2, hy: 0.03, hz: HOP.r + 0.05, pos: [c.x, c.y, c.z], quat: [wq.x, wq.y, wq.z, wq.w], fr: 0.2 }, hb);
    phys.makeCollider({ t: 'box', hx: 0.025, hy: HOP.rim / 2, hz: HOP.r + 0.05, pos: [nx * (HOP.r + 0.03) + (nz ? 0 : 0), HOP.rim / 2, nz * (HOP.r + 0.03)], quat: nz ? [0, Math.SQRT1_2, 0, Math.SQRT1_2] : [0, 0, 0, 1], fr: 0.4 }, hb);
  }
  phys.makeCollider({ t: 'box', hx: 0.25, hy: 0.13, hz: 0.17, pos: [-(HOP.r + 0.25), 0.3, 0], quat: [0, 0, 0, 1] }, hb);
  const sensor = R.ColliderDesc.cuboid(HOP.out + 0.08, 0.09, HOP.out + 0.08).setTranslation(0, HOP.neck + 0.05, 0).setSensor(true)
    .setCollisionGroups(groups(G.SENSOR, G.FISH)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
  const sc = phys.world.createCollider(sensor, hb);
  phys.zoneOf.set(sc.handle, { kind: 'sell', tag: 'smazalnia', handle: sc.handle, col: sc, body: hb });

  if (structs && structs.arrow) structs.arrow('SMAŻALNIA', W(0, 0, -3.5), 1.65);
  const footprint = { ...W(dcx, 0, dcz), w: dw + 0.2, l: dd + 0.2, yaw: YAW };
  const blobs = [
    { x: footprint.x, y: SMAZ.y, z: footprint.z, w: dw, l: dd, yaw: YAW },
    { x: hq.x, y: hq.y, z: hq.z, w: HOP.r * 2.2, l: HOP.r * 2.2, yaw: YAW },
  ];
  return {
    pos: hq.clone(),
    top: hq.y + HOP.rim,
    r: HOP.r,
    body: hb,
    kiosk: body,
    front: W(0.5, 1.0, -0.6),
    chimney: W(0.95, KHB + 0.8, 1.95),
    lamps: lamps.map((p) => p.applyQuaternion(q).add(SMAZ)),
    footprint: { x: footprint.x, z: footprint.z, w: footprint.w, l: footprint.l, yaw: YAW },
    hopperShape: { x: hq.x, z: hq.z, r: HOP.r + 0.2 },
    blobs,
    diners,
    board,
  };
}
