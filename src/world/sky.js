// Rybna Wyspa: sky dome (hazy river sky, overcast deck, sun, moon with halo, stars, aurora), low-poly cumulus and the day/night/weather lighting rig.

import * as THREE from 'three';
import { NIGHT_FROM } from '../data/weather.js';
import { rng, lerp, clamp } from '../util.js';

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
uniform float uSunVis;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform float uNight;
uniform float uMoon;
uniform float uDayMoon;
uniform float uTime;
uniform float uAurora;
uniform float uCover;
uniform vec3 uCloud;
varying vec3 vDir;
float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.3 + vn(p * 4.3 + 9.1) * 0.15; }
void main() {
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uTop, pow(y, 0.5));
  col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.2, d.y));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(s, 1400.0) * 9.0 * uSunVis + pow(s, 14.0) * 0.22 + pow(s, 3.0) * 0.06) * (1.0 - uNight);
  float m = dot(d, uMoonDir);
  float disc = smoothstep(0.99962, 0.99968, m);
  float crater = 0.82 + 0.18 * vn(d.xy * 900.0 + d.z * 300.0);
  col += uMoonCol * (pow(max(m, 0.0), 420.0) * 0.45 + pow(max(m, 0.0), 30.0) * 0.07) * uNight * uMoon;
  vec3 g = floor(d * 280.0);
  float st = step(0.9968, h3(g)) * smoothstep(0.03, 0.3, d.y);
  float tw = 0.55 + 0.45 * sin(uTime * 2.0 + h3(g + 3.1) * 40.0);
  col += vec3(st * tw * 0.9) * uNight * (1.0 - uCover);
  if (uAurora > 0.0) {
    float band = sin(d.x * 6.0 + uTime * 0.25) * 0.08 + 0.32;
    float a = exp(-pow((d.y - band) * 9.0, 2.0)) * (0.5 + 0.5 * sin(d.z * 14.0 + uTime * 0.6 + d.x * 5.0));
    col += mix(vec3(0.2, 1.0, 0.55), vec3(0.6, 0.3, 1.0), smoothstep(0.25, 0.5, d.y)) * a * uAurora * 0.9;
  }
  if (uCover > 0.01) {
    vec2 cp = d.xz / max(d.y, 0.06) * 1.4 + vec2(uTime * 0.012, uTime * 0.004);
    float c = fbm(cp);
    float k = smoothstep(1.0 - uCover, 1.0 - uCover + 0.35, c) * smoothstep(-0.02, 0.12, d.y);
    vec3 cc = uCloud * (0.82 + 0.3 * vn(cp * 3.0));
    col = mix(col, cc, k * 0.94);
  }
  col = mix(col, uMoonCol * crater * mix(1.0, 1.35, uNight), disc * max(uNight, uDayMoon * 0.6) * (1.0 - uCover * 0.85));
  col += uMoonCol * pow(max(m, 0.0), 300.0) * 0.12 * uDayMoon;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const C = (h) => new THREE.Color(h);
const DAY = { top: C('#4f88c6'), hor: C('#bcd2e2'), sun: C('#ffe0b0'), hemiSky: C('#a9c6e8'), hemiGround: C('#56663a') };
const DUSK = { top: C('#4a5d96'), hor: C('#e9b48c'), sun: C('#ffb070'), hemiSky: C('#e6c4aa'), hemiGround: C('#5a4a3c') };
const NIGHT = { top: C('#0a1326'), hor: C('#1b2840'), sun: C('#a9bcff'), hemiSky: C('#33466c'), hemiGround: C('#151a20') };
const GREY = { top: C('#7f8b96'), hor: C('#b7bfc6'), sun: C('#dfe4ea'), hemiSky: C('#c3cbd0'), hemiGround: C('#5b5f55') };

const W_DAY = { deep: C('#3d5a4e'), shallow: C('#6f8c6b'), sand: C('#8c8a64'), foam: C('#e3e1cf'), bank: C('#58603a'), tree: C('#2f4026') };
const W_NIGHT = { deep: C('#0e1a1b'), shallow: C('#1b2a25'), sand: C('#262a22'), foam: C('#56606a'), bank: C('#0f150f'), tree: C('#090e0a') };
const W_GREY = { deep: C('#4a5a54'), shallow: C('#6c7c70'), sand: C('#7a7a66'), foam: C('#d5d8d2'), bank: C('#4f564a'), tree: C('#3b443a') };

const tmpA = new THREE.Color(), tmpB = new THREE.Color();

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.u = {
      uTop: { value: DAY.top.clone() }, uHorizon: { value: DAY.hor.clone() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: DAY.sun.clone() }, uSunVis: { value: 1 },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uMoonCol: { value: C('#eef1ff') }, uMoon: { value: 1 }, uDayMoon: { value: 0 },
      uNight: { value: 0 }, uTime: { value: 0 }, uAurora: { value: 0 }, uCover: { value: 0 }, uCloud: { value: C('#9aa2aa') },
    };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false }));
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.dome = dome;
    scene.add(dome);

    this.hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, 0.8);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(DAY.sun, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 260;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);

    scene.fog = new THREE.Fog(DAY.hor.clone(), 150, 650);

    this.clouds = this.makeClouds();
    scene.add(this.clouds);
    this.weatherK = { grey: 0, fog: 0, dark: 0, warm: 0, cold: 0, blood: 0, aurora: 0, moon: 0, rain: 0, snow: 0, wave: 1 };
    this.light = {
      dir: new THREE.Vector3(), sun: new THREE.Color(), sunI: 1, sunVis: 1, hemiSky: new THREE.Color(), hemiI: 1,
      top: new THREE.Color(), horizon: new THREE.Color(), night: 0, wave: 1, rain: 0, wet: 0, lampK: 0,
      deep: new THREE.Color(), shallow: new THREE.Color(), sand: new THREE.Color(), foam: new THREE.Color(),
      bankRefl: new THREE.Color(), treeRefl: new THREE.Color(), moonDir: new THREE.Vector3(), moonK: 0,
    };
  }

  makeClouds() {
    const r = rng(77);
    const parts = [];
    const base = new THREE.IcosahedronGeometry(1, 1);
    const blobs = [[0, 0.35, 0, 1.25], [1.3, 0.2, 0.2, 1.0], [-1.25, 0.15, -0.1, 1.0], [0.5, 0.85, 0.1, 0.9], [-0.6, 0.7, 0.2, 0.85], [2.3, 0.02, 0.3, 0.7], [-2.2, 0.0, 0.1, 0.72], [0.2, 0.12, 0.9, 0.82], [0.0, 0.1, -0.9, 0.8]];
    for (const [x, y, z, k] of blobs) {
      const g = base.clone();
      g.scale(k * 1.2, k * 0.95, k);
      g.translate(x, y, z);
      const pa = g.attributes.position;
      for (let v = 0; v < pa.count; v++) if (pa.getY(v) < 0) pa.setY(v, pa.getY(v) * 0.22);
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    const merged = mergeSimple(parts);
    const pa = merged.attributes.position;
    const col = new Float32Array(pa.count * 3);
    const lo = new THREE.Color('#c8c6d6'), hi = new THREE.Color('#ffffff'), c = new THREE.Color();
    for (let v = 0; v < pa.count; v++) {
      const t = Math.min(1, Math.max(0, (pa.getY(v) + 0.1) / 1.2));
      c.copy(lo).lerp(hi, t * t * (3 - 2 * t));
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
    }
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
    merged.computeVertexNormals();
    const n = 22;
    const mesh = new THREE.InstancedMesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#5c6a7a', emissiveIntensity: 0.35, fog: false }), n);
    this.cloudData = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5, d = 520 + r() * 800;
      this.cloudData.push({ a, d, y: 190 + r() * 80, sc: 17 + r() * 16, rot: r() * Math.PI * 2, sp: 0.6 + r() * 0.8 });
    }
    mesh.frustumCulled = false;
    return mesh;
  }

  setWeather(id, k) {
    const w = this.weatherK;
    const tgt = { grey: 0, fog: 0, dark: 0, warm: 0, cold: 0, blood: 0, aurora: 0, moon: 0, rain: 0, snow: 0, wave: 1 };
    if (id === 'deszcz') { tgt.grey = 1; tgt.fog = 0.55; tgt.wave = 1.5; tgt.rain = 0.75; }
    if (id === 'burza') { tgt.grey = 1; tgt.dark = 0.5; tgt.fog = 0.65; tgt.wave = 2.4; tgt.rain = 1; }
    if (id === 'mgla') { tgt.grey = 0.55; tgt.fog = 1; tgt.wave = 0.5; }
    if (id === 'wichura') { tgt.grey = 0.4; tgt.wave = 2.4; }
    if (id === 'upal') { tgt.warm = 1; }
    if (id === 'mroz') { tgt.cold = 1; tgt.grey = 0.25; }
    if (id === 'sniezyca') { tgt.cold = 1; tgt.grey = 0.85; tgt.fog = 0.6; tgt.snow = 1; }
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
    const sunDir = new THREE.Vector3(Math.cos(sunA) * Math.cos(0.5), Math.sin(sunA) * 0.46, Math.cos(sunA) * Math.sin(0.5) + 0.55).normalize();
    const nk = night ? (phase - NIGHT_FROM) / (1 - NIGHT_FROM) : 0;
    const mAz = -0.35 + nk * 0.9, mEl = 0.22 + Math.sin(nk * Math.PI) * 0.14;
    const moonDir = new THREE.Vector3(Math.cos(mAz) * Math.cos(mEl), Math.sin(mEl), Math.sin(mAz) * Math.cos(mEl));
    const grey = w.grey;

    const pick = (k) => {
      tmpA.copy(NIGHT[k]).lerp(DUSK[k], duskK * (1 - dayK));
      tmpB.copy(DUSK[k]).lerp(DAY[k], 1 - duskK);
      tmpA.lerp(tmpB, dayK);
      tmpA.lerp(tmpB.copy(GREY[k]).multiplyScalar(lerp(1, 0.3, 1 - dayK)), grey * 0.9);
      if (w.warm) tmpA.lerp(tmpB.set('#ffd9a1'), w.warm * 0.16 * dayK);
      if (w.cold) tmpA.lerp(tmpB.set('#dbe9ff'), w.cold * 0.12);
      if (w.blood) tmpA.lerp(tmpB.set('#5a0d1c'), w.blood * 0.4 * (1 - dayK));
      tmpA.multiplyScalar(1 - w.dark * 0.55);
      return tmpA;
    };
    const u = this.u;
    u.uTop.value.copy(pick('top'));
    u.uHorizon.value.copy(pick('hor'));
    u.uSunDir.value.copy(sunDir);
    u.uSunCol.value.copy(pick('sun'));
    u.uSunVis.value = clamp(1 - grey * 1.4, 0, 1);
    u.uMoonDir.value.copy(moonDir);
    u.uNight.value = 1 - dayK;
    u.uMoon.value = 0.55 + w.moon * 0.45;
    u.uMoonCol.value.set(w.blood > 0.3 ? '#ff7a6b' : '#eef1ff');
    u.uTime.value = t;
    u.uAurora.value = w.aurora * (0.4 + 0.6 * (1 - dayK));
    u.uDayMoon.value = Math.max(w.moon, w.blood) * dayK;
    u.uCover.value = clamp(grey * 1.05 - 0.05, 0, 1);
    u.uCloud.value.set('#9aa2aa').multiplyScalar(lerp(0.22, 1, dayK) * (1 - w.dark * 0.5)).lerp(tmpB.copy(u.uHorizon.value), 0.25);

    const L = this.light;
    const useMoon = dayK < 0.25;
    L.dir.copy(useMoon ? moonDir : sunDir);
    L.sun.copy(pick('sun'));
    if (useMoon) L.sun.set(w.blood > 0.3 ? '#ff9a9a' : '#a9bcff');
    L.sunI = useMoon ? (0.36 + w.moon * 0.42) * (1 - grey * 0.7) : (0.6 + 2.9 * dayK) * (1 - grey * 0.7) * (1 - w.dark * 0.5);
    L.sunVis = u.uSunVis.value * (useMoon ? 0 : 1);
    L.hemiSky.copy(pick('hemiSky'));
    L.hemiI = (0.45 + 0.85 * dayK) * (1 + grey * 0.75) * (1 - w.dark * 0.4) + (1 - dayK) * (0.16 + w.moon * 0.16) + flash * 2.5;
    L.top.copy(u.uTop.value);
    L.horizon.copy(u.uHorizon.value);
    L.night = 1 - dayK;
    L.wave = w.wave;
    L.rain = w.rain;
    L.wet = clamp(w.rain * 1.2, 0, 1);
    L.lampK = clamp(Math.max((1 - dayK) * 1.3 - 0.2, w.fog * 0.95, w.rain * 0.8, grey * 0.45), 0, 1);
    L.moonDir.copy(moonDir);
    L.moonK = (1 - dayK) * (0.45 + w.moon * 0.55) * (1 - grey * 0.85);
    const wk = 1 - dayK;
    const wmix = (key, out) => out.copy(W_DAY[key]).lerp(W_NIGHT[key], wk).lerp(tmpB.copy(W_GREY[key]).multiplyScalar(lerp(1, 0.3, wk)), grey * 0.6);
    wmix('deep', L.deep); wmix('shallow', L.shallow); wmix('sand', L.sand); wmix('foam', L.foam); wmix('bank', L.bankRefl); wmix('tree', L.treeRefl);

    this.sun.color.copy(L.sun);
    this.sun.intensity = L.sunI * (1 + flash * 2);
    this.hemi.color.copy(L.hemiSky);
    this.hemi.groundColor.copy(pick('hemiGround'));
    this.hemi.intensity = L.hemiI;
    this.scene.fog.color.copy(u.uHorizon.value).lerp(tmpB.set('#d9d3c4'), clamp(w.fog, 0, 1) * 0.45 * dayK);
    const fogK = clamp(w.fog, 0, 1);
    const mist = clamp((w.fog - 0.7) / 0.3, 0, 1);
    this.scene.fog.near = lerp(lerp(260, 40, fogK / 0.7 > 1 ? 1 : fogK / 0.7), 6, mist);
    this.scene.fog.far = lerp(lerp(1150, 220, fogK / 0.7 > 1 ? 1 : fogK / 0.7), 95, mist);

    const tgt = this.sun.target.position;
    const snap = 76 / 2048;
    tgt.set(Math.round(camPos.x / snap) * snap, 0, Math.round(camPos.z / snap) * snap);
    this.sun.position.copy(tgt).addScaledVector(L.dir, 120);
    this.dome.position.copy(camPos);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const cm = this.clouds;
    cm.material.color.copy(u.uHorizon.value).lerp(tmpB.set('#ffffff'), 0.8 * dayK * (1 - grey)).lerp(tmpB.set('#9aa2aa').multiplyScalar(lerp(0.3, 1, dayK)), grey * 0.8);
    cm.material.emissive.copy(u.uHorizon.value).lerp(tmpB.set('#ffffff'), 0.55 * dayK * (1 - grey)).multiplyScalar(0.62 + 0.3 * dayK * (1 - grey) + (1 - dayK) * 0.9);
    cm.visible = grey < 0.75;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      const a = c.a + t * 0.0012 * c.sp;
      p.set(Math.cos(a) * c.d, c.y - grey * 40, Math.sin(a) * c.d);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot + a);
      const g = 1 + grey * 0.9;
      const fade = Math.max(0.001, (1 - grey * 1.25) * (1 - clamp(w.fog * 1.5, 0, 1)) * clamp(dayK * 1.6 - 0.1, 0, 1));
      s.set(c.sc * g * 1.25 * fade, c.sc * (0.65 + grey * 0.3) * fade, c.sc * g * fade);
      cm.setMatrixAt(i, m.compose(p, q, s));
    }
    cm.instanceMatrix.needsUpdate = true;
    return L;
  }
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
