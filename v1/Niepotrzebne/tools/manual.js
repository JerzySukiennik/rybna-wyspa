(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  await g.store.place({ id: 'mp1', t: 'pompa', x: 0, y: 1.6, z: 7, ry: 0, rp: 0 });
  for (let i = 0; i < 3; i++) { g.authority.click('mp1'); await new Promise((r) => setTimeout(r, 400)); }
  await new Promise((r) => setTimeout(r, 1500));
  const ids = [...g.sim.fish.keys()];
  for (const id of ids) g.authority.pick(id);
  const held = g.myStack().length;
  g.player.teleport(5, 1.65, 2.5);
  g.player.yaw = 0; g.player.pitch = -0.2;
  await new Promise((r) => setTimeout(r, 300));
  g.hands.dump();
  await new Promise((r) => setTimeout(r, 3000));
  const sold = Object.values(g.store.state.album).reduce((a, x) => a + x.n, 0);
  return { spawned: ids.length, held, sold, left: g.sim.fish.size, cash: Math.round(g.store.state.cash * 100) / 100 };
})()
