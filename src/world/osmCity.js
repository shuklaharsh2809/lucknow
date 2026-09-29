import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder } from '../core/builder.js';
import { rng, glowSpriteTexture } from '../core/textures.js';
import { FACADE_COLORS } from '../core/materials.js';
import DATA from '../data/lucknow.json';

// Old Lucknow from OpenStreetMap: the real streets, river, parks and mapped buildings, with
// the unmapped houses filled in along the real street frontages.
export const MAP = DATA;
export const BOUNDS = DATA.bounds; // x0, z0, x1, z1 (metres, north = -Z)
export const leafUniform = { value: 0 };

const FREE = 0, ROAD = 1, WATER = 2, PARK = 3, SOLID = 4, HOUSE = 5;
const PAVED = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'residential', 'unclassified']);
const FRONTAGE = new Set(['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'unclassified', 'pedestrian', 'primary_link', 'secondary_link', 'tertiary_link']);
const MAIN = new Set(['primary', 'secondary', 'tertiary']);

// ---------- occupancy raster ----------
export class Occupancy {
  constructor(bounds, res = 1.5, pad = 60) {
    this.x0 = bounds[0] - pad; this.z0 = bounds[1] - pad;
    this.res = res;
    this.nx = Math.ceil((bounds[2] - bounds[0] + pad * 2) / res);
    this.nz = Math.ceil((bounds[3] - bounds[1] + pad * 2) / res);
    this.a = new Uint8Array(this.nx * this.nz);
    // coarse grid of road directions, used to orient houses inside the blocks
    this.cr = 6;
    this.cnx = Math.ceil(this.nx * res / this.cr); this.cnz = Math.ceil(this.nz * res / this.cr);
    this.ang = new Float32Array(this.cnx * this.cnz).fill(NaN);
  }
  idx(x, z) {
    const i = Math.floor((x - this.x0) / this.res), j = Math.floor((z - this.z0) / this.res);
    return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : j * this.nx + i;
  }
  get(x, z) { const i = this.idx(x, z); return i < 0 ? SOLID : this.a[i]; }
  fillPolygon(flat, code, onlyOver = null) {
    const n = flat.length / 2;
    let zmin = Infinity, zmax = -Infinity;
    for (let k = 1; k < flat.length; k += 2) { zmin = Math.min(zmin, flat[k]); zmax = Math.max(zmax, flat[k]); }
    const j0 = Math.max(0, Math.floor((zmin - this.z0) / this.res)), j1 = Math.min(this.nz - 1, Math.ceil((zmax - this.z0) / this.res));
    const xs = [];
    for (let j = j0; j <= j1; j++) {
      const z = this.z0 + (j + 0.5) * this.res;
      xs.length = 0;
      for (let k = 0; k < n; k++) {
        const ax = flat[k * 2], az = flat[k * 2 + 1];
        const bx = flat[((k + 1) % n) * 2], bz = flat[((k + 1) % n) * 2 + 1];
        if ((az <= z && bz > z) || (bz <= z && az > z)) xs.push(ax + ((z - az) / (bz - az)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.floor((xs[k] - this.x0) / this.res)), i1 = Math.min(this.nx - 1, Math.floor((xs[k + 1] - this.x0) / this.res));
        for (let i = i0; i <= i1; i++) {
          const id = j * this.nx + i;
          if (onlyOver === null || this.a[id] === onlyOver) this.a[id] = code;
        }
      }
    }
  }
  strokeSegment(ax, az, bx, bz, half, code) {
    const x0 = Math.min(ax, bx) - half, x1 = Math.max(ax, bx) + half, z0 = Math.min(az, bz) - half, z1 = Math.max(az, bz) + half;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const ang = Math.atan2(dz, dx);
    for (let z = z0; z <= z1; z += this.res) for (let x = x0; x <= x1; x += this.res) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const ex = ax + dx * t - x, ez = az + dz * t - z;
      if (ex * ex + ez * ez > half * half) continue;
      const id = this.idx(x, z);
      if (id >= 0) this.a[id] = code;
    }
    // record direction along the segment, spread a little so blocks pick it up
    for (let t = 0; t <= 1; t += this.cr / 2 / Math.sqrt(L2) || 1) {
      const ci = Math.floor((ax + dx * t - this.x0) / this.cr), cj = Math.floor((az + dz * t - this.z0) / this.cr);
      if (ci >= 0 && cj >= 0 && ci < this.cnx && cj < this.cnz) this.ang[cj * this.cnx + ci] = ang;
    }
  }
  nearestAngle(x, z) {
    const ci = Math.floor((x - this.x0) / this.cr), cj = Math.floor((z - this.z0) / this.cr);
    for (let rr = 0; rr < 12; rr++) {
      for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== rr) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.cnx || j >= this.cnz) continue;
        const a = this.ang[j * this.cnx + i];
        if (!Number.isNaN(a)) return a;
      }
    }
    return 0;
  }
  // Is a rotated rectangle entirely on free cells?
  rectFree(cx, cz, w, d, tx, tz, allow = FREE) {
    const nx = -tz, nz = tx;
    for (let u = -w / 2 + 0.3; u <= w / 2 - 0.3; u += this.res * 0.9) for (let v = -d / 2 + 0.3; v <= d / 2 - 0.3; v += this.res * 0.9) {
      const c = this.get(cx + tx * u + nx * v, cz + tz * u + nz * v);
      if (c !== FREE && c !== allow) return false;
    }
    return true;
  }
  markRect(cx, cz, w, d, tx, tz, code) {
    const nx = -tz, nz = tx;
    for (let u = -w / 2; u <= w / 2; u += this.res * 0.7) for (let v = -d / 2; v <= d / 2; v += this.res * 0.7) {
      const id = this.idx(cx + tx * u + nx * v, cz + tz * u + nz * v);
      if (id >= 0) this.a[id] = code;
    }
  }
}

// ---------- geometry helpers ----------
function shapeFromFlat(flat) {
  const pts = [];
  for (let k = 0; k < flat.length; k += 2) pts.push(new THREE.Vector2(flat[k], -flat[k + 1]));
  return new THREE.Shape(pts);
}
function flatGeo(flat, y, holes = []) {
  const sh = shapeFromFlat(flat);
  for (const h of holes) sh.holes.push(new THREE.Path(shapeFromFlat(h).getPoints()));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
function ribbon(flat, half, y) {
  const pos = [], idx = [];
  const n = flat.length / 2;
  const add = (x, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  for (let k = 0; k < n - 1; k++) {
    const ax = flat[k * 2], az = flat[k * 2 + 1], bx = flat[k * 2 + 2], bz = flat[k * 2 + 3];
    const L = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / L * half, nz = (bx - ax) / L * half;
    const a = add(ax + nx, az + nz), b = add(ax - nx, az - nz), c = add(bx + nx, bz + nz), d = add(bx - nx, bz - nz);
    idx.push(a, c, b, b, c, d);
    // round joint
    const cIdx = add(bx, bz);
    const seg = 8;
    let prev = add(bx + half, bz);
    for (let s = 1; s <= seg; s++) {
      const t = (s / seg) * Math.PI * 2;
      const cur = add(bx + Math.cos(t) * half, bz + Math.sin(t) * half);
      idx.push(cIdx, cur, prev);
      prev = cur;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A unit house (1 x 1 footprint, 1 high, base at 0) with a roof parapet rim. The facade
// shader rebuilds UVs from the instance scale, so any size keeps 3 m window bays.
function unitHouse(withRim) {
  // body: four walls and a roof (no hidden floor), 10 triangles
  const P = [], N = [], I = [];
  const quad = (a, b, c, d, n) => {
    const o = P.length / 3;
    P.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) N.push(...n);
    I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  const h = 0.5;
  quad([-h, 0, h], [h, 0, h], [h, 1, h], [-h, 1, h], [0, 0, 1]);
  quad([h, 0, -h], [-h, 0, -h], [-h, 1, -h], [h, 1, -h], [0, 0, -1]);
  quad([h, 0, h], [h, 0, -h], [h, 1, -h], [h, 1, h], [1, 0, 0]);
  quad([-h, 0, -h], [-h, 0, h], [-h, 1, h], [-h, 1, -h], [-1, 0, 0]);
  quad([-h, 1, h], [h, 1, h], [h, 1, -h], [-h, 1, -h], [0, 1, 0]);
  if (withRim) {
    // parapet: outer skin, inner skin and a top, as one ring (24 triangles)
    const t = 0.03, y0 = 1, y1 = 1.09, i = h - t;
    quad([-h, y0, h], [h, y0, h], [h, y1, h], [-h, y1, h], [0, 0, 1]);
    quad([h, y0, -h], [-h, y0, -h], [-h, y1, -h], [h, y1, -h], [0, 0, -1]);
    quad([h, y0, h], [h, y0, -h], [h, y1, -h], [h, y1, h], [1, 0, 0]);
    quad([-h, y0, -h], [-h, y0, h], [-h, y1, h], [-h, y1, -h], [-1, 0, 0]);
    quad([i, y0, i], [-i, y0, i], [-i, y1, i], [i, y1, i], [0, 0, -1]);
    quad([-i, y0, -i], [i, y0, -i], [i, y1, -i], [-i, y1, -i], [0, 0, 1]);
    quad([i, y0, -i], [i, y0, i], [i, y1, i], [i, y1, -i], [-1, 0, 0]);
    quad([-i, y0, i], [-i, y0, -i], [-i, y1, -i], [-i, y1, i], [1, 0, 0]);
    quad([-h, y1, h], [h, y1, h], [i, y1, i], [-i, y1, i], [0, 1, 0]);
    quad([h, y1, -h], [-h, y1, -h], [-i, y1, -i], [i, y1, -i], [0, 1, 0]);
    quad([h, y1, h], [h, y1, -h], [i, y1, -i], [i, y1, i], [0, 1, 0]);
    quad([-h, y1, -h], [-h, y1, h], [-i, y1, i], [-i, y1, -i], [0, 1, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((P.length / 3) * 2), 2));
  g.setIndex(I);
  return g;
}

function facadeMaterial(base) {
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aShop;\nvarying vec3 vFac;\nvarying float vTop;\nvarying float vShop;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec3 sp = position * sc;
        vec3 an = abs(normal);
        vTop = an.y > 0.5 ? 1.0 : 0.0;
        vFac = vec3(an.x > 0.5 ? sp.z : sp.x, sp.y, 0.0) / 3.0;
        vShop = aShop;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFac;\nvarying float vTop;\nvarying float vShop;')
      .replace('#include <map_fragment>', `
        vec2 fuv;
        if (vTop > 0.5) fuv = vec2(0.02 + fract(vFac.x * 0.2) * 0.04, 0.35);
        else {
          bool ground = vFac.y < 1.0;
          fuv = vec2(fract(vFac.x) * 0.5 + ((ground && vShop > 0.5) ? 0.5 : 0.0), fract(vFac.y));
        }
        vec4 sampledDiffuseColor = texture2D(map, fuv);
        diffuseColor *= sampledDiffuseColor;`);
  };
  m.customProgramCacheKey = () => 'facade-v1';
  return m;
}

// ---------- the city ----------
export function buildMapCity(ctx) {
  const { M, physics, scene } = ctx;
  const r = rng(1775);
  const occ = new Occupancy(BOUNDS);
  ctx.occ = occ;
  physics.bounds = [BOUNDS[0] + 5, BOUNDS[1] + 5, BOUNDS[2] - 5, BOUNDS[3] - 5];
  const skipWater = (w) => (ctx.skipWaterNear || []).some(([x, z, rad]) => {
    let sx = 0, sz = 0;
    for (let k = 0; k < w.p.length; k += 2) { sx += w.p[k]; sz += w.p[k + 1]; }
    const n = w.p.length / 2;
    return Math.hypot(sx / n - x, sz / n - z) < rad;
  });
  const waters = DATA.water.filter((w) => !skipWater(w));

  // 1. rasterise: water, parks, reserved monument grounds, mapped buildings, then roads on top
  for (const w of waters) occ.fillPolygon(w.p, WATER);
  for (const p of DATA.parks) occ.fillPolygon(p.p, PARK);
  for (const res of ctx.reserved || []) occ.fillPolygon(res, SOLID);
  for (const b of DATA.buildings) occ.fillPolygon(b.p, SOLID);
  for (const road of DATA.roads) {
    const p = road.p;
    for (let k = 0; k + 3 < p.length; k += 2) occ.strokeSegment(p[k], p[k + 1], p[k + 2], p[k + 3], road.w / 2 + 0.6, ROAD);
  }
  // re-stamp reserved grounds so roads mapped through courtyards don't sprout houses
  for (const res of ctx.reserved || []) occ.fillPolygon(res, SOLID, FREE);
  physics.blockedFn = (x, z) => occ.get(x, z) === WATER;

  // 2. surfaces
  const b = new Builder(M, physics);
  const E = 2600;
  const groundFlat = [-E, -E, E, -E, E, E, -E, E];
  b.add('ground', flatGeo(groundFlat, 0, ctx.groundHoles || []));
  for (const w of waters) b.add('water', flatGeo(w.p, 0.035));
  for (const p of DATA.parks) b.add('grass', flatGeo(p.p, 0.02));
  const ORDER = { primary: 7, primary_link: 6, secondary: 6, secondary_link: 5, tertiary: 5, tertiary_link: 4, residential: 4, unclassified: 4, living_street: 3, pedestrian: 3, service: 2, footway: 1, path: 1, steps: 1 };
  for (const road of DATA.roads) {
    const y = 0.03 + (ORDER[road.k] ?? 1) * 0.004;
    let inBazaar = false;
    if (ctx.bazaar && road.w < 9) for (let k = 0; k < road.p.length && !inBazaar; k += 2) inBazaar = Math.hypot(road.p[k] - ctx.bazaar.x, road.p[k + 1] - ctx.bazaar.z) < ctx.bazaar.r;
    b.add(PAVED.has(road.k) && !inBazaar ? 'road' : 'brickpave', ribbon(road.p, road.w / 2, y));
    if (road.k === 'primary' || road.k === 'secondary') {
      // faded centre-line dashes
      const p = road.p;
      for (let k = 0; k + 3 < p.length; k += 2) {
        const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3];
        const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(-(bz - az), bx - ax);
        for (let s = 2; s < L - 2; s += 9) {
          const t = s / L;
          b.box('trim', 3, 0.01, 0.16, ax + (bx - ax) * t, y + 0.002, az + (bz - az) * t, { ry: ang });
        }
      }
    }
  }
  // mapped (non-monument) buildings: hospitals, colleges, complexes
  const skipB = ctx.skipBuildings || [];
  for (const bd of DATA.buildings) {
    if (bd.m) continue;
    let sx = 0, sz = 0;
    for (let k = 0; k < bd.p.length; k += 2) { sx += bd.p[k]; sz += bd.p[k + 1]; }
    sx /= bd.p.length / 2; sz /= bd.p.length / 2;
    if (skipB.some(([x, z, rad]) => Math.hypot(sx - x, sz - z) < rad)) continue;
    const h = bd.h || (bd.l ? bd.l * 3.2 : 8 + r() * 6);
    const sh = shapeFromFlat(bd.p);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    b.add('houseSolid', g);
    addPolygonCollider(physics, bd.p, h);
  }
  scene.add(b.build('map'));

  // 3. houses along the real street frontages, then inside the blocks
  const houses = [];
  const place = (cx, cz, w, d, tx, tz, shop, side = 0) => {
    if (!occ.rectFree(cx, cz, w, d, tx, tz)) return false;
    occ.markRect(cx, cz, w, d, tx, tz, HOUSE);
    const floors = r() < 0.12 ? 1 : r() < 0.45 ? 2 : r() < 0.8 ? 3 : 4;
    houses.push({ x: cx, z: cz, w, d, h: floors * 3 + (r() - 0.5) * 0.4, ang: Math.atan2(-tz, tx), shop, side });
    return true;
  };
  const bazaar = ctx.bazaar;
  for (const road of DATA.roads) {
    if (!FRONTAGE.has(road.k)) continue;
    const p = road.p, half = road.w / 2 + 0.7;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 4) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
      for (const side of [-1, 1]) {
        let s = r() * 2;
        while (s < L - 3) {
          const w = 4 + r() * 5, d = 8 + r() * 7;
          const cx = ax + tx * (s + w / 2) + nx * side * (half + d / 2);
          const cz = az + tz * (s + w / 2) + nz * side * (half + d / 2);
          const inBazaar = bazaar && Math.hypot(cx - bazaar.x, cz - bazaar.z) < bazaar.r;
          const shop = inBazaar || MAIN.has(road.k) ? 1 : r() < 0.25 ? 1 : 0;
          place(cx, cz, w, d, tx, tz, shop, side);
          s += w + (r() < 0.15 ? 1.5 + r() * 2 : 0.05);
        }
      }
    }
  }
  for (let z = BOUNDS[1]; z < BOUNDS[3]; z += 8.5) for (let x = BOUNDS[0]; x < BOUNDS[2]; x += 8.5) {
    const cx = x + r() * 3, cz = z + r() * 3;
    if (occ.get(cx, cz) !== FREE) continue;
    const a = occ.nearestAngle(cx, cz);
    const w = 6 + r() * 5, d = 6 + r() * 5;
    if (!place(cx, cz, w, d, Math.cos(a), Math.sin(a), 0) && r() < 0.5) {
      place(cx, cz, w * 0.6, d * 0.6, Math.cos(a), Math.sin(a), 0);
    }
  }
  for (const hs of houses) physics.addOBB(hs.x, hs.z, hs.w / 2, hs.d / 2, hs.ang, 0, hs.h);
  ctx.houses = houses;
  scene.add(buildHouseMeshes(M, houses, r));

  // 4. trees: avenues along the main roads, groves in the parks
  const trees = (ctx.trees ||= []);
  for (const road of DATA.roads) {
    if (!MAIN.has(road.k)) continue;
    const p = road.p;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3];
      const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
      for (let s = 8; s < L; s += 20 + r() * 12) for (const side of [-1, 1]) {
        const x = ax + tx * s - tz * side * (road.w / 2 + 1.8), z = az + tz * s + tx * side * (road.w / 2 + 1.8);
        const c = occ.get(x, z);
        if (c === FREE || c === PARK) { trees.push({ x, z, type: r() > 0.25 ? 'neem' : 'ashoka', s: 0.9 + r() * 0.35 }); occ.markRect(x, z, 2, 2, 1, 0, SOLID); }
      }
    }
  }
  for (let i = 0; i < 2500; i++) {
    const x = BOUNDS[0] + r() * (BOUNDS[2] - BOUNDS[0]), z = BOUNDS[1] + r() * (BOUNDS[3] - BOUNDS[1]);
    const c = occ.get(x, z);
    if (bazaar && Math.hypot(x - bazaar.x, z - bazaar.z) < bazaar.r + 20) continue;
    if (c === PARK && r() < 0.5) trees.push({ x, z, type: r() > 0.4 ? 'neem' : r() > 0.5 ? 'banyan' : 'ashoka', s: 0.85 + r() * 0.5 });
    else if (c === FREE && r() < 0.35) trees.push({ x, z, type: r() > 0.3 ? 'neem' : 'banyan', s: 0.8 + r() * 0.4 });
  }
  const treeGroup = buildTrees(trees, r);
  scene.add(treeGroup);
  for (const t of trees) {
    const tr = (t.type === 'banyan' ? 0.9 : t.type === 'neem' ? 0.3 : 0.18) * (t.s ?? 1);
    physics.addBox(t.x - tr, 0, t.z - tr, t.x + tr, 3, t.z + tr);
  }

  // 5. street lamps on the main roads, plus any registered by the landmarks
  const lamps = (ctx.lamps ||= []);
  for (const road of DATA.roads) {
    if (!MAIN.has(road.k)) continue;
    const p = road.p;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3];
      const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
      for (let s = 12; s < L; s += 34) {
        const off = road.w / 2 + 0.8;
        const x = ax + tx * s + tz * off, z = az + tz * s - tx * off;
        if (occ.get(x, z) === HOUSE) continue;
        lamps.push({ x, z, ry: Math.atan2(-tz, tx) + Math.PI / 2 });
      }
    }
  }

  // 6. a far ring of low houses to the haze
  scene.add(buildFarRing(M, r));

  ctx.updatables.push({ update(t) { leafUniform.value = t; M.water.normalMap.offset.set(t * 0.004, t * 0.0025); } });
}

function addPolygonCollider(physics, flat, h) {
  // fit an oriented box along the polygon's longest edge
  let best = 0, ang = 0;
  const n = flat.length / 2;
  for (let k = 0; k < n; k++) {
    const ax = flat[k * 2], az = flat[k * 2 + 1], bx = flat[((k + 1) % n) * 2], bz = flat[((k + 1) % n) * 2 + 1];
    const L = Math.hypot(bx - ax, bz - az);
    if (L > best) { best = L; ang = Math.atan2(bz - az, bx - ax); }
  }
  const tx = Math.cos(ang), tz = Math.sin(ang);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let k = 0; k < n; k++) {
    const x = flat[k * 2], z = flat[k * 2 + 1];
    const u = x * tx + z * tz, v = -x * tz + z * tx;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
  physics.addOBB(uc * tx - vc * tz, uc * tz + vc * tx, (u1 - u0) / 2, (v1 - v0) / 2, Math.atan2(-tz, tx), 0, h);
}

function buildHouseMeshes(M, houses, r) {
  const group = new THREE.Group();
  group.name = 'houses';
  const mat = facadeMaterial(M.facade);
  const CH = 180;
  const chunks = new Map();
  for (const h of houses) {
    const k = `${Math.floor(h.x / CH)},${Math.floor(h.z / CH)}`;
    if (!chunks.has(k)) chunks.set(k, []);
    chunks.get(k).push(h);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  // rooftop water tanks: a cheap open hexagonal drum, chunked with their houses so they cull too
  const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 6, 1, true).translate(0, 0.6, 0);
  const tankLid = new THREE.CircleGeometry(0.7, 6).rotateX(-Math.PI / 2).translate(0, 1.2, 0);
  const tankUnit = mergeGeometries([tankGeo.toNonIndexed(), tankLid.toNonIndexed()]);
  const tankMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 });
  for (const list of chunks.values()) {
    const geo = unitHouse(true);
    const shop = new Float32Array(list.length);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    const tanks = [];
    list.forEach((h, i) => {
      m4.compose(p.set(h.x, 0, h.z), q.setFromAxisAngle(UP, h.ang), s.set(h.w, h.h, h.d));
      mesh.setMatrixAt(i, m4);
      col.set(FACADE_COLORS[Math.floor(r() * FACADE_COLORS.length)]).offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.1);
      mesh.setColorAt(i, col);
      shop[i] = h.shop;
      if (r() < 0.4) tanks.push(new THREE.Matrix4().makeTranslation(h.x + (r() - 0.5) * (h.w - 2), h.h, h.z + (r() - 0.5) * (h.d - 2)));
    });
    const shopAttr = new THREE.InstancedBufferAttribute(shop, 1);
    geo.setAttribute('aShop', shopAttr);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    // far version without the parapet rim (a third of the triangles), sharing the instance data
    const farGeo = unitHouse(false);
    farGeo.setAttribute('aShop', shopAttr);
    const lod = new THREE.InstancedMesh(farGeo, mat, list.length);
    lod.instanceMatrix = mesh.instanceMatrix;
    lod.instanceColor = mesh.instanceColor;
    lod.boundingSphere = mesh.boundingSphere;
    lod.castShadow = lod.receiveShadow = true;
    lod.visible = false;
    mesh.userData.lod = lod;
    group.add(lod);
    if (tanks.length) {
      const tankMesh = new THREE.InstancedMesh(tankUnit, tankMat, tanks.length);
      tanks.forEach((t, i) => tankMesh.setMatrixAt(i, t));
      tankMesh.castShadow = true;
      tankMesh.computeBoundingSphere();
      group.add(tankMesh);
    }
  }
  return group;
}

function buildFarRing(M, r) {
  const list = [];
  for (let x = -2400; x < 2400; x += 22) for (let z = -2400; z < 2400; z += 22) {
    if (x > BOUNDS[0] - 40 && x < BOUNDS[2] + 40 && z > BOUNDS[1] - 40 && z < BOUNDS[3] + 40) continue;
    if (r() > 0.42) continue;
    list.push({ x: x + r() * 8, z: z + r() * 8, w: 7 + r() * 8, d: 7 + r() * 8, h: 3 * (1 + Math.floor(r() * 4)), ang: r() * 0.3 });
  }
  const mesh = new THREE.InstancedMesh(unitHouse(false), facadeMaterial(M.facade), list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  mesh.geometry.setAttribute('aShop', new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1));
  list.forEach((h, i) => {
    mesh.setMatrixAt(i, m4.compose(p.set(h.x, 0, h.z), q.setFromAxisAngle(UP, h.ang), s.set(h.w, h.h, h.d)));
    mesh.setColorAt(i, new THREE.Color(FACADE_COLORS[i % FACADE_COLORS.length]));
  });
  mesh.userData.far = true;
  mesh.computeBoundingSphere();
  return mesh;
}

// ---------- trees ----------
export function buildTrees(list, r) {
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
  leaf.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = leafUniform;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.3 + wp.x * 0.2 + wp.z * 0.13) * 0.06 + sin(uTime * 2.1 + wp.z * 0.3) * 0.03;
      transformed.x += sway * max(0.0, position.y - 2.0);
      transformed.z += sway * 0.6 * max(0.0, position.y - 2.0);
    `);
  };
  const ni = (g) => (g.index ? g.toNonIndexed() : g);
  const blob = (parts) => mergeGeometries(parts.map(([x, y, z, s, sy = s], i) => {
    const g = new THREE.IcosahedronGeometry(1, i === 0 ? 1 : 0);
    g.scale(s, sy, s);
    g.translate(x, y, z);
    return ni(g);
  }));
  const types = {
    neem: {
      trunk: new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6).translate(0, 1.7, 0),
      canopy: blob([[0, 4.6, 0, 2.6, 1.9], [1.5, 4.1, 0.6, 1.7], [-1.3, 4.3, -0.7, 1.8], [0.2, 5.6, -0.3, 1.6]]),
      colors: ['#5d7a2e', '#6c8a34', '#4f6d2a', '#7a8f3a'],
    },
    ashoka: {
      trunk: new THREE.CylinderGeometry(0.12, 0.2, 2, 6).translate(0, 1, 0),
      canopy: blob([[0, 5, 0, 1.25, 4.2], [0, 2.6, 0, 1.05, 1.4]]),
      colors: ['#2f5a24', '#36652a', '#2b4f20'],
    },
    banyan: {
      trunk: mergeGeometries([
        new THREE.CylinderGeometry(0.7, 1.1, 4, 8).translate(0, 2, 0),
        new THREE.CylinderGeometry(0.08, 0.08, 4.5, 4).translate(2.6, 2.25, 0.8),
        new THREE.CylinderGeometry(0.08, 0.08, 4.5, 4).translate(-2.2, 2.25, -1.4),
        new THREE.CylinderGeometry(0.1, 0.1, 4.5, 4).translate(0.8, 2.25, 2.7),
      ].map(ni)),
      canopy: blob([[0, 6, 0, 4.4, 2.4], [3, 5.4, 1, 2.8, 1.8], [-3, 5.6, -1, 3, 1.9], [0.5, 7.2, -1.4, 2.6, 1.6], [-0.8, 5.2, 3, 2.6, 1.6]]),
      colors: ['#44662a', '#3c5c26', '#51722e'],
    },
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  // chunked so far-away groves can be culled
  const CH = 240, buckets = new Map();
  for (const t of list) {
    const k = `${t.type}|${Math.floor(t.x / CH)},${Math.floor(t.z / CH)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(t);
  }
  for (const [key, items] of buckets) {
    const T = types[key.split('|')[0]];
    const trunk = new THREE.InstancedMesh(T.trunk, bark, items.length);
    const canopy = new THREE.InstancedMesh(T.canopy, leaf, items.length);
    items.forEach((t, i) => {
      const sc = t.s ?? 1;
      m4.compose(p.set(t.x, 0, t.z), q.setFromAxisAngle(UP, r() * Math.PI * 2), s.set(sc, sc * (0.9 + r() * 0.2), sc));
      trunk.setMatrixAt(i, m4);
      canopy.setMatrixAt(i, m4);
      canopy.setColorAt(i, new THREE.Color(T.colors[Math.floor(r() * T.colors.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.06));
    });
    for (const m of [trunk, canopy]) { m.castShadow = m.receiveShadow = true; m.computeBoundingSphere(); group.add(m); }
  }
  return group;
}

// ---------- lamps, bulbs, glow ----------
export function buildLights(ctx) {
  const { M, physics } = ctx;
  const group = new THREE.Group();
  const lamps = ctx.lamps || [], bulbs = ctx.bulbs || [];
  const poleGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.06, 0.1, 4.6, 6).translate(0, 2.3, 0).toNonIndexed(),
    new THREE.BoxGeometry(0.06, 0.06, 1).translate(0, 4.5, 0.45).toNonIndexed(),
  ]);
  const lanternGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.45, 6).translate(0, 4.2, 0.9);
  const poles = new THREE.InstancedMesh(poleGeo, M.iron, Math.max(1, lamps.length));
  const lanterns = new THREE.InstancedMesh(lanternGeo, M.lamp, Math.max(1, lamps.length));
  const glows = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  lamps.forEach((l, i) => {
    q.setFromAxisAngle(UP, l.ry ?? 0);
    m4.compose(p.set(l.x, 0, l.z), q, s);
    poles.setMatrixAt(i, m4);
    lanterns.setMatrixAt(i, m4);
    const off = new THREE.Vector3(0, 4.2, 0.9).applyQuaternion(q);
    glows.push(l.x + off.x, off.y, l.z + off.z);
    physics.addBox(l.x - 0.12, 0, l.z - 0.12, l.x + 0.12, 4.6, l.z + 0.12);
  });
  poles.count = lanterns.count = lamps.length;
  poles.castShadow = true;
  for (const m of [poles, lanterns]) { m.computeBoundingSphere(); group.add(m); }
  const bulbMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07, 0), M.lamp, Math.max(1, bulbs.length));
  bulbs.forEach(([x, y, z], i) => bulbMesh.setMatrixAt(i, m4.makeTranslation(x, y, z)));
  bulbMesh.count = bulbs.length;
  bulbMesh.computeBoundingSphere();
  group.add(bulbMesh);
  const halo = (positions, size, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowSpriteTexture(), size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    pts.frustumCulled = false;
    return pts;
  };
  if (glows.length) group.add(halo(glows, 2.2, '#ffb466'));
  if (bulbs.length) group.add(halo(bulbs.flat(), 0.55, '#ffc27a'));
  return group;
}

// Paint the real map for the minimap (called once with the canvas and a world->pixel mapping).
export function paintMap(g, tx, tz, k, ctx) {
  g.fillStyle = '#cdb08a';
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  const poly = (flat, fill) => {
    g.beginPath();
    for (let i = 0; i < flat.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, tx(flat[i]), tz(flat[i + 1]));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  for (const w of DATA.water) poly(w.p, '#6f93a0');
  for (const p of DATA.parks) poly(p.p, '#9db87a');
  g.fillStyle = '#b39472';
  for (const h of ctx.houses || []) {
    g.save();
    g.translate(tx(h.x), tz(h.z));
    g.rotate(-h.ang);
    g.fillRect((-h.w / 2) * k, (-h.d / 2) * k, h.w * k, h.d * k);
    g.restore();
  }
  for (const f of ctx.footprints || []) poly(f.p, f.color);
  g.lineCap = g.lineJoin = 'round';
  for (const road of DATA.roads) {
    g.strokeStyle = PAVED.has(road.k) ? '#5b534b' : '#8d7a66';
    g.lineWidth = Math.max(1.2, road.w * k);
    g.beginPath();
    for (let i = 0; i < road.p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, tx(road.p[i]), tz(road.p[i + 1]));
    g.stroke();
  }
}
