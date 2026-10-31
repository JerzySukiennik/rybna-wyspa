(async () => {
  const g = __rw;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Object.assign(g.store.state.wh, { tasma: 10 });
  g.hotbarSlots[2] = 'tasma';
  g.selSlot = 2;
  g.build.rot = Math.PI;
  const tx = 5.0, tz = -5.6;
  g.player.teleport(7.5, 1.65, -9.5);
  const eyeY = 1.65 + 1.62;
  const dx = tx - 7.5, dz = tz + 9.5, dy = (1.6 + 0.12) - eyeY;
  g.player.yaw = Math.atan2(-dx, -dz);
  g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  await wait(400);
  const pl = g.build.place;
  if (pl && pl.ok === true) { g.input.pressed.push('Mouse0'); await wait(400); const V = g.player.feet.constructor; const f = g.farm.spawnFrom({ def: { w: [100, 0, 0, 0, 0, 0] }, outlet: new V(pl.pos.x, pl.pos.y + 0.9, pl.pos.z - 0.8), vel: new V(0, 0, 0), id: 'x' }, null); const c0 = g.store.state.cash; await wait(3500); pl.sold = g.store.state.cash > c0 || !f.body; }
  return pl ? { sold: pl.sold, ok: pl.ok, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), yaw: +pl.yaw.toFixed(2) } : null;
})()
