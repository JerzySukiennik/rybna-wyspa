(async () => {
  const g = __rw;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Object.assign(g.store.state.wh, { pompa: 3, siec: 2, tasma: 10 });
  await g.store.place({ id: 'p1', t: 'pompa', x: -4, y: 1.6, z: 4, ry: 0, rp: 0 });
  await g.store.place({ id: 'b1', t: 'tasma', x: -4, y: 1.6, z: 4 - 0.58 - 1, ry: 0, rp: 0 });
  await g.store.place({ id: 'p2', t: 'pompa', x: 4, y: 1.6, z: 9, ry: 0, rp: 0 });
  await g.store.place({ id: 'b2', t: 'tasma', x: 4, y: 1.6, z: 9 - 0.55 - 0.5, ry: Math.PI / 2, rp: 0 });
  await g.store.place({ id: 's1', t: 'siec', x: -9, y: 1.6, z: -6, ry: 0, rp: 0 });
  await g.store.place({ id: 'b3', t: 'tasma', x: -9, y: 1.6, z: -6 - 0.63 - 1, ry: 0, rp: 0 });
  await wait(300);
  const res = { p1: [0, 0], p2: [0, 0] };
  const L = 1.6;
  for (let i = 0; i < 10; i++) {
    for (const id of ['p1', 'p2']) {
      const before = new Set(g.sim.fish.keys());
      g.farm.click(id, g.pid);
      const nf = [...g.sim.fish.values()].find((f) => !before.has(f.id));
      if (nf) setTimeout(() => { if (!nf.body) return; const y = nf.body.translation().y; res[id][y > L + 0.5 ? 0 : 1]++; }, 600);
    }
    await wait(950);
  }
  await wait(800);
  return { 'pompa+tasma na wprost [na taśmie, obok]': res.p1, 'pompa+tasma w poprzek': res.p2 };
})()
