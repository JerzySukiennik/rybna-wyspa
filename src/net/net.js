// Rybna Wyspa: online session (presence, leader election with handoff, WebRTC star around the leader with an RTDB relay fallback, client mirror of fish and stacks).

import * as THREE from 'three';
import { createPeer } from './peer.js';
import { createClock } from './clock.js';
import { encodeSnap, decodeSnap, unpackQuat, metaOf, FF } from './proto.js';
import { STATE_HZ, LEADER_STALE, MAX_PLAYERS } from './config.js';
import { G, groups } from '../sim/physics.js';

const TAB = Math.random().toString(36).slice(2, 7);
const DELAY = 0.13;
const q0 = new THREE.Quaternion();
const p0 = new THREE.Vector3();

function b64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

function unb64(str) {
  const s = atob(str);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}

export class Net {
  constructor(game, fb, store, fid) {
    this.g = game;
    this.fb = fb;
    this.store = store;
    this.fid = fid;
    this.pid = fb.uid + ':' + TAB;
    this.pres = new Map();
    this.leaderPid = null;
    this.isLeader = false;
    this.links = new Map();
    this.relay = new Map();
    this.remote = new Map();
    this.slots = new Map();
    this.slotPid = new Map();
    this.fishMeta = new Map();
    this.buf = new Map();
    this.stacks = new Map();
    this.offset = 0;
    this.offsetOk = false;
    this.unsubs = [];
    this.sendT = 0;
    this.refreshIdx = 0;
    this.sigSeen = new Set();
    this.relayMode = false;
    this.relayQ = [];
    this.dir = null;
    this.events = [];
  }

  r(p) { return this.fb.ref(`farms/${this.fid}/${p}`); }
  now() { return Date.now() + (this.fb.offset || 0); }
  get offsetMs() { return this.fb.offset || 0; }

  async join() {
    const fb = this.fb;
    const me = { n: this.g.nick.slice(0, 16), c: this.g.color, uid: fb.uid, at: fb.serverTimestamp() };
    const pref = this.r(`pres/${this.pid}`);
    await fb.set(pref, me);
    fb.onDisconnect(pref).remove();
    fb.onDisconnect(this.r(`sig/${this.pid}`)).remove();
    fb.onDisconnect(this.r(`relay/${this.pid}`)).remove();
    this.unsubs.push(fb.onValue(this.r('pres'), (s) => {
      const v = s.val() || {};
      const before = new Set(this.pres.keys());
      this.pres = new Map(Object.entries(v));
      for (const [pid, p] of this.pres) { if (!before.has(pid) && pid !== this.pid) this.g.hud.toast(`${p.n} dołącza na wyspę`); this.g.farm && this.g.farm.nicks.set(pid, p.n); }
      for (const pid of before) if (!this.pres.has(pid)) this.playerLeft(pid);
      this.g.hud.setFarm(this.store.state.name, true, this.pres.size);
    }));
    this.unsubs.push(fb.onValue(this.r('leader'), (s) => this.onLeader(s.val())));
    this.unsubs.push(fb.onChildAdded(this.r(`sig/${this.pid}`), (s) => this.onSignal(s.key, s.val())));
    this.unsubs.push(fb.onChildChanged(this.r(`sig/${this.pid}`), (s) => this.onSignal(s.key, s.val())));
    await this.claim();
    this.beat = createClock(2000, () => this.heartbeat());
    this.tick = createClock(Math.round(1000 / STATE_HZ), () => this.netTick());
    this.watch = createClock(3000, () => this.watchdog());
    this.unsubs.push(fb.onValue(fb.query(fb.ref('dir'), fb.orderByChild('rate'), fb.limitToLast(25)), (s) => {
      const out = [];
      s.forEach((c) => { out.push({ id: c.key, ...c.val() }); });
      this.dir = out.reverse();
    }));
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  async claim() {
    const fb = this.fb;
    const now = this.now();
    const res = await fb.runTransaction(this.r('leader'), (cur) => {
      if (cur && cur.pid !== this.pid && now - (cur.at || 0) < LEADER_STALE && this.pres.has(cur.pid)) return undefined;
      if (cur && cur.pid === this.pid) return { ...cur, at: now };
      return { pid: this.pid, n: this.g.nick.slice(0, 16), at: now };
    });
    if (res.committed && res.snapshot.val() && res.snapshot.val().pid === this.pid) fb.onDisconnect(this.r('leader')).remove();
    return res.committed;
  }

  heartbeat() {
    if (!this.isLeader) return;
    this.fb.update(this.r('leader'), { at: this.now() }).catch(() => {});
  }

  watchdog() {
    if (this.isLeader) return;
    const L = this.leaderInfo;
    if (!L || this.now() - (L.at || 0) > LEADER_STALE || !this.pres.has(L.pid)) this.claim();
    if (!this.isLeader && this.leaderPid && !this.relayMode) {
      const link = this.links.get(this.leaderPid);
      if ((!link || !link.open) && this.now() - (this.connectAt || 0) > 7000) this.startRelay();
    }
  }

  onVisibility() {
    if (!this.isLeader) return;
    if (document.hidden && this.pres.size > 1) {
      this.hiddenT = setTimeout(() => {
        if (document.hidden && this.isLeader && this.pres.size > 1) this.resign();
      }, 12000);
    } else clearTimeout(this.hiddenT);
  }

  resign() {
    this.g.farm && this.g.farm.saveFish();
    this.fb.onDisconnect(this.r('leader')).cancel().catch(() => {});
    this.fb.set(this.r('leader'), null).catch(() => {});
  }

  onLeader(v) {
    this.leaderInfo = v;
    const pid = v ? v.pid : null;
    if (pid === this.leaderPid) return;
    const was = this.isLeader;
    this.leaderPid = pid;
    this.isLeader = pid === this.pid;
    if (!pid) { this.claim(); return; }
    if (this.isLeader && !was) this.becomeLeader();
    else if (!this.isLeader) {
      if (was) this.g.dropLeadership();
      else this.g.role = 'client';
      for (const [k, l] of this.links) { l.close(); this.links.delete(k); }
      this.relayMode = false;
      this.connectLeader();
    }
  }

  async becomeLeader() {
    for (const [k, l] of this.links) { l.close(); this.links.delete(k); }
    this.fb.onDisconnect(this.r('leader')).remove();
    let seed = null;
    if (this.fishMeta.size) {
      seed = [];
      for (const [id, m] of this.fishMeta) {
        const b = this.buf.get(id);
        const last = b && b[b.length - 1];
        if (!last) continue;
        seed.push({ m, p: last.p, q: last.q });
      }
    }
    const stacks = new Map(this.stacks);
    this.fishMeta.clear();
    this.buf.clear();
    this.stacks.clear();
    await this.g.takeLeadership(seed, stacks);
    this.g.hud.toast('Twój komputer liczy teraz fizykę wyspy.');
    this.unsubs.push(this.fb.onValue(this.r('relay'), (s) => this.onRelayUp(s.val() || {})));
  }

  connectLeader() {
    const lp = this.leaderPid;
    this.connectAt = this.now();
    const link = createPeer({
      initiator: true,
      onOpen: () => { link.control({ t: 'hi', n: this.g.nick, c: this.g.color }); this.g.netStatus && this.g.netStatus('Połączono z liderem.'); },
      onClose: () => { if (this.links.get(lp) === link) this.links.delete(lp); },
      onControl: (m) => this.onControlFromLeader(m),
      onState: (d) => this.onStateFromLeader(d),
      signal: (kind, val) => this.sendSignal(lp, kind, val),
    });
    this.links.set(lp, link);
    this.fb.remove(this.r(`sig/${lp}/${this.pid}`)).catch(() => {}).then(() => link.start());
  }

  sendSignal(to, kind, val) {
    const fb = this.fb;
    if (kind === 'c') fb.set(fb.push(this.r(`sig/${to}/${this.pid}/c`)), val).catch(() => {});
    else fb.set(this.r(`sig/${to}/${this.pid}/${kind}`), val).catch(() => {});
  }

  onSignal(from, box) {
    if (!box) return;
    if (this.isLeader && box.o) {
      let link = this.links.get(from);
      if (!link || link.sdp !== box.o) {
        if (link) link.close();
        link = createPeer({
          initiator: false,
          onOpen: () => this.sendFull(from),
          onClose: () => { if (this.links.get(from) === link) this.links.delete(from); },
          onControl: (m) => this.onControlFromClient(from, m),
          onState: (d) => this.onStateFromClient(from, d),
          signal: (kind, val) => this.sendSignal(from, kind, val),
        });
        link.sdp = box.o;
        link.seen = new Set();
        this.links.set(from, link);
        link.offer(box.o).catch((e) => console.warn('[net] offer', e));
      }
      if (box.c) for (const [k, c] of Object.entries(box.c)) if (!link.seen.has(k)) { link.seen.add(k); link.candidate(c); }
      return;
    }
    const link = this.links.get(from);
    if (!link) return;
    link.seen = link.seen || new Set();
    if (box.a && !link.answered) { link.answered = true; link.answer(box.a).catch((e) => console.warn('[net] answer', e)); }
    if (box.c) for (const [k, c] of Object.entries(box.c)) if (!link.seen.has(k)) { link.seen.add(k); link.candidate(c); }
  }

  slotOf(pid) {
    if (this.slots.has(pid)) return this.slots.get(pid);
    for (let i = 0; i < 250; i++) if (!this.slotPid.has(i)) { this.slots.set(pid, i); this.slotPid.set(i, pid); return i; }
    return 0;
  }

  table() {
    const out = {};
    for (const [pid, s] of this.slots) { const p = this.pres.get(pid); out[s] = { pid, n: p ? p.n : 'Gracz', c: p ? p.c : '#4aa8ff' }; }
    return out;
  }

  sendTo(pid, msg) {
    const l = this.links.get(pid);
    if (l && l.open) return l.control(msg);
    const r = this.relay.get(pid);
    if (r) { r.q.push(msg); return true; }
    return false;
  }

  broadcast(msg, except) {
    for (const pid of this.links.keys()) if (pid !== except) this.sendTo(pid, msg);
    for (const pid of this.relay.keys()) if (pid !== except && !this.links.has(pid)) this.sendTo(pid, msg);
  }

  sendFull(pid) {
    const g = this.g;
    this.slotOf(this.pid);
    this.slotOf(pid);
    const fish = [];
    for (const f of g.sim.fish.values()) {
      if (!f.body) continue;
      const p = f.body.translation(), q = f.body.rotation();
      fish.push({ ...metaOf(f), p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w] });
    }
    const stacks = {};
    for (const [k, s] of g.farm.stacks) stacks[k] = s.map(metaOf);
    this.sendTo(pid, { t: 'full', fish, stacks, slots: this.table(), lt: g.time });
    this.broadcast({ t: 'slots', slots: this.table() }, pid);
  }

  onControlFromClient(pid, m) {
    const g = this.g;
    if (!g.farm) return;
    const rp = this.remote.get(pid);
    if (m.t === 'hi') { g.farm.nicks.set(pid, String(m.n || 'Gracz').slice(0, 16)); return; }
    if (m.t === 'pick') {
      const f = g.sim.fish.get(m.id);
      if (f && rp && f.body) {
        const p = f.body.translation();
        if (Math.hypot(p.x - rp.x, p.z - rp.z) > 12) return;
      }
      g.farm.pick(pid, m.id);
    } else if (m.t === 'throw') {
      g.farm.throwOne(pid, new THREE.Vector3(...m.o), new THREE.Vector3(...m.v));
    } else if (m.t === 'dump') {
      g.farm.dump(pid, new THREE.Vector3(...m.o), new THREE.Vector3(...m.d));
    } else if (m.t === 'click') {
      g.farm.click(m.bid, pid);
    }
  }

  onStateFromClient(pid, d) {
    let s;
    try { s = typeof d === 'string' ? JSON.parse(d) : JSON.parse(new TextDecoder().decode(d)); } catch (e) { return; }
    this.applyRemoteState(pid, s);
  }

  applyRemoteState(pid, s) {
    if (!s || !Array.isArray(s.p)) return;
    let rp = this.remote.get(pid);
    if (!rp) {
      const R = this.g.phys.R;
      const body = this.g.phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(s.p[0], s.p[1] + 0.9, s.p[2]));
      this.g.phys.world.createCollider(R.ColliderDesc.capsule(0.55, 0.33).setCollisionGroups(groups(G.PLAYER, G.FISH)), body);
      rp = { body, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, flags: 0 };
      this.remote.set(pid, rp);
      this.slotOf(pid);
    }
    rp.x = s.p[0]; rp.y = s.p[1]; rp.z = s.p[2]; rp.yaw = s.y || 0; rp.pitch = s.pi || 0; rp.flags = s.f || 0; rp.at = this.g.time;
    const p = this.pres.get(pid);
    this.g.avatars.push(pid, { x: rp.x, y: rp.y, z: rp.z, yaw: rp.yaw, pitch: rp.pitch, n: p ? p.n : 'Gracz', c: p ? p.c : '#4aa8ff' }, this.g.time);
  }

  preStep() {
    for (const rp of this.remote.values()) rp.body.setNextKinematicTranslation({ x: rp.x, y: rp.y + 0.9, z: rp.z });
  }

  playerLeft(pid) {
    const g = this.g;
    this.g.avatars.remove(pid);
    const rp = this.remote.get(pid);
    if (rp) { g.phys.world.removeRigidBody(rp.body); this.remote.delete(pid); }
    const l = this.links.get(pid);
    if (l) { l.close(); this.links.delete(pid); }
    this.relay.delete(pid);
    if (this.isLeader && g.farm) {
      g.farm.dropStack(pid, rp ? new THREE.Vector3(rp.x, rp.y + 1, rp.z) : null);
      this.broadcast({ t: 'stack', pid, s: [] });
      const s = this.slots.get(pid);
      if (s !== undefined) { this.slots.delete(pid); this.slotPid.delete(s); }
      this.fb.remove(this.r(`sig/${this.pid}/${pid}`)).catch(() => {});
      this.fb.remove(this.r(`relay/${pid}`)).catch(() => {});
    }
    this.stacks.delete(pid);
  }

  fishAdd(f) {
    if (!this.isLeader || !f.body) return;
    const p = f.body.translation(), q = f.body.rotation();
    this.broadcast({ t: 'add', f: { ...metaOf(f), p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w] } });
  }

  fishDel(id, reason, extra = {}) {
    if (!this.isLeader) return;
    this.broadcast({ t: 'del', id, r: reason, v: extra.value || 0, p: extra.pos ? [extra.pos.x, extra.pos.y, extra.pos.z] : null });
  }

  sendMeta(f) {
    if (!this.isLeader) return;
    this.broadcast({ t: 'meta', f: metaOf(f) });
  }

  stack(pid, s) {
    if (!this.isLeader) return;
    this.broadcast({ t: 'stack', pid, s: s.map(metaOf) });
  }

  event(e) {
    if (!this.isLeader) return;
    this.broadcast({ t: 'ev', e });
  }

  netTick() {
    const g = this.g;
    if (!g.playing) return;
    if (this.isLeader) this.sendSnapshot();
    else this.sendOwnState();
  }

  sendOwnState() {
    const g = this.g;
    const f = g.player.feet;
    const msg = JSON.stringify({ p: [+f.x.toFixed(2), +f.y.toFixed(2), +f.z.toFixed(2)], y: +g.player.yaw.toFixed(3), pi: +g.player.pitch.toFixed(2), f: g.player.grounded ? 0 : 1 });
    const l = this.links.get(this.leaderPid);
    if (l && l.open) l.state(msg);
    else if (this.relayMode) this.relayUp = msg;
  }

  sendSnapshot() {
    const g = this.g;
    if (!g.sim) return;
    const players = [];
    const me = g.player.feet;
    players.push({ slot: this.slotOf(this.pid), x: me.x, y: me.y, z: me.z, yaw: g.player.yaw, pitch: g.player.pitch, flags: 0 });
    for (const [pid, rp] of this.remote) players.push({ slot: this.slotOf(pid), x: rp.x, y: rp.y, z: rp.z, yaw: rp.yaw, pitch: rp.pitch, flags: rp.flags });
    const fish = [];
    const all = [...g.sim.fish.values()];
    const flopCut = g.sim.t - 1 / STATE_HZ - 0.02;
    for (const f of all) {
      if (!f.body) continue;
      const sleeping = f.body.isSleeping();
      if (sleeping && !f.netForce) continue;
      fish.push(this.fishEntry(f, flopCut));
      f.netForce = false;
    }
    const n = Math.min(all.length, 30);
    for (let k = 0; k < n; k++) {
      const f = all[(this.refreshIdx + k) % all.length];
      if (f && f.body && f.body.isSleeping()) fish.push(this.fishEntry(f, flopCut));
    }
    this.refreshIdx = all.length ? (this.refreshIdx + n) % all.length : 0;
    const buf = encodeSnap(g.time, players, fish.slice(0, 1400));
    for (const [pid, l] of this.links) if (l.open) l.state(buf);
    if (this.relay.size) this.relaySnap = buf;
  }

  fishEntry(f, flopCut) {
    const p = f.body.translation(), q = f.body.rotation();
    let flags = 0;
    if (f.flopAt > flopCut) flags |= FF.flop;
    if (f.swim) flags |= FF.swim;
    if (f.wet) flags |= FF.wet;
    if (f.onIce) flags |= FF.ice;
    if (f.cold > 0) flags |= FF.cold;
    return { id: f.id, x: p.x, y: p.y, z: p.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w, dry: f.dry, flags };
  }

  onControlFromLeader(m) {
    const g = this.g;
    if (m.t === 'full') {
      for (const id of [...g.fishView.recs.keys()]) g.fishView.remove(id);
      this.fishMeta.clear();
      this.buf.clear();
      for (const f of m.fish) this.addMirror(f);
      this.stacks.clear();
      for (const [pid, s] of Object.entries(m.stacks || {})) this.setStack(pid, s);
      this.applySlots(m.slots);
    } else if (m.t === 'slots') this.applySlots(m.slots);
    else if (m.t === 'add') this.addMirror(m.f);
    else if (m.t === 'del') {
      const meta = this.fishMeta.get(m.id);
      const last = this.buf.get(m.id);
      this.fishMeta.delete(m.id);
      this.buf.delete(m.id);
      g.fishView.remove(m.id);
      if (meta && m.r === 'sold') g.saleFx(m.p ? new THREE.Vector3(...m.p) : g.structs.sell.pos, m.v, meta);
      else if (meta && m.r === 'lost' && m.p) { g.fx.burst('splash', new THREE.Vector3(m.p[0], 0.05, m.p[2]), 12); g.audio.play('splash_small', { pos: new THREE.Vector3(...m.p) }); }
      void last;
    } else if (m.t === 'meta') {
      const old = this.fishMeta.get(m.f.id);
      if (old) { Object.assign(old, m.f); g.fishView.upsert(m.f.id, old); }
    } else if (m.t === 'stack') this.setStack(m.pid, m.s);
    else if (m.t === 'ev') this.onEvent(m.e);
  }

  applySlots(slots) {
    this.slotPid = new Map();
    this.slots = new Map();
    for (const [s, v] of Object.entries(slots || {})) { this.slotPid.set(+s, v.pid); this.slots.set(v.pid, +s); }
  }

  addMirror(f) {
    const meta = { id: f.id, sp: f.sp, w: f.w, v: f.v, tr: f.tr || [], up: f.up || 0, ups: f.ups || [], dry: f.dry || 0, cold: f.cold || 0, iceT: f.iceT || 0, by: f.by };
    this.fishMeta.set(f.id, meta);
    this.g.fishView.upsert(f.id, meta);
    if (f.p) this.buf.set(f.id, [{ t: -1, p: new THREE.Vector3(...f.p), q: new THREE.Quaternion(...f.q) }]);
  }

  setStack(pid, list) {
    const metas = list.map((f) => {
      const m = this.fishMeta.get(f.id) || f;
      Object.assign(m, f);
      this.fishMeta.set(f.id, m);
      this.g.fishView.upsert(f.id, m);
      return m;
    });
    const prev = this.stacks.get(pid) || [];
    for (const old of prev) if (!metas.some((m) => m.id === old.id) && !this.buf.has(old.id)) { this.g.fishView.remove(old.id); }
    this.stacks.set(pid, metas);
    if (pid === this.pid) for (const m of metas) this.g.hands.pending.delete(m.id);
    else this.g.avatars.setStack(pid, metas.map((m) => m.id));
  }

  onEvent(e) {
    const g = this.g;
    if (e.k === 'rare') g.onFarm('rare', { f: { sp: e.sp, v: e.v }, pos: new THREE.Vector3(e.x, e.y, e.z) });
    else if (e.k === 'quest') { g.hud.banner('Zadanie wykonane!', `+${Math.round(e.r)} zł`, 2.4); g.audio.play('quest_done'); }
    else if (e.k === 'full') g.hud.setFull(e.on);
    else if (e.k === 'sold' && e.by && e.by !== this.pid && e.v > 1000) g.hud.toast(`${e.nick} sprzedał(a) rybę za ${Math.round(e.v)} zł`);
    else if (e.k === 'special') {
      const b = this.buf.get(e.id);
      const last = b && b[b.length - 1];
      if (last) { g.fx.burst(e.kind === 'rocket' ? 'rocket' : 'glitch', last.p, 16); g.audio.play(e.kind === 'rocket' ? 'rocket' : 'glitch', { pos: last.p }); }
    }
  }

  onStateFromLeader(d) {
    if (typeof d === 'string') return;
    const s = decodeSnap(d);
    if (!s) return;
    const g = this.g;
    const off = s.t - g.time;
    if (!this.offsetOk) { this.offset = off; this.offsetOk = true; }
    else this.offset = off > this.offset ? this.offset + (off - this.offset) * 0.1 : off;
    for (const p of s.players) {
      const pid = this.slotPid.get(p.slot);
      if (!pid || pid === this.pid) continue;
      const pr = this.pres.get(pid);
      g.avatars.push(pid, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, n: pr ? pr.n : 'Gracz', c: pr ? pr.c : '#4aa8ff' }, s.t);
    }
    for (const f of s.fish) {
      if (!this.fishMeta.has(f.id)) continue;
      let b = this.buf.get(f.id);
      if (!b) { b = []; this.buf.set(f.id, b); }
      b.push({ t: s.t, p: new THREE.Vector3(f.x, f.y, f.z), q: unpackQuat(f.q, new THREE.Quaternion()), flags: f.flags });
      if (b.length > 8) b.shift();
      const m = this.fishMeta.get(f.id);
      m.dry = f.dry;
      m.wet = !!(f.flags & FF.wet);
      m.onIce = !!(f.flags & FF.ice);
      m.cold = f.flags & FF.cold ? 1 : 0;
      if (f.flags & FF.flop) { g.fishView.flop(f.id, g.time); g.flopSound({ body: { translation: () => ({ x: f.x, y: f.y, z: f.z }) }, L: g.fishView.recs.get(f.id) ? g.fishView.recs.get(f.id).L : 0.3 }); }
      g.fishView.swim(f.id, f.flags & FF.swim ? 1 : 0);
    }
  }

  renderTime() { return this.isLeader ? this.g.time : this.g.time + this.offset - DELAY; }

  syncFish(view) {
    const t = this.renderTime();
    const held = new Set();
    for (const s of this.stacks.values()) for (const m of s) held.add(m.id);
    for (const [id, b] of this.buf) {
      if (held.has(id)) continue;
      const r = view.recs.get(id);
      if (!r || !b.length) continue;
      let i = b.length - 1;
      while (i > 0 && b[i - 1].t > t) i--;
      const a = b[Math.max(0, i - 1)], c = b[i];
      if (c.t <= t || a === c || a.t < 0) { p0.copy(c.p); q0.copy(c.q); }
      else { const k = Math.min(1, Math.max(0, (t - a.t) / (c.t - a.t))); p0.lerpVectors(a.p, c.p, k); q0.slerpQuaternions(a.q, c.q, k); }
      r.p.copy(p0);
      r.q.copy(q0);
      r.visible = true;
      view.place(r);
    }
  }

  frame(dt) {
    this.relayT = (this.relayT || 0) + dt;
    if (this.relayT > 0.25) {
      this.relayT = 0;
      if (this.relayMode && !this.isLeader) this.pushRelayUp();
      if (this.isLeader && this.relay.size) this.pushRelayDown();
    }
  }

  get authority() {
    const send = (m) => {
      const l = this.links.get(this.leaderPid);
      if (l && l.open) l.control(m);
      else if (this.relayMode) this.relayQ.push(m);
    };
    return {
      pick: (id) => send({ t: 'pick', id }),
      throw: (o, v) => send({ t: 'throw', o: [o.x, o.y, o.z], v: [v.x, v.y, v.z] }),
      dump: (o, d) => send({ t: 'dump', o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] }),
      click: (bid) => send({ t: 'click', bid }),
    };
  }

  startRelay() {
    if (this.relayMode) return;
    this.relayMode = true;
    this.g.netStatus && this.g.netStatus('Bez bezpośredniego połączenia, używam przekaźnika (wolniej).');
    this.g.hud.toast('Słabe połączenie z liderem, przełączam na przekaźnik.');
    this.unsubs.push(this.fb.onValue(this.r(`relay/${this.pid}/d`), (s) => {
      const v = s.val();
      if (!v) return;
      if (v.c) for (const m of v.c) this.onControlFromLeader(m);
      if (v.s) this.onStateFromLeader(unb64(v.s));
    }));
    this.relayQ.push({ t: 'hi', n: this.g.nick, c: this.g.color, relay: 1 });
  }

  pushRelayUp() {
    const q = this.relayQ.splice(0);
    this.fb.set(this.r(`relay/${this.pid}/u`), { s: this.relayUp || null, c: q.length ? q : null, at: this.now() }).catch(() => {});
  }

  onRelayUp(all) {
    for (const [pid, v] of Object.entries(all)) {
      if (pid === this.pid || !v || !v.u) continue;
      if (this.links.has(pid) && this.links.get(pid).open) continue;
      let r = this.relay.get(pid);
      if (!r) { r = { q: [], seen: 0 }; this.relay.set(pid, r); this.sendFull(pid); }
      if (v.u.at === r.seen) continue;
      r.seen = v.u.at;
      if (v.u.s) this.onStateFromClient(pid, v.u.s);
      if (v.u.c) for (const m of v.u.c) this.onControlFromClient(pid, m);
    }
  }

  pushRelayDown() {
    for (const [pid, r] of this.relay) {
      const q = r.q.splice(0);
      this.fb.set(this.r(`relay/${pid}/d`), { s: this.relaySnap ? b64(this.relaySnap) : null, c: q.length ? q : null, at: this.now() }).catch(() => {});
    }
  }

  isHeld(id) {
    for (const s of this.stacks.values()) if (s.some((m) => m.id === id)) return true;
    return false;
  }

  onlineList() {
    return [...this.pres.entries()].map(([pid, p]) => ({ n: p.n, c: p.c, leader: pid === this.leaderPid }));
  }

  rankingList() { return this.dir; }

  count() { return this.pres.size; }

  async leave() {
    try {
      this.beat && this.beat.stop();
      this.tick && this.tick.stop();
      this.watch && this.watch.stop();
      for (const u of this.unsubs) u();
      for (const l of this.links.values()) l.close();
      if (this.isLeader) { this.g.farm && this.g.farm.saveFish(); await this.fb.set(this.r('leader'), null); }
      await this.fb.remove(this.r(`pres/${this.pid}`));
    } catch (e) { /* closing */ }
  }
}

export { MAX_PLAYERS };
