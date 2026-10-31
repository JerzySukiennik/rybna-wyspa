(() => {
  const g = __rw;
  const L = 1.6;
  const ax = -1, az = 8, bx = 5, bz = -3;
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  const yaw = Math.atan2(-ux, -uz);
  g.store.state.wh.tasma = 30;
  g.store.state.wh.pompa = 2;
  const recs = [{ id: 'bp', t: 'pompa', x: ax, y: L, z: az, ry: yaw, rp: 0 }];
  let d = 1.6;
  let k = 0;
  while (d < len - 1.2) {
    recs.push({ id: 'bt' + k++, t: 'tasma', x: +(ax + ux * d).toFixed(3), y: L, z: +(az + uz * d).toFixed(3), ry: yaw, rp: 0 });
    d += 2;
  }
  for (const r of recs) g.store.place(r);
  window.__pumpN = 0;
  window.__pumpT = setInterval(() => { if (window.__pumpN++ < 40) g.authority.click('bp'); }, 250);
  g.player.teleport(ax - 4, L + 0.05, az + 3);
  g.player.yaw = yaw - 0.6; g.player.pitch = -0.28;
  return { belts: k, yaw };
})()
