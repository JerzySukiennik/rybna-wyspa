// Rybna Wyspa: renders block and fish thumbnails once through the main renderer into data URLs.

import * as THREE from 'three';
import { blockVisual } from '../blocks/defs.js';
import { blockMaterial, stripMaterial, flumeWaterMaterial } from './materials.js';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { SPECIES } from '../data/species.js';

const S = 128;

export class Icons {
  constructor(renderer, models) {
    this.r = renderer;
    this.models = models;
    this.cache = new Map();
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f7a', 1.4));
    const d = new THREE.DirectionalLight('#fff6e8', 2.2);
    d.position.set(3, 5, 4);
    this.scene.add(d);
    this.cam = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    this.rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.buf = new Uint8Array(S * S * 4);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = S;
    this.ctx = this.canvas.getContext('2d');
    this.mat = blockMaterial();
    this.fishMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  }

  shoot(group, dir) {
    const box = new THREE.Box3().setFromObject(group);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = size / (2 * Math.tan((this.cam.fov * Math.PI) / 360)) * 1.02;
    this.cam.position.copy(c).addScaledVector(dir.clone().normalize(), dist);
    this.cam.near = dist / 50;
    this.cam.far = dist * 4;
    this.cam.updateProjectionMatrix();
    this.cam.lookAt(c);
    this.scene.add(group);
    const prevRT = this.r.getRenderTarget();
    const prevClear = this.r.getClearAlpha();
    this.r.setRenderTarget(this.rt);
    this.r.setClearColor(0x000000, 0);
    this.r.clear();
    this.r.render(this.scene, this.cam);
    this.r.readRenderTargetPixels(this.rt, 0, 0, S, S, this.buf);
    this.r.setRenderTarget(prevRT);
    this.r.setClearAlpha(prevClear);
    this.scene.remove(group);
    const img = this.ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) img.data.set(this.buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    this.ctx.putImageData(img, 0, 0);
    return this.canvas.toDataURL('image/png');
  }

  block(id) {
    const key = 'b:' + id;
    if (this.cache.has(key)) return this.cache.get(key);
    const vis = blockVisual(id);
    const def = BLOCK_BY_ID[id];
    const g = new THREE.Group();
    g.add(new THREE.Mesh(vis.body, this.mat));
    if (vis.strip) g.add(new THREE.Mesh(vis.strip, stripMaterial(def.speed || 1.7)));
    if (vis.water) g.add(new THREE.Mesh(vis.water, flumeWaterMaterial(def.speed || 2.4)));
    const url = this.shoot(g, new THREE.Vector3(1.1, 0.95, 1.3));
    this.cache.set(key, url);
    return url;
  }

  fish(sp) {
    const key = 'f:' + sp;
    if (this.cache.has(key)) return this.cache.get(key);
    const geo = this.models.fishGeometry(SPECIES[sp].id);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, this.fishMat);
    m.rotation.y = -0.25;
    g.add(m);
    const url = this.shoot(g, new THREE.Vector3(0.05, 0.12, 1));
    this.cache.set(key, url);
    return url;
  }
}
