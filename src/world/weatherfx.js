// Rybna Wyspa: on-screen weather (slanted rain streaks and snow around the camera, lightning, meteors, rainbow arc, fireflies over the reeds at night).

import * as THREE from 'three';
import { coastDist } from './island.js';
import { rng } from '../util.js';

const RAIN = 4000;
const SNOW = 1400;
const FLIES = 140;

const RAIN_V = /* glsl */`
attribute vec4 aOff;
uniform float uT;
uniform vec3 uCam;
uniform float uSpeed;
uniform vec3 uDir;
varying float vA;
varying float vT;
void main() {
  float s = mod(aOff.y + uT * uSpeed, 32.0);
  vec3 p = vec3(mod(aOff.x - uCam.x + 24.0, 48.0) - 24.0 + uCam.x, uCam.y + 18.0, mod(aOff.z - uCam.z + 24.0, 48.0) - 24.0 + uCam.z) + uDir * s;
  vec3 view = normalize(cameraPosition - p);
  vec3 side = normalize(cross(uDir, view));
  float len = aOff.w;
  vec3 wp = p + side * position.x * 0.03 - uDir * position.y * len;
  float d = distance(wp, cameraPosition);
  vA = smoothstep(0.6, 2.0, d) * (1.0 - smoothstep(14.0, 26.0, d));
  vT = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const RAIN_F = /* glsl */`
uniform float uK;
uniform vec3 uCol;
varying float vA;
varying float vT;
void main() {
  gl_FragColor = vec4(uCol, 0.55 * uK * vA * (1.0 - vT * 0.65));
}`;

export class WeatherFx {
  constructor(scene) {
    this.scene = scene;
    const r = rng(512);
    const quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    const off = new Float32Array(RAIN * 4);
    for (let i = 0; i < RAIN; i++) off.set([(r() - 0.5) * 48, r() * 32, (r() - 0.5) * 48, 0.5 + r() * 0.35], i * 4);
    quad.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    quad.instanceCount = RAIN;
    const slant = Math.tan((12 * Math.PI) / 180);
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uK: { value: 0 }, uSpeed: { value: 14 }, uDir: { value: new THREE.Vector3(slant * 0.8, -1, slant * 0.6).normalize() }, uCol: { value: new THREE.Color('#c6ced6') } },
      vertexShader: RAIN_V, fragmentShader: RAIN_F, transparent: true, depthWrite: false,
    });
    this.rain = new THREE.Mesh(quad, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.rain.renderOrder = 6;
    scene.add(this.rain);

    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(SNOW * 3);
    for (let i = 0; i < SNOW; i++) sp.set([(r() - 0.5) * 50, r() * 24, (r() - 0.5) * 50], i * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snowMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uK: { value: 0 } },
      vertexShader: `uniform float uT; uniform vec3 uCam; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uT * 1.6, 24.0); p.x = mod(p.x + sin(uT * 0.7 + p.y) * 0.6 - uCam.x + 25.0, 50.0) - 25.0 + uCam.x; p.z = mod(p.z - uCam.z + 25.0, 50.0) - 25.0 + uCam.z; p.y += uCam.y - 6.0;
        vec4 mv = viewMatrix * vec4(p, 1.0); vA = smoothstep(0.5, 1.5, -mv.z) * (1.0 - smoothstep(8.0, 25.0, length(mv.xyz))); gl_PointSize = min(7.0, 50.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; if (length(d) > 0.5) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, 0.85 * uK * vA); }`,
      transparent: true, depthWrite: false,
    });
    this.snow = new THREE.Points(sg, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    scene.add(this.snow);

    const fg = new THREE.BufferGeometry();
    const fp = new Float32Array(FLIES * 3);
    let n = 0;
    while (n < FLIES) {
      const a = r() * Math.PI * 2, d = 14 + r() * 16;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const s = coastDist(x, z);
      if (s < -2.5 || s > 3) continue;
      fp.set([x, 0.35 + r() * 1.3, z], n * 3);
      n++;
    }
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    this.flyMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: `uniform float uT; varying float vB;
        void main(){ vec3 p = position; float ph = uT * 0.35 + fract(sin(p.x * 12.9 + p.z * 7.1) * 43758.5) * 40.0;
        p += vec3(sin(ph * 1.3) * 0.8, sin(ph * 2.1) * 0.25, cos(ph * 1.1) * 0.8);
        vB = pow(max(0.0, sin(ph * 3.0 + p.x)), 6.0);
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_PointSize = clamp(26.0 / max(1.0, -mv.z), 1.5, 7.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vB; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * (0.6 + vB * 1.6), uK * (0.25 + vB * 0.75) * smoothstep(0.5, 0.0, r)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.flies = new THREE.Points(fg, this.flyMat);
    this.flies.frustumCulled = false;
    this.flies.visible = false;
    scene.add(this.flies);

    const arc = new THREE.TorusGeometry(380, 16, 6, 48, Math.PI);
    const cols = [];
    const pos = arc.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const rr = Math.hypot(x, y);
      c.setHSL(((rr - 364) / 32) * 0.8, 0.75, 0.62);
      cols.push(c.r, c.g, c.b);
    }
    arc.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.bowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.bow = new THREE.Mesh(arc, this.bowMat);
    this.bow.position.set(-200, -60, -700);
    this.bow.rotation.y = 0.35;
    this.bow.renderOrder = -5;
    scene.add(this.bow);

    this.meteors = [];
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Line(mg.clone(), new THREE.LineBasicMaterial({ color: '#f4e6ff', transparent: true, opacity: 0, fog: false }));
      m.frustumCulled = false;
      scene.add(m);
      this.meteors.push({ m, t: -1, a: new THREE.Vector3(), b: new THREE.Vector3() });
    }
    this.k = { rain: 0, snow: 0, bow: 0, meteor: 0, flies: 0 };
    this.flash = 0;
    this.nextBolt = 6;
    this.onThunder = null;
  }

  update(id, dt, t, cam, night, light) {
    const tgt = { rain: 0, snow: 0, bow: 0, meteor: 0, flies: 0 };
    if (id === 'deszcz') tgt.rain = 0.75;
    if (id === 'burza') tgt.rain = 1;
    if (id === 'sniezyca') tgt.snow = 1;
    if (id === 'mroz') tgt.snow = 0.25;
    if (id === 'tecza') tgt.bow = 1;
    if (id === 'meteory') tgt.meteor = 1;
    if (night && !['deszcz', 'burza', 'sniezyca', 'mroz', 'wichura'].includes(id)) tgt.flies = 1;
    for (const k in tgt) this.k[k] += (tgt[k] - this.k[k]) * Math.min(1, dt * 0.6);
    this.rain.visible = this.k.rain > 0.02;
    const ru = this.rainMat.uniforms;
    ru.uK.value = this.k.rain;
    ru.uT.value = t;
    ru.uCam.value.copy(cam);
    ru.uSpeed.value = id === 'burza' ? 19 : 14;
    if (light) ru.uCol.value.set('#e4eaef').multiplyScalar(0.55 + Math.min(1, light.hemiI) * 0.45);
    this.snow.visible = this.k.snow > 0.02;
    this.snowMat.uniforms.uK.value = this.k.snow;
    this.snowMat.uniforms.uT.value = t;
    this.snowMat.uniforms.uCam.value.copy(cam);
    this.flies.visible = this.k.flies > 0.02;
    this.flyMat.uniforms.uK.value = this.k.flies;
    this.flyMat.uniforms.uT.value = t;
    this.bowMat.opacity = this.k.bow * 0.38;
    this.bow.visible = this.k.bow > 0.01;
    this.flash = Math.min(1, Math.max(0, this.flash - Math.max(0, dt) * 4));
    if (id === 'burza') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 5 + Math.random() * 11;
        this.flash = 1;
        if (this.onThunder) setTimeout(() => this.onThunder(), 300 + Math.random() * 1600);
      }
    }
    for (const s of this.meteors) {
      if (s.t < 0) {
        if (this.k.meteor > 0.3 && Math.random() < dt * 0.8) {
          s.t = 0;
          const a = Math.random() * Math.PI * 2;
          s.a.set(cam.x + Math.cos(a) * 300, 160 + Math.random() * 80, cam.z + Math.sin(a) * 300);
          s.b.set(s.a.x + (Math.random() - 0.5) * 220, s.a.y - 70 - Math.random() * 60, s.a.z + (Math.random() - 0.5) * 220);
        }
        continue;
      }
      s.t += dt * 1.5;
      const p = s.m.geometry.attributes.position;
      const h = Math.min(1, s.t), tl = Math.max(0, s.t - 0.35);
      p.setXYZ(0, s.a.x + (s.b.x - s.a.x) * tl, s.a.y + (s.b.y - s.a.y) * tl, s.a.z + (s.b.z - s.a.z) * tl);
      p.setXYZ(1, s.a.x + (s.b.x - s.a.x) * h, s.a.y + (s.b.y - s.a.y) * h, s.a.z + (s.b.z - s.a.z) * h);
      p.needsUpdate = true;
      s.m.material.opacity = Math.max(0, 1 - Math.max(0, s.t - 0.8) * 3);
      if (s.t > 1.2) { s.t = -1; s.m.material.opacity = 0; }
    }
    return this.flash;
  }
}
