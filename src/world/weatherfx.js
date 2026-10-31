// Rybna Wyspa: on-screen weather (rain and snow around the camera, lightning, meteors, rainbow arc).

import * as THREE from 'three';

const RAIN = 1800;
const SNOW = 1400;

export class WeatherFx {
  constructor(scene) {
    this.scene = scene;
    const rg = new THREE.BufferGeometry();
    const rp = new Float32Array(RAIN * 6);
    for (let i = 0; i < RAIN; i++) {
      const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60;
      rp.set([x, y, z, x + 0.06, y - 0.7, z + 0.03], i * 6);
    }
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uK: { value: 0 }, uSpeed: { value: 22 } },
      vertexShader: `uniform float uT; uniform vec3 uCam; uniform float uSpeed; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uT * uSpeed, 30.0); p.x = mod(p.x - uCam.x + 30.0, 60.0) - 30.0 + uCam.x; p.z = mod(p.z - uCam.z + 30.0, 60.0) - 30.0 + uCam.z; p.y += uCam.y - 8.0; vA = 1.0 - smoothstep(10.0, 30.0, distance(p.xz, uCam.xz)); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform float uK; varying float vA; void main(){ gl_FragColor = vec4(0.78, 0.86, 0.95, 0.42 * uK * vA); }`,
      transparent: true, depthWrite: false,
    });
    this.rain = new THREE.LineSegments(rg, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(SNOW * 3);
    for (let i = 0; i < SNOW; i++) sp.set([(Math.random() - 0.5) * 50, Math.random() * 24, (Math.random() - 0.5) * 50], i * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snowMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uK: { value: 0 } },
      vertexShader: `uniform float uT; uniform vec3 uCam; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uT * 1.6, 24.0); p.x = mod(p.x + sin(uT * 0.7 + p.y) * 0.6 - uCam.x + 25.0, 50.0) - 25.0 + uCam.x; p.z = mod(p.z - uCam.z + 25.0, 50.0) - 25.0 + uCam.z; p.y += uCam.y - 6.0;
        vec4 mv = viewMatrix * vec4(p, 1.0); vA = 1.0 - smoothstep(8.0, 25.0, length(mv.xyz)); gl_PointSize = min(9.0, 60.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; if (length(d) > 0.5) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, 0.85 * uK * vA); }`,
      transparent: true, depthWrite: false,
    });
    this.snow = new THREE.Points(sg, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    scene.add(this.snow);

    const arc = new THREE.TorusGeometry(380, 16, 6, 48, Math.PI);
    const cols = [];
    const pos = arc.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const r = Math.hypot(x, y);
      c.setHSL(((r - 364) / 32) * 0.8, 0.85, 0.62);
      cols.push(c.r, c.g, c.b);
    }
    arc.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.bowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.bow = new THREE.Mesh(arc, this.bowMat);
    this.bow.position.set(-200, -60, -700);
    this.bow.rotation.y = 0.35;
    this.bow.renderOrder = -5;
    scene.add(this.bow);

    this.meteors = [];
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Line(mg.clone(), new THREE.LineBasicMaterial({ color: '#f4e6ff', transparent: true, opacity: 0, fog: false }));
      m.frustumCulled = false;
      scene.add(m);
      this.meteors.push({ m, t: -1, a: new THREE.Vector3(), b: new THREE.Vector3() });
    }
    this.k = { rain: 0, snow: 0, bow: 0, meteor: 0 };
    this.flash = 0;
    this.nextBolt = 6;
    this.onThunder = null;
  }

  update(id, dt, t, cam, night) {
    const tgt = { rain: 0, snow: 0, bow: 0, meteor: 0 };
    if (id === 'deszcz') tgt.rain = 0.7;
    if (id === 'burza') tgt.rain = 1;
    if (id === 'sniezyca') tgt.snow = 1;
    if (id === 'mroz') tgt.snow = 0.25;
    if (id === 'tecza') tgt.bow = 1;
    if (id === 'meteory') tgt.meteor = 1;
    for (const k in tgt) this.k[k] += (tgt[k] - this.k[k]) * Math.min(1, dt * 0.6);
    this.rain.visible = this.k.rain > 0.02;
    this.rainMat.uniforms.uK.value = this.k.rain;
    this.rainMat.uniforms.uT.value = t;
    this.rainMat.uniforms.uCam.value.copy(cam);
    this.rainMat.uniforms.uSpeed.value = id === 'burza' ? 30 : 22;
    this.snow.visible = this.k.snow > 0.02;
    this.snowMat.uniforms.uK.value = this.k.snow;
    this.snowMat.uniforms.uT.value = t;
    this.snowMat.uniforms.uCam.value.copy(cam);
    this.bowMat.opacity = this.k.bow * 0.42;
    this.bow.visible = this.k.bow > 0.01;
    this.flash = Math.min(1, Math.max(0, this.flash - Math.max(0, dt) * 4));
    if (id === 'burza') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 5 + Math.random() * 11;
        this.flash = 1;
        if (this.onThunder) setTimeout(() => this.onThunder(), 300 + Math.random() * 1600);
      }
    }
    for (const s of this.meteors) {
      if (s.t < 0) {
        if (this.k.meteor > 0.3 && night && Math.random() < dt * 0.8) {
          s.t = 0;
          const a = Math.random() * Math.PI * 2;
          s.a.set(cam.x + Math.cos(a) * 300, 160 + Math.random() * 80, cam.z + Math.sin(a) * 300);
          s.b.set(s.a.x + (Math.random() - 0.5) * 220, s.a.y - 70 - Math.random() * 60, s.a.z + (Math.random() - 0.5) * 220);
        }
        continue;
      }
      s.t += dt * 1.5;
      const p = s.m.geometry.attributes.position;
      const h = Math.min(1, s.t), tl = Math.max(0, s.t - 0.35);
      p.setXYZ(0, s.a.x + (s.b.x - s.a.x) * tl, s.a.y + (s.b.y - s.a.y) * tl, s.a.z + (s.b.z - s.a.z) * tl);
      p.setXYZ(1, s.a.x + (s.b.x - s.a.x) * h, s.a.y + (s.b.y - s.a.y) * h, s.a.z + (s.b.z - s.a.z) * h);
      p.needsUpdate = true;
      s.m.material.opacity = Math.max(0, 1 - Math.max(0, s.t - 0.8) * 3);
      if (s.t > 1.2) { s.t = -1; s.m.material.opacity = 0; }
    }
    return this.flash;
  }
}
