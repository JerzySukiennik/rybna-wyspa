// Rybna Wyspa: dense short lawn around the camera (a toroidal tile of instanced blades, terrain-following, wind, cut out under blocks).

import * as THREE from 'three';
import { coastDist, beachiness, islandHeight, pathDist, LAND, SPAN } from './island.js';
import { rng } from '../util.js';
import { U } from '../render/materials.js';

const TILE = 34;
const MASK = 512;

export class Grass {
  constructor(scene, heightTex, count = 60000) {
    this.cut = document.createElement('canvas');
    this.cut.width = this.cut.height = MASK;
    this.ctx = this.cut.getContext('2d');
    this.base = this.makeBase();
    this.cutTex = new THREE.CanvasTexture(this.cut);
    this.cutTex.colorSpace = THREE.NoColorSpace;
    this.cutTex.magFilter = THREE.LinearFilter;
    this.cutTex.minFilter = THREE.LinearFilter;
    this.cutTex.generateMipmaps = false;
    this.cutTex.flipY = false;
    this.u = {
      uTime: { value: 0 }, uPlayer: { value: new THREE.Vector3(0, -99, 0) }, uTile: { value: TILE }, uSpan: { value: SPAN },
      uHeight: { value: heightTex }, uCut: { value: this.cutTex }, uWind: { value: 1 }, uFrost: { value: 0 },
    };
    this.mat = this.makeMaterial();
    this.mesh = this.makeMesh(count);
    scene.add(this.mesh);
    this.shapes = [];
    this.redraw();
  }

  makeBase() {
    const c = document.createElement('canvas');
    c.width = c.height = MASK;
    const x = c.getContext('2d');
    const img = x.createImageData(MASK, MASK);
    for (let j = 0; j < MASK; j++) for (let i = 0; i < MASK; i++) {
      const wx = (i + 0.5) / MASK * SPAN - SPAN / 2, wz = (j + 0.5) / MASK * SPAN - SPAN / 2;
      const s = coastDist(wx, wz);
      const b = beachiness(wx, wz);
      const h = islandHeight(wx, wz);
      const hx = islandHeight(wx + 0.6, wz), hz = islandHeight(wx, wz + 0.6);
      const slope = Math.hypot(hx - h, hz - h) / 0.6;
      let g = 1;
      if (s < 2.0) g = 0;
      if (b > 0.5 && s < 7.5) g = 0;
      if (slope > 0.5) g = 0;
      if (h < 0.55) g = 0;
      if (s > 3.5 && pathDist(wx, wz) < 0.85) g = 0;
      const o = (j * MASK + i) * 4;
      img.data[o] = g * 255; img.data[o + 1] = 0; img.data[o + 2] = 0; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  setShapes(list) {
    this.shapes = list;
    this.redraw();
  }

  redraw() {
    const x = this.ctx;
    x.globalCompositeOperation = 'source-over';
    x.drawImage(this.base, 0, 0);
    x.fillStyle = '#000';
    const k = MASK / SPAN;
    for (const s of this.shapes) {
      x.save();
      x.translate((s.x + SPAN / 2) * k, (s.z + SPAN / 2) * k);
      if (s.r) { x.beginPath(); x.arc(0, 0, s.r * k, 0, Math.PI * 2); x.fill(); }
      else { x.rotate(-s.yaw); x.fillRect((-s.w / 2 - 0.15) * k, (-s.l / 2 - 0.15) * k, (s.w + 0.3) * k, (s.l + 0.3) * k); }
      x.restore();
    }
    this.cutTex.needsUpdate = true;
  }

  makeMaterial() {
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const u = this.u;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.uniforms.uWet = U.wet;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTime; uniform vec3 uPlayer; uniform float uTile; uniform float uSpan; uniform float uWind;
          uniform sampler2D uHeight; uniform sampler2D uCut;
          attribute vec4 aOff; attribute float aTint;
          varying float vH; varying float vTint; varying float vClump; varying float vFlower;
          float gh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float gn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0.0, 1.0, 0.0);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(1.0, 0.0, 0.0);
          #endif`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = position;
          float fl0 = 0.0;
          if (fl0 > 0.5 && position.y > 0.4 && position.y < 0.5) { transformed.y = 0.84; transformed.x *= 3.2; }
          vec2 wp = aOff.xy + uTile * floor((cameraPosition.xz - aOff.xy) / uTile + 0.5);
          vec2 tuv = wp / uSpan + 0.5;
          float ground = texture2D(uHeight, tuv).r;
          float mask = texture2D(uCut, vec2(tuv.x, tuv.y)).r;
          float camD = distance(wp, cameraPosition.xz);
          float keep = clamp(1.3 - camD / 13.0, 0.22, 1.0);
          float hsh = fract(sin(dot(aOff.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float alive = step(hsh, keep) * step(0.5, mask);
          float fade = 1.0 - smoothstep(uTile * 0.5 - 8.0, uTile * 0.5 - 1.0, camD);
          alive *= step(0.02, fade);
          vFlower = fl0;
          float bh = aOff.z * (1.0 + vFlower * 0.45);
          vClump = gn(wp * 0.13) * 0.65 + gn(wp * 0.41 + 9.0) * 0.35;
          transformed.x *= alive * (1.0 + (1.0 - keep) * 1.6);
          transformed.y *= bh * alive * fade;
          float ca = cos(aOff.w), sa = sin(aOff.w);
          transformed.xz = vec2(ca * transformed.x - sa * transformed.z, sa * transformed.x + ca * transformed.z);
          float k = position.y * position.y;
          float w = sin(uTime * 1.6 + wp.x * 0.21 + wp.y * 0.13) * 0.55 + sin(uTime * 3.1 + wp.x * 0.7 - wp.y * 0.45) * 0.2;
          vec2 wind = vec2(0.75, 0.38) * (w + 0.5) * 0.12 * bh * uWind;
          vec2 dd = wp - uPlayer.xz;
          float dl = length(dd);
          float near = (1.0 - smoothstep(0.0, 0.9, dl)) * (1.0 - smoothstep(0.5, 1.6, abs(uPlayer.y - ground)));
          transformed.xz += (wind + normalize(dd + vec2(1e-4)) * near * 0.35 * bh) * k * alive;
          transformed.x += wp.x;
          transformed.z += wp.y;
          transformed.y += ground - 0.01;
          vH = fl0 > 0.5 && position.y > 0.4 && position.y < 0.5 ? 0.84 : position.y;
          vTint = aTint;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uFrost; uniform float uWet;
          varying float vH; varying float vTint; varying float vClump; varying float vFlower;`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 gBase = vec3(0.06, 0.14, 0.03);
          vec3 gTip = mix(vec3(0.22, 0.38, 0.08), vec3(0.32, 0.48, 0.11), vTint);
          gTip = mix(gTip, vec3(0.42, 0.4, 0.15), smoothstep(0.55, 0.85, vClump) * 0.55);
          gTip = mix(gTip, vec3(0.2, 0.31, 0.08), smoothstep(0.4, 0.15, vClump) * 0.5);
          diffuseColor.rgb = mix(gBase, gTip, smoothstep(0.0, 1.0, vH)) * (0.92 + 0.14 * vTint);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), 0.3 * uWet) * (1.0 - 0.25 * uWet);
          if (vFlower > 0.5 && vH > 0.8) diffuseColor.rgb = fract(vTint * 13.0) > 0.45 ? vec3(0.86, 0.85, 0.8) : vec3(0.85, 0.66, 0.1);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.93, 0.96), uFrost * smoothstep(0.4, 1.0, vH));`);
    };
    mat.customProgramCacheKey = () => 'grass-rw';
    return mat;
  }

  makeMesh(count) {
    const verts = new Float32Array([-0.03, 0, 0, 0.03, 0, 0, -0.018, 0.45, 0, 0.018, 0.45, 0, 0, 1, 0]);
    const idx = [0, 1, 2, 1, 3, 2, 2, 3, 4];
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(15).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    geo.setIndex(idx);
    const off = new Float32Array(count * 4);
    const tint = new Float32Array(count);
    const r = rng(1234);
    let i = 0;
    while (i < count) {
      const cx = (r() - 0.5) * TILE, cz = (r() - 0.5) * TILE;
      const n = Math.min(count - i, r() < 0.35 ? 1 : 5 + Math.floor(r() * 11));
      const rad = 0.06 + r() * 0.2, h0 = 0.1 + r() * r() * 0.15, t0 = r();
      for (let k = 0; k < n; k++, i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
        off[i * 4] = cx + Math.cos(a) * d;
        off[i * 4 + 1] = cz + Math.sin(a) * d;
        off[i * 4 + 2] = Math.max(0.05, h0 * (0.65 + r() * 0.7) * (1.15 - d / Math.max(rad, 0.01) * 0.4));
        off[i * 4 + 3] = a + (r() - 0.5) * 1.2;
        tint[i] = Math.min(0.999, Math.max(0, t0 + (r() - 0.5) * 0.35));
      }
    }
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
    geo.instanceCount = count;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  update(t, player, wind, frost) {
    this.u.uTime.value = t;
    this.u.uPlayer.value.copy(player);
    this.u.uWind.value = wind;
    this.u.uFrost.value = frost;
  }
}
