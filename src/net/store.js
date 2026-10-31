// Rybna Wyspa: persistent farm state (cash, warehouse, blocks, upgrades, album, quests, stats, log, trash) with a local backend.

import { BLOCK_BY_ID } from '../data/blocks.js';
import { UPGRADE_BY_ID, START_CASH, levelOf, REBIRTH_MULT } from '../data/progress.js';

export const TRASH_MS = 15 * 60 * 1000;
export const LOG_MAX = 120;

export function freshFarm(id, name, pub) {
  return {
    id, name, pub: !!pub, created: Date.now(), seed: Math.floor(Math.random() * 1e6),
    cash: START_CASH, earned: 0, rebirths: 0, mult: 1, rate: 0, active: 0,
    wh: { pompa: 1, tasma: 6 }, up: {}, blocks: {}, album: {}, quests: [], stats: {}, log: [], trash: {}, vote: {}, fish: '',
  };
}

export class Emitter {
  constructor() { this.l = new Map(); }
  on(t, fn) { if (!this.l.has(t)) this.l.set(t, new Set()); this.l.get(t).add(fn); return () => this.l.get(t).delete(fn); }
  emit(t, ...a) { const s = this.l.get(t); if (s) for (const fn of s) { try { fn(...a); } catch (e) { console.error(e); } } }
}

export class LocalStore extends Emitter {
  constructor(farmId = 'solo') {
    super();
    this.key = 'rybnaWyspa.farm.' + farmId;
    this.online = false;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { s = null; }
    this.s = s || freshFarm(farmId, 'Twoja wyspa', false);
    this.s.trash = this.s.trash || {};
    this.s.vote = {};
    this.dirty = false;
    this.saveT = 0;
    this.me = { uid: 'local', nick: 'Gracz' };
  }

  get state() { return this.s; }
  get level() { return levelOf(this.s.earned); }

  touch() { this.dirty = true; }

  tick(dt) {
    this.saveT += dt;
    if (this.dirty && this.saveT > 3) this.flush();
  }

  flush() {
    this.saveT = 0;
    this.dirty = false;
    try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch (e) { console.warn('save failed', e); }
  }

  log(a, x) {
    this.s.log.push({ n: this.me.nick, u: this.me.uid, a, x, at: Date.now() });
    if (this.s.log.length > LOG_MAX) this.s.log.splice(0, this.s.log.length - LOG_MAX);
    this.emit('log', this.s.log);
  }

  stat(uid, nick, key, n) {
    const st = this.s.stats[uid] || (this.s.stats[uid] = { n: nick, sold: 0, earned: 0, built: 0, removed: 0 });
    st.n = nick || st.n;
    st[key] = (st[key] || 0) + n;
    this.emit('stats', this.s.stats);
  }

  async buy(type, n = 1) {
    const def = BLOCK_BY_ID[type];
    const cost = def.cost * n;
    if (this.s.cash < cost) return false;
    this.s.cash -= cost;
    this.s.wh[type] = (this.s.wh[type] || 0) + n;
    this.emit('cash', this.s.cash);
    this.emit('wh', this.s.wh);
    this.log('buy', `${n} × ${def.name}`);
    this.touch();
    return true;
  }

  async buyUpgrade(key) {
    const u = UPGRADE_BY_ID[key];
    const lvl = this.s.up[key] || 0;
    if (lvl >= u.vals.length - 1) return false;
    const cost = u.cost[lvl + 1];
    if (this.s.cash < cost) return false;
    this.s.cash -= cost;
    this.s.up[key] = lvl + 1;
    this.emit('cash', this.s.cash);
    this.emit('up', this.s.up);
    this.log('upgrade', `${u.name} ${lvl + 1}`);
    this.touch();
    return true;
  }

  async place(rec) {
    const n = this.s.wh[rec.t] || 0;
    if (n <= 0) return false;
    this.s.wh[rec.t] = n - 1;
    rec.by = this.me.uid;
    rec.bn = this.me.nick;
    rec.at = Date.now();
    this.s.blocks[rec.id] = rec;
    this.emit('wh', this.s.wh);
    this.emit('block', rec.id, rec);
    this.stat(this.me.uid, this.me.nick, 'built', 1);
    this.touch();
    return true;
  }

  async remove(bid) {
    const rec = this.s.blocks[bid];
    if (!rec) return false;
    delete this.s.blocks[bid];
    this.s.wh[rec.t] = (this.s.wh[rec.t] || 0) + 1;
    const tid = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
    this.s.trash[tid] = { b: rec, by: this.me.uid, bn: this.me.nick, at: Date.now() };
    this.emit('wh', this.s.wh);
    this.emit('block', bid, null);
    this.emit('trash', this.s.trash);
    this.log('remove', BLOCK_BY_ID[rec.t].name);
    this.stat(this.me.uid, this.me.nick, 'removed', 1);
    this.touch();
    return true;
  }

  async restore(tid) {
    const e = this.s.trash[tid];
    if (!e) return false;
    const t = e.b.t;
    if ((this.s.wh[t] || 0) > 0) this.s.wh[t]--;
    else if (this.s.cash >= BLOCK_BY_ID[t].cost) { this.s.cash -= BLOCK_BY_ID[t].cost; this.emit('cash', this.s.cash); }
    else return false;
    delete this.s.trash[tid];
    this.s.blocks[e.b.id] = e.b;
    this.emit('wh', this.s.wh);
    this.emit('block', e.b.id, e.b);
    this.emit('trash', this.s.trash);
    this.log('restore', BLOCK_BY_ID[t].name);
    this.touch();
    return true;
  }

  pruneTrash() {
    const now = Date.now();
    let ch = false;
    for (const [k, e] of Object.entries(this.s.trash)) if (now - e.at > TRASH_MS) { delete this.s.trash[k]; ch = true; }
    if (ch) { this.emit('trash', this.s.trash); this.touch(); }
  }

  addCash(n, earned = true) {
    this.s.cash += n;
    if (earned) {
      const before = levelOf(this.s.earned);
      this.s.earned += n;
      const after = levelOf(this.s.earned);
      if (after > before) this.emit('level', after);
    }
    this.emit('cash', this.s.cash);
    this.touch();
  }

  album(sp, v, tr, w) {
    const a = this.s.album[sp] || (this.s.album[sp] = { v: {}, t: {}, n: 0, w: 0 });
    let fresh = !a.n;
    a.n++;
    if (!a.v[v]) { a.v[v] = 1; fresh = true; }
    for (const t of tr) if (!a.t[t]) { a.t[t] = 1; fresh = true; }
    if (w > a.w) a.w = w;
    if (fresh) this.emit('album', this.s.album);
    this.touch();
    return fresh;
  }

  setQuests(q) { this.s.quests = q; this.emit('quests', q); this.touch(); }
  setRate(r) { this.s.rate = r; this.s.active = Date.now(); this.touch(); }
  saveFish(str) { this.s.fish = str; this.touch(); }
  loadFish() { return this.s.fish || ''; }

  async vote(on) { this.s.vote[this.me.uid] = on ? 1 : 0; this.emit('vote', this.s.vote); return true; }

  async rebirth() {
    const s = this.s;
    const keep = { album: s.album, stats: s.stats, log: s.log, rebirths: s.rebirths + 1, mult: s.mult * REBIRTH_MULT, name: s.name, pub: s.pub, id: s.id, seed: s.seed, created: s.created };
    const nf = freshFarm(s.id, s.name, s.pub);
    Object.assign(nf, keep);
    this.s = nf;
    this.log('rebirth', `Rebirth ${nf.rebirths}`);
    this.emit('reset', nf);
    this.touch();
    this.flush();
    return true;
  }
}
