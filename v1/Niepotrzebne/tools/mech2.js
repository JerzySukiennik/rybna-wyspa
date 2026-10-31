(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  const wh = g.store.state.wh;
  Object.assign(wh, { lod: 2, rynna: 4, solarnia: 2, tasma: 20, myjnia: 2, zjezdzalnia: 2, tasma_s: 4 });
  const place = (r) => g.store.place(r);
  await place({ id: 'ice1', t: 'lod', x: -6, y: 1.6, z: 0, ry: 0, rp: 0 });
  await place({ id: 'fl1', t: 'rynna', x: 6, y: 1.6, z: 8, ry: 0, rp: 0 });
  await place({ id: 'fl2', t: 'rynna', x: 6, y: 1.6, z: 6, ry: 0, rp: 0 });
  await place({ id: 'm0', t: 'tasma', x: -3, y: 1.6, z: 10, ry: 0, rp: 0 });
  await place({ id: 'm1', t: 'solarnia', x: -3, y: 1.6, z: 8, ry: 0, rp: 0 });
  await place({ id: 'm2', t: 'myjnia', x: -3, y: 1.6, z: 6, ry: 0, rp: 0 });
  await place({ id: 'm3', t: 'tasma', x: -3, y: 1.6, z: 4, ry: 0, rp: 0 });
  await place({ id: 's1', t: 'zjezdzalnia', x: 10, y: 1.6, z: 8, ry: 0, rp: 0 });
  const def = { w: [60, 40, 0, 0, 0, 0] };
  const drop = (x, y, z) => g.farm.spawnFrom({ def, outlet: new V(x, y, z), vel: new V(0, 0, 0), id: 'x' }, null);
  const onIce = [drop(-6, 2.5, 0), drop(-5.6, 2.6, 0.3)];
  const inFlume = drop(6, 2.9, 8.4);
  const onSlide = drop(10, 3.4, 8.7);
  const onBelt = drop(-3, 2.6, 10.6);
  const mach = [];
  for (let i = 0; i < 5; i++) { mach.push(drop(-3, 2.6, 10.6)); await new Promise((r) => setTimeout(r, 600)); }
  const f0 = inFlume.body.translation();
  const s0 = onSlide.body ? onSlide.body.translation() : null;
  await new Promise((r) => setTimeout(r, 1500));
  const f1 = inFlume.body ? inFlume.body.translation() : null;
  const s1 = onSlide.body ? onSlide.body.translation() : null;
  const flume = { wet: inFlume.wet, swim: inFlume.swim, moved: f1 ? +(f0.z - f1.z).toFixed(2) : 'gone', y: f1 ? +f1.y.toFixed(2) : null };
  const slide = { moved: s1 && s0 ? +(s0.z - s1.z).toFixed(2) : 'gone', y: s1 ? +s1.y.toFixed(2) : null };
  await new Promise((r) => setTimeout(r, 9000));
  const TR = (await import('/src/data/traits.js')).TRAITS;
  const machRes = mach.filter(Boolean).map((f) => ({ up: f.up, tr: f.tr.map((i) => TR[i].id), z: f.body ? +f.body.translation().z.toFixed(1) : 'sold/gone' }));
  return { flume, slide, belt: onBelt.body ? +onBelt.body.translation().z.toFixed(1) : 'gone', ice: onIce.map((f) => ({ onIce: f.onIce, iceT: +f.iceT.toFixed(1), tr: f.tr.map((i) => TR[i].id) })), mach: machRes };
})()
