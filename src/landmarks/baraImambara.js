import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { rng } from '../core/textures.js';
import {
  arcadeWall, archFrame, chhatri, nicheRow, pinnacleRow, parapet, archPanel, minaret, onionDome, fishEmblemGeo, stairs, bandGeo,
} from '../core/architecture.js';

// Bara Imambara compound (1784). Local frame: origin at the middle of the front wall, the
// compound stretching north (-Z) from Husainabad Road.
export function buildBaraImambara(ctx, site) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  const trees = (ctx.trees ||= []);
  const paths = (ctx.paths ||= []);
  const lamps = (ctx.lamps ||= []);
  const W = site.width / 2, D = site.depth;
  const toWorld = (x, z) => [site.x + x, site.z + z];

  b.push(site.x, 0, site.z);

  // ---- courtyards ----
  b.box('stone', site.width, 0.05, D, 0, 0, -D / 2);
  for (const [x0, x1, z0, z1] of [
    [-W + 5, -6, -5, -40], [6, W - 5, -5, -40],
    [-28, -5, -52, -91], [5, W - 6, -52, -91],
  ]) {
    b.box('grass', x1 - x0, 0.1, z0 - z1, (x0 + x1) / 2, 0, (z0 + z1) / 2);
    b.box('hedge', x1 - x0, 0.45, 0.4, (x0 + x1) / 2, 0, z0 - 0.2);
    b.box('hedge', x1 - x0, 0.45, 0.4, (x0 + x1) / 2, 0, z1 + 0.2);
    for (let z = z0 - 4; z > z1 + 2; z -= 7) {
      trees.push({ x: site.x + x0 + 2, z: site.z + z, type: 'ashoka', s: 0.9 + ((z * 7) % 3) * 0.08 });
      trees.push({ x: site.x + x1 - 2, z: site.z + z, type: 'ashoka', s: 0.95 });
    }
  }

  // ---- perimeter walls ----
  const wallH = 7, wt = 1.5;
  const wall = (x0, z0, x1, z1) => {
    const alongX = Math.abs(z1 - z0) < 0.01;
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (alongX) {
      b.box('plaster', len, wallH, wt, cx, 0, cz, { collide: true });
      b.box('trim', len + 0.2, 0.3, wt + 0.3, cx, wallH, cz);
      parapet(b, 'plaster', { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: wallH + 0.3, z: cz, t: 0.5, h: 0.5, collide: false });
      for (const s of [1, -1]) {
        b.push(cx, 0, cz + s * (wt / 2 + 0.01), s > 0 ? 0 : Math.PI);
        nicheRow(b, 'recess', { x0: -len / 2 + 0.6, x1: len / 2 - 0.6, y: 1, z: 0, count: Math.floor(len / 3.4), w: 1.9, spring: 2.6, h: 4, cusps: 3 });
        b.pop();
      }
    } else {
      b.box('plaster', wt, wallH, len, cx, 0, cz, { collide: true });
      b.box('trim', wt + 0.3, 0.3, len + 0.2, cx, wallH, cz);
      parapet(b, 'plaster', { x0: Math.min(z0, z1), x1: Math.max(z0, z1), y: wallH + 0.3, z: cx, t: 0.5, h: 0.5, alongZ: true, collide: false });
      const s = cx < 0 ? 1 : -1; // decorate the courtyard-facing side
      b.push(cx + s * (wt / 2 + 0.01), 0, cz, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      nicheRow(b, 'recess', { x0: -len / 2 + 0.6, x1: len / 2 - 0.6, y: 1, z: 0, count: Math.floor(len / 3.4), w: 1.9, spring: 2.6, h: 4, cusps: 3 });
      b.pop();
    }
  };
  wall(-W, 0, -15.5, 0); wall(15.5, 0, W, 0);
  wall(-W, -45, -22.5, -45); wall(22.5, -45, W, -45);
  wall(-W, 0, -W, -D); wall(W, 0, W, -D);
  wall(-W, -D, W, -D);

  // ---- outer gateway ----
  const gateArches = [
    { x: 0, w: 6, spring: 5, h: 9.2, cusps: 5 },
    { x: -9, w: 4, spring: 3.6, h: 6.6, cusps: 3 },
    { x: 9, w: 4, spring: 3.6, h: 6.6, cusps: 3 },
  ];
  arcadeWall(b, 'plaster', { width: 30, height: 11, depth: 8, arches: gateArches });
  for (const s of [1, -1]) {
    b.push(0, 0, s * 4.01, s > 0 ? 0 : Math.PI);
    for (const a of gateArches) archFrame(b, 'trim', a.x, 0, 0, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.45 });
    nicheRow(b, 'shadowRecess', { x0: -14, x1: 14, y: 8.3, z: 0.02, count: 7, w: 1.1, spring: 1, h: 1.9 });
    b.pop();
  }
  b.box('trim', 31, 0.4, 9, 0, 11, 0);
  parapet(b, 'plaster', { x0: -15, x1: 15, y: 11.4, z: 4.1, t: 0.4, h: 0.7, collide: false });
  parapet(b, 'plaster', { x0: -15, x1: 15, y: 11.4, z: -4.1, t: 0.4, h: 0.7, collide: false });
  chhatri(b, 'plaster', -8, 11.4, 0, 1.6);
  chhatri(b, 'plaster', 8, 11.4, 0, 1.6);
  chhatri(b, 'plaster', 0, 11.4, 0, 2.1, { cols: 8 });
  for (const s of [-1, 1]) {
    b.cyl('plaster', 1.6, 1.9, 13, s * 15.8, 0, 0, { seg: 8, collide: true });
    chhatri(b, 'plaster', s * 15.8, 13, 0, 1.3, { cols: 8 });
  }

  // ---- inner gateway, with the twin fish of Awadh ----
  b.push(0, 0, -45);
  const innerArches = [
    { x: 0, w: 7, spring: 6, h: 11, cusps: 7 },
    { x: -11, w: 4.4, spring: 4, h: 7.2, cusps: 3 },
    { x: 11, w: 4.4, spring: 4, h: 7.2, cusps: 3 },
    { x: -11, y0: 9, w: 2.8, spring: 1.6, h: 3, cusps: 0 },
    { x: 11, y0: 9, w: 2.8, spring: 1.6, h: 3, cusps: 0 },
  ];
  arcadeWall(b, 'plaster', { width: 44, height: 14, depth: 10, arches: innerArches });
  const fish = fishEmblemGeo(0.9);
  for (const s of [1, -1]) {
    b.push(0, 0, s * 5.01, s > 0 ? 0 : Math.PI);
    archFrame(b, 'trim', 0, 0, 0, 7, 6, 11, { cusps: 7, band: 0.6 });
    b.geo('gold', fish.clone(), 0, 12.1, 0.02);
    for (const x of [-18.5, 18.5]) {
      archPanel(b, 'recess', x, 1, 0, 3, 3, 5, { cusps: 3 });
      archPanel(b, 'recess', x, 8, 0, 2.4, 2, 3.6, { cusps: 3 });
    }
    b.add('bandGold', bandGeo(44, 0.8, 3.2), new THREE.Matrix4().makeTranslation(0, 13.3, 0.03));
    b.pop();
  }
  b.box('trim', 45, 0.5, 11, 0, 14, 0);
  parapet(b, 'plaster', { x0: -22, x1: 22, y: 14.5, z: 5.2, t: 0.4, h: 0.8, collide: false });
  parapet(b, 'plaster', { x0: -22, x1: 22, y: 14.5, z: -5.2, t: 0.4, h: 0.8, collide: false });
  b.box('plaster', 14, 2.8, 6, 0, 14.5, 0);
  b.box('trim', 14.6, 0.35, 6.6, 0, 17.3, 0);
  chhatri(b, 'plaster', 0, 17.65, 0, 2.4, { cols: 8 });
  chhatri(b, 'plaster', -12, 14.5, 0, 1.7);
  chhatri(b, 'plaster', 12, 14.5, 0, 1.7);
  pinnacleRow(b, 'plaster', { x0: -21, x1: -15, y: 15.3, z: 5, spacing: 3 });
  pinnacleRow(b, 'plaster', { x0: 15, x1: 21, y: 15.3, z: 5, spacing: 3 });
  for (const s of [-1, 1]) {
    b.cyl('plaster', 1.8, 2.1, 17, s * 22.6, 0, 0, { seg: 8, collide: true });
    b.cyl('trim', 2.3, 2.3, 0.4, s * 22.6, 17, 0, { seg: 8 });
    chhatri(b, 'plaster', s * 22.6, 17.4, 0, 1.5, { cols: 8 });
  }
  b.pop();

  // ---- main hall ----
  const HZ = -110, HD = 22, HW = 84, P = 1.2, WH = 14;
  const front = HZ + HD / 2, back = HZ - HD / 2;
  b.box('plaster', HW, P, HD + 4, 0, 0, HZ, { collide: true });
  stairs(b, 'stone', { x: 0, z: front + 2 + 1.5, width: 60, rise: 0.4, run: 0.5, count: 3 });
  b.box('stone', HW - 4, 0.02, HD - 3, 0, P, HZ);
  const hallArches = [];
  for (let i = -5; i <= 5; i++) {
    const big = i === 0;
    hallArches.push({ x: i * 7, w: big ? 5.2 : 4.2, spring: big ? 4.6 : 3.8, h: big ? 8.4 : 7, cusps: 5 });
    hallArches.push({ x: i * 7, y0: 8.8, w: 3, spring: 1.9, h: 3.6, cusps: 3 });
  }
  b.push(0, P, front - 0.8);
  arcadeWall(b, 'plaster', { width: HW, height: WH, depth: 1.6, arches: hallArches });
  b.push(0, 0, 0.81);
  for (const a of hallArches) {
    archFrame(b, 'trim', a.x, a.y0 ?? 0, 0, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.4 });
  }
  b.add('bandGold', bandGeo(HW, 0.9, 3.2), new THREE.Matrix4().makeTranslation(0, 13.1, 0.02));
  b.pop();
  b.pop();
  b.box('plaster', HW, WH, 1.6, 0, P, back + 0.8, { collide: true });
  b.box('plaster', 1.6, WH, HD, -HW / 2 + 0.8, P, HZ, { collide: true });
  b.box('plaster', 1.6, WH, HD, HW / 2 - 0.8, P, HZ, { collide: true });
  const roofY = P + WH;
  b.box('plaster', HW, 0.8, HD, 0, roofY, HZ, { collide: true });
  const roofTop = roofY + 0.8;
  b.box('trim', HW + 0.6, 0.35, HD + 0.6, 0, roofY + 0.45, HZ);
  // the great vault
  const vault = new THREE.CylinderGeometry(9.3, 9.3, HW - 3.4, 40, 1, true, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  b.geo('interior', vault, 0, P + 5.4, HZ);
  for (let i = -3; i <= 3; i++) {
    const rib = new THREE.TorusGeometry(9.2, 0.22, 6, 24, Math.PI);
    rib.rotateY(Math.PI / 2);
    b.geo('trim', rib, i * 10.5, P + 5.4, HZ);
    // chandeliers
    b.cyl('bronze', 0.02, 0.02, 6.5, i * 10.5, P + 8.3, HZ);
    b.cyl('bronze', 0.9, 0.3, 0.6, i * 10.5, P + 7.7, HZ, { seg: 10 });
    b.geo('lamp', new THREE.SphereGeometry(0.42, 10, 8), i * 10.5, P + 7.4, HZ);
  }
  // roofline: parapets, pinnacles, chhatris, raised centre
  parapet(b, 'plaster', { x0: -HW / 2, x1: HW / 2, y: roofTop, z: front - 0.2, t: 0.4, h: 1 });
  parapet(b, 'plaster', { x0: -HW / 2, x1: HW / 2, y: roofTop, z: back + 0.2, t: 0.4, h: 1 });
  parapet(b, 'plaster', { x0: back, x1: front, y: roofTop, z: -HW / 2 + 0.2, t: 0.4, h: 1, alongZ: true });
  parapet(b, 'plaster', { x0: front - 18.5, x1: front, y: roofTop, z: HW / 2 - 0.2, t: 0.4, h: 1, alongZ: true });
  pinnacleRow(b, 'plaster', { x0: -40, x1: -17, y: roofTop + 1.35, z: front - 0.2, spacing: 3.3 });
  pinnacleRow(b, 'plaster', { x0: 17, x1: 40, y: roofTop + 1.35, z: front - 0.2, spacing: 3.3 });
  b.push(0, roofTop, front - 1.2);
  b.box('plaster', 30, 4, 2, 0, 0, 0, { collide: true });
  archPanel(b, 'recess', 0, 0.3, 1.01, 5, 2.4, 3.4, { cusps: 5 });
  nicheRow(b, 'recess', { x0: -14, x1: -4, y: 0.6, z: 1.01, count: 3, w: 1.6, spring: 1.4, h: 2.6 });
  nicheRow(b, 'recess', { x0: 4, x1: 14, y: 0.6, z: 1.01, count: 3, w: 1.6, spring: 1.4, h: 2.6 });
  b.box('trim', 30.6, 0.35, 2.4, 0, 4, 0);
  pinnacleRow(b, 'plaster', { x0: -14.5, x1: 14.5, y: 4.35, z: 0.6, spacing: 2.9, h: 2.4 });
  chhatri(b, 'plaster', -15.5, 4.35, 0, 1.7, { cols: 8 });
  chhatri(b, 'plaster', 15.5, 4.35, 0, 1.7, { cols: 8 });
  b.pop();
  for (const [cx, cz] of [[-HW / 2, front], [HW / 2, front], [-HW / 2, back]]) {
    chhatri(b, 'plaster', cx, roofTop, cz, 2, { cols: 4 });
  }
  // wide cusped niches on the flanks
  for (const s of [-1, 1]) {
    b.push(s * (HW / 2 + 0.01), P, HZ, s * Math.PI / 2);
    nicheRow(b, 'recess', { x0: -9, x1: 9, y: 1, z: 0, count: 3, w: 3, spring: 3.4, h: 5.6, cusps: 5 });
    nicheRow(b, 'recess', { x0: -9, x1: 9, y: 8.4, z: 0, count: 3, w: 2.2, spring: 1.8, h: 3.4, cusps: 3 });
    b.pop();
  }

  // ---- staircase up to the Bhool Bhulaiya (east flank) ----
  const stepN = 50, rise = roofTop / stepN, run = 0.42;
  const sx = HW / 2 + 1.7;
  stairs(b, 'stone', { x: sx, z: front + 1, width: 3.2, rise, run, count: stepN });
  const stairEnd = front + 1 - stepN * run;
  // landing flush with the back of the roof, closed by a parapet
  b.box('stone', 3.2, roofTop, stairEnd - back, sx, 0, (stairEnd + back) / 2, { collide: true });
  b.box('plaster', 4.2, 1.2, 0.4, sx + 0.4, roofTop, back + 0.2, { collide: true });
  // outer stair wall
  b.box('plaster', 0.9, roofTop + 1.2, front + 1 - back, HW / 2 + 3.75, 0, (front + 1 + back) / 2, { collide: true });
  b.push(HW / 2 + 4.21, 0, (front + back) / 2, Math.PI / 2);
  nicheRow(b, 'recess', { x0: -11, x1: 11, y: 1.2, z: 0, count: 5, w: 2, spring: 2.6, h: 4.2, cusps: 3 });
  nicheRow(b, 'shadowRecess', { x0: -11, x1: 11, y: 9.5, z: 0, count: 5, w: 1.4, spring: 1.6, h: 3, cusps: 3 });
  b.pop();
  b.box('trim', 1.2, 0.3, front + 1.3 - back, HW / 2 + 3.75, roofTop + 1.2, (front + 1 + back) / 2);
  b.box('plaster', 3.8, roofTop + 1.2 - 4.4, 0.6, sx, 4.4, front + 0.7);
  archFrame(b, 'trim', sx, 0, front + 1, 3.2, 3.2, 4.4, { cusps: 3, band: 0.3 });

  // ---- Bhool Bhulaiya: a labyrinth on the roof ----
  buildMaze(b, { x0: -38.75, x1: 38.75, z0: back + 0.6, z1: front - 2.6, y: roofTop, cell: 2.5 });

  // ---- Asfi Mosque on the west side of the inner court ----
  b.push(-44, 0, -70, Math.PI / 2);
  const PH = 3.52;
  b.box('plasterLight', 32, PH, 18, 0, 0, 0, { collide: true });
  stairs(b, 'stone', { x: 0, z: 9 + 11 * 0.4, width: 20, rise: PH / 11, run: 0.4, count: 11 });
  nicheRow(b, 'recess', { x0: -16, x1: -10, y: 0.5, z: 9.01, count: 2, w: 1.8, spring: 1.4, h: 2.6, cusps: 3 });
  nicheRow(b, 'recess', { x0: 10, x1: 16, y: 0.5, z: 9.01, count: 2, w: 1.8, spring: 1.4, h: 2.6, cusps: 3 });
  b.push(0, PH, 0);
  const mArches = [-10, -5, 0, 5, 10].map((x) => ({ x, w: x === 0 ? 4.6 : 3.5, spring: x === 0 ? 4 : 3.3, h: x === 0 ? 7.4 : 6.1, cusps: 5 }));
  arcadeWall(b, 'plasterLight', { width: 28, height: 9, depth: 1.2, arches: mArches, z: 2 });
  b.push(0, 0, 2.61);
  for (const a of mArches) archFrame(b, 'trim', a.x, 0, -0.01, a.w, a.spring, a.h, { cusps: 5, band: 0.35 });
  b.pop();
  b.box('plasterLight', 28, 9, 1, 0, 0, -8, { collide: true });
  b.box('plasterLight', 1, 9, 10, -13.5, 0, -3, { collide: true });
  b.box('plasterLight', 1, 9, 10, 13.5, 0, -3, { collide: true });
  b.box('recess', 26, 0.05, 9, 0, 0, -3);
  b.box('plasterLight', 28.4, 0.8, 11, 0, 9, -3, { collide: true });
  parapet(b, 'plasterLight', { x0: -14, x1: 14, y: 9.8, z: 2.4, t: 0.35, h: 0.8 });
  pinnacleRow(b, 'plasterLight', { x0: -12.5, x1: 12.5, y: 10.6, z: 2.4, spacing: 2.5, h: 1.8, r: 0.18 });
  onionDome(b, 'plasterLight', -8.2, 9.8, -3, 2.5, 3.8, { drum: 1.4 });
  onionDome(b, 'plasterLight', 0, 9.8, -3, 3.4, 5.2, { drum: 2 });
  onionDome(b, 'plasterLight', 8.2, 9.8, -3, 2.5, 3.8, { drum: 1.4 });
  minaret(b, 'plasterLight', -15, 0, 3, 27, 1.15, { stages: 3 });
  minaret(b, 'plasterLight', 15, 0, 3, 27, 1.15, { stages: 3 });
  b.pop();
  b.pop();

  b.pop();
  scene.add(b.build('Bara Imambara'));

  // lamps along the central path, people strolling the courts
  for (let z = -8; z > -92; z -= 12) {
    if (z < -38 && z > -52) continue;
    lamps.push({ x: site.x - 5, z: site.z + z }, { x: site.x + 5, z: site.z + z });
  }
  paths.push(
    { a: toWorld(0, 12), b: toWorld(0, -93), n: 16 },
    { a: toWorld(-40, -20), b: toWorld(40, -20), n: 8 },
    { a: toWorld(-25, -94), b: toWorld(35, -94), n: 8 },
    { a: toWorld(-28, -70), b: toWorld(20, -70), n: 5 },
    // on the roof, lost in the maze edge
    { a: toWorld(41, -98), b: toWorld(41, -120), n: 2, y: 16 },
  );
  ctx.footprints.push(
    { x0: site.x - W, x1: site.x + W, z0: site.z - D, z1: site.z, color: '#d9c29b' },
    { x0: site.x - HW / 2, x1: site.x + HW / 2, z0: site.z + back, z1: site.z + front, color: '#a88a62' },
    { x0: site.x - 15, x1: site.x + 15, z0: site.z - 4, z1: site.z + 4, color: '#a88a62' },
    { x0: site.x - 22, x1: site.x + 22, z0: site.z - 50, z1: site.z - 40, color: '#a88a62' },
    { x0: site.x - 53, x1: site.x - 35, z0: site.z - 86, z1: site.z - 54, color: '#b8a07a' },
  );
}

// Perfect maze (recursive backtracker) of narrow walled passages.
function buildMaze(b, { x0, x1, z0, z1, y, cell }) {
  const cols = Math.floor((x1 - x0) / cell), rows = Math.floor((z1 - z0) / cell);
  const ox = (x0 + x1) / 2 - (cols * cell) / 2, oz = (z0 + z1) / 2 - (rows * cell) / 2;
  const r = rng(1784);
  // walls: v[c][r] = wall on the east side of cell (c, r); h[c][r] = wall on its south side
  const v = Array.from({ length: cols }, () => Array(rows).fill(true));
  const h = Array.from({ length: cols }, () => Array(rows).fill(true));
  const seen = Array.from({ length: cols }, () => Array(rows).fill(false));
  const stack = [[cols - 1, rows - 1]];
  seen[cols - 1][rows - 1] = true;
  while (stack.length) {
    const [c, rr] = stack[stack.length - 1];
    const nb = [[c + 1, rr], [c - 1, rr], [c, rr + 1], [c, rr - 1]].filter(([a, bb]) => a >= 0 && bb >= 0 && a < cols && bb < rows && !seen[a][bb]);
    if (!nb.length) { stack.pop(); continue; }
    const [nc, nr] = nb[Math.floor(r() * nb.length)];
    if (nc > c) v[c][rr] = false; else if (nc < c) v[nc][rr] = false;
    else if (nr > rr) h[c][rr] = false; else h[c][nr] = false;
    seen[nc][nr] = true;
    stack.push([nc, nr]);
  }
  // a few loops so it feels like the real thing: many ways, most of them wrong
  for (let i = 0; i < cols * rows * 0.06; i++) {
    const c = Math.floor(r() * (cols - 1)), rr = Math.floor(r() * (rows - 1));
    if (r() > 0.5) v[c][rr] = false; else h[c][rr] = false;
  }
  const WH = 2.7, T = 0.45;
  const seg = (ax, az, bx, bz) => {
    const along = Math.abs(bz - az) < 0.01;
    const len = (along ? Math.abs(bx - ax) : Math.abs(bz - az)) + T;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    if (along) {
      b.box('plaster', len, WH, T, cx, y, cz, { collide: true });
      b.box('trim', len, 0.18, T + 0.16, cx, y + WH, cz);
    } else {
      b.box('plaster', T, WH, len, cx, y, cz, { collide: true });
      b.box('trim', T + 0.16, 0.18, len, cx, y + WH, cz);
    }
  };
  const X = (c) => ox + c * cell, Z = (rr) => oz + rr * cell;
  // outer boundary, with an entrance on the east (by the stairs) and an exit on the west
  seg(X(0), Z(0), X(cols), Z(0));
  seg(X(0), Z(rows), X(cols), Z(rows));
  seg(X(0), Z(1), X(0), Z(rows));
  seg(X(cols), Z(0), X(cols), Z(rows - 1));
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
    if (v[c][rr] && c < cols - 1) seg(X(c + 1), Z(rr), X(c + 1), Z(rr + 1));
    if (h[c][rr] && rr < rows - 1) seg(X(c), Z(rr + 1), X(c + 1), Z(rr + 1));
  }
}
