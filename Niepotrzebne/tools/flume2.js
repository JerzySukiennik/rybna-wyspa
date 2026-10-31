(async () => {
  const g = __rw;
  const V = g.player.feet.constructor;
  g.store.state.wh.rynna = 4;
  g.store.state.wh.zjezdzalnia = 2;
  const ok = await g.store.place({ id: 'fl1', t: 'rynna', x: 6, y: 1.6, z: 8, ry: 0, rp: 0 });
  const ok2 = await g.store.place({ id: 's1', t: 'zjezdzalnia', x: 10, y: 1.6, z: 8, ry: 0, rp: 0 });
  const R = g.phys.R;
  const ray = (x, z) => { const hit = g.phys.world.castRay(new R.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }), 10, true); return hit ? [+(5 - (hit.timeOfImpact ?? hit.toi)).toFixed(3), (g.blocks.blockAtCollider(hit.collider) || {}).id || (hit.collider.parent() === g.phys.island ? 'island' : 'other')] : null; };
  const b = g.blocks.blocks.get('fl1');
  return { ok, ok2, blocks: [...g.blocks.blocks.keys()], flumeRay: ray(6, 8.4), slideRay: ray(10, 8.7), flumeY: b ? b.pos.y : null, col: b ? b.phys.col.slice(0, 3).map((c) => ({ hy: c.hy, pos: c.pos.map((v) => +v.toFixed(2)) })) : null };
})()
