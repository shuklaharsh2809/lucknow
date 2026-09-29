// Oriented box colliders (rotated about Y) in a spatial hash, sunken pits (tanks, ghats) and
// an optional "blocked" test (the river). Enough for walking, climbing stairs and bumping walls.
const CELL = 12;
const key = (x, z) => x * 73856093 ^ z * 19349663;

export class Physics {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.pits = [];
    this._seen = 0;
    this.blockedFn = null;
  }

  // Axis-aligned box.
  addBox(minX, minY, minZ, maxX, maxY, maxZ) {
    return this.addOBB((minX + maxX) / 2, (minZ + maxZ) / 2, (maxX - minX) / 2, (maxZ - minZ) / 2, 0, minY, maxY);
  }

  // Box centred on (cx, cz) with half extents hx (along its local X) and hz, turned by `angle`
  // (three.js Y rotation: local X points along (cos a, -sin a) in world XZ).
  addOBB(cx, cz, hx, hz, angle, minY, maxY) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const b = { cx, cz, hx, hz, ax: c, az: -s, bx: s, bz: c, minY, maxY, mark: 0 };
    const ex = Math.abs(c) * hx + Math.abs(s) * hz, ez = Math.abs(s) * hx + Math.abs(c) * hz;
    const x0 = Math.floor((cx - ex) / CELL), x1 = Math.floor((cx + ex) / CELL);
    const z0 = Math.floor((cz - ez) / CELL), z1 = Math.floor((cz + ez) / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = key(x, z);
      let list = this.grid.get(k);
      if (!list) this.grid.set(k, (list = []));
      list.push(b);
    }
    this.boxes.push(b);
    return b;
  }

  addPit(cx, cz, hx, hz, angle, depth) {
    const c = Math.cos(angle), s = Math.sin(angle);
    this.pits.push({ cx, cz, hx, hz, ax: c, az: -s, bx: s, bz: c, depth });
  }

  baseGround(x, z) {
    for (const p of this.pits) {
      const dx = x - p.cx, dz = z - p.cz;
      if (Math.abs(dx * p.ax + dz * p.az) < p.hx && Math.abs(dx * p.bx + dz * p.bz) < p.hz) return -p.depth;
    }
    return 0;
  }

  blocked(x, z) {
    return this.blockedFn ? this.blockedFn(x, z) : false;
  }

  query(x, z, r, out) {
    out.length = 0;
    const mark = ++this._seen;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const list = this.grid.get(key(gx, gz));
      if (!list) continue;
      for (const b of list) {
        if (b.mark === mark) continue;
        b.mark = mark;
        out.push(b);
      }
    }
    return out;
  }

  // Closest point on the box footprint to (x, z), written to _cp; returns squared distance.
  _closest(b, x, z) {
    const dx = x - b.cx, dz = z - b.cz;
    let lx = dx * b.ax + dz * b.az, lz = dx * b.bx + dz * b.bz;
    const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz));
    _cp.lx = lx; _cp.lz = lz; _cp.cx = cx; _cp.cz = cz;
    return (lx - cx) ** 2 + (lz - cz) ** 2;
  }

  // Highest walkable surface under a circle, ignoring anything more than `step` above the feet.
  groundHeight(x, z, r, feetY, step) {
    let g = this.baseGround(x, z);
    const rr = (r * 0.7) ** 2;
    for (const b of this.query(x, z, r, _tmp)) {
      if (b.maxY <= feetY + step && b.maxY > g && this._closest(b, x, z) < rr) g = b.maxY;
    }
    return g;
  }

  // Lowest ceiling above the head (for jumping into arches and stairwells).
  ceiling(x, z, r, headY) {
    let c = Infinity;
    const rr = (r * 0.7) ** 2;
    for (const b of this.query(x, z, r, _tmp)) {
      if (b.minY >= headY - 0.3 && b.minY < c && this._closest(b, x, z) < rr) c = b.minY;
    }
    return c;
  }

  // Push a circle out of every box that overlaps the body's vertical span.
  resolve(pos, r, feetY, height, step) {
    for (const b of this.query(pos.x, pos.z, r, _tmp)) {
      if (b.maxY <= feetY + step || b.minY >= feetY + height) continue;
      const d2 = this._closest(b, pos.x, pos.z);
      if (d2 >= r * r) continue;
      let { lx, lz, cx, cz } = _cp;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        lx = cx + ((lx - cx) / d) * r;
        lz = cz + ((lz - cz) / d) * r;
      } else {
        // centre is inside the box: leave by the shortest side
        const pen = [lx + b.hx, b.hx - lx, lz + b.hz, b.hz - lz];
        const i = pen.indexOf(Math.min(...pen));
        if (i === 0) lx = -b.hx - r; else if (i === 1) lx = b.hx + r;
        else if (i === 2) lz = -b.hz - r; else lz = b.hz + r;
      }
      pos.x = b.cx + lx * b.ax + lz * b.bx;
      pos.z = b.cz + lx * b.az + lz * b.bz;
    }
  }
}

const _tmp = [];
const _cp = { lx: 0, lz: 0, cx: 0, cz: 0 };
