import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { rng } from '../core/textures.js';
import {
  arcadeWall, archFrame, archPanel, chhatri, nicheRow, pinnacleRow, pinnacle, parapet, minaret, onionDome, onionDomeGeo,
  fishEmblemGeo, stairs, bandGeo, finial,
} from '../core/architecture.js';
import { MAP } from '../world/osmCity.js';
import { toWorld, rectPoly } from '../world/layout.js';

// Bara Imambara compound (1784), at its real position and orientation (OpenStreetMap), modelled
// from photographs. Local frame: origin at the centre of the great hall, +Z towards the courts.
export function buildBaraImambara(ctx, L) {
  const { M, physics, scene } = ctx;
  const trees = (ctx.trees ||= []), paths = (ctx.paths ||= []), lamps = (ctx.lamps ||= []);
  const W = (x, z) => toWorld(L, x, z);

  // ---- boundary walls along the real compound outline (world space) ----
  const wb = new Builder(M, physics);
  const outline = MAP.areas['Naubatkhana Bada Imambara'];
  const gateA = W(-100, 319), gateB = W(18, 319);
  const nearGateRow = (x, z) => {
    const dx = gateB[0] - gateA[0], dz = gateB[1] - gateA[1], l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - gateA[0]) * dx + (z - gateA[1]) * dz) / l2));
    return Math.hypot(gateA[0] + dx * t - x, gateA[1] + dz * t - z) < 14;
  };
  if (outline) {
    const n = outline.length / 2;
    for (let k = 0; k < n; k++) {
      const ax = outline[k * 2], az = outline[k * 2 + 1], bx = outline[((k + 1) % n) * 2], bz = outline[((k + 1) % n) * 2 + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      const ang = Math.atan2(-(bz - az), bx - ax);
      // split long edges so the gate row and Rumi Darwaza can interrupt them
      const steps = Math.ceil(len / 12);
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps, t1 = (s + 1) / steps;
        const mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        if (nearGateRow(mx, mz) || Math.hypot(mx - ctx.rumi.x, mz - ctx.rumi.z) < 45) continue;
        const sl = len / steps + 0.4;
        wb.push(mx, 0, mz, ang);
        wb.box('weathered', sl, 6.5, 1.3, 0, 0, 0, { collide: true });
        wb.box('trim', sl, 0.3, 1.6, 0, 6.5, 0);
        parapet(wb, 'weathered', { x0: -sl / 2, x1: sl / 2, y: 6.8, z: 0, t: 0.5, h: 0.5, collide: false });
        for (const f of [1, -1]) {
          wb.push(0, 0, f * 0.66, f > 0 ? 0 : Math.PI);
          nicheRow(wb, 'recess', { x0: -sl / 2 + 0.4, x1: sl / 2 - 0.4, y: 1, z: 0, count: Math.max(1, Math.floor(sl / 3.4)), w: 1.9, spring: 2.6, h: 4, cusps: 3 });
          wb.pop();
        }
        wb.pop();
      }
    }
    // paved ground inside the compound
    const sh = new THREE.Shape();
    for (let k = 0; k < n; k++) (k ? sh.lineTo : sh.moveTo).call(sh, outline[k * 2], -outline[k * 2 + 1]);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.045, 0);
    wb.add('stone', g);
    (ctx.reserved ||= []).push(outline);
  }
  scene.add(wb.build('Bara Imambara walls'));

  const b = new Builder(M, physics);
  b.push(L.x, 0, L.z, L.yaw);

  // ---- courts: lawns with hedged paths and potted plants ----
  const lawn = (x0, x1, z0, z1) => {
    b.box('grass', x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2);
    for (const z of [z0, z1]) b.box('hedge', x1 - x0, 0.5, 0.45, (x0 + x1) / 2, 0, z);
    for (const x of [x0, x1]) b.box('hedge', 0.45, 0.5, z1 - z0, x, 0, (z0 + z1) / 2);
  };
  lawn(-58, -5, 32, 96); lawn(5, 60, 32, 96); lawn(-58, -5, 104, 166); lawn(5, 60, 104, 166);
  lawn(-100, -46, 190, 305); lawn(-36, 30, 190, 305);
  for (let z = 36; z < 166; z += 5) for (const x of [-4.2, 4.2]) {
    b.cyl('stoneRed', 0.32, 0.22, 0.55, x, 0.05, z, { seg: 8 });
    b.geo('hedge', new THREE.IcosahedronGeometry(0.38, 0), x, 0.85, z);
  }
  for (let z = 40; z < 166; z += 18) {
    trees.push({ ...xz(W(-60, z)), type: 'ashoka', s: 1 }, { ...xz(W(62, z)), type: 'ashoka', s: 1 });
    lamps.push({ ...xz(W(-6, z)), ry: L.yaw }, { ...xz(W(6, z)), ry: L.yaw + Math.PI });
  }

  // ---- the great hall: three tiers ----
  const HW = 92, HD = 44, P = 1.2, T1 = 9.5, T2 = 5, T3 = 4.4;
  const front = HD / 2;
  b.box('plaster', HW + 6, P, HD + 6, 0, 0, 0, { collide: true });
  stairs(b, 'stone', { x: 0, z: front + 3 + 3 * 0.45, width: 34, rise: P / 3, run: 0.45, count: 3 });
  for (const s of [-1, 1]) stairs(b, 'stone', { x: s * 36, z: front + 3 + 3 * 0.45, width: 14, rise: P / 3, run: 0.45, count: 3 });
  // tier 1: arcade of tall cusped doorways; the central five open into the hall
  const bays = 13, bay = HW / bays;
  const t1 = [];
  for (let i = 0; i < bays; i++) {
    const x = -HW / 2 + bay * (i + 0.5);
    const centre = Math.abs(i - 6) <= 2;
    t1.push({ x, w: centre ? 3.4 : 3.1, spring: 4.6, h: 7.2, cusps: 5, open: centre });
  }
  b.push(0, P, front - 0.8);
  arcadeWall(b, 'plaster', { width: HW, height: T1, depth: 1.6, arches: t1.filter((a) => a.open) });
  b.push(0, 0, 0.81);
  for (const a of t1) {
    if (!a.open) archPanel(b, 'shadowRecess', a.x, 0, -0.02, a.w, a.spring, a.h, { cusps: 5, depth: 0.03 });
    archFrame(b, 'trim', a.x, 0, 0, a.w, a.spring, a.h, { cusps: 5, band: 0.45 });
    archPanel(b, 'recess', a.x - bay / 2 + 0.2, 7.9, 0, 0.5, 0.5, 0.9, { depth: 0.03 });
  }
  b.box('trim', HW, 0.35, 0.4, 0, T1 - 0.4, 0.1);
  b.pop();
  b.pop();
  // central projecting block, the side towers with domed kiosks
  b.box('plaster', 30, T1 + T2, 3, 0, P, front + 1.2, { collide: true });
  b.push(0, P, front + 2.71);
  archPanel(b, 'shadowRecess', 0, 0, 0, 4.6, 5.4, 8.6, { cusps: 7 });
  archFrame(b, 'trim', 0, 0, 0.01, 4.6, 5.4, 8.6, { cusps: 7, band: 0.6 });
  for (const x of [-9, 9]) { archPanel(b, 'shadowRecess', x, 0, 0, 3.1, 4.6, 7.2, { cusps: 5 }); archFrame(b, 'trim', x, 0, 0.01, 3.1, 4.6, 7.2, { cusps: 5, band: 0.45 }); }
  nicheRow(b, 'shadowRecess', { x0: -14, x1: 14, y: T1 + 0.8, z: 0, count: 7, w: 1.3, spring: 1.8, h: 2.9, cusps: 3 });
  b.pop();
  // the hall behind: side and back walls, roof, the unsupported vault inside
  b.box('plaster', HW, T1 + T2, 1.6, 0, P, -front + 0.8, { collide: true });
  b.box('plaster', 1.6, T1 + T2, HD, -HW / 2 + 0.8, P, 0, { collide: true });
  b.box('plaster', 1.6, T1 + T2, HD, HW / 2 - 0.8, P, 0, { collide: true });
  b.box('plaster', HW - 3, T2, 1.4, 0, P + T1, front - 0.7, { collide: true });
  const vault = new THREE.CylinderGeometry(8.2, 8.2, 60, 40, 1, true, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  b.geo('interior', vault, 0, P + 5.2, 4);
  for (const s of [-1, 1]) b.box('interior', 0.6, T1, 17, s * 30, P, 4);
  b.box('stone', 60, 0.02, 16, 0, P, 4);
  for (let i = -2; i <= 2; i++) {
    const rib = new THREE.TorusGeometry(8.1, 0.2, 6, 24, Math.PI);
    rib.rotateY(Math.PI / 2);
    b.geo('trim', rib, i * 12, P + 5.2, 4);
    b.cyl('bronze', 0.02, 0.02, 5.5, i * 12, P + 7.6, 4);
    b.cyl('bronze', 0.9, 0.3, 0.6, i * 12, P + 7, 4, { seg: 10 });
    b.geo('lamp', new THREE.SphereGeometry(0.4, 10, 8), i * 12, P + 6.7, 4);
  }
  // tier 2: arched windows with jharokha kiosks
  b.push(0, P + T1, front - 1.39);
  nicheRow(b, 'shadowRecess', { x0: -HW / 2 + 1, x1: -16, y: 1, z: 0, count: 8, w: 1.2, spring: 1.8, h: 2.8 });
  nicheRow(b, 'shadowRecess', { x0: 16, x1: HW / 2 - 1, y: 1, z: 0, count: 8, w: 1.2, spring: 1.8, h: 2.8 });
  b.pop();
  for (const x of [-26, 26]) {
    b.box('plaster', 4, 3.4, 1.6, x, P + T1 + 0.6, front + 0.8);
    onionDome(b, 'weathered', x, P + T1 + 4, front + 0.8, 1.5, 2.2, { drum: 0.4, finialKey: 'gold' });
  }
  const roof2 = P + T1 + T2;
  b.box('plaster', HW, 0.6, HD, 0, roof2 - 0.6, 0, { collide: true });
  b.box('trim', HW + 0.6, 0.35, HD + 0.6, 0, roof2, 0);
  // tier 3: the open rooftop gallery (Bhool Bhulaiya level), towers and slender pillars
  const galleryArches = [];
  for (let i = 0; i < 30; i++) galleryArches.push({ x: -HW / 2 + 2 + ((HW - 4) / 30) * (i + 0.5), y0: 0.4, w: 1.6, spring: 2.1, h: 3.1, cusps: 3 });
  b.push(0, roof2 + 0.35, front - 2.5);
  arcadeWall(b, 'plaster', { width: HW - 4, height: T3, depth: 0.7, arches: galleryArches, collide: false });
  b.pop();
  b.box('trim', HW - 3.4, 0.3, 1.2, 0, roof2 + 0.35 + T3, front - 2.5);
  // onion-bulb merlons: the signature parapet of the Bara Imambara
  const bulb = onionDomeGeo(0.36, 0.7, { seg: 8 });
  for (let x = -HW / 2 + 2.4; x <= HW / 2 - 2.4; x += 1.6) {
    b.box('plaster', 0.6, 0.4, 0.6, x, roof2 + 0.65 + T3, front - 2.5);
    b.geo('weathered', bulb.clone(), x, roof2 + 1.05 + T3, front - 2.5);
  }
  for (const x of [-HW / 2 + 0.5, HW / 2 - 0.5]) {
    for (let z = -HD / 2 + 2; z < front - 3; z += 1.6) b.geo('weathered', bulb.clone(), x, roof2 + 0.6, z);
    b.box('plaster', 0.5, 0.5, HD, x, roof2 + 0.35, 0);
  }
  for (const x of [-21, 21]) {
    b.box('plaster', 7, T3 + 3.2, 5, x, roof2 + 0.35, front - 2.2);
    nicheRow(b, 'shadowRecess', { x0: x - 3, x1: x + 3, y: roof2 + 1.2, z: front + 0.31, count: 3, w: 1.1, spring: 1.8, h: 2.6 });
    onionDome(b, 'weathered', x, roof2 + T3 + 3.55, front - 2.2, 2.4, 3.4, { drum: 0.6, finialKey: 'gold' });
  }
  for (const x of [-38, -30, -12, -5, 5, 12, 30, 38]) {
    b.cyl('plaster', 0.28, 0.34, 7.5, x, roof2 + 0.35, front - 3.4, { seg: 8 });
    finial(b, 'weathered', x, roof2 + 7.85, front - 3.4, 0.9);
  }
  for (const [x, z] of [[-HW / 2, front], [HW / 2, front], [-HW / 2, -front]]) chhatri(b, 'weathered', x, roof2 + 0.35, z, 2.2, { cols: 8 });
  // stair up to the maze on the east flank (local -X is east here)
  const stepN = 40, rise = (roof2 + 0.0) / stepN, run = 0.45;
  const sx = -HW / 2 - 1.8;
  stairs(b, 'stone', { x: sx, z: front + 1, width: 3.2, rise, run, count: stepN });
  const stairEnd = front + 1 - stepN * run;
  b.box('stone', 3.2, roof2, stairEnd + front - 1, sx, 0, (stairEnd - front + 1) / 2, { collide: true });
  b.box('weathered', 0.9, roof2 + 1.2, front * 2 + 1, sx - 2.05, 0, 0.5, { collide: true });
  b.box('weathered', 4.2, 1.2, 0.4, sx - 0.4, roof2, -front + 0.2, { collide: true });
  b.box('weathered', 3.8, roof2 + 1.2 - 4.4, 0.6, sx, 4.4, front + 0.7);
  archFrame(b, 'trim', sx, 0, front + 1, 3.2, 3.2, 4.4, { cusps: 3, band: 0.3 });
  buildMaze(b, { x0: -HW / 2 + 3, x1: HW / 2 - 3, z0: -front + 2, z1: front - 5, y: roof2, cell: 2.6 });

  // ---- inner gateway: three great arches, twin turrets, the fish of Awadh ----
  b.push(0, 0, 175);
  const GW = 100;
  const inner = [
    { x: 0, w: 7, spring: 6.2, h: 11, cusps: 7 },
    { x: -8.5, w: 4.4, spring: 4.6, h: 7.8, cusps: 5 },
    { x: 8.5, w: 4.4, spring: 4.6, h: 7.8, cusps: 5 },
  ];
  arcadeWall(b, 'plaster', { width: 30, height: 15.5, depth: 11, arches: inner });
  const fish = fishEmblemGeo(0.9);
  for (const f of [1, -1]) {
    b.push(0, 0, f * 5.51, f > 0 ? 0 : Math.PI);
    for (const a of inner) archFrame(b, 'trim', a.x, 0, 0, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.55 });
    b.geo('gold', fish.clone(), 0, 12.3, 0.03);
    nicheRow(b, 'shadowRecess', { x0: -14, x1: -5, y: 10.2, z: 0.02, count: 3, w: 1.2, spring: 1.6, h: 2.6, cusps: 3 });
    nicheRow(b, 'shadowRecess', { x0: 5, x1: 14, y: 10.2, z: 0.02, count: 3, w: 1.2, spring: 1.6, h: 2.6, cusps: 3 });
    b.add('bandGold', bandGeo(30, 0.8, 3.2), new THREE.Matrix4().makeTranslation(0, 14.6, 0.04));
    b.pop();
  }
  b.box('trim', 31, 0.45, 12, 0, 15.5, 0);
  parapet(b, 'plaster', { x0: -15, x1: 15, y: 15.95, z: 5.7, t: 0.35, h: 0.8, collide: false });
  parapet(b, 'plaster', { x0: -15, x1: 15, y: 15.95, z: -5.7, t: 0.35, h: 0.8, collide: false });
  for (let x = -14; x <= 14; x += 1.6) b.geo('weathered', bulb.clone(), x, 16.8, 5.7);
  for (const s of [-1, 1]) {
    minaret(b, 'plaster', s * 16.5, 0, 4.8, 26, 1.25, { stages: 3, domeKey: 'weathered' });
    // wings of the gate building
    const wl = (GW - 34) / 2, wx = s * (17 + wl / 2);
    const wingA = [];
    for (let i = 0; i < 6; i++) wingA.push({ x: -wl / 2 + (wl / 6) * (i + 0.5), w: 3, spring: 3.6, h: 5.8, cusps: 5 });
    b.box('plaster', wl, 10, 9, wx, 0, 0, { collide: true });
    for (const f of [1, -1]) {
      b.push(wx, 0, f * 4.51, f > 0 ? 0 : Math.PI);
      for (const a of wingA) { archPanel(b, 'shadowRecess', a.x, 0, 0, a.w, a.spring, a.h, { cusps: 5, depth: 0.03 }); archFrame(b, 'trim', a.x, 0, 0.01, a.w, a.spring, a.h, { cusps: 5, band: 0.4 }); }
      nicheRow(b, 'recess', { x0: -wl / 2 + 0.5, x1: wl / 2 - 0.5, y: 7, z: 0.02, count: 10, w: 1, spring: 1.3, h: 2.2 });
      b.pop();
    }
    b.box('trim', wl + 0.4, 0.35, 9.6, wx, 10, 0);
    for (let x = -wl / 2 + 1; x <= wl / 2 - 1; x += 1.6) b.geo('weathered', bulb.clone(), wx + x, 10.6, 4.4);
    for (let x = -wl / 2 + 1; x <= wl / 2 - 1; x += 1.6) b.geo('weathered', bulb.clone(), wx + x, 10.6, -4.4);
    b.box('plaster', wl, 0.25, 0.4, wx, 10.35, 4.4);
    b.box('plaster', wl, 0.25, 0.4, wx, 10.35, -4.4);
    chhatri(b, 'weathered', wx, 10.35, 0, 1.6, { cols: 8 });
    chhatri(b, 'weathered', s * (GW / 2 - 1.8), 10.35, 0, 1.8, { cols: 8 });
  }
  b.pop();

  // ---- outer gateway on Azadari Road (the first gate) ----
  b.push(-41, 0, 319);
  const OGW = 118;
  const outerA = [{ x: 0, w: 6, spring: 5.4, h: 9.6, cusps: 5 }, { x: -7.5, w: 3.6, spring: 3.8, h: 6.4, cusps: 3 }, { x: 7.5, w: 3.6, spring: 3.8, h: 6.4, cusps: 3 }];
  arcadeWall(b, 'plaster', { width: 26, height: 12.5, depth: 9, arches: outerA });
  for (const f of [1, -1]) {
    b.push(0, 0, f * 4.51, f > 0 ? 0 : Math.PI);
    for (const a of outerA) archFrame(b, 'trim', a.x, 0, 0, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.5 });
    b.geo('gold', fish.clone(), 0, 10.6, 0.03);
    b.pop();
  }
  b.box('trim', 27, 0.4, 10, 0, 12.5, 0);
  for (let x = -12.5; x <= 12.5; x += 1.6) { b.geo('weathered', bulb.clone(), x, 13.2, 4.5); b.geo('weathered', bulb.clone(), x, 13.2, -4.5); }
  b.box('plaster', 26, 0.3, 0.4, 0, 12.9, 4.5);
  b.box('plaster', 26, 0.3, 0.4, 0, 12.9, -4.5);
  chhatri(b, 'weathered', 0, 12.9, 0, 2, { cols: 8 });
  for (const s of [-1, 1]) {
    b.cyl('plaster', 1.4, 1.6, 15, s * 13.6, 0, 3.6, { seg: 8, collide: true });
    chhatri(b, 'weathered', s * 13.6, 15, 3.6, 1.3, { cols: 8 });
    const wl = (OGW - 28) / 2, wx = s * (14 + wl / 2);
    b.box('weathered', wl, 8, 7, wx, 0, 0, { collide: true });
    b.push(wx, 0, 3.51);
    nicheRow(b, 'shadowRecess', { x0: -wl / 2 + 0.6, x1: wl / 2 - 0.6, y: 0.2, z: 0, count: 12, w: 2.2, spring: 2.8, h: 4.6, cusps: 3 });
    b.pop();
    b.push(wx, 0, -3.51, Math.PI);
    nicheRow(b, 'recess', { x0: -wl / 2 + 0.6, x1: wl / 2 - 0.6, y: 0.2, z: 0, count: 12, w: 2.2, spring: 2.8, h: 4.6, cusps: 3 });
    b.pop();
    b.box('trim', wl + 0.3, 0.3, 7.4, wx, 8, 0);
    parapet(b, 'weathered', { x0: wx - wl / 2, x1: wx + wl / 2, y: 8.3, z: 3.4, t: 0.3, h: 0.6, collide: false });
    pinnacleRow(b, 'weathered', { x0: wx - wl / 2 + 1, x1: wx + wl / 2 - 1, y: 8.9, z: 3.4, spacing: 4.5, h: 1.8, r: 0.18 });
  }
  b.pop();

  // ---- Asfi Mosque on the west side of the great court ----
  b.push(81, 0, 94, -Math.PI / 2);
  const PH = 4.2, MW = 58;
  b.box('plasterLight', MW + 8, PH, 26, 0, 0, -2, { collide: true });
  stairs(b, 'stone', { x: 0, z: 11 + 14 * 0.42, width: 30, rise: PH / 14, run: 0.42, count: 14 });
  nicheRow(b, 'recess', { x0: -MW / 2 - 3, x1: -16, y: 0.6, z: 11.01, count: 5, w: 1.6, spring: 1.6, h: 2.8, cusps: 3 });
  nicheRow(b, 'recess', { x0: 16, x1: MW / 2 + 3, y: 0.6, z: 11.01, count: 5, w: 1.6, spring: 1.6, h: 2.8, cusps: 3 });
  b.push(0, PH, 0);
  const ma = [-20, -12, -4, 4, 12, 20].map((x) => ({ x, w: 4, spring: 4.4, h: 8, cusps: 5 }));
  ma.splice(2, 2, { x: 0, w: 6, spring: 5.6, h: 10, cusps: 7 });
  arcadeWall(b, 'marble', { width: MW - 12, height: 12, depth: 1.2, arches: ma, z: 2 });
  b.push(0, 0, 2.61);
  for (const a of ma) archFrame(b, 'trim', a.x, 0, -0.01, a.w, a.spring, a.h, { cusps: a.cusps, band: 0.4 });
  b.pop();
  b.box('marble', MW - 12, 12, 1, 0, 0, -10, { collide: true });
  b.box('marble', 1, 12, 13, -(MW - 12) / 2 + 0.5, 0, -4, { collide: true });
  b.box('marble', 1, 12, 13, (MW - 12) / 2 - 0.5, 0, -4, { collide: true });
  b.box('recess', MW - 14, 0.05, 12, 0, 0, -4);
  b.box('marble', MW - 11, 0.8, 14, 0, 12, -4, { collide: true });
  parapet(b, 'marble', { x0: -(MW - 12) / 2, x1: (MW - 12) / 2, y: 12.8, z: 2.4, t: 0.35, h: 0.9 });
  pinnacleRow(b, 'marble', { x0: -(MW - 14) / 2, x1: (MW - 14) / 2, y: 13.7, z: 2.4, spacing: 2.8, h: 2, r: 0.18, domeKey: 'weathered' });
  onionDome(b, 'weathered', -12, 12.8, -4, 3.4, 5, { drum: 1.8, drumKey: 'marble' });
  onionDome(b, 'weathered', 0, 12.8, -4, 4.6, 7, { drum: 2.6, drumKey: 'marble' });
  onionDome(b, 'weathered', 12, 12.8, -4, 3.4, 5, { drum: 1.8, drumKey: 'marble' });
  for (const s of [-1, 1]) minaret(b, 'plasterPink', s * (MW / 2 - 1), 0, 2.5, 40, 1.35, { stages: 4, domeKey: 'weathered' });
  b.pop();
  b.pop();

  b.pop();
  scene.add(b.build('Bara Imambara'));

  paths.push(
    { a: W(0, 170), b: W(0, 30), n: 18 },
    { a: W(-50, 100), b: W(55, 100), n: 8 },
    { a: W(-41, 330), b: W(0, 182), n: 12 },
    { a: W(-60, 240), b: W(30, 240), n: 6 },
    { a: W(-HW / 2 - 3, 20), b: W(HW / 2 + 3, 26), n: 8 },
  );
  (ctx.footprints ||= []).push(
    { p: outline || rectPoly(L, 0, 150, 160, 340), color: '#d9c29b' },
    { p: rectPoly(L, 0, 0, HW, HD), color: '#a88a62' },
    { p: rectPoly(L, 0, 175, GW, 10), color: '#a88a62' },
    { p: rectPoly(L, -41, 319, OGW, 8), color: '#a88a62' },
    { p: rectPoly(L, 81, 94, 26, MW + 8), color: '#e6dccb' },
  );
  ctx.skipBuildings = [...(ctx.skipBuildings || []), [...W(-41, 319), 70], [...W(0, 175), 55]];
}

const xz = ([x, z]) => ({ x, z });

// Perfect maze (recursive backtracker) of narrow walled passages, with a few loops.
function buildMaze(b, { x0, x1, z0, z1, y, cell }) {
  const cols = Math.floor((x1 - x0) / cell), rows = Math.floor((z1 - z0) / cell);
  const ox = (x0 + x1) / 2 - (cols * cell) / 2, oz = (z0 + z1) / 2 - (rows * cell) / 2;
  const r = rng(1784);
  const v = Array.from({ length: cols }, () => Array(rows).fill(true));
  const h = Array.from({ length: cols }, () => Array(rows).fill(true));
  const seen = Array.from({ length: cols }, () => Array(rows).fill(false));
  const stack = [[0, rows - 1]];
  seen[0][rows - 1] = true;
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
  for (let i = 0; i < cols * rows * 0.06; i++) {
    const c = Math.floor(r() * (cols - 1)), rr = Math.floor(r() * (rows - 1));
    if (r() > 0.5) v[c][rr] = false; else h[c][rr] = false;
  }
  const WH = 2.7, T = 0.45;
  const seg = (ax, az, bx, bz) => {
    const along = Math.abs(bz - az) < 0.01;
    const len = (along ? Math.abs(bx - ax) : Math.abs(bz - az)) + T;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    if (along) { b.box('plaster', len, WH, T, cx, y, cz, { collide: true }); b.box('trim', len, 0.18, T + 0.16, cx, y + WH, cz); }
    else { b.box('plaster', T, WH, len, cx, y, cz, { collide: true }); b.box('trim', T + 0.16, 0.18, len, cx, y + WH, cz); }
  };
  const X = (c) => ox + c * cell, Z = (rr) => oz + rr * cell;
  // entrance at the stair corner (local -X is east), exit on the far side
  seg(X(0), Z(0), X(cols), Z(0));
  seg(X(0), Z(rows), X(cols), Z(rows));
  seg(X(0), Z(1), X(0), Z(rows));
  seg(X(cols), Z(0), X(cols), Z(rows - 1));
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
    if (v[c][rr] && c < cols - 1) seg(X(c + 1), Z(rr), X(c + 1), Z(rr + 1));
    if (h[c][rr] && rr < rows - 1) seg(X(c), Z(rr + 1), X(c + 1), Z(rr + 1));
  }
}
