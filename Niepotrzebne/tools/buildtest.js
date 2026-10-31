(async () => {
  const g = __rw;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Object.assign(g.store.state.wh, { pompa: 2, tasma: 10 });
  await g.store.place({ id: 'pump1', t: 'pompa', x: 0, y: 1.6, z: 5, ry: 0, rp: 0 });
  g.hotbarSlots[2] = 'tasma';
  g.selSlot = 2;
  g.player.teleport(0.3, 1.65, 7.6);
  g.player.yaw = 0; g.player.pitch = -0.42;
  await wait(400);
  const pl1 = g.build.place;
  const r1 = pl1 ? { snapped: pl1.snapped, ok: pl1.ok, pos: [pl1.pos.x, pl1.pos.y, pl1.pos.z].map((v) => +v.toFixed(2)), yaw: +pl1.yaw.toFixed(2) } : null;
  g.input.pressed.push('Mouse0');
  await wait(500);
  const n1 = [...g.blocks.blocks.values()].filter((b) => b.rec.t === 'tasma').length;
  g.player.teleport(0.4, 1.65, 4.8);
  g.player.yaw = 0; g.player.pitch = -0.55;
  await wait(400);
  const pl2 = g.build.place;
  const r2 = pl2 ? { snapped: pl2.snapped, ok: pl2.ok, pos: [pl2.pos.x, pl2.pos.y, pl2.pos.z].map((v) => +v.toFixed(2)) } : null;
  return { r1, n1, r2, hist: g.build.history.length, rot: g.build.rot };
})()
