// Rybna Wyspa: calm stylised water (depth-graded turquoise, a bright shelf and foam rim around the island, soft drifting swirls, sun glint).

import * as THREE from 'three';

const VERT = /* glsl */`
uniform float uTime;
uniform float uWave;
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float fade = 1.0 - smoothstep(120.0, 300.0, length(w.xz - cameraPosition.xz));
  w.y += (sin(w.x * 0.18 + uTime * 0.8) * 0.5 + sin(w.z * 0.15 - uTime * 0.6) * 0.5) * 0.05 * uWave * fade;
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSky;
uniform vec3 uHemi;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uShelf;
uniform vec3 uFoam;
uniform float uSpan;
uniform float uNight;
uniform float uWave;
uniform sampler2D uHeight;
varying vec3 vW;
#include <fog_pars_fragment>
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 uv = vW.xz / uSpan + 0.5;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float h = mix(-6.0, texture2D(uHeight, clamp(uv, 0.0, 1.0)).r, inside);
  float depth = max(0.0, -h);
  vec2 q = vW.xz * 0.012 + vec2(uTime * 0.006, -uTime * 0.004);
  float sw = vn(q) * 0.65 + vn(q * 2.7 + 7.0) * 0.35;
  vec3 col = mix(uShallow, uDeep, smoothstep(0.4, 5.0, depth));
  col *= 0.9 + sw * 0.2;
  float shelf = 1.0 - smoothstep(0.9, 1.5, depth);
  col = mix(col, uShelf, shelf * 0.85);
  float wob = sin(atan(vW.z, vW.x) * 9.0 + uTime * 0.7) * 0.05 + sin(uTime * 1.3) * 0.04;
  float foam = 1.0 - smoothstep(0.16 + wob, 0.3 + wob, depth);
  col = mix(col, uFoam, foam);
  vec3 v = normalize(cameraPosition - vW);
  float nf = 1.0 - smoothstep(25.0, 140.0, length(vW.xz - cameraPosition.xz));
  vec3 n = normalize(vec3((vn(vW.xz * 0.16 + uTime * 0.22) - 0.5) * 0.09 * uWave * nf, 1.0, (vn(vW.zx * 0.16 - uTime * 0.18) - 0.5) * 0.09 * uWave * nf));
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 r = reflect(-uSunDir, n);
  float spec = pow(max(dot(r, v), 0.0), 220.0) * (1.0 - uNight * 0.8);
  float glit = step(0.985, vn(vW.xz * 2.2 + uTime * 0.9)) * pow(max(dot(r, v), 0.0), 8.0) * (1.0 - uNight) * nf;
  col = col * (uHemi * 0.75 + uSunColor * max(uSunDir.y, 0.0) * 0.42) + uSky * fres * 0.35 + uSunColor * (spec * 1.6 + glit * 0.8);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Water {
  constructor(scene, heightTex, span) {
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uWave: { value: 1 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
      uSky: { value: new THREE.Color('#9fd3ff') },
      uHemi: { value: new THREE.Color(0.8, 0.85, 0.9) },
      uDeep: { value: new THREE.Color('#0e6a8e') },
      uShallow: { value: new THREE.Color('#25c4c0') },
      uShelf: { value: new THREE.Color('#47e6cf') },
      uFoam: { value: new THREE.Color('#c9fff3') },
      uSpan: { value: span }, uNight: { value: 0 },
      uHeight: { value: null },
    }]);
    this.uniforms.uHeight.value = heightTex;
    this.mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
    const near = new THREE.PlaneGeometry(240, 240, 60, 60);
    near.rotateX(-Math.PI / 2);
    this.near = new THREE.Mesh(near, this.mat);
    this.near.frustumCulled = false;
    const far = new THREE.RingGeometry(118, 4000, 64, 3);
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
    u.uSunColor.value.copy(light.sun).multiplyScalar(light.sunI * 0.5);
    u.uSky.value.copy(light.horizon);
    u.uHemi.value.copy(light.hemiSky).multiplyScalar(light.hemiI * 0.8);
    u.uNight.value = light.night;
    u.uWave.value = light.wave;
    u.uDeep.value.copy(light.deep);
    u.uShallow.value.copy(light.shallow);
    u.uShelf.value.copy(light.shelf);
    u.uFoam.value.copy(light.foam);
  }
}
