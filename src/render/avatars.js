// Rybna Wyspa: other players' fishermen (interpolated movement, walk cycle, nick tags, the fish stack in their arms).

import * as THREE from 'three';

const DELAY = 0.12;

function nickSprite(nick, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.font = '800 30px Nunito, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const w = Math.min(240, x.measureText(nick).width + 30);
  x.fillStyle = 'rgba(23,36,46,0.6)';
  x.beginPath();
  x.roundRect(128 - w / 2, 10, w, 44, 22);
  x.fill();
  x.fillStyle = color;
  x.beginPath();
  x.arc(128 - w / 2 + 18, 32, 6, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ffffff';
  x.fillText(nick, 136, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.4, 1);
  s.position.y = 2.15;
  return s;
}

export class Avatars {
  constructor(scene, models, fishView) {
    this.scene = scene;
    this.models = models;
    this.fishView = fishView;
    this.list = new Map();
  }

  ensure(pid, nick, color) {
    let a = this.list.get(pid);
    if (a && (a.nick !== nick || a.color !== color)) { this.remove(pid); a = null; }
    if (a) return a;
    const root = new THREE.Group();
    const body = this.models.buildAvatar(color);
    body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(body);
    root.add(nickSprite(nick, color));
    this.scene.add(root);
    const part = (n) => body.getObjectByName(n);
    a = { pid, nick, color, root, body, parts: { armL: part('armL'), armR: part('armR'), legL: part('legL'), legR: part('legR'), head: part('head') }, buf: [], walk: 0, pos: new THREE.Vector3(), yaw: 0, pitch: 0, speed: 0, stack: [] };
    this.list.set(pid, a);
    return a;
  }

  push(pid, s, t) {
    const a = this.ensure(pid, s.n || 'Gracz', s.c || '#4aa8ff');
    a.buf.push({ t, x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch || 0 });
    if (a.buf.length > 30) a.buf.shift();
  }

  setStack(pid, ids) {
    const a = this.list.get(pid);
    if (a) a.stack = ids;
  }

  remove(pid) {
    const a = this.list.get(pid);
    if (!a) return;
    this.scene.remove(a.root);
    a.root.traverse((o) => { if (o.material && o.material.map) o.material.map.dispose(); });
    this.list.delete(pid);
  }

  frame(dt, now) {
    const t = now - DELAY;
    for (const a of this.list.values()) {
      const b = a.buf;
      if (!b.length) continue;
      let i = b.length - 1;
      while (i > 0 && b[i - 1].t > t) i--;
      const s1 = b[i], s0 = b[Math.max(0, i - 1)];
      const k = s1.t > s0.t ? Math.min(1, Math.max(0, (t - s0.t) / (s1.t - s0.t))) : 1;
      const px = s0.x + (s1.x - s0.x) * k, py = s0.y + (s1.y - s0.y) * k, pz = s0.z + (s1.z - s0.z) * k;
      let dy = s1.yaw - s0.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const yaw = s0.yaw + dy * k;
      const sp = Math.hypot(px - a.pos.x, pz - a.pos.z) / Math.max(dt, 1e-3);
      a.speed += (Math.min(9, sp) - a.speed) * Math.min(1, dt * 8);
      a.pos.set(px, py, pz);
      a.root.position.copy(a.pos);
      a.root.rotation.y = yaw;
      a.walk += dt * a.speed * 1.7;
      const sw = Math.sin(a.walk) * Math.min(0.7, a.speed * 0.12);
      const P = a.parts;
      const carrying = a.stack.length > 0;
      if (P.legL) P.legL.rotation.x = sw;
      if (P.legR) P.legR.rotation.x = -sw;
      if (P.armL) P.armL.rotation.x = carrying ? -1.15 : -sw * 0.8;
      if (P.armR) P.armR.rotation.x = carrying ? -1.15 : sw * 0.8;
      if (P.head) P.head.rotation.x = -(s1.pitch || 0) * 0.5;
      let y = 1.05;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      for (let n = 0; n < a.stack.length; n++) {
        const r = this.fishView.recs.get(a.stack[n]);
        if (!r) continue;
        if (n > 12) { r.visible = false; r.p.set(0, -60, 0); this.fishView.place(r); continue; }
        r.visible = true;
        const th = Math.max(0.03, r.L * r.dims.w * r.fat);
        r.p.set(px + fwd.x * 0.42, py + y + th / 2, pz + fwd.z * 0.42);
        r.q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -yaw + (n % 2 ? 0.1 : -0.1) + Math.PI / 2, 'XZY'));
        this.fishView.place(r);
        y += th * 0.9;
      }
    }
  }
}
