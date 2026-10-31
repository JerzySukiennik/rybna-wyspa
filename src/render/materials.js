// Rybna Wyspa: shared materials (flat block material with emissive mask, scrolling belt strips, flume water, build ghost).

import * as THREE from 'three';

export const U = { time: { value: 0 }, lamp: { value: 0 }, wet: { value: 0 } };

export function blockMaterial(o = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...o });
  m.onBeforeCompile = (s) => {
    s.uniforms.uLamp = U.lamp;
    s.uniforms.uTime = U.time;
    s.uniforms.uWet = U.wet;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEmit;\nvarying float vEmit;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvEmit = aEmit;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEmit;\nuniform float uLamp;\nuniform float uTime;\nuniform float uWet;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat nightLit = step(1.5, vEmit);\ndiffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.18 * uWet), vec3(0.08, 0.1, 0.13), nightLit);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * mix(vEmit * (0.35 + uLamp * 1.5), (vEmit - 1.5) * uLamp * 3.2, nightLit);');
  };
  m.customProgramCacheKey = () => 'block-emit';
  return m;
}

export function addWet(m) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = U.wet;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - 0.18 * uWet;');
  };
  m.customProgramCacheKey = () => 'wet';
  return m;
}

export function terrainMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = U.wet;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uWet;
        varying vec3 vWP;
        float th(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float tn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(th(i), th(i + vec2(1.0, 0.0)), f.x), mix(th(i + vec2(0.0, 1.0)), th(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float camD = length(vWP - cameraPosition);
        float fine = 1.0 - smoothstep(14.0, 40.0, camD);
        float green = smoothstep(0.0, 0.05, diffuseColor.g - diffuseColor.r);
        float nv = (tn(vWP.xz * 0.33 + 7.0) - 0.5) * 0.16 + (tn(vWP.xz * 1.6) - 0.5) * 0.12 * (0.4 + 0.6 * fine) + (tn(vWP.xz * vec2(7.0, 2.2) + 3.0) - 0.5) * 0.1 * fine;
        diffuseColor.rgb *= (1.0 + nv * mix(0.45, 1.0, green)) * (1.0 - 0.18 * uWet);`);
  };
  m.customProgramCacheKey = () => 'terrain';
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
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat stp = fract(vStrip.y * 3.0 - uTime * uSpeed * 3.0 + abs(vStrip.x - 0.5) * 0.9);\nfloat edge = smoothstep(0.42, 0.5, abs(vStrip.x - 0.5));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.078, 0.082), step(0.8, stp) * (1.0 - edge));');
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
  vec3 base = vec3(0.17, 0.32, 0.29);
  vec3 col = mix(base, vec3(0.7, 0.79, 0.75), smoothstep(0.55, 1.0, s) * 0.55 + edge * 0.35);
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
