// Rybna Wyspa: build mode (hologram, free placement with Shift snapping, belt-end magnets, validity checks, placing and picking up blocks).

import * as THREE from 'three';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { blockVisual, blockPorts } from '../blocks/defs.js';
import { G, groups } from '../sim/physics.js';
import { upVal } from '../data/progress.js';
import { coastDist } from '../world/island.js';

const E = new THREE.Euler();
const eye = new THREE.Vector3();
const dir = new THREE.Vector3();
const STEP_YAW = Math.PI / 12;
const STEP_TILT = (5 * Math.PI) / 180;

function family(def) {
  return def.kind === 'flume' ? 'water' : 'dry';
}

export function newBlockId() {
  return 'b' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36).padStart(3, '0');
}

export class Build {
  constructor(game) {
    this.g = game;
    this.yawOff = 0;
    this.tilt = 0;
    this.ghost = new THREE.Group();
    this.ghostMat = new THREE.MeshBasicMaterial({ color: '#5fd068', transparent: true, opacity: 0.45, depthWrite: false });
    this.badMat = new THREE.MeshBasicMaterial({ color: '#e5484d', transparent: true, opacity: 0.45, depthWrite: false });
    this.greyMat = new THREE.MeshBasicMaterial({ color: '#b9c2cc', transparent: true, opacity: 0.4, depthWrite: false });
    this.ghostType = null;
    this.ghostMesh = null;
    this.arrow = this.makeArrow();
    this.ghost.add(this.arrow);
    this.ghost.visible = false;
    game.scene.add(this.ghost);
    this.place = null;
    this.hl = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#ffffff'));
    this.hl.visible = false;
    game.scene.add(this.hl);
  }

  makeArrow() {
    const s = new THREE.Shape();
    s.moveTo(-0.12, 0.3); s.lineTo(0.12, 0.3); s.lineTo(0.12, -0.05); s.lineTo(0.25, -0.05); s.lineTo(0, -0.35); s.lineTo(-0.25, -0.05); s.lineTo(-0.12, -0.05); s.closePath();
    const geo = new THREE.ShapeGeometry(s);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 3;
    return m;
  }

  setType(t) {
    if (t === this.ghostType) return;
    this.ghostType = t;
    if (this.ghostMesh) { this.ghost.remove(this.ghostMesh); this.ghostMesh = null; }
    if (!t) { this.ghost.visible = false; return; }
    this.ghostMesh = new THREE.Mesh(blockVisual(t).body, this.ghostMat);
    this.ghostMesh.renderOrder = 2;
    this.ghost.add(this.ghostMesh);
    const def = BLOCK_BY_ID[t];
    const moving = ['belt', 'flume', 'slide', 'machine'].includes(def.kind);
    this.arrow.visible = moving;
    this.arrow.position.set(0, def.dim[1] + 0.12, 0);
  }

  reach() { return upVal(this.g.store.state.up, 'zasieg') + 2; }

  compute(type, snap) {
    const g = this.g;
    const def = BLOCK_BY_ID[type];
    const R = g.phys.R;
    g.player.eyePos(eye);
    g.player.forward(dir);
    const hit = g.phys.world.castRayAndGetNormal(new R.Ray(eye, dir), this.reach(), true, undefined, groups(G.PLAYER, G.WORLD));
    if (!hit) return null;
    const t = hit.timeOfImpact ?? hit.toi;
    const p = eye.clone().addScaledVector(dir, t);
    const n = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
    const [w, h, l] = def.dim;
    let yaw = g.player.yaw + this.yawOff;
    let tilt = this.tilt;
    if (snap) {
      yaw = Math.round(yaw / (Math.PI / 4)) * (Math.PI / 4);
      tilt = Math.round(tilt / (STEP_TILT * 2)) * (STEP_TILT * 2);
    }
    const quat = new THREE.Quaternion().setFromEuler(E.set(tilt, yaw, 0, 'YXZ'));
    const pos = p.clone();
    if (n.y < 0.55) {
      const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(quat), az = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
      const half = Math.abs(n.dot(ax)) * w / 2 + Math.abs(n.dot(az)) * l / 2;
      pos.addScaledVector(n, half + 0.01);
      pos.y -= h / 2;
      const ground = g.groundAt(pos.x, pos.z);
      if (pos.y < ground) pos.y = ground;
    }
    if (snap) {
      pos.x = Math.round(pos.x * 2) / 2;
      pos.z = Math.round(pos.z * 2) / 2;
    }
    let snapped = null;
    const ports = blockPorts(def);
    const pin = ports.find((x) => x.io === 'in'), pout = ports.find((x) => x.io === 'out');
    if (pin || pout) {
      const mat = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
      const radius = snap ? 1.6 : 0.9;
      const tryPort = (mine, io) => {
        if (!mine) return null;
        const wp = new THREE.Vector3(...mine.p).applyMatrix4(mat);
        const near = g.blocks.nearPort(wp, io, radius);
        if (!near) return null;
        return { mine, near };
      };
      const s = tryPort(pin, 'out') || tryPort(pout, 'in');
      if (s) {
        const target = s.near.port;
        const md = new THREE.Vector3(...s.mine.d);
        const heading = (v) => Math.atan2(-v.x, -v.z);
        yaw = heading(target.d) - heading(md);
        tilt = Math.abs(md.z) > 0.5 ? Math.asin(Math.max(-1, Math.min(1, target.d.y))) : 0;
        quat.setFromEuler(E.set(tilt, yaw, 0, 'YXZ'));
        const keepY = pos.y;
        pos.copy(target.p).sub(new THREE.Vector3(...s.mine.p).applyQuaternion(quat));
        if (family(def) !== family(s.near.b.def)) pos.y = keepY;
        snapped = s.near.b.id;
      }
    }
    const ok = this.valid(def, pos, quat);
    return { pos, quat, yaw, tilt, ok, snapped };
  }

  valid(def, pos, quat) {
    const g = this.g;
    if (coastDist(pos.x, pos.z) < -1.5) return false;
    if (pos.y > 40) return false;
    if (def.ghost) return true;
    const R = g.phys.R;
    const [w, h, l] = def.dim;
    const c = new THREE.Vector3(0, h / 2 + 0.03, 0).applyQuaternion(quat).add(pos);
    const shape = new R.Cuboid(Math.max(0.02, w / 2 - 0.06), Math.max(0.02, h / 2 - 0.06), Math.max(0.02, l / 2 - 0.06));
    let bad = false;
    g.phys.world.intersectionsWithShape(c, quat, shape, (col) => {
      if (col.parent() === g.phys.island) return true;
      if (g.isStructure(col)) { bad = true; return false; }
      const b = g.blocks.blockAtCollider(col);
      if (b && !b.def.ghost) { bad = true; return false; }
      return true;
    }, undefined, groups(G.PLAYER, G.WORLD));
    if (bad) return false;
    const feet = g.player.feet;
    const dx = feet.x - c.x, dz = feet.z - c.z;
    const inside = Math.abs(dx) < w / 2 + 0.2 && Math.abs(dz) < l / 2 + 0.2 && feet.y < pos.y + h && feet.y + 1.8 > pos.y;
    return !inside || def.dim[1] < 0.35;
  }

  update(dt, inp, type) {
    const g = this.g;
    this.setType(type);
    if (!type) { this.ghost.visible = false; this.hl.visible = false; this.place = null; g.hud.buildHint(null); return; }
    const snap = g.input.keys.has('ShiftLeft') || g.input.keys.has('ShiftRight');
    for (const k of inp.pressed) {
      if (k === 'KeyR') this.yawOff += snap ? Math.PI / 2 : STEP_YAW;
      if (k === 'KeyT') this.yawOff -= snap ? Math.PI / 2 : STEP_YAW;
      if (k === 'KeyZ') this.tilt = Math.max(-0.61, this.tilt - (snap ? STEP_TILT * 2 : STEP_TILT));
      if (k === 'KeyX') this.tilt = Math.min(0.61, this.tilt + (snap ? STEP_TILT * 2 : STEP_TILT));
      if (k === 'KeyC') { this.yawOff = 0; this.tilt = 0; }
    }
    const pl = this.compute(type, snap);
    this.place = pl;
    const have = (g.store.state.wh[type] || 0) > 0;
    if (!pl) { this.ghost.visible = false; } else {
      this.ghost.visible = true;
      this.ghost.position.copy(pl.pos);
      this.ghost.quaternion.copy(pl.quat);
      if (this.ghostMesh) this.ghostMesh.material = !have ? this.greyMat : pl.ok ? this.ghostMat : this.badMat;
    }
    g.hud.buildHint(BLOCK_BY_ID[type], snap);
    let prompt = have ? '' : 'Brak w magazynie. Kup w sklepie (<kbd>E</kbd> przy straganie).';
    if (pl && pl.snapped && have) prompt = 'Połączone z taśmą';
    const target = this.aimBlock();
    this.hl.visible = !!target && !(pl && pl.ok && !inp.pressed.includes('Mouse2'));
    if (target) {
      const b3 = new THREE.Box3().setFromObject(new THREE.Mesh(blockVisual(target.rec.t).body));
      b3.applyMatrix4(target.mat);
      this.hl.box.copy(b3);
      this.hl.visible = true;
      if (!prompt) prompt = `<kbd>PPM</kbd>zdejmij ${target.def.name}`;
    }
    g.hud.prompt(prompt);
    for (const k of inp.pressed) {
      if (k === 'Mouse0' && pl) this.tryPlace(type, pl, have);
      if (k === 'Mouse2' && target) this.pickUp(target);
    }
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
    if (!pl.ok) { g.audio.play('deny'); return; }
    const rec = { id: newBlockId(), t: type, x: +pl.pos.x.toFixed(3), y: +pl.pos.y.toFixed(3), z: +pl.pos.z.toFixed(3), ry: +pl.yaw.toFixed(4), rp: +pl.tilt.toFixed(4) };
    g.store.place(rec).then((ok) => {
      if (ok) g.audio.play(['spawner', 'belt', 'machine', 'funnel', 'sell', 'lamp'].includes(BLOCK_BY_ID[type].kind) ? 'place_metal' : 'place_wood', { pos: pl.pos });
      else g.audio.play('deny');
    });
  }

  pickUp(b) {
    const g = this.g;
    g.store.remove(b.id).then((ok) => { if (ok) g.audio.play('remove', { pos: b.pos }); });
  }
}
