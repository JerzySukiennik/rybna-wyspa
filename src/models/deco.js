// Rybna Wyspa: placeholder deco.
import * as THREE from 'three';
export const DECO_IDS = ['rock_s'];
export function decoGeometry() { const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); const c = new Float32Array(g.getAttribute('position').count * 3).fill(0.5); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
