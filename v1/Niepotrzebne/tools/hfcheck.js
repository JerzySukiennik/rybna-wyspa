(() => {
  const g = __rw;
  const R = g.phys.R;
  const out = [];
  for (const [x, z] of [[0, 11], [-9, 5], [12, -8], [3, 15], [-15, -5], [10, 10]]) {
    const hit = g.phys.world.castRay(new R.Ray({ x, y: 20, z }, { x: 0, y: -1, z: 0 }), 40, true, undefined, undefined, undefined, g.player.body);
    out.push([x, z, hit ? +(20 - (hit.timeOfImpact ?? hit.toi)).toFixed(3) : null, +g.groundAt(x, z).toFixed(3)]);
  }
  return out;
})()
