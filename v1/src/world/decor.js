// Rybna Wyspa: deterministic island dressing (riverside trees on the rim, a reed belt along the waterline, lilies in the coves, rocks, logs, the pier with its lantern and the boat).

import * as THREE from 'three';
import { coastDist, beachiness, islandHeight, SPOTS } from './island.js';
import { rng } from '../util.js';
import { G, groups } from '../sim/physics.js';
import { Geo } from '../render/geo.js';
import { lantern } from './structures.js';

const KEEP_CLEAR = 15;

function coastPoint(a, s) {
  let lo = 0, hi = 60;
  const cx = Math.cos(a), cz = Math.sin(a);
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (coastDist(cx * mid, cz * mid) > s) lo = mid; else hi = mid;
  }
  return { x: cx * lo, z: cz * lo };
}

function nearPier(x, z) {
  return Math.abs(x - SPOTS.pier.x) < 4.5 && z < -14;
}

export function buildDecor(scene, phys, models, mat, blockMat) {
  const r = rng(2024);
  const place = new Map();
  const add = (id, x, z, s = 1, ry = 0, y) => {
    if (!place.has(id)) place.set(id, []);
    place.get(id).push({ x, y: y ?? islandHeight(x, z), z, s, ry });
  };

  const STEPS = 150;
  const conc = [];
  for (let i = 0; i < STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    const p0 = coastPoint(a, 0), pm = coastPoint(a - 0.12, 0), pp = coastPoint(a + 0.12, 0);
    conc.push(Math.hypot(p0.x, p0.z) - (Math.hypot(pm.x, pm.z) + Math.hypot(pp.x, pp.z)) / 2);
  }
  const coves = conc.map((c, i) => ({ c, i })).sort((u, v) => u.c - v.c);
  const coveA = [];
  for (const cv of coves) {
    const a = (cv.i / STEPS) * Math.PI * 2;
    if (coveA.every((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > 0.9)) coveA.push(a);
    if (coveA.length >= 3) break;
  }

  for (let i = 0; i < STEPS * 2; i++) {
    const a = (i / (STEPS * 2)) * Math.PI * 2 + (r() - 0.5) * 0.01;
    const w = coastPoint(a, -0.6 - r() * 1.1);
    const b = beachiness(w.x, w.z);
    if (nearPier(w.x, w.z)) continue;
    const gap = Math.sin(a * 5.3 + 1.1) + Math.sin(a * 11.7) * 0.5;
    if (b > 0.55 && r() < 0.8) continue;
    if (gap < -0.9) continue;
    if (r() < 0.62) add(r() < 0.72 ? 'reeds' : 'cattail', w.x + (r() - 0.5) * 0.6, w.z + (r() - 0.5) * 0.6, 0.75 + r() * 0.45, r() * 6.28, -0.05);
  }

  for (const a0 of coveA) {
    for (let k = 0; k < 9; k++) {
      const a = a0 + (r() - 0.5) * 0.28;
      const w = coastPoint(a, -2.6 - r() * 3.5);
      if (nearPier(w.x, w.z)) continue;
      add('lily', w.x, w.z, 0.75 + r() * 0.45, r() * 6.28, 0.012);
    }
  }

  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const w = coastPoint(a, 1.6 + r() * 2.4);
    if (Math.hypot(w.x, w.z) < KEEP_CLEAR || nearPier(w.x, w.z)) continue;
    const b = beachiness(w.x, w.z);
    if (r() < 0.45) {
      let t = b > 0.5 ? (r() < 0.45 ? 'willow_weeping' : 'bush') : ['alder', 'birch', 'willow_weeping', 'birch', 'bush', 'alder_row'][Math.floor(r() * 6)];
      if (t === 'willow_weeping' && (place.get('willow_weeping') || []).length >= 4) t = r() < 0.5 ? 'birch' : 'bush';
      const near = (place.get(t) || []).concat(place.get('alder') || [], place.get('birch') || [], place.get('willow_weeping') || [], place.get('alder_row') || []);
      if (near.some((o) => Math.hypot(o.x - w.x, o.z - w.z) < 5)) continue;
      add(t, w.x, w.z, t === 'bush' ? 0.7 + r() * 0.4 : t === 'willow_weeping' ? 0.62 + r() * 0.2 : 0.7 + r() * 0.3, r() * 6.28);
    }
  }

  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, d = 6 + r() * 30;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const s = coastDist(x, z);
    if (nearPier(x, z)) continue;
    if (s > 0.3 && s < 2.6 && r() < 0.025) add(['rock_s', 'rock_m', 'rock_l'][Math.floor(r() * 3)], x, z, 0.6 + r() * 0.4, r() * 6.28);
    else if (s > 2.2 && s < 6 && Math.hypot(x, z) > KEEP_CLEAR && r() < 0.09) add(r() < 0.6 ? 'grass' : 'flowers', x, z, 0.8 + r() * 0.5, r() * 6.28);
    else if (s > 2 && s < 4 && Math.hypot(x, z) > KEEP_CLEAR && r() < 0.01) add(r() < 0.5 ? 'log' : 'stump', x, z, 1, r() * 6.28);
  }

  let bestA = 0, bestB = -1;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const w = coastPoint(a, 0.6);
    const b = beachiness(w.x, w.z) - (Math.sin(a) < 0 ? 0.5 : 0);
    if (b > bestB) { bestB = b; bestA = a; }
  }
  const bp = coastPoint(bestA, 0.9);
  add('boat', bp.x, bp.z, 1, -bestA + Math.PI / 2 + 0.3, islandHeight(bp.x, bp.z) + 0.05);

  let pz = -12;
  while (coastDist(SPOTS.pier.x, pz) > 0.5 && pz > -60) pz -= 0.5;
  for (let k = 0; k < 3; k++) add('pier', SPOTS.pier.x, pz - 1.5 - k * 4, 1, 0, 1.0);
  add('boat', SPOTS.pier.x + 2.6, pz - 9, 1, 0.2, 0.02);
  SPOTS.pier.set(SPOTS.pier.x, 1.6, pz - 6);
  const lg = new Geo();
  const lampPos = lantern(lg, SPOTS.pier.x + 0.85, 1.66, pz - 11.2, 2.5, 0.5, Math.PI);
  if (blockMat) {
    const lm = new THREE.Mesh(lg.geometry(), blockMat);
    lm.castShadow = true;
    scene.add(lm);
  }

  const meshes = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const R = phys.R;
  const body = phys.world.createRigidBody(R.RigidBodyDesc.fixed());
  for (const [id, list] of place) {
    let geo;
    try { geo = models.decoGeometry(id); } catch (e) { continue; }
    if (!geo) continue;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      p.set(it.x, it.y, it.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.ry);
      sc.setScalar(it.s);
      mesh.setMatrixAt(i, m4.compose(p, q, sc));
      if (['willow', 'willow_weeping', 'birch', 'alder', 'alder_row', 'pine', 'stump'].includes(id)) {
        phys.world.createCollider(R.ColliderDesc.cylinder(1.5 * it.s, 0.24 * it.s).setTranslation(it.x, it.y + 1.5 * it.s, it.z).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER)), body);
      } else if (id.startsWith('rock')) {
        const rr = (id === 'rock_s' ? 0.35 : id === 'rock_m' ? 0.7 : 1.2) * it.s;
        phys.world.createCollider(R.ColliderDesc.ball(rr).setTranslation(it.x, it.y + rr * 0.2, it.z).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER)), body);
      } else if (id === 'pier') {
        phys.world.createCollider(R.ColliderDesc.cuboid(1, 0.06, 2).setTranslation(it.x, it.y + 0.6, it.z).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER)), body);
      } else if (id === 'log') {
        phys.world.createCollider(R.ColliderDesc.cuboid(0.9 * it.s, 0.2 * it.s, 0.2 * it.s).setTranslation(it.x, it.y + 0.2 * it.s, it.z).setRotation(q).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER)), body);
      }
    });
    mesh.castShadow = !['grass', 'flowers', 'lily', 'reeds', 'cattail'].includes(id);
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
    meshes.push(mesh);
  }
  const blobs = [];
  for (const [id, list] of place) {
    const r = { willow: 1.6, willow_weeping: 2.1, birch: 1.2, alder: 1.5, alder_row: 2.6, pine: 1.4, bush: 1.0, stump: 0.6, rock_l: 1.2, rock_m: 0.75, log: 0.8 }[id];
    if (r) for (const it of list) if (it.y > 0.2) blobs.push({ x: it.x, y: it.y, z: it.z, r: r * it.s });
  }
  return { meshes, lampPos, lamps: [lampPos], blobs, count: [...place.values()].reduce((a, l) => a + l.length, 0) };
}
