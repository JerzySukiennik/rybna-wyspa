// Rybna Wyspa: the local player's hands (aim at fish, pick up, throw, dump, magnet, manual pumps, the stack held in front of the camera).

import * as THREE from 'three';
import { G, groups } from '../sim/physics.js';
import { upVal } from '../data/progress.js';
import { slotsOf } from '../sim/value.js';

const tmp = new THREE.Vector3();
const dir = new THREE.Vector3();
const eye = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const q = new THREE.Quaternion();
const m = new THREE.Matrix4();

export class Hands {
  constructor(game) {
    this.g = game;
    this.hover = null;
    this.hoverBlock = null;
    this.sweepT = 0;
    this.magT = 0;
    this.pending = new Map();
    this.viewHands = game.models.buildViewHands();
    this.viewHands.traverse((o) => { o.frustumCulled = false; o.renderOrder = 2; });
    this.viewHands.visible = false;
    game.camera.add(this.viewHands);
    this.wob = 0;
  }

  reach() { return upVal(this.g.store.state.up, 'zasieg'); }

  aim() {
    const g = this.g;
    g.player.eyePos(eye);
    g.player.forward(dir);
    return { eye, dir };
  }

  rayBlock(maxD) {
    const g = this.g;
    const R = g.phys.R;
    const ray = new R.Ray(eye, dir);
    const hit = g.phys.world.castRayAndGetNormal(ray, maxD, true, undefined, groups(G.PLAYER, G.WORLD));
    if (!hit) return null;
    const t = hit.timeOfImpact ?? hit.toi;
    return { t, n: hit.normal, col: hit.collider, block: g.blocks.blockAtCollider(hit.collider) };
  }

  update(dt, inp, active) {
    const g = this.g;
    this.aim();
    const reach = this.reach();
    const stack = g.myStack();
    const cap = upVal(g.store.state.up, 'stos');
    let used = 0;
    for (const f of stack) used += slotsOf(f);
    let prompt = '';
    this.hover = null;
    this.hoverBlock = null;
    if (active) {
      const wall = this.rayBlock(reach + 0.5);
      const hit = g.fishView.pick(eye, dir, Math.min(reach, wall ? wall.t + 0.4 : reach), (r) => this.pending.has(r.id) || g.isHeldId(r.id));
      if (hit) {
        this.hover = hit.id;
        prompt = used < cap ? '<kbd>LPM</kbd>weź' : 'Stos pełny, <kbd>Q</kbd>wysyp albo <kbd>PPM</kbd>rzuć';
      } else if (wall && wall.block && wall.block.def.manual && wall.t < reach) {
        this.hoverBlock = wall.block;
        prompt = '<kbd>LPM</kbd>pompuj';
      } else if (g.nearShop()) {
        prompt = '<kbd>E</kbd>sklep';
      }
      if (stack.length && !prompt) prompt = g.nearSell() ? '<kbd>Q</kbd>wysyp do skupu <kbd>PPM</kbd>rzuć' : '';
    }
    g.fishView.setHover(this.hover);
    g.hud.hot(!!this.hover || !!this.hoverBlock);
    if (active) g.hud.prompt(prompt);

    if (active) {
      for (const k of inp.pressed) {
        if (k === 'Mouse0') {
          if (this.hover != null) this.pick(this.hover);
          else if (this.hoverBlock) { g.authority.click(this.hoverBlock.id); g.audio.play('pump_manual', { pos: this.hoverBlock.pos, vol: 0.8 }); this.hoverBlock.pulse = 1; }
          this.sweepT = 0.18;
        }
        if (k === 'Mouse2') this.throwOne();
        if (k === 'KeyQ') this.dump();
      }
      if (g.input.left) {
        this.sweepT -= dt;
        if (this.sweepT <= 0) {
          this.sweepT = 0.14;
          if (this.hover != null && used < cap) this.pick(this.hover);
          else if (this.hoverBlock) { g.authority.click(this.hoverBlock.id); this.hoverBlock.pulse = 1; }
        }
      }
      const mag = upVal(g.store.state.up, 'magnes');
      this.magT -= dt;
      if (mag > 0 && this.magT <= 0 && used < cap) {
        this.magT = 0.22;
        const feet = g.player.feet;
        let best = null, bd = mag * mag;
        for (const r of g.fishView.recs.values()) {
          if (this.pending.has(r.id) || g.isHeldId(r.id)) continue;
          if (Math.abs(r.p.y - feet.y - 0.6) > 1.6) continue;
          const d = (r.p.x - feet.x) ** 2 + (r.p.z - feet.z) ** 2;
          if (d < bd) { bd = d; best = r; }
        }
        if (best) this.pick(best.id, true);
      }
    }
    for (const [id, t] of this.pending) if (g.time - t > 1.2) this.pending.delete(id);
  }

  pick(id, quiet) {
    const g = this.g;
    if (this.pending.has(id)) return;
    this.pending.set(id, g.time);
    g.authority.pick(id);
    if (!quiet) g.audio.play('pickup', { vol: 0.7 });
    else g.audio.play('pickup', { vol: 0.35 });
  }

  throwOne() {
    const g = this.g;
    if (!g.myStack().length) return;
    this.aim();
    const power = 7.5 * upVal(g.store.state.up, 'rzut');
    const origin = eye.clone().addScaledVector(dir, 0.55).add(new THREE.Vector3(0, -0.18, 0));
    const vel = dir.clone().multiplyScalar(power).add(new THREE.Vector3(g.player.vel.x, 1.2, g.player.vel.z));
    g.authority.throw(origin, vel);
    g.audio.play('throw', { vol: 0.6 });
  }

  dump() {
    const g = this.g;
    if (!g.myStack().length) return;
    this.aim();
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    let origin = eye.clone().addScaledVector(flat, 0.7).add(new THREE.Vector3(0, -0.45, 0));
    const sell = g.nearSell();
    if (sell) {
      const to = new THREE.Vector3(sell.pos.x - eye.x, 0, sell.pos.z - eye.z);
      if (to.length() < 4) { flat.copy(to.normalize()); origin = eye.clone().addScaledVector(flat, 0.8).add(new THREE.Vector3(0, -0.2, 0)); }
    }
    g.authority.dump(origin, flat);
    g.audio.play('dump', { vol: 0.8 });
  }

  frame(dt) {
    const g = this.g;
    const stack = g.myStack();
    const vh = this.viewHands;
    const show = g.selSlot === 0 && g.playing && !g.photo;
    vh.visible = show && stack.length > 0;
    this.wob += dt * (2 + g.player.speedNow * 1.4);
    const sway = Math.sin(this.wob) * 0.012 * Math.min(1, g.player.speedNow / 4);
    vh.position.set(sway, Math.abs(Math.cos(this.wob)) * 0.01 * Math.min(1, g.player.speedNow / 4), 0);
    const cam = g.camera;
    let y = -0.3;
    let i = 0;
    for (const f of stack) {
      const r = g.fishView.recs.get(f.id);
      if (!r) continue;
      if (!show || i >= 14) { r.visible = false; r.p.set(0, -60, 0); g.fishView.place(r); i++; continue; }
      r.visible = true;
      const th = Math.max(0.03, r.L * r.dims.w * r.fat);
      const lean = Math.sin(this.wob * 0.5 + i * 0.7) * 0.02 * Math.min(1, i / 4);
      tmp.set(sway + lean * i * 0.3, y + th / 2, -0.52 - Math.min(0.25, r.L * 0.15));
      tmp.applyMatrix4(cam.matrixWorld);
      q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, (i % 2 ? 0.12 : -0.1) + lean, 'XYZ'));
      q.premultiply(cam.quaternion);
      r.p.copy(tmp);
      r.q.copy(q);
      g.fishView.place(r);
      y += th * 0.9;
      i++;
    }
  }
}
