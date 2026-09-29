import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { arcadeWall, archFrame, archPanel, chhatri, nicheRow, parapet, onionDome, finial, pinnacle } from '../core/architecture.js';
import { CLOCK, TANK, GALLERY, SATKHANDA, rectPoly, toWorld } from '../world/layout.js';

function polyShape(outer, holes = []) {
  const toShape = (flat, S) => {
    const s = new S();
    for (let k = 0; k < flat.length; k += 2) (k ? s.lineTo : s.moveTo).call(s, flat[k], -flat[k + 1]);
    return s;
  };
  const sh = toShape(outer, THREE.Shape);
  for (const h of holes) sh.holes.push(toShape(h, THREE.Path));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);
  return g;
}

// Husainabad Clock Tower (1881), Ghanta Ghar Talab, the Picture Gallery and Satkhanda,
// at their OpenStreetMap positions, modelled from photographs.
export function buildHusainabad(ctx) {
  const { M, physics, scene } = ctx;
  const lamps = (ctx.lamps ||= []), paths = (ctx.paths ||= []), trees = (ctx.trees ||= []);
  const b = new Builder(M, physics);

  // plaza of red sandstone around the tank and the tower
  const tankPoly = rectPoly(TANK, 0, 0, TANK.w, TANK.d);
  const plaza = rectPoly(TANK, 26, -4, 170, 164);
  b.add('stoneRed', polyShape(plaza, [tankPoly]).translate(0, 0.045, 0));
  (ctx.reserved ||= []).push(plaza);
  (ctx.groundHoles ||= []).push(tankPoly);

  // ---- Ghanta Ghar Talab: stepped ghats down to a railed pool ----
  const { w, d, depth } = TANK;
  b.push(TANK.x, 0, TANK.z, TANK.yaw);
  const f = b.frame();
  physics.addPit(f.x, f.z, w / 2, d / 2, f.yaw, depth);
  const rise = 0.34, run = 0.62, n = Math.floor((depth - 0.6) / rise);
  for (let i = 0; i < n; i++) {
    const top = -rise * (i + 1), h = top + depth, inset = run * i;
    const W = w - inset * 2, D = d - inset * 2;
    b.box('redstone', W, h, run, 0, -depth, -D / 2 + run / 2, { collide: true });
    b.box('redstone', W, h, run, 0, -depth, D / 2 - run / 2, { collide: true });
    b.box('redstone', run, h, D, -W / 2 + run / 2, -depth, 0, { collide: true });
    b.box('redstone', run, h, D, W / 2 - run / 2, -depth, 0, { collide: true });
  }
  const PW = w - n * run * 2 - 1, PD = d - n * run * 2 - 1;
  b.box('stoneRed', w, 0.2, d, 0, -depth - 0.2, 0);
  b.box('water', PW, 0.1, PD, 0, -depth + 0.7, 0);
  // jali parapet around the pool, and a balustrade on the rim
  const jaliRun = (len, x, z, ry, y, key, collide) => {
    const g = new THREE.PlaneGeometry(len, 0.9);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * len / 0.9);
    b.push(x, y, z, ry);
    b.add(key, g, new THREE.Matrix4().makeTranslation(0, 0.45, 0));
    b.box('redstone', len, 0.14, 0.3, 0, 0.9, 0);
    for (let p = -len / 2; p <= len / 2 + 0.01; p += 2.4) b.box('redstone', 0.3, 1.1, 0.3, p, 0, 0);
    if (collide) b.collide(-len / 2, 0, -0.2, len / 2, 1.1, 0.2);
    b.pop();
  };
  jaliRun(PW, 0, -PD / 2, 0, -depth, 'jali', true);
  jaliRun(PW, 0, PD / 2, 0, -depth, 'jali', true);
  jaliRun(PD, -PW / 2, 0, Math.PI / 2, -depth, 'jali', true);
  jaliRun(PD, PW / 2, 0, Math.PI / 2, -depth, 'jali', true);
  for (const s of [-1, 1]) {
    const seg = (w - 10) / 2;
    jaliRun(seg, s * (5 + seg / 2), -d / 2 - 0.2, 0, 0, 'jali', true);
    jaliRun(seg, s * (5 + seg / 2), d / 2 + 0.2, 0, 0, 'jali', true);
  }
  // small pavilions at the corners of the rim
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chhatri(b, 'plasterPink', sx * (w / 2 + 2), 0, sz * (d / 2 + 2), 1.8, { cols: 4 });
  b.pop();

  // ---- the clock tower ----
  b.push(CLOCK.x, 0, CLOCK.z, CLOCK.yaw);
  b.box('stoneRed', 11, 1.2, 11, 0, 0, 0, { collide: true });
  b.box('stoneRed', 12.4, 0.4, 12.4, 0, 0, 0, { collide: true });
  const S1 = 6.6;
  b.box('redBrick', S1, 36.8, S1, 0, 1.2, 0, { collide: true });
  for (const y of [1.2, 8.6, 15, 22, 29, 33.4]) b.box('trim', S1 + 0.25, 0.35, S1 + 0.25, 0, y, 0);
  b.box('plasterPink', S1 + 0.4, 3.2, S1 + 0.4, 0, 1.2, 0, { collide: true });
  for (let i = 0; i < 4; i++) {
    b.push(0, 0, 0, (i * Math.PI) / 2);
    archPanel(b, 'woodDark', 0, 1.25, S1 / 2 + 0.21, 1.8, 2.6, 3.8);
    archFrame(b, 'trim', 0, 1.25, S1 / 2 + 0.22, 1.8, 2.6, 3.8, { band: 0.35 });
    archPanel(b, 'shadowRecess', 0, 17, S1 / 2 + 0.01, 0.9, 1.4, 2.2);
    archFrame(b, 'trim', 0, 17, S1 / 2 + 0.02, 0.9, 1.4, 2.2, { band: 0.25 });
    // patterned band under the clock stage
    const lat = new THREE.PlaneGeometry(S1, 2.6);
    const uv = lat.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 6, uv.getY(k) * 2.4);
    b.add('jaliWhite', lat, new THREE.Matrix4().makeTranslation(0, 35.2, S1 / 2 + 0.03));
    b.pop();
  }
  // clock stage
  const S2 = 7.4;
  b.box('redBrick', S2, 9, S2, 0, 38, 0);
  b.box('trim', S2 + 0.5, 0.5, S2 + 0.5, 0, 38, 0);
  b.box('trim', S2 + 0.7, 0.55, S2 + 0.7, 0, 47, 0);
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box('trim', 0.7, 9, 0.7, (cx * S2) / 2, 38, (cz * S2) / 2);
  for (let i = 0; i < 4; i++) {
    b.push(0, 0, 0, (i * Math.PI) / 2);
    b.add('trim', new THREE.TorusGeometry(2.35, 0.16, 8, 40), new THREE.Matrix4().makeTranslation(0, 42.6, S2 / 2 + 0.02));
    b.pop();
  }
  // belfry: three small arches per side, corner turrets with little domes
  for (let i = 0; i < 4; i++) {
    b.push(0, 47.55, 0, (i * Math.PI) / 2);
    arcadeWall(b, 'redBrick', { width: 6.4, height: 6, depth: 0.6, z: 2.9, arches: [-1.8, 0, 1.8].map((x) => ({ x, y0: 0.8, w: 1.1, spring: 2.6, h: 3.6 })), collide: false });
    for (const x of [-1.8, 0, 1.8]) archFrame(b, 'trim', x, 0.8, 3.21, 1.1, 2.6, 3.6, { band: 0.2 });
    b.pop();
  }
  b.box('trim', 7, 0.5, 7, 0, 53.55, 0);
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.cyl('redBrick', 0.45, 0.45, 7.2, cx * 3.3, 47.55, cz * 3.3, { seg: 8 });
    onionDome(b, 'plasterPink', cx * 3.3, 54.75, cz * 3.3, 0.55, 0.9, { finialKey: 'trim' });
  }
  // lantern, onion dome, finial
  b.cyl('redBrick', 2.2, 2.4, 5, 0, 54.05, 0, { seg: 8 });
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * Math.PI) / 4, ap = 2.2 * Math.cos(Math.PI / 8) + 0.02;
    b.push(Math.sin(a) * ap, 54.05, Math.cos(a) * ap, a);
    archPanel(b, 'shadowRecess', 0, 0.9, 0, 0.8, 1.8, 2.8);
    b.pop();
  }
  b.cyl('trim', 2.7, 2.7, 0.4, 0, 59.05, 0, { seg: 16 });
  onionDome(b, 'plasterPink', 0, 59.45, 0, 2.1, 3.6, { drum: 0.6, finialKey: 'bronze' });
  b.cyl('bronze', 0.03, 0.05, 2, 0, 63.4, 0, { seg: 6 });
  b.box('bronze', 0.9, 0.06, 0.06, 0, 65.4, 0);
  b.pop();

  // ---- Picture Gallery (the baradari), facing the tank ----
  b.push(GALLERY.x, 0, GALLERY.z, GALLERY.yaw);
  b.box('stoneRed', 40, 1.2, 20, 0, 0, 0, { collide: true });
  stairs3(b, 0, 10, 14, 1.2);
  const ga = [-14, -8.4, -2.8, 2.8, 8.4, 14].map((x) => ({ x, w: 3.6, spring: 4, h: 6.4, cusps: 5 }));
  b.push(0, 1.2, 0);
  arcadeWall(b, 'plasterLight', { width: 36, height: 9, depth: 1, arches: ga, z: 8.5 });
  for (const a of ga) archFrame(b, 'trim', a.x, 0, 9.01, a.w, a.spring, a.h, { cusps: 5, band: 0.35 });
  b.box('plasterLight', 36, 9, 1, 0, 0, -8.5, { collide: true });
  b.box('plasterLight', 1, 9, 16, -17.5, 0, 0, { collide: true });
  b.box('plasterLight', 1, 9, 16, 17.5, 0, 0, { collide: true });
  b.box('recess', 34, 0.04, 16, 0, 0, 0);
  b.box('trim', 37, 0.5, 19, 0, 9, 0, { collide: true });
  for (const s of [1, -1]) {
    // turned balustrade along the roof
    b.box('plasterLight', 36, 0.2, 0.35, 0, 9.5, s * 9.2);
    b.box('plasterLight', 36, 0.2, 0.35, 0, 10.6, s * 9.2);
    for (let x = -17.5; x <= 17.5; x += 0.55) b.cyl('plasterLight', 0.09, 0.12, 0.9, x, 9.7, s * 9.2, { seg: 6 });
  }
  for (const s of [-1, 1]) pinnacle(b, 'plasterLight', s * 17.5, 9.5, 9.2, 2, 0.25);
  b.pop();
  b.pop();

  // ---- Satkhanda: octagonal storeys, plaster below and bare brick above ----
  b.push(SATKHANDA.x, 0, SATKHANDA.z, 0.3);
  b.cyl('stoneRed', 10, 10.2, 0.6, 0, 0, 0, { seg: 8, collide: true });
  let y = 0.6;
  const storeys = [[8.6, 7.2, 'weathered'], [7.4, 6.2, 'weathered'], [6.4, 5.6, 'redBrick'], [5.5, 5, 'redBrick']];
  storeys.forEach(([r, h, key], si) => {
    b.cyl(key, r * 0.98, r, h, 0, y, 0, { seg: 8, collide: si === 0 });
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) * Math.PI) / 4, ap = r * Math.cos(Math.PI / 8) * 0.99;
      b.push(Math.sin(a) * ap, y, Math.cos(a) * ap, a);
      const count = si === 0 ? 2 : si === 3 ? 3 : 2;
      nicheRow(b, 'shadowRecess', { x0: -r * 0.32, x1: r * 0.32, y: 0.9, z: 0, count, w: si === 3 ? 0.9 : 1.3, spring: h * 0.42, h: h * 0.7 });
      if (si < 2) for (let q = 0; q < count; q++) {
        const x = -r * 0.32 + (r * 0.64 / count) * (q + 0.5);
        archFrame(b, 'trim', x, 0.9, 0.01, 1.3, h * 0.42, h * 0.7, { band: 0.18 });
      }
      b.pop();
    }
    y += h;
    // the saw-tooth bracketed chajja
    b.cyl('plasterLight', r * 1.12, r * 1.0, 0.35, 0, y - 0.1, 0, { seg: 8 });
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      b.box('plasterLight', 0.28, 0.45, 0.9, Math.sin(a) * r * 1.04, y - 0.5, Math.cos(a) * r * 1.04, { ry: a });
    }
    y += 0.25;
  });
  b.cyl('redBrick', 5.3, 5.3, 1.2, 0, y, 0, { seg: 8, open: true });
  b.pop();

  scene.add(b.build('Husainabad'));

  // clock faces + hands (animated, kept out of the merged mesh)
  const hands = [];
  const handMat = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Group();
    face.position.set(CLOCK.x, 42.6, CLOCK.z);
    face.rotation.y = CLOCK.yaw + (i * Math.PI) / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), M.clockFace);
    disc.position.z = 3.72;
    face.add(disc);
    const mk = (len, wd) => {
      const g = new THREE.BoxGeometry(wd, len, 0.06);
      g.translate(0, len / 2 - 0.25, 0);
      const m = new THREE.Mesh(g, handMat);
      m.position.z = 3.8;
      face.add(m);
      return m;
    };
    hands.push([mk(1.3, 0.16), mk(1.95, 0.1)]);
    scene.add(face);
  }

  for (let i = -2; i <= 2; i++) {
    lamps.push({ ...xz(toWorld(TANK, i * 14, -TANK.d / 2 - 6)), ry: TANK.yaw }, { ...xz(toWorld(TANK, i * 14, TANK.d / 2 + 6)), ry: TANK.yaw + Math.PI });
  }
  for (let i = 0; i < 10; i++) trees.push({ ...xz(toWorld(TANK, -80 + (i % 2) * 6, -60 + i * 14)), type: 'ashoka', s: 1 });
  paths.push(
    { a: toWorld(TANK, -40, -TANK.d / 2 - 4), b: toWorld(TANK, 90, -TANK.d / 2 - 4), n: 10 },
    { a: toWorld(TANK, -40, TANK.d / 2 + 4), b: toWorld(TANK, 90, TANK.d / 2 + 4), n: 10 },
    { a: toWorld(TANK, TANK.w / 2 + 6, -30), b: toWorld(TANK, TANK.w / 2 + 6, 30), n: 5 },
  );
  (ctx.footprints ||= []).push(
    { p: plaza, color: '#c79a82' }, { p: tankPoly, color: '#6f93a0' },
    { p: rectPoly(CLOCK, 0, 0, 8, 8), color: '#8a4a36' },
    { p: rectPoly(GALLERY, 0, 0, 40, 20), color: '#e6d6a8' },
    { p: rectPoly({ ...SATKHANDA, yaw: 0.3 }, 0, 0, 18, 18), color: '#a88a62' },
  );
  (ctx.reserved ||= []).push(rectPoly({ ...SATKHANDA, yaw: 0.3 }, 0, 0, 30, 30));

  ctx.updatables.push({
    update() {
      const mins = ctx.gameMinutes?.() ?? 0;
      const hA = -((mins / 60) % 12) / 12 * Math.PI * 2;
      const mA = -(mins % 60) / 60 * Math.PI * 2;
      for (const [h, m] of hands) { h.rotation.z = hA; m.rotation.z = mA; }
    },
  });
}

const xz = ([x, z]) => ({ x, z });

function stairs3(b, x, z, width, height) {
  const n = 4;
  for (let i = 0; i < n; i++) b.box('stoneRed', width, (height / n) * (i + 1), 0.45, x, 0, z + 0.45 * (n - i) - 0.2, { collide: true });
}
