(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  const wh = g.store.state.wh;
  Object.assign(wh, { lod: 2, rynna: 4, solarnia: 2, tasma: 20, myjnia: 2 });
  const place = (r) => g.store.place(r);
  await place({ id: 'ice1', t: 'lod', x: -6, y: 1.6, z: 0, ry: 0, rp: 0 });
  await place({ id: 'fl1', t: 'rynna', x: 6, y: 1.6, z: 8, ry: 0, rp: 0 });
  await place({ id: 'fl2', t: 'rynna', x: 6, y: 1.6, z: 6, ry: 0, rp: 0 });
  await place({ id: 'm0', t: 'tasma', x: -3, y: 1.6, z: 10, ry: 0, rp: 0 });
  await place({ id: 'm1', t: 'solarnia', x: -3, y: 1.6, z: 8, ry: 0, rp: 0 });
  await place({ id: 'm2', t: 'myjnia', x: -3, y: 1.6, z: 6, ry: 0, rp: 0 });
  await place({ id: 'm3', t: 'tasma', x: -3, y: 1.6, z: 4, ry: 0, rp: 0 });
  const def = { w: [60, 40, 0, 0, 0, 0] };
  const drop = (x, y, z) => g.farm.spawnFrom({ def, outlet: new V(x, y, z), vel: new V(0, 0, 0), id: 'x' }, null);
  const onIce = [drop(-6, 2.5, 0), drop(-5.6, 2.6, 0.3)];
  const inFlume = drop(6, 2.6, 8.4);
  const mach = [];
  for (let i = 0; i < 6; i++) { mach.push(drop(-3, 2.4, 10.6)); await new Promise((r) => setTimeout(r, 700)); }
  const f0 = inFlume.body.translation();
  await new Promise((r) => setTimeout(r, 1500));
  const f1 = inFlume.body ? inFlume.body.translation() : null;
  const flume = { wet: inFlume.wet, swim: inFlume.swim, dry: +inFlume.dry.toFixed(2), moved: f1 ? +(f0.z - f1.z).toFixed(2) : 'gone', y: f1 ? +f1.y.toFixed(2) : null };
  await new Promise((r) => setTimeout(r, 12000));
  const ice = onIce.map((f) => ({ onIce: f.onIce, iceT: +f.iceT.toFixed(1), traits: f.tr.map((i) => g.sim.constructor && i), cold: Math.round(f.cold), dry: +f.dry.toFixed(1) }));
  const TR = (await import('/src/data/traits.js')).TRAITS;
  const machRes = mach.filter(Boolean).map((f) => ({ ups: f.ups, up: f.up, tr: f.tr.map((i) => TR[i].id) }));
  return { flume, ice: onIce.map((f) => ({ onIce: f.onIce, iceT: +f.iceT.toFixed(1), tr: f.tr.map((i) => TR[i].id), cold: Math.round(f.cold) })), mach: machRes };
})()
