import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import {
  arcadeWall, archFrame, archPanel, archPoints, chhatri, nicheRow, parapet, pinnacleRow, pinnacle, minaret, onionDome, stairs, bandGeo, fishEmblemGeo,
} from '../core/architecture.js';

// Chota Imambara / Imambara Hussainabad Mubarak (1838). Local frame: origin at the gate,
// garden and main hall to the north (-Z).
export function buildChotaImambara(ctx, site) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  const trees = (ctx.trees ||= []);
  const paths = (ctx.paths ||= []);
  const lamps = (ctx.lamps ||= []);
  const bulbs = (ctx.bulbs ||= []);
  const W = site.width / 2, D = site.depth;
  const wx = (x) => site.x + x, wz = (z) => site.z + z;

  b.push(site.x, 0, site.z);
  b.box('stone', site.width, 0.05, D, 0, 0, -D / 2);

  // ---- enclosure ----
  const wallH = 5.5;
  const wall = (x0, z0, x1, z1) => {
    const alongX = Math.abs(z1 - z0) < 0.01;
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (alongX) b.box('plasterLight', len, wallH, 1.2, cx, 0, cz, { collide: true });
    else b.box('plasterLight', 1.2, wallH, len, cx, 0, cz, { collide: true });
    if (alongX) parapet(b, 'plasterLight', { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: wallH, z: cz, t: 0.5, h: 0.5, collide: false });
    else parapet(b, 'plasterLight', { x0: Math.min(z0, z1), x1: Math.max(z0, z1), y: wallH, z: cx, t: 0.5, h: 0.5, alongZ: true, collide: false });
    if (alongX) {
      for (const s of [1, -1]) {
        b.push(cx, 0, cz + s * 0.61, s > 0 ? 0 : Math.PI);
        nicheRow(b, 'recess', { x0: -len / 2 + 0.5, x1: len / 2 - 0.5, y: 0.8, z: 0, count: Math.floor(len / 3), w: 1.7, spring: 2.2, h: 3.4, cusps: 3 });
        b.pop();
      }
    } else {
      const s = cx < 0 ? 1 : -1;
      b.push(cx + s * 0.61, 0, cz, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      nicheRow(b, 'recess', { x0: -len / 2 + 0.5, x1: len / 2 - 0.5, y: 0.8, z: 0, count: Math.floor(len / 3), w: 1.7, spring: 2.2, h: 3.4, cusps: 3 });
      b.pop();
    }
  };
  wall(-W, 0, -17.5, 0); wall(17.5, 0, W, 0);
  wall(-W, 0, -W, -D); wall(W, 0, W, -D); wall(-W, -D, W, -D);

  // ---- gateway ----
  const gA = [
    { x: 0, w: 6, spring: 5, h: 9.5, cusps: 5 },
    { x: -9.5, w: 3.6, spring: 3.2, h: 6, cusps: 3 },
    { x: 9.5, w: 3.6, spring: 3.2, h: 6, cusps: 3 },
    { x: -9.5, y0: 7.4, w: 2.4, spring: 1.2, h: 2.4 },
    { x: 9.5, y0: 7.4, w: 2.4, spring: 1.2, h: 2.4 },
  ];
  arcadeWall(b, 'plasterLight', { width: 34, height: 12, depth: 7, arches: gA });
  const fish = fishEmblemGeo(0.7);
  for (const s of [1, -1]) {
    b.push(0, 0, s * 3.51, s > 0 ? 0 : Math.PI);
    for (const a of gA) archFrame(b, 'trim', a.x, a.y0 ?? 0, 0, a.w, a.spring, a.h, { cusps: a.cusps ?? 0, band: 0.4 });
    b.add('band', bandGeo(34, 1, 3), new THREE.Matrix4().makeTranslation(0, 11.1, 0.03));
    b.geo('gold', fish.clone(), 0, 10.1, 0.04);
    b.pop();
  }
  b.box('trim', 35, 0.4, 8, 0, 12, 0);
  parapet(b, 'plasterLight', { x0: -17, x1: 17, y: 12.4, z: 3.6, t: 0.35, h: 0.7, collide: false });
  parapet(b, 'plasterLight', { x0: -17, x1: 17, y: 12.4, z: -3.6, t: 0.35, h: 0.7, collide: false });
  onionDome(b, 'marble', 0, 12.4, 0, 2.2, 3.4, { drum: 1.2 });
  onionDome(b, 'marble', -7, 12.4, 0, 1.4, 2.2, { drum: 0.8 });
  onionDome(b, 'marble', 7, 12.4, 0, 1.4, 2.2, { drum: 0.8 });
  for (const s of [-1, 1]) {
    b.cyl('plasterLight', 1.5, 1.8, 14, s * 17.6, 0, 0, { seg: 8, collide: true });
    chhatri(b, 'plasterLight', s * 17.6, 14, 0, 1.3, { cols: 8, domeKey: 'gold' });
    chhatri(b, 'plasterLight', s * 13, 12.4, 0, 1.1, { domeKey: 'marble' });
  }

  // ---- garden and water channel ----
  const c0 = -18, c1 = -104;
  const clen = c0 - c1, cmid = (c0 + c1) / 2;
  for (const s of [-1, 1]) {
    b.box('marble', 0.55, 0.38, clen, s * 1.85, 0, cmid, { collide: true });
    b.box('grass', 36, 0.1, clen - 4, s * 22.5, 0, cmid);
    b.box('hedge', 36, 0.5, 0.4, s * 22.5, 0, c0 - 2);
    b.box('hedge', 36, 0.5, 0.4, s * 22.5, 0, c1 + 2);
    for (let z = c0 - 6; z > c1 + 4; z -= 7) {
      trees.push({ x: wx(s * 6.5), z: wz(z), type: 'ashoka', s: 0.95 });
      trees.push({ x: wx(s * 41), z: wz(z), type: 'ashoka', s: 1 });
    }
  }
  b.box('marble', 4.25, 0.38, 0.55, 0, 0, c0 + 0.27, { collide: true });
  b.box('marble', 4.25, 0.38, 0.55, 0, 0, c1 - 0.27, { collide: true });
  b.box('shadowRecess', 3.2, 0.05, clen, 0, 0.05, cmid);
  b.box('water', 3.2, 0.26, clen, 0, 0, cmid);
  for (let z = c0 - 8; z > c1; z -= 10) {
    b.cyl('bronze', 0.08, 0.14, 0.6, 0, 0.2, z, { seg: 8 });
    (ctx.fountains ||= []).push({ x: wx(0), y: 0.8, z: wz(z) });
  }
  // octagonal pool mid-garden
  b.cyl('marble', 5.2, 5.2, 0.42, 0, 0, -62, { seg: 8, collide: false });
  b.cyl('water', 4.6, 4.6, 0.45, 0, 0, -62, { seg: 8 });

  // ---- two replicas of the Taj Mahal: tombs of Princess Zinat Asiya and her husband ----
  for (const s of [-1, 1]) buildMiniTaj(b, s * 24, -62);

  // ---- main imambara ----
  const FZ = -108, HD = 22, BZ = FZ - HD, HW = 64, P = 1.5, H = 12;
  b.box('marble', HW + 6, P, HD + 4, 0, 0, FZ - HD / 2, { collide: true });
  stairs(b, 'marble', { x: 0, z: FZ + 2 + 4 * 0.4, width: 30, rise: P / 4, run: 0.4, count: 4 });
  b.push(0, P, 0);
  b.box('marble', HW, H, HD, 0, 0, FZ - HD / 2, { collide: true });
  // glowing arcade: the chandeliers inside show through every arch
  const arches = [];
  for (let i = -3; i <= 3; i++) arches.push({ x: i * 8, w: i === 0 ? 5 : 4, spring: i === 0 ? 4.6 : 4, h: i === 0 ? 8.4 : 7.2 });
  for (const a of arches) {
    archPanel(b, 'trim', a.x, 0, FZ + 0.01, a.w + 1, a.spring + 0.15, a.h + 0.7, { depth: 0.06, cusps: 5 });
    archPanel(b, 'warmGlow', a.x, 0, FZ + 0.07, a.w, a.spring, a.h, { depth: 0.04, cusps: 5 });
    const pts = archPoints(a.w + 0.55, a.spring + 0.1, a.h + 0.4, { cusps: 5, seg: 16 });
    for (let k = 1; k < pts.length - 1; k += 2) bulbs.push([wx(pts[k].x + a.x), P + pts[k].y, wz(FZ + 0.25)]);
  }
  nicheRow(b, 'warmGlow', { x0: -30, x1: 30, y: 9, z: FZ + 0.01, count: 15, w: 1.2, spring: 0.9, h: 1.8 });
  b.add('band', bandGeo(HW, 1.2, 3.4), new THREE.Matrix4().makeTranslation(0, H - 1.1, FZ + 0.02));
  for (const s of [-1, 1]) {
    b.push(s * (HW / 2 + 0.01), 0, FZ - HD / 2, s * Math.PI / 2);
    nicheRow(b, 'recess', { x0: -8, x1: 8, y: 0.8, z: 0, count: 3, w: 2.6, spring: 3, h: 5, cusps: 5 });
    b.pop();
  }
  b.box('trim', HW + 0.8, 0.45, HD + 0.8, 0, H, FZ - HD / 2);
  parapet(b, 'marble', { x0: -HW / 2, x1: HW / 2, y: H + 0.45, z: FZ - 0.2, t: 0.35, h: 0.9, collide: false });
  for (let x = -HW / 2 + 1; x <= HW / 2 - 1; x += 1.25) bulbs.push([wx(x), P + H + 1.5, wz(FZ - 0.2)]);
  // turrets with gilded caps crowding the roofline
  for (let x = -HW / 2 + 2; x <= HW / 2 - 2; x += 4) {
    if (Math.abs(x) < 9) continue;
    pinnacle(b, 'marble', x, H + 0.45, FZ - 0.2, 3.2, 0.3, 'gold');
  }
  // raised central front with its own arch
  b.box('marble', 16, 4.5, 2, 0, H, FZ - 1);
  archPanel(b, 'warmGlow', 0, H + 0.6, FZ + 0.01, 3, 1.8, 3.2, { cusps: 5 });
  b.box('trim', 16.6, 0.35, 2.6, 0, H + 4.5, FZ - 1);
  pinnacleRow(b, 'marble', { x0: -7.8, x1: 7.8, y: H + 4.85, z: FZ - 0.4, spacing: 2.6, h: 2.2, r: 0.2, domeKey: 'gold' });
  // the great gilded dome
  const DZ = FZ - HD / 2;
  b.cyl('marble', 6.4, 6.6, 1, 0, H + 0.45, DZ, { seg: 32 });
  onionDome(b, 'gold', 0, H + 1.45, DZ, 6, 9.5, { drum: 3.2, drumKey: 'marble', seg: 40 });
  for (const [cx, cz] of [[-HW / 2 + 4, FZ - 4], [HW / 2 - 4, FZ - 4], [-HW / 2 + 4, BZ + 4], [HW / 2 - 4, BZ + 4]]) {
    onionDome(b, 'gold', cx, H + 0.45, cz, 1.9, 3, { drum: 1.8, drumKey: 'marble' });
  }
  for (const s of [-1, 1]) minaret(b, 'marble', s * (HW / 2 + 1.6), 0, FZ + 0.4, 30, 1.3, { stages: 4, domeKey: 'gold' });
  b.pop();

  b.pop();
  scene.add(b.build('Chota Imambara'));

  for (let z = -20; z > -104; z -= 12) lamps.push({ x: wx(-5), z: wz(z) }, { x: wx(5), z: wz(z) });
  paths.push(
    { a: [wx(-4), wz(8)], b: [wx(-4), wz(-104)], n: 10 },
    { a: [wx(4), wz(-10)], b: [wx(4), wz(-104)], n: 10 },
    { a: [wx(-40), wz(-106)], b: [wx(40), wz(-106)], n: 8 },
    { a: [wx(-40), wz(-40)], b: [wx(-10), wz(-80)], n: 4 },
    { a: [wx(40), wz(-40)], b: [wx(10), wz(-80)], n: 4 },
  );
  ctx.footprints.push(
    { x0: site.x - W, x1: site.x + W, z0: site.z - D, z1: site.z, color: '#e2d4b8' },
    { x0: site.x - HW / 2, x1: site.x + HW / 2, z0: site.z + BZ, z1: site.z + FZ, color: '#f2ead8' },
    { x0: site.x - 1.6, x1: site.x + 1.6, z0: site.z + c1, z1: site.z + c0, color: '#6f93a0' },
    { x0: site.x - 30, x1: site.x - 18, z0: site.z - 68, z1: site.z - 56, color: '#f2ead8' },
    { x0: site.x + 18, x1: site.x + 30, z0: site.z - 68, z1: site.z - 56, color: '#f2ead8' },
  );
}

function buildMiniTaj(b, x, z) {
  b.push(x, 0, z);
  b.box('marble', 12, 1.4, 12, 0, 0, 0, { collide: true });
  b.box('trim', 12.4, 0.2, 12.4, 0, 1.4, 0);
  b.cyl('marble', 5.3, 5.3, 7, 0, 1.4, 0, { seg: 8, ry: Math.PI / 8, collide: true });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const ap = 5.3 * Math.cos(Math.PI / 8) + 0.01;
    b.push(Math.sin(a) * ap, 1.4, Math.cos(a) * ap, a);
    archPanel(b, 'trim', 0, 0.3, 0, 3.4, 3.2, 5.6, { depth: 0.05 });
    archPanel(b, 'recess', 0, 0.45, 0.05, 2.6, 2.8, 5, { depth: 0.05, cusps: 5 });
    b.pop();
  }
  b.box('trim', 8.2, 0.3, 8.2, 0, 8.4, 0);
  onionDome(b, 'marble', 0, 8.7, 0, 3, 4.8, { drum: 1.8, finialKey: 'gold' });
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    chhatri(b, 'marble', cx * 3.3, 8.7, cz * 3.3, 0.8, { cols: 8 });
    minaret(b, 'marble', cx * 5.4, 1.4, cz * 5.4, 9, 0.42, { stages: 2 });
  }
  b.pop();
}
