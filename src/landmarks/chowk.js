import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { rng, SIGNS } from '../core/textures.js';
import { CLOTH_KEYS, FACADE_COLORS } from '../core/materials.js';
import { arcadeWall, archFrame, archPanel, chhatri, parapet, pinnacleRow, nicheRow } from '../core/architecture.js';

function signGeo(i, w = 2.6, h = 1.3) {
  const g = new THREE.PlaneGeometry(w, h);
  const col = i % 4, row = Math.floor(i / 4);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k, (col + uv.getX(k)) / 4, 1 - (row + 1 - uv.getY(k)) / 4);
  }
  return g;
}

// Chowk: the old bazaar street running south from Husainabad Road.
export function buildChowk(ctx, site) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  const r = rng(1905);
  const bulbs = (ctx.bulbs ||= []);
  const paths = (ctx.paths ||= []);
  const trees = (ctx.trees ||= []);
  const smokes = (ctx.smokes ||= []);
  const X = site.x, half = site.width / 2, stall = 2.5;
  const square = { z0: 96, z1: 117 };

  // ---- Akbari Darwaza, the gate into Chowk ----
  b.push(X, 0, site.z0 + 2);
  arcadeWall(b, 'plaster', { width: 22, height: 11, depth: 4, arches: [{ x: 0, w: 6.6, spring: 5, h: 9, cusps: 5 }] });
  for (const s of [1, -1]) {
    b.push(0, 0, s * 2.01, s > 0 ? 0 : Math.PI);
    archFrame(b, 'trim', 0, 0, 0, 6.6, 5, 9, { cusps: 5, band: 0.5 });
    nicheRow(b, 'recess', { x0: -10.5, x1: -4.5, y: 1, z: 0, count: 2, w: 1.8, spring: 2.4, h: 3.8, cusps: 3 });
    nicheRow(b, 'recess', { x0: 4.5, x1: 10.5, y: 1, z: 0, count: 2, w: 1.8, spring: 2.4, h: 3.8, cusps: 3 });
    nicheRow(b, 'shadowRecess', { x0: -10.5, x1: 10.5, y: 7, z: 0, count: 7, w: 1, spring: 1, h: 1.9 });
    b.pop();
  }
  b.box('trim', 22.6, 0.4, 4.6, 0, 11, 0);
  parapet(b, 'plaster', { x0: -11, x1: 11, y: 11.4, z: 2, t: 0.3, h: 0.7, collide: false });
  parapet(b, 'plaster', { x0: -11, x1: 11, y: 11.4, z: -2, t: 0.3, h: 0.7, collide: false });
  pinnacleRow(b, 'plaster', { x0: -10, x1: 10, y: 12.1, z: 2, spacing: 2.5, h: 1.8, r: 0.18 });
  chhatri(b, 'plaster', 0, 11.4, 0, 1.6, { cols: 8 });
  b.pop();

  // ---- shop-houses on both sides ----
  const signIdx = [];
  for (let i = 0; i < SIGNS.length; i++) signIdx.push(i);
  let signCursor = 0;
  const shop = (side, z0, width, depth, floors) => {
    const face = X + side * (half + stall); // building front line
    const cx = face + side * (depth / 2);
    const cz = z0 + width / 2;
    const tint = 'facade' + Math.floor(r() * FACADE_COLORS.length);
    const H = floors * 3;
    b.box(tint, depth, H, width, cx, 0, cz, { collide: true });
    b.box('trim', depth + 0.3, 0.3, width + 0.1, cx, H, cz);
    parapet(b, tint, { x0: z0, x1: z0 + width, y: H + 0.3, z: face + side * 0.2, t: 0.3, h: 0.8, alongZ: true, collide: false });
    // turn to face the street: local +Z points into the street
    b.push(face, 0, cz, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    const lit = r() > 0.25;
    b.box('woodDark', width - 0.2, 3, 0.06, 0, 0, 0.03);
    b.box(lit ? 'warmGlow' : 'shadowRecess', width - 1, 2.7, 0.05, 0, 0.05, 0.07);
    for (const px of [-width / 2 + 0.25, width / 2 - 0.25]) b.box('woodDark', 0.35, 3, 0.35, px, 0, 0.2);
    // shelves of goods silhouetted against the lit interior
    for (const sy of [1.25, 1.95]) {
      b.box('woodDark', width - 1.1, 0.06, 0.35, 0, sy, 0.25);
      for (let gx = -width / 2 + 0.8; gx < width / 2 - 0.8; gx += 0.42 + r() * 0.2) {
        const gh = 0.2 + r() * 0.4;
        b.box(CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)], 0.3, gh, 0.25, gx, sy + 0.06, 0.25);
      }
    }
    // counter and goods
    b.box('wood', width - 1.2, 0.9, 0.9, 0, 0, 0.9, { collide: true });
    const kind = r();
    for (let g = 0; g < Math.floor(width / 0.8); g++) {
      const gx = -width / 2 + 0.9 + g * 0.8;
      if (gx > width / 2 - 0.9) break;
      const ck = CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)];
      if (kind < 0.5) b.box(ck, 0.6, 0.12 + r() * 0.35, 0.6, gx, 0.9, 0.9); // folded cloth stacks
      else b.cyl(ck, 0.22, 0.28, 0.2 + r() * 0.25, gx, 0.9, 0.9, { seg: 8 }); // sweets, spice bowls
    }
    // awning
    const ak = CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)];
    const awn = new THREE.BoxGeometry(width - 0.1, 0.06, 2.3);
    awn.rotateX(0.32);
    b.geo(ak, awn, 0, 3.05, 1.1);
    // signboard above the awning
    const si = signIdx[signCursor++ % signIdx.length];
    b.add('sign', signGeo(si, Math.min(width - 0.6, 3.4), Math.min(width - 0.6, 3.4) / 2), new THREE.Matrix4().makeTranslation(0, 4.25, 0.06));
    b.box('woodDark', Math.min(width - 0.6, 3.4) + 0.2, Math.min(width - 0.6, 3.4) / 2 + 0.2, 0.05, 0, 4.25 - (Math.min(width - 0.6, 3.4) / 2 + 0.2) / 2, 0.02);
    // chikan kurtas hanging under the awning of cloth shops
    if (kind < 0.5) {
      for (let k = 0; k < 3; k++) {
        const kurta = new THREE.PlaneGeometry(0.55, 1.05);
        b.geo(r() > 0.35 ? 'chikan' : ak, kurta, -width / 2 + 0.7 + k * 0.65, 2.35, 1.9, { ry: 0.25 * (r() - 0.5) });
      }
    }
    // upper floors: jharokha balconies
    for (let f = 2; f < floors; f++) {
      if (r() < 0.35) continue;
      const bw = Math.min(2.4, width - 1);
      const bx = (r() - 0.5) * (width - bw - 1);
      b.box('wood', bw, 0.18, 0.9, bx, f * 3 + 0.2, 0.45);
      b.box('woodDark', bw, 0.9, 0.06, bx, f * 3 + 0.38, 0.88);
      b.box('trim', bw + 0.3, 0.12, 1.1, bx, f * 3 + 2.4, 0.5);
    }
    b.pop();
  };

  for (const side of [-1, 1]) {
    let z = site.z0 + 6;
    while (z < site.z1 - 4) {
      if (z + 6 > square.z0 && z < square.z1) { z = square.z1; continue; }
      const w = r() > 0.5 ? 6 : r() > 0.5 ? 4.5 : 7.5;
      const floors = 2 + Math.floor(r() * 3);
      shop(side, z, w, 8 - stall + 2.5, floors);
      z += w;
    }
    // square frontage set back
    b.box('facade' + (side > 0 ? 2 : 5), 6, 9, square.z1 - square.z0, X + side * (half + stall + 9), 0, (square.z0 + square.z1) / 2, { collide: true });
  }

  // chabutra with a great neem tree in the square
  const sqz = (square.z0 + square.z1) / 2;
  b.cyl('stoneRed', 3.4, 3.6, 0.45, X, 0, sqz, { seg: 16, collide: true });
  b.cyl('trim', 3.5, 3.5, 0.08, X, 0.45, sqz, { seg: 16 });
  trees.push({ x: X, z: sqz, type: 'banyan', s: 1.1 });

  // ---- stalls ----
  // galouti kebab: iron tawa on a glowing brazier, smoke rising
  const stallAt = (x, z, kind) => {
    b.push(x, 0, z);
    b.box('wood', 2.2, 0.9, 1.1, 0, 0, 0, { collide: true });
    if (kind === 'kebab') {
      b.box('ember', 1.2, 0.08, 0.6, 0, 0.9, 0);
      b.cyl('iron', 0.55, 0.5, 0.06, 0, 1.0, 0, { seg: 20 });
      for (let k = 0; k < 7; k++) b.cyl('woodDark', 0.07, 0.07, 0.03, -0.3 + (k % 4) * 0.2, 1.06, -0.12 + Math.floor(k / 4) * 0.24, { seg: 8 });
      smokes.push({ x, y: 1.3, z, type: 'smoke' });
    } else {
      b.cyl('iron', 0.18, 0.22, 0.4, -0.5, 0.9, 0, { seg: 10 });
      b.box('ember', 0.25, 0.08, 0.25, -0.5, 0.88, 0);
      for (let k = 0; k < 8; k++) b.cyl('stoneRed', 0.045, 0.035, 0.1, 0.1 + (k % 4) * 0.14, 0.9, -0.1 + Math.floor(k / 4) * 0.2, { seg: 6 });
      smokes.push({ x: x - 0.5, y: 1.4, z, type: 'steam' });
    }
    for (const [px, pz] of [[-1.05, -0.5], [1.05, -0.5], [-1.05, 0.5], [1.05, 0.5]]) b.cyl('wood', 0.04, 0.04, 2.3, px, 0.9, pz, { seg: 5 });
    b.box(kind === 'kebab' ? 'clothRed' : 'clothSaffron', 2.4, 0.05, 1.3, 0, 3.2, 0);
    b.pop();
  };
  stallAt(X - half + 0.9, 42, 'kebab');
  stallAt(X + half - 0.9, 64, 'chai');
  stallAt(X - 5.5, square.z0 + 4, 'kebab');
  stallAt(X + 5.5, square.z1 - 4, 'chai');
  // handcarts with fruit
  const cart = (x, z, key) => {
    b.push(x, 0, z, Math.PI / 2);
    b.box('wood', 1.9, 0.12, 1, 0, 0.75, 0, {});
    b.box('wood', 1.9, 0.25, 0.06, 0, 0.87, 0.47);
    b.box('wood', 1.9, 0.25, 0.06, 0, 0.87, -0.47);
    for (const s of [-1, 1]) {
      const wheel = new THREE.TorusGeometry(0.42, 0.04, 6, 16);
      b.geo('woodDark', wheel, 0.2, 0.44, s * 0.58);
    }
    for (let i = 0; i < 18; i++) b.geo(key, new THREE.SphereGeometry(0.09, 6, 5), -0.8 + (i % 6) * 0.32, 0.96 + Math.floor(i / 6) * 0.06, -0.3 + (Math.floor(i / 6) % 3) * 0.3);
    b.pop();
    physics.addBox(x - 0.6, 0, z - 1, x + 0.6, 1.1, z + 1);
  };
  cart(X + 2.2, 82, 'clothYellow');
  cart(X - 2.4, 140, 'clothRed');
  cart(X + 2.6, 165, 'clothSaffron');

  scene.add(b.build('Chowk'));

  // String lights zig-zagging across the street
  for (let z = site.z0 + 8; z < site.z1 - 4; z += 5.5) {
    if (z > square.z0 && z < square.z1) continue;
    const xa = X - half - stall + 0.1, xb = X + half + stall - 0.1;
    const za = z, zb = z + 2.7;
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      bulbs.push([xa + (xb - xa) * t, 5.6 - Math.sin(t * Math.PI) * 0.9, za + (zb - za) * t]);
    }
  }
  for (let lane = -1; lane <= 1; lane++) paths.push({ a: [X + lane * 2.2, site.z0 + 4], b: [X + lane * 2.2, site.z1 - 4], n: 18 });
  paths.push({ a: [X - 6, sqz - 8], b: [X + 6, sqz + 8], n: 5 });
  ctx.footprints.push(
    { x0: X - half - stall - 6, x1: X - half - stall, z0: site.z0 + 6, z1: site.z1 - 4, color: '#b98f68' },
    { x0: X + half + stall, x1: X + half + stall + 6, z0: site.z0 + 6, z1: site.z1 - 4, color: '#b98f68' },
    { x0: X - 11, x1: X + 11, z0: site.z0, z1: site.z0 + 4, color: '#a88a62' },
  );
}
