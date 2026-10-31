(async () => {
  const g = __rw;
  const L = 1.6;
  Object.assign(g.store.state.wh, { pompa: 3, siec: 2, tasma: 30, rynna: 4, myjnia: 2, lampa: 6, flaga: 2, lawka: 2, kwiaty: 6, lod: 2 });
  const P = (id, t, x, z, ry, y = L) => g.store.place({ id, t, x, y, z, ry, rp: 0 });
  await P('dA0', 'siec', 5, -12.5, Math.PI);
  for (let k = 0; k < 4; k++) await P('dA' + (k + 1), 'tasma', 5, -10.7 + k * 2, Math.PI);
  await P('dB0', 'pompa', -4.5, -3, -Math.PI / 2);
  await P('dB1', 'tasma', -2.9, -3, -Math.PI / 2);
  await P('dB2', 'rynna', -0.9, -3, -Math.PI / 2);
  await P('dB3', 'myjnia', 1.1, -3, -Math.PI / 2);
  await P('dB4', 'tasma', 3.1, -3, -Math.PI / 2);
  await P('dL1', 'lampa', 1.5, 3.2, 0);
  await P('dL2', 'lampa', -3.5, 11.8, 0);
  await P('dL3', 'lampa', 8.6, -7.6, 0);
  await P('dF1', 'flaga', 1.3, -7.2, 0);
  await P('dW1', 'lawka', -6.2, 7.6, Math.PI / 2);
  for (let k = 0; k < 4; k++) await P('dK' + k, 'kwiaty', -6.6 + k * 0.7, 9.4, 0);
  await P('dI1', 'lod', -3.6, -6.2, 0);
  window.__pumpN = 0;
  clearInterval(window.__pumpT);
  window.__pumpT = setInterval(() => { if (window.__pumpN++ < 200) g.authority.click('dB0'); }, 420);
  return g.blocks.blocks.size;
})()
