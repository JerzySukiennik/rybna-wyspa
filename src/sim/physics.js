// Rybna Wyspa: Rapier world, static colliders for the island and blocks, sensor zones and collision groups.

import RAPIER from 'rapier';
import * as THREE from 'three';

export const G = { WORLD: 1, FISH: 2, PLAYER: 4, SENSOR: 8 };
export const groups = (member, filter) => (member << 16) | filter;
export const GRAVITY = 12;

let ready = null;
export function initRapier() {
  if (!ready) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}

export class Physics {
  constructor(R) {
    this.R = R;
    this.world = new R.World({ x: 0, y: -GRAVITY, z: 0 });
    this.world.timestep = 1 / 60;
    this.world.integrationParameters.numSolverIterations = 4;
    this.events = new R.EventQueue(true);
    this.blocks = new Map();
    this.zoneOf = new Map();
    this.onZone = null;
  }

  addIsland(collider) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed());
    const cd = R.ColliderDesc.trimesh(collider.vertices, collider.indices).setFriction(0.8).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER));
    this.world.createCollider(cd, body);
    this.island = body;
  }

  addStatic(list, pos, quat, tag) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z).setRotation(quat));
    for (const c of list) this.makeCollider(c, body);
    if (tag) this.blocks.set(tag, { body, zones: [] });
    return body;
  }

  makeCollider(c, body) {
    const R = this.R;
    let cd;
    if (c.t === 'box') cd = R.ColliderDesc.cuboid(c.hx, c.hy, c.hz);
    else if (c.t === 'hull') cd = R.ColliderDesc.convexHull(new Float32Array(c.pts));
    else if (c.t === 'ball') cd = R.ColliderDesc.ball(c.r);
    else if (c.t === 'cyl') cd = R.ColliderDesc.cylinder(c.hh, c.r);
    if (!cd) return null;
    cd.setTranslation(c.pos[0], c.pos[1], c.pos[2]).setRotation({ x: c.quat[0], y: c.quat[1], z: c.quat[2], w: c.quat[3] });
    cd.setFriction(c.fr ?? 0.7).setRestitution(0.05).setCollisionGroups(groups(G.WORLD, G.FISH | G.PLAYER));
    return this.world.createCollider(cd, body);
  }

  addBlock(tag, phys, pos, quat, meta) {
    const R = this.R;
    const body = this.addStatic(phys.col, pos, quat, tag);
    const rec = this.blocks.get(tag);
    for (const z of phys.zones) {
      const cd = R.ColliderDesc.cuboid(z.hx, z.hy, z.hz)
        .setTranslation(z.pos[0], z.pos[1], z.pos[2])
        .setRotation({ x: z.quat[0], y: z.quat[1], z: z.quat[2], w: z.quat[3] })
        .setSensor(true)
        .setCollisionGroups(groups(G.SENSOR, G.FISH))
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(R.ActiveCollisionTypes.DEFAULT | R.ActiveCollisionTypes.KINEMATIC_FIXED);
      const col = this.world.createCollider(cd, body);
      const zrec = { ...z, tag, meta, col, body, handle: col.handle };
      rec.zones.push(zrec);
      this.zoneOf.set(col.handle, zrec);
    }
    return rec;
  }

  removeBlock(tag) {
    const rec = this.blocks.get(tag);
    if (!rec) return [];
    const zones = rec.zones;
    for (const z of zones) this.zoneOf.delete(z.handle);
    this.world.removeRigidBody(rec.body);
    this.blocks.delete(tag);
    return zones;
  }

  step(onEvent) {
    this.world.step(this.events);
    this.events.drainCollisionEvents((h1, h2, started) => {
      const z1 = this.zoneOf.get(h1), z2 = this.zoneOf.get(h2);
      if (z1 && !z2) onEvent(z1, h2, started);
      else if (z2 && !z1) onEvent(z2, h1, started);
    });
  }
}

export const tmpV = new THREE.Vector3();
export const tmpQ = new THREE.Quaternion();
