// Rybna Wyspa: keyboard, mouse buttons, wheel and pointer lock.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.left = false;
    this.right = false;
    this.wheel = 0;
    this.locked = false;
    this.pressed = [];
    this.released = [];
    this.onLockChange = null;
    this.blockKeys = false;
    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!e.repeat) this.pressed.push(e.code);
      if (this.locked) this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.push(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.left = false; this.right = false; });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) { this.left = true; this.pressed.push('Mouse0'); }
      if (e.button === 2) { this.right = true; this.pressed.push('Mouse2'); }
      if (e.button === 1) { e.preventDefault(); this.pressed.push('Mouse1'); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.left = false; this.released.push('Mouse0'); }
      if (e.button === 2) { this.right = false; this.released.push('Mouse2'); }
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) { this.keys.clear(); this.left = false; this.right = false; }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  lock() {
    try {
      const r = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (r && r.catch) r.catch(() => { try { this.canvas.requestPointerLock(); } catch (e) { /* denied */ } });
    } catch (e) { /* denied */ }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  consume() {
    const out = { dx: this.dx, dy: this.dy, wheel: this.wheel, pressed: this.pressed, released: this.released };
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.pressed = [];
    this.released = [];
    return out;
  }
}
