(() => {
  const g = __rw;
  const R = g.phys.R;
  let miss = 0, bad = 0, n = 0;
  const misses = [];
  for (let x = -22; x <= 22; x += 1.37) for (let z = -22; z <= 22; z += 1.37) {
    const h = g.groundAt(x, z);
    if (h < 0.3) continue;
    if ((x - 5) ** 2 + (z + 3) ** 2 < 25) continue;
    n++;
    const hit = g.phys.world.castRay(new R.Ray({ x, y: 20, z }, { x: 0, y: -1, z: 0 }), 40, true, undefined, undefined, undefined, g.player.body, (c) => c.parent() === g.phys.island);
    if (!hit) { miss++; if (misses.length < 6) misses.push([+x.toFixed(2), +z.toFixed(2)]); continue; }
    const y = 20 - (hit.timeOfImpact ?? hit.toi);
    if (Math.abs(y - h) > 0.12) bad++;
  }
  return { n, miss, bad, misses };
})()
