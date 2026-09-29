// Keyboard + pointer-lock mouse on desktop, twin virtual sticks on touch screens.
export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.move = { x: 0, y: 0 };
    this.jump = false;
    this.flyToggle = false;
    this.locked = false;
    this.enabled = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.handlers = {};
    this.touchMove = null;
    this.touchLook = null;
    this.touchRun = false;

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (!e.repeat) {
        if (e.code === 'Space') this.jump = true;
        if (e.code === 'KeyF') this.flyToggle = true;
        this.handlers.key?.(e);
      }
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      this.handlers.lock?.(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    });
    dom.addEventListener('click', () => {
      if (this.enabled && !this.isTouch && !this.locked) this.lock();
    });

    this._bindTouch();
  }

  lock() {
    const p = this.dom.requestPointerLock?.({ unadjustedMovement: true });
    p?.catch?.(() => this.dom.requestPointerLock());
  }

  on(name, fn) { this.handlers[name] = fn; }

  _bindTouch() {
    const stickEl = document.getElementById('stick');
    const knobEl = document.getElementById('stick-knob');
    const R = 55;
    const onStart = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.target.closest?.('button, .panel, #places, #topbar')) continue;
        if (t.clientX < innerWidth * 0.45 && !this.touchMove) {
          this.touchMove = { id: t.identifier, x0: t.clientX, y0: t.clientY };
          stickEl.style.left = `${t.clientX}px`;
          stickEl.style.top = `${t.clientY}px`;
          stickEl.classList.add('on');
        } else if (!this.touchLook) {
          this.touchLook = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchMove && t.identifier === this.touchMove.id) {
          let dx = t.clientX - this.touchMove.x0, dy = t.clientY - this.touchMove.y0;
          const l = Math.hypot(dx, dy);
          if (l > R) { dx = dx / l * R; dy = dy / l * R; }
          this.move.x = dx / R;
          this.move.y = -dy / R;
          this.touchRun = l > R * 1.6;
          knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (this.touchLook && t.identifier === this.touchLook.id) {
          this.lookX += (t.clientX - this.touchLook.x) * 2.2;
          this.lookY += (t.clientY - this.touchLook.y) * 2.2;
          this.touchLook.x = t.clientX;
          this.touchLook.y = t.clientY;
        }
      }
      if (this.touchMove || this.touchLook) e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchMove && t.identifier === this.touchMove.id) {
          this.touchMove = null;
          this.move.x = this.move.y = 0;
          this.touchRun = false;
          knobEl.style.transform = '';
          stickEl.classList.remove('on');
        } else if (this.touchLook && t.identifier === this.touchLook.id) {
          this.touchLook = null;
        }
      }
    };
    this.dom.addEventListener('touchstart', onStart, { passive: false });
    addEventListener('touchmove', onMove, { passive: false });
    addEventListener('touchend', onEnd);
    addEventListener('touchcancel', onEnd);
  }

  // Movement intent in local space: x = strafe right, y = forward.
  axes() {
    if (this.touchMove) return { x: this.move.x, y: this.move.y, run: this.touchRun };
    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    return { x, y, run: k.has('ShiftLeft') || k.has('ShiftRight') };
  }

  down() { return this.keys.has('KeyC') || this.keys.has('ControlLeft') || this.keys.has('KeyQ'); }
  up() { return this.keys.has('Space') || this.keys.has('KeyE'); }

  consumeLook() {
    const r = [this.lookX, this.lookY];
    this.lookX = this.lookY = 0;
    return r;
  }
}
