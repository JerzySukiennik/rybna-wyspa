// Rybna Wyspa: first-person fisherman on a Rapier kinematic character controller (walk, sprint, jump, double jump, jetpack).

import * as THREE from 'three';
import { G, groups, GRAVITY } from '../sim/physics.js';
import { islandHeight } from '../world/island.js';

const HALF_H = 0.55;
const RAD = 0.33;
const EYE = 1.62;

export class Player {
  constructor(phys, camera) {
    const R = phys.R;
    this.phys = phys;
    this.camera = camera;
    this.feet = new THREE.Vector3(0, 2, 11);
    this.prevFeet = this.feet.clone();
    this.renderFeet = this.feet.clone();
    this.yaw = 0;
    this.pitch = -0.05;
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.grounded = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.stepDist = 0;
    this.bobT = 0;
    this.bobAmp = 0;
    this.speedNow = 0;
    this.sens = 1;
    this.runMul = 1;
    this.jumpMul = 1;
    this.maxJumps = 1;
    this.jumpsUsed = 0;
    this.maxFuel = 0;
    this.fuel = 0;
    this.jetting = false;
    this.airTime = 0;
    this.carry = 0;
    this.on = { step: null, land: null, jump: null };
    const bd = R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.feet.x, this.feet.y + HALF_H + RAD + 0.03, this.feet.z);
    this.body = phys.world.createRigidBody(bd);
    this.collider = phys.world.createCollider(R.ColliderDesc.capsule(HALF_H, RAD).setFriction(0).setCollisionGroups(groups(G.PLAYER, G.FISH)), this.body);
    this.kcc = phys.world.createCharacterController(0.02);
    this.kcc.enableAutostep(0.34, 0.18, false);
    this.kcc.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
    this.kcc.setMinSlopeSlideAngle((62 * Math.PI) / 180);
    this.kcc.setApplyImpulsesToDynamicBodies(false);
    this.filter = groups(G.PLAYER, G.WORLD);
  }

  get eye() { return EYE; }

  look(dx, dy) {
    const k = 0.0022 * this.sens;
    this.yaw -= dx * k;
    this.pitch = Math.max(-1.53, Math.min(1.53, this.pitch - dy * k));
  }

  forward(out) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  eyePos(out) {
    return out.set(this.renderFeet.x, this.renderFeet.y + EYE, this.renderFeet.z);
  }

  queueJump() { this.jumpBuffer = 0.14; }

  teleport(x, y, z) {
    this.feet.set(x, y, z);
    this.prevFeet.copy(this.feet);
    this.renderFeet.copy(this.feet);
    this.body.setTranslation({ x, y: y + HALF_H + RAD + 0.03, z }, true);
    this.body.setNextKinematicTranslation({ x, y: y + HALF_H + RAD + 0.03, z });
    this.phys.world.propagateModifiedBodyPositionsToColliders();
    this.vel.set(0, 0, 0);
    this.vy = 0;
  }

  fixedUpdate(dt, keys, frozen) {
    this.prevFeet.copy(this.feet);
    const f = frozen ? 0 : (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const s = frozen ? 0 : (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
    const wl = Math.hypot(wx, wz);
    const spd = (sprint ? 7.6 : 4.9) * this.runMul * (1 - this.carry * 0.25);
    if (wl > 0) { wx = (wx / wl) * spd; wz = (wz / wl) * spd; }
    const k = Math.min(1, dt * (this.grounded ? 14 : 3.5));
    this.vel.x += (wx - this.vel.x) * k;
    this.vel.z += (wz - this.vel.z) * k;
    this.jumpBuffer -= dt;
    this.coyote = this.grounded ? 0.1 : this.coyote - dt;
    if (this.grounded) { this.jumpsUsed = 0; this.airTime = 0; } else this.airTime += dt;
    const jv = 6.6 * Math.sqrt(this.jumpMul);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = jv; this.jumpBuffer = 0; this.coyote = 0; this.jumpsUsed = 1;
      if (this.on.jump) this.on.jump(false);
    } else if (this.jumpBuffer > 0 && !this.grounded && this.coyote <= 0 && this.jumpsUsed < this.maxJumps) {
      this.vy = Math.max(this.vy, 0) * 0.3 + jv * 0.92; this.jumpBuffer = 0; this.jumpsUsed++;
      if (this.on.jump) this.on.jump(true);
    }
    this.jetting = this.maxFuel > 0 && keys.has('Space') && !this.grounded && this.fuel > 0 && this.airTime > 0.25;
    if (this.jetting) { this.fuel = Math.max(0, this.fuel - dt); this.vy = Math.min(this.vy + 30 * dt, 6); }
    else if (this.grounded) this.fuel = Math.min(this.maxFuel, this.fuel + dt * 1.2);
    this.vy = Math.max(-40, this.vy - GRAVITY * 1.35 * dt);
    const desired = { x: this.vel.x * dt, y: this.vy * dt, z: this.vel.z * dt };
    this.kcc.computeColliderMovement(this.collider, desired, undefined, this.filter);
    const mv = this.kcc.computedMovement();
    const was = this.grounded;
    this.grounded = this.kcc.computedGrounded();
    if (this.grounded && this.vy < 0) {
      if (!was && this.vy < -6 && this.on.land) this.on.land(Math.min(1, -this.vy / 18));
      this.vy = -0.5;
    }
    if (desired.y > 0.0001 && mv.y < desired.y * 0.4) this.vy = Math.min(this.vy, 0);
    const base = this.collider.translation();
    let nx = base.x + mv.x, ny = base.y - HALF_H - RAD + mv.y, nz = base.z + mv.z;
    if (islandHeight(nx, nz) < -0.35 && ny < 0.2) { nx = this.feet.x; nz = this.feet.z; this.vel.multiplyScalar(0.2); }
    if (ny < -3) { ny = 3; this.vy = 0; nx = 0; nz = 11; }
    this.feet.set(nx, ny, nz);
    this.body.setNextKinematicTranslation({ x: nx, y: ny + HALF_H + RAD, z: nz });
    const hs = Math.hypot(mv.x, mv.z) / dt;
    this.speedNow = hs;
    if (this.grounded && hs > 1) {
      this.stepDist += hs * dt;
      if (this.stepDist > (sprint ? 2.1 : 1.6)) { this.stepDist = 0; if (this.on.step) this.on.step(); }
    }
  }

  applyCamera(alpha, dt, shake) {
    this.renderFeet.lerpVectors(this.prevFeet, this.feet, alpha);
    const moving = this.grounded && this.speedNow > 1;
    this.bobAmp += ((moving ? Math.min(1, this.speedNow / 8) : 0) - this.bobAmp) * Math.min(1, dt * 8);
    this.bobT += dt * (5 + this.speedNow * 1.1);
    const bob = Math.sin(this.bobT * 2) * 0.03 * this.bobAmp;
    const cam = this.camera;
    cam.position.set(this.renderFeet.x, this.renderFeet.y + EYE + bob, this.renderFeet.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(this.pitch + shake.y * 0.5, this.yaw + shake.x * 0.5, Math.cos(this.bobT) * 0.006 * this.bobAmp);
  }
}
