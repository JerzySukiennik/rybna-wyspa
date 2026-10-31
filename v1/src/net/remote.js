// Rybna Wyspa: farm state stored in the shared Realtime Database (same interface as LocalStore), split into small nodes to save bandwidth.

import { Emitter, freshFarm, TRASH_MS } from './store.js';
import { BLOCK_BY_ID } from '../data/blocks.js';
import { UPGRADE_BY_ID, START_CASH, levelOf, REBIRTH_MULT } from '../data/progress.js';

export class RemoteStore extends Emitter {
  constructor(fb, fid) {
    super();
    this.fb = fb;
    this.fid = fid;
    this.online = true;
    this.s = freshFarm(fid, '', false);
    this.s.blocks = {};
    this.s.wh = {};
    this.me = { uid: fb.uid, nick: 'Gracz' };
    this.unsubs = [];
    this.isLeader = false;
  }

  r(p) { return this.fb.ref(p ? `farms/${this.fid}/${p}` : `farms/${this.fid}`); }
  get state() { return this.s; }
  get level() { return levelOf(this.s.earned); }

  async open(create) {
    const fb = this.fb;
    const metaRef = this.r('meta');
    let meta = (await fb.get(metaRef)).val();
    if (!meta) {
      if (!create) { const e = new Error('Nie ma wyspy o takim kodzie.'); e.code = 'missing'; throw e; }
      const res = await fb.runTransaction(metaRef, (cur) => cur || { name: create.name, pub: !!create.pub, created: Date.now(), seed: Math.floor(Math.random() * 1e6), rebirths: 0, mult: 1 });
      meta = res.snapshot.val();
      const init = (await fb.get(this.r('cash'))).val();
      if (init === null) await fb.update(this.r(''), { cash: START_CASH, earned: 0, 'wh/pompa': 1, 'wh/tasma': 6 });
    }
    Object.assign(this.s, { name: meta.name, pub: meta.pub, created: meta.created, seed: meta.seed, rebirths: meta.rebirths || 0, mult: meta.mult || 1 });
    const snap = (await fb.get(this.r(''))).val() || {};
    this.ingest(snap);
    this.attach();
    return this;
  }

  ingest(v) {
    const s = this.s;
    s.cash = v.cash ?? START_CASH;
    s.earned = v.earned || 0;
    s.wh = v.wh || {};
    s.up = v.up || {};
    s.blocks = v.blocks || {};
    s.album = v.album || {};
    s.quests = Array.isArray(v.quests) ? v.quests : v.quests ? Object.values(v.quests) : [];
    s.stats = v.stats || {};
    s.trash = v.trash || {};
    s.vote = v.vote || {};
    s.rate = v.rate || 0;
    s.active = v.active || 0;
    s.log = v.log ? Object.values(v.log).sort((a, b) => a.at - b.at).slice(-120) : [];
  }

  attach() {
    const fb = this.fb;
    const on = (p, fn) => this.unsubs.push(fb.onValue(this.r(p), (snap) => fn(snap.val())));
    on('cash', (v) => { if (v == null) return; this.s.cash = v; this.emit('cash', v); });
    on('earned', (v) => {
      if (v == null) return;
      const before = levelOf(this.s.earned);
      this.s.earned = v;
      const after = levelOf(v);
      if (after > before) this.emit('level', after);
      this.emit('cash', this.s.cash);
    });
    on('wh', (v) => { this.s.wh = v || {}; this.emit('wh', this.s.wh); });
    on('up', (v) => { this.s.up = v || {}; this.emit('up', this.s.up); });
    on('album', (v) => { this.s.album = v || {}; this.emit('album', this.s.album); });
    on('quests', (v) => { this.s.quests = Array.isArray(v) ? v.filter(Boolean) : v ? Object.values(v) : []; this.emit('quests', this.s.quests); });
    on('stats', (v) => { this.s.stats = v || {}; this.emit('stats', this.s.stats); });
    on('trash', (v) => { this.s.trash = v || {}; this.emit('trash', this.s.trash); });
    on('vote', (v) => { this.s.vote = v || {}; this.emit('vote', this.s.vote); });
    on('meta', (v) => {
      if (!v) return;
      const reb = (v.rebirths || 0) > (this.s.rebirths || 0);
      Object.assign(this.s, { name: v.name, pub: v.pub, seed: v.seed, rebirths: v.rebirths || 0, mult: v.mult || 1 });
      if (reb) this.emit('reset', this.s);
    });
    const blocks = this.r('blocks');
    this.unsubs.push(fb.onChildAdded(blocks, (snap) => { this.s.blocks[snap.key] = snap.val(); this.emit('block', snap.key, snap.val()); }));
    this.unsubs.push(fb.onChildChanged(blocks, (snap) => { this.s.blocks[snap.key] = snap.val(); this.emit('block', snap.key, snap.val()); }));
    this.unsubs.push(fb.onChildRemoved(blocks, (snap) => { delete this.s.blocks[snap.key]; this.emit('block', snap.key, null); }));
    const logQ = fb.query(this.r('log'), fb.limitToLast(60));
    this.unsubs.push(fb.onChildAdded(logQ, (snap) => {
      this.s.log.push(snap.val());
      if (this.s.log.length > 120) this.s.log.splice(0, this.s.log.length - 120);
      this.emit('log', this.s.log);
    }));
  }

  close() {
    for (const u of this.unsubs) { try { u(); } catch (e) { /* ignore */ } }
    this.unsubs = [];
  }

  tick() {}
  flush() {}
  touch() {}

  log(a, x) {
    const fb = this.fb;
    fb.set(fb.push(this.r('log')), { n: this.me.nick, u: this.me.uid, a, x: String(x || '').slice(0, 120), at: Date.now() }).catch(() => {});
  }

  stat(uid, nick, key, n) {
    const fb = this.fb;
    fb.update(this.r(`stats/${uid}`), { n: String(nick || 'Gracz').slice(0, 16), [key]: fb.increment(n) }).catch(() => {});
  }

  async spend(cost) {
    const fb = this.fb;
    const res = await fb.runTransaction(this.r('cash'), (cur) => {
      if (cur === null) return cur;
      if (cur < cost) return undefined;
      return cur - cost;
    });
    return res.committed && res.snapshot.val() !== null;
  }

  async buy(type, n = 1) {
    const def = BLOCK_BY_ID[type];
    if (!(await this.spend(def.cost * n))) return false;
    await this.fb.update(this.r('wh'), { [type]: this.fb.increment(n) });
    this.log('buy', `${n} × ${def.name}`);
    return true;
  }

  async buyUpgrade(key) {
    const u = UPGRADE_BY_ID[key];
    const lvl = this.s.up[key] || 0;
    if (lvl >= u.vals.length - 1) return false;
    const cost = u.cost[lvl + 1];
    if (!(await this.spend(cost))) return false;
    const res = await this.fb.runTransaction(this.r(`up/${key}`), (cur) => ((cur || 0) === lvl ? lvl + 1 : undefined));
    if (!res.committed) { await this.fb.update(this.r(''), { cash: this.fb.increment(cost) }); return false; }
    this.log('upgrade', `${u.name} ${lvl + 1}`);
    return true;
  }

  async place(rec) {
    const fb = this.fb;
    if ((this.s.wh[rec.t] || 0) <= 0) return false;
    rec.by = this.me.uid;
    rec.bn = this.me.nick;
    rec.at = Date.now();
    this.s.blocks[rec.id] = rec;
    this.emit('block', rec.id, rec);
    const res = await fb.runTransaction(this.r(`wh/${rec.t}`), (cur) => ((cur || 0) > 0 ? cur - 1 : undefined));
    if (!res.committed) { delete this.s.blocks[rec.id]; this.emit('block', rec.id, null); return false; }
    await fb.set(this.r(`blocks/${rec.id}`), rec);
    this.stat(this.me.uid, this.me.nick, 'built', 1);
    return true;
  }

  async remove(bid, quiet = false) {
    const fb = this.fb;
    if (this.s.blocks[bid]) { delete this.s.blocks[bid]; this.emit('block', bid, null); }
    let taken = null;
    const res = await fb.runTransaction(this.r(`blocks/${bid}`), (cur) => { taken = cur; return cur ? null : undefined; });
    if (!res.committed || !taken) return false;
    const tid = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
    const upd = { [`wh/${taken.t}`]: fb.increment(1) };
    if (!quiet) upd[`trash/${tid}`] = { b: taken, by: this.me.uid, bn: this.me.nick, at: Date.now() };
    await fb.update(this.r(''), upd);
    if (quiet) return true;
    this.log('remove', BLOCK_BY_ID[taken.t] ? BLOCK_BY_ID[taken.t].name : taken.t);
    this.stat(this.me.uid, this.me.nick, 'removed', 1);
    return tid;
  }

  async restore(tid) {
    const fb = this.fb;
    let e = null;
    const res = await fb.runTransaction(this.r(`trash/${tid}`), (cur) => { e = cur; return cur ? null : undefined; });
    if (!res.committed || !e) return false;
    const t = e.b.t;
    const w = await fb.runTransaction(this.r(`wh/${t}`), (cur) => ((cur || 0) > 0 ? cur - 1 : undefined));
    if (!w.committed && !(await this.spend(BLOCK_BY_ID[t].cost))) {
      await fb.set(this.r(`trash/${tid}`), e);
      return false;
    }
    await fb.set(this.r(`blocks/${e.b.id}`), e.b);
    this.log('restore', BLOCK_BY_ID[t].name);
    return true;
  }

  pruneTrash() {
    const now = Date.now();
    const upd = {};
    for (const [k, e] of Object.entries(this.s.trash || {})) if (now - e.at > TRASH_MS) upd[`trash/${k}`] = null;
    if (Object.keys(upd).length) this.fb.update(this.r(''), upd).catch(() => {});
    if (this.s.log.length > 100) {
      this.fb.get(this.fb.query(this.r('log'), this.fb.orderByKey(), this.fb.limitToFirst(40))).then((snap) => {
        const u = {};
        snap.forEach((c) => { u[`log/${c.key}`] = null; });
        return this.fb.update(this.r(''), u);
      }).catch(() => {});
    }
  }

  addCash(n, earned = true) {
    const fb = this.fb;
    const u = { cash: fb.increment(n) };
    if (earned) u.earned = fb.increment(n);
    fb.update(this.r(''), u).catch(() => {});
  }

  album(sp, v, tr, w) {
    const a = this.s.album[sp] || (this.s.album[sp] = { v: {}, t: {}, n: 0, w: 0 });
    let fresh = !a.n;
    const fb = this.fb;
    const u = { [`album/${sp}/n`]: fb.increment(1) };
    a.n++;
    if (!a.v || !a.v[v]) { a.v = a.v || {}; a.v[v] = 1; u[`album/${sp}/v/${v}`] = 1; fresh = true; }
    for (const t of tr) if (!a.t || !a.t[t]) { a.t = a.t || {}; a.t[t] = 1; u[`album/${sp}/t/${t}`] = 1; fresh = true; }
    if (w > (a.w || 0)) { a.w = w; u[`album/${sp}/w`] = +w.toFixed(3); }
    fb.update(this.r(''), u).catch(() => {});
    return fresh;
  }

  setQuests(q) {
    this.s.quests = q;
    this.fb.set(this.r('quests'), q.length ? q : null).catch(() => {});
    this.emit('quests', q);
  }

  setRate(r) {
    this.s.rate = r;
    this.s.active = Date.now();
    const fb = this.fb;
    fb.update(this.r(''), { rate: Math.round(r * 100) / 100, active: fb.serverTimestamp() }).catch(() => {});
    fb.update(fb.ref(`dir/${this.fid}`), { name: this.s.name, pub: !!this.s.pub, rate: Math.round(r), earned: Math.round(this.s.earned), rb: this.s.rebirths || 0, at: fb.serverTimestamp() }).catch(() => {});
  }

  saveFish(str) { this.fb.set(this.r('fish'), str).catch(() => {}); }

  async loadFishAsync() {
    try { return (await this.fb.get(this.r('fish'))).val() || ''; } catch (e) { return ''; }
  }

  loadFish() { return ''; }

  async vote(on) {
    await this.fb.set(this.r(`vote/${this.me.uid}`), on ? 1 : null);
    return true;
  }

  async rebirth() {
    const fb = this.fb;
    const s = this.s;
    await fb.update(this.r(''), {
      blocks: null, wh: { pompa: 1, tasma: 6 }, up: null, cash: START_CASH, earned: 0, quests: null, fish: '', vote: null, trash: null,
      'meta/rebirths': (s.rebirths || 0) + 1, 'meta/mult': +((s.mult || 1) * REBIRTH_MULT).toFixed(4),
    });
    this.log('rebirth', `Rebirth ${(s.rebirths || 0) + 1}`);
    return true;
  }
}
