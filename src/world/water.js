// Rybna Wyspa: the Narew water (murky olive body over mud and sand shallows, a slow current, sky and riverbank reflections, moon path, rain rings).

import * as THREE from 'three';
import { RIVER_GLSL, SANDBARS } from './river.js';

const VERT = /* glsl */`
uniform float uTime;
uniform float uWave;
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float fade = 1.0 - smoothstep(60.0, 200.0, length(w.xz - cameraPosition.xz));
  w.y += (sin(w.x * 0.21 + uTime * 0.9) * 0.5 + sin(w.z * 0.17 - uTime * 0.7) * 0.5) * 0.035 * uWave * fade;
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunVis;
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uHemi;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSand;
uniform vec3 uFoam;
uniform vec3 uBankCol;
uniform vec3 uTreeCol;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform float uMoon;
uniform float uSpan;
uniform float uWave;
uniform float uRain;
uniform float uFlow;
uniform vec4 uBars[3];
uniform sampler2D uHeight;
varying vec3 vW;
#include <fog_pars_fragment>
${RIVER_GLSL}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float barDepth(vec2 p) {
  float d = 9.0;
  for (int i = 0; i < 3; i++) {
    vec4 b = uBars[i];
    vec2 q = p - b.xy;
    float e = length(q * vec2(1.0 / b.z, 1.0 / b.w));
    d = min(d, max(0.0, (e - 0.82) * 2.2));
  }
  return d;
}
float rings(vec2 p, float t, float k) {
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = h21(cell);
  vec2 o = vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5;
  float ph = fract(t * 1.15 + h);
  float d = length(f - o * 0.45);
  return (1.0 - smoothstep(0.0, 0.045, abs(d - ph * 0.42))) * (1.0 - ph) * step(h, k);
}
void main() {
  vec2 uv = vW.xz / uSpan + 0.5;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float hIsl = mix(-6.0, texture2D(uHeight, clamp(uv, 0.0, 1.0)).r, inside);
  float dIsl = max(0.0, -hIsl);
  float dBank = max(0.0, rvBankDist(vW.xz) * 0.24);
  float depth = min(min(dIsl, dBank), barDepth(vW.xz));
  float camD = length(vW.xz - cameraPosition.xz);
  float nf = 1.0 - smoothstep(20.0, 160.0, camD);

  vec2 fp = vec2(vW.x + uTime * uFlow, vW.z);
  float n1 = vn(fp * vec2(0.32, 0.55) + vec2(0.0, uTime * 0.07));
  float n2 = vn(fp * vec2(1.1, 1.6) - vec2(uTime * 0.25, 0.0) + 5.0);
  float n3 = vn(fp * vec2(0.07, 0.28) + 11.0);
  float amp = uWave * (0.35 + 0.65 * nf);
  vec3 n = normalize(vec3(((n1 - 0.5) * 0.09 + (n2 - 0.5) * 0.06 * nf) * amp, 1.0, ((n1 - n3) * 0.1 + (n2 - 0.5) * 0.05 * nf) * amp));
  float rip = 0.0;
  if (uRain > 0.01) {
    float rf = 1.0 - smoothstep(10.0, 45.0, camD);
    rip = (rings(vW.xz * 1.7, uTime, uRain * 0.85) + rings(vW.xz * 1.3 + 17.0, uTime + 0.37, uRain * 0.7)) * rf;
    n = normalize(n + vec3(0.0, 0.0, rip * 0.35));
  }

  vec3 body = mix(uShallow, uDeep, smoothstep(0.25, 3.2, depth));
  body = mix(body, uSand, (1.0 - smoothstep(0.0, 0.7, depth)) * 0.25);
  float band = vn(vec2((vW.x + uTime * uFlow * 1.6) * 0.022, vW.z * 0.21)) * vn(vec2((vW.x + uTime * uFlow) * 0.009, vW.z * 0.07 + 3.0));
  body *= 0.94 + band * 0.22;
  vec3 lit = body * (uHemi * 0.85 + uSunColor * max(uSunDir.y, 0.0) * 0.55);

  vec3 v = normalize(cameraPosition - vW);
  vec3 rv = reflect(-v, n);
  rv.y = max(rv.y, 0.002);
  vec3 sky = mix(uSkyHor, uSkyTop, pow(rv.y, 0.55));
  float side = rv.z < 0.0 ? -1.0 : 1.0;
  float rz = abs(rv.z) < 1e-3 ? 1e-3 * side : rv.z;
  float t = (rvBank(vW.x, side) - vW.z) / rz;
  float hx = vW.x + rv.x * t;
  t = (rvBank(hx, side) - vW.z) / rz;
  hx = vW.x + rv.x * t;
  float hy = rv.y * t;
  float top = 15.0 + 6.0 * vn(vec2(hx * 0.03, side * 7.3)) + 3.0 * vn(vec2(hx * 0.11, side * 3.1));
  float onBank = step(0.0, t) * (1.0 - smoothstep(top - 4.0, top + 1.5, hy)) * (1.0 - smoothstep(500.0, 900.0, t));
  vec3 bankRefl = mix(uBankCol, uTreeCol, smoothstep(2.0, 5.5, hy));
  bankRefl = mix(bankRefl, uSkyHor, smoothstep(150.0, 650.0, t) * 0.85);
  vec3 refl = mix(sky, bankRefl, onBank);

  float fres = 0.025 + 0.975 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 col = mix(lit, refl, clamp(fres * 1.15, 0.0, 0.92));
  col += vec3(band * 0.035) * nf;

  float rs = max(dot(rv, uSunDir), 0.0);
  float glint = step(0.975, vn(vW.xz * 2.6 + uTime * 1.3)) * nf;
  col += uSunColor * uSunVis * (pow(rs, 380.0) * 2.4 + pow(rs, 40.0) * 0.08 + glint * pow(rs, 24.0) * 0.5);
  float rm = max(dot(rv, uMoonDir), 0.0);
  float spark = 0.4 + 0.6 * step(0.6, vn(vec2(vW.x * 1.7 + uTime * 0.9, vW.z * 3.1)));
  col += uMoonCol * uMoon * (pow(rm, 90.0) * 1.4 * spark + pow(rm, 900.0) * 3.0);

  float foamLine = 1.0 - smoothstep(0.05, 0.22 + 0.06 * sin(uTime * 0.9 + vW.x * 0.7 + vW.z * 0.5), min(dIsl, min(dBank, barDepth(vW.xz))));
  float foamN = smoothstep(0.35, 0.75, vn(vW.xz * 2.2 + uTime * 0.4));
  col = mix(col, uFoam * (uHemi * 0.9 + uSunColor * 0.35), foamLine * (0.08 + 0.22 * foamN));
  col += uFoam * rip * 0.55 * (uHemi * 0.8 + 0.2);

  float alpha = max(mix(0.42, 1.0, smoothstep(0.05, 1.5, depth)), clamp(fres * 1.3, 0.0, 1.0));
  alpha = max(alpha, foamLine * 0.35);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Water {
  constructor(scene, heightTex, span) {
    const bars = SANDBARS.map((b) => new THREE.Vector4(b.x, b.z, b.rx, b.rz));
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uWave: { value: 1 }, uRain: { value: 0 }, uFlow: { value: 0.55 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(1, 0.95, 0.85) }, uSunVis: { value: 1 },
      uSkyTop: { value: new THREE.Color('#6d9bc9') }, uSkyHor: { value: new THREE.Color('#d9e2e2') },
      uHemi: { value: new THREE.Color(0.8, 0.85, 0.9) },
      uDeep: { value: new THREE.Color('#3d5a4e') }, uShallow: { value: new THREE.Color('#6f8c6b') },
      uSand: { value: new THREE.Color('#8c8a64') }, uFoam: { value: new THREE.Color('#e3e1cf') },
      uBankCol: { value: new THREE.Color('#58603a') }, uTreeCol: { value: new THREE.Color('#2f4026') },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonCol: { value: new THREE.Color('#c9d6ff') }, uMoon: { value: 0 },
      uSpan: { value: span }, uBars: { value: bars },
      uHeight: { value: null },
    }]);
    this.uniforms.uHeight.value = heightTex;
    this.uniforms.uBars.value = bars;
    this.mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true, transparent: true });
    const near = new THREE.PlaneGeometry(240, 240, 80, 80);
    near.rotateX(-Math.PI / 2);
    this.near = new THREE.Mesh(near, this.mat);
    this.near.frustumCulled = false;
    const far = new THREE.RingGeometry(118, 4000, 96, 6);
    far.rotateX(-Math.PI / 2);
    this.far = new THREE.Mesh(far, this.mat);
    this.far.position.y = -0.03;
    this.far.frustumCulled = false;
    scene.add(this.near, this.far);
  }

  update(t, light) {
    const u = this.uniforms;
    u.uTime.value = t;
    if (!light) return;
    u.uSunDir.value.copy(light.dir);
    u.uSunColor.value.copy(light.sun).multiplyScalar(light.sunI * 0.42);
    u.uSunVis.value = light.sunVis;
    u.uSkyTop.value.copy(light.top);
    u.uSkyHor.value.copy(light.horizon);
    u.uHemi.value.copy(light.hemiSky).multiplyScalar(light.hemiI * 0.9);
    u.uWave.value = light.wave;
    u.uRain.value = light.rain;
    u.uDeep.value.copy(light.deep);
    u.uShallow.value.copy(light.shallow);
    u.uSand.value.copy(light.sand);
    u.uFoam.value.copy(light.foam);
    u.uBankCol.value.copy(light.bankRefl);
    u.uTreeCol.value.copy(light.treeRefl);
    u.uMoonDir.value.copy(light.moonDir);
    u.uMoon.value = light.moonK;
  }
}
