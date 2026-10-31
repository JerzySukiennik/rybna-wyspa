// Rybna Wyspa: pooled particles (splashes, sparkles, smoke, fire, zaps, bubbles) and floating money popups.

import * as THREE from 'three';
import { U } from './materials.js';
import { fmtZl } from '../util.js';
import { TRAITS } from '../data/traits.js';

const MAX = 2400;

const PV = /* glsl */`
attribute vec4 aCol;
attribute float aSize;
varying vec4 vCol;
uniform float uScale;
void main() {
  vCol = aCol;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(64.0, aSize * uScale / max(0.5, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;

const PF = /* glsl */`
varying vec4 vCol;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  gl_FragColor = vec4(vCol.rgb, vCol.a * smoothstep(0.5, 0.18, r));
}`;

const FX = {
  splash: { col: '#dff6ff', size: 0.16, life: 0.7, g: -9, spread: 2.2, up: 2.6, add: false },
  sparkle: { col: '#fff7c2', size: 0.09, life: 0.6, g: 0, spread: 0.4, up: 0.3, add: true },
  smoke: { col: '#9b9690', size: 0.28, life: 1.4, g: 0.6, spread: 0.2, up: 0.5, add: false },
  fire: { col: '#ffa23a', size: 0.16, life: 0.55, g: 1.6, spread: 0.25, up: 0.9, add: true },
  ember: { col: '#ff7a1a', size: 0.06, life: 0.9, g: 0.8, spread: 0.3, up: 0.7, add: true },
  zap: { col: '#9fe6ff', size: 0.07, life: 0.22, g: 0, spread: 2.4, up: 0.2, add: true },
  bubbles: { col: '#c8ff7a', size: 0.08, life: 0.9, g: 0.7, spread: 0.15, up: 0.5, add: false },
  motes: { col: '#9dff4a', size: 0.06, life: 1.2, g: 0.25, spread: 0.3, up: 0.25, add: true },
  stars: { col: '#e2c8ff', size: 0.07, life: 0.8, g: 0, spread: 0.4, up: 0.2, add: true },
  snow: { col: '#ffffff', size: 0.07, life: 1.0, g: -0.6, spread: 0.3, up: 0.3, add: false },
  drips: { col: '#9fdcff', size: 0.05, life: 0.5, g: -6, spread: 0.1, up: 0, add: false },
  glint: { col: '#fff0b0', size: 0.1, life: 0.3, g: 0, spread: 0.05, up: 0, add: true },
  clover: { col: '#5fd068', size: 0.08, life: 0.8, g: 0.3, spread: 0.3, up: 0.3, add: false },
  field: { col: '#ff8be6', size: 0.06, life: 0.6, g: 0, spread: 0.6, up: 0, add: true },
  wind: { col: '#e8f3ff', size: 0.06, life: 0.5, g: 0, spread: 1.4, up: 0.1, add: false },
  coin: { col: '#ffd23a', size: 0.12, life: 0.9, g: -7, spread: 1.6, up: 3.4, add: false },
  dust: { col: '#d9c9a0', size: 0.18, life: 0.6, g: -1, spread: 0.9, up: 0.6, add: false },
  rocket: { col: '#ffc46b', size: 0.22, life: 0.5, g: -2, spread: 0.3, up: -2.5, add: true },
  glitch: { col: '#3ff2e4', size: 0.1, life: 0.35, g: 0, spread: 1.2, up: 0, add: true },
};

class Pool {
  constructor(scene, add) {
    this.n = 0;
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 4);
    this.size = new Float32Array(MAX);
    this.life = new Float32Array(MAX);
    this.max = new Float32Array(MAX);
    this.g = new Float32Array(MAX);
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aCol', this.aCol);
    geo.setAttribute('aSize', this.aSize);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uScale: { value: 600 } }, vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  emit(p, d, c, count, scale = 1) {
    for (let k = 0; k < count; k++) {
      if (this.n >= MAX) return;
      const i = this.n++;
      const a = Math.random() * Math.PI * 2, s = Math.random() * d.spread;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.15 * scale;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.1 * scale;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.15 * scale;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = d.up * (0.6 + Math.random() * 0.8);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b; this.col[i * 4 + 3] = 1;
      this.size[i] = d.size * scale * (0.7 + Math.random() * 0.6);
      this.life[i] = this.max[i] = d.life * (0.7 + Math.random() * 0.6);
      this.g[i] = d.g;
    }
  }

  tick(dt) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const l = this.life[i] - dt;
      if (l <= 0) continue;
      if (w !== i) {
        this.pos.copyWithin(w * 3, i * 3, i * 3 + 3);
        this.vel.copyWithin(w * 3, i * 3, i * 3 + 3);
        this.col.copyWithin(w * 4, i * 4, i * 4 + 4);
        this.size[w] = this.size[i]; this.max[w] = this.max[i]; this.g[w] = this.g[i];
      }
      this.life[w] = l;
      this.vel[w * 3 + 1] += this.g[w] * dt;
      this.pos[w * 3] += this.vel[w * 3] * dt;
      this.pos[w * 3 + 1] += this.vel[w * 3 + 1] * dt;
      this.pos[w * 3 + 2] += this.vel[w * 3 + 2] * dt;
      this.col[w * 4 + 3] = Math.min(1, (l / this.max[w]) * 2);
      w++;
    }
    this.n = w;
    this.points.geometry.setDrawRange(0, w);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = true;
  }
}

export class Fx {
  constructor(scene, camera) {
    this.camera = camera;
    this.norm = new Pool(scene, false);
    this.add = new Pool(scene, true);
    this.cols = {};
    for (const [k, d] of Object.entries(FX)) this.cols[k] = new THREE.Color(d.col);
    this.pops = [];
    this.scene = scene;
    this.popPool = [];
    this.emitT = 0;
  }

  burst(kind, p, count = 10, scale = 1, color) {
    const d = FX[kind];
    if (!d) return;
    (d.add ? this.add : this.norm).emit(p, d, color ? new THREE.Color(color) : this.cols[kind], count, scale);
  }

  money(p, value, color = '#ffd23a') {
    let spr = this.popPool.pop();
    if (!spr) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
      spr.userData.c = c;
      spr.renderOrder = 10;
    }
    const c = spr.userData.c;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 64);
    x.font = '900 40px Nunito, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const txt = '+' + fmtZl(value);
    x.lineWidth = 8;
    x.strokeStyle = 'rgba(60,40,0,0.85)';
    x.strokeText(txt, 128, 34);
    x.fillStyle = color;
    x.fillText(txt, 128, 34);
    spr.material.map.needsUpdate = true;
    spr.material.opacity = 1;
    spr.position.copy(p);
    const s = 0.9 + Math.min(1.2, Math.log10(1 + value) * 0.18);
    spr.scale.set(s * 2, s * 0.5, 1);
    spr.userData.t = 0;
    spr.userData.vy = 1.4;
    this.scene.add(spr);
    this.pops.push(spr);
    if (this.pops.length > 14) this.release(this.pops.shift());
  }

  release(spr) {
    this.scene.remove(spr);
    this.popPool.push(spr);
  }

  traitFx(recs, camPos, dt) {
    this.emitT += dt;
    if (this.emitT < 0.12) return;
    const step = this.emitT;
    this.emitT = 0;
    for (const r of recs) {
      if (!r.visible || !r.meta || !r.meta.tr.length) continue;
      if (r.p.distanceToSquared(camPos) > 26 * 26) continue;
      for (const i of r.meta.tr) {
        const fx = TRAITS[i].fx;
        if (!fx || Math.random() > step * 4) continue;
        this.burst(fx, r.p, 1, Math.max(0.6, Math.min(2, r.L * 2)));
      }
      if (r.meta.v >= 2 && Math.random() < step * 3) this.burst('sparkle', r.p, 1, Math.max(0.6, r.L * 2), r.meta.v === 3 ? new THREE.Color().setHSL(Math.random(), 0.8, 0.7) : '#ffe08a');
    }
  }

  tick(dt, h) {
    this.norm.mat.uniforms.uScale.value = h * 0.9;
    this.add.mat.uniforms.uScale.value = h * 0.9;
    this.norm.tick(dt);
    this.add.tick(dt);
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const s = this.pops[i];
      s.userData.t += dt;
      s.position.y += s.userData.vy * dt;
      s.userData.vy *= 0.96;
      s.material.opacity = Math.max(0, 1 - Math.max(0, s.userData.t - 0.9) * 1.6);
      if (s.userData.t > 1.6) { this.pops.splice(i, 1); this.release(s); }
    }
  }
}

export { U };
