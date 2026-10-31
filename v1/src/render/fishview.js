// Rybna Wyspa: instanced fish rendering (bend animation, trait tints/patterns/glow, metallic variants, accessories, hover outline, picking).

import * as THREE from 'three';
import { SPECIES, RARITIES } from '../data/species.js';
import { TRAITS } from '../data/traits.js';
import { Instancer } from './instancer.js';
import { Geo } from './geo.js';
import { U } from './materials.js';
import { bodyLength, fatOf } from '../sim/value.js';

const COMMON_V = /* glsl */`
attribute float aBend;
attribute float aGlow;
attribute vec4 iTint;
attribute vec4 iEmi;
attribute vec4 iMisc;
attribute vec4 iMove;
uniform float uTime;
varying vec4 vTint;
varying vec4 vEmi;
varying vec4 vMisc;
varying float vGlow;
varying float vRar;
varying vec3 vObj;`;

const BEND = /* glsl */`
vec3 transformed = vec3(position);
float age = uTime - iMisc.z;
float amp = max(exp(-age * 2.4) * 0.24, iMove.x * 0.11) + 0.012;
float freq = mix(10.0, 7.0, iMove.x);
transformed.z += sin(aBend * 3.4 - uTime * freq + iMisc.w * 6.2831) * amp * aBend * aBend;
if (abs(iMisc.x - 3.0) < 0.5) transformed = floor(transformed * 13.0 + 0.5) / 13.0;
vObj = transformed;
vTint = iTint; vEmi = iEmi; vMisc = iMisc; vGlow = aGlow; vRar = iMove.z;`;

const COMMON_F = /* glsl */`
uniform float uTime;
uniform vec3 uRar[7];
varying float vRar;
varying vec4 vTint;
varying vec4 vEmi;
varying vec4 vMisc;
varying float vGlow;
varying vec3 vObj;
float fh(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
vec3 hsv(float h, float s, float v) { vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }
float bayer(vec2 p) { vec2 f = mod(floor(p), 4.0); float b = mod(f.x + f.y * 2.0, 4.0); return (b + mod(f.y, 2.0) * 0.5) / 4.0; }`;

const PATTERNS = /* glsl */`
vec3 base = diffuseColor.rgb;
float lum = dot(base, vec3(0.3, 0.55, 0.15));
base = mix(base, vTint.rgb * (0.55 + lum * 0.9), vTint.a);
int pat = int(vMisc.x + 0.5);
int vari = int(vMisc.y + 0.5);
vec3 extraEmi = vec3(0.0);
if (pat == 1) base *= mix(1.0, 0.55, step(0.55, fract(vObj.x * 9.0)) * step(-0.01, vObj.y));
else if (pat == 2) base = mix(base, base * 0.35, step(0.8, fh(floor(vObj * 17.0))));
else if (pat == 4) { float sp = fh(floor(vObj * 21.0)); extraEmi += vec3(0.7, 0.95, 1.0) * step(0.93, fract(sp + uTime * 0.35)) * 0.9; }
else if (pat == 5) { if (bayer(gl_FragCoord.xy) > 0.5) discard; }
else if (pat == 6) { float h = fh(floor(vObj * 9.0)) + floor(uTime * 4.0) * 0.37; base = hsv(fract(h), 0.8, 1.0); }
else if (pat == 7) { base = mix(vec3(0.05, 0.03, 0.14), vec3(0.28, 0.13, 0.55), vObj.y * 2.0 + 0.5); extraEmi += vec3(step(0.975, fh(vec3(floor(gl_FragCoord.xy / 3.0), 1.0)))); }
else if (pat == 8) { float n = abs(sin(vObj.x * 34.0 + sin(vObj.y * 41.0 + vObj.z * 30.0) * 2.2)); extraEmi += vec3(1.0, 0.36, 0.0) * step(0.9, n) * 2.0; }
else if (pat == 9) base *= mix(1.0, 0.3, step(0.82, fract((vObj.x + vObj.y * 1.5) * 9.0)));
else if (pat == 10) base = mix(base, vec3(1.0, 0.97, 0.98), step(0.5, fract((vObj.x - vObj.y) * 7.0)));
else if (pat == 11) base = mix(base, vec3(1.0), step(0.86, fh(floor(vObj * 55.0))));
else if (pat == 12) base = mix(base, vec3(0.9, 0.96, 1.0), 0.45 * step(0.0, vObj.y) + 0.5 * step(0.9, fh(floor(vObj * 40.0))));
else if (pat == 13) base = mix(base, vec3(0.62, 0.58, 0.52), 0.55 + 0.3 * fh(floor(vObj * 25.0)));
else if (pat == 14) { vec3 au = mix(vec3(0.2, 1.0, 0.55), vec3(0.62, 0.3, 1.0), 0.5 + 0.5 * sin(vObj.x * 11.0 + uTime * 1.6)); base = mix(base, au, 0.7); extraEmi += au * 0.4; }
float vMetal = 0.0;
float vRough = 0.72;
if (vari == 1) { base = mix(base, vec3(0.86, 0.9, 0.95), 0.72); vMetal = 0.85; vRough = 0.4; }
else if (vari == 2) { base = mix(base, vec3(1.0, 0.74, 0.22), 0.82); vMetal = 0.95; vRough = 0.42; }
else if (vari == 3) { vec3 rb = hsv(fract(vObj.x * 1.4 + vObj.y + uTime * 0.22), 0.75, 1.0); base = mix(base, rb, 0.82); vMetal = 0.55; vRough = 0.42; extraEmi += rb * 0.18; }
else if (vRar > 1.5) { vMetal = 0.25; vRough = 0.52; }
diffuseColor.rgb = base;`;

export function fishMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0, envMapIntensity: 1 });
  const rar = { value: RARITIES.map((r) => new THREE.Color(r.color)) };
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.uniforms.uRar = rar;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON_V)
      .replace('#include <begin_vertex>', BEND);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + COMMON_F)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + PATTERNS)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMetal;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vRough;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmi.rgb * vEmi.a * (0.78 + 0.22 * sin(uTime * 3.0 + vMisc.w * 30.0)) + diffuseColor.rgb * vGlow * 1.4 + extraEmi;\nint rI = int(vRar + 0.5);\nfloat rimK = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.4);\nif (rI >= 2) totalEmissiveRadiance += uRar[rI] * rimK * (0.22 + 0.1 * float(rI - 2)) * (0.85 + 0.15 * sin(uTime * 2.2 + vMisc.w * 20.0));');
  };
  m.customProgramCacheKey = () => 'fish-v2';
  return m;
}

const OUT_V = /* glsl */`
uniform float uTime;
uniform vec4 uMisc;
uniform float uSwim;
uniform float uPush;
uniform vec2 uRes;
attribute float aBend;
void main() {
  vec3 p = position;
  float age = uTime - uMisc.z;
  float amp = max(exp(-age * 2.4) * 0.24, uSwim * 0.11) + 0.012;
  float freq = mix(10.0, 7.0, uSwim);
  p.z += sin(aBend * 3.4 - uTime * freq + uMisc.w * 6.2831) * amp * aBend * aBend;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec3 nv = normalize(normalMatrix * normal);
  vec2 nc = (projectionMatrix * vec4(nv, 0.0)).xy;
  float nl = length(nc);
  if (nl > 1e-5) clip.xy += nc / nl * uPush * 2.0 / uRes * clip.w;
  gl_Position = clip;
}`;

const ACC = {};
function accGeo(kind) {
  if (ACC[kind]) return ACC[kind];
  const g = new Geo();
  if (kind === 'crown') {
    g.ring(0, 0, 0, 0.28, 0.34, 0.12, 8, '#ffc93c', { top: '#ffe08a' });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.cyl(Math.cos(a) * 0.31, 0.12, Math.sin(a) * 0.31, 0.06, 0, 0.14, 4, '#ffc93c'); }
    g.box(0, 0.06, 0.32, 0.06, 0.06, 0.02, '#ff5fd2', { emit: 0.5 });
  } else if (kind === 'pirate') {
    g.cyl(0, 0, 0, 0.42, 0.36, 0.06, 3, '#1d1d22', { rot: Math.PI / 2 });
    g.cyl(0, 0.06, 0, 0.26, 0.2, 0.2, 8, '#1d1d22');
    g.box(0, 0.16, -0.21, 0.12, 0.08, 0.02, '#f3f5f7');
  } else {
    g.box(0, 0, 0, 1, 1, 1, '#d9f4ff');
  }
  ACC[kind] = g.geometry();
  return ACC[kind];
}

function visualOf(meta) {
  let tint = null, tintM = -1, emi = null, emiS = 0, pat = 0, patM = -1, acc = [];
  for (const i of meta.tr) {
    const t = TRAITS[i];
    if (t.tint && t.m > tintM) { tint = t; tintM = t.m; }
    if (t.emi && t.emiK * t.m > emiS) { emi = t; emiS = t.emiK * t.m; }
    if (t.pat && t.m > patM) { pat = t.pat; patM = t.m; }
    if (t.acc) acc.push(t.acc);
  }
  const tc = tint ? new THREE.Color(tint.tint) : null;
  const ec = emi ? new THREE.Color(emi.emi) : null;
  return {
    tint: tc ? [tc.r, tc.g, tc.b, tint.tintK] : [0, 0, 0, 0],
    emi: ec ? [ec.r, ec.g, ec.b, emi.emiK] : [0, 0, 0, 0],
    pat, acc,
  };
}

const m4 = new THREE.Matrix4();
const sc = new THREE.Vector3();
const tq = new THREE.Quaternion();
const tp = new THREE.Vector3();
const inv = new THREE.Matrix4();
const ro = new THREE.Vector3();
const rd = new THREE.Vector3();

export class FishView {
  constructor(scene, models) {
    this.scene = scene;
    this.models = models;
    this.mat = fishMaterial();
    this.inst = new Map();
    this.recs = new Map();
    this.acc = {};
    this.accMat = {
      crown: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 1, roughness: 0.3 }),
      pirate: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      icecube: new THREE.MeshStandardMaterial({ color: '#cdefff', transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.1, depthWrite: false }),
    };
    this.outline = null;
    this.outlineMat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uMisc: { value: new THREE.Vector4() }, uSwim: { value: 0 }, uPush: { value: 3 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
      vertexShader: OUT_V,
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.97, 0.95, 0.88, 1.0); }',
      side: THREE.BackSide,
    });
    this.outlineGeos = new Map();
    this.hover = null;
  }

  instancer(sp) {
    if (this.inst.has(sp)) return this.inst.get(sp);
    const geo = this.models.fishGeometry(SPECIES[sp].id);
    const ins = new Instancer(this.scene, geo, this.mat, { cap: 32, cull: false, attrs: { iTint: 4, iEmi: 4, iMisc: 4, iMove: 4 } });
    this.inst.set(sp, ins);
    return ins;
  }

  accInst(kind) {
    if (this.acc[kind]) return this.acc[kind];
    this.acc[kind] = new Instancer(this.scene, accGeo(kind), this.accMat[kind], { cap: 16, cull: false, shadow: kind !== 'icecube' });
    return this.acc[kind];
  }

  upsert(id, meta) {
    let r = this.recs.get(id);
    if (r && r.sp !== meta.sp) { this.remove(id); r = null; }
    if (!r) {
      r = { id, sp: meta.sp, p: new THREE.Vector3(0, -50, 0), q: new THREE.Quaternion(), flopAt: -10, swim: 0, seed: (id * 0.6180339) % 1, visible: true, acc: [] };
      this.recs.set(id, r);
      this.instancer(meta.sp).add(id, null);
    }
    r.meta = meta;
    r.L = bodyLength(meta);
    r.fat = fatOf(meta);
    r.dims = this.models.fishDims(SPECIES[meta.sp].id);
    const vis = visualOf(meta);
    r.pat = vis.pat;
    const ins = this.instancer(meta.sp);
    ins.attr(id, 'iTint', vis.tint);
    ins.attr(id, 'iEmi', vis.emi);
    ins.attr(id, 'iMisc', [vis.pat, meta.v || 0, r.flopAt, r.seed]);
    r.rar = SPECIES[meta.sp].rarity;
    ins.attr(id, 'iMove', [r.swim, r.L, r.rar, 0]);
    for (const k of r.acc) this.accInst(k).remove(id);
    r.acc = vis.acc;
    for (const k of r.acc) this.accInst(k).add(id, null);
    this.place(r);
    return r;
  }

  remove(id) {
    const r = this.recs.get(id);
    if (!r) return;
    this.instancer(r.sp).remove(id);
    for (const k of r.acc) this.accInst(k).remove(id);
    this.recs.delete(id);
    if (this.hover === id) this.setHover(null);
  }

  flop(id, t) {
    const r = this.recs.get(id);
    if (!r) return;
    r.flopAt = t;
    this.instancer(r.sp).attr(id, 'iMisc', [r.pat, r.meta.v || 0, t, r.seed]);
  }

  swim(id, on) {
    const r = this.recs.get(id);
    if (!r || r.swim === on) return;
    r.swim = on;
    this.instancer(r.sp).attr(id, 'iMove', [on, r.L, r.rar || 0, 0]);
  }

  pose(id, p, q) {
    const r = this.recs.get(id);
    if (!r) return;
    r.p.copy(p);
    r.q.copy(q);
    this.place(r);
  }

  place(r) {
    const hk = r.held ? 0.6 : 1;
    sc.set(r.L * hk, r.L * r.fat * hk, r.L * r.fat * hk);
    m4.compose(r.p, r.q, sc);
    this.instancer(r.sp).set(r.id, m4);
    for (const k of r.acc) {
      if (k === 'icecube') {
        sc.set(r.L * 1.08, r.L * r.dims.h * r.fat * 1.5 + 0.04, r.L * r.dims.w * r.fat * 2.2 + 0.05);
        m4.compose(r.p, r.q, sc);
      } else {
        tp.set(r.L * 0.2, r.L * r.dims.h * 0.5 * r.fat + 0.01, 0).applyQuaternion(r.q).add(r.p);
        const s = Math.max(0.08, r.L * 0.38);
        sc.set(s, s, s);
        m4.compose(tp, r.q, sc);
      }
      this.accInst(k).set(r.id, m4);
    }
    if (this.hover === r.id && this.outline) this.outline.matrix.compose(r.p, r.q, sc.set(r.L * hk, r.L * r.fat * hk, r.L * r.fat * hk));
  }

  setHover(id) {
    if (this.hover === id) return;
    this.hover = id;
    if (this.outline) { this.scene.remove(this.outline); this.outline = null; }
    const r = id != null ? this.recs.get(id) : null;
    if (!r) { this.hover = null; return; }
    let og = this.outlineGeos.get(r.sp);
    if (!og) {
      const src = this.models.fishGeometry(SPECIES[r.sp].id);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', src.attributes.position.clone());
      g.setAttribute('aBend', src.attributes.aBend.clone());
      og = toSmooth(g);
      this.outlineGeos.set(r.sp, og);
    }
    const mesh = new THREE.Mesh(og, this.outlineMat);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    this.outline = mesh;
    this.scene.add(mesh);
    this.outlineMat.uniforms.uRes.value.set(innerWidth, innerHeight);
    this.place(r);
  }

  frame() {
    if (this.hover != null && this.outline) {
      const r = this.recs.get(this.hover);
      if (r) {
        this.outlineMat.uniforms.uMisc.value.set(r.pat, 0, r.flopAt, r.seed);
        this.outlineMat.uniforms.uSwim.value = r.swim;
      }
    }
  }

  pick(origin, dir, maxD, skip) {
    let best = null, bd = maxD;
    for (const r of this.recs.values()) {
      if (!r.visible || (skip && skip(r))) continue;
      tp.copy(r.p).sub(origin);
      const along = tp.dot(dir);
      if (along < -1 || along > maxD + r.L) continue;
      const perp2 = tp.lengthSq() - along * along;
      const rad = r.L * 0.6 + 0.12;
      if (perp2 > rad * rad) continue;
      sc.set(r.L, r.L * r.fat, r.L * r.fat);
      inv.compose(r.p, r.q, sc).invert();
      ro.copy(origin).applyMatrix4(inv);
      rd.copy(dir).applyQuaternion(tq.copy(r.q).invert()).divide(sc);
      const pad = 0.08 / r.L;
      const t = rayBox(ro, rd, 0.5 + pad, r.dims.h * 0.6 + pad, r.dims.w * 0.9 + pad * 1.5);
      if (t === null) continue;
      if (t < bd) { bd = t; best = r; }
    }
    return best ? { id: best.id, dist: bd, rec: best } : null;
  }
}

function rayBox(o, d, hx, hy, hz) {
  let tmin = -Infinity, tmax = Infinity;
  for (const [oc, dc, h] of [[o.x, d.x, hx], [o.y, d.y, hy], [o.z, d.z, hz]]) {
    if (Math.abs(dc) < 1e-9) { if (oc < -h || oc > h) return null; continue; }
    let t1 = (-h - oc) / dc, t2 = (h - oc) / dc;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return tmin > 0 ? tmin : 0;
}

function toSmooth(g) {
  const pos = g.attributes.position, bend = g.attributes.aBend;
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const map = new Map();
  const P = [], B = [], idx = [];
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let j = map.get(k);
    if (j === undefined) { j = P.length / 3; map.set(k, j); P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); B.push(bend.getX(i)); }
    idx.push(j);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('aBend', new THREE.Float32BufferAttribute(B, 1));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}
