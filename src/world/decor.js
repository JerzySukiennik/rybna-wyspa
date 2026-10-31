// Rybna Wyspa: deterministic placement of trees, reeds, rocks, lilies, the pier and the boat around the island.

import * as THREE from 'three';
import { coastDist, islandHeight, SPOTS } from './island.js';
import { rng } from '../util.js';
import { G, groups } from '../sim/physics.js';

const KEEP_CLEAR = 15;

export function buildDecor(scene, phys, models, mat) {
  const r = rng(2024);
  const place = new Map();
  const add = (id, x, z, s = 1, ry = 0, y) => {
    if (!place.has(id)) place.set(id, []);
    place.get(id).push({ x, y: y ?? islandHeight(x, z), z, s, ry });
  };
  for (let i = 0; i < 1400; i++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 34;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const s = coastDist(x, z);
    const fromC = Math.hypot(x, z);
    if (s > 1.2 && s < 3.6 && r() < 0.05) add(['willow', 'birch', 'alder', 'pine', 'willow'][Math.floor(r() * 5)], x, z, 0.65 + r() * 0.45, r() * 6.28);
    else if (s > 1 && s < 4.5 && fromC > KEEP_CLEAR && r() < 0.05) add('bush', x, z, 0.6 + r() * 0.5, r() * 6.28);
    else if (s > -2.5 && s < 0.4 && r() < 0.3) add(r() < 0.6 ? 'reeds' : 'cattail', x, z, 0.8 + r() * 0.5, r() * 6.28);
    else if (s > -10 && s < -3 && r() < 0.1) add('lily', x, z, 0.8 + r() * 0.5, r() * 6.28, 0.01);
    else if (s > 0.2 && s < 3 && r() < 0.04) add(['rock_s', 'rock_m', 'rock_l'][Math.floor(r() * 3)], x, z, 0.7 + r() * 0.4, r() * 6.28);
    else if (s > 3.5 && s < 7 && r() < 0.12) add(r() < 0.5 ? 'grass' : 'flowers', x, z, 0.8 + r() * 0.5, r() * 6.28);
    else if (s > 2 && s < 4 && r() < 0.012) add(r() < 0.5 ? 'log' : 'stump', x, z, 1, r() * 6.28);
  }
  let pz = -12;
  while (coastDist(SPOTS.pier.x, pz) > 0.5 && pz > -60) pz -= 0.5;
  for (let k = 0; k < 3; k++) add('pier', SPOTS.pier.x, pz - 1.5 - k * 4, 1, 0, 1.0);
  add('boat', SPOTS.pier.x + 2.6, pz - 9, 1, 0.2, 0.02);
  SPOTS.pier.set(SPOTS.pier.x, 1.6, pz - 6);

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
      if (['willow', 'birch', 'alder', 'pine', 'stump'].includes(id)) {
        phys.world.createCollider(R.ColliderDesc.cylinder(1.5 * it.s, 0.22 * it.s).setTranslation(it.x, it.y + 1.5 * it.s, it.z).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER)), body);
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
  return { meshes, count: [...place.values()].reduce((a, l) => a + l.length, 0) };
}
