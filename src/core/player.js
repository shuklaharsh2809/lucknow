import * as THREE from 'three';

const RADIUS = 0.35;
const HEIGHT = 1.75;
const EYE = 1.62;
const STEP = 0.45;
const GRAVITY = 24;

export class Player {
  constructor(camera, physics, input) {
    this.camera = camera;
    this.physics = physics;
    this.input = input;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.bob = 0;
    this.speed = 0;
    this.eyeSmooth = 0;
    this.onStep = null;
    camera.rotation.order = 'YXZ';
  }

  teleport(x, y, z, yaw, pitch = -0.04) {
    this.pos.set(x, y, z);
    this.pos.y = this.physics.groundHeight(x, z, RADIUS, y + 50, 100);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.eyeSmooth = this.pos.y;
  }

  update(dt) {
    const input = this.input;
    const [lx, ly] = input.consumeLook();
    const sens = 0.0022;
    this.yaw -= lx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - ly * sens, -1.45, 1.45);

    if (input.flyToggle) {
      input.flyToggle = false;
      this.flying = !this.flying;
      this.vel.y = 0;
    }

    const ax = input.axes();
    const len = Math.hypot(ax.x, ax.y);
    const mx = len > 1 ? ax.x / len : ax.x, my = len > 1 ? ax.y / len : ax.y;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward is -Z rotated by yaw
    const wx = mx * cos - my * sin;
    const wz = -mx * sin - my * cos;

    let target = this.flying ? (ax.run ? 45 : 16) : (ax.run ? 8.5 : 4.2);
    const accel = this.onGround || this.flying ? 12 : 3;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (wx * target - this.vel.x) * k;
    this.vel.z += (wz * target - this.vel.z) * k;

    if (this.flying) {
      const vy = (input.up() ? 1 : 0) - (input.down() ? 1 : 0);
      this.vel.y += (vy * target * 0.7 - this.vel.y) * k;
      input.jump = false;
    } else {
      if (input.jump && this.onGround) {
        this.vel.y = 7.2;
        this.onGround = false;
      }
      input.jump = false;
      this.vel.y -= GRAVITY * dt;
    }

    // Horizontal motion in sub-steps so fast running/flying can't tunnel through walls.
    const dist = Math.hypot(this.vel.x, this.vel.z) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.25));
    for (let i = 0; i < steps; i++) {
      const px = this.pos.x, pz = this.pos.z;
      this.pos.x += (this.vel.x * dt) / steps;
      this.pos.z += (this.vel.z * dt) / steps;
      // the river and other no-go areas (unless flying over them)
      if ((!this.flying || this.pos.y < 3) && this.physics.blocked(this.pos.x, this.pos.z)) {
        this.pos.x = px; this.pos.z = pz;
        this.vel.x *= 0.5; this.vel.z *= 0.5;
      }
      this.physics.resolve(this.pos, RADIUS, this.pos.y, HEIGHT, this.onGround || this.flying ? STEP : 0.1);
      if (this.onGround && !this.flying) {
        // step up onto stairs and kerbs
        const g = this.physics.groundHeight(this.pos.x, this.pos.z, RADIUS, this.pos.y, STEP);
        if (g > this.pos.y) this.pos.y = g;
      }
    }

    // Vertical
    const ground = this.physics.groundHeight(this.pos.x, this.pos.z, RADIUS, this.pos.y, this.onGround ? STEP : 0.05);
    this.pos.y += this.vel.y * dt;
    if (this.vel.y > 0) {
      const ceil = this.physics.ceiling(this.pos.x, this.pos.z, RADIUS, this.pos.y + HEIGHT - this.vel.y * dt);
      if (this.pos.y + HEIGHT > ceil) { this.pos.y = ceil - HEIGHT; this.vel.y = 0; }
    }
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      if (this.vel.y < 0) this.vel.y = 0;
      this.onGround = true;
    } else if (!this.flying) {
      // walking off a ledge: glue down small drops, otherwise fall
      if (this.onGround && this.pos.y - ground < STEP && this.vel.y <= 0) {
        this.pos.y = ground;
        this.vel.y = 0;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }

    // keep inside the world
    const B = this.physics.bounds;
    if (B) {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, B[0], B[2]);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, B[1], B[3]);
    }
    this.pos.y = Math.min(this.pos.y, 400);

    // Head bob and footsteps
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && !this.flying && this.speed > 0.5) {
      const prev = this.bob;
      this.bob += dt * this.speed * 1.9;
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bob / Math.PI)) this.onStep?.(this.speed);
    } else {
      this.bob += (Math.round(this.bob / Math.PI) * Math.PI - this.bob) * Math.min(1, dt * 6);
    }
    const bobY = this.flying ? 0 : Math.abs(Math.sin(this.bob)) * 0.06 * Math.min(1, this.speed / 4);
    // smooth the eye over stair steps
    this.eyeSmooth += (this.pos.y - this.eyeSmooth) * Math.min(1, dt * (this.pos.y > this.eyeSmooth ? 14 : 20));
    if (Math.abs(this.pos.y - this.eyeSmooth) > 2) this.eyeSmooth = this.pos.y;

    this.camera.position.set(this.pos.x, this.eyeSmooth + EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * 0.004 * Math.min(1, this.speed / 4));
  }
}
