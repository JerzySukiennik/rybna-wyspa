// Rybna Wyspa: dense short lawn around the camera (a toroidal tile of instanced blades, terrain-following, wind, cut out under blocks).

import * as THREE from 'three';
import { coastDist, beachiness, islandHeight, pathDist, LAND, SPAN } from './island.js';
import { rng } from '../util.js';

const TILE = 44;
const MASK = 512;

export class Grass {
  constructor(scene, heightTex, count = 52000) {
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
      if (s < 8) g = 0;
      if (b > 0.5 && s < 15) g = 0;
      if (slope > 0.45) g = 0;
      if (h < LAND - 0.2) g = 0;
      if (s > 3.5 && pathDist(wx, wz) < 0.9) g = 0;
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
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTime; uniform vec3 uPlayer; uniform float uTile; uniform float uSpan; uniform float uWind;
          uniform sampler2D uHeight; uniform sampler2D uCut;
          attribute vec4 aOff; attribute float aTint;
          varying float vH; varying float vTint;`)
        .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0.0, 1.0, 0.0);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(1.0, 0.0, 0.0);
          #endif`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = position;
          vec2 wp = aOff.xy + uTile * floor((cameraPosition.xz - aOff.xy) / uTile + 0.5);
          vec2 tuv = wp / uSpan + 0.5;
          float ground = texture2D(uHeight, tuv).r;
          float mask = texture2D(uCut, vec2(tuv.x, tuv.y)).r;
          float camD = distance(wp, cameraPosition.xz);
          float keep = clamp(1.25 - camD / 16.0, 0.18, 1.0);
          float hsh = fract(sin(dot(aOff.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float alive = step(hsh, keep) * step(0.5, mask);
          float fade = 1.0 - smoothstep(uTile * 0.5 - 8.0, uTile * 0.5 - 1.0, camD);
          alive *= step(0.02, fade);
          float bh = aOff.z;
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
          vH = position.y;
          vTint = aTint;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uFrost;
          varying float vH; varying float vTint;`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 gBase = vec3(0.15, 0.31, 0.04);
          vec3 gTip = mix(vec3(0.27, 0.47, 0.06), vec3(0.34, 0.52, 0.08), vTint);
          diffuseColor.rgb = mix(gBase, gTip, smoothstep(0.0, 1.0, vH)) * (0.94 + 0.12 * vTint);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.93, 0.96), uFrost * smoothstep(0.4, 1.0, vH));`);
    };
    mat.customProgramCacheKey = () => 'grass-rw';
    return mat;
  }

  makeMesh(count) {
    const verts = new Float32Array([-0.024, 0, 0, 0.024, 0, 0, -0.015, 0.45, 0, 0.015, 0.45, 0, 0, 1, 0]);
    const idx = [0, 1, 2, 1, 3, 2, 2, 3, 4];
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(15).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    geo.setIndex(idx);
    const off = new Float32Array(count * 4);
    const tint = new Float32Array(count);
    const r = rng(1234);
    for (let i = 0; i < count; i++) {
      off[i * 4] = (r() - 0.5) * TILE;
      off[i * 4 + 1] = (r() - 0.5) * TILE;
      off[i * 4 + 2] = 0.09 + r() * r() * 0.17;
      off[i * 4 + 3] = r() * Math.PI * 2;
      tint[i] = r();
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
