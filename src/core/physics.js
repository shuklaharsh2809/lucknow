// Axis-aligned box colliders in a spatial hash, plus sunken "pits" (the tank, the river)
// that lower the base ground. Enough for walking, climbing stairs and bumping into walls.
const CELL = 12;

export class Physics {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.pits = [];
    this._seen = 0;
  }

  addBox(minX, minY, minZ, maxX, maxY, maxZ) {
    const b = { minX, minY, minZ, maxX, maxY, maxZ, mark: 0 };
    this.boxes.push(b);
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = x * 73856093 ^ z * 19349663;
      let list = this.grid.get(k);
      if (!list) this.grid.set(k, (list = []));
      list.push(b);
    }
    return b;
  }

  addPit(minX, minZ, maxX, maxZ, depth) {
    this.pits.push({ minX, minZ, maxX, maxZ, depth });
  }

  baseGround(x, z) {
    for (const p of this.pits) {
      if (x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ) return -p.depth;
    }
    return 0;
  }

  query(x, z, r, out) {
    out.length = 0;
    const mark = ++this._seen;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const list = this.grid.get(gx * 73856093 ^ gz * 19349663);
      if (!list) continue;
      for (const b of list) {
        if (b.mark === mark) continue;
        b.mark = mark;
        if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) out.push(b);
      }
    }
    return out;
  }

  // Highest walkable surface under a circle, ignoring anything more than `step` above the feet.
  groundHeight(x, z, r, feetY, step) {
    let g = this.baseGround(x, z);
    const list = this.query(x, z, r * 0.7, _tmp);
    for (const b of list) {
      if (b.maxY <= feetY + step && b.maxY > g) g = b.maxY;
    }
    return g;
  }

  // Lowest ceiling above the head (for jumping into arches and stairwells).
  ceiling(x, z, r, headY) {
    let c = Infinity;
    const list = this.query(x, z, r * 0.7, _tmp);
    for (const b of list) if (b.minY >= headY - 0.3 && b.minY < c) c = b.minY;
    return c;
  }

  // Push a circle out of every box that overlaps the body's vertical span.
  resolve(pos, r, feetY, height, step) {
    const list = this.query(pos.x, pos.z, r, _tmp);
    for (const b of list) {
      if (b.maxY <= feetY + step || b.minY >= feetY + height) continue;
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = cx + dx / d * r;
        pos.z = cz + dz / d * r;
      } else {
        // centre is inside the box: leave by the shortest side
        const pen = [pos.x - b.minX, b.maxX - pos.x, pos.z - b.minZ, b.maxZ - pos.z];
        const i = pen.indexOf(Math.min(...pen));
        if (i === 0) pos.x = b.minX - r;
        else if (i === 1) pos.x = b.maxX + r;
        else if (i === 2) pos.z = b.minZ - r;
        else pos.z = b.maxZ + r;
      }
    }
  }
}

const _tmp = [];
