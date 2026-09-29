import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, smokeSpriteTexture } from '../core/textures.js';
import { ROAD, SITES } from './layout.js';
import { leafUniform } from './city.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

const KURTA = ['#f4efe4', '#f4efe4', '#e9e2d0', '#c8d6e0', '#e3c9a0', '#b7412e', '#2f4f7a', '#6a8a4a', '#d98a3a', '#8a3a5a', '#3a3a3a', '#d4b0c8', '#f0d890'];
const SKIN = ['#8d5a3b', '#a36a45', '#7a4a30', '#b57d57', '#6a3f28', '#c08a62'];

function personGeos() {
  const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);
  const body = mergeGeometries([
    new THREE.CylinderGeometry(0.075, 0.07, 0.78, 6).translate(-0.1, 0.39, 0),
    new THREE.CylinderGeometry(0.075, 0.07, 0.78, 6).translate(0.1, 0.39, 0),
    new THREE.CylinderGeometry(0.2, 0.29, 0.92, 10).translate(0, 1.05, 0),
    new THREE.CylinderGeometry(0.055, 0.05, 0.62, 5).translate(-0.25, 1.12, 0).rotateZ(0.0),
    new THREE.CylinderGeometry(0.055, 0.05, 0.62, 5).translate(0.25, 1.12, 0),
    new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 0.8).translate(0, 1.5, 0),
  ].map(nonIdx));
  const head = new THREE.SphereGeometry(0.12, 10, 8).scale(0.9, 1.05, 0.95).translate(0, 1.66, 0);
  const cap = new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10).translate(0, 1.77, 0);
  return { body, head, cap };
}

function rickshawGeos() {
  const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);
  const wheel = (x, z, r) => new THREE.TorusGeometry(r, 0.035, 5, 14).rotateY(Math.PI / 2).translate(x, r, z);
  const frame = mergeGeometries([
    wheel(1.1, 0, 0.33), wheel(-0.35, 0.55, 0.36), wheel(-0.35, -0.55, 0.36),
    new THREE.BoxGeometry(1.5, 0.05, 0.05).translate(0.4, 0.55, 0),
    new THREE.BoxGeometry(0.05, 0.05, 1.1).translate(-0.35, 0.36, 0),
    new THREE.BoxGeometry(0.05, 0.6, 0.05).translate(1.0, 0.75, 0),
    new THREE.BoxGeometry(0.05, 0.05, 0.5).translate(1.0, 1.05, 0),
    new THREE.BoxGeometry(0.2, 0.05, 0.25).translate(0.55, 0.95, 0),
    new THREE.BoxGeometry(0.7, 0.5, 1.05).translate(-0.4, 0.75, 0),
  ].map(nonIdx));
  const canopy = mergeGeometries([
    new THREE.CylinderGeometry(0.62, 0.62, 1.1, 10, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(-0.55, 1.35, 0),
    new THREE.BoxGeometry(0.75, 0.1, 1.1).translate(-0.35, 1.02, 0),
  ].map(nonIdx));
  return { frame, canopy };
}

// A small CPU particle system with per-particle alpha and size.
class Particles {
  constructor(count, { color, texture, blending = THREE.NormalBlending, size = 1 }) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.size = new Float32Array(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, color: { value: new THREE.Color(color) }, scale: { value: size * 300 } },
      vertexShader: `
        attribute float aAlpha; attribute float aSize; varying float vA;
        uniform float scale;
        void main() {
          vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 color; varying float vA;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(color, t.a * vA);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
  }
  flush() {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
}

export function buildLife(ctx) {
  const { scene } = ctx;
  const r = rng(2024);
  const group = new THREE.Group();
  group.name = 'life';

  // ---------- people ----------
  const paths = (ctx.paths ||= []);
  for (const s of [-1, 1]) {
    paths.push({ a: [ROAD.x0 + 20, s * 8.8], b: [-48, s * 8.8], n: 12 });
    paths.push({ a: [-8, s * 8.8], b: [ROAD.x1 - 20, s * 8.8], n: 34 });
  }
  paths.push({ a: [-60, -236], b: [60, -236], n: 10 }, { a: [-200, -237], b: [-90, -237], n: 6 });
  const walkers = [];
  for (const p of paths) {
    for (let i = 0; i < p.n; i++) {
      const ax = p.a[0], az = p.a[1], bx = p.b[0], bz = p.b[1];
      const len = Math.hypot(bx - ax, bz - az);
      const side = (r() - 0.5) * 1.6;
      const nx = -(bz - az) / len, nz = (bx - ax) / len;
      walkers.push({
        ax: ax + nx * side, az: az + nz * side, bx: bx + nx * side, bz: bz + nz * side, len,
        t: r(), dir: r() > 0.5 ? 1 : -1, speed: r() < 0.12 ? 0 : 0.9 + r() * 0.7, phase: r() * 10, y: p.y ?? 0,
        idleYaw: r() * Math.PI * 2, cap: r() < 0.3, scale: 0.9 + r() * 0.16,
      });
    }
  }
  // cycle-rickshaws and e-rickshaws on Husainabad Road (they keep left)
  const riders = [];
  for (let i = 0; i < 22; i++) {
    const east = i % 2 === 0;
    riders.push({ x: ROAD.x0 + r() * (ROAD.x1 - ROAD.x0), z: east ? -2.4 : 2.4, dir: east ? 1 : -1, speed: 2.6 + r() * 2.2, bob: r() * 10 });
  }
  const pg = personGeos();
  const nP = walkers.length + riders.length;
  const skinMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const clothMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  const bodies = new THREE.InstancedMesh(pg.body, clothMat, nP);
  const heads = new THREE.InstancedMesh(pg.head, skinMat, nP);
  const caps = new THREE.InstancedMesh(pg.cap, new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.9 }), nP);
  for (let i = 0; i < nP; i++) {
    bodies.setColorAt(i, new THREE.Color(KURTA[Math.floor(r() * KURTA.length)]));
    heads.setColorAt(i, new THREE.Color(SKIN[Math.floor(r() * SKIN.length)]));
  }
  for (const m of [bodies, heads, caps]) {
    m.castShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
  }
  const rg = rickshawGeos();
  const frames = new THREE.InstancedMesh(rg.frame, new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.5 }), riders.length);
  const canopies = new THREE.InstancedMesh(rg.canopy, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), riders.length);
  const CANOPY = ['#2d6b3f', '#1f4f8a', '#a8262e', '#d9a21e', '#3a3a3a', '#7a2c6a'];
  riders.forEach((_, i) => canopies.setColorAt(i, new THREE.Color(CANOPY[i % CANOPY.length])));
  for (const m of [frames, canopies]) {
    m.castShadow = true; m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
  }

  // ---------- kites over the rooftops ----------
  const kiteShape = new THREE.Shape([new THREE.Vector2(0, 0.55), new THREE.Vector2(0.42, 0), new THREE.Vector2(0, -0.5), new THREE.Vector2(-0.42, 0)]);
  const kiteGeo = new THREE.ShapeGeometry(kiteShape);
  const tail = new THREE.PlaneGeometry(0.12, 0.5).translate(0, -0.72, 0);
  const kiteAll = mergeGeometries([kiteGeo.toNonIndexed(), tail.toNonIndexed()]);
  const KITE = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e', '#3a86ff', '#fb5607', '#ffffff', '#06d6a0'];
  const kites = [];
  for (let i = 0; i < 70; i++) {
    const ax = -300 + r() * 620, az = -220 + r() * 480;
    kites.push({ ax, az, h: 32 + r() * 55, phase: r() * 10, drift: 8 + r() * 14, sx: ax + (r() - 0.5) * 60, sz: az + 30 + r() * 40, sy: 9 + r() * 4 });
  }
  const kiteMesh = new THREE.InstancedMesh(kiteAll, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8, emissive: '#331a0a', emissiveIntensity: 0.3 }), kites.length);
  kites.forEach((_, i) => kiteMesh.setColorAt(i, new THREE.Color(KITE[i % KITE.length])));
  kiteMesh.frustumCulled = false;
  kiteMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  kiteMesh.scale.setScalar(1);
  group.add(kiteMesh);
  const strings = new Float32Array(kites.length * 6);
  const stringGeo = new THREE.BufferGeometry();
  stringGeo.setAttribute('position', new THREE.BufferAttribute(strings, 3));
  const stringLines = new THREE.LineSegments(stringGeo, new THREE.LineBasicMaterial({ color: '#f3e6d0', transparent: true, opacity: 0.25 }));
  stringLines.frustumCulled = false;
  group.add(stringLines);

  // ---------- pigeon flocks (kabootar-baazi) ----------
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.18, -0.36, 0.0, -0.06, 0, 0, -0.1,
    0, 0, 0.18, 0, 0, -0.1, 0.36, 0.0, -0.06,
  ], 3));
  birdGeo.computeVertexNormals();
  const flocks = [
    { cx: -115, cz: -110, y: 42, r: 55, n: 34, speed: 0.22 },
    { cx: 218, cz: -120, y: 48, r: 45, n: 28, speed: -0.26 },
    { cx: 30, cz: 110, y: 35, r: 38, n: 30, speed: 0.3 },
  ];
  const birds = [];
  for (const f of flocks) for (let i = 0; i < f.n; i++) birds.push({ f, a: r() * 0.9, dr: (r() - 0.5) * 14, dy: (r() - 0.5) * 8, ph: r() * 10 });
  const birdMesh = new THREE.InstancedMesh(birdGeo, new THREE.MeshStandardMaterial({ color: '#3b3a40', side: THREE.DoubleSide, roughness: 1 }), birds.length);
  birdMesh.frustumCulled = false;
  birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(birdMesh);

  // ---------- smoke, steam, fountains ----------
  const smokeTex = smokeSpriteTexture();
  const emitters = (ctx.smokes ||= []);
  const PER = 26;
  const smoke = new Particles(emitters.length * PER, { color: '#d9d2c8', texture: smokeTex, size: 1 });
  const smokeState = [];
  emitters.forEach((e, ei) => {
    for (let k = 0; k < PER; k++) smokeState.push({ e, life: k / PER, seed: r() * 10, i: ei * PER + k });
  });
  group.add(smoke.points);
  const fountains = ctx.fountains || [];
  const FPER = 40;
  const water = new Particles(fountains.length * FPER, { color: '#e8f2f6', texture: smokeTex, size: 0.22, blending: THREE.AdditiveBlending });
  const waterState = [];
  fountains.forEach((f) => { for (let k = 0; k < FPER; k++) waterState.push({ f, life: k / FPER, a: r() * Math.PI * 2, v: 0.8 + r() * 0.4 }); });
  group.add(water.points);

  scene.add(group);

  const ped = (i, x, y, z, yaw, bob, sc = 1) => {
    _e.set(0, yaw, Math.sin(bob) * 0.03);
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y + Math.abs(Math.sin(bob)) * 0.04, z), _q, _s.set(sc, sc, sc));
    bodies.setMatrixAt(i, _m);
    heads.setMatrixAt(i, _m);
  };

  ctx.updatables.push({
    update(t, dt) {
      leafUniform.value = t;
      // walkers
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i];
        if (w.speed > 0) {
          w.t += (w.dir * w.speed * dt) / w.len;
          if (w.t > 1) { w.t = 1; w.dir = -1; }
          if (w.t < 0) { w.t = 0; w.dir = 1; }
        }
        const x = w.ax + (w.bx - w.ax) * w.t, z = w.az + (w.bz - w.az) * w.t;
        const yaw = w.speed > 0 ? Math.atan2(w.dir * (w.bx - w.ax), w.dir * (w.bz - w.az)) : w.idleYaw;
        const bob = w.speed > 0 ? (t * w.speed * 5.2 + w.phase) : 0;
        ped(i, x, w.y, z, yaw, bob, w.scale);
        _m.compose(_p.set(x, w.y + (w.cap ? Math.abs(Math.sin(bob)) * 0.04 : -50), z), _q, _s.set(w.scale, w.scale, w.scale));
        caps.setMatrixAt(i, _m);
      }
      // rickshaws + riders
      const span = ROAD.x1 - ROAD.x0;
      for (let k = 0; k < riders.length; k++) {
        const rd = riders[k];
        rd.x += rd.dir * rd.speed * dt;
        if (rd.x > ROAD.x1) rd.x -= span;
        if (rd.x < ROAD.x0) rd.x += span;
        const yaw = rd.dir > 0 ? 0 : Math.PI;
        _q.setFromAxisAngle(_p.set(0, 1, 0), yaw);
        _m.compose(_p.set(rd.x, 0, rd.z), _q, _s.set(1, 1, 1));
        frames.setMatrixAt(k, _m);
        canopies.setMatrixAt(k, _m);
        const i = walkers.length + k;
        const off = rd.dir * 0.55;
        ped(i, rd.x + off, 0.35, rd.z, yaw, t * 6 + rd.bob, 0.95);
        _m.compose(_p.set(0, -50, 0), _q, _s.set(1, 1, 1));
        caps.setMatrixAt(i, _m);
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      caps.instanceMatrix.needsUpdate = true;
      frames.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;

      // kites
      for (let i = 0; i < kites.length; i++) {
        const k = kites[i];
        const x = k.ax + Math.sin(t * 0.21 + k.phase) * k.drift;
        const y = k.h + Math.sin(t * 0.5 + k.phase * 2) * 3;
        const z = k.az + Math.cos(t * 0.17 + k.phase) * k.drift * 0.6;
        _e.set(0.35 + Math.sin(t * 1.3 + k.phase) * 0.15, k.phase + Math.sin(t * 0.3) * 0.3, Math.sin(t * 0.9 + k.phase) * 0.4);
        _q.setFromEuler(_e);
        _m.compose(_p.set(x, y, z), _q, _s.set(1.6, 1.6, 1.6));
        kiteMesh.setMatrixAt(i, _m);
        strings.set([x, y, z, k.sx, k.sy, k.sz], i * 6);
      }
      kiteMesh.instanceMatrix.needsUpdate = true;
      stringGeo.attributes.position.needsUpdate = true;

      // pigeons
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i], f = b.f;
        const a = t * f.speed + b.a + Math.sin(t * 0.4 + b.ph) * 0.05;
        const rr = f.r + b.dr + Math.sin(t * 0.7 + b.ph) * 3;
        const x = f.cx + Math.cos(a) * rr, z = f.cz + Math.sin(a) * rr;
        const y = f.y + b.dy + Math.sin(t * 0.5 + b.ph) * 2;
        const yaw = Math.atan2(-Math.sin(a) * Math.sign(f.speed), Math.cos(a) * Math.sign(f.speed));
        _e.set(0, yaw, Math.sign(f.speed) * 0.35);
        _q.setFromEuler(_e);
        const flap = 0.35 + Math.abs(Math.sin(t * 11 + b.ph * 5)) * 1.3;
        _m.compose(_p.set(x, y, z), _q, _s.set(1.4, flap * 1.4, 1.4));
        birdMesh.setMatrixAt(i, _m);
      }
      birdMesh.instanceMatrix.needsUpdate = true;

      // smoke & steam
      for (const s of smokeState) {
        s.life += dt * (s.e.type === 'steam' ? 0.45 : 0.3);
        if (s.life > 1) s.life -= 1;
        const L = s.life;
        const i = s.i * 3;
        smoke.pos[i] = s.e.x + Math.sin(L * 5 + s.seed) * 0.25 * L + L * 0.6;
        smoke.pos[i + 1] = s.e.y + L * (s.e.type === 'steam' ? 1.6 : 3.2);
        smoke.pos[i + 2] = s.e.z + Math.cos(L * 4 + s.seed) * 0.25 * L;
        smoke.alpha[s.i] = Math.sin(L * Math.PI) * (s.e.type === 'steam' ? 0.35 : 0.28);
        smoke.size[s.i] = (s.e.type === 'steam' ? 0.3 : 0.5) + L * (s.e.type === 'steam' ? 0.8 : 2.2);
      }
      smoke.flush();
      // fountain jets: little parabolas
      for (let k = 0; k < waterState.length; k++) {
        const s = waterState[k];
        s.life += dt * 0.9;
        if (s.life > 1) { s.life -= 1; s.a = Math.random() * Math.PI * 2; }
        const L = s.life;
        const rad = L * 0.5 * s.v;
        water.pos[k * 3] = s.f.x + Math.cos(s.a) * rad;
        water.pos[k * 3 + 1] = s.f.y - 0.4 + 2.4 * L * s.v - 3.2 * L * L;
        water.pos[k * 3 + 2] = s.f.z + Math.sin(s.a) * rad;
        water.alpha[k] = 0.5 * (1 - L);
        water.size[k] = 0.18;
      }
      water.flush();
    },
  });
}
