import { Builder } from '../core/builder.js';
import { arcadeWall, archFrame, parapet, pinnacleRow, minaret, onionDome, stairs } from '../core/architecture.js';
import { JAMA, rectPoly } from '../world/layout.js';

// Jama Masjid of Husainabad: prayer hall on the west of a raised court, three domes, two minarets.
export function buildJamaMasjid(ctx) {
  const { M, physics, scene } = ctx;
  const b = new Builder(M, physics);
  b.push(JAMA.x, 0, JAMA.z, JAMA.yaw);
  b.box('plasterLight', 78, 3, 50, 0, 0, 0, { collide: true });
  stairs(b, 'stone', { x: 0, z: 25 + 9 * 0.4, width: 16, rise: 3 / 9, run: 0.4, count: 9 });
  b.box('stone', 74, 0.02, 30, 0, 3, 6);
  b.push(0, 3, -14);
  const arches = [-24, -16, -8, 0, 8, 16, 24].map((x) => ({ x, w: x ? 4.4 : 6, spring: 4.6, h: x ? 8 : 10.5, cusps: 5 }));
  arcadeWall(b, 'plasterLight', { width: 64, height: 13, depth: 1.2, arches, z: 7 });
  for (const a of arches) archFrame(b, 'trim', a.x, 0, 7.61, a.w, a.spring, a.h, { cusps: 5, band: 0.4 });
  b.box('plasterLight', 64, 13, 1, 0, 0, -7, { collide: true });
  b.box('plasterLight', 1, 13, 14, -31.5, 0, 0, { collide: true });
  b.box('plasterLight', 1, 13, 14, 31.5, 0, 0, { collide: true });
  b.box('recess', 62, 0.05, 13, 0, 0, 0);
  b.box('plasterLight', 64.6, 0.8, 15, 0, 13, 0, { collide: true });
  parapet(b, 'plasterLight', { x0: -32, x1: 32, y: 13.8, z: 7.3, t: 0.35, h: 0.9 });
  pinnacleRow(b, 'plasterLight', { x0: -31, x1: 31, y: 14.7, z: 7.3, spacing: 3.1, h: 2, r: 0.2, domeKey: 'weathered' });
  onionDome(b, 'plasterLight', -17, 13.8, 0, 4, 6, { drum: 2, finialKey: 'gold' });
  onionDome(b, 'plasterLight', 0, 13.8, 0, 5.6, 8.4, { drum: 3, finialKey: 'gold' });
  onionDome(b, 'plasterLight', 17, 13.8, 0, 4, 6, { drum: 2, finialKey: 'gold' });
  for (const s of [-1, 1]) minaret(b, 'plasterLight', s * 35, 0, 6, 44, 1.6, { stages: 4, domeKey: 'weathered' });
  b.pop();
  b.pop();
  scene.add(b.build('Jama Masjid'));
  (ctx.footprints ||= []).push({ p: rectPoly(JAMA, 0, 0, 78, 50), color: '#e6dccb' });
}
