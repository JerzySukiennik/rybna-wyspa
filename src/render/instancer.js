// Rybna Wyspa: growable keyed InstancedMesh (swap-remove, optional per-instance attributes).

import * as THREE from 'three';

export class Instancer {
  constructor(scene, geometry, material, o = {}) {
    this.scene = scene;
    this.geometry = geometry.clone();
    this.material = material;
    this.cap = o.cap || 16;
    this.attrs = o.attrs || {};
    this.shadow = o.shadow ?? true;
    this.receive = o.receive ?? true;
    this.cull = o.cull ?? true;
    this.keys = [];
    this.index = new Map();
    this.build();
  }

  build(old) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.cap);
    mesh.count = 0;
    mesh.castShadow = this.shadow;
    mesh.receiveShadow = this.receive;
    mesh.frustumCulled = this.cull;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const [name, size] of Object.entries(this.attrs)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      mesh.geometry.setAttribute(name, a);
    }
    if (old) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, this.keys.length * 16));
      for (const [name, size] of Object.entries(this.attrs)) {
        const src = old.geometry.attributes[name].array;
        mesh.geometry.attributes[name].array.set(src.subarray(0, Math.min(src.length, this.keys.length * size)));
      }
      mesh.count = this.keys.length;
      this.scene.remove(old);
      old.dispose();
    }
    this.mesh = mesh;
    this.scene.add(mesh);
  }

  add(key, matrix) {
    if (this.index.has(key)) { this.set(key, matrix); return this.index.get(key); }
    if (this.keys.length >= this.cap) {
      this.cap *= 2;
      this.geometry = this.geometry.clone();
      this.build(this.mesh);
    }
    const i = this.keys.length;
    this.keys.push(key);
    this.index.set(key, i);
    this.mesh.count = this.keys.length;
    if (matrix) this.mesh.setMatrixAt(i, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    return i;
  }

  remove(key) {
    const i = this.index.get(key);
    if (i === undefined) return;
    const last = this.keys.length - 1;
    if (i !== last) {
      const lk = this.keys[last];
      this.keys[i] = lk;
      this.index.set(lk, i);
      const m = this.mesh.instanceMatrix.array;
      m.copyWithin(i * 16, last * 16, last * 16 + 16);
      for (const [name, size] of Object.entries(this.attrs)) {
        const a = this.mesh.geometry.attributes[name];
        a.array.copyWithin(i * size, last * size, last * size + size);
        a.needsUpdate = true;
      }
    }
    this.keys.pop();
    this.index.delete(key);
    this.mesh.count = this.keys.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  set(key, matrix) {
    const i = this.index.get(key);
    if (i === undefined) return;
    this.mesh.setMatrixAt(i, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  attr(key, name, values) {
    const i = this.index.get(key);
    if (i === undefined) return;
    const a = this.mesh.geometry.attributes[name];
    const size = a.itemSize;
    for (let k = 0; k < size; k++) a.array[i * size + k] = values[k];
    a.needsUpdate = true;
  }

  bounds() {
    if (this.cull && this.keys.length) this.mesh.computeBoundingSphere();
  }

  clear() {
    this.keys = [];
    this.index.clear();
    this.mesh.count = 0;
  }
}
