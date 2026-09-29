import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import { arcadeWall, archPoints, chhatri, nicheRow, pinnacleRow, parapet, archPanel, pinnacle } from '../core/architecture.js';

// Rumi Darwaza (1784). Built in local space with the facade in XY and the passage along Z,
// then turned so Husainabad Road runs straight through it.
export function buildRumiDarwaza(M, physics, { x, z }) {
  const b = new Builder(M, physics);
  b.push(x, 0, z, Math.PI / 2);

  const W = 20, H = 17, FD = 1.5;
  const big = { x: 0, w: 13, spring: 7, h: 16, cusps: 7 };
  // The two great cusped frames, front and back
  for (const fz of [3.75, -3.75]) {
    arcadeWall(b, 'plaster', { width: W, height: H, depth: FD, arches: [big], z: fz });
  }
  // Recessed core with the actual passage
  arcadeWall(b, 'plasterDS', { width: 13, height: H, depth: 3, arches: [{ x: 0, w: 8, spring: 6, h: 11 }] });
  // Fill between frame piers
  for (const s of [-1, 1]) b.box('plaster', 3.5, H, 6, s * 8.25, 0, 0, { collide: true });
  // Half-domed hoods over each recess (the "Turkish gate" look)
  for (const s of [1, -1]) {
    const hood = new THREE.SphereGeometry(6.4, 28, 12, 0, Math.PI, 0, Math.PI / 2);
    hood.scale(1, 1, 0.5);
    if (s < 0) hood.rotateY(Math.PI);
    b.geo('plasterDS', hood, 0, 9.4, s * 1.5);
    // arched openings high in the recess
    b.push(0, 0, s * 1.52, s > 0 ? 0 : Math.PI);
    nicheRow(b, 'shadowRecess', { x0: -4.5, x1: 4.5, y: 11.6, z: 0, count: 3, w: 1.6, spring: 1.4, h: 2.6 });
    b.pop();
  }

  // Flower buds studding the great arch outline
  const outline = archPoints(big.w, big.spring, big.h, { cusps: big.cusps, seg: 28 });
  const bud = new THREE.SphereGeometry(0.32, 8, 6);
  bud.scale(1, 1.5, 1);
  for (const s of [1, -1]) {
    for (let i = 2; i < outline.length - 2; i += 2) {
      const p = outline[i];
      const nx = p.x * 1.07, ny = p.y + (p.y > big.spring ? 0.55 : 0);
      b.geo('trim', bud.clone(), nx + (p.x > 0 ? 0.5 : -0.5), ny, s * (3.75 + FD / 2 + 0.2));
    }
    // blind niches on the piers
    b.push(0, 0, s * (3.75 + FD / 2), s > 0 ? 0 : Math.PI);
    for (const px of [-8.25, 8.25]) {
      archPanel(b, 'recess', px, 1.2, 0, 2, 2.2, 3.6, { cusps: 3 });
      archPanel(b, 'recess', px, 6.2, 0, 1.8, 2.0, 3.2, { cusps: 3 });
      archPanel(b, 'recess', px, 11, 0, 1.6, 1.6, 2.8);
    }
    b.pop();
  }

  // Crown: parapet, pinnacles, octagonal lantern pavilion
  b.box('trim', W + 0.6, 0.5, 9.2, 0, H, 0);
  pinnacleRow(b, 'plaster', { x0: -9.6, x1: 9.6, y: H + 0.5, z: 4.3, spacing: 2.4, h: 2.4, r: 0.22 });
  pinnacleRow(b, 'plaster', { x0: -9.6, x1: 9.6, y: H + 0.5, z: -4.3, spacing: 2.4, h: 2.4, r: 0.22 });
  b.cyl('plaster', 3.1, 3.4, 1.6, 0, H + 0.5, 0, { seg: 8 });
  chhatri(b, 'plaster', 0, H + 2.1, 0, 2.7, { cols: 8, h: 3.6 });

  // Stepped wings with tiers of niches, ending in octagonal towers
  for (const s of [-1, 1]) {
    const x0 = s * 10, x1 = s * 29;
    const cx = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    b.box('plaster', len, 11, 4, cx, 0, 0, { collide: true });
    b.box('plaster', len * 0.55, 3, 4, s * 10 + s * len * 0.275, 11, 0, { collide: true });
    for (const fz of [2.01, -2.01]) {
      b.push(0, 0, fz, fz > 0 ? 0 : Math.PI);
      const lx0 = Math.min(x0, x1) * (fz > 0 ? 1 : -1), lx1 = Math.max(x0, x1) * (fz > 0 ? 1 : -1);
      nicheRow(b, 'recess', { x0: Math.min(lx0, lx1) + 0.5, x1: Math.max(lx0, lx1) - 0.5, y: 0.8, z: 0, count: 6, w: 1.7, spring: 2.2, h: 3.4, cusps: 3 });
      nicheRow(b, 'shadowRecess', { x0: Math.min(lx0, lx1) + 0.5, x1: Math.max(lx0, lx1) - 0.5, y: 5.4, z: 0, count: 6, w: 1.4, spring: 1.8, h: 2.8 });
      b.pop();
    }
    b.box('trim', len + 0.4, 0.35, 4.6, cx, 11, 0);
    parapet(b, 'plaster', { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: 11.35, z: 1.9, t: 0.3, h: 0.6, collide: false });
    parapet(b, 'plaster', { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: 11.35, z: -1.9, t: 0.3, h: 0.6, collide: false });
    pinnacle(b, 'plaster', s * 15, 14, 1.6, 2, 0.2);
    pinnacle(b, 'plaster', s * 15, 14, -1.6, 2, 0.2);
    // end tower
    b.cyl('plaster', 2.1, 2.4, 13, s * 31, 0, 0, { seg: 8, collide: true });
    b.cyl('trim', 2.6, 2.6, 0.4, s * 31, 13, 0, { seg: 8 });
    chhatri(b, 'plaster', s * 31, 13.4, 0, 1.6, { cols: 8 });
  }
  b.pop();
  return b.build('Rumi Darwaza');
}
