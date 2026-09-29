import * as THREE from 'three';

// Outline of a pointed (two-centred) arch, optionally cusped (the scalloped Awadhi arch).
// Returns points from bottom-left, up and over, to bottom-right; the base is at y = 0.
export function archPoints(w, spring, h, { cusps = 0, seg = 28 } = {}) {
  const rise = Math.max(h - spring, w / 2 + 0.001);
  const half = w / 2;
  const R = (half * half + rise * rise) / w;
  const cxL = -half + R;
  const aEnd = Math.atan2(rise, -cxL);
  const pts = [new THREE.Vector2(-half, 0)];
  const arc = [];
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI + (aEnd - Math.PI) * (i / seg);
    arc.push(new THREE.Vector2(cxL + Math.cos(a) * R, spring + Math.sin(a) * R));
  }
  const right = arc.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y));
  const curve = [...arc, ...right];
  if (cusps > 0) {
    const n = curve.length - 1;
    const amp = w * 0.045;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const k = Math.abs(Math.sin(t * Math.PI * cusps));
      const p = curve[i];
      const dx = -p.x, dy = spring + rise * 0.3 - p.y;
      const l = Math.hypot(dx, dy) || 1;
      p.x += (dx / l) * amp * (1 - k);
      p.y += (dy / l) * amp * (1 - k);
    }
  }
  pts.push(...curve, new THREE.Vector2(half, 0));
  return pts;
}

function archPath(cx, y0, w, spring, h, opts) {
  const pts = archPoints(w, spring, h, opts).map((p) => new THREE.Vector2(p.x + cx, p.y + y0));
  const path = new THREE.Path();
  path.setFromPoints(pts);
  path.closePath();
  return path;
}

// A flat wall (in the local XY plane, extruded +/- depth/2 in Z) pierced by arches.
// Arches that start at the floor become walkable openings; colliders are split around them.
export function arcadeWall(b, key, { width, height, depth, arches = [], x = 0, y = 0, z = 0, ry = 0, collide = true, curveSeg = 28 }) {
  // Doorways are notched into the outline (holes touching the edge triangulate badly);
  // raised windows become holes.
  const doorsSorted = arches.filter((a) => (a.y0 ?? 0) <= 0.05).sort((p, q) => p.x - q.x);
  const outline = [new THREE.Vector2(-width / 2, 0)];
  for (const d of doorsSorted) {
    for (const p of archPoints(d.w, d.spring, d.h, { cusps: d.cusps ?? 0, seg: curveSeg })) {
      outline.push(new THREE.Vector2(p.x + d.x, p.y));
    }
  }
  outline.push(new THREE.Vector2(width / 2, 0), new THREE.Vector2(width / 2, height), new THREE.Vector2(-width / 2, height));
  const shape = new THREE.Shape(outline);
  for (const a of arches) {
    if ((a.y0 ?? 0) <= 0.05) continue;
    shape.holes.push(archPath(a.x, a.y0, a.w, a.spring, a.h, { cusps: a.cusps ?? 0, seg: curveSeg }));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  b.push(x, y, z, ry);
  b.add(key, geo);
  if (collide) {
    const doors = arches.filter((a) => (a.y0 ?? 0) <= 0.05).sort((p, q) => p.x - q.x);
    let cursor = -width / 2;
    for (const d of doors) {
      const l = d.x - d.w / 2, r = d.x + d.w / 2;
      if (l > cursor) b.collide(cursor, 0, -depth / 2, l, height, depth / 2);
      b.collide(l, d.spring + (d.h - d.spring) * 0.75, -depth / 2, r, height, depth / 2);
      cursor = r;
    }
    if (cursor < width / 2) b.collide(cursor, 0, -depth / 2, width / 2, height, depth / 2);
  }
  b.pop();
  return geo;
}

// Flat arch-shaped panel (blind niche / window). Sits just proud of a wall facing +Z.
export function archPanel(b, key, x, y, z, w, spring, h, { cusps = 0, ry = 0, depth = 0.08 } = {}) {
  const shape = new THREE.Shape(archPoints(w, spring, h, { cusps, seg: 12 }));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2 });
  b.push(x, y, z, ry);
  b.add(key, geo);
  b.pop();
}

// Raised moulding that frames an opening: a U-shaped band following the arch outline.
// (w, spring, h) are the opening's dimensions; the band grows outward from it.
export function archFrame(b, key, x, y, z, w, spring, h, { cusps = 0, band = 0.4, depth = 0.07, ry = 0 } = {}) {
  const outer = archPoints(w + band * 2, spring, h + band, { seg: 18 });
  const inner = archPoints(w, spring, h, { cusps, seg: 18 }).reverse();
  const shape = new THREE.Shape([...outer, ...inner]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2 });
  b.push(x, y, z, ry);
  b.add(key, geo);
  b.pop();
}

// Row of blind arched niches along a wall face.
export function nicheRow(b, key, { x0, x1, y, z, count, w, spring, h, ry = 0, cusps = 0, frameKey = null }) {
  const step = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const cx = x0 + step * (i + 0.5);
    b.push(0, 0, 0, ry);
    if (frameKey) archPanel(b, frameKey, cx, y - 0.15, z, w + 0.4, spring + 0.15, h + 0.35, { depth: 0.05 });
    archPanel(b, key, cx, y, z + (frameKey ? 0.05 : 0), w, spring, h, { cusps, depth: 0.06 });
    b.pop();
  }
}

// Onion dome profile (lathe). Base radius r at y = 0, total height h (excluding finial).
export function onionDomeGeo(r, h, { seg = 24, bulge = 1.14 } = {}) {
  const prof = [
    [0.0, 0], [r * 0.98, 0], [r * 1.07 * (bulge / 1.14), 0.1], [r * bulge, 0.26], [r * 1.1 * (bulge / 1.14), 0.42],
    [r * 0.94, 0.56], [r * 0.72, 0.69], [r * 0.46, 0.8], [r * 0.24, 0.89], [r * 0.1, 0.96], [0, 1],
  ].map(([x, y]) => new THREE.Vector2(x, y * h));
  return new THREE.LatheGeometry(prof, seg);
}

export function hemiDomeGeo(r, h, seg = 16) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * h));
  }
  pts.unshift(new THREE.Vector2(0, 0));
  return new THREE.LatheGeometry(pts, seg);
}

// Kalash finial: stacked beads and a spike.
export function finial(b, key, x, y, z, s = 1) {
  b.geo(key, new THREE.SphereGeometry(0.22 * s, 10, 8), x, y + 0.18 * s, z);
  b.geo(key, new THREE.SphereGeometry(0.15 * s, 10, 8), x, y + 0.5 * s, z);
  b.geo(key, new THREE.SphereGeometry(0.1 * s, 8, 6), x, y + 0.75 * s, z);
  b.cyl(key, 0.0, 0.05 * s, 0.9 * s, x, y + 0.8 * s, z, { seg: 6 });
}

export function onionDome(b, key, x, y, z, r, h, { drum = 0, drumKey = null, finialKey = 'gold', seg = 24, bulge } = {}) {
  if (drum > 0) {
    b.cyl(drumKey ?? key, r * 0.98, r * 0.98, drum, x, y, z, { seg: Math.max(8, seg / 2) });
    b.cyl(drumKey ?? key, r * 1.08, r * 1.08, 0.3, x, y + drum - 0.3, z, { seg: Math.max(8, seg / 2) });
    y += drum;
  }
  b.geo(key, onionDomeGeo(r, h, { seg, bulge }), x, y, z);
  // lotus petal ring at the dome base
  b.cyl(key, r * 0.9, r * 1.02, 0.25, x, y, z, { seg });
  finial(b, finialKey, x, y + h - 0.05, z, Math.max(0.6, r * 0.45));
}

// Chhatri: a domed kiosk on slender columns. Very characteristic of Awadhi rooflines.
export function chhatri(b, key, x, y, z, size = 1.5, { cols = 4, domeKey = null, h = null, finialKey = 'gold' } = {}) {
  const colH = h ?? size * 1.5;
  b.box(key, size * 2.1, 0.25, size * 2.1, x, y, z);
  const rr = size * 0.85;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2 + Math.PI / cols;
    b.cyl(key, 0.09 * size, 0.11 * size, colH, x + Math.cos(a) * rr, y + 0.25, z + Math.sin(a) * rr, { seg: 6 });
  }
  // chajja (sloped eave)
  b.cyl(key, size * 0.95, size * 1.25, 0.25, x, y + 0.25 + colH, z, { seg: cols === 4 ? 4 : 8, ry: cols === 4 ? Math.PI / 4 : 0 });
  b.cyl(key, size * 0.9, size * 0.9, 0.3, x, y + 0.5 + colH, z, { seg: 12 });
  const dy = y + 0.8 + colH;
  b.geo(domeKey ?? key, onionDomeGeo(size * 0.82, size * 1.25, { seg: 14 }), x, dy, z);
  finial(b, finialKey, x, dy + size * 1.2, z, size * 0.45);
}

// Tapering octagonal minaret with balconies, capped by a chhatri.
export function minaret(b, key, x, y, z, height, r, { stages = 3, domeKey = null, balconyKey = null } = {}) {
  const stageH = (height - r * 3) / stages;
  let cy = y;
  let rr = r;
  b.cyl(key, rr * 1.25, rr * 1.35, 1.2, x, cy, z, { seg: 8, collide: true });
  cy += 1.2;
  for (let s = 0; s < stages; s++) {
    const r2 = rr * 0.9;
    b.cyl(key, r2, rr, stageH, x, cy, z, { seg: 8, collide: s === 0 });
    cy += stageH;
    b.cyl(balconyKey ?? key, r2 * 1.45, r2 * 1.05, 0.35, x, cy - 0.35, z, { seg: 8 });
    b.cyl(balconyKey ?? key, r2 * 1.45, r2 * 1.45, 0.5, x, cy, z, { seg: 8, open: true });
    rr = r2;
  }
  chhatri(b, key, x, cy, z, rr * 1.05, { cols: 8, domeKey });
  return cy;
}

// Guldasta: the slim decorative pinnacle that crowds Lucknow parapets.
export function pinnacle(b, key, x, y, z, h = 2.2, r = 0.22, domeKey = null) {
  b.cyl(key, r, r * 1.2, h * 0.7, x, y, z, { seg: 8 });
  b.cyl(key, r * 1.5, r * 1.5, 0.12, x, y + h * 0.7, z, { seg: 8 });
  b.geo(domeKey ?? key, onionDomeGeo(r * 1.3, h * 0.35, { seg: 8 }), x, y + h * 0.7 + 0.12, z);
}

export function pinnacleRow(b, key, { x0, x1, y, z, spacing = 3, h = 2.2, r = 0.22, domeKey = null, alongZ = false }) {
  const n = Math.max(1, Math.round((x1 - x0) / spacing));
  for (let i = 0; i <= n; i++) {
    const t = x0 + ((x1 - x0) * i) / n;
    if (alongZ) pinnacle(b, key, z, y, t, h, r, domeKey);
    else pinnacle(b, key, t, y, z, h, r, domeKey);
  }
}

// Low parapet with small merlon-like bumps (kanguras).
export function parapet(b, key, { x0, x1, y, z, t = 0.4, h = 0.9, alongZ = false, collide = true }) {
  const len = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
  if (alongZ) b.box(key, t, h, len, z, y, mid, { collide });
  else b.box(key, len, h, t, mid, y, z, { collide });
  const n = Math.floor(len / 1.1);
  for (let i = 0; i < n; i++) {
    const p = Math.min(x0, x1) + (i + 0.5) * (len / n);
    if (alongZ) b.box(key, t * 1.05, 0.35, 0.5, z, y + h, p);
    else b.box(key, 0.5, 0.35, t * 1.05, p, y + h, z);
  }
}

// The Mahi Maratib: two fish facing each other, the royal emblem of Awadh.
export function fishEmblemGeo(s = 1) {
  const fish = (dir) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(dir * 0.6 * s, 0.35 * s, dir * 1.4 * s, 0.3 * s, dir * 1.8 * s, 0);
    sh.lineTo(dir * 2.3 * s, 0.3 * s);
    sh.lineTo(dir * 2.2 * s, 0);
    sh.lineTo(dir * 2.3 * s, -0.3 * s);
    sh.lineTo(dir * 1.8 * s, 0);
    sh.bezierCurveTo(dir * 1.4 * s, -0.3 * s, dir * 0.6 * s, -0.35 * s, 0, 0);
    return sh;
  };
  const shapes = [fish(1), fish(-1)];
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.12, bevelEnabled: false, curveSegments: 8 });
  // tilt the fish into a V, noses together at the bottom
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), yy = pos.getY(i);
    pos.setY(i, yy + Math.abs(x) * 0.45);
  }
  g.computeVertexNormals();
  return g;
}

// Straight flight of steps climbing along -Z from (x, y, z). Each step is solid to the base.
export function stairs(b, key, { x, y = 0, z, width, rise, run, count, dir = -1, alongX = false }) {
  for (let i = 0; i < count; i++) {
    const top = y + rise * (i + 1);
    const c = z + dir * (run * i + run / 2);
    if (alongX) b.box(key, run, top - y, width, c, y, x, { collide: true });
    else b.box(key, width, top - y, run, x, y, c, { collide: true });
  }
}

// A band plane with repeating UVs (for the lattice/calligraphy strips); faces +Z.
export function bandGeo(len, h, repeatEvery = 4) {
  const g = new THREE.PlaneGeometry(len, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / repeatEvery));
  return g;
}
