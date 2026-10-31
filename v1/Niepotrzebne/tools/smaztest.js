(async () => {
  const g = __rw;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const V = g.player.feet.constructor;
  const S = (await import('/src/data/species.js')).SPECIES;
  const { fishValue } = await import('/src/sim/value.js');
  const menu = [...g.menuSet];
  const off = S.findIndex((s, i) => s.rarity === 0 && !g.menuSet.has(i));
  const mk = (sp) => ({ sp, w: S[sp].kg, v: 0, tr: [], up: 0, ups: [], dry: 0, cold: 0, iceT: 0 });
  const res = {};
  for (const [name, sp] of [['menu', menu[0]], ['inne', off]]) {
    const rec = mk(sp);
    const expect = fishValue(rec, g.store.state.mult || 1);
    const c0 = g.store.state.cash + g.farm.pendingCash;
    const hp = g.smaz.pos;
    g.sim.spawn(rec, new V(hp.x, hp.y + 1.2, hp.z), new V(0, 0, 0), null, { x: 0, y: 0, z: 0 });
    await wait(1600);
    const got = g.store.state.cash + g.farm.pendingCash - c0;
    res[name] = { gatunek: S[sp].name, oczekiwane: +expect.toFixed(2), dostal: +got.toFixed(2), razy: +(got / expect).toFixed(2) };
  }
  Object.assign(g.store.state.wh, { tasma: 6, pompa: 2 });
  const hp = g.smaz.pos;
  await g.store.place({ id: 'tb1', t: 'tasma', x: hp.x - 1.0, y: 1.6, z: hp.z - 0.05, ry: -Math.PI / 2, rp: 0 });
  await g.store.place({ id: 'tb2', t: 'tasma', x: hp.x - 3.0, y: 1.6, z: hp.z - 0.05, ry: -Math.PI / 2, rp: 0 });
  await wait(200);
  const placed = [...g.blocks.blocks.keys()];
  const c1 = g.store.state.cash + g.farm.pendingCash;
  let n = 0;
  for (let i = 0; i < 5; i++) { const rec = mk(off); g.sim.spawn(rec, new V(hp.x - 3.6, 2.6, hp.z - 0.05), new V(0, 0, 0), null, { x: 0, y: 0, z: 0 }); n++; await wait(700); }
  await wait(3500);
  const left = [...g.sim.fish.values()].filter((f) => f.body).length;
  res.tasma = { postawione: placed, wrzucone: n, zostalo_na_wyspie: left, zarobek: +(g.store.state.cash + g.farm.pendingCash - c1).toFixed(2) };
  return res;
})()
