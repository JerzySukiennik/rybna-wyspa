(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  g.store.state.wh.rynna = 4;
  const ok = await g.store.place({ id: 'fl1', t: 'rynna', x: 6, y: 1.6, z: 8, ry: 0, rp: 0 });
  const b = g.blocks.blocks.get('fl1');
  const R = g.phys.R;
  const hit = g.phys.world.castRay(new R.Ray({ x: 6, y: 3, z: 8 }, { x: 0, y: -1, z: 0 }), 5, true);
  const blk = hit ? g.blocks.blockAtCollider(hit.collider) : null;
  const n = b ? b.phys.col.length : -1;
  const cols = b ? b.phys.col.map((c) => ({ hx: c.hx, hy: c.hy, hz: c.hz, pos: c.pos.map((v) => +v.toFixed(3)) })) : null;
  const f = g.farm.spawnFrom({ def: { w: [100, 0, 0, 0, 0, 0] }, outlet: new V(6, 2.4, 8.5), vel: new V(0, 0, 0), id: 'x' }, null);
  await new Promise((r) => setTimeout(r, 1200));
  const p = f.body ? f.body.translation() : null;
  return { ok, n, cols, hitToi: hit ? +(hit.timeOfImpact ?? hit.toi).toFixed(3) : null, hitBlock: blk ? blk.id : null, fish: p ? [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)] : null, zones: f.zones ? [...f.zones.values()].map((z) => z.kind) : null, wet: f.wet };
})()
