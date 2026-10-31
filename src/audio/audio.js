// Rybna Wyspa: Web Audio playback of the recorded effects, ambience loops and music (manifest-driven, distance attenuation, buses).

const BASE = 'assets/audio/';

export class Audio {
  constructor() {
    this.ctx = null;
    this.buf = new Map();
    this.man = { sfx: {}, amb: {}, music: {} };
    this.vol = { master: 0.9, sfx: 0.85, music: 0.45, amb: 0.7 };
    this.last = new Map();
    this.loops = new Map();
    this.listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
    this.music = null;
    this.musicMood = 'day';
    this.ready = false;
  }

  async init() {
    const load = async (dir) => {
      try { const r = await fetch(BASE + dir + '/manifest.json', { cache: 'no-cache' }); if (r.ok) this.man[dir] = await r.json(); } catch (e) { this.man[dir] = {}; }
    };
    await Promise.all([load('sfx'), load('amb'), load('music')]);
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.bus = {};
    for (const k of ['sfx', 'music', 'amb']) { this.bus[k] = c.createGain(); this.bus[k].connect(this.master); }
    this.applyVolumes();
    this.ready = true;
    for (const k of Object.keys(this.man.sfx)) this.fetchBuf('sfx', k);
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.bus.sfx.gain.value = this.vol.sfx;
    this.bus.music.gain.value = this.vol.music;
    this.bus.amb.gain.value = this.vol.amb;
  }

  setVolume(k, v) { this.vol[k] = v; this.applyVolumes(); }

  fetchBuf(dir, key) {
    const id = dir + ':' + key;
    if (this.buf.has(id)) return this.buf.get(id);
    const e = this.man[dir][key];
    if (!e || !this.ctx) return null;
    const p = fetch(BASE + dir + '/' + e.file).then((r) => r.arrayBuffer()).then((a) => this.ctx.decodeAudioData(a)).then((b) => { this.buf.set(id, b); return b; }).catch(() => { this.buf.set(id, null); return null; });
    this.buf.set(id, p);
    return p;
  }

  resolve(key) {
    const s = this.man.sfx;
    if (s[key]) return key;
    const vars = [];
    for (let i = 1; i < 9; i++) if (s[key + '_' + i]) vars.push(key + '_' + i);
    return vars.length ? vars[Math.floor(Math.random() * vars.length)] : null;
  }

  setListener(pos, yaw) {
    const L = this.listener;
    L.x = pos.x; L.y = pos.y; L.z = pos.z;
    L.rx = Math.cos(yaw); L.rz = -Math.sin(yaw);
  }

  play(key, o = {}) {
    if (!this.ctx) return;
    const k = this.resolve(key);
    if (!k) return;
    const now = this.ctx.currentTime;
    const lim = this.last.get(key) || 0;
    if (now - lim < (o.gap ?? 0.045)) return;
    this.last.set(key, now);
    let vol = (o.vol ?? 1) * (this.man.sfx[k].gain ?? 1);
    let pan = 0;
    if (o.pos) {
      const L = this.listener;
      const dx = o.pos.x - L.x, dy = o.pos.y - L.y, dz = o.pos.z - L.z;
      const d = Math.hypot(dx, dy, dz);
      const range = o.range || 28;
      if (d > range) return;
      vol *= Math.pow(1 - d / range, 1.6);
      pan = d > 0.5 ? Math.max(-0.85, Math.min(0.85, (dx * L.rx + dz * L.rz) / d)) : 0;
    }
    if (vol < 0.01) return;
    const b = this.buf.get('sfx:' + k);
    const go = (buf) => {
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - 0.5) * (o.vary ?? 0.12));
      const g = this.ctx.createGain();
      g.gain.value = vol;
      let node = src.connect(g);
      if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; node = g.connect(p); node.connect(this.bus.sfx); } else g.connect(this.bus.sfx);
      src.start();
    };
    if (b instanceof AudioBuffer) go(b);
    else if (b && b.then) b.then(go);
    else { const p = this.fetchBuf('sfx', k); if (p && p.then) p.then(go); }
  }

  loop(dir, key, target) {
    if (!this.ctx) return;
    let L = this.loops.get(dir + ':' + key);
    if (!L) {
      if (!this.man[dir][key]) return;
      L = { src: null, g: this.ctx.createGain(), vol: 0, target: 0, loading: false };
      L.g.gain.value = 0;
      L.g.connect(this.bus[dir === 'sfx' ? 'sfx' : 'amb']);
      this.loops.set(dir + ':' + key, L);
    }
    L.target = target * (this.man[dir][key].gain ?? 1);
    if (!L.src && !L.loading && L.target > 0.001) {
      L.loading = true;
      const p = this.fetchBuf(dir, key);
      Promise.resolve(p).then((buf) => {
        L.loading = false;
        if (!buf || L.src) return;
        const s = this.ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(L.g);
        s.start(0, Math.random() * buf.duration);
        L.src = s;
      });
    }
  }

  tick(dt) {
    if (!this.ctx) return;
    for (const L of this.loops.values()) {
      L.vol += (L.target - L.vol) * Math.min(1, dt * 1.5);
      L.g.gain.value = L.vol;
    }
    this.tickMusic();
  }

  setMood(m) { this.musicMood = m; }

  tickMusic() {
    if (!this.ctx || this.vol.music <= 0.001) return;
    if (this.music && this.music.playing) return;
    if (this.music && this.music.loading) return;
    const list = Object.entries(this.man.music).filter(([, e]) => !e.mood || e.mood === 'any' || e.mood === this.musicMood);
    if (!list.length) return;
    const pickable = list.filter(([k]) => !this.music || k !== this.music.key);
    const [key] = (pickable.length ? pickable : list)[Math.floor(Math.random() * (pickable.length || list.length))];
    this.music = { key, loading: true, playing: false };
    const p = this.fetchBuf('music', key);
    Promise.resolve(p).then((buf) => {
      if (!buf) { this.music.loading = false; return; }
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 3);
      s.connect(g);
      g.connect(this.bus.music);
      s.start();
      this.music = { key, loading: false, playing: true, src: s, g };
      s.onended = () => { if (this.music && this.music.src === s) this.music.playing = false; };
    });
  }
}
