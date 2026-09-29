import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { rng, SIGNS } from '../core/textures.js';
import { CLOTH_KEYS } from '../core/materials.js';
import { arcadeWall, archFrame, archPanel, chhatri, nicheRow, parapet, pinnacleRow } from '../core/architecture.js';
import { MAP } from '../world/osmCity.js';
import { AKBARI, BAZAAR, rectPoly, toWorld } from '../world/layout.js';

function signGeo(i, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const col = i % 4, row = Math.floor(i / 4);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / 4, 1 - (row + 1 - uv.getY(k)) / 4);
  return g;
}

// The Akbari Darwaza, the gate into Chowk, standing across the real lane.
export function buildAkbariGate(ctx) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  b.push(AKBARI.x, 0, AKBARI.z, AKBARI.yaw);
  const GW = 20, GH = 12;
  arcadeWall(b, 'weathered', { width: GW, height: GH, depth: 6, arches: [{ x: 0, w: 5, spring: 4.4, h: 8.4, cusps: 5 }] });
  for (const f of [1, -1]) {
    b.push(0, 0, f * 3.01, f > 0 ? 0 : Math.PI);
    archFrame(b, 'trim', 0, 0, 0, 5, 4.4, 8.4, { cusps: 5, band: 0.5 });
    archFrame(b, 'plaster', 0, 0, 0.02, 6, 4.4, 9.4, { band: 0.6 });
    nicheRow(b, 'recess', { x0: -GW / 2 + 0.6, x1: -4.5, y: 0.8, z: 0, count: 2, w: 1.8, spring: 2.4, h: 4, cusps: 3 });
    nicheRow(b, 'recess', { x0: 4.5, x1: GW / 2 - 0.6, y: 0.8, z: 0, count: 2, w: 1.8, spring: 2.4, h: 4, cusps: 3 });
    nicheRow(b, 'shadowRecess', { x0: -GW / 2 + 0.6, x1: GW / 2 - 0.6, y: 9.6, z: 0, count: 7, w: 0.9, spring: 0.9, h: 1.7 });
    b.pop();
    // jharokha windows either side of the arch
    for (const s of [-1, 1]) {
      b.box('weathered', 2.6, 2.6, 0.9, s * 6.4, 6.3, f * 3.4);
      b.box('trim', 3, 0.2, 1.3, s * 6.4, 8.9, f * 3.5);
      archPanel(b, 'shadowRecess', s * 6.4, 6.6, f * 3.86, 1.4, 1.2, 1.9, {});
    }
  }
  b.box('trim', GW + 0.6, 0.4, 6.6, 0, GH, 0);
  parapet(b, 'weathered', { x0: -GW / 2, x1: GW / 2, y: GH + 0.4, z: 3, t: 0.3, h: 0.7, collide: false });
  parapet(b, 'weathered', { x0: -GW / 2, x1: GW / 2, y: GH + 0.4, z: -3, t: 0.3, h: 0.7, collide: false });
  pinnacleRow(b, 'weathered', { x0: -GW / 2 + 1, x1: GW / 2 - 1, y: GH + 1.1, z: 3, spacing: 2.3, h: 1.6, r: 0.16 });
  for (const s of [-1, 1]) chhatri(b, 'weathered', s * (GW / 2 - 1.4), GH + 0.4, 0, 1.2, { cols: 4 });
  chhatri(b, 'weathered', 0, GH + 0.4, 0, 1.5, { cols: 8 });
  b.pop();
  scene.add(b.build('Akbari Darwaza'));
  (ctx.reserved ||= []).push(rectPoly(AKBARI, 0, 0, GW + 2, 8));
  (ctx.footprints ||= []).push({ p: rectPoly(AKBARI, 0, 0, GW, 6), color: '#8f6f4c' });
}

// Shopfronts, awnings, signboards and string lights on the real lanes around the gate.
// Runs after the city so it can dress the street-front houses that were placed there.
export function dressBazaar(ctx) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  const r = rng(1905);
  const bulbs = [], smokes = (ctx.smokes ||= []);
  let si = 0;
  for (const h of ctx.houses || []) {
    if (!h.shop || !h.side || Math.hypot(h.x - BAZAAR.x, h.z - BAZAAR.z) > BAZAAR.r) continue;
    const width = Math.min(h.w - 0.4, 7);
    b.push(h.x, 0, h.z, h.ang + (h.side > 0 ? Math.PI : 0));
    b.push(0, 0, h.d / 2);
    const lit = r() > 0.2;
    b.box('woodDark', width, 3, 0.08, 0, 0, 0.04);
    b.box(lit ? 'warmGlow' : 'shadowRecess', width - 0.8, 2.7, 0.05, 0, 0.05, 0.09);
    for (const sy of [1.2, 1.9]) {
      b.box('woodDark', width - 1, 0.06, 0.3, 0, sy, 0.25);
      for (let gx = -width / 2 + 0.7; gx < width / 2 - 0.7; gx += 0.4 + r() * 0.2) b.box(CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)], 0.28, 0.2 + r() * 0.35, 0.22, gx, sy + 0.06, 0.25);
    }
    b.box('wood', width - 1, 0.85, 0.8, 0, 0, 0.75, { collide: true });
    const kind = r();
    for (let gx = -width / 2 + 0.8; gx < width / 2 - 0.8; gx += 0.75) {
      const ck = CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)];
      if (kind < 0.55) b.box(ck, 0.55, 0.1 + r() * 0.3, 0.55, gx, 0.85, 0.75);
      else b.cyl(ck, 0.2, 0.26, 0.18 + r() * 0.2, gx, 0.85, 0.75, { seg: 8 });
    }
    const ak = CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)];
    const awn = new THREE.BoxGeometry(width, 0.05, 1.8);
    awn.rotateX(0.3);
    b.geo(ak, awn, 0, 3.05, 0.85);
    const sw = Math.min(width - 0.4, 3.2);
    b.box('woodDark', sw + 0.2, sw / 2 + 0.2, 0.05, 0, 3.55, 0.03);
    b.add('sign', signGeo(si++ % SIGNS.length, sw, sw / 2), new THREE.Matrix4().makeTranslation(0, 3.65 + sw / 4, 0.07));
    if (kind < 0.55) for (let k = 0; k < 3; k++) b.geo(r() > 0.35 ? 'chikan' : ak, new THREE.PlaneGeometry(0.5, 1), -width / 2 + 0.6 + k * 0.6, 2.3, 1.55, { ry: (r() - 0.5) * 0.3 });
    b.pop();
    b.pop();
  }
  // string lights zig-zagging across the lanes
  for (const road of MAP.roads) {
    const p = road.p;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3];
      const L = Math.hypot(bx - ax, bz - az);
      if (Math.hypot((ax + bx) / 2 - BAZAAR.x, (az + bz) / 2 - BAZAAR.z) > BAZAAR.r || road.w > 9) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx, half = road.w / 2 + 1.4;
      for (let s = 3; s < L; s += 6) {
        const x0 = ax + tx * s + nx * half, z0 = az + tz * s + nz * half;
        const x1 = ax + tx * (s + 2.5) - nx * half, z1 = az + tz * (s + 2.5) - nz * half;
        for (let q = 0; q <= 12; q++) {
          const t = q / 12;
          bulbs.push([x0 + (x1 - x0) * t, 5.4 - Math.sin(t * Math.PI) * 0.7, z0 + (z1 - z0) * t]);
        }
      }
    }
  }
  // stalls: galouti kebab by Tunday's, kulhad chai by the gate
  const stall = (x, z, ry, kind) => {
    b.push(x, 0, z, ry);
    b.box('wood', 2.2, 0.9, 1.1, 0, 0, 0, { collide: true });
    if (kind === 'kebab') {
      b.box('ember', 1.2, 0.08, 0.6, 0, 0.9, 0);
      b.cyl('iron', 0.55, 0.5, 0.06, 0, 1.0, 0, { seg: 20 });
      for (let k = 0; k < 7; k++) b.cyl('woodDark', 0.07, 0.07, 0.03, -0.3 + (k % 4) * 0.2, 1.06, -0.12 + Math.floor(k / 4) * 0.24, { seg: 8 });
    } else {
      b.cyl('iron', 0.18, 0.22, 0.4, -0.5, 0.9, 0, { seg: 10 });
      b.box('ember', 0.25, 0.08, 0.25, -0.5, 0.88, 0);
      for (let k = 0; k < 8; k++) b.cyl('stoneRed', 0.045, 0.035, 0.1, 0.1 + (k % 4) * 0.14, 0.9, -0.1 + Math.floor(k / 4) * 0.2, { seg: 6 });
    }
    for (const [px, pz] of [[-1.05, -0.5], [1.05, -0.5], [-1.05, 0.5], [1.05, 0.5]]) b.cyl('wood', 0.04, 0.04, 2.3, px, 0.9, pz, { seg: 5 });
    b.box(kind === 'kebab' ? 'clothRed' : 'clothSaffron', 2.4, 0.05, 1.3, 0, 3.2, 0);
    b.pop();
    smokes.push({ x, y: 1.3, z, type: kind === 'kebab' ? 'smoke' : 'steam' });
  };
  const along = (d, off) => toWorld(AKBARI, off, d);
  stall(...along(52, 3.2), AKBARI.yaw, 'kebab');
  stall(...along(-14, -3.4), AKBARI.yaw, 'chai');
  stall(...along(24, -3.3), AKBARI.yaw, 'chai');
  stall(...along(80, 3), AKBARI.yaw, 'kebab');
  scene.add(b.build('Chowk'));
  (ctx.bulbs ||= []).push(...bulbs);
}
