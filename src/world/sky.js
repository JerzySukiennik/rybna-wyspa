// Rybna Wyspa: sky dome, sun, moon, stars, low-poly clouds, distant river banks and the day/night/weather lighting.

import * as THREE from 'three';
import { NIGHT_FROM } from '../data/weather.js';
import { rng, lerp, smooth, clamp } from '../util.js';

const SKY_V = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_F = /* glsl */`
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform float uNight;
uniform float uMoonSize;
uniform float uTime;
uniform float uAurora;
varying vec3 vDir;
float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uTop, pow(y, 0.55));
  col = mix(col, uHorizon * 0.85, smoothstep(0.0, -0.25, d.y));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.28) * (1.0 - uNight);
  float m = dot(d, uMoonDir);
  float disc = smoothstep(1.0 - uMoonSize, 1.0 - uMoonSize * 0.82, m);
  col = mix(col, uMoonCol, disc * uNight);
  col += uMoonCol * pow(max(m, 0.0), 40.0) * 0.15 * uNight;
  vec3 g = floor(d * 260.0);
  float st = step(0.9965, h3(g)) * smoothstep(0.02, 0.25, d.y);
  float tw = 0.6 + 0.4 * sin(uTime * 2.0 + h3(g + 3.1) * 40.0);
  col += vec3(st * tw) * uNight * (1.0 - disc);
  if (uAurora > 0.0) {
    float band = sin(d.x * 6.0 + uTime * 0.25) * 0.08 + 0.32;
    float a = exp(-pow((d.y - band) * 9.0, 2.0)) * (0.5 + 0.5 * sin(d.z * 14.0 + uTime * 0.6 + d.x * 5.0));
    col += mix(vec3(0.2, 1.0, 0.55), vec3(0.6, 0.3, 1.0), smoothstep(0.25, 0.5, d.y)) * a * uAurora * 0.9;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const C = (h) => new THREE.Color(h);
const DAY = { top: C('#4fa6e0'), hor: C('#b9eef0'), sun: C('#fff1d6'), hemiSky: C('#d4f3ff'), hemiGround: C('#6f8f63'), fog: C('#9fdfe2') };
const DUSK = { top: C('#4b62b4'), hor: C('#ffbd8a'), sun: C('#ffb47a'), hemiSky: C('#ffd2b0'), hemiGround: C('#6d5a4a'), fog: C('#e9b9a0') };
const NIGHT = { top: C('#06102a'), hor: C('#17365a'), sun: C('#9fb6ff'), hemiSky: C('#35507e'), hemiGround: C('#1b2430'), fog: C('#0f2238') };
const GREY = { top: C('#7f97a6'), hor: C('#bfd0d6'), sun: C('#e6ebf2'), hemiSky: C('#c4d2d8'), hemiGround: C('#5f6d60'), fog: C('#aac0c6') };

const tmpA = new THREE.Color(), tmpB = new THREE.Color();

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.u = {
      uTop: { value: DAY.top.clone() }, uHorizon: { value: DAY.hor.clone() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: DAY.sun.clone() },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uMoonCol: { value: C('#eef3ff') },
      uNight: { value: 0 }, uMoonSize: { value: 0.0016 }, uTime: { value: 0 }, uAurora: { value: 0 },
    };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false }));
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.dome = dome;
    scene.add(dome);

    this.hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, 1.1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(DAY.sun, 2.2);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 260;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);

    scene.fog = new THREE.Fog(DAY.fog.clone(), 90, 700);

    this.clouds = this.makeClouds();
    scene.add(this.clouds);
    this.islets = this.makeIslets();
    scene.add(this.islets);
    this.weatherK = { grey: 0, fog: 0, dark: 0, warm: 0, cold: 0, blood: 0, aurora: 0, moon: 0 };
    this.light = {
      dir: new THREE.Vector3(), sun: new THREE.Color(), sunI: 1, hemiSky: new THREE.Color(), hemiI: 1,
      horizon: new THREE.Color(), night: 0, wave: 1, deep: C('#0e6a8e'), shallow: C('#25c4c0'), shelf: C('#47e6cf'), foam: C('#c9fff3'), lampK: 0,
    };
  }

  makeClouds() {
    const r = rng(77);
    const parts = [];
    const base = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 5; i++) {
      const g = base.clone();
      const k = 1 - Math.abs(i - 2) * 0.22;
      g.scale(k * (1.1 + r() * 0.4), k * (0.8 + r() * 0.3), k * (1 + r() * 0.3));
      g.translate((i - 2) * 1.05 + r() * 0.3, k * 0.35 + r() * 0.15, (r() - 0.5) * 0.6);
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    const merged = mergeSimple(parts);
    merged.computeVertexNormals();
    const mesh = new THREE.InstancedMesh(merged, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#5c6a7a', emissiveIntensity: 0.35, fog: false }), 34);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.cloudData = [];
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, d = 380 + r() * 750;
      const sc = 9 + r() * 12;
      this.cloudData.push({ a, d, y: 150 + r() * 70, sc, rot: r() * Math.PI * 2, sp: 0.6 + r() * 0.8 });
      p.set(Math.cos(a) * d, 90, Math.sin(a) * d);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6);
      s.set(sc, sc, sc);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    mesh.frustumCulled = false;
    return mesh;
  }

  makeIslets() {
    const r = rng(41);
    const parts = [];
    const rims = [];
    const rock = ['#3f6f62', '#355f56', '#4a7a66'];
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2 + (r() - 0.5) * 0.4;
      const d = 62 + r() * 260;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const R0 = 4 + r() * 11;
      const tiers = 1 + Math.floor(r() * 3);
      let y = -1.5, rr = R0;
      for (let k = 0; k < tiers; k++) {
        const h = 2.5 + r() * 5;
        const g = new THREE.CylinderGeometry(rr * (0.72 + r() * 0.12), rr, h, 6 + Math.floor(r() * 3), 1);
        const pa = g.attributes.position;
        for (let v = 0; v < pa.count; v++) pa.setXYZ(v, pa.getX(v) * (0.85 + hashF(i, v, k) * 0.3), pa.getY(v), pa.getZ(v) * (0.85 + hashF(v, i, k) * 0.3));
        g.rotateY(r() * 6.28);
        g.translate(cx + (r() - 0.5) * rr * 0.3, y + h / 2, cz + (r() - 0.5) * rr * 0.3);
        const ng = g.index ? g.toNonIndexed() : g;
        const col = new Float32Array(ng.attributes.position.count * 3);
        const c = new THREE.Color();
        const gp = ng.attributes.position;
        for (let f = 0; f < gp.count; f += 3) {
          const ny = triNormalY(gp, f);
          c.set(ny > 0.8 ? (k === tiers - 1 ? '#9fc744' : '#5d8a5a') : rock[(f / 3) % 3 | 0]);
          for (let q = 0; q < 3; q++) c.toArray(col, (f + q) * 3);
        }
        ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
        parts.push(ng);
        y += h;
        rr *= 0.55 + r() * 0.2;
      }
      for (let k = 0; k < 2 + Math.floor(r() * 4); k++) {
        const t = new THREE.ConeGeometry(0.9 + r() * 0.6, 5 + r() * 4, 6, 1);
        t.translate(cx + (r() - 0.5) * R0 * 0.3, y + 2.5, cz + (r() - 0.5) * R0 * 0.3);
        parts.push(colorize(t.index ? t.toNonIndexed() : t, r() < 0.5 ? '#2f6b4a' : '#3d7f52'));
      }
      rims.push({ x: cx, z: cz, r: R0 });
    }
    const g = mergeSimple(parts);
    g.computeVertexNormals();
    const grp = new THREE.Group();
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mesh.castShadow = false;
    grp.add(mesh);
    this.rimMat = new THREE.MeshBasicMaterial({ color: '#47e6cf', fog: true });
    this.foamMat = new THREE.MeshBasicMaterial({ color: '#c9fff3', fog: true });
    for (const it of rims) {
      const shelf = new THREE.Mesh(new THREE.CircleGeometry(it.r * 1.45, 9), this.rimMat);
      shelf.rotation.x = -Math.PI / 2;
      shelf.position.set(it.x, 0.02, it.z);
      const foam = new THREE.Mesh(new THREE.RingGeometry(it.r * 1.0, it.r * 1.16, 9), this.foamMat);
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(it.x, 0.04, it.z);
      grp.add(shelf, foam);
    }
    return grp;
  }

  setWeather(id, k) {
    const w = this.weatherK;
    const tgt = { grey: 0, fog: 0, dark: 0, warm: 0, cold: 0, blood: 0, aurora: 0, moon: 0, wave: 1 };
    if (id === 'deszcz') { tgt.grey = 0.75; tgt.fog = 0.35; tgt.wave = 1.6; }
    if (id === 'burza') { tgt.grey = 1; tgt.dark = 0.55; tgt.fog = 0.45; tgt.wave = 2.6; }
    if (id === 'mgla') { tgt.grey = 0.5; tgt.fog = 1; tgt.wave = 0.5; }
    if (id === 'wichura') { tgt.grey = 0.35; tgt.wave = 2.4; }
    if (id === 'upal') { tgt.warm = 1; }
    if (id === 'mroz') { tgt.cold = 1; tgt.grey = 0.2; }
    if (id === 'sniezyca') { tgt.cold = 1; tgt.grey = 0.8; tgt.fog = 0.55; }
    if (id === 'krwawy') { tgt.blood = 1; tgt.moon = 1; }
    if (id === 'pelnia') { tgt.moon = 1; }
    if (id === 'zorza') { tgt.aurora = 1; }
    const kk = Math.min(1, Math.max(0, k));
    for (const key in tgt) w[key] = lerp(w[key] ?? 0, tgt[key], kk);
  }

  update(phase, dt, t, camPos, flash = 0) {
    const w = this.weatherK;
    const night = phase >= NIGHT_FROM;
    let sunA;
    if (!night) sunA = (phase / NIGHT_FROM) * Math.PI;
    else sunA = Math.PI + ((phase - NIGHT_FROM) / (1 - NIGHT_FROM)) * Math.PI;
    const dayK = clamp(Math.sin(sunA) * 3.2 + 0.25, 0, 1);
    const duskK = clamp(1 - Math.abs(Math.sin(sunA)) * 3.0, 0, 1) * (night ? 0.4 : 1);
    const sunDir = new THREE.Vector3(Math.cos(sunA) * Math.cos(0.5), Math.sin(sunA) * 0.78, Math.cos(sunA) * Math.sin(0.5) + 0.55).normalize();
    const moonDir = sunDir.clone().negate();
    moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25;
    moonDir.normalize();

    const pick = (k) => {
      tmpA.copy(NIGHT[k]).lerp(DUSK[k], duskK * (1 - dayK) + duskK * 0.0);
      tmpB.copy(DUSK[k]).lerp(DAY[k], 1 - duskK);
      tmpA.lerp(tmpB, dayK);
      tmpA.lerp(tmpB.copy(GREY[k]).multiplyScalar(lerp(1, 0.35, 1 - dayK)), w.grey * 0.85);
      if (w.warm) tmpA.lerp(tmpB.set('#ffd9a1'), w.warm * 0.18 * dayK);
      if (w.cold) tmpA.lerp(tmpB.set('#dbe9ff'), w.cold * 0.12);
      if (w.blood) tmpA.lerp(tmpB.set('#5a0d1c'), w.blood * 0.4 * (1 - dayK));
      tmpA.multiplyScalar(1 - w.dark * 0.6);
      return tmpA;
    };
    const u = this.u;
    u.uTop.value.copy(pick('top'));
    u.uHorizon.value.copy(pick('hor'));
    u.uSunDir.value.copy(sunDir);
    u.uSunCol.value.copy(pick('sun')).multiplyScalar(1 - w.grey * 0.8);
    u.uMoonDir.value.copy(moonDir);
    u.uNight.value = 1 - dayK;
    u.uMoonSize.value = 0.0016 + w.moon * 0.0024;
    u.uMoonCol.value.set(w.blood > 0.3 ? '#ff6b6b' : '#eef3ff');
    u.uTime.value = t;
    u.uAurora.value = w.aurora * (1 - dayK);

    const L = this.light;
    const useMoon = dayK < 0.25;
    L.dir.copy(useMoon ? moonDir : sunDir);
    L.sun.copy(pick('sun'));
    if (useMoon) L.sun.set(w.blood > 0.3 ? '#ff9a9a' : '#a8bcff');
    L.sunI = useMoon ? 0.22 + w.moon * 0.4 : (0.5 + 2.6 * dayK) * (1 - w.grey * 0.6);
    L.hemiSky.copy(pick('hemiSky'));
    L.hemiI = (0.22 + 0.72 * dayK) * (1 - w.dark * 0.4) + w.moon * 0.14 * (1 - dayK) + flash * 2.5;
    L.horizon.copy(u.uHorizon.value);
    L.night = 1 - dayK;
    L.wave = 1 + (w.wave ?? 0);
    L.lampK = clamp((1 - dayK) * 1.3 + w.grey * 0.5 - 0.2, 0, 1);
    L.deep.set('#0e6a8e').lerp(tmpB.set('#06203a'), 1 - dayK).lerp(tmpB.set('#36677a'), w.grey * 0.5);
    L.shallow.set('#25c4c0').lerp(tmpB.set('#0f4a5a'), 1 - dayK).lerp(tmpB.set('#5d9fa2'), w.grey * 0.5);
    L.shelf.set('#47e6cf').lerp(tmpB.set('#1c6a72'), 1 - dayK).lerp(tmpB.set('#7fb8b6'), w.grey * 0.5);
    L.foam.set('#c9fff3').lerp(tmpB.set('#5f9fb0'), 1 - dayK).lerp(tmpB.set('#d6e6e6'), w.grey * 0.4);
    if (this.rimMat) { this.rimMat.color.copy(L.shelf); this.foamMat.color.copy(L.foam); }

    this.sun.color.copy(L.sun);
    this.sun.intensity = L.sunI * (1 + flash * 2);
    this.hemi.color.copy(L.hemiSky);
    this.hemi.groundColor.copy(pick('hemiGround'));
    this.hemi.intensity = L.hemiI;
    const fogC = pick('fog');
    this.scene.fog.color.copy(fogC);
    this.scene.fog.near = lerp(90, 4, w.fog);
    this.scene.fog.far = lerp(720, 70, w.fog);

    const tgt = this.sun.target.position;
    const snap = 76 / 2048;
    tgt.set(Math.round(camPos.x / snap) * snap, 0, Math.round(camPos.z / snap) * snap);
    this.sun.position.copy(tgt).addScaledVector(L.dir, 120);
    this.dome.position.copy(camPos);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const cm = this.clouds;
    cm.material.color.copy(u.uHorizon.value).lerp(tmpB.set('#ffffff'), 0.65 * dayK);
    cm.material.emissive.copy(u.uHorizon.value).multiplyScalar(0.62);
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      const a = c.a + t * 0.0012 * c.sp;
      p.set(Math.cos(a) * c.d, c.y, Math.sin(a) * c.d);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot + a);
      const g = 1 + w.grey * 0.6;
      s.set(c.sc * g * 1.2, c.sc * (0.7 + w.grey * 0.4), c.sc * g);
      cm.setMatrixAt(i, m.compose(p, q, s));
    }
    cm.instanceMatrix.needsUpdate = true;
    return L;
  }
}

function hashF(a, b, c) {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

function triNormalY(pa, f) {
  const ax = pa.getX(f), ay = pa.getY(f), az = pa.getZ(f);
  const ux = pa.getX(f + 1) - ax, uy = pa.getY(f + 1) - ay, uz = pa.getZ(f + 1) - az;
  const vx = pa.getX(f + 2) - ax, vy = pa.getY(f + 2) - ay, vz = pa.getZ(f + 2) - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return Math.abs(ny) / Math.max(1e-6, Math.hypot(nx, ny, nz));
}

export function colorize(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function mergeSimple(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const hasCol = list.every((g) => g.attributes.color);
  const col = hasCol ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of list) {
    const gg = g.index ? g.toNonIndexed() : g;
    pos.set(gg.attributes.position.array, o * 3);
    if (col) col.set(gg.attributes.color.array, o * 3);
    o += gg.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
