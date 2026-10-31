// Rybna Wyspa: loads the procedural model modules, falling back to stand-ins when one is missing or broken.

import * as standin from './standin.js';

async function tryImport(path, need) {
  try {
    const m = await import(path);
    for (const k of need) if (typeof m[k] !== 'function' && !Array.isArray(m[k])) throw new Error(`${path} lacks ${k}`);
    return m;
  } catch (e) {
    console.warn('[models] using stand-in for', path, e.message);
    return null;
  }
}

export async function loadModels() {
  const [fish, avatar, deco] = await Promise.all([
    tryImport('../models/fish.js', ['fishGeometry', 'fishDims']),
    tryImport('../models/avatar.js', ['buildAvatar']),
    tryImport('../models/deco.js', ['decoGeometry']),
  ]);
  const realDeco = deco && Array.isArray(deco.DECO_IDS) && deco.DECO_IDS.length >= 10 ? deco : null;
  const F = fish || standin;
  const safeFish = (id) => {
    try { return F.fishGeometry(id); } catch (e) { console.warn('[models] fish', id, e.message); return standin.fishGeometry(id); }
  };
  const safeDims = (id) => {
    try { return F.fishDims(id) || standin.fishDims(id); } catch (e) { return standin.fishDims(id); }
  };
  return {
    fishGeometry: safeFish,
    fishDims: safeDims,
    buildAvatar: (avatar && avatar.buildAvatar) || standin.buildAvatar,
    buildViewHands: (avatar && avatar.buildViewHands) || standin.buildViewHands,
    decoGeometry: (id) => { try { return (realDeco || standin).decoGeometry(id); } catch (e) { return standin.decoGeometry(id); } },
    real: { fish: !!fish, avatar: !!avatar, deco: !!realDeco },
  };
}
