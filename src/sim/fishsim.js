// Rybna Wyspa: authoritative fish simulation (bodies, flopping, zones, freshness, traits, selling, losses).

import * as THREE from 'three';
import { SPECIES } from '../data/species.js';
import { TRAITS, TRAIT_BY_ID } from '../data/traits.js';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { WEATHERS, EXPOSE_EVERY, EXPOSE_CHANCE } from '../data/weather.js';
import { G, groups, GRAVITY } from './physics.js';
import { fishLength, fatOf, addTrait, hasTrait, fishValue } from './value.js';
import { curveTangent, FLUME_WATER } from '../blocks/defs.js';

export const FISH_CAP = 400;
const ICE_TIME = 12;
const COLD_TIME = 60;

const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const fwd = new THREE.Vector3();

export class FishSim {
  constructor(phys, dims, ctx) {
    this.phys = phys;
    this.R = phys.R;
    this.dims = dims;
    this.ctx = ctx;
    this.fish = new Map();
    this.byCol = new Map();
    this.nextId = 1;
    this.t = 0;
    this.rand = Math.random;
    this.metaDirty = new Set();
  }

  allocId() {
    for (let i = 0; i < 65535; i++) {
      const id = this.nextId;
      this.nextId = this.nextId >= 65000 ? 1 : this.nextId + 1;
      if (!this.fish.has(id) && !this.ctx.isHeld(id)) return id;
    }
    return -1;
  }

  count() { return this.fish.size + this.ctx.heldCount(); }

  makeBody(f, pos, rot, vel, spin) {
    const R = this.R;
    const S = SPECIES[f.sp];
    const L = fishLength(f);
    const d = this.dims(S.id);
    const fat = fatOf(f);
    const hx = L * 0.44, hy = Math.max(0.02, d.h * L * 0.5 * fat), hz = Math.max(0.015, d.w * L * 0.5 * fat);
    const r = Math.min(hy, hz) * 0.8;
    const kgEff = S.kg * Math.pow(f.w / S.kg, 0.6);
    const mass = Math.min(9, Math.max(0.12, 0.42 * Math.pow(kgEff, 0.45)));
    const frozen = hasTrait(f, 'zamrozona');
    let slip = S.slip;
    for (const t of f.tr) slip = Math.max(slip, TRAITS[t].slip);
    const bd = R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinearDamping(0.08).setAngularDamping(0.6);
    if (rot) bd.setRotation(rot);
    const body = this.phys.world.createRigidBody(bd);
    const cd = R.ColliderDesc.roundCuboid(Math.max(0.005, hx - r), Math.max(0.005, hy - r), Math.max(0.005, hz - r), r)
      .setTranslation(0, (d.cy || 0) * L * fat, 0)
      .setMass(mass).setFriction(frozen ? 0.03 : 0.6 * (1 - slip) + 0.04).setRestitution(S.bounce)
      .setCollisionGroups(groups(G.FISH, G.WORLD | G.FISH | G.PLAYER | G.SENSOR));
    const col = this.phys.world.createCollider(cd, body);
    if (vel) body.setLinvel(vel, true);
    if (spin) body.setAngvel(spin, true);
    f.body = body;
    f.col = col;
    f.L = L;
    f.hy = hy;
    f.mass = mass;
    f.zones = new Map();
    f.thrown = 0;
    this.byCol.set(col.handle, f);
  }

  spawn(rec, pos, vel, rot, spin) {
    const f = Object.assign({ id: rec.id ?? this.allocId(), tr: [], ups: [], up: 0, dry: 0, cold: 0, iceT: 0, by: null, born: this.t }, rec);
    if (f.id < 0) return null;
    f.tr = [...f.tr];
    f.ups = [...(f.ups || [])];
    f.nextFlop = this.t + 0.6 + this.rand() * 2;
    f.expT = this.rand() * EXPOSE_EVERY;
    f.special = this.t + 4 + this.rand() * 8;
    f.flopAt = -10;
    f.swim = 0;
    f.onIce = false;
    f.wet = false;
    this.makeBody(f, pos, rot || new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 * (this.rand() < 0.5 ? 1 : -1), this.rand() * 6.28, 0)), vel, spin);
    this.fish.set(f.id, f);
    this.ctx.onAdd(f);
    return f;
  }

  dropBody(f) {
    if (!f.body) return;
    this.byCol.delete(f.col.handle);
    this.phys.world.removeRigidBody(f.body);
    f.body = null;
    f.col = null;
    f.zones = new Map();
  }

  remove(id, reason, extra = {}) {
    const f = this.fish.get(id);
    if (!f) return null;
    if (f.body) { const p = f.body.translation(); extra.pos = { x: p.x, y: p.y, z: p.z }; }
    this.dropBody(f);
    this.fish.delete(id);
    this.ctx.onRemove(f, reason, extra);
    return f;
  }

  extract(id) {
    const f = this.fish.get(id);
    if (!f) return null;
    this.dropBody(f);
    this.fish.delete(id);
    return plain(f);
  }

  rebuild(f) {
    const p = f.body.translation(), r = f.body.rotation(), lv = f.body.linvel(), av = f.body.angvel();
    const pos = { x: p.x, y: p.y, z: p.z }, rot = { x: r.x, y: r.y, z: r.z, w: r.w }, vel = { x: lv.x, y: lv.y, z: lv.z }, spin = { x: av.x, y: av.y, z: av.z };
    this.dropBody(f);
    this.makeBody(f, pos, rot, vel, spin);
  }

  onZone(zone, colHandle, started) {
    const f = this.byCol.get(colHandle);
    if (!f) return;
    if (started) {
      f.zones.set(zone.handle, zone);
      if (zone.kind === 'machine') this.machine(f, zone);
      else if (zone.kind === 'sell') this.sell(f, zone);
    } else {
      f.zones.delete(zone.handle);
    }
  }

  machine(f, zone) {
    const id = zone.machine;
    if (f.ups.includes(id)) return;
    f.ups.push(id);
    const def = BLOCK_BY_ID[id];
    let ok = false;
    if (def.upgr) { f.up = (f.up || 0) + def.upgr; ok = true; }
    else if (def.trait && this.rand() < def.chance * Math.min(1.6, Math.sqrt(this.ctx.luck()))) {
      ok = addTrait(f, def.trait);
      if (ok && TRAIT_BY_ID[def.trait].scale !== 1) this.rebuild(f);
      if (ok && def.trait === 'zamrozona') this.rebuild(f);
    }
    this.metaDirty.add(f.id);
    this.ctx.onMachine(f, id, ok);
  }

  sell(f, zone) {
    if (f.sold) return;
    f.sold = true;
    const value = fishValue(f, this.ctx.mult());
    this.remove(f.id, 'sold', { value, zone: zone.tag, by: f.by });
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const weather = this.ctx.weather();
    const wtrait = WEATHERS[weather] && WEATHERS[weather].trait;
    const cool = this.ctx.coolHands();
    const lostY = -0.28;
    for (const f of this.fish.values()) {
      const b = f.body;
      if (!b) continue;
      const p = b.translation();
      if (p.y < lostY && !f.zones.size) { this.remove(f.id, p.y < -5 ? 'void' : 'lost'); continue; }
      let onIce = false, wet = false, inFlume = null, belt = null, slide = null;
      for (const z of f.zones.values()) {
        if (z.kind === 'ice') onIce = true;
        else if (z.kind === 'flume') { wet = true; inFlume = z; }
        else if (z.kind === 'wet') wet = true;
        else if (z.kind === 'belt') belt = z;
        else if (z.kind === 'slide') slide = z;
      }
      f.onIce = onIce;
      f.wet = wet;
      const S = SPECIES[f.sp];
      let decay = S.decay;
      for (const i of f.tr) decay *= TRAITS[i].decay;
      if (onIce) {
        f.cold = COLD_TIME;
        f.iceT += dt;
        if (f.iceT >= ICE_TIME && addTrait(f, 'ice')) { this.metaDirty.add(f.id); this.ctx.onTrait(f, 'ice'); }
      } else if (f.cold > 0) {
        f.cold -= dt;
      } else if (!wet && decay > 0) {
        f.dry += dt * decay;
      }
      if (inFlume) this.flume(f, b, inFlume, p, dt);
      else if (belt) this.belt(f, b, belt, p, dt);
      else if (slide) this.slideFx(b, slide, dt);
      if (!inFlume) this.flop(f, b, S, t, onIce);
      if (wtrait && (f.expT -= dt) <= 0) {
        f.expT = EXPOSE_EVERY;
        if (this.rand() < EXPOSE_CHANCE * this.ctx.luck() && !hasTrait(f, wtrait) && this.ctx.outdoors(p)) {
          if (addTrait(f, wtrait)) { this.metaDirty.add(f.id); this.ctx.onTrait(f, wtrait); }
        }
      }
      if (f.thrown > 0) { f.thrown -= dt; if (f.thrown <= 0) b.enableCcd(false); }
    }
  }

  belt(f, b, z, p, dt) {
    let dir;
    if (z.curve) {
      v3.set(p.x, p.y, p.z).applyMatrix4(z.inv);
      const tg = curveTangent(z.curve, v3.x, v3.z);
      if (tg.r < 0.42 || tg.r > 1.58) return;
      dir = v4.set(tg.x, 0, tg.z).applyQuaternion(z.qW);
    } else dir = z.dirW;
    const v = b.linvel();
    const n = z.upW;
    const vn = v.x * n.x + v.y * n.y + v.z * n.z;
    const k = 1 - Math.exp(-11 * dt);
    const sp = z.speed;
    const tx = v.x - vn * n.x, ty = v.y - vn * n.y, tz = v.z - vn * n.z;
    b.setLinvel({ x: v.x + (dir.x * sp - tx) * k, y: v.y + (dir.y * sp - ty) * k, z: v.z + (dir.z * sp - tz) * k }, true);
    const w = b.angvel();
    b.setAngvel({ x: w.x * 0.9, y: w.y * 0.9, z: w.z * 0.9 }, true);
  }

  flume(f, b, z, p, dt) {
    let dir;
    v3.set(p.x, p.y, p.z).applyMatrix4(z.inv);
    const depth = FLUME_WATER - v3.y;
    if (z.curve) {
      const tg = curveTangent(z.curve, v3.x, v3.z);
      dir = v4.set(tg.x, 0, tg.z).applyQuaternion(z.qW);
    } else dir = z.dirW;
    const v = b.linvel();
    let vy = v.y;
    if (depth > -0.08) {
      vy += GRAVITY * 1.32 * Math.min(1.6, Math.max(0, (depth + 0.08) / 0.16)) * dt;
      vy *= Math.exp(-5 * dt);
    }
    const k = 1 - Math.exp(-3.2 * dt);
    const sp = z.speed;
    b.setLinvel({ x: v.x + (dir.x * sp - v.x) * k, y: vy + (dir.y * sp - vy) * k * 0.3, z: v.z + (dir.z * sp - v.z) * k }, true);
    const r = b.rotation();
    q1.set(r.x, r.y, r.z, r.w);
    fwd.set(1, 0, 0).applyQuaternion(q1);
    v3.crossVectors(fwd, dir);
    const w = b.angvel();
    b.setAngvel({ x: w.x * 0.86 + v3.x * 0.5, y: w.y * 0.86 + v3.y * 0.5, z: w.z * 0.86 + v3.z * 0.5 }, true);
    f.swim = 1;
  }

  slideFx(b, z, dt) {
    const v = b.linvel();
    const d = z.dirW;
    b.setLinvel({ x: v.x + d.x * 2.4 * dt, y: v.y + d.y * 2.4 * dt, z: v.z + d.z * 2.4 * dt }, true);
  }

  flop(f, b, S, t, onIce) {
    if (t < f.nextFlop) return;
    let k = S.flop;
    for (const i of f.tr) k *= TRAITS[i].flop;
    const rate = S.rate * (hasTrait(f, 'skoczna') ? 1.6 : 1);
    f.nextFlop = t + (1.3 + this.rand() * 2.7) / rate;
    f.swim = 0;
    if (k <= 0) return;
    const v = b.linvel();
    if (v.x * v.x + v.y * v.y + v.z * v.z > 1.6) return;
    if (onIce) k *= 0.35;
    const m = f.mass;
    const a = this.rand() * Math.PI * 2;
    const hor = (0.5 + this.rand() * 1.1) * k;
    const upv = (1.9 + this.rand() * 1.5) * Math.min(1.5, k) * (S.special === 'wriggle' ? 0.45 : 1);
    b.applyImpulse({ x: Math.cos(a) * hor * m, y: upv * m, z: Math.sin(a) * hor * m }, true);
    const r = b.rotation();
    q1.set(r.x, r.y, r.z, r.w);
    fwd.set(1, 0, 0).applyQuaternion(q1);
    const spin = (this.rand() - 0.5) * 9 * Math.min(1.4, k);
    b.applyTorqueImpulse({ x: fwd.x * spin * m * f.L * 0.02 + (this.rand() - 0.5) * m * f.L * 0.05, y: (this.rand() - 0.5) * m * f.L * 0.12, z: fwd.z * spin * m * f.L * 0.02 }, true);
    f.flopAt = t;
    this.ctx.onFlop(f);
    if (S.special === 'rocket' && t > f.special) {
      f.special = t + 7 + this.rand() * 9;
      b.applyImpulse({ x: 0, y: 7.5 * m, z: 0 }, true);
      this.ctx.onSpecial(f, 'rocket');
    } else if (S.special === 'glitch' && t > f.special) {
      f.special = t + 5 + this.rand() * 7;
      const p = b.translation();
      const ga = this.rand() * Math.PI * 2, gd = 0.4 + this.rand() * 0.9;
      b.setTranslation({ x: p.x + Math.cos(ga) * gd, y: p.y + 0.25, z: p.z + Math.sin(ga) * gd }, true);
      this.ctx.onSpecial(f, 'glitch');
    }
  }

  launch(f, speed) {
    if (!f.body || speed < 6) return;
    f.body.enableCcd(true);
    f.thrown = 2;
  }
}

export function plain(f) {
  return { id: f.id, sp: f.sp, w: f.w, v: f.v, tr: [...f.tr], up: f.up || 0, ups: [...(f.ups || [])], dry: f.dry || 0, cold: f.cold || 0, iceT: f.iceT || 0, by: f.by || null, born: f.born || 0 };
}
