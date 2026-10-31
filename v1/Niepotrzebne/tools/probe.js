(async () => {
  const g = __rw;
  g.store.state.wh.rynna = 4;
  await g.store.place({ id: 'fl1', t: 'rynna', x: 6, y: 1.6, z: 8, ry: 0, rp: 0 });
  const R = g.phys.R;
  const rec = g.phys.blocks.get('fl1');
  const out = { hasRec: !!rec, nCol: rec ? rec.body.numColliders() : 0, bodyPos: rec ? rec.body.translation() : null };
  const hits = [];
  g.phys.world.intersectionsWithPoint({ x: 6, y: 1.85, z: 8.4 }, (c) => { hits.push({ sensor: c.isSensor(), parent: c.parent() === g.phys.island ? 'island' : (g.blocks.blockAtCollider(c) || {}).id, groups: c.collisionGroups().toString(16) }); return true; });
  out.pointHits = hits;
  const r1 = g.phys.world.castRay(new R.Ray({ x: 6.13, y: 5, z: 8.4 }, { x: 0, y: -1, z: 0 }), 10, true);
  out.ray613 = r1 ? [+(5 - (r1.timeOfImpact ?? r1.toi)).toFixed(3), r1.collider.parent() === g.phys.island ? 'island' : (g.blocks.blockAtCollider(r1.collider) || {}).id] : null;
  const r2 = g.phys.world.castRay(new R.Ray({ x: 10.13, y: 5, z: 8.7 }, { x: 0, y: -1, z: 0 }), 10, true);
  out.ray1013 = r2 ? +(5 - (r2.timeOfImpact ?? r2.toi)).toFixed(3) : null;
  const r3 = g.phys.world.castRay(new R.Ray({ x: 10, y: 5, z: 8.7 }, { x: 0, y: -1, z: 0 }), 10, true);
  out.ray10 = r3 ? +(5 - (r3.timeOfImpact ?? r3.toi)).toFixed(3) : null;
  return out;
})()
