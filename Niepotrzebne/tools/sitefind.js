(async () => {
  const I = await import('/src/world/island.js');
  const out = [];
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) {
    const s = I.coastDist(x, z);
    if (s < 6.5 || s > 10.5) continue;
    let hmin = 9, hmax = -9;
    for (let dx = -3; dx <= 3; dx += 1) for (let dz = -3; dz <= 3; dz += 1) {
      const h = I.islandHeight(x + dx, z + dz);
      hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
    }
    const far = (px, pz, r) => Math.hypot(x - px, z - pz) > r;
    if (!far(-9.5, 11.5, 8) || !far(5, -3, 8.5) || !far(0, 11, 5) || !far(2, -21, 6)) continue;
    if (hmax - hmin > 0.25) continue;
    out.push([x, z, +s.toFixed(1), +(hmax - hmin).toFixed(2), +I.islandHeight(x, z).toFixed(2), +I.pathDist(x, z).toFixed(1)]);
  }
  out.sort((a, b) => a[3] - b[3]);
  return out.slice(0, 40);
})()
