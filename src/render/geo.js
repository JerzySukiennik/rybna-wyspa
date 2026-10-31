// Rybna Wyspa: tiny procedural mesh builder (flat-shaded, vertex colours, optional emissive mask and uv).

import * as THREE from 'three';

const tmp = new THREE.Vector3();
const col = new THREE.Color();

export class Geo {
  constructor() {
    this.p = [];
    this.c = [];
    this.e = [];
    this.uv = [];
    this.m = new THREE.Matrix4();
    this.stack = [];
  }

  push(m) {
    this.stack.push(this.m.clone());
    this.m.multiply(m);
    return this;
  }

  pop() {
    this.m = this.stack.pop();
    return this;
  }

  at(x, y, z, ry = 0, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
    m.setPosition(x, y, z);
    return this.push(m);
  }

  tri(a, b, d, color, emit = 0, uvs = null) {
    col.set(color);
    for (const v of [a, b, d]) {
      tmp.set(v[0], v[1], v[2]).applyMatrix4(this.m);
      this.p.push(tmp.x, tmp.y, tmp.z);
      this.c.push(col.r, col.g, col.b);
      this.e.push(emit);
    }
    if (uvs) this.uv.push(...uvs[0], ...uvs[1], ...uvs[2]);
    else this.uv.push(0, 0, 0, 0, 0, 0);
    return this;
  }

  quad(a, b, d, e, color, emit = 0, uvs = null) {
    this.tri(a, b, d, color, emit, uvs ? [uvs[0], uvs[1], uvs[2]] : null);
    this.tri(a, d, e, color, emit, uvs ? [uvs[0], uvs[2], uvs[3]] : null);
    return this;
  }

  quadN(a, b, d, e, n, color, emit = 0, uvs = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) return this.quad(e, d, b, a, color, emit, uvs ? [uvs[3], uvs[2], uvs[1], uvs[0]] : null);
    return this.quad(a, b, d, e, color, emit, uvs);
  }

  triN(a, b, d, n, color, emit = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    return cx * n[0] + cy * n[1] + cz * n[2] < 0 ? this.tri(a, d, b, color, emit) : this.tri(a, b, d, color, emit);
  }

  box(cx, cy, cz, sx, sy, sz, color, o = {}) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const top = o.top || color, side = o.side || color, bottom = o.bottom || side, em = o.emit || 0;
    if (!o.noTop) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], top, o.emitTop ?? em);
    if (!o.noBottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], bottom, em);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], o.front || side, em);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], o.back || side, em);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], side, em);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], side, em);
    return this;
  }

  cyl(cx, cy, cz, r0, r1, h, seg, color, o = {}) {
    const top = o.top || color, em = o.emit || 0;
    const y0 = cy, y1 = cy + h;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2 + (o.rot || 0), a1 = ((i + 1) / seg) * Math.PI * 2 + (o.rot || 0);
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const sideCol = o.alt && i % 2 ? o.alt : color;
      this.quad([cx + c0 * r0, y0, cz + s0 * r0], [cx + c0 * r1, y1, cz + s0 * r1], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c1 * r0, y0, cz + s1 * r0], sideCol, em);
      if (!o.noTop && r1 > 0) this.tri([cx, y1, cz], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c0 * r1, y1, cz + s0 * r1], top, o.emitTop ?? em);
      if (!o.noBottom && r0 > 0) this.tri([cx, y0, cz], [cx + c0 * r0, y0, cz + s0 * r0], [cx + c1 * r0, y0, cz + s1 * r0], o.bottom || color, em);
    }
    return this;
  }

  tube(cx, cy, cz, r, h, seg, color, o = {}) {
    return this.cyl(cx, cy, cz, r, r, h, seg, color, o);
  }

  ring(cx, cy, cz, rIn, rOut, h, seg, color, o = {}) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (r, a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      const y0 = cy, y1 = cy + h;
      this.quad(p(rIn, a0, y1), p(rIn, a1, y1), p(rOut, a1, y1), p(rOut, a0, y1), o.top || color, o.emit || 0);
      this.quad(p(rOut, a0, y0), p(rOut, a0, y1), p(rOut, a1, y1), p(rOut, a1, y0), color, o.emit || 0);
      this.quad(p(rIn, a1, y0), p(rIn, a1, y1), p(rIn, a0, y1), p(rIn, a0, y0), o.inner || color, o.emit || 0);
    }
    return this;
  }

  line(a, b, r, color, seg = 6, o = {}) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    if (len < 1e-5) return this;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    this.push(new THREE.Matrix4().compose(new THREE.Vector3(a[0], a[1], a[2]), q, new THREE.Vector3(1, 1, 1)));
    this.cyl(0, 0, 0, r, o.r1 ?? r, len, seg, color, o);
    return this.pop();
  }

  torus(cx, cy, cz, R, r, segR, segT, color, o = {}) {
    const arc = o.arc ?? Math.PI * 2;
    const P = (a, b) => [cx + (R + r * Math.cos(b)) * Math.cos(a), cy + (R + r * Math.cos(b)) * Math.sin(a), cz + r * Math.sin(b)];
    for (let i = 0; i < segR; i++) {
      const a0 = (i / segR) * arc + (o.a0 || 0), a1 = ((i + 1) / segR) * arc + (o.a0 || 0);
      for (let j = 0; j < segT; j++) {
        const b0 = (j / segT) * Math.PI * 2, b1 = ((j + 1) / segT) * Math.PI * 2;
        this.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1), o.alt && i % 2 ? o.alt : color, o.emit || 0);
      }
    }
    return this;
  }

  prism(pts, z0, z1, color, o = {}) {
    const n = pts.length;
    const side = o.side || color;
    for (let i = 1; i < n - 1; i++) {
      this.tri([pts[0][0], pts[0][1], z1], [pts[i][0], pts[i][1], z1], [pts[i + 1][0], pts[i + 1][1], z1], color, o.emit || 0);
      this.tri([pts[0][0], pts[0][1], z0], [pts[i + 1][0], pts[i + 1][1], z0], [pts[i][0], pts[i][1], z0], color, o.emit || 0);
    }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      this.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], side, o.emit || 0);
    }
    return this;
  }

  geometry({ uv = false, emit = true } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (emit) g.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.e, 1));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}
