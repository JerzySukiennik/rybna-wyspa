// Rybna Wyspa: shared materials (flat block material with emissive mask, scrolling belt strips, flume water, build ghost).

import * as THREE from 'three';

export const U = { time: { value: 0 }, lamp: { value: 0 } };

export function blockMaterial(o = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...o });
  m.onBeforeCompile = (s) => {
    s.uniforms.uLamp = U.lamp;
    s.uniforms.uTime = U.time;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEmit;\nvarying float vEmit;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvEmit = aEmit;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEmit;\nuniform float uLamp;\nuniform float uTime;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vEmit * (0.35 + uLamp * 1.5);');
  };
  m.customProgramCacheKey = () => 'block-emit';
  return m;
}

const stripMats = new Map();

export function stripMaterial(speed) {
  if (stripMats.has(speed)) return stripMats.get(speed);
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const uSpeed = { value: speed };
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.uniforms.uSpeed = uSpeed;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vStrip;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvStrip = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vStrip;\nuniform float uTime;\nuniform float uSpeed;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat stp = fract(vStrip.y * 3.0 - uTime * uSpeed * 3.0 + abs(vStrip.x - 0.5) * 0.9);\nfloat edge = smoothstep(0.42, 0.5, abs(vStrip.x - 0.5));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.09, 0.1), step(0.82, stp) * (1.0 - edge));');
  };
  m.customProgramCacheKey = () => 'strip';
  stripMats.set(speed, m);
  return m;
}

const WV = /* glsl */`
uniform float uTime;
varying vec2 vUv;
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 w = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  w = instanceMatrix * w;
  #endif
  w = modelMatrix * w;
  w.y += sin(w.x * 3.1 + uTime * 2.3) * 0.012 + sin(w.z * 2.7 - uTime * 1.9) * 0.012;
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const WF = /* glsl */`
uniform float uTime;
uniform float uSpeed;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  float s = sin(vUv.y * 7.0 - uTime * uSpeed * 7.0 + sin(vUv.x * 11.0 + vUv.y * 3.0) * 0.8);
  float edge = smoothstep(0.38, 0.5, abs(vUv.x - 0.5));
  vec3 base = vec3(0.16, 0.55, 0.72);
  vec3 col = mix(base, vec3(0.78, 0.94, 1.0), smoothstep(0.55, 1.0, s) * 0.65 + edge * 0.4);
  gl_FragColor = vec4(col * uLight, 0.78);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const waterMats = new Map();
export const waterLight = { value: new THREE.Color(1, 1, 1) };

export function flumeWaterMaterial(speed) {
  if (waterMats.has(speed)) return waterMats.get(speed);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSpeed: { value: speed } }]),
    vertexShader: WV, fragmentShader: WF, transparent: true, depthWrite: false, fog: true,
  });
  m.uniforms.uTime = U.time;
  m.uniforms.uLight = waterLight;
  waterMats.set(speed, m);
  return m;
}

export function ghostMaterial() {
  return new THREE.MeshBasicMaterial({ color: '#5fd068', transparent: true, opacity: 0.42, depthWrite: false });
}
