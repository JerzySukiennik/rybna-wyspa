// Rybna Wyspa: compact binary snapshots (players and moving fish) sent by the leader 15 times a second.

const S = 0.70710678;

export function packQuat(x, y, z, w) {
  const c = [x, y, z, w];
  let i = 0, m = Math.abs(x);
  for (let k = 1; k < 4; k++) if (Math.abs(c[k]) > m) { m = Math.abs(c[k]); i = k; }
  const sg = c[i] < 0 ? -1 : 1;
  let out = i;
  let sh = 2;
  for (let k = 0; k < 4; k++) {
    if (k === i) continue;
    const v = Math.max(0, Math.min(1023, Math.round(((c[k] * sg) / S * 0.5 + 0.5) * 1023)));
    out |= v << sh;
    sh += 10;
  }
  return out >>> 0;
}

export function unpackQuat(u, out) {
  const i = u & 3;
  const c = [0, 0, 0, 0];
  let sh = 2, sum = 0;
  for (let k = 0; k < 4; k++) {
    if (k === i) continue;
    const v = (((u >>> sh) & 1023) / 1023 - 0.5) * 2 * S;
    c[k] = v;
    sum += v * v;
    sh += 10;
  }
  c[i] = Math.sqrt(Math.max(0, 1 - sum));
  out.set(c[0], c[1], c[2], c[3]);
  return out;
}

const cm = (v) => Math.max(-32767, Math.min(32767, Math.round(v * 100)));

export function encodeSnap(t, players, fish) {
  const buf = new ArrayBuffer(1 + 4 + 1 + players.length * 11 + 2 + fish.length * 14);
  const d = new DataView(buf);
  let o = 0;
  d.setUint8(o, 1); o += 1;
  d.setFloat32(o, t); o += 4;
  d.setUint8(o, players.length); o += 1;
  for (const p of players) {
    d.setUint8(o, p.slot); o += 1;
    d.setInt16(o, cm(p.x)); d.setInt16(o + 2, cm(p.y)); d.setInt16(o + 4, cm(p.z)); o += 6;
    d.setUint16(o, Math.round((((p.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 65535)); o += 2;
    d.setInt8(o, Math.max(-127, Math.min(127, Math.round(p.pitch * 80)))); o += 1;
    d.setUint8(o, p.flags || 0); o += 1;
  }
  d.setUint16(o, fish.length); o += 2;
  for (const f of fish) {
    d.setUint16(o, f.id); o += 2;
    d.setInt16(o, cm(f.x)); d.setInt16(o + 2, cm(f.y)); d.setInt16(o + 4, cm(f.z)); o += 6;
    d.setUint32(o, packQuat(f.qx, f.qy, f.qz, f.qw)); o += 4;
    d.setUint8(o, Math.max(0, Math.min(255, Math.round(f.dry || 0)))); o += 1;
    d.setUint8(o, f.flags || 0); o += 1;
  }
  return buf;
}

export function decodeSnap(buf) {
  const d = new DataView(buf);
  let o = 0;
  if (d.getUint8(o) !== 1) return null;
  o += 1;
  const t = d.getFloat32(o); o += 4;
  const np = d.getUint8(o); o += 1;
  const players = [];
  for (let i = 0; i < np; i++) {
    players.push({ slot: d.getUint8(o), x: d.getInt16(o + 1) / 100, y: d.getInt16(o + 3) / 100, z: d.getInt16(o + 5) / 100, yaw: (d.getUint16(o + 7) / 65535) * Math.PI * 2, pitch: d.getInt8(o + 9) / 80, flags: d.getUint8(o + 10) });
    o += 11;
  }
  const nf = d.getUint16(o); o += 2;
  const fish = [];
  for (let i = 0; i < nf; i++) {
    fish.push({ id: d.getUint16(o), x: d.getInt16(o + 2) / 100, y: d.getInt16(o + 4) / 100, z: d.getInt16(o + 6) / 100, q: d.getUint32(o + 8), dry: d.getUint8(o + 12), flags: d.getUint8(o + 13) });
    o += 14;
  }
  return { t, players, fish };
}

export const FF = { flop: 1, swim: 2, wet: 4, ice: 8, cold: 16 };

export function metaOf(f) {
  return { id: f.id, sp: f.sp, w: +f.w.toFixed(4), v: f.v, tr: [...f.tr], up: f.up || 0, ups: [...(f.ups || [])], dry: Math.round(f.dry || 0), cold: Math.round(f.cold || 0), iceT: Math.round(f.iceT || 0), by: f.by || null };
}
