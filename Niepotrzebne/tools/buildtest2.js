(async () => {
  const g = __rw;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Object.assign(g.store.state.wh, { tasma: 10 });
  await g.store.place({ id: 'belt1', t: 'tasma', x: -6, y: 1.6, z: 3, ry: 0, rp: 0 });
  g.hotbarSlots[2] = 'tasma';
  g.selSlot = 2;
  const aimAt = (ex, ez, tx, ty, tz) => {
    g.player.teleport(ex, 1.65, ez);
    const eyeY = 1.65 + 1.62;
    const dx = tx - ex, dz = tz - ez, dy = ty - eyeY;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  };
  const out = {};
  for (const [name, tz] of [['beyondOut', 1.6], ['nearOut', 2.3], ['middle', 3.0], ['nearIn', 3.8], ['beyondIn', 4.6]]) {
    aimAt(-3.2, tz, -6, 1.62, tz);
    await wait(300);
    const pl = g.build.place;
    out[name] = pl ? `${pl.snapped ? 'snap' : 'grid'} z=${pl.pos.z.toFixed(2)} ok=${pl.ok === true}` : 'none';
  }
  return out;
})()
