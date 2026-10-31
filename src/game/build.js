// Rybna Wyspa: build mode (0.5 m grid by default, Alt for free placement, rotation kept in world space, magnets to free belt and flume ends and spawner outlets, hologram with footprint, grid and port markers, undo).

import * as THREE from 'three';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { blockVisual, blockPorts, BELT_TOP } from '../blocks/defs.js';
import { G, groups } from '../sim/physics.js';
import { upVal } from '../data/progress.js';
import { coastDist } from '../world/island.js';
import { U } from '../render/materials.js';

const GRID = 0.5;
const Q90 = Math.PI / 2;
const Q15 = Math.PI / 12;
const TILT_STEP = (5 * Math.PI) / 180;
const LINE = ['belt', 'flume', 'machine', 'slide'];
const E = new THREE.Euler();
const eye = new THREE.Vector3();
const dir = new THREE.Vector3();
const tv = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const HOLO_V = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vY = w.y;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HOLO_F = /* glsl */`
uniform vec3 uCol;
uniform float uTime;
uniform float uA;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float scan = smoothstep(0.7, 1.0, sin(vY * 24.0 - uTime * 3.0) * 0.5 + 0.5);
  gl_FragColor = vec4(uCol * (0.75 + 0.75 * f + 0.2 * scan), uA * (0.2 + 0.62 * f + 0.1 * scan));
}`;

const FLAT_V = /* glsl */`
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const GRID_F = /* glsl */`
uniform vec3 uCol;
uniform vec3 uC;
uniform float uA;
varying vec3 vW;
void main() {
  vec2 q = vW.xz / ${GRID.toFixed(2)};
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float a = line * (1.0 - smoothstep(0.8, 2.6, length(vW.xz - uC.xz))) * uA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uCol, a);
}`;

const FOOT_F = /* glsl */`
uniform vec3 uCol;
uniform float uA;
uniform vec2 uSize;
varying vec2 vUv;
void main() {
  vec2 m = min(vUv, 1.0 - vUv) * uSize;
  float edge = 1.0 - smoothstep(0.035, 0.06, min(m.x, m.y));
  float dash = step(0.45, fract((vUv.x * uSize.x + vUv.y * uSize.y) * 3.0));
  gl_FragColor = vec4(uCol, uA * (0.1 + edge * (0.45 + 0.45 * dash)));
}`;

function holoMat(col, a = 1) {
  return new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(col) }, uTime: U.time, uA: { value: a } }, vertexShader: HOLO_V, fragmentShader: HOLO_F, transparent: true, depthWrite: false });
}

const COL = { ok: '#3fc2b2', bad: '#d9534f', none: '#b9c2cc', del: '#e8743c' };

function snapAngle(a, step) {
  return Math.round(a / step) * step;
}

function family(def) {
  return LINE.includes(def.kind) ? 'line' : def.kind;
}

export function newBlockId() {
  return 'b' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36).padStart(3, '0');
}

export class Build {
  constructor(game) {
    this.g = game;
    this.rot = null;
    this.tilt = 0;
    this.history = [];
    this.ghost = new THREE.Group();
    this.ghost.visible = false;
    this.mats = { ok: holoMat(COL.ok), bad: holoMat(COL.bad), none: holoMat(COL.none, 0.8) };
    this.ghostType = null;
    this.ghostMesh = null;
    this.footMat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(COL.ok) }, uA: { value: 1 }, uSize: { value: new THREE.Vector2(1, 1) } }, vertexShader: FLAT_V, fragmentShader: FOOT_F, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.footMat);
    this.foot.renderOrder = 1;
    this.ghost.add(this.foot);
    this.inMark = this.makeRing(0.11, 0.16, '#f5eedd');
    this.outMark = this.makeChevron('#f5eedd');
    this.ghost.add(this.inMark, this.outMark);
    game.scene.add(this.ghost);
    this.gridMat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color('#f5eedd') }, uC: { value: new THREE.Vector3() }, uA: { value: 0.42 } }, vertexShader: FLAT_V, fragmentShader: GRID_F, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.grid = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), this.gridMat);
    this.grid.renderOrder = 1;
    this.grid.visible = false;
    game.scene.add(this.grid);
    this.portMarks = [];
    for (let i = 0; i < 18; i++) {
      const m = this.makeRing(0.09, 0.14, COL.ok);
      m.visible = false;
      game.scene.add(m);
      this.portMarks.push(m);
    }
    this.delMesh = new THREE.Mesh(new THREE.BufferGeometry(), holoMat(COL.del, 0.9));
    this.delMesh.visible = false;
    this.delMesh.renderOrder = 3;
    this.delType = null;
    game.scene.add(this.delMesh);
    this.cur = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), on: false };
    this.place = null;
  }

  makeRing(r0, r1, col) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false }));
    m.renderOrder = 4;
    return m;
  }

  makeChevron(col) {
    const s = new THREE.Shape();
    s.moveTo(-0.17, 0.06); s.lineTo(0, -0.12); s.lineTo(0.17, 0.06); s.lineTo(0.17, 0.13); s.lineTo(0, -0.04); s.lineTo(-0.17, 0.13); s.closePath();
    const geo = new THREE.ShapeGeometry(s).rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 4;
    return m;
  }

  setType(t) {
    if (t === this.ghostType) return;
    this.ghostType = t;
    if (this.ghostMesh) { this.ghost.remove(this.ghostMesh); this.ghostMesh = null; }
    this.cur.on = false;
    if (!t) { this.ghost.visible = false; return; }
    const def = BLOCK_BY_ID[t];
    this.ghostMesh = new THREE.Mesh(blockVisual(t).body, this.mats.ok);
    this.ghostMesh.renderOrder = 2;
    this.ghost.add(this.ghostMesh);
    const [w, , l] = def.dim;
    this.foot.scale.set(w, 1, l);
    this.foot.position.set(0, 0.03, 0);
    this.footMat.uniforms.uSize.value.set(w, l);
    const ports = blockPorts(def);
    const pin = ports.find((x) => x.io === 'in'), pout = ports.find((x) => x.io === 'out');
    this.inMark.visible = !!pin;
    this.outMark.visible = !!pout;
    const sp = def.kind === 'spawner' ? blockVisual(t).spawn : null;
    if (sp) {
      this.outMark.visible = true;
      this.outMark.position.set(sp.outlet[0], BELT_TOP + 0.05, sp.outlet[2] - 0.1);
      this.outMark.rotation.set(0, 0, 0);
    }
    if (pin) this.inMark.position.set(pin.p[0], pin.p[1] + 0.14, pin.p[2]);
    if (pout) {
      this.outMark.position.set(pout.p[0], pout.p[1] + 0.14, pout.p[2]);
      this.outMark.rotation.set(0, Math.atan2(-pout.d[0], -pout.d[2]), 0);
    }
  }

  reach() { return upVal(this.g.store.state.up, 'zasieg') + 2; }

  initRot() {
    this.rot = snapAngle(this.g.player.yaw, Q90);
    this.tilt = 0;
  }

  portFree(port, ownerId) {
    return !this.g.blocks.nearPort(port.p, port.io === 'out' ? 'in' : 'out', 0.14, ownerId);
  }

  candidatePorts(p) {
    const out = [];
    for (const b of this.g.blocks.blocks.values()) {
      if (b.pos.distanceToSquared(p) > 49) continue;
      for (const port of b.ports) if (this.portFree(port, b.id)) out.push({ b, port });
      if (b.def.kind === 'spawner' && b.vel) {
        const fwd = tv.set(b.vel.x, 0, b.vel.z).normalize().clone();
        const depth = b.def.dim[2] / 2 + 0.03;
        const pp = b.pos.clone().addScaledVector(fwd, depth);
        pp.y = b.pos.y + BELT_TOP;
        const port = { io: 'out', p: pp, d: fwd, feed: true };
        if (!this.g.blocks.nearPort(pp, 'in', 0.3, b.id)) out.push({ b, port });
      }
    }
    return out;
  }

  snapTo(def, p, aim, radius) {
    const mine = blockPorts(def);
    const pin = mine.find((x) => x.io === 'in'), pout = mine.find((x) => x.io === 'out');
    if (!pin && !pout) return null;
    let best = null, bestScore = Infinity;
    for (const c of this.candidatePorts(p)) {
      const my = c.port.io === 'out' ? pin : pout;
      if (!my) continue;
      const d = c.port.p.distanceTo(p) - (c.b === aim ? 0.9 : 0) - (c.port.io === 'out' ? 0.25 : 0);
      if (d > radius || d >= bestScore) continue;
      bestScore = d;
      best = { ...c, my };
    }
    if (!best) return null;
    const md = new THREE.Vector3(...best.my.d);
    const heading = (v) => Math.atan2(-v.x, -v.z);
    const yaw = heading(best.port.d) - heading(md);
    const tilt = Math.abs(md.z) > 0.5 && !best.port.feed ? Math.asin(Math.max(-1, Math.min(1, best.port.d.y))) : 0;
    const quat = new THREE.Quaternion().setFromEuler(E.set(tilt, yaw, 0, 'YXZ'));
    const pos = best.port.p.clone().sub(new THREE.Vector3(...best.my.p).applyQuaternion(quat));
    return { pos, quat, yaw, tilt, snapped: best.b.id, port: best.port };
  }

  groundUnder(def, pos, quat) {
    const [w, , l] = def.dim;
    let h = this.g.groundAt(pos.x, pos.z);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      tv.set(sx * w * 0.42, 0, sz * l * 0.42).applyQuaternion(quat).add(pos);
      h = Math.max(h, this.g.groundAt(tv.x, tv.z));
    }
    return h;
  }

  compute(type, free) {
    const g = this.g;
    const def = BLOCK_BY_ID[type];
    const R = g.phys.R;
    g.player.eyePos(eye);
    g.player.forward(dir);
    const hit = g.phys.world.castRayAndGetNormal(new R.Ray(eye, dir), this.reach(), true, undefined, groups(G.PLAYER, G.WORLD));
    if (!hit) return null;
    const p = eye.clone().addScaledVector(dir, hit.timeOfImpact ?? hit.toi);
    const n = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
    const aim = g.blocks.blockAtCollider(hit.collider);
    if (this.rot == null) this.initRot();
    const isLine = family(def) === 'line';
    const snap = isLine ? this.snapTo(def, p, aim, free ? 0.9 : 1.5) : null;
    if (snap) return { ...snap, ok: this.valid(def, snap.pos, snap.quat), aim };
    const yaw = free ? snapAngle(this.rot, Q15) : snapAngle(this.rot, Q90);
    const tilt = this.tilt;
    const quat = new THREE.Quaternion().setFromEuler(E.set(tilt, yaw, 0, 'YXZ'));
    const pos = p.clone();
    const [w, , l] = def.dim;
    const onSolid = aim && aim.def.kind === 'solid';
    if (onSolid && n.y < 0.55) {
      const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(quat), az = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
      pos.addScaledVector(n, Math.abs(n.dot(ax)) * w / 2 + Math.abs(n.dot(az)) * l / 2 + 0.01);
      pos.y = aim.pos.y;
    }
    if (!free) {
      pos.x = snapAngle(pos.x, GRID);
      pos.z = snapAngle(pos.z, GRID);
    }
    if (!onSolid) pos.y = this.groundUnder(def, pos, quat);
    const sell = g.structs.sell;
    if (!aim && sell && hit.collider.parent() === sell.body && Math.hypot(pos.x - sell.pos.x, pos.z - sell.pos.z) < 4.6) pos.y = Math.max(pos.y, sell.pos.y + 0.12);
    else if (!aim && n.y > 0.55 && g.isStructure(hit.collider)) pos.y = Math.max(pos.y, p.y);
    return { pos, quat, yaw, tilt, ok: this.valid(def, pos, quat), snapped: null, aim };
  }

  valid(def, pos, quat) {
    const g = this.g;
    if (coastDist(pos.x, pos.z) < -1.5) return 'Za daleko od brzegu';
    if (pos.y > 40) return 'Za wysoko';
    if (def.ghost) return true;
    const R = g.phys.R;
    const [w, h, l] = def.dim;
    const c = new THREE.Vector3(0, h / 2 + 0.03, 0).applyQuaternion(quat).add(pos);
    const shape = new R.Cuboid(Math.max(0.02, w / 2 - 0.06), Math.max(0.02, h / 2 - 0.06), Math.max(0.02, l / 2 - 0.06));
    let bad = null;
    g.phys.world.intersectionsWithShape(c, quat, shape, (col) => {
      if (col.parent() === g.phys.island) return true;
      if (g.isStructure(col)) {
        if (g.openBodies && g.openBodies.has(col.parent()) && !g.solidHandles.has(col.handle)) return true;
        bad = 'Tu stoi budynek';
        return false;
      }
      const b = g.blocks.blockAtCollider(col);
      if (b && !b.def.ghost) { bad = `Zajęte przez: ${b.def.name}`; return false; }
      return true;
    }, undefined, groups(G.PLAYER, G.WORLD));
    if (bad) return bad;
    const feet = g.player.feet;
    tv.copy(feet).sub(c).applyQuaternion(new THREE.Quaternion().copy(quat).invert());
    const inside = Math.abs(tv.x) < w / 2 + 0.25 && Math.abs(tv.z) < l / 2 + 0.25 && feet.y < pos.y + h && feet.y + 1.8 > pos.y;
    if (inside && h >= 0.35) return 'Stoisz w tym miejscu';
    return true;
  }

  update(dt, inp, type) {
    const g = this.g;
    this.setType(type);
    if (!type) { this.hide(); g.hud.buildHint(null); return; }
    const free = g.input.keys.has('AltLeft') || g.input.keys.has('AltRight');
    if (this.rot == null) this.initRot();
    for (const k of inp.pressed) {
      if (k === 'KeyR') this.rot = free ? snapAngle(this.rot, Q15) + Q15 : snapAngle(this.rot, Q90) + Q90;
      if (k === 'KeyT') this.rot = free ? snapAngle(this.rot, Q15) - Q15 : snapAngle(this.rot, Q90) - Q90;
      if (k === 'KeyZ') this.tilt = Math.max(-0.61, this.tilt - TILT_STEP);
      if (k === 'KeyX') this.tilt = Math.min(0.61, this.tilt + TILT_STEP);
      if (k === 'KeyC') this.initRot();
    }
    const pl = this.compute(type, free);
    this.place = pl;
    const have = (g.store.state.wh[type] || 0) > 0;
    if (!pl) {
      this.ghost.visible = false;
      this.grid.visible = false;
      this.cur.on = false;
    } else {
      const ok = pl.ok === true;
      const k = ok && have ? 'ok' : !have ? 'none' : 'bad';
      if (!this.cur.on || this.cur.pos.distanceTo(pl.pos) > 4) { this.cur.pos.copy(pl.pos); this.cur.quat.copy(pl.quat); this.cur.on = true; }
      const a = 1 - Math.exp(-dt * 26);
      this.cur.pos.lerp(pl.pos, a);
      this.cur.quat.slerp(pl.quat, a);
      this.ghost.visible = true;
      this.ghost.position.copy(this.cur.pos);
      this.ghost.quaternion.copy(this.cur.quat);
      if (this.ghostMesh) this.ghostMesh.material = this.mats[k];
      this.footMat.uniforms.uCol.value.set(COL[k]);
      this.grid.visible = !free && !pl.snapped;
      this.grid.position.set(snapAngle(pl.pos.x, GRID), pl.pos.y + 0.02, snapAngle(pl.pos.z, GRID));
      this.gridMat.uniforms.uC.value.copy(pl.pos);
    }
    this.showPorts(type, pl);
    g.hud.buildHint(BLOCK_BY_ID[type], free);
    const target = pl ? pl.aim : this.aimBlock();
    let prompt = '';
    if (!have) prompt = 'Brak w magazynie. Kup w sklepie (<kbd>E</kbd> przy straganie).';
    else if (pl && pl.ok !== true) prompt = pl.ok;
    else if (pl && pl.snapped) prompt = 'Połączone';
    const showDel = target && !(pl && pl.ok === true && have);
    this.showDelete(showDel ? target : null);
    if (target) prompt = (prompt ? prompt + ' · ' : '') + `<kbd>PPM</kbd>zdejmij ${target.def.name}`;
    g.hud.prompt(prompt);
    for (const k of inp.pressed) {
      if (k === 'Mouse0' && pl) this.tryPlace(type, pl, have);
      if (k === 'Mouse2' && target) this.pickUp(target);
    }
  }

  showPorts(type, pl) {
    const def = BLOCK_BY_ID[type];
    let n = 0;
    if (family(def) === 'line' && pl) {
      const t = this.g.time;
      for (const c of this.candidatePorts(pl.pos)) {
        if (n >= this.portMarks.length) break;
        const m = this.portMarks[n++];
        m.visible = true;
        m.position.set(c.port.p.x, c.port.p.y + 0.06, c.port.p.z);
        const hot = pl.port && pl.port.p.distanceTo(c.port.p) < 0.01;
        m.scale.setScalar(hot ? 1.5 + Math.sin(t * 8) * 0.15 : 1 + Math.sin(t * 4 + n) * 0.08);
        m.material.color.set(hot ? '#f5eedd' : c.port.io === 'out' ? COL.ok : '#9fd8cf');
      }
    }
    for (let i = n; i < this.portMarks.length; i++) this.portMarks[i].visible = false;
  }

  showDelete(b) {
    if (!b) { this.delMesh.visible = false; return; }
    if (this.delType !== b.rec.t) { this.delMesh.geometry = blockVisual(b.rec.t).body; this.delType = b.rec.t; }
    this.delMesh.visible = true;
    this.delMesh.position.copy(b.pos);
    this.delMesh.quaternion.copy(b.quat);
    this.delMesh.scale.setScalar(1.015);
  }

  hide() {
    this.ghost.visible = false;
    this.grid.visible = false;
    this.delMesh.visible = false;
    for (const m of this.portMarks) m.visible = false;
    this.place = null;
    this.cur.on = false;
  }

  aimBlock() {
    const g = this.g;
    const R = g.phys.R;
    g.player.eyePos(eye);
    g.player.forward(dir);
    const hit = g.phys.world.castRay(new R.Ray(eye, dir), this.reach(), true, undefined, groups(G.PLAYER, G.WORLD));
    if (!hit) return null;
    return g.blocks.blockAtCollider(hit.collider);
  }

  tryPlace(type, pl, have) {
    const g = this.g;
    if (!have) { g.hud.toast('Brak tego bloku w magazynie. Kup go w sklepie.', 'err'); g.audio.play('deny'); return; }
    if (pl.ok !== true) { g.hud.toast(pl.ok, 'err'); g.audio.play('deny'); return; }
    const rec = { id: newBlockId(), t: type, x: +pl.pos.x.toFixed(3), y: +pl.pos.y.toFixed(3), z: +pl.pos.z.toFixed(3), ry: +pl.yaw.toFixed(4), rp: +pl.tilt.toFixed(4) };
    g.store.place(rec).then((ok) => {
      if (!ok) { g.audio.play('deny'); return; }
      this.remember({ k: 'place', id: rec.id, name: BLOCK_BY_ID[type].name });
      g.blocks.pop(rec.id);
      g.fx.burst('dust', pl.pos.clone().add(UP.clone().multiplyScalar(0.08)), 10, 0.9);
    });
    g.audio.play(['spawner', 'belt', 'machine', 'funnel', 'sell', 'lamp'].includes(BLOCK_BY_ID[type].kind) ? 'place_metal' : 'place_wood', { pos: pl.pos });
  }

  pickUp(b) {
    const g = this.g;
    const name = b.def.name;
    const pos = b.pos.clone();
    g.store.remove(b.id).then((tid) => {
      if (!tid) return;
      this.remember({ k: 'remove', tid, name });
      g.fx.burst('dust', pos.add(UP.clone().multiplyScalar(0.1)), 12, 1);
    });
    g.audio.play('remove', { pos: b.pos });
  }

  remember(e) {
    this.history.push(e);
    if (this.history.length > 40) this.history.shift();
  }

  undoLast() {
    const g = this.g;
    const e = this.history.pop();
    if (!e) { g.hud.toast('Nie ma czego cofnąć.'); return; }
    if (e.k === 'place') {
      if (!g.blocks.blocks.has(e.id)) { g.hud.toast('Tego bloku już nie ma.'); return; }
      g.store.remove(e.id, true).then((ok) => {
        if (ok) { g.hud.toast(`Cofnięto: postawienie (${e.name})`); g.audio.play('remove'); }
      });
    } else {
      g.store.restore(e.tid).then((ok) => {
        if (ok) { g.hud.toast(`Cofnięto: zdjęcie (${e.name})`); g.audio.play('place_wood'); }
        else g.hud.toast('Nie da się cofnąć, ktoś już przywrócił ten blok.', 'err');
      });
    }
  }
}
