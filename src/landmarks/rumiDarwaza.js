import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { arcadeWall, archPoints, archPanel, archFrame, chhatri, nicheRow, parapet, finial } from '../core/architecture.js';
import { rectPoly } from '../world/layout.js';

// Rumi Darwaza (1784), modelled from photographs. Local frame: facade in XY, the passage
// along Z, wings along X. Both faces are alike.
export function buildRumiDarwaza(ctx, L) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  b.push(L.x, 0, L.z, L.yaw);

  // plaza of brick paving on both sides
  b.box('brickpave', 96, 0.06, 120, 0, 0, 0);

  // ---- the great pointed frame, crowned with buds ----
  const OW = 24, OS = 11, OH = 19.5; // outer silhouette
  const IW = 14, IS = 9.5, IH = 16.2; // cusped inner opening
  const outer = archPoints(OW, OS, OH, { seg: 30 });
  const inner = archPoints(IW, IS, IH, { cusps: 7, seg: 30 }).reverse();
  const frameShape = new THREE.Shape([...outer, ...inner]);
  for (const fz of [4.5, -4.5]) {
    const g = new THREE.ExtrudeGeometry(frameShape, { depth: 1.5, bevelEnabled: false, curveSegments: 2 });
    g.translate(0, 0, fz - 0.75);
    b.add('plaster', g);
    for (const s of [-1, 1]) b.collide(s > 0 ? IW / 2 : -OW / 2, 0, fz - 0.75, s > 0 ? OW / 2 : -IW / 2, OS, fz + 0.75);
    b.collide(-IW / 2, IH * 0.92, fz - 0.75, IW / 2, OH, fz + 0.75);
    // carved borders: an outer band and a band around the cusped opening
    const face = fz > 0 ? 1 : -1;
    b.push(0, 0, fz + face * 0.76, face > 0 ? 0 : Math.PI);
    archFrame(b, 'trim', 0, 0, 0, OW - 1.6, OS, OH - 0.8, { band: 0.8, depth: 0.08 });
    archFrame(b, 'trim', 0, 0, 0, IW, IS, IH, { cusps: 7, band: 0.9, depth: 0.1 });
    archFrame(b, 'weathered', 0, 0, 0.05, IW + 1.8, IS, IH + 0.9, { band: 1.4, depth: 0.06 });
    b.pop();
    // the crest: a flame-like row of buds bristling from the outline above the springing
    for (let i = 2; i < outer.length - 2; i++) {
      const p = outer[i], q = outer[i + 1];
      if (p.y < OS - 0.5) continue;
      const tx = q.x - p.x, ty = q.y - p.y, l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l, ny = tx / l; // outward normal of the (clockwise) outline
      const cone = new THREE.ConeGeometry(0.28, 1.6, 6);
      cone.translate(0, 0.8, 0);
      const ang = Math.atan2(nx, ny) * -1;
      b.geo('weathered', cone, p.x, p.y, fz, { rz: ang, rx: face * 0.35 });
      b.geo('weathered', new THREE.SphereGeometry(0.34, 8, 6), p.x + nx * 0.25, p.y + ny * 0.25, fz);
    }
  }
  // side piers between the frames
  for (const s of [-1, 1]) b.box('plaster', OW / 2 - IW / 2, OS + 2, 7.5, s * (IW / 2 + (OW / 2 - IW / 2) / 2), 0, 0, { collide: true });

  // ---- the half-octagon recess on each face, with three arches and a semi-dome ----
  const CZ = 1.3; // core faces at z = +/-CZ
  arcadeWall(b, 'plasterDS', { width: 9.4, height: IH, depth: CZ * 2, arches: [{ x: 0, w: 4.4, spring: 4.2, h: 7.6, cusps: 5 }] });
  for (const face of [1, -1]) {
    b.push(0, 0, 0, face > 0 ? 0 : Math.PI);
    // splayed side walls of the recess
    for (const s of [-1, 1]) {
      // run inner->outer on the right, outer->inner on the left so local +Z faces into the recess
      const ax = s > 0 ? 4.7 : -IW / 2, az = s > 0 ? CZ : 3.8, bx = s > 0 ? IW / 2 : -4.7, bz = s > 0 ? 3.8 : CZ;
      const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(-(bz - az), bx - ax);
      b.push((ax + bx) / 2, 0, (az + bz) / 2, ang);
      b.box('plasterDS', len, IH, 0.7, 0, 0, -0.35, { collide: true });
      archPanel(b, 'shadowRecess', 0, 0, 0.01, 2.2, 3.4, 5.6, { cusps: 5, depth: 0.04 });
      archFrame(b, 'trim', 0, 0, 0.02, 2.2, 3.4, 5.6, { cusps: 5, band: 0.35, depth: 0.05 });
      nicheRow(b, 'recess', { x0: -len / 2 + 0.2, x1: len / 2 - 0.2, y: 9, z: 0.02, count: 1, w: 1.5, spring: 1.6, h: 2.6, cusps: 3 });
      b.pop();
    }
    b.push(0, 0, CZ + 0.01);
    archFrame(b, 'trim', 0, 0, 0, 4.4, 4.2, 7.6, { cusps: 5, band: 0.45, depth: 0.06 });
    nicheRow(b, 'recess', { x0: -4.4, x1: 4.4, y: 8.6, z: 0.02, count: 4, w: 1.4, spring: 1.6, h: 2.8, cusps: 3 });
    nicheRow(b, 'shadowRecess', { x0: -4.4, x1: 4.4, y: 9.2, z: 0.05, count: 4, w: 0.45, spring: 0.8, h: 1.2 });
    b.box('trim', 9.4, 0.25, 0.3, 0, 8.2, 0.15);
    b.pop();
    // semi-dome hood
    const hood = new THREE.SphereGeometry(6.6, 28, 12, 0, Math.PI, 0, Math.PI / 2);
    hood.scale(1, 0.62, 0.5);
    b.geo('plasterDS', hood, 0, 12.2, CZ);
    b.pop();
  }
  // roof over the core, hidden behind the crest
  b.box('plaster', IW + 1, 1.2, 7.6, 0, IH - 0.2, 0);

  // ---- slender flanking minarets and the lantern on the apex ----
  for (const s of [-1, 1]) {
    for (const fz of [4.2, -4.2]) {
      const x = s * (OW / 2 + 0.7);
      b.cyl('weathered', 0.85, 1, 20.5, x, 0, fz, { seg: 8, collide: true });
      for (const y of [7, 11.5, 16]) b.cyl('trim', 1.12, 1.12, 0.3, x, y, fz, { seg: 8 });
      b.cyl('weathered', 1.2, 1.05, 0.5, x, 20.5, fz, { seg: 8 });
      chhatri(b, 'weathered', x, 21, fz, 0.9, { cols: 6, h: 1.8 });
    }
  }
  b.cyl('weathered', 1.5, 1.8, 1.4, 0, OH - 0.6, 0, { seg: 8 });
  chhatri(b, 'weathered', 0, OH + 0.8, 0, 1.45, { cols: 8, h: 2.2 });

  // ---- two-storey wings: arcade below, open gallery above, merlons on top ----
  const WX0 = OW / 2 + 1.8, WX1 = 34, WD = 5.2, G = 7, U = 4.6;
  for (const s of [-1, 1]) {
    const len = WX1 - WX0, cx = s * (WX0 + len / 2);
    const n = 6;
    const lower = [], upper = [];
    for (let i = 0; i < n; i++) lower.push({ x: -len / 2 + (len / n) * (i + 0.5), w: 2.7, spring: 3.4, h: 5.6, cusps: 3 });
    for (let i = 0; i < n * 2; i++) upper.push({ x: -len / 2 + (len / (n * 2)) * (i + 0.5), y0: G + 0.6, w: 1.1, spring: 2, h: 3 });
    for (const fz of [WD / 2, -WD / 2]) {
      arcadeWall(b, 'weathered', { width: len, height: G + U, depth: 0.8, arches: [...upper], x: cx, z: fz });
      b.push(cx, 0, fz + (fz > 0 ? 0.41 : -0.41), fz > 0 ? 0 : Math.PI);
      for (const a of lower) {
        archPanel(b, 'shadowRecess', a.x, 0, 0, a.w, a.spring, a.h, { cusps: 3, depth: 0.05 });
        archFrame(b, 'plaster', a.x, 0, 0.01, a.w, a.spring, a.h, { cusps: 3, band: 0.35, depth: 0.06 });
      }
      b.box('trim', len, 0.3, 0.35, 0, G, 0.1);
      b.pop();
    }
    b.box('weathered', len, G, WD - 1.6, cx, 0, 0, { collide: true });
    b.box('recess', len, 0.2, WD, cx, G, 0);
    b.box('weathered', len + 0.4, 0.4, WD + 0.4, cx, G + U, 0, { collide: true });
    for (const fz of [WD / 2, -WD / 2]) parapet(b, 'weathered', { x0: cx - len / 2, x1: cx + len / 2, y: G + U + 0.4, z: fz, t: 0.3, h: 0.5, collide: false });
    // end pavilions
    const px = s * (WX1 + 3);
    b.box('weathered', 6, G + U + 1.6, 7.4, px, 0, 0, { collide: true });
    for (const fz of [3.71, -3.71]) {
      b.push(px, 0, fz, fz > 0 ? 0 : Math.PI);
      archPanel(b, 'shadowRecess', 0, 0, 0, 2.6, 3.4, 5.6, { cusps: 3 });
      archFrame(b, 'plaster', 0, 0, 0.01, 2.6, 3.4, 5.6, { cusps: 3, band: 0.35 });
      nicheRow(b, 'shadowRecess', { x0: -2.4, x1: 2.4, y: G + 0.8, z: 0, count: 3, w: 1, spring: 2, h: 3.2 });
      b.pop();
    }
    b.push(px + s * 3.01, 0, 0, s * Math.PI / 2);
    nicheRow(b, 'shadowRecess', { x0: -3, x1: 3, y: 0, z: 0, count: 2, w: 2.2, spring: 3.2, h: 5.2, cusps: 3 });
    nicheRow(b, 'shadowRecess', { x0: -3, x1: 3, y: G + 0.8, z: 0, count: 3, w: 1, spring: 2, h: 3.2 });
    b.pop();
    b.box('trim', 6.6, 0.35, 8, px, G + U + 1.6, 0);
    parapet(b, 'weathered', { x0: px - 3, x1: px + 3, y: G + U + 1.95, z: 3.6, t: 0.3, h: 0.6, collide: false });
    parapet(b, 'weathered', { x0: px - 3, x1: px + 3, y: G + U + 1.95, z: -3.6, t: 0.3, h: 0.6, collide: false });
    for (const [dx, dz] of [[-2.7, 3.4], [2.7, 3.4], [-2.7, -3.4], [2.7, -3.4]]) {
      b.cyl('weathered', 0.28, 0.32, 1.6, px + dx, G + U + 1.95, dz, { seg: 8 });
      finial(b, 'weathered', px + dx, G + U + 3.5, dz, 0.8);
    }
  }
  b.pop();
  scene.add(b.build('Rumi Darwaza'));
  (ctx.reserved ||= []).push(rectPoly(L, 0, 0, 100, 130));
  (ctx.footprints ||= []).push({ p: rectPoly(L, 0, 0, 80, 7), color: '#8f6f4c' });
}
