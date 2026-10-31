(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  Object.assign(g.store.state.wh, { tasma: 6, rynna: 4 });
  const L = 1.6, x = -6;
  await g.store.place({ id: 'a', t: 'tasma', x, y: L, z: 6, ry: 0, rp: 0 });
  await g.store.place({ id: 'f', t: 'rynna', x, y: L, z: 4, ry: 0, rp: 0 });
  await g.store.place({ id: 'b', t: 'tasma', x, y: L, z: 2, ry: 0, rp: 0 });
  await g.store.place({ id: 'f2', t: 'rynna', x, y: L, z: 0, ry: 0, rp: 0 });
  await new Promise((r) => setTimeout(r, 200));
  const def = { w: [60, 40, 0, 0, 0, 0] };
  const fish = [];
  for (let i = 0; i < 3; i++) { fish.push(g.farm.spawnFrom({ def, outlet: new V(x, L + 0.9, 6.7), vel: new V(0, 0, 0), id: 'x' }, null)); await new Promise((r) => setTimeout(r, 400)); }
  const track = fish.map(() => []);
  for (let t = 0; t < 22; t++) {
    await new Promise((r) => setTimeout(r, 250));
    fish.forEach((f, i) => { const p = f.body ? f.body.translation() : null; track[i].push(p ? `${p.z.toFixed(1)}/${(p.y - L).toFixed(2)}${f.wet ? 'w' : ''}` : 'x'); });
  }
  return track.map((t) => t.join(' '));
})()
