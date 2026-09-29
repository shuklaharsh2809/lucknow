import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { arcadeWall, archFrame, archPanel, chhatri, nicheRow, parapet, pinnacleRow, onionDome, finial } from '../core/architecture.js';
import { SITES } from '../world/layout.js';

// Husainabad Clock Tower (1881), Satkhanda, the tank and its baradari.
export function buildClockTower(ctx) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  const lamps = (ctx.lamps ||= []);
  const paths = (ctx.paths ||= []);
  const trees = (ctx.trees ||= []);
  const { x, z } = SITES.clockTower;
  const t = SITES.tank;

  // Plaza paving (kept clear of the sunken tank)
  b.box('stone', 95, 0.05, 66, 77.5, 0, -42);
  const tx0 = t.x - t.w / 2, tx1 = t.x + t.w / 2, tz0 = t.z - t.d / 2, tz1 = t.z + t.d / 2;
  b.box('stone', t.w + 8, 0.05, 4, t.x, 0, tz1 + 2);
  b.box('stone', t.w + 8, 0.05, 4, t.x, 0, tz0 - 2);
  b.box('stone', 4, 0.05, t.d, tx0 - 2, 0, t.z);
  b.box('stone', 4, 0.05, t.d, tx1 + 2, 0, t.z);
  // balustrade around the tank, open in the middle of each side where the steps are
  const rail = (ax, az, bx, bz) => {
    const alongX = Math.abs(bz - az) < 0.01;
    const len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    if (alongX) b.box('stoneRed', len, 0.85, 0.3, cx, 0, cz, { collide: true });
    else b.box('stoneRed', 0.3, 0.85, len, cx, 0, cz, { collide: true });
    const n = Math.floor(len / 3);
    for (let i = 0; i <= n; i++) {
      const p = (alongX ? Math.min(ax, bx) : Math.min(az, bz)) + (len * i) / n;
      if (alongX) b.box('trim', 0.45, 1.1, 0.45, p, 0, cz); else b.box('trim', 0.45, 1.1, 0.45, cx, 0, p);
    }
  };
  const gap = 4;
  rail(tx0, tz0, t.x - gap, tz0); rail(t.x + gap, tz0, tx1, tz0);
  rail(tx0, tz1, t.x - gap, tz1); rail(t.x + gap, tz1, tx1, tz1);
  rail(tx0, tz0, tx0, t.z - gap); rail(tx0, t.z + gap, tx0, tz1);
  rail(tx1, tz0, tx1, t.z - gap); rail(tx1, t.z + gap, tx1, tz1);

  // ---- the clock tower ----
  b.push(x, 0, z);
  b.box('stoneRed', 12, 1.2, 12, 0, 0, 0, { collide: true });
  b.box('stoneRed', 13.2, 0.4, 13.2, 0, 0, 0, { collide: true });
  const stage = (w, y0, y1) => {
    b.box('brick', w, y1 - y0, w, 0, y0, 0, { collide: y0 < 3 });
    b.box('trim', w + 0.5, 0.45, w + 0.5, 0, y1 - 0.45, 0);
    b.box('trim', w + 0.3, 0.25, w + 0.3, 0, y0, 0);
    for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      b.cyl('brick', 0.55, 0.62, y1 - y0, (cx * w) / 2, y0, (cz * w) / 2, { seg: 8 });
      b.cyl('trim', 0, 0.62, 1.8, (cx * w) / 2, y1, (cz * w) / 2, { seg: 8 });
    }
  };
  stage(7.6, 1.2, 22);
  stage(6.6, 22, 40);
  stage(7.4, 40, 50.5);
  // tall Gothic lancets and doorways on each face
  for (let i = 0; i < 4; i++) {
    const ry = (i * Math.PI) / 2;
    b.push(0, 0, 0, ry);
    archPanel(b, 'woodDark', 0, 1.2, 3.81, 2.2, 2.8, 4.4);
    archPanel(b, 'trim', 0, 1.1, 3.8, 2.9, 3, 5, { depth: 0.04 });
    nicheRow(b, 'shadowRecess', { x0: -2.4, x1: 2.4, y: 8, z: 3.81, count: 2, w: 0.9, spring: 4.5, h: 6 });
    nicheRow(b, 'shadowRecess', { x0: -2.4, x1: 2.4, y: 15, z: 3.81, count: 2, w: 0.9, spring: 3, h: 4.4 });
    nicheRow(b, 'shadowRecess', { x0: -2.2, x1: 2.2, y: 25, z: 3.31, count: 2, w: 0.85, spring: 5, h: 6.6 });
    nicheRow(b, 'shadowRecess', { x0: -2.2, x1: 2.2, y: 33, z: 3.31, count: 2, w: 0.85, spring: 3.6, h: 5 });
    // clock face surround
    b.add('bronze', new THREE.TorusGeometry(2.45, 0.16, 8, 40), new THREE.Matrix4().makeTranslation(0, 45.2, 3.78));
    b.pop();
  }
  // belfry: open arches on four sides
  for (let i = 0; i < 4; i++) {
    b.push(0, 50.5, 0, (i * Math.PI) / 2);
    arcadeWall(b, 'brick', { width: 6.6, height: 6.5, depth: 0.7, z: 2.95, arches: [{ x: 0, w: 3.4, spring: 3.4, h: 5.6 }], collide: false });
    b.pop();
  }
  b.geo('bronze', new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(0.95, 0.3), new THREE.Vector2(0.7, 1.1), new THREE.Vector2(0.55, 1.6), new THREE.Vector2(0, 1.7),
  ], 16), 0, 52, 0);
  b.box('trim', 7.4, 0.5, 7.4, 0, 57, 0);
  parapet(b, 'trim', { x0: -3.5, x1: 3.5, y: 57.5, z: 3.5, t: 0.3, h: 0.6, collide: false });
  parapet(b, 'trim', { x0: -3.5, x1: 3.5, y: 57.5, z: -3.5, t: 0.3, h: 0.6, collide: false });
  parapet(b, 'trim', { x0: -3.5, x1: 3.5, y: 57.5, z: 3.5, t: 0.3, h: 0.6, alongZ: true, collide: false });
  parapet(b, 'trim', { x0: -3.5, x1: 3.5, y: 57.5, z: -3.5, t: 0.3, h: 0.6, alongZ: true, collide: false });
  // spire
  const spire = new THREE.ConeGeometry(3.3, 7.5, 4, 1);
  spire.rotateY(Math.PI / 4);
  b.geo('iron', spire, 0, 57.5 + 3.75, 0);
  b.cyl('iron', 0.5, 0.7, 1.2, 0, 64.6, 0, { seg: 8 });
  finial(b, 'gold', 0, 65.6, 0, 1.4);
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.cyl('brick', 0.5, 0.5, 3, cx * 3.5, 57.5, cz * 3.5, { seg: 8 });
    b.cyl('iron', 0, 0.6, 2.2, cx * 3.5, 60.5, cz * 3.5, { seg: 8 });
  }
  b.pop();

  // clock faces + hands (animated, so kept out of the merged mesh)
  const clockGroup = new THREE.Group();
  const hands = [];
  const handMat = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Group();
    face.position.set(x, 45.2, z);
    face.rotation.y = (i * Math.PI) / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), M.clockFace);
    disc.position.z = 3.76;
    face.add(disc);
    const mk = (len, w) => {
      const g = new THREE.BoxGeometry(w, len, 0.06);
      g.translate(0, len / 2 - 0.25, 0);
      const m = new THREE.Mesh(g, handMat);
      m.position.z = 3.84;
      face.add(m);
      return m;
    };
    hands.push([mk(1.35, 0.16), mk(2.0, 0.1)]);
    clockGroup.add(face);
  }
  scene.add(clockGroup);

  // ---- Satkhanda, the unfinished seven-storey watchtower ----
  const S = SITES.satkhanda;
  b.push(S.x, 0, S.z);
  b.cyl('plaster', 7.6, 7.8, 1, 0, 0, 0, { seg: 8, collide: true });
  let y = 1, r = 6.4;
  for (let s = 0; s < 4; s++) {
    const h = 6.2 - s * 0.3;
    b.cyl('plaster', r * 0.96, r, h, 0, y, 0, { seg: 8, collide: s === 0 });
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) * Math.PI) / 4;
      const ap = r * Math.cos(Math.PI / 8) * 0.985;
      b.push(Math.sin(a) * ap, y, Math.cos(a) * ap, a);
      archPanel(b, 'trim', 0, 0.9, 0, r * 0.62, h * 0.42, h * 0.78, { depth: 0.05, cusps: 3 });
      archPanel(b, 'shadowRecess', 0, 1.05, 0.04, r * 0.48, h * 0.4, h * 0.7, { depth: 0.05, cusps: 3 });
      b.pop();
    }
    y += h;
    b.cyl('trim', r * 1.08, r * 0.98, 0.45, 0, y, 0, { seg: 8 });
    y += 0.45;
    r *= 0.84;
  }
  b.cyl('plaster', r * 1.05, r * 1.05, 0.9, 0, y, 0, { seg: 8, open: true });
  b.pop();

  // ---- Baradari (the Picture Gallery) on the north side of the tank ----
  b.push(t.x, 0, tz0 - 12);
  b.box('stoneRed', 32, 1, 12, 0, 0, 0, { collide: true });
  b.box('stone', 12, 0.5, 2, 0, 0, 6.6, { collide: true });
  const bArches = [-10, -5, 0, 5, 10].map((ax) => ({ x: ax, w: ax === 0 ? 3.6 : 3.2, spring: 3.4, h: ax === 0 ? 6 : 5.4, cusps: 5 }));
  b.push(0, 1, 0);
  arcadeWall(b, 'plasterPink', { width: 28, height: 8, depth: 1, arches: bArches, z: 4.5 });
  arcadeWall(b, 'plasterPink', { width: 28, height: 8, depth: 1, arches: bArches, z: -4.5 });
  b.box('plasterPink', 1, 8, 8, -13.5, 0, 0, { collide: true });
  b.box('plasterPink', 1, 8, 8, 13.5, 0, 0, { collide: true });
  b.box('recess', 26, 0.03, 8, 0, 0, 0);
  for (const s of [1, -1]) {
    b.push(0, 0, s * 5.01, s > 0 ? 0 : Math.PI);
    for (const a of bArches) archFrame(b, 'trim', a.x, 0, -0.01, a.w, a.spring, a.h, { cusps: 5, band: 0.35 });
    b.pop();
  }
  b.box('trim', 29, 0.5, 10.6, 0, 8, 0, { collide: true });
  parapet(b, 'plasterPink', { x0: -14, x1: 14, y: 8.5, z: 5, t: 0.3, h: 0.8, collide: false });
  parapet(b, 'plasterPink', { x0: -14, x1: 14, y: 8.5, z: -5, t: 0.3, h: 0.8, collide: false });
  pinnacleRow(b, 'plasterPink', { x0: -12, x1: 12, y: 9.3, z: 5, spacing: 3, h: 1.8, r: 0.18 });
  for (const s of [-1, 1]) chhatri(b, 'plasterPink', s * 13.2, 8.5, 0, 1.6, { cols: 8 });
  onionDome(b, 'plasterPink', 0, 8.5, 0, 2, 3, { drum: 1 });
  b.pop();
  b.pop();

  scene.add(b.build('Husainabad'));

  for (let i = 0; i < 6; i++) {
    lamps.push({ x: tx0 - 3, z: tz0 + (t.d * i) / 5 }, { x: tx1 + 3, z: tz0 + (t.d * i) / 5 });
  }
  lamps.push({ x: x - 8, z: z + 8 }, { x: x + 8, z: z + 8 }, { x: x - 8, z: z - 8 }, { x: x + 8, z: z - 8 });
  for (let i = 0; i < 8; i++) trees.push({ x: 36 + i * 4, z: -70 - (i % 2) * 3, type: 'neem', s: 1 });
  trees.push({ x: 120, z: -60, type: 'banyan', s: 1.2 }, { x: 36, z: -20, type: 'neem', s: 1.1 });
  paths.push(
    { a: [40, -10], b: [120, -10], n: 10 },
    { a: [tx0 - 3, tz1 + 3], b: [tx1 + 3, tz1 + 3], n: 7 },
    { a: [x, z + 10], b: [S.x, S.z + 10], n: 4 },
  );
  ctx.footprints.push(
    { x0: x - 6, x1: x + 6, z0: z - 6, z1: z + 6, color: '#8a4a36' },
    { x0: S.x - 7, x1: S.x + 7, z0: S.z - 7, z1: S.z + 7, color: '#a88a62' },
    { x0: t.x - 16, x1: t.x + 16, z0: tz0 - 18, z1: tz0 - 6, color: '#b8826a' },
  );

  return ctx.updatables.push({
    update() {
      const mins = ctx.gameMinutes?.() ?? 0;
      const hA = -((mins / 60) % 12) / 12 * Math.PI * 2;
      const mA = -(mins % 60) / 60 * Math.PI * 2;
      for (const [h, m] of hands) { h.rotation.z = hA; m.rotation.z = mA; }
    },
  });
}
