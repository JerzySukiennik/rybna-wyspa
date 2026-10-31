(() => {
  const g = __rw;
  const THREE_V = g.player.feet.constructor;
  for (let i = 0; i < 4; i++) {
    const b = { def: { w: [20, 30, 30, 15, 5, 0] }, outlet: new THREE_V(0.5 * i - 1, 2.2, 8), vel: new THREE_V(0, 0, 0), id: 'x' + i };
    const f = g.farm.spawnFrom(b, g.pid);
    if (f) g.farm.pick(g.pid, f.id);
  }
  g.store.state.up.stos = 3;
  g.player.teleport(0, 1.65, 9); g.player.yaw = 0.2; g.player.pitch = -0.05;
  return g.myStack().length;
})()
