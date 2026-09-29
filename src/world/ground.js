import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { ROAD, SITES } from './layout.js';

const EXTENT = 2200;

// Stepped sides going down into a pit, like a ghat or a stepwell.
function steppedPit(b, physics, { x0, x1, z0, z1, depth, rise = 0.4, run = 0.65, sides = ['n', 's', 'e', 'w'], key = 'stone' }) {
  physics.addPit(x0, z0, x1, z1, depth);
  const n = Math.floor(depth / rise);
  for (let i = 0; i < n; i++) {
    const top = -rise * (i + 1) + 0.0001;
    const inset = run * i;
    const h = top + depth;
    if (h <= 0) continue;
    const ix0 = x0 + inset, ix1 = x1 - inset, iz0 = z0 + inset, iz1 = z1 - inset;
    const W = ix1 - ix0, D = iz1 - iz0;
    const add = (w, d, cx, cz) => b.box(key, w, h, d, cx, -depth, cz, { collide: true });
    if (sides.includes('n')) add(W, run, (ix0 + ix1) / 2, iz0 + run / 2);
    if (sides.includes('s')) add(W, run, (ix0 + ix1) / 2, iz1 - run / 2);
    if (sides.includes('w')) add(run, D, ix0 + run / 2, (iz0 + iz1) / 2);
    if (sides.includes('e')) add(run, D, ix1 - run / 2, (iz0 + iz1) / 2);
  }
  // pit floor + plain walls where there are no steps
  b.box('ground', x1 - x0, 0.2, z1 - z0, (x0 + x1) / 2, -depth - 0.2, (z0 + z1) / 2);
  const wall = (w, d, cx, cz) => b.box(key, w, depth, d, cx, -depth, cz);
  if (!sides.includes('n')) wall(x1 - x0, 0.4, (x0 + x1) / 2, z0 + 0.2);
  if (!sides.includes('s')) wall(x1 - x0, 0.4, (x0 + x1) / 2, z1 - 0.2);
}

export function buildGround(M, physics, scene) {
  const b = new Builder(M, physics);
  const t = SITES.tank, r = SITES.river;
  const tank = { x0: t.x - t.w / 2, x1: t.x + t.w / 2, z0: t.z - t.d / 2, z1: t.z + t.d / 2 };
  const river = { x0: -EXTENT + 10, x1: EXTENT - 10, z0: r.z0, z1: r.z1 };

  // Ground plane with holes where the tank and the river sink below it.
  const shape = new THREE.Shape([
    new THREE.Vector2(-EXTENT, -EXTENT), new THREE.Vector2(EXTENT, -EXTENT),
    new THREE.Vector2(EXTENT, EXTENT), new THREE.Vector2(-EXTENT, EXTENT),
  ]);
  for (const p of [tank, river]) {
    shape.holes.push(new THREE.Path([
      new THREE.Vector2(p.x0, -p.z1), new THREE.Vector2(p.x1, -p.z1),
      new THREE.Vector2(p.x1, -p.z0), new THREE.Vector2(p.x0, -p.z0),
    ]));
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  b.add('ground', g);

  steppedPit(b, physics, { ...tank, depth: t.depth, key: 'stoneRed' });
  // River Gomti: ghats on the south (city) bank, a plain embankment opposite.
  steppedPit(b, physics, { ...river, depth: 3.4, rise: 0.34, run: 0.8, sides: ['s'], key: 'stone' });

  // Husainabad Road + raised pavements
  const len = ROAD.x1 - ROAD.x0, cx = (ROAD.x0 + ROAD.x1) / 2;
  b.box('road', len, 0.04, ROAD.width, cx, 0, ROAD.z);
  for (const s of [-1, 1]) {
    b.box('stone', len, 0.18, 3.2, cx, 0, ROAD.z + s * (ROAD.width / 2 + 1.6), { collide: true });
    b.box('curb', len, 0.2, 0.25, cx, 0, ROAD.z + s * (ROAD.width / 2 + 0.12));
  }
  // centre line (faded)
  for (let x = ROAD.x0; x < ROAD.x1; x += 9) b.box('trim', 3.5, 0.045, 0.18, x, 0, ROAD.z);

  // Chowk bazaar street paving
  const c = SITES.chowk;
  b.box('stone', c.width + 4, 0.06, c.z1 - c.z0, c.x, 0, (c.z0 + c.z1) / 2);

  const mesh = b.build('ground');
  scene.add(mesh);

  // Water surfaces
  const waters = [];
  const addWater = (x0, x1, z0, z1, y) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 9, uv.getY(i) * (z1 - z0) / 9);
    const w = new THREE.Mesh(geo, M.water);
    w.rotation.x = -Math.PI / 2;
    w.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    w.receiveShadow = true;
    scene.add(w);
    waters.push(w);
  };
  addWater(tank.x0, tank.x1, tank.z0, tank.z1, -t.depth + 1.3);
  addWater(river.x0, river.x1, river.z0, river.z1, -1.9);
  return { update(time) { M.water.normalMap.offset.set(time * 0.004, time * 0.0025); } };
}
