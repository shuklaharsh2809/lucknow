import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import {
  arcadeWall, archFrame, archPanel, archPoints, chhatri, nicheRow, parapet, pinnacle, minaret, onionDome, onionDomeGeo, stairs, fishEmblemGeo,
} from '../core/architecture.js';
import { MAP } from '../world/osmCity.js';
import { toWorld, rectPoly } from '../world/layout.js';

// A grid of calligraphy panels on a facade facing +Z (panels carry their own 0..1 UVs).
function panels(b, x0, x1, y0, y1, z, cols, rows, gap = 0.12) {
  const pw = (x1 - x0) / cols, ph = (y1 - y0) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const g = new THREE.PlaneGeometry(pw - gap, ph - gap);
    b.add('calligraphy', g, new THREE.Matrix4().makeTranslation(x0 + pw * (i + 0.5), y0 + ph * (j + 0.5), z));
  }
}

// Chota Imambara / Imambara Hussainabad Mubarak (1838), at its OpenStreetMap position,
// modelled from photographs. Local frame: origin at the main hall, +Z towards the gate.
export function buildChotaImambara(ctx, L) {
  const { M, physics, scene } = ctx;
  const trees = (ctx.trees ||= []), paths = (ctx.paths ||= []), lamps = (ctx.lamps ||= []), bulbs = (ctx.bulbs ||= []);
  const W = (x, z) => toWorld(L, x, z);

  // boundary walls on the real outline, and paving inside
  const wb = new Builder(M, physics);
  const outline = MAP.areas['Chhota Imambara'];
  const gateW = W(0, 86);
  if (outline) {
    const n = outline.length / 2;
    for (let k = 0; k < n; k++) {
      const ax = outline[k * 2], az = outline[k * 2 + 1], bx = outline[((k + 1) % n) * 2], bz = outline[((k + 1) % n) * 2 + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      const ang = Math.atan2(-(bz - az), bx - ax);
      const steps = Math.ceil(len / 10);
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const mx = ax + (bx - ax) * t, mz = az + (bz - az) * t;
        if (Math.hypot(mx - gateW[0], mz - gateW[1]) < 20) continue;
        const sl = len / steps + 0.3;
        wb.push(mx, 0, mz, ang);
        wb.box('plasterLight', sl, 5.2, 1.1, 0, 0, 0, { collide: true });
        wb.box('trim', sl, 0.25, 1.4, 0, 5.2, 0);
        const g = new THREE.PlaneGeometry(sl, 0.8);
        const uv = g.attributes.uv;
        for (let q = 0; q < uv.count; q++) uv.setX(q, uv.getX(q) * sl / 0.8);
        wb.add('jaliWhite', g, new THREE.Matrix4().makeTranslation(0, 5.85, 0));
        for (const f of [1, -1]) {
          wb.push(0, 0, f * 0.56, f > 0 ? 0 : Math.PI);
          nicheRow(wb, 'recess', { x0: -sl / 2 + 0.3, x1: sl / 2 - 0.3, y: 0.8, z: 0, count: Math.max(1, Math.floor(sl / 3)), w: 1.6, spring: 2.2, h: 3.4, cusps: 3 });
          wb.pop();
        }
        wb.pop();
      }
    }
    const sh = new THREE.Shape();
    for (let k = 0; k < n; k++) (k ? sh.lineTo : sh.moveTo).call(sh, outline[k * 2], -outline[k * 2 + 1]);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.045, 0);
    wb.add('stone', g);
    (ctx.reserved ||= []).push(outline);
  }
  scene.add(wb.build('Chota Imambara walls'));

  const b = new Builder(M, physics);
  b.push(L.x, 0, L.z, L.yaw);

  // ---- garden: the long channel, trimmed conical shrubs, the green iron bridge ----
  const c0 = 17, c1 = 80, clen = c1 - c0, cm = (c0 + c1) / 2, CW = 5;
  for (const s of [-1, 1]) {
    b.box('marble', 0.6, 0.55, clen, s * (CW / 2 + 0.3), 0, cm, { collide: true });
    b.box('grass', 22, 0.1, clen - 6, s * 17, 0, cm);
    for (let z = c0 + 4; z < c1 - 2; z += 4.2) {
      b.cyl('stoneRed', 0.4, 0.3, 0.55, s * 4.6, 0.05, z, { seg: 8 });
      const cone = new THREE.ConeGeometry(0.6, 1.9, 8);
      b.geo('hedge', cone, s * 4.6, 1.55, z);
    }
    for (let z = c0 + 6; z < c1; z += 9) trees.push({ ...xz(W(s * 27, z)), type: 'ashoka', s: 0.95 });
    for (let z = c0 + 4; z < c1; z += 14) lamps.push({ ...xz(W(s * 7.5, z)), ry: L.yaw + (s > 0 ? Math.PI : 0) });
  }
  b.box('shadowRecess', CW, 0.05, clen, 0, 0.05, cm);
  b.box('water', CW, 0.42, clen, 0, 0, cm);
  // green iron footbridge with an arched truss
  b.push(0, 0, 24);
  for (const s of [-1, 1]) {
    const pts = archPoints(CW + 2.6, 0, 1.3, { seg: 20 }).slice(1, -1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      b.geo('greenIron', new THREE.BoxGeometry(len, 0.12, 0.12), (p.x + q.x) / 2, (p.y + q.y) / 2 + 0.3, s * 1.1, { rz: Math.atan2(q.y - p.y, q.x - p.x) });
    }
    b.box('greenIron', CW + 3, 0.08, 0.08, 0, 1.45, s * 1.1);
    for (let x = -CW / 2 - 1; x <= CW / 2 + 1; x += 0.35) b.box('greenIron', 0.04, 1, 0.04, x, 0.5, s * 1.1);
  }
  b.push(0, 0, 0, Math.PI / 2);
  b.box('greenIron', 2.1, 0.12, CW + 3, 0, 0.62, 0, { collide: true });
  b.pop();
  b.pop();

  // ---- the main imambara ----
  const HW = 52, HD = 26, P = 1.6, H1 = 10.5;
  const F = HD / 2;
  b.box('marble', HW + 8, P, HD + 8, 0, 0, 0, { collide: true });
  stairs(b, 'marble', { x: 0, z: F + 4 + 4 * 0.4, width: 34, rise: P / 4, run: 0.4, count: 4 });
  b.push(0, P, 0);
  b.box('marble', HW, H1, HD, 0, 0, 0, { collide: true });
  // central projecting block of five arches; three more each side
  b.box('marble', 26, H1 + 1.5, 2.2, 0, 0, F + 1.1, { collide: true });
  const fz = F + 2.21;
  const ca = [-10, -5, 0, 5, 10].map((x) => ({ x, w: 3.4, spring: 3.8, h: 6.6 }));
  for (const a of ca) {
    archPanel(b, 'shadowRecess', a.x, 0, fz, a.w, a.spring, a.h, { cusps: 7, depth: 0.03 });
    archFrame(b, 'trim', a.x, 0, fz + 0.01, a.w, a.spring, a.h, { cusps: 7, band: 0.3 });
    const pts = archPoints(a.w + 0.4, a.spring, a.h + 0.2, { cusps: 7, seg: 16 });
    for (let k = 1; k < pts.length - 1; k += 2) {
      const [wx, wz] = W(a.x + pts[k].x, fz + 0.2);
      bulbs.push([wx, P + pts[k].y, wz]);
    }
  }
  for (let i = 0; i < ca.length - 1; i++) panels(b, ca[i].x + 1.8, ca[i + 1].x - 1.8, 0.5, 6.8, fz + 0.02, 1, 3);
  panels(b, -12.6, 12.6, 7.4, 11.6, fz + 0.02, 10, 2);
  for (const s of [-1, 1]) {
    for (const x of [14.8, 18.8, 22.8]) {
      archPanel(b, 'shadowRecess', s * x, 0, F + 0.01, 2.8, 3.4, 5.8, { cusps: 5, depth: 0.03 });
      archFrame(b, 'trim', s * x, 0, F + 0.02, 2.8, 3.4, 5.8, { cusps: 5, band: 0.28 });
    }
    panels(b, s > 0 ? 13 : -25, s > 0 ? 25 : -13, 6.6, 10, F + 0.02, 6, 2);
    b.push(s * (HW / 2 + 0.01), 0, 0, s * Math.PI / 2);
    panels(b, -12, 12, 6.6, 10, 0, 8, 2);
    nicheRow(b, 'shadowRecess', { x0: -11, x1: 11, y: 0, z: 0.01, count: 4, w: 2.6, spring: 3.2, h: 5.6, cusps: 5 });
    b.pop();
  }
  // chajja and the lattice parapet crowded with gold-tipped turrets
  b.box('trim', HW + 2, 0.3, HD + 2.4, 0, H1, 0.8);
  const jali = (len, x, z, ry, y) => {
    const g = new THREE.PlaneGeometry(len, 1);
    const uv = g.attributes.uv;
    for (let q = 0; q < uv.count; q++) uv.setX(q, uv.getX(q) * len);
    b.add('jaliWhite', g, new THREE.Matrix4().makeRotationY(ry).setPosition(x, y + 0.5, z));
  };
  jali(HW, 0, F + 0.4, 0, H1 + 0.3);
  jali(HW, 0, -F, 0, H1 + 0.3);
  jali(HD, HW / 2, 0, Math.PI / 2, H1 + 0.3);
  jali(HD, -HW / 2, 0, Math.PI / 2, H1 + 0.3);
  for (let x = -HW / 2; x <= HW / 2 + 0.01; x += 3.25) {
    pinnacle(b, 'marble', x, H1 + 0.3, F + 0.4, 2.8, 0.26, 'gold');
    pinnacle(b, 'marble', x, H1 + 0.3, -F, 2.4, 0.24, 'gold');
  }
  for (let z = -F + 3.25; z < F; z += 3.25) for (const s of [-1, 1]) pinnacle(b, 'marble', s * HW / 2, H1 + 0.3, z, 2.4, 0.24, 'gold');
  // raised central attic with arcade and calligraphy
  b.box('marble', 28, 4.2, 16, 0, H1 + 0.3, -1, { collide: true });
  nicheRow(b, 'shadowRecess', { x0: -13, x1: 13, y: H1 + 0.9, z: 7.01, count: 9, w: 1.4, spring: 1.8, h: 2.8, cusps: 3 });
  panels(b, -14, 14, H1 + 3.7, H1 + 4.5, 7.02, 14, 1);
  b.box('trim', 28.6, 0.3, 16.6, 0, H1 + 4.5, -1);
  for (let x = -14; x <= 14.01; x += 2.8) pinnacle(b, 'marble', x, H1 + 4.8, 7, 2.2, 0.2, 'gold');
  for (const [x, z] of [[-13, 6], [13, 6], [-13, -8], [13, -8]]) {
    b.cyl('marble', 0.7, 0.8, 3, x, H1 + 4.8, z, { seg: 8 });
    onionDome(b, 'copperGold', x, H1 + 7.8, z, 1, 1.7, { finialKey: 'gold' });
  }
  // the gilded ribbed dome on its arcaded drum, with a tall spire
  const DY = H1 + 4.8, DZ = -1;
  b.cyl('marble', 7.2, 7.4, 3.6, 0, DY, DZ, { seg: 24 });
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    b.push(Math.sin(a) * 7.22, DY, DZ + Math.cos(a) * 7.22, a);
    archPanel(b, 'shadowRecess', 0, 0.5, 0, 1.2, 1.5, 2.5, { cusps: 3 });
    b.pop();
  }
  b.cyl('trim', 7.8, 7.8, 0.35, 0, DY + 3.6, DZ, { seg: 24 });
  const dome = onionDomeGeo(7.2, 10.5, { seg: 48, bulge: 1.1 });
  // ribs: scale the dome radially in 24 lobes
  const pos = dome.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + Math.abs(Math.cos(a * 12)) * 0.035;
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  dome.computeVertexNormals();
  b.geo('copperGold', dome, 0, DY + 3.95, DZ);
  const top = DY + 3.95 + 10.3;
  for (let i = 0; i < 5; i++) b.geo('gold', new THREE.SphereGeometry(0.42 - i * 0.05, 10, 8), 0, top + 0.4 + i * 0.75, DZ);
  b.cyl('gold', 0.02, 0.12, 3.2, 0, top + 4, DZ, { seg: 6 });
  b.add('gold', new THREE.TorusGeometry(0.55, 0.07, 6, 16, Math.PI * 1.4), new THREE.Matrix4().makeRotationZ(Math.PI * 0.8).setPosition(0, top + 7.5, DZ));
  for (const s of [-1, 1]) minaret(b, 'marble', s * (HW / 2 + 2.2), 0, F + 1.5, 26, 1.1, { stages: 4, domeKey: 'gold' });
  b.pop();

  // ---- the gateway (Naubat Khana) ----
  b.push(0, 0, 86);
  const gA = [{ x: 0, w: 5.6, spring: 5, h: 9, cusps: 5 }, { x: -8.5, w: 3.4, spring: 3.4, h: 6, cusps: 3 }, { x: 8.5, w: 3.4, spring: 3.4, h: 6, cusps: 3 }];
  arcadeWall(b, 'marble', { width: 32, height: 12, depth: 7, arches: gA });
  const fish = fishEmblemGeo(0.7);
  for (const f of [1, -1]) {
    b.push(0, 0, f * 3.51, f > 0 ? 0 : Math.PI);
    for (const a of gA) archFrame(b, 'trim', a.x, 0, 0, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.4 });
    panels(b, -15, 15, 10, 11.6, 0.03, 12, 1);
    b.geo('gold', fish.clone(), 0, 9.5, 0.04);
    b.pop();
  }
  b.box('trim', 33, 0.4, 8, 0, 12, 0);
  jali(32, 0, 3.6, 0, 12.4);
  jali(32, 0, -3.6, 0, 12.4);
  onionDome(b, 'marble', 0, 12.4, 0, 2.2, 3.4, { drum: 1.2, finialKey: 'gold' });
  for (const s of [-1, 1]) {
    onionDome(b, 'marble', s * 7, 12.4, 0, 1.4, 2.2, { drum: 0.8, finialKey: 'gold' });
    b.cyl('marble', 1.4, 1.7, 14, s * 16.6, 0, 0, { seg: 8, collide: true });
    chhatri(b, 'marble', s * 16.6, 14, 0, 1.3, { cols: 8, domeKey: 'gold' });
  }
  b.pop();

  // ---- the two Taj Mahal replicas: tombs of Zinat Asiya and her husband ----
  for (const s of [-1, 1]) buildMiniTaj(b, s * 42, 46);

  // ---- Husainabad mosque on its high platform, north side ----
  b.push(98, 0, 38, -Math.PI / 2);
  b.box('marble', 44, 4.5, 22, 0, 0, 0, { collide: true });
  stairs(b, 'marble', { x: 0, z: 11 + 14 * 0.42, width: 18, rise: 4.5 / 14, run: 0.42, count: 14 });
  b.push(0, 4.5, 0);
  const mA = [-10, -5, 0, 5, 10].map((x) => ({ x, w: x ? 3.2 : 4.4, spring: 3.6, h: x ? 6.2 : 7.6, cusps: 5 }));
  arcadeWall(b, 'marble', { width: 30, height: 10, depth: 1, arches: mA, z: 3 });
  for (const a of mA) archFrame(b, 'trim', a.x, 0, 3.51, a.w, a.spring, a.h, { cusps: 5, band: 0.3 });
  b.box('marble', 30, 10, 1, 0, 0, -7, { collide: true });
  b.box('marble', 1, 10, 10, -14.5, 0, -2, { collide: true });
  b.box('marble', 1, 10, 10, 14.5, 0, -2, { collide: true });
  b.box('marble', 30.6, 0.6, 11, 0, 10, -2, { collide: true });
  for (const x of [-8, 0, 8]) onionDome(b, 'marble', x, 10.6, -2, x ? 2.4 : 3.2, x ? 3.6 : 4.8, { drum: 1.4, finialKey: 'gold' });
  for (const s of [-1, 1]) minaret(b, 'marble', s * 20, 0, 8, 36, 1.3, { stages: 4, domeKey: 'gold' });
  b.pop();
  b.pop();

  b.pop();
  scene.add(b.build('Chota Imambara'));

  // the Palace of Lights: bulbs along the facade parapet
  for (let x = -HW / 2; x <= HW / 2; x += 1.1) {
    const [wx, wz] = W(x, F + 0.45);
    bulbs.push([wx, P + H1 + 1.4, wz]);
  }

  paths.push(
    { a: W(-6.5, 90), b: W(-6.5, 18), n: 10 },
    { a: W(6.5, 90), b: W(6.5, 18), n: 10 },
    { a: W(-45, 30), b: W(45, 30), n: 6 },
  );
  (ctx.footprints ||= []).push(
    { p: outline || rectPoly(L, 0, 45, 140, 150), color: '#e2d4b8' },
    { p: rectPoly(L, 0, 0, HW, HD), color: '#f2ead8' },
    { p: rectPoly(L, 0, 48, CW, clen), color: '#6f93a0' },
  );
  ctx.skipBuildings = [...(ctx.skipBuildings || []), [L.x, L.z, 32], [...W(98, 38), 30]];
}

const xz = ([x, z]) => ({ x, z });

function buildMiniTaj(b, x, z) {
  b.push(x, 0, z);
  b.box('marble', 13, 1.5, 13, 0, 0, 0, { collide: true });
  b.box('trim', 13.4, 0.2, 13.4, 0, 1.5, 0);
  b.cyl('marble', 5.3, 5.3, 7, 0, 1.5, 0, { seg: 8, ry: Math.PI / 8, collide: true });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, ap = 5.3 * Math.cos(Math.PI / 8) + 0.01;
    b.push(Math.sin(a) * ap, 1.5, Math.cos(a) * ap, a);
    archPanel(b, 'shadowRecess', 0, 0.45, 0.02, 2.6, 2.8, 5, { cusps: 5 });
    archFrame(b, 'trim', 0, 0.45, 0.03, 2.6, 2.8, 5, { cusps: 5, band: 0.35 });
    b.pop();
  }
  b.box('trim', 8.2, 0.3, 8.2, 0, 8.5, 0);
  onionDome(b, 'marble', 0, 8.8, 0, 3, 4.8, { drum: 1.8, finialKey: 'gold' });
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    chhatri(b, 'marble', cx * 3.3, 8.8, cz * 3.3, 0.8, { cols: 8 });
    minaret(b, 'marble', cx * 5.9, 1.5, cz * 5.9, 9.5, 0.42, { stages: 2 });
  }
  b.pop();
}
