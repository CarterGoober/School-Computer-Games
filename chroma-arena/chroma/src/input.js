// Keyboard + mouse controls. Aim is client-side, but the server validates every
// movement step, shot interval and hit.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyV', 'KeyF', 'KeyQ',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'Tab'
]);

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export class Controls {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.sensitivity = options.sensitivity ?? 1;
    this.enabled = false;
    this.locked = false;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.jumpQueued = false;
    this.firing = false;
    this.listeners = new Map();
    this.mouseDown = false;
    this.bind();
  }

  on(name, handler) {
    this.listeners.set(name, handler);
    return this;
  }

  emit(name, value) {
    this.listeners.get(name)?.(value);
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      if (isTyping(event.target)) return;
      if (event.code === 'Tab' && this.enabled) {
        event.preventDefault();
        this.emit('scoreboard', true);
      }
      if (!this.enabled) return;
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'Space') this.jumpQueued = true;
      if (event.code === 'KeyR') this.emit('reload');
      if (event.code === 'KeyV') this.emit('melee');
      if (event.code === 'KeyF') this.emit('heal');
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'Tab' && this.enabled) {
        event.preventDefault();
        this.emit('scoreboard', false);
      }
    });

    window.addEventListener('blur', () => this.clearHeld());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearHeld();
    });

    this.canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      if (event.button === 0) {
        if (!this.locked) {
          this.requestLock();
          return;
        }
        this.mouseDown = true;
        this.firing = true;
        this.emit('fire');
      }
    });

    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.mouseDown = false;
        this.firing = false;
        this.emit('fireEnd');
      }
    });

    this.canvas.addEventListener('contextmenu', (event) => {
      if (this.enabled) event.preventDefault();
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.locked || !this.enabled) return;
      const scale = 0.0022 * this.sensitivity;
      this.yaw -= event.movementX * scale;
      this.pitch -= event.movementY * scale;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });

    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.locked) this.requestLock();
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      this.locked = locked;
      if (!locked) this.clearHeld();
      this.emit('lockchange', locked);
    });

    document.addEventListener('pointerlockerror', () => {
      this.locked = false;
      this.emit('lockchange', false);
    });
  }

  requestLock() {
    if (!this.canvas) return;
    try {
      const result = this.canvas.requestPointerLock?.();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch { /* requires a user gesture */ }
  }

  releaseLock() {
    try { document.exitPointerLock?.(); } catch { /* noop */ }
    this.locked = false;
  }

  clearHeld() {
    this.keys.clear();
    this.mouseDown = false;
    this.firing = false;
    this.jumpQueued = false;
  }

  enable(on) {
    this.enabled = on;
    if (!on) {
      this.clearHeld();
      this.releaseLock();
    }
  }

  setAim(yaw, pitch) {
    this.yaw = yaw;
    this.pitch = pitch;
  }

  get down() {
    return {
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      back: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
    };
  }

  consumeJump() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }
}
