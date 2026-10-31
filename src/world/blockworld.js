// Rybna Wyspa: placed blocks on the island (visual instances, static physics, effect zones, spawner timers, connection ports).

import * as THREE from 'three';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { blockVisual, blockPhysics } from '../blocks/defs.js';
import { Instancer } from '../render/instancer.js';
import { blockMaterial, stripMaterial, flumeWaterMaterial } from '../render/materials.js';

const E = new THREE.Euler();
const Y = new THREE.Vector3(0, 1, 0);

export function blockTransform(rec, pos = new THREE.Vector3(), quat = new THREE.Quaternion()) {
  pos.set(rec.x, rec.y, rec.z);
  quat.setFromEuler(E.set(rec.rp || 0, rec.ry || 0, rec.rr || 0, 'YXZ'));
  return { pos, quat };
}

export class BlockWorld {
  constructor(scene, phys) {
    this.scene = scene;
    this.phys = phys;
    this.blocks = new Map();
    this.views = new Map();
    this.byBody = new Map();
    this.mat = blockMaterial();
    this.dirtyBounds = new Set();
    this.popping = new Set();
    this.onAdd = null;
    this.onRemove = null;
  }

  viewFor(type) {
    if (this.views.has(type)) return this.views.get(type);
    const vis = blockVisual(type);
    const def = BLOCK_BY_ID[type];
    const v = { body: new Instancer(this.scene, vis.body, this.mat) };
    if (vis.strip) v.strip = new Instancer(this.scene, vis.strip, stripMaterial(def.speed || 1.7), { shadow: false });
    if (vis.water) v.water = new Instancer(this.scene, vis.water, flumeWaterMaterial(def.speed || 2.4), { shadow: false, receive: false });
    this.views.set(type, v);
    return v;
  }

  set(id, rec) {
    if (!rec) return this.remove(id);
    const def = BLOCK_BY_ID[rec.t];
    if (!def) return;
    const prev = this.blocks.get(id);
    if (prev && prev.rec.t === rec.t && prev.rec.x === rec.x && prev.rec.y === rec.y && prev.rec.z === rec.z && (prev.rec.ry || 0) === (rec.ry || 0) && (prev.rec.rp || 0) === (rec.rp || 0)) { prev.rec = rec; return prev; }
    if (this.blocks.has(id)) this.remove(id, true);
    const { pos, quat } = blockTransform(rec);
    const mat = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
    const inv = mat.clone().invert();
    const v = this.viewFor(rec.t);
    v.body.add(id, mat);
    if (v.strip) v.strip.add(id, mat);
    if (v.water) v.water.add(id, mat);
    this.dirtyBounds.add(rec.t);
    const phys = blockPhysics(rec.t);
    const prec = this.phys.addBlock(id, phys, pos, quat, { type: rec.t });
    this.byBody.set(prec.body.handle, id);
    for (const z of prec.zones) {
      const zq = new THREE.Quaternion(z.quat[0], z.quat[1], z.quat[2], z.quat[3]);
      const wq = quat.clone().multiply(zq);
      z.qW = quat.clone();
      z.dirW = new THREE.Vector3(0, 0, -1).applyQuaternion(wq);
      z.upW = new THREE.Vector3(0, 1, 0).applyQuaternion(wq);
      z.inv = inv;
    }
    const b = { id, rec, def, pos, quat, mat, inv, phys, zones: prec.zones, timer: Math.random() * (def.every || 1), cool: 0, pulse: 0 };
    if (phys.spawn) {
      b.outlet = new THREE.Vector3(...phys.spawn.outlet).applyMatrix4(mat);
      b.vel = new THREE.Vector3(...phys.spawn.vel).applyQuaternion(quat);
    }
    b.ports = phys.ports.map((p) => ({
      io: p.io,
      p: new THREE.Vector3(...p.p).applyMatrix4(mat),
      d: new THREE.Vector3(...p.d).applyQuaternion(quat).normalize(),
    }));
    this.blocks.set(id, b);
    if (this.onAdd) this.onAdd(b);
    return b;
  }

  remove(id, silent) {
    const b = this.blocks.get(id);
    if (!b) return;
    const v = this.views.get(b.rec.t);
    v.body.remove(id);
    if (v.strip) v.strip.remove(id);
    if (v.water) v.water.remove(id);
    this.dirtyBounds.add(b.rec.t);
    const zones = this.phys.removeBlock(id);
    for (const [h, bid] of this.byBody) if (bid === id) this.byBody.delete(h);
    this.blocks.delete(id);
    if (this.onRemove && !silent) this.onRemove(b, zones);
    return zones;
  }

  clear() {
    for (const id of [...this.blocks.keys()]) this.remove(id);
  }

  blockAtCollider(col) {
    if (!col) return null;
    const body = col.parent();
    if (!body) return null;
    const id = this.byBody.get(body.handle);
    return id ? this.blocks.get(id) : null;
  }

  pop(id) {
    const b = this.blocks.get(id);
    if (b) { b.popT = 0; this.popping.add(b); }
  }

  frame(dt = 0) {
    for (const b of this.popping) {
      const v = this.views.get(b.rec.t);
      if (!this.blocks.has(b.id) || !v) { this.popping.delete(b); continue; }
      b.popT += dt;
      const t = Math.min(1, b.popT / 0.34);
      const s = t >= 1 ? 1 : 1 - 0.22 * (1 - t) * (1 - t) * Math.cos(t * 9);
      const m = t >= 1 ? b.mat : new THREE.Matrix4().compose(b.pos, b.quat, new THREE.Vector3(s, s, s));
      v.body.set(b.id, m);
      if (v.strip) v.strip.set(b.id, m);
      if (v.water) v.water.set(b.id, m);
      if (t >= 1) this.popping.delete(b);
    }
    for (const t of this.dirtyBounds) {
      const v = this.views.get(t);
      if (!v) continue;
      v.body.bounds();
      if (v.strip) v.strip.bounds();
      if (v.water) v.water.bounds();
    }
    this.dirtyBounds.clear();
  }

  spawners() {
    const out = [];
    for (const b of this.blocks.values()) if (b.def.kind === 'spawner') out.push(b);
    return out;
  }

  nearPort(p, io, maxD, skipId) {
    let best = null, bd = maxD * maxD;
    for (const b of this.blocks.values()) {
      if (b.id === skipId) continue;
      for (const port of b.ports) {
        if (port.io !== io) continue;
        const d = port.p.distanceToSquared(p);
        if (d < bd) { bd = d; best = { b, port }; }
      }
    }
    return best;
  }
}

export { Y };
