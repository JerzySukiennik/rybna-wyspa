(() => {
  const g = __rw;
  const L = 1.6;
  const ids = ['pompa', 'siec', 'wiecierz', 'klatka', 'wylegarnia', 'glebinowa', 'sonar', 'tama', 'wir', 'zrodlo', 'portal'];
  ids.forEach((t, i) => {
    const x = -10 + (i % 6) * 2.6, z = i < 6 ? -10 : -6.5;
    g.store.state.wh[t] = 2;
    g.store.place({ id: 'sc' + i, t, x, y: L, z, ry: 0, rp: 0 });
  });
  const belts = [['tasma', -9, 0.5], ['tasma_s', -7.5, 0.5], ['tasma_e', -6, 0.5], ['zakret_l', -4.2, 0.5], ['rynna', -2.3, 0.5], ['rynna_l', -0.3, 0.5], ['myjnia', 1.8, 0.5], ['transformator', 4, 0.5], ['lod', 6.4, 0.5], ['zjezdzalnia', 8.4, 0.5]];
  belts.forEach(([t, x, z], i) => { g.store.state.wh[t] = 2; g.store.place({ id: 'sb' + i, t, x, y: L, z, ry: 0, rp: 0 }); });
  return ids.length + belts.length;
})()
