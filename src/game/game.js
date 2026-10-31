// Rybna Wyspa: the game orchestrator (renderer, world, physics, leader simulation or network client, player, UI, audio, main loop).

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initRapier, Physics, G, groups } from '../sim/physics.js';
import { FishSim, FISH_CAP } from '../sim/fishsim.js';
import { buildIsland, islandHeight, SPOTS, LAND } from '../world/island.js';
import { Water } from '../world/water.js';
import { Sky } from '../world/sky.js';
import { WeatherFx } from '../world/weatherfx.js';
import { Grass } from '../world/grass.js';
import { buildDecor } from '../world/decor.js';
import { buildStructures, sellHole } from '../world/structures.js';
import { BlockWorld } from '../world/blockworld.js';
import { blockMaterial, U, waterLight } from '../render/materials.js';
import { FishView } from '../render/fishview.js';
import { Fx } from '../render/fx.js';
import { Avatars } from '../render/avatars.js';
import { Icons } from '../render/icons.js';
import { loadModels } from '../render/models.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Hands } from './hands.js';
import { Build } from './build.js';
import { Farm } from './farm.js';
import { LocalStore } from '../net/store.js';
import { RemoteStore } from '../net/remote.js';
import { Net, MAX_PLAYERS } from '../net/net.js';
import { firebase } from '../net/firebase.js';
import { randId } from '../util.js';
import { Hud } from '../ui/hud.js';
import { Panels } from '../ui/panels.js';
import { Audio } from '../audio/audio.js';
import { BLOCK_BY_ID, BLOCKS } from '../data/blocks.js';
import { SPECIES, RARITIES } from '../data/species.js';
import { TRAIT_BY_ID, VARIANTS } from '../data/traits.js';
import { upVal, levelOf } from '../data/progress.js';
import { weatherAt, dayPhase, isNight, WEATHERS } from '../data/weather.js';
import { fmtZl } from '../util.js';
import { fishValue } from '../sim/value.js';

const STEP = 1 / 60;
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const camPos = new THREE.Vector3();

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.time = 0;
    this.playing = false;
    this.paused = false;
    this.selSlot = 0;
    this.hotbarSlots = [null, 'pompa', 'tasma', null, null, null, null, null, null];
    this.settings = loadSettings();
    this.uid = 'local';
    this.pid = 'local:0';
    this.nick = this.settings.nick || 'Gracz';
    this.color = this.settings.color || '#4aa8ff';
    this.role = 'leader';
    this.net = null;
    this.shake = new THREE.Vector3();
    this.flopSoundT = 0;
    this.structBodies = new Set();
    this.prev = new Map();
    this.fpsT = 0;
    this.fpsN = 0;
    this.fps = 60;
  }

  async boot(progress = () => {}) {
    progress(0.05, 'Silnik grafiki…');
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings.scale));
    r.setSize(innerWidth, innerHeight, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.info.autoReset = false;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, innerWidth / innerHeight, 0.05, 5000);
    this.scene.add(this.camera);
    this.setupPost();
    addEventListener('resize', () => this.resize());

    progress(0.12, 'Fizyka…');
    const R = await initRapier();
    this.phys = new Physics(R);

    progress(0.22, 'Modele ryb…');
    this.models = await loadModels();

    progress(0.34, 'Wyspa…');
    const isl = buildIsland([sellHole()]);
    this.scene.add(isl.mesh);
    this.phys.addIsland(isl.collider);
    this.structBodies.add(this.phys.island.handle);
    this.water = new Water(this.scene, isl.heightTex, isl.span);
    this.grass = new Grass(this.scene, isl.heightTex);
    this.sky = new Sky(this.scene);
    this.wfx = new WeatherFx(this.scene);
    this.wfx.onThunder = () => this.audio.play('thunder', { vol: 0.9 });
    this.blockMat = blockMaterial();
    this.structs = buildStructures(this.scene, this.phys, this.blockMat);
    const decoMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    progress(0.46, 'Drzewa i trzciny…');
    this.decor = buildDecor(this.scene, this.phys, this.models, decoMat);
    this.phys.world.forEachRigidBody((b) => { if (b.isFixed()) this.structBodies.add(b.handle); });

    this.blocks = new BlockWorld(this.scene, this.phys);
    this.blocks.mat = this.blockMat;
    this.blocks.onAdd = () => { this.grassDirty = true; };
    this.blocks.onRemove = () => { this.grassDirty = true; };
    this.grassDirty = true;
    this.fishView = new FishView(this.scene, this.models);
    this.fx = new Fx(this.scene, this.camera);
    this.avatars = new Avatars(this.scene, this.models, this.fishView);
    this.icons = new Icons(this.renderer, this.models);
    this.makeEnv();

    progress(0.6, 'Dźwięki…');
    this.audio = new Audio();
    await this.audio.init();
    this.audio.vol.music = this.settings.music;
    this.audio.vol.sfx = this.settings.sfx;
    this.audio.vol.amb = this.settings.amb;

    this.input = new Input(this.canvas);
    this.input.onLockChange = (on) => this.onLock(on);
    this.hud = new Hud();
    this.hud.icons = this.icons;
    this.panels = new Panels(this);
    this.player = new Player(this.phys, this.camera);
    this.player.sens = this.settings.sens;
    this.player.teleport(SPOTS.spawn.x, SPOTS.spawn.y + 0.1, SPOTS.spawn.z);
    this.player.on.step = () => this.audio.play(this.surface() + '', { vol: 0.35, gap: 0.12 });
    this.player.on.land = (k) => { this.audio.play('land', { vol: 0.4 + k * 0.5 }); this.shake.y -= k * 0.04; };
    this.player.on.jump = () => this.audio.play('jump', { vol: 0.4 });
    this.hands = new Hands(this);
    this.build = new Build(this);
    progress(0.75, 'Ikony…');
    for (const b of BLOCKS) this.icons.block(b.id);
    this.warm();
    progress(1, 'Gotowe');
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  setupPost() {
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.26, 0.4, 1.35);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uSat: { value: 1.03 }, uVig: { value: 0.22 }, uWarm: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat; uniform float uVig; uniform float uWarm; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        c.rgb = mix(vec3(l), c.rgb, uSat);
        c.rgb += vec3(-0.012, 0.004, 0.016) * (1.0 - smoothstep(0.0, 0.45, l)) + vec3(0.016, 0.008, -0.012) * smoothstep(0.5, 1.2, l) * (1.0 + uWarm);
        float d = distance(vUv, vec2(0.5)); c.rgb *= mix(1.0, 1.0 - uVig, smoothstep(0.32, 0.82, d));
        gl_FragColor = c; }`,
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  makeEnv() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const s = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 16, 8);
    const cols = [];
    const p = g.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 10;
      c.set(y > 0 ? '#bfe4ff' : '#9a8f6a').lerp(new THREE.Color(y > 0.4 ? '#3d8fe6' : '#e9f4ff'), Math.abs(y));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
    sun.position.set(5, 7, 3);
    s.add(sun);
    this.scene.environment = pm.fromScene(s, 0.04).texture;
    pm.dispose();
  }

  warm() {
    for (let i = 0; i < Math.min(6, SPECIES.length); i++) this.fishView.instancer(i);
    this.renderer.compile(this.scene, this.camera);
  }

  resize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings.scale));
    this.renderer.setSize(innerWidth, innerHeight, false);
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(innerWidth, innerHeight); }
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  async startSolo() {
    const store = new LocalStore('solo');
    store.me = { uid: this.uid, nick: this.nick };
    await this.attachStore(store, 'leader');
    this.hud.setFarm('Twoja wyspa', false, 1);
  }

  async probeNet() {
    try { await firebase(7000); this.netAvailable = true; } catch (e) { this.netAvailable = false; }
    return this.netAvailable;
  }

  async startOnline(mode, code) {
    const fb = await firebase();
    let fid, create = null;
    if (mode === 'public') {
      fid = null;
      for (let n = 1; n <= 30 && !fid; n++) {
        const pres = (await fb.get(fb.ref(`farms/pub${n}/pres`))).val();
        if (!pres || Object.keys(pres).length < MAX_PLAYERS) fid = 'pub' + n;
      }
      fid = fid || 'pub' + (31 + Math.floor(Math.random() * 60));
      create = { name: `Publiczna Wyspa #${fid.slice(3)}`, pub: true };
    } else if (mode === 'new') {
      fid = randId(6);
      create = { name: `Wyspa ${this.nick}`.slice(0, 24), pub: false };
    } else {
      fid = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (new URLSearchParams(location.search).has('create')) create = { name: 'Wyspa testowa', pub: false };
    }
    const store = new RemoteStore(fb, fid);
    store.me = { uid: fb.uid, nick: this.nick };
    await store.open(create);
    if (!store.state.pub) {
      let rec = [];
      try { rec = JSON.parse(localStorage.getItem('rybnaWyspa.recent') || '[]'); } catch (e) { rec = []; }
      rec = [{ code: fid, name: store.state.name }, ...rec.filter((r) => r.code !== fid)].slice(0, 6);
      try { localStorage.setItem('rybnaWyspa.recent', JSON.stringify(rec)); } catch (e) { /* ignore */ }
    }
    this.uid = fb.uid;
    this.net = new Net(this, fb, store, fid);
    this.pid = this.net.pid;
    await this.attachStore(store, 'pending');
    await this.net.join();
    this.hud.setFarm(store.state.name + (store.state.pub ? '' : ` (kod ${fid})`), true, this.net.count());
  }

  async takeLeadership(seed, stacks) {
    this.role = 'leader';
    if (this.sim) return;
    const saved = seed ? '' : await this.store.loadFishAsync();
    for (const id of [...this.fishView.recs.keys()]) this.fishView.remove(id);
    this.becomeLeader(saved);
    if (seed) {
      for (const it of seed) this.sim.spawn({ ...it.m, id: it.m.id }, it.p.clone(), null, it.q.clone());
    }
    if (stacks) {
      for (const [pid, list] of stacks) {
        const recs = list.map((m) => ({ id: m.id, sp: m.sp, w: m.w, v: m.v, tr: [...(m.tr || [])], up: m.up || 0, ups: [...(m.ups || [])], dry: m.dry || 0, cold: m.cold || 0, iceT: m.iceT || 0, by: pid }));
        this.farm.stacks.set(pid, recs);
        for (const r of recs) this.fishView.upsert(r.id, r);
      }
    }
    for (const [pid, p] of this.net.pres) this.farm.nicks.set(pid, p.n);
  }

  dropLeadership() {
    if (this.sim) {
      this.farm.saveFish();
      for (const f of [...this.sim.fish.values()]) this.sim.dropBody(f);
    }
    this.sim = null;
    this.farm = null;
    this.prev.clear();
    for (const id of [...this.fishView.recs.keys()]) this.fishView.remove(id);
    this.role = 'client';
  }

  async attachStore(store, role) {
    this.store = store;
    this.role = role;
    this.loadHotbar();
    this.blocks.clear();
    for (const [id, rec] of Object.entries(store.state.blocks || {})) this.blocks.set(id, rec);
    store.on('block', (id, rec) => this.blocks.set(id, rec));
    store.on('cash', (v) => { this.hud.setCash(v); this.hud.setLevel(store.state.earned); if (this.panels.shopOpen) this.panels.renderShop(); });
    store.on('wh', () => { if (this.panels.open) this.panels.render(); if (this.panels.shopOpen) this.panels.renderShop(); });
    store.on('up', () => this.applyUpgrades());
    store.on('level', (l) => this.onLevel(l));
    for (const t of ['quests', 'album', 'stats', 'log', 'trash', 'vote']) store.on(t, () => { if (this.panels.open) this.panels.render(); });
    store.on('reset', () => this.onReset());
    this.hud.setCash(store.state.cash, true);
    this.hud.setLevel(store.state.earned);
    this.applyUpgrades();
    if (role === 'leader') this.becomeLeader();
  }

  becomeLeader(seedFish) {
    const store = this.store;
    this.sim = new FishSim(this.phys, (id) => this.models.fishDims(id), {
      isHeld: (id) => this.farm.isHeld(id),
      heldCount: () => this.farm.heldCount(),
      onAdd: (f) => { this.fishView.upsert(f.id, f); this.prev.set(f.id, { p: new THREE.Vector3(), q: new THREE.Quaternion(), ok: false }); if (this.net) this.net.fishAdd(f); },
      onRemove: (f, reason, extra) => this.onFishRemoved(f, reason, extra),
      onMachine: (f, id, ok) => this.onMachine(f, id, ok),
      onTrait: (f) => { this.fishView.upsert(f.id, f); if (this.net) this.net.sendMeta(f); },
      onFlop: (f) => { this.fishView.flop(f.id, this.time); this.flopSound(f); },
      onSpecial: (f, kind) => this.onSpecial(f, kind),
      weather: () => this.farm.weather(),
      luck: () => this.farm.luck(),
      mult: () => this.farm.mult(),
      coolHands: () => upVal(store.state.up, 'lodowka'),
      outdoors: (p) => this.outdoors(p),
    });
    this.farm = new Farm({ sim: this.sim, blocks: this.blocks, store, clock: () => this.clock(), emit: (t, d) => this.onFarm(t, d) });
    this.farm.nicks.set(this.pid, this.nick);
    this.farm.started = 0;
    this.phys.onZone = (z, h, s) => this.sim.onZone(z, h, s);
    const saved = seedFish != null ? seedFish : store.loadFish();
    const n = this.farm.loadFish(saved);
    this.farm.offline();
    this.farm.ensureQuests();
    return n;
  }

  clock() { return Date.now() + (this.net ? this.net.offsetMs : 0); }

  outdoors(p) {
    const R = this.phys.R;
    const hit = this.phys.world.castRay(new R.Ray({ x: p.x, y: p.y + 0.4, z: p.z }, { x: 0, y: 1, z: 0 }), 25, true, undefined, groups(G.PLAYER, G.WORLD));
    return !hit;
  }

  onFishRemoved(f, reason, extra = {}) {
    const pos = extra.pos ? new THREE.Vector3(extra.pos.x, extra.pos.y, extra.pos.z) : null;
    this.fishView.remove(f.id);
    this.prev.delete(f.id);
    if (reason === 'sold') {
      this.farm.onSold(f, extra.value, extra.by);
      this.saleFx(pos || this.structs.sell.pos, extra.value, f);
    } else if (reason === 'lost' && pos) {
      this.fx.burst('splash', new THREE.Vector3(pos.x, 0.05, pos.z), 14, Math.max(0.7, f.L * 2));
      this.audio.play('splash_small', { pos, vol: 0.8 });
      if (SPECIES[f.sp].rarity >= 3 || f.v >= 2) this.hud.toast(`${SPECIES[f.sp].name} wpadła do wody i odpłynęła!`, 'err');
    }
    if (this.net) this.net.fishDel(f.id, reason, extra);
  }

  saleFx(pos, value, f) {
    const p = new THREE.Vector3(pos.x, (this.structs.sell.top || pos.y) + 1.2, pos.z);
    if (pos.distanceTo(this.structs.sell.pos) < 4) p.copy(this.structs.sell.pos).add(new THREE.Vector3(0, 1.4, 0));
    const R = RARITIES[SPECIES[f.sp].rarity];
    this.fx.money(p, value, f.v === 2 ? '#ffd23a' : f.v === 3 ? '#ff9ff0' : R.color === '#b9c2cc' ? '#ffe9a8' : R.color);
    this.fx.burst('coin', p, Math.min(24, 4 + Math.floor(Math.log10(1 + value) * 3)), 1);
    const big = value > Math.max(800, (this.farm ? this.farm.rate : 0) * 0.3);
    this.audio.play(big ? 'sell_big' : value > 200 ? 'sell_3' : value > 30 ? 'sell_2' : 'sell_1', { pos: p, vol: 0.85, range: 45, gap: 0.06 });
    this.hud.bump();
  }

  onMachine(f, id, ok) {
    const b = this.blockNear(f);
    const def = BLOCK_BY_ID[id];
    if (ok) {
      this.fishView.upsert(f.id, f);
      if (b) this.fx.burst(def.trait === 'zamrozona' ? 'snow' : def.trait === 'elektryczna' ? 'zap' : def.trait === 'wedzona' || def.trait === 'grillowana' ? 'smoke' : 'sparkle', b.pos.clone().add(new THREE.Vector3(0, 1, 0)), 10);
      const snd = { zamrozona: 'freezer', wedzona: 'smoker', grillowana: 'smoker', plonaca: 'fire_whoosh', elektryczna: 'zap', plazmowa: 'zap', radioaktywna: 'geiger', blyszczaca: 'polish' }[def.trait] || 'machine';
      if (b) this.audio.play(snd, { pos: b.pos, vol: 0.6 });
      if (this.net) this.net.sendMeta(f);
    }
  }

  blockNear(f) {
    if (!f.body) return null;
    const p = f.body.translation();
    let best = null, bd = 9;
    for (const b of this.blocks.blocks.values()) {
      const d = (b.pos.x - p.x) ** 2 + (b.pos.z - p.z) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  onSpecial(f, kind) {
    if (!f.body) return;
    const p = f.body.translation();
    const v = new THREE.Vector3(p.x, p.y, p.z);
    if (kind === 'rocket') { this.fx.burst('rocket', v, 18, 1.2); this.audio.play('rocket', { pos: v }); }
    if (kind === 'glitch') { this.fx.burst('glitch', v, 14, 1); this.audio.play('glitch', { pos: v, vol: 0.7 }); }
    if (this.net) this.net.event({ k: 'special', id: f.id, kind });
  }

  flopSound(f) {
    if (!f.body) return;
    const p = f.body.translation();
    tmpV.set(p.x, p.y, p.z);
    if (tmpV.distanceToSquared(camPos) > 30 * 30) return;
    this.audio.play('flop', { pos: tmpV, vol: Math.min(1, 0.35 + f.L * 0.6), gap: 0.05, rate: Math.max(0.7, Math.min(1.3, 1.25 - f.L * 0.35)) });
  }

  onFarm(type, d) {
    if (type === 'rare') {
      const S = SPECIES[d.f.sp];
      const R = RARITIES[S.rarity];
      const v = d.f.v ? VARIANTS[d.f.v].name + ' ' : '';
      if (S.rarity >= 5 || d.f.v === 3) this.hud.banner(`${v}${S.name}!`, `${R.name} ryba na wyspie`, 3.2);
      else this.hud.toast(`${v}${S.name} (${R.name.toLowerCase()}) wyskoczyła ze spawnera!`, 'gold');
      this.audio.play('rare', { vol: 0.8 });
      this.fx.burst('sparkle', d.pos, 24, 1.6, R.color);
      if (this.net) this.net.event({ k: 'rare', sp: d.f.sp, v: d.f.v, x: d.pos.x, y: d.pos.y, z: d.pos.z });
    } else if (type === 'spawn') {
      const b = this.blocks.blocks.get(d.block);
      if (b) { this.audio.play(b.def.manual ? 'splash_small' : 'spawner_auto', { pos: b.outlet, vol: b.def.manual ? 0.5 : 0.35, gap: 0.08 }); this.fx.burst('splash', b.outlet, 4, 0.6); }
    } else if (type === 'stack') {
      if (this.net) this.net.stack(d.pid, d.stack);
      if (d.pid !== this.pid) this.avatars.setStack(d.pid, d.stack.map((f) => f.id));
      for (const f of d.stack) this.fishView.upsert(f.id, f);
      if (d.picked && d.pid === this.pid) this.hands.pending.delete(d.picked.id);
    } else if (type === 'sold') {
      if (d.fresh && SPECIES[d.f.sp].rarity >= 2) this.hud.toast(`Nowość w albumie: ${SPECIES[d.f.sp].name}${d.f.v ? ' (' + VARIANTS[d.f.v].name + ')' : ''}`);
      if (d.by && d.by !== this.pid && d.value > 1000) this.hud.toast(`${d.nick} sprzedał(a) rybę za ${fmtZl(d.value)}`);
      if (this.net) this.net.event({ k: 'sold', v: d.value, sp: d.f.sp, var: d.f.v, by: d.by, nick: d.nick });
    } else if (type === 'full') {
      this.hud.setFull(d);
      if (this.net) this.net.event({ k: 'full', on: d });
    } else if (type === 'rate') {
      this.hud.setRate(d);
    } else if (type === 'quest') {
      this.hud.banner('Zadanie wykonane!', `+${fmtZl(d.reward, 0)}`, 2.4);
      this.audio.play('quest_done');
      if (this.net) this.net.event({ k: 'quest', r: d.reward });
    } else if (type === 'offline') {
      this.hud.banner(`+${fmtZl(d.earned, 0)}`, `Farma zarobiła pod Waszą nieobecność (${Math.round(d.gap / 60)} min)`, 4.5);
    }
  }

  onLevel(l) {
    this.hud.banner(`Poziom ${l}!`, 'Nowe rzeczy w sklepie', 3);
    this.audio.play('level_up');
    const fresh = BLOCKS.filter((b) => b.lvl === l).map((b) => b.name);
    if (fresh.length) this.hud.toast(`Odblokowane: ${fresh.slice(0, 4).join(', ')}${fresh.length > 4 ? '…' : ''}`, 'gold');
    if (this.net && this.role === 'leader') this.net.event({ k: 'level', l });
  }

  onReset() {
    this.blocks.clear();
    for (const [id, rec] of Object.entries(this.store.state.blocks || {})) this.blocks.set(id, rec);
    if (this.sim) for (const id of [...this.sim.fish.keys()]) this.sim.remove(id, 'reset');
    if (this.farm) this.farm.stacks.clear();
    this.hud.setCash(this.store.state.cash, true);
    this.hud.setLevel(this.store.state.earned);
    this.hud.banner('Rebirth!', `Mnożnik cen ×${(this.store.state.mult || 1).toFixed(2)}`, 4);
    this.applyUpgrades();
  }

  applyUpgrades() {
    const up = this.store ? this.store.state.up : {};
    this.player.runMul = upVal(up, 'bieg');
    this.player.jumpMul = upVal(up, 'skok');
    this.player.maxJumps = upVal(up, 'podwojny') ? 2 : 1;
    this.player.maxFuel = upVal(up, 'jetpack');
    if (this.panels && this.panels.open) this.panels.render();
  }

  myStack() {
    if (this.role === 'leader' && this.farm) return this.farm.stacks.get(this.pid) || [];
    return this.net ? this.net.stacks.get(this.pid) || [] : [];
  }

  isHeldId(id) {
    if (this.role === 'leader' && this.farm) return this.farm.isHeld(id);
    return this.net ? this.net.isHeld(id) : false;
  }

  fishCount() { return this.fishView.recs.size; }

  onlineList() {
    if (this.net) return this.net.onlineList();
    return [{ n: this.nick, c: this.color, leader: true }];
  }

  ranking() {
    if (this.net) return this.net.rankingList();
    return [{ id: this.store.state.id, name: 'Twoja wyspa (solo)', rate: this.farm ? this.farm.rate : 0, earned: this.store.state.earned, pub: false, rb: this.store.state.rebirths }];
  }

  get authority() {
    if (this.role === 'leader') {
      const me = this.pid;
      return {
        pick: (id) => this.farm.pick(me, id),
        throw: (o, v) => this.farm.throwOne(me, o, v),
        dump: (o, d) => this.farm.dump(me, o, d),
        click: (bid) => this.farm.click(bid, me),
      };
    }
    return this.net.authority;
  }

  nearShop() {
    return this.player.feet.distanceTo(this.structs.shop.pos) < 3.8 || this.player.feet.distanceTo(SPOTS.shop) < 3.4;
  }

  nearSell() {
    const f = this.player.feet;
    if (Math.hypot(f.x - this.structs.sell.pos.x, f.z - this.structs.sell.pos.z) < 5) return this.structs.sell;
    for (const b of this.blocks.blocks.values()) if (b.def.kind === 'sell' && b.pos.distanceTo(f) < 4.5) return { pos: b.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), top: b.pos.y + 2.6 };
    return null;
  }

  groundAt(x, z) { return islandHeight(x, z); }

  isStructure(col) {
    const b = col.parent();
    return b && this.structBodies.has(b.handle) && b !== this.phys.island;
  }

  surface() {
    const f = this.player.feet;
    if (f.y > LAND + 0.15) {
      const R = this.phys.R;
      const hit = this.phys.world.castRay(new R.Ray({ x: f.x, y: f.y + 0.3, z: f.z }, { x: 0, y: -1, z: 0 }), 0.8, true, undefined, groups(G.PLAYER, G.WORLD));
      const b = hit && this.blocks.blockAtCollider(hit.collider);
      if (b) return ['belt', 'machine', 'spawner', 'funnel', 'sell', 'ice'].includes(b.def.kind) ? 'step_metal' : 'step_wood';
    }
    const isl = islandHeight(f.x, f.z);
    return isl < 0.35 ? 'step_sand' : 'step_grass';
  }

  loadHotbar() {
    try {
      const s = JSON.parse(localStorage.getItem('rybnaWyspa.hotbar.' + (this.store.state.id || 'x')) || 'null');
      if (Array.isArray(s) && s.length === 9) this.hotbarSlots = s.map((t, i) => (i === 0 ? null : t && BLOCK_BY_ID[t] ? t : null));
    } catch (e) { /* default */ }
  }

  saveHotbar() {
    try { localStorage.setItem('rybnaWyspa.hotbar.' + (this.store.state.id || 'x'), JSON.stringify(this.hotbarSlots)); } catch (e) { /* ignore */ }
  }

  assignSlot(type) {
    const i = this.selSlot > 0 ? this.selSlot : this.hotbarSlots.findIndex((t, k) => k > 0 && !t);
    const at = i > 0 ? i : 8;
    const prev = this.hotbarSlots.indexOf(type);
    if (prev > 0) this.hotbarSlots[prev] = null;
    this.hotbarSlots[at] = type;
    this.selSlot = at;
    this.saveHotbar();
  }

  autoSlot(type) {
    if (this.hotbarSlots.includes(type)) return;
    const i = this.hotbarSlots.findIndex((t, k) => k > 0 && !t);
    if (i > 0) { this.hotbarSlots[i] = type; this.saveHotbar(); }
  }

  onLock(on) {
    if (on) { this.paused = false; document.getElementById('pause').classList.add('hidden'); }
    else if (this.playing && !this.panels.open && !this.panels.shopOpen) this.pause(true);
  }

  pause(on) {
    this.paused = on;
    document.getElementById('pause').classList.toggle('hidden', !on);
    if (on) this.input.unlock();
  }

  enterPlay() {
    this.playing = true;
    this.hud.show(true);
    document.getElementById('menu').classList.add('hidden');
    this.audio.unlock();
    this.input.lock();
  }

  handleKeys(inp) {
    for (const k of inp.pressed) {
      if (k === 'Tab') {
        if (this.panels.shopOpen) this.panels.toggleShop(false);
        const on = !this.panels.open;
        this.panels.toggle(on);
        if (on) this.input.unlock(); else this.input.lock();
        this.audio.play(on ? 'ui_open' : 'ui_close');
      } else if (k === 'Escape') {
        if (this.panels.open) { this.panels.toggle(false); this.input.lock(); }
        else if (this.panels.shopOpen) { this.panels.toggleShop(false); this.input.lock(); }
      } else if (k === 'KeyE') {
        if (this.panels.shopOpen) { this.panels.toggleShop(false); this.input.lock(); this.audio.play('ui_close'); }
        else if (this.nearShop() && !this.panels.open) { this.panels.toggleShop(true); this.input.unlock(); this.audio.play('ui_open'); }
      } else if (k.startsWith('Digit') && this.input.locked) {
        const n = +k.slice(5);
        if (n >= 1 && n <= 9) { this.selSlot = n - 1; this.audio.play('ui_tab', { vol: 0.4 }); }
      } else if (k === 'KeyF' && this.settings.debug) {
        this.debugMoney();
      }
    }
    if (inp.wheel && this.input.locked) {
      this.selSlot = (this.selSlot + (inp.wheel > 0 ? 1 : -1) + 9) % 9;
    }
  }

  debugMoney() {
    if (this.role === 'leader') this.store.addCash(1e6, true);
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    U.time.value = this.time;
    const inp = this.input.consume();
    if (this.playing) this.handleKeys(inp);
    const active = this.playing && (this.input.locked || this.settings.nolock) && !this.paused && !this.panels.open && !this.panels.shopOpen;
    if (active) this.player.look(inp.dx, inp.dy);
    this.acc = Math.min((this.acc || 0) + dt, STEP * 4);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.fixed(active);
    }
    const alpha = this.acc / STEP;
    if (this.playing) {
      this.shake.multiplyScalar(Math.exp(-dt * 10));
      this.player.applyCamera(alpha, dt, this.shake);
    } else this.menuCamera(dt);
    this.camera.updateMatrixWorld();
    camPos.copy(this.camera.position);
    this.syncFish(alpha);
    const type = this.selSlot > 0 ? this.hotbarSlots[this.selSlot] : null;
    if (this.playing && this.store) {
      this.hands.update(dt, inp, active && this.selSlot === 0);
      this.build.update(dt, active ? inp : { pressed: [] }, this.selSlot > 0 && type ? type : null);
      if (!active && this.selSlot === 0) this.hud.prompt('');
      this.hands.frame(dt);
      this.hud.hotbar(this.hotbarSlots, this.selSlot, this.store.state.wh, this.icons);
      const cap = upVal(this.store.state.up, 'stos');
      this.hud.stack(this.myStack(), cap, this.store.state.mult || 1);
      this.player.carry = Math.min(1, this.myStack().length / Math.max(8, cap));
      this.labelFish();
    }
    if (this.net) this.net.frame(dt);
    this.avatars.frame(dt, this.net ? this.net.renderTime() : this.time);
    this.envUpdate(dt);
    this.fishView.frame();
    this.fx.traitFx(this.fishView.recs.values(), camPos, dt);
    this.fx.tick(dt, innerHeight);
    this.blocks.frame();
    this.hud.frame(dt);
    this.audioTick(dt);
    if (this.store) this.store.tick(dt);
    this.renderer.info.reset();
    this.composer.render();
    this.fpsN++;
    this.fpsT += dt;
    if (this.fpsT > 1) {
      this.fps = this.fpsN / this.fpsT;
      this.fpsN = 0;
      this.fpsT = 0;
      if (this.settings.showFps) this.hud.fps(`${Math.round(this.fps)} fps · ${this.renderer.info.render.calls} dc · ${this.fishCount()} ryb`);
    }
  }

  fixed(active) {
    this.player.fixedUpdate(STEP, this.input.keys, !active);
    if (this.role === 'leader' && this.sim) {
      if (this.net) this.net.preStep(STEP);
      for (const f of this.sim.fish.values()) {
        if (!f.body) continue;
        let pr = this.prev.get(f.id);
        if (!pr) { pr = { p: new THREE.Vector3(), q: new THREE.Quaternion(), ok: false }; this.prev.set(f.id, pr); }
        const p = f.body.translation(), q = f.body.rotation();
        pr.p.set(p.x, p.y, p.z);
        pr.q.set(q.x, q.y, q.z, q.w);
        pr.ok = true;
      }
      this.phys.step((z, h, s) => this.sim.onZone(z, h, s));
      this.sim.update(STEP);
      this.farm.tick(STEP);
    } else {
      this.phys.step(() => {});
    }
  }

  syncFish(alpha) {
    if (this.role === 'leader' && this.sim) {
      for (const f of this.sim.fish.values()) {
        if (!f.body) continue;
        const p = f.body.translation(), q = f.body.rotation();
        const pr = this.prev.get(f.id);
        tmpV.set(p.x, p.y, p.z);
        tmpQ.set(q.x, q.y, q.z, q.w);
        if (pr && pr.ok) { tmpV.lerpVectors(pr.p, tmpV, alpha); tmpQ.slerpQuaternions(pr.q, tmpQ, alpha); }
        const r = this.fishView.recs.get(f.id);
        if (!r) continue;
        r.p.copy(tmpV);
        r.q.copy(tmpQ);
        r.visible = true;
        this.fishView.place(r);
        if (r.swim !== (f.swim ? 1 : 0)) this.fishView.swim(f.id, f.swim ? 1 : 0);
      }
    } else if (this.net) {
      this.net.syncFish(this.fishView);
    }
  }

  labelFish() {
    const id = this.hands.hover;
    if (id == null || this.selSlot !== 0) { this.hud.fishLabel(null); return; }
    const r = this.fishView.recs.get(id);
    if (!r) { this.hud.fishLabel(null); return; }
    tmpV.copy(r.p);
    tmpV.y += r.L * 0.35 + 0.18;
    tmpV.project(this.camera);
    if (tmpV.z > 1) { this.hud.fishLabel(null); return; }
    const sx = (tmpV.x * 0.5 + 0.5) * innerWidth, sy = (-tmpV.y * 0.5 + 0.5) * innerHeight;
    const meta = this.role === 'leader' && this.sim && this.sim.fish.get(id) ? this.sim.fish.get(id) : r.meta;
    this.hud.fishLabel(meta, this.store.state.mult || 1, sx, sy - 6);
  }

  envUpdate(dt) {
    const tSec = this.clock() / 1000;
    const seed = this.store ? this.store.state.seed : 7;
    const phase = this.settings.phase != null ? this.settings.phase : dayPhase(tSec, seed);
    const w = this.settings.weather ? { id: this.settings.weather, left: 99, len: 99 } : weatherAt(tSec, seed);
    const night = isNight(phase);
    this.sky.setWeather(w.id, Math.min(1, dt * 0.5));
    const flash = this.wfx.update(w.id, dt, this.time, camPos, night);
    const L = this.sky.update(phase, dt, this.time, camPos, flash);
    this.water.update(this.time, L);
    if (this.grassDirty) { this.grassDirty = false; this.grass.setShapes(this.grassShapes()); }
    this.grass.update(this.time, this.player.feet, ['wichura', 'burza'].includes(w.id) ? 2.6 : 1, ['mroz', 'sniezyca'].includes(w.id) ? 0.8 : 0);
    U.lamp.value = L.lampK;
    waterLight.value.setScalar(0.35 + 0.65 * (1 - L.night * 0.75));
    this.light = L;
    this.weatherNow = w;
    this.nightNow = night;
    if (this.playing && (this.wT = (this.wT || 0) - dt) <= 0) {
      this.wT = 1;
      this.hud.setWeather(w, night);
      if (this.lastW !== w.id) {
        if (this.lastW && w.id !== 'clear') { this.hud.toast(`Pogoda: ${WEATHERS[w.id].name}`, 'gold'); }
        this.lastW = w.id;
      }
      this.audio.setMood(night ? 'night' : 'day');
    }
  }

  grassShapes() {
    const out = [{ x: SPOTS.sell.x, z: SPOTS.sell.z, r: 6.3 }, { x: SPOTS.shop.x, z: SPOTS.shop.z, w: 5.4, l: 3.4, yaw: 0 }];
    for (const b of this.blocks.blocks.values()) {
      if (b.def.ghost) continue;
      out.push({ x: b.pos.x, z: b.pos.z, w: b.def.dim[0], l: b.def.dim[2], yaw: b.rec.ry || 0 });
    }
    return out;
  }

  audioTick(dt) {
    const a = this.audio;
    a.setListener(camPos, this.player.yaw);
    if (!a.ready) return;
    const w = this.weatherNow ? this.weatherNow.id : 'clear';
    const night = this.nightNow;
    a.loop('amb', 'waves', 0.55);
    a.loop('amb', 'birds_day', night || ['deszcz', 'burza', 'sniezyca'].includes(w) ? 0 : 0.45);
    a.loop('amb', 'night', night ? 0.5 : 0);
    a.loop('amb', 'rain', w === 'deszcz' ? 0.6 : 0);
    a.loop('amb', 'storm', w === 'burza' ? 0.7 : 0);
    a.loop('amb', 'wind', w === 'wichura' || w === 'mroz' ? 0.55 : 0);
    a.loop('amb', 'snow', w === 'sniezyca' ? 0.5 : 0);
    a.loop('amb', 'heat', w === 'upal' ? 0.45 : 0);
    a.loop('amb', 'fog', w === 'mgla' ? 0.5 : 0);
    this.loopT = (this.loopT || 0) - dt;
    if (this.loopT <= 0) {
      this.loopT = 0.3;
      let belts = 0, flumes = 0;
      for (const b of this.blocks.blocks.values()) {
        const k = b.def.kind;
        if (k !== 'belt' && k !== 'flume' && k !== 'machine') continue;
        const d = b.pos.distanceTo(camPos);
        if (d > 18) continue;
        const v = 1 - d / 18;
        if (k === 'flume') flumes += v; else belts += v;
      }
      a.loop('sfx', 'conveyor_loop', Math.min(0.5, belts * 0.12));
      a.loop('sfx', 'flume_loop', Math.min(0.55, flumes * 0.15));
      a.loop('sfx', 'jetpack_loop', this.player.jetting ? 0.5 : 0);
    }
    a.tick(dt);
  }

  menuCamera(dt) {
    this.mT = (this.mT || 0) + dt * 0.04;
    const r = 38;
    this.camera.position.set(Math.cos(this.mT) * r, 17 + Math.sin(this.mT * 1.3) * 3, Math.sin(this.mT) * r);
    this.camera.lookAt(0, 1.5, 2);
  }
}

export function loadSettings() {
  const d = { nick: '', color: '#4aa8ff', music: 0.45, sfx: 0.85, amb: 0.7, sens: 1, scale: 1.25, fov: 75, showFps: false, debug: false };
  try { Object.assign(d, JSON.parse(localStorage.getItem('rybnaWyspa.settings') || '{}')); } catch (e) { /* defaults */ }
  if (new URLSearchParams(location.search).has('debug')) d.debug = true;
  if (new URLSearchParams(location.search).has('fps')) d.showFps = true;
  const q = new URLSearchParams(location.search);
  d.nolock = q.has('nolock');
  d.phase = q.has('phase') ? +q.get('phase') : null;
  d.weather = q.get('weather') || null;
  return d;
}

export function saveSettings(s) {
  try { localStorage.setItem('rybnaWyspa.settings', JSON.stringify(s)); } catch (e) { /* ignore */ }
}

export { FISH_CAP, fishValue, TRAIT_BY_ID, levelOf };
