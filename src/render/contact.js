// Rybna Wyspa: cheap contact shadows (soft dark blobs under fish lying on the ground, under placed blocks, buildings and trees).

import * as THREE from 'three';

function blobTexture(rect) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  if (rect) {
    x.filter = 'blur(7px)';
    x.fillStyle = 'rgba(0,0,0,1)';
    x.fillRect(12, 12, 40, 40);
  } else {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function layer(scene, tex, cap, opacity) {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#000000', map: tex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.InstancedMesh(geo, mat, cap);
  m.count = 0;
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m);
  return m;
}

const m4 = new THREE.Matrix4();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const fwd = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class ContactShadows {
  constructor(scene, groundAt) {
    this.groundAt = groundAt;
    this.round = layer(scene, blobTexture(false), 64, 0.42);
    this.rect = layer(scene, blobTexture(true), 1024, 0.5);
    this.fishL = layer(scene, blobTexture(false), 420, 0.5);
    this.fixed = [];
  }

  setFixed(list) {
    this.fixed = list;
    let nr = 0, nq = 0;
    for (const it of list) {
      p.set(it.x, it.y + 0.02, it.z);
      q.setFromAxisAngle(Y, it.yaw || 0);
      if (it.r) {
        if (nr >= this.round.instanceMatrix.count) continue;
        s.set(it.r * 2, 1, it.r * 2);
        this.round.setMatrixAt(nr++, m4.compose(p, q, s));
      } else {
        if (nq >= 1024) continue;
        s.set(it.w * 1.28 + 0.25, 1, it.l * 1.28 + 0.25);
        this.rect.setMatrixAt(nq++, m4.compose(p, q, s));
      }
    }
    this.round.count = nr;
    this.rect.count = nq;
    this.round.instanceMatrix.needsUpdate = true;
    this.rect.instanceMatrix.needsUpdate = true;
  }

  fish(recs) {
    let n = 0;
    for (const r of recs) {
      if (!r.visible || r.held || n >= 420) continue;
      const g = this.groundAt(r.p.x, r.p.z);
      const hgt = r.p.y - g;
      if (hgt > 0.5 || hgt < -0.3) continue;
      const k = 1 - Math.max(0, hgt) / 0.5;
      fwd.set(1, 0, 0).applyQuaternion(r.q);
      q.setFromAxisAngle(Y, Math.atan2(-fwd.z, fwd.x));
      p.set(r.p.x, g + 0.025, r.p.z);
      s.set(r.L * (0.9 + 0.3 * k), 1, Math.max(0.08, r.L * 0.38) * (0.8 + 0.4 * k));
      this.fishL.setMatrixAt(n++, m4.compose(p, q, s));
    }
    this.fishL.count = n;
    this.fishL.instanceMatrix.needsUpdate = true;
  }
}
