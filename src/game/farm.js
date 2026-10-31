// Rybna Wyspa: authoritative farm logic run by the leader (spawners, stacks, sales, album, quests, income rate, fish saves, offline earnings).

import * as THREE from 'three';
import { SPECIES, RARITIES } from '../data/species.js';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { upVal, levelOf, LEVELS, QUEST_KINDS } from '../data/progress.js';
import { weatherAt, dayPhase, isNight } from '../data/weather.js';
import { rollFish, fishValue, slotsOf } from '../sim/value.js';
import { FISH_CAP, plain } from '../sim/fishsim.js';
import { DECAY_RATE } from '../sim/value.js';

const OFFLINE_K = 0.5;
const OFFLINE_MAX = 12 * 3600;

export class Farm {
  constructor({ sim, blocks, store, clock, emit }) {
    this.sim = sim;
    this.blocks = blocks;
    this.store = store;
    this.clock = clock;
    this.emit = emit;
    this.stacks = new Map();
    this.nicks = new Map();
    this.sales = [];
    this.rate = 0;
    this.pendingCash = 0;
    this.flushT = 0;
    this.saveT = 0;
    this.rateT = 0;
    this.questT = 0;
    this.full = false;
    this.rand = Math.random;
  }

  get up() { return this.store.state.up; }
  luck() { return upVal(this.up, 'szczescie'); }
  mult() { return this.store.state.mult || 1; }
  cap(pid) { return upVal(this.up, 'stos'); }

  weather() {
    return weatherAt(this.clock() / 1000, this.store.state.seed).id;
  }

  night() {
    const w = this.weather();
    return isNight(dayPhase(this.clock() / 1000, this.store.state.seed)) || w === 'pelnia' || w === 'krwawy';
  }

  heldCount() {
    let n = 0;
    for (const s of this.stacks.values()) n += s.length;
    return n;
  }

  isHeld(id) {
    for (const s of this.stacks.values()) if (s.some((f) => f.id === id)) return true;
    return false;
  }

  stackSlots(pid) {
    const s = this.stacks.get(pid) || [];
    let n = 0;
    for (const f of s) n += slotsOf(f);
    return n;
  }

  spawnFrom(b, by) {
    if (this.sim.count() >= FISH_CAP) {
      if (!this.full) { this.full = true; this.emit('full', true); }
      return null;
    }
    const rec = rollFish(b.def, this.rand, { luck: this.luck(), weather: this.weather(), night: this.night() });
    rec.by = by || null;
    const jitter = new THREE.Vector3((this.rand() - 0.5) * 0.08, 0, (this.rand() - 0.5) * 0.08);
    const pos = b.outlet.clone().add(jitter);
    const vel = b.vel.clone().multiplyScalar(0.9 + this.rand() * 0.2);
    const spin = { x: (this.rand() - 0.5) * 2, y: (this.rand() - 0.5) * 1.5, z: (this.rand() - 0.5) * 2 };
    const yaw = Math.atan2(-b.vel.x, -b.vel.z);
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + Math.PI / 2, Math.PI / 2 * (this.rand() < 0.5 ? 1 : -1)));
    const f = this.sim.spawn(rec, pos, vel, rot, spin);
    if (!f) return null;
    b.pulse = 1;
    const S = SPECIES[f.sp];
    this.emit('spawn', { f, block: b.id });
    if (S.rarity >= 4 || f.v >= 2) this.emit('rare', { f, pos: pos.clone() });
    return f;
  }

  click(bid, pid) {
    const b = this.blocks.blocks.get(bid);
    if (!b || !b.def.manual) return false;
    const now = this.sim.t;
    if (now - (b.lastClick || -10) < b.def.cd) return false;
    b.lastClick = now;
    return !!this.spawnFrom(b, pid);
  }

  tickSpawners(dt) {
    const tempo = upVal(this.up, 'tempo');
    const room = this.sim.count() < FISH_CAP;
    if (room && this.full) { this.full = false; this.emit('full', false); }
    for (const b of this.blocks.blocks.values()) {
      if (b.def.kind !== 'spawner' || b.def.manual) continue;
      if (!room) continue;
      b.timer += dt;
      const every = b.def.every * tempo;
      if (b.timer >= every) { b.timer -= every; this.spawnFrom(b, null); }
    }
  }

  pick(pid, id) {
    const f = this.sim.fish.get(id);
    if (!f || f.sold) return false;
    const s = this.stacks.get(pid) || [];
    if (this.stackSlots(pid) + slotsOf(f) > this.cap(pid) && s.length) return false;
    if (slotsOf(f) > this.cap(pid) && s.length) return false;
    const rec = this.sim.extract(id);
    rec.by = pid;
    s.push(rec);
    this.stacks.set(pid, s);
    this.emit('stack', { pid, stack: s, picked: rec });
    return true;
  }

  throwOne(pid, origin, vel) {
    const s = this.stacks.get(pid);
    if (!s || !s.length) return null;
    const rec = s.pop();
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.rand() * 0.6, Math.atan2(-vel.x, -vel.z) + Math.PI / 2, Math.PI / 2));
    const f = this.sim.spawn(rec, origin, vel, rot, { x: (this.rand() - 0.5) * 4, y: (this.rand() - 0.5) * 2, z: (this.rand() - 0.5) * 4 });
    if (f) { f.by = pid; this.sim.launch(f, Math.hypot(vel.x, vel.y, vel.z)); }
    this.emit('stack', { pid, stack: s });
    return f;
  }

  dump(pid, origin, dir, target) {
    const s = this.stacks.get(pid);
    if (!s || !s.length) return 0;
    let n = 0;
    const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    while (s.length) {
      const rec = s.pop();
      const k = n++;
      const pos = origin.clone().addScaledVector(right, ((k % 3) - 1) * 0.25).add(new THREE.Vector3(0, Math.floor(k / 3) * 0.12, 0));
      let vel;
      if (target) {
        const aim = new THREE.Vector3(target.x + (this.rand() - 0.5) * 0.7, target.y, target.z + (this.rand() - 0.5) * 0.7);
        const d = aim.clone().sub(pos);
        const T = 0.55 + Math.hypot(d.x, d.z) * 0.07 + k * 0.02;
        vel = new THREE.Vector3(d.x / T, d.y / T + 0.5 * 12 * T, d.z / T);
      } else vel = dir.clone().multiplyScalar(2.2 + this.rand() * 0.8).add(new THREE.Vector3((this.rand() - 0.5) * 0.6, 1.6 + this.rand(), (this.rand() - 0.5) * 0.6));
      const f = this.sim.spawn(rec, pos, vel, null, { x: (this.rand() - 0.5) * 5, y: 0, z: (this.rand() - 0.5) * 5 });
      if (f) f.by = pid;
    }
    this.emit('stack', { pid, stack: s, dumped: n });
    return n;
  }

  dropStack(pid, at) {
    const s = this.stacks.get(pid);
    if (s && s.length && at) this.dump(pid, at, new THREE.Vector3(0, 0, 1));
    this.stacks.delete(pid);
  }

  tickHeld(dt) {
    const cool = upVal(this.up, 'lodowka');
    for (const s of this.stacks.values()) {
      for (const f of s) {
        if (f.cold > 0) { f.cold -= dt; continue; }
        if (cool) continue;
        const S = SPECIES[f.sp];
        f.dry += dt * S.decay;
      }
    }
  }

  onSold(f, value, by) {
    const st = this.store.state;
    this.pendingCash += value;
    this.sales.push({ t: this.sim.t, v: value });
    const S = SPECIES[f.sp];
    const fresh = this.store.album(f.sp, f.v, f.tr, f.w);
    const nick = by ? this.nicks.get(by) || 'Gracz' : null;
    if (by) this.store.stat(uidOf(by), nick, 'sold', 1);
    if (by) this.store.stat(uidOf(by), nick, 'earned', value);
    this.questProgress(f, value);
    this.emit('sold', { f: plain(f), value, by, nick, fresh });
    if (value >= Math.max(5000, this.rate * 0.5) || S.rarity >= 5) this.store.log('sale', `${S.name} za ${Math.round(value)} zł`);
  }

  tick(dt) {
    this.tickSpawners(dt);
    this.tickHeld(dt);
    this.flushT += dt;
    if (this.flushT > 0.5 && this.pendingCash > 0) {
      this.store.addCash(this.pendingCash, true);
      this.pendingCash = 0;
      this.flushT = 0;
    }
    this.rateT += dt;
    if (this.rateT > 2) {
      this.rateT = 0;
      const cut = this.sim.t - 60;
      while (this.sales.length && this.sales[0].t < cut) this.sales.shift();
      const sum = this.sales.reduce((a, s) => a + s.v, 0);
      const span = Math.min(60, Math.max(10, this.sim.t - (this.started || 0)));
      const inst = (sum / span) * 60;
      this.rate = this.rate * 0.7 + inst * 0.3;
      this.emit('rate', this.rate);
    }
    this.saveT += dt;
    if (this.saveT > 20) { this.saveT = 0; this.saveFish(); this.store.setRate(this.rate); this.store.pruneTrash && this.store.pruneTrash(); }
    this.questT += dt;
    if (this.questT > 3) { this.questT = 0; this.ensureQuests(); }
  }

  saveFish() {
    const out = [];
    for (const f of this.sim.fish.values()) {
      if (!f.body) continue;
      const p = f.body.translation(), q = f.body.rotation();
      out.push([f.sp, +f.w.toFixed(3), f.v, f.tr.join('.'), +(f.up || 0).toFixed(3), f.ups.join('.'), Math.round(f.dry), Math.round(f.cold), Math.round(f.iceT), +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3), +q.w.toFixed(3)]);
    }
    for (const s of this.stacks.values()) for (const f of s) out.push([f.sp, +f.w.toFixed(3), f.v, f.tr.join('.'), +(f.up || 0).toFixed(3), f.ups.join('.'), Math.round(f.dry), Math.round(f.cold), Math.round(f.iceT), 0, 1.5, 44, 0, 0, 0, 1]);
    this.store.saveFish(JSON.stringify(out));
  }

  loadFish(str) {
    let arr = [];
    try { arr = JSON.parse(str || '[]'); } catch (e) { arr = []; }
    let n = 0;
    for (const a of arr) {
      if (!Array.isArray(a) || a.length < 16 || !SPECIES[a[0]]) continue;
      const rec = { sp: a[0], w: a[1], v: a[2], tr: a[3] ? String(a[3]).split('.').map(Number).filter((x) => !Number.isNaN(x)) : [], up: a[4], ups: a[5] ? String(a[5]).split('.') : [], dry: a[6], cold: a[7], iceT: a[8] };
      const pos = new THREE.Vector3(a[9], a[10] + 0.05, a[11]);
      const rot = new THREE.Quaternion(a[12], a[13], a[14], a[15]).normalize();
      if (this.sim.spawn(rec, pos, null, rot)) n++;
      if (n >= FISH_CAP) break;
    }
    return n;
  }

  offline() {
    const st = this.store.state;
    if (!st.active || !st.rate) return 0;
    const gap = Math.min(OFFLINE_MAX, (Date.now() - st.active) / 1000);
    if (gap < 120) return 0;
    const earned = (st.rate / 60) * gap * OFFLINE_K;
    if (earned < 1) return 0;
    this.store.addCash(earned, true);
    this.store.log('offline', `Farma zarobiła ${Math.round(earned)} zł pod nieobecność`);
    this.emit('offline', { earned, gap });
    return earned;
  }

  ensureQuests() {
    const st = this.store.state;
    const q = st.quests || [];
    const live = q.filter((x) => !x.done);
    if (live.length >= 3 && live.length === q.length) return;
    const lvl = levelOf(st.earned);
    const next = live.slice();
    let guard = 0;
    while (next.length < 3 && guard++ < 20) next.push(this.makeQuest(lvl, next));
    this.store.setQuests(next);
  }

  makeQuest(lvl, existing) {
    const r = this.rand;
    const kinds = ['sell_n', 'sell_sp', 'sell_rar', 'sell_trait', 'earn', 'big'];
    if (lvl >= 3) kinds.push('sell_var');
    let kind;
    for (let i = 0; i < 10; i++) { kind = kinds[Math.floor(r() * kinds.length)]; if (!existing.some((e) => e.kind === kind)) break; }
    const base = Math.max(40, LEVELS[Math.min(LEVELS.length - 1, lvl)] * 0.06, this.rate * 2);
    const q = { id: Date.now().toString(36) + Math.floor(r() * 1e4), kind, prog: 0, done: false };
    const album = Object.keys(this.store.state.album).map(Number).filter((sp) => SPECIES[sp] && SPECIES[sp].rarity < 6);
    if (kind === 'sell_n') { q.n = 10 + lvl * 4; q.reward = base * 0.8; }
    else if (kind === 'sell_sp') { q.sp = album.length ? album[Math.floor(r() * album.length)] : 1; q.n = 3 + Math.floor(r() * 4); q.reward = base * 0.9; }
    else if (kind === 'sell_rar') { q.rar = Math.min(5, Math.max(1, Math.floor(lvl / 2.5))); q.n = 2 + Math.floor(r() * 3); q.reward = base * 1.2; }
    else if (kind === 'sell_trait') { q.n = 3 + Math.floor(r() * 5); q.reward = base * 1.1; }
    else if (kind === 'sell_var') { q.n = 1 + Math.floor(r() * 2); q.reward = base * 1.6; }
    else if (kind === 'earn') { q.n = Math.max(100, base * 2.2); q.reward = base; }
    else { q.n = Math.max(20, base * 0.25); q.reward = base * 1.3; }
    q.reward = Math.round(q.reward);
    return q;
  }

  questProgress(f, value) {
    const st = this.store.state;
    const q = st.quests || [];
    let ch = false;
    for (const x of q) {
      if (x.done) continue;
      const S = SPECIES[f.sp];
      let add = 0;
      if (x.kind === 'sell_n') add = 1;
      else if (x.kind === 'sell_sp' && f.sp === x.sp) add = 1;
      else if (x.kind === 'sell_rar' && S.rarity >= x.rar) add = 1;
      else if (x.kind === 'sell_trait' && f.tr.length) add = 1;
      else if (x.kind === 'sell_var' && f.v > 0) add = 1;
      else if (x.kind === 'earn') add = value;
      else if (x.kind === 'big' && value >= x.n) add = x.n;
      if (!add) continue;
      x.prog = Math.min(x.n, x.prog + add);
      ch = true;
      if (x.prog >= x.n) {
        x.done = true;
        this.store.addCash(x.reward, false);
        this.store.log('quest', `Zadanie wykonane (+${x.reward} zł)`);
        this.emit('quest', x);
      }
    }
    if (ch) this.store.setQuests(q.filter((x) => !x.done || x.prog >= x.n).filter((x) => !x.done));
  }
}

export function uidOf(pid) {
  return String(pid || '').split(':')[0];
}

export function questText(q, fmt) {
  const k = QUEST_KINDS.find((x) => x.id === q.kind);
  if (!k) return '';
  return k.text(q, q.sp != null && SPECIES[q.sp] ? SPECIES[q.sp].name : '', q.rar != null ? RARITIES[q.rar].name.toLowerCase() : '', fmt);
}

export { DECAY_RATE };
